/* eslint-disable @typescript-eslint/no-this-alias */
/*
 Copyright (c) 2018-2023 Xiamen Yaji Software Co., Ltd.

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

/* eslint-disable function-call-argument-newline */
/* eslint-disable function-paren-newline */

import { CCClass } from '../data/class';
import { ValueType } from '../value-types/value-type';
import { Mat3 } from './mat3';
import { IQuatLike, IVec3Like } from './type-define';
import { EPSILON, toDegree } from './utils';
import { Vec3 } from './vec3';
import { legacyCC } from '../global-exports';

const abs = Math.abs;
const max = Math.max;
const min = Math.min;
const PI = Math.PI;
const acos = Math.acos;
const sin = Math.sin;
const cos = Math.cos;
const sqrt = Math.sqrt;
const atan2 = Math.atan2;
const asin = Math.asin;
const sign = Math.sign;

/**
 * @en quaternion
 * @zh 四元数
 */
export class Quat extends ValueType {
    public static IDENTITY = Object.freeze(new Quat());

    /**
     * @en Obtain a copy of the given quaternion
     * @zh 获得指定四元数的拷贝
     */
    public static clone<Out extends IQuatLike> (a: Out): Quat {
        return new Quat(a.x, a.y, a.z, a.w);
    }

    /**
     * @en Copy the given quaternion to the out quaternion
     * @zh 复制目标四元数
     */
    public static copy<Out extends IQuatLike, QuatLike extends IQuatLike> (out: Out, a: QuatLike): Out {
        out.x = a.x;
        out.y = a.y;
        out.z = a.z;
        out.w = a.w;
        return out;
    }

    /**
     * @en Sets the out quaternion with values of each component
     * @zh 设置四元数值
     */
    public static set<Out extends IQuatLike> (out: Out, x: number, y: number, z: number, w: number): Out {
        out.x = x;
        out.y = y;
        out.z = z;
        out.w = w;
        return out;
    }

    /**
     * @en Sets the out quaternion to an identity quaternion
     * @zh 将目标赋值为单位四元数
     */
    public static identity<Out extends IQuatLike> (out: Out): Out {
        out.x = 0;
        out.y = 0;
        out.z = 0;
        out.w = 1;
        return out;
    }

    /**
     * @en Sets the out quaternion with the shortest path orientation between two vectors, considering both vectors normalized
     * @zh 设置四元数为两向量间的最短路径旋转，默认两向量都已归一化
     */
    public static rotationTo<Out extends IQuatLike, VecLike extends IVec3Like> (out: Out, a: VecLike, b: VecLike): Out {
        const dot = Vec3.dot(a, b);
        if (dot < -0.999999) {
            Vec3.cross(v3_1, Vec3.UNIT_X, a);
            if (v3_1.length() < 0.000001) {
                Vec3.cross(v3_1, Vec3.UNIT_Y, a);
            }
            Vec3.normalize(v3_1, v3_1);
            Quat.fromAxisAngle(out, v3_1, PI);
            return out;
        } else if (dot > 0.999999) {
            out.x = 0;
            out.y = 0;
            out.z = 0;
            out.w = 1;
            return out;
        } else {
            Vec3.cross(v3_1, a, b);
            out.x = v3_1.x;
            out.y = v3_1.y;
            out.z = v3_1.z;
            out.w = 1 + dot;
            return Quat.normalize(out, out);
        }
    }

    /**
     * @en Gets the rotation axis and the arc of rotation from the quaternion
     * @zh 获取四元数的旋转轴和旋转弧度
     * @param outAxis output axis
     * @param q input quaternion
     * @return radian of rotation
     */
    public static getAxisAngle<Out extends IQuatLike, VecLike extends IVec3Like> (outAxis: VecLike, q: Out): number {
        const rad = acos(q.w) * 2.0;
        const s = sin(rad / 2.0);
        if (s !== 0.0) {
            outAxis.x = q.x / s;
            outAxis.y = q.y / s;
            outAxis.z = q.z / s;
        } else {
            // If s is zero, return any axis (no rotation - axis does not matter)
            outAxis.x = 1;
            outAxis.y = 0;
            outAxis.z = 0;
        }
        return rad;
    }

