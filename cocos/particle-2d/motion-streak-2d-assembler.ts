/*
 Copyright (c) 2017-2018 Chukong Technologies Inc.
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
import type { IAssembler, IAssemblerManager } from '../2d/renderer/base';
import { MotionStreak, MotionStreakPoint } from './motion-streak-2d';
import { Vec2, Color } from '../core';
import type { IBatcher } from '../2d/renderer/i-batcher';
import type { RenderData } from '../2d/renderer/render-data';
import type { UIRenderer } from '../2d';

const _normal = new Vec2();
const _vec2 = new Vec2();
let QUAD_INDICES: Uint16Array | null = null;

function normal (out: Vec2, dir: Vec2): Vec2 {
    // get perpendicular
    out.x = -dir.y;
    out.y = dir.x;
    return out;
}

class MotionStreakAssembler implements IAssembler {
    updateUVs (comp: UIRenderer, ...args: any[]): void {
        throw new Error('Method not implemented.');
    }

    createData (comp: MotionStreak): RenderData {
        const renderData = comp.requestRenderData();
        renderData.dataLength = 4;
        renderData.resize(16, (16 - 2) * 3);
        return renderData;
    }

    update (comp: MotionStreak, dt: number): void {
        const stroke = comp.stroke / 2;

        const node = comp.node;
        const matrix = node.worldMatrix;
        const tx = matrix.m12;
        const ty = matrix.m13;

        const points = comp.points;

        let cur: MotionStreakPoint | undefined;
        if (points.length > 1) {
            const point = points[0];
            const difx = point.point.x - tx;
            const dify = point.point.y - ty;
            if ((difx * difx + dify * dify) < comp.minSeg) {
                cur = point;
            }
        }

        if (!cur) {
            cur = new MotionStreakPoint();
            points.unshift(cur);
        }

        cur.setPoint(tx, ty);
        cur.time = comp.fadeTime + dt;

        let vertexCount = 0;
        let indexCount = 0;

        if (points.length < 2) {
            return;
        }

        const renderData = comp.renderData!;
        this.updateRenderDataCache(comp, renderData);
        const color = comp.color;
        const cr = color.r;
        const cg = color.g;
        const cb = color.b;
        const ca = color.a;

        const prev = points[1];
        prev.distance = Vec2.subtract(_vec2, cur.point, prev.point).length();
        _vec2.normalize();
        prev.setDir(_vec2.x, _vec2.y);
        cur.setDir(_vec2.x, _vec2.y);

        renderData.dataLength = points.length * 2;

        const data = renderData.data;
        const fadeTime = comp.fadeTime;
        let findLast = false;
        for (let i = points.length - 1; i >= 0; i--) {
            const p = points[i];
            const point = p.point;
            const dir = p.dir;
            p.time -= dt;

            if (p.time < 0) {
                points.splice(i, 1);
                continue;
            }

            const progress = p.time / fadeTime;

            const next = points[i - 1];
            if (!findLast) {
                if (!next) {
                    points.splice(i, 1);
                    continue;
                }

                point.x = next.point.x - dir.x * progress;
                point.y = next.point.y - dir.y * progress;
            }
            findLast = true;

            normal(_normal, dir);

            const da = progress * ca;

            let offset = vertexCount;

            data[offset].x = point.x + _normal.x * stroke;
            data[offset].y = point.y + _normal.y * stroke;
            data[offset].u = 1;
            data[offset].v = progress;
            data[offset].color.set(cr, cg, cb, da);

            offset += 1;

            data[offset].x = point.x - _normal.x * stroke;
            data[offset].y = point.y - _normal.y * stroke;
            data[offset].u = 0;
            data[offset].v = progress;
            data[offset].color.set(cr, cg, cb, da);

            vertexCount += 2;
        }

        indexCount = vertexCount <= 2 ? 0 : (vertexCount - 2) * 3;

        renderData.resize(vertexCount, indexCount); // resize
        if (JSB) {
            const indexCount = renderData.indexCount;
            this.createQuadIndices(comp, indexCount);
            renderData.chunk.setIndexBuffer(QUAD_INDICES!);

            //  Fill all dataList to vData
            this.updateWorldVertexAllData(comp);

            renderData.updateRenderData(comp, comp.texture!);
            comp.markForUpdateRenderData();
        }
    }

    private updateWorldVertexAllData (comp: MotionStreak): void {
        const renderData = comp.renderData!;
        const stride = renderData.floatStride;
        const dataList = renderData.data;
        const vData = renderData.chunk.vb;
        for (let i  = 0; i < dataList.length; i++) {
            const offset = i * stride;
            vData[offset + 0] = dataList[i].x;
            vData[offset + 1] = dataList[i].y;
            vData[offset + 2] = dataList[i].z;
            vData[offset + 3] = dataList[i].u;
            vData[offset + 4] = dataList[i].v;
            Color.toArray(vData, dataList[i].color, offset + 5);
        }
    }

    private createQuadIndices (comp: MotionStreak, indexCount: number): void {
        const renderData = comp.renderData!;
        const chunk = renderData.chunk;
        const vid = 0;
        const meshBuffer = chunk.meshBuffer;
        let indexOffset = meshBuffer.indexOffset;
        QUAD_INDICES = null;
        QUAD_INDICES = new Uint16Array(indexCount);
        for (let i = 0, l = indexCount; i < l; i += 2) {
            const start = vid + i;
            QUAD_INDICES[indexOffset++] = start;
            QUAD_INDICES[indexOffset++] = start + 2;
            QUAD_INDICES[indexOffset++] = start + 1;
            QUAD_INDICES[indexOffset++] = start + 1;
            QUAD_INDICES[indexOffset++] = start + 2;
            QUAD_INDICES[indexOffset++] = start + 3;
        }
    }

    private updateRenderDataCache (comp: MotionStreak, renderData: RenderData): void {
        if (renderData.passDirty) {
            renderData.updatePass(comp);
        }
        if (renderData.nodeDirty) {
            renderData.updateNode(comp);
        }
        if (renderData.textureDirty && comp.texture) {
            renderData.updateTexture(comp.texture);
            renderData.material = comp.getRenderMaterial(0);
        }
        if (renderData.hashDirty) {
            renderData.updateHash();
        }
    }

    updateRenderData (comp: MotionStreak): void {
        if (JSB) {
            // A dirty hack
            // The world matrix was updated in advance and needs to be avoided at the cpp level
            // Need a flag to explicitly not update the world transform to solve this problem
            comp.renderData!.renderDrawInfo.setVertDirty(false);
            comp.node.hasChangedFlags = 0;
        }
    }

    fillBuffers (comp: MotionStreak, renderer: IBatcher): void {
        const renderData = comp.renderData!;
        const chunk = renderData.chunk;
        const dataList = renderData.data;

        const vertexCount = renderData.vertexCount;
        const indexCount = renderData.indexCount;

        const vData = chunk.vb;
        let vertexOffset = 0;
        for (let i = 0; i < vertexCount; i++) {
            const vert = dataList[i];
            vData[vertexOffset++] = vert.x;
            vData[vertexOffset++] = vert.y;
            vData[vertexOffset++] = vert.z;
            vData[vertexOffset++] = vert.u;
            vData[vertexOffset++] = vert.v;
            Color.toArray(vData, vert.color, vertexOffset);
            vertexOffset += 4;
        }

        // fill index data
        const bid = chunk.bufferId;
        const vid = chunk.vertexOffset;
        const meshBuffer = chunk.meshBuffer;
        const ib = chunk.meshBuffer.iData;
        let indexOffset = meshBuffer.indexOffset;
        for (let i = 0, l = indexCount; i < l; i += 2) {
            const start = vid + i;
            ib[indexOffset++] = start;
            ib[indexOffset++] = start + 2;
            ib[indexOffset++] = start + 1;
            ib[indexOffset++] = start + 1;
            ib[indexOffset++] = start + 2;
            ib[indexOffset++] = start + 3;
        }

        meshBuffer.indexOffset += renderData.indexCount;
        meshBuffer.setDirty();
    }
}

const motionStreakAssembler = new MotionStreakAssembler();

export const MotionStreakAssemblerManager: IAssemblerManager = {
    getAssembler (comp: MotionStreak): IAssembler {
        return motionStreakAssembler;
    },
};

MotionStreak.Assembler = MotionStreakAssemblerManager;
