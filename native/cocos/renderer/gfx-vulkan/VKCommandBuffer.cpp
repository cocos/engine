/****************************************************************************
 Copyright (c) 2020-2023 Xiamen Yaji Software Co., Ltd.

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

#include "VKCommandBuffer.h"
#include "VKBuffer.h"
#include "VKCommands.h"
#include "VKDescriptorSet.h"
#include "VKDevice.h"
#include "VKFramebuffer.h"
#include "VKInputAssembler.h"
#include "VKPipelineState.h"
#include "VKQueryPool.h"
#include "VKQueue.h"
#include "VKRenderPass.h"
#include "VKTexture.h"
#include "base/std/hash/hash_fwd.hpp"
#include "profiler/Profiler.h"
#include "states/VKBufferBarrier.h"
#include "states/VKGeneralBarrier.h"
#include "states/VKTextureBarrier.h"
#include "VKAccelerationStructure.h"

namespace cc {
namespace gfx {

CCVKCommandBuffer::CCVKCommandBuffer() {
    _typedID = generateObjectID<decltype(this)>();
}

CCVKCommandBuffer::~CCVKCommandBuffer() {
    destroy();
}

void CCVKCommandBuffer::doInit(const CommandBufferInfo & /*info*/) {
    _gpuCommandBuffer = ccnew CCVKGPUCommandBuffer;
    _gpuCommandBuffer->level = mapVkCommandBufferLevel(_type);
    _gpuCommandBuffer->queueFamilyIndex = static_cast<CCVKQueue *>(_queue)->gpuQueue()->queueFamilyIndex;

    size_t setCount = CCVKDevice::getInstance()->bindingMappingInfo().setIndices.size();
    _curGPUDescriptorSets.resize(setCount);
    _curVkDescriptorSets.resize(setCount);
    _curDynamicOffsetsArray.resize(setCount);
}

void CCVKCommandBuffer::doDestroy() {
    if (_gpuCommandBuffer) {
        auto cleanEvent = [this](VkEvent event) {
            auto res = vkResetEvent(CCVKDevice::getInstance()->gpuDevice()->vkDevice, event);
            CC_ASSERT(res == VK_SUCCESS);
            vkDestroyEvent(CCVKDevice::getInstance()->gpuDevice()->vkDevice, event, nullptr);
        };
        while (!_availableEvents.empty()) {
            VkEvent event = _availableEvents.front();
            cleanEvent(event);
            _availableEvents.pop();
        }
        for (auto pair : _barrierEvents) {
            cleanEvent(pair.second);
        }
    }

    _gpuCommandBuffer = nullptr;
}

void CCVKCommandBuffer::begin(RenderPass *renderPass, uint32_t subpass, Framebuffer *frameBuffer) {
    CC_ASSERT(!_gpuCommandBuffer->began);
    if (_gpuCommandBuffer->began) return;

    CCVKDevice::getInstance()->gpuDevice()->getCommandBufferPool()->request(_gpuCommandBuffer);

    _curGPUPipelineState = nullptr;
    _curGPUInputAssembler = nullptr;
    _curGPUDescriptorSets.assign(_curGPUDescriptorSets.size(), nullptr);
    _curDynamicOffsetsArray.assign(_curDynamicOffsetsArray.size(), {});
    _firstDirtyDescriptorSet = UINT_MAX;

    _numDrawCalls = 0;
    _numInstances = 0;
    _numTriangles = 0;

    VkCommandBufferBeginInfo beginInfo{VK_STRUCTURE_TYPE_COMMAND_BUFFER_BEGIN_INFO};
    beginInfo.flags = VK_COMMAND_BUFFER_USAGE_ONE_TIME_SUBMIT_BIT;
    VkCommandBufferInheritanceInfo inheritanceInfo{VK_STRUCTURE_TYPE_COMMAND_BUFFER_INHERITANCE_INFO};

    if (renderPass) {
        inheritanceInfo.renderPass = static_cast<CCVKRenderPass *>(renderPass)->gpuRenderPass()->vkRenderPass;
        inheritanceInfo.subpass = subpass;
        if (frameBuffer) {
            CCVKGPUFramebuffer *gpuFBO = static_cast<CCVKFramebuffer *>(frameBuffer)->gpuFBO();
            if (gpuFBO->isOffscreen) {
                inheritanceInfo.framebuffer = gpuFBO->vkFramebuffer;
            } else {
                inheritanceInfo.framebuffer = gpuFBO->vkFrameBuffers[gpuFBO->swapchain->curImageIndex];
            }
        }
        beginInfo.pInheritanceInfo = &inheritanceInfo;
        beginInfo.flags |= VK_COMMAND_BUFFER_USAGE_RENDER_PASS_CONTINUE_BIT;
    }

    VK_CHECK(vkBeginCommandBuffer(_gpuCommandBuffer->vkCommandBuffer, &beginInfo));

    _gpuCommandBuffer->began = true;
    _gpuCommandBuffer->recordedBuffers.clear();
}

void CCVKCommandBuffer::end() {
    CC_ASSERT(_gpuCommandBuffer->began);
    if (!_gpuCommandBuffer->began) return;

    _curGPUFBO = nullptr;
    _curGPUInputAssembler = nullptr;
    _curDynamicStates.viewport.width = _curDynamicStates.viewport.height = _curDynamicStates.scissor.width = _curDynamicStates.scissor.height = 0U;
    VK_CHECK(vkEndCommandBuffer(_gpuCommandBuffer->vkCommandBuffer));
    _gpuCommandBuffer->began = false;

    _pendingQueue.push(_gpuCommandBuffer->vkCommandBuffer);
    CCVKDevice::getInstance()->gpuDevice()->getCommandBufferPool()->yield(_gpuCommandBuffer);
}

void CCVKCommandBuffer::beginRenderPass(RenderPass *renderPass, Framebuffer *fbo, const Rect &renderArea, const Color *colors,
                                        float depth, uint32_t stencil, CommandBuffer *const * /*secondaryCBs*/, uint32_t secondaryCBCount) {
    CC_ASSERT(_gpuCommandBuffer->began);
    CCVKDevice *device = CCVKDevice::getInstance();
    if constexpr (!ENABLE_GRAPH_AUTO_BARRIER) {
#if BARRIER_DEDUCTION_LEVEL >= BARRIER_DEDUCTION_LEVEL_BASIC
        // guard against RAW hazard
        VkMemoryBarrier vkBarrier{VK_STRUCTURE_TYPE_MEMORY_BARRIER};
        vkBarrier.srcAccessMask = VK_ACCESS_TRANSFER_WRITE_BIT;
        vkBarrier.dstAccessMask = VK_ACCESS_UNIFORM_READ_BIT | VK_ACCESS_VERTEX_ATTRIBUTE_READ_BIT;
        vkCmdPipelineBarrier(_gpuCommandBuffer->vkCommandBuffer,
                             VK_PIPELINE_STAGE_TRANSFER_BIT,
                             VK_PIPELINE_STAGE_VERTEX_INPUT_BIT | VK_PIPELINE_STAGE_VERTEX_SHADER_BIT | VK_PIPELINE_STAGE_FRAGMENT_SHADER_BIT,
                             0, 1, &vkBarrier, 0, nullptr, 0, nullptr);
#endif
    } else {
        const auto &dependencies = renderPass->getDependencies();
        if (!dependencies.empty()) {
            const auto &frontBarrier = dependencies.front();
            //pipelineBarrier(frontBarrier.generalBarrier, frontBarrier.bufferBarriers, frontBarrier.buffers, frontBarrier.bufferBarrierCount, frontBarrier.textureBarriers, frontBarrier.textures, frontBarrier.textureBarrierCount);
        }
    }

    _curGPUFBO = static_cast<CCVKFramebuffer *>(fbo)->gpuFBO();
    _curGPURenderPass = static_cast<CCVKRenderPass *>(renderPass)->gpuRenderPass();
    VkFramebuffer framebuffer{_curGPUFBO->vkFramebuffer};
    if (!_curGPUFBO->isOffscreen) {
        framebuffer = _curGPUFBO->vkFrameBuffers[_curGPUFBO->swapchain->curImageIndex];
    }

    ccstd::vector<VkClearValue> &clearValues = _curGPURenderPass->clearValues;
    size_t attachmentCount = _curGPURenderPass->colorAttachments.size();
    for (size_t i = 0U; i < attachmentCount; ++i) {
        clearValues[i].color = {{colors[i].x, colors[i].y, colors[i].z, colors[i].w}};
    }

    if (_curGPURenderPass->depthStencilAttachment.format != Format::UNKNOWN) {
        clearValues[attachmentCount].depthStencil = {depth, stencil};
    }
    if (_curGPURenderPass->depthStencilResolveAttachment.format != Format::UNKNOWN) {
        clearValues[attachmentCount + 1].depthStencil = {depth, stencil};
    }

    Rect safeArea{
        std::min(renderArea.x, static_cast<int32_t>(_curGPUFBO->width)),
        std::min(renderArea.y, static_cast<int32_t>(_curGPUFBO->height)),
        std::min(renderArea.width, _curGPUFBO->width),
        std::min(renderArea.height, _curGPUFBO->height),
    };

    VkRenderPassBeginInfo passBeginInfo{VK_STRUCTURE_TYPE_RENDER_PASS_BEGIN_INFO};
    passBeginInfo.renderPass = _curGPURenderPass->vkRenderPass;
    passBeginInfo.framebuffer = framebuffer;
    passBeginInfo.clearValueCount = utils::toUint(clearValues.size());
    passBeginInfo.pClearValues = clearValues.data();
    passBeginInfo.renderArea.offset = {safeArea.x, safeArea.y};
    passBeginInfo.renderArea.extent = {safeArea.width, safeArea.height};

    vkCmdBeginRenderPass(_gpuCommandBuffer->vkCommandBuffer, &passBeginInfo,
                         secondaryCBCount ? VK_SUBPASS_CONTENTS_SECONDARY_COMMAND_BUFFERS : VK_SUBPASS_CONTENTS_INLINE);

    _secondaryRP = secondaryCBCount;

    if (!secondaryCBCount) {
        VkViewport viewport{static_cast<float>(safeArea.x), static_cast<float>(safeArea.y),
                            static_cast<float>(safeArea.width), static_cast<float>(safeArea.height), 0.F, 1.F};
        vkCmdSetViewport(_gpuCommandBuffer->vkCommandBuffer, 0, 1, &viewport);
        _curDynamicStates.viewport = {safeArea.x, safeArea.y, safeArea.width, safeArea.height};
        vkCmdSetScissor(_gpuCommandBuffer->vkCommandBuffer, 0, 1, &passBeginInfo.renderArea);
        _curDynamicStates.scissor = safeArea;
    }
    _currentSubPass = 0;
    _hasSubPassSelfDependency = false;
}

