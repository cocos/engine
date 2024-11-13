/*
 Copyright (c) 2023 Xiamen Yaji Software Co., Ltd.

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

import { instantiateWasm, ensureWasmModuleReady } from 'pal/wasm';
import { BUILD, LOAD_BOX2D_MANUALLY, NATIVE_CODE_BUNDLE_MODE } from 'internal:constants';

import { game } from '../../game';
import { error, sys, IVec2Like, log } from '../../core';
import { NativeCodeBundleMode } from '../../misc/webassembly-support';

// eslint-disable-next-line import/no-mutable-exports
export let B2 = {} as any;

export function getImplPtr (wasmObject: any): number {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    if (!wasmObject) return 0;
    return (wasmObject).$$.ptr as number;
}

// type : Fixture, Body, Contact, Joint, ...
export const enum B2ObjectType {
    Fixture = 0,
    Body,
    Contact,
    Joint,
}

/**
* mapping wasm-object-ptr to ts-object
*  B2.Fixture pointer -->B2Shape2D
*  B2.Body pointer --> B2RigidBody2D
*  B2.Contact pointer --> PhysicsContact
*  B2.Joint pointer --> B2Joint
*  ...
*/
//todo: combine WASM_OBJECT_PTR_2_TS_OBJECT and WASM_OBJECT_PTR_2_WASM_OBJECT
const WASM_OBJECT_PTR_2_TS_OBJECT = new Map<B2ObjectType, Map<number, any>>();

export function addImplPtrReference (Type: B2ObjectType, TSObject: any, implPtr: number): void {
    if (implPtr) {
        let map = WASM_OBJECT_PTR_2_TS_OBJECT.get(Type);
        if (!map) {
            map = new Map<number, any>();
            WASM_OBJECT_PTR_2_TS_OBJECT.set(Type, map);
        }
        map.set(implPtr, TSObject);
    }
}

export function removeImplPtrReference (Type: B2ObjectType, implPtr: number): void {
    if (implPtr) {
        const map = WASM_OBJECT_PTR_2_TS_OBJECT.get(Type);
        if (map && map.has(implPtr)) {
            map.delete(implPtr);
            if (map.size === 0) {
                WASM_OBJECT_PTR_2_TS_OBJECT.delete(Type);
            }
        }
    }
}

export function getTSObjectFromWASMObjectPtr<T> (Type: B2ObjectType, implPtr: number): T {
    const map = WASM_OBJECT_PTR_2_TS_OBJECT.get(Type);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return map?.get(implPtr);
}

/**
* mapping wasm-object-ptr to wasm-object
*  B2.Fixture pointer -->B2.Fixture
*  B2.Body pointer --> B2.Body
*  B2.Contact pointer --> B2.Contact
*  B2.Joint pointer --> B2.Joint
*  ...
*/
//todo: combine WASM_OBJECT_PTR_2_TS_OBJECT and WASM_OBJECT_PTR_2_WASM_OBJECT
const WASM_OBJECT_PTR_2_WASM_OBJECT  = new Map<B2ObjectType, Map<number, any>>();
export function addImplPtrReferenceWASM (Type: B2ObjectType, WASMObject: any, implPtr: number): void {
    if (implPtr) {
        let map = WASM_OBJECT_PTR_2_WASM_OBJECT.get(Type);
        if (!map) {
            map = new Map<number, any>();
            WASM_OBJECT_PTR_2_WASM_OBJECT.set(Type, map);
        }
        map.set(implPtr, WASMObject);
    }
}

export function removeImplPtrReferenceWASM (Type: B2ObjectType, implPtr: number): void {
    if (implPtr) {
        const map = WASM_OBJECT_PTR_2_WASM_OBJECT.get(Type);
        if (map && map.has(implPtr)) {
            map.delete(implPtr);
            if (map.size === 0) {
                WASM_OBJECT_PTR_2_WASM_OBJECT.delete(Type);
            }
        }
    }
}

export function getWASMObjectFromWASMObjectPtr<T> (Type: B2ObjectType, implPtr: number): T {
    const map = WASM_OBJECT_PTR_2_WASM_OBJECT.get(Type);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return map?.get(implPtr);
}

/**
* ts implementation of c++ b2Mul
*/
export function b2Mul (T: any, v: IVec2Like, out: IVec2Like): void {
    out.x = (T.q.c * v.x - T.q.s * v.y) + T.p.x;
    out.y = (T.q.s * v.x + T.q.c * v.y) + T.p.y;
}

///////////////////////////////////////////////////////////////////////////////////////////////////
function initWasm (wasmFactory, wasmUrl: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const errorMessage = (err: any): string => `[box2d]: box2d wasm lib load failed: ${err}`;
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
        }).then((Instance: any) => {
            log('[box2d]:box2d wasm lib loaded.');
            B2 = Instance;
        }).then(resolve).catch((err: any) => reject(errorMessage(err)));
    });
}

function initAsm (asmFactory): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const errorMessage = (err: any): string => `[box2d]: box2d asm lib load failed: ${err}`;
        asmFactory().then((instance: any) => {
            log('[box2d]:box2d asm lib loaded.');
            B2 = instance;
        }).then(resolve).catch((err: any) => reject(errorMessage(err)));
    });
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

export function waitForBox2dWasmInstantiation (): Promise<void> {
    const errorReport = (msg: any): void => { error(msg); };
    return ensureWasmModuleReady().then(() => {
        if (shouldUseWasmModule()) {
            return Promise.all([
                import('external:emscripten/box2d/box2d.release.wasm.js'),
                import('external:emscripten/box2d/box2d.release.wasm.wasm'),
            ]).then(([
                { default: wasmFactory },
                { default: wasmUrl },
            ]) => initWasm(wasmFactory, wasmUrl));
        } else {
            return import('external:emscripten/box2d/box2d.release.asm.js').then(
                ({ default: asmFactory }) => initAsm(asmFactory),
            );
        }
    }).catch(errorReport);
}

if (!BUILD || !LOAD_BOX2D_MANUALLY) {
    game.onPostInfrastructureInitDelegate.add(waitForBox2dWasmInstantiation);
}
