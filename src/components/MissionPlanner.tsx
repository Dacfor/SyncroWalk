// @ts-nocheck -- ported from a standalone prototype; remove once the file is fully typed.
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Compass,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Navigation,
  Camera,
  ArrowUp,
  ArrowDown,
  FileJson,
  Radio,
  Crosshair,
  Eye,
  Database,
  Sparkles,
  CheckSquare,
  Hammer,
  FlaskConical,
  Drill,
  Cpu,
  X,
  Sliders,
  GitBranch,
  ZoomIn,
  ZoomOut,
  PlusCircle,
  Zap,
  Server,
  Activity,
  MapPin,
  Filter,
  FastForward,
  Maximize2,
  Minimize2,
  Sun,
  Moon,
  SunMoon,
  ChevronDown
} from 'lucide-react';
import { usePlannerStore } from './planner/usePlannerStore.ts';
import ScientistPanel from './planner/ScientistPanel.tsx';
import ControlPanel from './planner/ControlPanel.tsx';
import AstronautPanel from './planner/AstronautPanel.tsx';
import { DiscoveryDetail, DiscoveryList } from './planner/Discoveries.tsx';
import UserMenu from './planner/UserMenu.tsx';
import { BASE, CREW_ROSTER, FIELD_EVENT_META, PRIORITY_META, TODAY_SOL, instrumentName, planFor } from './planner/model.ts';
import {
  DEMO_ASSUMPTIONS,
  MISSION_OBJECTIVE,
  PRIOR_ZONES,
  SHELTERS,
  TIME_WINDOW,
  addMinutesToLst,
  distKm,
  getHydration,
  lstToMin,
  residualLevel,
  shelterIsochrone
} from './planner/analysis.ts';
import { SimBadge, ValueWithUncertainty, fmtNum } from './planner/analysisUi.tsx';
import { Stat } from './planner/ui.tsx';

// ═══════════════════════════════════════════════════════════════════════════════
// §1 REAL JEZERO CRATER CONFIGURATION (FROM index_2.html & map_2.py)
// ═══════════════════════════════════════════════════════════════════════════════
const TREK_BASE = 'https://trek.nasa.gov/tiles/Mars/EQ';
const trekUrl = (id, ext) =>
  `${TREK_BASE}/${id}/1.0.0/default/default028mm/{z}/{y}/{x}.${ext}`;

const JEZERO_CENTER = [18.4405, 77.4555]; // Séítah, Western Delta Front & the astronaut base
const JEZ_HIRISE_BOUNDS = [
  [18.3067994, 77.2229331],
  [18.669315, 77.583964]
];
const JEZ_CTX_BOUNDS = [
  [18.2110274, 77.1604655],
  [18.7211945, 77.6991776]
];

const MOLA_COG_URL =
  'https://asc-pds-services.s3.us-west-2.amazonaws.com/wms_basemaps3/Mars/MOLA/mola128_mola64_merge_90Nto90S_SimpleC_clon0_cog.tif';
const M20_MMGIS_BASE = 'https://mars.nasa.gov/mmgis-maps/M20/Layers/json/';

// Exact verified NASA Trek WMTS & ArcGIS layers from index_2.html
const JEZERO_RASTER_CATALOG = [
  {
    id: 'viking',
    group: 'Base Imagery',
    name: 'Viking MDIM 2.1 Color',
    res: '232 m/px',
    instrument: 'Viking Orbiter / VIS',
    url: trekUrl('Mars_Viking_MDIM21_ClrMosaic_global_232m', 'jpg'),
    maxNative: 7,
    defaultOpacity: 1.0,
    coveragePct: 100
  },
  {
    id: 'ctxGlobal',
    group: 'Base Imagery',
    name: 'CTX Global Mosaic (Beta)',
    res: '5 m/px',
    instrument: 'MRO / CTX (ArcGIS Tile)',
    url: 'https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer/tile/{z}/{y}/{x}',
    tileSize: 512,
    zoomOffset: -1,
    minNative: 1,
    maxNative: 12,
    defaultOpacity: 1.0,
    coveragePct: 99
  },
  {
    id: 'ctxJez',
    group: 'Base Imagery',
    name: 'CTX Jezero M2020 Controlled Mosaic',
    res: '6 m/px',
    instrument: 'MRO / CTX SOC_008',
    url: trekUrl('JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0', 'png'),
    maxNative: 13,
    bounds: JEZ_CTX_BOUNDS,
    defaultOpacity: 1.0,
    coveragePct: 98
  },
  {
    id: 'hiriseJez',
    group: 'Base Imagery',
    name: 'HiRISE Jezero M2020 Controlled Mosaic',
    res: '25 cm/px',
    instrument: 'MRO / HiRISE SOC_006',
    url: trekUrl('JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd', 'png'),
    maxNative: 17,
    bounds: JEZ_HIRISE_BOUNDS,
    defaultOpacity: 1.0,
    coveragePct: 86
  },
  {
    id: 'molaHrsc',
    group: 'Topography & DEM',
    name: 'MOLA + HRSC Color Hillshade',
    res: '200 m/px',
    instrument: 'MGS/MOLA + Mars Express/HRSC',
    url: trekUrl('Mars_MOLA_blend200ppx_HRSC_ClrShade_clon0dd_200mpp_lzw', 'jpg'),
    maxNative: 8,
    defaultOpacity: 0.6,
    coveragePct: 100
  },
  {
    id: 'themisNight',
    group: 'Thermal Inertia',
    name: 'THEMIS Night IR (Thermal Inertia)',
    res: '100 m/px',
    instrument: 'Mars Odyssey / THEMIS IR',
    url: trekUrl('THEMIS_NightIR_ControlledMosaics_100m_v2_oct2018', 'png'),
    maxNative: 9,
    defaultOpacity: 0.65,
    coveragePct: 95,
    // Grayscale night IR re-coloured with a red–blue (RdBu) SVG filter, see THERMAL_RDBU_STOPS
    className: 'mh-thermal-rdbu'
  },
  {
    id: 'tesClay',
    group: 'Spectral Prior (Orbital)',
    name: 'TES Phyllosilicates / High-Si Glass',
    res: '~7 km/px (Prior)',
    instrument: 'MGS / TES + MRO / CRISM Prior',
    url: trekUrl('TES_Glass_Clay', 'png'),
    maxNative: 1,
    defaultOpacity: 0.5,
    coveragePct: 92
  },
  {
    id: 'tesCpx',
    group: 'Spectral Prior (Orbital)',
    name: 'TES High-Ca Clinopyroxene',
    res: '~7 km/px (Prior)',
    instrument: 'MGS / TES Spectral',
    url: trekUrl('TES_Clinopyroxene', 'png'),
    maxNative: 1,
    defaultOpacity: 0.5,
    coveragePct: 92
  },
  {
    id: 'tesDust',
    group: 'Atmosphere & Dust',
    name: 'TES Dust Cover Index',
    res: '~7 km/px',
    instrument: 'MGS / TES + M20 / MEDA Context',
    url: trekUrl('tes_ruffdust', 'png'),
    maxNative: 1,
    defaultOpacity: 0.5,
    coveragePct: 100
  }
];

// Built-in fallback Perseverance traverse & Sol waypoints (Octavia E. Butler -> Séítah -> Three Forks -> Delta)
// Used immediately while MMGIS JSON loads or if offline
const FALLBACK_M20_WAYPOINTS = [
  { sol: 0, name: 'Octavia E. Butler Landing', lat: 18.4447, lon: 77.4508, elev: -2570 },
  { sol: 125, name: 'Crater Floor Fractured Rough', lat: 18.4362, lon: 77.4545, elev: -2574 },
  { sol: 168, name: 'Citadelle (Rochette Core)', lat: 18.4298, lon: 77.4512, elev: -2566 },
  { sol: 205, name: 'Séítah South — Bastide / Garde', lat: 18.4285, lon: 77.4608, elev: -2562 },
  { sol: 295, name: 'Séítah Issole / Quartier', lat: 18.4315, lon: 77.4582, elev: -2564 },
  { sol: 405, name: 'Three Forks Sample Depot', lat: 18.4402, lon: 77.4525, elev: -2560 },
  { sol: 422, name: 'Cape Nukshak (Delta Toe)', lat: 18.4435, lon: 77.4488, elev: -2551 },
  { sol: 455, name: 'Hogwallow Flats / Wildcat Ridge', lat: 18.4452, lon: 77.4512, elev: -2542 },
  { sol: 495, name: 'Skinner Ridge (Delta Scarp)', lat: 18.4518, lon: 77.4595, elev: -2518 },
  { sol: 540, name: 'Yori Pass / Enchanted Lake', lat: 18.4485, lon: 77.4442, elev: -2535 }
];

// THEMIS night IR colormap (cold → warm), shared by the SVG filter and the legend
const THERMAL_RDBU_STOPS = ['#2166ac', '#67a9cf', '#f7f7f7', '#ef8a62', '#b2182b'];

// POI flag colours by priority (fixed hex: must stay legible over Mars imagery)
const POI_FLAG_COLORS = {
  HIGH: '#E5484D',
  MED: '#F5A524',
  LOW: '#5B82C9',
  NONE: '#8E8E93' // not prioritised yet by mission control
};
const flagColor = (poi) => POI_FLAG_COLORS[poi.priority ?? 'NONE'];

const escapeHtml = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]
  );

// Flag marker: pole anchored on the coordinates, label = stop order on the route shown
const flagSvg = (color, label = '', size = 1) =>
  `<svg width="${30 * size}" height="${36 * size}" viewBox="0 0 30 36" aria-hidden="true">` +
  `<line x1="5" y1="3" x2="5" y2="34" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>` +
  `<line x1="5" y1="3" x2="5" y2="34" stroke="#1C1C1E" stroke-width="1.6" stroke-linecap="round"/>` +
  `<path d="M6 3.5 H27 L21.5 10.5 L27 17.5 H6 Z" fill="${color}" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/>` +
  (label
    ? `<text x="14.5" y="14" text-anchor="middle" font-size="9.5" font-weight="700" fill="#ffffff" font-family="DM Mono, ui-monospace, monospace">${escapeHtml(label)}</text>`
    : '') +
  `</svg>`;

// Orbital context for a scientist-defined POI, inferred from the CRISM prior zones drawn on the map
const inferOrbitalContext = (lat, lon) => {
  if (lat >= 18.4415 && lat <= 18.4535 && lon >= 77.4455 && lon <= 77.4605) {
    return { mineral: 'MRO/CRISM: Fe/Mg Smectite Clay prior zone (Delta Front, 18 m/px)', hydrationEst: '4.2 wt% H2O', uncertainty: '±32%' };
  }
  if (lat >= 18.4235 && lat <= 18.4365 && lon >= 77.4535 && lon <= 77.4665) {
    return { mineral: 'MRO/CRISM: Regional Olivine + Mg-Carbonate prior zone (Séítah, 18 m/px)', hydrationEst: '2.5 wt% H2O', uncertainty: '±36%' };
  }
  return { mineral: 'MRO/CRISM: No dominant prior signature (crater-floor basaltic regolith)', hydrationEst: '~2.0 wt% H2O', uncertainty: '±40%' };
};

// Popup shown when a POI flag is clicked: what a field geologist wants to see
const buildPoiPopupHtml = (poi, elevM, scheduledSols) => {
  const color = flagColor(poi);
  const priorityLabel = poi.priority ? `${PRIORITY_META[poi.priority].label} priority` : 'No priority yet';
  const prior = poi.orbitalPrior?.mineral ? poi.orbitalPrior : inferOrbitalContext(poi.lat, poi.lon);
  const post = poi.pdsInSituPosterior;
  const sampled = Boolean(post?.pixl || post?.sherloc || post?.supercam);
  const row = (k, v) => (v ? `<div class="mh-poi-popup__row"><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>` : '');
  return `
    <div class="mh-poi-popup">
      <div class="mh-poi-popup__head">
        <span class="mh-poi-popup__chip" style="background:${color}">${escapeHtml(priorityLabel)}</span>
        <span class="mh-poi-popup__id">${escapeHtml(poi.id)}</span>
      </div>
      <strong class="mh-poi-popup__title">${escapeHtml(poi.name)}</strong>
      <dl>
        ${row('Type of interest', poi.interestType)}
        ${row('Geological unit', poi.geologicalUnit)}
        ${row('Location', `${poi.lat.toFixed(4)}° N · ${poi.lon.toFixed(4)}° E · MOLA ${elevM} m`)}
        ${row('Information to collect', poi.infoToCollect)}
        ${row('Samples', poi.samplesRequired ? poi.sampleNotes || 'Required' : 'Not requested')}
        ${row('Orbital mineralogy (prior)', `${prior.mineral} · ${prior.hydrationEst ?? ''} · σ ${prior.uncertainty}`)}
        ${
          sampled
            ? row('Elemental chemistry (PIXL XRF)', post.pixl) +
              row('Mineral phases (SHERLOC Raman)', post.sherloc) +
              row('Texture (SuperCam)', post.supercam) +
              row(
                'Hydration (in situ)',
                (() => {
                  const h = getHydration(poi).posterior;
                  return h
                    ? `${fmtNum(h.value, 1)} ± ${fmtNum(h.sigma)} wt% H₂O (1σ, ${fmtNum(h.relPct, 1)}%) · handheld PIXL/SHERLOC · demo value`
                    : post.hydrationPosterior;
                })()
              )
            : row('In-situ composition', 'Not sampled yet — orbital prior only.')
        }
        ${row('Biosignature potential', post?.biosignatureRating)}
        ${row('Instruments', poi.instruments.map(instrumentName).join(', '))}
        ${row('Time on site', `${poi.durationMin} min`)}
        ${row('Scheduled', scheduledSols.length ? `Sol ${scheduledSols.join(', ')}` : 'Not in a mission yet')}
      </dl>
    </div>`;
};

// One NASA Trek / ArcGIS tile layer from a catalog entry
const createRasterLayer = (L, cfg, zIndex) =>
  L.tileLayer(cfg.url, {
    tileSize: cfg.tileSize ?? 256,
    zoomOffset: cfg.zoomOffset ?? 0,
    minNativeZoom: cfg.minNative ?? 0,
    maxNativeZoom: cfg.maxNative,
    maxZoom: 18,
    noWrap: true,
    bounds: cfg.bounds ?? [
      [-90, -180],
      [90, 180]
    ],
    opacity: cfg.defaultOpacity,
    zIndex,
    className: cfg.className ?? ''
  });

