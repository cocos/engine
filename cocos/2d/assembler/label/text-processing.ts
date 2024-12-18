/*
 Copyright (c) 2023 Xiamen Yaji Software Co., Ltd.

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
import { ANDROID, JSB } from 'internal:constants';
import { Texture2D } from '../../../asset/assets';
import { WrapMode } from '../../../asset/assets/asset-enum';
import { cclegacy, Color, Rect, Vec2 } from '../../../core';
import { logID, warnID } from '../../../core/platform';
import { SpriteFrame } from '../../assets';
import { FontLetterDefinition } from '../../assets/bitmap-font';
import { HorizontalTextAlignment, Overflow, VerticalTextAlignment } from '../../components/label';
import { CanvasPool, ISharedLabelData, shareLabelInfo } from './font-utils';
import { TextOutputLayoutData, TextOutputRenderData } from './text-output-data';
import { TextStyle } from './text-style';
import { TextLayout } from './text-layout';
import {
    BASELINE_RATIO,
    fragmentText,
    getBaselineOffset,
    getSymbolAt,
    getSymbolCodeAt,
    getSymbolLength,
    isUnicodeCJK,
    isUnicodeSpace,
    safeMeasureText,
} from '../../utils/text-utils';
import type { Batcher2D } from '../../renderer/batcher-2d';

const Alignment = [
    'left', // macro.TextAlignment.LEFT
    'center', // macro.TextAlignment.CENTER
    'right', // macro.TextAlignment.RIGHT
];
const MAX_SIZE = 2048;
const _BASELINE_OFFSET = getBaselineOffset();
const _invisibleAlpha = (1 / 255).toFixed(3);
const MAX_CALCULATION_NUM = 3;

export interface IRenderData {
    x: number;
    y: number;
    z: number;
    u: number;
    v: number;
    color: Color;
}

class LetterInfo {
    public char = '';
    public valid = true;
    public x = 0;
    public y = 0;
    public line = 0;
    public hash = '';
}

export class TextProcessing {
    // -------------------- Common Part --------------------------
    public static instance: TextProcessing;
    constructor () {
        this._canvasData = CanvasPool.getInstance().get();
        this._canvas = this._canvasData.canvas;
        this._context = this._canvasData.context;
    }

    public destroy (): void {
        CanvasPool.getInstance().put(this._canvasData!);
        this._lettersInfo.length = 0;
    }

    public processingString (
        isBmFont: boolean,
        style: TextStyle,
        layout: TextLayout,
        outputLayoutData: TextOutputLayoutData,
        inputString: string,
        out?: string[],
    ): void {
        if (!isBmFont) {
            let loopTime = 0;
            this._fontScale = this._getStyleFontScale(style.fontSize, style.fontScale);
            this._updatePaddingRect(style, outputLayoutData);
            this._calculateLabelFont(style, layout, outputLayoutData, inputString);
            // check & limit canvas size
            while ((outputLayoutData.canvasSize.width > MAX_SIZE || outputLayoutData.canvasSize.height > MAX_SIZE)
                && (loopTime <= MAX_CALCULATION_NUM)) {
                loopTime++;
                if (loopTime > MAX_CALCULATION_NUM) {
                    this._fontScale = 1;
                } else {
                    // Current Canvas Size max dimension
                    const maxValue = Math.max(outputLayoutData.canvasSize.width, outputLayoutData.canvasSize.height);
                    const canvasScaleToMaxSizeRatio = MAX_SIZE / maxValue;
                    this._fontScale *=  canvasScaleToMaxSizeRatio;
                    this._fontScale = Math.max(1, this._fontScale);
                }

                this._updatePaddingRect(style, outputLayoutData);
                this._calculateLabelFont(style, layout, outputLayoutData, inputString);
            }
        } else {
            if (!style.fntConfig) { // for char
                this._fontScale = this._getStyleFontScale(style.originFontSize, style.fontScale);
            } else {
                this._fontScale = 1;
            }
            shareLabelInfo.fontScale = this._fontScale;
            this._setupBMFontOverflowMetrics(layout, outputLayoutData);
            this._updateFontScale(style);
            this._computeHorizontalKerningForText(style, layout, inputString);
            this._alignText(style, layout, outputLayoutData, inputString);
        }
        if (out) {
            out = outputLayoutData.parsedString;
        }
    }

    public generateRenderInfo (
        isBmFont: boolean,
        style: TextStyle,
        layout: TextLayout,
        outputLayoutData: TextOutputLayoutData,
        outputRenderData: TextOutputRenderData,
        inputString: string,
        callback: AnyFunction,
    ): void {
        if (!isBmFont) {
            this._updateLabelDimensions(style, layout, outputLayoutData);
            this._updateTexture(style, layout, outputLayoutData, outputRenderData);
            this.generateVertexData(isBmFont, style, layout, outputLayoutData, outputRenderData, inputString, callback);
        } else {
            this._computeAlignmentOffset(style, layout, outputLayoutData);
            this.generateVertexData(isBmFont, style, layout, outputLayoutData, outputRenderData, inputString, callback);
        }
    }

    public setCanvasUsed (canvas: HTMLCanvasElement, content: CanvasRenderingContext2D | null): void {
        this._canvas = canvas;
        this._context = content;
    }
    // -------------------- Common Part --------------------------

    // -------------------- Canvas Mode Part --------------------------

    // -------------------- String Processing Part --------------------------
    private _context: CanvasRenderingContext2D | null = null;
    private _canvas: HTMLCanvasElement | null = null;
    private _canvasData: ISharedLabelData | null = null;

    private _lettersInfo: LetterInfo[] = [];
    private _tmpRect = new Rect();

    private _maxFontSize = 100;
    private _fontScale = 1;

    private _getStyleFontScale (fontSize: number, fontScale: number): number {
        let scale = fontScale;
        if (scale * fontSize > this._maxFontSize && fontSize < this._maxFontSize) { // Font size limit
            scale = this._maxFontSize / fontSize;
        }
        if (scale < 1) { scale = 1; }
        return scale;
    }

    private _calculateLabelFont (
        style: TextStyle,
        layout: TextLayout,
        outputLayoutData: TextOutputLayoutData,
        inputString: string,
    ): void {
        if (!this._context) {
            return;
        }

        style.actualFontSize = style.fontSize * this._fontScale;
        if (ANDROID) {
            // Android restriction only accepts integer font sizes
            style.actualFontSize = Math.floor(style.actualFontSize);
            this._fontScale = style.actualFontSize / style.fontSize;
        }
        const paragraphedStrings = inputString.split('\n');

        const _splitStrings = outputLayoutData.parsedString = paragraphedStrings;
        const _fontDesc = this._getFontDesc(style.actualFontSize, style.fontFamily, style.isBold, style.isItalic);
        this._context.font = style.fontDesc = _fontDesc;

        switch (layout.overFlow) {
        case Overflow.NONE: {
            let canvasSizeX = 0;
            let canvasSizeY = 0;
            for (let i = 0; i < paragraphedStrings.length; ++i) {
                const paraLength = safeMeasureText(this._context, paragraphedStrings[i], _fontDesc);
                canvasSizeX = canvasSizeX > paraLength ? canvasSizeX : paraLength;
            }
            canvasSizeY = (_splitStrings.length + BASELINE_RATIO)
            * this._getLineHeight(layout.lineHeight, style.actualFontSize, style.fontSize);
            const rawWidth = canvasSizeX;
            const rawHeight = canvasSizeY;

            outputLayoutData.canvasSize.width = rawWidth + outputLayoutData.canvasPadding.width * this._fontScale;
            outputLayoutData.canvasSize.height = rawHeight + outputLayoutData.canvasPadding.height * this._fontScale;
            outputLayoutData.nodeContentSize.width = (rawWidth + outputLayoutData.contentSizeExtend.width * this._fontScale) / this._fontScale;
            outputLayoutData.nodeContentSize.height = (rawHeight + outputLayoutData.contentSizeExtend.height * this._fontScale) / this._fontScale;
            break;
        }
        case Overflow.SHRINK: {
            this._calculateShrinkFont(paragraphedStrings, style, layout, outputLayoutData);
            this._calculateWrapText(paragraphedStrings, style, layout, outputLayoutData);
            outputLayoutData.canvasSize.width  = outputLayoutData.nodeContentSize.width * this._fontScale;
            outputLayoutData.canvasSize.height = outputLayoutData.nodeContentSize.height * this._fontScale;
            break;
        }
        case Overflow.CLAMP: {
            this._calculateWrapText(paragraphedStrings, style, layout, outputLayoutData);
            outputLayoutData.canvasSize.width  = outputLayoutData.nodeContentSize.width * this._fontScale;
            outputLayoutData.canvasSize.height = outputLayoutData.nodeContentSize.height * this._fontScale;
            break;
        }
        case Overflow.RESIZE_HEIGHT: {
            this._calculateWrapText(paragraphedStrings, style, layout, outputLayoutData);
            const rawHeight = (outputLayoutData.parsedString.length + BASELINE_RATIO)
            * this._getLineHeight(layout.lineHeight, style.actualFontSize, style.fontSize);

            outputLayoutData.canvasSize.width  = outputLayoutData.nodeContentSize.width * this._fontScale;
            outputLayoutData.canvasSize.height = (rawHeight + outputLayoutData.canvasPadding.height * this._fontScale);
            // set node height
            outputLayoutData.nodeContentSize.height = (rawHeight + outputLayoutData.contentSizeExtend.height * this._fontScale) / this._fontScale;
            break;
        }
        default: {
            // nop
        }
        }
    }

    // can cache
    private _getFontDesc (fontSize: number, fontFamily: string, isBold: boolean, isItalic: boolean): string {
        let fontDesc = `${fontSize.toString()}px `;
        fontDesc += fontFamily;
        if (isBold) {
            fontDesc = `bold ${fontDesc}`;
        }

        if (isItalic) {
            fontDesc = `italic ${fontDesc}`;
        }

        return fontDesc;
    }

    // can cache
    private _getLineHeight (lineHeight: number, fontSize: number, drawFontsize: number): number {
        let nodeSpacingY = lineHeight;
        if (nodeSpacingY === 0) {
            nodeSpacingY = fontSize;
        } else {
            nodeSpacingY = nodeSpacingY * fontSize / drawFontsize;
        }

        return nodeSpacingY;
    }

    private _calculateShrinkFont (paragraphedStrings: string[], style: TextStyle, layout: TextLayout, outputLayoutData: TextOutputLayoutData): void {
        if (!this._context) return;
        let _fontDesc = this._getFontDesc(style.actualFontSize, style.fontFamily, style.isBold, style.isItalic);
        this._context.font = _fontDesc;
        const paragraphLength = this._calculateParagraphLength(paragraphedStrings, this._context, _fontDesc);

        let i = 0;
        let totalHeight = 0;
        let maxLength = 0;
        let _fontSize = style.actualFontSize;

        if (layout.wrapping) {
            const canvasWidthNoMargin = outputLayoutData.nodeContentSize.width * this._fontScale;
            const canvasHeightNoMargin = outputLayoutData.nodeContentSize.height * this._fontScale;
            if (canvasWidthNoMargin < 0 || canvasHeightNoMargin < 0) {
                return;
            }
            totalHeight = canvasHeightNoMargin + 1;
            const actualFontSize = style.actualFontSize + 1;
            let textFragment: string[] = [];
            let left = 0;
            let right = actualFontSize | 0;
            let mid = 0;

            while (left < right) {
                mid = (left + right + 1) >> 1;

                if (mid <= 0) {
                    logID(4003);
                    break;
                }

                _fontSize = mid;
                _fontDesc = this._getFontDesc(_fontSize, style.fontFamily, style.isBold, style.isItalic);
                this._context.font = _fontDesc;
                const lineHeight = this._getLineHeight(layout.lineHeight, _fontSize, style.fontSize);

                totalHeight = 0;
                for (i = 0; i < paragraphedStrings.length; ++i) {
                    const allWidth = safeMeasureText(this._context, paragraphedStrings[i], _fontDesc);
                    textFragment = fragmentText(
                        paragraphedStrings[i],
                        allWidth,
                        canvasWidthNoMargin,
                        this._measureText(this._context, _fontDesc),
                    );
                    totalHeight += textFragment.length * lineHeight;
                }

                if (totalHeight > canvasHeightNoMargin) {
                    right = mid - 1;
                } else {
                    left = mid;
                }
            }

            if (left === 0) {
                logID(4003);
            } else {
                _fontSize = left;
                _fontDesc = this._getFontDesc(_fontSize, style.fontFamily, style.isBold, style.isItalic);
                this._context.font = _fontDesc;
            }
        } else {
            totalHeight = paragraphedStrings.length * this._getLineHeight(layout.lineHeight, _fontSize, style.fontSize);

            for (i = 0; i < paragraphedStrings.length; ++i) {
                if (maxLength < paragraphLength[i]) {
                    maxLength = paragraphLength[i];
                }
            }
            const scaleX = (outputLayoutData.canvasSize.width - outputLayoutData.canvasPadding.width) * this._fontScale / maxLength;
            const scaleY = (outputLayoutData.canvasSize.height * this._fontScale) / totalHeight;

            _fontSize = (style.actualFontSize * Math.min(1, scaleX, scaleY)) | 0;
            _fontDesc = this._getFontDesc(_fontSize, style.fontFamily, style.isBold, style.isItalic);
            this._context.font = _fontDesc;
        }

        style.actualFontSize = _fontSize;
        style.fontDesc = _fontDesc;
    }

    private _calculateWrapText (paragraphedStrings: string[], style: TextStyle, layout: TextLayout, outputLayoutData: TextOutputLayoutData): void {
        if (!layout.wrapping || !this._context) return;

        let _splitStrings: string[] = [];
        const canvasWidthNoMargin = outputLayoutData.nodeContentSize.width * this._fontScale;
        const _fontDesc = this._getFontDesc(style.actualFontSize, style.fontFamily, style.isBold, style.isItalic);
        this._context.font = _fontDesc;
        for (let i = 0; i < paragraphedStrings.length; ++i) {
            const allWidth = safeMeasureText(this._context, paragraphedStrings[i], _fontDesc);
            const textFragment = fragmentText(
                paragraphedStrings[i],
                allWidth,
                canvasWidthNoMargin,
                this._measureText(this._context, _fontDesc),
            );
            _splitStrings = _splitStrings.concat(textFragment);
        }
        outputLayoutData.parsedString = _splitStrings;
        style.fontDesc = _fontDesc;
    }

    private _measureText (ctx: CanvasRenderingContext2D, fontDesc: string): (str: string) => number {
        return (str: string): number => safeMeasureText(ctx, str, fontDesc);
    }

    private _calculateParagraphLength (paragraphedStrings: string[], ctx: CanvasRenderingContext2D, fontDesc: string): number[] {
        const paragraphLength: number[] = [];

        for (const para of paragraphedStrings) {
            const width: number = safeMeasureText(ctx, para, fontDesc);
            paragraphLength.push(width);
        }

        return paragraphLength;
    }

    private _updatePaddingRect (style: TextStyle, outputLayoutData: TextOutputLayoutData): void {
        let top = 0; let bottom = 0; let left = 0; let right = 0;
        let outlineWidth = 0;
        outputLayoutData.contentSizeExtend.width = outputLayoutData.contentSizeExtend.height = 0;
        if (style.isOutlined) {
            outlineWidth = style.outlineWidth;
            top = bottom = left = right = outlineWidth;
            outputLayoutData.contentSizeExtend.width = outputLayoutData.contentSizeExtend.height = outlineWidth * 2;
        }
        if (style.hasShadow) {
            const shadowWidth = style.shadowBlur + outlineWidth;
            const offsetX = style.shadowOffsetX;
            const offsetY = style.shadowOffsetY;
            left = Math.max(left, -offsetX + shadowWidth);
            right = Math.max(right, offsetX + shadowWidth);
            top = Math.max(top, offsetY + shadowWidth);
            bottom = Math.max(bottom, -offsetY + shadowWidth);
        }
        if (style.isItalic) {
            // 0.0174532925 = 3.141592653 / 180
            const offset = style.fontSize * Math.tan(12 * 0.0174532925);
            right += offset;
            outputLayoutData.contentSizeExtend.width += offset;
        }
        outputLayoutData.canvasPadding.x = left;
        outputLayoutData.canvasPadding.y = top;
        outputLayoutData.canvasPadding.width = left + right;
        outputLayoutData.canvasPadding.height = top + bottom;
    }

    // -------------------- String Processing Part --------------------------

    // -------------------- Render Processing Part --------------------------

    private _updateLabelDimensions (style: TextStyle, layout: TextLayout, outputLayoutData: TextOutputLayoutData): void {
        outputLayoutData.canvasSize.width = Math.min(outputLayoutData.canvasSize.width, MAX_SIZE);
        outputLayoutData.canvasSize.height = Math.min(outputLayoutData.canvasSize.height, MAX_SIZE);

        this._canvas!.width = outputLayoutData.canvasSize.width;
        this._canvas!.height = outputLayoutData.canvasSize.height;

        this._context!.font = style.fontDesc;
        // align
        this._context!.textAlign = Alignment[layout.horizontalAlign] as any;
        this._context!.textBaseline = 'alphabetic';
    }

    private _calculateFillTextStartPosition (style: TextStyle, layout: TextLayout, outputLayoutData: TextOutputLayoutData): void {
        let labelX = 0;
        if (layout.horizontalAlign === HorizontalTextAlignment.RIGHT as number) {
            labelX = outputLayoutData.canvasSize.width - outputLayoutData.canvasPadding.width;
        } else if (layout.horizontalAlign === HorizontalTextAlignment.CENTER as number) {
            labelX = (outputLayoutData.canvasSize.width - outputLayoutData.canvasPadding.width) / 2;
        }

        const lineHeight = this._getLineHeight(layout.lineHeight, style.actualFontSize, style.fontSize);
        const drawStartY = lineHeight * (outputLayoutData.parsedString.length - 1);
        // TOP
        let firstLinelabelY = style.actualFontSize * (1 - BASELINE_RATIO / 2);
        if (layout.verticalAlign !== VerticalTextAlignment.TOP as number) {
            // free space in vertical direction
            let blank = drawStartY + outputLayoutData.canvasPadding.height + style.actualFontSize - outputLayoutData.canvasSize.height;
            if (layout.verticalAlign === VerticalTextAlignment.BOTTOM as number) {
                // Unlike BMFont, needs to reserve space below.
                blank += BASELINE_RATIO / 2 * style.actualFontSize;
                // BOTTOM
                firstLinelabelY -= blank;
            } else {
                // CENTER
                firstLinelabelY -= blank / 2;
            }
        }

        firstLinelabelY += _BASELINE_OFFSET * style.actualFontSize;

        outputLayoutData.startPosition.set(labelX + outputLayoutData.canvasPadding.x, firstLinelabelY + outputLayoutData.canvasPadding.y);
    }

    private _updateTexture (
        style: TextStyle,
        layout: TextLayout,
        outputLayoutData: TextOutputLayoutData,
        outputRenderData: TextOutputRenderData,
    ): void {
        if (!this._context || !this._canvas) {
            return;
        }

        this._context.clearRect(0, 0, this._canvas.width, this._canvas.height);
        this._context.font = style.fontDesc;

        this._calculateFillTextStartPosition(style, layout, outputLayoutData);
        const lineHeight = this._getLineHeight(layout.lineHeight, style.actualFontSize, style.fontSize);
        // use round for line join to avoid sharp intersect point
        this._context.lineJoin = 'round';

        if (style.isOutlined) {
            this._context.fillStyle = `rgba(${style.outlineColor.r}, ${style.outlineColor.g}, ${style.outlineColor.b}, ${_invisibleAlpha})`;
            // Notice: fillRect twice will not effect
            this._context.fillRect(0, 0, this._canvas.width, this._canvas.height);
        } else {
            this._context.fillStyle = `rgba(${style.color.r}, ${style.color.g}, ${style.color.b}, ${_invisibleAlpha})`;
            this._context.fillRect(0, 0, this._canvas.width, this._canvas.height);
        }
        this._context.fillStyle = `rgb(${style.color.r}, ${style.color.g}, ${style.color.b})`;
        // Use the value that has been amplified by fontScale
        const tempPos = new Vec2(outputLayoutData.startPosition.x, outputLayoutData.startPosition.y);
        const drawTextPosX = tempPos.x;
        let drawTextPosY = 0;
        // draw shadow and underline
        this._drawTextEffect(tempPos, lineHeight, style, layout, outputLayoutData);
        // draw text and outline
        for (let i = 0; i < outputLayoutData.parsedString.length; ++i) {
            drawTextPosY = tempPos.y + i * lineHeight;
            //draw shadow
            if (style.hasShadow) {
                this._setupShadow(style);
                this._context.fillText(outputLayoutData.parsedString[i], drawTextPosX, drawTextPosY);
            }
            //draw outline
            if (style.isOutlined) {
                this._setupOutline(style);
                this._context.strokeText(outputLayoutData.parsedString[i], drawTextPosX, drawTextPosY);
            }
            //draw text
            if (!style.hasShadow || style.isOutlined) {
                this._context.fillText(outputLayoutData.parsedString[i], drawTextPosX, drawTextPosY);
            }
        }

        if (style.hasShadow) {
            this._context.shadowColor = 'transparent';
        }

        this._uploadTexture(outputRenderData);
    }

    private _uploadTexture (outputRenderData: TextOutputRenderData): void {
        if (outputRenderData.texture && this._canvas) {
            let tex: Texture2D;
            if (outputRenderData.texture instanceof SpriteFrame) {
                tex = (outputRenderData.texture.texture as Texture2D);
            } else {
                tex = outputRenderData.texture;
            }

            const uploadAgain = this._canvas.width !== 0 && this._canvas.height !== 0;

            if (uploadAgain) {
                const oldGfxTexture = tex.getGFXTexture();
                const oldGfxSampler = tex.getGFXSampler();

                tex.reset({
                    width: this._canvas.width,
                    height: this._canvas.height,
                    mipmapLevel: 1,
                });
                tex.uploadData(this._canvas);
                tex.setWrapMode(WrapMode.CLAMP_TO_EDGE, WrapMode.CLAMP_TO_EDGE);
                if (outputRenderData.texture instanceof SpriteFrame) {
                    outputRenderData.texture.rect = new Rect(0, 0, this._canvas.width, this._canvas.height);
                    outputRenderData.texture._calculateUV();
                }
                if (cclegacy.director.root && cclegacy.director.root.batcher2D) {
                    if (JSB) {
                        // NOTE: Release the old descriptor set cache referenced by old gfx texture and sampler.
                        // We should not release the new generated `tex.getGFXTexture()` and `tex.getGFXSampler()`
                        // since `tex.reset(...)` will reset `gfxTexture` and `gfxSampler`.
                        // The other non-JSB branch uses `tex.getHash()` which returns the hash value that will not be
                        // changed after `tex.reset(...)`, so there will be no problems for non-JSB branch.
                        (cclegacy.director.root.batcher2D as Batcher2D)._releaseDescriptorSetCache(oldGfxTexture, oldGfxSampler);
                    } else {
                        (cclegacy.director.root.batcher2D as Batcher2D)._releaseDescriptorSetCache(tex.getHash());
                    }
                }
            }
        }
    }

    private _drawTextEffect (
        startPosition: Vec2,
        lineHeight: number,
        style: TextStyle,
        layout: TextLayout,
        outputLayoutData: TextOutputLayoutData,
    ): void {
        if (!style.hasShadow && !style.isOutlined && !style.isUnderline) return;

        const isMultiple = outputLayoutData.parsedString.length > 1 && style.hasShadow;
        const measureText = this._measureText(this._context!, style.fontDesc);
        let drawTextPosX = 0;
        let drawTextPosY = 0;

        // draw shadow and (outline or text)
        for (let i = 0; i < outputLayoutData.parsedString.length; ++i) {
            drawTextPosX = startPosition.x;
            drawTextPosY = startPosition.y + i * lineHeight;
            // multiple lines need to be drawn outline and fill text
            if (isMultiple) {
                //draw shadow
                if (style.hasShadow) {
                    this._setupShadow(style);
                    this._context!.fillText(outputLayoutData.parsedString[i], drawTextPosX, drawTextPosY);
                }
                // draw outline
                if (style.isOutlined) {
                    this._setupOutline(style);
                    this._context!.strokeText(outputLayoutData.parsedString[i], drawTextPosX, drawTextPosY);
                }

                //draw text
                if (!style.hasShadow || style.isOutlined) {
                    this._context!.fillText(outputLayoutData.parsedString[i], drawTextPosX, drawTextPosY);
                }
            }

            // draw underline
            if (style.isUnderline) {
                const _drawUnderlineWidth = measureText(outputLayoutData.parsedString[i]);
                const _drawUnderlinePos = new Vec2();
                if (layout.horizontalAlign === HorizontalTextAlignment.RIGHT as number) {
                    _drawUnderlinePos.x = startPosition.x - _drawUnderlineWidth;
                } else if (layout.horizontalAlign === HorizontalTextAlignment.CENTER as number) {
                    _drawUnderlinePos.x = startPosition.x - (_drawUnderlineWidth / 2);
                } else {
                    _drawUnderlinePos.x = startPosition.x;
                }
                _drawUnderlinePos.y = drawTextPosY + style.actualFontSize / 8;
                this._context!.fillRect(_drawUnderlinePos.x, _drawUnderlinePos.y, _drawUnderlineWidth, style.underlineHeight * this._fontScale);
            }
        }

        if (isMultiple) {
            this._context!.shadowColor = 'transparent';
        }
    }

    private _setupOutline (style: TextStyle): void {
        // draw outline need clear shadow
        this._context!.shadowBlur = 0;
        this._context!.shadowOffsetX = 0;
        this._context!.shadowOffsetY = 0;
        this._context!.strokeStyle = `rgba(${style.outlineColor.r}, ${style.outlineColor.g}, ${style.outlineColor.b}, ${style.outlineColor.a / 255})`;
        this._context!.lineWidth = style.outlineWidth * 2 * this._fontScale;
    }

    private _setupShadow (style: TextStyle): void {
        const fontScale = this._fontScale;
        this._context!.shadowColor = `rgba(${style.shadowColor.r}, ${style.shadowColor.g}, ${style.shadowColor.b}, ${style.shadowColor.a / 255})`;
        this._context!.shadowBlur = style.shadowBlur * fontScale;
        this._context!.shadowOffsetX = style.shadowOffsetX * fontScale;
        this._context!.shadowOffsetY = -style.shadowOffsetY * fontScale;
    }

    // -------------------- Render Processing Part --------------------------

    private generateVertexData (
        isBmFont: boolean,
        style: TextStyle,
        layout: TextLayout,
        outputLayoutData: TextOutputLayoutData,
        outputRenderData: TextOutputRenderData,
        inputString: string,
        callback: AnyFunction,
    ): void {
        if (!isBmFont) {
            this.updateQuatCount(outputRenderData); // update vbBuffer count
            callback(style, outputLayoutData, outputRenderData);
        } else {
            this._updateQuads(style, layout, outputLayoutData, outputRenderData, inputString, callback);
        }
    }

    private updateQuatCount (outputRenderData: TextOutputRenderData): void {
        const data: IRenderData[] = outputRenderData.vertexBuffer;
        const count = outputRenderData.quadCount;
        if (data.length !== count) {
            for (let i = data.length; i < count; i++) {
                data.push({
                    x: 0,
                    y: 0,
                    z: 0,
                    u: 0,
                    v: 0,
                    color: Color.WHITE.clone(),
                });
            }

            data.length = count;
        }
    }

    // -------------------- Canvas Mode Part ---------------------------
    // -------------------- Multiple Quad Mode Part --------------------

    private _setupBMFontOverflowMetrics (layout: TextLayout, outputLayoutData: TextOutputLayoutData): void {
        let newWidth = outputLayoutData.nodeContentSize.width;
        let newHeight = outputLayoutData.nodeContentSize.height;

        if (layout.overFlow === Overflow.RESIZE_HEIGHT as number) {
            newHeight = 0;
        }

        if (layout.overFlow === Overflow.NONE as number) {
            newWidth = 0;
            newHeight = 0;
        }

        layout.textWidthTemp = newWidth;
        layout.textHeightTemp = newHeight;
        layout.textDimensions.width = newWidth;
        layout.textDimensions.height = newHeight;
        layout.maxLineWidth = newWidth;
    }

    private _updateFontScale (style: TextStyle): void {
        style.bmfontScale = style.actualFontSize / (style.originFontSize * this._fontScale);
    }

    private _computeHorizontalKerningForText (style: TextStyle, layout: TextLayout, inputString: string): void {
        const string = inputString;
        const stringLen = string.length;
        if (!style.fntConfig) return; // for char

        const kerningDict = style.fntConfig.kerningDict;
        const horizontalKerning = layout.horizontalKerning;

        if (!kerningDict || kerningDict.length === 0) {
            return;
        }

        let prev = -1;
        for (let i = 0; i < stringLen; ++i) {
            const key = string.charCodeAt(i);
            const kerningAmount = kerningDict[(prev << 16) | (key & 0xffff)] || 0;
            if (i < stringLen - 1) {
                horizontalKerning[i] = kerningAmount;
            } else {
                horizontalKerning[i] = 0;
            }
            prev = key;
        }
    }

    private _alignText (style: TextStyle, layout: TextLayout, outputLayoutData: TextOutputLayoutData, inputString: string): void {
        this._multilineTextWrap(style, layout, outputLayoutData, inputString, this._getFirstWordLen);

        // shrink
        if (layout.overFlow === Overflow.SHRINK as number) {
            if (style.fontSize > 0 && this._isVerticalClamp(style, layout, outputLayoutData, inputString, this)) {
                this._shrinkLabelToContentSize(style, layout, outputLayoutData, inputString, this._isVerticalClamp);
            }
            if (style.fontSize > 0 && this._isHorizontalNeedShrink(layout, outputLayoutData)) {
                this._shrinkLabelToContentSize(style, layout, outputLayoutData, inputString, this._isHorizontalClamp);
            }
        }
        this._parsedString(outputLayoutData, inputString);
    }

    private _parsedString (outputLayoutData: TextOutputLayoutData, inputString: string): void {
        let _splitStrings: string[] = [];
        let textFragment = '';
        const length = getSymbolLength(inputString);
        for (let i = 0, line = 0, l = length; i < l; ++i) {
            const letterInfo = this._lettersInfo[i];
            if (!letterInfo.valid) { continue; }
            if (line === letterInfo.line) {
                textFragment += letterInfo.char;
            } else {
                _splitStrings = _splitStrings.concat(textFragment);
                line = letterInfo.line;
                textFragment = '';
            }
        }
        _splitStrings = _splitStrings.concat(textFragment);
        outputLayoutData.parsedString = _splitStrings;
    }

    private _multilineTextWrap (
        style: TextStyle,
        layout: TextLayout,
        outputLayoutData: TextOutputLayoutData,
        inputString: string,
        nextTokenFunc: (arg0: TextStyle, arg1: TextLayout, arg2: string, arg3: number, arg4: number) => number,
    ): boolean {
        layout.linesWidth.length = 0;

        const _string = inputString;
        const textLen = _string.length;

        let lineIndex = 0;
        let nextTokenX = 0;
        let nextTokenY = 0;
        let longestLine = 0;
        let letterRight = 0;

        let highestY = 0;
        let lowestY = 0;
        let letterDef: FontLetterDefinition | null = null;

        const _lineSpacing = 0; // use less?

        for (let index = 0; index < textLen;) {
            let character = getSymbolAt(_string, index);
            if (character === '\n') {
                layout.linesWidth.push(letterRight);
                letterRight = 0;
                lineIndex++;
                nextTokenX = 0;
                nextTokenY -= layout.lineHeight * this._getFontScale(style, layout) + _lineSpacing;
                this._recordPlaceholderInfo(index, character);
                index++;
                continue;
            }

            const tokenLen = nextTokenFunc(style, layout, _string, index, textLen);
            let tokenHighestY = highestY;
            let tokenLowestY = lowestY;
            let tokenRight = letterRight;
            let nextLetterX = nextTokenX;
            let newLine = false;
            const letterPosition = new Vec2();

            for (let tmp = 0; tmp < tokenLen; ++tmp) {
                const letterIndex = index + tmp;
                character = getSymbolAt(_string, letterIndex);
                if (character === '\r') {
                    this._recordPlaceholderInfo(letterIndex, character);
                    continue;
                }
                letterDef = shareLabelInfo.fontAtlas!.getLetterDefinitionForChar(character, shareLabelInfo);
                if (!letterDef) {
                    this._recordPlaceholderInfo(letterIndex, character);
                    if (style.fntConfig != null) {
                        logID(16354, style.fntConfig.atlasName as string, character);
                    } else {
                        logID(16355, style.fontFamily, character);
                    }
                    continue;
                }

                const letterX = nextLetterX + letterDef.offsetX * style.bmfontScale - shareLabelInfo.margin;

                if (layout.wrapping
                    && layout.maxLineWidth > 0
                    && nextTokenX > 0
                    && letterX + letterDef.w * style.bmfontScale > layout.maxLineWidth
                    && !isUnicodeSpace(character)) {
                    layout.linesWidth.push(letterRight);
                    letterRight = 0;
                    lineIndex++;
                    nextTokenX = 0;
                    nextTokenY -= (layout.lineHeight * this._getFontScale(style, layout) + _lineSpacing);
                    newLine = true;
                    break;
                } else {
                    letterPosition.x = letterX;
                }

                letterPosition.y = nextTokenY - letterDef.offsetY * style.bmfontScale;
                this._recordLetterInfo(letterPosition, character, letterIndex, lineIndex);

                if (letterIndex + 1 < layout.horizontalKerning.length && letterIndex < textLen - 1) {
                    nextLetterX += layout.horizontalKerning[letterIndex + 1] * style.bmfontScale;
                }

                nextLetterX += letterDef.xAdvance * style.bmfontScale + layout.spacingX;

                tokenRight = letterPosition.x + letterDef.w * style.bmfontScale;

                if (tokenHighestY < letterPosition.y) {
                    tokenHighestY = letterPosition.y;
                }

                if (tokenLowestY > letterPosition.y - letterDef.h * style.bmfontScale) {
                    tokenLowestY = letterPosition.y - letterDef.h * style.bmfontScale;
                }
            } // end of for loop

            if (newLine) { continue; }

            nextTokenX = nextLetterX;
            letterRight = tokenRight;

            if (highestY < tokenHighestY) {
                highestY = tokenHighestY;
            }
            if (lowestY > tokenLowestY) {
                lowestY = tokenLowestY;
            }
            if (longestLine < letterRight) {
                longestLine = letterRight;
            }

            index += tokenLen;
        } // end of for loop

        layout.linesWidth.push(letterRight);

        layout.numberOfLines = lineIndex + 1;
        layout.textDesiredHeight = layout.numberOfLines * layout.lineHeight * this._getFontScale(style, layout);
        if (layout.numberOfLines > 1) {
            layout.textDesiredHeight += (layout.numberOfLines - 1) * _lineSpacing;
        }

        outputLayoutData.nodeContentSize.width = layout.textWidthTemp;
        outputLayoutData.nodeContentSize.height = layout.textHeightTemp;
        if (layout.textWidthTemp <= 0) {
            outputLayoutData.nodeContentSize.width = parseFloat(longestLine.toFixed(2)) + shareLabelInfo.margin * 2;
        }
        if (layout.textHeightTemp <= 0) {
            outputLayoutData.nodeContentSize.height = parseFloat(layout.textDesiredHeight.toFixed(2)) + shareLabelInfo.margin * 2;
        }

        layout.tailoredTopY = outputLayoutData.nodeContentSize.height;
        layout.tailoredBottomY = 0;
        if (highestY > 0) {
            layout.tailoredTopY = outputLayoutData.nodeContentSize.height + highestY;
        }
        if (lowestY < -layout.textDesiredHeight) {
            layout.tailoredBottomY = layout.textDesiredHeight + lowestY;
        }

        return true;
    }

    private _recordPlaceholderInfo (letterIndex: number, char: string): void {
        if (letterIndex >= this._lettersInfo.length) {
            const tmpInfo = new LetterInfo();
            this._lettersInfo.push(tmpInfo);
        }

        this._lettersInfo[letterIndex].char = char;
        this._lettersInfo[letterIndex].hash = `${getSymbolCodeAt(char, 0)}${shareLabelInfo.hash}`;
        this._lettersInfo[letterIndex].valid = false;
    }

    private _recordLetterInfo (letterPosition: Vec2, character: string, letterIndex: number, lineIndex: number): void {
        if (letterIndex >= this._lettersInfo.length) {
            const tmpInfo = new LetterInfo();
            this._lettersInfo.push(tmpInfo);
        }

        const char = getSymbolCodeAt(character, 0);
        const key = `${char}${shareLabelInfo.hash}`;

        this._lettersInfo[letterIndex].line = lineIndex;
        this._lettersInfo[letterIndex].char = character;
        this._lettersInfo[letterIndex].hash = key;
        this._lettersInfo[letterIndex].valid = shareLabelInfo.fontAtlas!.getLetter(key).valid;
        this._lettersInfo[letterIndex].x = letterPosition.x;
        this._lettersInfo[letterIndex].y = letterPosition.y;
    }

    private _getFirstWordLen (style: TextStyle, layout: TextLayout, text: string, startIndex: number, textLen: number): number {
        let character = getSymbolAt(text, startIndex);
        if (isUnicodeCJK(character)
            || character === '\n'
            || isUnicodeSpace(character)) {
            return 1;
        }

        let len = 1;
        let letterDef = shareLabelInfo.fontAtlas!.getLetterDefinitionForChar(character, shareLabelInfo);
        if (!letterDef) {
            return len;
        }
        let nextLetterX = letterDef.xAdvance * style.bmfontScale + layout.spacingX;
        let letterX = 0;
        for (let index = startIndex + 1; index < textLen; ++index) {
            character = getSymbolAt(text, index);

            letterDef = shareLabelInfo.fontAtlas!.getLetterDefinitionForChar(character, shareLabelInfo);
            if (!letterDef) {
                break;
            }
            letterX = nextLetterX + letterDef.offsetX * style.bmfontScale;

            if (letterX + letterDef.w * style.bmfontScale > layout.maxLineWidth
                && !isUnicodeSpace(character)
                && layout.maxLineWidth > 0) {
                return len;
            }
            nextLetterX += letterDef.xAdvance * style.bmfontScale + layout.spacingX;
            if (character === '\n'
                || isUnicodeSpace(character)
                || isUnicodeCJK(character)) {
                break;
            }
            len++;
        }

        return len;
    }

    private _computeAlignmentOffset (style: TextStyle, layout: TextLayout, outputLayoutData: TextOutputLayoutData): void {
        layout.linesOffsetX.length = 0;
        layout.letterOffsetY = 0;

        switch (layout.horizontalAlign) {
        case HorizontalTextAlignment.LEFT:
            for (let i = 0; i < layout.numberOfLines; ++i) {
                layout.linesOffsetX.push(0);
            }
            break;
        case HorizontalTextAlignment.CENTER:
            for (let i = 0, l = layout.linesWidth.length; i < l; i++) {
                layout.linesOffsetX.push((outputLayoutData.nodeContentSize.width - layout.linesWidth[i]) / 2);
            }
            break;
        case HorizontalTextAlignment.RIGHT:
            for (let i = 0, l = layout.linesWidth.length; i < l; i++) {
                layout.linesOffsetX.push(outputLayoutData.nodeContentSize.width - layout.linesWidth[i]);
            }
            break;
        default:
            break;
        }

        // TOP
        layout.letterOffsetY = outputLayoutData.nodeContentSize.height;
        if (layout.verticalAlign !== VerticalTextAlignment.TOP as number) {
            const blank = outputLayoutData.nodeContentSize.height - layout.textDesiredHeight
            + layout.lineHeight * this._getFontScale(style, layout) - style.originFontSize * this._fontScale * style.bmfontScale;
            if (layout.verticalAlign === VerticalTextAlignment.BOTTOM as number) {
                // BOTTOM
                layout.letterOffsetY -= blank;
            } else {
                // CENTER:
                layout.letterOffsetY -= blank / 2;
            }
        }
    }

    private _getFontScale (style: TextStyle, layout: TextLayout): number {
        return layout.overFlow === (Overflow.SHRINK as number) ? style.bmfontScale : 1;
    }

    private _isVerticalClamp (
        style: TextStyle,
        layout: TextLayout,
        outputLayoutData: TextOutputLayoutData,
        inputString: string,
        process: TextProcessing,
    ): boolean {
        if (layout.textDesiredHeight > outputLayoutData.nodeContentSize.height) {
            return true;
        } else {
            return false;
        }
    }

    private _isHorizontalClamp (
        style: TextStyle,
        layout: TextLayout,
        outputLayoutData: TextOutputLayoutData,
        inputString: string,
        process: TextProcessing,
    ): boolean {
        let letterClamp = false;
        const _string = inputString;
        const _length = getSymbolLength(_string);
        for (let ctr = 0, l = _length; ctr < l; ++ctr) {
            const letterInfo = process._lettersInfo[ctr];
            if (letterInfo.valid) {
                const letterDef = shareLabelInfo.fontAtlas!.getLetterDefinitionForChar(letterInfo.char, shareLabelInfo);
                if (!letterDef) {
                    continue;
                }

                const px = letterInfo.x + letterDef.w * style.bmfontScale;
                const lineIndex = letterInfo.line;
                if (layout.textWidthTemp > 0) {
                    if (!layout.wrapping) {
                        if (px > outputLayoutData.nodeContentSize.width) {
                            letterClamp = true;
                            break;
                        }
                    } else {
                        const wordWidth = layout.linesWidth[lineIndex];
                        if (wordWidth > outputLayoutData.nodeContentSize.width && (px > outputLayoutData.nodeContentSize.width || px < 0)) {
                            letterClamp = true;
                            break;
                        }
                    }
                }
            }
        }

        return letterClamp;
    }

    private _isHorizontalNeedShrink (layout: TextLayout, outputLayoutData: TextOutputLayoutData): boolean {
        let wordWidth = 0;
        for (let ctr = 0, l = layout.linesWidth.length; ctr < l; ++ctr) {
            wordWidth = layout.linesWidth[ctr];
            if (wordWidth > outputLayoutData.nodeContentSize.width) return true;
        }
        return false;
    }

    private _shrinkLabelToContentSize (
        style: TextStyle,
        layout: TextLayout,
        outputLayoutData: TextOutputLayoutData,
        inputString: string,
        lambda: (style: TextStyle, layout: TextLayout, outputLayoutData: TextOutputLayoutData,
            inputString: string, process: TextProcessing) => boolean,
    ): void {
        const fontSize = style.actualFontSize;

        let left = 0;
        let right = fontSize | 0;
        let mid = 0;
        while (left < right) {
            mid = (left + right + 1) >> 1;

            const newFontSize = mid;
            if (newFontSize <= 0) {
                break;
            }

            style.bmfontScale = newFontSize / (style.originFontSize * this._fontScale);

            this._multilineTextWrap(style, layout, outputLayoutData, inputString, this._getFirstWordLen);

            this._computeAlignmentOffset(style, layout, outputLayoutData);

            if (lambda(style, layout, outputLayoutData, inputString, this)) {
                right = mid - 1;
            } else {
                left = mid;
            }
        }

        if (left >= 0) {
            this._scaleFontSizeDown(style, layout, outputLayoutData, inputString, left);
        }
    }

    private _scaleFontSizeDown (
        style: TextStyle,
        layout: TextLayout,
        outputLayoutData: TextOutputLayoutData,
        inputString: string,
        fontSize: number,
    ): void {
        let shouldUpdateContent = true;
        if (!fontSize) {
            fontSize = 0.1;
            shouldUpdateContent = false;
        }
        style.actualFontSize = fontSize;

        if (shouldUpdateContent) {
            this._updateFontScale(style);
            this._multilineTextWrap(style, layout, outputLayoutData, inputString, this._getFirstWordLen);
        }
    }

    private _updateQuads (
        style: TextStyle,
        layout: TextLayout,
        outputLayoutData: TextOutputLayoutData,
        outputRenderData: TextOutputRenderData,
        inputString: string,
        callback,
    ): boolean {
        const texture =  style.spriteFrame ? style.spriteFrame.texture : shareLabelInfo.fontAtlas!.getTexture();

        const appX = outputRenderData.uiTransAnchorX * outputLayoutData.nodeContentSize.width;
        const appY = outputRenderData.uiTransAnchorY * outputLayoutData.nodeContentSize.height;

        const ret = true;
        const _length = getSymbolLength(inputString);
        for (let ctr = 0, l = _length; ctr < l; ++ctr) {
            const letterInfo = this._lettersInfo[ctr];
            if (!letterInfo.valid) { continue; }
            const letterDef = shareLabelInfo.fontAtlas!.getLetter(letterInfo.hash);
            if (!letterDef) {
                warnID(16353);
                continue;
            }

            this._tmpRect.height = letterDef.h;
            this._tmpRect.width = letterDef.w;
            this._tmpRect.x = letterDef.u;
            this._tmpRect.y = letterDef.v;

            let py = letterInfo.y + layout.letterOffsetY;

            if (layout.textHeightTemp > 0) {
                if (py > layout.tailoredTopY) {
                    const clipTop = py - layout.tailoredTopY;
                    this._tmpRect.y += clipTop;
                    this._tmpRect.height -= clipTop;
                    py -= clipTop;
                }

                if ((py - this._tmpRect.height * style.bmfontScale < layout.tailoredBottomY) && layout.overFlow === Overflow.CLAMP as number) {
                    this._tmpRect.height = (py < layout.tailoredBottomY) ? 0 : (py - layout.tailoredBottomY) / style.bmfontScale;
                }
            }

            const lineIndex = letterInfo.line;
            const px = letterInfo.x + letterDef.w / 2 * style.bmfontScale + layout.linesOffsetX[lineIndex];

            if (layout.textWidthTemp > 0) {
                if (this._isHorizontalClamped(layout, outputLayoutData, px, lineIndex)) {
                    if (layout.overFlow === Overflow.CLAMP as number) {
                        this._tmpRect.width = 0;
                    }
                }
            }

            if (this._tmpRect.height > 0 && this._tmpRect.width > 0) {
                const isRotated = this._determineRect(style);
                const letterPositionX = letterInfo.x + layout.linesOffsetX[letterInfo.line];
                const offset = outputRenderData.quadCount;
                outputRenderData.quadCount += 4; // Hard Code
                this.updateQuatCount(outputRenderData);
                callback(style, outputLayoutData, outputRenderData, offset, texture, this._tmpRect, isRotated, letterPositionX - appX, py - appY);
            }
        }
        return ret;
    }

    private _isHorizontalClamped (layout: TextLayout, outputLayoutData: TextOutputLayoutData, px: number, lineIndex: number): boolean {
        const wordWidth = layout.linesWidth[lineIndex];
        const letterOverClamp = (px > outputLayoutData.nodeContentSize.width || px < 0);

        if (!layout.wrapping) {
            return letterOverClamp;
        } else {
            return (wordWidth > outputLayoutData.nodeContentSize.width && letterOverClamp);
        }
    }

    private _determineRect (style: TextStyle): boolean {
        const _spriteFrame = style.spriteFrame;
        if (!_spriteFrame) return false; // for char mode
        const isRotated = _spriteFrame.isRotated();

        const originalSize = _spriteFrame.getOriginalSize();
        const rect = _spriteFrame.getRect();
        const offset = _spriteFrame.getOffset();
        const trimmedLeft = offset.x + (originalSize.width - rect.width) / 2;
        const trimmedTop = offset.y - (originalSize.height - rect.height) / 2;

        if (!isRotated) {
            this._tmpRect.x += (rect.x - trimmedLeft);
            this._tmpRect.y += (rect.y + trimmedTop);
        } else {
            const originalX = this._tmpRect.x;
            this._tmpRect.x = rect.x + rect.height - this._tmpRect.y - this._tmpRect.height - trimmedTop;
            this._tmpRect.y = originalX + rect.y - trimmedLeft;
            if (this._tmpRect.y < 0) {
                this._tmpRect.height += trimmedTop;
            }
        }

        return isRotated;
    }

    // -------------------- Multiple Quad Mode Part --------------------
}

TextProcessing.instance = new TextProcessing();
