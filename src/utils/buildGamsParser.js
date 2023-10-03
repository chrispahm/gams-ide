const PEG = require("./peg.js");
const fs = require("fs");
const document = {}

const grammar = `
input
  = parts:(functionCall / ignored / alsoIgnored)* {
    let result = [];
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].type === "functionCall") {
        result.push(parts[i]);
      }
    }
    return result;
  }

functionCall
  = name:identifier "(" args:argumentList ")" {
    return {type: "functionCall", name: name.name, args: args};
  }

argumentList
  = head:(_ argument _) tail:((",") _ argument _)* {
  	const loc = location();
    const startCol = loc.start.column;
    const wsBefore = head[0].length;
    const name = head[1].name
    const nameLength = name.length + head[1].wsCount;
    const wsAfter = head[2].length;
    let curEnd = startCol + wsBefore + nameLength + wsAfter;

    let result = [{
      name,
      isQuoted: head[1].isQuoted,
      start: startCol,
      end: curEnd,
      index: 0
    }];

    for (let i = 0; i < tail.length; i++) {
      const startCol = curEnd + 1;
      const wsBefore = tail[i][1].length;
      const name = tail[i][2].name
      const nameLength = name.length + tail[i][2].wsCount;
      const wsAfter = tail[i][3].length;
	  curEnd = startCol + wsBefore + nameLength + wsAfter;

      result.push({
      	name,
		isQuoted: tail[i][2].isQuoted,
		start: startCol,
        end: curEnd,
        index: i + 1
      });
    }
    return result;
  }
  / "" { return []; }

argument
  = identifier / stringLiteral / numberLiteral

_ "whitespace"
  = [ \t\n\r]*

identifier
  = first:letter rest:letterOrDigitOrSpecial* {
    return {
      name: first + rest.join(""),
      isQuoted: false,
      wsCount: 0
    }
  }

stringLiteral
  = "\"" chars:doubleChar* "\"" {
    return {
      name: chars.join(""),
      isQuoted: true,
      wsCount: 2
    }
  }
  / "\'" chars:singleChar* "\'" {
    return {
      name: chars.join(""),
      isQuoted: true,
      wsCount: 2
    }
  }

numberLiteral
  = digits:[0-9]+ {
    return {
      name: parseInt(digits.join(""), 10),
      wsCount: 0
    }
  }

letter
  = [a-zA-Z]

letterOrDigitOrSpecial
  = [a-zA-Z0-9_]

doubleChar
  = [^("|\n)] / "\\\"" // this will match any character except a double quote or a newline, or an escaped double quote

singleChar
  = [^('|\n)] / "\\'" // this will match any character except a single quote or a newline, or an escaped single quote

ignored
  = chars:[^a-zA-Z0-9_]+ { // this will ignore any characters that are not a letter, digit, or underscore
    return {type: "ignored", value: chars.join("")};
  }

 alsoIgnored
  = chars:[^+*-/=; ]+ { // this will ignore any characters that are not a letter, digit, or underscore
    return {type: "ignored", value: chars.join("")};
  }
  `


const parserSource = PEG.buildParser(grammar, {
  cache: true,
  trackLineAndColumn: true,
  partialMatch: true,
  output: "source"
});

const res = `
const document = {};
module.exports = ${parserSource}
`
fs.writeFileSync("./gamsParser.js", res);
