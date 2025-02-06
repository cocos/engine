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

import { ccclass, serializable } from 'cc.decorator';
import { EDITOR } from 'internal:constants';
import { Asset } from '../../asset/assets/asset';
import { IDynamicGeometry } from '../../primitive/define';
import { BufferBlob } from '../misc/buffer-blob';
import { Skeleton } from './skeleton';
import { geometry, cclegacy, sys, warnID, Mat4, Quat, Vec3, assertIsTrue, murmurhash2_32_gc, errorID, halfToFloat, v3 } from '../../core';
import { RenderingSubMesh } from '../../asset/assets';
import {
    Attribute, Device, Buffer, BufferInfo, AttributeName, BufferUsageBit, Feature, Format,
    FormatInfos, FormatType, MemoryUsageBit, PrimitiveMode, getTypedArrayConstructor, DrawInfo, FormatInfo, deviceManager, FormatFeatureBit,
} from '../../gfx';
import { Morph } from './morph';
import { MorphRendering, createMorphRendering } from './morph-rendering';
import { MeshoptDecoder } from '../misc/mesh-codec';
import zlib  from '../../../external/compression/zlib.min';

const vec3Add = Vec3.add;
const vec3MultiplyScalar = Vec3.multiplyScalar;
const vec3Subtract = Vec3.subtract;
const aabbTransform = geometry.AABB.transform;
const aabbFromPoints = geometry.AABB.fromPoints;
const vec3Max = Vec3.max;
const vec3Min = Vec3.min;
const vec3TransformQuat = Vec3.transformQuat;
const vec3TransformMat4 = Vec3.transformMat4;

function getIndexStrideCtor (stride: number): Uint8ArrayConstructor | Uint16ArrayConstructor | Uint32ArrayConstructor {
    switch (stride) {
    case 1: return Uint8Array;
    case 2: return Uint16Array;
    case 4: return Uint32Array;
    default: return Uint8Array;
    }
}

export declare namespace Mesh {
    export interface IBufferView {
        offset: number;
        length: number;
        count: number;
        stride: number;
    }

    /**
     * @en Vertex bundle, it describes a set of interleaved vertex attributes and their values.
     * @zh 顶点块。顶点块描述了一组**交错排列**（interleaved）的顶点属性并存储了顶点属性的实际数据。<br>
     * 交错排列是指在实际数据的缓冲区中，每个顶点的所有属性总是依次排列，并总是出现在下一个顶点的所有属性之前。
     */
    export interface IVertexBundle {
        /**
         * @en The actual value for all vertex attributes.
         * You must use DataView to access the data.
         * Because there is no guarantee that the starting offsets of all properties are byte aligned as required by TypedArray.
         * @zh 所有顶点属性的实际数据块。
         * 你必须使用 DataView 来读取数据。
         * 因为不能保证所有属性的起始偏移都按 TypedArray 要求的字节对齐。
         */
        view: IBufferView;

        /**
         * @en All attributes included in the bundle
         * @zh 包含的所有顶点属性。
         */
        attributes: Attribute[];
    }

    export interface IMeshCluster {
        clusterView: IBufferView;
        triangleView: IBufferView;
        vertexView: IBufferView;
        coneView?: IBufferView;
    }

    /**
     * @en Sub mesh contains a list of primitives with the same type (Point, Line or Triangle)
     * @zh 子网格。子网格由一系列相同类型的图元组成（例如点、线、面等）。
     */
    export interface ISubMesh {
        /**
         * @en The vertex bundle references used by the sub mesh.
         * @zh 此子网格引用的顶点块，索引至网格的顶点块数组。
         */
        vertexBundelIndices: number[];

        /**
         * @en The primitive mode of the sub mesh
         * @zh 此子网格的图元类型。
         */
        primitiveMode: PrimitiveMode;

        /**
         * @en The index data of the sub mesh
         * @zh 此子网格使用的索引数据。
         */
        indexView?: IBufferView;

        /**
         * @en The joint map index in [[IStruct.jointMaps]]. Could be absent
         * @zh 此子网格使用的关节索引映射表在 [[IStruct.jointMaps]] 中的索引。
         * 如未定义或指向的映射表不存在，则默认 VB 内所有关节索引数据直接对应骨骼资源数据。
         */
        jointMapIndex?: number;

        /**
         * @en The cluster data of the sub mesh
         */
        cluster?: IMeshCluster;
    }

    /**
     * @en dynamic info used to create dyanmic mesh
     * @zh 动态信息，用于创建动态网格
     */
    export interface IDynamicInfo {
        /**
         * @en max submesh count
         * @zh 最大子模型个数。
         */
        maxSubMeshes: number;

        /**
          * @en max submesh vertex count
          * @zh 子模型最大顶点个数。
          */
        maxSubMeshVertices: number;

        /**
          * @en max submesh index count
          * @zh 子模型最大索引个数。
          */
        maxSubMeshIndices: number;
    }

    /**
     * @en dynamic struct
     * @zh 动态结构体
     */
    export interface IDynamicStruct {
        /**
          * @en dynamic mesh info
          * @zh 动态模型信息。
          */
        info: IDynamicInfo;

        /**
          * @en dynamic submesh bounds
          * @zh 动态子模型包围盒。
          */
        bounds: geometry.AABB[];
    }

    /**
     * @en The structure of the mesh
     * @zh 描述了网格的结构。
     */
    export interface IStruct {
        /**
         * @en All vertex bundles of the mesh
         * @zh 此网格所有的顶点块。
         */
        vertexBundles: IVertexBundle[];

        /**
         * @en All sub meshes
         * @zh 此网格的所有子网格。
         */
        primitives: ISubMesh[];

        /**
         * @en The minimum position of all vertices in the mesh
         * @zh （各分量都）小于等于此网格任何顶点位置的最大位置。
         */
        minPosition?: Vec3;

        /**
         * @en The maximum position of all vertices in the mesh
         * @zh （各分量都）大于等于此网格任何顶点位置的最小位置。
         */
        maxPosition?: Vec3;

        /**
         * @en The joint index map list.
         * @zh 此网格使用的关节索引映射关系列表，数组长度应为子模型中实际使用到的所有关节，
         * 每个元素都对应一个原骨骼资源里的索引，按子模型 VB 内的实际索引排列。
         */
        jointMaps?: number[][];

        /**
         * @en The morph information of the mesh
         * @zh 网格的形变数据
         */
        morph?: Morph;

        /**
         * @en The specific data of the dynamic mesh
         * @zh 动态网格特有数据
         */
        dynamic?: IDynamicStruct;

        /**
         * @en Whether the mesh data is quantized to reduce memory usage
         * @zh 此网格数据是否经过量化以减少内存占用。
         */
        quantized?: boolean;

        /**
         * @en Whether the mesh data is encoded to reduce memory usage
         * @zh
         */
        encoded?: boolean;

        /**
         * @en Whether the mesh data is compressed to reduce memory usage
         * @zh 此网格数据是否经过压缩以减少内存占用。
         */
        compressed?: boolean;

        /**
         * @en Whether the mesh contains cluster data
         * @zh 此网格是否包含 cluster 数据。
         */
        cluster?: boolean;
    }

    /**
     * @en The create info of the mesh
     * @zh 网格创建信息
     */
    export interface ICreateInfo {
        /**
         * @en Mesh structure
         * @zh 网格结构。
         */
        struct: Mesh.IStruct;

        /**
         * @en Mesh binary data
         * @zh 网格二进制数据。
         */
        data: Uint8Array;
    }
}

const v3_1 = new Vec3();
const v3_2 = new Vec3();
const globalEmptyMeshBuffer = new Uint8Array();

