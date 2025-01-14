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

/* eslint-disable new-cap */
import { BulletConstraint } from './bullet-constraint';
import { IPointToPointConstraint } from '../../spec/i-physics-constraint';
import { IVec3Like, Vec3 } from '../../../core';
import { PointToPointConstraint } from '../../framework';
import { BulletRigidBody } from '../bullet-rigid-body';
import { BulletCache, CC_V3_0 } from '../bullet-cache';
import { bt } from '../instantiated';
import { cocos2BulletVec3 } from '../bullet-utils';

/** @mangle */
export class BulletP2PConstraint extends BulletConstraint implements IPointToPointConstraint {
    setPivotA (v: IVec3Like): void {
        const cs = this.constraint;
        const pivotA = BulletCache.instance.BT_V3_0;
        Vec3.multiply(CC_V3_0, cs.node.worldScale, cs.pivotA);
        cocos2BulletVec3(pivotA, CC_V3_0);
        bt.P2PConstraint_setPivotA(this._impl, pivotA);
        if (!cs.connectedBody) this.setPivotB(cs.pivotB);
    }

    setPivotB (v: IVec3Like): void {
        const cs = this.constraint;
        const node = this._rigidBody.node;
        const pivotB = BulletCache.instance.BT_V3_0;
        const cb = cs.connectedBody;
        if (cb) {
            Vec3.multiply(CC_V3_0, cb.node.worldScale, cs.pivotB);
            cocos2BulletVec3(pivotB, CC_V3_0);
        } else {
            Vec3.multiply(CC_V3_0, node.worldScale, cs.pivotA);
            Vec3.transformQuat(CC_V3_0, CC_V3_0, node.worldRotation);
            Vec3.add(CC_V3_0, CC_V3_0, node.worldPosition);
            cocos2BulletVec3(pivotB, CC_V3_0);
        }
        bt.P2PConstraint_setPivotB(this._impl, pivotB);
    }

    get constraint (): PointToPointConstraint {
        return this._com as PointToPointConstraint;
    }

    onComponentSet (): void {
        const cb = this.constraint.connectedBody;
        const bodyA = (this._rigidBody.body as BulletRigidBody).impl;
        const bodyB = cb ? (cb.body as BulletRigidBody).impl : bt.TypedConstraint_getFixedBody();
        const pivotA = BulletCache.instance.BT_V3_0;
        const pivotB = BulletCache.instance.BT_V3_1;
        this._impl = bt.P2PConstraint_new(bodyA, bodyB, pivotA, pivotB);
        this.setPivotA(this.constraint.pivotA);
        this.setPivotB(this.constraint.pivotB);
        this.updateDebugDrawSize();
    }

    updateScale0 (): void {
        this.setPivotA(this.constraint.pivotA);
    }

    updateScale1 (): void {
        this.setPivotB(this.constraint.pivotB);
    }
}
