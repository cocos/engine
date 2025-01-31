/* eslint-disable @typescript-eslint/no-this-alias */
/*
 Copyright (c) 2013-2016 Chukong Technologies Inc.
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

import { CCClass } from '../data/class';
import { ValueType } from '../value-types/value-type';
import { Mat4 } from './mat4';
import { IMat3Like, IMat4Like, IVec2Like } from './type-define';
import { clamp, EPSILON, random } from './utils';

import { Vec3 } from './vec3';
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
const atan2 = Math.atan2;
const ceil = Math.ceil;
const floor = Math.floor;
const round = Math.round;

function freezeVec2 (x: number, y: number): Readonly<Vec2> {
    return Object.freeze(new Vec2(x, y));
}

/**
 * @en Representation of 2D vectors and points.
 * @zh 二维向量。
 */
export class Vec2 extends ValueType {
    public static ZERO = freezeVec2(0, 0);
    public static ONE = freezeVec2(1, 1);
    public static NEG_ONE = freezeVec2(-1, -1);
    public static UNIT_X = freezeVec2(1, 0);
    public static UNIT_Y = freezeVec2(0, 1);

    /**
     * @en Obtains a clone of the given vector object
     * @zh 获得指定向量的拷贝
     */
    public static clone <Out extends IVec2Like> (a: Out): Vec2 {
        return new Vec2(a.x, a.y);
    }

    /**
     * @en Copy the target vector and save the results to out vector object
     * @zh 复制目标向量
     */
    public static copy <Out extends IVec2Like> (out: Out, a: Out): Out {
        out.x = a.x;
        out.y = a.y;
        return out;
    }

    /**
     * @en Sets the out vector with the given x and y values
     * @zh 设置向量值
     */
    public static set <Out extends IVec2Like> (out: Out, x: number, y: number): Out {
        out.x = x;
        out.y = y;
        return out;
    }

    /**
     * @en Element-wise vector addition and save the results to out vector object
     * @zh 逐元素向量加法
     */
    public static add <Out extends IVec2Like> (out: Out, a: Out, b: Out): Out {
        out.x = a.x + b.x;
        out.y = a.y + b.y;
        return out;
    }

    /**
     * @en Element-wise vector subtraction and save the results to out vector object
     * @zh 逐元素向量减法
     */
    public static subtract <Out extends IVec2Like> (out: Out, a: Out, b: Out): Out {
        out.x = a.x - b.x;
        out.y = a.y - b.y;
        return out;
    }

    /**
     * @en Element-wise vector multiplication and save the results to out vector object
     * @zh 逐元素向量乘法
     */
    public static multiply <Out extends IVec2Like> (out: Out, a: Out, b: Out): Out {
        out.x = a.x * b.x;
        out.y = a.y * b.y;
        return out;
    }

    /**
     * @en Element-wise vector division and save the results to out vector object
     * @zh 逐元素向量除法
     */
    public static divide <Out extends IVec2Like> (out: Out, a: Out, b: Out): Out {
        out.x = a.x / b.x;
        out.y = a.y / b.y;
        return out;
    }

    /**
     * @en Rounds up by elements of the vector and save the results to out vector object
     * @zh 逐元素向量向上取整
     */
    public static ceil <Out extends IVec2Like> (out: Out, a: Out): Out {
        out.x = ceil(a.x);
        out.y = ceil(a.y);
        return out;
    }

    /**
     * @en Element-wise rounds down of the current vector and save the results to the out vector
     * @zh 逐元素向量向下取整
     */
    public static floor <Out extends IVec2Like> (out: Out, a: Out): Out {
        out.x = floor(a.x);
        out.y = floor(a.y);
        return out;
    }

    /**
     * @en Calculates element-wise minimum values and save to the out vector
     * @zh 逐元素向量最小值
     */
    public static min <Out extends IVec2Like> (out: Out, a: Out, b: Out): Out {
        out.x = min(a.x, b.x);
        out.y = min(a.y, b.y);
        return out;
    }

    /**
     * @en Calculates element-wise maximum values and save to the out vector
     * @zh 逐元素向量最大值
     */
    public static max <Out extends IVec2Like> (out: Out, a: Out, b: Out): Out {
        out.x = max(a.x, b.x);
        out.y = max(a.y, b.y);
        return out;
    }