/**
 * @en A representation of a mesh asset
 * A mesh can contain multiple sub-mesh resources. The mesh mainly provides data such as vertices and indices for model instances.
 * @zh 代表一个网格资源
 * 一个网格可包含多个子网格资源，网格主要为模型实例提供顶点，索引等数据
 */
@ccclass('cc.Mesh')
export class Mesh extends Asset {
    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    get _nativeAsset (): ArrayBuffer {
        return this._data.buffer;
    }
    set _nativeAsset (value: ArrayBuffer) {
        this._data = new Uint8Array(value);
    }

    /**
     * @en The sub meshes count of the mesh.
     * @zh 此网格的子网格数量。
     * @deprecated Please use [[renderingSubMeshes.length]] instead
     */
    get subMeshCount (): number {
        const renderingMesh = this.renderingSubMeshes;
        return renderingMesh ? renderingMesh.length : 0;
    }

    /**
     * @en The minimum position of all vertices in the mesh
     * @zh （各分量都）小于等于此网格任何顶点位置的最大位置。
     * @deprecated Please use [[struct.minPosition]] instead
     */
    get minPosition (): Readonly<Vec3> | undefined {
        return this.struct.minPosition;
    }

    /**
     * @en The maximum position of all vertices in the mesh
     * @zh （各分量都）大于等于此网格任何顶点位置的最大位置。
     * @deprecated Please use [[struct.maxPosition]] instead
     */
    get maxPosition (): Readonly<Vec3> | undefined {
        return this.struct.maxPosition;
    }

    /**
     * @en The struct of the mesh
     * @zh 此网格的结构。
     */
    get struct (): Mesh.IStruct {
        return this._struct;
    }

    /**
     * @en The actual data of the mesh
     * @zh 此网格的数据。
     */
    get data (): Uint8Array {
        return this._data;
    }

    /**
     * @en The hash of the mesh
     * @zh 此网格的哈希值。
     */
    get hash (): number {
    // hashes should already be computed offline, but if not, make one
        if (!this._hash) { this._hash = murmurhash2_32_gc(this._data, 666); }
        return this._hash;
    }

    /**
     * @en The index of the joint buffer of all sub meshes in the joint map buffers
     * @zh 所有子网格的关节索引集合
     */
    get jointBufferIndices (): number[] {
        if (this._jointBufferIndices) { return this._jointBufferIndices; }
        return this._jointBufferIndices = this._struct.primitives.map((p) => p.jointMapIndex || 0);
    }

    /**
     * @en The sub meshes for rendering. Mesh could be split into different sub meshes for rendering.
     * @zh 此网格创建的渲染网格。
     */
    public get renderingSubMeshes (): RenderingSubMesh[] {
        this.initialize();
        return this._renderingSubMeshes!;
    }

    /**
     * @en morph rendering data
     * @zh 变形渲染数据
     */
    public morphRendering: MorphRendering | null = null;

    @serializable
    private _struct: Mesh.IStruct = {
        vertexBundles: [],
        primitives: [],
    };

    @serializable
    private _hash = 0;

    private _data: Uint8Array = globalEmptyMeshBuffer;

    private _initialized = false;

    @serializable
    private _allowDataAccess = true;

    private _isMeshDataUploaded = false;

    private _renderingSubMeshes: RenderingSubMesh[] | null = null;

    private _boneSpaceBounds: Map<number, (geometry.AABB | null)[]> = new Map();

    private _jointBufferIndices: number[] | null = null;

    constructor (name?: string) {
        super(name);
    }

    /**
     * @en complete loading callback
     * @zh 加载完成回调
     */
    public onLoaded (): void {
        this.initialize();
    }

    /**
     * @en mesh init
     * @zh 网格初始化函数
     */
    public initialize (): void {
        if (this._initialized) {
            return;
        }
        this._initialized = true;

        let info = { struct: this.struct, data: this.data };
        if (info.struct.compressed) { // decompress mesh data
            info = inflateMesh(info);
        }
        if (this.struct.encoded) { // decode mesh data
            info = decodeMesh(info);
        }
        if (this.struct.quantized
            && !(deviceManager.gfxDevice.getFormatFeatures(Format.RGB16F) & FormatFeatureBit.VERTEX_ATTRIBUTE)) {
            // dequantize mesh data
            info = dequantizeMesh(info);
        }

        this._struct = info.struct;
        this._data = info.data;

        if (this._struct.dynamic) {
            const device: Device = deviceManager.gfxDevice;
            const vertexBuffers: Buffer[] = [];
            const subMeshes: RenderingSubMesh[] = [];

            for (let i = 0; i < this._struct.vertexBundles.length; i++) {
                const vertexBundle = this._struct.vertexBundles[i];
                const vertexBuffer = device.createBuffer(new BufferInfo(
                    BufferUsageBit.VERTEX | BufferUsageBit.TRANSFER_DST,
                    MemoryUsageBit.DEVICE,
                    vertexBundle.view.length,
                    vertexBundle.view.stride,
                ));

                vertexBuffers.push(vertexBuffer);
            }

            for (let i = 0; i < this._struct.primitives.length; i++) {
                const primitive = this._struct.primitives[i];
                const indexView = primitive.indexView;
                let indexBuffer: Buffer | null = null;

                if (indexView) {
                    indexBuffer = device.createBuffer(new BufferInfo(
                        BufferUsageBit.INDEX | BufferUsageBit.TRANSFER_DST,
                        MemoryUsageBit.DEVICE,
                        indexView.length,
                        indexView.stride,
                    ));
                }

                const subVBs: Buffer[] = [];
                for (let k = 0; k < primitive.vertexBundelIndices.length; k++) {
                    const idx = primitive.vertexBundelIndices[k];
                    subVBs.push(vertexBuffers[idx]);
                }

                const allAttributes: Attribute[] = [];
                for (let k = 0; k < primitive.vertexBundelIndices.length; k++) {
                    const idx = primitive.vertexBundelIndices[k];
                    const attributes = this._struct.vertexBundles[idx].attributes;
                    for (let j = 0; j < attributes.length; j++) {
                        const attr = attributes[j];
                        const attribute = new Attribute();
                        attribute.copy(attr);
                        allAttributes.push(attribute);
                    }
                }

                const subMesh = new RenderingSubMesh(subVBs, allAttributes, primitive.primitiveMode, indexBuffer);
                subMesh.drawInfo = new DrawInfo();
                subMesh.mesh = this;
                subMesh.subMeshIdx = i;

                subMeshes.push(subMesh);
            }

            this._renderingSubMeshes = subMeshes;
        } else {
            const { buffer } = this._data;
            const gfxDevice: Device = deviceManager.gfxDevice;
            const vertexBuffers = this._createVertexBuffers(gfxDevice, buffer);
            const indexBuffers: Buffer[] = [];
            const subMeshes: RenderingSubMesh[] = [];

            for (let i = 0; i < this._struct.primitives.length; i++) {
                const prim = this._struct.primitives[i];
                if (prim.vertexBundelIndices.length === 0) {
                    continue;
                }

                let indexBuffer: Buffer | null = null;
                let ib: Uint8Array | Uint16Array | Uint32Array | undefined;
                if (prim.indexView) {
                    const idxView = prim.indexView;

                    let dstStride = idxView.stride;
                    let dstSize = idxView.length;
                    if (dstStride === 4 && !gfxDevice.hasFeature(Feature.ELEMENT_INDEX_UINT)) {
                        const vertexCount = this._struct.vertexBundles[prim.vertexBundelIndices[0]].view.count;
                        if (vertexCount >= 65536) {
                            warnID(10001, vertexCount, 65536);
                            continue; // Ignore this primitive
                        } else {
                            dstStride >>= 1; // Reduce to short.
                            dstSize >>= 1;
                        }
                    }

                    indexBuffer = gfxDevice.createBuffer(new BufferInfo(
                        BufferUsageBit.INDEX,
                        MemoryUsageBit.DEVICE,
                        dstSize,
                        dstStride,
                    ));
                    indexBuffers.push(indexBuffer);

                    ib = new (getIndexStrideCtor(idxView.stride))(buffer, idxView.offset, idxView.count);
                    if (idxView.stride !== dstStride) {
                        ib = getIndexStrideCtor(dstStride).from(ib);
                    }
                    indexBuffer.update(ib);
                }

                const vbReference = prim.vertexBundelIndices.map((idx) => vertexBuffers[idx]);

                const gfxAttributes: Attribute[] = [];
                if (prim.vertexBundelIndices.length > 0) {
                    const idx = prim.vertexBundelIndices[0];
                    const vertexBundle = this._struct.vertexBundles[idx];
                    const attrs = vertexBundle.attributes;
                    for (let j = 0; j < attrs.length; ++j) {
                        const attr = attrs[j];
                        gfxAttributes[j] = new Attribute(attr.name, attr.format, attr.isNormalized, attr.stream, attr.isInstanced, attr.location);
                    }
                }

                const subMesh = new RenderingSubMesh(vbReference, gfxAttributes, prim.primitiveMode, indexBuffer);
                subMesh.mesh = this; subMesh.subMeshIdx = i;

                subMeshes.push(subMesh);
            }

            this._renderingSubMeshes = subMeshes;

            if (this._struct.morph) {
                this.morphRendering = createMorphRendering(this, gfxDevice);
            }

            this._isMeshDataUploaded = true;
            if (!this._allowDataAccess && !EDITOR) {
                this.releaseData();
            }
        }
    }

