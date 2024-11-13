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

/* eslint-disable import/no-mutable-exports */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable consistent-return */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable no-lonely-if */
/* eslint-disable import/order */

import { NativeCodeBundleMode } from '../../misc/webassembly-support';
import { ensureWasmModuleReady, instantiateWasm } from 'pal/wasm';
import { EDITOR, TEST, NATIVE_CODE_BUNDLE_MODE, LOAD_PHYSX_MANUALLY, BUILD } from 'internal:constants';
import { IQuatLike, IVec3Like, Quat, RecyclePool, Vec3, cclegacy, geometry, sys, Color, error, IVec3 } from '../../core';
import { shrinkPositions } from '../utils/util';
import { IRaycastOptions } from '../spec/i-physics-world';
import { IPhysicsConfig, PhysicsRayResult } from '../framework';
import { PhysXWorld } from './physx-world';
import { PhysXInstance } from './physx-instance';
import { PhysXShape } from './shapes/physx-shape';
import { PxHitFlag, PxQueryFlag, EFilterDataWord3 } from './physx-enum';
import { Node } from '../../scene-graph';
import { game } from '../../game';

export let PX = {} as any;
const globalThis = cclegacy._global;
// Use bytedance native or js physics if nativePhysX is not null.
const USE_EXTERNAL_PHYSX = !!globalThis.PHYSX;

if (!BUILD || !LOAD_PHYSX_MANUALLY) {
    // Init physx libs when engine init.
    game.onPostInfrastructureInitDelegate.add(initPhysXLibs);
}

export function initPhysXLibs (): Promise<void> {
    const errorReport = (msg: any): void => { error(msg); };
    return ensureWasmModuleReady().then(() => {
        if (shouldUseWasmModule()) {
            return Promise.all([
                import('external:emscripten/physx/physx.release.wasm.js'),
                import('external:emscripten/physx/physx.release.wasm.wasm'),
            ]).then(([
                { default: physxWasmFactory },
                { default: physxWasmUrl },
            ]) => initWASM(physxWasmFactory, physxWasmUrl));
        } else {
            return import('external:emscripten/physx/physx.release.asm.js').then(
                ({ default: physxAsmFactory }) => initASM(physxAsmFactory),
            );
        }
    }).catch(errorReport);
}

function initASM (physxAsmFactory): Promise<void> {
    globalThis.PhysX = globalThis.PHYSX ? globalThis.PHYSX : physxAsmFactory;
    if (globalThis.PhysX != null) {
        return globalThis.PhysX().then((Instance: any): void => {
            if (!EDITOR && !TEST) console.debug('[PHYSICS]:', `${USE_EXTERNAL_PHYSX ? 'External' : 'Internal'} PhysX asm libs loaded.`);
            initAdaptWrapper(Instance);
            initConfigAndCacheObject(Instance);
            Object.assign(PX, Instance);
        }, (reason: any): void => { console.error('[PHYSICS]:', `PhysX asm load failed: ${reason}`); });
    } else {
        if (!EDITOR && !TEST) console.error('[PHYSICS]:', 'Failed to load PhysX js libs, package may be not found.');
        return new Promise<void>((resolve, reject): void => {
            resolve();
        });
    }
}

function initWASM (physxWasmFactory, physxWasmUrl: string): Promise<void> {
    globalThis.PhysX = globalThis.PHYSX ? globalThis.PHYSX : physxWasmFactory;
    if (globalThis.PhysX != null) {
        return globalThis.PhysX({
            instantiateWasm (
                importObject: WebAssembly.Imports,
                receiveInstance: (instance: WebAssembly.Instance, module: WebAssembly.Module) => void,
            ): any {
                return instantiateWasm(physxWasmUrl, importObject).then((result): void => {
                    receiveInstance(result.instance, result.module);
                });
            },
        }).then((Instance: any): void => {
            if (!EDITOR && !TEST) console.debug('[PHYSICS]:', `${USE_EXTERNAL_PHYSX ? 'External' : 'Internal'} PhysX wasm libs loaded.`);
            initAdaptWrapper(Instance);
            initConfigAndCacheObject(Instance);
            PX = Instance;
        }, (reason: any): void => { console.error('[PHYSICS]:', `PhysX wasm load failed: ${reason}`); });
    } else {
        if (!EDITOR && !TEST) console.error('[PHYSICS]:', 'Failed to load PhysX wasm libs, package may be not found.');
        return new Promise<void>((resolve, reject): void => {
            resolve();
        });
    }
}

