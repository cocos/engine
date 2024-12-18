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

import { PipelineLayout } from '../base/pipeline-layout';
import { IWebGPUGPUPipelineLayout, IWebGPUGPUDescriptorSetLayout } from './webgpu-gpu-objects';
import { WebGPUDescriptorSetLayout } from './webgpu-descriptor-set-layout';
import { PipelineLayoutInfo } from '../base/define';
import { WebGPUDeviceManager } from './define';

export class WebGPUPipelineLayout extends PipelineLayout {
    get gpuPipelineLayout (): IWebGPUGPUPipelineLayout | null { return this._gpuPipelineLayout!; }

    private _gpuPipelineLayout: IWebGPUGPUPipelineLayout | null = null;
    private _nativePipelineLayout!: GPUPipelineLayout;
    private _bindGrpLayouts: GPUBindGroupLayout[] = [];

    public fetchPipelineLayout (resetAll: boolean = true): GPUPipelineLayout {
        const gpuPipelineLayout = this._gpuPipelineLayout!;
        if (resetAll) {
            gpuPipelineLayout.gpuSetLayouts.length = 0;
            gpuPipelineLayout.dynamicOffsetIndices.length = 0;
        }
        const webGPUDevice = WebGPUDeviceManager.instance;
        const nativeDevice = webGPUDevice.nativeDevice;
        this._bindGrpLayouts.length = 0;
        const setLayoutSize = this._setLayouts.length;
        for (let i = 0; i < setLayoutSize; i++) {
            const setLayout = this._setLayouts[i] as WebGPUDescriptorSetLayout;
            const bindGroupLayout = setLayout.gpuDescriptorSetLayout!.bindGroupLayout;
            if (bindGroupLayout) {
                if (resetAll) {
                    const dynamicBindings = setLayout.gpuDescriptorSetLayout!.dynamicBindings;
                    const indices: number[] = Array(setLayout.bindingIndices.length).fill(-1);
                    const dynBindSize = dynamicBindings.length;
                    for (let j = 0; j < dynBindSize; j++) {
                        const binding = dynamicBindings[j];
                        if (indices[binding] < 0) indices[binding] = gpuPipelineLayout.dynamicOffsetCount + j;
                    }

                    gpuPipelineLayout.gpuSetLayouts.push(setLayout.gpuDescriptorSetLayout!);
                    gpuPipelineLayout.dynamicOffsetIndices.push(indices);
                    gpuPipelineLayout.dynamicOffsetCount += dynBindSize;
                }
                this._bindGrpLayouts[i] = bindGroupLayout;
            }
            // setLayout.resetChange();
        }

        this._nativePipelineLayout = nativeDevice?.createPipelineLayout({ bindGroupLayouts: this._bindGrpLayouts }) as GPUPipelineLayout;
        return this._nativePipelineLayout;
    }

    public initialize (info: PipelineLayoutInfo): boolean {
        Array.prototype.push.apply(this._setLayouts, info.setLayouts);

        const dynamicOffsetIndices: number[][] = [];

        const gpuSetLayouts: IWebGPUGPUDescriptorSetLayout[] = [];

        const dynamicOffsetCount = 0;

        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const that = this;
        this._gpuPipelineLayout = {
            setLayouts: this._setLayouts,
            gpuSetLayouts,
            dynamicOffsetIndices,
            dynamicOffsetCount,
            gpuBindGroupLayouts: this._bindGrpLayouts,
            // In order to avoid binding exceeding the number specified by webgpu,
            // gpulayout changes dynamically instead of binding everything at once.
            get nativePipelineLayout (): GPUPipelineLayout {
                return that._nativePipelineLayout;
            },

        };
        this.fetchPipelineLayout();
        return true;
    }

    public changeSetLayout (idx: number, setLayout: WebGPUDescriptorSetLayout): void {
        this._setLayouts[idx] = setLayout;
    }

    public destroy (): void {
        this._setLayouts.length = 0;
    }
}