void CCVKCommandBuffer::endRenderPass() {
    CC_ASSERT(_gpuCommandBuffer->began);
    vkCmdEndRenderPass(_gpuCommandBuffer->vkCommandBuffer);

    auto *device = CCVKDevice::getInstance();
    CCVKGPUDevice *gpuDevice = device->gpuDevice();
    size_t colorAttachmentCount = _curGPURenderPass->colorAttachments.size();
    for (size_t i = 0U; i < colorAttachmentCount; ++i) {
        _curGPUFBO->gpuColorViews[i]->gpuTexture->currentAccessTypes = _curGPURenderPass->getBarrier(i, gpuDevice)->nextAccesses;
    }

    if (_curGPURenderPass->depthStencilAttachment.format != Format::UNKNOWN) {
        _curGPUFBO->gpuDepthStencilView->gpuTexture->currentAccessTypes = _curGPURenderPass->getBarrier(colorAttachmentCount, gpuDevice)->nextAccesses;
    }

    _curGPUFBO = nullptr;

    if constexpr (!ENABLE_GRAPH_AUTO_BARRIER) {
#if BARRIER_DEDUCTION_LEVEL >= BARRIER_DEDUCTION_LEVEL_BASIC
        // guard against WAR hazard
        vkCmdPipelineBarrier(_gpuCommandBuffer->vkCommandBuffer,
                             VK_PIPELINE_STAGE_VERTEX_SHADER_BIT | VK_PIPELINE_STAGE_FRAGMENT_SHADER_BIT,
                             VK_PIPELINE_STAGE_TRANSFER_BIT, 0, 0, nullptr, 0, nullptr, 0, nullptr);
#endif
    } else {
        const auto &dependencies = _curGPURenderPass->dependencies;
        if (!dependencies.empty()) {
            const auto &rearBarrier = _curGPURenderPass->dependencies.back();
            //pipelineBarrier(rearBarrier.generalBarrier, rearBarrier.bufferBarriers, rearBarrier.buffers, rearBarrier.bufferBarrierCount, rearBarrier.textureBarriers, rearBarrier.textures, rearBarrier.textureBarrierCount);
        }
    }
}

void CCVKCommandBuffer::insertMarker(const MarkerInfo &marker) {
    auto *context = CCVKDevice::getInstance()->gpuContext();
    if (context->debugUtils) {
        _utilLabelInfo.pLabelName = marker.name.c_str();
        _utilLabelInfo.color[0] = marker.color.x;
        _utilLabelInfo.color[1] = marker.color.y;
        _utilLabelInfo.color[2] = marker.color.z;
        _utilLabelInfo.color[3] = marker.color.w;
        vkCmdInsertDebugUtilsLabelEXT(_gpuCommandBuffer->vkCommandBuffer, &_utilLabelInfo);
    } else if (context->debugReport) {
        _markerInfo.pMarkerName = marker.name.c_str();
        _markerInfo.color[0] = marker.color.x;
        _markerInfo.color[1] = marker.color.y;
        _markerInfo.color[2] = marker.color.z;
        _markerInfo.color[3] = marker.color.w;
        vkCmdDebugMarkerInsertEXT(_gpuCommandBuffer->vkCommandBuffer, &_markerInfo);
    }
}

void CCVKCommandBuffer::beginMarker(const MarkerInfo &marker) {
    auto *context = CCVKDevice::getInstance()->gpuContext();
    if (context->debugUtils) {
        _utilLabelInfo.pLabelName = marker.name.c_str();
        _utilLabelInfo.color[0] = marker.color.x;
        _utilLabelInfo.color[1] = marker.color.y;
        _utilLabelInfo.color[2] = marker.color.z;
        _utilLabelInfo.color[3] = marker.color.w;
        vkCmdBeginDebugUtilsLabelEXT(_gpuCommandBuffer->vkCommandBuffer, &_utilLabelInfo);
    } else if (context->debugReport) {
        _markerInfo.pMarkerName = marker.name.c_str();
        _markerInfo.color[0] = marker.color.x;
        _markerInfo.color[1] = marker.color.y;
        _markerInfo.color[2] = marker.color.z;
        _markerInfo.color[3] = marker.color.w;
        vkCmdDebugMarkerBeginEXT(_gpuCommandBuffer->vkCommandBuffer, &_markerInfo);
    }
}

void CCVKCommandBuffer::endMarker() {
    auto *context = CCVKDevice::getInstance()->gpuContext();
    if (context->debugUtils) {
        vkCmdEndDebugUtilsLabelEXT(_gpuCommandBuffer->vkCommandBuffer);
    } else if (context->debugReport) {
        vkCmdDebugMarkerEndEXT(_gpuCommandBuffer->vkCommandBuffer);
    }
}

void CCVKCommandBuffer::bindPipelineState(PipelineState *pso) {
    CCVKGPUPipelineState *gpuPipelineState = static_cast<CCVKPipelineState *>(pso)->gpuPipelineState();

    if (_curGPUPipelineState != gpuPipelineState) {
        vkCmdBindPipeline(_gpuCommandBuffer->vkCommandBuffer, VK_PIPELINE_BIND_POINTS[toNumber(gpuPipelineState->bindPoint)], gpuPipelineState-> vkPipeline);
        _curGPUPipelineState = gpuPipelineState;
    }
}

