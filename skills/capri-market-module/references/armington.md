# CAPRI Market Module: Armington Trade Model and Detailed Reference

This document provides the detailed equation structure, parameter names, set conventions,
and file locations for the CAPRI market module. It covers the two-stage Armington system,
market clearing, price transmission, TRQs, biofuel integration, and welfare methodology.

---

## 1. Sets and regional structure

The market module operates on two levels of regional aggregation:

- **RMS** (~80 regions): countries or country aggregates with full behavioural function
  systems (supply, demand, feed, processing). Includes all EU Member States individually.
- **RM** (44 trade blocks): regions for bilateral trade modelling. Some RMS regions are
  aggregated (e.g. EU_WEST, EU_EAST, Western Balkans, Mediterranean countries).
  Uniform border protection within each trade block.

Key sets defined in `arm_sets.gms`:
- Product sets: ~65 commodities covering food and feed products plus young animals
- Trade policy sets: TRQ types (bilateral, erga omnes), tariff instruments
- Biofuel sets: BIOE (ethanol), BIOD (biodiesel), feedstock sets, by-product sets

EU Member States have their own behavioural functions within EU_WEST/EU_EAST trade
blocks. Price linkage between MS and EU pool uses proportional relative changes.

---

## 2. Two-stage Armington system

### 2.1 CES utility function (lower nest -- import source allocation)

The composition of imports by origin is determined by CES utility maximisation:

```
U(i,r) = alpha(i,r) * [ SUM(r1, delta(i,r,r1) * M(i,r,r1)^rho(r,i)) ]^(1/rho(r,i))
```

Where:
- `U(i,r)` = utility (quantity aggregator) for product `i` in importing region `r`
- `M(i,r,r1)` = import quantity from origin `r1` (domestic sales when `r1 = r`)
- `delta(i,r,r1)` = share parameters (calibrated to observed flows)
- `alpha(i,r)` = shift parameter (absorbed into delta in code)
- `rho(r,i)` = substitution parameter; `sigma = 1/(1+rho)` is the elasticity

### 2.2 Import share equations (importShares_)

First-order conditions yield bilateral import shares (equation 5.84 / 5.97):

```
v_tradeFlows(i,r,r1) / v_tradeFlows(i,r,r2)
    = [ dp(i,r,r1) / dp(i,r,r2) ]
    * [ impp(i,r,r2) / impp(i,r,r1) ]^(1/(1+phi2))
```

The code uses the dual (price aggregator) representation rather than primal quantity
aggregators, as it is numerically more stable.

### 2.3 Top level (stage 1): domestic vs. imports

Determines the split between domestic sales `v_domSales` and the import aggregate
`v_arm2Quant` (equation 5.96):

```
v_arm2Quant(i,r) / v_domSales(i,r)
    = [ dp(i,r,w,r) / dp(i,r,r) ]
    * [ v_marketPrice(i,r) / v_arm2Price(i,r) ]^(1/(1+phi1))
```

Top-level substitution elasticities are **lower** than second-stage (consumers substitute
less between domestic and imported goods than between different import origins).

### 2.4 Substitution elasticities

| Product group | Stage 1 (domestic vs imports) | Stage 2 (between imports) |
|--------------|-------------------------------|---------------------------|
| Cheese, fresh milk products | 2 | 4 |
| Other vegetables | 1.5 | 1.5 |
| Other fruits | 3 | 3 |
| Sugar | 12 | 12 |
| All other products | 8 | 10 |

Special settings: rice/EU15 = 2; Japan = 2.5/5.
Range for sensitivity analysis: +/- 50% of standard values (i.e. 2 to 10 base range).

---

## 3. Price aggregators (dual Armington representation)

### 3.1 Second-stage price aggregate (arm2PriceAgg_)

Equation 5.91 -- CES price index over import origins:

```
v_arm2Price(i,r) = [ SUM(r1, delta(i,r,r1)^sigma2
                     * v_impPrice(i,r,r1)^(1-sigma2)) ]^(1/(1-sigma2))
```

