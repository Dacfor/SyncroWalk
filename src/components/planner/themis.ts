// ═══════════════════════════════════════════════════════════════════════════════
// THEMIS BRIGHTNESS TEMPERATURE (real data, Mars Odyssey / THEMIS IR band 9, Kelvin)
// 1. Catalogue: ODE REST API (CORS enabled) → projected brightness-temperature images
//    (IRPBT2, ~100 m/px, sinusoidal) covering the Jezero work area, with date & local time.
// 2. Data: the PDS .IMG files on static.mars.asu.edu have no CORS headers, so they are read
//    through the Vite proxy (/asu-pds). Only the label and the rows over Jezero are fetched
//    with HTTP Range requests (hundreds of KB instead of 35–70 MB per image).
// ═══════════════════════════════════════════════════════════════════════════════

const ODE_API = 'https://oderest.rsl.wustl.edu/live2/';
const ASU_HOST = 'https://static.mars.asu.edu';
const PROXY_PREFIX = '/asu-pds';

// Catalogue search box (work area) and the area rendered on the map
export const THEMIS_QUERY_BBOX = { minlat: 18.4, maxlat: 18.48, westlon: 77.4, eastlon: 77.5 };
export const THEMIS_CROP_BBOX = { latMin: 18.33, latMax: 18.55, lonMin: 77.33, lonMax: 77.6 };

export interface ThemisObs {
  id: string; // e.g. I63849019PBT
  date: string; // YYYY-MM-DD (UTC)
  utc: string;
  lst: number; // local solar time, decimal hours
  ls: number; // solar longitude (season), degrees
  night: boolean;
  fileUrl: string; // original PDS file
  proxyUrl: string; // same file through the Vite proxy
  viewerUrl?: string;
}

export interface ThemisCrop {
  obs: ThemisObs;
  grid: Float32Array; // Kelvin, NaN = no data
  width: number;
  height: number;
  bounds: [[number, number], [number, number]]; // [[latMin, lonMin], [latMax, lonMax]]
  lo: number; // 2nd percentile (colour scale min)
  hi: number; // 98th percentile (colour scale max)
  min: number;
  max: number;
  coveragePct: number;
  dataUrl: string; // blue → red rendering
}

// ── Catalogue ────────────────────────────────────────────────────────────────
type OdeFile = { Type?: string; URL?: string };
type OdeProduct = {
  pdsid?: string;
  UTC_start_time?: string;
  Solar_time?: string;
  Solar_longitude?: string;
  External_url?: string;
  Product_files?: { Product_file?: OdeFile | OdeFile[] };
};

