/**
 * Embedded Python Language Support for GAMS files
 * 
 * This module provides Python language server features for embedded Python code
 * sections within GAMS files. It handles detection of embedded code regions and
 * delegates language features to VS Code's Python language support.
 * 
 * GAMS Embedded Code Syntax:
 * 
 * Compile Time:
 * - $onEmbeddedCode[S|V][.tag] Python: [arguments]
 * - $$onEmbeddedCode[S|V][.tag] Python: [arguments]
 * - $offEmbeddedCode[.tag] {symbols}
 * 
 * Execution Time:
 * - embeddedCode[S|V][.tag] Python: [arguments]
 * - continueEmbeddedCode[S|V][.tag] [handle]: [arguments]
 * - endEmbeddedCode[.tag] {symbols}
 * - pauseEmbeddedCode[.tag] {symbols}
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * Represents an embedded Python code region within a GAMS document
 */
export interface EmbeddedPythonRegion {
    /** Start line of the Python code (0-indexed, after the opening directive) */
    codeStartLine: number;
    /** End line of the Python code (0-indexed, the line before the closing directive) */
    codeEndLine: number;
    /** The actual Python code content */
    code: string;
    /** Start column offset for the code (typically 0 for embedded Python) */
    startColumn: number;
    /** The type of embedded code directive used */
    type: 'compile' | 'execution';
    /** The language (should be Python or Connect) */
    language: string;
    /** Optional tag for the embedded code section */
    tag?: string;
}

// Regex patterns for detecting embedded Python code sections
// Compile time: $onEmbeddedCode[S|V][.tag] Python: [args]
// Note: Can also start with $$ if not at beginning of line
// Patterns allow optional leading whitespace since GAMS code is often indented
const COMPILE_START_PATTERN = /^\s*\$\$?onEmbeddedCode[SV]?(?:\.[\w]+)?\s+Python\s*:/i;

// Compile time end: $offEmbeddedCode[.tag] [symbols]
const COMPILE_END_PATTERN = /^\s*\$\$?offEmbeddedCode(?:\.[\w]+)?/i;

// Execution time: embeddedCode[S|V][.tag] Python: [args]
// Also handles: continueEmbeddedCode[S|V][.tag] Python: [args]
const EXECUTION_START_PYTHON_PATTERN = /^\s*(?:embeddedCode|continueEmbeddedCode)[SV]?(?:\.[\w]+)?\s+Python\s*:/i;

// Execution time end: endEmbeddedCode[.tag] or pauseEmbeddedCode[.tag]
const EXECUTION_END_PATTERN = /^\s*(?:end|pause)EmbeddedCode(?:\.[\w]+)?/i;

// Combined pattern for detecting Python embedded code start
const PYTHON_START_PATTERN = /(?:^\s*\$\$?onEmbeddedCode[SV]?(?:\.[\w]+)?\s+Python\s*:)|(?:^\s*(?:embeddedCode|continueEmbeddedCode)[SV]?(?:\.[\w]+)?\s+Python\s*:)/i;

/**
 * Parses a GAMS document and extracts all embedded Python code regions
 */
export function findEmbeddedPythonRegions(document: vscode.TextDocument): EmbeddedPythonRegion[] {
    const regions: EmbeddedPythonRegion[] = [];
    const text = document.getText();
    const lines = text.split('\n');
    
    let i = 0;
    while (i < lines.length) {
        const line = lines[i].trim();
        
        // Check for compile-time Python embedded code start
        if (COMPILE_START_PATTERN.test(line)) {
            const region = extractPythonRegion(lines, i, 'compile');
            if (region) {
                regions.push(region);
                i = region.codeEndLine + 2; // Skip to after the end directive
                continue;
            }
        }
        
        // Check for execution-time Python embedded code start
        if (EXECUTION_START_PYTHON_PATTERN.test(line)) {
            const region = extractPythonRegion(lines, i, 'execution');
            if (region) {
                regions.push(region);
                i = region.codeEndLine + 2; // Skip to after the end directive
                continue;
            }
        }
        
        i++;
    }
    
    return regions;
}

