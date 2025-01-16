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
#include "base/std/container/map.h"
#include "cocos/base/Ptr.h"
#include "cocos/base/std/container/string.h"
#include "cocos/base/std/container/vector.h"
#include "cocos/base/std/hash/hash.h"
#include "cocos/renderer/gfx-base/GFXDef-common.h"
#include "cocos/renderer/gfx-base/GFXDescriptorSet.h"
#include "cocos/renderer/gfx-base/GFXDescriptorSetLayout.h"
#include "cocos/renderer/gfx-base/GFXPipelineLayout.h"
#include "cocos/renderer/pipeline/custom/LayoutGraphFwd.h"
#include "cocos/renderer/pipeline/custom/RenderCommonTypes.h"
#include "cocos/renderer/pipeline/custom/details/GraphTypes.h"
#include "cocos/renderer/pipeline/custom/details/Map.h"
#include "cocos/renderer/pipeline/custom/details/Set.h"

namespace cc {

namespace render {

enum class LayoutType : uint8_t {
    VULKAN,
    WEBGPU,
};

struct Layout {
};

enum class DescriptorTypeOrder : uint8_t {
    UNIFORM_BUFFER,
    DYNAMIC_UNIFORM_BUFFER,
    SAMPLER_TEXTURE,
    SAMPLER,
    TEXTURE,
    STORAGE_BUFFER,
    DYNAMIC_STORAGE_BUFFER,
    STORAGE_IMAGE,
    INPUT_ATTACHMENT,
};

struct Descriptor {
    Descriptor() = default;
    Descriptor(gfx::Type typeIn) noexcept // NOLINT
    : type(typeIn) {}

    gfx::Type type{gfx::Type::UNKNOWN};
    uint32_t count{1};
};

struct DescriptorBlock {
    ccstd::map<ccstd::string, Descriptor> descriptors;
    ccstd::map<ccstd::string, gfx::UniformBlock> uniformBlocks;
    uint32_t capacity{0};
    uint32_t count{0};
};

struct DescriptorBlockFlattened {
    ccstd::vector<ccstd::string> descriptorNames;
    ccstd::vector<ccstd::string> uniformBlockNames;
    ccstd::vector<Descriptor> descriptors;
    ccstd::vector<gfx::UniformBlock> uniformBlocks;
    uint32_t capacity{0};
    uint32_t count{0};
};

struct DescriptorBlockIndex {
    DescriptorBlockIndex() = default;
    DescriptorBlockIndex(UpdateFrequency updateFrequencyIn, ParameterType parameterTypeIn, DescriptorTypeOrder descriptorTypeIn, gfx::ShaderStageFlagBit visibilityIn) noexcept
    : updateFrequency(updateFrequencyIn),
      parameterType(parameterTypeIn),
      descriptorType(descriptorTypeIn),
      visibility(visibilityIn) {}

    UpdateFrequency updateFrequency{UpdateFrequency::PER_INSTANCE};
    ParameterType parameterType{ParameterType::CONSTANTS};
    DescriptorTypeOrder descriptorType{DescriptorTypeOrder::UNIFORM_BUFFER};
    gfx::ShaderStageFlagBit visibility{gfx::ShaderStageFlagBit::NONE};
};

inline bool operator<(const DescriptorBlockIndex& lhs, const DescriptorBlockIndex& rhs) noexcept {
    return std::forward_as_tuple(lhs.updateFrequency, lhs.parameterType, lhs.descriptorType, lhs.visibility) <
           std::forward_as_tuple(rhs.updateFrequency, rhs.parameterType, rhs.descriptorType, rhs.visibility);
}

struct DescriptorGroupBlockIndex {
    DescriptorGroupBlockIndex() = default;
    DescriptorGroupBlockIndex(UpdateFrequency updateFrequencyIn, ParameterType parameterTypeIn, DescriptorTypeOrder descriptorTypeIn, gfx::ShaderStageFlagBit visibilityIn, gfx::MemoryAccessBit accessTypeIn, gfx::ViewDimension viewDimensionIn, gfx::SampleType sampleTypeIn, gfx::Format formatIn) noexcept
    : updateFrequency(updateFrequencyIn),
      parameterType(parameterTypeIn),
      descriptorType(descriptorTypeIn),
      visibility(visibilityIn),
      accessType(accessTypeIn),
      viewDimension(viewDimensionIn),
      sampleType(sampleTypeIn),
      format(formatIn) {}

