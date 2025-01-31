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

import { clamp, v3, Vec3 } from '../math';
import { assertID, warnID } from '../platform/debug';
import { ShapeType } from './enums';
import { assertsArrayIndex } from '../data/utils/asserts';

const vec3MultiplyScalar = Vec3.multiplyScalar;
const vec3Add = Vec3.add;

export enum SplineMode {
    /**
     * @en
     * Broken line:
     * Each knot is connected with a straight line from the beginning to the end to form a curve. At least two knots.
     * @zh
     * 每个结从头到尾用一条直线相连，形成一条曲线。 至少存在两个结点。
     */
    LINEAR = 0,

    /**
     * @en
     * Piecewise Bezier curve:
     * Every four knots form a curve. Total knots number must be a multiple of 4.
     * Each curve passes only the first and fourth knots, and does not pass through the middle two control knots.
     *
     * If you need a whole continuous curve:
     * (1) Suppose the four knots of the previous curve are A, B, C, D
     * (2) The four knots of the next curve must be D, E, F, G
     * (3) C and E need to be symmetrical about D
     *
     * @zh
     * 分段贝塞尔曲线：
     * 每四个结形成一条曲线。 总节数必须是 4 的倍数。
     * 每条曲线只通过第一个和第四个结点，不通过中间两个控制结点。
     *
     * 如果你需要一条完整的连续曲线：
     * (1) 假设前面曲线的四个结点分别是 A, B, C, D
     * (2) 下一条曲线的四个结点必须是 D, E, F, G
     * (3) C 和 E 需要关于 D 对称
     */
    BEZIER = 1,

    /**
     * @en
     * Catmull Rom curve:
     * All knots(including start & end knots) form a whole continuous curve. At least two knots.
     * The whole curve passes through all knots.
     *
     * @zh
     * Catmull Rom 曲线：
     * 所有结点（包括起始结点和结束结点）形成一条完整的连续曲线。 至少存在两个结点。
     * 整条曲线穿过所有结点。
     */
    CATMULL_ROM = 2
}

const SPLINE_WHOLE_INDEX = 0xffffffff;

const _v0 = v3();
const _v1 = v3();
const _v2 = v3();
const _v3 = v3();

/**
 * @en
 * Basic Geometry: Spline.
 * @zh
 * 基础几何：Spline。
 */

export class Spline {
    private readonly _type: number;
    private declare _mode: SplineMode;
    private _knots: Vec3[] = [];

    private constructor (mode: SplineMode = SplineMode.CATMULL_ROM, knots: Readonly<Vec3[]> = []) {
        this._type = ShapeType.SHAPE_SPLINE;
        this._mode = mode;

        for (let i = 0; i < knots.length; i++) {
            this._knots[i] = v3(knots[i]);
        }
    }

    /**
     * @en
     * Creates a spline instance.
     * @zh
     * 创建一个 Spline 实例。
     * @param mode @en The mode to create the Spline instance. @zh 用于创建 Spline 实例的模式。
     * @param knots @en The knots to create the Spline instance. @zh 用于创建 Spline 实例的结点列表。
     * @returns @en The created Spline instance. @zh 创建出的 Spline 实例。
     */
    public static create (mode: SplineMode, knots: Vec3[] = []): Spline {
        return new Spline(mode, knots);
    }

    /**
     * @en
     * Clones a Spline instance.
     * @zh
     * 克隆一个 Spline 实例。
     * @param s @en The Spline instance to be cloned. @zh 用于克隆的 Spline 实例。
     * @returns @en The cloned Spline instance. @zh 克隆出的 Spline 实例。
     */
    public static clone (s: Spline): Spline {
        return new Spline(s.mode, s.knots);
    }

    /**
     * @en
     * Copies the values of a Spline instance to another.
     * @zh
     * 拷贝一个 Spline 实例的值到另一个中。
     * @param out @en The target Spline instance to copy to. @zh 拷贝目标 Spline 实例。
     * @param s @en The source Spline instance to copy from. @zh 拷贝源 Spline 实例。
     * @returns @en The target Spline instance to copy to, same as the `out` parameter. @zh 拷贝目标 Spline 实例，值与 `out` 参数相同。
     */
    public static copy (out: Spline, s: Spline): Spline {
        out._mode = s.mode;
        out._knots.length = 0;

        const knots = s.knots;
        const length = knots.length;
        for (let i = 0; i < length; i++) {
            out._knots[i] = v3(knots[i]);
        }

        return out;
    }

