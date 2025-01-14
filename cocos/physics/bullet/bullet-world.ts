/* eslint-disable new-cap */
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

import { BulletSharedBody } from './bullet-shared-body';
import { BulletRigidBody } from './bullet-rigid-body';
import { BulletShape } from './shapes/bullet-shape';
import { ArrayCollisionMatrix } from '../utils/array-collision-matrix';
import { TupleDictionary } from '../utils/tuple-dictionary';
import { TriggerEventObject, CollisionEventObject, CC_V3_0, CC_V3_1, CC_V3_2, CC_COLOR_0, BulletCache, CharacterTriggerEventObject } from './bullet-cache';
import { bullet2CocosVec3, cocos2BulletQuat, cocos2BulletVec3 } from './bullet-utils';
import { IRaycastOptions, IPhysicsWorld } from '../spec/i-physics-world';
import { PhysicsRayResult, PhysicsMaterial, CharacterControllerContact, EPhysicsDrawFlags } from '../framework';
import { error, RecyclePool, Vec3, js, IVec3Like, geometry, IQuatLike, Quat } from '../../core';
import { BulletContactData } from './bullet-contact-data';
import { BulletConstraint } from './constraints/bullet-constraint';
import { BulletCharacterController } from './character-controllers/bullet-character-controller';
import { bt, EBulletType, EBulletTriangleRaycastFlag, EBulletDebugDrawModes, btCache } from './instantiated';
import { Node } from '../../scene-graph';
import { director } from '../../game';
import { GeometryRenderer } from '../../rendering/geometry-renderer';
import { importFunc } from './bullet-env';

const contactsPool: BulletContactData[] = [];
const v3_0 = CC_V3_0;
const v3_1 = CC_V3_1;
const v3_2 = CC_V3_2;
const c_0 = CC_COLOR_0;
const emitHit = new CharacterControllerContact();

/** @mangle */
export class BulletWorld implements IPhysicsWorld {
    setDefaultMaterial (v: PhysicsMaterial): void {
        //empty
    }

    setAllowSleep (v: boolean): void {
        bt.ccDiscreteDynamicsWorld_setAllowSleep(this._world, v);
    }

    setGravity (gravity: IVec3Like): void {
        bt.DynamicsWorld_setGravity(this._world, cocos2BulletVec3(BulletCache.instance.BT_V3_0, gravity));
    }

    updateNeedEmitEvents (v: boolean): void {
        if (!this.ghosts) return; // return if destroyed
        if (v) {
            this._needEmitEvents = true;
        } else {
            this._needEmitEvents = false;
            for (let i = 0; i < this.ghosts.length; i++) {
                const ghost = this.ghosts[i];
                const shapes = ghost.ghostStruct.wrappedShapes;
                for (let j = 0; j < shapes.length; j++) {
                    const collider = shapes[j].collider;
                    if (collider.needCollisionEvent || collider.needTriggerEvent) {
                        this._needEmitEvents = true;
                        return;
                    }
                }
            }

            for (let i = 0; i < this.bodies.length; i++) {
                const body = this.bodies[i];
                const shapes = body.bodyStruct.wrappedShapes;
                for (let j = 0; j < shapes.length; j++) {
                    const collider = shapes[j].collider;
                    if (collider.needCollisionEvent || collider.needTriggerEvent) {
                        this._needEmitEvents = true;
                        return;
                    }
                }
            }
        }
    }

    updateNeedEmitCCTEvents (force: boolean): void {
        if (!this.ccts) return; // return if already been removed from bullet world
        if (force) {
            this._needEmitCCTEvents = true;
        } else {
            this._needEmitCCTEvents = false;
            const ccts = this.ccts;
            const length = ccts.length;
            for (let i = 0; i < length; i++) {
                const cctCom = ccts[i].characterController;
                if (cctCom.needCollisionEvent) {
                    this._needEmitCCTEvents = true;
                    return;
                }
            }
        }
    }

    get impl (): Bullet.ptr {
        return this._world;
    }

    private readonly _world: Bullet.ptr;
    private readonly _broadphase: Bullet.ptr;
    private readonly _solver: Bullet.ptr;
    private readonly _dispatcher: Bullet.ptr;
    private readonly _debugDraw: Bullet.ptr;

    private _debugLineCount = 0;
    private _MAX_DEBUG_LINE_COUNT = 16384;
    private _debugDrawFlags = EPhysicsDrawFlags.NONE;
    private _debugConstraintSize = 0.3; //B3_DEFAULT_DEBUGDRAW_SIZE

    private _needEmitEvents = false;
    private _needSyncAfterEvents = false;
    private _needEmitCCTEvents = false;

    readonly bodies: BulletSharedBody[] = [];
    readonly ghosts: BulletSharedBody[] = [];
    readonly ccts: BulletCharacterController[] = [];
    readonly constraints: BulletConstraint[] = [];
    readonly triggerArrayMat = new ArrayCollisionMatrix();
    readonly characterControllerArrayMat = new ArrayCollisionMatrix();
    readonly collisionArrayMat = new ArrayCollisionMatrix();
    readonly contactsDic = new TupleDictionary();
    readonly oldContactsDic = new TupleDictionary();
    readonly cctShapeEventDic = new TupleDictionary();
    readonly cctContactsDic = new TupleDictionary();
    readonly cctOldContactsDic = new TupleDictionary();
    private static _sweepBoxGeometry: number;
    private static _sweepSphereGeometry: number;
    private static _sweepCapsuleGeometry: number;

