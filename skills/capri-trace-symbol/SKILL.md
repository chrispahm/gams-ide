---
name: capri-trace-symbol
description: >
  Trace GAMS symbols through the CAPRI model. Use this skill when the user asks "what is this
  symbol", "where is X used", "how does X flow", or requests symbol lookup, parameter tracing,
  variable dependencies, cross-reference analysis, symbol definition lookup, data lineage, or
  GAMS symbol investigation. Trigger on any question about where a CAPRI symbol is declared,
  what values it holds, which modules read or write it, or how data flows between COCO, CAPREG,
  CAPTRD, CAPMOD, and the market module. Also trigger when the user mentions tracing a GAMS
  symbol, finding symbol references, or understanding data dependencies in CAPRI.
---

# CAPRI Symbol Tracing Workflow

Systematic workflow for locating, inspecting, and tracing any GAMS symbol through the CAPRI
modelling system. Follow these steps in order; skip steps that are not needed for the query.

---

## Step 1: Search for the symbol

Use `chrispahm.gams-ide/gamsSearchSymbols` to find the symbol by name or pattern:

```
chrispahm.gams-ide/gamsSearchSymbols("<symbol_name>")
```

- Use exact names when known: `chrispahm.gams-ide/gamsSearchSymbols("p_tradeMrg")`
- Use patterns for partial matches: `chrispahm.gams-ide/gamsSearchSymbols("p_trad*")`
- If zero results, try without the prefix (the user may omit `p_`, `v_`, etc.)

## Step 2: Get symbol details

Once found, retrieve the full declaration info:

```
chrispahm.gams-ide/gamsSymbolDetails("<symbol_name>")
```

This returns:
- **Type** (parameter, variable, equation, set, alias)
- **Domain** (declared dimensions and their parent sets)
- **Declaration location** (file and line)
- **Usage list** (every file/line where the symbol appears)

Record the type and domain; they determine which GDX files and modules are relevant.

## Step 3: Get compiled values

For parameters and variables, retrieve data from the compiled model:

```
chrispahm.gams-ide/gamsSymbolValues("<symbol_name>")
```

This shows the values GAMS holds in memory after compilation. Useful for checking whether a
symbol was actually populated or remained empty.

## Step 4: Inspect GDX data

Symbols persist across modules via GDX files. Use the GDX tools to find and view data:

```
chrispahm.gdx-viewer/gdx-symbols("<path_to_gdx>")          // list all symbols in a GDX file
chrispahm.gdx-viewer/gdx-preview("<path_to_gdx>", "<sym>") // view actual values
chrispahm.gdx-viewer/gdx-domain("<path_to_gdx>", "<sym>")  // explore dimension members
```

Key GDX files in CAPRI (paths relative to the CAPRI results/data directories):

| GDX file | Contents |
|---|---|
| `coco_output.gdx` | Consolidated national data (COCO1 + COCO2 results) |
| `coco2_output.gdx` | Consumer prices, expenditure shares, dairy prices |
| `capreg_output.gdx` | Regionalised supply data, activity levels, input coefficients |
| `captrd_output.gdx` | Baseline trend projections at MS level |
| `res_time_series.gdx` | Historical and projected time series |
| `results/<scenario>.gdx` | Scenario simulation results |
| `results/baseline.gdx` | Baseline simulation results |
| `p_market.gdx` | Market module prices and trade flows |

## Step 5: Query across GDX files

Use SQL to compare symbol values between baseline and scenario runs, or across modules:

```sql
-- Compare a parameter between baseline and scenario
SELECT a.dim_1, a.dim_2, a.value AS baseline, b.value AS scenario,
       (b.value - a.value) / NULLIF(a.value, 0) * 100 AS pct_change
FROM read_gdx('baseline.gdx', 'p_price') a
JOIN read_gdx('scenario.gdx', 'p_price') b
  USING (dim_1, dim_2)
WHERE ABS(b.value - a.value) > 0.01;
```

Invoke via:

```
chrispahm.gdx-viewer/gdx-sql("<query>")
```

Useful queries:
- Compare supply module outputs vs market module inputs
- Track a symbol value from COCO through CAPREG to CAPMOD
- Find where a symbol's value changes between two scenario GDX files

## Step 6: Highlight values visually

To direct the user's attention to specific values in the GDX editor:

```
chrispahm.gdx-viewer/gdx-reveal("<path_to_gdx>", "<symbol>", filters)
```

Use this after narrowing down the data to show the user exactly which cells matter.

## Step 7: Check cross-file references

Build a dependency tree showing which files declare, assign, or read the symbol:

```
chrispahm.gams-ide/gamsReferenceTree("<symbol_name>")
```

This reveals the include-file chain and helps answer "where does this symbol get its value?"
and "what downstream code depends on it?"

## Step 8: Read listing context

If post-solve diagnostics are needed (e.g., equation marginals, infeasibilities):

```
chrispahm.gams-ide/gamsReadListing("<listing_file>", line, range)
```

Check equation listings when tracing `e_` symbols or investigating solver issues related to
a variable.

---

## CAPRI naming conventions

### Symbol prefixes

| Prefix | Meaning | Example |
|---|---|---|
| `p_` | Parameter (exogenous data) | `p_tradeMrg`, `p_cropYield` |
| `v_` | Variable (endogenous) | `v_prodQuant`, `v_marketPrice` |
| `e_` | Equation | `e_mrkBal`, `e_nutrientBal` |
| `PV_` | Parameter endogenous during calibration | `PV_costFunc` |
| `VP_` | Variable fixed during calibration | `VP_supElast` |
| *(none)* | Set | `regions`, `RALL`, `feed`, `maact` |

