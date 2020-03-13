import { bezier } from '../animation/bezier';

let _tweenID = 0;

let TweenAction = cc.Class({
    name: 'cc.TweenAction',
    extends: cc.ActionInterval,

    ctor (duration, props, opts) {
        this._opts = opts = opts || Object.create(null);
        this._props = Object.create(null);

        // global easing or progress used for this action
        opts.progress = opts.progress || this.progress;
        if (opts.easing && typeof opts.easing === 'string') {
            let easingName = opts.easing;
            opts.easing = cc.easing[easingName];
            !opts.easing && cc.warnID(1031, easingName);
        }

        let relative = this._opts.relative;

        for (let name in props) {
            let value = props[name];

            // property may have custom easing or progress function
            let easing, progress;
            if (value.value !== undefined && (value.easing || value.progress)) {
                if (typeof value.easing === 'string') {
                    easing = cc.easing[value.easing];
                    !easing && cc.warnID(1031, value.easing);
                }
                else {
                    easing = value.easing;
                }
                progress = value.progress;
                value = value.value;
            }

            let isNumber = typeof value === 'number';
            if (!isNumber && (!value.lerp || (relative && !value.add && !value.mul) || !value.clone)) {
                cc.warn(`Can not animate ${name} property, because it do not have [lerp, (add|mul), clone] function.`);
                continue;
            }

            let prop = Object.create(null);
            prop.value = value;
            prop.easing = easing;
            prop.progress = progress;
            this._props[name] = prop;
        }

        this._originProps = props;
        this.initWithDuration(duration);
    },

    clone () {
        var action = new TweenAction(this._duration, this._originProps, this._opts);
        this._cloneDecoration(action);
        return action;
    },

    startWithTarget (target) {
        cc.ActionInterval.prototype.startWithTarget.call(this, target);

        let relative = !!this._opts.relative;
        let props = this._props;
        for (let name in props) {
            let value = target[name];
            let prop = props[name];

            if (typeof value === 'number') {
                prop.start = value;
                prop.current = value;
                prop.end = relative ? value + prop.value : prop.value;
            }
            else {
                prop.start = value.clone();
                prop.current = value.clone();
                prop.end = relative ? (value.add || value.mul).call(value, prop.value) : prop.value;
            }
        }
    },

    update (t) {
        let opts = this._opts;
        let easingTime = t;
        if (opts.easing) easingTime = opts.easing(t);

        let target = this.target;
        if (!target) return;

        let props = this._props;
        let progress = this._opts.progress;
        for (let name in props) {
            let prop = props[name];
            let time = prop.easing ? prop.easing(t) : easingTime;
            let current = prop.current = (prop.progress || progress)(prop.start, prop.end, prop.current, time);
            target[name] = current;
        }
    },

    progress (start, end, current, t) {
        if (typeof start === 'number') {
            current = start + (end - start) * t;
        }
        else {
            start.lerp(end, t, current);
        }
        return current;
    }
});

let SetAction = cc.Class({
    name: 'cc.SetAction',
    extends: cc.ActionInstant,

    ctor (props) {
        this._props = {};
        props !== undefined && this.init(props);
    },

    init (props) {
        for (let name in props) {
            this._props[name] = props[name];
        }
        return true;
    },

    update () {
        let props = this._props;
        let target = this.target;
        for (let name in props) {
            target[name] = props[name];
        }
    },

    clone () {
        var action = new SetAction();
        action.init(this._props);
        return action;
    }
});



/**
 * !#en
 * Tween provide a simple and flexible way to create action.
 * Tween's api is more flexible than cc.Action:
 *  - Support creating an action sequence in chained api,
 *  - Support animate any objects' any properties, not limited to node's properties.
 *    By contrast, cc.Action needs to create a new action class to support new node property.
 *  - Support working with cc.Action,
 *  - Support easing and progress function.
 * !#zh
 * Tween 提供了一个简单灵活的方法来创建 action。
 * 相对于 Cocos 传统的 cc.Action，cc.Tween 在创建动画上要灵活非常多：
 *  - 支持以链式结构的方式创建一个动画序列。
 *  - 支持对任意对象的任意属性进行缓动，不再局限于节点上的属性，而 cc.Action 添加一个属性的支持时还需要添加一个新的 action 类型。
 *  - 支持与 cc.Action 混用
 *  - 支持设置 {{#crossLink "Easing"}}{{/crossLink}} 或者 progress 函数
 * @class Tween
 * @param {Object} [target]
 * @example
 * cc.tween(node)
 *   .to(1, {scale: 2, position: cc.v3(100, 100, 100)})
 *   .call(() => { console.log('This is a callback'); })
 *   .by(1, {scale: 3, position: cc.v3(200, 200, 200)}, {easing: 'sineOutIn'})
 *   .start(cc.find('Canvas/cocos'));
 */
