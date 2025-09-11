import * as path from 'path';

/**
 * Check whether an absolute file path should be considered excluded based on a list of paths.
 * @param filePath Absolute path of file to test.
 * @param pathsToExclude Array of absolute or relative (workspace-root relative) file or folder paths.
 * @param returnMatchedPath When true returns the matched exclude path string instead of a boolean.
 */
export default function checkIfExcluded(
  filePath: string = "",
  pathsToExclude: string[] = [],
  returnMatchedPath: boolean = false
): boolean | string | undefined {
  // filePath is an absolute file path (e.g. "/home/user/subdir/file.gms")
  // pathsToExclude is an array of strings, where each entry can be:
  // - a relative path to a file or folder (e.g. "subdir/file.gms", "subdir")
  // - an absolute path to a file or folder (e.g. "/home/user/subdir/file.gms", "/home/user/subdir")

  // check if the file is excluded
  for (const pathToExclude of pathsToExclude) {
    if (!pathToExclude) {
      continue;
    }
    // absolute path match (folder or file)
    if (path.isAbsolute(pathToExclude)) {
      if (filePath === pathToExclude || filePath.startsWith(pathToExclude + path.sep)) {
        return returnMatchedPath ? pathToExclude : true;
      }
      continue;
    }
    // single file relative path
    if (pathToExclude.toLowerCase().endsWith('.gms')) {
      if (filePath.toLowerCase().endsWith(path.sep + pathToExclude.toLowerCase())) {
        return returnMatchedPath ? pathToExclude : true;
      }
    }
    // folder relative path: check each segment
    const segments = filePath.split(path.sep);
    if (segments.includes(pathToExclude)) {
      return returnMatchedPath ? pathToExclude : true;
    }
  }
  return returnMatchedPath ? undefined : false;
};