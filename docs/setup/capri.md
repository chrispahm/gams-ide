# Setting up CAPRI

[CAPRI](https://www.capri-model.org/) (Common Agricultural Policy Regionalised Impact) is a global agricultural economic model.

## 1. Checkout the Repository

Obtain the CAPRI code, typically via SVN or Git, depending on your team's workflow.

## 2. Open in VS Code

Open the root folder of your CAPRI checkout in VS Code (`File > Open Folder...`).

## 3. Configure Compiling

CAPRI's execution flow usually starts with `capmod.gms`.

1.  Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and search for **"GAMS: Select main GAMS file"**.
2.  Select `capmod.gms` from the list.

![Selecting capmod.gms as the main GAMS file](/screenshots/setup-capri-mainfile.png)

## 4. Workspaces & GAMS Version

Ensure your GAMS executable is correctly configured in the [Settings](../configuration/settings.md) if it's not in your system PATH. CAPRI often requires a specific GAMS version; you can point GAMS-IDE to that specific installation for this workspace.

::: info
If you need to pass specific parameters to CAPRI start (e.g., restart files), configure them in `gamsIde.commandLineArguments_execution` in your workspace settings.
:::