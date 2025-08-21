const vscode = require('vscode');
const readline = require('readline');
const fs = require('fs');
const shell = require('shelljs');
const path = require('path');

export default async function createRefTreeWithSymbolValues(options) {
  const {
    file,
    filePath,
    scratchdir,
    gamsexe,
    dataProgress,
    cancellationToken,
    state
  } = options;
  
  const referenceTree = state.get("referenceTree");
  // reset gamsSolve state
  // state.update("solves", [{
  //   model: "Compile time",
  //   line: 0
  // }]);
  state.update("solves", []);
  state.update("dataStore", {});
  const solvesStore = state.get("solves");
  const dataInStore = state.get("dataStore");
  dataProgress.report({ message: "Creating DMP File" });
  const {
    dumpFile,
    solves
  } = await parseDMP(file, { scratchdir, gamsexe }, referenceTree);
  
  dataProgress.report({ message: "Executing DMP" });
  const lst = await execDMP(dumpFile, { scratchdir, gamsexe, filePath, cancellationToken });
  // if the request is cancelled, the will be no lst
  // return silently
  if (!lst) {
    return;
  }
  dataProgress.report({ message: "Parsing DMP" });
  let dataStore;
  try {
    dataStore = await getData(lst, solves, solvesStore, referenceTree, dataInStore);
  } catch (error) {
    throw error;
  }
  
  state.update("solves", solvesStore);
  state.update("dataStore", dataStore);
};

function parseDMP(file, config, referenceTree) {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(file);
    const rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity
    });

    let lineno = 0;
    const defaultSettings = vscode.workspace.getConfiguration("gamsIde");
    const consoleDispWidth = defaultSettings.get('consoleDispWidth');
    const resLim = defaultSettings.get('parseGamsDataResLim');
    const dumpFile = fs.createWriteStream(`${config.scratchdir}${path.sep}${path.basename(file, '.dmp')}.gms`, { flags: 'w' });
    
    const symbols = referenceTree?.filter(o => { return o.type === 'SET' || o.type === 'PARAM' && o.name; });
    const solves = [];

    rl.on('line', (line) => {
      if (/solve (.*?) using/i.test(line)) {
        const model = line.split(/solve/i)[1].split(/\s+/)[1];
        dumpFile.write('option dispWidth='+ consoleDispWidth +';\ndisplay\n');
        lineno += 2;
        const display = lineno + 1;
        symbols.forEach((symbol) => {
          dumpFile.write(`$if defined ${symbol.name} ${symbol.name} \n`);
          lineno++;
        });

        dumpFile.write(';\n');
        dumpFile.write(`${model}.limrow=${defaultSettings.get('consoleLimrow')};
          ${model}.limcol=${defaultSettings.get('consoleLimcol')};
          ${model}.solprint=1;
          ${model}.resLim=${resLim};
          option limrow=${defaultSettings.get('consoleLimrow')};
          option limcol=${defaultSettings.get('consoleLimcol')};
          `);
        dumpFile.write(line + '\n');
        lineno += 8;

        solves.push({
          model: model,
          line: lineno,
          display: display
        });

      } else if (!/display.*?;/gi.test(line)) {
        lineno++;
        dumpFile.write(line + '\n');
      }
    });

    rl.on('close', () => {
      dumpFile.end();
      fs.unlink(file, (err) => {
        if (err) throw err;
      });
      resolve({
        dumpFile,
        solves
      });
    });

    rl.on('error', err => {
      console.log('error in parseDMP', err);
      reject(err);
    });
  });
}

function execDMP(dumpFile, config) {
  return new Promise((resolve) => {
    const listingPath = `${dumpFile.path}.lst`;
    const defaultSettings = vscode.workspace.getConfiguration("gamsIde");
    const resLim = defaultSettings.get('parseGamsDataResLim');    
    const gamsParams = `"${config.gamsexe}" "${dumpFile.path}" -workdir="${config.filePath}" -curDir="${config.filePath}" o="${listingPath}" suppress=1 pageWidth=80 pageSize=0 lo=3 resLim=${resLim} -scrdir="${config.scratchdir}"`;
    
    if (config.cancellationToken.isCancellationRequested) {
      resolve("");
      return;
    }

    shell.cd(config.scratchdir);
    
    const process = shell.exec(gamsParams, {silent: true}, (code, stdout, stderr) => {
      if (code !== 0) {
        console.log('Error in dmp exec: ' + stdout, stderr);
        // reject(stderr)
      }
      // fs.unlink(dumpFile.path, (err) => {
      //   if (err) throw err;
      // });      
      resolve(listingPath);
    });

    config.cancellationToken.onCancellationRequested(() => {
      process.kill();
    });

  });
}

