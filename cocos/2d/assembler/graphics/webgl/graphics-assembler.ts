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
import { JSB } from 'internal:constants';
import { Color, Vec3 } from '../../../../core';
import { IAssembler } from '../../../renderer/base';
import { MeshRenderData } from '../../../renderer/render-data';
import { Graphics } from '../../../components';
import { LineCap, LineJoin, PointFlags } from '../types';
import { earcut as Earcut } from './earcut';
import { Impl, Point } from './impl';

const MAX_VERTEX = 65535;
const MAX_INDICES = MAX_VERTEX * 2;

const PI = Math.PI;
const min = Math.min;
const max = Math.max;
const ceil = Math.ceil;
const acos = Math.acos;
const cos = Math.cos;
const sin = Math.sin;
const atan2 = Math.atan2;

const attrBytes = 8;

let _renderData: MeshRenderData | null = null;
let _impl: Impl | null = null;
const _curColor = new Color();

const vec3_temps: Vec3[] = [];
for (let i = 0; i < 4; i++) {
    vec3_temps.push(new Vec3());
}

function curveDivs (r: number, arc: number, tol: number): number {
    const da = acos(r / (r + tol)) * 2.0;
    return max(2, ceil(arc / da));
}

function clamp (v: number, minNum: number, maxNum: number): number {
    if (v < minNum) {
        return minNum;
    } else if (v > maxNum) {
        return maxNum;
    }
    return v;
}

/**
 * graphics 组装器
 * 可通过 `UI.graphicsAssembler` 获取该组装器。
 */
export class GraphicsAssembler implements IAssembler {
    updateRenderData (graphics: Graphics): void {
        if (JSB) {
            if (graphics.renderData) {
                graphics.renderData.material = graphics.getMaterialInstance(0);
            }
        }
    }

    private getRenderData (graphics: Graphics, vertexCount: number): MeshRenderData | null {
        if (!_impl) {
            return null;
        }

        const renderDataList = _impl.getRenderDataList();
        let renderData = renderDataList[_impl.dataOffset];
        if (!renderData) {
            return null;
        }

        let meshBuffer = renderData;

        const maxVertexCount = meshBuffer ? meshBuffer.vertexStart + vertexCount : 0;
        if (maxVertexCount > MAX_VERTEX || maxVertexCount * 3 > MAX_INDICES) {
            ++_impl.dataOffset;

            if (_impl.dataOffset < renderDataList.length) {
                renderData = renderDataList[_impl.dataOffset];
            } else {
                renderData = _impl.requestRenderData();
                renderDataList[_impl.dataOffset] = renderData;
            }

            meshBuffer = renderData;
        }

        if (meshBuffer && meshBuffer.vertexCount < maxVertexCount) {
            meshBuffer.request(vertexCount, vertexCount * 3);
        }

        return renderData;
    }

    stroke (graphics: Graphics): void {
        Color.copy(_curColor, graphics.strokeColor);
        // graphics.node.getWorldMatrix(_currMatrix);
        if (!graphics.impl) {
            return;
        }

        this._flattenPaths(graphics.impl);
        this._expandStroke(graphics);

        graphics.impl.updatePathOffset = true;

        this.end(graphics);
    }

    fill (graphics: Graphics): void {
        Color.copy(_curColor, graphics.fillColor);
        // graphics.node.getWorldMatrix(_currMatrix);

        this._expandFill(graphics);
        if (graphics.impl) {
            graphics.impl.updatePathOffset = true;
        }

        this.end(graphics);
    }

    end (graphics: Graphics): void {
        graphics.markForUpdateRenderData();
    }