function shouldUseWasmModule (): boolean {
    if (NATIVE_CODE_BUNDLE_MODE === (NativeCodeBundleMode.BOTH as number)) {
        return sys.hasFeature(sys.Feature.WASM);
    } else if (NATIVE_CODE_BUNDLE_MODE === (NativeCodeBundleMode.WASM as number)) {
        return true;
    } else {
        return false;
    }
}

function initConfigAndCacheObject (PX: any): void {
    globalThis.PhysX = PX;
    PX.EPSILON = 1e-3;
    PX.MULTI_THREAD = false;
    PX.SUB_THREAD_COUNT = 1;
    PX.CACHE_MAT = {};
    PX.IMPL_PTR = {};
    PX.MESH_CONVEX = {};
    PX.MESH_STATIC = {};
    PX.TERRAIN_STATIC = {};
}

function initAdaptWrapper (obj: any): void {
    obj.VECTOR_MAT = new obj.PxMaterialVector();
    obj.MeshScale = obj.PxMeshScale;
    obj.ShapeFlag = obj.PxShapeFlag;
    obj.ActorFlag = obj.PxActorFlag;
    obj.ForceMode = obj.PxForceMode;
    obj.CombineMode = obj.PxCombineMode;
    obj.BoxGeometry = obj.PxBoxGeometry;
    obj.QueryHitType = obj.PxQueryHitType;
    obj.RigidBodyFlag = obj.PxRigidBodyFlag;
    obj.PlaneGeometry = obj.PxPlaneGeometry;
    obj.SphereGeometry = obj.PxSphereGeometry;
    obj.CapsuleGeometry = obj.PxCapsuleGeometry;
    obj.ConvexMeshGeometry = obj.PxConvexMeshGeometry;
    obj.D6Motion = obj.PxD6Motion;
    obj.D6Axis = obj.PxD6Axis;
    obj.D6Drive = obj.PxD6Drive;
    obj.D6JointDrive = obj.PxD6JointDrive;
    obj.LinearLimitPair = obj.PxJointLinearLimitPair;
    obj.AngularLimitPair = obj.PxJointAngularLimitPair;
    obj.TriangleMeshGeometry = obj.PxTriangleMeshGeometry;
    obj.RigidDynamicLockFlag = obj.PxRigidDynamicLockFlag;
    obj.TolerancesScale = obj.PxTolerancesScale;
    obj.RevoluteJointFlags = { eLIMIT_ENABLED: 1 << 0, eDRIVE_ENABLED: 1 << 1, eDRIVE_FREESPIN: 1 << 2 };
    obj.JointAngularLimitPair = obj.PxJointAngularLimitPair;
    obj.createRevoluteJoint = (a: any, b: any, c: any, d: any): any => obj.PxRevoluteJointCreate(PX.physics, a, b, c, d);
    obj.createFixedConstraint = (a: any, b: any, c: any, d: any): any => obj.PxFixedJointCreate(PX.physics, a, b, c, d);
    obj.createSphericalJoint = (a: any, b: any, c: any, d: any): any => obj.PxSphericalJointCreate(PX.physics, a, b, c, d);
    obj.createD6Joint = (a: any, b: any, c: any, d: any): any => obj.PxD6JointCreate(PX.physics, a, b, c, d);
}

const _v3: IVec3Like = { x: 0, y: 0, z: 0 };
const _v4: IQuatLike = { x: 0, y: 0, z: 0, w: 1 };
export const _trans = {
    translation: _v3,
    rotation: _v4,
    p: _v3,
    q: _v4,
};

type IPxTransformExt = { [x in keyof typeof _trans]: typeof _trans[x]; } &
{
    setPosition(pos: IVec3Like): void;
    setQuaternion(quat: IQuatLike): void;
};

export function getColorPXColor (color: Color, rgba: number): void {
    color.b = ((rgba >> 16) & 0xff);
    color.g = ((rgba >> 8)  & 0xff);
    color.r = ((rgba)     & 0xff);
    color.a = 255;
}

