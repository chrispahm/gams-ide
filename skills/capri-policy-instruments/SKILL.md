---
name: capri-policy-instruments
description: >
  Reference guide for CAPRI policy instruments and their implementation in GAMS. Use this skill
  when the user asks about CAP premiums, direct payments, subsidies, Pillar I, Pillar II, rural
  development, greening payments, coupled support, decoupled payments, Basic Payment Scheme (BPS),
  Single Payment Scheme (SPS), Single Area Payment Scheme (SAPS), voluntary coupled support (VCS),
  national ceilings, premium cuts, TRQs, tariff rate quotas, trade policy, flexible levies,
  minimum import prices, tariffs, ad-valorem tariffs, specific tariffs, quotas, milk quotas,
  sugar quotas, set-aside obligations, WTO boxes, green box, blue box, amber box, PSE
  classification, Producer Support Estimate, co-financing rates, agri-environmental schemes,
  LFA payments, Natura 2000, ecological set-aside, crop diversity, entitlement trade, or any
  question about how agricultural policy is modelled, parameterised or simulated in CAPRI.
---

# CAPRI Policy Instruments

This skill provides a working guide to the policy instruments modelled in CAPRI: how they are
defined, parameterised, and how they interact during supply-market iterations. For the full
parameter and equation reference, see `references/policy-details.md` in this skill directory.

---

## Pillar I direct payments

### Premium mechanism overview

All Pillar I premiums follow a common CAPRI workflow:

1. **Policy file** (`gams/pol_input/...`) defines regulation rates (`PRMR`), application types
   (`APPTYPE`), activity groups, and ceilings (value or level).
2. **`policy/policy_sets.gms`** declares available premium schemes, activity groups, co-financing
   rates, WTO box assignments, and PSE mappings.
3. **`policy/policy.gms`** translates regulation definitions into declared premiums (`PRMD`) per
   activity unit (EUR/ha or EUR/head), mapping hierarchically from EU to MS to NUTS1 to NUTS2
   to farm types.
4. **`policy/premcut.gms`** is called iteratively during simulations to enforce ceilings. It
   computes a cut factor so that effective premiums (`PRME`) respect both level and value
   ceilings. The tighter ceiling always binds.
5. Effective premiums from all schemes are summed per activity and enter the supply model
   objective function.

### Basic Payment Scheme / Single Payment Scheme

- **BPS** (post-2014): implemented as `dp_bps` with eligible activity list `pgsaps`. Convergence
  logic (linear, tunnel, 30% rule) is in `gams/policy/implement_bps.gms`. BPS regions and
  convergence options are set in `gams/scen/premiums/bps_convergence.gms`.
- **SPS** (pre-2014 non-SAPS): historic or regional implementation. Distribution shares from old
  Agenda premiums to MTR schemes are on `p_premToDDTarget_E`. Budget envelops are calculated
  in `policy/calc_mtr.gms` with top-level preparation in `policy/calc_mtr_top.gms`.
- **SAPS** (new MS): flat rate per ha of agricultural land, phased in over time with complementary
  national direct payments (top-ups).

### Greening (post-2014)

- 30% of national Pillar I envelope dedicated to greening top-up (`DPGREEN`).
- Three constraints in the supply model: permanent grassland ratio, crop diversity, ecological
  set-aside (default 5%).
- Configured in `gams/scen/premiums/greening/cap_2013_2020_greening.gms`.
- Constraint logic activated via `policy/define_greening_limits.gms`.

### Voluntary Coupled Support (VCS)

Defined using standard premium mechanisms with notifications from the Commission. Budget ceilings
and nominal amounts are in `gams/scen/premiums/coupling/cap_2013_2020_vcs.gms`.

### Coupled/decoupled split

Coupling percentages stored on `p_couplPercent_E`. The decoupled part flows into MTR schemes
(regional `DPREG`, historic, etc.) via distribution keys. A greening share is deducted from the
decoupled pool from 2014. A national ceiling cut factor aligns computed envelops with legal texts.

### Entitlement trade

Optional module in `policy/prem_entl_trade.gms` (off by default, toggled in
`gams/capmod/set_global_variables.gms`). Shifts unused entitlements from farm types with slack
to those with positive marginal values on entitlements. Prevents artificial land loss when
subsidies are redistributed.

---

## Pillar II rural development

Implemented in `gams/policy/rd_logic.gms`. Key measures:

| Measure | Codes | Approach |
|---------|-------|----------|
| LFA | 211-212 | Regional direct support; distribution via FADN + CLUE land shares |
| Natura 2000 | 213, 224 | Conditional on extensive technology (T2) |
| Agri-environment | 214-215 | FADN-based distribution; 50% conditional on extensive technology |

### Co-financing and technology variants

- `p_technFact` modifies production coefficients per technology. In `rd_logic.gms`, T2 (low
  yield) receives +50% premium rate while T1 (high yield) receives -50%, approximating the
  stylised fact that agri-environmental schemes favour extensive practices.
- Co-financing rates (EU vs national budget shares) are defined in `policy/policy_sets.gms`.

