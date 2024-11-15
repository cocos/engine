/*
 Copyright (c) 2021-2024 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com

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

/**
 * ========================= !DO NOT CHANGE THE FOLLOWING SECTION MANUALLY! =========================
 * The following section is auto-generated.
 * ========================= !DO NOT CHANGE THE FOLLOWING SECTION MANUALLY! =========================
 */
/* eslint-disable max-len */
import type { Material } from '../../asset/assets';
import type { Camera } from '../../render-scene/scene/camera';
import type { DirectionalLight } from '../../render-scene/scene/directional-light';
import type { GeometryRenderer } from '../geometry-renderer';
import type { Buffer, BufferInfo, ClearFlagBit, Color, CommandBuffer, DescriptorSet, DescriptorSetLayout, Device, Format, LoadOp, ResolveMode, SampleCount, Sampler, ShaderStageFlagBit, StoreOp, Swapchain, Texture, TextureInfo, TextureType, Viewport } from '../../gfx';
import type { GlobalDSManager } from '../global-descriptor-set-manager';
import type { Mat4, Quat, Vec2, Vec4 } from '../../core/math';
import type { MacroRecord } from '../../render-scene/core/pass-utils';
import type { PipelineSceneData } from '../pipeline-scene-data';
import type { PointLight } from '../../render-scene/scene/point-light';
import type { RangedDirectionalLight } from '../../render-scene/scene/ranged-directional-light';
import type { AccessType, CopyPair, LightInfo, MovePair, QueueHint, ResolvePair, ResourceDimension, ResourceFlags, ResourceResidency, SceneFlags, UpdateFrequency, UploadPair } from './types';
import type { RenderScene } from '../../render-scene/core/render-scene';
import type { RenderWindow } from '../../render-scene/core/render-window';
import type { Light, Model } from '../../render-scene/scene';
import type { SphereLight } from '../../render-scene/scene/sphere-light';
import type { SpotLight } from '../../render-scene/scene/spot-light';

/**
 * @engineInternal
 * @en PipelineRuntime is the runtime of both classical and custom pipelines.
 * It is used internally and should not be called directly.
 * @zh PipelineRuntime是经典管线以及自定义管线的运行时。
 * 属于内部实现，用户不应直接调用。
 */
export interface PipelineRuntime {
    /**
     * @en Activate PipelineRuntime with default swapchain
     * @zh 用默认交换链初始化PipelineRuntime
     * @param swapchain @en Default swapchain @zh 默认的交换链
     * @returns Success or not
     */
    activate (swapchain: Swapchain): boolean;
    /**
     * @en Destroy resources of PipelineRuntime
     * @zh 销毁PipelineRuntime所持资源
     * @returns Success or not
     */
    destroy (): boolean;
    /**
     * @en Render contents of cameras
     * @zh 根据相机进行绘制
     * @param cameras @en Camera list @zh 相机列表
     */
    render (cameras: Camera[]): void;
    /**
     * @en Get graphics device
     * @zh 获得图形设备
     */
    readonly device: Device;
    /**
     * @en Get user macros
     * @zh 获得用户宏列表
     */
    readonly macros: MacroRecord;
    /**
     * @en Get global descriptor set manager
     * @zh 获得全局(Global)级别描述符集(DescriptorSet)管理器
     */
    readonly globalDSManager: GlobalDSManager;
    /**
     * @en Get global descriptor set layout
     * @zh 获得全局(Global)级别描述符集的布局(DescriptorSet Layout)
     */
    readonly descriptorSetLayout: DescriptorSetLayout;
    /**
     * @en Get global descriptor set
     * @zh 获得全局(Global)级别描述符集(DescriptorSet)
     */
    readonly descriptorSet: DescriptorSet;
    /**
     * @en Get command buffers of render pipeline
     * @zh 获得渲染管线的命令缓冲(CommandBuffer)列表
     */
    readonly commandBuffers: CommandBuffer[];
    /**
     * @en Get scene data of render pipeline.
     * Scene data contains render configurations of the current scene.
     * @zh 获得渲染管线相关的场景数据，此场景数据一般包含渲染所需配置信息
     */
    readonly pipelineSceneData: PipelineSceneData;
    /**
     * @en Get constant macros.
     * Constant macro is platform-dependent and immutable.
     * @zh 获得常量宏列表，常量宏平台相关且无法修改
     */
    readonly constantMacros: string;
    /**
     * @en Get profiler model.
     * This model is used to render profile information in Debug mode.
     * @zh 获得分析工具(Profiler)的渲染实例，用于Debug模式下显示调试与性能检测信息
     */
    profiler: Model | null;
    /**
     * @en Get geometry renderer.
     * Geometry renderer is used to render procedural geometries.
     * @zh 获得几何渲染器(GeometryRenderer)，几何渲染器用于程序化渲染基础几何图形
     */
    readonly geometryRenderer: GeometryRenderer | null;
    /**
     * @en Get shading scale.
     * Shading scale affects shading texels per pixel.
     * Currently it affects classic native forward pipeline and builtin custom pipeline.
     * Users can change the size of the render targets according to the shading scale,
     * when writing their own custom pipelines.
     * To change screen size, please check director.root.resize.
     * @zh 获得渲染倍率(ShadingScale)，每像素(pixel)绘制的纹素(texel)会根据渲染倍率进行调整。
     * 目前仅对原有原生Forward管线以及内置自定义管线生效。
     * 用户编写自定义管线时，可以根据渲染倍率进行渲染目标尺寸大小的调整。
     * 如果要修改屏幕大小，详见director.root.resize。
     */
    shadingScale: number;
    /**
     * @en Get macro as string.
     * @zh 根据宏名获得字符串
     * @param name @en Name of macro @zh 宏的名字
     * @returns String value
     */
    getMacroString (name: string): string;
    /**
     * @en Get macro as integer.
     * @zh 根据宏名获得整型
     * @param name @en Name of macro @zh 宏的名字
     * @returns Integer value
     */
    getMacroInt (name: string): number;
    /**
     * @en Get macro as boolean.
     * @zh 根据宏名获得布尔值
     * @param name @en Name of macro @zh 宏的名字
     * @returns Boolean value
     */
    getMacroBool (name: string): boolean;
    /**
     * @en Assign string value to macro.
     * @zh 给宏赋值字符串
     * @param name @en Name of macro @zh 宏的名字
     * @param value @en String value @zh 字符串
     */
    setMacroString (name: string, value: string): void;
    /**
     * @en Assign integer value to macro.
     * @zh 给宏赋值整型
     * @param name @en Name of macro @zh 宏的名字
     * @param value @en Integer value @zh 整型值
     */
    setMacroInt (name: string, value: number): void;
    /**
     * @en Assign boolean value to macro.
     * @zh 给宏赋值布尔值
     * @param name @en Name of macro @zh 宏的名字
     * @param value @en Boolean value @zh 布尔值
     */
    setMacroBool (name: string, value: boolean): void;
    /**
     * @en Trigger pipeline state change event
     * @zh 触发管线状态更新事件
     */
    onGlobalPipelineStateChanged (): void;
}

/**
 * @en Type of render pipeline.
 * Different types of pipeline have different hardward capabilities and interfaces.
 * @zh 管线类型，不同类型的管线具有不同的硬件能力与接口
 */
export enum PipelineType {
    /**
     * @en Basic render pipeline.
     * Basic render pipeline is available on all platforms.
     * The corresponding interface is {@link BasicPipeline}
     * @zh 基础渲染管线，全平台支持。对应接口为 {@link BasicPipeline}
     */
    BASIC,
    /**
     * @en Standard render pipeline.
     * Standard render pipeline supports compute shader and subpass rendering.
     * It works well on Tile-based GPUs and is available on all native platforms.
     * Vulkan, GLES3 and Metal backends are supported.
     * The corresponding interface is {@link Pipeline}
     * @zh 标准渲染管线.
     * 标准渲染管线支持计算着色器(Compute Shader)与次通道渲染(Subpass rendering)。
     * 能充分利用Tile-based GPU，支持所有原生平台并对移动平台特别优化。
     * 支持Vulkan、GLES3、Metal图形后端。
     * 对应接口为{@link Pipeline}
     */
    STANDARD,
}

