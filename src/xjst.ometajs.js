{var XJSTParser=exports.XJSTParser=objectThatDelegatesTo(BSJSParser,{
"special":function(){var $elf=this,_fromIdx=this.input.idx,s;return this._or((function(){return (function(){s=(function(){switch(this._apply('anything')){case ":":return (function(){this._applyWithArgs("exactly",":");return "::"}).call(this);case "-":return (function(){this._applyWithArgs("exactly",">");return "->"}).call(this);default: throw fail}}).call(this);return [s,s]}).call(this)}),(function(){return BSJSParser._superApplyWithArgs(this,'special')}))},
"exprs":function(){var $elf=this,_fromIdx=this.input.idx,as,e;return this._or((function(){return (function(){this._applyWithArgs("token","(");as=this._applyWithArgs("listOf","expr",",");this._applyWithArgs("token",")");return as}).call(this)}),(function(){return (function(){e=this._apply("expr");return [e]}).call(this)}))},
"const":function(){var $elf=this,_fromIdx=this.input.idx,s,n;return this._or((function(){return (function(){s=this._applyWithArgs("token","string");return ["string",s]}).call(this)}),(function(){return (function(){n=this._applyWithArgs("token","number");return ["number",n]}).call(this)}))},
"tBody":function(){var $elf=this,_fromIdx=this.input.idx;return this._apply("exprs")},
"subMatch":function(){var $elf=this,_fromIdx=this.input.idx,e1,c,e2;return this._or((function(){return (function(){e1=this._apply("expr");this._applyWithArgs("token","::");c=this._apply("const");return [e1,c]}).call(this)}),(function(){return (function(){e2=this._apply("expr");return [e2,["get","true"]]}).call(this)}))},
"tMatch":function(){var $elf=this,_fromIdx=this.input.idx,ms,m;return this._or((function(){return (function(){this._applyWithArgs("token","[");ms=this._applyWithArgs("listOf","subMatch",",");this._applyWithArgs("token","]");return ms}).call(this)}),(function(){return (function(){m=this._apply("subMatch");return [m]}).call(this)}))},
"template":function(){var $elf=this,_fromIdx=this.input.idx,m,b;return (function(){m=this._apply("tMatch");this._applyWithArgs("token","->");b=this._apply("tBody");return [m,b]}).call(this)},
"topLevel":function(){var $elf=this,_fromIdx=this.input.idx,r;return (function(){r=this._many1((function(){return this._apply("template")}));this._many((function(){return this._applyWithArgs("exactly","\n")}));this._apply("end");return XJSTParser._identify(r)}).call(this)}});(XJSTParser["_identify"]=(function (templates){var predicates=new Identifier();templates.forEach((function (template){template[(0)].forEach((function (subMatch){subMatch.unshift(predicates.identify(subMatch[(0)]))}))}));return templates}));var XJSTBeautifier=exports.XJSTBeautifier=objectThatDelegatesTo(OMeta,{
"jsTrans":function(){var $elf=this,_fromIdx=this.input.idx,t,ans;return (function(){this._form((function(){return (function(){t=this._apply("anything");return ans=this._applyWithArgs("apply",t)}).call(this)}));return ans}).call(this)},
"number":function(){var $elf=this,_fromIdx=this.input.idx,n;return (function(){n=this._apply("anything");return n}).call(this)},
"string":function(){var $elf=this,_fromIdx=this.input.idx,s;return (function(){s=this._apply("anything");return s.toProgramString()}).call(this)},
"arr":function(){var $elf=this,_fromIdx=this.input.idx,xs;return (function(){xs=this._many((function(){return this._apply("jsTrans")}));return (("[" + xs.join(", ")) + "]")}).call(this)},
"unop":function(){var $elf=this,_fromIdx=this.input.idx,op,x;return (function(){op=this._apply("anything");x=this._apply("jsTrans");return (op + x)}).call(this)},
"getp":function(){var $elf=this,_fromIdx=this.input.idx,fd,x;return (function(){fd=this._apply("jsTrans");x=this._apply("jsTrans");return (((x + "[") + fd) + "]")}).call(this)},
"get":function(){var $elf=this,_fromIdx=this.input.idx,x;return (function(){x=this._apply("anything");return x}).call(this)},
"set":function(){var $elf=this,_fromIdx=this.input.idx,lhs,rhs;return (function(){lhs=this._apply("jsTrans");rhs=this._apply("jsTrans");return ((lhs + " = ") + rhs)}).call(this)},
"mset":function(){var $elf=this,_fromIdx=this.input.idx,lhs,op,rhs;return (function(){lhs=this._apply("jsTrans");op=this._apply("anything");rhs=this._apply("jsTrans");return ((((lhs + " ") + op) + "= ") + rhs)}).call(this)},
"binop":function(){var $elf=this,_fromIdx=this.input.idx,op,x,y;return (function(){op=this._apply("anything");x=this._apply("jsTrans");y=this._apply("jsTrans");return ((((x + " ") + op) + " ") + y)}).call(this)},
"preop":function(){var $elf=this,_fromIdx=this.input.idx,op,x;return (function(){op=this._apply("anything");x=this._apply("jsTrans");return (op + x)}).call(this)},
"postop":function(){var $elf=this,_fromIdx=this.input.idx,op,x;return (function(){op=this._apply("anything");x=this._apply("jsTrans");return (x + op)}).call(this)},
"subMatch":function(){var $elf=this,_fromIdx=this.input.idx,id,m,id,e,c;return this._or((function(){return (function(){this._form((function(){return (function(){id=this._apply("anything");m=this._apply("jsTrans");return this._form((function(){return (function(){this._applyWithArgs("exactly","get");return this._applyWithArgs("exactly","true")}).call(this)}))}).call(this)}));return m}).call(this)}),(function(){return (function(){this._form((function(){return (function(){id=this._apply("anything");e=this._apply("jsTrans");return c=this._apply("jsTrans")}).call(this)}));return ((e + " :: ") + c)}).call(this)}))},
"tMatch":function(){var $elf=this,_fromIdx=this.input.idx,m,ms;return this._or((function(){return (function(){this._form((function(){return m=this._apply("subMatch")}));return m}).call(this)}),(function(){return (function(){this._form((function(){return ms=this._many1((function(){return this._apply("subMatch")}))}));return (("[" + ms.join(", ")) + "]")}).call(this)}))},
"tBody":function(){var $elf=this,_fromIdx=this.input.idx,e,es;return this._or((function(){return (function(){this._form((function(){return e=this._apply("jsTrans")}));return ("\n    " + e)}).call(this)}),(function(){return (function(){this._form((function(){return es=this._many1((function(){return this._apply("jsTrans")}))}));return ((" (\n    " + es.join(",\n    ")) + " )")}).call(this)}))},
"template":function(){var $elf=this,_fromIdx=this.input.idx,m,b;return (function(){this._form((function(){return (function(){m=this._apply("tMatch");return b=this._apply("tBody")}).call(this)}));return ((m + " ->") + b)}).call(this)},
"topLevel":function(){var $elf=this,_fromIdx=this.input.idx,ts;return (function(){ts=this._many1((function(){return this._apply("template")}));return ts.join("\n\n")}).call(this)}});var XJSTCompiler=exports.XJSTCompiler=objectThatDelegatesTo(BSJSTranslator,{
"subMatch":function(){var $elf=this,_fromIdx=this.input.idx,id,m,id,e,c;return this._or((function(){return (function(){this._form((function(){return (function(){id=this._apply("anything");m=this._apply("trans");return this._form((function(){return (function(){this._applyWithArgs("exactly","get");return this._applyWithArgs("exactly","true")}).call(this)}))}).call(this)}));return m}).call(this)}),(function(){return (function(){this._form((function(){return (function(){id=this._apply("anything");e=this._apply("trans");return c=this._apply("trans")}).call(this)}));return ((e + " == ") + c)}).call(this)}))},
"tMatch":function(){var $elf=this,_fromIdx=this.input.idx,m,ms;return this._or((function(){return (function(){this._form((function(){return m=this._apply("subMatch")}));return m}).call(this)}),(function(){return (function(){this._form((function(){return ms=this._many1((function(){return this._apply("subMatch")}))}));return ms.join(" && ")}).call(this)}))},
"tBody":function(){var $elf=this,_fromIdx=this.input.idx,e,es;return this._or((function(){return (function(){this._form((function(){return e=this._apply("trans")}));return e}).call(this)}),(function(){return (function(){this._form((function(){return es=this._many1((function(){return this._apply("trans")}))}));return ((" (\n        " + es.join(",\n        ")) + " )")}).call(this)}))},
"template":function(){var $elf=this,_fromIdx=this.input.idx,m,b;return (function(){this._form((function(){return (function(){m=this._apply("tMatch");return b=this._apply("tBody")}).call(this)}));return (((("    if(" + m) + ") return ") + b) + ";")}).call(this)},
"topLevel":function(){var $elf=this,_fromIdx=this.input.idx,ts;return (function(){ts=this._many1((function(){return this._apply("template")}));return (("function(){\n" + ts.join("\n")) + "\n}")}).call(this)},
"topLevel2":function(){var $elf=this,_fromIdx=this.input.idx,ts;return (function(){ts=this._apply("anything");return XJSTCompiler.matchAll(ts.reverse(),"topLevel2")}).call(this)}})}
