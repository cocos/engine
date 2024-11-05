import { Mat4, RecyclePool, IVec4Like, IMat4Like, IVec2Like,
    Color as CoreColor, assert, cclegacy, Quat, Vec4, Vec2, Vec3, toRadian } from '../../core';
import { Color, CommandBuffer, DescriptorSet, Buffer, Device, PipelineState, RenderPass,
    Sampler, Texture, deviceManager, Shader, InputAssembler } from '../../gfx';
import { IMacroPatch, Pass, RenderScene } from '../../render-scene';
import { Camera, CSMLevel, DirectionalLight, Light, LightType, Model, PCFType, PointLight,
    RangedDirectionalLight, Shadows, ShadowType, SphereLight, SpotLight, SubModel } from '../../render-scene/scene';
import { Root } from '../../root';
import { SetIndex, supportsR32FloatTexture } from '../define';
import { InstancedBuffer } from '../instanced-buffer';
import { PipelineStateManager } from '../pipeline-state-manager';
import { LayoutGraphData } from './layout-graph';
import { RenderData } from './render-graph';
import { SceneFlags, UpdateFrequency } from './types';
import { Setter } from './pipeline';
import { PipelineSceneData } from '../pipeline-scene-data';
import { CSMLayers, CSMShadowLayer } from '../shadow/csm-layers';
import { builtinResMgr } from '../../asset/asset-manager';
import { TextureCube } from '../../asset/assets';

const _uboVec = new Vec4();
const _uboVec3 = new Vec3();
const _uboCol = new Color();
const _matView = new Mat4();
const _mulMatView = new Mat4();
export function setTextureUBOView (setter: WebSetter, cfg: Readonly<PipelineSceneData>, layout = 'default'): void {
    const skybox = cfg.skybox;
    const director = cclegacy.director;
    const root = director.root;
    const pipeline = root.pipeline;
    if (skybox.reflectionMap) {
        const texture = skybox.reflectionMap.getGFXTexture()!;
        const sampler: Sampler = root.device.getSampler(skybox.reflectionMap.getSamplerInfo());
        setter.setTexture('cc_environment', texture);
        setter.setSampler('cc_environment', sampler);
    } else {
        const envmap = skybox.envmap ? skybox.envmap : builtinResMgr.get<TextureCube>('default-cube-texture');
        if (envmap) {
            const texture = envmap.getGFXTexture()!;
            const sampler: Sampler = root.device.getSampler(envmap.getSamplerInfo());
            setter.setTexture('cc_environment', texture);
            setter.setSampler('cc_environment', sampler);
        }
    }
    const diffuseMap = skybox.diffuseMap ? skybox.diffuseMap : builtinResMgr.get<TextureCube>('default-cube-texture');
    if (diffuseMap) {
        const texture = diffuseMap.getGFXTexture()!;
        const sampler: Sampler = root.device.getSampler(diffuseMap.getSamplerInfo());
        setter.setTexture('cc_diffuseMap', texture);
        setter.setSampler('cc_diffuseMap', sampler);
    }
    if (!setter.hasSampler('cc_shadowMap')) {
        setter.setSampler('cc_shadowMap', pipeline.defaultSampler as Sampler);
    }
    if (!setter.hasTexture('cc_shadowMap')) {
        setter.setTexture('cc_shadowMap', pipeline.defaultShadowTexture as Texture);
    }
    if (!setter.hasSampler('cc_spotShadowMap')) {
        setter.setSampler('cc_spotShadowMap', pipeline.defaultSampler as Sampler);
    }
    if (!setter.hasTexture('cc_spotShadowMap')) {
        setter.setTexture('cc_spotShadowMap', pipeline.defaultShadowTexture as Texture);
    }
}

