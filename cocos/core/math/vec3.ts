/* eslint-disable @typescript-eslint/no-this-alias */
/*
 Copyright (c) 2016 Chukong Technologies Inc.
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

import type { Vec2 }  from './vec2';
import { CCClass } from '../data/class';
import { ValueType } from '../value-types/value-type';
import { Mat4 } from './mat4';
import { IMat3Like, IMat4Like, IQuatLike, IVec3Like } from './type-define';
import { clamp, EPSILON, lerp, random } from './utils';
import { legacyCC } from '../global-exports';
import { warnID } from '../platform/debug';

const abs = Math.abs;
const max = Math.max;
const min = Math.min;
const PI = Math.PI;
const acos = Math.acos;
const sin = Math.sin;
const cos = Math.cos;
const sqrt = Math.sqrt;
const ceil = Math.ceil;
const floor = Math.floor;
const round = Math.round;

function freezeVec3 (x: number, y: number, z: number): Readonly<Vec3> {
    return Object.freeze(new Vec3(x, y, z));
}

/**
 * @en Representation of 3D vectors and points.
 * @zh 三维向量。
 */
export class Vec3 extends ValueType {
    public static UNIT_X = freezeVec3(1, 0, 0);
    public static UNIT_Y = freezeVec3(0, 1, 0);
    public static UNIT_Z = freezeVec3(0, 0, 1);
    public static RIGHT = freezeVec3(1, 0, 0);
    public static UP = freezeVec3(0, 1, 0);
    public static FORWARD = freezeVec3(0, 0, -1); // we use -z for view-dir
    public static ZERO = freezeVec3(0, 0, 0);
    public static ONE = freezeVec3(1, 1, 1);
    public static NEG_ONE = freezeVec3(-1, -1, -1);

    /**
     * @en return a Vec3 object with x = 0, y = 0, z = 0.
     * @zh 将目标赋值为零向量
     */
    public static zero<Out extends IVec3Like> (out: Out): Out {
        out.x = 0;
        out.y = 0;
        out.z = 0;
        return out;
    }

    /**
     * @en Obtains a clone of the given vector object
     * @zh 获得指定向量的拷贝
     */
    public static clone <Out extends IVec3Like> (a: Out): Vec3 {
        return new Vec3(a.x, a.y, a.z);
    }

    /**
     * @en Copy the target vector and save the results to out vector object
     * @zh 复制目标向量
     */
    public static copy<Out extends IVec3Like, Vec3Like extends IVec3Like> (out: Out, a: Vec3Like): Out {
        out.x = a.x;
        out.y = a.y;
        out.z = a.z;
        return out;
    }

    /**
     * @en Sets the out vector with the given x, y and z values
     * @zh 设置向量值
     */
    public static set<Out extends IVec3Like> (out: Out, x: number, y: number, z: number): Out {
        out.x = x;
        out.y = y;
        out.z = z;
        return out;
    }

    /**
     * @en Element-wise vector addition and save the results to out vector object
     * @zh 逐元素向量加法
     */
    public static add<Out extends IVec3Like> (out: Out, a: IVec3Like, b: IVec3Like): Out {
        out.x = a.x + b.x;
        out.y = a.y + b.y;
        out.z = a.z + b.z;
        return out;
    }

    /**
     * @en Element-wise vector subtraction and save the results to out vector object
     * @zh 逐元素向量减法
     */
    public static subtract<Out extends IVec3Like> (out: Out, a: IVec3Like, b: IVec3Like): Out {
        out.x = a.x - b.x;
        out.y = a.y - b.y;
        out.z = a.z - b.z;
        return out;
    }

    /**
     * @en Element-wise vector multiplication and save the results to out vector object
     * @zh 逐元素向量乘法 (分量积)
     */
    public static multiply<Out extends IVec3Like> (out: Out, a: IVec3Like, b: IVec3Like): Out {
        out.x = a.x * b.x;
        out.y = a.y * b.y;
        out.z = a.z * b.z;
        return out;
    }

    /**
     * @en Element-wise vector division and save the results to out vector object
     * @zh 逐元素向量除法
     */
    public static divide<Out extends IVec3Like> (out: Out, a: IVec3Like, b: IVec3Like): Out {
        out.x = a.x / b.x;
        out.y = a.y / b.y;
        out.z = a.z / b.z;
        return out;
    }

    /**
     * @en Rounds up by elements of the vector and save the results to out vector object
     * @zh 逐元素向量向上取整
     */
    public static ceil<Out extends IVec3Like> (out: Out, a: IVec3Like): Out {
        out.x = ceil(a.x);
        out.y = ceil(a.y);
        out.z = ceil(a.z);
        return out;
    }

    /**
     * @en Element-wise rounds down of the current vector and save the results to the out vector
     * @zh 逐元素向量向下取整
     */
    public static floor<Out extends IVec3Like> (out: Out, a: IVec3Like): Out {
        out.x = floor(a.x);
        out.y = floor(a.y);
        out.z = floor(a.z);
        return out;
    }

    /**
     * @en Calculates element-wise minimum values and save to the out vector
     * @zh 逐元素向量最小值
     */
    public static min<Out extends IVec3Like> (out: Out, a: IVec3Like, b: IVec3Like): Out {
        out.x = min(a.x, b.x);
        out.y = min(a.y, b.y);
        out.z = min(a.z, b.z);
        return out;
    }

    /**
     * @en Calculates element-wise maximum values and save to the out vector
     * @zh 逐元素向量最大值
     */
    public static max<Out extends IVec3Like> (out: Out, a: IVec3Like, b: IVec3Like): Out {
        out.x = max(a.x, b.x);
        out.y = max(a.y, b.y);
        out.z = max(a.z, b.z);
        return out;
    }

