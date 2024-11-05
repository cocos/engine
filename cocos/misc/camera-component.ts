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

import { EDITOR } from 'internal:constants';
import { ccclass, help, executeInEditMode, menu, tooltip, displayOrder, type, serializable, visible, range, rangeMin } from 'cc.decorator';
import { RenderTexture } from '../asset/assets/render-texture';
import { UITransform } from '../2d/framework';
import { Component } from '../scene-graph';
import { Color, Rect, toRadian, Vec3, cclegacy, geometry, Enum } from '../core';
import { CAMERA_DEFAULT_MASK } from '../rendering/define';
import { scene } from '../render-scene';
import { SkyBoxFlagValue, CameraProjection, CameraFOVAxis, CameraAperture, CameraISO, CameraShutter,
    CameraType, TrackingType } from '../render-scene/scene/camera';
import { Node } from '../scene-graph/node';
import { Layers } from '../scene-graph/layers';
import { TransformBit } from '../scene-graph/node-enum';
import { RenderWindow } from '../render-scene/core/render-window';
import { ClearFlagBit } from '../gfx';
import { PostProcess } from '../rendering/post-process/components/post-process';
import { property } from '../core/data/class-decorator';
import type { Ray } from '../core/geometry';
import type { View } from '../ui/view';
import type { Root } from '../root';

const _temp_vec3_1 = new Vec3();

const ProjectionType = Enum(CameraProjection);
const FOVAxis = Enum(CameraFOVAxis);
const Aperture = Enum(CameraAperture);
const Shutter = Enum(CameraShutter);
const ISO = Enum(CameraISO);

/**
 * @en Clear screen flag enumeration of the camera.
 * @zh 相机的清屏标记枚举。
 */
export const ClearFlag = Enum({
    /**
     * @en Clear the screen with [[SceneGlobals.skybox]], will clear the depth and stencil buffer at the same time.
     * @zh 使用指定天空盒 [[SceneGlobals.skybox]] 清屏，会同时清理深度和蒙版缓冲。
     */
    SKYBOX: SkyBoxFlagValue.VALUE | ClearFlagBit.DEPTH_STENCIL,
    /**
     * @en Clear the screen with the given [[Camera.clearColor]], will clear the depth and stencil buffer at the same time.
     * @zh 使用指定的相机清屏颜色 [[Camera.clearColor]] 来清屏，会同时清理将深度和蒙版缓冲。
     */
    SOLID_COLOR: ClearFlagBit.ALL,
    /**
     * @en Only clear the depth and stencil buffer while keeping the color buffer intact. Often used in UI camera.
     * @zh 只清理深度和蒙版缓冲，同时保留颜色缓冲不变。常用于 UI 相机。
     */
    DEPTH_ONLY: ClearFlagBit.DEPTH_STENCIL,
    /**
     * @en Don't clear anything and continue rendering.
     * @zh 不清理任何内容就开始渲染，适合多 Camera 叠加渲染。
     */
    DONT_CLEAR: ClearFlagBit.NONE,
});

/**
 * @internal
 */
export declare namespace Camera {
    export type ProjectionType = EnumAlias<typeof ProjectionType>;
    export type FOVAxis = EnumAlias<typeof FOVAxis>;
    export type ClearFlag = EnumAlias<typeof ClearFlag>;
    export type Aperture = EnumAlias<typeof Aperture>;
    export type Shutter = EnumAlias<typeof Shutter>;
    export type ISO = EnumAlias<typeof ISO>;
}

export enum CameraEvent {
    TARGET_TEXTURE_CHANGE = 'tex-change',
}

/**
 * @en The Camera Component.
 * @zh 相机组件。
 */
@ccclass('cc.Camera')
@help('i18n:cc.Camera')
@menu('Rendering/Camera')
@executeInEditMode
export class Camera extends Component {
    /**
     * @en The projection type enumeration of the camera.
     * @zh 相机的投影类型枚举。
     */
    public static ProjectionType = ProjectionType;
    /**
     * @en The axis type of the fov
     * @zh FOV 的轴向枚举
     */
    public static FOVAxis = FOVAxis;
    /**
     * @en The clear flag enumeration of the camera.
     * @zh 相机的清除标志位枚举。
     */
    public static ClearFlag = ClearFlag;
    /**
     * @en The aperture value's enumeration of the camera.
     * @zh 相机的光圈值枚举。
     */
    public static Aperture = Aperture;
    /**
     * @en The shutter value's enumeration of the camera.
     * @zh 相机的快门值枚举。
     */
    public static Shutter = Shutter;
    /**
     * @en The ISO value's enumeration of the camera.
     * @zh 相机的感光度值枚举。
     */
    public static ISO = ISO;
    /**
     * @en The event for target texture changing.
     * @zh 目标贴图修改的事件。
     */
    public static TARGET_TEXTURE_CHANGE = CameraEvent.TARGET_TEXTURE_CHANGE;

