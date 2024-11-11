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

#include "GFXBuffer.h"
#include "GFXInputAssembler.h"
#include "GFXObject.h"
#include "base/RefCounted.h"
#include "base/Utils.h"
#include "base/std/container/vector.h"

namespace cc {
namespace gfx {

class CC_DLL CommandBuffer : public GFXObject, public RefCounted {
public:
    CommandBuffer();
    ~CommandBuffer() override;

    void initialize(const CommandBufferInfo &info);
    void destroy();

    virtual void begin(RenderPass *renderPass, uint32_t subpass, Framebuffer *frameBuffer) = 0;
    virtual void end() = 0;
    virtual void beginRenderPass(RenderPass *renderPass, Framebuffer *fbo, const Rect &renderArea, const Color *colors, float depth, uint32_t stencil, CommandBuffer *const *secondaryCBs, uint32_t secondaryCBCount) = 0;
    virtual void endRenderPass() = 0;
    virtual void insertMarker(const MarkerInfo &marker) = 0;
    virtual void beginMarker(const MarkerInfo &marker) = 0;
    virtual void endMarker() = 0;
    virtual void bindPipelineState(PipelineState *pso) = 0;
    virtual void bindDescriptorSet(uint32_t set, DescriptorSet *descriptorSet, uint32_t dynamicOffsetCount, const uint32_t *dynamicOffsets) = 0;
    virtual void bindInputAssembler(InputAssembler *ia) = 0;
    virtual void setViewport(const Viewport &vp) = 0;
    virtual void setScissor(const Rect &rect) = 0;
    virtual void setLineWidth(float width) = 0;
    virtual void setDepthBias(float constant, float clamp, float slope) = 0;
    virtual void setBlendConstants(const Color &constants) = 0;
    virtual void setDepthBound(float minBounds, float maxBounds) = 0;
    virtual void setStencilWriteMask(StencilFace face, uint32_t mask) = 0;
    virtual void setStencilCompareMask(StencilFace face, uint32_t ref, uint32_t mask) = 0;
    virtual void nextSubpass() = 0;
    virtual void draw(const DrawInfo &info) = 0;
    virtual void updateBuffer(Buffer *buff, const void *data, uint32_t size) = 0;
    virtual void copyBuffersToTexture(const uint8_t *const *buffers, Texture *texture, const BufferTextureCopy *regions, uint32_t count) = 0;
    virtual void blitTexture(Texture *srcTexture, Texture *dstTexture, const TextureBlit *regions, uint32_t count, Filter filter) = 0;
    virtual void copyTexture(Texture *srcTexture, Texture *dstTexture, const TextureCopy *regions, uint32_t count) = 0;
    virtual void resolveTexture(Texture *srcTexture, Texture *dstTexture, const TextureCopy *regions, uint32_t count) = 0;
    virtual void execute(CommandBuffer *const *cmdBuffs, uint32_t count) = 0;
    virtual void dispatch(const DispatchInfo &info) = 0;
    virtual void beginQuery(QueryPool *queryPool, uint32_t id) = 0;
    virtual void endQuery(QueryPool *queryPool, uint32_t id) = 0;
    virtual void resetQueryPool(QueryPool *queryPool) = 0;
    virtual void completeQueryPool(QueryPool *queryPool) {}
    virtual void buildAccelerationStructure(AccelerationStructure *accel) = 0;
    virtual void buildAccelerationStructure(AccelerationStructure *accel, Buffer *scratchBuffer) = 0;
    virtual void updateAccelerationStructure(AccelerationStructure *accel) = 0;
    virtual void compactAccelerationStructure(AccelerationStructure *accel, AccelerationStructure *res) = 0;
    virtual void traceRays(const RayTracingInfo &info) = 0;

    using CustomCommand = std::function<void(void *)>;
    virtual void customCommand(CustomCommand &&cmd) {}

    // barrier: excutionBarrier
    // bufferBarriers: array of BufferBarrier*, descriptions of access of buffers
    // buffers: array of MTL/VK/GLES buffers
    // bufferBarrierCount: number of barrier, should be equal to number of buffers
    // textureBarriers: array of TextureBarrier*, descriptions of access of textures
    // textures: array of MTL/VK/GLES textures
    // textureBarrierCount: number of barrier, should be equal to number of textures
    virtual void pipelineBarrier(const GeneralBarrier *barrier, const BufferBarrier *const *bufferBarriers, const Buffer *const *buffers, uint32_t bufferBarrierCount, const TextureBarrier *const *textureBarriers, const Texture *const *textures, uint32_t textureBarrierCount) = 0;

    inline void begin();
    inline void begin(RenderPass *renderPass);
    inline void begin(RenderPass *renderPass, uint32_t subpass);

    inline void updateBuffer(Buffer *buff, const void *data);

    inline void execute(const CommandBufferList &cmdBuffs, uint32_t count);

    inline void bindDescriptorSet(uint32_t set, DescriptorSet *descriptorSet);
    inline void bindDescriptorSet(uint32_t set, DescriptorSet *descriptorSet, const ccstd::vector<uint32_t> &dynamicOffsets);

