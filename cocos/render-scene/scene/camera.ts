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
import { EDITOR } from 'internal:constants';
import { SurfaceTransform, ClearFlagBit, Device, Color, ClearFlags } from '../../gfx';
import { lerp, Mat4, Rect, toRadian, Vec3, IVec4Like, preTransforms, warnID, geometry, cclegacy, Vec4, rect, mat4, v3 } from '../../core';
import { CAMERA_DEFAULT_MASK } from '../../rendering/define';
import { Node } from '../../scene-graph';
import { RenderScene } from '../core/render-scene';
import { RenderWindow } from '../core/render-window';
import { GeometryRenderer } from '../../rendering/geometry-renderer';
import { PostProcess } from '../../rendering/post-process/components/post-process';
import type { Frustum } from '../../core/geometry';
import type { Root } from '../../root';

/**
 * @en The enumeration type for the fixed axis of the camera.
 * The field of view along the corresponding axis would be fixed regardless of screen aspect changes.
 * @zh 相机视角的锁定轴向枚举，在对应轴上不会跟随屏幕长宽比例变化。
 */
export enum CameraFOVAxis {
    /**
     * @en Vertically fixed camera
     * @zh 在垂直轴向上锁定的相机
     */
    VERTICAL,
    /**
     * @en Horizontally fixed camera
     * @zh 在水平轴向上锁定的相机
     */
    HORIZONTAL,
}

/**
 * @en The projection type enumeration of the camera.
 * @zh 相机的投影类型枚举。
 */
export enum CameraProjection {
    /**
     * @en Orthogonal projection type
     * @zh 正交投影类型
     */
    ORTHO,
    /**
     * @en Perspective projection type
     * @zh 透视投影类型
     */
    PERSPECTIVE,
}

/**
 * @en The aperture enumeration of the camera, represent in f-number.
 * The smaller the value is, the bigger the aperture is, and more light it can capture, but less depth it supports.
 * @zh 相机的快门枚举，使用 f 值来表示。f 值越小，光圈就越大，进光量也越大，景深越浅。
 */
export enum CameraAperture {
    /**
     * f/1.8
     */
    F1_8,
    /**
     * f/2.0
     */
    F2_0,
    /**
     * f/2.2
     */
    F2_2,
    /**
     * f/2.5
     */
    F2_5,
    /**
     * f/2.8
     */
    F2_8,
    /**
     * f/3.2
     */
    F3_2,
    /**
     * f/3.5
     */
    F3_5,
    /**
     * f/4.0
     */
    F4_0,
    /**
     * f/4.5
     */
    F4_5,
    /**
     * f/5.0
     */
    F5_0,
    /**
     * f/5.6
     */
    F5_6,
    /**
     * f/6.3
     */
    F6_3,
    /**
     * f/7.1
     */
    F7_1,
    /**
     * f/8
     */
    F8_0,
    /**
     * f/9
     */
    F9_0,
    /**
     * f/10
     */
    F10_0,
    /**
     * f/11
     */
    F11_0,
    /**
     * f/13
     */
    F13_0,
    /**
     * f/14
     */
    F14_0,
    /**
     * f/16
     */
    F16_0,
    /**
     * f/18
     */
    F18_0,
    /**
     * f/20
     */
    F20_0,
    /**
     * f/22
     */
    F22_0,
}

/**
 * @en The ISO enumeration of the camera, lower ISO means the camera is less sensitive to light.
 * @zh 相机感光度枚举，越低的 ISO 数值表示相机对光更加不敏感。
 */
export enum CameraISO {
    ISO100,
    ISO200,
    ISO400,
    ISO800,
}

/**
 * @en Camera shutter enumeration, the value represents the speed of the shutter.
 * @zh 相机快门枚举，枚举值表示快门速度。
 */
export enum CameraShutter {
    /**
     * 1 second
     */
    D1,
    /**
     * 1/2 second
     */
    D2,
    /**
     * 1/4 second
     */
    D4,
    /**
     * 1/8 second
     */
    D8,
    /**
     * 1/15 second
     */
    D15,
    /**
     * 1/30 second
     */
    D30,
    /**
     * 1/60 second
     */
    D60,
    /**
     * 1/125 second
     */
    D125,
    /**
     * 1/250 second
     */
    D250,
    /**
     * 1/500 second
     */
    D500,
    /**
     * 1/1000 second
     */
    D1000,
    /**
     * 1/2000 second
     */
    D2000,
    /**
     * 1/4000 second
     */
    D4000,
}

/**
 * @en The type of the camera, mainly for marking different camera usage in XR, it determines the camera's viewport and parameters.
 * @zh 相机类型，主要服务于标记 XR 中的不同相机用途，影响渲染的视口和对应的参数。
 */
export enum CameraType {
    /**
     * @en Default camera type
     * @zh 默认相机类型
     */
    DEFAULT = -1,
    /**
     * @en If a camera is set to be left eye, it will be used to render the left eye screen,
     * otherwise, the left eye screen will be rendered using adjusted parameters based on XR main camera.
     * @zh 如果设置了左眼相机，则在绘制左眼屏幕时使用，否则，就根据 XR 主相机的参数来计算左眼参数。
     */
    LEFT_EYE = 0,
    /**
     * @en If a camera is set to be right eye, it will be used to render the right eye screen,
     * otherwise, the right eye screen will be rendered using adjusted parameters based on XR main camera.
     * @zh 如果设置了右眼相机，则在绘制右眼屏幕时使用，否则，就根据 XR 主相机的参数来计算左眼参数。
     */
    RIGHT_EYE = 1,
    /**
     * @en The main camera, it could be used to calculate the parameters for both left eye and the right eye cameras.
     * It could be converted from the default 3d camera.
     * @zh XR 主相机，可以通过默认相机转换，也可以手动创建新的 XR 相机，可以计算出左右两个相机的相对参数。
     */
    MAIN = 2,
}

