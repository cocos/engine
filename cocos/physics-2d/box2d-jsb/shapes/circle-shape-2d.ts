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

// @ts-nocheck
import { b2Shape2D } from './shape-2d';
import { CircleCollider2D } from '../../framework';
import { PHYSICS_2D_PTM_RATIO } from '../../framework/physics-types';
import { ICircleShape } from '../../spec/i-physics-shape';
import { Vec2 } from '../../../core';

export class b2CircleShape extends b2Shape2D implements ICircleShape {
    get worldRadius (): number {
        return (this._shapes[0] as b2.CircleShape).m_radius * PHYSICS_2D_PTM_RATIO;
    }

    _worldPosition = new Vec2();
    get worldPosition (): Vec2 {
        const p = (this._shapes[0] as b2.CircleShape).m_p;
        return this._worldPosition.set(p.x * PHYSICS_2D_PTM_RATIO, p.y * PHYSICS_2D_PTM_RATIO);
    }

    _createShapes (scaleX: number, scaleY: number, relativePositionX: number, relativePositionY: number): any[] {
        scaleX = Math.abs(scaleX);
        scaleY = Math.abs(scaleY);

        const comp = this.collider as CircleCollider2D;

        const offsetX = (relativePositionX + comp.offset.x * scaleX) / PHYSICS_2D_PTM_RATIO;
        const offsetY = (relativePositionY + comp.offset.y * scaleY) / PHYSICS_2D_PTM_RATIO;

        const shape = new b2.CircleShape();
        shape.m_radius = comp.radius / PHYSICS_2D_PTM_RATIO * scaleX;
        shape.m_p = { x: offsetX, y: offsetY };

        return [shape];
    }
}