    constructor () {
        btCache.CACHE.world = this;
        this._broadphase = bt.DbvtBroadphase_new();
        this._dispatcher = bt.CollisionDispatcher_new();
        this._solver = bt.SequentialImpulseConstraintSolver_new();
        this._world = bt.ccDiscreteDynamicsWorld_new(this._dispatcher, this._broadphase, this._solver);

        const debugDraw = bt.DebugDraw.implement(importFunc);//new PhysicsDebugDraw();
        this._debugDraw = debugDraw.$$.ptr;
        bt.CollisionWorld_setDebugDrawer(this._world, this._debugDraw);

        bt.DebugDraw_setDebugMode(this._debugDraw, EBulletDebugDrawModes.DBG_NoDebug);
        bt.DebugDraw_setAABBColor(this._debugDraw, 0, 1, 1);
        // set color for all shapes
        bt.DebugDraw_setActiveObjectColor(this._debugDraw, 1, 0, 1);
        bt.DebugDraw_setDeactiveObjectColor(this._debugDraw, 1, 0, 1);
        bt.DebugDraw_setWantsDeactivationObjectColor(this._debugDraw, 1, 0, 1);
        bt.DebugDraw_setDisabledDeactivationObjectColor(this._debugDraw, 1, 0, 1);
        bt.DebugDraw_setDisabledSimulationObjectColor(this._debugDraw, 1, 0, 1);
        // set color for all shapes END
        bt.DebugDraw_setConstraintLimitColor(this._debugDraw, 0.5, 0.5, 0.5);
    }

    destroy (): void {
        if (this.constraints.length || this.bodies.length || this.ccts.length) error('You should destroy all physics component first.');
        bt._safe_delete(this._world, EBulletType.EBulletTypeCollisionWorld);
        bt._safe_delete(this._broadphase, EBulletType.EBulletTypeDbvtBroadPhase);
        bt._safe_delete(this._dispatcher, EBulletType.EBulletTypeCollisionDispatcher);
        bt._safe_delete(this._solver, EBulletType.EBulletTypeSequentialImpulseConstraintSolver);
        bt._safe_delete(this._debugDraw, EBulletType.EBulletTypeDebugDraw);
        (this as any).bodies = null;
        (this as any).ghosts = null;
        (this as any).ccts = null;
        (this as any).constraints = null;
        (this as any).triggerArrayMat = null;
        (this as any).characterControllerArrayMat = null;
        (this as any).collisionArrayMat = null;
        (this as any).contactsDic = null;
        (this as any).oldContactsDic = null;
        (this as any).cctShapeEventDic = null;
        (this as any).cctShapeEventPool = null;
        contactsPool.length = 0;
    }

    step (deltaTime: number, timeSinceLastCalled?: number, maxSubStep = 0): void {
        if (!this.bodies.length && !this.ghosts.length) return;
        if (timeSinceLastCalled === undefined) timeSinceLastCalled = deltaTime;
        bt.DynamicsWorld_stepSimulation(this._world, timeSinceLastCalled, maxSubStep, deltaTime);
        bt.CollisionWorld_debugDrawWorld(this._world);
    }

    syncSceneToPhysics (): void {
        // Use reverse traversal order, because update dirty will mess up the ghosts or bodyies array.
        for (let i = this.ghosts.length - 1; i >= 0; i--) {
            const ghost = this.ghosts[i]; // Use temporary object, same reason as above
            ghost.updateDirty();
            ghost.syncSceneToGhost();
        }

        for (let i = this.bodies.length - 1; i >= 0; i--) {
            const body = this.bodies[i];
            body.updateDirty();
            body.syncSceneToPhysics();
        }

        const ccts = this.ccts;
        const length = ccts.length;
        for (let i = length - 1; i >= 0; i--) {
            const cct = ccts[i];
            cct.updateDirty();
            cct.syncSceneToPhysics();
        }
    }

    syncAfterEvents (): void {
        if (!this._needSyncAfterEvents) return;
        this.syncSceneToPhysics();
    }

