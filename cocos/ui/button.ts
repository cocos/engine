/*
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights to
 use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 of the Software, and to permit persons to whom the Software is furnished to do so,
 subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
*/

import { ccclass, help, executionOrder, menu, requireComponent, tooltip, displayOrder, type, rangeMin,
    rangeMax, serializable, executeInEditMode } from 'cc.decorator';
import { DEBUG, EDITOR, EDITOR_NOT_IN_PREVIEW } from 'internal:constants';
import { SpriteFrame } from '../2d/assets';
import { Component, EventHandler as ComponentEventHandler } from '../scene-graph';
import { UITransform, UIRenderer } from '../2d/framework';
import { EventMouse, EventTouch } from '../input/types';
import { Color, v3, Vec3 } from '../core/math';
import { ccenum } from '../core/value-types/enum';
import { lerp } from '../core/math/utils';
import { Node } from '../scene-graph/node';
import { Sprite, SpriteEventType } from '../2d/components/sprite';
import { legacyCC } from '../core/global-exports';
import { TransformBit } from '../scene-graph/node-enum';
import { NodeEventType } from '../scene-graph/node-event';
import { XrUIPressEventType } from '../xr/event/xr-event-handle';
import { warn } from '../core';

const _tempColor = new Color();

/**
 * @en Enum for transition type.
 *
 * @zh 过渡类型。
 */
enum Transition {
    /**
     * @en The none type.
     *
     * @zh 不做任何过渡。
     */
    NONE = 0,

    /**
     * @en The color type.
     *
     * @zh 颜色过渡。
     */
    COLOR = 1,

    /**
     * @en The sprite type.
     *
     * @zh 精灵过渡。
     */
    SPRITE = 2,
    /**
     * @en The scale type.
     *
     * @zh 缩放过渡。
     */
    SCALE = 3,
}

ccenum(Transition);

enum State {
    NORMAL,
    HOVER,
    PRESSED,
    DISABLED,
}

/**
 * @en The event types of [[Button]]. All button events are distributed by the owner Node, not the component
 * @zh [[Button]] 的事件类型，注意：事件是从该组件所属的 Node 上面派发出来的，需要用 node.on 来监听。
 */
export enum ButtonEventType {
    /**
     * @event click
     * @param {Event.EventCustom} event
     * @param {Button} button - The Button component.
     */
    CLICK = 'click',
}

/**
 * @en
 * Button component. Can be pressed or clicked. Button has 4 Transition types:
 *
 *   - Button.Transition.NONE   // Button will do nothing
 *   - Button.Transition.COLOR  // Button will change target's color
 *   - Button.Transition.SPRITE // Button will change target Sprite's sprite
 *   - Button.Transition.SCALE  // Button will change target node's scale
 *
 * The button can bind events (but you must be on the button's node to bind events).<br/>
 * The following events can be triggered on all platforms.
 *
 *  - cc.Node.EventType.TOUCH_START  // Press
 *  - cc.Node.EventType.TOUCH_MOVE   // After pressing and moving
 *  - cc.Node.EventType.TOUCH_END    // After pressing and releasing
 *  - cc.Node.EventType.TOUCH_CANCEL // Press to cancel
 *
 * The following events are only triggered on the PC platform:
 *
 *   - cc.Node.EventType.MOUSE_DOWN
 *   - cc.Node.EventType.MOUSE_MOVE
 *   - cc.Node.EventType.MOUSE_ENTER
 *   - cc.Node.EventType.MOUSE_LEAVE
 *   - cc.Node.EventType.MOUSE_UP
 *
 * The developer can get the current clicked node with `event.target` from event object which is passed as parameter
 * in the callback function of click event.
 *
 * @zh
 * 按钮组件。可以被按下，或者点击。<br>
 * 按钮可以通过修改 Transition 来设置按钮状态过渡的方式：
 *
 *   - Button.Transition.NONE   // 不做任何过渡
 *   - Button.Transition.COLOR  // 进行颜色之间过渡
 *   - Button.Transition.SPRITE // 进行精灵之间过渡
 *   - Button.Transition.SCALE // 进行缩放过渡
 *
 * 按钮可以绑定事件（但是必须要在按钮的 Node 上才能绑定事件）。<br/>
 * 以下事件可以在全平台上都触发：
 *
 *   - cc.Node.EventType.TOUCH_START  // 按下时事件
 *   - cc.Node.EventType.TOUCH_Move   // 按住移动后事件
 *   - cc.Node.EventType.TOUCH_END    // 按下后松开后事件
 *   - cc.Node.EventType.TOUCH_CANCEL // 按下取消事件
 *
 * 以下事件只在 PC 平台上触发：
 *
 *   - cc.Node.EventType.MOUSE_DOWN  // 鼠标按下时事件
 *   - cc.Node.EventType.MOUSE_MOVE  // 鼠标按住移动后事件
 *   - cc.Node.EventType.MOUSE_ENTER // 鼠标进入目标事件
 *   - cc.Node.EventType.MOUSE_LEAVE // 鼠标离开目标事件
 *   - cc.Node.EventType.MOUSE_UP    // 鼠标松开事件
 *
 * 开发者可以通过获取 **点击事件** 回调函数的参数 event 的 target 属性获取当前点击对象。
 *
 * @example
 * ```ts
 * import { log, Node } from 'cc';
 * // Add an event to the button.
 * button.node.on(Node.EventType.TOUCH_START, (event) => {
 *     log("This is a callback after the trigger event");
 * });
 * // You could also add a click event
 * // Note: In this way, you can't get the touch event info, so use it wisely.
 * button.node.on(Node.EventType.CLICK, (button) => {
 *    //The event is a custom event, you could get the Button component via first argument
 * })
 * ```
 */
