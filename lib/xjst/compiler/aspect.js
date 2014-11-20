var util = require("util");


function addAspect(constructor, superConstructor) {

  constructor.prototype.withAspect = true;

  Object.keys(superConstructor.prototype)
    .filter(function (prop) { return typeof superConstructor.prototype[prop] === 'function' })
    .forEach(function (method) {
      constructor.prototype[method] = function () {
        var timerBegin, res, timerEnd;
        
        // don't wrap recursive calls
        if(!this._recurred[method]) {
          this._recurred[method] = 0;
          timerBegin = process.hrtime();
        };
        this._recurred[method]++;

        res = superConstructor.prototype[method].apply(this, arguments);

        // report if no more recursive calls on the stack
        if((--this._recurred[method]) === 0) { 
          timerEnd  = process.hrtime(timerBegin);
          console.log('Rendered a %s in %d nanoseconds', method, timerEnd[0] * 1e9 + timerEnd[1]);
        };

        return res;
      };
    });
}

function withAspect(superConstructor) {

  function Constructor() {
    this._recurred = {};
    superConstructor.apply(this, arguments);
  }
  util.inherits(Constructor, superConstructor);
  addAspect(Constructor, superConstructor);
  return Constructor;
}

exports.withAspect = withAspect;