/**
 * Extracts a Python code region starting from the given line
 */
function extractPythonRegion(
    lines: string[],
    startLineIndex: number,
    type: 'compile' | 'execution'
): EmbeddedPythonRegion | null {
    const endPattern = type === 'compile' ? COMPILE_END_PATTERN : EXECUTION_END_PATTERN;
    
    // Extract tag if present from the start line
    const startLine = lines[startLineIndex].trim();
    const tagMatch = startLine.match(/(?:onEmbeddedCode|embeddedCode|continueEmbeddedCode)[SV]?\.([\w]+)/i);
    const tag = tagMatch ? tagMatch[1] : undefined;
    
    // Find the end of the embedded code section
    let endLineIndex = -1;
    for (let i = startLineIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Check for end pattern
        if (endPattern.test(line)) {
            // If there's a tag, make sure it matches
            if (tag) {
                const endTagMatch = line.match(/(?:offEmbeddedCode|endEmbeddedCode|pauseEmbeddedCode)\.([\w]+)/i);
                if (endTagMatch && endTagMatch[1].toLowerCase() === tag.toLowerCase()) {
                    // End line is the line before this directive
                    endLineIndex = i - 1;
                    break;
                }
                // Continue looking if tags don't match
            } else {
                // No tag in start, check if end has no tag either
                const hasEndTag = line.match(/(?:offEmbeddedCode|endEmbeddedCode|pauseEmbeddedCode)\.([\w]+)/i);
                if (!hasEndTag) {
                    // End line is the line before this directive
                    endLineIndex = i - 1;
                    break;
                }
            }
        }
        
        // Check if we hit another start pattern (error in GAMS code, but we should handle it)
        if (i > startLineIndex + 1 && PYTHON_START_PATTERN.test(line)) {
            endLineIndex = i - 1;
            break;
        }
    }
    
    // If no end found, treat the rest of the file as the Python code (might be incomplete file)
    if (endLineIndex < startLineIndex + 1) {
        // Check if there's at least one line of code
        if (startLineIndex + 1 < lines.length) {
            endLineIndex = lines.length - 1;
        } else {
            return null;
        }
    }
    
    // Extract the Python code
    const codeLines = lines.slice(startLineIndex + 1, endLineIndex + 1);
    const code = codeLines.join('\n');
    
    return {
        codeStartLine: startLineIndex + 1,
        codeEndLine: endLineIndex,
        code,
        startColumn: 0,
        type,
        language: 'python',
        tag
    };
}

/**
 * Checks if a position is within an embedded Python region
 */
export function isPositionInEmbeddedPython(
    document: vscode.TextDocument,
    position: vscode.Position
): EmbeddedPythonRegion | null {
    const regions = findEmbeddedPythonRegions(document);
    
    for (const region of regions) {
        if (position.line >= region.codeStartLine && position.line <= region.codeEndLine) {
            return region;
        }
    }
    
    return null;
}

/**
 * Gets the Python position within an embedded region
 * Returns the position adjusted for the embedded code context and stub preamble
 */
export function getPythonPosition(
    _document: vscode.TextDocument,
    position: vscode.Position,
    region: EmbeddedPythonRegion
): vscode.Position {
    // The line within the Python code (relative to region start)
    const pythonLine = position.line - region.codeStartLine;
    // Add stub preamble offset
    const stubOffset = getTempFileManager().getStubLineOffset();
    // The character position (same as original since Python starts at column 0)
    const pythonCharacter = position.character;
    
    return new vscode.Position(pythonLine + stubOffset, pythonCharacter);
}

/**
 * Converts a Python position back to the GAMS document position
 * Accounts for stub preamble offset
 */
export function getGamsPosition(
    pythonPosition: vscode.Position,
    region: EmbeddedPythonRegion
): vscode.Position {
    // Remove stub preamble offset
    const stubOffset = getTempFileManager().getStubLineOffset();
    return new vscode.Position(
        pythonPosition.line - stubOffset + region.codeStartLine,
        pythonPosition.character
    );
}

