#!/usr/bin/env node

/**
 * Test suite for embedded Python code detection in GAMS files
 */

import * as assert from 'assert';

// Import the embedded Python parsing functions
// Note: We need to mock vscode for testing outside of the extension context
const mockVscode = {
    Position: class {
        constructor(public line: number, public character: number) {}
    },
    Range: class {
        constructor(public start: any, public end: any) {}
    },
    Uri: {
        parse: (uri: string) => ({ path: uri, toString: () => uri })
    }
};

// Mock TextDocument for testing
interface MockTextDocument {
    getText(): string;
    lineAt(line: number): { text: string };
    uri: { path: string; toString(): string };
}

function createMockDocument(content: string): MockTextDocument {
    const lines = content.split('\n');
    return {
        getText: () => content,
        lineAt: (line: number) => ({ text: lines[line] || '' }),
        uri: { path: '/test/test.gms', toString: () => 'file:///test/test.gms' }
    };
}

// Regex patterns copied from embeddedPython.ts for testing
// Updated to allow leading whitespace for indented GAMS code
const COMPILE_START_PATTERN = /^\s*\$\$?onEmbeddedCode[SV]?(?:\.[\w]+)?\s+Python\s*:/i;
const COMPILE_END_PATTERN = /^\s*\$\$?offEmbeddedCode(?:\.[\w]+)?/i;
const EXECUTION_START_PYTHON_PATTERN = /^\s*(?:embeddedCode|continueEmbeddedCode)[SV]?(?:\.[\w]+)?\s+Python\s*:/i;
const EXECUTION_END_PATTERN = /^\s*(?:end|pause)EmbeddedCode(?:\.[\w]+)?/i;

interface EmbeddedPythonRegion {
    codeStartLine: number;
    codeEndLine: number;
    code: string;
    startColumn: number;
    type: 'compile' | 'execution';
    language: string;
    tag?: string;
}

/**
 * Extract Python regions from document content
 */
function findEmbeddedPythonRegions(content: string): EmbeddedPythonRegion[] {
    const regions: EmbeddedPythonRegion[] = [];
    const lines = content.split('\n');
    
    let i = 0;
    while (i < lines.length) {
        const line = lines[i].trim();
        
        // Check for compile-time Python embedded code start
        if (COMPILE_START_PATTERN.test(line)) {
            const region = extractPythonRegion(lines, i, 'compile');
            if (region) {
                regions.push(region);
                i = region.codeEndLine + 2;
                continue;
            }
        }
        
        // Check for execution-time Python embedded code start
        if (EXECUTION_START_PYTHON_PATTERN.test(line)) {
            const region = extractPythonRegion(lines, i, 'execution');
            if (region) {
                regions.push(region);
                i = region.codeEndLine + 2;
                continue;
            }
        }
        
        i++;
    }
    
    return regions;
}