@ccclass('cc.Button')
@help('i18n:cc.Button')
@executionOrder(110)
@menu('UI/Button')
@requireComponent(UITransform)
@executeInEditMode
export class Button extends Component {
    /**
     * @en
     * Transition target.<br/>
     * When Button state changed:
     * - Button.Transition.NONE   // Button will do nothing
     * - Button.Transition.COLOR  // Button will change target's color
     * - Button.Transition.SPRITE // Button will change target Sprite's sprite
     * - Button.Transition.SCALE  // Button will change target node's scale
     *
     * @zh
     * 需要过渡的目标。<br/>
     * 按钮可以通过修改 Transition 来设置按钮状态过渡的方式：
     * - Button.Transition.NONE   // 不做任何过渡
     * - Button.Transition.COLOR  // 进行颜色之间过渡
     * - Button.Transition.SPRITE // 进行 Sprite 之间的过渡
     * - Button.Transition.SCALE // 进行缩放过渡
     */
    @type(Node)
    @displayOrder(0)
    @tooltip('i18n:button.target')
    get target (): Node {
        return this._target || this.node;
    }

    set target (value) {
        if (this._target === value) {
            return;
        }
        if (this._target) {
            // need to remove the old target event listeners
            this._unregisterTargetEvent(this._target);
        }
        this._target = value;
        this._applyTarget();
    }

    /**
     * @en
     * Whether the Button is disabled.
     * If true, the Button will trigger event and do transition.
     *
     * @zh
     * 按钮事件是否被响应，如果为 false，则按钮将被禁用。
     */
    @displayOrder(1)
    @tooltip('i18n:button.interactable')
    get interactable (): boolean {
        return this._interactable;
    }

    set interactable (value) {
        // if (EDITOR) {
        //     if (value) {
        //         this._previousNormalSprite = this.normalSprite;
        //     } else {
        //         this.normalSprite = this._previousNormalSprite;
        //     }
        // }
        if (this._interactable === value) {
            return;
        }

        this._interactable = value;
        this._updateState();

        if (!this._interactable) {
            this._resetState();
        }
    }

    /**
     * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    set _resizeToTarget (value: boolean) {
        if (value) {
            this._resizeNodeToTargetNode();
        }
    }

    /**
     * @en
     * Transition type.
     *
     * @zh
     * 按钮状态改变时过渡方式。
     */
    @type(Transition)
    @displayOrder(2)
    @tooltip('i18n:button.transition')
    get transition (): Transition {
        return this._transition;
    }

    set transition (value: Transition) {
        if (this._transition === value) {
            return;
        }

        // Reset to normal data when change transition.
        if (this._transition === Transition.COLOR) {
            this._updateColorTransition(State.NORMAL);
        } else if (this._transition === Transition.SPRITE) {
            this._updateSpriteTransition(State.NORMAL);
        }
        this._transition = value;
        this._updateState();
    }

    // color transition

