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

import { GFXObject, ObjectType, SurfaceTransform, SwapchainInfo } from './define';
import { Texture } from './texture';

/**
 * @en GFX Swapchain.
 * @zh GFX 交换链。
 */
export abstract class Swapchain extends GFXObject {
    /**
     * @en The color texture of this swapchain.
     * @zh 当前交换链的颜色缓冲。
     */
    get colorTexture (): Texture {
        return this._colorTexture;
    }

    /**
     * @en The depth stencil texture of this swapchain.
     * @zh 当前交换链的深度模板缓冲。
     */
    get depthStencilTexture (): Texture {
        return this._depthStencilTexture;
    }

    /**
     * @en The surface transform to be applied in projection matrices.
     * @zh 需要在投影矩阵中应用的表面变换。
     */
    get surfaceTransform (): SurfaceTransform {
        return this._transform;
    }

    get width (): number {
        return this._colorTexture.width;
    }

    get height (): number {
        return this._colorTexture.height;
    }

    protected _transform = SurfaceTransform.IDENTITY;
    protected _colorTexture: Texture = null!;
    protected _depthStencilTexture: Texture = null!;

    constructor () {
        super(ObjectType.SWAPCHAIN);
    }

    public abstract initialize (info: Readonly<SwapchainInfo>): void;
    public abstract resize (width: number, height: number, surfaceTransform: SurfaceTransform): void;
    public abstract destroy (): void;
}