Variable: `v_arm2Price` (average import price from Armington second stage)

### 3.2 First-stage price aggregate (arm1PriceAgg_)

Equation 5.92 -- CES price index over domestic and import aggregate:

```
v_arm1Price(i,r) = [ SUM(D in {M,S}, delta(r,i)^sigma1
                     * P(i,r,D)^(1-sigma1)) ]^(1/(1-sigma1))
```

Where `P(i,r,M) = v_arm2Price(i,r)` and `P(i,r,S) = v_marketPrice(i,r)`.

Variable: `v_arm1Price` (composite good price entering consumer/feed demand)

---

## 4. Price linkage equations

### 4.1 Import prices (equation 5.89)

```
impp(i,r,r1) = [ v_marketPrice(i,r1) * p_exchgRateChangeFaktor(r,r1)
                 - expsub(i,r1) + v_transpCost(i,r,r1) ]
               * (1 + v_tarAdVal(i,r,r1)/100)
               + v_tarSpec(i,r,r1) + DiffLevies(i,r,r1)
```

Bilateral tariffs may be endogenous (under TRQ). Exchange rate changes are exogenous.

### 4.2 Producer prices (equation 5.90)

```
v_prodPrice(i,r) = [ v_marketPrice(i,r) + PSEd(i,r) + PSEi(i,r) ] * Pmrg(i,r)
```

`Pmrg` calibrated to recover observed producer prices. PSE data currently zero except
for carbon price scenarios (negative PSEi) and Swiss land subsidies.

### 4.3 Consumer prices (equation 5.93)

```
v_consPrice(i,r) = v_arm1Price(i,r) - CSEd(i,r) - CSEi(i,r) + cmrg(i,r)
```

`cmrg` = fixed margin covering transport, processing, and marketing costs.

### 4.4 Unit value exports (equation 5.94)

```
v_unitValueExports(i,r) = SUM(r1!=r, (pmrk(i,r1) - tariffs(i,r,r1))
                          / (1 - tariffAd(i,r,r1)) * v_tradeFlows(i,r,r1))
                          / v_nonDoubleZeroExports(i,r)
```

### 4.5 Export subsidies (equation 5.95)

```
expsub(i,r) = [ exps(i,r) / exports(i,r) ]
              * (pmrk(i,r) - uvae(i,r) + cexps(i,r))
```

---

## 5. Market clearing conditions

### 5.1 Supply balance (SupBalM_, equation 5.85)

```
v_domSales(i,r) = v_prodQuant(i,r) - v_expQuant(i,r) + v_intervStockChange(i,r)
```

### 5.2 Import/export aggregation (impQuant_, expQuant_, equations 5.86-5.87)

```
v_impQuant(i,r) = SUM(r1 != r, v_tradeFlows(i,r,r1))
v_expQuant(i,r) = SUM(r1 != r, v_tradeFlows(i,r1,r))
```

### 5.3 Armington balance (armBall_, equation 5.88)

```
v_arm1Quant(i,r) = v_feedQuant(i,r) + v_consQuant(i,r)
                   + v_procQuant(i,r) + v_biofprocQuant(i,r)
```

For trade blocks comprising several countries, the RHS quantities are aggregated over
individual countries.

---

## 6. Behavioural equations

### 6.1 Supply (equation 5.64)

```
v_prodQuant(i,r) = as(i,r) + SUM(j, bs(i,j,r) * v_prodPrice(j,r) / p_index(r))
```

- `as` = constant (re-calibrated each iteration to match supply model)
- `bs` = slope matrix (from supply elasticities, profit-maximisation consistent)
- Fudging function applied to ensure strictly positive quantities

### 6.2 Feed demand (equation 5.67)

```
v_feedQuant(i,r) = af(i,r) + SUM(j, bf(i,j,r) * v_arm1Price(j,r) / p_index(r))
```

