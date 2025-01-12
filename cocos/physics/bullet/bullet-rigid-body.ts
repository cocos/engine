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

import { Vec3, IVec3Like } from '../../core';
import { BulletWorld } from './bullet-world';
import { cocos2BulletVec3, bullet2CocosVec3 } from './bullet-utils';
import { RigidBody, PhysicsSystem } from '../../../exports/physics-framework';
import { btRigidBodyFlags, btCollisionObjectStates, EBtSharedBodyDirty } from './bullet-enum';
import { IRigidBody } from '../spec/i-rigid-body';
import { ERigidBodyType } from '../framework/physics-enum';
import { BulletSharedBody } from './bullet-shared-body';
import { BulletCache, CC_V3_0, CC_V3_1 } from './bullet-cache';
import { bt } from './instantiated';

const v3_0 = CC_V3_0;
const v3_1 = CC_V3_1;

/** @mangle */
export class BulletRigidBody implements IRigidBody {
    get isAwake (): boolean {
        const state = bt.CollisionObject_getActivationState(this.impl);
        return state === btCollisionObjectStates.ACTIVE_TAG
            || state === btCollisionObjectStates.DISABLE_DEACTIVATION;
    }

    get isSleepy (): boolean {
        const state = bt.CollisionObject_getActivationState(this.impl);
        return state === btCollisionObjectStates.WANTS_DEACTIVATION;
    }

    get isSleeping (): boolean {
        const state = bt.CollisionObject_getActivationState(this.impl);
        return state === btCollisionObjectStates.ISLAND_SLEEPING;
    }

    setMass (value: number): void {
        if (!this._rigidBody.isDynamic) return;
        bt.RigidBody_setMass(this.impl, value);
        this._wakeUpIfSleep();
        this._sharedBody.dirty |= EBtSharedBodyDirty.BODY_RE_ADD;
    }

    setType (v: ERigidBodyType): void {
        this._sharedBody.setType(v);
    }

    setLinearDamping (value: number): void {
        bt.RigidBody_setDamping(this.impl, this._rigidBody.linearDamping, this._rigidBody.angularDamping);
    }

    setAngularDamping (value: number): void {
        bt.RigidBody_setDamping(this.impl, this._rigidBody.linearDamping, this._rigidBody.angularDamping);
    }

    useGravity (value: boolean): void {
        if (!this._rigidBody.isDynamic) return;
        let m_rigidBodyFlag = bt.RigidBody_getFlags(this.impl);
        if (value) {
            m_rigidBodyFlag &= (~btRigidBodyFlags.BT_DISABLE_WORLD_GRAVITY);
        } else {
            bt.RigidBody_setGravity(this.impl, cocos2BulletVec3(BulletCache.instance.BT_V3_0, Vec3.ZERO));
            m_rigidBodyFlag |= btRigidBodyFlags.BT_DISABLE_WORLD_GRAVITY;
        }
        bt.RigidBody_setFlags(this.impl, m_rigidBodyFlag);
        this._wakeUpIfSleep();
        this._sharedBody.dirty |= EBtSharedBodyDirty.BODY_RE_ADD;
    }

    useCCD (value: boolean): void {
        bt.CollisionObject_setCcdMotionThreshold(this.impl, value ? 0.01 : 0);
        bt.CollisionObject_setCcdSweptSphereRadius(this.impl, value ? 0.1 : 0);
        this._isUsingCCD = value;
    }

    isUsingCCD (): boolean {
        return this._isUsingCCD;
    }

    setLinearFactor (v: IVec3Like): void {
        bt.RigidBody_setLinearFactor(this.impl, cocos2BulletVec3(BulletCache.instance.BT_V3_0, v));
        this._wakeUpIfSleep();
    }

    setAngularFactor (v: IVec3Like): void {
        bt.RigidBody_setAngularFactor(this.impl, cocos2BulletVec3(BulletCache.instance.BT_V3_0, v));
        this._wakeUpIfSleep();
    }

    setAllowSleep (v: boolean): void {
        if (!this._rigidBody.isDynamic) return;
        if (v) {
            bt.CollisionObject_forceActivationState(this.impl, btCollisionObjectStates.ACTIVE_TAG);
        } else {
            bt.CollisionObject_forceActivationState(this.impl, btCollisionObjectStates.DISABLE_DEACTIVATION);
        }
        this._wakeUpIfSleep();
    }

    private static idCounter = 0;
    readonly id: number;

    get impl (): number { return this._sharedBody.body; }
    get rigidBody (): RigidBody { return this._rigidBody; }
    get sharedBody (): BulletSharedBody { return this._sharedBody; }
    get isEnabled (): boolean { return this._isEnabled; }

    private _isEnabled = false;
    private _isUsingCCD = false;
    private _sharedBody!: BulletSharedBody;
    private _rigidBody!: RigidBody;

    constructor () {
        this.id = BulletRigidBody.idCounter++;
    }

    clearState (): void {
        bt.RigidBody_clearState(this.impl);
    }

    clearVelocity (): void {
        this.setLinearVelocity(Vec3.ZERO);
        this.setAngularVelocity(Vec3.ZERO);
    }

    clearForces (): void {
        bt.RigidBody_clearForces(this.impl);
    }

    /** LIFECYCLE */

    initialize (com: RigidBody): void {
        this._rigidBody = com;
        this._sharedBody = (PhysicsSystem.instance.physicsWorld as BulletWorld).getSharedBody(this._rigidBody.node, this);
        this._sharedBody.reference = true;
    }