    /**
     * @en
     * Normal state color.
     *
     * @zh
     * 普通状态下按钮所显示的颜色。
     */
    @displayOrder(3)
    @tooltip('i18n:button.normal_color')
    // @constget
    get normalColor (): Readonly<Color> {
        return this._normalColor;
    }

    set normalColor (value) {
        if (this._normalColor === value) {
            return;
        }

        this._normalColor.set(value);
        this._updateState();
    }

    /**
     * @en
     * Pressed state color.
     *
     * @zh
     * 按下状态时按钮所显示的颜色。
     */
    @displayOrder(3)
    @tooltip('i18n:button.pressed_color')
    // @constget
    get pressedColor (): Readonly<Color> {
        return this._pressedColor;
    }

    set pressedColor (value) {
        if (this._pressedColor === value) {
            return;
        }

        this._pressedColor.set(value);
    }

    /**
     * @en
     * Hover state color.
     *
     * @zh
     * 悬停状态下按钮所显示的颜色。
     */
    @displayOrder(3)
    @tooltip('i18n:button.hover_color')
    // @constget
    get hoverColor (): Readonly<Color> {
        return this._hoverColor;
    }

    set hoverColor (value) {
        if (this._hoverColor === value) {
            return;
        }

        this._hoverColor.set(value);
    }
    /**
     * @en
     * Disabled state color.
     *
     * @zh
     * 禁用状态下按钮所显示的颜色。
     */
    @displayOrder(3)
    @tooltip('i18n:button.disabled_color')
    // @constget
    get disabledColor (): Readonly<Color> {
        return this._disabledColor;
    }

    set disabledColor (value) {
        if (this._disabledColor === value) {
            return;
        }

        this._disabledColor.set(value);
        this._updateState();
    }

    /**
     * @en
     * Color and Scale transition duration.
     *
     * @zh
     * 颜色过渡和缩放过渡时所需时间。
     */
    @rangeMin(0)
    @rangeMax(10)
    @displayOrder(4)
    @tooltip('i18n:button.duration')
    get duration (): number {
        return this._duration;
    }

    set duration (value) {
        if (this._duration === value) {
            return;
        }

        this._duration = value;
    }

    /**
     * @en
     * When user press the button, the button will zoom to a scale.
     * The final scale of the button equals (button original scale * zoomScale)
     * NOTE: Setting zoomScale less than 1 is not adviced, which could fire the touchCancel event
     * if the touch point is out of touch area after scaling.
     * if you need to do so, you should set target as another background node instead of the button node.
     *
     * @zh
     * 当用户点击按钮后，按钮会缩放到一个值，这个值等于 Button 原始 scale * zoomScale。
     * 注意：不建议 zoomScale 的值小于 1, 否则缩放后如果触摸点在触摸区域外, 则会触发 touchCancel 事件。
     * 如果你需要这么做，你应该把 target 设置为另一个背景节点，而不是按钮节点。
     */
    @displayOrder(3)
    @tooltip('i18n:button.zoom_scale')
    get zoomScale (): number {
        return this._zoomScale;
    }

    set zoomScale (value) {
        if (this._zoomScale === value) {
            return;
        }

        this._zoomScale = value;
    }

    // sprite transition
    /**
     * @en
     * Normal state sprite.
     *
     * @zh
     * 普通状态下按钮所显示的 Sprite。
     */
    @type(SpriteFrame)
    @displayOrder(3)
    @tooltip('i18n:button.normal_sprite')
    get normalSprite (): SpriteFrame | null {
        return this._normalSprite;
    }

    set normalSprite (value: SpriteFrame | null) {
        if (this._normalSprite === value) {
            return;
        }

        this._normalSprite = value;
        const sprite = this.node.getComponent(Sprite);
        if (sprite) {
            sprite.spriteFrame = value;
        }

        this._updateState();
    }

    /**
     * @en
     * Pressed state sprite.
     *
     * @zh
     * 按下状态时按钮所显示的 Sprite。
     */
    @type(SpriteFrame)
    @displayOrder(3)
    @tooltip('i18n:button.pressed_sprite')
    get pressedSprite (): SpriteFrame | null {
        return this._pressedSprite;
    }

    set pressedSprite (value: SpriteFrame | null) {
        if (this._pressedSprite === value) {
            return;
        }

        this._pressedSprite = value;
        this._updateState();
    }

