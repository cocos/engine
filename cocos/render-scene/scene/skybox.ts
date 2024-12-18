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

import { builtinResMgr } from '../../asset/asset-manager/builtin-res-mgr';
import { Material } from '../../asset/assets/material';
import { Mesh } from '../../3d/assets/mesh';
import { TextureCube } from '../../asset/assets/texture-cube';
import { UNIFORM_ENVIRONMENT_BINDING, UNIFORM_DIFFUSEMAP_BINDING } from '../../rendering/define';
import { MaterialInstance } from '../core/material-instance';
import { Model } from './model';
import type { SkyboxInfo } from '../../scene-graph/scene-globals';
import { Root } from '../../root';
import { GlobalDSManager } from '../../rendering/global-descriptor-set-manager';
import { deviceManager } from '../../gfx';
import { Enum, cclegacy } from '../../core';

let skybox_mesh: Mesh | null = null;
let skybox_material: Material | null = null;

export enum EnvironmentLightingType {
    /**
     * @zh
     * 半球漫反射
     * @en
     * hemisphere diffuse
     * @readonly
     */
    HEMISPHERE_DIFFUSE = 0,
    /**
     * @zh
     * 半球漫反射和环境反射
     * @en
     * hemisphere diffuse and Environment reflection
     * @readonly
     */
    AUTOGEN_HEMISPHERE_DIFFUSE_WITH_REFLECTION = 1,
    /**
     * @zh
     * 漫反射卷积图和环境反射
     * @en
     * diffuse convolution map and environment reflection
     * @readonly
     */
    DIFFUSEMAP_WITH_REFLECTION = 2,
}
Enum(EnvironmentLightingType);

/**
 * @en The skybox configuration of the render scene,
 * currently some rendering options like hdr and ibl lighting configuration is also here.
 * @zh 渲染场景的天空盒配置，目前一些渲染配置，比如 HDR 模式和环境光照配置也在 Skybox 中。
 */
export class Skybox {
    /**
     * @en The Model object of the skybox
     * @zh 天空盒的 Model 对象
     */
    get model (): Model | null {
        return this._model;
    }

    /**
     * @en Whether activate skybox in the scene
     * @zh 是否启用天空盒？
     */
    get enabled (): boolean {
        return this._enabled;
    }

    set enabled (val: boolean) {
        this._enabled = val;
        if (val) this.activate(); else this._updatePipeline();
    }

    /**
     * @en Whether HDR mode is enabled
     * @zh 是否启用HDR？
     */
    get useHDR (): boolean {
        return this._useHDR;
    }

    set useHDR (val: boolean) {
        this._useHDR = val;
        this.setEnvMaps(this._envmapHDR, this._envmapLDR);
    }

    /**
     * @en Whether use image based lighting for PBR materials
     * @zh 是否启用IBL？
     */
    get useIBL (): boolean {
        return this._useIBL;
    }

    set useIBL (val: boolean) {
        this._useIBL = val;
        this._updatePipeline();
    }

    /**
     * @en Whether use diffuse convolution map lighting
     * @zh 是否为IBL启用漫反射卷积图？
     */
    get useDiffuseMap (): boolean {
        return this._useDiffuseMap;
    }

    set useDiffuseMap (val: boolean) {
        this._useDiffuseMap = val;
        this._updatePipeline();
    }

    /**
     * @en Whether enable RGBE data support in skybox shader
     * @zh 是否需要开启 shader 内的 RGBE 数据支持？
     */
    get isRGBE (): boolean {
        if (this.envmap) {
            return this.envmap.isRGBE;
        } else {
            return false;
        }
    }

    /**
     * @en Whether to use offline baked convolutional maps
     * @zh 是否使用离线烘焙的卷积图？
     */
    get useConvolutionMap (): boolean {
        if (this.reflectionMap) {
            return this.reflectionMap.isUsingOfflineMipmaps();
        }
        if (this.envmap) {
            return this.envmap.isUsingOfflineMipmaps();
        }
        return false;
    }

    /**
     * @en The texture cube used for the skybox
     * @zh 使用的立方体贴图
     */
    get envmap (): TextureCube | null {
        const isHDR = (cclegacy.director.root as Root).pipeline.pipelineSceneData.isHDR;
        if (isHDR) {
            return this._envmapHDR;
        } else {
            return this._envmapLDR;
        }
    }
    set envmap (val: TextureCube | null) {
        const root = cclegacy.director.root as Root;
        const isHDR = root.pipeline.pipelineSceneData.isHDR;
        if (isHDR) {
            this.setEnvMaps(val, this._envmapLDR);
        } else {
            this.setEnvMaps(this._envmapHDR, val);
        }
    }

