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

import { DescriptorSet } from '../base/descriptor-set';
import { DescriptorSetLayout } from '../base/descriptor-set-layout';
import { WebGPUBuffer } from './webgpu-buffer';
import { WebGPUDevice } from './webgpu-device';
import { WebGPUSampler } from './webgpu-sampler';
import { WebGPUTexture } from './webgpu-texture';

export class WebGPUDeviceManager {
    static get instance (): WebGPUDevice {
        return WebGPUDeviceManager._instance!;
    }
    static setInstance (instance: WebGPUDevice): void {
        WebGPUDeviceManager._instance = instance;
    }
    private static _instance: WebGPUDevice | null = null;
}

function hashCombine (hash, currHash: number): number {
    return currHash ^= (hash >>> 0) + 0x9e3779b9 + (currHash << 6) + (currHash >> 2);
}

export function hashCombineNum (val: number, currHash: number): number {
    const hash = 5381;
    return hashCombine((hash * 33) ^ val, currHash);
}

export function hashCombineStr (str: string, currHash: number): number {
    // DJB2 HASH
    let hash = 5381;
    const strLength = str.length;
    for (let i = 0; i < strLength; i++) {
        hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return hashCombine(hash, currHash);
}

export class DefaultResources {
    // hash, targetResource
    buffersDescLayout: Map<number, WebGPUBuffer> = new Map<number, WebGPUBuffer>();
    texturesDescLayout: Map<number, WebGPUTexture> = new Map<number, WebGPUTexture>();
    samplersDescLayout: Map<number, WebGPUSampler> = new Map<number, WebGPUSampler>();
    buffer!: WebGPUBuffer;
    texture!: WebGPUTexture;
    cubeTexture!: WebGPUTexture;
    sampler!: WebGPUSampler;
    setLayout!: DescriptorSetLayout;
    descSet!: DescriptorSet;
}

export function isBound (binds: number[], compares: number[]): boolean {
    return binds.length === compares.length && binds.every((bind) => compares.includes(bind));
}

export function copyNumbersToTarget (source: number[], target: number[], start: number, count: number): void {
    // Check that the source array is out of range
    if (start + count > source.length) {
        throw new Error('Source array is out of bounds');
    }
    // Check whether the target array is out of range
    if (start + count > target.length) {
        target.length = start + count;
    }
    const sliceToCopy = source.slice(start, start + count);
    target.splice(start, count, ...sliceToCopy);
}

export enum DescUpdateFrequency {
    LOW,
    NORMAL,
}