    /**
     * @en
     * Hover state sprite.
     *
     * @zh
     * 悬停状态下按钮所显示的 Sprite。
     */
    @type(SpriteFrame)
    @displayOrder(3)
    @tooltip('i18n:button.hover_sprite')
    get hoverSprite (): SpriteFrame | null {
        return this._hoverSprite;
    }

    set hoverSprite (value: SpriteFrame | null) {
        if (this._hoverSprite === value) {
            return;
        }

        this._hoverSprite = value;
        this._updateState();
    }

    /**
     * @en
     * Disabled state sprite.
     *
     * @zh
     * 禁用状态下按钮所显示的 Sprite。
     */
    @type(SpriteFrame)
    @displayOrder(3)
    @tooltip('i18n:button.disabled_sprite')
    get disabledSprite (): SpriteFrame | null {
        return this._disabledSprite;
    }

    set disabledSprite (value: SpriteFrame | null) {
        if (this._disabledSprite === value) {
            return;
        }

        this._disabledSprite = value;
        this._updateState();
    }

    /**
     * @en Enum for transition type.
     * @zh 过渡类型。
     */
    public static Transition = Transition;
    /**
     * @en The event types of [[Button]]. All button events are distributed by the owner Node, not the component
     * @zh [[Button]] 的事件类型，注意：事件是从该组件所属的 Node 上面派发出来的，需要用 node.on 来监听。
     */
    public static EventType = ButtonEventType;
    /**
     * @en
     * If Button is clicked, it will trigger event's handler.
     *
     * @zh
     * 按钮的点击事件列表。
     */
    @type([ComponentEventHandler])
    @serializable
    @displayOrder(20)
    @tooltip('i18n:button.click_events')
    public clickEvents: ComponentEventHandler[] = [];
    @serializable
    protected _interactable = true;
    @serializable
    protected _transition = Transition.NONE;
    @serializable
    protected _normalColor: Color = Color.WHITE.clone();
    @serializable
    protected _hoverColor: Color = new Color(211, 211, 211, 255);
    @serializable
    protected _pressedColor: Color = Color.WHITE.clone();
    @serializable
    protected _disabledColor: Color = new Color(124, 124, 124, 255);
    @serializable
    protected _normalSprite: SpriteFrame | null = null;
    @serializable
    protected _hoverSprite: SpriteFrame | null = null;
    @serializable
    protected _pressedSprite: SpriteFrame | null = null;
    @serializable
    protected _disabledSprite: SpriteFrame | null = null;
    @serializable
    protected _duration = 0.1;
    @serializable
    protected _zoomScale = 1.2;
    @serializable
    protected _target: Node | null = null;
    private _pressed = false;
    private _hovered = false;
    private _fromColor: Color = new Color();
    private _toColor: Color = new Color();
    private _time = 0;
    private _transitionFinished = true;
    private _fromScale: Vec3 = v3();
    private _toScale: Vec3 = v3();
    private _originalScale: Vec3 | null = null;
    private _sprite: Sprite | null = null;
    private _targetScale: Vec3 = v3();

    constructor () {
        super();
    }

    public __preload (): void {
        if (!this.target) {
            this.target = this.node;
        }

        this._applyTarget();
        this._resetState();
    }

    public onEnable (): void {
        // check sprite frames
        //
        if (!EDITOR_NOT_IN_PREVIEW) {
            this._registerNodeEvent();
        } else {
            this.node.on(SpriteEventType.SPRITE_FRAME_CHANGED, (comp: Sprite) => {
                if (this._transition === Transition.SPRITE) {
                    this._setCurrentStateSpriteFrame(comp.spriteFrame);
                } else {
                    // avoid serialization data loss when in no-sprite mode
                    this._normalSprite = null;
                    this._hoverSprite = null;
                    this._pressedSprite = null;
                    this._disabledSprite = null;
                }
            }, this);
        }
    }

    public onDisable (): void {
        this._resetState();

        if (!EDITOR_NOT_IN_PREVIEW) {
            this._unregisterNodeEvent();
        } else {
            this.node.off(SpriteEventType.SPRITE_FRAME_CHANGED);
        }
    }

    public onDestroy (): void {
        if (this.target.isValid) {
            this._unregisterTargetEvent(this.target);
        }
    }

