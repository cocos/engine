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
import { ccclass, executeInEditMode, help, menu, playOnFocus, serializable, tooltip, type, visible } from 'cc.decorator';
import { EDITOR, EDITOR_NOT_IN_PREVIEW } from 'internal:constants';
import { CCBoolean, CCObject, Color, Enum, Vec3, warn } from '../../core';

import { TextureCube } from '../../asset/assets';
import { scene } from '../../render-scene';
import { CAMERA_DEFAULT_MASK } from '../../rendering/define';
import { ReflectionProbeManager } from './reflection-probe-manager';
import { Component } from '../../scene-graph/component';
import { Layers } from '../../scene-graph/layers';
import { Camera } from '../../misc/camera-component';
import { Node, TransformBit } from '../../scene-graph';
import { ProbeClearFlag, ProbeType } from '../../render-scene/scene/reflection-probe';
import { absolute } from '../../physics/utils/util';

export enum ProbeResolution {
    /**
     * @zh 分辨率 256 * 256。
     * @en renderTexture resolution 256 * 256.
     * @readonly
     */
    Low_256x256 = 256,

    /**
      * @zh 分辨率 512 * 512。
      * @en renderTexture resolution 512 * 512.
      * @readonly
      */
    Medium_512x512 = 512,

    /**
      * @zh 分辨率 768 * 768
      * @en renderTexture resolution 768 * 768.
      * @readonly
      */
    High_768x768 = 768,
}
@ccclass('cc.ReflectionProbe')
@menu('Rendering/ReflectionProbe')
@executeInEditMode
@playOnFocus
@help('i18n:cc.ReflectionProbe')
export class ReflectionProbe extends Component {
    protected static readonly DEFAULT_CUBE_SIZE: Readonly<Vec3> =  new Vec3(1, 1, 1);
    protected static readonly DEFAULT_PLANER_SIZE: Readonly<Vec3> =  new Vec3(5, 0.5, 5);
    protected readonly _lastSize = new Vec3();
    @serializable
    protected _resolution = 256;
    @serializable
    protected _clearFlag = ProbeClearFlag.SKYBOX;

    @serializable
    protected _backgroundColor = new Color(0, 0, 0, 255);

    @serializable
    protected _visibility = CAMERA_DEFAULT_MASK;

    @serializable
    protected _probeType = ProbeType.CUBE;

    @serializable
    protected _cubemap: TextureCube | null = null;

    @serializable
    protected readonly _size = new Vec3(1, 1, 1);

    @serializable
    protected _sourceCamera: Camera | null = null;

    @serializable
    private _probeId = -1;

    @serializable
    private _fastBake = false;

    protected _probe: scene.ReflectionProbe | null = null;

    protected _previewSphere: Node | null = null;
    protected _previewPlane: Node | null = null;

    private _sourceCameraPos = new Vec3(0, 0, 0);

    private _position = new Vec3(0, 0, 0);

    constructor () {
        super();
    }

    /**
     * @en
     * Gets or sets the size of the box
     * @zh
     * 获取或设置包围盒的大小。
     */
    set size (value: Vec3) {
        this._size.set(value);
        absolute(this._size);
        this.probe.size = this._size;
        if (this.probe) {
            this.probe.updateBoundingBox();
            ReflectionProbeManager.probeManager.onUpdateProbes();
            ReflectionProbeManager.probeManager.updateProbeData();
            ReflectionProbeManager.probeManager.updateProbeOfModels();
        }
    }
    @type(Vec3)
    get size (): Vec3 {
        return this._size;
    }

    /**
     * @en Environment reflection or plane reflection.
     * @zh 设置探针类型，环境反射或者平面反射
     */
    @type(Enum(ProbeType))
    set probeType (value: ProbeType) {
        this.probe.probeType = value;
        if (value !== this._probeType) {
            const lastSize = this._size.clone();
            const lastSizeIsNoExist = Vec3.equals(this._lastSize, Vec3.ZERO);
            this._probeType = value;

            if (this._probeType === ProbeType.CUBE) {
                if (lastSizeIsNoExist) {
                    this._size.set(ReflectionProbe.DEFAULT_CUBE_SIZE);
                }
                this.probe.switchProbeType(value, null);
                if (EDITOR) {
                    this._objFlags |= CCObject.Flags.IsRotationLocked;
                }
                ReflectionProbeManager.probeManager.clearPlanarReflectionMap(this.probe);
            } else {
                if (lastSizeIsNoExist) {
                    this._size.set(ReflectionProbe.DEFAULT_PLANER_SIZE);
                }
                if (EDITOR && this._objFlags & CCObject.Flags.IsRotationLocked) {
                    this._objFlags ^= CCObject.Flags.IsRotationLocked;
                }
                if (!this._sourceCamera) {
                    warn('the reflection camera is invalid, please set the reflection camera');
                } else {
                    this.probe.switchProbeType(value, this._sourceCamera.camera);
                }
            }
            if (!lastSizeIsNoExist) {
                this._size.set(this._lastSize);
            }
            this._lastSize.set(lastSize);
            this.size = this._size;
        }
    }
    get probeType (): ProbeType {
        return this._probeType;
    }

