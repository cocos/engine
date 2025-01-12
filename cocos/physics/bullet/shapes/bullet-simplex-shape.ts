/*
 Copyright (c) 2020-2023 Xiamen Yaji Software Co., Ltd.

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

import { BulletShape } from './bullet-shape';
import { SimplexCollider } from '../../../../exports/physics-framework';
import { cocos2BulletVec3 } from '../bullet-utils';
import { ISimplexShape } from '../../spec/i-physics-shape';
import { IVec3Like } from '../../../core';
import { bt } from '../instantiated';
import { BulletCache } from '../bullet-cache';

/** @mangle */
export class BulletSimplexShape extends BulletShape implements ISimplexShape {
    setShapeType (v: SimplexCollider.ESimplexType): void {
        // TODO:
    }

    setVertices (v: IVec3Like[]): void {
        // TODO:
    }

    get collider (): SimplexCollider {
        return this._collider as SimplexCollider;
    }

    protected onComponentSet (): void {
        this._impl = bt.SimplexShape_new();
        const length = this.collider.shapeType;
        const vertices = this.collider.vertices;
        const bt_v3 = BulletCache.instance.BT_V3_0;
        for (let i = 0; i < length; i++) {
            bt.SimplexShape_addVertex(this._impl, cocos2BulletVec3(bt_v3, vertices[i]));
        }
        bt.CollisionShape_setLocalScaling(this._impl, cocos2BulletVec3(bt_v3, this._collider.node.worldScale));
    }

    onLoad (): void {
        super.onLoad();
        this.collider.updateVertices();
    }

    updateScale (): void {
        super.updateScale();
        const bt_v3 = BulletCache.instance.BT_V3_0;
        bt.CollisionShape_setLocalScaling(this._impl, cocos2BulletVec3(bt_v3, this._collider.node.worldScale));
    }
}
