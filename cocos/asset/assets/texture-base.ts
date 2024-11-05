/*
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.

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

import { EDITOR, TEST } from 'internal:constants';
import { ccclass, serializable } from 'cc.decorator';
import { Asset } from './asset';
import { Filter, PixelFormat, WrapMode } from './asset-enum';
import { Sampler, Texture, Device, Format, SamplerInfo, Address, Filter as GFXFilter, deviceManager } from '../../gfx';
import { errorID, murmurhash2_32_gc, ccenum, cclegacy, js } from '../../core';
import type { Batcher2D } from '../../2d/renderer/batcher-2d';

ccenum(Format);

const idGenerator = new js.IDGenerator('Tex');
/**
 * @en The base texture class, it defines features shared by all textures.
 * @zh 贴图资源基类。它定义了所有贴图共用的概念。
 */
@ccclass('cc.TextureBase')
export class TextureBase extends Asset {
    /**
     * @en Whether the pixel data is compressed.
     * @zh 此贴图是否为压缩的像素格式。
     */
    public get isCompressed (): boolean {
        return (this._format >= PixelFormat.RGB_ETC1 && this._format <= PixelFormat.RGBA_ASTC_12x12)
        || (this._format >= PixelFormat.RGB_A_PVRTC_2BPPV1 && this._format <= PixelFormat.RGBA_ETC1);
    }

    /**
     * @en Pixel width of the texture.
     * @zh 此贴图的像素宽度。
     */
    public get width (): number {
        return this._width;
    }

    /**
     * @en Pixel height of the texture.
     * @zh 此贴图的像素高度。
     */
    public get height (): number {
        return this._height;
    }

    /**
     * @en The pixel format enum.
     * @zh 像素格式枚举类型。
     */
    public static PixelFormat = PixelFormat;

    /**
     * @en The wrap mode enum.
     * @zh 环绕模式枚举类型。
     */
    public static WrapMode = WrapMode;

    /**
     * @en The texture filter mode enum.
     * @zh 纹理过滤模式枚举类型。
     */
    public static Filter = Filter;

    /**
     * @engineInternal
     */
    @serializable
    protected _format = PixelFormat.RGBA8888;

    /**
     * @engineInternal
     */
    @serializable
    protected _minFilter = Filter.LINEAR;

    /**
     * @engineInternal
     */
    @serializable
    protected _magFilter = Filter.LINEAR;

    /**
     * @engineInternal
     */
    @serializable
    protected _mipFilter = Filter.NONE;

    /**
     * @engineInternal
     */
    @serializable
    protected _wrapS = WrapMode.REPEAT;

    /**
     * @engineInternal
     */
    @serializable
    protected _wrapT = WrapMode.REPEAT;

    /**
     * @engineInternal
     */
    @serializable
    protected _wrapR = WrapMode.REPEAT;

    /**
     * @engineInternal
     */
    @serializable
    protected _anisotropy = 0;

    /**
     * @engineInternal
     */
    protected _width = 1;
    /**
     * @engineInternal
     */
    protected _height = 1;

    private declare _id: string;
    private _samplerInfo$ = new SamplerInfo();
    private _gfxSampler$: Sampler | null = null;
    private _gfxDevice$: Device | null = null;

    private _textureHash$ = 0;

    constructor () {
        super();

        // Id for generate hash in material
        this._id = idGenerator.getNewId();
        this._gfxDevice$ = this._getGFXDevice();
        this._textureHash$ = murmurhash2_32_gc(this._id, 666);
    }

    /**
     * @en Gets the id of the texture.
     * @zh 获取标识符。
     * @returns @en The id of this texture. @zh 此贴图的 id。
     */
    public getId (): string {
        return this._id;
    }

    /**
     * @en Gets the pixel format.
     * @zh 获取像素格式。
     * @returns @en The pixel format. @zh 像素格式。
     */
    public getPixelFormat (): PixelFormat {
        return this._format;
    }

    /**
     * @en Gets the anisotropy.
     * @zh 获取各向异性。
     * @returns @en The anisotropy. @zh 各项异性值。
     */
    public getAnisotropy (): number {
        return this._anisotropy;
    }

    /**
     * @en Sets the wrap mode of the texture.
     * Be noted, if the size of the texture is not power of two, only [[WrapMode.CLAMP_TO_EDGE]] is allowed.
     * @zh 设置此贴图的缠绕模式。
     * 注意，若贴图尺寸不是 2 的整数幂，缠绕模式仅允许 [[WrapMode.CLAMP_TO_EDGE]]。
     * @param wrapS @en S(U) coordinate wrap mode. @zh S(U) 坐标系缠绕模式.
     * @param wrapT @en T(V) coordinate wrap mode. @zh T(V) 坐标系缠绕模式.
     * @param wrapR @en R(W) coordinate wrap mode. @zh R(W) 坐标系缠绕模式.
     */
    public setWrapMode (wrapS: WrapMode, wrapT: WrapMode, wrapR?: WrapMode): void {
        if (wrapR === undefined) wrapR = wrapS; // wrap modes should be as consistent as possible for performance

        this._wrapS = wrapS;
        this._samplerInfo$.addressU = wrapS as unknown as Address;
        this._wrapT = wrapT;
        this._samplerInfo$.addressV = wrapT as unknown as Address;
        this._wrapR = wrapR;
        this._samplerInfo$.addressW = wrapR as unknown as Address;

        if (this._gfxDevice$) {
            this._gfxSampler$ = this._gfxDevice$.getSampler(this._samplerInfo$);
        }
    }