    /**
     * @en update dynamic sub mesh geometry
     * @zh 更新动态子网格的几何数据
     * @param primitiveIndex @en sub mesh index @zh 子网格索引
     * @param dynamicGeometry @en sub mesh geometry data @zh 子网格几何数据
     */
    public updateSubMesh (primitiveIndex: number, dynamicGeometry: IDynamicGeometry): void {
        if (!this._struct.dynamic) {
            warnID(14200);
            return;
        }

        if (primitiveIndex >= this._struct.primitives.length) {
            warnID(14201);
            return;
        }

        const buffers: Float32Array[] = [];
        if (dynamicGeometry.positions.length > 0) {
            buffers.push(dynamicGeometry.positions);
        }

        if (dynamicGeometry.normals && dynamicGeometry.normals.length > 0) {
            buffers.push(dynamicGeometry.normals);
        }

        if (dynamicGeometry.uvs && dynamicGeometry.uvs.length > 0) {
            buffers.push(dynamicGeometry.uvs);
        }

        if (dynamicGeometry.tangents && dynamicGeometry.tangents.length > 0) {
            buffers.push(dynamicGeometry.tangents);
        }

        if (dynamicGeometry.colors && dynamicGeometry.colors.length > 0) {
            buffers.push(dynamicGeometry.colors);
        }

        if (dynamicGeometry.customAttributes) {
            for (let k = 0; k < dynamicGeometry.customAttributes.length; k++) {
                buffers.push(dynamicGeometry.customAttributes[k].values);
            }
        }

        const dynamic = this._struct.dynamic;
        const info = dynamic.info;
        const primitive = this._struct.primitives[primitiveIndex];
        const subMesh = this._renderingSubMeshes![primitiveIndex];
        const drawInfo = subMesh.drawInfo!;

        // update _data & buffer
        for (let index = 0; index < buffers.length; index++) {
            const vertices = buffers[index];
            const bundle = this._struct.vertexBundles[primitive.vertexBundelIndices[index]];
            const stride = bundle.view.stride;
            const vertexCount = vertices.byteLength / stride;
            const updateSize  = vertices.byteLength;
            const dstBuffer   = new Uint8Array(this._data.buffer, bundle.view.offset, updateSize);
            const srcBuffer    = new Uint8Array(vertices.buffer, vertices.byteOffset, updateSize);
            const vertexBuffer = subMesh.vertexBuffers[index];
            assertIsTrue(vertexCount <= info.maxSubMeshVertices, 'Too many vertices.');

            if (updateSize > 0) {
                dstBuffer.set(srcBuffer);
                vertexBuffer.update(srcBuffer, updateSize);
            }

            bundle.view.count = vertexCount;
            drawInfo.vertexCount = vertexCount;
        }

        if (primitive.indexView) {
            const indexView = primitive.indexView;
            const stride       = indexView.stride;
            const indexCount   = (stride === 2) ? dynamicGeometry.indices16!.length : dynamicGeometry.indices32!.length;
            const updateSize   = indexCount * stride;
            const dstBuffer   = new Uint8Array(this._data.buffer, indexView.offset, updateSize);
            const srcBuffer    = (stride === 2) ? new Uint8Array(dynamicGeometry.indices16!.buffer, dynamicGeometry.indices16!.byteOffset, updateSize)
                : new Uint8Array(dynamicGeometry.indices32!.buffer, dynamicGeometry.indices32!.byteOffset, updateSize);
            const indexBuffer  = subMesh.indexBuffer!;
            assertIsTrue(indexCount <= info.maxSubMeshIndices, 'Too many indices.');

            if (updateSize > 0) {
                dstBuffer.set(srcBuffer);
                indexBuffer.update(srcBuffer, updateSize);
            }

            indexView.count     = indexCount;
            drawInfo.indexCount = indexCount;
        }

        // update bound
        if (dynamicGeometry.minPos && dynamicGeometry.maxPos) {
            const minPos = v3(dynamicGeometry.minPos.x, dynamicGeometry.minPos.y, dynamicGeometry.minPos.z);
            const maxPos = v3(dynamicGeometry.maxPos.x, dynamicGeometry.maxPos.y, dynamicGeometry.maxPos.z);

            if (!dynamic.bounds[primitiveIndex]) {
                dynamic.bounds[primitiveIndex] = new geometry.AABB();
            }

            aabbFromPoints(dynamic.bounds[primitiveIndex], minPos, maxPos);

            const subMin = v3();
            const subMax = v3();
            dynamic.bounds.forEach((bound) => {
                if (bound) {
                    bound.getBoundary(subMin, subMax);
                    vec3Min(minPos, subMin, minPos);
                    vec3Max(maxPos, subMax, maxPos);
                }
            });

            this._struct.minPosition = v3(minPos.x, minPos.y, minPos.z);
            this._struct.maxPosition = v3(maxPos.x, maxPos.y, maxPos.z);
        }

        subMesh.invalidateGeometricInfo();
    }

    /**
     * @en Destroy the mesh and release all related GPU resources
     * @zh 销毁此网格，并释放它占有的所有 GPU 资源。
     */
    public destroy (): boolean {
        this.destroyRenderingMesh();
        return super.destroy();
    }

    /**
     * @en Release all related GPU resources
     * @zh 释放此网格占有的所有 GPU 资源。
     */
    public destroyRenderingMesh (): void {
        if (this._renderingSubMeshes) {
            for (let i = 0; i < this._renderingSubMeshes.length; i++) {
                this._renderingSubMeshes[i].destroy();
            }
            this._renderingSubMeshes = null;
            this._initialized = false;
            this._isMeshDataUploaded = false;
        }
    }

    /**
     * @en Reset the struct and data of the mesh
     * @zh 重置此网格的结构和数据。
     * @param struct @en The new struct @zh 新结构
     * @param data @en The new data @zh 新数据
     * @deprecated Will be removed in v3.0.0, please use [[reset]] instead
     */
    public assign (struct: Mesh.IStruct, data: Uint8Array): void {
        this.reset({
            struct,
            data,
        });
    }

