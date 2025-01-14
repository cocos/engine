/*
 Copyright (c) 2023 Xiamen Yaji Software Co., Ltd.

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
import { IConfigurableConstraint } from '../../spec/i-physics-constraint';
import { error, IVec3Like, Mat4, Quat, Vec3, toRadian } from '../../../core';
import { ConfigurableConstraint, EConstraintMode, EDriverMode, PhysicsSystem } from '../../framework';
import { bt } from '../instantiated';
import { BulletRigidBody } from '../bullet-rigid-body';
import { BulletCache, CC_QUAT_0, CC_QUAT_1, CC_V3_0, CC_MAT4_0, CC_V3_1 } from '../bullet-cache';
import { cocos2BulletQuat, cocos2BulletVec3, force2Impulse } from '../bullet-utils';

enum RotateOrder {
    RO_XYZ = 0,
    RO_XZY,
    RO_YXZ,
    RO_YZX,
    RO_ZXY,
    RO_ZYX
}

enum BulletDofAxis {
    X = 0,
    Y = 1,
    Z = 2,
    TWIST = 3,
    SWING1 = 4,
    SWING2 = 5,
}

/** @mangle */
export class BulletConfigurableConstraint extends BulletConstraint implements IConfigurableConstraint {
    private _setLimit (v: EConstraintMode, axis: number, lower: number, upper: number): void  {
        switch (v) {
        case EConstraintMode.LOCKED:
            bt.Generic6DofSpring2Constraint_setLimit(this._impl, axis, 0, 0);
            break;
        case EConstraintMode.LIMITED:
            bt.Generic6DofSpring2Constraint_setLimit(this._impl, axis, lower, upper);
            break;
        case EConstraintMode.FREE:
            bt.Generic6DofSpring2Constraint_setLimit(this._impl, axis, 1, 0);
            break;
        default:
            break;
        }
    }

    setConstraintMode (idx: number, v: EConstraintMode): void {
        const ll = this.constraint.linearLimitSettings;
        const al = this.constraint.angularLimitSettings;

        const lowers: number[] = [0, 0, 0];
        const uppers: number[] = [0, 0, 0];

        let upper = 0; let lower = 0;

        switch (idx) {
        case 0:
        case 1:
        case 2:
            Vec3.toArray(lowers, ll.lower);
            Vec3.toArray(uppers, ll.upper);
            lower = lowers[idx];
            upper = uppers[idx];
            break;
        case 3:
            upper = toRadian(al.twistExtent) * 0.5;
            lower = -upper;
            break;
        case 4:
            upper = toRadian(al.swingExtent1) * 0.5;
            lower = -upper;
            break;
        case 5:
            upper = toRadian(al.swingExtent2) * 0.5;
            lower = -upper;
            break;

        default:
            error(`idx should be in [0, 5], but give ${idx}`);
            break;
        }

        this._setLimit(v, idx, lower, upper);
    }