    private _expandStroke (graphics: Graphics): void {
        const w = graphics.lineWidth * 0.5;
        const lineCap = graphics.lineCap;
        const lineJoin = graphics.lineJoin;
        const miterLimit = graphics.miterLimit;

        _impl = graphics.impl;

        if (!_impl) {
            return;
        }

        const nCap = curveDivs(w, PI, _impl.tessTol);

        this._calculateJoins(_impl, w, lineJoin, miterLimit);

        const paths = _impl.paths;

        // Calculate max vertex usage.
        let vertexCount = 0;
        for (let i = _impl.pathOffset, l = _impl.pathLength; i < l; i++) {
            const path = paths[i];
            const pointsLength = path.points.length;

            if (lineJoin === LineJoin.ROUND) {
                vertexCount += (pointsLength + path.bevel * (nCap + 2) + 1) * 2;
            } else {
                vertexCount += (pointsLength + path.bevel * 5 + 1) * 2;
            } // plus one for loop

            if (!path.closed) {
                // space for caps
                if (lineCap === LineCap.ROUND) {
                    vertexCount += (nCap * 2 + 2) * 2;
                } else {
                    vertexCount += (3 + 3) * 2;
                }
            }
        }

        const meshBuffer: MeshRenderData | null = _renderData = this.getRenderData(graphics, vertexCount);
        if (!meshBuffer) {
            return;
        }
        const vData = meshBuffer.vData;
        const iData = meshBuffer.iData;

        for (let i = _impl.pathOffset, l = _impl.pathLength; i < l; i++) {
            const path = paths[i];
            const pts = path.points;
            const pointsLength = pts.length;
            const offset = meshBuffer.vertexStart;

            let p0: Point;
            let p1: Point;
            let start = 0;
            let end = 0;
            const loop = path.closed;
            if (loop) {
                // Looping
                p0 = pts[pointsLength - 1];
                p1 = pts[0];
                start = 0;
                end = pointsLength;
            } else {
                // Add cap
                p0 = pts[0];
                p1 = pts[1];
                start = 1;
                end = pointsLength - 1;
            }

            p1 = p1 || p0;

            if (!loop) {
                // Add cap
                const dPos = new Point(p1.x, p1.y);
                dPos.subtract(p0);
                dPos.normalize();

                const dx = dPos.x;
                const dy = dPos.y;

                if (lineCap === LineCap.BUTT) {
                    this._buttCapStart(p0, dx, dy, w, 0);
                } else if (lineCap === LineCap.SQUARE) {
                    this._buttCapStart(p0, dx, dy, w, w);
                } else if (lineCap === LineCap.ROUND) {
                    this._roundCapStart(p0, dx, dy, w, nCap);
                }
            }

            for (let j = start; j < end; ++j) {
                if (lineJoin === LineJoin.ROUND) {
                    this._roundJoin(p0, p1, w, w, nCap);
                } else if ((p1.flags & (PointFlags.PT_BEVEL | PointFlags.PT_INNERBEVEL)) !== 0) {
                    this._bevelJoin(p0, p1, w, w);
                } else {
                    this._vSet(p1.x + p1.dmx * w, p1.y + p1.dmy * w, 1);
                    this._vSet(p1.x - p1.dmx * w, p1.y - p1.dmy * w, -1);
                }

                p0 = p1;
                p1 = pts[j + 1];
            }

            if (loop) {
                // Loop it
                const vDataOffset = offset * attrBytes;
                this._vSet(vData[vDataOffset], vData[vDataOffset + 1], 1);
                this._vSet(vData[vDataOffset + attrBytes], vData[vDataOffset + attrBytes + 1], -1);
            } else {
                // Add cap
                const dPos = new Point(p1.x, p1.y);
                dPos.subtract(p0);
                dPos.normalize();

                const dx = dPos.x;
                const dy = dPos.y;

                if (lineCap === LineCap.BUTT) {
                    this._buttCapEnd(p1, dx, dy, w, 0);
                } else if (lineCap === LineCap.SQUARE) {
                    this._buttCapEnd(p1, dx, dy, w, w);
                } else if (lineCap === LineCap.ROUND) {
                    this._roundCapEnd(p1, dx, dy, w, nCap);
                }
            }

            // stroke indices
            let indicesOffset = meshBuffer.indexStart;
            for (let begin = offset + 2, over = meshBuffer.vertexStart; begin < over; begin++) {
                iData[indicesOffset++] = begin - 2;
                iData[indicesOffset++] = begin - 1;
                iData[indicesOffset++] = begin;
            }

            meshBuffer.indexStart = indicesOffset;
        }
        _renderData = null;
        _impl = null;
    }

