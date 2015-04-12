var esprima = require('esprima'),
    uglify = require('uglify-js'),
    estraverse = require('estraverse'),
    vm = require('vm'),
    util = require('util'),
    assert = require('assert');

var xjst = require('../../xjst');
var compiler = require('./');

var generic = xjst.generic;

// Get required constructors
var Inliner = compiler.Inliner;
var Splitter = compiler.Splitter;
var MapFlattener = compiler.MapFlattener;
var Jailer = compiler.Jailer;
var Template = compiler.Template;
var Predicate = compiler.Predicate;
var Group = compiler.Group;
var Map = compiler.Map;
var utils = xjst.utils;

var Compiler = generic.parameterisedCompiler(
  compiler,
  utils);
exports.Compiler = Compiler;

exports.create = function create(options) {
  return new Compiler(options);
};

// Generate source code from input code
Compiler.prototype.generate = function generate(code) {
  if (this.options['no-opt'] || this.options.optimize === false) {
    return '/// -------------------------------------\n' +
           '/// ---------- Bootstrap start ----------\n' +
           '/// -------------------------------------\n' +
           'var __$$globalCtx = ' +
               JSON.stringify(this.options.globals || {}) + ';\n' +
           utils.run.toString() + ';\n' +
           'exports.apply = function apply(ctx) {\n' +
           '  try {\n' +
           '    return applyc(ctx || this);\n' +
           '  } catch (e) {\n' +
           '    e.xjstContext = ctx || this;\n' +
           '    throw e;\n' +
           '  }\n' +
           '};' +
           'function applyc(ctx) {\n' +
           '  return run(templates, ctx);\n' +
           '};\n' +
           'try {\n' +
           '  applyc({\n' +
           '    $init: true,\n' +
           '    $exports: exports,\n' +
           '    $context: {\n' +
           '      recordExtensions: function() {}\n' +
           '    }\n' +
           '  });\n' +
           '} catch (e) {\n' +
           '  // Just ignore any errors\n' +
           '}\n' +
           'function templates(template, local, apply, applyNext, oninit, ' +
                              '__$$fetch, __$$set) {\n' +
           '/// -------------------------------------\n' +
           '/// ---------- Bootstrap end ------------\n' +
           '/// -------------------------------------\n' +
           '\n' +
           '/// -------------------------------------\n' +
           '/// ---------- User code start ----------\n' +
           '/// -------------------------------------\n' +
           code +
           '/// -------------------------------------\n' +
           '/// ---------- User code end ------------\n' +
           '/// -------------------------------------\n' +
           '};';
  }

  var ast = esprima.parse(code, {
    loc: true
  });
  assert.equal(ast.type, 'Program');

  ast = this.translate(ast, code);

  var uast = uglify.AST_Node.from_mozilla_ast(ast);

  return uast.print_to_string({
    beautify: this.options.beautify === false ? false : true
  });
};

// Compile source to js function
Compiler.prototype.compile = function compile(code) {
  var out = this.generate(code),
      exports = {};

  vm.runInNewContext(
    '(function(exports, console) {\n' +
    out +
    '\n})(exports, console)',
    {
      exports: exports,
      console: console
    }
  );

  return exports;
};

// Filter out templates from program's body
Compiler.prototype.getTemplates = function getTemplates(ast) {
  var other = [],
      init = [];

  return {
    templates: ast.body.filter(function(stmt) {
      function fail() {
        other.push(stmt);
        return false;
      };

      if (stmt.type !== 'ExpressionStatement') return fail();

      var expr = stmt.expression;
      if (expr.type !== 'CallExpression') return fail();

      var callee = expr.callee;
      if (callee.type === 'CallExpression') {
        if (callee.callee.type !== 'Identifier' ||
            callee.callee.name !== 'template') {
          return fail();
        }
      } else if (callee.type === 'Identifier' && callee.name === 'oninit') {
        init = init.concat(expr.arguments);
        return false;
      } else {
        return fail();
      }

      return true;
    }).reverse(),
    init: init,
    other: other
  };
};

