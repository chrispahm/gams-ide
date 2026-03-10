---
name: capri-environmental
description: >
  Reference guide for CAPRI environmental indicators and emissions modeling. Use this skill
  when the user asks about GHG emissions, greenhouse gas, nutrient balances, NPK, nitrogen,
  phosphorus, potassium, energy use in agriculture, environmental indicators, IPCC methodology,
  manure management, fertilizer allocation, ammonia emissions, emission factors, carbon cycle,
  carbon balance, nitrate leaching, soil erosion, N2O, CH4, CO2 from agriculture, enteric
  fermentation, manure storage, manure application, over-fertilization, nutrient availability,
  atmospheric deposition, biological fixation, crop residues, emission intensity, tradable GHG
  permits, livestock density limits, nitrates directive, NEC directive, mitigation technologies,
  anaerobic digestion, feed additives, precision farming, or CAPDIS nitrogen disaggregation.
  Also trigger when exploring environmental data in CAPRI GDX files or writing scenario code
  that involves environmental constraints.
---

# CAPRI Environmental Indicators

This skill covers GHG emissions, nutrient balances (NPK), ammonia, energy use, and
environmental constraints in the CAPRI model. For detailed emission factor tables,
nutrient cycle equations, and file locations, see `references/emissions.md`.

---

## GHG Emission Methodology

CAPRI constructs IPCC-consistent GHG inventories for European agriculture. Three gases
are modeled: CH4, N2O, and CO2. Emission sources are coded with identifiers like
`CH4Ent`, `N2OMan`, `CO2his` (see reference file for the full table).

### CH4 Sources
- **Enteric fermentation** (`CH4Ent`): Tier 2 approach based on endogenous gross energy
  intake from the feed module. Methane conversion factor (Ym) applied per animal type.
- **Manure management** (`CH4Man`): Tier 2, depends on volatile solids, storage system
  shares (from GAINS database), and temperature.
- **Rice production** (`CH4Ric`): Tier 1 with IPCC 2006 default factors.

### N2O Sources
- **Manure management** (`N2OMan`), **grazing** (`N2OGra`), **synthetic fertilizer**
  (`N2OSyn`), **manure application** (`N2OApp`), **crop residues** (`N2OCro`).
- **Indirect emissions**: from ammonia volatilization (`N2OAmm`) and leaching/runoff
  (`N2OLea`).
- **Histosols** (`N2Ohis`): cultivation of organic soils.

### CO2 Sources
- Cultivation of histosols (`CO2his`), liming (`CO2lim`), urea application (`CO2urea`).
- Land use change: above/below ground biomass (`CO2bio`), soil carbon (`CO2soi`).

### Global Emission Intensity
A life-cycle module estimates GHG per ton of commodity for non-EU regions to capture
emission leakage (see Jansson et al. 2010, Perez Dominguez et al. 2012).

### Tradable GHG Permits
The model can simulate emission trading by attaching a shadow price to a GHG constraint
in the supply model. The constraint limits total CO2-equivalent emissions using GWP
factors (CH4 = 25, N2O = 298 per IPCC AR4).

---

## NPK Nutrient Balances

Nutrient balances are built around five elements:

1. **Nutrient export by harvested material** -- crop-specific N/P/K content per ton of
   yield (e.g., soft wheat: 20/8/6 kg NPK per ton).
2. **Manure output at tail** -- N linked to crude protein intake and IPCC retention rates;
   P and K from fixed manure content coefficients (cattle: 2.0 P, 5.5 K per m3).
3. **Mineral fertilizer input** -- from FAOSTAT/Fertiliser Manufacturers data, three-year
   averages.
4. **Other inputs** -- crop residues (IPCC 2006 factors), biological fixation (75% for
   pulses, 10% OFAR, 5% grassland), atmospheric deposition.
5. **Losses** -- NH3, NOx, N2O, N2, NO3 for nitrogen; runoff for phosphorus (not yet
   fully quantified).

The soil surplus = total input - harvested export - gaseous losses. Nitrate leaching is
a fraction of soil surplus based on MITERRA-Europe (soil type, land use, precipitation,
temperature, soil carbon).

### Over-fertilization and Availability Factors
- `NutFac`: factor for fertilization beyond crop export, prior mean 120%, bounds 5-500%.
- `NavFac`: nutrient availability in manure. For N: ~34% effective availability combining
  immediate release (50%) with ammonia losses (60%) and slow release (25%, 86% available).
  P and K priors at 50%.
- Both estimated via HPD estimator in the NPK calibration (file: `gams/capreg/`).
- Trend lines through time series of these factors capture technical progress.

### Manure Trade Between Regions
CAPRI calculates net manure trade within regions of the same member state. Emissions are
assigned to the exporting region; nutrients and carbon are assigned to the importing region.

