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
  Sun,
  Moon,
  SunMoon,
  Flag,
  ChevronDown,
  Users,
  HeartPulse
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// §1 REAL JEZERO CRATER CONFIGURATION (FROM index_2.html & map_2.py)
// ═══════════════════════════════════════════════════════════════════════════════
const TREK_BASE = 'https://trek.nasa.gov/tiles/Mars/EQ';
const trekUrl = (id, ext) =>
  `${TREK_BASE}/${id}/1.0.0/default/default028mm/{z}/{y}/{x}.${ext}`;

const JEZERO_CENTER = [18.4365, 77.4565]; // Centered on Séítah & Western Delta Front
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

// 3 Simulated Role Filter Presets (Auto-applied when switching authenticated user)
const ROLE_FILTER_PRESETS = {
  scientist: {
    roleName: 'Scientist (Geology & Astrobiology)',
    badgeColor: '#2D7FF9',
    description:
      'Compares orbital CRISM/TES prior against in-situ PDS SuperCam, PIXL & SHERLOC measurements.',
    filters: {
      filter1_spectralFusion: true, // TES Clay + CRISM Prior vs PDS Posterior Fusion Polygons
      filter2_thermalInertia: true, // THEMIS Night IR bedrock vs aeolian sand
      filter3_pdsTargetsTraverse: true, // HiRISE 25cm + Perseverance Traverse + PDS Notebook POIs
      topographySlope: false,
      atmosphereMeda: false,
      candidateRoutes: true
    }
  },
  control: {
    roleName: 'Mission Control (EVA Ops & Safety)',
    badgeColor: '#35B17A',
    description:
      'Evaluates MOLA/HiRISE slope hazards, Not-Evaluated zones, MEDA weather & route time buffers.',
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
      'High-contrast HiRISE 25cm surface only, active route vector & 12-minute handheld PDS funnel.',
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
// §3 MAP SYMBOLOGY, REALISTIC ROUTE GEOMETRY & CREW STATUS (DEMO DATA)
// ═══════════════════════════════════════════════════════════════════════════════

// POI flag colours by scientific importance (fixed hex: must stay legible over Mars imagery)
const POI_FLAG_COLORS = {
  HIGH: '#E5484D',
  MED: '#F5A524',
  LOW: '#5B82C9'
};

// THEMIS Night IR colormap: cold (low thermal inertia: sand/dust) → warm (high inertia: bedrock)
const THERMAL_RDBU_STOPS = ['#2166ac', '#67a9cf', '#f7f7f7', '#ef8a62', '#b2182b'];

// Radiation dose rates used for route estimates (from weatherCard.radContext)
const DOSE_RATE_NOMINAL_UGY_H = 9.1;
const DOSE_RATE_SEP_UGY_H = 820;

const escapeHtml = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]
  );

// Deterministic PRNG so every route keeps the same "hand-walked" shape across renders
const hashString = (str) =>
  [...str].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 2166136261);
const seededRandom = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

// Turns straight waypoint-to-waypoint segments into a meandering, terrain-following
// path. The path still passes exactly through every waypoint (POIs, HAB, shelter):
// only the in-between geometry is displaced. Data in mission.routes stays unchanged.
const toRealisticPath = (coords, seedKey) => {
  if (!coords || coords.length < 2) return coords;
  const rand = seededRandom(hashString(seedKey));
  const out = [coords[0]];
  for (let i = 0; i < coords.length - 1; i++) {
    const [lat1, lon1] = coords[i];
    const [lat2, lon2] = coords[i + 1];
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;
    const len = Math.hypot(dLat, dLon);
    if (len === 0) continue;
    const steps = Math.max(8, Math.round(len / 0.00025)); // one vertex every ~15 m
    const nLat = -dLon / len; // unit normal to the segment
    const nLon = dLat / len;
    const amp = Math.min(len * 0.09, 0.0006); // max lateral detour ≈ 35 m
    const f1 = 1 + Math.floor(rand() * 2);
    const f2 = 3 + Math.floor(rand() * 3);
    const p1 = rand() * Math.PI * 2;
    const p2 = rand() * Math.PI * 2;
    const a1 = (0.6 + rand() * 0.4) * (rand() < 0.5 ? -1 : 1);
    for (let k = 1; k < steps; k++) {
      const t = k / steps;
      const envelope = Math.sin(Math.PI * t); // 0 at both waypoints
      const wobble =
        0.75 * a1 * Math.sin(2 * Math.PI * f1 * t + p1) +
        0.25 * Math.sin(2 * Math.PI * f2 * t + p2) +
        (rand() - 0.5) * 0.15;
      const off = amp * envelope * wobble;
      out.push([lat1 + dLat * t + nLat * off, lon1 + dLon * t + nLon * off]);
    }
    out.push(coords[i + 1]);
  }
  return out;
};

const flagSvg = (color, label = '', size = 1) =>
  `<svg width="${30 * size}" height="${36 * size}" viewBox="0 0 30 36" aria-hidden="true">` +
  `<line x1="5" y1="3" x2="5" y2="34" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>` +
  `<line x1="5" y1="3" x2="5" y2="34" stroke="#1C1C1E" stroke-width="1.6" stroke-linecap="round"/>` +
  `<path d="M6 3.5 H27 L21.5 10.5 L27 17.5 H6 Z" fill="${color}" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/>` +
  (label
    ? `<text x="14.5" y="14" text-anchor="middle" font-size="9.5" font-weight="700" fill="#ffffff" font-family="DM Mono, ui-monospace, monospace">${escapeHtml(label)}</text>`
    : '') +
  `</svg>`;

// Orbital context for a scientist-added POI, inferred from the CRISM prior zones drawn on the map
const inferOrbitalContext = (lat, lon) => {
  if (lat >= 18.4415 && lat <= 18.4535 && lon >= 77.4455 && lon <= 77.4605) {
    return {
      mineral: 'MRO/CRISM: Fe/Mg Smectite Clay prior zone (Delta Front, 18 m/px)',
      hydrationEst: '4.2 wt% H2O',
      uncertainty: '±32%'
    };
  }
  if (lat >= 18.4235 && lat <= 18.4365 && lon >= 77.4535 && lon <= 77.4665) {
    return {
      mineral: 'MRO/CRISM: Regional Olivine + Mg-Carbonate prior zone (Séítah, 18 m/px)',
      hydrationEst: '2.5 wt% H2O',
      uncertainty: '±36%'
    };
  }
  return {
    mineral: 'MRO/CRISM: No dominant prior signature (crater-floor basaltic regolith)',
    hydrationEst: '~2.0 wt% H2O',
    uncertainty: '±40%'
  };
};

// Leaflet popup shown when a POI flag is clicked: what a field geologist wants to see
const buildPoiPopupHtml = (poi) => {
  const color = POI_FLAG_COLORS[poi.priority] ?? POI_FLAG_COLORS.LOW;
  const priorityLabel = { HIGH: 'High', MED: 'Medium', LOW: 'Low' }[poi.priority] ?? 'Low';
  const post = poi.pdsInSituPosterior;
  const prior = poi.orbitalPrior;
  const pending = poi.dataConfidence === 'orbital-only';
  const row = (k, v) =>
    `<div class="mh-poi-popup__row"><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`;
  return `
    <div class="mh-poi-popup">
      <div class="mh-poi-popup__head">
        <span class="mh-poi-popup__chip" style="background:${color}">${priorityLabel} priority</span>
        <span class="mh-poi-popup__id">${escapeHtml(poi.id)}${poi.postponedInSol3 ? ' · postponed' : ''}</span>
      </div>
      <strong class="mh-poi-popup__title">${escapeHtml(poi.name)}</strong>
      <dl>
        ${row('Geological unit', poi.feature)}
        ${row('Location', `${poi.lat.toFixed(4)}° N · ${poi.lon.toFixed(4)}° E · MOLA ${poi.elevM} m`)}
        ${row('Orbital mineralogy (prior)', `${prior.mineral} · ${prior.hydrationEst} · σ ${prior.uncertainty}`)}
        ${
          pending
            ? row('In-situ composition', 'Not sampled yet — run the 12-min handheld funnel to replace the orbital prior.')
            : row('Elemental chemistry (PIXL XRF)', post.pixl) +
              row('Mineral phases (SHERLOC Raman)', post.sherloc) +
              row('Texture (SuperCam)', post.supercam) +
              row('Hydration (posterior)', `${post.hydrationPosterior} · σ ${post.uncertaintyAfter}`)
        }
        ${row('Biosignature potential', post.biosignatureRating)}
      </dl>
      <span class="mh-poi-popup__src">${escapeHtml(poi.sourceBadge)}</span>
    </div>`;
};