export async function fetchThemisCatalog(signal?: AbortSignal): Promise<ThemisObs[]> {
  const b = THEMIS_QUERY_BBOX;
  const params = new URLSearchParams({
    query: 'product',
    target: 'mars',
    ihid: 'ODY',
    iid: 'THEMIS',
    pt: 'IRPBT2',
    minlat: String(b.minlat),
    maxlat: String(b.maxlat),
    westlon: String(b.westlon),
    eastlon: String(b.eastlon),
    results: 'fpm',
    output: 'JSON'
  });
  const res = await fetch(`${ODE_API}?${params}`, { signal });
  if (!res.ok) throw new Error(`ODE API ${res.status}`);
  const json = await res.json();
  const raw = json?.ODEResults?.Products?.Product;
  const products: OdeProduct[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return products
    .map((p) => {
      const files = p.Product_files?.Product_file;
      const list = Array.isArray(files) ? files : files ? [files] : [];
      const img = list.find((f) => f.Type === 'Product' && /\.IMG$/i.test(f.URL ?? ''));
      if (!img?.URL || !p.UTC_start_time) return null;
      const lst = Number(p.Solar_time);
      return {
        id: p.pdsid ?? img.URL.split('/').pop()!.replace(/\.IMG$/i, ''),
        date: p.UTC_start_time.slice(0, 10),
        utc: p.UTC_start_time,
        lst,
        ls: Number(p.Solar_longitude),
        night: lst >= 18 || lst < 6,
        fileUrl: img.URL,
        proxyUrl: img.URL.replace(ASU_HOST, PROXY_PREFIX),
        viewerUrl: p.External_url
      } as ThemisObs;
    })
    .filter((o): o is ThemisObs => Boolean(o))
    .sort((a, b) => a.utc.localeCompare(b.utc));
}

// ── PDS label ────────────────────────────────────────────────────────────────
interface PdsLabel {
  recordBytes: number;
  imageStartByte: number;
  lines: number;
  samples: number;
  bytesPerSample: number;
  littleEndian: boolean;
  isFloat: boolean;
  mapResolution: number; // pixels per degree
  centerLon: number;
  lineOffset: number;
  sampleOffset: number;
  nullValue: number;
  scale: number;
  offset: number;
}

const kw = (text: string, key: string) => {
  const m = text.match(new RegExp(`^\\s*${key.replace(/[\^]/g, '\\^')}\\s*=\\s*(.+?)\\s*$`, 'm'));
  return m ? m[1].replace(/"/g, '') : null;
};
const num = (v: string | null, fallback = NaN) => {
  const m = v?.match(/-?\d+(\.\d+)?([eE][-+]?\d+)?/);
  return m ? Number(m[0]) : fallback;
};

async function readLabel(url: string, signal?: AbortSignal): Promise<PdsLabel> {
  const res = await fetch(url, { headers: { Range: 'bytes=0-32767' }, signal });
  if (!res.ok && res.status !== 206) throw new Error(`THEMIS label ${res.status}`);
  const text = new TextDecoder('latin1').decode(await res.arrayBuffer());
  const head = text.split(/\r?\nEND\r?\n/)[0];
  const recordBytes = num(kw(head, 'RECORD_BYTES'));
  const ptr = kw(head, '^IMAGE') ?? '';
  // ^IMAGE = 2 (records, 1-based) or 12345 <BYTES>
  const imageStartByte = /BYTES/i.test(ptr) ? num(ptr) - 1 : (num(ptr) - 1) * recordBytes;
  const sampleType = kw(head, 'SAMPLE_TYPE') ?? 'PC_REAL';
  const label: PdsLabel = {
    recordBytes,
    imageStartByte,
    lines: num(kw(head, 'LINES')),
    samples: num(kw(head, 'LINE_SAMPLES')),
    bytesPerSample: num(kw(head, 'SAMPLE_BITS'), 32) / 8,
    littleEndian: /PC_|LSB/i.test(sampleType),
    isFloat: /REAL|FLOAT/i.test(sampleType),
    mapResolution: num(kw(head, 'MAP_RESOLUTION')),
    centerLon: num(kw(head, 'CENTER_LONGITUDE')),
    lineOffset: num(kw(head, 'LINE_PROJECTION_OFFSET')),
    sampleOffset: num(kw(head, 'SAMPLE_PROJECTION_OFFSET')),
    nullValue: num(kw(head, 'NULL_CONSTANT'), 0),
    scale: num(kw(head, 'SCALING_FACTOR'), 1),
    offset: num(kw(head, 'OFFSET'), 0)
  };
  if (![label.lines, label.samples, label.mapResolution, label.lineOffset, label.sampleOffset].every(Number.isFinite)) {
    throw new Error('Unexpected THEMIS label (missing map projection keywords)');
  }
  return label;
}

// ── Colour scale: blue (cold) → red (warm) ───────────────────────────────────
export const TEMPERATURE_STOPS = ['#2166ac', '#4393c3', '#92c5de', '#fddbc7', '#f4a582', '#d6604d', '#b2182b'];
const STOP_RGB = TEMPERATURE_STOPS.map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));
const colourAt = (t: number) => {
  const x = Math.min(1, Math.max(0, t)) * (STOP_RGB.length - 1);
  const i = Math.min(STOP_RGB.length - 2, Math.floor(x));
  const f = x - i;
  return STOP_RGB[i].map((c, k) => Math.round(c + (STOP_RGB[i + 1][k] - c) * f));
};

