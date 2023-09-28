const vscode = require("vscode");
const { which } = require('shelljs');
const { glob, globSync } = require('glob');
const os = require('os');

module.exports = async function getGamsPath() {
  const defaultSettings = vscode.workspace.getConfiguration("gamsIde");
  let gamsExecutable = defaultSettings.get("gamsExecutable");
  
  // if there is no gamsExecutable, try to find it in the PATH
  if (!gamsExecutable) {
    const gamsPath = which('gams')
    if (gamsPath) {
      gamsExecutable = gamsPath
      // update the workspace settings
      vscode.workspace.getConfiguration().update("gamsIde.gamsExecutable", gamsExecutable, vscode.ConfigurationTarget.Workspace);
      // show info message, with button to open settings
      const openSettings = 'Open Settings';
      vscode.window.showInformationMessage(`Found GAMS executable at ${gamsExecutable}, now stored in workspace settings.`, openSettings).then(selection => {
        if (selection === openSettings) {
          vscode.commands.executeCommand('workbench.action.openSettings', '@ext:GAMS.gams-ide gamsExecutable');
        }
      });
    }
  }
  
  // if there is still no gamsExecutable, try to find it in the default installation directories
  if (!gamsExecutable) {
    if (os.platform() === 'win32') {
      const checkC = await glob('C:/GAMS/*/*/gams.exe')
      const checkN = await glob('N:/soft/GAMS*/gams.exe')
      if (checkC.length > 0) {
        // use the latest Version of GAMS that was found
        if (Array.isArray(checkC)) {
          gamsExecutable = checkC[checkC.length - 1]
        } else {
          gamsExecutable = checkC
        }
        gamsExecutable = checkC[checkC.length - 1]
      } else if (checkN.length > 0) {
        if (Array.isArray(checkN)) {
          gamsExecutable = checkN[checkN.length - 1]
        } else {
          gamsExecutable = checkN
        }
      }
    } else if (os.platform() === 'darwin') {
      const paths = [
        '/Applications/GAMS*/sysdir/gams',
        '/Applications/GAMS*/Resources/sysdir/gams',
        '/Library/Frameworks/GAMS.framework/Versions/Current/Resources/gams'
      ]
      const working = paths.find(curPath => {
        const present = globSync(curPath)
        if (present && present.length > 0) return present
      })
      if (working.length > 0) {
        if (Array.isArray(working)) {
          gamsExecutable = working[working.length - 1]
        } else {
          gamsExecutable = working
        }
      }
    } else if (os.platform() === 'linux') {
      gamsExecutable = '/opt/gams/gams24.8_linux_x64_64_sfx'
    }
    if (gamsExecutable) {
      vscode.workspace.getConfiguration().update("gamsIde.gamsExecutable", gamsExecutable, vscode.ConfigurationTarget.Workspace);
      // show info message, with button to open settings
      const openSettings = 'Open Settings';
      vscode.window.showInformationMessage(`Found GAMS executable at ${gamsExecutable}, now stored in workspace settings.`, openSettings).then(selection => {
        if (selection === openSettings) {
          vscode.commands.executeCommand('workbench.action.openSettings', '@ext:GAMS.gams-ide gamsExecutable');
        }
      });

    }
  }

  if (!gamsExecutable) {
    // show error message and button with link to settings
    const openSettings = 'Open Settings';
    vscode.window.showErrorMessage(`GAMS executable not found. Please update the workspace settings.`, openSettings).then(selection => {
      if (selection === openSettings) {
        vscode.commands.executeCommand('workbench.action.openSettings', '@ext:GAMS.gams-ide gamsExecutable');
      }
    });
  }
  
  console.log("gamsExecutable", gamsExecutable);
  
  return gamsExecutable
}