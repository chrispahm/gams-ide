---
name: run-capri
description: >
  Build and execute GAMS commands for CAPRI projects. Use this skill when the user asks to
  "run CAPRI", "execute task", "compile CAPRI", "build GAMS command", "run gams", or mentions
  default.ini, gui_definition.xml, curtask, gamsexe, or wants to launch a CAPRI task from the
  command line. Also trigger when the user asks how to run a specific CAPRI workstep or task,
  or wants to understand the GAMS command that the GUI would produce.
---

# Run CAPRI — Build and Execute GAMS Commands

This skill teaches you to read the CAPRI GUI configuration files and construct the exact GAMS
command that the IDE would produce. You MUST re-read the config files every time — settings
change frequently as users switch tasks, directories, and instances.

---

## Step 1: Locate configuration files

Find the two config files in the project's `GUI/` directory:

```
GUI/default.ini              — user settings (overrides XML defaults)
GUI/*_gui_definition.xml     — project definition (tasks, defaults)
```

Search for them with Glob:
- `**/GUI/default.ini`
- `**/GUI/*_gui_definition.xml`

If `GUI/` doesn't exist, try `gui/` (case-insensitive). Both files are required.

Record the **guiDir** — the directory containing these files (e.g., `/path/to/project/GUI`).

---

## Step 2: Parse `default.ini`

The INI file uses Java properties format: `key=value`, one per line.
- Lines starting with `#` or `!` are comments
- Spaces in keys are escaped with `\` (e.g., `cur\ task` means key `curtask` after unescaping)
- Keys are **case-insensitive** — normalize to lowercase before matching
- Skip keys starting with `agpspread.`

### Key mappings

Read these keys from the INI file:

| INI key (lowercase) | Setting | Notes |
|---|---|---|
| `gamsexe` | GAMS executable path | Full path to `gams` binary |
| `gamsdir` | GAMS executable path | Fallback — only use if `gamsexe` is absent |
| `curtask` | Current task name | Which task to run |
| `curworkstep` | Current workstep | Informational |
| `modeldir` | Model directory | Relative to guiDir |
| `resdir` | Results directory | |
| `restartdir` | Restart directory | |
| `datdir` | Data directory | |
| `scratchdir` | Scratch directory | Relative to guiDir |
| `lastinstance` | Instance number | Integer, default `1` |
| `numberofprocessors` | CPU count | Integer, default `1` |
| `runparallel` | Parallel flag | `true`/`false`, default `false` |
| `defaultdirs` | Default directories | Comma-separated list |
| `gamsoptions` | Extra GAMS options | Appended to command (e.g., `threads 0`) |

### Task-specific dotted keys

Keys containing a `.` that don't match the above are task-specific settings:
`taskname.settingname=value` (e.g., `supply.curtask=sim_supply`).

---

## Step 3: Parse `*_gui_definition.xml`

The XML has a `<GGIG>` root element containing:

### Top-level defaults (direct children of `<GGIG>`)

| Element | Meaning |
|---|---|
| `<gamsFile>` | Default GAMS file to run |
| `<gamsOptions>` | Default GAMS options string |
| `<modelDir>` | Default model directory |
| `<resDir>` | Default results directory |
| `<restartDir>` | Default restart directory |
| `<datDir>` | Default data directory |
| `<scratchDir>` | Default scratch directory |
| `<scenarioDir>` | Scenario directory |
| `<defaultDirs>` | Comma-separated default directories |

### Task definitions (`<task>` elements)

Each `<task>` has these child elements:

| Element | Meaning |
|---|---|
| `<name>` | Task name (required) |
| `<gamsFile>` | GAMS file for this task (overrides top-level) |
| `<incFile>` | Include file / scenario file |
| `<instances>` | Instance configuration |
| `<type>` | Task type — `"R"` means R task, skip it |
| `<resdir>` | Task-specific results directory |
| `<runParallel>` | Whether task runs in parallel |
| `<useMeta>` | Whether task uses meta-solver |

### Workstep definitions (`<workstep>` elements)

Each `<workstep>` has `<name>` and `<tasks>` (comma-separated task names).

---

## Step 4: Resolve settings

Apply these resolution rules:

1. **INI overrides XML** — if a setting exists in both `default.ini` and the XML, the INI value wins
2. **Task resolution** — match `curtask` (from INI) against task `<name>` elements, **case-insensitive**
3. **R-task skip** — if the matched task has `<type>R</type>`, refuse to run it (it's an R task, not GAMS)
4. **gamsFile resolution** — use the task's `gamsFile` if present, otherwise use the top-level `gamsFile`
5. **Directory resolution** — resolve all relative paths against **guiDir**:
   - `modelDir`: INI `modeldir` ?? XML `modelDir` ?? `.` (guiDir itself)
   - `scratchDir`: INI `scratchdir` ?? XML `scratchDir` ?? `../output/temp`
6. **GAMS executable** — INI `gamsexe` ?? INI `gamsdir` ?? `gams` (assume on PATH)
7. **Instance number** — INI `lastinstance` ?? `1`
8. **GAMS options** — INI `gamsoptions` ?? XML `gamsOptions`

---

## Step 5: Build the GAMS command

Construct the command with arguments in this **exact order**:

```
<gamsExe> <gamsFilePath> \
  --task="<taskName>" \
  -scrdir="<scratchDir>/<instance>" \
  --scrdir="<scratchDir>/<instance>" \
  -workdir="<modelDir>" \
  -curDir="<modelDir>" \
  [-a=c] \
  -errorLog=99 \
  -ef="<modelDir>/<taskName>.exp" \
  -rf="<modelDir>/<taskName>.ref" \
  -lo=3 \
  [--scen=<incFile>] \
  --ggig=on \
  [<gamsOptions>] \
  -o=<gamsFileBase>_<instance>.lst
