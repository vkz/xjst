/* begin: ../../libs/bem-core/common.blocks/i-bem/i-bem.bemhtml */
/* global oninit */

oninit(function(exports, context) {

var undef,
    BEM_ = {},
    toString = Object.prototype.toString,
    slice = Array.prototype.slice,
    isArray = Array.isArray || function(obj) {
        return toString.call(obj) === '[object Array]';
    },
    SHORT_TAGS = { // хэш для быстрого определения, является ли тэг коротким
        area : 1, base : 1, br : 1, col : 1, command : 1, embed : 1, hr : 1, img : 1,
        input : 1, keygen : 1, link : 1, meta : 1, param : 1, source : 1, wbr : 1 };

(function(BEM, undefined) {

/**
 * Separator for modifiers and their values
 * @const
 * @type String
 */
var MOD_DELIM = '_',

/**
 * Separator between block names and a nested element
 * @const
 * @type String
 */
    ELEM_DELIM = '__',

/**
 * Pattern for acceptable names of elements and modifiers
 * @const
 * @type String
 */
    NAME_PATTERN = '[a-zA-Z0-9-]+';

function buildModPostfix(modName, modVal) {
    var res = MOD_DELIM + modName;
    if(modVal !== true) res += MOD_DELIM + modVal;
    return res;
}

function buildBlockClass(name, modName, modVal) {
    var res = name;
    if(modVal) res += buildModPostfix(modName, modVal);
    return res;
}

function buildElemClass(block, name, modName, modVal) {
    var res = buildBlockClass(block) + ELEM_DELIM + name;
    if(modVal) res += buildModPostfix(modName, modVal);
    return res;
}

BEM.INTERNAL = {

    NAME_PATTERN : NAME_PATTERN,

    MOD_DELIM : MOD_DELIM,
    ELEM_DELIM : ELEM_DELIM,

    buildModPostfix : buildModPostfix,

    /**
     * Builds the class for a block or element with a modifier
     * @private
     * @param {String} block Block name
     * @param {String} [elem] Element name
     * @param {String} [modName] Modifier name
     * @param {String} [modVal] Element name
     * @returns {String} Class string
     */
    buildClass : function(block, elem, modName, modVal) {
        var typeOfModName = typeof modName;
        if(typeOfModName === 'string' || typeOfModName === 'boolean') {
            var typeOfModVal = typeof modVal;
            if(typeOfModVal !== 'string' && typeOfModVal !== 'boolean') {
                modVal = modName;
                modName = elem;
                elem = undef;
            }
        } else if(typeOfModName !== 'undefined') {
            modName = undef;
        } else if(elem && typeof elem !== 'string') {
            elem = undef;
        }

        if(!(elem || modName)) { // simple case optimization
            return block;
        }

        return elem?
            buildElemClass(block, elem, modName, modVal) :
            buildBlockClass(block, modName, modVal);
    },

    /**
     * Builds modifier classes
     * @private
     * @param {String} block Block name
     * @param {String} [elem] Element name
     * @param {Object} [mods] Modifier name
     * @returns {String} Class string
     */
    buildModsClasses : function(block, elem, mods) {
        var res = '';

        if(mods) {
            var modName; // TODO: do something with OmetaJS and YUI Compressor
            for(modName in mods) {
                if(!mods.hasOwnProperty(modName)) continue;

                var modVal = mods[modName];
                if(!modVal && modVal !== 0) continue;
                typeof modVal !== 'boolean' && (modVal += '');

                res += ' ' + (elem?
                    buildElemClass(block, elem, modName, modVal) :
                    buildBlockClass(block, modName, modVal));
            }
        }

        return res;
    },

    /**
     * Builds full classes for a block or element with modifiers
     * @private
     * @param {String} block Block name
     * @param {String} [elem] Element name
     * @param {Object} [mods] Modifier name
     * @returns {String} Class string
     */
    buildClasses : function(block, elem, mods) {
        var res = '';

        res += elem?
            buildElemClass(block, elem) :
            buildBlockClass(block);

        res += this.buildModsClasses(block, elem, mods);

        return res;
    }

};

})(BEM_);

var buildEscape = (function() {
    var ts = { '"' : '&quot;', '&' : '&amp;', '<' : '&lt;', '>' : '&gt;' },
        f = function(t) { return ts[t] || t; };
    return function(r) {
        r = new RegExp(r, 'g');
        return function(s) { return ('' + s).replace(r, f); };
    };
})();

context.BEMContext = BEMContext;

function BEMContext(context, apply_) {
    this.ctx = typeof context === 'undefined'? '' : context;
    this.apply = apply_;
    this._str = '';

    // Compatibility stuff, just in case
    var _this = this;
    this._buf = {
        push : function() {
            var chunks = slice.call(arguments).join('');
            _this._str += chunks;
        },
        join : function() {
            return this._str;
        }
    };
    this._ = this;

    // Stub out fields that will be used later
    this._start = true;
    this._mode = '';
    this._listLength = 0;
    this._notNewList = false;
    this.position = 0;
    this.block = undef;
    this.elem = undef;
    this.mods = undef;
    this.elemMods = undef;
}

BEMContext.prototype.isArray = isArray;

BEMContext.prototype.isSimple = function isSimple(obj) {
    if(!obj || obj === true) return true;
    var t = typeof obj;
    return t === 'string' || t === 'number';
};

BEMContext.prototype.isShortTag = function isShortTag(t) {
    return SHORT_TAGS.hasOwnProperty(t);
};

BEMContext.prototype.extend = function extend(o1, o2) {
    if(!o1 || !o2) return o1 || o2;
    var res = {}, n;
    for(n in o1) o1.hasOwnProperty(n) && (res[n] = o1[n]);
    for(n in o2) o2.hasOwnProperty(n) && (res[n] = o2[n]);
    return res;
};

BEMContext.prototype.identify = (function() {
    var cnt = 0,
        id = (+new Date()),
        expando = '__' + id,
        get = function() { return 'uniq' + id + (++cnt); };
    return function(obj, onlyGet) {
        if(!obj) return get();
        if(onlyGet || obj[expando]) {
            return obj[expando];
        } else {
            return (obj[expando] = get());
        }
    };
})();

BEMContext.prototype.xmlEscape = buildEscape('[&<>]');
BEMContext.prototype.attrEscape = buildEscape('["&<>]');

BEMContext.prototype.BEM = BEM_;

BEMContext.prototype.isFirst = function isFirst() {
    return this.position === 1;
};

BEMContext.prototype.isLast = function isLast() {
    return this.position === this._listLength;
};

BEMContext.prototype.generateId = function generateId() {
    return this.identify(this.ctx);
};

// Wrap xjst's apply and export our own
var oldApply = exports.apply;
exports.apply = BEMContext.apply = function BEMContext_apply(context) {
    var ctx = new BEMContext(context || this, oldApply);
    ctx.apply();
    return ctx._str;
};

BEMContext.prototype.reapply = BEMContext.apply;

}); // oninit

