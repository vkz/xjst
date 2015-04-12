var xjst = exports;

// Export utils
xjst.utils = require('./xjst/utils');

// Export generic compiler stuff
xjst.generic = require('./xjst/compiler/generic');

// Export base compiler stuff
xjst.compiler = require('./xjst/compiler');

// Export cli
xjst.run = require('./xjst/cli').run;

// Compatibility APIs
xjst.generate = require('./xjst/api').generate;
xjst.compile = require('./xjst/api').compile;
xjst.translate = require('./xjst/api').translate;
