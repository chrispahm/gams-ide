import * as vscode from 'vscode';
import { dirname, resolve, basename } from 'path';
import { findDefaultIni, parseGgigIni, type GgigIniSettings } from './parseDefaultIni';
import { findGgigXml, parseGgigXml, type GgigXmlConfig } from './parseGgigXml';
import getGamsPath from '../utils/getGamsPath';

export interface OnboardingState {
	step: 'welcome' | 'project-type' | 'capri-options' | 'non-capri-options' |
		'custom-paths' | 'capri-sub-options' | 'manual-setup' | 'complete';
	capriDetected: boolean;
	detectedIniPath?: string;
	detectedXmlPath?: string;
	detectedSettings?: {
		gamsExecutable?: string;
		currentTask?: string;
		modelDir?: string;
		tasks?: Array<{ name: string; gamsFile?: string }>;
	};
	manualStep?: 'gams-executable' | 'main-file' | 'scratch-dir' | 'exec-args' | 'compile-args' | 'compile-on-save';
	gamsFiles?: string[];
	detectedGamsPath?: string;
	currentSettings?: Record<string, any>;
	summary?: Record<string, string>;
}

const MANUAL_STEPS: OnboardingState['manualStep'][] = [
	'gams-executable', 'main-file', 'scratch-dir', 'exec-args', 'compile-args', 'compile-on-save'
];

async function detectCapriProject(): Promise<{
	iniPath?: string;
	xmlPath?: string;
	iniSettings?: GgigIniSettings;
	xmlConfig?: GgigXmlConfig;
}> {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders?.length) return {};

	for (const folder of workspaceFolders) {
		const iniPath = await findDefaultIni(folder.uri.fsPath);
		if (!iniPath) continue;

		const guiDir = dirname(iniPath);
		const xmlPath = await findGgigXml(guiDir);
		if (!xmlPath) continue;

		try {
			const [iniSettings, xmlConfig] = await Promise.all([
				parseGgigIni(iniPath),
				parseGgigXml(xmlPath),
			]);
			return { iniPath, xmlPath, iniSettings, xmlConfig };
		} catch {
			return { iniPath, xmlPath };
		}
	}

	// Try finding just an INI without XML
	for (const folder of workspaceFolders) {
		const iniPath = await findDefaultIni(folder.uri.fsPath);
		if (iniPath) {
			try {
				const iniSettings = await parseGgigIni(iniPath);
				return { iniPath, iniSettings };
			} catch {
				return { iniPath };
			}
		}
	}

	return {};
}

export async function getOnboardingState(context: vscode.ExtensionContext): Promise<OnboardingState> {
	const detection = await detectCapriProject();
	const capriDetected = !!(detection.iniPath && detection.xmlPath);

	return {
		step: 'welcome',
		capriDetected,
	};
}

export async function shouldShowOnboarding(context: vscode.ExtensionContext): Promise<boolean> {
	const completed = context.workspaceState.get<boolean>('gamsIde.onboardingCompleted', false);
	const skipped = context.workspaceState.get<boolean>('gamsIde.onboardingSkipped', false);
	return !completed && !skipped;
}

