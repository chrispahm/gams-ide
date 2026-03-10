---
name: capri-gams-style
description: >
  GAMS coding conventions for the CAPRI model (Common Agricultural Policy Regionalised Impact).
  Use this skill whenever the user asks to write, review, refactor, debug, or generate GAMS code
  for CAPRI — or any GAMS code that should follow CAPRI conventions. Also trigger when the user
  mentions CAPRI model development, CAPRI GAMS style, "red book" conventions, or asks for help
  with GAMS naming, set usage, indentation, comments, error trapping, meta data, or file
  structuring in a CAPRI context. Even if the user just says "write GAMS code" or "review my
  GAMS file" and CAPRI is part of the project, use this skill. This skill encodes the official
  "Red Book on CAPRI GAMS Coding" by Wolfgang Britz (Bonn University).
---

# CAPRI GAMS Coding Style

This skill encodes the official CAPRI GAMS coding conventions (the "Red Book") so that all
GAMS code you produce or review for CAPRI is consistent, maintainable, and well-documented.

GAMS has **no function/subroutine scoping** — every symbol is global once declared. This makes
naming conventions, structured code, and disciplined commenting even more critical than in
languages like Python or C.

For the full 31-rule reference with examples, read `references/coding-rules.md` in this skill
directory. Below is the condensed working guide you should apply to every GAMS task.

---

## Quick-reference checklist

### Naming (Rules 1–5)

- **Self-explanatory but short names.** Before introducing a new symbol, search existing code
  to ensure the name is not already taken.
- **camelCase** for multi-word names: `p_popGrowthRate`. Exception: when consecutive acronyms
  hurt readability, separate with underscores: `p_CAP_MTR_policy`.
- **Prefix conventions** — these are mandatory in CAPRI:
  - `p_` for parameters
  - `v_` for variables
  - `e_` for equations
  - `PV_` for parameters endogenous during calibration
  - `VP_` for variables fixed during calibration
  - Sets have **no prefix**
- **Always add explanatory long text** to every symbol declaration, including physical units
  where applicable:
  ```gams
  PARAMETER p_minFeedSharePerc(regions,animals,feed)
      "Minimum feed shares per region, animal and feed stuff in % of dry matter intake";
  ```
- **Set element names** must be meaningful and always carry explanatory text.
- Vowels can be dropped to shorten names: `p_cnsQunt` is acceptable for `p_consQuant`.
- Avoid "scientific" placeholder names like `p_alpha`, `v_gamma` — they are ambiguous and
  collision-prone.

### Set usage (Rules 6–8)

- **Domain checking everywhere.** Declare allowed sets on every dimension:
  ```gams
  p_maxFeedShare(RALL,PACT,A,FEED) "Maximum shares for each feedingstuff …";
  ```
- **Use sub-sets** to structure domains clearly.
- **Never redeclare the same set members.** Use `ALIAS` or the `SET set.OTHER_SET` pattern:
  ```gams
  SET SET_FUELS / gasoline, diesel /;
  SET fuelRows(Rows) / set.SET_FUELS /;
  SET fuelCols(Cols) / set.SET_FUELS /;
  ```

### Code structure (Rules 9–13)

- Declare symbols used only in one file **at the top of that file.** If the file is inside a
  loop/if, put declarations in a sibling `_decl` file.
- **Separate processing code from data.** Put numerical data under a `dat/` subdirectory;
  large tables should become GDX files.
- Each file should have **one clearly defined purpose** with well-defined inputs and outputs.
- **Avoid include nesting deeper than 3 levels.**
- **One statement per line.** One declaration per line. Max **80 characters** per line.

### Indentation & flow control (Rules 14–19)

- **3-space indentation** inside `LOOP`, `IF`, and other block structures.
- Break long expressions after commas, before operators, aligned with the previous level.
- **Prefer `$` operators over `IF` statements:**
  ```gams
  * Good
  p_myParam(RU) $ (p_otherParam) = 10;

  * Bad
  IF ( p_otherParam,
     p_myParam(RU) = 10;
  );
  ```
- When multiple assignments share the same condition, use `IF … ENDIF` rather than repeating
  the `$` condition on each line.
- **Remove duplicate code** by extracting it into include files.
- **`$BATINCLUDE` transparency:** rename positional arguments immediately:
  ```gams
  $setlocal regions %1
  p_myParam(%regions%) = p_someOtherParam(%regions%);
  ```
- `$ONMULTI` must be followed by `$OFFMULTI` in the same file; use only when well justified.

### Compile-time `$IF` (Rules 20–22)

- Always use `$IFI` (case-insensitive), never `$IF`.
- `$IFI` for single-line statements only.
- For multi-line blocks, use `$IFTHENI … $ENDIF`:
  ```gams
  $IFTHENI %MODE%==CAPREG
    p_x(RS) = p_y(RS)
               * p_o(RS)
               * p_z(RS);
  $ENDIF
  ```

### Error trapping (Rule 24)

- Every include file should test at the top whether required data is present:
  ```gams
  ABORT $ exceptionFilenameRegions
      "Error in %system.fn%, line %system.incline%: Population data missing for:",
      problemRegions;
  ```

### Comments (Rules 25–27)

- **File header** (use the CAPRI template): author name, file name, purpose, `$BATINCLUDE`
  argument descriptions.
- **Inline comments** go on a separate line *above* the code, same indentation, prefixed with
  `* ---`:
  ```gams
  * --- Compute per-capita consumption from total and population
  p_consPCap(RU) = p_consTotal(RU) / p_pop(RU);
  ```
- **Block comments** to separate logical sections:
  ```gams
  *-------------------------------------------------------------------
  * Calculate greenhouse gas emissions from livestock
  *-------------------------------------------------------------------
  ```
- Comments should **explain why**, not repeat what the code does.
- Include references to methodological documentation, IPCC guidelines, project deliverables, etc.

### Meta data (Rules 28–29)

- Add meta data to new data sources using the CAPRI `META` set convention.
- Load data as GDX with META information included and passed along the production line.

### Version control (Rules 30–31)

- Only commit fully functioning, tested code to SVN/Git.
- Always update/pull before committing.
- Accompany commits with clear descriptions of what changed and why.
- Major changes should be announced to the team and documented in a short technical note.

---

## How to apply this skill

**When writing new GAMS code:** Follow every rule above. Generate the file header first, then
declarations, then processing logic. Validate naming, domain checking, and comments before
presenting the code.

**When reviewing existing code:** Check each rule systematically. Report violations grouped by
category (naming, structure, comments, etc.) with specific line references and suggested fixes.

**When refactoring:** Prioritise extracting duplicate code into include files, adding missing
domain checks, fixing naming violations, and adding missing comments/headers.

For the full rule text with all examples and rationale, consult `references/coding-rules.md`.