    /**
     * @en Calculates element-wise round results and save to the out vector
     * @zh 逐元素向量四舍五入取整
     */
    public static round <Out extends IVec2Like> (out: Out, a: Out): Out {
        out.x = round(a.x);
        out.y = round(a.y);
        return out;
    }

    /**
     * @en Vector scalar multiplication and save the results to out vector object
     * @zh 向量标量乘法
     */
    public static multiplyScalar <Out extends IVec2Like> (out: Out, a: Out, b: number): Out {
        out.x = a.x * b;
        out.y = a.y * b;
        return out;
    }

    /**
     * @en Element-wise multiplication and addition with the equation: a + b * scale
     * @zh 逐元素向量乘加: A + B * scale
     */
    public static scaleAndAdd <Out extends IVec2Like> (out: Out, a: Out, b: Out, scale: number): Out {
        out.x = a.x + (b.x * scale);
        out.y = a.y + (b.y * scale);
        return out;
    }

    /**
     * @en Calculates the euclidean distance of two vectors
     * @zh 求两向量的欧氏距离
     */
    public static distance <Out extends IVec2Like> (a: Out, b: Out): number {
        const x = b.x - a.x;
        const y = b.y - a.y;
        return sqrt(x * x + y * y);
    }

    /**
     * @en Calculates the squared euclidean distance of two vectors
     * @zh 求两向量的欧氏距离平方
     */
    public static squaredDistance <Out extends IVec2Like> (a: Out, b: Out): number {
        const x = b.x - a.x;
        const y = b.y - a.y;
        return x * x + y * y;
    }

    /**
     * @en Calculates the length of the vector
     * @zh 求向量长度
     */
    public static len <Out extends IVec2Like> (a: Out): number {
        const x = a.x;
        const y = a.y;
        return sqrt(x * x + y * y);
    }

    /**
     * @en Calculates the squared length of the vector
     * @zh 求向量长度平方
     */
    public static lengthSqr <Out extends IVec2Like> (a: Out): number {
        const x = a.x;
        const y = a.y;
        return x * x + y * y;
    }

    /**
     * @en Sets each element to its negative value
     * @zh 逐元素向量取负
     */
    public static negate <Out extends IVec2Like> (out: Out, a: Out): Out {
        out.x = -a.x;
        out.y = -a.y;
        return out;
    }

    /**
     * @en Sets each element to its inverse value, zero value will become Infinity
     * @zh 逐元素向量取倒数，接近 0 时返回 Infinity
     */
    public static inverse <Out extends IVec2Like> (out: Out, a: Out): Out {
        out.x = 1.0 / a.x;
        out.y = 1.0 / a.y;
        return out;
    }

    /**
     * @en Sets each element to its inverse value, zero value will remain zero
     * @zh 逐元素向量取倒数，接近 0 时返回 0
     */
    public static inverseSafe <Out extends IVec2Like> (out: Out, a: Out): Out {
        const x = a.x;
        const y = a.y;

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

        return out;
    }

    /**
     * @en Sets the normalized vector to the out vector, returns a zero vector if input is a zero vector.
     * @zh 归一化向量，输入零向量将会返回零向量。
     */
    public static normalize <Out extends IVec2Like, Vec2Like extends IVec2Like> (out: Out, a: Vec2Like): Out {
        const x = a.x;
        const y = a.y;
        let len = x * x + y * y;
        if (len > 0) {
            len = 1 / sqrt(len);
            out.x = x * len;
            out.y = y * len;
        } else {
            out.x = 0;
            out.y = 0;
        }
        return out;
    }

    /**
     * @en Calculates the dot product of the vector
     * @zh 向量点积（数量积）
     */
    public static dot <Out extends IVec2Like> (a: Out, b: Out): number {
        return a.x * b.x + a.y * b.y;
    }

    /**
     * @en Calculates the cross product of the vector
     * @zh 向量叉积（向量积），注意二维向量的叉积为与 Z 轴平行的三维向量
     * @override (a:Vec2, b:Vec2) => number
     * @override [deprecated] (out:Vec3, a:Vec2, b:Vec2) => Vec3
     */
    public static cross (a: IVec2Like, b: IVec2Like): number;

    /**
     * @deprecated Consider use another overrides please.
     */
    public static cross <Out extends IVec2Like> (out: Vec3, a: Out, b: Out): Vec3;

