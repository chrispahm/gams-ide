<script setup>
import { useData } from 'vitepress'

const { isDark } = useData()
</script>

# Settings

This page provides some background on how settings are managed in VSCode, as well as an overview of all settings available in the GAMS-IDE extension.

If you're already familiar with VSCode and its setting management, you can directly jump to the [List of all settings](#list-of-all-settings). Detailed descriptions of the settings follow in section [Detailed Descriptions of All Settings](#detailed-descriptions-of-all-settings) below.

## Background: Difference between User and Workspace Settings

::: info 💡 TL;DR
Settings can be changed globally (user level) and per project (workspace level).
Make your life easier by applying settings such as the path to the GAMS executable on the user level, and project-specific settings such as the main GAMS file to execute on the workspace level.

Workspace settings are stored in a `.vscode` folder at the root of your workspace. This folder can be shared with your team through version control, so they can easily use the same settings (e.g. main GAMS file etc.) as you.
:::

Every setting in VSCode can be changed on a user and on a workspace (project) level.

- **User Settings** - Settings that apply globally to any instance of VS Code you open. 

- **Workspace Settings** - Settings stored inside your workspace and only apply when the workspace is opened. These are stored in a JSON file located in a `.vscode` folder at the root of your workspace.

You can access the settings by opening the **Command Palette** (Ctrl+Shift+P) and typing `Preferences: Open Settings (UI)`. Then, in the search box, type `gamsIde` to filter the settings related to the extension. You can also switch between the **User** and **Workspace** tabs to see the different settings scopes.

::: tip 💡 Faster ways to open the settings
You can also open the settings by clicking the gear icon in the bottom left corner of the sidebar, or by pressing `Ctrl+,` (`Cmd+,` on Mac).
:::

User settings are useful for defining default settings that likely won't change between different projects or models, such as the path to the GAMS executable.  
In the example below, the `gamsIde.gamsExecutable` settings has been changed on the user level. This means that this setting will be applied to any instance of VSCode you open.
<img :src="isDark ? '/settings-dark.png' : '/settings.png'">

Workspace settings are useful for sharing project-specific settings across a team. For example, you can specify the main GAMS file to execute, the scratch directory to use, or the command line arguments to pass to GAMS for each project.  
In the example below, the `gamsIde.defaultParameterToJumpToAfterSolve` setting has been changed on the workspace level. This means that this setting will only be applied when the workspace is opened.
<img :src="isDark ? '/workspace-settings-dark.png' : '/workspace-settings.png'">

::: warning ℹ️ Workspace settings override user settings
If you have a user setting and a workspace setting for the same setting, the workspace setting will be applied.
:::

Another benefit of using workspace settings is that they can be shared with your team through version control. This means that you can easily share your project-specific settings with your team by committing the `.vscode` folder to your version control system.
<img :src="isDark ? '/workspace-settings-json-dark.png' : '/workspace-settings-json.png'">


