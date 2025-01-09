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
#pragma once
#include <boost/graph/adjacency_iterator.hpp>
#include <boost/graph/graph_traits.hpp>
#include <boost/graph/properties.hpp>
#include <boost/range/irange.hpp>
#include "cocos/base/Ptr.h"
#include "cocos/base/std/container/string.h"
#include "cocos/base/std/container/vector.h"
#include "cocos/base/std/hash/hash.h"
#include "cocos/core/assets/Material.h"
#include "cocos/renderer/gfx-base/GFXBuffer.h"
#include "cocos/renderer/gfx-base/GFXFramebuffer.h"
#include "cocos/renderer/gfx-base/GFXRenderPass.h"
#include "cocos/renderer/gfx-base/GFXSwapchain.h"
#include "cocos/renderer/gfx-base/GFXTexture.h"
#include "cocos/renderer/gfx-base/states/GFXSampler.h"
#include "cocos/renderer/pipeline/custom/RenderCommonTypes.h"
#include "cocos/renderer/pipeline/custom/RenderGraphFwd.h"
#include "cocos/renderer/pipeline/custom/details/GraphTypes.h"
#include "cocos/renderer/pipeline/custom/details/Map.h"
#include "cocos/scene/Camera.h"

namespace cc {

namespace render {

struct ClearValue {
    ClearValue() = default;
    ClearValue(double xIn, double yIn, double zIn, double wIn) noexcept // NOLINT
    : x(xIn),
      y(yIn),
      z(zIn),
      w(wIn) {}

    double x{0};
    double y{0};
    double z{0};
    double w{0};
};

inline bool operator==(const ClearValue& lhs, const ClearValue& rhs) noexcept {
    return std::forward_as_tuple(lhs.x, lhs.y, lhs.z, lhs.w) ==
           std::forward_as_tuple(rhs.x, rhs.y, rhs.z, rhs.w);
}

inline bool operator!=(const ClearValue& lhs, const ClearValue& rhs) noexcept {
    return !(lhs == rhs);
}

struct RasterView {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {slotName.get_allocator().resource()};
    }

    RasterView(const allocator_type& alloc = boost::container::pmr::get_default_resource()) noexcept; // NOLINT
    RasterView(ccstd::pmr::string slotNameIn, AccessType accessTypeIn, AttachmentType attachmentTypeIn, gfx::LoadOp loadOpIn, gfx::StoreOp storeOpIn, gfx::ClearFlagBit clearFlagsIn, const gfx::Color& clearColorIn, gfx::ShaderStageFlagBit shaderStageFlagsIn, const allocator_type& alloc = boost::container::pmr::get_default_resource());
    RasterView(ccstd::pmr::string slotNameIn, ccstd::pmr::string slotName1In, AccessType accessTypeIn, AttachmentType attachmentTypeIn, gfx::LoadOp loadOpIn, gfx::StoreOp storeOpIn, gfx::ClearFlagBit clearFlagsIn, const gfx::Color& clearColorIn, gfx::ShaderStageFlagBit shaderStageFlagsIn, const allocator_type& alloc = boost::container::pmr::get_default_resource());
    RasterView(RasterView&& rhs, const allocator_type& alloc);
    RasterView(RasterView const& rhs, const allocator_type& alloc);

    RasterView(RasterView&& rhs) noexcept = default;
    RasterView(RasterView const& rhs) = delete;
    RasterView& operator=(RasterView&& rhs) = default;
    RasterView& operator=(RasterView const& rhs) = default;

    ccstd::pmr::string slotName;
    ccstd::pmr::string slotName1;
    AccessType accessType{AccessType::WRITE};
    AttachmentType attachmentType{AttachmentType::RENDER_TARGET};
    gfx::LoadOp loadOp{gfx::LoadOp::LOAD};
    gfx::StoreOp storeOp{gfx::StoreOp::STORE};
    gfx::ClearFlagBit clearFlags{gfx::ClearFlagBit::ALL};
    gfx::Color clearColor;
    uint32_t slotID{0};
    gfx::ShaderStageFlagBit shaderStageFlags{gfx::ShaderStageFlagBit::NONE};
};

inline bool operator==(const RasterView& lhs, const RasterView& rhs) noexcept {
    return std::forward_as_tuple(lhs.slotName, lhs.slotName1, lhs.accessType, lhs.attachmentType, lhs.loadOp, lhs.storeOp, lhs.clearFlags, lhs.clearColor, lhs.shaderStageFlags) ==
           std::forward_as_tuple(rhs.slotName, rhs.slotName1, rhs.accessType, rhs.attachmentType, rhs.loadOp, rhs.storeOp, rhs.clearFlags, rhs.clearColor, rhs.shaderStageFlags);
}

inline bool operator!=(const RasterView& lhs, const RasterView& rhs) noexcept {
    return !(lhs == rhs);
}

struct ComputeView {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {name.get_allocator().resource()};
    }

    ComputeView(const allocator_type& alloc = boost::container::pmr::get_default_resource()) noexcept; // NOLINT
    ComputeView(ccstd::pmr::string nameIn, AccessType accessTypeIn, gfx::ClearFlagBit clearFlagsIn, ClearValueType clearValueTypeIn, ClearValue clearValueIn, gfx::ShaderStageFlagBit shaderStageFlagsIn, const allocator_type& alloc = boost::container::pmr::get_default_resource());
    ComputeView(ccstd::pmr::string nameIn, AccessType accessTypeIn, uint32_t planeIn, gfx::ClearFlagBit clearFlagsIn, ClearValueType clearValueTypeIn, ClearValue clearValueIn, gfx::ShaderStageFlagBit shaderStageFlagsIn, const allocator_type& alloc = boost::container::pmr::get_default_resource());
    ComputeView(ComputeView&& rhs, const allocator_type& alloc);
    ComputeView(ComputeView const& rhs, const allocator_type& alloc);

    ComputeView(ComputeView&& rhs) noexcept = default;
    ComputeView(ComputeView const& rhs) = delete;
    ComputeView& operator=(ComputeView&& rhs) = default;
    ComputeView& operator=(ComputeView const& rhs) = default;

    bool isRead() const {
        return accessType != AccessType::WRITE;
    }
    bool isWrite() const {
        return accessType != AccessType::READ;
    }

    ccstd::pmr::string name;
    AccessType accessType{AccessType::READ};
    uint32_t plane{0};
    gfx::ClearFlagBit clearFlags{gfx::ClearFlagBit::NONE};
    ClearValueType clearValueType{ClearValueType::NONE};
    ClearValue clearValue;
    gfx::ShaderStageFlagBit shaderStageFlags{gfx::ShaderStageFlagBit::NONE};
};

inline bool operator==(const ComputeView& lhs, const ComputeView& rhs) noexcept {
    return std::forward_as_tuple(lhs.name, lhs.accessType, lhs.plane, lhs.clearFlags, lhs.clearValueType, lhs.shaderStageFlags) ==
           std::forward_as_tuple(rhs.name, rhs.accessType, rhs.plane, rhs.clearFlags, rhs.clearValueType, rhs.shaderStageFlags);
}