    raycast (worldRay: geometry.Ray, options: IRaycastOptions, pool: RecyclePool<PhysicsRayResult>, results: PhysicsRayResult[]): boolean {
        worldRay.computeHit(v3_0, options.maxDistance);
        const to = cocos2BulletVec3(BulletCache.instance.BT_V3_0, v3_0);
        const from = cocos2BulletVec3(BulletCache.instance.BT_V3_1, worldRay.o);
        const allHitsCB = bt.ccAllRayCallback_static();
        bt.ccAllRayCallback_reset(allHitsCB, from, to, options.mask >>> 0, options.queryTrigger);
        bt.ccAllRayCallback_setFlags(allHitsCB, EBulletTriangleRaycastFlag.UseSubSimplexConvexCastRaytest);
        bt.CollisionWorld_rayTest(this._world, from, to, allHitsCB);
        if (bt.RayCallback_hasHit(allHitsCB)) {
            const posArray = bt.ccAllRayCallback_getHitPointWorld(allHitsCB);
            const normalArray = bt.ccAllRayCallback_getHitNormalWorld(allHitsCB);
            const ptrArray = bt.ccAllRayCallback_getCollisionShapePtrs(allHitsCB);
            const closestHitFraction = bt.ccAllRayCallback_getClosestHitFraction(allHitsCB);
            for (let i = 0, n = bt.int_array_size(ptrArray); i < n; i++) {
                bullet2CocosVec3(v3_0, bt.Vec3_array_at(posArray, i));
                bullet2CocosVec3(v3_1, bt.Vec3_array_at(normalArray, i));
                const shape = BulletCache.getWrapper<BulletShape>(bt.int_array_at(ptrArray, i), BulletShape.TYPE);
                const r = pool.add(); results.push(r);
                r._assign(v3_0, Vec3.distance(worldRay.o, v3_0), shape.collider, v3_1, closestHitFraction);
            }
            return true;
        }
        return false;
    }

    raycastClosest (worldRay: geometry.Ray, options: IRaycastOptions, result: PhysicsRayResult): boolean {
        worldRay.computeHit(v3_0, options.maxDistance);
        const to = cocos2BulletVec3(BulletCache.instance.BT_V3_0, v3_0);
        const from = cocos2BulletVec3(BulletCache.instance.BT_V3_1, worldRay.o);
        const closeHitCB = bt.ccClosestRayCallback_static();
        bt.ccClosestRayCallback_reset(closeHitCB, from, to, options.mask >>> 0, options.queryTrigger);
        bt.ccClosestRayCallback_setFlags(closeHitCB, EBulletTriangleRaycastFlag.UseSubSimplexConvexCastRaytest);
        bt.CollisionWorld_rayTest(this._world, from, to, closeHitCB);
        if (bt.RayCallback_hasHit(closeHitCB)) {
            bullet2CocosVec3(v3_0, bt.ccClosestRayCallback_getHitPointWorld(closeHitCB));
            bullet2CocosVec3(v3_1, bt.ccClosestRayCallback_getHitNormalWorld(closeHitCB));
            const shape = BulletCache.getWrapper<BulletShape>(bt.ccClosestRayCallback_getCollisionShapePtr(closeHitCB), BulletShape.TYPE);
            const closestHitFraction = bt.ccClosestConvexCallback_getClosestHitFraction(closeHitCB);
            result._assign(v3_0, Vec3.distance(worldRay.o, v3_0), shape.collider, v3_1, closestHitFraction);
            return true;
        }
        return false;
    }

    sweepBox (
        worldRay: geometry.Ray,
        halfExtent: IVec3Like,
        orientation: IQuatLike,
        options: IRaycastOptions,
        pool: RecyclePool<PhysicsRayResult>,
        results: PhysicsRayResult[],
    ): boolean {
        // cast shape
        const hf = BulletCache.instance.BT_V3_0;
        cocos2BulletVec3(hf, halfExtent);
        if (!BulletWorld._sweepBoxGeometry) {
            BulletWorld._sweepBoxGeometry =  bt.BoxShape_new(hf);
        }
        bt.BoxShape_setUnscaledHalfExtents(BulletWorld._sweepBoxGeometry, hf);

        return this.sweep(worldRay, BulletWorld._sweepBoxGeometry, orientation, options, pool, results);
    }

    sweepBoxClosest (
        worldRay: geometry.Ray,
        halfExtent: IVec3Like,
        orientation: IQuatLike,
        options: IRaycastOptions,
        result: PhysicsRayResult,
    ): boolean {
        // cast shape
        const hf = BulletCache.instance.BT_V3_0;
        cocos2BulletVec3(hf, halfExtent);
        if (!BulletWorld._sweepBoxGeometry) {
            BulletWorld._sweepBoxGeometry =  bt.BoxShape_new(hf);
        }
        bt.BoxShape_setUnscaledHalfExtents(BulletWorld._sweepBoxGeometry, hf);

        return this.sweepClosest(worldRay, BulletWorld._sweepBoxGeometry, orientation, options, result);
    }

    sweepSphere (
        worldRay: geometry.Ray,
        radius: number,
        options: IRaycastOptions,
        pool: RecyclePool<PhysicsRayResult>,
        results: PhysicsRayResult[],
    ): boolean {
        // cast shape
        if (!BulletWorld._sweepSphereGeometry) {
            BulletWorld._sweepSphereGeometry =  bt.SphereShape_new(radius);
        }
        bt.SphereShape_setUnscaledRadius(BulletWorld._sweepSphereGeometry, radius);
        return this.sweep(worldRay, BulletWorld._sweepSphereGeometry, Quat.IDENTITY, options, pool, results);
    }

