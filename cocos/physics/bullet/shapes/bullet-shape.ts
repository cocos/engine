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

import { Vec3, IVec3Like, geometry } from '../../../core';
import { Collider, PhysicsMaterial, PhysicsSystem, RigidBody } from '../../../../exports/physics-framework';
import { BulletWorld } from '../bullet-world';
import { EBtSharedBodyDirty } from '../bullet-enum';
import { cocos2BulletQuat, cocos2BulletVec3 } from '../bullet-utils';
import { IBaseShape } from '../../spec/i-physics-shape';
import { BulletSharedBody } from '../bullet-shared-body';
import { BulletCache, CC_V3_0 } from '../bullet-cache';
import { bt, EBulletType } from '../instantiated';
import { EColliderType } from '../../framework';

const v3_0 = CC_V3_0;
const ccMaterialBooks = {};

/** @mangle */
export abstract class BulletShape implements IBaseShape {
    updateEventListener (): void {
        this._sharedBody.wrappedWorld.updateNeedEmitEvents(this.collider.needCollisionEvent || this.collider.needTriggerEvent);
    }

    setMaterial (v: PhysicsMaterial | null): void {
        const v1 = (v == null) ? PhysicsSystem.instance.defaultMaterial : v;
        if (!this._isTrigger && this._isEnabled) {
            if (this._compound) {
                if (!ccMaterialBooks[v1._uuid]) ccMaterialBooks[v1._uuid] = bt.ccMaterial_new();
                const mat = ccMaterialBooks[v1._uuid];
                bt.ccMaterial_set(mat as number, v1.restitution, v1.friction, v1.rollingFriction, v1.spinningFriction);
                bt.CollisionShape_setMaterial(this._impl, mat as number);
            } else {
                bt.CollisionObject_setMaterial(this._sharedBody.body, v1.restitution, v1.friction, v1.rollingFriction, v1.spinningFriction);
            }
        }
    }

    setCenter (v: IVec3Like): void {
        Vec3.copy(v3_0, v);
        v3_0.multiply(this._collider.node.worldScale);
        cocos2BulletVec3(bt.Transform_getOrigin(this.transform), v3_0);
        this.updateCompoundTransform();
    }

    setAsTrigger (v: boolean): void {
        if (this._isTrigger === v) return;

        if (this._isEnabled) {
            this._sharedBody.removeShape(this, !v);
            this._sharedBody.addShape(this, v);
        }
        this._isTrigger = v;
    }

    get attachedRigidBody (): RigidBody | null {
        if (this._sharedBody.wrappedBody) return this._sharedBody.wrappedBody.rigidBody;
        return null;
    }

    get impl (): number { return this._impl; }
    get collider (): Collider { return this._collider; }
    get sharedBody (): BulletSharedBody { return this._sharedBody; }

    static readonly TYPE = 'shape';
    private static idCounter = 0;
    readonly id = BulletShape.idCounter++;
    protected _isEnabled = false;
    protected _isTrigger = false;
    protected _isInitialized = false;
    protected _impl: Bullet.ptr = 0;
    protected _compound: Bullet.ptr = 0;
    protected readonly quat = bt.Quat_new(0, 0, 0, 1);
    protected readonly transform = bt.Transform_new();
    protected _collider!: Collider;
    protected _sharedBody!: BulletSharedBody;

    getAABB (v: geometry.AABB): void {
        const bt_transform = BulletCache.instance.BT_TRANSFORM_0;
        bt.Transform_setIdentity(bt_transform);
        bt.Transform_setRotation(bt_transform, cocos2BulletQuat(BulletCache.instance.BT_QUAT_0, this._collider.node.worldRotation));
        const MIN = BulletCache.instance.BT_V3_0;
        const MAX = BulletCache.instance.BT_V3_1;
        bt.CollisionShape_getAabb(this._impl, bt_transform, MIN, MAX);
        v.halfExtents.x = (bt.Vec3_x(MAX) - bt.Vec3_x(MIN)) / 2;
        v.halfExtents.y = (bt.Vec3_y(MAX) - bt.Vec3_y(MIN)) / 2;
        v.halfExtents.z = (bt.Vec3_z(MAX) - bt.Vec3_z(MIN)) / 2;
        Vec3.add(v.center, this._collider.node.worldPosition, this._collider.center);
    }

