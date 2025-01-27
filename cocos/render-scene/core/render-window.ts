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
import { screenAdapter } from 'pal/screen-adapter';
import { Orientation } from '../../../pal/screen-adapter/enum-type';
import {
    TextureType, TextureUsageBit, Format, RenderPass, Texture, Framebuffer,
    RenderPassInfo, Device, TextureInfo, FramebufferInfo, Swapchain, SurfaceTransform, TextureFlagBit, TextureFlags,
} from '../../gfx';
import { Root } from '../../root';
import { Camera } from '../scene';

export interface IRenderWindowInfo {
    title?: string;
    width: number;
    height: number;
    renderPassInfo: RenderPassInfo;
    swapchain?: Swapchain;
    externalResLow?: number; // for vulkan vkImage/opengl es texture created from external
    externalResHigh?: number; // for vulkan vkImage created from external
    externalFlag?: TextureFlags; // external texture type normal or oes
}

const orientationMap: Record<Orientation, SurfaceTransform> = {
    [Orientation.PORTRAIT]: SurfaceTransform.IDENTITY,
    [Orientation.LANDSCAPE_RIGHT]: SurfaceTransform.ROTATE_90,
    [Orientation.PORTRAIT_UPSIDE_DOWN]: SurfaceTransform.ROTATE_180,
    [Orientation.LANDSCAPE_LEFT]: SurfaceTransform.ROTATE_270,
};

// _windowCount is used to generate the render window Id.
// It is monotonic increasing and unique.
let _windowCount = 0;

/**
 * @en The render window represents the render target, it could be an off screen frame buffer or the on screen buffer.
 * @zh 渲染窗口代表了一个渲染目标，可以是离屏的帧缓冲，也可以是屏幕缓冲
 */
export class RenderWindow {
    /**
     * @en Get window width. Pre-rotated (i.e. rotationally invariant, always in identity/portrait mode) if possible.
     * If you want to get oriented size instead, you should use [[renderer.scene.Camera.width]] which corresponds to the current screen rotation.
     * @zh 获取窗口宽度。如果支持交换链预变换，返回值将始终处于单位旋转（竖屏）坐标系下。如果需要获取旋转后的尺寸，请使用 [[renderer.scene.Camera.width]]。
     */
    get width (): number {
        return this._width;
    }

    /**
     * @en Get window height. Pre-rotated (i.e. rotationally invariant, always in identity/portrait mode) if possible.
     * If you want to get oriented size instead, you should use [[renderer.scene.Camera.width]] which corresponds to the current screen rotation.
     * @zh 获取窗口高度。如果支持交换链预变换，返回值将始终处于单位旋转（竖屏）坐标系下。如果需要获取旋转后的尺寸，请使用 [[renderer.scene.Camera.height]]。
     */
    get height (): number {
        return this._height;
    }

    /**
     * @en Get the swapchain for this window, if there is one
     * @zh 如果存在的话，获取此窗口的交换链
     */
    get swapchain (): Swapchain {
        return this._swapchain;
    }

    /**
     * @en Get window frame buffer.
     * @zh 帧缓冲对象。
     */
    get framebuffer (): Framebuffer {
        return this._framebuffer!;
    }

    get cameras (): Camera[] {
        return this._cameras;
    }

    /**
     * @en Get render window Id.
     * Render windowd Id is used to identify the render window in the render pipeline.
     * @zh 获得渲染窗口Id。渲染窗口Id用于在渲染管线中标识渲染窗口。
     */
    get renderWindowId (): number {
        return this._renderWindowId;
    }

    /**
     * @en Get the name of the color attachment.
     * The name is used to identify the color attachment in the render pipeline.
     * @zh 获取颜色附件的名称。用于自定义渲染管线中的资源注册。
     */
    get colorName (): string {
        return this._colorName;
    }

    /**
     * @en Get the name of the depth stencil attachment.
     * The name is used to identify the depth stencil attachment in the render pipeline.
     * @zh 获取深度模板附件的名称。用于自定义渲染管线中的资源注册。
     */
    get depthStencilName (): string {
        return this._depthStencilName;
    }

    /**
     * @en The render pipeline should handle the resize event properly
     * @zh 渲染管线应该正确处理窗口大小变化事件
     */
    isRenderWindowResized (): boolean {
        return this._isResized;
    }

    /**
     * @en The render pipeline should set this value to false after handling the resize event
     * @zh 渲染管线应该在处理完窗口大小变化事件后将此值设置为 false
     */
    setRenderWindowResizeHandled (): void {
        this._isResized = false;
    }

    protected _title = '';
    protected _width = 1;
    protected _height = 1;
    protected _swapchain: Swapchain = null!;
    protected _renderPass: RenderPass | null = null;
    protected _colorTextures: Texture[] = [];
    protected _depthStencilTexture: Texture | null = null;
    protected _cameras: Camera[] = [];
    protected _hasOnScreenAttachments = false;
    protected _hasOffScreenAttachments = false;
    protected _framebuffer: Framebuffer | null = null;
    protected _device: Device | null = null;
    // _renderWindowId is used to identify the render window in the render pipeline
    protected _renderWindowId = _windowCount++;
    // _isResized is used to indicate whether the render window is resized
    protected _isResized = true;
    // _colorName is used to identify the color attachment in the render pipeline
    protected _colorName = `Color${this._renderWindowId}`;
    // _depthStencilName is used to identify the depth stencil attachment in the render pipeline
    protected _depthStencilName = `DepthStencil${this._renderWindowId}`;

    /**
     * @private
     */
    public static registerCreateFunc (root: Root): void {
        root._createWindowFun = (_root: Root): RenderWindow => new RenderWindow(_root);
    }