    /**
     * @en Quaternion multiplication and save the results to out quaternion, that is a * b.
     * @zh 四元数乘法，即a * b。
     */
    public static multiply<Out extends IQuatLike, QuatLike_1 extends IQuatLike, QuatLike_2 extends IQuatLike> (
        out: Out,
        a: QuatLike_1,
        b: QuatLike_2,
    ): Out {
        const x = a.x * b.w + a.w * b.x + a.y * b.z - a.z * b.y;
        const y = a.y * b.w + a.w * b.y + a.z * b.x - a.x * b.z;
        const z = a.z * b.w + a.w * b.z + a.x * b.y - a.y * b.x;
        const w = a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z;
        out.x = x;
        out.y = y;
        out.z = z;
        out.w = w;
        return out;
    }

    /**
     * @en Quaternion scalar multiplication and save the results to out quaternion
     * @zh 四元数标量乘法
     */
    public static multiplyScalar<Out extends IQuatLike> (out: Out, a: Out, b: number): Out {
        out.x = a.x * b;
        out.y = a.y * b;
        out.z = a.z * b;
        out.w = a.w * b;
        return out;
    }

    /**
     * @en Quaternion multiplication and addition: A + B * scale
     * @zh 四元数乘加：A + B * scale
     */
    public static scaleAndAdd<Out extends IQuatLike> (out: Out, a: Out, b: Out, scale: number): Out {
        out.x = a.x + b.x * scale;
        out.y = a.y + b.y * scale;
        out.z = a.z + b.z * scale;
        out.w = a.w + b.w * scale;
        return out;
    }

    /**
     * @en Sets the out quaternion to represent a radian rotation around x axis
     * @zh 绕 X 轴旋转指定四元数
     * @param rad radian of rotation
     */
    public static rotateX<Out extends IQuatLike> (out: Out, a: Out, rad: number): Out {
        rad *= 0.5;

        const bx = sin(rad);
        const bw = cos(rad);
        const { x, y, z, w } = a;

        out.x = x * bw + w * bx;
        out.y = y * bw + z * bx;
        out.z = z * bw - y * bx;
        out.w = w * bw - x * bx;
        return out;
    }

    /**
     * @en Sets the out quaternion to represent a radian rotation around y axis
     * @zh 绕 Y 轴旋转指定四元数
     * @param rad radian of rotation
     */
    public static rotateY<Out extends IQuatLike> (out: Out, a: Out, rad: number): Out {
        rad *= 0.5;

        const by = sin(rad);
        const bw = cos(rad);
        const { x, y, z, w } = a;

        out.x = x * bw - z * by;
        out.y = y * bw + w * by;
        out.z = z * bw + x * by;
        out.w = w * bw - y * by;
        return out;
    }

    /**
     * @en Sets the out quaternion to represent a radian rotation around z axis
     * @zh 绕 Z 轴旋转指定四元数
     * @param rad radian of rotation
     */
    public static rotateZ<Out extends IQuatLike> (out: Out, a: Out, rad: number): Out {
        rad *= 0.5;

        const bz = sin(rad);
        const bw = cos(rad);
        const { x, y, z, w } = a;

        out.x = x * bw + y * bz;
        out.y = y * bw - x * bz;
        out.z = z * bw + w * bz;
        out.w = w * bw - z * bz;
        return out;
    }

    /**
     * @en Sets the out quaternion to represent a radian rotation around a given rotation axis in world space
     * @zh 绕世界空间下指定轴旋转四元数
     * @param axis axis of rotation, normalized by default
     * @param rad radian of rotation
     */
    public static rotateAround<Out extends IQuatLike, VecLike extends IVec3Like> (out: Out, rot: Out, axis: VecLike, rad: number): Out {
        // get inv-axis (local to rot)
        Quat.invert(qt_1, rot);
        Vec3.transformQuat(v3_1, axis, qt_1);
        // rotate by inv-axis
        Quat.fromAxisAngle(qt_1, v3_1, rad);
        Quat.multiply(out, rot, qt_1);
        return out;
    }

