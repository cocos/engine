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
import type { IUV, SpriteFrame } from '../../assets/sprite-frame';
import { Mat4, Color, errorID } from '../../../core';
import type { IRenderData, RenderData } from '../../renderer/render-data';
import type { IBatcher } from '../../renderer/i-batcher';
import type { Sprite } from '../../components/sprite';
import type { UIRenderer } from '../../framework/ui-renderer';
import type { IAssembler } from '../../renderer/base';
import type { StaticVBChunk } from '../../renderer/static-vb-accessor';

const m = new Mat4();

let origin: IUV;
let leftInner: IUV;
let rightInner: IUV;
let rightOuter: IUV;
let bottomInner: IUV;
let topInner: IUV;
let topOuter: IUV;
let tempRenderDataLength = 0;
const tempRenderData: IRenderData[] = [];
let QUAD_INDICES: Uint16Array | null = null;

function has9SlicedOffsetVertexCount (spriteFrame: SpriteFrame): number {
    if (spriteFrame) {
        if (spriteFrame.insetTop > 0
        || spriteFrame.insetBottom > 0
        || spriteFrame.insetLeft > 0
        || spriteFrame.insetRight > 0) {
            return 2; // left + right
        }
    }
    return 0;
}

class Tiled implements IAssembler {
    createData (sprite: UIRenderer): RenderData {
        return sprite.requestRenderData();
    }

    updateRenderData (sprite: Sprite): void {
        const renderData = sprite.renderData;
        if (!renderData) return;
        const frame = sprite.spriteFrame!;
        if (!frame || !renderData) {
            return;
        }

        if (!renderData.vertDirty) {
            return;
        }

        const uiTrans = sprite.node._getUITransformComp()!;
        const contentWidth = Math.abs(uiTrans.width);
        const contentHeight = Math.abs(uiTrans.height);

        const rect = frame.getRect();
        const leftWidth = frame.insetLeft;
        const rightWidth = frame.insetRight;
        const centerWidth = rect.width - leftWidth - rightWidth;
        const topHeight = frame.insetTop;
        const bottomHeight = frame.insetBottom;
        const centerHeight = rect.height - topHeight - bottomHeight;

        let sizableWidth = contentWidth - leftWidth - rightWidth;
        let sizableHeight = contentHeight - topHeight - bottomHeight;
        sizableWidth = sizableWidth > 0 ? sizableWidth : 0;
        sizableHeight = sizableHeight > 0 ? sizableHeight : 0;

        const hRepeat = centerWidth === 0 ? sizableWidth : sizableWidth / centerWidth;
        const vRepeat = centerHeight === 0 ? sizableHeight : sizableHeight / centerHeight;
        const offsetVertexCount = has9SlicedOffsetVertexCount(frame);
        const row = Math.ceil(vRepeat + offsetVertexCount);
        const col = Math.ceil(hRepeat + offsetVertexCount);

        renderData.dataLength = (row * 2) * (col * 2);

        this.updateVerts(sprite, sizableWidth, sizableHeight, row, col);

        if (renderData.vertexCount !== row * col * 4) {
            sprite.renderEntity.colorDirty = true;
        }
        // update data property
        renderData.resize(row * col * 4, row * col * 6);
        // update index here
        if (JSB) {
            const indexCount = renderData.indexCount;
            this.createQuadIndices(indexCount);
            renderData.chunk.setIndexBuffer(QUAD_INDICES!);
            // may can update color & uv here
            // need dirty
            this.updateWorldUVData(sprite);
            //this.updateColorLate(sprite);
        }

        renderData.updateRenderData(sprite, frame);
    }