inline bool operator!=(const ComputeView& lhs, const ComputeView& rhs) noexcept {
    return !(lhs == rhs);
}

struct ResourceDesc {
    ResourceDimension dimension{ResourceDimension::BUFFER};
    uint32_t alignment{0};
    uint32_t width{0};
    uint32_t height{0};
    uint16_t depthOrArraySize{0};
    uint16_t mipLevels{0};
    gfx::Format format{gfx::Format::UNKNOWN};
    gfx::SampleCount sampleCount{gfx::SampleCount::X1};
    gfx::TextureFlagBit textureFlags{gfx::TextureFlagBit::NONE};
    ResourceFlags flags{ResourceFlags::NONE};
    gfx::TextureType viewType{gfx::TextureType::TEX2D};
};

struct ResourceTraits {
    ResourceTraits() = default;
    ResourceTraits(ResourceResidency residencyIn) noexcept // NOLINT
    : residency(residencyIn) {}

    bool hasSideEffects() const noexcept {
        return residency == ResourceResidency::PERSISTENT ||
               residency == ResourceResidency::EXTERNAL ||
               residency == ResourceResidency::BACKBUFFER;
    }

    ResourceResidency residency{ResourceResidency::MANAGED};
};

struct RenderSwapchain {
    RenderSwapchain() = default;
    RenderSwapchain(gfx::Swapchain* swapchainIn, bool isDepthStencilIn) noexcept // NOLINT
    : swapchain(swapchainIn),
      isDepthStencil(isDepthStencilIn) {}

    static gfx::Texture* getColorTexture(gfx::Swapchain* swapchain) noexcept;
    static gfx::Texture* getColorTexture(scene::RenderWindow* renderWindow) noexcept;
    static gfx::Texture* getDepthStencilTexture(gfx::Swapchain* swapchain) noexcept;

    gfx::Swapchain* swapchain{nullptr};
    scene::RenderWindow* renderWindow{nullptr};
    uint32_t currentID{0};
    uint32_t numBackBuffers{0};
    uint32_t generation{0xFFFFFFFF};
    bool isDepthStencil{false};
    gfx::Texture* texture{nullptr};
};

struct ResourceStates {
    gfx::AccessFlagBit states{gfx::AccessFlagBit::NONE};
};

struct ManagedBuffer {
    ManagedBuffer() = default;
    ManagedBuffer(IntrusivePtr<gfx::Buffer> bufferIn) noexcept // NOLINT
    : buffer(std::move(bufferIn)) {}

    IntrusivePtr<gfx::Buffer> buffer;
    uint64_t fenceValue{0};
};

struct PersistentBuffer {
    PersistentBuffer() = default;
    PersistentBuffer(IntrusivePtr<gfx::Buffer> bufferIn) noexcept // NOLINT
    : buffer(std::move(bufferIn)) {}

    IntrusivePtr<gfx::Buffer> buffer;
    uint64_t fenceValue{0};
};

struct ManagedTexture {
    ManagedTexture() = default;
    ManagedTexture(IntrusivePtr<gfx::Texture> textureIn) noexcept // NOLINT
    : texture(std::move(textureIn)) {}

    bool checkResource(const ResourceDesc &desc) const;

    IntrusivePtr<gfx::Texture> texture;
    uint64_t fenceValue{0};
};

struct PersistentTexture {
    PersistentTexture() = default;
    PersistentTexture(IntrusivePtr<gfx::Texture> textureIn) noexcept // NOLINT
    : texture(std::move(textureIn)) {}

    bool checkResource(const ResourceDesc &desc) const;

    IntrusivePtr<gfx::Texture> texture;
    uint64_t fenceValue{0};
};

struct ManagedResource {
    uint32_t unused{0};
};

struct Subpass {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {rasterViews.get_allocator().resource()};
    }

    Subpass(const allocator_type& alloc) noexcept; // NOLINT
    Subpass(Subpass&& rhs, const allocator_type& alloc);
    Subpass(Subpass const& rhs, const allocator_type& alloc);

    Subpass(Subpass&& rhs) noexcept = default;
    Subpass(Subpass const& rhs) = delete;
    Subpass& operator=(Subpass&& rhs) = default;
    Subpass& operator=(Subpass const& rhs) = default;

    PmrTransparentMap<ccstd::pmr::string, RasterView> rasterViews;
    PmrTransparentMap<ccstd::pmr::string, ccstd::pmr::vector<ComputeView>> computeViews;
    ccstd::pmr::vector<ResolvePair> resolvePairs;
};

inline bool operator==(const Subpass& lhs, const Subpass& rhs) noexcept {
    return std::forward_as_tuple(lhs.rasterViews, lhs.computeViews, lhs.resolvePairs) ==
           std::forward_as_tuple(rhs.rasterViews, rhs.computeViews, rhs.resolvePairs);
}

inline bool operator!=(const Subpass& lhs, const Subpass& rhs) noexcept {
    return !(lhs == rhs);
}

