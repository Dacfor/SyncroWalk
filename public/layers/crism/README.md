# CRISM composition layers (Jezero crater)

Real orbital data, not simulated. Browse products of the MRO CRISM **Map-projected Targeted
Reduced Data Record (MTRDR)**, downloaded unchanged from the NASA PDS Geosciences Node and
shown on the map as `L.imageOverlay` in the Scientist view (menu "Composition", off by default).

| File | PDS product ID | Scene | Acquired (UTC) | Resolution |
| --- | --- | --- | --- | --- |
| `frt0001fb74_07_brmafj_mtr3.png` | FRT0001FB74_07_BRMAFJ_MTR3 | Séítah, delta front, crater floor | 2011-08-14T19:33 | 18 m/px |
| `frt0001fb74_07_brcarj_mtr3.png` | FRT0001FB74_07_BRCARJ_MTR3 | same | 2011-08-14T19:33 | 18 m/px |
| `frt0001fb74_07_brphyj_mtr3.png` | FRT0001FB74_07_BRPHYJ_MTR3 | same | 2011-08-14T19:33 | 18 m/px |
| `frt00005c5e_07_brcarj_mtr3.png` | FRT00005C5E_07_BRCARJ_MTR3 | western delta | 2007-05-19T09:30 | 18 m/px |
| `frt00005c5e_07_brphyj_mtr3.png` | FRT00005C5E_07_BRPHYJ_MTR3 | western delta | 2007-05-19T09:30 | 18 m/px |

`FRT00005C5E_07_BRMAFJ_MTR3` is deliberately not included: a detector-row artefact saturates
its browse stretch and hides the signal.

## Bounds (from the `IMAGE_MAP_PROJECTION` object of each label, equirectangular, planetocentric, east-positive)

| Scene | Min lat | Max lat | West lon | East lon |
| --- | --- | --- | --- | --- |
| FRT00005C5E | 18.3646720 | 18.6350470 | 77.2791950 | 77.5587930 |
| FRT0001FB74 | 18.2697140 | 18.5118360 | 77.3985180 | 77.6611330 |

## What the colours mean (Viviano-Beck et al. 2014, doi:10.1002/2014JE004627)

- **MAF** (R OLINDEX3, G LCPINDEX2, B HCPINDEX2): red = olivine or Fe-phyllosilicate; green/cyan = low-Ca pyroxene; blue/magenta = high-Ca pyroxene.
- **CAR** (R D2300, G BD2500_2, B BD1900_2): yellow/white = carbonate; red/magenta = Fe/Mg phyllosilicate; blue = other hydrated minerals.
- **PHY** (R D2300, G D2200, B BD1900R2): red/magenta = Fe/Mg-OH phyllosilicate; green/cyan = Al-OH phyllosilicate or hydrated silica; blue = other hydrated minerals.

The app applies a display-only brightness/contrast stretch (CSS filter). The pixel values in
these files are the original PDS values. Vertical striping is CRISM detector noise.

## Source and licence

- Found with the PDS Orbital Data Explorer (https://ode.rsl.wustl.edu/mars/), product type MTRDR, around 18.44°N 77.45°E.
- Files: `https://pds-geosciences.wustl.edu/mro/mro-m-crism-5-rdr-mptargeted-v1/mrocr_4001/browse/2011/2011_226/frt0001fb74/` and `.../browse/2007/2007_139/frt00005c5e/`
- Data set: MRO-M-CRISM-5-RDR-MPTARGETED-V1.0 (bundle `urn:nasa:pds:mro_crism_mtrdr`).
- NASA PDS data are in the public domain. Credit: NASA / Johns Hopkins University Applied Physics Laboratory (CRISM team) / PDS Geosciences Node.