    /**
     * @en Sets the texture's filter mode.
     * @zh 设置此贴图的过滤算法。
     * @param minFilter @en Filter mode for scale down. @zh 贴图缩小时使用的过滤模式。
     * @param magFilter @en Filter mode for scale up. @zh 贴图放大时使用的过滤模式。
     */
    public setFilters (minFilter: Filter, magFilter: Filter): void {
        this._minFilter = minFilter;
        this._samplerInfo$.minFilter = minFilter as unknown as GFXFilter;
        this._magFilter = magFilter;
        this._samplerInfo$.magFilter = magFilter as unknown as GFXFilter;

        if (this._gfxDevice$) {
            this._gfxSampler$ = this._gfxDevice$.getSampler(this._samplerInfo$);
        }
    }

    /**
     * @en Sets the texture's mip filter mode.
     * @zh 设置此贴图的多层 mip 过滤算法。
     * @param mipFilter @en Filter mode for multiple mip level. @zh 多层 mip 过滤模式。
     */
    public setMipFilter (mipFilter: Filter): void {
        this._mipFilter = mipFilter;
        this._samplerInfo$.mipFilter = mipFilter as unknown as GFXFilter;

        if (this._gfxDevice$) {
            this._gfxSampler$ = this._gfxDevice$.getSampler(this._samplerInfo$);
        }
    }

    /**
     * @en Sets the texture's anisotropy.
     * @zh 设置此贴图的各向异性。
     * @param anisotropy @en The anisotropy to be set. Max value is 16. @zh 待设置的各向异性数值。最大值为16
     */
    public setAnisotropy (anisotropy: number): void {
        anisotropy = Math.min(anisotropy, 16);
        this._anisotropy = anisotropy;
        this._samplerInfo$.maxAnisotropy = anisotropy;

        if (this._gfxDevice$) {
            this._gfxSampler$ = this._gfxDevice$.getSampler(this._samplerInfo$);
        }
    }

    /**
     * @en Destroy the current texture, clear up the related GPU resources.
     * @zh 销毁此贴图，并释放占用的 GPU 资源。
     */
    public destroy (): boolean {
        const destroyed = super.destroy();
        if (destroyed && cclegacy.director.root?.batcher2D) {
            (cclegacy.director.root.batcher2D as Batcher2D)._releaseDescriptorSetCache(this._textureHash$);
        }
        return destroyed;
    }

    /**
     * @en Gets the texture hash.
     * @zh 获取此贴图的哈希值。
     */
    public getHash (): number {
        return this._textureHash$;
    }

    /**
     * @en Gets the GFX Texture resource
     * @zh 获取此贴图底层的 GFX 贴图对象。
     */
    public getGFXTexture (): Texture | null {
        return null;
    }

    /**
     * @en Gets the internal GFX sampler hash.
     * @zh 获取此贴图内部使用的 GFX 采样器信息。
     * @private
     */
    public getSamplerInfo (): Readonly<SamplerInfo> {
        return this._samplerInfo$;
    }

    /**
     * @en Gets the sampler resource for the texture
     * @zh 获取此贴图底层的 GFX 采样信息。
     */
    public getGFXSampler (): Sampler {
        if (!this._gfxSampler$) {
            if (this._gfxDevice$) {
                this._gfxSampler$ = this._gfxDevice$.getSampler(this._samplerInfo$);
            } else {
                errorID(9302);
            }
        }
        return this._gfxSampler$!;
    }

    // SERIALIZATION

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _serialize (ctxForExporting: any): any {
        if (EDITOR || TEST) {
            return `${this._minFilter},${this._magFilter},${
                this._wrapS},${this._wrapT},${
                this._mipFilter},${this._anisotropy}`;
        }
        return '';
    }

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _deserialize (serializedData: any, handle: any): void {
        const data = serializedData as string;
        const fields = data.split(',');
        fields.unshift('');
        if (fields.length >= 5) {
            // decode filters
            this.setFilters(parseInt(fields[1]), parseInt(fields[2]));
            // decode wraps
            this.setWrapMode(parseInt(fields[3]), parseInt(fields[4]));
        }
        if (fields.length >= 7) {
            this.setMipFilter(parseInt(fields[5]));
            this.setAnisotropy(parseInt(fields[6]));
        }
    }

    protected _getGFXDevice (): Device | null {
        return deviceManager.gfxDevice;
    }

    protected _getGFXFormat (): Format {
        return this._getGFXPixelFormat(this._format);
    }

    protected _setGFXFormat (format?: PixelFormat): void {
        this._format = format === undefined ? PixelFormat.RGBA8888 : format;
    }

    protected _getGFXPixelFormat (format: PixelFormat): Format {
        if (format === PixelFormat.RGBA_ETC1) {
            format = PixelFormat.RGB_ETC1;
        } else if (format === PixelFormat.RGB_A_PVRTC_4BPPV1) {
            format = PixelFormat.RGB_PVRTC_4BPPV1;
        } else if (format === PixelFormat.RGB_A_PVRTC_2BPPV1) {
            format = PixelFormat.RGB_PVRTC_2BPPV1;
        }
        return format as unknown as Format;
    }
}

cclegacy.TextureBase = TextureBase;
