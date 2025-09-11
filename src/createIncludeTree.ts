import readline from 'readline';
import fs from 'fs';
import * as vscode from 'vscode';
import State from './State';

const includeTypes: string[] = [
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

export interface IncludeTreeEntry extends vscode.TreeItem {
  seq: number;
  global: number;
  type: string;
  parentIndex: number;
  local: number;
  filename: string;
  children: IncludeTreeEntry[];
  parent: IncludeTreeEntry | null;
  lastEntry?: IncludeTreeEntry;
}

interface CreateIncludeTreeOptions { ignoreTypes?: string[]; ignoreFiles?: string[]; }

export class gamsIncludeExplorer {
  constructor(context: vscode.ExtensionContext, state: State) {
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
        if (includeTree) {
          const elem = includeTreeProvider.findRecursive(includeTree, editor.document.fileName);
          if (elem) { await view.reveal(elem, { focus: true, expand: true }); }
        }
      }
    }));
    // add a command that follows a path to the include file when in the corresponding line
    context.subscriptions.push(vscode.commands.registerCommand("gams.followIncludePath", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }
      const document = editor.document;
      const position = editor.selection.active;
      // find the cuurrent file in the include tree
      const includeTree = includeTreeProvider.treeView;
      if (includeTree) {
        const elem = includeTreeProvider.findRecursive(includeTree, document.fileName);
        if (elem) {
          const child = elem.children.find((c: IncludeTreeEntry) => c.local === position.line + 1);
          if (child?.resourceUri) { await vscode.window.showTextDocument(child.resourceUri, { preview: true }); }
        }
      }
    }));
    return includeTreeProvider;
  }
}

export class GAMSIncludeTreeProvider implements vscode.TreeDataProvider<IncludeTreeEntry> {
  private _onDidChangeTreeData: vscode.EventEmitter<IncludeTreeEntry | undefined | void> = new vscode.EventEmitter();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  public shouldRefresh = false;
  public treeView: IncludeTreeEntry | undefined;
  constructor(private state: State) {}

  findRecursive(treeView: IncludeTreeEntry | undefined, filePath: string): IncludeTreeEntry | undefined {
    if (!treeView) { return undefined; }
    if (treeView.resourceUri?.fsPath === filePath) { 
      return treeView; 
    }
    for (const child of treeView.children) {
      const found = this.findRecursive(child, filePath);
      if (found) { 
        return found; 
      }
    }
    return undefined;
  }
  getTreeItem(element: IncludeTreeEntry): vscode.TreeItem { 
    return element; 
  }

  getParent(element: IncludeTreeEntry): IncludeTreeEntry | null { 
    return element.parent; 
  }
  async getChildren(element?: IncludeTreeEntry): Promise<IncludeTreeEntry[] | null | undefined> {
    if (!this.treeView || this.shouldRefresh) {
      try {
        const parsedIncludes = this.state.get<IncludeTreeEntry[]>("parsedIncludes");
        if (!parsedIncludes) { 
          return null; 
        }
        const ignoreTypes = includeTypes.filter(type => !!this.state.get(`modelTreeIsHidden${type.replace(" ", "_")}`));
        const ignoreFiles = this.state.get<string[]>("ignoreFilesIncludeTree");
        this.treeView = createIncludeTree(parsedIncludes as unknown as any[], { ignoreTypes, ignoreFiles });
        this.shouldRefresh = false;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage("Error creating model include tree: " + message);
      }
    }
  if (!element) { return this.treeView ? [this.treeView] : null; }
    return element.children;
  }
  refresh(): void { this.shouldRefresh = true; this._onDidChangeTreeData.fire(); }
}
export function createGAMSIncludeTreeProvider(state: State): GAMSIncludeTreeProvider { 
  return new GAMSIncludeTreeProvider(state); 
}

interface CompileTimeVariableEntry { level: number; name: string; type: string; description: string; readonly data: Record<string, string> | null; }
interface IncludeFileSummaryEntry { seq: number; global: number; type: string; parentIndex: number; local: number; filename: string; }
export interface ParseIncludeFileSummaryResult { includeFileSummary: IncludeFileSummaryEntry[]; compileTimeVariables: CompileTimeVariableEntry[]; }