    /**
     * @en Sets the out quaternion to represent a radian rotation around a given rotation axis in local space
     * @zh 绕本地空间下指定轴旋转四元数
     * @param axis axis of rotation
     * @param rad radian of rotation
     */
    public static rotateAroundLocal<Out extends IQuatLike, VecLike extends IVec3Like> (out: Out, rot: Out, axis: VecLike, rad: number): Out {
        Quat.fromAxisAngle(qt_1, axis, rad);
        Quat.multiply(out, rot, qt_1);
        return out;
    }

    /**
     * @en Calculates the w component with xyz components, considering the given quaternion normalized
     * @zh 根据 xyz 分量计算 w 分量，默认已归一化
     */
    public static calculateW<Out extends IQuatLike> (out: Out, a: Out): Out {
        out.x = a.x;
        out.y = a.y;
        out.z = a.z;
        out.w = sqrt(abs(1.0 - a.x * a.x - a.y * a.y - a.z * a.z));
        return out;
    }

    /**
     * @en Quaternion dot product (scalar product)
     * @zh 四元数点积（数量积）
     */
    public static dot<Out extends IQuatLike> (a: Out, b: Out): number {
        return a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
    }

    /**
     * @en Element by element linear interpolation: A + t * (B - A)
     * @zh 逐元素线性插值： A + t * (B - A)
     */
    public static lerp<Out extends IQuatLike> (out: Out, a: Out, b: Out, t: number): Out {
        out.x = a.x + t * (b.x - a.x);
        out.y = a.y + t * (b.y - a.y);
        out.z = a.z + t * (b.z - a.z);
        out.w = a.w + t * (b.w - a.w);
        return out;
    }

    /**
     * @en Spherical quaternion interpolation
     * @zh 四元数球面插值
     */
    public static slerp<Out extends IQuatLike, QuatLike_1 extends IQuatLike, QuatLike_2 extends IQuatLike>
    (out: Out, a: QuatLike_1, b: QuatLike_2, t: number): Out {
        // benchmarks:
        //    http://jsperf.com/quaternion-slerp-implementations

        let scale0 = 0;
        let scale1 = 0;
        let bx = b.x;
        let by = b.y;
        let bz = b.z;
        let bw = b.w;

        // calc cosine
        let cosom = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
        // adjust signs (if necessary)
        if (cosom < 0.0) {
            cosom = -cosom;
            bx = -bx;
            by = -by;
            bz = -bz;
            bw = -bw;
        }
        // calculate coefficients
        if ((1.0 - cosom) > 0.000001) {
            // standard case (slerp)
            const omega = acos(cosom);
            const sinom = sin(omega);
            scale0 = sin((1.0 - t) * omega) / sinom;
            scale1 = sin(t * omega) / sinom;
        } else {
            // "from" and "to" quaternions are very close
            //  ... so we can do a linear interpolation
            scale0 = 1.0 - t;
            scale1 = t;
        }
        // calculate final values
        out.x = scale0 * a.x + scale1 * bx;
        out.y = scale0 * a.y + scale1 * by;
        out.z = scale0 * a.z + scale1 * bz;
        out.w = scale0 * a.w + scale1 * bw;

        return out;
    }

    /**
     * @en Spherical quaternion interpolation with two control points
     * @zh 带两个控制点的四元数球面插值
     * @param out the receiving quaternion
     * @param a the first operand
     * @param b the second operand
     * @param c the third operand
     * @param d the fourth operand
     * @param t interpolation amount, in the range [0-1], between the two inputs
     * @returns out
     */
    public static sqlerp<Out extends IQuatLike> (out: Out, a: Out, b: Out, c: Out, d: Out, t: number): Out {
        Quat.slerp(qt_1, a, d, t);
        Quat.slerp(qt_2, b, c, t);
        Quat.slerp(out, qt_1, qt_2, 2 * t * (1 - t));
        return out;
    }