    private constructor (root: Root) {}

    public initialize (device: Device, info: IRenderWindowInfo): boolean {
        if (info.title !== undefined) {
            this._title = info.title;
        }

        if (info.swapchain !== undefined) {
            this._swapchain = info.swapchain;
        }

        this._width = info.width;
        this._height = info.height;
        this._device = device;
        this._renderPass = device.createRenderPass(info.renderPassInfo);

        if (info.swapchain) {
            this._swapchain = info.swapchain;
            this._colorTextures.push(info.swapchain.colorTexture);
            this._depthStencilTexture = info.swapchain.depthStencilTexture;
        } else {
            for (let i = 0; i < info.renderPassInfo.colorAttachments.length; i++) {
                const textureInfo = new TextureInfo(
                    TextureType.TEX2D,
                    TextureUsageBit.COLOR_ATTACHMENT | TextureUsageBit.SAMPLED | TextureUsageBit.TRANSFER_SRC,
                    info.renderPassInfo.colorAttachments[i].format,
                    this._width,
                    this._height,
                );

                if (info.externalFlag && (info.externalFlag & TextureFlagBit.EXTERNAL_NORMAL || info.externalFlag & TextureFlagBit.EXTERNAL_OES)) {
                    textureInfo.flags |= info.externalFlag;
                    textureInfo.externalRes = info.externalResLow ? info.externalResLow : 0;
                }
                this._colorTextures.push(device.createTexture(textureInfo));
            }
            if (info.renderPassInfo.depthStencilAttachment && info.renderPassInfo.depthStencilAttachment.format !== Format.UNKNOWN) {
                this._depthStencilTexture = device.createTexture(new TextureInfo(
                    TextureType.TEX2D,
                    TextureUsageBit.DEPTH_STENCIL_ATTACHMENT | TextureUsageBit.SAMPLED,
                    info.renderPassInfo.depthStencilAttachment.format,
                    this._width,
                    this._height,
                ));
                this._hasOffScreenAttachments = true;
            }
        }
        this._framebuffer = device.createFramebuffer(new FramebufferInfo(
            this._renderPass,
            this._colorTextures,
            this._depthStencilTexture,
        ));

        return true;
    }

    public destroy (): void {
        this.clearCameras();

        if (this._framebuffer) {
            this._framebuffer.destroy();
            this._framebuffer = null;
        }

        if (this._depthStencilTexture) {
            this._depthStencilTexture.destroy();
            this._depthStencilTexture = null;
        }

        for (let i = 0; i < this._colorTextures.length; i++) {
            const colorTexture = this._colorTextures[i];
            if (colorTexture) {
                colorTexture.destroy();
            }
        }
        this._colorTextures.length = 0;
        this._device = null;
    }

    /**
     * @en Resize window.
     * @zh 重置窗口大小。
     * @param width The new width.
     * @param height The new height.
     */
    public resize (width: number, height: number): void {
        if (this._swapchain) {
            this._swapchain.resize(width, height, orientationMap[screenAdapter.orientation]);
            this._width = this._swapchain.width;
            this._height = this._swapchain.height;
        } else {
            for (let i = 0; i < this._colorTextures.length; i++) {
                this._colorTextures[i].resize(width, height);
            }
            if (this._depthStencilTexture) {
                this._depthStencilTexture.resize(width, height);
            }
            this._width = width;
            this._height = height;
        }

        if (this.framebuffer) {
            this.framebuffer.destroy();
            this._framebuffer = this._device!.createFramebuffer(new FramebufferInfo(
                this._renderPass!,
                this._colorTextures,
                this._depthStencilTexture,
            ));
        }

        this._cameras.forEach((camera) => {
            camera.resize(width, height);
        });

        // This resize should only be handled by the render pipeline
        this._isResized = true;
    }

    /**
     * @en Extract all render cameras attached to the render window to the output cameras list
     * @zh 将所有挂载到当前渲染窗口的摄像机存储到输出列表参数中
     * @param cameras @en The output cameras list, should be empty before invoke this function
     *                @zh 输出相机列表参数，传入时应该为空
     */
    public extractRenderCameras (cameras: Camera[]): void {
        for (let j = 0; j < this._cameras.length; j++) {
            const camera = this._cameras[j];
            if (camera.enabled) {
                camera.update();
                cameras.push(camera);
            }
        }
    }

    /**
     * @en Attach a new camera to the render window
     * @zh 添加渲染相机
     * @param camera @en The camera to attach @zh 要挂载的相机
     */
    public attachCamera (camera: Camera): void {
        for (let i = 0; i < this._cameras.length; i++) {
            if (this._cameras[i] === camera) {
                return;
            }
        }
        this._cameras.push(camera);
        this.sortCameras();

        // This resize should only be handled by the render pipeline
        // If the camera is attached to the render window,
        // resize handler should be called to update render window resouces
        this._isResized = true;
    }

    /**
     * @en Detach a camera from the render window
     * @zh 移除场景中的渲染相机
     * @param camera @en The camera to detach @zh 要移除的相机
     */
    public detachCamera (camera: Camera): void {
        for (let i = 0; i < this._cameras.length; ++i) {
            if (this._cameras[i] === camera) {
                this._cameras.splice(i, 1);
                return;
            }
        }
    }

    /**
     * @en Clear all attached cameras
     * @zh 清空全部渲染相机
     */
    public clearCameras (): void {
        this._cameras.length = 0;
    }

    /**
     * @en Sort all attached cameras with priority
     * @zh 按照优先级对所有挂载的相机排序
     */
    public sortCameras (): void {
        this._cameras.sort((a: Camera, b: Camera): number => a.priority - b.priority);
    }
}
