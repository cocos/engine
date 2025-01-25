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
import { WebGPUBuffer } from './webgpu-buffer';
import { IWebGPUGPUDescriptorSet, IWebGPUGPUDescriptor } from './webgpu-gpu-objects';
import { WebGPUSampler } from './webgpu-sampler';
import { WebGPUTexture } from './webgpu-texture';
import { WebGPUDescriptorSetLayout } from './webgpu-descriptor-set-layout';
import {
    DescriptorSetInfo,
    DESCRIPTOR_BUFFER_TYPE,
    DESCRIPTOR_SAMPLER_TYPE,
    DescriptorSetLayoutBinding,
    DescriptorType,
    Filter,
    ViewDimension,
} from '../base/define';
import { WebGPUDeviceManager } from './define';
import { FormatToWGPUFormatType, SEPARATE_SAMPLER_BINDING_OFFSET } from './webgpu-commands';

export class WebGPUDescriptorSet extends DescriptorSet {
    get gpuDescriptorSet (): IWebGPUGPUDescriptorSet {
        return this._gpuDescriptorSet as IWebGPUGPUDescriptorSet;
    }

    private _gpuDescriptorSet: IWebGPUGPUDescriptorSet | null = null;
    private _bindGroupEntries: Map<number, GPUBindGroupEntry> = new Map<number, GPUBindGroupEntry>();
    private _prepareEntries: GPUBindGroupEntry[] = [];
    // private _currBinds: number[] = [];
    // private _needUpdate: boolean = false;
    // private _prepareDynOffsets: number[] = [];
    private _dynamicOffsets: number[] = [];
    private _dynamicOffsetNum: number = 0;

    get dynamicOffsetCount (): number {
        return this._dynamicOffsets.length;
    }

    public initialize (info: Readonly<DescriptorSetInfo>): void {
        const layout = this._layout = info.layout as WebGPUDescriptorSetLayout;
        // layout.addRef(this);
        const { bindings, descriptorIndices, descriptorCount } = layout.gpuDescriptorSetLayout!;

        this._buffers = Array(descriptorCount).fill(null);
        this._textures = Array(descriptorCount).fill(null);
        this._samplers = Array(descriptorCount).fill(null);

        const gpuDescriptors: IWebGPUGPUDescriptor[] = [];
        const bindGroup = null!;
        const bindGroupLayout = null!;
        this._gpuDescriptorSet = { gpuDescriptors, descriptorIndices, bindGroup, bindGroupLayout };
        const bindingSize = bindings.length;
        for (let i = 0; i < bindingSize; ++i) {
            const binding = bindings[i];
            const bindCount = binding.count;
            for (let j = 0; j < bindCount; j++) {
                gpuDescriptors.push({
                    type: binding.descriptorType,
                    gpuBuffer: null,
                    gpuTexture: null,
                    gpuSampler: null,
                });
            }
        }
    }

    public destroy (): void {
        this._layout = null;
        this._gpuDescriptorSet = null;
        this._buffers.length = 0;
        this._textures.length = 0;
        this._samplers.length = 0;
        this._bindGroupEntries.clear();
    }

    private _bindBufferEntry (bind: DescriptorSetLayoutBinding, buffer: WebGPUBuffer): void {
        const destBind = this._gpuDescriptorSet!.gpuDescriptors[bind.binding];
        if (destBind) {
            destBind.gpuBuffer = buffer.gpuBuffer;
        }
        // const layout = this._layout as WebGPUDescriptorSetLayout;
        const nativeBuffer = buffer.gpuBuffer.gpuBuffer;
        const bindGrpEntry: GPUBindGroupEntry = {
            binding: bind.binding,
            resource: {
                buffer: nativeBuffer!,
                offset: buffer.gpuBuffer.gpuOffset,
                size: buffer.gpuBuffer.size,
            },
        };
        this._bindGroupEntries.set(bindGrpEntry.binding, bindGrpEntry);
        buffer.resetChange();
    }

    private _bindTextureEntry (bind: DescriptorSetLayoutBinding, texture: WebGPUTexture): void {
        this._gpuDescriptorSet!.gpuDescriptors[bind.binding].gpuTexture = texture.gpuTexture;
        const nativeTexView = texture.getNativeTextureView()!;
        const bindGrpEntry: GPUBindGroupEntry = {
            binding: bind.binding,
            resource: nativeTexView,
        };
        this._bindGroupEntries.set(bindGrpEntry.binding, bindGrpEntry);
        texture.resetChange();
    }

