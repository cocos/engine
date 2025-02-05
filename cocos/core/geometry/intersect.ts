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

import { EPSILON, Mat3, v3, Vec3 } from '../math';
import { AABB } from './aabb';
import { Capsule } from './capsule';
import * as distance from './distance';
import { ShapeType } from './enums';
import { Frustum } from './frustum';
import { Line } from './line';
import { OBB } from './obb';
import { Plane } from './plane';
import { Ray } from './ray';
import { Sphere } from './sphere';
import { Triangle } from './triangle';
import { IVec3Like } from '../math/type-define';
import type { RenderingSubMesh }  from '../../asset/assets';
import type { IRaySubMeshOptions, IRayModelOptions, IRayMeshOptions } from './spec';
import type { Model } from '../../render-scene/scene';
import type { Mesh } from '../../3d';

const vec3SquaredDistance = Vec3.squaredDistance;
const vec3Subtract = Vec3.subtract;
const vec3Dot = Vec3.dot;
const vec3Set = Vec3.set;
const vec3Cross = Vec3.cross;
const vec3MultiplyScalar = Vec3.multiplyScalar;
const vec3Copy = Vec3.copy;
const vec3Add = Vec3.add;
const vec3ScaleAndAdd = Vec3.scaleAndAdd;
const mathMax = Math.max;
const mathMin = Math.min;
const mathAbs = Math.abs;

/**
 * @en
 * ray-plane intersect detect.
 * @zh
 * 射线与平面的相交性检测。
 * @param ray @zh 要测试的射线。 @en The ray to test.
 * @param plane @zh 要测试的平面。 @en The plane to test.
 * @returns @zh 如果没有相交，返回 0 ，否则返回非 0。 @en zero if no intersection, otherwise returns a non-zero value.
 */
const rayPlane = (function () {
    return function (ray: Ray, plane: Plane): number {
        const denom = vec3Dot(ray.d, plane.n);
        if (mathAbs(denom) < Number.EPSILON) { return 0; }
        const d = distance.point_plane(ray.o, plane);
        const t = -d / denom;
        if (t < 0) { return 0; }
        return t;
    };
}());

// based on http://fileadmin.cs.lth.se/cs/Personal/Tomas_Akenine-Moller/raytri/
/**
 * @en
 * ray-triangle intersect detect.
 * @zh
 * 射线与三角形的相交性检测。
 * @param ray @zh 要测试的射线。 @en The ray to test.
 * @param triangle @zh 用来测试三角形。 @en The triangle to test.
 * @param doubleSided @zh 要测试的三角形是否为双面。 @en Indicates whether the triangle to test is double sided.
 * @returns @zh 0 或 非 0，0 表示没有相交。@en 0 or not 0, 0 indicates there is no intersection.
 */
const rayTriangle = (function (): (ray: Ray, triangle: Triangle, doubleSided?: boolean) => number {
    const ab = v3();
    const ac = v3();
    const pvec = v3();
    const tvec = v3();
    const qvec = v3();

    return function (ray: Ray, triangle: Triangle, doubleSided?: boolean): number {
        vec3Subtract(ab, triangle.b, triangle.a);
        vec3Subtract(ac, triangle.c, triangle.a);

        vec3Cross(pvec, ray.d, ac);
        const det = vec3Dot(ab, pvec);

        // 1. det < eps && det > -eps && doubleSided
        // 2. det < eps && !doubleSided
        // if true, the ray is parallel to the triangle plane
        if (det < Number.EPSILON && (!doubleSided || det > -Number.EPSILON)) { return 0; }

        const inv_det = 1 / det;

        vec3Subtract(tvec, ray.o, triangle.a);
        const u = vec3Dot(tvec, pvec) * inv_det;
        // enlargeCoeff 1.0, compare uvLimits, if true, the ray is outside the triangle
        if (u < 0 || u > 1) { return 0; }

        vec3Cross(qvec, tvec, ab);
        const v = vec3Dot(ray.d, qvec) * inv_det;
        // if true, the ray is outside the triangle
        if (v < 0 || u + v > 1) { return 0; }

        const t = vec3Dot(ac, qvec) * inv_det;
        return t < 0 ? 0 : t;
    };
}());

/**
 * @en
 * ray-sphere intersect detect.
 * @zh
 * 射线和球的相交性检测。
 * @param ray @zh 要测试的射线。 @en The ray to test.
 * @param sphere @zh 要测试的球。 @en The sphere to test.
 * @returns @zh 如果没有相交，返回 0 ，否则返回非 0。 @en zero if no intersection, otherwise returns a non-zero value.
 */
const raySphere = (function (): (ray: Ray, sphere: Sphere) => number {
    const e = v3();
    return function (ray: Ray, sphere: Sphere): number {
        const r = sphere.radius;
        const c = sphere.center;
        const o = ray.o;
        const d = ray.d;
        const rSq = r * r;
        vec3Subtract(e, c, o);
        const eSq = e.lengthSqr();

        const aLength = vec3Dot(e, d); // assume ray direction already normalized
        const fSq = rSq - (eSq - aLength * aLength);
        if (fSq < 0) { return 0; }

        const f = Math.sqrt(fSq);
        const t = eSq < rSq ? aLength + f : aLength - f;
        if (t < 0) { return 0; }
        return t;
    };
}());

/**
 * @en
 * ray-aabb intersect detect.
 * @zh
 * 射线和轴对齐包围盒的相交性检测。
 * @param ray @zh 要测试的射线。 @en The ray to test.
 * @param aabb @zh 要测试的 AABB。 @en The aabb to test.
 * @returns @zh 如果没有相交，返回 0 ，否则返回非 0。 @en zero if no intersection, otherwise returns a non-zero value.
 */
const rayAABB = (function (): (ray: Ray, aabb: AABB) => number {
    const min = v3();
    const max = v3();
    return function (ray: Ray, aabb: AABB): number {
        vec3Subtract(min, aabb.center, aabb.halfExtents);
        vec3Add(max, aabb.center, aabb.halfExtents);
        return rayAABB2(ray, min, max);
    };
}());

function rayAABB2 (ray: Ray, min: IVec3Like, max: IVec3Like): number {
    const o = ray.o; const d = ray.d;
    const ix = 1 / d.x; const iy = 1 / d.y; const iz = 1 / d.z;
    const t1 = (min.x - o.x) * ix;
    const t2 = (max.x - o.x) * ix;
    const t3 = (min.y - o.y) * iy;
    const t4 = (max.y - o.y) * iy;
    const t5 = (min.z - o.z) * iz;
    const t6 = (max.z - o.z) * iz;
    const tmin = mathMax(mathMax(mathMin(t1, t2), mathMin(t3, t4)), mathMin(t5, t6));
    const tmax = mathMin(mathMin(mathMax(t1, t2), mathMax(t3, t4)), mathMax(t5, t6));
    if (tmax < 0 || tmin > tmax) { return 0; }
    return tmin > 0 ? tmin : tmax; // ray origin inside aabb
}

/**
 * @en
 * ray-obb intersect detect.
 * @zh
 * 射线和 OBB 的相交性检测。
 * @param ray @zh 要测试的射线。 @en The ray to test.
 * @param obb @zh 要测试的 OBB。 @en The OBB to test.
 * @returns @zh 如果没有相交，返回 0 ，否则返回非 0。 @en zero if no intersection, otherwise returns a non-zero value.
 */