    onEnable (): void {
        this._isEnabled = true;
        this.setMass(this._rigidBody.mass);
        this.setAllowSleep(this._rigidBody.allowSleep);
        this.setLinearDamping(this._rigidBody.linearDamping);
        this.setAngularDamping(this._rigidBody.angularDamping);
        this.setLinearFactor(this._rigidBody.linearFactor);
        this.setAngularFactor(this._rigidBody.angularFactor);
        this.useGravity(this._rigidBody.useGravity);
        this._sharedBody.bodyEnabled = true;
    }

    onDisable (): void {
        this._isEnabled = false;
        this._sharedBody.bodyEnabled = false;
    }

    onDestroy (): void {
        this._sharedBody.reference = false;
        (this._rigidBody as any) = null;
        (this._sharedBody as any) = null;
    }

    /** INTERFACE */

    wakeUp (force = true): void {
        bt.CollisionObject_activate(this.impl, force);
    }

    sleep (): void {
        const state = bt.CollisionObject_getActivationState(this.impl);
        if (state !== btCollisionObjectStates.DISABLE_DEACTIVATION && state !== btCollisionObjectStates.DISABLE_SIMULATION) {
            bt.CollisionObject_forceActivationState(this.impl, btCollisionObjectStates.ISLAND_SLEEPING);
        }
    }

    setSleepThreshold (v: number): void {
        this._wakeUpIfSleep();
        bt.RigidBody_setSleepingThresholds(this.impl, v, v);
    }

    getSleepThreshold (): number {
        return bt.RigidBody_getLinearSleepingThreshold(this.impl);
    }

    getLinearVelocity (out: Vec3): Vec3 {
        return bullet2CocosVec3(out, bt.RigidBody_getLinearVelocity(this.impl));
    }

    setLinearVelocity (value: Vec3 | Readonly<Vec3>): void {
        this._wakeUpIfSleep();
        cocos2BulletVec3(bt.RigidBody_getLinearVelocity(this.impl), value);
    }

    getAngularVelocity (out: Vec3): Vec3 {
        return bullet2CocosVec3(out, bt.RigidBody_getAngularVelocity(this.impl));
    }

    setAngularVelocity (value: Vec3 | Readonly<Vec3>): void {
        this._wakeUpIfSleep();
        cocos2BulletVec3(bt.RigidBody_getAngularVelocity(this.impl), value);
    }

    applyLocalForce (force: Vec3, rel_pos?: Vec3): void {
        this._sharedBody.syncSceneToPhysics();
        this._wakeUpIfSleep();
        const quat = this._sharedBody.node.worldRotation;
        const v = Vec3.transformQuat(v3_0, force, quat);
        const rp = rel_pos ? Vec3.transformQuat(v3_1, rel_pos, quat) : Vec3.ZERO;
        bt.RigidBody_applyForce(
            this.impl,
            cocos2BulletVec3(BulletCache.instance.BT_V3_0, v),
            cocos2BulletVec3(BulletCache.instance.BT_V3_1, rp),
        );
    }

    applyLocalTorque (torque: Vec3): void {
        this._sharedBody.syncSceneToPhysics();
        this._wakeUpIfSleep();
        Vec3.transformQuat(v3_0, torque, this._sharedBody.node.worldRotation);
        bt.RigidBody_applyTorque(
            this.impl,
            cocos2BulletVec3(BulletCache.instance.BT_V3_0, v3_0),
        );
    }

    applyLocalImpulse (impulse: Vec3, rel_pos?: Vec3): void {
        this._sharedBody.syncSceneToPhysics();
        this._wakeUpIfSleep();
        const quat = this._sharedBody.node.worldRotation;
        const v = Vec3.transformQuat(v3_0, impulse, quat);
        const rp = rel_pos ? Vec3.transformQuat(v3_1, rel_pos, quat) : Vec3.ZERO;
        bt.RigidBody_applyImpulse(
            this.impl,
            cocos2BulletVec3(BulletCache.instance.BT_V3_0, v),
            cocos2BulletVec3(BulletCache.instance.BT_V3_1, rp),
        );
    }

    applyForce (force: Vec3, rel_pos?: Vec3): void {
        this._sharedBody.syncSceneToPhysics();
        this._wakeUpIfSleep();
        const rp = rel_pos || Vec3.ZERO;
        bt.RigidBody_applyForce(
            this.impl,
            cocos2BulletVec3(BulletCache.instance.BT_V3_0, force),
            cocos2BulletVec3(BulletCache.instance.BT_V3_1, rp),
        );
    }

    applyTorque (torque: Vec3): void {
        this._sharedBody.syncSceneToPhysics();
        this._wakeUpIfSleep();
        bt.RigidBody_applyTorque(
            this.impl,
            cocos2BulletVec3(BulletCache.instance.BT_V3_0, torque),
        );
    }

    applyImpulse (impulse: Vec3, rel_pos?: Vec3): void {
        this._sharedBody.syncSceneToPhysics();
        this._wakeUpIfSleep();
        const rp = rel_pos || Vec3.ZERO;
        bt.RigidBody_applyImpulse(
            this.impl,
            cocos2BulletVec3(BulletCache.instance.BT_V3_0, impulse),
            cocos2BulletVec3(BulletCache.instance.BT_V3_1, rp),
        );
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

    protected _wakeUpIfSleep (): void {
        if (!this.isAwake) { bt.CollisionObject_activate(this.impl, true); }
    }
}
