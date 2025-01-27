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

import { Light } from './light-component';
import { scene } from '../../render-scene';
import { clamp, warnID, CCBoolean, CCFloat, _decorator, settings, CCInteger, SettingsCategory } from '../../core';
import { Camera, PCFType, Shadows, ShadowType, CSMOptimizationMode, CSMLevel } from '../../render-scene/scene';
import { Root } from '../../root';
import { MeshRenderer } from '../framework/mesh-renderer';
import { getPipelineSceneData } from '../../rendering/pipeline-scene-data-utils';

const { ccclass, menu, executeInEditMode, property, serializable, formerlySerializedAs, tooltip, help,
    visible, type, editable, slide, range } = _decorator;

/**
 * @en The directional light component, only one real time directional light is permitted in one scene, it act as the main light of the scene.
 * @zh 平行光源组件，一个场景只允许存在一个实时的平行光源，作为场景的主光源存在。
 */
@ccclass('cc.DirectionalLight')
@help('i18n:cc.DirectionalLight')
@menu('Light/DirectionalLight')
@executeInEditMode
export class DirectionalLight extends Light {
    @property
    @formerlySerializedAs('_illuminance')
    private _illuminanceHDR = 65000;

    @serializable
    private _illuminanceLDR = 65000 * Camera.standardExposureValue;

    // Public properties of shadow
    @serializable
    private _shadowEnabled = false;

    // Shadow map properties
    @serializable
    private _shadowPcf = PCFType.HARD;
    @serializable
    private _shadowBias = 0.00001;
    @serializable
    private _shadowNormalBias = 0.0;
    @serializable
    private _shadowSaturation = 1.0;
    @serializable
    private _shadowDistance = 50;
    @serializable
    private _shadowInvisibleOcclusionRange = 200;
    @serializable
    private _csmLevel = CSMLevel.LEVEL_4;
    @serializable
    private _csmLayerLambda = 0.75;
    @serializable
    private _csmOptimizationMode = CSMOptimizationMode.RemoveDuplicates;

    @serializable
    private _csmAdvancedOptions = false;
    @serializable
    private _csmLayersTransition = false;
    @serializable
    private _csmTransitionRange = 0.05;