    /**
     * @en Calculates element-wise round results and save to the out vector
     * @zh 逐元素向量四舍五入取整
     */
    public static round<Out extends IVec3Like> (out: Out, a: IVec3Like): Out {
        out.x = round(a.x);
        out.y = round(a.y);
        out.z = round(a.z);
        return out;
    }

    /**
     * @en Vector scalar multiplication and save the results to out vector object
     * @zh 向量标量乘法
     */
    public static multiplyScalar<Out extends IVec3Like, Vec3Like extends IVec3Like > (out: Out, a: Vec3Like, b: number): Out {
        out.x = a.x * b;
        out.y = a.y * b;
        out.z = a.z * b;
        return out;
    }

    /**
     * @en Element-wise multiplication and addition with the equation: a + b * scale
     * @zh 逐元素向量乘加: A + B * scale
     */
    public static scaleAndAdd<Out extends IVec3Like> (out: Out, a: IVec3Like, b: IVec3Like, scale: number): Out {
        out.x = a.x + b.x * scale;
        out.y = a.y + b.y * scale;
        out.z = a.z + b.z * scale;
        return out;
    }

    /**
     * @en Calculates the euclidean distance of two vectors
     * @zh 求两向量的欧氏距离
     */
    public static distance (a: IVec3Like, b: IVec3Like): number {
        const x = b.x - a.x;
        const y = b.y - a.y;
        const z = b.z - a.z;
        return sqrt(x * x + y * y + z * z);
    }

    /**
     * @en Calculates the squared euclidean distance of two vectors
     * @zh 求两向量的欧氏距离平方
     */
    public static squaredDistance (a: IVec3Like, b: IVec3Like): number {
        const x = b.x - a.x;
        const y = b.y - a.y;
        const z = b.z - a.z;
        return x * x + y * y + z * z;
    }

    /**
     * @en Calculates the length of the vector
     * @zh 求向量长度
     */
    public static len (a: IVec3Like): number {
        const x = a.x;
        const y = a.y;
        const z = a.z;
        return sqrt(x * x + y * y + z * z);
    }

    /**
     * @en Calculates the squared length of the vector
     * @zh 求向量长度平方
     */
    public static lengthSqr (a: IVec3Like): number {
        const x = a.x;
        const y = a.y;
        const z = a.z;
        return x * x + y * y + z * z;
    }

    /**
     * @en Sets each element to its negative value
     * @zh 逐元素向量取负
     */
    public static negate<Out extends IVec3Like> (out: Out, a: IVec3Like): Out {
        out.x = -a.x;
        out.y = -a.y;
        out.z = -a.z;
        return out;
    }

    /**
     * @en Sets each element to its inverse value, zero value will become Infinity
     * @zh 逐元素向量取倒数，接近 0 时返回 Infinity
     */
    public static invert<Out extends IVec3Like> (out: Out, a: IVec3Like): Out {
        out.x = 1.0 / a.x;
        out.y = 1.0 / a.y;
        out.z = 1.0 / a.z;
        return out;
    }

    /**
     * @en Sets each element to its inverse value, zero value will remain zero
     * @zh 逐元素向量取倒数，接近 0 时返回 0
     */
    public static invertSafe<Out extends IVec3Like> (out: Out, a: IVec3Like): Out {
        const x = a.x;
        const y = a.y;
        const z = a.z;

        if (abs(x) < EPSILON) {
            out.x = 0;
        } else {
            out.x = 1.0 / x;
        }

        if (abs(y) < EPSILON) {
            out.y = 0;
        } else {
            out.y = 1.0 / y;
        }

        if (abs(z) < EPSILON) {
            out.z = 0;
        } else {
            out.z = 1.0 / z;
        }

        return out;
    }

    /**
     * @en Sets the normalized vector to the out vector, returns a zero vector if input is a zero vector.
     * @zh 归一化向量，输入零向量将会返回零向量。
     */
    public static normalize<Out extends IVec3Like> (out: Out, a: IVec3Like): Out {
        const x = a.x;
        const y = a.y;
        const z = a.z;

        let len = x * x + y * y + z * z;
        if (len > 0) {
            len = 1 / sqrt(len);
            out.x = x * len;
            out.y = y * len;
            out.z = z * len;
        } else {
            out.x = 0;
            out.y = 0;
            out.z = 0;
        }
        return out;
    }

    /**
     * @en Calculates the dot product of the vector
     * @zh 向量点积（数量积）
     */
    public static dot <Out extends IVec3Like> (a: Out, b: IVec3Like): number {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }

    /**
     * @en Calculates the cross product of the vector
     * @zh 向量叉积（向量积）
     */
    public static cross<Out extends IVec3Like> (out: Out, a: IVec3Like, b: IVec3Like): Out {
        const { x: ax, y: ay, z: az } = a;
        const { x: bx, y: by, z: bz } = b;
        out.x = ay * bz - az * by;
        out.y = az * bx - ax * bz;
        out.z = ax * by - ay * bx;
        return out;
    }

    /**
     * @en Calculates the linear interpolation between two vectors with a given ratio: A + t * (B - A)
     * @zh 逐元素向量线性插值： A + t * (B - A)
     */
    public static lerp<Out extends IVec3Like> (out: Out, a: IVec3Like, b: IVec3Like, t: number): Out {
        out.x = a.x + t * (b.x - a.x);
        out.y = a.y + t * (b.y - a.y);
        out.z = a.z + t * (b.z - a.z);
        return out;
    }

