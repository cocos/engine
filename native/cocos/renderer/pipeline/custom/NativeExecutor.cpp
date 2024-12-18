/****************************************************************************
 Copyright (c) 2022-2023 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

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

#include <boost/graph/depth_first_search.hpp>
#include <boost/graph/filtered_graph.hpp>
#include "FGDispatcherGraphs.h"
#include "LayoutGraphGraphs.h"
#include "NativeBuiltinUtils.h"
#include "NativeExecutorRenderGraph.h"
#include "NativePipelineTypes.h"
#include "PrivateTypes.h"
#include "RenderGraphGraphs.h"
#include "RenderGraphTypes.h"
#include "cocos/renderer/gfx-base/GFXDef-common.h"
#include "cocos/renderer/gfx-base/GFXDevice.h"
#include "cocos/renderer/pipeline/Define.h"
#include "cocos/renderer/pipeline/InstancedBuffer.h"
#include "cocos/renderer/pipeline/PipelineStateManager.h"
#include "cocos/scene/Model.h"
#include "cocos/scene/Octree.h"
#include "cocos/scene/Pass.h"
#include "cocos/scene/RenderScene.h"
#include "cocos/scene/Skybox.h"
#include "details/GraphView.h"
#include "details/GslUtils.h"
#include "details/Range.h"

#if CC_USE_GEOMETRY_RENDERER
    #include "cocos/renderer/pipeline/GeometryRenderer.h"
#endif

namespace cc {

namespace render {

namespace {

void clear(gfx::RenderPassInfo& info) {
    info.colorAttachments.clear();
    info.depthStencilAttachment = {};
    info.depthStencilResolveAttachment = {};
    info.subpasses.clear();
    info.dependencies.clear();
}

uint8_t getRasterViewPassInputSlot(const RasterView& view) {
    std::ignore = view;
    CC_EXPECTS(false); // not implemented yet
    return 0;
}

uint8_t getRasterViewPassOutputSlot(const RasterView& view) {
    std::ignore = view;
    CC_EXPECTS(false); // not implemented yet
    return 0;
}

uint32_t getRasterPassInputCount(const RasterPass& pass) {
    uint32_t numInputs = 0;
    for (const auto& [name, view] : pass.rasterViews) {
        if (view.accessType == AccessType::READ || view.accessType == AccessType::READ_WRITE) {
            ++numInputs;
        }
    }
    return numInputs;
}

uint32_t getRasterPassOutputCount(const RasterPass& pass) {
    uint32_t numOutputs = 0;
    for (const auto& [name, view] : pass.rasterViews) {
        if (view.attachmentType != AttachmentType::RENDER_TARGET) {
            continue;
        }
        if (view.accessType == AccessType::READ_WRITE || view.accessType == AccessType::WRITE) {
            ++numOutputs;
        }
    }
    return numOutputs;
}

uint32_t getRasterPassResolveCount(const RasterPass& pass) {
    std::ignore = pass;
    return 0;
}

uint32_t getRasterPassPreserveCount(const RasterPass& pass) {
    std::ignore = pass;
    return 0;
}

gfx::GeneralBarrier* getGeneralBarrier(gfx::Device* device, const RasterView& view) {
    if (view.accessType != AccessType::WRITE) { // Input
        return device->getGeneralBarrier({
            gfx::AccessFlagBit::COLOR_ATTACHMENT_READ,
            gfx::AccessFlagBit::COLOR_ATTACHMENT_READ,
        });
    }

    if (view.accessType != AccessType::READ) { // Output
        auto accessFlagBit = view.attachmentType == AttachmentType::RENDER_TARGET
                                 ? gfx::AccessFlagBit::COLOR_ATTACHMENT_WRITE
                                 : gfx::AccessFlagBit::DEPTH_STENCIL_ATTACHMENT_WRITE;
        return device->getGeneralBarrier({accessFlagBit, accessFlagBit});
    }
    return nullptr;
}

ResourceGraph::vertex_descriptor getResourceID(const ccstd::pmr::string& name, const FrameGraphDispatcher& fgd) {
    return fgd.realResourceID(name);
}

PersistentRenderPassAndFramebuffer createPersistentRenderPassAndFramebuffer(
    RenderGraphVisitorContext& ctx, const RasterPass& pass,
    boost::container::pmr::memory_resource* /*scratch*/) {
    auto& resg = ctx.resourceGraph;

    PersistentRenderPassAndFramebuffer data(pass.get_allocator());
    auto [rpInfo, fbInfo, clearColors, clearDepth, clearStencil] = ctx.fgd.getRenderPassAndFrameBuffer(ctx.currentInFlightPassID, resg);

    // CC_ENSURES(rpInfo.colorAttachments.size() == data.clearColors.size());
    CC_ENSURES(rpInfo.colorAttachments.size() == fbInfo.colorTextures.size());

    data.clearColors = std::move(clearColors);
    data.clearDepth = clearDepth;
    data.clearStencil = clearStencil;
    data.renderPass = ctx.device->createRenderPass(rpInfo);
    fbInfo.renderPass = data.renderPass;
    data.framebuffer = ctx.device->createFramebuffer(fbInfo);

    return data;
}

PersistentRenderPassAndFramebuffer& fetchOrCreateFramebuffer(
    RenderGraphVisitorContext& ctx, const RasterPass& pass,
    boost::container::pmr::memory_resource* scratch) {
    auto iter = ctx.resourceGraph.renderPasses.find(pass);
    if (iter == ctx.resourceGraph.renderPasses.end()) {
        bool added = false;
        std::tie(iter, added) = ctx.resourceGraph.renderPasses.emplace(
            pass, createPersistentRenderPassAndFramebuffer(ctx, pass, scratch));
        CC_ENSURES(added);
    }
    return iter->second;
}

void bindDescValue(gfx::DescriptorSet& desc, uint32_t binding, gfx::Buffer* value) {
    desc.bindBuffer(binding, value);
}

void bindDescValue(gfx::DescriptorSet& desc, uint32_t binding, gfx::Texture* value) {
    desc.bindTexture(binding, value);
}

void bindDescValue(gfx::DescriptorSet& desc, uint32_t binding, gfx::Sampler* value) {
    desc.bindSampler(binding, value);
}

template <class T>
void bindGlobalDesc(gfx::DescriptorSet& desc, uint32_t binding, T* value) {
    bindDescValue(desc, binding, value);
}

uint32_t getDescBinding(uint32_t descId, const DescriptorSetData& descData) {
    const auto& layoutData = descData;
    // find descriptor binding
    for (const auto& block : layoutData.descriptorSetLayoutData.descriptorBlocks) {
        for (uint32_t i = 0; i != block.descriptors.size(); ++i) {
            if (descId == block.descriptors[i].descriptorID.value) {
                return block.offset + i;
            }
        }
    }
    return 0xFFFFFFFF;
}