export function setCameraUBOValues (
    setter: WebSetter,
    camera: Readonly<Camera> | null,
    cfg: Readonly<PipelineSceneData>,
    scene: RenderScene | null,
    layoutName = 'default',
): void {
    const director = cclegacy.director;
    const root = director.root;
    const pipeline = root.pipeline;
    const shadowInfo = cfg.shadows;
    const skybox = cfg.skybox;
    const shadingScale = cfg.shadingScale;
    // Camera
    if (camera) {
        setter.setMat4('cc_matView', camera.matView);
        setter.setMat4('cc_matViewInv', camera.node.worldMatrix);
        setter.setMat4('cc_matProj', camera.matProj);
        setter.setMat4('cc_matProjInv', camera.matProjInv);
        setter.setMat4('cc_matViewProj', camera.matViewProj);
        setter.setMat4('cc_matViewProjInv', camera.matViewProjInv);
        _uboVec.set(
            camera.surfaceTransform,
            camera.cameraUsage,
            Math.cos(toRadian(skybox.getRotationAngle())),
            Math.sin(toRadian(skybox.getRotationAngle())),
        );
        setter.setVec4('cc_surfaceTransform', _uboVec);
        _uboVec.set(camera.exposure, 1.0 / camera.exposure, cfg.isHDR ? 1.0 : 0.0, 1.0 / Camera.standardExposureValue);
        setter.setVec4('cc_exposure', _uboVec);
    }
    if (camera) {
        _uboVec.set(camera.position.x, camera.position.y, camera.position.z, pipeline.getCombineSignY() as number);
    } else {
        _uboVec.set(0, 0, 0, pipeline.getCombineSignY() as number);
    }
    setter.setVec4('cc_cameraPos', _uboVec);
    _uboVec.set(cfg.shadingScale, cfg.shadingScale, 1.0 / cfg.shadingScale, 1.0 / cfg.shadingScale);
    setter.setVec4('cc_screenScale', _uboVec);
    const mainLight = scene && scene.mainLight;
    if (mainLight) {
        const shadowEnable = (mainLight.shadowEnabled && shadowInfo.type === ShadowType.ShadowMap) ? 1.0 : 0.0;
        _uboVec.set(mainLight.direction.x, mainLight.direction.y, mainLight.direction.z, shadowEnable);
        setter.setVec4('cc_mainLitDir', _uboVec);
        let r = mainLight.color.x;
        let g = mainLight.color.y;
        let b = mainLight.color.z;
        if (mainLight.useColorTemperature) {
            r *= mainLight.colorTemperatureRGB.x;
            g *= mainLight.colorTemperatureRGB.y;
            b *= mainLight.colorTemperatureRGB.z;
        }
        let w = mainLight.illuminance;
        if (cfg.isHDR && camera) {
            w *= camera.exposure;
        }
        _uboVec.set(r, g, b, w);
        setter.setVec4('cc_mainLitColor', _uboVec);
    } else {
        _uboVec.set(0, 0, 1, 0);
        setter.setVec4('cc_mainLitDir', _uboVec);
        _uboVec.set(0, 0, 0, 0);
        setter.setVec4('cc_mainLitColor', _uboVec);
    }

    const ambient = cfg.ambient;
    const skyColor = ambient.skyColor;
    if (cfg.isHDR) {
        skyColor.w = ambient.skyIllum * (camera ? camera.exposure : 1);
    } else {
        skyColor.w = ambient.skyIllum;
    }
    _uboVec.set(skyColor.x, skyColor.y, skyColor.z, skyColor.w);
    setter.setVec4('cc_ambientSky', _uboVec);
    _uboVec.set(ambient.groundAlbedo.x, ambient.groundAlbedo.y, ambient.groundAlbedo.z, skybox.envmap ? skybox.envmap?.mipmapLevel : 1.0);
    setter.setVec4('cc_ambientGround', _uboVec);
    const fog = cfg.fog;
    const colorTempRGB = fog.colorArray;
    _uboVec.set(colorTempRGB.x, colorTempRGB.y, colorTempRGB.z, colorTempRGB.z);
    setter.setVec4('cc_fogColor', _uboVec);
    _uboVec.set(fog.fogStart, fog.fogEnd, fog.fogDensity, 0.0);
    setter.setVec4('cc_fogBase', _uboVec);
    _uboVec.set(fog.fogTop, fog.fogRange, fog.fogAtten, 0.0);
    setter.setVec4('cc_fogAdd', _uboVec);
    if (camera) {
        _uboVec.set(camera.nearClip, camera.farClip, camera.getClipSpaceMinz(), 0.0);
        setter.setVec4('cc_nearFar', _uboVec);
        _uboVec.set(
            camera.viewport.x,
            camera.viewport.y,
            shadingScale * camera.window.width * camera.viewport.z,
            shadingScale * camera.window.height * camera.viewport.w,
        );
        setter.setVec4('cc_viewPort', _uboVec);
    }
}

export class DrawInstance {
    subModel: SubModel | null;
    priority: number;
    hash: number;
    depth: number;
    shaderID: number;
    passIndex: number;

    constructor (
        subModel: SubModel | null = null,
        priority = 0,
        hash = 0,
        depth = 0,
        shaderID = 0,
        passIndex = 0,
    ) {
        this.subModel = subModel;
        this.priority = priority;
        this.hash = hash;
        this.depth = depth;
        this.shaderID = shaderID;
        this.passIndex = passIndex;
    }
    update (
        subModel: SubModel | null = null,
        priority = 0,
        hash = 0,
        depth = 0,
        shaderID = 0,
        passIndex = 0,
    ): void {
        this.subModel = subModel;
        this.priority = priority;
        this.hash = hash;
        this.depth = depth;
        this.shaderID = shaderID;
        this.passIndex = passIndex;
    }
}

export const instancePool = new RecyclePool(() => new DrawInstance(), 8);

const CC_USE_RGBE_OUTPUT = 'CC_USE_RGBE_OUTPUT';
function getLayoutId (passLayout: string, phaseLayout: string): number {
    const r = cclegacy.rendering;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return r.getPhaseID(r.getPassID(passLayout), phaseLayout);
}
function getPassIndexFromLayout (subModel: SubModel, phaseLayoutId: number): number {
    const passes = subModel.passes;
    for (let k = 0; k < passes.length; k++) {
        if ((passes[k].phaseID === phaseLayoutId)) {
            return k;
        }
    }
    return -1;
}

export class ProbeHelperQueue {
    probeMap: Array<SubModel> = new Array<SubModel>();
    defaultId: number = getLayoutId('default', 'default');

    clear (): void {
        this.probeMap.length = 0;
    }

    applyMacro (): void {
        for (const subModel of this.probeMap) {
            let patches: IMacroPatch[] = [
                { name: CC_USE_RGBE_OUTPUT, value: true },
            ];
            if (subModel.patches) {
                patches = patches.concat(subModel.patches);
            }
            subModel.onMacroPatchesStateChanged(patches);
        }
    }
    removeMacro (): void {
        for (const subModel of this.probeMap) {
            if (!subModel.patches) continue;
            const patches = subModel.patches.filter(
                (patch) => patch.name !== CC_USE_RGBE_OUTPUT,
            );
            if (patches.length === 0) {
                subModel.onMacroPatchesStateChanged(null);
            } else {
                subModel.onMacroPatchesStateChanged(patches);
            }
        }
    }
    addToProbeQueue (model: Model, probeLayoutId: number): void {
        const subModels = model.subModels;
        for (let j = 0; j < subModels.length; j++) {
            const subModel: SubModel = subModels[j];

            //Filter transparent objects
            const isTransparent = subModel.passes[0].blendState.targets[0].blend;
            if (isTransparent) {
                continue;
            }

            let passIdx = getPassIndexFromLayout(subModel, probeLayoutId);
            let bUseReflectPass = true;
            if (passIdx < 0) {
                probeLayoutId = this.defaultId;
                passIdx = getPassIndexFromLayout(subModel, probeLayoutId);
                bUseReflectPass = false;
            }
            if (passIdx < 0) { continue; }
            if (!bUseReflectPass) {
                this.probeMap.push(subModel);
            }
        }
    }
}