const rayOBB = (function (): (ray: Ray, obb: OBB) => number {
    let center = v3();
    let o = v3();
    let d = v3();
    const X = v3();
    const Y = v3();
    const Z = v3();
    const p = v3();
    const size = new Array<number>(3);
    const f = new Array<number>(3);
    const e = new Array<number>(3);
    const t = new Array<number>(6);

    return function (ray: Ray, obb: OBB): number {
        const halfExtents = obb.halfExtents;
        const orientation = obb.orientation;

        size[0] = halfExtents.x;
        size[1] = halfExtents.y;
        size[2] = halfExtents.z;
        center = obb.center;
        o = ray.o;
        d = ray.d;

        vec3Set(X, orientation.m00, orientation.m01, orientation.m02);
        vec3Set(Y, orientation.m03, orientation.m04, orientation.m05);
        vec3Set(Z, orientation.m06, orientation.m07, orientation.m08);
        vec3Subtract(p, center, o);

        // The cos values of the ray on the X, Y, Z
        f[0] = vec3Dot(X, d);
        f[1] = vec3Dot(Y, d);
        f[2] = vec3Dot(Z, d);

        // The projection length of P on X, Y, Z
        e[0] = vec3Dot(X, p);
        e[1] = vec3Dot(Y, p);
        e[2] = vec3Dot(Z, p);

        for (let i = 0; i < 3; ++i) {
            if (f[i] === 0) {
                if (-e[i] - size[i] > 0 || -e[i] + size[i] < 0) {
                    return 0;
                }
                // Avoid div by 0!
                f[i] = 0.0000001;
            }
            // min
            t[i * 2 + 0] = (e[i] + size[i]) / f[i];
            // max
            t[i * 2 + 1] = (e[i] - size[i]) / f[i];
        }
        const tmin = mathMax(
            mathMax(
                mathMin(t[0], t[1]),
                mathMin(t[2], t[3]),
            ),
            mathMin(t[4], t[5]),
        );
        const tmax = mathMin(
            mathMin(
                mathMax(t[0], t[1]),
                mathMax(t[2], t[3]),
            ),
            mathMax(t[4], t[5]),
        );
        if (tmax < 0 || tmin > tmax) {
            return 0;
        }

        return tmin > 0 ? tmin : tmax; // ray origin inside aabb
    };
}());

/**
 * @en
 * ray-capsule intersect detect.
 * @zh
 * 射线和胶囊体的相交性检测。
 * @param ray @zh 要测试的射线。 @en The ray to test.
 * @param capsule @zh 要测试的胶囊体。 @en The capsule to test.
 * @returns @zh 如果没有相交，返回 0 ，否则返回非 0。 @en zero if no intersection, otherwise returns a non-zero value.
 */
const rayCapsule = (function (): (ray: Ray, capsule: Capsule) => number {
    const v3_0 = v3();
    const v3_1 = v3();
    const v3_2 = v3();
    const v3_3 = v3();
    const v3_4 = v3();
    const v3_5 = v3();
    const v3_6 = v3();
    const sphere_0 = new Sphere();
    return function (ray: Ray, capsule: Capsule): number {
        const A = capsule.ellipseCenter0;
        const B = capsule.ellipseCenter1;
        const BA = vec3Subtract(v3_1, B, A);
        if (BA.length() < EPSILON) {
            // deduce to sphere
            sphere_0.radius = capsule.radius;
            sphere_0.center.set(capsule.ellipseCenter0);
            return intersect.raySphere(ray, sphere_0);
        }

        const O = ray.o;
        const OA = vec3Subtract(v3_2, O, A);
        const vRayNorm = Vec3.normalize(v3_0, ray.d);
        const VxBA = vec3Cross(v3_3, vRayNorm, BA);
        const a = VxBA.lengthSqr();
        if (a === 0) {
            sphere_0.radius = capsule.radius;
            const BO = vec3Subtract(v3_4, B, O);
            if (OA.lengthSqr() < BO.lengthSqr()) {
                sphere_0.center.set(A);
            } else {
                sphere_0.center.set(B);
            }
            return intersect.raySphere(ray, sphere_0);
        }

        const OAxBA = vec3Cross(v3_4, OA, BA);
        const ab2 = BA.lengthSqr();
        const b = 2 * vec3Dot(VxBA, OAxBA);
        const radiusSqr = capsule.radius * capsule.radius;
        const c = OAxBA.lengthSqr() - (radiusSqr * ab2);
        const d = b * b - 4 * a * c;

        if (d < 0) { return 0; }

        const t = (-b - Math.sqrt(d)) / (2 * a);
        if (t < 0) {
            sphere_0.radius = capsule.radius;
            const BO = vec3Subtract(v3_5, B, O);
            if (OA.lengthSqr() < BO.lengthSqr()) {
                sphere_0.center.set(capsule.ellipseCenter0);
            } else {
                sphere_0.center.set(capsule.ellipseCenter1);
            }
            return intersect.raySphere(ray, sphere_0);
        } else {
            // Limit intersection between the bounds of the cylinder's end caps.
            const iPos = vec3ScaleAndAdd(v3_5, ray.o, vRayNorm, t);
            const iPosLen = vec3Subtract(v3_6, iPos, A);
            const tLimit = vec3Dot(iPosLen, BA) / ab2;

            if (tLimit >= 0 && tLimit <= 1) {
                return t;
            } else if (tLimit < 0) {
                sphere_0.radius = capsule.radius;
                sphere_0.center.set(capsule.ellipseCenter0);
                return intersect.raySphere(ray, sphere_0);
            } else if (tLimit > 1) {
                sphere_0.radius = capsule.radius;
                sphere_0.center.set(capsule.ellipseCenter1);
                return intersect.raySphere(ray, sphere_0);
            } else {
                return 0;
            }
        }
    };
}());

/**
 * @en
 * line-plane intersect detect.
 * @zh
 * 线段与平面的相交性检测。
 * @param line @zh 要测试的线段。 @en The line to test.
 * @param plane @zh 要测试的平面。 @en The plane to test.
 * @returns @zh 如果没有相交，返回 0 ，否则返回非 0。 @en zero if no intersection, otherwise returns a non-zero value.
 */
const linePlane = (function (): (line: Line, plane: Plane) => number {
    const ab = v3();

    return function (line: Line, plane: Plane): number {
        vec3Subtract(ab, line.e, line.s);
        const t = -distance.point_plane(line.s, plane) / vec3Dot(ab, plane.n);
        if (t < 0 || t > 1) { return 0; }
        return t;
    };
}());

/**
 * @en
 * line-triangle intersect detect.
 * @zh
 * 线段与三角形的相交性检测。
 * @param line @zh 线段 @en The line to test.
 * @param triangle @zh 三角形 @en The triangle to test.
 * @param outPt @zh 可选，相交点 @en Optional out param, indicates the intersection point.
 * @returns @zh 如果没有相交，返回 0 ，否则返回非 0。 @en zero if no intersection, otherwise returns a non-zero value.
 */
