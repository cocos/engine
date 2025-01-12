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

import { BoxCollider } from '../../framework';
import { absolute, VEC3_0 } from '../../utils/util';
import { IBoxShape } from '../../spec/i-physics-shape';
import { PX } from '../physx-adapter';
import { EPhysXShapeType, PhysXShape } from './physx-shape';
import { PhysXInstance } from '../physx-instance';

/** @mangle */
export class PhysXBoxShape extends PhysXShape implements IBoxShape {
    static BOX_GEOMETRY: any;

    constructor () {
        super(EPhysXShapeType.BOX);
        if (!PhysXBoxShape.BOX_GEOMETRY) {
            VEC3_0.set(0.5, 0.5, 0.5);
            PhysXBoxShape.BOX_GEOMETRY = new PX.BoxGeometry(VEC3_0);
        }
    }

    updateSize (): void {
        this.updateScale();
    }

    get collider (): BoxCollider {
        return this._collider as BoxCollider;
    }

    onComponentSet (): void {
        this.updateGeometry();
        const pxmat = this.getSharedMaterial(this._collider.sharedMaterial);
        this._impl = PhysXInstance.physics.createShape(PhysXBoxShape.BOX_GEOMETRY, pxmat, true, this._flags);
    }

    updateScale (): void {
        this.updateGeometry();
        this._impl.setGeometry(PhysXBoxShape.BOX_GEOMETRY);
        this.setCenter(this._collider.center);
    }

    updateGeometry (): void {
        const co = this.collider;
        const ws = co.node.worldScale;
        VEC3_0.set(co.size).multiplyScalar(0.5).multiply(ws);
        PhysXBoxShape.BOX_GEOMETRY.setHalfExtents(absolute(VEC3_0));
    }
}
