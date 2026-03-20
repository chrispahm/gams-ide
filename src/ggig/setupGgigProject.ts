import * as vscode from 'vscode';
import { dirname, resolve } from 'path';
import { parseGgigIni, findDefaultIni, type GgigIniSettings } from './parseDefaultIni';
import { parseGgigXml, findGgigXml, type GgigXmlConfig, type GgigTaskDef } from './parseGgigXml';
import { buildGamsCommand } from './buildGamsCommand';

interface SettingPickItem extends vscode.QuickPickItem {
	settingKey: 'gamsExecutable' | 'mainGmsFile' | 'commandLineArgs' | 'scratchDirectory';
}

export async function setupGgigProject(): Promise<boolean> {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders || workspaceFolders.length === 0) {
		vscode.window.showWarningMessage('No workspace folder open. Open a GAMS project folder first.');
		return false;
	}

	// Search across all workspace folders
	let iniPath: string | undefined;
	for (const folder of workspaceFolders) {
		iniPath = await findDefaultIni(folder.uri.fsPath);
		if (iniPath) break;
	}

	if (!iniPath) {
		const result = await vscode.window.showInformationMessage(
			'No GGIG default.ini found in this workspace. This setup is for GGIG-based models (CAPRI, FarmDyn, CGEBOX).',
			'Configure manually',
			'Cancel'
		);
		if (result === 'Configure manually') {
			vscode.commands.executeCommand('workbench.action.openSettings', 'gamsIde');
		}
		return false;
	}

	const guiDir = dirname(iniPath);

	// Parse INI
	let iniSettings: GgigIniSettings;
	try {
		iniSettings = await parseGgigIni(iniPath);
	} catch (e) {
		vscode.window.showErrorMessage(`Failed to parse ${iniPath}: ${e instanceof Error ? e.message : String(e)}`);
		return false;
	}

	// Try to find and parse XML definition
	let xmlConfig: GgigXmlConfig | undefined;
	const xmlPath = await findGgigXml(guiDir);
	if (xmlPath) {
		try {
			xmlConfig = await parseGgigXml(xmlPath);
		} catch (e) {
			console.warn('Failed to parse GGIG XML:', e);
		}
	}

	// If we have XML with tasks, let the user pick a task
	let selectedTask: GgigTaskDef | undefined;
	if (xmlConfig && xmlConfig.tasks.length > 0) {
		// Filter to GAMS tasks only (exclude R tasks and tasks without gamsFile)
		const gamsTasks = xmlConfig.tasks.filter(t => t.type !== 'R' && t.gamsFile);

		if (gamsTasks.length > 0) {
			const taskItems = gamsTasks.map(t => ({
				label: t.name,
				description: t.gamsFile,
				detail: t.incFile ? `incFile: ${t.incFile}` : undefined,
				picked: iniSettings.currentTask?.toLowerCase() === t.name.toLowerCase(),
				task: t,
			}));

			// Pre-select current task
			const currentTaskItem = taskItems.find(t => t.picked);

			const pickedTask = await vscode.window.showQuickPick(taskItems, {
				title: 'Select GGIG Task',
				placeHolder: currentTaskItem
					? `Current task: "${currentTaskItem.label}" (press Enter to keep)`
					: 'Select the task to configure',
			});

			if (pickedTask) {
				selectedTask = pickedTask.task;
			} else if (currentTaskItem) {
				selectedTask = currentTaskItem.task;
			}
		}
	}

	// Build resolved settings
	const modelDir = resolve(guiDir, iniSettings.modelDir ?? xmlConfig?.modelDir ?? '.');
	const scratchDir = resolve(guiDir, iniSettings.scratchDir ?? xmlConfig?.scratchDir ?? '../output/temp');

	// Resolve main GMS file from task or XML config
	let mainGmsFile: string | undefined;
	let commandLineArgs: string[] = [];

	if (selectedTask && xmlConfig) {
		try {
			const spec = buildGamsCommand({
				xmlConfig,
				iniSettings: {
					...iniSettings,
					currentTask: selectedTask.name,
				},
				guiDir,
				mode: 'execute',
				shell: 'bash',
			});

			// Extract the gamsFile path (first arg, unquoted)
			mainGmsFile = spec.args[0]?.replace(/^"(.*)"$/, '$1');
			// Extract command line args (skip first arg which is gamsFile, and skip -o= listing)
			commandLineArgs = spec.args.slice(1).filter(a => !a.startsWith('-o='));
		} catch {
			// Fall back to manual resolution
			const gamsFileRel = selectedTask.gamsFile ?? xmlConfig.gamsFile;
			if (gamsFileRel) {
				if (gamsFileRel.startsWith('/')) {
					mainGmsFile = resolve(modelDir, gamsFileRel.substring(1));
				} else {
					mainGmsFile = resolve(modelDir, gamsFileRel);
				}
			}
			if (selectedTask.incFile) {
				commandLineArgs = [`--scen=${selectedTask.incFile}`, '--ggig=on'];
			} else {
				commandLineArgs = ['--ggig=on'];
			}
		}
	}

	// Build QuickPick items
	const items: SettingPickItem[] = [];
	const config = vscode.workspace.getConfiguration('gamsIde');

	if (iniSettings.gamsExecutable) {
		items.push({
			label: `$(gear) GAMS executable`,
			description: iniSettings.gamsExecutable,
			detail: 'Path to the GAMS executable from default.ini',
			picked: true,
			settingKey: 'gamsExecutable',
		});
	}
	if (mainGmsFile) {
		items.push({
			label: `$(file) Main GAMS file`,
			description: mainGmsFile,
			detail: selectedTask ? `From GGIG task: "${selectedTask.name}"` : undefined,
			picked: true,
			settingKey: 'mainGmsFile',
		});
	}
	if (commandLineArgs.length > 0) {
		items.push({
			label: `$(terminal) Execution arguments`,
			description: commandLineArgs.join(' '),
			detail: 'Command line arguments for GAMS execution',
			picked: true,
			settingKey: 'commandLineArgs',
		});
	}
	items.push({
		label: `$(folder) Scratch directory`,
		description: scratchDir,
		detail: 'Temporary directory for GAMS scratch files',
		picked: true,
		settingKey: 'scratchDirectory',
	});

	if (items.length === 0) {
		vscode.window.showInformationMessage('Found default.ini but could not extract useful settings.');
		return false;
	}

	// Show QuickPick
	const selected = await vscode.window.showQuickPick(items, {
		canPickMany: true,
		title: 'GGIG Project Setup',
		placeHolder: `Select settings to apply from ${iniPath}`,
	});

	if (!selected || selected.length === 0) {
		return false;
	}

	// Apply selected settings
	const selectedKeys = new Set(selected.map(s => s.settingKey));

	if (selectedKeys.has('gamsExecutable') && iniSettings.gamsExecutable) {
		await config.update('gamsExecutable', iniSettings.gamsExecutable, vscode.ConfigurationTarget.Workspace);
	}

	if (selectedKeys.has('mainGmsFile') && mainGmsFile) {
		await config.update('mainGmsFile', mainGmsFile, vscode.ConfigurationTarget.Workspace);
	}

	if (selectedKeys.has('commandLineArgs') && commandLineArgs.length > 0) {
		await config.update('commandLineArguments_execution', commandLineArgs, vscode.ConfigurationTarget.Workspace);
	}

	if (selectedKeys.has('scratchDirectory')) {
		await config.update('scratchDirectory', scratchDir, vscode.ConfigurationTarget.Workspace);
	}

	vscode.window.showInformationMessage(`GGIG project configured! Applied ${selected.length} setting(s).`);
	return true;
}