void updateGlobal(
    RenderGraphVisitorContext& ctx,
    DescriptorSetData& descriptorSetData,
    const RenderData& data,
    bool isUpdate = false) {
    const auto& constants = data.constants;
    const auto& samplers = data.samplers;
    const auto& textures = data.textures;
    auto& device = *ctx.device;
    auto& descriptorSet = *descriptorSetData.descriptorSet;
    for (const auto& [key, value] : constants) {
        const auto bindId = getDescBinding(key, descriptorSetData);
        if (bindId == INVALID_ID) {
            continue;
        }
        auto* buffer = descriptorSet.getBuffer(bindId);
        bool haveBuff = true;
        if (!buffer && !isUpdate) {
            gfx::BufferInfo info{
                gfx::BufferUsageBit::UNIFORM | gfx::BufferUsageBit::TRANSFER_DST,
                gfx::MemoryUsageBit::HOST | gfx::MemoryUsageBit::DEVICE,
                static_cast<uint32_t>(value.size()),
                static_cast<uint32_t>(value.size())};
            buffer = device.createBuffer(info);
            haveBuff = false;
        }
        CC_ENSURES(buffer);
        if (isUpdate) {
            buffer->update(value.data());
        }
        if (!haveBuff) {
            bindGlobalDesc(descriptorSet, bindId, buffer);
        }
    }
    for (const auto& [key, value] : textures) {
        const auto bindId = getDescBinding(key, descriptorSetData);
        if (bindId == INVALID_ID) {
            continue;
        }
        auto* tex = descriptorSet.getTexture(bindId);
        if (!tex || isUpdate) {
            bindGlobalDesc(descriptorSet, bindId, value.get());
        }
    }
    for (const auto& [key, value] : samplers) {
        const auto bindId = getDescBinding(key, descriptorSetData);
        if (bindId == INVALID_ID) {
            continue;
        }
        auto* sampler = descriptorSet.getSampler(bindId);
        if (!sampler || isUpdate) {
            bindGlobalDesc(descriptorSet, bindId, value);
        }
    }
}

void submitUICommands(
    gfx::RenderPass* renderPass,
    uint32_t phaseLayoutID,
    const scene::Camera* camera,
    gfx::CommandBuffer* cmdBuff) {
    const auto cameraVisFlags = camera->getVisibility();
    const auto& batches = camera->getScene()->getBatches();
    for (auto* batch : batches) {
        if (!(cameraVisFlags & batch->getVisFlags())) {
            continue;
        }
        const auto& passes = batch->getPasses();
        for (size_t i = 0; i < batch->getShaders().size(); ++i) {
            const scene::Pass* pass = passes[i];
            if (pass->getPhaseID() != phaseLayoutID) {
                continue;
            }
            auto* shader = batch->getShaders()[i];
            auto* inputAssembler = batch->getInputAssembler();
            auto* ds = batch->getDescriptorSet();
            auto* pso = pipeline::PipelineStateManager::getOrCreatePipelineState(
                pass, shader, inputAssembler, renderPass);
            cmdBuff->bindPipelineState(pso);
            cmdBuff->bindDescriptorSet(
                static_cast<uint32_t>(pipeline::SetIndex::MATERIAL),
                pass->getDescriptorSet());
            cmdBuff->bindInputAssembler(inputAssembler);
            cmdBuff->bindDescriptorSet(
                static_cast<uint32_t>(pipeline::SetIndex::LOCAL), ds);
            cmdBuff->draw(batch->getDrawInfo());
        }
    }
}

void submitProfilerCommands(
    RenderGraphVisitorContext& ctx,
    RenderGraph::vertex_descriptor vertID,
    const RasterPass& rasterPass) {
    const auto* profiler = ctx.ppl->getProfiler();
    if (!profiler || !profiler->isEnabled()) {
        return;
    }
    auto* renderPass = ctx.currentPass;
    auto* cmdBuff = ctx.cmdBuff;
    const auto& submodel = profiler->getSubModels()[0];
    auto* pass = submodel->getPass(0);
    auto* ia = submodel->getInputAssembler();
    auto* pso = pipeline::PipelineStateManager::getOrCreatePipelineState(
        pass, submodel->getShader(0), ia, renderPass);

    // profiler pass
    gfx::Viewport profilerViewport{};
    gfx::Rect profilerScissor{};
    profilerViewport.width = profilerScissor.width = rasterPass.width;
    profilerViewport.height = profilerScissor.height = rasterPass.height;
    cmdBuff->setViewport(profilerViewport);
    cmdBuff->setScissor(profilerScissor);

    auto* passSet = ctx.profilerPerPassDescriptorSets.at(vertID);
    CC_ENSURES(passSet);

    cmdBuff->bindPipelineState(pso);
    cmdBuff->bindDescriptorSet(static_cast<uint32_t>(pipeline::SetIndex::GLOBAL), passSet);
    cmdBuff->bindDescriptorSet(static_cast<uint32_t>(pipeline::SetIndex::MATERIAL), pass->getDescriptorSet());
    cmdBuff->bindDescriptorSet(static_cast<uint32_t>(pipeline::SetIndex::LOCAL), submodel->getDescriptorSet());
    cmdBuff->bindInputAssembler(ia);
    cmdBuff->draw(ia);
}

