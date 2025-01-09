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
#include "NativePipelineTypes.h"

namespace cc {

namespace render {

RenderInstancingQueue::RenderInstancingQueue(const allocator_type& alloc) noexcept
: sortedBatches(alloc),
  passInstances(alloc),
  instanceBuffers(alloc) {}

RenderInstancingQueue::RenderInstancingQueue(RenderInstancingQueue&& rhs, const allocator_type& alloc)
: sortedBatches(std::move(rhs.sortedBatches), alloc),
  passInstances(std::move(rhs.passInstances), alloc),
  instanceBuffers(std::move(rhs.instanceBuffers), alloc) {}

RenderInstancingQueue::RenderInstancingQueue(RenderInstancingQueue const& rhs, const allocator_type& alloc)
: sortedBatches(rhs.sortedBatches, alloc),
  passInstances(rhs.passInstances, alloc),
  instanceBuffers(rhs.instanceBuffers, alloc) {}

ProbeHelperQueue::ProbeHelperQueue(const allocator_type& alloc) noexcept
: probeMap(alloc) {}

ProbeHelperQueue::ProbeHelperQueue(ProbeHelperQueue&& rhs, const allocator_type& alloc)
: probeMap(std::move(rhs.probeMap), alloc) {}

ProbeHelperQueue::ProbeHelperQueue(ProbeHelperQueue const& rhs, const allocator_type& alloc)
: probeMap(rhs.probeMap, alloc) {}

RenderDrawQueue::RenderDrawQueue(const allocator_type& alloc) noexcept
: instances(alloc) {}

RenderDrawQueue::RenderDrawQueue(RenderDrawQueue&& rhs, const allocator_type& alloc)
: instances(std::move(rhs.instances), alloc) {}

RenderDrawQueue::RenderDrawQueue(RenderDrawQueue const& rhs, const allocator_type& alloc)
: instances(rhs.instances, alloc) {}

NativeRenderQueue::NativeRenderQueue(const allocator_type& alloc) noexcept
: opaqueQueue(alloc),
  transparentQueue(alloc),
  probeQueue(alloc),
  opaqueInstancingQueue(alloc),
  transparentInstancingQueue(alloc) {}

NativeRenderQueue::NativeRenderQueue(NativeRenderQueue&& rhs, const allocator_type& alloc)
: opaqueQueue(std::move(rhs.opaqueQueue), alloc),
  transparentQueue(std::move(rhs.transparentQueue), alloc),
  probeQueue(std::move(rhs.probeQueue), alloc),
  opaqueInstancingQueue(std::move(rhs.opaqueInstancingQueue), alloc),
  transparentInstancingQueue(std::move(rhs.transparentInstancingQueue), alloc),
  camera(rhs.camera),
  sceneFlags(rhs.sceneFlags),
  lightByteOffset(rhs.lightByteOffset) {}

ResourceGroup::ResourceGroup(const allocator_type& alloc) noexcept
: instancingBuffers(alloc) {}

BufferPool::BufferPool(const allocator_type& alloc) noexcept
: currentBuffers(alloc),
  currentBufferViews(alloc),
  freeBuffers(alloc),
  freeBufferViews(alloc) {}

BufferPool::BufferPool(gfx::Device* deviceIn, uint32_t bufferSizeIn, bool dynamicIn, const allocator_type& alloc) noexcept // NOLINT
: device(deviceIn),
  bufferSize(bufferSizeIn),
  dynamic(dynamicIn),
  currentBuffers(alloc),
  currentBufferViews(alloc),
  freeBuffers(alloc),
  freeBufferViews(alloc) {}

BufferPool::BufferPool(BufferPool&& rhs, const allocator_type& alloc)
: device(rhs.device),
  bufferSize(rhs.bufferSize),
  dynamic(rhs.dynamic),
  currentBuffers(std::move(rhs.currentBuffers), alloc),
  currentBufferViews(std::move(rhs.currentBufferViews), alloc),
  freeBuffers(std::move(rhs.freeBuffers), alloc),
  freeBufferViews(std::move(rhs.freeBufferViews), alloc) {}

DescriptorSetPool::DescriptorSetPool(const allocator_type& alloc) noexcept
: currentDescriptorSets(alloc),
  freeDescriptorSets(alloc) {}

DescriptorSetPool::DescriptorSetPool(gfx::Device* deviceIn, IntrusivePtr<gfx::DescriptorSetLayout> setLayoutIn, const allocator_type& alloc) noexcept // NOLINT
: device(deviceIn),
  setLayout(std::move(setLayoutIn)),
  currentDescriptorSets(alloc),
  freeDescriptorSets(alloc) {}

DescriptorSetPool::DescriptorSetPool(DescriptorSetPool&& rhs, const allocator_type& alloc)
: device(rhs.device),
  setLayout(std::move(rhs.setLayout)),
  currentDescriptorSets(std::move(rhs.currentDescriptorSets), alloc),
  freeDescriptorSets(std::move(rhs.freeDescriptorSets), alloc) {}

UniformBlockResource::UniformBlockResource(const allocator_type& alloc) noexcept
: cpuBuffer(alloc),
  bufferPool(alloc) {}

UniformBlockResource::UniformBlockResource(UniformBlockResource&& rhs, const allocator_type& alloc)
: cpuBuffer(std::move(rhs.cpuBuffer), alloc),
  bufferPool(std::move(rhs.bufferPool), alloc) {}

ProgramResource::ProgramResource(const allocator_type& alloc) noexcept
: uniformBuffers(alloc),
  descriptorSetPool(alloc) {}

ProgramResource::ProgramResource(ProgramResource&& rhs, const allocator_type& alloc)
: uniformBuffers(std::move(rhs.uniformBuffers), alloc),
  descriptorSetPool(std::move(rhs.descriptorSetPool), alloc) {}

LayoutGraphNodeResource::LayoutGraphNodeResource(const allocator_type& alloc) noexcept
: uniformBuffers(alloc),
  descriptorSetPool(alloc),
  programResources(alloc) {}

LayoutGraphNodeResource::LayoutGraphNodeResource(LayoutGraphNodeResource&& rhs, const allocator_type& alloc)
: uniformBuffers(std::move(rhs.uniformBuffers), alloc),
  descriptorSetPool(std::move(rhs.descriptorSetPool), alloc),
  programResources(std::move(rhs.programResources), alloc) {}

SceneResource::SceneResource(const allocator_type& alloc) noexcept
: resourceIndex(alloc),
  storageBuffers(alloc),
  storageImages(alloc) {}

SceneResource::SceneResource(SceneResource&& rhs, const allocator_type& alloc)
: resourceIndex(std::move(rhs.resourceIndex), alloc),
  storageBuffers(std::move(rhs.storageBuffers), alloc),
  storageImages(std::move(rhs.storageImages), alloc) {}

FrustumCulling::FrustumCulling(const allocator_type& alloc) noexcept
: resultIndex(alloc) {}

FrustumCulling::FrustumCulling(FrustumCulling&& rhs, const allocator_type& alloc)
: resultIndex(std::move(rhs.resultIndex), alloc) {}

FrustumCulling::FrustumCulling(FrustumCulling const& rhs, const allocator_type& alloc)
: resultIndex(rhs.resultIndex, alloc) {}

LightBoundsCulling::LightBoundsCulling(const allocator_type& alloc) noexcept
: resultIndex(alloc) {}

LightBoundsCulling::LightBoundsCulling(LightBoundsCulling&& rhs, const allocator_type& alloc)
: resultIndex(std::move(rhs.resultIndex), alloc) {}

LightBoundsCulling::LightBoundsCulling(LightBoundsCulling const& rhs, const allocator_type& alloc)
: resultIndex(rhs.resultIndex, alloc) {}

SceneCulling::SceneCulling(const allocator_type& alloc) noexcept
: frustumCullings(alloc),
  frustumCullingResults(alloc),
  lightBoundsCullings(alloc),
  lightBoundsCullingResults(alloc),
  renderQueueIndex(alloc),
  renderQueues(alloc),
  renderQueueQueryIndex(alloc) {}

SceneCulling::SceneCulling(SceneCulling&& rhs, const allocator_type& alloc)
: frustumCullings(std::move(rhs.frustumCullings), alloc),
  frustumCullingResults(std::move(rhs.frustumCullingResults), alloc),
  lightBoundsCullings(std::move(rhs.lightBoundsCullings), alloc),
  lightBoundsCullingResults(std::move(rhs.lightBoundsCullingResults), alloc),
  renderQueueIndex(std::move(rhs.renderQueueIndex), alloc),
  renderQueues(std::move(rhs.renderQueues), alloc),
  renderQueueQueryIndex(std::move(rhs.renderQueueQueryIndex), alloc),
  numFrustumCulling(rhs.numFrustumCulling),
  numLightBoundsCulling(rhs.numLightBoundsCulling),
  numRenderQueues(rhs.numRenderQueues),
  gpuCullingPassID(rhs.gpuCullingPassID),
  enableLightCulling(rhs.enableLightCulling) {}

LightResource::LightResource(const allocator_type& alloc) noexcept
: cpuBuffer(alloc),
  lights(alloc),
  lightIndex(alloc) {}

NativeRenderContext::NativeRenderContext(std::unique_ptr<gfx::DefaultResource> defaultResourceIn, const allocator_type& alloc) noexcept
: defaultResource(std::move(defaultResourceIn)),
  resourceGroups(alloc),
  layoutGraphResources(alloc),
  renderSceneResources(alloc),
  sceneCulling(alloc),
  lightResources(alloc) {}

NativeProgramLibrary::NativeProgramLibrary(const allocator_type& alloc) noexcept
: layoutGraph(alloc),
  phases(alloc),
  localLayoutData(alloc) {}

PipelineCustomization::PipelineCustomization(const allocator_type& alloc) noexcept
: contexts(alloc),
  renderPasses(alloc),
  renderSubpasses(alloc),
  computeSubpasses(alloc),
  computePasses(alloc),
  renderQueues(alloc),
  renderCommands(alloc) {}

PipelineCustomization::PipelineCustomization(PipelineCustomization&& rhs, const allocator_type& alloc)
: currentContext(std::move(rhs.currentContext)),
  contexts(std::move(rhs.contexts), alloc),
  renderPasses(std::move(rhs.renderPasses), alloc),
  renderSubpasses(std::move(rhs.renderSubpasses), alloc),
  computeSubpasses(std::move(rhs.computeSubpasses), alloc),
  computePasses(std::move(rhs.computePasses), alloc),
  renderQueues(std::move(rhs.renderQueues), alloc),
  renderCommands(std::move(rhs.renderCommands), alloc) {}

PipelineCustomization::PipelineCustomization(PipelineCustomization const& rhs, const allocator_type& alloc)
: currentContext(rhs.currentContext),
  contexts(rhs.contexts, alloc),
  renderPasses(rhs.renderPasses, alloc),
  renderSubpasses(rhs.renderSubpasses, alloc),
  computeSubpasses(rhs.computeSubpasses, alloc),
  computePasses(rhs.computePasses, alloc),
  renderQueues(rhs.renderQueues, alloc),
  renderCommands(rhs.renderCommands, alloc) {}

} // namespace render

} // namespace cc

// NOLINTEND(misc-include-cleaner)
// clang-format on
