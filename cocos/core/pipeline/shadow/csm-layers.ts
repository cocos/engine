/*
 Copyright (c) 2020 Xiamen Yaji Software Co., Ltd.
 https://www.cocos.com/
 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
 worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
 not use Cocos Creator software for developing other software or tools that's
 used for developing games. You are not granted to publish, distribute,
 sublicense, and/or sell copies of Cocos Creator.
 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.
 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

import { DirectionalLight, Camera, Shadows, CSMLevel } from '../../renderer/scene';
import { Mat4, Vec3, Vec2, Quat } from '../../math';
import { Frustum, AABB } from '../../geometry';
import { IRenderObject } from '../define';
import { legacyCC } from '../../global-exports';
import { PipelineSceneData } from '../pipeline-scene-data';

const _mat4Trans = new Mat4();
const _matShadowTrans = new Mat4();
const _matShadowView = new Mat4();
const _matShadowProj = new Mat4();
const _matShadowViewProj = new Mat4();
const _matShadowViewProjArbitaryPos = new Mat4();
const _matShadowViewProjArbitaryPosInv = new Mat4();

const _focus = new Vec3(0, 0, 0);
const _projPos = new Vec3();
const _texelSize = new Vec2();
const _projSnap = new Vec3();
const _snap = new Vec3();
const _maxVec3 = new Vec3(10000000, 10000000, 10000000);
const _minVec3 = new Vec3(-10000000, -10000000, -10000000);
const _shadowPos = new Vec3();
const _bias = new Vec3();
const _scale = new Vec3();

export class ShadowTransformInfo {
    protected _shadowObjects: IRenderObject[] = [];

    protected _shadowCameraFar = 0;
    // Level is a vector, Indicates the location.
    protected _level: number;

    protected _matShadowView: Mat4 = new Mat4();
    protected _matShadowProj: Mat4 = new Mat4();
    protected _matShadowViewProj: Mat4 = new Mat4();

    protected _validFrustum: Frustum = new Frustum();

    // geometry renderer value
    protected _splitFrustum: Frustum = new Frustum();
    protected _lightViewFrustum: Frustum = new Frustum();
    protected _castLightViewBoundingBox: AABB = new AABB();

    constructor (level: number) {
        this._level = level;
        this._validFrustum.accurate = true;
        this._splitFrustum.accurate = true;
        this._lightViewFrustum.accurate = true;
    }

    get level () { return this._level; }

    get shadowObjects () {
        return this._shadowObjects;
    }

    get shadowCameraFar () {
        return this._shadowCameraFar;
    }
    set shadowCameraFar (val) {
        this._shadowCameraFar = val;
    }

    get matShadowView () {
        return this._matShadowView;
    }
    set matShadowView (val) {
        this._matShadowView = val;
    }

    get matShadowProj () {
        return this._matShadowProj;
    }
    set matShadowProj (val) {
        this._matShadowProj = val;
    }

    get matShadowViewProj () {
        return this._matShadowViewProj;
    }
    set matShadowViewProj (val) {
        this._matShadowViewProj = val;
    }

    get validFrustum () {
        return this._validFrustum;
    }
    set validFrustum (val) {
        this._validFrustum = val;
    }

    get splitFrustum () {
        return this._splitFrustum;
    }
    set splitFrustum (val) {
        this._splitFrustum = val;
    }
    get lightViewFrustum () {
        return this._lightViewFrustum;
    }
    set lightViewFrustum (val) {
        this._lightViewFrustum = val;
    }
    get castLightViewBoundingBox () {
        return this._castLightViewBoundingBox;
    }
    set castLightViewBoundingBox (val) {
        this._castLightViewBoundingBox = val;
    }

    public destroy () {
        this._shadowObjects.length = 0;
    }

    public createMatrix (splitFrustum: Frustum, dirLight: DirectionalLight,
        shadowMapWidth: number, onlyForCulling: boolean) {
        const device = legacyCC.director.root.device;
        const invisibleOcclusionRange = dirLight.shadowInvisibleOcclusionRange;
        Frustum.copy(this._lightViewFrustum, splitFrustum);

        // view matrix with range back
        Mat4.fromRT(_matShadowTrans, dirLight.node!.rotation, _focus);
        Mat4.invert(_matShadowView, _matShadowTrans);
        const shadowViewArbitaryPos = _matShadowView.clone();
        this._lightViewFrustum.transform(_matShadowView);

        // bounding box in light space
        AABB.fromPoints(this._castLightViewBoundingBox, _maxVec3, _minVec3);
        this._castLightViewBoundingBox.mergeFrustum(this._lightViewFrustum);
        let orthoSizeWidth;
        let orthoSizeHeight;
        if (dirLight.shadowCSMPerformanceMode) {
            orthoSizeWidth = this._castLightViewBoundingBox.halfExtents.x * 2.0;
            orthoSizeHeight = this._castLightViewBoundingBox.halfExtents.y * 2.0;
        } else {
            orthoSizeWidth = orthoSizeHeight = Vec3.distance(this._lightViewFrustum.vertices[0], this._lightViewFrustum.vertices[6]);
        }
        const r = this._castLightViewBoundingBox.halfExtents.z;
        this._shadowCameraFar = r * 2 + invisibleOcclusionRange;
        const center = this._castLightViewBoundingBox.center;
        _shadowPos.set(center.x, center.y, center.z + r + invisibleOcclusionRange);
        Vec3.transformMat4(_shadowPos, _shadowPos, _matShadowTrans);

        Mat4.fromRT(_matShadowTrans, dirLight.node!.rotation, _shadowPos);
        Mat4.invert(_matShadowView, _matShadowTrans);

        if (!onlyForCulling) {
            // snap to whole texels
            const halfOrthoSizeWidth = orthoSizeWidth * 0.5;
            const halfOrthoSizeHeight = orthoSizeHeight * 0.5;
            Mat4.ortho(_matShadowProj, -halfOrthoSizeWidth, halfOrthoSizeWidth, -halfOrthoSizeHeight, halfOrthoSizeHeight,
                0.1, this._shadowCameraFar, device.capabilities.clipSpaceMinZ, device.capabilities.clipSpaceSignY);

            Mat4.multiply(_matShadowViewProjArbitaryPos, _matShadowProj, shadowViewArbitaryPos);
            Vec3.transformMat4(_projPos, _shadowPos, _matShadowViewProjArbitaryPos);
            const invActualSize = 2.0 / shadowMapWidth;
            _texelSize.set(invActualSize, invActualSize);
            const modX = _projPos.x % _texelSize.x;
            const modY = _projPos.y % _texelSize.y;
            _projSnap.set(_projPos.x - modX, _projPos.y - modY, _projPos.z);
            Mat4.invert(_matShadowViewProjArbitaryPosInv, _matShadowViewProjArbitaryPos);
            Vec3.transformMat4(_snap, _projSnap, _matShadowViewProjArbitaryPosInv);

            Mat4.fromRT(_matShadowTrans, dirLight.node!.rotation, _snap);
            Mat4.invert(_matShadowView, _matShadowTrans);

            // fill data
            Mat4.multiply(_matShadowViewProj, _matShadowProj, _matShadowView);
            Mat4.copy(this._matShadowView, _matShadowView);
            Mat4.copy(this._matShadowProj, _matShadowProj);
            Mat4.copy(this._matShadowViewProj, _matShadowViewProj);
        }

        Frustum.createOrtho(this._validFrustum, orthoSizeWidth, orthoSizeHeight,
            0.1,  this._shadowCameraFar, _matShadowTrans);
    }
}
export class CSMLayerInfo extends ShadowTransformInfo {
    protected _splitCameraNear = 0;
    protected _splitCameraFar = 0;

    protected _matShadowAtlas: Mat4 = new Mat4();
    protected _matShadowViewProjAtlas: Mat4 = new Mat4();

    constructor (level: number) {
        super(level);
        this._calculateAtlas(level);
    }

    get splitCameraNear () {
        return this._splitCameraNear;
    }
    set splitCameraNear (val) {
        this._splitCameraNear = val;
    }

    get splitCameraFar () {
        return this._splitCameraFar;
    }
    set splitCameraFar (val) {
        this._splitCameraFar = val;
    }

    get matShadowAtlas () {
        return this._matShadowAtlas;
    }
    set matShadowViewAtlas (val) {
        this._matShadowAtlas = val;
    }

    get matShadowViewProjAtlas () {
        return this._matShadowViewProjAtlas;
    }
    set matShadowViewProjAtlas (val) {
        this._matShadowViewProjAtlas = val;
    }

    public destroy () {
        super.destroy();
    }

    private _calculateAtlas (level: number) {
        const clipSpaceSignY =  legacyCC.director.root.device.capabilities.clipSpaceSignY;
        const x = level % 2 - 0.5;
        const y = (0.5 - Math.floor(level / 2)) * clipSpaceSignY;
        _bias.set(x, y, 0);
        _scale.set(0.5, 0.5, 1);
        Mat4.fromRTS(this._matShadowAtlas, Quat.IDENTITY, _bias, _scale);
    }
}

/**
 * @en Shadow CSM layer manager
 * @zh CSM阴影图层管理
 */
