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

import { DescriptorSetLayout } from '../base/descriptor-set-layout';
import { IWebGPUGPUDescriptorSetLayout } from './webgpu-gpu-objects';
import { createBindGroupLayoutEntry } from './webgpu-commands';
import {
    DescriptorSetLayoutInfo,
    DESCRIPTOR_DYNAMIC_TYPE,
} from '../base/define';
import { WebGPUDeviceManager } from './define';
import { WebGPUTexture } from './webgpu-texture';
import { DescriptorSet } from '../base/descriptor-set';
import { WebGPUBuffer } from './webgpu-buffer';
import { WebGPUSampler } from './webgpu-sampler';

export class WebGPUDescriptorSetLayout extends DescriptorSetLayout {
    get gpuDescriptorSetLayout (): IWebGPUGPUDescriptorSetLayout | null { return this._gpuDescriptorSetLayout!; }

    private _gpuDescriptorSetLayout: IWebGPUGPUDescriptorSetLayout | null = null;
    private _bindGrpLayoutEntries: Map<number, GPUBindGroupLayoutEntry> = new Map<number, GPUBindGroupLayoutEntry>();

    private _hasChange = false;
    private _currBinds: number[] = [];
    private _prepareEntries: GPUBindGroupLayoutEntry[] = [];

    public buffers: Map<number, WebGPUBuffer> = new Map<number, WebGPUBuffer>();
    public textures: Map<number, WebGPUTexture> = new Map<number, WebGPUTexture>();
    public samplers: Map<number, WebGPUSampler> = new Map<number, WebGPUSampler>();

    public references: DescriptorSet[] = [];
    public get currBinds (): number[] {
        return this._currBinds;
    }
    public get prepareEntries (): GPUBindGroupLayoutEntry[] {
        return this._prepareEntries;
    }
    public get bindGrpLayoutEntries (): Map<number, GPUBindGroupLayoutEntry> {
        return this._bindGrpLayoutEntries;
    }

    public get hasChanged (): boolean {
        return this._hasChange;
    }
    public resetChanged (): void {
        this._hasChange = false;
    }
    public initialize (info: Readonly<DescriptorSetLayoutInfo>): void {
        Array.prototype.push.apply(this._bindings, info.bindings);
        const gfxDevice = WebGPUDeviceManager.instance;
        // If the bindings are empty, it will cause the corresponding group to be generated as null,
        // which will trigger a warning for the corresponding set being unbound.
        if (!this._bindings.length) {
            this._bindings.push(gfxDevice.defaultResource.setLayout.bindings[0]);
        }
        let descriptorCount = 0; let maxBinding = -1;
        const flattenedIndices: number[] = [];
        const bindingSize = this._bindings.length;
        for (let i = 0; i < bindingSize; i++) {
            const binding = this._bindings[i];
            flattenedIndices.push(descriptorCount);
            descriptorCount += binding.count;
            if (binding.binding > maxBinding) maxBinding = binding.binding;
        }

        this._bindingIndices = Array(maxBinding + 1).fill(-1);
        const descriptorIndices = this._descriptorIndices = Array(maxBinding + 1).fill(-1);
        for (let i = 0; i < bindingSize; i++) {
            const binding = this._bindings[i];
            this._bindingIndices[binding.binding] = i;
            descriptorIndices[binding.binding] = flattenedIndices[i];
        }
        const dynamicBindings: number[] = [];
        for (let i = 0; i < bindingSize; i++) {
            const binding = this._bindings[i];
            if (binding.descriptorType & DESCRIPTOR_DYNAMIC_TYPE) {
                for (let j = 0; j < binding.count; j++) {
                    dynamicBindings.push(binding.binding);
                }
            }
        }
        const bindGrpLayoutEntries: GPUBindGroupLayoutEntry[] = [];
        this._bindings.forEach((binding) => {
            bindGrpLayoutEntries.push(
                ...createBindGroupLayoutEntry(
                    binding,
                ),
            );
        });
        const device = gfxDevice.nativeDevice!;
        const groupLayout = device.createBindGroupLayout({
            entries: bindGrpLayoutEntries,
        });
        this._gpuDescriptorSetLayout = {
            bindings: this._bindings,
            dynamicBindings,
            descriptorIndices,
            descriptorCount,
            entries: bindGrpLayoutEntries,
            bindGroupLayout: groupLayout,
        };
    }

    public clear (): void {
        this.buffers.clear();
        this.textures.clear();
        this.samplers.clear();
        this._bindGrpLayoutEntries.clear();
    }

    public destroy (): void {
        this._bindings.length = 0;
        this.clear();
        this._gpuDescriptorSetLayout = null;
    }
}