// 3 Simulated Role Filter Presets (Auto-applied when switching authenticated user)
const ROLE_FILTER_PRESETS = {
  scientist: {
    roleName: 'Scientist',
    badgeColor: '#2D7FF9',
    description:
      'Defines points of interest on the map: type of interest, information to collect and samples to bring back.',
    filters: {
      // All optional layers start OFF for the scientist: clean map, turned on as needed
      filter1_spectralFusion: false, // TES Clay + CRISM Prior vs PDS Posterior Fusion Polygons
      filter2_thermalInertia: false, // THEMIS Night IR bedrock vs aeolian sand
      filter3_pdsTargetsTraverse: false, // Perseverance traverse + waypoints (MMGIS / PDS)
      uncertainty: false, // 1σ of the orbital mineralogy (grey veil) + in-situ rings
      reachable: false, // area within a 40-min walk of a shelter (SEP rule)
      topographySlope: false,
      atmosphereMeda: false,
      candidateRoutes: true
    }
  },
  control: {
    roleName: 'Mission Control (EVA Ops & Safety)',
    badgeColor: '#35B17A',
    description:
      'Prioritises the points of interest, assigns instruments, plans each daily route from the base and sends the calendar to the crew.',
    filters: {
      filter1_spectralFusion: false,
      filter2_thermalInertia: false,
      filter3_pdsTargetsTraverse: true,
      topographySlope: true, // MOLA+HRSC + >15° red slope segments + Amber Not-Evaluated zone
      atmosphereMeda: true, // TES Dust + MEDA telemetry context
      candidateRoutes: true // Route A vs Route B vs Route A-Mod
    }
  },
  astronaut: {
    roleName: 'Astronaut HUD (Suit Visor Execution)',
    badgeColor: '#FF6B35',
    description:
      'Today’s EVA in focus: timed schedule, points of interest to reach and material to bring.',
    filters: {
      filter1_spectralFusion: false, // Spectral clutter OFF on visor
      filter2_thermalInertia: false,
      filter3_pdsTargetsTraverse: true, // Active POI + Field Hazard Markers
      topographySlope: false,
      atmosphereMeda: false,
      candidateRoutes: true // Active route + Shelter Spur
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// §2 INITIAL MISSION STATE WITH REAL PDS ANALYST'S NOTEBOOK DATA (SÉÍTAH & DELTA)
// ═══════════════════════════════════════════════════════════════════════════════
const INITIAL_MISSION_V5 = {
  sol: 24,
  demoScriptSol: 1, // 1 = Orbital Prior Baseline | 2 = Rapid Funnel Discovery + Bayesian Update | 3 = MEDA/SEP Alert
  objective: 'Delta Phyllosilicates & Biosignatures',
  selectedRoute: 'A', // 'A' | 'A-MOD' | 'B' | 'SHELTER'
  roverSupport: true,
  fusionSliderPct: 30, // 0% = Pure Orbital CRISM Prior (±34%), 100% = PDS In-Situ Posterior (±3.8%)
  timeWindow: {
    suggestedStart: '09:30',
    latestReturn: '14:30',
    evaMaxMin: 300,
    returnBufferMin: 45,
    notes: 'PDS MEDA Sol 455 historical thermal & dust curve — not a live forecast'
  },
  // Real targets from Mars 2020 PDS Analyst's Notebook (Séítah & Western Delta)
  pois: [
    {
      id: 'POI-1',
      order: 1,
      name: 'Wildcat Ridge (Hogwallow Flats · Delta Front)',
      feature: 'Fine-Grained Sulfate & Clay Lacustrine Mudstone',
      priority: 'HIGH',
      lat: 18.4452,
      lon: 77.4512,
      elevM: -2542,
      sourceBadge: 'PDS M20 Notebook: Sol 455–509 (Berry Hollow Abrasion)',
      dataConfidence: 'complete',
      activities: ['Stand-off SuperCam', 'Surface Abrasion', 'PIXL + SHERLOC Contact', 'Core Sample'],
      durationMin: 45,
      roverEquivalentSols: 4,
      astronautFunnelMin: 12,
      orbitalPrior: {
        mineral: 'MRO/CRISM: Fe/Mg Smectite Clay (18 m/px)',
        hydrationEst: '4.2 wt% H2O',
        uncertainty: '±32%'
      },
      pdsInSituPosterior: {
        supercam: 'LIBS/VISIR: Hydrated Mg-Fe sulfate + clay matrix confirmed at 3.2 m',
        abrasion: 'Berry Hollow patch (50 mm diameter, 8 mm depth, dust rind cleared)',
        pixl: 'XRF Map: SO3 24.8 wt%, FeO 18.2 wt%, MgO 11.4 wt% ( Ca/Mg sulfate veins )',
        sherloc: 'Deep-UV Raman & Fluorescence: 1-ring & 2-ring aromatic organics co-located with sulfates',
        hydrationPosterior: '8.9 wt% H2O',
        uncertaintyAfter: '±3.8%',
        biosignatureRating: 'VERY HIGH (Skinner/Wildcat PDS Class 1)'
      }
    },
    {
      id: 'POI-2',
      order: 2,
      name: 'Bastide & Garde Outcrop (Séítah Unit)',
      feature: 'Olivine Cumulate with Fe-Mg Carbonate Alteration',
      priority: 'MED',
      lat: 18.4285,
      lon: 77.4608,
      elevM: -2562,
      sourceBadge: 'PDS M20 Notebook: Sol 200–210 (Guillaumes Abrasion)',
      dataConfidence: 'complete',
      activities: ['Stand-off SuperCam', 'Surface Abrasion', 'PIXL + SHERLOC Contact'],
      durationMin: 40,
      roverEquivalentSols: 3,
      astronautFunnelMin: 11,
      orbitalPrior: {
        mineral: 'MRO/CRISM: Regional Olivine + Mg-Carbonate (18 m/px)',
        hydrationEst: '2.5 wt% H2O',
        uncertainty: '±36%'
      },
      pdsInSituPosterior: {
        supercam: 'LIBS/IR: Fo55 cumulate olivine grains + carbonate 2.3/2.5 µm bands',
        abrasion: 'Guillaumes abrasion patch (coarse interlocking olivine + pyroxene)',
        pixl: 'XRF: Igneous olivine cumulate with secondary Fe-Mg carbonate & sulfate in fractures',
        sherloc: 'UV Raman: Carbonate & perchlorate aqueous alteration products',
        hydrationPosterior: '4.8 wt% H2O',
        uncertaintyAfter: '±4.2%',
        biosignatureRating: 'MODERATE (Aqueous Carbonation)'
      }
    },
    {
      id: 'POI-3',
      order: 3,
      name: 'Skinner Ridge (Delta Scarp Conglomerate)',
      feature: 'Fluvial Sandstone & Boulder Conglomerate',
      priority: 'LOW',
      lat: 18.4518,
      lon: 77.4595,
      elevM: -2518,
      sourceBadge: 'PDS M20 Notebook: Sol 490–501 (Swift Run Target)',
      dataConfidence: 'partial',
      activities: ['Stand-off SuperCam', 'PIXL + SHERLOC Contact'],
      durationMin: 50,
      roverEquivalentSols: 3,
      astronautFunnelMin: 10,
      postponedInSol3: false,
      orbitalPrior: {
        mineral: 'MRO/CRISM: Low-Ca Pyroxene + DetritalPhyllosilicate',
        hydrationEst: '3.1 wt% H2O',
        uncertainty: '±29%'
      },
      pdsInSituPosterior: {
        supercam: 'RMI + LIBS: Diverse detrital clasts from Jezero watershed outside crater',
        abrasion: 'Swift Run natural un-abraded / brushed surface',
        pixl: 'XRF: Mafic & phyllosilicate-rich detrital grains cemented by sulfate',
        sherloc: 'Raman: Detrital carbonate + hydrated phases',
        hydrationPosterior: '5.4 wt% H2O',
        uncertaintyAfter: '±5.1%',
        biosignatureRating: 'HIGH (Watershed Sample Diversity)'
      }
    }
  ],
  // Candidate Field Events & Rapid In-Situ Discoveries
  fieldEvents: [
    {
      id: 'FE-024-003',
      ts: 'Sol 24 · 10:42 LST',
      source: 'visorCam + Handheld PIXL/SHERLOC',
      method: 'Rapid 12-min Field Funnel',
      class: 'formation-interest',
      title: 'Séítah-Delta Contact Hydrated Carbonate-Silica Vein',
      confidence: 0.94,
      lat: 18.4395,
      lon: 77.4485,
      photo: 'PDS_SHERLOC_WATSON_SOL438_VEIN',
      description:
        'Sub-meter fracture vein (0.4m wide — below 18m/px CRISM resolution) analyzed in 12 min via handheld SuperCam → Abrader → PIXL/SHERLOC. Shows 11.2 wt% H2O opal-A & Mg-carbonate.',
      actionDirective:
        'Promote to POI-4 (HIGH) to update CRISM prior → posterior and include in Route A-Mod.',
      status: 'confirmed',
      usedInNextPlan: true,
      promotedPoiId: null
    },
    {
      id: 'FE-024-001',
      ts: 'Sol 24 · 10:15 LST',
      source: 'visorCam',
      method: 'objectDetection-demo',
      class: 'boulder',
      title: 'Cape Nukshak Float Boulder Apron (0.9m)',
      confidence: 0.69,
      lat: 18.4422,
      lon: 77.4502,
      photo: 'PDS_NAVCAM_LEFT_SOL422',
      description:
        'Angular basaltic float boulder field 12 m east of direct climb; low-confidence orbital detection.',
      actionDirective: 'boulder detected 12 m right → deviate 15 m West along bench [demo model — not certified]',
      status: 'needs review',
      usedInNextPlan: true,
      promotedPoiId: null
    },
    {
      id: 'FE-024-002',
      ts: 'Sol 24 · 11:02 LST',
      source: 'manual',
      method: 'manual',
      class: 'soft-soil',
      title: 'Séítah Margin Megaripple Sand Pocket',
      confidence: 1.0,
      lat: 18.4335,
      lon: 77.4568,
      photo: 'PDS_HAZCAM_SOL208_RIPPLE',
      description: 'Unconsolidated aeolian sand dunes along Séítah floor; high rover wheel slip & metabolic cost.',
      actionDirective: 'Avoid deep Séítah ripple trough (Route B rejected); stay on consolidated bench.',
      status: 'confirmed',
      usedInNextPlan: true,
      promotedPoiId: null
    }
  ],
  // Predefined EVA Route Candidates in Jezero Crater (Lat/Lon Polylines)
  routes: {
    A: {
      id: 'A',
      name: 'Route A (Three Forks → Wildcat Ridge → Bastide Margin)',
      color: '#2D7FF9',
      dashArray: '10, 6',
      distanceKm: 2.15,
      elevationGainM: 48,
      slopeMax: 13.5,
      dataCoveragePct: 92,
      evaDurationMin: 235,
      bufferMin: 65,
      roverOk: true,
      funnelYield: '3 Full Handheld Funnels (35 min total analysis vs 10 Rover Sols)',
      coords: [
        [18.4402, 77.4525], // Three Forks Base / HAB
        [18.4435, 77.4518],
        [18.4452, 77.4512], // POI-1 Wildcat Ridge
        [18.4375, 77.4548],
        [18.4285, 77.4608]  // POI-2 Bastide / Garde
      ]
    },
    'A-MOD': {
      id: 'A-MOD',
      name: 'Route A-Mod (Posterior Fused Loop via Contact Vein POI-4)',
      color: '#38bdf8',
      dashArray: '12, 5',
      distanceKm: 2.38,
      elevationGainM: 54,
      slopeMax: 14.2,
      dataCoveragePct: 96,
      evaDurationMin: 268,
      bufferMin: 48,
      roverOk: true,
      funnelYield: '4 Full Handheld Funnels (Includes newly promoted POI-4 Vein)',
      coords: [
        [18.4402, 77.4525], // Three Forks Base / HAB
        [18.4395, 77.4485], // POI-4 Promoted Contact Vein (FE-024-003)
        [18.4435, 77.4488], // Cape Nukshak Bench
        [18.4452, 77.4512], // POI-1 Wildcat Ridge
        [18.4285, 77.4608]  // POI-2 Bastide
      ]
    },
    B: {
      id: 'B',
      name: 'Route B (Deep Séítah Ripple Floor + Skinner Scarp Climb)',
      color: '#35B17A',
      dashArray: null,
      distanceKm: 3.85,
      elevationGainM: 92,
      slopeMax: 19.4,
      dataCoveragePct: 74,
      evaDurationMin: 324,
      bufferMin: 21, // 24 min over buffer!
      roverOk: false,
      funnelYield: '3 Funnels, but violates 45-min EVA return buffer & crosses 19.4° scarp',
      coords: [
        [18.4402, 77.4525],
        [18.4335, 77.4568], // Soft soil ripple pocket
        [18.4285, 77.4608], // POI-2 Bastide
        [18.4452, 77.4512], // POI-1 Wildcat Ridge
        [18.4518, 77.4595]  // POI-3 Skinner Ridge (Steep scarp)
      ]
    },
    SHELTER: {
      id: 'SHELTER',
      name: 'Shelter Spur (Three Forks Alcove Rapid Return)',
      color: '#FF6B35',
      dashArray: '7, 4',
      distanceKm: 1.12,
      elevationGainM: 22,
      slopeMax: 9.5,
      dataCoveragePct: 99,
      evaDurationMin: 145,
      bufferMin: 110,
      roverOk: true,
      funnelYield: '2 Rapid Funnels + Emergency Basalt Scarp Radiation Shielding',
      coords: [
        [18.4452, 77.4512], // Wildcat Ridge
        [18.4428, 77.4472], // Delta Basal Alcove Shelter
        [18.4402, 77.4525]  // Three Forks HAB
      ]
    }
  },
  // Plan Versioning Audit Trail
  activePlanVersion: 'v1',
  acknowledgedPlanVersion: 'v1',
  planVersions: [
    {
      version: 'v1',
      sol: 'Sol 24 (Demo Sol 1)',
      ts: 'SOL 24 · 08:30 LST',
      trigger: 'Initial Orbital CRISM Prior Baseline',
      approvedBy: 'Flight Dir. M. Vance & Sci Lead Dr. A. Patel',
      routeId: 'A',
      poiOrder: ['POI-1', 'POI-2'],
      diffSummary: 'Plan v1 (Baseline): Route A · Wildcat Ridge → Bastide (235 min EVA)',
      diffItems: [
        'Route A selected (2.15 km); Route B rejected (+24 min over EVA return buffer in Séítah sand)',
        'Targets: POI-1 (Wildcat Ridge) → POI-2 (Bastide) based on orbital CRISM prior'
      ],
      reason:
        'Maximizes smectite/carbonate sampling while avoiding Séítah ripple slip hazard and 19.4° Skinner scarp.'
    },
    {
      version: 'v2',
      sol: 'Sol 24 (Demo Sol 2 — In-Situ Funnel Update)',
      ts: 'SOL 24 · 10:55 LST',
      trigger: '12-min Handheld PIXL/SHERLOC Funnel at FE-024-003 updated CRISM Posterior',
      approvedBy: 'Flight Dir. M. Vance (MCC) & Sci Lead Dr. A. Patel',
      routeId: 'A-MOD',
      poiOrder: ['POI-4', 'POI-1', 'POI-2'],
      diffSummary:
        'Plan v2 received — 2 changes: (1) Promoted POI-4 Vein [HIGH] via PDS Funnel, (2) Switched to Route A-Mod',
      diffItems: [
        '+ PROMOTED POI-4 (Séítah-Delta Contact Vein · 11.2 wt% H2O confirmed by handheld PIXL/SHERLOC in 12 min)',
        '↻ ROUTE ADAPTED to Route A-Mod (2.38 km, 48 min return buffer OK)'
      ],
      reason:
        'In-situ handheld funnel compressed 4 rover sols into 12 minutes, shrinking local uncertainty from ±34% to ±3.8%.'
    },
    {
      version: 'v3',
      sol: 'Sol 24 (Demo Sol 3 — MEDA Dust + DONKI SEP Alert)',
      ts: 'SOL 24 · 12:10 LST',
      trigger: 'Scripted DONKI SEP Proton Flux (>35 PFU) + MEDA Dust Gust Front',
      approvedBy: 'Flight Dir. M. Vance & Rad Safety Officer K. Chen',
      routeId: 'SHELTER',
      poiOrder: ['POI-1', 'DELTA-ALCOVE-SHELTER'],
      diffSummary:
        'Plan v3 EMERGENCY: EVA shortened to 145 min, divert to Delta Basal Alcove Shelter, POI-2/POI-3 postponed',
      diffItems: [
        '⚠ PRE-AUTHORIZED SAFETY RULE: Divert via orange Shelter Spur to Delta Basal Alcove',
        '⏸ POSTPONED POI-2 & POI-3; secured Wildcat Ridge & Contact Vein cores'
      ],
      reason:
        'Pre-authorized safety rule triggered by scripted SEP alert + MEDA pressure drop; zero autonomous guessing.'
    }
  ],
  optimizerResult: {
    chosenRoute: 'A',
    chosenOrder: ['POI-1', 'POI-2'],
    rejected: [
      {
        option: 'Route B (+1.7 km via Deep Séítah Ripples & Skinner Scarp, covers POI-3)',
        reason:
          'Rejected: 24 min over EVA return buffer (requires 324 min > 300 min cap [demo parameter]) & 19.4° scarp slope'
      }
    ]
  },
  weatherCard: {
    lightWindow: '08:00–16:00 LST (Suggested EVA: 09:30–14:30)',
    medaContext: 'PDS M20 MEDA Sol 455: -24°C · Pressure 742 Pa · Wind 5.8 m/s SE · Dust τ = 0.45',
    radContext: 'MSL/RAD Historical Equivalent: 9.1 µGy/hr nominal (820 µGy/hr in scripted Sol 3 SEP)',
    badge: 'PDS MEDA historical data + scripted scenario — not a live forecast'
  }
};

// Not-Evaluated Zones in Jezero Sector (Explicitly Amber, never green)
const JEZERO_NOT_EVALUATED_ZONES = [
  {
    id: 'NE-JEZ-01',
    name: 'Skinner Ridge Upper Scarp Shadow Trough',
    bounds: [
      [18.4505, 77.4565],
      [18.4555, 77.4645]
    ],
    reason: 'Low solar incidence shadow in HiRISE SOC_006; local 1m stereo DTM correlation incomplete.',
    limit: 'Boulders < 1.5 m & local overhang stability not evaluated.'
  },
  {
    id: 'NE-JEZ-02',
    name: 'Interior Séítah Megaripple Cohesion Zone',
    bounds: [
      [18.4235, 77.4485],
      [18.4295, 77.4565]
    ],
    reason: 'Orbital thermal inertia (THEMIS 100 m/px) cannot resolve sub-crustal sulfate cementation.',
    limit: 'Rover traction & suit boot sinkage not evaluated beyond Perseverance corridor.'
  }
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APPLICATION COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function MissionPlanner() {
  // 1. Authenticated Role State: 'scientist' (Default) | 'control' | 'astronaut'
  const [currentRole, setCurrentRole] = useState('scientist');

  // 2. Shared Mission State (mission.json v5)
  const [mission, setMission] = useState(INITIAL_MISSION_V5);

  // 3. Active 3-Filter Preset + Manual Layer Opacity Controls
  const [activeFilters, setActiveFilters] = useState(
    ROLE_FILTER_PRESETS.scientist.filters
  );
  const [rasterOpacities, setRasterOpacities] = useState({
    hiriseJez: 1.0,
    ctxJez: 1.0,
    molaHrsc: 0.65,
    themisNight: 0.65,
    tesClay: 0.55,
    tesDust: 0.5
  });

  // 4. Proxy & Telemetry States (from index_2.html & map_2.py)
  const [useFastApiProxy, setUseFastApiProxy] = useState(false);
  const [proxyBaseUrl] = useState('http://localhost:8000/proxy?url=');
  const [mapStatusLog, setMapStatusLog] = useState([
    'Initializing Jezero L.CRS.EPSG4326 map...',
    'Loaded PDS Analyst’s Notebook package (Séítah & Western Delta).'
  ]);
  const [clickedPoint, setClickedPoint] = useState({
    lat: 18.4452,
    lon: 77.4512,
    molaElevationM: -2542,
    elevationSource: 'USGS MOLA COG / Local DEM',
    nearestSol: 455,
    nearestWaypointName: 'Hogwallow Flats / Wildcat Ridge',
    distanceKm: 0.02
  });

  // 5. Interactive Funnel & UI Drawer States
  const [selectedPoiId, setSelectedPoiId] = useState(null);
  const [mapReady, setMapReady] = useState(false); // Leaflet loads async: re-run the overlay sync once it exists

  // 6. Shared mission-planning store (POIs, daily missions) used by all three users
  const planner = usePlannerStore();
  const [selectedMissionId, setSelectedMissionId] = useState(null); // mission control editor
  const [astronautSol, setAstronautSol] = useState(TODAY_SOL); // astronaut calendar day
  const [pickMode, setPickMode] = useState(false); // scientist: next map click sets the POI position
  const [draftPoint, setDraftPoint] = useState(null); // scientist: position of the POI being defined
  const mapClickRef = useRef(null);
  // Panel chosen in each user's menu (kept when switching user and back)
  const [roleViews, setRoleViews] = useState({ scientist: 'define', control: 'pois', astronaut: 'schedule' });
  const setRoleView = (role) => (view) => setRoleViews((prev) => ({ ...prev, [role]: view }));
  const [showEvidenceDrawer, setShowEvidenceDrawer] = useState(false);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [shownFeId, setShownFeId] = useState(null); // field discovery shown on the main map (scientist)
  const [selectedFeId, setSelectedFeId] = useState('FE-024-003'); // discovery selected in list / field map
  const [showFieldMap, setShowFieldMap] = useState(false); // field discoveries window (second map)
  const [showBriefing, setShowBriefing] = useState(false); // astronaut EVA briefing (printable, third map)
  const briefMapContainerRef = useRef(null);
  const [highlightPts, setHighlightPts] = useState(null); // route stretch highlighted from the elevation profile
  const [pendingFe, setPendingFe] = useState(null); // discovery to load into the scientist "Add point" form
  const fieldMapContainerRef = useRef(null);
  // Area within the SEP rule (≤ 40 min walk) of each shelter — depends on soft-soil reports
  const shelterRings = useMemo(
    () =>
      SHELTERS.map((sh) => ({
        shelter: sh,
        ring: shelterIsochrone(sh, DEMO_ASSUMPTIONS.sepMinWarningMin, planner.state.fieldEvents)
      })),
    [planner.state.fieldEvents]
  );
  const fieldMapRef = useRef(null);
  const fieldMapLayerRef = useRef(null);
  const [mapExpanded, setMapExpanded] = useState(false);

  // Mission Hub theme: 'auto' follows the device, 'light' / 'dark' force it
  const [themePref, setThemePref] = useState(() => {
    try {
      return localStorage.getItem('syncrowalk-theme') || 'auto';
    } catch {
      return 'auto';
    }
  });
  useEffect(() => {
    const root = document.documentElement;
    if (themePref === 'auto') delete root.dataset.theme;
    else root.dataset.theme = themePref;
    try {
      localStorage.setItem('syncrowalk-theme', themePref);
    } catch {
      /* storage unavailable */
    }
  }, [themePref]);

  // Refs for persistent Leaflet instance (NEVER unmounts on role switch)
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayersRef = useRef({});
  const vectorGroupsRef = useRef({
    traverse: null,
    fusionPrior: null,
    fusionPosterior: null,
    routes: null,
    pois: null,
    fieldEvents: null,
    hazards: null,
    clickPin: null,
    analysis: null
  });
  const waypointsRef = useRef(FALLBACK_M20_WAYPOINTS);
  const mapSectionRef = useRef(null);

  // Keep Leaflet in sync with its container size (full-width toggle, window resize, layout changes)
  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => mapInstanceRef.current?.invalidateSize({ pan: false }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Full-width map: bring it into view and allow Esc to collapse it
  useEffect(() => {
    if (!mapExpanded) return;
    mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const onKey = (e) => {
      if (e.key === 'Escape') setMapExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mapExpanded]);

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4500);
  };

  const appendStatus = (line) => {
    setMapStatusLog((prev) => [...prev.slice(-6), line]);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ROLE SWITCH HANDLER (APPLIES THE 3 SIMULATED ROLE FILTERS AUTOMATICALLY)
  // ═══════════════════════════════════════════════════════════════════════════
  const handleRoleSwitch = (nextRole) => {
    setCurrentRole(nextRole);
    const preset = ROLE_FILTER_PRESETS[nextRole];
    if (preset) {
      setActiveFilters({ ...preset.filters });
    }
    mapInstanceRef.current?.closePopup(); // a POI popup belongs to the previous user's view
    if (nextRole !== 'scientist') {
      setPickMode(false);
      setDraftPoint(null);
    }
    triggerToast(`Signed in as ${preset.roleName} — map position preserved.`);
  };

  // Toggle any of the 3 Simulated Role Filters manually
  const handleToggleRoleFilter = (filterKey) => {
    setActiveFilters((prev) => ({
      ...prev,
      [filterKey]: !prev[filterKey]
    }));
  };

  // Local Jezero MOLA Elevation Estimator + Optional Live HTTP Range GeoTIFF reader
  const estimateJezeroMolaElevation = (lat, lon) => {
    // Accurate topographic gradient across Séítah (-2570m) to Western Delta (-2490m)
    const dLat = lat - 18.435;
    const dLon = lon - 77.455;
    const deltaRise = Math.max(0, (dLat * 1400) - (dLon * 900));
    return Math.round(-2564 + deltaRise);
  };

  const findNearestPerseveranceSol = (lat, lon) => {
    let best = null;
    let dBest = Infinity;
    for (const wp of waypointsRef.current) {
      const d = (wp.lon - lon) ** 2 + (wp.lat - lat) ** 2;
      if (d < dBest) {
        dBest = d;
        best = wp;
      }
    }
    if (!best) return null;
    const km = Math.sqrt(dBest) * 59.16; // ~59.16 km per degree on Mars (from index_2.html)
    return {
      sol: best.sol,
      name: best.name || `Sol ${best.sol}`,
      km,
      elev: best.elev
    };
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZE PERSISTENT LEAFLET MAP (`L.CRS.EPSG4326`) ONCE
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    let isMounted = true;

    const loadLeafletAndInit = async () => {
      // 1. Inject Leaflet 1.9.4 CSS if not already loaded
      if (!document.getElementById('leaflet-css-194')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css-194';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      // 2. Inject Leaflet 1.9.4 JS if not already on window.L
      if (!window.L) {
        // Reuse a pending <script> (React StrictMode runs this effect twice in dev):
        // loading Leaflet twice creates two `L` copies and breaks instanceof checks.
        await new Promise((resolve, reject) => {
          let script = document.getElementById('leaflet-js-194');
          if (!script) {
            script = document.createElement('script');
            script.id = 'leaflet-js-194';
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.async = true;
            document.body.appendChild(script);
          }
          script.addEventListener('load', resolve, { once: true });
          script.addEventListener('error', reject, { once: true });
        });
      }

      if (!isMounted || !mapContainerRef.current || mapInstanceRef.current) return;
      const L = window.L;

      // 3. Create L.map in L.CRS.EPSG4326 exactly as in index_2.html
      const map = L.map(mapContainerRef.current, {
        crs: L.CRS.EPSG4326,
        center: JEZERO_CENTER,
        zoom: 14,
        minZoom: 2,
        maxZoom: 18,
        maxBounds: [
          [-90, -180],
          [90, 180]
        ],
        worldCopyJump: false,
        zoomControl: false
      });

      map.attributionControl.setPrefix('');
      map.attributionControl.addAttribution(
        'NASA/JPL-Caltech, USGS Astropedia, MSSS, ASU, PDS Analyst’s Notebook'
      );
      L.control.scale({ metric: true, imperial: false, position: 'bottomleft' }).addTo(map);

      // 4. Create NASA Trek WMTS & ArcGIS Tile Layers from index_2.html
      JEZERO_RASTER_CATALOG.forEach((cfg, idx) => {
        tileLayersRef.current[cfg.id] = createRasterLayer(L, cfg, 10 + idx);
      });

      // Base imagery layers on by default
      tileLayersRef.current.viking.addTo(map);
      tileLayersRef.current.ctxGlobal.addTo(map);
      tileLayersRef.current.ctxJez.addTo(map);
      tileLayersRef.current.hiriseJez.addTo(map);

      // 5. Initialize Vector Layer Groups
      vectorGroupsRef.current.fusionPrior = L.layerGroup().addTo(map);
      vectorGroupsRef.current.fusionPosterior = L.layerGroup().addTo(map);
      vectorGroupsRef.current.hazards = L.layerGroup().addTo(map);
      vectorGroupsRef.current.traverse = L.layerGroup().addTo(map);
      vectorGroupsRef.current.routes = L.layerGroup().addTo(map);
      vectorGroupsRef.current.fieldEvents = L.layerGroup().addTo(map);
      vectorGroupsRef.current.pois = L.layerGroup().addTo(map);
      vectorGroupsRef.current.clickPin = L.layerGroup().addTo(map);
      vectorGroupsRef.current.analysis = L.layerGroup().addTo(map); // uncertainty, reachable, residuals, rings

      // 6. Map Click Handler (Coordinates + Nearest Perseverance Sol + MOLA Elevation)
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        mapClickRef.current?.(lat, lng);
        const nearest = findNearestPerseveranceSol(lat, lng);
        const molaZ = estimateJezeroMolaElevation(lat, lng);

        if (vectorGroupsRef.current.clickPin) {
          vectorGroupsRef.current.clickPin.clearLayers();
          L.circleMarker([lat, lng], {
            radius: 7,
            color: '#ffffff',
            weight: 2.5,
            fillColor: '#FC3D21',
            fillOpacity: 0.9
          }).addTo(vectorGroupsRef.current.clickPin);
        }

        setClickedPoint({
          lat,
          lon: lng,
          molaElevationM: molaZ,
          elevationSource: 'MOLA 128ppd COG / Jezero DEM',
          nearestSol: nearest?.sol ?? 455,
          nearestWaypointName: nearest?.name ?? 'Jezero Delta',
          distanceKm: nearest?.km ?? 0.1
        });
      });

      mapInstanceRef.current = map;
      setMapReady(true);
      appendStatus('Jezero L.CRS.EPSG4326 map ready. HiRISE 25 cm/px active at zoom 14–17.');

      // 7. Fetch Live Perseverance Traverse & Waypoints from MMGIS (with fallback)
      try {
        const prefix = useFastApiProxy ? proxyBaseUrl : '';
        const travUrl = prefix
          ? prefix + encodeURIComponent(M20_MMGIS_BASE + 'M20_traverse.json')
          : M20_MMGIS_BASE + 'M20_traverse.json';
        const wpUrl = prefix
          ? prefix + encodeURIComponent(M20_MMGIS_BASE + 'M20_waypoints.json')
          : M20_MMGIS_BASE + 'M20_waypoints.json';

        const [travRes, wpRes] = await Promise.all([fetch(travUrl), fetch(wpUrl)]);
        if (travRes.ok && wpRes.ok) {
          const [travJson, wpJson] = await Promise.all([travRes.json(), wpRes.json()]);
          if (wpJson?.features?.length) {
            waypointsRef.current = wpJson.features.map((f) => ({
              sol: f.properties?.sol ?? 0,
              name: f.properties?.name || `Sol ${f.properties?.sol ?? '?'}`,
              lon: f.geometry.coordinates[0],
              lat: f.geometry.coordinates[1],
              elev: f.properties?.elev_geoid ?? -2550
            }));
          }
          if (vectorGroupsRef.current.traverse) {
            L.geoJSON(travJson, {
              style: { color: '#FF6B35', weight: 2.5, opacity: 0.85 }
            }).addTo(vectorGroupsRef.current.traverse);
          }
          appendStatus(
            `Live MMGIS Perseverance traverse loaded (${waypointsRef.current.length} waypoints).`
          );
        }
      } catch (err) {
        appendStatus(
          'Using built-in PDS Perseverance traverse (Octavia E. Butler → Séítah → Wildcat Ridge).'
        );
      }
    };

    loadLeafletAndInit();

    return () => {
      isMounted = false;
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // SYNCHRONIZE RASTER LAYERS & VECTOR OVERLAYS WHEN FILTERS OR STATE CHANGE
  // (Never recreates or repositions the map!)
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = window.L;
    if (!map || !L) return;

    const tl = tileLayersRef.current;

    // 1. Toggle NASA Trek WMTS Raster Overlays based on Active Role Filters
    const syncTile = (id, shouldShow, opacityVal) => {
      const layer = tl[id];
      if (!layer) return;
      if (shouldShow) {
        if (!map.hasLayer(layer)) layer.addTo(map);
        layer.setOpacity(opacityVal ?? 0.65);
      } else {
        if (map.hasLayer(layer)) map.removeLayer(layer);
      }
    };

    // High-res base imagery always on; in HUD mode we keep ONLY clean HiRISE + CTX
    syncTile('hiriseJez', true, rasterOpacities.hiriseJez);
    syncTile('ctxJez', true, rasterOpacities.ctxJez);

    // Role Filter 1 (Scientist): Spectral Prior & CRISM/PDS Fusion
    syncTile(
      'tesClay',
      activeFilters.filter1_spectralFusion && currentRole !== 'astronaut',
      rasterOpacities.tesClay
    );

    // Role Filter 2 (Scientist): Thermal Inertia (THEMIS Night IR)
    syncTile(
      'themisNight',
      activeFilters.filter2_thermalInertia && currentRole !== 'astronaut',
      rasterOpacities.themisNight
    );

    // Role Filter 1 (Mission Control): MOLA + HRSC Topography & Slope
    syncTile(
      'molaHrsc',
      activeFilters.topographySlope && currentRole !== 'astronaut',
      rasterOpacities.molaHrsc
    );

    // Role Filter 2 (Mission Control): TES Dust & MEDA Context
    syncTile(
      'tesDust',
      activeFilters.atmosphereMeda && currentRole !== 'astronaut',
      rasterOpacities.tesDust
    );

    // 2. Render CRISM Orbital Prior vs. PDS In-Situ Posterior Fusion Polygons
    const priorGroup = vectorGroupsRef.current.fusionPrior;
    const postGroup = vectorGroupsRef.current.fusionPosterior;
    priorGroup.clearLayers();
    postGroup.clearLayers();

    if (activeFilters.filter1_spectralFusion && currentRole !== 'astronaut') {
      const priorWeight = Math.max(0.08, (100 - mission.fusionSliderPct) / 100);
      const postWeight = Math.max(0.1, mission.fusionSliderPct / 100);

      // A) ORBITAL CRISM A-PRIORI ESTIMATE (Coarse 18 m/px uncertainty halos ±32%..±36%)
      // Delta Front Smectite Prior Zone
      L.polygon(
        [
          [18.4415, 77.4455],
          [18.4525, 77.4465],
          [18.4535, 77.4605],
          [18.4425, 77.4585]
        ],
        {
          color: '#E5C04A',
          weight: 2,
          dashArray: '6, 6',
          fillColor: '#a855f7',
          fillOpacity: 0.28 * priorWeight
        }
      )
        .bindTooltip(
          'ORBITAL PRIOR [MRO/CRISM 18m/px]: Broad Fe/Mg Smectite Probability (Unc. σ = ±32%)',
          { sticky: true }
        )
        .addTo(priorGroup);

      // Séítah Olivine-Carbonate Prior Zone
      L.polygon(
        [
          [18.4235, 77.4535],
          [18.4355, 77.4545],
          [18.4365, 77.4665],
          [18.4245, 77.4655]
        ],
        {
          color: '#E5C04A',
          weight: 2,
          dashArray: '6, 6',
          fillColor: '#E5C04A',
          fillOpacity: 0.25 * priorWeight
        }
      )
        .bindTooltip(
          'ORBITAL PRIOR [MRO/CRISM 18m/px]: Regional Olivine + Carbonate (Unc. σ = ±36%)',
          { sticky: true }
        )
        .addTo(priorGroup);

      // B) BAYESIAN POSTERIOR UPDATED BY IN-SITU PDS SUPERCAM + PIXL + SHERLOC
      planner.state.pois.filter((poi) => poi.pdsInSituPosterior && poi.orbitalPrior).forEach((poi) => {
        // High-confidence tight posterior ring around each PDS-measured outcrop
        L.circle([poi.lat, poi.lon], {
          radius: 190,
          color: '#35B17A',
          weight: 2.5,
          fillColor: '#35B17A',
          fillOpacity: 0.38 * postWeight
        })
          .bindTooltip(
            `PDS POSTERIOR [${poi.id}]: ${poi.pdsInSituPosterior.hydrationPosterior} (Unc. shrunk ${poi.orbitalPrior.uncertainty} → ${poi.pdsInSituPosterior.uncertaintyAfter})`,
            { sticky: true }
          )
          .addTo(postGroup);
      });

      // High-grade Hydrated Sulfate-Carbonate Vein Corridor (revealed as slider moves right)
      L.polyline(
        [
          [18.4285, 77.4608],
          [18.4395, 77.4485],
          [18.4452, 77.4512]
        ],
        {
          color: '#38bdf8',
          weight: 10,
          opacity: 0.45 * postWeight
        }
      ).addTo(postGroup);
    }

    // 3. Render Slope Hazards (>15° Red) & Amber "Not Evaluated" Zones
    const hazardGroup = vectorGroupsRef.current.hazards;
    hazardGroup.clearLayers();

    if (activeFilters.topographySlope || currentRole === 'control') {
      JEZERO_NOT_EVALUATED_ZONES.forEach((nez) => {
        L.rectangle(nez.bounds, {
          color: '#E5C04A',
          weight: 2,
          dashArray: '8, 4',
          fillColor: '#E5C04A',
          fillOpacity: 0.18
        })
          .bindTooltip(`⚠ NOT EVALUATED [${nez.id}]: ${nez.name} — ${nez.limit}`, {
            sticky: true
          })
          .addTo(hazardGroup);
      });

      // Steep >15° Delta Scarp Red Segment below Skinner Ridge
      L.polyline(
        [
          [18.4468, 77.4542],
          [18.4518, 77.4595]
        ],
        {
          color: '#E5484D',
          weight: 7,
          opacity: 0.85
        }
      )
        .bindTooltip('[ALERT] 19.4° Steep Delta Scarp [HiRISE DTM 1m/px — Demo Threshold 15°]', {
          sticky: true
        })
        .addTo(hazardGroup);
    }

    // 3b. Analysis overlays: uncertainty (σ), reachable area, residual halos, 40-min shelter rings
    const analysisGroup = vectorGroupsRef.current.analysis;
    analysisGroup?.clearLayers();
    if (analysisGroup) {
      const isSci = currentRole === 'scientist';
      if (isSci && activeFilters.uncertainty) {
        // Orbital zones: the larger σ, the denser the grey veil
        PRIOR_ZONES.forEach((z) => {
          L.polygon(z.coords, {
            color: '#8E8E93',
            weight: 1.5,
            dashArray: `2, ${Math.round(z.sigmaPct / 6)}`,
            fillColor: '#8E8E93',
            fillOpacity: (z.sigmaPct / 100) * 0.9
          })
            .bindTooltip(`Orbital uncertainty · 1σ ${z.sigmaPct}% of the estimate (CRISM 18 m/px)`, { sticky: true })
            .addTo(analysisGroup);
        });
        // In-situ points: tight, clear rings (small σ)
        planner.state.pois.forEach((poi) => {
          const h = getHydration(poi);
          if (!h.posterior) return;
          L.circle([poi.lat, poi.lon], { radius: 25 + h.posterior.relPct * 6, color: '#35B17A', weight: 2, fillOpacity: 0 })
            .bindTooltip(`In-situ uncertainty · 1σ ${fmtNum(h.posterior.relPct, 1)}% (demo value)`, { sticky: true })
            .addTo(analysisGroup);
        });
      }
      if (isSci && activeFilters.reachable) {
        shelterRings.forEach(({ shelter, ring }) => {
          L.polygon(ring, { color: '#2D7FF9', weight: 1.5, dashArray: '5, 5', fillColor: '#2D7FF9', fillOpacity: 0.1 })
            .bindTooltip(
              `Reachable: ≤ ${DEMO_ASSUMPTIONS.sepMinWarningMin} min walk from ${shelter.name} (SEP shelter rule, demo model)`,
              { sticky: true }
            )
            .addTo(analysisGroup);
        });
      }
      if (isSci) {
        // Residual halo: neutral when the in-situ value confirms the orbital prior, intense when it contradicts it
        planner.state.pois.forEach((poi) => {
          const { residual } = getHydration(poi);
          if (!residual) return;
          const level = residualLevel(residual.nSigma);
          L.circle([poi.lat, poi.lon], {
            radius: 55,
            color: level.color,
            weight: 2 + level.strength,
            fillColor: level.color,
            fillOpacity: 0.12 + 0.12 * level.strength
          })
            .bindTooltip(
              `${poi.id} residual vs orbital prior: ${residual.delta >= 0 ? '+' : '−'}${fmtNum(Math.abs(residual.delta), 1)} wt% (${fmtNum(Math.abs(residual.nSigma), 1)} σ) · ${level.label}`,
              { sticky: true }
            )
            .addTo(analysisGroup);
        });
      }
      if (currentRole === 'control') {
        shelterRings.forEach(({ shelter, ring }) => {
          L.polyline([...ring, ring[0]], { color: '#35B17A', weight: 2, dashArray: '8, 6', opacity: 0.9 })
            .bindTooltip(`${DEMO_ASSUMPTIONS.sepMinWarningMin}-min return to ${shelter.name} (SEP warning time)`, { sticky: true })
            .addTo(analysisGroup);
        });
      }
      if (highlightPts && highlightPts.length > 1 && currentRole === 'control') {
        L.polyline(highlightPts, { color: '#ffffff', weight: 12, opacity: 0.85 }).addTo(analysisGroup);
      }
      // Rock alcove shelter (the base is drawn with the route layer)
      const alcove = SHELTERS.find((sh) => sh.id === 'ALCOVE');
      L.circleMarker([alcove.lat, alcove.lon], { radius: 7, color: '#ffffff', weight: 2.5, fillColor: '#35B17A', fillOpacity: 1 })
        .bindTooltip(`${alcove.name} · SEP shelter`, { direction: 'top' })
        .addTo(analysisGroup);
    }

    // 4. Render Perseverance Reference Traverse & Waypoints
    const travGroup = vectorGroupsRef.current.traverse;
    travGroup.clearLayers();
    if (activeFilters.filter3_pdsTargetsTraverse && currentRole !== 'astronaut') {
      const fallbackLatLngs = FALLBACK_M20_WAYPOINTS.map((w) => [w.lat, w.lon]);
      L.polyline(fallbackLatLngs, {
        color: '#FF6B35',
        weight: 2.5,
        dashArray: '4, 4',
        opacity: 0.85
      })
        .bindTooltip('Mars 2020 Perseverance Traverse [MMGIS / PDS]', { sticky: true })
        .addTo(travGroup);

      FALLBACK_M20_WAYPOINTS.forEach((wp) => {
        L.circleMarker([wp.lat, wp.lon], {
          radius: 4,
          color: '#ffd166',
          weight: 1.5,
          fillColor: '#0b0f14',
          fillOpacity: 0.9
        })
          .bindTooltip(`Perseverance Sol ${wp.sol}: ${wp.name} (${wp.elev}m)`, {
            direction: 'top'
          })
          .addTo(travGroup);
      });
    }

    // 5. Daily mission route: straight segments base → stops → base, plus the base marker
    const routeGroup = vectorGroupsRef.current.routes;
    routeGroup.clearLayers();
    const { pois: plannerPois, missions: plannerMissions } = planner.state;
    const mapMission =
      currentRole === 'control'
        ? plannerMissions.find((m) => m.id === selectedMissionId)
        : currentRole === 'astronaut'
          ? plannerMissions.find((m) => m.sol === astronautSol && m.status !== 'draft')
          : null;
    const mapPlan = mapMission ? planFor(planner.state, mapMission) : null;

    if (mapPlan && mapPlan.stops.length) {
      const latlngs = mapPlan.path.map((pt) => [pt.lat, pt.lon]);
      L.polyline(latlngs, { color: '#ffffff', weight: 9, opacity: 0.85 }).addTo(routeGroup);
      L.polyline(latlngs, { color: '#2F6BD8', weight: 5, opacity: 1, dashArray: '12, 8' })
        .bindTooltip(
          `Sol ${mapMission.sol} EVA · ${mapPlan.totalKm.toFixed(2)} km along the terrain · back at base ${mapPlan.returnTime}`,
          { sticky: true }
        )
        .addTo(routeGroup);
    }

    const baseIcon = L.divIcon({
      className: '',
      html: `<div style="width:44px;height:44px;border-radius:50%;background:var(--mh-primary);border:3px solid #ffffff;box-shadow:0 3px 12px rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
      </div>`,
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });
    L.marker([BASE.lat, BASE.lon], { icon: baseIcon, zIndexOffset: 1000, title: BASE.name })
      .bindTooltip(`${BASE.name} · ${BASE.lat}° N, ${BASE.lon}° E`, { direction: 'top', offset: [0, -22] })
      .addTo(routeGroup);

    // 6. Render Field Events Layer ([boulder], [soft-soil], [formation-interest])
    const feGroup = vectorGroupsRef.current.fieldEvents;
    feGroup.clearLayers();
    const visibleFieldEvents =
      currentRole === 'control'
        ? planner.state.fieldEvents
        : currentRole === 'scientist'
          ? planner.state.fieldEvents.filter((fe) => fe.id === shownFeId)
          : [];
    // Compact marker (◆ id); the description (class, e.g. "soft-soil", details) opens in a popup on click
    visibleFieldEvents.forEach((fe) => {
      const meta = FIELD_EVENT_META[fe.class] ?? FIELD_EVENT_META['formation-interest'];
      L.marker([fe.lat, fe.lon], {
        zIndexOffset: 600,
        keyboard: true,
        alt: `${fe.id} · ${meta.label}`,
        icon: L.divIcon({
          className: '',
          html: `<div class="mh-fe-marker" style="--fe-color:${meta.color}"><span aria-hidden="true">◆</span>${escapeHtml(fe.id)}</div>`,
          iconSize: null
        })
      })
        // Hover: the type, like the POI flags show their name
        .bindTooltip(`${fe.id} · ${meta.label} (${fe.class})`, { direction: 'right', offset: [72, 0] }) // past the right edge of the ◆ label (centred on the point)
        .on('click', () => openFieldEventPopup(fe))
        .addTo(feGroup);
    });

    // 7. Points of interest as flags coloured by priority (click → geology & mission popup).
    //    Scientist & control see all of them; the astronaut only the stops of the selected day.
    //    The number on the flag is the stop order of the route shown.
    const poiGroup = vectorGroupsRef.current.pois;
    poiGroup.clearLayers();
    const stopOrder = new Map((mapPlan?.stops ?? []).map((poi, i) => [poi.id, i + 1]));
    const visiblePois = currentRole === 'astronaut' ? (mapPlan?.stops ?? []) : plannerPois;

    visiblePois.forEach((poi) => {
      const order = stopOrder.get(poi.id);
      const isSelected = selectedPoiId === poi.id;
      const icon = L.divIcon({
        className: '',
        html: `<div class="mh-poi-flag${isSelected ? ' is-selected' : ''}">${flagSvg(flagColor(poi), order ? String(order) : '')}</div>`,
        iconSize: [30, 36],
        iconAnchor: [5, 34], // foot of the pole on the coordinates
        tooltipAnchor: [12, -24]
      });
      L.marker([poi.lat, poi.lon], { icon, zIndexOffset: isSelected ? 1000 : 500 })
        .bindTooltip(`${poi.id} · ${poi.name.split('(')[0].trim()}`, { direction: 'right' })
        .on('click', () => openPoiPopup(poi))
        .addTo(poiGroup);
    });

    // Draft position of the POI the scientist is defining
    if (currentRole === 'scientist' && draftPoint) {
      L.circleMarker([draftPoint.lat, draftPoint.lon], {
        radius: 10,
        color: '#ffffff',
        weight: 3,
        fillColor: '#FC3D21',
        fillOpacity: 1
      })
        .bindTooltip('New point of interest', { permanent: true, direction: 'top', className: 'syncrowalk-tooltip' })
        .addTo(poiGroup);
    }
  }, [activeFilters, currentRole, mission, rasterOpacities, selectedPoiId, planner.state, selectedMissionId, astronautSol, draftPoint, mapReady, shownFeId, highlightPts, shelterRings]);

  // ═══════════════════════════════════════════════════════════════════════════
  // FIELD DISCOVERIES MAP (Scientist): a second, independent Leaflet map that lives
  // only while its window is open. The main persistent map is never touched.
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const L = window.L;
    const el = fieldMapContainerRef.current;
    if (!showFieldMap || !L || !el) return;

    const fmap = L.map(el, { crs: L.CRS.EPSG4326, minZoom: 10, maxZoom: 18, attributionControl: false });
    ['viking', 'ctxGlobal', 'ctxJez', 'hiriseJez'].forEach((id, idx) => {
      const cfg = JEZERO_RASTER_CATALOG.find((c) => c.id === id);
      if (cfg) createRasterLayer(L, cfg, 10 + idx).addTo(fmap);
    });
    L.control.scale({ metric: true, imperial: false, position: 'bottomleft' }).addTo(fmap);
    fieldMapLayerRef.current = L.layerGroup().addTo(fmap);
    const fitAll = () =>
      fmap.fitBounds(
        [...planner.state.fieldEvents.map((fe) => [fe.lat, fe.lon]), [BASE.lat, BASE.lon]],
        { padding: [70, 70], maxZoom: 16 }
      );
    fitAll();
    fieldMapRef.current = fmap;

    // The dialog reaches its final size after the first layout: re-fit once at that point
    let firstResize = true;
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            fmap.invalidateSize();
            if (firstResize) {
              firstResize = false;
              fitAll();
            }
          })
        : null;
    ro?.observe(el);
    const onKey = (e) => e.key === 'Escape' && setShowFieldMap(false);
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
      ro?.disconnect();
      fmap.remove();
      fieldMapRef.current = null;
      fieldMapLayerRef.current = null;
    };
  }, [showFieldMap]);

  useEffect(() => {
    const L = window.L;
    const group = fieldMapLayerRef.current;
    if (!showFieldMap || !L || !group) return;
    group.clearLayers();

    // Context: base + existing POI flags (faded, not clickable here)
    L.marker([BASE.lat, BASE.lon], {
      interactive: false,
      icon: L.divIcon({
        className: '',
        html: `<div style="width:34px;height:34px;border-radius:50%;background:var(--mh-primary);border:3px solid #fff;display:flex;align-items:center;justify-content:center;opacity:0.8"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg></div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      })
    }).addTo(group);
    planner.state.pois.forEach((poi) => {
      L.marker([poi.lat, poi.lon], {
        interactive: false,
        icon: L.divIcon({
          className: '',
          html: `<div class="mh-poi-flag" style="opacity:0.55">${flagSvg(flagColor(poi))}</div>`,
          iconSize: [30, 36],
          iconAnchor: [5, 34]
        })
      }).addTo(group);
    });

    planner.state.fieldEvents.forEach((fe) => {
      const isSel = fe.id === selectedFeId;
      const color = (FIELD_EVENT_META[fe.class] ?? FIELD_EVENT_META['formation-interest']).color;
      L.marker([fe.lat, fe.lon], {
        zIndexOffset: isSel ? 1000 : 100,
        keyboard: true,
        title: fe.title,
        icon: L.divIcon({
          className: '',
          html: `<div class="mh-fe-marker${isSel ? ' is-selected' : ''}" style="--fe-color:${color}"><span aria-hidden="true">◆</span>${escapeHtml(fe.id)}</div>`,
          iconSize: null
        })
      })
        .on('click', () => {
          setSelectedFeId(fe.id);
          fieldMapRef.current?.panTo([fe.lat, fe.lon], { animate: true });
        })
        .addTo(group);
    });
  }, [showFieldMap, planner.state.fieldEvents, planner.state.pois, selectedFeId]);

  // Mission shown in the astronaut briefing: the one sent for the selected Sol
  const briefingMission = planner.state.missions.find((m) => m.sol === astronautSol && m.status !== 'draft') ?? null;

  // ═══════════════════════════════════════════════════════════════════════════
  // EVA BRIEFING MAP (Astronaut): approved route only, HiRISE, numbered POI flags.
  // Lives only while the briefing window is open.
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const L = window.L;
    const el = briefMapContainerRef.current;
    if (!showBriefing || !L || !el || !briefingMission) return;
    const plan = planFor(planner.state, briefingMission);
    const bmap = L.map(el, { crs: L.CRS.EPSG4326, minZoom: 10, maxZoom: 18, attributionControl: false, zoomControl: false });
    ['viking', 'ctxGlobal', 'ctxJez', 'hiriseJez'].forEach((id, idx) => {
      const cfg = JEZERO_RASTER_CATALOG.find((c) => c.id === id);
      if (cfg) createRasterLayer(L, cfg, 10 + idx).addTo(bmap);
    });
    const latlngs = plan.path.map((pt) => [pt.lat, pt.lon]);
    L.polyline(latlngs, { color: '#ffffff', weight: 8, opacity: 0.85 }).addTo(bmap);
    L.polyline(latlngs, { color: '#2F6BD8', weight: 4, opacity: 1 }).addTo(bmap);
    plan.stops.forEach((poi, i) => {
      L.marker([poi.lat, poi.lon], {
        interactive: false,
        icon: L.divIcon({
          className: '',
          html: `<div class="mh-poi-flag">${flagSvg(flagColor(poi), String(i + 1))}</div>`,
          iconSize: [30, 36],
          iconAnchor: [5, 34]
        })
      }).addTo(bmap);
    });
    SHELTERS.forEach((sh) =>
      L.circleMarker([sh.lat, sh.lon], { radius: 6, color: '#ffffff', weight: 2, fillColor: sh.id === 'BASE' ? '#2F6BD8' : '#35B17A', fillOpacity: 1 })
        .bindTooltip(sh.name, { permanent: true, direction: 'right', className: 'syncrowalk-tooltip' })
        .addTo(bmap)
    );
    const fit = () => bmap.fitBounds(latlngs, { padding: [30, 30], maxZoom: 16 });
    fit();
    let first = true;
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            bmap.invalidateSize();
            if (first) {
              first = false;
              fit();
            }
          })
        : null;
    ro?.observe(el);
    const onKey = (e) => e.key === 'Escape' && setShowBriefing(false);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      ro?.disconnect();
      bmap.remove();
    };
  }, [showBriefing]);

  // ═══════════════════════════════════════════════════════════════════════════
  // ROLE-SPECIFIC MAP ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  // The Leaflet click listener is registered once, so it calls whatever this ref holds
  useEffect(() => {
    mapClickRef.current = (lat, lon) => {
      if (currentRole === 'scientist' && pickMode) {
        setDraftPoint({ lat, lon });
        setPickMode(false);
      }
    };
  }, [currentRole, pickMode]);

  // Frame the selected daily route (control: mission being edited; astronaut: selected Sol)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = window.L;
    if (!map || !L) return;
    const m =
      currentRole === 'control'
        ? planner.state.missions.find((x) => x.id === selectedMissionId)
        : currentRole === 'astronaut'
          ? planner.state.missions.find((x) => x.sol === astronautSol && x.status !== 'draft')
          : null;
    if (!m) return;
    const plan = planFor(planner.state, m);
    if (!plan.stops.length) return;
    map.fitBounds(L.latLngBounds(plan.path.map((pt) => [pt.lat, pt.lon])), {
      padding: [60, 60],
      maxZoom: 16,
      animate: true
    });
    // Only re-frame when the user picks another mission/day, not on every edit
    setHighlightPts(null);
  }, [currentRole, selectedMissionId, astronautSol, mapReady]);

  // Astronaut "Report anomaly": a new field discovery for the Scientist that also slows
  // the Mission Control route model (soft soil within 80 m of the report)
  const handleReportAnomaly = (at) => {
    const sol = TODAY_SOL;
    const fes = planner.state.fieldEvents;
    let n = fes.length + 1;
    let id = `FE-0${sol}-${String(n).padStart(3, '0')}`;
    while (fes.some((f) => f.id === id)) id = `FE-0${sol}-${String(++n).padStart(3, '0')}`;
    planner.addFieldEvent({
      id,
      ts: `Sol ${sol} · reported by the crew`,
      source: 'Astronaut report (EV1 voice + visorCam)',
      method: 'manual',
      class: 'soft-soil',
      title: `Unexpected soft soil near ${at.name}`,
      confidence: 0.6,
      lat: at.lat + 0.0004,
      lon: at.lon + 0.0003,
      photo: `VISORCAM_EV1_${id}`,
      description: 'Boot sinkage about 8 cm on a crusted sand patch not visible in HiRISE. Crew stopped and probed.',
      actionDirective: 'Stop and report. Avoid until Mission Control re-evaluates the route.',
      status: 'needs review'
    });
    triggerToast(`${id} reported: sent to the Scientist's discoveries and to the Mission Control route model.`);
  };

  const showFeOnMainMap = (fe) => {
    setShownFeId(fe ? fe.id : null);
    if (fe) mapInstanceRef.current?.panTo([fe.lat, fe.lon], { animate: true });
  };

  // Popup for a field discovery on the main map (map-level: survives marker redraws)
  const openFieldEventPopup = (fe) => {
    const map = mapInstanceRef.current;
    const L = window.L;
    if (!map || !L) return;
    const meta = FIELD_EVENT_META[fe.class] ?? FIELD_EVENT_META['formation-interest'];
    const row = (k, v) => (v ? `<div class="mh-poi-popup__row"><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>` : '');
    const html = `
      <div class="mh-poi-popup">
        <div class="mh-poi-popup__head">
          <span class="mh-poi-popup__chip" style="background:${meta.color};color:#0b0f14">${escapeHtml(meta.label)} · ${escapeHtml(fe.class)}</span>
          <span class="mh-poi-popup__id">${escapeHtml(fe.id)}</span>
        </div>
        <strong class="mh-poi-popup__title">${escapeHtml(fe.title)}</strong>
        <dl>
          ${row('Description', fe.description)}
          ${row('Status', fe.status === 'confirmed' ? 'Confirmed' : 'Needs review')}
          ${row('Confidence', `${Math.round(fe.confidence * 100)}% (demo value)`)}
          ${row('Logged', fe.ts)}
          ${row('Source', fe.source)}
          ${row('Field directive', fe.actionDirective)}
        </dl>
      </div>`;
    L.popup({
      className: 'mh-leaflet-popup',
      maxWidth: 340,
      minWidth: 260,
      maxHeight: 360,
      offset: [0, -10],
      autoPanPaddingTopLeft: [window.innerWidth >= 640 ? 300 : 24, 24],
      autoPanPaddingBottomRight: [72, 24]
    })
      .setLatLng([fe.lat, fe.lon])
      .setContent(html)
      .openOn(map);
  };

  const openPoiPopup = (poi) => {
    setSelectedPoiId(poi.id);
    const map = mapInstanceRef.current;
    const L = window.L;
    if (!map || !L) return;
    const sols = planner.state.missions
      .filter((m) => m.poiIds.includes(poi.id))
      .map((m) => m.sol)
      .sort((a, b) => a - b);
    L.popup({
      className: 'mh-leaflet-popup',
      maxWidth: 340,
      minWidth: 260,
      maxHeight: 380,
      offset: [10, -30],
      // keep the popup clear of the legend (top-left) and the map buttons (top-right)
      autoPanPaddingTopLeft: [window.innerWidth >= 640 ? 300 : 24, 24],
      autoPanPaddingBottomRight: [72, 24]
    })
      .setLatLng([poi.lat, poi.lon])
      .setContent(buildPoiPopupHtml(poi, estimateJezeroMolaElevation(poi.lat, poi.lon), sols))
      .openOn(map);
  };

  const focusPoi = (poi) => {
    setSelectedPoiId(poi.id);
    mapInstanceRef.current?.panTo([poi.lat, poi.lon], { animate: true });
  };

  const pendingMissions = planner.state.missions.filter((m) => m.status !== 'sent').length;
  const mapRouteVisible =
    currentRole === 'control'
      ? !!planner.state.missions.find((m) => m.id === selectedMissionId)?.poiIds.length
      : currentRole === 'astronaut'
        ? !!planner.state.missions.find((m) => m.sol === astronautSol && m.status !== 'draft')?.poiIds.length
        : false;

  return (
    // Desktop (lg+): app shell exactly one screen tall — the page never scrolls, only the right panel does
    <div className="relative min-h-screen w-full bg-mh-bg text-mh-text flex flex-col select-none overflow-x-hidden lg:h-screen lg:overflow-hidden">
      {/* ═══════════════════════════════════════════════════════════════════════
          §1 GLOBAL TOP BAR (Mission Hub navbar): BRAND + TOOLS + THEME + USER MENU
         ═══════════════════════════════════════════════════════════════════════ */}
      <header className="mh-navbar z-30">
        <div className="px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          {/* Left: Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-mh-accent flex items-center justify-center font-mono font-medium text-sm text-white">
              SW
            </div>
            <div className="flex flex-col">
              <strong className="text-lg tracking-[0.02em] leading-tight">SYNCROWALK</strong>
              <span className="font-mono text-[13px] text-mh-nav-text2">
                EVA Mission Planner · Jezero Crater
              </span>
            </div>
          </div>

          {/* Right: CORS proxy toggle + EVIDENCE + mission.json + theme toggle + user menu (role switcher) */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setUseFastApiProxy((prev) => !prev)}
              aria-pressed={useFastApiProxy}
              className="mh-btn bg-mh-nav-fill text-mh-nav-text !font-mono !text-[13px] !font-medium"
              title="Toggle FastAPI CORS proxy (http://localhost:8000/proxy?url= from map_2.py)"
            >
              <Server className="w-4 h-4" />
              {useFastApiProxy ? 'Proxy :8000 ON' : 'Direct CORS (Trek/USGS)'}
            </button>
            <button
              type="button"
              onClick={() => setShowEvidenceDrawer(true)}
              className="mh-btn bg-mh-nav-fill text-mh-nav-text"
            >
              <Database className="w-4 h-4" />
              <span>Evidence</span>
            </button>
            <button
              type="button"
              onClick={() => setShowJsonModal(true)}
              className="mh-btn mh-btn--icon bg-mh-nav-fill text-mh-nav-text"
              title="Inspect the shared mission plan"
              aria-label="Inspect the shared mission plan"
            >
              <FileJson className="w-4 h-4" />
            </button>
            {(() => {
              // Single round toggle: Auto → Light → Dark → Auto
              const THEMES = {
                auto: { next: 'light', label: 'Auto (follows device)', Icon: SunMoon },
                light: { next: 'dark', label: 'Light', Icon: Sun },
                dark: { next: 'auto', label: 'Dark', Icon: Moon }
              };
              const { next, label, Icon } = THEMES[themePref] ?? THEMES.auto;
              return (
                <button
                  type="button"
                  onClick={() => setThemePref(next)}
                  className="mh-btn mh-btn--icon bg-mh-nav-fill text-mh-nav-text"
                  title={`Appearance: ${label} — click for ${THEMES[next].label}`}
                  aria-label={`Appearance: ${label}. Switch to ${THEMES[next].label}`}
                >
                  <Icon className="w-5 h-5" />
                </button>
              );
            })()}
            {/* Signed-in user + role switcher (simulated users, no authentication yet) */}
            <UserMenu role={currentRole} onSelect={handleRoleSwitch} pendingMissions={pendingMissions} />
          </div>
        </div>
      </header>

      {/* Toast Notification — floats, so the layout never jumps */}
      {toastMsg && (
        <div
          className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-6 sm:max-w-md z-50"
          role="status"
          aria-live="polite"
        >
          <div className="mh-alert !bg-mh-ok-bg !text-mh-ok shadow-mh">
            <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
            <p className="m-0 flex-1 font-semibold">{toastMsg}</p>
            <button
              type="button"
              onClick={() => setToastMsg(null)}
              className="mh-btn mh-btn--icon !bg-transparent !shadow-none text-mh-ok"
              aria-label="Dismiss notification"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          WORKSPACE: FULL-HEIGHT JEZERO MAP (LEFT, OR FULL WIDTH) + SCROLLING ROLE PANEL (RIGHT)
         ═══════════════════════════════════════════════════════════════════════ */}
      <main className="w-full flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_440px] xl:grid-cols-[minmax(0,1fr)_480px] 2xl:grid-cols-[minmax(0,1fr)_540px] gap-4 sm:gap-5 px-4 sm:px-6 py-4">
        {/* LEFT: PERSISTENT LEAFLET MAP CARD */}
        <section
          ref={mapSectionRef}
          className={`flex flex-col bg-mh-card rounded-mh-lg shadow-mh overflow-hidden scroll-mt-6 lg:h-full lg:min-h-0 ${
            mapExpanded ? 'lg:col-span-2' : ''
          }`}
          aria-label="Jezero map"
        >
          {/* Map header: one compact row of layer toggles → more room for the map */}
          <div className="px-5 py-3 flex flex-wrap items-center gap-2 border-b border-mh-sep shrink-0">
            <span className="mh-eyebrow mr-1">Layers</span>
            <FilterToggle
              on={activeFilters.filter1_spectralFusion}
              onClick={() => handleToggleRoleFilter('filter1_spectralFusion')}
              hint="Orbital CRISM/TES mineral zones (prior) vs. rings measured in situ by PIXL/SHERLOC (posterior)"
            >
              CRISM prior ↔ PDS posterior
            </FilterToggle>
            {currentRole === 'scientist' ? (
              <FilterToggle
                on={activeFilters.filter2_thermalInertia}
                onClick={() => handleToggleRoleFilter('filter2_thermalInertia')}
                hint="THEMIS night IR, red–blue colormap: red = warm/high thermal inertia (bedrock), blue = cold (loose sand & dust)"
              >
                THEMIS thermal (100 m)
              </FilterToggle>
            ) : (
              <FilterToggle
                on={activeFilters.topographySlope}
                onClick={() => handleToggleRoleFilter('topographySlope')}
                hint="MOLA+HRSC hillshade, >15° slope segments (red) and not-evaluated zones (amber)"
              >
                Slope &amp; not-evaluated zones
              </FilterToggle>
            )}
            <FilterToggle
              on={activeFilters.filter3_pdsTargetsTraverse}
              onClick={() => handleToggleRoleFilter('filter3_pdsTargetsTraverse')}
              hint="Perseverance rover traverse (orange dotted line) and its Sol waypoints from MMGIS/PDS. HiRISE 25 cm imagery is always on."
            >
              Perseverance traverse (PDS)
            </FilterToggle>
            {currentRole === 'scientist' && (
              <>
                <FilterToggle
                  on={activeFilters.uncertainty}
                  onClick={() => handleToggleRoleFilter('uncertainty')}
                  hint="1σ of the mineralogy layer: a dense grey veil means an uncertain orbital estimate; green rings are in-situ measurements"
                >
                  Uncertainty
                </FilterToggle>
                <FilterToggle
                  on={activeFilters.reachable}
                  onClick={() => handleToggleRoleFilter('reachable')}
                  hint="Area within a 40-min walk of a shelter: what an EVA can reach under the SEP rule"
                >
                  Reachable area
                </FilterToggle>
              </>
            )}
            {currentRole === 'scientist' && (
              <button
                type="button"
                onClick={() => setShowFieldMap(true)}
                className="mh-btn mh-btn--plain !min-h-11 !px-4 !text-[15px] ml-auto"
                title="Open the in-situ field discoveries (FE-…) on their own map"
              >
                <MapPin className="w-4 h-4" aria-hidden="true" />
                <span>Field discoveries</span>
                <span className="mh-pill mh-pill--info !py-0">{planner.state.fieldEvents.length}</span>
              </button>
            )}
          </div>

          {/* Map */}
          <div
            className={`relative ${pickMode ? 'pick-mode' : ''} ${
              mapExpanded ? 'h-[calc(100vh-10rem)] min-h-[420px]' : 'h-[420px] sm:h-[520px]'
            } lg:h-auto lg:flex-1 lg:min-h-0`}
          >
            <div ref={mapContainerRef} className="w-full h-full z-10" />

            {/* SVG filter used by .mh-thermal-rdbu: grayscale THEMIS → red–blue colormap */}
            <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
              <defs>
                <filter id="mh-thermal-rdbu" colorInterpolationFilters="sRGB">
                  <feColorMatrix
                    type="matrix"
                    values="0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0"
                  />
                  <feComponentTransfer>
                    <feFuncR type="linear" slope="1.5" intercept="-0.25" />
                    <feFuncG type="linear" slope="1.5" intercept="-0.25" />
                    <feFuncB type="linear" slope="1.5" intercept="-0.25" />
                  </feComponentTransfer>
                  <feComponentTransfer>
                    <feFuncR type="table" tableValues="0.129 0.404 0.969 0.937 0.698" />
                    <feFuncG type="table" tableValues="0.400 0.663 0.969 0.541 0.094" />
                    <feFuncB type="table" tableValues="0.675 0.812 0.969 0.384 0.169" />
                  </feComponentTransfer>
                </filter>
              </defs>
            </svg>

            <MapLegend
              currentRole={currentRole}
              activeFilters={activeFilters}
              routeVisible={mapRouteVisible}
              showDraft={currentRole === 'scientist' && !!draftPoint}
              showFe={(currentRole === 'control' && planner.state.fieldEvents.length > 0) || (currentRole === 'scientist' && !!shownFeId)}
            />

            {pickMode && (
              <div className="absolute top-[4.25rem] left-3 z-20 mh-alert !py-2 shadow-mh max-w-[calc(100%-5rem)]" role="status">
                <Crosshair className="w-5 h-5 shrink-0" aria-hidden="true" />
                <p className="m-0 font-semibold">Click on the map to place the point of interest</p>
              </div>
            )}

            <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setMapExpanded((v) => !v)}
                className="mh-btn mh-btn--primary mh-btn--icon"
                aria-pressed={mapExpanded}
                aria-label={mapExpanded ? 'Exit full-width map' : 'Show map at full width'}
                title={mapExpanded ? 'Exit full width (Esc)' : 'Full-width map'}
              >
                {mapExpanded ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
              <button
                type="button"
                onClick={() => mapInstanceRef.current?.zoomIn()}
                className="mh-btn mh-btn--plain mh-btn--icon"
                aria-label="Zoom in"
                title="Zoom in (up to HiRISE z17)"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => mapInstanceRef.current?.zoomOut()}
                className="mh-btn mh-btn--plain mh-btn--icon"
                aria-label="Zoom out"
                title="Zoom out"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => mapInstanceRef.current?.setView(JEZERO_CENTER, 14, { animate: true })}
                className="mh-btn mh-btn--plain mh-btn--icon"
                aria-label="Recenter on Séítah & Western Delta"
                title="Recenter on Séítah & Western Delta"
              >
                <Crosshair className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Map footer (compact): selected point + prior/posterior fusion */}
          <div className="px-5 py-3 border-t border-mh-sep flex flex-wrap items-center gap-x-6 gap-y-3 shrink-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0 flex-1">
              <span className="mh-eyebrow">
                <MapPin className="w-4 h-4" aria-hidden="true" />
                Point
              </span>
              <span className="text-base font-mono">
                {clickedPoint.lat.toFixed(5)}° N · {clickedPoint.lon.toFixed(5)}° E
              </span>
              <span className="text-base">
                MOLA <strong>{clickedPoint.molaElevationM} m</strong>
              </span>
              <span className="text-base text-mh-text2">
                Sol {clickedPoint.nearestSol} · {clickedPoint.distanceKm.toFixed(2)} km
              </span>
              {currentRole === 'scientist' && (
                <button
                  type="button"
                  className="mh-btn mh-btn--tinted !min-h-11 !px-4"
                  onClick={() => setDraftPoint({ lat: clickedPoint.lat, lon: clickedPoint.lon })}
                  title="Use the selected point for a new point of interest"
                >
                  <PlusCircle className="w-5 h-5" /> New POI here
                </button>
              )}
            </div>

            {activeFilters.filter1_spectralFusion && currentRole !== 'astronaut' && (
              <div className="flex items-center gap-3 min-w-[260px] flex-1">
                <label htmlFor="fusion-slider" className="mh-eyebrow shrink-0">
                  Fusion
                </label>
                <input
                  id="fusion-slider"
                  type="range"
                  min="0"
                  max="100"
                  value={mission.fusionSliderPct}
                  onChange={(e) => setMission((prev) => ({ ...prev, fusionSliderPct: Number(e.target.value) }))}
                  className="flex-1 h-11 cursor-pointer"
                  aria-valuetext={`${mission.fusionSliderPct}% PDS posterior`}
                  title="CRISM prior (σ ±34%) ↔ PDS posterior (σ ±3.8%)"
                />
                <span className="text-base font-semibold shrink-0">{mission.fusionSliderPct}%</span>
              </div>
            )}
          </div>
        </section>

        {/* RIGHT: ROLE-SPECIFIC DECISION DECK (scrolls with the page) */}
        <aside
          className={`flex flex-col gap-5 sm:gap-6 min-w-0 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:pb-2 ${mapExpanded ? 'lg:hidden' : ''}`}
          aria-label="Decision panel"
        >
          {currentRole === 'scientist' && (
            <ScientistPanel
              store={planner}
              draftPoint={draftPoint}
              setDraftPoint={setDraftPoint}
              pickMode={pickMode}
              setPickMode={setPickMode}
              selectedPoiId={selectedPoiId}
              onFocusPoi={focusPoi}
              onToast={triggerToast}
              view={roleViews.scientist}
              setView={setRoleView('scientist')}
              fieldEvents={planner.state.fieldEvents}
              shownFeId={shownFeId}
              onShowFe={showFeOnMainMap}
              selectedFeId={selectedFeId}
              setSelectedFeId={setSelectedFeId}
              onOpenFieldMap={() => setShowFieldMap(true)}
              onOpenPoiPopup={openPoiPopup}
              pendingFe={pendingFe}
              clearPendingFe={() => setPendingFe(null)}
            />
          )}
          {currentRole === 'control' && (
            <ControlPanel
              store={planner}
              selectedPoiId={selectedPoiId}
              setSelectedPoiId={setSelectedPoiId}
              selectedMissionId={selectedMissionId}
              setSelectedMissionId={setSelectedMissionId}
              onFocusPoi={focusPoi}
              onToast={triggerToast}
              view={roleViews.control}
              setView={setRoleView('control')}
              onHighlight={(pts) => {
                setHighlightPts(pts);
                if (pts) mapInstanceRef.current?.fitBounds(pts, { padding: [80, 80], maxZoom: 17, animate: true });
              }}
            />
          )}
          {currentRole === 'astronaut' && (
            <AstronautPanel
              store={planner}
              selectedSol={astronautSol}
              setSelectedSol={setAstronautSol}
              onFocusPoi={focusPoi}
              view={roleViews.astronaut}
              setView={setRoleView('astronaut')}
              onOpenBriefing={() => setShowBriefing(true)}
              onReportAnomaly={handleReportAnomaly}
            />
          )}
        </aside>
      </main>

      {/* ═══════════════════════════════════════════════════════════════════════
          EVA BRIEFING (Astronaut): sent mission only — printable (window.print)
         ═══════════════════════════════════════════════════════════════════════ */}
      {showBriefing &&
        briefingMission &&
        (() => {
          const A = DEMO_ASSUMPTIONS;
          const plan = planFor(planner.state, briefingMission);
          const m = plan.metrics;
          const evCrew = CREW_ROSTER.filter((c) => c.evaCrew);
          const iv = CREW_ROSTER.find((c) => !c.evaCrew);
          const poiStops = m.stops.filter((st) => st.kind === 'poi');
          const lastPoi = poiStops[poiStops.length - 1];
          const turnBackLst = lastPoi
            ? addMinutesToLst(TIME_WINDOW.latestReturn, -(TIME_WINDOW.returnBufferMin + (lstToMin(m.endLst) - lstToMin(lastPoi.departLst))))
            : null;
          // Comms (demo model): beyond ~0.75 km from the base the ridge blocks the direct link → relay via the rover
          const basePt = [BASE.lat, BASE.lon];
          const relays = m.stops
            .slice(1)
            .map((st, i) => ({ a: m.stops[i], b: st }))
            .filter(({ a, b }) => Math.max(distKm([a.lat, a.lon], basePt), distKm([b.lat, b.lon], basePt)) > 0.75);
          return (
            <div
              className="mh-print-overlay fixed inset-0 z-[1200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
              onClick={() => setShowBriefing(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="briefing-title"
                onClick={(e) => e.stopPropagation()}
                className="mh-print-root bg-mh-card rounded-mh-lg shadow-mh w-full max-w-[1100px] h-[92vh] flex flex-col overflow-hidden select-text"
              >
                <div className="px-5 py-4 flex flex-wrap items-start justify-between gap-3 border-b border-mh-sep shrink-0">
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="mh-eyebrow mh-eyebrow--line">EVA briefing</span>
                    <h2 id="briefing-title" className="m-0 text-[24px] leading-tight font-bold">
                      EVA Briefing — Sol {briefingMission.sol}
                      {briefingMission.sol === TODAY_SOL ? ' (today)' : ''}
                    </h2>
                    <p className="m-0 text-base text-mh-text2">
                      Sent by Mission Control · {plan.evaluation.overall === 'violated' ? 'NO-GO — do not leave the base' : 'GO'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mh-no-print">
                    <button type="button" onClick={() => window.print()} className="mh-btn mh-btn--tinted">
                      Print
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBriefing(false)}
                      className="mh-btn mh-btn--icon bg-mh-fill text-mh-text shrink-0"
                      aria-label="Close briefing"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="mh-print-scroll flex-1 min-h-0 overflow-y-auto p-5 flex flex-col gap-5">
                  {/* Team + objective */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="mh-tile md:col-span-2">
                      <span className="font-mono text-[13px] uppercase tracking-[0.08em] text-mh-text2">Objective</span>
                      <strong className="text-[18px]">{MISSION_OBJECTIVE}</strong>
                      <span className="text-base">
                        {plan.stops.length} target{plan.stops.length === 1 ? '' : 's'} · {m.distanceKm.toFixed(2)} km · out {m.startLst} → back in base{' '}
                        {m.endLst} LST
                      </span>
                    </div>
                    <div className="mh-tile">
                      <span className="font-mono text-[13px] uppercase tracking-[0.08em] text-mh-text2">Team</span>
                      {evCrew.map((c) => (
                        <span key={c.id} className="text-base">
                          <strong>{c.id}</strong> · {c.name}
                        </span>
                      ))}
                      {iv && (
                        <span className="text-base">
                          <strong>IV</strong> · {iv.name} (in base)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Route map: sent route only */}
                  <div className="rounded-mh-md overflow-hidden border border-mh-sep h-[320px] shrink-0 break-inside-avoid">
                    <div ref={briefMapContainerRef} className="w-full h-full" />
                  </div>

                  {/* Hard limits */}
                  <section className="rounded-mh-md border-2 border-[#E5484D] p-4 flex flex-col gap-2 break-inside-avoid" aria-label="Hard limits">
                    <span className="mh-eyebrow">Hard limits</span>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      <Stat label="Turn back by" value={turnBackLst ? `${turnBackLst} LST` : '—'} />
                      <Stat label="Latest return" value={`${TIME_WINDOW.latestReturn} LST`} />
                      <Stat label="Minimum buffer" value={`${TIME_WINDOW.returnBufferMin} min`} />
                      <Stat label="Max time to shelter" value={`${A.sepMinWarningMin} min (route ${Math.round(m.maxTimeToShelterMin)})`} />
                      <Stat label="Max EVA dose" value={`${A.evaDoseLimitMsv} mSv (plan ${m.doseEvaMsv.toFixed(2)})`} />
                      <Stat label="Slope limit" value={`${A.slopeLimitDeg}° (route ${m.maxSlopeDeg.toFixed(1)}°)`} />
                    </div>
                  </section>

                  {/* Timeline with task / tools / measure / photograph per target */}
                  <section className="flex flex-col gap-2" aria-label="Timeline">
                    <span className="mh-eyebrow">Timeline (LST)</span>
                    <ol className="m-0 p-0 list-none flex flex-col gap-2">
                      {m.stops.map((st, i) => {
                        const poi = st.poiId ? planner.state.pois.find((p) => p.id === st.poiId) : null;
                        const h = poi ? getHydration(poi) : null;
                        return (
                          <li key={`${st.name}-${i}`} className="mh-tile !gap-2 break-inside-avoid">
                            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                              <span className="font-mono text-[16px] font-medium">{st.etaLst}</span>
                              <strong className="text-base">{st.name}</strong>
                              {poi && <span className="text-base text-mh-text2">{st.stationMin} min on site · leave {st.departLst}</span>}
                              {st.kind === 'start' && <span className="text-base text-mh-text2">Egress · leave {st.departLst}</span>}
                              {st.kind === 'base' && <span className="text-base text-mh-text2">Ingress · EVA ends {m.endLst}</span>}
                            </div>
                            {poi && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1 text-base">
                                  <span>
                                    <strong>Task:</strong> {poi.infoToCollect}
                                  </span>
                                  <span>
                                    <strong>Tools:</strong> {poi.instruments.length ? poi.instruments.map(instrumentName).join(', ') : 'none assigned'}
                                  </span>
                                  <span>
                                    <strong>Samples:</strong> {poi.samplesRequired ? poi.sampleNotes || 'required' : 'none'}
                                  </span>
                                  <span>
                                    <strong>Photograph:</strong> context panorama, work area with scale bar, contacts and textures.
                                  </span>
                                </div>
                                {h?.prior && (
                                  <ValueWithUncertainty
                                    label="Measure: hydration (replace the orbital estimate)"
                                    value={h.prior.value}
                                    sigma={h.prior.sigma}
                                    unit="wt% H₂O"
                                    kind="prior"
                                    source="MRO · CRISM · 18 m/px"
                                  />
                                )}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  </section>

                  {/* Material */}
                  <section className="flex flex-col gap-2 break-inside-avoid" aria-label="Material">
                    <span className="mh-eyebrow">Material to bring</span>
                    <ul className="m-0 pl-5 grid grid-cols-1 md:grid-cols-2 gap-1 text-base">
                      {plan.equipment.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </section>

                  {/* Abort rules */}
                  <section className="flex flex-col gap-2" aria-label="Abort rules">
                    <span className="mh-eyebrow">Abort rules</span>
                    <ul className="m-0 p-0 list-none grid grid-cols-1 md:grid-cols-2 gap-2">
                      {[
                        ['SEP alert received?', 'Go to the nearest shelter now (base or delta alcove).'],
                        [`Dust τ > ${A.tauVisibilityDegraded} or visibility lost?`, 'Return to base.'],
                        [`Dosimeter above ${A.evaDoseLimitMsv} mSv?`, 'Return to base.'],
                        [`Suit consumables below ${A.suitReservePct}% reserve?`, 'Return to base.'],
                        ['Unexpected soft terrain?', 'Stop, probe, use “Report anomaly”.']
                      ].map(([q, a]) => (
                        <li key={q} className="mh-tile !gap-0.5">
                          <span className="text-base font-semibold">{q}</span>
                          <span className="text-base">
                            <strong className="text-mh-crit">Yes →</strong> {a}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>

                  {/* Comms */}
                  <section className="flex flex-col gap-2" aria-label="Comms">
                    <span className="mh-eyebrow">
                      Comms <SimBadge />
                    </span>
                    <ul className="m-0 pl-5 flex flex-col gap-1 text-base">
                      <li>IV {iv?.name} on the base console. Check in at every stop arrival and every 15 min.</li>
                      {relays.length ? (
                        relays.map(({ a, b }) => (
                          <li key={`${a.name}-${b.name}`}>
                            {a.departLst}–{b.etaLst}: no direct link to the base ({a.name} → {b.name}). Relay via rover.
                          </li>
                        ))
                      ) : (
                        <li>Direct link to the base along the whole route.</li>
                      )}
                    </ul>
                  </section>
                </div>
              </div>
            </div>
          );
        })()}

      {/* ═══════════════════════════════════════════════════════════════════════
          FIELD DISCOVERIES WINDOW (Scientist): second map + list + detail
         ═══════════════════════════════════════════════════════════════════════ */}
      {showFieldMap && (() => {
        const fe = planner.state.fieldEvents.find((f) => f.id === selectedFeId) || planner.state.fieldEvents[0];
        const linked = (id) => planner.state.pois.find((p) => p.fromFieldEventId === id)?.id;
        return (
          <div
            className="fixed inset-0 z-[1200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
            onClick={() => setShowFieldMap(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="field-map-title"
              onClick={(e) => e.stopPropagation()}
              className="bg-mh-card rounded-mh-lg shadow-mh w-full max-w-[1400px] h-[92vh] flex flex-col overflow-hidden"
            >
              <div className="px-5 py-4 flex items-start justify-between gap-3 border-b border-mh-sep shrink-0">
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="mh-eyebrow mh-eyebrow--line">Field discoveries</span>
                  <h2 id="field-map-title" className="m-0 text-[22px] leading-tight font-bold">
                    In-situ discoveries map
                  </h2>
                  <p className="m-0 text-base text-mh-text2">
                    Kept off the main map. Select a discovery to review it, show it on the main map or use it as a point
                    of interest.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFieldMap(false)}
                  className="mh-btn mh-btn--icon bg-mh-fill text-mh-text shrink-0"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 min-h-0 grid grid-cols-1 grid-rows-[minmax(260px,45%)_1fr] lg:grid-rows-1 lg:grid-cols-[minmax(0,1fr)_420px]">
                <div ref={fieldMapContainerRef} className="w-full h-full min-h-0 z-10" />
                <div className="min-h-0 overflow-y-auto p-5 flex flex-col gap-4 border-t lg:border-t-0 lg:border-l border-mh-sep">
                  <DiscoveryList
                    fieldEvents={planner.state.fieldEvents}
                    selectedId={fe.id}
                    onSelect={(item) => {
                      setSelectedFeId(item.id);
                      fieldMapRef.current?.panTo([item.lat, item.lon], { animate: true });
                    }}
                    linkedPoiId={linked}
                  />
                  <h3 className="m-0 text-[20px] leading-tight font-bold">{fe.title}</h3>
                  <DiscoveryDetail
                    fe={fe}
                    linkedPoiId={linked(fe.id)}
                    elevM={estimateJezeroMolaElevation(fe.lat, fe.lon)}
                    shownOnMap={shownFeId === fe.id}
                    onToggleShow={() => {
                      const showing = shownFeId === fe.id;
                      showFeOnMainMap(showing ? null : fe);
                      if (!showing) setShowFieldMap(false);
                    }}
                    onUse={() => {
                      setPendingFe(fe);
                      setRoleViews((prev) => ({ ...prev, scientist: 'define' }));
                      setShowFieldMap(false);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════════════
          EVIDENCE & PDS SOURCES SLIDE-OVER DRAWER
         ═══════════════════════════════════════════════════════════════════════ */}
      {showEvidenceDrawer && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end"
          onClick={() => setShowEvidenceDrawer(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="evidence-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-mh-bg sm:rounded-l-mh-xl h-full flex flex-col gap-4 p-5 sm:p-6 overflow-hidden shadow-mh"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="mh-eyebrow mh-eyebrow--line">Evidence</span>
                <h2 id="evidence-title" className="m-0 text-[22px] leading-tight font-bold">
                  NASA Trek, USGS & PDS sources
                </h2>
                <p className="m-0 text-base text-mh-text2">
                  Every layer lists its mission, instrument, resolution and limits.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEvidenceDrawer(false)}
                className="mh-btn mh-btn--icon bg-mh-card text-mh-text shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-3 -mx-1 px-1">
              <span className="mh-eyebrow">Raster layers</span>
              {JEZERO_RASTER_CATALOG.map((lyr) => (
                <div key={lyr.id} className="p-4 rounded-mh-md bg-mh-card shadow-mh flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1 min-w-0">
                    <strong className="text-base">{lyr.name}</strong>
                    <span className="text-base text-mh-text2">
                      {lyr.instrument} · {lyr.res}
                    </span>
                  </div>
                  <span className="mh-pill mh-pill--ok shrink-0">Coverage {lyr.coveragePct}%</span>
                </div>
              ))}

              <span className="mh-eyebrow mt-3">Not-evaluated zones</span>
              {JEZERO_NOT_EVALUATED_ZONES.map((z) => (
                <div key={z.id} className="p-4 rounded-mh-md bg-mh-card shadow-mh flex flex-col gap-2">
                  <span className="mh-pill mh-pill--warn self-start">Not evaluated · {z.id}</span>
                  <strong className="text-base">{z.name}</strong>
                  <span className="text-base text-mh-text2">{z.reason}</span>
                  <span className="text-base text-mh-text2">Limit: {z.limit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SHARED CONTRACT MODAL (mission plan shared by the three users)
         ═══════════════════════════════════════════════════════════════════════ */}
      {showJsonModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowJsonModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="json-title"
            onClick={(e) => e.stopPropagation()}
            className="bg-mh-card rounded-mh-lg max-w-3xl w-full max-h-[85vh] flex flex-col gap-4 p-5 sm:p-6 shadow-mh"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="mh-eyebrow">Shared state contract</span>
                <h2 id="json-title" className="m-0 text-[22px] leading-tight font-bold">
                  mission-plan.json
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowJsonModal(false)}
                className="mh-btn mh-btn--icon bg-mh-fill text-mh-text shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <pre className="m-0 p-4 rounded-mh-md bg-mh-fill text-base font-mono overflow-auto flex-1 select-text">
              {JSON.stringify({ base: BASE, todaySol: TODAY_SOL, ...planner.state }, null, 2)}
            </pre>
            <button
              type="button"
              className="mh-btn mh-btn--danger self-start"
              onClick={() => {
                if (window.confirm('Reset all points of interest and missions to the demo data?')) {
                  planner.resetDemoData();
                  setSelectedMissionId(null);
                  setSelectedPoiId(null);
                  triggerToast('Demo data restored');
                }
              }}
            >
              Reset demo data
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SMALL MISSION HUB LAYOUT HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
const ROLE_LABELS = {
  scientist: 'Scientist',
  control: 'Mission Control',
  astronaut: 'Astronaut'
};

function FilterToggle({ on, onClick, hint, children }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      title={hint}
      className={`mh-btn !min-h-11 !px-4 !text-[15px] ${on ? 'mh-btn--tinted' : 'bg-mh-fill text-mh-text2'}`}
    >
      {on ? <CheckCircle2 className="w-5 h-5" aria-hidden="true" /> : <span className="w-5 h-5 rounded-full border-2 border-current" aria-hidden="true" />}
      <span>{children}</span>
      <span className="sr-only">{on ? '(on)' : '(off)'}</span>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAP LEGEND (collapsible overlay). Mirrors what the map effect draws for the
// current role + filters, so every line, area and marker on the map is explained.
// ═══════════════════════════════════════════════════════════════════════════════
function LineSwatch({ color, dash = null, width = 3, casing = false }) {
  return (
    <svg width="28" height="12" viewBox="0 0 28 12" aria-hidden="true" className="shrink-0">
      {casing && <line x1="1" y1="6" x2="27" y2="6" stroke="#ffffff" strokeWidth={width + 3} strokeLinecap="round" />}
      <line x1="1" y1="6" x2="27" y2="6" stroke={color} strokeWidth={width} strokeDasharray={dash ?? undefined} strokeLinecap="round" />
    </svg>
  );
}

function AreaSwatch({ stroke, fill, dash = null, round = false }) {
  return (
    <svg width="28" height="16" viewBox="0 0 28 16" aria-hidden="true" className="shrink-0">
      {round ? (
        <circle cx="14" cy="8" r="6.5" stroke={stroke} strokeWidth="2" fill={fill} fillOpacity="0.4" />
      ) : (
        <rect x="2" y="2" width="24" height="12" rx="2" stroke={stroke} strokeWidth="2" strokeDasharray={dash ?? undefined} fill={fill} fillOpacity="0.35" />
      )}
    </svg>
  );
}

function DotSwatch({ color, ring = '#ffffff', size = 14 }) {
  return (
    <span
      className="rounded-full shrink-0"
      style={{ width: size, height: size, background: color, border: `2px solid ${ring}`, boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }}
      aria-hidden="true"
    />
  );
}

function LegendRow({ swatch, children }) {
  return (
    <li className="flex items-center gap-2">
      <span className="w-7 flex justify-center shrink-0">{swatch}</span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}

function LegendSection({ title, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-[13px] uppercase tracking-[0.08em] text-mh-text2">{title}</span>
      <ul className="m-0 p-0 list-none flex flex-col gap-1.5">{children}</ul>
    </div>
  );
}

function MapLegend({ currentRole, activeFilters, routeVisible, showDraft, showFe }) {
  const isSci = currentRole === 'scientist';
  const [open, setOpen] = useState(false); // closed by default: the map stays clean
  const notHud = currentRole !== 'astronaut';
  const showFusion = activeFilters.filter1_spectralFusion && notHud;
  const showThermal = activeFilters.filter2_thermalInertia && notHud;
  const showHazards = activeFilters.topographySlope || currentRole === 'control';
  const showTraverse = activeFilters.filter3_pdsTargetsTraverse && notHud;

  return (
    <div className="absolute top-3 left-3 z-20 w-[270px] max-w-[calc(100%-5rem)] max-h-[calc(100%-1.5rem)] flex flex-col bg-mh-card text-mh-text rounded-mh-md shadow-mh overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center justify-between gap-2 min-h-11 px-3 bg-transparent border-0 cursor-pointer text-mh-text font-semibold text-[15px]"
      >
        <span className="flex items-center gap-2">
          <Layers className="w-4 h-4" aria-hidden="true" />
          Legend
        </span>
        <ChevronDown className={`w-5 h-5 text-mh-text2 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div className="px-3 pb-3 flex flex-col gap-3 overflow-y-auto text-[14px] leading-snug">
          <LegendSection title="Points of interest">
            {[
              ['HIGH', 'High priority'],
              ['MED', 'Medium priority'],
              ['LOW', 'Low priority'],
              ['NONE', 'No priority yet']
            ].map(([k, label]) => (
              <LegendRow key={k} swatch={<span dangerouslySetInnerHTML={{ __html: flagSvg(POI_FLAG_COLORS[k], '', 0.55) }} />}>
                {label}
              </LegendRow>
            ))}
            <li className="text-mh-text2">Number = stop order · click a flag for geology</li>
          </LegendSection>

          <LegendSection title="Base & route">
            <LegendRow swatch={<DotSwatch color="var(--mh-primary)" size={18} />}>Astronaut base (shelter)</LegendRow>
            <LegendRow swatch={<DotSwatch color="#35B17A" size={14} />}>Delta basal alcove (SEP shelter)</LegendRow>
            {currentRole === 'control' && (
              <LegendRow swatch={<LineSwatch color="#35B17A" dash="5 4" width={2} />}>40-min return to a shelter</LegendRow>
            )}
            {routeVisible && (
              <LegendRow swatch={<LineSwatch color="#2F6BD8" dash="5 3" width={3} casing />}>
                Daily EVA route, following the terrain
              </LegendRow>
            )}
          </LegendSection>

          {showFusion && (
            <LegendSection title="CRISM prior ↔ PDS posterior">
              <LegendRow swatch={<AreaSwatch stroke="#E5C04A" fill="#a855f7" dash="4 3" />}>
                Orbital mineral zone (CRISM prior, σ ±32–36%)
              </LegendRow>
              <LegendRow swatch={<AreaSwatch stroke="#35B17A" fill="#35B17A" round />}>
                In-situ measurement (PDS posterior)
              </LegendRow>
              <LegendRow swatch={<LineSwatch color="#38bdf8" width={7} />}>Hydrated vein corridor</LegendRow>
            </LegendSection>
          )}

          {showThermal && (
            <LegendSection title="THEMIS night thermal">
              <li className="flex flex-col gap-1">
                <span
                  className="h-2.5 rounded-full"
                  aria-hidden="true"
                  style={{ background: `linear-gradient(90deg, ${THERMAL_RDBU_STOPS.join(', ')})` }}
                />
                <span className="flex justify-between gap-2 text-mh-text2">
                  <span>Cold · sand/dust</span>
                  <span>Warm · bedrock</span>
                </span>
              </li>
            </LegendSection>
          )}

          {showHazards && (
            <LegendSection title="Slope & not-evaluated">
              <LegendRow swatch={<LineSwatch color="#E5484D" width={5} />}>Slope &gt; 15° (demo threshold)</LegendRow>
              <LegendRow swatch={<AreaSwatch stroke="#E5C04A" fill="#E5C04A" dash="5 3" />}>
                Not evaluated — no safety claim
              </LegendRow>
            </LegendSection>
          )}

          {showTraverse && (
            <LegendSection title="Perseverance traverse">
              <LegendRow swatch={<LineSwatch color="#FF6B35" dash="3 3" width={2.5} />}>Rover path (MMGIS / PDS)</LegendRow>
              <LegendRow
                swatch={
                  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                    <circle cx="6" cy="6" r="4" fill="#0b0f14" stroke="#ffd166" strokeWidth="1.5" />
                  </svg>
                }
              >
                Rover waypoint (hover for Sol)
              </LegendRow>
            </LegendSection>
          )}

          {isSci && activeFilters.uncertainty && (
            <LegendSection title="Uncertainty (1σ)">
              <LegendRow swatch={<AreaSwatch stroke="#8E8E93" fill="#8E8E93" dash="2 4" />}>Orbital estimate · denser = less certain</LegendRow>
              <LegendRow swatch={<AreaSwatch stroke="#35B17A" fill="none" round />}>In-situ measurement · tight ring</LegendRow>
            </LegendSection>
          )}
          {isSci && activeFilters.reachable && (
            <LegendSection title="Reachable area">
              <LegendRow swatch={<AreaSwatch stroke="#2D7FF9" fill="#2D7FF9" dash="4 4" />}>
                ≤ {DEMO_ASSUMPTIONS.sepMinWarningMin} min walk from a shelter
              </LegendRow>
            </LegendSection>
          )}
          {isSci && (
            <LegendSection title="Residual vs orbital prior">
              <LegendRow swatch={<AreaSwatch stroke="#8E8E93" fill="#8E8E93" round />}>Confirms prior (&lt; 1σ)</LegendRow>
              <LegendRow swatch={<AreaSwatch stroke="#E5C04A" fill="#E5C04A" round />}>Partly contradicts (1–2σ)</LegendRow>
              <LegendRow swatch={<AreaSwatch stroke="#FF6B35" fill="#FF6B35" round />}>Contradicts (&gt; 2σ)</LegendRow>
            </LegendSection>
          )}

          <LegendSection title="Markers">
            {showFe &&
              Object.values(FIELD_EVENT_META).map(({ color: c, label }) => (
                <LegendRow key={label} swatch={<span className="font-mono text-[15px] leading-none" style={{ color: c }}>◆</span>}>
                  {label} (field discovery)
                </LegendRow>
              ))}
            {showDraft && (
              <LegendRow swatch={<DotSwatch color="#FC3D21" />}>New point of interest (draft)</LegendRow>
            )}
            <LegendRow swatch={<DotSwatch color="#FC3D21" size={12} />}>Inspected point (map click)</LegendRow>
          </LegendSection>
        </div>
      )}
    </div>
  );
}
