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

import { Color } from '../../../core';
import type { IRenderData, RenderData } from '../../renderer/render-data';
import type { IBatcher } from '../../renderer/i-batcher';
import type { Sprite } from '../../components';
import type { IAssembler } from '../../renderer/base';
import { dynamicAtlasManager } from '../../utils/dynamic-atlas/atlas-manager';
import type { StaticVBChunk } from '../../renderer/static-vb-accessor';

const tempRenderData: IRenderData[] = [];
for (let i = 0; i < 4; i++) {
    tempRenderData.push({ x: 0, y: 0, z: 0, u: 0, v: 0, color: new Color() });
}

/**
 * sliced 组装器
 * 可通过 `UI.sliced` 获取该组装器。
 */
class Sliced implements IAssembler {
    private QUAD_INDICES!: Uint16Array;

    createData (sprite: Sprite): RenderData {
        const renderData: RenderData | null = sprite.requestRenderData()!;
        // 0-4 for local vertex
        renderData.dataLength = 16;
        renderData.resize(16, 54);
        const quadIndices = this.QUAD_INDICES = new Uint16Array(54);
        this.createQuadIndices(4, 4);
        renderData.chunk.setIndexBuffer(quadIndices);
        return renderData;
    }

    private createQuadIndices (vertexRow: number, vertexCol: number): void {
        let offset = 0;
        const quadIndices = this.QUAD_INDICES;
        for (let curRow = 0; curRow < vertexRow - 1; curRow++) {
            for (let curCol = 0; curCol < vertexCol - 1; curCol++) {
                // vid is the index of the left bottom vertex in each rect.
                const vid = curRow * vertexCol + curCol;

                // left bottom
                quadIndices[offset++] = vid;
                // right bottom
                quadIndices[offset++] = vid + 1;
                // left top
                quadIndices[offset++] = vid + vertexCol;

                // right bottom
                quadIndices[offset++] = vid + 1;
                // right top
                quadIndices[offset++] = vid + 1 + vertexCol;
                // left top
                quadIndices[offset++] = vid + vertexCol;
            }
        }
    }

    updateRenderData (sprite: Sprite): void {
        const frame = sprite.spriteFrame;

        // TODO: Material API design and export from editor could affect the material activation process
        // need to update the logic here
        // if (frame) {
        //     if (!frame._original && dynamicAtlasManager) {
        //         dynamicAtlasManager.insertSpriteFrame(frame);
        //     }
        //     if (sprite._material._texture !== frame._texture) {
        //         sprite._activateMaterial();
        //     }
        // }
        dynamicAtlasManager.packToDynamicAtlas(sprite, frame);
        // TODO update material and uv
        this.updateUVs(sprite); // dirty need
        //this.updateColor(sprite); // dirty need

        const renderData = sprite.renderData;
        if (renderData && frame) {
            const vertDirty = renderData.vertDirty;
            if (vertDirty) {
                this.updateVertexData(sprite);
            }
            renderData.updateRenderData(sprite, frame);
        }
    }

    private updateVertexData (sprite: Sprite): void {
        const renderData = sprite.renderData;
        if (!renderData) return;
        const dataList: IRenderData[] = renderData.data;
        const uiTrans = sprite.node._getUITransformComp()!;
        const width = uiTrans.width;
        const height = uiTrans.height;
        const appX = uiTrans.anchorX * width;
        const appY = uiTrans.anchorY * height;

        const frame = sprite.spriteFrame!;
        const leftWidth = frame.insetLeft;
        const rightWidth = frame.insetRight;
        const topHeight = frame.insetTop;
        const bottomHeight = frame.insetBottom;

        let sizableWidth = width - leftWidth - rightWidth;
        let sizableHeight = height - topHeight - bottomHeight;
        let xScale = width / (leftWidth + rightWidth);
        let yScale = height / (topHeight + bottomHeight);
        xScale = (Number.isNaN(xScale) || xScale > 1) ? 1 : xScale;
        yScale = (Number.isNaN(yScale) || yScale > 1) ? 1 : yScale;
        sizableWidth = sizableWidth < 0 ? 0 : sizableWidth;
        sizableHeight = sizableHeight < 0 ? 0 : sizableHeight;

        tempRenderData[0].x = -appX;
        tempRenderData[0].y = -appY;
        tempRenderData[1].x = leftWidth * xScale - appX;
        tempRenderData[1].y = bottomHeight * yScale - appY;
        tempRenderData[2].x = tempRenderData[1].x + sizableWidth;
        tempRenderData[2].y = tempRenderData[1].y + sizableHeight;
        tempRenderData[3].x = width - appX;
        tempRenderData[3].y = height - appY;

        for (let curRow = 0; curRow < 4; curRow++) {
            for (let curCol = 0; curCol < 4; curCol++) {
                const curIndex = curRow * 4 + curCol;
                if (curIndex < renderData.dataLength
                    && curRow < tempRenderData.length
                    && curCol < tempRenderData.length) {
                    dataList[curIndex].x = tempRenderData[curCol].x;
                    dataList[curIndex].y = tempRenderData[curRow].y;
                }
            }
        }
    }

