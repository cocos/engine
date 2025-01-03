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

import { Mesh, decodeMesh, inflateMesh } from '../assets/mesh';
import { AttributeName, Format, FormatInfos, PrimitiveMode, Attribute } from '../../gfx';
import { Vec3 } from '../../core';
import { IGeometry, IDynamicGeometry, ICreateMeshOptions, ICreateDynamicMeshOptions } from '../../primitive/define';
import { writeBuffer } from './buffer';
import { BufferBlob } from './buffer-blob';

const _defAttrs: Attribute[] = [
    new Attribute(AttributeName.ATTR_POSITION, Format.RGB32F),
    new Attribute(AttributeName.ATTR_NORMAL, Format.RGB32F),
    new Attribute(AttributeName.ATTR_TEX_COORD, Format.RG32F),
    new Attribute(AttributeName.ATTR_TANGENT, Format.RGBA32F),
    new Attribute(AttributeName.ATTR_COLOR, Format.RGBA32F),
];

const v3_1 = new Vec3();
/**
 * @deprecated
 */
export function createMesh (geometry: IGeometry, out?: Mesh, options?: ICreateMeshOptions): Mesh {
    options = options || {};
    // Collect attributes and calculate length of result vertex buffer.
    const attributes: Attribute[] = [];
    let stride = 0;
    const channels: { offset: number; data: number[]; attribute: Attribute; }[] = [];
    let vertCount = 0;

    let attr: Attribute | null;

    const positions = geometry.positions.slice();
    if (positions.length > 0) {
        attr = null;
        if (geometry.attributes) {
            attr = geometry.attributes.find((att) => att.name === AttributeName.ATTR_POSITION) || null;
        }

        if (!attr) {
            attr = _defAttrs[0];
        }

        attributes.push(attr);
        const info = FormatInfos[attr.format];
        vertCount = Math.max(vertCount, Math.floor(positions.length / info.count));
        channels.push({ offset: stride, data: positions, attribute: attr });
        stride += info.size;
    }

    if (geometry.normals && geometry.normals.length > 0) {
        attr = null;
        if (geometry.attributes) {
            attr = geometry.attributes.find((att) => att.name === AttributeName.ATTR_NORMAL) || null;
        }

        if (!attr) {
            attr = _defAttrs[1];
        }

        const info = FormatInfos[attr.format];
        attributes.push(attr);
        vertCount = Math.max(vertCount, Math.floor(geometry.normals.length / info.count));
        channels.push({ offset: stride, data: geometry.normals, attribute: attr });
        stride += info.size;
    }

    if (geometry.uvs && geometry.uvs.length > 0) {
        attr = null;
        if (geometry.attributes) {
            attr = geometry.attributes.find((att) => att.name === AttributeName.ATTR_TEX_COORD) || null;
        }

        if (!attr) {
            attr = _defAttrs[2];
        }

        const info = FormatInfos[attr.format];
        attributes.push(attr);
        vertCount = Math.max(vertCount, Math.floor(geometry.uvs.length / info.count));
        channels.push({ offset: stride, data: geometry.uvs, attribute: attr });
        stride += info.size;
    }

    if (geometry.tangents && geometry.tangents.length > 0) {
        attr = null;
        if (geometry.attributes) {
            attr = geometry.attributes.find((att) => att.name === AttributeName.ATTR_TANGENT) || null;
        }

        if (!attr) {
            attr = _defAttrs[3];
        }

        const info = FormatInfos[attr.format];
        attributes.push(attr);
        vertCount = Math.max(vertCount, Math.floor(geometry.tangents.length / info.count));
        channels.push({ offset: stride, data: geometry.tangents, attribute: attr });
        stride += info.size;
    }

    if (geometry.colors && geometry.colors.length > 0) {
        attr = null;
        if (geometry.attributes) {
            attr = geometry.attributes.find((att) => att.name === AttributeName.ATTR_COLOR) || null;
        }

        if (!attr) {
            attr = _defAttrs[4];
        }

        const info = FormatInfos[attr.format];
        attributes.push(attr);
        vertCount = Math.max(vertCount, Math.floor(geometry.colors.length / info.count));
        channels.push({ offset: stride, data: geometry.colors, attribute: attr });
        stride += info.size;
    }

    if (geometry.customAttributes) {
        for (let k = 0; k < geometry.customAttributes.length; k++) {
            const ca = geometry.customAttributes[k];
            const info = FormatInfos[ca.attr.format];
            attributes.push(ca.attr);
            vertCount = Math.max(vertCount, Math.floor(ca.values.length / info.count));
            channels.push({ offset: stride, data: ca.values, attribute: ca.attr });
            stride += info.size;
        }
    }

    // Use this to generate final merged buffer.
    const bufferBlob = new BufferBlob();

    // Fill vertex buffer.
    const vertexBuffer = new ArrayBuffer(vertCount * stride);
    const vertexBufferView = new DataView(vertexBuffer);
    for (const channel of channels) {
        writeBuffer(vertexBufferView, channel.data, channel.attribute.format, channel.offset, stride);
    }
    bufferBlob.setNextAlignment(0);
    const vertexBundle: Mesh.IVertexBundle = {
        attributes,
        view: {
            offset: bufferBlob.getLength(),
            length: vertexBuffer.byteLength,
            count: vertCount,
            stride,
        },
    };
    bufferBlob.addBuffer(vertexBuffer);

    // Fill index buffer.
    let indexBuffer: ArrayBuffer | null = null;
    let idxCount = 0;
    const idxStride = 2;
    if (geometry.indices) {
        const { indices } = geometry;
        idxCount = indices.length;
        indexBuffer = new ArrayBuffer(idxStride * idxCount);
        const indexBufferView = new DataView(indexBuffer);
        writeBuffer(indexBufferView, indices, Format.R16UI);
    }

    // Create primitive.
    const primitive: Mesh.ISubMesh = {
        primitiveMode: geometry.primitiveMode || PrimitiveMode.TRIANGLE_LIST,
        vertexBundelIndices: [0],
    };

    if (indexBuffer) {
        bufferBlob.setNextAlignment(idxStride);
        primitive.indexView = {
            offset: bufferBlob.getLength(),
            length: indexBuffer.byteLength,
            count: idxCount,
            stride: idxStride,
        };
        bufferBlob.addBuffer(indexBuffer);
    }

    let minPosition = geometry.minPos;
    if (!minPosition && options.calculateBounds) {
        minPosition = Vec3.set(new Vec3(), Infinity, Infinity, Infinity);
        for (let iVertex = 0; iVertex < vertCount; ++iVertex) {
            Vec3.set(v3_1, positions[iVertex * 3 + 0], positions[iVertex * 3 + 1], positions[iVertex * 3 + 2]);
            Vec3.min(minPosition, minPosition, v3_1);
        }
    }
    let maxPosition = geometry.maxPos;
    if (!maxPosition && options.calculateBounds) {
        maxPosition = Vec3.set(new Vec3(), -Infinity, -Infinity, -Infinity);
        for (let iVertex = 0; iVertex < vertCount; ++iVertex) {
            Vec3.set(v3_1, positions[iVertex * 3 + 0], positions[iVertex * 3 + 1], positions[iVertex * 3 + 2]);
            Vec3.max(maxPosition, maxPosition, v3_1);
        }
    }

    // Create mesh struct.
    const meshStruct: Mesh.IStruct = {
        vertexBundles: [vertexBundle],
        primitives: [primitive],
    };
    if (minPosition) {
        meshStruct.minPosition = new Vec3(minPosition.x, minPosition.y, minPosition.z);
    }
    if (maxPosition) {
        meshStruct.maxPosition = new Vec3(maxPosition.x, maxPosition.y, maxPosition.z);
    }

    // Create mesh.
    if (!out) {
        out = new Mesh();
    }
    out.reset({
        struct: meshStruct,
        data: new Uint8Array(bufferBlob.getCombined()),
    });

    return out;
}

