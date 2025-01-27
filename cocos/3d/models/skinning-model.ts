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

import { Material } from '../../asset/assets/material';
import { RenderingSubMesh } from '../../asset/assets/rendering-sub-mesh';
import { Mesh } from '../assets/mesh';
import { Skeleton } from '../assets/skeleton';
import { geometry, Mat4, Vec3, warnID } from '../../core';
import { BufferUsageBit, MemoryUsageBit, DescriptorSet, Buffer, BufferInfo, Attribute, FormatFeatureBit, Format } from '../../gfx';
import { UBOSkinning, UNIFORM_REALTIME_JOINT_TEXTURE_BINDING } from '../../rendering/define';
import { Node } from '../../scene-graph/node';
import { ModelType } from '../../render-scene/scene/model';
import { uploadJointData } from '../skeletal-animation/skeletal-animation-utils';
import { MorphModel } from './morph-model';
import { deleteTransform, getTransform, getWorldMatrix, IJointTransform } from '../../animation/skeletal-animation-utils';
import { IMacroPatch, BatchingSchemes, Pass } from '../../render-scene';
import { director } from '../../game';
import { TextureFilter, PixelFormat, WrapMode } from '../../asset/assets/asset-enum';
import { Texture2D, ImageAsset } from '../../asset/assets';
import { SubModel } from '../../render-scene/scene';

const uniformPatches: IMacroPatch[] = [
    { name: 'CC_USE_SKINNING', value: true },
    { name: 'CC_USE_REAL_TIME_JOINT_TEXTURE', value: false },
];
const texturePatches: IMacroPatch[] = [
    { name: 'CC_USE_SKINNING', value: true },
    { name: 'CC_USE_REAL_TIME_JOINT_TEXTURE', value: true },
];

function getRelevantBuffers (outIndices: number[], outBuffers: number[], jointMaps: number[][], targetJoint: number): void {
    for (let i = 0; i < jointMaps.length; i++) {
        const idxMap = jointMaps[i];
        let index = -1;
        for (let j = 0; j < idxMap.length; j++) {
            if (idxMap[j] === targetJoint) { index = j; break; }
        }
        if (index >= 0) {
            outBuffers.push(i);
            outIndices.push(index);
        }
    }
}

interface IJointInfo {
    bound: geometry.AABB;
    target: Node;
    bindpose: Mat4;
    transform: IJointTransform;
    buffers: number[];
    indices: number[];
}

const v3_min = new Vec3();
const v3_max = new Vec3();
const v3_1 = new Vec3();
const v3_2 = new Vec3();
const m4_1 = new Mat4();
const ab_1 = new geometry.AABB();

class RealTimeJointTexture {
    public static readonly WIDTH = 256;
    public static readonly HEIGHT = 3;
    public _format = PixelFormat.RGBA32F; // default use float texture
    public _textures: Texture2D[] = [];
    public _buffers: Float32Array[] = [];
}

/**
 * @en
 * The skinning model that is using real-time pose calculation.
 * @zh
 * 实时计算动画的蒙皮模型。
 */
export class SkinningModel extends MorphModel {
    private _buffers: Buffer[] = [];
    private _dataArray: Float32Array[] = [];
    private _joints: IJointInfo[] = [];
    private _bufferIndices: number[] | null = null;
    private _realTimeJointTexture = new RealTimeJointTexture();
    private _realTimeTextureMode = false;
    constructor () {
        super();
        this.type = ModelType.SKINNING;
    }

    public destroy (): void {
        this.bindSkeleton();
        if (this._buffers.length) {
            for (let i = 0; i < this._buffers.length; i++) {
                this._buffers[i].destroy();
            }
            this._buffers.length = 0;
        }
        this._dataArray.length = 0;
        this._realTimeJointTexture._textures.forEach((tex) => {
            tex.destroy();
        });
        this._realTimeJointTexture._textures.length = 0;
        this._realTimeJointTexture._buffers.length = 0;
        super.destroy();
    }