    setLinearLimit (idx: number, lower: number, upper: number): void {
        let cm = 0;
        const ll = this.constraint.linearLimitSettings;
        switch (idx) {
        case 0: cm = ll.xMotion; break;
        case 1: cm = ll.yMotion; break;
        case 2: cm = ll.zMotion; break;
        default: break;
        }
        this._setLimit(cm, idx, lower, upper);
    }
    setAngularExtent (twist: number, swing1: number, swing2: number): void {
        const al = this.constraint.angularLimitSettings;
        this._setLimit(al.twistMotion, BulletDofAxis.TWIST, -toRadian(twist) * 0.5, toRadian(twist) * 0.5);
        this._setLimit(al.swingMotion1, BulletDofAxis.SWING1, -toRadian(swing1) * 0.5, toRadian(swing1) * 0.5);
        this._setLimit(al.swingMotion2, BulletDofAxis.SWING2, -toRadian(swing2) * 0.5, toRadian(swing2) * 0.5);
    }
    setSwingSoftConstraint (v: boolean): void {
        bt.Generic6DofSpring2Constraint_enableSpring(this._impl, BulletDofAxis.SWING1, v);
        bt.Generic6DofSpring2Constraint_enableSpring(this._impl, BulletDofAxis.SWING2, v);
    }
    setTwistSoftConstraint (v: boolean): void {
        bt.Generic6DofSpring2Constraint_enableSpring(this._impl, BulletDofAxis.TWIST, v);
    }
    setLinearSoftConstraint (v: boolean): void {
        bt.Generic6DofSpring2Constraint_enableSpring(this._impl, BulletDofAxis.X, v);
        bt.Generic6DofSpring2Constraint_enableSpring(this._impl, BulletDofAxis.Y, v);
        bt.Generic6DofSpring2Constraint_enableSpring(this._impl, BulletDofAxis.Z, v);
    }
    setLinearStiffness (v: number): void {
        bt.Generic6DofSpring2Constraint_setStiffness(this._impl, BulletDofAxis.X, v);
        bt.Generic6DofSpring2Constraint_setStiffness(this._impl, BulletDofAxis.Y, v);
        bt.Generic6DofSpring2Constraint_setStiffness(this._impl, BulletDofAxis.Z, v);
    }
    setLinearDamping (v: number): void {
        bt.Generic6DofSpring2Constraint_setDamping(this._impl, BulletDofAxis.X, v);
        bt.Generic6DofSpring2Constraint_setDamping(this._impl, BulletDofAxis.Y, v);
        bt.Generic6DofSpring2Constraint_setDamping(this._impl, BulletDofAxis.Z, v);
    }
    setLinearRestitution (v: number): void {
        bt.Generic6DofSpring2Constraint_setBounce(this._impl, BulletDofAxis.X, v);
        bt.Generic6DofSpring2Constraint_setBounce(this._impl, BulletDofAxis.Y, v);
        bt.Generic6DofSpring2Constraint_setBounce(this._impl, BulletDofAxis.Z, v);
    }
    setSwingStiffness (v: number): void {
        bt.Generic6DofSpring2Constraint_setStiffness(this._impl, BulletDofAxis.SWING1, v);
        bt.Generic6DofSpring2Constraint_setStiffness(this._impl, BulletDofAxis.SWING2, v);
    }
    setSwingDamping (v: number): void {
        bt.Generic6DofSpring2Constraint_setDamping(this._impl, BulletDofAxis.SWING1, v);
        bt.Generic6DofSpring2Constraint_setDamping(this._impl, BulletDofAxis.SWING2, v);
    }
    setSwingRestitution (v: number): void {
        bt.Generic6DofSpring2Constraint_setBounce(this._impl, BulletDofAxis.SWING1, v);
        bt.Generic6DofSpring2Constraint_setBounce(this._impl, BulletDofAxis.SWING2, v);
    }
    setTwistStiffness (v: number): void {
        bt.Generic6DofSpring2Constraint_setStiffness(this._impl, BulletDofAxis.TWIST, v);
    }
    setTwistDamping (v: number): void {
        bt.Generic6DofSpring2Constraint_setDamping(this._impl, BulletDofAxis.TWIST, v);
    }
    setTwistRestitution (v: number): void {
        bt.Generic6DofSpring2Constraint_setBounce(this._impl, BulletDofAxis.TWIST, v);
    }

    setDriverMode (idx: number, v: EDriverMode): void {
        if (v === EDriverMode.DISABLED) {
            bt.Generic6DofSpring2Constraint_enableMotor(this._impl, idx, false);
        } else if (v === EDriverMode.SERVO) {
            bt.Generic6DofSpring2Constraint_enableMotor(this._impl, idx, true);
            bt.Generic6DofSpring2Constraint_setServo(this._impl, idx, true);
        } else if (v === EDriverMode.INDUCTION) {
            bt.Generic6DofSpring2Constraint_enableMotor(this._impl, idx, true);
            bt.Generic6DofSpring2Constraint_setServo(this._impl, idx, false);
        }
    }

    _updateMotorTargetAndVelocity (index: number): void {
        let mode = EDriverMode.DISABLED;
        let axis = 0;
        let target = 0;
        let velocity = 0;
        const ld = this.constraint.linearDriverSettings;
        const ad = this.constraint.angularDriverSettings;
        switch (index) {
        case 0:
            axis = BulletDofAxis.X;
            mode = ld.xDrive;
            target = ld.targetPosition.x;
            velocity = -ld.targetVelocity.x;
            break;
        case 1:
            axis = BulletDofAxis.Y;
            mode = ld.yDrive;
            target = ld.targetPosition.y;
            velocity = -ld.targetVelocity.y;
            break;
        case 2:
            axis = BulletDofAxis.Z;
            mode = ld.zDrive;
            target = ld.targetPosition.z;
            velocity = -ld.targetVelocity.z;
            break;
        case 3:
            axis = BulletDofAxis.TWIST;
            mode = ad.twistDrive;
            target = -toRadian(ad.targetOrientation.x);
            velocity = -toRadian(ad.targetVelocity.x);
            break;
        case 4: axis = BulletDofAxis.SWING1;
            mode = ad.swingDrive1;
            target = -toRadian(ad.targetOrientation.y);
            velocity = -toRadian(ad.targetVelocity.y);
            break;
        case 5: axis = BulletDofAxis.SWING2;
            mode = ad.swingDrive2;
            target = -toRadian(ad.targetOrientation.z);
            velocity = -toRadian(ad.targetVelocity.z);
            break;
        default: break;
        }
        const strength = index > 2 ? ad.strength : ld.strength;
        bt.Generic6DofSpring2Constraint_setServoTarget(this._impl, axis, target);
        if (mode === EDriverMode.SERVO) {
            if (index > 2) {
                bt.Generic6DofSpring2Constraint_setTargetVelocity(this._impl, axis, -target * strength * 0.1);
            } else {
                bt.Generic6DofSpring2Constraint_setTargetVelocity(this._impl, axis, target * strength * 0.1);
            }
        } else if (mode === EDriverMode.INDUCTION) {
            bt.Generic6DofSpring2Constraint_setTargetVelocity(this._impl, axis, velocity);
        }
    }

