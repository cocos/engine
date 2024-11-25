/* eslint-disable func-names */
/*
 Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.
 http://www.cocos.com
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

import {
    ccclass, visible, type, displayOrder, readOnly, slide, range, rangeStep,
    editable, serializable, rangeMin, tooltip, formerlySerializedAs, displayName,
} from 'cc.decorator';
import { BAIDU } from 'internal:constants';
import { TextureCube } from '../asset/assets/texture-cube';
import { CCFloat, CCInteger } from '../core/data/utils/attribute';
import { Color, Quat, Vec3, Vec2, Vec4 } from '../core/math';
import { Ambient } from '../render-scene/scene/ambient';
import { Shadows, ShadowType, ShadowSize } from '../render-scene/scene/shadows';
import { Skybox, EnvironmentLightingType } from '../render-scene/scene/skybox';
import { Octree } from '../render-scene/scene/octree';
import { Skin } from '../render-scene/scene/skin';
import { Fog, FogType } from '../render-scene/scene/fog';
import { LightProbesData, LightProbes } from '../gi/light-probe/light-probe';
import { Node } from './node';
import { legacyCC } from '../core/global-exports';
import { Root } from '../root';
import { warnID } from '../core/platform/debug';
import { Material, MaterialPropertyFull } from '../asset/assets/material';
import { cclegacy, macro } from '../core';
import { Scene } from './scene';
import { NodeEventType } from './node-event';
import { PostSettings, ToneMappingType } from '../render-scene/scene/post-settings';

const _up = new Vec3(0, 1, 0);
const _v3 = new Vec3();
const _v4 = new Vec4();
const _col = new Color();
const _qt = new Quat();

// Normalize HDR color
const normalizeHDRColor = (color: Vec4): void => {
    const intensity = 1.0 / Math.max(Math.max(Math.max(color.x, color.y), color.z), 0.0001);
    if (intensity < 1.0) {
        color.x *= intensity;
        color.y *= intensity;
        color.z *= intensity;
    }
};
/**
 * @en Environment lighting configuration in the Scene
 * @zh 场景的环境光照相关配置
 */
@ccclass('cc.AmbientInfo')
export class AmbientInfo {
    /**
     * @en The sky color in HDR mode
     * @zh HDR 模式下的天空光照色
     */
    get skyColorHDR (): Readonly<Vec4> {
        return this._skyColorHDR;
    }

    /**
     * @en The ground color in HDR mode
     * @zh HDR 模式下的地面光照色
     */
    get groundAlbedoHDR (): Readonly<Vec4> {
        return this._groundAlbedoHDR;
    }

    /**
     * @en Sky illuminance in HDR mode
     * @zh HDR 模式下的天空亮度
     */
    get skyIllumHDR (): number {
        return this._skyIllumHDR;
    }

    /**
     * @en The sky color in LDR mode
     * @zh LDR 模式下的天空光照色
     */
    get skyColorLDR (): Readonly<Vec4> {
        return this._skyColorLDR;
    }

    /**
     * @en The ground color in LDR mode
     * @zh LDR 模式下的地面光照色
     */
    get groundAlbedoLDR (): Readonly<Vec4> {
        return this._groundAlbedoLDR;
    }

    /**
     * @en Sky illuminance in LDR mode
     * @zh LDR 模式下的天空亮度
     */
    get skyIllumLDR (): number {
        return this._skyIllumLDR;
    }

    /**
     * @en Sky lighting color configurable in editor with color picker
     * @zh 编辑器中可配置的天空光照颜色（通过颜色拾取器）
     */
    @visible(() => {
        const scene = legacyCC.director.getScene();
        const skybox = scene.globals.skybox;
        if (skybox.useIBL && skybox.applyDiffuseMap) {
            return false;
        } else {
            return true;
        }
    })
    @editable
    @tooltip('i18n:ambient.skyLightingColor')
    set skyLightingColor (val: Color) {
        _v4.set(val.x, val.y, val.z, val.w);
        if ((legacyCC.director.root as Root).pipeline.pipelineSceneData.isHDR) {
            this._skyColorHDR.set(_v4);
        } else {
            this._skyColorLDR.set(_v4);
        }
        if (this._resource) { this._resource.skyColor.set(_v4); }
    }
    get skyLightingColor (): Color {
        const isHDR = (legacyCC.director.root as Root).pipeline.pipelineSceneData.isHDR;
        _v4.set(isHDR ? this._skyColorHDR : this._skyColorLDR);
        normalizeHDRColor(_v4);
        return _col.set(_v4.x * 255, _v4.y * 255, _v4.z * 255, 255);
    }

    /**
     * @internal
     */
    set skyColor (val: Vec4) {
        if ((legacyCC.director.root as Root).pipeline.pipelineSceneData.isHDR) {
            this._skyColorHDR.set(val);
        } else {
            this._skyColorLDR.set(val);
        }
        if (this._resource) { this._resource.skyColor.set(val); }
    }

    /**
     * @en Sky illuminance
     * @zh 天空亮度
     */
    @editable
    @type(CCFloat)
    @tooltip('i18n:ambient.skyIllum')
    @range([0, Number.POSITIVE_INFINITY, 100])
    set skyIllum (val: number) {
        if ((legacyCC.director.root as Root).pipeline.pipelineSceneData.isHDR) {
            this._skyIllumHDR = val;
        } else {
            this._skyIllumLDR = val;
        }

        if (this._resource) { this._resource.skyIllum = val; }
    }
    get skyIllum (): number {
        if ((legacyCC.director.root as Root).pipeline.pipelineSceneData.isHDR) {
            return this._skyIllumHDR;
        } else {
            return this._skyIllumLDR;
        }
    }

