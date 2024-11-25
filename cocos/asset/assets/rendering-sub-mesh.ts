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

import { mapBuffer } from '../../3d/misc/buffer';
import {
    Attribute, Device, InputAssemblerInfo, Buffer, BufferInfo, AttributeName, BufferUsageBit,
    Format, FormatInfos, MemoryUsageBit, PrimitiveMode, DrawInfo,
} from '../../gfx';
import { Vec3, approx, cclegacy, floatToHalf, halfToFloat, pseudoRandomRange } from '../../core';
import { Mesh } from '../../3d/assets/mesh';
import { Root } from '../../root';

/**
 * @en Array views for index buffer
 * @zh 允许存储索引的数组视图。
 */
export type IBArray = Uint8Array | Uint16Array | Uint32Array;

/**
 * @en The interface of geometric information.
 * @zh 几何信息。
 */
export interface IGeometricInfo {
    /**
     * @en Vertex positions.
     * @zh 顶点位置。
     */
    positions: Float32Array;

    /**
     * @en Indices data.
     * @zh 索引数据。
     */
    indices?: IBArray;

    /**
     * @en Whether the geometry is treated as double sided.
     * @zh 是否将图元按双面对待。
     */
    doubleSided?: boolean;

    /**
     * @en The bounding box.
     * @zh 此几何体的轴对齐包围盒。
     */
    boundingBox: { max: Vec3 | Readonly<Vec3>; min: Vec3 | Readonly<Vec3> };
}

/**
 * @en Flat vertex buffer.
 * @zh 扁平化顶点缓冲区。
 */
export interface IFlatBuffer {
    stride: number;
    count: number;
    buffer: Uint8Array;
}

const EMPTY_GEOMETRIC_INFO: IGeometricInfo = {
    positions: new Float32Array(),
    indices: new Uint8Array(),
    boundingBox: { min: Vec3.ZERO, max: Vec3.ZERO },
};

/**
 * @en Sub mesh for rendering which contains all geometry data, it can be used to create [[gfx.InputAssembler]].
 * @zh 包含所有顶点数据的渲染子网格，可以用来创建 [[gfx.InputAssembler]]。
 */
export class RenderingSubMesh {
    /**
     * @en
     * mesh object where this sub mesh locates.
     * @zh
     * 子网格所处的网格模型对象。
     */
    public mesh?: Mesh;

    /**
     * @en
     * sub mesh's index in mesh.
     * @zh
     * 子网格在网格模型中的索引。
     */
    public subMeshIdx?: number;

    private _flatBuffers: IFlatBuffer[] = [];

    private _jointMappedBuffers?: Buffer[];

    private _jointMappedBufferIndices?: number[];

    private _vertexIdChannel?: { stream: number; index: number };

    private _geometricInfo?: IGeometricInfo;

    private _vertexBuffers: Buffer[];

    private declare _attributes: Attribute[];

    private declare _indexBuffer: Buffer | null;

    private declare _indirectBuffer: Buffer | null;

    private declare _primitiveMode: PrimitiveMode;

    private declare _iaInfo: InputAssemblerInfo;

    private declare _isOwnerOfIndexBuffer: boolean;

    private _drawInfo?: DrawInfo | null = null;

    /**
     * @en
     * sub mesh's constructor.
     * @zh
     * 子网格构造函数。
     * @param vertexBuffers @en vertex buffers. @zh 顶点缓冲区数组。
     * @param attributes @en vertex attributes. @zh 顶点属性数组。
     * @param primitiveMode @en primitive mode. @zh 图元类型。
     * @param indexBuffer @en index buffer. @zh 索引缓冲区。
     * @param indirectBuffer @en indirect buffer. @zh 间接缓冲区。
     */
    constructor (
        vertexBuffers: Buffer[],
        attributes: Attribute[],
        primitiveMode: PrimitiveMode,
        indexBuffer: Buffer | null = null,
        indirectBuffer: Buffer | null = null,
        isOwnerOfIndexBuffer = true,
    ) {
        this._attributes = attributes;
        this._vertexBuffers = vertexBuffers;
        this._indexBuffer = indexBuffer;
        this._indirectBuffer = indirectBuffer;
        this._primitiveMode = primitiveMode;
        this._iaInfo = new InputAssemblerInfo(attributes, vertexBuffers, indexBuffer, indirectBuffer);
        this._isOwnerOfIndexBuffer = isOwnerOfIndexBuffer;
    }

    /**
     * @en All vertex attributes used by the sub mesh.
     * @zh 所有顶点属性。
     */
    get attributes (): Attribute[] { return this._attributes; }

