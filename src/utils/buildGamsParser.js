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
    return {type: "functionCall", name: name, args: args};
  }

argumentList
  = head:argument tail:("," argument)* {
    let result = [{
      name: head,
      location: location()
    }];
    for (let i = 0; i < tail.length; i++) {
      result.push({
      	name: tail[i][1],
        location: location()
      });
    }
    return result;
  }
  / "" { return []; }

argument
  = identifier / stringLiteral / numberLiteral

identifier
  = first:letter rest:letterOrDigitOrSpecial* {
    return first + rest.join("");
  }

stringLiteral
  = "\"" chars:doubleChar* "\"" {
    return chars.join("");
  }
  / "\'" chars:singleChar* "\'" {
    return chars.join("");
  }

numberLiteral
  = digits:[0-9]+ {
    return parseInt(digits.join(""), 10);
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
  
`;


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