const lineTriangle = (function (): (line: Line, triangle: Triangle, outPt?: Vec3) => number {
    const ab = v3();
    const ac = v3();
    const qp = v3();
    const ap = v3();
    const n = v3();
    const e = v3();

    return function (line: Line, triangle: Triangle, outPt?: Vec3): number {
        vec3Subtract(ab, triangle.b, triangle.a);
        vec3Subtract(ac, triangle.c, triangle.a);
        vec3Subtract(qp, line.s, line.e);

        vec3Cross(n, ab, ac);
        const det = vec3Dot(qp, n);

        if (det <= 0.0) {
            return 0;
        }

        vec3Subtract(ap, line.s, triangle.a);
        const t = vec3Dot(ap, n);
        if (t < 0 || t > det) {
            return 0;
        }

        vec3Cross(e, qp, ap);
        let v = vec3Dot(ac, e);
        if (v < 0 || v > det) {
            return 0;
        }

        let w = -vec3Dot(ab, e);
        if (w < 0.0 || v + w > det) {
            return 0;
        }

        if (outPt) {
            const invDet = 1.0 / det;
            v *= invDet;
            w *= invDet;
            const u = 1.0 - v - w;

            // outPt = u*a + v*d + w*c;
            vec3Set(
                outPt,
                triangle.a.x * u + triangle.b.x * v + triangle.c.x * w,
                triangle.a.y * u + triangle.b.y * v + triangle.c.y * w,
                triangle.a.z * u + triangle.b.z * v + triangle.c.z * w,
            );
        }

        return 1;
    };
}());

const r_t = new Ray();
/**
 * @en
 * line-aabb intersect detect.
 * @zh
 * 线段与轴对齐包围盒的相交性检测
 * @param line @zh 线段 @en The line to test
 * @param aabb @zh 轴对齐包围盒 @en The aabb to test
 * @returns @zh 如果没有相交，返回 0 ，否则返回非 0。 @en zero if no intersection, otherwise returns a non-zero value.no intersection
 */
function lineAABB (line: Line, aabb: AABB): number {
    r_t.o.set(line.s);
    vec3Subtract(r_t.d, line.e, line.s);
    r_t.d.normalize();
    const min = rayAABB(r_t, aabb);
    const len = line.length();
    if (min <= len) {
        return min;
    } else {
        return 0;
    }
}

/**
 * @en
 * line-obb intersect detect.
 * @zh
 * 线段与OBB的相交性检测。
 * @param line @zh 线段 @en The line to test.
 * @param obb @zh OBB @en The OBB to test.
 * @returns @zh 如果没有相交，返回 0 ，否则返回非 0。 @en zero if no intersection, otherwise returns a non-zero value.no intersection
 */
function lineOBB (line: Line, obb: OBB): number {
    r_t.o.set(line.s);
    vec3Subtract(r_t.d, line.e, line.s);
    r_t.d.normalize();
    const min = rayOBB(r_t, obb);
    const len = line.length();
    if (min <= len) {
        return min;
    } else {
        return 0;
    }
}

/**
 * @en
 * line-sphere intersect detect.
 * @zh
 * 线段与球的相交性检测
 * @param line @zh 线段 @en The line to test
 * @param sphere @zh 球 @en The sphere to test
 * @returns @zh 如果没有相交，返回 0 ，否则返回非 0。 @en zero if no intersection, otherwise returns a non-zero value.no intersection
 */
function lineSphere (line: Line, sphere: Sphere): number {
    r_t.o.set(line.s);
    vec3Subtract(r_t.d, line.e, line.s);
    r_t.d.normalize();
    const min = raySphere(r_t, sphere);
    const len = line.length();
    if (min <= len) {
        return min;
    } else {
        return 0;
    }
}

/**
 * @en
 * aabb-aabb intersect detect.
 * @zh
 * 轴对齐包围盒和轴对齐包围盒的相交性检测。
 * @param aabb1 @zh 轴对齐包围盒1 @en aabb 1 to test
 * @param aabb2 @zh 轴对齐包围盒2 @en aabb 2 to test
 * @returns @zh 如果没有相交，返回 0 ，否则返回非 0。 @en zero if no intersection, otherwise returns a non-zero value.no intersection
 */
const aabbWithAABB = (function (): (aabb1: AABB, aabb2: AABB) => boolean {
    const aMin = v3();
    const aMax = v3();
    const bMin = v3();
    const bMax = v3();
    return function (aabb1: AABB, aabb2: AABB): boolean {
        vec3Subtract(aMin, aabb1.center, aabb1.halfExtents);
        vec3Add(aMax, aabb1.center, aabb1.halfExtents);
        vec3Subtract(bMin, aabb2.center, aabb2.halfExtents);
        vec3Add(bMax, aabb2.center, aabb2.halfExtents);
        return (aMin.x <= bMax.x && aMax.x >= bMin.x)
            && (aMin.y <= bMax.y && aMax.y >= bMin.y)
            && (aMin.z <= bMax.z && aMax.z >= bMin.z);
    };
}());

function getAABBVertices (min: Vec3, max: Vec3, out: Vec3[]): void {
    vec3Set(out[0], min.x, max.y, max.z);
    vec3Set(out[1], min.x, max.y, min.z);
    vec3Set(out[2], min.x, min.y, max.z);
    vec3Set(out[3], min.x, min.y, min.z);
    vec3Set(out[4], max.x, max.y, max.z);
    vec3Set(out[5], max.x, max.y, min.z);
    vec3Set(out[6], max.x, min.y, max.z);
    vec3Set(out[7], max.x, min.y, min.z);
}

function getOBBVertices (c: Vec3, e: Vec3, a1: Vec3, a2: Vec3, a3: Vec3, out: Vec3[]): void {
    vec3Set(
        out[0],
        c.x + a1.x * e.x + a2.x * e.y + a3.x * e.z,
        c.y + a1.y * e.x + a2.y * e.y + a3.y * e.z,
        c.z + a1.z * e.x + a2.z * e.y + a3.z * e.z,
    );
    vec3Set(
        out[1],
        c.x - a1.x * e.x + a2.x * e.y + a3.x * e.z,
        c.y - a1.y * e.x + a2.y * e.y + a3.y * e.z,
        c.z - a1.z * e.x + a2.z * e.y + a3.z * e.z,
    );
    vec3Set(
        out[2],
        c.x + a1.x * e.x - a2.x * e.y + a3.x * e.z,
        c.y + a1.y * e.x - a2.y * e.y + a3.y * e.z,
        c.z + a1.z * e.x - a2.z * e.y + a3.z * e.z,
    );
    vec3Set(
        out[3],
        c.x + a1.x * e.x + a2.x * e.y - a3.x * e.z,
        c.y + a1.y * e.x + a2.y * e.y - a3.y * e.z,
        c.z + a1.z * e.x + a2.z * e.y - a3.z * e.z,
    );
    vec3Set(
        out[4],
        c.x - a1.x * e.x - a2.x * e.y - a3.x * e.z,
        c.y - a1.y * e.x - a2.y * e.y - a3.y * e.z,
        c.z - a1.z * e.x - a2.z * e.y - a3.z * e.z,
    );
    vec3Set(
        out[5],
        c.x + a1.x * e.x - a2.x * e.y - a3.x * e.z,
        c.y + a1.y * e.x - a2.y * e.y - a3.y * e.z,
        c.z + a1.z * e.x - a2.z * e.y - a3.z * e.z,
    );
    vec3Set(
        out[6],
        c.x - a1.x * e.x + a2.x * e.y - a3.x * e.z,
        c.y - a1.y * e.x + a2.y * e.y - a3.y * e.z,
        c.z - a1.z * e.x + a2.z * e.y - a3.z * e.z,
    );
    vec3Set(
        out[7],
        c.x - a1.x * e.x - a2.x * e.y + a3.x * e.z,
        c.y - a1.y * e.x - a2.y * e.y + a3.y * e.z,
        c.z - a1.z * e.x - a2.z * e.y + a3.z * e.z,
    );
}