    /**
     * @en Abstract function for [[BakedSkinningModel]], empty implementation.
     * @zh 由 [[BakedSkinningModel]] 继承的空函数。
     */
    public uploadAnimation (): void {}

    /**
     * @en Bind the skeleton with its skinning root node and the mesh data.
     * @zh 在模型中绑定一个骨骼，需要提供骨骼的蒙皮根节点和蒙皮网格数据。
     * @param skeleton @en The skeleton to be bound @zh 要绑定的骨骼
     * @param skinningRoot @en The skinning root of the skeleton @zh 骨骼的蒙皮根节点
     * @param mesh @en The mesh @zh 蒙皮网格
     * @returns void
     */
    public bindSkeleton (skeleton: Skeleton | null = null, skinningRoot: Node | null = null, mesh: Mesh | null = null): void {
        for (let i = 0; i < this._joints.length; i++) {
            deleteTransform(this._joints[i].target);
        }
        this._bufferIndices = null; this._joints.length = 0;
        if (!skeleton || !skinningRoot || !mesh) { return; }
        this._realTimeTextureMode = false;
        if (UBOSkinning.JOINT_UNIFORM_CAPACITY < skeleton.joints.length) { this._realTimeTextureMode = true; }
        this.transform = skinningRoot;
        const boneSpaceBounds = mesh.getBoneSpaceBounds(skeleton);
        const jointMaps = mesh.struct.jointMaps;
        this._ensureEnoughBuffers(jointMaps && jointMaps.length || 1);
        this._bufferIndices = mesh.jointBufferIndices;
        this._initRealTimeJointTexture();
        for (let index = 0; index < skeleton.joints.length; index++) {
            const bound = boneSpaceBounds[index];
            const target = skinningRoot.getChildByPath(skeleton.joints[index]);
            if (!bound || !target) { continue; }
            const transform = getTransform(target, skinningRoot)!;
            const bindpose = skeleton.bindposes[index];
            const indices: number[] = [];
            const buffers: number[] = [];
            if (!jointMaps) { indices.push(index); buffers.push(0); } else { getRelevantBuffers(indices, buffers, jointMaps, index); }
            this._joints.push({ indices, buffers, bound, target, bindpose, transform });
        }
    }

    /**
     * @en Update world transform and bounding boxes for the model
     * @zh 更新模型的世界矩阵和包围盒
     * @param stamp @en The update time stamp @zh 更新的时间戳
     */
    public updateTransform (stamp: number): void {
        const root = this.transform;
        if (root.hasChangedFlags || root.isTransformDirty()) {
            root.updateWorldTransform();
            this._localDataUpdated = true;
        }
        // update bounds
        Vec3.set(v3_min,  Infinity,  Infinity,  Infinity);
        Vec3.set(v3_max, -Infinity, -Infinity, -Infinity);
        for (let i = 0; i < this._joints.length; i++) {
            const { bound, transform } = this._joints[i];
            const worldMatrix = getWorldMatrix(transform, stamp);
            geometry.AABB.transform(ab_1, bound, worldMatrix);
            ab_1.getBoundary(v3_1, v3_2);
            Vec3.min(v3_min, v3_min, v3_1);
            Vec3.max(v3_max, v3_max, v3_2);
        }

        const worldBounds = this._worldBounds;
        if (this._modelBounds && worldBounds) {
            geometry.AABB.fromPoints(this._modelBounds, v3_min, v3_max);
            this._modelBounds.transform(root._mat, root._pos, root._rot, root._scale, this._worldBounds!);
        }
    }

    /**
     * @en Update uniform buffer objects for rendering.
     * @zh 更新用于渲染的 UBO
     * @param stamp @en The update time stamp @zh 更新的时间戳
     * @returns @en successful or not @zh 更新是否成功
     */
    public updateUBOs (stamp: number): boolean {
        super.updateUBOs(stamp);
        for (let i = 0; i < this._joints.length; i++) {
            const { indices, buffers, transform, bindpose } = this._joints[i];
            Mat4.multiply(m4_1, transform.world, bindpose);
            for (let b = 0; b < buffers.length; b++) {
                uploadJointData(this._dataArray[buffers[b]], indices[b] * 12, m4_1, i === 0);
            }
        }
        if (this._realTimeTextureMode) {
            this._updateRealTimeJointTextureBuffer();
        } else {
            for (let b = 0; b < this._buffers.length; b++) {
                this._buffers[b].update(this._dataArray[b]);
            }
        }
        return true;
    }