export function setShadowUBOLightView (
    setter: WebSetter,
    camera: Camera | null,
    light: Light,
    csmLevel: number,
    layout = 'default',
): void {
    const director = cclegacy.director;
    const pipeline = (director.root as Root).pipeline;
    const device = pipeline.device;
    const sceneData = pipeline.pipelineSceneData;

    const shadowInfo = sceneData.shadows;
    if (shadowInfo.type === ShadowType.Planar) {
        return;
    }
    const csmLayers = sceneData.csmLayers;
    const packing = supportsR32FloatTexture(device) ? 0.0 : 1.0;
    const cap = pipeline.device.capabilities;
    // ShadowMap
    if (shadowInfo.enabled) {
        if (shadowInfo.type === ShadowType.ShadowMap) {
            // update CSM layers
            if (light && light.node && light.type === LightType.DIRECTIONAL) {
                csmLayers.update(sceneData, camera!);
            }
        }
    }
    switch (light.type) {
    case LightType.DIRECTIONAL: {
        const mainLight = light as DirectionalLight;
        if (shadowInfo.enabled && mainLight && mainLight.shadowEnabled) {
            if (shadowInfo.type === ShadowType.ShadowMap) {
                let near = 0.1;
                let far = 0;
                let matShadowView: Mat4;
                let matShadowProj: Mat4;
                let matShadowViewProj: Mat4;
                let levelCount = 0;
                if (mainLight.shadowFixedArea || mainLight.csmLevel === CSMLevel.LEVEL_1) {
                    matShadowView = csmLayers.specialLayer.matShadowView;
                    matShadowProj = csmLayers.specialLayer.matShadowProj;
                    matShadowViewProj = csmLayers.specialLayer.matShadowViewProj;
                    if (mainLight.shadowFixedArea) {
                        near = mainLight.shadowNear;
                        far = mainLight.shadowFar;
                        levelCount = 0;
                    } else {
                        near = 0.1;
                        far = csmLayers.specialLayer.shadowCameraFar;
                        levelCount = 1;
                    }
                    _uboVec.set(LightType.DIRECTIONAL, packing, mainLight.shadowNormalBias, 0);
                    setter.setVec4('cc_shadowLPNNInfo', _uboVec);
                } else {
                    const layer = csmLayers.layers[csmLevel];
                    matShadowView = layer.matShadowView;
                    matShadowProj = layer.matShadowProj;
                    matShadowViewProj = layer.matShadowViewProj;

                    near = layer.splitCameraNear;
                    far = layer.splitCameraFar;
                    levelCount = mainLight.csmLevel;
                }
                setter.setMat4('cc_matLightView', matShadowView);
                _uboVec.set(matShadowProj.m10, matShadowProj.m14, matShadowProj.m11, matShadowProj.m15);
                setter.setVec4('cc_shadowProjDepthInfo', _uboVec);
                _uboVec.set(matShadowProj.m00, matShadowProj.m05, 1.0 / matShadowProj.m00, 1.0 / matShadowProj.m05);
                setter.setVec4('cc_shadowProjInfo', _uboVec);
                setter.setMat4('cc_matLightViewProj', matShadowViewProj);
                _uboVec.set(near, far, 0, 1.0 - mainLight.shadowSaturation);
                setter.setVec4('cc_shadowNFLSInfo', _uboVec);
                _uboVec.set(LightType.DIRECTIONAL, packing, mainLight.shadowNormalBias, levelCount);
                setter.setVec4('cc_shadowLPNNInfo', _uboVec);
                _uboVec.set(shadowInfo.size.x, shadowInfo.size.y, mainLight.shadowPcf, mainLight.shadowBias);
                setter.setVec4('cc_shadowWHPBInfo', _uboVec);
            }
        }
        break;
    }
    case LightType.SPOT: {
        const spotLight = light as SpotLight;
        if (shadowInfo.enabled && spotLight && spotLight.shadowEnabled) {
            Mat4.invert(_matView, spotLight.node!.getWorldMatrix());
            setter.setMat4('cc_matLightView', _matView);
            Mat4.perspective(
                _mulMatView,
                spotLight.angle,
                1.0,
                0.001,
                spotLight.range,
                true,
                cap.clipSpaceMinZ,
                cap.clipSpaceSignY,
                0,
            );
            const matShadowInvProj: Mat4 = _mulMatView.clone().invert();
            const matShadowProj: Mat4 = _mulMatView.clone();

            Mat4.multiply(_matView, _mulMatView, _matView);
            setter.setMat4('cc_matLightViewProj', _matView);
            _uboVec.set(0.01, (light as SpotLight).range, 0.0, 0.0);
            setter.setVec4('cc_shadowNFLSInfo', _uboVec);
            _uboVec.set(shadowInfo.size.x, shadowInfo.size.y, spotLight.shadowPcf, spotLight.shadowBias);
            setter.setVec4('cc_shadowWHPBInfo', _uboVec);
            _uboVec.set(LightType.SPOT, packing, spotLight.shadowNormalBias, 0.0);
            setter.setVec4('cc_shadowLPNNInfo', _uboVec);
            _uboVec.set(matShadowProj.m10, matShadowProj.m14, matShadowProj.m11, matShadowProj.m15);
            setter.setVec4('cc_shadowProjDepthInfo', _uboVec);
            _uboVec.set(matShadowInvProj.m10, matShadowInvProj.m14, matShadowInvProj.m11, matShadowInvProj.m15);
            setter.setVec4('cc_shadowInvProjDepthInfo', _uboVec);
            _uboVec.set(matShadowProj.m00, matShadowProj.m05, 1.0 / matShadowProj.m00, 1.0 / matShadowProj.m05);
            setter.setVec4('cc_shadowProjInfo', _uboVec);
        }
        break;
    }
    case LightType.SPHERE: {
        _uboVec.set(shadowInfo.size.x, shadowInfo.size.y, 1.0, 0.0);
        setter.setVec4('cc_shadowWHPBInfo', _uboVec);
        _uboVec.set(LightType.SPHERE, packing, 0.0, 0.0);
        setter.setVec4('cc_shadowLPNNInfo', _uboVec);
        break;
    }
    case LightType.POINT: {
        _uboVec.set(shadowInfo.size.x, shadowInfo.size.y, 1.0, 0.0);
        setter.setVec4('cc_shadowWHPBInfo', _uboVec);
        _uboVec.set(LightType.POINT, packing, 0.0, 0.0);
        setter.setVec4('cc_shadowLPNNInfo', _uboVec);
        break;
    }
    default:
    }
    _uboCol.set(shadowInfo.shadowColor.x, shadowInfo.shadowColor.y, shadowInfo.shadowColor.z, shadowInfo.shadowColor.w);
    setter.setColor('cc_shadowColor', _uboCol);
}

