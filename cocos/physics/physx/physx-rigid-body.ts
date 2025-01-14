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

/* eslint-disable @typescript-eslint/no-unsafe-return */
import { IVec3Like, Vec3 } from '../../core';
import { ERigidBodyType, PhysicsSystem, RigidBody } from '../framework';
import { IRigidBody } from '../spec/i-rigid-body';
import { applyForce, applyImpulse, applyTorqueForce, PX, _trans } from './physx-adapter';
import { PhysXSharedBody } from './physx-shared-body';
import { PhysXWorld } from './physx-world';

const v3_0 = new Vec3();

/** @mangle */
export class PhysXRigidBody implements IRigidBody {
    get impl (): any { return this._sharedBody.impl; }

    get isAwake (): boolean {
        if (!this.isInScene || this.isStatic) return false;
        return !this.impl.isSleeping();
    }

    get isSleeping (): boolean {
        if (!this.isInScene || this.isStatic) return true;
        return this.impl.isSleeping();
    }

    get isEnabled (): boolean { return this._isEnabled; }
    get rigidBody (): RigidBody { return this._rigidBody; }
    get sharedBody (): PhysXSharedBody { return this._sharedBody; }
    get isStatic (): boolean { return !this.impl || this._sharedBody.isStatic; }
    get isStaticOrKinematic (): boolean { return !this.impl || this._sharedBody.isStatic || this._sharedBody.isKinematic; }
    get isInScene (): boolean { return this._sharedBody.isInScene; }

    isSleepy = false;
    private _isEnabled = false;
    private _isUsingCCD = false;
    private _rigidBody!: RigidBody;
    private _sharedBody!: PhysXSharedBody;

    initialize (v: RigidBody): void {
        this._rigidBody = v;
        this._sharedBody = (PhysicsSystem.instance.physicsWorld as PhysXWorld).getSharedBody(v.node, this);
        this._sharedBody.reference = true;
        this.setSleepThreshold(PhysicsSystem.instance.sleepThreshold);
    }

    onEnable (): void {
        this._isEnabled = true;
        this.setMass(this._rigidBody.mass);
        this.setType(this._rigidBody.type);
        this.setAllowSleep(this._rigidBody.allowSleep);
        this.setLinearDamping(this._rigidBody.linearDamping);
        this.setAngularDamping(this._rigidBody.angularDamping);
        this.setLinearFactor(this._rigidBody.linearFactor);
        this.setAngularFactor(this._rigidBody.angularFactor);
        this.useGravity(this._rigidBody.useGravity);
        this._sharedBody.enabled = true;
    }

    onDisable (): void {
        this._isEnabled = false;
        this._sharedBody.enabled = false;
    }

    onDestroy (): void {
        this._sharedBody.reference = false;
        (this._rigidBody as any) = null;
        (this._sharedBody as any) = null;
    }

    setType (v: ERigidBodyType): void {
        this._sharedBody.setType(v);
    }

    setMass (v: number): void {
        if (this.isStatic) return;
        this._sharedBody.setMass(v);
    }

    setLinearDamping (v: number): void {
        this._sharedBody.setLinearDamping(v);
    }

    setAngularDamping (v: number): void {
        this._sharedBody.setAngularDamping(v);
    }

    useGravity (v: boolean): void {
        if (this.isStatic) return;
        this.impl.setActorFlag(PX.ActorFlag.eDISABLE_GRAVITY, !v);
    }

    useCCD (v: boolean): void {
        if (this.isStatic) return;
        this.impl.setRigidBodyFlag(PX.RigidBodyFlag.eENABLE_CCD, v);
        this._isUsingCCD = v;
    }

    isUsingCCD (): boolean { return this._isUsingCCD; }

    setLinearFactor (v: IVec3Like): void {
        if (this.isStatic) return;
        this.impl.setRigidDynamicLockFlag(PX.RigidDynamicLockFlag.eLOCK_LINEAR_X, !v.x);
        this.impl.setRigidDynamicLockFlag(PX.RigidDynamicLockFlag.eLOCK_LINEAR_Y, !v.y);
        this.impl.setRigidDynamicLockFlag(PX.RigidDynamicLockFlag.eLOCK_LINEAR_Z, !v.z);
    }

    setAngularFactor (v: IVec3Like): void {
        if (this.isStatic) return;
        this.impl.setRigidDynamicLockFlag(PX.RigidDynamicLockFlag.eLOCK_ANGULAR_X, !v.x);
        this.impl.setRigidDynamicLockFlag(PX.RigidDynamicLockFlag.eLOCK_ANGULAR_Y, !v.y);
        this.impl.setRigidDynamicLockFlag(PX.RigidDynamicLockFlag.eLOCK_ANGULAR_Z, !v.z);
    }