    private _expandFill (graphics: Graphics): void {
        _impl = graphics.impl;
        if (!_impl) {
            return;
        }

        const paths = _impl.paths;

        // Calculate max vertex usage.
        let vertexCount = 0;
        for (let i = _impl.pathOffset, l = _impl.pathLength; i < l; i++) {
            const path = paths[i];
            const pointsLength = path.points.length;

            vertexCount += pointsLength;
        }

        const renderData: MeshRenderData | null = _renderData = this.getRenderData(graphics, vertexCount);
        if (!renderData) {
            return;
        }

        const meshBuffer = renderData;
        const vData = meshBuffer.vData;
        const iData = meshBuffer.iData;

        for (let i = _impl.pathOffset, l = _impl.pathLength; i < l; i++) {
            const path = paths[i];
            const pts = path.points;
            const pointsLength = pts.length;

            if (pointsLength === 0) {
                continue;
            }

            // Calculate shape vertices.
            const vertexOffset = renderData.vertexStart;

            for (let j = 0; j < pointsLength; ++j) {
                this._vSet(pts[j].x, pts[j].y);
            }

            let indicesOffset = renderData.indexStart;

            if (path.complex) {
                const earcutData: number[] = [];
                for (let j = vertexOffset, end = renderData.vertexStart; j < end; j++) {
                    let vDataOffset = j * attrBytes;
                    earcutData.push(vData[vDataOffset++]);
                    earcutData.push(vData[vDataOffset++]);
                    earcutData.push(vData[vDataOffset++]);
                }

                const newIndices = Earcut(earcutData, null, 3);

                if (!newIndices || newIndices.length === 0) {
                    continue;
                }

                for (let j = 0, nIndices = newIndices.length; j < nIndices; j++) {
                    iData[indicesOffset++] = newIndices[j] + vertexOffset;
                }
            } else {
                const first = vertexOffset;
                for (let start = vertexOffset + 2, end = meshBuffer.vertexStart; start < end; start++) {
                    iData[indicesOffset++] = first;
                    iData[indicesOffset++] = start - 1;
                    iData[indicesOffset++] = start;
                }
            }

            meshBuffer.indexStart = indicesOffset;
        }

        _renderData = null;
        _impl = null;
    }

    private _calculateJoins (impl: Impl, w: number, lineJoin: LineJoin, miterLimit: number): void {
        let iw = 0.0;

        if (w > 0.0) {
            iw = 1 / w;
        }

        // Calculate which joins needs extra vertices to append, and gather vertex count.
        const paths = impl.paths;
        for (let i = impl.pathOffset, l = impl.pathLength; i < l; i++) {
            const path = paths[i];

            const pts = path.points;
            const ptsLength = pts.length;
            let p0 = pts[ptsLength - 1];
            let p1 = pts[0];
            let nLeft = 0;

            path.bevel = 0;

            for (let j = 0; j < ptsLength; j++) {
                let dmr2 = 0;
                let cross = 0;
                let limit = 0;

                // perp normals
                const dlx0 = p0.dy;
                const dly0 = -p0.dx;
                const dlx1 = p1.dy;
                const dly1 = -p1.dx;

                // Calculate extrusions
                p1.dmx = (dlx0 + dlx1) * 0.5;
                p1.dmy = (dly0 + dly1) * 0.5;
                dmr2 = p1.dmx * p1.dmx + p1.dmy * p1.dmy;
                if (dmr2 > 0.000001) {
                    let scale = 1 / dmr2;
                    if (scale > 600) {
                        scale = 600;
                    }
                    p1.dmx *= scale;
                    p1.dmy *= scale;
                }

                // Keep track of left turns.
                cross = p1.dx * p0.dy - p0.dx * p1.dy;
                if (cross > 0) {
                    nLeft++;
                    p1.flags |= PointFlags.PT_LEFT;
                }

                // Calculate if we should use bevel or miter for inner join.
                limit = max(11, min(p0.len, p1.len) * iw);
                if (dmr2 * limit * limit < 1) {
                    p1.flags |= PointFlags.PT_INNERBEVEL;
                }

                // Check to see if the corner needs to be beveled.
                if (p1.flags & PointFlags.PT_CORNER) {
                    if (dmr2 * miterLimit * miterLimit < 1
                        || lineJoin === LineJoin.BEVEL
                        || lineJoin === LineJoin.ROUND) {
                        p1.flags |= PointFlags.PT_BEVEL;
                    }
                }

                if ((p1.flags & (PointFlags.PT_BEVEL | PointFlags.PT_INNERBEVEL)) !== 0) {
                    path.bevel++;
                }

                p0 = p1;
                p1 = pts[j + 1];
            }
        }
    }