void CCVKCommandBuffer::bindDescriptorSet(uint32_t set, DescriptorSet *descriptorSet, uint32_t dynamicOffsetCount, const uint32_t *dynamicOffsets) {
    CC_ASSERT(_curGPUDescriptorSets.size() > set);

    CCVKGPUDescriptorSet *gpuDescriptorSet = static_cast<CCVKDescriptorSet *>(descriptorSet)->gpuDescriptorSet();

    if (_curGPUDescriptorSets[set] != gpuDescriptorSet) {
        _curGPUDescriptorSets[set] = gpuDescriptorSet;
        if (set < _firstDirtyDescriptorSet) _firstDirtyDescriptorSet = set;
    }
    if (dynamicOffsetCount) {
        _curDynamicOffsetsArray[set].assign(dynamicOffsets, dynamicOffsets + dynamicOffsetCount);
        if (set < _firstDirtyDescriptorSet) _firstDirtyDescriptorSet = set;
    } else if (!_curDynamicOffsetsArray[set].empty()) {
        _curDynamicOffsetsArray[set].assign(_curDynamicOffsetsArray[set].size(), 0);
    }
}

void CCVKCommandBuffer::bindInputAssembler(InputAssembler *ia) {
    CCVKGPUInputAssembler *gpuInputAssembler = static_cast<CCVKInputAssembler *>(ia)->gpuInputAssembler();

    if (_curGPUInputAssembler != gpuInputAssembler) {
        // buffers may be rebuilt(e.g. resize event) without IA's acknowledge
        uint32_t vbCount = utils::toUint(gpuInputAssembler->gpuVertexBuffers.size());
        if (gpuInputAssembler->vertexBuffers.size() < vbCount) {
            gpuInputAssembler->vertexBuffers.resize(vbCount);
            gpuInputAssembler->vertexBufferOffsets.resize(vbCount);
        }

        CCVKGPUDevice *gpuDevice = CCVKDevice::getInstance()->gpuDevice();
        for (uint32_t i = 0U; i < vbCount; ++i) {
            gpuInputAssembler->vertexBuffers[i] = gpuInputAssembler->gpuVertexBuffers[i]->gpuBuffer->vkBuffer;
            gpuInputAssembler->vertexBufferOffsets[i] = gpuInputAssembler->gpuVertexBuffers[i]->getStartOffset(gpuDevice->curBackBufferIndex);
        }

        vkCmdBindVertexBuffers(_gpuCommandBuffer->vkCommandBuffer, 0, vbCount,
                               gpuInputAssembler->vertexBuffers.data(), gpuInputAssembler->vertexBufferOffsets.data());

        if (gpuInputAssembler->gpuIndexBuffer) {
            vkCmdBindIndexBuffer(_gpuCommandBuffer->vkCommandBuffer, gpuInputAssembler->gpuIndexBuffer->gpuBuffer->vkBuffer,
                                 gpuInputAssembler->gpuIndexBuffer->gpuBuffer->getStartOffset(gpuDevice->curBackBufferIndex),
                                 gpuInputAssembler->gpuIndexBuffer->gpuBuffer->stride == 4 ? VK_INDEX_TYPE_UINT32 : VK_INDEX_TYPE_UINT16);
        }
        _curGPUInputAssembler = gpuInputAssembler;
    }
}

void CCVKCommandBuffer::setViewport(const Viewport &vp) {
    if (_curDynamicStates.viewport != vp) {
        _curDynamicStates.viewport = vp;

        VkViewport viewport{static_cast<float>(vp.left), static_cast<float>(vp.top), static_cast<float>(vp.width), static_cast<float>(vp.height), vp.minDepth, vp.maxDepth};
        vkCmdSetViewport(_gpuCommandBuffer->vkCommandBuffer, 0, 1, &viewport);
    }
}

void CCVKCommandBuffer::setScissor(const Rect &rect) {
    if (_curDynamicStates.scissor != rect) {
        _curDynamicStates.scissor = rect;

        VkRect2D scissor = {{rect.x, rect.y}, {rect.width, rect.height}};
        vkCmdSetScissor(_gpuCommandBuffer->vkCommandBuffer, 0, 1, &scissor);
    }
}

void CCVKCommandBuffer::setLineWidth(float width) {
    if (math::isNotEqualF(_curDynamicStates.lineWidth, width)) {
        _curDynamicStates.lineWidth = width;
        vkCmdSetLineWidth(_gpuCommandBuffer->vkCommandBuffer, width);
    }
}

void CCVKCommandBuffer::setDepthBias(float constant, float clamp, float slope) {
    if (math::isNotEqualF(_curDynamicStates.depthBiasConstant, constant) ||
        math::isNotEqualF(_curDynamicStates.depthBiasClamp, clamp) ||
        math::isNotEqualF(_curDynamicStates.depthBiasSlope, slope)) {
        _curDynamicStates.depthBiasConstant = constant;
        _curDynamicStates.depthBiasClamp = clamp;
        _curDynamicStates.depthBiasSlope = slope;
        vkCmdSetDepthBias(_gpuCommandBuffer->vkCommandBuffer, constant, clamp, slope);
    }
}

void CCVKCommandBuffer::setBlendConstants(const Color &constants) {
    if (math::isNotEqualF(_curDynamicStates.blendConstant.x, constants.x) ||
        math::isNotEqualF(_curDynamicStates.blendConstant.y, constants.y) ||
        math::isNotEqualF(_curDynamicStates.blendConstant.z, constants.z) ||
        math::isNotEqualF(_curDynamicStates.blendConstant.w, constants.w)) {
        _curDynamicStates.blendConstant.x = constants.x;
        _curDynamicStates.blendConstant.y = constants.y;
        _curDynamicStates.blendConstant.z = constants.z;
        _curDynamicStates.blendConstant.w = constants.w;
        vkCmdSetBlendConstants(_gpuCommandBuffer->vkCommandBuffer, reinterpret_cast<const float *>(&constants));
    }
}

void CCVKCommandBuffer::setDepthBound(float minBounds, float maxBounds) {
    if (math::isNotEqualF(_curDynamicStates.depthMinBounds, minBounds) ||
        math::isNotEqualF(_curDynamicStates.depthMaxBounds, maxBounds)) {
        _curDynamicStates.depthMinBounds = minBounds;
        _curDynamicStates.depthMaxBounds = maxBounds;
        vkCmdSetDepthBounds(_gpuCommandBuffer->vkCommandBuffer, minBounds, maxBounds);
    }
}

void CCVKCommandBuffer::setStencilWriteMask(StencilFace face, uint32_t mask) {
    DynamicStencilStates &front = _curDynamicStates.stencilStatesFront;
    DynamicStencilStates &back = _curDynamicStates.stencilStatesBack;
    if (face == StencilFace::ALL) {
        if (front.writeMask == mask && back.writeMask == mask) return;
        front.writeMask = back.writeMask = mask;
        vkCmdSetStencilWriteMask(_gpuCommandBuffer->vkCommandBuffer, VK_STENCIL_FACE_FRONT_AND_BACK, mask);
    } else if (face == StencilFace::FRONT) {
        if (front.writeMask == mask) return;
        front.writeMask = mask;
        vkCmdSetStencilWriteMask(_gpuCommandBuffer->vkCommandBuffer, VK_STENCIL_FACE_FRONT_BIT, mask);
    } else if (face == StencilFace::BACK) {
        if (back.writeMask == mask) return;
        back.writeMask = mask;
        vkCmdSetStencilWriteMask(_gpuCommandBuffer->vkCommandBuffer, VK_STENCIL_FACE_BACK_BIT, mask);
    }
}

void CCVKCommandBuffer::setStencilCompareMask(StencilFace face, uint32_t reference, uint32_t mask) {
    DynamicStencilStates &front = _curDynamicStates.stencilStatesFront;
    DynamicStencilStates &back = _curDynamicStates.stencilStatesBack;
    if (face == StencilFace::ALL) {
        if (front.reference == reference && back.reference == reference &&
            front.compareMask == mask && back.compareMask == mask) return;
        front.reference = back.reference = reference;
        front.compareMask = back.compareMask = mask;
        vkCmdSetStencilReference(_gpuCommandBuffer->vkCommandBuffer, VK_STENCIL_FACE_FRONT_AND_BACK, reference);
        vkCmdSetStencilCompareMask(_gpuCommandBuffer->vkCommandBuffer, VK_STENCIL_FACE_FRONT_AND_BACK, mask);
    } else if (face == StencilFace::FRONT) {
        if (front.writeMask == mask && front.reference == reference) return;
        front.writeMask = mask;
        front.reference = reference;
        vkCmdSetStencilReference(_gpuCommandBuffer->vkCommandBuffer, VK_STENCIL_FACE_FRONT_BIT, reference);
        vkCmdSetStencilCompareMask(_gpuCommandBuffer->vkCommandBuffer, VK_STENCIL_FACE_FRONT_BIT, mask);
    } else if (face == StencilFace::BACK) {
        if (back.writeMask == mask && back.reference == reference) return;
        back.writeMask = mask;
        back.reference = reference;
        vkCmdSetStencilReference(_gpuCommandBuffer->vkCommandBuffer, VK_STENCIL_FACE_BACK_BIT, reference);
        vkCmdSetStencilCompareMask(_gpuCommandBuffer->vkCommandBuffer, VK_STENCIL_FACE_BACK_BIT, mask);
    }
}

