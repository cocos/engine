/*
 Copyright (c) 2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
 worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
 not use Cocos Creator software for developing other software or tools that's
 used for developing games. You are not granted to publish, distribute,
 sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
*/

/**
 * @category core/value-types
 */

import CCClass from '../data/class';
import { Mat4 } from './mat4';
import { Quat } from './quat';
import { IMat3Like, IMat4Like, IQuatLike, IVec3Like } from './type-define';
import { EPSILON } from './utils';
import { ValueType } from './value-type';
import { Vec3 } from './vec3';

let _a00: number = 0; let _a01: number = 0; let _a02: number = 0;
let _a10: number = 0; let _a11: number = 0; let _a12: number = 0;
let _a20: number = 0; let _a21: number = 0; let _a22: number = 0;

/**
 * 表示三维（3x3）矩阵。
 */
// tslint:disable:one-variable-per-declaration
export class Mat3 extends ValueType {

    /**
     * 构造与指定矩阵相等的矩阵。
     * @param other 相比较的矩阵。
     */
    public static create (other: Mat3): Mat3;

    /**
     * 构造具有指定元素的矩阵。
     * @param m00 矩阵第 0 列第 0 行的元素。
     * @param m01 矩阵第 0 列第 1 行的元素。
     * @param m02 矩阵第 0 列第 2 行的元素。
     * @param m03 矩阵第 0 列第 3 行的元素。
     * @param m04 矩阵第 1 列第 0 行的元素。
     * @param m05 矩阵第 1 列第 1 行的元素。
     * @param m06 矩阵第 1 列第 2 行的元素。
     * @param m07 矩阵第 1 列第 3 行的元素。
     * @param m08 矩阵第 2 列第 0 行的元素。
     * @param m09 矩阵第 2 列第 1 行的元素。
     * @param m10 矩阵第 2 列第 2 行的元素。
     * @param m11 矩阵第 2 列第 3 行的元素。
     * @param m12 矩阵第 3 列第 0 行的元素。
     * @param m13 矩阵第 3 列第 1 行的元素。
     * @param m14 矩阵第 3 列第 2 行的元素。
     * @param m15 矩阵第 3 列第 3 行的元素。
     */
    public static create (
        m00?: number, m01?: number, m02?: number,
        m03?: number, m04?: number, m05?: number,
        m06?: number, m07?: number, m08?: number): Mat3;

    /**
     * @zh 创建新的实例
     */
    public static create (
        m00?: number | Mat3, m01?: number, m02?: number,
        m03?: number, m04?: number, m05?: number,
        m06?: number, m07?: number, m08?: number) {
        if (typeof m00 === 'object') {
            return new Mat3(m00.m00, m00.m01, m00.m02, m00.m03, m00.m04, m00.m05, m00.m06, m00.m07, m00.m08);
        } else {
            return new Mat3( m01, m02, m03, m04, m05, m06, m07, m08);
        }
    }

    /**
     * @zh 获得指定矩阵的拷贝
     */
    public static clone <Out extends IMat3Like> (a: Out) {
        return new Mat3(
            a.m00, a.m01, a.m02,
            a.m03, a.m04, a.m05,
            a.m06, a.m07, a.m08,
        );
    }

    /**
     * @zh 复制目标矩阵
     */
    public static copy <Out extends IMat3Like> (out: Out, a: Out) {
        out.m00 = a.m00;
        out.m01 = a.m01;
        out.m02 = a.m02;
        out.m03 = a.m03;
        out.m04 = a.m04;
        out.m05 = a.m05;
        out.m06 = a.m06;
        out.m07 = a.m07;
        out.m08 = a.m08;
        return out;
    }

    /**
     * @zh 设置矩阵值
     */
    public static set <Out extends IMat3Like>  (
        out: Out,
        m00: number, m01: number, m02: number,
        m10: number, m11: number, m12: number,
        m20: number, m21: number, m22: number,
    ) {
        out.m00 = m00; out.m01 = m01; out.m02 = m02;
        out.m03 = m10; out.m04 = m11; out.m05 = m12;
        out.m06 = m20; out.m07 = m21; out.m08 = m22;
        return out;
    }

    /**
     * @zh 将目标赋值为单位矩阵
     */
    public static identity <Out extends IMat3Like> (out: Out) {
        out.m00 = 1;
        out.m01 = 0;
        out.m02 = 0;
        out.m03 = 0;
        out.m04 = 1;
        out.m05 = 0;
        out.m06 = 0;
        out.m07 = 0;
        out.m08 = 1;
        return out;
    }

