# CAPRI Solve Failure Pattern Catalog

This reference catalogs the most common CAPRI solve failures, their root causes, diagnostic
steps, and resolution strategies. Each pattern includes the specific CAPRI parameters, files,
and set names involved.

---

## 1. Market model failures

### 1.1 CES Armington bound issues

**Description:** The two-stage Armington system (defined in `arm/market_model.gms`) uses CES
utility functions to determine bilateral trade flow composition. The substitution elasticity
sigma amplifies relative price changes: a 10% price change with sigma=10 produces a ~100%
change in import shares. When tariff removal or large price shocks occur, trade flows can be
driven to their lower bounds.

**Equations involved:**
- `importShares_` — Armington lower nest share equations (Eq. 5.97 in CAPRI docs)
- `arm2PriceAgg_` — Second-stage price aggregator (Eq. 5.91)
- `arm1PriceAgg_` — First-stage price aggregator (Eq. 5.92)

**Variables to inspect:**
- `v_tradeFlows(i,r,r1)` — bilateral trade flows between trade blocks (set RM)
- `v_arm2Price(i,r)` — average import price from Armington second stage
- `v_arm2Quant(i,r)` — aggregate import quantity
- `v_domSales(i,r)` — domestic sales quantity
- `v_impQuant(i,r)` — total import quantity
- `v_expQuant(i,r)` — total export quantity

**Key parameters:**
- Substitution elasticities (Table 28 in CAPRI docs):
  - Cheese, fresh milk products: sigma1=2, sigma2=4
  - Other vegetables: sigma1=1.5, sigma2=1.5
  - Other fruits: sigma1=3, sigma2=3
  - Sugar: sigma1=12, sigma2=12
  - All other products: sigma1=8, sigma2=10
- Share parameters `delta(i,r,r1)` — calibrated from observed trade flows
- Shift parameter `alpha(i,r)` — set during calibration

**Diagnostic steps:**
1. Query `v_tradeFlows` for flows at lower bounds with nonzero marginals
2. Check if the affected flows were already small in the baseline (near-zero calibration)
3. Compare `v_arm2Price` with individual `impp(i,r,r1)` import prices
4. Look at tariff changes: `v_tarAdVal`, `v_tarSpec`, `DiffLevies`

**Resolution:**
- The file `arm/widen_bounds.gms` automatically checks dual values on bounds and expands
  them stepwise. Verify this code executed by checking the listing file.
- If flows are driven to zero by legitimate competitive pressure, this may be acceptable —
  check if the infeasibility magnitude is small (< 0.001).
- For the modified Armington system (`arm/modArmington.gms`), verify the commitment
  parameter `p_arm2Commit` (mu) is correctly calibrated for zero-flow situations.
- Consider whether the scenario creates unrealistic price differentials.

### 1.2 TRQ regime switching

**Description:** Tariff Rate Quotas create a two-tier tariff system with a kink at the quota
threshold. CAPRI approximates this kink with sigmoid functions to maintain differentiability.
When import volumes hover near the quota fill rate, the solver may struggle with the steep
gradient.

**Types of TRQs in CAPRI:**
- Bilateral TRQs (allocated to specific trade partners)
- Global TRQs (erga omnes, open to all importers)
- Bilateral quotas are filled first; overflow enters global TRQ

**Equations and variables:**
- TRQ fill rate calculation adds all non-duty-free, non-prohibited imports
- `v_tarAdVal(i,r,r1)` — applied ad valorem tariff (endogenous under TRQ)
- `v_tarSpec(i,r,r1)` — applied specific tariff
- `v_flexLevy(i,r)` — flexible levy for EU cereals (Eq. 5.115)
- `p_doubleZero` — parameter flagging duty/quota-free access

**Three regimes:**
1. Quota underfill: in-quota tariff applied, no quota rent
2. Quota binding: in-quota tariff + endogenous quota rent
3. Quota overfill: MFN tariff applied, quota rent = MFN - in-quota rate