function getPCFRadius (shadowInfo: Shadows, mainLight: DirectionalLight): number {
    const shadowMapSize = shadowInfo.size.x;
    switch (mainLight.shadowPcf) {
    case PCFType.HARD:
        return 0.0;
    case PCFType.SOFT:
        return 1.0 / (shadowMapSize * 0.5);
    case PCFType.SOFT_2X:
        return 2.0 / (shadowMapSize * 0.5);
    case PCFType.SOFT_4X:
        return 3.0 / (shadowMapSize * 0.5);
    default:
    }
    return 0.0;
}
export function setShadowUBOView (setter: WebSetter, camera: Camera | null, layout = 'default'): void {
    const director = cclegacy.director;
    const pipeline = director.root.pipeline;
    const device: Device = pipeline.device;
    const scene = director.getScene();
    const mainLight: DirectionalLight = camera && camera.scene ? camera.scene.mainLight : scene ? scene.renderScene.mainLight : null;
    const sceneData = pipeline.pipelineSceneData;
    const shadowInfo: Shadows = sceneData.shadows;
    const csmLayers: CSMLayers = sceneData.csmLayers;
    const csmSupported = sceneData.csmSupported;
    const packing = supportsR32FloatTexture(device) ? 0.0 : 1.0;
    if (mainLight && shadowInfo.enabled) {
        if (shadowInfo.type === ShadowType.ShadowMap) {
            if (mainLight.shadowEnabled) {
                if (mainLight.shadowFixedArea || mainLight.csmLevel === CSMLevel.LEVEL_1 || !csmSupported) {
                    const matShadowView: Mat4 = csmLayers.specialLayer.matShadowView;
                    const matShadowProj: Mat4 = csmLayers.specialLayer.matShadowProj;
                    const matShadowViewProj: Mat4 = csmLayers.specialLayer.matShadowViewProj;
                    const near: number = mainLight.shadowNear;
                    const far: number = mainLight.shadowFar;
                    setter.setMat4('cc_matLightView', matShadowView);
                    _uboVec.set(matShadowProj.m10, matShadowProj.m14, matShadowProj.m11, matShadowProj.m15);
                    setter.setVec4('cc_shadowProjDepthInfo', _uboVec);
                    _uboVec.set(matShadowProj.m00, matShadowProj.m05, 1.0 / matShadowProj.m00, 1.0 / matShadowProj.m05);
                    setter.setVec4('cc_shadowProjInfo', _uboVec);
                    setter.setMat4('cc_matLightViewProj', matShadowViewProj);
                    _uboVec.set(near, far, 0, 1.0 - mainLight.shadowSaturation);
                    setter.setVec4('cc_shadowNFLSInfo', _uboVec);
                    _uboVec.set(LightType.DIRECTIONAL, packing, mainLight.shadowNormalBias, 0);
                    setter.setVec4('cc_shadowLPNNInfo', _uboVec);
                } else {
                    const layerThreshold = getPCFRadius(shadowInfo, mainLight);
                    for (let i = 0; i < mainLight.csmLevel; i++) {
                        const layer: CSMShadowLayer = csmLayers.layers[i];
                        const matShadowView: Mat4 = layer.matShadowView;
                        _uboVec.set(matShadowView.m00, matShadowView.m04, matShadowView.m08, layerThreshold);
                        setter.setVec4('cc_csmViewDir0', _uboVec, i);
                        _uboVec.set(matShadowView.m01, matShadowView.m05, matShadowView.m09, layer.splitCameraNear);
                        setter.setVec4('cc_csmViewDir1', _uboVec, i);
                        _uboVec.set(matShadowView.m02, matShadowView.m06, matShadowView.m10, layer.splitCameraFar);
                        setter.setVec4('cc_csmViewDir2', _uboVec, i);

                        const csmAtlas = layer.csmAtlas;
                        setter.setVec4('cc_csmAtlas', csmAtlas, i);

                        const matShadowViewProj = layer.matShadowViewProj;
                        setter.setMat4('cc_matCSMViewProj', matShadowViewProj, i);
                        const matShadowProj = layer.matShadowProj;
                        _uboVec.set(matShadowProj.m10, matShadowProj.m14, matShadowProj.m11, matShadowProj.m15);
                        setter.setVec4('cc_csmProjDepthInfo', _uboVec, i);

                        _uboVec.set(matShadowProj.m00, matShadowProj.m05, 1.0 / matShadowProj.m00, 1.0 / matShadowProj.m05);
                        setter.setVec4('cc_csmProjInfo', _uboVec, i);
                    }
                    _uboVec.set(mainLight.csmTransitionRange, 0, 0, 0);
                    setter.setVec4('cc_csmSplitsInfo', _uboVec);
                    _uboVec.set(0.1, mainLight.shadowDistance, 0, 1.0 - mainLight.shadowSaturation);
                    setter.setVec4('cc_shadowNFLSInfo', _uboVec);
                    _uboVec.set(LightType.DIRECTIONAL, packing, mainLight.shadowNormalBias, mainLight.csmLevel);
                    setter.setVec4('cc_shadowLPNNInfo', _uboVec);
                }
                _uboVec.set(shadowInfo.size.x, shadowInfo.size.y, mainLight.shadowPcf, mainLight.shadowBias);
                setter.setVec4('cc_shadowWHPBInfo', _uboVec);
            }
        } else {
            Vec3.normalize(_uboVec3, shadowInfo.normal);
            _uboVec.set(_uboVec3.x, _uboVec3.y, _uboVec3.z, -shadowInfo.distance);
            setter.setVec4('cc_planarNDInfo', _uboVec);

            _uboVec.set(0, 0, 0, shadowInfo.planeBias);
            setter.setVec4('cc_shadowWHPBInfo', _uboVec);
        }
        setter.setMathColor('cc_shadowColor', shadowInfo.shadowColor);
    }
}

