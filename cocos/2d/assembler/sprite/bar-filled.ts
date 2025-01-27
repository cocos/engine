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

import {  Mat4, errorID } from '../../../core';
import type { IRenderData, RenderData } from '../../renderer/render-data';
import type { IBatcher } from '../../renderer/i-batcher';
import { Sprite } from '../../components';
import type { IAssembler } from '../../renderer/base';
import { dynamicAtlasManager } from '../../utils/dynamic-atlas/atlas-manager';
import type { StaticVBChunk } from '../../renderer/static-vb-accessor';

const FillType = Sprite.FillType;
const m = new Mat4();
const QUAD_INDICES = Uint16Array.from([0, 1, 2, 1, 3, 2]);

/**
 * barFilled 组装器
 * 可通过 `UI.barFilled` 获取该组装器。
 */
class BarFilled implements IAssembler {
    updateRenderData (sprite: Sprite): void {
        const frame = sprite.spriteFrame;
        dynamicAtlasManager.packToDynamicAtlas(sprite, frame);
        // TODO update material and uv

        const renderData = sprite.renderData;
        if (renderData && frame) {
            const vertDirty = renderData.vertDirty;

            if (!vertDirty) {
                return;
            }

            let fillStart = sprite.fillStart;
            let fillRange = sprite.fillRange;
            if (fillRange < 0) {
                fillStart += fillRange;
                fillRange = -fillRange;
            }
            fillRange = fillStart + fillRange;
            fillStart = fillStart > 1.0 ? 1.0 : fillStart;
            fillStart = fillStart < 0.0 ? 0.0 : fillStart;
            fillRange = fillRange > 1.0 ? 1.0 : fillRange;
            fillRange = fillRange < 0.0 ? 0.0 : fillRange;
            fillRange -= fillStart;
            fillRange = fillRange < 0 ? 0 : fillRange;
            let fillEnd = fillStart + fillRange;
            fillEnd = fillEnd > 1 ? 1 : fillEnd;

            this.updateUVs(sprite, fillStart, fillEnd); // need Dirty
            this.updateVertexData(sprite, fillStart, fillEnd);
            renderData.updateRenderData(sprite, frame);
        }
    }

    updateUVs (sprite: Sprite, fillStart: number, fillEnd: number): void {
        const spriteFrame = sprite.spriteFrame!;
        const renderData = sprite.renderData!;
        const vData = renderData.chunk.vb;

        // build uvs
        const atlasWidth = spriteFrame.width;
        const atlasHeight = spriteFrame.height;
        const textureRect = spriteFrame.rect;
        // uv computation should take spriteSheet into account.
        let ul = 0;
        let vb = 0;
        let ur = 0;
        let vt = 0;
        let quadUV0 = 0;
        let quadUV1 = 0;
        let quadUV2 = 0;
        let quadUV3 = 0;
        let quadUV4 = 0;
        let quadUV5 = 0;
        let quadUV6 = 0;
        let quadUV7 = 0;
        if (spriteFrame.isRotated()) {
            ul = (textureRect.x) / atlasWidth;
            vb = (textureRect.y + textureRect.width) / atlasHeight;
            ur = (textureRect.x + textureRect.height) / atlasWidth;
            vt = (textureRect.y) / atlasHeight;

            quadUV0 = quadUV2 = ul;
            quadUV4 = quadUV6 = ur;
            quadUV3 = quadUV7 = vb;
            quadUV1 = quadUV5 = vt;
        } else {
            ul = (textureRect.x) / atlasWidth;
            vb = (textureRect.y + textureRect.height) / atlasHeight;
            ur = (textureRect.x + textureRect.width) / atlasWidth;
            vt = (textureRect.y) / atlasHeight;

            quadUV0 = quadUV4 = ul;
            quadUV2 = quadUV6 = ur;
            quadUV1 = quadUV3 = vb;
            quadUV5 = quadUV7 = vt;
        }

        const stride = renderData.floatStride;
        let uvOffset = 3;
        switch (sprite.fillType) {
        case FillType.HORIZONTAL:
            vData[uvOffset] = quadUV0 + (quadUV2 - quadUV0) * fillStart;
            vData[uvOffset + 1] = quadUV1 + (quadUV3 - quadUV1) * fillStart;
            uvOffset += stride;
            vData[uvOffset] = quadUV0 + (quadUV2 - quadUV0) * fillEnd;
            vData[uvOffset + 1] = quadUV1 + (quadUV3 - quadUV1) * fillEnd;
            uvOffset += stride;
            vData[uvOffset] = quadUV4 + (quadUV6 - quadUV4) * fillStart;
            vData[uvOffset + 1] = quadUV5 + (quadUV7 - quadUV5) * fillStart;
            uvOffset += stride;
            vData[uvOffset] = quadUV4 + (quadUV6 - quadUV4) * fillEnd;
            vData[uvOffset + 1] = quadUV5 + (quadUV7 - quadUV5) * fillEnd;
            break;
        case FillType.VERTICAL:
            vData[uvOffset] = quadUV0 + (quadUV4 - quadUV0) * fillStart;
            vData[uvOffset + 1] = quadUV1 + (quadUV5 - quadUV1) * fillStart;
            uvOffset += stride;
            vData[uvOffset] = quadUV2 + (quadUV6 - quadUV2) * fillStart;
            vData[uvOffset + 1] = quadUV3 + (quadUV7 - quadUV3) * fillStart;
            uvOffset += stride;
            vData[uvOffset] = quadUV0 + (quadUV4 - quadUV0) * fillEnd;
            vData[uvOffset + 1] = quadUV1 + (quadUV5 - quadUV1) * fillEnd;
            uvOffset += stride;
            vData[uvOffset] = quadUV2 + (quadUV6 - quadUV2) * fillEnd;
            vData[uvOffset + 1] = quadUV3 + (quadUV7 - quadUV3) * fillEnd;
            break;
        default:
            errorID(2626);
            break;
        }
    }

