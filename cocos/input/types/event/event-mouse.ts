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
import { Vec2, cclegacy } from '../../../core';
import { SystemEventTypeUnion } from '../event-enum';
import type { View } from '../../../ui/view';

/**
 * @en The mouse event
 * @zh 鼠标事件类型
 */
export class EventMouse extends Event {
    /**
     * @en The default tag when no button is pressed
     * @zh 按键默认的缺省状态
     */
    public static BUTTON_MISSING = -1;

    /**
     * @en The tag of mouse's left button.
     * @zh 鼠标左键的标签。
     */
    public static BUTTON_LEFT = 0;

    /**
     * @en The tag of mouse's right button  (The right button number is 2 on browser).
     * @zh 鼠标右键的标签。
     */
    public static BUTTON_RIGHT = 2;

    /**
     * @en The tag of mouse's middle button.
     * @zh 鼠标中键的标签。
     */
    public static BUTTON_MIDDLE = 1;

    /**
     * @en The tag of mouse's button 4.
     * @zh 鼠标按键 4 的标签。
     */
    public static BUTTON_4 = 3;

    /**
     * @en The tag of mouse's button 5.
     * @zh 鼠标按键 5 的标签。
     */
    public static BUTTON_5 = 4;

    /**
     * @en The tag of mouse's button 6.
     * @zh 鼠标按键 6 的标签。
     */
    public static BUTTON_6 = 5;

    /**
     * @en The tag of mouse's button 7.
     * @zh 鼠标按键 7 的标签。
     */
    public static BUTTON_7 = 6;

    /**
     * @en The tag of mouse's button 8.
     * @zh 鼠标按键 8 的标签。
     */
    public static BUTTON_8 = 7;

    /**
     * @en Mouse movement on x axis of the UI coordinate system.
     * @zh 鼠标在 UI 坐标系下 X 轴上的移动距离
     */
    public movementX = 0;

    /**
     * @en Mouse movement on y axis of the UI coordinate system.
     * @zh 鼠标在 UI 坐标系下 Y 轴上的移动距离
     */
    public movementY = 0;

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

    private declare _eventType: SystemEventTypeUnion;
    /**
     * @en The type of the event
     * @zh 鼠标事件类型
     *
     * @deprecated since v3.3, please use EventMouse.prototype.type instead.
     */
    public get eventType (): string {
        return this._eventType;
    }

    private _button: number = EventMouse.BUTTON_MISSING;

    private _x = 0;

    private _y = 0;

    private _prevX = 0;

    private _prevY = 0;

    private _scrollX = 0;

    private _scrollY = 0;

    /**
     * @param eventType - The type of the event
     * @param bubbles - Indicate whether the event bubbles up through the hierarchy or not.
     */
    constructor (eventType: SystemEventTypeUnion, bubbles?: boolean, prevLoc?: Vec2, windowId?: number) {
        super(eventType, bubbles);
        this._eventType = eventType;
        if (prevLoc) {
            this._prevX = prevLoc.x;
            this._prevY = prevLoc.y;
        }
        this.windowId = windowId ?? this.windowId;
    }

    /**
     * @en Sets scroll data of the mouse.
     * @zh 设置鼠标滚轮的滚动数据。
     * @param scrollX - The scroll value on x axis
     * @param scrollY - The scroll value on y axis
     */
    public setScrollData (scrollX: number, scrollY: number): void {
        this._scrollX = scrollX;
        this._scrollY = scrollY;
    }

    /**
     * @en Returns the scroll value on x axis.
     * @zh 获取鼠标滚动的 X 轴距离，只有滚动时才有效。
     */
    public getScrollX (): number {
        return this._scrollX;
    }

    /**
     * @en Returns the scroll value on y axis.
     * @zh 获取滚轮滚动的 Y 轴距离，只有滚动时才有效。
     */
    public getScrollY (): number {
        return this._scrollY;
    }

    /**
     * @en Sets cursor location.
     * @zh 设置当前鼠标位置。
     * @param x - The location on x axis
     * @param y - The location on y axis
     */
    public setLocation (x: number, y: number): void {
        this._x = x;
        this._y = y;
    }

    /**
     * @en Returns cursor location.
     * @zh 获取鼠标相对于左下角位置对象，对象包含 x 和 y 属性。
     * @param out - Pass the out object to avoid object creation, very good practice
     */
    public getLocation (out?: Vec2): Vec2 {
        if (!out) {
            out = new Vec2();
        }

        Vec2.set(out, this._x, this._y);
        return out;
    }

    /**
     * @en Returns the current cursor location in game view coordinates.
     * @zh 获取当前事件在游戏窗口内的坐标位置对象，对象包含 x 和 y 属性。
     * @param out - Pass the out object to avoid object creation, very good practice
     */
    public getLocationInView (out?: Vec2): Vec2 {
        if (!out) {
            out = new Vec2();
        }

        Vec2.set(out, this._x, (cclegacy.view as View)._designResolutionSize.height - this._y);
        return out;
    }

