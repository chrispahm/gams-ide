const vscode = require("vscode");
const { normalize } = require("path");
const util = require('node:util');
const rl = require('readline-specific')
const errCodes = require('./gamsErrCodes.js');
const oneline = util.promisify(rl.oneline)

async function getRange(file, line, column) {
  const res = await oneline(file, line + 1)
  const left = Math.max.apply(null, [/\((?=[^(]*$)/, /\)(?=[^)]*$)/, /\,(?=[^,]*$)/, /\[(?=[^[]*$)/, /\](?=[^]]*$)/, /\;(?=[^;]*$)/, /\.(?=[^.]*$)/, /\s(?=[^\s]*$)/].map(x => res.slice(0, column).search(x))) + 1
  let right = res.slice(column).search(/\s|\(|\)|\,|\.|\[|\]|\;/)
  if (right < 0) {
    right = res.length - 1
  }
  return {
    left,
    right: right + column
  }
}

module.exports = async function parseError(error, index) {
  error = error.split(/[ ]+/)
  const ruleId = Number(error[3])
  const line = Number(error[2]) - 1
  const column = Number(error[4]) - 1
  const errFile = normalize(error.slice(5).join(' '))
  // only mark first error as an error, second as a warning, and subsequent
  // errors as infos, so that these can be highlighted correctly by the
  // linter-ui
  let severity = 'Error'
  if (index === 1) severity = 'Warning'
  else if (index > 1) severity = 'Hint'
  if (ruleId === 257) severity = 'Warning'

  const { left, right } = await getRange(errFile, line, column);

  const message = {
    code: ruleId,
    errFile,
    message: errCodes[ruleId],
    range: new vscode.Range(
      new vscode.Position(line, left),
      new vscode.Position(line, right)
    ),
    severity: vscode.DiagnosticSeverity[severity],
    source: "",
    relatedInformation: [],
  }
  return message
}