    private _flattenPaths (impl: Impl): void {
        const paths = impl.paths;
        for (let i = impl.pathOffset, l = impl.pathLength; i < l; i++) {
            const path = paths[i];
            const pts = path.points;

            let p0 = pts[pts.length - 1];
            let p1 = pts[0];

            if (pts.length > 2 && p0.equals(p1)) {
                path.closed = true;
                pts.pop();
                p0 = pts[pts.length - 1];
            }

            for (let j = 0, size = pts.length; j < size; j++) {
                // Calculate segment direction and length
                const dPos = new Point(p1.x, p1.y);
                dPos.subtract(p0);
                p0.len = dPos.length();
                if (dPos.x || dPos.y) {
                    dPos.normalize();
                }
                p0.dx = dPos.x;
                p0.dy = dPos.y;
                // Advance
                p0 = p1;
                p1 = pts[j + 1];
            }
        }
    }

    private _chooseBevel (bevel: number, p0: Point, p1: Point, w: number): [number, number, number, number] {
        const x = p1.x;
        const y = p1.y;
        let x0 = 0;
        let y0 = 0;
        let x1 = 0;
        let y1 = 0;

        if (bevel !== 0) {
            x0 = x + p0.dy * w;
            y0 = y - p0.dx * w;
            x1 = x + p1.dy * w;
            y1 = y - p1.dx * w;
        } else {
            x0 = x1 = x + p1.dmx * w;
            y0 = y1 = y + p1.dmy * w;
        }

        return [x0, y0, x1, y1];
    }

    private _buttCapStart (p: Point, dx: number, dy: number, w: number, d: number): void {
        const px = p.x - dx * d;
        const py = p.y - dy * d;
        const dlx = dy;
        const dly = -dx;

        this._vSet(px + dlx * w, py + dly * w, 1);
        this._vSet(px - dlx * w, py - dly * w, -1);
    }

    private _buttCapEnd (p: Point, dx: number, dy: number, w: number, d: number): void {
        const px = p.x + dx * d;
        const py = p.y + dy * d;
        const dlx = dy;
        const dly = -dx;

        this._vSet(px + dlx * w, py + dly * w, 1);
        this._vSet(px - dlx * w, py - dly * w, -1);
    }

    private _roundCapStart (p: Point, dx: number, dy: number, w: number, nCap: number): void {
        const px = p.x;
        const py = p.y;
        const dlx = dy;
        const dly = -dx;

        for (let i = 0; i < nCap; i++) {
            const a = i / (nCap - 1) * PI;
            const ax = cos(a) * w;
            const ay = sin(a) * w;
            this._vSet(px - dlx * ax - dx * ay, py - dly * ax - dy * ay, 1);
            this._vSet(px, py, 0);
        }
        this._vSet(px + dlx * w, py + dly * w, 1);
        this._vSet(px - dlx * w, py - dly * w, -1);
    }

    private _roundCapEnd (p: Point, dx: number, dy: number, w: number, nCap: number): void {
        const px = p.x;
        const py = p.y;
        const dlx = dy;
        const dly = -dx;

        this._vSet(px + dlx * w, py + dly * w, 1);
        this._vSet(px - dlx * w, py - dly * w, -1);
        for (let i = 0; i < nCap; i++) {
            const a = i / (nCap - 1) * PI;
            const ax = cos(a) * w;
            const ay = sin(a) * w;
            this._vSet(px, py, 0);
            this._vSet(px - dlx * ax + dx * ay, py - dly * ax + dy * ay, 1);
        }
    }

