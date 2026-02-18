# Compiling and Executing GAMS

## Running the Model

To execute your GAMS model:

1.  Open the file you want to run (or ensure the Main GAMS File is set).
2.  Press `F5` or click the **Run** button (play icon) in the top right editor toolbar.
3.  Select **"GAMS: Run"** from the command palette.

![Run button in toolbar](/screenshots/usage-compile-runbutton.png)

### Run This File vs. Run Main File

*   **Standard Run**: Executes the configured [Main GAMS File](../configuration/main-gms-file.md). This is what you usually want for multi-file models.
*   **Run This File**: Executes the currently active file in the editor, ignoring the "Main GAMS File" setting. Useful for quick tests of isolated scripts.

## Compiling (Syntax Check)

To check for syntax errors without running the full model (which might take a long time):

*   **On Save**: By default, GAMS-IDE checks for errors every time you save a file.
*   **Manual Check**: Press `Ctrl+Shift+B` (or `Cmd+Shift+B`) to trigger the "GAMS: Compile" command.

::: tip
Compilation is much faster than execution because it stops after the GAMS compilation phase, before the solver starts.
:::