export function parseIncludeFileSummary(lstFile: string, state: State): Promise<ParseIncludeFileSummaryResult> {
  const shouldParseInclude = vscode.workspace.getConfiguration("gamsIde").get("enableModelIncludeTreeView");

  return new Promise<ParseIncludeFileSummaryResult>((resolve, reject) => {
    const rl = readline.createInterface({
      input: fs.createReadStream(lstFile),
      crlfDelay: Infinity
    });
    const includeFileSummary: IncludeFileSummaryEntry[] = [];
    const compileTimeVariables: CompileTimeVariableEntry[] = [];
    let inIncludeFileSummary = false;
    let inCompileTimeVariableList = false;

    rl.on('line', (line: string) => {
      // skip empty lines
      if (line.length === 0 || line === "\r" || line === "\n") {
        return;
      } else if (line.startsWith("Include File Summary") && shouldParseInclude) {
        inIncludeFileSummary = true;
      } else if (line.startsWith("---- Begin of Compile-time Variable List")) {
        inCompileTimeVariableList = true;
      } else if (inIncludeFileSummary && line.match(/^\s/)) {
        const tokens = line.split(/\s+/);
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
          const fixedName = fixFileName(tokens[6]);
          const file: IncludeFileSummaryEntry = {
            seq: parseInt(tokens[1]),
            global: parseInt(tokens[2]),
            type: tokens[3],
            parentIndex: parseInt(tokens[4]),
            local: parseInt(tokens[5]),
            filename: fixedName ?? tokens[6]
          };
          // Push the object to the array
          includeFileSummary.push(file);
        }
      } else if (inCompileTimeVariableList && line.split(/\s+/).length >= 5) {        
  const tokens = line.split(/\s+/);
        // If the line has six tokens, then it is a valid entry
        // Create an object with properties corresponding to each column
        const file: CompileTimeVariableEntry = {
          level: parseInt(tokens[1]),
          name: tokens[2],
          type: tokens[3],
          description: tokens.slice(4).join(" "),
          get data() {
            const solves = state.get<{ line: number }[]>("solves");
            if (!solves) {
              return null;
            }
            const data: Record<string, string> = {};
            solves.forEach((solve: { line: number }) => {
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

    rl.on('error', (err: Error) => {
      reject(err);
    });
  });
};

export function fixFileName(filename: string): string | undefined {
  // remove any leading . characters from the file name
  if (filename.startsWith(".")) {
    return /\.+(.*)/.exec(filename)?.[1];
  }
  return filename;
}

export function createIncludeTree(parsedIncludes: any[], options: CreateIncludeTreeOptions = {}): IncludeTreeEntry {
  const { ignoreTypes = [], ignoreFiles = [] } = options;
  const initial: any = {};
  const result = parsedIncludes.reduce(
    (treeView: any, entry: any, i: number, arr: any[]) => {
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
          let node: IncludeTreeEntry = new vscode.TreeItem(Uri, vscode.TreeItemCollapsibleState.None) as IncludeTreeEntry;
          node.description = entry.type;
          // use file icon as default
          node.iconPath = new vscode.ThemeIcon("file");
          // a click opens the location of the include, aka the parents file path at the local line number
          node.command = {
            command: "gams.openFile",
            title: "Open file",
            arguments: [treeView.lastEntry?.resourceUri, entry.local]
          };
          node = Object.assign(node, { ...entry, children: [], parent: treeView.lastEntry });
          // indicate that lastEntry is collapsible
          treeView.lastEntry.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
          treeView.lastEntry.children.push(node);
          treeView.lastEntry = node;
        } else if (treeView.lastEntry.parentIndex === entry.parentIndex) {
          // this is a node on the same level as the parent node
          const parentEntry = treeView.lastEntry.parent;
          const Uri = vscode.Uri.file(entry.filename);
          let node: IncludeTreeEntry = new vscode.TreeItem(Uri, vscode.TreeItemCollapsibleState.None) as IncludeTreeEntry;
          node.description = entry.type;
          // use file icon as default
          node.iconPath = new vscode.ThemeIcon("file");
          // a click opens the location of the include, aka the parents file path at the local line number
          node.command = {
            command: "gams.openFile",
            title: "Open file",
            arguments: [parentEntry?.resourceUri, entry.local]
          };
          node = Object.assign(node, { ...entry, children: [], parent: parentEntry });
          parentEntry.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
          parentEntry.children.push(node);
          treeView.lastEntry = node;
        } else if (treeView.lastEntry.parentIndex > entry.parentIndex) {
          // this is a new node higher up in the tree view
          let parentEntry = treeView.lastEntry.parent;
          while (parentEntry.parentIndex >= entry.parentIndex) {
            if (!parentEntry.parent) { break; }
            parentEntry = parentEntry.parent;
          }
          const Uri = vscode.Uri.file(entry.filename);
          let node: IncludeTreeEntry = new vscode.TreeItem(Uri, vscode.TreeItemCollapsibleState.None) as IncludeTreeEntry;
          node.description = entry.type;
          // use file icon as default
          node.iconPath = new vscode.ThemeIcon("file");
          // a click opens the location of the include, aka the parents file path at the local line number
          node.command = {
            command: "gams.openFile",
            title: "Open file",
            arguments: [parentEntry?.resourceUri, entry.local]
          };
          node = Object.assign(node, { ...entry, children: [], parent: parentEntry });
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
    initial
  );
  return result as IncludeTreeEntry;
}