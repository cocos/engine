/*
 Copyright (c) 2022-2023 Xiamen Yaji Software Co., Ltd.

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

import { b2Shape2D } from './shape-2d';
import * as PolygonPartition from '../../framework/utils/polygon-partition';
import { PolygonCollider2D } from '../../framework';
import { PHYSICS_2D_PTM_RATIO } from '../../framework/physics-types';
import { IPolygonShape } from '../../spec/i-physics-shape';
import { Vec2, IVec2Like } from '../../../core';

export class b2PolygonShape extends b2Shape2D implements IPolygonShape {
    _worldPoints: Vec2[] = [];
    get worldPoints (): Readonly<Vec2>[] {
        const comp = this.collider as PolygonCollider2D;
        const points = comp.points;
        const worldPoints = this._worldPoints;
        const m = comp.node.worldMatrix;
        for (let i = 0; i < points.length; i++) {
            if (!worldPoints[i]) {
                worldPoints[i] = new Vec2();
            }
            Vec2.transformMat4(worldPoints[i], points[i], m);
        }
        worldPoints.length = points.length;

        return this._worldPoints;
    }

    _createShapes (scaleX: number, scaleY: number, relativePositionX: number, relativePositionY: number): any[] {
        const shapes: b2.PolygonShape[] = [];

        const comp = this.collider as PolygonCollider2D;
        const points = comp.points;

        // check if last point equal to first point
        if (points.length > 0 && points[0].equals(points[points.length - 1])) {
            points.length -= 1;
        }

        const polys = PolygonPartition.ConvexPartition(points);
        if (!polys) {
            // eslint-disable-next-line no-console
            console.log('[Physics2D] b2PolygonShape failed to decompose polygon into convex polygons, node name: ', comp.node.name);
            return shapes;
        }

        const offset = comp.offset;

        for (let i = 0; i < polys.length; i++) {
            const poly = polys[i];

            let shape: b2.PolygonShape | null = null; let vertices: b2.Vec2[] = [];
            let firstVertice: b2.Vec2 | null = null;

            for (let j = 0, l = poly.length; j < l; j++) {
                if (!shape) {
                    shape = new b2.PolygonShape();
                }
                const p = poly[j];
                const x = (relativePositionX + (p.x + offset.x) * scaleX) / PHYSICS_2D_PTM_RATIO;
                const y = (relativePositionY + (p.y + offset.y) * scaleY) / PHYSICS_2D_PTM_RATIO;
                const v = new b2.Vec2(x, y);
                vertices.push(v);

                if (!firstVertice) {
                    firstVertice = v;
                }

                if (vertices.length === b2.maxPolygonVertices) {
                    shape.Set(vertices, vertices.length);
                    shapes.push(shape);

                    shape = null;

                    if (j < l - 1) {
                        vertices = [firstVertice, vertices[vertices.length - 1]];
                    }
                }
            }

            if (shape) {
                shape.Set(vertices, vertices.length);
                shapes.push(shape);
            }
        }

        return shapes;
    }
}