function getPadding (length: number, align: number): number {
    if (align > 0) {
        const remainder = length % align;
        if (remainder !== 0) {
            const padding = align - remainder;
            return padding;
        }
    }

    return 0;
}

function createDynamicMesh (primitiveIndex: number, geometry: IDynamicGeometry, out?: Mesh, options?: ICreateDynamicMeshOptions): Mesh {
    options = options || { maxSubMeshes: 1, maxSubMeshVertices: 1024, maxSubMeshIndices: 1024 };

    const attributes: Attribute[] = [];
    let stream = 0;

    if (geometry.positions.length > 0) {
        attributes.push(new Attribute(AttributeName.ATTR_POSITION, Format.RGB32F, false, stream++, false, 0));
    }

    if (geometry.normals && geometry.normals.length > 0) {
        attributes.push(new Attribute(AttributeName.ATTR_NORMAL, Format.RGB32F, false, stream++, false, 0));
    }

    if (geometry.uvs && geometry.uvs.length > 0) {
        attributes.push(new Attribute(AttributeName.ATTR_TEX_COORD, Format.RG32F, false, stream++, false, 0));
    }

    if (geometry.tangents && geometry.tangents.length > 0) {
        attributes.push(new Attribute(AttributeName.ATTR_TANGENT, Format.RGBA32F, false, stream++, false, 0));
    }

    if (geometry.colors && geometry.colors.length > 0) {
        attributes.push(new Attribute(AttributeName.ATTR_COLOR, Format.RGBA32F, false, stream++, false, 0));
    }

    if (geometry.customAttributes) {
        for (let k = 0; k < geometry.customAttributes.length; k++) {
            const ca = geometry.customAttributes[k];
            const attr = new Attribute();
            attr.copy(ca.attr);
            attr.stream = stream++;
            attributes.push(attr);
        }
    }

    const vertexBundles: Mesh.IVertexBundle[] = [];
    const primitives: Mesh.ISubMesh[] = [];
    let dataSize = 0;

    for (let i = 0; i < options.maxSubMeshes; i++) {
        const primitive: Mesh.ISubMesh = {
            vertexBundelIndices: [],
            primitiveMode: geometry.primitiveMode || PrimitiveMode.TRIANGLE_LIST,
        };

        // add vertex buffers
        for (const attr of attributes) {
            const formatInfo = FormatInfos[attr.format];
            const vertexBufferSize = options.maxSubMeshVertices * formatInfo.size;

            const vertexView: Mesh.IBufferView = {
                offset: dataSize,
                length: vertexBufferSize,
                count: 0,
                stride: formatInfo.size,
            };

            const vertexBundle: Mesh.IVertexBundle = {
                view: vertexView,
                attributes: [attr],
            };

            const vertexBundleIndex = vertexBundles.length;
            primitive.vertexBundelIndices.push(vertexBundleIndex);
            vertexBundles.push(vertexBundle);
            dataSize += vertexBufferSize;
        }

        // add index buffer
        let stride = 0;
        if (geometry.indices16 && geometry.indices16.length > 0) {
            stride = 2;
        } else if (geometry.indices32 && geometry.indices32.length > 0) {
            stride = 4;
        }

        if (stride > 0) {
            dataSize += getPadding(dataSize, stride);
            const indexBufferSize = options.maxSubMeshIndices * stride;

            const indexView: Mesh.IBufferView = {
                offset: dataSize,
                length: indexBufferSize,
                count: 0,
                stride,
            };

            primitive.indexView = indexView;
            dataSize += indexBufferSize;
        }

        primitives.push(primitive);
    }

    const dynamicInfo: Mesh.IDynamicInfo = {
        maxSubMeshes: options.maxSubMeshes,
        maxSubMeshVertices: options.maxSubMeshVertices,
        maxSubMeshIndices: options.maxSubMeshIndices,
    };

    const dynamicStruct: Mesh.IDynamicStruct = {
        info: dynamicInfo,
        bounds: [],
    };
    dynamicStruct.bounds.length = options.maxSubMeshes;

    const meshStruct: Mesh.IStruct = {
        vertexBundles,
        primitives,
        dynamic: dynamicStruct,
    };

    const createInfo: Mesh.ICreateInfo = {
        struct: meshStruct,
        data: new Uint8Array(dataSize),
    };

    if (!out) {
        out = new Mesh();
    }

    out.reset(createInfo);
    out.initialize();
    out.updateSubMesh(primitiveIndex, geometry);

    return out;
}