void CCVKCommandBuffer::nextSubpass() {
    vkCmdNextSubpass(_gpuCommandBuffer->vkCommandBuffer, _secondaryRP ? VK_SUBPASS_CONTENTS_SECONDARY_COMMAND_BUFFERS : VK_SUBPASS_CONTENTS_INLINE);
    ++_currentSubPass;
    CC_ASSERT(_currentSubPass < _curGPURenderPass->subpasses.size());
    _hasSubPassSelfDependency = _curGPURenderPass->hasSelfDependency[_currentSubPass];
}

void CCVKCommandBuffer::draw(const DrawInfo &info) {
    CC_PROFILE(CCVKCmdBufDraw);
    if (_firstDirtyDescriptorSet < _curGPUDescriptorSets.size()) {
        bindDescriptorSets(VK_PIPELINE_BIND_POINT_GRAPHICS);
    }

    const auto *gpuIndirectBuffer = _curGPUInputAssembler->gpuIndirectBuffer.get();

    if (gpuIndirectBuffer) {
        uint32_t drawInfoCount = gpuIndirectBuffer->range / gpuIndirectBuffer->gpuBuffer->stride;
        CCVKGPUDevice *gpuDevice = CCVKDevice::getInstance()->gpuDevice();
        VkDeviceSize offset = gpuIndirectBuffer->getStartOffset(gpuDevice->curBackBufferIndex);
        if (gpuDevice->useMultiDrawIndirect) {
            if (gpuIndirectBuffer->gpuBuffer->isDrawIndirectByIndex) {
                vkCmdDrawIndexedIndirect(_gpuCommandBuffer->vkCommandBuffer,
                                         gpuIndirectBuffer->gpuBuffer->vkBuffer,
                                         offset,
                                         drawInfoCount,
                                         sizeof(VkDrawIndexedIndirectCommand));
            } else {
                vkCmdDrawIndirect(_gpuCommandBuffer->vkCommandBuffer,
                                  gpuIndirectBuffer->gpuBuffer->vkBuffer,
                                  offset,
                                  drawInfoCount,
                                  sizeof(VkDrawIndirectCommand));
            }
        } else {
            if (gpuIndirectBuffer->gpuBuffer->isDrawIndirectByIndex) {
                for (VkDeviceSize j = 0U; j < drawInfoCount; ++j) {
                    vkCmdDrawIndexedIndirect(_gpuCommandBuffer->vkCommandBuffer,
                                             gpuIndirectBuffer->gpuBuffer->vkBuffer,
                                             offset + j * sizeof(VkDrawIndexedIndirectCommand),
                                             1,
                                             sizeof(VkDrawIndexedIndirectCommand));
                }
            } else {
                for (VkDeviceSize j = 0U; j < drawInfoCount; ++j) {
                    vkCmdDrawIndirect(_gpuCommandBuffer->vkCommandBuffer,
                                      gpuIndirectBuffer->gpuBuffer->vkBuffer,
                                      offset + j * sizeof(VkDrawIndirectCommand),
                                      1,
                                      sizeof(VkDrawIndirectCommand));
                }
            }
        }
    } else {
        uint32_t instanceCount = std::max(info.instanceCount, 1U);
        bool hasIndexBuffer = _curGPUInputAssembler->gpuIndexBuffer && info.indexCount > 0;

        if (hasIndexBuffer) {
            vkCmdDrawIndexed(_gpuCommandBuffer->vkCommandBuffer, info.indexCount, instanceCount,
                             info.firstIndex, info.vertexOffset, info.firstInstance);
        } else {
            vkCmdDraw(_gpuCommandBuffer->vkCommandBuffer, info.vertexCount, instanceCount,
                      info.firstVertex, info.firstInstance);
        }

        ++_numDrawCalls;
        _numInstances += info.instanceCount;
        if (_curGPUPipelineState) {
            uint32_t indexCount = hasIndexBuffer ? info.indexCount : info.vertexCount;
            switch (_curGPUPipelineState->primitive) {
                case PrimitiveMode::TRIANGLE_LIST:
                    _numTriangles += indexCount / 3 * instanceCount;
                    break;
                case PrimitiveMode::TRIANGLE_STRIP:
                case PrimitiveMode::TRIANGLE_FAN:
                    _numTriangles += (indexCount - 2) * instanceCount;
                    break;
                default: break;
            }
        }
    }
    if (_hasSubPassSelfDependency) {
        selfDependency();
    }
}

void CCVKCommandBuffer::execute(CommandBuffer *const *cmdBuffs, uint32_t count) {
    if (!count) return;
    _vkCommandBuffers.resize(count);

    uint32_t validCount = 0U;
    for (uint32_t i = 0U; i < count; ++i) {
        auto *cmdBuff = static_cast<CCVKCommandBuffer *>(cmdBuffs[i]);
        if (!cmdBuff->_pendingQueue.empty()) {
            _vkCommandBuffers[validCount++] = cmdBuff->_pendingQueue.front();
            cmdBuff->_pendingQueue.pop();

            _numDrawCalls += cmdBuff->_numDrawCalls;
            _numInstances += cmdBuff->_numInstances;
            _numTriangles += cmdBuff->_numTriangles;
        }
    }
    if (validCount) {
        vkCmdExecuteCommands(_gpuCommandBuffer->vkCommandBuffer, validCount,
                             _vkCommandBuffers.data());
    }
}

void CCVKCommandBuffer::updateBuffer(Buffer *buffer, const void *data, uint32_t size) {
    CC_PROFILE(CCVKCmdBufUpdateBuffer);
    CCVKGPUBuffer *gpuBuffer = static_cast<CCVKBuffer *>(buffer)->gpuBuffer();
    cmdFuncCCVKUpdateBuffer(CCVKDevice::getInstance(), gpuBuffer, data, size, _gpuCommandBuffer);
}

void CCVKCommandBuffer::copyBuffersToTexture(const uint8_t *const *buffers, Texture *texture, const BufferTextureCopy *regions, uint32_t count) {
    cmdFuncCCVKCopyBuffersToTexture(CCVKDevice::getInstance(), buffers, static_cast<CCVKTexture *>(texture)->gpuTexture(), regions, count, _gpuCommandBuffer);
}

void CCVKCommandBuffer::resolveTexture(Texture *srcTexture, Texture *dstTexture, const TextureCopy *regions, uint32_t count) {
    VkImageAspectFlags srcAspectMask = VK_IMAGE_ASPECT_COLOR_BIT;
    VkImageAspectFlags dstAspectMask = VK_IMAGE_ASPECT_COLOR_BIT;
    VkImage srcImage = VK_NULL_HANDLE;
    VkImage dstImage = VK_NULL_HANDLE;

    auto getImage = [](Texture * texture) -> auto {
        CCVKGPUTexture *gpuTexture = static_cast<CCVKTexture *>(texture)->gpuTexture();
        return gpuTexture->swapchain ? std::pair{gpuTexture->aspectMask, gpuTexture->swapchainVkImages[gpuTexture->swapchain->curImageIndex]} : std::pair{gpuTexture->aspectMask, gpuTexture->vkImage};
    };

    std::tie(srcAspectMask, srcImage) = getImage(srcTexture);
    std::tie(dstAspectMask, dstImage) = getImage(dstTexture);

    ccstd::vector<VkImageResolve> resolveRegions(count);
    for (uint32_t i = 0U; i < count; ++i) {
        const TextureCopy &region = regions[i];
        auto &resolveRegion = resolveRegions[i];

        resolveRegion.srcSubresource.aspectMask = srcAspectMask;
        resolveRegion.srcSubresource.mipLevel = region.srcSubres.mipLevel;
        resolveRegion.srcSubresource.baseArrayLayer = region.srcSubres.baseArrayLayer;
        resolveRegion.srcSubresource.layerCount = region.srcSubres.layerCount;

        resolveRegion.dstSubresource.aspectMask = dstAspectMask;
        resolveRegion.dstSubresource.mipLevel = region.dstSubres.mipLevel;
        resolveRegion.dstSubresource.baseArrayLayer = region.dstSubres.baseArrayLayer;
        resolveRegion.dstSubresource.layerCount = region.dstSubres.layerCount;

        resolveRegion.srcOffset.x = region.srcOffset.x;
        resolveRegion.srcOffset.y = region.srcOffset.y;
        resolveRegion.srcOffset.z = region.srcOffset.z;

        resolveRegion.dstOffset.x = region.dstOffset.x;
        resolveRegion.dstOffset.y = region.dstOffset.y;
        resolveRegion.dstOffset.z = region.dstOffset.z;

        resolveRegion.extent.width = region.extent.width;
        resolveRegion.extent.height = region.extent.height;
        resolveRegion.extent.depth = region.extent.depth;
    }
    vkCmdResolveImage(_gpuCommandBuffer->vkCommandBuffer, srcImage, VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL, dstImage, VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL, count, resolveRegions.data());
}

