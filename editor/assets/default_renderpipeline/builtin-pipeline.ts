/*
 Copyright (c) 2021-2024 Xiamen Yaji Software Co., Ltd.

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

import {
    assert, cclegacy, clamp, geometry, gfx, Layers, Material, pipeline,
    PipelineEventProcessor, PipelineEventType, ReflectionProbeManager, renderer,
    rendering, sys, Vec2, Vec3, Vec4, warn,
} from 'cc';

import { DEBUG, EDITOR } from 'cc/env';

import {
    makePipelineSettings,
    PipelineSettings,
} from './builtin-pipeline-types';

const { AABB, Sphere, intersect } = geometry;
const { ClearFlagBit, Color, Format, FormatFeatureBit, LoadOp, StoreOp, TextureType, Viewport } = gfx;
const { scene } = renderer;
const { CameraUsage, CSMLevel, LightType } = scene;

function forwardNeedClearColor(camera: renderer.scene.Camera): boolean {
    return !!(camera.clearFlag & (ClearFlagBit.COLOR | (ClearFlagBit.STENCIL << 1)));
}

function getCsmMainLightViewport(
    light: renderer.scene.DirectionalLight,
    w: number,
    h: number,
    level: number,
    vp: gfx.Viewport,
    screenSpaceSignY: number,
): void {
    if (light.shadowFixedArea || light.csmLevel === CSMLevel.LEVEL_1) {
        vp.left = 0;
        vp.top = 0;
        vp.width = Math.trunc(w);
        vp.height = Math.trunc(h);
    } else {
        vp.left = Math.trunc(level % 2 * 0.5 * w);
        if (screenSpaceSignY > 0) {
            vp.top = Math.trunc((1 - Math.floor(level / 2)) * 0.5 * h);
        } else {
            vp.top = Math.trunc(Math.floor(level / 2) * 0.5 * h);
        }
        vp.width = Math.trunc(0.5 * w);
        vp.height = Math.trunc(0.5 * h);
    }
    vp.left = Math.max(0, vp.left);
    vp.top = Math.max(0, vp.top);
    vp.width = Math.max(1, vp.width);
    vp.height = Math.max(1, vp.height);
}

export class PipelineConfigs {
    isWeb = false;
    isWebGL1 = false;
    isWebGPU = false;
    isMobile = false;
    isHDR = false;
    useFloatOutput = false;
    toneMappingType = 0; // 0: ACES, 1: None
    shadowEnabled = false;
    shadowMapFormat = Format.R32F;
    shadowMapSize = new Vec2(1, 1);
    usePlanarShadow = false;
    screenSpaceSignY = 1;
    supportDepthSample = false;
    mobileMaxSpotLightShadowMaps = 1;

    platform = new Vec4(0, 0, 0, 0);
}

function setupPipelineConfigs(
    ppl: rendering.BasicPipeline,
    configs: PipelineConfigs,
): void {
    const sampleFeature = FormatFeatureBit.SAMPLED_TEXTURE | FormatFeatureBit.LINEAR_FILTER;
    const device = ppl.device;
    // Platform
    configs.isWeb = !sys.isNative;
    configs.isWebGL1 = device.gfxAPI === gfx.API.WEBGL;
    configs.isWebGPU = device.gfxAPI === gfx.API.WEBGPU;
    configs.isMobile = sys.isMobile;

    // Rendering
    configs.isHDR = ppl.pipelineSceneData.isHDR; // Has tone mapping
    configs.useFloatOutput = ppl.getMacroBool('CC_USE_FLOAT_OUTPUT');
    configs.toneMappingType = ppl.pipelineSceneData.postSettings.toneMappingType;
    // Shadow
    const shadowInfo = ppl.pipelineSceneData.shadows;
    configs.shadowEnabled = shadowInfo.enabled;
    configs.shadowMapFormat = pipeline.supportsR32FloatTexture(ppl.device) ? Format.R32F : Format.RGBA8;
    configs.shadowMapSize.set(shadowInfo.size);
    configs.usePlanarShadow = shadowInfo.enabled && shadowInfo.type === renderer.scene.ShadowType.Planar;
    // Device
    configs.screenSpaceSignY = ppl.device.capabilities.screenSpaceSignY;
    configs.supportDepthSample = (ppl.device.getFormatFeatures(Format.DEPTH_STENCIL) & sampleFeature) === sampleFeature;
    // Constants
    const screenSpaceSignY = device.capabilities.screenSpaceSignY;
    configs.platform.x = configs.isMobile ? 1.0 : 0.0;
    configs.platform.w = (screenSpaceSignY * 0.5 + 0.5) << 1 | (device.capabilities.clipSpaceSignY * 0.5 + 0.5);
}

export interface PipelineSettings2 extends PipelineSettings {
    _passes?: rendering.PipelinePassBuilder[];
}

const defaultSettings = makePipelineSettings();

export class CameraConfigs {
    settings: PipelineSettings = defaultSettings;
    // Window
    isMainGameWindow = false;
    renderWindowId = 0;
    // Camera
    colorName = '';
    depthStencilName = '';
    // Pipeline
    enableFullPipeline = false;
    enableProfiler = false;
    remainingPasses = 0;
    // Shading Scale
    enableShadingScale = false;
    shadingScale = 1.0;
    nativeWidth = 1;
    nativeHeight = 1;
    width = 1; // Scaled width
    height = 1; // Scaled height
    // Radiance
    enableHDR = false;
    radianceFormat = gfx.Format.RGBA8;
    // Tone Mapping
    copyAndTonemapMaterial: Material | null = null;
    // Depth
    /** @en mutable */
    enableStoreSceneDepth = false;
}

const sClearColorTransparentBlack = new Color(0, 0, 0, 0);

function sortPipelinePassBuildersByConfigOrder(passBuilders: rendering.PipelinePassBuilder[]): void {
    passBuilders.sort((a, b) => {
        return a.getConfigOrder() - b.getConfigOrder();
    });
}

function sortPipelinePassBuildersByRenderOrder(passBuilders: rendering.PipelinePassBuilder[]): void {
    passBuilders.sort((a, b) => {
        return a.getRenderOrder() - b.getRenderOrder();
    });
}

function addCopyToScreenPass(
    ppl: rendering.BasicPipeline,
    pplConfigs: Readonly<PipelineConfigs>,
    cameraConfigs: CameraConfigs,
    input: string,
): rendering.BasicRenderPassBuilder {
    assert(!!cameraConfigs.copyAndTonemapMaterial);
    const pass = ppl.addRenderPass(
        cameraConfigs.nativeWidth,
        cameraConfigs.nativeHeight,
        'cc-tone-mapping');
    pass.addRenderTarget(
        cameraConfigs.colorName,
        LoadOp.CLEAR, StoreOp.STORE,
        sClearColorTransparentBlack);
    pass.addTexture(input, 'inputTexture');
    pass.setVec4('g_platform', pplConfigs.platform);
    pass.addQueue(rendering.QueueHint.OPAQUE)
        .addFullscreenQuad(cameraConfigs.copyAndTonemapMaterial, 1);
    return pass;
}

export function getPingPongRenderTarget(prevName: string, prefix: string, id: number): string {
    if (prevName.startsWith(prefix)) {
        return `${prefix}${1 - Number(prevName.charAt(prefix.length))}_${id}`;
    } else {
        return `${prefix}0_${id}`;
    }
}

export interface PipelineContext {
    colorName: string;
    depthStencilName: string;
}

class ForwardLighting {
    // Active lights
    private readonly lights: renderer.scene.Light[] = [];
    // Active spot lights with shadows (Mutually exclusive with `lights`)
    private readonly shadowEnabledSpotLights: renderer.scene.SpotLight[] = [];

    // Internal cached resources
    private readonly _sphere = Sphere.create(0, 0, 0, 1);
    private readonly _boundingBox = new AABB();
    private readonly _rangedDirLightBoundingBox = new AABB(0.0, 0.0, 0.0, 0.5, 0.5, 0.5);

