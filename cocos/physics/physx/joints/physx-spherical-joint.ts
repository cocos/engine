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

import { IVec3Like, Quat, Vec3 } from '../../../core';
import { PointToPointConstraint } from '../../framework';
import { IPointToPointConstraint } from '../../spec/i-physics-constraint';
import { PX, _trans, getTempTransform, _pxtrans } from '../physx-adapter';
import { PhysXJoint } from './physx-joint';

/** @mangle */
export class PhysXSphericalJoint extends PhysXJoint implements IPointToPointConstraint {
    setPivotA (v: IVec3Like): void {
        const cs = this.constraint;
        const pos = _trans.translation;
        const rot = _trans.rotation;
        Vec3.multiply(pos, cs.node.worldScale, cs.pivotA);
        Quat.copy(rot, Quat.IDENTITY);
        this._impl.setLocalPose(0, getTempTransform(pos, rot));
        if (!cs.connectedBody) this.setPivotB(cs.pivotB);
    }

    setPivotB (v: IVec3Like): void {
        const cs = this.constraint;
        const cb = cs.connectedBody;
        const pos = _trans.translation;
        const rot = _trans.rotation;
        Vec3.copy(pos, cs.pivotB);
        Quat.copy(rot, Quat.IDENTITY);
        if (cb) {
            Vec3.multiply(pos, cb.node.worldScale, cs.pivotB);
        } else {
            const node = cs.node;
            Vec3.multiply(pos, node.worldScale, cs.pivotA);
            Vec3.transformQuat(pos, pos, node.worldRotation);
            Vec3.add(pos, pos, node.worldPosition);
            Quat.multiply(rot, rot, node.worldRotation);
        }
        this._impl.setLocalPose(1, getTempTransform(pos, rot));
    }

    get constraint (): PointToPointConstraint {
        return this._com as PointToPointConstraint;
    }

    onComponentSet (): void {
        this._impl = PX.createSphericalJoint(PhysXJoint.tempActor, _pxtrans, null, _pxtrans);
        this.setPivotA(this.constraint.pivotA);
        this.setPivotB(this.constraint.pivotB);
        this.enableDebugVisualization(true);
    }

    updateScale0 (): void {
        this.setPivotA(this.constraint.pivotA);
    }

    updateScale1 (): void {
        this.setPivotB(this.constraint.pivotB);
    }
}
