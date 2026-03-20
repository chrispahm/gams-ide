import * as fs from 'fs/promises';
import { join } from 'path';
import { XMLParser } from 'fast-xml-parser';

export interface GgigTaskDef {
	name: string;
	gamsFile?: string;
	incFile?: string;
	instances?: string;
	runParallel?: boolean;
	useMeta?: boolean;
	type?: string;
	resdir?: string;
}

export interface GgigWorkstepDef {
	name: string;
	tasks: string[];
}

export interface GgigXmlConfig {
	gamsFile?: string;
	gamsOptions?: string;
	modelDir?: string;
	resDir?: string;
	restartDir?: string;
	datDir?: string;
	scratchDir?: string;
	scenarioDir?: string;
	defaultDirs: string[];
	tasks: GgigTaskDef[];
	worksteps: GgigWorkstepDef[];
}

/**
 * Extract a value from a node that may use the `<attr>` wrapper pattern
 * common in GGIG XML definitions, or be a direct string value.
 */
function getAttrValue(node: unknown): string | undefined {
	if (node === undefined || node === null) return undefined;
	if (typeof node === 'string') return node;
	if (typeof node === 'number' || typeof node === 'boolean') return String(node);
	if (typeof node === 'object' && node !== null && 'attr' in node) {
		const attr = (node as { attr: unknown }).attr;
		if (typeof attr === 'string') return attr;
		if (typeof attr === 'number' || typeof attr === 'boolean') return String(attr);
	}
	return undefined;
}

function parseTask(taskNode: Record<string, unknown>): GgigTaskDef {
	const task: GgigTaskDef = {
		name: String(taskNode.name ?? ''),
	};

	if (taskNode.gamsFile !== undefined) task.gamsFile = String(taskNode.gamsFile);
	if (taskNode.incFile !== undefined) task.incFile = String(taskNode.incFile);
	if (taskNode.instances !== undefined) task.instances = String(taskNode.instances);
	if (taskNode.type !== undefined) task.type = String(taskNode.type);
	if (taskNode.resdir !== undefined) task.resdir = String(taskNode.resdir);

	if (taskNode.runParallel !== undefined) {
		const val = String(taskNode.runParallel).toLowerCase();
		task.runParallel = val === 'true';
	}
	if (taskNode.useMeta !== undefined) {
		const val = String(taskNode.useMeta).toLowerCase();
		task.useMeta = val === 'true';
	}

	return task;
}

function parseWorkstep(wsNode: Record<string, unknown>): GgigWorkstepDef {
	const name = String(wsNode.name ?? '');
	const tasksStr = String(wsNode.tasks ?? '');
	const tasks = tasksStr
		.split(',')
		.map(t => t.trim())
		.filter(t => t.length > 0);

	return { name, tasks };
}

/**
 * Parse a GGIG XML definition file and extract configuration, tasks, and worksteps.
 */
export async function parseGgigXml(xmlFilePath: string): Promise<GgigXmlConfig> {
	const content = await fs.readFile(xmlFilePath, 'utf-8');

	const parser = new XMLParser({
		ignoreAttributes: false,
		isArray: (name) => ['task', 'workstep', 'control', 'filter', 'helpmenuitem'].includes(name),
		trimValues: true,
	});

	const parsed = parser.parse(content);
	const ggig = parsed.GGIG;

	if (!ggig) {
		throw new Error(`No <GGIG> root element found in ${xmlFilePath}`);
	}

	const config: GgigXmlConfig = {
		gamsFile: getAttrValue(ggig.gamsFile),
		gamsOptions: getAttrValue(ggig.gamsOptions),
		modelDir: getAttrValue(ggig.modelDir),
		resDir: getAttrValue(ggig.resDir),
		restartDir: getAttrValue(ggig.restartDir),
		datDir: getAttrValue(ggig.datDir),
		scratchDir: getAttrValue(ggig.scratchDir),
		scenarioDir: getAttrValue(ggig.scenarioDir),
		defaultDirs: [],
		tasks: [],
		worksteps: [],
	};

	// defaultDirs from XML (if present)
	const defaultDirsStr = getAttrValue(ggig.defaultDirs);
	if (defaultDirsStr) {
		config.defaultDirs = defaultDirsStr.split(',').map(d => d.trim()).filter(d => d.length > 0);
	}

	// Parse tasks
	if (Array.isArray(ggig.task)) {
		config.tasks = ggig.task.map((t: Record<string, unknown>) => parseTask(t));
	}

	// Parse worksteps
	if (Array.isArray(ggig.workstep)) {
		config.worksteps = ggig.workstep.map((ws: Record<string, unknown>) => parseWorkstep(ws));
	}

	return config;
}

/**
 * Search for a GGIG XML definition file (*_gui_definition.xml) in the given directory.
 */
export async function findGgigXml(guiDir: string): Promise<string | undefined> {
	try {
		const entries = await fs.readdir(guiDir);
		const xmlFile = entries.find(e => e.endsWith('_gui_definition.xml'));
		if (xmlFile) {
			return join(guiDir, xmlFile);
		}
	} catch {
		// directory doesn't exist or not readable
	}
	return undefined;
}