/**
 * Stub definitions for ECGamsDatabase (the `gams` object)
 * This provides IntelliSense for the gams variable in embedded Python code
 */
const GAMS_STUB_PREAMBLE = `
# Type stubs for GAMS Embedded Python - auto-generated for IntelliSense
from typing import Any, Callable, Iterator, List, Optional, Set, Tuple, Union, Literal
from enum import Enum

class KeyType(Enum):
    STRING = "STRING"
    INT = "INT"

class KeyFormat(Enum):
    TUPLE = "TUPLE"
    FLAT = "FLAT"
    SKIP = "SKIP"
    AUTO = "AUTO"

class ValueFormat(Enum):
    TUPLE = "TUPLE"
    FLAT = "FLAT"
    SKIP = "SKIP"
    AUTO = "AUTO"

class RecordFormat(Enum):
    TUPLE = "TUPLE"
    FLAT = "FLAT"
    AUTO = "AUTO"

class MergeType(Enum):
    DEFAULT = "DEFAULT"
    MERGE = "MERGE"
    REPLACE = "REPLACE"

class DomainCheckType(Enum):
    DEFAULT = "DEFAULT"
    CHECKED = "CHECKED"
    FILTERED = "FILTERED"

class DebugLevel(Enum):
    Off = 0
    KeepFiles = 1
    ShowLog = 2
    Verbose = 3

class ECGamsDatabase:
    """Interface between GAMS and Python in embedded code sections."""
    
    arguments: str
    """Command line arguments passed to the embedded code section."""
    
    epsAsZero: bool
    """Flag to read GAMS EPS as 0 (True) or small number (False). Default: True."""
    
    ws: Any
    """GamsWorkspace instance for GAMS control API access."""
    
    wsWorkingDir: Optional[str]
    """Working directory for gams.ws. Set before first ws access."""
    
    db: Any
    """GamsDatabase instance for GAMS control API access."""
    
    debug: DebugLevel
    """Debug level. Set before first ws access."""
    
    def get(
        self,
        symbolName: str,
        keyType: KeyType = KeyType.STRING,
        keyFormat: KeyFormat = KeyFormat.AUTO,
        valueFormat: ValueFormat = ValueFormat.AUTO,
        recordFormat: RecordFormat = RecordFormat.AUTO
    ) -> Iterator[Any]:
        """
        Retrieve GAMS symbol data as an iterable.
        
        Args:
            symbolName: GAMS symbol name (case insensitive)
            keyType: STRING for labels, INT for indexes
            keyFormat: Key representation (TUPLE/FLAT/SKIP/AUTO)
            valueFormat: Value representation (TUPLE/FLAT/SKIP/AUTO)
            recordFormat: Record encapsulation (TUPLE/FLAT/AUTO)
        
        Returns:
            Iterator over symbol records. Use list() to get all data.
        
        Example:
            for i in gams.get("mySet"):
                print(i)
            data = list(gams.get("myParam"))
        """
        ...
    
    def set(
        self,
        symbolName: str,
        data: Union[List[Any], Set[Any], Any],
        mergeType: MergeType = MergeType.DEFAULT,
        domCheck: DomainCheckType = DomainCheckType.DEFAULT,
        mapKeys: Callable[[Any], Any] = lambda x: x,
        dimension: Optional[int] = None
    ) -> None:
        """
        Set GAMS symbol data.
        
        Args:
            symbolName: GAMS symbol name (case insensitive)
            data: List/set of records or GamsSymbol instance
            mergeType: MERGE, REPLACE, or DEFAULT
            domCheck: CHECKED, FILTERED, or DEFAULT
            mapKeys: Callable to transform keys (e.g., str)
            dimension: Symbol dimension (inferred if None)
        
        Example:
            gams.set('p1', [("i1", 3.14), ("i2", 3.14)])
            gams.set('mySet', ['i1', 'i2', 'i3'])
        """
        ...
    
    def getUel(self, idx: int) -> str:
        """Get label string for a label index."""
        ...
    
    def mergeUel(self, label: str) -> int:
        """Add label to universe (if new) and return its index."""
        ...
    
    def getUelCount(self) -> int:
        """Get total number of labels in universe."""
        ...
    
    def printLog(self, msg: str, end: str = "\\n") -> None:
        """Print message to GAMS log."""
        ...
    
    def get_env(self, name: str) -> Optional[str]:
        """Get environment variable set by GAMS."""
        ...

gams = ECGamsDatabase()
"""The GAMS database interface object available in embedded Python code."""

# --- End of GAMS stubs, user code below ---

`;