    /**
     * @zh 转置矩阵
     */
    public static transpose <Out extends IMat3Like> (out: Out, a: Out) {
        // If we are transposing ourselves we can skip a few steps but have to cache some values
        if (out === a) {
            _a01 = a.m01;
            _a02 = a.m02;
            _a12 = a.m05;
            out.m01 = a.m03;
            out.m02 = a.m06;
            out.m03 = _a01;
            out.m05 = a.m07;
            out.m06 = _a02;
            out.m07 = _a12;
        } else {
            out.m00 = a.m00;
            out.m01 = a.m03;
            out.m02 = a.m06;
            out.m03 = a.m01;
            out.m04 = a.m04;
            out.m05 = a.m07;
            out.m06 = a.m02;
            out.m07 = a.m05;
            out.m08 = a.m08;
        }

        return out;
    }

    /**
     * @zh 矩阵求逆
     */
    public static invert <Out extends IMat3Like> (out: Out, a: Out) {
        _a00 = a.m00; _a01 = a.m01; _a02 = a.m02;
        _a10 = a.m03; _a11 = a.m04; _a12 = a.m05;
        _a20 = a.m06; _a21 = a.m07; _a22 = a.m08;

        const b01 = _a22 * _a11 - _a12 * _a21;
        const b11 = -_a22 * _a10 + _a12 * _a20;
        const b21 = _a21 * _a10 - _a11 * _a20;

        // Calculate the determinant
        let det = _a00 * b01 + _a01 * b11 + _a02 * b21;

        if (!det) {
            return null;
        }
        det = 1.0 / det;

        out.m00 = b01 * det;
        out.m01 = (-_a22 * _a01 + _a02 * _a21) * det;
        out.m02 = (_a12 * _a01 - _a02 * _a11) * det;
        out.m03 = b11 * det;
        out.m04 = (_a22 * _a00 - _a02 * _a20) * det;
        out.m05 = (-_a12 * _a00 + _a02 * _a10) * det;
        out.m06 = b21 * det;
        out.m07 = (-_a21 * _a00 + _a01 * _a20) * det;
        out.m08 = (_a11 * _a00 - _a01 * _a10) * det;
        return out;
    }

    /**
     * @zh 矩阵行列式
     */
    public static determinant <Out extends IMat3Like> (a: Out) {
        _a00 = a.m00; _a01 = a.m01; _a02 = a.m02;
        _a10 = a.m03; _a11 = a.m04; _a12 = a.m05;
        _a20 = a.m06; _a21 = a.m07; _a22 = a.m08;

        return _a00 * (_a22 * _a11 - _a12 * _a21) + _a01 * (-_a22 * _a10 + _a12 * _a20) + _a02 * (_a21 * _a10 - _a11 * _a20);
    }

    /**
     * @zh 矩阵乘法
     */
    public static multiply <Out extends IMat3Like> (out: Out, a: Out, b: Out) {
        _a00 = a.m00; _a01 = a.m01; _a02 = a.m02;
        _a10 = a.m03; _a11 = a.m04; _a12 = a.m05;
        _a20 = a.m06; _a21 = a.m07; _a22 = a.m08;

        const b00 = b.m00, b01 = b.m01, b02 = b.m02;
        const b10 = b.m03, b11 = b.m04, b12 = b.m05;
        const b20 = b.m06, b21 = b.m07, b22 = b.m08;

        out.m00 = b00 * _a00 + b01 * _a10 + b02 * _a20;
        out.m01 = b00 * _a01 + b01 * _a11 + b02 * _a21;
        out.m02 = b00 * _a02 + b01 * _a12 + b02 * _a22;

        out.m03 = b10 * _a00 + b11 * _a10 + b12 * _a20;
        out.m04 = b10 * _a01 + b11 * _a11 + b12 * _a21;
        out.m05 = b10 * _a02 + b11 * _a12 + b12 * _a22;

        out.m06 = b20 * _a00 + b21 * _a10 + b22 * _a20;
        out.m07 = b20 * _a01 + b21 * _a11 + b22 * _a21;
        out.m08 = b20 * _a02 + b21 * _a12 + b22 * _a22;
        return out;
    }

    /**
     * @zh 矩阵乘法
     */
    public static mul <Out extends IMat3Like> (out: Out, a: Out, b: Out) {
        _a00 = a.m00; _a01 = a.m01; _a02 = a.m02;
        _a10 = a.m03; _a11 = a.m04; _a12 = a.m05;
        _a20 = a.m06; _a21 = a.m07; _a22 = a.m08;

        const b00 = b.m00, b01 = b.m01, b02 = b.m02;
        const b10 = b.m03, b11 = b.m04, b12 = b.m05;
        const b20 = b.m06, b21 = b.m07, b22 = b.m08;

        out.m00 = b00 * _a00 + b01 * _a10 + b02 * _a20;
        out.m01 = b00 * _a01 + b01 * _a11 + b02 * _a21;
        out.m02 = b00 * _a02 + b01 * _a12 + b02 * _a22;

        out.m03 = b10 * _a00 + b11 * _a10 + b12 * _a20;
        out.m04 = b10 * _a01 + b11 * _a11 + b12 * _a21;
        out.m05 = b10 * _a02 + b11 * _a12 + b12 * _a22;

        out.m06 = b20 * _a00 + b21 * _a10 + b22 * _a20;
        out.m07 = b20 * _a01 + b21 * _a11 + b22 * _a21;
        out.m08 = b20 * _a02 + b21 * _a12 + b22 * _a22;
        return out;
    }