    /**
     * @en Ground lighting color configurable in editor with color picker
     * @zh 编辑器中可配置的地面光照颜色（通过颜色拾取器）
     */
    @visible(() => {
        const scene = legacyCC.director.getScene();
        const skybox = scene.globals.skybox;
        if (skybox.useIBL && skybox.applyDiffuseMap) {
            return false;
        } else {
            return true;
        }
    })
    @editable
    @tooltip('i18n:ambient.groundLightingColor')
    set groundLightingColor (val: Color) {
        _v4.set(val.x, val.y, val.z, val.w);
        if ((legacyCC.director.root as Root).pipeline.pipelineSceneData.isHDR) {
            this._groundAlbedoHDR.set(_v4);
        } else {
            this._groundAlbedoLDR.set(_v4);
        }
        if (this._resource) { this._resource.groundAlbedo.set(_v4); }
    }
    get groundLightingColor (): Color {
        const isHDR = (legacyCC.director.root as Root).pipeline.pipelineSceneData.isHDR;
        _v4.set(isHDR ? this._groundAlbedoHDR : this._groundAlbedoLDR);
        normalizeHDRColor(_v4);
        return _col.set(_v4.x * 255, _v4.y * 255, _v4.z * 255, 255);
    }

    /**
     * @internal
     */
    set groundAlbedo (val: Vec4) {
        if ((legacyCC.director.root as Root).pipeline.pipelineSceneData.isHDR) {
            this._groundAlbedoHDR.set(val);
        } else {
            this._groundAlbedoLDR.set(val);
        }
        if (this._resource) { this._resource.groundAlbedo.set(val); }
    }

    @serializable
    @formerlySerializedAs('_skyColor')
    protected _skyColorHDR = new Vec4(0.2, 0.5, 0.8, 1.0);
    @serializable
    @formerlySerializedAs('_skyIllum')
    protected _skyIllumHDR = Ambient.SKY_ILLUM;
    @serializable
    @formerlySerializedAs('_groundAlbedo')
    protected _groundAlbedoHDR = new Vec4(0.2, 0.2, 0.2, 1.0);

    @serializable
    protected _skyColorLDR = new Vec4(0.2, 0.5, 0.8, 1.0);
    @serializable
    protected _skyIllumLDR = Ambient.SKY_ILLUM;
    @serializable
    protected _groundAlbedoLDR = new Vec4(0.2, 0.2, 0.2, 1.0);

    protected _resource: Ambient | null = null;

    /**
     * @en Activate the ambient lighting configuration in the render scene, no need to invoke manually.
     * @zh 在渲染场景中启用环境光照设置，不需要手动调用
     * @param resource The ambient configuration object in the render scene
     */
    public activate (resource: Ambient): void {
        this._resource = resource;
        this._resource.initialize(this);
    }
}
legacyCC.AmbientInfo = AmbientInfo;

/**
 * @en Skybox related configuration
 * @zh 天空盒相关配置
 */
@ccclass('cc.SkyboxInfo')
export class SkyboxInfo {
    /**
     * @en Whether to use diffuse convolution map. Enabled -> Will use map specified. Disabled -> Will revert to hemispheric lighting
     * @zh 是否为IBL启用漫反射卷积图？不启用的话将使用默认的半球光照
     */
    set applyDiffuseMap (val) {
        if (this._resource) {
            this._resource.useDiffuseMap = val;
        }
    }
    get applyDiffuseMap (): boolean {
        if (EnvironmentLightingType.DIFFUSEMAP_WITH_REFLECTION === this._envLightingType) {
            return true;
        }
        return false;
    }
    /**
     * @en Whether activate skybox in the scene
     * @zh 是否启用天空盒？
     */
    @editable
    @tooltip('i18n:skybox.enabled')
    set enabled (val) {
        if (this._enabled === val) return;
        this._enabled = val;

        if (this._resource) {
            this._resource.enabled = this._enabled;
        }
    }
    get enabled (): boolean {
        return this._enabled;
    }

    /**
     * @zh 环境反射类型
     * @en environment reflection type
     */
    @editable
    @type(EnvironmentLightingType)
    @tooltip('i18n:skybox.EnvironmentLightingType')
    set envLightingType (val) {
        if (!this.envmap && EnvironmentLightingType.HEMISPHERE_DIFFUSE !== val) {
            this.useIBL = false;
            this.applyDiffuseMap = false;
            this._envLightingType = EnvironmentLightingType.HEMISPHERE_DIFFUSE;
            warnID(15001);
        } else {
            if (EnvironmentLightingType.HEMISPHERE_DIFFUSE === val) {
                this.useIBL = false;
                this.applyDiffuseMap = false;
            } else if (EnvironmentLightingType.AUTOGEN_HEMISPHERE_DIFFUSE_WITH_REFLECTION === val) {
                this.useIBL = true;
                this.applyDiffuseMap = false;
            } else if (EnvironmentLightingType.DIFFUSEMAP_WITH_REFLECTION === val) {
                this.useIBL = true;
                this.applyDiffuseMap = true;
            }
            this._envLightingType = val;
        }
    }
    get envLightingType (): number {
        return this._envLightingType;
    }
    /**
     * @en Whether use environment lighting
     * @zh 是否启用环境光照？
     */
    set useIBL (val) {
        if (this._resource) {
            this._resource.useIBL = val;
        }
    }
    get useIBL (): boolean {
        if (EnvironmentLightingType.HEMISPHERE_DIFFUSE !== this._envLightingType) {
            return true;
        }
        return false;
    }

    /**
     * @en Toggle HDR (TODO: This SHOULD be moved into it's own subgroup away from skybox)
     * @zh 是否启用HDR？
     */
    @editable
    @tooltip('i18n:skybox.useHDR')
    set useHDR (val) {
        (legacyCC.director.root as Root).pipeline.pipelineSceneData.isHDR = val;
        this._useHDR = val;

        // Switch UI to and from LDR/HDR textures depends on HDR state
        if (this._resource) {
            if (this.envLightingType === EnvironmentLightingType.DIFFUSEMAP_WITH_REFLECTION) {
                if (this.diffuseMap === null) {
                    this.envLightingType = EnvironmentLightingType.AUTOGEN_HEMISPHERE_DIFFUSE_WITH_REFLECTION;
                    warnID(15000);
                } else if (this.diffuseMap.isDefault) {
                    warnID(15002);
                }
            }
        }

        if (this._resource) {
            this._resource.useHDR = this._useHDR;
            this._resource.updateMaterialRenderInfo();
        }
    }
    get useHDR (): boolean {
        (legacyCC.director.root as Root).pipeline.pipelineSceneData.isHDR = this._useHDR;
        return this._useHDR;
    }