    // fixed area properties
    @serializable
    private _shadowFixedArea = false;
    @serializable
    private _shadowNear = 0.1;
    @serializable
    private _shadowFar = 10.0;
    @serializable
    private _shadowOrthoSize = 5;

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
            this._light && ((this._light as scene.DirectionalLight).illuminanceHDR = this._illuminanceHDR);
        } else {
            this._illuminanceLDR = val;
            this._light && ((this._light as scene.DirectionalLight).illuminanceLDR = this._illuminanceLDR);
        }
    }

    /**
     * @en Whether activate real time shadow.
     * @zh 是否启用实时阴影？
     */
    @tooltip('i18n:lights.shadowEnabled')
    @visible(() => getPipelineSceneData().shadows.enabled
    && getPipelineSceneData().shadows.type === ShadowType.ShadowMap)
    @property({ group: { name: 'DynamicShadowSettings', displayOrder: 1 } })
    @editable
    @type(CCBoolean)
    get shadowEnabled (): boolean {
        return this._shadowEnabled;
    }
    set shadowEnabled (val) {
        this._shadowEnabled = val;
        if (this._light) {
            (this._light as scene.DirectionalLight).shadowEnabled = this._shadowEnabled;
        }
    }

    /**
     * @en The shadow pcf for real time shadow.
     * @zh 实时阴影计算中的阴影 pcf 等级。
     */
    @tooltip('i18n:lights.shadowPcf')
    @visible(() => getPipelineSceneData().shadows.enabled
    && getPipelineSceneData().shadows.type === ShadowType.ShadowMap)
    @property({ group: { name: 'DynamicShadowSettings', displayOrder: 5  } })
    @editable
    @type(PCFType)
    get shadowPcf (): number {
        return this._shadowPcf;
    }
    set shadowPcf (val) {
        this._shadowPcf = val;
        if (this._light) {
            (this._light as scene.DirectionalLight).shadowPcf = this._shadowPcf;
        }
    }

    /**
     * @en The shadow map sampler offset for real time shadow.
     * @zh 实时阴影计算中的阴影纹理偏移值。
     */
    @tooltip('i18n:lights.shadowBias')
    @visible(() => getPipelineSceneData().shadows.enabled
    && getPipelineSceneData().shadows.type === ShadowType.ShadowMap)
    @property({ group: { name: 'DynamicShadowSettings', displayOrder: 6 } })
    @editable
    @type(CCFloat)
    get shadowBias (): number {
        return this._shadowBias;
    }
    set shadowBias (val) {
        this._shadowBias = val;
        if (this._light) {
            (this._light as scene.DirectionalLight).shadowBias = this._shadowBias;
        }
    }

    /**
     * @en The global normal bias for real time shadow.
     * @zh 实时阴影计算中的法线偏移。
     */
    @tooltip('i18n:lights.shadowNormalBias')
    @visible(() => getPipelineSceneData().shadows.enabled
    && getPipelineSceneData().shadows.type === ShadowType.ShadowMap)
    @property({ group: { name: 'DynamicShadowSettings', displayOrder: 7 } })
    @editable
    @type(CCFloat)
    get shadowNormalBias (): number {
        return this._shadowNormalBias;
    }
    set shadowNormalBias (val) {
        this._shadowNormalBias = val;
        if (this._light) {
            (this._light as scene.DirectionalLight).shadowNormalBias = this._shadowNormalBias;
        }
    }

    /**
     * @en The shadow color saturation for real time shadow.
     * @zh 实时阴影计算中的阴影颜色饱和度。
     */
    @tooltip('i18n:lights.shadowSaturation')
    @visible(() => getPipelineSceneData().shadows.enabled
    && getPipelineSceneData().shadows.type === ShadowType.ShadowMap)
    @property({ group: { name: 'DynamicShadowSettings', displayOrder: 8 } })
    @editable
    @range([0.0, 1.0, 0.01])
    @slide
    @type(CCFloat)
    get shadowSaturation (): number {
        return this._shadowSaturation;
    }
    set shadowSaturation (val) {
        this._shadowSaturation = clamp(val, 0.0, 1.0);

        if (this._light) {
            (this._light as scene.DirectionalLight).shadowSaturation = this._shadowSaturation;
        }
    }

    /**
     * @en The potential shadow distance from the camera for real time shadow.
     * @zh 实时阴影计算中潜在阴影产生的范围
     */
    @tooltip('i18n:lights.shadowDistance')
    @visible(function (this: DirectionalLight) {
        return getPipelineSceneData().shadows.enabled
        && getPipelineSceneData().shadows.type
        === ShadowType.ShadowMap && this._shadowFixedArea === false;
    })
    @property({ group: { name: 'DynamicShadowSettings', displayOrder: 9 } })
    @editable
    @tooltip('shadow visible distance: shadow quality is inversely proportional of the magnitude of this value')
    @range([0.0, 2000.0, 0.1])
    @slide
    @type(CCFloat)
    get shadowDistance (): number {
        return this._shadowDistance;
    }
    set shadowDistance (val) {
        this._shadowDistance = Math.min(val, Shadows.MAX_FAR);
        if (this._shadowDistance / 0.1 < 10.0) { warnID(15003, this._shadowDistance); }
        if (this._light) {
            (this._light as scene.DirectionalLight).shadowDistance = this._shadowDistance;
            (this._light as scene.DirectionalLight).csmNeedUpdate = true;
        }
    }

    /**
     * @en The occlusion range for real time shadow.
     * @zh 实时阴影计算中剔除阴影的范围
    */
    @tooltip('i18n:lights.shadowInvisibleOcclusionRange')
    @visible(function (this: DirectionalLight) {
        return getPipelineSceneData().shadows.enabled
        && getPipelineSceneData().shadows.type
        === ShadowType.ShadowMap && this._shadowFixedArea === false
        && this._csmAdvancedOptions;
    })
    @property({ group: { name: 'DynamicShadowSettings', displayOrder: 22 } })
    @editable
    @tooltip('if shadow has been culled, increase this value to fix it')
    @range([0.0, 2000.0, 1.0])
    @slide
    @type(CCFloat)
    get shadowInvisibleOcclusionRange (): number {
        return this._shadowInvisibleOcclusionRange;
    }
    set shadowInvisibleOcclusionRange (val) {
        this._shadowInvisibleOcclusionRange = Math.min(val, Shadows.MAX_FAR);
        if (this._light) {
            (this._light as scene.DirectionalLight).shadowInvisibleOcclusionRange = this._shadowInvisibleOcclusionRange;
        }
    }

    /**
     * @en get or set shadow CSM level
     * @zh 获取或者设置阴影层级
     */
    @visible(false)
    @property({ group: { name: 'DynamicShadowSettings', displayOrder: 10 } })
    @editable
    @tooltip('CSM Level')
    @type(CSMLevel)
    get csmLevel (): number {
        return this._csmLevel;
    }
    set csmLevel (val) {
        this._csmLevel = val;
        if (this._light) {
            (this._light as scene.DirectionalLight).csmLevel = this._csmLevel;
            (this._light as scene.DirectionalLight).csmNeedUpdate = true;
        }
    }

    /**
     * @en enable csm
     * @zh 开启或关闭 csm 模式
     */
    @tooltip('i18n:lights.enableCSM')
    @visible(function (this: DirectionalLight) {
        return getPipelineSceneData().shadows.enabled
        && getPipelineSceneData().shadows.type
            === ShadowType.ShadowMap && this._shadowFixedArea === false;
    })
    @property({ group: { name: 'DynamicShadowSettings', displayOrder: 11 } })
    @editable
    @tooltip('enable CSM')
    @type(CCBoolean)
    get enableCSM (): boolean {
        return this._csmLevel > CSMLevel.LEVEL_1;
    }
    set enableCSM (val) {
        this._csmLevel = val ? CSMLevel.LEVEL_4 : CSMLevel.LEVEL_1;
        if (this._light) {
            (this._light as scene.DirectionalLight).csmLevel = this._csmLevel;
            (this._light as scene.DirectionalLight).csmNeedUpdate = true;
        }
    }

    /**
     * @en get or set shadow CSM level ratio
     * @zh 获取或者设置阴影层级系数
     */
    @visible(false)
    @property({ group: { name: 'DynamicShadowSettings', displayOrder: 12 } })
    @editable
    @tooltip('CSM Level ratio')
    @range([0.0, 1.0, 0.01])
    @slide
    @type(CCFloat)
    get csmLayerLambda (): number {
        return this._csmLayerLambda;
    }
    set csmLayerLambda (val) {
        this._csmLayerLambda = val;
        if (this._light) {
            (this._light as scene.DirectionalLight).csmLayerLambda = this._csmLayerLambda;
            (this._light as scene.DirectionalLight).csmNeedUpdate = true;
        }
    }

    /**
     * @en get or set shadow CSM performance optimization mode
     * @zh 获取或者设置级联阴影性能优化模式
     * @internal
     */
    @visible(false)
    @property({ group: { name: 'DynamicShadowSettings', displayOrder: 13 } })
    @editable
    @tooltip('CSM Performance Optimization Mode')
    @type(CSMOptimizationMode)
    get csmOptimizationMode (): number {
        return this._csmOptimizationMode;
    }
    set csmOptimizationMode (val) {
        this._csmOptimizationMode = val;
        if (this._light) {
            (this._light as scene.DirectionalLight).csmOptimizationMode = this._csmOptimizationMode;
        }
    }

    /**
     * @en Whether to use fixed area shadow in real time shadow.
     * @zh 实时阴影计算中是否使用固定区域阴影。
     */
    @tooltip('i18n:lights.shadowFixedArea')
    @visible(() => getPipelineSceneData().shadows.enabled
    && getPipelineSceneData().shadows.type === ShadowType.ShadowMap)
    @property({ group: { name: 'DynamicShadowSettings', displayOrder: 14 } })
    @editable
    @type(CCBoolean)
    get shadowFixedArea (): boolean {
        return this._shadowFixedArea;
    }
    set shadowFixedArea (val) {
        this._shadowFixedArea = val;
        if (this._light) {
            (this._light as scene.DirectionalLight).shadowFixedArea = this._shadowFixedArea;
        }
    }

    /**
     * @en The near clip plane of the shadow camera for fixed area shadow
     * @zh 固定区域阴影设置中阴影相机近裁剪面
     */
    @tooltip('i18n:lights.shadowNear')
    @visible(function (this: DirectionalLight) {
        return getPipelineSceneData().shadows.enabled
        && getPipelineSceneData().shadows.type
        === ShadowType.ShadowMap && this._shadowFixedArea === true;
    })
    @property({ group: { name: 'DynamicShadowSettings', displayOrder: 15 } })
    @editable
    @type(CCFloat)
    get shadowNear (): number {
        return this._shadowNear;
    }
    set shadowNear (val) {
        this._shadowNear = val;
        if (this._light) {
            (this._light as scene.DirectionalLight).shadowNear = this._shadowNear;
        }
    }

    /**
     * @en The far clip plane of the shadow camera for fixed area shadow.
     * @zh 固定区域阴影设置中阴影相机远裁剪面。
     */
    @tooltip('i18n:lights.shadowFar')
    @visible(function (this: DirectionalLight) {
        return getPipelineSceneData().shadows.enabled
        && getPipelineSceneData().shadows.type
        === ShadowType.ShadowMap && this._shadowFixedArea === true;
    })
    @property({ group: { name: 'DynamicShadowSettings', displayOrder: 16 } })
    @editable
    @type(CCFloat)
    get shadowFar (): number {
        return this._shadowFar;
    }
    set shadowFar (val) {
        this._shadowFar = Math.min(val, Shadows.MAX_FAR);
        if (this._light) {
            (this._light as scene.DirectionalLight).shadowFar = this._shadowFar;
        }
    }

    /**
     * @en The orthogonal size of the shadow camera for fixed area shadow.
     * @zh 固定区域阴影设置中阴影相机的正交尺寸
     */
    @tooltip('i18n:lights.shadowOrthoSize')
    @visible(function (this: DirectionalLight) {
        return getPipelineSceneData().shadows.enabled
        && getPipelineSceneData().shadows.type
        === ShadowType.ShadowMap && this._shadowFixedArea === true;
    })
    @property({ group: { name: 'DynamicShadowSettings', displayOrder: 17 } })
    @type(CCFloat)
    get shadowOrthoSize (): number {
        return this._shadowOrthoSize;
    }
    set shadowOrthoSize (val) {
        this._shadowOrthoSize = val;
        if (this._light) {
            (this._light as scene.DirectionalLight).shadowOrthoSize = this._shadowOrthoSize;
        }
    }

    /**
     * @en Enabled shadow advanced options
     * @zh 是否启用高级选项？
     */
    @tooltip('i18n:lights.shadowAdvancedOptions')
    @visible(function (this: DirectionalLight) {
        return getPipelineSceneData().shadows.enabled
         && getPipelineSceneData().shadows.type === ShadowType.ShadowMap
         && this._csmLevel > CSMLevel.LEVEL_1;
    })
    @property({ group: { name: 'DynamicShadowSettings', displayOrder: 19 } })
    @editable
    @type(CCBoolean)
    get csmAdvancedOptions (): boolean {
        return this._csmAdvancedOptions;
    }
    set csmAdvancedOptions (val) {
        this._csmAdvancedOptions = val;
    }

    /**
     * @en Enabled csm layers transition
     * @zh 是否启用级联阴影层级过渡？
     */
    @tooltip('i18n:lights.csmLayersTransition')
    @visible(function (this: DirectionalLight) {
        return getPipelineSceneData().shadows.enabled
         && getPipelineSceneData().shadows.type === ShadowType.ShadowMap
         && this._csmLevel > CSMLevel.LEVEL_1
         && this._csmAdvancedOptions;
    })
    @property({ group: { name: 'DynamicShadowSettings', displayOrder: 20 } })
    @editable
    @type(CCBoolean)
    get csmLayersTransition (): boolean {
        return this._csmLayersTransition;
    }
    set csmLayersTransition (val) {
        this._csmLayersTransition = val;
        if (this._light) { (this._light as scene.DirectionalLight).csmLayersTransition = val; }
    }

    /**
     * @en get or set csm layers transition range
     * @zh 获取或者设置级联阴影层级过渡范围？
     */
    @tooltip('i18n:lights.csmTransitionRange')
    @visible(function (this: DirectionalLight) {
        return getPipelineSceneData().shadows.enabled
         && getPipelineSceneData().shadows.type === ShadowType.ShadowMap
         && this._csmLevel > CSMLevel.LEVEL_1
         && this._csmAdvancedOptions;
    })
    @property({ group: { name: 'DynamicShadowSettings', displayOrder: 21 } })
    @editable
    @range([0.0, 0.1, 0.01])
    @slide
    @type(CCFloat)
    get csmTransitionRange (): number {
        return this._csmTransitionRange;
    }
    set csmTransitionRange (val) {
        this._csmTransitionRange = val;
        if (this._light) { (this._light as scene.DirectionalLight).csmTransitionRange = val; }
    }

    constructor () {
        super();
        this._lightType = scene.DirectionalLight;

        const highQualityMode = settings.querySettings(SettingsCategory.RENDERING, 'highQualityMode');

        if (highQualityMode) {
            this._shadowPcf = PCFType.SOFT_2X;
            this._shadowDistance = 50;
            this.enableCSM = true;
            this.staticSettings.castShadow = true;
        }
    }

    protected _createLight (): void {
        super._createLight();
        this._type = scene.LightType.DIRECTIONAL;
        if (this._light) {
            const dirLight = this._light as scene.DirectionalLight;
            dirLight.illuminanceHDR = this._illuminanceHDR;
            dirLight.illuminanceLDR = this._illuminanceLDR;
            // shadow info
            dirLight.shadowEnabled = this._shadowEnabled;
            dirLight.shadowPcf = this._shadowPcf;
            dirLight.shadowBias = this._shadowBias;
            dirLight.shadowNormalBias = this._shadowNormalBias;
            dirLight.shadowSaturation = this._shadowSaturation;
            dirLight.shadowDistance = this._shadowDistance;
            dirLight.shadowInvisibleOcclusionRange = this._shadowInvisibleOcclusionRange;
            dirLight.shadowFixedArea = this._shadowFixedArea;
            dirLight.shadowNear = this._shadowNear;
            dirLight.shadowFar = this._shadowFar;
            dirLight.shadowOrthoSize = this._shadowOrthoSize;
            dirLight.csmLevel = this._csmLevel;
            dirLight.csmLayerLambda = this._csmLayerLambda;
            dirLight.csmOptimizationMode = this._csmOptimizationMode;
            dirLight.csmLayersTransition = this._csmLayersTransition;
            dirLight.csmTransitionRange = this._csmTransitionRange;
        }
    }

    protected _onUpdateReceiveDirLight (): void {
        if (!this._light) {
            return;
        }
        super._onUpdateReceiveDirLight();

        const scene = this.node.scene;
        if (!scene || !scene.renderScene) {
            return;
        }
        if (scene.renderScene.mainLight !== this._light) {
            return;
        }
        const models = scene.renderScene.models;
        for (let i = 0; i < models.length; i++) {
            const model = models[i];
            if (!model.node) continue;
            const meshRender = model.node.getComponent(MeshRenderer);
            if (!meshRender) continue;
            meshRender.onUpdateReceiveDirLight(this._visibility);
        }
    }
}
