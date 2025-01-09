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
#include "RenderGraphTypes.h"
#include "cocos/base/Ptr.h"

namespace cc {

namespace render {

RasterView::RasterView(const allocator_type& alloc) noexcept
: slotName(alloc),
  slotName1(alloc) {}

RasterView::RasterView(ccstd::pmr::string slotNameIn, AccessType accessTypeIn, AttachmentType attachmentTypeIn, gfx::LoadOp loadOpIn, gfx::StoreOp storeOpIn, gfx::ClearFlagBit clearFlagsIn, const gfx::Color& clearColorIn, gfx::ShaderStageFlagBit shaderStageFlagsIn, const allocator_type& alloc) // NOLINT
: slotName(std::move(slotNameIn), alloc),
  slotName1(alloc),
  accessType(accessTypeIn),
  attachmentType(attachmentTypeIn),
  loadOp(loadOpIn),
  storeOp(storeOpIn),
  clearFlags(clearFlagsIn),
  clearColor(clearColorIn),
  shaderStageFlags(shaderStageFlagsIn) {}

RasterView::RasterView(ccstd::pmr::string slotNameIn, ccstd::pmr::string slotName1In, AccessType accessTypeIn, AttachmentType attachmentTypeIn, gfx::LoadOp loadOpIn, gfx::StoreOp storeOpIn, gfx::ClearFlagBit clearFlagsIn, const gfx::Color& clearColorIn, gfx::ShaderStageFlagBit shaderStageFlagsIn, const allocator_type& alloc) // NOLINT
: slotName(std::move(slotNameIn), alloc),
  slotName1(std::move(slotName1In), alloc),
  accessType(accessTypeIn),
  attachmentType(attachmentTypeIn),
  loadOp(loadOpIn),
  storeOp(storeOpIn),
  clearFlags(clearFlagsIn),
  clearColor(clearColorIn),
  shaderStageFlags(shaderStageFlagsIn) {}

RasterView::RasterView(RasterView&& rhs, const allocator_type& alloc)
: slotName(std::move(rhs.slotName), alloc),
  slotName1(std::move(rhs.slotName1), alloc),
  accessType(rhs.accessType),
  attachmentType(rhs.attachmentType),
  loadOp(rhs.loadOp),
  storeOp(rhs.storeOp),
  clearFlags(rhs.clearFlags),
  clearColor(rhs.clearColor),
  slotID(rhs.slotID),
  shaderStageFlags(rhs.shaderStageFlags) {}

RasterView::RasterView(RasterView const& rhs, const allocator_type& alloc)
: slotName(rhs.slotName, alloc),
  slotName1(rhs.slotName1, alloc),
  accessType(rhs.accessType),
  attachmentType(rhs.attachmentType),
  loadOp(rhs.loadOp),
  storeOp(rhs.storeOp),
  clearFlags(rhs.clearFlags),
  clearColor(rhs.clearColor),
  slotID(rhs.slotID),
  shaderStageFlags(rhs.shaderStageFlags) {}

ComputeView::ComputeView(const allocator_type& alloc) noexcept
: name(alloc) {}

ComputeView::ComputeView(ccstd::pmr::string nameIn, AccessType accessTypeIn, gfx::ClearFlagBit clearFlagsIn, ClearValueType clearValueTypeIn, ClearValue clearValueIn, gfx::ShaderStageFlagBit shaderStageFlagsIn, const allocator_type& alloc)
: name(std::move(nameIn), alloc),
  accessType(accessTypeIn),
  clearFlags(clearFlagsIn),
  clearValueType(clearValueTypeIn),
  clearValue(clearValueIn),
  shaderStageFlags(shaderStageFlagsIn) {}

ComputeView::ComputeView(ccstd::pmr::string nameIn, AccessType accessTypeIn, uint32_t planeIn, gfx::ClearFlagBit clearFlagsIn, ClearValueType clearValueTypeIn, ClearValue clearValueIn, gfx::ShaderStageFlagBit shaderStageFlagsIn, const allocator_type& alloc)
: name(std::move(nameIn), alloc),
  accessType(accessTypeIn),
  plane(planeIn),
  clearFlags(clearFlagsIn),
  clearValueType(clearValueTypeIn),
  clearValue(clearValueIn),
  shaderStageFlags(shaderStageFlagsIn) {}

ComputeView::ComputeView(ComputeView&& rhs, const allocator_type& alloc)
: name(std::move(rhs.name), alloc),
  accessType(rhs.accessType),
  plane(rhs.plane),
  clearFlags(rhs.clearFlags),
  clearValueType(rhs.clearValueType),
  clearValue(rhs.clearValue),
  shaderStageFlags(rhs.shaderStageFlags) {}

ComputeView::ComputeView(ComputeView const& rhs, const allocator_type& alloc)
: name(rhs.name, alloc),
  accessType(rhs.accessType),
  plane(rhs.plane),
  clearFlags(rhs.clearFlags),
  clearValueType(rhs.clearValueType),
  clearValue(rhs.clearValue),
  shaderStageFlags(rhs.shaderStageFlags) {}

Subpass::Subpass(const allocator_type& alloc) noexcept
: rasterViews(alloc),
  computeViews(alloc),
  resolvePairs(alloc) {}

Subpass::Subpass(Subpass&& rhs, const allocator_type& alloc)
: rasterViews(std::move(rhs.rasterViews), alloc),
  computeViews(std::move(rhs.computeViews), alloc),
  resolvePairs(std::move(rhs.resolvePairs), alloc) {}

Subpass::Subpass(Subpass const& rhs, const allocator_type& alloc)
: rasterViews(rhs.rasterViews, alloc),
  computeViews(rhs.computeViews, alloc),
  resolvePairs(rhs.resolvePairs, alloc) {}

SubpassGraph::SubpassGraph(const allocator_type& alloc) noexcept
: _vertices(alloc),
  names(alloc),
  subpasses(alloc) {}

SubpassGraph::SubpassGraph(SubpassGraph&& rhs, const allocator_type& alloc)
: _vertices(std::move(rhs._vertices), alloc),
  names(std::move(rhs.names), alloc),
  subpasses(std::move(rhs.subpasses), alloc) {}

SubpassGraph::SubpassGraph(SubpassGraph const& rhs, const allocator_type& alloc)
: _vertices(rhs._vertices, alloc),
  names(rhs.names, alloc),
  subpasses(rhs.subpasses, alloc) {}

// ContinuousContainer
void SubpassGraph::reserve(vertices_size_type sz) {
    _vertices.reserve(sz);
    names.reserve(sz);
    subpasses.reserve(sz);
}

SubpassGraph::Vertex::Vertex(const allocator_type& alloc) noexcept
: outEdges(alloc),
  inEdges(alloc) {}

SubpassGraph::Vertex::Vertex(Vertex&& rhs, const allocator_type& alloc)
: outEdges(std::move(rhs.outEdges), alloc),
  inEdges(std::move(rhs.inEdges), alloc) {}

SubpassGraph::Vertex::Vertex(Vertex const& rhs, const allocator_type& alloc)
: outEdges(rhs.outEdges, alloc),
  inEdges(rhs.inEdges, alloc) {}

RasterSubpass::RasterSubpass(const allocator_type& alloc) noexcept
: rasterViews(alloc),
  computeViews(alloc),
  resolvePairs(alloc) {}

RasterSubpass::RasterSubpass(uint32_t subpassIDIn, uint32_t countIn, uint32_t qualityIn, const allocator_type& alloc) noexcept
: rasterViews(alloc),
  computeViews(alloc),
  resolvePairs(alloc),
  subpassID(subpassIDIn),
  count(countIn),
  quality(qualityIn) {}

RasterSubpass::RasterSubpass(RasterSubpass&& rhs, const allocator_type& alloc)
: rasterViews(std::move(rhs.rasterViews), alloc),
  computeViews(std::move(rhs.computeViews), alloc),
  resolvePairs(std::move(rhs.resolvePairs), alloc),
  viewport(rhs.viewport),
  subpassID(rhs.subpassID),
  count(rhs.count),
  quality(rhs.quality),
  showStatistics(rhs.showStatistics) {}

RasterSubpass::RasterSubpass(RasterSubpass const& rhs, const allocator_type& alloc)
: rasterViews(rhs.rasterViews, alloc),
  computeViews(rhs.computeViews, alloc),
  resolvePairs(rhs.resolvePairs, alloc),
  viewport(rhs.viewport),
  subpassID(rhs.subpassID),
  count(rhs.count),
  quality(rhs.quality),
  showStatistics(rhs.showStatistics) {}

ComputeSubpass::ComputeSubpass(const allocator_type& alloc) noexcept
: rasterViews(alloc),
  computeViews(alloc) {}

ComputeSubpass::ComputeSubpass(uint32_t subpassIDIn, const allocator_type& alloc) noexcept
: rasterViews(alloc),
  computeViews(alloc),
  subpassID(subpassIDIn) {}

ComputeSubpass::ComputeSubpass(ComputeSubpass&& rhs, const allocator_type& alloc)
: rasterViews(std::move(rhs.rasterViews), alloc),
  computeViews(std::move(rhs.computeViews), alloc),
  subpassID(rhs.subpassID) {}

ComputeSubpass::ComputeSubpass(ComputeSubpass const& rhs, const allocator_type& alloc)
: rasterViews(rhs.rasterViews, alloc),
  computeViews(rhs.computeViews, alloc),
  subpassID(rhs.subpassID) {}

RasterPass::RasterPass(const allocator_type& alloc) noexcept
: rasterViews(alloc),
  computeViews(alloc),
  attachmentIndexMap(alloc),
  textures(alloc),
  subpassGraph(alloc),
  versionName(alloc) {}

RasterPass::RasterPass(RasterPass&& rhs, const allocator_type& alloc)
: rasterViews(std::move(rhs.rasterViews), alloc),
  computeViews(std::move(rhs.computeViews), alloc),
  attachmentIndexMap(std::move(rhs.attachmentIndexMap), alloc),
  textures(std::move(rhs.textures), alloc),
  subpassGraph(std::move(rhs.subpassGraph), alloc),
  width(rhs.width),
  height(rhs.height),
  count(rhs.count),
  quality(rhs.quality),
  viewport(rhs.viewport),
  versionName(std::move(rhs.versionName), alloc),
  version(rhs.version),
  hashValue(rhs.hashValue),
  showStatistics(rhs.showStatistics) {}

RasterPass::RasterPass(RasterPass const& rhs, const allocator_type& alloc)
: rasterViews(rhs.rasterViews, alloc),
  computeViews(rhs.computeViews, alloc),
  attachmentIndexMap(rhs.attachmentIndexMap, alloc),
  textures(rhs.textures, alloc),
  subpassGraph(rhs.subpassGraph, alloc),
  width(rhs.width),
  height(rhs.height),
  count(rhs.count),
  quality(rhs.quality),
  viewport(rhs.viewport),
  versionName(rhs.versionName, alloc),
  version(rhs.version),
  hashValue(rhs.hashValue),
  showStatistics(rhs.showStatistics) {}

PersistentRenderPassAndFramebuffer::PersistentRenderPassAndFramebuffer(const allocator_type& alloc) noexcept
: clearColors(alloc) {}

PersistentRenderPassAndFramebuffer::PersistentRenderPassAndFramebuffer(IntrusivePtr<gfx::RenderPass> renderPassIn, IntrusivePtr<gfx::Framebuffer> framebufferIn, const allocator_type& alloc) noexcept
: renderPass(std::move(renderPassIn)),
  framebuffer(std::move(framebufferIn)),
  clearColors(alloc) {}

PersistentRenderPassAndFramebuffer::PersistentRenderPassAndFramebuffer(PersistentRenderPassAndFramebuffer&& rhs, const allocator_type& alloc)
: renderPass(std::move(rhs.renderPass)),
  framebuffer(std::move(rhs.framebuffer)),
  clearColors(std::move(rhs.clearColors), alloc),
  clearDepth(rhs.clearDepth),
  clearStencil(rhs.clearStencil) {}

PersistentRenderPassAndFramebuffer::PersistentRenderPassAndFramebuffer(PersistentRenderPassAndFramebuffer const& rhs, const allocator_type& alloc)
: renderPass(rhs.renderPass),
  framebuffer(rhs.framebuffer),
  clearColors(rhs.clearColors, alloc),
  clearDepth(rhs.clearDepth),
  clearStencil(rhs.clearStencil) {}

ResourceGraph::ResourceGraph(const allocator_type& alloc) noexcept
: _vertices(alloc),
  names(alloc),
  descs(alloc),
  traits(alloc),
  states(alloc),
  samplerInfo(alloc),
  resources(alloc),
  managedBuffers(alloc),
  managedTextures(alloc),
  buffers(alloc),
  textures(alloc),
  framebuffers(alloc),
  swapchains(alloc),
  formatViews(alloc),
  subresourceViews(alloc),
  valueIndex(alloc),
  renderPasses(alloc) {}

// ContinuousContainer
void ResourceGraph::reserve(vertices_size_type sz) {
    _vertices.reserve(sz);
    names.reserve(sz);
    descs.reserve(sz);
    traits.reserve(sz);
    states.reserve(sz);
    samplerInfo.reserve(sz);
}

ResourceGraph::Vertex::Vertex(const allocator_type& alloc) noexcept
: outEdges(alloc),
  inEdges(alloc) {}

ResourceGraph::Vertex::Vertex(Vertex&& rhs, const allocator_type& alloc)
: outEdges(std::move(rhs.outEdges), alloc),
  inEdges(std::move(rhs.inEdges), alloc),
  handle(std::move(rhs.handle)) {}

ResourceGraph::Vertex::Vertex(Vertex const& rhs, const allocator_type& alloc)
: outEdges(rhs.outEdges, alloc),
  inEdges(rhs.inEdges, alloc),
  handle(rhs.handle) {}

ComputePass::ComputePass(const allocator_type& alloc) noexcept
: computeViews(alloc),
  textures(alloc) {}

ComputePass::ComputePass(ComputePass&& rhs, const allocator_type& alloc)
: computeViews(std::move(rhs.computeViews), alloc),
  textures(std::move(rhs.textures), alloc) {}

ComputePass::ComputePass(ComputePass const& rhs, const allocator_type& alloc)
: computeViews(rhs.computeViews, alloc),
  textures(rhs.textures, alloc) {}

ResolvePass::ResolvePass(const allocator_type& alloc) noexcept
: resolvePairs(alloc) {}

ResolvePass::ResolvePass(ResolvePass&& rhs, const allocator_type& alloc)
: resolvePairs(std::move(rhs.resolvePairs), alloc) {}

ResolvePass::ResolvePass(ResolvePass const& rhs, const allocator_type& alloc)
: resolvePairs(rhs.resolvePairs, alloc) {}

CopyPass::CopyPass(const allocator_type& alloc) noexcept
: copyPairs(alloc),
  uploadPairs(alloc) {}

CopyPass::CopyPass(CopyPass&& rhs, const allocator_type& alloc)
: copyPairs(std::move(rhs.copyPairs), alloc),
  uploadPairs(std::move(rhs.uploadPairs), alloc) {}

MovePass::MovePass(const allocator_type& alloc) noexcept
: movePairs(alloc) {}

MovePass::MovePass(MovePass&& rhs, const allocator_type& alloc)
: movePairs(std::move(rhs.movePairs), alloc) {}

MovePass::MovePass(MovePass const& rhs, const allocator_type& alloc)
: movePairs(rhs.movePairs, alloc) {}

RaytracePass::RaytracePass(const allocator_type& alloc) noexcept
: computeViews(alloc) {}

RaytracePass::RaytracePass(RaytracePass&& rhs, const allocator_type& alloc)
: computeViews(std::move(rhs.computeViews), alloc) {}

RaytracePass::RaytracePass(RaytracePass const& rhs, const allocator_type& alloc)
: computeViews(rhs.computeViews, alloc) {}

ClearView::ClearView(const allocator_type& alloc) noexcept
: slotName(alloc) {}

ClearView::ClearView(ccstd::pmr::string slotNameIn, gfx::ClearFlagBit clearFlagsIn, const gfx::Color& clearColorIn, const allocator_type& alloc)
: slotName(std::move(slotNameIn), alloc),
  clearFlags(clearFlagsIn),
  clearColor(clearColorIn) {}

ClearView::ClearView(ClearView&& rhs, const allocator_type& alloc)
: slotName(std::move(rhs.slotName), alloc),
  clearFlags(rhs.clearFlags),
  clearColor(rhs.clearColor) {}

ClearView::ClearView(ClearView const& rhs, const allocator_type& alloc)
: slotName(rhs.slotName, alloc),
  clearFlags(rhs.clearFlags),
  clearColor(rhs.clearColor) {}

RenderData::RenderData(const allocator_type& alloc) noexcept
: constants(alloc),
  buffers(alloc),
  textures(alloc),
  samplers(alloc),
  custom(alloc) {}

RenderData::RenderData(RenderData&& rhs, const allocator_type& alloc)
: constants(std::move(rhs.constants), alloc),
  buffers(std::move(rhs.buffers), alloc),
  textures(std::move(rhs.textures), alloc),
  samplers(std::move(rhs.samplers), alloc),
  custom(std::move(rhs.custom), alloc) {}

RenderGraph::RenderGraph(const allocator_type& alloc) noexcept
: objects(alloc),
  _vertices(alloc),
  names(alloc),
  layoutNodes(alloc),
  data(alloc),
  valid(alloc),
  rasterPasses(alloc),
  rasterSubpasses(alloc),
  computeSubpasses(alloc),
  computePasses(alloc),
  resolvePasses(alloc),
  copyPasses(alloc),
  movePasses(alloc),
  raytracePasses(alloc),
  renderQueues(alloc),
  scenes(alloc),
  blits(alloc),
  dispatches(alloc),
  clearViews(alloc),
  viewports(alloc),
  index(alloc),
  sortedVertices(alloc) {}

RenderGraph::RenderGraph(RenderGraph&& rhs, const allocator_type& alloc)
: objects(std::move(rhs.objects), alloc),
  _vertices(std::move(rhs._vertices), alloc),
  names(std::move(rhs.names), alloc),
  layoutNodes(std::move(rhs.layoutNodes), alloc),
  data(std::move(rhs.data), alloc),
  valid(std::move(rhs.valid), alloc),
  rasterPasses(std::move(rhs.rasterPasses), alloc),
  rasterSubpasses(std::move(rhs.rasterSubpasses), alloc),
  computeSubpasses(std::move(rhs.computeSubpasses), alloc),
  computePasses(std::move(rhs.computePasses), alloc),
  resolvePasses(std::move(rhs.resolvePasses), alloc),
  copyPasses(std::move(rhs.copyPasses), alloc),
  movePasses(std::move(rhs.movePasses), alloc),
  raytracePasses(std::move(rhs.raytracePasses), alloc),
  renderQueues(std::move(rhs.renderQueues), alloc),
  scenes(std::move(rhs.scenes), alloc),
  blits(std::move(rhs.blits), alloc),
  dispatches(std::move(rhs.dispatches), alloc),
  clearViews(std::move(rhs.clearViews), alloc),
  viewports(std::move(rhs.viewports), alloc),
  index(std::move(rhs.index), alloc),
  sortedVertices(std::move(rhs.sortedVertices), alloc) {}

// ContinuousContainer
void RenderGraph::reserve(vertices_size_type sz) {
    objects.reserve(sz);
    _vertices.reserve(sz);
    names.reserve(sz);
    layoutNodes.reserve(sz);
    data.reserve(sz);
    valid.reserve(sz);
}

RenderGraph::Object::Object(const allocator_type& alloc) noexcept
: children(alloc),
  parents(alloc) {}

RenderGraph::Object::Object(Object&& rhs, const allocator_type& alloc)
: children(std::move(rhs.children), alloc),
  parents(std::move(rhs.parents), alloc) {}

RenderGraph::Object::Object(Object const& rhs, const allocator_type& alloc)
: children(rhs.children, alloc),
  parents(rhs.parents, alloc) {}

RenderGraph::Vertex::Vertex(const allocator_type& alloc) noexcept
: outEdges(alloc),
  inEdges(alloc) {}

RenderGraph::Vertex::Vertex(Vertex&& rhs, const allocator_type& alloc)
: outEdges(std::move(rhs.outEdges), alloc),
  inEdges(std::move(rhs.inEdges), alloc),
  handle(std::move(rhs.handle)) {}

RenderGraph::Vertex::Vertex(Vertex const& rhs, const allocator_type& alloc)
: outEdges(rhs.outEdges, alloc),
  inEdges(rhs.inEdges, alloc),
  handle(rhs.handle) {}

} // namespace render

} // namespace cc

// NOLINTEND(misc-include-cleaner)
// clang-format on