    setAllowSleep (v: boolean): void {
        if (this.isStaticOrKinematic) return;
        const wc = v ? 0.0001 : 0xffffffff;
        this.impl.setWakeCounter(wc);
    }

    wakeUp (): void {
        if (!this.isInScene || this.isStatic) return;
        this.impl.wakeUp();
    }

    sleep (): void {
        if (!this.isInScene || this.isStatic) return;
        this.impl.putToSleep();
    }

    clearState (): void {
        if (!this.isInScene || this.isStatic) return;
        this.clearForces();
        this.clearVelocity();
    }

    clearForces (): void {
        if (!this.isInScene || this.isStatic) return;
        this._sharedBody.clearForces();
    }

    clearVelocity (): void {
        if (this.isStatic) return;
        this._sharedBody.clearVelocity();
    }

    setSleepThreshold (v: number): void {
        if (this.isStatic) return;
        //(approximated) mass-normalized kinetic energy
        const ke = 0.5 * v * v;
        this.impl.setSleepThreshold(ke);
    }

    getSleepThreshold (): number {
        if (this.isStatic) return 0;
        const ke = this.impl.getSleepThreshold();
        const v = Math.sqrt(2 * ke);
        return v;
    }

    getLinearVelocity (out: IVec3Like): void {
        if (this.isStatic) return;
        Vec3.copy(out, this.impl.getLinearVelocity());
    }

    setLinearVelocity (value: IVec3Like): void {
        if (this.isStaticOrKinematic) return;
        this.impl.setLinearVelocity(value, true);
    }

    getAngularVelocity (out: IVec3Like): void {
        if (this.isStatic) return;
        Vec3.copy(out, this.impl.getAngularVelocity());
    }

    setAngularVelocity (value: IVec3Like): void {
        if (this.isStaticOrKinematic) return;
        this.impl.setAngularVelocity(value, true);
    }

    applyForce (force: IVec3Like, relativePoint?: IVec3Like): void {
        if (!this.isInScene || this.isStaticOrKinematic) return;
        this._sharedBody.syncSceneToPhysics();
        const rp = relativePoint || Vec3.ZERO;
        applyForce(true, this.impl, force, rp);
    }

    applyLocalForce (force: IVec3Like, relativePoint?: IVec3Like): void {
        if (!this.isInScene || this.isStaticOrKinematic) return;
        this._sharedBody.syncSceneToPhysics();
        const rp = relativePoint || Vec3.ZERO;
        applyForce(false, this.impl, force, rp);
    }

    applyImpulse (force: IVec3Like, relativePoint?: IVec3Like): void {
        if (!this.isInScene || this.isStaticOrKinematic) return;
        this._sharedBody.syncSceneToPhysics();
        const rp = relativePoint || Vec3.ZERO;
        applyImpulse(true, this.impl, force, rp);
    }

    applyLocalImpulse (force: IVec3Like, relativePoint?: IVec3Like): void {
        if (!this.isInScene || this.isStaticOrKinematic) return;
        this._sharedBody.syncSceneToPhysics();
        const rp = relativePoint || Vec3.ZERO;
        applyImpulse(false, this.impl, force, rp);
    }

    applyTorque (torque: IVec3Like): void {
        if (!this.isInScene || this.isStaticOrKinematic) return;
        applyTorqueForce(this.impl, torque);
    }

    applyLocalTorque (torque: IVec3Like): void {
        if (!this.isInScene || this.isStaticOrKinematic) return;
        this._sharedBody.syncSceneToPhysics();
        Vec3.transformQuat(v3_0, torque, this._sharedBody.node.worldRotation);
        applyTorqueForce(this.impl, v3_0);
    }

    setGroup (v: number): void {
        this._sharedBody.setGroup(v);
    }

    getGroup (): number {
        return this._sharedBody.getGroup();
    }

    addGroup (v: number): void {
        this._sharedBody.addGroup(v);
    }

    removeGroup (v: number): void {
        this._sharedBody.removeGroup(v);
    }

    setMask (v: number): void {
        this._sharedBody.setMask(v);
    }

    getMask (): number {
        return this._sharedBody.getMask();
    }

    addMask (v: number): void {
        this._sharedBody.addMask(v);
    }

    removeMask (v: number): void {
        this._sharedBody.removeMask(v);
    }
}