export class WebSetter implements Setter {
    constructor (data: RenderData, lg: LayoutGraphData) {
        this._data = data;
        this._lg = lg;
    }
    get name (): string {
        return '';
    }
    set name (name: string) {
        // noop
    }

    public setMat4 (name: string, mat: Mat4, idx = 0): void {
        WebSetter.setMat4(this._lg, this._data, name, mat, idx);
    }

    public static setMat4 (lg: LayoutGraphData, data: RenderData, name: string, mat: Mat4, idx = 0): void {
        const info =  WebSetter.getConstantInfo(lg, data, name);
        Mat4.toArray(info.dataArr, mat, idx * 16);
        data.constants.set(info.constantID, info.dataArr);
    }

    public setQuaternion (name: string, quat: Quat, idx = 0): void {
        WebSetter.setQuaternion(this._lg, this._data, name, quat, idx);
    }
    public static setQuaternion (lg: LayoutGraphData, data: RenderData, name: string, quat: Quat, idx = 0): void {
        const info =  WebSetter.getConstantInfo(lg, data, name);
        Quat.toArray(info.dataArr, quat, idx * 4);
        data.constants.set(info.constantID, info.dataArr);
    }
    public setColor (name: string, color: Color, idx = 0): void {
        WebSetter.setColor(this._lg, this._data, name, color, idx);
    }

    public static setColor (lg: LayoutGraphData, data: RenderData, name: string, color: Color, idx = 0): void {
        const info =  WebSetter.getConstantInfo(lg, data, name);
        const currIdx = idx * 4;
        info.dataArr[0 + currIdx] = color.x;
        info.dataArr[1 + currIdx] = color.y;
        info.dataArr[2 + currIdx] = color.z;
        info.dataArr[3 + currIdx] = color.w;
        data.constants.set(info.constantID, info.dataArr);
    }

    public setMathColor (name: string, color: CoreColor, idx = 0): void {
        WebSetter.setMathColor(this._lg, this._data, name, color, idx);
    }
    public static setMathColor (lg: LayoutGraphData, data: RenderData,  name: string, color: CoreColor, idx = 0): void {
        const info =  WebSetter.getConstantInfo(lg, data, name);
        CoreColor.toArray(info.dataArr, color, idx * 4);
        data.constants.set(info.constantID, info.dataArr);
    }
    public static getConstantInfo (lg: LayoutGraphData, data: RenderData, name: string): { constantID: number, dataArr: Array<number>} {
        const constantID = lg.constantIndex.get(name)!;
        if (constantID === undefined) {
            throw new Error(`Constant with name ${name} not found.`);
        }
        const dataArr = data.constants.get(constantID)! || [];
        return { constantID, dataArr };
    }
    public setVec4 (name: string, vec: Vec4, idx = 0): void {
        WebSetter.setVec4(this._lg, this._data, name, vec, idx);
    }
    public static setVec4 (lg: LayoutGraphData, data: RenderData, name: string, vec: Vec4, idx = 0): void {
        const info =  WebSetter.getConstantInfo(lg, data, name);
        Vec4.toArray(info.dataArr, vec, idx * 4);
        data.constants.set(info.constantID, info.dataArr);
    }
    public setVec2 (name: string, vec: Vec2, idx = 0): void {
        WebSetter.setVec2(this._lg, this._data, name, vec, idx);
    }
    public static setVec2 (lg: LayoutGraphData, data: RenderData, name: string, vec: Vec2, idx = 0): void {
        const info =  WebSetter.getConstantInfo(lg, data, name);
        Vec2.toArray(info.dataArr, vec, idx * 2);
        data.constants.set(info.constantID, info.dataArr);
    }

    public setFloat (name: string, v: number, idx = 0): void {
        WebSetter.setFloat(this._lg, this._data, name, v, idx);
    }
    public static setFloat (lg: LayoutGraphData, data: RenderData, name: string, v: number, idx = 0): void {
        const info =  WebSetter.getConstantInfo(lg, data, name);
        info.dataArr[0 + idx] = v;
        data.constants.set(info.constantID, info.dataArr);
    }
    public setArrayBuffer (name: string, arrayBuffer: ArrayBuffer): void {
        WebSetter.setArrayBuffer(this._lg, this._data, name, arrayBuffer);
    }
    public static setArrayBuffer (lg: LayoutGraphData, data: RenderData, name: string, arrayBuffer: ArrayBuffer): void {
        throw new Error('Method not implemented.');
    }
    public setBuffer (name: string, buffer: Buffer): void {
        WebSetter.setBuffer(this._lg, this._data, name, buffer);
    }
    public static setBuffer (lg: LayoutGraphData, data: RenderData, name: string, buffer: Buffer): void {
        const num = lg.attributeIndex.get(name)!;
        data.buffers.set(num, buffer);
    }
    public setTexture (name: string, texture: Texture): void {
        WebSetter.setTexture(this._lg, this._data, name, texture);
    }
    public static setTexture (lg: LayoutGraphData, data: RenderData, name: string, texture: Texture): void {
        const num = lg.attributeIndex.get(name)!;
        data.textures.set(num, texture);
    }
    public setReadWriteBuffer (name: string, buffer: Buffer): void {
        WebSetter.setReadWriteBuffer(this._lg, this._data, name, buffer);
    }
    public static setReadWriteBuffer (lg: LayoutGraphData, data: RenderData, name: string, buffer: Buffer): void {
        const num = lg.attributeIndex.get(name)!;
        data.buffers.set(num, buffer);
    }
    public setReadWriteTexture (name: string, texture: Texture): void {
        WebSetter.setReadWriteTexture(this._lg, this._data, name, texture);
    }
    public static setReadWriteTexture (lg: LayoutGraphData, data: RenderData, name: string, texture: Texture): void {
        const num = lg.attributeIndex.get(name)!;
        data.textures.set(num, texture);
    }
    public setSampler (name: string, sampler: Sampler): void {
        WebSetter.setSampler(this._lg, this._data, name, sampler);
    }
    public static setSampler (lg: LayoutGraphData, data: RenderData, name: string, sampler: Sampler): void {
        const num = lg.attributeIndex.get(name)!;
        data.samplers.set(num, sampler);
    }