export class CSMLayers {
    protected _castShadowObjects: IRenderObject[] = [];

    protected _layers: CSMLayerInfo[] = [];
    // LevelCount is a scalar, Indicates the number.
    protected _levelCount = 0;
    // The ShadowTransformInfo object for 'fixed area shadow' || 'maximum clipping info' || 'CSM layers = 1'.
    protected _specialLayer: ShadowTransformInfo = new ShadowTransformInfo(1);
    protected _shadowDistance = 0;

    get castShadowObjects () {
        return this._castShadowObjects;
    }

    get layers () {
        return this._layers;
    }

    get specialLayer () {
        return this._specialLayer;
    }

    public update (sceneData: PipelineSceneData, camera: Camera) {
        const scene = camera.scene!;
        const dirLight = scene.mainLight;
        if (dirLight === null) { return; }

        const shadowInfo = sceneData.shadows;
        const levelCount = dirLight.shadowCSMLevel;
        const shadowDistance = dirLight.shadowDistance;

        if (!shadowInfo.enabled || !dirLight.shadowEnabled) { return; }

        if (dirLight.shadowFixedArea) {
            this._updateFixedArea(dirLight);
        } else {
            let isRecalculate = false;
            for (let i = 0; i < levelCount; i++) {
                if (!this._layers[i] || this._layers[i].shadowCameraFar === undefined) {
                    this._layers[i] = new CSMLayerInfo(i);
                    isRecalculate = true;
                }
            }

            if (dirLight.shadowCSMValueDirty || this._levelCount !== levelCount
                || isRecalculate || this._shadowDistance !== shadowDistance) {
                this._splitFrustumLevels(dirLight);
                this._levelCount = levelCount;
                this._shadowDistance = shadowDistance;
            }

            this._calculateCSM(camera, dirLight, shadowInfo);
        }
    }

