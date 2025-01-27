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

import { Color, Vec4, clamp } from '../../core';
import { RenderData } from '../renderer/render-data';
import { IBatcher } from '../renderer/i-batcher';
import { Node } from '../../scene-graph/node';
import { FormatInfos } from '../../gfx';

const _col = new Vec4();

export function fillMeshVertices3D(node: Node, renderer: IBatcher, renderData: RenderData, color: Color): void {
    const chunk = renderData.chunk;
    const dataList = renderData.data;
    const vData = chunk.vb;
    const vertexCount = renderData.vertexCount;
    const m = node.worldMatrix;

    const m00 = m.m00; const m01 = m.m01; const m02 = m.m02; const m03 = m.m03;
    const m04 = m.m04; const m05 = m.m05; const m06 = m.m06; const m07 = m.m07;
    const m12 = m.m12; const m13 = m.m13; const m14 = m.m14; const m15 = m.m15;

    // convert to 0 ~ 1
    _col.set(color.r / 255, color.g / 255, color.b / 255, color.a / 255);

    let vertexOffset = 0;
    for (let i = 0; i < vertexCount; ++i) {
        const vert = dataList[i];
        const x = vert.x;
        const y = vert.y;
        let rhw = m03 * x + m07 * y + m15;
        rhw = rhw ? 1 / rhw : 1;
        vData[vertexOffset + 0] = (m00 * x + m04 * y + m12) * rhw;
        vData[vertexOffset + 1] = (m01 * x + m05 * y + m13) * rhw;
        vData[vertexOffset + 2] = (m02 * x + m06 * y + m14) * rhw;
        Vec4.toArray(vData, _col, vertexOffset + 5);
        vertexOffset += renderData.floatStride;
    }

    // fill index data
    const bid = chunk.bufferId;
    const vid = chunk.vertexOffset;
    const meshBuffer = chunk.meshBuffer;
    const ib = chunk.meshBuffer.iData;
    let indexOffset = meshBuffer.indexOffset;
    for (let i = 0, count = vertexCount / 4; i < count; i++) {
        const start = vid + i * 4;
        ib[indexOffset++] = start;
        ib[indexOffset++] = start + 1;
        ib[indexOffset++] = start + 2;
        ib[indexOffset++] = start + 1;
        ib[indexOffset++] = start + 3;
        ib[indexOffset++] = start + 2;
    }
    meshBuffer.indexOffset += renderData.indexCount;
    meshBuffer.setDirty();
}

export function updateOpacity(renderData: RenderData, opacity: number): void {
    const vfmt = renderData.vertexFormat;
    const vb = renderData.chunk.vb;
    let attr; let format; let stride;
    // Color component offset
    let offset = 0;
    for (let i = 0; i < vfmt.length; ++i) {
        attr = vfmt[i];
        format = FormatInfos[attr.format];
        if (format.hasAlpha) {
            stride = renderData.floatStride;
            if (format.size / format.count === 1) {
                const alpha = ~~clamp(Math.round(opacity * 255), 0, 255);
                // Uint color RGBA8
                for (let color = offset; color < vb.length; color += stride) {
                    vb[color] = ((vb[color] & 0xffffff00) | alpha) >>> 0;
                }
            } else if (format.size / format.count === 4) {
                // RGBA32 color, alpha at position 3
                for (let alpha = offset + 3; alpha < vb.length; alpha += stride) {
                    vb[alpha] = opacity;
                }
            }
        }
        offset += format.size >> 2;
    }
}
