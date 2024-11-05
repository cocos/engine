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

import { Vec2, cclegacy } from '../../core';
import type { View } from '../../ui/view';

const _vec2 = new Vec2();
/**
 * @en The touch point class
 * @zh 封装了触点相关的信息。
 */
export class Touch {
    private _point$: Vec2 = new Vec2();
    private _prevPoint$: Vec2 = new Vec2();
    private _lastModified$ = 0;
    private _id = 0;
    private _startPoint$: Vec2 = new Vec2();
    private _startPointCaptured$ = false;

    get lastModified (): number {
        return this._lastModified$;
    }

    /**
     * @param x - x position of the touch point
     * @param y - y position of the touch point
     * @param id - The id of the touch point
     */
    constructor (x: number, y: number, id = 0) {
        this.setTouchInfo(id, x, y);
    }

    /**
     * @en Returns the current touch location in OpenGL coordinates.、
     * @zh 获取当前触点位置。
     * @param out - Pass the out object to avoid object creation, very good practice
     */
    public getLocation (out?: Vec2): Vec2 {
        if (!out) {
            out = new Vec2();
        }

        out.set(this._point$.x, this._point$.y);
        return out;
    }

    /**
     * @en Returns X axis location value.
     * @zh 获取当前触点 X 轴位置。
     */
    public getLocationX (): number {
        return this._point$.x;
    }

    /**
     * @en Returns Y axis location value.
     * @zh 获取当前触点 Y 轴位置。
     */
    public getLocationY (): number {
        return this._point$.y;
    }

    /**
     * @en Returns the current touch location in UI coordinates.、
     * @zh 获取当前触点在 UI 坐标系中的位置。
     * @param out - Pass the out object to avoid object creation, very good practice
     */
    public getUILocation (out?: Vec2): Vec2 {
        if (!out) {
            out = new Vec2();
        }

        out.set(this._point$.x, this._point$.y);
        (cclegacy.view as View)._convertToUISpace(out);
        return out;
    }

    /**
     * @en Returns X axis location value in UI coordinates.
     * @zh 获取当前触点在 UI 坐标系中 X 轴位置。
     */
    public getUILocationX (): number {
        const view = cclegacy.view as View;
        const viewport = view.getViewportRect();
        return (this._point$.x - viewport.x) / view.getScaleX();
    }

    /**
     * @en Returns Y axis location value in UI coordinates.
     * @zh 获取当前触点在 UI 坐标系中 Y 轴位置。
     */
    public getUILocationY (): number {
        const view = cclegacy.view as View;
        const viewport = view.getViewportRect();
        return (this._point$.y - viewport.y) / view.getScaleY();
    }

    /**
     * @en Returns the previous touch location.
     * @zh 获取触点在上一次事件时的位置对象，对象包含 x 和 y 属性。
     * @param out - Pass the out object to avoid object creation, very good practice
     */
    public getPreviousLocation (out?: Vec2): Vec2 {
        if (!out) {
            out = new Vec2();
        }

        out.set(this._prevPoint$.x, this._prevPoint$.y);
        return out;
    }

    /**
     * @en Returns the previous touch location in UI coordinates.
     * @zh 获取触点在上一次事件时在 UI 坐标系中的位置对象，对象包含 x 和 y 属性。
     * @param out - Pass the out object to avoid object creation, very good practice
     */
    public getUIPreviousLocation (out?: Vec2): Vec2 {
        if (!out) {
            out = new Vec2();
        }

        out.set(this._prevPoint$.x, this._prevPoint$.y);
        (cclegacy.view as View)._convertToUISpace(out);
        return out;
    }

    /**
     * @en Returns the start touch location.
     * @zh 获取触点落下时的位置对象，对象包含 x 和 y 属性。
     * @param out - Pass the out object to avoid object creation, very good practice
     */
    public getStartLocation (out?: Vec2): Vec2 {
        if (!out) {
            out = new Vec2();
        }

        out.set(this._startPoint$.x, this._startPoint$.y);
        return out;
    }

    /**
     * @en Returns the start touch location in UI coordinates.
     * @zh 获取触点落下时在 UI 坐标系中的位置对象，对象包含 x 和 y 属性。
     * @param out - Pass the out object to avoid object creation, very good practice
     */
    public getUIStartLocation (out?: Vec2): Vec2 {
        if (!out) {
            out = new Vec2();
        }

        out.set(this._startPoint$.x, this._startPoint$.y);
        (cclegacy.view as View)._convertToUISpace(out);
        return out;
    }

    /**
     * @en Returns the delta distance from the previous touche to the current one.
     * @zh 获取触点距离上一次事件移动的距离对象，对象包含 x 和 y 属性。
     * @param out - Pass the out object to avoid object creation, very good practice
     */
    public getDelta (out?: Vec2): Vec2 {
        if (!out) {
            out = new Vec2();
        }

        out.set(this._point$);
        out.subtract(this._prevPoint$);
        return out;
    }

