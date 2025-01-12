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

import { BulletShape } from './bullet-shape';
import { Mesh } from '../../../3d/assets';
import { MeshCollider } from '../../../../exports/physics-framework';
import { cocos2BulletVec3, cocos2BulletTriMesh } from '../bullet-utils';
import { ITrimeshShape } from '../../spec/i-physics-shape';
import { BulletCache } from '../bullet-cache';
import { bt, EBulletType } from '../instantiated';
import { BulletBvhTriangleMeshShape } from '../bullet-bvh-triangle-mesh-shape';

/** @mangle */
export class BulletTrimeshShape extends BulletShape implements ITrimeshShape {
    private btBVHMeshShape: BulletBvhTriangleMeshShape | null = null;
    public get collider (): MeshCollider {
        return this._collider as MeshCollider;
    }

    setMesh (v: Mesh | null): void {
        if (!this._isInitialized) return;

        if (this._impl && BulletCache.isNotEmptyShape(this._impl)) {
            if (this._compound) { bt.CompoundShape_removeChildShape(this._compound, this._impl); }
            bt._safe_delete(this._impl, EBulletType.EBulletTypeCollisionShape);
            BulletCache.delWrapper(this._impl, BulletShape.TYPE);
            this._impl = 0;
        }

        const mesh = v;
        if (mesh && mesh.renderingSubMeshes.length > 0) {
            if (this.collider.convex) {
                const btTriangleMesh = this._getBtTriangleMesh(mesh);
                this._impl = bt.ConvexTriangleMeshShape_new(btTriangleMesh);
            } else {
                this.btBVHMeshShape = BulletBvhTriangleMeshShape.getBulletBvhTriangleMeshShape(mesh.hash, mesh);
                this._impl = bt.ScaledBvhTriangleMeshShape_new(this.btBVHMeshShape.bulletBvhTriangleMeshShapePtr, 1, 1, 1);
            }
            const bt_v3 = BulletCache.instance.BT_V3_0;
            cocos2BulletVec3(bt_v3, this._collider.node.worldScale);
            bt.CollisionShape_setLocalScaling(this._impl, bt_v3);
            bt.CollisionShape_setMargin(this._impl, 0.01);
            this.setCompound(this._compound);
            this.updateByReAdd();
            this.setWrapper();
        } else {
            this._impl = bt.EmptyShape_static();
        }
    }

    private refBtTriangleMesh: Bullet.ptr = 0;

    onComponentSet (): void {
        this.setMesh(this.collider.mesh);
    }

    onDestroy (): void {
        if (this.collider.convex) {
            if (this.refBtTriangleMesh) {
                bt._safe_delete(this.refBtTriangleMesh, EBulletType.EBulletTypeTriangleMesh);
            }
        } else if (this.btBVHMeshShape) {
            this.btBVHMeshShape.reference = false;
        }
        super.onDestroy();
    }

    updateScale (): void {
        super.updateScale();
        const bt_v3 = BulletCache.instance.BT_V3_0;
        cocos2BulletVec3(bt_v3, this._collider.node.worldScale);
        bt.CollisionShape_setLocalScaling(this._impl, bt_v3);
        this.updateCompoundTransform();
    }

    private _getBtTriangleMesh (mesh: Mesh): Bullet.ptr {
        this.refBtTriangleMesh = bt.TriangleMesh_new();
        cocos2BulletTriMesh(this.refBtTriangleMesh, mesh);
        return this.refBtTriangleMesh;
    }
}