Feed energy balance (equation 5.68):
```
SUM(i, v_feedQuant(i,r) * p_calContent(i,r))
    = SUM(i, v_prodQuant(i,r) * pv_feedConv(i,r))
```

For EU MS with supply models: CES composition within feed categories; total category
demand driven by average ingredient price.

### 6.3 Final demand -- Generalised Leontief (equations 5.69-5.76)

Indirect utility: `U(cpri, y) = -G / (y - F)` where
`F = SUM(i, d(i)*cpri(i))` (committed expenditure) and
`G = SUM(i,j, bd(i,j)*sqrt(cpri(i)*cpri(j)))` (GL function, symmetric `bd`, non-negative off-diagonal).

Per capita demands: `PerCap(i) = d(i) + G_i*(y-F)/G`
where `G_i = SUM(j, bd(i,j)*sqrt(cpri(j)/cpri(i)))`.
Total: `hcom(i,r) = pop(r) * PerCap(i,r)`.

### 6.4 Processing -- oilseeds (equations 5.77-5.80)

NQ profit function on processing margins. Oilseed margin:
`v_prodMarg(seed,r) = -v_arm1Price(seed,r) + v_prodPrice(cake,r)*v_procYield(cake,r) + v_prodPrice(oil,r)*v_procYield(oil,r)`.
Processing yields from base year with CES adjustment for oil/cake share response.

### 6.5 Processing -- dairy (equations 5.81-5.82)

Fat/protein balance: `v_prodQuant("milk",r)*cont("milk",fp) = SUM(mlk, v_prodQuant(mlk,r)*cont(mlk,fp))`.
Output driven by margin over fat/protein value content.

### 6.6 Land market (equations 5.65-5.66)

`v_prodQuant(r,"Land") = p_cnstLandSpply(r) + p_cnstLandElas(r)*log(v_prodPrice(r,"Land"))`.
Land price clears the balance. Elasticities similar to GTAP (rather inelastic).

---

## 7. Tariff Rate Quotas (TRQs)

### 7.1 TRQ types

- **Bilateral TRQs:** allocated to specific trading partners; filled first
- **Erga omnes (global) TRQs:** open to all importers; residual access after bilateral

### 7.2 TRQ regimes

1. **Underfill:** in-quota tariff applied; price = border price + in-quota tariff
2. **Binding:** in-quota tariff + endogenous quota rent; rent shared among agents
3. **Overfill:** MFN tariff applied; quota rent = MFN rate - in-quota rate

### 7.3 Implementation

Sigmoid function approximates the kinked tariff-import relationship (not differentiable):
```
Sigmoid(x) = exp(min(x,0)) / (1 + exp(-abs(x)))
```

Fill rate for global TRQs sums imports excluding duty-free access (`p_doubleZero`),
same-block trade, and prohibited flows. Bilateral quota overflows spill into global TRQ.

### 7.4 Flexible levies (EU cereals)

`v_flexLevy(i,r) = min[v_tarSpec(i,r), max(0, minBordPrice(i,r) - cif(i,r))]`
Implemented with fudging functions for differentiability.

### 7.5 Entry price system (EU fruits & vegetables)

Tariff linked to trigger price; encourages imports at CIF+tariffs between 92-98% of trigger.
Modified sigmoid approximation in code.

---

## 8. Endogenous policy instruments

### 8.1 Subsidised exports (equation 5.110)

`expsVal(i,r) = QutE(i,r) * sigmoid(alpha/PADM * (v_marketPrice - beta*PADM))`
Intervention prices undercut only if WTO commitment and max stock changes reached.

### 8.2 Intervention stocks (equations 5.112-5.114)

Buying: `v_buyingToIntervStock = INTM * errf((padm - v_marketPrice + gamma_p) / stddev)`
Releases: `intd = (intk + intp) * errf((uvae - pmrk + gamma_p) / stddev)`
Stock change: `ints = intp - intd`

---

## 9. Modified Armington (Witzke et al. 2005)

Handles zero trade flows by adding a commitment parameter `mu` to CES import shares:

```
M(i,r,r1) = U(i,r) * delta(i,r,r1)^sigma * [P(i,r) / P(i,r,r1)]^sigma + mu(i,r,r1)
```

- Calibration requires observed + expected price/quantity points
- Activated via GUI option; calibration in `arm/modArmington.gms`
- Parameters stored in `p_arm2Commit`
- Zero flows remain zero in baseline; become positive only under scenario assumptions
- Calibration modifies `simini/sim_ini.gdx`

---

## 10. Biofuel module integration

### 10.1 Products

- BIOE (ethanol): 1st gen from cereals/sugar/wine, 2nd gen (SECG), non-agricultural (NAGR)
- BIOD (biodiesel): 1st gen from vegetable oils, 2nd gen (SECG), non-agricultural (NAGR)
- Feedstock aggregates: ARES (agricultural residues), NECR (new energy crops)

### 10.2 Feedstock demand (CES cost minimisation, equations 5.99-5.101)

Net input cost per feedstock:
```
mu(r,xf) = p(r,xf) - SUM(xbp, p(r,xbp) * alpha(r,xf,xbp))
```

CES aggregate cost and FOC for feedstock mix:
```
fd(r,xf) = phi(r,xf) * x1st(r,xb) * [mu(r,xb) / mu(r,xf)]^rho(r,xb)
```

### 10.3 Biofuel supply function (equation 5.103)

Three-part function: linear + semi-log + sigmoid:
```
dx1st/dp = exp(beta1 + beta2 * ln(p/mu)) * 1/(1 + exp((p/mu - delta1)/delta2))
```

Ensures steep slope near break-even and minimal slope at extremes.
Calibration in `biofuel/def_biofuel_params.gms`.

### 10.4 Biofuel demand (equation 5.106)

Biofuel share in total fuel demand:
```
bsh(r,xb) = bshq(r,xb) + bshmax(r,xb) / (1 + exp((p_bio/p_fossil - X1) * X2))
```

- `bshq` = quota/mandate-enforced share
- `bshmax` = maximum endogenous share above quota
- Total demand: `d(r,xb) = bsh(r,xb) * d(r,f)` (exogenous total fuel demand)

### 10.5 Biofuel trade

Bilateral trade modelled with the same two-stage Armington approach as other commodities.
Enters market clearing via `v_biofprocQuant` in the Armington balance equation.

---

## 11. Welfare calculation methodology

### 11.1 Consumer welfare -- equivalent variation (equation 6.6)

```
EV = { (Gr/Gs) * (Yr - Fs) - (Yr - Fr) }
```

- `Fr`, `Fs` = committed expenditure `SUM(i, d(i)*cpri(i))` at reference/scenario prices
- `Gr`, `Gs` = GL function G at reference/scenario prices
- Code symbol: `CSSP`; computed as line integral over products in `reports/welfare.gms`

### 11.2 Producer welfare

Non-EU: from NQ profit function `pi(ps) = SUM(x, as(x)*ps(x)) + 0.5*SUM(x,y, bs(x,y)*ps(x)*ps(y)) + pi_0`.
EU regions: GVA + premiums (revenues - intermediate costs + CAP premiums).
Other agents (dairy, processing, feed): NQ welfare with margins as prices.
Taxpayers: tariff revenues + TRQ rent allocation. Land owners: rent from supply curve.

---

## 12. Solver strategy and iterative coupling

**Pre-solves** (`arm/simu_prestep.gms`): single-commodity sub-models via GAMS grid-solve,
repeated with cross-price updates. Then commodity group clusters (cereals, oilseeds, etc.).
**Full solve**: ~70,000 equations with CONOPT.
**Bound widening** (`arm/widen_bounds.gms`): on infeasibility, inspect bound duals, expand
stepwise, re-solve.

**Supply-market iteration**: market delivers prices; supply model returns quantities;
market re-calibrates `as`, `af` constants. Price dampening via weighted averages.
Supply elasticities from programming models calibrate `bs` parameters.