export const _pxtrans = _trans as unknown as IPxTransformExt;

export function addReference (shape: PhysXShape, impl: any): void {
    if (!impl) return;
    if (impl.$$) PX.IMPL_PTR[impl.$$.ptr] = shape;
}

export function removeReference (shape: PhysXShape, impl: any): void {
    if (!impl) return;
    if (impl.$$) {
        PX.IMPL_PTR[impl.$$.ptr] = null;
        delete PX.IMPL_PTR[impl.$$.ptr];
    }
}

export function getWrapShape<T> (pxShape: any): T {
    return PX.IMPL_PTR[pxShape.$$.ptr];
}

export function getTempTransform (pos: IVec3Like, quat: IQuatLike): any {
    Vec3.copy(_pxtrans.translation, pos);
    Quat.copy(_pxtrans.rotation, quat);
    return _pxtrans;
}

export function getJsTransform (pos: IVec3Like, quat: IQuatLike): any {
    Vec3.copy(_trans.p, pos);
    Quat.copy(_trans.q, quat);
    return _trans;
}

export function addActorToScene (scene: any, actor: any): void {
    scene.addActor(actor, null);
}

export function setJointActors (joint: any, actor0: any, actor1: any): void {
    joint.setActors(actor0, actor1);
}

export function setMassAndUpdateInertia (impl: any, mass: number): void {
    impl.setMassAndUpdateInertia(mass);
}

export function copyPhysXTransform (node: Node, transform: any): void {
    const wp = node.worldPosition;
    const wr = node.worldRotation;
    const dontUpdate = physXEqualsCocosVec3(transform, wp) && physXEqualsCocosQuat(transform, wr);
    if (dontUpdate) return;

    node.setWorldPosition(transform.translation as Vec3);
    node.setWorldRotation(transform.rotation as Quat);
}

export function physXEqualsCocosVec3 (trans: any, v3: IVec3Like): boolean {
    return Vec3.equals(trans.translation as IVec3Like, v3, PX.EPSILON as number);
}

export function physXEqualsCocosQuat (trans: any, q: IQuatLike): boolean {
    return Quat.equals(trans.rotation as IQuatLike, q, PX.EPSILON as number);
}

export function applyImpulse (isGlobal: boolean, impl: any, vec: IVec3Like, rp: IVec3Like): void {
    if (isGlobal) {
        impl.applyImpulse(vec, rp);
    }  else {
        impl.applyLocalImpulse(vec, rp);
    }
}

export function applyForce (isGlobal: boolean, impl: any, vec: IVec3Like, rp: IVec3Like): void {
    if (isGlobal) {
        impl.applyForce(vec, rp);
    }  else {
        impl.applyLocalForce(vec, rp);
    }
}

export function applyTorqueForce (impl: any, vec: IVec3Like): void {
    impl.addTorque(vec);
}

export function getShapeFlags (isTrigger: boolean): any {
    const flag = (isTrigger ? PX.PxShapeFlag.eTRIGGER_SHAPE.value : PX.PxShapeFlag.eSIMULATION_SHAPE.value)
        | PX.PxShapeFlag.eSCENE_QUERY_SHAPE.value | PX.PxShapeFlag.eVISUALIZATION.value;
    return new PX.PxShapeFlags(flag);
}

// eslint-disable-next-line default-param-last
export function getShapeWorldBounds (shape: any, actor: any, i = 1.01, out: geometry.AABB): void {
    const b3 = shape.getWorldBounds(actor, i);
    geometry.AABB.fromPoints(out, b3.minimum as IVec3, b3.maximum as IVec3);
}

export function getShapeMaterials (pxMtl: any): any {
    if (PX.VECTOR_MAT.size() > 0) {
        PX.VECTOR_MAT.set(0, pxMtl);
    } else {
        PX.VECTOR_MAT.push_back(pxMtl);
    }
    return PX.VECTOR_MAT;
}

export function createConvexMesh (_buffer: Float32Array | number[], cooking: any, physics: any): any {
    const vertices = shrinkPositions(_buffer);
    const l = vertices.length;
    const vArr = new PX.PxVec3Vector();
    for (let i = 0; i < l; i += 3) {
        vArr.push_back({ x: vertices[i], y: vertices[i + 1], z: vertices[i + 2] });
    }
    const r = cooking.createConvexMesh(vArr, physics);
    vArr.delete();
    return r;
}

