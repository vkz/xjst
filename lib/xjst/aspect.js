var util = require('util'),
    lo = require('lodash');

var cleanAspectLog = {},
    aspectLog = {},
    units = { sec: 1e9, micro: 1e3, milli: 1e6 , nano: 1},
    instances = {};

function cleanLog() {
  aspectLog = lo.cloneDeep(cleanAspectLog);
}

function showAspectLog(unit) {

  var log = lo.mapValues(aspectLog, function (constructor) {
    return lo.mapValues(constructor, function (methodTime) {
      return (methodTime[0] * 1e9 + methodTime[1])/units[unit || 'nano'];
    });
  });

  cleanLog();

  return log;
}

exports.showAspectLog = showAspectLog;

function addAspect(constructor, superConstructor) {

  constructor.prototype.withAspect = true;
  aspectLog[superConstructor.name] || (aspectLog[superConstructor.name] = {});

  Object.keys(superConstructor.prototype)
    .filter(function (prop) { return typeof superConstructor.prototype[prop] === 'function' })
    .forEach(function (method) {

      // inintialize the logger
      aspectLog[superConstructor.name][method] = [0, 0];

      var superMethod = superConstructor.prototype[method];

      constructor.prototype[method] = function () {
        var timerBegin, res, timerEnd;

        // before-method
        if(!this._recurred[method]) { // don't wrap recursive calls
          this._recurred[method] = 0;
          timerBegin = process.hrtime();
        };
        this._recurred[method]++;

        // method
        res = superMethod.apply(this, arguments);

        // after-method
        if((--this._recurred[method]) === 0) {
          timerEnd  = process.hrtime(timerBegin);
          aspectLog[superConstructor.name][method][0] += timerEnd[0];
          aspectLog[superConstructor.name][method][1] += timerEnd[1];
        };

        return res;
      };
    });

  cleanAspectLog = lo.extend(cleanAspectLog, aspectLog);
}

function withAspect(superConstructor) {

  function Constructor() {

    // console.log('!!!  %s instance created', superConstructor.name);
    // (instances[superConstructor] || (instances[superConstructor] = [])).push(this);

    this._recurred = {};
    this._constructor = superConstructor.name;
    superConstructor.apply(this, arguments);
  }
  util.inherits(Constructor, superConstructor);
  addAspect(Constructor, superConstructor);

  return Constructor;
}

exports.withAspect = withAspect;