    /**
     * @en Reset the mesh with mesh creation information
     * @zh 重置此网格。
     * @param info @en Mesh creation information including struct and data @zh 网格创建信息，包含结构及数据
     */
    public reset (info: Mesh.ICreateInfo): void {
        this.destroyRenderingMesh();
        this._struct = info.struct;
        this._data = info.data;
        this._hash = 0;
    }

    /**
     * @en Get [[geometry.AABB]] bounds in the skeleton's bone space
     * @zh 获取骨骼变换空间内下的 [[geometry.AABB]] 包围盒
     * @param skeleton @en skeleton data @zh 骨骼信息
     * @param skeleton @en skeleton data @zh 骨骼信息
     */
    public getBoneSpaceBounds (skeleton: Skeleton): (geometry.AABB | null)[] {
        if (this._boneSpaceBounds.has(skeleton.hash)) {
            return this._boneSpaceBounds.get(skeleton.hash)!;
        }
        const bounds: (geometry.AABB | null)[] = [];
        this._boneSpaceBounds.set(skeleton.hash, bounds);
        const valid: boolean[] = [];
        const { bindposes } = skeleton;
        for (let i = 0; i < bindposes.length; i++) {
            bounds.push(new geometry.AABB(Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity));
            valid.push(false);
        }
        const { primitives } = this._struct;
        for (let p = 0; p < primitives.length; p++) {
            const joints = this.readAttribute(p, AttributeName.ATTR_JOINTS);
            const weights = this.readAttribute(p, AttributeName.ATTR_WEIGHTS);
            const positions = this.readAttribute(p, AttributeName.ATTR_POSITION);
            if (!joints || !weights || !positions) { continue; }
            const vertCount = Math.min(joints.length / 4, weights.length / 4, positions.length / 3);
            for (let i = 0; i < vertCount; i++) {
                Vec3.set(v3_1, positions[3 * i + 0], positions[3 * i + 1], positions[3 * i + 2]);
                for (let j = 0; j < 4; ++j) {
                    const idx = 4 * i + j;
                    const joint = joints[idx];
                    if (weights[idx] === 0 || joint >= bindposes.length) { continue; }
                    vec3TransformMat4(v3_2, v3_1, bindposes[joint]);
                    valid[joint] = true;
                    const b = bounds[joint]!;
                    vec3Min(b.center, b.center, v3_2);
                    vec3Max(b.halfExtents, b.halfExtents, v3_2);
                }
            }
        }
        for (let i = 0; i < bindposes.length; i++) {
            const b = bounds[i]!;
            if (!valid[i]) { bounds[i] = null; } else { aabbFromPoints(b, b.center, b.halfExtents); }
        }
        return bounds;
    }