    public destroy () {
        this._castShadowObjects.length = 0;
        for (let i = 0; i < this._layers.length; i++) {
            this._layers[i].destroy();
        }
        this._layers.length = 0;
    }

    private _updateFixedArea (dirLight: DirectionalLight) {
        const device = legacyCC.director.root.device;
        const x = dirLight.shadowOrthoSize;
        const y = dirLight.shadowOrthoSize;
        const near = dirLight.shadowNear;
        const far = dirLight.shadowFar;
        Mat4.fromRT(_matShadowTrans, dirLight.node!.getWorldRotation(), dirLight.node!.getWorldPosition());
        Mat4.invert(_matShadowView, _matShadowTrans);
        Mat4.ortho(_matShadowProj, -x, x, -y, y, near, far,
            device.capabilities.clipSpaceMinZ, device.capabilities.clipSpaceSignY);
        Mat4.multiply(_matShadowViewProj, _matShadowProj, _matShadowView);
        this._specialLayer.matShadowView = _matShadowView;
        this._specialLayer.matShadowProj = _matShadowProj;
        this._specialLayer.matShadowViewProj = _matShadowViewProj;

        Frustum.createOrtho(this._specialLayer.validFrustum, x * 2.0, y * 2.0, near,  far, _matShadowTrans);
    }