/**
 * @en Render subpass capabilities.
 * Tile-based GPUs support reading color or depth_stencil attachment in pixel shader.
 * Our implementation is based-on Vulkan abstraction (aka input attachment),
 * and it is emulated on other graphics backends.
 * For example, in GLES3 we have used various framebuffer fetch (FBF) extensions.
 * As a result, different backends and hardwares support different input attachment features.
 * User should inspect pipeline capabilities when implementing tile-based rendering algorithms.
 * Using unsupported feature is undefined behaviour.
 * @zh 次通道渲染能力
 * Tile-based GPU可以在像素着色器读取当前像素的值。
 * 我们的抽象方式基于Vulkan的input attachment，并在其他图形后端模拟了这个功能。
 * 比如在GLES3上，我们使用了多种framebuffer fetch (FBF) 扩展来实现这个功能。
 * 所以对于不同的硬件以及图形API，支持的能力是略有不同的。
 * 在编写渲染算法时，应该查询当前设备的能力，来选择合适的tile-based算法。
 * 使用硬件不支持的特性，会导致未定义行为。
 */
export enum SubpassCapabilities {
    NONE = 0,
    /**
     * @en Supports read depth/stencil value at current pixel.
     * @zh 支持读取当前像素的depth/stencil值
     */
    INPUT_DEPTH_STENCIL = 1 << 0,
    /**
     * @en Supports read color value 0 at current pixel.
     * @zh 支持读取当前像素第0个颜色值
     */
    INPUT_COLOR = 1 << 1,
    /**
     * @en Supports read color values at current pixel.
     * @zh 支持读取当前像素任意颜色值
     */
    INPUT_COLOR_MRT = 1 << 2,
    /**
     * @en Each subpass has its own sample count.
     * @zh 每个Subpass拥有不同的采样数
     */
    HETEROGENEOUS_SAMPLE_COUNT = 1 << 3,
}

/**
 * @en Pipeline capabilities.
 * The following capabilities are partially supported on different hardware and graphics backends.
 * @zh 管线能力。根据硬件与后端，支持的特性会有所不同
 */
export class PipelineCapabilities {
    subpass: SubpassCapabilities = SubpassCapabilities.NONE;
}

/**
 * @en Base class of render graph node.
 * A node of render graph represents a specific type of rendering operation.
 * A render graph consists of these nodes and form a forest(which is a set of trees).
 * @zh RenderGraph中节点的基类，每个RenderGraph节点代表一种渲染操作，并构成一个森林(一组树)
 */
export interface RenderNode {
    /**
     * @en Get debug name of current node.
     * @zh 获得当前节点调试用的名字
     */
    name: string;
    /**
     * @experimental
     */
    setCustomBehavior (name: string): void;
}

/**
 * @en Render node which supports setting uniforms and descriptors.
 * @zh 节点支持设置常量值(uniform/constant)与描述符
 */
export interface Setter extends RenderNode {
    /**
     * @en Set matrix4x4 常量(uniform) which consists of 16 floats (64 bytes).
     * @zh 设置4x4矩阵，常量(uniform)有16个float (64 bytes)
     * @param name @en uniform name in shader. @zh 填写着色器中的常量(uniform)名字
     */
    setMat4 (name: string, mat: Mat4): void;
    /**
     * @en Set quaternion uniform which consists of 4 floats (16 bytes).
     * @zh 设置四元数向量，常量(uniform)有4个float (16 bytes)
     * @param name @en uniform name in shader. @zh 填写着色器中的常量(uniform)名字
     */
    setQuaternion (name: string, quat: Quat): void;
    /**
     * @en Set color uniform which consists of 4 floats (16 bytes).
     * @zh 设置颜色值，常量(uniform)有4个float (16 bytes)
     * @param name @en uniform name in shader. @zh 填写着色器中的常量(uniform)名字
     */
    setColor (name: string, color: Color): void;
    /**
     * @en Set vector4 uniform which consists of 4 floats (16 bytes).
     * @zh 设置vector4向量，常量(uniform)有4个float (16 bytes)
     * @param name @en uniform name in shader. @zh 填写着色器中的常量(uniform)名字
     */
    setVec4 (name: string, vec: Vec4): void;
    /**
     * @en Set vector2 uniform which consists of 2 floats (8 bytes).
     * @zh 设置vector2向量，常量(uniform)有2个float (8 bytes)
     * @param name @en uniform name in shader. @zh 填写着色器中的常量(uniform)名字
     */
    setVec2 (name: string, vec: Vec2): void;
    /**
     * @en Set float uniform (4 bytes).
     * @zh 设置浮点值 (4 bytes)
     * @param name @en uniform name in shader. @zh 填写着色器中的常量(uniform)名字
     */
    setFloat (name: string, v: number): void;
    /**
     * @en Set uniform array.
     * Size and type of the data should match the corresponding uniforms in the shader.
     * Mismatches will cause undefined behaviour.
     * Memory alignment is not required.
     * @zh 设置数组。类型与大小需要与着色器中的常量(uniform)相匹配，不匹配会引起未定义行为。
     * 内存地址不需要对齐。
     * @param name @en uniform name in shader. @zh 填写着色器中的常量(uniform)名字
     * @param arrayBuffer @en array of bytes @zh byte数组
     */
    setArrayBuffer (name: string, arrayBuffer: ArrayBuffer): void;
    /**
     * @en Set buffer descriptor.
     * Size and type of the buffer should match the one in shader.
     * Buffer should be in read states and satisfy shader stage visibilities.
     * Mismatches will cause undefined behaviour.
     * @zh 设置缓冲(buffer)描述符。大小与类型需要与着色器中的一致，处于只读状态且着色阶段可见。
     * 不匹配会引起未定义行为。
     * @param name @en descriptor name in shader. @zh 填写着色器中的描述符(descriptor)名字
     * @param buffer @en readonly buffer @zh 只读的缓冲
     */
    setBuffer (name: string, buffer: Buffer): void;
    /**
     * @en Set texture descriptor.
     * Type of the texture should match the one in shader.
     * Texture should be in read states and satisfy shader stage visibilities.
     * Mismatches will cause undefined behaviour.
     * @zh 设置贴图描述符。类型需要与着色器中的一致，处于只读状态且着色阶段可见。
     * 不匹配会引起未定义行为。
     * @param name @en descriptor name in shader. @zh 填写着色器中的描述符(descriptor)名字
     * @param texture @en readonly texture @zh 只读的贴图
     */
    setTexture (name: string, texture: Texture): void;
    /**
     * @en Set sampler descriptor.
     * Type of the sampler should match the one in shader.
     * @zh 设置采样器描述符。类型需要与着色器中的一致。
     * 不匹配会引起未定义行为。
     * @param name @en descriptor name in shader. @zh 填写着色器中的描述符(descriptor)名字
     */
    setSampler (name: string, sampler: Sampler): void;
    /**
     * @en Set builtin camera constants of CCCamera, such as cc_matView.
     * For list of constants, please check CCCamera in cc-global.chunk.
     * @zh 设置内置相机常量，例如cc_matView。
     * 具体常量见cc-global.chunk中的CCCamera.
     * @param camera @en The camera instance to be set. @zh 当前相机
     */
    setBuiltinCameraConstants (camera: Camera): void;
    /**
     * @en Set builtin directional light and shadow constants.
     * For list of constants, please check CCShadow in cc-shadow.chunk and CCCamera in cc-global.chunk.
     * @zh 设置内置方向光与阴影常量。
     * 具体常量见cc-shadow.chunk中的CCShadow与cc-global.chunk中的CCCamera。
     * @param light @en The main light. @zh 主光
     * @param camera @en The camera instance to be set. @zh 当前相机
     */
    setBuiltinDirectionalLightConstants (light: DirectionalLight, camera: Camera): void;
    /**
     * @en Set builtin sphere light and shadow constants.
     * For list of constants, please check CCShadow in cc-shadow.chunk and CCForwardLight in cc-forward-light.chunk.
     * @zh 设置内置球形光与阴影常量。
     * 具体常量见cc-shadow.chunk中的CCShadow与cc-forward-light.chunk中的CCForwardLight。
     * @param light @en The sphere light. @zh 球形光源
     * @param camera @en The camera instance to be set. @zh 当前相机
     */
    setBuiltinSphereLightConstants (light: SphereLight, camera: Camera): void;
    /**
     * @en Set builtin spot light and shadow constants.
     * For list of constants, please check CCShadow in cc-shadow.chunk and CCForwardLight in cc-forward-light.chunk.
     * @zh 设置内置探照光与阴影常量。
     * 具体常量见cc-shadow.chunk中的CCShadow与cc-forward-light.chunk中的CCForwardLight。
     * @param light @en The spot light. @zh 探照光源
     * @param camera @en The camera instance to be set. @zh 当前相机
     */
    setBuiltinSpotLightConstants (light: SpotLight, camera: Camera): void;
    /**
     * @en Set builtin point light and shadow constants.
     * For list of constants, please check CCShadow in cc-shadow.chunk and CCForwardLight in cc-forward-light.chunk.
     * @zh 设置内置点光与阴影常量。
     * 具体常量见cc-shadow.chunk中的CCShadow与cc-forward-light.chunk中的CCForwardLight。
     * @param light @en The point light. @zh 点光源
     * @param camera @en The camera instance to be set. @zh 当前相机
     */
    setBuiltinPointLightConstants (light: PointLight, camera: Camera): void;
    /**
     * @en Set builtin ranged directional light and shadow constants.
     * For list of constants, please check CCShadow in cc-shadow.chunk and CCForwardLight in cc-forward-light.chunk.
     * @zh 设置内置区间平行光与阴影常量。
     * 具体常量见cc-shadow.chunk中的CCShadow与cc-forward-light.chunk中的CCForwardLight。
     * @param light @en The ranged directional light. @zh 区间平行光源
     * @param camera @en The camera instance to be set. @zh 当前相机
     */
    setBuiltinRangedDirectionalLightConstants (light: RangedDirectionalLight, camera: Camera): void;
    /**
     * @en Set builtin directional light frustum and shadow constants.
     * These constants are used in builtin shadow map, cascaded shadow map and planar shadow.
     * For list of constants, please check CCShadow in cc-shadow.chunk and CCCSM in cc-csm.chunk.
     * @zh 设置内置平行光视锥与阴影常量。
     * 这些常量用于内置的阴影、级联阴影与平面阴影。
     * 具体常量见cc-shadow.chunk中的CCShadow与cc-csm.chunk中的CCCSM。
     * @param light @en The directional light. @zh 平行光源
     * @param camera @en The camera instance to be set. @zh 当前相机
     * @param csmLevel @en Curent level of cascaded shadow map @zh 级联阴影等级
     */
    setBuiltinDirectionalLightFrustumConstants (
        camera: Camera,
        light: DirectionalLight,
        csmLevel?: number): void;
    /**
     * @en Set builtin spot light frustum and shadow constants.
     * These constants are used in builtin shadow map.
     * For list of constants, please check CCShadow in cc-shadow.chunk.
     * @zh 设置内置探照光视锥与阴影常量。
     * 这些常量用于内置的阴影。
     * 具体常量见cc-shadow.chunk中的CCShadow。
     * @param light @en The spot light. @zh 探照光源
     */
    setBuiltinSpotLightFrustumConstants (light: SpotLight): void;
}

