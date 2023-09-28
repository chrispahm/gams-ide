# gams-ide

**🚧 This package is still in early development. If you run into issues, please submit an issue here on GitHub, or write a short mail.
The package is not in the VSCode marketplace yet, so you need to install it manually. See [Installation](#installation) below. 🚧**

A GAMS IDE plugin for VSCode. Provides a compilation checker for your [GAMS](https://www.gams.com/) models,
a sidebar for symbol investigation/navigation, and a symbol panel. Also supports listing files (.lst). Successor of the [linter-gams](https://github.com/chrispahm/linter-gams) extension for Atom.

![gams-ide](https://github.com/chrispahm/linter-gams/assets/20703207/1a615b3c-1908-48fe-ab9c-a7497c91b8f8)

## Installation
You can download the latest version of the package from the [releases page]() and install it manually by opening the command palette (`ctrl-shift-p`) and typing `Extensions: Install from VSIX...`. Then select the downloaded file.

## Configuration
### Global configuration
<img width="634" alt="gams-ide settings" src="https://github.com/chrispahm/linter-gams/assets/20703207/d25efc31-c6a7-4567-8206-9c70658a70e8">

In order to function properly, gams-ide needs a valid GAMS executable. It will check for the latest GAMS version found in the PATH variable and the default install directories (Win: `C:/GAMS/*/*/`, `N:/soft/GAMS*/`, OSX: `/Applications/GAMS*/sysdir/`, `/Applications/GAMS*/Resource/sysdir/`).
If no installation was found in the default directories, you need to specify one in the packages settings pane (as shown in the picture above). `gams-ide` runs on top of a regular GAMS installation, therefore the general [GAMS licensing](https://www.gams.com/latest/docs/UG_License.html) restrictions apply.

gams-ide will automatically check if your GAMS file is part of a [GGIG](http://www.ilr.uni-bonn.de/em/rsrch/ggig/ggig_e.htm) project and will do the necessary adjustments by itself. If you are working on a (non GGIG) multi-file model and want to specify the GAMS entry file, you may do so in the package settings pane. Note that you don't need to specify a path, but rather the actual entry point file name (e.g. entryFile.gms). gams-ide will search for this file in the parent directories.

## Usage

gams-ide will ask you to install the GAMS language grammar extension if you haven't already done so. This extension is required for the syntax highlighting and the compilation checker to work properly. See the [gams extension](https://marketplace.visualstudio.com/items?itemName=lolow.gams).

If you work on a GGIG project (CAPRI / FARMDYN), make sure you add the `trunk` folder (the one containing the `gams` and `GUI` folder) of your checkout as your Project Folder in Atom (`ctrl-shift-a` or File -> Add Project Folder...).

### Error underlining / linting
<img width="577" alt="image" src="https://github.com/chrispahm/linter-gams/assets/20703207/c5352203-a9f9-4d50-9b4e-818533d5c529">

Note that by default, only the first error will be displayed, as typically subsequent errors may be resulting from that first error. Also note that errors will only be shown in active files -> if you work on a file which is currently not enabled (e.g. due to GUI settings in GGIG projects) no error checking will be done on that file.

You can change the maximum amount of errors shown in the settings pane.

### Symbol overview

<img width="302" alt="gams-ide sidebar" src="https://github.com/chrispahm/linter-gams/assets/20703207/d00568ea-2c27-4c28-8795-4febe645117b">

In order to inspect where a variable/parameter/set was defined/assigned values/controlled/referenced or just to see its description, you can open the `GAMS Sidebar` by opening the command palette (`ctrl-shift-p`) and typing `gams: open sidebar`. If the cursor is set inside a known symbol, the sidebar will be updated accordingly. A click on a given entry will jump to that symbol (also if the symbol is in another file). If you want to keep the sidebar from constantly updating while moving the cursor (e.g. when deeply inspecting a given symbol), you can click the lock button in the top left corner.

You can also search for a symbol with the searchbar shown at the upper part of the sidebar.

**Note**: By default, the sidebar will open in the primary sidebar position on the left, which is also where the file tree is located. If you want to move the sidebar to the right side, you first have to create a secondary sidebar by clicking the respective icon at the top of the VSCode window:
<img width="238" alt="image" src="https://github.com/chrispahm/linter-gams/assets/20703207/2d2f84eb-87ed-481a-9f1b-a19d57602c85">
Now you can drag the GMS extension to the right sidebar.

### Symbol panel
![Symbol panel](https://github.com/chrispahm/linter-gams/assets/20703207/8acd6e9c-9d16-4e5c-be19-f8d156ec7ae3)

Values of sets and paramters, as well as the equation listing for equations or the column listing for variables can be shown with the symbol panel feature. In order to activate, turn on the configuration in the `gams-ide` configuration panel, open the bottom dock and then click on a GAMS symbol (as shown in the GIF above). The symbol panel feature will parse your GAMS file for solve statements, and will try to show the available data right before any solve statement. You can cycle through the solve statements with a dropdown menu at the top right of the symbol panel.

If the symbol panel does not show any values, make sure that a) your model is free of compilation errors and b) has at least one solve statement

### Running your model

There are multiple options for running your model: 

 - Click the 'play' button in the sidebar
 - Open the command palette (`ctrl-shift-p`) and type `GAMS run` or just `run` followed by `enter`. 

 The model will be solved in the background, so you can continue working. While the model is solving, the bottom panel will open and show the models console output. Once the model is solved, the listing file will be opened automatically in a new tab.

### Inspecting a parameter / set at a given position

Sometimes you need to check your parameters/sets values at a given position. Often, an abort statement is used in order to stop execution at that point and to display the values of the parameter. gams-ide gives you two options on how to speed up that process:

If you type
```GAMS
abort myParameterOrSet;
```
and run your model (see section above), gams-ide will automatically jump to the parameter display in the listing file. Make sure you have the GAMS View sidebar opened, otherwise the listing file will be opened at the beggining of the document.

## Gotchas
It may occur, that the `GAMS Sidebar` is not updating for a symbol that you click upon.

In that case, the symbol you clicked is not read by the GAMS compiler, and you need to check your code logic (e.g. `$if` statements) for why the symbol is not read.
Example
```GAMS
$SETGLOBAL Country "France"

$iftheni.de %Country%=="Germany"
  set test / 'Lederhosen', 'Wurst'/;
* If you click on the set `test`, the `Gams Sidebar` will not update or show anything
* because this part of the code is not read by the compiler.
* It will show just fine if you change the value of the $SETGLOBAL to "Germany"
$endif.de
```

## Contributing

Please feel free to submit an issue or a pull request!

## License

gams-ide is available under the [MIT license](http://opensource.org/licenses/MIT).

Note that this packages is not affiliated to the official GAMS development corp.