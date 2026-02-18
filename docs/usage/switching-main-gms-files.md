# Switching Main GMS Files

In complex projects, you might need to switch the entry point (Main GAMS File) frequently.

## Methods

### 1. Status Bar (Recommended)

Click the GAMS file name displayed in the status bar (bottom right corner of VS Code). This opens a picker with all `.gms` files in your workspace.

![GAMS Status Bar Item](/screenshots/usage-switching-statusbar.png)

### 2. Command Palette

1.  Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).
2.  Run **"GAMS: Select main GAMS file"**.

### 3. Clear Main File

If you want to return to "Run the active file" mode:
*   Run **"GAMS: Clear main GAMS file"** from the Command Palette.