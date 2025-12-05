# Embedded Python Support

GAMS-IDE provides Python language server features for embedded Python code sections within GAMS files. This enables code completion, hover documentation, go-to-definition, and signature help when writing Python code inside GAMS files.

## Supported Embedded Code Syntax

GAMS supports embedding Python code using several syntax variants:

### Compile Time

Start an embedded code section at compile time with:

```gams
$onEmbeddedCode Python:
# Your Python code here
$offEmbeddedCode
```

Variants include:

- `$onEmbeddedCode[S|V][.tag] Python: [arguments]`
- `$$onEmbeddedCode[S|V][.tag] Python: [arguments]` (when not at the beginning of a line)

End with:

- `$offEmbeddedCode[.tag] {symbol[<[=]embSymbol[.dimX]]}`

### Execution Time

Start an embedded code section at execution time with:

```gams
embeddedCode Python:
# Your Python code here
endEmbeddedCode
```

Variants include:

- `embeddedCode[S|V][.tag] [Connect|Python]: [arguments]`
- `continueEmbeddedCode[S|V][.tag] [handle]: [arguments]`

End with:

- `endEmbeddedCode[.tag] {output symbols}`
- `pauseEmbeddedCode[.tag] {output symbols}`

## Features

### Code Completion

When typing Python code within an embedded section, you'll get intelligent code completion from the Python language server:

- Python built-in functions and keywords
- Module member completion after import statements
- Method and attribute suggestions

### Hover Documentation

Hovering over Python identifiers shows documentation from the Python language server, including:

- Function signatures and docstrings
- Module documentation
- Type information (if using type hints)

### Go to Definition

Use "Go to Definition" (F12 or Ctrl+Click) on Python symbols to navigate to their definitions.

### Signature Help

When calling Python functions, you'll see parameter hints showing the function signature and parameter documentation.

## Example

```gams
Set i / i1*i10 /
    p(i,i) "permutation";

$onEmbeddedCode Python:
import random

# Get set elements from GAMS
i = list(gams.get("i"))
p = list(i)

# Create random permutation
random.shuffle(p)

# Build permutation pairs
for idx in range(len(i)):
    p[idx] = (i[idx], p[idx])

# Send back to GAMS
gams.set("p", p)
$offEmbeddedCode p

display p;
```

Within the embedded Python section above, you'll get:

- Completion suggestions for `random.shuffle`, `gams.get`, `gams.set`, etc.
- Hover documentation for Python functions
- Signature help when calling functions

## Requirements

For Python language features to work, you need:

1. A Python extension installed in VS Code (e.g., [Python extension by Microsoft](https://marketplace.visualstudio.com/items?itemName=ms-python.python))
2. A Python interpreter configured in VS Code

## Limitations

- The embedded Python code is analyzed in isolation from the GAMS context
- The `gams` object (ECGamsDatabase) provides methods like `gams.get()`, `gams.set()`, `gams.printLog()`, but full type information may not be available without stub files
- Language features work best for standard Python code and installed packages

## See Also

- [GAMS Embedded Code Facility Documentation](https://www.gams.com/latest/docs/UG_EmbeddedCode.html)
- [Python API for GAMS](https://www.gams.com/latest/docs/API_PY_CONTROL.html)
