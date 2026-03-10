---
name: capri-new-module
description: >
  Workflow skill for creating new CAPRI modules or extending the CAPRI model. Trigger when
  the user asks to create a new module, add a new product, add a new commodity, add a new
  activity, extend the model, scaffold a new GAMS file, create a new include file, build a
  model extension, add a feature to CAPRI, create a GAMS file for CAPRI, or register a new
  data source. Also trigger for requests involving new set elements, new equations, new
  variables, or any structural addition to the CAPRI modelling system.
---

# Creating New CAPRI Modules and Extensions

This skill provides a step-by-step workflow for adding new modules, products, activities,
or other structural extensions to the CAPRI modelling system. Every piece of new code must
follow the `capri-gams-style` conventions.

---

## Workflow

### Step 1: Plan the structure

Use `chrispahm.gams-ide/gamsModelStructure` to understand the include hierarchy around your target
area. Identify:
- Which top-level driver file will include your new code (`coco.gms`, `capreg.gms`,
  `capmod.gms`, `arm/market_model.gms`, etc.)
- Where in the execution flow your code belongs (data build, baseline, simulation)
- What existing files are neighbours to your new module

### Step 2: Check existing symbols

Use `chrispahm.gams-ide/gamsSearchSymbols` to search for every name you plan to introduce. CAPRI has
**no scoping** -- every symbol is global. A name collision silently corrupts results.

### Step 3: Follow file conventions

- **Name files with module prefix:**
  `coco1_*.gms`, `capreg_*.gms`, `capmod_*.gms`, `arm_*.gms`
- **Separate declarations from logic:** put declarations in `*_decl.gms` files
- **Data goes in `/dat/` subdirectories;** large tables belong in GDX files
- **Keep include nesting to 3 levels or fewer**
- One file = one clearly defined purpose with documented inputs and outputs

### Step 4: Apply coding style

Trigger the `capri-gams-style` skill for all code you write. Key rules:
- `p_` parameters, `v_` variables, `e_` equations, `PV_` calibration parameters, `VP_`
  calibration variables; sets have no prefix
- camelCase naming, self-explanatory, with long explanatory text on every declaration
- Domain checking on every dimension
- 3-space indentation, 80-character line limit, one statement per line

### Step 5: Declare symbols properly

- Add new set elements to the appropriate set files (`sets.gms`, `arm_sets.gms`,
  `glb_sets.gms`)
- Map new elements into existing aggregation sets (product groups, activity groups)
- Use domain checking on every dimension of every parameter, variable, and equation
- Add META information for any new data source using the CAPRI `META` set convention

### Step 6: Error trapping

Add ABORT statements at the top of every new include file to verify preconditions:
```gams
ABORT $ (NOT p_requiredData("someRegion","someItem"))
   "Error in %system.fn%, line %system.incline%: required data missing",
   p_requiredData;
```

### Step 7: Test progressively

1. **Syntax check:** use `chrispahm.gams-ide/gamsCheckSyntax` on the new file
2. **Compile:** run a compile-only pass (`$ONTEXT`/`$OFFTEXT` to isolate if needed)
3. **Execute:** run the relevant CAPRI step (COCO, CAPREG, CAPMOD, or simulation)

### Step 8: Validate results

- Use `chrispahm.gams-ide/gamsSolveStatus` to confirm the model solves normally (status 1 = optimal,
  status 2 = locally optimal)
- Use `chrispahm.gams-ide/gamsSymbolValues` to inspect key output parameters and variables
- Use `chrispahm.gdx-viewer/gdx-sql` to run validation queries against output GDX files (see examples below)

---

## Checklist: Adding a new product

1. **Define set element** -- add the new product code to `sets.gms` with explanatory text
2. **Map into groups** -- register in the relevant aggregation sets (cereals, oilseeds,
   meat, etc.) so market balances and reporting pick it up
3. **Supply data** -- provide activity levels (LEVL), yields, and input coefficients; load
   from GDX with META information
4. **Market balance** -- ensure GROF = yield * LEVL; register in MBAL equations; add
   HCOM, FEDM, EXPT, IMPT positions as needed
5. **Equations** -- add the product to supply model objective function and any relevant
   constraints (land balance, feed balance, nutrient balance)
6. **Calibration** -- provide `PV_` parameters for calibration; verify the model calibrates
   to base year data within tolerance
7. **Trade (if applicable)** -- add Armington set mappings in `arm_sets.gms`, bilateral
   trade data, tariff and TRQ entries
8. **Test** -- run COCO, CAPREG, baseline, and a dummy scenario; compare results with and
   without the new product to confirm no regressions

## Checklist: Adding a new module file

1. **Create the file** with proper header (see template below)
2. **Put declarations** in a separate `*_decl.gms` file if the include is inside a loop/if
3. **Register the include** in the parent driver file at the correct execution point
4. **Add error trapping** at the top of the file
5. **Document inputs and outputs** in the file header
6. **Test syntax**, then compile, then execute (Step 7 above)
7. **Validate results** (Step 8 above)

---

## File header template

Every new GAMS file must start with this header:

```gams
*=============================================================================
* Module  : <module_prefix>_<descriptiveName>.gms
* Author  : <name> (<institution>)
* Date    : <YYYY-MM-DD>
* Purpose : <one-line description>
*
* Inputs  : <list parameters/sets expected to exist>
* Outputs : <list parameters/variables this file creates or modifies>
*
* Called from : <parent file>
* $BATINCLUDE arguments:
*   %1 - <description of first argument, if any>
*=============================================================================
```

---

## Example validation queries

After running a scenario, verify output GDX files using the available GDX tools.

**Check that a new product has non-zero production:**
```
-- Using gdx-sql against results GDX
SELECT regions, activities, cols, val
FROM p_resCapmod
WHERE activities = 'NEWPROD'
  AND cols = 'GROF'
  AND val > 0
ORDER BY val DESC
LIMIT 20;
```

**Verify market balance closure (supply = demand):**
```
SELECT regions, products,
       SUM(CASE WHEN cols IN ('GROF','IMPT') THEN val ELSE 0 END) AS supply,
       SUM(CASE WHEN cols IN ('HCOM','FEDM','EXPT','INDM','PRCM','LOSM','SEDM') THEN val ELSE 0 END) AS demand
FROM p_resMarket
WHERE products = 'NEWPROD'
GROUP BY regions, products
HAVING ABS(supply - demand) > 0.01;
```

**Check solve status across regions:**
```
SELECT regions, modelstat, solvestat, COUNT(*) AS n
FROM p_solveStatus
GROUP BY regions, modelstat, solvestat;
```

---

## Cross-references

- **`capri-gams-style`** -- mandatory coding conventions for all CAPRI GAMS code
- **`capri-architecture`** -- overall system structure, include hierarchy, execution flow
- **`capri-debug-solve`** -- diagnosing infeasibilities and solve failures after adding
  new equations or constraints
