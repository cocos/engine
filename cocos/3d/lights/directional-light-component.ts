/*
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2020 Xiamen Yaji Software Co., Ltd.

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

/**
 * @packageDocumentation
 * @module component/light
 */

import { ccclass, help, executeInEditMode, menu, tooltip, unit, serializable, visible } from 'cc.decorator';
import { scene } from '../../core/renderer';
import { Light } from './light-component';
import { legacyCC } from '../../core/global-exports';

@ccclass('cc.DirectionalLight')
@help('i18n:cc.DirectionalLight')
@menu('Light/DirectionalLight')
@executeInEditMode
export class DirectionalLight extends Light {
    @serializable
    protected _illuminance = 65000;

    @serializable
    protected _illuminance_ldr = 1.0;

    protected _type = scene.LightType.DIRECTIONAL;
    protected _light: scene.DirectionalLight | null = null;

    /**
     * @en
     * The light source intensity.
     * @zh
     * 光源强度。
     */
    @tooltip('i18n:lights.illuminance')
    get illuminance () {
        const isHDR = (legacyCC.director.root as Root).pipeline.pipelineSceneData.isHDR;
        if(isHDR)
        {
            return this._illuminance;
        } else {
            return this._illuminance_ldr;
        }
    }
    set illuminance (val) {
        const isHDR = (legacyCC.director.root as Root).pipeline.pipelineSceneData.isHDR;
        if(isHDR)
        {
            this._illuminance = val;
        } else {
            this._illuminance_ldr = val;
        }

        if (this._light) { this._light.illuminance = val; }
    }

    protected _createLight () {
        super._createLight();
        if (!this._light) { return; }
        const isHDR = (legacyCC.director.root as Root).pipeline.pipelineSceneData.isHDR;
        this.illuminance = isHDR ? this._illuminance : this._illuminance_ldr;
    }
}
