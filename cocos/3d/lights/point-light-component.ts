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

import { ccclass, help, executeInEditMode, menu, tooltip, type, displayOrder,
    serializable, formerlySerializedAs, editable, rangeMin, slide } from 'cc.decorator';
import { scene } from '../../render-scene';
import { Camera } from '../../render-scene/scene';
import { Light, PhotometricTerm } from './light-component';
import { CCFloat, CCInteger, cclegacy } from '../../core';

/**
 * @en The point light component, multiple point lights can be added to one scene.
 * @zh 点光源组件，场景中可以添加多个点光源。
 */
@ccclass('cc.PointLight')
@help('i18n:cc.PointLight')
@menu('Light/PointLight')
@executeInEditMode
export class PointLight extends Light {
    @serializable
    @formerlySerializedAs('_luminance')
    private _luminanceHDR = 1700 / scene.nt2lm(0.15);
    @serializable
    private _luminanceLDR = 1700 / scene.nt2lm(0.15) * Camera.standardExposureValue * Camera.standardLightMeterScale;
    @serializable
    private _term = PhotometricTerm.LUMINOUS_FLUX;
    @serializable
    private _range = 1;

    protected _type = scene.LightType.POINT;
    protected _light: scene.PointLight | null = null;

    /**
     * @en Luminous flux of the light.
     * @zh 光通量。
     */
    @displayOrder(-1)
    @tooltip('i18n:lights.luminous_flux')
    @editable
    @rangeMin(0)
    @slide
    @type(CCInteger)
    get luminousFlux () {
        const isHDR = cclegacy.director.root.pipeline.pipelineSceneData.isHDR;
        if (isHDR) {
            return this._luminanceHDR * scene.nt2lm(1.0);
        } else {
            return this._luminanceLDR;
        }
    }
    set luminousFlux (val) {
        const isHDR = cclegacy.director.root.pipeline.pipelineSceneData.isHDR;
        let result = 0;
        if (isHDR) {
            this._luminanceHDR = val / scene.nt2lm(1.0);
            result = this._luminanceHDR;
        } else {
            this._luminanceLDR = val;
            result = this._luminanceLDR;
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        this._light && (this._light.luminance = result);
    }

    /**
     * @en Luminance of the light.
     * @zh 光亮度。
     */
    @displayOrder(-1)
    @tooltip('i18n:lights.luminance')
    @editable
    @rangeMin(0)
    @slide
    @type(CCInteger)
    get luminance () {
        const isHDR = cclegacy.director.root.pipeline.pipelineSceneData.isHDR;
        if (isHDR) {
            return this._luminanceHDR;
        } else {
            return this._luminanceLDR;
        }
    }
    set luminance (val) {
        const isHDR = cclegacy.director.root.pipeline.pipelineSceneData.isHDR;
        if (isHDR) {
            this._luminanceHDR = val;
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            this._light && (this._light.luminanceHDR = this._luminanceHDR);
        } else {
            this._luminanceLDR = val;
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            this._light && (this._light.luminanceLDR = this._luminanceLDR);
        }
    }

    /**
     * @en The photometric term currently being used.
     * @zh 当前使用的光度学计量单位。
     */
    @type(PhotometricTerm)
    @displayOrder(-2)
    @tooltip('i18n:lights.term')
    @editable
    @rangeMin(0)
    @slide
    @type(CCInteger)
    get term (): number {
        return this._term;
    }
    set term (val) {
        this._term = val;
    }

    /**
     * @en Range of the light.
     * @zh 光源范围。
     */
    @tooltip('i18n:lights.range')
    @editable
    @rangeMin(0)
    @slide
    @type(CCFloat)
    get range () {
        return this._range;
    }
    set range (val) {
        this._range = val;
        if (this._light) { this._light.range = val; }
    }

    constructor () {
        super();
        this._lightType = scene.PointLight;
    }

    protected _createLight () {
        super._createLight();
        this.range = this._range;

        if (this._light) {
            this._light.luminanceHDR = this._luminanceHDR;
            this._light.luminanceLDR = this._luminanceLDR;
        }
    }
}