void CCVKCommandBuffer::copyTexture(Texture *srcTexture, Texture *dstTexture, const TextureCopy *regions, uint32_t count) {
    VkImageAspectFlags srcAspectMask = VK_IMAGE_ASPECT_COLOR_BIT;
    VkImageAspectFlags dstAspectMask = VK_IMAGE_ASPECT_COLOR_BIT;
    VkImage srcImage = VK_NULL_HANDLE;
    VkImage dstImage = VK_NULL_HANDLE;

    auto getImage = [](Texture * texture) -> auto {
        CCVKGPUTexture *gpuTexture = static_cast<CCVKTexture *>(texture)->gpuTexture();
        return gpuTexture->swapchain ? std::pair{gpuTexture->aspectMask, gpuTexture->swapchainVkImages[gpuTexture->swapchain->curImageIndex]} : std::pair{gpuTexture->aspectMask, gpuTexture->vkImage};
    };

    std::tie(srcAspectMask, srcImage) = getImage(srcTexture);
    std::tie(dstAspectMask, dstImage) = getImage(dstTexture);

    ccstd::vector<VkImageCopy> copyRegions(count, VkImageCopy{});
    for (uint32_t i = 0U; i < count; ++i) {
        const TextureCopy &region = regions[i];
        auto &copyRegion = copyRegions[i];

        copyRegion.srcSubresource.aspectMask = srcAspectMask;
        copyRegion.srcSubresource.mipLevel = region.srcSubres.mipLevel;
        copyRegion.srcSubresource.baseArrayLayer = region.srcSubres.baseArrayLayer;
        copyRegion.srcSubresource.layerCount = region.srcSubres.layerCount;

        copyRegion.dstSubresource.aspectMask = dstAspectMask;
        copyRegion.dstSubresource.mipLevel = region.dstSubres.mipLevel;
        copyRegion.dstSubresource.baseArrayLayer = region.dstSubres.baseArrayLayer;
        copyRegion.dstSubresource.layerCount = region.dstSubres.layerCount;

        copyRegion.srcOffset.x = region.srcOffset.x;
        copyRegion.srcOffset.y = region.srcOffset.y;
        copyRegion.srcOffset.z = region.srcOffset.z;

        copyRegion.dstOffset.x = region.dstOffset.x;
        copyRegion.dstOffset.y = region.dstOffset.y;
        copyRegion.dstOffset.z = region.dstOffset.z;

        copyRegion.extent.width = region.extent.width;
        copyRegion.extent.height = region.extent.height;
        copyRegion.extent.depth = region.extent.depth;
    }
    vkCmdCopyImage(_gpuCommandBuffer->vkCommandBuffer, srcImage, VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL, dstImage, VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL, count, copyRegions.data());
}

void CCVKCommandBuffer::blitTexture(Texture *srcTexture, Texture *dstTexture, const TextureBlit *regions, uint32_t count, Filter filter) {
    VkImageAspectFlags srcAspectMask = VK_IMAGE_ASPECT_COLOR_BIT;
    VkImageAspectFlags dstAspectMask = VK_IMAGE_ASPECT_COLOR_BIT;
    VkImage srcImage = VK_NULL_HANDLE;
    VkImage dstImage = VK_NULL_HANDLE;
    VkImageLayout srcImageLayout = VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL;
    VkImageLayout dstImageLayout = VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL;

    CCVKGPUTexture *gpuTextureSrc = static_cast<CCVKTexture *>(srcTexture)->gpuTexture();
    srcAspectMask = gpuTextureSrc->aspectMask;
    if (gpuTextureSrc->swapchain) {
        srcImage = gpuTextureSrc->swapchainVkImages[gpuTextureSrc->swapchain->curImageIndex];
    } else {
        srcImage = gpuTextureSrc->vkImage;
    }

    CCVKGPUTexture *gpuTextureDst = static_cast<CCVKTexture *>(dstTexture)->gpuTexture();
    dstAspectMask = gpuTextureDst->aspectMask;
    if (gpuTextureDst->swapchain) {
        dstImage = gpuTextureDst->swapchainVkImages[gpuTextureDst->swapchain->curImageIndex];

        VkImageMemoryBarrier barrier{VK_STRUCTURE_TYPE_IMAGE_MEMORY_BARRIER};
        barrier.dstAccessMask = VK_ACCESS_TRANSFER_WRITE_BIT;
        barrier.newLayout = VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL;
        barrier.srcQueueFamilyIndex = barrier.dstQueueFamilyIndex = VK_QUEUE_FAMILY_IGNORED;

        barrier.image = dstImage;
        barrier.subresourceRange.aspectMask = VK_IMAGE_ASPECT_COLOR_BIT;
        barrier.subresourceRange.levelCount = barrier.subresourceRange.layerCount = 1;

        vkCmdPipelineBarrier(_gpuCommandBuffer->vkCommandBuffer,
                             VK_PIPELINE_STAGE_TOP_OF_PIPE_BIT, VK_PIPELINE_STAGE_TRANSFER_BIT, VK_DEPENDENCY_BY_REGION_BIT,
                             0, nullptr, 0, nullptr, 1, &barrier);
    } else {
        dstImage = gpuTextureDst->vkImage;
    }

    _blitRegions.resize(count);
    for (uint32_t i = 0U; i < count; ++i) {
        const TextureBlit &region = regions[i];
        _blitRegions[i].srcSubresource.aspectMask = srcAspectMask;
        _blitRegions[i].srcSubresource.mipLevel = region.srcSubres.mipLevel;
        _blitRegions[i].srcSubresource.baseArrayLayer = region.srcSubres.baseArrayLayer;
        _blitRegions[i].srcSubresource.layerCount = region.srcSubres.layerCount;
        _blitRegions[i].srcOffsets[0].x = region.srcOffset.x;
        _blitRegions[i].srcOffsets[0].y = region.srcOffset.y;
        _blitRegions[i].srcOffsets[0].z = region.srcOffset.z;
        _blitRegions[i].srcOffsets[1].x = static_cast<int32_t>(region.srcOffset.x + region.srcExtent.width);
        _blitRegions[i].srcOffsets[1].y = static_cast<int32_t>(region.srcOffset.y + region.srcExtent.height);
        _blitRegions[i].srcOffsets[1].z = static_cast<int32_t>(region.srcOffset.z + region.srcExtent.depth);

        _blitRegions[i].dstSubresource.aspectMask = dstAspectMask;
        _blitRegions[i].dstSubresource.mipLevel = region.dstSubres.mipLevel;
        _blitRegions[i].dstSubresource.baseArrayLayer = region.dstSubres.baseArrayLayer;
        _blitRegions[i].dstSubresource.layerCount = region.dstSubres.layerCount;
        _blitRegions[i].dstOffsets[0].x = region.dstOffset.x;
        _blitRegions[i].dstOffsets[0].y = region.dstOffset.y;
        _blitRegions[i].dstOffsets[0].z = region.dstOffset.z;
        _blitRegions[i].dstOffsets[1].x = static_cast<int32_t>(region.dstOffset.x + region.dstExtent.width);
        _blitRegions[i].dstOffsets[1].y = static_cast<int32_t>(region.dstOffset.y + region.dstExtent.height);
        _blitRegions[i].dstOffsets[1].z = static_cast<int32_t>(region.dstOffset.z + region.dstExtent.depth);
    }

    vkCmdBlitImage(_gpuCommandBuffer->vkCommandBuffer,
                   srcImage, srcImageLayout,
                   dstImage, dstImageLayout,
                   count, _blitRegions.data(), VK_FILTERS[toNumber(filter)]);

    if (gpuTextureDst->swapchain) {
        VkImageMemoryBarrier barrier{VK_STRUCTURE_TYPE_IMAGE_MEMORY_BARRIER};
        barrier.srcAccessMask = VK_ACCESS_TRANSFER_WRITE_BIT;
        barrier.oldLayout = VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL;
        barrier.dstAccessMask = VK_ACCESS_COLOR_ATTACHMENT_WRITE_BIT;
        barrier.newLayout = VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL;
        barrier.srcQueueFamilyIndex = barrier.dstQueueFamilyIndex = VK_QUEUE_FAMILY_IGNORED;

        barrier.image = dstImage;
        barrier.subresourceRange.aspectMask = VK_IMAGE_ASPECT_COLOR_BIT;
        barrier.subresourceRange.levelCount = barrier.subresourceRange.layerCount = 1;

        vkCmdPipelineBarrier(_gpuCommandBuffer->vkCommandBuffer,
                             VK_PIPELINE_STAGE_TRANSFER_BIT, VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT, VK_DEPENDENCY_BY_REGION_BIT,
                             0, nullptr, 0, nullptr, 1, &barrier);
    }
}

