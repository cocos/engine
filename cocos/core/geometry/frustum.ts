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

import { Mat4, v3, Vec3 } from '../math';
import { ShapeType } from './enums';
import { Plane } from './plane';
import { AABB } from './aabb';

const _v = new Array<Vec3>(8);
_v[0] = v3(1, 1, 1);
_v[1] = v3(-1, 1, 1);
_v[2] = v3(-1, -1, 1);
_v[3] = v3(1, -1, 1);
_v[4] = v3(1, 1, -1);
_v[5] = v3(-1, 1, -1);
_v[6] = v3(-1, -1, -1);
_v[7] = v3(1, -1, -1);

const _nearTemp = v3();
const _farTemp = v3();
const _temp_v3 = v3();

const planeFromPoints = Plane.fromPoints;
const vec3Set = Vec3.set;
const vec3TransformMat4 = Vec3.transformMat4;
/**
 * @en
 * Basic Geometry: frustum.
 * @zh
 * 基础几何：视锥体。
 */
export class Frustum {
    /**
     * @en Creates an orthographic frustum.
     * @zh 创建一个正交视锥体。
     * @param out @en The result orthographic frustum. @zh 输出的正交视锥体。
     * @param width @en The width of the frustum. @zh 正交视锥体的宽度。
     * @param height @en The height of the frustum. @zh 正交视锥体的高度。
     * @param near @en The near plane of the frustum. @zh 正交视锥体的近平面值。
     * @param far @en The far plane of the frustum. @zh 正交视锥体的远平面值。
     * @param transform @en The transform matrix of the frustum. @zh 正交视锥体的变换矩阵。
     * @returns @en The result frustum, same as the `out` parameter. @zh 存储结果的视锥体，与 `out` 参数为同一个对象。
     */
    public static createOrthographic (out: Frustum, width: number, height: number, near: number, far: number, transform: Mat4): void {
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        vec3Set(_temp_v3, halfWidth, halfHeight, -near);
        vec3TransformMat4(out.vertices[0], _temp_v3, transform);
        vec3Set(_temp_v3, -halfWidth, halfHeight, -near);
        vec3TransformMat4(out.vertices[1], _temp_v3, transform);
        vec3Set(_temp_v3, -halfWidth, -halfHeight, -near);
        vec3TransformMat4(out.vertices[2], _temp_v3, transform);
        vec3Set(_temp_v3, halfWidth, -halfHeight, -near);
        vec3TransformMat4(out.vertices[3], _temp_v3, transform);
        vec3Set(_temp_v3, halfWidth, halfHeight, -far);
        vec3TransformMat4(out.vertices[4], _temp_v3, transform);
        vec3Set(_temp_v3, -halfWidth, halfHeight, -far);
        vec3TransformMat4(out.vertices[5], _temp_v3, transform);
        vec3Set(_temp_v3, -halfWidth, -halfHeight, -far);
        vec3TransformMat4(out.vertices[6], _temp_v3, transform);
        vec3Set(_temp_v3, halfWidth, -halfHeight, -far);
        vec3TransformMat4(out.vertices[7], _temp_v3, transform);

        out.updatePlanes();
    }

    /**
     * @en Creates an orthographic frustum.
     * @zh 创建一个正交视锥体。
     * @param out @en The result orthographic frustum. @zh 输出的正交视锥体。
     * @param width @en The width of the frustum. @zh 正交视锥体的宽度。
     * @param height @en The height of the frustum. @zh 正交视锥体的高度。
     * @param near @en The near plane of the frustum. @zh 正交视锥体的近平面值。
     * @param far @en The far plane of the frustum. @zh 正交视锥体的远平面值。
     * @param transform @en The transform matrix of the frustum. @zh 正交视锥体的变换矩阵。
     * @returns @en The result frustum, same as the `out` parameter. @zh 存储结果的视锥体，与 `out` 参数为同一个对象。
     *
     * @deprecated since v3.8.0, please use [[createOrthographic]] instead.
     */
    public static createOrtho (out: Frustum, width: number, height: number, near: number, far: number, transform: Mat4): void {
        return Frustum.createOrthographic(out, width, height, near, far, transform);
    }