/**
 * Manager for temporary Python files used for language server communication
 */
class TempPythonFileManager {
    private tempDir: string;
    private fileCache = new Map<string, string>();
    /** Number of lines in the stub preamble (for position adjustment) */
    readonly stubLineCount: number;
    
    constructor() {
        // Create a temporary directory for Python files
        this.tempDir = path.join(os.tmpdir(), 'gams-embedded-python');
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
        // Count lines in preamble for position offset calculation
        this.stubLineCount = GAMS_STUB_PREAMBLE.split('\n').length - 1;
    }
    
    /**
     * Creates or updates a temporary Python file with the embedded code content
     * Prepends stub definitions for the gams object to enable IntelliSense
     */
    createTempFile(document: vscode.TextDocument, region: EmbeddedPythonRegion): vscode.Uri {
        // Create a unique filename based on the document URI and region start line
        // We use only the start line since end line changes as user types
        const hash = this.hashString(`${document.uri.toString()}-${region.codeStartLine}`);
        const filename = `embedded_${hash}.py`;
        const filepath = path.join(this.tempDir, filename);
        
        // Prepend stub definitions to the user's code
        const fullContent = GAMS_STUB_PREAMBLE + region.code;
        
        // Always update the file - content may have changed even if hash is same
        // This ensures hover/completion always works with current content
        const cachedContent = this.fileCache.get(filepath);
        if (cachedContent !== fullContent) {
            fs.writeFileSync(filepath, fullContent, 'utf-8');
            this.fileCache.set(filepath, fullContent);
        }
        
        return vscode.Uri.file(filepath);
    }
    
    /**
     * Invalidate cache for a specific document
     */
    invalidateDocument(documentUri: string): void {
        // Remove all cached entries for this document
        for (const [key] of this.fileCache) {
            if (key.includes(this.hashString(documentUri))) {
                this.fileCache.delete(key);
            }
        }
    }
    
    /**
     * Get the line offset caused by the stub preamble
     */
    getStubLineOffset(): number {
        return this.stubLineCount;
    }
    
    /**
     * Simple string hashing function
     */
    private hashString(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16);
    }
    
    /**
     * Cleans up temporary files
     */
    cleanup(): void {
        try {
            const files = fs.readdirSync(this.tempDir);
            for (const file of files) {
                fs.unlinkSync(path.join(this.tempDir, file));
            }
        } catch {
            // Ignore cleanup errors
        }
        this.fileCache.clear();
    }
}

// Global instance of the temp file manager
let tempFileManager: TempPythonFileManager | null = null;

function getTempFileManager(): TempPythonFileManager {
    if (!tempFileManager) {
        tempFileManager = new TempPythonFileManager();
    }
    return tempFileManager;
}

/**
 * Registers all embedded Python language features
 */