    /**
     * @zh 在给定矩阵变换基础上加入变换
     */
    public static transfrom <Out extends IMat3Like, VecLike extends IVec3Like> (out: Out, a: Out, v: VecLike) {
        _a00 = a.m00; _a01 = a.m01; _a02 = a.m02;
        _a10 = a.m03; _a11 = a.m04; _a12 = a.m05;
        _a20 = a.m06; _a21 = a.m07; _a22 = a.m08;
        const x = v.x, y = v.y;

        out.m00 = _a00;
        out.m01 = _a01;
        out.m02 = _a02;

        out.m03 = _a10;
        out.m04 = _a11;
        out.m05 = _a12;

        out.m06 = x * _a00 + y * _a10 + _a20;
        out.m07 = x * _a01 + y * _a11 + _a21;
        out.m08 = x * _a02 + y * _a12 + _a22;
        return out;
    }

    /**
     * @zh 在给定矩阵变换基础上加入新缩放变换
     */
    public static scale <Out extends IMat3Like, VecLike extends IVec3Like> (out: Out, a: Out, v: VecLike) {
        const x = v.x, y = v.y;

        out.m00 = x * a.m00;
        out.m01 = x * a.m01;
        out.m02 = x * a.m02;

        out.m03 = y * a.m03;
        out.m04 = y * a.m04;
        out.m05 = y * a.m05;

        out.m06 = a.m06;
        out.m07 = a.m07;
        out.m08 = a.m08;
        return out;
    }

    /**
     * @zh 在给定矩阵变换基础上加入新旋转变换
     * @param rad 旋转弧度
     */
    public static rotate <Out extends IMat3Like> (out: Out, a: Out, rad: number) {
        _a00 = a.m00; _a01 = a.m01; _a02 = a.m02;
        _a10 = a.m03; _a11 = a.m04; _a12 = a.m05;
        _a20 = a.m06; _a21 = a.m07; _a22 = a.m08;

        const s = Math.sin(rad);
        const c = Math.cos(rad);

        out.m00 = c * _a00 + s * _a10;
        out.m01 = c * _a01 + s * _a11;
        out.m02 = c * _a02 + s * _a12;

        out.m03 = c * _a10 - s * _a00;
        out.m04 = c * _a11 - s * _a01;
        out.m05 = c * _a12 - s * _a02;

        out.m06 = _a20;
        out.m07 = _a21;
        out.m08 = _a22;
        return out;
    }

    /**
     * @zh 根据指定四维矩阵计算三维矩阵
     */
    public static fromMat4 <Out extends IMat3Like> (out: Out, a: IMat4Like) {
        out.m00 = a.m00;
        out.m01 = a.m01;
        out.m02 = a.m02;
        out.m03 = a.m04;
        out.m04 = a.m05;
        out.m05 = a.m06;
        out.m06 = a.m08;
        out.m07 = a.m09;
        out.m08 = a.m10;
        return out;
    }

    /**
     * @zh 根据视口前方向和上方向计算矩阵
     * @param view 视口面向的前方向，必须归一化
     * @param up 视口的上方向，必须归一化，默认为 (0, 1, 0)
     */
    public static fromViewUp <Out extends IMat3Like, VecLike extends IVec3Like> (out: Out, view: VecLike, up?: Vec3) {
        if (Vec3.sqrMag(view) < EPSILON * EPSILON) {
            Mat3.identity(out);
            return out;
        }

        up = up || Vec3.UNIT_Y;
        Vec3.normalize(v3_1, Vec3.cross(v3_1, up, view));

        if (Vec3.sqrMag(v3_1) < EPSILON * EPSILON) {
            Mat3.identity(out);
            return out;
        }

        Vec3.cross(v3_2, view, v3_1);
        Mat3.set(
            out,
            v3_1.x, v3_1.y, v3_1.z,
            v3_2.x, v3_2.y, v3_2.z,
            view.x, view.y, view.z,
        );

        return out;
    }

