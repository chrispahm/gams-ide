input
  = parts:(functionCall / ignored / alsoIgnored)* {
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
  }

functionCall
  = name:identifier "(" args:argumentList ")"? {
    return {type: "functionCall", name: name.name, args: args};
  }

argumentList
  = head:((_ argument _) / _) tail:(((",") _ argument _) / ("," _))*  {
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
  }
  / "" { return []; }


argument
  = functionCall / star / identifier / stringLiteral / numberLiteral / group

group
  = "(" args:argumentList ")" {
    return {type: "group", args: args};
  }
  
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

star 
  = first:[\*] {
    return {
      name: "*",
      isQuoted: false,
      wsCount: 0
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