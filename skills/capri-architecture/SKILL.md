---
name: capri-architecture
description: >
  Architecture and module structure of the CAPRI model (Common Agricultural Policy Regionalised
  Impact). Use this skill when the user asks about CAPRI structure, module relationships, data
  flow between modules, directory layout, key GDX files, or how CAPRI components fit together.
  Trigger on mentions of CAPRI modules such as COCO, CAPREG, CAPTRD, CAPMOD, CAPDIS, the supply
  module, market module, Armington trade model, iterative solving, or spatial disaggregation.
  Also trigger when the user needs to understand which CAPRI file to edit, where data flows, or
  how the simulation pipeline works.
---

# CAPRI Architecture Guide

CAPRI is a global partial equilibrium model for the agricultural sector. It combines a supply
module (~280 EU regions, ~55 inputs, ~60 activities) with a market module (~44 trade blocks,
~65 products) linked through an iterative price mechanism. This skill provides the structural
map you need to navigate, extend, or debug the model.

For detailed per-module breakdowns with file names, parameters, and set references, read
`references/module-details.md` in this skill directory.

---

## Module pipeline

```
COCO --> CAPREG --> CAPTRD --> CAPMOD --> CAPDIS
 |         |          |          |          |
 v         v          v          v          v
National  Regional   Trend     Scenario   Spatial
database  database   projec-   simula-    disaggre-
(NUTS0)   (NUTS2)    tions     tion       gation (1km)
```

**Data handoffs (key GDX files):**

| From    | To      | GDX file pattern              | Content                          |
|---------|---------|-------------------------------|----------------------------------|
| COCO    | CAPREG  | `dat/coco/res_BBCC.gdx`      | National supply balances, prices |
| CAPREG  | CAPTRD  | `dat/capreg/res_BBCC.gdx`    | Regional activity levels, yields |
| CAPTRD  | CAPMOD  | `dat/captrd/trends_BBYY.gdx` | Trend projections by region      |
| CAPMOD  | CAPDIS  | `results/res_SCEN.gdx`       | Simulated activity levels        |

`BB` = base year, `CC` = country code, `YY` = target year, `SCEN` = scenario name.

---

## Directory conventions

```
gams/              Root GAMS source
  coco/            COCO database construction
  capreg/          Regional database
  captrd/          Trend projection
  arm/             Armington market model
  supply/          Supply module (regional programming models)
  policy/          CAP policy instruments
  pol_input/       Policy data files
  baseline/        Baseline calibration & Aglink integration
  capdis/          Spatial disaggregation
  sets/            Global set definitions
dat/               Intermediate data (GDX)
  coco/            COCO output
  capreg/          CAPREG output
  captrd/          CAPTRD output
results/           Simulation results
```

---

## Key set files

| File                        | Purpose                                         |
|-----------------------------|--------------------------------------------------|
| `sets/sets.gms`            | Master set definitions (regions, activities, etc) |
| `sets/set_spel.gms`        | SPEL product codes (SWHE, DWHE, BARL, MAIZ, ...) |
| `sets/set_regions.gms`     | REGIO codes, NUTS2 mappings                       |
| `sets/set_feed.gms`        | Feed stuff definitions and mappings               |
| `sets/set_landuse.gms`     | Land use classes (LandUse set)                    |

---

## Iterative solving (CAPMOD)

The supply and market modules are coupled iteratively:

1. **Supply models** solve at fixed prices (one LP per region, ~280 models)
2. Results aggregate to trade-block level and feed into the **market model**
3. Market model (~750,000 equations, CONOPT solver) delivers new prices
4. New prices feed back to supply models via **weighted price averaging**
5. Repeat until price changes fall below convergence threshold

Key files:
- `arm/simu_prestep.gms` -- iterative loop control
- `arm/widen_bounds.gms` -- bound widening for solver robustness
- `supply/supply_model.gms` -- regional supply programming model
- `arm/market1.gms` -- market model data preparation
- `arm/cal_models.gms` -- market model calibration

---

## File naming conventions

- `*_decl.gms` -- declarations (used when main file is inside a loop/if)
- `*_input.gms` -- data input / loading
- `*_output.gms` -- result writing
- `dat/*.gdx` -- intermediate data exchange
- `res_*.gdx` -- result databases
- `trends_*.gdx` -- trend projection output

---

## Using LM tools to explore the architecture

When investigating CAPRI code, use these strategies:

**Find where a module starts:**
Use `chrispahm.gams-ide/gamsSearchSymbols` to search for the main steering file names like `capmod`, `coco_input`, or `capreg`.

**Trace data flow:**
Use `chrispahm.gams-ide/gamsSearchSymbols` to search for GDX execute_load/execute_unload statements to see what data enters and leaves a file.

**Understand set membership:**
Use `chrispahm.gams-ide/gamsSymbolDetails` on specific set names like `RALL`, `ROWS`, `COLS` to see their declaration and usage.

**Find policy implementations:**
Use `chrispahm.gams-ide/gamsSearchSymbols` to search for specific CAP instruments (BPS, greening, VCS) in the policy/ directory.

**Locate equation definitions:**
Use `chrispahm.gams-ide/gamsReferenceTree` to trace equation declarations and their dependencies in `arm/` and `supply/` directories.

**Check module interfaces:**
Use `chrispahm.gams-ide/gamsSearchSymbols` to search for `$BATINCLUDE` calls to understand how files chain together.

**Inspect GDX handoff files:**
Use `chrispahm.gdx-viewer/gdx-symbols` to list all symbols in a GDX file, and `chrispahm.gdx-viewer/gdx-preview` to view specific parameter values.

---

## How to apply this skill

**When navigating CAPRI:** Use the module pipeline and directory map to locate the right files.
Start from the steering file of the relevant module and trace includes downward.

**When debugging data issues:** Follow the GDX handoff chain. Check that upstream modules
produced the expected GDX files before investigating downstream code.

**When adding features:** Identify which module owns the feature, follow its file conventions,
and ensure data flows correctly to downstream modules.

For full module details, consult `references/module-details.md`.