/**
 * @en Scene
 * A scene is an abstraction of content for rendering.
 * @zh 场景。需要绘制的场景内容。
 */
export interface SceneBuilder extends Setter {
    /**
     * @en Use the frustum information of light instead of camera.
     * Often used in building shadow map.
     * @zh 使用光源视锥进行投影，而不是用相机。常用于shadow map的生成。
     * @param light @en The light used for projection @zh 用于投影的光源
     * @param csmLevel @en Curent level of cascaded shadow map @zh 级联阴影等级
     * @param optCamera @en Additional scene culling camera. @zh 额外的场景裁切相机
     */
    useLightFrustum (
        light: Light,
        csmLevel?: number,
        optCamera?: Camera): void;
}

/**
 * @en Render queue
 * A render queue is an abstraction of graphics commands submission.
 * Only when the graphics commands in a render queue are all submitted,
 * the next render queue will start submitting.
 * @zh 渲染队列。渲染队列是图形命令提交的抽象。
 * 只有一个渲染队列中的渲染命令全部提交完，才会开始提交下一个渲染队列中的命令。
 */
export interface RenderQueueBuilder extends Setter {
    /**
     * @deprecated Method will be removed in the future
     * @en Render the scene the camera is looking at.
     * @zh 渲染当前相机指向的场景。
     * @param camera @en Required camera @zh 所需相机
     * @param light @en Lighting information of the scene @zh 场景光照信息
     * @param sceneFlags @en Rendering flags of the scene @zh 场景渲染标志位
     */
    addSceneOfCamera (
        camera: Camera,
        light: LightInfo,
        sceneFlags?: SceneFlags): void;
    /**
     * @en Add the scene to be rendered.
     * If SceneFlags.NON_BUILTIN is specified, no builtin constants will be set.
     * Otherwise, related builtin constants will be set automatically.
     * @zh 添加需要绘制的场景。
     * 如果设置了SceneFlags.NON_BUILTIN，那么不会自动设置内置常量。
     * @param camera @en Camera used for projection @zh 用于投影的相机
     * @param sceneFlags @en Rendering flags of the scene @zh 场景渲染标志位
     * @param light @en Light used for lighting computation @zh 用于光照的光源
     */
    addScene (
        camera: Camera,
        sceneFlags: SceneFlags,
        light?: Light,
        scene?: RenderScene): SceneBuilder;
    /**
     * @en Render a full-screen quad.
     * @zh 渲染全屏四边形
     * @param material @en The material used for shading @zh 着色所需材质
     * @param passID @en Material pass ID @zh 材质通道ID
     * @param sceneFlags @en Rendering flags of the quad @zh Quad所需场景渲染标志位
     */
    addFullscreenQuad (
        material: Material,
        passID: number,
        sceneFlags?: SceneFlags): void;
    /**
     * @en Render a full-screen quad from the camera view.
     * @zh 从相机视角渲染全屏四边形
     * @param camera @en The required camera @zh 所需相机
     * @param material @en The material used for shading @zh 着色所需材质
     * @param passID @en Material pass ID @zh 材质通道ID
     * @param sceneFlags @en Rendering flags of the quad @zh Quad所需场景渲染标志位
     */
    addCameraQuad (
        camera: Camera,
        material: Material,
        passID: number,
        sceneFlags?: SceneFlags): void;
    /**
     * @en Clear current render target.
     * @zh 清除当前渲染目标
     * @param name @en The name of the render target @zh 渲染目标的名字
     * @param color @en The clearing color @zh 用来清除与填充的颜色
     */
    clearRenderTarget (name: string, color?: Color): void;
    /**
     * @en Set rendering viewport.
     * @zh 设置渲染视口
     * @param viewport @en The required viewport @zh 所需视口
     */
    setViewport (viewport: Viewport): void;
    /**
     * @experimental
     */
    addCustomCommand (customBehavior: string): void;
}

/**
 * @en Basic render pass.
 * @zh 基础光栅通道
 */
export interface BasicRenderPassBuilder extends Setter {
    /**
     * @en Add render target for rasterization
     * The render target must have registered in pipeline.
     * @zh 添加光栅化渲染目标，渲染目标必须已注册。
     * @param name @en name of the render target @zh 渲染目标的名字
     * @param loadOp @en Type of load operation @zh 读取操作的类型
     * @param storeOp @en Type of store operation @zh 写入操作的类型
     * @param color @en The clear color to use when loadOp is Clear @zh 读取操作为清除时，所用颜色
     */
    addRenderTarget (
        name: string,
        loadOp?: LoadOp,
        storeOp?: StoreOp,
        color?: Color): void;
    /**
     * @en Add depth stencil for rasterization
     * The depth stencil must have registered in pipeline.
     * @zh 添加光栅化深度模板缓冲，深度模板缓冲必须已注册。
     * @param name @en name of the depth stencil @zh 渲染目标的名字
     * @param loadOp @en Type of load operation @zh 读取操作的类型
     * @param storeOp @en Type of store operation @zh 写入操作的类型
     * @param depth @en Depth value used to clear @zh 用于清除的深度值
     * @param stencil @en Stencil value used to clear @zh 用于清除的模板值
     * @param clearFlags @en To clear depth, stencil or both @zh 清除分量：深度、模板、两者。
     */
    addDepthStencil (
        name: string,
        loadOp?: LoadOp,
        storeOp?: StoreOp,
        depth?: number,
        stencil?: number,
        clearFlags?: ClearFlagBit): void;
    /**
     * @en Add texture for sampling
     * The texture must have registered in pipeline.
     * @zh 添加采样用的贴图，贴图必须已注册。
     * @param name @en name of the texture @zh 贴图的注册名
     * @param slotName @en name of descriptor in the shader @zh 着色器中描述符的名字
     * @param sampler @en the sampler to use @zh 采样器名字
     * @param plane @en the image plane ID to sample (color|depth|stencil|video) @zh 需要采样的贴图平面(颜色|深度|模板|视频)
     */
    addTexture (
        name: string,
        slotName: string,
        sampler?: Sampler,
        plane?: number): void;
    /**
     * @en Add render queue.
     * Every render queue has a hint type, such as NONE, OPAQUE, MASK or BLEND.
     * User should only add objects of this hint type to the render queue.
     * Objects of mixed types might cause downgrading of performance.
     * The order of render queues should be adjusted according to the hardward and algorithms,
     * in order to reach peak performance.
     * For example, [1.opaque, 2.mask, 3.blend] might result in best performance on mobile platforms.
     * This hint is for validation only and has no effect on rendering.
     *
     * Every render queue has a phase name. Only objects of the same phase name will be rendered.
     *
     * @zh 添加渲染队列
     * 每个渲染队列有一个用途提示，例如无提示(NONE)、不透明(OPAQUE)、遮罩(MASK)和混合(BLEND)。
     * 每个队列最好只渲染相匹配的对象，混合不同类型的对象，会造成性能下降。
     * 不同类型队列的渲染顺序，需要根据硬件类型与渲染算法进行调整，以到达最高性能。
     * 比如在移动平台上，先渲染OPAQUE，再渲染MASK、最后渲染BLEND可能会有最好的性能。
     * 用途提示只用于问题检测，对渲染流程没有任何影响。
     *
     * 每个队列有一个相位(phase)名字，具有相同相位名字的物件才会被渲染。
     *
     * @param hint @en Usage hint of the queue @zh 用途的提示
     * @param phaseName @en The name of the phase declared in the effect. Default value is 'default' @zh effect中相位(phase)的名字，缺省为'default'。
     * @param passName @en The name of the pass declared in the effect. It is used to override the pass name in the parent pass/subpass. @zh effect中通道(pass)的名字，会覆盖(override)父(通道/子通道)中已设置的pass名字。
     * @returns @en render queue builder @zh 渲染队列
     */
    addQueue (
        hint?: QueueHint,
        phaseName?: string,
        passName?: string): RenderQueueBuilder;
    /**
     * @en Set rendering viewport.
     * @zh 设置渲染视口
     * @param viewport @en The required viewport @zh 所需视口
     */
    setViewport (viewport: Viewport): void;
    /**
     * @deprecated Method will be removed in the future
     */
    setVersion (name: string, version: number): void;
    /**
     * @en Show statistics on screen
     * @zh 在屏幕上渲染统计数据
     */
    showStatistics: boolean;
}

