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

import { absMaxComponent } from '../../../core';
import { SphereCollider } from '../../framework';
import { ISphereShape } from '../../spec/i-physics-shape';
import { PX } from '../physx-adapter';
import { PhysXInstance } from '../physx-instance';
import { EPhysXShapeType, PhysXShape } from './physx-shape';

/** @mangle */
export class PhysXSphereShape extends PhysXShape implements ISphereShape {
    static SPHERE_GEOMETRY: any;

    constructor () {
        super(EPhysXShapeType.SPHERE);
        if (!PhysXSphereShape.SPHERE_GEOMETRY) {
            PhysXSphereShape.SPHERE_GEOMETRY = new PX.SphereGeometry(0.5);
        }
    }

    updateRadius (): void {
        this.updateScale();
    }

    get collider (): SphereCollider {
        return this._collider as SphereCollider;
    }

    onComponentSet (): void {
        this.updateGeometry();
        const pxmat = this.getSharedMaterial(this.collider.sharedMaterial);
        this._impl = PhysXInstance.physics.createShape(PhysXSphereShape.SPHERE_GEOMETRY, pxmat, true, this._flags);
    }

    updateScale (): void {
        this.updateGeometry();
        this._impl.setGeometry(PhysXSphereShape.SPHERE_GEOMETRY);
        this.setCenter(this._collider.center);
    }

    updateGeometry (): void {
        const co = this.collider;
        const maxSp = Math.abs(absMaxComponent(this.collider.node.worldScale));
        PhysXSphereShape.SPHERE_GEOMETRY.setRadius(Math.max(0.0001, co.radius * maxSp));
    }
}
