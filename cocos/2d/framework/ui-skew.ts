/*
 Copyright (c) 2025 Xiamen Yaji Software Co., Ltd.

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

import { JSB } from 'internal:constants';
import { ccclass, disallowMultiple, executeInEditMode, menu, serializable, type } from 'cc.decorator';
import { Component } from '../../scene-graph/component';
import { cclegacy, IVec2Like, v2, Vec2 } from '../../core';
import { NodeEventType, TransformBit } from '../../scene-graph';
import { TRANSFORM_ON, Node } from '../../scene-graph/node';

const tempVec2 = v2();

@ccclass('cc.UISkew')
@menu('UI/UISkew')
@disallowMultiple
@executeInEditMode
export class UISkew extends Component {
    @serializable
    private _skew: Vec2 = v2();

    // FIXME(cjh): I added this property instead of `Component.enabled` since I found that
    // When in UISkew.onDisable callback, `this.enabled` may still be true.
    private _skewEnabled = false;

    constructor () {
        super();
    }

    /**
     * @engineInternal
     * @mangle
     */
    isSkewEnabled (): boolean {
        return this._skewEnabled;
    }

    protected override __preload (): void {
        this.node._uiProps._uiSkewComp = this;
        if (JSB) {
            (this.node as any)._setSkew(this._skew);
        }
    }

    protected override onEnable (): void {
        this._skewEnabled = true;
        Node._incSkewCompCount();
        this._syncNative(true);
        this._updateNodeTransformFlags();
    }

    protected override onDisable (): void {
        this._skewEnabled = false;
        Node._decSkewCompCount();
        this._syncNative(false);
        this._updateNodeTransformFlags();
    }

    protected override onDestroy (): void {
        this._skewEnabled = false;
        this._syncNative(false);
        this.node._uiProps._uiSkewComp = null;
        this._updateNodeTransformFlags();
    }

    private _syncNative (enabled: boolean): void {
        if (JSB) {
            (this.node as any)._hasSkewComp = enabled;
        }
    }

    /**
     * @en Gets the skew on x axis. Unit is degree.
     * @zh 获取 X 轴斜切角度。
     */
    get x (): number {
        return this._skew.x;
    }

    /**
     * @en Sets the skew on x axis. Unit is degree.
     * @zh 设置 X 轴斜切角度。
     */
    set x (v: number) {
        this._skew.x = v;
        if (JSB) {
            (this.node as any)._setSkewX(v);
        }

        if (this._skewEnabled) {
            this._updateNodeTransformFlags();
        }
    }

    /**
     * @en Gets the skew on y axis. Unit is degree.
     * @zh 获取 Y 轴斜切角度。
     */
    get y (): number {
        return this._skew.y;
    }

    /**
     * @en Sets the skew on y axis. Unit is degree.
     * @zh 设置 Y 轴斜切角度。
     */
    set y (v: number) {
        this._skew.y = v;
        if (JSB) {
            (this.node as any)._setSkewY(v);
        }

        if (this._skewEnabled) {
            this._updateNodeTransformFlags();
        }
    }

    /**
     * @en Gets the skew value of the node. Unit is degree.
     * @zh 获取节点斜切角度。
     */
    @type(Vec2)
    get skew (): Readonly<Vec2> {
        return this._skew;
    }

    /**
     * @en Sets the skew value of the node. Unit is degree.
     * @zh 设置节点斜切角度。
     */
    set skew (value: Readonly<Vec2>) {
        this.setSkew(value);
    }

    /**
     * @en Sets the skew value of the node by Vec2.
     * @zh 设置节点斜切角度。
     * @param @en value The skew value in Vec2. @zh 斜切角度值。
     */
    setSkew (value: Readonly<IVec2Like>): void;
    /**
     * @en Sets the skew value of the node by x and y.
     * @zh 设置节点斜切角度。
     * @param x @en The skew on x axis. @zh X 轴斜切角度。
     * @param y @en The skew on y axis. @zh Y 轴斜切角度。
     */
    setSkew (x: number, y: number): void;
    setSkew (xOrVec2: number | Readonly<IVec2Like>, y?: number): void {
        const v = this._skew;
        if (typeof xOrVec2 === 'number') {
            tempVec2.set(xOrVec2, y);
        } else {
            Vec2.copy(tempVec2, xOrVec2);
        }
        if (Vec2.equals(v, tempVec2)) return;

        v.set(tempVec2);
        if (JSB) {
            (this.node as any)._setSkew(v);
        }

        if (this._skewEnabled) {
            this._updateNodeTransformFlags();
        }
    }

    /**
     * @en Copies and returns the skew value of the node.
     * @zh 拷贝节点斜切角度值并返回。
     * @returns @en The skew value of the node. @zh 节点斜切角度。
     */
    getSkew (out?: Vec2): Vec2 {
        if (!out) out = new Vec2();
        return out.set(this._skew);
    }

    private _updateNodeTransformFlags (): void {
        const node = this.node;
        node.invalidateChildren(TransformBit.SKEW);
        if ((node as any)._eventMask & TRANSFORM_ON) {
            node.emit(NodeEventType.TRANSFORM_CHANGED, TransformBit.SKEW);
        }
    }
}

cclegacy.UISkew = UISkew;
