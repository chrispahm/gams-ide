# Main GAMS File Configuration

The **Main GAMS File** is a central concept in GAMS-IDE for handling multi-file projects.

## Why it's important

In large projects (like FarmDyn or CAPRI), you often work on a file (e.g., `model/equations.gms`) that cannot be compiled on its own because it depends on data or sets defined elsewhere.

By setting a "Main GAMS File" (e.g., `Start.gms`), you tell GAMS-IDE:
> "No matter which file I am editing right now, when I press Run or check for errors, please compile `Start.gms`."

## Settings

### `gamsIde.mainGmsFile`

*   **Type**: String (Filename)
*   **Description**: The filename of the entry point.
*   **Recommendation**: Set this in your **Workspace Settings** so it applies to the project.

### `gamsIde.excludeFromMainGmsFile`

*   **Type**: Array of Strings (Paths/Filenames)
*   **Description**: Files or folders that should **ignore** the Main GAMS file setting.
*   **Use Case**: You have a separate data generation script (`data/generate_initial_data.gms`) that is standalone. You want to run this specific file, not the main model.
    *   Add `data/` to this exclusions list.
    *   Now, when you edit files in `data/`, hitting Run will execute the active file, not the Main GMS File.

![Exclusion settings in JSON](/screenshots/config-mainfile-exclude.png)