export function registerEmbeddedPythonProviders(
    context: vscode.ExtensionContext
): void {
    // Initialize temp file manager
    const manager = getTempFileManager();
    
    // Cleanup temp files when extension is deactivated
    context.subscriptions.push({
        dispose: () => manager.cleanup()
    });
    
    // Invalidate cache when GAMS documents change
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            if (event.document.languageId === 'gams') {
                manager.invalidateDocument(event.document.uri.toString());
            }
        })
    );
    
    // Register hover provider for embedded Python
    context.subscriptions.push(
        vscode.languages.registerHoverProvider(
            { scheme: 'file', language: 'gams' },
            new EmbeddedPythonHoverProvider()
        )
    );
    
    // Register completion provider for embedded Python
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            { scheme: 'file', language: 'gams' },
            new EmbeddedPythonCompletionProvider(),
            '.', '(', '[', ','
        )
    );
    
    // Register definition provider for embedded Python
    context.subscriptions.push(
        vscode.languages.registerDefinitionProvider(
            { scheme: 'file', language: 'gams' },
            new EmbeddedPythonDefinitionProvider()
        )
    );
    
    // Register signature help provider for embedded Python
    context.subscriptions.push(
        vscode.languages.registerSignatureHelpProvider(
            { scheme: 'file', language: 'gams' },
            new EmbeddedPythonSignatureHelpProvider(),
            '(', ','
        )
    );
}

/**
 * Hover information for the gams object methods and properties
 */
const GAMS_HOVER_INFO: Record<string, {signature: string, documentation: string}> = {
    'gams': { signature: 'gams: ECGamsDatabase', documentation: 'The GAMS database interface object available in embedded Python code.\n\nProvides methods to read/write GAMS symbols and interact with the GAMS environment.' },
    'get': { signature: 'def get(symbolName: str, keyType=KeyType.STRING, keyFormat=KeyFormat.AUTO, valueFormat=ValueFormat.AUTO, recordFormat=RecordFormat.AUTO) -> Iterator[Any]', documentation: 'Retrieve GAMS symbol data as an iterable.\n\n**Args:**\n- `symbolName`: GAMS symbol name (case insensitive)\n- `keyType`: STRING for labels, INT for indexes\n- `keyFormat`: Key representation (TUPLE/FLAT/SKIP/AUTO)\n- `valueFormat`: Value representation (TUPLE/FLAT/SKIP/AUTO)\n- `recordFormat`: Record encapsulation (TUPLE/FLAT/AUTO)\n\n**Returns:** Iterator over symbol records. Use `list()` to get all data.\n\n**Example:**\n```python\nfor i in gams.get("mySet"):\n    print(i)\ndata = list(gams.get("myParam"))\n```' },
    'set': { signature: 'def set(symbolName: str, data: Union[List, Set], mergeType=MergeType.DEFAULT, domCheck=DomainCheckType.DEFAULT, mapKeys=lambda x:x, dimension=None) -> None', documentation: 'Set GAMS symbol data.\n\n**Args:**\n- `symbolName`: GAMS symbol name (case insensitive)\n- `data`: List/set of records or GamsSymbol instance\n- `mergeType`: MERGE, REPLACE, or DEFAULT\n- `domCheck`: CHECKED, FILTERED, or DEFAULT\n- `mapKeys`: Callable to transform keys\n- `dimension`: Symbol dimension (inferred if None)\n\n**Example:**\n```python\ngams.set("p1", [("i1", 3.14), ("i2", 3.14)])\ngams.set("mySet", ["i1", "i2", "i3"])\n```' },
    'printLog': { signature: 'def printLog(msg: str, end: str = "\\n") -> None', documentation: 'Print message to GAMS log.\n\n**Args:**\n- `msg`: Message to print\n- `end`: String appended after message (default: newline)' },
    'getUel': { signature: 'def getUel(idx: int) -> str', documentation: 'Get label string for a label index.\n\n**Args:**\n- `idx`: The label index\n\n**Returns:** The label string' },
    'mergeUel': { signature: 'def mergeUel(label: str) -> int', documentation: 'Add label to universe (if new) and return its index.\n\n**Args:**\n- `label`: The label string\n\n**Returns:** The label index' },
    'getUelCount': { signature: 'def getUelCount() -> int', documentation: 'Get total number of labels in universe.\n\n**Returns:** Total count of labels' },
    'get_env': { signature: 'def get_env(name: str) -> Optional[str]', documentation: 'Get environment variable set by GAMS.\n\nUse this instead of `os.environ` for variables set by GAMS via `$setEnv`.\n\n**Args:**\n- `name`: Environment variable name\n\n**Returns:** The value or None' },
    'arguments': { signature: 'arguments: str', documentation: 'Command line arguments passed to the embedded code section.\n\n**Example:**\n```gams\n$onEmbeddedCode Python: my arguments\nprint(gams.arguments)  # prints "my arguments"\n$offEmbeddedCode\n```' },
    'epsAsZero': { signature: 'epsAsZero: bool', documentation: 'Flag to read GAMS EPS as 0 (True) or small number 4.94066E-324 (False).\n\nDefault: True' },
    'ws': { signature: 'ws: GamsWorkspace', documentation: 'GamsWorkspace instance for GAMS control API access.\n\nThe instance is created when first accessed using a temporary working directory.' },
    'wsWorkingDir': { signature: 'wsWorkingDir: Optional[str]', documentation: 'Working directory for gams.ws.\n\nMust be set before first access to gams.ws to take effect.' },
    'db': { signature: 'db: GamsDatabase', documentation: 'GamsDatabase instance for GAMS control API access.\n\nAllows access to GAMS symbols using the GAMS control API methods.' },
    'debug': { signature: 'debug: DebugLevel', documentation: 'Debug level for gams.ws.\n\nSet to a DebugLevel value before first ws access. Default: DebugLevel.Off' },
};

