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

#include "base/Macros.h"
#include "base/job-system/JobSystem.h"

#include "BufferValidator.h"
#include "CommandBufferValidator.h"
#include "DescriptorSetValidator.h"
#include "DeviceValidator.h"
#include "FramebufferValidator.h"
#include "InputAssemblerValidator.h"
#include "PipelineStateValidator.h"
#include "QueryPoolValidator.h"
#include "QueueValidator.h"
#include "RenderPassValidator.h"
#include "TextureValidator.h"
#include "ValidationUtils.h"
#include "gfx-base/GFXCommandBuffer.h"

namespace cc {
namespace gfx {

CommandBufferValidator::CommandBufferValidator(CommandBuffer *actor)
: Agent<CommandBuffer>(actor) {
    _typedID = actor->getTypedID();
}

CommandBufferValidator::~CommandBufferValidator() {
    DeviceResourceTracker<CommandBuffer>::erase(this);
    CC_SAFE_DELETE(_actor);
}

void CommandBufferValidator::initValidator() {
    CC_ASSERT(!isInited());
    _inited = true;

    size_t descriptorSetCount = DeviceValidator::getInstance()->bindingMappingInfo().setIndices.size();
    _curStates.descriptorSets.resize(descriptorSetCount);
    _curStates.dynamicOffsets.resize(descriptorSetCount);
}

void CommandBufferValidator::destroyValidator() {
}

void CommandBufferValidator::doInit(const CommandBufferInfo &info) {
    initValidator();

    // Already been destroyed?
    CC_ASSERT(info.queue && static_cast<QueueValidator *>(info.queue)->isInited());

    /////////// execute ///////////

    CommandBufferInfo actorInfo = info;
    actorInfo.queue = static_cast<QueueValidator *>(info.queue)->getActor();

    _actor->initialize(actorInfo);
}

void CommandBufferValidator::doDestroy() {
    // Destroy twice?
    CC_ASSERT(isInited());
    _inited = false;

    /////////// execute ///////////

    _actor->destroy();
}

void CommandBufferValidator::begin(RenderPass *renderPass, uint32_t subpass, Framebuffer *framebuffer) {
    CC_ASSERT(isInited());
    CC_ASSERT(!renderPass || static_cast<RenderPassValidator *>(renderPass)->isInited());
    CC_ASSERT(!framebuffer || static_cast<FramebufferValidator *>(framebuffer)->isInited());

    CC_ASSERT(!_insideRenderPass);
    // Primary command buffer cannot inherit render passes.
    CC_ASSERT(_type != CommandBufferType::PRIMARY || !renderPass);

    // secondary command buffers enter the render pass right here
    _insideRenderPass = !!renderPass;
    _commandsFlushed = false;

    _recorder.clear();
    _curStates.descriptorSets.assign(_curStates.descriptorSets.size(), nullptr);

    /////////// execute ///////////

    RenderPass *renderPassActor = renderPass ? static_cast<RenderPassValidator *>(renderPass)->getActor() : nullptr;
    Framebuffer *framebufferActor = framebuffer ? static_cast<FramebufferValidator *>(framebuffer)->getActor() : nullptr;

    _actor->begin(renderPassActor, subpass, framebufferActor);
}

void CommandBufferValidator::end() {
    // Alread been destroyed?
    CC_ASSERT(isInited());

    // Still inside a render pass?
    CC_ASSERT(_type != CommandBufferType::PRIMARY || !_insideRenderPass);
    _insideRenderPass = false;

    /////////// execute ///////////

    _actor->end();
}

void CommandBufferValidator::beginRenderPass(RenderPass *renderPass, Framebuffer *fbo, const Rect &renderArea, const Color *colors, float depth, uint32_t stencil, CommandBuffer *const *secondaryCBs, uint32_t secondaryCBCount) {
    CC_ASSERT(isInited());
    CC_ASSERT(renderPass && static_cast<RenderPassValidator *>(renderPass)->isInited());
    CC_ASSERT(fbo && static_cast<FramebufferValidator *>(fbo)->isInited());

    // Command 'endRenderPass' must be recorded in primary command buffers.
    CC_ASSERT_EQ(_type, CommandBufferType::PRIMARY);
    CC_ASSERT(!_insideRenderPass);

    for (size_t i = 0; i < renderPass->getColorAttachments().size(); ++i) {
        const auto &desc = renderPass->getColorAttachments()[i];
        const auto *tex = fbo->getColorTextures()[i];
        CC_ASSERT(tex->getFormat() == desc.format);
    }
    if (fbo->getDepthStencilTexture()) {
        CC_ASSERT(fbo->getDepthStencilTexture()->getFormat() == renderPass->getDepthStencilAttachment().format);
    }

    _insideRenderPass = true;
    _curSubpass = 0U;

    _curStates.renderPass = renderPass;
    _curStates.framebuffer = fbo;
    _curStates.renderArea = renderArea;
    _curStates.clearDepth = depth;
    _curStates.clearStencil = stencil;
    size_t clearColorCount = renderPass->getColorAttachments().size();
    if (clearColorCount) {
        _curStates.clearColors.assign(colors, colors + clearColorCount);
    }

    if (DeviceValidator::getInstance()->isRecording()) {
        _recorder.recordBeginRenderPass(_curStates);
    }

    /////////// execute ///////////

    static ccstd::vector<CommandBuffer *> secondaryCBActors;
    secondaryCBActors.resize(secondaryCBCount);

    CommandBuffer **actorSecondaryCBs = nullptr;
    if (secondaryCBCount) {
        actorSecondaryCBs = secondaryCBActors.data();
        for (uint32_t i = 0; i < secondaryCBCount; ++i) {
            actorSecondaryCBs[i] = static_cast<CommandBufferValidator *>(secondaryCBs[i])->getActor();
        }
    }

    RenderPass *renderPassActor = static_cast<RenderPassValidator *>(renderPass)->getActor();
    Framebuffer *framebufferActor = static_cast<FramebufferValidator *>(fbo)->getActor();

    _actor->beginRenderPass(renderPassActor, framebufferActor, renderArea, colors, depth, stencil, actorSecondaryCBs, secondaryCBCount);
}

void CommandBufferValidator::nextSubpass() {
    CC_ASSERT(isInited());

    ++_curSubpass;

    /////////// execute ///////////

    _actor->nextSubpass();
}

void CommandBufferValidator::endRenderPass() {
    CC_ASSERT(isInited());

    // Command 'endRenderPass' must be recorded in primary command buffers.
    CC_ASSERT_EQ(_type, CommandBufferType::PRIMARY);
    CC_ASSERT(_insideRenderPass);
    _insideRenderPass = false;

    if (DeviceValidator::getInstance()->isRecording()) {
        _recorder.recordEndRenderPass();
    }

    /////////// execute ///////////

    _actor->endRenderPass();
}

void CommandBufferValidator::insertMarker(const MarkerInfo &marker) {
    _actor->insertMarker(marker);
}

void CommandBufferValidator::beginMarker(const MarkerInfo &marker) {
    _actor->beginMarker(marker);
}

void CommandBufferValidator::endMarker() {
    _actor->endMarker();
}

void CommandBufferValidator::execute(CommandBuffer *const *cmdBuffs, uint32_t count) {
    CC_ASSERT(isInited());

    if (!count) return; // be more lenient on this for now
    // Command 'execute' must be recorded in primary command buffers.
    CC_ASSERT_EQ(_type, CommandBufferType::PRIMARY);

    for (uint32_t i = 0U; i < count; ++i) {
        CC_ASSERT(cmdBuffs[i] && static_cast<CommandBufferValidator *>(cmdBuffs[i])->isInited());
    }

    /////////// execute ///////////

    static ccstd::vector<CommandBuffer *> cmdBuffActors;
    cmdBuffActors.resize(count);

    for (uint32_t i = 0U; i < count; ++i) {
        cmdBuffActors[i] = static_cast<CommandBufferValidator *>(cmdBuffs[i])->getActor();
    }

    _actor->execute(cmdBuffActors.data(), count);
}

void CommandBufferValidator::bindPipelineState(PipelineState *pso) {
    CC_ASSERT(isInited());
    CC_ASSERT(pso && static_cast<PipelineStateValidator *>(pso)->isInited());

    _curStates.pipelineState = pso;

    /////////// execute ///////////

    _actor->bindPipelineState(static_cast<PipelineStateValidator *>(pso)->getActor());
}

void CommandBufferValidator::bindDescriptorSet(uint32_t set, DescriptorSet *descriptorSet, uint32_t dynamicOffsetCount, const uint32_t *dynamicOffsets) {
    CC_ASSERT(isInited());
    CC_ASSERT(descriptorSet && static_cast<DescriptorSetValidator *>(descriptorSet)->isInited());

    CC_ASSERT(set < DeviceValidator::getInstance()->bindingMappingInfo().setIndices.size());
    // CC_ASSERT(descriptorSet->getLayout()->getDynamicBindings().size() == dynamicOffsetCount); // be more lenient on this

    _curStates.descriptorSets[set] = descriptorSet;
    _curStates.dynamicOffsets[set].assign(dynamicOffsets, dynamicOffsets + dynamicOffsetCount);

    /////////// execute ///////////

    _actor->bindDescriptorSet(set, static_cast<DescriptorSetValidator *>(descriptorSet)->getActor(), dynamicOffsetCount, dynamicOffsets);
}

void CommandBufferValidator::bindInputAssembler(InputAssembler *ia) {
    CC_ASSERT(isInited());
    CC_ASSERT(ia && static_cast<InputAssemblerValidator *>(ia)->isInited());

    _curStates.inputAssembler = ia;

    /////////// execute ///////////

    _actor->bindInputAssembler(static_cast<InputAssemblerValidator *>(ia)->getActor());
}

void CommandBufferValidator::setViewport(const Viewport &vp) {
    CC_ASSERT(isInited());

    _curStates.viewport = vp;

    /////////// execute ///////////

    _actor->setViewport(vp);
}

void CommandBufferValidator::setScissor(const Rect &rect) {
    CC_ASSERT(isInited());

    _curStates.scissor = rect;

    /////////// execute ///////////

    _actor->setScissor(rect);
}

void CommandBufferValidator::setLineWidth(float width) {
    CC_ASSERT(isInited());

    _curStates.lineWidth = width;

    /////////// execute ///////////

    _actor->setLineWidth(width);
}

void CommandBufferValidator::setDepthBias(float constant, float clamp, float slope) {
    CC_ASSERT(isInited());

    _curStates.depthBiasConstant = constant;
    _curStates.depthBiasClamp = clamp;
    _curStates.depthBiasSlope = slope;

    /////////// execute ///////////

    _actor->setDepthBias(constant, clamp, slope);
}

void CommandBufferValidator::setBlendConstants(const Color &constants) {
    CC_ASSERT(isInited());

    _curStates.blendConstant = constants;

    /////////// execute ///////////

    _actor->setBlendConstants(constants);
}

void CommandBufferValidator::setDepthBound(float minBounds, float maxBounds) {
    CC_ASSERT(isInited());

    _curStates.depthMinBounds = minBounds;
    _curStates.depthMaxBounds = maxBounds;

    /////////// execute ///////////

    _actor->setDepthBound(minBounds, maxBounds);
}

void CommandBufferValidator::setStencilWriteMask(StencilFace face, uint32_t mask) {
    CC_ASSERT(isInited());

    if (hasFlag(face, StencilFace::FRONT)) {
        _curStates.stencilStatesFront.writeMask = mask;
    }
    if (hasFlag(face, StencilFace::BACK)) {
        _curStates.stencilStatesBack.writeMask = mask;
    }

    /////////// execute ///////////

    _actor->setStencilWriteMask(face, mask);
}

void CommandBufferValidator::setStencilCompareMask(StencilFace face, uint32_t ref, uint32_t mask) {
    CC_ASSERT(isInited());

    if (hasFlag(face, StencilFace::FRONT)) {
        _curStates.stencilStatesFront.reference = ref;
        _curStates.stencilStatesFront.compareMask = mask;
    }
    if (hasFlag(face, StencilFace::BACK)) {
        _curStates.stencilStatesBack.reference = ref;
        _curStates.stencilStatesBack.compareMask = mask;
    }

    /////////// execute ///////////

    _actor->setStencilCompareMask(face, ref, mask);
}

void CommandBufferValidator::draw(const DrawInfo &info) {
    CC_ASSERT(isInited());

    // Command 'draw' must be recorded inside render passes.
    CC_ASSERT(_insideRenderPass);

    if (DeviceValidator::getInstance()->isRecording()) {
        _recorder.recordDrawcall(_curStates);
    }

    const auto &psoLayouts = _curStates.pipelineState->getPipelineLayout()->getSetLayouts();
    for (size_t i = 0; i < psoLayouts.size(); ++i) {
        if (!_curStates.descriptorSets[i]) continue; // there may be inactive sets
        const auto &dsBindings = _curStates.descriptorSets[i]->getLayout()->getBindings();
        const auto &psoBindings = psoLayouts[i]->getBindings();
        CC_ASSERT(psoBindings.size() == dsBindings.size());
    }

    /////////// execute ///////////

    _actor->draw(info);
}

void CommandBufferValidator::updateBuffer(Buffer *buff, const void *data, uint32_t size) {
    CC_ASSERT(isInited());
    CC_ASSERT(buff && static_cast<BufferValidator *>(buff)->isInited());

    // Command 'updateBuffer' must be recorded in primary command buffers.
    CC_ASSERT_EQ(_type, CommandBufferType::PRIMARY);
    // Command 'updateBuffer' must be recorded outside render passes.
    CC_ASSERT(!_insideRenderPass);

    auto *bufferValidator = static_cast<BufferValidator *>(buff);
    bufferValidator->sanityCheck(data, size);

    /////////// execute ///////////

    _actor->updateBuffer(bufferValidator->getActor(), data, size);
}

void CommandBufferValidator::copyBuffersToTexture(const uint8_t *const *buffers, Texture *texture, const BufferTextureCopy *regions, uint32_t count) {
    CC_ASSERT(isInited());
    CC_ASSERT(texture && static_cast<TextureValidator *>(texture)->isInited());

    // Command 'copyBuffersToTexture' must be recorded in primary command buffers.
    CC_ASSERT_EQ(_type, CommandBufferType::PRIMARY);
    // Command 'copyBuffersToTexture' must be recorded outside render passes.
    CC_ASSERT(!_insideRenderPass);

    auto *textureValidator = static_cast<TextureValidator *>(texture);
    textureValidator->sanityCheck();

    /////////// execute ///////////

    _actor->copyBuffersToTexture(buffers, textureValidator->getActor(), regions, count);
}

void CommandBufferValidator::resolveTexture(Texture *srcTexture, Texture *dstTexture, const TextureCopy *regions, uint32_t count) {
    CC_ASSERT(isInited());
    CC_ASSERT(srcTexture && static_cast<TextureValidator *>(srcTexture)->isInited());
    CC_ASSERT(dstTexture && static_cast<TextureValidator *>(dstTexture)->isInited());
    const auto &srcInfo = srcTexture->getInfo();
    const auto &dstInfo = dstTexture->getInfo();

    CC_ASSERT(srcInfo.format == dstInfo.format);
    CC_ASSERT(srcInfo.format != Format::DEPTH_STENCIL &&
              srcInfo.format != Format::DEPTH);

    CC_ASSERT(srcInfo.samples > SampleCount::X1 &&
              dstInfo.samples == SampleCount::X1);

    CC_ASSERT(!_insideRenderPass);

    for (uint32_t i = 0; i < count; ++i) {
        const auto &region = regions[i];
        CC_ASSERT(region.srcOffset.x + region.extent.width <= srcInfo.width);
        CC_ASSERT(region.srcOffset.y + region.extent.height <= srcInfo.height);
        CC_ASSERT(region.srcOffset.z + region.extent.depth <= srcInfo.depth);

        CC_ASSERT(region.dstOffset.x + region.extent.width <= dstInfo.width);
        CC_ASSERT(region.dstOffset.y + region.extent.height <= dstInfo.height);
        CC_ASSERT(region.dstOffset.z + region.extent.depth <= dstInfo.depth);
    }

    Texture *actorSrcTexture = nullptr;
    Texture *actorDstTexture = nullptr;
    if (srcTexture) actorSrcTexture = static_cast<TextureValidator *>(srcTexture)->getActor();
    if (dstTexture) actorDstTexture = static_cast<TextureValidator *>(dstTexture)->getActor();

    _actor->resolveTexture(actorSrcTexture, actorDstTexture, regions, count);
}

void CommandBufferValidator::copyTexture(Texture *srcTexture, Texture *dstTexture, const TextureCopy *regions, uint32_t count) {
    CC_ASSERT(isInited());
    CC_ASSERT(srcTexture && static_cast<TextureValidator *>(srcTexture)->isInited());
    CC_ASSERT(dstTexture && static_cast<TextureValidator *>(dstTexture)->isInited());
    const auto &srcInfo = srcTexture->getInfo();
    const auto &dstInfo = dstTexture->getInfo();

    CC_ASSERT(!_insideRenderPass);

    for (uint32_t i = 0; i < count; ++i) {
        const auto &region = regions[i];
        CC_ASSERT(region.srcOffset.x + region.extent.width <= srcInfo.width);
        CC_ASSERT(region.srcOffset.y + region.extent.height <= srcInfo.height);
        CC_ASSERT(region.srcOffset.z + region.extent.depth <= srcInfo.depth);

        CC_ASSERT(region.dstOffset.x + region.extent.width <= dstInfo.width);
        CC_ASSERT(region.dstOffset.y + region.extent.height <= dstInfo.height);
        CC_ASSERT(region.dstOffset.z + region.extent.depth <= dstInfo.depth);
    }

    /////////// execute ///////////

    Texture *actorSrcTexture = nullptr;
    Texture *actorDstTexture = nullptr;
    if (srcTexture) actorSrcTexture = static_cast<TextureValidator *>(srcTexture)->getActor();
    if (dstTexture) actorDstTexture = static_cast<TextureValidator *>(dstTexture)->getActor();

    _actor->copyTexture(actorSrcTexture, actorDstTexture, regions, count);
}

void CommandBufferValidator::blitTexture(Texture *srcTexture, Texture *dstTexture, const TextureBlit *regions, uint32_t count, Filter filter) {
    CC_ASSERT(isInited());
    CC_ASSERT(srcTexture && static_cast<TextureValidator *>(srcTexture)->isInited());
    CC_ASSERT(dstTexture && static_cast<TextureValidator *>(dstTexture)->isInited());
    // Blit on multisampled texture is not allowed.
    CC_ASSERT(srcTexture->getInfo().samples == SampleCount::X1);
    // blit on multisampled texture is not allowed.
    CC_ASSERT(dstTexture->getInfo().samples == SampleCount::X1);

    // Command 'blitTexture' must be recorded outside render passes.
    CC_ASSERT(!_insideRenderPass);

    for (uint32_t i = 0; i < count; ++i) {
        const auto &region = regions[i];
        CC_ASSERT(region.srcOffset.x + region.srcExtent.width <= srcTexture->getInfo().width);
        CC_ASSERT(region.srcOffset.y + region.srcExtent.height <= srcTexture->getInfo().height);
        CC_ASSERT(region.srcOffset.z + region.srcExtent.depth <= srcTexture->getInfo().depth);

        CC_ASSERT(region.dstOffset.x + region.dstExtent.width <= dstTexture->getInfo().width);
        CC_ASSERT(region.dstOffset.y + region.dstExtent.height <= dstTexture->getInfo().height);
        CC_ASSERT(region.dstOffset.z + region.dstExtent.depth <= dstTexture->getInfo().depth);
    }

    /////////// execute ///////////

    Texture *actorSrcTexture = nullptr;
    Texture *actorDstTexture = nullptr;
    if (srcTexture) actorSrcTexture = static_cast<TextureValidator *>(srcTexture)->getActor();
    if (dstTexture) actorDstTexture = static_cast<TextureValidator *>(dstTexture)->getActor();

    _actor->blitTexture(actorSrcTexture, actorDstTexture, regions, count, filter);
}

void CommandBufferValidator::dispatch(const DispatchInfo &info) {
    CC_ASSERT(isInited());

    // Command 'dispatch' must be recorded outside render passes.
    CC_ASSERT(!_insideRenderPass);

    /////////// execute ///////////

    DispatchInfo actorInfo = info;
    if (info.indirectBuffer) actorInfo.indirectBuffer = static_cast<BufferValidator *>(info.indirectBuffer)->getActor();

    _actor->dispatch(info);
}

void CommandBufferValidator::pipelineBarrier(const GeneralBarrier *barrier, const BufferBarrier *const *bufferBarriers, const Buffer *const *buffers, uint32_t bufferBarrierCount, const TextureBarrier *const *textureBarriers, const Texture *const *textures, uint32_t textureBarrierCount) {
    CC_ASSERT(isInited());

    for (uint32_t i = 0U; i < textureBarrierCount; ++i) {
        CC_ASSERT(textures[i] && static_cast<const TextureValidator *>(textures[i])->isInited());
    }

    for (uint32_t i = 0U; i < bufferBarrierCount; ++i) {
        CC_ASSERT(buffers[i] && static_cast<const BufferValidator *>(buffers[i])->isInited());
    }
    /////////// execute ///////////

    static ccstd::vector<Texture *> textureActors;
    textureActors.resize(textureBarrierCount);

    Texture **actorTextures = nullptr;
    if (textureBarrierCount) {
        actorTextures = textureActors.data();
        for (uint32_t i = 0U; i < textureBarrierCount; ++i) {
            actorTextures[i] = textures[i] ? static_cast<const TextureValidator *>(textures[i])->getActor() : nullptr;
        }
    }

    static ccstd::vector<Buffer *> bufferActors;
    bufferActors.resize(bufferBarrierCount);

    Buffer **actorBuffers = nullptr;
    if (bufferBarrierCount) {
        actorBuffers = bufferActors.data();
        for (uint32_t i = 0U; i < bufferBarrierCount; ++i) {
            actorBuffers[i] = buffers[i] ? static_cast<const BufferValidator *>(buffers[i])->getActor() : nullptr;
        }
    }

    _actor->pipelineBarrier(barrier, bufferBarriers, actorBuffers, bufferBarrierCount, textureBarriers, actorTextures, textureBarrierCount);
}

void CommandBufferValidator::beginQuery(QueryPool *queryPool, uint32_t id) {
    CC_ASSERT(isInited());
    CC_ASSERT(static_cast<QueryPoolValidator *>(queryPool)->isInited());

    QueryPool *actorQueryPool = static_cast<QueryPoolValidator *>(queryPool)->getActor();
    _actor->beginQuery(actorQueryPool, id);
}

void CommandBufferValidator::endQuery(QueryPool *queryPool, uint32_t id) {
    CC_ASSERT(isInited());
    CC_ASSERT(static_cast<QueryPoolValidator *>(queryPool)->isInited());

    QueryPool *actorQueryPool = static_cast<QueryPoolValidator *>(queryPool)->getActor();
    _actor->endQuery(actorQueryPool, id);
}

void CommandBufferValidator::resetQueryPool(QueryPool *queryPool) {
    CC_ASSERT(isInited());
    CC_ASSERT(static_cast<QueryPoolValidator *>(queryPool)->isInited());

    QueryPool *actorQueryPool = static_cast<QueryPoolValidator *>(queryPool)->getActor();
    _actor->resetQueryPool(actorQueryPool);
}

void CommandBufferValidator::completeQueryPool(QueryPool *queryPool) {
    CC_ASSERT(isInited());
    CC_ASSERT(static_cast<QueryPoolValidator *>(queryPool)->isInited());

    QueryPool *actorQueryPool = static_cast<QueryPoolValidator *>(queryPool)->getActor();
    _actor->completeQueryPool(actorQueryPool);
}
void CommandBufferValidator::customCommand(CustomCommand &&cmd) {
    _actor->customCommand(std::move(cmd));
}

void CommandBufferValidator::buildAccelerationStructure(AccelerationStructure* accel) {
    CC_ASSERT(isInited());
    //todo
}

void CommandBufferValidator::buildAccelerationStructure(AccelerationStructure *accel,Buffer* scratchBuffer) {
    CC_ASSERT(isInited());
    // todo
}

void CommandBufferValidator::updateAccelerationStructure(AccelerationStructure *accel) {
    CC_ASSERT(isInited());
    // todo
}

void CommandBufferValidator::compactAccelerationStructure(AccelerationStructure *accel, AccelerationStructure *res) {
    CC_ASSERT(isInited());
    //todo
}

void CommandBufferValidator::traceRays(const RayTracingInfo& info) {
    CC_ASSERT(isInited());
}

} // namespace gfx
} // namespace cc