    /**
     * @en Sets the inverse of the given quaternion to out quaternion
     * @zh 四元数求逆
     */
    public static invert<Out extends IQuatLike, QuatLike extends IQuatLike> (out: Out, a: QuatLike): Out {
        const dot = a.x * a.x + a.y * a.y + a.z * a.z + a.w * a.w;
        const invDot = dot ? 1.0 / dot : 0;

        // TODO: Would be faster to return [0,0,0,0] immediately if dot == 0

        out.x = -a.x * invDot;
        out.y = -a.y * invDot;
        out.z = -a.z * invDot;
        out.w = a.w * invDot;
        return out;
    }

    /**
     * @en Conjugating a quaternion, it's equivalent to the inverse of the unit quaternion, but more efficient
     * @zh 求共轭四元数，对单位四元数与求逆等价，但更高效
     */
    public static conjugate<Out extends IQuatLike> (out: Out, a: Out): Out {
        out.x = -a.x;
        out.y = -a.y;
        out.z = -a.z;
        out.w = a.w;
        return out;
    }

    /**
     * @en Calculates the length of the quaternion
     * @zh 求四元数长度
     */
    public static len<Out extends IQuatLike> (a: Out): number {
        return sqrt(a.x * a.x + a.y * a.y + a.z * a.z + a.w * a.w);
    }

    /**
     * @en Calculates the squared length of the quaternion
     * @zh 求四元数长度平方
     */
    public static lengthSqr<Out extends IQuatLike> (a: Out): number {
        return a.x * a.x + a.y * a.y + a.z * a.z + a.w * a.w;
    }

    /**
     * @en Normalize the given quaternion, returns a zero quaternion if input is a zero quaternion.
     * @zh 归一化四元数，输入零四元数将会返回零四元数。
     */
    public static normalize<Out extends IQuatLike> (out: Out, a: Out): Out {
        let len = a.x * a.x + a.y * a.y + a.z * a.z + a.w * a.w;
        if (len > 0) {
            len = 1 / sqrt(len);
            out.x = a.x * len;
            out.y = a.y * len;
            out.z = a.z * len;
            out.w = a.w * len;
        } else {
            out.x = 0;
            out.y = 0;
            out.z = 0;
            out.w = 0;
        }
        return out;
    }

    /**
     * @en Calculated the quaternion represents the given coordinates, considering all given vectors are normalized and mutually perpendicular
     * @zh 根据本地坐标轴朝向计算四元数，默认三向量都已归一化且相互垂直
     */
    public static fromAxes<Out extends IQuatLike, VecLike extends IVec3Like> (out: Out, xAxis: VecLike, yAxis: VecLike, zAxis: VecLike): Out {
        Mat3.set(
            m3_1,
            xAxis.x, xAxis.y, xAxis.z,
            yAxis.x, yAxis.y, yAxis.z,
            zAxis.x, zAxis.y, zAxis.z,
        );
        return Quat.normalize(out, Quat.fromMat3(out, m3_1));
    }

    /**
     * @en Calculates the quaternion with the up direction and the direction of the viewport
     * @zh 根据视口的前方向和上方向计算四元数
     * @param view The view direction, it`s must be normalized.
     * @param up The view up direction, it`s must be normalized, default value is (0, 1, 0).
     */
    public static fromViewUp<Out extends IQuatLike, VecLike extends IVec3Like> (out: Out, view: VecLike, up?: Vec3): Out {
        Mat3.fromViewUp(m3_1, view, up);
        return Quat.normalize(out, Quat.fromMat3(out, m3_1));
    }

    /**
     * @en Calculates the quaternion from a given rotary shaft and a radian rotation around it.
     * @zh 根据旋转轴和旋转弧度计算四元数
     */
    public static fromAxisAngle<Out extends IQuatLike, VecLike extends IVec3Like> (out: Out, axis: VecLike, rad: number): Out {
        rad *= 0.5;
        const s = sin(rad);
        out.x = s * axis.x;
        out.y = s * axis.y;
        out.z = s * axis.z;
        out.w = cos(rad);
        return out;
    }