**Diagnostic steps:**
1. Check which regime the TRQ is in by inspecting applied tariff levels
2. Compare import quantities to quota volumes
3. Look for sigmoid function slope parameters — very steep slopes cause numerical issues
4. Check if multiple TRQs interact (bilateral + global for same product)

**Resolution:**
- Smooth the sigmoid function by reducing the slope parameter alpha
- If the scenario involves large quota changes, consider a stepped approach
- Check `arm/market_model.gms` for the TRQ implementation details
- Verify that `p_doubleZero` flags are correctly set for preferential access

### 1.3 Dairy processing balance failures

**Description:** The dairy module requires fat and protein balances (Eq. 5.81) between raw
milk and processed products. The normalised quadratic function for dairy processing (Eq. 5.82)
is driven by margins between product prices and fat/protein content values.

**Variables:**
- `v_prodQuant("milk",r)` — raw milk production
- `v_prodQuant(mlk,r)` — processed dairy product quantities (butter, SMP, WMP, cheese, etc.)
- `v_prodPrice(mlk,r)` — dairy product prices
- `pFatProt(fp,r)` — fat and protein prices (shadow prices of balances)
- `cont(mlk,fp)` — fat and protein content of dairy products (fixed)

**Diagnostic steps:**
1. Check if fat/protein balance equations have infeasibilities
2. Inspect dairy processing margins — are they becoming negative?
3. Verify raw milk quantity is sufficient to supply all processed products
4. Check if `bm` slope parameters create implausible substitution patterns

**Resolution:**
- Verify content coefficients `cont` are correct and consistent
- Check if processing CES yields are within plausible ranges
- Ensure `v_procYield` for oilseeds/dairy is not at extremes

### 1.4 Fudging function activation

**Description:** Behavioural functions (supply, feed, processing) based on normalised quadratic
forms can generate non-positive values for certain price combinations. A fudging function is
applied to ensure strictly positive quantities. This function is "highly non-linear and only
switched on on demand" (CAPRI docs Section 5.4.3).

**Symptoms:**
- Solver reports many superbasic variables
- Very slow convergence in CONOPT
- Variables stuck at small positive values near the fudging threshold

**Diagnostic steps:**
1. Check which quantity variables are near zero
2. Look at the marginal cost/revenue balance — negative marginal profits trigger fudging
3. Inspect `v_prodQuant`, `v_feedQuant`, `v_procQuant` for near-zero values

**Resolution:**
- The fudging function is a design feature, not a bug — but it can make solving harder
- Check if price shocks are so extreme that entire product categories become unprofitable
- Consider whether the scenario is economically plausible

---

## 2. Supply model failures

### 2.1 Land constraint violations

**Description:** The regional programming models include land balance constraints. Total
agricultural land demand must not exceed available land supply. The land supply function
(Eq. 5.65) is parameterised with `p_cnstLandSpply` and `p_cnstLandElas`.

**Key parameters:**
- `p_cnstLandSpply(r)` — constant in land supply function
- `p_cnstLandElas(r)` — elasticity of land supply (log specification)
- Land price = shadow price of land balance equation
- Land demand derived from supply quantities divided by yields

**Set context:**
- Land use types: ARAC (arable crops), FRUN (perennial crops), GRAS (permanent grassland),
  FORE (forest), ARTIF (artificial surfaces), OLND (other land)
- IPCC land classes: CROP, GRSLND, FORE, ARTIF, WETLND, RESLND

**Diagnostic steps:**
1. Check land balance equation marginals — very high values indicate binding land constraints
2. Inspect activity levels for crops with large expansions
3. Verify yield elasticity parameters are reasonable
4. Check if non-tradable crops (grass, silage, fodder maize) land demand is accounted for

**Resolution:**
- Verify `p_cnstLandElas` values are in line with GTAP-reported land supply elasticities
- Check if the scenario creates implausible land use shifts
- The land supply curve specification (log of land rents) may need adjustment for extreme
  price scenarios

