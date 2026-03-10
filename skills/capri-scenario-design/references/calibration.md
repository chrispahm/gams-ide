# CAPRI Calibration Pipeline Reference

Detailed reference for the CAPRI baseline calibration pipeline, covering CAPTRD trend
projections, market model calibration, supply model calibration, and baseline reproduction.

---

## 1. CAPTRD forecast tool -- detailed steps

### 1.1 Step 1: Independent weighted nonlinear least squares

**File:** `captrd/estimate_trends.gms`

Trend function:
```
X(r,i,t,"Trend") = a(r,i,j) + b(r,i,j) * t^c(r,i,j)
```

- Parameters `a`, `b` estimated analytically (OLS) for each grid value of `c`
- Parameter `c` restricted to [0, 1.2] to prevent explosive projections
- Time variable: `t_1984 = 0.1, t_1985 = 0.2, ...` (gives strong nonlinearity in early
  years, near-linear in projection period)
- Weighting: trend variable `t` used as weight -- older observations count less
- Ex-post period: typically 1985 to 4-6 years before current year (from `res_time_series.gdx`)
- Output: trend forecasts + weighted sum of squared errors (`wSSE`) per series

**Key parameter:** `wSSE(r,i,j)` -- used as variance weight in subsequent steps

### 1.2 Step 2: Consistency constraints and MS-level expert support

**Files:**
- `captrd/fix_est.gms` -- growth rate safeguards
- `captrd/comibounds.gms` -- combined bounds on yields and consumption
- `captrd/expert_support.gms` -- expert information entry point

**Consistency constraints imposed:**
- `production = area * yield` (identity)
- Closed area balances (arable + permanent crops + grassland + ...)
- Closed market balances (production = domestic use + net trade + stock changes)
- Closed feed balances
- Milk fat and protein content balancing

**Growth rate safeguards (from `fix_est.gms`):**

| Variable | Max annual change |
|---|---|
| Input/output coefficients (yields) | +/- 2.5% p.a. |
| Feed input coefficients | +/- 10% (non-marketable fodder: +/- 5%) |
| Calves born per cow | +/- 10% total over projection |
| Replacement animals | +/- 20% total over projection |
| Final fattening weights | +/- 20% around base period |
| Milk yields | +0.25% to +1.25% p.a. (near EU average) |
| Crop yields (standard crops) | minimum +0.5% p.a. |
| Pork production (EU15) | max +1% p.a. |
| Poultry production (EU15) | max +1.5% p.a. |
| Total agricultural area | max decline -0.2% p.a. |
| Permanent grassland | max decline -10% vs. base year |
| Human consumption per caput | +/- 2% p.a. (meat: 0.8%, cereals: 0.4%) |
| Prices | +/- 2% p.a. |
| Strong animal level decrease | not below 20% of base year |

**Arable crop share bounds (from `fix_est.gms`):**
```
X.up/lo = X_base * (1 +/- 0.25 * (X_base/X_total_arable)^0.25)
```
Small-share crops can expand more (e.g. 0.1% -> up to 2.5%), large-share crops less
(e.g. 50% -> up to 70%).

**Expert support format:**
- Mean value + standard deviation (expressed as "trust level" 1-10)
- Sources: KWS (sugar/beet), PRIMES (biofuels), EC4MACS (GHG emissions)
- Trust level formula for variance:
  ```
  variance = (mean * 0.05/3 * (10/trust_level))^2
  ```
- Trust level 10: ~5.5% corridor at 99.9% probability
- Trust level 5: ~27.5% corridor at 99.9% probability
- Trust level 1: ~55% corridor at 99.9% probability

### 1.3 Step 3: EU-aggregate supports from Aglink-COSIMO

**Files:**
- `baseline/aglink*_sets.gms` -- Aglink region/product/item codes
- `baseline/aglink*_mappings.gms` -- mapping to CAPRI nomenclature
- `baseline/loag_aglink*.gms` -- assignment to CAPRI code world
- `captrd/define_eu_supports.gms` -- extension to 2030+, trust level assignment