    public static cross (out: IVec2Like | Vec3, a: IVec2Like, b?: IVec2Like): number | Vec3 {
        if (out instanceof Vec3) {
            out.x = out.y = 0;
            out.z = a.x * b!.y - a.y * b!.x;
            return out;
        } else {
            return out.x * a.y - out.y * a.x;
        }
    }

    /**
     * @en Calculates the linear interpolation between two vectors with a given ratio: A + t * (B - A)
     * @zh 逐元素向量线性插值： A + t * (B - A)
     */
    public static lerp <Out extends IVec2Like> (out: Out, a: Out, b: Out, t: number): Out {
        const x = a.x;
        const y = a.y;
        out.x = x + t * (b.x - x);
        out.y = y + t * (b.y - y);
        return out;
    }

    /**
     * @en Generates a uniformly distributed random vector points from center to the surface of the unit sphere
     * @zh 生成一个在单位圆上均匀分布的随机向量
     * @param scale vector length
     */
    public static random <Out extends IVec2Like> (out: Out, scale?: number): Out {
        scale = scale || 1.0;
        const r = random() * 2.0 * PI;
        out.x = cos(r) * scale;
        out.y = sin(r) * scale;
        return out;
    }

    /**
     * @en Vector and third order matrix multiplication, will complete the vector with a third value as one
     * @zh 向量与三维矩阵乘法，默认向量第三位为 1。
     */
    public static transformMat3 <Out extends IVec2Like, MatLike extends IMat3Like> (out: Out, a: Out, m: IMat3Like): Out {
        const x = a.x;
        const y = a.y;
        out.x = m.m00 * x + m.m03 * y + m.m06;
        out.y = m.m01 * x + m.m04 * y + m.m07;
        return out;
    }

    /**
     * @en Vector and third order matrix multiplication, will complete the vector with a third and a fourth element as one
     * @zh 向量与四维矩阵乘法，默认向量第三位为 0，第四位为 1。
     */
    public static transformMat4 <Out extends IVec2Like, MatLike extends IMat4Like> (out: Out, a: Out, m: IMat4Like): Out {
        const x = a.x;
        const y = a.y;
        out.x = m.m00 * x + m.m04 * y + m.m12;
        out.y = m.m01 * x + m.m05 * y + m.m13;
        return out;
    }

    /**
     * @en Gets the string representation of the given vector
     * @zh 返回向量的字符串表示
     */
    public static str <Out extends IVec2Like> (a: Out): string {
        return `Vec2(${a.x}, ${a.y})`;
    }

    /**
     * @en Converts the given vector to an array
     * @zh 向量转数组
     * @param ofs Array Start Offset
     */
    public static toArray <Out extends IWritableArrayLike<number>> (out: Out, v: IVec2Like, ofs = 0): Out {
        out[ofs + 0] = v.x;
        out[ofs + 1] = v.y;
        return out;
    }

    /**
     * @en Converts the given array to a vector
     * @zh 数组转向量
     * @param ofs Array Start Offset
     */
    public static fromArray <Out extends IVec2Like> (out: Out, arr: IWritableArrayLike<number>, ofs = 0): Out {
        out.x = arr[ofs + 0];
        out.y = arr[ofs + 1];
        return out;
    }

    /**
     * @en Check the equality of the two given vectors
     * @zh 向量等价判断
     */
    public static strictEquals <Out extends IVec2Like> (a: Out, b: Out): boolean {
        return a.x === b.x && a.y === b.y;
    }

    /**
     * @en Check whether the two given vectors are approximately equivalent
     * @zh 排除浮点数误差的向量近似等价判断
     */
    public static equals <Out extends IVec2Like> (a: Out, b: Out,  epsilon = EPSILON): boolean {
        return (
            abs(a.x - b.x) <= epsilon * max(1.0, abs(a.x), abs(b.x))
            && abs(a.y - b.y) <= epsilon * max(1.0, abs(a.y), abs(b.y))
        );
    }

