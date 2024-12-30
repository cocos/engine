/*
 Copyright (c) 2024 Xiamen Yaji Software Co., Ltd.

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
import { Vec2 } from '../../../core';
import { ERaycast2DType } from '../../framework';

export class PhysicsRayCastCallback extends b2.RayCastCallback {
    _type = ERaycast2DType.Closest;
    _fixtures: b2.Fixture[] = [];
    _points: Vec2[] = [];
    _normals: Vec2[] = [];
    _fractions: number[] = [];

    _mask = 0xffffffff;

    init (type: ERaycast2DType, mask: number): void {
        super.init(this);
        this._type = type;
        this._mask = mask;
        this._fixtures.length = 0;
        this._points.length = 0;
        this._normals.length = 0;
        this._fractions.length = 0;
    }

    ReportFixture (fixture: b2.Fixture, point, normal, fraction): any {
        if ((fixture.GetFilterData().categoryBits & this._mask) === 0) {
            return 0;
        }

        if (this._type === ERaycast2DType.Closest) {
            this._fixtures[0] = fixture;
            this._points[0] = new Vec2(point.x, point.y);
            this._normals[0] = new Vec2(normal.x, normal.y);
            this._fractions[0] = fraction;
            return fraction;
        }

        this._fixtures.push(fixture);
        this._points.push(new Vec2(point.x, point.y));
        this._normals.push(new Vec2(normal.x, normal.y));
        this._fractions.push(fraction);

        if (this._type === ERaycast2DType.Any) {
            return 0;
        } else if (this._type >= ERaycast2DType.All) {
            return 1;
        }

        return fraction;
    }

    getFixtures (): any[] {
        return this._fixtures;
    }

    getPoints (): Vec2[] {
        return this._points;
    }

    getNormals (): Vec2[] {
        return this._normals;
    }

    getFractions (): number[] {
        return this._fractions;
    }
}