    /**
     * @en Creates a perspective frustum.
     * @zh 创建一个透视视锥体。
     * @param aspect @en The aspect ratio of the camera. @zh 相机视图的长宽比。
     * @param fov @en The field of view of the camera. @zh 相机的视角大小。
     * @param near @en The near plane of the frustum. @zh 视锥体的近平面值。
     * @param far @en The far plane of the frustum. @zh 视锥体的远平面值。
     * @param transform @en The transform matrix. @zh 变换矩阵。
     * @returns @en The result frustum, same as the `out` parameter. @zh 存储结果的视锥体，与 `out` 参数为同一个对象。
     */
    public static createPerspective (out: Frustum, aspect: number, fov: number, near: number, far: number, transform: Mat4): void {
        const h = Math.tan(fov * 0.5);
        const w = h * aspect;
        _nearTemp.set(near * w,  near * h, near);
        _farTemp.set(far * w, far * h, far);

        const vertexes = out.vertices;
        // startHalfWidth startHalfHeight
        _temp_v3.set(_nearTemp.x, _nearTemp.y, -_nearTemp.z);
        vec3TransformMat4(vertexes[0], _temp_v3, transform);
        _temp_v3.set(-_nearTemp.x, _nearTemp.y, -_nearTemp.z);
        vec3TransformMat4(vertexes[1], _temp_v3, transform);
        _temp_v3.set(-_nearTemp.x, -_nearTemp.y, -_nearTemp.z);
        vec3TransformMat4(vertexes[2], _temp_v3, transform);
        _temp_v3.set(_nearTemp.x, -_nearTemp.y, -_nearTemp.z);
        vec3TransformMat4(vertexes[3], _temp_v3, transform);

        // endHalfWidth, endHalfHeight
        _temp_v3.set(_farTemp.x, _farTemp.y, -_farTemp.z);
        vec3TransformMat4(vertexes[4], _temp_v3, transform);
        _temp_v3.set(-_farTemp.x, _farTemp.y, -_farTemp.z);
        vec3TransformMat4(vertexes[5], _temp_v3, transform);
        _temp_v3.set(-_farTemp.x, -_farTemp.y, -_farTemp.z);
        vec3TransformMat4(vertexes[6], _temp_v3, transform);
        _temp_v3.set(_farTemp.x, -_farTemp.y, -_farTemp.z);
        vec3TransformMat4(vertexes[7], _temp_v3, transform);

        out.updatePlanes();
    }

    /**
     * @en Creates a frustum from an AABB instance.
     * @zh 根据一个 AABB 实例创建一个视锥体。
     * @param out @en The result frustum. @zh 输出的视锥体对象。
     * @param aabb @en The AABB to create the result frustum. @zh 用于创建视锥体 AABB。
     * @returns @en The result frustum, same as the `out` parameter. @zh 存储结果的视锥体，与 `out` 参数为同一个对象。
     *
     * @deprecated since v3.8.0, please use [[createOrthographic]] instead.
     */
    public static createFromAABB (out: Frustum, aabb: AABB | Readonly<AABB>): Frustum {
        const vec3_min = new Vec3(); const vec3_max = new Vec3();
        Vec3.subtract(vec3_min, aabb.center, aabb.halfExtents);
        Vec3.add(vec3_max, aabb.center, aabb.halfExtents);

        const vertices = out.vertices;

        vertices[0].set(vec3_max.x, vec3_max.y, -vec3_min.z);
        vertices[1].set(vec3_min.x, vec3_max.y, -vec3_min.z);
        vertices[2].set(vec3_min.x, vec3_min.y, -vec3_min.z);
        vertices[3].set(vec3_max.x, vec3_min.y, -vec3_min.z);
        vertices[4].set(vec3_max.x, vec3_max.y, -vec3_max.z);
        vertices[5].set(vec3_min.x, vec3_max.y, -vec3_max.z);
        vertices[6].set(vec3_min.x, vec3_min.y, -vec3_max.z);
        vertices[7].set(vec3_max.x, vec3_min.y, -vec3_max.z);

        out.updatePlanes();

        return out;
    }