    sweepSphereClosest (
        worldRay: geometry.Ray,
        radius: number,
        options: IRaycastOptions,
        result: PhysicsRayResult,
    ): boolean {
        // cast shape
        if (!BulletWorld._sweepSphereGeometry) {
            BulletWorld._sweepSphereGeometry =  bt.SphereShape_new(radius);
        }
        bt.SphereShape_setUnscaledRadius(BulletWorld._sweepSphereGeometry, radius);

        return this.sweepClosest(worldRay, BulletWorld._sweepSphereGeometry, Quat.IDENTITY, options, result);
    }

    sweepCapsule (
        worldRay: geometry.Ray,
        radius: number,
        height: number,
        orientation: IQuatLike,
        options: IRaycastOptions,
        pool: RecyclePool<PhysicsRayResult>,
        results: PhysicsRayResult[],
    ): boolean {
        // cast shape
        if (!BulletWorld._sweepCapsuleGeometry) {
            BulletWorld._sweepCapsuleGeometry =  bt.CapsuleShape_new(radius, height);
        }
        bt.CapsuleShape_updateProp(BulletWorld._sweepCapsuleGeometry, radius, height * 0.5, 1);
        return this.sweep(worldRay, BulletWorld._sweepCapsuleGeometry, orientation, options, pool, results);
    }

    sweepCapsuleClosest (
        worldRay: geometry.Ray,
        radius: number,
        height: number,
        orientation: IQuatLike,
        options: IRaycastOptions,
        result: PhysicsRayResult,
    ): boolean {
        // cast shape
        if (!BulletWorld._sweepCapsuleGeometry) {
            BulletWorld._sweepCapsuleGeometry =  bt.CapsuleShape_new(radius, height);
        }
        bt.CapsuleShape_updateProp(BulletWorld._sweepCapsuleGeometry, radius, height * 0.5, 1);

        return this.sweepClosest(worldRay, BulletWorld._sweepCapsuleGeometry, orientation, options, result);
    }

    sweep (
        worldRay: geometry.Ray,
        btShapePtr: number,
        orientation: IQuatLike,
        options: IRaycastOptions,
        pool: RecyclePool<PhysicsRayResult>,
        results: PhysicsRayResult[],
    ): boolean {
        const BT_fromTransform = BulletCache.instance.BT_TRANSFORM_0;
        const BT_toTransform = BulletCache.instance.BT_TRANSFORM_1;
        const BT_orientation = BulletCache.instance.BT_QUAT_0;

        // from transform
        cocos2BulletVec3(bt.Transform_getOrigin(BT_fromTransform), worldRay.o);
        cocos2BulletQuat(BT_orientation, orientation);
        bt.Transform_setRotation(BT_fromTransform, BT_orientation);

        // to transform
        worldRay.computeHit(v3_0, options.maxDistance);
        cocos2BulletVec3(bt.Transform_getOrigin(BT_toTransform), v3_0);
        cocos2BulletQuat(BT_orientation, orientation);
        bt.Transform_setRotation(BT_toTransform, BT_orientation);

        const allHitsCB = bt.ccAllConvexCallback_static();
        bt.ccAllConvexCallback_reset(allHitsCB, BT_fromTransform, BT_toTransform, options.mask >>> 0, options.queryTrigger);
        bt.CollisionWorld_convexSweepTest(this._world, btShapePtr, BT_fromTransform, BT_toTransform, allHitsCB, 0);
        if (bt.ConvexCallback_hasHit(allHitsCB)) {
            const posArray = bt.ccAllConvexCallback_getHitPointWorld(allHitsCB);
            const normalArray = bt.ccAllConvexCallback_getHitNormalWorld(allHitsCB);
            const ptrArray = bt.ccAllConvexCallback_getCollisionShapePtrs(allHitsCB);
            const closestHitFraction = bt.ccAllConvexCallback_getClosestHitFraction(allHitsCB);
            for (let i = 0, n = bt.int_array_size(ptrArray); i < n; i++) {
                bullet2CocosVec3(v3_0, bt.Vec3_array_at(posArray, i));
                bullet2CocosVec3(v3_1, bt.Vec3_array_at(normalArray, i));
                const shape = BulletCache.getWrapper<BulletShape>(bt.int_array_at(ptrArray, i), BulletShape.TYPE);
                const r = pool.add(); results.push(r);
                r._assign(v3_0, Vec3.distance(worldRay.o, v3_0), shape.collider, v3_1, closestHitFraction);
            }
            return true;
        }
        return false;
    }