    getBoundingSphere (v: geometry.Sphere): void {
        v.radius = bt.CollisionShape_getLocalBoundingSphere(this._impl);
        Vec3.add(v.center, this._collider.node.worldPosition, this._collider.center);
    }

    initialize (com: Collider): void {
        this._collider = com;
        this._isInitialized = true;
        this._sharedBody = (PhysicsSystem.instance.physicsWorld as BulletWorld).getSharedBody(this._collider.node);
        this._sharedBody.reference = true;
        this.onComponentSet();
        this.setWrapper();
    }

    setWrapper (): void {
        if (BulletCache.isNotEmptyShape(this._impl)) {
            bt.CollisionShape_setUserPointer(this._impl, this._impl);
            BulletCache.setWrapper(this._impl, BulletShape.TYPE, this);
        }
    }

    // virtual
    protected abstract onComponentSet(): void;

    onLoad (): void {
        this.setCenter(this._collider.center);
        this.setAsTrigger(this._collider.isTrigger);
    }

    onEnable (): void {
        this._isEnabled = true;
        this._sharedBody.addShape(this, this._isTrigger);

        this.setMaterial(this.collider.sharedMaterial);
    }

    onDisable (): void {
        this._isEnabled = false;
        this._sharedBody.removeShape(this, this._isTrigger);
    }

    onDestroy (): void {
        this._sharedBody.reference = false;
        (this._collider as any) = null;
        bt._safe_delete(this.quat, EBulletType.EBulletTypeQuat);
        bt._safe_delete(this.transform, EBulletType.EBulletTypeTransform);
        if (this._compound) bt._safe_delete(this._compound, EBulletType.EBulletTypeCollisionShape);
        if (BulletCache.isNotEmptyShape(this._impl)) {
            bt._safe_delete(this._impl, EBulletType.EBulletTypeCollisionShape);
            BulletCache.delWrapper(this._impl, BulletShape.TYPE);
        }
    }

    updateByReAdd (): void {
        if (this._isEnabled) {
            this._sharedBody.removeShape(this, this._isTrigger);
            this._sharedBody.addShape(this, this._isTrigger);
        }
    }

    getGroup (): number {
        return this._sharedBody.collisionFilterGroup;
    }

    setGroup (v: number): void {
        this._sharedBody.collisionFilterGroup = v;
    }

    addGroup (v: number): void {
        this._sharedBody.collisionFilterGroup |= v;
    }

    removeGroup (v: number): void {
        this._sharedBody.collisionFilterGroup &= ~v;
    }

    getMask (): number {
        return this._sharedBody.collisionFilterMask;
    }

    setMask (v: number): void {
        this._sharedBody.collisionFilterMask = v;
    }

    addMask (v: number): void {
        this._sharedBody.collisionFilterMask |= v;
    }

    removeMask (v: number): void {
        this._sharedBody.collisionFilterMask &= ~v;
    }

    setCompound (compound: Bullet.ptr): void {
        if (this._compound) bt.CompoundShape_removeChildShape(this._compound, this._impl);
        if (compound) bt.CompoundShape_addChildShape(compound, this.transform, this._impl);
        this._compound = compound;
    }

    updateScale (): void {
        this.setCenter(this._collider.center);
    }

    updateCompoundTransform (): void {
        if (this._compound) {
            bt.CompoundShape_updateChildTransform(this._compound, this._impl, this.transform, true);
        } else if (this._isEnabled && !this._isTrigger) {
            if (this._sharedBody && !this._sharedBody.bodyStruct.useCompound) {
                this._sharedBody.dirty |= EBtSharedBodyDirty.BODY_RE_ADD;
            }
        }
    }

    needCompound (): boolean {
        if (this._collider.type === EColliderType.TERRAIN) { return true; }
        if (this._collider.center.equals(Vec3.ZERO)) { return false; }
        return true;
    }
}