    /**
     * @zh 计算位移矩阵
     */
    public static fromTranslation <Out extends IMat3Like, VecLike extends IVec3Like> (out: Out, v: VecLike) {
        out.m00 = 1;
        out.m01 = 0;
        out.m02 = 0;
        out.m03 = 0;
        out.m04 = 1;
        out.m05 = 0;
        out.m06 = v.x;
        out.m07 = v.y;
        out.m08 = 1;
        return out;
    }

    /**
     * @zh 计算缩放矩阵
     */
    public static fromScaling <Out extends IMat3Like, VecLike extends IVec3Like> (out: Out, v: VecLike) {
        out.m00 = v.x;
        out.m01 = 0;
        out.m02 = 0;

        out.m03 = 0;
        out.m04 = v.y;
        out.m05 = 0;

        out.m06 = 0;
        out.m07 = 0;
        out.m08 = 1;
        return out;
    }

    /**
     * @zh 计算旋转矩阵
     */
    public static fromRotation <Out extends IMat3Like> (out: Out, rad: number) {
        const s = Math.sin(rad), c = Math.cos(rad);

        out.m00 = c;
        out.m01 = s;
        out.m02 = 0;

        out.m03 = -s;
        out.m04 = c;
        out.m05 = 0;

        out.m06 = 0;
        out.m07 = 0;
        out.m08 = 1;
        return out;
    }

    /**
     * @zh 根据四元数旋转信息计算矩阵
     */
    public static fromQuat <Out extends IMat3Like> (out: Out, q: IQuatLike) {
        const x = q.x, y = q.y, z = q.z, w = q.w;
        const x2 = x + x;
        const y2 = y + y;
        const z2 = z + z;

        const xx = x * x2;
        const yx = y * x2;
        const yy = y * y2;
        const zx = z * x2;
        const zy = z * y2;
        const zz = z * z2;
        const wx = w * x2;
        const wy = w * y2;
        const wz = w * z2;

        out.m00 = 1 - yy - zz;
        out.m03 = yx - wz;
        out.m06 = zx + wy;

        out.m01 = yx + wz;
        out.m04 = 1 - xx - zz;
        out.m07 = zy - wx;

        out.m02 = zx - wy;
        out.m05 = zy + wx;
        out.m08 = 1 - xx - yy;

        return out;
    }

    /**
     * @zh 计算指定四维矩阵的逆转置三维矩阵
     */
    public static inverseTransposeMat4 <Out extends IMat3Like> (out: Out, a: IMat4Like) {
        const a00 = a.m00, a01 = a.m01, a02 = a.m02, a03 = a.m03,
            a10 = a.m04, a11 = a.m05, a12 = a.m06, a13 = a.m07,
            a20 = a.m08, a21 = a.m09, a22 = a.m10, a23 = a.m11,
            a30 = a.m12, a31 = a.m13, a32 = a.m14, a33 = a.m15;

        const b00 = a00 * a11 - a01 * a10;
        const b01 = a00 * a12 - a02 * a10;
        const b02 = a00 * a13 - a03 * a10;
        const b03 = a01 * a12 - a02 * a11;
        const b04 = a01 * a13 - a03 * a11;
        const b05 = a02 * a13 - a03 * a12;
        const b06 = a20 * a31 - a21 * a30;
        const b07 = a20 * a32 - a22 * a30;
        const b08 = a20 * a33 - a23 * a30;
        const b09 = a21 * a32 - a22 * a31;
        const b10 = a21 * a33 - a23 * a31;
        const b11 = a22 * a33 - a23 * a32;

        // Calculate the determinant
        let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

        if (!det) {
            return null;
        }
        det = 1.0 / det;

        out.m00 = (a11 * b11 - a12 * b10 + a13 * b09) * det;
        out.m01 = (a12 * b08 - a10 * b11 - a13 * b07) * det;
        out.m02 = (a10 * b10 - a11 * b08 + a13 * b06) * det;

        out.m03 = (a02 * b10 - a01 * b11 - a03 * b09) * det;
        out.m04 = (a00 * b11 - a02 * b08 + a03 * b07) * det;
        out.m05 = (a01 * b08 - a00 * b10 - a03 * b06) * det;

        out.m06 = (a31 * b05 - a32 * b04 + a33 * b03) * det;
        out.m07 = (a32 * b02 - a30 * b05 - a33 * b01) * det;
        out.m08 = (a30 * b04 - a31 * b02 + a33 * b00) * det;

        return out;
    }

    /**
     * @zh 矩阵转数组
     * @param ofs 数组内的起始偏移量
     */
    public static array (out: IWritableArrayLike<number>, m: Mat4, ofs = 0) {
        out[ofs + 0] = m.m00;
        out[ofs + 1] = m.m01;
        out[ofs + 2] = m.m02;
        out[ofs + 3] = m.m03;
        out[ofs + 4] = m.m04;
        out[ofs + 5] = m.m05;
        out[ofs + 6] = m.m06;
        out[ofs + 7] = m.m07;
        out[ofs + 8] = m.m08;

        return out;
    }