    /**
     * @en The texture cube used for the skybox
     * @zh 使用的立方体贴图
     */
    @editable
    @type(TextureCube)
    @tooltip('i18n:skybox.envmap')
    set envmap (val) {
        const isHDR = (legacyCC.director.root as Root).pipeline.pipelineSceneData.isHDR;
        if (isHDR) {
            this._envmapHDR = val;
            this._reflectionHDR = null;
        } else {
            this._envmapLDR = val;
            this._reflectionLDR = null;
        }
        if (!val) {
            if (isHDR) {
                this._diffuseMapHDR = null;
            } else {
                this._diffuseMapLDR = null;
            }
            this.applyDiffuseMap = false;
            this.useIBL = false;
            this.envLightingType = EnvironmentLightingType.HEMISPHERE_DIFFUSE;
            warnID(15001);
        }

        if (this._resource) {
            this._resource.setEnvMaps(this._envmapHDR, this._envmapLDR);
            this._resource.setDiffuseMaps(this._diffuseMapHDR, this._diffuseMapLDR);
            this._resource.setReflectionMaps(this._reflectionHDR, this._reflectionLDR);
            this._resource.useDiffuseMap = this.applyDiffuseMap;
            this._resource.envmap = val;
        }
    }
    get envmap (): TextureCube | null {
        const isHDR = (legacyCC.director.root as Root).pipeline.pipelineSceneData.isHDR;
        if (isHDR) {
            return this._envmapHDR;
        } else {
            return this._envmapLDR;
        }
    }

    /**
     * @en Rotate the skybox
     * @zh 旋转天空盒
     */
    @type(CCFloat)
    @range([0, 360, 1])
    @slide
    @tooltip('i18n:skybox.rotationAngle')
    set rotationAngle (val: number) {
        this._rotationAngle = val;
        if (this._resource) { this._resource.setRotationAngle(this._rotationAngle); }
    }
    get rotationAngle (): number {
        return this._rotationAngle;
    }

    /**
     * @en The optional diffusion convolution map used in tandem with IBL
     * @zh 使用的漫反射卷积图
     */
    @visible(function (this: SkyboxInfo): boolean {
        if (this.useIBL && this.applyDiffuseMap) {
            return true;
        }
        return false;
    })
    @editable
    @readOnly
    @type(TextureCube)
    @displayOrder(100)
    set diffuseMap (val: TextureCube | null) {
        const isHDR = (legacyCC.director.root as Root).pipeline.pipelineSceneData.isHDR;
        if (isHDR) {
            this._diffuseMapHDR = val;
        } else {
            this._diffuseMapLDR = val;
        }

        if (this._resource) {
            this._resource.setDiffuseMaps(this._diffuseMapHDR, this._diffuseMapLDR);
        }
    }
    get diffuseMap (): TextureCube | null {
        const isHDR = (legacyCC.director.root as Root).pipeline.pipelineSceneData.isHDR;
        if (isHDR) {
            return this._diffuseMapHDR;
        } else {
            return this._diffuseMapLDR;
        }
    }

    /**
     * @en Convolutional map using environmental reflections
     * @zh 使用环境反射卷积图
     */
    @visible(function (this: SkyboxInfo) {
        if (this._resource?.reflectionMap) {
            return true;
        }
        return false;
    })
    @editable
    @readOnly
    @type(TextureCube)
    @displayOrder(100)
    set reflectionMap (val: TextureCube | null) {
        const isHDR = (legacyCC.director.root as Root).pipeline.pipelineSceneData.isHDR;
        if (isHDR) {
            this._reflectionHDR = val;
        } else {
            this._reflectionLDR = val;
        }
        if (this._resource) {
            this._resource.setReflectionMaps(this._reflectionHDR, this._reflectionLDR);
        }
    }
    get reflectionMap (): TextureCube | null {
        const isHDR = (legacyCC.director.root as Root).pipeline.pipelineSceneData.isHDR;
        if (isHDR) {
            return this._reflectionHDR;
        } else {
            return this._reflectionLDR;
        }
    }

    /**
     * @en Use custom skybox material
     * @zh 使用自定义的天空盒材质
     */
    @editable
    @type(Material)
    @tooltip('i18n:skybox.material')
    set skyboxMaterial (val: Material | null) {
        this._editableMaterial = val;
        if (this._resource) {
            this._resource.setSkyboxMaterial(this._editableMaterial);
        }
    }
    get skyboxMaterial (): Material | null {
        return this._editableMaterial;
    }

    @serializable
    protected _envLightingType = EnvironmentLightingType.HEMISPHERE_DIFFUSE;
    @serializable
    @type(TextureCube)
    @formerlySerializedAs('_envmap')
    protected _envmapHDR: TextureCube | null = null;
    @serializable
    @type(TextureCube)
    protected _envmapLDR: TextureCube | null = null;
    @serializable
    @type(TextureCube)
    protected _diffuseMapHDR: TextureCube | null = null;
    @serializable
    @type(TextureCube)
    protected _diffuseMapLDR: TextureCube | null = null;
    @serializable
    protected _enabled = false;
    @serializable
    protected _useHDR = true;
    @serializable
    @type(Material)
    protected _editableMaterial: Material | null = null;
    @serializable
    @type(TextureCube)
    protected _reflectionHDR: TextureCube | null = null;
    @serializable
    @type(TextureCube)
    protected _reflectionLDR: TextureCube | null = null;
    @serializable
    protected _rotationAngle = 0;

    protected _resource: Skybox | null = null;

    /**
     * @en Activate the skybox configuration in the render scene, no need to invoke manually.
     * @zh 在渲染场景中启用天空盒设置，不需要手动调用
     * @param resource The skybox configuration object in the render scene
     */
    public activate (resource: Skybox): void {
        this.envLightingType = this._envLightingType;
        this._resource = resource;
        this._resource.initialize(this);
        this._resource.setEnvMaps(this._envmapHDR, this._envmapLDR);
        this._resource.setDiffuseMaps(this._diffuseMapHDR, this._diffuseMapLDR);
        this._resource.setSkyboxMaterial(this._editableMaterial);
        this._resource.setReflectionMaps(this._reflectionHDR, this._reflectionLDR);
        this._resource.setRotationAngle(this._rotationAngle);
        this._resource.activate(); // update global DS first
    }