void CCVKCommandBuffer::selfDependency() {
    VkMemoryBarrier barrier{VK_STRUCTURE_TYPE_MEMORY_BARRIER};
    barrier.srcAccessMask = VK_ACCESS_COLOR_ATTACHMENT_WRITE_BIT;
    barrier.dstAccessMask = VK_ACCESS_INPUT_ATTACHMENT_READ_BIT | VK_ACCESS_COLOR_ATTACHMENT_WRITE_BIT;

    vkCmdPipelineBarrier(_gpuCommandBuffer->vkCommandBuffer,
                         VK_PIPELINE_STAGE_FRAGMENT_SHADER_BIT | VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT,
                         VK_PIPELINE_STAGE_FRAGMENT_SHADER_BIT | VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT,
                         VK_DEPENDENCY_BY_REGION_BIT,
                         1, &barrier, 0, nullptr, 0, nullptr);
}

void CCVKCommandBuffer::bindDescriptorSets(VkPipelineBindPoint bindPoint) {
    CCVKDevice *device = CCVKDevice::getInstance();
    CCVKGPUDevice *gpuDevice = device->gpuDevice();
    const CCVKGPUPipelineLayout *pipelineLayout = _curGPUPipelineState->gpuPipelineLayout;
    const ccstd::vector<uint32_t> &dynamicOffsetOffsets = pipelineLayout->dynamicOffsetOffsets;
    uint32_t descriptorSetCount = utils::toUint(pipelineLayout->setLayouts.size());
    _curDynamicOffsets.resize(pipelineLayout->dynamicOffsetCount);

    uint32_t dirtyDescriptorSetCount = descriptorSetCount - _firstDirtyDescriptorSet;
    for (uint32_t i = _firstDirtyDescriptorSet; i < descriptorSetCount; ++i) {
        if (_curGPUDescriptorSets[i]) {
            const CCVKGPUDescriptorSet::Instance &instance = _curGPUDescriptorSets[i]->instances[gpuDevice->curBackBufferIndex];
            _curVkDescriptorSets[i] = instance.vkDescriptorSet;
        } else {
            _curVkDescriptorSets[i] = pipelineLayout->setLayouts[i]->defaultDescriptorSet;
        }
        uint32_t count = dynamicOffsetOffsets[i + 1] - dynamicOffsetOffsets[i];
        // CC_ASSERT(_curDynamicOffsetCounts[i] >= count);
        count = std::min(count, utils::toUint(_curDynamicOffsetsArray[i].size()));
        if (count > 0) memcpy(&_curDynamicOffsets[dynamicOffsetOffsets[i]], _curDynamicOffsetsArray[i].data(), count * sizeof(uint32_t));
    }

    uint32_t dynamicOffsetStartIndex = dynamicOffsetOffsets[_firstDirtyDescriptorSet];
    uint32_t dynamicOffsetEndIndex = dynamicOffsetOffsets[_firstDirtyDescriptorSet + dirtyDescriptorSetCount];
    uint32_t dynamicOffsetCount = dynamicOffsetEndIndex - dynamicOffsetStartIndex;
    vkCmdBindDescriptorSets(_gpuCommandBuffer->vkCommandBuffer,
                            bindPoint, pipelineLayout->vkPipelineLayout,
                            _firstDirtyDescriptorSet, dirtyDescriptorSetCount,
                            &_curVkDescriptorSets[_firstDirtyDescriptorSet],
                            dynamicOffsetCount, _curDynamicOffsets.data() + dynamicOffsetStartIndex);

    _firstDirtyDescriptorSet = UINT_MAX;
}

void CCVKCommandBuffer::dispatch(const DispatchInfo &info) {
    if (_firstDirtyDescriptorSet < _curGPUDescriptorSets.size()) {
        bindDescriptorSets(VK_PIPELINE_BIND_POINT_COMPUTE);
    }

    if (info.indirectBuffer) {
        CCVKGPUDevice *gpuDevice = CCVKDevice::getInstance()->gpuDevice();
        auto *indirectBuffer = static_cast<CCVKBuffer *>(info.indirectBuffer);
        vkCmdDispatchIndirect(_gpuCommandBuffer->vkCommandBuffer, indirectBuffer->gpuBuffer()->vkBuffer,
                              indirectBuffer->gpuBufferView()->getStartOffset(gpuDevice->curBackBufferIndex) + info.indirectOffset);
    } else {
        vkCmdDispatch(_gpuCommandBuffer->vkCommandBuffer, info.groupCountX, info.groupCountY, info.groupCountZ);
    }
}