function getData(lst, solves, gamsSolves, referenceTree, dataStore) {
  const timestamp = new Date().getTime();
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(lst);
    const rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity
    });
    let curSym, curData, curSection, curSolve, foundError;

    function save(solve, symbol, data) {
      // save solve
      const curSolve = solves.find(s => s.line === Number(solve));
      if (curSolve) {
        const statement = {
          timestamp,
          model: curSolve.model,
          line: Number(solve)
        };
        if (!gamsSolves.find(s => s.line === Number(solve))) {
          gamsSolves.push(statement);
        }
      }
      // save entry, overwrite any previous entries
      const entry = referenceTree.find(el => {
        if (el.name && symbol) return el.name.toLowerCase() === symbol.toLowerCase();
      });

      if (entry) {
        if (!dataStore[entry.name]) dataStore[entry.name] = [];
        dataStore[entry.name].push({
          solve: Number(solve),
          data: data
        });
        curSym = '';
        curData = '';
      }
    }

    rl.on('line', (line) => {
      // Save current section of the listing file and the associated solve
      if (line.includes('C o m p i l a t i o n'))  {
        curSection = 'Compilation';
      } else if (line.includes('E x e c u t i o n')) {
        curSection = 'Displays';
      } else if (line.includes('Equation Listing')) {
        curSection = 'Equations';
        curSolve = line.split(/[\s]+/)[8];
      } else if (line.includes('Column Listing')) {
        curSection = 'Variables';
        curSolve = line.split(/[\s]+/)[8];
      }
      // save data according to sections
      // Displays, Equations, Variables
      else if (/^(----)\s*/.test(line)) {
        if (curSym) save(curSolve, curSym, curData);
        if (curSection === 'Displays') {
          const dispLine = Number(line.split(/[\s]+/)[1]);
          const symbol = line.split(/[\s]+/)[3];
          const pieces = line.split(/[\s]+/);
          pieces.splice(0, 2);
          const data = pieces.join(' ');
          const solve = solves.find(s => s.display === dispLine);
          if (!solve) return;
          curSym = symbol;
          curSolve = solve.line;
          curData = `---- ${data}`;
        } else {
          const symbol = line.split(/[\s]+/)[1];
          curSym = symbol;
          curData = `${line}\n`;
        }
      }
      // sometimes set and parameters are displayed right below each other,
      // therefore the above if statement won't catch these statements
      else if (line.includes('PARAMETER') || line.includes('SET')) {
        if (curSym) save(curSolve, curSym, curData);
        if (curSection === 'Displays') {
          const symbol = line.split(/[\s]+/)[2];
          const pieces = line.split(/[\s]+/);
          pieces.splice(0, 1);
          const data = pieces.join(' ');
          curSym = symbol;
          curData = `---- ${data}`;
        }
      }
      // abort if compilation errors
      else if (curSection === 'Compilation' && line.includes('****')) {
        foundError = true;
        reject("Compilation error in DMP .lst file");
      } else if (line.includes('Error Messages') || line.includes('**** USER ERROR(S) ENCOUNTERED')) {
        foundError = true;
        reject("User error in DMP .lst file");
      }
      // anything else
      else if (/^(\*\*\*\*)\s*\d/.test(line) || /^(GAMS)/.test(line) || line.includes("G e n e r a l") || /^(Range Statistics)/.test(line) || /^(RANGE STATISTICS)/.test(line) ) {
        save(curSolve, curSym, curData);
      } else {
        curData += line + '\n';
      }
    });

    rl.on('close', () => {
      if (foundError) return;
      console.log('close and unlink', lst);
      fs.unlink(lst, (err) => {
        if (err) throw err;
      });
      resolve(dataStore);
    });

    rl.on('error', err => {
      console.log('error in getData', err);
      reject(err);
    });
  });
}