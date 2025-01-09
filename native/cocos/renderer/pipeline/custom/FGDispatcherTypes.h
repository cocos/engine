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
// NOLINTBEGIN(misc-include-cleaner, bugprone-easily-swappable-parameters)
#pragma once
#include <boost/graph/adjacency_iterator.hpp>
#include <boost/graph/graph_traits.hpp>
#include <boost/graph/properties.hpp>
#include <boost/range/irange.hpp>
#include "cocos/base/std/container/string.h"
#include "cocos/base/std/container/vector.h"
#include "cocos/renderer/pipeline/custom/LayoutGraphTypes.h"
#include "cocos/renderer/pipeline/custom/RenderGraphTypes.h"
#include "cocos/renderer/pipeline/custom/details/GraphTypes.h"
#include "cocos/renderer/pipeline/custom/details/Map.h"
#include "cocos/renderer/pipeline/custom/details/Set.h"
#include "gfx-base/GFXDef-common.h"

namespace cc {

namespace render {

struct NullTag {
};

struct ResourceLifeRecord {
    uint32_t start{0};
    uint32_t end{0};
};

struct LeafStatus {
    bool isExternal{false};
    bool needCulling{false};
};

struct AccessStatus {
    gfx::AccessFlagBit accessFlag{gfx::AccessFlagBit::NONE};
    gfx::ResourceRange range;
};

struct ResourceAccessNode {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {resourceStatus.get_allocator().resource()};
    }

    ResourceAccessNode(const allocator_type& alloc) noexcept; // NOLINT
    ResourceAccessNode(ResourceAccessNode&& rhs, const allocator_type& alloc);
    ResourceAccessNode(ResourceAccessNode const& rhs, const allocator_type& alloc);

    ResourceAccessNode(ResourceAccessNode&& rhs) noexcept = default;
    ResourceAccessNode(ResourceAccessNode const& rhs) = delete;
    ResourceAccessNode& operator=(ResourceAccessNode&& rhs) = default;
    ResourceAccessNode& operator=(ResourceAccessNode const& rhs) = default;

    PmrFlatMap<ccstd::pmr::string, AccessStatus> resourceStatus;
};

struct LayoutAccess {
    gfx::AccessFlagBit prevAccess{gfx::AccessFlagBit::NONE};
    gfx::AccessFlagBit nextAccess{gfx::AccessFlagBit::NONE};
};

struct AttachmentInfo {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {parentName.get_allocator().resource()};
    }

    AttachmentInfo(const allocator_type& alloc) noexcept; // NOLINT
    AttachmentInfo(AttachmentInfo&& rhs, const allocator_type& alloc);
    AttachmentInfo(AttachmentInfo const& rhs, const allocator_type& alloc);

    AttachmentInfo(AttachmentInfo&& rhs) noexcept = default;
    AttachmentInfo(AttachmentInfo const& rhs) = delete;
    AttachmentInfo& operator=(AttachmentInfo&& rhs) = default;
    AttachmentInfo& operator=(AttachmentInfo const& rhs) = default;

    ccstd::pmr::string parentName;
    uint32_t attachmentIndex{0};
    uint32_t isResolveView{0};
};

struct FGRenderPassInfo {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {orderedViews.get_allocator().resource()};
    }

    FGRenderPassInfo(const allocator_type& alloc) noexcept; // NOLINT
    FGRenderPassInfo(FGRenderPassInfo&& rhs, const allocator_type& alloc);
    FGRenderPassInfo(FGRenderPassInfo const& rhs, const allocator_type& alloc);

    FGRenderPassInfo(FGRenderPassInfo&& rhs) noexcept = default;
    FGRenderPassInfo(FGRenderPassInfo const& rhs) = delete;
    FGRenderPassInfo& operator=(FGRenderPassInfo&& rhs) = default;
    FGRenderPassInfo& operator=(FGRenderPassInfo const& rhs) = default;

    ccstd::vector<LayoutAccess> colorAccesses;
    LayoutAccess dsAccess;
    LayoutAccess dsResolveAccess;
    gfx::RenderPassInfo rpInfo;
    ccstd::pmr::vector<ccstd::pmr::string> orderedViews;
    PmrTransparentMap<ccstd::pmr::string, AttachmentInfo> viewIndex;
    uint32_t resolveCount{0};
    uint32_t uniqueRasterViewCount{0};
};