    inline void beginRenderPass(RenderPass *renderPass, Framebuffer *fbo, const Rect &renderArea, const ColorList &colors, float depth, uint32_t stencil, const CommandBufferList &secondaryCBs);
    inline void beginRenderPass(RenderPass *renderPass, Framebuffer *fbo, const Rect &renderArea, const ColorList &colors, float depth, uint32_t stencil);
    inline void beginRenderPass(RenderPass *renderPass, Framebuffer *fbo, const Rect &renderArea, const Color *colors, float depth, uint32_t stencil);

    inline void draw(InputAssembler *ia);
    inline void copyBuffersToTexture(const BufferDataList &buffers, Texture *texture, const BufferTextureCopyList &regions);

    inline void blitTexture(Texture *srcTexture, Texture *dstTexture, const TextureBlitList &regions, Filter filter);

    inline void pipelineBarrier(const GeneralBarrier *barrier);
    inline void pipelineBarrier(const GeneralBarrier *barrier, const BufferBarrierList &bufferBarriers, const BufferList &buffers, const TextureBarrierList &textureBarriers, const TextureList &textures);

    inline Queue *getQueue() const { return _queue; }
    inline CommandBufferType getType() const { return _type; }

    virtual uint32_t getNumDrawCalls() const { return _numDrawCalls; }
    virtual uint32_t getNumInstances() const { return _numInstances; }
    virtual uint32_t getNumTris() const { return _numTriangles; }

protected:
    virtual void doInit(const CommandBufferInfo &info) = 0;
    virtual void doDestroy() = 0;

    Queue *_queue = nullptr;
    CommandBufferType _type = CommandBufferType::PRIMARY;

    uint32_t _numDrawCalls = 0;
    uint32_t _numInstances = 0;
    uint32_t _numTriangles = 0;
};

//////////////////////////////////////////////////////////////////////////

void CommandBuffer::begin() {
    begin(nullptr, 0, nullptr);
}

void CommandBuffer::begin(RenderPass *renderPass) {
    begin(renderPass, 0, nullptr);
}

void CommandBuffer::begin(RenderPass *renderPass, uint32_t subpass) {
    begin(renderPass, subpass, nullptr);
}

void CommandBuffer::updateBuffer(Buffer *buff, const void *data) {
    updateBuffer(buff, data, buff->getSize());
}

void CommandBuffer::execute(const CommandBufferList &cmdBuffs, uint32_t count) {
    execute(cmdBuffs.data(), count);
}

void CommandBuffer::bindDescriptorSet(uint32_t set, DescriptorSet *descriptorSet) {
    bindDescriptorSet(set, descriptorSet, 0, nullptr);
}

void CommandBuffer::bindDescriptorSet(uint32_t set, DescriptorSet *descriptorSet, const ccstd::vector<uint32_t> &dynamicOffsets) {
    bindDescriptorSet(set, descriptorSet, utils::toUint(dynamicOffsets.size()), dynamicOffsets.data());
}

void CommandBuffer::beginRenderPass(RenderPass *renderPass, Framebuffer *fbo, const Rect &renderArea, const ColorList &colors, float depth, uint32_t stencil, const CommandBufferList &secondaryCBs) {
    beginRenderPass(renderPass, fbo, renderArea, colors.data(), depth, stencil, secondaryCBs.data(), utils::toUint(secondaryCBs.size()));
}

void CommandBuffer::beginRenderPass(RenderPass *renderPass, Framebuffer *fbo, const Rect &renderArea, const ColorList &colors, float depth, uint32_t stencil) {
    beginRenderPass(renderPass, fbo, renderArea, colors.data(), depth, stencil, nullptr, 0);
}

void CommandBuffer::beginRenderPass(RenderPass *renderPass, Framebuffer *fbo, const Rect &renderArea, const Color *colors, float depth, uint32_t stencil) {
    beginRenderPass(renderPass, fbo, renderArea, colors, depth, stencil, nullptr, 0);
}

void CommandBuffer::draw(InputAssembler *ia) {
    draw(ia->getDrawInfo());
}

void CommandBuffer::copyBuffersToTexture(const BufferDataList &buffers, Texture *texture, const BufferTextureCopyList &regions) {
    copyBuffersToTexture(buffers.data(), texture, regions.data(), utils::toUint(regions.size()));
}

void CommandBuffer::blitTexture(Texture *srcTexture, Texture *dstTexture, const TextureBlitList &regions, Filter filter) {
    blitTexture(srcTexture, dstTexture, regions.data(), utils::toUint(regions.size()), filter);
}

void CommandBuffer::pipelineBarrier(const GeneralBarrier *barrier) {
    pipelineBarrier(barrier, nullptr, nullptr, 0, nullptr, nullptr, 0U);
}

void CommandBuffer::pipelineBarrier(const GeneralBarrier *barrier, const BufferBarrierList &bufferBarriers, const BufferList &buffers, const TextureBarrierList &textureBarriers, const TextureList &textures) {
    pipelineBarrier(barrier, bufferBarriers.data(), buffers.data(), utils::toUint(bufferBarriers.size()), textureBarriers.data(), textures.data(), utils::toUint(textureBarriers.size()));
}

} // namespace gfx
} // namespace cc
