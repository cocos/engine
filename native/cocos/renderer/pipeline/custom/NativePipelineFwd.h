/*
 Copyright (c) 2021-2024 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com

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

/**
 * ========================= !DO NOT CHANGE THE FOLLOWING SECTION MANUALLY! =========================
 * The following section is auto-generated.
 * ========================= !DO NOT CHANGE THE FOLLOWING SECTION MANUALLY! =========================
 */
#pragma once
// clang-format off
// IWYU pragma: begin_exports
#include "cocos/renderer/pipeline/custom/NativeFwd.h"
// IWYU pragma: end_exports

namespace cc {

namespace scene {

class ReflectionProbe;

} // namespace scene

namespace render {

template <class T>
using Array4 = std::array<T, 4>;

struct RenderGraphVisitorContext;

} // namespace render

} // namespace cc

#include "cocos/base/std/hash/hash.h"

namespace cc {

namespace render {

struct RenderGraphFilter;
class NativeRenderNode;
class NativeSetter;
class NativeSceneBuilder;
class NativeRenderSubpassBuilderImpl;
class NativeRenderQueueBuilder;
class NativeRenderSubpassBuilder;
class NativeMultisampleRenderSubpassBuilder;
class NativeComputeSubpassBuilder;
class NativeRenderPassBuilder;
class NativeMultisampleRenderPassBuilder;
class NativeComputeQueueBuilder;
class NativeComputePassBuilder;
struct RenderInstancingQueue;
struct DrawInstance;
struct ProbeHelperQueue;
struct RenderDrawQueue;
struct NativeRenderQueue;
struct ResourceGroup;
struct BufferPool;
struct DescriptorSetPool;
struct UniformBlockResource;
struct ProgramResource;
struct LayoutGraphNodeResource;
struct QuadResource;

enum class ResourceType : uint8_t;

struct SceneResource;
struct FrustumCullingKey;
struct FrustumCullingID;
struct FrustumCulling;
struct LightBoundsCullingID;
struct LightBoundsCullingKey;
struct LightBoundsCulling;
struct NativeRenderQueueID;
struct NativeRenderQueueKey;
struct NativeRenderQueueQuery;
struct LightBoundsCullingResult;
struct SceneCulling;
struct LightResource;
struct NativeRenderContext;
class NativeProgramLibrary;
struct PipelineCustomization;
struct BuiltinShadowTransform;
struct BuiltinCascadedShadowMapKey;
struct BuiltinCascadedShadowMap;
class NativePipeline;
class NativeProgramProxy;
class NativeRenderingModule;

} // namespace render

} // namespace cc

namespace ccstd {

template <>
struct hash<cc::render::FrustumCullingKey> {
    hash_t operator()(const cc::render::FrustumCullingKey& val) const noexcept;
};

template <>
struct hash<cc::render::FrustumCullingID> {
    hash_t operator()(const cc::render::FrustumCullingID& val) const noexcept;
};

template <>
struct hash<cc::render::LightBoundsCullingID> {
    hash_t operator()(const cc::render::LightBoundsCullingID& val) const noexcept;
};

template <>
struct hash<cc::render::LightBoundsCullingKey> {
    hash_t operator()(const cc::render::LightBoundsCullingKey& val) const noexcept;
};

template <>
struct hash<cc::render::NativeRenderQueueKey> {
    hash_t operator()(const cc::render::NativeRenderQueueKey& val) const noexcept;
};

} // namespace ccstd

// clang-format on