/**
 * @en The spatial tracking signal type used by the camera in XR.
 * @zh 相机使用的 XR 空间定位追踪信号类型。
 */
export enum TrackingType {
    /**
     * @en Camera without signal tracking in XR device.
     * @zh 无追踪相机，不对 XR 设备的信号进行追踪。
     */
    NO_TRACKING = 0,
    /**
     * @en Camera tracking position and rotation signals from XR device.
     * @zh 相机追踪 XR 设备移动位置和旋转角度信号。
     */
    POSITION_AND_ROTATION = 1,
    /**
     * @en Camera only tracking position signals from XR device.
     * @zh 相机只追踪 XR 设备位置信号。
     */
    POSITION = 2,
    /**
     * @en Camera only tracking rotation signals from XR device.
     * @zh 相机只追踪 XR 设备旋转角度信号。
     */
    ROTATION = 3,
}

/**
 * @en The usage of the camera, it's an engine internal marker enumeration.
 * @zh 相机的用途枚举，这是引擎内部使用的标记枚举。
 */
export enum CameraUsage {
    /**
     * @en Camera used in editor
     * @zh 编辑器下使用的相机
     */
    EDITOR,
    /**
     * @en Camera used in editor's game view.
     * @zh 编辑器 GameView 视图下使用的相机。
     */
    GAME_VIEW,
    /**
     * @en Camera used in editor's scene view.
     * @zh 编辑器场景编辑器视图下使用的相机。
     */
    SCENE_VIEW,
    /**
     * @en Camera used in editor's camera preview window.
     * @zh 编辑器预览小窗视图下使用的相机。
     */
    PREVIEW,
    /**
     * @en Camera used in game, normally user created cameras are all GAME type.
     * @zh 游戏视图下使用的相机，一般情况下用户创建的相机都是 GAME 类型。
     */
    GAME = 100,
}

const FSTOPS: number[] = [1.8, 2.0, 2.2, 2.5, 2.8, 3.2, 3.5, 4.0, 4.5, 5.0, 5.6, 6.3, 7.1, 8.0, 9.0, 10.0, 11.0, 13.0, 14.0, 16.0, 18.0, 20.0, 22.0];
const SHUTTERS: number[] = [1.0, 1.0 / 2.0, 1.0 / 4.0, 1.0 / 8.0, 1.0 / 15.0, 1.0 / 30.0, 1.0 / 60.0, 1.0 / 125.0,
    1.0 / 250.0, 1.0 / 500.0, 1.0 / 1000.0, 1.0 / 2000.0, 1.0 / 4000.0];
const ISOS: number[] = [100.0, 200.0, 400.0, 800.0];

/**
 * @en The camera creation information struct
 * @zh 用来创建相机的结构体
 */
export interface ICameraInfo {
    /**
     * @en The name of the camera.
     * @zh 相机命名。
     */
    name: string;
    /**
     * @en The node which the camera is attached to.
     * @zh 相机挂载的节点。
     */
    node: Node;
    /**
     * @en The projection type of the camera.
     * @zh 相机的投影类型。
     */
    projection: CameraProjection;
    /**
     * @en The id of the target display, if absent, it will be rendered on the default one.
     * @zh 相机的目标屏幕，如果缺省，将会使用默认屏幕。
     */
    targetDisplay?: number;
    /**
     * @en The target render window of the camera, is absent, the camera won't be rendered.
     * @zh 相机的目标渲染窗口，如果缺省，该相机不会执行渲染流程。
     */
    window?: RenderWindow | null;
    /**
     * @en Render priority of the camera. Cameras with higher depth are rendered after cameras with lower depth.
     * @zh 相机的渲染优先级，值越小越优先渲染。
     */
    priority: number;
    /**
     * @internal
     */
    pipeline?: string;
    /**
     * @en The type of the camera, mainly for marking different camera usage in XR, it determines the camera's viewport and parameters.
     * @zh 相机类型，主要服务于标记 XR 中的不同相机用途，影响渲染的视口和对应的参数。
     */
    cameraType?: CameraType;
    /**
     * @en The spatial tracking signal type used by the camera in XR.
     * @zh 相机使用的 XR 空间定位追踪信号类型。
     */
    trackingType?: TrackingType;
    /**
     * @internal
     */
    usage?: CameraUsage;
}

const v_a = new Vec3();
const v_b = new Vec3();
const _tempMat1 = new Mat4();

export enum SkyBoxFlagValue {
    VALUE = ClearFlagBit.STENCIL << 1,
}

export const SKYBOX_FLAG = SkyBoxFlagValue.VALUE;

const correctionMatrices: Mat4[] = [];

/**
 * @en The render camera representation in the render scene, it's managed by [[Camera]]
 * @zh 渲染场景中的相机对象，由项目层的 [[Camera]] 管理。
 */
