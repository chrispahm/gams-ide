# Setting up FarmDyn

[FarmDyn](https://farmdyn.github.io/documentation/) is a bio-economic simulation model for agricultural farms.

## 1. Clone the Repository

Clone the FarmDyn repository to your local machine:

```bash
git clone https://github.com/FarmDyn/FarmDyn.git
```

## 2. Open in VS Code

Open the cloned folder in VS Code (`File > Open Folder...`).

## 3. Configure Compiling

FarmDyn uses `exp_starter.gms` as the main entry point for execution. You need to tell GAMS-IDE to use this file.

1.  Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and search for **"GAMS: Select main GAMS file"**.
2.  Select `exp_starter.gms` from the list.

Alternatively, you can click on the GAMS file selector in the Status Bar (bottom right) and choose `exp_starter.gms`.

![Selecting exp_starter.gms as the main GAMS file](/screenshots/setup-farmdyn-mainfile.png)

## 4. Run the Model

You are now ready to run the model!

*   Press `F5` or click the **Run** button (play icon) in the top right corner.
*   GAMS-IDE will execute `exp_starter.gms`, even if you are currently editing a different file within the project.

::: tip
Check out the [Usage](../usage/overview.md) section to learn more about debugging and analyzing results.
:::