    // ----------------------------------------------------------------
    // Interface
    // ----------------------------------------------------------------
    public cullLights(scene: renderer.RenderScene, frustum: geometry.Frustum, cameraPos?: Vec3): void {
        // TODO(zhouzhenglong): Make light culling native
        this.lights.length = 0;
        this.shadowEnabledSpotLights.length = 0;
        // spot lights
        for (const light of scene.spotLights) {
            if (light.baked) {
                continue;
            }
            Sphere.set(this._sphere, light.position.x, light.position.y, light.position.z, light.range);
            if (intersect.sphereFrustum(this._sphere, frustum)) {
                if (light.shadowEnabled) {
                    this.shadowEnabledSpotLights.push(light);
                } else {
                    this.lights.push(light);
                }
            }
        }
        // sphere lights
        for (const light of scene.sphereLights) {
            if (light.baked) {
                continue;
            }
            Sphere.set(this._sphere, light.position.x, light.position.y, light.position.z, light.range);
            if (intersect.sphereFrustum(this._sphere, frustum)) {
                this.lights.push(light);
            }
        }
        // point lights
        for (const light of scene.pointLights) {
            if (light.baked) {
                continue;
            }
            Sphere.set(this._sphere, light.position.x, light.position.y, light.position.z, light.range);
            if (intersect.sphereFrustum(this._sphere, frustum)) {
                this.lights.push(light);
            }
        }
        // ranged dir lights
        for (const light of scene.rangedDirLights) {
            AABB.transform(this._boundingBox, this._rangedDirLightBoundingBox, light.node!.getWorldMatrix());
            if (intersect.aabbFrustum(this._boundingBox, frustum)) {
                this.lights.push(light);
            }
        }

        if (cameraPos) {
            this.shadowEnabledSpotLights.sort(
                (lhs, rhs) => Vec3.squaredDistance(cameraPos, lhs.position) - Vec3.squaredDistance(cameraPos, rhs.position),
            );
        }
    }
    private _addLightQueues(camera: renderer.scene.Camera, pass: rendering.BasicRenderPassBuilder): void {
        for (const light of this.lights) {
            const queue = pass.addQueue(rendering.QueueHint.BLEND, 'forward-add');
            switch (light.type) {
                case LightType.SPHERE:
                    queue.name = 'sphere-light';
                    break;
                case LightType.SPOT:
                    queue.name = 'spot-light';
                    break;
                case LightType.POINT:
                    queue.name = 'point-light';
                    break;
                case LightType.RANGED_DIRECTIONAL:
                    queue.name = 'ranged-directional-light';
                    break;
                default:
                    queue.name = 'unknown-light';
            }
            queue.addScene(
                camera,
                rendering.SceneFlags.BLEND,
                light,
            );
        }
    }
    public addSpotlightShadowPasses(
        ppl: rendering.BasicPipeline,
        camera: renderer.scene.Camera,
        maxNumShadowMaps: number,
    ): void {
        let i = 0;
        for (const light of this.shadowEnabledSpotLights) {
            const shadowMapSize = ppl.pipelineSceneData.shadows.size;
            const shadowPass = ppl.addRenderPass(shadowMapSize.x, shadowMapSize.y, 'default');
            shadowPass.name = `SpotLightShadowPass${i}`;
            shadowPass.addRenderTarget(`SpotShadowMap${i}`, LoadOp.CLEAR, StoreOp.STORE, new Color(1, 1, 1, 1));
            shadowPass.addDepthStencil(`SpotShadowDepth${i}`, LoadOp.CLEAR, StoreOp.DISCARD);
            shadowPass.addQueue(rendering.QueueHint.NONE, 'shadow-caster')
                .addScene(camera, rendering.SceneFlags.OPAQUE | rendering.SceneFlags.MASK | rendering.SceneFlags.SHADOW_CASTER)
                .useLightFrustum(light);
            ++i;
            if (i >= maxNumShadowMaps) {
                break;
            }
        }
    }
    public addLightQueues(pass: rendering.BasicRenderPassBuilder,
        camera: renderer.scene.Camera, maxNumShadowMaps: number): void {
        this._addLightQueues(camera, pass);
        let i = 0;
        for (const light of this.shadowEnabledSpotLights) {
            // Add spot-light pass
            // Save last RenderPass to the `pass` variable
            // TODO(zhouzhenglong): Fix per queue addTexture
            pass.addTexture(`SpotShadowMap${i}`, 'cc_spotShadowMap');
            const queue = pass.addQueue(rendering.QueueHint.BLEND, 'forward-add');
            queue.addScene(camera, rendering.SceneFlags.BLEND, light);
            ++i;
            if (i >= maxNumShadowMaps) {
                break;
            }
        }
    }

    // Notice: ForwardLighting cannot handle a lot of lights.
    // If there are too many lights, the performance will be very poor.
    // If many lights are needed, please implement a forward+ or deferred rendering pipeline.
    public addLightPasses(
        colorName: string,
        depthStencilName: string,
        depthStencilStoreOp: gfx.StoreOp,
        id: number, // window id
        width: number,
        height: number,
        camera: renderer.scene.Camera,
        viewport: gfx.Viewport,
        ppl: rendering.BasicPipeline,
        pass: rendering.BasicRenderPassBuilder,
    ): rendering.BasicRenderPassBuilder {
        this._addLightQueues(camera, pass);

        let count = 0;
        const shadowMapSize = ppl.pipelineSceneData.shadows.size;
        for (const light of this.shadowEnabledSpotLights) {
            const shadowPass = ppl.addRenderPass(shadowMapSize.x, shadowMapSize.y, 'default');
            shadowPass.name = 'SpotlightShadowPass';
            // Reuse csm shadow map
            shadowPass.addRenderTarget(`ShadowMap${id}`, LoadOp.CLEAR, StoreOp.STORE, new Color(1, 1, 1, 1));
            shadowPass.addDepthStencil(`ShadowDepth${id}`, LoadOp.CLEAR, StoreOp.DISCARD);
            shadowPass.addQueue(rendering.QueueHint.NONE, 'shadow-caster')
                .addScene(camera, rendering.SceneFlags.OPAQUE | rendering.SceneFlags.MASK | rendering.SceneFlags.SHADOW_CASTER)
                .useLightFrustum(light);

            // Add spot-light pass
            // Save last RenderPass to the `pass` variable
            ++count;
            const storeOp = count === this.shadowEnabledSpotLights.length
                ? depthStencilStoreOp
                : StoreOp.STORE;

            pass = ppl.addRenderPass(width, height, 'default');
            pass.name = 'SpotlightWithShadowMap';
            pass.setViewport(viewport);
            pass.addRenderTarget(colorName, LoadOp.LOAD);
            pass.addDepthStencil(depthStencilName, LoadOp.LOAD, storeOp);
            pass.addTexture(`ShadowMap${id}`, 'cc_spotShadowMap');
            const queue = pass.addQueue(rendering.QueueHint.BLEND, 'forward-add');
            queue.addScene(
                camera,
                rendering.SceneFlags.BLEND,
                light,
            );
        }
        return pass;
    }

    public isMultipleLightPassesNeeded(): boolean {
        return this.shadowEnabledSpotLights.length > 0;
    }
}

export interface ForwardPassConfigs {
    enableMainLightShadowMap: boolean;
    enableMainLightPlanarShadowMap: boolean;
    enablePlanarReflectionProbe: boolean;
    enableMSAA: boolean;
    enableSingleForwardPass: boolean;
}

