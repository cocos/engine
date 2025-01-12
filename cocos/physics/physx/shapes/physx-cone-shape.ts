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

import { Quat, Vec3 } from '../../../core';
import cylinder from '../../../primitive/cylinder';
import { ConeCollider, EAxisDirection } from '../../framework';
import { IConeShape } from '../../spec/i-physics-shape';
import { createConvexMesh, createMeshGeometryFlags, PX, _trans } from '../physx-adapter';
import { PhysXInstance } from '../physx-instance';
import { EPhysXShapeType, PhysXShape } from './physx-shape';

/** @mangle */
export class PhysXConeShape extends PhysXShape implements IConeShape {
    static CONVEX_MESH: any;
    geometry: any;

    constructor () {
        super(EPhysXShapeType.CONE);
    }

    setRadius (v: number): void {
        this.updateGeometry();
    }

    setHeight (v: number): void {
        this.updateGeometry();
    }

    setDirection (v: number): void {
        this.updateGeometry();
    }

    get collider (): ConeCollider {
        return this._collider as ConeCollider;
    }

    onComponentSet (): void {
        const collider = this.collider;
        const physics = PhysXInstance.physics;
        if (!PhysXConeShape.CONVEX_MESH) {
            const cooking = PhysXInstance.cooking;
            const primitive = cylinder(0, 0.5, 1, { radialSegments: 32, heightSegments: 1 });
            PhysXConeShape.CONVEX_MESH = createConvexMesh(primitive.positions, cooking, physics);
        }
        const meshScale = PhysXShape.MESH_SCALE;
        meshScale.setScale(Vec3.ONE);
        meshScale.setRotation(Quat.IDENTITY);
        const convexMesh = PhysXConeShape.CONVEX_MESH;
        const pxmat = this.getSharedMaterial(collider.sharedMaterial);
        this.geometry = new PX.ConvexMeshGeometry(convexMesh, meshScale, createMeshGeometryFlags(0, true));
        this.updateGeometry();
        this._impl = physics.createShape(this.geometry, pxmat, true, this._flags);
    }

    updateScale (): void {
        this.updateGeometry();
        this.setCenter(this._collider.center);
    }

    updateGeometry (): void {
        const collider = this.collider;
        const r = collider.radius;
        const h = collider.height;
        const a = collider.direction;
        const scale = _trans.translation;
        Vec3.copy(scale, collider.node.worldScale);
        scale.y *= Math.max(0.0001, h / 1);
        const radius = Math.max(0.0001, r / 0.5);
        const xzMaxNorm = Math.max(scale.x, scale.z);
        scale.x = scale.z = xzMaxNorm * radius;
        const quat = _trans.rotation;
        switch (a) {
        case EAxisDirection.X_AXIS:
            Quat.fromEuler(quat, 0, 0, 90);
            break;
        case EAxisDirection.Y_AXIS:
        default:
            Quat.copy(quat, Quat.IDENTITY);
            break;
        case EAxisDirection.Z_AXIS:
            Quat.fromEuler(quat, 90, 0, 0);
            break;
        }
        const meshScale = PhysXShape.MESH_SCALE;
        meshScale.setScale(scale);
        meshScale.setRotation(quat);
        this.geometry.setScale(meshScale);
        Quat.copy(this._rotation, quat);
    }
}