function Tween (target) {
    this._actions = [];
    this._finalAction = null;
    this._target = target;
}

/**
 * !#en
 * Insert an action or tween to this sequence
 * !#zh
 * 插入一个 action 或者 tween 到队列中
 * @method then 
 * @param {Action|Tween} other
 * @return {Tween}
 */
Tween.prototype.then = function (other) {
    if (other instanceof cc.Action) {
        this._actions.push(other.clone());
    }
    else {
        this._actions.push(other._union());
    }
    return this;
};


/**
 * !#en
 * Set tween target
 * !#zh
 * 设置 tween 的 target
 * @method target
 * @param {Object} target
 * @return {Tween}
 */
Tween.prototype.target = function (target) {
    this._target = target;
    return this;
};

/**
 * !#en
 * Start this tween
 * !#zh
 * 运行当前 tween
 * @method start
 * @return {Tween}
 */
Tween.prototype.start = function () {
    let target = this._target;
    if (!target) {
        cc.warn('Please set target to tween first');
        return this;
    }
    if (target instanceof cc.Object && !target.isValid) {
        return;
    }

    if (this._finalAction) {
        cc.director.getActionManager().removeAction(this._finalAction);
    }
    this._finalAction = this._union();

    if (target._id === undefined) {
        target._id = ++_tweenID;
    }

    cc.director.getActionManager().addAction(this._finalAction, target, false);

    return this;
};

/**
 * !#en
 * Stop this tween
 * !#zh
 * 停止当前 tween
 * @method stop
 * @return {Tween}
 */
Tween.prototype.stop = function () {
    if (this._finalAction) {
        cc.director.getActionManager().removeAction(this._finalAction);
    }
    return this;
};



/**
 * !#en
 * Clone a tween
 * !#zh
 * 克隆当前 tween
 * @method clone
 * @param {Object} [target]
 * @return {Tween}
 */
Tween.prototype.clone = function (target) {
    let action = this._union();
    return cc.tween(target).then(action.clone());
};

/**
 * !#en
 * Integrate all previous actions to an action.
 * !#zh
 * 将之前所有的 action 整合为一个 action。
 * @method union
 * @return {Tween}
 */
Tween.prototype.union = function () {
    let action = this._union();
    this._actions.length = 0;
    this._actions.push(action);
    return this;
};

Tween.prototype._union = function () {
    let actions = this._actions;

    if (actions.length === 1) {
        actions = actions[0];
    }
    else {
        actions = cc.sequence(actions);
    }

    return actions;
};