struct RenderGraphVisitor : boost::dfs_visitor<> {
    void submitBarriers(const std::vector<Barrier>& barriers) const {
        auto& resg = ctx.resourceGraph;
        auto sz = barriers.size();
        ccstd::pmr::vector<const gfx::Buffer*> buffers(ctx.scratch);
        ccstd::pmr::vector<const gfx::BufferBarrier*> bufferBarriers(ctx.scratch);
        ccstd::pmr::vector<const gfx::Texture*> textures(ctx.scratch);
        ccstd::pmr::vector<const gfx::TextureBarrier*> textureBarriers(ctx.scratch);
        buffers.reserve(sz);
        bufferBarriers.reserve(sz);
        textures.reserve(sz);
        textureBarriers.reserve(sz);
        for (const auto& barrier : barriers) {
            const auto resID = barrier.resourceID;
            const auto& desc = get(ResourceGraph::DescTag{}, resg, resID);
            const auto& resource = get(ResourceGraph::DescTag{}, resg, resID);
            switch (desc.dimension) {
                case ResourceDimension::BUFFER: {
                    auto* buffer = resg.getBuffer(resID);
                    const auto* bufferBarrier = static_cast<gfx::BufferBarrier*>(barrier.barrier);
                    buffers.emplace_back(buffer);
                    bufferBarriers.emplace_back(bufferBarrier);
                    break;
                }
                case ResourceDimension::TEXTURE1D:
                case ResourceDimension::TEXTURE2D:
                case ResourceDimension::TEXTURE3D:
                default: {
                    auto* texture = resg.getTexture(resID);
                    const auto* textureBarrier = static_cast<gfx::TextureBarrier*>(barrier.barrier);
                    textures.emplace_back(texture);
                    textureBarriers.emplace_back(textureBarrier);
                    break;
                }
            }
        }

        CC_EXPECTS(buffers.size() == bufferBarriers.size());
        CC_EXPECTS(textures.size() == textureBarriers.size());

        ctx.cmdBuff->pipelineBarrier(
            nullptr,
            bufferBarriers.data(), buffers.data(), static_cast<uint32_t>(bufferBarriers.size()),
            textureBarriers.data(), textures.data(), static_cast<uint32_t>(textureBarriers.size()));
    }
    void frontBarriers(RenderGraph::vertex_descriptor vertID) const {
        const auto& barrier = ctx.fgd.getBarrier(vertID);
        if (!barrier.frontBarriers.empty()) {
            submitBarriers(barrier.frontBarriers);
        }
    }
    void rearBarriers(RenderGraph::vertex_descriptor vertID) const {
        const auto& barrier = ctx.fgd.getBarrier(vertID);
        if (!barrier.rearBarriers.empty()) {
            submitBarriers(barrier.rearBarriers);
        }
    }
    void tryBindPassDescriptorSet(RenderGraph::vertex_descriptor passOrSubpassID) const {
        auto iter = ctx.renderGraphDescriptorSet.find(passOrSubpassID);
        if (iter != ctx.renderGraphDescriptorSet.end()) {
            CC_ENSURES(get<0>(iter->second));
            ctx.cmdBuff->bindDescriptorSet(
                static_cast<uint32_t>(pipeline::SetIndex::GLOBAL),
                get<0>(iter->second));
        }
    }
    void tryBindQueueDescriptorSets(RenderGraph::vertex_descriptor queueID) const {
        auto iter = ctx.renderGraphDescriptorSet.find(queueID);
        if (iter != ctx.renderGraphDescriptorSet.end()) {
            const auto& [passSet, queueSet] = iter->second;
            CC_EXPECTS(passSet || queueSet);
            if (passSet) {
                ctx.cmdBuff->bindDescriptorSet(
                    static_cast<uint32_t>(pipeline::SetIndex::GLOBAL),
                    passSet);
            }
            if (queueSet) {
                static_assert(static_cast<uint32_t>(pipeline::SetIndex::COUNT) == 3);
                ctx.cmdBuff->bindDescriptorSet(
                    static_cast<uint32_t>(pipeline::SetIndex::COUNT),
                    queueSet);
            }
        }
    }
    void tryBindLeafOverwritePerPassDescriptorSet(RenderGraph::vertex_descriptor leafID) const {
        auto iter = ctx.renderGraphDescriptorSet.find(leafID);
        if (iter != ctx.renderGraphDescriptorSet.end()) {
            CC_ENSURES(get<0>(iter->second));
            ctx.cmdBuff->bindDescriptorSet(
                static_cast<uint32_t>(pipeline::SetIndex::GLOBAL),
                get<0>(iter->second));
        }
    }
    void tryBindUIOverwritePerPassDescriptorSet(RenderGraph::vertex_descriptor sceneID) const {
        auto iter = ctx.uiDescriptorSet.find(sceneID);
        if (iter != ctx.uiDescriptorSet.end()) {
            CC_EXPECTS(iter->second);
            ctx.cmdBuff->bindDescriptorSet(
                static_cast<uint32_t>(pipeline::SetIndex::GLOBAL),
                iter->second);
        }
    }
    void begin(const RasterPass& pass, RenderGraph::vertex_descriptor vertID) const {
        const auto& renderData = get(RenderGraph::DataTag{}, ctx.g, vertID);
        if (!renderData.custom.empty()) {
            const auto& passes = ctx.ppl->custom.renderPasses;
            auto iter = passes.find(renderData.custom);
            if (iter != passes.end()) {
                iter->second->beginRenderPass(ctx.customContext, vertID);
                return;
            }
        }

        // viewport
        auto vp = pass.viewport;
        if (vp.width == 0 && vp.height == 0) {
            vp.width = pass.width;
            vp.height = pass.height;
        }
        // scissor
        gfx::Rect scissor{vp.left, vp.top, vp.width, vp.height};
        // Do not across framebuffer boundary, otherwise vulkan will be device lost.
        scissor.x = std::max(scissor.x, 0);
        scissor.y = std::max(scissor.y, 0);
        scissor.width = std::min(scissor.width, pass.width - scissor.x);
        scissor.height = std::min(scissor.height, pass.height - scissor.y);

        // render pass
        {
            ctx.currentInFlightPassID = vertID;
            auto& res = fetchOrCreateFramebuffer(ctx, pass, ctx.scratch);
            const auto& data = res;
            auto* cmdBuff = ctx.cmdBuff;
            cmdBuff->beginRenderPass(
                data.renderPass.get(),
                data.framebuffer.get(),
                scissor, data.clearColors.data(),
                data.clearDepth, data.clearStencil);
            ctx.currentPass = data.renderPass.get();
        }

        // Set viewport
        {
            ctx.cmdBuff->setViewport(vp);
            ctx.viewportStack.emplace_back(vp);
        }

        // PerPass DescriptorSet
        tryBindPassDescriptorSet(vertID);
    }
    void begin(const RasterSubpass& subpass, RenderGraph::vertex_descriptor vertID) const { // NOLINT(readability-convert-member-functions-to-static)
#if CC_DEBUG
        ctx.cmdBuff->insertMarker(makeMarkerInfo(get(RenderGraph::NameTag{}, ctx.g, vertID).c_str(), RASTER_COLOR));
#endif

        const auto& renderData = get(RenderGraph::DataTag{}, ctx.g, vertID);
        if (!renderData.custom.empty()) {
            const auto& subpasses = ctx.ppl->custom.renderSubpasses;
            auto iter = subpasses.find(renderData.custom);
            if (iter != subpasses.end()) {
                iter->second->beginRenderSubpass(ctx.customContext, vertID);
                return;
            }
        }

        // PerPass DescriptorSet
        if (subpass.subpassID) {
            ctx.cmdBuff->nextSubpass();
        }
        tryBindPassDescriptorSet(vertID);
        ctx.subpassIndex = subpass.subpassID;
        // noop
    }
    void begin(const ComputeSubpass& subpass, RenderGraph::vertex_descriptor vertID) const { // NOLINT(readability-convert-member-functions-to-static)
        const auto& renderData = get(RenderGraph::DataTag{}, ctx.g, vertID);
        if (!renderData.custom.empty()) {
            const auto& subpasses = ctx.ppl->custom.computeSubpasses;
            auto iter = subpasses.find(renderData.custom);
            if (iter != subpasses.end()) {
                iter->second->beginComputeSubpass(ctx.customContext, vertID);
                return;
            }
        }

        std::ignore = subpass;
        std::ignore = vertID;
        // noop
    }
    void begin(const ComputePass& pass, RenderGraph::vertex_descriptor vertID) const { // NOLINT(readability-convert-member-functions-to-static)
#if CC_DEBUG
        ctx.cmdBuff->beginMarker(makeMarkerInfo(get(RenderGraph::NameTag{}, ctx.g, vertID).c_str(), COMPUTE_COLOR));
#endif

        const auto& renderData = get(RenderGraph::DataTag{}, ctx.g, vertID);
        if (!renderData.custom.empty()) {
            const auto& passes = ctx.ppl->custom.computePasses;
            auto iter = passes.find(renderData.custom);
            if (iter != passes.end()) {
                iter->second->beginComputePass(ctx.customContext, vertID);
                return;
            }
        }

        std::ignore = pass;
        std::ignore = vertID;
        for (const auto& [name, views] : pass.computeViews) {
            for (const auto& view : views) {
                if (view.clearFlags != gfx::ClearFlags::NONE) {
                    // clear resources
                }
            }
        }
        tryBindPassDescriptorSet(vertID);
    }
    void begin(const ResolvePass& pass, RenderGraph::vertex_descriptor vertID) const { // NOLINT(readability-convert-member-functions-to-static)
        std::ignore = pass;
        std::ignore = vertID;
        for (const auto& copy : pass.resolvePairs) {
            // TODO(zhenglong.zhou): resolve
        }
    }
    void copyTexture(
        const CopyPair& copy,
        ResourceGraph::vertex_descriptor srcID,
        ResourceGraph::vertex_descriptor dstID) const {
        auto& resg = ctx.resourceGraph;
        std::vector<gfx::TextureCopy> copyInfos(copy.mipLevels, gfx::TextureCopy{});

        gfx::Texture* srcTexture = resg.getTexture(srcID);
        gfx::Texture* dstTexture = resg.getTexture(dstID);
        CC_ENSURES(srcTexture);
        CC_ENSURES(dstTexture);
        if (!srcTexture || !dstTexture) {
            return;
        }
        const auto& srcInfo = srcTexture->getInfo();
        const auto& dstInfo = dstTexture->getInfo();
        CC_ENSURES(srcInfo.width == dstInfo.width);
        CC_ENSURES(srcInfo.height == dstInfo.height);
        CC_ENSURES(srcInfo.depth == dstInfo.depth);

        for (uint32_t i = 0; i < copy.mipLevels; ++i) {
            auto& copyInfo = copyInfos[i];
            copyInfo.srcSubres.mipLevel = copy.sourceMostDetailedMip + i;
            copyInfo.srcSubres.baseArrayLayer = copy.sourceFirstSlice;
            copyInfo.srcSubres.layerCount = copy.numSlices;

            copyInfo.dstSubres.mipLevel = copy.targetMostDetailedMip + i;
            copyInfo.dstSubres.baseArrayLayer = copy.targetFirstSlice;
            copyInfo.dstSubres.layerCount = copy.numSlices;

            copyInfo.srcOffset = {0, 0, 0};
            copyInfo.dstOffset = {0, 0, 0};
            copyInfo.extent = {srcInfo.width, srcInfo.height, srcInfo.depth};
        }

        ctx.cmdBuff->copyTexture(srcTexture, dstTexture, copyInfos.data(), static_cast<uint32_t>(copyInfos.size()));
    }
    void copyBuffer( // NOLINT(readability-convert-member-functions-to-static)
        const CopyPair& copy,
        ResourceGraph::vertex_descriptor srcID,
        ResourceGraph::vertex_descriptor dstID) const {
        // TODO(zhouzhenglong): add impl
        std::ignore = copy;
        std::ignore = srcID;
        std::ignore = dstID;
    }
    void uploadTexture( // NOLINT(readability-convert-member-functions-to-static)
        const UploadPair& upload,
        ResourceGraph::vertex_descriptor dstID) const {
        // TODO(zhouzhenglong): add impl
        std::ignore = upload;
        std::ignore = dstID;
    }
    void uploadBuffer(
        const UploadPair& upload,
        ResourceGraph::vertex_descriptor dstID) const {
        auto& resg = ctx.resourceGraph;
        gfx::Buffer* dstBuffer = resg.getBuffer(dstID);
        CC_ENSURES(dstBuffer);
        if (!dstBuffer) {
            return;
        }
        ctx.cmdBuff->updateBuffer(dstBuffer, upload.source.data(), static_cast<uint32_t>(upload.source.size()));
    }
    void begin(const CopyPass& pass, RenderGraph::vertex_descriptor vertID) const {
        std::ignore = pass;
        std::ignore = vertID;
        auto& resg = ctx.resourceGraph;

        // currently, only texture to texture supported.
        for (const auto& copy : pass.copyPairs) {
            auto srcID = findVertex(copy.source, resg);
            auto dstID = findVertex(copy.target, resg);
            CC_ENSURES(srcID != RenderGraph::null_vertex());
            CC_ENSURES(dstID != RenderGraph::null_vertex());
            if (srcID == RenderGraph::null_vertex() || dstID == RenderGraph::null_vertex()) {
                continue;
            }
            const bool sourceIsTexture = resg.isTexture(srcID);
            const bool targetIsTexture = resg.isTexture(dstID);
            CC_ENSURES(sourceIsTexture == targetIsTexture);
            if (sourceIsTexture != targetIsTexture) {
                continue;
            }
            if (targetIsTexture) {
                copyTexture(copy, srcID, dstID);
            } else {
                copyBuffer(copy, srcID, dstID);
            }
        }
        // copy from cpu
        for (const auto& upload : pass.uploadPairs) {
            auto dstID = findVertex(upload.target, resg);
            CC_ENSURES(dstID != RenderGraph::null_vertex());
            if (dstID == RenderGraph::null_vertex()) {
                continue;
            }
            const bool targetIsTexture = resg.isTexture(dstID);
            if (targetIsTexture) {
                uploadTexture(upload, dstID);
            } else {
                uploadBuffer(upload, dstID);
            }
        }
    }
    void begin(const MovePass& pass, RenderGraph::vertex_descriptor vertID) const { // NOLINT(readability-convert-member-functions-to-static)
        std::ignore = pass;
        std::ignore = vertID;
        // if fully optimized, move pass should have been removed from graph
        // here we just do copy
        for (const auto& copy : pass.movePairs) {
        }
    }
    void begin(const RaytracePass& pass, RenderGraph::vertex_descriptor vertID) const { // NOLINT(readability-convert-member-functions-to-static)
        std::ignore = pass;
        std::ignore = vertID;
        // not implemented yet
        CC_EXPECTS(false);
    }
    void begin(const RenderQueue& queue, RenderGraph::vertex_descriptor vertID) const { // NOLINT(readability-convert-member-functions-to-static)
#if CC_DEBUG
        ctx.cmdBuff->beginMarker(makeMarkerInfo(get(RenderGraph::NameTag{}, ctx.g, vertID).c_str(), RENDER_QUEUE_COLOR));
#endif

        const auto& renderData = get(RenderGraph::DataTag{}, ctx.g, vertID);
        if (!renderData.custom.empty()) {
            const auto& queues = ctx.ppl->custom.renderQueues;
            auto iter = queues.find(renderData.custom);
            if (iter != queues.end()) {
                iter->second->beginRenderQueue(ctx.customContext, vertID);
                return;
            }
        }

        if (queue.viewport.width != 0 && queue.viewport.height != 0) {
            ctx.cmdBuff->setViewport(queue.viewport);
            ctx.viewportStack.emplace_back(queue.viewport);
        } else {
            ctx.viewportStack.emplace_back();
        }

        tryBindQueueDescriptorSets(vertID);
    }
    void begin(const SceneData& sceneData, RenderGraph::vertex_descriptor sceneID) const { // NOLINT(readability-convert-member-functions-to-static)
        const auto* const camera = sceneData.camera;
        CC_EXPECTS(camera);
        if (camera) { // update camera data
            tryBindLeafOverwritePerPassDescriptorSet(sceneID);
        }
        const auto* scene = camera->getScene();
        const auto& queueDesc = ctx.context.sceneCulling.renderQueueQueryIndex.at(sceneID);
        const auto& queue = ctx.context.sceneCulling.renderQueues[queueDesc.renderQueueTarget.value];

        queue.recordCommands(ctx.cmdBuff, ctx.currentPass, 0, sceneData.flags);

#if CC_USE_GEOMETRY_RENDERER
        if (any(sceneData.flags & SceneFlags::GEOMETRY) &&
            camera && camera->getGeometryRenderer()) {
            camera->getGeometryRenderer()->render(
                ctx.currentPass, ctx.cmdBuff, ctx.ppl->getPipelineSceneData());
        }
#endif

        if (any(sceneData.flags & SceneFlags::REFLECTION_PROBE)) {
            queue.probeQueue.removeMacro();
        }
        if (any(sceneData.flags & SceneFlags::UI)) {
            const auto queueID = parent(sceneID, ctx.g);
            const auto& queueData = get(QueueTag{}, queueID, ctx.g);
            const auto passOrSubpassID = parent(queueID, ctx.g);
            // To render UI, the phase layout of the material Pass
            // must be PassLayout/'default'
            if (queueData.passLayoutID != LayoutGraphData::null_vertex()) {
                const auto phaseLayoutID = locate(queueData.passLayoutID, "default", ctx.lg);
                if (phaseLayoutID != LayoutGraphData::null_vertex()) {
                    tryBindUIOverwritePerPassDescriptorSet(sceneID);
                    submitUICommands(ctx.currentPass, phaseLayoutID, camera, ctx.cmdBuff);
                }
            } else {
                const auto passID = parent(passOrSubpassID, ctx.g);
                if (passID == RenderGraph::null_vertex()) { // Pass
                    const auto passLayoutID =
                        locate(LayoutGraphData::null_vertex(),
                               get(RenderGraph::LayoutTag{}, ctx.g, passOrSubpassID),
                               ctx.lg);
                    CC_ENSURES(passLayoutID != LayoutGraphData::null_vertex());
                    const auto phaseLayoutID = locate(passLayoutID, "default", ctx.lg);
                    if (phaseLayoutID != LayoutGraphData::null_vertex()) {
                        tryBindUIOverwritePerPassDescriptorSet(sceneID);
                        submitUICommands(ctx.currentPass, phaseLayoutID, camera, ctx.cmdBuff);
                    }
                } else { // Subpass
                    const auto subpassID = passOrSubpassID;
                    const auto& passLayoutName = get(RenderGraph::LayoutTag{}, ctx.g, passID);
                    const auto& subpassLayoutName = get(RenderGraph::LayoutTag{}, ctx.g, subpassID);
                    const auto subpassLayoutID =
                        subpassLayoutName.empty()
                            ? locate(LayoutGraphData::null_vertex(),
                                     get(RenderGraph::LayoutTag{}, ctx.g, passID),
                                     ctx.lg)
                            : locate(LayoutGraphData::null_vertex(),
                                     get(RenderGraph::LayoutTag{}, ctx.g, subpassID),
                                     ctx.lg);
                    CC_ENSURES(subpassLayoutID != LayoutGraphData::null_vertex());
                    const auto phaseLayoutID = locate(subpassLayoutID, "default", ctx.lg);
                    if (phaseLayoutID != LayoutGraphData::null_vertex()) {
                        tryBindUIOverwritePerPassDescriptorSet(sceneID);
                        submitUICommands(ctx.currentPass, phaseLayoutID, camera, ctx.cmdBuff);
                    }
                }
            }
        }
    }
    void begin(const Blit& blit, RenderGraph::vertex_descriptor vertID) const {
        const auto& renderData = get(RenderGraph::DataTag{}, ctx.g, vertID);
        if (!renderData.custom.empty()) {
            const auto& commands = ctx.ppl->custom.renderCommands;
            auto iter = commands.find(renderData.custom);
            if (iter != commands.end()) {
                iter->second->beginRenderCommand(ctx.customContext, vertID);
                return;
            }
        }

        const auto& programLib = *dynamic_cast<const NativeProgramLibrary*>(ctx.programLib);
        CC_EXPECTS(blit.material);
        CC_EXPECTS(blit.material->getPasses());
        if (blit.camera) {
            tryBindLeafOverwritePerPassDescriptorSet(vertID);
        }
        // get pass
        auto& pass = *blit.material->getPasses()->at(static_cast<size_t>(blit.passID));
        // get shader
        auto& shader = *pass.getShaderVariant();
        // get pso
        auto* pso = pipeline::PipelineStateManager::getOrCreatePipelineState(
            &pass, &shader, ctx.context.fullscreenQuad.quadIA.get(), ctx.currentPass, ctx.subpassIndex);
        if (!pso) {
            return;
        }
        // auto* perInstanceSet = ctx.perInstanceDescriptorSets.at(vertID);
        // execution
        ctx.cmdBuff->bindPipelineState(pso);
        ctx.cmdBuff->bindDescriptorSet(
            static_cast<uint32_t>(pipeline::SetIndex::MATERIAL), pass.getDescriptorSet());
        // ctx.cmdBuff->bindDescriptorSet(
        //     static_cast<uint32_t>(pipeline::SetIndex::LOCAL), perInstanceSet);
        ctx.cmdBuff->bindInputAssembler(ctx.context.fullscreenQuad.quadIA.get());
        ctx.cmdBuff->draw(ctx.context.fullscreenQuad.quadIA.get());
    }
    void begin(const Dispatch& dispatch, RenderGraph::vertex_descriptor vertID) const {
        std::ignore = vertID;
        auto& programLib = *ctx.programLib;
        CC_EXPECTS(dispatch.material);
        CC_EXPECTS(dispatch.material->getPasses());
        // get pass
        auto& pass = *dispatch.material->getPasses()->at(static_cast<size_t>(dispatch.passID));
        // get shader
        auto& shader = *pass.getShaderVariant();
        // get pso
        auto* pso = programLib.getComputePipelineState(
            pass.getDevice(), pass.getPhaseID(), pass.getProgram(), pass.getDefines(), nullptr);
        CC_EXPECTS(pso);
        //        auto* perInstanceSet = ctx.perInstanceDescriptorSets.at(vertID);
        // execution
        ctx.cmdBuff->bindPipelineState(pso);
        ctx.cmdBuff->bindDescriptorSet(
            static_cast<uint32_t>(pipeline::SetIndex::MATERIAL), pass.getDescriptorSet());
        //        ctx.cmdBuff->bindDescriptorSet(
        //            static_cast<uint32_t>(pipeline::SetIndex::LOCAL), perInstanceSet);
        ctx.cmdBuff->dispatch(gfx::DispatchInfo{
            dispatch.threadGroupCountX,
            dispatch.threadGroupCountY,
            dispatch.threadGroupCountZ,
        });
    }
    void begin(const ccstd::pmr::vector<ClearView>& pass, RenderGraph::vertex_descriptor vertID) const {
    }
    void begin(const gfx::Viewport& pass, RenderGraph::vertex_descriptor vertID) const {
    }
    void end(const RasterPass& pass, RenderGraph::vertex_descriptor vertID) const {
        CC_EXPECTS(ctx.viewportStack.size() == 1);

        const auto& renderData = get(RenderGraph::DataTag{}, ctx.g, vertID);
        if (!renderData.custom.empty()) {
            const auto& passes = ctx.ppl->custom.renderPasses;
            auto iter = passes.find(renderData.custom);
            if (iter != passes.end()) {
                iter->second->endRenderPass(ctx.customContext, vertID);
                return;
            }
        }

        if (pass.showStatistics) {
            submitProfilerCommands(ctx, vertID, pass);
        }
        ctx.cmdBuff->endRenderPass();
        ctx.currentPass = nullptr;
        ctx.viewportStack.pop_back();
        CC_ENSURES(ctx.viewportStack.empty());
    }
    void end(const RasterSubpass& subpass, RenderGraph::vertex_descriptor vertID) const { // NOLINT(readability-convert-member-functions-to-static)
        const auto& renderData = get(RenderGraph::DataTag{}, ctx.g, vertID);
        if (!renderData.custom.empty()) {
            const auto& subpasses = ctx.ppl->custom.renderSubpasses;
            auto iter = subpasses.find(renderData.custom);
            if (iter != subpasses.end()) {
                iter->second->endRenderSubpass(ctx.customContext, vertID);
                return;
            }
        }

        std::ignore = subpass;
        std::ignore = vertID;
        ctx.subpassIndex = 0;
        // noop
    }
    void end(const ComputeSubpass& subpass, RenderGraph::vertex_descriptor vertID) const { // NOLINT(readability-convert-member-functions-to-static)
        const auto& renderData = get(RenderGraph::DataTag{}, ctx.g, vertID);
        if (!renderData.custom.empty()) {
            const auto& subpasses = ctx.ppl->custom.computeSubpasses;
            auto iter = subpasses.find(renderData.custom);
            if (iter != subpasses.end()) {
                iter->second->endComputeSubpass(ctx.customContext, vertID);
                return;
            }
        }

        std::ignore = subpass;
        std::ignore = vertID;
        // noop
    }
    void end(const ComputePass& pass, RenderGraph::vertex_descriptor vertID) const {
        const auto& renderData = get(RenderGraph::DataTag{}, ctx.g, vertID);
        if (!renderData.custom.empty()) {
            const auto& passes = ctx.ppl->custom.computePasses;
            auto iter = passes.find(renderData.custom);
            if (iter != passes.end()) {
                iter->second->endComputePass(ctx.customContext, vertID);
                return;
            }
        }
#if CC_DEBUG
        ctx.cmdBuff->endMarker();
#endif
        std::ignore = pass;
    }
    void end(const ResolvePass& pass, RenderGraph::vertex_descriptor vertID) const {
    }
    void end(const CopyPass& pass, RenderGraph::vertex_descriptor vertID) const {
    }
    void end(const MovePass& pass, RenderGraph::vertex_descriptor vertID) const {
    }
    void end(const RaytracePass& pass, RenderGraph::vertex_descriptor vertID) const { // NOLINT(readability-convert-member-functions-to-static)
        std::ignore = pass;
        std::ignore = vertID;
        // not implemented yet
        CC_EXPECTS(false);
    }
    void end(const RenderQueue& pass, RenderGraph::vertex_descriptor vertID) const {
        const auto& renderData = get(RenderGraph::DataTag{}, ctx.g, vertID);
        if (!renderData.custom.empty()) {
            const auto& queues = ctx.ppl->custom.renderQueues;
            auto iter = queues.find(renderData.custom);
            if (iter != queues.end()) {
                iter->second->endRenderQueue(ctx.customContext, vertID);
                return;
            }
        }

        // Revert viewport
        CC_EXPECTS(ctx.viewportStack.size() > 1);
        if (ctx.viewportStack.back()) {
            for (size_t i = ctx.viewportStack.size() - 1; i-- > 0;) {
                const auto& vp = ctx.viewportStack[i];
                if (vp) {
                    ctx.cmdBuff->setViewport(*vp);
                    break;
                }
            }
        }
        ctx.viewportStack.pop_back();

#if CC_DEBUG
        ctx.cmdBuff->endMarker();
#endif
        std::ignore = pass;
    }
    void end(const SceneData& pass, RenderGraph::vertex_descriptor vertID) const {
    }
    void end(const Blit& pass, RenderGraph::vertex_descriptor vertID) const {
        const auto& renderData = get(RenderGraph::DataTag{}, ctx.g, vertID);
        if (!renderData.custom.empty()) {
            const auto& commands = ctx.ppl->custom.renderCommands;
            auto iter = commands.find(renderData.custom);
            if (iter != commands.end()) {
                iter->second->endRenderCommand(ctx.customContext, vertID);
                return;
            }
        }
        std::ignore = pass;
    }
    void end(const Dispatch& pass, RenderGraph::vertex_descriptor vertID) const {
    }
    void end(const ccstd::pmr::vector<ClearView>& pass, RenderGraph::vertex_descriptor vertID) const {
    }
    void end(const gfx::Viewport& pass, RenderGraph::vertex_descriptor vertID) const {
    }

