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

#pragma once

#include "base/Agent.h"
#include "base/std/container/unordered_set.h"
#include "base/threading/Semaphore.h"
#include "gfx-base/GFXDevice.h"

namespace cc {
class IXRInterface;
class MessageQueue;

namespace gfx {

class CommandBuffer;
class CommandBufferAgent;

class CC_DLL DeviceAgent final : public Agent<Device> {
public:
    static DeviceAgent *getInstance();
    static constexpr uint32_t MAX_CPU_FRAME_AHEAD = 1;
    static constexpr uint32_t MAX_FRAME_INDEX = MAX_CPU_FRAME_AHEAD + 1;

    ~DeviceAgent() override;

    using Device::copyBuffersToTexture;
    using Device::createBuffer;
    using Device::createCommandBuffer;
    using Device::createDescriptorSet;
    using Device::createDescriptorSetLayout;
    using Device::createFramebuffer;
    using Device::createGeneralBarrier;
    using Device::createInputAssembler;
    using Device::createPipelineLayout;
    using Device::createPipelineState;
    using Device::createQueryPool;
    using Device::createQueue;
    using Device::createRenderPass;
    using Device::createSampler;
    using Device::createShader;
    using Device::createTexture;
    using Device::createTextureBarrier;

    void frameSync() override;
    void acquire(Swapchain *const *swapchains, uint32_t count) override;
    void present() override;

    CommandBuffer *createCommandBuffer(const CommandBufferInfo &info, bool hasAgent) override;
    Queue *createQueue() override;
    QueryPool *createQueryPool() override;
    Swapchain *createSwapchain() override;
    Buffer *createBuffer() override;
    Texture *createTexture() override;
    Shader *createShader() override;
    InputAssembler *createInputAssembler() override;
    RenderPass *createRenderPass() override;
    Framebuffer *createFramebuffer() override;
    DescriptorSet *createDescriptorSet() override;
    DescriptorSetLayout *createDescriptorSetLayout() override;
    PipelineLayout *createPipelineLayout() override;
    PipelineState *createPipelineState() override;
    AccelerationStructure *createAccelerationStructure() override;

    Sampler *getSampler(const SamplerInfo &info) override;
    GeneralBarrier *getGeneralBarrier(const GeneralBarrierInfo &info) override;
    TextureBarrier *getTextureBarrier(const TextureBarrierInfo &info) override;
    BufferBarrier *getBufferBarrier(const BufferBarrierInfo &info) override;

    void copyBuffersToTexture(const uint8_t *const *buffers, Texture *dst, const BufferTextureCopy *regions, uint32_t count) override;
    void copyTextureToBuffers(Texture *src, uint8_t *const *buffers, const BufferTextureCopy *region, uint32_t count) override;
    void flushCommands(CommandBuffer *const *cmdBuffs, uint32_t count) override;
    void getQueryPoolResults(QueryPool *queryPool) override;
    MemoryStatus &getMemoryStatus() override { return _actor->getMemoryStatus(); }
    uint32_t getNumDrawCalls() const override { return _actor->getNumDrawCalls(); }
    uint32_t getNumInstances() const override { return _actor->getNumInstances(); }
    uint32_t getNumTris() const override { return _actor->getNumTris(); }

    uint32_t getCurrentIndex() const { return _currentIndex; }
    void setMultithreaded(bool multithreaded);

    inline MessageQueue *getMessageQueue() const { return _mainMessageQueue; }

    void presentWait();
    void presentSignal();

    void enableAutoBarrier(bool en) override;
    SampleCount getMaxSampleCount(Format format, TextureUsage usage, TextureFlags flags) const override;
protected:
    static DeviceAgent *instance;

    friend class DeviceManager;
    friend class CommandBufferAgent;

    explicit DeviceAgent(Device *device);

    bool doInit(const DeviceInfo &info) override;
    void doDestroy() override;

    bool _multithreaded{false};
    MessageQueue *_mainMessageQueue{nullptr};

    uint32_t _currentIndex = 0U;
#if CC_USE_XR
    Semaphore _frameBoundarySemaphore{0};
#else
    Semaphore _frameBoundarySemaphore{MAX_CPU_FRAME_AHEAD};
#endif

    ccstd::unordered_set<CommandBufferAgent *> _cmdBuffRefs;
    IXRInterface *_xr{nullptr};
};

} // namespace gfx
} // namespace cc