    /**
     * @en Merge the given mesh into the current mesh
     * @zh 合并指定的网格到此网格中。
     * @param mesh @en The mesh to be merged @zh 要合并的网格
     * @param worldMatrix @en The world matrix of the given mesh @zh 给定网格的模型变换矩阵
     * @param validate @en Whether to validate the mesh @zh 是否验证网格顶点布局
     * @returns @en whether the merging was successful or not @zh 返回合并成功与否
     */
    public merge (mesh: Mesh, worldMatrix?: Mat4, validate?: boolean): boolean {
        if (validate) {
            if (!this.validateMergingMesh(mesh)) {
                return false;
            }
        }

        const vec3_temp = new Vec3();
        const rotate = worldMatrix && new Quat();
        const boundingBox = worldMatrix && new geometry.AABB();
        if (rotate) {
            worldMatrix.getRotation(rotate);
        }
        if (!this._initialized) {
            const struct = JSON.parse(JSON.stringify(mesh._struct)) as Mesh.IStruct;
            const data = mesh._data.slice();
            if (worldMatrix) {
                if (struct.maxPosition && struct.minPosition) {
                    vec3Add(boundingBox!.center, struct.maxPosition, struct.minPosition);
                    vec3MultiplyScalar(boundingBox!.center, boundingBox!.center, 0.5);
                    vec3Subtract(boundingBox!.halfExtents, struct.maxPosition, struct.minPosition);
                    vec3MultiplyScalar(boundingBox!.halfExtents, boundingBox!.halfExtents, 0.5);
                    aabbTransform(boundingBox!, boundingBox!, worldMatrix);
                    vec3Add(struct.maxPosition, boundingBox!.center, boundingBox!.halfExtents);
                    vec3Subtract(struct.minPosition, boundingBox!.center, boundingBox!.halfExtents);
                }
                for (let i = 0; i < struct.vertexBundles.length; i++) {
                    const vtxBdl = struct.vertexBundles[i];
                    for (let j = 0; j < vtxBdl.attributes.length; j++) {
                        if (vtxBdl.attributes[j].name === (AttributeName.ATTR_POSITION as string)
                            || vtxBdl.attributes[j].name === (AttributeName.ATTR_NORMAL as string)) {
                            const { format } = vtxBdl.attributes[j];

                            const inputView = new DataView(
                                data.buffer,
                                vtxBdl.view.offset + getOffset(vtxBdl.attributes, j),
                            );

                            const reader = getReader(inputView, format);
                            const writer = getWriter(inputView, format);
                            if (!reader || !writer) {
                                continue;
                            }
                            const vertexCount = vtxBdl.view.count;

                            const vertexStride = vtxBdl.view.stride;
                            const attrComponentByteLength = getComponentByteLength(format);
                            for (let vtxIdx = 0; vtxIdx < vertexCount; vtxIdx++) {
                                const xOffset = vtxIdx * vertexStride;
                                const yOffset = xOffset + attrComponentByteLength;
                                const zOffset = yOffset + attrComponentByteLength;
                                vec3_temp.set(reader(xOffset), reader(yOffset), reader(zOffset));
                                switch (vtxBdl.attributes[j].name) {
                                case AttributeName.ATTR_POSITION:
                                    vec3_temp.transformMat4(worldMatrix);
                                    break;
                                case AttributeName.ATTR_NORMAL:
                                    vec3TransformQuat(vec3_temp, vec3_temp, rotate!);
                                    break;
                                default:
                                }
                                writer(xOffset, vec3_temp.x);
                                writer(yOffset, vec3_temp.y);
                                writer(zOffset, vec3_temp.z);
                            }
                        }
                    }
                }
            }
            this.reset({ struct, data });
            this.initialize();
            return true;
        }

        // merge buffer
        const bufferBlob = new BufferBlob();

        // merge vertex buffer
        let vertCount = 0;
        let vertStride = 0;
        let srcOffset = 0;
        let dstOffset = 0;
        let vb: ArrayBuffer;
        let vbView: Uint8Array;
        let srcVBView: Uint8Array;
        let dstVBView: Uint8Array;
        let srcAttrOffset = 0;
        let srcVBOffset = 0;
        let dstVBOffset = 0;
        let attrSize = 0;
        let dstAttrView: Uint8Array;
        let hasAttr = false;

        const vertexBundles = new Array<Mesh.IVertexBundle>(this._struct.vertexBundles.length);
        for (let i = 0; i < this._struct.vertexBundles.length; ++i) {
            const bundle = this._struct.vertexBundles[i];
            const dstBundle = mesh._struct.vertexBundles[i];

            srcOffset = bundle.view.offset;
            dstOffset = dstBundle.view.offset;
            vertStride = bundle.view.stride;
            vertCount = bundle.view.count + dstBundle.view.count;

            vb = new ArrayBuffer(vertCount * vertStride);
            vbView = new Uint8Array(vb);

            srcVBView = this._data.subarray(srcOffset, srcOffset + bundle.view.length);
            srcOffset += srcVBView.length;
            dstVBView = mesh._data.subarray(dstOffset, dstOffset + dstBundle.view.length);
            dstOffset += dstVBView.length;

            vbView.set(srcVBView);

            srcAttrOffset = 0;
            for (const attr of bundle.attributes) {
                dstVBOffset = 0;
                hasAttr = false;
                for (const dstAttr of dstBundle.attributes) {
                    if (attr.name === dstAttr.name && attr.format === dstAttr.format) {
                        hasAttr = true;
                        break;
                    }
                    dstVBOffset += FormatInfos[dstAttr.format].size;
                }
                if (hasAttr) {
                    attrSize = FormatInfos[attr.format].size;
                    srcVBOffset = bundle.view.length + srcAttrOffset;
                    for (let v = 0; v < dstBundle.view.count; ++v) {
                        dstAttrView = dstVBView.subarray(dstVBOffset, dstVBOffset + attrSize);
                        vbView.set(dstAttrView, srcVBOffset);
                        if ((attr.name === (AttributeName.ATTR_POSITION as string)
                            || attr.name === (AttributeName.ATTR_NORMAL as string)) && worldMatrix) {
                            const f32_temp = new Float32Array(vbView.buffer, srcVBOffset, 3);
                            vec3_temp.set(f32_temp[0], f32_temp[1], f32_temp[2]);
                            switch (attr.name) {
                            case AttributeName.ATTR_POSITION:
                                vec3_temp.transformMat4(worldMatrix);
                                break;
                            case AttributeName.ATTR_NORMAL:
                                vec3TransformQuat(vec3_temp, vec3_temp, rotate!);
                                break;
                            default:
                            }
                            f32_temp[0] = vec3_temp.x;
                            f32_temp[1] = vec3_temp.y;
                            f32_temp[2] = vec3_temp.z;
                        }
                        srcVBOffset += bundle.view.stride;
                        dstVBOffset += dstBundle.view.stride;
                    }
                }
                srcAttrOffset += FormatInfos[attr.format].size;
            }

            vertexBundles[i] = {
                attributes: bundle.attributes,
                view: {
                    offset: bufferBlob.getLength(),
                    length: vb.byteLength,
                    count: vertCount,
                    stride: vertStride,
                },
            };

            bufferBlob.addBuffer(vb);
        }

        // merge index buffer
        let idxCount = 0;
        let idxStride = 2;
        let ibView: Uint8Array | Uint16Array | Uint32Array;
        let srcIBView: Uint8Array | Uint16Array | Uint32Array;
        let dstIBView: Uint8Array | Uint16Array | Uint32Array;

        const primitives: Mesh.ISubMesh[] = new Array<Mesh.ISubMesh>(this._struct.primitives.length);
        for (let i = 0; i < this._struct.primitives.length; ++i) {
            const prim = this._struct.primitives[i];
            const dstPrim = mesh._struct.primitives[i];

            primitives[i] = {
                primitiveMode: prim.primitiveMode,
                vertexBundelIndices: prim.vertexBundelIndices,
            };

            let vertBatchCount = 0;
            for (const bundleIdx of prim.vertexBundelIndices) {
                vertBatchCount = Math.max(vertBatchCount, this._struct.vertexBundles[bundleIdx].view.count);
            }

            if (prim.indexView && dstPrim.indexView) {
                idxCount = prim.indexView.count;
                idxCount += dstPrim.indexView.count;

                srcOffset = prim.indexView.offset;
                dstOffset = dstPrim.indexView.offset;

                if (idxCount < 256) {
                    idxStride = 1;
                } else if (idxCount < 65536) {
                    idxStride = 2;
                } else {
                    idxStride = 4;
                }

                const ib = new ArrayBuffer(idxCount * idxStride);
                if (idxStride === 2) {
                    ibView = new Uint16Array(ib);
                } else if (idxStride === 1) {
                    ibView = new Uint8Array(ib);
                } else { // Uint32
                    ibView = new Uint32Array(ib);
                }

                // merge src indices
                if (prim.indexView.stride === 2) {
                    srcIBView = new Uint16Array(this._data.buffer, srcOffset, prim.indexView.count);
                } else if (prim.indexView.stride === 1) {
                    srcIBView = new Uint8Array(this._data.buffer, srcOffset, prim.indexView.count);
                } else { // Uint32
                    srcIBView = new Uint32Array(this._data.buffer, srcOffset, prim.indexView.count);
                }

                if (idxStride === prim.indexView.stride) {
                    ibView.set(srcIBView);
                } else {
                    for (let n = 0; n < prim.indexView.count; ++n) {
                        ibView[n] = srcIBView[n];
                    }
                }
                srcOffset += prim.indexView.length;

                // merge dst indices
                if (dstPrim.indexView.stride === 2) {
                    dstIBView = new Uint16Array(mesh._data.buffer, dstOffset, dstPrim.indexView.count);
                } else if (dstPrim.indexView.stride === 1) {
                    dstIBView = new Uint8Array(mesh._data.buffer, dstOffset, dstPrim.indexView.count);
                } else { // Uint32
                    dstIBView = new Uint32Array(mesh._data.buffer, dstOffset, dstPrim.indexView.count);
                }
                for (let n = 0; n < dstPrim.indexView.count; ++n) {
                    ibView[prim.indexView.count + n] = vertBatchCount + dstIBView[n];
                }
                dstOffset += dstPrim.indexView.length;

                primitives[i].indexView = {
                    offset: bufferBlob.getLength(),
                    length: ib.byteLength,
                    count: idxCount,
                    stride: idxStride,
                };

                bufferBlob.setNextAlignment(idxStride);
                bufferBlob.addBuffer(ib);
            }
        }

        // Create mesh struct.
        const meshStruct: Mesh.IStruct = {
            vertexBundles,
            primitives,
            minPosition: this._struct.minPosition,
            maxPosition: this._struct.maxPosition,
        };

        if (meshStruct.minPosition && mesh._struct.minPosition && meshStruct.maxPosition && mesh._struct.maxPosition) {
            if (worldMatrix) {
                vec3Add(boundingBox!.center, mesh._struct.maxPosition, mesh._struct.minPosition);
                vec3MultiplyScalar(boundingBox!.center, boundingBox!.center, 0.5);
                vec3Subtract(boundingBox!.halfExtents, mesh._struct.maxPosition, mesh._struct.minPosition);
                vec3MultiplyScalar(boundingBox!.halfExtents, boundingBox!.halfExtents, 0.5);
                aabbTransform(boundingBox!, boundingBox!, worldMatrix);
                vec3Add(vec3_temp, boundingBox!.center, boundingBox!.halfExtents);
                vec3Max(meshStruct.maxPosition, meshStruct.maxPosition, vec3_temp);
                vec3Subtract(vec3_temp, boundingBox!.center, boundingBox!.halfExtents);
                vec3Min(meshStruct.minPosition, meshStruct.minPosition, vec3_temp);
            } else {
                vec3Min(meshStruct.minPosition, meshStruct.minPosition, mesh._struct.minPosition);
                vec3Max(meshStruct.maxPosition, meshStruct.maxPosition, mesh._struct.maxPosition);
            }
        }

        // Create mesh.
        this.reset({
            struct: meshStruct,
            data: new Uint8Array(bufferBlob.getCombined()),
        });
        this.initialize();

        return true;
    }

