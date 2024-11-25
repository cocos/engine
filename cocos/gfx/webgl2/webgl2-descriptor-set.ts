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
import { WebGL2Buffer } from './webgl2-buffer';
import { IWebGL2GPUDescriptorSet, IWebGL2GPUDescriptor } from './webgl2-gpu-objects';
import { WebGL2Sampler } from './states/webgl2-sampler';
import { WebGL2Texture } from './webgl2-texture';
import { WebGL2DescriptorSetLayout } from './webgl2-descriptor-set-layout';
import { DescriptorSetInfo, DESCRIPTOR_BUFFER_TYPE, DESCRIPTOR_SAMPLER_TYPE } from '../base/define';

export class WebGL2DescriptorSet extends DescriptorSet {
    constructor () {
        super();
    }

    get gpuDescriptorSet (): IWebGL2GPUDescriptorSet {
        return this._gpuDescriptorSet as IWebGL2GPUDescriptorSet;
    }

    private _gpuDescriptorSet: IWebGL2GPUDescriptorSet | null = null;

    public initialize (info: Readonly<DescriptorSetInfo>): void {
        this._layout = info.layout;
        const { bindings, descriptorIndices, descriptorCount } = (info.layout as WebGL2DescriptorSetLayout).getGpuDescriptorSetLayout();

        this._buffers = Array(descriptorCount).fill(null);
        this._textures = Array(descriptorCount).fill(null);
        this._samplers = Array(descriptorCount).fill(null);

        const gpuDescriptors: IWebGL2GPUDescriptor[] = [];
        this._gpuDescriptorSet = { gpuDescriptors, descriptorIndices };

        for (let i = 0; i < bindings.length; ++i) {
            const binding = bindings[i];
            for (let j = 0; j < binding.count; j++) {
                gpuDescriptors.push({
                    type: binding.descriptorType,
                    gpuBuffer: null,
                    gpuTextureView: null,
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
                    if (this._buffers[i]) {
                        descriptors[i].gpuBuffer = (this._buffers[i] as WebGL2Buffer).getGpuBuffer();
                    }
                } else if (descriptors[i].type & DESCRIPTOR_SAMPLER_TYPE) {
                    if (this._textures[i]) {
                        descriptors[i].gpuTextureView = (this._textures[i] as WebGL2Texture).gpuTextureView;
                    }
                    if (this._samplers[i]) {
                        descriptors[i].gpuSampler = (this._samplers[i] as WebGL2Sampler).gpuSampler;
                    }
                }
            }
            this._isDirty = false;
        }
    }
}
