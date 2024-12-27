/*
 Copyright (c) 2024 Xiamen Yaji Software Co., Ltd.

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

import { Vec2 } from '../../core';
import { PHYSICS_2D_PTM_RATIO } from '../framework/physics-types';
import { Collider2D, Contact2DType, PhysicsSystem2D } from '../framework';
import { b2Shape2D } from './shapes/shape-2d';
import { IPhysics2DContact, IPhysics2DImpulse, IPhysics2DManifoldPoint, IPhysics2DWorldManifold } from '../spec/i-physics-contact';

export type b2ContactExtends = b2.Contact & {
    m_userData: any
}

const pools: PhysicsContact[] = [];

// temp world manifold
const pointCache = [new Vec2(), new Vec2()];

// const b2worldmanifold = new b2.WorldManifold();

const b2worldmanifold = {
    normal: { x: 0, y: 0 },							///< world vector pointing from A to B
    points: [{ x: 0, y: 0 }, { x: 0, y: 0 }], //b2_maxManifoldPoints];		///< world contact point (point of intersection)
    separations: [0, 0],  //[b2_maxManifoldPoints];	///< a negative value indicates overlap, in meters
};

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

export class PhysicsContact implements IPhysics2DContact {
    static get (b2contact: b2ContactExtends): PhysicsContact {
        let c = pools.pop();

        if (!c) {
            c = new PhysicsContact();
        }

        c.init(b2contact);
        return c;
    }

    static put (b2contact: b2ContactExtends): void {
        const c: PhysicsContact = b2contact.m_userData as PhysicsContact;
        if (!c) return;

        pools.push(c);
        c.reset();
    }

    colliderA: Collider2D | null = null;
    colliderB: Collider2D | null = null;

    disabled = false;
    disabledOnce = false;

    private _impulse: b2.ContactImpulse | null = null;
    private _inverted = false;
    private _b2contact: b2ContactExtends | null = null;

    _setImpulse (impulse: b2.ContactImpulse | null): void {
        this._impulse = impulse;
    }

    init (b2contact: b2ContactExtends): void {
        this.colliderA = (b2contact.GetFixtureA().m_userData as b2Shape2D).collider;
        this.colliderB = (b2contact.GetFixtureB().m_userData as b2Shape2D).collider;
        this.disabled = false;
        this.disabledOnce = false;
        this._impulse = null;

        this._inverted = false;

        this._b2contact = b2contact;
        b2contact.m_userData = this;
    }

    reset (): void {
        this.setTangentSpeed(0);
        this.resetFriction();
        this.resetRestitution();

        this.colliderA = null;
        this.colliderB = null;
        this.disabled = false;
        this._impulse = null;

        this._b2contact.m_userData = null;
        this._b2contact = null;
    }

    getWorldManifold (): IPhysics2DWorldManifold {
        const points = worldmanifold.points;
        const separations = worldmanifold.separations;
        const normal = worldmanifold.normal;

        this._b2contact.GetWorldManifold(b2worldmanifold);
        const b2points = b2worldmanifold.points;
        const b2separations = b2worldmanifold.separations;

        const count = this._b2contact.GetManifold().pointCount;
        points.length = separations.length = count;

        for (let i = 0; i < count; i++) {
            const p = pointCache[i];
            p.x = b2points[i].x * PHYSICS_2D_PTM_RATIO;
            p.y = b2points[i].y * PHYSICS_2D_PTM_RATIO;

            points[i] = p;
            separations[i] = b2separations[i] * PHYSICS_2D_PTM_RATIO;
        }

        normal.x = b2worldmanifold.normal.x;
        normal.y = b2worldmanifold.normal.y;

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

        const b2manifold = this._b2contact.GetManifold();
        const b2points = b2manifold.points;
        const count = points.length = b2manifold.pointCount;

        for (let i = 0; i < count; i++) {
            const p = manifoldPointCache[i];
            const b2p = b2points[i];
            p.localPoint.x = b2p.localPoint.x * PHYSICS_2D_PTM_RATIO;
            p.localPoint.y = b2p.localPoint.y * PHYSICS_2D_PTM_RATIO;
            p.normalImpulse = b2p.normalImpulse * PHYSICS_2D_PTM_RATIO;
            p.tangentImpulse = b2p.tangentImpulse;

            points[i] = p;
        }

        localPoint.x = b2manifold.localPoint.x * PHYSICS_2D_PTM_RATIO;
        localPoint.y = b2manifold.localPoint.y * PHYSICS_2D_PTM_RATIO;
        localNormal.x = b2manifold.localNormal.x;
        localNormal.y = b2manifold.localNormal.y;
        manifold.type = b2manifold.type;

        if (this._inverted) {
            localNormal.x *= -1;
            localNormal.y *= -1;
        }

        return manifold;
    }

    getImpulse (): IPhysics2DImpulse | null {
        const b2impulse = this._impulse;
        if (!b2impulse) return null;

        const normalImpulses = impulse.normalImpulses;
        const tangentImpulses = impulse.tangentImpulses;
        const count = b2impulse.count;
        for (let i = 0; i < count; i++) {
            normalImpulses[i] = b2impulse.normalImpulses[i] * PHYSICS_2D_PTM_RATIO;
            tangentImpulses[i] = b2impulse.tangentImpulses[i];
        }

        tangentImpulses.length = normalImpulses.length = count;

        return impulse;
    }

    emit (contactType: string): void {
        let func = '';
        switch (contactType) {
        case Contact2DType.BEGIN_CONTACT:
            func = 'onBeginContact';
            break;
        case Contact2DType.END_CONTACT:
            func = 'onEndContact';
            break;
        case Contact2DType.PRE_SOLVE:
            func = 'onPreSolve';
            break;
        case Contact2DType.POST_SOLVE:
            func = 'onPostSolve';
            break;
        default:
            break;
        }

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

    setEnabled (value): void {
        this._b2contact.SetEnabled(value);
    }

    isTouching (): boolean {
        return this._b2contact.IsTouching();
    }

    setTangentSpeed (value): void {
        this._b2contact.SetTangentSpeed(value);
    }

    getTangentSpeed (): number {
        return this._b2contact.GetTangentSpeed();
    }

    setFriction (value): void {
        this._b2contact.SetFriction(value);
    }

    getFriction (): number {
        return this._b2contact.GetFriction();
    }

    resetFriction (): void {
        return this._b2contact.ResetFriction();
    }

    setRestitution (value): void {
        this._b2contact.SetRestitution(value);
    }

    getRestitution (): number {
        return this._b2contact.GetRestitution();
    }

    resetRestitution (): void {
        return this._b2contact.ResetRestitution();
    }
}