/**
 * Hover provider for embedded Python code
 */
class EmbeddedPythonHoverProvider implements vscode.HoverProvider {
    async provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        _token: vscode.CancellationToken
    ): Promise<vscode.Hover | null> {
        const region = isPositionInEmbeddedPython(document, position);
        if (!region) {
            return null;
        }
        
        // Check if hovering over gams or gams.method/property
        const lineText = document.lineAt(position.line).text;
        const wordRange = document.getWordRangeAtPosition(position);
        if (wordRange) {
            const word = document.getText(wordRange);
            const textBeforeWord = lineText.substring(0, wordRange.start.character);
            
            // Check if this is "gams" itself
            if (word === 'gams' && !textBeforeWord.endsWith('.')) {
                const info = GAMS_HOVER_INFO['gams'];
                const markdown = new vscode.MarkdownString();
                markdown.appendCodeblock(info.signature, 'python');
                markdown.appendMarkdown('\n\n' + info.documentation);
                return new vscode.Hover(markdown);
            }
            
            // Check if this is a gams.method or gams.property
            if (textBeforeWord.match(/\bgams\.$/)) {
                const info = GAMS_HOVER_INFO[word];
                if (info) {
                    const markdown = new vscode.MarkdownString();
                    markdown.appendCodeblock(info.signature, 'python');
                    markdown.appendMarkdown('\n\n' + info.documentation);
                    return new vscode.Hover(markdown);
                }
            }
        }
        
        // Fall back to Pylance for other Python symbols
        try {
            const pythonPosition = getPythonPosition(document, position, region);
            
            // Create a temp Python file for the language server
            const tempUri = getTempFileManager().createTempFile(document, region);
            
            // Open the temp document to ensure Pylance processes it
            await vscode.workspace.openTextDocument(tempUri);
            
            // Give Pylance a moment to analyze the file
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
                'vscode.executeHoverProvider',
                tempUri,
                pythonPosition
            );
            
            if (hovers && hovers.length > 0) {
                return hovers[0];
            }
        } catch (error) {
            // If Python language server is not available, fail silently
            console.debug('Embedded Python hover error:', error);
        }
        
        return null;
    }
}

/**
 * Fallback completions for the gams object when Pylance doesn't provide them
 */
