# Setup

## Prerequisites

You need to have [GAMS](https://www.gams.com/) and [Visual Studio Code](https://code.visualstudio.com/) installed on your system to use GAMS-IDE. If you don't have GAMS installed yet, you can download it from the [GAMS website](https://www.gams.com/download/). 

For running GAMS models, you also need to have a valid GAMS license. If you don't have a license yet, you can request a free community license from the [GAMS website](https://www.gams.com/latest/docs/UG_License.html#GAMS_Community_Licenses).

## Installation

### VS Code Marketplace

The easiest way to install GAMS-IDE is to use the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=chrispahm.gams-ide). Simply search for "GAMS-IDE" in the extensions tab of VS Code, and click install.

### VSIX Package

Alternatively, you can download the latest VSIX package from the [releases page](https://github.com/chrispahm/gams-ide/releases). 

Then, open the extensions tab in VS Code, click the three dots in the top right corner, and select "Install from VSIX...". Select the downloaded VSIX file, and click "Install".

## Quick Start

After installing the extension, you can open a GAMS file in VS Code. The extension will automatically detect the file type and activate the GAMS-IDE features.

GAMS-IDE will try to detect a GAMS installation on your system. If it cannot find one, you will be prompted to select the GAMS executable. You can also select the GAMS executable manually by setting the `gamsIde.gamsExecutable` configuration option in the [VS Code Settings](https://code.visualstudio.com/docs/getstarted/settings). See the [Configuration](/configuration/settings.html#gamsExecutable) section for more details.