struct SubpassGraph {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {_vertices.get_allocator().resource()};
    }

    boost::container::pmr::memory_resource* resource() const noexcept {
        return get_allocator().resource();
    }

    SubpassGraph(const allocator_type& alloc) noexcept; // NOLINT
    SubpassGraph(SubpassGraph&& rhs, const allocator_type& alloc);
    SubpassGraph(SubpassGraph const& rhs, const allocator_type& alloc);

    SubpassGraph(SubpassGraph&& rhs) noexcept = default;
    SubpassGraph(SubpassGraph const& rhs) = delete;
    SubpassGraph& operator=(SubpassGraph&& rhs) = default;
    SubpassGraph& operator=(SubpassGraph const& rhs) = default;

    // Graph
    using directed_category      = boost::bidirectional_tag;
    using vertex_descriptor      = uint32_t;
    using edge_descriptor        = impl::EdgeDescriptor<directed_category, vertex_descriptor>;
    using edge_parallel_category = boost::allow_parallel_edge_tag;
    struct traversal_category // NOLINT
    : virtual boost::incidence_graph_tag,
      virtual boost::bidirectional_graph_tag,
      virtual boost::adjacency_graph_tag,
      virtual boost::vertex_list_graph_tag,
      virtual boost::edge_list_graph_tag {};

    constexpr static vertex_descriptor null_vertex() noexcept { // NOLINT
        return std::numeric_limits<vertex_descriptor>::max();
    }

    // IncidenceGraph
    using OutEdge     = impl::StoredEdge<vertex_descriptor>;
    using out_edge_iterator = impl::OutEdgeIter<
        ccstd::pmr::vector<OutEdge>::iterator,
        vertex_descriptor, edge_descriptor, int32_t>;
    using degree_size_type = uint32_t;

    // BidirectionalGraph
    using InEdge     = impl::StoredEdge<vertex_descriptor>;
    using in_edge_iterator = impl::InEdgeIter<
        ccstd::pmr::vector<InEdge>::iterator,
        vertex_descriptor, edge_descriptor, int32_t>;

    // AdjacencyGraph
    using adjacency_iterator = boost::adjacency_iterator_generator<
        SubpassGraph, vertex_descriptor, out_edge_iterator>::type;

    // VertexListGraph
    using vertex_iterator    = boost::integer_range<vertex_descriptor>::iterator;
    using vertices_size_type = uint32_t;

    // VertexList help functions
    ccstd::pmr::vector<OutEdge>& getOutEdgeList(vertex_descriptor v) noexcept {
        return _vertices[v].outEdges;
    }
    const ccstd::pmr::vector<OutEdge>& getOutEdgeList(vertex_descriptor v) const noexcept {
        return _vertices[v].outEdges;
    }

    ccstd::pmr::vector<InEdge>& getInEdgeList(vertex_descriptor v) noexcept {
        return _vertices[v].inEdges;
    }
    const ccstd::pmr::vector<InEdge>& getInEdgeList(vertex_descriptor v) const noexcept {
        return _vertices[v].inEdges;
    }

    boost::integer_range<vertex_descriptor> getVertexList() const noexcept {
        return {0, static_cast<vertices_size_type>(_vertices.size())};
    }

    vertex_descriptor getCurrentID() const noexcept {
        return static_cast<vertex_descriptor>(_vertices.size());
    }

    ccstd::pmr::vector<boost::default_color_type> colors(boost::container::pmr::memory_resource* mr) const {
        return ccstd::pmr::vector<boost::default_color_type>(_vertices.size(), mr);
    }

    // EdgeListGraph
    using edge_iterator   = impl::DirectedEdgeIterator<vertex_iterator, out_edge_iterator, SubpassGraph>;
    using edges_size_type = uint32_t;

    // ContinuousContainer
    void reserve(vertices_size_type sz);

    // Members
    struct Vertex {
        using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
        allocator_type get_allocator() const noexcept { // NOLINT
            return {outEdges.get_allocator().resource()};
        }

        Vertex(const allocator_type& alloc) noexcept; // NOLINT
        Vertex(Vertex&& rhs, const allocator_type& alloc);
        Vertex(Vertex const& rhs, const allocator_type& alloc);

        Vertex(Vertex&& rhs) noexcept = default;
        Vertex(Vertex const& rhs) = delete;
        Vertex& operator=(Vertex&& rhs) = default;
        Vertex& operator=(Vertex const& rhs) = default;

        ccstd::pmr::vector<OutEdge> outEdges;
        ccstd::pmr::vector<InEdge> inEdges;
    };

    struct NameTag {};
    struct SubpassTag {};

    // Vertices
    ccstd::pmr::vector<Vertex> _vertices;
    // Components
    ccstd::pmr::vector<ccstd::pmr::string> names;
    ccstd::pmr::vector<Subpass> subpasses;
};

inline bool operator==(const SubpassGraph& lhs, const SubpassGraph& rhs) noexcept {
    return std::forward_as_tuple(lhs.names, lhs.subpasses) ==
           std::forward_as_tuple(rhs.names, rhs.subpasses);
}

inline bool operator!=(const SubpassGraph& lhs, const SubpassGraph& rhs) noexcept {
    return !(lhs == rhs);
}

struct RasterSubpass {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {rasterViews.get_allocator().resource()};
    }

    RasterSubpass(const allocator_type& alloc) noexcept; // NOLINT
    RasterSubpass(uint32_t subpassIDIn, uint32_t countIn, uint32_t qualityIn, const allocator_type& alloc) noexcept;
    RasterSubpass(RasterSubpass&& rhs, const allocator_type& alloc);
    RasterSubpass(RasterSubpass const& rhs, const allocator_type& alloc);

    RasterSubpass(RasterSubpass&& rhs) noexcept = default;
    RasterSubpass(RasterSubpass const& rhs) = delete;
    RasterSubpass& operator=(RasterSubpass&& rhs) = default;
    RasterSubpass& operator=(RasterSubpass const& rhs) = default;

    PmrTransparentMap<ccstd::pmr::string, RasterView> rasterViews;
    PmrTransparentMap<ccstd::pmr::string, ccstd::pmr::vector<ComputeView>> computeViews;
    ccstd::pmr::vector<ResolvePair> resolvePairs;
    gfx::Viewport viewport;
    uint32_t subpassID{0xFFFFFFFF};
    uint32_t count{1};
    uint32_t quality{0};
    bool showStatistics{false};
};

struct ComputeSubpass {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {rasterViews.get_allocator().resource()};
    }

    ComputeSubpass(const allocator_type& alloc) noexcept; // NOLINT
    ComputeSubpass(uint32_t subpassIDIn, const allocator_type& alloc) noexcept;
    ComputeSubpass(ComputeSubpass&& rhs, const allocator_type& alloc);
    ComputeSubpass(ComputeSubpass const& rhs, const allocator_type& alloc);

    ComputeSubpass(ComputeSubpass&& rhs) noexcept = default;
    ComputeSubpass(ComputeSubpass const& rhs) = delete;
    ComputeSubpass& operator=(ComputeSubpass&& rhs) = default;
    ComputeSubpass& operator=(ComputeSubpass const& rhs) = default;

    PmrTransparentMap<ccstd::pmr::string, RasterView> rasterViews;
    PmrTransparentMap<ccstd::pmr::string, ccstd::pmr::vector<ComputeView>> computeViews;
    uint32_t subpassID{0xFFFFFFFF};
};

struct RasterPass {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {rasterViews.get_allocator().resource()};
    }

    RasterPass(const allocator_type& alloc) noexcept; // NOLINT
    RasterPass(RasterPass&& rhs, const allocator_type& alloc);
    RasterPass(RasterPass const& rhs, const allocator_type& alloc);

    RasterPass(RasterPass&& rhs) noexcept = default;
    RasterPass(RasterPass const& rhs) = delete;
    RasterPass& operator=(RasterPass&& rhs) = default;
    RasterPass& operator=(RasterPass const& rhs) = default;

    PmrTransparentMap<ccstd::pmr::string, RasterView> rasterViews;
    PmrTransparentMap<ccstd::pmr::string, ccstd::pmr::vector<ComputeView>> computeViews;
    PmrTransparentMap<ccstd::pmr::string, uint32_t> attachmentIndexMap;
    PmrTransparentMap<ccstd::pmr::string, gfx::ShaderStageFlagBit> textures;
    SubpassGraph subpassGraph;
    uint32_t width{0};
    uint32_t height{0};
    uint32_t count{1};
    uint32_t quality{0};
    gfx::Viewport viewport;
    ccstd::pmr::string versionName;
    uint64_t version{0};
    uint64_t hashValue{0};
    bool showStatistics{false};
};

