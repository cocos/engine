/*
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

// @ts-check
import { ccclass, override } from 'cc.decorator';
import { EDITOR, ALIPAY, XIAOMI, JSB, TEST, TAOBAO, TAOBAO_MINIGAME, WECHAT_MINI_PROGRAM, BYTEDANCE } from 'internal:constants';
import { Device, Format, FormatFeatureBit, deviceManager } from '../../gfx';
import { Asset } from './asset';
import { PixelFormat } from './asset-enum';
import { warnID, macro, sys, cclegacy, warn } from '../../core';
import { ccwindow } from '../../core/global-exports';
import { Enum } from '../../core/value-types/enum';

// Compress mipmap constants
const COMPRESSED_HEADER_LENGTH = 4;
const COMPRESSED_MIPMAP_DATA_SIZE_LENGTH = 4;
const COMPRESSED_MIPMAP_LEVEL_COUNT_LENGTH = 4;
const COMPRESSED_MIPMAP_MAGIC = 0x50494d43;

export const compressType = Enum({
    PVR: 0,
    PKM: 1,
    ASTC: 2,
});

// PVR constants //
// https://github.com/toji/texture-tester/blob/master/js/webgl-texture-util.js#L424
const PVR_HEADER_LENGTH = 13; // The header length in 32 bit ints.
const PVR_MAGIC = 0x03525650; // 0x50565203;

// Offsets into the header array.
const PVR_HEADER_MAGIC = 0;
const PVR_HEADER_FORMAT = 2;
const PVR_HEADER_HEIGHT = 6;
const PVR_HEADER_WIDTH = 7;
const PVR_HEADER_MIPMAPCOUNT = 11;
const PVR_HEADER_METADATA = 12;

// ETC constants //
const ETC_PKM_HEADER_LENGTH = 16;

const ETC_PKM_FORMAT_OFFSET = 6;
const ETC_PKM_ENCODED_WIDTH_OFFSET = 8;
const ETC_PKM_ENCODED_HEIGHT_OFFSET = 10;
const ETC_PKM_WIDTH_OFFSET = 12;
const ETC_PKM_HEIGHT_OFFSET = 14;

const ETC1_RGB_NO_MIPMAPS = 0;
const ETC2_RGB_NO_MIPMAPS = 1;
const ETC2_RGBA_NO_MIPMAPS = 3;

//= ==============//
// ASTC constants //
//= ==============//

// struct astc_header
// {
//  uint8_t magic[4];
//  uint8_t blockdim_x;
//  uint8_t blockdim_y;
//  uint8_t blockdim_z;
//  uint8_t xsize[3]; // x-size = xsize[0] + xsize[1] + xsize[2]
//  uint8_t ysize[3]; // x-size, y-size and z-size are given in texels;
//  uint8_t zsize[3]; // block count is inferred
// };
const ASTC_MAGIC = 0x5CA1AB13;

const ASTC_HEADER_LENGTH = 16; // The header length
const ASTC_HEADER_MAGIC = 4;
const ASTC_HEADER_BLOCKDIM = 3;

const ASTC_HEADER_SIZE_X_BEGIN = 7;
const ASTC_HEADER_SIZE_Y_BEGIN = 10;
const ASTC_HEADER_SIZE_Z_BEGIN = 13;

function getASTCFormat (xdim, ydim): PixelFormat {
    if (xdim === 4) {
        return PixelFormat.RGBA_ASTC_4x4;
    } if (xdim === 5) {
        if (ydim === 4) {
            return PixelFormat.RGBA_ASTC_5x4;
        }
        return PixelFormat.RGBA_ASTC_5x5;
    } if (xdim === 6) {
        if (ydim === 5) {
            return PixelFormat.RGBA_ASTC_6x5;
        }
        return PixelFormat.RGBA_ASTC_6x6;
    } if (xdim === 8) {
        if (ydim === 5) {
            return PixelFormat.RGBA_ASTC_8x5;
        } if (ydim === 6) {
            return PixelFormat.RGBA_ASTC_8x6;
        }
        return PixelFormat.RGBA_ASTC_8x8;
    } if (xdim === 10) {
        if (ydim === 5) {
            return PixelFormat.RGBA_ASTC_10x5;
        } if (ydim === 6) {
            return PixelFormat.RGBA_ASTC_10x6;
        } if (ydim === 8) {
            return PixelFormat.RGBA_ASTC_10x8;
        }
        return PixelFormat.RGBA_ASTC_10x10;
    }
    if (ydim === 10) {
        return PixelFormat.RGBA_ASTC_12x10;
    }
    return PixelFormat.RGBA_ASTC_12x12;
}

function readBEUint16 (header, offset: number): number {
    return (header[offset] << 8) | header[offset + 1];
}

/**
 * @en Image source in memory
 * @zh 内存图像源。
 */
