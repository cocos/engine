/*
 Copyright (c) 2017-2020 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
 worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
 not use Cocos Creator software for developing other software or tools that's
 used for developing games. You are not granted to publish, distribute,
 sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
*/

/**
 * @packageDocumentation
 * @module ui-assembler
 */

import { Color, Mat4, Vec3 } from '../../../core/math';
import { IRenderData, RenderData } from '../../renderer/render-data';
import { IBatcher } from '../../renderer/i-batcher';
import { Sprite } from '../../components';
import { IAssembler } from '../../renderer/base';
import { dynamicAtlasManager } from '../../utils/dynamic-atlas/atlas-manager';
import { StaticVBChunk } from '../../renderer/static-vb-accessor';
import zlib from '../../../../external/compression/zlib.min';

const vec3_temp = new Vec3();
const matrix = new Mat4();

/**
 * sliced 组装器
 * 可通过 `UI.sliced` 获取该组装器。
 */
export const sliced: IAssembler = {

    createData (sprite: Sprite) {
        const renderData: RenderData | null = sprite.requestRenderData()!;
        // 0-4 for local vertex
        renderData.dataLength = 16;
        renderData.resize(16, 54);
        renderData.vertexRow = 4;
        renderData.vertexCol = 4;
        return renderData;
    },

    updateRenderData (sprite: Sprite) {
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
        this.updateUVs(sprite);

        const renderData = sprite.renderData;
        if (renderData && frame) {
            const vertDirty = renderData.vertDirty;
            if (vertDirty) {
                this.updateVertexData(sprite);
            }
            renderData.updateRenderData(sprite, frame);
        }
    },

    updateVertexData (sprite: Sprite) {
        const renderData: RenderData = sprite.renderData!;
        const dataList: IRenderData[] = renderData.data;
        const uiTrans = sprite.node._uiProps.uiTransformComp!;
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

        // dataList[0].x = -appX;
        // dataList[0].y = -appY;
        // dataList[1].x = leftWidth * xScale - appX;
        // dataList[1].y = bottomHeight * yScale - appY;
        // dataList[2].x = dataList[1].x + sizableWidth;
        // dataList[2].y = dataList[1].y + sizableHeight;
        // dataList[3].x = width - appX;
        // dataList[3].y = height - appY;

        const tempList:IRenderData[] = [
            // { x: -appX, y: -appY, z: 0, u: 0, v: 0, color: new Color() },
            // { x: leftWidth * xScale - appX, y: bottomHeight * yScale - appY, z: 0, u: 0, v: 0, color: new Color() },
            // { x: leftWidth * xScale - appX + sizableWidth, y: bottomHeight * yScale - appY + sizableHeight, z: 0, u: 0, v: 0, color: new Color() },
            // { x: width - appX, y: height - appY, z: 0, u: 0, v: 0, color: new Color() },
        ];
        // initialize 4 elements
        for (let i = 0; i < 4; i++) {
            tempList.push({ x: 0, y: 0, z: 0, u: 0, v: 0, color: new Color() });
        }
        tempList[0].x = -appX;
        tempList[0].y = -appY;
        tempList[1].x = leftWidth * xScale - appX;
        tempList[1].y = bottomHeight * yScale - appY;
        tempList[2].x = tempList[1].x + sizableWidth;
        tempList[2].y = tempList[1].y + sizableHeight;
        tempList[3].x = width - appX;
        tempList[3].y = height - appY;

        for (let curRow = 0; curRow < renderData.vertexRow; curRow++) {
            for (let curCol = 0; curCol < renderData.vertexCol; curCol++) {
                const curIndex = curRow * renderData.vertexCol + curCol;
                if (curIndex < renderData.dataLength
                    && curRow < tempList.length
                    && curCol < tempList.length) {
                    dataList[curIndex].x = tempList[curCol].x;
                    dataList[curIndex].y = tempList[curRow].y;
                }
            }
        }
    },

    fillBuffers (sprite: Sprite, renderer: IBatcher) {
        const renderData: RenderData = sprite.renderData!;
        const chunk = renderData.chunk;
        if (sprite.node.hasChangedFlags || renderData.vertDirty) {
            this.updateWorldVertexData(sprite, chunk);
            renderData.vertDirty = false;
        }

        const bid = chunk.bufferId;
        let vid = chunk.vertexOffset;
        const meshBuffer = chunk.meshBuffer;
        const ib = chunk.meshBuffer.iData;
        let indexOffset = meshBuffer.indexOffset;
        // for (let r = 0; r < 3; ++r) {
        //     for (let c = 0; c < 3; ++c) {
        //         const start = vid + r * 4 + c;
        //         ib[indexOffset++] = start;
        //         ib[indexOffset++] = start + 1;
        //         ib[indexOffset++] = start + 4;
        //         ib[indexOffset++] = start + 1;
        //         ib[indexOffset++] = start + 5;
        //         ib[indexOffset++] = start + 4;
        //     }
        // }
        // meshBuffer.indexOffset = indexOffset;

        // rect count = vertex count - 1
        for (let curRow = 0; curRow < renderData.vertexRow - 1; curRow++) {
            for (let curCol = 0; curCol < renderData.vertexCol - 1; curCol++) {
                // vid is the index of the left bottom vertex in each rect.
                vid = curRow * renderData.vertexCol + curCol;

                // left bottom
                ib[indexOffset++] = vid;
                // right bottom
                ib[indexOffset++] = vid + 1;
                // left top
                ib[indexOffset++] = vid + renderData.vertexCol;

                // right bottom
                ib[indexOffset++] = vid + 1;
                // right top
                ib[indexOffset++] = vid + 1 + renderData.vertexCol;
                // left top
                ib[indexOffset++] = vid + renderData.vertexCol;

                // IndexOffset should add 6 when vertices of a rect are visited.
                meshBuffer.indexOffset += 6;
            }
        }
    },

    updateWorldVertexData (sprite: Sprite, chunk: StaticVBChunk) {
        const node = sprite.node;
        node.getWorldMatrix(matrix);

        const renderData = sprite.renderData!;
        const stride = renderData.floatStride;
        const dataList: IRenderData[] = renderData.data;
        const vData = chunk.vb;

        // let offset = 0;
        // for (let row = 0; row < 4; ++row) {
        //     const rowD = dataList[row];
        //     for (let col = 0; col < 4; ++col) {
        //         const colD = dataList[col];

        //         Vec3.set(vec3_temp, colD.x, rowD.y, 0);
        //         Vec3.transformMat4(vec3_temp, vec3_temp, matrix);
        //         offset = (row * 4 + col) * stride;
        //         vData[offset++] = vec3_temp.x;
        //         vData[offset++] = vec3_temp.y;
        //         vData[offset++] = vec3_temp.z;
        //     }
        // }

        for (let i  = 0; i < dataList.length; i++) {
            const curData = dataList[i];
            const vec3_temp = new Vec3();
            Vec3.set(vec3_temp, curData.x, curData.y, 0);
            Vec3.transformMat4(vec3_temp, vec3_temp, matrix);

            let offset = i * stride;
            vData[offset++] = vec3_temp.x;
            vData[offset++] = vec3_temp.y;
            vData[offset++] = vec3_temp.z;
        }
    },

    updateUVs (sprite: Sprite) {
        if (!sprite.spriteFrame) return;
        const renderData = sprite.renderData!;
        const vData = renderData.chunk.vb;
        const stride = renderData.floatStride;
        const uv = sprite.spriteFrame.uvSliced;
        let uvOffset = 3;
        for (let i = 0; i < 16; i++) {
            vData[uvOffset] = uv[i].u;
            vData[uvOffset + 1] = uv[i].v;
            uvOffset += stride;
        }
    },

    updateColor (sprite: Sprite) {
        const renderData = sprite.renderData!;
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
    },
};
