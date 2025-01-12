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

import { ccclass, help, executionOrder, menu, requireComponent, tooltip, type, slide, range, serializable } from 'cc.decorator';
import { EDITOR } from 'internal:constants';
import { Component, EventHandler } from '../scene-graph';
import { UITransform } from '../2d/framework';
import { EventTouch, Touch } from '../input/types';
import { Vec3 } from '../core/math';
import { ccenum } from '../core/value-types/enum';
import { clamp01 } from '../core/math/utils';
import { Sprite } from '../2d/components/sprite';
import { legacyCC } from '../core/global-exports';
import { NodeEventType } from '../scene-graph/node-event';
import { XrUIPressEvent, XrUIPressEventType } from '../xr/event/xr-event-handle';

const _tempPos = new Vec3();
/**
 * @en
 * The Slider Direction.
 *
 * @zh
 * 滑动器方向。
 */
enum Direction {
    /**
     * @en
     * The horizontal direction.
     *
     * @zh
     * 水平方向。
     */
    Horizontal = 0,
    /**
     * @en
     * The vertical direction.
     *
     * @zh
     * 垂直方向。
     */
    Vertical = 1,
}

ccenum(Direction);

/**
 * @en
 * The Slider Control.
 *
 * @zh
 * 滑动器组件。
 */
@ccclass('cc.Slider')
@help('i18n:cc.Slider')
@executionOrder(110)
@menu('UI/Slider')
@requireComponent(UITransform)
export class Slider extends Component {
    /**
     * @en
     * The "handle" part of the slider.
     *
     * @zh
     * 滑动器滑块按钮部件。
     */
    @type(Sprite)
    @tooltip('i18n:slider.handle')
    get handle (): Sprite | null {
        return this._handle;
    }

    set handle (value: Sprite | null) {
        if (this._handle === value) {
            return;
        }

        this._handle = value;
        if (EDITOR && this._handle) {
            this._updateHandlePosition();
        }
    }

    /**
     * @en
     * The slider direction.
     *
     * @zh
     * 滑动器方向。
     */
    @type(Direction)
    @tooltip('i18n:slider.direction')
    get direction (): number {
        return this._direction;
    }

    set direction (value: number) {
        if ((this._direction as number) === value) {
            return;
        }

        this._direction = value;
        this._changeLayout();
    }

    /**
     * @en
     * The current progress of the slider. The valid value is between 0-1.
     *
     * @zh
     * 当前进度值，该数值的区间是 0-1 之间。
     */
    @slide
    @range([0, 1, 0.01])
    @tooltip('i18n:slider.progress')
    get progress (): number {
        return this._progress;
    }

    set progress (value) {
        if (this._progress === value) {
            return;
        }

        this._progress = value;
        this._updateHandlePosition();
    }

    public static Direction = Direction;

    /**
     * @en
     * The slider slide events' callback array.
     *
     * @zh
     * 滑动器组件滑动事件回调函数数组。
     */
    @type([EventHandler])
    @serializable
    @tooltip('i18n:slider.slideEvents')
    public slideEvents: EventHandler[] = [];
    @serializable
    private _handle: Sprite | null = null;
    @serializable
    private _direction = Direction.Horizontal;
    @serializable
    private _progress = 0.1;

    private _offset: Vec3 = new Vec3();
    private _dragging = false;
    private _touchHandle = false;
    private _handleLocalPos = new Vec3();
    private _touchPos = new Vec3();

    constructor () {
        super();
    }

    public __preload (): void {
        this._updateHandlePosition();
    }

    // 注册事件

    public onEnable (): void {
        this._updateHandlePosition();

        this.node.on(NodeEventType.TOUCH_START, this._onTouchBegan, this);
        this.node.on(NodeEventType.TOUCH_MOVE, this._onTouchMoved, this);
        this.node.on(NodeEventType.TOUCH_END, this._onTouchEnded, this);
        this.node.on(NodeEventType.TOUCH_CANCEL, this._onTouchCancelled, this);

        this.node.on(XrUIPressEventType.XRUI_HOVER_STAY, this._xrHoverStay, this);
        this.node.on(XrUIPressEventType.XRUI_CLICK, this._xrClick, this);
        this.node.on(XrUIPressEventType.XRUI_UNCLICK, this._xrUnClick, this);
        if (this._handle && this._handle.isValid) {
            this._handle.node.on(NodeEventType.TOUCH_START, this._onHandleDragStart, this);
            this._handle.node.on(NodeEventType.TOUCH_MOVE, this._onTouchMoved, this);
            this._handle.node.on(NodeEventType.TOUCH_END, this._onTouchEnded, this);
        }
    }

    public onDisable (): void {
        this.node.off(NodeEventType.TOUCH_START, this._onTouchBegan, this);
        this.node.off(NodeEventType.TOUCH_MOVE, this._onTouchMoved, this);
        this.node.off(NodeEventType.TOUCH_END, this._onTouchEnded, this);
        this.node.off(NodeEventType.TOUCH_CANCEL, this._onTouchCancelled, this);

        this.node.off(XrUIPressEventType.XRUI_HOVER_STAY, this._xrHoverStay, this);
        this.node.off(XrUIPressEventType.XRUI_CLICK, this._xrClick, this);
        this.node.off(XrUIPressEventType.XRUI_UNCLICK, this._xrUnClick, this);
        if (this._handle && this._handle.isValid) {
            this._handle.node.off(NodeEventType.TOUCH_START, this._onHandleDragStart, this);
            this._handle.node.off(NodeEventType.TOUCH_MOVE, this._onTouchMoved, this);
            this._handle.node.off(NodeEventType.TOUCH_END, this._onTouchEnded, this);
        }
    }

