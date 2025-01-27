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
import { IHingeConstraint } from '../../spec/i-physics-constraint';
import { IVec3Like, Quat, Vec3 } from '../../../core';
import { HingeConstraint, PhysicsSystem } from '../../framework';
import { BulletRigidBody } from '../bullet-rigid-body';
import { BulletCache, CC_QUAT_0, CC_QUAT_1, CC_V3_0 } from '../bullet-cache';
import { bt } from '../instantiated';
import { cocos2BulletQuat, cocos2BulletVec3, force2Impulse } from '../bullet-utils';
import { toRadian } from '../../../core/math';

/** @mangle */
export class BulletHingeConstraint extends BulletConstraint implements IHingeConstraint {
    setPivotA (v: IVec3Like): void {
        this.updateFrames();
    }

    setPivotB (v: IVec3Like): void {
        this.updateFrames();
    }

    setAxis (v: IVec3Like): void {
        this.updateFrames();
    }

    setLimitEnabled (v: boolean): void {
        if (this.constraint.limitEnabled) {
            bt.HingeConstraint_setLimit(this._impl, toRadian(this.constraint.lowerLimit), toRadian(this.constraint.upperLimit), 0.9, 0.3, 1.0);
        } else {
            bt.HingeConstraint_setLimit(this._impl, 1, 0, 0.9, 0.3, 1.0);
        }
    }
    setLowerLimit (min: number): void {
        if (this.constraint.limitEnabled) {
            bt.HingeConstraint_setLimit(this._impl, toRadian(this.constraint.lowerLimit), toRadian(this.constraint.upperLimit), 0.9, 0.3, 1.0);
        }
    }
    setUpperLimit (max: number): void {
        if (this.constraint.limitEnabled) {
            bt.HingeConstraint_setLimit(this._impl, toRadian(this.constraint.lowerLimit), toRadian(this.constraint.upperLimit), 0.9, 0.3, 1.0);
        }
    }
    setMotorEnabled (v: boolean): void {
        bt.HingeConstraint_enableMotor(this._impl, v);
        const velocity = -this.constraint.motorVelocity / 60.0;
        const impulse = force2Impulse(this.constraint.motorForceLimit, PhysicsSystem.instance.fixedTimeStep);
        bt.HingeConstraint_setMotorVelocity(this._impl, velocity);
        bt.HingeConstraint_setMaxMotorImpulse(this._impl, impulse);
    }
    setMotorVelocity (v: number): void {
        if (this.constraint.motorEnabled) {
            const velocity = -v / 60.0;
            bt.HingeConstraint_setMotorVelocity(this._impl, velocity);
        }
    }
    setMotorForceLimit (v: number): void {
        if (this.constraint.motorEnabled) {
            const impulse = force2Impulse(v, PhysicsSystem.instance.fixedTimeStep);
            bt.HingeConstraint_setMaxMotorImpulse(this._impl, impulse);
        }
    }

    get constraint (): HingeConstraint {
        return this._com as HingeConstraint;
    }

    onComponentSet (): void {
        const cb = this.constraint.connectedBody;
        const bodyA = (this._rigidBody.body as BulletRigidBody).impl;
        const bodyB = cb ? (cb.body as BulletRigidBody).impl : bt.TypedConstraint_getFixedBody();
        const trans0 = BulletCache.instance.BT_TRANSFORM_0;
        const trans1 = BulletCache.instance.BT_TRANSFORM_1;
        this._impl = bt.HingeConstraint_new(bodyA, bodyB, trans0, trans1);

        this.setLimitEnabled(this.constraint.limitEnabled);
        this.setLowerLimit(this.constraint.lowerLimit);
        this.setUpperLimit(this.constraint.upperLimit);
        this.setMotorEnabled(this.constraint.motorEnabled);
        this.setMotorVelocity(this.constraint.motorVelocity);
        this.setMotorForceLimit(this.constraint.motorForceLimit);
        this.updateFrames();
        this.updateDebugDrawSize();
    }

    updateFrames (): void {
        const cs = this.constraint;
        const node = cs.node;
        const v3_0 = CC_V3_0;
        const rot_0 = CC_QUAT_0;
        const rot_1 = CC_QUAT_1;
        const trans0 = BulletCache.instance.BT_TRANSFORM_0;

        // offset of axis in local frame of bodyA
        Vec3.multiply(v3_0, node.worldScale, cs.pivotA);
        cocos2BulletVec3(bt.Transform_getOrigin(trans0), v3_0);
        // rotation of axis in local frame of bodyA
        const quat = BulletCache.instance.BT_QUAT_0;
        Vec3.normalize(v3_0, cs.axis);
        Quat.rotationTo(rot_1, Vec3.UNIT_Z, v3_0);
        cocos2BulletQuat(quat, rot_1);
        bt.Transform_setRotation(trans0, quat);

        const trans1 = BulletCache.instance.BT_TRANSFORM_1;
        const cb = this.constraint.connectedBody;
        if (cb) {
            // offset of axis in local frame of bodyB
            Vec3.multiply(v3_0, cb.node.worldScale, cs.pivotB);
            // rotation of axis in local frame of bodyB
            Quat.multiply(rot_1, node.worldRotation, rot_1);
            Quat.invert(rot_0, cb.node.worldRotation);
            Quat.multiply(rot_1, rot_0, rot_1);
        } else {
            // offset of axis in local frame of bodyB
            Vec3.multiply(v3_0, node.worldScale, cs.pivotA);
            Vec3.transformQuat(v3_0, v3_0, node.worldRotation);
            Vec3.add(v3_0, v3_0, node.worldPosition);
            // rotation of axis in local frame of bodyB
            Quat.multiply(rot_1, node.worldRotation, rot_1);
        }
        cocos2BulletVec3(bt.Transform_getOrigin(trans1), v3_0);
        cocos2BulletQuat(quat, rot_1);
        bt.Transform_setRotation(trans1, quat);
        bt.HingeConstraint_setFrames(this._impl, trans0, trans1);
    }

    updateScale0 (): void {
        this.updateFrames();
    }

    updateScale1 (): void {
        this.updateFrames();
    }
}
