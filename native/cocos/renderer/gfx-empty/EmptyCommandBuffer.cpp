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

#include "EmptyCommandBuffer.h"

namespace cc {
namespace gfx {

void EmptyCommandBuffer::doInit(const CommandBufferInfo &info) {
}

void EmptyCommandBuffer::doDestroy() {
}

void EmptyCommandBuffer::begin(RenderPass *renderPass, uint32_t subpass, Framebuffer *frameBuffer) {
}

void EmptyCommandBuffer::end() {
}

void EmptyCommandBuffer::beginRenderPass(RenderPass *renderPass, Framebuffer *fbo, const Rect &renderArea, const Color *colors, float depth, uint32_t stencil, CommandBuffer *const *secondaryCBs, uint32_t secondaryCBCount) {
}

void EmptyCommandBuffer::endRenderPass() {
}

void EmptyCommandBuffer::insertMarker(const MarkerInfo &marker) {
}

void EmptyCommandBuffer::beginMarker(const MarkerInfo &marker) {
}

void EmptyCommandBuffer::endMarker() {
}

void EmptyCommandBuffer::execute(CommandBuffer *const *cmdBuffs, uint32_t count) {
}

void EmptyCommandBuffer::bindPipelineState(PipelineState *pso) {
}

void EmptyCommandBuffer::bindDescriptorSet(uint32_t set, DescriptorSet *descriptorSet, uint32_t dynamicOffsetCount, const uint32_t *dynamicOffsets) {
}

void EmptyCommandBuffer::bindInputAssembler(InputAssembler *ia) {
}

void EmptyCommandBuffer::setViewport(const Viewport &vp) {
}

void EmptyCommandBuffer::setScissor(const Rect &rect) {
}

void EmptyCommandBuffer::setLineWidth(float width) {
}

void EmptyCommandBuffer::setDepthBias(float constant, float clamp, float slope) {
}

void EmptyCommandBuffer::setBlendConstants(const Color &constants) {
}

void EmptyCommandBuffer::setDepthBound(float minBounds, float maxBounds) {
}

void EmptyCommandBuffer::setStencilWriteMask(StencilFace face, uint32_t mask) {
}

void EmptyCommandBuffer::setStencilCompareMask(StencilFace face, uint32_t ref, uint32_t mask) {
}

void EmptyCommandBuffer::nextSubpass() {
}

void EmptyCommandBuffer::draw(const DrawInfo &info) {
}

void EmptyCommandBuffer::updateBuffer(Buffer *buff, const void *data, uint32_t size) {
}

void EmptyCommandBuffer::copyBuffersToTexture(const uint8_t *const *buffers, Texture *texture, const BufferTextureCopy *regions, uint32_t count) {
}

void EmptyCommandBuffer::blitTexture(Texture *srcTexture, Texture *dstTexture, const TextureBlit *regions, uint32_t count, Filter filter) {
}

void EmptyCommandBuffer::copyTexture(Texture *srcTexture, Texture *dstTexture, const TextureCopy *regions, uint32_t count) {
}

void EmptyCommandBuffer::resolveTexture(Texture *srcTexture, Texture *dstTexture, const TextureCopy *regions, uint32_t count) {
}

void EmptyCommandBuffer::dispatch(const DispatchInfo &info) {
}

void EmptyCommandBuffer::pipelineBarrier(const GeneralBarrier *barrier, const BufferBarrier *const *bufferBarriers, const Buffer *const *buffers, uint32_t bufferCount, const TextureBarrier *const *textureBarriers, const Texture *const *textures, uint32_t textureBarrierCount) {}

void EmptyCommandBuffer::beginQuery(QueryPool *queryPool, uint32_t id) {
}

void EmptyCommandBuffer::endQuery(QueryPool *queryPool, uint32_t id) {
}

void EmptyCommandBuffer::resetQueryPool(QueryPool *queryPool) {
}

void EmptyCommandBuffer::buildAccelerationStructure(AccelerationStructure* accel) {
}

void EmptyCommandBuffer::buildAccelerationStructure(AccelerationStructure* accel, Buffer* scratchBuffer) {
    
}

void EmptyCommandBuffer::updateAccelerationStructure(AccelerationStructure* accel) {
    
}

void EmptyCommandBuffer::compactAccelerationStructure(AccelerationStructure *accel, AccelerationStructure *res) {
    
}

void EmptyCommandBuffer::traceRays(const RayTracingInfo& info) {
    
}

} // namespace gfx
} // namespace cc