    /**
     * @zh 逐元素矩阵加法
     */
    public static add <Out extends IMat3Like> (out: Out, a: Out, b: Out) {
        out.m00 = a.m00 + b.m00;
        out.m01 = a.m01 + b.m01;
        out.m02 = a.m02 + b.m02;
        out.m03 = a.m03 + b.m03;
        out.m04 = a.m04 + b.m04;
        out.m05 = a.m05 + b.m05;
        out.m06 = a.m06 + b.m06;
        out.m07 = a.m07 + b.m07;
        out.m08 = a.m08 + b.m08;
        return out;
    }

    /**
     * @zh 逐元素矩阵减法
     */
    public static subtract <Out extends IMat3Like> (out: Out, a: Out, b: Out) {
        out.m00 = a.m00 - b.m00;
        out.m01 = a.m01 - b.m01;
        out.m02 = a.m02 - b.m02;
        out.m03 = a.m03 - b.m03;
        out.m04 = a.m04 - b.m04;
        out.m05 = a.m05 - b.m05;
        out.m06 = a.m06 - b.m06;
        out.m07 = a.m07 - b.m07;
        out.m08 = a.m08 - b.m08;
        return out;
    }

    /**
     * @zh 逐元素矩阵减法
     */
    public static sub <Out extends IMat3Like> (out: Out, a: Out, b: Out) {
        out.m00 = a.m00 - b.m00;
        out.m01 = a.m01 - b.m01;
        out.m02 = a.m02 - b.m02;
        out.m03 = a.m03 - b.m03;
        out.m04 = a.m04 - b.m04;
        out.m05 = a.m05 - b.m05;
        out.m06 = a.m06 - b.m06;
        out.m07 = a.m07 - b.m07;
        out.m08 = a.m08 - b.m08;
        return out;
    }

    /**
     * @zh 矩阵标量乘法
     */
    public static multiplyScalar <Out extends IMat3Like> (out: Out, a: Out, b: number) {
        out.m00 = a.m00 * b;
        out.m01 = a.m01 * b;
        out.m02 = a.m02 * b;
        out.m03 = a.m03 * b;
        out.m04 = a.m04 * b;
        out.m05 = a.m05 * b;
        out.m06 = a.m06 * b;
        out.m07 = a.m07 * b;
        out.m08 = a.m08 * b;
        return out;
    }

    /**
     * @zh 逐元素矩阵标量乘加: A + B * scale
     */
    public static multiplyScalarAndAdd <Out extends IMat3Like> (out: Out, a: Out, b: Out, scale: number) {
        out.m00 = a.m00 + (b.m00 * scale);
        out.m01 = a.m01 + (b.m01 * scale);
        out.m02 = a.m02 + (b.m02 * scale);
        out.m03 = a.m03 + (b.m03 * scale);
        out.m04 = a.m04 + (b.m04 * scale);
        out.m05 = a.m05 + (b.m05 * scale);
        out.m06 = a.m06 + (b.m06 * scale);
        out.m07 = a.m07 + (b.m07 * scale);
        out.m08 = a.m08 + (b.m08 * scale);
        return out;
    }

    /**
     * @zh 矩阵等价判断
     */
    public static exactEquals <Out extends IMat3Like> (a: Out, b: Out) {
        return a.m00 === b.m00 && a.m01 === b.m01 && a.m02 === b.m02 &&
            a.m03 === b.m03 && a.m04 === b.m04 && a.m05 === b.m05 &&
            a.m06 === b.m06 && a.m07 === b.m07 && a.m08 === b.m08;
    }

    /**
     * @zh 排除浮点数误差的矩阵近似等价判断
     */
    public static equals <Out extends IMat3Like> (a: Out, b: Out, epsilon = EPSILON) {
        return (
            Math.abs(a.m00 - b.m00) <= epsilon * Math.max(1.0, Math.abs(a.m00), Math.abs(b.m00)) &&
            Math.abs(a.m01 - b.m01) <= epsilon * Math.max(1.0, Math.abs(a.m01), Math.abs(b.m01)) &&
            Math.abs(a.m02 - b.m02) <= epsilon * Math.max(1.0, Math.abs(a.m02), Math.abs(b.m02)) &&
            Math.abs(a.m03 - b.m03) <= epsilon * Math.max(1.0, Math.abs(a.m03), Math.abs(b.m03)) &&
            Math.abs(a.m04 - b.m04) <= epsilon * Math.max(1.0, Math.abs(a.m04), Math.abs(b.m04)) &&
            Math.abs(a.m05 - b.m05) <= epsilon * Math.max(1.0, Math.abs(a.m05), Math.abs(b.m05)) &&
            Math.abs(a.m06 - b.m06) <= epsilon * Math.max(1.0, Math.abs(a.m06), Math.abs(b.m06)) &&
            Math.abs(a.m07 - b.m07) <= epsilon * Math.max(1.0, Math.abs(a.m07), Math.abs(b.m07)) &&
            Math.abs(a.m08 - b.m08) <= epsilon * Math.max(1.0, Math.abs(a.m08), Math.abs(b.m08))
        );
    }

