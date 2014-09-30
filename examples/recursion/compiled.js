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
    var __$t = __$ctx.type;
    if (__$t === "item") {
        return "<li>" + __$ctx.ctx.value + "</li>";
    } else if (__$t === "list") {
        var __$r = __$b2(__$ctx, __$ref);
        if (__$r !== __$ref) return __$r;
    }
}

[].forEach(function(fn) {
    fn(exports, this);
}, {
    recordExtensions: function(ctx) {
        ctx["type"] = undefined;
        ctx["ctx"] = undefined;
    },
    resetApplyNext: function(ctx) {}
});

function __$b2(__$ctx, __$ref) {
    var res__$0 = [ "<ul>" ];
    __$ctx.items.forEach(function(item) {
        res__$0.push(function __$lb__$1() {
            var __$r__$2;
            var __$l0__$3 = __$ctx.type;
            __$ctx.type = "item";
            var __$l1__$4 = __$ctx.ctx;
            __$ctx.ctx = item;
            __$r__$2 = applyc(__$ctx, __$ref);
            __$ctx.type = __$l0__$3;
            __$ctx.ctx = __$l1__$4;
            return __$r__$2;
        }());
    });
    res__$0.push("</ul>");
    return res__$0.join("");
}