export class Camera {
    /**
     * @en This exposure value corresponding to default standard camera exposure parameters.
     * @zh 默认相机的曝光值。
     */
    public static get standardExposureValue (): number {
        return 1.0 / 38400.0;
    }

    /**
     * @en The luminance unit scale used by area lights.
     * @zh 默认局部光源使用的亮度单位缩放。
     */
    public static get standardLightMeterScale (): number {
        return 10000.0;
    }

    /**
     * @en The name of the camera
     * @zh 相机的名称
     */
    get name (): string | null {
        return this._name$;
    }

    /**
     * @en The render scene to which the camera is attached
     * @zh 相机所挂载的场景
     */
    get scene (): RenderScene | null {
        return this._scene$;
    }

    /**
     * @en The node of the camera which determines its transform in world space.
     * @zh 相机绑定的节点，决定了它在世界空间的变换矩阵
     */
    set node (val: Node) {
        this._node$ = val;
    }
    get node (): Node {
        return this._node$!;
    }

    /**
     * @en The unique ID of system window which the camera will render to.
     * @zh 相机关联的渲染窗口ID
     */
    get systemWindowId (): number {
        return this._windowId$;
    }

    /**
     * @en The render window of the camera
     * @zh 相机关联的渲染窗口
     */
    set window (val) {
        this._window$ = val;
    }
    get window (): RenderWindow {
        return this._window$!;
    }

    /**
     * @en Whether the camera is enabled, a disabled camera won't be processed in the render pipeline.
     * @zh 相机是否启用，未启用的相机不会被渲染
     */
    set enabled (val) {
        this._enabled$ = val;
    }
    get enabled (): boolean {
        return this._enabled$;
    }

    /**
     * @en Visibility mask of the camera, declaring a set of node layers that will be visible to this camera.
     * @zh 相机的可见性掩码，声明在当前相机中可见的节点层级集合。
     */
    set visibility (vis: number) {
        this._visibility$ = vis;
    }
    get visibility (): number {
        return this._visibility$;
    }

    /**
     * @en Render priority of the camera. Cameras with higher depth are rendered after cameras with lower depth.
     * @zh 相机的渲染优先级，值越小越优先渲染。
     */
    get priority (): number {
        return this._priority$;
    }

    set priority (val: number) {
        this._priority$ = val;
    }

    /**
     * @en The width of the camera's view size
     * @zh 相机的视图宽度
     */
    get width (): number {
        return this._width$;
    }

    /**
     * @en The height of the camera's view size
     * @zh 相机的视图高度
     */
    get height (): number {
        return this._height$;
    }

    /**
     * @en The world position of the camera
     * @zh 相机的世界坐标
     */
    set position (val) {
        this._position$ = val;
    }
    get position (): Vec3 {
        return this._position$;
    }

    /**
     * @en The forward vector of the camera's look direction
     * @zh 指向相机观察方向的向量
     */
    set forward (val) {
        this._forward$ = val;
    }
    get forward (): Vec3 {
        return this._forward$;
    }

    /**
     * @en Camera aperture, controls the exposure parameter.
     * @zh 相机光圈，影响相机的曝光参数。
     */
    set aperture (val: CameraAperture) {
        this._aperture$ = val;
        this._apertureValue$ = FSTOPS[this._aperture$];
        this.updateExposure$();
    }
    get aperture (): CameraAperture {
        return this._aperture$;
    }

    /**
     * @en Camera aperture value.
     * @zh 相机光圈值。
     */
    get apertureValue (): number {
        return this._apertureValue$;
    }

    /**
     * @en Camera shutter, controls the exposure parameter.
     * @zh 相机快门，影响相机的曝光参数。
     */
    set shutter (val: CameraShutter) {
        this._shutter$ = val;
        this._shutterValue$ = SHUTTERS[this._shutter$];
        this.updateExposure$();
    }
    get shutter (): CameraShutter {
        return this._shutter$;
    }

    /**
     * @en Camera shutter value.
     * @zh 相机快门值。
     */
    get shutterValue (): number {
        return this._shutterValue$;
    }

    /**
     * @en Camera ISO, controls the exposure parameter.
     * @zh 相机感光度，影响相机的曝光参数。
     */
    set iso (val: CameraISO) {
        this._iso = val;
        this._isoValue$ = ISOS[this._iso];
        this.updateExposure$();
    }
    get iso (): CameraISO {
        return this._iso;
    }

    /**
     * @en Camera ISO value.
     * @zh 相机感光度值。
     */
    get isoValue (): number {
        return this._isoValue$;
    }

    /**
     * @en The calculated exposure of the camera
     * @zh 相机的曝光参数
     */
    get exposure (): number {
        return this._exposure$;
    }

    /**
     * @en Clearing flags of the camera, specifies which part of the framebuffer will be actually cleared every frame.
     * @zh 相机的缓冲清除标志位，指定帧缓冲的哪部分要每帧清除。
     */
    get clearFlag (): ClearFlags {
        return this._clearFlag$;
    }
    set clearFlag (flag: ClearFlags) {
        this._clearFlag$ = flag;
    }

    /**
     * @en Clearing color of the camera.
     * @zh 相机的颜色缓冲默认值。
     */
    set clearColor (val) {
        this._clearColor$.x = val.x;
        this._clearColor$.y = val.y;
        this._clearColor$.z = val.z;
        this._clearColor$.w = val.w;
    }
    get clearColor (): IVec4Like {
        return this._clearColor$ as IVec4Like;
    }

