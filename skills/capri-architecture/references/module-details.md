# CAPRI Module Details

Detailed breakdown of each CAPRI module with actual file names, parameter names, set
references, and data flow specifics.

---

## 1. COCO -- Complete and Consistent Database

**Purpose:** Build a complete, consistent national-level (NUTS0) agricultural database from
multiple statistical sources.

**Two-phase structure:**

### COCO1 -- Data import, overlay, and estimation

- Imports data from Eurostat, FAOSTAT, OECD, FADN
- Resolves conflicts between sources using priority rules
- Estimates missing values to create complete supply balance sheets

**Key files:**
- `coco/coco_input.gms` -- main steering file for COCO1
- `coco/coco1_eurostat.gms` -- Eurostat data import and mapping
- `coco/eurostat_agriculture_mapping.gms` -- mapping Eurostat codes to CAPRI SPEL codes

**Key parameters:**
- `p_supBalNat(ROWS,COLS,CC)` -- national supply balance sheets
- `p_priceNat(ROWS,CC)` -- national product prices
- `p_feedUseNat(FEED,AACT,CC)` -- national feed use by animal activity

**Output:** `dat/coco/res_BBCC.gdx` per country

### COCO2 -- Consumer prices and feed sector

- Derives consumer prices from producer prices and margins
- Builds the complete feed sector database
- Ensures accounting consistency across all balance sheet items

**Key SPEL product codes (set ROWS):**
- Cereals: `SWHE` (soft wheat), `DWHE` (durum wheat), `BARL` (barley), `MAIZ` (maize),
  `RYEM` (rye), `OATS` (oats)
- Oilseeds: `RAPE` (rapeseed), `SUNF` (sunflower), `SOYA` (soybeans)
- Animals: `DCOW` (dairy cows), `SCOW` (suckler cows), `BULL` (bulls),
  `PIGF` (fattening pigs), `SHGM` (sheep & goats)
- Feed: `OFAR` (fodder on arable), `GRAS` (grassland), `STRA` (straw)

---

## 2. CAPREG -- Regionalised Database

**Purpose:** Disaggregate the national COCO database to NUTS2 level (~280 EU regions) and
allocate inputs (feed, fertiliser, labour, capital) to activities.

**Key files:**
- `capreg/capreg.gms` -- main steering file
- `capreg/input_allocation.gms` -- allocate inputs to activities using FADN data
- `capreg/feed_allocation.gms` -- feed allocation to animal activities

**Key parameters:**
- `p_actLevl(RALL,AACT)` -- activity levels per region
- `p_yield(RALL,AACT,ROWS)` -- yields per region, activity, product
- `p_inputCoeff(RALL,AACT,INP)` -- input coefficients per region and activity
- `p_feedShare(RALL,AACT,FEED)` -- feed shares per animal activity

**Input allocation approach:**
- Uses FADN farm-type data to derive initial input coefficients
- Applies maximum entropy methods to reconcile with national totals from COCO
- Feed allocation uses animal nutrition requirements as constraints

**Key sets:**
- `RALL` -- all regions (NUTS0 + NUTS2)
- `NUTS2(RALL)` -- NUTS2 regions only
- `AACT` -- agricultural activities (crop and animal)
- `INP` -- input categories (from FADN: seeds, fertiliser, crop protection, etc.)
- `FEED` -- feedstuffs

**Output:** `dat/capreg/res_BBCC.gdx` per country

---

## 3. CAPTRD -- Trend Projection

**Purpose:** Project the regional database forward in time to create baseline scenarios.

**Four-step process:**

### Step 1 -- Independent trends
- Fit trend functions to historical time series at regional level
- Methods: log-linear, logistic, polynomial, moving averages
- Each variable gets an independently projected trend value

### Step 2 -- Consistency constraints
- Apply accounting identities to make independent trends consistent
- Uses a constrained optimisation (minimise deviation from Step 1 trends)

**Key equation types in `captrd/equations.gms`:**
- `MBAL_*` -- market balance constraints (production = use + trade + stock changes)
- `GROF_*` -- yield equations (gross output = area x yield)
- `AREAB_*` -- area balance (total land = sum of crop areas)
- `LANDUSEB_*` -- land use balance
- `HERD_*` -- animal herd constraints (demographics)
- `REQS_*` -- feed requirement constraints