---

## Ammonia Module

The NH3 module follows IIASA/GAINS methodology with member-state-specific coefficients:

1. **Grazing**: ~8% of excreted N lost as NH3.
2. **Housing**: losses of 10% (sheep/goat), 12% (cattle), 17% (pigs), 20% (poultry).
   Split between liquid and solid systems per member state.
3. **Storage**: 4-20% of N entering storage, depending on cover type.
4. **Application**: 8-40% surface losses; low-emission techniques save 20-40% or 80%.

Ammonia abatement technologies are endogenous farm practices in the supply model.

---

## Environmental Constraints in the Supply Model

Three EU directives are implemented:
- **Nitrates Directive (ND)**: upper limits on manure N and total N application per ha.
- **National Emissions Ceiling (NEC)**: member state NH3 limits committed until 2030.
- **Industrial Emissions Directive (IED)**: minimum manure storage requirements.

Additional flexible constraints:
- Flexible limits for nitrogen application to soils.
- Flexible limits for livestock density.

---

## Carbon Cycle

CAPRI quantifies carbon flows from feed intake through to soil sequestration:
- Feed C intake -> retention in animals/products + CH4 (enteric) + CO2 (respiration) +
  excretion.
- Excretion -> manure management CH4 + CO2 (63/37 ratio) + runoff + soil application.
- Crop side: residue C (IPCC 2006, 40% C content), exported C in products, liming,
  histosol emissions, rice CH4, erosion losses, and sequestration (CENTURY model,
  20-year horizon).

---

## Mitigation Technologies (ECAMPA)

Endogenous technologies in the supply model:
- Anaerobic digestion, feed additives (linseed, nitrate), precision farming, variable
  rate technology, nitrification inhibitors, better fertilizer timing, winter cover crops,
  no/conservation tillage, buffer strips, fallowing histosols, rice CH4 measures, increased
  legume share, genetic improvement, urea substitution, low-N feed, concrete manure
  storage, manure application/storage/stable measures (high/low efficiency), vaccination
  against methanogenic bacteria.

---

## Energy Use in Agriculture (Section 6.5)

Post-model LCA-based energy module using Cumulative Energy Demand (KEA VDI 4600).

### Direct Energy
| Source      | Factor     | Unit   |
|-------------|------------|--------|
| Diesel      | 45.7       | MJ/l   |
| Electricity | 11.7       | MJ/kWh |
| Heating gas | 47.9       | MJ/m3  |
| Heating oil | 49.7       | MJ/l   |

### Indirect Energy
| Source                | Factor | Unit              |
|-----------------------|--------|-------------------|
| N fertilizer          | 58.99  | MJ/kg nutrient    |
| P fertilizer          | 40.06  | MJ/kg nutrient    |
| K fertilizer          | 9.25   | MJ/kg nutrient    |
| Herbicides            | 218.62 | MJ/kg active sub. |
| Insecticides          | 299.02 | MJ/kg active sub. |
| Fungicides            | 124.38 | MJ/kg active sub. |

Key files: `enerind_bas` (base data), `enerind_calc` (scenario calculation).
Output tables: MJ/ha or MJ/head, MJ/kg product, MJ/EUR income, sectoral energy balance.

---

## CAPDIS Nitrogen Disaggregation

The CAPDIS module disaggregates nitrogen flows to 1x1 km Farm Structure Units (FSUs):
- Crop areas distributed via HPD using prior land cover, FSS statistics, and Corine data.
- Nitrogen inputs (mineral + organic) allocated spatially consistent with NUTS2 totals.
- Leaching fractions applied per FSU using local soil, climate, and land use data.
- Key files: `gams/capdis/capdis.gms`, data in `dat/capdishsu/`.

---

## Exploring Environmental Data with LM Tools

Use the GAMS IDE language model tools to inspect environmental results:

- **`chrispahm.gams-ide/gamsSearchSymbols`**: search for emission-related symbols, e.g. query `CH4Ent` or
  `N2O` or `NBAL` to find parameters and variables related to GHG or nutrient balances.
- **`chrispahm.gdx-viewer/gdx-sql`**: run SQL queries on result GDX files to extract environmental indicator
  values. Example: query `p_envInd` for emission results by region and source.
- **`chrispahm.gdx-viewer/gdx-reveal`**: browse GDX structure to find environmental reporting parameters like
  `p_ghgBalance`, `p_nBalance`, or energy indicator results.

Typical result GDX locations:
- Regional results: `results/capreg/res_*.gdx`
- Scenario results: `results/capmod/res_*.gdx`
- Disaggregated results: `results/capdis/res_*.gdx`