const GAMS_COMPLETIONS: Array<{label: string, kind: vscode.CompletionItemKind, detail: string, documentation: string}> = [
    { label: 'get', kind: vscode.CompletionItemKind.Method, detail: '(symbolName: str, ...) -> Iterator[Any]', documentation: 'Retrieve GAMS symbol data as an iterable.\n\nArgs:\n  symbolName: GAMS symbol name (case insensitive)\n  keyType: STRING for labels, INT for indexes\n  keyFormat: Key representation (TUPLE/FLAT/SKIP/AUTO)\n  valueFormat: Value representation\n  recordFormat: Record encapsulation\n\nExample:\n  for i in gams.get("mySet"):\n      print(i)' },
    { label: 'set', kind: vscode.CompletionItemKind.Method, detail: '(symbolName: str, data: List[Any], ...) -> None', documentation: 'Set GAMS symbol data.\n\nArgs:\n  symbolName: GAMS symbol name (case insensitive)\n  data: List/set of records\n  mergeType: MERGE, REPLACE, or DEFAULT\n  domCheck: CHECKED, FILTERED, or DEFAULT\n\nExample:\n  gams.set("p1", [("i1", 3.14), ("i2", 3.14)])' },
    { label: 'printLog', kind: vscode.CompletionItemKind.Method, detail: '(msg: str, end: str = "\\n") -> None', documentation: 'Print message to GAMS log.' },
    { label: 'getUel', kind: vscode.CompletionItemKind.Method, detail: '(idx: int) -> str', documentation: 'Get label string for a label index.' },
    { label: 'mergeUel', kind: vscode.CompletionItemKind.Method, detail: '(label: str) -> int', documentation: 'Add label to universe (if new) and return its index.' },
    { label: 'getUelCount', kind: vscode.CompletionItemKind.Method, detail: '() -> int', documentation: 'Get total number of labels in universe.' },
    { label: 'get_env', kind: vscode.CompletionItemKind.Method, detail: '(name: str) -> Optional[str]', documentation: 'Get environment variable set by GAMS.' },
    { label: 'arguments', kind: vscode.CompletionItemKind.Property, detail: 'str', documentation: 'Command line arguments passed to the embedded code section.' },
    { label: 'epsAsZero', kind: vscode.CompletionItemKind.Property, detail: 'bool', documentation: 'Flag to read GAMS EPS as 0 (True) or small number (False). Default: True.' },
    { label: 'ws', kind: vscode.CompletionItemKind.Property, detail: 'GamsWorkspace', documentation: 'GamsWorkspace instance for GAMS control API access.' },
    { label: 'wsWorkingDir', kind: vscode.CompletionItemKind.Property, detail: 'Optional[str]', documentation: 'Working directory for gams.ws. Set before first ws access.' },
    { label: 'db', kind: vscode.CompletionItemKind.Property, detail: 'GamsDatabase', documentation: 'GamsDatabase instance for GAMS control API access.' },
    { label: 'debug', kind: vscode.CompletionItemKind.Property, detail: 'DebugLevel', documentation: 'Debug level. Set before first ws access.' },
];

/**
 * Completion provider for embedded Python code
 */
