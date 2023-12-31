
module.exports = // Generated by Peggy 3.0.2.
//
// https://peggyjs.org/
(function() {
  "use strict";

function peg$subclass(child, parent) {
  function C() { this.constructor = child; }
  C.prototype = parent.prototype;
  child.prototype = new C();
}

function peg$SyntaxError(message, expected, found, location) {
  var self = Error.call(this, message);
  // istanbul ignore next Check is a necessary evil to support older environments
  if (Object.setPrototypeOf) {
    Object.setPrototypeOf(self, peg$SyntaxError.prototype);
  }
  self.expected = expected;
  self.found = found;
  self.location = location;
  self.name = "SyntaxError";
  return self;
}

peg$subclass(peg$SyntaxError, Error);

function peg$padEnd(str, targetLength, padString) {
  padString = padString || " ";
  if (str.length > targetLength) { return str; }
  targetLength -= str.length;
  padString += padString.repeat(targetLength);
  return str + padString.slice(0, targetLength);
}

peg$SyntaxError.prototype.format = function(sources) {
  var str = "Error: " + this.message;
  if (this.location) {
    var src = null;
    var k;
    for (k = 0; k < sources.length; k++) {
      if (sources[k].source === this.location.source) {
        src = sources[k].text.split(/\r\n|\n|\r/g);
        break;
      }
    }
    var s = this.location.start;
    var offset_s = (this.location.source && (typeof this.location.source.offset === "function"))
      ? this.location.source.offset(s)
      : s;
    var loc = this.location.source + ":" + offset_s.line + ":" + offset_s.column;
    if (src) {
      var e = this.location.end;
      var filler = peg$padEnd("", offset_s.line.toString().length, ' ');
      var line = src[s.line - 1];
      var last = s.line === e.line ? e.column : line.length + 1;
      var hatLen = (last - s.column) || 1;
      str += "\n --> " + loc + "\n"
          + filler + " |\n"
          + offset_s.line + " | " + line + "\n"
          + filler + " | " + peg$padEnd("", s.column - 1, ' ')
          + peg$padEnd("", hatLen, "^");
    } else {
      str += "\n at " + loc;
    }
  }
  return str;
};

peg$SyntaxError.buildMessage = function(expected, found) {
  var DESCRIBE_EXPECTATION_FNS = {
    literal: function(expectation) {
      return "\"" + literalEscape(expectation.text) + "\"";
    },

    class: function(expectation) {
      var escapedParts = expectation.parts.map(function(part) {
        return Array.isArray(part)
          ? classEscape(part[0]) + "-" + classEscape(part[1])
          : classEscape(part);
      });

      return "[" + (expectation.inverted ? "^" : "") + escapedParts.join("") + "]";
    },

    any: function() {
      return "any character";
    },

    end: function() {
      return "end of input";
    },

    other: function(expectation) {
      return expectation.description;
    }
  };

  function hex(ch) {
    return ch.charCodeAt(0).toString(16).toUpperCase();
  }

  function literalEscape(s) {
    return s
      .replace(/\\/g, "\\\\")
      .replace(/"/g,  "\\\"")
      .replace(/\0/g, "\\0")
      .replace(/\t/g, "\\t")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/[\x00-\x0F]/g,          function(ch) { return "\\x0" + hex(ch); })
      .replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) { return "\\x"  + hex(ch); });
  }

  function classEscape(s) {
    return s
      .replace(/\\/g, "\\\\")
      .replace(/\]/g, "\\]")
      .replace(/\^/g, "\\^")
      .replace(/-/g,  "\\-")
      .replace(/\0/g, "\\0")
      .replace(/\t/g, "\\t")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/[\x00-\x0F]/g,          function(ch) { return "\\x0" + hex(ch); })
      .replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) { return "\\x"  + hex(ch); });
  }

  function describeExpectation(expectation) {
    return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
  }

  function describeExpected(expected) {
    var descriptions = expected.map(describeExpectation);
    var i, j;

    descriptions.sort();

    if (descriptions.length > 0) {
      for (i = 1, j = 1; i < descriptions.length; i++) {
        if (descriptions[i - 1] !== descriptions[i]) {
          descriptions[j] = descriptions[i];
          j++;
        }
      }
      descriptions.length = j;
    }

    switch (descriptions.length) {
      case 1:
        return descriptions[0];

      case 2:
        return descriptions[0] + " or " + descriptions[1];

      default:
        return descriptions.slice(0, -1).join(", ")
          + ", or "
          + descriptions[descriptions.length - 1];
    }
  }

  function describeFound(found) {
    return found ? "\"" + literalEscape(found) + "\"" : "end of input";
  }

  return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
};

