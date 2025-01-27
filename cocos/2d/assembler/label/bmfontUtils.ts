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

import { JSB } from 'internal:constants';
import { IConfig, FontAtlas, type BitmapFont } from '../../assets/bitmap-font';
import { SpriteFrame } from '../../assets/sprite-frame';
import { Rect, errorID } from '../../../core';
import { Label, Overflow, CacheMode } from '../../components/label';
import { UITransform } from '../../framework/ui-transform';
import { LetterAtlas, shareLabelInfo } from './font-utils';
import { dynamicAtlasManager } from '../../utils/dynamic-atlas/atlas-manager';
import { TextProcessing } from './text-processing';
import { TextOutputLayoutData, TextOutputRenderData } from './text-output-data';
import { TextStyle } from './text-style';
import { TextLayout } from './text-layout';
import { view } from '../../../ui/view';

const _defaultLetterAtlas = new LetterAtlas(64, 64);
const _defaultFontAtlas = new FontAtlas(null);

let _comp: Label | null = null;
let _uiTrans: UITransform | null = null;

let _fntConfig: IConfig | null = null;
let _spriteFrame: SpriteFrame | null = null;
let QUAD_INDICES: Uint16Array | null = null;

export class BmfontUtils {
    updateProcessingData (
        style: TextStyle,
        layout: TextLayout,
        outputLayoutData: TextOutputLayoutData,
        outputRenderData: TextOutputRenderData,
        comp: Label,
        trans: UITransform,
    ): void {
        style.fontSize = comp.fontSize;
        style.actualFontSize = comp.fontSize;
        style.originFontSize = _fntConfig ? _fntConfig.fontSize : comp.fontSize;
        layout.horizontalAlign = comp.horizontalAlign;
        layout.verticalAlign = comp.verticalAlign;
        layout.spacingX = comp.spacingX;
        const overflow = comp.overflow;
        layout.overFlow = overflow;
        layout.lineHeight = comp.lineHeight;

        outputLayoutData.nodeContentSize.width = trans.width;
        outputLayoutData.nodeContentSize.height = trans.height;

        // should wrap text
        if (overflow === Overflow.NONE) {
            layout.wrapping = false;
            outputLayoutData.nodeContentSize.width += shareLabelInfo.margin * 2;
            outputLayoutData.nodeContentSize.height += shareLabelInfo.margin * 2;
        } else if (overflow === Overflow.RESIZE_HEIGHT) {
            layout.wrapping = true;
            outputLayoutData.nodeContentSize.height += shareLabelInfo.margin * 2;
        } else {
            layout.wrapping = comp.enableWrapText;
        }
        outputRenderData.uiTransAnchorX = trans.anchorX;
        outputRenderData.uiTransAnchorY = trans.anchorY;

        shareLabelInfo.lineHeight = comp.lineHeight;
        shareLabelInfo.fontSize = comp.fontSize;

        style.spriteFrame = _spriteFrame;
        style.fntConfig = _fntConfig;
        style.fontFamily = shareLabelInfo.fontFamily;

        style.color.set(comp.color);
    }

    updateRenderData (comp: Label): void {
        if (!comp.renderData) {
            return;
        }

        if (_comp === comp) { return; }

        if (comp.renderData.vertDirty) {
            _comp = comp;
            _uiTrans = _comp.node._getUITransformComp()!;
            const renderData = comp.renderData;

            const processing = TextProcessing.instance;
            const style = comp.textStyle;
            const layout = comp.textLayout;
            const outputLayoutData = comp.textLayoutData;
            const outputRenderData = comp.textRenderData;
            style.fontScale = view.getScaleX();
            this._updateFontFamily(comp);

            this.updateProcessingData(style, layout, outputLayoutData, outputRenderData, comp, _uiTrans);

            this._updateLabelInfo(comp);

            style.fontDesc = shareLabelInfo.fontDesc;

            // TextProcessing
            processing.processingString(true, style, layout, outputLayoutData, comp.string);
            // generateVertex
            outputRenderData.quadCount = 0;
            processing.generateRenderInfo(
                true,
                style,
                layout,
                outputLayoutData,
                outputRenderData,
                comp.string,
                this.generateVertexData,
            );
            let isResized = false;
            if (renderData.dataLength !== outputRenderData.quadCount) {
                this.resetRenderData(comp);
                renderData.dataLength = outputRenderData.quadCount;
                renderData.resize(renderData.dataLength, renderData.dataLength / 2 * 3);
                isResized = true;
            }
            const datalist = renderData.data;
            for (let i = 0, l = outputRenderData.quadCount; i < l; i++) {
                datalist[i] = outputRenderData.vertexBuffer[i];
            }

            const indexCount = renderData.indexCount;
            this.createQuadIndices(indexCount);
            renderData.chunk.setIndexBuffer(QUAD_INDICES!);

            _comp.actualFontSize = style.actualFontSize;
            _uiTrans.setContentSize(outputLayoutData.nodeContentSize);
            this.updateUVs(comp);// dirty need
            // It is reasonable that the '_comp.node._uiProps.colorDirty' interface should be used.
            // But this function is not called when just modifying the opacity.
            // So the value of '_comp.node._uiProps.colorDirty' does not change.
            // And _uiProps.colorDirty is synchronized with renderEntity.colorDirty.
            if (JSB && (_comp.renderEntity.colorDirty || isResized)) {
                this.updateColor(comp); // dirty need
                _comp.node._uiProps.colorDirty = false;
            }

            renderData.vertDirty = false;
            _comp = null;

            this._resetProperties();
        }

        if (comp.spriteFrame) {
            const renderData = comp.renderData;
            renderData.updateRenderData(comp, comp.spriteFrame);
        }
    }