    void mountResource(const ccstd::pmr::string& name) const { // NOLINT(misc-no-recursion)
        auto resIter = ctx.fgd.resourceAccessGraph.resourceIndex.find(name);
        if (resIter != ctx.fgd.resourceAccessGraph.resourceIndex.end()) {
            auto resID = resIter->second;
            auto& resg = ctx.resourceGraph;
            resg.mount(ctx.device, resID);
            for (const auto& subres : makeRange(children(resID, resg))) {
                const auto& subresName = get(ResourceGraph::NameTag{}, resg, subres.target);
                mountResource(subresName);
            }
        }
    }

    void mountResources(const Subpass& pass) const {
        // mount managed resources
        for (const auto& [name, view] : pass.rasterViews) {
            mountResource(name);
        }
        for (const auto& [name, views] : pass.computeViews) {
            mountResource(name);
        }
        for (const auto& resolve : pass.resolvePairs) {
            mountResource(resolve.target);
        }
    }

    void mountResources(const RasterPass& pass) const {
        // mount managed resources
        for (const auto& [name, view] : pass.rasterViews) {
            mountResource(name);
        }
        for (const auto& [name, views] : pass.computeViews) {
            mountResource(name);
        }
        for (const auto& subpass : pass.subpassGraph.subpasses) {
            mountResources(subpass);
        }
    }