// eTIGHT_BOUNDS = (1<<0) convex
// eDOUBLE_SIDED = (1<<1) trimesh
export function createMeshGeometryFlags (flags: number, isConvex: boolean): any {
    return isConvex ? new PX.PxConvexMeshGeometryFlags(flags) : new PX.PxMeshGeometryFlags(flags);
}

export function createTriangleMesh (vertices: Float32Array | number[], indices: Uint32Array, cooking: any, physics: any): any {
    const l = vertices.length;
    const l2 = indices.length;
    const vArr = new PX.PxVec3Vector();
    for (let i = 0; i < l; i += 3) {
        vArr.push_back({ x: vertices[i], y: vertices[i + 1], z: vertices[i + 2] });
    }
    const iArr = new PX.PxU16Vector();
    for (let i = 0; i < l2; i += 3) {
        iArr.push_back(indices[i]); iArr.push_back(indices[i + 1]); iArr.push_back(indices[i + 2]);
    }
    const r = cooking.createTriMeshExt(vArr, iArr, physics);
    vArr.delete(); iArr.delete();
    return r;
}

export function createHeightField (terrain: any, heightScale: number, cooking: any, physics: any): any {
    const sizeI = terrain.getVertexCountI();
    const sizeJ = terrain.getVertexCountJ();
    const samples = new PX.PxHeightFieldSampleVector();
    for (let i = 0; i < sizeI; i++) {
        for (let j = 0; j < sizeJ; j++) {
            const s = new PX.PxHeightFieldSample();
            s.height = terrain.getHeight(i, j) / heightScale;
            samples.push_back(s);
        }
    }
    return cooking.createHeightFieldExt(sizeI, sizeJ, samples, physics);
}

export function createHeightFieldGeometry (hf: any, flags: number, hs: number, xs: number, zs: number): any {
    return new PX.PxHeightFieldGeometry(
        hf,
        new PX.PxMeshGeometryFlags(flags),
        hs,
        xs,
        zs,
    );
}

export function simulateScene (scene: any, deltaTime: number): void {
    scene.simulate(deltaTime, true);
}

export function raycastAll (
    world: PhysXWorld,
    worldRay: geometry.Ray,
    options: IRaycastOptions,
    pool: RecyclePool<PhysicsRayResult>,
    results: PhysicsRayResult[],
): boolean {
    const maxDistance = options.maxDistance;
    const flags = PxHitFlag.ePOSITION | PxHitFlag.eNORMAL;
    const word3 = EFilterDataWord3.QUERY_FILTER | (options.queryTrigger ? 0 : EFilterDataWord3.QUERY_CHECK_TRIGGER);
    const queryFlags = PxQueryFlag.eSTATIC | PxQueryFlag.eDYNAMIC | PxQueryFlag.ePREFILTER | PxQueryFlag.eNO_BLOCK;
    const queryfilterData = PhysXInstance.queryfilterData;
    const queryFilterCB = PhysXInstance.queryFilterCB;
    const mutipleResults = PhysXInstance.mutipleResults;
    const mutipleResultSize = PhysXInstance.mutipleResultSize;
    queryfilterData.setWords(options.mask >>> 0, 0);
    queryfilterData.setWords(word3, 3);
    queryfilterData.setFlags(queryFlags);
    const blocks = mutipleResults;
    const r = world.scene.raycastMultiple(
        worldRay.o,
        worldRay.d,
        maxDistance,
        flags,
        blocks,
        blocks.size(),
        queryfilterData,
        queryFilterCB,
        null,
    );

    if (r > 0) {
        for (let i = 0; i < r; i++) {
            const block = blocks.get(i);
            const collider = getWrapShape<PhysXShape>(block.getShape()).collider;
            const result = pool.add();
            result._assign(block.position as IVec3Like, block.distance as number, collider, block.normal as IVec3Like);
            results.push(result);
        }
        return true;
    } if (r === -1) {
        // eslint-disable-next-line no-console
        console.error('not enough memory.');
    }

    return false;
}

