/****************************************************************************
 Copyright (c) 2022-2023 Xiamen Yaji Software Co., Ltd.

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
****************************************************************************/

#include "3d/misc/CreateMesh.h"
#include <zlib.h>
#include <algorithm>
#include "3d/misc/Buffer.h"
#include "3d/misc/BufferBlob.h"
#include "core/ArrayBuffer.h"
#include "core/DataView.h"
#include "core/assets/RenderingSubMesh.h"
#include "meshopt/meshoptimizer.h"
#include "renderer/gfx-base/GFXDef-common.h"

namespace cc {
namespace {
gfx::AttributeList defAttrs = {
    gfx::Attribute{gfx::ATTR_NAME_POSITION, gfx::Format::RGB32F},
    gfx::Attribute{gfx::ATTR_NAME_NORMAL, gfx::Format::RGB32F},
    gfx::Attribute{gfx::ATTR_NAME_TEX_COORD, gfx::Format::RG32F},
    gfx::Attribute{gfx::ATTR_NAME_TANGENT, gfx::Format::RGBA32F},
    gfx::Attribute{gfx::ATTR_NAME_COLOR, gfx::Format::RGBA32F},
};
} // namespace

Mesh *MeshUtils::createMesh(const IGeometry &geometry, Mesh *out /*= nullptr*/, const ccstd::optional<ICreateMeshOptions> &options /*= {} */) {
    if (!out) {
        out = ccnew Mesh();
    }

    out->reset(createMeshInfo(geometry, options));
    return out;
}

Mesh::ICreateInfo MeshUtils::createMeshInfo(const IGeometry &geometry, const ccstd::optional<ICreateMeshOptions> &aOptions /* = {} */) {
    ICreateMeshOptions options;
    if (aOptions.has_value()) {
        options = aOptions.value();
    }
    // Collect attributes and calculate length of result vertex buffer.
    gfx::AttributeList attributes;
    uint32_t stride = 0;
    struct Channel {
        uint32_t offset{0};
        ccstd::vector<float> data; // float?
        gfx::Attribute attribute;
    };
    ccstd::vector<Channel> channels;
    uint32_t vertCount = 0;

    const gfx::Attribute *attr = nullptr;

    ccstd::vector<float> positions(geometry.positions);

    if (!positions.empty()) {
        attr = nullptr;
        if (geometry.attributes.has_value()) {
            for (const auto &att : geometry.attributes.value()) {
                if (att.name == gfx::ATTR_NAME_POSITION) {
                    attr = &att;
                    break;
                }
            }
        }

        if (attr == nullptr) {
            attr = &defAttrs[0];
        }

        attributes.emplace_back(*attr);
        const auto &info = gfx::GFX_FORMAT_INFOS[static_cast<uint32_t>(attr->format)];
        vertCount = std::max(vertCount, static_cast<uint32_t>(std::floor(positions.size() / info.count)));
        channels.emplace_back(Channel{stride, positions, *attr});
        stride += info.size;
    }

    if (geometry.normals.has_value() && !geometry.normals.value().empty()) {
        attr = nullptr;
        if (geometry.attributes.has_value()) {
            for (const auto &att : geometry.attributes.value()) {
                if (att.name == gfx::ATTR_NAME_NORMAL) {
                    attr = &att;
                    break;
                }
            }
        }

        if (attr == nullptr) {
            attr = &defAttrs[1];
        }

        attributes.emplace_back(*attr);
        const auto &info = gfx::GFX_FORMAT_INFOS[static_cast<uint32_t>(attr->format)];
        vertCount = std::max(vertCount, static_cast<uint32_t>(std::floor(geometry.normals->size() / info.count)));
        channels.emplace_back(Channel{stride, geometry.normals.value(), *attr});
        stride += info.size;
    }

    if (geometry.uvs.has_value() && !geometry.uvs.value().empty()) {
        attr = nullptr;
        if (geometry.attributes.has_value()) {
            for (const auto &att : geometry.attributes.value()) {
                if (att.name == gfx::ATTR_NAME_TEX_COORD) {
                    attr = &att;
                    break;
                }
            }
        }

        if (attr == nullptr) {
            attr = &defAttrs[2];
        }

        attributes.emplace_back(*attr);
        const auto &info = gfx::GFX_FORMAT_INFOS[static_cast<uint32_t>(attr->format)];
        vertCount = std::max(vertCount, static_cast<uint32_t>(std::floor(geometry.uvs->size() / info.count)));
        channels.emplace_back(Channel{stride, geometry.uvs.value(), *attr});
        stride += info.size;
    }

    if (geometry.tangents.has_value() && !geometry.tangents.value().empty()) {
        attr = nullptr;
        if (geometry.attributes.has_value()) {
            for (const auto &att : geometry.attributes.value()) {
                if (att.name == gfx::ATTR_NAME_TANGENT) {
                    attr = &att;
                    break;
                }
            }
        }

        if (attr == nullptr) {
            attr = &defAttrs[3];
        }

        attributes.emplace_back(*attr);
        const auto &info = gfx::GFX_FORMAT_INFOS[static_cast<uint32_t>(attr->format)];
        vertCount = std::max(vertCount, static_cast<uint32_t>(std::floor(geometry.tangents->size() / info.count)));
        channels.emplace_back(Channel{stride, geometry.tangents.value(), *attr});
        stride += info.size;
    }

    if (geometry.colors.has_value() && !geometry.colors.value().empty()) {
        attr = nullptr;
        if (geometry.attributes.has_value()) {
            for (const auto &att : geometry.attributes.value()) {
                if (att.name == gfx::ATTR_NAME_COLOR) {
                    attr = &att;
                    break;
                }
            }
        }

        if (attr == nullptr) {
            attr = &defAttrs[4];
        }

        attributes.emplace_back(*attr);
        const auto &info = gfx::GFX_FORMAT_INFOS[static_cast<uint32_t>(attr->format)];
        vertCount = std::max(vertCount, static_cast<uint32_t>(std::floor(geometry.colors->size() / info.count)));
        channels.emplace_back(Channel{stride, geometry.colors.value(), *attr});
        stride += info.size;
    }

    if (geometry.customAttributes.has_value()) {
        for (const auto &ca : geometry.customAttributes.value()) {
            const auto &info = gfx::GFX_FORMAT_INFOS[static_cast<uint32_t>(attr->format)];
            attributes.emplace_back(ca.attr);
            vertCount = std::max(vertCount, static_cast<uint32_t>(std::floor(ca.values.size() / info.count)));
            channels.emplace_back(Channel{stride, ca.values, ca.attr});
            stride += info.size;
        }
    }

    // Use this to generate final merged buffer.
    BufferBlob bufferBlob;

    // Fill vertex buffer.
    auto *vertexBuffer = ccnew ArrayBuffer(vertCount * stride);
    DataView vertexBufferView(vertexBuffer);
    for (const auto &channel : channels) {
        writeBuffer(vertexBufferView, channel.data, channel.attribute.format, channel.offset, stride);
    }
    bufferBlob.setNextAlignment(0);
    Mesh::IVertexBundle vertexBundle;
    Mesh::IBufferView buffferView;

    buffferView.offset = bufferBlob.getLength();
    buffferView.length = static_cast<uint32_t>(vertexBuffer->byteLength());
    buffferView.count = vertCount;
    buffferView.stride = stride;
    vertexBundle.attributes = attributes;
    vertexBundle.view = buffferView;

    bufferBlob.addBuffer(vertexBuffer);

    // Fill index buffer.
    ArrayBuffer::Ptr indexBuffer;
    uint32_t idxCount = 0;
    const uint32_t idxStride = 2;
    if (geometry.indices.has_value()) {
        const ccstd::vector<uint32_t> &indices = geometry.indices.value();
        idxCount = static_cast<uint32_t>(indices.size());
        indexBuffer = ccnew ArrayBuffer(idxStride * idxCount);
        DataView indexBufferView(indexBuffer);
        writeBuffer(indexBufferView, indices, gfx::Format::R16UI);
    }

    // Create primitive.
    Mesh::ISubMesh primitive;
    primitive.vertexBundelIndices = {0};
    primitive.primitiveMode = geometry.primitiveMode.has_value() ? geometry.primitiveMode.value() : gfx::PrimitiveMode::TRIANGLE_LIST;

    if (indexBuffer) {
        bufferBlob.setNextAlignment(idxStride);
        Mesh::IBufferView bufferView;
        bufferView.offset = bufferBlob.getLength();
        bufferView.length = indexBuffer->byteLength();
        bufferView.count = idxCount;
        bufferView.stride = idxStride;
        primitive.indexView = bufferView;
        bufferBlob.addBuffer(indexBuffer);
    }

    ccstd::optional<Vec3> minPosition = geometry.minPos;
    if (!minPosition.has_value() && options.calculateBounds.has_value() && options.calculateBounds.value()) {
        minPosition = Vec3(std::numeric_limits<float>::infinity(), std::numeric_limits<float>::infinity(), std::numeric_limits<float>::infinity());
        for (uint32_t iVertex = 0; iVertex < vertCount; ++iVertex) {
            Vec3::min(minPosition.value(), Vec3(positions[iVertex * 3 + 0], positions[iVertex * 3 + 1], positions[iVertex * 3 + 2]), &minPosition.value());
        }
    }

    ccstd::optional<Vec3> maxPosition = geometry.maxPos;
    if (!maxPosition.has_value() && options.calculateBounds.has_value() && options.calculateBounds.value()) {
        maxPosition = Vec3(-std::numeric_limits<float>::infinity(), -std::numeric_limits<float>::infinity(), -std::numeric_limits<float>::infinity());
        for (uint32_t iVertex = 0; iVertex < vertCount; ++iVertex) {
            Vec3::max(maxPosition.value(), Vec3(positions[iVertex * 3 + 0], positions[iVertex * 3 + 1], positions[iVertex * 3 + 2]), &maxPosition.value());
        }
    }

    // Create mesh struct
    Mesh::IStruct meshStruct;
    meshStruct.vertexBundles = {vertexBundle};
    meshStruct.primitives = {primitive};

    if (minPosition.has_value()) {
        meshStruct.minPosition = minPosition.value();
    }
    if (maxPosition.has_value()) {
        meshStruct.maxPosition = maxPosition.value();
    }

    Mesh::ICreateInfo createInfo;
    createInfo.structInfo = std::move(meshStruct);
    createInfo.data = Uint8Array(bufferBlob.getCombined());
    return createInfo;
}

static inline uint32_t getPadding(uint32_t length, uint32_t align) {
    if (align > 0U) {
        const uint32_t remainder = length % align;
        if (remainder != 0U) {
            const uint32_t padding = align - remainder;
            return padding;
        }
    }

    return 0U;
}

Mesh *MeshUtils::createDynamicMesh(index_t primitiveIndex, const IDynamicGeometry &geometry, Mesh *out /*= nullptr*/, const ccstd::optional<ICreateDynamicMeshOptions> &options /*= {} */) {
    if (!out) {
        out = ccnew Mesh();
    }

    out->reset(MeshUtils::createDynamicMeshInfo(geometry, options));
    out->initialize();
    out->updateSubMesh(primitiveIndex, geometry);

    return out;
}

Mesh::ICreateInfo MeshUtils::createDynamicMeshInfo(const IDynamicGeometry &geometry, const ccstd::optional<ICreateDynamicMeshOptions> &aOptions /* = {} */) {
    ICreateDynamicMeshOptions options;
    if (aOptions.has_value()) {
        options = aOptions.value();
    }
    
    gfx::AttributeList attributes;
    uint32_t stream = 0U;

    if (!geometry.positions.empty()) {
        attributes.push_back({gfx::ATTR_NAME_POSITION, gfx::Format::RGB32F, false, stream++, false, 0U});
    }

    if (geometry.normals.has_value() && !geometry.normals.value().empty()) {
        attributes.push_back({gfx::ATTR_NAME_NORMAL, gfx::Format::RGB32F, false, stream++, false, 0U});
    }

    if (geometry.uvs.has_value() && !geometry.uvs.value().empty()) {
        attributes.push_back({gfx::ATTR_NAME_TEX_COORD, gfx::Format::RG32F, false, stream++, false, 0U});
    }

    if (geometry.tangents.has_value() && !geometry.tangents.value().empty()) {
        attributes.push_back({gfx::ATTR_NAME_TANGENT, gfx::Format::RGBA32F, false, stream++, false, 0U});
    }

    if (geometry.colors.has_value() && !geometry.colors.value().empty()) {
        attributes.push_back({gfx::ATTR_NAME_COLOR, gfx::Format::RGBA32F, false, stream++, false, 0U});
    }

    if (geometry.customAttributes.has_value()) {
        for (const auto &ca : geometry.customAttributes.value()) {
            auto attr = ca.attr;
            attr.stream = stream++;
            attributes.emplace_back(attr);
        }
    }

    ccstd::vector<Mesh::IVertexBundle> vertexBundles;
    ccstd::vector<Mesh::ISubMesh> primitives;
    uint32_t dataSize = 0U;

    for (auto i = 0U; i < options.maxSubMeshes; i++) {
        Mesh::ISubMesh primitive;
        primitive.primitiveMode = geometry.primitiveMode.has_value() ? geometry.primitiveMode.value() : gfx::PrimitiveMode::TRIANGLE_LIST;

        // add vertex buffers
        for (const auto &attr : attributes) {
            const auto &formatInfo = gfx::GFX_FORMAT_INFOS[static_cast<uint32_t>(attr.format)];
            uint32_t vertexBufferSize = options.maxSubMeshVertices * formatInfo.size;

            Mesh::IBufferView vertexView = {
                dataSize,
                vertexBufferSize,
                0U,
                formatInfo.size};

            Mesh::IVertexBundle vertexBundle = {
                0U,
                vertexView,
                {attr}};

            const auto vertexBundleIndex = static_cast<uint32_t>(vertexBundles.size());
            primitive.vertexBundelIndices.emplace_back(vertexBundleIndex);
            vertexBundles.emplace_back(vertexBundle);
            dataSize += vertexBufferSize;
        }

        // add index buffer
        uint32_t stride = 0U;
        if (geometry.indices16.has_value() && !geometry.indices16.value().empty()) {
            stride = sizeof(uint16_t);
        } else if (geometry.indices32.has_value() && !geometry.indices32.value().empty()) {
            stride = sizeof(uint32_t);
        }

        if (stride > 0U) {
            dataSize += getPadding(dataSize, stride);
            uint32_t indexBufferSize = options.maxSubMeshIndices * stride;

            Mesh::IBufferView indexView = {
                dataSize,
                indexBufferSize,
                0U,
                stride};

            primitive.indexView = indexView;
            dataSize += indexBufferSize;
        }

        primitives.emplace_back(primitive);
    }

    Mesh::IDynamicInfo dynamicInfo = {options.maxSubMeshes,
                                      options.maxSubMeshVertices,
                                      options.maxSubMeshIndices};

    Mesh::IDynamicStruct dynamicStruct;
    dynamicStruct.info = dynamicInfo;
    dynamicStruct.bounds.resize(options.maxSubMeshes);
    for (auto &bound : dynamicStruct.bounds) {
        bound.setValid(false);
    }

    Mesh::IStruct meshStruct;
    meshStruct.vertexBundles = vertexBundles;
    meshStruct.primitives = primitives;
    meshStruct.dynamic = std::move(dynamicStruct);

    Mesh::ICreateInfo createInfo;
    createInfo.structInfo = std::move(meshStruct);
    createInfo.data = Uint8Array(dataSize);
    return createInfo;
}

void MeshUtils::inflateMesh(const Mesh::IStruct &structInfo, Uint8Array &data) {
    uLongf uncompressedSize = 0U;
    for (const auto &prim : structInfo.primitives) {
        if (prim.indexView.has_value()) {
            uncompressedSize += prim.indexView->length + prim.indexView->stride;
        }
        if (prim.cluster.has_value()) {
            uncompressedSize += prim.cluster->vertexView.length + prim.cluster->vertexView.stride;
            uncompressedSize += prim.cluster->triangleView.length + prim.cluster->triangleView.stride;
            uncompressedSize += prim.cluster->clusterView.length + prim.cluster->clusterView.stride;
            uncompressedSize += prim.cluster->coneView.length + prim.cluster->coneView.stride;
        }
    }
    for (const auto &vb : structInfo.vertexBundles) {
        uncompressedSize += vb.view.length + vb.view.stride;
    }
    auto uncompressedData = Uint8Array(static_cast<uint32_t>(uncompressedSize));
    auto res = uncompress(uncompressedData.buffer()->getData(), &uncompressedSize, data.buffer()->getData(), data.byteLength());
    data = Uint8Array(uncompressedData.buffer(), 0, static_cast<uint32_t>(uncompressedSize));
}

void MeshUtils::decodeMesh(Mesh::IStruct &structInfo, Uint8Array &data) {
    BufferBlob bufferBlob;

    for (auto &bundle : structInfo.vertexBundles) {
        auto &view = bundle.view;
        auto bound = view.count * view.stride;
        auto *buffer = ccnew ArrayBuffer(bound);
        auto vertex = Uint8Array(data.buffer(), view.offset, view.length);
        int res = meshopt_decodeVertexBuffer(buffer->getData(), view.count, view.stride, vertex.buffer()->getData() + vertex.byteOffset(), view.length);
        if (res < 0) {
            assert(false && "failed to decode vertex buffer");
        }

        bufferBlob.setNextAlignment(view.stride);
        Mesh::IVertexBundle vertexBundle;
        Mesh::IBufferView buffferView;
        buffferView.offset = bufferBlob.getLength();
        buffferView.length = bound;
        buffferView.count = view.count;
        buffferView.stride = view.stride;
        bufferBlob.addBuffer(buffer);

        bundle.view = buffferView;
    }

    for (auto &primitive : structInfo.primitives) {
        if (!primitive.indexView.has_value()) {
            continue;
        }

        auto view = *primitive.indexView;
        auto bound = view.count * view.stride;
        auto *buffer = ccnew ArrayBuffer(bound);
        auto index = DataView(data.buffer(), view.offset, view.length);
        int res = meshopt_decodeIndexBuffer(buffer->getData(), view.count, view.stride, index.buffer()->getData() + index.byteOffset(), view.length);
        if (res < 0) {
            assert(false && "failed to decode index buffer");
        }

        bufferBlob.setNextAlignment(view.stride);
        Mesh::IBufferView buffferView;
        buffferView.offset = bufferBlob.getLength();
        buffferView.length = bound;
        buffferView.count = view.count;
        buffferView.stride = view.stride;
        bufferBlob.addBuffer(buffer);

        primitive.indexView = buffferView;
    }

    data = Uint8Array(bufferBlob.getCombined());
}

} // namespace cc
