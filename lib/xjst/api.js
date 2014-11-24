var xjst = require('../xjst');

exports.generate = function generate(code, options) {
  return xjst.compiler.create(options).generate(code);
};

exports.compile = function compile(code, options) {
  return xjst.compiler.create(options).compile(code);
};

exports.translate = function translate(ast, code, options) {
  if (typeof code !== 'string') {
    options = code;
    code = null;
  }
  var compiler = xjst.compiler.create(options);

  // var time = process.hrtime();

  var result = compiler.translate(ast, code);

  // var timeEnd = process.hrtime(time);
  // console.log('Translate time: ', (timeEnd[0] * 1e9 + timeEnd[1])/1e6);

  return result;
};