Compiler.prototype.sanitize = function sanitize(stmt) {
  return this.replaceThis(stmt);
};

// Replace `this` with `__$ctx`
Compiler.prototype.replaceThis = function replaceThis(stmt) {
  var ctx = this.ctx;
  return estraverse.replace(stmt, {
    enter: function(node, parent, notify) {
      if (node.type === 'ThisExpression') {
        return ctx;
      } else if (node.type === 'FunctionDeclaration' ||
                 node.type === 'FunctionExpression') {
        this.skip();
      }
    }
  });
};

Compiler.prototype.replaceFetch = function replaceFetch(stmt) {
  var self = this;
  return estraverse.replace(stmt, {
    enter: function(node, parent, notify) {
      if (node.type === 'CallExpression' &&
          node.callee.type === 'Identifier') {
        var name = node.callee.name;
        if (name !== '__$$fetch' && name !== '__$$set')
          return;

        if (name === '__$$fetch')
          self.assertEqual(node, node.arguments.length, 1, 'Invalid arg cnt');
        else
          self.assertEqual(node, node.arguments.length, 2, 'Invalid arg cnt');
        self.assertEqual(node.arguments[0], node.arguments[0].type, 'Literal');
        self.assertEqual(node.arguments[0],
                         typeof node.arguments[0].value,
                         'string');

        var id = self.fetchGlobal(node.arguments[0].value);

        if (name === '__$$fetch') {
          return id;
        } else {
          return {
            type: 'AssignmentExpression',
            operator: '=',
            left: id,
            right: node.arguments[1]
          };
        }
      }
    }
  });
};

Compiler.prototype.checkRef = function checkRef(expr) {
  var self = this;
  var res = { type: 'Identifier', name: '__$r' };

  function cantBeRef(value) {
    if (value.type === 'Literal' ||
        value.type === 'ObjectExpression' ||
        value.type === 'ArrayExpression') {
      return true;
    }

    if (value.type === 'ExpressionStatement')
      return cantBeRef(value.expression);

    if (value.type === 'BinaryExpression')
      return cantBeRef(value.left) && cantBeRef(value.right);

    if (value.type === 'CallExpression')
      return false;

    if (value.type === 'Identifier' && value.name !== 'undefined')
      return false;

    return true;
  }

  // Fastest case, just literal
  if (!expr || cantBeRef(expr))
    return { apply: [{ type: 'ReturnStatement', argument: expr }] };

  // Simple case
  // if (expr !== __$ref) return expr;
  if (expr.type === 'Identifier') {
    return {
      apply: [{
        type: 'IfStatement',
        test: {
          type: 'BinaryExpression',
          operator: '!==',
          left: expr,
          right: this.ref
        },
        consequent: {
          type: 'ReturnStatement',
          argument: expr
        },
        alternate: null
      }]
    };
  }

  // var __$r = expr
  // if (__$r !== __$ref) return __$r;
  return {
    apply: [{
      type: 'VariableDeclaration',
      kind: 'var',
      declarations: [{
        type: 'VariableDeclarator',
        id: res,
        init: expr
      }]
    }, {
      type: 'IfStatement',
      test: {
        type: 'BinaryExpression',
        operator: '!==',
        left: res,
        right: this.ref
      },
      consequent: {
        type: 'ReturnStatement',
        argument: res
      },
      alternate: null
    }]
  };
};