inline bool operator==(const RasterPass& lhs, const RasterPass& rhs) noexcept {
    return std::forward_as_tuple(lhs.rasterViews, lhs.computeViews, lhs.textures, lhs.subpassGraph, lhs.width, lhs.height, lhs.count, lhs.quality) ==
           std::forward_as_tuple(rhs.rasterViews, rhs.computeViews, rhs.textures, rhs.subpassGraph, rhs.width, rhs.height, rhs.count, rhs.quality);
}

inline bool operator!=(const RasterPass& lhs, const RasterPass& rhs) noexcept {
    return !(lhs == rhs);
}

struct PersistentRenderPassAndFramebuffer {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {clearColors.get_allocator().resource()};
    }

    PersistentRenderPassAndFramebuffer(const allocator_type& alloc) noexcept; // NOLINT
    PersistentRenderPassAndFramebuffer(IntrusivePtr<gfx::RenderPass> renderPassIn, IntrusivePtr<gfx::Framebuffer> framebufferIn, const allocator_type& alloc) noexcept;
    PersistentRenderPassAndFramebuffer(PersistentRenderPassAndFramebuffer&& rhs, const allocator_type& alloc);
    PersistentRenderPassAndFramebuffer(PersistentRenderPassAndFramebuffer const& rhs, const allocator_type& alloc);

    PersistentRenderPassAndFramebuffer(PersistentRenderPassAndFramebuffer&& rhs) noexcept = default;
    PersistentRenderPassAndFramebuffer(PersistentRenderPassAndFramebuffer const& rhs) = delete;
    PersistentRenderPassAndFramebuffer& operator=(PersistentRenderPassAndFramebuffer&& rhs) = default;
    PersistentRenderPassAndFramebuffer& operator=(PersistentRenderPassAndFramebuffer const& rhs) = default;

    IntrusivePtr<gfx::RenderPass> renderPass;
    IntrusivePtr<gfx::Framebuffer> framebuffer;
    ccstd::pmr::vector<gfx::Color> clearColors;
    float clearDepth{0};
    uint8_t clearStencil{0};
};

struct ManagedTag {};
struct ManagedBufferTag {};
struct ManagedTextureTag {};
struct PersistentBufferTag {};
struct PersistentTextureTag {};
struct FramebufferTag {};
struct SwapchainTag {};
struct SamplerTag {};
struct FormatViewTag {};
struct SubresourceViewTag {};

struct FormatView {
    gfx::Format format{gfx::Format::UNKNOWN};
};

struct SubresourceView {
    IntrusivePtr<gfx::Texture> textureView;
    gfx::Format format{gfx::Format::UNKNOWN};
    uint16_t indexOrFirstMipLevel{0};
    uint16_t numMipLevels{0};
    uint16_t firstArraySlice{0};
    uint16_t numArraySlices{0};
    uint16_t firstPlane{0};
    uint16_t numPlanes{0};
};

