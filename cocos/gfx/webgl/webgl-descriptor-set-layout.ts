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

import { DescriptorSetLayoutInfo, DESCRIPTOR_DYNAMIC_TYPE } from '../base/define';
import { DescriptorSetLayout } from '../base/descriptor-set-layout';
import { IWebGLGPUDescriptorSetLayout } from './webgl-gpu-objects';

export class WebGLDescriptorSetLayout extends DescriptorSetLayout {
    get gpuDescriptorSetLayout (): IWebGLGPUDescriptorSetLayout { return this._gpuDescriptorSetLayout!; }

    private _gpuDescriptorSetLayout: IWebGLGPUDescriptorSetLayout | null = null;

    constructor () {
        super();
    }

    public initialize (info: Readonly<DescriptorSetLayoutInfo>): void {
        Array.prototype.push.apply(this._bindings, info.bindings);

        let descriptorCount = 0; let maxBinding = -1;
        const flattenedIndices: number[] = [];
        for (let i = 0; i < this._bindings.length; i++) {
            const binding = this._bindings[i];
            flattenedIndices.push(descriptorCount);
            descriptorCount += binding.count;
            if (binding.binding > maxBinding) maxBinding = binding.binding;
        }

        this._bindingIndices = Array(maxBinding + 1).fill(-1);
        const descriptorIndices = this._descriptorIndices = Array(maxBinding + 1).fill(-1);
        for (let i = 0; i < this._bindings.length; i++) {
            const binding = this._bindings[i];
            this._bindingIndices[binding.binding] = i;
            descriptorIndices[binding.binding] = flattenedIndices[i];
        }

        const dynamicBindings: number[] = [];
        for (let i = 0; i < this._bindings.length; i++) {
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
        };
    }

    public destroy (): void {
        this._bindings.length = 0;
    }
}
