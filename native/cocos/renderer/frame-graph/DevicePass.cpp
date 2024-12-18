/****************************************************************************
 Copyright (c) 2021-2023 Xiamen Yaji Software Co., Ltd.

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

#include "DevicePass.h"
#include "CallbackPass.h"
#include "DevicePassResourceTable.h"
#include "FrameGraph.h"
#include "PassNode.h"
#include "ResourceNode.h"
#include "base/Utils.h"
#include "gfx-base/GFXCommandBuffer.h"
#include "gfx-base/GFXDef-common.h"

#include <algorithm>

namespace cc {
namespace framegraph {

DevicePass::DevicePass(const FrameGraph &graph, ccstd::vector<PassNode *> const &subpassNodes) {
    ccstd::vector<RenderTargetAttachment> attachments;

    uint32_t index = 0;
    for (const PassNode *passNode : subpassNodes) {
        append(graph, passNode, &attachments);
        _barriers.push_back(std::cref(passNode->getBarriers()));
        _subpasses.back().barrierID = index++;
    }

    auto *device = gfx::Device::getInstance();
    // _enableAutoBarrier: auto barrier in framegraph
    // barrierDeduce: deduce barrier gfx internally
    // to avoid redundant instructions, either inside or outside
    device->enableAutoBarrier(!gfx::ENABLE_GRAPH_AUTO_BARRIER);

    // Important Notice:
    // here attchment index has changed.
    // _attachments is flattened previously, and it is spliced into two parts here:
    // colorAttachments and depthStencilAttachment
    // As a result, the indices in subpasses are INVALIDATED.
    // So the attachment index in subpass should be recalculated.
    // there should be only ONE depth stencil in the entire Pass
    auto depthIndex = gfx::INVALID_BINDING;
    auto depthNewIndex = gfx::INVALID_BINDING;
    for (uint32_t id = 0; id != attachments.size(); ++id) {
        if (attachments[id].desc.usage != RenderTargetAttachment::Usage::COLOR) {
            CC_ASSERT_EQ(depthIndex, gfx::INVALID_BINDING);
            depthIndex = id;
            depthNewIndex = static_cast<uint32_t>(attachments.size() - 1);
        }
    }
    std::stable_sort(attachments.begin(), attachments.end(), RenderTargetAttachment::Sorter());

    // update subpass index
    for (auto &subpass : _subpasses) {
        // reindex subpass attchment index
        auto &info = subpass.desc;
        for (auto &id : info.inputs) {
            if (id == depthIndex) {
                id = depthNewIndex;
            } else if (id > depthIndex) {
                --id;
            }
        }
        for (auto &id : info.resolves) {
            if (id == depthIndex) {
                id = depthNewIndex;
            } else if (id > depthIndex) {
                --id;
            }
        }
        for (auto &id : info.preserves) {
            if (id == depthIndex) {
                id = depthNewIndex;
            } else if (id > depthIndex) {
                --id;
            }
        }
    }

    ccstd::vector<const gfx::Texture *> renderTargets;

    for (auto &attachment : attachments) {
        const ResourceNode &resourceNode = graph.getResourceNode(attachment.textureHandle);
        CC_ASSERT(resourceNode.virtualResource);

        gfx::Texture *resource = static_cast<ResourceEntry<Texture> *>(resourceNode.virtualResource)->getDeviceResource();
        CC_ASSERT(resource);

        _attachments.emplace_back();
        _attachments.back().attachment = attachment;
        _attachments.back().renderTarget = resource;
        renderTargets.emplace_back(resource);
    }

    for (PassNode *const passNode : subpassNodes) {
        _resourceTable.extract(graph, passNode, renderTargets);
    }
}

void DevicePass::passDependency(gfx::RenderPassInfo &rpInfo) {
    if constexpr (gfx::ENABLE_GRAPH_AUTO_BARRIER) {
        uint32_t index = 0;

        thread_local gfx::BufferBarrierList bufferBarriers;
        thread_local gfx::TextureBarrierList textureBarriers;
        thread_local gfx::BufferList buffers;
        thread_local gfx::TextureList textures;

        bufferBarriers.clear();
        textureBarriers.clear();
        buffers.clear();
        textures.clear();

        uint32_t lastBufferIndex{0};
        uint32_t lastTextureIndex{0};

        auto mergeToDependency = [&](uint32_t barrierID, uint32_t subpassIndex) {
            for (const auto &frontBarrier : _barriers[barrierID].get().frontBarriers) {
                const auto &res = getBarrier(frontBarrier, &_resourceTable);
                if (frontBarrier.resourceType == ResourceType::BUFFER) {
                    bufferBarriers.emplace_back(static_cast<gfx::BufferBarrier *>(res.first));
                    buffers.emplace_back(static_cast<gfx::Buffer *>(res.second));
                } else if (frontBarrier.resourceType == ResourceType::TEXTURE) {
                    textureBarriers.emplace_back(static_cast<gfx::TextureBarrier *>(res.first));
                    textures.emplace_back(static_cast<gfx::Texture *>(res.second));
                } else {
                    CC_ABORT();
                }
            }

            lastBufferIndex = static_cast<uint32_t>(buffers.size());
            lastTextureIndex = static_cast<uint32_t>(textures.size());

            rpInfo.dependencies.emplace_back(gfx::SubpassDependency{
                subpassIndex > 1 ? subpassIndex - 1 : gfx::SUBPASS_EXTERNAL,
                subpassIndex,
                nullptr,
                {},
                {},
                });

            for (const auto &rearBarrier : _barriers[barrierID].get().rearBarriers) {
                const auto &res = getBarrier(rearBarrier, &_resourceTable);
                if (rearBarrier.resourceType == ResourceType::BUFFER) {
                    bufferBarriers.emplace_back(static_cast<gfx::BufferBarrier *>(res.first));
                    buffers.emplace_back(static_cast<gfx::Buffer *>(res.second));
                } else if (rearBarrier.resourceType == ResourceType::TEXTURE) {
                    textureBarriers.emplace_back(static_cast<gfx::TextureBarrier *>(res.first));
                    textures.emplace_back(static_cast<gfx::Texture *>(res.second));
                } else {
                    CC_ABORT();
                }
            }
        };

        if (!_subpasses.empty()) {
            for (const auto &subpass : _subpasses) {
                mergeToDependency(subpass.barrierID, index);
                ++index;
            }
        } else {
            mergeToDependency(0, 0);
        }

        if (textureBarriers.size() > lastTextureIndex || bufferBarriers.size() > lastBufferIndex) {
            rpInfo.dependencies.emplace_back(gfx::SubpassDependency{
                _subpasses.empty() ? 0 : static_cast<uint32_t>(_subpasses.size() - 1),
                gfx::SUBPASS_EXTERNAL,
                nullptr,
                {},
                {},
            });
        }
    }
}

void DevicePass::execute() {
    auto *device = gfx::Device::getInstance();
    auto *cmdBuff = device->getCommandBuffer();

    begin(cmdBuff);

    for (uint32_t i = 0; i < utils::toUint(_subpasses.size()); ++i) {
        Subpass &subpass = _subpasses[i];
        _resourceTable._subpassIndex = i;

        for (LogicPass &pass : subpass.logicPasses) {
            gfx::Viewport &viewport = pass.customViewport ? pass.viewport : _viewport;
            gfx::Rect &scissor = pass.customViewport ? pass.scissor : _scissor;

            if (viewport != _curViewport) {
                cmdBuff->setViewport(viewport);
                _curViewport = viewport;
            }
            if (scissor != _curScissor) {
                cmdBuff->setScissor(scissor);
                _curScissor = scissor;
            }

            pass.pass->execute(_resourceTable);
        }

        if (i < _subpasses.size() - 1) next(cmdBuff);
    }

    end(cmdBuff);
}

void DevicePass::append(const FrameGraph &graph, const PassNode *passNode, ccstd::vector<RenderTargetAttachment> *attachments) {
    _subpasses.emplace_back();
    Subpass &subpass = _subpasses.back();

    do {
        subpass.logicPasses.emplace_back();
        LogicPass &logicPass = subpass.logicPasses.back();
        logicPass.pass = passNode->_pass.get();
        logicPass.customViewport = passNode->_customViewport;
        logicPass.viewport = passNode->_viewport;
        logicPass.scissor = passNode->_scissor;

        for (const auto &attachment : passNode->_attachments) {
            append(graph, attachment, attachments, &subpass.desc, passNode->_reads);
        }

        for (const auto &handle : passNode->_reads) {
            const auto it = std::find_if(attachments->begin(), attachments->end(), [&handle](const RenderTargetAttachment &attachment) {
                return attachment.textureHandle == handle;
            });
            if (it != attachments->end()) {
                uint32_t input = utils::toUint(it - attachments->begin());
                if (std::find(subpass.desc.inputs.begin(), subpass.desc.inputs.end(), input) == subpass.desc.inputs.end()) {
                    subpass.desc.inputs.push_back(input);
                }
            }
        }

        passNode = passNode->_next;
    } while (passNode);
}

void DevicePass::append(const FrameGraph &graph, const RenderTargetAttachment &attachment,
                        ccstd::vector<RenderTargetAttachment> *attachments, gfx::SubpassInfo *subpass, const ccstd::vector<Handle> &reads) {
    std::ignore = reads;
    RenderTargetAttachment::Usage usage{attachment.desc.usage};
    uint32_t slot{attachment.desc.slot};
    if (attachment.desc.usage == RenderTargetAttachment::Usage::COLOR) {
        // should fetch actual color slot from current subpass
        slot = subpass->colors.size() > attachment.desc.slot ? subpass->colors[attachment.desc.slot] : gfx::INVALID_BINDING;
    }
    auto it = std::find_if(attachments->begin(), attachments->end(), [usage, slot](const RenderTargetAttachment &x) {
        return usage == x.desc.usage && slot == x.desc.slot;
    });

    RenderTargetAttachment *output{nullptr};

    if (it == attachments->end()) {
        attachments->emplace_back(attachment);
        output = &(attachments->back());
        if (attachment.desc.usage == RenderTargetAttachment::Usage::COLOR) {
            for (uint8_t i = 0; i < RenderTargetAttachment::DEPTH_STENCIL_SLOT_START; ++i) {
                if ((_usedRenderTargetSlotMask & (1 << i)) == 0) {
                    attachments->back().desc.slot = i;
                    _usedRenderTargetSlotMask |= 1 << i;
                    break;
                }
            }
        } else {
            CC_ASSERT((_usedRenderTargetSlotMask & (1 << attachment.desc.slot)) == 0);
            _usedRenderTargetSlotMask |= 1 << attachment.desc.slot;
        }
    } else {
        const ResourceNode &resourceNodeA = graph.getResourceNode(it->textureHandle);
        const ResourceNode &resourceNodeB = graph.getResourceNode(attachment.textureHandle);

        if (resourceNodeA.virtualResource == resourceNodeB.virtualResource) {
            output = &*it;
            if (attachment.storeOp != gfx::StoreOp::DISCARD) {
                output->storeOp = attachment.storeOp;
                output->desc.endAccesses = attachment.desc.endAccesses;
            }
        } else {
            CC_ASSERT(attachment.desc.usage == RenderTargetAttachment::Usage::COLOR);
            attachments->emplace_back(attachment);
            output = &(attachments->back());

            for (uint8_t i = 0; i < RenderTargetAttachment::DEPTH_STENCIL_SLOT_START; ++i) {
                if ((_usedRenderTargetSlotMask & (1 << i)) == 0) {
                    attachments->back().desc.slot = i;
                    _usedRenderTargetSlotMask |= 1 << i;
                    break;
                }
            }
        }
    }

    if (attachment.desc.usage == RenderTargetAttachment::Usage::COLOR) {
        if (std::find(subpass->colors.begin(), subpass->colors.end(), output->desc.slot) == subpass->colors.end()) {
            subpass->colors.push_back(output->desc.slot);
        }
    } else {
        subpass->depthStencil = output->desc.slot;
    }
}

void DevicePass::begin(gfx::CommandBuffer *cmdBuff) {
    if (_attachments.empty()) return;

    gfx::RenderPassInfo rpInfo;
    gfx::FramebufferInfo fboInfo;
    float clearDepth = 1.F;
    uint32_t clearStencil = 0;
    static ccstd::vector<gfx::Color> clearColors;
    clearColors.clear();

    bool hasDefaultViewport{false};
    for (auto &subpass : _subpasses) {
        for (auto &pass : subpass.logicPasses) {
            if (!pass.customViewport) {
                hasDefaultViewport = true;
                break;
            }
        }
    }

    if (hasDefaultViewport) {
        _viewport = {};
        _scissor = {0, 0, UINT_MAX, UINT_MAX};
    } else { // if all passes use customize viewport
        _scissor = {INT_MAX, INT_MAX, 0, 0};

        for (auto &subpass : _subpasses) {
            for (auto &pass : subpass.logicPasses) {
                // calculate the union of all viewports as render area
                _viewport.left = _scissor.x = std::min(_scissor.x, pass.viewport.left);
                _viewport.top = _scissor.y = std::min(_scissor.y, pass.viewport.top);
                _viewport.width = _scissor.width = std::max(_scissor.width, pass.viewport.width + pass.viewport.left - _scissor.x);
                _viewport.height = _scissor.height = std::max(_scissor.height, pass.viewport.height + pass.viewport.top - _scissor.y);
            }
        }
    }

    for (const auto &attachElem : _attachments) {
        gfx::Texture *attachment = attachElem.renderTarget;
        if (attachElem.attachment.desc.usage == RenderTargetAttachment::Usage::COLOR) {
            rpInfo.colorAttachments.emplace_back();
            auto &attachmentInfo = rpInfo.colorAttachments.back();
            attachmentInfo.format = attachment->getFormat();
            attachmentInfo.loadOp = attachElem.attachment.desc.loadOp;
            attachmentInfo.storeOp = attachElem.attachment.storeOp;
            attachmentInfo.barrier = gfx::Device::getInstance()->getGeneralBarrier({attachElem.attachment.desc.beginAccesses, attachElem.attachment.desc.endAccesses});
            fboInfo.colorTextures.push_back(attachElem.renderTarget);
            clearColors.emplace_back(attachElem.attachment.desc.clearColor);
        } else {
            auto &attachmentInfo = rpInfo.depthStencilAttachment;
            attachmentInfo.format = attachment->getFormat();
            attachmentInfo.depthLoadOp = attachElem.attachment.desc.loadOp;
            attachmentInfo.stencilLoadOp = attachElem.attachment.desc.loadOp;
            attachmentInfo.depthStoreOp = attachElem.attachment.storeOp;
            attachmentInfo.stencilStoreOp = attachElem.attachment.storeOp;
            attachmentInfo.barrier = gfx::Device::getInstance()->getGeneralBarrier({attachElem.attachment.desc.beginAccesses, attachElem.attachment.desc.endAccesses});
            fboInfo.depthStencilTexture = attachElem.renderTarget;
            clearDepth = attachElem.attachment.desc.clearDepth;
            clearStencil = attachElem.attachment.desc.clearStencil;
        }
        if (hasDefaultViewport) {
            _viewport.width = _scissor.width = std::min(_scissor.width, attachment->getWidth());
            _viewport.height = _scissor.height = std::min(_scissor.height, attachment->getHeight());
        }
    }

    for (auto &subpass : _subpasses) {
        rpInfo.subpasses.emplace_back(subpass.desc);
    }

    passDependency(rpInfo);

    _renderPass = RenderPass(rpInfo);
    _renderPass.createTransient();
    _resourceTable._renderPass = _renderPass.get();

    fboInfo.renderPass = _renderPass.get();
    _fbo = Framebuffer(fboInfo);
    _fbo.createTransient();

    cmdBuff->beginRenderPass(_renderPass.get(), _fbo.get(), _scissor, clearColors.data(), clearDepth, clearStencil);
    cmdBuff->setViewport(_viewport);
    cmdBuff->setScissor(_scissor);
    _curViewport = _viewport;
    _curScissor = _scissor;
}

void DevicePass::next(gfx::CommandBuffer *cmdBuff) noexcept {
    if (!_renderPass.get() || !_fbo.get()) return;

    cmdBuff->nextSubpass();
}

void DevicePass::end(gfx::CommandBuffer *cmdBuff) {
    if (!_renderPass.get() || !_fbo.get()) return;

    cmdBuff->endRenderPass();

    _renderPass.destroyTransient();
    _fbo.destroyTransient();
}

} // namespace framegraph
} // namespace cc
