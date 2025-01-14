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
import { PlaneCollider } from '../../../../exports/physics-framework';
import { cocos2BulletVec3 } from '../bullet-utils';
import { IPlaneShape } from '../../spec/i-physics-shape';
import { IVec3Like } from '../../../core';
import { BulletCache } from '../bullet-cache';
import { bt } from '../instantiated';

/** @mangle */
export class BulletPlaneShape extends BulletShape implements IPlaneShape {
    setNormal (v: IVec3Like): void {
        cocos2BulletVec3(bt.StaticPlaneShape_getPlaneNormal(this.impl), v);
        this.updateCompoundTransform();
    }

    setConstant (v: number): void {
        bt.StaticPlaneShape_setPlaneConstant(this.impl, v);
        this.updateCompoundTransform();
    }

    updateScale (): void {
        super.updateScale();
        const bt_v3 = BulletCache.instance.BT_V3_0;
        cocos2BulletVec3(bt_v3, this._collider.node.worldScale);
        bt.CollisionShape_setLocalScaling(this._impl, bt_v3);
        this.updateCompoundTransform();
    }

    get collider (): PlaneCollider {
        return this._collider as PlaneCollider;
    }

    onComponentSet (): void {
        const normal = BulletCache.instance.BT_V3_0;
        cocos2BulletVec3(normal, this.collider.normal);
        this._impl = bt.StaticPlaneShape_new(normal, this.collider.constant);
        this.updateScale();
    }
}
