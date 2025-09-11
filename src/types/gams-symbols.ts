// Shared type definitions for GAMS symbols, reference tree entries, and related structures
// These are intentionally minimal and will be extended as more typing information becomes clear.

export interface SymbolLocation {
  line: number; // 1-based line number
  column: number; // 1-based column number
  file?: string;
  base?: string;
}

export interface SymbolActionLocation extends SymbolLocation {}

// Generic container for an action list (assigned, ref, control, etc.)
export type SymbolActionList = SymbolActionLocation[];

export interface ReferenceSymbol {
  name: string;
  nameLo?: string; // lowercase variant used for insensitive compare
  symId?: string;
  type?: string; // e.g. SET, PARAM, VAR, EQU, MODEL, SCALAR
  description?: string;
  isSubset?: boolean;
  superset?: ReferenceSymbol;
  subsets?: ReferenceSymbol[];
  declared?: SymbolLocation;
  defined?: SymbolLocation;
  assigned?: SymbolActionList;
  ref?: SymbolActionList;
  control?: SymbolActionList;
  domain?: ReferenceSymbol[]; // after post-processing we collapse wildcard objects to simple ReferenceSymbol shape
  data?: Record<string, string>; // raw listing data keyed by line numbers (as strings)
  setElements?: string[]; // cached parsed set element list (quoted entries)
  [key: string]: unknown; // allow additional dynamic properties for forward compatibility
}

export interface CompileTimeVariable {
  name: string;
  type?: string; // PARAM, SCALAR, etc.
  description?: string;
}

export interface GamsFunctionCallArg {
  name: string | number | "*";
  isQuoted?: boolean;
  isEmpty?: boolean;
  start: number; // start column (1-based in parser logic)
  end: number; // end column (exclusive)
  index: number; // position of argument in call
  argCount?: number; // number of args in the outer function (if function call)
  functionName?: string; // added during extraction for nested groups
  isGroup?: boolean; // indicates this arg came from a group ( ... )
}

export type GamsLineAst = GamsFunctionCallArg[];

export interface LstEntryChild {
  name: string;
  line: number;
  column: number;
  file: string;
}

export interface LstEntry {
  type: string; // e.g. Display, SolVAR, SolEQU, Abort, Error: <message>, etc.
  line?: number | number[]; // some nodes store [line] arrays
  column?: number | number[];
  file?: string;
  entries?: LstEntryChild[];
  open?: boolean;
  [key: string]: unknown;
}

export type ReferenceTree = ReferenceSymbol[];

// Solve information extracted from dump / listing
export interface SolveStatement {
  model: string;
  line: number; // line number (in generated dump file) where solve statement occurs
  display?: number; // line number for the display directive preceding solve
  timestamp?: number; // optional timestamp when captured
}

// Stored symbol data entry for a particular solve
export interface SymbolDataEntry {
  solve: number; // solve line number reference
  data: string; // raw data block text extracted from .lst
}

export type SymbolDataStore = Record<string, SymbolDataEntry[]>; // keyed by symbol name (case-sensitive as stored)

// Listing AST root node (subset of LstEntry with stricter shape)
export interface ListingAstNode extends LstEntry {}

