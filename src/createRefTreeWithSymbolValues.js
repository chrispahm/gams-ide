const vscode = require('vscode')
const readline = require('readline')
const fs = require('fs')
const _ = require('lodash')
const shell = require('shelljs')
const path = require('path')

module.exports = async function createRefTreeWithSymbolValues(options) {
  const {
    file,
    scratchdir,
    gamsexe,
    state
  } = options;
  
  const referenceTree = state.get("referenceTree");
  // reset gamsSolve state
  // state.update("solves", [{
  //   model: "Compile time",
  //   line: 0
  // }]);
  state.update("solves", []);
  const solvesStore = state.get("solves");
  
  const {
    dumpFile,
    solves
  } = await parseDMP(file, { scratchdir, gamsexe }, referenceTree);
  
  const lst = await execDMP(dumpFile, { scratchdir, gamsexe });
  
  try {
    await getData(lst, solves, solvesStore, referenceTree);
  } catch (error) {
    throw error
  }
  
  // save new data in store
  state.update("solves", solvesStore);
  state.update("referenceTree", referenceTree);
}

function parseDMP(file, config, referenceTree) {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(file)
    const rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity
    })

    let lineno = 0;
    const defaultSettings = vscode.workspace.getConfiguration("gamsIde");
    const consoleDispWidth = defaultSettings.get('consoleDispWidth');
    const dumpFile = fs.createWriteStream(`${config.scratchdir}${path.sep}${path.basename(file, '.dmp')}.gms`, { flags: 'w' });
    const symbols = _.filter(referenceTree, o => { return o.type === 'SET' || o.type === 'PARAM' && o.name; });
    const solves = [];

    rl.on('line', (line) => {
      if (/solve (.*?) using/i.test(line)) {
        const model = line.split(/solve/i)[1].split(/\s+/)[1];
        dumpFile.write('option dispWidth='+ consoleDispWidth +';\ndisplay\n');
        lineno += 2;
        const display = lineno + 1;
        symbols.forEach((symbol) => {
          dumpFile.write(`$if defined ${symbol.name} ${symbol.name} \n`)
          lineno++
        })

        dumpFile.write(';\n')
        dumpFile.write(`${model}.limrow=${defaultSettings.get('consoleLimrow')};
          ${model}.limcol=${defaultSettings.get('consoleLimcol')};
          ${model}.solprint=1;
          ${model}.resLim=0;
          option limrow=${defaultSettings.get('consoleLimrow')};
          option limcol=${defaultSettings.get('consoleLimcol')};
          `)
        dumpFile.write(line + '\n')
        lineno += 8

        solves.push({
          model: model,
          line: lineno,
          display: display
        })

      } else if (!/display.*?;/gi.test(line)) {
        lineno++
        dumpFile.write(line + '\n')
      }
    })

    rl.on('close', () => {
      dumpFile.end();
      fs.unlink(file, (err) => {
        if (err) throw err;
      });
      resolve({
        dumpFile,
        solves
      })
    })

    rl.on('error', reject)
  })
}

function execDMP(dumpFile, config) {
  return new Promise((resolve, reject) => {
    const gamsParams = config.gamsexe + ' "' + dumpFile.path + '" suppress=1 pageWidth=80 pageSize=0 lo=3 resLim=0 -scrdir="' + config.scratchdir + '" '
    shell.cd(config.scratchdir)
    
    shell.exec(gamsParams, {silent: true}, (code, stdout, stderr) => {
      if (code !== 0) {
        console.log('Error in dmp exec: ' + stdout, stderr)
        // reject(stderr)
      }
      fs.unlink(dumpFile.path, (err) => {
        if (err) throw err
      })      
      resolve(`${config.scratchdir}${path.sep}${path.basename(dumpFile.path, '.gms')}.lst`)
    })

  })
}

function getData(lst, solves, gamsSolves, referenceTree) {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(lst)
    const rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity
    })
    let curSym, curData, curSection, curSolve, foundError

    function save(solve, symbol, data) {
      // save solve
      const curSolve = _.find(solves, { 'line': Number(solve) })
      if (curSolve) {
        const statement = {
          model: curSolve.model,
          line: Number(solve)
        }
        if (!_.find(gamsSolves, { 'line': Number(solve) })) {
          gamsSolves.push(statement)
        }
      }
      // save entry, overwrite any previous entries
      const entry = referenceTree.find(el => {
        if (el.name && symbol) return el.name.toLowerCase() === symbol.toLowerCase()
      })

      if (entry) {
        if (!entry.data) entry.data = {}
        entry.data[`line_${Number(solve)}`] = data
        curSym = ''
        curData = ''
      }
    }

    rl.on('line', (line) => {
      // Save current section of the listing file and the associated solve
      if (line.includes('E x e c u t i o n')) {
        curSection = 'Displays'
      } else if (line.includes('Equation Listing')) {
        curSection = 'Equations'
        curSolve = line.split(/[\s]+/)[8]
      } else if (line.includes('Column Listing')) {
        curSection = 'Variables'
        curSolve = line.split(/[\s]+/)[8]
      }
      // save data according to sections
      // Displays, Equations, Variables
      else if (/^(----)\s*/.test(line)) {
        if (curSym) save(curSolve, curSym, curData)
        if (curSection === 'Displays') {
          const dispLine = Number(line.split(/[\s]+/)[1])
          const symbol = line.split(/[\s]+/)[3]
          const pieces = line.split(/[\s]+/)
          pieces.splice(0, 2)
          const data = pieces.join(' ')
          const solve = _.find(solves, { 'display': dispLine })
          if (!solve) return
          curSym = symbol
          curSolve = solve.line
          curData = `---- ${data}`
        } else {
          const symbol = line.split(/[\s]+/)[1]
          curSym = symbol
          curData = `${line}\n`
        }
      }
      // sometimes set and parameters are displayed right below each other,
      // therefore the above if statement won't catch these statements
      else if (line.includes('PARAMETER') || line.includes('SET')) {
        if (curSym) save(curSolve, curSym, curData)
        if (curSection === 'Displays') {
          const symbol = line.split(/[\s]+/)[2]
          const pieces = line.split(/[\s]+/)
          pieces.splice(0, 1)
          const data = pieces.join(' ')
          curSym = symbol
          curData = `---- ${data}`
        }
      }
      // abort if compilation errors
      else if (line.includes('Error Messages') || line.includes('**** USER ERROR(S) ENCOUNTERED')) {
        // rl.close()
        // stream.destroy()
        console.log('User errors in DMP lst file', lst);
        foundError = true
        reject("User error in DMP .lst file")
      }
      // anything else
      else if (/^(\*\*\*\*)\s*\d/.test(line) || /^(GAMS)/.test(line) || line.includes("G e n e r a l") || /^(Range Statistics)/.test(line) || /^(RANGE STATISTICS)/.test(line) ) {
        save(curSolve, curSym, curData)
      } else {
        curData += line + '\n'
      }
    })

    rl.on('close', () => {
      if (foundError) return
      console.log('close and unlink', lst);
      fs.unlink(lst, (err) => {
        if (err) throw err
      })
      resolve()
    })

    rl.on('error', reject)
  })
}