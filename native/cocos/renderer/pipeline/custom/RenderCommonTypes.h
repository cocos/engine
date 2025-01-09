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
// clang-format off
// NOLINTBEGIN(misc-include-cleaner)
#pragma once
#include "cocos/base/Ptr.h"
#include "cocos/base/std/container/string.h"
#include "cocos/base/std/hash/hash.h"
#include "cocos/renderer/gfx-base/GFXDef-common.h"
#include "cocos/renderer/pipeline/custom/RenderCommonFwd.h"
#include "cocos/scene/Light.h"

namespace cc {

namespace scene {

class ReflectionProbe;

} // namespace scene

} // namespace cc

namespace cc {

namespace render {

enum class UpdateFrequency {
    PER_INSTANCE,
    PER_BATCH,
    PER_PHASE,
    PER_PASS,
    COUNT,
};

enum class ParameterType {
    CONSTANTS,
    CBV,
    UAV,
    SRV,
    TABLE,
    SSV,
};

struct RasterPassTag {};
struct RasterSubpassTag {};
struct ComputeSubpassTag {};
struct ComputeTag {};
struct ResolveTag {};
struct CopyTag {};
struct MoveTag {};
struct RaytraceTag {};

enum class ResourceResidency {
    MANAGED,
    MEMORYLESS,
    PERSISTENT,
    EXTERNAL,
    BACKBUFFER,
};

enum class QueueHint {
    NONE,
    OPAQUE,
    MASK,
    BLEND,
    RENDER_OPAQUE = OPAQUE,
    RENDER_CUTOUT = MASK,
    RENDER_TRANSPARENT = BLEND,
};

enum class ResourceDimension {
    BUFFER,
    TEXTURE1D,
    TEXTURE2D,
    TEXTURE3D,
};

enum class ResourceFlags : uint32_t {
    NONE = 0,
    UNIFORM = 0x1,
    INDIRECT = 0x2,
    STORAGE = 0x4,
    SAMPLED = 0x8,
    COLOR_ATTACHMENT = 0x10,
    DEPTH_STENCIL_ATTACHMENT = 0x20,
    INPUT_ATTACHMENT = 0x40,
    SHADING_RATE = 0x80,
    TRANSFER_SRC = 0x100,
    TRANSFER_DST = 0x200,
};

constexpr ResourceFlags operator|(const ResourceFlags lhs, const ResourceFlags rhs) noexcept {
    return static_cast<ResourceFlags>(static_cast<uint32_t>(lhs) | static_cast<uint32_t>(rhs));
}

constexpr ResourceFlags operator&(const ResourceFlags lhs, const ResourceFlags rhs) noexcept {
    return static_cast<ResourceFlags>(static_cast<uint32_t>(lhs) & static_cast<uint32_t>(rhs));
}

constexpr ResourceFlags& operator|=(ResourceFlags& lhs, const ResourceFlags rhs) noexcept {
    return lhs = lhs | rhs;
}

constexpr ResourceFlags& operator&=(ResourceFlags& lhs, const ResourceFlags rhs) noexcept {
    return lhs = lhs & rhs;
}

constexpr bool operator!(ResourceFlags e) noexcept {
    return e == static_cast<ResourceFlags>(0);
}

constexpr ResourceFlags operator~(ResourceFlags e) noexcept {
    return static_cast<ResourceFlags>(~static_cast<std::underlying_type_t<ResourceFlags>>(e));
}

constexpr bool any(ResourceFlags e) noexcept {
    return !!e;
}

struct BufferTag {};
struct TextureTag {};

enum class TaskType {
    SYNC,
    ASYNC,
};

enum class SceneFlags : uint32_t {
    NONE = 0,
    OPAQUE = 0x1,
    MASK = 0x2,
    BLEND = 0x4,
    OPAQUE_OBJECT = OPAQUE,
    CUTOUT_OBJECT = MASK,
    TRANSPARENT_OBJECT = BLEND,
    SHADOW_CASTER = 0x8,
    UI = 0x10,
    DEFAULT_LIGHTING = 0x20,
    VOLUMETRIC_LIGHTING = 0x40,
    CLUSTERED_LIGHTING = 0x80,
    PLANAR_SHADOW = 0x100,
    GEOMETRY = 0x200,
    PROFILER = 0x400,
    DRAW_INSTANCING = 0x800,
    DRAW_NON_INSTANCING = 0x1000,
    REFLECTION_PROBE = 0x2000,
    GPU_DRIVEN = 0x4000,
    NON_BUILTIN = 0x8000,
    ALL = 0xFFFFFFFF,
};

constexpr SceneFlags operator|(const SceneFlags lhs, const SceneFlags rhs) noexcept {
    return static_cast<SceneFlags>(static_cast<uint32_t>(lhs) | static_cast<uint32_t>(rhs));
}

constexpr SceneFlags operator&(const SceneFlags lhs, const SceneFlags rhs) noexcept {
    return static_cast<SceneFlags>(static_cast<uint32_t>(lhs) & static_cast<uint32_t>(rhs));
}

constexpr SceneFlags& operator|=(SceneFlags& lhs, const SceneFlags rhs) noexcept {
    return lhs = lhs | rhs;
}

constexpr SceneFlags& operator&=(SceneFlags& lhs, const SceneFlags rhs) noexcept {
    return lhs = lhs & rhs;
}

constexpr bool operator!(SceneFlags e) noexcept {
    return e == static_cast<SceneFlags>(0);
}

constexpr SceneFlags operator~(SceneFlags e) noexcept {
    return static_cast<SceneFlags>(~static_cast<std::underlying_type_t<SceneFlags>>(e));
}

constexpr bool any(SceneFlags e) noexcept {
    return !!e;
}

enum class LightingMode : uint32_t {
    NONE,
    DEFAULT,
    CLUSTERED,
};

enum class AttachmentType {
    RENDER_TARGET,
    DEPTH_STENCIL,
    SHADING_RATE,
};

enum class AccessType : uint8_t {
    READ,
    READ_WRITE,
    WRITE,
};

enum class ClearValueType {
    NONE,
    FLOAT_TYPE,
    INT_TYPE,
};

struct LightInfo {
    LightInfo() = default;
    LightInfo(IntrusivePtr<scene::Light> lightIn, uint32_t levelIn, bool culledByLightIn, scene::ReflectionProbe* probeIn) noexcept
    : light(std::move(lightIn)),
      probe(probeIn),
      level(levelIn),
      culledByLight(culledByLightIn) {}
    LightInfo(IntrusivePtr<scene::Light> lightIn, uint32_t levelIn) noexcept
    : light(std::move(lightIn)),
      level(levelIn) {}