    /**
     * @en Calculates the radian angle between two vectors, returns zero if either vector is a zero vector.
     * @zh 求两向量夹角弧度，任意一个向量是零向量则返回零。
     */
    public static angle <Out extends IVec2Like> (a: Out, b: Out): number {
        const magSqr1 = a.x * a.x + a.y * a.y;
        const magSqr2 = b.x * b.x + b.y * b.y;

        if (magSqr1 === 0 || magSqr2 === 0) {
            return 0.0;
        }

        const dot = a.x * b.x + a.y * b.y;
        let cosine = dot / (sqrt(magSqr1 * magSqr2));
        cosine = clamp(cosine, -1.0, 1.0);
        return acos(cosine);
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

    constructor (other: Vec2);

    constructor (x?: number, y?: number);

    constructor (x?: number | Vec2, y?: number) {
        super();
        if (typeof x === 'object') {
            this.x = x.x;
            this.y = x.y;
        } else {
            this.x = x || 0;
            this.y = y || 0;
        }
    }

    /**
     * @en clone a Vec2 value
     * @zh 克隆当前向量。
     */
    public clone (): Vec2 {
        return new Vec2(this.x, this.y);
    }

    /**
     * @en Set the current vector value with the given vector.
     * @zh 设置当前向量使其与指定向量相等。
     * @param other Specified vector
     * @return `this`
     */
    public set (other: Vec2): Vec2;

    /**
     * @en Set the value of each component of the current vector.
     * @zh 设置当前向量的具体分量值。
     * @param x x value
     * @param y y value
     * @return `this`
     */
    public set (x?: number, y?: number): Vec2;

    public set (x?: number | Vec2, y?: number): Vec2 {
        if (typeof x === 'object') {
            this.x = x.x;
            this.y = x.y;
        } else {
            this.x = x || 0;
            this.y = y || 0;
        }
        return this;
    }

    /**
     * @en Check whether the vector approximately equals another one.
     * @zh 判断当前向量是否在误差范围内与指定向量相等。
     * @param other Specified vector
     * @param epsilon The error allowed. It`s should be a non-negative number.
     * @return Returns `true` when the components of both vectors are equal within the specified range of error; otherwise it returns `false`.
     */
    public equals (other: Vec2, epsilon = EPSILON): boolean {
        return Vec2.equals(this, other, epsilon);
    }

    /**
     * @en Check whether the vector approximately equals another one.
     * @zh 判断当前向量是否在误差范围内与指定分量的向量相等。
     * @param x The x value of specified vector
     * @param y The y value of specified vector
     * @param epsilon The error allowed. It`s should be a non-negative number.
     * @return Returns `true` when the components of both vectors are equal within the specified range of error; otherwise it returns `false`.
     */
    public equals2f (x: number, y: number, epsilon = EPSILON): boolean {
        return (
            abs(this.x - x) <= epsilon * max(1.0, abs(this.x), abs(x))
                && abs(this.y - y) <= epsilon * max(1.0, abs(this.y), abs(y))
        );
    }

    /**
     * @en Check whether the current vector strictly equals another Vec2.
     * @zh 判断当前向量是否与指定向量相等。
     * @param other specified vector
     * @return Returns `true` when the components of both vectors are equal within the specified range of error; otherwise it returns `false`.
     */
    public strictEquals (other: Vec2): boolean {
        return other && this.x === other.x && this.y === other.y;
    }

    /**
     * @en Check whether the current vector strictly equals another Vec2.
     * @zh 判断当前向量是否与指定分量的向量相等。
     * @param x The x value of specified vector
     * @param y The y value of specified vector
     * @return Returns `true` when the components of both vectors are equal within the specified range of error; otherwise it returns `false`.
     */
    public strictEquals2f (x: number, y: number): boolean {
        return this.x === x && this.y === y;
    }

    /**
     * @en Transform to string with vector information.
     * @zh 返回当前向量的字符串表示。
     * @returns The string with vector information
     */
    public toString (): string {
        return `(${this.x}, ${this.y})`;
    }

    /**
     * @en Calculate linear interpolation result between this vector and another one with given ratio.
     * @zh 根据指定的插值比率，从当前向量到目标向量之间做插值。
     * @param to Target vector
     * @param ratio The interpolation coefficient.The range is [0,1].
     */
    public lerp (to: Vec2, ratio: number): Vec2 {
        const x = this.x;
        const y = this.y;
        this.x = x + ratio * (to.x - x);
        this.y = y + ratio * (to.y - y);
        return this;
    }

    /**
     * @en Clamp the vector between minInclusive and maxInclusive.
     * @zh 设置当前向量的值，使其各个分量都处于指定的范围内。
     * @param minInclusive Minimum value allowed
     * @param maxInclusive Maximum value allowed
     * @return `this`
     */
    public clampf (minInclusive: Vec2, maxInclusive: Vec2): Vec2 {
        this.x = clamp(this.x, minInclusive.x, maxInclusive.x);
        this.y = clamp(this.y, minInclusive.y, maxInclusive.y);
        return this;
    }

    /**
     * @en Adds the current vector with another one and return this
     * @zh 向量加法。将当前向量与指定向量的相加
     * @param other specified vector
     */
    public add (other: Vec2): Vec2 {
        this.x += other.x;
        this.y += other.y;
        return this;
    }

    /**
     * @en Adds the current vector with another one and return this
     * @zh 向量加法。将当前向量与指定分量的向量相加
     * @param x The x value of specified vector
     * @param y The y value of specified vector
     */
    public add2f (x: number, y: number): Vec2 {
        this.x += x;
        this.y += y;
        return this;
    }

    /**
     * @en Subtracts one vector from this, and returns this.
     * @zh 向量减法。将当前向量减去指定向量
     * @param other specified vector
     */
    public subtract (other: Vec2): Vec2 {
        this.x -= other.x;
        this.y -= other.y;
        return this;
    }

    /**
     * @en Subtracts one vector from this, and returns this.
     * @zh 向量减法。将当前向量减去指定分量的向量
     * @param x The x value of specified vector
     * @param y The y value of specified vector
     */
    public subtract2f (x: number, y: number): Vec2 {
        this.x -= x;
        this.y -= y;
        return this;
    }

    /**
     * @en Multiplies the current vector with a number, and returns this.
     * @zh 向量数乘。将当前向量数乘指定标量
     * @param scalar scalar number
     */
    public multiplyScalar (scalar: number): Vec2 {
        if (typeof scalar === 'object') {
            warnID(16359);
        }
        this.x *= scalar;
        this.y *= scalar;
        return this;
    }

    /**
     * @en Multiplies the current vector with another one and return this
     * @zh 向量乘法。将当前向量乘以与指定向量的结果赋值给当前向量。
     * @param other specified vector
     */
    public multiply (other: Vec2): Vec2 {
        if (typeof other !== 'object') {
            warnID(16360);
        }
        this.x *= other.x;
        this.y *= other.y;
        return this;
    }

    /**
     * @en Multiplies the current vector with another one and return this
     * @zh 向量乘法。将当前向量与指定分量的向量相乘的结果赋值给当前向量。
     * @param x The x value of specified vector
     * @param y The y value of specified vector
     */
    public multiply2f (x: number, y: number): Vec2 {
        this.x *= x;
        this.y *= y;
        return this;
    }

    /**
     * @en Element-wisely divides this vector with another one, and return this.
     * @zh 向量逐元素相除。将当前向量与指定分量的向量相除的结果赋值给当前向量。
     * @param other specified vector
     */
    public divide (other: Vec2): Vec2 {
        this.x /= other.x;
        this.y /= other.y;
        return this;
    }

    /**
     * @en Element-wisely divides this vector with another one, and return this.
     * @zh 向量逐元素相除。将当前向量与指定分量的向量相除的结果赋值给当前向量。
     * @param x The x value of specified vector
     * @param y The y value of specified vector
     */
    public divide2f (x: number, y: number): Vec2 {
        this.x /= x;
        this.y /= y;
        return this;
    }

    /**
     * @en Sets each component of this vector with its negative value
     * @zh 将当前向量的各个分量取反
     */
    public negative (): Vec2 {
        this.x = -this.x;
        this.y = -this.y;
        return this;
    }

    /**
     * @en Calculates the dot product with another vector
     * @zh 向量点乘。
     * @param other specified vector
     * @return The result of calculates the dot product with another vector
     */
    public dot (other: Vec2): number {
        return this.x * other.x + this.y * other.y;
    }

    /**
     * @en Calculates the cross product with another vector.
     * @zh 向量叉乘。
     * @param other specified vector
     * @return `out`
     */
    public cross (other: Vec2): number {
        return this.x * other.y - this.y * other.x;
    }

    /**
     * @en Returns the length of this vector.
     * @zh 计算向量的长度（模）。
     * @return Length of vector
     */
    public length (): number {
        return sqrt(this.x * this.x + this.y * this.y);
    }

    /**
     * @en Returns the squared length of this vector.
     * @zh 计算向量长度（模）的平方。
     * @return the squared length of this vector
     */
    public lengthSqr (): number {
        return this.x * this.x + this.y * this.y;
    }

    /**
     * @en Normalize the current vector.
     * @zh 将当前向量归一化。
     */
    public normalize (): Vec2 {
        const self = this;
        const x = self.x;
        const y = self.y;
        let len = x * x + y * y;
        if (len > 0) {
            len = 1 / sqrt(len);
            self.x *= len;
            self.y *= len;
        }
        return self;
    }

    /**
     * @en Calculates radian angle between two vectors, returns zero if either vector is a zero vector.
     * @zh 获取当前向量和指定向量之间的弧度，任意一个向量是零向量则返回零。
     * @param other specified vector.
     * @return The angle between the current vector and the specified vector.
     */
    public angle (other: Vec2): number {
        const magSqr1 = this.lengthSqr();
        const magSqr2 = other.lengthSqr();

        if (magSqr1 === 0 || magSqr2 === 0) {
            return 0.0;
        }

        const dot = this.dot(other);
        let cosine = dot / (sqrt(magSqr1 * magSqr2));
        cosine = clamp(cosine, -1.0, 1.0);
        return acos(cosine);
    }

    /**
     * @en Get angle in radian between this and vector with direction.
     * @zh 获取当前向量和指定向量之间的有符号弧度。<br/>
     * 有符号弧度的取值范围为 (-PI, PI]，当前向量可以通过逆时针旋转有符号角度与指定向量同向。<br/>
     * @param other specified vector
     * @return The signed angle between the current vector and the specified vector (in radians);
     * if there is a zero vector in the current vector and the specified vector, 0 is returned.
     */
    public signAngle (other: Vec2): number {
        // θ = atan(tan(θ))
        //   = atan(sin(θ) / cos(θ))
        //   = atan2(sin(θ), cos(θ))
        //   = atan2(|a|·|b|·sin(θ), |a|·|b|·cos(θ))
        //   = atan2(cross(a, b), dot(a, b))
        const cross = this.cross(other);
        const dot = this.dot(other);
        return atan2(cross, dot);
    }

    /**
     * @en Rotates the current vector by an angle in radian value. Counterclockwise is the positive direction.
     * @zh 将当前向量进行旋转，逆时针为正方向。
     * @param radians radians of rotation.
     */
    public rotate (radians: number): Vec2 {
        const x = this.x;
        const y = this.y;

        const s = sin(radians);
        const c = cos(radians);
        this.x = c * x - s * y;
        this.y = s * x + c * y;
        return this;
    }

    /**
     * @en Projects the current vector on another one
     * @zh 计算当前向量在指定向量上的投影向量。
     * @param other specified vector
     */
    public project (other: Vec2): Vec2 {
        const scalar = this.dot(other) / other.dot(other);
        this.x = other.x * scalar;
        this.y = other.y * scalar;
        return this;
    }

    /**
     * @en Transforms the vec2 with a mat4. 3rd vector component is implicitly '0', 4th vector component is implicitly '1'
     * @zh 将当前向量视为 z 分量为 0、w 分量为 1 的四维向量，<br/>
     * 应用四维矩阵变换到当前矩阵<br/>
     * @param matrix matrix to transform with
     */
    public transformMat4 (matrix: Mat4): Vec2 {
        const x = this.x;
        const y = this.y;
        this.x = matrix.m00 * x + matrix.m04 * y + matrix.m12;
        this.y = matrix.m01 * x + matrix.m05 * y + matrix.m13;
        return this;
    }

    /**
     * @en Converts the current Vec2 object to a Vec3 object by adding a z-component of 0.
     * @zh 将当前的Vec2对象转换为一个z分量为0的Vec3对象。
     * @returns Vec3 @en A new Vec3 object created from the current Vec2 object with z-component set to 0.
     * @zh 从当前的Vec2对象创建一个新的Vec3对象，其中z分量设置为0。
     */
    public toVec3 (): Vec3 {
        return new Vec3(this.x, this.y, 0);
    }
}

CCClass.fastDefine('cc.Vec2', Vec2, { x: 0, y: 0 });
legacyCC.Vec2 = Vec2;

export function v2 (other: Vec2): Vec2;
export function v2 (x?: number, y?: number): Vec2;

export function v2 (x?: number | Vec2, y?: number): Vec2 {
    return new Vec2(x as number, y);
}

legacyCC.v2 = v2;
