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

import { RenderPass } from './render-pass';
import { Texture } from './texture';
import { GFXObject, ObjectType, FramebufferInfo } from './define';

/**
 * @en GFX frame buffer.
 * @zh GFX 帧缓冲。
 */
export abstract class Framebuffer extends GFXObject {
    /**
     * @en Get current render pass.
     * @zh GFX 渲染过程。
     */
    public get renderPass (): RenderPass {
        return this._renderPass$!;
    }

    /**
     * @en Get current color views.
     * @zh 颜色纹理视图数组。
     */
    public get colorTextures (): (Texture | null)[] {
        return this._colorTextures$;
    }

    /**
     * @en Get current depth stencil views.
     * @zh 深度模板纹理视图。
     */
    public get depthStencilTexture (): Texture | null {
        return this._depthStencilTexture$;
    }

    public get width (): number {
        if (this.colorTextures.length > 0) {
            return this.colorTextures[0]?.width ?? this._width$;
        } else if (this.depthStencilTexture) {
            return this.depthStencilTexture.width;
        }
        return this._width$;
    }

    public get height (): number {
        if (this.colorTextures.length > 0) {
            return this.colorTextures[0]?.height ?? this._height$;
        } else if (this.depthStencilTexture) {
            return this.depthStencilTexture.height;
        }
        return this._height$;
    }

    public get needRebuild (): boolean {
        return false;
    }

    protected _renderPass$: RenderPass | null = null;
    protected _colorTextures$: (Texture | null)[] = [];
    protected _depthStencilTexture$: Texture | null = null;
    protected _width$: number = 0;
    protected _height$: number = 0;

    constructor () {
        super(ObjectType.FRAMEBUFFER);
    }

    public abstract initialize (info: Readonly<FramebufferInfo>): void;

    public abstract destroy (): void;
}