match(this._mode === '')(

    match()(function() {
        this.ctx || (this.ctx = {});

        var vBlock = this.ctx.block,
            vElem = this.ctx.elem,
            block = this._currBlock || this.block;

        local('default', {
            block : vBlock || (vElem? block : undefined),
            _currBlock : vBlock || vElem? undefined : block,
            elem : vElem,
            mods : vBlock? this.ctx.mods || (this.ctx.mods = {}) : this.mods,
            elemMods : this.ctx.elemMods || {}
        })(function() {
            (this.block || this.elem)?
                (this.position = (this.position || 0) + 1) :
                this._listLength--;
            apply();
        });
    }),

    match(function() { return this.isArray(this.ctx); })(function() {
        var ctx = this.ctx,
            len = ctx.length,
            i = 0,
            prevPos = this.position,
            prevNotNewList = this._notNewList;

        if(prevNotNewList) {
            this._listLength += len - 1;
        } else {
            this.position = 0;
            this._listLength = len;
        }

        this._notNewList = true;

        while(i < len)
            apply({ ctx : ctx[i++] });

        prevNotNewList || (this.position = prevPos);
    }),

    match(!this.ctx)(function() {
        this._listLength--;
    }),

    match(function() { return this.isSimple(this.ctx); })(function() {
        this._listLength--;

        var ctx = this.ctx;
        if(ctx && ctx !== true || ctx === 0) {
            this._str += ctx + '';
        }
    }),

    // hack-check for Vow-promise
    match(this.ctx && this.ctx._vow)(function() {
        applyCtx(this.ctx._value);
    })

);

