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

#import <Metal/MTLBuffer.h>
#import <Metal/MTLCommandQueue.h>
#import <Metal/MTLRenderCommandEncoder.h>
#import <Metal/MTLSampler.h>
#import <QuartzCore/CAMetalLayer.h>
#include <array>
#import "../../base/Utils.h"
#import "MTLConfig.h"
#import "MTLDevice.h"
#import "MTLUtils.h"
#include "base/std/container/queue.h"

namespace cc {
namespace gfx {
class CCMTLBuffer;
class CCMTLTexture;
class CCMTLSampler;
class CCMTLShader;
class CCMTLQueue;
class CCMTLRenderPass;
class CCMTLFramebuffer;
class CCMTLInputAssembler;
class CCMTLPipelineState;
class CCMTLSemaphore;
class CCMTLCommandBuffer;

namespace {
constexpr size_t MegaBytesToBytes = 1024 * 1024;
}

constexpr size_t MAX_COLORATTACHMENTS = 16u;

struct CCMTLGPUDescriptorSetLayout {
    DescriptorSetLayoutBindingList bindings;
    ccstd::vector<uint32_t> dynamicBindings;
    ccstd::vector<uint32_t> descriptorIndices;
    ccstd::vector<uint32_t> bindingIndices;
    uint32_t descriptorCount = 0;
};
typedef ccstd::vector<CCMTLGPUDescriptorSetLayout *> MTLGPUDescriptorSetLayoutList;

struct CCMTLGPUPipelineLayout {
    MTLGPUDescriptorSetLayoutList setLayouts;
    ccstd::vector<ccstd::vector<int>> dynamicOffsetIndices;
};

struct CCMTLGPUUniformBlock {
    ccstd::string name;
    uint32_t set = INVALID_BINDING;
    uint32_t binding = INVALID_BINDING;
    uint32_t mappedBinding = INVALID_BINDING;
    ShaderStageFlags stages = ShaderStageFlagBit::NONE;
    size_t size = 0;
    uint32_t count = 0;
};

struct CCMTLGPUSamplerBlock {
    ccstd::string name;
    uint32_t set = INVALID_BINDING;
    uint32_t binding = INVALID_BINDING;
    uint32_t textureBinding = INVALID_BINDING;
    uint32_t samplerBinding = INVALID_BINDING;
    ShaderStageFlags stages = ShaderStageFlagBit::NONE;
    Type type = Type::UNKNOWN;
    uint32_t count = 0;
};

struct CCMTLGPUSubpassAttachment {
    ccstd::string name;
    uint32_t set = INVALID_BINDING;
    uint32_t binding = INVALID_BINDING;
};

struct ResourceBinding {
    uint32_t bufferBinding{0};
    uint32_t textureBinding{0};
    uint32_t samplerBinding{0};
};

struct CCMTLGPUShader {
    ccstd::unordered_map<uint32_t, CCMTLGPUUniformBlock> blocks;
    ccstd::unordered_map<uint32_t, CCMTLGPUSamplerBlock> samplers;

    ccstd::unordered_map<uint32_t, ResourceBinding> resourceBinding;

    ccstd::vector<CCMTLGPUSubpassAttachment> inputs;
    ccstd::vector<CCMTLGPUSubpassAttachment> outputs;

    std::array<uint32_t, 3> workGroupSize{0, 0, 0};

    NSString *shaderSrc = nil;
    bool specializeColor = true;

    uint32_t bufferIndex = 0;
    uint32_t samplerIndex = 0;

