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
    var __$t = __$ctx.node;
    if (__$t === "right") {
        return [ "right", function __$lb__$0() {
            var __$r__$1;
            var __$l0__$2 = __$ctx.node;
            __$ctx.node = null;
            var __$l1__$3 = __$ctx.tree;
            __$ctx.tree = __$ctx.tree;
            __$r__$1 = applyc(__$ctx, __$ref);
            __$ctx.node = __$l0__$2;
            __$ctx.tree = __$l1__$3;
            return __$r__$1;
        }() ];
    } else if (__$t === "left") {
        return [ "left", function __$lb__$4() {
            var __$r__$5;
            var __$l0__$6 = __$ctx.node;
            __$ctx.node = null;
            var __$l1__$7 = __$ctx.tree;
            __$ctx.tree = __$ctx.tree;
            __$r__$5 = applyc(__$ctx, __$ref);
            __$ctx.node = __$l0__$6;
            __$ctx.tree = __$l1__$7;
            return __$r__$5;
        }() ];
    }
    if (Array.isArray(__$ctx.tree)) {
        return [ function __$lb__$8() {
            var __$r__$9;
            var __$l0__$10 = __$ctx.node;
            __$ctx.node = "left";
            var __$l1__$11 = __$ctx.tree;
            __$ctx.tree = __$ctx.tree[0];
            __$r__$9 = applyc(__$ctx, __$ref);
            __$ctx.node = __$l0__$10;
            __$ctx.tree = __$l1__$11;
            return __$r__$9;
        }(), function __$lb__$8() {
            var __$r__$12;
            var __$l2__$13 = __$ctx.node;
            __$ctx.node = "right";
            var __$l3__$14 = __$ctx.tree;
            __$ctx.tree = __$ctx.tree[1];
            __$r__$12 = applyc(__$ctx, __$ref);
            __$ctx.node = __$l2__$13;
            __$ctx.tree = __$l3__$14;
            return __$r__$12;
        }() ];
    }
    if (true) {
        return __$ctx.tree;
    }
}

[].forEach(function(fn) {
    fn(exports, this);
}, {
    recordExtensions: function(ctx) {
        ctx["node"] = undefined;
        ctx["tree"] = undefined;
    },
    resetApplyNext: function(ctx) {}
});