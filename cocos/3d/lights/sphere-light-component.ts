/*
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.

 http://www.cocos2d-x.org

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

import { ccclass, help, executeInEditMode, menu, tooltip, type, displayOrder, serializable, formerlySerializedAs,
    editable, slide, rangeMin, range } from 'cc.decorator';
import { scene } from '../../render-scene';
import { Light, PhotometricTerm } from './light-component';
import { CCFloat, CCInteger, cclegacy } from '../../core';
import { Camera } from '../../render-scene/scene';
import { getPipelineSceneData } from '../../rendering/pipeline-scene-data-utils';

/**
 * @en The sphere light component, multiple sphere lights can be added to one scene.
 * @zh 球面光源组件，场景中可以添加多个球面光源。
 */
@ccclass('cc.SphereLight')
@help('i18n:cc.SphereLight')
@menu('Light/SphereLight')
@executeInEditMode
export class SphereLight extends Light {
    @serializable
    private _size = 0.15;
    @serializable
    @formerlySerializedAs('_luminance')
    private _luminanceHDR = 1700 / scene.nt2lm(0.15);
    @serializable
    private _luminanceLDR = 1700 / scene.nt2lm(0.15) * Camera.standardExposureValue * Camera.standardLightMeterScale;
    @serializable
    private _term = PhotometricTerm.LUMINOUS_FLUX;
    @serializable
    private _range = 1;

    /**
     * @en Luminous flux of the light.
     * @zh 光通量。
     */
    @displayOrder(-1)
    @tooltip('i18n:lights.luminous_flux')
    @editable
    @range([0, Number.POSITIVE_INFINITY, 100])
    @type(CCInteger)
    get luminousFlux (): number {
        const isHDR = getPipelineSceneData().isHDR;
        if (isHDR) {
            return this._luminanceHDR * scene.nt2lm(this._size);
        } else {
            return this._luminanceLDR;
        }
    }
    set luminousFlux (val) {
        const isHDR = getPipelineSceneData().isHDR;
        let result = 0;
        if (isHDR) {
            this._luminanceHDR = val / scene.nt2lm(this._size);
            result = this._luminanceHDR;
        } else {
            this._luminanceLDR = val;
            result = this._luminanceLDR;
        }
        this._light && ((this._light as scene.SphereLight).luminance = result);
    }

    /**
     * @en Luminance of the light.
     * @zh 光亮度。
     */
    @displayOrder(-1)
    @tooltip('i18n:lights.luminance')
    @editable
    @range([0, Number.POSITIVE_INFINITY, 10])
    @type(CCInteger)
    get luminance (): number {
        const isHDR = getPipelineSceneData().isHDR;
        if (isHDR) {
            return this._luminanceHDR;
        } else {
            return this._luminanceLDR;
        }
    }
    set luminance (val) {
        const isHDR = getPipelineSceneData().isHDR;
        if (isHDR) {
            this._luminanceHDR = val;
            this._light && ((this._light as scene.SphereLight).luminanceHDR = this._luminanceHDR);
        } else {
            this._luminanceLDR = val;
            this._light && ((this._light as scene.SphereLight).luminanceLDR = this._luminanceLDR);
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
    get term (): number {
        return this._term;
    }
    set term (val) {
        this._term = val;
    }

    /**
     * @en
     * Size of the light.
     * @zh
     * 光源大小。
     */
    @tooltip('i18n:lights.size')
    @editable
    @slide
    @range([0.0, 10.0, 0.001])
    @type(CCFloat)
    get size (): number {
        return this._size;
    }
    set size (val) {
        this._size = val;
        if (this._light) { (this._light as scene.SphereLight).size = val; }
    }

    /**
     * @en
     * Range of the light.
     * @zh
     * 光源范围。
     */
    @tooltip('i18n:lights.range')
    @editable
    @rangeMin(0)
    @type(CCFloat)
    get range (): number {
        return this._range;
    }
    set range (val) {
        this._range = val;
        if (this._light) { (this._light as scene.SphereLight).range = val; }
    }

    constructor () {
        super();
        this._lightType = scene.SphereLight;
    }

    protected _createLight (): void {
        super._createLight();
        this._type = scene.LightType.SPHERE;
        this.size = this._size;
        this.range = this._range;

        if (this._light) {
            (this._light as scene.SphereLight).luminanceHDR = this._luminanceHDR;
            (this._light as scene.SphereLight).luminanceLDR = this._luminanceLDR;
        }
    }
}