    /**
     * @en Clearing depth of the camera.
     * @zh 相机的深度缓冲默认值。
     */
    get clearDepth (): number {
        return this._clearDepth$;
    }
    set clearDepth (depth: number) {
        this._clearDepth$ = depth;
    }

    /**
     * @en Clearing stencil of the camera.
     * @zh 相机的模板缓冲默认值。
     */
    get clearStencil (): number {
        return this._clearStencil$;
    }
    set clearStencil (stencil: number) {
        this._clearStencil$ = stencil;
    }

    /**
     * @en The projection type of the camera.
     * @zh 相机的投影类型。
     */
    set projectionType (val) {
        this._proj$ = val;
        this._isProjDirty$ = true;
    }
    get projectionType (): CameraProjection {
        return this._proj$;
    }

    /**
     * @en The aspect ratio of the camera
     * @zh 相机视图的长宽比
     */
    get aspect (): number {
        return this._aspect$;
    }

    /**
     * @en The viewport height of the orthogonal type camera.
     * @zh 正交相机的视角高度。
     */
    set orthoHeight (val) {
        this._orthoHeight$ = val;
        this._isProjDirty$ = true;
    }
    get orthoHeight (): number {
        return this._orthoHeight$;
    }

    /**
     * @en The axis on which the FOV would be fixed regardless of screen aspect changes.
     * @zh 指定视角的固定轴向，在此轴上不会跟随屏幕长宽比例变化。
     */
    set fovAxis (axis) {
        this._fovAxis$ = axis;
        this._isProjDirty$ = true;
    }
    get fovAxis (): CameraFOVAxis {
        return this._fovAxis$;
    }

    /**
     * @en Field of view of the camera.
     * @zh 相机的视角大小。
     */
    set fov (fov) {
        this._fov$ = fov;
        this._isProjDirty$ = true;
    }
    get fov (): number {
        return this._fov$;
    }

    /**
     * @en Near clipping distance of the camera, should be as large as possible within acceptable range.
     * @zh 相机的近裁剪距离，应在可接受范围内尽量取最大。
     */
    set nearClip (nearClip) {
        this._nearClip$ = nearClip;
        this._isProjDirty$ = true;
    }
    get nearClip (): number {
        return this._nearClip$;
    }

    /**
     * @en Far clipping distance of the camera, should be as small as possible within acceptable range.
     * @zh 相机的远裁剪距离，应在可接受范围内尽量取最小。
     */
    set farClip (farClip) {
        this._farClip$ = farClip;
        this._isProjDirty$ = true;
    }
    get farClip (): number {
        return this._farClip$;
    }

    /**
     * @en The viewport rect of the camera, pre-rotated (i.e. always in identity/portrait mode) if possible.
     * @zh 相机的视口矩形，如果设备允许的话，这个视口会永远保持竖屏状态，由渲染流程保障旋转的正确。
     */
    get viewport (): Rect {
        return this._viewport$;
    }
    set viewport (val) {
        warnID(8302);
        this.setViewportInOrientedSpace(val);
    }

    /**
     * @en The view frustum of the camera
     * @zh 相机的视锥体
     */
    set frustum (val) {
        this._frustum$ = val;
    }
    get frustum (): Frustum {
        return this._frustum$;
    }

    /**
     * @en The view matrix of the camera
     * @zh 相机的视图矩阵
     */
    get matView (): Mat4 {
        return this._matView$;
    }

    /**
     * @en The projection matrix of the camera
     * @zh 相机的投影矩阵
     */
    get matProj (): Mat4 {
        return this._matProj$;
    }

    /**
     * @en The inverse of the projection matrix of the camera
     * @zh 相机的逆投影矩阵
     */
    get matProjInv (): Mat4 {
        return this._matProjInv$;
    }

    /**
     * @en The view projection matrix of the camera
     * @zh 相机的视图投影矩阵
     */
    get matViewProj (): Mat4 {
        return this._matViewProj$;
    }

    /**
     * @en The inverse of the view projection matrix of the camera
     * @zh 相机的逆视图投影矩阵
     */
    get matViewProjInv (): Mat4 {
        return this._matViewProjInv$;
    }

    /**
     * @en Whether the camera is fixed size or matching the window size.
     * @zh 相机是固定尺寸还是跟随屏幕尺寸
     */
    public isWindowSize = true;

    /**
     * @en Scale of the internal buffer size,
     * set to 1 to keep the same with the canvas size.
     * @zh 相机内部缓冲尺寸的缩放值, 1 为与 canvas 尺寸相同。
     */
    public screenScale: number = 1;

    public postProcess: PostProcess | null = null;
    public usePostProcess = false;
    public pipeline = '';
    public pipelineSettings: object | null = null;

