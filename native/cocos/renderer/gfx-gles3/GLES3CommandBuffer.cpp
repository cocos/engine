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

#include "GLES3Std.h"

#include "GLES3Buffer.h"
#include "GLES3CommandBuffer.h"
#include "GLES3Commands.h"
#include "GLES3DescriptorSet.h"
#include "GLES3Device.h"
#include "GLES3Framebuffer.h"
#include "GLES3InputAssembler.h"
#include "GLES3PipelineState.h"
#include "GLES3QueryPool.h"
#include "GLES3RenderPass.h"
#include "GLES3Texture.h"
#include "profiler/Profiler.h"
#include "states/GLES3GeneralBarrier.h"

namespace cc {
namespace gfx {

GLES3CommandBuffer::GLES3CommandBuffer() {
    _typedID = generateObjectID<decltype(this)>();
}

GLES3CommandBuffer::~GLES3CommandBuffer() {
    destroy();
}

void GLES3CommandBuffer::doInit(const CommandBufferInfo & /*info*/) {
    _cmdAllocator = ccnew GLES3GPUCommandAllocator;
    _curCmdPackage = ccnew GLES3CmdPackage;

    size_t setCount = GLES3Device::getInstance()->bindingMappingInfo().setIndices.size();
    _curGPUDescriptorSets.resize(setCount);
    _curDynamicOffsets.resize(setCount);
}

void GLES3CommandBuffer::doDestroy() {
    if (!_cmdAllocator) return;

    _cmdAllocator->clearCmds(_curCmdPackage);
    CC_SAFE_DELETE(_curCmdPackage);

    while (!_pendingPackages.empty()) {
        GLES3CmdPackage *package = _pendingPackages.front();
        _cmdAllocator->clearCmds(package);
        CC_SAFE_DELETE(package);
        _pendingPackages.pop();
    }

    while (!_freePackages.empty()) {
        GLES3CmdPackage *package = _freePackages.front();
        _cmdAllocator->clearCmds(package);
        CC_SAFE_DELETE(package);
        _freePackages.pop();
    }

    _cmdAllocator->reset();
    CC_SAFE_DELETE(_cmdAllocator);
}

void GLES3CommandBuffer::begin(RenderPass * /*renderPass*/, uint32_t /*subpass*/, Framebuffer * /*frameBuffer*/) {
    _curGPUPipelineState = nullptr;
    _curGPUInputAssember = nullptr;
    _curGPUDescriptorSets.assign(_curGPUDescriptorSets.size(), nullptr);

    _numDrawCalls = 0;
    _numInstances = 0;
    _numTriangles = 0;

    _cmdAllocator->clearCmds(_curCmdPackage);
}

void GLES3CommandBuffer::end() {
    if (_isStateInvalid) {
        bindStates();
    }

    _pendingPackages.push(_curCmdPackage);
    if (!_freePackages.empty()) {
        _curCmdPackage = _freePackages.front();
        _freePackages.pop();
    } else {
        _curCmdPackage = ccnew GLES3CmdPackage;
    }
}

void GLES3CommandBuffer::beginRenderPass(RenderPass *renderPass, Framebuffer *fbo, const Rect &renderArea, const Color *colors, float depth, uint32_t stencil, CommandBuffer *const * /*secondaryCBs*/, uint32_t /*secondaryCBCount*/) {
    _curSubpassIdx = 0U;

    GLES3CmdBeginRenderPass *cmd = _cmdAllocator->beginRenderPassCmdPool.alloc();
    cmd->subpassIdx = _curSubpassIdx;
    cmd->gpuRenderPass = static_cast<GLES3RenderPass *>(renderPass)->gpuRenderPass();
    cmd->gpuFBO = static_cast<GLES3Framebuffer *>(fbo)->gpuFBO();
    cmd->renderArea = renderArea;
    size_t numClearColors = cmd->gpuRenderPass->colorAttachments.size();
    memcpy(cmd->clearColors, colors, numClearColors * sizeof(Color));
    cmd->clearDepth = depth;
    cmd->clearStencil = stencil;
    _curCmdPackage->beginRenderPassCmds.push(cmd);
    _curCmdPackage->cmds.push(GLESCmdType::BEGIN_RENDER_PASS);

    _curDynamicStates.viewport = {renderArea.x, renderArea.y, renderArea.width, renderArea.height};
    _curDynamicStates.scissor = renderArea;
}

void GLES3CommandBuffer::endRenderPass() {
    _curCmdPackage->cmds.push(GLESCmdType::END_RENDER_PASS);
}

void GLES3CommandBuffer::nextSubpass() {
    _curCmdPackage->cmds.push(GLESCmdType::END_RENDER_PASS);
    GLES3CmdBeginRenderPass *cmd = _cmdAllocator->beginRenderPassCmdPool.alloc();
    cmd->subpassIdx = ++_curSubpassIdx;
    _curCmdPackage->beginRenderPassCmds.push(cmd);
    _curCmdPackage->cmds.push(GLESCmdType::BEGIN_RENDER_PASS);
}

void GLES3CommandBuffer::insertMarker(const MarkerInfo &marker) {
    std::ignore = marker;
}
void GLES3CommandBuffer::beginMarker(const MarkerInfo &marker) {
    std::ignore = marker;
}
void GLES3CommandBuffer::endMarker() {
}

void GLES3CommandBuffer::bindPipelineState(PipelineState *pso) {
    GLES3GPUPipelineState *gpuPipelineState = static_cast<GLES3PipelineState *>(pso)->gpuPipelineState();
    if (_curGPUPipelineState != gpuPipelineState) {
        _curGPUPipelineState = gpuPipelineState;
        _isStateInvalid = true;
    }
}

void GLES3CommandBuffer::bindDescriptorSet(uint32_t set, DescriptorSet *descriptorSet, uint32_t dynamicOffsetCount, const uint32_t *dynamicOffsets) {
    CC_ASSERT(_curGPUDescriptorSets.size() > set);

    GLES3GPUDescriptorSet *gpuDescriptorSet = static_cast<GLES3DescriptorSet *>(descriptorSet)->gpuDescriptorSet();
    if (_curGPUDescriptorSets[set] != gpuDescriptorSet) {
        _curGPUDescriptorSets[set] = gpuDescriptorSet;
        _isStateInvalid = true;
    }
    if (dynamicOffsetCount) {
        _curDynamicOffsets[set].assign(dynamicOffsets, dynamicOffsets + dynamicOffsetCount);
        _isStateInvalid = true;
    } else if (!_curDynamicOffsets[set].empty()) {
        _curDynamicOffsets[set].assign(_curDynamicOffsets[set].size(), 0);
        _isStateInvalid = true;
    }
}

void GLES3CommandBuffer::bindInputAssembler(InputAssembler *ia) {
    _curGPUInputAssember = static_cast<GLES3InputAssembler *>(ia)->gpuInputAssembler();
    _isStateInvalid = true;
}

void GLES3CommandBuffer::setViewport(const Viewport &vp) {
    if ((_curDynamicStates.viewport.left != vp.left) ||
        (_curDynamicStates.viewport.top != vp.top) ||
        (_curDynamicStates.viewport.width != vp.width) ||
        (_curDynamicStates.viewport.height != vp.height) ||
        math::isNotEqualF(_curDynamicStates.viewport.minDepth, vp.minDepth) ||
        math::isNotEqualF(_curDynamicStates.viewport.maxDepth, vp.maxDepth)) {
        _curDynamicStates.viewport = vp;
        _isStateInvalid = true;
    }
}

void GLES3CommandBuffer::setScissor(const Rect &rect) {
    if ((_curDynamicStates.scissor.x != rect.x) ||
        (_curDynamicStates.scissor.y != rect.y) ||
        (_curDynamicStates.scissor.width != rect.width) ||
        (_curDynamicStates.scissor.height != rect.height)) {
        _curDynamicStates.scissor = rect;
        _isStateInvalid = true;
    }
}

void GLES3CommandBuffer::setLineWidth(float width) {
    if (math::isNotEqualF(_curDynamicStates.lineWidth, width)) {
        _curDynamicStates.lineWidth = width;
        _isStateInvalid = true;
    }
}

void GLES3CommandBuffer::setDepthBias(float constant, float clamp, float slope) {
    if (math::isNotEqualF(_curDynamicStates.depthBiasConstant, constant) ||
        math::isNotEqualF(_curDynamicStates.depthBiasClamp, clamp) ||
        math::isNotEqualF(_curDynamicStates.depthBiasSlope, slope)) {
        _curDynamicStates.depthBiasConstant = constant;
        _curDynamicStates.depthBiasClamp = clamp;
        _curDynamicStates.depthBiasSlope = slope;
        _isStateInvalid = true;
    }
}

void GLES3CommandBuffer::setBlendConstants(const Color &constants) {
    if (math::isNotEqualF(_curDynamicStates.blendConstant.x, constants.x) ||
        math::isNotEqualF(_curDynamicStates.blendConstant.y, constants.y) ||
        math::isNotEqualF(_curDynamicStates.blendConstant.z, constants.z) ||
        math::isNotEqualF(_curDynamicStates.blendConstant.w, constants.w)) {
        _curDynamicStates.blendConstant.x = constants.x;
        _curDynamicStates.blendConstant.y = constants.y;
        _curDynamicStates.blendConstant.z = constants.z;
        _curDynamicStates.blendConstant.w = constants.w;
        _isStateInvalid = true;
    }
}

void GLES3CommandBuffer::setDepthBound(float minBounds, float maxBounds) {
    if (math::isNotEqualF(_curDynamicStates.depthMinBounds, minBounds) ||
        math::isNotEqualF(_curDynamicStates.depthMaxBounds, maxBounds)) {
        _curDynamicStates.depthMinBounds = minBounds;
        _curDynamicStates.depthMaxBounds = maxBounds;
        _isStateInvalid = true;
    }
}

void GLES3CommandBuffer::setStencilWriteMask(StencilFace face, uint32_t mask) {
    auto update = [&](DynamicStencilStates &stencilState) {
        if (stencilState.writeMask != mask) {
            stencilState.writeMask = mask;
            _isStateInvalid = true;
        }
    };
    if (hasFlag(face, StencilFace::FRONT)) update(_curDynamicStates.stencilStatesFront);
    if (hasFlag(face, StencilFace::BACK)) update(_curDynamicStates.stencilStatesBack);
}

void GLES3CommandBuffer::setStencilCompareMask(StencilFace face, uint32_t ref, uint32_t mask) {
    auto update = [&](DynamicStencilStates &stencilState) {
        if ((stencilState.reference != ref) ||
            (stencilState.compareMask != mask)) {
            stencilState.reference = ref;
            stencilState.compareMask = mask;
            _isStateInvalid = true;
        }
    };
    if (hasFlag(face, StencilFace::FRONT)) update(_curDynamicStates.stencilStatesFront);
    if (hasFlag(face, StencilFace::BACK)) update(_curDynamicStates.stencilStatesBack);
}

void GLES3CommandBuffer::draw(const DrawInfo &info) {
    CC_PROFILE(GLES3CommandBufferDraw);
    if (_isStateInvalid) {
        bindStates();
    }

    GLES3CmdDraw *cmd = _cmdAllocator->drawCmdPool.alloc();
    cmd->drawInfo = info;
    _curCmdPackage->drawCmds.push(cmd);
    _curCmdPackage->cmds.push(GLESCmdType::DRAW);

    ++_numDrawCalls;
    _numInstances += info.instanceCount;
    if (_curGPUPipelineState) {
        uint32_t indexCount = info.indexCount ? info.indexCount : info.vertexCount;
        switch (_curGPUPipelineState->glPrimitive) {
            case GL_TRIANGLES: {
                _numTriangles += indexCount / 3 * std::max(info.instanceCount, 1U);
                break;
            }
            case GL_TRIANGLE_STRIP:
            case GL_TRIANGLE_FAN: {
                _numTriangles += (indexCount - 2) * std::max(info.instanceCount, 1U);
                break;
            }
            default:
                break;
        }
    }
}

void GLES3CommandBuffer::updateBuffer(Buffer *buff, const void *data, uint32_t size) {
    GLES3GPUBuffer *gpuBuffer = static_cast<GLES3Buffer *>(buff)->gpuBuffer();
    if (gpuBuffer) {
        GLES3CmdUpdateBuffer *cmd = _cmdAllocator->updateBufferCmdPool.alloc();
        cmd->gpuBuffer = gpuBuffer;
        cmd->size = size;
        cmd->buffer = static_cast<const uint8_t *>(data);

        _curCmdPackage->updateBufferCmds.push(cmd);
        _curCmdPackage->cmds.push(GLESCmdType::UPDATE_BUFFER);
    }
}

void GLES3CommandBuffer::copyTexture(Texture *srcTexture, Texture *dstTexture, const TextureCopy *regions, uint32_t count) {
    // should not copy texture in a secondary command buffer
}

void GLES3CommandBuffer::resolveTexture(Texture *srcTexture, Texture *dstTexture, const TextureCopy *regions, uint32_t count) {
    // should not resolve texture in a secondary command buffer
}

void GLES3CommandBuffer::blitTexture(Texture *srcTexture, Texture *dstTexture, const TextureBlit *regions, uint32_t count, Filter filter) {
    GLES3CmdBlitTexture *cmd = _cmdAllocator->blitTextureCmdPool.alloc();
    if (srcTexture) cmd->gpuTextureSrcView = static_cast<GLES3Texture *>(srcTexture)->gpuTextureView();
    if (dstTexture) cmd->gpuTextureDstView = static_cast<GLES3Texture *>(dstTexture)->gpuTextureView();
    cmd->regions = regions;
    cmd->count = count;
    cmd->filter = filter;

    _curCmdPackage->blitTextureCmds.push(cmd);
    _curCmdPackage->cmds.push(GLESCmdType::BLIT_TEXTURE);
}

void GLES3CommandBuffer::copyBuffersToTexture(const uint8_t *const *buffers, Texture *texture, const BufferTextureCopy *regions, uint32_t count) {
    GLES3GPUTexture *gpuTexture = static_cast<GLES3Texture *>(texture)->gpuTexture();
    if (gpuTexture) {
        GLES3CmdCopyBufferToTexture *cmd = _cmdAllocator->copyBufferToTextureCmdPool.alloc();
        cmd->gpuTexture = gpuTexture;
        cmd->regions = regions;
        cmd->count = count;
        cmd->buffers = buffers;

        _curCmdPackage->copyBufferToTextureCmds.push(cmd);
        _curCmdPackage->cmds.push(GLESCmdType::COPY_BUFFER_TO_TEXTURE);
    }
}

void GLES3CommandBuffer::execute(CommandBuffer *const *cmdBuffs, uint32_t count) {
    CC_ABORT(); // Command 'execute' must be recorded in primary command buffers.

    for (uint32_t i = 0; i < count; ++i) {
        auto *cmdBuff = static_cast<GLES3CommandBuffer *>(cmdBuffs[i]);
        GLES3CmdPackage *cmdPackage = cmdBuff->_pendingPackages.front();

        for (uint32_t j = 0; j < cmdPackage->beginRenderPassCmds.size(); ++j) {
            GLES3CmdBeginRenderPass *cmd = cmdPackage->beginRenderPassCmds[j];
            ++cmd->refCount;
            _curCmdPackage->beginRenderPassCmds.push(cmd);
        }
        for (uint32_t j = 0; j < cmdPackage->bindStatesCmds.size(); ++j) {
            GLES3CmdBindStates *cmd = cmdPackage->bindStatesCmds[j];
            ++cmd->refCount;
            _curCmdPackage->bindStatesCmds.push(cmd);
        }
        for (uint32_t j = 0; j < cmdPackage->drawCmds.size(); ++j) {
            GLES3CmdDraw *cmd = cmdPackage->drawCmds[j];
            ++cmd->refCount;
            _curCmdPackage->drawCmds.push(cmd);
        }
        for (uint32_t j = 0; j < cmdPackage->dispatchCmds.size(); ++j) {
            GLES3CmdDispatch *cmd = cmdPackage->dispatchCmds[j];
            ++cmd->refCount;
            _curCmdPackage->dispatchCmds.push(cmd);
        }
        for (uint32_t j = 0; j < cmdPackage->barrierCmds.size(); ++j) {
            GLES3CmdBarrier *cmd = cmdPackage->barrierCmds[j];
            ++cmd->refCount;
            _curCmdPackage->barrierCmds.push(cmd);
        }
        for (uint32_t j = 0; j < cmdPackage->updateBufferCmds.size(); ++j) {
            GLES3CmdUpdateBuffer *cmd = cmdPackage->updateBufferCmds[j];
            ++cmd->refCount;
            _curCmdPackage->updateBufferCmds.push(cmd);
        }
        for (uint32_t j = 0; j < cmdPackage->copyBufferToTextureCmds.size(); ++j) {
            GLES3CmdCopyBufferToTexture *cmd = cmdPackage->copyBufferToTextureCmds[j];
            ++cmd->refCount;
            _curCmdPackage->copyBufferToTextureCmds.push(cmd);
        }
        for (uint32_t j = 0; j < cmdPackage->blitTextureCmds.size(); ++j) {
            GLES3CmdBlitTexture *cmd = cmdPackage->blitTextureCmds[j];
            ++cmd->refCount;
            _curCmdPackage->blitTextureCmds.push(cmd);
        }
        _curCmdPackage->cmds.concat(cmdPackage->cmds);

        _numDrawCalls += cmdBuff->_numDrawCalls;
        _numInstances += cmdBuff->_numInstances;
        _numTriangles += cmdBuff->_numTriangles;

        cmdBuff->_pendingPackages.pop();
        cmdBuff->_freePackages.push(cmdPackage);

        // current cmd allocator strategy will not work here: (but it doesn't matter anyways)
        // allocators are designed to only free the cmds they allocated
        // but here we are essentially 'transfering' the owner ship
        // cmdBuff->_cmdAllocator->clearCmds(cmdPackage);
    }
}

void GLES3CommandBuffer::bindStates() {
    GLES3CmdBindStates *cmd = _cmdAllocator->bindStatesCmdPool.alloc();
    cmd->gpuPipelineState = _curGPUPipelineState;
    cmd->gpuInputAssembler = _curGPUInputAssember;
    cmd->gpuDescriptorSets = _curGPUDescriptorSets;

    if (_curGPUPipelineState) {
        ccstd::vector<uint32_t> &dynamicOffsetOffsets = _curGPUPipelineState->gpuPipelineLayout->dynamicOffsetOffsets;
        cmd->dynamicOffsets.resize(_curGPUPipelineState->gpuPipelineLayout->dynamicOffsetCount);
        for (size_t i = 0U; i < _curDynamicOffsets.size(); i++) {
            size_t count = dynamicOffsetOffsets[i + 1] - dynamicOffsetOffsets[i];
            // CC_ASSERT(_curDynamicOffsets[i].size() >= count);
            count = std::min(count, _curDynamicOffsets[i].size());
            if (count) memcpy(&cmd->dynamicOffsets[dynamicOffsetOffsets[i]], _curDynamicOffsets[i].data(), count * sizeof(uint32_t));
        }
    }
    cmd->dynamicStates = _curDynamicStates;

    _curCmdPackage->bindStatesCmds.push(cmd);
    _curCmdPackage->cmds.push(GLESCmdType::BIND_STATES);
    _isStateInvalid = false;
}

void GLES3CommandBuffer::dispatch(const DispatchInfo &info) {
    if (_isStateInvalid) {
        bindStates();
    }

    GLES3CmdDispatch *cmd = _cmdAllocator->dispatchCmdPool.alloc();
    if (info.indirectBuffer) {
        cmd->dispatchInfo.indirectBuffer = static_cast<GLES3Buffer *>(info.indirectBuffer)->gpuBuffer();
        cmd->dispatchInfo.indirectOffset = info.indirectOffset;
    } else {
        cmd->dispatchInfo.groupCountX = info.groupCountX;
        cmd->dispatchInfo.groupCountY = info.groupCountY;
        cmd->dispatchInfo.groupCountZ = info.groupCountZ;
    }
    _curCmdPackage->dispatchCmds.push(cmd);
    _curCmdPackage->cmds.push(GLESCmdType::DISPATCH);
}

void GLES3CommandBuffer::pipelineBarrier(const GeneralBarrier *barrier, const BufferBarrier *const * /*bufferBarriers*/, const Buffer *const * /*buffers*/, uint32_t /*bufferCount*/, const TextureBarrier *const * /*textureBarriers*/, const Texture *const * /*textures*/, uint32_t /*textureBarrierCount*/) {
    if (!barrier) return;

    const auto *gpuBarrier = static_cast<const GLES3GeneralBarrier *>(barrier)->gpuBarrier();

    GLES3CmdBarrier *cmd = _cmdAllocator->barrierCmdPool.alloc();
    cmd->barriers = gpuBarrier->glBarriers;
    cmd->barriersByRegion = gpuBarrier->glBarriersByRegion;
    _curCmdPackage->barrierCmds.push(cmd);
    _curCmdPackage->cmds.push(GLESCmdType::BARRIER);
}

void GLES3CommandBuffer::beginQuery(QueryPool *queryPool, uint32_t id) {
    auto *gles3QueryPool = static_cast<GLES3QueryPool *>(queryPool);
    GLES3CmdQuery *cmd = _cmdAllocator->queryCmdPool.alloc();
    cmd->queryPool = gles3QueryPool;
    cmd->type = GLES3QueryType::BEGIN;
    cmd->id = id;

    _curCmdPackage->queryCmds.push(cmd);
    _curCmdPackage->cmds.push(GLESCmdType::QUERY);
}

void GLES3CommandBuffer::endQuery(QueryPool *queryPool, uint32_t id) {
    auto *gles3QueryPool = static_cast<GLES3QueryPool *>(queryPool);
    GLES3CmdQuery *cmd = _cmdAllocator->queryCmdPool.alloc();
    cmd->queryPool = gles3QueryPool;
    cmd->type = GLES3QueryType::END;
    cmd->id = id;

    _curCmdPackage->queryCmds.push(cmd);
    _curCmdPackage->cmds.push(GLESCmdType::QUERY);
}

void GLES3CommandBuffer::resetQueryPool(QueryPool *queryPool) {
    auto *gles3QueryPool = static_cast<GLES3QueryPool *>(queryPool);
    GLES3CmdQuery *cmd = _cmdAllocator->queryCmdPool.alloc();
    cmd->queryPool = gles3QueryPool;
    cmd->type = GLES3QueryType::RESET;
    cmd->id = 0;

    _curCmdPackage->queryCmds.push(cmd);
    _curCmdPackage->cmds.push(GLESCmdType::QUERY);
}

void GLES3CommandBuffer::getQueryPoolResults(QueryPool *queryPool) {
    auto *gles3QueryPool = static_cast<GLES3QueryPool *>(queryPool);
    GLES3CmdQuery *cmd = _cmdAllocator->queryCmdPool.alloc();
    cmd->queryPool = gles3QueryPool;
    cmd->type = GLES3QueryType::GET_RESULTS;
    cmd->id = 0;

    _curCmdPackage->queryCmds.push(cmd);
    _curCmdPackage->cmds.push(GLESCmdType::QUERY);
}

void GLES3CommandBuffer::buildAccelerationStructure(AccelerationStructure *accel){

}
void GLES3CommandBuffer::updateAccelerationStructure(AccelerationStructure *accel){

}
void GLES3CommandBuffer::compactAccelerationStructure(AccelerationStructure *accel, AccelerationStructure *res){

}

} // namespace gfx
} // namespace cc
