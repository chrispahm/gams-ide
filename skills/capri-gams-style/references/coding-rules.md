# CAPRI GAMS Coding Rules — Full Reference

Source: "The Red Book on CAPRI GAMS Coding" by Wolfgang Britz, Bonn University (2016 edition).

This document contains the complete 31 rules with rationale and examples. Use it when you
need the full context behind a rule or when reviewing code in detail.

## Table of contents

1. [Naming conventions (Rules 1–5)](#naming-conventions)
2. [Set usage (Rules 6–8)](#set-usage)
3. [Code structure (Rules 9–13)](#code-structure)
4. [Indentation and flow control (Rules 14–19)](#indentation-and-flow-control)
5. [Compile-time $IF (Rules 20–22)](#compile-time-if)
6. [File size (Rule 23)](#file-size)
7. [Error trapping (Rule 24)](#error-trapping)
8. [Comments (Rules 25–27)](#comments)
9. [Meta data (Rules 28–29)](#meta-data)
10. [Version control (Rules 30–31)](#version-control)

---

## Why coding conventions matter in GAMS

GAMS does not break code into functions or subroutines with clearly defined inputs and
outputs. It does not provide scoping — all symbols are global past the point of declaration.
This means naming conventions and clearly structured code are even more important in GAMS
than in scoped languages like C, Java, or Python.

CAPRI is a large distributed software package maintained by multiple teams. The conventions
exist to:

- Make code understandable to programmers who did not write it
- Enable successful long-term maintenance and updates
- Support automated code documentation systems

---

## Naming conventions

### Rule 1: Use clear and easy to understand names for symbols and files

A good name is self-explanatory but short. The CAPRI code base is large, so be specific —
`p_emissionFactor` is better than `p_factor` and much better than `p_f`.

**camelCase convention:** Each new word (except the first) starts with upper case. This saves
space compared to underscores.

Good:
```gams
PARAMETER p_data(rall,cols,rows,years) "Generic data cube of CAPRI";
PARAMETER p_popGrowthRate(rall) "Population growth rate";
```

Exception — when consecutive acronyms make reading cumbersome, use underscores between
acronyms:
```gams
* Hard to read
PARAMETER p_CAPMTRPolicy "Policy parameters for the MTR of the CAP";

* Better
PARAMETER p_CAP_MTR_policy "Policy parameters for the MTR of the CAP";
```

**Discouraged:** very short meaningless symbols like `i`, `p`, `q` as parameters.

Before introducing a new symbol, use "Find in files" in the GAMS IDE to verify the name is
not already in use.

Always add an explanatory long text stating physical units or other clarifying information:
```gams
PARAMETER p_minFeedSharePerc(regions,animals,feed)
    "Minimum feed shares per region, animal and feed stuff in % of dry matter intake";
```

Bad:
```gams
PARAMETER p_minFeed;
```
Problems: (1) no domains given, (2) ambiguous name, (3) no explanatory text.

Vowels can be dropped to shorten names: `p_cnsQunt` ≈ `p_consQuant`.

Avoid "scientific" names like `p_alpha`, `v_gamma` — their meaning is context-dependent and
name collisions are very likely.

### Rule 2: Let equation names start with `e_`

There is a CAPRI tradition of letting equations end with an underscore, which can be kept for
legacy code.

### Rule 3: Let parameter names start with `p_` and variable names with `v_`

This is essential for reading model equations, since GAMS notation is ambiguous — you
cannot otherwise tell parameters from variables.

Special prefixes:
- `PV_` — parameters endogenous during calibration
- `VP_` — variables fixed during calibration
- Sets have no prefix

### Rule 4: Use clear and easy to understand codes for set elements

Take time to create set element names that indicate meaning. Self-documenting element codes
reduce misuse risk.

### Rule 5: Always add an explanatory text to set elements

Explanatory texts travel with the set through the code and into GDX containers, making them
a durable form of documentation.

---

## Set usage

### Rule 6: Use domain checking wherever possible

Domain checking means declaring which sets are allowed on each dimension:
```gams
p_maxFeedShare(RALL,PACT,A,FEED)
    "Maximum shares for each feedingstuff, expressed in dry matter";
```

Domain checking may require `SAMEAS` and can be cumbersome, but it catches terrible errors
that are otherwise extremely hard to detect.

### Rule 7: Use sub-sets wherever possible

Sub-sets are derived from other sets and structure a domain clearly.

### Rule 8: Don't declare the same collection of set members a second time

Use `ALIAS`:
```gams
ALIAS (regions, regions1, regions2);
```

For domain checking across different parent sets, use the `SET set.` pattern:
```gams
SET SET_FUELS / gasoline, diesel /;
SET fuelRows(Rows) / set.SET_FUELS /;
SET fuelCols(Cols) / set.SET_FUELS /;
```

This also avoids repeating collections in sub-sets:
```gams
SET SET_FINFUELS / gasoline, diesel /;
SET SET_RAWFUELS / natGas, crudeOil /;
SET fuels / set.SET_FINFUELS, set.SET_RAWFUELS /;
SET finFuels(fuels) / set.SET_FINFUELS /;
```

---

## Code structure

### Rule 9: Declare symbols used in one file only at the top of that file

If the file runs inside a loop or IF (where declaration is not allowed), put declarations in a
separate file with `_decl` appended to the name, stored in the same subdirectory.

### Rule 10: Separate processing code from data

Put numerical data in the relevant directory under `dat/`. Beyond a certain size, convert
tables to GDX files so the GAMS code stays concise.

### Rule 11: Generate files with a clearly defined purpose

Each file should have clearly defined inputs and outputs forming a logical unit. Example: a
file defining animal requirements should not also correct herd sizes as a side effect.

### Rule 12: Avoid include nesting deeper than 3 levels

Deep include structures force opening many files simultaneously in the editor.

### Rule 13: Use at most one statement per line

One declaration per line encourages commenting:
```gams
* Good
PARAMETER p_level(domain1,domain2);
           p_size(domain3);

* Bad
PARAMETER p_level(domain1,domain2), p_size(domain3);
```

Each line should contain at most one executable statement:
```gams
* Good
iTry = iTry + 1;

* Bad
iTry = iTry + 1; RUNR(MS) = NO;
```

Avoid lines longer than **80 characters**.

---

## Indentation and flow control

### Rule 14: Use indentation to make code readable

When an expression does not fit on one line:
- Break after a comma
- Break before an operator
- Prefer higher-level breaks to lower-level breaks
- Align the new line with the beginning of the expression at the same level
- If alignment produces confusing code, indent 6 spaces instead

### Rule 15: Use 3-space indentation for LOOP and other block structures

```gams
LOOP(RU,
   Statements in here must be indented to show program structure
);
```

### Rule 16: Prefer `$` operators over IF statements

Good:
```gams
p_myParam(RU) $ (p_otherParam) = 10;
```

Worse (harder to read):
```gams
IF ( p_otherParam,
   p_myParam(RU) = 10;
);
```

Worst (harder to read AND slower):
```gams
LOOP(RU $ otherParam(RU),
   p_myParam(RU) = 10;
);
```

However, when multiple assignments share the same condition, do NOT repeat the `$` on
every line — use an IF block instead, so the shared dependency is visible:
```gams
* Bad — not obvious all three lines share the same condition
p_myParam(RU)  $ (p_otherParam) = 10;
p_myParam1(RU) $ (p_otherParam) = 20;
p_myParam2(RU) $ (p_otherParam) = 30;

* Good
IF ( p_otherParam,
   p_myParam(RU)  = 10;
   p_myParam1(RU) = 20;
   p_myParam2(RU) = 30;
);
```

Avoid unnecessarily complex if/loop structures or `$`-controls.

### Rule 17: Remove duplicate code by moving it to include files

### Rule 18: Use $BATINCLUDE transparently

Inside a `$BATINCLUDE` file, rename positional arguments immediately:
```gams
$setlocal regions %1
p_myParam(%regions%) = p_someOtherParam(%regions%);
```

Without this, `%6` is simply meaningless to anyone reading the code.

### Rule 19: $ONMULTI must be used only locally and paired with $OFFMULTI

`$ONMULTI` allows multiple declarations of the same symbol, which is dangerous — conflicting
uses may go undetected. Use only when well justified, and always close with `$OFFMULTI` in
the same file.

---

## Compile-time $IF

### Rule 20: Always use $IFI instead of $IF

`$IFI` is the case-insensitive version. Always prefer it.

### Rule 21: $IFI for single-line statements only

```gams
$IFI %MODE%==CAPREG $INCLUDE "capreg\someFile.gms"
```

### Rule 22: Use $IFTHENI … $ENDIF for multi-line blocks

Bad — GAMS may misinterpret lines starting with `*`:
```gams
$IF %MODE%==CAPREG p_x(RS) = p_y(RS)
$IF %MODE%==CAPREG * p_o(RS)
$IF %MODE%==CAPREG * p_z(RS);
```

Good:
```gams
$IFTHENI %MODE%==CAPREG
   p_x(RS) = p_y(RS)
              * p_o(RS)
              * p_z(RS);
$ENDIF
```

---

## File size

### Rule 23: Find a compromise between number of files and their length

Files should ideally not exceed **1000 lines** but should contain more than about 10
statements. A top-level module should reveal its structure in the GAMS code.

---

## Error trapping

### Rule 24: Include tests at the top of include files

Error trapping means the code itself checks for missing or erroneous data and stops execution
with a clear message, rather than continuing with nonsensical calculations.

Use `%system.fn%` and `%system.incline%` so error messages indicate where the problem
occurs:
```gams
ABORT $ exceptionFilenameRegions
    "Error in %system.fn%, line %system.incline%: Population data missing for:",
    problemRegions;
```

---

## Comments

### Rule 25: Introduce yourself

Authors should label their code with their name, using the predefined file header template.

### Rule 26: Generate a file header explaining the purpose of the file

Standard header fields:
- Author name
- File name
- Purpose of the file
- For `$BATINCLUDE` files: descriptions of arguments

Use the CAPRI template so the HTML documentation system can collect this information
automatically.

### Rule 27: Add clear comments to any non-self-explaining code

Comments should explain **why**, not repeat what the code does.

Bad (useless):
```gams
* Set p_myParam to p_otherParam
p_myParam(Domain) = p_otherParam(Domain);
```

Good:
```gams
* --- Compute per-capita consumption from total and population
p_consPCap(RU) = p_consTotal(RU) / p_pop(RU);
```

**Inline comment style** — on a separate line above the code, same indentation:
```gams
* --- Here comes the comment
```

**Block comment style** — to separate logical sections:
```gams
*-------------------------------------------------------------------
* Here comes the description of the block
*-------------------------------------------------------------------
```

Include references to methodological documentation, IPCC guidelines, project deliverables,
page numbers, etc., so code can be verified quickly.

Add a brief comment above every `$INCLUDE` statement explaining the purpose of the
included file.

---

## Meta data

### Rule 28: Add meta data information to data and parameters

When including new data sources, add meta information. On updates, update both numerical
values and meta information. Standard fields should cover provenance, units, and processing
steps.

### Rule 29: Load data as GDX with META information

Data and parameters should wherever possible be loaded as GDX with the META set included
and passed along the production line.

---

## Version control

### Rule 30: Only commit fully functioning and tested code

Any exceptions must be agreed upon by all team members beforehand. Major changes
(especially those affecting results) should be announced via the CAPRI mailing list.

Accompany each commit with a clear description of what changed and why. Commit related
file changes together. Avoid bundling unrelated changes.

For complex new features or substantial refactoring, write a short technical note covering:
1. Motivation with references to project deliverables
2. Which files were added or changed
3. Clear description of inputs and outputs
4. Any unusual technical solutions

### Rule 31: Update before committing

Always pull the latest version and test against it before pushing your changes.