    /**
     * @en set render texture size
     * @zh 设置渲染纹理大小
     */
    @visible(function (this: ReflectionProbe) { return this.probeType === ProbeType.CUBE; })
    @type(Enum(ProbeResolution))
    set resolution (value: number) {
        this._resolution = value;
        this.probe.resolution = value;
    }

    get resolution (): number {
        return this._resolution;
    }

    /**
     * @en Clearing flags of the camera, specifies which part of the framebuffer will be actually cleared every frame.
     * @zh 相机的缓冲清除标志位，指定帧缓冲的哪部分要每帧清除。
     */
    @type(Enum(ProbeClearFlag))
    @visible(function (this: ReflectionProbe) { return this.probeType === ProbeType.CUBE; })
    set clearFlag (value: number) {
        this._clearFlag = value;
        this.probe.clearFlag = this._clearFlag;
    }
    get clearFlag (): number {
        return this._clearFlag;
    }

    /**
     * @en Clearing color of the camera.
     * @zh 相机的颜色缓冲默认值。
     */
    @visible(function (this: ReflectionProbe) { return this._clearFlag === ProbeClearFlag.SOLID_COLOR && this.probeType === ProbeType.CUBE; })
    @type(Color)
    set backgroundColor (val: Color) {
        this._backgroundColor = val;
        this.probe.backgroundColor = this._backgroundColor;
    }
    get backgroundColor (): Color {
        return this._backgroundColor;
    }

    /**
     * @en Visibility mask, declaring a set of node layers that will be visible to this camera.
     * @zh 可见性掩码，声明在当前相机中可见的节点层级集合。
     */
    @type(Layers.BitMask)
    @tooltip('i18n:camera.visibility')
    get visibility (): number {
        return this._visibility;
    }
    set visibility (val) {
        this._visibility = val;
        this.probe.visibility = this._visibility;
    }

    /**
     * @en The camera to render planar reflections, specified by the user
     * @zh 需要渲染平面反射的相机，由用户指定
     */
    @visible(function (this: ReflectionProbe) { return this.probeType === ProbeType.PLANAR; })
    @type(Camera)
    set sourceCamera (camera: Camera) {
        this._sourceCamera = camera;
        if (camera) {
            this.visibility = camera.visibility;
            this.clearFlag = camera.clearFlags;
            this.backgroundColor = camera.clearColor as Color;
            if (this.probeType === ProbeType.PLANAR) {
                this.probe.switchProbeType(this.probeType, camera.camera);
            }
        }
    }
    get sourceCamera (): Camera {
        return this._sourceCamera!;
    }

    /**
     * @en fast bake no convolution.
     * @zh 快速烘焙不会进行卷积。
     */
    @visible(function (this: ReflectionProbe) { return this.probeType === ProbeType.CUBE; })
    @type(CCBoolean)
    @tooltip('i18n:reflection_probe.fastBake')
    get fastBake (): boolean {
        return this._fastBake;
    }

    set fastBake (val) {
        this._fastBake = val;
    }

    set cubemap (val: TextureCube | null) {
        this._cubemap = val;
        this.probe.cubemap = val;
        ReflectionProbeManager.probeManager.onUpdateProbes();
    }
    @type(TextureCube)
    @visible(false)
    get cubemap (): TextureCube | null {
        return this._cubemap;
    }

    get probe (): scene.ReflectionProbe {
        return this._probe!;
    }

    /**
     * @en Reflection probe cube mode preview sphere
     * @zh 反射探针cube模式的预览小球
     */
    set previewSphere (val: Node | null) {
        this._previewSphere = val;
        if (this.probe) {
            this.probe.previewSphere = val;
            if (this._previewSphere) {
                ReflectionProbeManager.probeManager.updatePreviewSphere(this.probe);
            }
        }
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
        if (this.probe) {
            this.probe.previewPlane = val;
            if (this._previewPlane) {
                ReflectionProbeManager.probeManager.updatePreviewPlane(this.probe);
            }
        }
    }

