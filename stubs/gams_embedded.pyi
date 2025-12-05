"""
Type stubs for GAMS Embedded Python Code

This module provides type hints for the `gams` object (ECGamsDatabase) 
that is automatically available in GAMS embedded Python code sections.

Reference: https://www.gams.com/latest/docs/UG_EmbeddedCode.html#UG_EmbeddedCode_InterfaceGAMSPython
"""

from typing import (
    Any, Callable, Iterator, List, Optional, Set, Tuple, Union, Literal,
    overload
)
from enum import Enum

# Enums for gams.get() parameters
class KeyType(Enum):
    """Determines the data type of the keys in gams.get()"""
    STRING = "STRING"  # Labels as strings (default)
    INT = "INT"        # Label indexes as integers

class KeyFormat(Enum):
    """Specifies the representation of keys in gams.get()"""
    TUPLE = "TUPLE"  # Encapsulate keys in a tuple
    FLAT = "FLAT"    # No encapsulation
    SKIP = "SKIP"    # Keys are skipped
    AUTO = "AUTO"    # Automatic based on dimension (default)

class ValueFormat(Enum):
    """Specifies the representation of values in gams.get()"""
    TUPLE = "TUPLE"  # Encapsulate values in a tuple
    FLAT = "FLAT"    # No encapsulation
    SKIP = "SKIP"    # Values are skipped
    AUTO = "AUTO"    # Automatic based on symbol type (default)

class RecordFormat(Enum):
    """Specifies the encapsulation of records into tuples"""
    TUPLE = "TUPLE"  # Encapsulate every record in a tuple
    FLAT = "FLAT"    # No encapsulation
    AUTO = "AUTO"    # Automatic based on record structure (default)

class MergeType(Enum):
    """Specifies merge behavior for gams.set()"""
    DEFAULT = "DEFAULT"  # Use $on/offMulti settings (compile) or MERGE (execution)
    MERGE = "MERGE"      # Merge with existing data
    REPLACE = "REPLACE"  # Replace existing data

class DomainCheckType(Enum):
    """Specifies domain checking behavior for gams.set()"""
    DEFAULT = "DEFAULT"    # Use $on/offFiltered settings
    CHECKED = "CHECKED"    # Apply domain checking
    FILTERED = "FILTERED"  # Filter records that would cause domain violations

class DebugLevel(Enum):
    """Debug level for gams.debug property"""
    Off = 0
    KeepFiles = 1
    ShowLog = 2
    Verbose = 3