```

### Path resolution for gamsFile

- If `gamsFile` starts with `/`, resolve it relative to `modelDir` (strip the leading `/`)
- Otherwise, resolve it relative to `modelDir`
- `gamsFileBase` is the filename without extension (e.g., `capri` from `capri.gms`)

### Argument details

| Argument | Value | Notes |
|---|---|---|
| `<gamsFilePath>` | Resolved absolute path to the .gms file | First positional argument |
| `--task` | Task name from INI `curtask` | Double-dash (GAMS user option) |
| `-scrdir` | `<scratchDir>/<instance>` | Single-dash (GAMS system option) |
| `--scrdir` | Same as above | Double-dash duplicate — **both are required** |
| `-workdir` | Resolved `modelDir` | |
| `-curDir` | Resolved `modelDir` | Same value as workdir |
| `-a=c` | Compile-only flag | **Only** in compile mode |
| `-errorLog=99` | Max error detail | Always present |
| `-ef` | `<modelDir>/<taskName>.exp` | Expanded file |
| `-rf` | `<modelDir>/<taskName>.ref` | Reference file |
| `-lo=3` | Log option | Always present |
| `--scen` | `incFile` from task definition | **Only** if task has an `incFile` |
| `--ggig=on` | GGIG flag | Always present |
| `<gamsOptions>` | From INI or XML | Appended as-is if present |
| `-o` | `<gamsFileBase>_<instance>.lst` | Listing file name |

### Compile mode vs Execute mode

- **Execute mode** (default): omit `-a=c`
- **Compile mode**: add `-a=c` after `-curDir`

---

## Step 6: Execute the command

1. Set the **working directory** to the resolved `modelDir`
2. Run the assembled command string
3. The listing file will be written to `<modelDir>/<gamsFileBase>_<instance>.lst`

Example execution:

```bash
cd /path/to/model
/opt/gams/gams "/path/to/model/capri.gms" --task="baseline" -scrdir="/path/to/output/temp/1" --scrdir="/path/to/output/temp/1" -workdir="/path/to/model" -curDir="/path/to/model" -errorLog=99 -ef="/path/to/model/baseline.exp" -rf="/path/to/model/baseline.ref" -lo=3 --scen=baseline.inc --ggig=on -o=capri_1.lst
```

---

## Important notes

- **Double scrdir**: Both `-scrdir` and `--scrdir` are required. The single-dash version is a GAMS system option; the double-dash version passes it as a user-accessible parameter within the model code.
- **`--ggig=on`**: Always included. Tells the GAMS model it was launched from the GGIG GUI framework.
- **Quoting**: Quote all path arguments that may contain spaces. On bash, use double quotes with escaped inner quotes. On Windows cmd, use plain double quotes.
- **Re-read every time**: Always re-read `default.ini` and the XML file before building a command. Users change settings frequently via the GUI.
- **Instance subdirectory**: The scratch directory includes the instance number as a subdirectory (`scratchDir/1`, `scratchDir/2`, etc.).
- **Listing file**: The `-o` argument is just the filename (not a full path) — GAMS writes it relative to the working directory.