    /**
     * @zh 球面线性插值。多用于插值两个方向向量。
     * @en Spherical linear interpolation. Commonly used in interpolation between directional vectors.
     * @param out @zh 输出向量。 @en Output vector.
     * @param from @zh 起点向量。 @en Start vector.
     * @param to @zh 终点向量。 @en Destination vector.
     * @param t @zh 插值参数。@en Interpolation parameter.
     * @returns `out`
     * @description
     * @zh
     * - 如果 `from`、`to` 中任何一个接近零向量，则结果就是 `from` 到 `to` 线性插值的结果；
     *
     * - 否则，如果 `from`、`to` 方向刚好接近相反，
     * 则结果向量是满足以下条件的一个向量：结果向量和两个输入向量的夹角之比是 `t`，其长度是 `from` 到 `to` 的长度线性插值的结果；
     *
     * - 否则，结果是从标准化后的 `from` 到 标准化后的 `to`
     * 进行球面线性插值的结果乘以 `from` 到 `to` 的长度线性插值后的长度。
     * @en
     * - If either `from` or `to` is close to zero vector,
     * the result would be the (non-spherical) linear interpolation result from `from` to `to`.
     *
     * - Otherwise, if `from` and `to` have almost opposite directions,
     * the result would be such a vector so that:
     * The angle ratio between result vector and input vectors is `t`,
     * the length of result vector is the linear interpolation of lengths from `from` to `to`.
     *
     * - Otherwise, the result would be the spherical linear interpolation result
     * from normalized `from` to normalized `to`,
     * then scaled by linear interpolation of lengths from `from` to `to`.
     */
    public static slerp = ((): <Out extends IVec3Like>(out: Out, from: Readonly<IVec3Like>, to: Readonly<IVec3Like>, t: number) => Out => {
        const cacheV1 = new Vec3();
        const cacheV2 = new Vec3();
        const cacheV3 = new Vec3();
        return <Out extends IVec3Like> (out: Out, from: Readonly<IVec3Like>, to: Readonly<IVec3Like>, t: number): Out => {
            const EPSILON = 1e-5;
            const lenFrom = Vec3.len(from);
            const lenTo = Vec3.len(to);
            if (lenFrom < EPSILON || lenTo < EPSILON) {
                return Vec3.lerp(out, from, to, t);
            }
            const lenLerped = lerp(lenFrom, lenTo, t);
            const dot = Vec3.dot(from, to) / (lenFrom * lenTo);
            if (dot > 1.0 - EPSILON) {
                // If the directions are almost same, slerp should be close to lerp.
                return Vec3.lerp(out, from, to, t);
            } else if (dot < -1.0 + EPSILON) {
                // If the directions are almost opposite,
                // every vector that orthonormal to the directions can be the rotation axis.
                const fromNormalized = Vec3.multiplyScalar(cacheV1, from, 1.0 / lenFrom);
                const axis = Vec3.generateOrthogonal(cacheV2, fromNormalized);
                const angle = PI * t;
                rotateAxisAngle(cacheV3, fromNormalized, axis, angle);
                Vec3.multiplyScalar(out, cacheV3, lenLerped);
                return out;
            } else {
                // Do not have to clamp. We done it before.
                const dotClamped = dot;
                const theta = acos(dotClamped) * t;
                const fromNormalized = Vec3.multiplyScalar(cacheV1, from, 1.0 / lenFrom);
                const toNormalized = Vec3.multiplyScalar(cacheV2, to, 1.0 / lenTo);
                Vec3.scaleAndAdd(cacheV3, toNormalized, fromNormalized, -dotClamped);
                Vec3.normalize(cacheV3, cacheV3);
                Vec3.multiplyScalar(cacheV3, cacheV3, sin(theta));
                Vec3.scaleAndAdd(cacheV3, cacheV3, fromNormalized, cos(theta));
                Vec3.multiplyScalar(out, cacheV3, lenLerped);
                return out;
            }
        };
    })();

    /**
     * @en Generates a uniformly distributed random vector points from center to the surface of the unit sphere
     * @zh 生成一个在单位球体上均匀分布的随机向量
     * @param scale vector length
     */
    public static random<Out extends IVec3Like> (out: Out, scale?: number): Out {
        scale = scale || 1.0;

        const phi = random() * 2.0 * PI;
        const cosTheta = random() * 2 - 1;
        const sinTheta = sqrt(1 - cosTheta * cosTheta);

        out.x = sinTheta * cos(phi) * scale;
        out.y = sinTheta * sin(phi) * scale;
        out.z = cosTheta * scale;
        return out;
    }

    /**
     * @en Vector and fourth order matrix multiplication, will complete the vector with a fourth value as one
     * @zh 向量与四维矩阵乘法，默认向量第四位为 1。
     */
    public static transformMat4 <Out extends IVec3Like> (out: Out, a: IVec3Like, m: IMat4Like): Out {
        const x = a.x;
        const y = a.y;
        const z = a.z;
        let rhw = m.m03 * x + m.m07 * y + m.m11 * z + m.m15;
        rhw = rhw ? 1 / rhw : 1;
        out.x = (m.m00 * x + m.m04 * y + m.m08 * z + m.m12) * rhw;
        out.y = (m.m01 * x + m.m05 * y + m.m09 * z + m.m13) * rhw;
        out.z = (m.m02 * x + m.m06 * y + m.m10 * z + m.m14) * rhw;
        return out;
    }

    /**
     * @en Vector and fourth order matrix multiplication, will complete the vector with a fourth element as one
     * @zh 向量与四维矩阵乘法，默认向量第四位为 0。
     */
    public static transformMat4Normal<Out extends IVec3Like> (out: Out, a: IVec3Like, m: IMat4Like): Out {
        const x = a.x;
        const y = a.y;
        const z = a.z;
        let rhw = m.m03 * x + m.m07 * y + m.m11 * z;
        rhw = rhw ? 1 / rhw : 1;
        out.x = (m.m00 * x + m.m04 * y + m.m08 * z) * rhw;
        out.y = (m.m01 * x + m.m05 * y + m.m09 * z) * rhw;
        out.z = (m.m02 * x + m.m06 * y + m.m10 * z) * rhw;
        return out;
    }