export interface IMemoryImageSource {
    _data: ArrayBufferView | null;
    _compressed: boolean;
    width: number;
    height: number;
    format: number;
    mipmapLevelDataSize?: number[];
}

/**
 * @en The image source, can be HTML canvas, image type or image in memory data
 * @zh 图像资源的原始图像源。可以来源于 HTML 元素也可以来源于内存。
 */
export type ImageSource = HTMLCanvasElement | HTMLImageElement | IMemoryImageSource | ImageBitmap;

function isImageBitmap (imageSource: any): imageSource is ImageBitmap {
    return !!(sys.hasFeature(sys.Feature.IMAGE_BITMAP) && imageSource instanceof ImageBitmap);
}

function fetchImageSource (imageSource: ImageSource): HTMLCanvasElement | HTMLImageElement | ImageBitmap | ArrayBufferView | null {
    return '_data' in imageSource ? imageSource._data : imageSource;
}

// 返回该图像源是否是平台提供的图像对象。
function isNativeImage (imageSource: ImageSource): imageSource is (HTMLImageElement | HTMLCanvasElement | ImageBitmap) {
    if (ALIPAY || TAOBAO || TAOBAO_MINIGAME || XIAOMI || WECHAT_MINI_PROGRAM || BYTEDANCE) {
        // We're unable to grab the constructors of Alipay native image or canvas object.
        return !('_data' in imageSource);
    }
    if (JSB && (imageSource as IMemoryImageSource)._compressed === true) {
        return false;
    }

    return imageSource instanceof HTMLImageElement || imageSource instanceof HTMLCanvasElement || isImageBitmap(imageSource);
}

/**
 * @en Image Asset. The image resource stores the raw data of the image and you can use this resource to create any Texture resource.
 * @zh 图像资源。图像资源存储了图像的原始数据，你可以使用此资源来创建任意 [[TextureBase]] 资源。
 */
