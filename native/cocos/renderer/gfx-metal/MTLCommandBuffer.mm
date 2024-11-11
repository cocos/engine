/****************************************************************************
 Copyright (c) 2019-2022 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
 worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
 not use Cocos Creator software for developing other software or tools that's
 used for developing games. You are not granted to publish, distribute,
 sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
****************************************************************************/

#import <MetalPerformanceShaders/MetalPerformanceShaders.h>
#import <QuartzCore/CAMetalLayer.h>
#import "MTLBuffer.h"
#import "MTLCommandBuffer.h"
#import "MTLDescriptorSet.h"
#import "MTLDevice.h"
#import "MTLFramebuffer.h"
#import "MTLInputAssembler.h"
#import "MTLPipelineState.h"
#import "MTLQueryPool.h"
#import "MTLQueue.h"
#import "MTLRenderPass.h"
#import "MTLSampler.h"
#import "MTLSemaphore.h"
#import "MTLSwapchain.h"
#import "MTLTexture.h"
#import "MTLShader.h"
#import "TargetConditionals.h"
#import "profiler/Profiler.h"
#import "base/Log.h"

namespace cc {
namespace gfx {
CCMTLCommandBuffer::CCMTLCommandBuffer()
: CommandBuffer(),
  _mtlDevice(CCMTLDevice::getInstance()) {
    _typedID = generateObjectID<decltype(this)>();
    _mtlCommandQueue = id<MTLCommandQueue>(_mtlDevice->getMTLCommandQueue());
    _indirectDrawSuppotred = _mtlDevice->isIndirectDrawSupported();

    const auto setCount = _mtlDevice->bindingMappingInfo().setIndices.size();
    _GPUDescriptorSets.resize(setCount);
    _dynamicOffsets.resize(setCount);
    _indirectDrawSuppotred = _mtlDevice->isIndirectDrawSupported();
}

CCMTLCommandBuffer::~CCMTLCommandBuffer() {
    destroy();
}

void CCMTLCommandBuffer::doInit(const CommandBufferInfo &info) {
    _gpuCommandBufferObj = ccnew CCMTLGPUCommandBufferObject;
    constexpr uint8_t backBufferCount = MAX_FRAMES_IN_FLIGHT;
    _inFlightSem = ccnew CCMTLSemaphore(backBufferCount);
}

void CCMTLCommandBuffer::doDestroy() {
    CC_SAFE_DELETE(_texCopySemaphore);

    if(_inFlightSem) {
        _inFlightSem->syncAll();
        CC_SAFE_DELETE(_inFlightSem);
    }

    if (_commandBufferBegan) {
        if (_gpuCommandBufferObj && _gpuCommandBufferObj->mtlCommandBuffer) {
            [_gpuCommandBufferObj->mtlCommandBuffer commit];
            [_gpuCommandBufferObj->mtlCommandBuffer release];
        }
        _commandBufferBegan = false;
    }

    _GPUDescriptorSets.clear();
    _dynamicOffsets.clear();
    _firstDirtyDescriptorSet = UINT_MAX;
    _indirectDrawSuppotred = false;
    _mtlDevice = nullptr;
    _mtlCommandQueue = nil;
    _parallelEncoder = nil;

    CC_SAFE_DELETE(_gpuCommandBufferObj);
}

bool CCMTLCommandBuffer::isRenderingEntireDrawable(const Rect &rect, const CCMTLFramebuffer *fbo) {
    const auto &colors = fbo->getColorTextures();
    const auto &depthStencil = fbo->getDepthStencilTexture();
    bool res = true;
    for (size_t i = 0; i < fbo->getColorTextures().size(); ++i) {
        if (!(rect.x == 0 && rect.y == 0 && rect.width == colors[i]->getWidth() && rect.height == colors[i]->getHeight())) {
            res = false;
        }
    }
    if(depthStencil) {
        if (!(rect.x == 0 && rect.y == 0 && rect.width == depthStencil->getWidth() && rect.height == depthStencil->getHeight())) {
            res = false;
        }
    }
    return res;
}

id<MTLCommandBuffer> CCMTLCommandBuffer::getMTLCommandBuffer() {
    if (!_gpuCommandBufferObj->mtlCommandBuffer) {
        auto *mtlQueue = static_cast<CCMTLQueue *>(_queue)->gpuQueueObj()->mtlCommandQueue;
        // command buffer from device may keep alive between frames,
        // to get along with NSLoop in UIApplication, retain it.
        _gpuCommandBufferObj->mtlCommandBuffer = [[mtlQueue commandBuffer] retain];
        [_gpuCommandBufferObj->mtlCommandBuffer enqueue];
    }
    return _gpuCommandBufferObj->mtlCommandBuffer;
}

void CCMTLCommandBuffer::begin(RenderPass *renderPass, uint32_t subpass, Framebuffer *frameBuffer) {
    if (_commandBufferBegan) {
        return;
    }

    _numTriangles = 0;
    _numDrawCalls = 0;
    _numInstances = 0;

    _GPUDescriptorSets.assign(_GPUDescriptorSets.size(), nullptr);
    for (auto &dynamicOffset : _dynamicOffsets) {
        dynamicOffset.clear();
    }
    _firstDirtyDescriptorSet = UINT_MAX;
    _commandBufferBegan = true;
    _firstRenderPass = true;

    _colorAppearedBefore.reset();
}

void CCMTLCommandBuffer::end() {
    if (!_commandBufferBegan) {
        return;
    }

    _commandBufferBegan = false;

    if (_gpuCommandBufferObj->isSecondary) {
        // Secondary command buffer should end encoding here
        _renderEncoder.endEncoding();
    }
}

void CCMTLCommandBuffer::beginRenderPass(RenderPass *renderPass, Framebuffer *fbo, const Rect &renderArea, const Color *colors, float depth, uint32_t stencil, CommandBuffer *const *secondaryCBs, uint32_t secondaryCBCount) {
    // Sub CommandBuffer shouldn't call begin render pass
    if (_gpuCommandBufferObj->isSecondary) {
        return;
    }

    _gpuCommandBufferObj->renderPass = static_cast<CCMTLRenderPass *>(renderPass);
    _gpuCommandBufferObj->fbo = static_cast<CCMTLFramebuffer *>(fbo);

    auto *ccMtlRenderPass = static_cast<CCMTLRenderPass *>(renderPass);
    auto isOffscreen = _gpuCommandBufferObj->fbo->isOffscreen();
    const SubpassInfoList &subpasses = renderPass->getSubpasses();
    const ColorAttachmentList &colorAttachments = renderPass->getColorAttachments();

    MTLRenderPassDescriptor *mtlRenderPassDescriptor = static_cast<CCMTLRenderPass *>(renderPass)->getMTLRenderPassDescriptor();
    const TextureList &colorTextures = fbo->getColorTextures();
    Texture *dsTexture = fbo->getDepthStencilTexture();
    auto *swapchain = static_cast<CCMTLSwapchain *>(_gpuCommandBufferObj->fbo->swapChain());

    // if not rendering to full framebuffer(eg. left top area), draw a quad to pretend viewport clear.
    bool renderingFullFramebuffer = isRenderingEntireDrawable(renderArea, static_cast<CCMTLFramebuffer *>(fbo));
    bool needPartialClear = false;
    if (subpasses.empty()) {
        if (dsTexture) {
            auto *ccMtlTexture = static_cast<CCMTLTexture *>(dsTexture);
            ccMtlRenderPass->setDepthStencilAttachment(ccMtlTexture, 0);
        } else {
            const DepthStencilAttachment &dsa = renderPass->getDepthStencilAttachment();
            if (dsa.format != Format::UNKNOWN) {
                ccMtlRenderPass->setDepthStencilAttachment(swapchain->depthStencilTexture(), 0);
            }
        }

        if (colorAttachments.empty()) {
            if(swapchain) {
                ccMtlRenderPass->setColorAttachment(0, swapchain->colorTexture(), 0);
            }
        } else {
            for (size_t i = 0; i < colorAttachments.size(); ++i) {
                auto *ccMtlTexture = static_cast<CCMTLTexture *>(colorTextures[i]);
                ccMtlRenderPass->setColorAttachment(i, ccMtlTexture, 0);
                mtlRenderPassDescriptor.colorAttachments[i].clearColor = mu::toMTLClearColor(colors[i]);
                if (!renderingFullFramebuffer) {
                    if (!_colorAppearedBefore[i]) {
                        mtlRenderPassDescriptor.colorAttachments[i].loadAction = mu::toMTLLoadAction(colorAttachments[i].loadOp);
                    } else {
                        mtlRenderPassDescriptor.colorAttachments[i].loadAction = MTLLoadActionLoad;
                        needPartialClear = colorAttachments[i].loadOp == LoadOp::CLEAR;
                    }
                } else {
                    mtlRenderPassDescriptor.colorAttachments[i].loadAction = mu::toMTLLoadAction(colorAttachments[i].loadOp);
                }
                _colorAppearedBefore.set(i);
                mtlRenderPassDescriptor.colorAttachments[i].storeAction = mu::isFramebufferFetchSupported() ? mu::toMTLStoreAction(colorAttachments[i].storeOp) : MTLStoreActionStore;
            }
        }
    } else {
        // TODO: cache state.
        ccstd::vector<bool> visited(colorAttachments.size(), false);
        for (size_t i = 0; i < subpasses.size(); ++i) {
            for (size_t j = 0; j < subpasses[i].inputs.size(); ++j) {
                uint32_t input = subpasses[i].inputs[j];
                if(input >= colorAttachments.size() ||
                   colorAttachments[input].format == Format::DEPTH_STENCIL ||
                   colorAttachments[input].format == Format::DEPTH) {
                    continue; // depthStencil as input
                }
                if (visited[input])
                    continue;

                auto *ccMtlTexture = static_cast<CCMTLTexture *>(colorTextures[input]);
                ccMtlRenderPass->setColorAttachment(input, ccMtlTexture, 0);
                mtlRenderPassDescriptor.colorAttachments[input].clearColor = mu::toMTLClearColor(colors[input]);
                mtlRenderPassDescriptor.colorAttachments[input].loadAction = mu::toMTLLoadAction(colorAttachments[input].loadOp);
                mtlRenderPassDescriptor.colorAttachments[input].storeAction = mu::isFramebufferFetchSupported() ? mu::toMTLStoreAction(colorAttachments[input].storeOp) : MTLStoreActionStore;
                visited[input] = true;
            }
            for (size_t j = 0; j < subpasses[i].colors.size(); ++j) {
                uint32_t color = subpasses[i].colors[j];
                if(color >= colorAttachments.size()) {
                    continue; // depthStencil as output
                }
                if (!subpasses[i].resolves.empty() && subpasses[i].resolves[j] != INVALID_BINDING) {
                    uint32_t resolve = subpasses[i].resolves[j];
                    auto *resolveTex = static_cast<CCMTLTexture *>(colorTextures[resolve]);
                    mtlRenderPassDescriptor.colorAttachments[color].resolveTexture = resolveTex->getMTLTexture();
                    mtlRenderPassDescriptor.colorAttachments[color].resolveLevel = 0;
                    mtlRenderPassDescriptor.colorAttachments[color].resolveSlice = 0;
                    mtlRenderPassDescriptor.colorAttachments[color].resolveDepthPlane = 0;
                    mtlRenderPassDescriptor.colorAttachments[color].storeAction = MTLStoreActionMultisampleResolve;
                } else {
                    mtlRenderPassDescriptor.colorAttachments[color].storeAction = mu::isFramebufferFetchSupported() ? mu::toMTLStoreAction(colorAttachments[color].storeOp) : MTLStoreActionStore;
                }
                if (visited[color])
                    continue;
                auto *ccMtlTexture = static_cast<CCMTLTexture *>(colorTextures[color]);
                ccMtlRenderPass->setColorAttachment(color, ccMtlTexture, 0);
                mtlRenderPassDescriptor.colorAttachments[color].clearColor = mu::toMTLClearColor(colors[color]);
                if (!renderingFullFramebuffer) {
                    if (!_colorAppearedBefore[color]) {
                        mtlRenderPassDescriptor.colorAttachments[color].loadAction = mu::toMTLLoadAction(colorAttachments[color].loadOp);
                    } else {
                        mtlRenderPassDescriptor.colorAttachments[color].loadAction = MTLLoadActionLoad;
                        needPartialClear = colorAttachments[color].loadOp == LoadOp::CLEAR;
                    }
                } else {
                    mtlRenderPassDescriptor.colorAttachments[color].loadAction = mu::toMTLLoadAction(colorAttachments[color].loadOp);
                }
                visited[color] = true;
                _colorAppearedBefore.set(color);
            }
        }
        updateDepthStencilState(ccMtlRenderPass->getCurrentSubpassIndex(), mtlRenderPassDescriptor);
    }

    mtlRenderPassDescriptor.depthAttachment.clearDepth = clampf(depth, 0.0F, 1.0F);
    mtlRenderPassDescriptor.stencilAttachment.clearStencil = stencil;

    auto *queryPool = static_cast<CCMTLQueryPool *>(_mtlDevice->getQueryPool());
    mtlRenderPassDescriptor.visibilityResultBuffer = _mtlDevice->getCapabilities().supportQuery ? queryPool->gpuQueryPool()->visibilityResultBuffer : nil;

    id<MTLCommandBuffer> mtlCommandBuffer = getMTLCommandBuffer();
    if (secondaryCBCount > 0) {
        _parallelEncoder = [[mtlCommandBuffer parallelRenderCommandEncoderWithDescriptor:mtlRenderPassDescriptor] retain];
        // Create command encoders from parallel encoder and assign to command buffers
        for (uint32_t i = 0u; i < secondaryCBCount; ++i) {
            CCMTLCommandBuffer *cmdBuff = (CCMTLCommandBuffer *)secondaryCBs[i];
            cmdBuff->_renderEncoder.initialize(_parallelEncoder);
            cmdBuff->_gpuCommandBufferObj->mtlCommandBuffer = mtlCommandBuffer;
            cmdBuff->_gpuCommandBufferObj->isSecondary = true;
        }
    } else {
        _renderEncoder.initialize(mtlCommandBuffer, mtlRenderPassDescriptor);
        //[_renderEncoder.getMTLEncoder() memoryBarrierWithScope:MTLBarrierScopeTextures afterStages:MTLRenderStageFragment beforeStages:MTLRenderStageFragment];
    }

    if (!renderingFullFramebuffer && needPartialClear) {
        //Metal doesn't apply the viewports and scissors to renderpass load-action clearing.
        mu::clearRenderArea(_mtlDevice, _renderEncoder.getMTLEncoder(), renderPass, renderArea, colors, depth, stencil);
    }

    const auto &targetSize = ccMtlRenderPass->getRenderTargetSizes().at(0);
    _currentFbWidth = static_cast<int32_t>(targetSize.x);
    _currentFbHeight = static_cast<int32_t>(targetSize.y);
    Rect scissorArea = renderArea;
    CC_ASSERT(_currentFbWidth != 0 && _currentFbWidth >= scissorArea.x);
    CC_ASSERT(_currentFbHeight != 0 && _currentFbHeight >= scissorArea.y);

    int32_t w = MIN(static_cast<int32_t>(scissorArea.width), _currentFbWidth - scissorArea.x);
    int32_t h = MIN(static_cast<int32_t>(scissorArea.height), _currentFbHeight - scissorArea.y);

    scissorArea.width = static_cast<uint32_t>(MAX(w, 0));
    scissorArea.height = static_cast<uint32_t>(MAX(h, 0));

    _renderEncoder.setViewport(scissorArea);
    _renderEncoder.setScissor(scissorArea);

    if (_firstRenderPass) {
        _firstRenderPass = false;
    }
}

void CCMTLCommandBuffer::endRenderPass() {
    if (_parallelEncoder) {
        [_parallelEncoder endEncoding];
        [_parallelEncoder release];
        _parallelEncoder = nil;
    } else {
        _renderEncoder.endEncoding();
    }
    _currentFbWidth = 0;
    _currentFbHeight = 0;
    _gpuCommandBufferObj->renderPass->reset();
}

void CCMTLCommandBuffer::insertMarker(const MarkerInfo &marker) {
}
void CCMTLCommandBuffer::beginMarker(const MarkerInfo &marker) {
}
void CCMTLCommandBuffer::endMarker() {
}

void CCMTLCommandBuffer::afterCommit() {
    _gpuCommandBufferObj->renderPass = nullptr;
    _gpuCommandBufferObj->fbo = nullptr;
    _gpuCommandBufferObj->inputAssembler = nullptr;
    _gpuCommandBufferObj->pipelineState = nullptr;
    if(_gpuCommandBufferObj->mtlCommandBuffer) {
        [_gpuCommandBufferObj->mtlCommandBuffer release];
        _gpuCommandBufferObj->mtlCommandBuffer = nil;
    }
    _inFlightSem->wait();
}

void CCMTLCommandBuffer::updateDepthStencilState(uint32_t index, MTLRenderPassDescriptor *descriptor) {
    CCMTLRenderPass *curRenderPass = _gpuCommandBufferObj->renderPass;
    CCMTLFramebuffer *curFBO = _gpuCommandBufferObj->fbo;
    const SubpassInfoList &subpasses = curRenderPass->getSubpasses();

    const DepthStencilAttachment &dsAttachment = curRenderPass->getDepthStencilAttachment();
    const SubpassInfo &subpass = subpasses[index];
    uint32_t ds = subpass.depthStencil;

    if (ds != INVALID_BINDING) {
        auto *ccMTLTexture = static_cast<CCMTLTexture *>(curFBO->getDepthStencilTexture());
        // if ds is provided explicitly in fbo->depthStencil, use it.
        const TextureList &colorTextures = curFBO->getColorTextures();
        if (ds >= colorTextures.size()) {
            auto *ccMTLTexture = static_cast<CCMTLTexture *>(curFBO->getDepthStencilTexture());
            descriptor.depthAttachment.texture = ccMTLTexture->getMTLTexture();
            if (ccMTLTexture->getFormat() == Format::DEPTH_STENCIL) {
                descriptor.stencilAttachment.texture = ccMTLTexture->getMTLTexture();
            }
        } else {
            auto *ccMTLTexture = static_cast<CCMTLTexture *>(colorTextures[ds]);
            descriptor.depthAttachment.texture = ccMTLTexture->getMTLTexture();
            if (ccMTLTexture->getFormat() == Format::DEPTH_STENCIL)
                descriptor.stencilAttachment.texture = ccMTLTexture->getMTLTexture();
        }

        //the first and last time using depth buffer are affected respectively by load and store op.
        //loadop
        if (index == 0) {
            descriptor.depthAttachment.loadAction = dsAttachment.depthLoadOp == LoadOp::LOAD ? MTLLoadActionLoad : MTLLoadActionClear;
            descriptor.stencilAttachment.loadAction = dsAttachment.stencilLoadOp == LoadOp::LOAD ? MTLLoadActionLoad : MTLLoadActionClear;
        } else {
            descriptor.depthAttachment.loadAction = MTLLoadActionLoad;
            descriptor.stencilAttachment.loadAction = MTLLoadActionLoad;
        }
        //storeop
        if (index == subpasses.size() - 1) {
            descriptor.depthAttachment.storeAction = dsAttachment.depthStoreOp == StoreOp::STORE ? MTLStoreActionStore : MTLStoreActionDontCare;
            descriptor.stencilAttachment.storeAction = dsAttachment.stencilStoreOp == StoreOp::STORE ? MTLStoreActionStore : MTLStoreActionDontCare;
        } else {
            descriptor.depthAttachment.storeAction = MTLStoreActionStore;
            descriptor.stencilAttachment.storeAction = MTLStoreActionStore;
        }

        if (subpass.depthStencilResolve != INVALID_BINDING) {
            descriptor.depthAttachment.resolveTexture = static_cast<CCMTLTexture *>(curFBO->getDepthStencilResolveTexture())->getMTLTexture();
            descriptor.depthAttachment.resolveLevel = 0;
            descriptor.depthAttachment.resolveSlice = 0;
            descriptor.depthAttachment.resolveDepthPlane = 0;
            descriptor.depthAttachment.storeAction = subpass.depthResolveMode == ResolveMode::NONE ? MTLStoreActionMultisampleResolve : MTLStoreActionStoreAndMultisampleResolve;

            descriptor.stencilAttachment.resolveTexture = static_cast<CCMTLTexture *>(curFBO->getDepthStencilResolveTexture())->getMTLTexture();
            descriptor.stencilAttachment.resolveLevel = 0;
            descriptor.stencilAttachment.resolveSlice = 0;
            descriptor.stencilAttachment.resolveDepthPlane = 0;
            descriptor.stencilAttachment.storeAction = subpass.stencilResolveMode == ResolveMode::NONE ? MTLStoreActionMultisampleResolve : MTLStoreActionStoreAndMultisampleResolve;

            descriptor.depthAttachment.depthResolveFilter = mu::toMTLDepthResolveMode(subpass.depthResolveMode);
            if (@available(iOS 12.0, *)) {
                descriptor.stencilAttachment.stencilResolveFilter = mu::toMTLStencilResolveMode(subpass.stencilResolveMode);
            }

            if (index == subpasses.size() - 1) {
                descriptor.depthAttachment.storeAction = dsAttachment.depthStoreOp == StoreOp::STORE ? MTLStoreActionStoreAndMultisampleResolve : MTLStoreActionMultisampleResolve;
                descriptor.stencilAttachment.storeAction = dsAttachment.stencilStoreOp == StoreOp::STORE ? MTLStoreActionStoreAndMultisampleResolve : MTLStoreActionMultisampleResolve;
            } else {
                descriptor.depthAttachment.storeAction = MTLStoreActionStoreAndMultisampleResolve;
                descriptor.stencilAttachment.storeAction = MTLStoreActionStoreAndMultisampleResolve;
            }
        }
    } else if (curRenderPass->getDepthStencilAttachment().format != Format::UNKNOWN) {
        if (index == 0) {
            descriptor.depthAttachment.loadAction = dsAttachment.depthLoadOp == LoadOp::LOAD ? MTLLoadActionLoad : MTLLoadActionClear;
            descriptor.stencilAttachment.loadAction = dsAttachment.stencilLoadOp == LoadOp::LOAD ? MTLLoadActionLoad : MTLLoadActionClear;
        } else {
            descriptor.depthAttachment.loadAction = MTLLoadActionLoad;
            descriptor.stencilAttachment.loadAction = MTLLoadActionLoad;
        }
        //storeop
        if (index == subpasses.size() - 1) {
            descriptor.depthAttachment.storeAction = dsAttachment.depthStoreOp == StoreOp::STORE ? MTLStoreActionStore : MTLStoreActionDontCare;
            descriptor.stencilAttachment.storeAction = dsAttachment.stencilStoreOp == StoreOp::STORE ? MTLStoreActionStore : MTLStoreActionDontCare;
        } else {
            descriptor.depthAttachment.storeAction = MTLStoreActionStore;
            descriptor.stencilAttachment.storeAction = MTLStoreActionStore;
        }
    }
}

void CCMTLCommandBuffer::bindPipelineState(PipelineState *pso) {
    PipelineBindPoint bindPoint = pso->getBindPoint();
    CCMTLGPUPipelineState *pplState = nullptr;
    auto *ccPipeline = static_cast<CCMTLPipelineState *>(pso);
    if (bindPoint == PipelineBindPoint::GRAPHICS) {
        ccPipeline->check(_gpuCommandBufferObj->renderPass);
        pplState = ccPipeline->getGPUPipelineState();
        _mtlPrimitiveType = pplState->primitiveType;

        _renderEncoder.setCullMode(pplState->cullMode);
        _renderEncoder.setFrontFacingWinding(pplState->winding);
        _renderEncoder.setDepthClipMode(pplState->depthClipMode);
        _renderEncoder.setTriangleFillMode(pplState->fillMode);
        _renderEncoder.setRenderPipelineState(pplState->mtlRenderPipelineState);

        if (pplState->mtlDepthStencilState) {
            _renderEncoder.setStencilFrontBackReferenceValue(pplState->stencilRefFront, pplState->stencilRefBack);
            _renderEncoder.setDepthStencilState(pplState->mtlDepthStencilState);
        }

    } else if (bindPoint == PipelineBindPoint::COMPUTE) {
        if (!_computeEncoder.isInitialized()) {
            _computeEncoder.initialize(getMTLCommandBuffer());
        }
        pplState = ccPipeline->getGPUPipelineState();
        _computeEncoder.setComputePipelineState(pplState->mtlComputePipelineState);
    }
    _gpuCommandBufferObj->pipelineState = ccPipeline;
}

void CCMTLCommandBuffer::bindDescriptorSet(uint32_t set, DescriptorSet *descriptorSet, uint32_t dynamicOffsetCount, const uint32_t *dynamicOffsets) {
    CC_ASSERT(set < _GPUDescriptorSets.size());
    if (dynamicOffsetCount) {
        _dynamicOffsets[set].assign(dynamicOffsets, dynamicOffsets + dynamicOffsetCount);
        if (set < _firstDirtyDescriptorSet) {
            _firstDirtyDescriptorSet = set;
        }
    }

    auto *gpuDescriptorSet = static_cast<CCMTLDescriptorSet *>(descriptorSet)->gpuDescriptorSet();
    if (_GPUDescriptorSets[set] != gpuDescriptorSet) {
        _GPUDescriptorSets[set] = gpuDescriptorSet;
        if (set < _firstDirtyDescriptorSet) {
            _firstDirtyDescriptorSet = set;
        }
    }
}

void CCMTLCommandBuffer::bindInputAssembler(InputAssembler *ia) {
    if (ia) {
        _gpuCommandBufferObj->inputAssembler = static_cast<CCMTLInputAssembler *>(ia);
    }
}

void CCMTLCommandBuffer::setViewport(const Viewport &vp) {
    _renderEncoder.setViewport(vp);
}

void CCMTLCommandBuffer::setScissor(const Rect &rect) {
    Rect validate = rect;
    CC_ASSERT(_currentFbWidth >= rect.x);
    CC_ASSERT(_currentFbHeight >= rect.y);
    int32_t w = MIN(static_cast<int32_t>(rect.width), _currentFbWidth - rect.x);
    int32_t h = MIN(static_cast<int32_t>(rect.height), _currentFbHeight - rect.y);

    validate.width = static_cast<uint32_t>(MAX(w, 0));
    validate.height = static_cast<uint32_t>(MAX(h, 0));

    _renderEncoder.setScissor(validate);
}

void CCMTLCommandBuffer::setLineWidth(float /*width*/) {
    CC_LOG_WARNING("Metal doesn't support setting line width.");
}

void CCMTLCommandBuffer::setDepthBias(float constant, float clamp, float slope) {
    _renderEncoder.setDepthBias(constant, clamp, slope);
}

void CCMTLCommandBuffer::setBlendConstants(const Color &constants) {
    _renderEncoder.setBlendColor(constants);
}

void CCMTLCommandBuffer::setDepthBound(float /*minBounds*/, float /*maxBounds*/) {
    CC_LOG_ERROR("Metal doesn't support setting depth bound.");
}

void CCMTLCommandBuffer::setStencilWriteMask(StencilFace /*face*/, uint32_t /*mask*/) {
    CC_LOG_ERROR("Don't support change stencil write mask here.");
}

void CCMTLCommandBuffer::setStencilCompareMask(StencilFace /*face*/, uint32_t /*ref*/, uint32_t /*mask*/) {
    CC_LOG_ERROR("Don't support change stencil compare mask here.");
}

void CCMTLCommandBuffer::nextSubpass() {
    CCMTLRenderPass *curRenderPass = _gpuCommandBufferObj->renderPass;
    if (curRenderPass) {
        auto *ccRenderpass = static_cast<CCMTLRenderPass *>(curRenderPass);

        ccRenderpass->nextSubpass();
        // with framebuffer fetch enabled we can get texture as attachments by color[n] (except mac before m1),
        // otherwise setFragmentTexture manually.
        bool setTexNeeded = !mu::isFramebufferFetchSupported();
        if (setTexNeeded) {
            _renderEncoder.endEncoding();
            uint32_t curSubpassIndex = ccRenderpass->getCurrentSubpassIndex();
            auto *mtlRenderPassDescriptor = ccRenderpass->getMTLRenderPassDescriptor();
            const auto &colorAttachments = curRenderPass->getColorAttachments();
            const auto colorAttachmentCount = colorAttachments.size();
            const SubpassInfoList &subpasses = curRenderPass->getSubpasses();
            for (size_t slot = 0U; slot < colorAttachmentCount; slot++) {
                mtlRenderPassDescriptor.colorAttachments[slot].loadAction = _colorAppearedBefore[slot] ? MTLLoadActionLoad : mu::toMTLLoadAction(colorAttachments[slot].loadOp);
                mtlRenderPassDescriptor.colorAttachments[slot].storeAction = curSubpassIndex == subpasses.size() - 1 ? mu::toMTLStoreAction(colorAttachments[slot].storeOp) : MTLStoreActionStore;
                _colorAppearedBefore.set(slot);
            }
            updateDepthStencilState(curSubpassIndex, mtlRenderPassDescriptor);
            _renderEncoder.initialize(getMTLCommandBuffer(), ccRenderpass->getMTLRenderPassDescriptor());
            const TextureList &colorTextures = _gpuCommandBufferObj->fbo->getColorTextures();
            if (!subpasses.empty()) {
                const auto &inputs = subpasses[curSubpassIndex].inputs;
                for (size_t i = 0; i < inputs.size(); i++) {
                    const uint32_t input = inputs[i];
                    if(input >= colorTextures.size()) {
                        continue;// ds should be set already by updateDepthStencilState
                    }
                    auto *ccMtlTexture = static_cast<CCMTLTexture *>(colorTextures[input]);
                    _renderEncoder.setFragmentTexture(ccMtlTexture->getMTLTexture(), input);
                }
            }
        }
    }
}

void CCMTLCommandBuffer::draw(const DrawInfo &info) {
    if(!_gpuCommandBufferObj->pipelineState ||
       !_gpuCommandBufferObj->pipelineState->getGPUPipelineState() ||
       !_gpuCommandBufferObj->pipelineState->getGPUPipelineState()->mtlRenderPipelineState) {
        return;
    }
    CC_PROFILE(CCMTLCommandBufferDraw);
    if (_firstDirtyDescriptorSet < _GPUDescriptorSets.size()) {
        bindDescriptorSets();
    }
    CCMTLInputAssembler *inputAssembler = _gpuCommandBufferObj->inputAssembler;
    const auto *indirectBuffer = static_cast<CCMTLBuffer *>(inputAssembler->getIndirectBuffer());
    const auto *indexBuffer = static_cast<CCMTLBuffer *>(inputAssembler->getIndexBuffer());
    auto mtlEncoder = _renderEncoder.getMTLEncoder();

    if (indirectBuffer) {
        if (_indirectDrawSuppotred) {
            ++_numDrawCalls;
            if (indirectBuffer->isDrawIndirectByIndex()) {
                [mtlEncoder drawIndexedPrimitives:_mtlPrimitiveType
                                        indexType:indexBuffer->getIndexType()
                                      indexBuffer:indexBuffer->mtlBuffer()
                                indexBufferOffset:indexBuffer->currentOffset()
                                   indirectBuffer:indirectBuffer->mtlBuffer()
                             indirectBufferOffset:indirectBuffer->currentOffset()];
            } else {
                [mtlEncoder drawPrimitives:_mtlPrimitiveType
                            indirectBuffer:indirectBuffer->mtlBuffer()
                      indirectBufferOffset:indirectBuffer->currentOffset()];
            }
        } else {
            uint32_t stride = indirectBuffer->getStride();
            uint32_t offset = 0;
            uint32_t drawInfoCount = indirectBuffer->getCount();
            const auto &drawInfos = indirectBuffer->getDrawInfos();
            _numDrawCalls += drawInfoCount;

            for (uint32_t i = 0; i < drawInfoCount; ++i) {
                const auto &drawInfo = drawInfos[i];
                offset += drawInfo.firstIndex * stride;
                if (indirectBuffer->isDrawIndirectByIndex()) {
                    if (drawInfo.instanceCount == 0) {
                        // indexbuffer offset: [backbuffer(triplebuffer maybe) offset] + [offset in this drawcall]
                        [mtlEncoder drawIndexedPrimitives:_mtlPrimitiveType
                                               indexCount:drawInfo.indexCount
                                                indexType:indexBuffer->getIndexType()
                                              indexBuffer:indexBuffer->mtlBuffer()
                                        indexBufferOffset:offset + indexBuffer->currentOffset()];
                    } else {
                        [mtlEncoder drawIndexedPrimitives:_mtlPrimitiveType
                                               indexCount:drawInfo.indexCount
                                                indexType:indexBuffer->getIndexType()
                                              indexBuffer:indexBuffer->mtlBuffer()
                                        indexBufferOffset:offset + indexBuffer->currentOffset()
                                            instanceCount:drawInfo.instanceCount];
                    }
                } else {
                    if (drawInfo.instanceCount == 0) {
                        [mtlEncoder drawPrimitives:_mtlPrimitiveType
                                       vertexStart:drawInfo.firstVertex
                                       vertexCount:drawInfo.vertexCount];
                    } else {
                        [mtlEncoder drawPrimitives:_mtlPrimitiveType
                                       vertexStart:drawInfo.firstVertex
                                       vertexCount:drawInfo.vertexCount
                                     instanceCount:drawInfo.instanceCount];
                    }
                }
            }
        }
    } else {
        if (info.indexCount > 0) {
            uint32_t offset = 0;
            offset += info.firstIndex * indexBuffer->getStride();
            if (info.instanceCount == 0) {
                [mtlEncoder drawIndexedPrimitives:_mtlPrimitiveType
                                       indexCount:info.indexCount
                                        indexType:indexBuffer->getIndexType()
                                      indexBuffer:indexBuffer->mtlBuffer()
                                indexBufferOffset:offset + indexBuffer->currentOffset()];
            } else {
                [mtlEncoder drawIndexedPrimitives:_mtlPrimitiveType
                                       indexCount:info.indexCount
                                        indexType:indexBuffer->getIndexType()
                                      indexBuffer:indexBuffer->mtlBuffer()
                                indexBufferOffset:offset + indexBuffer->currentOffset()
                                    instanceCount:info.instanceCount];
            }
        } else if (info.vertexCount) {
            if (info.instanceCount == 0) {
                [mtlEncoder drawPrimitives:_mtlPrimitiveType
                               vertexStart:info.firstVertex
                               vertexCount:info.vertexCount];
            } else {
                [mtlEncoder drawPrimitives:_mtlPrimitiveType
                               vertexStart:info.firstVertex
                               vertexCount:info.vertexCount
                             instanceCount:info.instanceCount];
            }
        }

        _numInstances += info.instanceCount;
        _numDrawCalls++;
        if (_gpuCommandBufferObj->pipelineState) {
            uint32_t indexCount = info.indexCount ? info.indexCount : info.vertexCount;
            switch (_mtlPrimitiveType) {
                case MTLPrimitiveTypeTriangle:
                    _numTriangles += indexCount / 3 * std::max(info.instanceCount, 1U);
                    break;
                case MTLPrimitiveTypeTriangleStrip:
                    _numTriangles += (indexCount - 2) * std::max(info.instanceCount, 1U);
                    break;
                default: break;
            }
        }
    }
}

void CCMTLCommandBuffer::updateBuffer(Buffer *buff, const void *data, uint32_t size) {
    CC_PROFILE(CCMTLCmdBufUpdateBuffer);
    if (!buff) {
        CC_LOG_ERROR("CCMTLCommandBuffer::updateBuffer: buffer is nullptr.");
        return;
    }

    auto* ccBuffer = static_cast<CCMTLBuffer *>(buff);
    CCMTLGPUBuffer stagingBuffer;
    stagingBuffer.instanceSize = size;
    _mtlDevice->gpuStagingBufferPool()->alloc(&stagingBuffer);
    memcpy(stagingBuffer.mappedData, data, size);
    id<MTLBlitCommandEncoder> encoder = [getMTLCommandBuffer() blitCommandEncoder];
    [encoder copyFromBuffer:stagingBuffer.mtlBuffer
               sourceOffset:stagingBuffer.startOffset
                   toBuffer:ccBuffer->mtlBuffer()
          destinationOffset:ccBuffer->currentOffset()
                       size:size];
    [encoder endEncoding];
}

void CCMTLCommandBuffer::copyBuffersToTexture(const uint8_t *const *buffers, Texture *texture, const BufferTextureCopy *regions, uint32_t count) {
    if (!texture) {
        CC_LOG_ERROR("CCMTLCommandBuffer::copyBufferToTexture: texture is nullptr");
        return;
    }

    auto *mtlTexture = static_cast<CCMTLTexture *>(texture);
    const bool isArrayTexture = mtlTexture->isArray();
    auto textureType = mtlTexture->textureInfo().type;

    auto format = texture->getFormat();
    // no rg8b/rgb32f support
    auto convertedFormat = mtlTexture->getConvertedFormat();
    auto blockSize = formatAlignment(convertedFormat);

    id<MTLBlitCommandEncoder> encoder = [getMTLCommandBuffer() blitCommandEncoder];
    id<MTLTexture> dstTexture = mtlTexture->getMTLTexture();

    // Macro Pixel: minimum block to descirbe pixels.
    // when a picture has a 4*4 size:
    // ASTC_4x4: MacroPixelWidth:1 MacroPixelHeight:1
    // RGBA_4x4: MacroPixelWidth:4 MacroPixelHeight:4

    for (size_t i = 0; i < count; i++) {
        const auto &region = regions[i];
        auto bufferPixelWidth = region.buffStride > 0 ? region.buffStride : region.texExtent.width;
        auto bufferPixelHeight = region.buffTexHeight > 0 ? region.buffTexHeight : region.texExtent.height;
        auto targetWidth = region.texExtent.width;
        auto targetHeight = region.texExtent.height;

        const MTLSize targetSize = {
            bufferPixelWidth == 0 ? 0 : utils::alignTo(bufferPixelWidth, blockSize.first),
            bufferPixelHeight == 0 ? 0 : utils::alignTo(bufferPixelHeight, blockSize.second),
            region.texExtent.depth};
        const MTLOrigin targetOffset = {
            region.texOffset.x == 0 ? 0 : utils::alignTo(static_cast<uint>(region.texOffset.x), blockSize.first),
            region.texOffset.y == 0 ? 0 : utils::alignTo(static_cast<uint>(region.texOffset.y), blockSize.second),
            static_cast<uint>(region.texOffset.z)};

        auto bytesPerRowForTarget = formatSize(convertedFormat, targetWidth, 1, 1);
        auto bytesPerImageForTarget = formatSize(convertedFormat, static_cast<uint32_t>(targetSize.width), static_cast<uint32_t>(targetSize.height), static_cast<uint32_t>(targetSize.depth));
        auto alignment = formatSize(convertedFormat, 1, 1, 1);

        if(textureType == TextureType::TEX1D || textureType == TextureType::TEX1D_ARRAY || mtlTexture->isPVRTC()) {
            bytesPerRowForTarget = 0;
        }

        if(textureType == TextureType::TEX2D || mtlTexture->isPVRTC()) {
            bytesPerImageForTarget = 0;
        }

        auto bufferSliceSize = formatSize(convertedFormat, bufferPixelWidth, bufferPixelHeight, 1);
        auto bufferBytesPerRow = formatSize(convertedFormat, bufferPixelWidth, 1, 1);
        auto bufferBytesPerImage = region.texExtent.depth * bufferBytesPerRow;

        auto macroPixelHeight = targetHeight / blockSize.second;

        auto copyFunc = [&](const uint8_t * const buffer, const MTLRegion& mtlRegion, uint32_t size, uint32_t slice, uint8_t depth) {
            if(dstTexture.storageMode != MTLStorageModePrivate || mtlTexture->isPVRTC()) {
                ccstd::vector<uint8_t> data(size);
                memcpy(data.data(), buffer, size);

                [dstTexture replaceRegion:mtlRegion
                              mipmapLevel:region.texSubres.mipLevel
                                    slice:slice
                                withBytes:data.data()
                              bytesPerRow:bytesPerRowForTarget
                            bytesPerImage:bytesPerImageForTarget];
            } else {
                CCMTLGPUBuffer stagingBuffer;
                stagingBuffer.instanceSize = bufferSliceSize;
                _mtlDevice->gpuStagingBufferPool()->alloc(&stagingBuffer, alignment);
                memcpy(stagingBuffer.mappedData, buffer, bufferSliceSize);

                CC_ASSERT(stagingBuffer.startOffset % alignment == 0);

                [encoder copyFromBuffer:stagingBuffer.mtlBuffer sourceOffset:stagingBuffer.startOffset sourceBytesPerRow:bytesPerRowForTarget sourceBytesPerImage:bytesPerImageForTarget sourceSize:mtlRegion.size toTexture:dstTexture destinationSlice:slice destinationLevel:region.texSubres.mipLevel destinationOrigin:mtlRegion.origin];
            }
        };

        bool compactMemory = bufferPixelWidth == region.texExtent.width;
        for(uint32_t l = region.texSubres.baseArrayLayer; l < region.texSubres.layerCount + region.texSubres.baseArrayLayer; ++l) {
            for(uint32_t d = static_cast<uint32_t>(targetOffset.z); d < targetSize.depth + static_cast<uint32_t>(targetOffset.z); ++d) {
                if(compactMemory) {
                    const auto *convertedData = mu::convertData(buffers[i] + region.buffOffset + (l - region.texSubres.baseArrayLayer) * bufferBytesPerImage
                                                                + (d - targetOffset.z) * bufferSliceSize,
                                                                bufferPixelWidth * blockSize.second, format);

                    MTLRegion mtlRegion = {
                        {targetOffset.x, targetOffset.y, d},
                        {targetWidth, targetHeight, 1}
                    };

                    copyFunc(convertedData, mtlRegion, bufferSliceSize, l, d);

                    if (format == Format::RGB8 || format == Format::RGB32F) {
                        CC_FREE(convertedData);
                    }
                } else {
                    for(size_t h = targetOffset.y; h < targetSize.height + targetOffset.y; h += blockSize.second) {
                        const auto *convertedData = mu::convertData(buffers[i] + region.buffOffset + (l - region.texSubres.baseArrayLayer) * bufferBytesPerImage
                                                                    + (d - targetOffset.z) * bufferSliceSize + h / blockSize.second * bufferBytesPerRow,
                                                                    bufferPixelWidth * blockSize.second, format);

                        MTLRegion mtlRegion = {
                            {targetOffset.x, targetOffset.y + h, d},
                            {targetWidth, blockSize.second, 1}
                        };

                        copyFunc(convertedData, mtlRegion, bytesPerRowForTarget, l, d);

                        if (format == Format::RGB8 || format == Format::RGB32F) {
                            CC_FREE(convertedData);
                        }
                    }
                }
            }
        }


    }

    if (hasFlag(static_cast<CCMTLTexture *>(texture)->textureInfo().flags, TextureFlags::GEN_MIPMAP) && mu::pixelFormatIsColorRenderable(convertedFormat)) {
        [encoder generateMipmapsForTexture:dstTexture];
    }
    [encoder endEncoding];
}

void CCMTLCommandBuffer::execute(CommandBuffer *const *commandBuffs, uint32_t count) {
    for (uint32_t i = 0; i < count; ++i) {
        const auto *commandBuffer = static_cast<const CCMTLCommandBuffer *>(commandBuffs[i]);
        _numDrawCalls += commandBuffer->_numDrawCalls;
        _numInstances += commandBuffer->_numInstances;
        _numTriangles += commandBuffer->_numTriangles;
    }
}

void CCMTLCommandBuffer::bindDescriptorSets() {
    CCMTLInputAssembler *inputAssembler = _gpuCommandBufferObj->inputAssembler;
    CCMTLGPUPipelineState *pipelineStateObj = _gpuCommandBufferObj->pipelineState->getGPUPipelineState();
    const auto &vertexBuffers = inputAssembler->getVertexBuffers();
    for (const auto &bindingInfo : pipelineStateObj->vertexBufferBindingInfo) {
        auto index = std::get<0>(bindingInfo);
        auto stream = std::get<1>(bindingInfo);
        static_cast<CCMTLBuffer *>(vertexBuffers[stream])->encodeBuffer(_renderEncoder, 0, index, ShaderStageFlagBit::VERTEX);
    }

    const auto &dynamicOffsetIndices = pipelineStateObj->gpuPipelineLayout->dynamicOffsetIndices;
    const auto &blocks = pipelineStateObj->gpuShader->blocks;
    for (const auto &iter : blocks) {
        const auto &block = iter.second;

        const auto *gpuDescriptorSet = _GPUDescriptorSets[block.set];
        const auto descriptorIndex = gpuDescriptorSet->descriptorIndices->at(block.binding);
        const auto &gpuDescriptor = gpuDescriptorSet->gpuDescriptors[descriptorIndex];
        if (!gpuDescriptor.buffer) {
            CC_LOG_ERROR("Buffer binding %s at set %d binding %d is not bounded.", block.name.c_str(), block.set, block.binding);
            continue;
        }

        const auto &dynamicOffset = dynamicOffsetIndices[block.set];
        auto dynamicOffsetIndex = (block.binding < dynamicOffset.size()) ? dynamicOffset[block.binding] : -1;
        if (gpuDescriptor.buffer) {
            uint32_t offset = (dynamicOffsetIndex >= 0) ? _dynamicOffsets[block.set][dynamicOffsetIndex] : 0;
            // compute pipeline and render pipeline mutually exlusive
            if (pipelineStateObj->mtlComputePipelineState) {
                gpuDescriptor.buffer->encodeBuffer(_computeEncoder,
                                                   offset,
                                                   block.mappedBinding,
                                                   block.stages);
            } else {
                gpuDescriptor.buffer->encodeBuffer(_renderEncoder,
                                                   offset,
                                                   block.mappedBinding,
                                                   block.stages);
            }
        }
    }

    const auto &samplers = pipelineStateObj->gpuShader->samplers;
    for (const auto &iter : samplers) {
        const auto &sampler = iter.second;

        const auto *gpuDescriptorSet = _GPUDescriptorSets[sampler.set];
        const auto descriptorIndex = gpuDescriptorSet->descriptorIndices->at(sampler.binding);
        const auto &gpuDescriptor = gpuDescriptorSet->gpuDescriptors[descriptorIndex];

        if (!gpuDescriptor.texture || !gpuDescriptor.sampler) {
            CC_LOG_ERROR("Sampler binding %s at set %d binding %d is not bounded.", sampler.name.c_str(), sampler.set, sampler.binding);
            continue;
        }

        if (hasFlag(sampler.stages, ShaderStageFlagBit::VERTEX)) {
            _renderEncoder.setVertexTexture(gpuDescriptor.texture->getMTLTexture(), sampler.textureBinding);
            _renderEncoder.setVertexSampler(gpuDescriptor.sampler->getMTLSamplerState(), sampler.samplerBinding);
        }

        if (hasFlag(sampler.stages, ShaderStageFlagBit::FRAGMENT)) {
            _renderEncoder.setFragmentTexture(gpuDescriptor.texture->getMTLTexture(), sampler.textureBinding);
            _renderEncoder.setFragmentSampler(gpuDescriptor.sampler->getMTLSamplerState(), sampler.samplerBinding);
        }

        if (hasFlag(sampler.stages, ShaderStageFlagBit::COMPUTE)) {
            _computeEncoder.setTexture(gpuDescriptor.texture->getMTLTexture(), sampler.textureBinding);
        }
    }
}

void CCMTLCommandBuffer::resolveTexture(Texture *srcTexture, Texture *dstTexture, const TextureCopy *regions, uint32_t count) {
    // not supported.
}

void CCMTLCommandBuffer::copyTexture(Texture *srcTexture, Texture *dstTexture, const TextureCopy *regions, uint32_t count) {
    ccstd::vector<TextureBlit> blitRegions(count);
    for (uint32_t i = 0; i < count; ++i) {
        auto &blit = blitRegions[i];
        auto &copy = regions[i];

        blit.srcSubres = copy.srcSubres;
        blit.dstSubres = copy.dstSubres;

        blit.srcOffset = copy.srcOffset;
        blit.dstOffset = copy.dstOffset;

        blit.srcExtent = copy.extent;
        blit.dstExtent = copy.extent;
    }
    blitTexture(srcTexture, dstTexture, blitRegions.data(), count, Filter::POINT);
}

void CCMTLCommandBuffer::blitTexture(Texture *srcTexture, Texture *dstTexture, const TextureBlit *regions, uint32_t count, Filter filter) {
    if (srcTexture && dstTexture && regions) {
        id<MTLCommandBuffer> cmdBuffer = getMTLCommandBuffer();

        auto *ccSrcTex = static_cast<CCMTLTexture *>(srcTexture);
        auto *ccDstTex = static_cast<CCMTLTexture *>(dstTexture);

        id<MTLTexture> src = nil;
        if (ccSrcTex->swapChain()) {
            src = ccSrcTex->swapChain()->currentDrawable().texture;
        } else {
            src = ccSrcTex->getMTLTexture();
        }

        id<MTLTexture> dst = nil;
        if (ccDstTex->swapChain()) {
            dst = ccDstTex->swapChain()->currentDrawable().texture;
        } else {
            dst = ccDstTex->getMTLTexture();
        }

        id<MTLDevice> mtlDevice = static_cast<id<MTLDevice>>(_mtlDevice->getMTLDevice());

        //format conversion
        MTLTextureDescriptor *descriptor = [[MTLTextureDescriptor alloc] init];
        descriptor.width = src.width;
        descriptor.height = src.height;
        descriptor.depth = src.depth;
        descriptor.pixelFormat = dst.pixelFormat;
        descriptor.textureType = src.textureType;
        descriptor.usage = MTLTextureUsageShaderWrite | MTLTextureUsageShaderRead;
        descriptor.storageMode = MTLStorageModePrivate;

        // 1. format conversion
        id<MTLTexture> formatTex = [mtlDevice newTextureWithDescriptor:descriptor];
        MPSImageConversion *conversion = [[MPSImageConversion alloc] initWithDevice:mtlDevice srcAlpha:MPSAlphaTypeNonPremultiplied destAlpha:MPSAlphaTypeNonPremultiplied backgroundColor:nil conversionInfo:nil];
        [conversion encodeToCommandBuffer:cmdBuffer sourceTexture:src destinationTexture:formatTex];
        [conversion release];

        double scaleFactorW = [dst width] / (double)[src width];
        double scaleFactorH = [dst height] / (double)[src height];
        double scaleFactorD = [dst depth] / (double)[src depth];

        double uniformScale = scaleFactorW > scaleFactorH ? scaleFactorW : scaleFactorH;

        id<MTLTexture> sizeTex = formatTex;
        if ([dst width] > [src width] || [dst height] > [src height]) {
            // 2. size conversion
            descriptor.width = dst.width;
            descriptor.height = dst.height;
            descriptor.depth = dst.depth;
            descriptor.pixelFormat = dst.pixelFormat;
            descriptor.textureType = dst.textureType;
            descriptor.usage = MTLTextureUsageShaderWrite;

            sizeTex = [mtlDevice newTextureWithDescriptor:descriptor];

            MPSImageLanczosScale *imgScale = [[MPSImageLanczosScale alloc] initWithDevice:mtlDevice];

            MPSScaleTransform scale{uniformScale, uniformScale, 0, 0};
            [imgScale setScaleTransform:&scale];
            [imgScale encodeToCommandBuffer:cmdBuffer sourceTexture:formatTex destinationTexture:sizeTex];
            [imgScale release];
            [formatTex release];
        }

        //blit
        id<MTLBlitCommandEncoder> encoder = [cmdBuffer blitCommandEncoder];
        for (uint32_t i = 0; i < count; ++i) {
            // source region scale
            uint32_t width = (uint32_t)(regions[i].srcExtent.width * scaleFactorW);
            uint32_t height = (uint32_t)(regions[i].srcExtent.height * scaleFactorH);
            uint32_t depth = (uint32_t)(regions[i].srcExtent.depth * scaleFactorD);
            uint32_t x = (uint32_t)(regions[i].srcOffset.x * scaleFactorW);
            uint32_t y = (uint32_t)(regions[i].srcOffset.y * scaleFactorH);
            uint32_t z = (uint32_t)(regions[i].srcOffset.z * scaleFactorD);
            [encoder copyFromTexture:sizeTex
                         sourceSlice:regions[i].srcSubres.baseArrayLayer
                         sourceLevel:regions[i].srcSubres.mipLevel
                        sourceOrigin:MTLOriginMake(x, y, z)
                          sourceSize:MTLSizeMake(width, height, depth)
                           toTexture:dst
                    destinationSlice:regions[i].dstSubres.baseArrayLayer
                    destinationLevel:regions[i].srcSubres.mipLevel
                   destinationOrigin:MTLOriginMake(regions[i].dstOffset.x, regions[i].dstOffset.y, regions[i].dstOffset.z)];
        }
        [encoder endEncoding];
        [sizeTex release];
        [descriptor release];
    }
}

void CCMTLCommandBuffer::dispatch(const DispatchInfo &info) {
    if (_firstDirtyDescriptorSet < _GPUDescriptorSets.size()) {
        bindDescriptorSets();
    }
    MTLSize groupsPerGrid = MTLSizeMake(info.groupCountX, info.groupCountY, info.groupCountZ);
    auto* ccShader = static_cast<CCMTLShader*>(_gpuCommandBufferObj->pipelineState->getShader());
    const auto& groupSize = ccShader->gpuShader(nullptr, 0)->workGroupSize;
    MTLSize workGroupSize = MTLSizeMake(groupSize[0], groupSize[1], groupSize[2]);
    if (info.indirectBuffer) {
        auto* ccBuffer = static_cast<CCMTLBuffer *>(info.indirectBuffer);
        // offset: [dispatch offset] + [backbuffer offset]
        _computeEncoder.dispatch(ccBuffer->mtlBuffer(), info.indirectOffset + ccBuffer->currentOffset(), workGroupSize);
    } else {
        _computeEncoder.dispatch(groupsPerGrid, workGroupSize);
    }
    _computeEncoder.endEncoding();
}

void CCMTLCommandBuffer::pipelineBarrier(const GeneralBarrier *barrier, const BufferBarrier *const *bufferBarriers, const Buffer *const *buffers, uint32_t bufferBarrierCount, const TextureBarrier *const *textureBarriers, const Texture *const *textures, uint32_t textureBarrierCount) {
    // Metal tracks non-heap resources automatically, which means no need to add a barrier in the same encoder.
}

void CCMTLCommandBuffer::copyTextureToBuffers(Texture *src, uint8_t *const *buffers, const BufferTextureCopy *regions, uint32_t count) {
    auto *ccMTLTexture = static_cast<CCMTLTexture *>(src);
    Format convertedFormat = ccMTLTexture->getConvertedFormat();
    id<MTLTexture> mtlTexture = ccMTLTexture->getMTLTexture();

    if ([mtlTexture storageMode] == MTLStorageModeShared) {
        for (size_t i = 0; i < count; ++i) {
            uint32_t width = regions[i].texExtent.width;
            uint32_t height = regions[i].texExtent.height;
            uint32_t depth = regions[i].texExtent.depth;
            uint32_t bytesPerRow = mu::getBytesPerRow(convertedFormat, width);
            uint32_t bytesPerImage = formatSize(convertedFormat, width, height, depth);
            const Offset &origin = regions[i].texOffset;
            const Extent &extent = regions[i].texExtent;

            [mtlTexture getBytes:buffers[i]
                     bytesPerRow:bytesPerRow
                   bytesPerImage:bytesPerImage
                      fromRegion:{MTLOriginMake(origin.x, origin.y, origin.z), MTLSizeMake(extent.width, extent.height, extent.depth)}
                     mipmapLevel:regions[i].texSubres.mipLevel
                           slice:regions[i].texSubres.baseArrayLayer];
        }
    } else {
        id<MTLCommandBuffer> mtlCommandBuffer = getMTLCommandBuffer();

        ccstd::vector<std::pair<uint8_t *, uint32_t>> stagingAddrs(count);
        for (size_t i = 0; i < count; ++i) {
            uint32_t width = regions[i].texExtent.width;
            uint32_t height = regions[i].texExtent.height;
            uint32_t depth = regions[i].texExtent.depth;
            uint32_t bytesPerRow = mu::getBytesPerRow(convertedFormat, width);
            uint32_t bytesPerImage = formatSize(convertedFormat, width, height, depth);
            const Offset &origin = regions[i].texOffset;
            const Extent &extent = regions[i].texExtent;

            id<MTLBlitCommandEncoder> encoder = [mtlCommandBuffer blitCommandEncoder];
            CCMTLGPUBuffer stagingBuffer;
            stagingBuffer.instanceSize = bytesPerImage;
            _mtlDevice->gpuStagingBufferPool()->alloc(&stagingBuffer);
            [encoder copyFromTexture:mtlTexture
                             sourceSlice:regions[i].texSubres.baseArrayLayer
                             sourceLevel:regions[i].texSubres.mipLevel
                            sourceOrigin:MTLOriginMake(origin.x, origin.y, origin.z)
                              sourceSize:MTLSizeMake(extent.width, extent.height, extent.depth)
                                toBuffer:stagingBuffer.mtlBuffer
                       destinationOffset:0
                  destinationBytesPerRow:bytesPerRow
                destinationBytesPerImage:bytesPerImage];
            [encoder endEncoding];
            stagingAddrs[i] = {stagingBuffer.mappedData, bytesPerImage};
        }
        if (!_texCopySemaphore) {
            _texCopySemaphore = ccnew CCMTLSemaphore(0);
        }

        [mtlCommandBuffer addCompletedHandler:^(id<MTLCommandBuffer> commandBuffer) {
            for (size_t i = 0; i < count; ++i) {
                memcpy(buffers[i], stagingAddrs[i].first, stagingAddrs[i].second);
            }
            _texCopySemaphore->signal();
        }];
        [mtlCommandBuffer commit];
        [mtlCommandBuffer release];
        _gpuCommandBufferObj->mtlCommandBuffer = nil;
        _texCopySemaphore->wait();
    }
}

void CCMTLCommandBuffer::beginQuery(QueryPool *queryPool, uint32_t id) {
    auto *mtlQueryPool = static_cast<CCMTLQueryPool *>(queryPool);
    auto queryId = static_cast<uint32_t>(mtlQueryPool->_ids.size());

    if (queryId < queryPool->getMaxQueryObjects()) {
        auto *mtlEncoder = _renderEncoder.getMTLEncoder();
        [mtlEncoder setVisibilityResultMode:MTLVisibilityResultModeBoolean offset:queryId * sizeof(uint64_t)];
    }
}

void CCMTLCommandBuffer::endQuery(QueryPool *queryPool, uint32_t id) {
    auto *mtlQueryPool = static_cast<CCMTLQueryPool *>(queryPool);
    auto queryId = static_cast<uint32_t>(mtlQueryPool->_ids.size());

    if (queryId < queryPool->getMaxQueryObjects()) {
        auto *mtlEncoder = _renderEncoder.getMTLEncoder();
        [mtlEncoder setVisibilityResultMode:MTLVisibilityResultModeDisabled offset:queryId * sizeof(uint64_t)];
        mtlQueryPool->_ids.push_back(id);
    }
}

void CCMTLCommandBuffer::resetQueryPool(QueryPool *queryPool) {
    auto *mtlQueryPool = static_cast<CCMTLQueryPool *>(queryPool);

    mtlQueryPool->_ids.clear();
}

void CCMTLCommandBuffer::completeQueryPool(QueryPool *queryPool) {
    auto *mtlQueryPool = static_cast<CCMTLQueryPool *>(queryPool);
    CCMTLGPUQueryPool *gpuQueryPool = mtlQueryPool->gpuQueryPool();

    id<MTLCommandBuffer> mtlCommandBuffer = getMTLCommandBuffer();
    [mtlCommandBuffer addCompletedHandler:^(id<MTLCommandBuffer> commandBuffer) {
        gpuQueryPool->semaphore->signal();
    }];
}

void CCMTLCommandBuffer::signalFence() {
    CC_ASSERT(_inFlightSem);
    _inFlightSem->signal();
}

void CCMTLCommandBuffer::waitFence() {
    _inFlightSem->wait();
    _inFlightSem->signal();
}

void CCMTLCommandBuffer::buildAccelerationStructure(AccelerationStructure *accel){

}
void CCMTLCommandBuffer::updateAccelerationStructure(AccelerationStructure *accel){

}
void CCMTLCommandBuffer::compactAccelerationStructure(AccelerationStructure *accel, AccelerationStructure *res){

}

} // namespace gfx
} // namespace cc