    /**
     * @en Returns the delta distance from the previous touche to the current one in UI coordinates.
     * @zh 获取触点距离上一次事件移动在 UI 坐标系中的距离对象，对象包含 x 和 y 属性。
     * @param out - Pass the out object to avoid object creation, very good practice
     */
    public getUIDelta (out?: Vec2): Vec2 {
        if (!out) {
            out = new Vec2();
        }

        _vec2.set(this._point$);
        _vec2.subtract(this._prevPoint$);
        const view = cclegacy.view as View;
        out.set(view.getScaleX(), view.getScaleY());
        Vec2.divide(out, _vec2, out);
        return out;
    }

    /**
     * @en Returns the current touch location in screen coordinates.
     * @zh 获取当前事件在游戏窗口内的坐标位置对象，对象包含 x 和 y 属性。
     * @param out - Pass the out object to avoid object creation, very good practice
     */
    public getLocationInView (out?: Vec2): Vec2 {
        if (!out) {
            out = new Vec2();
        }

        out.set(this._point$.x, (cclegacy.view as View)._designResolutionSize.height - this._point$.y);
        return out;
    }

    /**
     * @en Returns the previous touch location in screen coordinates.
     * @zh 获取触点在上一次事件时在游戏窗口中的位置对象，对象包含 x 和 y 属性。
     * @param out - Pass the out object to avoid object creation, very good practice
     */
    public getPreviousLocationInView (out?: Vec2): Vec2 {
        if (!out) {
            out = new Vec2();
        }

        out.set(this._prevPoint$.x, (cclegacy.view as View)._designResolutionSize.height - this._prevPoint$.y);
        return out;
    }

    /**
     * @en Returns the start touch location in screen coordinates.
     * @zh 获取触点落下时在游戏窗口中的位置对象，对象包含 x 和 y 属性。
     * @param out - Pass the out object to avoid object creation, very good practice
     */
    public getStartLocationInView (out?: Vec2): Vec2 {
        if (!out) {
            out = new Vec2();
        }

        out.set(this._startPoint$.x, (cclegacy.view as View)._designResolutionSize.height - this._startPoint$.y);
        return out;
    }

    /**
     * @en Returns the id of the touch point.
     * @zh 触点的标识 ID，可以用来在多点触摸中跟踪触点。
     */
    public getID (): number {
        return this._id;
    }

    /**
     * @en Resets touch point information.
     * @zh 重置触点相关的信息。
     * @param id - The id of the touch point
     * @param x - x position of the touch point
     * @param y - y position of the touch point
     */
    public setTouchInfo (id: number = 0, x: number = 0, y: number = 0): void {
        this._prevPoint$ = this._point$;
        this._point$ = new Vec2(x || 0, y || 0);
        this._id = id;
        if (!this._startPointCaptured$) {
            this._startPoint$ = new Vec2(this._point$);
            this._startPointCaptured$ = true;
        }
    }

    /**
     * @en Sets touch point location.
     * @zh 设置触点位置。
     * @param point - The location
     */
    public setPoint (point: Vec2): void;

    /**
     * @en Sets touch point location.
     * @zh 设置触点位置。
     * @param x - x position
     * @param y - y position
     */
    public setPoint (x: number, y: number): void;

    public setPoint (x: number | Vec2, y?: number): void {
        if (typeof x === 'object') {
            this._point$.x = x.x;
            this._point$.y = x.y;
        } else {
            this._point$.x = x || 0;
            this._point$.y = y || 0;
        }
        this._lastModified$ = cclegacy.game.frameStartTime;
    }

    /**
     * @en Sets the location previously registered for the current touch.
     * @zh 设置触点在前一次触发时收集的位置。
     * @param point - The location
     */
    public setPrevPoint (point: Vec2): void;

    /**
     * @en Sets the location previously registered for the current touch.
     * @zh 设置触点在前一次触发时收集的位置。
     * @param x - x position
     * @param y - y position
     */
    public setPrevPoint (x: number, y: number): void;

    public setPrevPoint (x: number | Vec2, y?: number): void {
        if (typeof x === 'object') {
            this._prevPoint$ = new Vec2(x.x, x.y);
        } else {
            this._prevPoint$ = new Vec2(x || 0, y || 0);
        }
        this._lastModified$ = cclegacy.game.frameStartTime;
    }

    /**
     * @zh Touch 对象的原始数据不应该被修改。如果你需要这么做，最好克隆一个新的对象。
     * @en The original Touch object shouldn't be modified. If you need to, it's better to clone a new one.
     */
    public clone (): Touch {
        const touchID = this.getID();
        this.getStartLocation(_vec2);
        const clonedTouch = new Touch(_vec2.x, _vec2.y, touchID);
        this.getLocation(_vec2);
        clonedTouch.setPoint(_vec2.x, _vec2.y);
        this.getPreviousLocation(_vec2);
        clonedTouch.setPrevPoint(_vec2);
        return clonedTouch;
    }
}

cclegacy.Touch = Touch;