    /**
     * @en When the environment map changed will call this function to update scene.
     * @zh 环境贴图发生变化时，会调用此函数更新场景。
     * @param val environment map
     */
    public updateEnvMap (val: TextureCube): void {
        if (!val) {
            this.applyDiffuseMap = false;
            this.useIBL = false;
            this.envLightingType = EnvironmentLightingType.HEMISPHERE_DIFFUSE;
            warnID(15001);
        }
        if (this._resource) {
            this._resource.setEnvMaps(this._envmapHDR, this._envmapLDR);
            this._resource.setDiffuseMaps(this._diffuseMapHDR, this._diffuseMapLDR);
            this._resource.setReflectionMaps(this._reflectionHDR, this._reflectionLDR);
            this._resource.useDiffuseMap = this.applyDiffuseMap;
            this._resource.envmap = val;
        }
    }

    /**
     * @en
     * Set custom skybox material properties.
     * @zh
     * 设置自定义的天空盒材质属性。
     * @param name @en The target property name. @zh 目标 property 名称。
     * @param val @en The target value. @zh 需要设置的目标值。
     * @param passIdx
     * @en The pass to apply to. Will apply to all passes if not specified.
     * @zh 设置此属性的 pass 索引，如果没有指定，则会设置此属性到所有 pass 上。
     */
    public setMaterialProperty (name: string, val: MaterialPropertyFull | MaterialPropertyFull[], passIdx?: number): void {
        if (!this._resource) return;
        if (this._resource.enabled && this._resource.editableMaterial) {
            this._resource.editableMaterial.setProperty(name, val, passIdx);
            this._resource.editableMaterial.passes.forEach((pass) => {
                pass.update();
            });
        }
    }
}
legacyCC.SkyboxInfo = SkyboxInfo;

/**
 * @zh 全局雾相关配置
 * @en Global fog configuration
 */
@ccclass('cc.FogInfo')
export class FogInfo {
    public static FogType = FogType;

    /**
     * @zh 是否启用全局雾效
     * @en Enable global fog
     */
    @editable
    @tooltip('i18n:fog.enabled')
    @displayOrder(0)
    set enabled (val: boolean) {
        if (this._enabled === val) return;
        this._enabled = val;
        if (this._resource) {
            this._resource.enabled = val;
            if (val) {
                this._resource.type = this._type;
            }
        }
    }

    get enabled (): boolean {
        return this._enabled;
    }

    /**
     * @zh 是否启用精确雾效(像素雾)计算
     * @en Enable accurate fog (pixel fog)
     */
    @editable
    @tooltip('i18n:fog.accurate')
    @displayOrder(0)
    set accurate (val: boolean) {
        if (this._accurate === val) return;
        this._accurate = val;
        if (this._resource) {
            this._resource.accurate = val;
            if (val) {
                this._resource.type = this._type;
            }
        }
    }

    get accurate (): boolean {
        return this._accurate;
    }

    /**
     * @zh 全局雾颜色
     * @en Global fog color
     */
    @editable
    @tooltip('i18n:fog.fogColor')
    set fogColor (val: Readonly<Color>) {
        this._fogColor.set(val);
        if (this._resource) { this._resource.fogColor = this._fogColor; }
    }

    get fogColor (): Readonly<Color> {
        return this._fogColor;
    }

    /**
     * @zh 全局雾类型
     * @en Global fog type
     */
    @editable
    @type(FogType)
    @displayOrder(1)
    @tooltip('i18n:fog.type')
    get type (): number {
        return this._type;
    }

    set type (val) {
        this._type = val;
        if (this._resource) { this._resource.type = val; }
    }

    /**
     * @zh 全局雾浓度
     * @en Global fog density
     */
    @visible(function (this: FogInfo) {
        return this._type !== FogType.LAYERED && this._type !== FogType.LINEAR;
    })
    @type(CCFloat)
    @range([0, 1, 0.01])
    @slide
    @tooltip('i18n:fog.fogDensity')
    get fogDensity (): number {
        return this._fogDensity;
    }

    set fogDensity (val) {
        this._fogDensity = val;
        if (this._resource) { this._resource.fogDensity = val; }
    }

    /**
     * @zh 雾效起始位置
     * @en Global fog start position
     */
    @visible(function (this: FogInfo) { return this._type !== FogType.LAYERED; })
    @type(CCFloat)
    @rangeStep(0.01)
    @tooltip('i18n:fog.fogStart')
    get fogStart (): number {
        return this._fogStart;
    }

    set fogStart (val) {
        this._fogStart = val;
        if (this._resource) { this._resource.fogStart = val; }
    }

    /**
     * @zh 雾效结束位置，只适用于线性雾
     * @en Global fog end position, only for linear fog
     */
    @visible(function (this: FogInfo) { return this._type === FogType.LINEAR; })
    @type(CCFloat)
    @rangeStep(0.01)
    @tooltip('i18n:fog.fogEnd')
    get fogEnd (): number {
        return this._fogEnd;
    }

    set fogEnd (val) {
        this._fogEnd = val;
        if (this._resource) { this._resource.fogEnd = val; }
    }

    /**
     * @zh 雾效衰减
     * @en Global fog attenuation
     */
    @visible(function (this: FogInfo) { return this._type !== FogType.LINEAR; })
    @type(CCFloat)
    @rangeMin(0.01)
    @rangeStep(0.01)
    @tooltip('i18n:fog.fogAtten')
    get fogAtten (): number {
        return this._fogAtten;
    }

    set fogAtten (val) {
        this._fogAtten = val;
        if (this._resource) { this._resource.fogAtten = val; }
    }

    /**
     * @zh 雾效顶部范围，只适用于层级雾
     * @en Global fog top range, only for layered fog
     */
    @visible(function (this: FogInfo) { return this._type === FogType.LAYERED; })
    @type(CCFloat)
    @rangeStep(0.01)
    @tooltip('i18n:fog.fogTop')
    get fogTop (): number {
        return this._fogTop;
    }