    IntrusivePtr<scene::Light> light;
    scene::ReflectionProbe* probe{nullptr};
    uint32_t level{0};
    bool culledByLight{false};
};

enum class ResolveFlags : uint32_t {
    NONE = 0,
    COLOR = 1 << 0,
    DEPTH = 1 << 1,
    STENCIL = 1 << 2,
};

constexpr ResolveFlags operator|(const ResolveFlags lhs, const ResolveFlags rhs) noexcept {
    return static_cast<ResolveFlags>(static_cast<uint32_t>(lhs) | static_cast<uint32_t>(rhs));
}

constexpr ResolveFlags operator&(const ResolveFlags lhs, const ResolveFlags rhs) noexcept {
    return static_cast<ResolveFlags>(static_cast<uint32_t>(lhs) & static_cast<uint32_t>(rhs));
}

constexpr ResolveFlags& operator|=(ResolveFlags& lhs, const ResolveFlags rhs) noexcept {
    return lhs = lhs | rhs;
}

constexpr ResolveFlags& operator&=(ResolveFlags& lhs, const ResolveFlags rhs) noexcept {
    return lhs = lhs & rhs;
}

constexpr bool operator!(ResolveFlags e) noexcept {
    return e == static_cast<ResolveFlags>(0);
}

constexpr ResolveFlags operator~(ResolveFlags e) noexcept {
    return static_cast<ResolveFlags>(~static_cast<std::underlying_type_t<ResolveFlags>>(e));
}

constexpr bool any(ResolveFlags e) noexcept {
    return !!e;
}

struct ResolvePair {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {source.get_allocator().resource()};
    }

    ResolvePair(const allocator_type& alloc = boost::container::pmr::get_default_resource()) noexcept; // NOLINT
    ResolvePair(ccstd::pmr::string sourceIn, ccstd::pmr::string targetIn, ResolveFlags resolveFlagsIn, gfx::ResolveMode modeIn, gfx::ResolveMode mode1In, const allocator_type& alloc = boost::container::pmr::get_default_resource());
    ResolvePair(ResolvePair&& rhs, const allocator_type& alloc);
    ResolvePair(ResolvePair const& rhs, const allocator_type& alloc);

    ResolvePair(ResolvePair&& rhs) noexcept = default;
    ResolvePair(ResolvePair const& rhs) = delete;
    ResolvePair& operator=(ResolvePair&& rhs) = default;
    ResolvePair& operator=(ResolvePair const& rhs) = default;

    ccstd::pmr::string source;
    ccstd::pmr::string target;
    ResolveFlags resolveFlags{ResolveFlags::NONE};
    gfx::ResolveMode mode{gfx::ResolveMode::SAMPLE_ZERO};
    gfx::ResolveMode mode1{gfx::ResolveMode::SAMPLE_ZERO};
};

inline bool operator==(const ResolvePair& lhs, const ResolvePair& rhs) noexcept {
    return std::forward_as_tuple(lhs.source, lhs.target, lhs.resolveFlags, lhs.mode, lhs.mode1) ==
           std::forward_as_tuple(rhs.source, rhs.target, rhs.resolveFlags, rhs.mode, rhs.mode1);
}

inline bool operator!=(const ResolvePair& lhs, const ResolvePair& rhs) noexcept {
    return !(lhs == rhs);
}

struct CopyPair {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {source.get_allocator().resource()};
    }

