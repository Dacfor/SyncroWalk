// Soil-composition layers offered to the Scientist (map header menu "Composition").
// CRISM browse products are real PDS data (see public/layers/crism/README.md); bounds come
// from the IMAGE_MAP_PROJECTION object of each product label.

export type CompositionId = 'maf' | 'car' | 'phy' | 'tes';

export interface CrismScene {
  productId: string;
  file: string;
  /** [[minLat, westLon], [maxLat, eastLon]] from the PDS label */
  bounds: [[number, number], [number, number]];
  acquired: string;
}

const SCENE_5C5E = {
  bounds: [
    [18.364672, 77.279195],
    [18.635047, 77.558793]
  ] as [[number, number], [number, number]],
  acquired: '2007-05-19'
};
const SCENE_1FB74 = {
  bounds: [
    [18.269714, 77.398518],
    [18.511836, 77.661133]
  ] as [[number, number], [number, number]],
  acquired: '2011-08-14'
};
const scene = (id: 'frt00005c5e' | 'frt0001fb74', kind: string): CrismScene => ({
  productId: `${id.toUpperCase()}_07_BR${kind.toUpperCase()}J_MTR3`,
  file: `${import.meta.env.BASE_URL}layers/crism/${id}_07_br${kind}j_mtr3.png`,
  ...(id === 'frt00005c5e' ? SCENE_5C5E : SCENE_1FB74)
});

export interface CompositionLayer {
  id: CompositionId;
  label: string;
  short: string;
  resolution: string;
  source: string;
  /** RGB composite definition (spectral summary parameters) */
  rgb?: string;
  /** What each colour means: [css colour, meaning] */
  colors: [string, string][];
  scenes: CrismScene[];
  note?: string;
}

export const COMPOSITION_LAYERS: CompositionLayer[] = [
  {
    id: 'maf',
    label: 'CRISM mafic minerals (MAF)',
    short: 'CRISM MAF',
    resolution: '~18 m/px',
    source: 'MRO · CRISM · MTRDR browse product',
    rgb: 'R OLINDEX3 · G LCPINDEX2 · B HCPINDEX2',
    colors: [
      ['#e5484d', 'Red: olivine (or Fe-phyllosilicate)'],
      ['#35b17a', 'Green / cyan: low-Ca pyroxene'],
      ['#6b7cff', 'Blue / magenta: high-Ca pyroxene']
    ],
    // FRT00005C5E MAF is not shown: a detector-row artefact saturates its browse stretch
    scenes: [scene('frt0001fb74', 'maf')],
    note: 'Scene FRT0001FB74 only (Séítah and delta front).'
  },
  {
    id: 'car',
    label: 'CRISM carbonates (CAR)',
    short: 'CRISM CAR',
    resolution: '~18 m/px',
    source: 'MRO · CRISM · MTRDR browse product',
    rgb: 'R D2300 · G BD2500_2 · B BD1900_2',
    colors: [
      ['#e8d24a', 'Yellow / white: carbonate (2.3 + 2.5 µm bands)'],
      ['#d0489b', 'Red / magenta: Fe/Mg phyllosilicate'],
      ['#6b7cff', 'Blue: other hydrated minerals']
    ],
    scenes: [scene('frt0001fb74', 'car'), scene('frt00005c5e', 'car')]
  },
  {
    id: 'phy',
    label: 'CRISM phyllosilicates (PHY)',
    short: 'CRISM PHY',
    resolution: '~18 m/px',
    source: 'MRO · CRISM · MTRDR browse product',
    rgb: 'R D2300 · G D2200 · B BD1900R2',
    colors: [
      ['#d0489b', 'Red / magenta: Fe/Mg-OH phyllosilicate (smectite clays)'],
      ['#35b17a', 'Green / cyan: Al-OH phyllosilicate or hydrated silica'],
      ['#6b7cff', 'Blue: other hydrated minerals (sulfate, carbonate)']
    ],
    scenes: [scene('frt0001fb74', 'phy'), scene('frt00005c5e', 'phy')]
  },
  {
    id: 'tes',
    label: 'TES clay / high-Si glass (regional)',
    short: 'TES clay',
    resolution: '~3 km/px',
    source: 'MGS · TES · NASA Trek mosaic',
    colors: [['#c9b8ff', 'Brighter: more phyllosilicate / high-silica glass']],
    scenes: [],
    note: 'Regional context only: one pixel is wider than the whole EVA area.'
  }
];

export const compositionLayer = (id: CompositionId | null | undefined) =>
  COMPOSITION_LAYERS.find((l) => l.id === id) ?? null;

/** Map-header menu: one composition layer at a time, off by default. */
export function CompositionMenu({
  value,
  onChange
}: {
  value: CompositionId | null;
  onChange: (v: CompositionId | null) => void;
}) {
  return (
    <label className={`mh-layer-select ${value ? 'is-on' : ''}`} title="Soil composition from orbit (spectral layers). One at a time.">
      <span>Composition</span>
      <select value={value ?? ''} onChange={(e) => onChange((e.target.value || null) as CompositionId | null)} aria-label="Composition layer">
        <option value="">Off</option>
        {COMPOSITION_LAYERS.map((l) => (
          <option key={l.id} value={l.id}>
            {l.label} · {l.resolution}
          </option>
        ))}
      </select>
    </label>
  );
}