function getInterval (vertices: IVec3Like[], axis: Vec3): number[] {
    let min = vec3Dot(axis, vertices[0]);
    let max = min;
    for (let i = 1; i < 8; ++i) {
        const projection = vec3Dot(axis, vertices[i]);
        min = (projection < min) ? projection : min;
        max = (projection > max) ? projection : max;
    }
    return [min, max];
}

/**
 * @en
 * aabb-obb intersect detect.
 * @zh
 * 轴对齐包围盒和OBB的相交性检测。
 * @param aabb @zh 轴对齐包围盒 @en The aabb to test
 * @param obb @zh OBB @en The OBB to test
 * @returns @zh 如果没有相交，返回 0 ，否则返回非 0。 @en zero if no intersection, otherwise returns a non-zero value.no intersection
 */
const aabbWithOBB = (function (): (aabb: AABB, obb: OBB) => number {
    const test = new Array<Vec3>(15);
    for (let i = 0; i < 15; i++) {
        test[i] = v3();
    }
    const vertices = new Array<Vec3>(8);
    const vertices2 = new Array<Vec3>(8);
    for (let i = 0; i < 8; i++) {
        vertices[i] = v3();
        vertices2[i] = v3();
    }
    const min = v3();
    const max = v3();
    return function (aabb: AABB, obb: OBB): number {
        const orientation = obb.orientation;
        vec3Set(test[0], 1, 0, 0);
        vec3Set(test[1], 0, 1, 0);
        vec3Set(test[2], 0, 0, 1);
        vec3Set(test[3], orientation.m00, orientation.m01, orientation.m02);
        vec3Set(test[4], orientation.m03, orientation.m04, orientation.m05);
        vec3Set(test[5], orientation.m06, orientation.m07, orientation.m08);

        for (let i = 0; i < 3; ++i) { // Fill out rest of axis
            vec3Cross(test[6 + i * 3 + 0], test[i], test[3]);
            vec3Cross(test[6 + i * 3 + 1], test[i], test[4]);
            vec3Cross(test[6 + i * 3 + 1], test[i], test[5]);
        }

        vec3Subtract(min, aabb.center, aabb.halfExtents);
        vec3Add(max, aabb.center, aabb.halfExtents);
        getAABBVertices(min, max, vertices);
        getOBBVertices(obb.center, obb.halfExtents, test[3], test[4], test[5], vertices2);

        for (let j = 0; j < 15; ++j) {
            const a = getInterval(vertices, test[j]);
            const b = getInterval(vertices2, test[j]);
            if (b[0] > a[1] || a[0] > b[1]) {
                return 0; // Seperating axis found
            }
        }

        return 1;
    };
}());

/**
 * @en
 * aabb-plane intersect detect.
 * @zh
 * 轴对齐包围盒和平面的相交性检测。
 * @param aabb @zh 轴对齐包围盒 @en The aabb to test
 * @param plane @zh 平面 @en The plane to test
 * @returns @zh 检测结果, 包含为 -1, 不包含为 0, 相交为 1 @en Test result, inside(back) = -1, outside(front) = 0, intersect = 1
 */
const aabbPlane = function (aabb: AABB, plane: Plane): number {
    const aabbHalfExtents = aabb.halfExtents;
    const planeN = plane.n;
    const r = aabbHalfExtents.x * mathAbs(planeN.x)
        + aabbHalfExtents.y * mathAbs(planeN.y)
        + aabbHalfExtents.z * mathAbs(planeN.z);
    const dot = vec3Dot(planeN, aabb.center);
    if (dot + r < plane.d) { return -1; } else if (dot - r > plane.d) { return 0; }
    return 1;
};

/**
 * @en
 * aabb-frustum intersect detect, faster but has false positive corner cases.
 * @zh
 * 轴对齐包围盒和锥台相交性检测，速度快，但有错误情况。
 * @param aabb @zh 轴对齐包围盒 @en The aabb to test
 * @param frustum @zh 锥台 @en The frustum to test
 * @returns @zh 如果没有相交，返回 0 ，否则返回非 0。 @en zero if no intersection, otherwise returns a non-zero value.no intersection
 */
const aabbFrustum = function (aabb: AABB, frustum: Readonly<Frustum>): number {
    const frustumPlanes = frustum.planes;
    for (let i = 0; i < frustumPlanes.length; i++) {
        // frustum plane normal points to the inside
        if (aabbPlane(aabb, frustumPlanes[i]) === -1) {
            return 0;
        }
    } // completely outside
    return 1;
};

/**
 * @en
 * aabb-frustum intersect detect, faster but false while frustum is completely inside the aabb.
 * @zh
 * 轴对齐包围盒和锥台的相交性检测。速度快，但是当锥台完全在aabb中时就会判断出错。
 * @param {AABB} aabb 轴对齐包围盒
 * @param {Frustum} frustum 锥台
 * @returns {number} aabb completely inside the frustum = 1, otherwise = 0
 */
const aabbFrustumCompletelyInside = function (aabb: AABB, frustum: Readonly<Frustum>): number {
    const frustumPlanes = frustum.planes;
    for (let i = 0; i < frustumPlanes.length; i++) {
        // frustum plane normal points to the inside
        if (aabbPlane(aabb, frustumPlanes[i]) !== 0) {
            return 0;
        }
    } // completely inside
    return 1;
};

// https://cesium.com/blog/2017/02/02/tighter-frustum-culling-and-why-you-may-want-to-disregard-it/
/**
 * @en
 * aabb-frustum intersect, handles most of the false positives correctly.
 * @zh
 * 轴对齐包围盒和锥台相交性检测，正确处理大多数错误情况。
 * @param aabb @zh 轴对齐包围盒 @en The aabb to test
 * @param frustum @zh 锥台 @en The frustum to test
 * @returns @zh 如果没有相交，返回 0 ，否则返回非 0。 @en zero if no intersection, otherwise returns a non-zero value.no intersection
 */
const aabbFrustumAccurate = (function (): (aabb: AABB, frustum: Frustum) => number {
    const tmp = new Array(8);
    let out1 = 0;
    let out2 = 0;
    for (let i = 0; i < tmp.length; i++) {
        tmp[i] = v3();
    }
    return function (aabb: AABB, frustum: Frustum): number {
        const frustumVertices = frustum.vertices;
        const aabbHalfExtents = aabb.halfExtents;
        let result = 0;
        let intersects = false;
        // 1. aabb inside/outside frustum test
        for (let i = 0; i < frustum.planes.length; i++) {
            result = aabbPlane(aabb, frustum.planes[i]);
            // frustum plane normal points to the inside
            if (result === -1) return 0; // completely outside
            else if (result === 1) { intersects = true; }
        }
        if (!intersects) { return 1; } // completely inside
        // in case of false positives
        // 2. frustum inside/outside aabb test
        for (let i = 0; i < frustumVertices.length; i++) {
            vec3Subtract(tmp[i], frustumVertices[i], aabb.center);
        }
        out1 = 0;
        out2 = 0;
        for (let i = 0; i < frustumVertices.length; i++) {
            if (tmp[i].x > aabbHalfExtents.x) { out1++; } else if (tmp[i].x < -aabbHalfExtents.x) { out2++; }
        }
        if (out1 === frustumVertices.length || out2 === frustumVertices.length) { return 0; }
        out1 = 0; out2 = 0;
        for (let i = 0; i < frustumVertices.length; i++) {
            if (tmp[i].y > aabbHalfExtents.y) { out1++; } else if (tmp[i].y < -aabbHalfExtents.y) { out2++; }
        }
        if (out1 === frustumVertices.length || out2 === frustumVertices.length) { return 0; }
        out1 = 0; out2 = 0;
        for (let i = 0; i < frustumVertices.length; i++) {
            if (tmp[i].z > aabbHalfExtents.z) { out1++; } else if (tmp[i].z < -aabbHalfExtents.z) { out2++; }
        }
        if (out1 === frustumVertices.length || out2 === frustumVertices.length) { return 0; }
        return 1;
    };
}());

