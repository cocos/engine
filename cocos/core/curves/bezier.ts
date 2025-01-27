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

import { legacyCC } from '../global-exports';

export type BezierControlPoints = [ number, number, number, number ];

export function bezier (C1: number, C2: number, C3: number, C4: number, t: number): number {
    const t1 = 1 - t;
    return t1 * (t1 * (C1 + (C2 * 3 - C1) * t) + C3 * 3 * t * t) + C4 * t * t * t;
}
legacyCC.bezier = bezier;

// var sin = Math.sin;
const cos = Math.cos;
const acos = Math.acos;
const max = Math.max;
// var atan2 = Math.atan2;
const pi = Math.PI;
const tau = 2 * pi;
const sqrt = Math.sqrt;

function crt (v: number): number {
    if (v < 0) {
        return -((-v) ** (1 / 3));
    } else {
        return v ** (1 / 3);
    }
}

// Modified from http://jsbin.com/yibipofeqi/1/edit, optimized for animations.
// The origin Cardano's algorithm is based on http://www.trans4mind.com/personal_development/mathematics/polynomials/cubicAlgebra.htm
function cardano (curve: BezierControlPoints, x: number): any {
    // align curve with the intersecting line:
    // var line = {p1: {x: x, y: 0}, p2: {x: x, y: 1}};
    // var aligned = align(curve, line);
    /// / and rewrite from [a(1-t)^3 + 3bt(1-t)^2 + 3c(1-t)t^2 + dt^3] form
    //    pa = aligned[0].y,
    //    pb = aligned[1].y,
    //    pc = aligned[2].y,
    //    pd = aligned[3].y;
    /// /// curve = [{x:0, y:1}, {x: curve[0], y: 1-curve[1]}, {x: curve[2], y: 1-curve[3]}, {x:1, y:0}];
    const pa = x - 0;
    const pb = x - curve[0];
    const pc = x - curve[2];
    const pd = x - 1;

    // to [t^3 + at^2 + bt + c] form:
    const pa3 = pa * 3;
    const pb3 = pb * 3;
    const pc3 = pc * 3;
    const d = (-pa + pb3 - pc3 + pd);
    const rd = 1 / d;
    const r3 = 1 / 3;
    const a = (pa3 - 6 * pb + pc3) * rd;
    const a3 = a * r3;
    const b = (-pa3 + pb3) * rd;
    const c = pa * rd;
    // then, determine p and q:
    const p = (3 * b - a * a) * r3;
    const p3 = p * r3;
    const q = (2 * a * a * a - 9 * a * b + 27 * c) / 27;
    const q2 = q / 2;
    // and determine the discriminant:
    const discriminant = q2 * q2 + p3 * p3 * p3;
    // and some reserved variables
    let u1: number;
    let v1: number;
    let x1: number;
    let x2: number;
    let x3: number;

    // If the discriminant is negative, use polar coordinates
    // to get around square roots of negative numbers
    if (discriminant < 0) {
        const mp3 = -p * r3;
        const mp33 = mp3 * mp3 * mp3;
        const r = sqrt(mp33);
        // compute cosphi corrected for IEEE float rounding:
        const t = -q / (2 * r);
        const cosphi = t < -1 ? -1 : t > 1 ? 1 : t;
        const phi = acos(cosphi);
        const crtr = crt(r);
        const t1 = 2 * crtr;
        x1 = t1 * cos(phi * r3) - a3;
        x2 = t1 * cos((phi + tau) * r3) - a3;
        x3 = t1 * cos((phi + 2 * tau) * r3) - a3;

        // choose best percentage
        if (x1 >= 0 && x1 <= 1) {
            if (x2 >= 0 && x2 <= 1) {
                if (x3 >= 0 && x3 <= 1) {
                    return max(x1, x2, x3);
                } else {
                    return max(x1, x2);
                }
            } else if (x3 >= 0 && x3 <= 1) {
                return max(x1, x3);
            } else {
                return x1;
            }
        } else if (x2 >= 0 && x2 <= 1) {
            if (x3 >= 0 && x3 <= 1) {
                return max(x2, x3);
            } else {
                return x2;
            }
        } else {
            return x3;
        }
    } else if (discriminant === 0) {
        u1 = q2 < 0 ? crt(-q2) : -crt(q2);
        x1 = 2 * u1 - a3;
        x2 = -u1 - a3;

        // choose best percentage
        if (x1 >= 0 && x1 <= 1) {
            if (x2 >= 0 && x2 <= 1) {
                return max(x1, x2);
            } else {
                return x1;
            }
        } else {
            return x2;
        }
    } else {
        // one real root, and two imaginary roots
        const sd = sqrt(discriminant);
        u1 = crt(-q2 + sd);
        v1 = crt(q2 + sd);
        x1 = u1 - v1 - a3;
        return x1;
    }
}

export function bezierByTime (controlPoints: BezierControlPoints, x: number): number {
    const percent = cardano(controlPoints, x);    // t
    const p1y = controlPoints[1]; // b
    const p2y = controlPoints[3]; // c
    // return bezier(0, p1y, p2y, 1, percent);
    return ((1 - percent) * (p1y + (p2y - p1y) * percent) * 3 + percent * percent) * percent;
}
legacyCC.bezierByTime = bezierByTime;
