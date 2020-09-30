/*
 Copyright (c) 2016 Chukong Technologies Inc.
 Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

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
 * @category core/math
 */

import { CCClass } from '../data/class';
import { ValueType } from '../value-types/value-type';
import { Mat4 } from './mat4';
import { IMat4Like, IQuatLike, IVec4Like } from './type-define';
import { clamp, EPSILON, random } from './utils';
import { legacyCC } from '../global-exports';

/**
 * 四维向量。
 */
export class Vec4 extends ValueType {

    public static ZERO = Object.freeze(new Vec4(0, 0, 0, 0));
    public static ONE = Object.freeze(new Vec4(1, 1, 1, 1));
    public static NEG_ONE = Object.freeze(new Vec4(-1, -1, -1, -1));

    /**
     * @zh 获得指定向量的拷贝
     */
    public static clone <Out extends IVec4Like> (a: Out) {
        return new Vec4(a.x, a.y, a.z, a.w);
    }

    /**
     * @zh 复制目标向量
     */
    public static copy <Out extends IVec4Like> (out: Out, a: Out) {
        out.x = a.x;
        out.y = a.y;
        out.z = a.z;
        out.w = a.w;
        return out;
    }

    /**
     * @zh 设置向量值
     */
    public static set <Out extends IVec4Like> (out: Out, x: number, y: number, z: number, w: number) {
        out.x = x;
        out.y = y;
        out.z = z;
        out.w = w;
        return out;
    }

    /**
     * @zh 逐元素向量加法
     */
    public static add <Out extends IVec4Like> (out: Out, a: Out, b: Out) {
        out.x = a.x + b.x;
        out.y = a.y + b.y;
        out.z = a.z + b.z;
        out.w = a.w + b.w;
        return out;
    }

    /**
     * @zh 逐元素向量减法
     */
    public static subtract <Out extends IVec4Like> (out: Out, a: Out, b: Out) {
        out.x = a.x - b.x;
        out.y = a.y - b.y;
        out.z = a.z - b.z;
        out.w = a.w - b.w;
        return out;
    }

    /**
     * @zh 逐元素向量乘法
     */
    public static multiply <Out extends IVec4Like> (out: Out, a: Out, b: Out) {
        out.x = a.x * b.x;
        out.y = a.y * b.y;
        out.z = a.z * b.z;
        out.w = a.w * b.w;
        return out;
    }

    /**
     * @zh 逐元素向量除法
     */
    public static divide <Out extends IVec4Like> (out: Out, a: Out, b: Out) {
        out.x = a.x / b.x;
        out.y = a.y / b.y;
        out.z = a.z / b.z;
        out.w = a.w / b.w;
        return out;
    }

    /**
     * @zh 逐元素向量向上取整
     */
    public static ceil <Out extends IVec4Like> (out: Out, a: Out) {
        out.x = Math.ceil(a.x);
        out.y = Math.ceil(a.y);
        out.z = Math.ceil(a.z);
        out.w = Math.ceil(a.w);
        return out;
    }

    /**
     * @zh 逐元素向量向下取整
     */
    public static floor <Out extends IVec4Like> (out: Out, a: Out) {
        out.x = Math.floor(a.x);
        out.y = Math.floor(a.y);
        out.z = Math.floor(a.z);
        out.w = Math.floor(a.w);
        return out;
    }

    /**
     * @zh 逐元素向量最小值
     */
    public static min <Out extends IVec4Like> (out: Out, a: Out, b: Out) {
        out.x = Math.min(a.x, b.x);
        out.y = Math.min(a.y, b.y);
        out.z = Math.min(a.z, b.z);
        out.w = Math.min(a.w, b.w);
        return out;
    }

    /**
     * @zh 逐元素向量最大值
     */
    public static max <Out extends IVec4Like> (out: Out, a: Out, b: Out) {
        out.x = Math.max(a.x, b.x);
        out.y = Math.max(a.y, b.y);
        out.z = Math.max(a.z, b.z);
        out.w = Math.max(a.w, b.w);
        return out;
    }

