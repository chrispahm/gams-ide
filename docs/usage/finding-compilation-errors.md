# Finding Compilation Errors

GAMS-IDE makes it easy to identify and fix compilation errors in your model.

## Error Highlighting

When GAMS detects an error during compilation (or on save):

1.  **Red Squiggles**: Errors in the source code are underlined with red squiggles. Hover over them to see the error message.
2.  **Problems Panel**: All errors are listed in VS Code's "Problems" panel (usually at the bottom). clicking an error jumps to the location.

![Error highlighting in editor](/screenshots/usage-errors-editor.png)

## The Listing File (.lst)

By default, GAMS-IDE helps you navigate the GAMS listing file, which contains the authoritative error report.

*   **Auto-Jump**: When an error occurs, the extension can automatically open the `.lst` file and scroll to the first error.
*   **Listing Navigation**: In the listing file, you can click on error references to jump back to the source code.

![Listing file with error](/screenshots/usage-errors-lst.png)

## Troubleshooting Missing Errors

If you don't see errors:
*   Ensure **Run Diagnostics on Save** is enabled in [Settings](../configuration/settings.md).
*   Check if your [Main GAMS File](../configuration/main-gms-file.md) is correctly configured.