    void mountResources(const ComputePass& pass) const {
        auto& resg = ctx.resourceGraph;
        PmrFlatSet<ResourceGraph::vertex_descriptor> mounted(ctx.scratch);
        for (const auto& [name, views] : pass.computeViews) {
            mountResource(name);
        }
    }

    void mountResources(const ComputeSubpass& pass) const {
        auto& resg = ctx.resourceGraph;
        PmrFlatSet<ResourceGraph::vertex_descriptor> mounted(ctx.scratch);
        for (const auto& [name, views] : pass.computeViews) {
            mountResource(name);
        }
    }

    void mountResources(const RaytracePass& pass) const {
        auto& resg = ctx.resourceGraph;
        PmrFlatSet<ResourceGraph::vertex_descriptor> mounted(ctx.scratch);
        for (const auto& [name, views] : pass.computeViews) {
            mountResource(name);
        }
    }

    void mountResources(const ResolvePass& pass) const {
        auto& resg = ctx.resourceGraph;
        PmrFlatSet<ResourceGraph::vertex_descriptor> mounted(ctx.scratch);
        for (const auto& pair : pass.resolvePairs) {
            mountResource(pair.source);
            mountResource(pair.target);
        }
    }

    void mountResources(const CopyPass& pass) const {
        auto& resg = ctx.resourceGraph;
        PmrFlatSet<ResourceGraph::vertex_descriptor> mounted(ctx.scratch);
        for (const auto& pair : pass.copyPairs) {
            mountResource(pair.source);
            mountResource(pair.target);
        }
        for (const auto& pair : pass.uploadPairs) {
            mountResource(pair.target);
        }
    }

