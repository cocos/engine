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

#include "VKDevice.h"
#include "VKGPUObjects.h"

namespace cc {
namespace gfx {

class CCVKDevice;

void cmdFuncCCVKGetDeviceQueue(CCVKDevice *device, CCVKGPUQueue *gpuQueue);
void cmdFuncCCVKCreateQueryPool(CCVKDevice *device, CCVKGPUQueryPool *gpuQueryPool);
void cmdFuncCCVKCreateTexture(CCVKDevice *device, CCVKGPUTexture *gpuTexture);
void cmdFuncCCVKCreateTextureView(CCVKDevice *device, CCVKGPUTextureView *gpuTextureView);
void cmdFuncCCVKCreateSampler(CCVKDevice *device, CCVKGPUSampler *gpuSampler);
void cmdFuncCCVKCreateBuffer(CCVKDevice *device, CCVKGPUBuffer *gpuBuffer);
void cmdFuncCCVKCreateRenderPass(CCVKDevice *device, CCVKGPURenderPass *gpuRenderPass);
void cmdFuncCCVKCreateFramebuffer(CCVKDevice *device, CCVKGPUFramebuffer *gpuFramebuffer);
void cmdFuncCCVKCreateShader(CCVKDevice *device, CCVKGPUShader *gpuShader);
void cmdFuncCCVKCreateDescriptorSetLayout(CCVKDevice *device, CCVKGPUDescriptorSetLayout *gpuDescriptorSetLayout);
void cmdFuncCCVKCreatePipelineLayout(CCVKDevice *device, CCVKGPUPipelineLayout *gpuPipelineLayout);
void cmdFuncCCVKCreateGraphicsPipelineState(CCVKDevice *device, CCVKGPUPipelineState *gpuPipelineState);
void cmdFuncCCVKCreateComputePipelineState(CCVKDevice *device, CCVKGPUPipelineState *gpuPipelineState);
void cmdFuncCCVKCreateRayTracingPipelineState(CCVKDevice *device, CCVKGPUPipelineState *gpuPipelineState);
void cmdFuncCCVKCreateGeneralBarrier(CCVKDevice *device, CCVKGPUGeneralBarrier *gpuGeneralBarrier);
void cmdFuncCCVKCreateAcclerationStructure(CCVKDevice *device, CCVKGPUAccelerationStructure *gpuAccelerationStructure);

void cmdFuncCCVKUpdateBuffer(CCVKDevice *device, CCVKGPUBuffer *gpuBuffer, const void *buffer, uint32_t size, const CCVKGPUCommandBuffer *cmdBuffer = nullptr);
void cmdFuncCCVKCopyBuffersToTexture(CCVKDevice *device, const uint8_t *const *buffers, CCVKGPUTexture *gpuTexture, const BufferTextureCopy *regions, uint32_t count, const CCVKGPUCommandBuffer *gpuCommandBuffer);
void cmdFuncCCVKBuildAccelerationStructure(CCVKDevice *device, CCVKGPUAccelerationStructure *dstAccel, const CCVKGPUCommandBuffer *gpuCommandBuffer);
void cmdFuncCCVKBuildAccelerationStructure(CCVKDevice *device, CCVKGPUAccelerationStructure *dstAccel, const CCVKGPUCommandBuffer *gpuCommandBuffer,const CCVKGPUBuffer* scratchBuffer);
void cmdFuncCCVKUpdateAccelerationStructure(CCVKDevice *device, CCVKGPUAccelerationStructure *accel, const CCVKGPUCommandBuffer *gpuCommandBuffer);
void cmdFuncCCVKCompactAccelerationStructure(CCVKDevice *device, CCVKGPUAccelerationStructure *accel,CCVKGPUAccelerationStructure *res, const CCVKGPUCommandBuffer *gpuCommandBuffer);
void cmdFuncCCVKCopyTextureToBuffers(CCVKDevice *device, CCVKGPUTexture *srcTexture, CCVKGPUBufferView *destBuffer, const BufferTextureCopy *regions, uint32_t count, const CCVKGPUCommandBuffer *gpuCommandBuffer);

void cmdFuncCCVKDestroyQueryPool(CCVKGPUDevice *device, CCVKGPUQueryPool *gpuQueryPool);
void cmdFuncCCVKDestroyRenderPass(CCVKGPUDevice *device, CCVKGPURenderPass *gpuRenderPass);
void cmdFuncCCVKDestroySampler(CCVKGPUDevice *device, CCVKGPUSampler *gpuSampler);
void cmdFuncCCVKDestroyShader(CCVKGPUDevice *device, CCVKGPUShader *gpuShader);
void cmdFuncCCVKDestroyFramebuffer(CCVKGPUDevice *device, CCVKGPUFramebuffer *gpuFramebuffer);
void cmdFuncCCVKDestroyDescriptorSetLayout(CCVKGPUDevice *device, CCVKGPUDescriptorSetLayout *gpuDescriptorSetLayout);
void cmdFuncCCVKDestroyPipelineLayout(CCVKGPUDevice *device, CCVKGPUPipelineLayout *gpuPipelineLayout);
void cmdFuncCCVKDestroyPipelineState(CCVKGPUDevice *device, CCVKGPUPipelineState *gpuPipelineState);
void cmdFuncCCVKDestroyAccelerationStructure(CCVKGPUDevice *device, CCVKGPUAccelerationStructure *gpuAccelerationStructure);

void cmdFuncCCVKImageMemoryBarrier(const CCVKGPUCommandBuffer *gpuCommandBuffer, const ThsvsImageBarrier &imageBarrier);


} // namespace gfx
} // namespace cc