/**
 * @en
 * Checks whether the OBB contains the point.
 * @zh
 * OBB 和点的相交性检测。
 * @param obb @zh 参与测试的 OBB。 @en The OBB to test.
 * @param point @zh 参与测试的点。 @en The point to test.
 * @returns @zh 是否相交 @en The value indicates if there is an intersection.
 */
const obbPoint = (function (): (obb: OBB, point: Vec3) => boolean {
    const tmp = v3();
    const m3 = new Mat3();
    const lessThan = function (a: Vec3, b: Vec3): boolean { return mathAbs(a.x) < b.x && mathAbs(a.y) < b.y && mathAbs(a.z) < b.z; };
    return function (obb: OBB, point: Vec3): boolean {
        vec3Subtract(tmp, point, obb.center);
        Vec3.transformMat3(tmp, tmp, Mat3.transpose(m3, obb.orientation));
        return lessThan(tmp, obb.halfExtents);
    };
}());

/**
 * @en
 * obb-plane intersect detect.
 * @zh
 * OBB 和平面的相交性检测。
 * @param obb @zh OBB @en The OBB to test
 * @param plane @zh 平面 @en The plane to test
 * @returns @zh 检测结果, 包含为 -1, 不包含为 0, 相交为 1 @en Test result, inside(back) = -1, outside(front) = 0, intersect = 1
 */
const obbPlane = (function (): (obb: OBB, plane: Plane) => number {
    const absDot = function (n: Vec3, x: number, y: number, z: number): number {
        return mathAbs(n.x * x + n.y * y + n.z * z);
    };
    return function (obb: OBB, plane: Plane): number {
        const obbOrientation = obb.orientation;
        const obbHalfExtents = obb.halfExtents;
        const planeN = plane.n;
        const planeD = plane.d;
        // Real-Time Collision Detection, Christer Ericson, p. 163.
        const r = obbHalfExtents.x * absDot(planeN, obbOrientation.m00, obbOrientation.m01, obbOrientation.m02)
            + obbHalfExtents.y * absDot(planeN, obbOrientation.m03, obbOrientation.m04, obbOrientation.m05)
            + obbHalfExtents.z * absDot(planeN, obbOrientation.m06, obbOrientation.m07, obbOrientation.m08);

        const dot = vec3Dot(planeN, obb.center);
        if (dot + r < planeD) { return -1; } else if (dot - r > planeD) { return 0; }
        return 1;
    };
}());

/**
 * @en
 * OBB-frustum intersect, faster but has false positive corner cases.
 * @zh
 * OBB 和锥台相交性检测，速度快，但有错误情况。
 * @param obb @zh OBB @en The OBB to test.
 * @param frustum @zh 锥台 @en The frustum to test.
 * @returns @zh 如果没有相交，返回 0 ，否则返回非 0。 @en zero if no intersection, otherwise returns a non-zero value.
 */
const obbFrustum = function (obb: OBB, frustum: Frustum): number {
    const frustumPlanes = frustum.planes;
    for (let i = 0; i < frustumPlanes.length; i++) {
        // frustum plane normal points to the inside
        if (obbPlane(obb, frustumPlanes[i]) === -1) {
            return 0;
        }
    } // completely outside
    return 1;
};

// https://cesium.com/blog/2017/02/02/tighter-frustum-culling-and-why-you-may-want-to-disregard-it/
/**
 * @en
 * obb-frustum intersect, handles most of the false positives correctly.
 * @zh
 * OBB 和锥台相交性检测，正确处理大多数错误情况。
 * @param obb @zh OBB @en The OBB to test
 * @param frustum @zh 锥台 @en The frustum to test
 * @returns @zh 如果没有相交，返回 0 ，否则返回非 0。 @en zero if no intersection, otherwise returns a non-zero value.no intersection
 */
const obbFrustumAccurate = (function (): (obb: OBB, frustum: Frustum) => number {
    const tmp = new Array<Vec3>(8);
    let dist = 0; let out1 = 0; let out2 = 0;
    for (let i = 0; i < tmp.length; i++) {
        tmp[i] = v3();
    }
    const dot = function (n: Vec3, x: number, y: number, z: number): number {
        return n.x * x + n.y * y + n.z * z;
    };
    return function (obb: OBB, frustum: Frustum): number {
        const obbOrientation = obb.orientation;
        const obbHalfExtents = obb.halfExtents;
        const frustumVertices = frustum.vertices;
        const frustumPlanes = frustum.planes;
        let result = 0;
        let intersects = false;
        // 1. obb inside/outside frustum test
        for (let i = 0; i < frustumPlanes.length; i++) {
            result = obbPlane(obb, frustumPlanes[i]);
            // frustum plane normal points to the inside
            if (result === -1) return 0; // completely outside
            else if (result === 1) { intersects = true; }
        }
        if (!intersects) { return 1; } // completely inside
        // in case of false positives
        // 2. frustum inside/outside obb test
        for (let i = 0; i < frustumVertices.length; i++) {
            vec3Subtract(tmp[i], frustumVertices[i], obb.center);
        }
        out1 = 0, out2 = 0;
        for (let i = 0; i < frustumVertices.length; i++) {
            dist = dot(tmp[i], obbOrientation.m00, obbOrientation.m01, obbOrientation.m02);
            if (dist > obbHalfExtents.x) { out1++; } else if (dist < -obbHalfExtents.x) { out2++; }
        }
        if (out1 === frustumVertices.length || out2 === frustumVertices.length) { return 0; }
        out1 = 0; out2 = 0;
        for (let i = 0; i < frustumVertices.length; i++) {
            dist = dot(tmp[i], obbOrientation.m03, obbOrientation.m04, obbOrientation.m05);
            if (dist > obbHalfExtents.y) { out1++; } else if (dist < -obbHalfExtents.y) { out2++; }
        }
        if (out1 === frustumVertices.length || out2 === frustumVertices.length) { return 0; }
        out1 = 0; out2 = 0;
        for (let i = 0; i < frustumVertices.length; i++) {
            dist = dot(tmp[i], obbOrientation.m06, obbOrientation.m07, obbOrientation.m08);
            if (dist > obbHalfExtents.z) { out1++; } else if (dist < -obbHalfExtents.z) { out2++; }
        }
        if (out1 === frustumVertices.length || out2 === frustumVertices.length) { return 0; }
        return 1;
    };
}());

/**
 * @en
 * obb-obb intersect detect.
 * @zh
 * OBB 和OBB的相交性检测。
 * @param obb1 @zh OBB1 @en Obb 1 to test
 * @param obb2 @zh OBB2 @en Obb 2 to test
 * @returns @zh 如果没有相交，返回 0 ，否则返回非 0。 @en zero if no intersection, otherwise returns a non-zero value.no intersection
 */