    void mountResources(const MovePass& pass) const {
        // not supported yet
    }

    void discover_vertex(
        RenderGraph::vertex_descriptor vertID,
        const boost::filtered_graph<AddressableView<RenderGraph>, boost::keep_all, RenderGraphFilter>& gv) const {
        std::ignore = gv;

        visitObject(
            vertID, ctx.g,
            [&](const RasterPass& pass) {
#if CC_DEBUG
                ctx.cmdBuff->beginMarker(makeMarkerInfo(get(RenderGraph::NameTag{}, ctx.g, vertID).c_str(), RASTER_COLOR));
#endif
                mountResources(pass);

                NativePipeline::prepareDescriptors(ctx, vertID);

                // execute render pass
                frontBarriers(vertID);
                begin(pass, vertID);
            },
            [&](const RasterSubpass& subpass) {
                begin(subpass, vertID);
            },
            [&](const ComputeSubpass& subpass) {
                begin(subpass, vertID);
            },
            [&](const ComputePass& pass) {
                mountResources(pass);

                NativePipeline::prepareDescriptors(ctx, vertID);

                frontBarriers(vertID);
                begin(pass, vertID);
            },
            [&](const ResolvePass& pass) {
                mountResources(pass);
                frontBarriers(vertID);
                begin(pass, vertID);
            },
            [&](const CopyPass& pass) {
                mountResources(pass);
                frontBarriers(vertID);
                begin(pass, vertID);
            },
            [&](const MovePass& pass) {
                mountResources(pass);
                frontBarriers(vertID);
                begin(pass, vertID);
            },
            [&](const RaytracePass& pass) {
                mountResources(pass);
                frontBarriers(vertID);
                begin(pass, vertID);
            },
            [&](const auto& queue) {
                begin(queue, vertID);
            });
    }

