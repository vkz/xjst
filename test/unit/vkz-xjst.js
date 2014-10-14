// Annotated result of compiling the following xjst source
// 
// >> xjst
// -------------------------------------------------------
// template()(function() {
//   return apply({ x: 1 });
// });
// template(this.x === 1)(function() {
//   return local({ y: 2 }, { a: {}, 'a.b': 3 })(function() {
//     return applyNext();
//   });
// });
// template(this.y === 2, this.x === 1)('yay');
// template(this.y === 3, this.x === 1)(function() {
//   return 'ouch';
// });
// "just a code";
// -------------------------------------------------------

var __$ref = {};

function apply(ctx) {
  ctx = ctx || this;
  try {
    return applyc(ctx, __$ref);
  } catch (e) {
    e.xjstContext = ctx;
    throw e;
  }
}

exports.apply = apply;

function applyc(__$ctx, __$ref) {
  "just a code";
  var __$r = __$g0(__$ctx, __$ref);
  if (__$r !== __$ref) return __$r;
}


// ??? don't understand yet
[].forEach(function(fn) {
  fn(exports, this);
}, {
  // 'this' object for the sake of forEach execution
  recordExtensions: function(ctx) {
    ctx["y"] = undefined;
    ctx["a"] = undefined;
    ctx["b"] = undefined;
    ctx["__$a0"] = 0;           // applyNext flag
    ctx["x"] = undefined;
  },
  resetApplyNext: function(ctx) {
    ctx["__$a0"] = 0;
  }
});

function __$g0(__$ctx, __$ref) {
  var __$t = __$ctx.x;
  if (__$t === 1) {             // this.x is the most frequent predicate lhs so it's the top-most if-branch
    var __$t = __$ctx.y;
    if (__$t === 3) {
      return "ouch";
    } else if (__$t === 2) {
      return "yay";
    }
    
    if ((__$ctx.__$a0 & 1) === 0) { // check that applyNext flag isn't set
      var __$r__$1;
      var __$l0__$2 = __$ctx.y;
      __$ctx.y = 2;
      var __$l1__$3 = __$ctx.a;
      __$ctx.a = {};
      var __$l3__$4 = __$ctx.a;
      var __$l2__$5 = __$l3__$4.b;
      __$l3__$4.b = 3;
      var __$r__$7;
      var __$l4__$8 = __$ctx.__$a0;
      __$ctx.__$a0 = __$ctx.__$a0 | 1; // set applyNext flag to avoid reentrance
      __$r__$7 = applyc(__$ctx, __$ref);
      __$ctx.__$a0 = __$l4__$8;
      __$r__$1 = __$r__$7;
      __$ctx.y = __$l0__$2;
      __$ctx.a = __$l1__$3;
      __$l3__$4.b = __$l2__$5;
      var __$r = __$r__$1;
      if (__$r !== __$ref) return __$r;
    }
  }
  var __$r__$10;
  var __$l0__$11 = __$ctx.x;
  __$ctx.x = 1;
  __$r__$10 = applyc(__$ctx, __$ref);
  __$ctx.x = __$l0__$11;
  var __$r = __$r__$10;
  if (__$r !== __$ref) return __$r;
  return __$ref;
}
