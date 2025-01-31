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

import { DEBUG } from 'internal:constants';
import { Mat3, Mat4, Quat, Vec3 } from '../math';
import { ShapeType } from './enums';
import { IVec3, IVec3Like } from '../math/type-define';
import { Sphere } from './sphere';
import { Frustum } from './frustum';
import { warn } from '../platform';

const _v3_tmp = new Vec3();
const _v3_tmp2 = new Vec3();
const _v3_tmp3 = new Vec3();
const _v3_tmp4 = new Vec3();
const _m3_tmp = new Mat3();

const mathAbs = Math.abs;

// https://zeuxcg.org/2010/10/17/aabb-from-obb-with-component-wise-abs/
const transform_extent_m4 = (out: Vec3, extent: Vec3, m4: Mat4 | Readonly<Mat4>): void => {
    _m3_tmp.m00 = mathAbs(m4.m00); _m3_tmp.m01 = mathAbs(m4.m01); _m3_tmp.m02 = mathAbs(m4.m02);
    _m3_tmp.m03 = mathAbs(m4.m04); _m3_tmp.m04 = mathAbs(m4.m05); _m3_tmp.m05 = mathAbs(m4.m06);
    _m3_tmp.m06 = mathAbs(m4.m08); _m3_tmp.m07 = mathAbs(m4.m09); _m3_tmp.m08 = mathAbs(m4.m10);
    Vec3.transformMat3(out, extent, _m3_tmp);
};

/**
  * @en
  * Basic Geometry: Axis-aligned bounding box, using center and half extents structure.
  * It's a fairly computationally and memory efficient way of checking whether two 3D objects might be touching.
  * @zh
  * 基础几何：轴对齐包围盒，使用中心点和半长宽高的结构。
  * 这是检查两个 3D 对象是否相交的一种在计算和内存上效率都相当高的方法。
  */

export class AABB {
    /**
      * @en
      * Creates a new AABB instance.
      * @zh
      * 创建一个新的 AABB 实例。
      * @param px @zh AABB 原点的 X 坐标。 @en The x coordinate of the origin of the AABB.
      * @param py @zh AABB 原点的 Y 坐标。 @en The y coordinate of the origin of the AABB.
      * @param pz @zh AABB 原点的 Z 坐标。 @en The z coordinate of the origin of the AABB.
      * @param hw @zh AABB 宽度的一半。 @en Half the width of the AABB.
      * @param hh @zh AABB 高度的一半。 @en Half the height of the AABB.
      * @param hl @zh AABB 长度的一半。 @en Half the length of the AABB.
      * @returns @zh 返回新创建的 AABB 实例。 @en A new instance of AABB.
      */
    public static create (px?: number, py?: number, pz?: number, hw?: number, hh?: number, hl?: number): AABB {
        return new AABB(px, py, pz, hw, hh, hl);
    }

    /**
      * @en
      * Clones an AABB, which will create a new AABB instance with the same value as the input parameter `a`. Note that each time `clone` is invoked,
      * a new AABB object will be created, so use `copy` method whenever it could to reduce GC pressure.
      * @zh
      * 克隆一个 AABB，其会创建出一个值跟输入参数`a`一样的 AABB 实例。注意，每次调用 `clone` 都会创建出新实例，尽可能使用 `copy` 方法以减小 GC 压力。
      * @param a @zh 克隆的目标。 @en The target object to be cloned.
      * @returns @zh 克隆出的 AABB 实例。@en The cloned AABB instance.
      * @deprecated since v3.8.4. Please use the corresponding instance method instead.
      */
    public static clone (a: AABB | Readonly<AABB>): AABB {
        // Put it in debug mode to reduce package size.
        if (DEBUG) {
            warn('The static method AABB.clone has been deprecated. Please use the corresponding instance method instead.');
        }

        return new AABB(
            a.center.x,
            a.center.y,
            a.center.z,
            a.halfExtents.x,
            a.halfExtents.y,
            a.halfExtents.z,
        );
    }

