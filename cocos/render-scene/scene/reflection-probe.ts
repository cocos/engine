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
import { Camera, CameraAperture, CameraFOVAxis, CameraISO, CameraProjection, CameraShutter, CameraType, SkyBoxFlagValue, TrackingType } from './camera';
import { Node } from '../../scene-graph/node';
import { Color, Quat, Rect, toRadian, Vec2, Vec3, geometry, cclegacy, Vec4, Size, v3, quat } from '../../core';
import { CAMERA_DEFAULT_MASK } from '../../rendering/define';
import { ClearFlagBit, Framebuffer } from '../../gfx';
import { TextureCube } from '../../asset/assets/texture-cube';
import { RenderTexture } from '../../asset/assets/render-texture';

export enum ProbeClearFlag {
    SKYBOX = SkyBoxFlagValue.VALUE | ClearFlagBit.DEPTH_STENCIL,
    SOLID_COLOR = ClearFlagBit.ALL,
}

export enum ProbeType {
    CUBE = 0,
    PLANAR = 1,
}
// right left up down front back
const cameraDir: Vec3[] = [
    new Vec3(0, -90, 0),
    new Vec3(0, 90, 0),

    new Vec3(90, 0, 0),
    new Vec3(-90, 0, 0),

    new Vec3(0, 0, 0),
    new Vec3(0, 180, 0),
];

export class ReflectionProbe {
    public bakedCubeTextures: RenderTexture[] = [];

    public realtimePlanarTexture: RenderTexture | null = null;

    protected _resolution = 256;
    protected _clearFlag: number = ProbeClearFlag.SKYBOX;
    protected _backgroundColor = new Color(0, 0, 0, 255);
    protected _visibility = CAMERA_DEFAULT_MASK;
    protected _probeType = ProbeType.CUBE;
    protected _cubemap: TextureCube | null = null;
    protected readonly _size = new Vec3(1, 1, 1);

    /**
     * @en Render cubemap's camera
     * @zh 渲染cubemap的相机
     */
    private _camera: Camera | null = null;

    /**
     * @en Unique id of probe.
     * @zh probe的唯一id
     */
    private _probeId = 0;

    private _needRefresh = false;

    private _needRender = false;

    private _node: Node | null = null;

    private _cameraNode: Node | null = null;

    /**
     * @en The AABB bounding box and probe only render the objects inside the bounding box.
     * @zh AABB包围盒，probe只渲染包围盒内的物体
     */
    private _boundingBox: geometry.AABB | null = null;

    /**
     * @en The position of the camera in world space.
     * @zh 世界空间相机的位置
     */
    private _cameraWorldPos = v3();

    /**
     * @en The rotation of the camera in world space.
     * @zh 世界空间相机的旋转
     */
    private _cameraWorldRotation = quat();

    /**
     * @en The forward direction vertor of the camera in world space.
     * @zh 世界空间相机朝前的方向向量
     */
    private _forward = v3();
    /**
     * @en The up direction vertor of the camera in world space.
     * @zh 世界空间相机朝上的方向向量
     */
    private _up = v3();

    /**
     * @en Reflection probe cube pattern preview sphere
     * @zh 反射探针cube模式的预览小球
     */
    protected _previewSphere: Node | null = null;

    protected _previewPlane: Node | null = null;

    /**
     * @en Set probe type,cube or planar.
     * @zh 设置探针类型，cube或者planar
     */
    set probeType (value: ProbeType) {
        this._probeType = value;
    }
    get probeType (): ProbeType {
        return this._probeType;
    }

    get resolution (): number {
        return this._resolution;
    }

    /**
     * @en set render texture size
     * @zh 设置渲染纹理大小
     */
    set resolution (value: number) {
        if (value !== this._resolution) {
            this.bakedCubeTextures.forEach((rt, idx): void => {
                rt.resize(value, value);
            });
        }
        this._resolution = value;
    }

    /**
     * @en Clearing flags of the camera, specifies which part of the framebuffer will be actually cleared every frame.
     * @zh 相机的缓冲清除标志位，指定帧缓冲的哪部分要每帧清除。
     */
    set clearFlag (value: number) {
        this._clearFlag = value;
        this.camera.clearFlag = this._clearFlag;
    }
    get clearFlag (): number {
        return this._clearFlag;
    }

    /**
     * @en Clearing color of the camera.
     * @zh 相机的颜色缓冲默认值。
     */
    set backgroundColor (val: Color) {
        this._backgroundColor = val;
        this.camera.clearColor = this._backgroundColor;
    }
    get backgroundColor (): Color {
        return this._backgroundColor;
    }
    /**
     * @en Visibility mask, declaring a set of node layers that will be visible to this camera.
     * @zh 可见性掩码，声明在当前相机中可见的节点层级集合。
     */
    get visibility (): number {
        return this._visibility;
    }
    set visibility (val) {
        this._visibility = val;
        this._camera!.visibility = this._visibility;
    }