    /**
     * @zh 逐元素向量四舍五入取整
     */
    public static round <Out extends IVec4Like> (out: Out, a: Out) {
        out.x = Math.round(a.x);
        out.y = Math.round(a.y);
        out.z = Math.round(a.z);
        out.w = Math.round(a.w);
        return out;
    }

    /**
     * @zh 向量标量乘法
     */
    public static multiplyScalar <Out extends IVec4Like> (out: Out, a: Out, b: number) {
        out.x = a.x * b;
        out.y = a.y * b;
        out.z = a.z * b;
        out.w = a.w * b;
        return out;
    }

    /**
     * @zh 逐元素向量乘加: A + B * scale
     */
    public static scaleAndAdd <Out extends IVec4Like> (out: Out, a: Out, b: Out, scale: number) {
        out.x = a.x + (b.x * scale);
        out.y = a.y + (b.y * scale);
        out.z = a.z + (b.z * scale);
        out.w = a.w + (b.w * scale);
        return out;
    }

    /**
     * @zh 求两向量的欧氏距离
     */
    public static distance <Out extends IVec4Like> (a: Out, b: Out) {
        const x = b.x - a.x;
        const y = b.y - a.y;
        const z = b.z - a.z;
        const w = b.w - a.w;
        return Math.sqrt(x * x + y * y + z * z + w * w);
    }

    /**
     * @zh 求两向量的欧氏距离平方
     */
    public static squaredDistance <Out extends IVec4Like> (a: Out, b: Out) {
        const x = b.x - a.x;
        const y = b.y - a.y;
        const z = b.z - a.z;
        const w = b.w - a.w;
        return x * x + y * y + z * z + w * w;
    }

    /**
     * @zh 求向量长度
     */
    public static len <Out extends IVec4Like> (a: Out) {
        const x = a.x;
        const y = a.y;
        const z = a.z;
        const w = a.w;
        return Math.sqrt(x * x + y * y + z * z + w * w);
    }

    /**
     * @zh 求向量长度平方
     */
    public static lengthSqr <Out extends IVec4Like> (a: Out) {
        const x = a.x;
        const y = a.y;
        const z = a.z;
        const w = a.w;
        return x * x + y * y + z * z + w * w;
    }

    /**
     * @zh 逐元素向量取负
     */
    public static negate <Out extends IVec4Like> (out: Out, a: Out) {
        out.x = -a.x;
        out.y = -a.y;
        out.z = -a.z;
        out.w = -a.w;
        return out;
    }

    /**
     * @zh 逐元素向量取倒数，接近 0 时返回 Infinity
     */
    public static inverse <Out extends IVec4Like> (out: Out, a: Out) {
        out.x = 1.0 / a.x;
        out.y = 1.0 / a.y;
        out.z = 1.0 / a.z;
        out.w = 1.0 / a.w;
        return out;
    }

    /**
     * @zh 逐元素向量取倒数，接近 0 时返回 0
     */
    public static inverseSafe <Out extends IVec4Like> (out: Out, a: Out) {
        const x = a.x;
        const y = a.y;
        const z = a.z;
        const w = a.w;

        if (Math.abs(x) < EPSILON) {
            out.x = 0;
        } else {
            out.x = 1.0 / x;
        }

        if (Math.abs(y) < EPSILON) {
            out.y = 0;
        } else {
            out.y = 1.0 / y;
        }

        if (Math.abs(z) < EPSILON) {
            out.z = 0;
        } else {
            out.z = 1.0 / z;
        }

        if (Math.abs(w) < EPSILON) {
            out.w = 0;
        } else {
            out.w = 1.0 / w;
        }

        return out;
    }

    /**
     * @zh 归一化向量
     */
    public static normalize <Out extends IVec4Like> (out: Out, a: Out) {
        const x = a.x;
        const y = a.y;
        const z = a.z;
        const w = a.w;
        let len = x * x + y * y + z * z + w * w;
        if (len > 0) {
            len = 1 / Math.sqrt(len);
            out.x = x * len;
            out.y = y * len;
            out.z = z * len;
            out.w = w * len;
        }
        return out;
    }