### Common symbol prefixes by module

| Module | Typical symbols | Description |
|---|---|---|
| COCO | `GROF`, `HCOM`, `FEDM`, `LOSM`, `MAPR`, `UVAG`, `UVAD` | National market balance positions |
| CAPREG | `p_farmInput`, `p_reqCoeff`, `p_feedShare` | Regional coefficients and shares |
| CAPTRD | `X*,Trend` variables, supports, growth bounds | Baseline projections |
| CAPMOD supply | `v_prodLevel`, `v_feedUse`, `v_landUse` | Regional programming model |
| Market module | `v_arm1Price`, `v_tradeFlows`, `v_domUse` | Armington trade model |

### Module data flow

```
COCO (national data consolidation)
  --> parameters: GROF, HCOM, FEDM, UVAG, MAPR, LEVL ...
      stored in: coco_output.gdx, coco2_output.gdx

CAPREG (regionalisation)
  --> reads COCO outputs, disaggregates to NUTS2
      stored in: capreg_output.gdx

CAPTRD (baseline trends)
  --> reads CAPREG + external projections
      stored in: captrd_output.gdx, res_time_series.gdx

CAPMOD (scenario simulation)
  --> supply module: regional programming models at fixed prices
  --> market module: global multi-commodity trade model
  --> iterate: supply <-> market until convergence
      stored in: results/<scenario>.gdx
```

### Cross-set mappings

- **Eurostat to CAPRI product codes**: `eurostat_agriculture_mapping.gms`
- **FADN to CAPRI**: mapping files under `dat/` directories
- **Trade regions**: ~80 countries aggregated to ~40 trade blocs
- **NUTS2 regions**: ~280 EU regions in set `RALL` / `NUTS2`

### Key market balance positions (COCO convention)

| Code | Meaning |
|---|---|
| `GROF` | Gross production |
| `HCOM` | Human consumption |
| `FEDM` | Feed use |
| `SEDM` | Seed use |
| `LOSM` | Losses |
| `INDM` | Industrial use / on-farm processing |
| `PRCM` | Processing (dairy, oilseeds, sugar) |
| `BIOF` | Biofuel use |
| `MAPR` | Marketable production (secondary products) |
| `IMPT` / `EXPT` | Imports / Exports |
| `LEVL` | Activity level or area (1000 ha or 1000 head) |
| `UVAG` | Producer price (unit value) |
| `UVAD` | Consumer price |

---

## Example queries

**"What is p_tradeMrg?"**
1. `chrispahm.gams-ide/gamsSearchSymbols("p_tradeMrg")` -- find it
2. `chrispahm.gams-ide/gamsSymbolDetails("p_tradeMrg")` -- see declaration, domain, usages
3. `chrispahm.gams-ide/gamsSymbolValues("p_tradeMrg")` -- see current values
4. Report: type, dimensions, where declared, what it represents, which modules use it

**"How does SWHE production flow from data to scenario results?"**
1. `chrispahm.gams-ide/gamsSearchSymbols("GROF")` and `chrispahm.gams-ide/gamsSearchSymbols("SWHE")`
2. `chrispahm.gdx-viewer/gdx-preview("coco_output.gdx", "p_dataOutCoco")` filtered to SWHE, GROF
3. `chrispahm.gdx-viewer/gdx-preview("capreg_output.gdx", "p_regData")` filtered to SWHE, GROF
4. `chrispahm.gdx-viewer/gdx-sql("SELECT ... FROM read_gdx('baseline.gdx','p_res') WHERE dim_2='SWHE' AND dim_3='GROF'")`
5. Summarise the chain: Eurostat raw -> COCO consolidation -> CAPREG regionalisation -> CAPTRD projection -> CAPMOD simulation

**"Compare butter prices between baseline and my scenario"**
1. `chrispahm.gdx-viewer/gdx-sql("SELECT a.dim_1, a.value AS base_price, b.value AS scen_price FROM read_gdx('baseline.gdx','UVAG') a JOIN read_gdx('scenario.gdx','UVAG') b USING(dim_1,dim_2) WHERE a.dim_2='BUTT'")`
2. `chrispahm.gdx-viewer/gdx-reveal("scenario.gdx", "UVAG", {dim_2: "BUTT"})` to highlight in the editor

**"Where is v_feedUse defined and what depends on it?"**
1. `chrispahm.gams-ide/gamsSymbolDetails("v_feedUse")` -- declaration file, domain
2. `chrispahm.gams-ide/gamsReferenceTree("v_feedUse")` -- full dependency tree
3. Report which equations reference it and in which modules

---

## Interpretation guidance

- If `chrispahm.gams-ide/gamsSymbolValues` returns empty, the symbol may be populated only at solve time or loaded
  from GDX at runtime. Check the GDX files directly.
- A symbol appearing in many files via `chrispahm.gams-ide/gamsReferenceTree` usually indicates a core data item
  passed through the full pipeline. Trace it module by module using the data flow above.
- When comparing GDX values, small numerical differences (< 1e-6) are typically solver tolerance
  artifacts. Focus on differences above 0.01 for economic interpretation.
- Parameters with `PV_` prefix change value during calibration -- their "final" value is in the
  scenario GDX, not in the source code assignments.
