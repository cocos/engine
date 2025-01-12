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

import { Vec3, Quat, Mat4 } from '../../../core';
import { FixedConstraint } from '../../framework';
import { IFixedConstraint } from '../../spec/i-physics-constraint';
import { PX, _trans, getTempTransform, _pxtrans } from '../physx-adapter';
import { PhysXRigidBody } from '../physx-rigid-body';
import { PhysXJoint } from './physx-joint';

const v3_0 = new Vec3();
const quat_0 = new Quat();
const mat_0 = new Mat4();

/** @mangle */
export class PhysXFixedJoint extends PhysXJoint implements IFixedConstraint {
    setBreakForce (v: number): void {
        this._breakForce = this.constraint.breakForce;
        this._impl.setBreakForce(this._breakForce, this._breakTorque);
    }

    setBreakTorque (v: number): void {
        this._breakTorque = this.constraint.breakTorque;
        this._impl.setBreakForce(this._breakForce, this._breakTorque);
    }

    get constraint (): FixedConstraint {
        return this._com as FixedConstraint;
    }

    private _breakForce = 0;
    private _breakTorque = 0;

    onComponentSet (): void {
        this._impl = PX.createFixedConstraint(PhysXJoint.tempActor, _pxtrans, null, _pxtrans);
        this.setBreakForce(this.constraint.breakForce);
        this.setBreakTorque(this.constraint.breakTorque);
        this.updateFrame();
        this.enableDebugVisualization(true);
    }

    updateFrame (): void {
        const bodyA = (this._rigidBody.body as PhysXRigidBody).sharedBody;
        const cb = this.constraint.connectedBody;

        Mat4.fromRT(mat_0, bodyA.node.worldRotation, bodyA.node.worldPosition);
        Mat4.invert(mat_0, mat_0);
        Mat4.getRotation(quat_0, mat_0);
        Mat4.getTranslation(v3_0, mat_0);
        this._impl.setLocalPose(0, getTempTransform(v3_0, quat_0));

        if (cb) {
            const bodyB = (cb.body as PhysXRigidBody).sharedBody;
            Mat4.fromRT(mat_0, bodyB.node.worldRotation, bodyB.node.worldPosition);
            Mat4.invert(mat_0, mat_0);
            Mat4.getRotation(quat_0, mat_0);
            Mat4.getTranslation(v3_0, mat_0);
            this._impl.setLocalPose(1, getTempTransform(v3_0, quat_0));
        } else {
            this._impl.setLocalPose(1, getTempTransform(Vec3.ZERO, Quat.IDENTITY));
        }
    }

    updateScale0 (): void {
        this.updateFrame();
    }

    updateScale1 (): void {
        this.updateFrame();
    }
}