    @serializable
    protected _projection = ProjectionType.PERSPECTIVE;
    @serializable
    protected _priority = 0;
    @serializable
    protected _fov = 45;
    @serializable
    protected _fovAxis = FOVAxis.VERTICAL;
    @serializable
    protected _orthoHeight = 10;
    @serializable
    protected _near = 1;
    @serializable
    protected _far = 1000;
    @serializable
    protected _color = new Color('#333333');
    @serializable
    protected _depth = 1;
    @serializable
    protected _stencil = 0;
    @serializable
    protected _clearFlags = ClearFlag.SOLID_COLOR;
    @serializable
    protected _rect = new Rect(0, 0, 1, 1);
    @serializable
    protected _aperture = Aperture.F16_0;
    @serializable
    protected _shutter = Shutter.D125;
    @serializable
    protected _iso = ISO.ISO100;
    @serializable
    protected _screenScale = 1;
    @serializable
    protected _visibility = CAMERA_DEFAULT_MASK;
    @serializable
    protected _targetTexture: RenderTexture | null = null;
    @serializable
    protected _postProcess: PostProcess | null = null;
    @serializable
    protected _usePostProcess = false;

    protected _camera: scene.Camera | null = null;
    protected _inEditorMode = false;
    protected _flows: string[] | undefined = undefined;
    @serializable
    protected _cameraType: CameraType = CameraType.DEFAULT;
    @serializable
    protected _trackingType: TrackingType = TrackingType.NO_TRACKING;

    constructor () {
        super();
    }

    /**
     * @en The render camera representation.
     * @zh 渲染场景中的相机对象。
     */
    get camera (): scene.Camera {
        return this._camera!;
    }

    /**
     * @en Render priority of the camera. Cameras with higher depth are rendered after cameras with lower depth.
     * @zh 相机的渲染优先级，值越小越优先渲染。
     */
    @displayOrder(0)
    @range([0, 65535, 1])
    @tooltip('i18n:camera.priority')
    get priority (): number {
        return this._priority;
    }

    set priority (val) {
        this._priority = val;
        if (this._camera) {
            this._camera.priority = val;
        }
    }

    /**
     * @en Visibility mask, declaring a set of node layers that will be visible to this camera.
     * @zh 可见性掩码，声明在当前相机中可见的节点层级集合。
     */
    @type(Layers.BitMask)
    @displayOrder(1)
    @tooltip('i18n:camera.visibility')
    get visibility (): number {
        return this._visibility;
    }

    set visibility (val) {
        this._visibility = val;
        if (this._camera) {
            this._camera.visibility = val;
        }
    }

    /**
     * @en Clearing flags of the camera, specifies which part of the framebuffer will be actually cleared every frame.
     * @zh 相机的缓冲清除标志位，指定帧缓冲的哪部分要每帧清除。
     */
    @type(ClearFlag)
    @displayOrder(2)
    @tooltip('i18n:camera.clear_flags')
    get clearFlags (): ClearFlagBit {
        return this._clearFlags;
    }

    set clearFlags (val) {
        this._clearFlags = val;
        if (this._camera) { this._camera.clearFlag = val; }
    }

    /**
     * @en Clearing color of the camera.
     * @zh 相机的颜色缓冲默认值。
     */
    @displayOrder(3)
    @tooltip('i18n:camera.color')
    // @constget
    get clearColor (): Readonly<Color> {
        return this._color;
    }

    set clearColor (val) {
        this._color.set(val);
        if (this._camera) {
            this._camera.clearColor = this._color;
        }
    }

    /**
     * @en Clearing depth of the camera.
     * @zh 相机的深度缓冲默认值。
     */
    @displayOrder(4)
    @tooltip('i18n:camera.depth')
    get clearDepth (): number {
        return this._depth;
    }

    set clearDepth (val) {
        this._depth = val;
        if (this._camera) { this._camera.clearDepth = val; }
    }

    /**
     * @en Clearing stencil of the camera.
     * @zh 相机的模板缓冲默认值。
     */
    @displayOrder(5)
    @tooltip('i18n:camera.stencil')
    get clearStencil (): number {
        return this._stencil;
    }

    set clearStencil (val) {
        this._stencil = val;
        if (this._camera) { this._camera.clearStencil = val; }
    }

