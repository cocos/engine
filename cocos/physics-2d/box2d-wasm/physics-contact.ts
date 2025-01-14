/*
 Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.

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

import { B2, B2ObjectType, addImplPtrReference, getTSObjectFromWASMObjectPtr, removeImplPtrReference } from './instantiated';
import { Vec2 } from '../../core';
import { PHYSICS_2D_PTM_RATIO } from '../framework/physics-types';
import { Collider2D, Contact2DType, PhysicsSystem2D } from '../framework';
import { B2Shape2D } from './shapes/shape-2d';
import { IPhysics2DContact, IPhysics2DImpulse, IPhysics2DManifoldPoint, IPhysics2DWorldManifold } from '../spec/i-physics-contact';

const pools: PhysicsContact[] = [];

// temp world manifold
const pointCache = [new Vec2(), new Vec2()];

const worldmanifold: IPhysics2DWorldManifold = {
    points: [] as Vec2[],
    separations: [] as number[],
    normal: new Vec2(),
};

class ManifoldPoint implements IPhysics2DManifoldPoint {
    localPoint = new Vec2();
    normalImpulse = 0;
    tangentImpulse = 0;
}

const manifoldPointCache = [new ManifoldPoint(), new ManifoldPoint()];

const manifold = {
    type: 0,
    localPoint: new Vec2(),
    localNormal: new Vec2(),
    points: [] as ManifoldPoint[],
};

const impulse: IPhysics2DImpulse = {
    normalImpulses: [] as number[],
    tangentImpulses: [] as number[],
};

/** @mangle */
export class PhysicsContact implements IPhysics2DContact {
    static get (b2contact: number): PhysicsContact {
        let c = pools.pop();

        if (!c) {
            c = new PhysicsContact();
        }

        c.init(b2contact);
        return c;
    }

    static put (b2contact: number): void {
        const c = getTSObjectFromWASMObjectPtr<PhysicsContact>(B2ObjectType.Contact, b2contact);
        if (!c) return;

        pools.push(c);
        c.reset();
    }

    colliderA: Collider2D | null = null;
    colliderB: Collider2D | null = null;

    disabled = false;
    disabledOnce = false;

    private _impulsePtr: number = 0;
    private _inverted = false;
    private _implPtr: number = 0;   //wasm object pointer
    private _b2WorldmanifoldPtr: number = 0; //wasm object pointer

    _setImpulse (impulse: number): void {
        this._impulsePtr = impulse;
    }

    init (b2contact: number): void {
        const ab = B2.ContactGetFixture(b2contact) as Vec2;
        this.colliderA = (getTSObjectFromWASMObjectPtr<B2Shape2D>(B2ObjectType.Fixture, ab.x)).collider;
        this.colliderB = (getTSObjectFromWASMObjectPtr<B2Shape2D>(B2ObjectType.Fixture, ab.y)).collider;
        this.disabled = false;
        this.disabledOnce = false;
        this._impulsePtr = 0;
        this._inverted = false;

        this._implPtr = b2contact;
        addImplPtrReference(B2ObjectType.Contact, this, this._implPtr);
        this._b2WorldmanifoldPtr = B2.WorldManifoldNew();
    }

    reset (): void {
        this.setTangentSpeed(0);
        this.resetFriction();
        this.resetRestitution();

        this.colliderA = null;
        this.colliderB = null;
        this.disabled = false;
        this._impulsePtr = 0;

        removeImplPtrReference(B2ObjectType.Contact, this._implPtr);
        this._implPtr = 0;

        B2.WorldManifoldDelete(this._b2WorldmanifoldPtr);
        this._b2WorldmanifoldPtr = 0;
    }

    getWorldManifold (): IPhysics2DWorldManifold {
        const points = worldmanifold.points;
        const separations = worldmanifold.separations;
        const normal = worldmanifold.normal;

        B2.ContactGetWorldManifold(this._implPtr, this._b2WorldmanifoldPtr);
        const b2Manifold = B2.ContactGetManifold(this._implPtr);
        const count = B2.ManifoldGetPointCount(b2Manifold);
        points.length = separations.length = count;

        for (let i = 0; i < count; i++) {
            const p = pointCache[i];
            p.x = B2.WorldManifoldGetPointValueX(this._b2WorldmanifoldPtr, i) * PHYSICS_2D_PTM_RATIO;
            p.y = B2.WorldManifoldGetPointValueY(this._b2WorldmanifoldPtr, i) * PHYSICS_2D_PTM_RATIO;
            points[i] = p;
            separations[i] = B2.WorldManifoldGetSeparationValue(this._b2WorldmanifoldPtr, i) * PHYSICS_2D_PTM_RATIO;
        }

        normal.x = B2.WorldManifoldGetNormalValueX(this._b2WorldmanifoldPtr);
        normal.y = B2.WorldManifoldGetNormalValueY(this._b2WorldmanifoldPtr);

        if (this._inverted) {
            normal.x *= -1;
            normal.y *= -1;
        }

        return worldmanifold;
    }

