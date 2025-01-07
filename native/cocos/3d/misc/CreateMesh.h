/****************************************************************************
 Copyright (c) 2021-2023 Xiamen Yaji Software Co., Ltd.

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
****************************************************************************/
#pragma once

#include "base/std/optional.h"

#include "3d/assets/Mesh.h"
#include "primitive/PrimitiveDefine.h"

namespace cc {

struct ICreateMeshOptions {
    /**
     * @en calculate mesh's aabb or not
     * @zh 是否计算模型的包围盒。
     */
    ccstd::optional<bool> calculateBounds;
};

struct ICreateDynamicMeshOptions {
    /**
     * @en max submesh count
     * @zh 最大子模型个数。
     */
    uint32_t maxSubMeshes{1U};

    /**
     * @en max submesh vertex count
     * @zh 子模型最大顶点个数。
     */
    uint32_t maxSubMeshVertices{1024U};

    /**
     * @en max submesh index count
     * @zh 子模型最大索引个数。
     */
    uint32_t maxSubMeshIndices{1024U};
};

/**
 * @en mesh utility class, use to create mesh.
 * @zh 网格工具类，用于创建网格。
 */
class MeshUtils {
public:
    /**
     * @en create a static mesh.
     * @zh 创建一个静态网格。
     */
    static Mesh *createMesh(const IGeometry &geometry, Mesh *out = nullptr, const ccstd::optional<ICreateMeshOptions> &options = {});

    /**
     * @en create a static mesh ICreateInfo.
     * @zh 创建一个静态网格ICreateInfo。
     */
    static Mesh::ICreateInfo createMeshInfo(const IGeometry &geometry, const ccstd::optional<ICreateMeshOptions> &options = {});

    /**
     * @en create a dynamic mesh.
     * @zh 创建一个动态网格。
     */
    static Mesh *createDynamicMesh(index_t primitiveIndex, const IDynamicGeometry &geometry, Mesh *out = nullptr, const ccstd::optional<ICreateDynamicMeshOptions> &options = {});

    /**
     * @en create a dynamic mesh ICreateInfo.
     * @zh 创建一个动态网格ICreateInfo。
     */
    static Mesh::ICreateInfo createDynamicMeshInfo(const IDynamicGeometry &geometry, const ccstd::optional<ICreateDynamicMeshOptions> &options = {});

    /**
     * 
     */
    static void inflateMesh(const Mesh::IStruct &structInfo, Uint8Array &data);

    static void decodeMesh(Mesh::IStruct &structInfo, Uint8Array &data);

    static void dequantizeMesh(Mesh::IStruct &structInfo, Uint8Array &data);
};

} // namespace cc
