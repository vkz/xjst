// Annotated result of compiling the following xjst source
// 
// see `Compiler.prototype.generate' in /Users/kozin/Documents/xjst/lib/xjst/compiler/base.js
// to understand how it all gets generated
// 
// >> xjst --no-opt
// ----------------------------------
// template()(function() {
//   return 'oh noes!';
// });
// template(this.a === 'ok')(function() {
//   return 'ok';
// });
// template(this.a === 'start')(function() {
//   var x = 'ok';
//   return apply({ a: x });
// });
// ----------------------------------


/// -------------------------------------
/// ---------- Bootstrap start ----------
/// -------------------------------------
var __$$globalCtx = {};

// (2) meat of this whole thing
// its defined in lib/xjst/utils.js, converted toString() in base.js
// then inlined in this generated code
function run(templates, context) {
  var ignore = context.$ignore;
  var globalCtx = __$$globalCtx;
  if (!ignore) {
    context.$ignore = [];
    ignore = context.$ignore;
  }

  var index = 0;
  var currentId = null;
  var last = null;

  // (template-function) the meet of non-compilation matching 
  // for each template if its predicates return true wrap its body 
  // in clojure and assign that to `last'. Once we exhausted all
  // templates, we can simply invoke last.body() guaranteeing 
  // that only the last template that matched has its body 
  // executed
  function template() {
    var id = index++;
    var match = !context.$override &&
                Array.prototype.every.call(arguments, function(cond) {
      try {
        return typeof cond === 'function' ? cond.call(context) : cond;
      } catch (e) {
        if (/Cannot read property/.test(e.message))
          return false;
      }
    });

    // Respect applyNext
    if (match && ignore.indexOf(id) !== -1) match = false;

    // Ignore body if match failed
    if (!match) return function() {};

    // Set current id
    currentId = id;

    return function bodyHandler(body) {
      last = {
        id: id,
        body: typeof body === 'function' ? body.bind(context)
                                         : function() { return body }
      };

      return null;
    };
  };

  function local() {
    var backup = [];
    var args = Array.prototype.slice.call(arguments);

    args.forEach(function(change) {
      if (change === null)
        return;

      if (typeof change !== 'object')
        throw new Error('apply() and local() accepts only object literals');

      Object.keys(change).forEach(function(key) {
        var parts = key.split('.'),
            newValue = change[key],
            oldValue,
            isGlobal = parts[0] === '$$global',
            subContext = isGlobal ? globalCtx : context;

        if (isGlobal) {
          parts.shift();
        }

        // Dive inside
        for (var i = 0; i < parts.length - 1; i++) {
          subContext = subContext[parts[i]];
        }

        // Set property and remember old value
        oldValue = subContext[parts[i]];
        subContext[parts[i]] = newValue;

        // Push old value to backup list
        backup.push({
          isGlobal: isGlobal,
          key: parts,
          value: oldValue
        });
      });
    });

    // (wrap body) for every template() whose predicates match
    // wrap its body in a handler function, so that we can invoke
    // the body of last template whose predicates were truthy  
    // once we exhausted all templates
    return function bodyHandler(body) {
      var result = typeof body === 'function' ? body.call(context) : body;

      // Rollback old values
      for (var i = backup.length - 1; i >= 0; i--) {
        var subContext = backup[i].isGlobal ? globalCtx : context,
            change = backup[i];

        // Dive inside
        for (var j = 0; j < change.key.length - 1; j++) {
          subContext = subContext[change.key[j]];
        }

        // Restore value
        subContext[change.key[j]] = change.value;
      }

      return result;
    };
  };

  function apply() {
    return local.apply(this, arguments)(function() {
      return run(templates, context);
    });
  };

  function applyNext() {
    return local.apply(this, arguments)(function() {
      var len = ignore.push(currentId);
      var ret = run(templates, context);
      if (len === ignore.length)
        ignore.pop();
      return ret;
    });
  };

  // (oninit) essentially allows to 
  // pass user-defined functions/objects to be perused inside template bodies
  // during matching process (at apply-runtime)
  // cb: function(exports, ctx) -> any
  // cb - is just a callback to be invoked with runtime context
  // see excellent 'should reset applyNext flag after matching' example in tests
  // ---------------------------------------------------------------------------
  // oninit(function(exports, xjst) {
  //   exports.reset = xjst.resetApplyNext;
  // });
  // template()(function() {
  //   return 'oh noes!';
  // });
  // template(this.a === 'ok')(function() {
  //   return 'ok';
  // });
  // template()(function() {
  //   return applyNext({ a: this.a === 'pre-ok' ? 'ok' : 'pre-ok' });
  // });
  // template(this.a === 'pre-ok')(function() {
  //   exports.reset(this);
  //   return applyNext();
  // });
  function oninit(cb) {
    if (context.$init) {
      if (context.$context && !context.$context.resetApplyNext) {
        context.$context.resetApplyNext = function(context) {
          context.$ignore.length = 0;
        };
      }

      cb(exports, context.$context);
    }
  }

  // (__$$fetch) fetch property from globalCtx 
  // possibly nested property at runtime
  // see the penultimate test in unit tests
  // ---------------------------------------------------------------------------
  // template(function() { return __$$fetch('xkcd.dot') })(function() {
  //   return __$$fetch('xkcd.dot');
  // });
  // template()(function() {
  //   return local(null, { '$$global.xkcd': {}, '$$global.xkcd.dot': 'yes' })(
  //     applyNext()
  //   );
  // });
  function fetch(name) {
    var parts = name.split('.'),
        value = globalCtx;

    // Dive inside
    for (var i = 0; i < parts.length; i++) {
      value = value[parts[i]];
    }

    return value;
  }

  function set(name, val) {
    var parts = name.split('.'),
        value = globalCtx;

    // Dive inside
    for (var i = 0; i < parts.length - 1; i++) {
      value = value[parts[i]];
    }
    value[parts[i]] = val;

    return value;
  };

  // (3) matching happens here
  // since template() is just a function, user-defined templates
  // get executed one after another exactly as defined, no rearrangements,
  // no optimizations
  templates.call(context, template, local, apply, applyNext, oninit, fetch,
                 set);

  if (!last) {
    if (context.$init) return;
    throw new Error('Match failed');
  }

  // (4) but only the last matching template()
  // will have its body actually executed
  return last.body();
};

