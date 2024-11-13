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

import { ensureWasmModuleReady, instantiateWasm } from 'pal/wasm';
import { BUILD, LOAD_BULLET_MANUALLY, NATIVE_CODE_BUNDLE_MODE } from 'internal:constants';
import { game } from '../../game';
import { error, log, sys } from '../../core';
import { NativeCodeBundleMode } from '../../misc/webassembly-support';

//corresponds to bulletType in bullet-compile
export enum EBulletType{
    EBulletTypeVec3 = 0,
    EBulletTypeQuat,
    EBulletTypeTransform,
    EBulletTypeMotionState,
    EBulletTypeCollisionObject,
    EBulletTypeCollisionShape,
    EBulletTypeCharacterController,
    EBulletTypeStridingMeshInterface,
    EBulletTypeTriangleMesh,
    EBulletTypeCollisionDispatcher,
    EBulletTypeDbvtBroadPhase,
    EBulletTypeSequentialImpulseConstraintSolver,
    EBulletTypeCollisionWorld,
    EBulletTypeTypedConstraint,
    EBulletTypeDebugDraw
}

//corresponds to btTriangleRaycastCallback::EFlags
export enum EBulletTriangleRaycastFlag {
    NONE                            = 0,
    FilterBackfaces                 = 1 << 0,
    KeepUnflippedNormal             = 1 << 1, //Prevents returned face normal getting flipped when a ray hits a back-facing triangle
    UseSubSimplexConvexCastRaytest  = 1 << 2, //default, uses an approximate but faster ray versus convex intersection algorithm
    UseGjkConvexCastRaytest         = 1 << 3
}

//btIDebugDraw::EBulletDebugDrawModes
export enum EBulletDebugDrawModes
{
    DBG_NoDebug=0,
    DBG_DrawWireframe = 1,
    DBG_DrawAabb=2,
    DBG_DrawFeaturesText=4,
    DBG_DrawContactPoints=8,
    DBG_NoDeactivation=16,
    DBG_NoHelpText = 32,
    DBG_DrawText=64,
    DBG_ProfileTimings = 128,
    DBG_EnableSatComparison = 256,
    DBG_DisableBulletLCP = 512,
    DBG_EnableCCD = 1024,
    DBG_DrawConstraints = (1 << 11),
    DBG_DrawConstraintLimits = (1 << 12),
    DBG_FastWireframe = (1 << 13),
    DBG_DrawNormals = (1 << 14),
    DBG_DrawFrames = (1 << 15),
    DBG_MAX_DEBUG_DRAW_MODE
}

interface BtCache {
    CACHE: any,
    BODY_CACHE_NAME: string,
    CCT_CACHE_NAME: string,
}

// eslint-disable-next-line import/no-mutable-exports
export let bt = {} as Bullet.instance;
export const btCache = {} as BtCache;
btCache.BODY_CACHE_NAME = 'body';
btCache.CCT_CACHE_NAME = 'cct';

function initWASM (wasmFactory, wasmUrl: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const errorMessage = (err: any): string => `[bullet]: bullet wasm lib load failed: ${err}`;
        wasmFactory({
            instantiateWasm (
                importObject: WebAssembly.Imports,
                receiveInstance: (instance: WebAssembly.Instance, module: WebAssembly.Module) => void,
            ) {
                // NOTE: the Promise return by instantiateWasm hook can't be caught.
                instantiateWasm(wasmUrl, importObject).then((result) => {
                    receiveInstance(result.instance, result.module);
                }).catch((err) => reject(errorMessage(err)));
            },
        }).then((instance: any) => {
            log('[bullet]:bullet wasm lib loaded.');
            bt = instance as Bullet.instance;
            globalThis.Bullet = bt as any;
        }).then(resolve).catch((err: any) => reject(errorMessage(err)));
    });
}

function initASM (asmFactory): Promise<void> {
    if (asmFactory != null) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return asmFactory().then((instance: any) => {
            log('[bullet]:bullet asm lib loaded.');
            bt = instance as Bullet.instance;
        });
    } else {
        return new Promise<void>((resolve, reject) => {
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

export function waitForAmmoInstantiation (): Promise<void> {
    const errorReport = (msg: any): void => { error(msg); };
    return ensureWasmModuleReady().then(() => {
        if (shouldUseWasmModule()) {
            return Promise.all([
                import('external:emscripten/bullet/bullet.release.wasm.js'),
                import('external:emscripten/bullet/bullet.release.wasm.wasm'),
            ]).then(([
                { default: bulletWasmFactory },
                { default: bulletWasmUrl },
            ]) => initWASM(bulletWasmFactory, bulletWasmUrl));
        } else {
            return import('external:emscripten/bullet/bullet.release.asm.js').then(
                ({ default: bulletAsmFactory }) => initASM(bulletAsmFactory),
            );
        }
    }).catch(errorReport);
}

if (!BUILD || !LOAD_BULLET_MANUALLY) {
    game.onPostInfrastructureInitDelegate.add(waitForAmmoInstantiation);
}