    /**
     * @en Projection type of the camera.
     * @zh 相机的投影类型。
     */
    @type(ProjectionType)
    @displayOrder(6)
    @tooltip('i18n:camera.projection')
    get projection (): CameraProjection {
        return this._projection;
    }

    set projection (val) {
        this._projection = val;
        if (this._camera) { this._camera.projectionType = val; }
    }

    /**
     * @en The axis on which the FOV would be fixed regardless of screen aspect changes.
     * @zh 指定视角的固定轴向，在此轴上不会跟随屏幕长宽比例变化。
     */
    @type(FOVAxis)
    @displayOrder(7)
    @visible(function visible (this: Camera): boolean {
        return this._projection === ProjectionType.PERSPECTIVE;
    })
    @tooltip('i18n:camera.fov_axis')
    get fovAxis (): CameraFOVAxis {
        return this._fovAxis;
    }

    set fovAxis (val) {
        if (val === this._fovAxis) { return; }
        this._fovAxis = val;
        if (this._camera) {
            this._camera.fovAxis = val;
            if (val === CameraFOVAxis.VERTICAL) { this.fov = this._fov * this._camera.aspect; } else { this.fov = this._fov / this._camera.aspect; }
        }
    }

    /**
     * @en Field of view of the camera.
     * @zh 相机的视角大小。
     */
    @displayOrder(8)
    @visible(function (this: Camera): boolean {
        return this._projection === ProjectionType.PERSPECTIVE;
    })
    @range([1, 180, 1])
    @tooltip('i18n:camera.fov')
    get fov (): number {
        return this._fov;
    }

    set fov (val) {
        this._fov = val;
        if (this._camera) { this._camera.fov = toRadian(val); }
    }

    /**
     * @en Viewport height in orthographic mode.
     * @zh 正交模式下的相机视角高度。
     */
    @displayOrder(9)
    @visible(function visible (this: Camera): boolean {
        return this._projection === ProjectionType.ORTHO;
    })
    @rangeMin(1e-6)
    @tooltip('i18n:camera.ortho_height')
    get orthoHeight (): number {
        return this._orthoHeight;
    }

    set orthoHeight (val) {
        this._orthoHeight = val;
        if (this._camera) { this._camera.orthoHeight = val; }
    }

    /**
     * @en Near clipping distance of the camera, should be as large as possible within acceptable range.
     * @zh 相机的近裁剪距离，应在可接受范围内尽量取最大。
     */
    @displayOrder(10)
    @rangeMin(0)
    @tooltip('i18n:camera.near')
    get near (): number {
        return this._near;
    }

    set near (val) {
        this._near = val;
        if (this._camera) { this._camera.nearClip = val; }
    }

    /**
     * @en Far clipping distance of the camera, should be as small as possible within acceptable range.
     * @zh 相机的远裁剪距离，应在可接受范围内尽量取最小。
     */
    @displayOrder(11)
    @rangeMin(function (this: Camera): number {
        return this._near + 0.001;
    })
    @tooltip('i18n:camera.far')
    get far (): number {
        return this._far;
    }

    set far (val) {
        this._far = val;
        if (this._camera) { this._camera.farClip = val; }
    }

    /**
     * @en Camera aperture, controls the exposure parameter.
     * @zh 相机光圈，影响相机的曝光参数。
     */
    @type(Aperture)
    @displayOrder(12)
    @tooltip('i18n:camera.aperture')
    get aperture (): CameraAperture {
        return this._aperture;
    }

    set aperture (val) {
        this._aperture = val;
        if (this._camera) { this._camera.aperture = val; }
    }

    /**
     * @en Camera shutter, controls the exposure parameter.
     * @zh 相机快门，影响相机的曝光参数。
     */
    @type(Shutter)
    @displayOrder(13)
    @tooltip('i18n:camera.shutter')
    get shutter (): CameraShutter {
        return this._shutter;
    }

    set shutter (val) {
        this._shutter = val;
        if (this._camera) { this._camera.shutter = val; }
    }

    /**
     * @en Camera ISO, controls the exposure parameter.
     * @zh 相机感光度，影响相机的曝光参数。
     */
    @type(ISO)
    @displayOrder(14)
    @tooltip('i18n:camera.ISO')
    get iso (): CameraISO {
        return this._iso;
    }

    set iso (val) {
        this._iso = val;
        if (this._camera) { this._camera.iso = val; }
    }

    /**
     * @en Screen viewport of the camera wrt. the sceen size.
     * @zh 此相机最终渲染到屏幕上的视口位置和大小。
     */
    @displayOrder(15)
    @tooltip('i18n:camera.rect')
    get rect (): Rect {
        return this._rect;
    }