    private declare _device$: Device;
    private _scene$: RenderScene | null = null;
    private _node$: Node | null = null;
    private _name$: string | null = null;
    private _enabled$ = false;
    private _proj$: CameraProjection = -1 as CameraProjection;
    private _aspect$: number = 1;
    private _orthoHeight$ = 10.0;
    private _fovAxis$ = CameraFOVAxis.VERTICAL;
    private _fov$: number = toRadian(45);
    private _nearClip$ = 1.0;
    private _farClip$ = 1000.0;
    private _clearColor$ = new Color(0.2, 0.2, 0.2, 1);
    private _viewport$: Rect = rect(0, 0, 1, 1);
    private _orientedViewport$: Rect = rect(0, 0, 1, 1);
    private _curTransform$ = SurfaceTransform.IDENTITY;
    private _isProjDirty$ = true;
    private _matView$: Mat4 = mat4();
    private _matProj$: Mat4 = mat4();
    private _matProjInv$: Mat4 = mat4();
    private _matViewProj$: Mat4 = mat4();
    private _matViewProjInv$: Mat4 = mat4();
    private _frustum$: geometry.Frustum = new geometry.Frustum();
    private _forward$: Vec3 = v3();
    private _position$: Vec3 = v3();
    private _priority$ = 0;
    private _aperture$: CameraAperture = CameraAperture.F16_0;
    private declare _apertureValue$: number;
    private _shutter$: CameraShutter = CameraShutter.D125;
    private _shutterValue$ = 0.0;
    private _iso: CameraISO = CameraISO.ISO100;
    private _isoValue$ = 0.0;
    private _window$: RenderWindow | null = null;
    private _width$ = 1;
    private _height$ = 1;
    private _clearFlag$ = ClearFlagBit.NONE;
    private _clearDepth$ = 1.0;
    private _visibility$ = CAMERA_DEFAULT_MASK;
    private _exposure$ = 0;
    private _clearStencil$ = 0;
    private _geometryRenderer$: GeometryRenderer | null = null;
    private _windowId$ = 0;
    private _cameraType$: CameraType = CameraType.DEFAULT;
    private _trackingType$: TrackingType = TrackingType.NO_TRACKING;
    private _usage$: CameraUsage = CameraUsage.GAME;

    constructor (device: Device) {
        this._device$ = device;
        this._apertureValue$ = FSTOPS[this._aperture$];
        this._shutterValue$ = SHUTTERS[this._shutter$];
        this._isoValue$ = ISOS[this._iso];

        this._frustum$.accurate = true;

        if (!correctionMatrices.length) {
            const ySign = device.capabilities.clipSpaceSignY;
            correctionMatrices[SurfaceTransform.IDENTITY] = new Mat4(1, 0, 0, 0, 0, ySign);
            correctionMatrices[SurfaceTransform.ROTATE_90] = new Mat4(0, 1, 0, 0, -ySign, 0);
            correctionMatrices[SurfaceTransform.ROTATE_180] = new Mat4(-1, 0, 0, 0, 0, -ySign);
            correctionMatrices[SurfaceTransform.ROTATE_270] = new Mat4(0, -1, 0, 0, ySign, 0);
        }
    }

    private _updateAspect$ (oriented = true): void {
        this._aspect$ = (this.window.width * this._viewport$.width) / (this.window.height * this._viewport$.height);
        // window size/viewport is pre-rotated, but aspect should be oriented to acquire the correct projection
        if (oriented) {
            const swapchain = this.window.swapchain;
            const orientation = swapchain && swapchain.surfaceTransform || SurfaceTransform.IDENTITY;
            if (orientation % 2) this._aspect$ = 1 / this._aspect$;
        }
        this._isProjDirty$ = true;
    }

    /**
     * @en Initialize the camera, normally you shouldn't invoke this function, it's managed automatically.
     * @zh 初始化相机，开发者通常不应该使用这个方法，初始化流程是自动管理的。
     */
    public initialize (info: ICameraInfo): void {
        if (info.usage !== undefined) {
            this._usage$ = info.usage;
        } else {
            this.setDefaultUsage$();
        }
        if (info.trackingType !== undefined) {
            this._trackingType$ = info.trackingType;
        }
        if (info.cameraType !== undefined) {
            this._cameraType$ = info.cameraType;
        }
        this.node = info.node;
        this._width$ = 1;
        this._height$ = 1;
        this.clearFlag = ClearFlagBit.NONE;
        this.clearDepth = 1.0;
        this.visibility = CAMERA_DEFAULT_MASK;
        this._name$ = info.name;
        this._proj$ = info.projection;
        this._priority$ = info.priority || 0;
        this._aspect$ = this.screenScale = 1;
        this.updateExposure$();
        this.changeTargetWindow(info.window);
    }

    /**
     * @en Destroy the camera, you shouldn't invoke this function, it's managed by the render scene.
     * @zh 销毁相机，开发者不应该使用这个方法，销毁流程是由 RenderScene 管理的。
     */
    public destroy (): void {
        this._node$ = null;
        this.detachFromScene();
        if (this._window$) {
            this._window$.detachCamera(this);
            this.window = null!;
        }
        this._name$ = null;
        this._geometryRenderer$?.destroy();
    }

    /**
     * @en Attach the camera to the given render scene so that it will be rendered in it.
     * @zh 将相机添加到相关的渲染场景中，以便可以被渲染器渲染。
     * @param scene @en The render scene @zh 渲染场景
     */
    public attachToScene (scene: RenderScene): void {
        this._enabled$ = true;
        this._scene$ = scene;
    }

    /**
     * @en Detach the camera from previously attached render scene. It will no longer be rendered.
     * @zh 将相机从之前设置的渲染场景移除，之后将不会再被渲染。
     */
    public detachFromScene (): void {
        this._enabled$ = false;
        this._scene$ = null;
    }

