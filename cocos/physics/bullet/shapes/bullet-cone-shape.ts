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
import { ConeCollider } from '../../../../exports/physics-framework';
import { ICylinderShape } from '../../spec/i-physics-shape';
import { IVec3Like, absMax } from '../../../core';
import { bt } from '../instantiated';
import { BulletCache } from '../bullet-cache';

/** @mangle */
export class BulletConeShape extends BulletShape implements ICylinderShape {
    setHeight (v: number): void {
        this.updateProperties(
            this.collider.radius,
            this.collider.height,
            this.collider.direction,
            this._collider.node.worldScale,
        );
    }

    setDirection (v: number): void {
        this.updateProperties(
            this.collider.radius,
            this.collider.height,
            this.collider.direction,
            this._collider.node.worldScale,
        );
    }

    setRadius (v: number): void {
        this.updateProperties(
            this.collider.radius,
            this.collider.height,
            this.collider.direction,
            this._collider.node.worldScale,
        );
    }

    get impl (): number {
        return this._impl;
    }

    get collider (): ConeCollider {
        return this._collider as ConeCollider;
    }

    onComponentSet (): void {
        this._impl = bt.ConeShape_new(0.5, 1);
        this.setRadius(this.collider.radius);
    }

    updateScale (): void {
        super.updateScale();
        this.setRadius(this.collider.radius);
    }

    updateProperties (radius: number, height: number, direction: number, scale: IVec3Like): void {
        const ws = scale;
        const upAxis = direction;
        let wr: number; let wh: number;
        if (upAxis === 1) {
            wh = height * Math.abs(ws.y);
            wr = radius * Math.abs(absMax(ws.x, ws.z));
        } else if (upAxis === 0) {
            wh = height * Math.abs(ws.x);
            wr = radius * Math.abs(absMax(ws.y, ws.z));
        } else {
            wh = height * Math.abs(ws.z);
            wr = radius * Math.abs(absMax(ws.x, ws.y));
        }
        bt.ConeShape_setRadius(this._impl, wr);
        bt.ConeShape_setHeight(this._impl, wh);
        bt.ConeShape_setConeUpIndex(this._impl, upAxis);

        const bt_v3 = BulletCache.instance.BT_V3_0;
        bt.Vec3_set(bt_v3, 1, 1, 1);
        bt.CollisionShape_setLocalScaling(this._impl, bt_v3);
        this.updateCompoundTransform();
    }
}
