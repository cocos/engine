/*
 Copyright (c) 2011 Devon Govett
 Copyright (c) 2008-2010 Ricardo Quesada
 Copyright (c) 2011-2012 cocos2d-x.org
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.

 http://www.cocos2d-x.org

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

import { getError } from '../core';
import  zlib  from '../../external/compression/zlib.min';

interface PNGAnimationFrame {
    width: number;
    height: number;
    xOffset: number;
    yOffset: number;
    delay: number;
    disposeOp: number;
    blendOp: number;
    data: number[];
}

interface PNGTransparency {
    indexed?: number[];
    rgb?: number[];
    grayscale?: number;
}

/**
 * A png file reader
 * @name PNGReader
 * @mangle
 */
export class PNGReader {
    private declare data: Uint8Array | number[];
    private pos = 8;
    private palette: ArrayLike<number> = [];
    private imgData: Uint8Array | number[] = [];
    private transparency: PNGTransparency = {
        indexed: [],
        rgb: [],
        grayscale: 0,
    };
    private declare animation: {
        numFrames: number;
        numPlays: number;
        frames: PNGAnimationFrame[],
    };
    private text = {};
    private width = 0;
    private height = 0;
    private bits = 0;
    private colorType = 0;
    private compressionMethod = 0;
    private filterMethod = 0;
    private interlaceMethod = 0;
    private colors: number | undefined = 0;
    private hasAlphaChannel = false;
    private pixelBitlength = 0;
    private declare colorSpace: string | undefined;
    private _decodedPalette: Uint8Array | null = null;

    constructor (data: number[]) {
        const thisData = this.data = data;

        let frame: PNGAnimationFrame | undefined;
        let chunkSize = 0;

        while (true) {
            chunkSize = this.readUInt32();
            const section: string = (((): string[] => {
                const results: string[] = [];
                for (let _i = 0; _i < 4; ++_i) {
                    results.push(String.fromCharCode(thisData[this.pos++]));
                }
                return results;
            }).call(this)).join('');

            switch (section) {
            case 'IHDR':
            {
                this.width = this.readUInt32();
                this.height = this.readUInt32();
                this.bits = thisData[this.pos++];
                this.colorType = thisData[this.pos++];
                this.compressionMethod = thisData[this.pos++];
                this.filterMethod = thisData[this.pos++];
                this.interlaceMethod = thisData[this.pos++];
                break;
            }
            case 'acTL':
                this.animation = {
                    numFrames: this.readUInt32(),
                    numPlays: this.readUInt32() || Infinity,
                    frames: [],
                };
                break;
            case 'PLTE':
                this.palette = this.read(chunkSize);
                break;
            case 'fcTL':
            {
                if (frame) {
                    this.animation.frames.push(frame);
                }
                this.pos += 4;
                frame = {
                    width: this.readUInt32(),
                    height: this.readUInt32(),
                    xOffset: this.readUInt32(),
                    yOffset: this.readUInt32(),
                    delay: 0,
                    disposeOp: 0,
                    blendOp: 0,
                    data: [],
                };
                const delayNum = this.readUInt16();
                const delayDen = this.readUInt16() || 100;
                frame.delay = 1000 * delayNum / delayDen;
                frame.disposeOp = thisData[this.pos++];
                frame.blendOp = thisData[this.pos++];
                break;
            }
            case 'IDAT':
            case 'fdAT':
            {
                if (section === 'fdAT') {
                    this.pos += 4;
                    chunkSize -= 4;
                }
                // FIXME(cjh): Remove 'as number[]' since this.imgData is possible to be Uint8Array
                data = (frame != null ? frame.data : undefined) || this.imgData as number[];
                for (let _i = 0; chunkSize >= 0 ? _i < chunkSize : _i > chunkSize; chunkSize >= 0 ? ++_i : --_i) {
                    data.push(thisData[this.pos++]);
                }
                break;
            }
            case 'tRNS':
                this.transparency = {};
                switch (this.colorType) {
                case 3:
                {
                    this.transparency.indexed = this.read(chunkSize);
                    const ccshort = 255 - this.transparency.indexed.length;
                    if (ccshort > 0) {
                        for (let _j = 0; ccshort >= 0 ? _j < ccshort : _j > ccshort; ccshort >= 0 ? ++_j : --_j) {
                            this.transparency.indexed.push(255);
                        }
                    }
                    break;
                }
                case 0:
                    this.transparency.grayscale = this.read(chunkSize)[0];
                    break;
                case 2:
                    this.transparency.rgb = this.read(chunkSize);
                    break;
                default:
                    break;
                }
                break;
            case 'tEXt':
            {
                const text = this.read(chunkSize);
                const index = text.indexOf(0);
                const key = String.fromCharCode.apply(String, text.slice(0, index));
                this.text[key] = String.fromCharCode.apply(String, text.slice(index + 1));
                break;
            }
            case 'IEND':
            {
                if (frame) {
                    this.animation.frames.push(frame);
                }
                this.colors = ((): number | undefined => {
                    switch (this.colorType) {
                    case 0:
                    case 3:
                    case 4:
                        return 1;
                    case 2:
                    case 6:
                        return 3;
                    default:
                        return undefined;
                    }
                }).call(this);
                const _ref = this.colorType;
                this.hasAlphaChannel = _ref === 4 || _ref === 6;
                const colors = this.colors! + (this.hasAlphaChannel ? 1 : 0);
                this.pixelBitlength = this.bits * colors;
                this.colorSpace = ((): string | undefined => {
                    switch (this.colors) {
                    case 1:
                        return 'DeviceGray';
                    case 3:
                        return 'DeviceRGB';
                    default:
                        return undefined;
                    }
                }).call(this);
                if (!(this.imgData instanceof Uint8Array)) {
                    this.imgData = new Uint8Array(this.imgData);
                }
                return;
            }
            default:
                this.pos += chunkSize;
            }
            this.pos += 4;
            if (this.pos > thisData.length) {
                throw new Error(getError(6017));
            }
        }
    }