    CopyPair(const allocator_type& alloc = boost::container::pmr::get_default_resource()) noexcept; // NOLINT
    CopyPair(ccstd::pmr::string sourceIn, ccstd::pmr::string targetIn, uint32_t mipLevelsIn, uint32_t numSlicesIn, uint32_t sourceMostDetailedMipIn, uint32_t sourceFirstSliceIn, uint32_t sourcePlaneSliceIn, uint32_t targetMostDetailedMipIn, uint32_t targetFirstSliceIn, uint32_t targetPlaneSliceIn, const allocator_type& alloc = boost::container::pmr::get_default_resource());
    CopyPair(CopyPair&& rhs, const allocator_type& alloc);
    CopyPair(CopyPair const& rhs, const allocator_type& alloc);

    CopyPair(CopyPair&& rhs) noexcept = default;
    CopyPair(CopyPair const& rhs) = delete;
    CopyPair& operator=(CopyPair&& rhs) = default;
    CopyPair& operator=(CopyPair const& rhs) = default;

    ccstd::pmr::string source;
    ccstd::pmr::string target;
    uint32_t mipLevels{0xFFFFFFFF};
    uint32_t numSlices{0xFFFFFFFF};
    uint32_t sourceMostDetailedMip{0};
    uint32_t sourceFirstSlice{0};
    uint32_t sourcePlaneSlice{0};
    uint32_t targetMostDetailedMip{0};
    uint32_t targetFirstSlice{0};
    uint32_t targetPlaneSlice{0};
};

struct UploadPair {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {target.get_allocator().resource()};
    }

    UploadPair(const allocator_type& alloc = boost::container::pmr::get_default_resource()) noexcept; // NOLINT
    UploadPair(ccstd::vector<uint8_t> sourceIn, ccstd::pmr::string targetIn, uint32_t mipLevelsIn, uint32_t numSlicesIn, uint32_t targetMostDetailedMipIn, uint32_t targetFirstSliceIn, uint32_t targetPlaneSliceIn, const allocator_type& alloc = boost::container::pmr::get_default_resource());
    UploadPair(UploadPair&& rhs, const allocator_type& alloc);

    UploadPair(UploadPair&& rhs) noexcept = default;
    UploadPair(UploadPair const& rhs) = delete;
    UploadPair& operator=(UploadPair&& rhs) = default;
    UploadPair& operator=(UploadPair const& rhs) = delete;

    ccstd::vector<uint8_t> source;
    ccstd::pmr::string target;
    uint32_t mipLevels{0xFFFFFFFF};
    uint32_t numSlices{0xFFFFFFFF};
    uint32_t targetMostDetailedMip{0};
    uint32_t targetFirstSlice{0};
    uint32_t targetPlaneSlice{0};
};

struct MovePair {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {source.get_allocator().resource()};
    }

    MovePair(const allocator_type& alloc = boost::container::pmr::get_default_resource()) noexcept; // NOLINT
    MovePair(ccstd::pmr::string sourceIn, ccstd::pmr::string targetIn, uint32_t mipLevelsIn, uint32_t numSlicesIn, uint32_t targetMostDetailedMipIn, uint32_t targetFirstSliceIn, uint32_t targetPlaneSliceIn, const allocator_type& alloc = boost::container::pmr::get_default_resource());
    MovePair(MovePair&& rhs, const allocator_type& alloc);
    MovePair(MovePair const& rhs, const allocator_type& alloc);

    MovePair(MovePair&& rhs) noexcept = default;
    MovePair(MovePair const& rhs) = delete;
    MovePair& operator=(MovePair&& rhs) = default;
    MovePair& operator=(MovePair const& rhs) = default;

    ccstd::pmr::string source;
    ccstd::pmr::string target;
    uint32_t mipLevels{0xFFFFFFFF};
    uint32_t numSlices{0xFFFFFFFF};
    uint32_t targetMostDetailedMip{0};
    uint32_t targetFirstSlice{0};
    uint32_t targetPlaneSlice{0};
};

struct PipelineStatistics {
    uint32_t numRenderPasses{0};
    uint32_t numManagedTextures{0};
    uint32_t totalManagedTextures{0};
    uint32_t numUploadBuffers{0};
    uint32_t numUploadBufferViews{0};
    uint32_t numFreeUploadBuffers{0};
    uint32_t numFreeUploadBufferViews{0};
    uint32_t numDescriptorSets{0};
    uint32_t numFreeDescriptorSets{0};
    uint32_t numInstancingBuffers{0};
    uint32_t numInstancingUniformBlocks{0};
};

} // namespace render

} // namespace cc

namespace ccstd {

inline hash_t hash<cc::render::ResolvePair>::operator()(const cc::render::ResolvePair& val) const noexcept {
    hash_t seed = 0;
    hash_combine(seed, val.source);
    hash_combine(seed, val.target);
    hash_combine(seed, val.resolveFlags);
    hash_combine(seed, val.mode);
    hash_combine(seed, val.mode1);
    return seed;
}

} // namespace ccstd

// NOLINTEND(misc-include-cleaner)
// clang-format on