    sweepClosest (
        worldRay: geometry.Ray,
        btShapePtr: number,
        orientation: IQuatLike,
        options: IRaycastOptions,
        result: PhysicsRayResult,
    ): boolean {
        const BT_fromTransform = BulletCache.instance.BT_TRANSFORM_0;
        const BT_toTransform = BulletCache.instance.BT_TRANSFORM_1;
        const BT_orientation = BulletCache.instance.BT_QUAT_0;

        // from transform
        cocos2BulletVec3(bt.Transform_getOrigin(BT_fromTransform), worldRay.o);
        cocos2BulletQuat(BT_orientation, orientation);
        bt.Transform_setRotation(BT_fromTransform, BT_orientation);

        // to transform
        worldRay.computeHit(v3_0, options.maxDistance);
        cocos2BulletVec3(bt.Transform_getOrigin(BT_toTransform), v3_0);
        cocos2BulletQuat(BT_orientation, orientation);
        bt.Transform_setRotation(BT_toTransform, BT_orientation);

        const closeHitCB = bt.ccClosestConvexCallback_static();
        bt.ccClosestConvexCallback_reset(closeHitCB, BT_fromTransform, BT_toTransform, options.mask >>> 0, options.queryTrigger);
        bt.CollisionWorld_convexSweepTest(this._world, btShapePtr, BT_fromTransform, BT_toTransform, closeHitCB, 0);
        if (bt.ConvexCallback_hasHit(closeHitCB)) {
            bullet2CocosVec3(v3_0, bt.ccClosestConvexCallback_getHitPointWorld(closeHitCB));
            bullet2CocosVec3(v3_1, bt.ccClosestConvexCallback_getHitNormalWorld(closeHitCB));
            const shape = BulletCache.getWrapper<BulletShape>(bt.ccClosestConvexCallback_getCollisionShapePtr(closeHitCB), BulletShape.TYPE);
            const closestHitFraction = bt.ccClosestConvexCallback_getClosestHitFraction(closeHitCB);
            result._assign(v3_0, Vec3.distance(worldRay.o, v3_0), shape.collider, v3_1, closestHitFraction);
            return true;
        }
        return false;
    }

    getSharedBody (node: Node, wrappedBody?: BulletRigidBody): BulletSharedBody {
        return BulletSharedBody.getSharedBody(node, this, wrappedBody);
    }

    addSharedBody (sharedBody: BulletSharedBody): void {
        const i = this.bodies.indexOf(sharedBody);
        if (i < 0) {
            this.bodies.push(sharedBody);
            const group = sharedBody.collisionFilterGroup;
            const mask = sharedBody.collisionFilterMask;
            bt.DynamicsWorld_addRigidBody(this._world, sharedBody.body, group >>> 0, mask >>> 0);
        }
    }

    removeSharedBody (sharedBody: BulletSharedBody): void {
        const i = this.bodies.indexOf(sharedBody);
        if (i >= 0) {
            js.array.fastRemoveAt(this.bodies, i);
            bt.DynamicsWorld_removeRigidBody(this._world, sharedBody.body);
        }
    }

    addGhostObject (sharedBody: BulletSharedBody): void {
        const i = this.ghosts.indexOf(sharedBody);
        if (i < 0) {
            this.ghosts.push(sharedBody);
            const group = sharedBody.collisionFilterGroup;
            const mask = sharedBody.collisionFilterMask;
            bt.CollisionWorld_addCollisionObject(this._world, sharedBody.ghost, group >>> 0, mask >>> 0);
        }
    }

    removeGhostObject (sharedBody: BulletSharedBody): void {
        const i = this.ghosts.indexOf(sharedBody);
        if (i >= 0) {
            js.array.fastRemoveAt(this.ghosts, i);
            bt.CollisionWorld_removeCollisionObject(this._world, sharedBody.ghost);
        }
    }

    addCCT (cct: BulletCharacterController): void {
        const index = this.ccts.indexOf(cct);
        if (index < 0) {
            this.ccts.push(cct);
            const cctGhost = bt.CharacterController_getGhostObject(cct.impl);
            const group = cct.getGroup();
            const mask = cct.getMask();
            bt.CollisionWorld_addCollisionObject(this._world, cctGhost, group >>> 0, mask >>> 0);
            bt.DynamicsWorld_addAction(this._world, cct.impl);
        }
    }

    removeCCT (cct: BulletCharacterController): void {
        const index = this.ccts.indexOf(cct);
        if (index >= 0) {
            js.array.fastRemoveAt(this.ccts, index);
            const cctGhost = bt.CharacterController_getGhostObject(cct.impl);
            bt.CollisionWorld_removeCollisionObject(this._world, cctGhost);
            bt.DynamicsWorld_removeAction(this._world, cct.impl);
        }
    }

    addConstraint (constraint: BulletConstraint): void {
        const i = this.constraints.indexOf(constraint);
        if (i < 0) {
            this.constraints.push(constraint);
            bt.DynamicsWorld_addConstraint(this.impl, constraint.impl, !constraint.constraint.enableCollision);
            constraint.index = i;
        }
    }

    removeConstraint (constraint: BulletConstraint): void {
        const i = this.constraints.indexOf(constraint);
        if (i >= 0) {
            this.constraints.splice(i, 1);
            bt.DynamicsWorld_removeConstraint(this.impl, constraint.impl);
            constraint.index = -1;
        }
    }

    emitEvents (): void {
        this._needSyncAfterEvents = false;

        if (this._needEmitEvents) {
            this.gatherConatactData();

            this.emitCollisionAndTriggerEvent();
            // emit cct trigger events
            this.emitCCTTriggerEvent();
        }

        // emit cct collision events
        if (this._needEmitCCTEvents) {
            this.emitCCTCollisionEvent();
        }
    }