**Procedure:**
1. Load Aglink-COSIMO projections (market balances, activity levels) at EU15/EU12 level
2. Map Aglink mnemonics to CAPRI product/item codes
3. Scale Step 2 MS-level results proportionally to match Aglink EU aggregates
4. Replace Step 1 standard errors with trust-level-based formula (default: level 5 for
   DG-AGRI supports)
5. For projections beyond Aglink horizon (typically 2020+): logistic dampened extrapolation
6. For long-run (2050): merge with FAO/IFPRI/GLOBIOM projections using variable weighting
   (`expert_support.gms`)

**Key parameter:** `p_PRIMESresults(MS,BIOEshare,SECG,year)` -- biofuel-related supports

### 1.4 Step 4: Regional breakdown

Disaggregation from MS level to NUTS2 regions (and optionally farm types):
- Uses regional shares from CAPREG base year data
- Preserves consistency with all constraints from Steps 2-3
- Regional CAPTRD output stored in `res_time_series.gdx`

---

## 2. Market model calibration -- detailed stages

### Stage I: Data balancing

**Key files:**
- `arm/prep_market.gms` -- main calibration driver
- `arm/def_tariff.gms` -- tariff data integration
- `arm/calc_feoga.gms` -- export subsidies, intervention data

**Actions:**
- Align market balance positions (production, consumption, trade, stocks) with CAPTRD
  trends and GLOBAL trade database
- Integrate trade policy data: applied/bound tariffs, TRQs, FTAs
- Set up bilateral trade flow matrix consistent with market balances
- Compute transport cost matrix from CEPII distance data

**Key parameters calibrated:**
- `p_tradeFlows(i,r,r1)` -- bilateral trade flows
- `p_transpCost(i,r,r1)` -- bilateral transport costs
- Various tariff parameters in `results/global/tariffs.gdx`

### Stage II: Elasticity trimming and behavioural function calibration

**Behavioural functions calibrated:**

| Agent | Functional form | Key parameters |
|---|---|---|
| Supply (non-EU) | Normalised Quadratic (NQ) profit function | `as(x)`, `bs(x,y)` |
| Feed demand | NQ-based linear functions | `af(i,r)`, `bf(i,j,r)` |
| Human consumption | Generalised Leontief indirect utility | `d(i)` (commitments), `bd(i,j)` |
| Processing (oilseeds) | NQ profit function on margins | `ac(i,r)`, `bc(i,j,r)` |
| Dairy processing | NQ on price-content margins | `am(mlk,r)`, `bm(mlk,j,r)` |

**Armington system calibration:**
- Two-stage CES: top level (domestic vs. imports), lower level (import origins)
- Share parameters `delta(i,r,r1)` calibrated from observed trade flows
- Substitution elasticities set exogenously per product group:
  - Cheese/fresh milk: 2 (dom/imp), 4 (between imports)
  - Sugar: 12/12
  - Most products: 8 (dom/imp), 10 (between imports)
- Modified Armington (Witzke et al.): commitment term `p_arm2Commit` for zero trade flows

### Stage III: Feed and fertilizer demand

- Feed energy balance: `sum(v_feedQuant * p_calContent) = sum(v_prodQuant * pv_feedConv)`
- Fat/protein balancing for dairy: `sum(MAPR * MLKCNT) = PRCM * MLKCNT` per component
- Feed demand calibrated to last output price vector from supply model
- Processing yields for oilseed crushing: CES between oil/cake shares

### Stage IV: Test run

**File:** `arm/prep_market.gms`

- Solve full market model at trend values
- Verify all market balances clear
- Check that calibrated parameters reproduce baseline quantities
- Inspect for infeasibilities; if found, use `arm/widen_bounds.gms` to expand bounds
  with dual values

**Market model solution procedure (from `arm/simu_prestep.gms`):**
1. Single-commodity models solved in parallel (GAMS grid solve)
2. Repeated with updated cross-prices
3. Commodity groups solved (cereals, oilseeds, etc.) with updated cross-prices
4. Full system solved last (~750,000 equations)

---

## 3. Supply model calibration -- detailed stages

### 3.1 Feed and fertilizer restriction calibration

**Files:**
- `supply/feed_module.gms` -- feed balance declarations
- `supply/fert_module.gms` -- fertilizer/nutrient balance