export class BuiltinForwardPassBuilder implements rendering.PipelinePassBuilder {
    static ConfigOrder = 100;
    static RenderOrder = 100;
    getConfigOrder(): number {
        return BuiltinForwardPassBuilder.ConfigOrder;
    }
    getRenderOrder(): number {
        return BuiltinForwardPassBuilder.RenderOrder;
    }
    configCamera(
        camera: Readonly<renderer.scene.Camera>,
        pipelineConfigs: Readonly<PipelineConfigs>,
        cameraConfigs: CameraConfigs & ForwardPassConfigs): void {
        // Shadow
        cameraConfigs.enableMainLightShadowMap = pipelineConfigs.shadowEnabled
            && !pipelineConfigs.usePlanarShadow
            && !!camera.scene
            && !!camera.scene.mainLight
            && camera.scene.mainLight.shadowEnabled;

        cameraConfigs.enableMainLightPlanarShadowMap = pipelineConfigs.shadowEnabled
            && pipelineConfigs.usePlanarShadow
            && !!camera.scene
            && !!camera.scene.mainLight
            && camera.scene.mainLight.shadowEnabled;

        // Reflection Probe
        cameraConfigs.enablePlanarReflectionProbe = cameraConfigs.isMainGameWindow
            || camera.cameraUsage === CameraUsage.SCENE_VIEW
            || camera.cameraUsage === CameraUsage.GAME_VIEW;

        // MSAA
        cameraConfigs.enableMSAA = cameraConfigs.settings.msaa.enabled
            && !cameraConfigs.enableStoreSceneDepth // Cannot store MS depth, resolve depth is also not cross-platform
            && !pipelineConfigs.isWeb // TODO(zhouzhenglong): remove this constraint
            && !pipelineConfigs.isWebGL1;

        // Forward rendering (Depend on MSAA and TBR)
        cameraConfigs.enableSingleForwardPass
            = pipelineConfigs.isMobile || cameraConfigs.enableMSAA;

        ++cameraConfigs.remainingPasses;
    }
    windowResize(
        ppl: rendering.BasicPipeline,
        pplConfigs: Readonly<PipelineConfigs>,
        cameraConfigs: Readonly<CameraConfigs & ForwardPassConfigs>,
        window: renderer.RenderWindow,
        camera: renderer.scene.Camera,
        nativeWidth: number,
        nativeHeight: number): void {
        const ResourceFlags = rendering.ResourceFlags;
        const ResourceResidency = rendering.ResourceResidency;
        const id = window.renderWindowId;
        const settings = cameraConfigs.settings;

        const width = cameraConfigs.enableShadingScale
            ? Math.max(Math.floor(nativeWidth * cameraConfigs.shadingScale), 1)
            : nativeWidth;
        const height = cameraConfigs.enableShadingScale
            ? Math.max(Math.floor(nativeHeight * cameraConfigs.shadingScale), 1)
            : nativeHeight;

        // MsaaRadiance
        if (cameraConfigs.enableMSAA) {
            // Notice: We never store multisample results.
            // These samples are always resolved and discarded at the end of the render pass.
            // So the ResourceResidency should be MEMORYLESS.
            if (cameraConfigs.enableHDR) {
                ppl.addTexture(`MsaaRadiance${id}`, TextureType.TEX2D, cameraConfigs.radianceFormat, width, height, 1, 1, 1,
                    settings.msaa.sampleCount, ResourceFlags.COLOR_ATTACHMENT, ResourceResidency.MEMORYLESS);
            } else {
                ppl.addTexture(`MsaaRadiance${id}`, TextureType.TEX2D, Format.RGBA8, width, height, 1, 1, 1,
                    settings.msaa.sampleCount, ResourceFlags.COLOR_ATTACHMENT, ResourceResidency.MEMORYLESS);
            }
            ppl.addTexture(`MsaaDepthStencil${id}`, TextureType.TEX2D, Format.DEPTH_STENCIL, width, height, 1, 1, 1,
                settings.msaa.sampleCount, ResourceFlags.DEPTH_STENCIL_ATTACHMENT, ResourceResidency.MEMORYLESS);
        }

        // Mainlight ShadowMap
        ppl.addRenderTarget(
            `ShadowMap${id}`,
            pplConfigs.shadowMapFormat,
            pplConfigs.shadowMapSize.x,
            pplConfigs.shadowMapSize.y,
        );
        ppl.addDepthStencil(
            `ShadowDepth${id}`,
            Format.DEPTH_STENCIL,
            pplConfigs.shadowMapSize.x,
            pplConfigs.shadowMapSize.y,
        );

        // Spot-light shadow maps
        if (cameraConfigs.enableSingleForwardPass) {
            const count = pplConfigs.mobileMaxSpotLightShadowMaps;
            for (let i = 0; i !== count; ++i) {
                ppl.addRenderTarget(
                    `SpotShadowMap${i}`,
                    pplConfigs.shadowMapFormat,
                    pplConfigs.shadowMapSize.x,
                    pplConfigs.shadowMapSize.y,
                );
                ppl.addDepthStencil(
                    `SpotShadowDepth${i}`,
                    Format.DEPTH_STENCIL,
                    pplConfigs.shadowMapSize.x,
                    pplConfigs.shadowMapSize.y,
                );
            }
        }
    }
    setup(
        ppl: rendering.BasicPipeline,
        pplConfigs: Readonly<PipelineConfigs>,
        cameraConfigs: CameraConfigs & ForwardPassConfigs,
        camera: renderer.scene.Camera,
        context: PipelineContext): rendering.BasicRenderPassBuilder | undefined {
        const id = camera.window.renderWindowId;

        const scene = camera.scene!;
        const mainLight = scene.mainLight;

        --cameraConfigs.remainingPasses;
        assert(cameraConfigs.remainingPasses >= 0);

        // Forward Lighting (Light Culling)
        this.forwardLighting.cullLights(scene, camera.frustum);

        // Main Directional light CSM Shadow Map
        if (cameraConfigs.enableMainLightShadowMap) {
            assert(!!mainLight);
            this._addCascadedShadowMapPass(ppl, pplConfigs, id, mainLight, camera);
        }

        // Spot light shadow maps (Mobile or MSAA)
        if (cameraConfigs.enableSingleForwardPass) {
            // Currently, only support 1 spot light with shadow map on mobile platform.
            // TODO(zhouzhenglong): Relex this limitation.
            this.forwardLighting.addSpotlightShadowPasses(
                ppl, camera, pplConfigs.mobileMaxSpotLightShadowMaps);
        }

        this._tryAddReflectionProbePasses(ppl, cameraConfigs, id, mainLight, camera.scene);

        if (cameraConfigs.remainingPasses > 0 || cameraConfigs.enableShadingScale) {
            context.colorName = cameraConfigs.enableShadingScale
                ? `ScaledRadiance0_${id}`
                : `Radiance0_${id}`;
            context.depthStencilName = cameraConfigs.enableShadingScale
                ? `ScaledSceneDepth_${id}`
                : `SceneDepth_${id}`;
        } else {
            context.colorName = cameraConfigs.colorName;
            context.depthStencilName = cameraConfigs.depthStencilName;
        }

        const pass = this._addForwardRadiancePasses(
            ppl, pplConfigs, cameraConfigs, id, camera,
            cameraConfigs.width, cameraConfigs.height, mainLight,
            context.colorName, context.depthStencilName,
            !cameraConfigs.enableMSAA,
            cameraConfigs.enableStoreSceneDepth ? StoreOp.STORE : StoreOp.DISCARD);

        if (!cameraConfigs.enableStoreSceneDepth) {
            context.depthStencilName = '';
        }

        if (cameraConfigs.remainingPasses === 0 && cameraConfigs.enableShadingScale) {
            return addCopyToScreenPass(ppl, pplConfigs, cameraConfigs, context.colorName);
        } else {
            return pass;
        }
    }
    private _addCascadedShadowMapPass(
        ppl: rendering.BasicPipeline,
        pplConfigs: Readonly<PipelineConfigs>,
        id: number,
        light: renderer.scene.DirectionalLight,
        camera: renderer.scene.Camera,
    ): void {
        const QueueHint = rendering.QueueHint;
        const SceneFlags = rendering.SceneFlags;
        // ----------------------------------------------------------------
        // Dynamic states
        // ----------------------------------------------------------------
        const shadowSize = ppl.pipelineSceneData.shadows.size;
        const width = shadowSize.x;
        const height = shadowSize.y;

        const viewport = this._viewport;
        viewport.left = viewport.top = 0;
        viewport.width = width;
        viewport.height = height;

        // ----------------------------------------------------------------
        // CSM Shadow Map
        // ----------------------------------------------------------------
        const pass = ppl.addRenderPass(width, height, 'default');
        pass.name = 'CascadedShadowMap';
        pass.addRenderTarget(`ShadowMap${id}`, LoadOp.CLEAR, StoreOp.STORE, new Color(1, 1, 1, 1));
        pass.addDepthStencil(`ShadowDepth${id}`, LoadOp.CLEAR, StoreOp.DISCARD);
        const csmLevel = ppl.pipelineSceneData.csmSupported ? light.csmLevel : 1;

        // Add shadow map viewports
        for (let level = 0; level !== csmLevel; ++level) {
            getCsmMainLightViewport(light, width, height, level, this._viewport, pplConfigs.screenSpaceSignY);
            const queue = pass.addQueue(QueueHint.NONE, 'shadow-caster');
            if (!pplConfigs.isWebGPU) { // Temporary workaround for WebGPU
                queue.setViewport(this._viewport);
            }
            queue
                .addScene(camera, SceneFlags.OPAQUE | SceneFlags.MASK | SceneFlags.SHADOW_CASTER)
                .useLightFrustum(light, level);
        }
    }
    private _tryAddReflectionProbePasses(
        ppl: rendering.BasicPipeline,
        cameraConfigs: Readonly<CameraConfigs & ForwardPassConfigs>,
        id: number,
        mainLight: renderer.scene.DirectionalLight | null,
        scene: renderer.RenderScene | null,
    ): void {
        const reflectionProbeManager = cclegacy.internal.reflectionProbeManager as ReflectionProbeManager | undefined;
        if (!reflectionProbeManager) {
            return;
        }
        const ResourceResidency = rendering.ResourceResidency;
        const probes = reflectionProbeManager.getProbes();
        const maxProbeCount = 4;
        let probeID = 0;
        for (const probe of probes) {
            if (!probe.needRender) {
                continue;
            }
            const area = probe.renderArea();
            const width = Math.max(Math.floor(area.x), 1);
            const height = Math.max(Math.floor(area.y), 1);

            if (probe.probeType === renderer.scene.ProbeType.PLANAR) {
                if (!cameraConfigs.enablePlanarReflectionProbe) {
                    continue;
                }
                const window: renderer.RenderWindow = probe.realtimePlanarTexture!.window!;
                const colorName = `PlanarProbeRT${probeID}`;
                const depthStencilName = `PlanarProbeDS${probeID}`;
                // ProbeResource
                ppl.addRenderWindow(colorName,
                    cameraConfigs.radianceFormat, width, height, window);
                ppl.addDepthStencil(depthStencilName,
                    gfx.Format.DEPTH_STENCIL, width, height, ResourceResidency.MEMORYLESS);

                // Rendering
                const probePass = ppl.addRenderPass(width, height, 'default');
                probePass.name = `PlanarReflectionProbe${probeID}`;
                this._buildReflectionProbePass(probePass, cameraConfigs, id, probe.camera,
                    colorName, depthStencilName, mainLight, scene);
            } else if (EDITOR) {
                for (let faceIdx = 0; faceIdx < probe.bakedCubeTextures.length; faceIdx++) {
                    probe.updateCameraDir(faceIdx);
                    const window: renderer.RenderWindow = probe.bakedCubeTextures[faceIdx].window!;
                    const colorName = `CubeProbeRT${probeID}${faceIdx}`;
                    const depthStencilName = `CubeProbeDS${probeID}${faceIdx}`;
                    // ProbeResource
                    ppl.addRenderWindow(colorName,
                        cameraConfigs.radianceFormat, width, height, window);
                    ppl.addDepthStencil(depthStencilName,
                        gfx.Format.DEPTH_STENCIL, width, height, ResourceResidency.MEMORYLESS);

                    // Rendering
                    const probePass = ppl.addRenderPass(width, height, 'default');
                    probePass.name = `CubeProbe${probeID}${faceIdx}`;
                    this._buildReflectionProbePass(probePass, cameraConfigs, id, probe.camera,
                        colorName, depthStencilName, mainLight, scene);
                }
                probe.needRender = false;
            }
            ++probeID;
            if (probeID === maxProbeCount) {
                break;
            }
        }
    }
    private _buildReflectionProbePass(
        pass: rendering.BasicRenderPassBuilder,
        cameraConfigs: Readonly<CameraConfigs & ForwardPassConfigs>,
        id: number,
        camera: renderer.scene.Camera,
        colorName: string,
        depthStencilName: string,
        mainLight: renderer.scene.DirectionalLight | null,
        scene: renderer.RenderScene | null = null,
    ): void {
        const QueueHint = rendering.QueueHint;
        const SceneFlags = rendering.SceneFlags;
        // set viewport
        const colorStoreOp = cameraConfigs.enableMSAA ? StoreOp.DISCARD : StoreOp.STORE;

        // bind output render target
        if (forwardNeedClearColor(camera)) {
            this._reflectionProbeClearColor.x = camera.clearColor.x;
            this._reflectionProbeClearColor.y = camera.clearColor.y;
            this._reflectionProbeClearColor.z = camera.clearColor.z;
            const clearColor = rendering.packRGBE(this._reflectionProbeClearColor);
            this._clearColor.x = clearColor.x;
            this._clearColor.y = clearColor.y;
            this._clearColor.z = clearColor.z;
            this._clearColor.w = clearColor.w;
            pass.addRenderTarget(colorName, LoadOp.CLEAR, colorStoreOp, this._clearColor);
        } else {
            pass.addRenderTarget(colorName, LoadOp.LOAD, colorStoreOp);
        }

        // bind depth stencil buffer
        if (camera.clearFlag & ClearFlagBit.DEPTH_STENCIL) {
            pass.addDepthStencil(
                depthStencilName,
                LoadOp.CLEAR,
                StoreOp.DISCARD,
                camera.clearDepth,
                camera.clearStencil,
                camera.clearFlag & ClearFlagBit.DEPTH_STENCIL,
            );
        } else {
            pass.addDepthStencil(depthStencilName, LoadOp.LOAD, StoreOp.DISCARD);
        }

        // Set shadow map if enabled
        if (cameraConfigs.enableMainLightShadowMap) {
            pass.addTexture(`ShadowMap${id}`, 'cc_shadowMap');
        }

        // TODO(zhouzhenglong): Separate OPAQUE and MASK queue

        // add opaque and mask queue
        pass.addQueue(QueueHint.NONE, 'reflect-map') // Currently we put OPAQUE and MASK into one queue, so QueueHint is NONE
            .addScene(camera,
                SceneFlags.OPAQUE | SceneFlags.MASK | SceneFlags.REFLECTION_PROBE,
                mainLight || undefined,
                scene ? scene : undefined);
    }
    private _addForwardRadiancePasses(
        ppl: rendering.BasicPipeline,
        pplConfigs: Readonly<PipelineConfigs>,
        cameraConfigs: Readonly<CameraConfigs & ForwardPassConfigs>,
        id: number,
        camera: renderer.scene.Camera,
        width: number,
        height: number,
        mainLight: renderer.scene.DirectionalLight | null,
        colorName: string,
        depthStencilName: string,
        disableMSAA: boolean = false,
        depthStencilStoreOp: gfx.StoreOp = StoreOp.DISCARD,
    ): rendering.BasicRenderPassBuilder {
        const QueueHint = rendering.QueueHint;
        const SceneFlags = rendering.SceneFlags;
        // ----------------------------------------------------------------
        // Dynamic states
        // ----------------------------------------------------------------
        // Prepare camera clear color
        const clearColor = camera.clearColor; // Reduce C++/TS interop
        this._clearColor.x = clearColor.x;
        this._clearColor.y = clearColor.y;
        this._clearColor.z = clearColor.z;
        this._clearColor.w = clearColor.w;

        // Prepare camera viewport
        const viewport = camera.viewport; // Reduce C++/TS interop
        this._viewport.left = Math.round(viewport.x * width);
        this._viewport.top = Math.round(viewport.y * height);
        // Here we must use camera.viewport.width instead of camera.viewport.z, which
        // is undefined on native platform. The same as camera.viewport.height.
        this._viewport.width = Math.max(Math.round(viewport.width * width), 1);
        this._viewport.height = Math.max(Math.round(viewport.height * height), 1);

        // MSAA
        const enableMSAA = !disableMSAA && cameraConfigs.enableMSAA;
        assert(!enableMSAA || cameraConfigs.enableSingleForwardPass);

        // ----------------------------------------------------------------
        // Forward Lighting (Main Directional Light)
        // ----------------------------------------------------------------
        const pass = cameraConfigs.enableSingleForwardPass
            ? this._addForwardSingleRadiancePass(ppl, pplConfigs, cameraConfigs,
                id, camera, enableMSAA, width, height, mainLight,
                colorName, depthStencilName, depthStencilStoreOp)
            : this._addForwardMultipleRadiancePasses(ppl, cameraConfigs,
                id, camera, width, height, mainLight,
                colorName, depthStencilName, depthStencilStoreOp);

        // Planar Shadow
        if (cameraConfigs.enableMainLightPlanarShadowMap) {
            this._addPlanarShadowQueue(camera, mainLight, pass);
        }

        // ----------------------------------------------------------------
        // Forward Lighting (Blend)
        // ----------------------------------------------------------------
        // Add transparent queue

        const sceneFlags = SceneFlags.BLEND |
            (camera.geometryRenderer
                ? SceneFlags.GEOMETRY
                : SceneFlags.NONE);

        pass
            .addQueue(QueueHint.BLEND)
            .addScene(camera, sceneFlags, mainLight || undefined);

        return pass;
    }
    private _addForwardSingleRadiancePass(
        ppl: rendering.BasicPipeline,
        pplConfigs: Readonly<PipelineConfigs>,
        cameraConfigs: Readonly<CameraConfigs & ForwardPassConfigs>,
        id: number,
        camera: renderer.scene.Camera,
        enableMSAA: boolean,
        width: number,
        height: number,
        mainLight: renderer.scene.DirectionalLight | null,
        colorName: string,
        depthStencilName: string,
        depthStencilStoreOp: gfx.StoreOp
    ): rendering.BasicRenderPassBuilder {
        assert(cameraConfigs.enableSingleForwardPass);
        // ----------------------------------------------------------------
        // Forward Lighting (Main Directional Light)
        // ----------------------------------------------------------------
        let pass: rendering.BasicRenderPassBuilder;
        if (enableMSAA) {
            const msaaRadianceName = `MsaaRadiance${id}`;
            const msaaDepthStencilName = `MsaaDepthStencil${id}`;
            const sampleCount = cameraConfigs.settings.msaa.sampleCount;

            const msPass = ppl.addMultisampleRenderPass(width, height, sampleCount, 0, 'default');
            msPass.name = 'MsaaForwardPass';

            // MSAA always discards depth stencil
            this._buildForwardMainLightPass(msPass, cameraConfigs, id, camera,
                msaaRadianceName, msaaDepthStencilName, StoreOp.DISCARD, mainLight);

            msPass.resolveRenderTarget(msaaRadianceName, colorName);

            pass = msPass;
        } else {
            pass = ppl.addRenderPass(width, height, 'default');
            pass.name = 'ForwardPass';

            this._buildForwardMainLightPass(pass, cameraConfigs, id, camera,
                colorName, depthStencilName, depthStencilStoreOp, mainLight);
        }
        assert(pass !== undefined);

        // Forward Lighting (Additive Lights)
        this.forwardLighting.addLightQueues(
            pass,
            camera,
            pplConfigs.mobileMaxSpotLightShadowMaps,
        );

        return pass;
    }
    private _addForwardMultipleRadiancePasses(
        ppl: rendering.BasicPipeline,
        cameraConfigs: Readonly<CameraConfigs & ForwardPassConfigs>,
        id: number,
        camera: renderer.scene.Camera,
        width: number,
        height: number,
        mainLight: renderer.scene.DirectionalLight | null,
        colorName: string,
        depthStencilName: string,
        depthStencilStoreOp: gfx.StoreOp
    ): rendering.BasicRenderPassBuilder {
        assert(!cameraConfigs.enableSingleForwardPass);

        // Forward Lighting (Main Directional Light)
        let pass = ppl.addRenderPass(width, height, 'default');
        pass.name = 'ForwardPass';

        const firstStoreOp = this.forwardLighting.isMultipleLightPassesNeeded()
            ? StoreOp.STORE
            : depthStencilStoreOp;

        this._buildForwardMainLightPass(pass, cameraConfigs,
            id, camera, colorName, depthStencilName, firstStoreOp, mainLight);

        // Forward Lighting (Additive Lights)
        pass = this.forwardLighting
            .addLightPasses(colorName, depthStencilName, depthStencilStoreOp,
                id, width, height, camera, this._viewport, ppl, pass);

        return pass;
    }
    private _buildForwardMainLightPass(
        pass: rendering.BasicRenderPassBuilder,
        cameraConfigs: Readonly<CameraConfigs & ForwardPassConfigs>,
        id: number,
        camera: renderer.scene.Camera,
        colorName: string,
        depthStencilName: string,
        depthStencilStoreOp: gfx.StoreOp,
        mainLight: renderer.scene.DirectionalLight | null,
        scene: renderer.RenderScene | null = null,
    ): void {
        const QueueHint = rendering.QueueHint;
        const SceneFlags = rendering.SceneFlags;
        // set viewport
        pass.setViewport(this._viewport);

        const colorStoreOp = cameraConfigs.enableMSAA ? StoreOp.DISCARD : StoreOp.STORE;

        // bind output render target
        if (forwardNeedClearColor(camera)) {
            pass.addRenderTarget(colorName, LoadOp.CLEAR, colorStoreOp, this._clearColor);
        } else {
            pass.addRenderTarget(colorName, LoadOp.LOAD, colorStoreOp);
        }

        // bind depth stencil buffer
        if (DEBUG) {
            if (colorName === cameraConfigs.colorName &&
                depthStencilName !== cameraConfigs.depthStencilName) {
                warn('Default framebuffer cannot use custom depth stencil buffer');
            }
        }

        if (camera.clearFlag & ClearFlagBit.DEPTH_STENCIL) {
            pass.addDepthStencil(
                depthStencilName,
                LoadOp.CLEAR,
                depthStencilStoreOp,
                camera.clearDepth,
                camera.clearStencil,
                camera.clearFlag & ClearFlagBit.DEPTH_STENCIL,
            );
        } else {
            pass.addDepthStencil(depthStencilName, LoadOp.LOAD, depthStencilStoreOp);
        }

        // Set shadow map if enabled
        if (cameraConfigs.enableMainLightShadowMap) {
            pass.addTexture(`ShadowMap${id}`, 'cc_shadowMap');
        }

        // TODO(zhouzhenglong): Separate OPAQUE and MASK queue

        // add opaque and mask queue
        pass.addQueue(QueueHint.NONE) // Currently we put OPAQUE and MASK into one queue, so QueueHint is NONE
            .addScene(camera,
                SceneFlags.OPAQUE | SceneFlags.MASK,
                mainLight || undefined,
                scene ? scene : undefined);
    }
    private _addPlanarShadowQueue(
        camera: renderer.scene.Camera,
        mainLight: renderer.scene.DirectionalLight | null,
        pass: rendering.BasicRenderPassBuilder,
    ) {
        const QueueHint = rendering.QueueHint;
        const SceneFlags = rendering.SceneFlags;
        pass.addQueue(QueueHint.BLEND, 'planar-shadow')
            .addScene(
                camera,
                SceneFlags.SHADOW_CASTER | SceneFlags.PLANAR_SHADOW | SceneFlags.BLEND,
                mainLight || undefined,
            );
    }
    private readonly forwardLighting = new ForwardLighting();
    private readonly _viewport = new Viewport();
    private readonly _clearColor = new Color(0, 0, 0, 1);
    private readonly _reflectionProbeClearColor = new Vec3(0, 0, 0);
}