    /**
     * @en Vector and third order matrix multiplication
     * @zh 向量与三维矩阵乘法
     */
    public static transformMat3<Out extends IVec3Like> (out: Out, a: IVec3Like, m: IMat3Like): Out {
        const x = a.x;
        const y = a.y;
        const z = a.z;
        out.x = x * m.m00 + y * m.m03 + z * m.m06;
        out.y = x * m.m01 + y * m.m04 + z * m.m07;
        out.z = x * m.m02 + y * m.m05 + z * m.m08;
        return out;
    }

    /**
     * @en Affine transformation vector
     * @zh 向量仿射变换
     */
    public static transformAffine<Out extends IVec3Like> (out: Out, v: IVec3Like, m: IMat4Like): Out {
        const x = v.x;
        const y = v.y;
        const z = v.z;
        out.x = m.m00 * x + m.m04 * y + m.m08 * z + m.m12;
        out.y = m.m01 * x + m.m05 * y + m.m09 * z + m.m13;
        out.z = m.m02 * x + m.m06 * y + m.m10 * z + m.m14;
        return out;
    }

    /**
     * @en Vector quaternion multiplication: q*a*q^{-1}.
     * @zh 向量四元数乘法：q*a*q^{-1}。
     */
    public static transformQuat<Out extends IVec3Like> (out: Out, a: IVec3Like, q: IQuatLike): Out {
        // benchmarks: http://jsperf.com/quaternion-transform-Vec3-implementations

        // calculate quat * vec
        const ix = q.w * a.x + q.y * a.z - q.z * a.y;
        const iy = q.w * a.y + q.z * a.x - q.x * a.z;
        const iz = q.w * a.z + q.x * a.y - q.y * a.x;
        const iw = -q.x * a.x - q.y * a.y - q.z * a.z;

        // calculate result * inverse quat
        out.x = ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y;
        out.y = iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z;
        out.z = iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x;
        return out;
    }

    /**
     * @en Transforms the current vector with given scale, rotation and translation in order
     * @zh 以缩放 -> 旋转 -> 平移顺序变换向量
     */
    public static transformRTS<Out extends IVec3Like> (out: Out, a: IVec3Like, r: IQuatLike, t: IVec3Like, s: IVec3Like): Out {
        const x = a.x * s.x;
        const y = a.y * s.y;
        const z = a.z * s.z;
        const ix = r.w * x + r.y * z - r.z * y;
        const iy = r.w * y + r.z * x - r.x * z;
        const iz = r.w * z + r.x * y - r.y * x;
        const iw = -r.x * x - r.y * y - r.z * z;
        out.x = ix * r.w + iw * -r.x + iy * -r.z - iz * -r.y + t.x;
        out.y = iy * r.w + iw * -r.y + iz * -r.x - ix * -r.z + t.y;
        out.z = iz * r.w + iw * -r.z + ix * -r.y - iy * -r.x + t.z;
        return out;
    }

    /**
     * @en Transforms the current vector with given scale, rotation and translation in reverse order
     * @zh 以平移 -> 旋转 -> 缩放顺序逆变换向量
     */
    public static transformInverseRTS<Out extends IVec3Like> (out: Out, a: IVec3Like, r: IQuatLike, t: IVec3Like, s: IVec3Like): Out {
        const x = a.x - t.x;
        const y = a.y - t.y;
        const z = a.z - t.z;
        const ix = r.w * x - r.y * z + r.z * y;
        const iy = r.w * y - r.z * x + r.x * z;
        const iz = r.w * z - r.x * y + r.y * x;
        const iw = r.x * x + r.y * y + r.z * z;
        out.x = (ix * r.w + iw * r.x + iy * r.z - iz * r.y) / s.x;
        out.y = (iy * r.w + iw * r.y + iz * r.x - ix * r.z) / s.y;
        out.z = (iz * r.w + iw * r.z + ix * r.y - iy * r.x) / s.z;
        return out;
    }

    /**
     * @en Rotates the vector with specified angle around X axis
     * @zh 绕 X 轴旋转向量指定弧度
     * @param v rotation vector
     * @param o center of rotation
     * @param a radiance of rotation
     */
    public static rotateX<Out extends IVec3Like> (out: Out, v: IVec3Like, o: IVec3Like, a: number): Out {
        // Translate point to the origin
        const x = v.x - o.x;
        const y = v.y - o.y;
        const z = v.z - o.z;

        // perform rotation
        const c = cos(a);
        const s = sin(a);
        const rx = x;
        const ry = y * c - z * s;
        const rz = y * s + z * c;

        // translate to correct position
        out.x = rx + o.x;
        out.y = ry + o.y;
        out.z = rz + o.z;

        return out;
    }

    /**
     * @en Rotates the vector with specified angle around Y axis
     * @zh 绕 Y 轴旋转向量指定弧度
     * @param v rotation vector
     * @param o center of rotation
     * @param a radiance of rotation
     */
    public static rotateY<Out extends IVec3Like> (out: Out, v: IVec3Like, o: IVec3Like, a: number): Out {
        // Translate point to the origin
        const x = v.x - o.x;
        const y = v.y - o.y;
        const z = v.z - o.z;

        // perform rotation
        const c = cos(a);
        const s = sin(a);
        const rx = z * s + x * c;
        const ry = y;
        const rz = z * c - x * s;

        // translate to correct position
        out.x = rx + o.x;
        out.y = ry + o.y;
        out.z = rz + o.z;

        return out;
    }