/**
 * @en Basic multisample render pass builder
 * Support resolve render targets and depth stencil.
 * This render pass only contains one render subpass.
 * If resolve targets are specified, they will be resolved at the end of the render pass.
 * After resolving, the contents of multisample render targets and depth stencils are unspecified.
 * @zh 基础的多重采样渲染通道。支持决算(Resolve)渲染目标与深度缓冲。
 * 此渲染通道只包含一个渲染子通道。
 * 如果添加了决算对象，那么在渲染通道结束时，会进行决算。
 * 决算后多重采样渲染目标与深度缓冲的内容是未定义的。
 */
export interface BasicMultisampleRenderPassBuilder extends BasicRenderPassBuilder {
    /**
     * @en Set resolve render target
     * @zh 设置决算渲染目标
     */
    resolveRenderTarget (source: string, target: string): void;
    /**
     * @en Set resolve depth stencil
     * @zh 设置决算深度模板缓冲
     */
    resolveDepthStencil (
        source: string,
        target: string,
        depthMode?: ResolveMode,
        stencilMode?: ResolveMode): void;
}

/**
 * @en BasicPipeline
 * Basic pipeline provides basic rendering features which are supported on all platforms.
 * User can register resources which will be used in the render graph.
 * Theses resources are generally read and write, and will be managed by the pipeline.
 * The residency information of resource should not be changed after registration.
 * In each frame, user can create a render graph to be executed by the pipeline.
 * @zh 基础渲染管线。
 * 基础渲染管线提供基础的渲染能力，能在全平台使用。
 * 用户可以在渲染管线中注册资源，这些资源将由管线托管，用于render graph。
 * 这些资源一般是可读写的资源。
 * 资源在注册后，不能更改驻留属性。
 * 用户可以每帧构建一个render graph，然后交由管线执行。
 */
