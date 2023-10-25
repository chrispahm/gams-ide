const readline = require('readline');
const fs = require('fs');
const vscode = require('vscode');

const includeTypes = [
  "EXIT",
  "INCLUDE",
  "BATINCLUDE",
  "LIBINCLUDE",
  "SYSINCLUDE",
  "CALL",
  "CALL.ASYNC",
  "CALL.TOOL",
  "GDXIN",
  "GDXOUT",
  "IF EXIST",
  "IF DEXIST",
  "FUNCLIBIN",
  "TERMINATE",
  "STOP"
];

class gamsIncludeExplorer {
  constructor(context, state) {
    const includeTreeProvider = createGAMSIncludeTreeProvider(state);
    const view = vscode.window.createTreeView("gamsIdeModelTree", {
      treeDataProvider: includeTreeProvider,
      showCollapseAll: true
    });
    context.subscriptions.push(view);
    vscode.commands.registerCommand("gams.refreshIncludeTree", () => includeTreeProvider.refresh());
    vscode.commands.registerCommand("gams.openFile", (resource, line) => {
      if (line === 0) {
        line = 1;
      }
      vscode.window.showTextDocument(resource, { selection: new vscode.Range(line - 1, 0, line - 1, 0), preview: true });
    });
    // when the active editor changes, we call the reveal method with the new file path
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(async (editor) => {
      if (editor && editor.document.languageId === "gams" && view.visible) {
        // reveal the current file in the include tree
        // find the element in the treeview
        const includeTree = includeTreeProvider.treeView;
        const elem = includeTreeProvider.findRecursive(includeTree, editor.document.fileName);
        await view.reveal(elem, { focus: true, expand: true });
      }
    }));
    return includeTreeProvider;
  }
}

function createGAMSIncludeTreeProvider(state) {
  class GAMSIncludeTreeProvider {
    constructor() {
      this._onDidChangeTreeData = new vscode.EventEmitter();
      this.onDidChangeTreeData = this._onDidChangeTreeData.event;
      this.shouldRefresh = false;
    }

    findRecursive(treeView, filePath) {
      if (treeView?.resourceUri?.fsPath == filePath) {
        return treeView;
      } else {
        for (const child of treeView.children) {
          const found = this.findRecursive(child, filePath);
          if (found) {
            return found;
          }
        }
      }
    }

    getTreeItem(element) {
      return element;
    }

    getParent(element) {
      if (!element) {
        return undefined;
      }
      return element.parent;
    }

    async getChildren(element) {
      if (!this.treeView || this.shouldRefresh) {
        try {
          const parsedIncludes = state.get("parsedIncludes");
          if (!parsedIncludes) {
            // no include tree in state -> return null
            return null;
          };
          // check if any of the include types are hidden
          const ignoreTypes = includeTypes.filter((type) => {
            return state.get(`modelTreeIsHidden${type.replace(" ", "_")}`);
          });
          // check if any of the files are hidden
          const ignoreFiles = state.get("ignoreFilesIncludeTree");
          this.treeView = createIncludeTree(parsedIncludes, { ignoreTypes, ignoreFiles });
          this.shouldRefresh = false;
        } catch (err) {
          vscode.window.showErrorMessage("Error creating model include tree: ", err.message);
        }
      }
      if (!element) {
        return [this.treeView];

      } else {
        return element.children;
      }
    }

    refresh() {
      this.shouldRefresh = true;
      this._onDidChangeTreeData.fire();
    }
  }
  return new GAMSIncludeTreeProvider();
}

function parseIncludeFileSummary(lstFile, state) {
  const shouldParseInclude = vscode.workspace.getConfiguration("gamsIde").get("enableModelIncludeTreeView");

  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: fs.createReadStream(lstFile),
      crlfDelay: Infinity
    });

    const includeFileSummary = [];
    const compileTimeVariables = [];
    let inIncludeFileSummary = false;
    let inCompileTimeVariableList = false;

    rl.on('line', (line) => {
      // skip empty lines
      if (line.length === 0 || line === "\r" || line === "\n") {
        return;
      } else if (line.startsWith("Include File Summary") && shouldParseInclude) {
        inIncludeFileSummary = true;
      } else if (line.startsWith("---- Begin of Compile-time Variable List")) {
        inCompileTimeVariableList = true;
      } else if (inIncludeFileSummary && line.match(/^\s/)) {
        let tokens = line.split(/\s+/);
        // If the line has six tokens, then it is a valid entry
        if (tokens.length === 7) {
          // since we use the compile.gms file as the root, we need to remove it from the include file summary
          if (parseInt(tokens[1]) === 1 && tokens[3] === "INPUT") {
            // skip this entry, as it's the compile.gms file
            return;
          } else if (parseInt(tokens[1]) === 2) {
            // this is the actual main file
            tokens[3] = "INPUT";
          }
          // Create an object with properties corresponding to each column
          let file = {
            seq: parseInt(tokens[1]), // Parse the sequence number as an integer
            global: parseInt(tokens[2]), // Parse the global line number as an integer
            type: tokens[3], // Keep the type as a string
            parentIndex: parseInt(tokens[4]), // Parse the parent sequence number as an integer
            local: parseInt(tokens[5]), // Parse the local line number as an integer
            // strip any leading . characters from the file name
            filename: fixFileName(tokens[6]) // Keep the filename as a string
          };
          // Push the object to the array
          includeFileSummary.push(file);
        }
      } else if (inCompileTimeVariableList && line.split(/\s+/).length >= 5) {        
        let tokens = line.split(/\s+/);
        // If the line has six tokens, then it is a valid entry
        // Create an object with properties corresponding to each column
        let file = {
          level: parseInt(tokens[1]),
          name: tokens[2],
          type: tokens[3],
          description: tokens.slice(4).join(" "),
          get data() {
            const solves = state.get("solves");
            if (!solves) {
              return null;
            }
            const data = {};
            solves.forEach((solve) => {
              data[`line_${Number(solve.line)}`] = `---- ${tokens[3]} ${tokens[2]}\n${tokens.slice(4).join(" ")}`;
            });
            return data;
          }
        };
        // Push the object to the array
        compileTimeVariables.push(file);
      } else if (inIncludeFileSummary) {
        inIncludeFileSummary = false;
      } else if (inIncludeFileSummary) {
        inCompileTimeVariableList = false;
      }
    });

    rl.on('close', () => {
      if (includeFileSummary.length === 0 && shouldParseInclude) {
        reject(new Error('No include file summary found. Remove $offInclude to activate.'));
      } else {
        resolve({ includeFileSummary, compileTimeVariables });
      }
    });

    rl.on('error', (err) => {
      reject(err);
    });
  });
};