// (1) API method that user calls to start matching
// execution starts here
exports.apply = function apply(ctx) {
  try {
    return applyc(ctx || this);
  } catch (e) {
    e.xjstContext = ctx || this;
    throw e;
  }
};function applyc(ctx) {
  return run(templates, ctx);
};
try {
  applyc({
    $init: true,
    $exports: exports,
    $context: {
      recordExtensions: function() {}
    }
  });
} catch (e) {
  // Just ignore any errors
}


// (0) user defined templates are wrapped as is in a `templates'
// function and executed as defined
// --> exports.apply(ctx) where ctx is the object to match 
// --> applyc 
// --> run(templates, ctx) which
// locally defines all of local, apply, applyNext, and most important
// of all `template()'. Every template with truthy predicates will
// assign its body to `last' local variable, the last predicate to
// match will get its body executed this is how we guarantee to only
// execute the bottom-most matching template run() is fairly wasteful,
// cause every recursive call to run() will re-create all local
// functions (apply, applyNext, etc)
function templates(template, local, apply, applyNext, oninit, __$$fetch, __$$set) {
  /// -------------------------------------
  /// ---------- Bootstrap end ------------
  /// -------------------------------------

  /// -------------------------------------
  /// ---------- User code start ----------
  /// -------------------------------------
  template()(function() {
    console.log(this);
    return 'oh noes!';
  });
  template(this.a === 'ok')(function() {
    return 'ok';
  });
  template(this.a === 'start')(function() {
    var x = 'ok';
    return apply({ a: x });
  });/// -------------------------------------
  /// ---------- User code end ------------
  /// -------------------------------------
};