    setLinearMotorTarget (v: IVec3Like): void {
        this._updateMotorTargetAndVelocity(0);
        this._updateMotorTargetAndVelocity(1);
        this._updateMotorTargetAndVelocity(2);
    }
    setLinearMotorVelocity (v: IVec3Like): void {
        this._updateMotorTargetAndVelocity(0);
        this._updateMotorTargetAndVelocity(1);
        this._updateMotorTargetAndVelocity(2);
    }
    setLinearMotorForceLimit (v: number): void {
        bt.Generic6DofSpring2Constraint_setMaxMotorForce(this._impl, BulletDofAxis.X, v);
        bt.Generic6DofSpring2Constraint_setMaxMotorForce(this._impl, BulletDofAxis.Y, v);
        bt.Generic6DofSpring2Constraint_setMaxMotorForce(this._impl, BulletDofAxis.Z, v);
    }

    setAngularMotorTarget (v: IVec3Like): void {
        this._updateMotorTargetAndVelocity(3);
        this._updateMotorTargetAndVelocity(4);
        this._updateMotorTargetAndVelocity(5);
    }
    setAngularMotorVelocity (v: IVec3Like): void {
        this._updateMotorTargetAndVelocity(3);
        this._updateMotorTargetAndVelocity(4);
        this._updateMotorTargetAndVelocity(5);
    }
    setAngularMotorForceLimit (v: number): void {
        bt.Generic6DofSpring2Constraint_setMaxMotorForce(this._impl, BulletDofAxis.TWIST, v);
        bt.Generic6DofSpring2Constraint_setMaxMotorForce(this._impl, BulletDofAxis.SWING1, v);
        bt.Generic6DofSpring2Constraint_setMaxMotorForce(this._impl, BulletDofAxis.SWING2, v);
    }

    setPivotA (v: IVec3Like): void {
        this.updateFrames();
    }
    setPivotB (v: IVec3Like): void {
        this.updateFrames();
    }

    setAutoPivotB (v: boolean): void {
        this.updateFrames();
    }

    setAxis (v: IVec3Like): void {
        this.updateFrames();
    }
    setSecondaryAxis (v: IVec3Like): void {
        this.updateFrames();
    }
    setBreakForce (v: number): void {
        const maxForce = Math.max(this.constraint.breakForce, this.constraint.breakTorque);
        const impulse = force2Impulse(maxForce, PhysicsSystem.instance.fixedTimeStep);
        bt.TypedConstraint_setMaxImpulseThreshold(this._impl, impulse);
    }
    setBreakTorque (v: number): void {
        const maxForce = Math.max(this.constraint.breakForce, this.constraint.breakTorque);
        const impulse = force2Impulse(maxForce, PhysicsSystem.instance.fixedTimeStep);
        bt.TypedConstraint_setMaxImpulseThreshold(this._impl, impulse);
    }

    get constraint (): ConfigurableConstraint {
        return this._com as ConfigurableConstraint;
    }