export function raycastClosest (world: PhysXWorld, worldRay: geometry.Ray, options: IRaycastOptions, result: PhysicsRayResult): boolean {
    const maxDistance = options.maxDistance;
    const flags = PxHitFlag.ePOSITION | PxHitFlag.eNORMAL;
    const word3 = EFilterDataWord3.QUERY_FILTER | (options.queryTrigger ? 0 : EFilterDataWord3.QUERY_CHECK_TRIGGER)
        | EFilterDataWord3.QUERY_SINGLE_HIT;
    const queryFlags = PxQueryFlag.eSTATIC | PxQueryFlag.eDYNAMIC | PxQueryFlag.ePREFILTER;
    const queryfilterData = PhysXInstance.queryfilterData;
    const queryFilterCB = PhysXInstance.queryFilterCB;
    queryfilterData.setWords(options.mask >>> 0, 0);
    queryfilterData.setWords(word3, 3);
    queryfilterData.setFlags(queryFlags);
    const block = PhysXInstance.singleResult;

    const r = world.scene.raycastSingle(
        worldRay.o,
        worldRay.d,
        options.maxDistance,
        flags,
        block,
        queryfilterData,
        queryFilterCB,
        null,
    );
    if (r) {
        const collider = getWrapShape<PhysXShape>(block.getShape()).collider;
        result._assign(block.position as IVec3Like, block.distance as number, collider, block.normal as IVec3Like);
        return true;
    }

    return false;
}

export function sweepAll (
    world: PhysXWorld,
    worldRay: geometry.Ray,
    geometry: any,
    geometryRotation: IQuatLike,
    options: IRaycastOptions,
    pool: RecyclePool<PhysicsRayResult>,
    results: PhysicsRayResult[],
): boolean {
    const maxDistance = options.maxDistance;
    const flags = PxHitFlag.ePOSITION | PxHitFlag.eNORMAL;
    const word3 = EFilterDataWord3.QUERY_FILTER | (options.queryTrigger ? 0 : EFilterDataWord3.QUERY_CHECK_TRIGGER);
    const queryFlags = PxQueryFlag.eSTATIC | PxQueryFlag.eDYNAMIC | PxQueryFlag.ePREFILTER | PxQueryFlag.eNO_BLOCK;
    const queryfilterData = PhysXInstance.queryfilterData;
    const queryFilterCB = PhysXInstance.queryFilterCB;//?
    const mutipleResults = PhysXInstance.mutipleSweepResults;
    const mutipleResultSize = PhysXInstance.mutipleResultSize;

    queryfilterData.setWords(options.mask >>> 0, 0);
    queryfilterData.setWords(word3, 3);
    queryfilterData.setFlags(queryFlags);
    const blocks = mutipleResults;
    const r = world.scene.sweepMultiple(
        geometry,
        getTempTransform(worldRay.o, geometryRotation),
        worldRay.d,
        maxDistance,
        flags,
        blocks,
        blocks.size(),
        queryfilterData,
        queryFilterCB,
        null,
        0,
    );

    if (r > 0) {
        for (let i = 0; i < r; i++) {
            const block = blocks.get(i);
            const collider = getWrapShape<PhysXShape>(block.getShape()).collider;
            const result = pool.add();
            result._assign(block.position as IVec3Like, block.distance as number, collider, block.normal as IVec3Like);
            results.push(result);
        }
        return true;
    } if (r === -1) {
        // eslint-disable-next-line no-console
        console.error('not enough memory.');
    }

    return false;
}