    private updateVertexData (sprite: Sprite, fillStart: number, fillEnd: number): void {
        const renderData: RenderData | null = sprite.renderData;
        const dataList: IRenderData[] = renderData!.data;
        const uiTrans = sprite.node._getUITransformComp()!;
        const width = uiTrans.width;
        const height = uiTrans.height;
        const appX = uiTrans.anchorX * width;
        const appY = uiTrans.anchorY * height;

        let l = -appX;
        let b = -appY;
        let r = width - appX;
        let t = height - appY;

        let progressStart = 0;
        let progressEnd = 0;
        switch (sprite.fillType) {
        case FillType.HORIZONTAL:
            progressStart = l + (r - l) * fillStart;
            progressEnd = l + (r - l) * fillEnd;

            l = progressStart;
            r = progressEnd;
            break;
        case FillType.VERTICAL:
            progressStart = b + (t - b) * fillStart;
            progressEnd = b + (t - b) * fillEnd;

            b = progressStart;
            t = progressEnd;
            break;
        default:
            errorID(2626);
            break;
        }

        dataList[0].x = l;
        dataList[0].y = b;
        dataList[1].x = r;
        dataList[1].y = b;
        dataList[2].x = l;
        dataList[2].y = t;
        dataList[3].x = r;
        dataList[3].y = t;
    }

    createData (sprite: Sprite): RenderData {
        const renderData: RenderData | null = sprite.requestRenderData();
        // 0-4 for local vertex
        renderData.dataLength = 4;
        renderData.resize(4, 6);
        renderData.chunk.setIndexBuffer(QUAD_INDICES);

        // not need
        renderData.data.forEach((data) => { data.z = 0; });
        return renderData;
    }

    private updateWorldVertexData (sprite: Sprite, chunk: StaticVBChunk): void {
        const node = sprite.node;
        node.getWorldMatrix(m);

        const renderData = sprite.renderData!;
        const stride = renderData.floatStride;
        const dataList = sprite.renderData!.data;
        const vData = chunk.vb;

        let offset = 0;
        for (let i = 0; i < 4; i++) {
            const local = dataList[i];
            const x = local.x;
            const y = local.y;
            let rhw = m.m03 * x + m.m07 * y + m.m15;
            rhw = rhw ? 1 / rhw : 1;

            offset = i * stride;
            vData[offset] = (m.m00 * x + m.m04 * y + m.m12) * rhw;
            vData[offset + 1] = (m.m01 * x + m.m05 * y + m.m13) * rhw;
            vData[offset + 2] = (m.m02 * x + m.m06 * y + m.m14) * rhw;
        }
    }

    fillBuffers (sprite: Sprite, renderer: IBatcher): void {
        const renderData: RenderData = sprite.renderData!;
        const chunk = renderData.chunk;
        if (sprite._flagChangedVersion !== sprite.node.flagChangedVersion || renderData.vertDirty) {
            this.updateWorldVertexData(sprite, chunk);
            renderData.vertDirty = false;
            sprite._flagChangedVersion = sprite.node.flagChangedVersion;
        }

        const bid = chunk.bufferId;
        const vid = chunk.vertexOffset;
        const meshBuffer = chunk.meshBuffer;
        const ib = chunk.meshBuffer.iData;
        let indexOffset = meshBuffer.indexOffset;
        ib[indexOffset++] = vid;
        ib[indexOffset++] = vid + 1;
        ib[indexOffset++] = vid + 2;
        ib[indexOffset++] = vid + 2;
        ib[indexOffset++] = vid + 1;
        ib[indexOffset++] = vid + 3;
        meshBuffer.indexOffset += 6;
    }

    updateColor (sprite: Sprite): void {
        const renderData = sprite.renderData!;
        const vData = renderData.chunk.vb;
        const stride = renderData.floatStride;
        let colorOffset = 5;
        const color = sprite.color;
        const colorR = color.r / 255;
        const colorG = color.g / 255;
        const colorB = color.b / 255;
        const colorA = sprite.node._uiProps.opacity;
        for (let i = 0; i < 4; i++) {
            vData[colorOffset] = colorR;
            vData[colorOffset + 1] = colorG;
            vData[colorOffset + 2] = colorB;
            vData[colorOffset + 3] = colorA;

            colorOffset += stride;
        }
    }
}

export const barFilled = new BarFilled();