export interface BasicPipeline extends PipelineRuntime {
    readonly type: PipelineType;
    readonly capabilities: PipelineCapabilities;
    /**
     * @engineInternal
     * @en Begin render pipeline setup
     * @zh 开始管线构建
     */
    beginSetup (): void;
    /**
     * @engineInternal
     * @en End render pipeline setup
     * @zh 结束管线构建
     */
    endSetup (): void;
    /**
     * @en Enable cpu culling of objects affected by the light. Enabled by default.
     * @zh 光照计算时，裁切受光源影响的物件。默认开启。
     */
    enableCpuLightCulling: boolean;
    /**
     * @en Check whether the resource has been registered in the pipeline.
     * @zh 检查资源是否在管线中已注册
     * @param name @en Resource name @zh 资源名字
     * @returns Exist or not
     */
    containsResource (name: string): boolean;
    /**
     * @en Add or update render window to the pipeline.
     * If the render window is a swapchain and its default framebuffer contains depth stencil buffer,
     * user should specify the name of the depth stencil buffer.
     * If the depth stencil name is specified but the depth stencil buffer does not exist, a managed one will be created.
     * @zh 注册或更新渲染窗口(RenderWindow)。
     * 如果渲染窗口是交换链并且默认Framebuffer包含深度模板缓冲。用户需要指定深度模板缓冲的名字。
     * 如果指定了深度模板缓冲的名字，但深度模板缓冲不存在，会创建一个托管的深度模板缓冲。
     * @param name @en Resource name @zh 资源名字
     * @param format @en Expected format of the render window @zh 期望的渲染窗口格式
     * @param width @en Expected width of the render window @zh 期望的渲染窗口宽度
     * @param height @en Expected height of the render window @zh 期望的渲染窗口高度
     * @param renderWindow @en The render window to add. @zh 需要注册的渲染窗口
     * @param depthStencilName @en The name of the depth stencil buffer of the default framebuffer. @zh 默认Framebuffer的深度模板缓冲的名字
     * @returns Resource ID
     */
    addRenderWindow (
        name: string,
        format: Format,
        width: number,
        height: number,
        renderWindow: RenderWindow,
        depthStencilName?: string): number;
    /**
     * @deprecated Method will be removed in the future
     * @en Update render window information.
     * When render window information is updated, such as resized, user should notify the pipeline.
     * @zh 更新渲染窗口信息。当渲染窗口发生更新时，用户应通知管线。
     * @param renderWindow @en The render window to update. @zh 渲染窗口
     */
    updateRenderWindow (
        name: string,
        renderWindow: RenderWindow,
        depthStencilName?: string): void;
    /**
     * @en Add or update 2D render target.
     * @zh 添加或更新2D渲染目标
     * @param name @en Resource name @zh 资源名字
     * @param format @en Format of the resource @zh 资源的格式
     * @param width @en Width of the resource @zh 资源的宽度
     * @param height @en Height of the resource @zh 资源的高度
     * @param residency @en Residency of the resource. @zh 资源的驻留性
     * @returns Resource ID
     */
    addRenderTarget (
        name: string,
        format: Format,
        width: number,
        height: number,
        residency?: ResourceResidency): number;
    /**
     * @en Add or update 2D depth stencil.
     * @zh 添加或更新2D深度模板缓冲
     * @param name @en Resource name @zh 资源名字
     * @param format @en Format of the resource @zh 资源的格式
     * @param width @en Width of the resource @zh 资源的宽度
     * @param height @en Height of the resource @zh 资源的高度
     * @param residency @en Residency of the resource. @zh 资源的驻留性
     * @returns Resource ID
     */
    addDepthStencil (
        name: string,
        format: Format,
        width: number,
        height: number,
        residency?: ResourceResidency): number;
    /**
     * @deprecated Method will be removed in the future
     * @en Update render target information.
     * @zh 更新渲染目标的信息
     * @param name @en Resource name @zh 资源名字
     * @param width @en Width of the resource @zh 资源的宽度
     * @param height @en Height of the resource @zh 资源的高度
     * @param format @en Format of the resource @zh 资源的格式
     */
    updateRenderTarget (
        name: string,
        width: number,
        height: number,
        format?: Format): void;
    /**
     * @deprecated Method will be removed in the future
     * @en Update depth stencil information.
     * @zh 更新深度模板缓冲的信息
     * @param name @en Resource name @zh 资源名字
     * @param width @en Width of the resource @zh 资源的宽度
     * @param height @en Height of the resource @zh 资源的高度
     * @param format @en Format of the resource @zh 资源的格式
     */
    updateDepthStencil (
        name: string,
        width: number,
        height: number,
        format?: Format): void;
    /**
     * @en Add or update buffer.
     * @zh 添加或更新缓冲
     * @param name @en Resource name @zh 资源名字
     * @param size @en Size of the resource in bytes @zh 资源的大小
     * @param flags @en Flags of the resource @zh 资源的标志位
     * @param residency @en Residency of the resource. @zh 资源的驻留性
     * @returns Resource ID
     */
    addBuffer (
        name: string,
        size: number,
        flags: ResourceFlags,
        residency: ResourceResidency): number;
    /**
     * @deprecated Method will be removed in the future
     * @en Update buffer information.
     * @zh 更新缓冲的信息
     * @param name @en Resource name @zh 资源名字
     * @param size @en Size of the resource in bytes @zh 资源的大小
     */
    updateBuffer (name: string, size: number): void;
    /**
     * @en Add or update external texture.
     * Must be readonly.
     * @zh 添加或更新外部的贴图。贴图必须是只读的。
     * @param name @en Resource name @zh 资源名字
     * @param texture @en External unmanaged texture @zh 外部不受管理的贴图
     * @param flags @en Flags of the resource @zh 资源的标志位
     * @returns Resource ID
     */
    addExternalTexture (
        name: string,
        texture: Texture,
        flags: ResourceFlags): number;
    /**
     * @deprecated Method will be removed in the future
     * @en Update external texture information.
     * @zh 更新外部的贴图信息
     * @param name @en Resource name @zh 资源名字
     * @param texture @en External unmanaged texture @zh 外部不受管理的贴图
     */
    updateExternalTexture (name: string, texture: Texture): void;
    /**
     * @en Add or update texture.
     * @zh 添加或更新外部的贴图。
     * @param name @en Resource name @zh 资源名字
     * @param type @en Type of the texture @zh 贴图的类型
     * @param format @en Format of the texture @zh 贴图的格式
     * @param width @en Width of the resource @zh 资源的宽度
     * @param height @en Height of the resource @zh 资源的高度
     * @param depth @en Depth of the resource @zh 资源的深度
     * @param arraySize @en Size of the array @zh 资源数组的大小
     * @param mipLevels @en Mip levels of the texture @zh 贴图的Mipmap数目
     * @param sampleCount @en Sample count of the texture @zh 贴图的采样数目
     * @param flags @en Flags of the resource @zh 资源的标志位
     * @param residency @en Residency of the resource. @zh 资源的驻留性
     * @returns Resource ID
     */
    addTexture (
        name: string,
        type: TextureType,
        format: Format,
        width: number,
        height: number,
        depth: number,
        arraySize: number,
        mipLevels: number,
        sampleCount: SampleCount,
        flags: ResourceFlags,
        residency: ResourceResidency): number;
    /**
     * @deprecated Method will be removed in the future
     * @en Update texture information.
     * @zh 更新贴图信息
     * @param name @en Resource name @zh 资源名字
     * @param format @en Format of the texture @zh 贴图的格式
     * @param width @en Width of the resource @zh 资源的宽度
     * @param height @en Height of the resource @zh 资源的高度
     * @param depth @en Depth of the resource @zh 资源的深度
     * @param arraySize @en Size of the array @zh 资源数组的大小
     * @param mipLevels @en Mip levels of the texture @zh 贴图的Mipmap数目
     * @param sampleCount @en Sample count of the texture @zh 贴图的采样数目
     */
    updateTexture (
        name: string,
        format: Format,
        width: number,
        height: number,
        depth: number,
        arraySize: number,
        mipLevels: number,
        sampleCount: SampleCount): void;
    /**
     * @en Add or update resource.
     * @zh 添加或更新资源
     * @param name @en Resource name @zh 资源名字
     * @param dimension @en Dimension of the resource @zh 资源的维度
     * @param format @en Format of the texture @zh 资源的格式
     * @param width @en Width of the resource @zh 资源的宽度
     * @param height @en Height of the resource @zh 资源的高度
     * @param depth @en Depth of the resource @zh 资源的深度
     * @param arraySize @en Size of the array @zh 资源数组的大小
     * @param mipLevels @en Mip levels of the texture @zh 资源的Mipmap数目
     * @param sampleCount @en Sample count of the texture @zh 资源的采样数目
     * @param flags @en Flags of the resource @zh 资源的标志位
     * @param residency @en Residency of the resource. @zh 资源的驻留性
     * @returns Resource ID
     */
    addResource (
        name: string,
        dimension: ResourceDimension,
        format: Format,
        width: number,
        height: number,
        depth: number,
        arraySize: number,
        mipLevels: number,
        sampleCount: SampleCount,
        flags: ResourceFlags,
        residency: ResourceResidency): number;
    /**
     * @deprecated Method will be removed in the future
     * @en Update resource information.
     * @zh 更新资源信息
     * @param name @en Resource name @zh 资源名字
     * @param format @en Format of the texture @zh 资源的格式
     * @param width @en Width of the resource @zh 资源的宽度
     * @param height @en Height of the resource @zh 资源的高度
     * @param depth @en Depth of the resource @zh 资源的深度
     * @param arraySize @en Size of the array @zh 资源数组的大小
     * @param mipLevels @en Mip levels of the texture @zh 资源的Mipmap数目
     * @param sampleCount @en Sample count of the texture @zh 资源的采样数目
     */
    updateResource (
        name: string,
        format: Format,
        width: number,
        height: number,
        depth: number,
        arraySize: number,
        mipLevels: number,
        sampleCount: SampleCount): void;
    /**
     * @engineInternal
     * @en Begin rendering one frame
     * @zh 开始一帧的渲染
     */
    beginFrame (): void;
    /**
     * @engineInternal
     * @en Update camera
     * @zh 更新相机
     * @param camera @en Camera @zh 相机
     */
    update (camera: Camera): void;
    /**
     * @engineInternal
     * @en End rendering one frame
     * @zh 结束一帧的渲染
     */
    endFrame (): void;
    /**
     * @en Add render pass
     * @zh 添加渲染通道
     * @param width @en Width of the render pass @zh 渲染通道的宽度
     * @param height @en Height of the render pass @zh 渲染通道的高度
     * @param passName @en Pass name declared in the effect. Default value is 'default' @zh effect中的pass name，缺省为'default'
     * @returns Basic render pass builder
     */
    addRenderPass (
        width: number,
        height: number,
        passName?: string): BasicRenderPassBuilder;
    /**
     * @beta Feature is under development
     * @en Add multisample render pass
     * @zh 添加多重采样渲染通道
     * @param width @en Width of the render pass @zh 渲染通道的宽度
     * @param height @en Height of the render pass @zh 渲染通道的高度
     * @param count @en Sample count @zh 采样数
     * @param quality @en Sample quality. Default value is 0 @zh 采样质量，默认值是0
     * @param passName @en Pass name declared in the effect. Default value is 'default' @zh effect中的pass name，缺省为'default'
     * @returns Multisample basic render pass builder
     */
    addMultisampleRenderPass (
        width: number,
        height: number,
        count: number,
        quality: number,
        passName?: string): BasicMultisampleRenderPassBuilder;
    /**
     * @deprecated Method will be removed in the future
     */
    addResolvePass (resolvePairs: ResolvePair[]): void;
    /**
     * @en Add copy pass.
     * The source and target resources:
     * Must be different resources(have different resource names).
     * Must have compatible formats.
     * Must have identical dimensions(width, height, depth), sample count and sample quality.
     * Can't be currently mapped.
     *
     * Reinterpret copy is not supported.
     *
     * @zh 添加拷贝通道，来源与目标必须满足：
     * 是不同的注册资源。
     * 资源格式兼容。
     * 具有相同的尺寸、采样数、采样质量。
     * 不能被Map。
     *
     * 暂不支持转义拷贝。
     *
     * @param copyPairs @en Array of copy source and target @zh 拷贝来源与目标的数组
     */
    addCopyPass (copyPairs: CopyPair[]): void;
    /**
     * @deprecated Method will be removed in the future
     * @en Builtin reflection probe pass
     * @zh 添加内置环境光反射通道
     * @param camera @en Capturing camera @zh 用于捕捉的相机
     */
    addBuiltinReflectionProbePass (camera: Camera): void;
    /**
     * @engineInternal
     */
    getDescriptorSetLayout (shaderName: string, freq: UpdateFrequency): DescriptorSetLayout | undefined;
}

/**
 * @beta Feature is under development
 * @en Render subpass
 * @zh 渲染次通道
 */
