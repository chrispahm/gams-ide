# Setting up CGEBOX

CGEBOX is a modular CGE modeling platform associated with the University of Bonn.

## 1. Get the Code

Clone or download the CGEBOX repository/source.

## 2. Open in VS Code

Open the CGEBOX folder in VS Code.

## 3. Configure Compiling

The main entry file for CGEBOX is typically `com_.gms`.

1.  Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and search for **"GAMS: Select main GAMS file"**.
2.  Select `com_.gms` from the list.

![Selecting com_.gms as the main GAMS file](/screenshots/setup-cgebox-mainfile.png)

## 4. Run & Debug

With `com_.gms` set as the main file, you can now:
*   **Compile**: `Ctrl+Shift+B` (or `Cmd+Shift+B`) to check for syntax errors across the entire model.
*   **Run**: `F5` to execute the full model logic.