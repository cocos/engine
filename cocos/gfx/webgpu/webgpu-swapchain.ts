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

import { BufferTextureCopy, Format, SurfaceTransform, SwapchainInfo,
    TextureFlagBit, TextureInfo, TextureType, TextureUsageBit } from '../base/define';
import { Texture } from '../base/texture';
import { Swapchain } from '../base/swapchain';
import { WebGPUTexture } from './webgpu-texture';
import { debug, warn, warnID } from '../../core';
import { WebGPUDeviceManager } from './define';
import { GFXFormatToWGPUFormat } from './webgpu-commands';
import { IWebGPUBlitManager } from './webgpu-gpu-objects';
/**
 * @en GFX Swapchain implementation based on WebGPU.
 * @zh 基于 WebGPU 的 GFX 交换链实现。
 */
export class WebGPUSwapchain extends Swapchain {
    public nullTex2D: WebGPUTexture = null!;
    public nullTexCube: WebGPUTexture = null!;
    private _canvas: HTMLCanvasElement | null = null;
    private _blitManager: IWebGPUBlitManager | null = null;
    get blitManager (): IWebGPUBlitManager | null {
        return this._blitManager;
    }
    private _webGPUDeviceLostHandler: ((info: GPUDeviceLostInfo) => void) | null = null;
    public initialize (info: Readonly<SwapchainInfo>): void {
        this._canvas = info.windowHandle;
        const { width, height } = info;
        this._canvas.width = width;
        this._canvas.height = height;

        this._webGPUDeviceLostHandler = this._onWebGPUDeviceLost.bind(this);
        const device = WebGPUDeviceManager.instance;
        const nativeDevice = device.nativeDevice as GPUDevice;
        nativeDevice.lost.then(this._webGPUDeviceLostHandler).catch((reasons) => {
            // noop
        });
        const capabilities = device.capabilities;
        device.stateCache.initialize(
            capabilities.maxTextureUnits,
            capabilities.maxUniformBufferBindings,
            capabilities.maxVertexAttributes,
        );

        this._createTexture(width, height);
        this._depthStencilTexture = this._createDepthStencilTexture(width, height);
        this.nullTex2D = device.createTexture(new TextureInfo(
            TextureType.TEX2D,
            TextureUsageBit.SAMPLED,
            Format.RGBA8,
            2,
            2,
            TextureFlagBit.NONE,
        ))  as WebGPUTexture;
        this.nullTexCube = device.createTexture(new TextureInfo(
            TextureType.CUBE,
            TextureUsageBit.SAMPLED,
            Format.RGBA8,
            2,
            2,
            TextureFlagBit.NONE,
            6,
        ))  as WebGPUTexture;

        const nullTexRegion = new BufferTextureCopy();
        nullTexRegion.texExtent.width = 2;
        nullTexRegion.texExtent.height = 2;

        const nullTexBuff = new Uint8Array(this.nullTex2D.size);
        nullTexBuff.fill(0);
        device.copyBuffersToTexture([nullTexBuff], this.nullTex2D, [nullTexRegion]);

        nullTexRegion.texSubres.layerCount = 6;
        device.copyBuffersToTexture(
            [nullTexBuff, nullTexBuff, nullTexBuff, nullTexBuff, nullTexBuff, nullTexBuff],
            this.nullTexCube,
            [nullTexRegion],
        );

        this._blitManager = new IWebGPUBlitManager();
    }

    public override resize (width: number, height: number, surfaceTransform: SurfaceTransform): void {
        const device = WebGPUDeviceManager.instance.nativeDevice!;
        // Make sure it's valid for WebGPU
        width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
        height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));

        if (this._colorTexture.width !== width || this._colorTexture.height !== height) {
            debug(`Resizing swapchain: ${width}x${height}`);
            this._canvas!.width = width;
            this._canvas!.height = height;
            this._colorTexture.resize(width, height);
            this._depthStencilTexture.resize(width, height);
        }
    }

    public override destroy (): void {
        if (this._canvas && this._webGPUDeviceLostHandler) {
            this._webGPUDeviceLostHandler = null;
        }

        if (this.nullTex2D) {
            this.nullTex2D.destroy();
            this.nullTex2D = null!;
        }

        if (this.nullTexCube) {
            this.nullTexCube.destroy();
            this.nullTexCube = null!;
        }

        if (this._blitManager) {
            this._blitManager.destroy();
            this._blitManager = null;
        }
        this._canvas = null;
    }

    public get colorTexture (): Texture {
        (this._colorTexture as WebGPUTexture).gpuTexture.gpuTexture = WebGPUDeviceManager.instance.context.getCurrentTexture();
        return this._colorTexture;
    }

    public get colorGPUTexture (): GPUTexture {
        (this._colorTexture as WebGPUTexture).gpuTexture.gpuTexture = WebGPUDeviceManager.instance.context.getCurrentTexture();
        return (this._colorTexture as WebGPUTexture).gpuTexture.gpuTexture!;
    }

    public get colorGPUTextureView (): GPUTextureView {
        (this._colorTexture as WebGPUTexture).gpuTexture.gpuTexture = WebGPUDeviceManager.instance.context.getCurrentTexture();
        return (this._colorTexture as WebGPUTexture).gpuTexture.gpuTexture!.createView();
    }

    public get depthStencilTexture (): Texture {
        return this._depthStencilTexture;
    }

    public get gpuDepthStencilTexture (): GPUTexture {
        return (this._depthStencilTexture  as WebGPUTexture).gpuTexture.gpuTexture!;
    }

    public get gpuDepthStencilTextureView (): GPUTextureView {
        return (this._depthStencilTexture  as WebGPUTexture).gpuTexture.gpuTexture!.createView();
    }

    private _createTexture (width: number, height: number): WebGPUTexture {
        const device = WebGPUDeviceManager.instance;
        const gfxSwapchainFormat = device.swapchainFormat;
        const swapchainFormat = GFXFormatToWGPUFormat(gfxSwapchainFormat);// navigator.gpu.getPreferredCanvasFormat();
        if (!this._colorTexture) {
            const nativeDevice = device.nativeDevice as GPUDevice;
            const gpuConfig: GPUCanvasConfiguration = {
                device: nativeDevice,
                format: swapchainFormat,
                alphaMode: 'opaque',
            };
            device.gpuConfig = gpuConfig;
            device.context.configure(gpuConfig);
        }
        this._colorTexture = new WebGPUTexture();
        this._colorTexture.initAsSwapchainTexture({
            swapchain: this,
            format: gfxSwapchainFormat,
            width,
            height,
        });
        (this._colorTexture as WebGPUTexture).gpuTexture.gpuTexture = device.context.getCurrentTexture();
        return (this._colorTexture as WebGPUTexture);
    }

    private _createDepthStencilTexture (width: number, height: number): WebGPUTexture {
        const device = WebGPUDeviceManager.instance;
        const depthInfo = new TextureInfo(
            TextureType.TEX2D,
            TextureUsageBit.DEPTH_STENCIL_ATTACHMENT | TextureUsageBit.SAMPLED,
            Format.DEPTH_STENCIL,
            width,
            height,
        );
        const depthTexture = device.createTexture(depthInfo);
        return depthTexture as WebGPUTexture;
    }

    private _onWebGPUDeviceLost (info: GPUDeviceLostInfo): void {
        warnID(11000);
        warn('webgpu device lost');
    }
}