**Calibrated parameters:**
- `p_minFeedSharePerc(regions,animals,feed)` -- minimum feed shares
- `p_maxFeedShare(RALL,PACT,A,FEED)` -- maximum feed shares
- Feed energy conversion factors `pv_feedConv(i,r)`
- Nitrogen balance components (mineral fertiliser, excretions, crop residues)

### 3.2 Land supply and land use change calibration

**Files:**
- `supply/declare_calibration_models_for_luc.gms`
- `supply/declare_calibration_models_for_land_supply.gms`
- `cal_land_nests.gms` -- loading priors, initialisation, solve attempts
- `prep_cal.gms` -- orchestration

**Activated when:** `%trustee_land% == on` (GUI setting)

**Calibrated parameters:**
- `p_pmpCnstLandTypes` -- constant term "c" of land supply functions
- `p_pmpQuadLandTypes` -- quadratic term "D" of land supply functions
- Stored in `pmppar_XX.gdx` files per region

**Land type sets:**
- `LEVL = {ARAB, OSET, FRUN, GRAS, FORE, ARTIF, OLND}`
- `LU (UNFCCC) = {CROP, GRSLND, FORE, ARTIF, WETLND, RESLND}`
- Mapping via fixed shares: `GRSLND = GRAS + OLND * OLNDG0/OLND0`
- Inland waters (INLW): exogenous via `exogenousLandSupply` acronym

### 3.3 PMP calibration (marginal cost functions)

**Core approach:** Positive Mathematical Programming (PMP) with quadratic cost terms

**Calibrated parameters per activity:**
- PMP constant term (first-order: ensures FOC hold at baseline)
- PMP quadratic coefficient (second-order: determines supply elasticity)
- Cross terms between activities
- Stored in `pmppar_XX.gdx`

**Key equation (first-order condition at baseline):**
```
dF/dx_i - sum_j(lambda_j * dg_j/dx_i) + pi_i = 0
```
where:
- `dF/dx_i` = marginal profit including PMP terms
- `lambda_j` = dual values of resource constraints (land, feed, etc.)
- `pi_i` = dual of lower bound on activity level

### 3.4 Calibration tests

Per-region / per-farm-type solve to verify:
- Calibrated supply model reproduces CAPTRD activity levels
- All constraints satisfied (land balance, feed balance, nutrient balance)
- No numerical issues or infeasibilities

---

## 4. Baseline reproduction run

### Procedure

1. Set `%result_type%` to baseline policy file name
2. Run scenario simulation with "no change" -- all parameters at calibrated baseline values
3. Supply-market iteration should converge in very few iterations (ideally 1-2)
4. Verify quantitative reproduction:
   - Activity levels match CAPTRD projections
   - Market prices match market model calibration
   - Trade flows match baseline bilateral flows
   - Premium payments match policy file definitions

### Verification checklist

- [ ] Activity levels (LEVL) for all NUTS2 regions within tolerance
- [ ] Market prices (PMRK) for all trade blocks within tolerance
- [ ] Trade flows reproduce baseline bilateral matrix
- [ ] Welfare indicators at zero change (baseline vs. baseline)
- [ ] GHG emission indicators reproduce baseline values
- [ ] No solver infeasibilities in supply or market model

---

## 5. Key calibration parameters and their GDX locations

### CAPTRD output
| Parameter | Description | GDX file |
|---|---|---|
| `DATA2` | Projected activity levels, market balances | `res_time_series.gdx` |
| Time series items | LEVL, YILD, GROF, INHA, HCOM, FEED, etc. | `res_time_series.gdx` |

### Market model calibration output
| Parameter | Description | GDX file |
|---|---|---|
| `p_supplyData` | Supply model input data | `simini/sim_ini.gdx` |
| Armington parameters | `delta`, `sigma`, `p_arm2Commit` | `simini/sim_ini.gdx` |
| Trade policy | tariffs, TRQs, export subsidies | `simini/sim_ini.gdx` |
| Bilateral trade flows | `p_tradeFlows` | `simini/sim_ini.gdx` |

### Supply model calibration output
| Parameter | Description | GDX file |
|---|---|---|
| PMP parameters | constant + quadratic terms | `pmppar_XX.gdx` |
| `p_pmpCnstLandTypes` | Land supply constant | `pmppar_XX.gdx` |
| `p_pmpQuadLandTypes` | Land supply quadratic | `pmppar_XX.gdx` |
| Feed restrictions | min/max shares, conversions | `pmppar_XX.gdx` |