    void finish_vertex(
        RenderGraph::vertex_descriptor vertID,
        const boost::filtered_graph<AddressableView<RenderGraph>, boost::keep_all, RenderGraphFilter>& gv) const {
        std::ignore = gv;
        visitObject(
            vertID, ctx.g,
            [&](const RasterPass& pass) {
                end(pass, vertID);
                rearBarriers(vertID);
#if CC_DEBUG
                ctx.cmdBuff->endMarker();
#endif
            },
            [&](const RasterSubpass& subpass) {
                end(subpass, vertID);
            },
            [&](const ComputeSubpass& subpass) {
                end(subpass, vertID);
            },
            [&](const ComputePass& pass) {
                end(pass, vertID);
                rearBarriers(vertID);
            },
            [&](const ResolvePass& pass) {
                end(pass, vertID);
                rearBarriers(vertID);
            },
            [&](const CopyPass& pass) {
                end(pass, vertID);
                rearBarriers(vertID);
            },
            [&](const MovePass& pass) {
                end(pass, vertID);
                rearBarriers(vertID);
            },
            [&](const RaytracePass& pass) {
                end(pass, vertID);
                rearBarriers(vertID);
            },
            [&](const auto& queue) {
                end(queue, vertID);
            });
    }

    RenderGraphVisitorContext& ctx;
};

struct RenderGraphCullVisitor : boost::dfs_visitor<> {
    void discover_vertex(
        // NOLINTNEXTLINE(misc-unused-parameters)
        RenderGraph::vertex_descriptor vertID, const AddressableView<RenderGraph>& gv) const {
        validPasses[vertID] = false;
    }
    ccstd::pmr::vector<bool>& validPasses;
};

struct ResourceCleaner {
    explicit ResourceCleaner(ResourceGraph& resourceGraphIn) noexcept
    : resourceGraph(resourceGraphIn),
      prevFenceValue(resourceGraph.nextFenceValue) {
        ++resourceGraph.nextFenceValue;
    }
    ResourceCleaner(const ResourceCleaner&) = delete;
    ResourceCleaner& operator=(const ResourceCleaner&) = delete;
    ~ResourceCleaner() noexcept {
        resourceGraph.unmount(prevFenceValue);
    }

    ResourceGraph& resourceGraph;
    uint64_t prevFenceValue = 0;
};

struct RenderGraphContextCleaner {
    explicit RenderGraphContextCleaner(NativeRenderContext& contextIn) noexcept
    : context(contextIn),
      prevFenceValue(context.nextFenceValue) {
        ++context.nextFenceValue;
        context.clearPreviousResources(prevFenceValue);
        context.renderSceneResources.clear();
        context.sceneCulling.clear();
    }
    RenderGraphContextCleaner(const RenderGraphContextCleaner&) = delete;
    RenderGraphContextCleaner& operator=(const RenderGraphContextCleaner&) = delete;
    ~RenderGraphContextCleaner() noexcept = default;
    NativeRenderContext& context;
    uint64_t prevFenceValue = 0;
};

struct CommandSubmitter {
    CommandSubmitter(gfx::Device* deviceIn, const std::vector<gfx::CommandBuffer*>& cmdBuffersIn)
    : device(deviceIn), cmdBuffers(cmdBuffersIn) {
        CC_EXPECTS(cmdBuffers.size() == 1);
        primaryCommandBuffer = cmdBuffers.at(0);
        primaryCommandBuffer->begin();
    }
    CommandSubmitter(const CommandSubmitter&) = delete;
    CommandSubmitter& operator=(const CommandSubmitter&) = delete;
    ~CommandSubmitter() noexcept {
        primaryCommandBuffer->end();
        device->flushCommands(cmdBuffers);
        device->getQueue()->submit(cmdBuffers);
    }
    gfx::Device* device = nullptr;
    const std::vector<gfx::CommandBuffer*>& cmdBuffers;
    gfx::CommandBuffer* primaryCommandBuffer = nullptr;
};

void extendResourceLifetime(const NativeRenderQueue& queue, ResourceGroup& group) {
    // keep instanceBuffers
    for (const auto& batch : queue.opaqueInstancingQueue.sortedBatches) {
        group.instancingBuffers.emplace(batch);
    }
    for (const auto& batch : queue.transparentInstancingQueue.sortedBatches) {
        group.instancingBuffers.emplace(batch);
    }
}

void collectStatistics(const NativePipeline& ppl, PipelineStatistics& stats) {
    // resources
    stats.numRenderPasses = static_cast<uint32_t>(ppl.resourceGraph.renderPasses.size());
    stats.totalManagedTextures = static_cast<uint32_t>(ppl.resourceGraph.managedTextures.size());
    stats.numManagedTextures = 0;
    for (const auto& tex : ppl.resourceGraph.managedTextures) {
        if (tex.texture) {
            ++stats.numManagedTextures;
        }
    }
    // layout graph
    stats.numUploadBuffers = 0;
    stats.numUploadBufferViews = 0;
    stats.numFreeUploadBuffers = 0;
    stats.numFreeUploadBufferViews = 0;
    stats.numDescriptorSets = 0;
    stats.numFreeDescriptorSets = 0;
    for (const auto& node : ppl.nativeContext.layoutGraphResources) {
        for (const auto& [nameID, buffer] : node.uniformBuffers) {
            stats.numUploadBuffers += static_cast<uint32_t>(buffer.bufferPool.currentBuffers.size());
            stats.numUploadBufferViews += static_cast<uint32_t>(buffer.bufferPool.currentBufferViews.size());
            stats.numFreeUploadBuffers += static_cast<uint32_t>(buffer.bufferPool.freeBuffers.size());
            stats.numFreeUploadBufferViews += static_cast<uint32_t>(buffer.bufferPool.freeBufferViews.size());
        }
        stats.numDescriptorSets += static_cast<uint32_t>(node.descriptorSetPool.currentDescriptorSets.size());
        stats.numFreeDescriptorSets += static_cast<uint32_t>(node.descriptorSetPool.freeDescriptorSets.size());
    }
    // scene
    stats.numInstancingBuffers = 0;
    stats.numInstancingUniformBlocks = 0;
    for (const auto& [key, group] : ppl.nativeContext.resourceGroups) {
        stats.numInstancingBuffers += group.instancingBuffers.size();
        for (const auto& buffer : group.instancingBuffers) {
            stats.numInstancingUniformBlocks += static_cast<uint32_t>(buffer->getInstances().size());
        }
    }
}

} // namespace