struct ResourceGraph {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {_vertices.get_allocator().resource()};
    }

    boost::container::pmr::memory_resource* resource() const noexcept {
        return get_allocator().resource();
    }

    ResourceGraph(const allocator_type& alloc) noexcept; // NOLINT
    ResourceGraph(ResourceGraph&& rhs) = delete;
    ResourceGraph(ResourceGraph const& rhs) = delete;
    ResourceGraph& operator=(ResourceGraph&& rhs) = delete;
    ResourceGraph& operator=(ResourceGraph const& rhs) = delete;

    // Graph
    using directed_category      = boost::bidirectional_tag;
    using vertex_descriptor      = uint32_t;
    using edge_descriptor        = impl::EdgeDescriptor<directed_category, vertex_descriptor>;
    using edge_parallel_category = boost::allow_parallel_edge_tag;
    struct traversal_category // NOLINT
    : virtual boost::incidence_graph_tag,
      virtual boost::bidirectional_graph_tag,
      virtual boost::adjacency_graph_tag,
      virtual boost::vertex_list_graph_tag,
      virtual boost::edge_list_graph_tag {};

    constexpr static vertex_descriptor null_vertex() noexcept { // NOLINT
        return std::numeric_limits<vertex_descriptor>::max();
    }

    // IncidenceGraph
    using OutEdge     = impl::StoredEdge<vertex_descriptor>;
    using out_edge_iterator = impl::OutEdgeIter<
        ccstd::pmr::vector<OutEdge>::iterator,
        vertex_descriptor, edge_descriptor, int32_t>;
    using degree_size_type = uint32_t;

    // BidirectionalGraph
    using InEdge     = impl::StoredEdge<vertex_descriptor>;
    using in_edge_iterator = impl::InEdgeIter<
        ccstd::pmr::vector<InEdge>::iterator,
        vertex_descriptor, edge_descriptor, int32_t>;

    // AdjacencyGraph
    using adjacency_iterator = boost::adjacency_iterator_generator<
        ResourceGraph, vertex_descriptor, out_edge_iterator>::type;

    // VertexListGraph
    using vertex_iterator    = boost::integer_range<vertex_descriptor>::iterator;
    using vertices_size_type = uint32_t;

    // VertexList help functions
    ccstd::pmr::vector<OutEdge>& getOutEdgeList(vertex_descriptor v) noexcept {
        return _vertices[v].outEdges;
    }
    const ccstd::pmr::vector<OutEdge>& getOutEdgeList(vertex_descriptor v) const noexcept {
        return _vertices[v].outEdges;
    }

    ccstd::pmr::vector<InEdge>& getInEdgeList(vertex_descriptor v) noexcept {
        return _vertices[v].inEdges;
    }
    const ccstd::pmr::vector<InEdge>& getInEdgeList(vertex_descriptor v) const noexcept {
        return _vertices[v].inEdges;
    }

    boost::integer_range<vertex_descriptor> getVertexList() const noexcept {
        return {0, static_cast<vertices_size_type>(_vertices.size())};
    }

    vertex_descriptor getCurrentID() const noexcept {
        return static_cast<vertex_descriptor>(_vertices.size());
    }

    ccstd::pmr::vector<boost::default_color_type> colors(boost::container::pmr::memory_resource* mr) const {
        return ccstd::pmr::vector<boost::default_color_type>(_vertices.size(), mr);
    }

    // EdgeListGraph
    using edge_iterator   = impl::DirectedEdgeIterator<vertex_iterator, out_edge_iterator, ResourceGraph>;
    using edges_size_type = uint32_t;

    // AddressableGraph (Alias)
    using ownership_descriptor = impl::EdgeDescriptor<boost::bidirectional_tag, vertex_descriptor>;

    using ChildEdge = OutEdge;
    using children_iterator  = impl::OutEdgeIter<
        ccstd::pmr::vector<OutEdge>::iterator,
        vertex_descriptor, ownership_descriptor, int32_t>;
    using children_size_type = uint32_t;

    using ParentEdge = InEdge;
    using parent_iterator  = impl::InEdgeIter<
        ccstd::pmr::vector<InEdge>::iterator,
        vertex_descriptor, ownership_descriptor, int32_t>;

    using ownership_iterator   = impl::DirectedEdgeIterator<vertex_iterator, children_iterator, ResourceGraph>;
    using ownerships_size_type = edges_size_type;

    // AddressableGraph help functions
    ccstd::pmr::vector<OutEdge>& getChildrenList(vertex_descriptor v) noexcept {
        return _vertices[v].outEdges;
    }
    const ccstd::pmr::vector<OutEdge>& getChildrenList(vertex_descriptor v) const noexcept {
        return _vertices[v].outEdges;
    }

    ccstd::pmr::vector<InEdge>& getParentsList(vertex_descriptor v) noexcept {
        return _vertices[v].inEdges;
    }
    const ccstd::pmr::vector<InEdge>& getParentsList(vertex_descriptor v) const noexcept {
        return _vertices[v].inEdges;
    }

    // PolymorphicGraph
    using VertexTag         = ccstd::variant<ManagedTag, ManagedBufferTag, ManagedTextureTag, PersistentBufferTag, PersistentTextureTag, FramebufferTag, SwapchainTag, FormatViewTag, SubresourceViewTag>;
    using VertexValue       = ccstd::variant<ManagedResource*, ManagedBuffer*, ManagedTexture*, PersistentBuffer*, PersistentTexture*, IntrusivePtr<gfx::Framebuffer>*, RenderSwapchain*, FormatView*, SubresourceView*>;
    using VertexConstValue = ccstd::variant<const ManagedResource*, const ManagedBuffer*, const ManagedTexture*, const PersistentBuffer*, const PersistentTexture*, const IntrusivePtr<gfx::Framebuffer>*, const RenderSwapchain*, const FormatView*, const SubresourceView*>;
    using VertexHandle      = ccstd::variant<
        impl::ValueHandle<ManagedTag, vertex_descriptor>,
        impl::ValueHandle<ManagedBufferTag, vertex_descriptor>,
        impl::ValueHandle<ManagedTextureTag, vertex_descriptor>,
        impl::ValueHandle<PersistentBufferTag, vertex_descriptor>,
        impl::ValueHandle<PersistentTextureTag, vertex_descriptor>,
        impl::ValueHandle<FramebufferTag, vertex_descriptor>,
        impl::ValueHandle<SwapchainTag, vertex_descriptor>,
        impl::ValueHandle<FormatViewTag, vertex_descriptor>,
        impl::ValueHandle<SubresourceViewTag, vertex_descriptor>>;

    void validateSwapchains();
    void mount(gfx::Device* device, vertex_descriptor vertID);
    void unmount(uint64_t completedFenceValue);
    bool isTexture(vertex_descriptor resID) const noexcept;
    bool isTextureView(vertex_descriptor resID) const noexcept;
    gfx::Texture* getTexture(vertex_descriptor resID);
    gfx::Buffer* getBuffer(vertex_descriptor resID);
    void invalidatePersistentRenderPassAndFramebuffer(gfx::Texture* pTexture);

    // ContinuousContainer
    void reserve(vertices_size_type sz);

    // Members
    struct Vertex {
        using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
        allocator_type get_allocator() const noexcept { // NOLINT
            return {outEdges.get_allocator().resource()};
        }

        Vertex(const allocator_type& alloc) noexcept; // NOLINT
        Vertex(Vertex&& rhs, const allocator_type& alloc);
        Vertex(Vertex const& rhs, const allocator_type& alloc);

        Vertex(Vertex&& rhs) noexcept = default;
        Vertex(Vertex const& rhs) = delete;
        Vertex& operator=(Vertex&& rhs) = default;
        Vertex& operator=(Vertex const& rhs) = default;

        ccstd::pmr::vector<OutEdge> outEdges;
        ccstd::pmr::vector<InEdge> inEdges;
        VertexHandle handle;
    };

    struct NameTag {};
    struct DescTag {};
    struct TraitsTag {};
    struct StatesTag {};
    struct SamplerTag {};

    // Vertices
    ccstd::pmr::vector<Vertex> _vertices;
    // Components
    ccstd::pmr::vector<ccstd::pmr::string> names;
    ccstd::pmr::vector<ResourceDesc> descs;
    ccstd::pmr::vector<ResourceTraits> traits;
    ccstd::pmr::vector<ResourceStates> states;
    ccstd::pmr::vector<gfx::SamplerInfo> samplerInfo;
    // PolymorphicGraph
    ccstd::pmr::vector<ManagedResource> resources;
    ccstd::pmr::vector<ManagedBuffer> managedBuffers;
    ccstd::pmr::vector<ManagedTexture> managedTextures;
    ccstd::pmr::vector<PersistentBuffer> buffers;
    ccstd::pmr::vector<PersistentTexture> textures;
    ccstd::pmr::vector<IntrusivePtr<gfx::Framebuffer>> framebuffers;
    ccstd::pmr::vector<RenderSwapchain> swapchains;
    ccstd::pmr::vector<FormatView> formatViews;
    ccstd::pmr::vector<SubresourceView> subresourceViews;
    // UuidGraph
    PmrUnorderedStringMap<ccstd::pmr::string, vertex_descriptor> valueIndex;
    // Members
    ccstd::pmr::unordered_map<RasterPass, PersistentRenderPassAndFramebuffer> renderPasses;
    uint64_t nextFenceValue{0};
    uint64_t version{0};
};

struct ComputePass {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {computeViews.get_allocator().resource()};
    }

    ComputePass(const allocator_type& alloc) noexcept; // NOLINT
    ComputePass(ComputePass&& rhs, const allocator_type& alloc);
    ComputePass(ComputePass const& rhs, const allocator_type& alloc);

    ComputePass(ComputePass&& rhs) noexcept = default;
    ComputePass(ComputePass const& rhs) = delete;
    ComputePass& operator=(ComputePass&& rhs) = default;
    ComputePass& operator=(ComputePass const& rhs) = default;

    PmrTransparentMap<ccstd::pmr::string, ccstd::pmr::vector<ComputeView>> computeViews;
    PmrTransparentMap<ccstd::pmr::string, gfx::ShaderStageFlagBit> textures;
};

struct ResolvePass {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {resolvePairs.get_allocator().resource()};
    }

    ResolvePass(const allocator_type& alloc) noexcept; // NOLINT
    ResolvePass(ResolvePass&& rhs, const allocator_type& alloc);
    ResolvePass(ResolvePass const& rhs, const allocator_type& alloc);

    ResolvePass(ResolvePass&& rhs) noexcept = default;
    ResolvePass(ResolvePass const& rhs) = delete;
    ResolvePass& operator=(ResolvePass&& rhs) = default;
    ResolvePass& operator=(ResolvePass const& rhs) = default;

    ccstd::pmr::vector<ResolvePair> resolvePairs;
};