    /**
     * @en Validation for whether the given mesh can be merged into the current mesh.
     * To pass the validation, it must satisfy either of these two requirements:
     * - When the current mesh have no data
     * - When the two mesh have the same vertex bundle count, the same sub meshes count, and the same sub mesh layout.
     *
     * Same mesh layout means:
     * - They have the same primitive type and reference to the same amount vertex bundle with the same indices.
     * - And they all have or don't have index view
     * @zh 验证指定网格是否可以合并至当前网格。
     *
     * 当满足以下条件之一时，指定网格可以合并至当前网格：
     *  - 当前网格无数据而待合并网格有数据；
     *  - 它们的顶点块数目相同且对应顶点块的布局一致，并且它们的子网格数目相同且对应子网格的布局一致。
     *
     * 两个顶点块布局一致当且仅当：
     *  - 它们具有相同数量的顶点属性且对应的顶点属性具有相同的属性格式。
     *
     * 两个子网格布局一致，当且仅当：
     *  - 它们具有相同的图元类型并且引用相同数量、相同索引的顶点块；并且，
     *  - 要么都需要索引绘制，要么都不需要索引绘制。
     * @param mesh @en The other mesh to be validated @zh 待验证的网格
     */
    public validateMergingMesh (mesh: Mesh): boolean {
        // dynamic mesh is not allowed to merge.
        if (this._struct.dynamic || mesh._struct.dynamic) {
            return false;
        }

        // validate vertex bundles
        if (this._struct.vertexBundles.length !== mesh._struct.vertexBundles.length) {
            return false;
        }

        for (let i = 0; i < this._struct.vertexBundles.length; ++i) {
            const bundle = this._struct.vertexBundles[i];
            const dstBundle = mesh._struct.vertexBundles[i];

            if (bundle.attributes.length !== dstBundle.attributes.length) {
                return false;
            }
            for (let j = 0; j < bundle.attributes.length; ++j) {
                if (bundle.attributes[j].format !== dstBundle.attributes[j].format) {
                    return false;
                }
            }
        }

        // validate primitives
        if (this._struct.primitives.length !== mesh._struct.primitives.length) {
            return false;
        }
        for (let i = 0; i < this._struct.primitives.length; ++i) {
            const prim = this._struct.primitives[i];
            const dstPrim = mesh._struct.primitives[i];
            if (prim.vertexBundelIndices.length !== dstPrim.vertexBundelIndices.length) {
                return false;
            }
            for (let j = 0; j < prim.vertexBundelIndices.length; ++j) {
                if (prim.vertexBundelIndices[j] !== dstPrim.vertexBundelIndices[j]) {
                    return false;
                }
            }
            if (prim.primitiveMode !== dstPrim.primitiveMode) {
                return false;
            }

            if (prim.indexView) {
                if (dstPrim.indexView === undefined) {
                    return false;
                }
            } else if (dstPrim.indexView) {
                return false;
            }
        }

        return true;
    }

    /**
     * @en Read the requested attribute of the given sub mesh
     * @zh 读取子网格的指定属性。
     * @param primitiveIndex @en Sub mesh index @zh 子网格索引
     * @param attributeName @en Attribute name @zh 属性名称
     * @returns @en Return null if not found or can't read, otherwise, will create a large enough typed array to contain all data of the attribute,
     * the array type will match the data type of the attribute. @zh 读取失败返回 null， 否则返回对应的类型数组
     */
    public readAttribute (primitiveIndex: number, attributeName: AttributeName): TypedArray | null {
        let result: TypedArray | null = null;
        this._accessAttribute(primitiveIndex, attributeName, (vertexBundle, iAttribute) => {
            const vertexCount = vertexBundle.view.count;
            const { format } = vertexBundle.attributes[iAttribute];
            const StorageConstructor = getTypedArrayConstructor(FormatInfos[format]);
            if (vertexCount === 0) {
                return;
            }

            const inputView = new DataView(
                this._data.buffer,
                vertexBundle.view.offset + getOffset(vertexBundle.attributes, iAttribute),
            );

            const formatInfo = FormatInfos[format];
            const reader = getReader(inputView, format);
            if (!StorageConstructor || !reader) {
                return;
            }
            const componentCount = formatInfo.count;
            const storage = new StorageConstructor(vertexCount * componentCount);
            const inputStride = vertexBundle.view.stride;
            for (let iVertex = 0; iVertex < vertexCount; ++iVertex) {
                for (let iComponent = 0; iComponent < componentCount; ++iComponent) {
                    storage[componentCount * iVertex + iComponent] = reader(inputStride * iVertex + storage.BYTES_PER_ELEMENT * iComponent);
                }
            }
            result = storage;
        });
        return result;
    }

    /**
     * @en Read the requested attribute of the given sub mesh and fill into the given buffer.
     * @zh 读取子网格的指定属性到目标缓冲区中。
     * @param primitiveIndex @en Sub mesh index @zh 子网格索引
     * @param attributeName @en Attribute name @zh 属性名称
     * @param buffer @en The target array buffer @zh 目标缓冲区
     * @param stride @en attribute stride @zh 属性跨距
     * @param offset @en The offset of the first attribute in the target buffer @zh 第一个属性在目标缓冲区的偏移
     * @returns @en false if failed to access attribute, true otherwise @zh 是否成功拷贝
     */
    public copyAttribute (primitiveIndex: number, attributeName: AttributeName, buffer: ArrayBuffer, stride: number, offset: number): boolean {
        let written = false;
        this._accessAttribute(primitiveIndex, attributeName, (vertexBundle, iAttribute) => {
            const vertexCount = vertexBundle.view.count;
            if (vertexCount === 0) {
                written = true;
                return;
            }
            const { format } = vertexBundle.attributes[iAttribute];

            const inputView = new DataView(
                this._data.buffer,
                vertexBundle.view.offset + getOffset(vertexBundle.attributes, iAttribute),
            );

            const outputView = new DataView(buffer, offset);

            const formatInfo = FormatInfos[format];

            const reader = getReader(inputView, format);
            const writer = getWriter(outputView, format);
            if (!reader || !writer) {
                return;
            }

            const componentCount = formatInfo.count;

            const inputStride = vertexBundle.view.stride;
            const inputComponentByteLength = getComponentByteLength(format);
            const outputStride = stride;
            const outputComponentByteLength = inputComponentByteLength;
            for (let iVertex = 0; iVertex < vertexCount; ++iVertex) {
                for (let iComponent = 0; iComponent < componentCount; ++iComponent) {
                    const inputOffset = inputStride * iVertex + inputComponentByteLength * iComponent;
                    const outputOffset = outputStride * iVertex + outputComponentByteLength * iComponent;
                    writer(outputOffset, reader(inputOffset));
                }
            }
            written = true;
        });
        return written;
    }

    /**
     * @en Read the indices data of the given sub mesh
     * @zh 读取子网格的索引数据。
     * @param primitiveIndex @en Sub mesh index @zh 子网格索引
     * @returns @en Return null if not found or can't read, otherwise, will create a large enough typed array to contain all indices data,
     * the array type will use the corresponding stride size. @zh 读取失败返回 null，否则返回索引数据
     */
    public readIndices (primitiveIndex: number): Uint8Array | Uint16Array | Uint32Array | null {
        if (primitiveIndex >= this._struct.primitives.length) {
            return null;
        }
        const primitive = this._struct.primitives[primitiveIndex];
        if (!primitive.indexView) {
            return null;
        }
        const { stride } = primitive.indexView;
        const Ctor = stride === 1 ? Uint8Array : (stride === 2 ? Uint16Array : Uint32Array);
        return new Ctor(this._data.buffer, primitive.indexView.offset, primitive.indexView.count);
    }