export interface BloomPassConfigs {
    enableBloom: boolean;
}

export class BuiltinBloomPassBuilder implements rendering.PipelinePassBuilder {
    getConfigOrder(): number {
        return 0;
    }
    getRenderOrder(): number {
        return 200;
    }
    configCamera(
        camera: Readonly<renderer.scene.Camera>,
        pipelineConfigs: Readonly<PipelineConfigs>,
        cameraConfigs: CameraConfigs & BloomPassConfigs): void {
        cameraConfigs.enableBloom
            = cameraConfigs.settings.bloom.enabled
            && !!cameraConfigs.settings.bloom.material;
        if (cameraConfigs.enableBloom) {
            ++cameraConfigs.remainingPasses;
        }
    }
    windowResize(
        ppl: rendering.BasicPipeline,
        pplConfigs: Readonly<PipelineConfigs>,
        cameraConfigs: CameraConfigs & BloomPassConfigs,
        window: renderer.RenderWindow): void {
        if (cameraConfigs.enableBloom) {
            const id = window.renderWindowId;
            let bloomWidth = cameraConfigs.width;
            let bloomHeight = cameraConfigs.height;
            for (let i = 0; i !== cameraConfigs.settings.bloom.iterations + 1; ++i) {
                bloomWidth = Math.max(Math.floor(bloomWidth / 2), 1);
                bloomHeight = Math.max(Math.floor(bloomHeight / 2), 1);
                ppl.addRenderTarget(`BloomTex${id}_${i}`,
                    cameraConfigs.radianceFormat, bloomWidth, bloomHeight);
            }
        }
    }

