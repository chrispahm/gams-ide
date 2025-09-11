import * as vscode from 'vscode';
import { normalize } from 'path';
import * as util from 'node:util';
import rl from 'readline-specific';
import errCodes from './gamsErrCodes.js';
const oneline = util.promisify(rl.oneline);

async function getRange(file: string, line: number, column: number): Promise<{left: number; right: number}> {
  const res = await oneline(file, line + 1);
  const left = Math.max.apply(null, [/\((?=[^(]*$)/, /\)(?=[^)]*$)/, /\,(?=[^,]*$)/, /\[(?=[^[]*$)/, /\](?=[^]]*$)/, /\;(?=[^;]*$)/, /\.(?=[^.]*$)/, /\s(?=[^\s]*$)/].map(x => res.slice(0, column).search(x))) + 1;
  let right = res.slice(column).search(/\s|\(|\)|\,|\.|\[|\]|\;/);
  if (right < 0) {
    right = res.length - 1;
  }
  return {
    left,
    right: right + column
  };
}

export interface ParsedErrorMessage {
  code: number;
  errFile: string;
  message: string;
  range: vscode.Range;
  severity: vscode.DiagnosticSeverity;
  source: string;
  relatedInformation: unknown[];
}

export default async function parseError(error: string, index: number): Promise<ParsedErrorMessage> {
  const parts = error.split(/[ ]+/);
  const ruleId = Number(parts[3]);
  const line = Number(parts[2]) - 1;
  const column = Number(parts[4]) - 1;
  const errFile = normalize(parts.slice(5).join(' '));
  // only mark first error as an error, second as a warning, and subsequent
  // errors as infos, so that these can be highlighted correctly by the
  // linter-ui
  let severity = 'Error';
  if (index === 1) {
    severity = 'Warning';
  } else if (index > 1) {
    severity = 'Hint';
  }
  if (ruleId === 257) {
    severity = 'Warning';
  }

  const { left, right } = await getRange(errFile, line, column);

  const message: ParsedErrorMessage = {
    code: ruleId,
    errFile,
    message: errCodes[ruleId],
    range: new vscode.Range(
      new vscode.Position(line, left),
      new vscode.Position(line, right)
    ),
  severity: vscode.DiagnosticSeverity[severity as keyof typeof vscode.DiagnosticSeverity],
    source: "",
    relatedInformation: [],
  };
  return message;
};