struct CopyPass {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {copyPairs.get_allocator().resource()};
    }

    CopyPass(const allocator_type& alloc) noexcept; // NOLINT
    CopyPass(CopyPass&& rhs, const allocator_type& alloc);

    CopyPass(CopyPass&& rhs) noexcept = default;
    CopyPass(CopyPass const& rhs) = delete;
    CopyPass& operator=(CopyPass&& rhs) = default;
    CopyPass& operator=(CopyPass const& rhs) = delete;

    ccstd::pmr::vector<CopyPair> copyPairs;
    ccstd::pmr::vector<UploadPair> uploadPairs;
};

struct MovePass {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {movePairs.get_allocator().resource()};
    }

    MovePass(const allocator_type& alloc) noexcept; // NOLINT
    MovePass(MovePass&& rhs, const allocator_type& alloc);
    MovePass(MovePass const& rhs, const allocator_type& alloc);

    MovePass(MovePass&& rhs) noexcept = default;
    MovePass(MovePass const& rhs) = delete;
    MovePass& operator=(MovePass&& rhs) = default;
    MovePass& operator=(MovePass const& rhs) = default;

    ccstd::pmr::vector<MovePair> movePairs;
};

struct RaytracePass {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {computeViews.get_allocator().resource()};
    }

    RaytracePass(const allocator_type& alloc) noexcept; // NOLINT
    RaytracePass(RaytracePass&& rhs, const allocator_type& alloc);
    RaytracePass(RaytracePass const& rhs, const allocator_type& alloc);

    RaytracePass(RaytracePass&& rhs) noexcept = default;
    RaytracePass(RaytracePass const& rhs) = delete;
    RaytracePass& operator=(RaytracePass&& rhs) = default;
    RaytracePass& operator=(RaytracePass const& rhs) = default;

    PmrTransparentMap<ccstd::pmr::string, ccstd::pmr::vector<ComputeView>> computeViews;
};

struct QueueTag {};
struct SceneTag {};
struct DispatchTag {};
struct BlitTag {};
struct ClearTag {};
struct ViewportTag {};

struct ClearView {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {slotName.get_allocator().resource()};
    }

    ClearView(const allocator_type& alloc = boost::container::pmr::get_default_resource()) noexcept; // NOLINT
    ClearView(ccstd::pmr::string slotNameIn, gfx::ClearFlagBit clearFlagsIn, const gfx::Color& clearColorIn, const allocator_type& alloc = boost::container::pmr::get_default_resource());
    ClearView(ClearView&& rhs, const allocator_type& alloc);
    ClearView(ClearView const& rhs, const allocator_type& alloc);

    ClearView(ClearView&& rhs) noexcept = default;
    ClearView(ClearView const& rhs) = delete;
    ClearView& operator=(ClearView&& rhs) = default;
    ClearView& operator=(ClearView const& rhs) = default;

    ccstd::pmr::string slotName;
    gfx::ClearFlagBit clearFlags{gfx::ClearFlagBit::ALL};
    gfx::Color clearColor;
};

struct RenderQueue {
    RenderQueue() = default;
    RenderQueue(QueueHint hintIn, uint32_t phaseIDIn, uint32_t passLayoutIDIn) noexcept // NOLINT
    : hint(hintIn),
      phaseID(phaseIDIn),
      passLayoutID(passLayoutIDIn) {}
    RenderQueue(uint32_t phaseIDIn, uint32_t passLayoutIDIn) noexcept
    : phaseID(phaseIDIn),
      passLayoutID(passLayoutIDIn) {}

    QueueHint hint{QueueHint::RENDER_OPAQUE};
    uint32_t phaseID{0xFFFFFFFF};
    uint32_t passLayoutID{0xFFFFFFFF};
    gfx::Viewport viewport;
};

enum class CullingFlags : uint32_t {
    NONE = 0,
    CAMERA_FRUSTUM = 0x1,
    LIGHT_FRUSTUM = 0x2,
    LIGHT_BOUNDS = 0x4,
};

constexpr CullingFlags operator|(const CullingFlags lhs, const CullingFlags rhs) noexcept {
    return static_cast<CullingFlags>(static_cast<uint32_t>(lhs) | static_cast<uint32_t>(rhs));
}

constexpr CullingFlags operator&(const CullingFlags lhs, const CullingFlags rhs) noexcept {
    return static_cast<CullingFlags>(static_cast<uint32_t>(lhs) & static_cast<uint32_t>(rhs));
}

constexpr CullingFlags& operator|=(CullingFlags& lhs, const CullingFlags rhs) noexcept {
    return lhs = lhs | rhs;
}

constexpr CullingFlags& operator&=(CullingFlags& lhs, const CullingFlags rhs) noexcept {
    return lhs = lhs & rhs;
}

constexpr bool operator!(CullingFlags e) noexcept {
    return e == static_cast<CullingFlags>(0);
}

constexpr CullingFlags operator~(CullingFlags e) noexcept {
    return static_cast<CullingFlags>(~static_cast<std::underlying_type_t<CullingFlags>>(e));
}

constexpr bool any(CullingFlags e) noexcept {
    return !!e;
}

struct SceneData {
    SceneData() = default;
    SceneData(const scene::RenderScene* sceneIn, const scene::Camera* cameraIn, SceneFlags flagsIn, LightInfo lightIn, CullingFlags cullingFlagsIn, IntrusivePtr<scene::Light> shadingLightIn) noexcept
    : scene(sceneIn),
      camera(cameraIn),
      light(std::move(lightIn)),
      flags(flagsIn),
      cullingFlags(cullingFlagsIn),
      shadingLight(std::move(shadingLightIn)) {}

    const scene::RenderScene* scene{nullptr};
    const scene::Camera* camera{nullptr};
    LightInfo light;
    SceneFlags flags{SceneFlags::NONE};
    CullingFlags cullingFlags{CullingFlags::CAMERA_FRUSTUM};
    IntrusivePtr<scene::Light> shadingLight;
};

struct Dispatch {
    Dispatch() = default;
    Dispatch(IntrusivePtr<Material> materialIn, uint32_t passIDIn, uint32_t threadGroupCountXIn, uint32_t threadGroupCountYIn, uint32_t threadGroupCountZIn) noexcept // NOLINT
    : material(std::move(materialIn)),
      passID(passIDIn),
      threadGroupCountX(threadGroupCountXIn),
      threadGroupCountY(threadGroupCountYIn),
      threadGroupCountZ(threadGroupCountZIn) {}

    IntrusivePtr<Material> material;
    uint32_t passID{0};
    uint32_t threadGroupCountX{0};
    uint32_t threadGroupCountY{0};
    uint32_t threadGroupCountZ{0};
};

struct Blit {
    Blit() = default;
    Blit(IntrusivePtr<Material> materialIn, uint32_t passIDIn, SceneFlags sceneFlagsIn, scene::Camera* cameraIn) noexcept
    : material(std::move(materialIn)),
      passID(passIDIn),
      sceneFlags(sceneFlagsIn),
      camera(cameraIn) {}

    IntrusivePtr<Material> material;
    uint32_t passID{0};
    SceneFlags sceneFlags{SceneFlags::NONE};
    scene::Camera* camera{nullptr};
};