export interface RenderSubpassBuilder extends Setter {
    /**
     * @en Add render target for rasterization
     * The render target must have registered in pipeline.
     * @zh 添加光栅化渲染目标，渲染目标必须已注册。
     * @param name @en name of the render target @zh 渲染目标的名字
     * @param accessType @en Access type @zh 读写状态
     * @param slotName @en name of the descriptor in shader @zh 着色器中描述符的名字
     * @param loadOp @en Type of load operation @zh 读取操作的类型
     * @param storeOp @en Type of store operation @zh 写入操作的类型
     * @param color @en The clear color to use when loadOp is Clear @zh 读取操作为清除时，所用颜色
     */
    addRenderTarget (
        name: string,
        accessType: AccessType,
        slotName?: string,
        loadOp?: LoadOp,
        storeOp?: StoreOp,
        color?: Color): void;
    /**
     * @en Add depth stencil for rasterization
     * The depth stencil must have registered in pipeline.
     * @zh 添加光栅化深度模板缓冲，深度模板缓冲必须已注册。
     * @param name @en name of the depth stencil @zh 渲染目标的名字
     * @param accessType @en Access type @zh 读写状态
     * @param depthSlotName @en name of the depth descriptor in shader @zh 着色器中深度描述符的名字
     * @param stencilSlotName @en name of the stencil descriptor in shader @zh 着色器中模板描述符的名字
     * @param loadOp @en Type of load operation @zh 读取操作的类型
     * @param storeOp @en Type of store operation @zh 写入操作的类型
     * @param depth @en Depth value used to clear @zh 用于清除的深度值
     * @param stencil @en Stencil value used to clear @zh 用于清除的模板值
     * @param clearFlags @en To clear depth, stencil or both @zh 清除分量：深度、模板、两者。
     */
    addDepthStencil (
        name: string,
        accessType: AccessType,
        depthSlotName?: string,
        stencilSlotName?: string,
        loadOp?: LoadOp,
        storeOp?: StoreOp,
        depth?: number,
        stencil?: number,
        clearFlags?: ClearFlagBit): void;
    /**
     * @en Add texture for sampling
     * The texture must have registered in pipeline.
     * @zh 添加采样用的贴图，贴图必须已注册。
     * @param name @en name of the texture @zh 贴图的注册名
     * @param slotName @en name of descriptor in the shader @zh 着色器中描述符的名字
     * @param sampler @en the sampler to use @zh 采样器名字
     * @param plane @en the image plane ID to sample (color|depth|stencil|video) @zh 需要采样的贴图平面(颜色|深度|模板|视频)
     */
    addTexture (
        name: string,
        slotName: string,
        sampler?: Sampler,
        plane?: number): void;
    /**
     * @en Add storage buffer.
     * The buffer must have registered in pipeline.
     * @zh 添加存储缓冲，缓冲必须已注册。
     * @param name @en Name of the buffer @zh 缓冲的注册名
     * @param accessType @en Access type @zh 读写状态
     * @param slotName @en name of descriptor in the shader @zh 着色器中描述符的名字
     */
    addStorageBuffer (
        name: string,
        accessType: AccessType,
        slotName: string): void;
    /**
     * @en Add storage texture.
     * The texture must have registered in pipeline.
     * @zh 添加存储贴图，贴图必须已注册。
     * @param name @en Name of the buffer @zh 贴图的注册名
     * @param accessType @en Access type @zh 读写状态
     * @param slotName @en name of descriptor in the shader @zh 着色器中描述符的名字
     */
    addStorageImage (
        name: string,
        accessType: AccessType,
        slotName: string): void;
    /**
     * @en Set rendering viewport.
     * @zh 设置渲染视口
     * @param viewport @en The required viewport @zh 所需视口
     */
    setViewport (viewport: Viewport): void;
    /**
     * @en Add render queue.
     * Every render queue has a hint type, such as NONE, OPAQUE, MASK or BLEND.
     * User should only add objects of this hint type to the render queue.
     * Objects of mixed types might cause downgrading of performance.
     * The order of render queues should be adjusted according to the hardward and algorithms,
     * in order to reach peak performance.
     * For example, [1.opaque, 2.mask, 3.blend] might result in best performance on mobile platforms.
     * This hint is for validation only and has no effect on rendering.
     *
     * Every render queue has a phase name. Only objects of the same phase name will be rendered.
     *
     * @zh 添加渲染队列
     * 每个渲染队列有一个用途提示，例如无提示(NONE)、不透明(OPAQUE)、遮罩(MASK)和混合(BLEND)。
     * 每个队列最好只渲染相匹配的对象，混合不同类型的对象，会造成性能下降。
     * 不同类型队列的渲染顺序，需要根据硬件类型与渲染算法进行调整，以到达最高性能。
     * 比如在移动平台上，先渲染OPAQUE，再渲染MASK、最后渲染BLEND可能会有最好的性能。
     * 用途提示只用于问题检测，对渲染流程没有任何影响。
     *
     * 每个队列有一个相位(phase)名字，具有相同相位名字的物件才会被渲染。
     *
     * @param hint @en Usage hint of the queue @zh 用途的提示
     * @param phaseName @en The name of the phase declared in the effect. Default value is 'default' @zh effect中相位(phase)的名字，缺省为'default'。
     * @param passName @en The name of the pass declared in the effect. It is used to override the pass name in the parent pass/subpass. @zh effect中通道(pass)的名字，会覆盖(override)父(通道/子通道)中已设置的pass名字。
     * @returns @en render queue builder @zh 渲染队列
     */
    addQueue (
        hint?: QueueHint,
        phaseName?: string,
        passName?: string): RenderQueueBuilder;
    /**
     * @en Show statistics on screen
     * @zh 在屏幕上渲染统计数据
     */
    showStatistics: boolean;
    /**
     * @experimental
     */
    setCustomShaderStages (name: string, stageFlags: ShaderStageFlagBit): void;
}

/**
 * @beta Feature is under development
 * @en Multisample render subpass
 * @zh 多重采样渲染次通道
 */
export interface MultisampleRenderSubpassBuilder extends RenderSubpassBuilder {
    /**
     * @en Resolve render target
     * @zh 汇总渲染目标
     * @param source @en Multisample source @zh 多重采样来源
     * @param target @en Resolve target @zh 汇总目标
     */
    resolveRenderTarget (source: string, target: string): void;
    /**
     * @en Resolve depth stencil
     * @zh 汇总深度模板缓冲
     * @param source @en Multisample source @zh 多重采样来源
     * @param target @en Resolve target @zh 汇总目标
     * @param depthMode @en Resolve mode of depth component @zh 深度分量汇总模式
     * @param stencilMode @en Resolve mode of stencil component @zh 模板分量汇总模式
     */
    resolveDepthStencil (
        source: string,
        target: string,
        depthMode?: ResolveMode,
        stencilMode?: ResolveMode): void;
}

/**
 * @en Compute queue
 * @zh 计算队列
 */
export interface ComputeQueueBuilder extends Setter {
    /**
     * @en Dispatch compute task
     * @zh 发送计算任务
     * @param threadGroupCountX @en Thread group count X  @zh 线程组的X分量的数目
     * @param threadGroupCountY @en Thread group count Y  @zh 线程组的Y分量的数目
     * @param threadGroupCountZ @en Thread group count Z  @zh 线程组的Z分量的数目
     * @param material @en The material to use @zh 计算任务用的材质
     * @param passID @en The name of the pass declared in the effect. @zh effect中的通道名字
     */
    addDispatch (
        threadGroupCountX: number,
        threadGroupCountY: number,
        threadGroupCountZ: number,
        material?: Material,
        passID?: number): void;
}

/**
 * @beta Feature is under development
 * @en Compute subpass
 * @zh 计算次通道
 */