    private _bindSamplerEntry (bind: DescriptorSetLayoutBinding, sampler: WebGPUSampler): void {
        const samplerIdx = bind.binding + SEPARATE_SAMPLER_BINDING_OFFSET;
        this._gpuDescriptorSet!.gpuDescriptors[bind.binding].gpuSampler = sampler.gpuSampler;
        const device = WebGPUDeviceManager.instance;
        const currTexture = (this._textures[bind.binding] || device.defaultResource.texture) as WebGPUTexture;
        const levelCount = currTexture.levelCount;
        const texFormat = currTexture.format;
        const isUnFilter = FormatToWGPUFormatType(texFormat) === 'unfilterable-float';
        if (isUnFilter) {
            sampler.gpuSampler.minFilter = Filter.POINT;
            sampler.gpuSampler.magFilter = Filter.POINT;
            sampler.gpuSampler.mipFilter = Filter.POINT;
        }
        const currGPUSampler = sampler.createGPUSampler(levelCount);
        const bindSamplerGrpEntry: GPUBindGroupEntry = {
            binding: samplerIdx,
            resource: currGPUSampler as GPUSampler,
        };
        this._bindGroupEntries.set(samplerIdx, bindSamplerGrpEntry);
        sampler.resetChange();
    }

    private _bindResourceEntry (bind: number, resource: WebGPUBuffer | WebGPUTexture | WebGPUSampler): void {
        const gpuSetLayout = this.layout as WebGPUDescriptorSetLayout;
        const binding = gpuSetLayout.bindings[bind];
        if (resource instanceof WebGPUBuffer) {
            this._bindBufferEntry(binding, resource);
        } else if (resource instanceof WebGPUTexture) {
            this._bindTextureEntry(binding, resource);
        } else if (resource instanceof WebGPUSampler) {
            this._bindSamplerEntry(binding, resource);
        }
    }

    private _applyBindGroup (): void {
        if (this._isDirty && this._gpuDescriptorSet) {
            const layout = this._layout as WebGPUDescriptorSetLayout;
            this._bindGroupEntries.clear();
            this._dynamicOffsets.length = 0;
            const descriptors = this._gpuDescriptorSet.gpuDescriptors;
            const bindings = layout.gpuDescriptorSetLayout!.bindings;
            const descCount = bindings.length;
            const device = WebGPUDeviceManager.instance;
            for (let i = 0; i < descCount; ++i) {
                const binding = bindings[i];
                const bindIdx = binding.binding;
                if (descriptors[i].type & DESCRIPTOR_BUFFER_TYPE) {
                    const buffer = (this._buffers[i] || device.defaultResource.buffer) as WebGPUBuffer;
                    this._bindBufferEntry(binding, buffer);
                    if (descriptors[i].type & (DescriptorType.DYNAMIC_STORAGE_BUFFER | DescriptorType.DYNAMIC_UNIFORM_BUFFER)) {
                        this._dynamicOffsets.push(bindIdx);
                    }
                } else if (descriptors[i].type & DESCRIPTOR_SAMPLER_TYPE) {
                    const descType = descriptors[i].type;
                    if ((descType & DescriptorType.SAMPLER) !== DescriptorType.SAMPLER) {
                        // texture
                        let currTex = this._textures[i] as WebGPUTexture;
                        if (!currTex) {
                            if (binding.viewDimension === ViewDimension.TEXCUBE) {
                                currTex = device.defaultResource.cubeTexture;
                            } else {
                                currTex = device.defaultResource.texture;
                            }
                        }
                        this._bindTextureEntry(binding, currTex);
                    }

                    if (!((descType & DescriptorType.STORAGE_IMAGE) === DescriptorType.STORAGE_IMAGE
                        || (descType & DescriptorType.INPUT_ATTACHMENT) === DescriptorType.INPUT_ATTACHMENT
                        || (descType & DescriptorType.TEXTURE) === DescriptorType.TEXTURE)) {
                        // sampler
                        const currSampler = (this._samplers[i] || device.defaultResource.sampler) as WebGPUSampler;
                        this._bindSamplerEntry(binding, currSampler);
                    }
                }
            }
            this._isDirty = false;
            this._createBindGroup();
        }
    }

    private _hasResourceChange (bind: number, resource: WebGPUBuffer | WebGPUTexture | WebGPUSampler): boolean {
        if (resource && resource.hasChange) {
            this._bindResourceEntry(bind, resource);
            return true;
        }
        return false;
    }

    private _isResourceChange (): boolean {
        const layout = this._layout as WebGPUDescriptorSetLayout;
        return layout.gpuDescriptorSetLayout!.bindings.every((bind) => {
            const binding = bind.binding;
            const resource = this._buffers[binding] as WebGPUBuffer || this._textures[binding] || this._samplers[binding];
            return !this._hasResourceChange(binding, resource);
        });
    }

    public prepare (force: boolean = false): void {
        const breakUpdate = this._isResourceChange() && !force;
        if (breakUpdate) return;
        this._isDirty = true;
        this._applyBindGroup();
    }

    private _createBindGroup (): void {
        const device = WebGPUDeviceManager.instance;
        const nativeDevice = device.nativeDevice;
        const layout = this._layout as WebGPUDescriptorSetLayout;
        const bindGroup = nativeDevice?.createBindGroup({
            layout: layout.gpuDescriptorSetLayout!.bindGroupLayout!,
            entries: this._bindGroupEntries.values(),
        });
        this._gpuDescriptorSet!.bindGroupLayout = layout.gpuDescriptorSetLayout!.bindGroupLayout!;
        this._gpuDescriptorSet!.bindGroup = bindGroup!;
    }

    public update (): void {
        this._applyBindGroup();
    }
}