    /**
     * @en Gets or sets the size of the box, in local space.
     * @zh 获取或设置盒的大小。
     */
    set size (value) {
        this._size.set(value);

        const pos = this.node.getWorldPosition();
        geometry.AABB.set(this._boundingBox!, pos.x, pos.y, pos.z, this._size.x, this._size.y, this._size.z);
    }
    get size (): Vec3 {
        return this._size;
    }

    set cubemap (val: TextureCube | null) {
        this._cubemap = val;
    }

    get cubemap (): TextureCube | null {
        return this._cubemap!;
    }

    /**
     * @en The node of the probe.
     * @zh probe绑定的节点
     */
    get node (): Node {
        return this._node!;
    }

    get camera (): Camera {
        return this._camera!;
    }

    /**
     * @en Refresh the objects that use this probe.
     * @zh 刷新使用该probe的物体
     */
    set needRefresh (value: boolean) {
        this._needRefresh = value;
    }

    get needRefresh (): boolean {
        return this._needRefresh;
    }

    set needRender (value: boolean) {
        this._needRender = value;
    }
    get needRender (): boolean {
        return this._needRender;
    }

    get boundingBox (): geometry.AABB | null {
        return this._boundingBox;
    }

    set cameraNode (node: Node) {
        this._cameraNode = node;
    }
    get cameraNode (): Node {
        return this._cameraNode!;
    }

    /**
     * @en Reflection probe cube mode preview sphere
     * @zh 反射探针cube模式的预览小球
     * @engineInternal
     */
    set previewSphere (val: Node | null) {
        this._previewSphere = val;
    }

    get previewSphere (): Node | null {
        return this._previewSphere!;
    }

    /**
     * @en Reflection probe planar mode preview plane
     * @zh 反射探针Planar模式的预览平面
     */
    set previewPlane (val: Node) {
        this._previewPlane = val;
    }

    get previewPlane (): Node {
        return this._previewPlane!;
    }

    constructor (id: number) {
        this._probeId = id;
    }

    public initialize (node: Node, cameraNode: Node): void {
        this._node = node;
        this._cameraNode = cameraNode;
        const pos = this.node.getWorldPosition();
        this._boundingBox = geometry.AABB.create(pos.x, pos.y, pos.z, this._size.x, this._size.y, this._size.z);
        this._createCamera(cameraNode);
    }

    public initBakedTextures (): void {
        if (this.bakedCubeTextures.length === 0) {
            for (let i = 0; i < 6; i++) {
                const renderTexture = this._createTargetTexture(this._resolution, this._resolution);
                this.bakedCubeTextures.push(renderTexture);
            }
        }
    }

    public captureCubemap (): void {
        this.initBakedTextures();
        this._resetCameraParams();
        this._needRender = true;
    }

    /**
     * @en Render real-time planar reflection textures
     * @zh 渲染实时平面反射贴图
     * @param sourceCamera render planar reflection for this camera
     */
    public renderPlanarReflection (sourceCamera: Camera): void {
        if (!sourceCamera) return;
        if (!this.realtimePlanarTexture) {
            const canvasSize = cclegacy.view.getDesignResolutionSize() as Size;
            this.realtimePlanarTexture = this._createTargetTexture(canvasSize.width, canvasSize.height);
            cclegacy.internal.reflectionProbeManager.updatePlanarMap(this, this.realtimePlanarTexture.getGFXTexture());
        }
        this._syncCameraParams(sourceCamera);
        this._transformReflectionCamera(sourceCamera);
        this._needRender = true;
    }

    public switchProbeType (type: ProbeType, sourceCamera: Camera | null): void {
        if (type === ProbeType.CUBE) {
            this._needRender = false;
        } else if (sourceCamera !== null) {
            this.renderPlanarReflection(sourceCamera);
        }
    }

    public getProbeId (): number {
        return this._probeId;
    }

    public updateProbeId (id): void {
        this._probeId = id;
    }

    public renderArea (): Vec2 {
        if (this._probeType === ProbeType.PLANAR) {
            return new Vec2(this.realtimePlanarTexture!.width, this.realtimePlanarTexture!.height);
        } else {
            return new Vec2(this.resolution, this.resolution);
        }
    }

    public isFinishedRendering (): boolean {
        return true;
    }

    public validate (): boolean {
        return this.cubemap !== null;
    }

