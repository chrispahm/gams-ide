import { dirname } from 'path';
import { findDefaultIni, parseGgigIni } from './parseDefaultIni';
import { findGgigXml, parseGgigXml } from './parseGgigXml';
import { buildGamsCommand, type ShellType, type GamsCommandSpec } from './buildGamsCommand';

export { parseDefaultIni, parseGgigIni, findDefaultIni } from './parseDefaultIni';
export type { GgigSettings, GgigIniSettings } from './parseDefaultIni';
export { parseGgigXml, findGgigXml } from './parseGgigXml';
export type { GgigXmlConfig, GgigTaskDef, GgigWorkstepDef } from './parseGgigXml';
export { buildGamsCommand } from './buildGamsCommand';
export type { ShellType, BuildCommandOptions, GamsCommandSpec } from './buildGamsCommand';

/**
 * Convenience function: discover INI + XML in a workspace, parse both,
 * and build the GAMS command for the current task.
 *
 * If `options.iniPath` / `options.xmlPath` are provided they are used
 * directly instead of auto-discovery.
 */
export async function getGgigCommand(
	workspaceRoot: string,
	mode: 'execute' | 'compile',
	shell: ShellType,
	options?: { iniPath?: string; xmlPath?: string; extraArgs?: string[] }
): Promise<GamsCommandSpec | undefined> {
	const iniPath = options?.iniPath ?? await findDefaultIni(workspaceRoot);
	if (!iniPath) return undefined;

	const guiDir = dirname(iniPath);
	const xmlPath = options?.xmlPath ?? await findGgigXml(guiDir);
	if (!xmlPath) return undefined;

	const [iniSettings, xmlConfig] = await Promise.all([
		parseGgigIni(iniPath),
		parseGgigXml(xmlPath),
	]);

	try {
		return buildGamsCommand({
			xmlConfig,
			iniSettings,
			guiDir,
			mode,
			shell,
			extraArgs: options?.extraArgs,
		});
	} catch {
		return undefined;
	}
}