void CCVKCommandBuffer::pipelineBarrier(const GeneralBarrier *barrier, const BufferBarrier *const *bufferBarriers, const Buffer *const *buffers, uint32_t bufferBarrierCount, const TextureBarrier *const *textureBarriers, const Texture *const *textures, uint textureBarrierCount) {
    VkPipelineStageFlags fullSrcStageMask = VK_PIPELINE_STAGE_NONE_KHR;
    VkPipelineStageFlags fullDstStageMask = VK_PIPELINE_STAGE_NONE_KHR;
    VkPipelineStageFlags splitSrcStageMask = VK_PIPELINE_STAGE_NONE_KHR;
    VkPipelineStageFlags splitDstStageMask = VK_PIPELINE_STAGE_NONE_KHR;
    VkMemoryBarrier const *pMemoryBarrier = nullptr;

    ccstd::vector<std::pair<uint32_t, VkImageMemoryBarrier>> splitImageBarriers;
    ccstd::vector<std::pair<uint32_t, VkBufferMemoryBarrier>> splitBufferBarriers;
    ccstd::vector<VkImageMemoryBarrier> fullImageBarriers;
    ccstd::vector<VkBufferMemoryBarrier> fullBufferBarriers;
    ccstd::vector<VkEvent> scheduledEvents;

    auto signalEvent = [&](const GFXObject *obj, VkPipelineStageFlags stageMask) {
        VkEvent event;
        if (!_availableEvents.empty()) {
            event = _availableEvents.front();
            _availableEvents.pop();
        } else {
            VkEventCreateInfo eventInfo = {
                VK_STRUCTURE_TYPE_EVENT_CREATE_INFO,
                nullptr,
                0,
            };
            VkResult res = vkCreateEvent(CCVKDevice::getInstance()->gpuDevice()->vkDevice,
                                         &eventInfo,
                                         nullptr,
                                         &event);
            CC_ASSERT_EQ(res, VK_SUCCESS);
        }
        vkCmdSetEvent(_gpuCommandBuffer->vkCommandBuffer, event, stageMask);
        _barrierEvents.insert({obj, event});
    };

    if (textureBarrierCount > 0) {
        for (uint32_t i = 0U; i < textureBarrierCount; ++i) {
            const auto *ccBarrier = static_cast<const CCVKTextureBarrier *const>(textureBarriers[i]);
            const auto *gpuBarrier = ccBarrier->gpuBarrier();
            const auto *ccTexture = static_cast<const CCVKTexture *const>(textures[i]);
            auto *gpuTexture = ccTexture->gpuTexture();

            if (ccBarrier->getInfo().type == BarrierType::SPLIT_BEGIN) {
                signalEvent(ccTexture, gpuBarrier->srcStageMask);
            } else {
                bool fullBarrier = ccBarrier->getInfo().type == BarrierType::FULL;
                bool missed = _barrierEvents.find(ccTexture) == _barrierEvents.end();
                if (!fullBarrier && !missed) {
                    //CC_ASSERT(_barrierEvents.find(ccTexture) != _barrierEvents.end());
                    VkEvent event = _barrierEvents.at(ccTexture);
                    scheduledEvents.push_back(event);

                    gpuTexture->currentAccessTypes.assign(gpuBarrier->barrier.pNextAccesses, gpuBarrier->barrier.pNextAccesses + gpuBarrier->barrier.nextAccessCount);
                    auto srcStageMask = gpuBarrier->srcStageMask & VK_PIPELINE_STAGE_HOST_BIT ? 0x0 : gpuBarrier->srcStageMask;
                    auto &barrier = splitImageBarriers.emplace_back(i, gpuBarrier->vkBarrier);
                    barrier.second.subresourceRange.aspectMask = gpuTexture->aspectMask;
                    if (gpuTexture->swapchain) {
                        barrier.second.image = gpuTexture->swapchainVkImages[gpuTexture->swapchain->curImageIndex];
                    } else {
                        barrier.second.image = gpuTexture->vkImage;
                    }
                    splitSrcStageMask |= gpuBarrier->srcStageMask;
                    splitDstStageMask |= gpuBarrier->dstStageMask;
                } else {
                    gpuTexture->currentAccessTypes.assign(gpuBarrier->barrier.pNextAccesses, gpuBarrier->barrier.pNextAccesses + gpuBarrier->barrier.nextAccessCount);
                    fullImageBarriers.push_back(gpuBarrier->vkBarrier);
                    fullImageBarriers.back().srcAccessMask = missed ? VK_IMAGE_LAYOUT_UNDEFINED : fullImageBarriers.back().srcAccessMask;
                    fullImageBarriers.back().subresourceRange.aspectMask = gpuTexture->aspectMask;
                    if (gpuTexture->swapchain) {
                        fullImageBarriers.back().image = gpuTexture->swapchainVkImages[gpuTexture->swapchain->curImageIndex];
                    } else {
                        fullImageBarriers.back().image = gpuTexture->vkImage;
                    }
                    fullSrcStageMask |= gpuBarrier->srcStageMask;
                    fullDstStageMask |= gpuBarrier->dstStageMask;
                }
            }
        }
    }

    if (bufferBarrierCount > 0) {
        for (uint32_t i = 0U; i < bufferBarrierCount; ++i) {
            const auto *ccBarrier = static_cast<const CCVKBufferBarrier *const>(bufferBarriers[i]);
            const auto *gpuBarrier = ccBarrier->gpuBarrier();
            const auto *ccBuffer = static_cast<const CCVKBuffer *const>(buffers[i]);
            auto *gpuBuffer = ccBuffer->gpuBuffer();

            if (ccBarrier->getInfo().type == BarrierType::SPLIT_BEGIN) {
                signalEvent(ccBuffer, gpuBarrier->srcStageMask);
            } else {
                bool fullBarrier = ccBarrier->getInfo().type == BarrierType::FULL;
                bool missed = _barrierEvents.find(ccBuffer) != _barrierEvents.end();
                if (!fullBarrier && !missed) {
                    CC_ASSERT(_barrierEvents.find(ccBuffer) != _barrierEvents.end());
                    VkEvent event = _barrierEvents.at(ccBuffer);
                    scheduledEvents.push_back(event);

                    gpuBuffer->currentAccessTypes.assign(gpuBarrier->barrier.pNextAccesses, gpuBarrier->barrier.pNextAccesses + gpuBarrier->barrier.nextAccessCount);
                    auto &splitBarrier = splitBufferBarriers.emplace_back(i, gpuBarrier->vkBarrier);
                    splitBarrier.second.buffer = gpuBuffer->vkBuffer;
                    splitSrcStageMask |= gpuBarrier->srcStageMask;
                    splitDstStageMask |= gpuBarrier->dstStageMask;
                } else {
                    gpuBuffer->currentAccessTypes.assign(gpuBarrier->barrier.pNextAccesses, gpuBarrier->barrier.pNextAccesses + gpuBarrier->barrier.nextAccessCount);
                    fullBufferBarriers.push_back(gpuBarrier->vkBarrier);
                    fullBufferBarriers.back().srcAccessMask = missed ? VK_IMAGE_LAYOUT_UNDEFINED : fullBufferBarriers.back().srcAccessMask;
                    fullBufferBarriers.back().buffer = gpuBuffer->vkBuffer;
                    fullSrcStageMask |= gpuBarrier->srcStageMask;
                    fullDstStageMask |= gpuBarrier->dstStageMask;
                }
            }
        }
    }

    if (barrier) {
        const auto *ccBarrier = static_cast<const CCVKGeneralBarrier *>(barrier);
        const auto *gpuBarrier = ccBarrier->gpuBarrier();
        fullSrcStageMask |= gpuBarrier->srcStageMask;
        fullDstStageMask |= gpuBarrier->dstStageMask;
        splitSrcStageMask |= gpuBarrier->srcStageMask;
        splitDstStageMask |= gpuBarrier->dstStageMask;
        pMemoryBarrier = &gpuBarrier->vkBarrier;
    }

    fullSrcStageMask = fullSrcStageMask & VK_PIPELINE_STAGE_HOST_BIT ? 0x0 : fullSrcStageMask;
    splitSrcStageMask = splitSrcStageMask & VK_PIPELINE_STAGE_HOST_BIT ? 0x0 : splitSrcStageMask;

    if (textureBarrierCount || bufferBarrierCount || barrier) {
        // split end detect
        if (!splitBufferBarriers.empty() || !splitImageBarriers.empty()) {
            {
                ccstd::vector<VkImageMemoryBarrier> vkImageBarriers(splitImageBarriers.size());
                ccstd::vector<VkBufferMemoryBarrier> vkBufferBarriers(splitBufferBarriers.size());
                for (size_t idx = 0; idx < splitImageBarriers.size(); ++idx) {
                    vkImageBarriers[idx] = splitImageBarriers[idx].second;
                }
                for (size_t idx = 0; idx < splitBufferBarriers.size(); ++idx) {
                    vkBufferBarriers[idx] = splitBufferBarriers[idx].second;
                }

                vkCmdWaitEvents(_gpuCommandBuffer->vkCommandBuffer, scheduledEvents.size(), scheduledEvents.data(), splitSrcStageMask, splitDstStageMask, 0, nullptr, vkBufferBarriers.size(),
                                vkBufferBarriers.data(), vkImageBarriers.size(), vkImageBarriers.data());
            }

            for (size_t i = 0; i < splitImageBarriers.size(); ++i) { // NOLINT (range-based-for)
                auto index = splitImageBarriers[i].first;
                VkEvent event = _barrierEvents.at(textures[index]);
                const auto *ccBarrier = static_cast<const CCVKTextureBarrier *const>(textureBarriers[index]);
                const auto *gpuBarrier = ccBarrier->gpuBarrier();
                vkCmdResetEvent(_gpuCommandBuffer->vkCommandBuffer, event, gpuBarrier->dstStageMask);
                _barrierEvents.erase(textures[index]);
                _availableEvents.push(event);
            }

            for (size_t i = 0; i < splitBufferBarriers.size(); ++i) { // NOLINT (range-based-for)
                auto index = splitBufferBarriers[i].first;
                VkEvent event = _barrierEvents.at(buffers[index]);
                const auto *ccBarrier = static_cast<const CCVKBufferBarrier *const>(bufferBarriers[index]);
                const auto *gpuBarrier = ccBarrier->gpuBarrier();
                vkCmdResetEvent(_gpuCommandBuffer->vkCommandBuffer, event, gpuBarrier->dstStageMask);
                _barrierEvents.erase(buffers[index]);
                _availableEvents.push(event);
            }
        }

        if (!fullBufferBarriers.empty() || !fullImageBarriers.empty()) {
            vkCmdPipelineBarrier(_gpuCommandBuffer->vkCommandBuffer, fullSrcStageMask, fullDstStageMask, 0, 0, pMemoryBarrier,
                                 fullBufferBarriers.size(), fullBufferBarriers.data(), fullImageBarriers.size(), fullImageBarriers.data());
        }
    }
}

