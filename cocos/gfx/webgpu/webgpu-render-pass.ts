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

import { RenderPass } from '../base/render-pass';
import { IWebGPUGPURenderPass } from './webgpu-gpu-objects';
import { LoadOp, StoreOp, RenderPassInfo, DepthStencilAttachment, ColorAttachment, Format } from '../base/define';

export class WebGPURenderPass extends RenderPass {
    public get gpuRenderPass (): IWebGPUGPURenderPass {
        return this._gpuRenderPass!;
    }

    private _gpuRenderPass: IWebGPUGPURenderPass | null = null;
    private _generateColorAttachment (colorAttachment: ColorAttachment): GPURenderPassColorAttachment {
        return {
            view: {} as GPUTextureView, // later
            loadOp: colorAttachment.loadOp === LoadOp.LOAD ? 'load' : 'clear', // what ever as long as not 'load'
            storeOp: colorAttachment.storeOp === StoreOp.STORE ? 'store' : 'discard',
        };
    }
    private _generateDSAttachment (dsAttachment: DepthStencilAttachment): GPURenderPassDepthStencilAttachment {
        const depthStencilDescriptor = {} as GPURenderPassDepthStencilAttachment;
        depthStencilDescriptor.depthClearValue = 1.0;
        depthStencilDescriptor.depthLoadOp = dsAttachment.depthLoadOp === LoadOp.CLEAR ? 'clear' : 'load';
        depthStencilDescriptor.depthStoreOp = dsAttachment.depthStoreOp === StoreOp.STORE ? 'store' : 'discard';
        depthStencilDescriptor.stencilClearValue = 0.0;
        depthStencilDescriptor.stencilLoadOp = dsAttachment.stencilLoadOp === LoadOp.CLEAR ? 'clear' : 'load';
        depthStencilDescriptor.stencilStoreOp = dsAttachment.stencilStoreOp === StoreOp.STORE ? 'store' : 'discard';
        depthStencilDescriptor.view = {} as GPUTextureView;
        return depthStencilDescriptor;
    }
    public initialize (info: Readonly<RenderPassInfo>): void {
        this._colorInfos = info.colorAttachments;
        this._depthStencilInfo = info.depthStencilAttachment;
        this._subpasses = info.subpasses;

        const colorDescriptions: GPURenderPassColorAttachment[] = [];
        const originalColorDesc: GPURenderPassColorAttachment[] = [];
        for (const attachment of info.colorAttachments) {
            originalColorDesc[colorDescriptions.length] = this._generateColorAttachment(attachment);
            colorDescriptions[colorDescriptions.length] = this._generateColorAttachment(attachment);
        }

        const renderPassDesc: GPURenderPassDescriptor = {
            colorAttachments: colorDescriptions,
        };
        const originalRPDesc: GPURenderPassDescriptor = {
            colorAttachments: originalColorDesc,
        };

        if (info.depthStencilAttachment) {
            if (info.depthStencilAttachment.format === Format.UNKNOWN) info.depthStencilAttachment.format = Format.DEPTH_STENCIL;
            const depthStencilDescriptor = this._generateDSAttachment(info.depthStencilAttachment);
            const originalDepthStencilDesc = this._generateDSAttachment(info.depthStencilAttachment);
            renderPassDesc.depthStencilAttachment = depthStencilDescriptor;
            originalRPDesc.depthStencilAttachment = originalDepthStencilDesc;
        }

        this._gpuRenderPass = {
            colorAttachments: this._colorInfos,
            depthStencilAttachment: this._depthStencilInfo,
            nativeRenderPass: renderPassDesc,
            originalRP: originalRPDesc,
        };
    }

    public destroy (): void {
        this._gpuRenderPass = null;
    }
}