    /**
      * @en
      * Copies the values from one AABB to another, the process will not generate temporary objects.
      * @zh
      * 将一个 AABB 的值复制到另一个 AABB 中，此过程将不会产生临时对象。
      * @param out @zh 接受操作的 AABB。 @en The output AABB which is the copy destination.
      * @param a @zh 被复制的 AABB，此为只读参数。 @en The source object of the copy operation, it's readonly.
      * @returns @zh 接受操作的 AABB `out` 的引用。 @en The reference to the first parameter `out`.
      * @deprecated since v3.8.4. Please use the corresponding instance method instead.
      */
    public static copy (out: AABB, a: AABB | Readonly<AABB>): AABB {
        // Put it in debug mode to reduce package size.
        if (DEBUG) {
            warn('The static method AABB.copy has been deprecated. Please use the corresponding instance method instead.');
        }

        Vec3.copy(out.center, a.center);
        Vec3.copy(out.halfExtents, a.halfExtents);

        return out;
    }

    /**
      * @en
      * Constructs a new AABB from two corner points.
      * @zh
      * 从两个点创建一个新的 AABB。
      * @param out @zh 接受操作的 AABB。 @en The output AABB.
      * @param minPos @zh AABB 的最小点。 @en Minimum point of the AABB.
      * @param maxPos @zh AABB 的最大点。 @en Maximum point of the AABB.
      * @returns @zh 接受操作的 AABB `out` 的引用。 @en The reference to the first parameter `out`.
      */
    public static fromPoints (out: AABB, minPos: IVec3, maxPos: IVec3): AABB {
        Vec3.add(_v3_tmp, maxPos, minPos);
        Vec3.subtract(_v3_tmp2, maxPos, minPos);
        Vec3.multiplyScalar(out.center, _v3_tmp, 0.5);
        Vec3.multiplyScalar(out.halfExtents, _v3_tmp2, 0.5);
        return out;
    }

    /**
      * @en
      * Sets the components of a AABB to the given values.
      * @zh
      * 将 AABB 的属性设置为给定的值。
      * @param @zh out 接受操作的 AABB。 @en The output AABB to set.
      * @param px @zh - AABB 原点的 X 坐标。 @en The x coordinate of the origin of the AABB.
      * @param py @zh - AABB 原点的 Y 坐标。 @en The y coordinate of the origin of the AABB.
      * @param pz @zh - AABB 原点的 Z 坐标。 @en The z coordinate of the origin of the AABB.
      * @param hw @zh - AABB 宽度的一半。 @en Half the width of the AABB.
      * @param hh @zh - AABB 高度的一半。 @en Half the height of the AABB.
      * @param hl @zh - AABB 长度的一半。 @en Half the length of the AABB.
      * @returns @zh 接受操作的 AABB `out` 的引用。 @en The reference fo the first parameter `out`.
      */
    public static set (out: AABB, px: number, py: number, pz: number, hw: number, hh: number, hl: number): AABB {
        out.center.set(px, py, pz);
        out.halfExtents.set(hw, hh, hl);
        return out;
    }

    /**
      * @en
      * Merges two AABB instances into one.
      * @zh
      * 合并两个 AABB 到一个目标 AABB 中。
      * @param out @zh 接受操作的目标 AABB。 @en The output AABB to storage the merge result.
      * @param a @zh 第一个输入的 AABB，当其与 out 参数不同的时候，此函数内部不会修改其值。
      *          @en The first AABB to be merged, its value will not be modified if `a` is not equal to the `out` parameter.
      * @param b @zh 第二个输入的 AABB，当其与 out 参数不同的时候，此函数内部不会修改其值。
      *          @en The second AABB to be merged, its value will not be modified if `b` is not equal to the `out` parameter.
      * @returns @zh 接受操作的 AABB `out` 的引用。 @en The reference to the first parameter `out`.
      */
    public static merge (out: AABB, a: AABB | Readonly<AABB>, b: AABB | Readonly<AABB>): AABB {
        Vec3.subtract(_v3_tmp, a.center, a.halfExtents);
        Vec3.subtract(_v3_tmp2, b.center, b.halfExtents);
        Vec3.add(_v3_tmp3, a.center, a.halfExtents);
        Vec3.add(_v3_tmp4, b.center, b.halfExtents);
        Vec3.max(_v3_tmp4, _v3_tmp3, _v3_tmp4);
        Vec3.min(_v3_tmp3, _v3_tmp, _v3_tmp2);
        return AABB.fromPoints(out, _v3_tmp3, _v3_tmp4);
    }