struct Barrier {
    ResourceGraph::vertex_descriptor resourceID{0xFFFFFFFF};
    gfx::BarrierType type{gfx::BarrierType::FULL};
    gfx::GFXObject* barrier{nullptr};
    RenderGraph::vertex_descriptor beginVert{0xFFFFFFFF};
    RenderGraph::vertex_descriptor endVert{0xFFFFFFFF};
    AccessStatus beginStatus;
    AccessStatus endStatus;
};

struct BarrierNode {
    ccstd::vector<Barrier> frontBarriers;
    ccstd::vector<Barrier> rearBarriers;
};

struct SliceNode {
    bool full{false};
    ccstd::vector<uint32_t> mips;
};

struct TextureNode {
    bool full{false};
    ccstd::vector<SliceNode> slices;
};

struct ResourceNode {
    bool full{false};
    ccstd::vector<TextureNode> planes;
};

struct ResourceAccessGraph {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {_vertices.get_allocator().resource()};
    }

    boost::container::pmr::memory_resource* resource() const noexcept {
        return get_allocator().resource();
    }

    ResourceAccessGraph(const allocator_type& alloc) noexcept; // NOLINT
    ResourceAccessGraph(ResourceAccessGraph&& rhs) = delete;
    ResourceAccessGraph(ResourceAccessGraph const& rhs) = delete;
    ResourceAccessGraph& operator=(ResourceAccessGraph&& rhs) = delete;
    ResourceAccessGraph& operator=(ResourceAccessGraph const& rhs) = delete;

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
        ResourceAccessGraph, vertex_descriptor, out_edge_iterator>::type;

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
    using edge_iterator   = impl::DirectedEdgeIterator<vertex_iterator, out_edge_iterator, ResourceAccessGraph>;
    using edges_size_type = uint32_t;

                    LayoutAccess getAccess(ccstd::pmr::string, RenderGraph::vertex_descriptor vertID);
                

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

    struct PassIDTag {};
    struct PassNodeTag {};
    struct RenderPassInfoTag {};
    struct BarrierTag {};

    // Vertices
    ccstd::pmr::vector<Vertex> _vertices;
    // Components
    ccstd::pmr::vector<RenderGraph::vertex_descriptor> passID;
    ccstd::pmr::vector<ResourceAccessNode> passResource;
    ccstd::pmr::vector<FGRenderPassInfo> rpInfo;
    ccstd::pmr::vector<BarrierNode> barrier;
    // UuidGraph
    PmrUnorderedMap<RenderGraph::vertex_descriptor, vertex_descriptor> passIndex;
    // Members
    ccstd::pmr::vector<ccstd::pmr::string> resourceNames;
    PmrUnorderedStringMap<ccstd::pmr::string, uint32_t> resourceIndex;
    vertex_descriptor presentPassID{0xFFFFFFFF};
    PmrFlatMap<vertex_descriptor, LeafStatus> leafPasses;
    PmrFlatSet<vertex_descriptor> culledPasses;
    PmrFlatMap<ccstd::pmr::string, ResourceLifeRecord> resourceLifeRecord;
    ccstd::pmr::vector<vertex_descriptor> topologicalOrder;
    PmrTransparentMap<ccstd::pmr::string, PmrFlatMap<uint32_t, AccessStatus>> resourceAccess;
    PmrFlatMap<ccstd::pmr::string, PmrFlatMap<ccstd::pmr::string, ccstd::pmr::string>> movedTarget;
    PmrFlatMap<ccstd::pmr::string, AccessStatus> movedSourceStatus;
    PmrFlatMap<ccstd::pmr::string, ResourceNode> movedTargetStatus;
};

struct RelationGraph {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {_vertices.get_allocator().resource()};
    }

    boost::container::pmr::memory_resource* resource() const noexcept {
        return get_allocator().resource();
    }

    RelationGraph(const allocator_type& alloc) noexcept; // NOLINT
    RelationGraph(RelationGraph&& rhs) = delete;
    RelationGraph(RelationGraph const& rhs) = delete;
    RelationGraph& operator=(RelationGraph&& rhs) = delete;
    RelationGraph& operator=(RelationGraph const& rhs) = delete;

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
        RelationGraph, vertex_descriptor, out_edge_iterator>::type;

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
    using edge_iterator   = impl::DirectedEdgeIterator<vertex_iterator, out_edge_iterator, RelationGraph>;
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

    struct DescIDTag {};

    // Vertices
    ccstd::pmr::vector<Vertex> _vertices;
    // Components
    ccstd::pmr::vector<ResourceAccessGraph::vertex_descriptor> descID;
    // UuidGraph
    PmrUnorderedMap<ResourceAccessGraph::vertex_descriptor, vertex_descriptor> vertexMap;
};

