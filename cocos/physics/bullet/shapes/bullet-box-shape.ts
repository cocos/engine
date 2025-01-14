/* eslint-disable new-cap */
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
import { Vec3 } from '../../../core';
import { BoxCollider, PhysicsSystem } from '../../../../exports/physics-framework';
import { IBoxShape } from '../../spec/i-physics-shape';
import { absolute, VEC3_0 } from '../../utils/util';
import { cocos2BulletVec3 } from '../bullet-utils';
import { BulletCache } from '../bullet-cache';
import { bt } from '../instantiated';

/** @mangle */
export class BulletBoxShape extends BulletShape implements IBoxShape {
    updateSize (): void {
        const hf = BulletCache.instance.BT_V3_0;
        cocos2BulletVec3(hf, this.getMinUnscaledHalfExtents(VEC3_0));
        bt.BoxShape_setUnscaledHalfExtents(this.impl, hf);
        this.updateCompoundTransform();
    }

    get collider (): BoxCollider {
        return this._collider as BoxCollider;
    }

    onComponentSet (): void {
        const hf = BulletCache.instance.BT_V3_0;
        cocos2BulletVec3(hf, this.getMinUnscaledHalfExtents(VEC3_0));
        this._impl = bt.BoxShape_new(hf);
        this.updateScale();
    }

    updateScale (): void {
        super.updateScale();
        const bt_v3 = BulletCache.instance.BT_V3_0;
        bt.CollisionShape_setLocalScaling(this._impl, cocos2BulletVec3(bt_v3, this.getMinScale(VEC3_0)));
        this.updateCompoundTransform();
    }

    getMinUnscaledHalfExtents (out: Vec3): Vec3 {
        const size = this.collider.size;
        const ws = absolute(VEC3_0.set(this._collider.node.worldScale));
        const minVolumeSize = PhysicsSystem.instance.minVolumeSize;
        const halfSizeX = size.x / 2; const halfSizeY = size.y / 2; const halfSizeZ = size.z / 2;
        const halfX = halfSizeX * ws.x < minVolumeSize ? minVolumeSize / ws.x : halfSizeX;
        const halfY = halfSizeY * ws.y < minVolumeSize ? minVolumeSize / ws.y : halfSizeY;
        const halfZ = halfSizeZ * ws.z < minVolumeSize ? minVolumeSize / ws.z : halfSizeZ;
        out.set(halfX, halfY, halfZ);
        return out;
    }

    getMinScale (out: Vec3): Vec3 {
        const size = this.collider.size;
        const ws = absolute(VEC3_0.set(this._collider.node.worldScale));
        const minVolumeSize = PhysicsSystem.instance.minVolumeSize;
        const halfSizeX = size.x / 2; const halfSizeY = size.y / 2; const halfSizeZ = size.z / 2;
        const scaleX = halfSizeX * ws.x < minVolumeSize ? minVolumeSize / halfSizeX : ws.x;
        const scaleY = halfSizeY * ws.y < minVolumeSize ? minVolumeSize / halfSizeY : ws.y;
        const scaleZ = halfSizeZ * ws.z < minVolumeSize ? minVolumeSize / halfSizeZ : ws.z;
        out.set(scaleX, scaleY, scaleZ);
        return out;
    }
}