    /**
     * 矩阵第 0 列第 0 行的元素。
     */
    public m00: number;

    /**
     * 矩阵第 0 列第 1 行的元素。
     */
    public m01: number;

    /**
     * 矩阵第 0 列第 2 行的元素。
     */
    public m02: number;

    /**
     * 矩阵第 1 列第 0 行的元素。
     */
    public m03: number;

    /**
     * 矩阵第 1 列第 1 行的元素。
     */
    public m04: number;

    /**
     * 矩阵第 1 列第 2 行的元素。
     */
    public m05: number;

    /**
     * 矩阵第 2 列第 0 行的元素。
     */
    public m06: number;

    /**
     * 矩阵第 2 列第 1 行的元素。
     */
    public m07: number;

    /**
     * 矩阵第 2 列第 2 行的元素。
     */
    public m08: number;

    constructor (
        m00 = 1, m01 = 0, m02 = 0,
        m03 = 0, m04 = 1, m05 = 0,
        m06 = 0, m07 = 0, m08 = 1) {
        super();
        this.m00 = m00; this.m01 = m01; this.m02 = m02;
        this.m03 = m03; this.m04 = m04; this.m05 = m05;
        this.m06 = m06; this.m07 = m07; this.m08 = m08;
    }

    /**
     * 克隆当前矩阵。
     */
    public clone () {
        const t = this;
        return new Mat3(
            t.m00, t.m01, t.m02,
            t.m03, t.m04, t.m05,
            t.m06, t.m07, t.m08);
    }

    /**
     * 设置当前矩阵使其与指定矩阵相等。
     * @param other 相比较的矩阵。
     * @returns `this`
     */
    public set (other: Mat3) {
        this.m00 = other.m00;
        this.m01 = other.m01;
        this.m02 = other.m02;
        this.m03 = other.m03;
        this.m04 = other.m04;
        this.m05 = other.m05;
        this.m06 = other.m06;
        this.m07 = other.m07;
        this.m08 = other.m08;
        return this;
    }

    /**
     * 判断当前矩阵是否在误差范围内与指定矩阵相等。
     * @param other 相比较的矩阵。
     * @param epsilon 允许的误差，应为非负数。
     * @returns 两矩阵的各元素都分别相等时返回 `true`；否则返回 `false`。
     */
    public equals (other: Mat3, epsilon = EPSILON): boolean {
        return (
            Math.abs(this.m00 - other.m00) <= epsilon * Math.max(1.0, Math.abs(this.m00), Math.abs(other.m00)) &&
            Math.abs(this.m01 - other.m01) <= epsilon * Math.max(1.0, Math.abs(this.m01), Math.abs(other.m01)) &&
            Math.abs(this.m02 - other.m02) <= epsilon * Math.max(1.0, Math.abs(this.m02), Math.abs(other.m02)) &&
            Math.abs(this.m03 - other.m03) <= epsilon * Math.max(1.0, Math.abs(this.m03), Math.abs(other.m03)) &&
            Math.abs(this.m04 - other.m04) <= epsilon * Math.max(1.0, Math.abs(this.m04), Math.abs(other.m04)) &&
            Math.abs(this.m05 - other.m05) <= epsilon * Math.max(1.0, Math.abs(this.m05), Math.abs(other.m05)) &&
            Math.abs(this.m06 - other.m06) <= epsilon * Math.max(1.0, Math.abs(this.m06), Math.abs(other.m06)) &&
            Math.abs(this.m07 - other.m07) <= epsilon * Math.max(1.0, Math.abs(this.m07), Math.abs(other.m07)) &&
            Math.abs(this.m08 - other.m08) <= epsilon * Math.max(1.0, Math.abs(this.m08), Math.abs(other.m08))
        );
    }

    /**
     * 判断当前矩阵是否与指定矩阵相等。
     * @param other 相比较的矩阵。
     * @returns 两矩阵的各元素都分别相等时返回 `true`；否则返回 `false`。
     */
    public exactEquals (other: Mat3): boolean {
        return this.m00 === other.m00 && this.m01 === other.m01 && this.m02 === other.m02 &&
            this.m03 === other.m03 && this.m04 === other.m04 && this.m05 === other.m05 &&
            this.m06 === other.m06 && this.m07 === other.m07 && this.m08 === other.m08;
    }