    /**
     * @en Calculates the quaternion with the three-dimensional transform matrix, considering no scale included in the matrix
     * @zh 根据三维矩阵信息计算四元数，默认输入矩阵不含有缩放信息
     */
    public static fromMat3<Out extends IQuatLike> (out: Out, m: Mat3): Out {
        const {
            m00, m01, m02, //colum 0
            m03: m10, m04: m11, m05: m12, //colum 1
            m06: m20, m07: m21, m08: m22, //colum 2
        } = m;

        const fourXSquaredMinus1 = m00 - m11 - m22;
        const fourYSquaredMinus1 = m11 - m00 - m22;
        const fourZSquaredMinus1 = m22 - m00 - m11;
        const fourWSquaredMinus1 = m00 + m11 + m22;

        let biggestIndex = 0;
        let fourBiggestSquaredMinus1 = fourWSquaredMinus1;
        if (fourXSquaredMinus1 > fourBiggestSquaredMinus1) {
            fourBiggestSquaredMinus1 = fourXSquaredMinus1;
            biggestIndex = 1;
        }
        if (fourYSquaredMinus1 > fourBiggestSquaredMinus1) {
            fourBiggestSquaredMinus1 = fourYSquaredMinus1;
            biggestIndex = 2;
        }
        if (fourZSquaredMinus1 > fourBiggestSquaredMinus1) {
            fourBiggestSquaredMinus1 = fourZSquaredMinus1;
            biggestIndex = 3;
        }

        const biggestVal = sqrt(fourBiggestSquaredMinus1 + 1) * 0.5;
        const mult = 0.25 / biggestVal;
        switch (biggestIndex) {
        case 0:
            out.w =  biggestVal;
            out.x = (m12 - m21) * mult;
            out.y = (m20 - m02) * mult;
            out.z = (m01 - m10) * mult;
            break;
        case 1:
            out.w =  (m12 - m21) * mult;
            out.x = biggestVal;
            out.y = (m01 + m10) * mult;
            out.z = (m20 + m02) * mult;
            break;
        case 2:
            out.w = (m20 - m02) * mult;
            out.x = (m01 + m10) * mult;
            out.y = biggestVal;
            out.z = (m12 + m21) * mult;
            break;
        case 3:
            out.w = (m01 - m10) * mult;
            out.x = (m20 + m02) * mult;
            out.y = (m12 + m21) * mult;
            out.z = biggestVal;
            break;
        default:
            out.w = 1;
            out.x = 0;
            out.y = 0;
            out.z = 0;
            break;
        }
        return out;
    }

    /**
     * @en Calculates the quaternion with Euler angles, the rotation order is YZX, first rotate around Y, then around Z, and finally around X.
     * @zh 根据欧拉角信息计算四元数，旋转顺序为 YZX，即先绕Y旋转，再绕Z，最后绕X旋转。
     */
    public static fromEuler<Out extends IQuatLike> (out: Out, x: number, y: number, z: number): Out {
        x *= halfToRad;
        y *= halfToRad;
        z *= halfToRad;

        const sx = sin(x);
        const cx = cos(x);
        const sy = sin(y);
        const cy = cos(y);
        const sz = sin(z);
        const cz = cos(z);

        out.x = sx * cy * cz + cx * sy * sz;
        out.y = cx * sy * cz + sx * cy * sz;
        out.z = cx * cy * sz - sx * sy * cz;
        out.w = cx * cy * cz - sx * sy * sz;

        return out;
    }

    /**
     * @en Calculates the quaternion with given 2D angle (0, 0, z).
     * @zh 根据 2D 角度（0, 0, z）计算四元数
     *
     * @param out Output quaternion
     * @param z Angle to rotate around Z axis in degrees.
     */
    public static fromAngleZ<Out extends IQuatLike> (out: Out, z: number): Out {
        z *= halfToRad;
        out.x = out.y = 0;
        out.z = sin(z);
        out.w = cos(z);
        return out;
    }

