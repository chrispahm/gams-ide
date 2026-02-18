# Using the GAMS Data Panel

The **GAMS Data Panel** allows you to inspect the values of your model's symbols after a run.

To access it, click the GAMS logo in the Panel area (usually at the bottom, next to Terminal/Output).

## Viewing Data

After a successful run (with specific settings enabled):

1.  Select a symbol from the list on the left side of the panel.
2.  The right side shows a table with the symbol's values.
    *   **Scalars**: Single value.
    *   **Parameters/Variables**: Multi-dimensional table.

![Data Panel showing symbol values](/screenshots/usage-data-panel.png)

## Requirements

To use this feature, you must enable **Parse GAMS Data** in the [Settings](../configuration/data-panel.md).

::: warning Performance Note
Parsing data for very large models can consume significant memory. See configuration for limits.
:::