struct RenderData {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {constants.get_allocator().resource()};
    }

    RenderData(const allocator_type& alloc) noexcept; // NOLINT
    RenderData(RenderData&& rhs, const allocator_type& alloc);

    RenderData(RenderData&& rhs) noexcept = default;
    RenderData(RenderData const& rhs) = delete;
    RenderData& operator=(RenderData&& rhs) = default;
    RenderData& operator=(RenderData const& rhs) = delete;

    PmrFlatMap<uint32_t, ccstd::pmr::vector<char>> constants;
    PmrFlatMap<uint32_t, IntrusivePtr<gfx::Buffer>> buffers;
    PmrFlatMap<uint32_t, IntrusivePtr<gfx::Texture>> textures;
    PmrFlatMap<uint32_t, gfx::Sampler*> samplers;
    ccstd::pmr::string custom;
};

struct RenderGraph {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {objects.get_allocator().resource()};
    }

    boost::container::pmr::memory_resource* resource() const noexcept {
        return get_allocator().resource();
    }

    RenderGraph(const allocator_type& alloc) noexcept; // NOLINT
    RenderGraph(RenderGraph&& rhs, const allocator_type& alloc);

    RenderGraph(RenderGraph&& rhs) noexcept = default;
    RenderGraph(RenderGraph const& rhs) = delete;
    RenderGraph& operator=(RenderGraph&& rhs) = default;
    RenderGraph& operator=(RenderGraph const& rhs) = delete;

    // Graph
    using directed_category      = boost::bidirectional_tag;
    using vertex_descriptor      = uint32_t;
    using edge_descriptor        = impl::EdgeDescriptor<directed_category, vertex_descriptor>;
    using edge_parallel_category = boost::allow_parallel_edge_tag;
    struct traversal_category // NOLINT
    : virtual boost::incidence_graph_tag,
      virtual boost::bidirectional_graph_tag,
      virtual boost::adjacency_graph_tag,
      virtual boost::vertex_list_graph_tag,
      virtual boost::edge_list_graph_tag {};

    constexpr static vertex_descriptor null_vertex() noexcept { // NOLINT
        return std::numeric_limits<vertex_descriptor>::max();
    }

    // IncidenceGraph
    using OutEdge     = impl::StoredEdge<vertex_descriptor>;
    using out_edge_iterator = impl::OutEdgeIter<
        ccstd::pmr::vector<OutEdge>::iterator,
        vertex_descriptor, edge_descriptor, int32_t>;
    using degree_size_type = uint32_t;

    // BidirectionalGraph
    using InEdge     = impl::StoredEdge<vertex_descriptor>;
    using in_edge_iterator = impl::InEdgeIter<
        ccstd::pmr::vector<InEdge>::iterator,
        vertex_descriptor, edge_descriptor, int32_t>;

    // AdjacencyGraph
    using adjacency_iterator = boost::adjacency_iterator_generator<
        RenderGraph, vertex_descriptor, out_edge_iterator>::type;

    // VertexListGraph
    using vertex_iterator    = boost::integer_range<vertex_descriptor>::iterator;
    using vertices_size_type = uint32_t;

    // VertexList help functions
    ccstd::pmr::vector<OutEdge>& getOutEdgeList(vertex_descriptor v) noexcept {
        return _vertices[v].outEdges;
    }
    const ccstd::pmr::vector<OutEdge>& getOutEdgeList(vertex_descriptor v) const noexcept {
        return _vertices[v].outEdges;
    }

    ccstd::pmr::vector<InEdge>& getInEdgeList(vertex_descriptor v) noexcept {
        return _vertices[v].inEdges;
    }
    const ccstd::pmr::vector<InEdge>& getInEdgeList(vertex_descriptor v) const noexcept {
        return _vertices[v].inEdges;
    }

    boost::integer_range<vertex_descriptor> getVertexList() const noexcept {
        return {0, static_cast<vertices_size_type>(_vertices.size())};
    }

    vertex_descriptor getCurrentID() const noexcept {
        return static_cast<vertex_descriptor>(_vertices.size());
    }

    ccstd::pmr::vector<boost::default_color_type> colors(boost::container::pmr::memory_resource* mr) const {
        return ccstd::pmr::vector<boost::default_color_type>(_vertices.size(), mr);
    }

    // EdgeListGraph
    using edge_iterator   = impl::DirectedEdgeIterator<vertex_iterator, out_edge_iterator, RenderGraph>;
    using edges_size_type = uint32_t;

    // AddressableGraph (Separated)
    using ownership_descriptor = impl::EdgeDescriptor<boost::bidirectional_tag, vertex_descriptor>;

    using ChildEdge = impl::StoredEdge<vertex_descriptor>;
    using children_iterator  = impl::OutEdgeIter<
        ccstd::pmr::vector<ChildEdge>::iterator,
        vertex_descriptor, ownership_descriptor, int32_t>;
    using children_size_type = uint32_t;

    using ParentEdge = impl::StoredEdge<vertex_descriptor>;
    using parent_iterator  = impl::InEdgeIter<
        ccstd::pmr::vector<ParentEdge>::iterator,
        vertex_descriptor, ownership_descriptor, int32_t>;

    using ownership_iterator   = impl::OwnershipIterator<vertex_iterator, children_iterator, RenderGraph>;
    using ownerships_size_type = edges_size_type;

    // AddressableGraph help functions
    ccstd::pmr::vector<ChildEdge>& getChildrenList(vertex_descriptor v) noexcept {
        return objects[v].children;
    }
    const ccstd::pmr::vector<ChildEdge>& getChildrenList(vertex_descriptor v) const noexcept {
        return objects[v].children;
    }

    ccstd::pmr::vector<ParentEdge>& getParentsList(vertex_descriptor v) noexcept {
        return objects[v].parents;
    }
    const ccstd::pmr::vector<ParentEdge>& getParentsList(vertex_descriptor v) const noexcept {
        return objects[v].parents;
    }

    // PolymorphicGraph
    using VertexTag         = ccstd::variant<RasterPassTag, RasterSubpassTag, ComputeSubpassTag, ComputeTag, ResolveTag, CopyTag, MoveTag, RaytraceTag, QueueTag, SceneTag, BlitTag, DispatchTag, ClearTag, ViewportTag>;
    using VertexValue       = ccstd::variant<RasterPass*, RasterSubpass*, ComputeSubpass*, ComputePass*, ResolvePass*, CopyPass*, MovePass*, RaytracePass*, RenderQueue*, SceneData*, Blit*, Dispatch*, ccstd::pmr::vector<ClearView>*, gfx::Viewport*>;
    using VertexConstValue = ccstd::variant<const RasterPass*, const RasterSubpass*, const ComputeSubpass*, const ComputePass*, const ResolvePass*, const CopyPass*, const MovePass*, const RaytracePass*, const RenderQueue*, const SceneData*, const Blit*, const Dispatch*, const ccstd::pmr::vector<ClearView>*, const gfx::Viewport*>;
    using VertexHandle      = ccstd::variant<
        impl::ValueHandle<RasterPassTag, vertex_descriptor>,
        impl::ValueHandle<RasterSubpassTag, vertex_descriptor>,
        impl::ValueHandle<ComputeSubpassTag, vertex_descriptor>,
        impl::ValueHandle<ComputeTag, vertex_descriptor>,
        impl::ValueHandle<ResolveTag, vertex_descriptor>,
        impl::ValueHandle<CopyTag, vertex_descriptor>,
        impl::ValueHandle<MoveTag, vertex_descriptor>,
        impl::ValueHandle<RaytraceTag, vertex_descriptor>,
        impl::ValueHandle<QueueTag, vertex_descriptor>,
        impl::ValueHandle<SceneTag, vertex_descriptor>,
        impl::ValueHandle<BlitTag, vertex_descriptor>,
        impl::ValueHandle<DispatchTag, vertex_descriptor>,
        impl::ValueHandle<ClearTag, vertex_descriptor>,
        impl::ValueHandle<ViewportTag, vertex_descriptor>>;

    vertex_descriptor getPassID(vertex_descriptor nodeID) const;
    ccstd::string print(boost::container::pmr::memory_resource* scratch) const;

    // ContinuousContainer
    void reserve(vertices_size_type sz);

    // Members
    struct Object {
        using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
        allocator_type get_allocator() const noexcept { // NOLINT
            return {children.get_allocator().resource()};
        }

        Object(const allocator_type& alloc) noexcept; // NOLINT
        Object(Object&& rhs, const allocator_type& alloc);
        Object(Object const& rhs, const allocator_type& alloc);

        Object(Object&& rhs) noexcept = default;
        Object(Object const& rhs) = delete;
        Object& operator=(Object&& rhs) = default;
        Object& operator=(Object const& rhs) = default;

        ccstd::pmr::vector<ChildEdge> children;
        ccstd::pmr::vector<ParentEdge> parents;
    };

    struct Vertex {
        using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
        allocator_type get_allocator() const noexcept { // NOLINT
            return {outEdges.get_allocator().resource()};
        }

        Vertex(const allocator_type& alloc) noexcept; // NOLINT
        Vertex(Vertex&& rhs, const allocator_type& alloc);
        Vertex(Vertex const& rhs, const allocator_type& alloc);

        Vertex(Vertex&& rhs) noexcept = default;
        Vertex(Vertex const& rhs) = delete;
        Vertex& operator=(Vertex&& rhs) = default;
        Vertex& operator=(Vertex const& rhs) = default;

        ccstd::pmr::vector<OutEdge> outEdges;
        ccstd::pmr::vector<InEdge> inEdges;
        VertexHandle handle;
    };

    struct NameTag {};
    struct LayoutTag {};
    struct DataTag {};
    struct ValidTag {};

    // Owners
    ccstd::pmr::vector<Object> objects;
    // Vertices
    ccstd::pmr::vector<Vertex> _vertices;
    // Components
    ccstd::pmr::vector<ccstd::pmr::string> names;
    ccstd::pmr::vector<ccstd::pmr::string> layoutNodes;
    ccstd::pmr::vector<RenderData> data;
    ccstd::pmr::vector<bool> valid;
    // PolymorphicGraph
    ccstd::pmr::vector<RasterPass> rasterPasses;
    ccstd::pmr::vector<RasterSubpass> rasterSubpasses;
    ccstd::pmr::vector<ComputeSubpass> computeSubpasses;
    ccstd::pmr::vector<ComputePass> computePasses;
    ccstd::pmr::vector<ResolvePass> resolvePasses;
    ccstd::pmr::vector<CopyPass> copyPasses;
    ccstd::pmr::vector<MovePass> movePasses;
    ccstd::pmr::vector<RaytracePass> raytracePasses;
    ccstd::pmr::vector<RenderQueue> renderQueues;
    ccstd::pmr::vector<SceneData> scenes;
    ccstd::pmr::vector<Blit> blits;
    ccstd::pmr::vector<Dispatch> dispatches;
    ccstd::pmr::vector<ccstd::pmr::vector<ClearView>> clearViews;
    ccstd::pmr::vector<gfx::Viewport> viewports;
    // Members
    PmrUnorderedStringMap<ccstd::pmr::string, uint32_t> index;
    ccstd::pmr::vector<vertex_descriptor> sortedVertices;
};

} // namespace render

} // namespace cc