    public getParentLayout (): string {
        const director = cclegacy.director;
        const root = director.root;
        const pipeline = root.pipeline;
        const parId = pipeline.renderGraph!.getParent(this._vertID);
        const layoutName = pipeline.renderGraph!.getLayout(parId) as string;
        return layoutName;
    }

    public getCurrentLayout (): string {
        const director = cclegacy.director;
        const root = director.root;
        const pipeline = root.pipeline;
        const layoutName = pipeline.renderGraph!.getLayout(this._vertID) as string;
        return layoutName;
    }

    public setBuiltinCameraConstants (camera: Camera): void {
        const director = cclegacy.director;
        const root = director.root;
        const pipeline = root.pipeline;
        const layoutName = this.getParentLayout();
        setCameraUBOValues(this, camera, pipeline.pipelineSceneData as PipelineSceneData, camera.scene, layoutName);
    }
    public setBuiltinDirectionalLightFrustumConstants (camera: Camera, light: DirectionalLight, csmLevel = 0): void {
        setShadowUBOLightView(this, camera, light, csmLevel);
    }
    public setBuiltinSpotLightFrustumConstants (light: SpotLight): void {
        setShadowUBOLightView(this, null, light, 0);
    }
    public setBuiltinDirectionalLightConstants (light: DirectionalLight, camera: Camera): void {
        setShadowUBOView(this, null, this.getParentLayout());
    }
    public setBuiltinSphereLightConstants (light: SphereLight, camera: Camera): void {
        const director = cclegacy.director;
        const pipeline = (director.root as Root).pipeline;
        const sceneData = pipeline.pipelineSceneData;
        _uboVec.set(light.position.x, light.position.y, light.position.z, LightType.SPHERE);
        this.setVec4('cc_lightPos', _uboVec);

        _uboVec.set(light.size, light.range, 0.0, 0.0);
        this.setVec4('cc_lightSizeRangeAngle', _uboVec);

        const isHDR = sceneData.isHDR;
        const lightMeterScale = 10000.0;
        _uboVec.set(light.color.x, light.color.y, light.color.z, 0);
        if (light.useColorTemperature) {
            const finalColor = light.finalColor;
            _uboVec.x = finalColor.x;
            _uboVec.y = finalColor.y;
            _uboVec.z = finalColor.z;
        }
        if (isHDR) {
            _uboVec.w = (light).luminance * camera.exposure * lightMeterScale;
        } else {
            _uboVec.w = (light).luminance;
        }
        this.setVec4('cc_lightColor', _uboVec);
    }
    public setBuiltinSpotLightConstants (light: SpotLight, camera: Camera): void {
        const director = cclegacy.director;
        const pipeline = (director.root as Root).pipeline;
        const sceneData = pipeline.pipelineSceneData;

        const shadowInfo = sceneData.shadows;
        _uboVec.set(light.position.x, light.position.y, light.position.z, LightType.SPOT);
        this.setVec4('cc_lightPos', _uboVec);
        _uboVec.set(
            light.size,
            light.range,
            light.spotAngle,
            (shadowInfo.enabled && light.shadowEnabled && shadowInfo.type === ShadowType.ShadowMap) ? 1 : 0,
        );
        this.setVec4('cc_lightSizeRangeAngle', _uboVec);
        _uboVec.set(light.direction.x, light.direction.y, light.direction.z, 0);
        this.setVec4('cc_lightDir', _uboVec);
        const isHDR = sceneData.isHDR;
        const lightMeterScale = 10000.0;
        _uboVec.set(light.color.x, light.color.y, light.color.z, 0);
        if (light.useColorTemperature) {
            const finalColor = light.finalColor;
            _uboVec.x = finalColor.x;
            _uboVec.y = finalColor.y;
            _uboVec.z = finalColor.z;
        }
        if (isHDR) {
            _uboVec.w = (light).luminance * camera.exposure * lightMeterScale;
        } else {
            _uboVec.w = (light).luminance;
        }
        this.setVec4('cc_lightColor', _uboVec);
        _uboVec.set(0, 0, 0, light.angleAttenuationStrength);
        this.setVec4('cc_lightBoundingSizeVS', _uboVec);
    }
    public setBuiltinPointLightConstants (light: PointLight, camera: Camera): void {
        const director = cclegacy.director;
        const pipeline = (director.root as Root).pipeline;
        const sceneData = pipeline.pipelineSceneData;
        _uboVec.set(light.position.x, light.position.y, light.position.z, LightType.POINT);
        this.setVec4('cc_lightPos', _uboVec);
        _uboVec.set(0.0, light.range, 0.0, 0.0);
        this.setVec4('cc_lightSizeRangeAngle', _uboVec);
        const isHDR = sceneData.isHDR;
        const lightMeterScale = 10000.0;
        if (light.useColorTemperature) {
            const finalColor = light.finalColor;
            _uboVec.x = finalColor.x;
            _uboVec.y = finalColor.y;
            _uboVec.z = finalColor.z;
        }
        if (isHDR) {
            _uboVec.w = (light).luminance * camera.exposure * lightMeterScale;
        } else {
            _uboVec.w = (light).luminance;
        }
        _uboVec.set(light.color.x, light.color.y, light.color.z, 0);
        this.setVec4('cc_lightColor', _uboVec);
    }
    public setBuiltinRangedDirectionalLightConstants (light: RangedDirectionalLight, camera: Camera): void {
        const director = cclegacy.director;
        const pipeline = (director.root as Root).pipeline;
        const sceneData = pipeline.pipelineSceneData;
        _uboVec.set(light.position.x, light.position.y, light.position.z, LightType.RANGED_DIRECTIONAL);
        this.setVec4('cc_lightPos', _uboVec);

        _uboVec.set(light.right.x, light.right.y, light.right.z, 0.0);
        this.setVec4('cc_lightSizeRangeAngle', _uboVec);

        _uboVec.set(light.direction.x, light.direction.y, light.direction.z, 0);
        this.setVec4('cc_lightDir', _uboVec);
        const scale = light.scale;
        _uboVec.set(scale.x * 0.5, scale.y * 0.5, scale.z * 0.5, 0);
        this.setVec4('cc_lightBoundingSizeVS', _uboVec);
        const isHDR = sceneData.isHDR;
        _uboVec.set(light.color.x, light.color.y, light.color.z, 0);
        if (light.useColorTemperature) {
            const finalColor = light.finalColor;
            _uboVec.x = finalColor.x;
            _uboVec.y = finalColor.y;
            _uboVec.z = finalColor.z;
        }
        if (isHDR) {
            _uboVec.w = light.illuminance * camera.exposure;
        } else {
            _uboVec.w = light.illuminance;
        }
        this.setVec4('cc_lightColor', _uboVec);
    }
    public hasSampler (name: string): boolean {
        const id = this._lg.constantIndex.get(name);
        if (id === undefined) {
            return false;
        }
        return this._data.samplers.has(id);
    }
    public hasTexture (name: string): boolean {
        const id = this._lg.constantIndex.get(name);
        if (id === undefined) {
            return false;
        }
        return this._data.textures.has(id);
    }
    public setCustomBehavior (name: string): void {
        throw new Error('Method not implemented.');
    }