**Key files:**
- `captrd/captrd.gms` -- main steering file
- `captrd/equations.gms` -- consistency constraint equations
- `captrd/define_stats_and_supports.gms` -- statistical fitting definitions

### Step 3 -- Expert support and external projections
- Integrates Aglink-COSIMO projections from OECD-FAO
- Maps Aglink commodity codes to CAPRI SPEL codes
- Expert adjustments override purely statistical trends where justified

**Key files:**
- `baseline/aglink_sets.gms` -- Aglink commodity set definitions
- `baseline/aglink_mappings.gms` -- mapping Aglink to CAPRI products
- `baseline/load_aglink.gms` -- load and process Aglink projections

### Step 4 -- Regional breakdown
- Distribute national-level adjusted trends to NUTS2 regions
- Preserves regional structure from CAPREG while matching national totals

**Output:** `dat/captrd/trends_BBYY.gdx`

---

## 4. CAPMOD -- Scenario Simulation

**Purpose:** Simulate policy scenarios by coupling regional supply models with a global
market model.

**Steering file:** `capmod.gms`

### 4a. Supply module

**Purpose:** Determine optimal production plans for each of ~280 EU regions given fixed
prices, technology, and policy instruments.

**Key files:**
- `supply/supply_model.gms` -- regional programming model definition
- `supply/supply_data.gms` -- load regional data for supply models

**Model structure:**
- One LP per region, ~60 activities, ~55 inputs
- Objective: maximise regional agricultural income
- PMP (Positive Mathematical Programming) calibration terms ensure base-year reproduction
- Constraints: land availability, feed requirements, animal nutrition, policy limits

**Key variables:**
- `v_actLevl(RALL,AACT)` -- activity levels (decision variables)
- `v_feedUse(RALL,AACT,FEED)` -- feed use per animal activity
- `v_inputUse(RALL,AACT,INP)` -- input use per activity

**Key parameters:**
- `p_price(RALL,ROWS)` -- product prices (from market model)
- `p_pmpQuad(RALL,AACT)` -- PMP quadratic cost terms
- `p_pmpConst(RALL,AACT)` -- PMP constant cost terms

**Land supply and transitions:**
- Land transitions modelled in `supply/supply_model.gms`
- Land types: arable, grassland, set-aside, fallow
- Conversion costs limit switching between land types

**Policy module:**
- `policy/policy_sets.gms` -- policy instrument set definitions
- `policy/policy.gms` -- main policy steering file
- `policy/premcut.gms` -- premium calculations and cuts
- `pol_input/mtr_until2013.gms` -- pre-2013 CAP instruments
- CAP 2014-2020: BPS convergence, voluntary coupled support (VCS), greening

### 4b. Market module (Armington)

**Purpose:** Determine global trade flows, market-clearing prices, and bilateral trade
using the Armington assumption (products differentiated by origin).

**Key files:**
- `arm/market1.gms` -- market model data preparation
- `arm/data_prep.gms` -- prepare price and quantity data
- `arm/cal_models.gms` -- calibration of Armington elasticities and preference parameters

**Model characteristics:**
- ~750,000 equations solved with CONOPT
- ~44 trade blocks, ~65 agricultural products
- Bilateral trade flows between all trade-block pairs
- Two-stage Armington: domestic vs. import aggregate, then import sourcing

**Key variables:**
- `v_tradeFlows(RW,RW,ROWS)` -- bilateral trade flows
- `v_arm1Price(RW,ROWS)` -- Armington first-stage composite prices
- `v_arm2Price(RW,ROWS)` -- Armington second-stage import prices
- `v_prodPrice(RW,ROWS)` -- producer prices
- `v_consQuant(RW,ROWS)` -- consumer demand quantities

**Key parameters:**
- `p_arm1Sigma(ROWS)` -- Armington first-stage substitution elasticities
- `p_arm2Sigma(ROWS)` -- Armington second-stage substitution elasticities
- `p_tradeMargin(RW,RW,ROWS)` -- bilateral trade margins

### Iterative coupling

```
      +--- Supply models (fixed prices) ---+
      |                                     |
      |   ~280 regional LPs                |
      v                                     |
  Aggregate to             Price update:    |
  trade-block level        weighted average |
      |                    of old & new     |
      v                                     |
  Market model -----> New prices -----------+
  (~750k equations)
```