    setup(
        ppl: rendering.BasicPipeline,
        pplConfigs: Readonly<PipelineConfigs>,
        cameraConfigs: CameraConfigs & BloomPassConfigs,
        camera: renderer.scene.Camera,
        context: PipelineContext,
        prevRenderPass?: rendering.BasicRenderPassBuilder)
        : rendering.BasicRenderPassBuilder | undefined {
        if (!cameraConfigs.enableBloom) {
            return prevRenderPass;
        }

        --cameraConfigs.remainingPasses;
        assert(cameraConfigs.remainingPasses >= 0);
        const id = camera.window.renderWindowId;
        assert(!!cameraConfigs.settings.bloom.material);
        return this._addKawaseDualFilterBloomPasses(
            ppl, pplConfigs,
            cameraConfigs,
            cameraConfigs.settings,
            cameraConfigs.settings.bloom.material,
            id,
            cameraConfigs.width,
            cameraConfigs.height,
            context.colorName);
    }

    private _addKawaseDualFilterBloomPasses(
        ppl: rendering.BasicPipeline,
        pplConfigs: Readonly<PipelineConfigs>,
        cameraConfigs: CameraConfigs & Readonly<BloomPassConfigs>,
        settings: PipelineSettings,
        bloomMaterial: Material,
        id: number,
        width: number,
        height: number,
        radianceName: string,
    ): rendering.BasicRenderPassBuilder {
        const QueueHint = rendering.QueueHint;
        // Based on Kawase Dual Filter Blur. Saves bandwidth on mobile devices.
        // eslint-disable-next-line max-len
        // https://community.arm.com/cfs-file/__key/communityserver-blogs-components-weblogfiles/00-00-00-20-66/siggraph2015_2D00_mmg_2D00_marius_2D00_slides.pdf

        // Size: [prefilter(1/2), downsample(1/4), downsample(1/8), downsample(1/16), ...]
        const iterations = settings.bloom.iterations;
        const sizeCount = iterations + 1;
        this._bloomWidths.length = sizeCount;
        this._bloomHeights.length = sizeCount;
        this._bloomWidths[0] = Math.max(Math.floor(width / 2), 1);
        this._bloomHeights[0] = Math.max(Math.floor(height / 2), 1);
        for (let i = 1; i !== sizeCount; ++i) {
            this._bloomWidths[i] = Math.max(Math.floor(this._bloomWidths[i - 1] / 2), 1);
            this._bloomHeights[i] = Math.max(Math.floor(this._bloomHeights[i - 1] / 2), 1);
        }

        // Bloom texture names
        this._bloomTexNames.length = sizeCount;
        for (let i = 0; i !== sizeCount; ++i) {
            this._bloomTexNames[i] = `BloomTex${id}_${i}`;
        }

        // Setup bloom parameters
        this._bloomParams.x = pplConfigs.useFloatOutput ? 1 : 0;
        this._bloomParams.x = 0; // unused
        this._bloomParams.z = settings.bloom.threshold;
        this._bloomParams.w = settings.bloom.enableAlphaMask ? 1 : 0;

        // Prefilter pass
        const prefilterPass = ppl.addRenderPass(this._bloomWidths[0], this._bloomHeights[0], 'cc-bloom-prefilter');
        prefilterPass.addRenderTarget(
            this._bloomTexNames[0],
            LoadOp.CLEAR,
            StoreOp.STORE,
            this._clearColorTransparentBlack,
        );
        prefilterPass.addTexture(radianceName, 'inputTexture');
        prefilterPass.setVec4('g_platform', pplConfigs.platform);
        prefilterPass.setVec4('bloomParams', this._bloomParams);
        prefilterPass
            .addQueue(QueueHint.OPAQUE)
            .addFullscreenQuad(bloomMaterial, 0);

        // Downsample passes
        for (let i = 1; i !== sizeCount; ++i) {
            const downPass = ppl.addRenderPass(this._bloomWidths[i], this._bloomHeights[i], 'cc-bloom-downsample');
            downPass.addRenderTarget(this._bloomTexNames[i], LoadOp.CLEAR, StoreOp.STORE, this._clearColorTransparentBlack);
            downPass.addTexture(this._bloomTexNames[i - 1], 'bloomTexture');
            this._bloomTexSize.x = this._bloomWidths[i - 1];
            this._bloomTexSize.y = this._bloomHeights[i - 1];
            downPass.setVec4('g_platform', pplConfigs.platform);
            downPass.setVec4('bloomTexSize', this._bloomTexSize);
            downPass
                .addQueue(QueueHint.OPAQUE)
                .addFullscreenQuad(bloomMaterial, 1);
        }

        // Upsample passes
        for (let i = iterations; i-- > 0;) {
            const upPass = ppl.addRenderPass(this._bloomWidths[i], this._bloomHeights[i], 'cc-bloom-upsample');
            upPass.addRenderTarget(this._bloomTexNames[i], LoadOp.CLEAR, StoreOp.STORE, this._clearColorTransparentBlack);
            upPass.addTexture(this._bloomTexNames[i + 1], 'bloomTexture');
            this._bloomTexSize.x = this._bloomWidths[i + 1];
            this._bloomTexSize.y = this._bloomHeights[i + 1];
            upPass.setVec4('g_platform', pplConfigs.platform);
            upPass.setVec4('bloomTexSize', this._bloomTexSize);
            upPass
                .addQueue(QueueHint.OPAQUE)
                .addFullscreenQuad(bloomMaterial, 2);
        }

        // Combine pass
        const combinePass = ppl.addRenderPass(width, height, 'cc-bloom-combine');
        combinePass.addRenderTarget(radianceName, LoadOp.LOAD, StoreOp.STORE);
        combinePass.addTexture(this._bloomTexNames[0], 'bloomTexture');
        combinePass.setVec4('g_platform', pplConfigs.platform);
        combinePass.setVec4('bloomParams', this._bloomParams);
        combinePass
            .addQueue(QueueHint.BLEND)
            .addFullscreenQuad(bloomMaterial, 3);

        if (cameraConfigs.remainingPasses === 0) {
            return addCopyToScreenPass(ppl, pplConfigs, cameraConfigs, radianceName);
        } else {
            return combinePass;
        }
    }
    // Bloom
    private readonly _clearColorTransparentBlack = new Color(0, 0, 0, 0);
    private readonly _bloomParams = new Vec4(0, 0, 0, 0);
    private readonly _bloomTexSize = new Vec4(0, 0, 0, 0);
    private readonly _bloomWidths: Array<number> = [];
    private readonly _bloomHeights: Array<number> = [];
    private readonly _bloomTexNames: Array<string> = [];
}

