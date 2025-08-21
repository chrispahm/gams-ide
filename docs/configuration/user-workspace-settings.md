<script setup>
import { useData } from 'vitepress'

const { isDark } = useData()
</script>

# User and Workspace Settings

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


To learn more about user and workspace settings, you can read the [official VSCode documentation](https://code.visualstudio.com/docs/getstarted/settings).