    private emitCollisionAndTriggerEvent (): void {
        // is enter or stay
        let dicL = this.contactsDic.getLength();
        while (dicL--) {
            contactsPool.push.apply(contactsPool, CollisionEventObject.contacts as BulletContactData[]);
            CollisionEventObject.contacts.length = 0;
            const key = this.contactsDic.getKeyByIndex(dicL);
            const data = this.contactsDic.getDataByKey<any>(key);
            const shape0: BulletShape = data.shape0;
            const shape1: BulletShape = data.shape1;
            this.oldContactsDic.set(shape0.id, shape1.id, data);
            const collider0 = shape0.collider;
            const collider1 = shape1.collider;
            if (collider0 && collider1) {
                const isTrigger = collider0.isTrigger || collider1.isTrigger;
                if (isTrigger) {
                    if (this.triggerArrayMat.get(shape0.id, shape1.id)) {
                        TriggerEventObject.type = 'onTriggerStay';
                    } else {
                        TriggerEventObject.type = 'onTriggerEnter';
                        this.triggerArrayMat.set(shape0.id, shape1.id, true);
                    }
                    TriggerEventObject.impl = data.impl; //btPersistentManifold
                    TriggerEventObject.selfCollider = collider0;
                    TriggerEventObject.otherCollider = collider1;
                    collider0.emit(TriggerEventObject.type, TriggerEventObject);

                    TriggerEventObject.selfCollider = collider1;
                    TriggerEventObject.otherCollider = collider0;
                    collider1.emit(TriggerEventObject.type, TriggerEventObject);
                    this._needSyncAfterEvents = true;
                } else {
                    const body0 = collider0.attachedRigidBody;
                    const body1 = collider1.attachedRigidBody;
                    if (body0 && body1) {
                        if (body0.isSleeping && body1.isSleeping) continue;
                    } else if (!body0 && body1) {
                        if (body1.isSleeping) continue;
                    } else if (!body1 && body0) {
                        if (body0.isSleeping) continue;
                    }
                    if (this.collisionArrayMat.get(shape0.id, shape1.id)) {
                        CollisionEventObject.type = 'onCollisionStay';
                    } else {
                        CollisionEventObject.type = 'onCollisionEnter';
                        this.collisionArrayMat.set(shape0.id, shape1.id, true);
                    }

                    for (let i = 0; i < data.contacts.length; i++) {
                        const cq = data.contacts[i]; //btManifoldPoint
                        if (contactsPool.length > 0) {
                            const c = contactsPool.pop();
                            c!.impl = cq; //btManifoldPoint
                            CollisionEventObject.contacts.push(c!);
                        } else {
                            const c = new BulletContactData(CollisionEventObject);
                            c.impl = cq; //btManifoldPoint
                            CollisionEventObject.contacts.push(c);
                        }
                    }
                    CollisionEventObject.impl = data.impl; //btPersistentManifold
                    CollisionEventObject.selfCollider = collider0;
                    CollisionEventObject.otherCollider = collider1;
                    collider0.emit(CollisionEventObject.type, CollisionEventObject);

                    CollisionEventObject.selfCollider = collider1;
                    CollisionEventObject.otherCollider = collider0;
                    collider1.emit(CollisionEventObject.type, CollisionEventObject);
                    this._needSyncAfterEvents = true;
                }

                if (this.oldContactsDic.get(shape0.id, shape1.id) == null) {
                    this.oldContactsDic.set(shape0.id, shape1.id, data);
                }
            }
        }

        // is exit
        let oldDicL = this.oldContactsDic.getLength();
        while (oldDicL--) {
            const key = this.oldContactsDic.getKeyByIndex(oldDicL);
            const data = this.oldContactsDic.getDataByKey<any>(key);
            const shape0: BulletShape = data.shape0;
            const shape1: BulletShape = data.shape1;
            const collider0 = shape0.collider;
            const collider1 = shape1.collider;
            if (collider0 && collider1) {
                const isTrigger = collider0.isTrigger || collider1.isTrigger;
                if (this.contactsDic.getDataByKey(key) == null) {
                    if (isTrigger) {
                        if (this.triggerArrayMat.get(shape0.id, shape1.id)) {
                            TriggerEventObject.type = 'onTriggerExit';
                            TriggerEventObject.selfCollider = collider0;
                            TriggerEventObject.otherCollider = collider1;
                            collider0.emit(TriggerEventObject.type, TriggerEventObject);

                            TriggerEventObject.selfCollider = collider1;
                            TriggerEventObject.otherCollider = collider0;
                            collider1.emit(TriggerEventObject.type, TriggerEventObject);

                            this.triggerArrayMat.set(shape0.id, shape1.id, false);
                            this.oldContactsDic.set(shape0.id, shape1.id, null);
                            this._needSyncAfterEvents = true;
                        }
                    } else if (this.collisionArrayMat.get(shape0.id, shape1.id)) {
                        contactsPool.push.apply(contactsPool, CollisionEventObject.contacts as BulletContactData[]);
                        CollisionEventObject.contacts.length = 0;

                        CollisionEventObject.type = 'onCollisionExit';
                        CollisionEventObject.selfCollider = collider0;
                        CollisionEventObject.otherCollider = collider1;
                        collider0.emit(CollisionEventObject.type, CollisionEventObject);

                        CollisionEventObject.selfCollider = collider1;
                        CollisionEventObject.otherCollider = collider0;
                        collider1.emit(CollisionEventObject.type, CollisionEventObject);

                        this.collisionArrayMat.set(shape0.id, shape1.id, false);
                        this.oldContactsDic.set(shape0.id, shape1.id, null);
                        this._needSyncAfterEvents = true;
                    }
                }
            }
        }

        this.contactsDic.reset();
    }