    fillBuffers (sprite: Sprite, renderer: IBatcher): void {
        const renderData = sprite.renderData;
        if (!renderData) return;
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
        for (let r = 0; r < 3; ++r) {
            for (let c = 0; c < 3; ++c) {
                const start = vid + r * 4 + c;
                ib[indexOffset++] = start;
                ib[indexOffset++] = start + 1;
                ib[indexOffset++] = start + 4;
                ib[indexOffset++] = start + 1;
                ib[indexOffset++] = start + 5;
                ib[indexOffset++] = start + 4;
            }
        }
        meshBuffer.indexOffset = indexOffset;
    }

    private updateWorldVertexData (sprite: Sprite, chunk: StaticVBChunk): void {
        const renderData = sprite.renderData;
        if (!renderData) return;
        const stride = renderData.floatStride;
        const dataList: IRenderData[] = renderData.data;
        const vData = chunk.vb;
        const node = sprite.node;
        const m = node.worldMatrix;

        const m00 = m.m00; const m01 = m.m01; const m02 = m.m02; const m03 = m.m03;
        const m04 = m.m04; const m05 = m.m05; const m06 = m.m06; const m07 = m.m07;
        const m12 = m.m12; const m13 = m.m13; const m14 = m.m14; const m15 = m.m15;

        let offset = 0;
        for (let row = 0; row < 4; ++row) {
            const rowD = dataList[row * 4];
            for (let col = 0; col < 4; ++col) {
                const colD = dataList[col];
                const x = colD.x;
                const y = rowD.y;
                let rhw = m03 * x + m07 * y + m15;
                rhw = rhw ? 1 / rhw : 1;

                offset = (row * 4 + col) * stride;
                vData[offset + 0] = (m00 * x + m04 * y + m12) * rhw;
                vData[offset + 1] = (m01 * x + m05 * y + m13) * rhw;
                vData[offset + 2] = (m02 * x + m06 * y + m14) * rhw;
            }
        }
    }

    updateUVs (sprite: Sprite): void {
        const renderData = sprite.renderData;
        if (!sprite.spriteFrame || !renderData) return;
        const vData = renderData.chunk.vb;
        const stride = renderData.floatStride;
        const uv = sprite.spriteFrame.uvSliced;
        let uvOffset = 3;
        for (let i = 0; i < 16; i++) {
            vData[uvOffset] = uv[i].u;
            vData[uvOffset + 1] = uv[i].v;
            uvOffset += stride;
        }
    }

    updateColor (sprite: Sprite): void {
        const renderData = sprite.renderData;
        if (!renderData) return;
        const vData = renderData.chunk.vb;
        const stride = renderData.floatStride;

        let colorOffset = 5;
        const color = sprite.color;
        const colorR = color.r / 255;
        const colorG = color.g / 255;
        const colorB = color.b / 255;
        const colorA = sprite.node._uiProps.opacity;
        for (let i = 0; i < 16; i++) {
            vData[colorOffset] = colorR;
            vData[colorOffset + 1] = colorG;
            vData[colorOffset + 2] = colorB;
            vData[colorOffset + 3] = colorA;
            colorOffset += stride;
        }
    }
}

export const sliced = new Sliced();