To learn more about user and workspace settings, you can read the [official VSCode documentation](https://code.visualstudio.com/docs/getstarted/settings).


## List of all settings

::: info 💡 TL;DR
If you're looking for the fastest way to get up and running, only the [`gamsExecutable`](#gamsExecutable) and [`scratchDirectory`](#scratchDirectory) settings are required. The rest of the settings are optional and can be changed later.
:::

| Setting | Description |
| --- | --- |
| [gamsExecutable](#gamsExecutable) | Path to GAMS executable, defaults to PATH or common directories. |
| [scratchDirectory](#scratchDirectory) | The directory where gams-ide will read/write temp files. |
| [enableModelIncludeTreeView](#enableModelIncludeTreeView) | Enable a tree view of all includes/batincludes of the model in the sidebar. |
| [maxErrorsToDisplay](#maxErrorsToDisplay) | Maximum number of errors that will be highlighted by gams-ide. |
| [showCompilationNotifications](#showCompilationNotifications) | Notify when GAMS encountered system issues during compilation. |
| [jumpToFirstError](#jumpToFirstError) | Automatically scroll to the first error in the listing file when compilation errors are encountered. |
| [jumpToAbort](#jumpToAbort) | Automatically scroll to the first abort parameter found in the listing file. |
| [autoUnfoldListingEntriesTreshold](#autoUnfoldListingEntriesTreshold) | Automatically unfold listing entries if their amount does not exceed this value. |
| [onlyAutoUnfoldDisplayStatements](#onlyAutoUnfoldDisplayStatements) | Limit 'Auto unfold listing entries treshold' to display statements only. |
| [defaultParameterToJumpToAfterSolve](#defaultParameterToJumpToAfterSolve) | The listing will be auto-scrolled to this display paramter after a solve, if found. |
| [autoScrollToEndOfListing](#autoScrollToEndOfListing) | Automatically scroll to the end of the listing after a solve. |
| [mainGmsFile](#mainGmsFile) | Main GAMS file to execute if your model consists of multiple files. |
| [excludeFromMainGmsFile](#excludeFromMainGmsFile) | Ignore the 'main GAMS file' setting for these files and folders. |
| [commandLineArguments_compilation](#commandLineArguments_compilation) | Additional command line arguments to pass to GAMS during compilation. |
| [commandLineArguments_execution](#commandLineArguments_execution) | Additional command line arguments to pass to GAMS during execution. |
| [parseGamsData](#parseGamsData) | Show symbol values for each solve in a console panel in the bottom dock. |

## Detailed descriptions of all settings

This section provides detailed descriptions of all settings available in the GAMS-IDE extension.

**<a id="gamsExecutable"></a>gamsExecutable** (*string*, required): Path to GAMS executable, defaults to PATH or common directories.
> This setting allows you to specify the location of the GAMS executable file on your system. If you leave it blank, gams-ide will try to find it in your PATH environment variable or in some common install directories. If you have multiple versions of GAMS installed, you can use this setting to choose which one to use.

> Default: `""`

**<a id="scratchDirectory"></a>scratchDirectory** (*string*, required): The directory where gams-ide will read/write temp files.
> This setting allows you to specify the directory where gams-ide will store temporary files during compilation and execution. These files include the listing file, the gdx file, and any other files generated by GAMS. It is recommended to use a directory on a fast internal disk, such as an SSD, to improve performance.

> Default: `""`

**<a id="enableModelIncludeTreeView"></a>enableModelIncludeTreeView** (*boolean*): Enable a tree view of all includes/batincludes of the model in the sidebar.
> This setting allows you to enable or disable a tree view of all the include and batinclude files used by your model in the sidebar. This can help you navigate and edit your model more easily. To use this feature, make sure that the 'Include File Summary' option is turned on in your GAMS options file, and that you don't use $offInclude in your model source code.

> Default: `true`

**<a id="maxErrorsToDisplay"></a>maxErrorsToDisplay** (*number*): Maximum number of errors that will be highlighted by gams-ide.
> This setting allows you to limit the number of errors that will be highlighted by gams-ide in your source code. If you set it to 0, there will be no limit. However, keep in mind that sometimes only the first error reported by GAMS is an actual error, while the subsequent errors are just consequences of the first one. Therefore, it may be more useful to focus on fixing the first error rather than looking at all of them.

> Default: `1`

**<a id="showCompilationNotifications"></a>showCompilationNotifications** (*boolean*): Notify when GAMS encountered system issues during compilation.
> This setting allows you to enable or disable notifications when GAMS encounters system issues during compilation. These issues may include missing .opt files, invalid command line arguments, or other problems that prevent GAMS from compiling your model properly. If you enable this setting, you will see a pop-up message with the details of the issue and a link to the listing file where you can find more information.

> Default: `true`

**<a id="jumpToFirstError"></a>jumpToFirstError** (*boolean*): Automatically scroll to the first error in the listing file when compilation errors are encountered.
> This setting allows you to enable or disable automatic scrolling to the first error in the listing file when compilation errors are encountered. If you enable this setting, gams-ide will open the listing file and scroll to the line where the first error occurred. This can help you locate and fix the error more quickly.

> Default: `true`

**<a id="jumpToAbort"></a>jumpToAbort** (*boolean*): Automatically scroll to the first abort parameter found in the listing file.
> This setting allows you to enable or disable automatic scrolling to the first abort parameter found in the listing file. An abort parameter is a special parameter that can be used to stop GAMS execution with a custom message. If you enable this setting, gams-ide will open the listing file and scroll to the line where the abort parameter was defined. This can help you understand why your model was aborted and what needs to be changed.

> Default: `true`

**<a id="autoUnfoldListingEntriesTreshold"></a>autoUnfoldListingEntriesTreshold** (*number*): Automatically unfold listing entries if their amount does not exceed this value.
> This setting allows you to specify a threshold for automatically unfolding listing entries in the listing file. Listing entries are sections of the listing file that show information about your model, such as displays, reports, summaries, etc. If you set this value to a positive number, gams-ide will automatically unfold any listing entry that has less than or equal to that number of lines. If you set it to 0, no listing entry will be automatically unfolded.

> Default: `10`

**<a id="onlyAutoUnfoldDisplayStatements"></a>onlyAutoUnfoldDisplayStatements** (*boolean*): Limit 'Auto unfold listing entries treshold' to display statements only.
> This setting allows you to limit the 'Auto unfold listing entries treshold' setting to display statements only. Display statements are a type of listing entry that show the values of symbols or expressions in your model. If you enable this setting, gams-ide will only automatically unfold display statements that meet the threshold, and ignore other types of listing entries, such as reports, summaries, etc.

> Default: `true`

**<a id="defaultParameterToJumpToAfterSolve"></a>defaultParameterToJumpToAfterSolve** (*string*): The listing will be auto-scrolled to this display paramter after a solve, if found.
> This setting allows you to specify a default parameter to jump to after a solve statement. A solve statement is a statement that instructs GAMS to solve your model using a solver. If you set this value to a valid parameter name, gams-ide will automatically scroll to the display statement that shows the value of that parameter after a solve statement. This can help you see the results of your model more easily.

> Default: `"p_sumRes"`

**<a id="autoScrollToEndOfListing"></a>autoScrollToEndOfListing** (*boolean*): Automatically scroll to the end of the listing after a solve.
> This setting allows you to enable or disable automatic scrolling to the end of the listing file after a solve statement. If you enable this setting, gams-ide will open the listing file and scroll to the end after a solve statement. This can help you see the final status of your model and any messages from the solver or GAMS.

> Default: `true`

**<a id="mainGmsFile"></a>mainGmsFile** (*string*): Main GAMS file to execute if your model consists of multiple files.
> This setting allows you to specify the main GAMS file to execute if your model consists of multiple files. A main GAMS file is a file that contains the main logic and structure of your model, and usually includes or batincludes other files that define symbols, data, equations, etc. If you set this value to a valid file name, gams-ide will execute that file when you press the 'Run' button, and compile it when saving any file in your workspace. This can help you run and test your model more easily. Some examples of common main GMS files are 'exp_starter.gms' for FarmDyn, 'capmod.gms' for CAPRI, and 'com_.gms' for CGEBOX.

> Default: `"exp_starter.gms"`

**<a id="excludeFromMainGmsFile"></a>excludeFromMainGmsFile** (*array*): Ignore the 'main GAMS file' setting for these files and folders.
> This setting allows you to specify a list of files and folders that should be ignored by the 'main GAMS file' setting. This is useful if you have some files or folders that are only used for data generation, but not for the actual model. For example, if you have a folder called 'data' that contains some scripts and data files that are used to generate a gdx file for your model, but not included in your main GMS file, you can add 'data' to this list. This way, gams-ide will not try to compile or execute these files when saving or running your model. Note that only relative and absolute paths without glob characters are supported. Relative paths are relative to the (first) workspace root.

> Default: `[]`

**<a id="commandLineArguments_compilation"></a>commandLineArguments_compilation** (*array*): Additional command line arguments to pass to GAMS during compilation.
> This setting allows you to specify a list of additional command line arguments to pass to GAMS during compilation. Compilation is the process of checking your model syntax and generating an executable file for execution. You can use this setting to customize some aspects of compilation, such as output format, debug level, etc. For example, if you want to generate an HTML output instead of a listing file, you can add '--out=html' to this list. For more information on available command line arguments, please refer to [the GAMS documentation].

> Default: `[]`

**<a id="commandLineArguments_execution"></a>commandLineArguments_execution** (*array*): Additional command line arguments to pass to GAMS during execution.
> This setting allows you to specify a list of additional command line arguments to pass to GAMS during execution. Execution is the process of running your model using a solver and generating results. You can use this setting to customize some aspects of execution, such as solver options, solver trace, etc. For example, if you want to use CPLEX as your solver and see the solver trace during execution, you can add '--solver=cplex --trace=3' to this list. For more information on available command line arguments, please refer to [the GAMS documentation].

> Default: `[]`

**<a id=“parseGamsData”></a>parseGamsData** (*boolean*): Show symbol values for each solve in a console panel in the bottom dock.

> This setting allows you to enable or disable the parsing of GAMS data in the console panel in the bottom dock. If you enable this setting, gams-ide will show the values of all symbols (sets, parameters, variables, equations) for each solve statement in a tabular format in the console panel. This can help you inspect and compare your results more easily. However, this feature may consume a lot of memory and CPU resources, especially if your model has many symbols or solves. Therefore, it is recommended to use this feature only on high end computers with at least 8gb of RAM. 

>Default: `false`