    /**
     * @en This returns the X-axis vector of the quaternion
     * @zh 返回定义此四元数的坐标系 X 轴向量
     */
    public static toAxisX (out: IVec3Like, q: IQuatLike): IVec3Like {
        const fy = 2.0 * q.y;
        const fz = 2.0 * q.z;
        out.x = 1.0 - fy * q.y - fz * q.z;
        out.y = fy * q.x + fz * q.w;
        out.z = fz * q.x - fy * q.w;

        return out;
    }

    /**
     * @en This returns the Y-axis vector of the quaternion
     * @zh 返回定义此四元数的坐标系 Y 轴向量
     */
    public static toAxisY (out: IVec3Like, q: IQuatLike): IVec3Like {
        const fx = 2.0 * q.x;
        const fy = 2.0 * q.y;
        const fz = 2.0 * q.z;
        out.x = fy * q.x - fz * q.w;
        out.y = 1.0 - fx * q.x - fz * q.z;
        out.z = fz * q.y + fx * q.w;

        return out;
    }

    /**
     * @en This returns the Z-axis vector of the quaternion
     * @zh 返回定义此四元数的坐标系 Z 轴向量
     */
    public static toAxisZ (out: IVec3Like, q: IQuatLike): IVec3Like {
        const fx = 2.0 * q.x;
        const fy = 2.0 * q.y;
        const fz = 2.0 * q.z;
        out.x = fz * q.x + fy * q.w;
        out.y = fz * q.y - fx * q.w;
        out.z = 1.0 - fx * q.x - fy * q.y;

        return out;
    }

    /**
     * @en Converts the quaternion to angles, result angle x, y in the range of [-180, 180], z in the range of [-90, 90] interval,
     * the rotation order is YZX, first rotate around Y, then around Z, and finally around X
     * @zh 根据四元数计算欧拉角，返回角度 x, y 在 [-180, 180] 区间内, z 默认在 [-90, 90] 区间内，旋转顺序为 YZX，即先绕Y旋转，再绕Z，最后绕X旋转。
     * @param outerZ change z value range to [-180, -90] U [90, 180]
     */
    public static toEuler (out: IVec3Like, q: IQuatLike, outerZ?: boolean): IVec3Like {
        const { x, y, z, w } = q;
        let bank = 0;
        let heading = 0;
        let attitude = 0;
        const test = x * y + z * w;
        if (test > 0.499999) {
            bank = 0; // default to zero
            heading = toDegree(2 * atan2(x, w));
            attitude = 90;
        } else if (test < -0.499999) {
            bank = 0; // default to zero
            heading = -toDegree(2 * atan2(x, w));
            attitude = -90;
        } else {
            const sqx = x * x;
            const sqy = y * y;
            const sqz = z * z;
            bank = toDegree(atan2(2 * x * w - 2 * y * z, 1 - 2 * sqx - 2 * sqz));
            heading = toDegree(atan2(2 * y * w - 2 * x * z, 1 - 2 * sqy - 2 * sqz));
            attitude = toDegree(asin(2 * test));
            if (outerZ) {
                bank = -180 * sign(bank + 1e-6) + bank;
                heading = -180 * sign(heading + 1e-6) + heading;
                attitude = 180 * sign(attitude + 1e-6) - attitude;
            }
        }
        out.x = bank; out.y = heading; out.z = attitude;
        return out;
    }

    /**
     * @en Converts the quaternion to euler angles, result angle y, z in the range of [-180, 180], x in the range of [-90, 90],
     * the rotation order is YXZ, first rotate around Y, then around X, and finally around Z.
     * @zh 根据四元数计算欧拉角，返回角度 yz 在 [-180, 180], x 在 [-90, 90]，旋转顺序为 YXZ，即先绕Y旋转，再绕X，最后绕Z旋转。
     */
    public static toEulerInYXZOrder (out: Vec3, q: IQuatLike): void {
        Mat3.fromQuat(m3_1, q);
        Mat3.toEuler(m3_1, out);
        out.x = toDegree(out.x);
        out.y = toDegree(out.y);
        out.z = toDegree(out.z);
    }

