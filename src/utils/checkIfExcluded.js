const path = require('path');

module.exports = function checkIfExcluded(filePath = "", pathsToExclude = [], returnMatchedPath = false) {
  // filePath is an absolute file path (e.g. "/home/user/subdir/file.gms")
  // pathsToExclude is an array of strings, where each entry can be:
  // - a relative path to a file or folder (e.g. "subdir/file.gms", "subdir")
  // - an absolute path to a file or folder (e.g. "/home/user/subdir/file.gms", "/home/user/subdir")

  // check if the file is excluded
  const excluded = pathsToExclude.some((pathToExclude) => {
    // check if the pathToExclude is an absolute path
    if (path.isAbsolute(pathToExclude)) {
      // check if the file is excluded
      if (filePath.startsWith(pathToExclude)) {
        return returnMatchedPath ? pathToExclude : true;
      }
    } else {
      // check if the a single file is referenced
      if (pathToExclude.toLowerCase().endsWith(".gms") && filePath.endsWith(pathToExclude)) {
        return returnMatchedPath ? pathToExclude : true;
      } else if (path.parse(filePath).dir.endsWith(pathToExclude)) {
        return returnMatchedPath ? pathToExclude : true;
      }
      // for folders, we have to check if any of the parent directories has the same name
      const directoriesInFilePath = filePath.split(path.sep);
      directoriesInFilePath.some((directory) => {
        if (directory === pathToExclude) {
          return returnMatchedPath ? pathToExclude : true;
        }
      });
    }
  });
  return excluded;
};