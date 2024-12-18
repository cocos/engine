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

import { instantiateWasm, fetchBuffer, ensureWasmModuleReady } from 'pal/wasm';
import { BUILD, JSB, LOAD_SPINE_MANUALLY, NATIVE_CODE_BUNDLE_MODE } from 'internal:constants';
import { game } from '../../game';
import { error, sys } from '../../core';
import { NativeCodeBundleMode } from '../../misc/webassembly-support';
import { overrideSpineDefine } from './spine-define';

const PAGESIZE = 65536; // 64KiB

// How many pages of the wasm memory
// TODO: let this can be canfiguable by user.
const PAGECOUNT = 32 * 16;

// How mush memory size of the wasm memory
const MEMORYSIZE = PAGESIZE * PAGECOUNT; // 32 MiB

let wasmInstance: SpineWasm.instance = null!;
const registerList: any[] = [];

///////////////////////////////////////////////////////////////////////////////////////////////////
function initWasm (wasmFactory, wasmUrl: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const errorMessage = (err: any): string => `[Spine]: Spine wasm load failed: ${err}`;
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
            wasmInstance = Instance;
            registerList.forEach((cb) => {
                cb(wasmInstance);
            });
        }).then(resolve).catch((err: any) => reject(errorMessage(err)));
    });
}

function initAsmJS (asmFactory, asmJsMemUrl: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        fetchBuffer(asmJsMemUrl).then((arrayBuffer) => {
            const wasmMemory: any = {};
            wasmMemory.buffer = new ArrayBuffer(MEMORYSIZE);
            const module = {
                wasmMemory,
                memoryInitializerRequest: {
                    response: arrayBuffer,
                    status: 200,
                } as Partial<XMLHttpRequest>,
            };
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return asmFactory(module).then((instance: any) => {
                wasmInstance = instance;
                registerList.forEach((cb) => {
                    cb(wasmInstance);
                });
            });
        }).then(resolve).catch(reject);
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

export function waitForSpineWasmInstantiation (): Promise<void> {
    const errorReport = (msg: any): void => { error(msg); };
    return ensureWasmModuleReady().then(() => {
        if (shouldUseWasmModule()) {
            return Promise.all([
                import('external:emscripten/spine/spine.wasm.js'),
                import('external:emscripten/spine/spine.wasm'),
            ]).then(([
                { default: wasmFactory },
                { default: spineWasmUrl },
            ]) => initWasm(wasmFactory, spineWasmUrl));
        } else {
            return Promise.all([
                import('external:emscripten/spine/spine.asm.js'),
                import('external:emscripten/spine/spine.js.mem'),
            ]).then(([
                { default: asmFactory },
                { default: asmJsMemUrl },
            ]) => initAsmJS(asmFactory, asmJsMemUrl));
        }
    }).catch(errorReport);
}

if (!JSB && (!BUILD || !LOAD_SPINE_MANUALLY)) {
    game.onPostInfrastructureInitDelegate.add(waitForSpineWasmInstantiation);
}

registerList.push(overrideSpineDefine);

export const SPINE_WASM = 1;
