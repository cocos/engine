/*
 Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

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

/**
 * ui-assembler 相关模块
 * @module ui-assembler
 */

import { Color } from '../../../core';
import type { IBatcher } from '../../renderer/i-batcher';
import type { Label } from '../../components/label';
import type { IAssembler } from '../../renderer/base';
import { TTFUtils } from './ttfUtils';
import type { IRenderData, RenderData } from '../../renderer/render-data';

const WHITE = Color.WHITE.clone();
const QUAD_INDICES = Uint16Array.from([0, 1, 2, 1, 3, 2]);

/**
 * ttf 组装器
 * 可通过 `UI.ttf` 获取该组装器。
 */
export class TTF extends TTFUtils implements IAssembler {
    createData (comp: Label): RenderData {
        const renderData = comp.requestRenderData()!;

        renderData.dataLength = 4;
        renderData.resize(4, 6);

        // hard code
        comp.textRenderData.quadCount = 4;

        const vData = renderData.chunk.vb;

        const stride = renderData.floatStride;
        const uvs = [
            { u: 0, v: 1 },
            { u: 1, v: 1 },
            { u: 0, v: 0 },
            { u: 1, v: 0 },
        ];
        let uvOffset = 3;
        for (let i = 0, len = renderData.dataLength; i < len; ++i) {
            vData[uvOffset] = uvs[i].u;
            vData[uvOffset + 1] = uvs[i].v;
            uvOffset += stride;
        }
        let offset = 5;
        for (let i = 0; i < renderData.dataLength; i++) {
            Color.toArray(vData, WHITE, offset);
            offset += stride;
        }
        renderData.chunk.setIndexBuffer(QUAD_INDICES);
        return renderData;
    }

    fillBuffers (comp: Label, renderer: IBatcher): void {
        const renderData = comp.renderData!;
        const chunk = renderData.chunk;
        const dataList: IRenderData[] = renderData.data;
        const node = comp.node;

        const vData = chunk.vb;

        // normal version
        const m = node.worldMatrix;
        const stride = renderData.floatStride;
        let offset = 0;
        const length = dataList.length;
        for (let i = 0; i < length; i++) {
            const curData = dataList[i];
            const x = curData.x;
            const y = curData.y;
            let rhw = m.m03 * x + m.m07 * y + m.m15;
            rhw = rhw ? 1 / rhw : 1;

            offset = i * stride;
            vData[offset + 0] = (m.m00 * x + m.m04 * y + m.m12) * rhw;
            vData[offset + 1] = (m.m01 * x + m.m05 * y + m.m13) * rhw;
            vData[offset + 2] = (m.m02 * x + m.m06 * y + m.m14) * rhw;
        }

        // quick version
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
        // slow version
        // const chunk = renderData.chunk;
        // renderer.getBufferAccessor().appendIndices(chunk);
    }

    updateVertexData (comp: Label): void {
        const renderData = comp.renderData;
        if (!renderData) {
            return;
        }
        const uiTrans = comp.node._getUITransformComp()!;
        const width = uiTrans.width;
        const height = uiTrans.height;
        const appX = uiTrans.anchorX * width;
        const appY = uiTrans.anchorY * height;

        const data = renderData.data;
        data[0].x = -appX; // l
        data[0].y = -appY; // b
        data[1].x = width - appX; // r
        data[1].y = -appY; // b
        data[2].x = -appX; // l
        data[2].y = height - appY; // t
        data[3].x = width - appX; // r
        data[3].y = height - appY; // t
    }

    updateUVs (comp: Label): void {
        const renderData = comp.renderData;
        if (!renderData || !comp.ttfSpriteFrame) {
            return;
        }
        const vData = renderData.chunk.vb;
        const uv = comp.ttfSpriteFrame.uv;
        const stride = renderData.floatStride;
        let uvOffset = 3;
        for (let i = 0; i < renderData.dataLength; ++i) {
            const index = i * 2;
            vData[uvOffset] = uv[index];
            vData[uvOffset + 1] = uv[index + 1];
            uvOffset += stride;
        }
    }

    updateColor (comp: Label): void {
        // no needs to update color
    }
}

export const ttf = new TTF();