    /**
     * @en The texture cube used diffuse convolution map
     * @zh 使用的漫反射卷积图
     */
    get diffuseMap (): TextureCube | null {
        const isHDR = (cclegacy.director.root as Root).pipeline.pipelineSceneData.isHDR;
        if (isHDR) {
            return this._diffuseMapHDR;
        } else {
            return this._diffuseMapLDR;
        }
    }
    set diffuseMap (val: TextureCube | null) {
        const isHDR = (cclegacy.director.root as Root).pipeline.pipelineSceneData.isHDR;
        if (isHDR) {
            this.setDiffuseMaps(val, this._diffuseMapLDR);
        } else {
            this.setDiffuseMaps(this._diffuseMapHDR, val);
        }
    }

    get reflectionMap (): TextureCube | null {
        const isHDR = (cclegacy.director.root as Root).pipeline.pipelineSceneData.isHDR;
        if (isHDR) {
            return this._reflectionHDR;
        } else {
            return this._reflectionLDR;
        }
    }

    get editableMaterial (): MaterialInstance | null {
        return this._editableMaterial;
    }

    protected _envmapLDR: TextureCube | null = null;
    protected _envmapHDR: TextureCube | null = null;
    protected _diffuseMapLDR: TextureCube | null = null;
    protected _diffuseMapHDR: TextureCube | null = null;
    protected _globalDSManager: GlobalDSManager | null = null;
    protected _model: Model | null = null;
    protected _default: TextureCube | null = null;
    protected _enabled = false;
    protected _useIBL = false;
    protected _useHDR = true;
    protected _useDiffuseMap = false;
    protected _editableMaterial: MaterialInstance | null = null;
    protected _activated = false;
    protected _reflectionHDR: TextureCube | null = null;
    protected _reflectionLDR: TextureCube | null = null;
    protected _rotationAngle = 0;

    public initialize (skyboxInfo: SkyboxInfo): void {
        this._activated = false;
        this._enabled = skyboxInfo.enabled;
        this._useIBL = skyboxInfo.useIBL;
        this._useDiffuseMap = skyboxInfo.applyDiffuseMap;
        this._useHDR = skyboxInfo.useHDR;
    }

    /**
     * @en Set the environment maps for HDR and LDR mode
     * @zh 为 HDR 和 LDR 模式设置环境贴图
     * @param envmapHDR @en Environment map for HDR mode @zh HDR 模式下的环境贴图
     * @param envmapLDR @en Environment map for LDR mode @zh LDR 模式下的环境贴图
     */
    public setEnvMaps (envmapHDR: TextureCube | null, envmapLDR: TextureCube | null): void {
        this._envmapHDR = envmapHDR;
        this._envmapLDR = envmapLDR;

        this._updateGlobalBinding();
        this._updatePipeline();
    }

    /**
     * @en Set the diffuse maps
     * @zh 设置环境光漫反射贴图
     * @param diffuseMapHDR @en Diffuse map for HDR mode @zh HDR 模式下的漫反射贴图
     * @param diffuseMapLDR  @en Diffuse map for LDR mode @zh LDR 模式下的漫反射贴图
     */
    public setDiffuseMaps (diffuseMapHDR: TextureCube | null, diffuseMapLDR: TextureCube | null): void {
        this._diffuseMapHDR = diffuseMapHDR;
        this._diffuseMapLDR = diffuseMapLDR;
        this._updateGlobalBinding();
        this._updatePipeline();
    }

    /**
     * @en Set custom skybox material
     * @zh 设置自定义的天空盒材质
     * @param skyboxMat  @en Skybox material @zh 天空盒材质
     */
    public setSkyboxMaterial (skyboxMat: Material | null): void {
        if (skyboxMat) {
            this._editableMaterial = new MaterialInstance({ parent: skyboxMat });
            this._editableMaterial.recompileShaders({ USE_RGBE_CUBEMAP: this.isRGBE });
        } else {
            this._editableMaterial = null;
        }
        this._updatePipeline();
    }

    /**
     * @en Set the environment reflection convolution map
     * @zh 设置环境反射卷积图
     * @param reflectionHDR  @en Reflection convolution map for HDR mode @zh HDR 模式下的反射卷积图
     * @param reflectionLDR  @en Reflection convolution map for LDR mode @zh LDR 模式下的反射卷积图
     */
    public setReflectionMaps (reflectionHDR: TextureCube | null, reflectionLDR: TextureCube | null): void {
        this._reflectionHDR = reflectionHDR;
        this._reflectionLDR = reflectionLDR;
        this._updateGlobalBinding();
        this._updatePipeline();
    }

    /**
     * @en Set skybox rotation angle
     * @zh 设置天空盒旋转角度
     * @param angle  @en rotation angle @zh 旋转角度
     */
    public setRotationAngle (angle: number): void {
        this._rotationAngle = angle;
    }

    public getRotationAngle (): number {
        return this._rotationAngle;
    }

    public updateMaterialRenderInfo (): void {
        this._updateGlobalBinding();
        this._updatePipeline();
    }