    /**
     * @zh 向量点积（数量积）
     */
    public static dot <Out extends IVec4Like> (a: Out, b: Out) {
        return a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
    }

    /**
     * @zh 逐元素向量线性插值： A + t * (B - A)
     */
    public static lerp <Out extends IVec4Like> (out: Out, a: Out, b: Out, t: number) {
        out.x = a.x + t * (b.x - a.x);
        out.y = a.y + t * (b.y - a.y);
        out.z = a.z + t * (b.z - a.z);
        out.w = a.w + t * (b.w - a.w);
        return out;
    }

    /**
     * @zh 生成一个在单位球体上均匀分布的随机向量
     * @param scale 生成的向量长度
     */
    public static random <Out extends IVec4Like> (out: Out, scale?: number) {
        scale = scale || 1.0;

        const phi = random() * 2.0 * Math.PI;
        const cosTheta = random() * 2 - 1;
        const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);

        out.x = sinTheta * Math.cos(phi) * scale;
        out.y = sinTheta * Math.sin(phi) * scale;
        out.z = cosTheta * scale;
        out.w = 0;
        return out;
    }

    /**
     * @zh 向量矩阵乘法
     */
    public static transformMat4 <Out extends IVec4Like, MatLike extends IMat4Like> (out: Out, a: Out, m: MatLike) {
        const x = a.x;
        const y = a.y;
        const z = a.z;
        const w = a.w;
        out.x = m.m00 * x + m.m04 * y + m.m08 * z + m.m12 * w;
        out.y = m.m01 * x + m.m05 * y + m.m09 * z + m.m13 * w;
        out.z = m.m02 * x + m.m06 * y + m.m10 * z + m.m14 * w;
        out.w = m.m03 * x + m.m07 * y + m.m11 * z + m.m15 * w;
        return out;
    }

    /**
     * @zh 向量仿射变换
     */
    public static transformAffine<Out extends IVec4Like, VecLike extends IVec4Like, MatLike extends IMat4Like>
        (out: Out, v: VecLike, m: MatLike) {
        const x = v.x;
        const y = v.y;
        const z = v.z;
        const w = v.w;
        out.x = m.m00 * x + m.m01 * y + m.m02 * z + m.m03 * w;
        out.y = m.m04 * x + m.m05 * y + m.m06 * z + m.m07 * w;
        out.x = m.m08 * x + m.m09 * y + m.m10 * z + m.m11 * w;
        out.w = v.w;
        return out;
    }

    /**
     * @zh 向量四元数乘法
     */
    public static transformQuat <Out extends IVec4Like, QuatLike extends IQuatLike> (out: Out, a: Out, q: QuatLike) {
        const { x, y, z } = a;

        const _x = q.x;
        const _y = q.y;
        const _z = q.z;
        const _w = q.w;

        // calculate quat * vec
        const ix = _w * x + _y * z - _z * y;
        const iy = _w * y + _z * x - _x * z;
        const iz = _w * z + _x * y - _y * x;
        const iw = -_x * x - _y * y - _z * z;

        // calculate result * inverse quat
        out.x = ix * _w + iw * -_x + iy * -_z - iz * -_y;
        out.y = iy * _w + iw * -_y + iz * -_x - ix * -_z;
        out.z = iz * _w + iw * -_z + ix * -_y - iy * -_x;
        out.w = a.w;
        return out;
    }

    /**
     * @zh 向量转数组
     * @param ofs 数组起始偏移量
     */
    public static toArray <Out extends IWritableArrayLike<number>> (out: Out, v: IVec4Like, ofs = 0) {
        out[ofs + 0] = v.x;
        out[ofs + 1] = v.y;
        out[ofs + 2] = v.z;
        out[ofs + 3] = v.w;
        return out;
    }

    /**
     * @zh 数组转向量
     * @param ofs 数组起始偏移量
     */
    public static fromArray <Out extends IVec4Like> (out: Out, arr: IWritableArrayLike<number>, ofs = 0) {
        out.x = arr[ofs + 0];
        out.y = arr[ofs + 1];
        out.z = arr[ofs + 2];
        out.w = arr[ofs + 3];
        return out;
    }

    /**
     * @zh 向量等价判断
     */
    public static strictEquals <Out extends IVec4Like> (a: Out, b: Out) {
        return a.x === b.x && a.y === b.y && a.z === b.z && a.w === b.w;
    }

    /**
     * @zh 排除浮点数误差的向量近似等价判断
     */
    public static equals <Out extends IVec4Like> (a: Out, b: Out, epsilon = EPSILON) {
        return (Math.abs(a.x - b.x) <= epsilon * Math.max(1.0, Math.abs(a.x), Math.abs(b.x)) &&
            Math.abs(a.y - b.y) <= epsilon * Math.max(1.0, Math.abs(a.y), Math.abs(b.y)) &&
            Math.abs(a.z - b.z) <= epsilon * Math.max(1.0, Math.abs(a.z), Math.abs(b.z)) &&
            Math.abs(a.w - b.w) <= epsilon * Math.max(1.0, Math.abs(a.w), Math.abs(b.w)));
    }

    /**
     * @en The x value of the vector.
     * @zh x 分量。
     */
    public get x (): number {
        return this.v[0];
    }
    public set x (x: number) {
        this.v[0] = x;
    }

    /**
     * @en The y value of the vector.
     * @zh y 分量。
     */
    public get y (): number {
        return this.v[1];
    }
    public set y (y: number) {
        this.v[1] = y;
    }

    /**
     * @en The z value of the vector.
     * @zh z 分量。
     */
    public get z (): number {
        return this.v[2];
    }
    public set z (z: number) {
        this.v[2] = z;
    }

    /**
     * @en The w value of the vector.
     * @zh w 分量。
     */
    public get w (): number {
        return this.v[3];
    }
    public set w (w: number) {
        this.v[3] = w;
    }

    /**
     * @en Get the internal data in vec4.
     * @zh 获取 Vec4 的内部数据。
     */
    public declare v: Float32Array;

    constructor (x: Vec4 | Float32Array);

    constructor (x?: number, y?: number, z?: number, w?: number);

    constructor (x?: number | Vec4 | Float32Array, y?: number, z?: number, w?: number) {
        super();
        if (x && typeof x === 'object') {
            if (ArrayBuffer.isView(x)) {
               this.v = x;
            } else {
                const v = x.v;
                this.v = new Float32Array(4);
                this.v[0] = v[0];
                this.v[1] = v[1];
                this.v[2] = v[2];
                this.v[3] = v[3];
            }
        } else {
            this.v = new Float32Array(4);
            this.v[0] = x || 0;
            this.v[1] = y || 0;
            this.v[2] = z || 0;
            this.v[3] = w || 0;
        }
    }

    /**
     * @zh 克隆当前向量。
     */
    public clone () {
        return new Vec4(this.v[0], this.v[1], this.v[2], this.v[3]);
    }

    /**
     * @zh 设置当前向量使其与指定向量相等。
     * @param other 相比较的向量。
     * @returns `this`
     */
    public set (other: Vec4);

    /**
     * @zh 设置当前向量的具体分量值。
     * @param x 要设置的 x 分量的值
     * @param y 要设置的 y 分量的值
     * @param z 要设置的 z 分量的值
     * @param w 要设置的 w 分量的值
     * @returns `this`
     */
    public set (x?: number, y?: number, z?: number, w?: number);

    public set (x?: number | Vec4, y?: number, z?: number, w?: number) {
        if (x && typeof x === 'object') {
            const v = x.v;
            this.v[0] = v[0];
            this.v[1] = v[1];
            this.v[2] = v[2];
            this.v[3] = v[3];
        } else {
            this.v[0] = x || 0;
            this.v[1] = y || 0;
            this.v[2] = z || 0;
            this.v[3] = w || 0;
        }
        return this;
    }

    /**
     * @zh 判断当前向量是否在误差范围内与指定向量相等。
     * @param other 相比较的向量。
     * @param epsilon 允许的误差，应为非负数。
     * @returns 当两向量的各分量都在指定的误差范围内分别相等时，返回 `true`；否则返回 `false`。
     */
    public equals (other: Vec4, epsilon = EPSILON) {
        const v = other.v;
        return (Math.abs(this.v[0] - v[0]) <= epsilon * Math.max(1.0, Math.abs(this.v[0]), Math.abs(v[0])) &&
            Math.abs(this.v[1] - v[1]) <= epsilon * Math.max(1.0, Math.abs(this.v[1]), Math.abs(v[1])) &&
            Math.abs(this.v[2] - v[2]) <= epsilon * Math.max(1.0, Math.abs(this.v[2]), Math.abs(v[2])) &&
            Math.abs(this.v[3] - v[3]) <= epsilon * Math.max(1.0, Math.abs(this.v[3]), Math.abs(v[3])));
    }

    /**
     * @zh 判断当前向量是否在误差范围内与指定分量的向量相等。
     * @param x 相比较的向量的 x 分量。
     * @param y 相比较的向量的 y 分量。
     * @param z 相比较的向量的 z 分量。
     * @param w 相比较的向量的 w 分量。
     * @param epsilon 允许的误差，应为非负数。
     * @returns 当两向量的各分量都在指定的误差范围内分别相等时，返回 `true`；否则返回 `false`。
     */
    public equals4f (x: number, y: number, z: number, w: number, epsilon = EPSILON) {
        return (Math.abs(this.v[0] - x) <= epsilon * Math.max(1.0, Math.abs(this.v[0]), Math.abs(x)) &&
            Math.abs(this.v[1] - y) <= epsilon * Math.max(1.0, Math.abs(this.v[1]), Math.abs(y)) &&
            Math.abs(this.v[2] - z) <= epsilon * Math.max(1.0, Math.abs(this.v[2]), Math.abs(z)) &&
            Math.abs(this.v[3] - w) <= epsilon * Math.max(1.0, Math.abs(this.v[3]), Math.abs(w)));
    }

    /**
     * @zh 判断当前向量是否与指定向量相等。
     * @param other 相比较的向量。
     * @returns 两向量的各分量都分别相等时返回 `true`；否则返回 `false`。
     */
    public strictEquals (other: Vec4) {
        const v = other.v;
        return this.v[0] === v[0] && this.v[1] === v[1] && this.v[2] === v[2] && this.v[3] === v[3];
    }

    /**
     * @zh 判断当前向量是否与指定分量的向量相等。
     * @param x 指定向量的 x 分量。
     * @param y 指定向量的 y 分量。
     * @param z 指定向量的 z 分量。
     * @param w 指定向量的 w 分量。
     * @returns 两向量的各分量都分别相等时返回 `true`；否则返回 `false`。
     */
    public strictEquals4f (x: number, y: number, z: number, w: number) {
        return this.v[0] === x && this.v[1] === y && this.v[2] === z && this.v[3] === w;
    }

    /**
     * @zh 根据指定的插值比率，从当前向量到目标向量之间做插值。
     * @param to 目标向量。
     * @param ratio 插值比率，范围为 [0,1]。
     */
    public lerp (to: Vec4, ratio: number) {
        const x = this.v[0];
        const y = this.v[1];
        const z = this.v[2];
        const w = this.v[3];
        const v = to.v;
        this.v[0] = x + ratio * (v[0] - x);
        this.v[1] = y + ratio * (v[1] - y);
        this.v[2] = z + ratio * (v[2] - z);
        this.v[3] = w + ratio * (v[3] - w);
        return this;
    }

    /**
     * @zh 返回当前向量的字符串表示。
     * @returns 当前向量的字符串表示。
     */
    public toString () {
        return `(${this.v[0].toFixed(2)}, ${this.v[1].toFixed(2)}, ${this.v[2].toFixed(2)}, ${this.v[3].toFixed(2)})`;
    }

    /**
     * @zh 设置当前向量的值，使其各个分量都处于指定的范围内。
     * @param minInclusive 每个分量都代表了对应分量允许的最小值。
     * @param maxInclusive 每个分量都代表了对应分量允许的最大值。
     * @returns `this`
     */
    public clampf (minInclusive: Vec4, maxInclusive: Vec4) {
        const min = minInclusive.v;
        const max = maxInclusive.v;
        this.v[0] = clamp(this.v[0], min[0], max[0]);
        this.v[1] = clamp(this.v[1], min[1], max[1]);
        this.v[2] = clamp(this.v[2], min[2], max[2]);
        this.v[3] = clamp(this.v[3], min[3], max[3]);
        return this;
    }

    /**
     * @zh 向量加法。将当前向量与指定向量的相加
     * @param other 指定的向量。
     */
    public add (other: Vec4) {
        const v = other.v;
        this.v[0] = this.v[0] + v[0];
        this.v[1] = this.v[1] + v[1];
        this.v[2] = this.v[2] + v[2];
        this.v[3] = this.v[3] + v[3];
        return this;
    }

    /**
     * @zh 向量加法。将当前向量与指定分量的向量相加
     * @param x 指定的向量的 x 分量。
     * @param y 指定的向量的 y 分量。
     * @param z 指定的向量的 z 分量。
     * @param w 指定的向量的 w 分量。
     */
    public add4f (x: number, y: number, z: number, w: number) {
        this.v[0] = this.v[0] + x;
        this.v[1] = this.v[1] + y;
        this.v[2] = this.v[2] + z;
        this.v[3] = this.v[3] + w;
        return this;
    }

    /**
     * @zh 向量减法。将当前向量减去指定向量
     * @param other 减数向量。
     */
    public subtract (other: Vec4) {
        const v = other.v;
        this.v[0] = this.v[0] - v[0];
        this.v[1] = this.v[1] - v[1];
        this.v[2] = this.v[2] - v[2];
        this.v[3] = this.v[3] - v[3];
        return this;
    }

    /**
     * @zh 向量减法。将当前向量减去指定分量的向量
     * @param x 指定的向量的 x 分量。
     * @param y 指定的向量的 y 分量。
     * @param z 指定的向量的 z 分量。
     * @param w 指定的向量的 w 分量。
     */
    public subtract4f (x: number, y: number, z: number, w: number) {
        this.v[0] = this.v[0] - x;
        this.v[1] = this.v[1] - y;
        this.v[2] = this.v[2] - z;
        this.v[3] = this.v[3] - w;
        return this;
    }

    /**
     * @zh 向量数乘。将当前向量数乘指定标量
     * @param scalar 标量乘数。
     */
    public multiplyScalar (scalar: number) {
        if (typeof scalar === 'object') { console.warn('should use Vec4.multiply for vector * vector operation'); }
        this.v[0] = this.v[0] * scalar;
        this.v[1] = this.v[1] * scalar;
        this.v[2] = this.v[2] * scalar;
        this.v[3] = this.v[3] * scalar;
        return this;
    }

    /**
     * @zh 向量乘法。将当前向量乘以指定向量
     * @param other 指定的向量。
     */
    public multiply (other: Vec4) {
        if (typeof other !== 'object') { console.warn('should use Vec4.scale for vector * scalar operation'); }
        const v = other.v;
        this.v[0] = this.v[0] * v[0];
        this.v[1] = this.v[1] * v[1];
        this.v[2] = this.v[2] * v[2];
        this.v[3] = this.v[3] * v[3];
        return this;
    }

    /**
     * @zh 向量乘法。将当前向量与指定分量的向量相乘的结果赋值给当前向量。
     * @param x 指定的向量的 x 分量。
     * @param y 指定的向量的 y 分量。
     * @param z 指定的向量的 z 分量。
     * @param w 指定的向量的 w 分量。
     */
    public multiply4f (x: number, y: number, z: number, w: number) {
        this.v[0] = this.v[0] * x;
        this.v[1] = this.v[1] * y;
        this.v[2] = this.v[2] * z;
        this.v[3] = this.v[3] * w;
        return this;
    }

    /**
     * @zh 向量逐元素相除。将当前向量与指定分量的向量相除的结果赋值给当前向量。
     * @param other 指定的向量
     */
    public divide (other: Vec4) {
        const v = other.v;
        this.v[0] = this.v[0] / v[0];
        this.v[1] = this.v[1] / v[1];
        this.v[2] = this.v[2] / v[2];
        this.v[3] = this.v[3] / v[3];
        return this;
    }

    /**
     * @zh 向量逐元素相除。将当前向量与指定分量的向量相除的结果赋值给当前向量。
     * @param x 指定的向量的 x 分量。
     * @param y 指定的向量的 y 分量。
     * @param z 指定的向量的 z 分量。
     * @param w 指定的向量的 w 分量。
     */
    public divide4f (x: number, y: number, z: number, w: number) {
        this.v[0] = this.v[0] / x;
        this.v[1] = this.v[1] / y;
        this.v[2] = this.v[2] / z;
        this.v[3] = this.v[3] / w;
        return this;
    }

    /**
     * @zh 将当前向量的各个分量取反
     */
    public negative () {
        this.v[0] = -this.v[0];
        this.v[1] = -this.v[1];
        this.v[2] = -this.v[2];
        this.v[3] = -this.v[3];
        return this;
    }

    /**
     * @zh 向量点乘。
     * @param other 指定的向量。
     * @returns 当前向量与指定向量点乘的结果。
     */
    public dot (other: Vec4) {
        const v = other.v;
        return this.v[0] * v[0] + this.v[1] * v[1] + this.v[2] * v[2] + this.v[3] * v[3];
    }

    /**
     * @zh 向量叉乘。视当前向量和指定向量为三维向量（舍弃 w 分量），将当前向量左叉乘指定向量
     * @param other 指定的向量。
     */
    public cross (other: Vec4) {
        const ax = this.v[0];
        const ay = this.v[1];
        const az = this.v[2];
        const bx = other.v[0];
        const by = other.v[1];
        const bz = other.v[2];

        this.v[0] = ay * bz - az * by;
        this.v[1] = az * bx - ax * bz;
        this.v[2] = ax * by - ay * bx;
        return this;
    }

    /**
     * @zh 计算向量的长度（模）。
     * @returns 向量的长度（模）。
     */
    public length () {
        const x = this.v[0];
        const y = this.v[1];
        const z = this.v[2];
        const w = this.v[3];
        return Math.sqrt(x * x + y * y + z * z + w * w);
    }

    /**
     * @zh 计算向量长度（模）的平方。
     * @returns 向量长度（模）的平方。
     */
    public lengthSqr () {
        const x = this.v[0];
        const y = this.v[1];
        const z = this.v[2];
        const w = this.v[3];
        return x * x + y * y + z * z + w * w;
    }

    /**
     * @zh 将当前向量归一化
     */
    public normalize () {
        const x = this.v[0];
        const y = this.v[1];
        const z = this.v[2];
        const w = this.v[3];
        let len = x * x + y * y + z * z + w * w;
        if (len > 0) {
            len = 1 / Math.sqrt(len);
            this.v[0] = x * len;
            this.v[1] = y * len;
            this.v[2] = z * len;
            this.v[3] = w * len;
        }
        return this;
    }

    /**
     * @zh 应用四维矩阵变换到当前矩阵
     * @param matrix 变换矩阵。
     */
    public transformMat4 (matrix: Mat4) {
        const x = this.v[0];
        const y = this.v[1];
        const z = this.v[2];
        const w = this.v[3];
        const v = matrix.v;
        this.v[0] = v[0] * x + v[4] * y + v[8] * z + v[12] * w;
        this.v[1] = v[1] * x + v[5] * y + v[9] * z + v[13] * w;
        this.v[2] = v[2] * x + v[6] * y + v[10] * z + v[14] * w;
        this.v[3] = v[3] * x + v[7] * y + v[11] * z + v[15] * w;
        return this;
    }
}

CCClass.fastDefine('cc.Vec4', Vec4, { x: 0, y: 0, z: 0, w: 0 });
legacyCC.Vec4 = Vec4;

export function v4 (other: Vec4): Vec4;
export function v4 (x?: number, y?: number, z?: number, w?: number): Vec4;

export function v4 (x?: number | Vec4, y?: number, z?: number, w?: number) {
    return new Vec4(x as any, y, z, w);
}

legacyCC.v4 = v4;