def()(function() {
    var BEM_INTERNAL = this.BEM.INTERNAL,
        ctx = this.ctx,
        isBEM,
        tag,
        res;

    local({ _str : '' })(function() {
        var vBlock = this.block;

        tag = apply('tag');
        typeof tag !== 'undefined' || (tag = ctx.tag);
        typeof tag !== 'undefined' || (tag = 'div');

        if(tag) {
            var jsParams, js;
            if(vBlock && ctx.js !== false) {
                js = apply('js');
                js = js? this.extend(ctx.js, js === true? {} : js) : ctx.js === true? {} : ctx.js;
                js && ((jsParams = {})[BEM_INTERNAL.buildClass(vBlock, ctx.elem)] = js);
            }

            this._str += '<' + tag;

            isBEM = apply('bem');
            typeof isBEM !== 'undefined' ||
                (isBEM = typeof ctx.bem !== 'undefined'? ctx.bem : ctx.block || ctx.elem);

            var cls = apply('cls');
            cls || (cls = ctx.cls);

            var addJSInitClass = ctx.block && jsParams && !ctx.elem;
            if(isBEM || cls) {
                this._str += ' class="';
                if(isBEM) {
                    this._str += BEM_INTERNAL.buildClasses(vBlock, ctx.elem, ctx.elemMods || ctx.mods);

                    var mix = apply('mix');
                    ctx.mix && (mix = mix? [].concat(mix, ctx.mix) : ctx.mix);

                    if(mix) {
                        var visited = {},
                            visitedKey = function(block, elem) {
                                return (block || '') + '__' + (elem || '');
                            };

                        visited[visitedKey(vBlock, this.elem)] = true;

                        // Transform mix to the single-item array if it's not array
                        this.isArray(mix) || (mix = [mix]);
                        for(var i = 0; i < mix.length; i++) {
                            var mixItem = mix[i],
                                hasItem = mixItem.block || mixItem.elem,
                                mixBlock = mixItem.block || mixItem._block || this.block,
                                mixElem = mixItem.elem || mixItem._elem || this.elem;

                            hasItem && (this._str += ' ');

                            this._str += BEM_INTERNAL[hasItem? 'buildClasses' : 'buildModsClasses'](
                                mixBlock,
                                mixItem.elem || mixItem._elem ||
                                    (mixItem.block? undefined : this.elem),
                                mixItem.elemMods || mixItem.mods);

                            if(mixItem.js) {
                                (jsParams ||
                                        (jsParams = {}))[BEM_INTERNAL.buildClass(mixBlock, mixItem.elem)] = mixItem.js === true?
                                    {} :
                                    mixItem.js;
                                addJSInitClass || (addJSInitClass = mixBlock && !mixItem.elem);
                            }

                            // Process nested mixes
                            if(hasItem && !visited[visitedKey(mixBlock, mixElem)]) {
                                visited[visitedKey(mixBlock, mixElem)] = true;
                                var nestedMix = apply('mix', {
                                    block : mixBlock,
                                    elem : mixElem
                                });

                                if(nestedMix) {
                                    for(var j = 0; j < nestedMix.length; j++) {
                                        var nestedItem = nestedMix[j];
                                        if(!nestedItem.block &&
                                                !nestedItem.elem ||
                                                !visited[visitedKey(
                                                    nestedItem.block,
                                                    nestedItem.elem
                                                )]) {
                                            nestedItem._block = mixBlock;
                                            nestedItem._elem = mixElem;
                                            mix.splice(i + 1, 0, nestedItem);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                cls && (this._str += isBEM? ' ' + cls : cls);
                this._str += addJSInitClass? ' i-bem"' : '"';
            }

            if(isBEM && jsParams) {
                this._str += ' data-bem="' +
                    this.attrEscape(JSON.stringify(jsParams)) +
                    '"';
            }

            var attrs = apply('attrs');
            // NOTE: maybe we need to make an array for quicker serialization
            attrs = this.extend(attrs, ctx.attrs);
            if(attrs) {
                var name, attr; // TODO: do something with OmetaJS and YUI Compressor
                for(name in attrs) {
                    attr = attrs[name];
                    if(typeof attr === 'undefined') continue;
                    this._str += ' ' + name + '="' +
                        this.attrEscape(this.isSimple(attr)?
                            attr :
                            this.reapply(attr)) +
                        '"';
                }
            }
        }

        if(this.isShortTag(tag)) {
            this._str += '/>';
        } else {
            tag && (this._str += '>');

            var content = apply('content');
            if(content || content === 0) {
                isBEM = vBlock || this.elem;
                apply('', {
                    _notNewList : false,
                    position : isBEM? 1 : this.position,
                    _listLength : isBEM? 1 : this._listLength,
                    ctx : content
                });
            }

            tag && (this._str += '</' + tag + '>');
        }

        // If the buffer was replaced, pretend that we're pushing to the buffer
        res = this._str;
    });

    this._buf.push(res);
});

tag()(undefined);
attrs()(undefined);
cls()(undefined);
js()(undefined);
bem()(undefined);
mix()(undefined);
content()(function() { return this.ctx.content; });

/* end: ../../libs/bem-core/common.blocks/i-bem/i-bem.bemhtml */
/* begin: ../../libs/bem-core/common.blocks/page/page.bemhtml */
block('page')(

    def().match(function() { return !this._defPageApplied; })(function() {
        this._defPageApplied = true;

        var ctx = this.ctx;
        applyCtx([
            ctx.doctype || '<!DOCTYPE html>',
            {
                tag : 'html',
                cls : 'ua_js_no',
                content : [
                    {
                        elem : 'head',
                        content : [
                            { tag : 'meta', attrs : { charset : 'utf-8' } },
                            { tag : 'title', content : ctx.title },
                            { block : 'ua' },
                            ctx.head,
                            ctx.styles,
                            ctx.favicon? { elem : 'favicon', url : ctx.favicon } : ''
                        ]
                    },
                    ctx
                ]
            }
        ]);

        this._defPageApplied = false;
    }),

    tag()('body'),

    content()(function() {
        return [
            applyNext(),
            this.ctx.scripts
        ];
    }),

    elem('head')(
        bem()(false),
        tag()('head')
    ),

    elem('meta')(
        bem()(false),
        tag()('meta')
    ),

    elem('link')(
        bem()(false),
        tag()('link')
    ),

    elem('favicon')(
        bem()(false),
        tag()('link'),
        attrs()(function() { return { rel : 'shortcut icon', href : this.ctx.url }; })
    )

);

/* end: ../../libs/bem-core/common.blocks/page/page.bemhtml */
/* begin: ../../libs/bem-core/touch.blocks/page/page.bemhtml */
block('page')(
    elem('head').content()(function() {
        return [
            applyNext(),
            {
                elem : 'meta',
                attrs : {
                    name : 'viewport',
                    content : 'width=device-width,' +
                        (this.ctx.zoom?
                            'initial-scale=1' :
                            'maximum-scale=1,initial-scale=1,user-scalable=0')
                }
            },
            { elem : 'meta', attrs : { name : 'format-detection', content : 'telephone=no' } },
            { elem : 'link', attrs : { name : 'apple-mobile-web-app-capable', content : 'yes' } }
        ];
    }),

    mix()(function() {
        var mix = applyNext(),
            uaMix = [{ block : 'ua', js : true }];

        return mix? uaMix.concat(mix) : uaMix;
    })
);

/* end: ../../libs/bem-core/touch.blocks/page/page.bemhtml */
/* begin: ../../libs/bem-core/common.blocks/ua/ua.bemhtml */
block('ua')(
    tag()('script'),
    bem()(false),
    content()([
        '(function(e,c){',
            'e[c]=e[c].replace(/(ua_js_)no/g,"$1yes");',
        '})(document.documentElement,"className");'
    ])
);

/* end: ../../libs/bem-core/common.blocks/ua/ua.bemhtml */
/* begin: ../../libs/bem-core/touch.blocks/ua/ua.bemhtml */
block('ua').js()(true);

/* end: ../../libs/bem-core/touch.blocks/ua/ua.bemhtml */
/* begin: ../../libs/bem-core/common.blocks/page/__css/page__css.bemhtml */
block('page').elem('css')(
    bem()(false),
    tag()('style'),
    match(function() { return this.ctx.url; })(
        tag()('link'),
        attrs()(function() { return { rel : 'stylesheet', href : this.ctx.url }; })
    )
);

/* end: ../../libs/bem-core/common.blocks/page/__css/page__css.bemhtml */
/* begin: ../../libs/bem-core/common.blocks/page/__js/page__js.bemhtml */
block('page').elem('js')(
    bem()(false),
    tag()('script'),
    attrs().match(function() { return this.ctx.url; })(function() {
        return { src : this.ctx.url };
    })
);

/* end: ../../libs/bem-core/common.blocks/page/__js/page__js.bemhtml */
/* begin: ../../libs/bem-core/common.blocks/ua/__svg/ua__svg.bemhtml */
block('ua').content()(function() {
    return [
        applyNext(),
        '(function(d,n){',
            'd.documentElement.className+=',
            '" ua_svg_"+(d[n]&&d[n]("http://www.w3.org/2000/svg","svg").createSVGRect?"yes":"no");',
        '})(document,"createElementNS");'
    ];
});

/* end: ../../libs/bem-core/common.blocks/ua/__svg/ua__svg.bemhtml */
/* begin: ../../test.blocks/table/table.bemhtml */
block('table')(
    tag()('table'),
    elem('row').tag()('tr'),
    elem('title').tag()('th'),
    elem('cell').tag()('td')
);

/* end: ../../test.blocks/table/table.bemhtml */
/* begin: ../../common.blocks/image/image.bemhtml */
block('image')(
    tag()('img'),
    attrs()(function() {
        var ctx = this.ctx;
        return {
            src : ctx.url,
            width : ctx.width,
            height : ctx.height,
            alt : ctx.alt,
            title : ctx.title
        };
    })
);

/* end: ../../common.blocks/image/image.bemhtml */
/* begin: ../../common.blocks/icon/icon.bemhtml */
block('icon')(
    tag()('i'),
    attrs().match(function() { return this.ctx.url; })(function() {
        return { style : 'background-image:url(' + this.ctx.url + ')' };
    })
);

/* end: ../../common.blocks/icon/icon.bemhtml */
/* begin: ../../common.blocks/link/link.bemhtml */
block('link')(
    def()(function() {
        var ctx = this.ctx;
        typeof ctx.url === 'object' && // url could contain bemjson
            (ctx.url = this.reapply(ctx.url));
        applyNext();
    }),

    tag()('a'),

    js()(true),

    // NOTE: mix below is to satisfy interface of `control`
    mix()([{ elem : 'control' }]),

    attrs()(function() {
        var ctx = this.ctx,
            attrs = {},
            tabIndex;

        if(!this.mods.disabled) {
            if(ctx.url) {
                attrs.href = ctx.url;
                tabIndex = ctx.tabIndex;
            } else {
                tabIndex = ctx.tabIndex || 0;
            }
        }

        typeof tabIndex === 'undefined' || (attrs.tabindex = tabIndex);

        ctx.title && (attrs.title = ctx.title);
        ctx.target && (attrs.target = ctx.target);

        return attrs;
    }),

    mod('disabled', true)
        .js()(function() {
            return this.extend(applyNext(), { url : this.ctx.url });
        })
);

/* end: ../../common.blocks/link/link.bemhtml */
/* begin: ../../common.blocks/link/_pseudo/link_pseudo.bemhtml */
block('link').mod('pseudo', true)(
    tag().match(function() { return !this.ctx.url; })('span')
);

/* end: ../../common.blocks/link/_pseudo/link_pseudo.bemhtml */
/* begin: ../../libs/bem-core/common.blocks/i-bem/__i18n/_dummy/i-bem__i18n_dummy_yes.bemhtml */
/*global oninit, BEM, exports */

oninit(function() {
    (function(global, bem_) {

        if(bem_.I18N) {
            return;
        }

        /** @global points to global context */
        global.BEM = bem_;

        /**
        * `BEM.I18N` API stub
        */
        var i18n = global.BEM.I18N = function(keyset, key) {
            return key;
        };

        i18n.keyset = function() { return i18n; };
        i18n.key = function(key) { return key; };
        i18n.lang = function() { return; };

    })(this, typeof BEM === 'undefined' ? {} : BEM);
});

/* end: ../../libs/bem-core/common.blocks/i-bem/__i18n/_dummy/i-bem__i18n_dummy_yes.bemhtml */
/* begin: ../../libs/bem-core/common.blocks/i-bem/__i18n/i-bem__i18n.bemhtml */
/* global exports, BEM */

block('i-bem').elem('i18n').def()(function() {
    if(!this.ctx) return '';

    var ctx = this.ctx,
        keyset = ctx.keyset,
        key = ctx.key,
        params = ctx.params || {};

    if(!(keyset || key))
        return '';

    /**
     * Consider `content` is a reserved param that contains
     * valid bemjson data
     */
    if(typeof ctx.content === 'undefined' || ctx.content !== null) {
        params.content = exports.apply(ctx.content);
    }

    this._buf.push(BEM.I18N(keyset, key, params));
});

/* end: ../../libs/bem-core/common.blocks/i-bem/__i18n/i-bem__i18n.bemhtml */
/* begin: ../../common.blocks/attach/attach.bemhtml */
block('attach')(
    def()(function() { applyNext({ _attach : this.ctx }); }),

    tag()('span'),

    js()(true),

    content()(
        function() {
            var ctx = this.ctx,
                button = ctx.button;

            this.isSimple(button) && (button = {
                block : 'button',
                tag : 'span',
                text : button
            });

            var attachMods = this.mods,
                buttonMods = button.mods || (button.mods = {});
            ['size', 'theme', 'disabled', 'focused'].forEach(function(mod) {
                buttonMods[mod] || (buttonMods[mod] = attachMods[mod]);
            });

            return [
                button,
                {
                    elem : 'no-file',
                    content : this.ctx.noFileText
                }
            ];
        },
        match(function() { return typeof this.ctx.content !== 'undefined'; })(function() {
            return this.ctx.content;
        })
    )
);

/* end: ../../common.blocks/attach/attach.bemhtml */
/* begin: ../../common.blocks/button/button.bemhtml */
block('button')(
    def()(function() {
        applyNext({ _button : this.ctx });
    }),

    tag()(function() {
        return this.ctx.tag || 'button';
    }),

    js()(true),

    // NOTE: mix below is to satisfy interface of `control`
    mix()({ elem : 'control' }),

    attrs()(
        // Common attributes
        function() {
            var ctx = this.ctx;

            return {
                role : 'button',
                tabindex : ctx.tabIndex,
                id : ctx.id,
                title : ctx.title
            };
        },

        // Attributes for button variant
        match(function() { return !this.mods.type || this.mods.type === 'submit'; })(function() {
            var ctx = this.ctx,
                attrs = {
                    type : this.mods.type || 'button',
                    name : ctx.name,
                    value : ctx.val
                };

            this.mods.disabled && (attrs.disabled = 'disabled');

            return this.extend(applyNext(), attrs);
        })
    ),

    content()(
        function() {
            var ctx = this.ctx,
                content = [ctx.icon];
            // NOTE: wasn't moved to separate template for optimization
            'text' in ctx && content.push({ elem : 'text', content : ctx.text });
            return content;
        },
        match(function() { return typeof this.ctx.content !== 'undefined'; })(function() {
            return this.ctx.content;
        })
    )
);

/* end: ../../common.blocks/button/button.bemhtml */
/* begin: ../../common.blocks/button/__text/button__text.bemhtml */
block('button').elem('text')(
    tag()('span'),
    match(function() { return typeof this._button.textMaxWidth === 'number'; }).attrs()(function() {
        return { style : 'max-width:' + this._button.textMaxWidth + 'px' };
    })
);

/* end: ../../common.blocks/button/__text/button__text.bemhtml */
/* begin: ../../common.blocks/button/_focused/button_focused.bemhtml */
block('button').mod('focused', true).js()(function() {
    return this.extend(applyNext(), { live : false });
});

/* end: ../../common.blocks/button/_focused/button_focused.bemhtml */
/* begin: ../../common.blocks/attach/__button/attach__button.bemhtml */
block('button')
    .match(this._attach)(
        tag()('span'),
        content()(function() {
            return [
                { block : 'attach', elem : 'control' },
                applyNext()
            ];
        })
    );

/* end: ../../common.blocks/attach/__button/attach__button.bemhtml */
/* begin: ../../common.blocks/attach/__control/attach__control.bemhtml */
block('attach').elem('control')(

    tag()('input'),

    attrs()(function() {
        var attrs = { type : 'file' },
            attach = this._attach;

        // в js генерим html для attach__control без самого attach
        if(attach) {
            attrs.name = attach.name;
            attach.mods && attach.mods.disabled && (attrs.disabled = 'disabled');
            attach.tabIndex && (attrs.tabindex = attach.tabIndex);
        }

        return attrs;
    })

);

/* end: ../../common.blocks/attach/__control/attach__control.bemhtml */
/* begin: ../../common.blocks/attach/__no-file/attach__no-file.bemhtml */
block('attach').elem('no-file').tag()('span');

/* end: ../../common.blocks/attach/__no-file/attach__no-file.bemhtml */
/* begin: ../../common.blocks/attach/__file/attach__file.bemhtml */
block('attach').elem('file').tag()('span');

/* end: ../../common.blocks/attach/__file/attach__file.bemhtml */
/* begin: ../../common.blocks/attach/__text/attach__text.bemhtml */
block('attach').elem('text').tag()('span');

/* end: ../../common.blocks/attach/__text/attach__text.bemhtml */
/* begin: ../../common.blocks/attach/__clear/attach__clear.bemhtml */
block('attach').elem('clear').tag()('i');

/* end: ../../common.blocks/attach/__clear/attach__clear.bemhtml */
/* begin: ../../common.blocks/input/input.bemhtml */
block('input')(
    tag()('span'),
    js()(true),
    def()(function() {
        applyNext({ _input : this.ctx });
    }),
    content()(
        function() {
            return { elem : 'box', content : { elem : 'control' } };
        },
        match(function() { return typeof this.ctx.content !== 'undefined'; })(function() {
            return this.ctx.content;
        })
    )
);

/* end: ../../common.blocks/input/input.bemhtml */
/* begin: ../../common.blocks/input/__box/input__box.bemhtml */
block('input').elem('box').tag()('span');

/* end: ../../common.blocks/input/__box/input__box.bemhtml */
/* begin: ../../common.blocks/input/__control/input__control.bemhtml */
block('input').elem('control')(

    tag()('input'),

    attrs()(function() {
        var input = this._input,
            attrs = {
                id : input.id,
                name : input.name,
                value : input.val,
                maxlength : input.maxLength,
                tabindex : input.tabIndex,
                placeholder : input.placeholder
            };

        input.autocomplete === false && (attrs.autocomplete = 'off');
        this.mods.disabled && (attrs.disabled = 'disabled');

        return attrs;
    })
);

/* end: ../../common.blocks/input/__control/input__control.bemhtml */
/* begin: ../../touch.blocks/input/__control/input__control.bemhtml */
block('input').elem('control')(

    attrs()(function() {
        return this.extend({
            autocomplete : 'off',
            autocorrect : 'off',
            autocapitalize : 'off',
            spellcheck : 'false'
        }, applyNext());
    })

);

/* end: ../../touch.blocks/input/__control/input__control.bemhtml */
/* begin: ../../common.blocks/input/_has-clear/input_has-clear.bemhtml */
block('input').mod('has-clear', true).elem('box')
    .content()(function() {
        return [this.ctx.content, { elem : 'clear' }];
    });

/* end: ../../common.blocks/input/_has-clear/input_has-clear.bemhtml */
/* begin: ../../common.blocks/input/__clear/input__clear.bemhtml */
block('input').elem('clear').tag()('i');

/* end: ../../common.blocks/input/__clear/input__clear.bemhtml */
/* begin: ../../common.blocks/button/_type/button_type_link.bemhtml */
block('button').mod('type', 'link')(
    tag()('a'),

    attrs()(function() {
        var ctx = this.ctx,
            attrs = {};

        ctx.target && (attrs.target = ctx.target);
        this.mods.disabled?
            attrs['aria-disabled'] = true :
            attrs.href = ctx.url;

        return this.extend(applyNext(), attrs);
    }),

    mod('disabled', true)
        .js()(function() {
            return this.extend(applyNext(), { url : this.ctx.url });
        })
);

/* end: ../../common.blocks/button/_type/button_type_link.bemhtml */
/* begin: ../../common.blocks/checkbox/checkbox.bemhtml */
block('checkbox')(
    tag()('label'),

    js()(true),

    content()(function() {
        var ctx = this.ctx,
            mods = this.mods;

        return [
            {
                elem : 'box',
                content : {
                    elem : 'control',
                    checked : mods.checked,
                    disabled : mods.disabled,
                    name : ctx.name,
                    val : ctx.val
                }
            },
            ctx.text
        ];
    })
);

/* end: ../../common.blocks/checkbox/checkbox.bemhtml */
/* begin: ../../common.blocks/checkbox/__box/checkbox__box.bemhtml */
block('checkbox').elem('box').tag()('span');

/* end: ../../common.blocks/checkbox/__box/checkbox__box.bemhtml */
/* begin: ../../common.blocks/checkbox/__control/checkbox__control.bemhtml */
block('checkbox').elem('control')(
    tag()('input'),

    attrs()(function() {
        // NOTE: don't remove autocomplete attribute, otherwise js and DOM may be desynced
        var attrs = { type : 'checkbox', autocomplete : 'off' },
            ctx = this.ctx;

        attrs.name = ctx.name;
        attrs.value = ctx.val;
        ctx.checked && (attrs.checked = 'checked');
        ctx.disabled && (attrs.disabled = 'disabled');

        return attrs;
    })
);

/* end: ../../common.blocks/checkbox/__control/checkbox__control.bemhtml */
/* begin: ../../common.blocks/checkbox/_type/checkbox_type_button.bemhtml */
block('checkbox').mod('type', 'button')(
    content()(function() {
        var ctx = this.ctx,
            mods = this.mods;

        return [{
            block : 'button',
            mods : {
                togglable : 'check',
                checked : mods.checked,
                disabled : mods.disabled,
                theme : mods.theme,
                size : mods.size
            },
            title : ctx.title,
            content : [
                ctx.icon,
                typeof ctx.text !== 'undefined'?
                    { elem : 'text', content : ctx.text } :
                    ''
            ]
        }, {
            block : 'checkbox',
            elem : 'control',
            checked : mods.checked,
            disabled : mods.disabled,
            name : ctx.name,
            val : ctx.val
        }];
    })
);

/* end: ../../common.blocks/checkbox/_type/checkbox_type_button.bemhtml */
/* begin: ../../common.blocks/radio-group/radio-group.bemhtml */
block('radio-group')(
    tag()('span'),

    js()(true),

    mix()([{ block : 'control-group' }]),

    content()(function() {
        var mods = this.mods,
            ctx = this.ctx;

        return (ctx.options || []).map(function(option, i) {
            return [
                !!i && !mods.type && { tag : 'br' },
                {
                    block : 'radio',
                    mods : {
                        type : mods.type,
                        mode : mods.mode,
                        theme : mods.theme,
                        size : mods.size,
                        checked : option.checked,
                        disabled : option.disabled || mods.disabled
                    },
                    name : ctx.name,
                    val : option.val,
                    text : option.text,
                    title : option.title,
                    icon : option.icon
                }
            ];
        });
    })
);

/* end: ../../common.blocks/radio-group/radio-group.bemhtml */
/* begin: ../../common.blocks/radio/radio.bemhtml */
block('radio')(
    tag()('label'),
    js()(true),
    content()(function() {
        var ctx = this.ctx;
        return [
            {
                elem : 'box',
                content : {
                    elem : 'control',
                    checked : this.mods.checked,
                    disabled : this.mods.disabled,
                    name : ctx.name,
                    val : ctx.val
                }
            },
            ctx.text
        ];
    })
);

/* end: ../../common.blocks/radio/radio.bemhtml */
/* begin: ../../common.blocks/radio/__box/radio__box.bemhtml */
block('radio').elem('box').tag()('span');

/* end: ../../common.blocks/radio/__box/radio__box.bemhtml */
/* begin: ../../common.blocks/radio/__control/radio__control.bemhtml */
block('radio').elem('control')(
    tag()('input'),

    attrs()(function() {
        // NOTE: don't remove autocomplete attribute, otherwise js and DOM may be desynced
        var ctx = this.ctx,
            attrs = {
                type : 'radio',
                autocomplete : 'off',
                name : ctx.name,
                value : ctx.val
            };

        ctx.checked && (attrs.checked = 'checked');
        ctx.disabled && (attrs.disabled = 'disabled');

        return attrs;
    })
);

/* end: ../../common.blocks/radio/__control/radio__control.bemhtml */
/* begin: ../../common.blocks/radio/_type/radio_type_button.bemhtml */
block('radio').mod('type', 'button')(
    content()(function() {
        var ctx = this.ctx,
            mods = this.mods;

        return [{
            block : 'button',
            mods : {
                togglable : mods.mode === 'radio-check'?
                    'check' :
                    'radio',
                checked : mods.checked,
                disabled : mods.disabled,
                theme : mods.theme,
                size : mods.size
            },
            title : ctx.title,
            content : [
                ctx.icon,
                typeof ctx.text !== 'undefined'?
                    { elem : 'text', content : ctx.text } :
                    ''
            ]
        }, {
            block : 'radio',
            elem : 'control',
            checked : mods.checked,
            disabled : mods.disabled,
            name : ctx.name,
            val : ctx.val
        }];
    })
);

/* end: ../../common.blocks/radio/_type/radio_type_button.bemhtml */
/* begin: ../../common.blocks/spin/spin.bemhtml */
block('spin')(
    tag()('span')
);

/* end: ../../common.blocks/spin/spin.bemhtml */
/* begin: ../../common.blocks/popup/popup.bemhtml */
block('popup')(
    js()(function() {
        var ctx = this.ctx;
        return {
            mainOffset : ctx.mainOffset,
            secondaryOffset : ctx.secondaryOffset,
            viewportOffset : ctx.viewportOffset,
            directions : ctx.directions,
            zIndexGroupLevel : ctx.zIndexGroupLevel
        };
    })
);

/* end: ../../common.blocks/popup/popup.bemhtml */
/* begin: ../../common.blocks/dropdown/dropdown.bemhtml */
block('dropdown')(
    js()(true),

    content()(function() {
        var popup = this.ctx.popup;

        if(this.isSimple(popup) || popup.block !== 'popup') {
            popup = { block : 'popup', content : popup };
        }

        var popupMods = popup.mods || (popup.mods = {});
        popupMods.theme || (popupMods.theme = this.mods.theme);
        popupMods.hasOwnProperty('autoclosable') || (popupMods.autoclosable = true);

        popupMods.target = 'anchor';

        return [
            { elem : 'switcher', content : this.ctx.switcher },
            popup
        ];
    })
);

/* end: ../../common.blocks/dropdown/dropdown.bemhtml */
/* begin: ../../common.blocks/dropdown/__switcher/dropdown__switcher.bemhtml */
block('dropdown').elem('switcher').tag()(false);

/* end: ../../common.blocks/dropdown/__switcher/dropdown__switcher.bemhtml */
/* begin: ../../common.blocks/dropdown/_switcher/dropdown_switcher_button.bemhtml */
block('dropdown').mod('switcher', 'button').elem('switcher').content()(function() {
    var content = this.ctx.content;
    if(this.isArray(content)) return content;

    var res = this.isSimple(content)?
        { block : 'button', text : content } :
        content;

    if(res.block === 'button') {
        var resMods = res.mods || (res.mods = {}),
            dropdownMods = this.mods;
        resMods.size || (resMods.size = dropdownMods.size);
        resMods.theme || (resMods.theme = dropdownMods.theme);
        resMods.disabled = dropdownMods.disabled;
    }

    return res;
});

/* end: ../../common.blocks/dropdown/_switcher/dropdown_switcher_button.bemhtml */
/* begin: ../../common.blocks/dropdown/_switcher/dropdown_switcher_link.bemhtml */
block('dropdown').mod('switcher', 'link').elem('switcher').content()(function() {
    var content = this.ctx.content;
    if(this.isArray(content)) return content;

    var res = this.isSimple(content)?
        { block : 'link', mods : { pseudo : true }, content : content } :
        content;

    if(res.block === 'link') {
        var resMods = res.mods || (res.mods = {}),
            dropdownMods = this.mods;
        resMods.theme || (resMods.theme = dropdownMods.theme);
        resMods.disabled = dropdownMods.disabled;
    }

    return res;
});

/* end: ../../common.blocks/dropdown/_switcher/dropdown_switcher_link.bemhtml */
/* begin: ../../common.blocks/menu/menu.bemhtml */
block('menu')(
    def()(function() {
        applyNext({
            _menuMods : {
                theme : this.mods.theme,
                disabled : this.mods.disabled
            }
        });
        delete this._menuTheme;
    }),
    attrs()(function() {
        var attrs = { role : 'menu' };
        this.mods.disabled || (attrs.tabindex = 0);
        return attrs;
    }),
    js()(true),
    mix()([{ elem : 'control' }])
);

/* end: ../../common.blocks/menu/menu.bemhtml */
/* begin: ../../common.blocks/menu-item/menu-item.bemhtml */
block('menu-item')(
    js()(function() {
        return { val : this.ctx.val };
    }),
    attrs()({ role : 'menuitem' }),
    match(this._menuMods).def()(function() {
        var mods = this.mods;
        mods.theme = mods.theme || this._menuMods.theme;
        mods.disabled = mods.disabled || this._menuMods.disabled;
        applyNext();
    })
);

/* end: ../../common.blocks/menu-item/menu-item.bemhtml */
/* begin: ../../common.blocks/menu/_focused/menu_focused.bemhtml */
block('menu').mod('focused', true).js()(function() {
    return this.extend(applyNext(), { live : false });
});

/* end: ../../common.blocks/menu/_focused/menu_focused.bemhtml */
/* begin: ../../common.blocks/menu/__group/menu__group.bemhtml */
block('menu').elem('group')(
    attrs()({ role : 'group' }),
    match(function() { return typeof this.ctx.title !== 'undefined'; })(
        attrs()(function() {
            return this.extend(applyNext(), { 'aria-label' : this.ctx.title });
        }),
        content()(function() {
            return [
                { elem : 'group-title', content : this.ctx.title },
                applyNext()
            ];
        })
    )
);

/* end: ../../common.blocks/menu/__group/menu__group.bemhtml */
/* begin: ../../common.blocks/menu/__group-title/menu__group-title.bemhtml */
block('menu').elem('group-title').attrs()({ role : 'presentation' });

/* end: ../../common.blocks/menu/__group-title/menu__group-title.bemhtml */