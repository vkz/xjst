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
    if (__$ctx.elem === "div" && __$ctx.colour === "blue") {
        return '<div class="blue">' + __$ctx.body + "</div>";
    }
    var __$t = __$ctx.elem;
    if (__$t === "div") {
        return "<div>" + __$ctx.body + "</div>";
    } else if (__$t === "a") {
        return '<a href="' + __$ctx.href + '">' + __$ctx.text + "</a>";
    }
}

[].forEach(function(fn) {
    fn(exports, this);
}, {
    recordExtensions: function(ctx) {},
    resetApplyNext: function(ctx) {}
});