    UpdateFrequency updateFrequency{UpdateFrequency::PER_INSTANCE};
    ParameterType parameterType{ParameterType::CONSTANTS};
    DescriptorTypeOrder descriptorType{DescriptorTypeOrder::UNIFORM_BUFFER};
    gfx::ShaderStageFlagBit visibility{gfx::ShaderStageFlagBit::NONE};
    gfx::MemoryAccessBit accessType{gfx::MemoryAccessBit::READ_ONLY};
    gfx::ViewDimension viewDimension{gfx::ViewDimension::UNKNOWN};
    gfx::SampleType sampleType{gfx::SampleType::FLOAT};
    gfx::Format format{gfx::Format::UNKNOWN};
};

inline bool operator<(const DescriptorGroupBlockIndex& lhs, const DescriptorGroupBlockIndex& rhs) noexcept {
    return std::forward_as_tuple(lhs.updateFrequency, lhs.parameterType, lhs.descriptorType, lhs.visibility, lhs.accessType, lhs.viewDimension, lhs.sampleType, lhs.format) <
           std::forward_as_tuple(rhs.updateFrequency, rhs.parameterType, rhs.descriptorType, rhs.visibility, rhs.accessType, rhs.viewDimension, rhs.sampleType, rhs.format);
}

struct DescriptorDB {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {blocks.get_allocator().resource()};
    }

    DescriptorDB(const allocator_type& alloc) noexcept; // NOLINT
    DescriptorDB(DescriptorDB&& rhs, const allocator_type& alloc);
    DescriptorDB(DescriptorDB const& rhs, const allocator_type& alloc);

    DescriptorDB(DescriptorDB&& rhs) noexcept = default;
    DescriptorDB(DescriptorDB const& rhs) = delete;
    DescriptorDB& operator=(DescriptorDB&& rhs) noexcept = default;
    DescriptorDB& operator=(DescriptorDB const& rhs) = default;

    ccstd::pmr::map<DescriptorBlockIndex, DescriptorBlock> blocks;
    ccstd::pmr::map<DescriptorGroupBlockIndex, DescriptorBlock> groupBlocks;
};

struct RenderStageTag {};
struct RenderPhaseTag {};

struct RenderPhase {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {shaders.get_allocator().resource()};
    }

    RenderPhase(const allocator_type& alloc) noexcept; // NOLINT
    RenderPhase(RenderPhase&& rhs, const allocator_type& alloc);
    RenderPhase(RenderPhase const& rhs, const allocator_type& alloc);

    RenderPhase(RenderPhase&& rhs) noexcept = default;
    RenderPhase(RenderPhase const& rhs) = delete;
    RenderPhase& operator=(RenderPhase&& rhs) noexcept = default;
    RenderPhase& operator=(RenderPhase const& rhs) = default;

    PmrTransparentSet<ccstd::pmr::string> shaders;
};

enum class RenderPassType : uint8_t {
    SINGLE_RENDER_PASS,
    RENDER_PASS,
    RENDER_SUBPASS,
};

struct LayoutGraph {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {_vertices.get_allocator().resource()};
    }

    boost::container::pmr::memory_resource* resource() const noexcept {
        return get_allocator().resource();
    }

    LayoutGraph(const allocator_type& alloc) noexcept; // NOLINT
    LayoutGraph(LayoutGraph&& rhs, const allocator_type& alloc);
    LayoutGraph(LayoutGraph const& rhs, const allocator_type& alloc);

    LayoutGraph(LayoutGraph&& rhs) noexcept = default;
    LayoutGraph(LayoutGraph const& rhs) = delete;
    LayoutGraph& operator=(LayoutGraph&& rhs) noexcept = default;
    LayoutGraph& operator=(LayoutGraph const& rhs) = default;

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
        LayoutGraph, vertex_descriptor, out_edge_iterator>::type;

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
    using edge_iterator   = impl::DirectedEdgeIterator<vertex_iterator, out_edge_iterator, LayoutGraph>;
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

    using ownership_iterator   = impl::DirectedEdgeIterator<vertex_iterator, children_iterator, LayoutGraph>;
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
    using VertexTag         = ccstd::variant<RenderStageTag, RenderPhaseTag>;
    using VertexValue       = ccstd::variant<RenderPassType*, RenderPhase*>;
    using VertexConstValue = ccstd::variant<const RenderPassType*, const RenderPhase*>;
    using VertexHandle      = ccstd::variant<
        impl::ValueHandle<RenderStageTag, vertex_descriptor>,
        impl::ValueHandle<RenderPhaseTag, vertex_descriptor>>;

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
        Vertex& operator=(Vertex&& rhs) noexcept = default;
        Vertex& operator=(Vertex const& rhs) = default;

        ccstd::pmr::vector<OutEdge> outEdges;
        ccstd::pmr::vector<InEdge> inEdges;
        VertexHandle handle;
    };

    struct NameTag {};
    struct DescriptorsTag {};

    // Vertices
    ccstd::pmr::vector<Vertex> _vertices;
    // Components
    ccstd::pmr::vector<ccstd::pmr::string> names;
    ccstd::pmr::vector<DescriptorDB> descriptors;
    // PolymorphicGraph
    ccstd::pmr::vector<RenderPassType> stages;
    ccstd::pmr::vector<RenderPhase> phases;
    // Path
    PmrTransparentMap<ccstd::pmr::string, vertex_descriptor> pathIndex;
};