    public destroy (): void {
        if (this._camera) {
            this._camera.destroy();
            this._camera = null;
        }
        for (let i = 0; i < this.bakedCubeTextures.length; i++) {
            this.bakedCubeTextures[i].destroy();
        }
        this.bakedCubeTextures = [];

        if (this.realtimePlanarTexture) {
            this.realtimePlanarTexture.destroy();
            this.realtimePlanarTexture = null;
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    public enable (): void {
    }
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    public disable (): void {
    }

    public updateCameraDir (faceIdx: number): void {
        this.cameraNode.setRotationFromEuler(cameraDir[faceIdx]);
        this.camera.update(true);
    }

    public updateBoundingBox (): void {
        if (this.node) {
            const pos = this.node.getWorldPosition();
            geometry.AABB.set(this._boundingBox!, pos.x, pos.y, pos.z, this._size.x, this._size.y, this._size.z);
        }
    }

    public hasFrameBuffer (framebuffer: Framebuffer): boolean {
        if (this.probeType === ProbeType.PLANAR) {
            if (!this.realtimePlanarTexture) return false;
            if (this.realtimePlanarTexture.window?.framebuffer === framebuffer) {
                return true;
            }
        } else {
            if (this.bakedCubeTextures.length === 0) return false;
            for (let i = 0; i < this.bakedCubeTextures.length; i++) {
                const rt = this.bakedCubeTextures[i];
                if (rt.window?.framebuffer === framebuffer) {
                    return true;
                }
            }
        }
        return false;
    }

    public isRGBE (): boolean  {
        //todo: realtime do not use rgbe
        return true;
    }

    private _syncCameraParams (camera: Camera): void {
        this.camera.projectionType = camera.projectionType;
        this.camera.orthoHeight = camera.orthoHeight;
        this.camera.nearClip = camera.nearClip;
        this.camera.farClip = camera.farClip;
        this.camera.fov = camera.fov;
        this.camera.clearFlag = camera.clearFlag;
        this.camera.clearColor = camera.clearColor;
        this.camera.priority = camera.priority - 1;
        this.camera.resize(camera.width, camera.height);
    }

    private _createCamera (cameraNode: Node): Camera | null {
        const root = cclegacy.director.root;
        if (!this._camera) {
            this._camera = root.createCamera();
            if (!this._camera) return null;
            this._camera.initialize({
                name: cameraNode.name,
                node: cameraNode,
                projection: CameraProjection.PERSPECTIVE,
                window: EDITOR ? root && root.mainWindow : root && root.tempWindow,
                priority: 0,
                cameraType: CameraType.DEFAULT,
                trackingType: TrackingType.NO_TRACKING,
            });
        }
        this._camera.setViewportInOrientedSpace(new Rect(0, 0, 1, 1));
        this._camera.fovAxis = CameraFOVAxis.VERTICAL;
        this._camera.fov = toRadian(90);
        this._camera.orthoHeight = 10;
        this._camera.nearClip = 1;
        this._camera.farClip = 1000;
        this._camera.clearColor = this._backgroundColor;
        this._camera.clearDepth = 1.0;
        this._camera.clearStencil = 0.0;
        this._camera.clearFlag = this._clearFlag;
        this._camera.visibility = this._visibility;
        this._camera.aperture = CameraAperture.F16_0;
        this._camera.shutter = CameraShutter.D125;
        this._camera.iso = CameraISO.ISO100;
        return this._camera;
    }

    private _resetCameraParams (): void {
        this.camera.projectionType = CameraProjection.PERSPECTIVE;
        this.camera.orthoHeight = 10;
        this.camera.nearClip = 1;
        this.camera.farClip = 1000;
        this.camera.fov = toRadian(90);
        this.camera.priority = 0;
        this.camera.resize(this.resolution, this.resolution);

        this.camera.visibility = this._visibility;
        this.camera.clearFlag = this._clearFlag;
        this.camera.clearColor = this._backgroundColor;

        this.cameraNode.worldPosition = this.node.worldPosition;
        this.cameraNode.worldRotation = this.node.worldRotation;
        this.camera.update(true);
    }

    private _createTargetTexture (width: number, height: number): RenderTexture {
        const rt = new RenderTexture();
        rt.reset({ width, height });
        return rt;
    }

    private _transformReflectionCamera (sourceCamera: Camera): void {
        const offset = Vec3.dot(this.node.worldPosition, this.node.up);
        this._reflect(this._cameraWorldPos, sourceCamera.node.worldPosition, this.node.up, offset);
        this.cameraNode.worldPosition = this._cameraWorldPos;

        Vec3.transformQuat(this._forward, Vec3.FORWARD, sourceCamera.node.worldRotation);
        this._reflect(this._forward, this._forward, this.node.up, 0);
        this._forward.normalize();
        this._forward.negative();

        Vec3.transformQuat(this._up, Vec3.UP, sourceCamera.node.worldRotation);
        this._reflect(this._up, this._up, this.node.up, 0);
        this._up.normalize();

        Quat.fromViewUp(this._cameraWorldRotation, this._forward, this._up);

        this.cameraNode.worldRotation = this._cameraWorldRotation;

        this.camera.update(true);

        // Transform the plane from world space to reflection camera space use the inverse transpose matrix
        const viewSpaceProbe = new Vec4(this.node.up.x, this.node.up.y, this.node.up.z, -Vec3.dot(this.node.up, this.node.worldPosition));
        viewSpaceProbe.transformMat4(this.camera.matView.clone().invert().transpose());
        this.camera.calculateObliqueMat(viewSpaceProbe);
    }

    private _reflect (out: Vec3, point: Vec3, normal: Vec3, offset: number): Vec3 {
        const n = Vec3.clone(normal);
        n.normalize();
        const dist = Vec3.dot(n, point) - offset;
        n.multiplyScalar(2.0 * dist);
        Vec3.subtract(out, point, n);
        return out;
    }
}