    set fogTop (val) {
        this._fogTop = val;
        if (this._resource) { this._resource.fogTop = val; }
    }

    /**
     * @zh 雾效范围，只适用于层级雾
     * @en Global fog range, only for layered fog
     */
    @visible(function (this: FogInfo) { return this._type === FogType.LAYERED; })
    @type(CCFloat)
    @rangeStep(0.01)
    @tooltip('i18n:fog.fogRange')
    get fogRange (): number {
        return this._fogRange;
    }

    set fogRange (val) {
        this._fogRange = val;
        if (this._resource) { this._resource.fogRange = val; }
    }

    @serializable
    protected _type = FogType.LINEAR;
    @serializable
    protected _fogColor = new Color('#C8C8C8');
    @serializable
    protected _enabled = false;
    @serializable
    protected _fogDensity = 0.3;
    @serializable
    protected _fogStart = 0.5;
    @serializable
    protected _fogEnd = 300;
    @serializable
    protected _fogAtten = 5;
    @serializable
    protected _fogTop = 1.5;
    @serializable
    protected _fogRange = 1.2;
    @serializable
    protected _accurate = false;
    protected _resource: Fog | null = null;

    /**
     * @en Activate the fog configuration in the render scene, no need to invoke manually.
     * @zh 在渲染场景中启用雾效设置，不需要手动调用
     * @param resource The fog configuration object in the render scene
     */
    public activate (resource: Fog): void {
        this._resource = resource;
        this._resource.initialize(this);
        this._resource.activate();
    }
}

/**
 * @en Scene level shadow related configuration
 * @zh 场景级别阴影相关的配置
 */
@ccclass('cc.ShadowsInfo')
export class ShadowsInfo {
    /**
     * @en Whether activate planar shadow
     * @zh 是否启用平面阴影？
     */
    @editable
    @tooltip('i18n:shadow.enabled')
    set enabled (val: boolean) {
        if (this._enabled === val) return;
        this._enabled = val;
        if (this._resource) {
            this._resource.enabled = val;
            if (val) {
                this._resource.type = this._type;
            }
        }
    }
    get enabled (): boolean {
        if (BAIDU) {
            if (this._type !== ShadowType.Planar) {
                this._enabled = false;
            }
        }
        return this._enabled;
    }

    /**
     * @en The type of the shadow
     * @zh 阴影渲染的类型
     */
    @tooltip('i18n:shadow.type')
    @editable
    @type(ShadowType)
    set type (val) {
        this._type = val;
        if (this._resource) { this._resource.type = val; }
    }
    get type (): number {
        return this._type;
    }

    /**
     * @en Shadow color
     * @zh 阴影颜色
     */
    @tooltip('i18n:shadow.shadowColor')
    @visible(function (this: ShadowsInfo) { return this._type === ShadowType.Planar; })
    set shadowColor (val: Readonly<Color>) {
        this._shadowColor.set(val);
        if (this._resource) { this._resource.shadowColor = val as Color; }
    }
    get shadowColor (): Readonly<Color> {
        return this._shadowColor;
    }

    /**
     * @en The normal of the plane which receives shadow
     * @zh 阴影接收平面的法线
     */
    @tooltip('i18n:shadow.planeDirection')
    @visible(function (this: ShadowsInfo) { return this._type === ShadowType.Planar; })
    set planeDirection (val: Readonly<Vec3>) {
        Vec3.copy(this._normal, val);
        if (this._resource) { this._resource.normal = val; }
    }
    get planeDirection (): Readonly<Vec3> {
        return this._normal;
    }

    /**
     * @en The distance from coordinate origin to the receiving plane.
     * @zh 阴影接收平面与原点的距离
     */
    @tooltip('i18n:shadow.planeHeight')
    @editable
    @type(CCFloat)
    @visible(function (this: ShadowsInfo) { return this._type === ShadowType.Planar; })
    set planeHeight (val: number) {
        this._distance = val;
        if (this._resource) { this._resource.distance = val; }
    }
    get planeHeight (): number {
        return this._distance;
    }

    /**
     * @en Positional offset values in planar shading calculations.
     * @zh 平面阴影计算中的位置偏移值。
     */
    @tooltip('i18n:shadow.planeBias')
    @editable
    @type(CCFloat)
    @visible(function (this: ShadowsInfo) { return this._type === ShadowType.Planar; })
    set planeBias (val: number) {
        this._planeBias = val;
        if (this._resource) { this._resource.planeBias = val; }
    }
    get planeBias (): number {
        return this._planeBias;
    }

    /**
     * @en get or set shadow max received
     * @zh 获取或者设置阴影接收的最大光源数量
     */
    @tooltip('i18n:shadow.maxReceived')
    @type(CCInteger)
    @visible(function (this: ShadowsInfo) { return this._type === ShadowType.ShadowMap; })
    set maxReceived (val: number) {
        this._maxReceived = val;
        if (this._resource) { this._resource.maxReceived = val; }
    }
    get maxReceived (): number {
        return this._maxReceived;
    }

    /**
     * @en get or set shadow map size
     * @zh 获取或者设置阴影纹理大小
     */
    @tooltip('i18n:shadow.shadowMapSize')
    @type(ShadowSize)
    @visible(function (this: ShadowsInfo) { return this._type === ShadowType.ShadowMap; })
    set shadowMapSize (value: number) {
        this._size.set(value, value);
        if (this._resource) {
            this._resource.size.set(value, value);
            this._resource.shadowMapDirty = true;
        }
    }
    get shadowMapSize (): number {
        return this._size.x;
    }

    @serializable
    protected _enabled = false;
    @serializable
    protected _type = ShadowType.Planar;
    @serializable
    protected _normal = new Vec3(0, 1, 0);
    @serializable
    protected _distance = 0;
    @serializable
    protected _planeBias = 1.0;
    @serializable
    protected _shadowColor = new Color(0, 0, 0, 76);
    @serializable
    protected _maxReceived = 4;
    @serializable
    protected _size = new Vec2(1024, 1024);

