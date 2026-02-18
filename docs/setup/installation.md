# Installation

Getting started with GAMS-IDE is easy. You'll need to have VS Code and GAMS installed on your system.

## Prerequisites

1.  **VS Code**: Download and install Visual Studio Code from [code.visualstudio.com](https://code.visualstudio.com/).
2.  **GAMS**: Download and install the method appropriate for your operating system from [gams.com](https://www.gams.com/download/).
    *   *Note: Ensure GAMS is added to your system's PATH, or you will need to configure the `gamsExecutable` path manually in the extension settings.*

## Installing the Extension

The GAMS-IDE extension is available on the Visual Studio Code Marketplace.

1.  Open VS Code.
2.  Go to the **Extensions** view by clicking on the Extensions icon in the Activity Bar on the side of the window or by pressing `Ctrl+Shift+X` (Windows/Linux) or `Cmd+Shift+X` (macOS).
3.  Search for `GAMS-IDE`.
4.  Click **Install**.

![Searching for GAMS-IDE in the VS Code Marketplace](/screenshots/installation-marketplace.png)

## Verifying the Installation

To verify that the extension is working correctly:

1.  Open a `.gms` file.
2.  You should see syntax highlighting for GAMS code.
3.  The status bar should show GAMS-related information.

::: tip
If you encounter any issues, check the [Troubleshooting](../usage/finding-compilation-errors.md) section or ensure your GAMS installation is correctly configured in the [Settings](../configuration/settings.md).
:::