    /**
     * @en Rotates the vector with specified angle around Z axis
     * @zh 绕 Z 轴旋转向量指定弧度
     * @param v rotation vector
     * @param o center of rotation
     * @param a radiance of rotation
     */
    public static rotateZ<Out extends IVec3Like> (out: Out, v: IVec3Like, o: IVec3Like, a: number): Out {
        // Translate point to the origin
        const x = v.x - o.x;
        const y = v.y - o.y;
        const z = v.z - o.z;

        // perform rotation
        const c = cos(a);
        const s = sin(a);
        const rx = x * c - y * s;
        const ry = x * s + y * c;
        const rz = z;

        // translate to correct position
        out.x = rx + o.x;
        out.y = ry + o.y;
        out.z = rz + o.z;

        return out;
    }

    /**
     * @en Rotates the vector with specified angle around any n axis
     * @zh 绕任意 n 轴旋转向量指定弧度
     * @param v rotation vector
     * @param o center of rotation
     * @param n axis of rotation
     * @param a radiance of rotation
     */
    public static rotateN<Out extends IVec3Like> (out: Out, v: IVec3Like, o: IVec3Like, n: IVec3Like, a: number): Out {
        // Translate point to the origin
        const x = v.x - o.x;
        const y = v.y - o.y;
        const z = v.z - o.z;

        // perform rotation
        const nx = n.x;
        const ny = n.y;
        const nz = n.z;

        const c = cos(a);
        const s = sin(a);
        const rx = x * (nx * nx * (1.0 - c) + c) + y * (nx * ny * (1.0 - c) - nz * s) + z * (nx * nz * (1.0 - c) + ny * s);
        const ry = x * (nx * ny * (1.0 - c) + nz * s) + y * (ny * ny * (1.0 - c) + c) + z * (ny * nz * (1.0 - c) - nx * s);
        const rz = x * (nx * nz * (1.0 - c) - ny * s) + y * (ny * nz * (1.0 - c) + nx * s) + z * (nz * nz * (1.0 - c) + c);

        // translate to correct position
        out.x = rx + o.x;
        out.y = ry + o.y;
        out.z = rz + o.z;

        return out;
    }

    /**
     * @en Converts the given vector to an array
     * @zh 向量转数组
     * @param ofs Array Start Offset
     */
    public static toArray <Out extends IWritableArrayLike<number>> (out: Out, v: IVec3Like, ofs = 0): Out {
        out[ofs + 0] = v.x;
        out[ofs + 1] = v.y;
        out[ofs + 2] = v.z;

        return out;
    }

    /**
     * @en Converts the given array to a vector
     * @zh 数组转向量
     * @param ofs Array Start Offset
     */
    public static fromArray <Out extends IVec3Like> (out: Out, arr: IWritableArrayLike<number>, ofs = 0): Out {
        out.x = arr[ofs + 0];
        out.y = arr[ofs + 1];
        out.z = arr[ofs + 2];
        return out;
    }

    /**
     * @en Check the equality of the two given vectors
     * @zh 向量等价判断
     */
    public static strictEquals (a: IVec3Like, b: IVec3Like): boolean {
        return a.x === b.x && a.y === b.y && a.z === b.z;
    }

    /**
     * @en Check whether the two given vectors are approximately equivalent
     * @zh 排除浮点数误差的向量近似等价判断
     */
    public static equals (a: IVec3Like, b: IVec3Like, epsilon = EPSILON): boolean {
        const { x: a0, y: a1, z: a2 } = a;
        const { x: b0, y: b1, z: b2 } = b;
        return (
            abs(a0 - b0) <= epsilon * max(1.0, abs(a0), abs(b0))
                && abs(a1 - b1) <= epsilon * max(1.0, abs(a1), abs(b1))
                && abs(a2 - b2) <= epsilon * max(1.0, abs(a2), abs(b2))
        );
    }

    /**
     * @en Calculates the radian angle between two vectors
     * @zh 求两向量夹角弧度
     */
    public static angle (a: IVec3Like, b: IVec3Like): number {
        const magSqr1 = a.x * a.x + a.y * a.y + a.z * a.z;
        const magSqr2 = b.x * b.x + b.y * b.y + b.z * b.z;

        if (magSqr1 === 0 || magSqr2 === 0) {
            return 0.0;
        }

        const dot = a.x * b.x + a.y * b.y + a.z * b.z;
        let cosine = dot / (sqrt(magSqr1 * magSqr2));
        cosine = clamp(cosine, -1.0, 1.0);
        return acos(cosine);
    }

    /**
     * @zh 计算 `a`、`b` 两向量之间的有符号夹角。
     *
     * 不妨假设 `a`、`b` 是钟表上的两根指针，其中 `a` 指向 12 点整，`normal` 是任何从钟表正面指出的向量。
     * 当 `b` **逆时针** 从 12 点走到 6 点的过程中，它们的角度变化范围为 (0°, 180°)；
     * 当 `b` **顺时针** 从 12 点走到 6 点的过程中，它们的角度变化范围为 (0°, -180°)。
     *
     * 反之，如果 `normal` 是任何从钟表反面指出的向量，两种范围将对调。
     *
     * @en Calculates the signed angle between the two vectors `a`, `b`.
     *
     * Suppose that `a` and `b` are two hands on a clock, where pointing at 12 o'clock,
     * and `normal` is arbitrary vector pointing out from the dial side of the clock.
     * As `b` goes counterclockwise from 12 o'clock to 6 o'clock, their angle varies in the range (0°, 180°);
     * As `b` goes clockwise from 12 o'clock to 6 o'clock, their angle varies in the range (0°, -180°).
     *
     * Instead, if `normal` is arbitrary vector pointing out from the opposite side of the clock,
     * the two ranges would swap.
     *
     * @param a @zh 向量 `a`。 @en The vector `a`.
     * @param b @zh 向量 `b`。 @en The vector `b`.
     * @param normal @zh 参考向量。 @en The reference vector.
     * @returns @zh 向量 `a` 和 `b` 之间的有符号夹角。 @en The signed angle between `a`, `b`.
     */
    public static signedAngle = (() => {
        const cacheCross = new Vec3();
        return (a: Readonly<IVec3Like>, b: Readonly<IVec3Like>, normal: Readonly<IVec3Like>): number => {
            const angle = Vec3.angle(a, b);
            const cross = Vec3.cross(cacheCross, a, b);
            const dot = Vec3.dot(cross, normal);
            return dot < 0 ? -angle : angle;
        };
    })();

