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

import { B2, b2Mul } from '../instantiated';
import { Color, warn } from '../../../core';
import { PHYSICS_2D_PTM_RATIO } from '../../framework';
import { Graphics } from '../../../2d';

let _tmp_vec2 = { x: 0, y: 0 };
const _tmp_color = new Color();

const GREEN_COLOR = Color.GREEN;
const RED_COLOR = Color.RED;

export class PhysicsDebugDraw {// extends B2.Draw {
    static callback = {
        DrawPolygon (vertices: number, vertexCount: number, color: B2.Color): void {
            PhysicsDebugDraw.DrawPolygon(vertices, vertexCount, color);
        },
        DrawSolidPolygon (vertices: number, vertexCount: number, color: B2.Color): void {
            PhysicsDebugDraw.DrawSolidPolygon(vertices, vertexCount, color);
        },
        DrawCircle (center: B2.Vec2, radius: number, color: B2.Color): void {
            PhysicsDebugDraw.DrawCircle(center, radius, color);
        },
        DrawSolidCircle (center: B2.Vec2, radius: number, axis, color: B2.Color): void {
            PhysicsDebugDraw.DrawSolidCircle(center, radius, axis, color);
        },
        DrawSegment (p1: B2.Vec2, p2: B2.Vec2, color: B2.Color): void {
            PhysicsDebugDraw.DrawSegment(p1, p2, color);
        },
        DrawTransform (xf: B2.Transform): void {
            PhysicsDebugDraw.DrawTransform(xf);
        },
        DrawPoint (center: B2.Vec2, size: number, color: B2.Color): void {
            PhysicsDebugDraw.DrawPoint(center, size, color);
        },
    }

    static _drawer: Graphics | null = null;

    static _xf = { p: { x: 0, y: 0 },  q: { s: 0, c: 1 } };//new B2.Transform();
    static _dxf = { p: { x: 0, y: 0 },  q: { s: 0, c: 1 } };//new B2.Transform();

    static _DrawPolygon (vertices: number, vertexCount: number): void {
        const drawer = PhysicsDebugDraw._drawer!;

        for (let i = 0; i < vertexCount; i++) {
            _tmp_vec2.x = B2.GetFloat32(vertices, i * 2 + 0);
            _tmp_vec2.y = B2.GetFloat32(vertices, i * 2 + 1);
            _tmp_vec2 = b2Mul(PhysicsDebugDraw._xf, _tmp_vec2);
            const x = _tmp_vec2.x * PHYSICS_2D_PTM_RATIO;
            const y = _tmp_vec2.y * PHYSICS_2D_PTM_RATIO;
            if (i === 0) drawer.moveTo(x, y);
            else {
                drawer.lineTo(x, y);
            }
        }

        drawer.close();
    }

    static DrawPolygon (vertices: number, vertexCount: number, color: B2.Color): void {
        PhysicsDebugDraw._applyStrokeColor(color);
        PhysicsDebugDraw._DrawPolygon(vertices, vertexCount);
        PhysicsDebugDraw._drawer!.stroke();
    }

    static DrawSolidPolygon (vertices: number, vertexCount: number, color: B2.Color): void {
        PhysicsDebugDraw._applyFillColor(color);
        PhysicsDebugDraw._DrawPolygon(vertices, vertexCount);
        PhysicsDebugDraw._drawer!.fill();
        PhysicsDebugDraw._drawer!.stroke();
    }

    static _DrawCircle (center: B2.Vec2, radius: number): void {
        const p = PhysicsDebugDraw._xf.p;
        PhysicsDebugDraw._drawer!.circle((center.x + p.x) * PHYSICS_2D_PTM_RATIO,
            (center.y + p.y) * PHYSICS_2D_PTM_RATIO, radius * PHYSICS_2D_PTM_RATIO);
    }

    static DrawCircle (center: B2.Vec2, radius: number, color: B2.Color): void {
        PhysicsDebugDraw._applyStrokeColor(color);
        PhysicsDebugDraw._DrawCircle(center, radius);
        PhysicsDebugDraw._drawer!.stroke();
    }

    static DrawSolidCircle (center: B2.Vec2, radius: number, axis, color: B2.Color): void {
        PhysicsDebugDraw._applyFillColor(color);
        PhysicsDebugDraw._DrawCircle(center, radius);
        PhysicsDebugDraw._drawer!.fill();
    }

    static DrawSegment (p1: B2.Vec2, p2: B2.Vec2, color): void {
        const drawer = PhysicsDebugDraw._drawer!;

        if (p1.x === p2.x && p1.y === p2.y) {
            PhysicsDebugDraw._applyFillColor(color);
            PhysicsDebugDraw._DrawCircle(p1, 2 / PHYSICS_2D_PTM_RATIO);
            drawer.fill();
            return;
        }
        PhysicsDebugDraw._applyStrokeColor(color);

        _tmp_vec2 = b2Mul(PhysicsDebugDraw._xf, p1);
        drawer.moveTo(p1.x * PHYSICS_2D_PTM_RATIO, p1.y * PHYSICS_2D_PTM_RATIO);
        drawer.lineTo(p2.x * PHYSICS_2D_PTM_RATIO, p2.y * PHYSICS_2D_PTM_RATIO);
        drawer.stroke();
    }

    static DrawTransform (xf: B2.Transform): void {
        const drawer = PhysicsDebugDraw._drawer!;

        drawer.strokeColor = RED_COLOR;

        _tmp_vec2.x = _tmp_vec2.y = 0;
        _tmp_vec2 = b2Mul(xf, _tmp_vec2);
        drawer.moveTo(_tmp_vec2.x * PHYSICS_2D_PTM_RATIO, _tmp_vec2.y * PHYSICS_2D_PTM_RATIO);

        _tmp_vec2.x = 1; _tmp_vec2.y = 0;
        _tmp_vec2 = b2Mul(xf, _tmp_vec2);
        drawer.lineTo(_tmp_vec2.x * PHYSICS_2D_PTM_RATIO, _tmp_vec2.y * PHYSICS_2D_PTM_RATIO);

        drawer.stroke();

        drawer.strokeColor = GREEN_COLOR;

        _tmp_vec2.x = _tmp_vec2.y = 0;
        _tmp_vec2 = b2Mul(xf, _tmp_vec2);
        drawer.moveTo(_tmp_vec2.x * PHYSICS_2D_PTM_RATIO, _tmp_vec2.y * PHYSICS_2D_PTM_RATIO);

        _tmp_vec2.x = 0; _tmp_vec2.y = 1;
        _tmp_vec2 = b2Mul(xf, _tmp_vec2);
        drawer.lineTo(_tmp_vec2.x * PHYSICS_2D_PTM_RATIO, _tmp_vec2.y * PHYSICS_2D_PTM_RATIO);

        drawer.stroke();
    }

    static DrawPoint (center, size, color): void {
    }

    static DrawParticles (): void {
    }

    static _applyStrokeColor (color: B2.Color): void {
        PhysicsDebugDraw._drawer!.strokeColor = _tmp_color.set(
            color.r * 255,
            color.g * 255,
            color.b * 255,
            150,
        );
    }

    static _applyFillColor (color: B2.Color): void {
        PhysicsDebugDraw._drawer!.fillColor = _tmp_color.set(
            color.r * 255,
            color.g * 255,
            color.b * 255,
            150,
        );
    }

    PushTransform (xf): void {
        PhysicsDebugDraw._xf = xf;
    }

    PopTransform (): void {
        PhysicsDebugDraw._xf = PhysicsDebugDraw._dxf;
    }
}
