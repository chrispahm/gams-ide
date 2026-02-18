# Data Panel Configuration

The Data Panel is a powerful feature but can be resource-intensive. It is disabled by default.

## Enabling the Data Panel

To turn it on, enable the following setting:

### `gamsIde.parseGamsData`

*   **Default**: `false`
*   **Effect**: After every run, GAMS-IDE parses the GDX/Reference file to populate the Data Panel.

## Performance Tuning

If you experience slow performance/execution, consider these settings:

### `gamsIde.parseGamsDataResLim`

*   **Description**: Sets a resource limit (Time Limit) for the data parsing run.
*   **Usage**: Prevents the parsing from hanging if the model is accidentally too large.

### `gamsIde.consoleLimrow` / `gamsIde.consoleLimcol`

*   **Description**: Limits the number of rows/columns displayed for large parameters.
*   **Default**: `3` (Review the first 3 elements).

![Data Panel Settings](/screenshots/config-datapanel-settings.png)

::: warning
Enabling `parseGamsData` runs a special GAMS execution in the background. For extremely large models, this might double the effective run time or consume significant RAM.
:::