    /**
      * @en
      * Converts an AABB to a bounding sphere.
      * @zh
      * 包围盒转包围球
      * @param out @zh 接受操作的包围球。 @en The output bounding sphere.
      * @param a @zh 输入的 AABB，只读参数。 @en The input AABB，it's readonly.
      * @returns @zh 接受操作的包围球 `out` 的引用. @en The reference to the first parameter `out`.
      */
    public static toBoundingSphere (out: Sphere, a: AABB | Readonly<AABB>): Sphere {
        out.center.set(a.center);
        out.radius = a.halfExtents.length();
        return out;
    }

    /**
      * @en
      * Transforms an AABB by a 4x4 matrix and stores the result to the `out` parameter.
      * @zh
      * 使用一个 4 乘 4 矩阵变换一个 AABB 并将结果存储于 out 参数中。
      * @param out @zh 接受操作的 AABB。 @en The output AABB to store the result.
      * @param a @zh 输入的源 AABB，如果其与 out 参数不是同一个对象，那么 a 将不会被此函数修改。
      *          @en The input AABB, if it's different with the `out` parameter, then `a` will not be changed by this function.
      * @param matrix @zh 矩阵。 @en The transformation matrix.
      * @returns @zh 接受操作的 AABB `out` 的引用。 @en The reference of the first parameter `out`.
      */
    public static transform (out: AABB, a: AABB | Readonly<AABB>, matrix: Mat4 | Readonly<Mat4>): AABB {
        Vec3.transformMat4(out.center, a.center, matrix);
        transform_extent_m4(out.halfExtents, a.halfExtents, matrix);
        return out;
    }

    /**
      * @en
      * The center point of this AABB.
      * @zh
      * 本地坐标的中心点。
      */
    public center: Vec3;

    /**
      * @en
      * Half the size of this AABB.
      * @zh
      * 长宽高的一半。
      */
    public halfExtents: Vec3;

    /**
      * @en
      * Gets the type of this shape.
      * @zh
      * 获取此形状的类型。
      */
    get type (): number {
        return this._type;
    }

    protected readonly _type: number;
    constructor (px = 0, py = 0, pz = 0, hw = 1, hh = 1, hl = 1) {
        this._type = ShapeType.SHAPE_AABB;

        this.center = new Vec3(px, py, pz);
        this.halfExtents = new Vec3(hw, hh, hl);
    }

    /**
      * @en
      * Gets the bounding points of this AABB.
      * @zh
      * 获取此 AABB 的最小点和最大点。
      * @param minPos @zh 存放此 AABB 最小点的向量。 @en The minimum position of the AABB to be stored to.
      * @param maxPos @zh 存放此 AABB 最大点的向量。 @en The maximum position of the AABB to be stored to.
      */
    public getBoundary (minPos: IVec3Like, maxPos: IVec3Like): void {
        Vec3.subtract(minPos, this.center, this.halfExtents);
        Vec3.add(maxPos, this.center, this.halfExtents);
    }

    /**
      * @en
      * Transforms this AABB by a 4x4 matrix and stores the result to `out` parameter
      * @zh
      * 使用 4 乘 4 矩阵变换此 AABB 并将结果存储于 `out` 参数中。
      * @param m @zh 变换的矩阵。 @en The transform matrix.
      * @param pos @zh 变换的位置部分。 @en 3d-vector translation.
      * @param rot @zh 变换的旋转部分。 @en Quaternion rotation.
      * @param scale @zh 变换的缩放部分。 @en 3d-vector scale.
      * @param out @zh 存储结果的 AABB。 @en The output AABB.
      */
    public transform (m: Mat4, pos: Vec3 | null, rot: Quat | null, scale: Vec3 | null, out: AABB): void {
        Vec3.transformMat4(out.center, this.center, m);
        transform_extent_m4(out.halfExtents, this.halfExtents, m);
    }