### Scenario simulation output
| Parameter | Description | GDX file |
|---|---|---|
| `DATA2` | All activity/market data | `results/%result_type%.gdx` |
| `p_supplyData` | Regional supply model results | `results/%result_type%.gdx` |
| Welfare indicators | Consumer/producer/taxpayer surplus | `results/%result_type%.gdx` |
| Dual values | Land rent, feed cost, FOC decomposition | `results/%result_type%.gdx` |
| Trade flows | Bilateral Armington results | `results/%result_type%.gdx` |
| Environmental | GHG emissions, N-balance, energy use | `results/%result_type%.gdx` |

---

## 6. Premium module parameters (policy scenarios)

Key parameters for premium/subsidy scenarios (file: `policy/policy_sets.gms`):

| Parameter | Description |
|---|---|
| `PRMR` | Regulation premium rate (nominal, uncut) |
| `PRMD` | Declared premium per ha/head (after application type conversion) |
| `PRME` | Effective premium (after ceiling cuts, iteratively adjusted) |
| `APPTYPE` | Application type: `perLevl`, `perSlgtHd`, `perYield`, `perHistY`, `perLiveStockUnit` |
| `ceilLev` | Ceiling on number of hectares/heads eligible |
| `ceilVal` | Ceiling on total budget envelope |
| `PSDPAY_cutEndog` | Set of schemes with hard ceiling (marginal payment = 0 at ceiling) |
| `p_premDataE` | Premium data array (was `PPDATA_E`) |
| `p_technFact` | Technology modification factor (for extensification incentives) |

**Premium cut mechanism (file `policy/premcut.gms`):**
- After each iteration, total claimed premiums are summed per scheme and regional level
- Compared against `ceilLev` and `ceilVal`
- Cut factor = min(ceilLev/total_level, ceilVal/total_value, 1)
- `PRME = PRMD * cut_factor` for next iteration

---

## 7. Scenario file structure template

A typical CAPRI scenario policy file follows this pattern:

```gams
*----------------------------------------------------------------------
* Scenario: [description]
* Author:   [name]
* Based on: [baseline policy file]
*----------------------------------------------------------------------

* --- Load baseline premium configuration
$include 'pol_input/baseline_policy.gms'

* --- Scenario modifications below

* --- Example: modify a premium rate
p_premDataE("EU27","DPVCS",MPACT,"PRMR") = 0;

* --- Example: tariff reduction
p_tarAdVal(CERE,RM,RM1) = p_tarAdVal(CERE,RM,RM1) * 0.80;

* --- Example: yield shock (technology change)
* Modify CAPTRD supports or I/O coefficients in scenario-specific include
$include 'pol_input/scenario_tech_change.gms'
```

The scenario file name becomes `%result_type%` and determines the output GDX file name.

---

## 8. Post-model analysis files

| Analysis | File | GUI location |
|---|---|---|
| Welfare analysis | `reports/welfare.gms` | Welfare tables |
| Dual decomposition | `supply/margcr.gms` | Farm => dual analysis |
| Yield/income decomposition | `reports/yield_change_decomp` | Farm => yield decomposition |
| Supply model sensitivity | GUI: Farm => supply model analysis | Optional reporting |
| Tariff aggregation | `aggreg_tariffs.gms` | Trade => Advanced tariff aggregators |

---

## 9. Market model solving approach

The market model (~750,000 equations) uses CONOPT with a staged solution strategy:

1. **Single-commodity pre-solves** (`arm/simu_prestep.gms`): each commodity solved
   independently with cross-prices fixed; uses GAMS grid solve for parallelism
2. **Repeated single-commodity rounds** with updated cross-prices
3. **Commodity group solves**: cereals, oilseeds, meats, dairy, etc. with
   cross-prices updated between rounds
4. **Full system solve**: all commodities simultaneously
5. **Infeasibility handling** (`arm/widen_bounds.gms`): if bounds cause infeasibility,
   inspect dual values and expand bounds stepwise

Heuristics track solve times and may skip stages if convergence is fast.