function extractPythonRegion(
    lines: string[],
    startLineIndex: number,
    type: 'compile' | 'execution'
): EmbeddedPythonRegion | null {
    const endPattern = type === 'compile' ? COMPILE_END_PATTERN : EXECUTION_END_PATTERN;
    
    const startLine = lines[startLineIndex].trim();
    const tagMatch = startLine.match(/(?:onEmbeddedCode|embeddedCode|continueEmbeddedCode)[SV]?\.([\w]+)/i);
    const tag = tagMatch ? tagMatch[1] : undefined;
    
    let endLineIndex = -1;
    for (let i = startLineIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (endPattern.test(line)) {
            if (tag) {
                const endTagMatch = line.match(/(?:offEmbeddedCode|endEmbeddedCode|pauseEmbeddedCode)\.([\w]+)/i);
                if (endTagMatch && endTagMatch[1].toLowerCase() === tag.toLowerCase()) {
                    endLineIndex = i - 1;
                    break;
                }
            } else {
                const hasEndTag = line.match(/(?:offEmbeddedCode|endEmbeddedCode|pauseEmbeddedCode)\.([\w]+)/i);
                if (!hasEndTag) {
                    endLineIndex = i - 1;
                    break;
                }
            }
        }
    }
    
    if (endLineIndex < startLineIndex + 1) {
        if (startLineIndex + 1 < lines.length) {
            endLineIndex = lines.length - 1;
        } else {
            return null;
        }
    }
    
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

// Test GAMS file content from the documentation
const GAMS_TEST_FILE = `Set i / i1 text 1, i2 text 2 /
    j / j1*j2 /
    ii(i);
Scalar p0;
Parameter p1(i)
          p2(i,j);
equation e1(i)
         e2(i,j);
$onEmbeddedCode Python:
# scalar parameter
gams.set('p0', [3.14])
gams.set('p0', [(3.14,)])

# one dimensional parameters:
gams.set('p1', [("i1", 3.14), ("i2", 3.14)])
gams.set('p1', [(("i1",), 3.14), (("i2",), 3.14)])
gams.set('p1', [("i1", (3.14,)), ("i2", (3.14,))])
gams.set('p1', [(("i1",), (3.14,)), (("i2",), (3.14,))])

# two dimensional parameter:
gams.set('p2', [('i1', 'j1', 3.14), ('i1', 'j2', 3.14)])
gams.set('p2', [(('i1', 'j1'), (3.14,)), (('i1', 'j2'), (3.14,))])

# one dimensional sets:
gams.set('ii', ['i1', 'i2'])
gams.set('ii', [('i1',), ('i2',)])

# one dimensional sets with explanatory text
gams.set('ii', [('i1', "text 1"), ('i2', "text 2")])
gams.set('ii', [(('i1',), ("text 1",)), (('i2',), ("text 2",))])

# one dimensional variables/equations:
gams.set('e1', [("i1", 3.14, 0, 0, 10, 1), ("i2", 3.14, 0, 0, 10, 1)])
gams.set('e1', [("i1", (3.14, 0, 0, 10, 1)), ("i2", (3.14, 0, 0, 10, 1))])
gams.set('e1', [(("i1",), (3.14, 0, 0, 10, 1)), (("i2",), (3.14, 0, 0, 10, 1))])

# two dimensional variables/equations:
gams.set('e2', [("i1", "j1", 3.14, 0, 0, 10, 1), ("i1", "j2", 3.14, 0, 0, 10, 1)])
gams.set('e2', [(("i1", "j1"), (3.14, 0, 0, 10, 1)), (("i1", "j2"), (3.14, 0, 0, 10, 1))])

# using label indexes instead of labels
gams.set('p1', [((1,), (3.14,)), ((2,), (3.14,))]) # one dimensional parameter
gams.set('ii', [((1,), ("text 1",)), ((2,), ("text 2",))]) # one dimensional set
gams.set('e2', [((1, 3), (3.14, 0, 0, 10, 1)), ((1, 4), (3.14, 0, 0, 10, 1))]) # two dimensional equation/variable
$offEmbeddedCode p0 p1 p2 ii e1 e2`;

// Test with execution time embedded code
const GAMS_EXECUTION_TIME_FILE = `Set i /i1*i10/
    p(i,i) "permutation";

embeddedCode Python:
import random
i = list(gams.get("i"))
p = list(i)
random.shuffle(p)
for idx in range(len(i)):
    p[idx] = (i[idx], p[idx])
gams.set("p", p)
endEmbeddedCode p

Option p:0:0:1;
Display p;`;

// Test with tagged embedded code
const GAMS_TAGGED_FILE = `Set i /i1*i5/;

$onEmbeddedCode.myTag Python:
# This is tagged Python code
result = [f"item_{x}" for x in range(5)]
gams.set("i", result)
$offEmbeddedCode.myTag i

Display i;`;

// Test with double dollar sign
const GAMS_DOUBLE_DOLLAR_FILE = `Set i /i1*i5/;

$$onEmbeddedCode Python:
# Python code with $$ prefix
for x in range(5):
    print(x)
$$offEmbeddedCode

Display i;`;

// Test with multiple embedded sections
const GAMS_MULTIPLE_SECTIONS = `Set i /i1*i5/;

$onEmbeddedCode Python:
# First section
x = 1
$offEmbeddedCode

Parameter p(i);

embeddedCode Python:
# Second section
y = 2
endEmbeddedCode

Display p;`;

// Test with INDENTED embedded code (common in real GAMS files)
const GAMS_INDENTED_FILE = `Set i /i1*i5/;
Parameter p(i);

loop(i,
   embeddedCode Python:
   import math
   x = math.sqrt(2)
   gams.set("p", [("i1", x)])
   endEmbeddedCode p
);

Display p;`;

// Run tests
function runTests() {
    console.log('Running Embedded Python Tests...\n');
    let passed = 0;
    let failed = 0;

    function test(name: string, fn: () => void) {
        try {
            fn();
            console.log(`✓ ${name}`);
            passed++;
        } catch (e) {
            console.log(`✗ ${name}`);
            console.log(`  Error: ${e instanceof Error ? e.message : e}`);
            failed++;
        }
    }

    // Test 1: Detect compile-time embedded Python
    test('Should detect compile-time $onEmbeddedCode Python section', () => {
        const regions = findEmbeddedPythonRegions(GAMS_TEST_FILE);
        assert.strictEqual(regions.length, 1, 'Should find exactly one region');
        assert.strictEqual(regions[0].type, 'compile', 'Should be compile-time');
    });

    // Test 2: Correct line numbers for compile-time
    test('Should have correct line numbers for compile-time section', () => {
        const regions = findEmbeddedPythonRegions(GAMS_TEST_FILE);
        assert.strictEqual(regions[0].codeStartLine, 9, 'Code should start at line 9 (0-indexed)');
        // The code ends at line 43 (before $offEmbeddedCode on line 44)
        assert.strictEqual(regions[0].codeEndLine, 43, 'Code should end at line 43');
    });

    // Test 3: Extract Python code correctly
    test('Should extract Python code content', () => {
        const regions = findEmbeddedPythonRegions(GAMS_TEST_FILE);
        assert.ok(regions[0].code.includes("gams.set('p0', [3.14])"), 'Should contain gams.set calls');
        assert.ok(regions[0].code.includes('# scalar parameter'), 'Should contain Python comments');
    });

    // Test 4: Detect execution-time embedded Python
    test('Should detect execution-time embeddedCode Python section', () => {
        const regions = findEmbeddedPythonRegions(GAMS_EXECUTION_TIME_FILE);
        assert.strictEqual(regions.length, 1, 'Should find exactly one region');
        assert.strictEqual(regions[0].type, 'execution', 'Should be execution-time');
    });

    // Test 5: Extract execution-time code correctly
    test('Should extract execution-time Python code', () => {
        const regions = findEmbeddedPythonRegions(GAMS_EXECUTION_TIME_FILE);
        assert.ok(regions[0].code.includes('import random'), 'Should contain import statement');
        assert.ok(regions[0].code.includes('random.shuffle(p)'), 'Should contain shuffle call');
    });

    // Test 6: Handle tagged embedded code
    test('Should handle tagged embedded code sections', () => {
        const regions = findEmbeddedPythonRegions(GAMS_TAGGED_FILE);
        assert.strictEqual(regions.length, 1, 'Should find exactly one region');
        assert.strictEqual(regions[0].tag, 'myTag', 'Should extract tag correctly');
    });

    // Test 7: Handle double dollar sign prefix
    test('Should handle $$ prefix in embedded code', () => {
        const regions = findEmbeddedPythonRegions(GAMS_DOUBLE_DOLLAR_FILE);
        assert.strictEqual(regions.length, 1, 'Should find exactly one region');
        assert.strictEqual(regions[0].type, 'compile', 'Should be compile-time');
    });

    // Test 8: Handle multiple embedded sections
    test('Should handle multiple embedded sections in one file', () => {
        const regions = findEmbeddedPythonRegions(GAMS_MULTIPLE_SECTIONS);
        assert.strictEqual(regions.length, 2, 'Should find two regions');
        assert.strictEqual(regions[0].type, 'compile', 'First should be compile-time');
        assert.strictEqual(regions[1].type, 'execution', 'Second should be execution-time');
    });

    // Test 9: Handle INDENTED embedded code (real-world scenario)
    test('Should handle indented embedded code sections', () => {
        const regions = findEmbeddedPythonRegions(GAMS_INDENTED_FILE);
        assert.strictEqual(regions.length, 1, 'Should find exactly one region');
        assert.strictEqual(regions[0].type, 'execution', 'Should be execution-time');
        assert.ok(regions[0].code.includes('import math'), 'Should contain the Python code');
    });

    // Test 10: Regex patterns match compile-time start (including indented)
    test('Compile start pattern should match valid syntax', () => {
        assert.ok(COMPILE_START_PATTERN.test('$onEmbeddedCode Python:'));
        assert.ok(COMPILE_START_PATTERN.test('$onEmbeddedCodeS Python:'));
        assert.ok(COMPILE_START_PATTERN.test('$onEmbeddedCodeV Python:'));
        assert.ok(COMPILE_START_PATTERN.test('$onEmbeddedCode.tag Python:'));
        assert.ok(COMPILE_START_PATTERN.test('$$onEmbeddedCode Python:'));
        assert.ok(COMPILE_START_PATTERN.test('$ONEMBEDDEDCODE Python:')); // case insensitive
        assert.ok(COMPILE_START_PATTERN.test('   $onEmbeddedCode Python:')); // indented
        assert.ok(COMPILE_START_PATTERN.test('\t$onEmbeddedCode Python:')); // tab indented
    });

    // Test 11: Regex patterns match compile-time end
    test('Compile end pattern should match valid syntax', () => {
        assert.ok(COMPILE_END_PATTERN.test('$offEmbeddedCode'));
        assert.ok(COMPILE_END_PATTERN.test('$offEmbeddedCode.tag'));
        assert.ok(COMPILE_END_PATTERN.test('$$offEmbeddedCode'));
        assert.ok(COMPILE_END_PATTERN.test('$offEmbeddedCode p0 p1 p2'));
        assert.ok(COMPILE_END_PATTERN.test('   $offEmbeddedCode')); // indented
    });

    // Test 12: Regex patterns match execution-time start (including indented)
    test('Execution start pattern should match valid syntax', () => {
        assert.ok(EXECUTION_START_PYTHON_PATTERN.test('embeddedCode Python:'));
        assert.ok(EXECUTION_START_PYTHON_PATTERN.test('embeddedCodeS Python:'));
        assert.ok(EXECUTION_START_PYTHON_PATTERN.test('embeddedCodeV Python:'));
        assert.ok(EXECUTION_START_PYTHON_PATTERN.test('embeddedCode.tag Python:'));
        assert.ok(EXECUTION_START_PYTHON_PATTERN.test('continueEmbeddedCode Python:'));
        assert.ok(EXECUTION_START_PYTHON_PATTERN.test('   embeddedCode Python:')); // indented
        assert.ok(EXECUTION_START_PYTHON_PATTERN.test('\t\tembeddedCode Python:')); // tab indented
    });

    // Test 13: Regex patterns match execution-time end (including indented)
    test('Execution end pattern should match valid syntax', () => {
        assert.ok(EXECUTION_END_PATTERN.test('endEmbeddedCode'));
        assert.ok(EXECUTION_END_PATTERN.test('endEmbeddedCode.tag'));
        assert.ok(EXECUTION_END_PATTERN.test('endEmbeddedCode p'));
        assert.ok(EXECUTION_END_PATTERN.test('pauseEmbeddedCode'));
        assert.ok(EXECUTION_END_PATTERN.test('pauseEmbeddedCode.tag'));
        assert.ok(EXECUTION_END_PATTERN.test('   endEmbeddedCode')); // indented
    });

    // Test 14: Should not match Connect sections
    test('Should not match Connect embedded code sections', () => {
        const connectCode = `$onEmbeddedCode Connect:
- GAMSReader:
    symbols:
      - name: i
$offEmbeddedCode`;
        const regions = findEmbeddedPythonRegions(connectCode);
        assert.strictEqual(regions.length, 0, 'Should not match Connect sections');
    });

    // Test 15: Position within embedded region
    test('Should correctly identify position within embedded region', () => {
        const regions = findEmbeddedPythonRegions(GAMS_TEST_FILE);
        const region = regions[0];
        
        // Line 10 should be inside (first line of Python code)
        assert.ok(10 >= region.codeStartLine && 10 <= region.codeEndLine, 'Line 10 should be inside region');
        
        // Line 5 should be outside (GAMS code before)
        assert.ok(!(5 >= region.codeStartLine && 5 <= region.codeEndLine), 'Line 5 should be outside region');
    });

    // Summary
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Tests: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
    console.log('='.repeat(50));

    if (failed > 0) {
        process.exit(1);
    }
}

runTests();