    /**
     * @en Read the indices data of the given sub mesh and fill into the given array
     * @zh 读取子网格的索引数据到目标数组中。
     * @param primitiveIndex @en Sub mesh index @zh 子网格索引
     * @param outputArray @en The target output array @zh 目标索引数组
     * @returns @en Return false if failed to access the indices data, return true otherwise. @zh 拷贝失败返回 false， 否则返回 true
     */
    public copyIndices (primitiveIndex: number, outputArray: number[] | ArrayBufferView): boolean {
        if (primitiveIndex >= this._struct.primitives.length) {
            return false;
        }
        const primitive = this._struct.primitives[primitiveIndex];
        if (!primitive.indexView) {
            return false;
        }
        const indexCount = primitive.indexView.count;
        const indexFormat = primitive.indexView.stride === 1 ? Format.R8UI : (primitive.indexView.stride === 2 ? Format.R16UI : Format.R32UI);
        const reader = getReader(new DataView(this._data.buffer), indexFormat)!;
        for (let i = 0; i < indexCount; ++i) {
            outputArray[i] = reader(primitive.indexView.offset + FormatInfos[indexFormat].size * i);
        }
        return true;
    }

    /**
     * @en Read the format by attributeName of submesh
     * @zh 根据属性名读取子网格的属性信息。
     * @param primitiveIndex @en Sub mesh index @zh 子网格索引
     * @param attributeName @en Attribute name @zh 属性名称
     * @returns @en Return null if failed to read format, return the format otherwise. @zh 读取失败返回 null， 否则返回 format
     */
    public readAttributeFormat (primitiveIndex: number, attributeName: AttributeName): FormatInfo | null {
        let result: FormatInfo | null = null;

        this._accessAttribute(primitiveIndex, attributeName, (vertexBundle, iAttribute) => {
            const format = vertexBundle.attributes[iAttribute].format;
            result = FormatInfos[format];
        });

        return result;
    }

    private _accessAttribute (
        primitiveIndex: number,
        attributeName: AttributeName,
        accessor: (vertexBundle: Mesh.IVertexBundle, iAttribute: number) => void,
    ): void {
        if (primitiveIndex >= this._struct.primitives.length) {
            return;
        }
        const vertexBundelIndices = this._struct.primitives[primitiveIndex].vertexBundelIndices;
        for (let i = 0; i < vertexBundelIndices.length; i++) {
            const vertexBundleIndex = vertexBundelIndices[i];
            const vertexBundle = this._struct.vertexBundles[vertexBundleIndex];
            const iAttribute = vertexBundle.attributes.findIndex((a) => a.name === (attributeName as string));
            if (iAttribute < 0) {
                continue;
            }
            accessor(vertexBundle, iAttribute);
            break;
        }
    }

    private _createVertexBuffers (gfxDevice: Device, data: ArrayBuffer): Buffer[] {
        return this._struct.vertexBundles.map((vertexBundle) => {
            const vertexBuffer = gfxDevice.createBuffer(new BufferInfo(
                BufferUsageBit.VERTEX,
                MemoryUsageBit.DEVICE,
                vertexBundle.view.length,
                vertexBundle.view.stride,
            ));

            const view = new Uint8Array(data, vertexBundle.view.offset, vertexBundle.view.length);
            vertexBuffer.update(view);
            return vertexBuffer;
        });
    }

    /**
     * @en default init
     * @zh 默认初始化
     * @param uuid @en asset uuid @zh 资源 uuid
     */
    public initDefault (uuid?: string): void {
        super.initDefault(uuid);
        this.reset({
            struct: {
                vertexBundles: [],
                primitives: [],
            },
            data: globalEmptyMeshBuffer,
        });
    }

    /**
     * @en Set whether the data of this mesh could be accessed (read or wrote), it could be used only for static mesh
     * @zh 设置此网格的数据是否可被存取，此接口只针对静态网格资源生效
     * @param allowDataAccess @en Indicate whether the data of this mesh could be accessed (read or wrote) @zh 是否允许存取网格数据
     */
    public set allowDataAccess (allowDataAccess: boolean) {
        this._allowDataAccess = allowDataAccess;
        if (this._isMeshDataUploaded && !this._allowDataAccess && !EDITOR) {
            this.releaseData();
        }
    }

    /**
     * @en Get whether the data of this mesh could be read or wrote
     * @zh 获取此网格的数据是否可被存取
     * @return @en whether the data of this mesh could be accessed (read or wrote) @zh 此网格的数据是否可被存取
     */
    public get allowDataAccess (): boolean {
        return this._allowDataAccess;
    }

    private releaseData (): void {
        this._data = globalEmptyMeshBuffer;
    }
}
cclegacy.Mesh = Mesh;

function getOffset (attributes: Attribute[], attributeIndex: number): number {
    let result = 0;
    for (let i = 0; i < attributeIndex; ++i) {
        const attribute = attributes[i];
        result += FormatInfos[attribute.format].size;
    }
    return result;
}

const { isLittleEndian } = sys;

function getComponentByteLength (format: Format): number {
    const info = FormatInfos[format];
    return info.size / info.count;
}

function getReader (dataView: DataView, format: Format): ((offset: number) => number) | null {
    const info = FormatInfos[format];
    const stride = info.size / info.count;

    switch (info.type) {
    case FormatType.UNORM: {
        switch (stride) {
        case 1: return (offset: number): number => dataView.getUint8(offset);
        case 2: return (offset: number): number => dataView.getUint16(offset, isLittleEndian);
        case 4: return (offset: number): number => dataView.getUint32(offset, isLittleEndian);
        default:
        }
        break;
    }
    case FormatType.SNORM: {
        switch (stride) {
        case 1: return (offset: number): number => dataView.getInt8(offset);
        case 2: return (offset: number): number => dataView.getInt16(offset, isLittleEndian);
        case 4: return (offset: number): number => dataView.getInt32(offset, isLittleEndian);
        default:
        }
        break;
    }
    case FormatType.INT: {
        switch (stride) {
        case 1: return (offset: number): number => dataView.getInt8(offset);
        case 2: return (offset: number): number => dataView.getInt16(offset, isLittleEndian);
        case 4: return (offset: number): number => dataView.getInt32(offset, isLittleEndian);
        default:
        }
        break;
    }
    case FormatType.UINT: {
        switch (stride) {
        case 1: return (offset: number): number => dataView.getUint8(offset);
        case 2: return (offset: number): number => dataView.getUint16(offset, isLittleEndian);
        case 4: return (offset: number): number => dataView.getUint32(offset, isLittleEndian);
        default:
        }
        break;
    }
    case FormatType.FLOAT: {
        switch (stride) {
        case 2: return (offset: number) => dataView.getUint16(offset, isLittleEndian);
        case 4: return (offset: number) => dataView.getFloat32(offset, isLittleEndian);
        default:
        }
        break;
    }
    default:
    }

    return null;
}

function getWriter (dataView: DataView, format: Format): ((offset: number, value: number) => void) | null {
    const info = FormatInfos[format];
    const stride = info.size / info.count;

    switch (info.type) {
    case FormatType.UNORM: {
        switch (stride) {
        case 1: return (offset: number, value: number): void => dataView.setUint8(offset, value);
        case 2: return (offset: number, value: number): void => dataView.setUint16(offset, value, isLittleEndian);
        case 4: return (offset: number, value: number): void => dataView.setUint32(offset, value, isLittleEndian);
        default:
        }
        break;
    }
    case FormatType.SNORM: {
        switch (stride) {
        case 1: return (offset: number, value: number): void => dataView.setInt8(offset, value);
        case 2: return (offset: number, value: number): void => dataView.setInt16(offset, value, isLittleEndian);
        case 4: return (offset: number, value: number): void => dataView.setInt32(offset, value, isLittleEndian);
        default:
        }
        break;
    }
    case FormatType.INT: {
        switch (stride) {
        case 1: return (offset: number, value: number): void => dataView.setInt8(offset, value);
        case 2: return (offset: number, value: number): void => dataView.setInt16(offset, value, isLittleEndian);
        case 4: return (offset: number, value: number): void => dataView.setInt32(offset, value, isLittleEndian);
        default:
        }
        break;
    }
    case FormatType.UINT: {
        switch (stride) {
        case 1: return (offset: number, value: number): void => dataView.setUint8(offset, value);
        case 2: return (offset: number, value: number): void => dataView.setUint16(offset, value, isLittleEndian);
        case 4: return (offset: number, value: number): void => dataView.setUint32(offset, value, isLittleEndian);
        default:
        }
        break;
    }
    case FormatType.FLOAT: {
        switch (stride) {
        case 2: return (offset: number, value: number) => dataView.setUint16(offset, value, isLittleEndian);
        case 4: return (offset: number, value: number) => dataView.setFloat32(offset, value, isLittleEndian);
        default:
        }
        break;
    }
    default:
    }

    return null;
}