    /**
     * @en Calculates a split frustum.
     * @zh 计算出一个分割的视锥体。
     * @param start @en The split start position. @zh 分割开始位置。
     * @param end @en The split end position. @zh 分割末尾位置。
     * @param aspect @en The aspect ratio of the camera. @zh 相机视图的长宽比。
     * @param fov @en The field of view of the camera. @zh 相机的视角大小。
     * @param m @en The transform matrix. @zh 变换矩阵。
     *
     * @deprecated since v3.8.0, please use [[createPerspective]] instead.
     */
    public split (start: number, end: number, aspect: number, fov: number, m: Mat4): void {
        return Frustum.createPerspective(this, aspect, fov, start, end, m);
    }

    /**
     * @en
     * Creates a new frustum.
     * @zh
     * 创建一个新的视椎体。
     * @returns @en An empty frustum. @zh 一个空视椎体。
     */
    public static create (): Frustum {
        return new Frustum();
    }

    /**
     * @en
     * Clones a frustum.
     * @zh
     * 克隆一个视椎体。
     * @param f @en The frustum to clone from. @zh 用于克隆的视椎体。
     * @return @en The cloned frustum. @zh 克隆出的新视椎体。
     */
    public static clone (f: Frustum): Frustum {
        return Frustum.copy(new Frustum(), f);
    }

    /**
     * @en
     * Copies the values from one frustum to another.
     * @zh
     * 从一个视锥体拷贝到另一个视锥体。
     * @param out @en The result frustum @zh 用于存储拷贝数据的截锥体
     * @param f @en The frustum to copy from @zh 用于克隆的截锥体
     * @returns @en The result frustum, same as the `out` parameter. @zh 存储结果的视锥体，与 `out` 参数为同一个对象。
     */
    public static copy (out: Frustum, f: Readonly<Frustum>): Frustum {
        out._type = f.type;
        for (let i = 0; i < 6; ++i) {
            Plane.copy(out.planes[i], f.planes[i]);
        }
        for (let i = 0; i < 8; ++i) {
            Vec3.copy(out.vertices[i], f.vertices[i]);
        }
        return out;
    }

    /**
     * @en
     * Sets whether to use accurate intersection testing function on this frustum.
     * @zh
     * 设置是否在此截锥体上使用精确的相交测试函数。
     *
     * @deprecated since v3.8.0 no need to set accurate flag since it doesn't affect the calculation at all.
     */
    set accurate (b: boolean) {
        this._type = b ? ShapeType.SHAPE_FRUSTUM_ACCURATE : ShapeType.SHAPE_FRUSTUM;
    }

    /**
     * @en
     * Gets the type of the shape. The value may be `ShapeType.SHAPE_FRUSTUM_ACCURATE` or `ShapeType.SHAPE_FRUSTUM`.
     * @zh
     * 获取形状的类型。值可能为 `ShapeType.SHAPE_FRUSTUM_ACCURATE` 或 `ShapeType.SHAPE_FRUSTUM`。
     * @readonly
     */
    get type (): number {
        return this._type;
    }

    /**
     * @en
     * The 6 planes of the frustum.
     * @zh
     * 视椎体的 6 个面。
     */
    public planes: Plane[];

    /**
     * @en
     * The 8 vertices of the frustum.
     * @zh
     * 视椎体的 8 个顶点。
     */
    public vertices: Vec3[];

    protected _type: number;

    constructor () {
        this._type = ShapeType.SHAPE_FRUSTUM;
        this.planes = new Array(6);
        for (let i = 0; i < 6; ++i) {
            this.planes[i] = Plane.create(0, 0, 0, 0);
        }
        this.vertices = new Array(8);
        for (let i = 0; i < 8; ++i) {
            this.vertices[i] = new Vec3();
        }
    }

