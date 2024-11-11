/****************************************************************************
 Copyright (c) 2019-2023 Xiamen Yaji Software Co., Ltd.

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

#include "GFXAccelerationStructure.h"
#include "GFXBuffer.h"
#include "GFXCommandBuffer.h"
#include "GFXDescriptorSet.h"
#include "GFXDescriptorSetLayout.h"
#include "GFXFramebuffer.h"
#include "GFXInputAssembler.h"
#include "GFXObject.h"
#include "GFXPipelineLayout.h"
#include "GFXPipelineState.h"
#include "GFXQueryPool.h"
#include "GFXQueue.h"
#include "GFXRenderPass.h"
#include "GFXShader.h"
#include "GFXSwapchain.h"
#include "GFXTexture.h"
#include "base/RefCounted.h"
#include "base/std/container/array.h"
#include "states/GFXBufferBarrier.h"
#include "states/GFXGeneralBarrier.h"
#include "states/GFXSampler.h"
#include "states/GFXTextureBarrier.h"

namespace cc {
namespace gfx {

class CC_DLL Device : public RefCounted {
public:
    static Device *getInstance();

    ~Device() override;

    bool initialize(const DeviceInfo &info);
    void destroy();

    // aim to ensure waiting for work on gpu done when cpu encodes ahead of gpu certain frame(s).
    virtual void frameSync() = 0;

    virtual void acquire(Swapchain *const *swapchains, uint32_t count) = 0;
    virtual void present() = 0;

    virtual void flushCommands(CommandBuffer *const *cmdBuffs, uint32_t count) {}

    virtual MemoryStatus &getMemoryStatus() { return _memoryStatus; }
    virtual uint32_t getNumDrawCalls() const { return _numDrawCalls; }
    virtual uint32_t getNumInstances() const { return _numInstances; }
    virtual uint32_t getNumTris() const { return _numTriangles; }

    inline CommandBuffer *createCommandBuffer(const CommandBufferInfo &info);
    inline Queue *createQueue(const QueueInfo &info);
    inline QueryPool *createQueryPool(const QueryPoolInfo &info);
    inline Swapchain *createSwapchain(const SwapchainInfo &info);
    inline const ccstd::vector<Swapchain *> &getSwapchains() const { return _swapchains; }
    inline Buffer *createBuffer(const BufferInfo &info);
    inline Buffer *createBuffer(const BufferViewInfo &info);
    inline Texture *createTexture(const TextureInfo &info);
    inline Texture *createTexture(const TextureViewInfo &info);
    inline Shader *createShader(const ShaderInfo &info);
    inline InputAssembler *createInputAssembler(const InputAssemblerInfo &info);
    inline RenderPass *createRenderPass(const RenderPassInfo &info);
    inline Framebuffer *createFramebuffer(const FramebufferInfo &info);
    inline DescriptorSet *createDescriptorSet(const DescriptorSetInfo &info);
    inline DescriptorSetLayout *createDescriptorSetLayout(const DescriptorSetLayoutInfo &info);
    inline PipelineLayout *createPipelineLayout(const PipelineLayoutInfo &info);
    inline PipelineState *createPipelineState(const PipelineStateInfo &info);
    inline AccelerationStructure *createAccelerationStructure(const AccelerationStructureInfo &info);

    virtual Sampler *getSampler(const SamplerInfo &info);
    virtual GeneralBarrier *getGeneralBarrier(const GeneralBarrierInfo &info);
    virtual TextureBarrier *getTextureBarrier(const TextureBarrierInfo &info);
    virtual BufferBarrier *getBufferBarrier(const BufferBarrierInfo &info);

    virtual void copyBuffersToTexture(const uint8_t *const *buffers, Texture *dst, const BufferTextureCopy *regions, uint32_t count) = 0;
    virtual void copyTextureToBuffers(Texture *src, uint8_t *const *buffers, const BufferTextureCopy *region, uint32_t count) = 0;
    virtual void getQueryPoolResults(QueryPool *queryPool) = 0;

    inline void copyTextureToBuffers(Texture *src, BufferSrcList &buffers, const BufferTextureCopyList &regions);
    inline void copyBuffersToTexture(const BufferDataList &buffers, Texture *dst, const BufferTextureCopyList &regions);
    inline void flushCommands(const ccstd::vector<CommandBuffer *> &cmdBuffs);
    inline void acquire(const ccstd::vector<Swapchain *> &swapchains);

    inline Queue *getQueue() const { return _queue; }
    inline QueryPool *getQueryPool() const { return _queryPool; }
    inline CommandBuffer *getCommandBuffer() const { return _cmdBuff; }
    inline const DeviceCaps &getCapabilities() const { return _caps; }
    inline API getGfxAPI() const { return _api; }
    inline const ccstd::string &getDeviceName() const { return _deviceName; }
    inline const ccstd::string &getRenderer() const { return _renderer; }
    inline const ccstd::string &getVendor() const { return _vendor; }
    inline bool hasFeature(Feature feature) const { return _features[toNumber(feature)]; }
    inline FormatFeature getFormatFeatures(Format format) const { return _formatFeatures[toNumber(format)]; }

    inline const BindingMappingInfo &bindingMappingInfo() const { return _bindingMappingInfo; }

    // for external update operations which has to be performed on the device thread.
    // AR camera texture update, etc.
    template <typename ExecuteMethod>
    void registerOnAcquireCallback(ExecuteMethod &&execute);

    virtual void enableAutoBarrier(bool en) { _options.enableBarrierDeduce = en; }
    virtual SampleCount getMaxSampleCount(Format format, TextureUsage usage, TextureFlags flags) const {
        std::ignore = format;
        std::ignore = usage;
        std::ignore = flags;
        return SampleCount::X1;
    };

protected:
    static Device *instance;
    static bool isSupportDetachDeviceThread;

    friend class DeviceAgent;
    friend class DeviceValidator;
    friend class DeviceManager;

    Device();

    virtual bool doInit(const DeviceInfo &info) = 0;
    virtual void doDestroy() = 0;

    virtual CommandBuffer *createCommandBuffer(const CommandBufferInfo &info, bool hasAgent) = 0;
    virtual Queue *createQueue() = 0;
    virtual QueryPool *createQueryPool() = 0;
    virtual Swapchain *createSwapchain() = 0;
    virtual Buffer *createBuffer() = 0;
    virtual Texture *createTexture() = 0;
    virtual Shader *createShader() = 0;
    virtual InputAssembler *createInputAssembler() = 0;
    virtual RenderPass *createRenderPass() = 0;
    virtual Framebuffer *createFramebuffer() = 0;
    virtual DescriptorSet *createDescriptorSet() = 0;
    virtual DescriptorSetLayout *createDescriptorSetLayout() = 0;
    virtual PipelineLayout *createPipelineLayout() = 0;
    virtual PipelineState *createPipelineState() = 0;
    virtual AccelerationStructure *createAccelerationStructure() = 0;

    virtual Sampler *createSampler(const SamplerInfo &info) { return ccnew Sampler(info); }
    virtual GeneralBarrier *createGeneralBarrier(const GeneralBarrierInfo &info) { return ccnew GeneralBarrier(info); }
    virtual TextureBarrier *createTextureBarrier(const TextureBarrierInfo &info) { return ccnew TextureBarrier(info); }
    virtual BufferBarrier *createBufferBarrier(const BufferBarrierInfo &info) { return ccnew BufferBarrier(info); }

    // For context switching between threads
    virtual void bindContext(bool bound) {}

    ccstd::string _deviceName;
    ccstd::string _renderer;
    ccstd::string _vendor;
    ccstd::string _version;
    API _api{API::UNKNOWN};
    DeviceCaps _caps;
    BindingMappingInfo _bindingMappingInfo;
    DeviceOptions _options;

    bool _multithreadedCommandRecording{true};

    ccstd::array<bool, static_cast<size_t>(Feature::COUNT)> _features;
    ccstd::array<FormatFeature, static_cast<size_t>(Format::COUNT)> _formatFeatures;

    Queue *_queue{nullptr};
    QueryPool *_queryPool{nullptr};
    CommandBuffer *_cmdBuff{nullptr};
    Executable *_onAcquire{nullptr};

    uint32_t _numDrawCalls{0U};
    uint32_t _numInstances{0U};
    uint32_t _numTriangles{0U};
    MemoryStatus _memoryStatus;

    ccstd::unordered_map<SamplerInfo, Sampler *, Hasher<SamplerInfo>> _samplers;
    ccstd::unordered_map<GeneralBarrierInfo, GeneralBarrier *, Hasher<GeneralBarrierInfo>> _generalBarriers;
    ccstd::unordered_map<TextureBarrierInfo, TextureBarrier *, Hasher<TextureBarrierInfo>> _textureBarriers;
    ccstd::unordered_map<BufferBarrierInfo, BufferBarrier *, Hasher<BufferBarrierInfo>> _bufferBarriers;

private:
    ccstd::vector<Swapchain *> _swapchains; // weak reference
};

class DefaultResource {
public:
    explicit DefaultResource(Device *device);

    ~DefaultResource() = default;

    Texture *getTexture(TextureType type) const;
    Buffer *getBuffer() const;

private:
    IntrusivePtr<Texture> _texture2D;
    IntrusivePtr<Texture> _texture2DArray;
    IntrusivePtr<Texture> _textureCube;
    IntrusivePtr<Texture> _texture3D;
    IntrusivePtr<Buffer> _buffer;
};

//////////////////////////////////////////////////////////////////////////

CommandBuffer *Device::createCommandBuffer(const CommandBufferInfo &info) {
    CommandBuffer *res = createCommandBuffer(info, false);
    res->initialize(info);
    return res;
}

Queue *Device::createQueue(const QueueInfo &info) {
    Queue *res = createQueue();
    res->initialize(info);
    return res;
}

QueryPool *Device::createQueryPool(const QueryPoolInfo &info) {
    QueryPool *res = createQueryPool();
    res->initialize(info);
    return res;
}

Swapchain *Device::createSwapchain(const SwapchainInfo &info) {
    Swapchain *res = createSwapchain();
    res->initialize(info);
    _swapchains.push_back(res);
    return res;
}

Buffer *Device::createBuffer(const BufferInfo &info) {
    Buffer *res = createBuffer();
    res->initialize(info);
    return res;
}

Buffer *Device::createBuffer(const BufferViewInfo &info) {
    Buffer *res = createBuffer();
    res->initialize(info);
    return res;
}

Texture *Device::createTexture(const TextureInfo &info) {
    Texture *res = createTexture();
    res->initialize(info);
    return res;
}

Texture *Device::createTexture(const TextureViewInfo &info) {
    Texture *res = createTexture();
    res->initialize(info);
    return res;
}

Shader *Device::createShader(const ShaderInfo &info) {
    Shader *res = createShader();
    res->initialize(info);
    return res;
}

InputAssembler *Device::createInputAssembler(const InputAssemblerInfo &info) {
    InputAssembler *res = createInputAssembler();
    res->initialize(info);
    return res;
}

RenderPass *Device::createRenderPass(const RenderPassInfo &info) {
    RenderPass *res = createRenderPass();
    res->initialize(info);
    return res;
}

Framebuffer *Device::createFramebuffer(const FramebufferInfo &info) {
    Framebuffer *res = createFramebuffer();
    res->initialize(info);
    return res;
}

DescriptorSet *Device::createDescriptorSet(const DescriptorSetInfo &info) {
    DescriptorSet *res = createDescriptorSet();
    res->initialize(info);
    return res;
}

DescriptorSetLayout *Device::createDescriptorSetLayout(const DescriptorSetLayoutInfo &info) {
    DescriptorSetLayout *res = createDescriptorSetLayout();
    res->initialize(info);
    return res;
}

PipelineLayout *Device::createPipelineLayout(const PipelineLayoutInfo &info) {
    PipelineLayout *res = createPipelineLayout();
    res->initialize(info);
    return res;
}

PipelineState *Device::createPipelineState(const PipelineStateInfo &info) {
    PipelineState *res = createPipelineState();
    res->initialize(info);
    return res;
}

AccelerationStructure* Device::createAccelerationStructure(const AccelerationStructureInfo& info) {
    AccelerationStructure *res = createAccelerationStructure();
    res->initialize(info);
    return res;
}

void Device::copyBuffersToTexture(const BufferDataList &buffers, Texture *dst, const BufferTextureCopyList &regions) {
    copyBuffersToTexture(buffers.data(), dst, regions.data(), utils::toUint(regions.size()));
}

void Device::copyTextureToBuffers(Texture *src, BufferSrcList &buffers, const BufferTextureCopyList &regions) {
    copyTextureToBuffers(src, buffers.data(), regions.data(), utils::toUint(regions.size()));
}

void Device::flushCommands(const ccstd::vector<CommandBuffer *> &cmdBuffs) {
    flushCommands(cmdBuffs.data(), utils::toUint(cmdBuffs.size()));
}

void Device::acquire(const ccstd::vector<Swapchain *> &swapchains) {
    acquire(swapchains.data(), utils::toUint(swapchains.size()));
}

template <typename ExecuteMethod>
void Device::registerOnAcquireCallback(ExecuteMethod &&execute) {
    _onAcquire = ccnew CallbackExecutable<ExecuteMethod>(std::forward<ExecuteMethod>(execute));
}

} // namespace gfx
} // namespace cc
