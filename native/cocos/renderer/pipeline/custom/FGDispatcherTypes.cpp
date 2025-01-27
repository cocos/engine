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
#include "FGDispatcherTypes.h"

namespace cc {

namespace render {

ResourceAccessNode::ResourceAccessNode(const allocator_type& alloc) noexcept
: resourceStatus(alloc) {}

ResourceAccessNode::ResourceAccessNode(ResourceAccessNode&& rhs, const allocator_type& alloc)
: resourceStatus(std::move(rhs.resourceStatus), alloc) {}

ResourceAccessNode::ResourceAccessNode(ResourceAccessNode const& rhs, const allocator_type& alloc)
: resourceStatus(rhs.resourceStatus, alloc) {}

AttachmentInfo::AttachmentInfo(const allocator_type& alloc) noexcept
: parentName(alloc) {}

AttachmentInfo::AttachmentInfo(AttachmentInfo&& rhs, const allocator_type& alloc)
: parentName(std::move(rhs.parentName), alloc),
  attachmentIndex(rhs.attachmentIndex),
  isResolveView(rhs.isResolveView) {}

AttachmentInfo::AttachmentInfo(AttachmentInfo const& rhs, const allocator_type& alloc)
: parentName(rhs.parentName, alloc),
  attachmentIndex(rhs.attachmentIndex),
  isResolveView(rhs.isResolveView) {}

FGRenderPassInfo::FGRenderPassInfo(const allocator_type& alloc) noexcept
: orderedViews(alloc),
  viewIndex(alloc) {}

FGRenderPassInfo::FGRenderPassInfo(FGRenderPassInfo&& rhs, const allocator_type& alloc)
: colorAccesses(std::move(rhs.colorAccesses)),
  dsAccess(rhs.dsAccess),
  dsResolveAccess(rhs.dsResolveAccess),
  rpInfo(std::move(rhs.rpInfo)),
  orderedViews(std::move(rhs.orderedViews), alloc),
  viewIndex(std::move(rhs.viewIndex), alloc),
  resolveCount(rhs.resolveCount),
  uniqueRasterViewCount(rhs.uniqueRasterViewCount) {}

FGRenderPassInfo::FGRenderPassInfo(FGRenderPassInfo const& rhs, const allocator_type& alloc)
: colorAccesses(rhs.colorAccesses),
  dsAccess(rhs.dsAccess),
  dsResolveAccess(rhs.dsResolveAccess),
  rpInfo(rhs.rpInfo),
  orderedViews(rhs.orderedViews, alloc),
  viewIndex(rhs.viewIndex, alloc),
  resolveCount(rhs.resolveCount),
  uniqueRasterViewCount(rhs.uniqueRasterViewCount) {}

ResourceAccessGraph::ResourceAccessGraph(const allocator_type& alloc) noexcept
: _vertices(alloc),
  passID(alloc),
  passResource(alloc),
  rpInfo(alloc),
  barrier(alloc),
  passIndex(alloc),
  resourceNames(alloc),
  resourceIndex(alloc),
  leafPasses(alloc),
  culledPasses(alloc),
  resourceLifeRecord(alloc),
  topologicalOrder(alloc),
  resourceAccess(alloc),
  movedTarget(alloc),
  movedSourceStatus(alloc),
  movedTargetStatus(alloc) {}

// ContinuousContainer
void ResourceAccessGraph::reserve(vertices_size_type sz) {
    _vertices.reserve(sz);
    passID.reserve(sz);
    passResource.reserve(sz);
    rpInfo.reserve(sz);
    barrier.reserve(sz);
}

ResourceAccessGraph::Vertex::Vertex(const allocator_type& alloc) noexcept
: outEdges(alloc),
  inEdges(alloc) {}

ResourceAccessGraph::Vertex::Vertex(Vertex&& rhs, const allocator_type& alloc)
: outEdges(std::move(rhs.outEdges), alloc),
  inEdges(std::move(rhs.inEdges), alloc) {}

ResourceAccessGraph::Vertex::Vertex(Vertex const& rhs, const allocator_type& alloc)
: outEdges(rhs.outEdges, alloc),
  inEdges(rhs.inEdges, alloc) {}

RelationGraph::RelationGraph(const allocator_type& alloc) noexcept
: _vertices(alloc),
  descID(alloc),
  vertexMap(alloc) {}

// ContinuousContainer
void RelationGraph::reserve(vertices_size_type sz) {
    _vertices.reserve(sz);
    descID.reserve(sz);
}

RelationGraph::Vertex::Vertex(const allocator_type& alloc) noexcept
: outEdges(alloc),
  inEdges(alloc) {}

RelationGraph::Vertex::Vertex(Vertex&& rhs, const allocator_type& alloc)
: outEdges(std::move(rhs.outEdges), alloc),
  inEdges(std::move(rhs.inEdges), alloc) {}

RelationGraph::Vertex::Vertex(Vertex const& rhs, const allocator_type& alloc)
: outEdges(rhs.outEdges, alloc),
  inEdges(rhs.inEdges, alloc) {}

RenderingInfo::RenderingInfo(const allocator_type& alloc) noexcept
: clearColors(alloc) {}

RenderingInfo::RenderingInfo(RenderingInfo&& rhs, const allocator_type& alloc)
: renderpassInfo(std::move(rhs.renderpassInfo)),
  framebufferInfo(std::move(rhs.framebufferInfo)),
  clearColors(std::move(rhs.clearColors), alloc),
  clearDepth(rhs.clearDepth),
  clearStencil(rhs.clearStencil) {}

RenderingInfo::RenderingInfo(RenderingInfo const& rhs, const allocator_type& alloc)
: renderpassInfo(rhs.renderpassInfo),
  framebufferInfo(rhs.framebufferInfo),
  clearColors(rhs.clearColors, alloc),
  clearDepth(rhs.clearDepth),
  clearStencil(rhs.clearStencil) {}

FrameGraphDispatcher::FrameGraphDispatcher(ResourceGraph& resourceGraphIn, const RenderGraph& renderGraphIn, const LayoutGraphData& layoutGraphIn, boost::container::pmr::memory_resource* scratchIn, const allocator_type& alloc) noexcept
: resourceAccessGraph(alloc),
  resourceGraph(resourceGraphIn),
  renderGraph(renderGraphIn),
  layoutGraph(layoutGraphIn),
  scratch(scratchIn),
  relationGraph(alloc) {}

} // namespace render

} // namespace cc

// NOLINTEND(misc-include-cleaner, bugprone-easily-swappable-parameters)
// clang-format on