export function sweepClosest (
    world: PhysXWorld,
    worldRay: geometry.Ray,
    geometry: any,
    geometryRotation: IQuatLike,
    options: IRaycastOptions,
    result: PhysicsRayResult,
): boolean {
    const maxDistance = options.maxDistance;
    const flags = PxHitFlag.ePOSITION | PxHitFlag.eNORMAL;
    const word3 = EFilterDataWord3.QUERY_FILTER | (options.queryTrigger ? 0 : EFilterDataWord3.QUERY_CHECK_TRIGGER)
            | EFilterDataWord3.QUERY_SINGLE_HIT;
    const queryFlags = PxQueryFlag.eSTATIC | PxQueryFlag.eDYNAMIC | PxQueryFlag.ePREFILTER;
    const queryfilterData = PhysXInstance.queryfilterData;
    queryfilterData.setWords(options.mask >>> 0, 0);
    queryfilterData.setWords(word3, 3);
    queryfilterData.setFlags(queryFlags);
    const queryFilterCB = PhysXInstance.queryFilterCB;

    const block = PhysXInstance.singleSweepResult;
    const r = world.scene.sweepSingle(
        geometry,
        getTempTransform(worldRay.o, geometryRotation),
        worldRay.d,
        maxDistance,
        flags,
        block,
        queryfilterData,
        queryFilterCB,
        null,
        0,
    );
    if (r) {
        const collider = getWrapShape<PhysXShape>(block.getShape()).collider;
        result._assign(block.position as IVec3Like, block.distance as number, collider, block.normal as IVec3Like);
        return true;
    }

    return false;
}

export function initializeWorld (world: any): void {
    // construct PhysX instance object only once
    if (!PhysXInstance.foundation) {
        const version = PX.PX_PHYSICS_VERSION;
        const allocator = new PX.PxDefaultAllocator();
        const defaultErrorCallback = new PX.PxDefaultErrorCallback();
        const foundation = PhysXInstance.foundation = PX.PxCreateFoundation(version, allocator, defaultErrorCallback);
        PhysXInstance.pvd = null;
        const scale = new PX.PxTolerancesScale();
        PhysXInstance.physics = PX.physics = PX.PxCreatePhysics(version, foundation, scale, false, PhysXInstance.pvd);
        PhysXInstance.cooking = PX.PxCreateCooking(version, foundation, new PX.PxCookingParams(scale));
        PX.PxInitExtensions(PhysXInstance.physics, PhysXInstance.pvd);
        PhysXInstance.singleResult = new PX.PxRaycastHit();
        PhysXInstance.mutipleResults = new PX.PxRaycastHitVector();
        PhysXInstance.mutipleResults.resize(PhysXInstance.mutipleResultSize, PhysXInstance.singleResult);
        PhysXInstance.queryfilterData = new PX.PxQueryFilterData();
        PhysXInstance.simulationCB = PX.PxSimulationEventCallback.implement(world.callback.eventCallback);
        PhysXInstance.queryFilterCB = PX.PxQueryFilterCallback.implement(world.callback.queryCallback);
        PhysXInstance.singleSweepResult = new PX.PxSweepHit();
        PhysXInstance.mutipleSweepResults = new PX.PxSweepHitVector();
        PhysXInstance.mutipleSweepResults.resize(PhysXInstance.mutipleResultSize, PhysXInstance.singleSweepResult);
    }

    const sceneDesc = PX.getDefaultSceneDesc(PhysXInstance.physics.getTolerancesScale(), 0, PhysXInstance.simulationCB);
    world.scene = PhysXInstance.physics.createScene(sceneDesc);
    world.scene.setVisualizationParameter(PX.PxVisualizationParameter.eSCALE, 1);
    world.controllerManager = PX.PxCreateControllerManager(world.scene, false);
}

/**
 * f32 x3 position.x,position.y,position.z,
 * f32 x3 normal.x,normal.y,normal.z,
 * f32 x3 impulse.x,impulse.y,impulse.z,
 * f32 separation,
 * totoal = 40
 * ui32 internalFaceIndex0,
 * ui32 internalFaceIndex1,
 * totoal = 48
 */
export function getContactPosition (pxContactOrOffset: any, out: IVec3Like, buf: any): void {
    Vec3.copy(out, pxContactOrOffset.position);
}

export function getContactNormal (pxContactOrOffset: any, out: IVec3Like, buf: any): void {
    Vec3.copy(out, pxContactOrOffset.normal);
}

export function getContactDataOrByteOffset (index: number, offset: number): any {
    const gc = PX.getGContacts();
    const data = gc.get(index + offset);
    gc.delete();
    return data;
}

export function syncNoneStaticToSceneIfWaking (actor: any, node: Node): void {
    if (actor.isSleeping()) return;
    copyPhysXTransform(node, actor.getGlobalPose());
}

/**
 * Extension config for bytedance
 */
interface IPhysicsConfigEXT extends IPhysicsConfig {
    physX: { epsilon: number, multiThread: boolean, subThreadCount: number, }
}