export interface ToneMappingPassConfigs {
    enableToneMapping: boolean;
    enableColorGrading: boolean;
}

export class BuiltinToneMappingPassBuilder implements rendering.PipelinePassBuilder {
    getConfigOrder(): number {
        return 0;
    }
    getRenderOrder(): number {
        return 300;
    }
    configCamera(
        camera: Readonly<renderer.scene.Camera>,
        pplConfigs: Readonly<PipelineConfigs>,
        cameraConfigs: CameraConfigs & ToneMappingPassConfigs): void {
        const settings = cameraConfigs.settings;

        cameraConfigs.enableColorGrading
            = settings.colorGrading.enabled
            && !!settings.colorGrading.material
            && !!settings.colorGrading.colorGradingMap;

        cameraConfigs.enableToneMapping
            = cameraConfigs.enableHDR // From Half to RGBA8
            || cameraConfigs.enableColorGrading; // Color grading

        if (cameraConfigs.enableToneMapping) {
            ++cameraConfigs.remainingPasses;
        }
    }
    windowResize(
        ppl: rendering.BasicPipeline,
        pplConfigs: Readonly<PipelineConfigs>,
        cameraConfigs: CameraConfigs & ToneMappingPassConfigs): void {
        if (cameraConfigs.enableColorGrading) {
            assert(!!cameraConfigs.settings.colorGrading.material);
            cameraConfigs.settings.colorGrading.material.setProperty(
                'colorGradingMap',
                cameraConfigs.settings.colorGrading.colorGradingMap);
        }
    }
    setup(
        ppl: rendering.BasicPipeline,
        pplConfigs: Readonly<PipelineConfigs>,
        cameraConfigs: CameraConfigs & ToneMappingPassConfigs,
        camera: renderer.scene.Camera,
        context: PipelineContext,
        prevRenderPass?: rendering.BasicRenderPassBuilder)
        : rendering.BasicRenderPassBuilder | undefined {
        if (!cameraConfigs.enableToneMapping) {
            return prevRenderPass;
        }

        --cameraConfigs.remainingPasses;
        assert(cameraConfigs.remainingPasses >= 0);
        if (cameraConfigs.remainingPasses === 0) {
            return this._addCopyAndTonemapPass(ppl, pplConfigs, cameraConfigs,
                cameraConfigs.width, cameraConfigs.height,
                context.colorName, cameraConfigs.colorName);
        } else {
            const id = cameraConfigs.renderWindowId;
            const ldrColorPrefix = cameraConfigs.enableShadingScale
                ? `ScaledLdrColor`
                : `LdrColor`;

            const ldrColorName = getPingPongRenderTarget(context.colorName, ldrColorPrefix, id);
            const radianceName = context.colorName;
            context.colorName = ldrColorName;

            return this._addCopyAndTonemapPass(ppl, pplConfigs, cameraConfigs,
                cameraConfigs.width, cameraConfigs.height,
                radianceName, ldrColorName);
        }
    }
    private _addCopyAndTonemapPass(
        ppl: rendering.BasicPipeline,
        pplConfigs: Readonly<PipelineConfigs>,
        cameraConfigs: CameraConfigs & ToneMappingPassConfigs,
        width: number,
        height: number,
        radianceName: string,
        colorName: string,
    ): rendering.BasicRenderPassBuilder {
        let pass: rendering.BasicRenderPassBuilder;
        const settings = cameraConfigs.settings;
        if (cameraConfigs.enableColorGrading) {
            assert(!!settings.colorGrading.material);
            assert(!!settings.colorGrading.colorGradingMap);

            const lutTex = settings.colorGrading.colorGradingMap;
            this._colorGradingTexSize.x = lutTex.width;
            this._colorGradingTexSize.y = lutTex.height;

            const isSquareMap = lutTex.width === lutTex.height;
            if (isSquareMap) {
                pass = ppl.addRenderPass(width, height, 'cc-color-grading-8x8');
            } else {
                pass = ppl.addRenderPass(width, height, 'cc-color-grading-nx1');
            }
            pass.addRenderTarget(colorName, LoadOp.CLEAR, StoreOp.STORE, sClearColorTransparentBlack);
            pass.addTexture(radianceName, 'sceneColorMap');
            pass.setVec4('g_platform', pplConfigs.platform);
            pass.setVec2('lutTextureSize', this._colorGradingTexSize);
            pass.setFloat('contribute', settings.colorGrading.contribute);
            pass.addQueue(rendering.QueueHint.OPAQUE)
                .addFullscreenQuad(settings.colorGrading.material, isSquareMap ? 1 : 0);
        } else {
            pass = ppl.addRenderPass(width, height, 'cc-tone-mapping');
            pass.addRenderTarget(colorName, LoadOp.CLEAR, StoreOp.STORE, sClearColorTransparentBlack);
            pass.addTexture(radianceName, 'inputTexture');
            pass.setVec4('g_platform', pplConfigs.platform);
            if (settings.toneMapping.material) {
                pass.addQueue(rendering.QueueHint.OPAQUE)
                    .addFullscreenQuad(settings.toneMapping.material, 0);
            } else {
                assert(!!cameraConfigs.copyAndTonemapMaterial);
                pass.addQueue(rendering.QueueHint.OPAQUE)
                    .addFullscreenQuad(cameraConfigs.copyAndTonemapMaterial, 0);
            }
        }
        return pass;
    }
    private readonly _colorGradingTexSize = new Vec2(0, 0);
}

export interface FXAAPassConfigs {
    enableFXAA: boolean;
}

export class BuiltinFXAAPassBuilder implements rendering.PipelinePassBuilder {
    getConfigOrder(): number {
        return 0;
    }
    getRenderOrder(): number {
        return 400;
    }
    configCamera(
        camera: Readonly<renderer.scene.Camera>,
        pplConfigs: Readonly<PipelineConfigs>,
        cameraConfigs: CameraConfigs & FXAAPassConfigs): void {
        cameraConfigs.enableFXAA
            = cameraConfigs.settings.fxaa.enabled
            && !!cameraConfigs.settings.fxaa.material;
        if (cameraConfigs.enableFXAA) {
            ++cameraConfigs.remainingPasses;
        }
    }
    setup(
        ppl: rendering.BasicPipeline,
        pplConfigs: Readonly<PipelineConfigs>,
        cameraConfigs: CameraConfigs & FXAAPassConfigs,
        camera: renderer.scene.Camera,
        context: PipelineContext,
        prevRenderPass?: rendering.BasicRenderPassBuilder)
        : rendering.BasicRenderPassBuilder | undefined {
        if (!cameraConfigs.enableFXAA) {
            return prevRenderPass;
        }
        --cameraConfigs.remainingPasses;
        assert(cameraConfigs.remainingPasses >= 0);

        const id = cameraConfigs.renderWindowId;
        const ldrColorPrefix = cameraConfigs.enableShadingScale
            ? `ScaledLdrColor`
            : `LdrColor`;
        const ldrColorName = getPingPongRenderTarget(context.colorName, ldrColorPrefix, id);

        assert(!!cameraConfigs.settings.fxaa.material);
        if (cameraConfigs.remainingPasses === 0) {
            if (cameraConfigs.enableShadingScale) {
                this._addFxaaPass(ppl, pplConfigs,
                    cameraConfigs.settings.fxaa.material,
                    cameraConfigs.width,
                    cameraConfigs.height,
                    context.colorName,
                    ldrColorName);
                return addCopyToScreenPass(ppl, pplConfigs, cameraConfigs, ldrColorName);
            } else {
                assert(cameraConfigs.width === cameraConfigs.nativeWidth);
                assert(cameraConfigs.height === cameraConfigs.nativeHeight);
                return this._addFxaaPass(ppl, pplConfigs,
                    cameraConfigs.settings.fxaa.material,
                    cameraConfigs.width,
                    cameraConfigs.height,
                    context.colorName,
                    cameraConfigs.colorName);
            }
        } else {
            const inputColorName = context.colorName;
            context.colorName = ldrColorName;
            const lastPass = this._addFxaaPass(ppl, pplConfigs,
                cameraConfigs.settings.fxaa.material,
                cameraConfigs.width,
                cameraConfigs.height,
                inputColorName,
                ldrColorName);
            return lastPass;
        }
    }
    private _addFxaaPass(
        ppl: rendering.BasicPipeline,
        pplConfigs: Readonly<PipelineConfigs>,
        fxaaMaterial: Material,
        width: number,
        height: number,
        ldrColorName: string,
        colorName: string,
    ): rendering.BasicRenderPassBuilder {
        this._fxaaParams.x = width;
        this._fxaaParams.y = height;
        this._fxaaParams.z = 1 / width;
        this._fxaaParams.w = 1 / height;

        const pass = ppl.addRenderPass(width, height, 'cc-fxaa');
        pass.addRenderTarget(colorName, LoadOp.CLEAR, StoreOp.STORE, sClearColorTransparentBlack);
        pass.addTexture(ldrColorName, 'sceneColorMap');
        pass.setVec4('g_platform', pplConfigs.platform);
        pass.setVec4('texSize', this._fxaaParams);
        pass.addQueue(rendering.QueueHint.OPAQUE)
            .addFullscreenQuad(fxaaMaterial, 0);
        return pass;
    }
    // FXAA
    private readonly _fxaaParams = new Vec4(0, 0, 0, 0);
}