    /**
     * @en All vertex buffers used by the sub mesh.
     * @zh 使用的所有顶点缓冲区。
     */
    get vertexBuffers (): Buffer[] { return this._vertexBuffers; }

    /**
     * @en Index buffer used by the sub mesh.
     * @zh 使用的索引缓冲区，若未使用则无需指定。
     */
    get indexBuffer (): Buffer | null { return this._indexBuffer; }

    /**
     * @en Indirect buffer used by the sub mesh.
     * @zh 间接绘制缓冲区。
     */
    get indirectBuffer (): Buffer | null { return this._indirectBuffer; }

    /**
     * @en Primitive mode used by the sub mesh.
     * @zh 图元类型。
     */
    get primitiveMode (): PrimitiveMode { return this._primitiveMode; }

    /**
     * @en The geometric info of the sub mesh, used for raycast.
     * @zh （用于射线检测的）几何信息。
     */
    get geometricInfo (): IGeometricInfo {
        if (this._geometricInfo) {
            return this._geometricInfo;
        }
        if (this.mesh === undefined) {
            return EMPTY_GEOMETRIC_INFO;
        }
        if (this.subMeshIdx === undefined) {
            return EMPTY_GEOMETRIC_INFO;
        }
        const { mesh } = this; const index = this.subMeshIdx;
        const pAttri = this.attributes.find((element) => element.name === (AttributeName.ATTR_POSITION as string));

        if (!pAttri) {
            return EMPTY_GEOMETRIC_INFO;
        }

        let positions: Float32Array | undefined;
        switch (pAttri.format) {
        case Format.RG32F:
        case Format.RGB32F:
        {
            positions = mesh.readAttribute(index, AttributeName.ATTR_POSITION) as unknown as Float32Array;
            if (!positions) {
                return EMPTY_GEOMETRIC_INFO;
            }
            break;
        }
        case Format.RGBA32F:
        {
            const data = mesh.readAttribute(index, AttributeName.ATTR_POSITION) as unknown as Float32Array;
            if (!data) {
                return EMPTY_GEOMETRIC_INFO;
            }
            const count = data.length / 4;
            positions = new Float32Array(count * 3);
            for (let i = 0; i < count; ++i) {
                const dstPtr = i * 3;
                const srcPtr = i * 4;
                positions[dstPtr] = data[srcPtr];
                positions[dstPtr + 1] = data[srcPtr + 1];
                positions[dstPtr + 2] = data[srcPtr + 2];
            }
            break;
        }
        case Format.RG16F:
        case Format.RGB16F:
        {
            const data =  mesh.readAttribute(index, AttributeName.ATTR_POSITION) as unknown as Uint16Array;
            if (!data) {
                return EMPTY_GEOMETRIC_INFO;
            }
            positions = new Float32Array(data.length);
            for (let i = 0; i < data.length; ++i) {
                positions[i] = halfToFloat(data[i]);
            }
            break;
        }
        case Format.RGBA16F:
        {
            const data =  mesh.readAttribute(index, AttributeName.ATTR_POSITION) as unknown as Uint16Array;
            if (!data) {
                return EMPTY_GEOMETRIC_INFO;
            }
            const count = data.length / 4;
            positions = new Float32Array(count * 3);
            for (let i = 0; i < count; ++i) {
                const dstPtr = i * 3;
                const srcPtr = i * 4;
                positions[dstPtr] = halfToFloat(data[srcPtr]);
                positions[dstPtr + 1] = halfToFloat(data[srcPtr + 1]);
                positions[dstPtr + 2] = halfToFloat(data[srcPtr + 2]);
            }
            break;
        }
        default:
            return EMPTY_GEOMETRIC_INFO;
        }

        const indices = mesh.readIndices(index) || undefined;
        const max = new Vec3();
        const min = new Vec3();

        const conut = FormatInfos[pAttri.format].count;
        if (conut === 2) {
            max.set(positions[0], positions[1], 0);
            min.set(positions[0], positions[1], 0);
        } else {
            max.set(positions[0], positions[1], positions[2]);
            min.set(positions[0], positions[1], positions[2]);
        }
        for (let i = 0; i < positions.length; i += conut) {
            if (conut === 2) {
                max.x = positions[i] > max.x ? positions[i] : max.x;
                max.y = positions[i + 1] > max.y ? positions[i + 1] : max.y;
                min.x = positions[i] < min.x ? positions[i] : min.x;
                min.y = positions[i + 1] < min.y ? positions[i + 1] : min.y;
            } else {
                max.x = positions[i] > max.x ? positions[i] : max.x;
                max.y = positions[i + 1] > max.y ? positions[i + 1] : max.y;
                max.z = positions[i + 2] > max.z ? positions[i + 2] : max.z;
                min.x = positions[i] < min.x ? positions[i] : min.x;
                min.y = positions[i + 1] < min.y ? positions[i + 1] : min.y;
                min.z = positions[i + 2] < min.z ? positions[i + 2] : min.z;
            }
        }
        this._geometricInfo = { positions, indices, boundingBox: { max, min } };
        return this._geometricInfo;
    }