struct UniformData {
    UniformData() = default;
    UniformData(UniformID uniformIDIn, gfx::Type uniformTypeIn, uint32_t offsetIn) noexcept // NOLINT
    : uniformID(uniformIDIn),
      uniformType(uniformTypeIn),
      offset(offsetIn) {}

    UniformID uniformID{0xFFFFFFFF};
    gfx::Type uniformType{gfx::Type::UNKNOWN};
    uint32_t offset{0};
    uint32_t size{0};
};

struct UniformBlockData {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {uniforms.get_allocator().resource()};
    }

    UniformBlockData(const allocator_type& alloc) noexcept; // NOLINT
    UniformBlockData(UniformBlockData&& rhs, const allocator_type& alloc);
    UniformBlockData(UniformBlockData const& rhs, const allocator_type& alloc);

    UniformBlockData(UniformBlockData&& rhs) noexcept = default;
    UniformBlockData(UniformBlockData const& rhs) = delete;
    UniformBlockData& operator=(UniformBlockData&& rhs) noexcept = default;
    UniformBlockData& operator=(UniformBlockData const& rhs) = default;

    uint32_t bufferSize{0};
    ccstd::pmr::vector<UniformData> uniforms;
};

struct NameLocalID {
    uint32_t value{0xFFFFFFFF};
};

inline bool operator==(const NameLocalID& lhs, const NameLocalID& rhs) noexcept {
    return std::forward_as_tuple(lhs.value) ==
           std::forward_as_tuple(rhs.value);
}

inline bool operator!=(const NameLocalID& lhs, const NameLocalID& rhs) noexcept {
    return !(lhs == rhs);
}

inline bool operator<(const NameLocalID& lhs, const NameLocalID& rhs) noexcept {
    return std::forward_as_tuple(lhs.value) <
           std::forward_as_tuple(rhs.value);
}

struct DescriptorData {
    DescriptorData() = default;
    DescriptorData(const NameLocalID& descriptorIDIn, gfx::Type typeIn, uint32_t countIn) noexcept
    : descriptorID(descriptorIDIn),
      type(typeIn),
      count(countIn) {}
    DescriptorData(const NameLocalID& descriptorIDIn, gfx::Type typeIn) noexcept
    : descriptorID(descriptorIDIn),
      type(typeIn) {}
    DescriptorData(const NameLocalID& descriptorIDIn) noexcept // NOLINT
    : descriptorID(descriptorIDIn) {}

    NameLocalID descriptorID;
    gfx::Type type{gfx::Type::UNKNOWN};
    uint32_t count{1};
};

