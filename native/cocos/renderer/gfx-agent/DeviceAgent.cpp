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

#include <boost/align/align_up.hpp>
#include <cstring>
#include "application/ApplicationManager.h"
#include "base/Log.h"
#include "base/threading/MessageQueue.h"
#include "base/threading/ThreadSafeLinearAllocator.h"
#include "platform/interfaces/modules/IXRInterface.h"

#include "BufferAgent.h"
#include "CommandBufferAgent.h"
#include "DescriptorSetAgent.h"
#include "DescriptorSetLayoutAgent.h"
#include "DeviceAgent.h"
#include "FramebufferAgent.h"
#include "InputAssemblerAgent.h"
#include "PipelineLayoutAgent.h"
#include "PipelineStateAgent.h"
#include "QueryPoolAgent.h"
#include "QueueAgent.h"
#include "RenderPassAgent.h"
#include "ShaderAgent.h"
#include "SwapchainAgent.h"
#include "TextureAgent.h"

namespace cc {
namespace gfx {

DeviceAgent *DeviceAgent::instance = nullptr;

DeviceAgent *DeviceAgent::getInstance() {
    return DeviceAgent::instance;
}

DeviceAgent::DeviceAgent(Device *device) : Agent(device) {
    DeviceAgent::instance = this;
}

DeviceAgent::~DeviceAgent() {
    CC_SAFE_DELETE(_actor);
    DeviceAgent::instance = nullptr;
}

bool DeviceAgent::doInit(const DeviceInfo &info) {
    if (!_actor->initialize(info)) {
        return false;
    }
    _xr = CC_GET_XR_INTERFACE();
    _api = _actor->getGfxAPI();
    _deviceName = _actor->getDeviceName();
    _queue = ccnew QueueAgent(_actor->getQueue());
    _queryPool = ccnew QueryPoolAgent(_actor->getQueryPool());
    _cmdBuff = ccnew CommandBufferAgent(_actor->getCommandBuffer());
    _renderer = _actor->getRenderer();
    _vendor = _actor->getVendor();
    _caps = _actor->_caps;
    memcpy(_features.data(), _actor->_features.data(), static_cast<uint32_t>(Feature::COUNT) * sizeof(bool));
    memcpy(_formatFeatures.data(), _actor->_formatFeatures.data(), static_cast<uint32_t>(Format::COUNT) * sizeof(FormatFeatureBit));

    _mainMessageQueue = ccnew MessageQueue;

    static_cast<CommandBufferAgent *>(_cmdBuff)->_queue = _queue;
    static_cast<CommandBufferAgent *>(_cmdBuff)->initAgent();

    setMultithreaded(true);

    return true;
}

void DeviceAgent::doDestroy() {
    if (!_mainMessageQueue) {
        _actor->destroy();
    } else {
        ENQUEUE_MESSAGE_1(
            _mainMessageQueue, DeviceDestroy,
            actor, _actor,
            {
                actor->destroy();
            });
    }

    if (_cmdBuff) {
        static_cast<CommandBufferAgent *>(_cmdBuff)->destroyAgent();
        static_cast<CommandBufferAgent *>(_cmdBuff)->_actor = nullptr;
        delete _cmdBuff;
        _cmdBuff = nullptr;
    }
    if (_queryPool) {
        static_cast<QueryPoolAgent *>(_queryPool)->_actor = nullptr;
        delete _queryPool;
        _queryPool = nullptr;
    }
    if (_queue) {
        static_cast<QueueAgent *>(_queue)->_actor = nullptr;
        delete _queue;
        _queue = nullptr;
    }

    if (_mainMessageQueue) {
        _mainMessageQueue->terminateConsumerThread();

        delete _mainMessageQueue;
        _mainMessageQueue = nullptr;
    }
}

void DeviceAgent::acquire(Swapchain *const *swapchains, uint32_t count) {
    auto *actorSwapchains = _mainMessageQueue->allocate<Swapchain *>(count);
    for (uint32_t i = 0; i < count; ++i) {
        actorSwapchains[i] = static_cast<SwapchainAgent *>(swapchains[i])->getActor();
    }

    ENQUEUE_MESSAGE_4(
        _mainMessageQueue, DevicePresent,
        device, this,
        actor, _actor,
        swapchains, actorSwapchains,
        count, count,
        {
            if (device->_onAcquire) device->_onAcquire->execute();
            actor->acquire(swapchains, count);
        });
}

void DeviceAgent::present() {
    if (_xr) {
        ENQUEUE_MESSAGE_1(
            _mainMessageQueue, DevicePresent,
            actor, _actor,
            {
                actor->present();
            });
    } else {
        ENQUEUE_MESSAGE_2(
            _mainMessageQueue, DevicePresent,
            actor, _actor,
            frameBoundarySemaphore, &_frameBoundarySemaphore,
            {
                actor->present();
                frameBoundarySemaphore->signal();
            });

        MessageQueue::freeChunksInFreeQueue(_mainMessageQueue);
        _mainMessageQueue->finishWriting();
        _currentIndex = (_currentIndex + 1) % MAX_FRAME_INDEX;
        _frameBoundarySemaphore.wait();
    }
}

void DeviceAgent::setMultithreaded(bool multithreaded) {
    if (multithreaded == _multithreaded) return;
    _multithreaded = multithreaded;

    if (multithreaded) {
        _mainMessageQueue->setImmediateMode(false);
        _actor->bindContext(false);
        _mainMessageQueue->runConsumerThread();
        ENQUEUE_MESSAGE_1(
            _mainMessageQueue, DeviceMakeCurrentTrue,
            actor, _actor,
            {
                actor->bindContext(true);
                CC_LOG_INFO("Device thread detached.");
            });
        for (CommandBufferAgent *cmdBuff : _cmdBuffRefs) {
            cmdBuff->_messageQueue->setImmediateMode(false);
        }
    } else {
        ENQUEUE_MESSAGE_1(
            _mainMessageQueue, DeviceMakeCurrentFalse,
            actor, _actor,
            {
                actor->bindContext(false);
            });
        _mainMessageQueue->terminateConsumerThread();
        _mainMessageQueue->setImmediateMode(true);
        _actor->bindContext(true);
        for (CommandBufferAgent *cmdBuff : _cmdBuffRefs) {
            cmdBuff->_messageQueue->setImmediateMode(true);
        }
        CC_LOG_INFO("Device thread joined.");
    }
}

CommandBuffer *DeviceAgent::createCommandBuffer(const CommandBufferInfo &info, bool /*hasAgent*/) {
    CommandBuffer *actor = _actor->createCommandBuffer(info, true);
    return ccnew CommandBufferAgent(actor);
}

Queue *DeviceAgent::createQueue() {
    Queue *actor = _actor->createQueue();
    return ccnew QueueAgent(actor);
}

QueryPool *DeviceAgent::createQueryPool() {
    QueryPool *actor = _actor->createQueryPool();
    return ccnew QueryPoolAgent(actor);
}

Swapchain *DeviceAgent::createSwapchain() {
    Swapchain *actor = _actor->createSwapchain();
    return ccnew SwapchainAgent(actor);
}

Buffer *DeviceAgent::createBuffer() {
    Buffer *actor = _actor->createBuffer();
    return ccnew BufferAgent(actor);
}

Texture *DeviceAgent::createTexture() {
    Texture *actor = _actor->createTexture();
    return ccnew TextureAgent(actor);
}

Shader *DeviceAgent::createShader() {
    Shader *actor = _actor->createShader();
    return ccnew ShaderAgent(actor);
}

InputAssembler *DeviceAgent::createInputAssembler() {
    InputAssembler *actor = _actor->createInputAssembler();
    return ccnew InputAssemblerAgent(actor);
}

RenderPass *DeviceAgent::createRenderPass() {
    RenderPass *actor = _actor->createRenderPass();
    return ccnew RenderPassAgent(actor);
}

Framebuffer *DeviceAgent::createFramebuffer() {
    Framebuffer *actor = _actor->createFramebuffer();
    return ccnew FramebufferAgent(actor);
}

DescriptorSet *DeviceAgent::createDescriptorSet() {
    DescriptorSet *actor = _actor->createDescriptorSet();
    return ccnew DescriptorSetAgent(actor);
}

DescriptorSetLayout *DeviceAgent::createDescriptorSetLayout() {
    DescriptorSetLayout *actor = _actor->createDescriptorSetLayout();
    return ccnew DescriptorSetLayoutAgent(actor);
}

PipelineLayout *DeviceAgent::createPipelineLayout() {
    PipelineLayout *actor = _actor->createPipelineLayout();
    return ccnew PipelineLayoutAgent(actor);
}

PipelineState *DeviceAgent::createPipelineState() {
    PipelineState *actor = _actor->createPipelineState();
    return ccnew PipelineStateAgent(actor);
}

AccelerationStructure* DeviceAgent::createAccelerationStructure() {
    AccelerationStructure *actor = _actor->createAccelerationStructure();
    return nullptr;
}


Sampler *DeviceAgent::getSampler(const SamplerInfo &info) {
    return _actor->getSampler(info);
}

GeneralBarrier *DeviceAgent::getGeneralBarrier(const GeneralBarrierInfo &info) {
    return _actor->getGeneralBarrier(info);
}

TextureBarrier *DeviceAgent::getTextureBarrier(const TextureBarrierInfo &info) {
    return _actor->getTextureBarrier(info);
}

BufferBarrier *DeviceAgent::getBufferBarrier(const BufferBarrierInfo &info) {
    return _actor->getBufferBarrier(info);
}

template <typename T>
void doBufferTextureCopy(const uint8_t *const *buffers, Texture *texture, const BufferTextureCopy *regions, uint32_t count, MessageQueue *mq, T *actor) {
    uint32_t bufferCount = 0U;
    for (uint32_t i = 0U; i < count; i++) {
        bufferCount += regions[i].texSubres.layerCount;
    }

    Format format = texture->getFormat();
    constexpr uint32_t alignment = 16;

    size_t totalSize = boost::alignment::align_up(sizeof(BufferTextureCopy) * count + sizeof(uint8_t *) * bufferCount, alignment);
    for (uint32_t i = 0U; i < count; i++) {
        const BufferTextureCopy &region = regions[i];

        uint32_t size = formatSize(texture->getFormat(), region.texExtent.width, region.texExtent.height, region.texExtent.depth);
        totalSize += boost::alignment::align_up(size, alignment) * region.texSubres.layerCount;
    }

    auto *allocator = ccnew ThreadSafeLinearAllocator(totalSize, alignment);

    auto *actorRegions = allocator->allocate<BufferTextureCopy>(count);
    memcpy(actorRegions, regions, count * sizeof(BufferTextureCopy));

    const auto **actorBuffers = allocator->allocate<const uint8_t *>(bufferCount);
    const auto blockHeight = formatAlignment(format).second;
    for (uint32_t i = 0U, n = 0U; i < count; i++) {
        const BufferTextureCopy &region = regions[i];
        uint32_t width = region.texExtent.width;
        uint32_t height = region.texExtent.height;
        uint32_t depth = region.texExtent.depth;

        uint32_t rowStride = region.buffStride > 0 ? region.buffStride : region.texExtent.width;
        uint32_t heightStride = region.buffTexHeight > 0 ? region.buffTexHeight : region.texExtent.height;

        uint32_t rowStrideSize = formatSize(format, rowStride, 1, 1);
        uint32_t sliceStrideSize = formatSize(format, rowStride, heightStride, 1);
        uint32_t destRowStrideSize = formatSize(format, width, 1, 1);
        uint32_t size = formatSize(format, width, height, depth);

        for (uint32_t l = 0; l < region.texSubres.layerCount; l++) {
            auto *buffer = allocator->allocate<uint8_t>(size, alignment);
            uint32_t destOffset = 0;
            uint32_t buffOffset = 0;
            for (uint32_t d = 0; d < depth; d++) {
                buffOffset = region.buffOffset + sliceStrideSize * d;
                for (uint32_t h = 0; h < height; h += blockHeight) {
                    memcpy(buffer + destOffset, buffers[n] + buffOffset, destRowStrideSize);
                    destOffset += destRowStrideSize;
                    buffOffset += rowStrideSize;
                }
            }
            actorBuffers[n++] = buffer;
        }
        actorRegions[i].buffOffset = 0;
        actorRegions[i].buffStride = 0;
        actorRegions[i].buffTexHeight = 0;
    }

    ENQUEUE_MESSAGE_6(
        mq, DeviceCopyBuffersToTexture,
        actor, actor,
        buffers, actorBuffers,
        dst, static_cast<TextureAgent *>(texture)->getActor(),
        regions, actorRegions,
        count, count,
        allocator, allocator,
        {
            actor->copyBuffersToTexture(buffers, dst, regions, count);
            delete allocator;
        });
}

void DeviceAgent::copyBuffersToTexture(const uint8_t *const *buffers, Texture *dst, const BufferTextureCopy *regions, uint32_t count) {
    doBufferTextureCopy(buffers, dst, regions, count, _mainMessageQueue, _actor);
}

void CommandBufferAgent::copyBuffersToTexture(const uint8_t *const *buffers, Texture *texture, const BufferTextureCopy *regions, uint32_t count) {
    doBufferTextureCopy(buffers, texture, regions, count, _messageQueue, _actor);
}

void DeviceAgent::copyTextureToBuffers(Texture *srcTexture, uint8_t *const *buffers, const BufferTextureCopy *regions, uint32_t count) {
    ENQUEUE_MESSAGE_5(
        _mainMessageQueue,
        DeviceCopyTextureToBuffers,
        actor, getActor(),
        src, static_cast<TextureAgent *>(srcTexture)->getActor(),
        buffers, buffers,
        regions, regions,
        count, count,
        {
            actor->copyTextureToBuffers(src, buffers, regions, count);
        });

    _mainMessageQueue->kickAndWait();
}

void DeviceAgent::flushCommands(CommandBuffer *const *cmdBuffs, uint32_t count) {
    if (!_multithreaded) return; // all command buffers are immediately executed

    auto **agentCmdBuffs = _mainMessageQueue->allocate<CommandBufferAgent *>(count);

    for (uint32_t i = 0; i < count; ++i) {
        agentCmdBuffs[i] = static_cast<CommandBufferAgent *const>(cmdBuffs[i]);
        MessageQueue::freeChunksInFreeQueue(agentCmdBuffs[i]->_messageQueue);
        agentCmdBuffs[i]->_messageQueue->finishWriting();
    }

    ENQUEUE_MESSAGE_3(
        _mainMessageQueue, DeviceFlushCommands,
        count, count,
        cmdBuffs, agentCmdBuffs,
        multiThreaded, _actor->_multithreadedCommandRecording,
        {
            CommandBufferAgent::flushCommands(count, cmdBuffs, multiThreaded);
        });
}

void DeviceAgent::getQueryPoolResults(QueryPool *queryPool) {
    QueryPool *actorQueryPool = static_cast<QueryPoolAgent *>(queryPool)->getActor();

    ENQUEUE_MESSAGE_2(
        _mainMessageQueue, DeviceGetQueryPoolResults,
        actor, getActor(),
        queryPool, actorQueryPool,
        {
            actor->getQueryPoolResults(queryPool);
        });

    auto *actorQueryPoolAgent = static_cast<QueryPoolAgent *>(actorQueryPool);
    auto *queryPoolAgent = static_cast<QueryPoolAgent *>(queryPool);
    std::lock_guard<std::mutex> lock(actorQueryPoolAgent->_mutex);
    queryPoolAgent->_results = actorQueryPoolAgent->_results;
}

void DeviceAgent::enableAutoBarrier(bool en) {
    ENQUEUE_MESSAGE_2(
        _mainMessageQueue, enableAutoBarrier,
        actor, getActor(),
        en, en,
        {
            actor->enableAutoBarrier(en);
        });
}

void DeviceAgent::presentSignal() {
    _frameBoundarySemaphore.signal();
}

void DeviceAgent::presentWait() {
    MessageQueue::freeChunksInFreeQueue(_mainMessageQueue);
    _mainMessageQueue->finishWriting();
    _currentIndex = (_currentIndex + 1) % MAX_FRAME_INDEX;
    _frameBoundarySemaphore.wait();
}

void DeviceAgent::frameSync() {
    ENQUEUE_MESSAGE_1(
        _mainMessageQueue, FrameSync,
        actor, _actor,
        {
            actor->frameSync();
        });
}

SampleCount DeviceAgent::getMaxSampleCount(Format format, TextureUsage usage, TextureFlags flags) const {
    return _actor->getMaxSampleCount(format, usage, flags);
}

} // namespace gfx
} // namespace cc