    /**
     * @en Resize the view size of the camera.
     * @zh 重置相机视图尺寸
     * @param width The width of the view size
     * @param height The height of the view size
     */
    public resize (width: number, height: number): void {
        if (!this._window$) return;

        this._width$ = width;
        this._height$ = height;
        this._aspect$ = (width * this._viewport$.width) / (height * this._viewport$.height);
        this._isProjDirty$ = true;
    }

    /**
     * @en Set a fixed size for the camera view.
     * @zh 设置固定相机视图尺寸
     * @param width The width of the view size
     * @param height The height of the view size
     */
    public setFixedSize (width: number, height: number): void {
        this._width$ = width;
        this._height$ = height;
        this._updateAspect$();
        this.isWindowSize = false;
    }

    /**
     * Editor specific gizmo camera logic
     * @internal
     */
    public syncCameraEditor (camera): void {
        if (EDITOR) {
            this.position = camera.position;
            this.forward = camera.forward;
            this._matView$ = camera.matView;
            this._matProj$ = camera.matProj;
            this._matProjInv$ = camera.matProjInv;
            this._matViewProj$ = camera.matViewProj;
        }
    }

    /**
     * @en Update the camera's builtin matrixes
     * @zh 更新相机的视图、投影等矩阵
     * @param forceUpdate If force update, then dirty flag will be ignored
     */
    public update (forceUpdate = false): void { // for lazy eval situations like the in-editor preview
        if (!this._node$) return;

        let viewProjDirty = false;
        const xr = globalThis.__globalXR;
        if (xr && xr.isWebXR && xr.webXRWindowMap && xr.updateViewport) {
            const x = xr.webXRMatProjs ? 1 / xr.webXRMatProjs.length : 1;
            const wndXREye = xr.webXRWindowMap.get(this._window$);
            this.setViewportInOrientedSpace(new Rect(x * wndXREye, 0, x, 1));
        }
        // view matrix
        if (this._node$.hasChangedFlags || forceUpdate) {
            Mat4.invert(this._matView$, this._node$.worldMatrix);
            this._forward$.x = -this._matView$.m02;
            this._forward$.y = -this._matView$.m06;
            this._forward$.z = -this._matView$.m10;
            // Remove scale
            Mat4.multiply(this._matView$, new Mat4().scale(this._node$.worldScale), this._matView$);
            this._node$.getWorldPosition(this._position$);
            viewProjDirty = true;
        }

        // projection matrix
        const swapchain = this.window?.swapchain;
        const orientation = swapchain && swapchain.surfaceTransform || SurfaceTransform.IDENTITY;
        if (this._isProjDirty$ || this._curTransform$ !== orientation) {
            this._curTransform$ = orientation;
            const projectionSignY = this._device$.capabilities.clipSpaceSignY;
            // Only for rendertexture processing
            if (this._proj$ === CameraProjection.PERSPECTIVE) {
                if (xr && xr.isWebXR && xr.webXRWindowMap && xr.webXRMatProjs) {
                    const wndXREye = xr.webXRWindowMap.get(this._window$);
                    this._matProj$.set(xr.webXRMatProjs[wndXREye] as Mat4);
                } else {
                    Mat4.perspective(
                        this._matProj$,
                        this._fov$,
                        this._aspect$,
                        this._nearClip$,
                        this._farClip$,
                        this._fovAxis$ === CameraFOVAxis.VERTICAL,
                        this._device$.capabilities.clipSpaceMinZ,
                        projectionSignY,
                        orientation,
                    );
                }
            } else {
                const x = this._orthoHeight$ * this._aspect$;
                const y = this._orthoHeight$;
                Mat4.ortho(
                    this._matProj$,
                    -x,
                    x,
                    -y,
                    y,
                    this._nearClip$,
                    this._farClip$,
                    this._device$.capabilities.clipSpaceMinZ,
                    projectionSignY,
                    orientation,
                );
            }
            Mat4.invert(this._matProjInv$, this._matProj$);
            viewProjDirty = true;
            this._isProjDirty$ = false;
        }

        // view-projection
        if (viewProjDirty) {
            Mat4.multiply(this._matViewProj$, this._matProj$, this._matView$);
            Mat4.invert(this._matViewProjInv$, this._matViewProj$);
            this._frustum$.update(this._matViewProj$, this._matViewProjInv$);
        }
    }

    get surfaceTransform (): SurfaceTransform {
        return this._curTransform$;
    }

    /**
     * @en Set the viewport in oriented space (equal to the actual screen rotation)
     * @zh 在目标朝向空间（实际屏幕朝向）内设置相机视口
     */
    public setViewportInOrientedSpace (val: Rect): void {
        const { x, width, height } = val;
        const y = this._device$.capabilities.screenSpaceSignY < 0 ? 1 - val.y - height : val.y;

        const swapchain = this.window?.swapchain;
        const orientation = swapchain && swapchain.surfaceTransform || SurfaceTransform.IDENTITY;

        switch (orientation) {
        case SurfaceTransform.ROTATE_90:
            this._viewport$.x = 1 - y - height;
            this._viewport$.y = x;
            this._viewport$.width = height;
            this._viewport$.height = width;
            break;
        case SurfaceTransform.ROTATE_180:
            this._viewport$.x = 1 - x - width;
            this._viewport$.y = 1 - y - height;
            this._viewport$.width = width;
            this._viewport$.height = height;
            break;
        case SurfaceTransform.ROTATE_270:
            this._viewport$.x = y;
            this._viewport$.y = 1 - x - width;
            this._viewport$.width = height;
            this._viewport$.height = width;
            break;
        case SurfaceTransform.IDENTITY:
            this._viewport$.x = x;
            this._viewport$.y = y;
            this._viewport$.width = width;
            this._viewport$.height = height;
            break;
        default:
        }

        this._orientedViewport$.x = x;
        this._orientedViewport$.y = y;
        this._orientedViewport$.width = width;
        this._orientedViewport$.height = height;

        this.resize(this.width, this.height);
    }