    protected _resource: Shadows | null = null;

    /**
     * @en Set plane which receives shadow with the given node's world transformation
     * @zh 根据指定节点的世界变换设置阴影接收平面的信息
     * @param node The node for setting up the plane
     */
    public setPlaneFromNode (node: Node): void {
        node.getWorldRotation(_qt);
        this.planeDirection = Vec3.transformQuat(_v3, _up, _qt);
        node.getWorldPosition(_v3);
        this.planeHeight = Vec3.dot(this._normal, _v3);
    }

    /**
     * @en Activate the shadow configuration in the render scene, no need to invoke manually.
     * @zh 在渲染场景中启用阴影设置，不需要手动调用
     * @param resource The shadow configuration object in the render scene
     */
    public activate (resource: Shadows): void {
        this._resource = resource;
        this._resource.initialize(this);
        this._resource.activate();
    }
}
legacyCC.ShadowsInfo = ShadowsInfo;

export const DEFAULT_WORLD_MIN_POS = new Vec3(-1024.0, -1024.0, -1024.0);
export const DEFAULT_WORLD_MAX_POS = new Vec3(1024.0, 1024.0, 1024.0);
export const DEFAULT_OCTREE_DEPTH = 8;

/**
 * @en Scene management and culling configuration based on octree
 * @zh 基于八叉树的场景剔除配置
 */
@ccclass('cc.OctreeInfo')
export class OctreeInfo {
    /**
     * @en Whether activate scene culling based on octree
     * @zh 是否启用八叉树加速剔除？
     */
    @editable
    @tooltip('i18n:octree_culling.enabled')
    set enabled (val: boolean) {
        if (this._enabled === val) return;
        this._enabled = val;
        if (this._resource) {
            this._resource.enabled = val;
        }
    }
    get enabled (): boolean {
        return this._enabled;
    }

    /**
     * @en The minimal position of the scene bounding box.
     * Objects entirely outside the bounding box will be culled, other objects will be managed dynamically.
     * @zh 场景包围盒的最小位置，完全超出包围盒的物体会被剔除，其他物体根据情况被动态剔除。
     */
    @editable
    @tooltip('i18n:octree_culling.minPos')
    @displayName('World MinPos')
    set minPos (val: Vec3) {
        this._minPos = val;
        if (this._resource) { this._resource.minPos = val; }
    }
    get minPos (): Vec3 {
        return this._minPos;
    }

    /**
     * @en The maximum position of the scene bounding box.
     * Objects entirely outside the bounding box will be culled, other objects will be managed dynamically.
     * @zh 场景包围盒的最大位置，完全超出包围盒的物体会被剔除，其他物体根据情况被动态剔除。
     */
    @editable
    @tooltip('i18n:octree_culling.maxPos')
    @displayName('World MaxPos')
    set maxPos (val: Vec3) {
        this._maxPos = val;
        if (this._resource) { this._resource.maxPos = val; }
    }
    get maxPos (): Vec3 {
        return this._maxPos;
    }

    /**
     * @en The depth of the octree.
     * @zh 八叉树的深度。
     */
    @editable
    @range([4, 12, 1])
    @slide
    @type(CCInteger)
    @tooltip('i18n:octree_culling.depth')
    set depth (val: number) {
        this._depth = val;
        if (this._resource) { this._resource.depth = val; }
    }
    get depth (): number {
        return this._depth;
    }

    @serializable
    protected _enabled = false;
    @serializable
    protected _minPos = new Vec3(DEFAULT_WORLD_MIN_POS);
    @serializable
    protected _maxPos = new Vec3(DEFAULT_WORLD_MAX_POS);
    @serializable
    protected _depth = DEFAULT_OCTREE_DEPTH;

    protected _resource: Octree | null = null;

    /**
     * @en Activate the octree configuration in the render scene, no need to invoke manually.
     * @zh 在渲染场景中启用八叉树设置，不需要手动调用
     * @param resource The octree configuration object in the render scene
     */
    public activate (resource: Octree): void {
        this._resource = resource;
        this._resource.initialize(this);
    }
}
legacyCC.OctreeInfo = OctreeInfo;

/**
 * @en Global skin in the render scene.
 * @zh 渲染场景中的全局皮肤后处理设置。
 */
@ccclass('cc.SkinInfo')
export class SkinInfo {
    /**
     * @en Enable skip.
     * @zh 是否开启皮肤后效。
     */
    @editable
    @readOnly
    @tooltip('i18n:skin.enabled')
    set enabled (val: boolean) {
        if (this._enabled === val) return;
        this._enabled = val;
        if (this._resource) {
            this._resource.enabled = val;
        }
    }
    get enabled (): boolean {
        return this._enabled;
    }

    /**
     * @en Getter/Setter sampler width.
     * @zh 设置或者获取采样宽度。
     */
    @visible(false)
    @editable
    @range([0.0, 0.1, 0.001])
    @slide
    @type(CCFloat)
    @tooltip('i18n:skin.blurRadius')
    set blurRadius (val: number) {
        this._blurRadius = val;
        if (this._resource) { this._resource.blurRadius = val; }
    }
    get blurRadius (): number {
        return this._blurRadius;
    }

    /**
     * @en Getter/Setter depth unit scale.
     * @zh 设置或者获取深度单位比例。
     */
    @editable
    @range([0.0, 10.0, 0.1])
    @slide
    @type(CCFloat)
    @tooltip('i18n:skin.sssIntensity')
    set sssIntensity (val: number) {
        this._sssIntensity = val;
        if (this._resource) { this._resource.sssIntensity = val; }
    }
    get sssIntensity (): number {
        return this._sssIntensity;
    }

    @serializable
    protected _enabled = true;
    @serializable
    protected _blurRadius = 0.01;
    @serializable
    protected _sssIntensity = 3.0;

    protected _resource: Skin | null = null;

    /**
     * @en Activate the skin configuration in the render scene, no need to invoke manually.
     * @zh 在渲染场景中启用皮肤设置，不需要手动调用
     * @param resource The skin configuration object in the render scene
     */
    public activate (resource: Skin): void {
        this._resource = resource;
        this._resource.initialize(this);
    }
}
legacyCC.SkinInfo = SkinInfo;