    /**
     * @en Calculates the projection vector on the specified plane
     * @zh 计算向量在指定平面上的投影
     * @param a projection vector
     * @param n the normal line of specified plane
     */
    public static projectOnPlane<Out extends IVec3Like> (out: Out, a: IVec3Like, n: IVec3Like): Out {
        return Vec3.subtract(out, a, Vec3.project(out, a, n));
    }

    /**
     * @en Calculates the projection on the specified vector
     * @zh 计算向量在指定向量上的投影
     * @param a projection vector
     * @param b target vector
     */
    public static project<Out extends IVec3Like> (out: Out, a: IVec3Like, b: IVec3Like): Out {
        const sqrLen = Vec3.lengthSqr(b);
        if (sqrLen < 0.000001) {
            return Vec3.set(out, 0, 0, 0);
        } else {
            return Vec3.multiplyScalar(out, b, Vec3.dot(a, b) / sqrLen);
        }
    }

    /**
     * @en Calculates a new position from current to target no more than `maxStep` distance.
     * @zh 计算一个新位置从当前位置移动不超过 `maxStep` 距离到目标位置。
     * @param current current position
     * @param target target position
     * @param maxStep maximum moving distance
     */
    public static moveTowards<Out extends IVec3Like> (out: Out, current: IVec3Like, target: IVec3Like, maxStep: number): Out {
        const deltaX = target.x - current.x;
        const deltaY = target.y - current.y;
        const deltaZ = target.z - current.z;

        const distanceSqr = deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ;
        if (distanceSqr === 0 || (maxStep >= 0 && distanceSqr < maxStep * maxStep)) {
            out.x = target.x;
            out.y = target.y;
            out.z = target.z;
            return out;
        }

        const distance = sqrt(distanceSqr);
        const scale = maxStep / distance;
        out.x = current.x + deltaX * scale;
        out.y = current.y + deltaY * scale;
        out.z = current.z + deltaZ * scale;
        return out;
    }

    /**
     * @zh 生成指定向量的一个正交单位向量。如果指定的向量 **精确地** 是零向量，则返回 **精确的** 零向量。
     * @en Generates an unit vector orthogonal to specified vector.
     * If the specified vector is **strictly** zero vector, the result is **strict** zero vector.
     * @param out @zh 生成的向量。@en The generated vector.
     * @param n @zh 输入向量。该向量 **不必** 是标准化的。 @en The input vector. **Need not** to be normalized.
     * @returns `out`
     */
    public static generateOrthogonal<Out extends IVec3Like> (out: Out, n: Readonly<IVec3Like>): Out {
        const { x, y, z } = n;
        // 1. Drop the component with minimal magnitude.
        // 2. Negate one of the remain components.
        // 3. Swap the remain components.
        const absX = abs(x);
        const absY = abs(y);
        const absZ = abs(z);
        if (absX < absY && absX < absZ) {
            Vec3.set(out, 0.0, z, -y);
        } else if (absY < absZ) {
            Vec3.set(out, z, 0.0, -x);
        } else {
            Vec3.set(out, y, -x, 0.0);
        }
        return Vec3.normalize(out, out);
    }

    /**
     * @en x component.
     * @zh x 分量。
     */
    public declare x: number;

    /**
     * @en y component.
     * @zh y 分量。
     */
    public declare y: number;

    /**
     * @en z component.
     * @zh z 分量。
     */
    public declare z: number;

    constructor (v: Vec3);

    constructor (x?: number, y?: number, z?: number);

    constructor (x?: number | Vec3, y?: number, z?: number) {
        super();
        if (typeof x === 'object') {
            this.x = x.x;
            this.y = x.y;
            this.z = x.z;
        } else {
            this.x = x || 0;
            this.y = y || 0;
            this.z = z || 0;
        }
    }

    /**
     * @en clone a Vec3 value
     * @zh 克隆当前向量。
     */
    public clone (): Vec3 {
        return new Vec3(this.x, this.y, this.z);
    }

    /**
     * @en Set the current vector value with the given vector.
     * @zh 设置当前向量使其与指定向量相等。
     * @param other Specified vector
     * @returns `this`
     */
    public set (other: Vec3): Vec3;

    /**
     * @en Set the value of each component of the current vector.
     * @zh 设置当前向量的具体分量值。
     * @param x x value
     * @param y y value
     * @param z z value
     * @returns `this`
     */
    public set (x?: number, y?: number, z?: number): Vec3;

    public set (x?: number | Vec3, y?: number, z?: number): Vec3 {
        if (typeof x === 'object') {
            this.x = x.x;
            this.y = x.y;
            this.z = x.z;
        } else {
            this.x = x || 0;
            this.y = y || 0;
            this.z = z || 0;
        }
        return this;
    }

