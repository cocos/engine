/*
 Copyright (c) 2022-2023 Xiamen Yaji Software Co., Ltd.

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

import { DEBUG } from 'internal:constants';
import { B2, B2ObjectType, getTSObjectFromWASMObjectPtr } from './instantiated';
import { IRigidBody2D } from '../spec/i-rigid-body';
import { RigidBody2D } from '../framework/components/rigid-body-2d';
import { PhysicsSystem2D } from '../framework/physics-system';
import { B2PhysicsWorld } from './physics-world';
import { Vec2, toRadian, Vec3, Quat, IVec2Like, TWO_PI, HALF_PI, warn } from '../../core';
import { PHYSICS_2D_PTM_RATIO, ERigidBody2DType } from '../framework/physics-types';

import { Node } from '../../scene-graph/node';
import { Collider2D } from '../framework';
import { B2Shape2D } from './shapes/shape-2d';
import { B2Joint } from './joints/joint-2d';

const tempVec3 = new Vec3();
const tempVec2_1 = { x: 0, y: 0 };//new B2.Vec2(0, 0);
const tempVec2_2 = { x: 0, y: 0 };
export class B2RigidBody2D implements IRigidBody2D {
    get impl (): B2.Body | null {
        return this._body;
    }
    set _imp (v: B2.Body | null) {
        this._body = v;
    }

    get rigidBody (): RigidBody2D {
        return this._rigidBody;
    }
    get isAwake (): boolean {
        return this._body!.IsAwake();
    }
    get isSleeping (): boolean {
        return !(this._body!.IsAwake());
    }

    _animatedPos = new Vec2();
    _animatedAngle = 0;

    private _body: B2.Body | null = null;
    private _rigidBody!: RigidBody2D;

    private _inited = false;

    initialize (com: RigidBody2D): void {
        this._rigidBody = com;

        PhysicsSystem2D.instance._callAfterStep(this, this._init);
    }

    onDestroy (): void {
        PhysicsSystem2D.instance._callAfterStep(this, this._destroy);
    }

    onEnable (): void {
        this.setActive(true);
    }

    onDisable (): void {
        this.setActive(false);
    }

    nodeTransformChanged (type): void {
        if (PhysicsSystem2D.instance.stepping) {
            return;
        }

        if (type & Node.TransformBit.SCALE) {
            const colliders = this.rigidBody.getComponents(Collider2D);
            for (let i = 0; i < colliders.length; i++) {
                colliders[i].apply();
            }
        }
        if (type & Node.TransformBit.POSITION) {
            this.syncPositionToPhysics(true);
        }
        if (type & Node.TransformBit.ROTATION) {
            this.syncRotationToPhysics(true);
        }
    }

    _init (): void {
        if (this._inited) {
            return;
        }

        (PhysicsSystem2D.instance.physicsWorld as B2PhysicsWorld).addBody(this);
        this.setActive(false);

        this._inited = true;
    }

    _destroy (): void {
        if (!this._inited) return;

        //collect all fixtures attached to this rigid body and process them
        const fixtureList = this.impl?.GetFixtureList();
        if (fixtureList) {
            let shapeTSObj = getTSObjectFromWASMObjectPtr<B2Shape2D>(B2ObjectType.Fixture, fixtureList);
            while (shapeTSObj && shapeTSObj.impl) {
                shapeTSObj.destroy();
                const nextFixture = B2.FixtureGetNext(fixtureList) as number;
                shapeTSObj = getTSObjectFromWASMObjectPtr<B2Shape2D>(B2ObjectType.Fixture, nextFixture);
            }
        }

        //collect all joints attached to this rigid body and process them
        const jointListPtr = this.impl?.GetJointList();
        if (jointListPtr) {
            let jointWASMPtr = B2.JointEdgeGetJoint(jointListPtr) as number;
            let jointTSObj = getTSObjectFromWASMObjectPtr<B2Joint>(B2ObjectType.Fixture, jointWASMPtr);
            while (jointTSObj) {
                jointTSObj.destroy();
                jointWASMPtr = B2.JointEdgeGetNext(jointListPtr) as number;
                jointTSObj = getTSObjectFromWASMObjectPtr<B2Joint>(B2ObjectType.Fixture, jointWASMPtr);
            }
        }

        (PhysicsSystem2D.instance.physicsWorld as B2PhysicsWorld).removeBody(this);

        this._inited = false;
    }

    animate (dt: number): void {
        const b2body = this._body;
        if (!b2body) return;
        const b2Pos = b2body.GetPosition();

        b2body.SetAwake(true);

        const timeStep = 1 / dt;
        tempVec2_1.x = (this._animatedPos.x - b2Pos.x) * timeStep;
        tempVec2_1.y = (this._animatedPos.y - b2Pos.y) * timeStep;
        b2body.SetLinearVelocity(tempVec2_1);

        //convert b2Rotation to [-PI~PI], which is the same as this._animatedAngle
        let b2Rotation = b2body.GetAngle() % (TWO_PI);
        if (b2Rotation > Math.PI) {
            b2Rotation -= TWO_PI;
        }

        //calculate angular velocity
        let angularVelocity = (this._animatedAngle - b2Rotation) * timeStep;
        if (this._animatedAngle < -HALF_PI && b2Rotation > HALF_PI) { //ccw, crossing PI
            angularVelocity = (this._animatedAngle + TWO_PI - b2Rotation) * timeStep;
        } if (this._animatedAngle > HALF_PI && b2Rotation < -HALF_PI) { //cw, crossing PI
            angularVelocity = (this._animatedAngle - TWO_PI - b2Rotation) * timeStep;
        }

        b2body.SetAngularVelocity(angularVelocity);
    }

    syncSceneToPhysics (): void {
        const dirty = this._rigidBody.node.hasChangedFlags;
        if (dirty) { this.nodeTransformChanged(dirty); }
    }

    syncPositionToPhysics (enableAnimated = false): void {
        const b2body = this._body;
        if (!b2body) return;

        const pos = this._rigidBody.node.worldPosition;
        tempVec2_2.x = pos.x / PHYSICS_2D_PTM_RATIO;
        tempVec2_2.y = pos.y / PHYSICS_2D_PTM_RATIO;

        if (this._rigidBody.type === ERigidBody2DType.Animated && enableAnimated) {
            this._animatedPos.set(tempVec2_2.x, tempVec2_2.y);
        } else {
            b2body.SetTransform(tempVec2_2, b2body.GetAngle());
        }
    }

    syncRotationToPhysics (enableAnimated = false): void {
        const b2body = this._body;
        if (!b2body) return;

        const rot = this._rigidBody.node.worldRotation;
        const euler = tempVec3;
        Quat.toEulerInYXZOrder(euler, rot);
        const rotation = toRadian(euler.z);

        const bodyType = this._rigidBody.type;
        if (bodyType === ERigidBody2DType.Animated && enableAnimated) {
            this._animatedAngle = rotation;
        } else {
            b2body.SetTransform(b2body.GetPosition(), rotation);
        }
    }

    resetVelocity (): void {
        const b2body = this._body;
        if (!b2body) return;

        tempVec2_1.x = 0;
        tempVec2_1.y = 0;

        b2body.SetLinearVelocity(tempVec2_1);
        b2body.SetAngularVelocity(0);
    }

    setType (v: ERigidBody2DType): void {
        (PhysicsSystem2D.instance.physicsWorld as B2PhysicsWorld)._updateBodyType(this);
        if (v === ERigidBody2DType.Dynamic) {
            this._body!.SetType(B2.BodyType.b2_dynamicBody as B2.BodyType);
        } else if (v === ERigidBody2DType.Kinematic) {
            this._body!.SetType(B2.BodyType.b2_kinematicBody as B2.BodyType);
        } else if (v === ERigidBody2DType.Static) {
            this._body!.SetType(B2.BodyType.b2_staticBody as B2.BodyType);
        }
    }

    setLinearDamping (v: number): void {
        this._body!.SetLinearDamping(v);
    }
    setAngularDamping (v: number): void {
        this._body!.SetAngularDamping(v);
    }
    setGravityScale (v: number): void {
        this._body!.SetGravityScale(v);
    }
    setFixedRotation (v: boolean): void {
        this._body!.SetFixedRotation(v);
    }
    setAllowSleep (v: boolean): void {
        this._body!.SetSleepingAllowed(v);
    }
    isActive (): any {
        return this._body!.IsEnabled();
    }
    setActive (v: boolean): void {
        if (!this._body!.GetWorld().IsLocked()) {
            this._body!.SetEnabled(v);
        } else if (DEBUG) {
            warn('Can not active RigidBody in contract listener.');
        }
    }
    wakeUp (): void {
        this._body!.SetAwake(true);
    }
    sleep (): void {
        this._body!.SetAwake(false);
    }
    getMass (): any {
        return this._body!.GetMass();
    }
    setLinearVelocity (v: IVec2Like): void {
        this._body!.SetLinearVelocity(v as B2.Vec2);
    }
    getLinearVelocity<Out extends IVec2Like> (out: Out): Out {
        const velocity = this._body!.GetLinearVelocity();
        out.x = velocity.x;
        out.y = velocity.y;
        return out;
    }
    getLinearVelocityFromWorldPoint<Out extends IVec2Like> (worldPoint: IVec2Like, out: Out): Out {
        out = out || new Vec2();
        tempVec2_1.x = worldPoint.x / PHYSICS_2D_PTM_RATIO;
        tempVec2_1.y = worldPoint.y / PHYSICS_2D_PTM_RATIO;
        const temp = this._body!.GetLinearVelocityFromWorldPoint(tempVec2_1);
        out.x =  temp.x * PHYSICS_2D_PTM_RATIO;
        out.y =  temp.y * PHYSICS_2D_PTM_RATIO;
        return out;
    }
    setAngularVelocity (v: number): void {
        this._body!.SetAngularVelocity(v);
    }
    getAngularVelocity (): number {
        return this._body!.GetAngularVelocity();
    }

    getLocalVector<Out extends IVec2Like> (worldVector: IVec2Like, out: Out): Out {
        out = out || new Vec2();
        tempVec2_1.x = worldVector.x / PHYSICS_2D_PTM_RATIO;
        tempVec2_1.y = worldVector.y / PHYSICS_2D_PTM_RATIO;
        const temp = this._body!.GetLocalVector(tempVec2_1);
        out.x =  temp.x * PHYSICS_2D_PTM_RATIO;
        out.y =  temp.y * PHYSICS_2D_PTM_RATIO;
        return out;
    }
    getWorldVector<Out extends IVec2Like> (localVector: IVec2Like, out: Out): Out {
        tempVec2_1.x = localVector.x / PHYSICS_2D_PTM_RATIO;
        tempVec2_1.y = localVector.y / PHYSICS_2D_PTM_RATIO;
        const temp = this._body!.GetWorldVector(tempVec2_1);
        out.x =  temp.x * PHYSICS_2D_PTM_RATIO;
        out.y =  temp.y * PHYSICS_2D_PTM_RATIO;
        return out;
    }

    getLocalPoint<Out extends IVec2Like> (worldPoint: IVec2Like, out: Out): Out {
        out = out || new Vec2();
        tempVec2_1.x = worldPoint.x / PHYSICS_2D_PTM_RATIO;
        tempVec2_1.y = worldPoint.y / PHYSICS_2D_PTM_RATIO;
        const temp = this._body!.GetLocalPoint(tempVec2_1);
        out.x =  temp.x * PHYSICS_2D_PTM_RATIO;
        out.y =  temp.y * PHYSICS_2D_PTM_RATIO;
        return out;
    }

    getWorldPoint<Out extends IVec2Like> (localPoint: IVec2Like, out: Out): Out {
        out = out || new Vec2();
        tempVec2_1.x = localPoint.x / PHYSICS_2D_PTM_RATIO;
        tempVec2_1.y = localPoint.y / PHYSICS_2D_PTM_RATIO;
        const temp = this._body!.GetWorldPoint(tempVec2_1);
        out.x =  temp.x * PHYSICS_2D_PTM_RATIO;
        out.y =  temp.y * PHYSICS_2D_PTM_RATIO;
        return out;
    }

    getLocalCenter<Out extends IVec2Like> (out: Out): Out {
        out = out || new Vec2();
        const pos = this._body!.GetLocalCenter();
        out.x = pos.x * PHYSICS_2D_PTM_RATIO;
        out.y = pos.y * PHYSICS_2D_PTM_RATIO;
        return out;
    }
    getWorldCenter<Out extends IVec2Like> (out: Out): Out {
        out = out || new Vec2();
        const pos = this._body!.GetWorldCenter();
        out.x = pos.x * PHYSICS_2D_PTM_RATIO;
        out.y = pos.y * PHYSICS_2D_PTM_RATIO;
        return out;
    }

    getInertia (): any {
        return this._body!.GetInertia();
    }

    applyForce (force: IVec2Like, point: IVec2Like, wake: boolean): void {
        if (this._body) {
            tempVec2_1.x = point.x / PHYSICS_2D_PTM_RATIO;
            tempVec2_1.y = point.y / PHYSICS_2D_PTM_RATIO;
            this._body.ApplyForce(force as B2.Vec2, tempVec2_1, wake);
        }
    }

    applyForceToCenter (force: IVec2Like, wake: boolean): void {
        if (this._body) {
            this._body.ApplyForceToCenter(force as B2.Vec2, wake);
        }
    }

    applyTorque (torque: number, wake: boolean): void {
        if (this._body) {
            this._body.ApplyTorque(torque, wake);
        }
    }

    applyLinearImpulse (impulse: IVec2Like, point: IVec2Like, wake: boolean): void {
        if (this._body) {
            tempVec2_1.x = point.x / PHYSICS_2D_PTM_RATIO;
            tempVec2_1.y = point.y / PHYSICS_2D_PTM_RATIO;
            this._body.ApplyLinearImpulse(impulse as B2.Vec2, tempVec2_1, wake);
        }
    }

    applyLinearImpulseToCenter (impulse: IVec2Like, wake: boolean): void {
        if (this._body) {
            this._body.ApplyLinearImpulse(impulse as B2.Vec2, this._body.GetPosition(), wake);
        }
    }

    applyAngularImpulse (impulse: number, wake: boolean): void {
        if (this._body) {
            this._body.ApplyAngularImpulse(impulse, wake);
        }
    }
}