struct DescriptorBlockData {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {descriptors.get_allocator().resource()};
    }

    DescriptorBlockData(const allocator_type& alloc) noexcept; // NOLINT
    DescriptorBlockData(DescriptorTypeOrder typeIn, gfx::ShaderStageFlagBit visibilityIn, uint32_t capacityIn, gfx::MemoryAccessBit accessTypeIn, gfx::ViewDimension viewDimensionIn, gfx::SampleType sampleTypeIn, gfx::Format formatIn, const allocator_type& alloc) noexcept;
    DescriptorBlockData(DescriptorTypeOrder typeIn, gfx::ShaderStageFlagBit visibilityIn, uint32_t capacityIn, const allocator_type& alloc) noexcept;
    DescriptorBlockData(DescriptorBlockData&& rhs, const allocator_type& alloc);
    DescriptorBlockData(DescriptorBlockData const& rhs, const allocator_type& alloc);

    DescriptorBlockData(DescriptorBlockData&& rhs) noexcept = default;
    DescriptorBlockData(DescriptorBlockData const& rhs) = delete;
    DescriptorBlockData& operator=(DescriptorBlockData&& rhs) noexcept = default;
    DescriptorBlockData& operator=(DescriptorBlockData const& rhs) = default;

    DescriptorTypeOrder type{DescriptorTypeOrder::UNIFORM_BUFFER};
    gfx::ShaderStageFlagBit visibility{gfx::ShaderStageFlagBit::NONE};
    uint32_t offset{0};
    uint32_t capacity{0};
    gfx::MemoryAccessBit accessType{gfx::MemoryAccessBit::READ_ONLY};
    gfx::ViewDimension viewDimension{gfx::ViewDimension::UNKNOWN};
    gfx::SampleType sampleType{gfx::SampleType::FLOAT};
    gfx::Format format{gfx::Format::UNKNOWN};
    ccstd::pmr::vector<DescriptorData> descriptors;
};

struct DescriptorSetLayoutData {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {descriptorBlocks.get_allocator().resource()};
    }

    DescriptorSetLayoutData(const allocator_type& alloc) noexcept; // NOLINT
    DescriptorSetLayoutData(uint32_t slotIn, uint32_t capacityIn, ccstd::pmr::vector<DescriptorBlockData> descriptorBlocksIn, PmrUnorderedMap<NameLocalID, gfx::UniformBlock> uniformBlocksIn, PmrFlatMap<NameLocalID, uint32_t> bindingMapIn, const allocator_type& alloc);
    DescriptorSetLayoutData(DescriptorSetLayoutData&& rhs, const allocator_type& alloc);

    DescriptorSetLayoutData(DescriptorSetLayoutData&& rhs) noexcept = default;
    DescriptorSetLayoutData(DescriptorSetLayoutData const& rhs) = delete;
    DescriptorSetLayoutData& operator=(DescriptorSetLayoutData&& rhs) noexcept = default;
    DescriptorSetLayoutData& operator=(DescriptorSetLayoutData const& rhs) = delete;

    uint32_t slot{0xFFFFFFFF};
    uint32_t capacity{0};
    uint32_t uniformBlockCapacity{0};
    uint32_t samplerTextureCapacity{0};
    ccstd::pmr::vector<DescriptorBlockData> descriptorBlocks;
    PmrUnorderedMap<NameLocalID, gfx::UniformBlock> uniformBlocks;
    PmrFlatMap<NameLocalID, uint32_t> bindingMap;
};

struct DescriptorSetData {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {descriptorSetLayoutData.get_allocator().resource()};
    }

    DescriptorSetData(const allocator_type& alloc) noexcept; // NOLINT
    DescriptorSetData(DescriptorSetLayoutData descriptorSetLayoutDataIn, IntrusivePtr<gfx::DescriptorSetLayout> descriptorSetLayoutIn, IntrusivePtr<gfx::DescriptorSet> descriptorSetIn, const allocator_type& alloc);
    DescriptorSetData(DescriptorSetData&& rhs, const allocator_type& alloc);

    DescriptorSetData(DescriptorSetData&& rhs) noexcept = default;
    DescriptorSetData(DescriptorSetData const& rhs) = delete;
    DescriptorSetData& operator=(DescriptorSetData&& rhs) noexcept = default;
    DescriptorSetData& operator=(DescriptorSetData const& rhs) = delete;

    DescriptorSetLayoutData descriptorSetLayoutData;
    gfx::DescriptorSetLayoutInfo descriptorSetLayoutInfo;
    IntrusivePtr<gfx::DescriptorSetLayout> descriptorSetLayout;
    IntrusivePtr<gfx::DescriptorSet> descriptorSet;
};