export function decodeMesh (mesh: Mesh.ICreateInfo): Mesh.ICreateInfo {
    if (!mesh.struct.encoded) {
        // the mesh is not encoded, so no need to decode
        return mesh;
    }

    const res_checker = (res: number): void => {
        if (res < 0) {
            errorID(14204, res);
        }
    };

    const struct = JSON.parse(JSON.stringify(mesh.struct)) as Mesh.IStruct;

    const bufferBlob = new BufferBlob();
    bufferBlob.setNextAlignment(0);

    for (const bundle of struct.vertexBundles) {
        const view = bundle.view;
        const bound = view.count * view.stride;
        const buffer = new Uint8Array(bound);
        const vertex = new Uint8Array(mesh.data.buffer, view.offset, view.length);
        const res = MeshoptDecoder.decodeVertexBuffer(buffer, view.count, view.stride, vertex);
        res_checker(res);

        bufferBlob.setNextAlignment(view.stride);
        const newView: Mesh.IBufferView = {
            offset: bufferBlob.getLength(),
            length: buffer.byteLength,
            count: view.count,
            stride: view.stride,
        };
        bundle.view = newView;
        bufferBlob.addBuffer(buffer);
    }

    for (const primitive of struct.primitives) {
        if (primitive.indexView === undefined) {
            continue;
        }

        const view = primitive.indexView;
        const bound = view.count * view.stride;
        const buffer = new Uint8Array(bound);
        const index = new Uint8Array(mesh.data.buffer, view.offset, view.length);
        const res = MeshoptDecoder.decodeIndexBuffer(buffer, view.count, view.stride, index);
        res_checker(res);

        bufferBlob.setNextAlignment(view.stride);
        const newView: Mesh.IBufferView = {
            offset: bufferBlob.getLength(),
            length: buffer.byteLength,
            count: view.count,
            stride: view.stride,
        };
        primitive.indexView = newView;
        bufferBlob.addBuffer(buffer);
    }

    const data = new Uint8Array(bufferBlob.getCombined());

    return {
        struct,
        data,
    };
}

export function inflateMesh (mesh: Mesh.ICreateInfo): Mesh.ICreateInfo {
    const inflator = new zlib.Inflate(mesh.data);
    const decompressed = inflator.decompress();
    mesh.data = decompressed;
    mesh.struct.compressed = false;
    return mesh;
}

export function dequantizeMesh (mesh: Mesh.ICreateInfo): Mesh.ICreateInfo {
    const struct = JSON.parse(JSON.stringify(mesh.struct)) as Mesh.IStruct;

    const bufferBlob = new BufferBlob();
    bufferBlob.setNextAlignment(0);

    function transformVertex (
        reader: ((offset: number) => number),
        writer: ((offset: number, value: number) => void),
        count: number,
        components: number,
        componentSize: number,
        readerStride: number,
        writerStride: number,
    ): void {
        for (let i = 0; i < count; i++) {
            for (let j = 0; j < components; j++) {
                const inputOffset = readerStride * i + componentSize * j;
                const outputOffset = writerStride * i + componentSize * j;
                writer(outputOffset, reader(inputOffset));
            }
        }
    }

    function dequantizeHalf (
        reader: ((offset: number) => number),
        writer: ((offset: number, value: number) => void),
        count: number,
        components: number,
        readerStride: number,
        writerStride: number,
    ): void {
        for (let i = 0; i < count; i++) {
            for (let j = 0; j < components; j++) {
                const inputOffset = readerStride * i + 2 * j;
                const outputOffset = writerStride * i + 4 * j;
                const value = halfToFloat(reader(inputOffset));
                writer(outputOffset, value);
            }
        }
    }

    for (let i = 0; i < struct.vertexBundles.length; ++i) {
        const bundle = struct.vertexBundles[i];
        const view = bundle.view;
        const attributes =  bundle.attributes;
        const oldAttributes = mesh.struct.vertexBundles[i].attributes;
        const strides: number[] = [];
        const dequantizes: boolean[] = [];
        const readers: ((offset: number) => number)[] = [];
        for (let j = 0; j < attributes.length; ++j) {
            const attr = attributes[j];
            const inputView = new DataView(mesh.data.buffer, view.offset + getOffset(oldAttributes, j));
            const reader = getReader(inputView, attr.format);
            let dequantize = true;
            switch (attr.format) {
            case Format.R16F:
                attr.format = Format.R32F;
                break;
            case Format.RG16F:
                attr.format = Format.RG32F;
                break;
            case Format.RGB16F:
                attr.format = Format.RGB32F;
                break;
            case Format.RGBA16F:
                attr.format = Format.RGBA32F;
                break;
            default:
                dequantize = false;
                break;
            }
            strides.push(FormatInfos[attr.format].size);
            dequantizes.push(dequantize);
            readers.push(reader!);
        }
        const netStride = strides.reduce((acc, cur) => acc + cur, 0);
        const newBuffer = new Uint8Array(netStride * view.count);
        for (let j = 0; j < attributes.length; ++j) {
            const attribute = attributes[j];
            const reader = readers[j];
            const outputView = new DataView(newBuffer.buffer, getOffset(attributes, j));
            const writer = getWriter(outputView, attribute.format)!;
            const dequantize = dequantizes[j];
            const formatInfo = FormatInfos[attribute.format];
            if (dequantize) {
                dequantizeHalf(
                    reader,
                    writer,
                    view.count,
                    formatInfo.count,
                    view.stride,
                    netStride,
                );
            } else {
                transformVertex(
                    reader,
                    writer,
                    view.count,
                    formatInfo.count,
                    formatInfo.size / formatInfo.count,
                    view.stride,
                    netStride,
                );
            }
        }

        bufferBlob.setNextAlignment(netStride);
        const newView: Mesh.IBufferView = {
            offset: bufferBlob.getLength(),
            length: newBuffer.byteLength,
            count: view.count,
            stride: netStride,
        };
        bundle.view = newView;
        bufferBlob.addBuffer(newBuffer);
    }

    // dump index buffer
    for (const primitive of struct.primitives) {
        if (primitive.indexView === undefined) {
            continue;
        }
        const view = primitive.indexView;
        const buffer = new Uint8Array(mesh.data.buffer, view.offset, view.length);
        bufferBlob.setNextAlignment(view.stride);
        const newView: Mesh.IBufferView = {
            offset: bufferBlob.getLength(),
            length: buffer.byteLength,
            count: view.count,
            stride: view.stride,
        };
        primitive.indexView = newView;
        bufferBlob.addBuffer(buffer);
    }

    const data = new Uint8Array(bufferBlob.getCombined());

    struct.quantized = false;

    return {
        struct,
        data,
    };
}

// function get
