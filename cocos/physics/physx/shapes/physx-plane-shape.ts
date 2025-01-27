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
import { PlaneCollider } from '../../framework';
import { IPlaneShape } from '../../spec/i-physics-shape';
import { getTempTransform, PX, _trans } from '../physx-adapter';
import { PhysXInstance } from '../physx-instance';
import { EPhysXShapeType, PhysXShape } from './physx-shape';

/** @mangle */
export class PhysXPlaneShape extends PhysXShape implements IPlaneShape {
    static PLANE_GEOMETRY: any;

    constructor () {
        super(EPhysXShapeType.PLANE);
        if (!PhysXPlaneShape.PLANE_GEOMETRY) {
            PhysXPlaneShape.PLANE_GEOMETRY = new PX.PlaneGeometry();
        }
    }

    setNormal (v: IVec3Like): void {
        this.setCenter();
    }

    setConstant (v: number): void {
        this.setCenter();
    }

    setCenter (): void {
        const co = this.collider;
        const pos = _trans.translation;
        const rot = _trans.rotation;
        Vec3.scaleAndAdd(pos, co.center, co.normal, co.constant);
        Quat.rotationTo(rot, Vec3.UNIT_X, co.normal);
        const trans = getTempTransform(pos, rot);
        this._impl.setLocalPose(trans);
    }

    get collider (): PlaneCollider {
        return this._collider as PlaneCollider;
    }

    onComponentSet (): void {
        const co = this.collider;
        const pxmat = this.getSharedMaterial(co.sharedMaterial);
        this._impl = PhysXInstance.physics.createShape(PhysXPlaneShape.PLANE_GEOMETRY, pxmat, true, this._flags);
        this.setCenter();
    }

    updateScale (): void {
        this.setCenter();
    }
}