    /**
     * 返回当前矩阵的字符串表示。
     * @returns 当前矩阵的字符串表示。
     */
    public toString () {
        const t = this;
        return '[\n' +
            t.m00 + ', ' + t.m01 + ', ' + t.m02 + ',\n' +
            t.m03 + ',\n' + t.m04 + ', ' + t.m05 + ',\n' +
            t.m06 + ', ' + t.m07 + ',\n' + t.m08 + '\n' +
            ']';
    }

    /**
     * 将当前矩阵设为单位矩阵。
     * @returns `this`
     */
    public identity () {
        this.m00 = 1;
        this.m01 = 0;
        this.m02 = 0;
        this.m03 = 0;
        this.m04 = 1;
        this.m05 = 0;
        this.m06 = 0;
        this.m07 = 0;
        this.m08 = 1;
        return this;
    }

    /**
     * 计算当前矩阵的转置矩阵。
     */
    public transpose () {
        const a01 = this.m01, a02 = this.m02, a12 = this.m05;
        this.m01 = this.m03;
        this.m02 = this.m06;
        this.m03 = a01;
        this.m05 = this.m07;
        this.m06 = a02;
        this.m07 = a12;
        return this;
    }

    /**
     * 计算当前矩阵的逆矩阵。
     */
    public invert () {
        _a00 = this.m00; _a01 = this.m01; _a02 = this.m02;
        _a10 = this.m03; _a11 = this.m04; _a12 = this.m05;
        _a20 = this.m06; _a21 = this.m07; _a22 = this.m08;

        const b01 = _a22 * _a11 - _a12 * _a21;
        const b11 = -_a22 * _a10 + _a12 * _a20;
        const b21 = _a21 * _a10 - _a11 * _a20;

        // Calculate the determinant
        let det = _a00 * b01 + _a01 * b11 + _a02 * b21;

        if (!det) {
            return null;
        }
        det = 1.0 / det;

        this.m00 = b01 * det;
        this.m01 = (-_a22 * _a01 + _a02 * _a21) * det;
        this.m02 = (_a12 * _a01 - _a02 * _a11) * det;
        this.m03 = b11 * det;
        this.m04 = (_a22 * _a00 - _a02 * _a20) * det;
        this.m05 = (-_a12 * _a00 + _a02 * _a10) * det;
        this.m06 = b21 * det;
        this.m07 = (-_a21 * _a00 + _a01 * _a20) * det;
        this.m08 = (_a11 * _a00 - _a01 * _a10) * det;
        return this;
    }

    /**
     * 计算当前矩阵的行列式。
     * @returns 当前矩阵的行列式。
     */
    public determinant (): number {
        _a00 = this.m00; _a01 = this.m01; _a02 = this.m02;
        _a10 = this.m03; _a11 = this.m04; _a12 = this.m05;
        _a20 = this.m06; _a21 = this.m07; _a22 = this.m08;

        return _a00 * (_a22 * _a11 - _a12 * _a21) + _a01 * (-_a22 * _a10 + _a12 * _a20) + _a02 * (_a21 * _a10 - _a11 * _a20);
    }

    /**
     * 矩阵加法。将当前矩阵与指定矩阵的相加，结果返回给当前矩阵。
     * @param mat 相加的矩阵
     */
    public add (mat: Mat3) {
        this.m00 = this.m00 + mat.m00;
        this.m01 = this.m01 + mat.m01;
        this.m02 = this.m02 + mat.m02;
        this.m03 = this.m03 + mat.m03;
        this.m04 = this.m04 + mat.m04;
        this.m05 = this.m05 + mat.m05;
        this.m06 = this.m06 + mat.m06;
        this.m07 = this.m07 + mat.m07;
        this.m08 = this.m08 + mat.m08;
        return this;
    }

    /**
     * 计算矩阵减法。将当前矩阵减去指定矩阵的结果赋值给当前矩阵。
     * @param mat 减数矩阵。
     */
    public sub (mat: Mat3) {
        this.m00 = this.m00 - mat.m00;
        this.m01 = this.m01 - mat.m01;
        this.m02 = this.m02 - mat.m02;
        this.m03 = this.m03 - mat.m03;
        this.m04 = this.m04 - mat.m04;
        this.m05 = this.m05 - mat.m05;
        this.m06 = this.m06 - mat.m06;
        this.m07 = this.m07 - mat.m07;
        this.m08 = this.m08 - mat.m08;
        return this;
    }