### 2.2 Feed balance issues

**Description:** The supply model balances feed energy and protein. Feed demand from animals
must match feed supply from feed crops. The feed system uses CES functions for feed
composition and normalised quadratic functions for total feed demand.

**Key variables and parameters:**
- `v_feedQuant(i,r)` — feed demand for individual products
- `p_calContent(i,r)` — caloric content of feed products
- `pv_feedConv(i,r)` — feed conversion factors (endogenous during calibration)
- Feed energy balance (Eq. 5.68): total feed calories = total feed energy needed
- Feed categories: cereals, oilseed cakes, other feeds — aggregated via CES

**Diagnostic steps:**
1. Check feed balance equation infeasibility
2. Inspect animal production levels — large livestock expansion creates feed pressure
3. Verify feed conversion factors are within realistic ranges
4. Check if feed price `v_arm1Price` for feed products is driving demand to extremes

**Resolution:**
- Check minimum feed share constraints (`p_minFeedSharePerc`)
- Verify CES feed composition parameters
- Ensure feed energy balance equation is not over-constrained by minimum shares

### 2.3 Calibration parameter problems (PMP)

**Description:** CAPRI uses Positive Mathematical Programming (PMP) with quadratic cost
functions. The PMP terms (prefixed `PV_` for calibration parameters, `VP_` for calibration
variables) are critical for reproducing observed activity levels. Badly calibrated PMP terms
can cause infeasibilities in the supply model.

**Relevant prefixes:**
- `PV_` — parameters endogenous during calibration
- `VP_` — variables fixed during calibration
- `p_popGrowthRate`, `p_consTotal`, `p_consPCap` — demand-side parameters

**Key file:** `supply/margcr.gms` computes marginal cost and revenue decomposition.

**Diagnostic steps:**
1. Check PMP term magnitudes — very large terms indicate poor calibration
2. Use the dual analysis (Chapter 6.1 of CAPRI docs) to decompose activity changes
3. Inspect `margcr.gms` output for the specific region

**Resolution:**
- Re-examine the base year data for the problematic region
- Check if new policy instruments interact with PMP calibration
- Verify that the cost function slope was not varied too aggressively (sensitivity analysis
  uses +/- 50% variation)

---

## 3. Iteration failures

### 3.1 Price oscillation between supply and market

**Description:** The iterative solution method (Section 5.6.1) alternates between supply
models and the market model. In each iteration, the market model delivers prices and the
supply model returns quantities. The supply and feed demand functions in the market model
are re-calibrated each iteration by shifting constant terms (`as`, `af` in Eqs. 5.64, 5.67).

**Mechanism:**
1. Supply model solved at prices from last market model iteration
2. Supply/feed results aggregated to Member State level
3. Market model constant terms recalibrated to match supply model output
4. Market model solved, producing new prices
5. Premiums recalculated (ceilings, national envelopes) in `policy/premcut.gms`
6. Weighted average of prices across iterations used for dampening

**Symptoms:**
- Prices swing between high and low values across iterations
- Production quantities flip between two states
- Convergence criterion never met

**Key files:**
- `policy/premcut.gms` — premium adjustment between iterations
- `arm/market1.gms` — market model driver
- `arm/market_model.gms` — market model equations

**Diagnostic steps:**
1. Compare prices and quantities across iterations from the listing file
2. Check if supply elasticities in the market model match those from the programming model
3. Look for products where calibration constant shifts are very large
4. Check if premium ceiling adjustments create discontinuities

**Resolution:**
- Increase dampening in the price weighting across iterations
- Verify that supply elasticities are correctly passed and calibrated
- Check for premium ceiling interactions that create discontinuities
- For sugar sector: note special price linkage for ethanol beets vs sugar beets
  (independent proportional linkage)

### 3.2 Quantity divergence

**Description:** Instead of oscillating, quantities may drift monotonically away from
equilibrium. This occurs when the market model and supply model have incompatible
price-quantity relationships.