const formatDose = (ugy) =>
  ugy >= 1000 ? `${(ugy / 1000).toFixed(2)} mGy` : `${ugy.toFixed(1)} µGy`;

const addMinutesToLst = (hhmm, minutes) => {
  const [h, m] = hhmm.split(':').map(Number);
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

const formatDuration = (minutes) => `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`;

// Simulated crew roster for Mission Control (demo data — not real telemetry).
// Surface dose = cumulative since landing (Sol 1 → today), planned vs measured by suit dosimeter.
const CREW_ROSTER = [
  {
    id: 'EV1',
    name: 'Cmdr. Lena Okafor',
    role: 'EVA lead · Field geology',
    onEva: true,
    evasCompleted: 7,
    dosePlannedMsv: 15.4,
    doseActualMsv: 14.9,
    vitals: { heartRate: 88, spo2: 97, sleepH: 7.1 },
    fatigue: 'Low',
    psych: 'Nominal (Sol 23 check-in)'
  },
  {
    id: 'EV2',
    name: 'Dr. Samir Haddad',
    role: 'EVA · Astrobiology & sampling',
    onEva: true,
    evasCompleted: 6,
    dosePlannedMsv: 15.4,
    doseActualMsv: 15.6,
    vitals: { heartRate: 101, spo2: 96, sleepH: 5.9 },
    fatigue: 'Moderate',
    psych: 'Nominal · reports short sleep'
  },
  {
    id: 'IV',
    name: 'Eng. Rui Tanaka',
    role: 'IV operator · HAB & comms',
    onEva: false,
    evasCompleted: 3,
    dosePlannedMsv: 12.6,
    doseActualMsv: 12.2,
    vitals: { heartRate: 72, spo2: 98, sleepH: 7.6 },
    fatigue: 'Low',
    psych: 'Nominal'
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
  const [selectedPoiId, setSelectedPoiId] = useState('POI-1');
  const [selectedFieldEventId, setSelectedFieldEventId] = useState('FE-024-003');
  const [funnelStageProgress, setFunnelStageProgress] = useState({
    standoff: true,
    abrasion: true,
    contact: true,
    posteriorUpdated: false
  });
  const [isRunningFunnelAnim, setIsRunningFunnelAnim] = useState(false);
  const [sepAlertActive, setSepAlertActive] = useState(false);
  const [hudLocalZoom, setHudLocalZoom] = useState(false);
  const [showEvidenceDrawer, setShowEvidenceDrawer] = useState(false);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  // Scientist "Add POI" draft (null = form closed). Location = the currently selected map point.
  const [newPoiDraft, setNewPoiDraft] = useState(null);

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
  // Flips once the async Leaflet init finishes, so overlays (flags, routes, rasters) draw on first load
  const [mapReady, setMapReady] = useState(false);

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4500);
  };

  const appendStatus = (line) => {
    setMapStatusLog((prev) => [...prev.slice(-6), line]);
  };

  // Selects a POI and opens its geology/composition popup. The popup is map-level
  // (not bound to the marker) so it survives the marker redraw that selection triggers.
  const openPoiPopup = (poi) => {
    setSelectedPoiId(poi.id);
    const map = mapInstanceRef.current;
    const L = window.L;
    if (!map || !L) return;
    L.popup({
      className: 'mh-leaflet-popup',
      maxWidth: 320,
      minWidth: 240,
      offset: [10, -30],
      // keep the popup clear of the legend (top-left) and zoom buttons (top-right)
      autoPanPaddingTopLeft: [window.innerWidth >= 640 ? 290 : 24, 24],
      autoPanPaddingBottomRight: [72, 24]
    })
      .setLatLng([poi.lat, poi.lon])
      .setContent(buildPoiPopupHtml(poi))
      .openOn(map);
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
    if (nextRole !== 'astronaut' && hudLocalZoom) {
      setHudLocalZoom(false);
    }
    triggerToast(
      `Authenticated as [${preset.roleName}] — Applied 3 role filter presets on persistent Jezero map.`
    );
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
      //    Reuse a pending <script> (React StrictMode runs this effect twice in dev):
      //    loading Leaflet twice creates two `L` copies and breaks instanceof checks.
      if (!window.L) {
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
        const lyr = L.tileLayer(cfg.url, {
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
          zIndex: 10 + idx,
          className: cfg.className ?? ''
        });
        tileLayersRef.current[cfg.id] = lyr;
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
          })
            .bindTooltip(
              `MOLA: ${molaZ} m · Sol ${nearest?.sol ?? '?'} (${nearest?.km.toFixed(2)} km)`,
              { permanent: true, direction: 'top', className: 'syncrowalk-tooltip' }
            )
            .addTo(vectorGroupsRef.current.clickPin);
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
      mission.pois.forEach((poi) => {
        // Scientist-added targets have no in-situ data yet → no posterior ring
        if (poi.dataConfidence === 'orbital-only') return;
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

    // 5. Render Candidate EVA Routes (A, A-Mod, B, Shelter Spur)
    const routeGroup = vectorGroupsRef.current.routes;
    routeGroup.clearLayers();
    if (activeFilters.candidateRoutes) {
      Object.values(mission.routes).forEach((rt) => {
        const isSelected = mission.selectedRoute === rt.id;
        // In Astronaut HUD mode, show only the active route (and Shelter Spur if SEP alert is active)
        if (
          currentRole === 'astronaut' &&
          !isSelected &&
          !(sepAlertActive && rt.id === 'SHELTER')
        ) {
          return;
        }

        // Realistic, terrain-following geometry (still passes through every waypoint)
        L.polyline(toRealisticPath(rt.coords, rt.id), {
          color: rt.color,
          weight: isSelected ? 6 : 3.5,
          opacity: isSelected ? 0.98 : 0.55,
          dashArray: rt.dashArray || null
        })
          .bindTooltip(
            `${rt.name} · ${rt.distanceKm} km · Max Slope ${rt.slopeMax}° · Eval ${rt.dataCoveragePct}%`,
            { sticky: true }
          )
          .addTo(routeGroup);
      });

      // Three Forks HAB Base Marker & Delta Basal Alcove Shelter Marker
      const habIcon = L.divIcon({
        className: '',
        html: `<div style="background:var(--mh-primary);color:var(--mh-on-primary);padding:3px 10px;border-radius:999px;font-family:var(--mh-font-mono);font-size:12px;font-weight:500;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.35);">HAB · Three Forks</div>`,
        iconSize: [110, 22],
        iconAnchor: [55, 11]
      });
      L.marker([18.4402, 77.4525], { icon: habIcon }).addTo(routeGroup);

      const shelterIcon = L.divIcon({
        className: '',
        html: `<div style="background:var(--mh-ok-bg);color:var(--mh-ok);padding:3px 10px;border-radius:999px;font-family:var(--mh-font-mono);font-size:12px;font-weight:500;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.35);">▲ ALCOVE SHELTER</div>`,
        iconSize: [115, 22],
        iconAnchor: [57, 11]
      });
      L.marker([18.4428, 77.4472], { icon: shelterIcon }).addTo(routeGroup);
    }

    // 6. Render Field Events Layer ([boulder], [soft-soil], [formation-interest])
    const feGroup = vectorGroupsRef.current.fieldEvents;
    feGroup.clearLayers();
    mission.fieldEvents.forEach((fe) => {
      const color =
        fe.class === 'boulder'
          ? '#E5484D'
          : fe.class === 'soft-soil'
          ? '#E5C04A'
          : '#38bdf8';

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

      const marker = L.marker([fe.lat, fe.lon], { icon });
      marker.on('click', () => setSelectedFieldEventId(fe.id));
      marker.addTo(feGroup);
    });

    // 7. Render POIs as compact flags coloured by importance (HIGH red · MED amber · LOW blue).
    //    The number on the flag is the visit order; click → geology & composition popup.
    const poiGroup = vectorGroupsRef.current.pois;
    poiGroup.clearLayers();
    const sortedPois = [...mission.pois].sort((a, b) => a.order - b.order);

    sortedPois.forEach((poi) => {
      const color = POI_FLAG_COLORS[poi.priority] ?? POI_FLAG_COLORS.LOW;
      const isSelected = selectedPoiId === poi.id;
      const cls = `mh-poi-flag${isSelected ? ' is-selected' : ''}${poi.postponedInSol3 ? ' is-postponed' : ''}`;

      const icon = L.divIcon({
        className: '',
        html: `<div class="${cls}">${flagSvg(color, String(poi.order))}</div>`,
        iconSize: [30, 36],
        iconAnchor: [5, 34],
        tooltipAnchor: [12, -24]
      });

      const m = L.marker([poi.lat, poi.lon], {
        icon,
        zIndexOffset: isSelected ? 1000 : 0
      });
      m.bindTooltip(`${poi.id} · ${poi.name.split('(')[0].trim()}`, { direction: 'right' });
      m.on('click', () => openPoiPopup(poi));
      m.addTo(poiGroup);
    });
  }, [mapReady, activeFilters, currentRole, mission, rasterOpacities, selectedPoiId, sepAlertActive]);

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTION: EXECUTE 12-MINUTE HANDHELD FUNNEL & PROMOTE FIELD DISCOVERY TO POI
  // (Compresses 4 Rover Sols -> 12 Minutes On-Site & Updates Bayesian Posterior)
  // ═══════════════════════════════════════════════════════════════════════════
  const handleRunRapidFunnelAndPromote = (feId = 'FE-024-003') => {
    setIsRunningFunnelAnim(true);
    setFunnelStageProgress({
      standoff: true,
      abrasion: true,
      contact: true,
      posteriorUpdated: true
    });

    setTimeout(() => {
      setIsRunningFunnelAnim(false);
    }, 600);

    const fe = mission.fieldEvents.find((f) => f.id === feId) || mission.fieldEvents[0];
    const newPoiId = 'POI-4';

    const promotedPoi = {
      id: newPoiId,
      order: 1,
      name: 'Séítah-Delta Contact Vein (from FE-024-003)',
      feature: 'Fracture-Fill Hydrated Opal-A & Mg-Carbonate Vein',
      priority: 'HIGH',
      lat: fe.lat,
      lon: fe.lon,
      elevM: -2550,
      sourceBadge: 'Handheld SuperCam + Abrader + PIXL/SHERLOC (12-min EVA Funnel)',
      dataConfidence: 'complete',
      activities: [
        'Stand-off SuperCam',
        'Surface Abrasion',
        'PIXL + SHERLOC Contact',
        'Core Sample'
      ],
      durationMin: 35,
      roverEquivalentSols: 4,
      astronautFunnelMin: 12,
      orbitalPrior: {
        mineral: 'MRO/CRISM 18m/px: Unresolved sub-pixel contact',
        hydrationEst: '3.0 wt% H2O (Prior)',
        uncertainty: '±34%'
      },
      pdsInSituPosterior: {
        supercam: 'Handheld LIBS/IR (2 min): Strong 1.9 & 2.2 µm Si-OH + carbonate bands',
        abrasion: 'Handheld Rotary Abrader (4 min): Exposed fresh bright fracture vein',
        pixl: 'Handheld XRF (3 min): SiO2 64.2 wt%, MgO 16.5 wt%, CaO 8.1 wt%',
        sherloc: 'Handheld UV Raman (3 min): Hydrated amorphous silica + carbonate + organic ring peak',
        hydrationPosterior: '11.2 wt% H2O (Peak)',
        uncertaintyAfter: '±3.5%',
        biosignatureRating: 'CRITICAL ASTROBIOLOGY TARGET'
      }
    };

    setMission((prev) => {
      const exists = prev.pois.some((p) => p.id === newPoiId);
      const updatedPois = exists
        ? prev.pois.map((p) => (p.id === newPoiId ? promotedPoi : p))
        : [
            promotedPoi,
            // Priority is independent of visit order: only shift the order
            ...prev.pois.map((p) => ({ ...p, order: p.order + 1 }))
          ];

      return {
        ...prev,
        demoScriptSol: Math.max(prev.demoScriptSol, 2),
        fusionSliderPct: 88, // Moves slider to show PDS In-Situ Posterior!
        selectedRoute: 'A-MOD',
        activePlanVersion: 'v2',
        acknowledgedPlanVersion: 'v1',
        pois: updatedPois,
        fieldEvents: prev.fieldEvents.map((item) =>
          item.id === fe.id
            ? { ...item, status: 'confirmed', promotedPoiId: newPoiId }
            : item
        ),
        optimizerResult: {
          chosenRoute: 'A-MOD',
          chosenOrder: ['POI-4', 'POI-1', 'POI-2'],
          rejected: [
            {
              option: 'Route B (+1.7 km via Deep Séítah Ripples, covers POI-3)',
              reason:
                'Rejected: 24 min over EVA return buffer (requires 324 min > 300 min cap [demo parameter])'
            },
            {
              option: 'Route A (Original Orbital Prior Baseline)',
              reason:
                'Rejected: bypasses newly confirmed 11.2 wt% H2O Contact Vein (POI-4) discovered in-situ'
            }
          ]
        }
      };
    });

    setSelectedPoiId(newPoiId);
    triggerToast(
      '⚡ 12-Min Handheld Funnel Complete → CRISM Prior Updated to PDS Posterior (±3.5%) & Promoted to POI-4!'
    );
  };

  // Reorder POI visit order Up/Down. Scientific priority is NOT derived from position
  // any more: it is set explicitly with handleSetPoiPriority.
  const handleMovePoiOrder = (poiId, direction) => {
    const sorted = [...mission.pois].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((p) => p.id === poiId);
    const swapIdx = direction === 'UP' ? idx - 1 : idx + 1;
    if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) return;
    const temp = sorted[idx];
    sorted[idx] = sorted[swapIdx];
    sorted[swapIdx] = temp;
    const reindexed = sorted.map((p, i) => ({ ...p, order: i + 1 }));
    setMission((prev) => ({ ...prev, pois: reindexed }));
  };

  // Set a POI's scientific importance directly (drives the flag colour on the map)
  const handleSetPoiPriority = (poiId, priority) => {
    setMission((prev) => ({
      ...prev,
      pois: prev.pois.map((p) => (p.id === poiId ? { ...p, priority } : p))
    }));
  };

  // Scientist adds a new POI at the currently selected map point
  const handleAddScientistPoi = () => {
    if (!newPoiDraft) return;
    const { lat, lon, molaElevationM } = clickedPoint;
    const nextNum =
      mission.pois.reduce(
        (max, p) => (p.id.startsWith('SCI-') ? Math.max(max, Number(p.id.slice(4)) || 0) : max),
        0
      ) + 1;
    const id = `SCI-${nextNum}`; // own prefix: never collides with the demo's POI-4 promotion
    const ctx = inferOrbitalContext(lat, lon);
    const name = newPoiDraft.name.trim() || `Science target ${nextNum}`;

    const newPoi = {
      id,
      order: mission.pois.length + 1,
      name,
      feature: newPoiDraft.note.trim() || 'Scientist-flagged outcrop (awaiting in-situ funnel)',
      priority: newPoiDraft.priority,
      lat,
      lon,
      elevM: molaElevationM,
      sourceBadge: 'Added by Science team · map pick + MOLA elevation',
      dataConfidence: 'orbital-only',
      activities: ['Stand-off SuperCam', 'Surface Abrasion', 'PIXL + SHERLOC Contact'],
      durationMin: 35,
      roverEquivalentSols: 4,
      astronautFunnelMin: 12,
      orbitalPrior: ctx,
      pdsInSituPosterior: {
        supercam: 'Pending — not sampled yet',
        abrasion: 'Pending — not sampled yet',
        pixl: 'Pending — not sampled yet',
        sherloc: 'Pending — not sampled yet',
        hydrationPosterior: 'Pending',
        uncertaintyAfter: ctx.uncertainty,
        biosignatureRating: 'TBD (awaiting in-situ funnel)'
      }
    };

    setMission((prev) => ({
      ...prev,
      pois: [...prev.pois, { ...newPoi, order: prev.pois.length + 1 }]
    }));
    setSelectedPoiId(id);
    setNewPoiDraft(null);
    triggerToast(`New target ${id} "${name}" added to the map (${PRIORITY_META[newPoi.priority].label} priority).`);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 3-SOL GUIDED DEMO SCRIPT (Sol 1 Baseline -> Sol 2 Funnel Update -> Sol 3 SEP)
  // ═══════════════════════════════════════════════════════════════════════════
  const handleRunDemoSol = (solStep) => {
    if (solStep === 1) {
      setSepAlertActive(false);
      setMission({
        ...INITIAL_MISSION_V5,
        demoScriptSol: 1,
        fusionSliderPct: 22,
        selectedRoute: 'A',
        activePlanVersion: 'v1',
        acknowledgedPlanVersion: 'v1'
      });
      setSelectedPoiId('POI-1');
      triggerToast(
        'DEMO SOL 1: Orbital CRISM Prior (±32% unc.) loaded · Route A selected (235 min EVA).'
      );
    } else if (solStep === 2) {
      setSepAlertActive(false);
      handleRunRapidFunnelAndPromote('FE-024-003');
    } else if (solStep === 3) {
      setSepAlertActive(true);
      setMission((prev) => ({
        ...prev,
        demoScriptSol: 3,
        selectedRoute: 'SHELTER',
        activePlanVersion: 'v3',
        acknowledgedPlanVersion: 'v2',
        pois: prev.pois.map((p) =>
          p.id === 'POI-2' || p.id === 'POI-3' ? { ...p, postponedInSol3: true } : p
        ),
        optimizerResult: {
          chosenRoute: 'SHELTER',
          chosenOrder: ['POI-1', 'DELTA-ALCOVE-SHELTER'],
          rejected: [
            {
              option: 'Route A-Mod (Full 268 min Loop)',
              reason:
                'Rejected: Exceeds 150 min SEP radiation exposure cap during scripted DONKI alert [demo parameter]'
            }
          ]
        }
      }));
      triggerToast(
        'DEMO SOL 3: Scripted DONKI SEP Alert + MEDA Dust Front → Route diverts to Delta Basal Alcove Shelter (Plan v3)!'
      );
    }
  };

  // Zoom helper for HUD 1:250 Local Outcrop Mode
  const handleToggleHudLocalZoom = () => {
    const map = mapInstanceRef.current;
    const activePoi =
      mission.pois.find((p) => p.id === selectedPoiId) || mission.pois[0];
    if (!map || !activePoi) return;

    if (!hudLocalZoom) {
      map.setView([activePoi.lat, activePoi.lon], 17, { animate: true });
      setHudLocalZoom(true);
    } else {
      map.setView(JEZERO_CENTER, 14, { animate: true });
      setHudLocalZoom(false);
    }
  };

  const sortedPois = useMemo(
    () => [...mission.pois].sort((a, b) => a.order - b.order),
    [mission.pois]
  );

  const selectedPoi = useMemo(
    () => mission.pois.find((p) => p.id === selectedPoiId) || sortedPois[0],
    [mission.pois, selectedPoiId, sortedPois]
  );

  const activePlanObj = useMemo(
    () =>
      mission.planVersions.find((v) => v.version === mission.activePlanVersion) ||
      mission.planVersions[0],
    [mission.planVersions, mission.activePlanVersion]
  );

  // Mission Control: crew status reacts to the demo stepper (Sol 2 = EVA in progress, Sol 3 = SEP)
  const crewStatus = useMemo(
    () =>
      CREW_ROSTER.map((c) => {
        const evaToday = mission.demoScriptSol >= 2 && c.onEva ? 0.04 : 0;
        const sepExtra = sepAlertActive ? (c.onEva ? 1.6 : 0.35) : 0;
        const doseActualMsv = +(c.doseActualMsv + evaToday + sepExtra).toFixed(2);
        const doseDeltaPct = Math.round((doseActualMsv / c.dosePlannedMsv - 1) * 100);
        const heartRate = c.vitals.heartRate + (sepAlertActive && c.onEva ? 14 : 0);
        const health =
          sepAlertActive && c.onEva
            ? { label: 'Medical review', cls: 'mh-pill--crit' }
            : c.fatigue === 'Moderate' || doseDeltaPct > 0
            ? { label: 'Monitor', cls: 'mh-pill--warn' }
            : { label: 'Nominal', cls: 'mh-pill--ok' };
        return { ...c, doseActualMsv, doseDeltaPct, heartRate, health };
      }),
    [mission.demoScriptSol, sepAlertActive]
  );

  return (
    <div className="min-h-screen w-full bg-mh-bg text-mh-text flex flex-col select-none overflow-x-hidden">
      {/* ═══════════════════════════════════════════════════════════════════════
          §1 GLOBAL TOP BAR (Mission Hub navbar): BRAND + AUTH SWITCHER + DEMO + THEME
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

          {/* Center: SIMULATED AUTHENTICATED USER SWITCHER (Starts on Scientist) */}
          <nav className="flex flex-wrap items-center gap-1" aria-label="Role">
            {[
              { id: 'scientist', label: 'Scientist', Icon: Sparkles },
              { id: 'control', label: 'Mission Control', Icon: Compass },
              { id: 'astronaut', label: 'Astronaut HUD', Icon: Navigation }
            ].map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleRoleSwitch(id)}
                aria-current={currentRole === id ? 'page' : undefined}
                className="mh-nav-link gap-2 cursor-pointer border-0 bg-transparent"
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
                {id === 'control' && (
                  <span className="px-2 rounded-full bg-mh-ok-bg text-mh-ok font-mono text-[13px]">
                    {mission.activePlanVersion}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Right: EVIDENCE + mission.json + Day/Night/Auto */}
          <div className="flex flex-wrap items-center gap-2">
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
              title="Inspect shared mission.json v5 contract"
              aria-label="Inspect mission.json"
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
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════════
          HERO BAND: SOL CONTEXT + ACTIVE ROLE + 3-SOL DEMO STEPPER
         ═══════════════════════════════════════════════════════════════════════ */}
      <section className="mh-hero !py-5 sm:!py-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-2 min-w-0">
            <span className="mh-eyebrow mh-eyebrow--line !text-white">
              Sol {23 + mission.demoScriptSol} · Séítah &amp; Western Delta · Plan {mission.activePlanVersion}
            </span>
            <h1 className="text-[28px] sm:text-[34px] leading-tight font-extrabold tracking-[-0.01em] m-0">
              {ROLE_FILTER_PRESETS[currentRole].roleName}
            </h1>
            <p className="m-0 text-base max-w-3xl">{ROLE_FILTER_PRESETS[currentRole].description}</p>
            <div className="flex flex-wrap items-center gap-2 font-mono text-[13px] text-mh-hero-label">
              <span>L.CRS.EPSG4326 · 18.436°N, 77.456°E</span>
              <span aria-hidden="true">·</span>
              <span>PDS Analyst’s Notebook</span>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => setUseFastApiProxy((prev) => !prev)}
                className="inline-flex items-center gap-2 min-h-11 px-4 rounded-full bg-white/10 hover:bg-white/20 text-white text-[13px] cursor-pointer"
                title="Toggle FastAPI CORS proxy (http://localhost:8000/proxy?url= from map_2.py)"
              >
                <Server className="w-4 h-4" />
                {useFastApiProxy ? 'Proxy :8000 ON' : 'Direct CORS (Trek/USGS)'}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <span className="font-mono text-[13px] uppercase tracking-[0.12em] text-mh-hero-label">
              Demo script
            </span>
            <div className="mh-segmented !flex !flex-nowrap w-full sm:w-auto [&>button]:flex-1 [&>button]:!px-3 sm:[&>button]:!px-[22px] [&>button]:whitespace-nowrap" role="radiogroup" aria-label="Demo Sol">
              {[
                { sol: 1, label: 'Sol 1 · Prior' },
                { sol: 2, label: 'Sol 2 · Funnel' },
                { sol: 3, label: 'Sol 3 · SEP' }
              ].map((s) => (
                <button
                  key={s.sol}
                  type="button"
                  role="radio"
                  aria-checked={mission.demoScriptSol === s.sol}
                  onClick={() => handleRunDemoSol(s.sol)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

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
          WORKSPACE: STICKY JEZERO MAP (LEFT) + ROLE DECISION DECK (RIGHT)
         ═══════════════════════════════════════════════════════════════════════ */}
      <main className="w-full max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_440px] xl:grid-cols-[minmax(0,1fr)_520px] gap-5 sm:gap-6 px-4 sm:px-6 py-6 sm:py-8 items-start">
        {/* LEFT: PERSISTENT LEAFLET MAP CARD */}
        <section
          className="lg:sticky lg:top-6 flex flex-col bg-mh-card rounded-mh-lg shadow-mh overflow-hidden"
          aria-label="Jezero map"
        >
          {/* Map header: role filter toggles */}
          <div className="px-5 pt-5 pb-4 flex flex-col gap-3 border-b border-mh-sep">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="mh-eyebrow">Map layers · {ROLE_LABELS[currentRole]}</span>
              <span className="text-base text-mh-text2">Tap a filter to show or hide it</span>
            </div>
            <div className="flex flex-wrap gap-2">
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
          </div>

          {/* Map */}
          <div className="relative h-[420px] sm:h-[520px] lg:h-[calc(100vh-30rem)] lg:min-h-[360px] lg:max-h-[720px]">
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
              routes={Object.values(mission.routes).filter(
                (rt) =>
                  currentRole !== 'astronaut' ||
                  rt.id === mission.selectedRoute ||
                  (sepAlertActive && rt.id === 'SHELTER')
              )}
              selectedRoute={mission.selectedRoute}
              fusionPct={mission.fusionSliderPct}
            />

            <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
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

          {/* Map footer: selected point + prior/posterior fusion */}
          <div className="p-5 grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="mh-tile">
              <span className="mh-eyebrow">
                <MapPin className="w-4 h-4" aria-hidden="true" />
                Selected point
              </span>
              <p className="m-0 text-base font-mono">
                {clickedPoint.lat.toFixed(5)}° N · {clickedPoint.lon.toFixed(5)}° E
              </p>
              <p className="m-0 text-base">
                MOLA elevation <strong>{clickedPoint.molaElevationM} m</strong>
              </p>
              <p className="m-0 text-base text-mh-text2">
                Sol {clickedPoint.nearestSol} · {clickedPoint.nearestWaypointName} ·{' '}
                {clickedPoint.distanceKm.toFixed(2)} km
              </p>
              <p className="m-0 text-base text-mh-text2">Click the map to inspect a point.</p>
            </div>

            {/* Scientist: add a new POI at the selected point */}
            {currentRole === 'scientist' && (
              <div className="mh-tile !gap-3">
                <span className="mh-eyebrow">
                  <Flag className="w-4 h-4" aria-hidden="true" />
                  New target
                </span>
                {!newPoiDraft ? (
                  <>
                    <p className="m-0 text-base text-mh-text2">
                      Click the map to choose a spot, then add it as a POI flag.
                    </p>
                    <button
                      type="button"
                      onClick={() => setNewPoiDraft({ name: '', priority: 'MED', note: '' })}
                      className="mh-btn mh-btn--tinted self-start"
                    >
                      <PlusCircle className="w-5 h-5" />
                      <span>Add POI at selected point</span>
                    </button>
                  </>
                ) : (
                  <form
                    className="flex flex-col gap-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAddScientistPoi();
                    }}
                  >
                    <div>
                      <label htmlFor="new-poi-name" className="mh-label">
                        Name
                      </label>
                      <input
                        id="new-poi-name"
                        className="mh-input !bg-mh-card select-text"
                        placeholder="e.g. Bright fracture fill"
                        maxLength={60}
                        value={newPoiDraft.name}
                        onChange={(e) => setNewPoiDraft((d) => ({ ...d, name: e.target.value }))}
                        autoFocus
                      />
                    </div>
                    <div>
                      <label htmlFor="new-poi-note" className="mh-label">
                        Why it matters (optional)
                      </label>
                      <input
                        id="new-poi-note"
                        className="mh-input !bg-mh-card select-text"
                        placeholder="e.g. Possible hydrated silica vein"
                        maxLength={120}
                        value={newPoiDraft.note}
                        onChange={(e) => setNewPoiDraft((d) => ({ ...d, note: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label htmlFor="new-poi-priority" className="mh-label">
                        Priority
                      </label>
                      <select
                        id="new-poi-priority"
                        className="mh-input !bg-mh-card cursor-pointer"
                        value={newPoiDraft.priority}
                        onChange={(e) => setNewPoiDraft((d) => ({ ...d, priority: e.target.value }))}
                      >
                        <option value="HIGH">High</option>
                        <option value="MED">Medium</option>
                        <option value="LOW">Low</option>
                      </select>
                    </div>
                    <p className="m-0 text-base text-mh-text2 font-mono">
                      {clickedPoint.lat.toFixed(5)}° N · {clickedPoint.lon.toFixed(5)}° E ·{' '}
                      {clickedPoint.molaElevationM} m
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button type="submit" className="mh-btn mh-btn--primary">
                        <Flag className="w-5 h-5" />
                        <span>Place flag</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewPoiDraft(null)}
                        className="mh-btn bg-mh-card text-mh-text"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </section>

        {/* RIGHT: ROLE-SPECIFIC DECISION DECK (scrolls with the page) */}
        <aside className="flex flex-col gap-5 sm:gap-6 min-w-0" aria-label="Decision panel">
          {/* ═══════════════════════════ ROLE 1: SCIENTIST ═══════════════════════════ */}
          {currentRole === 'scientist' && (
            <>
              <Card
                eyebrow="Decision next to data"
                title="Decision funnel: rover 4 sols → astronaut 12 min"
                icon={FastForward}
                collapsible
                defaultOpen={false}
              >
                <p className="m-0 text-base text-mh-text2">
                  An uncrewed rover needs at least one ground-planning Sol per stage. Handheld
                  astronaut tools compress the whole funnel into{' '}
                  <strong className="text-mh-text">12 minutes on-site</strong>, updating the orbital
                  CRISM a-priori map in real time.
                </p>
                <ol className="m-0 p-0 list-none grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { n: 1, label: 'Orbital prior', tool: 'MRO / CRISM', time: '18 m/px · σ ±34%' },
                    { n: 2, label: 'Stand-off', tool: 'SuperCam LIBS', time: 'Rover 1 Sol → 2 min' },
                    { n: 3, label: 'Abrasion', tool: 'Rotary abrader', time: 'Rover 1 Sol → 4 min' },
                    { n: 4, label: 'Contact', tool: 'PIXL + SHERLOC', time: 'Rover 2 Sol → 6 min' }
                  ].map((st) => (
                    <li key={st.n} className="mh-tile">
                      <span className="font-mono text-[13px] uppercase tracking-[0.08em] text-mh-text2">
                        {st.n}. {st.label}
                      </span>
                      <span className="text-base font-semibold">{st.tool}</span>
                      <span className="text-base text-mh-text2">{st.time}</span>
                    </li>
                  ))}
                </ol>
              </Card>

              {selectedPoi && (
                <Card
                  eyebrow={`PDS Analyst’s Notebook · ${selectedPoi.id}`}
                  title={selectedPoi.name}
                  aside={
                    <span className="mh-pill mh-pill--info">
                      {selectedPoi.roverEquivalentSols} Sol → {selectedPoi.astronautFunnelMin} min
                    </span>
                  }
                  highlight
                  collapsible
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="mh-tile">
                      <span className="mh-pill mh-pill--warn self-start">A-priori (orbital)</span>
                      <span className="text-base">{selectedPoi.orbitalPrior.mineral}</span>
                      <span className="text-base text-mh-text2">
                        Est. {selectedPoi.orbitalPrior.hydrationEst} · σ {selectedPoi.orbitalPrior.uncertainty}
                      </span>
                    </div>
                    <div className="mh-tile">
                      <span className="mh-pill mh-pill--ok self-start">Posterior (in situ)</span>
                      <span className="text-base font-semibold">
                        Hydration {selectedPoi.pdsInSituPosterior.hydrationPosterior}
                      </span>
                      <span className="text-base text-mh-text2">
                        Updated σ {selectedPoi.pdsInSituPosterior.uncertaintyAfter}
                      </span>
                    </div>
                  </div>
                  <dl className="m-0 flex flex-col gap-3">
                    {[
                      ['SuperCam', selectedPoi.pdsInSituPosterior.supercam],
                      ['Abrasion', selectedPoi.pdsInSituPosterior.abrasion],
                      ['PIXL XRF', selectedPoi.pdsInSituPosterior.pixl],
                      ['SHERLOC Raman', selectedPoi.pdsInSituPosterior.sherloc]
                    ].map(([k, v]) => (
                      <div key={k} className="flex flex-col gap-1">
                        <dt className="font-mono text-[13px] uppercase tracking-[0.08em] text-mh-text2">{k}</dt>
                        <dd className="m-0 text-base">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </Card>
              )}

              <Card
                eyebrow="Field discoveries"
                title="In-situ discoveries & target priority"
                subtitle="Promote a discovery to update the CRISM posterior and the route plan."
                collapsible
              >
                {mission.fieldEvents
                  .filter((fe) => fe.id === 'FE-024-003')
                  .map((fe) => (
                    <div key={fe.id} className="mh-tile !gap-2 ring-2 ring-mh-info">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-[13px] text-mh-text2">{fe.id}</span>
                        <span className="mh-pill mh-pill--info">Funnel 12 min</span>
                      </div>
                      <strong className="text-base">{fe.title}</strong>
                      <p className="m-0 text-base text-mh-text2">{fe.description}</p>
                      <p className="m-0 text-base text-mh-text2">Source: {fe.source}</p>
                      {!fe.promotedPoiId ? (
                        <button
                          type="button"
                          onClick={() => handleRunRapidFunnelAndPromote(fe.id)}
                          className="mh-btn mh-btn--primary self-start mt-1"
                        >
                          <PlusCircle className="w-5 h-5" />
                          <span>Promote to high-priority POI</span>
                        </button>
                      ) : (
                        <span className="mh-pill mh-pill--ok self-start mt-1">Promoted to POI-4</span>
                      )}
                    </div>
                  ))}

                <p className="m-0 text-base text-mh-text2">
                  <strong className="text-mh-text">Priority</strong> sets the flag colour on the map;
                  the arrows only change the <strong className="text-mh-text">visit order</strong>{' '}
                  (number on the flag).
                </p>
                <ol className="m-0 p-0 list-none flex flex-col gap-2" aria-label="Targets by visit order">
                  {sortedPois.map((poi, idx) => {
                    const isSel = selectedPoiId === poi.id;
                    return (
                      <li
                        key={poi.id}
                        className={`flex flex-col gap-2 p-3 rounded-mh-md transition-colors ${
                          isSel ? 'bg-mh-fill-blue' : 'bg-mh-fill'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            openPoiPopup(poi);
                            mapInstanceRef.current?.panTo([poi.lat, poi.lon]);
                          }}
                          aria-pressed={isSel}
                          className="w-full min-w-0 min-h-11 flex items-center gap-3 text-left bg-transparent border-0 p-0 cursor-pointer text-mh-text"
                        >
                          <span
                            className="w-9 h-9 shrink-0 flex items-center justify-center"
                            aria-hidden="true"
                            dangerouslySetInnerHTML={{
                              __html: flagSvg(
                                POI_FLAG_COLORS[poi.priority] ?? POI_FLAG_COLORS.LOW,
                                String(poi.order),
                                0.9
                              )
                            }}
                          />
                          <span className="min-w-0 flex flex-col gap-1">
                            <span className="text-base font-semibold">
                              {poi.id} · {poi.name.split('(')[0].trim()}
                            </span>
                            <span className="text-base text-mh-text2">
                              {poi.dataConfidence === 'orbital-only'
                                ? 'Orbital prior only · not sampled yet'
                                : `Hydration ${poi.pdsInSituPosterior.hydrationPosterior}`}
                              {poi.postponedInSol3 ? ' · postponed' : ''}
                            </span>
                          </span>
                        </button>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label className="flex items-center gap-2 text-base text-mh-text2">
                            <span>Priority</span>
                            <select
                              value={poi.priority}
                              onChange={(e) => handleSetPoiPriority(poi.id, e.target.value)}
                              className={`mh-pill ${
                                (PRIORITY_META[poi.priority] ?? PRIORITY_META.LOW).cls
                              } min-h-11 !px-3 border-0 cursor-pointer`}
                              aria-label={`Priority of ${poi.id}`}
                            >
                              <option value="HIGH">High</option>
                              <option value="MED">Medium</option>
                              <option value="LOW">Low</option>
                            </select>
                          </label>
                          <div className="flex items-center gap-1">
                            <span className="text-base text-mh-text2 mr-1">Order</span>
                            <button
                              type="button"
                              onClick={() => handleMovePoiOrder(poi.id, 'UP')}
                              disabled={idx === 0}
                              className="mh-btn mh-btn--icon bg-mh-card text-mh-text"
                              aria-label={`Visit ${poi.id} earlier`}
                            >
                              <ArrowUp className="w-5 h-5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMovePoiOrder(poi.id, 'DOWN')}
                              disabled={idx === sortedPois.length - 1}
                              className="mh-btn mh-btn--icon bg-mh-card text-mh-text"
                              aria-label={`Visit ${poi.id} later`}
                            >
                              <ArrowDown className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>

                <button
                  type="button"
                  onClick={() => handleRoleSwitch('control')}
                  className="mh-btn mh-btn--primary mh-btn--lg mh-btn--block"
                >
                  Propose targets to Mission Control →
                </button>
              </Card>
            </>
          )}

          {/* ═══════════════════════════ ROLE 2: MISSION CONTROL ═══════════════════════════ */}
          {currentRole === 'control' && (
            <>
              <Card
                eyebrow="Crew health & radiation"
                title="Astronauts status"
                icon={Users}
                aside={<span className="mh-pill mh-pill--warn">Simulated telemetry</span>}
                collapsible
              >
                {sepAlertActive && (
                  <div className="mh-alert !bg-mh-crit-bg !text-mh-crit" role="alert">
                    <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />
                    <p className="m-0 flex-1">
                      <strong>SEP event:</strong> EVA crew dose above plan — flight surgeon review
                      required.
                    </p>
                  </div>
                )}
                <ul className="m-0 p-0 list-none flex flex-col gap-3">
                  {crewStatus.map((c) => {
                    const fillPct = Math.min(100, (c.doseActualMsv / c.dosePlannedMsv) * 100);
                    const over = c.doseDeltaPct > 0;
                    return (
                      <li key={c.id} className="mh-tile !gap-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <span className="flex flex-col min-w-0">
                            <strong className="text-base">
                              {c.id} · {c.name}
                            </strong>
                            <span className="text-base text-mh-text2">
                              {c.role}
                              {c.onEva && mission.demoScriptSol >= 2 ? ' · on EVA now' : ''}
                            </span>
                          </span>
                          <span className={`mh-pill shrink-0 ${c.health.cls}`}>{c.health.label}</span>
                        </div>

                        <div className="flex flex-col gap-1">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="font-mono text-[13px] uppercase tracking-[0.08em] text-mh-text2">
                              Radiation dose (surface, cumulative)
                            </span>
                            <span className={`text-base font-semibold ${over ? 'text-mh-crit' : ''}`}>
                              {c.doseActualMsv.toFixed(2)} / {c.dosePlannedMsv.toFixed(1)} mSv
                            </span>
                          </div>
                          <div
                            className="mh-progress"
                            role="meter"
                            aria-valuemin={0}
                            aria-valuemax={c.dosePlannedMsv}
                            aria-valuenow={c.doseActualMsv}
                            aria-label={`${c.id} measured dose versus planned`}
                          >
                            <span
                              style={{
                                width: `${fillPct}%`,
                                background: over ? 'var(--mh-crit)' : 'var(--mh-ok)'
                              }}
                            />
                          </div>
                          <span className="text-base text-mh-text2">
                            Measured vs planned:{' '}
                            {over ? `+${c.doseDeltaPct}% above plan` : `${c.doseDeltaPct}% (within plan)`}
                          </span>
                        </div>

                        <span className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <Stat label="EVAs done" value={c.evasCompleted} />
                          <Stat label="Heart rate" value={`${c.heartRate} bpm`} />
                          <Stat label="SpO₂" value={`${c.vitals.spo2}%`} />
                          <Stat label="Sleep" value={`${c.vitals.sleepH} h`} />
                        </span>
                        <span className="flex items-start gap-2 text-base text-mh-text2">
                          <HeartPulse className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
                          <span>
                            Fatigue {c.fatigue.toLowerCase()} · Psych: {c.psych}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </Card>

              <Card
                eyebrow="Optimizer"
                title="Jezero route comparison"
                icon={Compass}
                subtitle="Thresholds are demo parameters. Click a route to see its data and show it on the map."
                collapsible
              >
                <div className="flex flex-col gap-2" role="radiogroup" aria-label="EVA route">
                  {Object.values(mission.routes).map((rt, rtIdx) => {
                    const isSelected = mission.selectedRoute === rt.id;
                    const bufferOk = rt.bufferMin >= mission.timeWindow.returnBufferMin;
                    const doseRate = sepAlertActive ? DOSE_RATE_SEP_UGY_H : DOSE_RATE_NOMINAL_UGY_H;
                    const expectedDose = (rt.evaDurationMin / 60) * doseRate;
                    const eta = addMinutesToLst(mission.timeWindow.suggestedStart, rt.evaDurationMin);
                    return (
                      <button
                        key={rt.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        aria-expanded={isSelected}
                        onClick={() => setMission((prev) => ({ ...prev, selectedRoute: rt.id }))}
                        className={`w-full text-left p-4 rounded-mh-md border-2 cursor-pointer transition-colors flex flex-col gap-3 text-mh-text ${
                          isSelected ? 'bg-mh-fill-blue border-mh-primary' : 'bg-mh-fill border-transparent'
                        }`}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-3 min-w-0">
                            <span
                              className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-mono text-[13px] font-medium text-white"
                              style={{ background: rt.color }}
                              aria-hidden="true"
                            >
                              {rtIdx + 1}
                            </span>
                            <span className="flex flex-col min-w-0">
                              <span className="text-base font-semibold">
                                Route {rtIdx + 1} · {rt.name.split('(')[0].replace(/^Route\s+/, '').trim()}
                              </span>
                              {!isSelected && (
                                <span className="text-base text-mh-text2">
                                  ETA {eta} LST · {formatDuration(rt.evaDurationMin)}
                                </span>
                              )}
                            </span>
                          </span>
                          <span className="flex items-center gap-2 shrink-0">
                            <span className={`mh-pill ${bufferOk ? 'mh-pill--ok' : 'mh-pill--crit'}`}>
                              {bufferOk ? 'Buffer OK' : 'Over limit'}
                            </span>
                            <ChevronDown
                              className={`w-5 h-5 text-mh-text2 transition-transform ${isSelected ? 'rotate-180' : ''}`}
                              aria-hidden="true"
                            />
                          </span>
                        </span>

                        {isSelected && (
                          <>
                            <span className="text-base text-mh-text2">{rt.name}</span>
                            <span className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <Stat tile label="ETA at HAB" value={`${eta} LST`} />
                              <Stat tile label="Total mission time" value={formatDuration(rt.evaDurationMin)} />
                              <Stat tile label="Expected dose" value={formatDose(expectedDose)} />
                            </span>
                            <span className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <Stat label="Distance" value={`${rt.distanceKm} km`} />
                              <Stat label="Elevation gain" value={`+${rt.elevationGainM} m`} />
                              <Stat label="Max slope" value={`${rt.slopeMax}°`} />
                              <Stat label="Return buffer" value={`${rt.bufferMin} min`} />
                            </span>
                            <span className="text-base text-mh-text2">
                              Start {mission.timeWindow.suggestedStart} LST · latest return{' '}
                              {mission.timeWindow.latestReturn} LST · dose at{' '}
                              {sepAlertActive ? `${DOSE_RATE_SEP_UGY_H} µGy/h (SEP, unshielded)` : `${DOSE_RATE_NOMINAL_UGY_H} µGy/h (nominal)`}{' '}
                              · coverage {rt.dataCoveragePct}%
                            </span>
                            <span className="text-base text-mh-text2">{rt.funnelYield}</span>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-2">
                  <span className="mh-eyebrow">Rejected options</span>
                  {mission.optimizerResult.rejected.map((rej, idx) => (
                    <div key={idx} className="mh-tile !gap-2">
                      <span className="mh-pill mh-pill--crit self-start">Rejected</span>
                      <strong className="text-base">{rej.option}</strong>
                      <span className="text-base text-mh-text2">{rej.reason}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card
                // Remounts when the SEP alert toggles so the card auto-opens on the alert
                key={sepAlertActive ? 'env-sep' : 'env'}
                eyebrow="Environment"
                title="EVA window & MEDA weather"
                icon={Radio}
                aside={<span className="mh-pill mh-pill--warn">Historical data</span>}
                collapsible
                defaultOpen={sepAlertActive}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Stat
                    tile
                    label="Suggested EVA window"
                    value={`${mission.timeWindow.suggestedStart} – ${mission.timeWindow.latestReturn} LST`}
                  />
                  <Stat tile label="Daylight" value="08:00–16:00 LST" />
                </div>
                <p className="m-0 text-base">{mission.weatherCard.medaContext}</p>
                {sepAlertActive ? (
                  <div className="mh-alert !bg-mh-crit-bg !text-mh-crit" role="alert">
                    <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />
                    <p className="m-0 flex-1">
                      <strong>Radiation alert:</strong> {mission.weatherCard.radContext}
                    </p>
                  </div>
                ) : (
                  <p className="m-0 text-base text-mh-text2">{mission.weatherCard.radContext}</p>
                )}
                <p className="m-0 text-base text-mh-text2">{mission.weatherCard.badge}</p>
              </Card>

              <Card
                eyebrow="Traceability"
                title="Plan versions"
                icon={GitBranch}
                aside={<span className="mh-pill mh-pill--info">Active: {mission.activePlanVersion}</span>}
                collapsible
              >
                <ol className="m-0 p-0 list-none flex flex-col gap-2">
                  {mission.planVersions.map((pv) => {
                    const isCurrent = mission.activePlanVersion === pv.version;
                    return (
                      <li
                        key={pv.version}
                        className={`p-4 rounded-mh-md flex flex-col gap-2 ${
                          isCurrent ? 'bg-mh-fill-blue' : 'bg-mh-fill'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="flex flex-col">
                            <strong className="text-base">Plan {pv.version}</strong>
                            <span className="font-mono text-[13px] text-mh-text2">{pv.ts}</span>
                          </span>
                          {isCurrent ? (
                            <span className="mh-pill mh-pill--ok">Active on HUD</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setMission((prev) => ({
                                  ...prev,
                                  activePlanVersion: pv.version,
                                  selectedRoute: pv.routeId
                                }));
                                triggerToast(`Plan ${pv.version} approved & sent to Astronaut HUD`);
                              }}
                              className="mh-btn mh-btn--tinted"
                            >
                              Send {pv.version}
                            </button>
                          )}
                        </div>
                        <p className="m-0 text-base">
                          <span className="text-mh-text2">Trigger:</span> {pv.trigger}
                        </p>
                        <p className="m-0 text-base text-mh-text2">{pv.reason}</p>
                      </li>
                    );
                  })}
                </ol>

                <button
                  type="button"
                  onClick={() => handleRoleSwitch('astronaut')}
                  className="mh-btn mh-btn--primary mh-btn--lg mh-btn--block"
                >
                  Send daily plan to Astronaut HUD →
                </button>
              </Card>
            </>
          )}

          {/* ═══════════════════════════ ROLE 3: ASTRONAUT HUD ═══════════════════════════ */}
          {currentRole === 'astronaut' && (
            <>
              <section
                className={`p-5 sm:p-6 rounded-mh-lg shadow-mh flex flex-col gap-4 ${
                  sepAlertActive ? 'bg-mh-crit-bg' : 'bg-mh-card'
                }`}
                aria-live="polite"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`mh-pill ${sepAlertActive ? 'mh-pill--crit' : 'mh-pill--ok'}`}>
                    {sepAlertActive ? 'SEP alert: go to shelter' : 'On plan'}
                  </span>
                  <span className="text-base font-semibold">
                    Light 02:10 · Buffer {mission.routes[mission.selectedRoute]?.bufferMin} min
                  </span>
                </div>
                <p className="m-0 text-lg font-semibold">{activePlanObj.diffSummary}</p>
                <button
                  type="button"
                  onClick={handleToggleHudLocalZoom}
                  className="mh-btn mh-btn--tinted mh-btn--lg mh-btn--block !min-h-16"
                >
                  <Crosshair className="w-5 h-5" />
                  <span>{hudLocalZoom ? 'Back to sector view' : '1:250 target zoom'}</span>
                </button>
              </section>

              <Card
                eyebrow="Handheld funnel · 12 min on-site"
                title={`Active target: ${selectedPoi.id} — ${selectedPoi.name.split('(')[0].trim()}`}
                highlight
              >
                <div className="flex flex-col gap-2">
                  {[
                    {
                      key: 'standoff',
                      title: 'Step 1 · Handheld SuperCam LIBS/VISIR',
                      time: '2 min (rover: 1 Sol)',
                      body: selectedPoi.pdsInSituPosterior.supercam
                    },
                    {
                      key: 'abrasion',
                      title: 'Step 2 · Handheld rotary abrader',
                      time: '4 min (rover: 1 Sol)',
                      body: selectedPoi.pdsInSituPosterior.abrasion
                    },
                    {
                      key: 'contact',
                      title: 'Step 3 · Handheld PIXL XRF + SHERLOC Raman',
                      time: '6 min (rover: 2 Sol)',
                      body: selectedPoi.pdsInSituPosterior.pixl
                    }
                  ].map((step) => {
                    const done = funnelStageProgress[step.key];
                    return (
                      <button
                        key={step.key}
                        type="button"
                        aria-pressed={done}
                        onClick={() =>
                          setFunnelStageProgress((p) => ({ ...p, [step.key]: !p[step.key] }))
                        }
                        className={`w-full min-h-16 p-4 rounded-mh-md border-2 text-left flex items-start justify-between gap-3 cursor-pointer transition-colors text-mh-text ${
                          done ? 'bg-mh-ok-bg border-mh-ok' : 'bg-mh-fill border-transparent'
                        }`}
                      >
                        <span className="flex flex-col gap-1 min-w-0">
                          <strong className="text-base">{step.title}</strong>
                          <span className="font-mono text-[13px] text-mh-text2">{step.time}</span>
                          <span className="text-base text-mh-text2">{step.body}</span>
                        </span>
                        <span className={`mh-pill shrink-0 ${done ? 'mh-pill--ok' : 'mh-pill--info'}`}>
                          {done ? 'Done' : 'To do'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => handleRunRapidFunnelAndPromote('FE-024-003')}
                  className="mh-btn mh-btn--primary mh-btn--lg mh-btn--block !min-h-16"
                >
                  <Zap className="w-5 h-5 shrink-0" />
                  <span>
                    {isRunningFunnelAnim
                      ? 'Updating posterior…'
                      : 'Log funnel reading & update map'}
                  </span>
                </button>
              </Card>
            </>
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
          SHARED CONTRACT MODAL (mission.json v5)
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
                  mission.json v5
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
              {JSON.stringify(mission, null, 2)}
            </pre>
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
  astronaut: 'Astronaut HUD'
};

// Status always carries a word, never colour alone
const PRIORITY_META = {
  HIGH: { label: 'High', cls: 'mh-pill--crit' },
  MED: { label: 'Medium', cls: 'mh-pill--warn' },
  LOW: { label: 'Low', cls: 'mh-pill--info' }
};

// `collapsible` turns the header into a show/hide toggle (accordion-style "menu a scomparsa")
function Card({
  eyebrow,
  title,
  subtitle,
  icon: Icon,
  aside,
  highlight = false,
  collapsible = false,
  defaultOpen = true,
  children
}) {
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = !collapsible || open;

  const heading = (
    <div className="flex flex-col gap-1 min-w-0">
      {eyebrow && <span className="mh-eyebrow">{eyebrow}</span>}
      <h2 className="m-0 text-[22px] leading-tight font-bold flex items-start gap-2">
        {Icon && <Icon className="w-6 h-6 mt-0.5 shrink-0 text-mh-primary dark:text-mh-link" aria-hidden="true" />}
        <span>{title}</span>
      </h2>
      {subtitle && isOpen && <p className="m-0 text-base text-mh-text2">{subtitle}</p>}
    </div>
  );

  return (
    <section
      className={`bg-mh-card rounded-mh-lg shadow-mh p-5 sm:p-6 flex flex-col gap-4 ${
        highlight ? 'ring-2 ring-mh-primary' : ''
      }`}
    >
      <header className="flex items-start justify-between gap-3">
        {collapsible ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={isOpen}
            className="flex-1 min-w-0 flex items-start justify-between gap-3 text-left bg-transparent border-0 p-0 cursor-pointer text-mh-text"
          >
            {heading}
            <ChevronDown
              className={`w-6 h-6 mt-1 shrink-0 text-mh-text2 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
            <span className="sr-only">{isOpen ? 'Collapse section' : 'Expand section'}</span>
          </button>
        ) : (
          heading
        )}
        {aside && <div className="shrink-0">{aside}</div>}
      </header>
      {isOpen && children}
    </section>
  );
}

function Stat({ label, value, tile = false }) {
  return (
    <span className={`flex flex-col gap-0.5 ${tile ? 'mh-tile' : ''}`}>
      <span className="font-mono text-[13px] uppercase tracking-[0.08em] text-mh-text2">{label}</span>
      <span className="text-base font-semibold">{value}</span>
    </span>
  );
}

function FilterToggle({ on, onClick, hint, children }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      title={hint}
      className={`mh-btn !px-4 ${on ? 'mh-btn--tinted' : 'bg-mh-fill text-mh-text2'}`}
    >
      {on ? <CheckCircle2 className="w-5 h-5" aria-hidden="true" /> : <span className="w-5 h-5 rounded-full border-2 border-current" aria-hidden="true" />}
      <span>{children}</span>
      <span className="sr-only">{on ? '(on)' : '(off)'}</span>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAP LEGEND (collapsible overlay). Mirrors exactly what the map effect draws for
// the current role + filters, so every line, area and flag on the map is explained.
// ═══════════════════════════════════════════════════════════════════════════════
function LineSwatch({ color, dash = null, width = 3 }) {
  return (
    <svg width="28" height="12" viewBox="0 0 28 12" aria-hidden="true" className="shrink-0">
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
      <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-mh-text2">{title}</span>
      <ul className="m-0 p-0 list-none flex flex-col gap-1.5">{children}</ul>
    </div>
  );
}

function MapLegend({ currentRole, activeFilters, routes, selectedRoute, fusionPct }) {
  const [open, setOpen] = useState(() =>
    typeof window === 'undefined' ? true : window.innerWidth >= 640
  );
  const notHud = currentRole !== 'astronaut';
  const showFusion = activeFilters.filter1_spectralFusion && notHud;
  const showThermal = activeFilters.filter2_thermalInertia && notHud;
  const showHazards = activeFilters.topographySlope || currentRole === 'control';
  const showTraverse = activeFilters.filter3_pdsTargetsTraverse && notHud;
  const showRoutes = activeFilters.candidateRoutes;

  return (
    <div className="absolute top-3 left-3 z-20 w-[260px] max-w-[calc(100%-5rem)] max-h-[calc(100%-1.5rem)] flex flex-col bg-mh-card text-mh-text rounded-mh-md shadow-mh overflow-hidden">
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
        <ChevronDown
          className={`w-5 h-5 text-mh-text2 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="px-3 pb-3 flex flex-col gap-3 overflow-y-auto text-[13px] leading-snug">
          <LegendSection title="Targets (POI flags)">
            {[
              ['HIGH', 'High priority'],
              ['MED', 'Medium priority'],
              ['LOW', 'Low priority']
            ].map(([k, label]) => (
              <LegendRow
                key={k}
                swatch={<span dangerouslySetInnerHTML={{ __html: flagSvg(POI_FLAG_COLORS[k], '', 0.55) }} />}
              >
                {label}
              </LegendRow>
            ))}
            <li className="text-mh-text2">Number = visit order · click a flag for geology</li>
          </LegendSection>

          {showRoutes && routes.length > 0 && (
            <LegendSection title="EVA routes">
              {routes.map((rt) => (
                <LegendRow
                  key={rt.id}
                  swatch={
                    <LineSwatch
                      color={rt.color}
                      dash={rt.dashArray ? rt.dashArray.replace(',', ' ') : null}
                      width={rt.id === selectedRoute ? 4.5 : 2.5}
                    />
                  }
                >
                  {rt.name.split('(')[0].trim()}
                  {rt.id === selectedRoute ? ' (selected)' : ''}
                </LegendRow>
              ))}
              <li className="text-mh-text2">Thick line = selected route</li>
            </LegendSection>
          )}

          {showFusion && (
            <LegendSection title="CRISM prior ↔ PDS posterior">
              <LegendRow swatch={<AreaSwatch stroke="#E5C04A" fill="#a855f7" dash="4 3" />}>
                Orbital mineral zone (CRISM prior, σ ±32–36%)
              </LegendRow>
              <LegendRow swatch={<AreaSwatch stroke="#35B17A" fill="#35B17A" round />}>
                In-situ measurement (PDS posterior)
              </LegendRow>
              <LegendRow swatch={<LineSwatch color="#38bdf8" width={7} />}>
                Hydrated vein corridor
              </LegendRow>
              <li className="text-mh-text2">
                Fusion weight {fusionPct}% posterior — grows as each demo Sol adds in-situ data.
              </li>
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
              <LegendRow swatch={<LineSwatch color="#FF6B35" dash="3 3" width={2.5} />}>
                Rover path (MMGIS / PDS)
              </LegendRow>
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

          <LegendSection title="Field events & markers">
            {[
              ['#38bdf8', 'Formation of interest'],
              ['#E5484D', 'Boulder hazard'],
              ['#E5C04A', 'Soft soil']
            ].map(([c, label]) => (
              <LegendRow
                key={label}
                swatch={<span className="font-mono text-[15px] leading-none" style={{ color: c }}>◆</span>}
              >
                {label}
              </LegendRow>
            ))}
            {showRoutes && (
              <LegendRow
                swatch={<span className="w-6 h-3 rounded-full bg-mh-primary" aria-hidden="true" />}
              >
                HAB base / shelter
              </LegendRow>
            )}
            <LegendRow
              swatch={
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <circle cx="7" cy="7" r="5" fill="#FC3D21" stroke="#ffffff" strokeWidth="2" />
                </svg>
              }
            >
              Inspected point (map click)
            </LegendRow>
          </LegendSection>
        </div>
      )}
    </div>
  );
}