    /**
     * @en Invalidate the geometric info of the sub mesh after geometry changed.
     * @zh 网格更新后，设置（用于射线检测的）几何信息为无效，需要重新计算。
     */
    public invalidateGeometricInfo (): void { this._geometricInfo = undefined; }

    /**
     * @en the draw range.
     * @zh 渲染范围。
     */
    set drawInfo (info: DrawInfo | null | undefined) {
        this._drawInfo = info;
    }

    get drawInfo (): DrawInfo | null | undefined {
        return this._drawInfo;
    }

    /**
     * @en Flatted vertex buffers.
     * @zh 扁平化的顶点缓冲区。
     */
    get flatBuffers (): IFlatBuffer[] { return this._flatBuffers; }

    /**
     * @en generate flatted vertex buffers.
     * @zh 生成扁平化的顶点缓冲区。
     */
    public genFlatBuffers (): void {
        if (this._flatBuffers.length || !this.mesh || this.subMeshIdx === undefined) { return; }

        const { mesh } = this;
        let idxCount = 0;
        const prim = mesh.struct.primitives[this.subMeshIdx];
        if (prim.indexView) { idxCount = prim.indexView.count; }
        for (let i = 0; i < prim.vertexBundelIndices.length; i++) {
            const bundleIdx = prim.vertexBundelIndices[i];
            const vertexBundle = mesh.struct.vertexBundles[bundleIdx];
            const vbCount = prim.indexView ? prim.indexView.count : vertexBundle.view.count;
            const vbStride = vertexBundle.view.stride;
            const vbSize = vbStride * vbCount;
            const view = new Uint8Array(mesh.data.buffer, vertexBundle.view.offset, vertexBundle.view.length);
            const sharedView = new Uint8Array(prim.indexView ? vbSize : vertexBundle.view.length);

            if (!prim.indexView) {
                sharedView.set(mesh.data.subarray(vertexBundle.view.offset, vertexBundle.view.offset + vertexBundle.view.length));
                this._flatBuffers.push({ stride: vbStride, count: vbCount, buffer: sharedView });
                continue;
            }

            const ibView = mesh.readIndices(this.subMeshIdx)!;
            // transform to flat buffer
            for (let n = 0; n < idxCount; ++n) {
                const idx = ibView[n];
                const offset = n * vbStride;
                const srcOffset = idx * vbStride;
                for (let m = 0; m < vbStride; ++m) {
                    sharedView[offset + m] = view[srcOffset + m];
                }
            }
            this._flatBuffers.push({ stride: vbStride, count: vbCount, buffer: sharedView });
        }
    }

    /**
     * @en The vertex buffer for joint after mapping.
     * @zh 骨骼索引按映射表处理后的顶点缓冲。
     */
    get jointMappedBuffers (): Buffer[] {
        if (this._jointMappedBuffers) { return this._jointMappedBuffers; }
        const buffers: Buffer[] = this._jointMappedBuffers = [];
        const indices: number[] = this._jointMappedBufferIndices = [];
        if (!this.mesh || this.subMeshIdx === undefined) { return this._jointMappedBuffers = this.vertexBuffers; }
        const { struct } = this.mesh;
        const prim = struct.primitives[this.subMeshIdx];
        if (!struct.jointMaps || prim.jointMapIndex === undefined || !struct.jointMaps[prim.jointMapIndex]) {
            return this._jointMappedBuffers = this.vertexBuffers;
        }
        let jointFormat: Format;
        let jointOffset: number;
        const { device } = cclegacy.director.root as Root;
        for (let i = 0; i < prim.vertexBundelIndices.length; i++) {
            const bundle = struct.vertexBundles[prim.vertexBundelIndices[i]];
            jointOffset = 0;
            jointFormat = Format.UNKNOWN;
            for (let j = 0; j < bundle.attributes.length; j++) {
                const attr = bundle.attributes[j];
                if (attr.name === (AttributeName.ATTR_JOINTS as string)) {
                    jointFormat = attr.format;
                    break;
                }
                jointOffset += FormatInfos[attr.format].size;
            }
            if (jointFormat) {
                const data = new Uint8Array(this.mesh.data.buffer, bundle.view.offset, bundle.view.length);
                const dataView = new DataView(data.slice().buffer);
                const idxMap = struct.jointMaps[prim.jointMapIndex];
                mapBuffer(
                    dataView,
                    (cur): number => idxMap.indexOf(cur),
                    jointFormat,
                    jointOffset,
                    bundle.view.length,
                    bundle.view.stride,
                    dataView,
                );
                const buffer = device.createBuffer(new BufferInfo(
                    BufferUsageBit.VERTEX | BufferUsageBit.TRANSFER_DST,
                    MemoryUsageBit.DEVICE,
                    bundle.view.length,
                    bundle.view.stride,
                ));
                buffer.update(dataView.buffer); buffers.push(buffer); indices.push(i);
            } else {
                buffers.push(this.vertexBuffers[prim.vertexBundelIndices[i]]);
            }
        }
        if (this._vertexIdChannel) {
            buffers.push(this._allocVertexIdBuffer(device));
        }
        return buffers;
    }