    /**
     * @en Converts quaternion to an array
     * @zh 四元数转数组
     * @param ofs Array Start Offset
     */
    public static toArray<Out extends IWritableArrayLike<number>> (out: Out, q: IQuatLike, ofs = 0): Out {
        out[ofs + 0] = q.x;
        out[ofs + 1] = q.y;
        out[ofs + 2] = q.z;
        out[ofs + 3] = q.w;
        return out;
    }

    /**
     * @en Array to a quaternion
     * @zh 数组转四元数
     * @param ofs Array Start Offset
     */
    public static fromArray (out: IQuatLike, arr: IWritableArrayLike<number>, ofs = 0): IQuatLike {
        out.x = arr[ofs + 0];
        out.y = arr[ofs + 1];
        out.z = arr[ofs + 2];
        out.w = arr[ofs + 3];
        return out;
    }

    /**
     * @en Check whether two quaternions are equal
     * @zh 四元数等价判断
     */
    public static strictEquals (a: IQuatLike, b: IQuatLike): boolean {
        return a.x === b.x && a.y === b.y && a.z === b.z && a.w === b.w;
    }

    /**
     * @en Check whether two quaternions are approximately equal
     * @zh 排除浮点数误差的四元数近似等价判断
     */
    public static equals (a: IQuatLike, b: IQuatLike, epsilon = EPSILON): boolean {
        return (abs(a.x - b.x) <= epsilon * max(1.0, abs(a.x), abs(b.x))
            && abs(a.y - b.y) <= epsilon * max(1.0, abs(a.y), abs(b.y))
            && abs(a.z - b.z) <= epsilon * max(1.0, abs(a.z), abs(b.z))
            && abs(a.w - b.w) <= epsilon * max(1.0, abs(a.w), abs(b.w)));
    }

    /**
     * @en Gets the angular distance between two unit quaternions
     * @zh 获取两个单位四元数的夹角
     * @param a The first unit quaternion
     * @param b The second unit quaternion
     * @returns Angle between the two quaternions in radians
     */
    public static angle (a: IQuatLike, b: IQuatLike): number {
        const dot = min(abs(Quat.dot(a, b)), 1.0);
        return acos(dot) * 2.0;
    }