void CCVKCommandBuffer::beginQuery(QueryPool *queryPool, uint32_t /*id*/) {
    auto *vkQueryPool = static_cast<CCVKQueryPool *>(queryPool);
    CCVKGPUQueryPool *gpuQueryPool = vkQueryPool->gpuQueryPool();
    auto queryId = static_cast<uint32_t>(vkQueryPool->_ids.size());

    if (queryId < queryPool->getMaxQueryObjects()) {
        vkCmdBeginQuery(_gpuCommandBuffer->vkCommandBuffer, gpuQueryPool->vkPool, queryId, 0);
    }
}

void CCVKCommandBuffer::endQuery(QueryPool *queryPool, uint32_t id) {
    auto *vkQueryPool = static_cast<CCVKQueryPool *>(queryPool);
    CCVKGPUQueryPool *gpuQueryPool = vkQueryPool->gpuQueryPool();
    auto queryId = static_cast<uint32_t>(vkQueryPool->_ids.size());

    if (queryId < queryPool->getMaxQueryObjects()) {
        vkCmdEndQuery(_gpuCommandBuffer->vkCommandBuffer, gpuQueryPool->vkPool, queryId);
        vkQueryPool->_ids.push_back(id);
    }
}

void CCVKCommandBuffer::resetQueryPool(QueryPool *queryPool) {
    auto *vkQueryPool = static_cast<CCVKQueryPool *>(queryPool);
    CCVKGPUQueryPool *gpuQueryPool = vkQueryPool->gpuQueryPool();

    vkCmdResetQueryPool(_gpuCommandBuffer->vkCommandBuffer, gpuQueryPool->vkPool, 0, queryPool->getMaxQueryObjects());
    vkQueryPool->_ids.clear();
}

void CCVKCommandBuffer::customCommand(CustomCommand &&cmd) {
    cmd(reinterpret_cast<void *>(_gpuCommandBuffer->vkCommandBuffer));
}

void CCVKCommandBuffer::buildAccelerationStructure(AccelerationStructure* accel) {
    auto *gpuAccel = static_cast<CCVKAccelerationStructure *>(accel)->gpuAccelerationStructure();
    cmdFuncCCVKBuildAccelerationStructure(CCVKDevice::getInstance(), gpuAccel, _gpuCommandBuffer);
}

void CCVKCommandBuffer::buildAccelerationStructure(AccelerationStructure* accel, Buffer* scratchBuffer) {
    auto *gpuAccel = static_cast<CCVKAccelerationStructure *>(accel)->gpuAccelerationStructure();
    auto *gpuBuffer  = static_cast<CCVKBuffer *>(scratchBuffer)->gpuBuffer();
    cmdFuncCCVKBuildAccelerationStructure(CCVKDevice::getInstance(), gpuAccel, _gpuCommandBuffer, gpuBuffer);
}

void CCVKCommandBuffer::updateAccelerationStructure(AccelerationStructure* accel) {
    auto *gpuAccel = static_cast<CCVKAccelerationStructure *>(accel)->gpuAccelerationStructure();
    cmdFuncCCVKUpdateAccelerationStructure(CCVKDevice::getInstance(), gpuAccel, _gpuCommandBuffer);
}

void CCVKCommandBuffer::compactAccelerationStructure(AccelerationStructure *accel, AccelerationStructure *res) {
    auto *gpuAccel = static_cast<CCVKAccelerationStructure *>(accel)->gpuAccelerationStructure();
    auto *resAccel = static_cast<CCVKAccelerationStructure *>(res)->gpuAccelerationStructure();
    cmdFuncCCVKCompactAccelerationStructure(CCVKDevice::getInstance(), gpuAccel, resAccel,_gpuCommandBuffer);
}

void CCVKCommandBuffer::traceRays(const RayTracingInfo &info) {

    if (_firstDirtyDescriptorSet < _curGPUDescriptorSets.size()) {
        bindDescriptorSets(VK_PIPELINE_BIND_POINT_RAY_TRACING_KHR);
    }

    if(info.indirectBuffer){
        //todo
    }else{

        //todo shaderGroupBaseAlignment is the required alignment in bytes for the base of the shader binding table.
        //todo info.SBT->getDeviceAddress() must be a multiple pf shaderGroupBaseAlignment.

        const VkStridedDeviceAddressRegionKHR rayGenSBT = {info.rayGenSBT->getDeviceAddress(),info.rayGenSBT->getStride(),info.rayGenSBT->getSize()};

        /*
            • VUID-vkCmdTraceRaysKHR-flags-03696
            If the currently bound ray tracing pipeline was created with flags that included VK_PIPELINE_CREATE_RAY_TRACING_NO_NULL_CLOSEST_HIT_SHADERS_BIT_KHR,
            pHitShaderBindingTable->deviceAddress must not be zero
            
            • VUID-vkCmdTraceRaysKHR-flags-03697
            If the currently bound ray tracing pipeline was created with flags that included VK_PIPELINE_CREATE_RAY_TRACING_NO_NULL_INTERSECTION_SHADERS_BIT_KHR,
            pHitShaderBindingTable->deviceAddress must not be zero
            
            • VUID-vkCmdTraceRaysKHR-flags-03512
            If the currently bound ray tracing pipeline was created with flags that included VK_PIPELINE_CREATE_RAY_TRACING_NO_NULL_ANY_HIT_SHADERS_BIT_KHR,
            entries in the table identified by pHitShaderBindingTable->deviceAddress accessed as a result of this command in order to execute an any-hit shader must not be set to zero
            
            • VUID-vkCmdTraceRaysKHR-flags-03513
            If the currently bound ray tracing pipeline was created with flags that included VK_PIPELINE_CREATE_RAY_TRACING_NO_NULL_CLOSEST_HIT_SHADERS_BIT_KHR, entries in the table
            identified by pHitShaderBindingTable->deviceAddress accessed as a result of this command in order to execute a closest hit shader must not be set to zero
            
            • VUID-vkCmdTraceRaysKHR-flags-03514
            If the currently bound ray tracing pipeline was created with flags that included VK_PIPELINE_CREATE_RAY_TRACING_NO_NULL_INTERSECTION_SHADERS_BIT_KHR,
            entries in the table identified by pHitShaderBindingTable->deviceAddress accessed as a result of this command in order to execute an intersection shader must not be set to zero
        */

        const VkStridedDeviceAddressRegionKHR hitGroupSBT = {info.hitGroupSBT->getDeviceAddress(),info.hitGroupSBT->getStride(),info.hitGroupSBT->getSize()};

        /*
            • VUID-vkCmdTraceRaysKHR-flags-03511
            If the currently bound ray tracing pipeline was created with flags that included VK_PIPELINE_CREATE_RAY_TRACING_NO_NULL_MISS_SHADERS_BIT_KHR,
            the shader group handle identified by pMissShaderBindingTable->deviceAddress must not be set to zero
         */

        const VkStridedDeviceAddressRegionKHR missSBT = {info.missSBT->getDeviceAddress(),info.missSBT->getStride(),info.missSBT->getSize()};

        const VkStridedDeviceAddressRegionKHR callableSBT = {info.callableSBT->getDeviceAddress(),info.callableSBT->getStride(),info.callableSBT->getSize()};

        /*
         * The ray tracing pipeline
         * Index of the group to start from
         * The number of groups
         * output buffer
        */

        CC_ASSERT(info.width * info.height * info.depth <= CCVKDevice::getInstance()->gpuContext()->physicalDeviceRaytracingPipelineProperties.maxRayDispatchInvocationCount);
        vkCmdTraceRaysKHR(_gpuCommandBuffer->vkCommandBuffer, &rayGenSBT,&hitGroupSBT,&missSBT,&callableSBT,info.width,info.height,info.depth);
    }
}

} // namespace gfx
} // namespace cc
