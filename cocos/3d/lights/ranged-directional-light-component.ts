/*
 Copyright (c) 2023 Xiamen Yaji Software Co., Ltd.
 http://www.cocos2d-x.org
 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:
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

import { Light } from './light-component';
import { ccclass, help, property, menu, executeInEditMode, formerlySerializedAs, serializable,
    tooltip, editable, type } from '../../core/data/class-decorator';
import { Camera, LightType } from '../../render-scene/scene';
import { scene } from '../../render-scene';
import { CCInteger, cclegacy } from '../../core';
import { range } from '../../core/data/decorators';
import { getPipelineSceneData } from '../../rendering/pipeline-scene-data-utils';

/**
 * @en The ranged directional light component, Multiple ranged directional light sources are allowed in a scene.
 * @zh 范围平行光光源组件，一个场景允许存在多个范围平行光光源。
 */
@ccclass('cc.RangedDirectionalLight')
@help('i18n:cc.RangedDirectionalLight')
@menu('Light/RangedDirectionalLight')
@executeInEditMode
export class RangedDirectionalLight extends Light {
    @property
    @formerlySerializedAs('_illuminance')
    private _illuminanceHDR = 65000;

    @serializable
    private _illuminanceLDR = 65000 * Camera.standardExposureValue;

    /**
     * @en The light source intensity.
     * @zh 光源强度。
     */
    @tooltip('i18n:lights.illuminance')
    @editable
    @range([0, Number.POSITIVE_INFINITY, 10])
    @type(CCInteger)
    get illuminance (): number {
        const isHDR = getPipelineSceneData().isHDR;
        if (isHDR) {
            return this._illuminanceHDR;
        } else {
            return this._illuminanceLDR;
        }
    }
    set illuminance (val) {
        const isHDR = getPipelineSceneData().isHDR;
        if (isHDR) {
            this._illuminanceHDR = val;
            this._light && ((this._light as scene.RangedDirectionalLight).illuminanceHDR = this._illuminanceHDR);
        } else {
            this._illuminanceLDR = val;
            this._light && ((this._light as scene.RangedDirectionalLight).illuminanceLDR = this._illuminanceLDR);
        }
    }

    constructor () {
        super();
        this._lightType = scene.RangedDirectionalLight;
    }

    protected _createLight (): void {
        super._createLight();
        this._type = LightType.RANGED_DIRECTIONAL;
        if (this._light) {
            (this._light as scene.RangedDirectionalLight).illuminanceHDR = this._illuminanceHDR;
            (this._light as scene.RangedDirectionalLight).illuminanceLDR = this._illuminanceLDR;
        }
    }
}