    // protected
    protected _data: RenderData;
    protected _lg: LayoutGraphData;
    protected _vertID: number = -1;
    protected _currBlock;
    protected _currStage: string = '';
    protected _currFrequency: UpdateFrequency = UpdateFrequency.PER_PASS;
    protected _currCount;
    protected _currConstant: number[] = [];
}

export class RenderDrawQueue {
    instances: Array<DrawInstance> = new Array<DrawInstance>();

    empty (): boolean {
        return this.instances.length === 0;
    }

    clear (): void {
        this.instances.length = 0;
    }

    add (model: Model, depth: number, subModelIdx: number, passIdx: number): void {
        const subModel = model.subModels[subModelIdx];
        const pass = subModel.passes[passIdx];
        const passPriority = pass.priority;
        const modelPriority = subModel.priority;
        const shaderId = subModel.shaders[passIdx].typedID;
        const hash = (0 << 30) | (passPriority as number << 16) | (modelPriority as number << 8) | passIdx;
        const priority = model.priority;
        const instance = instancePool.add();
        instance.update(subModel, priority, hash, depth, shaderId, passIdx);
        this.instances.push(instance);
    }
    /**
     * @en Comparison sorting function. Opaque objects are sorted by priority -> depth front to back -> shader ID.
     * @zh 比较排序函数。不透明对象按优先级 -> 深度由前向后 -> Shader ID 顺序排序。
     */
    sortOpaqueOrCutout (): void {
        this.instances.sort((lhs: DrawInstance, rhs: DrawInstance) => {
            if (lhs.hash !== rhs.hash) {
                return lhs.hash - rhs.hash;
            }
            if (lhs.depth !== rhs.depth) {
                return lhs.depth - rhs.depth;
            }
            return lhs.shaderID - rhs.shaderID;
        });
    }
    /**
     * @en Comparison sorting function. Transparent objects are sorted by priority -> depth back to front -> shader ID.
     * @zh 比较排序函数。半透明对象按优先级 -> 深度由后向前 -> Shader ID 顺序排序。
     */
    sortTransparent (): void {
        this.instances.sort((lhs: DrawInstance, rhs: DrawInstance) => {
            if (lhs.priority !== rhs.priority) {
                return lhs.priority - rhs.priority;
            }
            if (lhs.hash !== rhs.hash) {
                return lhs.hash - rhs.hash;
            }
            if (lhs.depth !== rhs.depth) {
                return rhs.depth - lhs.depth; // 注意此处的差值顺序，为了按照降序排列
            }
            return lhs.shaderID - rhs.shaderID;
        });
    }

    recordCommandBuffer (
        device: Device,
        renderPass: RenderPass,
        cmdBuffer: CommandBuffer,
        ds: DescriptorSet | null = null,
        offset = 0,
        dynamicOffsets: number[] | null = null,
    ): void {
        for (const instance of this.instances) {
            const subModel = instance.subModel!;

            const passIdx = instance.passIndex;
            const inputAssembler = subModel.inputAssembler;
            const pass = subModel.passes[passIdx];
            const shader = subModel.shaders[passIdx];
            const pso = PipelineStateManager.getOrCreatePipelineState(device, pass, shader, renderPass, inputAssembler);

            cmdBuffer.bindPipelineState(pso);
            cmdBuffer.bindDescriptorSet(SetIndex.MATERIAL, pass.descriptorSet);
            if (ds) {
                cmdBuffer.bindDescriptorSet(SetIndex.GLOBAL, ds, [offset]);
            }
            if (dynamicOffsets) {
                cmdBuffer.bindDescriptorSet(SetIndex.LOCAL, subModel.descriptorSet, dynamicOffsets);
            } else {
                cmdBuffer.bindDescriptorSet(
                    SetIndex.LOCAL,
                    subModel.descriptorSet,
                );
            }
            cmdBuffer.bindInputAssembler(inputAssembler);
            cmdBuffer.draw(inputAssembler);
        }
    }
}

export class RenderInstancingQueue {
    /**
     * @en A set of instanced buffer
     * @zh Instance 合批缓存集合。
     */
    public queue = new Set<InstancedBuffer>();
    empty (): boolean {
        return this.queue.size === 0;
    }

    add (pass: Pass, subModel: SubModel, passID: number): void {
        const instancedBuffer = pass.getInstancedBuffer();
        instancedBuffer.merge(subModel, passID);
        this.queue.add(instancedBuffer);
    }

    clear (): void {
        const it = this.queue.values(); let res = it.next();
        while (!res.done) {
            res.value.clear();
            res = it.next();
        }
        this.queue.clear();
    }

    sort (): void {}