@ccclass('cc.ImageAsset')
export class ImageAsset extends Asset {
    /**
     * mergeCompressedTextureMips
     * ************* hearder ***************
     * COMPRESSED_MAGIC: 0x50494d43        *
     * ************* document **************
     * chunkCount: n                       *
     * chunkDataSize[0]: xxx               *
     * ...                                 *
     * chunkDataSize[n - 1]: xxx           *
     * ************* chunks ****************
     *    ******************************   *
     *    *                            *   *
     *    *          chunk[0]          *   *
     *    *                            *   *
     *    ******************************   *
     * ...
     *    ******************************   *
     *    *                            *   *
     *    *          chunk[n - 1]      *   *
     *    *                            *   *
     *    ******************************   *
     * *************************************
     * @param files @zh 压缩纹理数组。 @en Compressed Texture Arrays.
     * @returns out @zh 合并后的压缩纹理数据。 @en Merged compressed texture data.
     */
    public static mergeCompressedTextureMips (files: ArrayBuffer[] | ArrayBufferView[]): Uint8Array {
        let out = new Uint8Array(0);

        let err: Error | null = null;
        try {
            // Create compressed file
            // file header length
            const fileHeaderLength = COMPRESSED_HEADER_LENGTH + COMPRESSED_MIPMAP_LEVEL_COUNT_LENGTH + files.length * COMPRESSED_MIPMAP_DATA_SIZE_LENGTH;
            let fileLength = 0;
            for (const file of files) {
                fileLength += file.byteLength;
            }
            fileLength += fileHeaderLength;   // add file header length
            out = new Uint8Array(fileLength);
            const outView = new DataView(
                out.buffer,
                out.byteOffset,
                out.byteLength,
            );

            // Append compresssed header
            outView.setUint32(0, COMPRESSED_MIPMAP_MAGIC, true); // add magic
            outView.setUint32(COMPRESSED_HEADER_LENGTH, files.length, true); // add count number
            let dataOffset = fileHeaderLength;
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                outView.setUint32(
                    COMPRESSED_HEADER_LENGTH + COMPRESSED_MIPMAP_LEVEL_COUNT_LENGTH + i * COMPRESSED_MIPMAP_DATA_SIZE_LENGTH,
                    file.byteLength,
                    true,
                ); //add file data size

                // Append compresssed file
                if (file instanceof ArrayBuffer) {
                    const srcArray = new Uint8Array(file);
                    out.set(srcArray, dataOffset);
                } else {
                    const srcArray = new Uint8Array(file.buffer, file.byteOffset, file.byteLength);
                    out.set(srcArray, dataOffset);
                }
                dataOffset += file.byteLength;
            }
        } catch (e) {
            err = e as Error;
            warn(err);
        }