// ── Crop over Jezero ─────────────────────────────────────────────────────────
export async function loadThemisCrop(obs: ThemisObs, signal?: AbortSignal): Promise<ThemisCrop> {
  const L = await readLabel(obs.proxyUrl, signal);
  const { latMin, latMax, lonMin, lonMax } = THEMIS_CROP_BBOX;
  const res = L.mapResolution;
  const rad = Math.PI / 180;
  const lineOf = (lat: number) => Math.floor(L.lineOffset - lat * res);
  const sampleOf = (lat: number, lon: number) => Math.floor(L.sampleOffset + (lon - L.centerLon) * Math.cos(lat * rad) * res);

  const lineA = Math.max(0, lineOf(latMax) - 1);
  const lineB = Math.min(L.lines - 1, lineOf(latMin) + 1);
  if (lineB < lineA) throw new Error('This observation does not cover the Jezero area');
  const rowBytes = L.samples * L.bytesPerSample;
  const start = L.imageStartByte + lineA * rowBytes;
  const end = L.imageStartByte + (lineB + 1) * rowBytes - 1;
  const resp = await fetch(obs.proxyUrl, { headers: { Range: `bytes=${start}-${end}` }, signal });
  if (!resp.ok && resp.status !== 206) throw new Error(`THEMIS data ${resp.status}`);
  const view = new DataView(await resp.arrayBuffer());
  const read = (line: number, sample: number) => {
    if (line < lineA || line > lineB || sample < 0 || sample >= L.samples) return NaN;
    const off = (line - lineA) * rowBytes + sample * L.bytesPerSample;
    if (off + L.bytesPerSample > view.byteLength) return NaN;
    const raw = L.isFloat
      ? L.bytesPerSample === 8
        ? view.getFloat64(off, L.littleEndian)
        : view.getFloat32(off, L.littleEndian)
      : L.bytesPerSample === 2
        ? view.getInt16(off, L.littleEndian)
        : view.getUint8(off);
    if (!Number.isFinite(raw) || raw === L.nullValue || raw <= -1e30) return NaN;
    const k = raw * L.scale + L.offset;
    return k > 50 && k < 400 ? k : NaN; // plausible Mars surface brightness temperatures (K)
  };

  // Output grid in lat/lon (the map uses EPSG:4326, so an image overlay is linear in degrees)
  const height = Math.max(2, Math.round((latMax - latMin) * res));
  const width = Math.max(2, Math.round((lonMax - lonMin) * res * Math.cos(((latMin + latMax) / 2) * rad)));
  const grid = new Float32Array(width * height);
  const valid: number[] = [];
  for (let i = 0; i < height; i++) {
    const lat = latMax - ((i + 0.5) / height) * (latMax - latMin);
    const line = lineOf(lat);
    for (let j = 0; j < width; j++) {
      const lon = lonMin + ((j + 0.5) / width) * (lonMax - lonMin);
      const v = read(line, sampleOf(lat, lon));
      grid[i * width + j] = v;
      if (!Number.isNaN(v)) valid.push(v);
    }
  }
  if (!valid.length) throw new Error('No valid temperatures over Jezero in this observation');
  const sorted = [...valid].sort((a, b) => a - b);
  const pct = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
  const lo = pct(2);
  const hi = Math.max(pct(98), lo + 0.5);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(width, height);
  for (let p = 0; p < grid.length; p++) {
    const v = grid[p];
    if (Number.isNaN(v)) continue;
    const [r, g, b] = colourAt((v - lo) / (hi - lo));
    img.data.set([r, g, b, 235], p * 4);
  }
  ctx.putImageData(img, 0, 0);

  return {
    obs,
    grid,
    width,
    height,
    bounds: [
      [latMin, lonMin],
      [latMax, lonMax]
    ],
    lo,
    hi,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    coveragePct: (valid.length / grid.length) * 100,
    dataUrl: canvas.toDataURL('image/png')
  };
}

/** Temperature (K) at a map position, NaN outside the crop or where there is no data. */
export const sampleCrop = (crop: ThemisCrop, lat: number, lon: number) => {
  const [[latMin, lonMin], [latMax, lonMax]] = crop.bounds;
  if (lat < latMin || lat > latMax || lon < lonMin || lon > lonMax) return NaN;
  const i = Math.min(crop.height - 1, Math.floor(((latMax - lat) / (latMax - latMin)) * crop.height));
  const j = Math.min(crop.width - 1, Math.floor(((lon - lonMin) / (lonMax - lonMin)) * crop.width));
  return crop.grid[i * crop.width + j];
};

export const kToC = (k: number) => k - 273.15;
export const formatLst = (h: number) => {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm === 60 ? 0 : mm).padStart(2, '0')}`;
};