const obbWithOBB = (function (): (obb1: OBB, obb2: OBB) => number {
    const test = new Array<Vec3>(15);
    for (let i = 0; i < 15; i++) {
        test[i] = v3();
    }

    const vertices = new Array<Vec3>(8);
    const vertices2 = new Array<Vec3>(8);
    for (let i = 0; i < 8; i++) {
        vertices[i] = v3();
        vertices2[i] = v3();
    }

    return function (obb1: OBB, obb2: OBB): number {
        const obb1Orientation = obb1.orientation;
        const obb2Orientation = obb2.orientation;
        vec3Set(test[0], obb1Orientation.m00, obb1Orientation.m01, obb1Orientation.m02);
        vec3Set(test[1], obb1Orientation.m03, obb1Orientation.m04, obb1Orientation.m05);
        vec3Set(test[2], obb1Orientation.m06, obb1Orientation.m07, obb1Orientation.m08);

        vec3Set(test[3], obb2Orientation.m00, obb2Orientation.m01, obb2Orientation.m02);
        vec3Set(test[4], obb2Orientation.m03, obb2Orientation.m04, obb2Orientation.m05);
        vec3Set(test[5], obb2Orientation.m06, obb2Orientation.m07, obb2Orientation.m08);

        for (let i = 0; i < 3; ++i) { // Fill out rest of axis
            vec3Cross(test[6 + i * 3 + 0], test[i], test[3]);
            vec3Cross(test[6 + i * 3 + 1], test[i], test[4]);
            vec3Cross(test[6 + i * 3 + 2], test[i], test[5]);
        }

        getOBBVertices(obb1.center, obb1.halfExtents, test[0], test[1], test[2], vertices);
        getOBBVertices(obb2.center, obb2.halfExtents, test[3], test[4], test[5], vertices2);

        for (let i = 0; i < 15; ++i) {
            const a = getInterval(vertices, test[i]);
            const b = getInterval(vertices2, test[i]);
            if (b[0] > a[1] || a[0] > b[1]) {
                return 0; // Seperating axis found
            }
        }

        return 1;
    };
}());

// https://github.com/diku-dk/bvh-tvcg18/blob/1fd3348c17bc8cf3da0b4ae60fdb8f2aa90a6ff0/FOUNDATION/GEOMETRY/GEOMETRY/include/overlap/geometry_overlap_obb_capsule.h
/**
 * @en
 * OBB-capsule intersect detect.
 * @zh
 * OBB 和胶囊体的相交性检测。
 * @param obb @zh OBB @en The OBB to test.
 * @param capsule @zh 胶囊体 @en The capsule to test.
 * @returns @zh 如果没有相交，返回 0 ，否则返回非 0。 @en zero if no intersection, otherwise returns a non-zero value.
 */
const obbCapsule = (function (): (obb: OBB, capsule: Capsule) => boolean | 1 | 0 {
    const sphere_0 = new Sphere();
    const v3_0 = v3();
    const v3_1 = v3();
    const v3_2 = v3();
    const v3_verts8 = new Array<Vec3>(8);
    for (let i = 0; i < 8; i++) { v3_verts8[i] = v3(); }
    const v3_axis8 = new Array<Vec3>(8);
    for (let i = 0; i < 8; i++) { v3_axis8[i] = v3(); }
    return function (obb: OBB, capsule: Capsule): boolean | 1 | 0 {
        const capsuleEllipseCenter0 = capsule.ellipseCenter0;
        const capsuleEllipseCenter1 = capsule.ellipseCenter1;
        const capsuleRadius = capsule.radius;
        const h = vec3SquaredDistance(capsuleEllipseCenter0, capsuleEllipseCenter1);
        if (h === 0) {
            sphere_0.radius = capsule.radius;
            sphere_0.center.set(capsuleEllipseCenter0);
            return intersect.sphereOBB(sphere_0, obb);
        } else {
            const orientation = obb.orientation;
            v3_0.x = orientation.m00;
            v3_0.y = orientation.m01;
            v3_0.z = orientation.m02;
            v3_1.x = orientation.m03;
            v3_1.y = orientation.m04;
            v3_1.z = orientation.m05;
            v3_2.x = orientation.m06;
            v3_2.y = orientation.m07;
            v3_2.z = orientation.m08;
            getOBBVertices(obb.center, obb.halfExtents, v3_0, v3_1, v3_2, v3_verts8);

            const axes = v3_axis8;
            const a0 = vec3Copy(axes[0], v3_0);
            const a1 = vec3Copy(axes[1], v3_1);
            const a2 = vec3Copy(axes[2], v3_2);
            const C = vec3Subtract(axes[3], capsule.center, obb.center);
            C.normalize();
            const B = vec3Subtract(axes[4], capsuleEllipseCenter0, capsuleEllipseCenter1);
            B.normalize();
            vec3Cross(axes[5], a0, B);
            vec3Cross(axes[6], a1, B);
            vec3Cross(axes[7], a2, B);

            for (let i = 0; i < 8; ++i) {
                const a = getInterval(v3_verts8, axes[i]);
                const d0 = vec3Dot(axes[i], capsuleEllipseCenter0);
                const d1 = vec3Dot(axes[i], capsuleEllipseCenter1);
                const max_d = mathMax(d0, d1);
                const min_d = mathMin(d0, d1);
                const d_min = min_d - capsuleRadius;
                const d_max = max_d + capsuleRadius;
                if (d_min > a[1] || a[0] > d_max) {
                    return 0; // Seperating axis found
                }
            }
            return 1;
        }
    };
}());

/**
 * @en
 * sphere-plane intersect, not necessarily faster than obb-plane,due to the length calculation of the
 * plane normal to factor out the unnomalized plane distance.
 * @zh
 * 球与平面的相交性检测。
 * @param sphere @zh 球 @en The sphere to test
 * @param plane @zh 平面 @en The plane to test
 * @returns @zh 检测结果, 包含为 -1, 不包含为 0, 相交为 1 @en Test result, inside(back) = -1, outside(front) = 0, intersect = 1
 */
const spherePlane = function (sphere: Sphere, plane: Plane): number {
    const dot = vec3Dot(plane.n, sphere.center);
    const r = sphere.radius * plane.n.length();
    if (dot + r < plane.d) { return -1; } else if (dot - r > plane.d) { return 0; }
    return 1;
};

/**
 * @en
 * sphere-frustum intersect, faster but has false positive corner cases.
 * @zh
 * 球和锥台的相交性检测，速度快，但有错误情况。
 * @param sphere @zh 球 @en The sphere to test
 * @param frustum @zh 锥台 @en The frustum to test
 * @returns @zh 如果没有相交，返回 0 ，否则返回非 0。 @en zero if no intersection, otherwise returns a non-zero value.no intersection
 */
const sphereFrustum = function (sphere: Sphere, frustum: Frustum): number {
    const frustumPlanes = frustum.planes;
    for (let i = 0; i < frustumPlanes.length; i++) {
        // frustum plane normal points to the inside
        if (spherePlane(sphere, frustumPlanes[i]) === -1) {
            return 0;
        }
    } // completely outside
    return 1;
};

