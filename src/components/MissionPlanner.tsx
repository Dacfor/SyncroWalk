// @ts-nocheck -- ported from a standalone prototype; remove once the file is fully typed.
import React, { useState, useEffect, useRef } from 'react';
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
import UserMenu from './planner/UserMenu.tsx';
import { BASE, FIELD_EVENT_META, PRIORITY_META, TODAY_SOL, planMission } from './planner/model.ts';

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
  const [poiLabelId, setPoiLabelId] = useState(null); // POI whose description is open on the map
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
    clickPin: null
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
    const mapPlan = mapMission ? planMission(mapMission, plannerPois) : null;

    if (mapPlan && mapPlan.stops.length) {
      const latlngs = mapPlan.path.map((pt) => [pt.lat, pt.lon]);
      L.polyline(latlngs, { color: '#ffffff', weight: 9, opacity: 0.85 }).addTo(routeGroup);
      L.polyline(latlngs, { color: '#2F6BD8', weight: 5, opacity: 1, dashArray: '12, 8' })
        .bindTooltip(
          `Sol ${mapMission.sol} EVA · ${mapPlan.totalKm.toFixed(2)} km · back at base ${mapPlan.returnTime}`,
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
        ? mission.fieldEvents
        : currentRole === 'scientist'
          ? mission.fieldEvents.filter((fe) => fe.id === shownFeId)
          : [];
    visibleFieldEvents.forEach((fe) => {
      const color = (FIELD_EVENT_META[fe.class] ?? FIELD_EVENT_META['formation-interest']).color;

      const feHtml = `
        <div style="display:flex;align-items:center;gap:6px;background:var(--mh-card);color:${color};border:2px solid ${color};padding:2px 10px;border-radius:999px;font-family:var(--mh-font-mono);font-size:12px;font-weight:500;white-space:nowrap;box-shadow:0 2px 10px rgba(0,0,0,0.35);">
          <span>◆ ${fe.id}</span>
          <span style="color:var(--mh-text);">[${fe.class}]</span>
          <span>${Math.round(fe.confidence * 100)}%</span>
        </div>
      `;
      const icon = L.divIcon({
        className: '',
        html: feHtml,
        iconSize: [165, 24],
        iconAnchor: [82, 12]
      });

      L.marker([fe.lat, fe.lon], { icon }).bindTooltip(fe.title, { direction: 'top' }).addTo(feGroup);
    });

    // 7. Points of interest. Scientist & control see all of them; the astronaut only
    //    sees the stops of the selected day. Numbers follow the route order.
    const poiGroup = vectorGroupsRef.current.pois;
    poiGroup.clearLayers();
    const stopOrder = new Map((mapPlan?.stops ?? []).map((poi, i) => [poi.id, i + 1]));
    const visiblePois = currentRole === 'astronaut' ? (mapPlan?.stops ?? []) : plannerPois;

    visiblePois.forEach((poi) => {
      const order = stopOrder.get(poi.id);
      const color = poi.priority ? PRIORITY_META[poi.priority].color : 'var(--mh-text2)';
      const sub = poi.priority ? `${PRIORITY_META[poi.priority].label} priority` : 'No priority yet';
      const isSelected = selectedPoiId === poi.id;
      const labelOpen = poiLabelId === poi.id;
      const ring = isSelected ? 'var(--mh-primary)' : '#ffffff';
      const dot = `<span style="width:26px;height:26px;border-radius:50%;background:${color};color:var(--mh-card);font-family:var(--mh-font-mono);font-weight:500;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${order ?? '•'}</span>`;
      // Collapsed: just the numbered dot. Clicking it opens the short description.
      const html = labelOpen
        ? `<div style="display:flex;align-items:center;gap:8px;background:var(--mh-card);border:2px solid ${ring === '#ffffff' ? color : ring};padding:2px 12px 2px 2px;border-radius:999px;box-shadow:0 3px 12px rgba(0,0,0,0.35);white-space:nowrap;cursor:pointer;">
            ${dot}
            <div>
              <div style="color:var(--mh-text);font-family:var(--mh-font);font-weight:700;font-size:13px;line-height:1.2;">${poi.id} · ${poi.name.split('(')[0].trim()}</div>
              <div style="color:var(--mh-text2);font-family:var(--mh-font);font-size:12px;">${sub} · ${poi.interestType}</div>
            </div>
          </div>`
        : `<div style="display:inline-flex;border:2px solid ${ring};border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.45);cursor:pointer;">${dot}</div>`;
      const icon = L.divIcon({
        className: '',
        html,
        iconSize: labelOpen ? [240, 34] : [30, 30],
        iconAnchor: [15, 15] // dot centre stays on the coordinates in both states
      });
      L.marker([poi.lat, poi.lon], {
        icon,
        zIndexOffset: labelOpen ? 900 : isSelected ? 800 : 500,
        title: `${poi.id} — click for details`
      })
        .on('click', () => {
          setPoiLabelId((cur) => (cur === poi.id ? null : poi.id));
          setSelectedPoiId(poi.id);
        })
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
  }, [activeFilters, currentRole, mission, rasterOpacities, selectedPoiId, poiLabelId, planner.state, selectedMissionId, astronautSol, draftPoint, mapReady, shownFeId]);

  // ═══════════════════════════════════════════════════════════════════════════
  // ROLE-SPECIFIC MAP ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  // The Leaflet click listener is registered once, so it calls whatever this ref holds
  useEffect(() => {
    mapClickRef.current = (lat, lon) => {
      setPoiLabelId(null);
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
    const plan = planMission(m, planner.state.pois);
    if (!plan.stops.length) return;
    map.fitBounds(L.latLngBounds(plan.path.map((pt) => [pt.lat, pt.lon])), {
      padding: [60, 60],
      maxZoom: 16,
      animate: true
    });
    // Only re-frame when the user picks another mission/day, not on every edit
  }, [currentRole, selectedMissionId, astronautSol, mapReady]);

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
      <main className="w-full flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_440px] xl:grid-cols-[minmax(0,1fr)_480px] 2xl:grid-cols-[minmax(0,1fr)_540px] gap-4 sm:gap-5 pl-4 pr-4 sm:pr-6 lg:pl-0 py-4">
        {/* LEFT: PERSISTENT LEAFLET MAP CARD */}
        <section
          ref={mapSectionRef}
          className={`flex flex-col bg-mh-card rounded-mh-lg lg:rounded-l-none shadow-mh overflow-hidden scroll-mt-6 lg:h-full lg:min-h-0 ${
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
              showFe={(currentRole === 'control' && mission.fieldEvents.length > 0) || (currentRole === 'scientist' && !!shownFeId)}
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
              fieldEvents={mission.fieldEvents}
              shownFeId={shownFeId}
              onShowFe={(fe) => {
                setShownFeId(fe ? fe.id : null);
                if (fe) mapInstanceRef.current?.panTo([fe.lat, fe.lon], { animate: true });
              }}
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
            />
          )}
        </aside>
      </main>

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
            {Object.entries(PRIORITY_META).map(([k, m]) => (
              <LegendRow key={k} swatch={<DotSwatch color={m.color} />}>
                {m.label} priority
              </LegendRow>
            ))}
            <LegendRow swatch={<DotSwatch color="var(--mh-text2)" />}>No priority yet</LegendRow>
            <li className="text-mh-text2">Number = stop order · click a point for details</li>
          </LegendSection>

          <LegendSection title="Base & route">
            <LegendRow swatch={<DotSwatch color="var(--mh-primary)" size={18} />}>Astronaut base</LegendRow>
            {routeVisible && (
              <LegendRow swatch={<LineSwatch color="#2F6BD8" dash="5 3" width={3} casing />}>
                Daily EVA route (base → stops → base)
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