    uploadBuffers (cmdBuffer: CommandBuffer): void {
        const it = this.queue.values(); let res = it.next();
        while (!res.done) {
            if (res.value.hasPendingModels) res.value.uploadBuffers(cmdBuffer);
            res = it.next();
        }
    }

    recordCommandBuffer (
        renderPass: RenderPass,
        cmdBuffer: CommandBuffer,
        ds: DescriptorSet | null = null,
        offset = 0,
        dynamicOffsets: number[] | null = null,
    ): void {
        const renderQueue = this.queue;
        for (const instanceBuffer of renderQueue) {
            if (!instanceBuffer.hasPendingModels) {
                continue;
            }
            const instances = instanceBuffer.instances;
            const drawPass = instanceBuffer.pass;
            cmdBuffer.bindDescriptorSet(SetIndex.MATERIAL, drawPass.descriptorSet);
            let lastPSO: PipelineState | null = null;
            for (const instance of instances) {
                if (!instance.count) {
                    continue;
                }
                const pso = PipelineStateManager.getOrCreatePipelineState(
                    deviceManager.gfxDevice,
                    drawPass,
                    instance.shader!,
                    renderPass,
                    instance.ia,
                );
                if (lastPSO !== pso) {
                    cmdBuffer.bindPipelineState(pso);
                    lastPSO = pso;
                }
                if (ds) {
                    cmdBuffer.bindDescriptorSet(SetIndex.GLOBAL, ds, [offset]);
                }
                if (dynamicOffsets) {
                    cmdBuffer.bindDescriptorSet(SetIndex.LOCAL, instance.descriptorSet, dynamicOffsets);
                } else {
                    cmdBuffer.bindDescriptorSet(
                        SetIndex.LOCAL,
                        instance.descriptorSet,
                        instanceBuffer.dynamicOffsets,
                    );
                }
                cmdBuffer.bindInputAssembler(instance.ia);
                cmdBuffer.draw(instance.ia);
            }
        }
    }
}

export class RenderQueueQuery {
    frustumCulledResultID: number;
    lightBoundsCulledResultID: number;
    renderQueueTarget: number;

    constructor (
        frustumCulledResultID = 0xFFFFFFFF,
        lightBoundsCulledResultID = 0xFFFFFFFF,
        renderQueueTargetIn = 0xFFFFFFFF,
    ) {
        this.frustumCulledResultID = frustumCulledResultID;
        this.lightBoundsCulledResultID = lightBoundsCulledResultID;
        this.renderQueueTarget = renderQueueTargetIn;
    }
    update (
        culledSourceIn = 0xFFFFFFFF,
        lightBoundsCulledResultID = 0xFFFFFFFF,
        renderQueueTargetIn = 0xFFFFFFFF,
    ): void {
        this.frustumCulledResultID = culledSourceIn;
        this.lightBoundsCulledResultID = lightBoundsCulledResultID;
        this.renderQueueTarget = renderQueueTargetIn;
    }
}

export function recordCommand (
    cmdBuffer: CommandBuffer,
    _renderPass: RenderPass,
    pass: Pass,
    localDesc: DescriptorSet,
    shader: Shader | null,
    ia: InputAssembler | null,
): void {
    let pso!: PipelineState;
    if (shader && ia) {
        pso = PipelineStateManager.getOrCreatePipelineState(
            deviceManager.gfxDevice,
            pass,
            shader,
            _renderPass,
            ia,
        );
    }
    if (pso) {
        const _ia = ia!;
        cmdBuffer.bindPipelineState(pso);
        cmdBuffer.bindDescriptorSet(SetIndex.MATERIAL, pass.descriptorSet);
        cmdBuffer.bindDescriptorSet(SetIndex.LOCAL, localDesc);
        cmdBuffer.bindInputAssembler(_ia);
        cmdBuffer.draw(_ia);
    }
}

export class RenderQueue {
    probeQueue: ProbeHelperQueue = new ProbeHelperQueue();
    opaqueQueue: RenderDrawQueue = new RenderDrawQueue();
    transparentQueue: RenderDrawQueue = new RenderDrawQueue();
    opaqueInstancingQueue: RenderInstancingQueue = new RenderInstancingQueue();
    transparentInstancingQueue: RenderInstancingQueue = new RenderInstancingQueue();
    camera: Camera | null = null;
    sceneFlags: SceneFlags = SceneFlags.NONE;
    lightByteOffset = 0xFFFFFFFF;
    sort (): void {
        this.opaqueQueue.sortOpaqueOrCutout();
        this.transparentQueue.sortTransparent();
        this.opaqueInstancingQueue.sort();
        this.transparentInstancingQueue.sort();
    }

    update (): void {
        this.probeQueue.clear();
        this.opaqueQueue.clear();
        this.transparentQueue.clear();
        this.opaqueInstancingQueue.clear();
        this.transparentInstancingQueue.clear();
        this.camera = null;
        this.sceneFlags = SceneFlags.NONE;
        this.lightByteOffset = 0xFFFFFFFF;
    }

    empty (): boolean {
        return this.opaqueQueue.empty()
        && this.transparentQueue.empty()
        && this.opaqueInstancingQueue.empty()
        && this.transparentInstancingQueue.empty();
    }

    recordCommands (cmdBuffer: CommandBuffer, renderPass: RenderPass, sceneFlags: SceneFlags): void {
        const offsets = this.lightByteOffset === 0xFFFFFFFF ? null : [this.lightByteOffset];
        if (sceneFlags & (SceneFlags.OPAQUE | SceneFlags.MASK)) {
            this.opaqueQueue.recordCommandBuffer(deviceManager.gfxDevice, renderPass, cmdBuffer, null, 0, offsets);
            this.opaqueInstancingQueue.recordCommandBuffer(renderPass, cmdBuffer, null, 0, offsets);
        }
        if (sceneFlags & SceneFlags.BLEND) {
            this.transparentInstancingQueue.recordCommandBuffer(renderPass, cmdBuffer, null, 0, offsets);
            this.transparentQueue.recordCommandBuffer(deviceManager.gfxDevice, renderPass, cmdBuffer, null, 0, offsets);
        }
    }
}