// https://stackoverflow.com/questions/20912692/view-frustum-culling-corner-cases
/**
 * @en
 * sphere-frustum intersect, handles the false positives correctly.
 * @zh
 * 球和锥台的相交性检测，正确处理大多数错误情况。
 * @param sphere @zh 球 @en The sphere to test
 * @param frustum @zh 锥台 @en The frustum to test
 * @returns @zh 如果没有相交，返回 0 ，否则返回非 0。 @en zero if no intersection, otherwise returns a non-zero value.no intersection
 */
const sphereFrustumAccurate = (function (): (sphere: Sphere, frustum: Frustum) => number {
    const pt = v3();
    const map = [1, -1, 1, -1, 1, -1];
    return function (sphere: Sphere, frustum: Frustum): number {
        for (let i = 0; i < 6; i++) {
            const plane = frustum.planes[i];
            const r = sphere.radius;
            const c = sphere.center;
            const n = plane.n;
            const d = plane.d;
            const dot = vec3Dot(n, c);
            // frustum plane normal points to the inside
            if (dot + r < d) return 0; // completely outside
            else if (dot - r > d) { continue; }
            // in case of false positives
            // has false negatives, still working on it
            vec3Add(pt, c, vec3MultiplyScalar(pt, n, r));
            for (let j = 0; j < 6; j++) {
                if (j === i || j === i + map[i]) { continue; }
                const test = frustum.planes[j];
                if (vec3Dot(test.n, pt) < test.d) { return 0; }
            }
        }
        return 1;
    };
}());

/**
 * @en
 * sphere-sphere intersect detect.
 * @zh
 * 球和球的相交性检测。
 * @param sphere0 @zh 球 0 @en The sphere A to test
 * @param sphere1 @zh 球 1 @en The sphere B to test
 * @returns @zh 是否发生碰撞 @en true or false which indicates if there is an intersection
 */
const sphereWithSphere = function (sphere0: Sphere, sphere1: Sphere): boolean {
    const r = sphere0.radius + sphere1.radius;
    return vec3SquaredDistance(sphere0.center, sphere1.center) < r * r;
};

/**
 * @en
 * sphere-aabb intersect detect.
 * @zh
 * 球和轴对齐包围盒的相交性检测。
 * @param sphere @zh 球 @en The sphere to test
 * @param aabb @zh 轴对齐包围盒 @en The aabb to test
 * @returns @zh 是否发生碰撞 @en true or false which indicates if there is an intersection
 */
const sphereAABB = (function (): (sphere: Sphere, aabb: AABB) => boolean {
    const pt = v3();
    return function (sphere: Sphere, aabb: AABB): boolean {
        const sphereRadius = sphere.radius;
        distance.pt_point_aabb(pt, sphere.center, aabb);
        return vec3SquaredDistance(sphere.center, pt) < sphereRadius * sphereRadius;
    };
}());

/**
 * @en
 * sphere-OBB intersect detect.
 * @zh
 * 球和 OBB 的相交性检测。
 * @param sphere @zh 参与测试的球。 @en The sphere to test.
 * @param obb @zh 参与测试的 OBB。 @en The OBB to test.
 * @returns @zh 是否发生碰撞。 @en true or false which indicates if there is an intersection.
 */
const sphereOBB = (function (): (sphere: Sphere, obb: OBB) => boolean {
    const pt = v3();
    return function (sphere: Sphere, obb: OBB): boolean {
        const sphereRadius = sphere.radius;
        distance.pt_point_obb(pt, sphere.center, obb);
        return vec3SquaredDistance(sphere.center, pt) < sphereRadius * sphereRadius;
    };
}());

/**
 * @en
 * sphere-capsule intersect detect.
 * @zh
 * 球和胶囊体的相交性检测。
 * @param sphere @zh 参与测试的球。 @en The sphere to test.
 * @param capsule @zh 参与测试的胶囊体。 @en The capsule to test.
 * @returns @zh 是否发生碰撞。 @en true or false which indicates if there is an intersection.
 */
const sphereCapsule = (function (): (sphere: Sphere, capsule: Capsule) => boolean {
    const v3_0 = v3();
    const v3_1 = v3();
    return function (sphere: Sphere, capsule: Capsule): boolean {
        const capsuleEllipseCenter0 = capsule.ellipseCenter0;
        const capsuleEllipseCenter1 = capsule.ellipseCenter1;
        const sphereCenter = sphere.center;
        const r = sphere.radius + capsule.radius;
        const squaredR = r * r;
        const h = vec3SquaredDistance(capsuleEllipseCenter0, capsuleEllipseCenter1);
        if (h === 0) {
            return vec3SquaredDistance(sphereCenter, capsule.center) < squaredR;
        } else {
            vec3Subtract(v3_0, sphereCenter, capsuleEllipseCenter0);
            vec3Subtract(v3_1, capsuleEllipseCenter1, capsuleEllipseCenter0);
            const t = vec3Dot(v3_0, v3_1) / h;
            if (t < 0) {
                return vec3SquaredDistance(sphereCenter, capsuleEllipseCenter0) < squaredR;
            } else if (t > 1) {
                return vec3SquaredDistance(sphereCenter, capsuleEllipseCenter1) < squaredR;
            } else {
                vec3ScaleAndAdd(v3_0, capsuleEllipseCenter0, v3_1, t);
                return vec3SquaredDistance(sphereCenter, v3_0) < squaredR;
            }
        }
    };
}());

// http://www.geomalgorithms.com/a07-_distance.html
/**
 * @en
 * capsule-capsule intersect detect.
 * @zh
 * 胶囊体和胶囊体的相交性检测。
 * @param capsuleA @zh 要测试的胶囊体 A。 @en The capsule A to test.
 * @param capsuleB @zh 要测试的胶囊体 B。 @en The capsule B to test.
 * @returns @zh 如果相交，返回 true，否则返回 false。 @en true if there is an intersection, otherwise returns false.
 */