// Transform AST templates into readable form
Compiler.prototype.transformTemplates = function transformTemplates(template) {
  var expr = template.expression,
      predicates = expr.callee.arguments,
      body = expr.arguments[0] || { type: 'Identifier', name: 'undefined' };

  this.assert(body,
              body.type === 'FunctionExpression' || utils.isLiteral(body),
              'Only literal or function is allowed in template\'s body');

  function isConst(val) {
    return val.type === 'Literal';
  }

  // Translate all predicates to `a === c` form
  // and map as { expr, value } pair
  predicates = predicates.map(function(pred) {
    var expr,
        value;

    // template(function() { return 1; }) => template(1)
    if (pred.type === 'FunctionExpression') {
      if (pred.body.body.length === 1 &&
          pred.body.body[0].type === 'ReturnStatement') {
        pred = pred.body.body[0].argument;
      } else {
        pred = {
          type: 'CallExpression',
          callee: {
            type: 'MemberExpression',
            computed: false,
            object: pred,
            property: { type: 'Identifier', name: 'call' }
          },
          arguments: [ { type: 'ThisExpression'} ]
        };
      }
    }

    if (pred.type === 'BinaryExpression' && pred.operator === '===') {
      if (isConst(pred.right)) {
        // expr === const
        expr = pred.left;
        value = pred.right;
      } else {
        // const === expr
        expr = pred.right;
        value = pred.left;
      }
    } else {
      // expr <=> !(expr) === false
      expr = {
        type: 'UnaryExpression',
        prefix: true,
        operator: '!',
        argument: pred
      };
      value = { type: 'Literal', value: false };
    }

    return new Predicate(this, expr, value);
  }, this);

  return new Template(this, predicates, body);
};

Compiler.prototype.fetchGlobal = function fetchGlobal(name) {
  var parts = name.split('.');
  var parent = '$$' + parts[0];

  if (!this.globals.hasOwnProperty(parent) && parent !== '__proto__')
    this.globals[parent] = null;

  var ret = { type: 'Identifier', name: parent };
  for (var i = 1; i < parts.length; i++) {
    ret = {
      type: 'MemberExpression',
      computed: true,
      object: ret,
      property: { type: 'Literal', value: parts[i] }
    };
  }

  return ret;
};

Compiler.prototype.registerExtension = function registerExtension(name) {
  if (name !== '__proto__')
    this.extensions[name] = true;
};

Compiler.prototype.getRecordExtensions = function getRecordExtensions() {
  var ctx = { type: 'Identifier', name: 'ctx' };
  var body = [];

  Object.keys(this.extensions).forEach(function(name) {
    body.push({
      type: 'ExpressionStatement',
      expression: {
        type: 'AssignmentExpression',
        operator: '=',
        left: {
          type: 'MemberExpression',
          computed: true,
          object: ctx,
          property: { type: 'Literal', value: name }
        },

        // Old apply flags should have boolean value
        // New flags - number
        // Other - undefined
        right: /^__\$anflg/.test(name) ? { type: 'Literal', value: false } :
               /^__\$a\d+$/.test(name) ?
                  { type: 'Literal', value: 0 } :
                  { type: 'Identifier', name: 'undefined' }
      }
    });
  }, this);

  return {
    type: 'FunctionExpression',
    id: null,
    params: [ ctx ],
    defaults: [],
    rest: null,
    generator: false,
    expression: false,
    body: {
      type: 'BlockStatement',
      body: body
    }
  };
};

Compiler.prototype.getResetApplyNext = function getResetApplyNext() {
  var ctx = { type: 'Identifier', name: 'ctx' };
  var body = [];

  for (var i = 0; i < this.applyNext.count; i++) {
    body.push({
      type: 'ExpressionStatement',
      expression: {
        type: 'AssignmentExpression',
        operator: '=',
        left: {
          type: 'MemberExpression',
          computed: true,
          object: ctx,
          property: { type: 'Literal', value: '__$a' + i }
        },
        right: { type: 'Literal', value: 0 }
      }
    });
  }

  return {
    type: 'FunctionExpression',
    id: null,
    params: [ ctx ],
    defaults: [],
    rest: null,
    generator: false,
    expression: false,
    body: {
      type: 'BlockStatement',
      body: body
    }
  };
};