    /**
     * @en create geometry renderer for this camera
     * @zh 创建这个摄像机的几何体渲染器
     */
    public initGeometryRenderer (): void {
        if (!this._geometryRenderer$) {
            const GeometryRenderer = cclegacy.internal.GeometryRenderer;
            this._geometryRenderer$ = GeometryRenderer ? new GeometryRenderer() : null;
            this._geometryRenderer$?.activate(this._device$);
        }
    }

    /**
     * @en get geometry renderer of this camera
     * @zh 获取这个摄像机的几何体渲染器
     * @returns @en return the geometry renderer @zh 返回几何体渲染器
     */
    get geometryRenderer (): GeometryRenderer  | null {
        return this._geometryRenderer$;
    }

    get cameraType (): CameraType {
        return this._cameraType$;
    }

    set cameraType (type: CameraType) {
        this._cameraType$ = type;
    }

    get trackingType (): TrackingType {
        return this._trackingType$;
    }

    set trackingType (type: TrackingType) {
        this._trackingType$ = type;
    }

    get cameraUsage (): CameraUsage {
        return this._usage$;
    }

    set cameraUsage (usage: CameraUsage) {
        this._usage$ = usage;
    }

    /**
     * @en Change the target render window to another one
     * @zh 修改相机的目标渲染窗口
     * @param window The target render window, could be null
     */
    public changeTargetWindow (window: RenderWindow | null = null): void {
        if (this._window$) {
            this._window$.detachCamera(this);
        }
        const win = window || (cclegacy.director.root as Root).mainWindow;
        if (win) {
            win.attachCamera(this);
            this.window = win;

            // window size is pre-rotated
            const swapchain = win.swapchain;
            const orientation = swapchain && swapchain.surfaceTransform || SurfaceTransform.IDENTITY;
            if (orientation % 2) this.resize(win.height, win.width);
            else this.resize(win.width, win.height);
        }
    }

    /**
     * @en Detach camera from the render window
     * @zh 将 camera 从渲染窗口移除
     */
    public detachCamera (): void {
        if (this._window$) {
            this._window$.detachCamera(this);
        }
    }

    /**
     * @en Transform a screen position (in oriented space) to a world space ray
     * @zh 将一个屏幕空间（在实际朝向下）点转换到世界空间的射线
     * @param out the resulting ray
     * @param x the screen x of the position
     * @param y the screen y of the position
     * @returns the resulting ray
     */
    public screenPointToRay (out: geometry.Ray, x: number, y: number): geometry.Ray {
        if (!this._node$) return null!;

        const width = this.width;
        const height = this.height;
        const cx = this._orientedViewport$.x * width;
        const cy = this._orientedViewport$.y * height;
        const cw = this._orientedViewport$.width * width;
        const ch = this._orientedViewport$.height * height;
        const isProj = this._proj$ === CameraProjection.PERSPECTIVE;
        const ySign = this._device$.capabilities.clipSpaceSignY;
        const preTransform = preTransforms[this._curTransform$];

        Vec3.set(v_a, (x - cx) / cw * 2 - 1, (y - cy) / ch * 2 - 1, isProj ? 1 : -1);

        const { x: ox, y: oy } = v_a;
        v_a.x = ox * preTransform[0] + oy * preTransform[2] * ySign;
        v_a.y = ox * preTransform[1] + oy * preTransform[3] * ySign;

        Vec3.transformMat4(isProj ? v_a : out.o, v_a, this._matViewProjInv$);

        if (isProj) {
            // camera origin
            this._node$.getWorldPosition(v_b);
            geometry.Ray.fromPoints(out, v_b, v_a);
        } else {
            Vec3.transformQuat(out.d, Vec3.FORWARD, this._node$.worldRotation);
        }

        return out;
    }

