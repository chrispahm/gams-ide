# CAPRI Policy Instruments: Detailed Parameter and Equation Reference

This file provides the detailed parameter names, equation structures, set elements, and file
locations for all policy instruments modelled in CAPRI.

---

## 1. Premium data structures

### Core parameters

| Parameter | Description |
|-----------|-------------|
| `p_premDataE(MS,SIMY,scheme,attr)` | Premium data edited in policy files |
| `p_couplPercent_E(MS,scheme)` | Coupling percentage retained per MS and scheme |
| `p_premToDDTarget_E(MS,scheme,DDscheme)` | Distribution shares from old to new MTR schemes |
| `p_technFact(rs,MPACT,psdpay,tech)` | Technology modification factor for premiums |
| `p_budToPsdpay` | Distribution key mapping budget categories to premium types |

### Premium attributes (on `p_premDataE`)

| Attribute | Meaning |
|-----------|---------|
| `PRMR` | Regulation premium rate (uncut maximum per regulatory text) |
| `PRMD` | Declared premium per activity unit (ha, head, 1000 heads) |
| `PRME` | Effective premium (after ceiling cuts) |
| `APPTYPE` | Application type defining the criterion for payment |
| `CEILVAL` | Value ceiling (total EUR budget for the scheme) |
| `CEILLEV` | Level ceiling (maximum number of premium units) |

### Premium modification factor

`Ap_premModfFactT` maps the application type to a per-activity modification factor. The declared
premium is: `PRMD = PRMR * Ap_premModfFactT`. For slaughter premiums, this incorporates
slaughter frequency (e.g. 1/year for male beef cattle, ~1/5 years for dairy cows).

### Premium flow: regulation to effective

```
PRMR (legal text rate)
  -> Ap_premModfFactT (application type mapping)
    -> PRMD (declared per ha/head)
      -> cutFactor (from premcut.gms, ceiling enforcement)
        -> PRME (effective, enters objective function)
```

---

## 2. Pillar I premium schemes

### Activity groups (defined in `policy/policy_sets.gms`)

| Group | Activities covered |
|-------|-------------------|
| `PGARAB` | Arable crops eligible for BPS/SPS |
| `PGGRAS` | Grassland eligible for BPS/SPS |
| `PGMEAT` | Dairy cows, suckler cows, male adult cattle, fattened heifers |
| `pgsaps` | All activities eligible for SAPS/BPS |

### Key Pillar I schemes in CAPRI

| Scheme code | Description |
|-------------|-------------|
| `DPREG` | Regional implementation of SFP (flat rate per BPS-region) |
| `DPHIS` | Historic implementation of SFP |
| `DPGREEN` | Greening top-up payment (30% of Pillar I envelope) |
| `DPMTR` | Overall MTR/Pillar I envelope |
| `dp_bps` | Basic Payment Scheme (post-2014) |

### BPS convergence parameters

| Parameter | Description |
|-----------|-------------|
| `p_bps_convergence_option` | Linear, tunnel, or 30% rule |
| `p_bps_convergence_year` | Year by which convergence is complete |
| `p_bps_tunnel_lower_limit` | Share of average below which convergence applies |
| `p_bps_tunnel_gap_closure` | Fraction of gap to lower limit that is closed |

### National ceiling

Overall Pillar I budget envelope per MS per year:
`p_premDataE(MS, SIMY, "DPMTR", "CEILVAL")` in `pol_input/mtr_hc.gms`.

---

## 3. Pillar II schemes

### Schemes and measure codes

| Scheme | Measure codes | File |
|--------|--------------|------|
| LFA | 211-212 | `policy/rd_logic.gms` |
| Natura 2000 | 213, 224 | `policy/rd_logic.gms` |
| Agri-environment | 214-215 | `policy/rd_logic.gms` |
| Young farmers | - | base scenario file |
| First hectares | - | base scenario file |
| ANC (areas with natural constraints) | - | base scenario file |

### LFA premium equation

```
P(i,j) = A * S(i,j)

where:
  P = premium per ha in region i for crop group j
  A = maximum amount per ha (250 EUR for mountainous LFA)
  S = share of LFA in all land of class j in region i (from CLUE model)
```

### Agri-environmental payment distribution

```
Payment rate(region) ~ sum over land_class(
    p_landPartition(region, landClass, "LFA")
    * p_aeLfa(MS, tf8)
)
```

Where:
- `p_landPartition(ru, lcAgri, "LFA")`: share of each land class that is LFA (from DYNA-CLUE).
- `p_aeLfa(ms, tf8)`: probability of a farm of type tf8 having AE support conditional on
  LFA status (from FADN).

### Technology variant premium modification