    set rect (val) {
        this._rect = val;
        if (this._camera) { this._camera.setViewportInOrientedSpace(val); }
    }

    /**
     * @en Output render texture of the camera. Default to null, which outputs directly to screen.
     * @zh 指定此相机的渲染输出目标贴图，默认为空，直接渲染到屏幕。
     */
    @type(RenderTexture)
    @displayOrder(16)
    @tooltip('i18n:camera.target_texture')
    get targetTexture (): RenderTexture | null {
        return this._targetTexture;
    }

    set targetTexture (value) {
        if (this._targetTexture === value) {
            return;
        }

        const old = this._targetTexture;
        this._targetTexture = value;
        this._checkTargetTextureEvent(old);
        this._updateTargetTexture();

        if (!value && this._camera) {
            this._camera.changeTargetWindow(EDITOR ? (cclegacy.director.root as Root).tempWindow : null);
            this._camera.isWindowSize = true;
        }
        this.node.emit(CameraEvent.TARGET_TEXTURE_CHANGE, this);
    }

    @tooltip('i18n:camera.use_postprocess')
    @property
    get usePostProcess (): boolean {
        return this._usePostProcess;
    }
    set usePostProcess (v) {
        this._usePostProcess = v;
        if (this._camera) {
            this._camera.usePostProcess = v;
        }
    }

    @tooltip('i18n:camera.postprocess')
    @type(PostProcess)
    get postProcess (): PostProcess | null {
        return this._postProcess;
    }
    set postProcess (v) {
        this._postProcess = v;
        if (this._camera) {
            this._camera.postProcess = v;
        }
    }

    /**
     * @en Scale of the internal buffer size,
     * set to 1 to keep the same with the canvas size.
     * @zh 相机内部缓冲尺寸的缩放值, 1 为与 canvas 尺寸相同。
     */
    get screenScale (): number {
        return this._screenScale;
    }

    set screenScale (val) {
        this._screenScale = val;
        if (this._camera) { this._camera.screenScale = val; }
    }

    /**
     * @internal
     */
    get inEditorMode (): boolean {
        return this._inEditorMode;
    }

    set inEditorMode (value) {
        this._inEditorMode = value;
        if (this._camera) {
            const root = cclegacy.director.root as Root;
            this._camera.changeTargetWindow(value ? root && root.mainWindow : root && root.tempWindow);
        }
    }

    /**
     * @internal
     */
    get cameraType (): CameraType {
        return this._cameraType;
    }

    set cameraType (val) {
        if (this._cameraType === val) {
            return;
        }
        this._cameraType = val;
        if (this.camera) {
            this.camera.cameraType = val;
        }
    }

    /**
     * @internal
     */
    get trackingType (): TrackingType {
        return this._trackingType;
    }

    set trackingType (val) {
        if (this._trackingType === val) {
            return;
        }
        this._trackingType = val;
        if (this.camera) {
            this.camera.trackingType = val;
        }
    }

    public onLoad (): void {
        this._createCamera();
    }

    public onEnable (): void {
        this.node.hasChangedFlags |= TransformBit.POSITION; // trigger camera matrix update
        if (this._camera) {
            this._attachToScene();
        }
    }

    public onDisable (): void {
        if (this._camera) {
            this._detachFromScene();
        }
    }

    public onDestroy (): void {
        if (this._camera) {
            this._camera.destroy();
            this._camera = null;
        }

        if (this._targetTexture) {
            this._targetTexture.off('resize');
        }
    }

    /**
     * @en Convert a screen space (left-top origin) point to a ray.
     * @zh 将一个屏幕空间（左上角为原点）坐标转换为射线。
     * @param x The x axis position on screen.
     * @param y The y axis position on screen.
     * @param out The output ray object.
     * @returns Return the output ray object.
     */
    public screenPointToRay (x: number, y: number, out?: geometry.Ray): Ray {
        if (!out) { out = geometry.Ray.create(); }
        if (this._camera) { this._camera.screenPointToRay(out, x, y); }
        return out;
    }

    /**
     * @en Convert a world position to a screen space (left-top origin) position.
     * @zh 将一个世界空间坐标转换为屏幕空间（左上角为原点）坐标。
     * @param worldPos The position in world space coordinates
     * @param out The output position in screen space coordinates.
     * @returns Return the output position object.
     */
    public worldToScreen (worldPos: Vec3 | Readonly<Vec3>, out?: Vec3): Vec3 {
        if (!out) { out = new Vec3(); }
        if (this._camera) { this._camera.worldToScreen(out, worldPos); }
        return out;
    }