    public read (bytes: number): number[] {
        let i = 0;
        let _i = 0;
        const _results: number[] = [];
        for (i = _i = 0; bytes >= 0 ? _i < bytes : _i > bytes; i = bytes >= 0 ? ++_i : --_i) {
            _results.push(this.data[this.pos++]);
        }
        return _results;
    }

    public readUInt32 (): number {
        const data = this.data;
        const b1 = data[this.pos++] << 24;
        const b2 = data[this.pos++] << 16;
        const b3 = data[this.pos++] << 8;
        const b4 = data[this.pos++];
        return b1 | b2 | b3 | b4;
    }

    public readUInt16 (): number {
        const b1 = this.data[this.pos++] << 8;
        const b2 = this.data[this.pos++];
        return b1 | b2;
    }

    public decodePixels (data: Uint8Array | number[] | null): Uint8Array {
        if (data == null) {
            data = this.imgData;
        }
        if (data.length === 0) {
            return new Uint8Array(0);
        }
        const inflate = new zlib.Inflate(data, { index: 0, verify: false });
        data = inflate.decompress() as Uint8Array;
        const pixelBytes = this.pixelBitlength / 8;
        const scanlineLength = pixelBytes * this.width;
        const pixels = new Uint8Array(scanlineLength * this.height);
        const length = data.length;
        let row = 0;
        let pos = 0;
        let c = 0;
        let ccbyte = 0;
        let col = 0;
        let i = 0;
        let _i = 0;
        let _j = 0;
        let _k = 0;
        let _l = 0;
        let _m = 0;
        let left = 0;
        let p = 0;
        let pa = 0;
        let paeth = 0;
        let pb = 0;
        let pc = 0;
        let upper = 0;
        let upperLeft = 0;
        while (pos < length) {
            switch (data[pos++]) {
            case 0:
                for (i = _i = 0; _i < scanlineLength; i = _i += 1) {
                    pixels[c++] = data[pos++];
                }
                break;
            case 1:
                for (i = _j = 0; _j < scanlineLength; i = _j += 1) {
                    ccbyte = data[pos++];
                    left = i < pixelBytes ? 0 : pixels[c - pixelBytes];
                    pixels[c++] = (ccbyte + left) % 256;
                }
                break;
            case 2:
                for (i = _k = 0; _k < scanlineLength; i = _k += 1) {
                    ccbyte = data[pos++];
                    col = (i - (i % pixelBytes)) / pixelBytes;
                    upper = row && pixels[(row - 1) * scanlineLength + col * pixelBytes + (i % pixelBytes)];
                    pixels[c++] = (upper + ccbyte) % 256;
                }
                break;
            case 3:
                for (i = _l = 0; _l < scanlineLength; i = _l += 1) {
                    ccbyte = data[pos++];
                    col = (i - (i % pixelBytes)) / pixelBytes;
                    left = i < pixelBytes ? 0 : pixels[c - pixelBytes];
                    upper = row && pixels[(row - 1) * scanlineLength + col * pixelBytes + (i % pixelBytes)];
                    pixels[c++] = (ccbyte + Math.floor((left + upper) / 2)) % 256;
                }
                break;
            case 4:
                for (i = _m = 0; _m < scanlineLength; i = _m += 1) {
                    ccbyte = data[pos++];
                    col = (i - (i % pixelBytes)) / pixelBytes;
                    left = i < pixelBytes ? 0 : pixels[c - pixelBytes];
                    if (row === 0) {
                        upper = upperLeft = 0;
                    } else {
                        upper = pixels[(row - 1) * scanlineLength + col * pixelBytes + (i % pixelBytes)];
                        upperLeft = col && pixels[(row - 1) * scanlineLength + (col - 1) * pixelBytes + (i % pixelBytes)];
                    }
                    p = left + upper - upperLeft;
                    pa = Math.abs(p - left);
                    pb = Math.abs(p - upper);
                    pc = Math.abs(p - upperLeft);
                    if (pa <= pb && pa <= pc) {
                        paeth = left;
                    } else if (pb <= pc) {
                        paeth = upper;
                    } else {
                        paeth = upperLeft;
                    }
                    pixels[c++] = (ccbyte + paeth) % 256;
                }
                break;
            default:
                throw new Error(getError(6018, data[pos - 1]));
            }
            row++;
        }
        return pixels;
    }