/**
 * Auto-detect GGIG project and offer setup. Non-blocking.
 * Tracks dismissal count to avoid being annoying.
 */
export async function detectAndOfferGgigSetup(context: vscode.ExtensionContext): Promise<void> {
	try {
		const dismissCount = context.workspaceState.get<number>('gamsIde.ggigSetupDismissCount', 0);
		const neverAsk = context.workspaceState.get<boolean>('gamsIde.ggigSetupNeverAsk', false);

		if (neverAsk || dismissCount >= 3) return;

		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders?.length) return;

		let iniPath: string | undefined;
		for (const folder of workspaceFolders) {
			iniPath = await findDefaultIni(folder.uri.fsPath);
			if (iniPath) break;
		}
		if (!iniPath) return;

		// Only offer if settings look like defaults (not already configured)
		const mainGmsFile = vscode.workspace.getConfiguration('gamsIde').get<string>('mainGmsFile');
		const isDefaultConfig = !mainGmsFile || mainGmsFile === 'exp_starter.gms';
		if (!isDefaultConfig) return;

		const result = await vscode.window.showInformationMessage(
			'GGIG project detected (default.ini found). Would you like to auto-configure GAMS IDE?',
			'Setup Now',
			'Later',
			"Don't Ask Again"
		);

		if (result === 'Setup Now') {
			await setupGgigProject();
			await context.workspaceState.update('gamsIde.ggigSetupNeverAsk', true);
		} else if (result === "Don't Ask Again") {
			await context.workspaceState.update('gamsIde.ggigSetupNeverAsk', true);
		} else {
			await context.workspaceState.update('gamsIde.ggigSetupDismissCount', dismissCount + 1);
		}
	} catch (e) {
		console.error('GGIG auto-detection failed:', e);
	}
}
