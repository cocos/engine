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

import { Event } from './event';
import { Vec2 } from '../../../core';
import { Touch } from '../touch';
import { SystemEventTypeUnion } from '../event-enum';

const _vec2 = new Vec2();

/**
 * @en
 * The touch event.
 *
 * @zh
 * 触摸事件。
 */
export class EventTouch extends Event {
    /**
     * @en The maximum touch point numbers simultaneously
     * @zh 同时存在的最大触点数量。
     */
    public static MAX_TOUCHES = 5;

    /**
     * @en The current touch object
     * @zh 当前触点对象
     */
    public touch: Touch | null = null;
    /**
     * @en Indicate whether the touch event is simulated or real
     * @zh 表示触摸事件是真实触点触发的还是模拟的
     */
    public simulate = false;

    /**
     * @en The unique ID of SystemWindow, which triggerd the event
     * @zh 触发此事件的系统窗口 ID
     */
    public windowId = 0;

    /**
     * @en Set whether to prevent events from being swallowed by nodes, which is false by default.
     * If set to true, the event is allowed to be dispatched to nodes at the bottom layer.
     * NOTE: Setting to true will reduce the efficiency of event dispatching.
     *
     * @zh 设置是否阻止事件被节点吞噬, 默认为 false 。
     * 如果设置为 true，则事件允许派发给渲染在下一层级的节点。
     * 注意：设置为 true 会降低事件派发的效率。
     *
     * @experimental May be optimized in the future.
     */
    public preventSwallow = false;

    private declare _eventCode: SystemEventTypeUnion;  // deprecated since v3.3

    private declare _touches: Touch[];

    private declare _allTouches: Touch[];

    /**
     * @param touches - An array of current touches
     * @param bubbles - Indicate whether the event bubbles up through the hierarchy or not.
     * @param eventType - The type of the event
     */
    constructor (changedTouches: Touch[], bubbles: boolean, eventType: SystemEventTypeUnion, touches: Touch[] = []) {
        super(eventType, bubbles);
        this._eventCode = eventType;
        this._touches = changedTouches || [];
        this._allTouches = touches;
    }

    /**
     * @en Returns event type code.
     * @zh 获取触摸事件类型。
     *
     * @deprecated since v3.3, please use EventTouch.prototype.type instead.
     */
    public getEventCode (): string {
        return this._eventCode;
    }

    /**
     * @en Returns touches of event.
     * @zh 获取有变动的触摸点的列表。
     * 注意：第一根手指按下不动，接着按第二根手指，这时候触点信息就只有变动的这根手指（第二根手指）的信息。
     * 如果需要获取全部手指的信息，请使用 `getAllTouches`。
     */
    public getTouches (): Touch[] {
        return this._touches;
    }

    /**
     * @en Returns touches of event.
     * @zh 获取所有触摸点的列表。
     * 注意：如果手指行为是 touch end，这个时候列表是没有该手指信息的。如需知道该手指信息，可通过 `getTouches` 获取识别。
     */
    public getAllTouches (): Touch[] {
        return this._allTouches;
    }

    /**
     * @en Sets touch location.
     * @zh 设置当前触点位置
     * @param x - The current touch location on the x axis
     * @param y - The current touch location on the y axis
     */
    public setLocation (x: number, y: number): void {
        if (this.touch) {
            this.touch.setTouchInfo(this.touch.getID(), x, y);
        }
    }

    /**
     * @en Returns the current touch location.
     * @zh 获取触点位置。
     * @param out - Pass the out object to avoid object creation, very good practice
     */
    public getLocation (out?: Vec2): Vec2 {
        return this.touch ? this.touch.getLocation(out) : new Vec2();
    }

    /**
     * @en Returns the current touch location in UI coordinates.
     * @zh 获取 UI 坐标系下的触点位置。
     * @param out - Pass the out object to avoid object creation, very good practice
     */
    public getUILocation (out?: Vec2): Vec2 {
        return this.touch ? this.touch.getUILocation(out) : new Vec2();
    }

    /**
     * @en Returns the current touch location in game screen coordinates.
     * @zh 获取当前触点在游戏窗口中的位置。
     * @param out - Pass the out object to avoid object creation, very good practice
     */
    public getLocationInView (out?: Vec2): Vec2 {
        return this.touch ? this.touch.getLocationInView(out) : new Vec2();
    }

    /**
     * @en Returns the previous touch location.
     * @zh 获取触点在上一次事件时的位置对象，对象包含 x 和 y 属性。
     * @param out - Pass the out object to avoid object creation, very good practice
     */
    public getPreviousLocation (out?: Vec2): Vec2 {
        return this.touch ? this.touch.getPreviousLocation(out) : new Vec2();
    }

    /**
     * @en Returns the start touch location.
     * @zh 获取触点落下时的位置对象，对象包含 x 和 y 属性。
     * @param out - Pass the out object to avoid object creation, very good practice
     */
    public getStartLocation (out?: Vec2): Vec2 {
        return this.touch ? this.touch.getStartLocation(out) : new Vec2();
    }

    /**
     * @en Returns the start touch location in UI coordinates.
     * @zh 获取触点落下时的 UI 世界下位置对象，对象包含 x 和 y 属性。
     * @param out - Pass the out object to avoid object creation, very good practice
     */
    public getUIStartLocation (out?: Vec2): Vec2 {
        return this.touch ? this.touch.getUIStartLocation(out) : new Vec2();
    }

    /**
     * @en Returns the id of the current touch point.
     * @zh 获取触点的标识 ID，可以用来在多点触摸中跟踪触点。
     */
    public getID (): number | null {
        return this.touch ? this.touch.getID() : null;
    }

    /**
     * @en Returns the delta distance from the previous location to current location.
     * @zh 获取触点距离上一次事件移动的距离对象，对象包含 x 和 y 属性。
     * @param out - Pass the out object to avoid object creation, very good practice
     */
    public getDelta (out?: Vec2): Vec2 {
        return this.touch ? this.touch.getDelta(out) : new Vec2();
    }

    /**
     * @en Returns the delta distance from the previous location to current location.
     * @zh 获取触点距离上一次事件 UI 世界下移动的距离对象，对象包含 x 和 y 属性。
     * @param out - Pass the out object to avoid object creation, very good practice
    */
    public getUIDelta (out?: Vec2): Vec2 {
        return this.touch ? this.touch.getUIDelta(out) : new Vec2();
    }

    /**
     * @en Returns the X axis delta distance from the previous location to current location.
     * @zh 获取触点距离上一次事件移动的 x 轴距离。
     */
    public getDeltaX (): number {
        return this.touch ? this.touch.getDelta(_vec2).x : 0;
    }

    /**
     * @en Returns the Y axis delta distance from the previous location to current location.
     * @zh 获取触点距离上一次事件移动的 y 轴距离。
     */
    public getDeltaY (): number {
        return this.touch ? this.touch.getDelta(_vec2).y : 0;
    }

    /**
     * @en Returns location X axis data.
     * @zh 获取当前触点 X 轴位置。
     */
    public getLocationX (): number {
        return this.touch ? this.touch.getLocationX() : 0;
    }

    /**
     * @en Returns location Y axis data.
     * @zh 获取当前触点 Y 轴位置。
     */
    public getLocationY (): number {
        return this.touch ? this.touch.getLocationY() : 0;
    }
}

// TODO: this is an injected property, should be deprecated
// issue: https://github.com/cocos/cocos-engine/issues/14643
(Event as any).EventTouch = EventTouch;
