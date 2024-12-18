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

import {
    Format,
    GFXObject,
    ObjectType,
    SampleCount,
    TextureFlags,
    TextureType,
    TextureUsage,
    TextureInfo,
    TextureViewInfo,
    ISwapchainTextureInfo,
    TextureHandle,
} from './define';

/**
 * @en GFX texture.
 * @zh GFX 纹理。
 */
export abstract class Texture extends GFXObject {
    /**
     * @en Get texture type.
     * @zh 纹理类型。
     */
    get type (): TextureType {
        return this._info.type;
    }

    /**
     * @en Get texture usage.
     * @zh 纹理使用方式。
     */
    get usage (): TextureUsage {
        return this._info.usage;
    }

    /**
     * @en Get texture format.
     * @zh 纹理格式。
     */
    get format (): Format {
        return this._info.format;
    }

    /**
     * @en Get texture width.
     * @zh 纹理宽度。
     */
    get width (): number {
        return this._info.width;
    }

    /**
     * @en Get texture height.
     * @zh 纹理高度。
     */
    get height (): number {
        return this._info.height;
    }

    /**
     * @en Get texture depth.
     * @zh 纹理深度。
     */
    get depth (): number {
        return this._info.depth;
    }

    /**
     * @en Get texture array layer.
     * @zh 纹理数组层数。
     */
    get layerCount (): number {
        return this._info.layerCount;
    }

    /**
     * @en Get texture mip level.
     * @zh 纹理 mip 层级数。
     */
    get levelCount (): number {
        return this._info.levelCount;
    }

    /**
     * @en Get texture samples.
     * @zh 纹理采样数。
     */
    get samples (): SampleCount {
        return this._info.samples;
    }

    /**
     * @en Get texture flags.
     * @zh 纹理标识位。
     */
    get flags (): TextureFlags {
        return this._info.flags;
    }

    /**
     * @en Get texture size.
     * @zh 纹理大小。
     */
    get size (): number {
        return this._size;
    }

    /**
     * @en Get texture info.
     * @zh 纹理信息。
     */
    get info (): Readonly<TextureInfo> {
        return this._info;
    }

    /**
     * @en Get view info.
     * @zh 纹理视图信息。
     */
    get viewInfo (): Readonly<TextureViewInfo> {
        return this._viewInfo;
    }

    /**
     * @en Get texture type.
     * @zh 是否为纹理视图。
     */
    get isTextureView (): boolean {
        return this._isTextureView;
    }

    protected _info: TextureInfo = new TextureInfo();
    protected _viewInfo: TextureViewInfo = new TextureViewInfo();

    protected _isPowerOf2 = false;
    protected _isTextureView = false;
    protected _size = 0;

    constructor () {
        super(ObjectType.TEXTURE);
    }

    public abstract initialize (info: Readonly<TextureInfo> | Readonly<TextureViewInfo>): void;

    public abstract destroy (): void;

    public abstract getTextureHandle (): TextureHandle;

    /**
     * @en Resize texture.
     * @zh 重置纹理大小。
     * @param width The new width.
     * @param height The new height.
     */
    public abstract resize (width: number, height: number): void;

    /**
     * @engineInternal
     */
    public abstract initAsSwapchainTexture (info: Readonly<ISwapchainTextureInfo>): void;

    public static getLevelCount (width: number, height: number): number {
        return Math.floor(Math.log2(Math.max(width, height)));
    }
}