    onComponentSet (): void {
        const cb = this.constraint.connectedBody;
        const bodyA = (this._rigidBody.body as BulletRigidBody).impl;
        const bodyB = (cb && (cb.body as BulletRigidBody).impl) || bt.TypedConstraint_getFixedBody();
        const trans0 = BulletCache.instance.BT_TRANSFORM_0;
        const trans1 = BulletCache.instance.BT_TRANSFORM_1;
        this._impl = bt.Generic6DofSpring2Constraint_new(bodyA, bodyB, trans0, trans1, RotateOrder.RO_YZX);

        const linearLimit = this.constraint.linearLimitSettings;
        const angularLimit = this.constraint.angularLimitSettings;
        // they set limits implicitly
        this.setConstraintMode(0, linearLimit.xMotion);
        this.setConstraintMode(1, linearLimit.yMotion);
        this.setConstraintMode(2, linearLimit.zMotion);
        this.setConstraintMode(3, angularLimit.twistMotion);
        this.setConstraintMode(4, angularLimit.swingMotion1);
        this.setConstraintMode(5, angularLimit.swingMotion2);

        this.setLinearSoftConstraint(linearLimit.enableSoftConstraint);
        this.setLinearStiffness(linearLimit.stiffness);
        this.setLinearDamping(linearLimit.damping);
        this.setLinearRestitution(linearLimit.restitution);

        this.setSwingSoftConstraint(angularLimit.enableSoftConstraintSwing);
        this.setSwingRestitution(angularLimit.swingRestitution);
        this.setSwingStiffness(angularLimit.swingStiffness);
        this.setSwingDamping(angularLimit.swingDamping);

        this.setTwistSoftConstraint(angularLimit.enableSoftConstraintTwist);
        this.setTwistRestitution(angularLimit.twistRestitution);
        this.setTwistStiffness(angularLimit.twistStiffness);
        this.setTwistDamping(angularLimit.twistDamping);

        const linearMotor = this.constraint.linearDriverSettings;
        const angularMotor = this.constraint.angularDriverSettings;

        this.setDriverMode(0, linearMotor.xDrive);
        this.setDriverMode(1, linearMotor.yDrive);
        this.setDriverMode(2, linearMotor.zDrive);
        this.setDriverMode(3, angularMotor.twistDrive);
        this.setDriverMode(4, angularMotor.swingDrive1);
        this.setDriverMode(5, angularMotor.swingDrive2);

        this.setLinearMotorTarget(linearMotor.targetPosition);
        this.setLinearMotorVelocity(linearMotor.targetVelocity);
        this.setLinearMotorForceLimit(linearMotor.strength);

        this.setAngularMotorTarget(angularMotor.targetOrientation);
        this.setAngularMotorVelocity(angularMotor.targetVelocity);
        this.setAngularMotorForceLimit(angularMotor.strength);

        this.setBreakForce(this.constraint.breakForce);
        this.setBreakTorque(this.constraint.breakTorque);

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
        Vec3.multiply(v3_0, node.worldScale, cs.pivotA);
        cocos2BulletVec3(bt.Transform_getOrigin(trans0), v3_0);
        const quat = BulletCache.instance.BT_QUAT_0;

        const axisX = cs.axis;
        const axisY = cs.secondaryAxis;
        const axisZ = Vec3.cross(CC_V3_1, axisX, axisY);

        const mat = Mat4.set(
            CC_MAT4_0,
            axisX.x,
            axisX.y,
            axisX.z,
            0,
            axisY.x,
            axisY.y,
            axisY.z,
            0,
            axisZ.x,
            axisZ.y,
            axisZ.z,
            0,
            0,
            0,
            0,
            1,
        );
        mat.getRotation(rot_0);

        cocos2BulletQuat(quat, rot_0);
        bt.Transform_setRotation(trans0, quat);

        const trans1 = BulletCache.instance.BT_TRANSFORM_1;
        const cb = this.constraint.connectedBody;
        if (cb) {
            Quat.multiply(rot_0, node.worldRotation, rot_0);
            Quat.invert(rot_1, cb.node.worldRotation);
            Quat.multiply(rot_0, rot_1, rot_0);
            if (cs.autoPivotB) {
                Vec3.multiply(v3_0, cs.node.worldScale, cs.pivotA);
                Vec3.transformQuat(v3_0, v3_0, node.worldRotation);
                Vec3.add(v3_0, v3_0, cs.node.worldPosition);
                Vec3.subtract(v3_0, v3_0, cb.node.worldPosition);
                Vec3.transformQuat(v3_0, v3_0, rot_1);
            } else {
                Vec3.multiply(v3_0, cb.node.worldScale, cs.pivotB);
            }
        } else {
            Vec3.multiply(v3_0, node.worldScale, cs.pivotA);
            Vec3.transformQuat(v3_0, v3_0, node.worldRotation);
            Vec3.add(v3_0, v3_0, node.worldPosition);
            Quat.multiply(rot_0, node.worldRotation, rot_0);
        }
        cocos2BulletVec3(bt.Transform_getOrigin(trans1), v3_0);
        cocos2BulletQuat(quat, rot_0);
        bt.Transform_setRotation(trans1, quat);
        bt.Generic6DofSpring2Constraint_setFrames(this._impl, trans0, trans1);
    }

    updateScale0 (): void {
        this.updateFrames();
    }
    updateScale1 (): void {
        this.updateFrames();
    }
}
