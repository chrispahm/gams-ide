import * as fs from 'fs/promises';

// Legacy interface kept for backward compatibility
export interface GgigSettings {
	gamsExecutable: string | undefined;
	currentTask: string | undefined;
	mainGmsFile: string | undefined;
	commandLineArgs: string[];
}

export interface GgigIniSettings {
	gamsExecutable?: string;
	currentTask?: string;
	currentWorkstep?: string;
	modelDir?: string;
	resDir?: string;
	restartDir?: string;
	datDir?: string;
	scratchDir?: string;
	lastInstance: number;
	numberOfProcessors: number;
	runParallel: boolean;
	defaultDirs: string[];
	gamsOptions?: string;
	taskSettings: Map<string, Map<string, string>>;
}

/**
 * Parse a GGIG default.ini file and extract comprehensive settings.
 * The file uses Java properties format with escaped spaces in keys.
 */
export async function parseGgigIni(filePath: string): Promise<GgigIniSettings> {
	const content = await fs.readFile(filePath, 'utf-8');
	const lines = content.split('\n');

	const settings: GgigIniSettings = {
		lastInstance: 1,
		numberOfProcessors: 1,
		runParallel: false,
		defaultDirs: [],
		taskSettings: new Map(),
	};

	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed.startsWith('#') || trimmed.startsWith('!') || trimmed === '') continue;

		const eqIndex = findUnescapedEquals(trimmed);
		if (eqIndex === -1) continue;

		const rawKey = trimmed.substring(0, eqIndex);
		const value = trimmed.substring(eqIndex + 1);
		const key = rawKey.replace(/\\ /g, ' ').toLowerCase();

		// Skip agpspread visualization keys
		if (key.startsWith('agpspread.')) continue;

		if (key === 'gamsexe') {
			settings.gamsExecutable = value;
		} else if (key === 'gamsdir' && !settings.gamsExecutable) {
			settings.gamsExecutable = value;
		} else if (key === 'curtask') {
			settings.currentTask = value;
		} else if (key === 'curworkstep') {
			settings.currentWorkstep = value;
		} else if (key === 'modeldir') {
			settings.modelDir = value;
		} else if (key === 'resdir') {
			settings.resDir = value;
		} else if (key === 'restartdir') {
			settings.restartDir = value;
		} else if (key === 'datdir') {
			settings.datDir = value;
		} else if (key === 'scratchdir') {
			settings.scratchDir = value;
		} else if (key === 'lastinstance') {
			const parsed = parseInt(value, 10);
			if (!isNaN(parsed)) settings.lastInstance = parsed;
		} else if (key === 'numberofprocessors') {
			const parsed = parseInt(value, 10);
			if (!isNaN(parsed)) settings.numberOfProcessors = parsed;
		} else if (key === 'runparallel') {
			settings.runParallel = value.toLowerCase() === 'true';
		} else if (key === 'defaultdirs') {
			settings.defaultDirs = value.split(',').map(d => d.trim()).filter(d => d.length > 0);
		} else if (key === 'gamsoptions') {
			settings.gamsOptions = value;
		} else if (key.includes('.')) {
			// Task-specific dotted keys: "task name.setting name=value"
			const dotIndex = key.indexOf('.');
			const taskName = key.substring(0, dotIndex).trim();
			const settingName = key.substring(dotIndex + 1).trim();

			if (taskName && settingName) {
				if (!settings.taskSettings.has(taskName)) {
					settings.taskSettings.set(taskName, new Map());
				}
				settings.taskSettings.get(taskName)!.set(settingName, value);
			}
		}
	}

	return settings;
}

/**
 * Legacy parser - returns the old GgigSettings interface.
 * Delegates to parseGgigIni internally.
 */
export async function parseDefaultIni(filePath: string): Promise<GgigSettings> {
	const ini = await parseGgigIni(filePath);

	return {
		gamsExecutable: ini.gamsExecutable,
		currentTask: ini.currentTask,
		mainGmsFile: undefined, // Will be resolved by XML parser or command builder
		commandLineArgs: [],    // Will be resolved by command builder
	};
}

function findUnescapedEquals(str: string): number {
	for (let i = 0; i < str.length; i++) {
		if (str[i] === '=' && (i === 0 || str[i - 1] !== '\\')) {
			return i;
		}
	}
	return -1;
}

/**
 * Search for default.ini in the workspace, checking GUI/ subdirectory first.
 */
export async function findDefaultIni(workspaceRoot: string): Promise<string | undefined> {
	const candidates = [
		`${workspaceRoot}/GUI/default.ini`,
		`${workspaceRoot}/gui/default.ini`,
		`${workspaceRoot}/default.ini`,
	];

	for (const candidate of candidates) {
		try {
			await fs.access(candidate, fs.constants.R_OK);
			return candidate;
		} catch {
			// continue to next candidate
		}
	}
	return undefined;
}