function fixFileName(filename) {
  // remove any leading . characters from the file name
  if (filename.startsWith(".")) {
    return /\.+(.*)/.exec(filename)?.[1];
  }
  return filename;
}

function createIncludeTree(parsedIncludes, options = {}) {
  const { ignoreTypes = [], ignoreFiles = [] } = options;

  return parsedIncludes.reduce(
    (treeView, entry, i, arr) => {
      if (entry.type === "INPUT") {
        const Uri = vscode.Uri.file(entry.filename);
        treeView = new vscode.TreeItem(Uri, vscode.TreeItemCollapsibleState.Expanded);
        treeView.command = {
          command: "gams.openFile",
          title: "Open file",
          arguments: [Uri, entry.local]
        };
        treeView = {
          ...entry,
          children: [],
          parent: null,
          ...treeView
        };
        treeView.lastEntry = treeView;
      } else if (i > 0 && treeView.filename) {
        // first check if the file is excluded
        if (
          ignoreTypes.some((t) => t === entry.type) ||
          ignoreFiles.some((f) =>
            entry.filename.toLowerCase().includes(f.toLowerCase())
          )
        ) {
          // pass
        } else if (treeView.lastEntry.parentIndex < entry.parentIndex) {
          // this is a child node!
          const Uri = vscode.Uri.file(entry.filename);
          let node = new vscode.TreeItem(Uri, vscode.TreeItemCollapsibleState.None);
          node.description = entry.type;
          // use file icon as default
          node.iconPath = new vscode.ThemeIcon("file");
          // a click opens the location of the include, aka the parents file path at the local line number
          node.command = {
            command: "gams.openFile",
            title: "Open file",
            arguments: [treeView.lastEntry?.resourceUri, entry.local]
          };
          node = {
            ...entry,
            children: [],
            parent: treeView.lastEntry,
            ...node
          };
          // indicate that lastEntry is collapsible
          treeView.lastEntry.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
          treeView.lastEntry.children.push(node);
          treeView.lastEntry = node;
        } else if (treeView.lastEntry.parentIndex === entry.parentIndex) {
          // this is a node on the same level as the parent node
          const parentEntry = treeView.lastEntry.parent;
          const Uri = vscode.Uri.file(entry.filename);
          let node = new vscode.TreeItem(Uri, vscode.TreeItemCollapsibleState.None);
          node.description = entry.type;
          // use file icon as default
          node.iconPath = new vscode.ThemeIcon("file");
          // a click opens the location of the include, aka the parents file path at the local line number
          node.command = {
            command: "gams.openFile",
            title: "Open file",
            arguments: [parentEntry?.resourceUri, entry.local]
          };
          node = {
            ...entry,
            children: [],
            parent: parentEntry,
            ...node
          };
          parentEntry.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
          parentEntry.children.push(node);
          treeView.lastEntry = node;
        } else if (treeView.lastEntry.parentIndex > entry.parentIndex) {
          // this is a new node higher up in the tree view
          let parentEntry = treeView.lastEntry.parent;
          while (parentEntry.parentIndex >= entry.parentIndex) {
            if (!parentEntry.parent) break;
            parentEntry = parentEntry.parent;
          }
          const Uri = vscode.Uri.file(entry.filename);
          let node = new vscode.TreeItem(Uri, vscode.TreeItemCollapsibleState.None);
          node.description = entry.type;
          // use file icon as default
          node.iconPath = new vscode.ThemeIcon("file");
          // a click opens the location of the include, aka the parents file path at the local line number
          node.command = {
            command: "gams.openFile",
            title: "Open file",
            arguments: [parentEntry?.resourceUri, entry.local]
          };
          node = {
            ...entry,
            children: [],
            parent: parentEntry,
            ...node
          };
          parentEntry.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
          parentEntry.children.push(node);
          treeView.lastEntry = node;
        }
      }
      if (i === arr.length - 1) {
        delete treeView.lastEntry;
      }
      return treeView;
    },
    {}
  );
}

module.exports = {
  createGAMSIncludeTreeProvider,
  parseIncludeFileSummary,
  createIncludeTree,
  gamsIncludeExplorer
};