    protected _onHandleDragStart (event?: EventTouch): void {
        if (!event || !this._handle || !this._handle.node._getUITransformComp()) {
            return;
        }

        this._dragging = true;
        this._touchHandle = true;
        const touhPos = event.touch!.getUILocation();
        Vec3.set(this._touchPos, touhPos.x, touhPos.y, 0);
        this._handle.node._getUITransformComp()!.convertToNodeSpaceAR(this._touchPos, this._offset);

        event.propagationStopped = true;
    }

    protected _onTouchBegan (event?: EventTouch): void {
        if (!this._handle || !event) {
            return;
        }

        this._dragging = true;
        if (!this._touchHandle) {
            this._handleSliderLogic(event.touch);
        }

        event.propagationStopped = true;
    }

    protected _onTouchMoved (event?: EventTouch): void {
        if (!this._dragging || !event) {
            return;
        }

        this._handleSliderLogic(event.touch);
        event.propagationStopped = true;
    }

    protected _onTouchEnded (event?: EventTouch): void {
        this._dragging = false;
        this._touchHandle = false;
        this._offset = new Vec3();

        if (event) {
            event.propagationStopped = true;
        }
    }

    protected _onTouchCancelled (event?: EventTouch): void {
        this._dragging = false;
        if (event) {
            event.propagationStopped = true;
        }
    }

    protected _handleSliderLogic (touch: Touch | null): void {
        this._updateProgress(touch);
        this._emitSlideEvent();
    }

    protected _emitSlideEvent (): void {
        EventHandler.emitEvents(this.slideEvents, this);
        this.node.emit('slide', this);
    }

    protected _updateProgress (touch: Touch | null): void {
        if (!this._handle || !touch) {
            return;
        }

        const touchPos = touch.getUILocation();
        Vec3.set(this._touchPos, touchPos.x, touchPos.y, 0);
        const uiTrans = this.node._getUITransformComp()!;
        const localTouchPos = uiTrans.convertToNodeSpaceAR(this._touchPos, _tempPos);
        if (this.direction === Direction.Horizontal as number) {
            this.progress = clamp01(0.5 + (localTouchPos.x - this._offset.x) / uiTrans.width);
        } else {
            this.progress = clamp01(0.5 + (localTouchPos.y - this._offset.y) / uiTrans.height);
        }
    }

    protected _updateHandlePosition (): void {
        if (!this._handle) {
            return;
        }
        this._handleLocalPos.set(this._handle.node.position);
        const uiTrans = this.node._getUITransformComp()!;
        if (this._direction === Direction.Horizontal) {
            this._handleLocalPos.x = -uiTrans.width * uiTrans.anchorX + this.progress * uiTrans.width;
        } else {
            this._handleLocalPos.y = -uiTrans.height * uiTrans.anchorY + this.progress * uiTrans.height;
        }

        this._handle.node.setPosition(this._handleLocalPos);
    }

    private _changeLayout (): void {
        const uiTrans = this.node._getUITransformComp()!;
        const contentSize = uiTrans.contentSize;
        uiTrans.setContentSize(contentSize.height, contentSize.width);
        if (this._handle) {
            const pos = this._handle.node.position;
            if (this._direction === Direction.Horizontal) {
                this._handle.node.setPosition(pos.x, 0, pos.z);
            } else {
                this._handle.node.setPosition(0, pos.y, pos.z);
            }

            this._updateHandlePosition();
        }
    }

    protected _xrHandleProgress (point: Vec3): void {
        if (!this._touchHandle) {
            const uiTrans = this.node._getUITransformComp()!;
            uiTrans.convertToNodeSpaceAR(point, _tempPos);
            if (this.direction === Direction.Horizontal as number) {
                this.progress = clamp01(0.5 + (_tempPos.x - this.node.position.x) / uiTrans.width);
            } else {
                this.progress = clamp01(0.5 + (_tempPos.y - this.node.position.y) / uiTrans.height);
            }
        }
    }

    protected _xrClick (event: XrUIPressEvent): void {
        if (!this._handle) {
            return;
        }
        this._dragging = true;
        this._xrHandleProgress(event.hitPoint);
        this._emitSlideEvent();
    }

    protected _xrUnClick (): void {
        this._dragging = false;
        this._touchHandle = false;
    }

    protected _xrHoverStay (event: XrUIPressEvent): void {
        if (!this._dragging) {
            return;
        }

        this._xrHandleProgress(event.hitPoint);
        this._emitSlideEvent();
    }
}

/**
 * @zh
 * 注意：此事件是从该组件所属的 Node 上面派发出来的，需要用 node.on 来监听。
 * @event slide
 * @param {Event.EventCustom} event
 * @param {Slider} slider - The slider component.
 */

legacyCC.Slider = Slider;
