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
import { GFXStageToWebGPUStage, GFXDescTypeToGPUBufferDescType, GFXSamplerToGPUSamplerDescType,
    SEPARATE_SAMPLER_BINDING_OFFSET, TextureSampleTypeTrait } from './webgpu-commands';
import {
    DescriptorSetLayoutInfo,
    DESCRIPTOR_DYNAMIC_TYPE,
    DescriptorSetLayoutBinding,
    Format,
    DescriptorType,
    Filter,
} from '../base/define';
import { DescUpdateFrequency, WebGPUDeviceManager, isBound } from './define';
import { WebGPUTexture } from './webgpu-texture';
import { DescriptorSet } from '../base/descriptor-set';
import { WebGPUBuffer } from './webgpu-buffer';
import { WebGPUSampler } from './webgpu-sampler';

export function FormatToWGPUFormatType (format: Format): GPUTextureSampleType {
    if (format === Format.DEPTH_STENCIL) {
        return 'unfilterable-float';
    }
    return TextureSampleTypeTrait(format);
}
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
        this._gpuDescriptorSetLayout = {
            bindings: this._bindings,
            dynamicBindings,
            descriptorIndices,
            descriptorCount,
            bindGroupLayout: null,
        };
    }

    // In order to avoid binding exceeding the number specified by webgpu,
    // gpulayout changes dynamically instead of binding everything at once.
    public updateBindGroupLayout (
        binding: DescriptorSetLayoutBinding,
        buffer: WebGPUBuffer | null,
        texture: WebGPUTexture | null,
        sampler: WebGPUSampler | null,
    ): void {
        let bindIdx = binding.binding;
        const visibility = GFXStageToWebGPUStage(binding.stageFlags);
        const entries = this._bindGrpLayoutEntries;
        const wgpuDeviceInst = WebGPUDeviceManager.instance;
        if (sampler) {
            bindIdx += SEPARATE_SAMPLER_BINDING_OFFSET;
        }
        const currEntry: GPUBindGroupLayoutEntry = {} as GPUBindGroupLayoutEntry;
        currEntry.binding = bindIdx;
        currEntry.visibility = visibility;
        if (buffer) {
            currEntry.buffer = { type: GFXDescTypeToGPUBufferDescType(binding.descriptorType)! };
            currEntry.buffer.hasDynamicOffset = !!(binding.descriptorType & (DescriptorType.DYNAMIC_STORAGE_BUFFER
                | DescriptorType.DYNAMIC_UNIFORM_BUFFER));
            entries.set(bindIdx, currEntry);
        }
        if (texture) {
            const targetTex = texture;
            currEntry.texture = {
                sampleType: FormatToWGPUFormatType(texture.format),
                viewDimension: targetTex.gpuTexture.gpuTarget,
                multisampled: Number(targetTex.gpuTexture.samples) > 1,
            };
            // const defaultTexture = wgpuDeviceInst.getDefaultDescResources(currEntry, targetTex.gpuTexture) as WebGPUTexture;
            // this.textures.set(bindIdx, defaultTexture);
            entries.set(bindIdx, currEntry);
        }
        if (sampler) {
            const currTex = entries.get(bindIdx - SEPARATE_SAMPLER_BINDING_OFFSET)!;
            const isUnFilter = currTex.texture!.sampleType === 'unfilterable-float';
            currEntry.sampler = { type: isUnFilter ? 'non-filtering' : GFXSamplerToGPUSamplerDescType(sampler.info) };
            // const defaultSampler = wgpuDeviceInst.getDefaultDescResources(currEntry, sampler.gpuSampler) as WebGPUSampler;
            // this.samplers.set(bindIdx, defaultSampler);
            entries.set(bindIdx, currEntry);
        }
    }

    public removeRef (ref: DescriptorSet): void {
        const index = this.references.indexOf(ref);
        if (index !== -1) {
            this.references.splice(index, 1);
        }
        if (this.references.length === 0) {
            this.clear();
        }
    }

    public addRef (ref: DescriptorSet): void {
        if (!this.references.includes(ref)) {
            this.references.push(ref);
        }
    }

    public resetGroupLayout (): void {
        if (this._gpuDescriptorSetLayout?.bindGroupLayout) {
            this._gpuDescriptorSetLayout.bindGroupLayout = null;
            this._hasChange = true;
        }
    }

    public prepare (frequency: DescUpdateFrequency, binds: number[], vertBinds: number[] = [], fragBinds: number[] = []): void {
        if (isBound(binds, this._currBinds) && frequency !== DescUpdateFrequency.LOW
            && binds.length === this._prepareEntries.length) return;
        this._currBinds = binds;
        if (frequency !== DescUpdateFrequency.LOW) {
            this._prepareEntries.length = 0;
            binds.forEach((bind: number) => {
                let currGrpEntryLayout = this._bindGrpLayoutEntries.get(bind < 0 ? 0 : bind)!;
                if (!currGrpEntryLayout && bind < 0) {
                    currGrpEntryLayout = Array.from(this._bindGrpLayoutEntries.values())[0];
                }
                if (vertBinds.includes(currGrpEntryLayout.binding) && !(currGrpEntryLayout.visibility & GPUShaderStage.VERTEX)) {
                    currGrpEntryLayout.visibility |= GPUShaderStage.VERTEX;
                } else if (!vertBinds.includes(currGrpEntryLayout.binding) && (currGrpEntryLayout.visibility & GPUShaderStage.VERTEX)) {
                    currGrpEntryLayout.visibility ^= GPUShaderStage.VERTEX;
                }
                if (fragBinds.includes(currGrpEntryLayout.binding) && !(currGrpEntryLayout.visibility & GPUShaderStage.FRAGMENT)) {
                    currGrpEntryLayout.visibility |= GPUShaderStage.FRAGMENT;
                } else if (!fragBinds.includes(currGrpEntryLayout.binding) && (currGrpEntryLayout.visibility & GPUShaderStage.FRAGMENT)) {
                    currGrpEntryLayout.visibility ^= GPUShaderStage.FRAGMENT;
                }
                this._prepareEntries.push(currGrpEntryLayout);
            });
        } else {
            this._prepareEntries = Array.from(this._bindGrpLayoutEntries.values());
        }
        this._hasChange = true;
        const nativeDevice = WebGPUDeviceManager.instance.nativeDevice;
        const bindGrpLayout = nativeDevice?.createBindGroupLayout({ entries: this._prepareEntries });
        this._gpuDescriptorSetLayout!.bindGroupLayout = bindGrpLayout!;
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
