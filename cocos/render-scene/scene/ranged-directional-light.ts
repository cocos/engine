/*
 Copyright (c) 2023 Xiamen Yaji Software Co., Ltd.
 https://www.cocos.com/
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

import { cclegacy } from '../../core';
import { Vec3 } from '../../core/math/vec3';
import { Ambient } from './ambient';
import { Light, LightType } from './light';

const _forward = new Vec3(0, 0, -1);

/**
 * @en Render the abstraction of light in the scene, which is a ranged directional light source in the scene. Non main light source,
 * each scene is allowed to have multiple ranged directional light sources without shadows.
 * @zh 渲染场景中的光的抽象，这是场景中的范围平行光光源。非主光源，每个场景允许有多个范围平行光光源，不包含阴影。
 */
export class RangedDirectionalLight extends Light {
    private _dir: Vec3 = new Vec3(0, 0, -1);
    private _pos: Vec3 = new Vec3(0, 0, 0);
    private _scale: Vec3 = new Vec3(1, 1, 1);
    private _right: Vec3 = new Vec3(1, 0, 0);
    private _illuminanceHDR: number = Ambient.SUN_ILLUM;
    private _illuminanceLDR = 1.0;

    /**
     * @en The direction vector of the light
     * @zh 光源的方向
     */
    get direction (): Readonly<Vec3> {
        return this._dir;
    }

    /**
     * @en The right vector of the light
     * @zh 光源的右方向
     */
    get right (): Readonly<Vec3> {
        return this._right;
    }

    /**
     * @en The world position of the light source
     * @zh 光源的世界坐标
     */
    get position (): Readonly<Vec3> {
        return this._pos;
    }

    /**
     * @en The world scale of the light source
     * @zh 光源的世界缩放
     */
    get scale (): Readonly<Vec3> {
        return this._scale;
    }

    /**
     * @en The illuminance of the light in Lux(lx)
     * @zh 光源的辐照度，单位是 Lux(lx)
     */
    get illuminance (): number {
        const isHDR = cclegacy.director.root.pipeline.pipelineSceneData.isHDR;
        if (isHDR) {
            return this._illuminanceHDR;
        } else {
            return this._illuminanceLDR;
        }
    }
    set illuminance (value: number) {
        const isHDR = cclegacy.director.root.pipeline.pipelineSceneData.isHDR;
        if (isHDR) {
            this.illuminanceHDR = value;
        } else {
            this.illuminanceLDR = value;
        }
    }

    /**
     * @en The illuminance of the light in HDR mode
     * @zh HDR 模式下光源的辐照度
     */
    get illuminanceHDR (): number {
        return this._illuminanceHDR;
    }
    set illuminanceHDR (value: number) {
        this._illuminanceHDR = value;
    }

    /**
     * @en The illuminance of the light in LDR mode
     * @zh LDR 模式下光源的辐照度
     */
    get illuminanceLDR (): number {
        return this._illuminanceLDR;
    }
    set illuminanceLDR (value: number) {
        this._illuminanceLDR = value;
    }

    constructor () {
        super();
        this._type = LightType.RANGED_DIRECTIONAL;
    }

    public initialize (): void {
        super.initialize();

        this.illuminance = Ambient.SUN_ILLUM;
    }

    /**
     * @en Update
     * @zh 更新
     */
    public update (): void {
        if (this._node && this._node.hasChangedFlags) {
            this._node.getWorldPosition(this._pos);
            this._node.getWorldScale(this._scale);
            Vec3.transformQuat(this._dir, _forward, this._node.worldRotation);
            Vec3.transformQuat(this._right, Vec3.RIGHT, this._node.worldRotation);
        }
    }
}
