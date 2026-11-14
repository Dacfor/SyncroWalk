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
  UserCheck,
  Server,
  Activity,
  MapPin,
  Filter,
  FastForward
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
    coveragePct: 95
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
      if (!window.L) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.async = true;
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
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
          zIndex: 10 + idx
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
            fillColor: '#FF6B35',
            fillOpacity: 0.85
          })
            .bindTooltip(
              `MOLA: ${molaZ} m · Sol ${nearest?.sol ?? '?'} (${nearest?.km.toFixed(2)} km)`,
              { permanent: true, direction: 'top', className: 'marswalk-tooltip' }
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

        L.polyline(rt.coords, {
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
        html: `<div style="background:#12181f;color:#fff;border:2px solid #2D7FF9;padding:2px 6px;border-radius:4px;font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.7);">HAB · Three Forks</div>`,
        iconSize: [110, 22],
        iconAnchor: [55, 11]
      });
      L.marker([18.4402, 77.4525], { icon: habIcon }).addTo(routeGroup);

      const shelterIcon = L.divIcon({
        className: '',
        html: `<div style="background:#0b0f14;color:#35B17A;border:1.5px solid #35B17A;padding:2px 6px;border-radius:4px;font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:700;white-space:nowrap;">▲ ALCOVE SHELTER</div>`,
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
        <div style="display:flex;align-items:center;gap:4px;background:#0b0f14;color:${color};border:2px solid ${color};padding:2px 6px;border-radius:999px;font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:700;white-space:nowrap;box-shadow:0 2px 10px rgba(0,0,0,0.85);">
          <span>◆ ${fe.id}</span>
          <span style="color:#fff;">[${fe.class}]</span>
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

    // 7. Render Prioritized PDS POI Markers (1 = Red HIGH, 2 = Amber MED, 3 = Gray LOW)
    const poiGroup = vectorGroupsRef.current.pois;
    poiGroup.clearLayers();
    const sortedPois = [...mission.pois].sort((a, b) => a.order - b.order);

    sortedPois.forEach((poi) => {
      const bg =
        poi.priority === 'HIGH' || poi.order === 1
          ? '#E5484D'
          : poi.priority === 'MED' || poi.order === 2
          ? '#E5C04A'
          : '#64748b';
      const fg = bg === '#E5C04A' ? '#0b0f14' : '#ffffff';
      const isSelected = selectedPoiId === poi.id;

      const poiHtml = `
        <div style="display:flex;align-items:center;gap:6px;background:#12181f;border:2px solid ${
          isSelected ? '#2D7FF9' : bg
        };padding:3px 8px 3px 4px;border-radius:6px;box-shadow:0 3px 12px rgba(0,0,0,0.85);white-space:nowrap;">
          <span style="width:22px;height:22px;border-radius:4px;background:${bg};color:${fg};font-family:'IBM Plex Mono',monospace;font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:center;">
            ${poi.order}
          </span>
          <div>
            <div style="color:#fff;font-family:'Inter',sans-serif;font-weight:700;font-size:11px;line-height:1.1;">
              ${poi.id}: ${poi.name.split('(')[0].trim()}
            </div>
            <div style="color:#35B17A;font-family:'IBM Plex Mono',monospace;font-size:9.5px;">
              PDS: ${poi.pdsInSituPosterior.hydrationPosterior} (${poi.pdsInSituPosterior.uncertaintyAfter})
            </div>
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: '',
        html: poiHtml,
        iconSize: [210, 38],
        iconAnchor: [20, 19]
      });

      const m = L.marker([poi.lat, poi.lon], { icon });
      m.on('click', () => setSelectedPoiId(poi.id));
      m.addTo(poiGroup);
    });
  }, [activeFilters, currentRole, mission, rasterOpacities, selectedPoiId, sepAlertActive]);

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
            ...prev.pois.map((p) => ({
              ...p,
              order: p.order + 1,
              priority: p.order + 1 === 2 ? 'HIGH' : p.order + 1 === 3 ? 'MED' : 'LOW'
            }))
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

  // Reorder POI Priority Up/Down
  const handleMovePoiOrder = (poiId, direction) => {
    const sorted = [...mission.pois].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((p) => p.id === poiId);
    const swapIdx = direction === 'UP' ? idx - 1 : idx + 1;
    if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) return;
    const temp = sorted[idx];
    sorted[idx] = sorted[swapIdx];
    sorted[swapIdx] = temp;
    const reindexed = sorted.map((p, i) => ({
      ...p,
      order: i + 1,
      priority: i === 0 ? 'HIGH' : i === 1 ? 'MED' : 'LOW'
    }));
    setMission((prev) => ({ ...prev, pois: reindexed }));
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

  return (
    <div
      className="min-h-screen w-full bg-[#0b0f14] text-slate-100 flex flex-col select-none overflow-x-hidden"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap');
        .font-mono { font-family: 'IBM Plex Mono', monospace; }
        .leaflet-container { background: #080b0f !important; font-family: 'IBM Plex Mono', monospace; }
        .marswalk-tooltip {
          background: #0b0f14 !important;
          color: #ffffff !important;
          border: 1px solid #FF6B35 !important;
          font-family: 'IBM Plex Mono', monospace !important;
          font-size: 11px !important;
          font-weight: 700 !important;
        }
      `}</style>

      {/* ═══════════════════════════════════════════════════════════════════════
          §1 GLOBAL TOP BAR: JEZERO CONTEXT + SIMULATED AUTH SWITCHER + 3 FILTERS
         ═══════════════════════════════════════════════════════════════════════ */}
      <header className="bg-[#12181f] border-b border-[#1f2a35] px-3 py-2 flex flex-wrap items-center justify-between gap-2 z-30">
        {/* Left: Brand, Jezero Coordinates, PDS Badge & Proxy Toggle */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-8 h-8 rounded bg-[#FF6B35]/20 border border-[#FF6B35] flex items-center justify-center font-mono font-extrabold text-xs text-[#FF6B35]">
            MW
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold tracking-tight text-sm sm:text-base text-white">
                MARSWALK · Sol {23 + mission.demoScriptSol} · Jezero Crater
              </span>
              <span className="px-1.5 py-0.5 rounded bg-[#35B17A]/20 text-[#35B17A] border border-[#35B17A]/40 font-mono text-[10px] font-bold">
                PDS Analyst’s Notebook: Séítah &amp; Delta
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-400 flex items-center gap-2">
              <span>L.CRS.EPSG4326 (18.436°N, 77.456°E)</span>
              <span>·</span>
              <button
                onClick={() => setUseFastApiProxy((prev) => !prev)}
                className={`px-1.5 py-0.2 rounded border text-[9.5px] font-mono ${
                  useFastApiProxy
                    ? 'bg-[#2D7FF9]/20 text-[#60a5fa] border-[#2D7FF9]'
                    : 'bg-[#0b0f14] text-slate-400 border-[#1f2a35]'
                }`}
                title="Toggle FastAPI CORS proxy (http://localhost:8000/proxy?url= from map_2.py)"
              >
                <Server className="w-2.5 h-2.5 inline mr-1" />
                {useFastApiProxy ? 'Proxy :8000 ON' : 'Direct CORS (Trek/USGS)'}
              </button>
            </div>
          </div>
        </div>

        {/* Center: SIMULATED AUTHENTICATED USER SWITCHER (Starts on Scientist) */}
        <div className="flex items-center gap-1.5 bg-[#0b0f14] p-1 rounded-md border border-[#1f2a35]">
          <span className="text-[10px] font-mono text-slate-400 px-1.5 hidden xl:inline flex items-center gap-1">
            <UserCheck className="w-3 h-3 inline text-[#2D7FF9] mr-1" />
            AUTH USER:
          </span>

          <button
            onClick={() => handleRoleSwitch('scientist')}
            className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              currentRole === 'scientist'
                ? 'bg-[#2D7FF9] text-white shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>👨‍🔬 Scientist</span>
          </button>

          <button
            onClick={() => handleRoleSwitch('control')}
            className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              currentRole === 'control'
                ? 'bg-[#2D7FF9] text-white shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>🛰️ Mission Control</span>
            <span className="px-1 rounded bg-[#0b0f14]/60 text-[#35B17A] font-mono text-[10px]">
              {mission.activePlanVersion}
            </span>
          </button>

          <button
            onClick={() => handleRoleSwitch('astronaut')}
            className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              currentRole === 'astronaut'
                ? 'bg-[#FF6B35] text-[#0b0f14] font-extrabold shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>🧑‍🚀 Astronaut HUD</span>
          </button>
        </div>

        {/* Right: 3-Sol Demo Stepper + EVIDENCE Slide-Over + mission.json */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1 bg-[#0b0f14] px-2 py-1 rounded border border-[#1f2a35]">
            <span className="text-[10px] font-mono text-[#FF6B35] font-bold">DEMO:</span>
            {[
              { sol: 1, label: 'Sol 1: Prior' },
              { sol: 2, label: 'Sol 2: 12m Funnel' },
              { sol: 3, label: 'Sol 3: SEP Alert' }
            ].map((s) => (
              <button
                key={s.sol}
                onClick={() => handleRunDemoSol(s.sol)}
                className={`px-2 py-0.5 rounded font-mono text-[10.5px] font-bold border cursor-pointer ${
                  mission.demoScriptSol === s.sol
                    ? 'bg-[#FF6B35] text-[#0b0f14] border-[#FF6B35]'
                    : 'bg-[#12181f] text-slate-300 border-[#1f2a35]'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowEvidenceDrawer(true)}
            className="px-2.5 py-1.5 rounded bg-[#E5C04A]/15 hover:bg-[#E5C04A]/25 text-[#E5C04A] border border-[#E5C04A] font-mono text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <Database className="w-3.5 h-3.5" />
            <span>EVIDENCE</span>
          </button>

          <button
            onClick={() => setShowJsonModal(true)}
            className="px-2 py-1.5 rounded bg-[#0b0f14] hover:bg-[#1f2a35] text-slate-300 border border-[#1f2a35] font-mono text-xs flex items-center gap-1 cursor-pointer"
            title="Inspect shared mission.json v5 contract"
          >
            <FileJson className="w-3.5 h-3.5 text-[#2D7FF9]" />
          </button>
        </div>
      </header>

      {/* Toast Notification Bar */}
      {toastMsg && (
        <div className="bg-[#12181f] border-b-2 border-[#35B17A] px-4 py-1.5 text-xs font-mono text-[#35B17A] flex items-center justify-between">
          <span className="font-bold">{toastMsg}</span>
          <span className="text-slate-400">Map Center &amp; Zoom Preserved</span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SINGLE-SCREEN WORKSPACE: PERSISTENT JEZERO MAP (LEFT) + ROLE LENS (RIGHT)
         ═══════════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 min-h-[calc(100vh-58px)]">
        {/* LEFT COLUMN (7 Cols): PERSISTENT LEAFLET JEZERO MAP + 3 SIMULATED ROLE FILTERS BAR */}
        <section className="lg:col-span-7 h-[540px] lg:h-auto flex flex-col bg-[#12181f] border border-[#1f2a35] rounded-md overflow-hidden relative">
          {/* Top Map Sub-Bar: Active Role's 3 Simulated Filter Presets + Prior↔Posterior Slider */}
          <div className="bg-[#12181f] border-b border-[#1f2a35] px-3 py-2 flex flex-wrap items-center justify-between gap-2 z-20">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1 mr-1">
                <Filter className="w-3 h-3 text-[#2D7FF9]" />
                <span>3 ROLE FILTERS ({currentRole.toUpperCase()}):</span>
              </span>

              {/* Filter Pill 1: Spectral & CRISM/PDS Fusion */}
              <button
                onClick={() => handleToggleRoleFilter('filter1_spectralFusion')}
                className={`px-2 py-1 rounded text-[11px] font-mono font-bold border flex items-center gap-1 cursor-pointer ${
                  activeFilters.filter1_spectralFusion
                    ? 'bg-[#2D7FF9]/25 text-white border-[#2D7FF9]'
                    : 'bg-[#0b0f14] text-slate-400 border-[#1f2a35]'
                }`}
              >
                <span>1. CRISM Prior ↔ PDS Posterior</span>
              </button>

              {/* Filter Pill 2: Thermal Inertia / Slope Topography */}
              {currentRole === 'scientist' ? (
                <button
                  onClick={() => handleToggleRoleFilter('filter2_thermalInertia')}
                  className={`px-2 py-1 rounded text-[11px] font-mono font-bold border flex items-center gap-1 cursor-pointer ${
                    activeFilters.filter2_thermalInertia
                      ? 'bg-[#FF6B35]/25 text-[#FF6B35] border-[#FF6B35]'
                      : 'bg-[#0b0f14] text-slate-400 border-[#1f2a35]'
                  }`}
                >
                  <span>2. THEMIS Thermal (100m)</span>
                </button>
              ) : (
                <button
                  onClick={() => handleToggleRoleFilter('topographySlope')}
                  className={`px-2 py-1 rounded text-[11px] font-mono font-bold border flex items-center gap-1 cursor-pointer ${
                    activeFilters.topographySlope
                      ? 'bg-[#E5C04A]/25 text-[#E5C04A] border-[#E5C04A]'
                      : 'bg-[#0b0f14] text-slate-400 border-[#1f2a35]'
                  }`}
                >
                  <span>2. MOLA+HRSC Slope &amp; NE Zones</span>
                </button>
              )}

              {/* Filter Pill 3: PDS Targets & Routes */}
              <button
                onClick={() => handleToggleRoleFilter('filter3_pdsTargetsTraverse')}
                className={`px-2 py-1 rounded text-[11px] font-mono font-bold border flex items-center gap-1 cursor-pointer ${
                  activeFilters.filter3_pdsTargetsTraverse
                    ? 'bg-[#35B17A]/25 text-[#35B17A] border-[#35B17A]'
                    : 'bg-[#0b0f14] text-slate-400 border-[#1f2a35]'
                }`}
              >
                <span>3. HiRISE 25cm + PDS Targets</span>
              </button>
            </div>

            {/* Inline CRISM Prior ↔ PDS Posterior Slider on Map Header */}
            {currentRole !== 'astronaut' && (
              <div className="flex items-center gap-2 bg-[#0b0f14] px-2.5 py-1 rounded border border-[#2D7FF9]/60">
                <span className="text-[10px] font-mono text-[#E5C04A] font-bold">
                  CRISM Prior (±34%)
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={mission.fusionSliderPct}
                  onChange={(e) =>
                    setMission((prev) => ({
                      ...prev,
                      fusionSliderPct: Number(e.target.value)
                    }))
                  }
                  className="w-24 accent-[#35B17A] cursor-pointer"
                  title="Slide from Orbital CRISM Prior (0%) to In-Situ PDS SuperCam/PIXL/SHERLOC Posterior (100%)"
                />
                <span className="text-[10px] font-mono text-[#35B17A] font-bold">
                  PDS Posterior (±3.8%)
                </span>
              </div>
            )}
          </div>

          {/* Persistent Leaflet Map Container */}
          <div className="relative flex-1 w-full h-full">
            <div ref={mapContainerRef} className="w-full h-full z-10" />

            {/* Floating Map Zoom & Center Controls (Top-Right over Map) */}
            <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
              <button
                onClick={() => mapInstanceRef.current?.zoomIn()}
                className="p-2 rounded bg-[#0b0f14]/90 hover:bg-[#12181f] text-white border border-[#1f2a35] shadow"
                title="Zoom In (up to HiRISE z17)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => mapInstanceRef.current?.zoomOut()}
                className="p-2 rounded bg-[#0b0f14]/90 hover:bg-[#12181f] text-white border border-[#1f2a35] shadow"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() =>
                  mapInstanceRef.current?.setView(JEZERO_CENTER, 14, { animate: true })
                }
                className="px-2 py-1 rounded bg-[#0b0f14]/90 hover:bg-[#12181f] text-[#60a5fa] border border-[#1f2a35] font-mono text-[10px] font-bold shadow"
                title="Recenter on Séítah & Western Delta"
              >
                Jezero
              </button>
            </div>

            {/* Bottom-Center Click-to-Inspect MOLA Elevation & Nearest Perseverance Sol Pill (from index_2.html) */}
            <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-wrap items-end justify-between gap-2 pointer-events-none">
              <div className="pointer-events-auto bg-[#0b0f14]/95 border border-[#1f2a35] rounded px-3 py-2 text-[11px] font-mono shadow-xl max-w-lg">
                <div className="flex items-center gap-2 text-[#FF6B35] font-bold">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>SELECTED POINT (CLICK MAP FOR MOLA COG &amp; SOL):</span>
                </div>
                <div className="text-slate-200 mt-0.5">
                  <strong>Lat:</strong> {clickedPoint.lat.toFixed(5)}° N ·{' '}
                  <strong>Lon:</strong> {clickedPoint.lon.toFixed(5)}° E ·{' '}
                  <strong>MOLA Elev:</strong>{' '}
                  <span className="text-[#35B17A] font-bold">
                    {clickedPoint.molaElevationM} m
                  </span>{' '}
                  <span className="text-[9.5px] text-slate-400">
                    [{clickedPoint.elevationSource}]
                  </span>
                </div>
                <div className="text-slate-400 text-[10px]">
                  Nearest Perseverance Waypoint:{' '}
                  <span className="text-white font-semibold">
                    Sol {clickedPoint.nearestSol} ({clickedPoint.nearestWaypointName})
                  </span>{' '}
                  — {clickedPoint.distanceKm.toFixed(2)} km
                </div>
              </div>

              {/* Right On-Map Legend: Compressed Funnel & Uncertainty Colormap */}
              <div className="pointer-events-auto bg-[#0b0f14]/95 border border-[#1f2a35] rounded px-3 py-2 text-[10px] font-mono shadow-xl">
                <div className="text-slate-200 font-bold uppercase mb-1 flex items-center justify-between gap-3">
                  <span>BAYESIAN UNCERTAINTY (σ)</span>
                  <span className="text-[#35B17A]">
                    Fusion: {mission.fusionSliderPct}% Posterior
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#35B17A] font-bold">±3.8% (PIXL/SHERLOC)</span>
                  <div
                    className="w-28 h-2.5 rounded border border-[#1f2a35]"
                    style={{
                      background:
                        'linear-gradient(90deg, #35B17A 0%, #38bdf8 40%, #E5C04A 75%, #a855f7 100%)'
                    }}
                  />
                  <span className="text-[#E5C04A] font-bold">±36% (CRISM Prior)</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN (5 Cols): ROLE-SPECIFIC DECISION DECK */}
        <aside className="lg:col-span-5 flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-76px)] pr-0.5">
          {/* ═══════════════════════════════════════════════════════════════════
              ROLE 1: SCIENTIST VIEW (DEFAULT INITIAL ROLE)
              ("Compressing the Multi-Sol Rover Funnel" + Prior->Posterior + PDS Targets)
             ═══════════════════════════════════════════════════════════════════ */}
          {currentRole === 'scientist' && (
            <>
              {/* 1A. COMPRESSED DECISION FUNNEL: ROVER (4 SOLS) vs ASTRONAUT (12 MIN) */}
              <div className="bg-[#12181f] border border-[#1f2a35] rounded-md p-3.5 space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#1f2a35] pb-2">
                  <div className="flex items-center gap-2">
                    <FastForward className="w-4 h-4 text-[#FF6B35]" />
                    <h2 className="text-xs font-mono font-extrabold uppercase text-white">
                      DECISION FUNNEL: ROVER (4 SOLS) → ASTRONAUT (12 MIN)
                    </h2>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#FF6B35]/20 text-[#FF6B35] font-mono text-[10px] font-bold">
                    Decision Next to Data
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Uncrewed rovers require at least 1 ground-planning Sol per funnel stage
                  (Stand-off <span className="font-mono text-white">SuperCam</span> → Arm
                  approach &amp; <span className="font-mono text-white">Abrasion</span> → Contact{' '}
                  <span className="font-mono text-white">PIXL/SHERLOC</span>). Handheld
                  astronaut tools compress this entire funnel into <strong>12 minutes on-site</strong>,
                  updating the orbital <span className="font-mono text-[#E5C04A]">CRISM a-priori</span>{' '}
                  map in real time:
                </p>

                {/* 4-Stage Funnel Comparison Grid */}
                <div className="grid grid-cols-4 gap-1.5 text-[10px] font-mono">
                  <div className="p-2 rounded bg-[#0b0f14] border border-[#E5C04A]/60">
                    <div className="text-[#E5C04A] font-bold">1. ORBITAL PRIOR</div>
                    <div className="text-white font-semibold mt-0.5">MRO / CRISM</div>
                    <div className="text-slate-400">18 m/px · σ ±34%</div>
                  </div>
                  <div className="p-2 rounded bg-[#0b0f14] border border-[#2D7FF9]/60">
                    <div className="text-[#60a5fa] font-bold">2. STAND-OFF</div>
                    <div className="text-white font-semibold mt-0.5">SuperCam LIBS</div>
                    <div className="text-[#35B17A]">Rover: 1 Sol → 2m</div>
                  </div>
                  <div className="p-2 rounded bg-[#0b0f14] border border-[#2D7FF9]/60">
                    <div className="text-[#60a5fa] font-bold">3. ABRASION</div>
                    <div className="text-white font-semibold mt-0.5">Rotary Abrader</div>
                    <div className="text-[#35B17A]">Rover: 1 Sol → 4m</div>
                  </div>
                  <div className="p-2 rounded bg-[#0b0f14] border border-[#35B17A]">
                    <div className="text-[#35B17A] font-bold">4. CONTACT</div>
                    <div className="text-white font-semibold mt-0.5">PIXL + SHERLOC</div>
                    <div className="text-[#35B17A]">Rover: 2 Sols → 6m</div>
                  </div>
                </div>

                {/* Prior vs Posterior Slider Control */}
                <div className="p-2.5 rounded bg-[#0b0f14] border border-[#1f2a35] space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-[#E5C04A] font-bold">
                      ◀ A-Priori: CRISM 18m/px (σ = ±34%)
                    </span>
                    <span className="text-[#35B17A] font-bold">
                      Posterior: PDS PIXL/SHERLOC (σ = ±3.8%) ▶
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={mission.fusionSliderPct}
                    onChange={(e) =>
                      setMission((prev) => ({
                        ...prev,
                        fusionSliderPct: Number(e.target.value)
                      }))
                    }
                    className="w-full accent-[#35B17A] cursor-pointer"
                  />
                </div>
              </div>

              {/* 1B. SELECTED TARGET PDS ANALYST'S NOTEBOOK SPECTRAL & CHEMICAL INSPECTOR */}
              {selectedPoi && (
                <div className="bg-[#12181f] border border-[#2D7FF9] rounded-md p-3.5 space-y-2">
                  <div className="flex items-center justify-between border-b border-[#1f2a35] pb-2">
                    <div>
                      <span className="text-[10px] font-mono text-[#60a5fa] uppercase font-bold">
                        PDS ANALYST’S NOTEBOOK RECORD · {selectedPoi.id}
                      </span>
                      <h3 className="text-xs font-extrabold text-white">
                        {selectedPoi.name}
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-[#35B17A]/20 text-[#35B17A] font-mono text-[10px] font-bold">
                      {selectedPoi.roverEquivalentSols} Rover Sols → {selectedPoi.astronautFunnelMin} min EVA
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="p-2 rounded bg-[#0b0f14] border border-[#E5C04A]/50">
                      <div className="text-[10px] text-[#E5C04A] font-bold">
                        A-PRIORI (ORBITAL CRISM)
                      </div>
                      <div className="text-slate-200 mt-0.5">
                        {selectedPoi.orbitalPrior.mineral}
                      </div>
                      <div className="text-[#E5C04A] mt-0.5">
                        Est: {selectedPoi.orbitalPrior.hydrationEst} (Unc{' '}
                        {selectedPoi.orbitalPrior.uncertainty})
                      </div>
                    </div>

                    <div className="p-2 rounded bg-[#0b0f14] border border-[#35B17A]">
                      <div className="text-[10px] text-[#35B17A] font-bold">
                        POSTERIOR (PDS IN-SITU)
                      </div>
                      <div className="text-white font-bold mt-0.5">
                        Hydration: {selectedPoi.pdsInSituPosterior.hydrationPosterior}
                      </div>
                      <div className="text-[#35B17A] mt-0.5">
                        Updated Unc: {selectedPoi.pdsInSituPosterior.uncertaintyAfter}
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded bg-[#0b0f14] border border-[#1f2a35] space-y-1 text-[11px] font-mono">
                    <div>
                      <span className="text-[#60a5fa] font-bold">[SuperCam]: </span>
                      <span className="text-slate-300">
                        {selectedPoi.pdsInSituPosterior.supercam}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#E5C04A] font-bold">[Abrasion]: </span>
                      <span className="text-slate-300">
                        {selectedPoi.pdsInSituPosterior.abrasion}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#35B17A] font-bold">[PIXL XRF]: </span>
                      <span className="text-slate-300">
                        {selectedPoi.pdsInSituPosterior.pixl}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#a855f7] font-bold">[SHERLOC Raman]: </span>
                      <span className="text-slate-300">
                        {selectedPoi.pdsInSituPosterior.sherloc}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 1C. IN-SITU FIELD DISCOVERY -> PROMOTE TO HIGH POI & UPDATE POSTERIOR */}
              <div className="bg-[#12181f] border border-[#1f2a35] rounded-md p-3.5 space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#1f2a35] pb-2">
                  <div>
                    <h3 className="text-xs font-mono font-extrabold uppercase text-white">
                      IN-SITU FIELD FUNNEL DISCOVERIES &amp; POI PRIORITY
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Promote handheld discoveries to update the CRISM posterior &amp; route plan
                    </p>
                  </div>
                </div>

                {/* Highlighted Candidate Discovery FE-024-003 */}
                {mission.fieldEvents
                  .filter((fe) => fe.id === 'FE-024-003')
                  .map((fe) => (
                    <div
                      key={fe.id}
                      className="p-2.5 rounded bg-[#0b0f14] border-2 border-[#38bdf8] space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-extrabold text-[#38bdf8]">
                          ★ {fe.id}: {fe.title}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-[#35B17A]/20 text-[#35B17A] font-mono text-[10px] font-bold">
                          12-min Funnel
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300">{fe.description}</p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] font-mono text-slate-400">
                          Source: {fe.source}
                        </span>
                        {!fe.promotedPoiId ? (
                          <button
                            onClick={() => handleRunRapidFunnelAndPromote(fe.id)}
                            className="px-3 py-1 rounded bg-[#FF6B35] hover:bg-[#ff8255] text-[#0b0f14] font-mono text-[11px] font-extrabold flex items-center gap-1 shadow cursor-pointer"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>PROMOTE TO HIGH POI &amp; UPDATE POSTERIOR</span>
                          </button>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-[#35B17A]/20 text-[#35B17A] border border-[#35B17A] font-mono text-[10px] font-bold">
                            ✓ PROMOTED TO POI-4 (POSTERIOR UPDATED)
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                {/* Prioritized POI List */}
                <div className="space-y-1.5">
                  {sortedPois.map((poi, idx) => (
                    <div
                      key={poi.id}
                      onClick={() => {
                        setSelectedPoiId(poi.id);
                        mapInstanceRef.current?.panTo([poi.lat, poi.lon]);
                      }}
                      className={`p-2 rounded bg-[#0b0f14] border flex items-center justify-between gap-2 cursor-pointer ${
                        selectedPoiId === poi.id ? 'border-[#2D7FF9]' : 'border-[#1f2a35]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-6 h-6 rounded font-mono text-xs font-extrabold flex items-center justify-center ${
                            poi.priority === 'HIGH'
                              ? 'bg-[#E5484D] text-white'
                              : poi.priority === 'MED'
                              ? 'bg-[#E5C04A] text-[#0b0f14]'
                              : 'bg-slate-600 text-white'
                          }`}
                        >
                          {poi.order}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-white">
                            {poi.id}: {poi.name}
                          </div>
                          <div className="text-[10px] font-mono text-[#35B17A]">
                            [{poi.sourceBadge}] · Posterior: {poi.pdsInSituPosterior.hydrationPosterior}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMovePoiOrder(poi.id, 'UP');
                          }}
                          disabled={idx === 0}
                          className="p-1 rounded bg-[#12181f] border border-[#1f2a35] text-slate-300 disabled:opacity-30"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMovePoiOrder(poi.id, 'DOWN');
                          }}
                          disabled={idx === sortedPois.length - 1}
                          className="p-1 rounded bg-[#12181f] border border-[#1f2a35] text-slate-300 disabled:opacity-30"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleRoleSwitch('control')}
                  className="w-full py-2.5 px-4 rounded bg-[#FF6B35] hover:bg-[#ff8255] text-[#0b0f14] font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                >
                  <span>PROPOSE UPDATED PDS TARGETS TO MISSION CONTROL →</span>
                </button>
              </div>
            </>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              ROLE 2: MISSION CONTROL VIEW
              (Route Compare & Optimizer + PDS MEDA Weather + Plan Versioning v1->v2->v3)
             ═══════════════════════════════════════════════════════════════════ */}
          {currentRole === 'control' && (
            <>
              {/* 2A. ROUTE COMPARE & OPTIMIZER WIDGET */}
              <div className="bg-[#12181f] border border-[#1f2a35] rounded-md p-3.5 space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#1f2a35] pb-2">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-[#2D7FF9]" />
                    <h2 className="text-xs font-mono font-extrabold uppercase text-white">
                      JEZERO ROUTE COMPARE &amp; OPTIMIZER
                    </h2>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#E5C04A]/20 text-[#E5C04A] font-mono text-[10px] font-bold">
                    Thresholds = demo parameters
                  </span>
                </div>

                <div className="space-y-2">
                  {Object.values(mission.routes).map((rt) => {
                    const isSelected = mission.selectedRoute === rt.id;
                    return (
                      <div
                        key={rt.id}
                        onClick={() =>
                          setMission((prev) => ({ ...prev, selectedRoute: rt.id }))
                        }
                        className={`p-2.5 rounded bg-[#0b0f14] border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-[#2D7FF9] ring-1 ring-[#2D7FF9]'
                            : 'border-[#1f2a35] hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className="font-mono text-xs font-extrabold"
                            style={{ color: rt.color }}
                          >
                            {isSelected ? '● ' : '○ '}
                            {rt.name}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${
                              rt.bufferMin >= 45
                                ? 'bg-[#35B17A]/20 text-[#35B17A]'
                                : 'bg-[#E5484D]/20 text-[#E5484D]'
                            }`}
                          >
                            Buffer: {rt.bufferMin}m
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1 mt-1.5 text-[10px] font-mono text-slate-300">
                          <div>Dist: {rt.distanceKm} km</div>
                          <div>Elev: +{rt.elevationGainM}m</div>
                          <div>Max Slope: {rt.slopeMax}°</div>
                          <div>Eval: {rt.dataCoveragePct}%</div>
                        </div>
                        <div className="text-[10.5px] font-mono text-[#60a5fa] mt-1">
                          Yield: {rt.funnelYield}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Rejected Candidate Traceability */}
                <div className="space-y-1">
                  <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                    OPTIMIZER REJECTION REASONING:
                  </div>
                  {mission.optimizerResult.rejected.map((rej, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded bg-[#0b0f14] border border-[#E5484D]/50 text-[11px] font-mono"
                    >
                      <div className="text-[#E5484D] font-bold">✕ {rej.option}</div>
                      <div className="text-slate-300 mt-0.5">{rej.reason}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2B. TIME WINDOW & PDS MEDA WEATHER CONTEXT CARD */}
              <div className="bg-[#12181f] border border-[#1f2a35] rounded-md p-3.5 space-y-2">
                <div className="flex items-center justify-between border-b border-[#1f2a35] pb-2 flex-wrap gap-1">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-[#E5C04A]" />
                    <h3 className="text-xs font-mono font-extrabold uppercase text-white">
                      TIME WINDOW &amp; PDS MEDA ENVIRONMENT
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#E5C04A]/20 text-[#E5C04A] border border-[#E5C04A] font-mono text-[9.5px] font-bold">
                    {mission.weatherCard.badge}
                  </span>
                </div>

                <div className="p-2.5 rounded bg-[#0b0f14] border border-[#1f2a35] space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">SUGGESTED EVA WINDOW:</span>
                    <span className="text-[#35B17A] font-bold">
                      {mission.timeWindow.suggestedStart} – {mission.timeWindow.latestReturn} LST
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-200">
                    {mission.weatherCard.medaContext}
                  </div>
                  <div
                    className={`text-[11px] ${
                      sepAlertActive ? 'text-[#E5484D] font-bold' : 'text-slate-400'
                    }`}
                  >
                    {mission.weatherCard.radContext}
                  </div>
                </div>
              </div>

              {/* 2C. PLAN VERSIONING LOG (Plan v1 -> v2 -> v3) */}
              <div className="bg-[#12181f] border border-[#1f2a35] rounded-md p-3.5 space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#1f2a35] pb-2">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-[#FF6B35]" />
                    <h3 className="text-xs font-mono font-extrabold uppercase text-white">
                      PLAN VERSIONING (v1 → v2 → v3 TRACEABILITY)
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#35B17A]/20 text-[#35B17A] font-mono text-[10px] font-bold">
                    Active: {mission.activePlanVersion}
                  </span>
                </div>

                <div className="space-y-2">
                  {mission.planVersions.map((pv) => {
                    const isCurrent = mission.activePlanVersion === pv.version;
                    return (
                      <div
                        key={pv.version}
                        className={`p-2.5 rounded bg-[#0b0f14] border ${
                          isCurrent ? 'border-[#FF6B35]' : 'border-[#1f2a35]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-extrabold text-white">
                            Plan {pv.version} · {pv.ts}
                          </span>
                          <button
                            onClick={() => {
                              setMission((prev) => ({
                                ...prev,
                                activePlanVersion: pv.version,
                                selectedRoute: pv.routeId
                              }));
                              triggerToast(`Approved & Sent Plan ${pv.version} to Astronaut HUD`);
                            }}
                            className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold cursor-pointer ${
                              isCurrent
                                ? 'bg-[#35B17A]/20 text-[#35B17A] border border-[#35B17A]'
                                : 'bg-[#2D7FF9] text-white'
                            }`}
                          >
                            {isCurrent ? '✓ ACTIVE ON HUD' : `SEND ${pv.version}`}
                          </button>
                        </div>
                        <div className="text-[11px] font-mono text-[#E5C04A] mt-1">
                          Trigger: {pv.trigger}
                        </div>
                        <div className="text-[11px] text-slate-300 mt-0.5">
                          {pv.reason}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => handleRoleSwitch('astronaut')}
                  className="w-full py-2.5 px-4 rounded bg-[#FF6B35] hover:bg-[#ff8255] text-[#0b0f14] font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                >
                  <span>SEND DAILY PLAN TO ASTRONAUT HUD →</span>
                </button>
              </div>
            </>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              ROLE 3: ASTRONAUT HUD VIEW
              (<3s Scan, >=64px Glove Targets, Rapid 12-Min Field Funnel Executor)
             ═══════════════════════════════════════════════════════════════════ */}
          {currentRole === 'astronaut' && (
            <>
              {/* 3A. TOP STATUS & PLAN DIFF BANNER */}
              <div
                className={`p-3.5 rounded-md border-2 shadow-xl ${
                  sepAlertActive
                    ? 'bg-[#E5484D]/25 border-[#E5484D]'
                    : 'bg-[#12181f] border-[#35B17A]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded font-mono text-xs font-extrabold ${
                          sepAlertActive
                            ? 'bg-[#E5484D] text-white'
                            : 'bg-[#35B17A] text-[#0b0f14]'
                        }`}
                      >
                        {sepAlertActive ? 'ALERT: SEP SHELTER RULE' : 'ON PLAN'}
                      </span>
                      <span className="font-mono text-xs font-bold text-white">
                        Light: 02:10 · Buffer: OK ({mission.routes[mission.selectedRoute]?.bufferMin}m)
                      </span>
                    </div>
                    <div className="font-mono text-xs text-slate-200 mt-1.5 font-bold">
                      {activePlanObj.diffSummary}
                    </div>
                  </div>

                  <button
                    onClick={handleToggleHudLocalZoom}
                    className="min-h-[64px] px-3 rounded bg-[#FF6B35] text-[#0b0f14] font-mono text-xs font-extrabold uppercase flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Crosshair className="w-4 h-4" />
                    <span>{hudLocalZoom ? 'SECTOR VIEW' : '1:250 POI ZOOM'}</span>
                  </button>
                </div>
              </div>

              {/* 3B. RAPID ON-SITE HANDHELD FUNNEL EXECUTOR (COMPRESSES 4 ROVER SOLS INTO 12 MIN) */}
              <div className="bg-[#12181f] border-2 border-[#2D7FF9] rounded-md p-3.5 space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#1f2a35] pb-2">
                  <div>
                    <span className="text-[10px] font-mono text-[#FF6B35] font-bold uppercase">
                      RAPID HANDHELD FIELD FUNNEL (4 ROVER SOLS → 12 MIN ON-SITE)
                    </span>
                    <h3 className="text-sm font-mono font-extrabold text-white">
                      ACTIVE TARGET: {selectedPoi.id} — {selectedPoi.name.split('(')[0]}
                    </h3>
                  </div>
                </div>

                {/* 3 Glove-Sized Funnel Steps (>= 64px height each) */}
                <div className="space-y-2">
                  <button
                    onClick={() =>
                      setFunnelStageProgress((p) => ({ ...p, standoff: !p.standoff }))
                    }
                    className={`w-full min-h-[64px] p-3 rounded border-2 text-left font-mono flex items-center justify-between cursor-pointer ${
                      funnelStageProgress.standoff
                        ? 'bg-[#35B17A]/15 border-[#35B17A] text-white'
                        : 'bg-[#0b0f14] border-[#1f2a35] text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-extrabold text-[#35B17A]">
                        STEP 1 (2 MIN vs 1 SOL) · HANDHELD SUPERCAM LIBS/VISIR
                      </div>
                      <div className="text-[11px] text-slate-200 mt-0.5">
                        {selectedPoi.pdsInSituPosterior.supercam}
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded bg-[#0b0f14] text-xs font-bold text-[#35B17A]">
                      [DONE]
                    </span>
                  </button>

                  <button
                    onClick={() =>
                      setFunnelStageProgress((p) => ({ ...p, abrasion: !p.abrasion }))
                    }
                    className={`w-full min-h-[64px] p-3 rounded border-2 text-left font-mono flex items-center justify-between cursor-pointer ${
                      funnelStageProgress.abrasion
                        ? 'bg-[#35B17A]/15 border-[#35B17A] text-white'
                        : 'bg-[#0b0f14] border-[#1f2a35] text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-extrabold text-[#E5C04A]">
                        STEP 2 (4 MIN vs 1 SOL) · HANDHELD ROTARY ABRADER
                      </div>
                      <div className="text-[11px] text-slate-200 mt-0.5">
                        {selectedPoi.pdsInSituPosterior.abrasion}
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded bg-[#0b0f14] text-xs font-bold text-[#35B17A]">
                      [ABRADE OK]
                    </span>
                  </button>

                  <button
                    onClick={() =>
                      setFunnelStageProgress((p) => ({ ...p, contact: !p.contact }))
                    }
                    className={`w-full min-h-[64px] p-3 rounded border-2 text-left font-mono flex items-center justify-between cursor-pointer ${
                      funnelStageProgress.contact
                        ? 'bg-[#35B17A]/15 border-[#35B17A] text-white'
                        : 'bg-[#0b0f14] border-[#1f2a35] text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-extrabold text-[#60a5fa]">
                        STEP 3 (6 MIN vs 2 SOLS) · HANDHELD PIXL XRF + SHERLOC RAMAN
                      </div>
                      <div className="text-[11px] text-slate-200 mt-0.5">
                        {selectedPoi.pdsInSituPosterior.pixl}
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded bg-[#0b0f14] text-xs font-bold text-[#35B17A]">
                      [±3.8% UNC]
                    </span>
                  </button>
                </div>

                {/* Big Glove CTA: Complete Funnel & Update Orbital CRISM Prior on Map */}
                <button
                  onClick={() => handleRunRapidFunnelAndPromote('FE-024-003')}
                  className="w-full min-h-[68px] px-4 py-3 rounded-md bg-[#E5C04A] hover:bg-[#f3ce58] text-[#0b0f14] font-mono font-extrabold text-xs uppercase flex items-center justify-center gap-2 shadow-xl cursor-pointer"
                >
                  <Zap className="w-5 h-5 shrink-0" />
                  <span>
                    {isRunningFunnelAnim
                      ? 'UPDATING CRISM PRIOR → PDS POSTERIOR...'
                      : 'LOG 12-MIN PDS FUNNEL READING & UPDATE MAP POSTERIOR'}
                  </span>
                </button>
              </div>
            </>
          )}
        </aside>
      </main>

      {/* ═══════════════════════════════════════════════════════════════════════
          EVIDENCE & PDS SOURCES SLIDE-OVER DRAWER
         ═══════════════════════════════════════════════════════════════════════ */}
      {showEvidenceDrawer && (
        <div className="fixed inset-0 z-50 bg-black/75 flex justify-end">
          <div className="w-full max-w-xl bg-[#12181f] border-l-2 border-[#E5C04A] h-full flex flex-col justify-between p-4 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1f2a35] pb-3">
              <div>
                <h2 className="text-sm font-mono font-extrabold uppercase text-white">
                  EVIDENCE · NASA TREK WMTS, USGS COG &amp; PDS NOTEBOOK SOURCES
                </h2>
                <p className="text-xs text-slate-400">
                  Every layer and reading carries its exact mission + instrument badge and limits.
                </p>
              </div>
              <button
                onClick={() => setShowEvidenceDrawer(false)}
                className="p-1.5 rounded bg-[#0b0f14] border border-[#1f2a35] text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto my-3 space-y-3 pr-1 font-mono text-xs">
              <div className="text-[#60a5fa] font-bold uppercase">
                1. STREAMED JEZERO RASTER LAYERS (FROM index_2.html)
              </div>
              {JEZERO_RASTER_CATALOG.map((lyr) => (
                <div
                  key={lyr.id}
                  className="p-2.5 rounded bg-[#0b0f14] border border-[#1f2a35] flex items-center justify-between"
                >
                  <div>
                    <div className="text-white font-bold">{lyr.name}</div>
                    <div className="text-[10px] text-slate-400">
                      [{lyr.instrument}] · Resolution: {lyr.res}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#35B17A]/20 text-[#35B17A] text-[10px] font-bold">
                    Cov: {lyr.coveragePct}%
                  </span>
                </div>
              ))}

              <div className="text-[#E5C04A] font-bold uppercase pt-2">
                2. AMBER “NOT EVALUATED” ZONES IN JEZERO SECTOR
              </div>
              {JEZERO_NOT_EVALUATED_ZONES.map((z) => (
                <div
                  key={z.id}
                  className="p-2.5 rounded bg-[#0b0f14] border border-[#E5C04A] space-y-1"
                >
                  <div className="text-[#E5C04A] font-bold">
                    [{z.id}] {z.name}
                  </div>
                  <div className="text-[11px] text-slate-300">{z.reason}</div>
                  <div className="text-[10px] text-slate-400">Limit: {z.limit}</div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowEvidenceDrawer(false)}
              className="w-full py-2 rounded bg-[#2D7FF9] text-white font-mono text-xs font-bold cursor-pointer"
            >
              Close Evidence &amp; PDS Sources
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SHARED CONTRACT MODAL (mission.json v5)
         ═══════════════════════════════════════════════════════════════════════ */}
      {showJsonModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#12181f] border border-[#2D7FF9] rounded-md max-w-3xl w-full max-h-[85vh] flex flex-col justify-between p-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1f2a35] pb-2">
              <span className="font-mono text-sm font-bold text-white">
                SHARED STATE CONTRACT (mission.json v5 · Jezero PDS Edition)
              </span>
              <button
                onClick={() => setShowJsonModal(false)}
                className="p-1 rounded bg-[#0b0f14] text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <pre className="my-3 p-3 rounded bg-[#0b0f14] border border-[#1f2a35] text-[11px] font-mono text-[#35B17A] overflow-auto flex-1">
              {JSON.stringify(mission, null, 2)}
            </pre>
            <button
              onClick={() => setShowJsonModal(false)}
              className="px-4 py-1.5 rounded bg-[#2D7FF9] text-white font-mono text-xs font-bold self-end cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}