    /**
     * @en Returns the current cursor location in ui coordinates.
     * @zh 获取当前事件在 UI 窗口内的坐标位置，对象包含 x 和 y 属性。
     * @param out - Pass the out object to avoid object creation, very good practice
     */
    public getUILocation (out?: Vec2): Vec2 {
        if (!out) {
            out = new Vec2();
        }

        Vec2.set(out, this._x, this._y);
        (cclegacy.view as View)._convertToUISpace(out);
        return out;
    }

    /**
     * @en Returns the previous touch location.
     * @zh 获取鼠标点击在上一次事件时的位置对象，对象包含 x 和 y 属性。
     * @param out - Pass the out object to avoid object creation, very good practice
     */
    public getPreviousLocation (out?: Vec2): Vec2 {
        if (!out) {
            out = new Vec2();
        }

        Vec2.set(out, this._prevX, this._prevY);
        return out;
    }

    /**
     * @en Returns the previous touch location.
     * @zh 获取鼠标点击在上一次事件时的位置对象，对象包含 x 和 y 属性。
     * @param out - Pass the out object to avoid object creation, very good practice
     */
    public getUIPreviousLocation (out?: Vec2): Vec2 {
        if (!out) {
            out = new Vec2();
        }

        Vec2.set(out, this._prevX, this._prevY);
        (cclegacy.view as View)._convertToUISpace(out);
        return out;
    }

    /**
     * @en Returns the delta distance from the previous location to current location.
     * @zh 获取鼠标距离上一次事件移动的距离对象，对象包含 x 和 y 属性。
     * @param out - Pass the out object to avoid object creation, very good practice
     */
    public getDelta (out?: Vec2): Vec2 {
        if (!out) {
            out = new Vec2();
        }

        Vec2.set(out, this._x - this._prevX, this._y - this._prevY);
        return out;
    }

    /**
     * @en Returns the X axis delta distance from the previous location to current location.
     * @zh 获取鼠标距离上一次事件移动的 X 轴距离。
     */
    public getDeltaX (): number {
        return this._x - this._prevX;
    }

    /**
     * @en Returns the Y axis delta distance from the previous location to current location.
     * @zh 获取鼠标距离上一次事件移动的 Y 轴距离。
     */
    public getDeltaY (): number {
        return this._y - this._prevY;
    }

    /**
     * @en Returns the delta distance from the previous location to current location in the UI coordinates.
     * @zh 获取鼠标距离上一次事件移动在 UI 坐标系下的距离对象，对象包含 x 和 y 属性。
     * @param out - Pass the out object to avoid object creation, very good practice
     */
    public getUIDelta (out?: Vec2): Vec2 {
        if (!out) {
            out = new Vec2();
        }
        const view = cclegacy.view as View;
        Vec2.set(out, (this._x - this._prevX) / view.getScaleX(), (this._y - this._prevY) / view.getScaleY());
        return out;
    }

    /**
     * @en Returns the X axis delta distance from the previous location to current location in the UI coordinates.
     * @zh 获取鼠标距离上一次事件移动在 UI 坐标系下的 X 轴距离。
     */
    public getUIDeltaX (): number {
        return (this._x - this._prevX) / (cclegacy.view as View).getScaleX();
    }

    /**
     * @en Returns the Y axis delta distance from the previous location to current location in the UI coordinates.
     * @zh 获取鼠标距离上一次事件移动在 UI 坐标系下的 Y 轴距离。
     */
    public getUIDeltaY (): number {
        return (this._y - this._prevY) / (cclegacy.view as View).getScaleY();
    }

    /**
     * @en Sets mouse button code.
     * @zh 设置鼠标按键。
     * @param button - The button code
     */
    public setButton (button: number): void {
        this._button = button;
    }

    /**
     * @en Returns mouse button code.
     * @zh 获取鼠标按键。
     */
    public getButton (): number {
        return this._button;
    }

    /**
     * @en Returns location data on X axis.
     * @zh 获取鼠标当前 X 轴位置。
     */
    public getLocationX (): number {
        return this._x;
    }

    /**
     * @en Returns location data on Y axis.
     * @zh 获取鼠标当前 Y 轴位置。
     */
    public getLocationY (): number {
        return this._y;
    }

    /**
     * @en Returns location data on X axis.
     * @zh 获取鼠标当前 X 轴位置。
     */
    public getUILocationX (): number {
        const view = cclegacy.view as View;
        const viewport = view.getViewportRect();
        return (this._x - viewport.x) / view.getScaleX();
    }

    /**
     * @en Returns location data on Y axis.
     * @zh 获取鼠标当前 Y 轴位置。
     */
    public getUILocationY (): number {
        const view = cclegacy.view as View;
        const viewport = view.getViewportRect();
        return (this._y - viewport.y) / view.getScaleY();
    }
}

// TODO: this is an injected property, should be deprecated
// issue: https://github.com/cocos/cocos-engine/issues/14643
(Event as any).EventMouse = EventMouse;