Object.assign(Tween.prototype, {
    /**
     * !#en Sets target's position property according to the bezier curve.
     * !#zh 按照贝塞尔路径设置目标的 position 属性。
     * @method bezierTo
     * @param {number} duration 
     * @param {[cc.Vec2, cc.Vec2, cc.Vec2]} controls 
     * @return {Tween}
     */
    bezierTo (duration, controls) {
        let c0x = controls[0].x, c0y = controls[0].y,
            c1x = controls[1].x, c1y = controls[1].y;
        opts = opts || Object.create(null);
        opts.progress = function (start, end, current, t) {
            current.x = bezier(start.x, c0x, c1x, end.x, t);
            current.y = bezier(start.y, c0y, c1y, end.y, t);
            return current;
        }
        return this.to(duration, { position: controls[2] }, opts);
    },

    /**
     * !#en Sets target's position property according to the bezier curve.
     * !#zh 按照贝塞尔路径设置目标的 position 属性。
     * @method bezierBy
     * @param {number} duration 
     * @param {[cc.Vec2, cc.Vec2, cc.Vec2]} controls
     * @return {Tween} 
     */
    bezierBy (duration, controls, opts) {
        let c0x = controls[0].x, c0y = controls[0].y,
            c1x = controls[1].x, c1y = controls[1].y;
        opts = opts || Object.create(null);
        opts.progress = function (start, end, current, t) {
            let sx = start.x, sy = start.y;
            current.x = bezier(sx, c0x + sx, c1x + sx, end.x, t);
            current.y = bezier(sy, c0y + sy, c1y + sy, end.y, t);
            return current;
        }
        return this.by(duration, { position: controls[2] }, opts);
    },

    /**
     * !#en Flips target's scaleX
     * !#zh 翻转目标的 scaleX 属性
     * @method flipX
     * @return {Tween}
     */
    flipX () {
        return this.call(() => { this._target.scaleX *= -1; }, this);
    },
    /**
     * !#en Flips target's scaleY
     * !#zh 翻转目标的 scaleY 属性
     * @method flipY
     * @return {Tween}
     */
    flipY () {
        return this.call(() => { this._target.scaleY *= -1; }, this);
    },

    /**
     * !#en Blinks target by set target's opacity property
     * !#zh 通过设置目标的 opacity 属性达到闪烁效果
     * @method blink
     * @param {number} duration 
     * @param {number} times 
     * @param {Object} [opts] 
     * @param {Function} [opts.progress]
     * @param {Function|String} [opts.easing]
     * @return {Tween}
     */
    blink (duration, times, opts) {
        var slice = 1.0 / times;
        opts = opts || Object.create(null);
        opts.progress = function (start, end, current, t) {
            if (t >= 1) {
                return start;
            }
            else {
                var m = t % slice;
                return (m > (slice / 2)) ? 255 : 0;
            }
        };
        return this.to(duration, { opacity: 1 }, opts);
    },

    /**
     * !#en Fade target's opacity property to the value.
     * !#zh 修改目标的 opacity 属性到指定值。
     * @method fadeTo
     * @param {number} duration 
     * @param {number} opacity 
     * @param {Object} [opts] 
     * @param {Function} [opts.progress]
     * @param {Function|String} [opts.easing]
     * @return {Tween}
     */
    fadeTo (duration, opacity, opts) {
        return this.to(duration, { opacity }, opts);
    },
    /**
     * !#en Fade target's opacity property to the value.
     * !#zh 修改目标的 opacity 属性到指定值。
     * @method fadeBy
     * @param {number} duration 
     * @param {number} opacity
     * @param {Object} [opts] 
     * @param {Function} [opts.progress]
     * @param {Function|String} [opts.easing]
     * @return {Tween}
     */
    fadeBy (duration, opacity, opts) {
        return this.by(duration, { opacity }, opts);
    },
    /**
     * !#en Fade target's opacity property to 255.
     * !#zh 修改目标的 opacity 属性到 255。
     * @method fadeIn
     * @param {number} duration 
     * @param {Object} [opts] 
     * @param {Function} [opts.progress]
     * @param {Function|String} [opts.easing]
     * @return {Tween}
     */
    fadeIn (duration, opts) {
        return this.to(duration, { opacity: 255 }, opts);
    },
    /**
     * !#en Fade target's opacity property to 0.
     * !#zh 修改目标的 opacity 属性到 0。
     * @method fadeOut
     * @param {number} duration 
     * @param {Object} [opts] 
     * @param {Function} [opts.progress]
     * @param {Function|String} [opts.easing]
     * @return {Tween}
     */
    fadeOut (duration, opts) {
        return this.to(duration, { opacity: 0 }, opts);
    },
    /**
     * !#en Fade target's color property to the value.
     * !#zh 修改目标的 color 属性到指定值。
     * @method tintTo
     * @param {number} duration 
     * @param {Color} color
     * @param {Object} [opts] 
     * @param {Function} [opts.progress]
     * @param {Function|String} [opts.easing]
     * @return {Tween}
     */
    tintTo (duration, color, opts) {
        return this.to(duration, { color }, opts);
    },
    /**
     * !#en Fade target's color property to the value.
     * !#zh 修改目标的 color 属性到指定值。
     * @method tintBy
     * @param {number} duration 
     * @param {Color} color
     * @param {Object} [opts] 
     * @param {Function} [opts.progress]
     * @param {Function|String} [opts.easing]
     * @return {Tween}
     */
    tintBy (duration, color, opts) {
        return this.by(duration, { color }, opts);
    }
})

let tmp_args = [];

function wrapAction (action) {
    return function () {
        tmp_args.length = 0;
        for (let l = arguments.length, i = 0; i < l; i++) {
            let arg = tmp_args[i] = arguments[i];
            if (arg instanceof Tween) {
                tmp_args[i] = arg._union();
            }
        }

        return action.apply(this, tmp_args);
    };
}

