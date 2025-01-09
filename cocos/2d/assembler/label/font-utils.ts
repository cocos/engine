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

import { FontAtlas, FontLetterDefinition } from '../../assets/bitmap-font';
import { Color, macro, warnID } from '../../../core';
import { ImageAsset, Texture2D } from '../../../asset/assets';
import { PixelFormat } from '../../../asset/assets/asset-enum';
import { BufferTextureCopy } from '../../../gfx';
import { safeMeasureText, BASELINE_RATIO, MIDDLE_RATIO, getBaselineOffset, getSymbolCodeAt } from '../../utils/text-utils';
import { director, DirectorEvent } from '../../../game/director';
import { ccwindow } from '../../../core/global-exports';
import { TextureBase } from '../../../asset/assets/texture-base';

export interface ISharedLabelData {
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D | null;
}

let _canvasPool: CanvasPool;

export class CanvasPool {
    static getInstance (): CanvasPool {
        if (!_canvasPool) {
            _canvasPool = new CanvasPool();
        }
        return _canvasPool;
    }
    public pool: ISharedLabelData[] = [];
    public get (): ISharedLabelData {
        let data = this.pool.pop();

        if (!data) {
            const canvas = ccwindow.document.createElement('canvas');
            const context = canvas.getContext('2d');
            data = {
                canvas,
                context,
            };
        }

        return data;
    }

    public put (canvas: ISharedLabelData): void {
        if (this.pool.length >= macro.MAX_LABEL_CANVAS_POOL_SIZE) {
            return;
        }
        this.pool.push(canvas);
    }
}

// export function packToDynamicAtlas(comp, frame) {
//     // TODO: Material API design and export from editor could affect the material activation process
//     // need to update the logic here
//     if (frame && !TEST) {
//         if (!frame._original && dynamicAtlasManager) {
//             let packedFrame = dynamicAtlasManager.insertSpriteFrame(frame);
//             if (packedFrame) {
//                 frame._setDynamicAtlasFrame(packedFrame);
//             }
//         }
//         if (comp.sharedMaterials[0].getProperty('texture') !== frame._texture) {
//             comp._activateMaterial();
//         }
//     }
// }

interface ILabelInfo {
    fontSize: number;
    lineHeight: number;
    hash: string;
    fontFamily: string;
    fontDesc: string;
    hAlign: number;
    vAlign: number;
    color: Color;
    isOutlined: boolean;
    out: Color;
    margin: number;
    fontScale: number;
}

const WHITE = Color.WHITE.clone();
const space = 0;
const bleed = 2;

const _backgroundStyle = `rgba(255, 255, 255, ${(1 / 255).toFixed(3)})`;
const BASELINE_OFFSET = getBaselineOffset();

class LetterTexture {
    public image: ImageAsset | null = null;
    public declare labelInfo: ILabelInfo;
    public declare char: string;
    public data: ISharedLabelData | null  = null;
    public canvas: HTMLCanvasElement | null = null;
    public context: CanvasRenderingContext2D | null = null;
    public width = 0;
    public height = 0;
    public offsetY = 0;
    public declare hash: string;
    constructor (char: string, labelInfo: ILabelInfo) {
        this.char = char;
        this.labelInfo = labelInfo;
        this.hash = `${getSymbolCodeAt(char, 0)}${labelInfo.hash}`;
    }

    public updateRenderData (): void {
        this._updateProperties();
        this._updateTexture();
    }

    public destroy (): void {
        this.image = null;
        // Label._canvasPool.put(this._data);
        CanvasPool.getInstance().put(this.data as ISharedLabelData);
    }

    private _updateProperties (): void {
        this.data = CanvasPool.getInstance().get();
        this.canvas = this.data.canvas;
        this.context = this.data.context;
        if (this.context) {
            const fontScale = this.labelInfo.fontScale;
            this.context.font = this.labelInfo.fontDesc;
            const width = safeMeasureText(this.context, this.char, this.labelInfo.fontDesc);
            const blank = this.labelInfo.margin * 2 + bleed;
            this.width = parseFloat(width.toFixed(2)) * fontScale + blank;
            this.height = (1 + BASELINE_RATIO) * this.labelInfo.fontSize * fontScale + blank;
            this.offsetY = -(this.labelInfo.fontSize * BASELINE_RATIO) * fontScale / 2;
        }

        if (this.canvas.width !== this.width) {
            this.canvas.width = this.width;
        }

        if (this.canvas.height !== this.height) {
            this.canvas.height = this.height;
        }

        if (!this.image) {
            this.image = new ImageAsset();
        }

        this.image.reset(this.canvas);
    }