/**
 * @en mesh utility class, use to create mesh.
 * @zh 网格工具类，用于创建网格。
 */
export class MeshUtils {
    /**
     * @en create a static mesh.
     * @zh 创建一个静态网格。
     * @param geometry @en geometry data use for creating @zh 用于创建的几何数据
     * @param out @en output static mesh @zh 输出的静态网格
     * @param options @en options of creating @zh 创建选项
     * @return @en The created static mesh, which is same as out @zh 新创建的静态网格，同 out 参数
     */
    static createMesh (geometry: IGeometry, out?: Mesh, options?: ICreateMeshOptions): Mesh {
        return createMesh(geometry, out, options);
    }

    /**
     * @en create a dynamic mesh.
     * @zh 创建一个动态网格。
     * @param primitiveIndex @en sub mesh index @zh 子网格索引
     * @param geometry @en geometry data use for creating @zh 用于创建的几何数据
     * @param out @en output dynamic mesh @zh 输出的动态网格
     * @param options @en options of creating @zh 创建选项
     * @return @en The created dynamic mesh, which is same as out @zh 新创建的动态网格，同 out 参数
     */
    static createDynamicMesh (primitiveIndex: number, geometry: IDynamicGeometry, out?: Mesh, options?: ICreateDynamicMeshOptions): Mesh {
        return createDynamicMesh(primitiveIndex, geometry, out, options);
    }

    /**
     * @en decode a mesh.
     *
     * @engineInternal
     */
    static decodeMesh (mesh: Mesh.ICreateInfo): Mesh.ICreateInfo {
        return decodeMesh(mesh);
    }

    /**
     * @en inflate a mesh.
     *
     * @engineInternal
     */
    static inflateMesh (mesh: Mesh.ICreateInfo): Mesh.ICreateInfo {
        return inflateMesh(mesh);
    }
}

export declare namespace createMesh {
    /**
     * @deprecated
     */
    export interface IOptions {
        /**
         * @en calculate mesh's aabb or not
         * @zh 是否计算模型的包围盒。
         */
        calculateBounds?: boolean;
    }
}