**Diagnostic steps:**
1. Plot quantity trajectories across iterations
2. Check if the "functional form" mismatch is causing systematic bias
3. Verify the NQ profit function parameters (`bs` slope terms) are calibrated correctly

**Resolution:**
- The bs parameters should capture own and cross-price effects consistent with profit
  maximisation. Check calibration in `arm/prep_market.gms`.
- Ensure the supply elasticity transfer from programming models is working correctly
- For young animals (traded only between European regions with supply models), verify
  separate calibration

### 3.3 Premium ceiling interactions

**Description:** Between iterations, premiums for activities are adjusted if national ceilings
are exceeded (`policy/premcut.gms`). Total premium units are summed across regions, and if
the ceiling is exceeded, the effective premium rate (PRME) is cut proportionally for the
next iteration.

**Key parameters:**
- `PRME` — effective premium rate per activity
- National ceiling parameters in `policy/policy_sets.gms`
- Premium scheme definitions including BPS convergence (`gams/scen/premiums/bps_convergence.gms`)

**Diagnostic steps:**
1. Check if PRME values are oscillating across iterations
2. Look for ceiling-binding situations where small production changes cause large premium cuts
3. Inspect coupled support schemes that may create step-function responses

**Resolution:**
- Add dampening to the premium adjustment between iterations
- Check if convergence mechanisms (internal/external BPS convergence) interact with ceilings
- Verify Austria vs Greece style convergence models are correctly specified

---

## 4. Solver-specific issues

### 4.1 CONOPT performance

**Description:** CAPRI uses CONOPT for the market model (~70,000 equations, ~750,000 in full
system). CONOPT uses a gradient approach that is particularly useful when the model is
infeasible, as it minimises the sum of infeasibilities.

**Pre-solve sequence (in `arm/simu_prestep.gms`):**
1. Single commodity models (grid solve, parallel)
2. Commodity groups (cereals, oilseeds, etc.) solved repeatedly with cross-price updates
3. Full system solve at the end
4. Heuristics track solve time and may skip stages

**Common CONOPT issues:**
- Near-singular Jacobian from poorly scaled variables
- Very large number of superbasic variables (from many nonlinear fudging functions)
- Slow convergence when many bounds are active

**Resolution:**
- Check variable scaling — prices in EUR/ton, quantities in 1000 tons
- Ensure the pre-solve sequence is completing (check listing for each stage)
- If single-commodity solves fail, the problem is isolated to that product market
- CONOPT's infeasibility minimisation provides dual values on bounds — use these to
  identify which bounds to widen

### 4.2 PATH solver for MCP formulations

**Description:** Some CAPRI extensions use mixed complementarity problem (MCP) formulations
solved with the PATH solver instead of CONOPT.

**Common PATH issues:**
- Lemke's algorithm failure with degenerate pivots
- Large complementarity gaps
- Different convergence properties than NLP solvers

**Resolution:**
- Check complementarity conditions are correctly specified
- Verify initial point is reasonable
- Consider warm-starting from a nearby solution

### 4.3 Scaling problems

**Description:** The CAPRI market model contains variables with very different magnitudes:
trade flows can range from 0.001 to 100,000 (1000 tons), prices from 50 to 5,000 (EUR/ton).

**Symptoms:**
- CONOPT reports "pivot too small" or "near-singular basis"
- Very slow progress in feasibility restoration
- Different results on different machines (noted in CAPRI docs Section 5.5)

**Diagnostic steps:**
1. Check variable ranges in the solution
2. Look for products with very small trade flows (< 1 unit = 1000 tons)
3. Inspect price levels for processed products vs primary commodities

**Resolution:**
- CAPRI normalises prices with a price index in behavioural equations to help scaling
- For biofuel supply, prices are divided by calibration-point costs (the `c` superscript
  in Eq. 5.100) to keep variables "around one"
- Check if new products or regions introduced abnormal scale

---

## 5. Scenario-specific failure patterns

### 5.1 Full trade liberalisation scenarios