    private _updateTexture (): void {
        if (!this.context || !this.canvas) {
            return;
        }

        const context = this.context;
        const labelInfo = this.labelInfo;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const fontScale = labelInfo.fontScale;

        context.textAlign = 'center';
        context.textBaseline = 'alphabetic';
        context.clearRect(0, 0, width, height);
        // Add a white background to avoid black edges.
        context.fillStyle = _backgroundStyle;
        context.fillRect(0, 0, width, height);
        context.font = labelInfo.fontDesc.replace(
            /(\d+)(\.\d+)?(px|em|rem|pt)/g,
            (w, m: string, n: string, u: string) => (+m * fontScale + (+n || 0) * fontScale).toString() + u,
        );

        const fontSize = labelInfo.fontSize * fontScale;
        const startX = width / 2;
        const startY = height / 2 + fontSize * MIDDLE_RATIO + fontSize * BASELINE_OFFSET;
        const color = labelInfo.color;
        // use round for line join to avoid sharp intersect point
        context.lineJoin = 'round';
        context.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${1})`;
        if (labelInfo.isOutlined) {
            const strokeColor = labelInfo.out || WHITE;
            context.strokeStyle = `rgba(${strokeColor.r}, ${strokeColor.g}, ${strokeColor.b}, ${strokeColor.a / 255})`;
            context.lineWidth = labelInfo.margin * 2 * fontScale;
            context.strokeText(this.char, startX, startY);
        }
        context.fillText(this.char, startX, startY);

        // this.texture.handleLoadedTexture();
        // (this.image as Texture2D).updateImage();
    }
}

export class LetterRenderTexture extends Texture2D {
    /**
     * @en
     * Init the render texture with size.
     * @zh
     * 初始化 render texture。
     * @param [width]
     * @param [height]
     * @param [string]
     */
    public initWithSize (width: number, height: number, format: number = PixelFormat.RGBA8888): void {
        this.reset({
            width,
            height,
            format,
        });
    }

    /**
     * @en Draw a texture to the specified position
     * @zh 将指定的图片渲染到指定的位置上。
     * @param {Texture2D} image
     * @param {Number} x
     * @param {Number} y
     */
    public drawTextureAt (image: ImageAsset, x: number, y: number): void {
        const gfxTexture = this.getGFXTexture();
        if (!image || !gfxTexture) {
            return;
        }

        const gfxDevice = this._getGFXDevice();
        if (!gfxDevice) {
            warnID(16363);
            return;
        }

        const region = new BufferTextureCopy();
        region.texOffset.x = x;
        region.texOffset.y = y;
        region.texExtent.width = image.width;
        region.texExtent.height = image.height;
        gfxDevice.copyTexImagesToTexture([image.data as HTMLCanvasElement], gfxTexture, [region]);
    }
}

export class LetterAtlas {
    get width (): number {
        return this._width;
    }

    get height (): number {
        return this._height;
    }

    private _x = space;
    private _y = space;
    private _nextY = space;
    private _width = 0;
    private _height = 0;
    private _halfBleed = 0;
    public declare fontDefDictionary: FontAtlas;
    private _dirty = false;

    constructor (width: number, height: number) {
        const texture = new LetterRenderTexture();
        texture.initWithSize(width, height);

        this.fontDefDictionary = new FontAtlas(texture);
        this._halfBleed = bleed / 2;
        this._width = width;
        this._height = height;
        director.on(DirectorEvent.BEFORE_SCENE_LAUNCH, this.beforeSceneLoad, this);
    }

    public insertLetterTexture (letterTexture: LetterTexture): FontLetterDefinition | null {
        const img = letterTexture.image;
        const device = director.root!.device;
        if (!img || !this.fontDefDictionary || !device) {
            return null;
        }

        const width = img.width;
        const height = img.height;

        if ((this._x + width + space) > this._width) {
            this._x = space;
            this._y = this._nextY;
        }

        if ((this._y + height) > this._nextY) {
            this._nextY = this._y + height + space;
        }

        if (this._nextY > this._height) {
            warnID(12100);
            return null;
        }

        if (!this.fontDefDictionary.texture) {
            return null;
        }

        const rt = this.fontDefDictionary.texture as LetterRenderTexture;
        rt.drawTextureAt(img, this._x, this._y);

        this._dirty = true;

        const letterDefinition = new FontLetterDefinition();
        letterDefinition.u = this._x + this._halfBleed;
        letterDefinition.v = this._y + this._halfBleed;
        letterDefinition.valid = true;
        letterDefinition.w = letterTexture.width - bleed;
        letterDefinition.h = letterTexture.height - bleed;
        letterDefinition.xAdvance = letterDefinition.w;
        letterDefinition.offsetY = letterTexture.offsetY;

        this._x += width + space;
        this.fontDefDictionary.addLetterDefinitions(letterTexture.hash, letterDefinition);
        /*
        const region = new BufferTextureCopy();
        region.texOffset.x = letterDefinition.offsetX;
        region.texOffset.y = letterDefinition.offsetY;
        region.texExtent.width = letterDefinition.w;
        region.texExtent.height = letterDefinition.h;
        */

        return letterDefinition;
    }

    public update (): void {
        if (!this._dirty) {
            return;
        }
        // this.texture.update();
        this._dirty = false;
    }

    public reset (): void {
        this._x = space;
        this._y = space;
        this._nextY = space;

        // const chars = this.letterDefinitions;
        // for (let i = 0, l = (Object.keys(chars)).length; i < l; i++) {
        //     const char = chars[i];
        //     if (!char.valid) {
        //         continue;
        //     }
        //     char.destroy();
        // }

        // this.letterDefinitions = createMap();
        this.fontDefDictionary.clear();
    }

    public destroy (): void {
        this.reset();
        const dict = this.fontDefDictionary;
        if (dict && dict.texture) {
            dict.texture = null;
        }
    }

    getTexture (): TextureBase | null {
        return this.fontDefDictionary.getTexture();
    }

    public beforeSceneLoad (): void {
        this.clearAllCache();
    }

    public clearAllCache (): void {
        this.destroy();

        const texture = new LetterRenderTexture();
        texture.initWithSize(this._width, this._height);

        this.fontDefDictionary.texture = texture;
    }

    public getLetter (key: string): FontLetterDefinition {
        return this.fontDefDictionary.letterDefinitions[key];
    }

    public getLetterDefinitionForChar (char: string, labelInfo: ILabelInfo): FontLetterDefinition | null {
        const hash = getSymbolCodeAt(char, 0) + labelInfo.hash;
        let letter: FontLetterDefinition | null = this.fontDefDictionary.letterDefinitions[hash];
        if (!letter) {
            const temp = new LetterTexture(char, labelInfo);
            temp.updateRenderData();
            letter = this.insertLetterTexture(temp);
            temp.destroy();
        }

        return letter;
    }
}

export interface IShareLabelInfo {
    fontAtlas: FontAtlas | LetterAtlas | null;
    fontSize: number;
    lineHeight: number;
    hAlign: number;
    vAlign: number;
    hash: string;
    fontFamily: string;
    fontDesc: string;
    color: Color;
    isOutlined: boolean;
    out: Color;
    margin: number;
    fontScale: number;
}

export const shareLabelInfo: IShareLabelInfo = {
    fontAtlas: null,
    fontSize: 0,
    lineHeight: 0,
    hAlign: 0,
    vAlign: 0,
    hash: '',
    fontFamily: '',
    fontDesc: 'Arial',
    color: Color.WHITE.clone(),
    isOutlined: false,
    out: Color.WHITE.clone(),
    margin: 0,
    fontScale: 1,
};

export function computeHash (labelInfo): string {
    const hashData = '';
    const color = labelInfo.color.toHEX();
    let out = '';
    if (labelInfo.isOutlined && labelInfo.margin > 0) {
        out = out + labelInfo.margin + labelInfo.out.toHEX();
    }

    return hashData + labelInfo.fontSize + labelInfo.fontFamily + color + out;
}
