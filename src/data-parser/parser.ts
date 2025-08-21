const readline = require('readline');
const fs = require('fs');

export default function dataParser(file) {
  return new Promise((resolve) => {

    const rl = readline.createInterface({
      input: fs.createReadStream(file),
      crlfDelay: Infinity
    });

    const ast = [];
    let entry;
    let lineno = 0;

    function save(type, pos, push, entries) {
      if (!entry) entry = {};
      if (type) entry.type = type;
      if (pos) {
        entry.line = pos[0];
        entry.column = pos[1];
        entry.file = file;
      }
      if (entries) {
        if (entry.entries) {
          entry.entries.push(entries);
          entry.open = true;
        }
        else entry.entries = [entries];
      }
      if (push) {
        ast.push(entry);
        entry = null;
      }
    }

    rl.on('line', (line) => {
      lineno++;

      if ((/^(\*\*\*\*)\s*\d\d/).test(line)) {
        const errorMessage = line.match(/(\*\*\*\*)\s*(.*)/)[2];
        save("Error: " + errorMessage, [
          [lineno],
          [0]
        ], true, null);
      } else if (line.includes('Model Statistics    ')) {
        if (entry) save(null, null, true, null);
        save(line, [
          [lineno],
          [0]
        ], true, null);
      } else if (line.includes('Equation Listing')) {
        if (entry) save(null, null, true, null);
        save(line, [
          [lineno],
          [0]
        ], false, null);
      } else if (line.includes('Column Listing')) {
        if (entry) save(null, null, true, null);
        save(line, [
          [lineno],
          [0]
        ], false, null);
      } else if (line.includes('Solution Report     ')) {
        if (entry) save(null, null, true, null);
        save(line, [
          [lineno],
          [0]
        ], true, null);
      } else if (line.includes('---- EQU')) {
        let equName = line.slice(9).split(/\s/)[0];
        if (entry && entry.type !== 'SolEQU') save(null, null, true, null);
        save('SolEQU', null, false, {
          name: equName,
          line: lineno,
          column: 1,
          file: file
        });
      } else if (line.includes('---- VAR')) {
        let varName = line.slice(9).split(/\s/)[0];

        if (entry && entry.type !== 'SolVAR') save(null, null, true, null);
        save('SolVAR', null, false, {
          name: varName,
          line: lineno,
          column: 1,
          file: file
        });
      } else if (/^(----)\s*\d/.test(line)) {
        let disName = line.split(/[\s]+/)[3];
        if (entry && entry.type !== 'Display') save(null, null, true, null);
        save('Display', null, false, {
          name: disName,
          line: lineno,
          column: 1,
          file: file
        });
      } else if (entry && /^(----)/.test(line) && entry.type.includes('Equation Listing')) {
        let equLst = line.split(/[\s]+/)[1];
        // if (entry && entry.type !== 'Display') save(null, null, true, null)
        save(null, null, false, {
          name: equLst,
          line: lineno,
          column: 1,
          file: file
        });
      } else if (entry && /^(----)/.test(line) && entry.type.includes('Column Listing')) {
        let colLst = line.split(/[\s]+/)[1];
        // if (entry && entry.type !== 'Display') save(null, null, true, null)
        save(null, null, false, {
          name: colLst,
          line: lineno,
          column: 1,
          file: file
        });
      }
    });

    rl.on('close', () => {
      // save last time to get displays after solve
      if (entry) save(null, null, true, null);
      resolve(ast);
    });
  });
};