    /**
     * @en
     * Updates the frustum information according to the given transform matrix.
     * Note that the resulting planes are not normalized under normal mode.
     * @zh
     * 根据给定的变换矩阵更新截锥体信息，注意得到的平面不是在标准模式下归一化的。
     * @param m @en The view-projection matrix. @zh 视图投影矩阵。
     * @param inv @en The inverse view-projection matrix. @zh 视图投影逆矩阵。
     */
    public update (m: Mat4, inv: Mat4): void {
        const planes = this.planes;
        // RTR4, ch. 22.14.1, p. 983
        // extract frustum planes from view-proj matrix.

        // left plane
        vec3Set(planes[0].n, m.m03 + m.m00, m.m07 + m.m04, m.m11 + m.m08);
        planes[0].d = -(m.m15 + m.m12);
        // right plane
        vec3Set(planes[1].n, m.m03 - m.m00, m.m07 - m.m04, m.m11 - m.m08);
        planes[1].d = -(m.m15 - m.m12);
        // bottom plane
        vec3Set(planes[2].n, m.m03 + m.m01, m.m07 + m.m05, m.m11 + m.m09);
        planes[2].d = -(m.m15 + m.m13);
        // top plane
        vec3Set(planes[3].n, m.m03 - m.m01, m.m07 - m.m05, m.m11 - m.m09);
        planes[3].d = -(m.m15 - m.m13);
        // near plane
        vec3Set(planes[4].n, m.m03 + m.m02, m.m07 + m.m06, m.m11 + m.m10);
        planes[4].d = -(m.m15 + m.m14);
        // far plane
        vec3Set(planes[5].n, m.m03 - m.m02, m.m07 - m.m06, m.m11 - m.m10);
        planes[5].d = -(m.m15 - m.m14);

        // normalize planes
        for (let i = 0; i < 6; i++) {
            const pl = planes[i];
            const invDist = 1 / pl.n.length();
            Vec3.multiplyScalar(pl.n, pl.n, invDist);
            pl.d *= invDist;
        }

        // update frustum vertices
        for (let i = 0; i < 8; i++) {
            vec3TransformMat4(this.vertices[i], _v[i], inv);
        }
    }

    /**
     * @en
     * Transforms this frustum.
     * @zh
     * 变换此视锥体。
     * @param mat @en The transform matrix. @zh 变换矩阵。
     */
    public transform (mat: Mat4): void {
        for (let i = 0; i < 8; i++) {
            vec3TransformMat4(this.vertices[i], this.vertices[i], mat);
        }
        this.updatePlanes();
    }

    /**
     * @en Makes the frustum empty, all vertices will be zero values.
     * @zh 置空此视锥体，所有顶点将被赋值为 0。
     */
    public zero (): void {
        // reset to initial state
        for (let i = 0; i < 8; i++) {
            this.vertices[i].set(0.0, 0.0, 0.0);
        }
        for (let i = 0; i < 6; i++) {
            Plane.set(this.planes[i], 0, 0, 0, 0);
        }
    }

    /**
     * @en Updates all six planes of the frustum.
     * @zh 更新视锥体的所有面数据。
     */
    public updatePlanes (): void {
        const planes = this.planes;
        const vertices = this.vertices;
        // left plane
        planeFromPoints(planes[0], vertices[1], vertices[6], vertices[5]);
        // right plane
        planeFromPoints(planes[1], vertices[3], vertices[4], vertices[7]);
        // bottom plane
        planeFromPoints(planes[2], vertices[6], vertices[3], vertices[7]);
        // top plane
        planeFromPoints(planes[3], vertices[0], vertices[5], vertices[4]);
        // near plane
        planeFromPoints(planes[4], vertices[2], vertices[0], vertices[3]);
        // far plane
        planeFromPoints(planes[5], vertices[7], vertices[5], vertices[6]);
    }
}