    /**
     * @en Initialize sub model with the sub mesh data and the material
     * @zh 用子网格数据和材质初始化一个子模型
     * @param idx @en The index of the sub model to be initialized @zh 需要初始化的子模型序号
     * @param subMeshData @en The sub mesh data @zh 子网格数据
     * @param mat @en The material @zh 子模型材质
     */
    public initSubModel (idx: number, subMeshData: RenderingSubMesh, mat: Material): void {
        const original = subMeshData.vertexBuffers;
        const iaInfo = subMeshData.iaInfo;
        iaInfo.vertexBuffers = subMeshData.jointMappedBuffers;
        super.initSubModel(idx, subMeshData, mat);
        iaInfo.vertexBuffers = original;
    }

    // override
    public getMacroPatches (subModelIndex: number): IMacroPatch[] | null {
        const superMacroPatches = super.getMacroPatches(subModelIndex);
        let myPatches = uniformPatches;
        if (this._realTimeTextureMode) {
            myPatches = texturePatches;
        }
        if (superMacroPatches) {
            return myPatches.concat(superMacroPatches);
        }
        return myPatches;
    }

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _updateLocalDescriptors (submodelIdx: number, descriptorSet: DescriptorSet): void {
        super._updateLocalDescriptors(submodelIdx, descriptorSet);
        const idx = this._bufferIndices![submodelIdx];
        if (this._realTimeTextureMode) {
            this._bindRealTimeJointTexture(idx, descriptorSet);
        } else {
            const buffer = this._buffers[idx];
            if (buffer) { descriptorSet.bindBuffer(UBOSkinning.BINDING, buffer); }
        }
    }

    protected _updateInstancedAttributes (attributes: Attribute[], subModel: SubModel): void {
        const pass = subModel.passes[0];
        if (pass.batchingScheme !== BatchingSchemes.NONE) {
            // TODO(holycanvas): #9203 better to print the complete path instead of only the current node
            warnID(3936, this.node.getPathInHierarchy());
        }
        super._updateInstancedAttributes(attributes, subModel);
    }

    private _ensureEnoughBuffers (count: number): void {
        if (this._buffers.length) {
            for (let i = 0; i < this._buffers.length; i++) {
                this._buffers[i].destroy();
            }
            this._buffers.length = 0;
        }

        if (this._dataArray.length) this._dataArray.length = 0;

        if (!this._realTimeTextureMode) {
            for (let i = 0; i < count; i++) {
                this._buffers[i] = this._device.createBuffer(new BufferInfo(
                    BufferUsageBit.UNIFORM | BufferUsageBit.TRANSFER_DST,
                    MemoryUsageBit.HOST | MemoryUsageBit.DEVICE,
                    UBOSkinning.SIZE,
                    UBOSkinning.SIZE,
                ));
                const maxJoints = UBOSkinning.JOINT_UNIFORM_CAPACITY;
                this._dataArray[i] = new Float32Array(12 * maxJoints);
            }
        } else {
            for (let i = 0; i < count; i++) {
                const maxJoints = RealTimeJointTexture.WIDTH;
                this._dataArray[i] = new Float32Array(12 * maxJoints);
            }
        }
    }