    private emitCCTTriggerEvent (): void {
        // is enter or stay
        let dicL = this.cctContactsDic.getLength();
        while (dicL--) {
            const key = this.cctContactsDic.getKeyByIndex(dicL);
            const data = this.cctContactsDic.getDataByKey<any>(key);
            const shape: BulletShape = data.shape;
            const cct: BulletCharacterController = data.cct;
            this.cctOldContactsDic.set(shape.id, cct.id, data);
            const collider = shape.collider;
            const characterController = cct.characterController;
            if (collider && characterController) {
                const isTrigger = collider.isTrigger;
                if (isTrigger) {
                    if (this.characterControllerArrayMat.get(shape.id, cct.id)) {
                        CharacterTriggerEventObject.type = 'onControllerTriggerStay';
                    } else {
                        CharacterTriggerEventObject.type = 'onControllerTriggerEnter';
                        this.characterControllerArrayMat.set(shape.id, cct.id, true);
                    }
                    CharacterTriggerEventObject.impl = data.impl; //btPersistentManifold
                    CharacterTriggerEventObject.collider = collider;
                    CharacterTriggerEventObject.characterController = characterController;
                    collider.emit(CharacterTriggerEventObject.type, CharacterTriggerEventObject);

                    CharacterTriggerEventObject.collider = collider;
                    CharacterTriggerEventObject.characterController = characterController;
                    characterController.emit(CharacterTriggerEventObject.type, CharacterTriggerEventObject);
                    this._needSyncAfterEvents = true;
                }

                if (this.cctOldContactsDic.get(shape.id, cct.id) == null) {
                    this.cctOldContactsDic.set(shape.id, cct.id, data);
                }
            }
        }

        // is exit
        let oldDicL = this.cctOldContactsDic.getLength();
        while (oldDicL--) {
            const key = this.cctOldContactsDic.getKeyByIndex(oldDicL);
            const data = this.cctOldContactsDic.getDataByKey<any>(key);
            const shape: BulletShape = data.shape;
            const cct: BulletCharacterController = data.cct;
            const collider = shape.collider;
            const characterController = cct.characterController;
            if (collider && characterController) {
                const isTrigger = collider.isTrigger;
                if (this.cctContactsDic.getDataByKey(key) == null) {
                    if (isTrigger) {
                        if (this.characterControllerArrayMat.get(shape.id, cct.id)) {
                            CharacterTriggerEventObject.type = 'onControllerTriggerExit';
                            CharacterTriggerEventObject.collider = collider;
                            CharacterTriggerEventObject.characterController = characterController;
                            collider.emit(CharacterTriggerEventObject.type, CharacterTriggerEventObject);

                            CharacterTriggerEventObject.collider = collider;
                            CharacterTriggerEventObject.characterController = characterController;
                            characterController.emit(CharacterTriggerEventObject.type, CharacterTriggerEventObject);

                            this.characterControllerArrayMat.set(shape.id, cct.id, false);
                            this.cctOldContactsDic.set(shape.id, cct.id, null);
                            this._needSyncAfterEvents = true;
                        }
                    }
                }
            }
        }

        this.cctContactsDic.reset();
    }

    private emitCCTCollisionEvent (): void {
        let dicL = this.cctShapeEventDic.getLength();
        while (dicL--) {
            const key = this.cctShapeEventDic.getKeyByIndex(dicL);
            const data = this.cctShapeEventDic.getDataByKey<any>(key);
            const cct: BulletCharacterController = data.BulletCharacterController;
            const shape: BulletShape = data.BulletShape;
            const worldPos = data.worldPos as IVec3Like;
            const worldNormal = data.worldNormal as IVec3Like;
            const motionDir = data.motionDir as IVec3Like;
            const motionLength = data.motionLength;
            emitHit.controller = cct.characterController;
            emitHit.collider = shape.collider;
            emitHit.worldPosition.set(worldPos.x, worldPos.y, worldPos.z);
            emitHit.worldNormal.set(worldNormal.x, worldNormal.y, worldNormal.z);
            emitHit.motionDirection.set(motionDir.x, motionDir.y, motionDir.z);
            emitHit.motionLength = motionLength;
            emitHit.controller?.emit('onControllerColliderHit', emitHit);
            this._needSyncAfterEvents = true;
        }
        this.cctShapeEventDic.reset();
    }