    get previewPlane (): Node {
        return this._previewPlane!;
    }

    public onLoad (): void {
        this._createProbe();
        if (EDITOR) {
            ReflectionProbeManager.probeManager.registerEvent();
        }
    }

    onEnable (): void {
        if (this._probe) {
            const probe = ReflectionProbeManager.probeManager.getProbeById(this._probeId);
            if (probe !== null && probe !== this._probe) {
                this._probeId = ReflectionProbeManager.probeManager.getNewReflectionProbeId();
                this._probe.updateProbeId(this._probeId);
            }
            ReflectionProbeManager.probeManager.register(this._probe);
            ReflectionProbeManager.probeManager.onUpdateProbes();
            this._probe.enable();
        }
    }
    onDisable (): void {
        if (this._probe) {
            ReflectionProbeManager.probeManager.unregister(this._probe);
            this._probe.disable();
        }
    }

    public start (): void {
        if (this._sourceCamera && this.probeType === ProbeType.PLANAR) {
            this.probe.renderPlanarReflection(this.sourceCamera.camera);
            ReflectionProbeManager.probeManager.filterModelsForPlanarReflection();
        }
        ReflectionProbeManager.probeManager.updateProbeData();
        this._position = this.node.getWorldPosition().clone();
    }

    public onDestroy (): void {
        if (this.probe) {
            this.probe.destroy();
        }
    }

    public update (dt: number): void {
        if (!this.probe) return;
        if (EDITOR_NOT_IN_PREVIEW) {
            if (this.probeType === ProbeType.PLANAR) {
                const cameraLst: scene.Camera[] | undefined = this.node.scene.renderScene?.cameras;
                if (cameraLst !== undefined) {
                    for (let i = 0; i < cameraLst.length; ++i) {
                        const camera: scene.Camera = cameraLst[i];
                        if (camera.name === 'Editor Camera') {
                            this.probe.renderPlanarReflection(camera);
                            break;
                        }
                    }
                }
            }
        }
        if (this.probeType === ProbeType.PLANAR && this.sourceCamera) {
            if ((this.sourceCamera.node.hasChangedFlags & TransformBit.TRS)
            || !this._sourceCameraPos.equals(this.sourceCamera.node.getWorldPosition())) {
                this._sourceCameraPos = this.sourceCamera.node.getWorldPosition();
                this.probe.renderPlanarReflection(this.sourceCamera.camera);
            }
        }

        if (this.node.hasChangedFlags & TransformBit.POSITION) {
            this.probe.updateBoundingBox();
            ReflectionProbeManager.probeManager.onUpdateProbes();
            ReflectionProbeManager.probeManager.updateProbeData();
        }

        //update probe info for realtime
        if (!EDITOR) {
            const worldPos = this.node.getWorldPosition();
            if (!this._position.equals(worldPos)) {
                this._position = worldPos;
                this.probe.updateBoundingBox();
                ReflectionProbeManager.probeManager.updateProbeData();
                ReflectionProbeManager.probeManager.updateProbeOfModels();
            }
        }
    }

    /**
     * @en Clear the baked cubemap.
     * @zh 清除烘焙的cubemap
     */
    public clearBakedCubemap (): void {
        this.cubemap = null;
        ReflectionProbeManager.probeManager.updateBakedCubemap(this.probe);
        ReflectionProbeManager.probeManager.updatePreviewSphere(this.probe);
    }

    private _createProbe (): void {
        if (this._probeId === -1 || ReflectionProbeManager.probeManager.exists(this._probeId)) {
            this._probeId = ReflectionProbeManager.probeManager.getNewReflectionProbeId();
        }
        this._probe = new scene.ReflectionProbe(this._probeId);
        if (this._probe) {
            const cameraNode = new Node('ReflectionProbeCamera');
            cameraNode.hideFlags |= CCObject.Flags.DontSave | CCObject.Flags.HideInHierarchy;
            this.node.scene.addChild(cameraNode);

            this._probe.initialize(this.node, cameraNode);
            if (this.enabled) {
                ReflectionProbeManager.probeManager.register(this._probe);
            }
            this._probe.resolution = this._resolution;
            this._probe.clearFlag = this._clearFlag;
            this._probe.backgroundColor = this._backgroundColor;
            this._probe.visibility = this._visibility;
            this._probe.probeType = this._probeType;
            this._probe.size = this._size;
            this._probe.cubemap = this._cubemap!;
        }
    }
}