    /**
     * @en Transform a screen position (in oriented space) to world space
     * @zh 将一个屏幕空间（在实际朝向下）位置转换到世界空间
     * @param out the resulting vector
     * @param screenPos the screen position to be transformed
     * @returns the resulting vector
     */
    public screenToWorld (out: Vec3, screenPos: Vec3): Vec3 {
        const width = this.width;
        const height = this.height;
        const cx = this._orientedViewport$.x * width;
        const cy = this._orientedViewport$.y * height;
        const cw = this._orientedViewport$.width * width;
        const ch = this._orientedViewport$.height * height;
        const ySign = this._device$.capabilities.clipSpaceSignY;
        const preTransform = preTransforms[this._curTransform$];

        if (this._proj$ === CameraProjection.PERSPECTIVE) {
            // calculate screen pos in far clip plane
            Vec3.set(
                out,
                (screenPos.x - cx) / cw * 2 - 1,
                (screenPos.y - cy) / ch * 2 - 1,
                1.0,
            );

            // transform to world
            const { x, y } = out;
            out.x = x * preTransform[0] + y * preTransform[2] * ySign;
            out.y = x * preTransform[1] + y * preTransform[3] * ySign;
            Vec3.transformMat4(out, out, this._matViewProjInv$);

            // lerp to depth z
            if (this._node$) { this._node$.getWorldPosition(v_a); }

            Vec3.lerp(out, v_a, out, lerp(this._nearClip$ / this._farClip$, 1, screenPos.z));
        } else {
            Vec3.set(
                out,
                (screenPos.x - cx) / cw * 2 - 1,
                (screenPos.y - cy) / ch * 2 - 1,
                screenPos.z * 2 - 1,
            );

            // transform to world
            const { x, y } = out;
            out.x = x * preTransform[0] + y * preTransform[2] * ySign;
            out.y = x * preTransform[1] + y * preTransform[3] * ySign;
            Vec3.transformMat4(out, out, this._matViewProjInv$);
        }

        return out;
    }

    /**
     * @en Transform a world space position to screen space rendered by the camera
     * @zh 将一个世界空间位置转换到相机渲染后的屏幕空间
     * @param out the resulting vector
     * @param worldPos the world position to be transformed
     * @returns the resulting vector
     */
    public worldToScreen (out: Vec3, worldPos: Vec3 | Readonly<Vec3>): Vec3 {
        const ySign = this._device$.capabilities.clipSpaceSignY;
        const preTransform = preTransforms[this._curTransform$];

        Vec3.transformMat4(out, worldPos, this._matViewProj$);

        const { x, y } = out;
        out.x = x * preTransform[0] + y * preTransform[2] * ySign;
        out.y = x * preTransform[1] + y * preTransform[3] * ySign;

        const width = this.width;
        const height = this.height;
        const cx = this._orientedViewport$.x * width;
        const cy = this._orientedViewport$.y * height;
        const cw = this._orientedViewport$.width * width;
        const ch = this._orientedViewport$.height * height;

        out.x = cx + (out.x + 1) * 0.5 * cw;
        out.y = cy + (out.y + 1) * 0.5 * ch;
        out.z = out.z * 0.5 + 0.5;

        return out;
    }

    /**
     * @en Transform a world space matrix to screen space rendered by the camera
     * @zh 将一个世界空间矩阵转换到相机渲染后的屏幕空间
     * @param out the resulting matrix
     * @param worldMatrix the world space matrix to be transformed
     * @param width framebuffer width
     * @param height framebuffer height
     * @returns the resulting matrix
     */
    public worldMatrixToScreen (out: Mat4, worldMatrix: Mat4, width: number, height: number): Mat4 {
        Mat4.multiply(out, this._matViewProj$, worldMatrix);
        Mat4.multiply(out, correctionMatrices[this._curTransform$], out);

        const halfWidth = width / 2;
        const halfHeight = height / 2;
        Mat4.identity(_tempMat1);
        Mat4.transform(_tempMat1, _tempMat1, Vec3.set(v_a, halfWidth, halfHeight, 0));
        Mat4.scale(_tempMat1, _tempMat1, Vec3.set(v_a, halfWidth, halfHeight, 1));

        Mat4.multiply(out, _tempMat1, out);

        return out;
    }

    /**
     * @en Calculate and set oblique view frustum projection matrix.
     * @zh 计算并设置斜视锥体投影矩阵
     * @param clipPlane clip plane in camera space
     */
    public calculateObliqueMat (viewSpacePlane: Vec4): void {
        const clipFar = new Vec4(Math.sign(viewSpacePlane.x), Math.sign(viewSpacePlane.y), 1.0, 1.0);
        const viewFar = clipFar.transformMat4(this._matProjInv$);

        const m4 = new Vec4(this._matProj$.m03, this._matProj$.m07, this._matProj$.m11, this._matProj$.m15);
        const scale = 2.0 / Vec4.dot(viewSpacePlane, viewFar);
        const newViewSpaceNearPlane = viewSpacePlane.multiplyScalar(scale);

        const m3 = newViewSpaceNearPlane.subtract(m4);

        this._matProj$.m02 = m3.x;
        this._matProj$.m06 = m3.y;
        this._matProj$.m10 = m3.z;
        this._matProj$.m14 = m3.w;
    }

    public getClipSpaceMinz (): number {
        return this._device$.capabilities.clipSpaceMinZ;
    }

    /**
     * @en Set exposure with actual value.
     * @zh 设置相机的曝光值
     * @param ev100
     */
    protected setExposure (ev100): void {
        this._exposure$ = 0.833333 / (2.0 ** ev100);
    }

    private updateExposure$ (): void {
        const ev100 = Math.log2((this._apertureValue$ * this._apertureValue$) / this._shutterValue$ * 100.0 / this._isoValue$);
        this.setExposure(ev100);
    }

    private setDefaultUsage$ (): void {
        if (EDITOR) {
            if (cclegacy.GAME_VIEW) {
                this._usage$ = CameraUsage.GAME_VIEW;
            } else {
                this._usage$ = CameraUsage.EDITOR;
            }
        } else {
            this._usage$ = CameraUsage.GAME;
        }
    }
}