**Key files for iteration:**
- `arm/simu_prestep.gms` -- iteration control, convergence check
- `arm/widen_bounds.gms` -- widen variable bounds if solver hits limits

**Convergence:** Weighted average of previous and new prices, with decreasing weight on new
prices as iterations progress. Typically converges in 10-30 iterations.

---

## 5. CAPDIS -- Spatial Disaggregation

**Purpose:** Disaggregate NUTS2 simulation results to 1km grid cells using Farm Structure
Units (FSU) and biophysical data.

**Key concepts:**
- Farm Structure Units (FSU): clusters of 1km grid cells with similar farm structure
- Uses land cover (CORINE), soil, climate, and elevation data as priors
- Maximum entropy approach to distribute NUTS2 totals across FSUs
- Maintains consistency with CAPMOD results at NUTS2 level

**Key files:**
- `capdis/capdis.gms` -- main steering file
- `capdis/fsu_data.gms` -- load FSU definitions and biophysical data

**Input:** `results/res_SCEN.gdx` from CAPMOD
**Output:** Gridded maps of agricultural activities, inputs, emissions at 1km resolution

---

## Cross-module data flow summary

```
Eurostat/FAOSTAT/OECD/FADN
        |
        v
    +--------+     dat/coco/res_BBCC.gdx
    |  COCO  | --------------------------+
    +--------+                            |
                                          v
    FADN farm-type data          +----------+    dat/capreg/res_BBCC.gdx
         |                       |  CAPREG   | -------------------------+
         +----- (inputs) ------>  +----------+                           |
                                                                         v
    Aglink-COSIMO projections                                   +----------+
         |                                                      |  CAPTRD   |
         +------- (expert support) ---------------------------> +----------+
                                                                    |
                                                  dat/captrd/trends_BBYY.gdx
                                                                    |
                                                                    v
    Policy scenarios  ------>  +----------+   results/res_SCEN.gdx
                               |  CAPMOD   | -------------------------+
                               +----------+                           |
                                                                      v
    Biophysical data  ------> +----------+   Gridded 1km maps
    (CORINE, soil, climate)   |  CAPDIS   |
                               +----------+
```

---

## Key set mappings between modules

| Set        | Scope           | Used in                    | Description                    |
|------------|-----------------|----------------------------|--------------------------------|
| `RALL`     | All regions     | All modules                | Superset of all region codes   |
| `NUTS2`    | EU NUTS2        | CAPREG, CAPTRD, supply     | ~280 EU regions                |
| `RW`       | Trade blocks    | Market module              | ~44 trade blocks               |
| `ROWS`     | Products/items  | All modules                | SPEL codes + balance items     |
| `COLS`     | Activities      | All modules                | Activity/process columns       |
| `AACT`     | Activities      | CAPREG, supply             | Agricultural activities        |
| `FEED`     | Feedstuffs      | CAPREG, supply             | Feed categories                |
| `INP`      | Inputs          | CAPREG, supply             | Input categories (from FADN)   |
| `LandUse`  | Land classes    | CAPREG, CAPTRD, supply     | Land use categories            |
| `META`     | Metadata        | Data loading               | Source/method documentation     |

---

## Environmental accounting modules

CAPMOD includes several environmental satellite accounts:

- **N balance:** Nitrogen surplus per region from fertiliser, manure, fixation, deposition
  minus crop uptake. Calibrated to national statistics.
- **Ammonia emissions:** NH3 from housing, storage, application. Based on EMEP/EEA methods.
- **GHG emissions:** CH4 (enteric fermentation, manure management), N2O (soils, manure),
  CO2 (energy use, land use change). Based on IPCC guidelines.
- **Carbon balance:** Soil organic carbon changes from land use transitions.

Key parameters:
- `p_nSurplus(RALL)` -- nitrogen surplus per region
- `p_nh3Emis(RALL,AACT)` -- ammonia emissions per activity
- `p_ghgEmis(RALL,AACT,GHG)` -- GHG emissions by source

---

## Biofuel module

Models first-generation biofuel demand and its feedstock requirements:
- Ethanol from cereals, sugar crops
- Biodiesel from oilseeds
- Mandates and blending targets as policy instruments
- Feedback to crop markets via feedstock demand
