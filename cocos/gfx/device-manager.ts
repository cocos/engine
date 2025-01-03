/* eslint-disable max-len */
/*
 Copyright (c) 2022-2023 Xiamen Yaji Software Co., Ltd.

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

import { EDITOR, JSB } from 'internal:constants';
import { cclegacy, getError, sys, screen, settings, errorID, Settings } from '../core';
import { BindingMappingInfo, DeviceInfo, SwapchainInfo } from './base/define';
import { Device } from './base/device';
import { Swapchain } from './base/swapchain';
import { BrowserType } from '../../pal/system-info/enum-type';

/**
 * @en
 * Sets the renderer type, only useful on web
 *
 * @zh
 * 渲染模式。
 * 设置渲染器类型，仅适用于 web 端
 * @internal
 */
export enum LegacyRenderMode {
    /**
     * @en
     * Automatically chosen by engine.
     * @zh
     * 通过引擎自动选择。
     */
    AUTO = 0,
    /**
     * @en
     * Forced to use canvas renderer.
     * @zh
     * 强制使用 canvas 渲染。
     */
    CANVAS = 1,
    /**
     * @en
     * Forced to use WebGL renderer, but this will be ignored on mobile browsers.
     * @zh
     * 强制使用 WebGL 渲染，但是在部分 Android 浏览器中这个选项会被忽略。
     */
    WEBGL = 2,
    /**
     * @en
     * Use Headless Renderer, which is useful in test or server env, only for internal use by cocos team for now
     * @zh
     * 使用空渲染器，可以用于测试和服务器端环境，目前暂时用于 Cocos 内部测试使用。
     */
    HEADLESS = 3,
    /**
     * @en
     * Force WebGPU rendering, but this option will be ignored in some browsers.
     * @zh
     * 强制使用 WebGPU 渲染，但是在部分浏览器中这个选项会被忽略。
     */
    WEBGPU = 4,
}

/**
 * @internal
 */
export enum RenderType {
    UNKNOWN = -1,
    CANVAS = 0,
    WEBGL = 1,
    WEBGPU = 2,
    OPENGL = 3,
    HEADLESS = 4,
}

/**
 * @internal
 */

export class DeviceManager {
    private initialized = false;
    private _gfxDevice!: Device;
    private _canvas: HTMLCanvasElement | null = null;
    private _swapchain!: Swapchain;
    private _renderType: RenderType = RenderType.UNKNOWN;
    private _deviceInitialized = false;

    constructor () {}

    public get gfxDevice (): Device {
        return this._gfxDevice;
    }

    public get swapchain (): Swapchain {
        return this._swapchain;
    }

    private _tryInitializeWebGPUDevice (DeviceConstructor, info: DeviceInfo): Promise<boolean> {
        if (this._deviceInitialized) {
            return Promise.resolve(true);
        }
        if (DeviceConstructor) {
            this._gfxDevice = new DeviceConstructor();
            return new Promise<boolean>((resolve, reject) => {
                (this._gfxDevice.initialize(info) as Promise<boolean>).then((val) => {
                    this._deviceInitialized = val;
                    resolve(val);
                }).catch((err) => {
                    reject(err);
                });
            });
        }
        return Promise.resolve(false);
    }

    private _tryInitializeDeviceSync (DeviceConstructor, info: DeviceInfo): boolean {
        if (this._deviceInitialized) {
            return true;
        }
        if (DeviceConstructor) {
            this._gfxDevice = new DeviceConstructor();
            this._deviceInitialized = this._gfxDevice.initialize(info) as boolean;
        }
        return this._deviceInitialized;
    }

