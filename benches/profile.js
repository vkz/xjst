var bemxjst = require("bem-xjst"),
    lo = require("lodash"),
    pp = require("zeHelpers").prettyPrint,
    templates = [ 
      "desktop.pages.index.bemhtml+concat.js",
      "desktop.pages.islands.bemhtml+concat.js",
      "touch-pad.pages.index.bemhtml+concat.js", 
      "touch-pad.pages.islands.bemhtml+concat.js",
      "touch-phone.pages.index.bemhtml+concat.js", 
      "touch-phone.pages.islands.bemhtml+concat.js" 
    ].map(function (file) { return fs.readFileSync(file, "utf8") });

function profile(template) { 
  var compiler = new bemxjst.Compiler(),
      result;

  // that's fucked up
  try {
    result = compiler.generate(template);
  } catch (e) { 
    return e;
  }
  return result;
}

function getStats(interations) {
  var stats = templates.map(function () { return []; });
  for(interations = 0; interations < 10; interations++) {
    templates.forEach(function (template, i) { stats[i].push(profile(template));});
  }
  return stats;
}

function mergeTwoStats(stat1, stat2) {

  var concatStats = function (n1, n2) { 
    return lo.isArray(n1) ? n1.concat(n2) : [n1, n2]; 
  };

  var mergeMethods = function (methods1, methods2) {
    return lo.merge(methods1, methods2, concatStats);
  };

  return lo.merge(stat1, stat2, mergeMethods);
}


function mergeStats(stats) {

  var collectStatsForTemplate = function (arrayOfStatsForTemplate) {
    return lo.reduce(arrayOfStatsForTemplate, mergeTwoStats);
  };

  var report = function (arr) {
    var len = arr.length;
    return {
      min: lo.min(arr),
      avg: arr.reduce(function (a, b) { return a+b; }, 0) / len,
      max: lo.max(arr)
    };
  };

  var reduceStats = function (stat, fun) {
    return lo.mapValues(stat, function (methods) {
      return lo.mapValues(methods, function (arrayOfStats) {
        return fun(arrayOfStats);
      });
    });
  };

  return stats.map(function (statArray) {
    var stat = collectStatsForTemplate(statArray);
    return reduceStats(stat, report);
  });
}

pp(mergeStats(getStats(10)));