    gatherConatactData (): void {
        const numManifolds = bt.Dispatcher_getNumManifolds(this._dispatcher);
        for (let i = 0; i < numManifolds; i++) {
            const manifold = bt.Dispatcher_getManifoldByIndexInternal(this._dispatcher, i);//btPersistentManifold
            const numContacts = bt.PersistentManifold_getNumContacts(manifold);
            for (let j = 0; j < numContacts; j++) {
                const manifoldPoint = bt.PersistentManifold_getContactPoint(manifold, j);//btManifoldPoint
                const s0 = bt.ManifoldPoint_getShape0(manifoldPoint);
                const s1 = bt.ManifoldPoint_getShape1(manifoldPoint);

                let processed = false;

                if (!processed) {
                    const shape0: BulletShape = BulletCache.getWrapper(s0, BulletShape.TYPE);
                    const shape1: BulletShape = BulletCache.getWrapper(s1, BulletShape.TYPE);
                    if (shape0 && shape1) {
                        processed = true;
                        if (shape0.collider.needTriggerEvent || shape1.collider.needTriggerEvent
                        || shape0.collider.needCollisionEvent || shape1.collider.needCollisionEvent) {
                            // current contact
                            let item = this.contactsDic.get<any>(shape0.id, shape1.id);
                            if (!item) {
                                item = this.contactsDic.set(
                                    shape0.id,
                                    shape1.id,
                                    { shape0, shape1, contacts: [], impl: manifold },
                                );
                            }
                            item.contacts.push(manifoldPoint);//btManifoldPoint
                        }
                    }
                }

                //cct - collider trigger event
                if (!processed) {
                    const shape: BulletShape = BulletCache.getWrapper(s0, BulletShape.TYPE);
                    const cct: BulletCharacterController = BulletCache.getWrapper(s1, btCache.CCT_CACHE_NAME);
                    if (shape && cct) {
                        processed = true;
                        if (shape.collider.needTriggerEvent) {
                            // current contact
                            let item = this.cctContactsDic.get<any>(shape.id, cct.id);
                            if (!item) {
                                item = this.cctContactsDic.set(
                                    shape.id,
                                    cct.id,
                                    { shape, cct, contacts: [], impl: manifold },
                                );
                            }
                            item.contacts.push(manifoldPoint);//btManifoldPoint
                            processed = true;
                        }
                    }
                }

                //cct - collider trigger event
                if (!processed) {
                    const cct: BulletCharacterController = BulletCache.getWrapper(s0, btCache.CCT_CACHE_NAME);
                    const shape: BulletShape = BulletCache.getWrapper(s1, BulletShape.TYPE);
                    if (shape && cct) {
                        processed = true;
                        if (shape.collider.needTriggerEvent) {
                            // current contact
                            let item = this.cctContactsDic.get<any>(shape.id, cct.id);
                            if (!item) {
                                item = this.cctContactsDic.set(
                                    shape.id,
                                    cct.id,
                                    { shape, cct, contacts: [], impl: manifold },
                                );
                            }
                            item.contacts.push(manifoldPoint);//btManifoldPoint
                            processed = true;
                        }
                    }
                }
            }
        }
    }

    get debugDrawFlags (): EPhysicsDrawFlags {
        return this._debugDrawFlags;
    }

    set debugDrawFlags (v: EPhysicsDrawFlags) {
        this._debugDrawFlags = v;
        if (this._debugDraw) {
            this._setDebugDrawMode();
        }
    }

    get debugDrawConstraintSize (): number {
        return this._debugConstraintSize;
    }

    set debugDrawConstraintSize (v) {
        this._debugConstraintSize = v;
        for (let i = 0; i < this.constraints.length; i++) {
            this.constraints[i].updateDebugDrawSize();
        }
    }

    private _setDebugDrawMode (): void {
        let btDrawMode = 0;
        if (this._debugDrawFlags & EPhysicsDrawFlags.WIRE_FRAME) {
            btDrawMode |= EBulletDebugDrawModes.DBG_DrawWireframe;
        }

        if (this._debugDrawFlags & EPhysicsDrawFlags.CONSTRAINT) {
            btDrawMode |= EBulletDebugDrawModes.DBG_DrawConstraints;
            btDrawMode |= EBulletDebugDrawModes.DBG_DrawConstraintLimits;
        }

        if (this._debugDrawFlags & EPhysicsDrawFlags.AABB) {
            btDrawMode |= EBulletDebugDrawModes.DBG_DrawAabb;
        }

        bt.DebugDraw_setDebugMode(this._debugDraw, btDrawMode);
    }

    private _getDebugRenderer (): GeometryRenderer|null {
        const cameras = director.root!.mainWindow?.cameras;
        if (!cameras) return null;
        if (cameras.length === 0) return null;
        if (!cameras[0]) return null;
        cameras[0].initGeometryRenderer();

        return cameras[0].geometryRenderer;
    }

    // callback function called by bullet wasm
    public onDebugDrawLine (from: number, to: number, color: number): void {
        const debugRenderer = this._getDebugRenderer();
        if (debugRenderer && this._debugLineCount < this._MAX_DEBUG_LINE_COUNT) {
            this._debugLineCount++;
            bullet2CocosVec3(v3_0, from);
            bullet2CocosVec3(v3_1, to);
            bullet2CocosVec3(v3_2, color);
            c_0.set(v3_2.x * 255, v3_2.y * 255, v3_2.z * 255, 255);
            debugRenderer.addLine(v3_0, v3_1, c_0);
        }
    }

    public onClearLines (): void {
        this._debugLineCount = 0;
    }
}