@ccclass('cc.PostSettingsInfo')
export class PostSettingsInfo {
    /**
     * @zh 色调映射类型
     * @en Tone mapping type
     */
    @editable
    @type(ToneMappingType)
    @tooltip('i18n:tone_mapping.toneMappingType')
    set toneMappingType (val) {
        this._toneMappingType = val;
        if (this._resource) {
            this._resource.toneMappingType = val;
        }
    }

    get toneMappingType (): number {
        return this._toneMappingType;
    }

    @serializable
    protected _toneMappingType = ToneMappingType.DEFAULT;

    protected _resource: PostSettings | null = null;

    public activate (resource: PostSettings): void {
        this._resource = resource;
        this._resource.initialize(this);
        this._resource.activate();
    }
}

legacyCC.PostSettingsInfo = PostSettingsInfo;

export interface ILightProbeNode {
    node: Node;
    probes: Vec3[] | null;
}

/**
 * @en light probe configuration
 * @zh 光照探针配置
 */
@ccclass('cc.LightProbeInfo')
export class LightProbeInfo {
    /**
     * @en GI multiplier
     * @zh GI乘数
     */
    @editable
    @range([0, 100, 1])
    @type(CCFloat)
    @tooltip('i18n:light_probe.giScale')
    @displayName('GIScale')
    set giScale (val: number) {
        if (this._giScale === val) return;
        this._giScale = val;
        if (this._resource) {
            this._resource.giScale = val;
        }
    }
    get giScale (): number {
        return this._giScale;
    }

    /**
     * @en GI sample counts
     * @zh GI 采样数量
     */
    @editable
    @range([64, 65535, 1])
    @type(CCInteger)
    @tooltip('i18n:light_probe.giSamples')
    @displayName('GISamples')
    set giSamples (val: number) {
        if (this._giSamples === val) return;
        this._giSamples = val;
        if (this._resource) {
            this._resource.giSamples = val;
        }
    }
    get giSamples (): number {
        return this._giSamples;
    }

    /**
     * @en light bounces
     * @zh 光照反弹次数
     */
    @editable
    @range([1, 4, 1])
    @type(CCInteger)
    @tooltip('i18n:light_probe.bounces')
    set bounces (val: number) {
        if (this._bounces === val) return;
        this._bounces = val;
        if (this._resource) {
            this._resource.bounces = val;
        }
    }
    get bounces (): number {
        return this._bounces;
    }

    /**
     * @en Reduce ringing of light probe
     * @zh 减少光照探针的振铃效果
     */
    @editable
    @range([0.0, 0.05, 0.001])
    @slide
    @type(CCFloat)
    @tooltip('i18n:light_probe.reduceRinging')
    set reduceRinging (val: number) {
        if (this._reduceRinging === val) return;
        this._reduceRinging = val;
        if (this._resource) {
            this._resource.reduceRinging = val;
        }
    }
    get reduceRinging (): number {
        return this._reduceRinging;
    }

    /**
     * @en Whether to show light probe
     * @zh 是否显示光照探针
     */
    set showProbe (val: boolean) {
        if (this._showProbe === val) return;
        this._showProbe = val;
        if (this._resource) {
            this._resource.showProbe = val;
        }
    }
    get showProbe (): boolean {
        return this._showProbe;
    }

    /**
     * @en Whether to show light probe's connection
     * @zh 是否显示光照探针连线
     */
    @editable
    @tooltip('i18n:light_probe.showWireframe')
    set showWireframe (val: boolean) {
        if (this._showWireframe === val) return;
        this._showWireframe = val;
        if (this._resource) {
            this._resource.showWireframe = val;
        }
    }
    get showWireframe (): boolean {
        return this._showWireframe;
    }

    /**
     * @en Whether to show light probe's convex
     * @zh 是否显示光照探针凸包
     */
    @editable
    @tooltip('i18n:light_probe.showConvex')
    set showConvex (val: boolean) {
        if (this._showConvex === val) return;
        this._showConvex = val;
        if (this._resource) {
            this._resource.showConvex = val;
        }
    }
    get showConvex (): boolean {
        return this._showConvex;
    }

    /**
     * @en light probe's vertex and tetrahedron data
     * @zh 光照探针顶点及四面体数据
     */
    set data (val: LightProbesData | null) {
        if (this._data === val) return;
        this._data = val;
        if (this._resource) {
            this._resource.data = val;
        }
    }
    get data (): LightProbesData | null {
        return this._data;
    }

    /**
     * @en The value of all light probe sphere display size
     * @zh 光照探针全局显示大小
     */
    @editable
    @range([0, 100, 1])
    @type(CCFloat)
    @tooltip('i18n:light_probe.lightProbeSphereVolume')
    set lightProbeSphereVolume (val: number) {
        if (this._lightProbeSphereVolume === val) return;
        this._lightProbeSphereVolume = val;
        if (this._resource) {
            this._resource.lightProbeSphereVolume = val;
        }
    }
    get lightProbeSphereVolume (): number {
        return this._lightProbeSphereVolume;
    }

    @serializable
    protected _giScale = 1.0;
    @serializable
    protected _giSamples = 1024;
    @serializable
    protected _bounces = 2;
    @serializable
    protected _reduceRinging = 0.0;
    @serializable
    protected _showProbe = true;
    @serializable
    protected _showWireframe = true;
    @serializable
    protected _showConvex = false;
    @serializable
    protected _data: LightProbesData | null = null;
    @serializable
    protected _lightProbeSphereVolume = 1.0;

    protected _nodes: ILightProbeNode[] = [];
    protected _scene: Scene | null = null;
    protected _resource: LightProbes | null = null;

    public activate (scene: Scene, resource: LightProbes): void {
        this._scene = scene;
        this._resource = resource;
        this._resource.initialize(this);
    }

    public onProbeBakeFinished (): void {
        this.onProbeBakingChanged(this._scene);
    }

    public onProbeBakeCleared (): void {
        this.clearSHCoefficients();
        this.onProbeBakingChanged(this._scene);
    }