        return out;
    }

    /**
     * @param file 解析压缩纹理。
     * @param type 压缩纹理类型。
     * @engineInternal
     * @mangle
     */
    public static parseCompressedTextures (file: ArrayBuffer | ArrayBufferView, type: number): IMemoryImageSource {
        const out: IMemoryImageSource = {
            _data: new Uint8Array(0),
            _compressed: true,
            width: 0,
            height: 0,
            format: 0,
            mipmapLevelDataSize: [],
        };

        const buffer = file instanceof ArrayBuffer ? file : file.buffer;
        const bufferView = new DataView(buffer);
        // Get a view of the arrayBuffer that represents compress header.
        const magicNumber = bufferView.getUint32(0, true);
        // Do some sanity checks to make sure this is a valid compress file.
        if (magicNumber === COMPRESSED_MIPMAP_MAGIC) {
            // Get a view of the arrayBuffer that represents compress document.
            const mipmapLevelNumber = bufferView.getUint32(COMPRESSED_HEADER_LENGTH, true);
            const mipmapLevelDataSize = bufferView.getUint32(COMPRESSED_HEADER_LENGTH + COMPRESSED_MIPMAP_LEVEL_COUNT_LENGTH, true);
            const fileHeaderByteLength = COMPRESSED_HEADER_LENGTH + COMPRESSED_MIPMAP_LEVEL_COUNT_LENGTH
                + mipmapLevelNumber * COMPRESSED_MIPMAP_DATA_SIZE_LENGTH;

            // Get a view of the arrayBuffer that represents compress chunks.
            ImageAsset.parseCompressedTexture(file, 0, fileHeaderByteLength, mipmapLevelDataSize, type, out);
            let beginOffset = fileHeaderByteLength + mipmapLevelDataSize;

            for (let i = 1; i < mipmapLevelNumber; i++) {
                const endOffset = bufferView.getUint32(COMPRESSED_HEADER_LENGTH + COMPRESSED_MIPMAP_LEVEL_COUNT_LENGTH
                    +  i * COMPRESSED_MIPMAP_DATA_SIZE_LENGTH, true);
                ImageAsset.parseCompressedTexture(file, i, beginOffset, endOffset, type, out);
                beginOffset += endOffset;
            }
        } else {
            ImageAsset.parseCompressedTexture(file, 0, 0, 0, type, out);
        }
        return out;
    }

    /**
     * @zh 解析压缩纹理。
     * @param file @zh 压缩纹理原始数据。
     * @param levelIndex @zh 当前 mipmap 层级。
     * @param beginOffset @zh 压缩纹理开始时的偏移。
     * @param endOffset @zh 压缩纹理结束时的偏移。
     * @param type @zh 压缩纹理类型。
     * @param out @zh 压缩纹理输出。
     * @engineInternal
     * @mangle
     */
    public static parseCompressedTexture (
        file: ArrayBuffer | ArrayBufferView,
        levelIndex: number,
        beginOffset: number,
        endOffset: number,
        type: number,
        out: IMemoryImageSource,
    ): void {
        switch (type) {
        case compressType.PVR:
            ImageAsset.parsePVRTexture(file, levelIndex, beginOffset, endOffset, out);
            break;
        case compressType.PKM:
            ImageAsset.parsePKMTexture(file, levelIndex, beginOffset, endOffset, out);
            break;
        case compressType.ASTC:
            ImageAsset.parseASTCTexture(file, levelIndex, beginOffset, endOffset, out);
            break;
        default:
            break;
        }
    }

    /**
     * @zh 解析 PVR 格式的压缩纹理。
     * @param file @zh 压缩纹理原始数据。
     * @param levelIndex @zh 当前 mipmap 层级。
     * @param beginOffset @zh 压缩纹理开始时的偏移。
     * @param endOffset @zh 压缩纹理结束时的偏移。
     * @param out @zh 压缩纹理输出。
     * @engineInternal
     * @mangle
     */
    public static parsePVRTexture (
        file: ArrayBuffer | ArrayBufferView,
        levelIndex: number,
        beginOffset: number,
        endOffset: number,
        out: IMemoryImageSource,
    ): void {
        const buffer = file instanceof ArrayBuffer ? file : file.buffer;
        // Get a view of the arrayBuffer that represents the DDS header.
        const header = new Int32Array(buffer, beginOffset, PVR_HEADER_LENGTH);

        // Do some sanity checks to make sure this is a valid DDS file.
        if (header[PVR_HEADER_MAGIC] === PVR_MAGIC) {
            // Gather other basic metrics and a view of the raw the DXT data.
            const byteOffset = beginOffset + header[PVR_HEADER_METADATA] + 52;
            const length = endOffset - header.byteLength;
            if (endOffset > 0) {
                const srcView = new Uint8Array(buffer, byteOffset, length);
                const dstView = new Uint8Array(out._data!.byteLength + srcView.byteLength);
                dstView.set(out._data as Uint8Array);
                dstView.set(srcView, out._data!.byteLength);
                out._data  = dstView;
                out.mipmapLevelDataSize![levelIndex] = length;
            } else {
                out._data = new Uint8Array(buffer, byteOffset);
            }
            out.width = levelIndex > 0 ? out.width : header[PVR_HEADER_WIDTH];
            out.height = levelIndex > 0 ? out.height : header[PVR_HEADER_HEIGHT];
        } else if (header[11] === 0x21525650) {
            const byteOffset = beginOffset + header[0];
            const length = endOffset - header.byteLength;
            if (endOffset > 0) {
                const srcView = new Uint8Array(buffer, byteOffset, length);
                const dstView = new Uint8Array(out._data!.byteLength + srcView.byteLength);
                dstView.set(out._data as Uint8Array);
                dstView.set(srcView, out._data!.byteLength);
                out._data  = dstView;
                out.mipmapLevelDataSize![levelIndex] = length;
            } else {
                out._data  = new Uint8Array(buffer, byteOffset);
            }
            out.width = levelIndex > 0 ? out.width : header[1];
            out.height = levelIndex > 0 ? out.height : header[2];
        } else {
            throw new Error('Invalid magic number in PVR header');
        }
    }

    /**
     * @zh 解析 PKM 格式的压缩纹理。
     * @param file @zh 压缩纹理原始数据。
     * @param levelIndex @zh 当前 mipmap 层级。
     * @param beginOffset @zh 压缩纹理开始时的偏移。
     * @param endOffset @zh 压缩纹理结束时的偏移。
     * @param out @zh 压缩纹理输出。
     * @engineInternal
     * @mangle
     */
    public static parsePKMTexture (
        file: ArrayBuffer | ArrayBufferView,
        levelIndex: number,
        beginOffset: number,
        endOffset: number,
        out: IMemoryImageSource,
    ): void {
        const buffer = file instanceof ArrayBuffer ? file : file.buffer;
        const header = new Uint8Array(buffer, beginOffset, ETC_PKM_HEADER_LENGTH);
        const format = readBEUint16(header, ETC_PKM_FORMAT_OFFSET);
        if (format !== ETC1_RGB_NO_MIPMAPS && format !== ETC2_RGB_NO_MIPMAPS && format !== ETC2_RGBA_NO_MIPMAPS) {
            throw new Error('Invalid magic number in ETC header');
        }

        const byteOffset = beginOffset + ETC_PKM_HEADER_LENGTH;
        const length = endOffset - ETC_PKM_HEADER_LENGTH;
        if (endOffset > 0) {
            const srcView = new Uint8Array(buffer, byteOffset, length);
            const dstView = new Uint8Array(out._data!.byteLength + srcView.byteLength);
            dstView.set(out._data as Uint8Array);
            dstView.set(srcView, out._data!.byteLength);
            out._data  = dstView;
            out.mipmapLevelDataSize![levelIndex] = length;
        } else {
            out._data = new Uint8Array(buffer, byteOffset);
        }
        out.width = levelIndex > 0 ? out.width : readBEUint16(header, ETC_PKM_WIDTH_OFFSET);
        out.height = levelIndex > 0 ? out.height : readBEUint16(header, ETC_PKM_HEIGHT_OFFSET);
    }

    /**
     * @zh 解析 ASTC 格式的压缩纹理。
     * @param file @zh 压缩纹理原始数据。
     * @param levelIndex @zh 当前 mipmap 层级。
     * @param beginOffset @zh 压缩纹理开始时的偏移。
     * @param endOffset @zh 压缩纹理结束时的偏移。
     * @param out @zh 压缩纹理输出。
     * @engineInternal
     * @mangle
     */
    public static parseASTCTexture (
        file: ArrayBuffer | ArrayBufferView,
        levelIndex: number,
        beginOffset: number,
        endOffset: number,
        out: IMemoryImageSource,
    ): void {
        const buffer = file instanceof ArrayBuffer ? file : file.buffer;
        const header = new Uint8Array(buffer, beginOffset, ASTC_HEADER_LENGTH);

        const magicval = header[0] + (header[1] << 8) + (header[2] << 16) + (header[3] << 24);
        if (magicval !== ASTC_MAGIC) {
            throw new Error('Invalid magic number in ASTC header');
        }

        const xdim = header[ASTC_HEADER_MAGIC];
        const ydim = header[ASTC_HEADER_MAGIC + 1];
        const zdim = header[ASTC_HEADER_MAGIC + 2];
        if ((xdim < 3 || xdim > 6 || ydim < 3 || ydim > 6 || zdim < 3 || zdim > 6)
                && (xdim < 4 || xdim === 7 || xdim === 9 || xdim === 11 || xdim > 12
                || ydim < 4 || ydim === 7 || ydim === 9 || ydim === 11 || ydim > 12 || zdim !== 1)) {
            throw new Error('Invalid block number in ASTC header');
        }

        const format = getASTCFormat(xdim, ydim);
        const byteOffset = beginOffset + ASTC_HEADER_LENGTH;
        const length = endOffset - ASTC_HEADER_LENGTH;
        if (endOffset > 0) {
            const srcView = new Uint8Array(buffer, byteOffset, length);
            const dstView = new Uint8Array(out._data!.byteLength + srcView.byteLength);
            dstView.set(out._data as Uint8Array);
            dstView.set(srcView, out._data!.byteLength);
            out._data  = dstView;
            out.mipmapLevelDataSize![levelIndex] = length;
        } else {
            out._data = new Uint8Array(buffer, byteOffset);
        }
        out.width = levelIndex > 0 ? out.width : header[ASTC_HEADER_SIZE_X_BEGIN] + (header[ASTC_HEADER_SIZE_X_BEGIN + 1] << 8)
                + (header[ASTC_HEADER_SIZE_X_BEGIN + 2] << 16);
        out.height = levelIndex > 0 ? out.height : header[ASTC_HEADER_SIZE_Y_BEGIN] + (header[ASTC_HEADER_SIZE_Y_BEGIN + 1] << 8)
                + (header[ASTC_HEADER_SIZE_Y_BEGIN + 2] << 16);
        out.format = format;
    }

    /**
     * @en extract the first mipmap from a compressed image asset
     * @engineInternal
     * @mangle
     */
    public extractMipmap0 (): ImageAsset {
        if (this.mipmapLevelDataSize && this.mipmapLevelDataSize.length > 0) {
            const mipmapSize = this.mipmapLevelDataSize[0];
            const data = this.data as Uint8Array;

            const dataView = new Uint8Array(data.buffer, 0, mipmapSize);
            const mipmap = new ImageAsset({
                _data: dataView,
                _compressed: true,
                width: this.width,
                height: this.height,
                format: this.format,
                mipmapLevelDataSize: [],
            });
            mipmap._uuid = `${this._uuid}`;
            return mipmap;
        } else {
            return this;
        }
    }

    /**
     * @en extract mipmaps from a compressed image asset
     * @engineInternal
     * @mangle
     */
    public extractMipmaps (): ImageAsset[] {
        const images: ImageAsset[] = [];
        if (this.mipmapLevelDataSize && this.mipmapLevelDataSize.length > 0) {
            const mipmapLevelDataSize = this.mipmapLevelDataSize;
            const data: Uint8Array = this.data as Uint8Array;

            let byteOffset = 0;
            let height = this.height;
            let width = this.width;
            for (const mipmapSize of mipmapLevelDataSize) {
                const dataView = new Uint8Array(data.buffer, byteOffset, mipmapSize);
                const mipmap = new ImageAsset({
                    _data: dataView,
                    _compressed: true,
                    width,
                    height,
                    format: this.format,
                    mipmapLevelDataSize: [],
                });
                byteOffset += mipmapSize;
                mipmap._uuid = `${this._uuid}`;
                width = Math.max(width >> 1, 1);
                height = Math.max(height >> 1, 1);
                images.push(mipmap);
            }
        } else {
            images.push(this);
        }

        return images;
    }

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    @override
    get _nativeAsset (): any {
        // Maybe returned to pool in webgl.
        return this._nativeData;
    }
    // TODO: Property 'format' does not exist on type 'ImageBitmap'
    // set _nativeAsset (value: ImageSource) {
    set _nativeAsset (value: any) {
        if (!(value instanceof HTMLElement) && !isImageBitmap(value)) {
            value.format = value.format || this._format;
        }
        this.reset(value as ImageSource);
    }

    /**
     * @en Image data.
     * @zh 此图像资源的图像数据。
     */
    get data (): ArrayBufferView | HTMLCanvasElement | HTMLImageElement | ImageBitmap | null {
        if (isNativeImage(this._nativeData)) {
            return this._nativeData;
        }

        return this._nativeData && this._nativeData._data;
    }

    /**
     * @en The pixel width of the image.
     * @zh 此图像资源的像素宽度。
     */
    get width (): number {
        return this._nativeData.width || this._width;
    }

    /**
     * @en The pixel height of the image.
     * @zh 此图像资源的像素高度。
     */
    get height (): number {
        return this._nativeData.height || this._height;
    }

    /**
     * @en The pixel format of the image.
     * @zh 此图像资源的像素格式。
     */
    get format (): PixelFormat {
        return this._format;
    }

    /**
     * @en Whether the image is in compressed texture format.
     * @zh 此图像资源是否为压缩像素格式。
     */
    get isCompressed (): boolean {
        return (this._format >= PixelFormat.RGB_ETC1 && this._format <= PixelFormat.RGBA_ASTC_12x12)
        || (this._format >= PixelFormat.RGB_A_PVRTC_2BPPV1 && this._format <= PixelFormat.RGBA_ETC1);
    }

    /**
     * @en If this image resource is a mipmap, get the data size of each layer
     * @zh 此图像资源是 mipmap 时，获取每层数据大小。
     * @engineInternal
     */
    get mipmapLevelDataSize (): number[] | undefined {
        return (this._nativeData as IMemoryImageSource).mipmapLevelDataSize;
    }

    /**
     * @en The original source image URL, it could be empty.
     * @zh 此图像资源的原始图像源的 URL。当原始图像元不是 HTML 文件时可能为空。
     * @deprecated Please use [[nativeUrl]]
     */
    get url (): string {
        return this.nativeUrl;
    }

    private static extnames = ['.png', '.jpg', '.jpeg', '.bmp', '.webp', '.pvr', '.pkm', '.astc'];

    private _nativeData: ImageSource;

    //NOTE: _exportedExts is used by editor, should not rename or mangle it.
    private _exportedExts: string[] | null | undefined = undefined;

    private _format: PixelFormat = PixelFormat.RGBA8888;

    private _width = 0;

    private _height = 0;

    constructor (nativeAsset?: ImageSource) {
        super();

        this._nativeData = {
            _data: null,
            width: 0,
            height: 0,
            format: 0,
            _compressed: false,
            mipmapLevelDataSize: [],
        };

        if (EDITOR) {
            this._exportedExts = null;
        }

        if (nativeAsset !== undefined) {
            this.reset(nativeAsset);
        }
    }

    /**
     * @en Reset the source of the image asset.
     * @zh 重置此图像资源使用的原始图像源。
     * @param data @en The new source. @zh 新的图片数据源。
     */
    public reset (data: ImageSource): void {
        if (isImageBitmap(data)) {
            this._nativeData = data;
        } else if (!(data instanceof HTMLElement)) {
            // this._nativeData = Object.create(data);
            this._nativeData = data;
            this._format = data.format;
        } else {
            this._nativeData = data;
        }
    }

    public destroy (): boolean {
        if (this.data && this.data instanceof HTMLImageElement) {
            this.data.src = '';
            this._setRawAsset('');
            // JSB element should destroy native data.
            // TODO: Property 'destroy' does not exist on type 'HTMLImageElement'.
            // maybe we need a higher level implementation called `pal/image`, we provide `destroy` interface here.
            // issue: https://github.com/cocos/cocos-engine/issues/14646
            if (JSB) (this.data as any).destroy();
        } else if (isImageBitmap(this.data)) {
            this.data?.close();
        }
        return super.destroy();
    }

    // SERIALIZATION

    /**
     * @engineInternal
     */
    // eslint-disable-next-line consistent-return
    public _serialize (): string | {
        fmt: string;
        w: number;
        h: number;
    } | undefined {
        if (EDITOR || TEST) {
            let targetExtensions = this._exportedExts;
            if (!targetExtensions && this._native) {
                targetExtensions = [this._native];
            }

            if (!targetExtensions) {
                return '';
            }

            const extensionIndices: string[] = [];
            for (const targetExtension of targetExtensions) {
                const extensionFormat = targetExtension.split('@');
                const i = ImageAsset.extnames.indexOf(extensionFormat[0]);
                let exportedExtensionID = i < 0 ? targetExtension : `${i}`;
                if (extensionFormat[1]) {
                    exportedExtensionID += `@${extensionFormat[1]}`;
                }
                extensionIndices.push(exportedExtensionID);
            }
            return { fmt: extensionIndices.join('_'), w: this.width, h: this.height };
        }
    }

    /**
     * @engineInternal
     */
    public _deserialize (data: any): void {
        let fmtStr = '';
        if (typeof data === 'string') {
            fmtStr = data;
        } else {
            this._width = data.w;
            this._height = data.h;
            fmtStr = data.fmt;
        }
        const device = _getGlobalDevice();
        const extensionIDs = fmtStr.split('_');

        let preferedExtensionIndex = Number.MAX_VALUE;
        let format = this._format;
        let ext = '';
        const SupportTextureFormats = macro.SUPPORT_TEXTURE_FORMATS;
        for (const extensionID of extensionIDs) {
            const extFormat = extensionID.split('@');

            const i = parseInt(extFormat[0], undefined);
            const tmpExt = ImageAsset.extnames[i] || extFormat[0];

            const index = SupportTextureFormats.indexOf(tmpExt);
            if (index !== -1 && index < preferedExtensionIndex) {
                const fmt = extFormat[1] ? parseInt(extFormat[1]) : this._format;
                // check whether or not support compressed texture
                if (tmpExt === '.astc' && (!device || !(device.getFormatFeatures(Format.ASTC_RGBA_4X4) & FormatFeatureBit.SAMPLED_TEXTURE))) {
                    continue;
                } else if (tmpExt === '.pvr' && (!device || !(device.getFormatFeatures(Format.PVRTC_RGBA4) & FormatFeatureBit.SAMPLED_TEXTURE))) {
                    continue;
                } else if ((fmt === PixelFormat.RGB_ETC1 || fmt === PixelFormat.RGBA_ETC1)
                    && (!device || !(device.getFormatFeatures(Format.ETC_RGB8) & FormatFeatureBit.SAMPLED_TEXTURE))) {
                    continue;
                } else if ((fmt === PixelFormat.RGB_ETC2 || fmt === PixelFormat.RGBA_ETC2)
                    && (!device || !(device.getFormatFeatures(Format.ETC2_RGB8) & FormatFeatureBit.SAMPLED_TEXTURE))) {
                    continue;
                } else if (tmpExt === '.webp' && !sys.hasFeature(sys.Feature.WEBP)) {
                    continue;
                }
                preferedExtensionIndex = index;
                ext = tmpExt;
                format = fmt;
            }
        }

        if (ext) {
            this._setRawAsset(ext);
            this._format = format;
        } else {
            warnID(3121);
        }
    }

    private static _sharedPlaceHolderCanvas: HTMLCanvasElement | null = null;

    public initDefault (uuid?: string): void {
        super.initDefault(uuid);
        if (!ImageAsset._sharedPlaceHolderCanvas) {
            const canvas = ccwindow.document.createElement('canvas');
            const context = canvas.getContext('2d')!;
            const l = canvas.width = canvas.height = 2;
            context.fillStyle = '#ff00ff';
            context.fillRect(0, 0, l, l);
            this.reset(canvas);
            ImageAsset._sharedPlaceHolderCanvas = canvas;
        } else {
            this.reset(ImageAsset._sharedPlaceHolderCanvas);
        }
    }

    public validate (): boolean {
        return !!this.data;
    }
}

function _getGlobalDevice (): Device | null {
    return deviceManager.gfxDevice;
}
cclegacy.ImageAsset = ImageAsset;