namespace ccstd {

inline hash_t hash<cc::render::ClearValue>::operator()(const cc::render::ClearValue& val) const noexcept {
    hash_t seed = 0;
    hash_combine(seed, val.x);
    hash_combine(seed, val.y);
    hash_combine(seed, val.z);
    hash_combine(seed, val.w);
    return seed;
}

inline hash_t hash<cc::render::RasterView>::operator()(const cc::render::RasterView& val) const noexcept {
    hash_t seed = 0;
    hash_combine(seed, val.slotName);
    hash_combine(seed, val.slotName1);
    hash_combine(seed, val.accessType);
    hash_combine(seed, val.attachmentType);
    hash_combine(seed, val.loadOp);
    hash_combine(seed, val.storeOp);
    hash_combine(seed, val.clearFlags);
    hash_combine(seed, val.clearColor);
    hash_combine(seed, val.shaderStageFlags);
    return seed;
}

inline hash_t hash<cc::render::ComputeView>::operator()(const cc::render::ComputeView& val) const noexcept {
    hash_t seed = 0;
    hash_combine(seed, val.name);
    hash_combine(seed, val.accessType);
    hash_combine(seed, val.plane);
    hash_combine(seed, val.clearFlags);
    hash_combine(seed, val.clearValueType);
    hash_combine(seed, val.shaderStageFlags);
    return seed;
}

inline hash_t hash<cc::render::Subpass>::operator()(const cc::render::Subpass& val) const noexcept {
    hash_t seed = 0;
    hash_combine(seed, val.rasterViews);
    hash_combine(seed, val.computeViews);
    hash_combine(seed, val.resolvePairs);
    return seed;
}

inline hash_t hash<cc::render::SubpassGraph>::operator()(const cc::render::SubpassGraph& val) const noexcept {
    hash_t seed = 0;
    hash_combine(seed, val.names);
    hash_combine(seed, val.subpasses);
    return seed;
}

inline hash_t hash<cc::render::RasterPass>::operator()(const cc::render::RasterPass& val) const noexcept {
    hash_t seed = 0;
    hash_combine(seed, val.rasterViews);
    hash_combine(seed, val.computeViews);
    hash_combine(seed, val.textures);
    hash_combine(seed, val.subpassGraph);
    hash_combine(seed, val.width);
    hash_combine(seed, val.height);
    hash_combine(seed, val.count);
    hash_combine(seed, val.quality);
    return seed;
}

} // namespace ccstd

// clang-format on
