---
name: capri-debug-solve
description: >
  Debug CAPRI model solve failures, infeasibilities, and convergence issues. Use this skill when the
  user encounters a solve failure, infeasibility, locally infeasible, model status error, solver status
  error, CONOPT failure, NLP error, unbounded variable, convergence failure, iteration divergence,
  bounds violation, solve error, or needs help debugging a GAMS model that won't solve. Also trigger
  when the user mentions market model infeasibility, supply-market iteration problems, Armington
  bound issues, TRQ switching failures, dampening parameters, or any CAPRI simulation that produces
  unexpected solver output.
---

# CAPRI Debug Solve Workflow

This skill provides a systematic workflow for diagnosing and resolving CAPRI model solve failures.
Follow these steps in order, using the GAMS IDE tools at each stage.

For the full failure pattern catalog with resolution steps, read `references/common-failures.md`
in this skill directory.

---

## Step 1: Check solve status

Use `chrispahm.gams-ide/gamsSolveStatus` on the listing file (.lst) to get the model status and solver status codes.

Key status codes to watch for:
- **Model status 5** = locally infeasible (most common in CAPRI market model)
- **Model status 4** = infeasible
- **Model status 6** = intermediate infeasible (solver ran out of iterations)
- **Model status 3** = unbounded
- **Solver status 2** = iteration limit reached
- **Solver status 4** = terminated by solver (numerical difficulty)

## Step 2: Identify problem symbols from listing

Use `chrispahm.gams-ide/gamsReadListing` to extract the EQUATION LISTING and VARIABLE LISTING sections from the
.lst file. Focus on:

- Equations with large infeasibilities (check the `INFES` column)
- Variables at their bounds (`.LO` or `.UP` values equal to `.L` values)
- Marginals with very large absolute values (indicates binding constraints)

For CAPRI market model failures, look specifically at:
- `importShares_` equations (Armington lower nest)
- `arm1PriceAgg_` / `arm2PriceAgg_` equations (price aggregators)
- `SupBalM_` equations (supply balance)
- `armBall_` equations (Armington top level balance)

## Step 3: Inspect symbol values

Use `chrispahm.gams-ide/gamsSymbolValues` to check levels and marginals of suspect variables:

- `v_tradeFlows` — are any bilateral flows at zero or at bounds?
- `v_arm1Price` / `v_arm2Price` — are price aggregates plausible?
- `v_marketPrice` — are market prices within expected ranges?
- `v_prodQuant` / `v_feedQuant` — are quantities positive and reasonable?
- `v_tarAdVal` / `v_tarSpec` — are TRQ tariff variables switching correctly?

## Step 4: Deep-dive GDX data

Use `chrispahm.gdx-viewer/gdx-symbols` to list all symbols in the result GDX. Then use `chrispahm.gdx-viewer/gdx-sql` to query specific
values that reveal the failure.

**Find variables stuck at bounds:**
```sql
SELECT * FROM read_gdx('__GDX_FILE__', 'v_tradeFlows')
WHERE level = lower OR level = upper
ORDER BY ABS(marginal) DESC
LIMIT 20
```

**Find large infeasibilities in Armington shares:**
```sql
SELECT * FROM read_gdx('__GDX_FILE__', 'v_tradeFlows')
WHERE level = 0 AND marginal <> 0
ORDER BY ABS(marginal) DESC
```

**Check price ratios driving CES substitution:**
```sql
SELECT a.uni_1 AS product, a.uni_2 AS region,
       a.level AS arm2Price, b.level AS marketPrice,
       CASE WHEN b.level > 0 THEN a.level / b.level ELSE NULL END AS ratio
FROM read_gdx('__GDX_FILE__', 'v_arm2Price') a
JOIN read_gdx('__GDX_FILE__', 'v_marketPrice') b
  ON a.uni_1 = b.uni_1 AND a.uni_2 = b.uni_2
WHERE CASE WHEN b.level > 0 THEN a.level / b.level ELSE 99 END > 3
   OR CASE WHEN b.level > 0 THEN a.level / b.level ELSE 0 END < 0.3
```

**Inspect TRQ fill rates and regime switching:**
```sql
SELECT * FROM read_gdx('__GDX_FILE__', 'v_tarAdVal')
WHERE marginal <> 0
ORDER BY ABS(marginal) DESC
```

