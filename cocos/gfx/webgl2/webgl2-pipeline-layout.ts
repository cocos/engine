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

import { PipelineLayout } from '../base/pipeline-layout';
import { IWebGL2GPUPipelineLayout, IWebGL2GPUDescriptorSetLayout } from './webgl2-gpu-objects';
import { WebGL2DescriptorSetLayout } from './webgl2-descriptor-set-layout';
import { PipelineLayoutInfo } from '../base/define';

export class WebGL2PipelineLayout extends PipelineLayout {
    constructor () {
        super();
    }

    getGpuPipelineLayout (): IWebGL2GPUPipelineLayout { return this._gpuPipelineLayout!; }

    private _gpuPipelineLayout: IWebGL2GPUPipelineLayout | null = null;

    public initialize (info: Readonly<PipelineLayoutInfo>): void {
        Array.prototype.push.apply(this._setLayouts, info.setLayouts);

        const dynamicOffsetIndices: number[][] = [];

        const gpuSetLayouts: IWebGL2GPUDescriptorSetLayout[] = [];
        let dynamicOffsetCount = 0;
        const dynamicOffsetOffsets: number[] = [];
        for (let i = 0; i < this._setLayouts.length; i++) {
            const setLayout = this._setLayouts[i] as WebGL2DescriptorSetLayout;
            const gpuDescriptorSetLayout = setLayout.getGpuDescriptorSetLayout();
            const dynamicBindings = gpuDescriptorSetLayout.dynamicBindings;
            const indices = Array<number>(setLayout.bindingIndices.length).fill(-1);
            for (let j = 0; j < dynamicBindings.length; j++) {
                const binding = dynamicBindings[j];
                if (indices[binding] < 0) indices[binding] = dynamicOffsetCount + j;
            }

            gpuSetLayouts.push(gpuDescriptorSetLayout);
            dynamicOffsetIndices.push(indices);
            dynamicOffsetOffsets.push(dynamicOffsetCount);
            dynamicOffsetCount += dynamicBindings.length;
        }

        this._gpuPipelineLayout = {
            gpuSetLayouts,
            dynamicOffsetIndices,
            dynamicOffsetCount,
            dynamicOffsetOffsets,
        };
    }

    public destroy (): void {
        this._setLayouts.length = 0;
    }
}
