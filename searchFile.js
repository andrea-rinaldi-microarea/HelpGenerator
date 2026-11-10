const path = require('path');
const fs = require('fs');

//=============================================================================
module.exports = function searchRecursiveFileByName (dir, pattern) {
    var results = [];
  
    fs.readdirSync(dir).forEach(function (dirInner){
      dirInner = path.resolve(dir, dirInner);
  
      var stat = fs.statSync(dirInner);
  
      if (stat.isDirectory()) {
        results = results.concat(searchRecursiveFileByName(dirInner, pattern));
      }
  
      if (stat.isFile() && dirInner.endsWith(pattern)) {
        results.push(dirInner);
      }
    });  

    return results;
};