export interface FSRPassConfigs {
    enableFSR: boolean;
}

export class BuiltinFsrPassBuilder implements rendering.PipelinePassBuilder {
    getConfigOrder(): number {
        return 0;
    }
    getRenderOrder(): number {
        return 500;
    }
    configCamera(
        camera: Readonly<renderer.scene.Camera>,
        pplConfigs: Readonly<PipelineConfigs>,
        cameraConfigs: CameraConfigs & FSRPassConfigs): void {
        // FSR (Depend on Shading scale)
        cameraConfigs.enableFSR = cameraConfigs.settings.fsr.enabled
            && !!cameraConfigs.settings.fsr.material
            && cameraConfigs.enableShadingScale
            && cameraConfigs.shadingScale < 1.0;

        if (cameraConfigs.enableFSR) {
            ++cameraConfigs.remainingPasses;
        }
    }
    setup(
        ppl: rendering.BasicPipeline,
        pplConfigs: Readonly<PipelineConfigs>,
        cameraConfigs: CameraConfigs & FSRPassConfigs,
        camera: renderer.scene.Camera,
        context: PipelineContext,
        prevRenderPass?: rendering.BasicRenderPassBuilder)
        : rendering.BasicRenderPassBuilder | undefined {
        if (!cameraConfigs.enableFSR) {
            return prevRenderPass;
        }
        --cameraConfigs.remainingPasses;

        const inputColorName = context.colorName;
        const outputColorName
            = cameraConfigs.remainingPasses === 0
                ? cameraConfigs.colorName
                : getPingPongRenderTarget(context.colorName, 'UiColor', cameraConfigs.renderWindowId);
        context.colorName = outputColorName;

        assert(!!cameraConfigs.settings.fsr.material);
        return this._addFsrPass(ppl, pplConfigs, cameraConfigs,
            cameraConfigs.settings,
            cameraConfigs.settings.fsr.material,
            cameraConfigs.renderWindowId,
            cameraConfigs.width,
            cameraConfigs.height,
            inputColorName,
            cameraConfigs.nativeWidth,
            cameraConfigs.nativeHeight,
            outputColorName);
    }
    private _addFsrPass(
        ppl: rendering.BasicPipeline,
        pplConfigs: Readonly<PipelineConfigs>,
        cameraConfigs: CameraConfigs & FSRPassConfigs,
        settings: PipelineSettings,
        fsrMaterial: Material,
        id: number,
        width: number,
        height: number,
        inputColorName: string,
        nativeWidth: number,
        nativeHeight: number,
        outputColorName: string,
    ): rendering.BasicRenderPassBuilder {
        this._fsrTexSize.x = width;
        this._fsrTexSize.y = height;
        this._fsrTexSize.z = nativeWidth;
        this._fsrTexSize.w = nativeHeight;
        this._fsrParams.x = clamp(1.0 - settings.fsr.sharpness, 0.02, 0.98);

        const uiColorPrefix = 'UiColor';

        const fsrColorName = getPingPongRenderTarget(outputColorName, uiColorPrefix, id);

        const easuPass = ppl.addRenderPass(nativeWidth, nativeHeight, 'cc-fsr-easu');
        easuPass.addRenderTarget(fsrColorName, LoadOp.CLEAR, StoreOp.STORE, sClearColorTransparentBlack);
        easuPass.addTexture(inputColorName, 'outputResultMap');
        easuPass.setVec4('g_platform', pplConfigs.platform);
        easuPass.setVec4('fsrTexSize', this._fsrTexSize);
        easuPass
            .addQueue(rendering.QueueHint.OPAQUE)
            .addFullscreenQuad(fsrMaterial, 0);

        const rcasPass = ppl.addRenderPass(nativeWidth, nativeHeight, 'cc-fsr-rcas');
        rcasPass.addRenderTarget(outputColorName, LoadOp.CLEAR, StoreOp.STORE, sClearColorTransparentBlack);
        rcasPass.addTexture(fsrColorName, 'outputResultMap');
        rcasPass.setVec4('g_platform', pplConfigs.platform);
        rcasPass.setVec4('fsrTexSize', this._fsrTexSize);
        rcasPass.setVec4('fsrParams', this._fsrParams);
        rcasPass
            .addQueue(rendering.QueueHint.OPAQUE)
            .addFullscreenQuad(fsrMaterial, 1);

        return rcasPass;
    }
    // FSR
    private readonly _fsrParams = new Vec4(0, 0, 0, 0);
    private readonly _fsrTexSize = new Vec4(0, 0, 0, 0);
}

export class BuiltinUiPassBuilder implements rendering.PipelinePassBuilder {
    getConfigOrder(): number {
        return 0;
    }
    getRenderOrder(): number {
        return 1000;
    }
    setup(
        ppl: rendering.BasicPipeline,
        pplConfigs: Readonly<PipelineConfigs>,
        cameraConfigs: CameraConfigs & FSRPassConfigs,
        camera: renderer.scene.Camera,
        context: PipelineContext,
        prevRenderPass?: rendering.BasicRenderPassBuilder)
        : rendering.BasicRenderPassBuilder | undefined {
        assert(!!prevRenderPass);

        let flags = rendering.SceneFlags.UI;
        if (cameraConfigs.enableProfiler) {
            flags |= rendering.SceneFlags.PROFILER;
            prevRenderPass.showStatistics = true;
        }
        prevRenderPass
            .addQueue(rendering.QueueHint.BLEND, 'default', 'default')
            .addScene(camera, flags);

        return prevRenderPass;
    }
}

