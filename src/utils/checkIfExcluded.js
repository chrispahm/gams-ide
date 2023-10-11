const path = require('path');

module.exports = function checkIfExcluded(filePath, pathsToExclude) {
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
        console.log("Excluded file: ", filePath, pathToExclude);
        return true;
      }
    } else {
      // check if the a single file is referenced
      if (pathToExclude.toLowerCase().endsWith(".gms") && filePath.endsWith(pathToExclude)) {
        console.log("Excluded file: ", filePath, pathToExclude);
        return true;
      } else if (path.parse(filePath).dir.endsWith(pathToExclude)) {
        console.log("Excluded file: ", filePath, pathToExclude);
        return true;
      }
      // for folders, we have to check if any of the parent directories has the same name
      const directoriesInFilePath = filePath.split(path.sep);
      directoriesInFilePath.some((directory) => {
        if (directory === pathToExclude) {
          console.log("Excluded file: ", filePath, pathToExclude);
          return true;
        }
      });
    }
  });
  return excluded;
};