    public activate (): void {
        const pipeline = cclegacy.director.root.pipeline;
        this._globalDSManager = pipeline.globalDSManager;
        this._default = builtinResMgr.get<TextureCube>('default-cube-texture');

        if (!this._model) {
            this._model = (cclegacy.director.root as Root).createModel(cclegacy.renderer.scene.Model as typeof Model);
            //The skybox material has added properties of 'environmentMap' that need local ubo
            //this._model._initLocalDescriptors = () => {};
            //this._model._initWorldBoundDescriptors = () => {};
        }
        let isRGBE = this._default.isRGBE;
        let isUseConvolutionMap = this._default.isUsingOfflineMipmaps();
        if (this.envmap) {
            isRGBE = this.envmap.isRGBE;
            isUseConvolutionMap = this.envmap.isUsingOfflineMipmaps();
        }

        if (!skybox_material) {
            const mat = new Material();
            mat.initialize({ effectName: 'pipeline/skybox', defines: { USE_RGBE_CUBEMAP: isRGBE } });
            skybox_material = new MaterialInstance({ parent: mat });
        }

        if (this.enabled) {
            if (!skybox_mesh) {
                skybox_mesh = cclegacy.utils.createMesh(cclegacy.primitives.box({ width: 2, height: 2, length: 2 })) as Mesh;
            }
            if (this._editableMaterial) {
                this._model.initSubModel(0, skybox_mesh.renderingSubMeshes[0], this._editableMaterial);
            } else {
                this._model.initSubModel(0, skybox_mesh.renderingSubMeshes[0], skybox_material);
            }
        }

        if (!this.envmap) {
            this.envmap = this._default;
        }

        if (!this.diffuseMap) {
            this.diffuseMap = this._default;
        }

        this._updateGlobalBinding();
        this._updatePipeline();

        this._activated = true;
    }

    protected _updatePipeline (): void {
        const root = cclegacy.director.root as Root;
        const pipeline = root.pipeline;

        const useIBLValue = this.useIBL ? (this.isRGBE ? 2 : 1) : 0;
        const useDiffuseMapValue = (this.useIBL && this.useDiffuseMap && this.diffuseMap && this.diffuseMap !== this._default)
            ? (this.isRGBE ? 2 : 1) : 0;
        const useHDRValue = this.useHDR;
        const useConvMapValue = this.useConvolutionMap;

        if (pipeline.macros.CC_USE_IBL !== useIBLValue
            || pipeline.macros.CC_USE_DIFFUSEMAP !== useDiffuseMapValue
            || pipeline.macros.CC_USE_HDR !== useHDRValue
            || pipeline.macros.CC_IBL_CONVOLUTED !== useConvMapValue) {
            pipeline.macros.CC_USE_IBL = useIBLValue;
            pipeline.macros.CC_USE_DIFFUSEMAP = useDiffuseMapValue;
            pipeline.macros.CC_USE_HDR = useHDRValue;
            pipeline.macros.CC_IBL_CONVOLUTED = useConvMapValue;

            if (this._activated) {
                root.onGlobalPipelineStateChanged();
            }
        }

        if (this.enabled) {
            const envmap = this.envmap ? this.envmap : this._default;
            const skyboxMat = this._editableMaterial ? this._editableMaterial : skybox_material;
            if (skyboxMat) {
                skyboxMat.setProperty('environmentMap', envmap);
                skyboxMat.recompileShaders({ USE_RGBE_CUBEMAP: this.isRGBE });
            }
            if (this._model) {
                this._model.setSubModelMaterial(0, skyboxMat!);
                this._updateSubModes();
            }
        }
    }

    protected _updateGlobalBinding (): void {
        if (this._globalDSManager) {
            const device = deviceManager.gfxDevice;
            if (this.reflectionMap) {
                const texture = this.reflectionMap.getGFXTexture()!;
                const sampler = device.getSampler(this.reflectionMap.getSamplerInfo());
                this._globalDSManager.bindSampler(UNIFORM_ENVIRONMENT_BINDING, sampler);
                this._globalDSManager.bindTexture(UNIFORM_ENVIRONMENT_BINDING, texture);
            } else {
                const envmap = this.envmap ? this.envmap : this._default;
                if (envmap) {
                    const texture = envmap.getGFXTexture()!;
                    const sampler = device.getSampler(envmap.getSamplerInfo());
                    this._globalDSManager.bindSampler(UNIFORM_ENVIRONMENT_BINDING, sampler);
                    this._globalDSManager.bindTexture(UNIFORM_ENVIRONMENT_BINDING, texture);
                }
            }

            const diffuseMap = this.diffuseMap ? this.diffuseMap : this._default;
            if (diffuseMap) {
                const texture = diffuseMap.getGFXTexture()!;
                const sampler = device.getSampler(diffuseMap.getSamplerInfo());
                this._globalDSManager.bindSampler(UNIFORM_DIFFUSEMAP_BINDING, sampler);
                this._globalDSManager.bindTexture(UNIFORM_DIFFUSEMAP_BINDING, texture);
            }

            this._globalDSManager.update();
        }
    }

    protected _updateSubModes (): void {
        if (this._model) {
            const subModels = this._model.subModels;
            for (let i = 0; i < subModels.length; i++) {
                subModels[i].update();
            }
        }
    }
}

cclegacy.Skybox = Skybox;
