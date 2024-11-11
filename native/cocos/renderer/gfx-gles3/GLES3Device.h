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

#include "GLES3Std.h"
#include "base/std/any.h"
#include "gfx-base/GFXDevice.h"
#include "gfx-gles-common/GLESCommandPool.h"

namespace cc {
class IXRInterface;
namespace gfx {

class GLES3GPUContext;
struct GLES3GPUSwapchain;
class GLES3GPUStateCache;
class GLES3GPUFramebufferHub;
struct GLES3GPUConstantRegistry;
class GLES3GPUFramebufferCacheMap;
class GLES3PipelineCache;

class CC_GLES3_API GLES3Device final : public Device {
public:
    static GLES3Device *getInstance();

    ~GLES3Device() override;

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
    using Device::createSwapchain;
    using Device::createTexture;
    using Device::createTextureBarrier;

    void frameSync() override{};
    void acquire(Swapchain *const *swapchains, uint32_t count) override;
    void present() override;

    inline const GLESBindingMapping &bindingMappings() const { return _bindingMappings; }

    inline GLES3GPUContext *context() const { return _gpuContext; }
    inline GLES3GPUStateCache *stateCache() const { return _gpuStateCache; }
    inline GLES3GPUFramebufferHub *framebufferHub() const { return _gpuFramebufferHub; }
    inline GLES3GPUConstantRegistry *constantRegistry() const { return _gpuConstantRegistry; }
    inline GLES3GPUFramebufferCacheMap *framebufferCacheMap() const { return _gpuFramebufferCacheMap; }
    inline GLES3PipelineCache *pipelineCache() const { return _pipelineCache.get(); }

    inline bool checkExtension(const ccstd::string &extension) const {
        return std::any_of(_extensions.begin(), _extensions.end(), [&extension](auto &ext) {
            return ext.find(extension) != ccstd::string::npos;
        });
    }

    inline uint8_t *getStagingBuffer(uint32_t size = 0) {
        if (size > _stagingBufferSize) {
            CC_FREE(_stagingBuffer);
            _stagingBuffer = static_cast<uint8_t *>(CC_MALLOC(size));
            _stagingBufferSize = size;
        }

        return _stagingBuffer;
    }

    inline bool isTextureExclusive(const Format &format) const { return _textureExclusive[static_cast<size_t>(format)]; };
    SampleCount getMaxSampleCount(Format format, TextureUsage usage, TextureFlags flags) const override;
protected:
    static GLES3Device *instance;

    friend class DeviceManager;

    GLES3Device();

    bool doInit(const DeviceInfo &info) override;
    void doDestroy() override;
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

    Sampler *createSampler(const SamplerInfo &info) override;
    GeneralBarrier *createGeneralBarrier(const GeneralBarrierInfo &info) override;

    void copyBuffersToTexture(const uint8_t *const *buffers, Texture *dst, const BufferTextureCopy *regions, uint32_t count) override;
    void copyTextureToBuffers(Texture *src, uint8_t *const *buffers, const BufferTextureCopy *region, uint32_t count) override;
    void getQueryPoolResults(QueryPool *queryPool) override;

    void bindContext(bool bound) override;

    void initFormatFeature();

    GLES3GPUContext *_gpuContext{nullptr};
    GLES3GPUStateCache *_gpuStateCache{nullptr};
    GLES3GPUFramebufferHub *_gpuFramebufferHub{nullptr};
    GLES3GPUConstantRegistry *_gpuConstantRegistry{nullptr};
    GLES3GPUFramebufferCacheMap *_gpuFramebufferCacheMap{nullptr};
    std::unique_ptr<GLES3PipelineCache> _pipelineCache;

    ccstd::vector<GLES3GPUSwapchain *> _swapchains;

    GLESBindingMapping _bindingMappings;

    ccstd::vector<ccstd::string> _extensions;

    ccstd::array<bool, static_cast<size_t>(Format::COUNT)> _textureExclusive;

    uint8_t *_stagingBuffer{nullptr};
    uint32_t _stagingBufferSize{0};

    IXRInterface *_xr{nullptr};
};

} // namespace gfx
} // namespace cc