    private _splitFrustumLevels (dirLight: DirectionalLight) {
        const nd = 0.1;
        const fd = dirLight.shadowDistance;
        const ratio = fd / nd;
        const level = dirLight.shadowCSMLevel;
        const lambda = dirLight.shadowCSMLambda;
        this._layers[0].splitCameraNear = nd;
        for (let i = 1; i < level; i++) {
            // i ÷ numbers of level
            const si = i / level;
            // eslint-disable-next-line no-restricted-properties
            const preNear = lambda * (nd * Math.pow(ratio, si)) + (1 - lambda) * (nd + (fd - nd) * si);
            // Slightly increase the overlap to avoid fracture
            const nextFar = preNear * 1.005;
            this._layers[i].splitCameraNear = preNear;
            this._layers[i - 1].splitCameraFar = nextFar;
        }
        // numbers of level - 1
        this._layers[level - 1].splitCameraFar = fd;

        dirLight.shadowCSMValueDirty = false;
    }

    private _calculateCSM (camera: Camera, dirLight: DirectionalLight, shadowInfo: Shadows) {
        const level = dirLight.shadowCSMLevel;
        const shadowMapWidth = level > 1 ? shadowInfo.size.x * 0.5 : shadowInfo.size.x;

        if (shadowMapWidth < 0.0) { return; }

        this._getCameraWorldMatrix(_mat4Trans, camera);
        for (let i = 0; i < level; i++) {
            const csmLayer = this._layers[i];
            const near = csmLayer.splitCameraNear;
            const far = csmLayer.splitCameraFar;
            Frustum.split(csmLayer.splitFrustum, camera, _mat4Trans, near, far);
            csmLayer.createMatrix(csmLayer.splitFrustum, dirLight, shadowMapWidth, false);

            Mat4.multiply(csmLayer.matShadowViewProjAtlas, csmLayer.matShadowAtlas, csmLayer.matShadowViewProj);
        }

        if (level === CSMLevel.level_1) {
            this._specialLayer.shadowCameraFar = this._layers[0].shadowCameraFar;
            Mat4.copy(this._specialLayer.matShadowView, this._layers[0].matShadowView);
            Mat4.copy(this._specialLayer.matShadowProj, this._layers[0].matShadowProj);
            Mat4.copy(this._specialLayer.matShadowViewProj, this._layers[0].matShadowViewProj);
            Frustum.copy(this._specialLayer.validFrustum, this._layers[0].validFrustum);
        } else {
            Frustum.split(this._specialLayer.splitFrustum, camera, _mat4Trans, 0.1, dirLight.shadowDistance);
            this._specialLayer.createMatrix(this._specialLayer.splitFrustum, dirLight, shadowMapWidth, true);
        }
    }

    private _getCameraWorldMatrix (out: Mat4, camera: Camera) {
        if (!camera.node) { return; }

        const cameraNode = camera.node;
        const position = cameraNode.getWorldPosition();
        const rotation = cameraNode.getWorldRotation();

        Mat4.fromRT(out, rotation, position);
        out.m08 *= -1.0;
        out.m09 *= -1.0;
        out.m10 *= -1.0;
    }
}
