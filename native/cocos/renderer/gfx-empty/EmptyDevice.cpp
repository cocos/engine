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

#include "EmptyDevice.h"
#include <thread>
#include "EmptyBuffer.h"
#include "EmptyCommandBuffer.h"
#include "EmptyDescriptorSet.h"
#include "EmptyDescriptorSetLayout.h"
#include "EmptyFramebuffer.h"
#include "EmptyInputAssembler.h"
#include "EmptyPipelineLayout.h"
#include "EmptyPipelineState.h"
#include "EmptyQueryPool.h"
#include "EmptyQueue.h"
#include "EmptyRenderPass.h"
#include "EmptyShader.h"
#include "EmptySwapchain.h"
#include "EmptyTexture.h"
#include "EmptyAccelerationStructure.h"

#include "base/Log.h"

namespace cc {
namespace gfx {

EmptyDevice *EmptyDevice::instance = nullptr;

EmptyDevice *EmptyDevice::getInstance() {
    return EmptyDevice::instance;
}

EmptyDevice::EmptyDevice() {
    EmptyDevice::instance = this;
}

EmptyDevice::~EmptyDevice() {
    EmptyDevice::instance = nullptr;
}

bool EmptyDevice::doInit(const DeviceInfo & /*info*/) {
    QueueInfo queueInfo;
    queueInfo.type = QueueType::GRAPHICS;
    _queue = createQueue(queueInfo);

    QueryPoolInfo queryPoolInfo{QueryType::OCCLUSION, DEFAULT_MAX_QUERY_OBJECTS, true};
    _queryPool = createQueryPool(queryPoolInfo);

    CommandBufferInfo cmdBuffInfo;
    cmdBuffInfo.type = CommandBufferType::PRIMARY;
    cmdBuffInfo.queue = _queue;
    _cmdBuff = createCommandBuffer(cmdBuffInfo);

    _formatFeatures.fill(static_cast<FormatFeature>(-1)); // allow all usages for all formats
    _formatFeatures[toNumber(Format::UNKNOWN)] = FormatFeature::NONE;

    CC_LOG_INFO("Empty device initialized.");

    return true;
}

void EmptyDevice::doDestroy() {
    CC_SAFE_DESTROY_AND_DELETE(_cmdBuff);
    CC_SAFE_DESTROY_AND_DELETE(_queryPool);
    CC_SAFE_DESTROY_AND_DELETE(_queue);
}

void EmptyDevice::acquire(Swapchain *const * /*swapchains*/, uint32_t /*count*/) {
    if (_onAcquire) _onAcquire->execute();
}

void EmptyDevice::present() {
    std::this_thread::sleep_for(std::chrono::milliseconds(16));
}

CommandBuffer *EmptyDevice::createCommandBuffer(const CommandBufferInfo & /*info*/, bool /*hasAgent*/) {
    return ccnew EmptyCommandBuffer;
}

Queue *EmptyDevice::createQueue() {
    return ccnew EmptyQueue;
}

QueryPool *EmptyDevice::createQueryPool() {
    return ccnew EmptyQueryPool;
}

Swapchain *EmptyDevice::createSwapchain() {
    return ccnew EmptySwapchain;
}

Buffer *EmptyDevice::createBuffer() {
    return ccnew EmptyBuffer;
}

Texture *EmptyDevice::createTexture() {
    return ccnew EmptyTexture;
}

Shader *EmptyDevice::createShader() {
    return ccnew EmptyShader;
}

InputAssembler *EmptyDevice::createInputAssembler() {
    return ccnew EmptyInputAssembler;
}

RenderPass *EmptyDevice::createRenderPass() {
    return ccnew EmptyRenderPass;
}

Framebuffer *EmptyDevice::createFramebuffer() {
    return ccnew EmptyFramebuffer;
}

DescriptorSet *EmptyDevice::createDescriptorSet() {
    return ccnew EmptyDescriptorSet;
}

DescriptorSetLayout *EmptyDevice::createDescriptorSetLayout() {
    return ccnew EmptyDescriptorSetLayout;
}

PipelineLayout *EmptyDevice::createPipelineLayout() {
    return ccnew EmptyPipelineLayout;
}

PipelineState *EmptyDevice::createPipelineState() {
    return ccnew EmptyPipelineState;
}

 AccelerationStructure* EmptyDevice::createAccelerationStructure() {
    return ccnew EmptyAccelerationStructure;
 }


void EmptyDevice::copyBuffersToTexture(const uint8_t *const *buffers, Texture *dst, const BufferTextureCopy *regions, uint32_t count) {
}

void EmptyDevice::copyTextureToBuffers(Texture *src, uint8_t *const *buffers, const BufferTextureCopy *region, uint32_t count) {
}

void EmptyDevice::getQueryPoolResults(QueryPool *queryPool) {
}

} // namespace gfx
} // namespace cc