    /**
     * @en Rotate a `from` unit quaternion towards `to` unit quaternion
     * @zh 将一个起始单位四元数旋转到一个目标单位四元数
     * @param from The first unit quaternion
     * @param to The second unit quaternion
     * @param maxStep The maximum angle of rotation in degrees
     * @returns new unit quaternion generated during rotation
     */
    public static rotateTowards (out: IQuatLike, from: IQuatLike, to: IQuatLike, maxStep: number): IQuatLike {
        const angle = Quat.angle(from, to);
        if (angle === 0) {
            out.x = to.x;
            out.y = to.y;
            out.z = to.z;
            out.w = to.w;
            return out;
        }

        const t = min(maxStep / toDegree(angle), 1.0);
        return Quat.slerp(out, from, to, t);
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

    /**
     * @en w component.
     * @zh w 分量。
     */
    public declare w: number;

    constructor (other: Quat);

    constructor (x?: number, y?: number, z?: number, w?: number);

    constructor (x?: number | IQuatLike, y?: number, z?: number, w?: number) {
        super();
        if (typeof x === 'object') {
            this.x = x.x;
            this.y = x.y;
            this.z = x.z;
            this.w = x.w;
        } else {
            this.x = x || 0;
            this.y = y || 0;
            this.z = z || 0;
            this.w = w ?? 1;
        }
    }

    /**
     * @en clone the current Quat
     * @zh 克隆当前四元数。
     */
    public clone (): Quat {
        return new Quat(this.x, this.y, this.z, this.w);
    }

    /**
     * @en Set values with another quaternion
     * @zh 设置当前四元数使其与指定四元数相等。
     * @param other Specified quaternion
     * @returns `this`
     */
    public set (other: Quat): Quat;

    /**
     * @en Set the value of each component of the current quaternion
     * @zh 设置当前四元数指定元素值。
     * @returns `this`
     */
    public set (x?: number, y?: number, z?: number, w?: number): Quat;

    public set (x?: number | Quat, y?: number, z?: number, w?: number): Quat {
        if (typeof x === 'object') {
            this.x = x.x;
            this.y = x.y;
            this.z = x.z;
            this.w = x.w;
        } else {
            this.x = x || 0;
            this.y = y || 0;
            this.z = z || 0;
            this.w = w ?? 1;
        }
        return this;
    }

    /**
     * @en Check whether the quaternion approximately equals another one
     * @zh 判断当前四元数是否在误差范围内与指定向量相等。
     * @param other Comparative quaternion
     * @param epsilon The error allowed. It`s should be a non-negative number.
     * @returns Returns `true' when the components of the two quaternions are equal within the specified error range; otherwise, returns `false'.
     */
    public equals (other: Quat, epsilon = EPSILON): boolean {
        return Quat.equals(this, other, epsilon);
    }

    /**
     * @en Check whether the current quaternion strictly equals other quaternion
     * @zh 判断当前四元数是否与指定四元数相等。
     * @param other Comparative quaternion
     * @returns Returns `true' when the components of the two quaternions are equal within the specified error range; otherwise, returns `false'.
     */
    public strictEquals (other: Quat): boolean {
        return other && this.x === other.x && this.y === other.y && this.z === other.z && this.w === other.w;
    }

    /**
     * @en Convert quaternion to Euler angles
     * @zh 将当前四元数转化为欧拉角（x-y-z）并赋值给输出向量。
     * @param out the output vector
     */
    public getEulerAngles (out: Vec3): IVec3Like {
        return Quat.toEuler(out, this);
    }

    /**
     * @en Calculate the linear interpolation result between this quaternion and another one with given ratio
     * @zh 根据指定的插值比率，从当前四元数到目标四元数之间做线性插值。
     * @param to The target quaternion
     * @param ratio The interpolation coefficient. The range is [0,1].
     */
    public lerp (to: Quat, ratio: number): Quat {
        const self = this;
        self.x += ratio * (to.x - self.x);
        self.y += ratio * (to.y - self.y);
        self.z += ratio * (to.z - self.z);
        self.w += ratio * (to.w - self.w);
        return self;
    }

    /**
     * @en Calculates the spherical interpolation result between this quaternion and another one with the given ratio
     * @zh 根据指定的插值比率，从当前四元数到目标四元数之间做球面插值。
     * @param to The target quaternion
     * @param ratio The interpolation coefficient. The range is [0,1].
     */
    public slerp (to: Quat, ratio: number): Quat {
        return Quat.slerp(this, this, to, ratio);
    }

    /**
     * @en Calculates the length of the quaternion
     * @zh 求四元数长度
     */
    public length (): number {
        const self = this;
        const { x, y, z, w } = self;
        return sqrt(x * x + y * y + z * z + w * w);
    }

    /**
     * @en Calculates the squared length of the quaternion
     * @zh 求四元数长度平方
     */
    public lengthSqr (): number {
        const self = this;
        const { x, y, z, w } = self;
        return x * x + y * y + z * z + w * w;
    }

    /**
     * @en Return the information of the quaternion in string.
     * @zh 返回当前四元数的字符串表示。
     */
    public toString (): string {
        return `(${this.x}, ${this.y}, ${this.z}, ${this.w})`;
    }
}

const qt_1 = new Quat();
const qt_2 = new Quat();
const v3_1 = new Vec3();
const m3_1 = new Mat3();
const halfToRad = 0.5 * PI / 180.0;

CCClass.fastDefine('cc.Quat', Quat, { x: 0, y: 0, z: 0, w: 1 });
legacyCC.Quat = Quat;

export function quat (other: Quat): Quat;
export function quat (x?: number, y?: number, z?: number, w?: number): Quat;

export function quat (x: number | Quat = 0, y = 0, z = 0, w = 1): Quat {
    return new Quat(x as number, y, z, w);
}

legacyCC.quat = quat;