    /**
     * @en Check whether the vector approximately equals another one.
     * @zh 判断当前向量是否在误差范围内与指定向量相等。
     * @param other Specified vector
     * @param epsilon The error allowed. It`s should be a non-negative number.
     * @returns Returns `true` when the components of both vectors are equal within the specified range of error; otherwise it returns `false`.
     */
    public equals (other: Vec3, epsilon = EPSILON): boolean {
        return (
            abs(this.x - other.x) <= epsilon
            && abs(this.y - other.y) <= epsilon
            && abs(this.z - other.z) <= epsilon
        );
    }

    /**
     * @en Check whether the vector approximately equals another one.
     * @zh 判断当前向量是否在误差范围内与指定分量的向量相等。
     * @param x The x value of specified vector
     * @param y The y value of specified vector
     * @param z The z value of specified vector
     * @param epsilon The error allowed. It`s should be a non-negative number.
     * @returns Returns `true` when the components of both vectors are equal within the specified range of error; otherwise it returns `false`.
     */
    public equals3f (x: number, y: number, z: number, epsilon = EPSILON): boolean {
        return (
            abs(this.x - x) <= epsilon
            && abs(this.y - y) <= epsilon
            && abs(this.z - z) <= epsilon
        );
    }

    /**
     * @en Check whether the current vector strictly equals another Vec3.
     * @zh 判断当前向量是否与指定向量相等。
     * @param other specified vector
     * @returns Returns `true` when the components of both vectors are equal within the specified range of error; otherwise it returns `false`.
     */
    public strictEquals (other: Vec3): boolean {
        return this.x === other.x && this.y === other.y && this.z === other.z;
    }

    /**
     * @en Check whether the current vector strictly equals another Vec3.
     * @zh 判断当前向量是否与指定分量的向量相等。
     * @param x The x value of specified vector
     * @param y The y value of specified vector
     * @param z The z value of specified vector
     * @returns Returns `true` when the components of both vectors are equal within the specified range of error; otherwise it returns `false`.
     */
    public strictEquals3f (x: number, y: number, z: number): boolean {
        return this.x === x && this.y === y && this.z === z;
    }

    /**
     * @en Transform to string with vector information.
     * @zh 返回当前向量的字符串表示。
     * @returns The string with vector information
     */
    public toString (): string {
        return `(${this.x}, ${this.y}, ${this.z})`;
    }

    /**
     * @en Calculate linear interpolation result between this vector and another one with given ratio.
     * @zh 根据指定的插值比率，从当前向量到目标向量之间做插值。
     * @param to Target vector
     * @param ratio The interpolation coefficient.The range is [0,1].
     */
    public lerp (to: Vec3, ratio: number): Vec3 {
        this.x += ratio * (to.x - this.x);
        this.y += ratio * (to.y - this.y);
        this.z += ratio * (to.z - this.z);
        return this;
    }

    /**
     * @en Adds the current vector with another one and return this
     * @zh 向量加法。将当前向量与指定向量的相加
     * @param other specified vector
     */
    public add (other: Vec3): Vec3 {
        this.x += other.x;
        this.y += other.y;
        this.z += other.z;
        return this;
    }

    /**
     * @en Adds the current vector with another one and return this
     * @zh 向量加法。将当前向量与指定分量的向量相加
     * @param x The x value of specified vector
     * @param y The y value of specified vector
     * @param z The z value of specified vector
     */
    public add3f (x: number, y: number, z: number): Vec3 {
        this.x += x;
        this.y += y;
        this.z += z;
        return this;
    }

    /**
     * @en Subtracts one vector from this, and returns this.
     * @zh 向量减法。将当前向量减去指定向量的结果。
     * @param other specified vector
     */
    public subtract (other: Vec3): Vec3 {
        this.x -= other.x;
        this.y -= other.y;
        this.z -= other.z;
        return this;
    }

    /**
     * @en Subtracts one vector from this, and returns this.
     * @zh 向量减法。将当前向量减去指定分量的向量
     * @param x The x value of specified vector
     * @param y The y value of specified vector
     * @param z The z value of specified vector
     */
    public subtract3f (x: number, y: number, z: number): Vec3 {
        this.x -= x;
        this.y -= y;
        this.z -= z;
        return this;
    }

    /**
     * @en Multiplies the current vector with a number, and returns this.
     * @zh 向量数乘。将当前向量数乘指定标量
     * @param scalar scalar number
     */
    public multiplyScalar (scalar: number): Vec3 {
        if (typeof scalar === 'object') {
            warnID(16357);
        }
        this.x *= scalar;
        this.y *= scalar;
        this.z *= scalar;
        return this;
    }

    /**
     * @en Multiplies the current vector with another one and return this
     * @zh 向量乘法。将当前向量乘以与指定向量的结果赋值给当前向量。
     * @param other specified vector
     */
    public multiply (other: Vec3): Vec3 {
        if (typeof other !== 'object') {
            warnID(16358);
        }
        this.x *= other.x;
        this.y *= other.y;
        this.z *= other.z;
        return this;
    }

    /**
     * @en Multiplies the current vector with another one and return this
     * @zh 向量乘法。将当前向量与指定分量的向量相乘的结果赋值给当前向量。
     * @param x The x value of specified vector
     * @param y The y value of specified vector
     * @param z The z value of specified vector
     */
    public multiply3f (x: number, y: number, z: number): Vec3 {
        this.x *= x;
        this.y *= y;
        this.z *= z;
        return this;
    }

    /**
     * @en Element-wisely divides this vector with another one, and return this.
     * @zh 向量逐元素相除。将当前向量与指定分量的向量相除的结果赋值给当前向量。
     * @param other specified vector
     */
    public divide (other: Vec3): Vec3 {
        this.x /= other.x;
        this.y /= other.y;
        this.z /= other.z;
        return this;
    }