void NativePipeline::executeRenderGraph(const RenderGraph& rg) {
    auto& ppl = *this;
    auto* scratch = &ppl.unsyncPool;

    ppl.resourceGraph.validateSwapchains();

    RenderGraphContextCleaner contextCleaner(ppl.nativeContext);
    ResourceCleaner cleaner(ppl.resourceGraph);

    auto& lg = ppl.programLibrary->layoutGraph;
    FrameGraphDispatcher fgd(
        ppl.resourceGraph, rg,
        lg, &ppl.unsyncPool, scratch);
    fgd.enableMemoryAliasing(false);
    fgd.enablePassReorder(false);
    fgd.setParalellWeight(0);
    fgd.run();

    AddressableView<RenderGraph> graphView(rg);
    ccstd::pmr::vector<bool> validPasses(num_vertices(rg), true, scratch);
    auto colors = rg.colors(scratch);
    { // Mark all culled vertices
        RenderGraphCullVisitor visitor{{}, validPasses};
        for (const auto& vertID : fgd.resourceAccessGraph.culledPasses) {
            const auto nodeID = get(ResourceAccessGraph::PassIDTag{}, fgd.resourceAccessGraph, vertID);
            if (nodeID == RenderGraph::null_vertex()) {
                continue;
            }
            const auto passID = fgd.resourceAccessGraph.passIndex.at(nodeID);
            boost::depth_first_visit(graphView, passID, visitor, get(colors, rg));
        }
        colors.clear();
        colors.resize(num_vertices(rg), boost::white_color);
    }

    // scene culling
    {
        auto& context = ppl.nativeContext;
        auto& sceneCulling = context.sceneCulling;
        sceneCulling.buildRenderQueues(rg, lg, ppl);
        auto& group = ppl.nativeContext.resourceGroups[context.nextFenceValue];
        // notice: we cannot use ranged-for of sceneCulling.renderQueues
        CC_EXPECTS(sceneCulling.numRenderQueues <= sceneCulling.renderQueues.size());
        for (uint32_t queueID = 0; queueID != sceneCulling.numRenderQueues; ++queueID) {
            const auto& queue = sceneCulling.renderQueues[queueID];
            extendResourceLifetime(queue, group);
        }
    }

    // light manangement
    {
        auto& ctx = ppl.nativeContext;
        ctx.lightResources.clear();
        ctx.lightResources.buildLights(
            ctx.sceneCulling,
            ppl.pipelineSceneData->isHDR(),
            ppl.pipelineSceneData->getShadows());
    }

    // gpu driven
    if constexpr (ENABLE_GPU_DRIVEN) {
        // TODO(jilin): consider populating renderSceneResources here
        const scene::RenderScene* const ptr = nullptr;
        auto& sceneResource = ppl.nativeContext.renderSceneResources[ptr];
        const auto& nameID = lg.attributeIndex.find("cc_xxxDescriptor")->second;
        sceneResource.resourceIndex.emplace(nameID, ResourceType::STORAGE_BUFFER);
        sceneResource.storageBuffers.emplace(nameID, nullptr);
    }

    // Execute all valid passes
    {
        boost::filtered_graph<
            AddressableView<RenderGraph>,
            boost::keep_all, RenderGraphFilter>
            fg(graphView, boost::keep_all{}, RenderGraphFilter{&validPasses});

        CommandSubmitter submit(ppl.device, ppl.getCommandBuffers());

        // upload buffers
        {
            auto& ctx = ppl.nativeContext;
#if CC_DEBUG
            submit.primaryCommandBuffer->beginMarker(makeMarkerInfo("Internal Upload", RASTER_UPLOAD_COLOR));
#endif
            // scene
            const auto& sceneCulling = ppl.nativeContext.sceneCulling;
            for (uint32_t queueID = 0; queueID != sceneCulling.numRenderQueues; ++queueID) {
                // notice: we cannot use ranged-for of sceneCulling.renderQueues
                CC_EXPECTS(sceneCulling.numRenderQueues <= sceneCulling.renderQueues.size());
                const auto& queue = sceneCulling.renderQueues[queueID];
                queue.opaqueInstancingQueue.uploadBuffers(submit.primaryCommandBuffer);
                queue.transparentInstancingQueue.uploadBuffers(submit.primaryCommandBuffer);
            }

            // lights
            ctx.lightResources.buildLightBuffer(submit.primaryCommandBuffer);
            ctx.lightResources.tryUpdateRenderSceneLocalDescriptorSet(sceneCulling);
#if CC_DEBUG
            submit.primaryCommandBuffer->endMarker();
#endif
        }

        ccstd::pmr::unordered_map<
            RenderGraph::vertex_descriptor,
            PmrFlatMap<NameLocalID, ResourceGraph::vertex_descriptor>>
            perPassResourceIndex(scratch);

        ccstd::pmr::unordered_map<
            RenderGraph::vertex_descriptor,
            std::tuple<gfx::DescriptorSet*, gfx::DescriptorSet*>>
            renderGraphDescriptorSet(scratch);

        ccstd::pmr::unordered_map<
            RenderGraph::vertex_descriptor, gfx::DescriptorSet*>
            uiDescriptorSet(scratch);

        ccstd::pmr::unordered_map<
            RenderGraph::vertex_descriptor,
            gfx::DescriptorSet*>
            profilerPerPassDescriptorSets(scratch);

        ccstd::pmr::unordered_map<
            RenderGraph::vertex_descriptor,
            gfx::DescriptorSet*>
            perInstanceDescriptorSets(scratch);

        ccstd::pmr::vector<ccstd::optional<gfx::Viewport>> viewportStack(scratch);
        viewportStack.reserve(4);

        // submit commands
        RenderGraphVisitorContext ctx{
            ppl.nativeContext,
            lg, rg, ppl.resourceGraph,
            fgd,
            validPasses,
            ppl.device, submit.primaryCommandBuffer,
            &ppl,
            perPassResourceIndex,
            renderGraphDescriptorSet,
            uiDescriptorSet,
            profilerPerPassDescriptorSets,
            perInstanceDescriptorSets,
            programLibrary,
            viewportStack,
            CustomRenderGraphContext{
                custom.currentContext,
                &rg,
                &ppl.resourceGraph,
                submit.primaryCommandBuffer,
            },
            scratch};

        RenderGraphVisitor visitor{{}, ctx};
        auto colors = rg.colors(scratch);
        for (const auto vertID : ctx.g.sortedVertices) {
            if (holds<RasterPassTag>(vertID, ctx.g) || holds<ComputeTag>(vertID, ctx.g) || holds<CopyTag>(vertID, ctx.g)) {
                boost::depth_first_visit(fg, vertID, visitor, get(colors, ctx.g));
            }
        }
    }

    // collect statistics
    collectStatistics(*this, statistics);
}

} // namespace render

} // namespace cc
