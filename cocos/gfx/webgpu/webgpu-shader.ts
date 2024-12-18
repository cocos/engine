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

import { Shader } from '../base/shader';
import { WebGPUCmdFuncCreateGPUShader, WebGPUCmdFuncDestroyShader } from './webgpu-commands';
import { IWebGPUGPUShader, IWebGPUGPUShaderStage } from './webgpu-gpu-objects';
import { ShaderInfo } from '../base/define';
import { WebGPUDeviceManager } from './define';

export class WebGPUShader extends Shader {
    get gpuShader (): IWebGPUGPUShader {
        return this._gpuShader!;
    }

    private _gpuShader: IWebGPUGPUShader | null = null;

    public initialize (info: Readonly<ShaderInfo>): void {
        this._name = info.name;
        this._stages = info.stages;
        this._attributes = info.attributes;
        this._blocks = info.blocks;
        this._samplers = info.samplers;
        const stageSize = info.stages.length;
        this._gpuShader = {
            name: info.name,
            blocks: info.blocks.slice(),
            samplers: info.samplers,

            gpuStages: new Array<IWebGPUGPUShaderStage>(stageSize),
            gpuProgram: null,
            gpuInputs: [],
            gpuUniforms: [],
            gpuBlocks: [],
            gpuSamplers: [],
            bindings: new Map<number, number[]>(),
        };

        for (let i = 0; i < stageSize; ++i) {
            const stage = info.stages[i];
            this._gpuShader.gpuStages[i] = {
                type: stage.stage,
                source: stage.source,
                gpuShader: null,
                bindings: [],
                attrs: new Map(),
            };
        }
        const device = WebGPUDeviceManager.instance;
        WebGPUCmdFuncCreateGPUShader(device, this._gpuShader);
    }

    public destroy (): void {
        if (!this._gpuShader) {
            return;
        }
        const device = WebGPUDeviceManager.instance;
        WebGPUCmdFuncDestroyShader(device, this._gpuShader);
        this._gpuShader = null;
    }
}