struct PipelineLayoutData {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {descriptorSets.get_allocator().resource()};
    }

    PipelineLayoutData(const allocator_type& alloc) noexcept; // NOLINT
    PipelineLayoutData(PipelineLayoutData&& rhs, const allocator_type& alloc);

    PipelineLayoutData(PipelineLayoutData&& rhs) noexcept = default;
    PipelineLayoutData(PipelineLayoutData const& rhs) = delete;
    PipelineLayoutData& operator=(PipelineLayoutData&& rhs) noexcept = default;
    PipelineLayoutData& operator=(PipelineLayoutData const& rhs) = delete;

    ccstd::pmr::map<UpdateFrequency, DescriptorSetData> descriptorSets;
    ccstd::pmr::map<UpdateFrequency, DescriptorSetData> descriptorGroups;
};

struct ShaderBindingData {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {descriptorBindings.get_allocator().resource()};
    }

    ShaderBindingData(const allocator_type& alloc) noexcept; // NOLINT
    ShaderBindingData(ShaderBindingData&& rhs, const allocator_type& alloc);

    ShaderBindingData(ShaderBindingData&& rhs) noexcept = default;
    ShaderBindingData(ShaderBindingData const& rhs) = delete;
    ShaderBindingData& operator=(ShaderBindingData&& rhs) noexcept = default;
    ShaderBindingData& operator=(ShaderBindingData const& rhs) = delete;

    PmrFlatMap<NameLocalID, uint32_t> descriptorBindings;
};

struct ShaderLayoutData {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {layoutData.get_allocator().resource()};
    }

    ShaderLayoutData(const allocator_type& alloc) noexcept; // NOLINT
    ShaderLayoutData(ShaderLayoutData&& rhs, const allocator_type& alloc);

    ShaderLayoutData(ShaderLayoutData&& rhs) noexcept = default;
    ShaderLayoutData(ShaderLayoutData const& rhs) = delete;
    ShaderLayoutData& operator=(ShaderLayoutData&& rhs) noexcept = default;
    ShaderLayoutData& operator=(ShaderLayoutData const& rhs) = delete;

    ccstd::pmr::map<UpdateFrequency, DescriptorSetLayoutData> layoutData;
    ccstd::pmr::map<UpdateFrequency, ShaderBindingData> bindingData;
};

struct TechniqueData {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {passes.get_allocator().resource()};
    }

    TechniqueData(const allocator_type& alloc) noexcept; // NOLINT
    TechniqueData(TechniqueData&& rhs, const allocator_type& alloc);

    TechniqueData(TechniqueData&& rhs) noexcept = default;
    TechniqueData(TechniqueData const& rhs) = delete;
    TechniqueData& operator=(TechniqueData&& rhs) noexcept = default;
    TechniqueData& operator=(TechniqueData const& rhs) = delete;

    ccstd::pmr::vector<ShaderLayoutData> passes;
};

struct EffectData {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {techniques.get_allocator().resource()};
    }

    EffectData(const allocator_type& alloc) noexcept; // NOLINT
    EffectData(EffectData&& rhs, const allocator_type& alloc);

    EffectData(EffectData&& rhs) noexcept = default;
    EffectData(EffectData const& rhs) = delete;
    EffectData& operator=(EffectData&& rhs) noexcept = default;
    EffectData& operator=(EffectData const& rhs) = delete;

    ccstd::pmr::map<ccstd::pmr::string, TechniqueData> techniques;
};

struct ShaderProgramData {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {layout.get_allocator().resource()};
    }

    ShaderProgramData(const allocator_type& alloc) noexcept; // NOLINT
    ShaderProgramData(ShaderProgramData&& rhs, const allocator_type& alloc);

    ShaderProgramData(ShaderProgramData&& rhs) noexcept = default;
    ShaderProgramData(ShaderProgramData const& rhs) = delete;
    ShaderProgramData& operator=(ShaderProgramData&& rhs) noexcept = default;
    ShaderProgramData& operator=(ShaderProgramData const& rhs) = delete;

    PipelineLayoutData layout;
    IntrusivePtr<gfx::PipelineLayout> pipelineLayout;
};

struct RenderStageData {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {descriptorVisibility.get_allocator().resource()};
    }

    RenderStageData(const allocator_type& alloc) noexcept; // NOLINT
    RenderStageData(RenderStageData&& rhs, const allocator_type& alloc);

    RenderStageData(RenderStageData&& rhs) noexcept = default;
    RenderStageData(RenderStageData const& rhs) = delete;
    RenderStageData& operator=(RenderStageData&& rhs) noexcept = default;
    RenderStageData& operator=(RenderStageData const& rhs) = delete;

    PmrUnorderedMap<NameLocalID, gfx::ShaderStageFlagBit> descriptorVisibility;
};