    private onProbeBakingChanged (node: Node | null): void {
        if (!node) {
            return;
        }

        node.emit(NodeEventType.LIGHT_PROBE_BAKING_CHANGED);

        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            this.onProbeBakingChanged(child);
        }
    }

    public clearSHCoefficients (): void {
        if (!this._data) {
            return;
        }

        const probes = this._data.probes;
        for (let i = 0; i < probes.length; i++) {
            probes[i].coefficients.length = 0;
        }

        this.clearAllSHUBOs();
    }

    public isUniqueNode (): boolean {
        return this._nodes.length === 1;
    }

    public addNode (node: Node): boolean {
        if (!node) {
            return false;
        }

        for (let i = 0; i < this._nodes.length; i++) {
            if (this._nodes[i].node === node) {
                return false;
            }
        }

        this._nodes.push({ node, probes: null });

        return true;
    }

    public removeNode (node: Node): boolean {
        if (!node) {
            return false;
        }

        const index = this._nodes.findIndex((element) => element.node === node);
        if (index === -1) {
            return false;
        }

        this._nodes.splice(index, 1);

        return true;
    }

    public syncData (node: Node, probes: Vec3[]): void {
        for (let i = 0; i < this._nodes.length; i++) {
            if (this._nodes[i].node === node) {
                this._nodes[i].probes = probes;
                return;
            }
        }
    }

    public update (updateTet = true): void {
        if (!cclegacy.internal.LightProbesData) {
            return;
        }

        if (!this._data) {
            this._data = new cclegacy.internal.LightProbesData();
            if (this._resource) {
                this._resource.data = this._data;
            }
        }

        const points: Vec3[] = [];
        for (let i = 0; i < this._nodes.length; i++) {
            const node = this._nodes[i].node;
            const probes = this._nodes[i].probes;
            const worldPosition = node.worldPosition;

            if (!probes) {
                continue;
            }

            for (let j = 0; j < probes.length; j++) {
                const position = new Vec3(0, 0, 0);
                Vec3.add(position, probes[j], worldPosition);
                points.push(position);
            }
        }

        const pointCount = points.length;
        if (pointCount < 4) {
            this.resetAllTetraIndices();
            this._data!.reset();
            return;
        }

        this._data!.updateProbes(points);

        if (updateTet) {
            this.resetAllTetraIndices();
            this._data!.updateTetrahedrons();
        }
    }

    private clearAllSHUBOs (): void {
        if (!this._scene) {
            return;
        }

        const renderScene = this._scene.renderScene;
        if (!renderScene) {
            return;
        }

        const models = renderScene.models;
        for (let i = 0; i < models.length; i++) {
            models[i].clearSHUBOs();
        }
    }

    private resetAllTetraIndices (): void {
        if (!this._scene) {
            return;
        }

        const renderScene = this._scene.renderScene;
        if (!renderScene) {
            return;
        }

        const models = renderScene.models;
        for (let i = 0; i < models.length; i++) {
            models[i].tetrahedronIndex = -1;
        }
    }
}

/**
 * @en All scene related global parameters, it affects all content in the corresponding scene
 * @zh 各类场景级别的渲染参数，将影响全场景的所有物体
 */
@ccclass('cc.SceneGlobals')
export class SceneGlobals {
    /**
     * @en The environment lighting configuration
     * @zh 场景的环境光照相关配置
     */
    @serializable
    @editable
    public ambient = new AmbientInfo();
    /**
     * @en Scene level shadow related configuration
     * @zh 平面阴影相关配置
     */
    @serializable
    @editable
    public shadows = new ShadowsInfo();
    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    @serializable
    public _skybox = new SkyboxInfo();
    /**
     * @en Global fog configuration
     * @zh 全局雾相关配置
     */
    @editable
    @serializable
    public fog = new FogInfo();

    /**
     * @en Skybox related configuration
     * @zh 天空盒相关配置
     */
    @editable
    @type(SkyboxInfo)
    get skybox (): SkyboxInfo {
        return this._skybox;
    }
    set skybox (value) {
        this._skybox = value;
    }

    /**
     * @en Octree related configuration
     * @zh 八叉树相关配置
     */
    @editable
    @serializable
    public octree = new OctreeInfo();

    /**
     * @en Octree related configuration
     * @zh 八叉树相关配置
     */
    @editable
    @serializable
    public skin = new SkinInfo();

    /**
     * @en Light probe related configuration
     * @zh 光照探针相关配置
     */
    @editable
    @serializable
    public lightProbeInfo = new LightProbeInfo();

    /**
     * @en Tone mapping related configuration
     * @zh 色调映射相关配置
     */
    @editable
    @serializable
    public postSettings = new PostSettingsInfo();

    /**
     * @en bake with stationary main light
     * @zh 主光源是否以静止状态烘培
     */
    @editable
    @serializable
    public bakedWithStationaryMainLight = false;

    /**
     * @en bake lightmap with highp mode
     * @zh 是否使用高精度模式烘培光照图
     */
    @editable
    @serializable
    public bakedWithHighpLightmap = false;

    /**
     * @en disable light map
     * @zh 关闭光照图效果
     */
    public disableLightmap = false;

    /**
     * @en Activate and initialize the global configurations of the scene, no need to invoke manually.
     * @zh 启用和初始化场景全局配置，不需要手动调用
     */
    public activate (scene: Scene): void {
        const sceneData = (legacyCC.director.root as Root).pipeline.pipelineSceneData;
        this.skybox.activate(sceneData.skybox);
        this.ambient.activate(sceneData.ambient);

        this.shadows.activate(sceneData.shadows);
        this.fog.activate(sceneData.fog);
        this.octree.activate(sceneData.octree);
        this.skin.activate(sceneData.skin);
        this.postSettings.activate(sceneData.postSettings);
        if (this.lightProbeInfo && sceneData.lightProbes) {
            this.lightProbeInfo.activate(scene, sceneData.lightProbes as LightProbes);
        }

        const root = legacyCC.director.root as Root;
        root.onGlobalPipelineStateChanged();
    }
}
legacyCC.SceneGlobals = SceneGlobals;
