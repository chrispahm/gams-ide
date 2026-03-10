---
name: capri-market-module
description: >
  Comprehensive reference and workflow skill for the CAPRI market module (global partial
  equilibrium trade model). Trigger when the user asks about trade modeling, Armington
  assumption, CES functions, substitution elasticities, welfare analysis, market clearing,
  bilateral trade flows, import demand, export supply, price linkage equations, biofuel
  module, TRQ (tariff rate quota), tariff modeling, market model solving, global trade,
  Armington aggregator, price transmission, feed demand in market model, processing
  industry equations, oilseed crushing, dairy processing, intervention stocks, subsidised
  exports, market equilibrium, or debugging infeasibilities in the CAPRI market module.
---

# CAPRI Market Module

The CAPRI market module is a comparative-static, deterministic, partial, spatial, global
equilibrium model for about 65 agricultural commodities traded between 44 trade blocks
(derived from ~80 countries with behavioural functions). The full system comprises about
70,000 endogenous variables and equations.

For the detailed Armington equations, TRQ structure, welfare methodology, and market
clearing conditions, see `references/armington.md` in this skill directory.

---

## Key files in the CAPRI source tree

| File | Purpose |
|------|---------|
| `arm/market_model.gms` | Main market model definition (equations + variables) |
| `arm/market1.gms` | Top-level market module driver, includes calibration |
| `arm/simu_prestep.gms` | Pre-solve sequence: single-commodity then clustered solves |
| `arm/widen_bounds.gms` | Automatic bound widening when infeasibilities occur |
| `arm/cal_armington.gms` | Calibration of CES share/shift parameters |
| `arm/modArmington.gms` | Modified (non-homothetic) Armington calibration |
| `arm/prep_market.gms` | Prepare and test market model calibration at trend values |
| `arm/data_cal.gms` | Market model data calibration |
| `arm_sets.gms` | Sets specific to the market model (trade blocks, products) |
| `biofuel_markets.gms` | Biofuel market balances for non-EU regions |
| `biofuel/def_biofuel_params.gms` | Biofuel supply/demand calibration |
| `reports/welfare.gms` | Welfare calculations (equivalent variation, GVA, profits) |

---

## Armington trade structure (summary)

Two-stage CES system linking regional markets via bilateral trade flows:

1. **Top level (stage 1):** composition of demand from domestic sales vs. import aggregate.
   Substitution elasticities are lower (e.g. 2 for cheese, 8 for most products).
2. **Lower level (stage 2):** allocation of imports across origins.
   Substitution elasticities are higher (e.g. 4 for cheese, 10 for most products).

Price aggregators (dual representation) are used in the code rather than primal quantity
aggregators, as the dual form is numerically more stable.

CES share parameters `delta` are calibrated to observed trade flows; shift parameter `alpha`
is absorbed into `delta` in the implementation. Zero flows remain zero unless the modified
Armington approach (Witzke et al. 2005) with commitment parameter `mu` is activated.

---

## Behavioural functions

- **Supply:** normalised quadratic profit function; `v_prodQuant` depends on `v_prodPrice`
  normalised by a price index. Slope terms `bs` from supply elasticities; constants `as`
  re-calibrated each iteration to match supply model results.
- **Feed demand:** same NQ structure but driven by `v_arm1Price`; includes feed energy
  balance linking feed quantities to animal production via `pv_feedConv`.
- **Final demand:** Generalised Leontief expenditure system (Ryan & Wales 1996) with
  commitment terms `d`, symmetric `bd` matrix. Guarantees adding-up, homogeneity,
  correct curvature. Consumer prices derived from `v_arm1Price` plus margins.
- **Processing (oilseeds):** NQ profit function on processing margins; fixed I/O crushing
  coefficients with CES-based slight adjustment of oil/cake shares.
- **Processing (dairy):** fat/protein balancing; NQ function driven by margin between
  dairy product price and fat/protein content value.

---

## Solver strategy

1. **Single-commodity pre-solves** (`arm/simu_prestep.gms`): fix cross-price variables,
   solve each commodity independently using GAMS grid-solve (parallel). Repeat several
   rounds updating cross-prices.