    /**
     * @en Convert a screen space (left-top origin) position to a world space position.
     * @zh 将一个屏幕空间（左上角为原点）转换为世界空间坐标。
     * @param screenPos The position in screen space coordinates
     * @param out The output position in world space coordinates
     * @returns Return the output position object.
     */
    public screenToWorld (screenPos: Vec3, out?: Vec3): Vec3 {
        if (!out) { out = this.node.getWorldPosition(); }
        if (this._camera) { this._camera.screenToWorld(out, screenPos); }
        return out;
    }

    /**
     * @en Convert a 3D world position to the local coordinates system of the given UI node.
     * The converted position will be related to the given UI node under local space.
     * @zh 将一个 3D 空间世界坐标转换到指定的 UI 本地节点坐标系下。转换后的位置是指定 UI 节点坐标系下的局部偏移。
     * @param wpos @en The world position to convert @zh 需要转换的世界坐标
     * @param uiNode @en The UI node coordinates in which the world position will be convert to @zh 用于同步位置的 UI 节点
     * @param out @en Return the corresponding position of the given world position in the UI node's local coordinates @zh 返回传入的世界坐标在 UI 节点本地坐标系下的局部坐标
     *
     * @example
     * ```ts
     * this.convertToUINode(target.worldPosition, uiNode.parent, out);
     * uiNode.position = out;
     * ```
     */
    public convertToUINode (wpos: Vec3 | Readonly<Vec3>, uiNode: Node, out?: Vec3): Vec3 {
        if (!out) {
            out = new Vec3();
        }
        if (!this._camera) { return out; }

        this.worldToScreen(wpos, _temp_vec3_1);
        const cmp = uiNode.getComponent('cc.UITransform') as UITransform;
        const view = cclegacy.view as View;
        const designSize = view.getVisibleSize();
        const xoffset = _temp_vec3_1.x - this._camera.width * 0.5;
        const yoffset = _temp_vec3_1.y - this._camera.height * 0.5;
        _temp_vec3_1.x = xoffset / view.getScaleX() + designSize.width * 0.5;
        _temp_vec3_1.y = yoffset / view.getScaleY() + designSize.height * 0.5;

        if (cmp) {
            cmp.convertToNodeSpaceAR(_temp_vec3_1, out);
        }

        return out;
    }

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _createCamera (): void {
        if (!this._camera) {
            this._camera = (cclegacy.director.root as Root).createCamera();
            this._camera.initialize({
                name: this.node.name,
                node: this.node,
                projection: this._projection,
                window: this._inEditorMode ? cclegacy.director.root && cclegacy.director.root.mainWindow
                    : cclegacy.director.root && cclegacy.director.root.tempWindow,
                priority: this._priority,
                cameraType: this.cameraType,
                trackingType: this.trackingType,
            });

            this._camera.setViewportInOrientedSpace(this._rect);
            this._camera.fovAxis = this._fovAxis;
            this._camera.fov = toRadian(this._fov);
            this._camera.orthoHeight = this._orthoHeight;
            this._camera.nearClip = this._near;
            this._camera.farClip = this._far;
            this._camera.clearColor = this._color;
            this._camera.clearDepth = this._depth;
            this._camera.clearStencil = this._stencil;
            this._camera.clearFlag = this._clearFlags;
            this._camera.visibility = this._visibility;
            this._camera.aperture = this._aperture;
            this._camera.shutter = this._shutter;
            this._camera.iso = this._iso;
            this._camera.postProcess = this._postProcess;
            this._camera.usePostProcess = this._usePostProcess;
        }

        this._updateTargetTexture();
    }

    protected _attachToScene (): void {
        if (!this.node.scene || !this._camera) {
            return;
        }
        if (this._camera && this._camera.scene) {
            this._camera.scene.removeCamera(this._camera);
        }
        const rs = this._getRenderScene();
        rs.addCamera(this._camera);
    }

    protected _detachFromScene (): void {
        if (this._camera && this._camera.scene) {
            this._camera.scene.removeCamera(this._camera);
        }
    }

    protected _checkTargetTextureEvent (old: RenderTexture | null): void {
        if (old) {
            old.off('resize');
        }

        if (this._targetTexture) {
            this._targetTexture.on('resize', (window: RenderWindow) => {
                if (this._camera) {
                    this._camera.setFixedSize(window.width, window.height);
                }
            }, this);
        }
    }

    protected _updateTargetTexture (): void {
        if (!this._camera) {
            return;
        }

        if (this._targetTexture) {
            const window = this._targetTexture.window;
            this._camera.changeTargetWindow(window);
            this._camera.setFixedSize(window!.width, window!.height);
        }
    }
}

cclegacy.Camera = Camera;
