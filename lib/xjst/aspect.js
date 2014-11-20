var util = require('util'),
    lo = require('lodash');

var aspectLog = {},
    units = { sec: 1e9, micro: 1e3, milli: 1e6 };


function showAspectLog(unit) {
  var log = aspectLog;
      
  if (unit) {
    log = lo.mapValues(aspectLog, function (constructor) {
      return lo.mapValues(constructor, function (methodTime) {
        return ((methodTime[0] * 1e9 + methodTime[1])/units[unit]).toString() + ' ' + unit;
      });
    });
  }
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
      var _time = (aspectLog[superConstructor.name][method] = [0, 0]);

      constructor.prototype[method] = function () {
        var timerBegin, res, timerEnd;

        // before-method
        if(!this._recurred[method]) { // don't wrap recursive calls
          this._recurred[method] = 0;
          timerBegin = process.hrtime();
        };
        this._recurred[method]++;
        
        // method
        res = superConstructor.prototype[method].apply(this, arguments);

        // after-method
        if((--this._recurred[method]) === 0) { 
          timerEnd  = process.hrtime(timerBegin);
          _time[0] += timerEnd[0];
          _time[1] += timerEnd[1];
        };

        return res;
      };
    });
}

function withAspect(superConstructor) {

  function Constructor() {
    this._recurred = {};
    this._constructor = superConstructor.name;
    superConstructor.apply(this, arguments);
  }
  util.inherits(Constructor, superConstructor);
  addAspect(Constructor, superConstructor);

  return Constructor;
}

exports.withAspect = withAspect;