    public update (dt: number): void {
        const target = this.target;
        if (this._transitionFinished || !target) {
            return;
        }

        if (this._transition !== Transition.COLOR && this._transition !== Transition.SCALE) {
            return;
        }

        this._time += dt;
        let ratio = 1.0;
        if (this._duration > 0) {
            ratio = this._time / this._duration;
        }

        if (ratio >= 1) {
            ratio = 1;
        }

        if (this._transition === Transition.COLOR) {
            const renderComp = target._uiProps.uiComp as UIRenderer;
            Color.lerp(_tempColor, this._fromColor, this._toColor, ratio);
            if (renderComp) {
                renderComp.color = _tempColor;
            }
        } else if (this.transition === Transition.SCALE) {
            target.getScale(this._targetScale);
            this._targetScale.x = lerp(this._fromScale.x, this._toScale.x, ratio);
            this._targetScale.y = lerp(this._fromScale.y, this._toScale.y, ratio);
            target.setScale(this._targetScale);
        }

        if (ratio === 1) {
            this._transitionFinished = true;
        }
    }

    protected _resizeNodeToTargetNode (): void {
        if (!this.target) {
            return;
        }
        const targetTrans = this.target._uiProps.uiTransformComp;
        if (EDITOR && targetTrans) {
            this.node._uiProps.uiTransformComp!.setContentSize(targetTrans.contentSize);
        }
    }

    protected _resetState (): void {
        this._pressed = false;
        this._hovered = false;
        // Restore button status
        const target = this.target;
        if (!target) {
            return;
        }
        const transition = this._transition;
        if (transition === Transition.COLOR && this._interactable) {
            const renderComp = target.getComponent(UIRenderer);
            if (renderComp) {
                renderComp.color = this._normalColor;
            }
        } else if (transition === Transition.SCALE && this._originalScale) {
            target.setScale(this._originalScale);
        }
        this._transitionFinished = true;
    }

    protected _registerNodeEvent (): void {
        this.node.on(NodeEventType.TOUCH_START, this._onTouchBegan, this);
        this.node.on(NodeEventType.TOUCH_MOVE, this._onTouchMove, this);
        this.node.on(NodeEventType.TOUCH_END, this._onTouchEnded, this);
        this.node.on(NodeEventType.TOUCH_CANCEL, this._onTouchCancel, this);

        this.node.on(NodeEventType.MOUSE_ENTER, this._onMouseMoveIn, this);
        this.node.on(NodeEventType.MOUSE_LEAVE, this._onMouseMoveOut, this);

        this.node.on(XrUIPressEventType.XRUI_HOVER_ENTERED, this._xrHoverEnter, this);
        this.node.on(XrUIPressEventType.XRUI_HOVER_EXITED, this._xrHoverExit, this);
        this.node.on(XrUIPressEventType.XRUI_CLICK, this._xrClick, this);
        this.node.on(XrUIPressEventType.XRUI_UNCLICK, this._xrUnClick, this);
    }

    protected _registerTargetEvent (target): void {
        if (EDITOR_NOT_IN_PREVIEW) {
            target.on(SpriteEventType.SPRITE_FRAME_CHANGED, this._onTargetSpriteFrameChanged, this);
            target.on(NodeEventType.COLOR_CHANGED, this._onTargetColorChanged, this);
        }
        target.on(NodeEventType.TRANSFORM_CHANGED, this._onTargetTransformChanged, this);
    }

    protected _unregisterNodeEvent (): void {
        this.node.off(NodeEventType.TOUCH_START, this._onTouchBegan, this);
        this.node.off(NodeEventType.TOUCH_MOVE, this._onTouchMove, this);
        this.node.off(NodeEventType.TOUCH_END, this._onTouchEnded, this);
        this.node.off(NodeEventType.TOUCH_CANCEL, this._onTouchCancel, this);

        this.node.off(NodeEventType.MOUSE_ENTER, this._onMouseMoveIn, this);
        this.node.off(NodeEventType.MOUSE_LEAVE, this._onMouseMoveOut, this);

        this.node.off(XrUIPressEventType.XRUI_HOVER_ENTERED, this._xrHoverEnter, this);
        this.node.off(XrUIPressEventType.XRUI_HOVER_EXITED, this._xrHoverExit, this);
        this.node.off(XrUIPressEventType.XRUI_CLICK, this._xrClick, this);
        this.node.off(XrUIPressEventType.XRUI_UNCLICK, this._xrUnClick, this);
    }