export async function handleOnboardingAction(
	context: vscode.ExtensionContext,
	action: string,
	data: any
): Promise<OnboardingState | undefined> {
	const config = vscode.workspace.getConfiguration('gamsIde');

	switch (action) {
		case 'startSetup': {
			const detection = await detectCapriProject();
			if (detection.iniPath && detection.xmlPath && detection.iniSettings && detection.xmlConfig) {
				const gamsTasks = detection.xmlConfig.tasks
					.filter(t => t.type !== 'R' && t.gamsFile)
					.map(t => ({ name: t.name, gamsFile: t.gamsFile }));

				return {
					step: 'capri-options',
					capriDetected: true,
					detectedIniPath: detection.iniPath,
					detectedXmlPath: detection.xmlPath,
					detectedSettings: {
						gamsExecutable: detection.iniSettings.gamsExecutable,
						currentTask: detection.iniSettings.currentTask,
						modelDir: detection.iniSettings.modelDir,
						tasks: gamsTasks,
					},
				};
			}
			return {
				step: 'non-capri-options',
				capriDetected: false,
			};
		}

		case 'selectDefaultCapri': {
			const detection = await detectCapriProject();
			if (detection.iniPath && detection.xmlPath) {
				await config.update('ggigIniFile', detection.iniPath, vscode.ConfigurationTarget.Workspace);
				await config.update('ggigXmlFile', detection.xmlPath, vscode.ConfigurationTarget.Workspace);

				const summary: Record<string, string> = {
					'INI File': detection.iniPath,
					'XML File': detection.xmlPath,
				};
				if (detection.iniSettings?.currentTask) {
					summary['Current Task'] = detection.iniSettings.currentTask;
				}
				if (detection.iniSettings?.gamsExecutable) {
					summary['GAMS Executable'] = detection.iniSettings.gamsExecutable;
				}

				await context.workspaceState.update('gamsIde.onboardingCompleted', true);
				return {
					step: 'complete',
					capriDetected: true,
					summary,
				};
			}
			return undefined;
		}

		case 'selectCustomPaths': {
			return {
				step: 'custom-paths',
				capriDetected: false,
			};
		}

		case 'browseIni': {
			const uris = await vscode.window.showOpenDialog({
				canSelectFiles: true,
				canSelectFolders: false,
				canSelectMany: false,
				filters: { 'INI Files': ['ini'], 'All Files': ['*'] },
				title: 'Select .ini File',
			});
			if (uris?.[0]) {
				return {
					step: 'custom-paths',
					capriDetected: false,
					detectedIniPath: uris[0].fsPath,
				};
			}
			return undefined;
		}

		case 'browseXml': {
			const uris = await vscode.window.showOpenDialog({
				canSelectFiles: true,
				canSelectFolders: false,
				canSelectMany: false,
				filters: { 'XML Files': ['xml'], 'All Files': ['*'] },
				title: 'Select .xml File',
			});
			if (uris?.[0]) {
				return {
					step: 'custom-paths',
					capriDetected: false,
					detectedXmlPath: uris[0].fsPath,
				};
			}
			return undefined;
		}

		case 'applyCustomPaths': {
			const iniPath = data?.ini;
			const xmlPath = data?.xml;
			if (!iniPath || !xmlPath) {
				vscode.window.showWarningMessage('Please provide both .ini and .xml file paths.');
				return undefined;
			}
			await config.update('ggigIniFile', iniPath, vscode.ConfigurationTarget.Workspace);
			await config.update('ggigXmlFile', xmlPath, vscode.ConfigurationTarget.Workspace);

			await context.workspaceState.update('gamsIde.onboardingCompleted', true);
			return {
				step: 'complete',
				capriDetected: false,
				summary: {
					'INI File': iniPath,
					'XML File': xmlPath,
				},
			};
		}

		case 'selectCapriProject': {
			return {
				step: 'capri-sub-options',
				capriDetected: false,
			};
		}

		case 'startManualSetup': {
			const detectedGamsPath = await getGamsPath();
			const gmsUris = await vscode.workspace.findFiles('**/*.gms', undefined, 50);
			const gamsFiles = gmsUris.map(u => vscode.workspace.asRelativePath(u));

			return {
				step: 'manual-setup',
				capriDetected: false,
				manualStep: 'gams-executable',
				detectedGamsPath: detectedGamsPath || undefined,
				gamsFiles,
				currentSettings: {
					gamsExecutable: config.get<string>('gamsExecutable'),
					mainGmsFile: config.get<string>('mainGmsFile'),
					scratchDirectory: config.get<string>('scratchDirectory'),
					commandLineArguments_execution: config.get<string[]>('commandLineArguments_execution'),
					commandLineArguments_compilation: config.get<string[]>('commandLineArguments_compilation'),
				},
			};
		}

		case 'setGamsExecutable': {
			if (data?.value) {
				await config.update('gamsExecutable', data.value, vscode.ConfigurationTarget.Workspace);
			}
			return advanceManualStep('gams-executable', context);
		}

		case 'setMainFile': {
			if (data?.value) {
				// Resolve relative path to absolute
				const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
				const absPath = workspaceRoot ? resolve(workspaceRoot, data.value) : data.value;
				await config.update('mainGmsFile', absPath, vscode.ConfigurationTarget.Workspace);
			}
			return advanceManualStep('main-file', context);
		}

		case 'setScratchDir': {
			if (data?.value) {
				await config.update('scratchDirectory', data.value, vscode.ConfigurationTarget.Workspace);
			}
			return advanceManualStep('scratch-dir', context);
		}

		case 'setExecArgs': {
			if (data?.value) {
				const args = data.value.split(/\s+/).filter((a: string) => a.length > 0);
				if (args.length) {
					await config.update('commandLineArguments_execution', args, vscode.ConfigurationTarget.Workspace);
				}
			}
			return advanceManualStep('exec-args', context);
		}

		case 'setCompileArgs': {
			if (data?.value) {
				const args = data.value.split(/\s+/).filter((a: string) => a.length > 0);
				if (args.length) {
					await config.update('commandLineArguments_compilation', args, vscode.ConfigurationTarget.Workspace);
				}
			}
			return advanceManualStep('compile-args', context);
		}

		case 'setCompileOnSave': {
			await config.update('runDiagnosticsOnSave', !!data?.value, vscode.ConfigurationTarget.Workspace);
			return buildCompleteSummary(context);
		}

		case 'skipStep': {
			const currentManualStep = data?.manualStep || data?.currentStep;
			if (currentManualStep) {
				return advanceManualStep(currentManualStep, context);
			}
			return undefined;
		}

		case 'browseGamsExe': {
			const uris = await vscode.window.showOpenDialog({
				canSelectFiles: true,
				canSelectFolders: false,
				canSelectMany: false,
				title: 'Select GAMS Executable',
			});
			if (uris?.[0]) {
				return {
					step: 'manual-setup',
					capriDetected: false,
					manualStep: 'gams-executable',
					detectedGamsPath: uris[0].fsPath,
				};
			}
			return undefined;
		}

		case 'browseScratchDir': {
			const uris = await vscode.window.showOpenDialog({
				canSelectFiles: false,
				canSelectFolders: true,
				canSelectMany: false,
				title: 'Select Scratch Directory',
			});
			if (uris?.[0]) {
				return {
					step: 'manual-setup',
					capriDetected: false,
					manualStep: 'scratch-dir',
					currentSettings: { scratchDirectory: uris[0].fsPath },
				};
			}
			return undefined;
		}

		case 'skipOnboarding': {
			await context.workspaceState.update('gamsIde.onboardingSkipped', true);
			return undefined;
		}

		case 'completeOnboarding': {
			await context.workspaceState.update('gamsIde.onboardingCompleted', true);
			return undefined;
		}

		case 'resetOnboarding': {
			await context.workspaceState.update('gamsIde.onboardingCompleted', false);
			await context.workspaceState.update('gamsIde.onboardingSkipped', false);
			return getOnboardingState(context);
		}

		default:
			return undefined;
	}
}