export interface ComputeSubpassBuilder extends Setter {
    /**
     * @en Add input render target.
     * @zh 添加输入渲染目标
     * @param name @en name of the render target @zh 渲染目标的名字
     * @param slotName @en name of the descriptor in shader @zh 着色器中描述符的名字
     */
    addRenderTarget (name: string, slotName: string): void;
    /**
     * @en Add texture for sampling
     * The texture must have registered in pipeline.
     * @zh 添加采样用的贴图，贴图必须已注册。
     * @param name @en name of the texture @zh 贴图的注册名
     * @param slotName @en name of descriptor in the shader @zh 着色器中描述符的名字
     * @param sampler @en the sampler to use @zh 采样器名字
     * @param plane @en the image plane ID to sample (color|depth|stencil|video) @zh 需要采样的贴图平面(颜色|深度|模板|视频)
     */
    addTexture (
        name: string,
        slotName: string,
        sampler?: Sampler,
        plane?: number): void;
    /**
     * @en Add storage buffer.
     * The buffer must have registered in pipeline.
     * @zh 添加存储缓冲，缓冲必须已注册。
     * @param name @en Name of the buffer @zh 缓冲的注册名
     * @param accessType @en Access type @zh 读写状态
     * @param slotName @en name of descriptor in the shader @zh 着色器中描述符的名字
     */
    addStorageBuffer (
        name: string,
        accessType: AccessType,
        slotName: string): void;
    /**
     * @en Add storage texture.
     * The texture must have registered in pipeline.
     * @zh 添加存储贴图，贴图必须已注册。
     * @param name @en Name of the buffer @zh 贴图的注册名
     * @param accessType @en Access type @zh 读写状态
     * @param slotName @en name of descriptor in the shader @zh 着色器中描述符的名字
     */
    addStorageImage (
        name: string,
        accessType: AccessType,
        slotName: string): void;
    /**
     * @en Add render queue.
     * Every render queue has a hint type, such as NONE, OPAQUE, MASK or BLEND.
     * User should only add objects of this hint type to the render queue.
     * Objects of mixed types might cause downgrading of performance.
     * The order of render queues should be adjusted according to the hardward and algorithms,
     * in order to reach peak performance.
     * For example, [1.opaque, 2.mask, 3.blend] might result in best performance on mobile platforms.
     * This hint is for validation only and has no effect on rendering.
     *
     * Every render queue has a phase name. Only objects of the same phase name will be rendered.
     *
     * @zh 添加渲染队列
     * 每个渲染队列有一个用途提示，例如无提示(NONE)、不透明(OPAQUE)、遮罩(MASK)和混合(BLEND)。
     * 每个队列最好只渲染相匹配的对象，混合不同类型的对象，会造成性能下降。
     * 不同类型队列的渲染顺序，需要根据硬件类型与渲染算法进行调整，以到达最高性能。
     * 比如在移动平台上，先渲染OPAQUE，再渲染MASK、最后渲染BLEND可能会有最好的性能。
     * 用途提示只用于问题检测，对渲染流程没有任何影响。
     *
     * 每个队列有一个相位(phase)名字，具有相同相位名字的物件才会被渲染。
     *
     * @param hint @en Usage hint of the queue @zh 用途的提示
     * @param phaseName @en The name of the phase declared in the effect. Default value is 'default' @zh effect中相位(phase)的名字，缺省为'default'。
     * @param passName @en The name of the pass declared in the effect. It is used to override the pass name in the parent pass/subpass. @zh effect中通道(pass)的名字，会覆盖(override)父(通道/子通道)中已设置的pass名字。
     * @returns @en compute queue builder @zh 计算队列
     */
    addQueue (phaseName?: string, passName?: string): ComputeQueueBuilder;
    /**
     * @experimental
     */
    setCustomShaderStages (name: string, stageFlags: ShaderStageFlagBit): void;
}

/**
 * @beta Feature is under development
 * @en Render pass
 * @zh 渲染通道
 */
export interface RenderPassBuilder extends BasicRenderPassBuilder {
    /**
     * @en Add storage buffer.
     * The buffer must have registered in pipeline.
     * @zh 添加存储缓冲，缓冲必须已注册。
     * @param name @en Name of the buffer @zh 缓冲的注册名
     * @param accessType @en Access type @zh 读写状态
     * @param slotName @en name of descriptor in the shader @zh 着色器中描述符的名字
     */
    addStorageBuffer (
        name: string,
        accessType: AccessType,
        slotName: string): void;
    /**
     * @en Add storage texture.
     * The texture must have registered in pipeline.
     * @zh 添加存储贴图，贴图必须已注册。
     * @param name @en Name of the buffer @zh 贴图的注册名
     * @param accessType @en Access type @zh 读写状态
     * @param slotName @en name of descriptor in the shader @zh 着色器中描述符的名字
     */
    addStorageImage (
        name: string,
        accessType: AccessType,
        slotName: string): void;
    /**
     * @beta Feature is under development
     */
    addMaterialTexture (resourceName: string, flags?: ShaderStageFlagBit): void;
    /**
     * @beta Feature is under development
     * @en Add render subpass.
     * @zh 添加渲染次通道
     * @param subpassName @en Subpass name declared in the effect @zh effect中的subpass name
     * @returns Render subpass builder
     */
    addRenderSubpass (subpassName: string): RenderSubpassBuilder;
    /**
     * @beta Feature is under development
     * @en Add multisample render subpass.
     * Sample count and quality should match those of the resources.
     * @zh 添加多重采样渲染次通道，采样数与质量需要与资源一致。
     * @param count @en Sample count @zh 采样数
     * @param quality @en Sample quality @zh 采样质量
     * @param subpassName @en Subpass name declared in the effect @zh effect中的subpass name
     * @returns Multisample render subpass builder
     */
    addMultisampleRenderSubpass (
        count: number,
        quality: number,
        subpassName: string): MultisampleRenderSubpassBuilder;
    /**
     * @experimental
     * @en Add compute subpass.
     * @zh 添加计算次通道
     * @param subpassName @en Subpass name declared in the effect @zh effect中的subpass name
     * @returns Compute subpass builder
     */
    addComputeSubpass (subpassName?: string): ComputeSubpassBuilder;
    /**
     * @experimental
     */
    setCustomShaderStages (name: string, stageFlags: ShaderStageFlagBit): void;
}

/**
 * @en Multisample render pass builder
 * @zh 多重采样渲染通道。
 */
export interface MultisampleRenderPassBuilder extends BasicMultisampleRenderPassBuilder {
    /**
     * @en Add storage buffer
     * @zh 添加存储缓冲
     * @param name @en Name of the storage buffer @zh 存储缓冲的名字
     * @param accessType @en Access type of the buffer in the render pass @zh 渲染通道中缓冲的读写状态
     * @param slotName @en name of the descriptor in shader @zh 着色器中描述符的名字
     */
    addStorageBuffer (
        name: string,
        accessType: AccessType,
        slotName: string): void;
    /**
     * @en Add storage image
     * @zh 添加存储贴图
     * @param name @en Name of the storage texture @zh 存储贴图的名字
     * @param accessType @en Access type of the texture in the render pass @zh 渲染通道中贴图的读写状态
     * @param slotName @en name of the descriptor in shader @zh 着色器中描述符的名字
     */
    addStorageImage (
        name: string,
        accessType: AccessType,
        slotName: string): void;
}

/**
 * @en Compute pass
 * @zh 计算通道
 */
export interface ComputePassBuilder extends Setter {
    /**
     * @en Add texture for sampling
     * The texture must have registered in pipeline.
     * @zh 添加采样用的贴图，贴图必须已注册。
     * @param name @en name of the texture @zh 贴图的注册名
     * @param slotName @en name of descriptor in the shader @zh 着色器中描述符的名字
     * @param sampler @en the sampler to use @zh 采样器名字
     * @param plane @en the image plane ID to sample (color|depth|stencil|video) @zh 需要采样的贴图平面(颜色|深度|模板|视频)
     */
    addTexture (
        name: string,
        slotName: string,
        sampler?: Sampler,
        plane?: number): void;
    /**
     * @en Add storage buffer.
     * The buffer must have registered in pipeline.
     * @zh 添加存储缓冲，缓冲必须已注册。
     * @param name @en Name of the buffer @zh 缓冲的注册名
     * @param accessType @en Access type @zh 读写状态
     * @param slotName @en name of descriptor in the shader @zh 着色器中描述符的名字
     */
    addStorageBuffer (
        name: string,
        accessType: AccessType,
        slotName: string): void;
    /**
     * @en Add storage texture.
     * The texture must have registered in pipeline.
     * @zh 添加存储贴图，贴图必须已注册。
     * @param name @en Name of the buffer @zh 贴图的注册名
     * @param accessType @en Access type @zh 读写状态
     * @param slotName @en name of descriptor in the shader @zh 着色器中描述符的名字
     */
    addStorageImage (
        name: string,
        accessType: AccessType,
        slotName: string): void;
    /**
     * @beta Feature is under development
     */
    addMaterialTexture (resourceName: string, flags?: ShaderStageFlagBit): void;
    /**
     * @en Add render queue.
     * Every render queue has a hint type, such as NONE, OPAQUE, MASK or BLEND.
     * User should only add objects of this hint type to the render queue.
     * Objects of mixed types might cause downgrading of performance.
     * The order of render queues should be adjusted according to the hardward and algorithms,
     * in order to reach peak performance.
     * For example, [1.opaque, 2.mask, 3.blend] might result in best performance on mobile platforms.
     * This hint is for validation only and has no effect on rendering.
     *
     * Every render queue has a phase name. Only objects of the same phase name will be rendered.
     *
     * @zh 添加渲染队列
     * 每个渲染队列有一个用途提示，例如无提示(NONE)、不透明(OPAQUE)、遮罩(MASK)和混合(BLEND)。
     * 每个队列最好只渲染相匹配的对象，混合不同类型的对象，会造成性能下降。
     * 不同类型队列的渲染顺序，需要根据硬件类型与渲染算法进行调整，以到达最高性能。
     * 比如在移动平台上，先渲染OPAQUE，再渲染MASK、最后渲染BLEND可能会有最好的性能。
     * 用途提示只用于问题检测，对渲染流程没有任何影响。
     *
     * 每个队列有一个相位(phase)名字，具有相同相位名字的物件才会被渲染。
     *
     * @param hint @en Usage hint of the queue @zh 用途的提示
     * @param phaseName @en The name of the phase declared in the effect. Default value is 'default' @zh effect中相位(phase)的名字，缺省为'default'。
     * @param passName @en The name of the pass declared in the effect. It is used to override the pass name in the parent pass/subpass. @zh effect中通道(pass)的名字，会覆盖(override)父(通道/子通道)中已设置的pass名字。
     * @returns @en compute queue builder @zh 计算队列
     */
    addQueue (phaseName?: string, passName?: string): ComputeQueueBuilder;
    /**
     * @experimental
     */
    setCustomShaderStages (name: string, stageFlags: ShaderStageFlagBit): void;
}