if (rendering) {

    const { QueueHint, SceneFlags } = rendering;

    class BuiltinPipelineBuilder implements rendering.PipelineBuilder {
        private readonly _pipelineEvent: PipelineEventProcessor = cclegacy.director.root.pipelineEvent as PipelineEventProcessor;
        private readonly _forwardPass = new BuiltinForwardPassBuilder();
        private readonly _bloomPass = new BuiltinBloomPassBuilder();
        private readonly _toneMappingPass = new BuiltinToneMappingPassBuilder();
        private readonly _fxaaPass = new BuiltinFXAAPassBuilder();
        private readonly _fsrPass = new BuiltinFsrPassBuilder();
        private readonly _uiPass = new BuiltinUiPassBuilder();
        // Internal cached resources
        private readonly _clearColor = new Color(0, 0, 0, 1);
        private readonly _viewport = new Viewport();
        private readonly _configs = new PipelineConfigs();
        private readonly _cameraConfigs = new CameraConfigs();
        // Materials
        private readonly _copyAndTonemapMaterial = new Material();

        // Internal States
        private _initialized = false; // TODO(zhouzhenglong): Make default effect asset loading earlier and remove this flag
        private _passBuilders: rendering.PipelinePassBuilder[] = [];

        private _setupPipelinePreview(
            camera: renderer.scene.Camera,
            cameraConfigs: CameraConfigs) {
            const isEditorView: boolean
                = camera.cameraUsage === CameraUsage.SCENE_VIEW
                || camera.cameraUsage === CameraUsage.PREVIEW;

            if (isEditorView) {
                const editorSettings = rendering.getEditorPipelineSettings() as PipelineSettings | null;
                if (editorSettings) {
                    cameraConfigs.settings = editorSettings;
                } else {
                    cameraConfigs.settings = defaultSettings;
                }
            } else {
                if (camera.pipelineSettings) {
                    cameraConfigs.settings = camera.pipelineSettings as PipelineSettings;
                } else {
                    cameraConfigs.settings = defaultSettings;
                }
            }
        }

        private _preparePipelinePasses(cameraConfigs: CameraConfigs): void {
            const passBuilders = this._passBuilders;
            passBuilders.length = 0;

            const settings = cameraConfigs.settings as PipelineSettings2;
            if (settings._passes) {
                for (const pass of settings._passes) {
                    passBuilders.push(pass);
                }
                assert(passBuilders.length === settings._passes.length);
            }

            passBuilders.push(this._forwardPass);

            if (settings.bloom.enabled) {
                passBuilders.push(this._bloomPass);
            }

            passBuilders.push(this._toneMappingPass);

            if (settings.fxaa.enabled) {
                passBuilders.push(this._fxaaPass);
            }

            if (settings.fsr.enabled) {
                passBuilders.push(this._fsrPass);
            }
            passBuilders.push(this._uiPass);
        }

        private _setupBuiltinCameraConfigs(
            camera: renderer.scene.Camera,
            pipelineConfigs: PipelineConfigs,
            cameraConfigs: CameraConfigs
        ) {
            const window = camera.window;
            const isMainGameWindow: boolean = camera.cameraUsage === CameraUsage.GAME && !!window.swapchain;

            // Window
            cameraConfigs.isMainGameWindow = isMainGameWindow;
            cameraConfigs.renderWindowId = window.renderWindowId;

            // Camera
            cameraConfigs.colorName = window.colorName;
            cameraConfigs.depthStencilName = window.depthStencilName;

            // Pipeline
            cameraConfigs.enableFullPipeline = (camera.visibility & (Layers.Enum.DEFAULT)) !== 0;
            cameraConfigs.enableProfiler = DEBUG && isMainGameWindow;
            cameraConfigs.remainingPasses = 0;

            // Shading scale
            cameraConfigs.shadingScale = cameraConfigs.settings.shadingScale;
            cameraConfigs.enableShadingScale = cameraConfigs.settings.enableShadingScale
                && cameraConfigs.shadingScale !== 1.0;

            cameraConfigs.nativeWidth = Math.max(Math.floor(window.width), 1);
            cameraConfigs.nativeHeight = Math.max(Math.floor(window.height), 1);

            cameraConfigs.width = cameraConfigs.enableShadingScale
                ? Math.max(Math.floor(cameraConfigs.nativeWidth * cameraConfigs.shadingScale), 1)
                : cameraConfigs.nativeWidth;
            cameraConfigs.height = cameraConfigs.enableShadingScale
                ? Math.max(Math.floor(cameraConfigs.nativeHeight * cameraConfigs.shadingScale), 1)
                : cameraConfigs.nativeHeight;

            // Radiance
            cameraConfigs.enableHDR = cameraConfigs.enableFullPipeline
                && pipelineConfigs.useFloatOutput;
            cameraConfigs.radianceFormat = cameraConfigs.enableHDR
                ? gfx.Format.RGBA16F : gfx.Format.RGBA8;

            // Tone Mapping
            cameraConfigs.copyAndTonemapMaterial = this._copyAndTonemapMaterial;

            // Depth
            cameraConfigs.enableStoreSceneDepth = false;
        }

        private _setupCameraConfigs(
            camera: renderer.scene.Camera,
            pipelineConfigs: PipelineConfigs,
            cameraConfigs: CameraConfigs
        ): void {
            this._setupPipelinePreview(camera, cameraConfigs);

            this._preparePipelinePasses(cameraConfigs);

            sortPipelinePassBuildersByConfigOrder(this._passBuilders);

            this._setupBuiltinCameraConfigs(camera, pipelineConfigs, cameraConfigs);

            for (const builder of this._passBuilders) {
                if (builder.configCamera) {
                    builder.configCamera(camera, pipelineConfigs, cameraConfigs);
                }
            }
        }

        // ----------------------------------------------------------------
        // Interface
        // ----------------------------------------------------------------
        windowResize(
            ppl: rendering.BasicPipeline,
            window: renderer.RenderWindow,
            camera: renderer.scene.Camera,
            nativeWidth: number,
            nativeHeight: number,
        ): void {
            setupPipelineConfigs(ppl, this._configs);

            this._setupCameraConfigs(camera, this._configs, this._cameraConfigs);

            // Render Window (UI)
            const id = window.renderWindowId;

            ppl.addRenderWindow(this._cameraConfigs.colorName,
                Format.RGBA8, nativeWidth, nativeHeight, window,
                this._cameraConfigs.depthStencilName);

            const width = this._cameraConfigs.width;
            const height = this._cameraConfigs.height;

            if (this._cameraConfigs.enableShadingScale) {
                ppl.addDepthStencil(`ScaledSceneDepth_${id}`, Format.DEPTH_STENCIL, width, height);
                ppl.addRenderTarget(`ScaledRadiance0_${id}`, this._cameraConfigs.radianceFormat, width, height);
                ppl.addRenderTarget(`ScaledRadiance1_${id}`, this._cameraConfigs.radianceFormat, width, height);
                ppl.addRenderTarget(`ScaledLdrColor0_${id}`, Format.RGBA8, width, height);
                ppl.addRenderTarget(`ScaledLdrColor1_${id}`, Format.RGBA8, width, height);
            } else {
                ppl.addDepthStencil(`SceneDepth_${id}`, Format.DEPTH_STENCIL, width, height);
                ppl.addRenderTarget(`Radiance0_${id}`, this._cameraConfigs.radianceFormat, width, height);
                ppl.addRenderTarget(`Radiance1_${id}`, this._cameraConfigs.radianceFormat, width, height);
                ppl.addRenderTarget(`LdrColor0_${id}`, Format.RGBA8, width, height);
                ppl.addRenderTarget(`LdrColor1_${id}`, Format.RGBA8, width, height);
            }
            ppl.addRenderTarget(`UiColor0_${id}`, Format.RGBA8, nativeWidth, nativeHeight);
            ppl.addRenderTarget(`UiColor1_${id}`, Format.RGBA8, nativeWidth, nativeHeight);

            for (const builder of this._passBuilders) {
                if (builder.windowResize) {
                    builder.windowResize(ppl, this._configs, this._cameraConfigs, window, camera, nativeWidth, nativeHeight);
                }
            }
        }
        setup(cameras: renderer.scene.Camera[], ppl: rendering.BasicPipeline): void {
            // TODO(zhouzhenglong): Make default effect asset loading earlier and remove _initMaterials
            if (this._initMaterials(ppl)) {
                return;
            }
            // Render cameras
            // log(`==================== One Frame ====================`);
            for (const camera of cameras) {
                // Skip invalid camera
                if (!camera.scene || !camera.window) {
                    continue;
                }
                // Setup camera configs
                this._setupCameraConfigs(camera, this._configs, this._cameraConfigs);
                // log(`Setup camera: ${camera.node!.name}, window: ${camera.window.renderWindowId}, isFull: ${this._cameraConfigs.enableFullPipeline}, `
                //     + `size: ${camera.window.width}x${camera.window.height}`);

                this._pipelineEvent.emit(PipelineEventType.RENDER_CAMERA_BEGIN, camera);

                // Build pipeline
                if (this._cameraConfigs.enableFullPipeline) {
                    this._buildForwardPipeline(ppl, camera, camera.scene, this._passBuilders);
                } else {
                    this._buildSimplePipeline(ppl, camera);
                }

                this._pipelineEvent.emit(PipelineEventType.RENDER_CAMERA_END, camera);
            }
        }
        // ----------------------------------------------------------------
        // Pipelines
        // ----------------------------------------------------------------
        private _buildSimplePipeline(
            ppl: rendering.BasicPipeline,
            camera: renderer.scene.Camera,
        ): void {
            const width = Math.max(Math.floor(camera.window.width), 1);
            const height = Math.max(Math.floor(camera.window.height), 1);
            const colorName = this._cameraConfigs.colorName;
            const depthStencilName = this._cameraConfigs.depthStencilName;

            const viewport = camera.viewport;  // Reduce C++/TS interop
            this._viewport.left = Math.round(viewport.x * width);
            this._viewport.top = Math.round(viewport.y * height);
            // Here we must use camera.viewport.width instead of camera.viewport.z, which
            // is undefined on native platform. The same as camera.viewport.height.
            this._viewport.width = Math.max(Math.round(viewport.width * width), 1);
            this._viewport.height = Math.max(Math.round(viewport.height * height), 1);

            const clearColor = camera.clearColor;  // Reduce C++/TS interop
            this._clearColor.x = clearColor.x;
            this._clearColor.y = clearColor.y;
            this._clearColor.z = clearColor.z;
            this._clearColor.w = clearColor.w;

            const pass = ppl.addRenderPass(width, height, 'default');

            // bind output render target
            if (forwardNeedClearColor(camera)) {
                pass.addRenderTarget(colorName, LoadOp.CLEAR, StoreOp.STORE, this._clearColor);
            } else {
                pass.addRenderTarget(colorName, LoadOp.LOAD, StoreOp.STORE);
            }

            // bind depth stencil buffer
            if (camera.clearFlag & ClearFlagBit.DEPTH_STENCIL) {
                pass.addDepthStencil(
                    depthStencilName,
                    LoadOp.CLEAR,
                    StoreOp.DISCARD,
                    camera.clearDepth,
                    camera.clearStencil,
                    camera.clearFlag & ClearFlagBit.DEPTH_STENCIL,
                );
            } else {
                pass.addDepthStencil(depthStencilName, LoadOp.LOAD, StoreOp.DISCARD);
            }

            pass.setViewport(this._viewport);

            // The opaque queue is used for Reflection probe preview
            pass.addQueue(QueueHint.OPAQUE)
                .addScene(camera, SceneFlags.OPAQUE);

            // The blend queue is used for UI and Gizmos
            let flags = SceneFlags.BLEND | SceneFlags.UI;
            if (this._cameraConfigs.enableProfiler) {
                flags |= SceneFlags.PROFILER;
                pass.showStatistics = true;
            }
            pass.addQueue(QueueHint.BLEND)
                .addScene(camera, flags);
        }

        private _buildForwardPipeline(
            ppl: rendering.BasicPipeline,
            camera: renderer.scene.Camera,
            scene: renderer.RenderScene,
            passBuilders: rendering.PipelinePassBuilder[],
        ): void {
            sortPipelinePassBuildersByRenderOrder(passBuilders);

            const context: PipelineContext = {
                colorName: '',
                depthStencilName: '',
            };

            let lastPass: rendering.BasicRenderPassBuilder | undefined = undefined;

            for (const builder of passBuilders) {
                if (builder.setup) {
                    lastPass = builder.setup(ppl, this._configs, this._cameraConfigs,
                        camera, context, lastPass);
                }
            }

            assert(this._cameraConfigs.remainingPasses === 0);
        }

        private _initMaterials(ppl: rendering.BasicPipeline): number {
            if (this._initialized) {
                return 0;
            }

            setupPipelineConfigs(ppl, this._configs);

            // When add new effect asset, please add its uuid to the dependentAssets in cc.config.json.
            this._copyAndTonemapMaterial._uuid = `builtin-pipeline-tone-mapping-material`;
            this._copyAndTonemapMaterial.initialize({ effectName: 'pipeline/post-process/tone-mapping' });

            if (this._copyAndTonemapMaterial.effectAsset) {
                this._initialized = true;
            }

            return this._initialized ? 0 : 1;
        }
    }

    rendering.setCustomPipeline('Builtin', new BuiltinPipelineBuilder());

} // if (rendering)