In `rd_logic.gms`:
```gams
p_technFact(rs, MPACT, psdpay_ae, "T2") = +0.5;   $ extensive: 150% of nominal rate
p_technFact(rs, MPACT, psdpay_ae, "T1") = -0.5;   $ intensive:  50% of nominal rate
```

### FADN farm type to CAPRI activity group mapping

| TF8 | CAPRI group |
|-----|-------------|
| 1 | Grandes Cultures |
| 2 | Vegetables |
| 3 | Wine |
| 4 | Permanent crops |
| 5 | Dairy cows including pastures |
| 6 | Suckler cows, sheep, goats including pastures |
| 7 | Pigs and poultry |
| 8 | All agricultural activities |

---

## 4. Greening implementation details

### Configuration file

`gams/scen/premiums/greening/cap_2013_2020_greening.gms`

### Key settings

| Setting | Default | Description |
|---------|---------|-------------|
| Greening share of Pillar I | 30% | Share of national envelope for `DPGREEN` |
| Permanent grassland ratio | active | Grass/arable ratio cannot decline vs base year |
| Crop diversity | active | Minimum measure of diversity maintained |
| Ecological set-aside rate | 5% | `$setglobal greening_setasiderate 5` |

### Constraint activation

Greening restrictions are implemented as constraints in the supply models. Logic is activated
in `policy/define_greening_limits.gms`. Eligible activities for ecological set-aside are defined
by parameter definitions in the greening configuration file.

---

## 5. Trade policy equations (market model)

All equations are in `arm/market_model.gms`.

### Import price equation

```
impp(i,r,r1) = [v_marketPrice(i,r1) * p_exchgRateChangeFaktor(r,r1)
                 - expsub(i,r1) + v_transpCost(i,r,r1)]
                * (1 + v_tarAdVal(i,r,r1)/100)
                + v_tarSpec(i,r,r1)
                + DiffLevies(i,r,r1)
```

### TRQ fill rate (global)

The fill rate sums all imports that are:
- Not under duty-free/quota-free access (`p_doubleZero`)
- Not from the same trade block
- Not prohibited

For bilateral quotas, only quantities beyond the allocated quota enter the global TRQ.

### TRQ tariff determination (sigmoid smoothing)

The applied tariff transitions between in-quota and MFN rates using a sigmoid function of the
fill rate. This replaces the non-differentiable kink at the quota boundary.

Decision tree for tariff computation:
1. Duty-free/quota-free access? -> tariff = 0
2. Bilateral TRQ exists?
   - Underfill -> in-quota rate
   - Binding -> in-quota + endogenous quota rent
   - Overfill -> check global TRQ (step 3) or MFN
3. Global TRQ exists?
   - Underfill -> in-quota rate
   - Binding -> in-quota + endogenous quota rent
   - Overfill -> MFN rate
4. Minimum border price check on all specific tariffs

### Flexible levy equation (EU cereals)

```
v_flexLevy(i,r) = min[v_tarSpec(i,r), max(0, minBordP(i,r) - cif(i,r))]
```

Implemented with fudging functions for differentiability. The tariff adjusts between zero and
the bound MFN rate depending on the gap between the CIF price and the minimum border price
(155% of the intervention price for wheat).

### Entry price system (fruits and vegetables)

```
gap = (0.96 * entryPrice - cif) / triggerPrice * easeFactor
appliedTariff = sigmoid(gap) * maxTariffAdjustment
```

Encourages import prices to land between 92-98% of the trigger price.

### Subsidised exports equation

```
expsVal(i,r) = QutE(i,r) * sigmoid(alpha(i,r)/PADM(i,r)
               * (v_marketPrices(i,r) - beta * PADM(i)))
```

Where `QutE` = WTO commitment quantity, `PADM` = administrative price. Per-unit subsidy:
```
expSub(i,r) = 1000 * expsVal(i,r) / v_nonDoubleZeroExports(i,r)
```

### Endogenous intervention stocks

Purchases:
```
v_buyingToIntervStocks(i,r) = INTM(i,r)
    * errf((padm(i,r) - v_marketPrice(i,r) + gamma_p(i,r)) / stddev(i,r))
```

Releases:
```
intd(i,r) = (intk(i,r) + intp(i,r))
    * errf((uvae(i,r) - pmrk(i,r) + gamma_p(i,r)) / stddev(i,r))
```

Stock change: `ints(i,r) = intp(i,r) - intd(i,r)`

---

## 6. Producer/consumer price linkage

### Producer prices

```
v_prodPrice(i,r) = [v_marketPrice(i,r) + PSEd(i,r) + PSEi(i,r)] * Pmrg(i,r)
```

Currently PSE data are not entered (all zero) except:
- Carbon price scenarios use negative `PSEi` for indirect support.
- Swiss agricultural policies use land subsidies via PSE entries.