**Check supply-demand balance residuals:**
```sql
SELECT * FROM read_gdx('__GDX_FILE__', 'v_domSales')
WHERE marginal <> 0 AND ABS(marginal) > 0.01
```

## Step 5: Show user the problem

Use `chrispahm.gdx-viewer/gdx-reveal` to open the GDX editor with filters highlighting problematic values. Apply
filters to focus on:
- Variables at bounds with nonzero marginals
- Equations with infeasibilities above tolerance
- The specific product/region combinations identified in previous steps

## Step 6: Trace dependencies

Use `chrispahm.gams-ide/gamsReferenceTree` to find what equations and assignments affect the failing variable.
Trace upstream to find the root cause — often a policy parameter, tariff change, or price
shock that propagates through the Armington system.

## Step 7: Check model structure

Use `chrispahm.gams-ide/gamsModelStructure` to locate the failing module in the CAPRI code. Key files:
- `arm/market_model.gms` — market model definition
- `arm/market1.gms` — market model driver
- `arm/simu_prestep.gms` — pre-solve sequence (single commodity, then groups, then full)
- `arm/widen_bounds.gms` — bound widening after infeasibility
- `arm/prep_market.gms` — market calibration and initialization
- `arm/modArmington.gms` — modified Armington calibration
- `supply/margcr.gms` — marginal cost/revenue decomposition

---

## Common failure patterns and resolution

### 1. CES functions driving trade flows to bounds

**Symptom:** Model status 5, `importShares_` equations infeasible, `v_tradeFlows` at lower
bounds with nonzero marginals.

**Cause:** Large price shocks (e.g., removing high tariffs) cause the CES Armington aggregator
to push trade shares toward extreme values. The substitution elasticity (sigma = 8-10 for most
products) amplifies price ratio changes exponentially.

**Resolution:**
- Check if `arm/widen_bounds.gms` ran — it inspects dual values on bounds and expands stepwise
- If bounds were already widened, check if the price shock is realistic
- Consider reducing the substitution elasticity for the affected product group
- Verify initial trade flow levels are not near-zero (zero-flow calibration issue)

### 2. TRQ regime switching failures

**Symptom:** Solver oscillates, tariff variables jump between in-quota and MFN rates.

**Cause:** The sigmoid function approximating the TRQ kink may be too steep, causing
numerical difficulties. Fill rate hovers near quota threshold.

**Resolution:**
- Check the sigmoid slope parameter in the TRQ implementation
- Inspect `v_tarAdVal` and `v_tarSpec` for erratic switching
- Consider smoothing the TRQ function or adjusting the quota level

### 3. Supply-market iteration divergence

**Symptom:** Prices oscillate between iterations, no convergence after maximum iterations.

**Cause:** Supply elasticities in regional programming models differ substantially from market
model calibration, or large structural breaks in policy create discontinuities.

**Resolution:**
- Check that weighted average of prices across iterations is applied (dampening)
- Verify supply elasticities are being passed correctly from supply to market model
- Look at `p_cnstLandSpply`, `p_cnstLandElas` for land supply calibration
- Consider increasing the number of iterations or adjusting dampening weights

### 4. CONOPT numerical difficulties

**Symptom:** Solver status 4, slow convergence, many superbasic variables.

**Cause:** Poorly scaled variables, near-singular Jacobian, or fudging functions activated.

**Resolution:**
- Check variable magnitude differences (scaling); verify pre-solve sequence in `arm/simu_prestep.gms`
- The fudging function ensuring positive quantities is highly non-linear — check if triggered

### 5. Biofuel market interaction failures

**Symptom:** Infeasibility in biofuel processing or feedstock demand equations.

**Resolution:**
- Check processing margins `v_procMarg` (negative = collapsed biofuel supply)
- Inspect sigmoid parameters (beta1, beta2, delta1, delta2) and demand share bounds `bshmax`

---

## Quick diagnostic queries

**Variables at bounds:** `SELECT * FROM read_gdx('__GDX_FILE__', 'v_tradeFlows') WHERE (level <= lower + 0.001 OR level >= upper - 0.001) AND marginal <> 0 ORDER BY ABS(marginal) DESC LIMIT 20`

**Worst infeasibilities:** `SELECT * FROM read_gdx('__GDX_FILE__', 'v_marketPrice') WHERE ABS(marginal) > 1 ORDER BY ABS(marginal) DESC LIMIT 10`
