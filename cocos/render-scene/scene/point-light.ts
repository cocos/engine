/*
 Copyright (c) 2023 Xiamen Yaji Software Co., Ltd.

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

import { cclegacy, geometry, v3, Vec3 } from '../../core';
import { AABB } from '../../core/geometry';
import { getPipelineSceneData } from '../../rendering/pipeline-scene-data-utils';
import { Light, LightType, nt2lm } from './light';

/**
 * @en The point light representation in the render scene, it will light up a spherical area in the scene.
 * It doesn't support shadow generation currently.
 * @zh 渲染场景中的点光抽象，可以照亮场景中的一个球形区域，目前还不支持生成阴影。
 */
export class PointLight extends Light {
    /**
     * @en The world position of the light source.
     * @zh 光源中心点的世界坐标。
     */
    get position (): Readonly<Vec3> {
        return this._pos;
    }

    /**
     * @en The lighting range of the light source.
     * @zh 点光源的光照范围。
     */
    set range (range: number) {
        this._range = range;

        this._needUpdate = true;
    }

    get range (): number {
        return this._range;
    }

    /**
     * @en The luminance of the light source.
     * @zh 光源的亮度。
     */
    get luminance (): number {
        const isHDR = getPipelineSceneData().isHDR;
        if (isHDR) {
            return this._luminanceHDR;
        } else {
            return this._luminanceLDR;
        }
    }
    set luminance (value: number) {
        const isHDR = getPipelineSceneData().isHDR;
        if (isHDR) {
            this.luminanceHDR = value;
        } else {
            this.luminanceLDR = value;
        }
    }

    /**
     * @en The luminance of the light source in HDR mode.
     * @zh HDR 模式下光源的亮度。
     */
    get luminanceHDR (): number {
        return this._luminanceHDR;
    }
    set luminanceHDR (value: number) {
        this._luminanceHDR = value;
    }

    /**
     * @en The luminance of the light source in LDR mode.
     * @zh LDR 模式下光源的亮度。
     */
    set luminanceLDR (value: number) {
        this._luminanceLDR = value;
    }

    /**
     * @en The AABB bounding box of the lighting area.
     * @zh 受光源影响范围的 AABB 包围盒。
     */
    get aabb (): geometry.AABB {
        return this._aabb;
    }

    private _needUpdate = false;
    private _range = 1.0;
    private _luminanceHDR = 0;
    private _luminanceLDR = 0;
    private _pos: Vec3 = v3();
    private _aabb: AABB = AABB.create();

    constructor () {
        super();
        this._type = LightType.POINT;
    }

    public initialize (): void {
        super.initialize();

        this.range = 1.0;
        this.luminanceHDR = 1700 / nt2lm(1.0);
        this.luminanceLDR = 1.0;
    }

    /**
     * @en Update the lighting area.
     * @zh 更新光源影响范围。
     */
    public update (): void {
        if (this._node && (this._node.hasChangedFlags || this._needUpdate)) {
            this._node.getWorldPosition(this._pos);
            const range = this._range;
            AABB.set(this._aabb, this._pos.x, this._pos.y, this._pos.z, range, range, range);
            this._needUpdate = false;
        }
    }
}
