import { resolve, parse as parsePath, join } from 'path';
import type { GgigXmlConfig } from './parseGgigXml';
import type { GgigIniSettings } from './parseDefaultIni';

export type ShellType = 'bash' | 'cmd' | 'powershell';

export interface BuildCommandOptions {
	xmlConfig: GgigXmlConfig;
	iniSettings: GgigIniSettings;
	guiDir: string;
	mode: 'execute' | 'compile';
	shell: ShellType;
	taskNameOverride?: string;
	instanceOverride?: number;
	extraArgs?: string[];
}

export interface GamsCommandSpec {
	executable: string;
	args: string[];
	workDir: string;
	listingFile: string;
	commandString: string;
}

function quote(shell: ShellType, value: string): string {
	if (shell === 'cmd') {
		return `"${value}"`;
	} else if (shell === 'powershell') {
		return `"${value.replace(/"/g, '`"')}"`;
	}
	// bash
	return `"${value.replace(/"/g, '\\"')}"`;
}

export function buildGamsCommand(options: BuildCommandOptions): GamsCommandSpec {
	const { xmlConfig, iniSettings, guiDir, mode, shell } = options;

	const q = (v: string) => quote(shell, v);

	// Resolve task
	const taskName = options.taskNameOverride ?? iniSettings.currentTask;
	if (!taskName) {
		throw new Error('No task specified: set taskNameOverride or currentTask in INI');
	}

	const taskNameLower = taskName.toLowerCase();
	const taskDef = xmlConfig.tasks.find(t => t.name.toLowerCase() === taskNameLower);

	// Resolve gamsFile
	const gamsFileRel = taskDef?.gamsFile ?? xmlConfig.gamsFile;
	if (!gamsFileRel) {
		throw new Error(`No gamsFile found for task "${taskName}"`);
	}

	// Skip R-type tasks
	if (taskDef?.type === 'R') {
		throw new Error(`Task "${taskName}" is an R task, not a GAMS task`);
	}

	// Resolve directories (INI overrides XML, resolve relative to guiDir)
	const modelDir = resolve(guiDir, iniSettings.modelDir ?? xmlConfig.modelDir ?? '.');
	const scratchDirBase = resolve(guiDir, iniSettings.scratchDir ?? xmlConfig.scratchDir ?? '../output/temp');

	// Resolve incFile from task definition
	const incFile = taskDef?.incFile;

	// Instance number
	const instance = options.instanceOverride ?? iniSettings.lastInstance;

	// Resolve gamsFile path: leading '/' means relative to modelDir
	let gamsFilePath: string;
	if (gamsFileRel.startsWith('/')) {
		gamsFilePath = resolve(modelDir, gamsFileRel.substring(1));
	} else {
		gamsFilePath = resolve(modelDir, gamsFileRel);
	}

	const gamsFileBase = parsePath(gamsFilePath).name;
	const scratchDir = join(scratchDirBase, String(instance));

	// Resolve GAMS executable
	const gamsExe = iniSettings.gamsExecutable ?? 'gams';

	// GAMS options from XML or INI
	const gamsOptions = iniSettings.gamsOptions ?? xmlConfig.gamsOptions;

	// Build args
	const args: string[] = [
		q(gamsFilePath),
		`--task=${q(taskName)}`,
		`-scrdir=${q(scratchDir)}`,
		`--scrdir=${q(scratchDir)}`,
		`-workdir=${q(modelDir)}`,
		`-curDir=${q(modelDir)}`,
	];

	if (mode === 'compile') {
		args.push('-a=c');
	}

	args.push('-errorLog=99');
	args.push(`-ef=${q(join(modelDir, `${taskName}.exp`))}`);
	args.push(`-rf=${q(join(modelDir, `${taskName}.ref`))}`);
	args.push('-lo=3');

	if (incFile) {
		args.push(`--scen=${incFile}`);
	}

	args.push('--ggig=on');

	// Add gamsOptions tokens (e.g., "threads 0")
	if (gamsOptions) {
		args.push(gamsOptions);
	}

	// Merge extra args (e.g. from VS Code settings)
	if (options.extraArgs?.length) {
		args.push(...options.extraArgs);
	}

	// Listing file
	const listingFile = `${gamsFileBase}_${instance}.lst`;
	args.push(`-o=${listingFile}`);

	const commandString = `${q(gamsExe)} ${args.join(' ')}`;

	return {
		executable: gamsExe,
		args,
		workDir: modelDir,
		listingFile: resolve(modelDir, listingFile),
		commandString,
	};
}