    /**
     * @en The input assembler info.
     * @zh 输入汇集器信息。
     */
    get iaInfo (): InputAssemblerInfo { return this._iaInfo; }

    /**
     * @en Destroys sub mesh.
     * @zh 销毁子网格。
     */
    public destroy (): void {
        for (let i = 0; i < this.vertexBuffers.length; i++) {
            this.vertexBuffers[i].destroy();
        }
        this.vertexBuffers.length = 0;
        if (this._indexBuffer) {
            if (this._isOwnerOfIndexBuffer) {
                this._indexBuffer.destroy();
            }
            this._indexBuffer = null;
        }
        if (this._jointMappedBuffers && this._jointMappedBufferIndices) {
            for (let i = 0; i < this._jointMappedBufferIndices.length; i++) {
                this._jointMappedBuffers[this._jointMappedBufferIndices[i]].destroy();
            }
            this._jointMappedBuffers = undefined;
            this._jointMappedBufferIndices = undefined;
        }
        if (this._indirectBuffer) {
            this._indirectBuffer.destroy();
            this._indirectBuffer = null;
        }
    }

    /**
     * @en Adds a vertex attribute input called 'a_vertexId' into this sub-mesh.
     * This is useful if you want to simulate `gl_VertexId` in WebGL context prior to 2.0.
     * Once you call this function, the vertex attribute is permanently added.
     * Subsequent calls to this function take no effect.
     * @zh 添加一个 'a_vertexId' 顶点属性， 用于在 WebGL 2.0 之前的平台模拟 `gl_VertexId`，
     * 一旦你调用此函数， 顶点属性永久被添加， 后续调用无效果。
     * @param device @en Device used to create related rendering resources @zh 用于创建相关渲染资源的设备对象
     */
    public enableVertexIdChannel (device: Device): void {
        if (this._vertexIdChannel) {
            return;
        }

        const streamIndex = this.vertexBuffers.length;
        const attributeIndex = this.attributes.length;

        const vertexIdBuffer = this._allocVertexIdBuffer(device);
        this._vertexBuffers.push(vertexIdBuffer);
        this._attributes.push(new Attribute('a_vertexId', Format.R32F, false, streamIndex));

        this._iaInfo.attributes = this._attributes;
        this._iaInfo.vertexBuffers = this._vertexBuffers;

        this._vertexIdChannel = {
            stream: streamIndex,
            index: attributeIndex,
        };
    }

    private _allocVertexIdBuffer (device: Device): Buffer {
        const vertexCount = (this.vertexBuffers.length === 0 || this.vertexBuffers[0].stride === 0)
            ? 0
            // TODO: This depends on how stride of a vertex buffer is defined; Consider padding problem.
            : this.vertexBuffers[0].size / this.vertexBuffers[0].stride;
        const vertexIds = new Float32Array(vertexCount);
        for (let iVertex = 0; iVertex < vertexCount; ++iVertex) {
            // `+0.5` because on some platforms, the "fetched integer" may have small error.
            // For example `26` may yield `25.99999`, which is convert to `25` instead of `26` using `int()`.
            vertexIds[iVertex] = iVertex + 0.5;
        }

        const vertexIdBuffer = device.createBuffer(new BufferInfo(
            BufferUsageBit.VERTEX | BufferUsageBit.TRANSFER_DST,
            MemoryUsageBit.DEVICE,
            vertexIds.byteLength,
            vertexIds.BYTES_PER_ELEMENT,
        ));
        vertexIdBuffer.update(vertexIds);

        return vertexIdBuffer;
    }
}