struct RenderingInfo {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {clearColors.get_allocator().resource()};
    }

    RenderingInfo(const allocator_type& alloc) noexcept; // NOLINT
    RenderingInfo(RenderingInfo&& rhs, const allocator_type& alloc);
    RenderingInfo(RenderingInfo const& rhs, const allocator_type& alloc);

    RenderingInfo(RenderingInfo&& rhs) noexcept = default;
    RenderingInfo(RenderingInfo const& rhs) = delete;
    RenderingInfo& operator=(RenderingInfo&& rhs) = default;
    RenderingInfo& operator=(RenderingInfo const& rhs) = default;

    gfx::RenderPassInfo renderpassInfo;
    gfx::FramebufferInfo framebufferInfo;
    ccstd::pmr::vector<gfx::Color> clearColors;
    float clearDepth{0};
    uint8_t clearStencil{0};
};

struct FrameGraphDispatcher {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {resourceAccessGraph.get_allocator().resource()};
    }

    FrameGraphDispatcher(ResourceGraph& resourceGraphIn, const RenderGraph& renderGraphIn, const LayoutGraphData& layoutGraphIn, boost::container::pmr::memory_resource* scratchIn, const allocator_type& alloc) noexcept;
    FrameGraphDispatcher(FrameGraphDispatcher&& rhs) = delete;
    FrameGraphDispatcher(FrameGraphDispatcher const& rhs) = delete;
    FrameGraphDispatcher& operator=(FrameGraphDispatcher&& rhs) = delete;
    FrameGraphDispatcher& operator=(FrameGraphDispatcher const& rhs) = delete;


    void enablePassReorder(bool enable);

    // how much paralell-execution weights during pass reorder,
    // eg:0.3 means 30% of effort aim to paralellize execution, other 70% aim to decrease memory using.
    // 0 by default 
    void setParalellWeight(float paralellExecWeight);

    void enableMemoryAliasing(bool enable);

    void run();

    const BarrierNode& getBarrier(RenderGraph::vertex_descriptor u) const;

    const ResourceAccessNode& getAccessNode(RenderGraph::vertex_descriptor u) const;

    const gfx::RenderPassInfo& getRenderPassInfo(RenderGraph::vertex_descriptor u) const;
        
    RenderingInfo getRenderPassAndFrameBuffer(RenderGraph::vertex_descriptor u, const ResourceGraph& resg) const;
        
    LayoutAccess getResourceAccess(ResourceGraph::vertex_descriptor r, RenderGraph::vertex_descriptor p) const;

    // those resource been moved point to another resID
    ResourceGraph::vertex_descriptor realResourceID(const ccstd::pmr::string& name) const;

    PmrFlatMap<NameLocalID, ResourceGraph::vertex_descriptor> buildDescriptorIndex(
        const PmrTransparentMap<ccstd::pmr::string, ccstd::pmr::vector<ComputeView>>&computeViews,
        const PmrTransparentMap<ccstd::pmr::string, RasterView>& rasterViews,
        boost::container::pmr::memory_resource* scratch) const;

    PmrFlatMap<NameLocalID, ResourceGraph::vertex_descriptor> buildDescriptorIndex(
        const PmrTransparentMap<ccstd::pmr::string, ccstd::pmr::vector<ComputeView>>&computeViews,
        boost::container::pmr::memory_resource* scratch) const;

    ResourceAccessGraph resourceAccessGraph;
    ResourceGraph& resourceGraph;
    const RenderGraph& renderGraph;
    const LayoutGraphData& layoutGraph;
    boost::container::pmr::memory_resource* scratch{nullptr};
    RelationGraph relationGraph;
    bool _enablePassReorder{false};
    bool _enableAutoBarrier{true};
    bool _enableMemoryAliasing{false};
    bool _accessGraphBuilt{false};
    float _paralellExecWeight{0.0F};
};

} // namespace render

} // namespace cc

// NOLINTEND(misc-include-cleaner, bugprone-easily-swappable-parameters)
// clang-format on