async function advanceManualStep(
	currentStep: NonNullable<OnboardingState['manualStep']>,
	context: vscode.ExtensionContext
): Promise<OnboardingState> {
	const idx = MANUAL_STEPS.indexOf(currentStep);
	const nextIdx = idx + 1;

	if (nextIdx >= MANUAL_STEPS.length) {
		return buildCompleteSummary(context);
	}

	const nextStep = MANUAL_STEPS[nextIdx];

	const result: OnboardingState = {
		step: 'manual-setup',
		capriDetected: false,
		manualStep: nextStep,
	};

	// Populate gamsFiles for main-file step
	if (nextStep === 'main-file') {
		const gmsUris = await vscode.workspace.findFiles('**/*.gms', undefined, 50);
		result.gamsFiles = gmsUris.map(u => vscode.workspace.asRelativePath(u));
	}

	return result;
}

async function buildCompleteSummary(context?: vscode.ExtensionContext): Promise<OnboardingState> {
	const config = vscode.workspace.getConfiguration('gamsIde');
	const summary: Record<string, string> = {};

	const gamsExe = config.get<string>('gamsExecutable');
	if (gamsExe) summary['GAMS Executable'] = gamsExe;

	const mainFile = config.get<string>('mainGmsFile');
	if (mainFile) summary['Main File'] = mainFile;

	const scratchDir = config.get<string>('scratchDirectory');
	if (scratchDir) summary['Scratch Dir'] = scratchDir;

	const execArgs = config.get<string[]>('commandLineArguments_execution');
	if (execArgs?.length) summary['Exec Args'] = execArgs.join(' ');

	const compileArgs = config.get<string[]>('commandLineArguments_compilation');
	if (compileArgs?.length) summary['Compile Args'] = compileArgs.join(' ');

	const iniFile = config.get<string>('ggigIniFile');
	if (iniFile) summary['INI File'] = iniFile;

	const xmlFile = config.get<string>('ggigXmlFile');
	if (xmlFile) summary['XML File'] = xmlFile;

	if (context) {
		await context.workspaceState.update('gamsIde.onboardingCompleted', true);
	}

	return {
		step: 'complete',
		capriDetected: false,
		summary,
	};
}