    private createQuadIndices (indexCount: number): void {
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

    // dirty Mark
    // the real update uv is on updateWorldUVData
    updateUVs (sprite: Sprite): void {
        const renderData = sprite.renderData;
        if (!renderData) return;
        renderData.vertDirty = true;
        sprite._markForUpdateRenderData();
    }

    fillBuffers (sprite: Sprite, renderer: IBatcher): void {
        const node = sprite.node;
        const renderData = sprite.renderData;
        if (!renderData) return;
        const chunk = renderData.chunk;
        if (chunk === null) {
            // If too many vertices are requested, this will result in a chunk of null.
            return;
        }
        if (sprite._flagChangedVersion !== node.flagChangedVersion || renderData.vertDirty) {
            this.updateWorldVertexAndUVData(sprite, chunk);
            renderData.vertDirty = false;
            sprite._flagChangedVersion = node.flagChangedVersion;
        }

        // forColor
        this.updateColorLate(sprite);

        // update indices
        const bid = chunk.bufferId;
        let vid = chunk.vertexOffset;
        const meshBuffer = chunk.meshBuffer;
        const ib = chunk.meshBuffer.iData;
        let indexOffset = meshBuffer.indexOffset;
        for (let i = 0; i < renderData.indexCount; i += 6) {
            ib[indexOffset++] = vid;
            ib[indexOffset++] = vid + 1;
            ib[indexOffset++] = vid + 2;
            ib[indexOffset++] = vid + 1;
            ib[indexOffset++] = vid + 3;
            ib[indexOffset++] = vid + 2;
            vid += 4;
            meshBuffer.indexOffset += 6;
        }
        meshBuffer.setDirty();
    }

    private updateWorldUVData (sprite: Sprite): void {
        const renderData = sprite.renderData;
        if (!renderData) return;
        const stride = renderData.floatStride;
        const dataList: IRenderData[] = renderData.data;
        const vData = renderData.chunk.vb;
        for (let i  = 0; i < dataList.length; i++) {
            const offset = i * stride;
            vData[offset + 3] = dataList[i].u;
            vData[offset + 4] = dataList[i].v;
        }
    }

    // only for TS
    private updateWorldVertexAndUVData (sprite: Sprite, chunk: StaticVBChunk): void {
        const renderData = sprite.renderData;
        if (!renderData) return;
        const node = sprite.node;
        node.getWorldMatrix(m);

        const stride = renderData.floatStride;
        const dataList: IRenderData[] = renderData.data;
        const vData = chunk.vb;

        const length = dataList.length;
        for (let i  = 0; i < length; i++) {
            const x = dataList[i].x;
            const y = dataList[i].y;
            const z = dataList[i].z;
            let rhw = m.m03 * x + m.m07 * y + m.m11 * z + m.m15;
            rhw = rhw ? 1 / rhw : 1;

            const offset = i * stride;
            vData[offset] = (m.m00 * x + m.m04 * y + m.m08 * z + m.m12) * rhw;
            vData[offset + 1] = (m.m01 * x + m.m05 * y + m.m09 * z + m.m13) * rhw;
            vData[offset + 2] = (m.m02 * x + m.m06 * y + m.m10 * z + m.m14) * rhw;
        }

        this.updateWorldUVData(sprite);
    }

    private updateVerts (sprite: Sprite, sizableWidth: number, sizableHeight: number, row: number, col: number): void {
        const uiTrans = sprite.node._getUITransformComp()!;
        const renderData = sprite.renderData;
        if (!renderData) return;
        const dataList: IRenderData[] = renderData.data;
        const frame = sprite.spriteFrame!;

        const rect = frame.rect;
        const contentWidth = Math.abs(uiTrans.width);
        const contentHeight = Math.abs(uiTrans.height);
        const appx = uiTrans.anchorX * contentWidth;
        const appy = uiTrans.anchorY * contentHeight;
        const leftWidth = frame.insetLeft;
        const rightWidth = frame.insetRight;
        const centerWidth = rect.width - leftWidth - rightWidth;
        const topHeight = frame.insetTop;
        const bottomHeight = frame.insetBottom;
        const centerHeight = rect.height - topHeight - bottomHeight;
        const xScale = (uiTrans.width / (leftWidth + rightWidth)) > 1 ? 1 : (uiTrans.width / (leftWidth + rightWidth));
        const yScale = (uiTrans.height / (topHeight + bottomHeight)) > 1 ? 1 : (uiTrans.height / (topHeight + bottomHeight));
        let offsetWidth = 0;
        let offsetHeight = 0;
        if (centerWidth > 0) {
            /*
             * Because the float numerical calculation in javascript is not accurate enough,
             * there is an expected result of 1.0, but the actual result is 1.000001.
             */
            offsetWidth = Math.floor(sizableWidth * 1000) / 1000 % centerWidth === 0 ? centerWidth : sizableWidth % centerWidth;
        } else {
            offsetWidth = sizableWidth;
        }
        if (centerHeight > 0) {
            offsetHeight = Math.floor(sizableHeight * 1000) / 1000 % centerHeight === 0 ? centerHeight : sizableHeight % centerHeight;
        } else {
            offsetHeight = sizableHeight;
        }

        // 临时变量存前置数据
        tempRenderData.length = 0;
        tempRenderDataLength = Math.max(row + 1, col + 1);
        for (let i = 0; i < tempRenderDataLength; i++) {
            tempRenderData.push({ x: 0, y: 0, z: 0, u: 0, v: 0, color: new Color() });
        }

        const offsetVertexCount = has9SlicedOffsetVertexCount(frame);
        if (offsetVertexCount === 0) {
            for (let i = 0; i < tempRenderDataLength; i++) {
                // for x
                if (i >= col) {
                    tempRenderData[i].x = contentWidth - appx;
                } else {
                    tempRenderData[i].x = -appx + i * centerWidth;
                }

                // for y
                if (i >= row) {
                    tempRenderData[i].y = contentHeight - appy;
                } else {
                    tempRenderData[i].y = -appy + i * centerHeight;
                }
            }
        } else {
            for (let i = 0; i < tempRenderDataLength; i++) {
                // for x
                if (i === 0) {
                    tempRenderData[i].x = -appx;
                } else if (i === 1) {
                    tempRenderData[i].x = -appx + leftWidth * xScale;
                } else if (i > 1 && i < col - 1) {
                    if (centerWidth > 0) {
                        tempRenderData[i].x =  -appx + leftWidth * xScale + centerWidth * (i - 1);
                    } else  {
                        tempRenderData[i].x = leftWidth + sizableWidth - appx;
                    }
                } else if (i === col - 1) {
                    tempRenderData[i].x = -appx + leftWidth * xScale + offsetWidth + centerWidth * (i - 2);
                } else if (i >= col) {
                    tempRenderData[i].x = Math.min(leftWidth + sizableWidth + rightWidth, contentWidth) - appx;
                }

                // for y
                if (i === 0) {
                    tempRenderData[i].y = -appy;
                } else if (i === 1) {
                    tempRenderData[i].y = -appy + bottomHeight * yScale;
                } else if (i > 1 && i < row - 1) {
                    if (centerHeight > 0) {
                        tempRenderData[i].y =  -appy + bottomHeight * yScale + centerHeight * (i - 1);
                    } else {
                        tempRenderData[i].y = bottomHeight + sizableHeight - appy;
                    }
                } else if (i === row - 1) {
                    tempRenderData[i].y =  -appy + bottomHeight * yScale + offsetHeight + centerHeight * (i - 2);
                } else if (i >= row) {
                    tempRenderData[i].y = Math.min(bottomHeight + sizableHeight + topHeight, contentHeight) - appy;
                }
            }
        }

        // 填datalist
        let x = 0; let x1 = 0; let y = 0; let y1 = 0;
        for (let yIndex = 0; yIndex < row; ++yIndex) {
            y = tempRenderData[yIndex].y;
            y1 = tempRenderData[yIndex + 1].y;
            for (let xIndex = 0; xIndex < col; ++xIndex) {
                x = tempRenderData[xIndex].x;
                x1 = tempRenderData[xIndex + 1].x;

                // 4 vertices in a rect
                const curIndex = 4 * (yIndex * col + xIndex);
                //left bottom
                dataList[curIndex].x = x;
                dataList[curIndex].y = y;
                //right bottom
                dataList[curIndex + 1].x = x1;
                dataList[curIndex + 1].y = y;
                //left top
                dataList[curIndex + 2].x = x;
                dataList[curIndex + 2].y = y1;
                //right top
                dataList[curIndex + 3].x = x1;
                dataList[curIndex + 3].y = y1;
            }
        }

        const rotated = frame.rotated;
        const uv = frame.uv;
        const uvSliced: IUV[] = frame.uvSliced;
        // origin at left bottom
        origin = uvSliced[0];
        // on bottom edge
        leftInner = uvSliced[1];
        rightInner = uvSliced[2];
        rightOuter = uvSliced[3];
        // on left edge
        bottomInner = uvSliced[4];
        topInner = uvSliced[8];
        topOuter = uvSliced[12];

        let coefU = 0;
        let coefV = 0;
        const hRepeat = centerWidth === 0 ? sizableWidth : sizableWidth / centerWidth;
        const vRepeat = centerHeight === 0 ? sizableHeight : sizableHeight / centerHeight;
        const tempXVerts: any = [];
        const tempYVerts: any = [];

        for (let yIndexUV = 0; yIndexUV < row; ++yIndexUV) {
            if (sizableHeight > centerHeight) {
                //if 9 sliced, we should exclude bottom border vertex (yIndex-1)
                const curYRectCount = offsetVertexCount > 0 ? yIndexUV : yIndexUV + 1;
                // The height of the rect which contains the left bottom vertex in current loop should be calculated in total height.
                if (sizableHeight >= curYRectCount * centerHeight) {
                    coefV = 1;
                } else {
                    coefV = vRepeat % 1;
                }
            } else {
                coefV = vRepeat;
            }
            for (let xIndexUV = 0; xIndexUV < col; ++xIndexUV) {
                if (sizableWidth > centerWidth) {
                //if 9 sliced, we should exclude left border vertex (xIndex-1)
                    const curXRectCount = offsetVertexCount > 0 ? xIndexUV : xIndexUV + 1;
                    // The width of the rect which contains the left bottom vertex in current loop should be calculated in total width.
                    // Example: xIndex = 2 means that these is the third vertex, we should take the rect whose left bottom vertex is this
                    // vertex into account, so the following condition should be comparing the values of content size and (2+1)*centerWidth.
                    if (sizableWidth >= curXRectCount * centerWidth) {
                        coefU = 1;
                    } else {
                        coefU = hRepeat % 1;
                    }
                } else {
                    coefU = hRepeat;
                }

                if (rotated) {
                    if (offsetVertexCount === 0) { //无九宫
                        tempXVerts[0] = bottomInner.u;
                        tempXVerts[1] = bottomInner.u;
                        tempXVerts[2] = bottomInner.u + (topInner.u - bottomInner.u) * coefV;

                        tempYVerts[0] = leftInner.v;
                        tempYVerts[1] = leftInner.v + (rightInner.v - leftInner.v) * coefU;
                        tempYVerts[2] = leftInner.v;
                    } else { //有九宫
                        if (yIndexUV === 0) {
                            tempXVerts[0] = origin.u;
                            tempXVerts[1] = origin.u;
                            tempXVerts[2] = bottomInner.u;
                        } else if (yIndexUV < (row - 1)) {
                            tempXVerts[0] = bottomInner.u;
                            tempXVerts[1] = bottomInner.u;
                            tempXVerts[2] = bottomInner.u + (topInner.u - bottomInner.u) * coefV;
                        } else if (yIndexUV === (row - 1)) {
                            tempXVerts[0] = topInner.u;
                            tempXVerts[1] = topInner.u;
                            tempXVerts[2] = topOuter.u;
                        }
                        if (xIndexUV === 0) {
                            tempYVerts[0] = origin.v;
                            tempYVerts[1] = leftInner.v;
                            tempYVerts[2] = origin.v;
                        } else if (xIndexUV < (col - 1)) {
                            tempYVerts[0] = leftInner.v;
                            tempYVerts[1] = leftInner.v + (rightInner.v - leftInner.v) * coefU;
                            tempYVerts[2] = leftInner.v;
                        } else if (xIndexUV === (col - 1)) {
                            tempYVerts[0] = rightInner.v;
                            tempYVerts[1] = rightOuter.v;
                            tempYVerts[2] = rightInner.v;
                        }
                    }
                    tempXVerts[3] = tempXVerts[2];
                    tempYVerts[3] = tempYVerts[1];
                } else {
                    if (offsetVertexCount === 0) { //无九宫
                        tempXVerts[0] = leftInner.u;
                        tempXVerts[1] = leftInner.u + (rightInner.u - leftInner.u) * coefU;
                        tempXVerts[2] = leftInner.u;

                        tempYVerts[0] = bottomInner.v;
                        tempYVerts[1] = bottomInner.v;
                        tempYVerts[2] = bottomInner.v + (topInner.v - bottomInner.v) * coefV;
                    } else { //有九宫
                        if (xIndexUV === 0) {
                            tempXVerts[0] = origin.u;
                            tempXVerts[1] = leftInner.u;
                            tempXVerts[2] = origin.u;
                        } else if (xIndexUV < (col - 1)) {
                            tempXVerts[0] = leftInner.u;
                            tempXVerts[1] = leftInner.u + (rightInner.u - leftInner.u) * coefU;
                            tempXVerts[2] = leftInner.u;
                        } else if (xIndexUV === (col - 1)) {
                            tempXVerts[0] = rightInner.u;
                            tempXVerts[1] = rightOuter.u;
                            tempXVerts[2] = rightInner.u;
                        }
                        if (yIndexUV === 0) {
                            tempYVerts[0] = origin.v;
                            tempYVerts[1] = origin.v;
                            tempYVerts[2] = bottomInner.v;
                        } else if (yIndexUV < (row - 1)) {
                            tempYVerts[0] = bottomInner.v;
                            tempYVerts[1] = bottomInner.v;
                            tempYVerts[2] = bottomInner.v + (topInner.v - bottomInner.v) * coefV;
                        } else if (yIndexUV === (row - 1)) {
                            tempYVerts[0] = topInner.v;
                            tempYVerts[1] = topInner.v;
                            tempYVerts[2] = topOuter.v;
                        }
                    }
                    tempXVerts[3] = tempXVerts[1];
                    tempYVerts[3] = tempYVerts[2];
                }

                // it represents the left bottom corner vertex of a rect
                const curIndex = 4 * (yIndexUV * col + xIndexUV);
                // lb
                dataList[curIndex].u = tempXVerts[0];
                dataList[curIndex].v = tempYVerts[0];
                // rb
                dataList[curIndex + 1].u = tempXVerts[1];
                dataList[curIndex + 1].v = tempYVerts[1];
                // lt
                dataList[curIndex + 2].u = tempXVerts[2];
                dataList[curIndex + 2].v = tempYVerts[2];
                // rt
                dataList[curIndex + 3].u = tempXVerts[3];
                dataList[curIndex + 3].v = tempYVerts[3];
            }
        }
    }

    // fill color here
    private updateColorLate (sprite: Sprite): void {
        const renderData = sprite.renderData;
        if (!renderData) return;
        const vData = renderData.chunk.vb;
        const stride = renderData.floatStride;
        const vertexCount = renderData.vertexCount;

        let colorOffset = 5;
        const color = sprite.color;
        const colorR = color.r / 255;
        const colorG = color.g / 255;
        const colorB = color.b / 255;
        const colorA = sprite.node._uiProps.opacity;
        for (let i = 0; i < vertexCount; i++) {
            vData[colorOffset] = colorR;
            vData[colorOffset + 1] = colorG;
            vData[colorOffset + 2] = colorB;
            vData[colorOffset + 3] = colorA;
            colorOffset += stride;
        }
    }

    // Too early
    updateColor (sprite: Sprite): void {
        // Update color by updateColorLate
    }
}

export const tiled = new Tiled();