### LFA premium calculation

Premium per ha = maximum amount (250 EUR) multiplied by the CLUE-derived share of LFA land in
each broad land class per region. A value ceiling ensures budget compliance via the standard
premium cut mechanism.

---

## Trade policy instruments (market model)

All market model equations are in `arm/market_model.gms`.

### Tariff Rate Quotas (TRQs)

Three regimes handled via sigmoid functions to smooth the kink:
- **Underfill**: in-quota tariff applied.
- **Binding**: in-quota tariff plus endogenous quota rent.
- **Overfill**: MFN tariff applied; quota rent = MFN minus in-quota rate.

Both bilateral and global (erga omnes) TRQs are supported. Bilateral quotas fill first.

### Flexible levies (EU cereals)

Variable tariff: `v_flexLevy = min(v_tarSpec, max(0, minBordP - cif))`. The tariff adjusts so
that the landed price does not fall below the minimum border price, capped at the bound MFN rate.
Implemented with fudging functions for differentiability.

### Entry price system (fruits and vegetables)

Tariff adjusts to keep import price between 92-98% of a trigger price. Uses a modified sigmoid.

### Subsidised exports

Modelled by a sigmoid function of the gap between EU market price and administrative price,
capped at WTO commitment quantities (`QUTE`). Per-unit export subsidy defined from the value
of subsidised exports divided by non-double-zero exports.

### Endogenous intervention stocks

Purchases depend on the probability of market price undercutting administrative price (error
function). Releases depend on the probability of market price undercutting unit value exports,
scaled by current stock size.

---

## Supply model constraints for quotas and set-aside

- **Milk/sugar quotas**: enter as upper-bound constraints in the regional programming model. Their
  dual values represent the quota rent. Removal of quotas (e.g. milk 2015, sugar 2017) is
  simulated by deactivating the constraint.
- **Set-aside obligations**: modelled as a minimum share of arable land allocated to fallow.
  Greening ecological set-aside replaces the old obligatory set-aside post-2014.
- **Environmental constraints**: Nitrates Directive (upper limits on manure/total N application),
  NEC Directive (NH3 ceilings by MS for 2030), IED (minimum manure storage requirements).

---

## Premium recalculation during iterations

The supply-market iteration loop works as follows:
1. Supply models solve at current effective premiums (`PRME`) and prices.
2. `policy/premcut.gms` aggregates activity levels and premiums per scheme per ceiling level.
3. If aggregated payments overshoot a ceiling, a proportional cut factor is computed.
4. `PRME = PRMD * cutFactor` for the next iteration.
5. Market model solves with updated supply/feed calibration; new prices feed back to supply.

This continues until convergence. The premium is exogenous within each supply model solve but
adjusted between iterations, which is correct as long as ceilings are not farm-specific.

---

## WTO boxes and PSE classification

Defined in `policy/policy_sets.gms`:
- **Green box**: decoupled payments (BPS, SPS, SAPS, LFA, agri-environment).
- **Blue box**: payments under supply control or with upper limits.
- **Amber box**: remaining coupled support (e.g. Norway).

PSE-type mapping also in `policy/policy_sets.gms`. Reporting aggregates premiums per activity
from actual schemes using `PRME` and distribution key `p_budToPsdpay`, then assigns to product
outputs. Set-aside payments are allocated to activities via set-aside rates. Reporting code is
in `reports/feoga.gms`.

---

## Example: removing greening payments (dual analysis)

From section 6.1.2 of the CAPRI documentation:
1. Run reference scenario with CAP 2014-2020 up to 2030.
2. Run counterfactual removing greening payments and requirements.
3. The dual analysis (`supply/margcr.gms`) decomposes changes in first-order conditions.
4. For example, in Sydsverige: 71 EUR/ha reduction in payments, offset by 77 EUR reduction in
   PMP costs (mainly diagonal term: 65 EUR). Land rents drop 18 EUR, grass output value rises
   25 EUR. Variable costs and fertilizer constraint values show minor adjustments.

This decomposition helps explain *why* activity levels change, not just *that* they change.

---

## Using LM tools to explore policy parameters

Use the GAMS IDE language model tools to inspect policy data:

- **`chrispahm.gams-ide/gamsSearchSymbols`**: search for premium-related symbols, e.g. query `PRME` or `p_premData`
  to find all parameters involved in premium calculation.
- **`chrispahm.gams-ide/gamsSymbolDetails`**: inspect the declaration, domain sets, and explanatory text of a symbol
  like `p_couplPercent_E` or `v_tarAdVal`.
- **`chrispahm.gams-ide/gamsSymbolValues`**: retrieve actual numeric values for a parameter in a specific GDX file,
  e.g. check premium rates or ceiling values for a member state.
- **`chrispahm.gdx-viewer/gdx-sql`**: run SQL-like queries against GDX result files to extract policy outcomes across
  regions and scenarios, e.g. compare effective premiums before and after a ceiling cut.

Typical workflow: search for the policy parameter name, inspect its dimensions and meaning, then
query its values in baseline and scenario GDX files to understand the policy change.
