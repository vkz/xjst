// TODO remove deps on Node stuff
var assert = require('assert');

module.exports = function (proto,
                    compiler,
                    utils,
                    render) {

  // Get required constructors
  var Inliner = compiler.Inliner;
  var Splitter = compiler.Splitter;
  var MapFlattener = compiler.MapFlattener;
  var Jailer = compiler.Jailer;
  var Template = compiler.Template;
  var Predicate = compiler.Predicate;
  var Group = compiler.Group;
  var Map = compiler.Map;

  // Compiler constructor
  function Compiler(options) {
    this.options = options || {};

    this.code = null;
    this.idHash = {};
    this.revIdHash = {};
    this.scores = {};
    this.idCount = 0;
    this.bodyId = 1;
    this.bodyUid = 0;
    this.mapId = 1;
    this.applyNext = {
      value: 0,
      count: 0,
      prop: null
    };

    this.ctx = { type: 'Identifier', name: '__$ctx' };
    this.ref = { type: 'Identifier', name: '__$ref' };

    this.renderStack = [];
    this.renderHistory = [];
    this.renderCacheMap = {};
    this.sharedBodies = {};
    this.maps = {};

    // Context extensions from local({}) stmts
    this.extensions = {};

    // Global vars from local(null, {})
    this.globals = {};
    if (this.options.globals) {
      Object.keys(this.options.globals).forEach(function(name) {
        return this.globals['$$' + name] = this.options.globals[name];
      }, this);
    }
    this.globalInit = {};
    if (this.options.globalInit) {
      Object.keys(this.options.globalInit).forEach(function(name) {
        return this.globalInit['$$' + name] = this.options.globalInit[name];
      }, this);
    }

    this.program = null;
    this.inputProgram = null;

    this.jailer = Jailer.create();
    this.inliner = Inliner.create();
    this.splitter = Splitter.create(this);
    this.flattener = MapFlattener.create(this);
  };

  Compiler.prototype = proto;

  Compiler.prototype.getNodeLine = function getNodeLine(node) {
    if (!this.code || !node.loc)
      return '';

    var loc = node.loc.start;
    var lines = this.code.split(/\r\n|\r|\n/g);
    var line = lines[loc.line - 1];
    var arrow = '';
    for (var i = 0; i < loc.column; i++)
      arrow += ' ';
    arrow += '^';

    return ' at ' + loc.line + ':' + loc.column + '\n' + line + '\n' + arrow;
  };

  Compiler.prototype.assert = function assert(node, cond, text) {
    if (cond)
      return;

    if (!text)
      text = 'Assertion failed';
    throw new Error(text + this.getNodeLine(node));
  };

  Compiler.prototype.assertEqual = function assertEqual(node, lhs, rhs, text) {
    if (lhs === rhs)
      return;

    if (!text)
      text = 'Expected ' + rhs + ', but got ' + lhs;
    throw new Error(text + this.getNodeLine(node));
  };

  // Run compiler in phases to translate AST to AST
  Compiler.prototype.translate = function translate(templates, code) {
    if (code)
      this.code = code;

    var program = this.preTranslate(templates);

    var result = this._translate(program, false);

    // Prevent apply inlinings
    this.inlineDepth = this.maxInlineDepth;

    // 3.  Add maps to result
    // NOTE: this could possibly generate more shared bodies,
    // so order is important here.
    this.addMaps(result);

    // 4. Add shared bodies to result
    this.addBodies(result);

    // 5. Inline function expressions
    result = this.inliner.inline(result);

    // 6. Split big functions into small ones
    result = this.splitter.split(result);

    return result;
  };

  Compiler.prototype._translate = function translate(program, bodyOnly) {
    var cacheKey = this._renderCacheKey(program.templates);
    var res = this.probeRenderCache(cacheKey);
    if (res && bodyOnly) return xjst.utils.cloneAst(res);

    var old = this.program;

    this.program = program;
    this.inputProgram = this.inputProgram || program;
    this.inlineDepth++;

    // Save render stack from enemies
    var oldRender = { stack: this.renderStack, history: this.renderHistory };
    this.renderStack = [];
    this.renderHistory = [];

    // Roll-out local() and apply/applyNext() calls
    program.templates.forEach(function(template) {
      template.rollOut();
    });

    // Group templates
    program.templates = this.sortGroup(program.templates);

    // Flatten maps (disable for now)
    // program.templates = this.flattener.flatten(program.templates);

    // Restore `this.program`
    this.program = old;

    // Render program back to AST form
    var res = this.render(program, bodyOnly);

    // Restore render stack
    this.renderStack = oldRender.stack;
    this.renderHistory = oldRender.history;

    // Restore inline depth
    this.inlineDepth--;

    this.renderCache(cacheKey, res);
    return res;
  };

  // Get unique id for a javascript value
  Compiler.prototype.getId = function getId(value) {
    var key = utils.identify(value);

    if (this.idHash.hasOwnProperty(key)) {
      this.idHash[key].score++;
      return this.idHash[key].id;
    }

    var id = this.idCount++;
    this.idHash[key] = { id: id, key: key, value: value, score: 0 };
    this.revIdHash[id] = this.idHash[key];

    return id;
  };

  Compiler.prototype.accountScore = function accountScore(key, value) {
    if (!this.scores.hasOwnProperty(key)) {
      this.scores[key] = { count: 0, variance: 0, values: {} };
    }

    var item = this.scores[key];
    item.count++;
    if (!item.values.hasOwnProperty(value)) {
      item.values[value] = 1;
      item.variance++;
    } else {
      item.values[value]++;
    }
  };

  // Get score for unique javascript value
  Compiler.prototype.getScore = function getScore(id) {
    var bump = 0;
    if (this.options.scoreFilter) {
      var value = this.revIdHash[id] || '';
      bump = this.options.scoreFilter(value.value, value.score, value.key);
    }
    if (!this.scores.hasOwnProperty(id)) return bump + 0;

    return bump + this.scores[id].count;
  };

  // Return unique applyNext flag
  Compiler.prototype.getApplyNext = function getApplyNext() {
    // Overflow
    if (this.applyNext.value === 1073741824 || this.applyNext.value === 0) {
      this.applyNext.value = 1;
      this.applyNext.prop = {
        type: 'Identifier',
        name: '__$a' + this.applyNext.count++
      };
    }

    var value = {
      type: 'Literal',
      value: this.applyNext.value
    };
    this.applyNext.value <<= 1;

    return { prop: this.applyNext.prop, value: value };
  };

  Compiler.prototype.jailVars = function jailVars(stmt) {
    return this.jailer.jail(stmt);
  };

  Compiler.prototype.addChange = function addChange(predicate) {
    var predicates = Array.isArray(predicate) ? predicate : [ predicate ];

    this.renderHistory.push(predicates.length);
    for (var i = 0; i < predicates.length; i++) {
      this.renderStack.push(predicates[i]);
    }
  };

  Compiler.prototype.revertChange = function revertChange() {
    if (this.renderHistory.length === 0) throw new Error('Render OOB');
    var n = this.renderHistory.pop();
    for (var i = 0; i < n; i++) {
      this.renderStack.pop();
    }
  };

  Compiler.prototype.registerBody = function registerBody(body) {
    if (body.shareable && this.sharedBodies.hasOwnProperty(body.id)) {
      this.shareBody(body);
      return true;
    }
    if (body.shareable && body.primitive) {
      this.shareBody(body);
      return true;
    }

    return false;
  };

  Compiler.prototype.shareBody = function shareBody(body) {
    assert(body.shareable);
    body.id = body.id === null ? this.bodyId++ : body.id;
    this.sharedBodies[body.id] = body;
  };

  Compiler.prototype.unshareBody = function unshareBody(body) {
    assert(body.shareable);
    delete this.sharedBodies[body.id];
  };

  Compiler.prototype._renderCacheKey = function _renderCacheKey(templates) {
    return templates.map(function(t) {
      return t.uid.toString(36);
    }).join(':');
  };

  Compiler.prototype.probeRenderCache = function probeRenderCache(key) {
    return this.renderCacheMap[key];
  };

  Compiler.prototype.renderCache = function renderCache(key, body) {
    this.renderCacheMap[key] = body;
  };

  Compiler.prototype.addBodies = function addBodies(result) {
    var changed = true,
        visited = {};

    while (changed) {
      changed = false;
      Object.keys(this.sharedBodies).forEach(function(id) {
        if (visited.hasOwnProperty(id)) return;
        visited[id] = true;
        changed = true;

        var body = this.sharedBodies[id];
        assert.equal(body.id, id);

        var out = body.render(true).apply;
        out = Array.isArray(out) ? out.slice() : [out];

        // Optimization:
        // If last statement isn't return - return
        if (out.length === 0 || out[out.length - 1].type !== 'ReturnStatement') {
          out = out.concat({
            type: 'ReturnStatement',
            argument: this.ref
          });
        }

        result.body.push({
          type: 'FunctionDeclaration',
          id: this.getBodyName(body),
          params: [ this.ctx, this.ref ],
          defaults: [],
          rest: null,
          generator: false,
          expression: false,
          body: {
            type: 'BlockStatement',
            body: out
          }
        });
      }, this);
    }
  };

  Compiler.prototype.registerMap = function registerMap(map) {
    if (map.id) return;
    map.id = this.mapId++;
    this.maps[map.id] = map;
  };

  Compiler.prototype.addMaps = function addMaps(result) {
    Object.keys(this.maps).forEach(function(id) {
      var map = this.maps[id];
      result.body.push(map.getMap());
    }, this);
  };

  Compiler.prototype.getBodyName = function getBodyName(body) {
    assert(body.shared);
    assert(this.sharedBodies.hasOwnProperty(body.id));
    return { type: 'Identifier', name: '__$b' + body.id };
  };

  Compiler.prototype.getMapName = function getMapName(map) {
    assert(this.maps.hasOwnProperty(map.id));
    return { type: 'Identifier', name: '__$m' + map.id };
  };

  Compiler.prototype.renderArray = function renderArray(bodies) {
    var out = { apply: [], other: [], init: [] };

    bodies.forEach(function(body) {
      // TODO(vkz): Pass `out` as an argument and push stuff directly into it
      var ast = body.render();
      if (ast.apply) out.apply = out.apply.concat(ast.apply);
      if (ast.other) out.other = ast.other.concat(out.other);
      if (ast.init) out.init = out.init.concat(ast.init);
    }, this);

    return out;
  };

  // Sort and group templates by first predicate
  // (recursively)
  Compiler.prototype.sortGroup = function sortGroup(templates) {
    var self = this,
        out = templates.slice();

    // Sort predicates in templates by popularity
    templates.forEach(function(template) {
      template.predicates.sort(function(a, b) {
        return b.getScore() - a.getScore();
      });
    });

    var groups = [];

    // Group templates by first predicate
    groups.push(templates.reduce(function(acc, template) {
      if (acc.length === 0) return [ template ];

      if (template.predicates.length === 0 ||
          acc[0].predicates.length === 0 ||
          acc[0].predicates[0].id !== template.predicates[0].id) {
        groups.push(acc);
        return [ template ];
      }

      acc.push(template);
      return acc;
    }, []));

    // Create `Group` instance for each group and .sortGroup() them again
    out = groups.reduce(function(acc, group) {
      if (group.length <= 1) return acc.concat(group);

      // Remove first predicate
      var pairs = group.map(function(member) {
        return { predicate: member.predicates.shift(), body: member };
      });

      // Pairs all have the same predicate,
      // find pairs with same constant and .sortGroup() them too
      var subgroups = {};
      pairs.forEach(function(pair) {
        var id = pair.predicate.valueId;
        if (!subgroups[id]) {
          subgroups[id] = [ pair ];
        } else {
          subgroups[id].push(pair);
        }
      });

      // Sort group each subgroup again
      pairs = Object.keys(subgroups).reduce(function(acc, key) {
        var subgroup = subgroups[key];
        if (subgroup.length === 0) return acc;

        var predicate = subgroup[0].predicate;
        acc.push({
          predicate: predicate,
          bodies: self.sortGroup(subgroup.map(function(member) {
            return member.body;
          }))
        });

        return acc;
      }, []);

      return acc.concat(new Group(self, pairs));
    }, []);

    return out;
  };

  Compiler.prototype.registerExtension = function registerExtension(name) {
    if (name !== '__proto__')
      this.extensions[name] = true;
  };

  Compiler.prototype.render = function render(program, bodyOnly) {
    var stmts = [],
        initializers = program.init.slice(),
        applyBody = program.other.map(function(stmt) {
          return this.replaceFetch(this.sanitize(stmt));
        }, this),
        applyContext = {
          type: 'LogicalExpression',
          operator: '||',
          left: { type: 'Identifier', name: 'ctx' },
          right: { type: 'ThisExpression' }
        },
        apply = {
          type: 'FunctionDeclaration',
          id: { type: 'Identifier', name: 'apply' },
          params: [{ type: 'Identifier', name: 'ctx' }],
          defaults: [],
          rest: null,
          generator: false,
          expression: false,
          body: {
            type: 'BlockStatement',
            body: [{
              type: 'TryStatement',
              block: {
                type: 'BlockStatement',
                body: [{
                  type: 'ReturnStatement',
                  argument: {
                    type: 'CallExpression',
                    callee: { type: 'Identifier', name: 'applyc' },
                    arguments: [{ type: 'Identifier', name: 'ctx' }, this.ref]
                  }
                }]
              },
              guardedHandlers: [],
              handlers: [{
                type: 'CatchClause',
                param: { type: 'Identifier', name: 'e' },
                body: {
                  type: 'BlockStatement',
                  body: [{
                    type: 'ExpressionStatement',
                    expression: {
                      type: 'AssignmentExpression',
                      operator: '=',
                      left: {
                        type: 'MemberExpression',
                        computed: false,
                        object: { type: 'Identifier', name: 'e' },
                        property: { type: 'Identifier', name: 'xjstContext' }
                      },
                      right: { type: 'Identifier', name: 'ctx' }
                    }
                  }, {
                    type: 'ThrowStatement',
                    argument: { type: 'Identifier', name: 'e' }
                  }]
                }
              }],
              finalizer: null
            }]
          }
        },
        applyc = {
          type: 'FunctionDeclaration',
          id: { type: 'Identifier', name: 'applyc' },
          params: [ this.ctx, this.ref ],
          defaults: [],
          rest: null,
          generator: false,
          expression: false,
          body: {
            type: 'BlockStatement',
            body: null
          }
        };

    // var __$ref = {};
    stmts.push({
      type: 'VariableDeclaration',
      kind: 'var',
      declarations: [{
        type: 'VariableDeclarator',
        id: this.ref,
        init: { type: 'ObjectExpression', properties: [] }
      }]
    });

    // exports.apply = apply
    stmts.push(apply);
    stmts.push({
      type: 'ExpressionStatement',
      expression: {
        type: 'AssignmentExpression',
        operator: '=',
        left: {
          type: 'MemberExpression',
          computed: false,
          object: { type: 'Identifier', name: 'exports' },
          property: { type: 'Identifier', name: 'apply' }
        },
        right: { type: 'Identifier', name: 'apply' }
      }
    });

    // applyc
    stmts.push(applyc);

    // Call applyc once to allow users override exports
    // [init functions].forEach(function(fn) { fn(exports, this) }, ctx);
    stmts.push({
      type: 'ExpressionStatement',
      expression: {
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          computed: false,
          property: { type: 'Identifier', name: 'forEach'},
          object: {
            type: 'ArrayExpression',
            elements: initializers
          }
        },
        arguments: [{
          type: 'FunctionExpression',
          id: null,
          params: [ { type: 'Identifier', name: 'fn' } ],
          defaults: [],
          rest: null,
          generator: false,
          expression: false,
          body: {
            type: 'BlockStatement',
            body: [{
              type: 'ExpressionStatement',
              expression: {
                type: 'CallExpression',
                callee: { type: 'Identifier', name: 'fn' },
                arguments: [
                  { type: 'Identifier', name: 'exports' },
                  { type: 'ThisExpression' }
                ]
              }
            }]
          }
        }, {
          type: 'ObjectExpression',
          properties: [{
            type: 'Property',
            key: { type: 'Literal', value: 'recordExtensions' },
            value: this.getRecordExtensions(),
            kind: 'init'
          }, {
            type: 'Property',
            key: { type: 'Literal', value: 'resetApplyNext' },
            value: this.getResetApplyNext(),
            kind: 'init'
          }]
        }]
      }
    });

    // Render each template
    var out = this.renderArray(program.templates);

    // global variables
    var globals = this.globals;
    var globalInit = this.globalInit;
    var globalKeys = Object.keys(globals);
    if (globalKeys.length !== 0) {
      stmts.unshift({
        type: 'VariableDeclaration',
        kind: 'var',
        declarations: globalKeys.map(function(name) {
          // Initialize globals from the context if asked
          if (globalInit[name]) {
            apply.body.body.unshift({
              type: 'ExpressionStatement',
              expression: {
                type: 'AssignmentExpression',
                operator: '=',
                left: { type: 'Identifier', name: name },
                right: {
                  type: 'MemberExpression',
                  computed: true,
                  object: { type: 'Identifier', name: 'ctx' },
                  property: { type: 'Literal', value: globalInit[name] }
                }
              }
            });
          }

          // Declare globals
          return {
            type: 'VariableDeclarator',
            id: { type: 'Identifier', name: name },
            init: { type: 'Literal', value: globals[name] }
          };
        }, this)
      });
    }

    // ctx = ctx || this
    apply.body.body.unshift({
      type: 'ExpressionStatement',
      expression: {
        type: 'AssignmentExpression',
        operator: '=',
        left: { type: 'Identifier', name: 'ctx' },
        right: applyContext
      }
    });

    /// Apply to the bottom
    if (out.apply) applyBody = applyBody.concat(out.apply);

    // Other to the top
    if (out.other) applyBody = out.other.concat(applyBody);

    // Initializers to the initializers array
    if (out.init) {
      if (Array.isArray(out.init)) {
        initializers.push.apply(initializers, out.init);
      } else {
        initializers.push(out.init);
      }
    }

    if (bodyOnly)
      return applyBody;

    // Set function's body
    applyc.body.body = applyBody;

    return {
      type: 'Program',
      body: stmts
    };
  };

  // Return parameterised Compiler constructor
  return Compiler;
};
