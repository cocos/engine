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

import { JSB } from 'internal:constants';
import { Color, Vec2 } from '../../../../core';
import { Graphics } from '../../../components';
import { RenderData, MeshRenderData } from '../../../renderer/render-data';
import { RenderDrawInfoType } from '../../../renderer/render-draw-info';
import { arc, ellipse, roundRect, tesselateBezier } from '../helper';
import { LineCap, LineJoin, PointFlags } from '../types';

export class Point extends Vec2 {
    public dx = 0;
    public dy = 0;
    public dmx = 0;
    public dmy = 0;
    public flags = 0;
    public len = 0;

    constructor (x: number, y: number) {
        super(x, y);
    }

    public reset (): void {
        this.dx = 0;
        this.dy = 0;
        this.dmx = 0;
        this.dmy = 0;
        this.flags = 0;
        this.len = 0;
    }
}

export class Path {
    public closed = false;
    public bevel = 0;
    public complex = true;
    public points: Point[] = [];

    public reset (): void {
        this.closed = false;
        this.bevel = 0;
        this.complex = true;
        this.points.length = 0;
    }
}

/** @mangle */
export class Impl {
    public dataOffset = 0;
    public updatePathOffset = false;

    public pathLength = 0;
    public pathOffset = 0;

    public paths: Path[] = [];
    // inner properties
    public tessTol = 0.25;
    public distTol = 0.01;
    public fillColor = Color.WHITE.clone();
    public lineCap = LineCap.BUTT;
    public strokeColor = Color.BLACK.clone();
    public lineJoin = LineJoin.MITER;
    public lineWidth = 0;

    public pointsOffset = 0;

    private _commandX = 0;
    private _commandY = 0;
    private _points: Point[] = [];
    private _renderDataList: MeshRenderData[] = [];
    private _curPath: Path | null = null;
    private declare _comp: Graphics;

    constructor (comp: Graphics) {
        this._comp = comp;
    }

    public moveTo (x: number, y: number): void {
        if (this.updatePathOffset) {
            this.pathOffset = this.pathLength;
            this.updatePathOffset = false;
        }

        this._addPath();
        this.addPoint(x, y, PointFlags.PT_CORNER);

        this._commandX = x;
        this._commandY = y;
    }

    public lineTo (x: number, y: number): void {
        this.addPoint(x, y, PointFlags.PT_CORNER);

        this._commandX = x;
        this._commandY = y;
    }

    public bezierCurveTo (c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void {
        const path = this._curPath!;
        const last = path.points[path.points.length - 1];
        if (!last) {
            return;
        }

        if (last.x === c1x && last.y === c1y && c2x === x && c2y === y) {
            this.lineTo(x, y);
            return;
        }

        tesselateBezier(this, last.x, last.y, c1x, c1y, c2x, c2y, x, y, 0, PointFlags.PT_CORNER);

        this._commandX = x;
        this._commandY = y;
    }

    public quadraticCurveTo (cx: number, cy: number, x: number, y: number): void {
        const x0 = this._commandX;
        const y0 = this._commandY;
        this.bezierCurveTo(x0 + 2.0 / 3.0 * (cx - x0), y0 + 2.0 / 3.0 * (cy - y0), x + 2.0 / 3.0 * (cx - x), y + 2.0 / 3.0 * (cy - y), x, y);
    }

    public arc (cx: number, cy: number, r: number, startAngle: number, endAngle: number, counterclockwise: boolean): void {
        arc(this, cx, cy, r, startAngle, endAngle, counterclockwise);
    }

    public ellipse (cx: number, cy: number, rx: number, ry: number): void {
        ellipse(this, cx, cy, rx, ry);
        this._curPath!.complex = false;
    }

    public circle (cx: number, cy: number, r: number): void {
        ellipse(this, cx, cy, r, r);
        this._curPath!.complex = false;
    }

    public rect (x: number, y: number, w: number, h: number): void {
        this.moveTo(x, y);
        this.lineTo(x + w, y);
        this.lineTo(x + w, y + h);
        this.lineTo(x, y + h);

        this.close();
        this._curPath!.complex = false;
    }

    public roundRect (x: number, y: number, w: number, h: number, r: number): void {
        roundRect(this, x, y, w, h, r);
        this._curPath!.complex = false;
    }

    public clear (): void {
        this.pathLength = 0;
        this.pathOffset = 0;
        this.pointsOffset = 0;
        this.dataOffset = 0;
        this._curPath = null;
        this.paths.length = 0;
        this._points.length = 0;

        const dataList = this._renderDataList;
        for (let i = 0, l = dataList.length; i < l; i++) {
            const data = dataList[i];
            if (!data) {
                continue;
            }

            MeshRenderData.remove(data);
            data.removeRenderDrawInfo(this._comp);
        }

        this._renderDataList.length = 0;
    }

    public close (): void {
        this._curPath!.closed = true;
    }

    public requestRenderData (): MeshRenderData {
        const renderData = MeshRenderData.add();
        this._renderDataList.push(renderData);
        if (JSB) {
            renderData.initRenderDrawInfo(this._comp, RenderDrawInfoType.MODEL);
            // TODO: MeshRenderData and RenderData are both sub class of BaseRenderData, here we weirdly use MeshRenderData as RenderData
            // please fix the type @holycanvas
            // issue: https://github.com/cocos/cocos-engine/issues/14637
            renderData.material = this._comp.getMaterialInstance(0)!;// hack
            this._comp.setRenderData(renderData as unknown as RenderData);
        }

        return renderData;
    }

    public getRenderDataList (): MeshRenderData[] {
        if (this._renderDataList.length === 0) {
            this.requestRenderData();
        }

        return this._renderDataList;
    }

    public addPoint (x: number, y: number, flags: PointFlags): void {
        const path = this._curPath;
        if (!path) {
            return;
        }

        const points = this._points;
        const pathPoints = path.points;

        const offset = this.pointsOffset++;
        let pt: Point = points[offset];

        if (!pt) {
            pt = new Point(x, y);
            points.push(pt);
        } else {
            pt.x = x;
            pt.y = y;
        }

        pt.flags = flags;
        pathPoints.push(pt);
    }

    private _addPath (): Path {
        const offset = this.pathLength;
        let path = this.paths[offset];

        if (!path) {
            path = new Path();

            this.paths.push(path);
        } else {
            path.reset();
        }

        this.pathLength++;
        this._curPath = path;

        return path;
    }
}