    private _roundJoin (p0: Point, p1: Point, lw: number, rw: number, nCap: number): void {
        const dlx0 = p0.dy;
        const dly0 = -p0.dx;
        const dlx1 = p1.dy;
        const dly1 = -p1.dx;

        const p1x = p1.x;
        const p1y = p1.y;

        if ((p1.flags & PointFlags.PT_LEFT) !== 0) {
            const out = this._chooseBevel(p1.flags & PointFlags.PT_INNERBEVEL, p0, p1, lw);
            const lx0 = out[0];
            const ly0 = out[1];
            const lx1 = out[2];
            const ly1 = out[3];

            const a0 = atan2(-dly0, -dlx0);
            let a1 = atan2(-dly1, -dlx1);
            if (a1 > a0) { a1 -= PI * 2; }

            this._vSet(lx0, ly0, 1);
            this._vSet(p1x - dlx0 * rw, p1.y - dly0 * rw, -1);

            const n = clamp(ceil((a0 - a1) / PI) * nCap, 2, nCap);
            for (let i = 0; i < n; i++) {
                const u = i / (n - 1);
                const a = a0 + u * (a1 - a0);
                const rx = p1x + cos(a) * rw;
                const ry = p1y + sin(a) * rw;
                this._vSet(p1x, p1y, 0);
                this._vSet(rx, ry, -1);
            }

            this._vSet(lx1, ly1, 1);
            this._vSet(p1x - dlx1 * rw, p1y - dly1 * rw, -1);
        } else {
            const out = this._chooseBevel(p1.flags & PointFlags.PT_INNERBEVEL, p0, p1, -rw);
            const rx0 = out[0];
            const ry0 = out[1];
            const rx1 = out[2];
            const ry1 = out[3];

            const a0 = atan2(dly0, dlx0);
            let a1 = atan2(dly1, dlx1);
            if (a1 < a0) { a1 += PI * 2; }

            this._vSet(p1x + dlx0 * rw, p1y + dly0 * rw, 1);
            this._vSet(rx0, ry0, -1);

            const n = clamp(ceil((a1 - a0) / PI) * nCap, 2, nCap);
            for (let i = 0; i < n; i++) {
                const u = i / (n - 1);
                const a = a0 + u * (a1 - a0);
                const lx = p1x + cos(a) * lw;
                const ly = p1y + sin(a) * lw;
                this._vSet(lx, ly, 1);
                this._vSet(p1x, p1y, 0);
            }

            this._vSet(p1x + dlx1 * rw, p1y + dly1 * rw, 1);
            this._vSet(rx1, ry1, -1);
        }
    }

    private _bevelJoin (p0: Point, p1: Point, lw: number, rw: number): void {
        let rx0 = 0;
        let ry0 = 0;
        let rx1 = 0;
        let ry1 = 0;
        let lx0 = 0;
        let ly0 = 0;
        let lx1 = 0;
        let ly1 = 0;
        const dlx0 = p0.dy;
        const dly0 = -p0.dx;
        const dlx1 = p1.dy;
        const dly1 = -p1.dx;

        if (p1.flags & PointFlags.PT_LEFT) {
            const out = this._chooseBevel(p1.flags & PointFlags.PT_INNERBEVEL, p0, p1, lw);
            lx0 = out[0];
            ly0 = out[1];
            lx1 = out[2];
            ly1 = out[3];

            this._vSet(lx0, ly0, 1);
            this._vSet(p1.x - dlx0 * rw, p1.y - dly0 * rw, -1);

            this._vSet(lx1, ly1, 1);
            this._vSet(p1.x - dlx1 * rw, p1.y - dly1 * rw, -1);
        } else {
            const out = this._chooseBevel(p1.flags & PointFlags.PT_INNERBEVEL, p0, p1, -rw);
            rx0 = out[0];
            ry0 = out[1];
            rx1 = out[2];
            ry1 = out[3];

            this._vSet(p1.x + dlx0 * lw, p1.y + dly0 * lw, 1);
            this._vSet(rx0, ry0, -1);

            this._vSet(p1.x + dlx1 * lw, p1.y + dly1 * lw, 1);
            this._vSet(rx1, ry1, -1);
        }
    }

    private _vSet (x: number, y: number, distance = 0): void {
        if (!_renderData) {
            return;
        }

        const meshBuffer = _renderData;
        let dataOffset = meshBuffer.vertexStart * attrBytes;
        const vData = meshBuffer.vData;
        // vec3.set(_tempVec3, x, y, 0);
        // vec3.transformMat4(_tempVec3, _tempVec3, _currMatrix);

        vData[dataOffset++] = x;
        vData[dataOffset++] = y;
        vData[dataOffset++] = 0;
        Color.toArray(vData, _curColor, dataOffset);
        dataOffset += 4;
        vData[dataOffset++] = distance;
        meshBuffer.vertexStart++;
    }
}

export const graphicsAssembler = new GraphicsAssembler();