    /**
      * @en
      * Clones this AABB, which will create a new AABB instance with the same value as this AABB. Note that each time `clone` is invoked,
      * a new AABB object will be created, so use `copy` method whenever it could to reduce GC pressure.
      * @zh
      * 克隆一个 AABB，其会创建出一个值跟当前 AABB 一样的实例。注意，每次调用 `clone` 都会创建出新实例，尽可能使用 `copy` 方法以减小 GC 压力。
      * @returns @zh 克隆出的 AABB 实例 @en The cloned AABB instance.
      */
    public clone (): AABB {
        const center = this.center;
        const halfExtents = this.halfExtents;
        return new AABB(
            center.x,
            center.y,
            center.z,
            halfExtents.x,
            halfExtents.y,
            halfExtents.z,
        );
    }

    /**
      * @en
      * Copies the values from one AABB to this AABB, the process will not generate temporary objects.
      * @zh
      * 将一个 AABB 的值复制到当前 AABB 中，此过程将不会产生临时对象。
      * @param a @zh 被复制的 AABB，此为只读参数。 @en The source object of the copy operation, it's readonly.
      * @returns @zh 当前 AABB 的引用。 @en The reference of this AABB.
      */
    public copy (a: AABB | Readonly<AABB>): AABB {
        Vec3.copy(this.center, a.center);
        Vec3.copy(this.halfExtents, a.halfExtents);
        return this;
    }

    /**
      * @en Merges a point to this AABB.
      * @zh 合并一个顶点到当前 AABB 中。
      * @param point @zh 3D 世界中某一个位置的顶点。 @en A point in 3D space.
      */
    public mergePoint (point: IVec3): void {
        // _v3_tmp is min pos
        // _v3_tmp2 is max pos
        this.getBoundary(_v3_tmp, _v3_tmp2);
        if (point.x < _v3_tmp.x) { _v3_tmp.x = point.x; }
        if (point.y < _v3_tmp.y) { _v3_tmp.y = point.y; }
        if (point.z < _v3_tmp.z) { _v3_tmp.z = point.z; }
        if (point.x > _v3_tmp2.x) { _v3_tmp2.x = point.x; }
        if (point.y > _v3_tmp2.y) { _v3_tmp2.y = point.y; }
        if (point.z > _v3_tmp2.z) { _v3_tmp2.z = point.z; }

        // _v3_tmp3 is center pos
        Vec3.add(_v3_tmp3, _v3_tmp, _v3_tmp2);
        this.center.set(Vec3.multiplyScalar(_v3_tmp3, _v3_tmp3, 0.5));
        this.halfExtents.set(_v3_tmp2.x - _v3_tmp3.x, _v3_tmp2.y - _v3_tmp3.y, _v3_tmp2.z - _v3_tmp3.z);
    }

    /**
      * @en Merges some points to this AABB.
      * @zh 合并一系列顶点到当前 AABB 中。
      * @param points @zh 3D 世界中的顶点列表。 @en A list of points in 3D space.
      */
    public mergePoints (points: IVec3[]): void {
        if (points.length < 1) { return; }
        for (let i = 0; i < points.length; i++) {
            this.mergePoint(points[i]);
        }
    }

    /**
      * @en Merges all points in a frustum to this AABB.
      * @zh 合并一个截头锥体的所有顶点到此 AABB 中。
      * @param frustum @zh 输入的截头锥体 @en The frustum object.
      */
    public mergeFrustum (frustum: Frustum | Readonly<Frustum>): void {
        this.mergePoints(frustum.vertices);
    }
}
