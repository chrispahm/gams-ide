const peggy = require("peggy");
const fs = require("fs");

const grammar = fs.readFileSync("./gamsGrammar.pegjs", "utf8");

const parserSource = peggy.generate(grammar, {
  output: "source"
});

const res = `
module.exports = ${parserSource}
`;
fs.writeFileSync("./gamsParser.js", res);