    /**
     * 矩阵乘法。将当前矩阵左乘指定矩阵的结果赋值给当前矩阵。
     * @param mat 指定的矩阵。
     */
    public mul (mat: Mat3) {
        const a00 = this.m00, a01 = this.m01, a02 = this.m02,
        a10 = this.m03, a11 = this.m04, a12 = this.m05,
        a20 = this.m06, a21 = this.m07, a22 = this.m08;

        const b00 = mat.m00, b01 = mat.m01, b02 = mat.m02;
        const b10 = mat.m03, b11 = mat.m04, b12 = mat.m05;
        const b20 = mat.m06, b21 = mat.m07, b22 = mat.m08;

        this.m00 = b00 * a00 + b01 * a10 + b02 * a20;
        this.m01 = b00 * a01 + b01 * a11 + b02 * a21;
        this.m02 = b00 * a02 + b01 * a12 + b02 * a22;

        this.m03 = b10 * a00 + b11 * a10 + b12 * a20;
        this.m04 = b10 * a01 + b11 * a11 + b12 * a21;
        this.m05 = b10 * a02 + b11 * a12 + b12 * a22;

        this.m06 = b20 * a00 + b21 * a10 + b22 * a20;
        this.m07 = b20 * a01 + b21 * a11 + b22 * a21;
        this.m08 = b20 * a02 + b21 * a12 + b22 * a22;
        return this;
    }

    /**
     * 矩阵数乘。将当前矩阵与指定标量的数乘结果赋值给当前矩阵。
     * @param scalar 指定的标量。
     */
    public mulScalar (scalar: number) {
        this.m00 = this.m00 * scalar;
        this.m01 = this.m01 * scalar;
        this.m02 = this.m02 * scalar;
        this.m03 = this.m03 * scalar;
        this.m04 = this.m04 * scalar;
        this.m05 = this.m05 * scalar;
        this.m06 = this.m06 * scalar;
        this.m07 = this.m07 * scalar;
        this.m08 = this.m08 * scalar;
        return this;
    }

    /**
     * 将当前矩阵左乘缩放矩阵的结果赋值给当前矩阵，缩放矩阵由各个轴的缩放给出。
     * @param vec 各个轴的缩放。
     */
    public scale (vec: Vec3) {
        const x = vec.x, y = vec.y;

        this.m00 = x * this.m00;
        this.m01 = x * this.m01;
        this.m02 = x * this.m02;

        this.m03 = y * this.m03;
        this.m04 = y * this.m04;
        this.m05 = y * this.m05;

        this.m06 = this.m06;
        this.m07 = this.m07;
        this.m08 = this.m08;
        return this;
    }

    /**
     * 将当前矩阵左乘旋转矩阵的结果赋值给当前矩阵，旋转矩阵由旋转轴和旋转角度给出。
     * @param mat 矩阵
     * @param rad 旋转角度（弧度制）
     */
    public rotate (rad: number) {
        _a00 = this.m00; _a01 = this.m01; _a02 = this.m02;
        _a10 = this.m03; _a11 = this.m04; _a12 = this.m05;
        _a20 = this.m06; _a21 = this.m07; _a22 = this.m08;

        const s = Math.sin(rad);
        const c = Math.cos(rad);

        this.m00 = c * _a00 + s * _a10;
        this.m01 = c * _a01 + s * _a11;
        this.m02 = c * _a02 + s * _a12;

        this.m03 = c * _a10 - s * _a00;
        this.m04 = c * _a11 - s * _a01;
        this.m05 = c * _a12 - s * _a02;

        this.m06 = _a20;
        this.m07 = _a21;
        this.m08 = _a22;
        return this;
    }

    /**
     * 重置当前矩阵的值，使其表示指定四元数表示的旋转变换。
     * @param q 四元数表示的旋转变换。
     * @returns `this`
     */
    public fromQuat (q: Quat) {
        const x = q.x, y = q.y, z = q.z, w = q.w;
        const x2 = x + x;
        const y2 = y + y;
        const z2 = z + z;

        const xx = x * x2;
        const yx = y * x2;
        const yy = y * y2;
        const zx = z * x2;
        const zy = z * y2;
        const zz = z * z2;
        const wx = w * x2;
        const wy = w * y2;
        const wz = w * z2;

        this.m00 = 1 - yy - zz;
        this.m03 = yx - wz;
        this.m06 = zx + wy;

        this.m01 = yx + wz;
        this.m04 = 1 - xx - zz;
        this.m07 = zy - wx;

        this.m02 = zx - wy;
        this.m05 = zy + wx;
        this.m08 = 1 - xx - yy;
        return this;
    }
}

const v3_1 = new Vec3();
const v3_2 = new Vec3();

CCClass.fastDefine('cc.Mat3', Mat3, {
    m00: 1, m01: 0, m02: 0,
    m03: 0, m04: 1, m05: 0,
    m06: 0, m07: 0, m08: 1,
});
cc.Mat3 = Mat3;
cc.mat3 = Mat3.create;