For EU regions, premiums are modelled in detail in the supply model and not as PSE price wedges.

### Consumer prices

```
v_consPrice(i,r) = v_arm1Price(i,r) - CSEd(i,r) - CSEi(i,r) + cmrg(i,r)
```

Where `cmrg` covers transport, processing, and marketing costs.

---

## 7. WTO box and PSE-type assignments

Defined in `policy/policy_sets.gms`.

### Green box payments

Decoupled payments: BPS, SPS, SAPS, LFA, agri-environment, Natura 2000, young farmers,
first hectares, ANC.

### Blue box payments

Payments under supply control or with defined upper limits. Includes certain coupled payments
under production quotas.

### Amber box

Remaining coupled support not meeting green or blue box criteria (e.g. certain Norwegian
schemes).

### Budget categories (from `sets.gms` and `policy/policy_sets.gms`)

Reported in `reports/feoga.gms`:
1. Premiums aggregated per activity from actual schemes using `PRME` and `p_budToPsdpay`.
2. Assigned to product outputs for PSE/WTO product-based accounting.
3. Set-aside payments allocated to activities via set-aside rates.

---

## 8. Key file locations summary

| File | Purpose |
|------|---------|
| `gams/pol_input/mtr_until2013.gms` | Pre-2014 MTR policy definitions |
| `gams/pol_input/mtr_hc.gms` | Health check policy definitions and national ceilings |
| `gams/pol_input/cap_after_2014/ref.gms` | CAP 2014-2020 reference policy |
| `gams/scen/base_scenarios/cap_2014_2020.gms` | Base scenario with BPS budgets |
| `gams/scen/premiums/bps_convergence.gms` | BPS convergence options per MS |
| `gams/scen/premiums/coupling/cap_2013_2020_vcs.gms` | Voluntary coupled support |
| `gams/scen/premiums/greening/cap_2013_2020_greening.gms` | Greening configuration |
| `gams/policy/policy_sets.gms` | All premium scheme declarations, WTO/PSE mappings |
| `gams/policy/policy.gms` | Hierarchical mapping and PRMD calculation |
| `gams/policy/premcut.gms` | Iterative ceiling enforcement (cut factors) |
| `gams/policy/calc_mtr.gms` | MTR budget envelop calculations |
| `gams/policy/calc_mtr_top.gms` | Historic premium totals for MTR calculation |
| `gams/policy/implement_bps.gms` | BPS convergence logic |
| `gams/policy/define_greening_limits.gms` | Greening constraint definitions |
| `gams/policy/rd_logic.gms` | Pillar II measure implementation |
| `gams/policy/prem_entl_trade.gms` | Entitlement trade module |
| `gams/capmod/set_global_variables.gms` | Global switches (e.g. entitlement trade on/off) |
| `arm/market_model.gms` | Market model equation definitions |
| `supply/margcr.gms` | Dual analysis (marginal costs and revenues) |
| `reports/feoga.gms` | Budget/WTO/PSE reporting |
| `reports/welfare.gms` | Welfare analysis (equivalent variation, producer surplus) |
| `reports/yield_change_decomp/` | Yield and income decomposition |

---

## 9. Welfare and post-model analysis

### Dual analysis (`supply/margcr.gms`)

Decomposes first-order condition changes between reference and scenario:
```
dL/dx_i = df/dx_i - lambda_land * dg_land/dx_i
          - lambda_fodder * dg_fodder/dx_i
          - lambda_young_animals * dg_ya/dx_i
          + pi_i = 0
```

Each term is computed for both simulations; their differences sum to zero and indicate the
contribution of each factor (marginal profit change, land rent change, fodder cost change, etc.)
to the observed activity level change.

### Welfare analysis (`reports/welfare.gms`)

- **Consumer welfare**: money metric / equivalent variation using the Generalised Leontief
  expenditure function.
- **Producer welfare (non-EU)**: from normalised quadratic profit function.
- **Producer welfare (EU)**: GVA plus premiums (revenues minus intermediate input costs plus
  subsidies).
- **Taxpayer welfare**: tariff revenues, TRQ rent allocation, export subsidy costs, CAP budget
  (differentiated by EU/national, Pillar I/II co-financing rates).
- **Land owner welfare**: opportunity cost of non-agricultural land use deducted to avoid bias
  in scenarios involving land supply changes.

### Income decomposition (`reports/yield_change_decomp/`)

Decomposes changes in aggregate yields and income indicators into:
- Effect of endogenous I/O coefficients (yield adjustment)
- Effect of technology shares (low/high yield variant shifts)
- Effect of prices
- Effect of regional composition
- Residual (cross-effects, premium changes)