    updateUVs (label: Label): void {
        const renderData = label.renderData!;
        const vData = renderData.chunk.vb;
        const vertexCount = renderData.vertexCount;
        const stride = renderData.floatStride;
        const dataList = renderData.data;
        let vertexOffset = 3;
        for (let i = 0; i < vertexCount; i++) {
            const vert = dataList[i];
            vData[vertexOffset] = vert.u;
            vData[vertexOffset + 1] = vert.v;
            vertexOffset += stride;
        }
    }

    updateColor (label: Label): void {
        if (JSB) {
            const renderData = label.renderData!;
            const vertexCount = renderData.vertexCount;
            if (vertexCount === 0) return;
            const vData = renderData.chunk.vb;
            const stride = renderData.floatStride;
            let colorOffset = 5;
            const color = label.color;
            const colorR = color.r / 255;
            const colorG = color.g / 255;
            const colorB = color.b / 255;
            const colorA = color.a / 255;
            for (let i = 0; i < vertexCount; i++) {
                vData[colorOffset] = colorR;
                vData[colorOffset + 1] = colorG;
                vData[colorOffset + 2] = colorB;
                vData[colorOffset + 3] = colorA;
                colorOffset += stride;
            }
        }
    }

    protected resetRenderData (comp: Label): void {
        const renderData = comp.renderData!;
        renderData.dataLength = 0;
        renderData.resize(0, 0);
    }

    // callBack function
    protected generateVertexData (
        style: TextStyle,
        outputLayoutData: TextOutputLayoutData,
        outputRenderData: TextOutputRenderData,
        offset: number,
        spriteFrame: SpriteFrame,
        rect: Rect,
        rotated: boolean,
        x: number,
        y: number,
    ): void {
        const dataOffset = offset;
        const scale = style.bmfontScale;

        const dataList = outputRenderData.vertexBuffer;
        const texW = spriteFrame.width;
        const texH = spriteFrame.height;

        const rectWidth = rect.width;
        const rectHeight = rect.height;

        let l = 0;
        let b = 0;
        let t = 0;
        let r = 0;
        if (!rotated) {
            l = (rect.x) / texW;
            r = (rect.x + rectWidth) / texW;
            b = (rect.y + rectHeight) / texH;
            t = (rect.y) / texH;

            dataList[dataOffset].u = l;
            dataList[dataOffset].v = b;
            dataList[dataOffset + 1].u = r;
            dataList[dataOffset + 1].v = b;
            dataList[dataOffset + 2].u = l;
            dataList[dataOffset + 2].v = t;
            dataList[dataOffset + 3].u = r;
            dataList[dataOffset + 3].v = t;
        } else {
            l = (rect.x) / texW;
            r = (rect.x + rectHeight) / texW;
            b = (rect.y + rectWidth) / texH;
            t = (rect.y) / texH;

            dataList[dataOffset].u = l;
            dataList[dataOffset].v = t;
            dataList[dataOffset + 1].u = l;
            dataList[dataOffset + 1].v = b;
            dataList[dataOffset + 2].u = r;
            dataList[dataOffset + 2].v = t;
            dataList[dataOffset + 3].u = r;
            dataList[dataOffset + 3].v = b;
        }

        dataList[dataOffset].x = x;
        dataList[dataOffset].y = y - rectHeight * scale;
        dataList[dataOffset + 1].x = x + rectWidth * scale;
        dataList[dataOffset + 1].y = y - rectHeight * scale;
        dataList[dataOffset + 2].x = x;
        dataList[dataOffset + 2].y = y;
        dataList[dataOffset + 3].x = x + rectWidth * scale;
        dataList[dataOffset + 3].y = y;
    }

    protected _updateFontFamily (comp: Label): void {
        const fontAsset = comp.font as BitmapFont;
        _spriteFrame = fontAsset.spriteFrame;
        _fntConfig = fontAsset.fntConfig;
        shareLabelInfo.fontAtlas = fontAsset.fontDefDictionary;
        if (!shareLabelInfo.fontAtlas) {
            if (comp.cacheMode === CacheMode.CHAR) {
                shareLabelInfo.fontAtlas = _defaultLetterAtlas;
            } else {
                shareLabelInfo.fontAtlas = _defaultFontAtlas;
            }
        }

        dynamicAtlasManager.packToDynamicAtlas(comp, _spriteFrame);
        // TODO update material and uv
    }

    protected _updateLabelInfo (comp: Label): void {
        // clear
        shareLabelInfo.hash = '';
        shareLabelInfo.margin = 0;
    }

    protected _resetProperties (): void {
        _fntConfig = null;
        _spriteFrame = null;
        shareLabelInfo.hash = '';
        shareLabelInfo.margin = 0;
    }

    protected createQuadIndices (indexCount: number): void {
        if (indexCount % 6 !== 0) {
            errorID(16308);
            return;
        }
        const quadCount = indexCount / 6;
        QUAD_INDICES = new Uint16Array(indexCount);
        let offset = 0;
        for (let i = 0; i < quadCount; i++) {
            QUAD_INDICES[offset++] = 0 + i * 4;
            QUAD_INDICES[offset++] = 1 + i * 4;
            QUAD_INDICES[offset++] = 2 + i * 4;
            QUAD_INDICES[offset++] = 1 + i * 4;
            QUAD_INDICES[offset++] = 3 + i * 4;
            QUAD_INDICES[offset++] = 2 + i * 4;
        }
    }
}