function peg$parse(input, options) {
  options = options !== undefined ? options : {};

  var peg$FAILED = {};
  var peg$source = options.grammarSource;

  var peg$startRuleFunctions = { input: peg$parseinput };
  var peg$startRuleFunction = peg$parseinput;

  var peg$c0 = "(";
  var peg$c1 = ")";
  var peg$c2 = ",";
  var peg$c3 = "\"";
  var peg$c4 = "'";
  var peg$c5 = "\\\"";
  var peg$c6 = "\\'";

  var peg$r0 = /^[ \t\n\r]/;
  var peg$r1 = /^[*]/;
  var peg$r2 = /^[0-9]/;
  var peg$r3 = /^[a-zA-Z]/;
  var peg$r4 = /^[a-zA-Z0-9_]/;
  var peg$r5 = /^[^("|\n)]/;
  var peg$r6 = /^[^('|\n)]/;
  var peg$r7 = /^[^a-zA-Z0-9_]/;
  var peg$r8 = /^[^+*-\/=; ]/;

  var peg$e0 = peg$literalExpectation("(", false);
  var peg$e1 = peg$literalExpectation(")", false);
  var peg$e2 = peg$literalExpectation(",", false);
  var peg$e3 = peg$otherExpectation("whitespace");
  var peg$e4 = peg$classExpectation([" ", "\t", "\n", "\r"], false, false);
  var peg$e5 = peg$literalExpectation("\"", false);
  var peg$e6 = peg$literalExpectation("'", false);
  var peg$e7 = peg$classExpectation(["*"], false, false);
  var peg$e8 = peg$classExpectation([["0", "9"]], false, false);
  var peg$e9 = peg$classExpectation([["a", "z"], ["A", "Z"]], false, false);
  var peg$e10 = peg$classExpectation([["a", "z"], ["A", "Z"], ["0", "9"], "_"], false, false);
  var peg$e11 = peg$classExpectation(["(", "\"", "|", "\n", ")"], true, false);
  var peg$e12 = peg$literalExpectation("\\\"", false);
  var peg$e13 = peg$classExpectation(["(", "'", "|", "\n", ")"], true, false);
  var peg$e14 = peg$literalExpectation("\\'", false);
  var peg$e15 = peg$classExpectation([["a", "z"], ["A", "Z"], ["0", "9"], "_"], true, false);
  var peg$e16 = peg$classExpectation(["+", ["*", "/"], "=", ";", " "], true, false);

  var peg$f0 = function(parts) {
    function extractArgs(result, functionName, args, outerIndex) {
      args.forEach(arg => {
        const { args, ...rest } = arg;
        if (arg.type !== "group") {
          result.push({
            functionName,
            ...rest,
            ...(!isNaN(outerIndex) ? {index: outerIndex, isGroup: true} : {} )
          })
        }
        if (arg.args) {
          return extractArgs(result, arg.name || functionName, arg.args, arg.type === "group" ? arg.index : undefined)
        }
      })
      return result
    }

    let result = [];
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].type === "functionCall") {
        //    result.push(parts[i])
        extractArgs(result, parts[i].name, parts[i].args)
      }
    }
    return result;
  };
  var peg$f1 = function(name, args) {
    return {type: "functionCall", name: name.name, args: args};
  };
  var peg$f2 = function(head, tail) {
  	const loc = location();
    let result, curEnd, curIndex = 0;
    if (head.length === 0 || head.every(el => el === " ")) {
      // empty statement
      curEnd = loc.start.column + head.length;
      
      result = [{
        name: "",
        isQuoted: false,
        isEmpty: true,
        start: loc.start.column,
        end: curEnd,
        index: 0
      }]
    } else if (head[1].type === "group" || head[1].type === "functionCall") {
      const nameLength = head[1].name?.length || 0;
      result = [{
        ...head[1],
        type: head[1].type,
        index: 0,
        start: loc.start.column,
        end: loc.start.column + nameLength,
        argCount: head[1].args?.length || 0
      }]
      
      if (head[1].type === "functionCall") {
        curIndex = head[1].args?.length - 1 || 0;
      }
      
      curEnd = head[1].args[head[1].args.length - 1].end;
    } else {
      const startCol = loc.start.column;
      const wsBefore = head[0].length;
      const name = head[1].name
      const nameLength = name.length + head[1].wsCount;
      const wsAfter = head[2].length;
      curEnd = startCol + wsBefore + nameLength + wsAfter;
  
      result = [{
        name,
        isQuoted: head[1].isQuoted,
        start: startCol,
        end: curEnd,
        index: curIndex
      }];
    }

    for (let i = 0; i < tail.length; i++) {
      let startCol, wsBefore, name, nameLength, wsAfter, isQuoted = false, isEmpty = false;
      if (tail[i].length === 2) {
        // empty statement
        startCol = curEnd + 1;
        isEmpty = true,
        wsBefore = tail[i][1].length;
        curEnd = startCol + wsBefore;
        name = "";
      } else if (tail[i][2].type === "group" || tail[i][2].type === "functionCall") {
        result.push({
          ...tail[i][2],
          type: tail[i][2].type,
          index: curIndex + i + 1
        });
        continue;
      } else {
        startCol = curEnd + 1;
        wsBefore = tail[i][1].length;
        name = tail[i][2].name
        nameLength = name.length + tail[i][2].wsCount;
        wsAfter = tail[i][3].length;
	    curEnd = startCol + wsBefore + nameLength + wsAfter;
        isQuoted = tail[i][2].isQuoted;
      }

      result.push({
      	name,
		isQuoted,
        isEmpty,
		start: startCol,
        end: curEnd,
        index: curIndex + i + 1
      });
    }
    
    return result;
  };
  var peg$f3 = function() { return []; };
  var peg$f4 = function(args) {
    return {type: "group", args: args};
  };
  var peg$f5 = function(first, rest) {
    return {
      name: first + rest.join(""),
      isQuoted: false,
      wsCount: 0
    }
  };
  var peg$f6 = function(chars) {
    return {
      name: chars.join(""),
      isQuoted: true,
      wsCount: 2
    }
  };
  var peg$f7 = function(chars) {
    return {
      name: chars.join(""),
      isQuoted: true,
      wsCount: 2
    }
  };
  var peg$f8 = function(first) {
    return {
      name: "*",
      isQuoted: false,
      wsCount: 0
    }
  };
  var peg$f9 = function(digits) {
    return {
      name: parseInt(digits.join(""), 10),
      wsCount: 0
    }
  };
  var peg$f10 = function(chars) { // this will ignore any characters that are not a letter, digit, or underscore
    return {type: "ignored", value: chars.join("")};
  };
  var peg$f11 = function(chars) { // this will ignore any characters that are not a letter, digit, or underscore
    return {type: "ignored", value: chars.join("")};
  };
  var peg$currPos = 0;
  var peg$savedPos = 0;
  var peg$posDetailsCache = [{ line: 1, column: 1 }];
  var peg$maxFailPos = 0;
  var peg$maxFailExpected = [];
  var peg$silentFails = 0;

  var peg$result;

  if ("startRule" in options) {
    if (!(options.startRule in peg$startRuleFunctions)) {
      throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
    }

    peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
  }

  function text() {
    return input.substring(peg$savedPos, peg$currPos);
  }

  function offset() {
    return peg$savedPos;
  }

  function range() {
    return {
      source: peg$source,
      start: peg$savedPos,
      end: peg$currPos
    };
  }

  function location() {
    return peg$computeLocation(peg$savedPos, peg$currPos);
  }

  function expected(description, location) {
    location = location !== undefined
      ? location
      : peg$computeLocation(peg$savedPos, peg$currPos);

    throw peg$buildStructuredError(
      [peg$otherExpectation(description)],
      input.substring(peg$savedPos, peg$currPos),
      location
    );
  }

  function error(message, location) {
    location = location !== undefined
      ? location
      : peg$computeLocation(peg$savedPos, peg$currPos);

    throw peg$buildSimpleError(message, location);
  }

  function peg$literalExpectation(text, ignoreCase) {
    return { type: "literal", text: text, ignoreCase: ignoreCase };
  }

  function peg$classExpectation(parts, inverted, ignoreCase) {
    return { type: "class", parts: parts, inverted: inverted, ignoreCase: ignoreCase };
  }

  function peg$anyExpectation() {
    return { type: "any" };
  }

  function peg$endExpectation() {
    return { type: "end" };
  }

  function peg$otherExpectation(description) {
    return { type: "other", description: description };
  }

  function peg$computePosDetails(pos) {
    var details = peg$posDetailsCache[pos];
    var p;

    if (details) {
      return details;
    } else {
      p = pos - 1;
      while (!peg$posDetailsCache[p]) {
        p--;
      }

      details = peg$posDetailsCache[p];
      details = {
        line: details.line,
        column: details.column
      };

      while (p < pos) {
        if (input.charCodeAt(p) === 10) {
          details.line++;
          details.column = 1;
        } else {
          details.column++;
        }

        p++;
      }

      peg$posDetailsCache[pos] = details;

      return details;
    }
  }

  function peg$computeLocation(startPos, endPos, offset) {
    var startPosDetails = peg$computePosDetails(startPos);
    var endPosDetails = peg$computePosDetails(endPos);

    var res = {
      source: peg$source,
      start: {
        offset: startPos,
        line: startPosDetails.line,
        column: startPosDetails.column
      },
      end: {
        offset: endPos,
        line: endPosDetails.line,
        column: endPosDetails.column
      }
    };
    if (offset && peg$source && (typeof peg$source.offset === "function")) {
      res.start = peg$source.offset(res.start);
      res.end = peg$source.offset(res.end);
    }
    return res;
  }

  function peg$fail(expected) {
    if (peg$currPos < peg$maxFailPos) { return; }

    if (peg$currPos > peg$maxFailPos) {
      peg$maxFailPos = peg$currPos;
      peg$maxFailExpected = [];
    }

    peg$maxFailExpected.push(expected);
  }

  function peg$buildSimpleError(message, location) {
    return new peg$SyntaxError(message, null, null, location);
  }

  function peg$buildStructuredError(expected, found, location) {
    return new peg$SyntaxError(
      peg$SyntaxError.buildMessage(expected, found),
      expected,
      found,
      location
    );
  }

  function peg$parseinput() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = [];
    s2 = peg$parsefunctionCall();
    if (s2 === peg$FAILED) {
      s2 = peg$parseignored();
      if (s2 === peg$FAILED) {
        s2 = peg$parsealsoIgnored();
      }
    }
    while (s2 !== peg$FAILED) {
      s1.push(s2);
      s2 = peg$parsefunctionCall();
      if (s2 === peg$FAILED) {
        s2 = peg$parseignored();
        if (s2 === peg$FAILED) {
          s2 = peg$parsealsoIgnored();
        }
      }
    }
    peg$savedPos = s0;
    s1 = peg$f0(s1);
    s0 = s1;

    return s0;
  }

  function peg$parsefunctionCall() {
    var s0, s1, s2, s3, s4;

    s0 = peg$currPos;
    s1 = peg$parseidentifier();
    if (s1 !== peg$FAILED) {
      if (input.charCodeAt(peg$currPos) === 40) {
        s2 = peg$c0;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e0); }
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parseargumentList();
        if (s3 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 41) {
            s4 = peg$c1;
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e1); }
          }
          if (s4 === peg$FAILED) {
            s4 = null;
          }
          peg$savedPos = s0;
          s0 = peg$f1(s1, s3);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseargumentList() {
    var s0, s1, s2, s3, s4, s5, s6, s7;

    s0 = peg$currPos;
    s1 = peg$currPos;
    s2 = peg$parse_();
    s3 = peg$parseargument();
    if (s3 !== peg$FAILED) {
      s4 = peg$parse_();
      s2 = [s2, s3, s4];
      s1 = s2;
    } else {
      peg$currPos = s1;
      s1 = peg$FAILED;
    }
    if (s1 === peg$FAILED) {
      s1 = peg$parse_();
    }
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 44) {
        s4 = peg$c2;
        peg$currPos++;
      } else {
        s4 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e2); }
      }
      if (s4 !== peg$FAILED) {
        s5 = peg$parse_();
        s6 = peg$parseargument();
        if (s6 !== peg$FAILED) {
          s7 = peg$parse_();
          s4 = [s4, s5, s6, s7];
          s3 = s4;
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      } else {
        peg$currPos = s3;
        s3 = peg$FAILED;
      }
      if (s3 === peg$FAILED) {
        s3 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 44) {
          s4 = peg$c2;
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e2); }
        }
        if (s4 !== peg$FAILED) {
          s5 = peg$parse_();
          s4 = [s4, s5];
          s3 = s4;
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      }
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 44) {
          s4 = peg$c2;
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e2); }
        }
        if (s4 !== peg$FAILED) {
          s5 = peg$parse_();
          s6 = peg$parseargument();
          if (s6 !== peg$FAILED) {
            s7 = peg$parse_();
            s4 = [s4, s5, s6, s7];
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
        if (s3 === peg$FAILED) {
          s3 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 44) {
            s4 = peg$c2;
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e2); }
          }
          if (s4 !== peg$FAILED) {
            s5 = peg$parse_();
            s4 = [s4, s5];
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        }
      }
      peg$savedPos = s0;
      s0 = peg$f2(s1, s2);
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = '';
      peg$savedPos = s0;
      s1 = peg$f3();
      s0 = s1;
    }

    return s0;
  }

  function peg$parseargument() {
    var s0;

    s0 = peg$parsefunctionCall();
    if (s0 === peg$FAILED) {
      s0 = peg$parsestar();
      if (s0 === peg$FAILED) {
        s0 = peg$parseidentifier();
        if (s0 === peg$FAILED) {
          s0 = peg$parsestringLiteral();
          if (s0 === peg$FAILED) {
            s0 = peg$parsenumberLiteral();
            if (s0 === peg$FAILED) {
              s0 = peg$parsegroup();
            }
          }
        }
      }
    }

    return s0;
  }

  function peg$parsegroup() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 40) {
      s1 = peg$c0;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e0); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parseargumentList();
      if (s2 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 41) {
          s3 = peg$c1;
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e1); }
        }
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f4(s2);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parse_() {
    var s0, s1;

    peg$silentFails++;
    s0 = [];
    if (peg$r0.test(input.charAt(peg$currPos))) {
      s1 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e4); }
    }
    while (s1 !== peg$FAILED) {
      s0.push(s1);
      if (peg$r0.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e4); }
      }
    }
    peg$silentFails--;
    s1 = peg$FAILED;
    if (peg$silentFails === 0) { peg$fail(peg$e3); }

    return s0;
  }

  function peg$parseidentifier() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    s1 = peg$parseletter();
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$parseletterOrDigitOrSpecial();
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$parseletterOrDigitOrSpecial();
      }
      peg$savedPos = s0;
      s0 = peg$f5(s1, s2);
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsestringLiteral() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 34) {
      s1 = peg$c3;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e5); }
    }
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$parsedoubleChar();
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$parsedoubleChar();
      }
      if (input.charCodeAt(peg$currPos) === 34) {
        s3 = peg$c3;
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e5); }
      }
      if (s3 !== peg$FAILED) {
        peg$savedPos = s0;
        s0 = peg$f6(s2);
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 39) {
        s1 = peg$c4;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e6); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parsesingleChar();
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parsesingleChar();
        }
        if (input.charCodeAt(peg$currPos) === 39) {
          s3 = peg$c4;
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e6); }
        }
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f7(s2);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    }

    return s0;
  }

  function peg$parsestar() {
    var s0, s1;

    s0 = peg$currPos;
    if (peg$r1.test(input.charAt(peg$currPos))) {
      s1 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e7); }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f8(s1);
    }
    s0 = s1;

    return s0;
  }

  function peg$parsenumberLiteral() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = [];
    if (peg$r2.test(input.charAt(peg$currPos))) {
      s2 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e8); }
    }
    if (s2 !== peg$FAILED) {
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$r2.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e8); }
        }
      }
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f9(s1);
    }
    s0 = s1;

    return s0;
  }

  function peg$parseletter() {
    var s0;

    if (peg$r3.test(input.charAt(peg$currPos))) {
      s0 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e9); }
    }

    return s0;
  }

  function peg$parseletterOrDigitOrSpecial() {
    var s0;

    if (peg$r4.test(input.charAt(peg$currPos))) {
      s0 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e10); }
    }

    return s0;
  }

  function peg$parsedoubleChar() {
    var s0;

    if (peg$r5.test(input.charAt(peg$currPos))) {
      s0 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e11); }
    }
    if (s0 === peg$FAILED) {
      if (input.substr(peg$currPos, 2) === peg$c5) {
        s0 = peg$c5;
        peg$currPos += 2;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e12); }
      }
    }

    return s0;
  }

  function peg$parsesingleChar() {
    var s0;

    if (peg$r6.test(input.charAt(peg$currPos))) {
      s0 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e13); }
    }
    if (s0 === peg$FAILED) {
      if (input.substr(peg$currPos, 2) === peg$c6) {
        s0 = peg$c6;
        peg$currPos += 2;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e14); }
      }
    }

    return s0;
  }

  function peg$parseignored() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = [];
    if (peg$r7.test(input.charAt(peg$currPos))) {
      s2 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e15); }
    }
    if (s2 !== peg$FAILED) {
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$r7.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e15); }
        }
      }
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f10(s1);
    }
    s0 = s1;

    return s0;
  }

  function peg$parsealsoIgnored() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = [];
    if (peg$r8.test(input.charAt(peg$currPos))) {
      s2 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e16); }
    }
    if (s2 !== peg$FAILED) {
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$r8.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e16); }
        }
      }
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f11(s1);
    }
    s0 = s1;

    return s0;
  }

  peg$result = peg$startRuleFunction();

  if (peg$result !== peg$FAILED && peg$currPos === input.length) {
    return peg$result;
  } else {
    if (peg$result !== peg$FAILED && peg$currPos < input.length) {
      peg$fail(peg$endExpectation());
    }

    throw peg$buildStructuredError(
      peg$maxFailExpected,
      peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
      peg$maxFailPos < input.length
        ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1)
        : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
    );
  }
}

  return {
    SyntaxError: peg$SyntaxError,
    parse: peg$parse
  };
})()

