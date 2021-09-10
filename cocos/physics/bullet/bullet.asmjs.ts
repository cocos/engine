/*
 Copyright (c) 2020 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
 worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
 not use Cocos Creator software for developing other software or tools that's
 used for developing games. You are not granted to publish, distribute,
 sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import bulletModule from '@cocos/bullet';
import { physics } from '../../../exports/physics-framework';
import { memorySize, importFunc } from './bullet-env';

let instantiate: any = bulletModule;
if (!physics.selector.runInEditor) instantiate = () => ({});

if (globalThis.BULLET2) instantiate = globalThis.BULLET2;

// env
const env: any = importFunc;

// memory
const wasmMemory: any = {};
wasmMemory.buffer = new ArrayBuffer(memorySize);
env.memory = wasmMemory;

export const bt = instantiate(env, wasmMemory) as instanceExt;
bt.ENV = env;
bt.USE_MOTION_STATE = true;
bt.BODY_CACHE_NAME = 'body';
globalThis.Bullet = bt;

interface instanceExt extends Bullet.instance {
    // [x: string]: any;
    ENV: any,
    USE_MOTION_STATE: boolean,
    CACHE: any,
    BODY_CACHE_NAME: string,
}