let actions = {
    /**
     * !#en
     * Add an action which calculate with absolute value
     * !#zh
     * 添加一个对属性进行绝对值计算的 action
     * @method to
     * @param {Number} duration 
     * @param {Object} props - {scale: 2, position: cc.v3(100, 100, 100)}
     * @param {Object} [opts] 
     * @param {Function} [opts.progress]
     * @param {Function|String} [opts.easing]
     * @return {Tween}
     */
    to (duration, props, opts) {
        opts = opts || Object.create(null);
        opts.relative = false;
        return new TweenAction(duration, props, opts);
    },

    /**
     * !#en
     * Add an action which calculate with relative value
     * !#zh
     * 添加一个对属性进行相对值计算的 action
     * @method by
     * @param {Number} duration 
     * @param {Object} props - {scale: 2, position: cc.v3(100, 100, 100)}
     * @param {Object} [opts] 
     * @param {Function} [opts.progress]
     * @param {Function|String} [opts.easing]
     * @return {Tween}
     */
    by (duration, props, opts) {
        opts = opts || Object.create(null);
        opts.relative = true;
        return new TweenAction(duration, props, opts);
    },

    /**
     * !#en
     * Directly set target properties
     * !#zh
     * 直接设置 target 的属性
     * @method set
     * @param {Object} props
     * @return {Tween}
     */
    set (props) {
        return new SetAction(props);
    },

    /**
     * !#en
     * Add an delay action
     * !#zh
     * 添加一个延时 action
     * @method delay
     * @param {Number} duration 
     * @return {Tween}
     */
    delay: cc.delayTime,
    /**
     * !#en
     * Add an callback action
     * !#zh
     * 添加一个回调 action
     * @method call
     * @param {Function} callback
     * @return {Tween}
     */
    call: cc.callFunc,
    /**
     * !#en
     * Add an hide action
     * !#zh
     * 添加一个隐藏 action
     * @method hide
     * @return {Tween}
     */
    hide: cc.hide,
    /**
     * !#en
     * Add an show action
     * !#zh
     * 添加一个显示 action
     * @method show
     * @return {Tween}
     */
    show: cc.show,
    /**
     * !#en
     * Add an removeSelf action
     * !#zh
     * 添加一个移除自己 action
     * @method removeSelf
     * @return {Tween}
     */
    removeSelf: cc.removeSelf,
    /**
     * !#en
     * Add an sequence action
     * !#zh
     * 添加一个队列 action
     * @method sequence
     * @param {Action|Tween} action
     * @param {Action|Tween} ...actions
     * @return {Tween}
     */
    sequence: wrapAction(cc.sequence),
    /**
     * !#en
     * Add an parallel action
     * !#zh
     * 添加一个并行 action
     * @method parallel
     * @param {Action|Tween} action
     * @param {Action|Tween} ...actions
     * @return {Tween}
     */
    parallel: wrapAction(cc.spawn)
};

// these action will use previous action as their parameters
let previousAsInputActions = {
    /**
     * !#en
     * Add an repeat action. 
     * This action will integrate before actions to a sequence action as their parameters.
     * !#zh
     * 添加一个重复 action，这个 action 会将前一个动作作为他的参数。
     * @method repeat
     * @param {Number} repeatTimes 
     * @param {Action | Tween} [action]
     * @return {Tween}
     */
    repeat: cc.repeat,
    /**
     * !#en
     * Add an repeat forever action
     * This action will integrate before actions to a sequence action as their parameters.
     * !#zh
     * 添加一个永久重复 action，这个 action 会将前一个动作作为他的参数。
     * @method repeatForever
     * @param {Action | Tween} [action]
     * @return {Tween}
     */
    repeatForever: function (action) {
        // TODO: fixed with cc.repeatForever
        return cc.repeat(action, 10e8);
    },
    /**
     * !#en
     * Add an reverse time action.
     * This action will integrate before actions to a sequence action as their parameters.
     * !#zh
     * 添加一个倒置时间 action，这个 action 会将前一个动作作为他的参数。
     * @method reverseTime
     * @param {Action | Tween} [action]
     * @return {Tween}
     */
    reverseTime: cc.reverseTime,
};


let keys = Object.keys(actions);
for (let i = 0; i < keys.length; i++) {
    let key = keys[i];
    Tween.prototype[key] = function () {
        let action = actions[key].apply(this, arguments);
        this._actions.push(action);
        return this;
    };
}

keys = Object.keys(previousAsInputActions);
for (let i = 0; i < keys.length; i++) {
    let key = keys[i];
    Tween.prototype[key] = function () {

        let actions = this._actions;
        let action = arguments[arguments.length - 1];
        let length = arguments.length - 1;

        if (action instanceof cc.Tween) {
            action = action._union();
        }
        else if (!(action instanceof cc.Action)) {
            action = actions[actions.length - 1];
            actions.length -= 1;
            length += 1;
        }

        let args = [action];
        for (let i = 0; i < length; i++) {
            args.push(arguments[i]);
        }

        action = previousAsInputActions[key].apply(this, args);
        actions.push(action);

        return this;
    };
}

/**
 * @module cc
 */

/**
 * @method tween
 * @param {Object} [target] - the target to animate
 * @return {Tween}
 */
cc.tween = function (target) {
    return new Tween(target);
};

cc.Tween = Tween;