    public init (canvas: HTMLCanvasElement | null, bindingMappingInfo: BindingMappingInfo): boolean | Promise<boolean> {
        // Avoid setup to be called twice.
        if (this.initialized) { return true; }
        const renderMode = settings.querySettings(Settings.Category.RENDERING, 'renderMode') as LegacyRenderMode;
        this._canvas = canvas;
        if (this._canvas) { this._canvas.oncontextmenu = (): boolean => false; }
        this._renderType = this._determineRenderType(renderMode);
        this._deviceInitialized = false;
        const deviceInfo = new DeviceInfo(bindingMappingInfo);
        // WebGL or WebGPU context created successfully
        if (this._renderType === RenderType.WEBGL || this._renderType === RenderType.WEBGPU) {
            if (JSB && (globalThis as any).gfx) {
                this._gfxDevice = gfx.DeviceManager.create(deviceInfo);
            } else {
                let useWebGL2 = (!!globalThis.WebGL2RenderingContext);
                const userAgent = globalThis.navigator.userAgent.toLowerCase();
                // UC browser implementation doesn't conform to WebGL2 standard
                if (sys.browserType === BrowserType.UC) {
                    useWebGL2 = false;
                }
                Device.canvas = canvas!;
                if (this._renderType === RenderType.WEBGPU && cclegacy.WebGPUDevice) {
                    return new Promise<boolean>((resolve, reject) => {
                        this._tryInitializeWebGPUDevice(cclegacy.WebGPUDevice, deviceInfo).then((val) => {
                            this._initSwapchain();
                            resolve(val);
                        }).catch((err) => {
                            reject(err);
                        });
                    });
                }
                if (useWebGL2 && cclegacy.WebGL2Device) {
                    this._tryInitializeDeviceSync(cclegacy.WebGL2Device, deviceInfo);
                }
                if (cclegacy.WebGLDevice) {
                    this._tryInitializeDeviceSync(cclegacy.WebGLDevice, deviceInfo);
                }
                if (cclegacy.EmptyDevice) {
                    this._tryInitializeDeviceSync(cclegacy.EmptyDevice, deviceInfo);
                }
                this._initSwapchain();
            }
        } else if (this._renderType === RenderType.HEADLESS && cclegacy.EmptyDevice) {
            this._tryInitializeDeviceSync(cclegacy.EmptyDevice, deviceInfo);
            this._initSwapchain();
        }

        if (!this._gfxDevice) {
            // todo fix here for wechat game
            errorID(16337);
            this._renderType = RenderType.UNKNOWN;
            return false;
        }
        return true;
    }

    private _initSwapchain (): void {
        const swapchainInfo = new SwapchainInfo(1, this._canvas!);
        const windowSize = screen.windowSize;
        swapchainInfo.width = windowSize.width;
        swapchainInfo.height = windowSize.height;
        this._swapchain = this._gfxDevice.createSwapchain(swapchainInfo);
    }

    private _supportWebGPU (): boolean {
        return 'gpu' in globalThis.navigator;
    }

    private _determineRenderType (renderMode: LegacyRenderMode): RenderType {
        if (typeof renderMode !== 'number' || renderMode > LegacyRenderMode.WEBGPU || renderMode < LegacyRenderMode.AUTO) {
            renderMode = LegacyRenderMode.AUTO;
        }
        // Determine RenderType
        let renderType = RenderType.CANVAS;
        let supportRender = false;

        if (renderMode === LegacyRenderMode.CANVAS) {
            renderType = RenderType.CANVAS;
            supportRender = true;
        } else if (renderMode === LegacyRenderMode.AUTO || renderMode === LegacyRenderMode.WEBGPU) {
            renderType = (this._supportWebGPU() && !EDITOR) ? RenderType.WEBGPU : RenderType.WEBGL;
            supportRender = true;
        } else if (renderMode === LegacyRenderMode.WEBGL) {
            renderType = RenderType.WEBGL;
            supportRender = true;
        } else if (renderMode === LegacyRenderMode.HEADLESS) {
            renderType = RenderType.HEADLESS;
            supportRender = true;
        }

        if (!supportRender) {
            throw new Error(getError(3820, renderMode));
        }
        return renderType;
    }
}

/**
 * @internal
 */
export const deviceManager = new DeviceManager();