**Typical failures:**
- Armington CES drives many trade flows to bounds when large tariffs are removed
- TRQ mechanisms become irrelevant but sigmoid functions may misbehave at extreme fill rates
- `arm/widen_bounds.gms` may need multiple passes

**Mitigation:**
- Consider staged tariff reduction (50%, then 100%)
- Pre-widen bounds for products with known high tariffs
- Check if modified Armington (`modArmington`) is active for zero-flow situations

### 5.2 Climate/yield shock scenarios

**Typical failures:**
- Large yield changes create supply-demand imbalances that stress the iteration
- Regional land balance violations when yields change asymmetrically
- Feed balance issues when crop yields change but livestock remains

**Mitigation:**
- Ensure yield shocks are within plausible ranges
- Check if `reports/yield_change_decomp` correctly handles the shock type
- Verify that the energy module (if activated) does not create additional constraints

### 5.3 Biofuel mandate scenarios

**Typical failures:**
- Biofuel demand share `bsh` exceeds `bshmax` bounds
- Feedstock CES cost aggregator produces extreme feedstock demands
- Processing margin `v_procMarg` becomes negative, collapsing biofuel supply

**Key parameters:**
- `bshmax` — maximum biofuel share (set 2% above baseline share)
- `bshq` — quota/mandate component of biofuel demand
- Sigmoid function parameters: X1, X2 for demand; beta1, beta2, delta1, delta2 for supply
- Substitution elasticity sigma in CES feedstock aggregator

**Files:**
- `biofuel/def_biofuel_params.gms` — calibration of biofuel supply and demand
- Biofuel products: BIOE (ethanol), BIOD (biodiesel)
- Feedstocks: wheat, barley, rye, oats, maize, other cereals, sugar, table wine (BIOFE)
- By-products: glycerine, DDGs, vinasses
- Second generation feedstocks: ARES (agricultural residues), NECR (new energy crops)

**Mitigation:**
- Check calibration point processing margins
- Verify sigmoid function calibration points (90% of bshmax at price ratio 0.5 for ethanol,
  0.3 for biodiesel)
- Ensure second generation (SECG) and non-agricultural (NAGR) paths are correctly specified

### 5.4 CAP reform scenarios

**Typical failures:**
- Premium ceiling oscillation when reforms change payment structures
- BPS convergence mechanism (internal/external) creates discontinuities
- Greening payment removal interacts with PMP terms (see Section 6.1.2 example)

**Key files:**
- `policy/premcut.gms` — premium ceiling adjustment
- `policy/policy_sets.gms` — policy instrument definitions, WTO boxes, PSE types
- `gams/scen/premiums/bps_convergence.gms` — BPS convergence options
- `define_eu_supports.gms` — logistic extrapolation of support levels

**Budget categories:**
- Green box, blue box, amber box (WTO classification)
- Pillar I and Pillar II (CAP classification)
- Financing rates for EU and national budgets

**Mitigation:**
- Verify that premium adjustments are dampened between iterations
- Check if convergence models (Austria linear vs Greece partial) are correctly parameterised
- Ensure `PRME` (effective premium) does not flip between iterations

---

## 6. Diagnostic checklist summary

When facing any CAPRI solve failure, run through this checklist:

1. **Model and solver status** — What are the exact codes?
2. **Which module failed?** — Market model, supply model, or iteration?
3. **Which equations are infeasible?** — Use listing file INFES column
4. **Which variables are at bounds?** — Query GDX for level = lower/upper with marginal != 0
5. **What changed?** — Compare scenario to baseline GDX for the failing variables
6. **Is the pre-solve sequence completing?** — Check `arm/simu_prestep.gms` progression
7. **Did bound widening run?** — Check `arm/widen_bounds.gms` in the listing
8. **Are iterations converging?** — Compare prices across iterations
9. **Are premiums stable?** — Check `policy/premcut.gms` adjustments
10. **Is the scenario plausible?** — Consider if the shock magnitude is within model validity