class EmbeddedPythonCompletionProvider implements vscode.CompletionItemProvider {
    async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        _token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): Promise<vscode.CompletionItem[] | vscode.CompletionList | null> {
        const region = isPositionInEmbeddedPython(document, position);
        if (!region) {
            return null;
        }
        
        // Check if user just typed "gams." - provide our own completions
        const lineText = document.lineAt(position.line).text;
        const textBeforeCursor = lineText.substring(0, position.character);
        
        if (textBeforeCursor.match(/\bgams\.$/)) {
            // User typed "gams." - return our completions for gams methods/properties
            return GAMS_COMPLETIONS.map(c => {
                const item = new vscode.CompletionItem(c.label, c.kind);
                item.detail = c.detail;
                item.documentation = new vscode.MarkdownString(c.documentation);
                return item;
            });
        }
        
        try {
            const pythonPosition = getPythonPosition(document, position, region);
            
            // Create a temp Python file for the language server
            const tempUri = getTempFileManager().createTempFile(document, region);
            
            // Open the temp document to ensure Pylance processes it
            await vscode.workspace.openTextDocument(tempUri);
            
            const completions = await vscode.commands.executeCommand<vscode.CompletionList>(
                'vscode.executeCompletionItemProvider',
                tempUri,
                pythonPosition,
                context.triggerCharacter
            );
            
            if (completions) {
                // Adjust the range of completion items to match the GAMS document
                for (const item of completions.items) {
                    if (item.range) {
                        if ('start' in item.range && 'end' in item.range) {
                            // It's a Range
                            const range = item.range as vscode.Range;
                            item.range = new vscode.Range(
                                getGamsPosition(range.start, region),
                                getGamsPosition(range.end, region)
                            );
                        } else if ('inserting' in item.range && 'replacing' in item.range) {
                            // It's a {inserting: Range, replacing: Range}
                            const rangeObj = item.range as { inserting: vscode.Range; replacing: vscode.Range };
                            item.range = {
                                inserting: new vscode.Range(
                                    getGamsPosition(rangeObj.inserting.start, region),
                                    getGamsPosition(rangeObj.inserting.end, region)
                                ),
                                replacing: new vscode.Range(
                                    getGamsPosition(rangeObj.replacing.start, region),
                                    getGamsPosition(rangeObj.replacing.end, region)
                                )
                            };
                        }
                    }
                }
                return completions;
            }
        } catch (error) {
            console.debug('Embedded Python completion error:', error);
        }
        
        return null;
    }
}

/**
 * Definition provider for embedded Python code
 */
class EmbeddedPythonDefinitionProvider implements vscode.DefinitionProvider {
    async provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        _token: vscode.CancellationToken
    ): Promise<vscode.Definition | vscode.LocationLink[] | null> {
        const region = isPositionInEmbeddedPython(document, position);
        if (!region) {
            return null;
        }
        
        try {
            const pythonPosition = getPythonPosition(document, position, region);
            
            // Create a temp Python file for the language server
            const tempUri = getTempFileManager().createTempFile(document, region);
            
            // Open the temp document to ensure Pylance processes it
            await vscode.workspace.openTextDocument(tempUri);
            
            const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
                'vscode.executeDefinitionProvider',
                tempUri,
                pythonPosition
            );
            
            if (definitions && definitions.length > 0) {
                // Map definitions back to the GAMS document if they're in the temp file
                return definitions.map(def => {
                    if (def.uri.fsPath.includes('gams-embedded-python')) {
                        // Definition is within the embedded Python region
                        return new vscode.Location(
                            document.uri,
                            new vscode.Range(
                                getGamsPosition(def.range.start, region),
                                getGamsPosition(def.range.end, region)
                            )
                        );
                    }
                    return def;
                });
            }
        } catch (error) {
            console.debug('Embedded Python definition error:', error);
        }
        
        return null;
    }
}

/**
 * Signature help provider for embedded Python code
 */
class EmbeddedPythonSignatureHelpProvider implements vscode.SignatureHelpProvider {
    async provideSignatureHelp(
        document: vscode.TextDocument,
        position: vscode.Position,
        _token: vscode.CancellationToken,
        context: vscode.SignatureHelpContext
    ): Promise<vscode.SignatureHelp | null> {
        const region = isPositionInEmbeddedPython(document, position);
        if (!region) {
            return null;
        }
        
        try {
            const pythonPosition = getPythonPosition(document, position, region);
            
            // Create a temp Python file for the language server
            const tempUri = getTempFileManager().createTempFile(document, region);
            
            // Open the temp document to ensure Pylance processes it
            await vscode.workspace.openTextDocument(tempUri);
            
            const signatureHelp = await vscode.commands.executeCommand<vscode.SignatureHelp>(
                'vscode.executeSignatureHelpProvider',
                tempUri,
                pythonPosition,
                context.triggerCharacter
            );
            
            return signatureHelp || null;
        } catch (error) {
            console.debug('Embedded Python signature help error:', error);
        }
        
        return null;
    }
}