    getManifold (): { type: number; localPoint: Vec2; localNormal: Vec2; points: ManifoldPoint[]; } {
        const points = manifold.points;
        const localNormal = manifold.localNormal;
        const localPoint = manifold.localPoint;

        const b2Manifold = B2.ContactGetManifold(this._implPtr);
        const count = points.length = B2.ManifoldGetPointCount(b2Manifold);

        for (let i = 0; i < count; i++) {
            const p = manifoldPointCache[i];
            const b2p = B2.ManifoldGetManifoldPointPtr(b2Manifold, i);//B2.ManifoldPoint
            p.localPoint.x = B2.ManifoldPointGetLocalPointX(b2p) * PHYSICS_2D_PTM_RATIO;
            p.localPoint.y = B2.ManifoldPointGetLocalPointY(b2p) * PHYSICS_2D_PTM_RATIO;
            p.normalImpulse = B2.ManifoldPointGetNormalImpulse(b2p) * PHYSICS_2D_PTM_RATIO;
            p.tangentImpulse = B2.ManifoldPointGetTangentImpulse(b2p); //* PHYSICS_2D_PTM_RATIO;?
            points[i] = p;
        }

        localPoint.x = B2.ManifoldGetLocalPointValueX(b2Manifold) * PHYSICS_2D_PTM_RATIO;
        localPoint.y = B2.ManifoldGetLocalPointValueY(b2Manifold) * PHYSICS_2D_PTM_RATIO;
        localNormal.x = B2.ManifoldGetLocalNormalValueX(b2Manifold);
        localNormal.y = B2.ManifoldGetLocalNormalValueY(b2Manifold);
        manifold.type = B2.ManifoldGetType(b2Manifold);

        if (this._inverted) {
            localNormal.x *= -1;
            localNormal.y *= -1;
        }

        return manifold;
    }

    getImpulse (): IPhysics2DImpulse | null {
        const b2impulse = this._impulsePtr;
        if (!b2impulse) return null;

        const normalImpulses = impulse.normalImpulses;
        const tangentImpulses = impulse.tangentImpulses;
        const count = B2.ContactImpulseGetCount(b2impulse);
        for (let i = 0; i < count; i++) {
            normalImpulses[i] = B2.ContactImpulseGetNormalImpulse(b2impulse, i) * PHYSICS_2D_PTM_RATIO;
            tangentImpulses[i] = B2.ContactImpulseGetTangentImpulse(b2impulse, i);
        }

        tangentImpulses.length = normalImpulses.length = count;

        return impulse;
    }

    emit (contactType: string): void {
        const colliderA = this.colliderA;
        const colliderB = this.colliderB;

        const bodyA = colliderA!.body;
        const bodyB = colliderB!.body;

        if (bodyA!.enabledContactListener) {
            colliderA?.emit(contactType, colliderA, colliderB, this);
        }

        if (bodyB!.enabledContactListener) {
            colliderB?.emit(contactType, colliderB, colliderA, this);
        }

        if (bodyA!.enabledContactListener || bodyB!.enabledContactListener) {
            PhysicsSystem2D.instance.emit(contactType, colliderA, colliderB, this);
        }

        if (this.disabled || this.disabledOnce) {
            this.setEnabled(false);
            this.disabledOnce = false;
        }
    }

    setEnabled (value: boolean): void {
        B2.ContactSetEnabled(this._implPtr, value);
    }

    isTouching (): boolean {
        return B2.ContactIsTouching(this._implPtr) as boolean;
    }

    setTangentSpeed (value: number): void {
        B2.ContactSetTangentSpeed(this._implPtr, value);
    }

    getTangentSpeed (): number {
        return B2.ContactGetTangentSpeed(this._implPtr) as number;
    }

    setFriction (value: number): void {
        B2.ContactSetFriction(this._implPtr, value);
    }

    getFriction (): number {
        return B2.ContactGetFriction(this._implPtr) as number;
    }

    resetFriction (): void {
        B2.ContactResetFriction(this._implPtr);
    }

    setRestitution (value: number): void {
        B2.ContactSetRestitution(this._implPtr, value);
    }

    getRestitution (): number {
        return B2.ContactGetRestitution(this._implPtr) as number;
    }

    resetRestitution (): void {
        B2.ContactResetRestitution(this._implPtr);
    }
}