    protected _unregisterTargetEvent (target): void {
        if (EDITOR_NOT_IN_PREVIEW) {
            target.off(SpriteEventType.SPRITE_FRAME_CHANGED);
            target.off(NodeEventType.COLOR_CHANGED);
        }
        target.off(NodeEventType.TRANSFORM_CHANGED);
    }

    protected _getTargetSprite (target: Node | null): Sprite | null {
        let sprite: Sprite | null = null;
        if (target) {
            sprite = target.getComponent(Sprite);
        }
        return sprite;
    }

    protected _applyTarget (): void {
        if (this.target) {
            this._sprite = this._getTargetSprite(this.target);
            if (!this._originalScale) {
                this._originalScale = new Vec3();
            }
            Vec3.copy(this._originalScale, this.target.scale);
            this._registerTargetEvent(this.target);
        }
    }

    private _onTargetSpriteFrameChanged (comp: Sprite): void {
        if (this._transition === Transition.SPRITE) {
            this._setCurrentStateSpriteFrame(comp.spriteFrame);
        }
    }

    private _setCurrentStateSpriteFrame (spriteFrame: SpriteFrame | null): void {
        if (!spriteFrame) {
            return;
        }
        switch (this._getButtonState()) {
        case State.NORMAL:
            this._normalSprite = spriteFrame;
            break;
        case State.HOVER:
            this._hoverSprite = spriteFrame;
            break;
        case State.PRESSED:
            this._pressedSprite = spriteFrame;
            break;
        case State.DISABLED:
            this._disabledSprite = spriteFrame;
            break;
        default:
            break;
        }
    }

    private _onTargetColorChanged (color: Color): void {
        if (this._transition === Transition.COLOR) {
            this._setCurrentStateColor(color);
        }
    }

    private _setCurrentStateColor (color: Color): void {
        switch (this._getButtonState()) {
        case State.NORMAL:
            this._normalColor = color;
            break;
        case State.HOVER:
            this._hoverColor = color;
            break;
        case State.PRESSED:
            this._pressedColor = color;
            break;
        case State.DISABLED:
            this._disabledColor = color;
            break;
        default:
            break;
        }
    }

    private _onTargetTransformChanged (transformBit: TransformBit): void {
        // update originalScale
        if ((transformBit & TransformBit.SCALE) && this._originalScale
            && this._transition === Transition.SCALE && this._transitionFinished) {
            Vec3.copy(this._originalScale, this.target.scale);
        }
    }

    // touch event handler
    protected _onTouchBegan (event?: EventTouch): void {
        if (!this._interactable || !this.enabledInHierarchy) { return; }

        this._pressed = true;
        this._updateState();
        if (event) {
            event.propagationStopped = true;
        }
    }

    protected _onTouchMove (event?: EventTouch): void {
        if (!this._interactable || !this.enabledInHierarchy || !this._pressed) { return; }
        // mobile phone will not emit _onMouseMoveOut,
        // so we have to do hit test when touch moving
        if (!event) {
            return;
        }

        const touch = (event).touch;
        if (!touch) {
            return;
        }

        const hit = this.node._uiProps.uiTransformComp!.hitTest(touch.getLocation(), event.windowId);

        if (this._transition === Transition.SCALE && this.target && this._originalScale) {
            if (hit) {
                Vec3.copy(this._fromScale, this._originalScale);
                Vec3.multiplyScalar(this._toScale, this._originalScale, this._zoomScale);
                this._transitionFinished = false;
            } else {
                this._time = 0;
                this._transitionFinished = true;
                this.target.setScale(this._originalScale);
            }
        } else {
            let state: State;
            if (hit) {
                state = State.PRESSED;
            } else {
                state = State.NORMAL;
            }
            this._applyTransition(state);
        }

        if (event) {
            event.propagationStopped = true;
        }
    }

    protected _onTouchEnded (event?: EventTouch): void {
        if (!this._interactable || !this.enabledInHierarchy) {
            return;
        }

        if (this._pressed) {
            ComponentEventHandler.emitEvents(this.clickEvents, event);
            this.node.emit(ButtonEventType.CLICK, this);
        }
        this._pressed = false;
        this._updateState();

        if (event) {
            event.propagationStopped = true;
        }
    }

    protected _onTouchCancel (event?: EventTouch): void {
        if (!this._interactable || !this.enabledInHierarchy) { return; }

        this._pressed = false;
        this._updateState();
    }

