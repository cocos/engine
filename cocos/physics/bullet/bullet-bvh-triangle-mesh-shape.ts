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

import { bt, EBulletType } from './instantiated';
import { Mesh } from '../../3d/assets';
import { cocos2BulletTriMesh } from './bullet-utils';

export class BulletBvhTriangleMeshShape {
    private static readonly BulletBvhTriangleMeshShapeMap = new Map<number, BulletBvhTriangleMeshShape>();

    public static getBulletBvhTriangleMeshShape (key: number, mesh: Mesh): BulletBvhTriangleMeshShape {
        let newBulletBvhTriangleMeshShape!: BulletBvhTriangleMeshShape;
        if (BulletBvhTriangleMeshShape.BulletBvhTriangleMeshShapeMap.has(key)) { //can be improved
            newBulletBvhTriangleMeshShape = BulletBvhTriangleMeshShape.BulletBvhTriangleMeshShapeMap.get(key)!;
            newBulletBvhTriangleMeshShape.reference = true;
        } else {
            newBulletBvhTriangleMeshShape = new BulletBvhTriangleMeshShape(key, mesh);
            BulletBvhTriangleMeshShape.BulletBvhTriangleMeshShapeMap.set(key, newBulletBvhTriangleMeshShape);
        }
        return newBulletBvhTriangleMeshShape;
    }

    private readonly key: number;
    private ref = 0;
    public bulletBvhTriangleMeshShapePtr: Bullet.ptr;
    private btTriangleMeshPtr: Bullet.ptr = 0;

    public set reference (v: boolean) {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        v ? this.ref++ : this.ref--;
        if (this.ref === 0) { this.destroy(); }
    }

    private constructor (key: number, mesh: Mesh) {
        this.reference = true;
        this.key = key;
        this.btTriangleMeshPtr = bt.TriangleMesh_new();
        cocos2BulletTriMesh(this.btTriangleMeshPtr, mesh);
        this.bulletBvhTriangleMeshShapePtr = bt.BvhTriangleMeshShape_new(this.btTriangleMeshPtr, true, true);
    }

    private destroy (): void {
        if (this.bulletBvhTriangleMeshShapePtr) {
            bt._safe_delete(this.bulletBvhTriangleMeshShapePtr, EBulletType.EBulletTypeCollisionShape);
        }
        if (this.btTriangleMeshPtr) {
            bt._safe_delete(this.btTriangleMeshPtr, EBulletType.EBulletTypeTriangleMesh);
        }
        BulletBvhTriangleMeshShape.BulletBvhTriangleMeshShapeMap.delete(this.key);
    }
}