/**
 * @en Render pipeline.
 * @zh 渲染管线
 */
export interface Pipeline extends BasicPipeline {
    /**
     * @en Add or update storage buffer.
     * @zh 添加或更新存储缓冲
     * @param name @en Resource name @zh 资源名字
     * @param format @en Format of the resource @zh 资源的格式
     * @param size @en Size of the resource in bytes @zh 资源的大小
     * @param residency @en Residency of the resource. @zh 资源的驻留性
     */
    addStorageBuffer (
        name: string,
        format: Format,
        size: number,
        residency?: ResourceResidency): number;
    /**
     * @en Add or update 2D storage texture
     * @zh 添加或更新2D存储贴图
     * @param name @en Resource name @zh 资源名字
     * @param format @en Format of the resource @zh 资源的格式
     * @param width @en Width of the resource @zh 资源的宽度
     * @param height @en Height of the resource @zh 资源的高度
     * @param residency @en Residency of the resource. @zh 资源的驻留性
     */
    addStorageTexture (
        name: string,
        format: Format,
        width: number,
        height: number,
        residency?: ResourceResidency): number;
    /**
     * @experimental
     * @en Add or update 2D shading rate texture
     * @zh 添加或更新2D着色率贴图
     * @param name @en Resource name @zh 资源名字
     * @param width @en Width of the resource @zh 资源的宽度
     * @param height @en Height of the resource @zh 资源的高度
     * @param residency @en Residency of the resource. @zh 资源的驻留性
     */
    addShadingRateTexture (
        name: string,
        width: number,
        height: number,
        residency?: ResourceResidency): number;
    /**
     * @en Update storage buffer information.
     * @zh 更新存储缓冲的信息
     * @param name @en Resource name @zh 资源名字
     * @param size @en Size of the resource in bytes @zh 资源的大小
     * @param format @en Format of the resource @zh 资源的格式
     */
    updateStorageBuffer (
        name: string,
        size: number,
        format?: Format): void;
    /**
     * @en Update storage texture information.
     * @zh 更新2D存储贴图的信息
     * @param name @en Resource name @zh 资源名字
     * @param width @en Width of the resource @zh 资源的宽度
     * @param height @en Height of the resource @zh 资源的高度
     * @param format @en Format of the resource @zh 资源的格式
     */
    updateStorageTexture (
        name: string,
        width: number,
        height: number,
        format?: Format): void;
    /**
     * @en Update shading rate texture information.
     * @zh 更新2D着色率贴图的信息
     * @param name @en Resource name @zh 资源名字
     * @param width @en Width of the resource @zh 资源的宽度
     * @param height @en Height of the resource @zh 资源的高度
     */
    updateShadingRateTexture (
        name: string,
        width: number,
        height: number): void;
    /**
     * @en Add render pass
     * @zh 添加渲染通道
     * @param width @en Width of the render pass @zh 渲染通道的宽度
     * @param height @en Height of the render pass @zh 渲染通道的高度
     * @param passName @en Pass name declared in the effect. Default value is 'default' @zh effect中的pass name，缺省为'default'
     * @returns Render pass builder
     */
    addRenderPass (
        width: number,
        height: number,
        passName: string): RenderPassBuilder;
    /**
     * @en Add multisample render pass
     * @zh 添加多重采样渲染通道
     * @param width @en Width of the render pass @zh 渲染通道的宽度
     * @param height @en Height of the render pass @zh 渲染通道的高度
     * @param count @en Sample count @zh 采样数目
     * @param quality @en Sample quality (default is 0) @zh 采样质量（默认为0）
     * @param passName @en Pass name declared in the effect. Default value is 'default' @zh effect中的pass name，缺省为'default'
     * @returns Multisample render pass builder
     */
    addMultisampleRenderPass (
        width: number,
        height: number,
        count: number,
        quality: number,
        passName: string): MultisampleRenderPassBuilder;
    /**
     * @en Add compute pass
     * @zh 添加计算通道
     * @param passName @en Pass name declared in the effect. Default value is 'default' @zh effect中的pass name，缺省为'default'
     * @returns Compute pass builder
     */
    addComputePass (passName: string): ComputePassBuilder;
    /**
     * @beta Feature is under development
     * @en Add upload pass.
     * The source and target resources:
     * Must be different resources(have different resource names).
     * Must have compatible formats.
     * Must have identical dimensions(width, height, depth), sample count and sample quality.
     * Can't be currently mapped.
     *
     * @zh 添加上传通道，来源与目标必须满足：
     * 是不同的注册资源。
     * 资源格式兼容。
     * 具有相同的尺寸、采样数、采样质量。
     * 不能被Map。
     *
     * @param uploadPairs @en Array of upload source and target @zh 上传来源与目标的数组
     */
    addUploadPass (uploadPairs: UploadPair[]): void;
    /**
     * @en Add move pass.
     * Move-construct target resource, by moving source resources into subresources of target.
     * After the move, the target resource must be completely initialized.
     * Target write conflicts will result in undefined behaviour.
     * The source and target resources:
     * Must be different resources(have different resource names).
     * Must have compatible formats.
     * Must have identical dimensions(width, height, depth), sample count and sample quality.
     * Can't be currently mapped.
     *
     * @zh 添加移动通道。
     * 移动构造目标资源，将来源移入目标的次级资源。
     * 移动后，目标资源必须完全初始化。
     * 目标写入冲突是未定义行为。
     * 来源与目标必须满足：
     * 是不同的注册资源。
     * 资源格式兼容。
     * 具有相同的尺寸、采样数、采样质量。
     * 不能被Map。
     *
     * @param movePairs @en Array of move source and target @zh 移动来源与目标的数组
     */
    addMovePass (movePairs: MovePair[]): void;
    /**
     * @experimental
     */
    addCustomBuffer (
        name: string,
        info: BufferInfo,
        type: string): number;
    /**
     * @experimental
     */
    addCustomTexture (
        name: string,
        info: TextureInfo,
        type: string): number;
}

export interface PipelinePassBuilder {
    getConfigOrder (): number;
    getRenderOrder (): number;
    configCamera? (
        camera: Readonly<Camera>,
        pplConfigs: { readonly [name: string]: any },
        cameraConfigs: { [name: string]: any }): void;
    windowResize? (
        ppl: BasicPipeline,
        pplConfigs: { readonly [name: string]: any },
        cameraConfigs: { readonly [name: string]: any },
        window: RenderWindow,
        camera: Camera,
        width: number,
        height: number): void;
    setup? (
        ppl: BasicPipeline,
        pplConfigs: { readonly [name: string]: any },
        cameraConfigs: { readonly [name: string]: any },
        camera: Camera,
        context: { [name: string]: any },
        prevRenderPass?: BasicRenderPassBuilder): BasicRenderPassBuilder | undefined;
}

/**
 * @en Pipeline builder.
 * User can implement this interface and setup render graph.
 * Call setCustomPipeline to register the pipeline builder
 * @zh 管线构造器
 * 用户可以实现这个接口，来构建自己想要的render graph。
 * 调用setCustomPipeline注册管线
 */
export interface PipelineBuilder {
    windowResize? (
        pipeline: BasicPipeline,
        window: RenderWindow,
        camera: Camera,
        width: number,
        height: number): void;
    /**
     * @en Setup render graph
     * @zh 构建渲染管线
     * @param cameras @en Camera list to render @zh 需要渲染的相机列表
     * @param pipeline @en Current render pipeline @zh 当前管线
     */
    setup (cameras: Camera[], pipeline: BasicPipeline): void;
    /**
     * @en Callback of pipeline state changed
     * @zh 渲染管线状态更新的回调
     */
    onGlobalPipelineStateChanged? (): void;
}

/**
 * @engineInternal
 */
export interface RenderingModule {
    getPassID (name: string): number;
    getSubpassID (passID: number, name: string): number;
    getPhaseID (subpassOrPassID: number, name: string): number;
}