    protected _onMouseMoveIn (event?: EventMouse): void {
        if (this._pressed || !this.interactable || !this.enabledInHierarchy) { return; }
        if (this._transition === Transition.SPRITE && !this._hoverSprite) { return; }

        if (!this._hovered) {
            this._hovered = true;
            this._updateState();
        }
    }

    protected _onMouseMoveOut (event?: EventMouse): void {
        if (this._hovered) {
            this._hovered = false;
            this._updateState();
        }
    }

    // state handler
    protected _updateState (): void {
        const state = this._getButtonState();
        this._applyTransition(state);
    }

    protected _getButtonState (): State {
        let state = State.NORMAL;
        if (!this._interactable) {
            state = State.DISABLED;
        } else if (this._pressed) {
            state = State.PRESSED;
        } else if (this._hovered) {
            state = State.HOVER;
        }
        return state;
    }

    protected _updateColorTransition (state: State): void {
        const color = this._getColorByState(state);

        const renderComp = this.target?.getComponent(UIRenderer);
        if (!renderComp) {
            return;
        }

        if (EDITOR_NOT_IN_PREVIEW || state === State.DISABLED) {
            renderComp.color = color;
            this._transitionFinished = true;
        } else {
            this._fromColor = renderComp.color.clone();
            this._toColor = color;
            this._time = 0;
            this._transitionFinished = false;
        }
    }

    protected _updateSpriteTransition (state: State): void {
        const sprite = this._getSpriteFrameByState(state);
        if (this._sprite && sprite) {
            this._sprite.spriteFrame = sprite;
        }
    }

    protected _updateScaleTransition (state: State): void {
        if (!this._interactable) {
            return;
        }

        if (state === State.PRESSED) {
            this._zoomUp();
        } else {
            this._zoomBack();
        }
    }

    protected _zoomUp (): void {
        // skip before __preload()
        if (!this._originalScale) {
            return;
        }
        Vec3.copy(this._fromScale, this._originalScale);
        Vec3.multiplyScalar(this._toScale, this._originalScale, this._zoomScale);
        this._time = 0;
        this._transitionFinished = false;
    }

    protected _zoomBack (): void {
        if (!this.target || !this._originalScale) {
            return;
        }
        Vec3.copy(this._fromScale, this.target.scale);
        Vec3.copy(this._toScale, this._originalScale);
        this._time = 0;
        this._transitionFinished = false;
    }

    protected _applyTransition (state: State): void {
        const transition = this._transition;
        if (transition === Transition.COLOR) {
            this._updateColorTransition(state);
        } else if (transition === Transition.SPRITE) {
            this._updateSpriteTransition(state);
        } else if (transition === Transition.SCALE) {
            this._updateScaleTransition(state);
        }
    }

    private _getSpriteFrameByState (state: State): SpriteFrame | null {
        switch (state) {
        case State.NORMAL:
            return this._normalSprite;
        case State.DISABLED:
            return this._disabledSprite;
        case State.HOVER:
            return this.hoverSprite;
        case State.PRESSED:
            return this._pressedSprite;
        default:
            // Should not arrive here.
            if (DEBUG) {
                warn('Button._getColorByState(): wrong state.');
            }
            return null;
        }
    }

    private _getColorByState (state: State): Color {
        switch (state) {
        case State.NORMAL:
            return this._normalColor;
        case State.DISABLED:
            return this._disabledColor;
        case State.HOVER:
            return this._hoverColor;
        case State.PRESSED:
            return this._pressedColor;
        default:
            // Should not arrive here.
            if (DEBUG) {
                warn('Button._getColorByState(): wrong state.');
            }
            return new Color();
        }
    }

    private _xrHoverEnter (): void {
        this._onMouseMoveIn();
        this._updateState();
    }

    private _xrHoverExit (): void {
        this._onMouseMoveOut();
        if (this._pressed) {
            this._pressed = false;
            this._updateState();
        }
    }

    private _xrClick (): void {
        if (!this._interactable || !this.enabledInHierarchy) { return; }
        this._pressed = true;
        this._updateState();
    }

    private _xrUnClick (): void {
        if (!this._interactable || !this.enabledInHierarchy) {
            return;
        }

        if (this._pressed) {
            ComponentEventHandler.emitEvents(this.clickEvents, this);
            this.node.emit(ButtonEventType.CLICK, this);
        }
        this._pressed = false;
        this._updateState();
    }
}

legacyCC.Button = Button;