struct RenderPhaseData {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {rootSignature.get_allocator().resource()};
    }

    RenderPhaseData(const allocator_type& alloc) noexcept; // NOLINT
    RenderPhaseData(RenderPhaseData&& rhs, const allocator_type& alloc);

    RenderPhaseData(RenderPhaseData&& rhs) noexcept = default;
    RenderPhaseData(RenderPhaseData const& rhs) = delete;
    RenderPhaseData& operator=(RenderPhaseData&& rhs) noexcept = default;
    RenderPhaseData& operator=(RenderPhaseData const& rhs) = delete;

    ccstd::pmr::string rootSignature;
    ccstd::pmr::vector<ShaderProgramData> shaderPrograms;
    PmrTransparentMap<ccstd::pmr::string, uint32_t> shaderIndex;
    IntrusivePtr<gfx::PipelineLayout> pipelineLayout;
};

struct LayoutGraphData {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {_vertices.get_allocator().resource()};
    }

    boost::container::pmr::memory_resource* resource() const noexcept {
        return get_allocator().resource();
    }

    LayoutGraphData(const allocator_type& alloc) noexcept; // NOLINT
    LayoutGraphData(LayoutGraphData&& rhs, const allocator_type& alloc);

    LayoutGraphData(LayoutGraphData&& rhs) noexcept = default;
    LayoutGraphData(LayoutGraphData const& rhs) = delete;
    LayoutGraphData& operator=(LayoutGraphData&& rhs) noexcept = default;
    LayoutGraphData& operator=(LayoutGraphData const& rhs) = delete;

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
        LayoutGraphData, vertex_descriptor, out_edge_iterator>::type;

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
    using edge_iterator   = impl::DirectedEdgeIterator<vertex_iterator, out_edge_iterator, LayoutGraphData>;
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

    using ownership_iterator   = impl::DirectedEdgeIterator<vertex_iterator, children_iterator, LayoutGraphData>;
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
    using VertexTag         = ccstd::variant<RenderStageTag, RenderPhaseTag>;
    using VertexValue       = ccstd::variant<RenderStageData*, RenderPhaseData*>;
    using VertexConstValue = ccstd::variant<const RenderStageData*, const RenderPhaseData*>;
    using VertexHandle      = ccstd::variant<
        impl::ValueHandle<RenderStageTag, vertex_descriptor>,
        impl::ValueHandle<RenderPhaseTag, vertex_descriptor>>;

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
        Vertex& operator=(Vertex&& rhs) noexcept = default;
        Vertex& operator=(Vertex const& rhs) = default;

        ccstd::pmr::vector<OutEdge> outEdges;
        ccstd::pmr::vector<InEdge> inEdges;
        VertexHandle handle;
    };

    struct NameTag {};
    struct UpdateTag {};
    struct LayoutTag {};

    // Vertices
    ccstd::pmr::vector<Vertex> _vertices;
    // Components
    ccstd::pmr::vector<ccstd::pmr::string> names;
    ccstd::pmr::vector<UpdateFrequency> updateFrequencies;
    ccstd::pmr::vector<PipelineLayoutData> layouts;
    // PolymorphicGraph
    ccstd::pmr::vector<RenderStageData> stages;
    ccstd::pmr::vector<RenderPhaseData> phases;
    // Members
    ccstd::pmr::vector<ccstd::pmr::string> valueNames;
    PmrFlatMap<ccstd::pmr::string, NameLocalID> attributeIndex;
    PmrFlatMap<ccstd::pmr::string, NameLocalID> constantIndex;
    PmrFlatMap<ccstd::pmr::string, uint32_t> shaderLayoutIndex;
    PmrFlatMap<ccstd::pmr::string, EffectData> effects;
    ccstd::string constantMacros;
    // Path
    PmrTransparentMap<ccstd::pmr::string, vertex_descriptor> pathIndex;
};

} // namespace render

} // namespace cc

namespace ccstd {

inline hash_t hash<cc::render::NameLocalID>::operator()(const cc::render::NameLocalID& val) const noexcept {
    hash_t seed = 0;
    hash_combine(seed, val.value);
    return seed;
}

} // namespace ccstd

// NOLINTEND(misc-include-cleaner, bugprone-easily-swappable-parameters)
// clang-format on