const capsuleWithCapsule = (function (): (capsuleA: Capsule, capsuleB: Capsule) => boolean {
    const v3_0 = v3();
    const v3_1 = v3();
    const v3_2 = v3();
    const v3_3 = v3();
    const v3_4 = v3();
    const v3_5 = v3();
    return function capsuleWithCapsule (capsuleA: Capsule, capsuleB: Capsule): boolean {
        const capsuleAEllipseCenter0 = capsuleA.ellipseCenter0;
        const capsuleAEllipseCenter1 = capsuleA.ellipseCenter1;
        const capsuleBEllipseCenter1 = capsuleB.ellipseCenter1;
        const capsuleBEllipseCenter0 = capsuleB.ellipseCenter0;
        const u = vec3Subtract(v3_0, capsuleAEllipseCenter1, capsuleAEllipseCenter0);
        const v = vec3Subtract(v3_1, capsuleBEllipseCenter1, capsuleBEllipseCenter0);
        const w = vec3Subtract(v3_2, capsuleAEllipseCenter0, capsuleBEllipseCenter0);
        const a = vec3Dot(u, u);         // always >= 0
        const b = vec3Dot(u, v);
        const c = vec3Dot(v, v);         // always >= 0
        const d = vec3Dot(u, w);
        const e = vec3Dot(v, w);
        const D = a * c - b * b;        // always >= 0
        let sN: number;
        let sD = D;       // sc = sN / sD, default sD = D >= 0
        let tN: number;
        let tD = D;       // tc = tN / tD, default tD = D >= 0

        // compute the line parameters of the two closest points
        if (D < EPSILON) { // the lines are almost parallel
            sN = 0.0;         // force using point P0 on segment S1
            sD = 1.0;         // to prevent possible division by 0.0 later
            tN = e;
            tD = c;
        } else {                 // get the closest points on the infinite lines
            sN = (b * e - c * d);
            tN = (a * e - b * d);
            if (sN < 0.0) {        // sc < 0 => the s=0 edge is visible
                sN = 0.0;
                tN = e;
                tD = c;
            } else if (sN > sD) {  // sc > 1  => the s=1 edge is visible
                sN = sD;
                tN = e + b;
                tD = c;
            }
        }

        if (tN < 0.0) {            // tc < 0 => the t=0 edge is visible
            tN = 0.0;
            // recompute sc for this edge
            if (-d < 0.0) {
                sN = 0.0;
            } else if (-d > a) {
                sN = sD;
            } else {
                sN = -d;
                sD = a;
            }
        } else if (tN > tD) {      // tc > 1  => the t=1 edge is visible
            tN = tD;
            // recompute sc for this edge
            if ((-d + b) < 0.0) {
                sN = 0;
            } else if ((-d + b) > a) {
                sN = sD;
            } else {
                sN = (-d + b);
                sD = a;
            }
        }
        // finally do the division to get sc and tc
        const sc = (mathAbs(sN) < EPSILON ? 0.0 : sN / sD);
        const tc = (mathAbs(tN) < EPSILON ? 0.0 : tN / tD);

        // get the difference of the two closest points
        const dP = v3_3;
        dP.set(w);
        dP.add(vec3MultiplyScalar(v3_4, u, sc));
        dP.subtract(vec3MultiplyScalar(v3_5, v, tc));
        const radius = capsuleA.radius + capsuleB.radius;
        return dP.lengthSqr() < radius * radius;
    };
}());

/**
 * @en
 * Algorithm of intersect detect for basic geometry.
 * @zh
 * 基础几何的相交性检测算法。
 */
const intersect = {
    raySphere,
    rayAABB,
    rayOBB,
    rayPlane,
    rayTriangle,
    rayCapsule,

    // As these functions depends on upper modules, so move the implementation to misc/intersect.ts.
    // These functions are defined here to keep compatibility, they will be override in misc/intersect.ts.
    raySubMesh: null as unknown as (ray: Ray, submesh: RenderingSubMesh, options?: IRaySubMeshOptions) => number,
    rayMesh: null as unknown as (ray: Ray, mesh: Mesh, options?: IRayMeshOptions) => number,
    rayModel: null as unknown as (r: Ray, model: Model, options?: IRayModelOptions) => number,

    lineSphere,
    lineAABB,
    lineOBB,
    linePlane,
    lineTriangle,

    sphereWithSphere,
    sphereAABB,
    sphereOBB,
    spherePlane,
    sphereFrustum,
    sphereFrustumAccurate,
    sphereCapsule,

    aabbWithAABB,
    aabbWithOBB,
    aabbPlane,
    aabbFrustum,
    aabbFrustumAccurate,

    obbWithOBB,
    obbPlane,
    obbFrustum,
    obbFrustumAccurate,
    obbPoint,
    obbCapsule,
    aabbFrustumCompletelyInside,

    capsuleWithCapsule,

    /**
     * @en Check intersection between two geometries, it accept all basic geometry types in [[geometry]] module.
     * @zh 两个几何体的相交性检测，可填入 [[geometry]] 模块中的基础几何形状。
     * @param g1 @en The first geometry. @zh 第一个几何体。
     * @param g2 @en The second geometry. @zh 第二个几何体。
     * @param outPt @en A 3d point to store the intersection point result, only part of the geometries support this.
     *              @zh 可选，用于保存相交点的输出对象。（注：仅部分形状的检测带有这个返回值）
     */
    resolve (g1: any, g2: any, outPt = null): number {
        const type1 = g1._type;
        const type2 = g2._type;
        const resolver = this[type1 | type2] as (...args: any) => number;
        return type1 < type2 ? resolver(g1, g2, outPt) : resolver(g2, g1, outPt);
    },
};

intersect[ShapeType.SHAPE_RAY | ShapeType.SHAPE_SPHERE] = raySphere;
intersect[ShapeType.SHAPE_RAY | ShapeType.SHAPE_AABB] = rayAABB;
intersect[ShapeType.SHAPE_RAY | ShapeType.SHAPE_OBB] = rayOBB;
intersect[ShapeType.SHAPE_RAY | ShapeType.SHAPE_PLANE] = rayPlane;
intersect[ShapeType.SHAPE_RAY | ShapeType.SHAPE_TRIANGLE] = rayTriangle;
intersect[ShapeType.SHAPE_RAY | ShapeType.SHAPE_CAPSULE] = rayCapsule;

intersect[ShapeType.SHAPE_LINE | ShapeType.SHAPE_SPHERE] = lineSphere;
intersect[ShapeType.SHAPE_LINE | ShapeType.SHAPE_AABB] = lineAABB;
intersect[ShapeType.SHAPE_LINE | ShapeType.SHAPE_OBB] = lineOBB;
intersect[ShapeType.SHAPE_LINE | ShapeType.SHAPE_PLANE] = linePlane;
intersect[ShapeType.SHAPE_LINE | ShapeType.SHAPE_TRIANGLE] = lineTriangle;

intersect[ShapeType.SHAPE_SPHERE] = sphereWithSphere;
intersect[ShapeType.SHAPE_SPHERE | ShapeType.SHAPE_AABB] = sphereAABB;
intersect[ShapeType.SHAPE_SPHERE | ShapeType.SHAPE_OBB] = sphereOBB;
intersect[ShapeType.SHAPE_SPHERE | ShapeType.SHAPE_PLANE] = spherePlane;
intersect[ShapeType.SHAPE_SPHERE | ShapeType.SHAPE_FRUSTUM] = sphereFrustum;
intersect[ShapeType.SHAPE_SPHERE | ShapeType.SHAPE_FRUSTUM_ACCURATE] = sphereFrustumAccurate;
intersect[ShapeType.SHAPE_SPHERE | ShapeType.SHAPE_CAPSULE] = sphereCapsule;

intersect[ShapeType.SHAPE_AABB] = aabbWithAABB;
intersect[ShapeType.SHAPE_AABB | ShapeType.SHAPE_OBB] = aabbWithOBB;
intersect[ShapeType.SHAPE_AABB | ShapeType.SHAPE_PLANE] = aabbPlane;
intersect[ShapeType.SHAPE_AABB | ShapeType.SHAPE_FRUSTUM] = aabbFrustum;
intersect[ShapeType.SHAPE_AABB | ShapeType.SHAPE_FRUSTUM_ACCURATE] = aabbFrustumAccurate;

intersect[ShapeType.SHAPE_OBB] = obbWithOBB;
intersect[ShapeType.SHAPE_OBB | ShapeType.SHAPE_PLANE] = obbPlane;
intersect[ShapeType.SHAPE_OBB | ShapeType.SHAPE_FRUSTUM] = obbFrustum;
intersect[ShapeType.SHAPE_OBB | ShapeType.SHAPE_FRUSTUM_ACCURATE] = obbFrustumAccurate;
intersect[ShapeType.SHAPE_OBB | ShapeType.SHAPE_CAPSULE] = obbCapsule;

intersect[ShapeType.SHAPE_CAPSULE] = capsuleWithCapsule;

export default intersect;
