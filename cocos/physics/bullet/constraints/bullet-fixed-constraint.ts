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
import { IFixedConstraint } from '../../spec/i-physics-constraint';
import { Mat4 } from '../../../core';
import { FixedConstraint } from '../../framework';
import { BulletRigidBody } from '../bullet-rigid-body';
import { BulletCache, CC_MAT4_0, CC_QUAT_0, CC_V3_0 } from '../bullet-cache';
import { bt } from '../instantiated';
import { cocos2BulletQuat, cocos2BulletVec3 } from '../bullet-utils';

/** @mangle */
export class BulletFixedConstraint extends BulletConstraint implements IFixedConstraint {
    setBreakForce (v: number): void {
        bt.TypedConstraint_setMaxImpulseThreshold(this._impl, v);
    }

    setBreakTorque (v: number): void {
        // not supported
    }

    get constraint (): FixedConstraint {
        return this._com as FixedConstraint;
    }

    onComponentSet (): void {
        const cb = this.constraint.connectedBody;
        const bodyA = (this._rigidBody.body as BulletRigidBody).impl;
        const bodyB = cb ? (cb.body as BulletRigidBody).impl : bt.TypedConstraint_getFixedBody();
        const trans0 = BulletCache.instance.BT_TRANSFORM_0;
        const trans1 = BulletCache.instance.BT_TRANSFORM_1;
        this._impl = bt.FixedConstraint_new(bodyA, bodyB, trans0, trans1);
        this.setBreakForce(this.constraint.breakForce);
        this.setBreakTorque(this.constraint.breakTorque);
        this.updateFrames();
        this.updateDebugDrawSize();
    }

    updateFrames (): void {
        const cb = this.constraint.connectedBody;
        const bodyA = (this._rigidBody.body as BulletRigidBody).sharedBody;

        const pos = CC_V3_0;
        const rot = CC_QUAT_0;
        const trans0 = BulletCache.instance.BT_TRANSFORM_0;
        const trans1 = BulletCache.instance.BT_TRANSFORM_1;
        const quat = BulletCache.instance.BT_QUAT_0;

        const trans = CC_MAT4_0;
        // the local frame transform respect to bodyA
        Mat4.fromRT(trans, bodyA.node.worldRotation, bodyA.node.worldPosition);
        Mat4.invert(trans, trans);
        Mat4.getRotation(rot, trans);
        Mat4.getTranslation(pos, trans);
        cocos2BulletVec3(bt.Transform_getOrigin(trans0), pos);
        cocos2BulletQuat(quat, rot);
        bt.Transform_setRotation(trans0, quat);

        if (cb) {
            // the local frame transform respect to bodyB
            const bodyB = (cb.body as BulletRigidBody).sharedBody;
            Mat4.fromRT(trans, bodyB.node.worldRotation, bodyB.node.worldPosition);
            Mat4.invert(trans, trans);
            Mat4.getRotation(rot, trans);
            Mat4.getTranslation(pos, trans);
            cocos2BulletVec3(bt.Transform_getOrigin(trans1), pos);
            cocos2BulletQuat(quat, rot);
            bt.Transform_setRotation(trans1, quat);
        } else {
            bt.Transform_setIdentity(trans1);
        }

        bt.FixedConstraint_setFrames(this._impl, trans0, trans1);
    }

    updateScale0 (): void {
        this.updateFrames();
    }

    updateScale1 (): void {
        this.updateFrames();
    }
}
