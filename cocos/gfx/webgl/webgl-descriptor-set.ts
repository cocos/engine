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

import { DescriptorSet } from '../base/descriptor-set';
import { WebGLBuffer } from './webgl-buffer';
import { IWebGLGPUDescriptorSet, IWebGLGPUDescriptor } from './webgl-gpu-objects';
import { WebGLSampler } from './states/webgl-sampler';
import { WebGLTexture } from './webgl-texture';
import { WebGLDescriptorSetLayout } from './webgl-descriptor-set-layout';
import { DescriptorSetInfo, DESCRIPTOR_SAMPLER_TYPE, DESCRIPTOR_BUFFER_TYPE } from '../base/define';

export class WebGLDescriptorSet extends DescriptorSet {
    get gpuDescriptorSet (): IWebGLGPUDescriptorSet {
        return this._gpuDescriptorSet as IWebGLGPUDescriptorSet;
    }

    private _gpuDescriptorSet: IWebGLGPUDescriptorSet | null = null;

    constructor () {
        super();
    }

    public initialize (info: Readonly<DescriptorSetInfo>): void {
        this._layout = info.layout;
        const { bindings, descriptorIndices, descriptorCount } = (info.layout as WebGLDescriptorSetLayout).gpuDescriptorSetLayout;

        this._buffers = Array(descriptorCount).fill(null);
        this._textures = Array(descriptorCount).fill(null);
        this._samplers = Array(descriptorCount).fill(null);

        const gpuDescriptors: IWebGLGPUDescriptor[] = [];
        this._gpuDescriptorSet = { gpuDescriptors, descriptorIndices };

        for (let i = 0; i < bindings.length; ++i) {
            const binding = bindings[i];
            for (let j = 0; j < binding.count; j++) {
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
    }

    public update (): void {
        if (this._isDirty && this._gpuDescriptorSet) {
            const descriptors = this._gpuDescriptorSet.gpuDescriptors;
            for (let i = 0; i < descriptors.length; ++i) {
                if (descriptors[i].type & DESCRIPTOR_BUFFER_TYPE) {
                    const buffer = this._buffers[i] as WebGLBuffer | null;
                    if (buffer) {
                        descriptors[i].gpuBuffer = buffer.gpuBuffer || buffer.gpuBufferView;
                    }
                } else if (descriptors[i].type & DESCRIPTOR_SAMPLER_TYPE) {
                    if (this._textures[i]) {
                        descriptors[i].gpuTexture = (this._textures[i] as WebGLTexture).gpuTexture;
                    }
                    if (this._samplers[i]) {
                        descriptors[i].gpuSampler = (this._samplers[i] as WebGLSampler).gpuSampler;
                    }
                }
            }
            this._isDirty = false;
        }
    }
}