    public copyToImageData (imageData: ImageData, pixels: Uint8Array): void {
        let alpha = this.hasAlphaChannel;
        let palette: Uint8Array | undefined;
        let colors = this.colors;
        if (this.palette.length) {
            palette = this._decodedPalette != null ? this._decodedPalette : this._decodedPalette = this.decodePalette();
            colors = 4;
            alpha = true;
        }
        const data = imageData.data || imageData;
        const length = data.length;
        const input = palette || pixels;
        let i = 0; let j = 0; let k = 0; let v = 0;
        if (colors === 1) {
            while (i < length) {
                k = palette ? pixels[i / 4] * 4 : j;
                v = input[k++];
                data[i++] = v;
                data[i++] = v;
                data[i++] = v;
                data[i++] = alpha ? input[k++] : 255;
                j = k;
            }
        } else {
            while (i < length) {
                k = palette ? pixels[i / 4] * 4 : j;
                data[i++] = input[k++];
                data[i++] = input[k++];
                data[i++] = input[k++];
                data[i++] = alpha ? input[k++] : 255;
                j = k;
            }
        }
    }

    decodePalette (): Uint8Array {
        const palette = this.palette;
        const transparency = this.transparency.indexed || [];
        const ret = new Uint8Array((transparency.length || 0) + palette.length);
        let pos = 0;
        let c = 0;
        let _ref1 = 0;
        for (let i = 0, _i = 0, _ref = palette.length; _i < _ref; i = _i += 3) {
            ret[pos++] = palette[i];
            ret[pos++] = palette[i + 1];
            ret[pos++] = palette[i + 2];
            _ref1 = transparency[c++];
            ret[pos++] = _ref1 != null ? _ref1 : 255;
        }
        return ret;
    }

    render (canvas: HTMLCanvasElement): void {
        canvas.width = this.width;
        canvas.height = this.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const data = ctx.createImageData(this.width, this.height);
        this.copyToImageData(data, this.decodePixels(null));
        ctx.putImageData(data, 0, 0);
    }
}