2. **Commodity group clustering**: solve groups with strong cross-price links together
   (e.g. all cereals, all oilseeds). Repeat with updated cross-prices.
3. **Full system solve**: solve all ~70,000 equations with CONOPT.
4. **Bound widening** (`arm/widen_bounds.gms`): if infeasible, inspect dual values on
   bounds, widen those with shadow values, re-solve.

---

## Welfare analysis

- **Consumer welfare:** equivalent variation from Generalised Leontief expenditure function.
- **Producer welfare:** change in normalised quadratic profit function value (non-EU);
  GVA + premiums for EU regions (from supply model).
- **Dairy/processing/feed industry:** analogous NQ-based welfare with margins as prices.
- **Taxpayer welfare:** tariff revenues, TRQ rent allocation, domestic support outlays.
- **Land owner rent:** from land supply curve specification.

Computed in `reports/welfare.gms`.

---

## Debugging market module issues (workflow)

When the market model produces unexpected results, infeasibilities, or solver failures,
follow this diagnostic sequence using GAMS IDE tools:

### Step 1: Check solver status
Use `chrispahm.gams-ide/gamsSolveStatus` to inspect model and solver return codes. Key statuses:
- Model status 1 = optimal, 4 = infeasible, 5 = locally infeasible
- Solver status 1 = normal completion

### Step 2: Query result GDX for market conditions
Use `chrispahm.gdx-viewer/gdx-sql` to run analytical queries on the result GDX file.

**Market clearing check** -- find products/regions with large imbalances:
```sql
SELECT regions, products, value
FROM v_arm1Quant
WHERE ABS(value) > 0.01
ORDER BY ABS(value) DESC
LIMIT 20
```

**Inspect bilateral trade flows:**
```sql
SELECT r_from, r_to, value
FROM v_tradeFlows
WHERE products = 'SWHE'
ORDER BY value DESC
LIMIT 30
```

**Check price levels and transmission:**
```sql
SELECT regions, value AS market_price
FROM v_marketPrice
WHERE products = 'BEEF'
ORDER BY value
```

**Compare Armington price aggregates:**
```sql
SELECT regions, value AS arm1_price
FROM v_arm1Price
WHERE products = 'PORK'
ORDER BY value DESC
```

**TRQ fill rates:**
```sql
SELECT regions, products, value AS fill_rate
FROM v_trqFillRate
WHERE value > 0.8
ORDER BY value DESC
```

### Step 3: Explore affected dimensions
Use `chrispahm.gdx-viewer/gdx-domain` to discover which regions and products are in the result GDX and
understand the set structure (RM vs RMS, trade block membership).

### Step 4: Visualise problematic data
Use `chrispahm.gdx-viewer/gdx-reveal` to open the GDX editor and show the user specific trade flows, prices,
or quantities that appear anomalous.

### Step 5: Trace equation dependencies
Use `chrispahm.gams-ide/gamsReferenceTree` to follow how a price variable (e.g. `v_marketPrice`) feeds into
import price equations, Armington aggregators, and back into behavioural functions.
Typical chains:
- `v_marketPrice` -> `impp` (import price) -> `v_arm2Price` -> `v_arm1Price` -> `v_consPrice`
- `v_prodPrice` -> supply/feed equations -> `v_prodQuant`/`v_feedQuant` -> market balance

### Step 6: Examine solver listing
Use `chrispahm.gams-ide/gamsReadListing` to inspect the listing file for specific equation blocks
(e.g. `SupBalM_`, `armBall_`, `importShares_`) and identify which rows have large
infeasibilities or marginals.

---

## Common issues and solutions

| Symptom | Likely cause | Action |
|---------|-------------|--------|
| Infeasible after tariff removal | CES drives trade flows to lower bounds | Check `arm/widen_bounds.gms` ran; inspect bound duals |
| Price explosion in one region | Missing or zero supply response | Check `bs` slope terms and supply elasticities |
| Iteration non-convergence | Supply model and market model diverge | Check constant term re-calibration; examine price dampening weights |
| Biofuel prices unrealistic | Sigmoid supply function parameters | Check `biofuel/def_biofuel_params.gms` calibration |
| TRQ regime switching noise | Sigmoid approximation too steep/flat | Inspect TRQ fill rate and sigmoid parameters |