class ECGamsDatabase:
    """
    Interface between GAMS and Python in embedded code sections.
    
    An instance of this class is automatically created when an embedded code
    section is entered and can be accessed using the identifier `gams`.
    
    Example:
        $onEmbeddedCode Python:
        for i in gams.get("mySet"):
            print(i)
        gams.set("result", [("a", 1.0), ("b", 2.0)])
        $offEmbeddedCode
    """
    
    @property
    def arguments(self) -> str:
        """
        Contains the command line arguments passed to the Python interpreter
        of the embedded code section.
        
        Example:
            $onEmbeddedCode Python: my arguments here
            print(gams.arguments)  # prints "my arguments here"
            $offEmbeddedCode
        """
        ...
    
    @property
    def epsAsZero(self) -> bool:
        """
        Flag to read GAMS EPS as 0 (True) or as a small number (4.94066E-324)
        when set to False. Default is True.
        """
        ...
    
    @epsAsZero.setter
    def epsAsZero(self, value: bool) -> None: ...
    
    @property
    def ws(self) -> Any:
        """
        Property to retrieve an instance of GamsWorkspace that allows using
        the GAMS control API. The instance is created when first accessed
        using a temporary working directory.
        
        Set gams.wsWorkingDir before first access to specify working directory.
        Set gams.debug to a DebugLevel value for debug output.
        """
        ...
    
    @property
    def wsWorkingDir(self) -> Optional[str]:
        """
        Property to specify working directory before accessing gams.ws.
        Must be set before first call to gams.ws to take effect.
        """
        ...
    
    @wsWorkingDir.setter
    def wsWorkingDir(self, value: str) -> None: ...
    
    @property
    def db(self) -> Any:
        """
        Property to retrieve an instance of GamsDatabase.
        Allows access to GAMS symbols using the GAMS control API methods.
        """
        ...
    
    @property
    def debug(self) -> DebugLevel:
        """
        Property for debug output level. Default is DebugLevel.Off.
        Must be set before first call to gams.ws to take effect.
        """
        ...
    
    @debug.setter
    def debug(self, value: DebugLevel) -> None: ...
    
    def get(
        self,
        symbolName: str,
        keyType: KeyType = KeyType.STRING,
        keyFormat: KeyFormat = KeyFormat.AUTO,
        valueFormat: ValueFormat = ValueFormat.AUTO,
        recordFormat: RecordFormat = RecordFormat.AUTO
    ) -> Iterator[Any]:
        """
        Retrieves an iterable object representing the GAMS symbol.
        
        Args:
            symbolName: Name of the GAMS symbol to retrieve (case insensitive)
            keyType: STRING for labels, INT for label indexes
            keyFormat: How to represent keys (TUPLE, FLAT, SKIP, AUTO)
            valueFormat: How to represent values (TUPLE, FLAT, SKIP, AUTO)
            recordFormat: How to encapsulate records (TUPLE, FLAT, AUTO)
        
        Returns:
            An iterable over the symbol's records. Format depends on symbol
            type and dimension:
            
            - Sets (1D): ['i1', 'i2', ...] or [('i1', 'text'), ...]
            - Parameters (scalar): [3.14]
            - Parameters (1D): [('i1', 3.14), ('i2', 3.14), ...]
            - Parameters (2D): [(('i1', 'j1'), 3.14), ...]
            - Variables/Equations: records include (level, marginal, lower, upper, scale)
        
        Example:
            # Iterate over set elements
            for i in gams.get("mySet"):
                print(i)
            
            # Get all records as list
            data = list(gams.get("myParam"))
            
            # Use label indexes instead of strings
            for idx, val in gams.get("myParam", keyType=KeyType.INT):
                print(f"Index {idx}: {val}")
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
        Sets the data for a GAMS symbol.
        
        Args:
            symbolName: Name of the GAMS symbol to set (case insensitive)
            data: Python list or set containing records, or a GamsSymbol instance
            mergeType: MERGE, REPLACE, or DEFAULT (uses $on/offMulti settings)
            domCheck: CHECKED, FILTERED, or DEFAULT (uses $on/offFiltered settings)
            mapKeys: Callable to remap key elements (e.g., mapKeys=str)
            dimension: Symbol dimension. If None, inferred from data.
        
        Note:
            At execution time, new labels cannot be added to the GAMS program.
        
        Example:
            # Set scalar parameter
            gams.set('p0', [3.14])
            
            # Set 1D parameter
            gams.set('p1', [("i1", 3.14), ("i2", 3.14)])
            
            # Set 1D set
            gams.set('mySet', ['i1', 'i2', 'i3'])
            
            # Set 2D parameter
            gams.set('p2', [('i1', 'j1', 3.14), ('i1', 'j2', 3.14)])
            
            # Set with explanatory text
            gams.set('mySet', [('i1', "text 1"), ('i2', "text 2")])
            
            # Replace instead of merge
            gams.set('p1', data, mergeType=MergeType.REPLACE)
        """
        ...
    
    def getUel(self, idx: int) -> str:
        """
        Returns the label corresponding to the label index.
        
        Args:
            idx: The label index
            
        Returns:
            The label string for the given index
        """
        ...
    
    def mergeUel(self, label: str) -> int:
        """
        Adds a label to the GAMS universe if unknown and returns its index.
        
        Args:
            label: The label string to add/lookup
            
        Returns:
            The label index
            
        Note:
            At execution time, new labels cannot be added.
        """
        ...
    
    def getUelCount(self) -> int:
        """
        Returns the number of labels in the universe.
        
        Returns:
            Total count of labels
        """
        ...
    
    def printLog(self, msg: str, end: str = "\n") -> None:
        """
        Print a message to the GAMS log.
        
        Args:
            msg: Message to print
            end: String appended after the message (default: newline)
        
        Example:
            gams.printLog("Processing complete")
            gams.printLog("Item: ", end="")
            gams.printLog("value")
        """
        ...
    
    def get_env(self, name: str) -> Optional[str]:
        """
        Get an environment variable set by GAMS.
        
        Use this instead of os.environ when accessing variables set by GAMS
        via $setEnv or put_utility, as os.environ is initialized when the
        os module is imported.
        
        Args:
            name: Environment variable name
            
        Returns:
            The value or None if not set
        """
        ...


# The global gams object available in embedded Python code
gams: ECGamsDatabase
