/*
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

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

import { ccclass, executeInEditMode, serializable, playOnFocus, menu, help, editable, type } from 'cc.decorator';
import { EDITOR_NOT_IN_PREVIEW } from 'internal:constants';
import { UIRenderer } from '../2d/framework';
import { Texture2D } from '../asset/assets/texture-2d';
import { IBatcher } from '../2d/renderer/i-batcher';
import { Vec2 } from '../core';

class Point {
    public point = new Vec2();
    public dir = new Vec2();
    public distance = 0;
    public time = 0;

    constructor (point?: Vec2, dir?: Vec2) {
        if (point) this.point.set(point);
        if (dir) this.dir.set(dir);
    }

    public setPoint (x, y): void {
        this.point.x = x;
        this.point.y = y;
    }

    public setDir (x, y): void {
        this.dir.x = x;
        this.dir.y = y;
    }
}

/**
 * @en
 * cc.MotionStreak manages a Ribbon based on it's motion in absolute space.                 <br/>
 * You construct it with a fadeTime, minimum segment size, texture path, texture            <br/>
 * length and color. The fadeTime controls how long it takes each vertex in                 <br/>
 * the streak to fade out, the minimum segment size it how many pixels the                  <br/>
 * streak will move before adding a new ribbon segment, and the texture                     <br/>
 * length is the how many pixels the texture is stretched across. The texture               <br/>
 * is vertically aligned along the streak segment.
 * @zh 运动轨迹，用于游戏对象的运动轨迹上实现拖尾渐隐效果。
 */
@ccclass('cc.MotionStreak')
@executeInEditMode
@playOnFocus
@menu('Effects/MotionStreak')
@help('i18n:COMPONENT.help_url.motionStreak')
export class MotionStreak extends UIRenderer {
    public static Point = Point;

    constructor () {
        super();
    }

    /**
     * @en Preview the trailing effect in editor mode.
     * @zh 在编辑器模式下预览拖尾效果。
     */
    @editable
    public get preview (): boolean {
        return this._preview;
    }

    public set preview (val: boolean) {
        this._preview = val;
        this.reset();
    }
    /**
     * @en The fade time to fade.
     * @zh 拖尾的渐隐时间，以秒为单位。
     * @example
     * motionStreak.fadeTime = 3;
     */
    @editable
    public get fadeTime (): number {
        return this._fadeTime;
    }

    public set fadeTime (val) {
        this._fadeTime = val;
        this.reset();
    }
    /**
     * @en The minimum segment size.
     * @zh 拖尾之间最小距离。
     * @example
     * motionStreak.minSeg = 3;
     */
    @editable
    public get minSeg (): number {
        return this._minSeg;
    }
    public set minSeg (val) {
        this._minSeg = val;
    }
    /**
     * @en The stroke's width.
     * @zh 拖尾的宽度。
     * @example
     * motionStreak.stroke = 64;
     */
    @editable
    public get stroke (): number {
        return this._stroke;
    }
    public set stroke (val) {
        this._stroke = val;
    }

    /**
     * @en The texture of the MotionStreak.
     * @zh 拖尾的贴图。
     * @example
     * motionStreak.texture = newTexture;
     */
    @type(Texture2D)
    public get texture (): Texture2D | null {
        return this._texture;
    }

    public set texture (val) {
        if (this._texture === val) return;

        this._texture = val;
    }
    /**
     * @en The fast Mode.
     * @zh 是否启用了快速模式。当启用快速模式，新的点会被更快地添加，但精度较低。
     * @example
     * motionStreak.fastMode = true;
     */
    @editable
    public get fastMode (): boolean {
        return this._fastMode;
    }
    public set fastMode (val: boolean) {
        this._fastMode = val;
    }

    public get points (): Point[] {
        return this._points;
    }

    @serializable
    private _preview = false;
    @serializable
    private _fadeTime = 1;
    @serializable
    private _minSeg = 1;
    @serializable
    private _stroke = 64;
    @serializable
    private _texture: Texture2D | null  = null;
    @serializable
    private _fastMode = false;
    private _points: Point[] = [];

    public onEnable (): void {
        super.onEnable();
        this.reset();
    }

    protected _flushAssembler (): void {
        const assembler = MotionStreak.Assembler.getAssembler(this);

        if (this._assembler !== assembler) {
            this._assembler = assembler;
        }

        if (!this._renderData) {
            if (this._assembler && this._assembler.createData) {
                this._renderData = this._assembler.createData(this);
                this._renderData!.material = this.material;
                this._updateColor();
            }
        }
    }

    public onFocusInEditor (): void {
        if (this._preview) {
            this.reset();
        }
    }

    public onLostFocusInEditor (): void {
        if (this._preview) {
            this.reset();
        }
    }

    /**
     * @en Remove all living segments of the ribbon.
     * @zh 删除当前所有的拖尾片段。
     * @example
     * // Remove all living segments of the ribbon.
     * myMotionStreak.reset();
     */
    public reset (): void {
        this._points.length = 0;
        if (this._renderData) this._renderData.clear();
    }

    public lateUpdate (dt): void {
        if (EDITOR_NOT_IN_PREVIEW && !this._preview) return;
        if (this._assembler) this._assembler.update(this, dt);
    }

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _render (render: IBatcher): void {
        render.commitComp(this, this._renderData, this._texture, this._assembler, null);
    }
}