    /**
     * @en Element-wisely divides this vector with another one, and return this.
     * @zh 向量逐元素相除。将当前向量与指定分量的向量相除的结果赋值给当前向量。
     * @param x The x value of specified vector
     * @param y The y value of specified vector
     * @param z The z value of specified vector
     */
    public divide3f (x: number, y: number, z: number): Vec3 {
        this.x /= x;
        this.y /= y;
        this.z /= z;
        return this;
    }

    /**
     * @en Sets each component of this vector with its negative value
     * @zh 将当前向量的各个分量取反
     */
    public negative (): Vec3 {
        this.x = -this.x;
        this.y = -this.y;
        this.z = -this.z;
        return this;
    }

    /**
     * @en Clamp the vector between minInclusive and maxInclusive.
     * @zh 设置当前向量的值，使其各个分量都处于指定的范围内。
     * @param minInclusive Minimum value allowed
     * @param maxInclusive Maximum value allowed
     * @returns `this`
     */
    public clampf (minInclusive: Vec3, maxInclusive: Vec3): Vec3 {
        this.x = clamp(this.x, minInclusive.x, maxInclusive.x);
        this.y = clamp(this.y, minInclusive.y, maxInclusive.y);
        this.z = clamp(this.z, minInclusive.z, maxInclusive.z);
        return this;
    }

    /**
     * @en Calculates the dot product with another vector
     * @zh 向量点乘。
     * @param other specified vector
     * @returns The result of calculates the dot product with another vector
     */
    public dot (other: Vec3): number {
        return this.x * other.x + this.y * other.y + this.z * other.z;
    }

    /**
     * @en Calculates the cross product with another vector.
     * @zh 向量叉乘。将当前向量左叉乘指定向量
     * @param other specified vector
     */
    public cross (other: Vec3): Vec3 {
        const { x: ax, y: ay, z: az } = this;
        const { x: bx, y: by, z: bz } = other;

        this.x = ay * bz - az * by;
        this.y = az * bx - ax * bz;
        this.z = ax * by - ay * bx;
        return this;
    }

    /**
     * @en Returns the length of this vector.
     * @zh 计算向量的长度（模）。
     * @returns Length of vector
     */
    public length (): number {
        const self = this;
        return sqrt(self.x * self.x + self.y * self.y + self.z * self.z);
    }

    /**
     * @en Returns the squared length of this vector.
     * @zh 计算向量长度（模）的平方。
     * @returns the squared length of this vector
     */
    public lengthSqr (): number {
        const self = this;
        return self.x * self.x + self.y * self.y + self.z * self.z;
    }

    /**
     * @en Normalize the current vector.
     * @zh 将当前向量归一化
     */
    public normalize (): Vec3 {
        const self = this;
        const x = self.x;
        const y = self.y;
        const z = self.z;

        let len = x * x + y * y + z * z;
        if (len > 0) {
            len = 1 / sqrt(len);
            self.x = x * len;
            self.y = y * len;
            self.z = z * len;
        }

        return self;
    }

    /**
     * @en Transforms the vec3 with a mat4. 4th vector component is implicitly '1'
     * @zh 将当前向量视为 w 分量为 1 的四维向量，应用四维矩阵变换到当前矩阵
     * @param matrix matrix to transform with
     */
    public transformMat4 (matrix: Mat4): Vec3 {
        const self = this;
        const x = self.x;
        const y = self.y;
        const z = self.z;
        let rhw = matrix.m03 * x + matrix.m07 * y + matrix.m11 * z + matrix.m15;
        rhw = rhw ? 1 / rhw : 1;
        self.x = (matrix.m00 * x + matrix.m04 * y + matrix.m08 * z + matrix.m12) * rhw;
        self.y = (matrix.m01 * x + matrix.m05 * y + matrix.m09 * z + matrix.m13) * rhw;
        self.z = (matrix.m02 * x + matrix.m06 * y + matrix.m10 * z + matrix.m14) * rhw;
        return self;
    }

    /**
     * @en Converts the current Vec3 object to a Vec2 object by adding a z-component of 0.
     * @zh 将当前的Vec3对象转换为一个z分量为0的Vec3对象。
     * @returns Vec2 @en A new Vec2 object created from the current Vec3 object with z-component ignored.
     * @zh 从当前的Vec3对象创建一个新的Vec2对象，丢弃z分量。
     */
    public toVec2 (): Vec2 {
        // eslint-disable-next-line
        return new legacyCC.Vec2(this.x, this.y);
    }
}

CCClass.fastDefine('cc.Vec3', Vec3, { x: 0, y: 0, z: 0 });
legacyCC.Vec3 = Vec3;

export function v3 (other: Vec3): Vec3;
export function v3 (x?: number, y?: number, z?: number): Vec3;

export function v3 (x?: number | Vec3, y?: number, z?: number): Vec3 {
    return new Vec3(x as number | undefined, y, z);
}

/**
 * Rotates `input` around `axis` for `angle` radians.
 */
const rotateAxisAngle = ((): (out: Vec3, input: Readonly<Vec3>, axis: Readonly<Vec3>, angle: number) => Vec3 => {
    // TODO: can this cause v8 hidden class problem?
    const cacheQ = { x: 0.0, y: 0.0, z: 0.0, w: 0.0 };
    return (out: Vec3, input: Readonly<Vec3>, axis: Readonly<Vec3>, angle: number): Vec3 => {
        // This should be equivalent to `Quat.fromAxisAngle(cacheQ, axis, angle)`.
        // Here we duplicate the code to avoid circular reference.

        const rad = angle * 0.5;
        const s = sin(rad);
        cacheQ.x = s * axis.x;
        cacheQ.y = s * axis.y;
        cacheQ.z = s * axis.z;
        cacheQ.w = cos(rad);

        Vec3.transformQuat(out, input, cacheQ);
        return out;
    };
})();

legacyCC.v3 = v3;