    /**
     * @en
     * Gets the type of this Spline instance, always returns `ShapeType.SHAPE_SPLINE`.
     * @zh
     * 获取此 Spline 的类型，固定返回 `ShapeType.SHAPE_SPLINE`
     */
    get type (): number {
        return this._type;
    }

    /**
     * @en
     * Gets the mode of this Spline instance.
     * @zh
     * 获取当前 Spline 实例的模式。
     */
    get mode (): SplineMode {
        return this._mode;
    }

    /**
     * @en
     * Gets all knots of this Spline instance.
     * @zh
     * 获取当前 Spline 实例的所有结点。
     */
    get knots (): Readonly<Vec3[]> {
        return this._knots;
    }

    /**
     * @en
     * Sets the mode and knots to this Spline instance.
     * @zh
     * 给当前 Spline 实例设置模式和结点。
     * @param mode @en The mode to be set to this Spline instance. @zh 要设置到当前 Spline 实例的模式。
     * @param knots @en The knots to be set to this spline instance. @zh 要设置到当前 Spline 实例的结点列表。
     */
    public setModeAndKnots (mode: SplineMode, knots: Vec3[]): void {
        this._mode = mode;
        this._knots.length = 0;

        for (let i = 0; i < knots.length; i++) {
            this._knots[i] = v3(knots[i]);
        }
    }

    /**
     * @en
     * Clears all knots of this Spline instance.
     * @zh
     * 清空当前 Spline 实例的所有结点。
     */
    public clearKnots (): void {
        this._knots.length = 0;
    }

    /**
     * @en
     * Gets the knot count of this Spline instance.
     * @zh
     * 获取当前 Spline 实例的结点数量。
     * @returns @en The knot count of this Spline instance. @zh 当前 Spline 实例的结点数量。
     */
    public getKnotCount (): number {
        return this._knots.length;
    }

    /**
     * @en
     * Adds a knot to this Spline instance.
     * @zh
     * 给当前 Spline 实例添加一个结点。
     * @param knot @en The knot to add to this Spline instance. @zh 要添加到当前 Spline 实例的结点。
     */
    public addKnot (knot: Vec3): void {
        this._knots.push(v3(knot));
    }

    /**
     * @en
     * Inserts a knot to the specified position of this Spline instance.
     * @zh
     * 插入一个结点到当前 Spline 实例的指定位置。
     * @param index @en The position of this Spline instance to be inserted. @zh 要插入到此 Spline 实例的位置。
     * @param knot @en The knot to be inserted. @zh 要插入的结点。
     */
    public insertKnot (index: number, knot: Vec3): void {
        const item = v3(knot);
        if (index >= this._knots.length) {
            this._knots.push(item);
            return;
        }

        this._knots.splice(index, 0, item);
    }

    /**
     * @en
     * Removes a knot at the specified position of this Spline instance.
     * @zh
     * 移除当前 Spline 实例的指定位置的一个结点。
     * @param index
     */
    public removeKnot (index: number): void {
        assertsArrayIndex(this._knots, index);

        this._knots.splice(index, 1);
    }

    /**
     * @en
     * Sets a knot to the specified position of this Spline instance.
     * @zh
     * 为当前 Spline 实例的指定位置设置结点信息。
     * @param index @en The specified position of this Spline instance. @zh 要设置结点的指定位置。
     * @param knot @en The knot to be set to the specified position. @zh 要设置的结点。
     */
    public setKnot (index: number, knot: Vec3): void {
        assertsArrayIndex(this._knots, index);

        this._knots[index].set(knot);
    }

    /**
     * @en
     * Gets the knot of the specified position of this Spline instance.
     * @zh
     * 获取当前 Spline 实例指定位置的结点。
     * @param index @en The specified position of this Spline instance. @zh 要设置结点的指定位置。
     * @returns @en The knot of the specified position of this Spline instance. @zh 当前 Spline 实例指定位置的结点。
     */
    public getKnot (index: number): Readonly<Vec3> {
        assertsArrayIndex(this._knots, index);

        return this._knots[index];
    }

