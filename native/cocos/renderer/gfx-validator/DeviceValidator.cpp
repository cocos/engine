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

#include "base/Log.h"

#include "BufferValidator.h"
#include "CommandBufferValidator.h"
#include "DescriptorSetLayoutValidator.h"
#include "DescriptorSetValidator.h"
#include "DeviceValidator.h"
#include "FramebufferValidator.h"
#include "InputAssemblerValidator.h"
#include "PipelineLayoutValidator.h"
#include "PipelineStateValidator.h"
#include "QueryPoolValidator.h"
#include "QueueValidator.h"
#include "RenderPassValidator.h"
#include "ShaderValidator.h"
#include "SwapchainValidator.h"
#include "TextureValidator.h"
#include "ValidationUtils.h"

#include <algorithm>
#include <cstring>

namespace cc {
namespace gfx {

DeviceValidator *DeviceValidator::instance = nullptr;
bool DeviceValidator::allowStacktraceJS{true};

DeviceValidator *DeviceValidator::getInstance() {
    return DeviceValidator::instance;
}

DeviceValidator::DeviceValidator(Device *device) : Agent(device) {
    DeviceValidator::instance = this;
}

DeviceValidator::~DeviceValidator() {
    CC_SAFE_DELETE(_actor);
    DeviceValidator::instance = nullptr;
}

bool DeviceValidator::doInit(const DeviceInfo &info) {
    uint32_t flexibleSet{info.bindingMappingInfo.setIndices.back()};
    CC_ASSERT(!info.bindingMappingInfo.maxBlockCounts[flexibleSet]);          // Flexible set limits should be zero.
    CC_ASSERT(!info.bindingMappingInfo.maxSamplerTextureCounts[flexibleSet]); // Flexible set limits should be zero.
    CC_ASSERT(!info.bindingMappingInfo.maxSamplerCounts[flexibleSet]);        // Flexible set limits should be zero.
    CC_ASSERT(!info.bindingMappingInfo.maxTextureCounts[flexibleSet]);        // Flexible set limits should be zero.
    CC_ASSERT(!info.bindingMappingInfo.maxBufferCounts[flexibleSet]);         // Flexible set limits should be zero.
    CC_ASSERT(!info.bindingMappingInfo.maxImageCounts[flexibleSet]);          // Flexible set limits should be zero.
    CC_ASSERT(!info.bindingMappingInfo.maxSubpassInputCounts[flexibleSet]);   // Flexible set limits should be zero.

    if (!_actor->initialize(info)) {
        return false;
    }
    _api = _actor->getGfxAPI();
    _deviceName = _actor->getDeviceName();
    _queue = ccnew QueueValidator(_actor->getQueue());
    _queryPool = ccnew QueryPoolValidator(_actor->getQueryPool());
    _cmdBuff = ccnew CommandBufferValidator(_actor->getCommandBuffer());
    _renderer = _actor->getRenderer();
    _vendor = _actor->getVendor();
    _caps = _actor->_caps;
    memcpy(_features.data(), _actor->_features.data(), static_cast<uint32_t>(Feature::COUNT) * sizeof(bool));
    memcpy(_formatFeatures.data(), _actor->_formatFeatures.data(), static_cast<uint32_t>(Format::COUNT) * sizeof(FormatFeatureBit));

    static_cast<QueueValidator *>(_queue)->_inited = true;
    static_cast<QueryPoolValidator *>(_queryPool)->_inited = true;
    static_cast<CommandBufferValidator *>(_cmdBuff)->_queue = _queue;
    static_cast<CommandBufferValidator *>(_cmdBuff)->initValidator();

    DeviceResourceTracker<CommandBuffer>::push(_cmdBuff);
    DeviceResourceTracker<QueryPool>::push(_queryPool);
    DeviceResourceTracker<Queue>::push(_queue);

    CC_LOG_INFO("Device validator enabled.");

    return true;
}

void DeviceValidator::doDestroy() {
    if (_cmdBuff) {
        static_cast<CommandBufferValidator *>(_cmdBuff)->destroyValidator();
        static_cast<CommandBufferValidator *>(_cmdBuff)->_actor = nullptr;
        delete _cmdBuff;
        _cmdBuff = nullptr;
    }
    if (_queryPool) {
        static_cast<QueryPoolValidator *>(_queryPool)->_actor = nullptr;
        delete _queryPool;
        _queryPool = nullptr;
    }
    if (_queue) {
        static_cast<QueueValidator *>(_queue)->_actor = nullptr;
        delete _queue;
        _queue = nullptr;
    }

    DeviceResourceTracker<CommandBuffer>::checkEmpty();
    DeviceResourceTracker<QueryPool>::checkEmpty();
    DeviceResourceTracker<Queue>::checkEmpty();
    DeviceResourceTracker<Swapchain>::checkEmpty();
    DeviceResourceTracker<Buffer>::checkEmpty();
    DeviceResourceTracker<Texture>::checkEmpty();
    DeviceResourceTracker<Sampler>::checkEmpty();
    DeviceResourceTracker<Shader>::checkEmpty();
    DeviceResourceTracker<InputAssembler>::checkEmpty();
    DeviceResourceTracker<RenderPass>::checkEmpty();
    DeviceResourceTracker<Framebuffer>::checkEmpty();
    DeviceResourceTracker<DescriptorSet>::checkEmpty();
    DeviceResourceTracker<DescriptorSetLayout>::checkEmpty();
    DeviceResourceTracker<PipelineLayout>::checkEmpty();
    DeviceResourceTracker<PipelineState>::checkEmpty();

    _actor->destroy();
}

void DeviceValidator::acquire(Swapchain *const *swapchains, uint32_t count) {
    static ccstd::vector<Swapchain *> swapchainActors;
    swapchainActors.resize(count);

    for (uint32_t i = 0U; i < count; ++i) {
        auto *swapchain = static_cast<SwapchainValidator *>(swapchains[i]);
        swapchainActors[i] = swapchain->getActor();
    }

    if (_onAcquire) _onAcquire->execute();
    _actor->acquire(swapchainActors.data(), count);
}

void DeviceValidator::present() {
    _actor->present();

    ++_currentFrame;
}

CommandBuffer *DeviceValidator::createCommandBuffer(const CommandBufferInfo &info, bool hasAgent) {
    CommandBuffer *actor = _actor->createCommandBuffer(info, hasAgent);
    CommandBuffer *result = ccnew CommandBufferValidator(actor);
    DeviceResourceTracker<CommandBuffer>::push(result);
    return result;
}

Queue *DeviceValidator::createQueue() {
    Queue *actor = _actor->createQueue();
    Queue *result = ccnew QueueValidator(actor);
    DeviceResourceTracker<Queue>::push(result);
    return result;
}

QueryPool *DeviceValidator::createQueryPool() {
    QueryPool *actor = _actor->createQueryPool();
    QueryPool *result = ccnew QueryPoolValidator(actor);
    DeviceResourceTracker<QueryPool>::push(result);
    return result;
}

Swapchain *DeviceValidator::createSwapchain() {
    Swapchain *actor = _actor->createSwapchain();
    Swapchain *result = ccnew SwapchainValidator(actor);
    DeviceResourceTracker<Swapchain>::push(result);
    return result;
}

Buffer *DeviceValidator::createBuffer() {
    Buffer *actor = _actor->createBuffer();
    Buffer *result = ccnew BufferValidator(actor);
    DeviceResourceTracker<Buffer>::push(result);
    return result;
}

Texture *DeviceValidator::createTexture() {
    Texture *actor = _actor->createTexture();
    Texture *result = ccnew TextureValidator(actor);
    DeviceResourceTracker<Texture>::push(result);
    return result;
}

Shader *DeviceValidator::createShader() {
    Shader *actor = _actor->createShader();
    Shader *result = ccnew ShaderValidator(actor);
    DeviceResourceTracker<Shader>::push(result);
    return result;
}

InputAssembler *DeviceValidator::createInputAssembler() {
    InputAssembler *actor = _actor->createInputAssembler();
    InputAssembler *result = ccnew InputAssemblerValidator(actor);
    DeviceResourceTracker<InputAssembler>::push(result);
    return result;
}

RenderPass *DeviceValidator::createRenderPass() {
    RenderPass *actor = _actor->createRenderPass();
    RenderPass *result = ccnew RenderPassValidator(actor);
    DeviceResourceTracker<RenderPass>::push(result);
    return result;
}

Framebuffer *DeviceValidator::createFramebuffer() {
    Framebuffer *actor = _actor->createFramebuffer();
    Framebuffer *result = ccnew FramebufferValidator(actor);
    DeviceResourceTracker<Framebuffer>::push(result);
    return result;
}

DescriptorSet *DeviceValidator::createDescriptorSet() {
    DescriptorSet *actor = _actor->createDescriptorSet();
    DescriptorSet *result = ccnew DescriptorSetValidator(actor);
    DeviceResourceTracker<DescriptorSet>::push(result);
    return result;
}

DescriptorSetLayout *DeviceValidator::createDescriptorSetLayout() {
    DescriptorSetLayout *actor = _actor->createDescriptorSetLayout();
    DescriptorSetLayout *result = ccnew DescriptorSetLayoutValidator(actor);
    DeviceResourceTracker<DescriptorSetLayout>::push(result);
    return result;
}

PipelineLayout *DeviceValidator::createPipelineLayout() {
    PipelineLayout *actor = _actor->createPipelineLayout();
    PipelineLayout *result = ccnew PipelineLayoutValidator(actor);
    DeviceResourceTracker<PipelineLayout>::push(result);
    return result;
}

PipelineState *DeviceValidator::createPipelineState() {
    PipelineState *actor = _actor->createPipelineState();
    PipelineState *result = ccnew PipelineStateValidator(actor);
    DeviceResourceTracker<PipelineState>::push(result);
    return result;
}

AccelerationStructure* DeviceValidator::createAccelerationStructure() {
    //todo
    return nullptr;
}


Sampler *DeviceValidator::getSampler(const SamplerInfo &info) {
    if (info.addressU != info.addressV || info.addressV != info.addressW) {
        CC_LOG_WARNING("Samplers with different wrapping modes may case reduced performance");
    }

    /////////// execute ///////////

    return _actor->getSampler(info);
}

GeneralBarrier *DeviceValidator::getGeneralBarrier(const GeneralBarrierInfo &info) {
    /////////// execute ///////////
    return _actor->getGeneralBarrier(info);
}

TextureBarrier *DeviceValidator::getTextureBarrier(const TextureBarrierInfo &info) {
    /////////// execute ///////////
    return _actor->getTextureBarrier(info);
}

BufferBarrier *DeviceValidator::getBufferBarrier(const BufferBarrierInfo &info) {
    return _actor->getBufferBarrier(info);
}

void DeviceValidator::copyBuffersToTexture(const uint8_t *const *buffers, Texture *dst, const BufferTextureCopy *regions, uint32_t count) {
    auto *textureValidator = static_cast<TextureValidator *>(dst);
    textureValidator->sanityCheck();

    uint32_t blockWidth = formatAlignment(dst->getFormat()).first;
    uint32_t blockHeight = formatAlignment(dst->getFormat()).second;

    for (uint32_t i = 0; i < count; ++i) {
        const auto region = regions[i];
        uint32_t level = region.texSubres.mipLevel;

        uint32_t offsetX = region.texOffset.x;
        uint32_t offsetY = region.texOffset.y;
        uint32_t extentX = region.texExtent.width;
        uint32_t extentY = region.texExtent.height;
        uint32_t imgWidth = dst->getWidth() >> level;
        uint32_t imgHeight = dst->getHeight() >> level;

        CC_ASSERT(offsetX % blockWidth == 0);
        CC_ASSERT(offsetY % blockHeight == 0);

        CC_ASSERT((extentX % blockWidth == 0) || (extentX % blockWidth != 0 && offsetX + extentX == imgWidth));
        CC_ASSERT((extentY % blockHeight == 0) || (extentY % blockHeight != 0 && offsetY + extentY == imgHeight));
    }
    /////////// execute ///////////

    _actor->copyBuffersToTexture(buffers, textureValidator->getActor(), regions, count);
}

void DeviceValidator::copyTextureToBuffers(Texture *src, uint8_t *const *buffers, const BufferTextureCopy *regions, uint32_t count) {
    auto *textureValidator = static_cast<TextureValidator *>(src);

    /////////// execute ///////////

    _actor->copyTextureToBuffers(textureValidator->getActor(), buffers, regions, count);
}

void DeviceValidator::flushCommands(CommandBuffer *const *cmdBuffs, uint32_t count) {
    if (!count) return;

    /////////// execute ///////////

    static ccstd::vector<CommandBuffer *> cmdBuffActors;
    cmdBuffActors.resize(count);

    for (uint32_t i = 0U; i < count; ++i) {
        auto *cmdBuff = static_cast<CommandBufferValidator *>(cmdBuffs[i]);
        cmdBuff->_commandsFlushed = true;
        cmdBuffActors[i] = cmdBuff->getActor();
    }

    _actor->flushCommands(cmdBuffActors.data(), count);
}

void DeviceValidator::getQueryPoolResults(QueryPool *queryPool) {
    auto *actorQueryPool = static_cast<QueryPoolValidator *>(queryPool)->getActor();

    _actor->getQueryPoolResults(actorQueryPool);

    auto *actorQueryPoolValidator = static_cast<QueryPoolValidator *>(actorQueryPool);
    auto *queryPoolValidator = static_cast<QueryPoolValidator *>(queryPool);
    std::lock_guard<std::mutex> lock(actorQueryPoolValidator->_mutex);
    queryPoolValidator->_results = actorQueryPoolValidator->_results;
}

void DeviceValidator::enableAutoBarrier(bool en) {
    _actor->enableAutoBarrier(en);
}

void DeviceValidator::frameSync() {
    _actor->frameSync();
}

SampleCount DeviceValidator::getMaxSampleCount(Format format, TextureUsage usage, TextureFlags flags) const {
    return _actor->getMaxSampleCount(format, usage, flags);
}

} // namespace gfx
} // namespace cc