    std::string name;
};

struct CCMTLGPUPipelineState {
    MTLCullMode cullMode;
    MTLWinding winding;
    MTLTriangleFillMode fillMode;
    MTLDepthClipMode depthClipMode;
    MTLPrimitiveType primitiveType;
    id<MTLRenderPipelineState> mtlRenderPipelineState = nil;
    id<MTLDepthStencilState> mtlDepthStencilState = nil;
    id<MTLComputePipelineState> mtlComputePipelineState = nil;
    uint32_t stencilRefFront = 0;
    uint32_t stencilRefBack = 0;
    ccstd::vector<std::tuple<int /**vertexBufferBindingIndex*/, uint32_t /**stream*/>> vertexBufferBindingInfo;
    const CCMTLGPUPipelineLayout *gpuPipelineLayout = nullptr;
    const CCMTLGPUShader *gpuShader = nullptr;
};

struct CCMTLGPUBuffer {
    uint32_t stride = 0;
    uint32_t count = 0;
    uint32_t instanceSize = 0;
    uint32_t startOffset = 0;
    id<MTLBuffer> mtlBuffer = nil;
    uint8_t lastUpdateCycle = 0;
    uint8_t *mappedData = nullptr;
};

struct CCMTLGPUTextureObject {
    TextureInfo info;
    id<MTLTexture> mtlTexture;
};

struct CCMTLGPUTextureViewObject {
    TextureViewInfo viewInfo;
    id<MTLTexture> mtlTextureView;
};

struct CCMTLGPUInputAssembler {
    //
};

struct CCMTLGPUDescriptor {
    DescriptorType type = DescriptorType::UNKNOWN;
    CCMTLBuffer *buffer = nullptr;
    CCMTLTexture *texture = nullptr;
    CCMTLSampler *sampler = nullptr;
};
typedef ccstd::vector<CCMTLGPUDescriptor> MTLGPUDescriptorList;

struct CCMTLGPUDescriptorSet {
    MTLGPUDescriptorList gpuDescriptors;
    const ccstd::vector<uint32_t> *descriptorIndices = nullptr;
};

class CCMTLGPUStagingBufferPool final {
public:
    static constexpr uint32_t CHUNK_SIZE = 16 * 1024 * 1024; // 16M per block by default

    CCMTLGPUStagingBufferPool(id<MTLDevice> device)
    : _device(device) {}

    ~CCMTLGPUStagingBufferPool() {
        for (auto &buffer : _pool) {
            [buffer.mtlBuffer release];
            buffer.mtlBuffer = nil;
        }

        _pool.clear();
    }

    inline void alloc(CCMTLGPUBuffer *gpuBuffer) { alloc(gpuBuffer, 1); }
    void alloc(CCMTLGPUBuffer *gpuBuffer, uint32_t alignment) {
        size_t bufferCount = _pool.size();
        Buffer *buffer = nullptr;
        uint32_t offset = 0;
        for (size_t idx = 0; idx < bufferCount; idx++) {
            auto *cur = &_pool[idx];
            offset = mu::alignUp(cur->curOffset, alignment);
            if (gpuBuffer->instanceSize + offset <= [cur->mtlBuffer length]) {
                buffer = cur;
                break;
            }
        }
        if (!buffer) {
            uint32_t needs = mu::alignUp(gpuBuffer->instanceSize, MegaBytesToBytes);

            _pool.resize(bufferCount + 1);
            buffer = &_pool.back();

            buffer->mtlBuffer = [_device newBufferWithLength:needs options:MTLResourceStorageModeShared];
            buffer->mappedData = (uint8_t *)buffer->mtlBuffer.contents;
            offset = 0;
        }
        gpuBuffer->mtlBuffer = buffer->mtlBuffer;
        gpuBuffer->startOffset = offset;
        gpuBuffer->mappedData = buffer->mappedData + offset;
        buffer->curOffset = offset + gpuBuffer->instanceSize;
    }

    void reset() {
        for (auto &buffer : _pool) {
            buffer.curOffset = 0;
        }
    }