    private _initRealTimeJointTexture (): void {
        if (this._realTimeJointTexture._textures.length) {
            this._realTimeJointTexture._textures.forEach((tex) => {
                tex.destroy();
            });
            this._realTimeJointTexture._textures.length = 0;
        }
        this._realTimeJointTexture._buffers.length = 0;
        if (!this._realTimeTextureMode) return;

        const gfxDevice = director.root!.device;
        let width = RealTimeJointTexture.WIDTH;
        const height = RealTimeJointTexture.HEIGHT;
        const hasFeatureFloatTexture = gfxDevice.getFormatFeatures(Format.RGBA32F) & FormatFeatureBit.SAMPLED_TEXTURE;
        if (hasFeatureFloatTexture === 0) {
            this._realTimeJointTexture._format = PixelFormat.RGBA8888;
            width = 4 * RealTimeJointTexture.WIDTH;
        }

        const textures = this._realTimeJointTexture._textures;
        const buffers = this._realTimeJointTexture._buffers;
        const pixelFormat = this._realTimeJointTexture._format;
        for (let i = 0; i < this._dataArray.length; i++) {
            buffers[i] = new Float32Array(4 * RealTimeJointTexture.HEIGHT * RealTimeJointTexture.WIDTH);
            const arrayBuffer = buffers[i];
            const updateView =  pixelFormat === PixelFormat.RGBA32F ? arrayBuffer : new Uint8Array(arrayBuffer.buffer);
            const image = new ImageAsset({
                width,
                height,
                _data: updateView,
                _compressed: false,
                format: pixelFormat,
            });
            const texture = new Texture2D();
            texture.setFilters(TextureFilter.NEAREST, TextureFilter.NEAREST);
            texture.setMipFilter(TextureFilter.NONE);
            texture.setWrapMode(WrapMode.CLAMP_TO_EDGE, WrapMode.CLAMP_TO_EDGE, WrapMode.CLAMP_TO_EDGE);
            texture.image = image;
            textures[i] = texture;
        }
    }

    private _bindRealTimeJointTexture (idx: number, descriptorSet: DescriptorSet): void {
        if (!this._realTimeTextureMode) return;
        const jointTexture = this._realTimeJointTexture._textures[idx];
        if (jointTexture) {
            const gfxTexture = jointTexture.getGFXTexture();
            const sampler = jointTexture.getGFXSampler();
            descriptorSet.bindTexture(UNIFORM_REALTIME_JOINT_TEXTURE_BINDING, gfxTexture!);
            descriptorSet.bindSampler(UNIFORM_REALTIME_JOINT_TEXTURE_BINDING, sampler);
        }
    }

    private _updateRealTimeJointTextureBuffer (): void {
        if (!this._realTimeTextureMode) return;
        const textures = this._realTimeJointTexture._textures;
        const buffers = this._realTimeJointTexture._buffers;
        for (let idx = 0; idx < textures.length; idx++) {
            const arrayBuffer = buffers[idx];
            const src = this._dataArray[idx];
            const count = src.length / 12; // mat3x4
            let idxSrc = 0;
            let idxDst = 0;
            for (let i = 0; i < count; i++) {
                idxDst = 4 * i;
                arrayBuffer[idxDst++] = src[idxSrc++];
                arrayBuffer[idxDst++] = src[idxSrc++];
                arrayBuffer[idxDst++] = src[idxSrc++];
                arrayBuffer[idxDst++] = src[idxSrc++];
                idxDst = 4 * (i + RealTimeJointTexture.WIDTH);
                arrayBuffer[idxDst++] = src[idxSrc++];
                arrayBuffer[idxDst++] = src[idxSrc++];
                arrayBuffer[idxDst++] = src[idxSrc++];
                arrayBuffer[idxDst++] = src[idxSrc++];
                idxDst = 4 * (i + 2 * RealTimeJointTexture.WIDTH);
                arrayBuffer[idxDst++] = src[idxSrc++];
                arrayBuffer[idxDst++] = src[idxSrc++];
                arrayBuffer[idxDst++] = src[idxSrc++];
                arrayBuffer[idxDst++] = src[idxSrc++];
            }
            const pixelFormat = this._realTimeJointTexture._format;
            const updateView = pixelFormat === PixelFormat.RGBA32F ? arrayBuffer : new Uint8Array(arrayBuffer.buffer);
            textures[idx].uploadData(updateView);
        }
    }
}
