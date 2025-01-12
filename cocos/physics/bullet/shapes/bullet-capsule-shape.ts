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

import { absMax, IVec3Like } from '../../../core';
import { BulletShape } from './bullet-shape';
import { CapsuleCollider } from '../../../../exports/physics-framework';
import { ICapsuleShape } from '../../spec/i-physics-shape';
import { bt } from '../instantiated';

/** @mangle */
export class BulletCapsuleShape extends BulletShape implements ICapsuleShape {
    setCylinderHeight (v: number): void {
        this.updateProperties(
            this.collider.radius,
            this.collider.cylinderHeight,
            this.collider.direction,
            this._collider.node.worldScale,
        );
    }

    setDirection (v: number): void {
        this.updateProperties(
            this.collider.radius,
            this.collider.cylinderHeight,
            this.collider.direction,
            this._collider.node.worldScale,
        );
    }

    setRadius (v: number): void {
        this.updateProperties(
            this.collider.radius,
            this.collider.cylinderHeight,
            this.collider.direction,
            this._collider.node.worldScale,
        );
    }

    get collider (): CapsuleCollider {
        return this._collider as CapsuleCollider;
    }

    onComponentSet (): void {
        this._impl = bt.CapsuleShape_new(0.5, 1);
        this.setRadius(this.collider.radius);
    }

    updateScale (): void {
        super.updateScale();
        this.setRadius(this.collider.radius);
    }

    updateProperties (radius: number, height: number, direction: number, scale: IVec3Like): void {
        const ws = scale;
        const upAxis = direction;
        let wr: number; let halfH: number;
        if (upAxis === 1) {
            wr = radius * Math.abs(absMax(ws.x, ws.z));
            halfH = height / 2 * Math.abs(ws.y);
        } else if (upAxis === 0) {
            wr = radius * Math.abs(absMax(ws.y, ws.z));
            halfH = height / 2 * Math.abs(ws.x);
        } else {
            wr = radius * Math.abs(absMax(ws.x, ws.y));
            halfH = height / 2 * Math.abs(ws.z);
        }
        bt.CapsuleShape_updateProp(this._impl, wr, halfH, upAxis);
        this.updateCompoundTransform();
    }
}