    void shrinkSize(size_t minimalSize = CHUNK_SIZE) {
        size_t reservedSize = 0;
        for (auto iter = _pool.begin(); iter != _pool.end() && _pool.size() > 1;) {
            if (reservedSize < minimalSize) {
                reservedSize += [iter->mtlBuffer length];
                ++iter;
                continue;
            }
            if (iter->curOffset == 0) {
                [iter->mtlBuffer release];
                iter = _pool.erase(iter);
            } else {
                ++iter;
            }
        }
    }

protected:
    struct Buffer {
        id<MTLBuffer> mtlBuffer = nil;
        uint8_t *mappedData = nullptr;
        uint32_t curOffset = 0;
    };

    id<MTLDevice> _device = nil;
    ccstd::vector<Buffer> _pool;
};

struct CCMTLGPUBufferImageCopy {
    NSUInteger sourceBytesPerRow = 0;
    NSUInteger sourceBytesPerImage = 0;
    MTLSize sourceSize = {0, 0, 0};
    NSUInteger destinationSlice = 0;
    NSUInteger destinationLevel = 0;
    MTLOrigin destinationOrigin = {0, 0, 0};
};

// destroy GPU resource only, delete the owner object mannually.
class CCMTLGPUGarbageCollectionPool final {
    using GCFunc = std::function<void(void)>;

    CCMTLGPUGarbageCollectionPool() = default;

public:
    static CCMTLGPUGarbageCollectionPool *getInstance() {
        static CCMTLGPUGarbageCollectionPool gcPoolSingleton;
        return &gcPoolSingleton;
    }

    void initialize(std::function<uint8_t(void)> getFrameIndex) {
        CC_ASSERT(getFrameIndex);
        _getFrameIndex = getFrameIndex;
    }

    void collect(std::function<void(void)> destroyFunc) {
        uint8_t curFrameIndex = _getFrameIndex();
        _releaseQueue[curFrameIndex].push(destroyFunc);
    }

    void clear(uint8_t currentFrameIndex) {
        CC_ASSERT_LT(currentFrameIndex, MAX_FRAMES_IN_FLIGHT);
        while (!_releaseQueue[currentFrameIndex].empty()) {
            auto &&gcFunc = _releaseQueue[currentFrameIndex].front();
            gcFunc();
            _releaseQueue[currentFrameIndex].pop();
        }
    }

    void flush() {
        for (size_t i = 0; i < MAX_FRAMES_IN_FLIGHT; i++) {
            while (!_releaseQueue[i].empty()) {
                auto &&gcFunc = _releaseQueue[i].front();
                gcFunc();
                _releaseQueue[i].pop();
            }
        }
    }

protected:
    // avoid cross-reference with CCMTLDevice
    std::function<uint8_t(void)> _getFrameIndex;
    ccstd::queue<GCFunc> _releaseQueue[MAX_FRAMES_IN_FLIGHT];
};

struct CCMTLGPUSwapChainObject {
    id<CAMetalDrawable> currentDrawable = nil;
    CAMetalLayer *mtlLayer = nullptr;
};

struct CCMTLGPUQueueObject {
    id<MTLCommandQueue> mtlCommandQueue = nil;
    uint32_t numDrawCalls = 0;
    uint32_t numInstances = 0;
    uint32_t numTriangles = 0;
};

struct CCMTLGPUCommandBufferObject {
    CCMTLRenderPass *renderPass = nullptr;
    CCMTLFramebuffer *fbo = nullptr;
    CCMTLInputAssembler *inputAssembler = nullptr;
    CCMTLPipelineState *pipelineState = nullptr;
    id<MTLCommandBuffer> mtlCommandBuffer = nil;
    bool isSecondary = false;
};

struct CCMTLGPUDeviceObject {
    CCMTLCommandBuffer *_transferCmdBuffer{nullptr};
};

struct CCMTLGPUQueryPool {
    QueryType type = QueryType::OCCLUSION;
    uint32_t maxQueryObjects = 0;
    bool forceWait = true;
    id<MTLBuffer> visibilityResultBuffer = nil;
    CCMTLSemaphore *semaphore = nullptr;
};

} // namespace gfx
} // namespace cc