    /**
     * @en
     * Gets a point at t with repect to the `index` segment of curve or the whole curve.
     * @zh
     * 获取 t 处相对于某段或整条曲线的点。
     * @param t @en The factor with a range of [0.0, 1.0]. @zh 0.0 到 1.0 的因子。
     * @param index @en The knot index of this Spline instance, default value is the whole curve. @zh 当前 Spline 实例的某个结点索引，默认值为整条曲线。
     * @returns @en The point matches the input `t` factor and `index`. @zh 满足输入 `t` 参数和 `index` 参数的点。
     */
    public getPoint (t: number, index: number = SPLINE_WHOLE_INDEX): Vec3 {
        t = clamp(t, 0.0, 1.0);

        const segments = this.getSegments();
        if (segments === 0) {
            return v3();
        }

        if (index === SPLINE_WHOLE_INDEX) {
            const deltaT = 1.0 / segments;

            index = Math.floor(t / deltaT);
            t     = (t % deltaT) / deltaT;
        }

        const knots = this._knots;

        if (index >= segments) {
            return v3(knots[knots.length - 1]);
        }

        switch (this._mode) {
        case SplineMode.LINEAR:
            return Spline.calcLinear(knots[index], knots[index + 1], t);
        case SplineMode.BEZIER: {
            const start = index * 4;
            return Spline.calcBezier(knots[start], knots[start + 1], knots[start + 2], knots[start + 3], t);
        }
        case SplineMode.CATMULL_ROM: {
            const v0 = index > 0 ? knots[index - 1] : knots[index];
            const v3 = index + 2 < knots.length ? knots[index + 2] : knots[index + 1];
            return Spline.calcCatmullRom(v0, knots[index], knots[index + 1], v3, t);
        }
        default:
            return v3();
        }
    }

    /**
     * @en
     * Gets points from 0 to 1 uniformly with repect to the `index` segment of curve or the whole curve.
     * @zh
     * 获取相对与某段或整条曲线上的 n 个数量的点信息。
     * @param num @en The count of points needed. @zh 需要的点的数量。
     * @param index @en The knot index of this Spline instance, default value is the whole curve. @zh 当前 Spline 实例的某个结点索引，默认值为整条曲线。
     * @returns @en The points with `num` size at the `index` segment or the whole curve. @zh 曲线某段或者整条曲线上的 `num` 个点。
     */
    public getPoints (num: number, index: number = SPLINE_WHOLE_INDEX): Vec3[] {
        if (num === 0) {
            return [];
        }

        if (num === 1) {
            const point = this.getPoint(0.0, index);
            return [point];
        }

        const points: Vec3[] = [];
        const deltaT = 1.0 / (num - 1.0);

        for (let i = 0; i < num; i++) {
            const t     = i * deltaT;
            const point = this.getPoint(t, index);

            points.push(point);
        }

        return points;
    }

    // eslint-disable-next-line consistent-return
    private getSegments (): number {
        const count = this._knots.length;
        switch (this._mode) {
        case SplineMode.LINEAR:
        case SplineMode.CATMULL_ROM:
            if (count < 2) {
                warnID(14300);
                return 0;
            }

            return count - 1;
        case SplineMode.BEZIER:
            if (count < 4 || count % 4 !== 0) {
                warnID(14301);
                return 0;
            }

            return count / 4;
        default:
            assertID(false, 16407);
            return 0;
        }
    }

    private static calcLinear (v0: Vec3, v1: Vec3, t: number): Vec3 {
        const result = new Vec3();
        vec3MultiplyScalar(_v0, v0, (1.0 - t));
        vec3MultiplyScalar(_v1, v1, t);
        vec3Add(result, _v0, _v1);

        return result;
    }

    private static calcBezier (v0: Vec3, v1: Vec3, v2: Vec3, v3: Vec3, t: number): Vec3 {
        const result = new Vec3();
        const s = 1.0 - t;
        vec3MultiplyScalar(_v0, v0, s * s * s);
        vec3MultiplyScalar(_v1, v1, 3.0 * t * s * s);
        vec3MultiplyScalar(_v2, v2, 3.0 * t * t * s);
        vec3MultiplyScalar(_v3, v3, t * t * t);
        vec3Add(_v0, _v0, _v1);
        vec3Add(_v2, _v2, _v3);
        vec3Add(result, _v0, _v2);

        return result;
    }
    private static calcCatmullRom (v0: Vec3, v1: Vec3, v2: Vec3, v3: Vec3, t: number): Vec3 {
        const result = new Vec3();
        const t2 = t * t;
        const t3 = t2 * t;
        vec3MultiplyScalar(_v0, v0, -0.5 * t3 + t2 - 0.5 * t);
        vec3MultiplyScalar(_v1, v1, 1.5 * t3 - 2.5 * t2 + 1.0);
        vec3MultiplyScalar(_v2, v2, -1.5 * t3 + 2.0 * t2 + 0.5 * t);
        vec3MultiplyScalar(_v3, v3, 0.5 * t3 - 0.5 * t2);
        vec3Add(_v0, _v0, _v1);
        vec3Add(_v2, _v2, _v3);
        vec3Add(result, _v0, _v2);

        return result;
    }
}
