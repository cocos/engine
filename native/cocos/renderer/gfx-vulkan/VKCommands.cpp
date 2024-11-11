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

#include <algorithm>
#include <boost/functional/hash.hpp>
#include <thread>
#include "VKStd.h"
#include "base/std/container/map.h"
#include "base/std/container/unordered_map.h"
#include "base/std/container/unordered_set.h"

#include "VKCommands.h"

#include "VKBuffer.h"
#include "VKDevice.h"
#include "VKGPUObjects.h"
#include "VKPipelineCache.h"
#include "gfx-base/GFXDef.h"
#include "states/VKBufferBarrier.h"
#include "states/VKGeneralBarrier.h"
#include "states/VKTextureBarrier.h"

#include "gfx-base/SPIRVUtils.h"
#include "vulkan/vulkan_core.h"

namespace cc {
namespace gfx {

namespace {
constexpr bool ENABLE_LAZY_ALLOCATION = true;
} // namespace

CCVKGPUCommandBufferPool *CCVKGPUDevice::getCommandBufferPool() {
    static thread_local size_t threadID = std::hash<std::thread::id>{}(std::this_thread::get_id());
    if (!_commandBufferPools.count(threadID)) {
        _commandBufferPools[threadID] = ccnew CCVKGPUCommandBufferPool(this);
    }
    return _commandBufferPools[threadID];
}

CCVKGPUDescriptorSetPool *CCVKGPUDevice::getDescriptorSetPool(uint32_t layoutID) {
    if (_descriptorSetPools.find(layoutID) == _descriptorSetPools.end()) {
        _descriptorSetPools[layoutID] = std::make_unique<CCVKGPUDescriptorSetPool>();
    }
    return _descriptorSetPools[layoutID].get();
}

void insertVkDynamicStates(ccstd::vector<VkDynamicState> *out, const ccstd::vector<DynamicStateFlagBit> &dynamicStates) {
    for (DynamicStateFlagBit dynamicState : dynamicStates) {
        switch (dynamicState) {
            case DynamicStateFlagBit::LINE_WIDTH: out->push_back(VK_DYNAMIC_STATE_LINE_WIDTH); break;
            case DynamicStateFlagBit::DEPTH_BIAS: out->push_back(VK_DYNAMIC_STATE_DEPTH_BIAS); break;
            case DynamicStateFlagBit::BLEND_CONSTANTS: out->push_back(VK_DYNAMIC_STATE_BLEND_CONSTANTS); break;
            case DynamicStateFlagBit::DEPTH_BOUNDS: out->push_back(VK_DYNAMIC_STATE_DEPTH_BOUNDS); break;
            case DynamicStateFlagBit::STENCIL_WRITE_MASK: out->push_back(VK_DYNAMIC_STATE_STENCIL_WRITE_MASK); break;
            case DynamicStateFlagBit::STENCIL_COMPARE_MASK:
                out->push_back(VK_DYNAMIC_STATE_STENCIL_REFERENCE);
                out->push_back(VK_DYNAMIC_STATE_STENCIL_COMPARE_MASK);
                break;
            default: {
                CC_ABORT();
                break;
            }
        }
    }
}

void cmdFuncCCVKGetDeviceQueue(CCVKDevice *device, CCVKGPUQueue *gpuQueue) {
    if (gpuQueue->possibleQueueFamilyIndices.empty()) {
        uint32_t queueType = 0U;
        switch (gpuQueue->type) {
            case QueueType::GRAPHICS: queueType = VK_QUEUE_GRAPHICS_BIT; break;
            case QueueType::COMPUTE: queueType = VK_QUEUE_COMPUTE_BIT; break;
            case QueueType::TRANSFER: queueType = VK_QUEUE_TRANSFER_BIT; break;
        }

        const CCVKGPUContext *context = device->gpuContext();

        uint32_t queueCount = utils::toUint(context->queueFamilyProperties.size());
        for (uint32_t i = 0U; i < queueCount; ++i) {
            const VkQueueFamilyProperties &properties = context->queueFamilyProperties[i];
            if (properties.queueCount > 0 && (properties.queueFlags & queueType)) {
                gpuQueue->possibleQueueFamilyIndices.push_back(i);
            }
        }
    }

    vkGetDeviceQueue(device->gpuDevice()->vkDevice, gpuQueue->possibleQueueFamilyIndices[0], 0, &gpuQueue->vkQueue);
    gpuQueue->queueFamilyIndex = gpuQueue->possibleQueueFamilyIndices[0];
}

void cmdFuncCCVKCreateQueryPool(CCVKDevice *device, CCVKGPUQueryPool *gpuQueryPool) {
    VkQueryPoolCreateInfo queryPoolInfo = {};
    queryPoolInfo.sType = VK_STRUCTURE_TYPE_QUERY_POOL_CREATE_INFO;
    queryPoolInfo.queryType = mapVkQueryType(gpuQueryPool->type);
    queryPoolInfo.queryCount = gpuQueryPool->maxQueryObjects;
    VK_CHECK(vkCreateQueryPool(device->gpuDevice()->vkDevice, &queryPoolInfo, nullptr, &gpuQueryPool->vkPool));
}

void cmdFuncCCVKCreateTexture(CCVKDevice *device, CCVKGPUTexture *gpuTexture) {
    if (!gpuTexture->size) return;

    gpuTexture->aspectMask = mapVkImageAspectFlags(gpuTexture->format);
    auto createFn = [device, gpuTexture](VkImage *pVkImage, VmaAllocation *pVmaAllocation) {
        VkFormat vkFormat = mapVkFormat(gpuTexture->format, device->gpuDevice());
        VkFormatFeatureFlags features = mapVkFormatFeatureFlags(gpuTexture->usage);
        VkFormatProperties formatProperties;
        vkGetPhysicalDeviceFormatProperties(device->gpuContext()->physicalDevice, vkFormat, &formatProperties);
        if (!(formatProperties.optimalTilingFeatures & features)) {
            const char *formatName = GFX_FORMAT_INFOS[toNumber(gpuTexture->format)].name.c_str();
            CC_LOG_ERROR("cmdFuncCCVKCreateTexture: The specified usage for %s is not supported on this platform", formatName);
            return;
        }

        VkImageUsageFlags usageFlags = mapVkImageUsageFlags(gpuTexture->usage, gpuTexture->flags);

        VkImageCreateInfo createInfo{VK_STRUCTURE_TYPE_IMAGE_CREATE_INFO};
        createInfo.flags = mapVkImageCreateFlags(gpuTexture->type);
        createInfo.imageType = mapVkImageType(gpuTexture->type);
        createInfo.format = vkFormat;
        createInfo.extent = {gpuTexture->width, gpuTexture->height, gpuTexture->depth};
        createInfo.mipLevels = gpuTexture->mipLevels;
        createInfo.arrayLayers = gpuTexture->arrayLayers;
        createInfo.samples = static_cast<VkSampleCountFlagBits>(gpuTexture->samples);
        createInfo.tiling = VK_IMAGE_TILING_OPTIMAL;
        createInfo.usage = usageFlags;
        createInfo.initialLayout = VK_IMAGE_LAYOUT_UNDEFINED;

        VmaAllocationCreateInfo allocInfo{};
        allocInfo.usage = VMA_MEMORY_USAGE_GPU_ONLY;

        VmaAllocationInfo res;
        const VkFlags lazilyAllocatedFilterFlags = VK_IMAGE_USAGE_COLOR_ATTACHMENT_BIT |
                                                   VK_IMAGE_USAGE_DEPTH_STENCIL_ATTACHMENT_BIT |
                                                   VK_IMAGE_USAGE_INPUT_ATTACHMENT_BIT |
                                                   VK_IMAGE_USAGE_TRANSIENT_ATTACHMENT_BIT;
        if (hasFlag(gpuTexture->flags, TextureFlagBit::LAZILY_ALLOCATED) &&
            (lazilyAllocatedFilterFlags & usageFlags) == usageFlags) {
            allocInfo.usage = VMA_MEMORY_USAGE_GPU_LAZILY_ALLOCATED;
            VkResult result = vmaCreateImage(device->gpuDevice()->memoryAllocator, &createInfo, &allocInfo,
                                             pVkImage, pVmaAllocation, &res);
            if (!result) {
                gpuTexture->memoryAllocated = false;
                return;
            }

            // feature not present, fallback to device memory
            allocInfo.usage = VMA_MEMORY_USAGE_GPU_ONLY;
        }

        gpuTexture->memoryAllocated = true;
        VK_CHECK(vmaCreateImage(device->gpuDevice()->memoryAllocator, &createInfo, &allocInfo,
                                pVkImage, pVmaAllocation, &res));
    };

    if (gpuTexture->swapchain) {
        size_t backBufferCount = gpuTexture->swapchain->swapchainImages.size();
        gpuTexture->swapchainVkImages.resize(backBufferCount);
        if (GFX_FORMAT_INFOS[toNumber(gpuTexture->format)].hasDepth) {
            gpuTexture->swapchainVmaAllocations.resize(backBufferCount);
            for (size_t i = 0; i < backBufferCount; ++i) {
                createFn(&gpuTexture->swapchainVkImages[i], &gpuTexture->swapchainVmaAllocations[i]);
            }
        } else {
            for (size_t i = 0; i < backBufferCount; ++i) {
                gpuTexture->swapchainVkImages[i] = gpuTexture->swapchain->swapchainImages[i];
            }
        }
        gpuTexture->memoryAllocated = false;
    } else if (hasFlag(gpuTexture->flags, TextureFlagBit::EXTERNAL_OES) || hasFlag(gpuTexture->flags, TextureFlagBit::EXTERNAL_NORMAL)) {
        gpuTexture->vkImage = gpuTexture->externalVKImage;
    } else {
        createFn(&gpuTexture->vkImage, &gpuTexture->vmaAllocation);
    }
}

void cmdFuncCCVKCreateTextureView(CCVKDevice *device, CCVKGPUTextureView *gpuTextureView) {
    if (!gpuTextureView->gpuTexture) return;

    auto createFn = [device, gpuTextureView](VkImage vkImage, VkImageView *pVkImageView) {
        auto format = gpuTextureView->format;
        auto mapAspect = [](CCVKGPUTextureView *gpuTextureView) {
            auto aspectMask = gpuTextureView->gpuTexture->aspectMask;
            if (gpuTextureView->gpuTexture->format == Format::DEPTH_STENCIL) {
                uint32_t planeIndex = gpuTextureView->basePlane;
                uint32_t planeCount = gpuTextureView->planeCount;
                aspectMask = VK_IMAGE_ASPECT_DEPTH_BIT << planeIndex;
                CC_ASSERT(planeIndex + planeCount <= 2);
                CC_ASSERT(planeCount > 0);
                while (planeCount && --planeCount) {
                    aspectMask |= (aspectMask << 1);
                }
            }
            return aspectMask;
        };

        VkImageViewCreateInfo createInfo{VK_STRUCTURE_TYPE_IMAGE_VIEW_CREATE_INFO};
        createInfo.image = vkImage;
        createInfo.viewType = mapVkImageViewType(gpuTextureView->type);
        createInfo.subresourceRange.aspectMask = mapAspect(gpuTextureView);
        createInfo.subresourceRange.baseMipLevel = gpuTextureView->baseLevel;
        createInfo.subresourceRange.levelCount = gpuTextureView->levelCount;
        createInfo.subresourceRange.baseArrayLayer = gpuTextureView->baseLayer;
        createInfo.subresourceRange.layerCount = gpuTextureView->layerCount;
        createInfo.format = mapVkFormat(format, device->gpuDevice());

        VK_CHECK(vkCreateImageView(device->gpuDevice()->vkDevice, &createInfo, nullptr, pVkImageView));
    };

    if (gpuTextureView->gpuTexture->swapchain) {
        size_t backBufferCount = gpuTextureView->gpuTexture->swapchain->swapchainImages.size();
        gpuTextureView->swapchainVkImageViews.resize(backBufferCount);
        for (size_t i = 0; i < backBufferCount; ++i) {
            createFn(gpuTextureView->gpuTexture->swapchainVkImages[i], &gpuTextureView->swapchainVkImageViews[i]);
        }
    } else if (gpuTextureView->gpuTexture->vkImage) {
        createFn(gpuTextureView->gpuTexture->vkImage, &gpuTextureView->vkImageView);
    }
}

void cmdFuncCCVKCreateSampler(CCVKDevice *device, CCVKGPUSampler *gpuSampler) {
    VkSamplerCreateInfo createInfo{VK_STRUCTURE_TYPE_SAMPLER_CREATE_INFO};
    CCVKGPUContext *context = device->gpuContext();
    float maxAnisotropy = context->physicalDeviceProperties.limits.maxSamplerAnisotropy;

    createInfo.magFilter = VK_FILTERS[toNumber(gpuSampler->magFilter)];
    createInfo.minFilter = VK_FILTERS[toNumber(gpuSampler->minFilter)];
    createInfo.mipmapMode = VK_SAMPLER_MIPMAP_MODES[toNumber(gpuSampler->mipFilter)];
    createInfo.addressModeU = VK_SAMPLER_ADDRESS_MODES[toNumber(gpuSampler->addressU)];
    createInfo.addressModeV = VK_SAMPLER_ADDRESS_MODES[toNumber(gpuSampler->addressV)];
    createInfo.addressModeW = VK_SAMPLER_ADDRESS_MODES[toNumber(gpuSampler->addressW)];
    createInfo.mipLodBias = 0.F;
    createInfo.anisotropyEnable = gpuSampler->maxAnisotropy && context->physicalDeviceFeatures.samplerAnisotropy;
    createInfo.maxAnisotropy = std::min(maxAnisotropy, static_cast<float>(gpuSampler->maxAnisotropy));
    createInfo.compareEnable = gpuSampler->cmpFunc != ComparisonFunc::ALWAYS;
    createInfo.compareOp = VK_CMP_FUNCS[toNumber(gpuSampler->cmpFunc)];
    // From UNASSIGNED-BestPractices-vkCreateSampler-lod-clamping:
    // Should use image views with baseMipLevel & levelCount in favor of this
    createInfo.minLod = 0.0;
    createInfo.maxLod = VK_LOD_CLAMP_NONE;

    VK_CHECK(vkCreateSampler(device->gpuDevice()->vkDevice, &createInfo, nullptr, &gpuSampler->vkSampler));
}

void cmdFuncCCVKCreateBuffer(CCVKDevice *device, CCVKGPUBuffer *gpuBuffer) {
    if (!gpuBuffer->size) {
        return;
    }

    gpuBuffer->instanceSize = 0U;

    VkBufferCreateInfo bufferInfo{VK_STRUCTURE_TYPE_BUFFER_CREATE_INFO};
    bufferInfo.size = gpuBuffer->size;

    /*
     * VUID-VkBufferDeviceAddressInfo-buffer-02600
     * If buffer is non-sparse and was not created with the VK_BUFFER_CREATE_DEVICE_ADDRESS_CAPTURE_REPLAY_BIT flag, 
     * then it must be bound completely and contiguously to a single VkDeviceMemory object
    */
    bufferInfo.usage = mapVkBufferUsageFlagBits(gpuBuffer->usage) | VK_BUFFER_USAGE_SHADER_DEVICE_ADDRESS_BIT;

    if (hasAnyFlags(gpuBuffer->usage,BufferUsageBit::VERTEX|BufferUsageBit::INDEX)) {
        bufferInfo.usage |= VK_BUFFER_USAGE_ACCELERATION_STRUCTURE_BUILD_INPUT_READ_ONLY_BIT_KHR;
    }

    VmaAllocationCreateInfo allocInfo{};

    if (hasAnyFlags(gpuBuffer->usage, BufferUsageBit::ACCELERATION_STRUCTURE_BUILD_SCRATCH)) {
        /*
         * VUID-vkCmdBuildAccelerationStructuresKHR-pInfos-03710
         * For each element of pInfos,
         * its scratchData.deviceAddress member must be a multiple of
         * VkPhysicalDeviceAccelerationStructurePropertiesKHR::minAccelerationStructureScratchOffsetAlignment
         */
        

        VkBufferCreateInfo info{VK_STRUCTURE_TYPE_BUFFER_CREATE_INFO};
        info.size = gpuBuffer->size;
        info.usage = VK_BUFFER_USAGE_STORAGE_BUFFER_BIT | VK_BUFFER_USAGE_SHADER_DEVICE_ADDRESS_BIT;
        VK_CHECK(vkCreateBuffer(device->gpuDevice()->vkDevice,&info,nullptr,&gpuBuffer->vkBuffer));

        VkMemoryRequirements memReq;
        vkGetBufferMemoryRequirements(device->gpuDevice()->vkDevice,gpuBuffer->vkBuffer,&memReq);
        memReq.alignment = device->gpuContext()->physicalDeviceAccelerationStructureProperties.minAccelerationStructureScratchOffsetAlignment;

        allocInfo.usage = VMA_MEMORY_USAGE_GPU_ONLY;
        

        VmaAllocationInfo res;
        VK_CHECK(vmaAllocateMemory(device->gpuDevice()->memoryAllocator, &memReq, &allocInfo, &gpuBuffer->vmaAllocation, &res));

        VK_CHECK(vmaBindBufferMemory(device->gpuDevice()->memoryAllocator, gpuBuffer->vmaAllocation, gpuBuffer->vkBuffer));

        return;
    }

    if (gpuBuffer->memUsage == MemoryUsage::HOST) {
        bufferInfo.usage |= VK_BUFFER_USAGE_TRANSFER_SRC_BIT;
        allocInfo.flags = VMA_ALLOCATION_CREATE_MAPPED_BIT;
        allocInfo.usage = VMA_MEMORY_USAGE_CPU_ONLY;
    } else if (gpuBuffer->memUsage == MemoryUsage::DEVICE) {
        bufferInfo.usage |= VK_BUFFER_USAGE_TRANSFER_DST_BIT;
        allocInfo.usage = VMA_MEMORY_USAGE_GPU_ONLY;
    } else if (gpuBuffer->memUsage == (MemoryUsage::HOST | MemoryUsage::DEVICE)) {
        gpuBuffer->instanceSize = roundUp(gpuBuffer->size, device->getCapabilities().uboOffsetAlignment);
        bufferInfo.size = gpuBuffer->instanceSize * device->gpuDevice()->backBufferCount;
        allocInfo.flags = VMA_ALLOCATION_CREATE_MAPPED_BIT;
        allocInfo.usage = VMA_MEMORY_USAGE_CPU_TO_GPU;
        bufferInfo.usage |= VK_BUFFER_USAGE_TRANSFER_DST_BIT | VK_BUFFER_USAGE_TRANSFER_SRC_BIT;
    }

    VmaAllocationInfo res;
    VK_CHECK(vmaCreateBuffer(device->gpuDevice()->memoryAllocator, &bufferInfo, &allocInfo,
                             &gpuBuffer->vkBuffer, &gpuBuffer->vmaAllocation, &res));

    gpuBuffer->mappedData = reinterpret_cast<uint8_t *>(res.pMappedData);

    // add special access types directly from usage
    if (hasFlag(gpuBuffer->usage, BufferUsageBit::VERTEX)) gpuBuffer->renderAccessTypes.push_back(THSVS_ACCESS_VERTEX_BUFFER);
    if (hasFlag(gpuBuffer->usage, BufferUsageBit::INDEX)) gpuBuffer->renderAccessTypes.push_back(THSVS_ACCESS_INDEX_BUFFER);
    if (hasFlag(gpuBuffer->usage, BufferUsageBit::INDIRECT)) gpuBuffer->renderAccessTypes.push_back(THSVS_ACCESS_INDIRECT_BUFFER);
}

struct AttachmentStatistics final {
    enum class SubpassUsage {
        COLOR = 0x1,
        COLOR_RESOLVE = 0x2,
        DEPTH = 0x4,
        DEPTH_RESOLVE = 0x8,
        INPUT = 0x10,
        SHADING_RATE = 0x20,
    };
    struct SubpassRef final {
        VkImageLayout layout{VK_IMAGE_LAYOUT_UNDEFINED};
        SubpassUsage usage{SubpassUsage::COLOR};

        bool hasDepth() const { return usage == SubpassUsage::DEPTH || usage == SubpassUsage::DEPTH_RESOLVE; }
    };

    uint32_t loadSubpass{VK_SUBPASS_EXTERNAL};
    uint32_t storeSubpass{VK_SUBPASS_EXTERNAL};
    ccstd::map<uint32_t, SubpassRef> records; // ordered

    void clear() {
        loadSubpass = VK_SUBPASS_EXTERNAL;
        storeSubpass = VK_SUBPASS_EXTERNAL;
        records.clear();
    }
};
CC_ENUM_BITWISE_OPERATORS(AttachmentStatistics::SubpassUsage)

struct SubpassDependencyManager final {
    ccstd::vector<VkSubpassDependency2> subpassDependencies;

    void clear() {
        subpassDependencies.clear();
        _hashes.clear();
    }

    void append(const VkSubpassDependency2 &info) {
        if (_hashes.count(info)) return;
        subpassDependencies.push_back(info);
        _hashes.insert(info);
    }

private:
    // only the src/dst attributes differs
    struct DependencyHasher {
        ccstd::hash_t operator()(const VkSubpassDependency2 &info) const {
            static_assert(std::is_trivially_copyable<VkSubpassDependency2>::value && sizeof(VkSubpassDependency2) % 8 == 0, "VkSubpassDependency2 must be 8 bytes aligned and trivially copyable");
            return ccstd::hash_range(reinterpret_cast<const uint64_t *>(&info.srcSubpass),
                                     reinterpret_cast<const uint64_t *>(&info.dependencyFlags));
        }
    };
    struct DependencyComparer {
        size_t operator()(const VkSubpassDependency2 &lhs, const VkSubpassDependency2 &rhs) const {
            auto size = static_cast<size_t>(reinterpret_cast<const uint8_t *>(&lhs.dependencyFlags) - reinterpret_cast<const uint8_t *>(&lhs.srcSubpass));
            return !memcmp(&lhs.srcSubpass, &rhs.srcSubpass, size);
        }
    };
    ccstd::unordered_set<VkSubpassDependency2, DependencyHasher, DependencyComparer> _hashes;
};

std::pair<VkImageLayout, VkImageLayout> getInitialFinalLayout(CCVKDevice *device, CCVKGeneralBarrier *barrier, bool depthSetncil) {
    const auto *gpuBarrier = barrier ? barrier->gpuBarrier() : (depthSetncil ? &device->gpuDevice()->defaultDepthStencilBarrier : &device->gpuDevice()->defaultColorBarrier);

    ThsvsImageBarrier imageBarrier = {};
    imageBarrier.prevAccessCount = utils::toUint(gpuBarrier->prevAccesses.size());
    imageBarrier.pPrevAccesses = gpuBarrier->prevAccesses.data();
    imageBarrier.nextAccessCount = utils::toUint(gpuBarrier->nextAccesses.size());
    imageBarrier.pNextAccesses = gpuBarrier->nextAccesses.data();
    imageBarrier.srcQueueFamilyIndex = VK_QUEUE_FAMILY_IGNORED;
    imageBarrier.dstQueueFamilyIndex = VK_QUEUE_FAMILY_IGNORED;
    imageBarrier.prevLayout = barrier ? getAccessLayout(barrier->getInfo().prevAccesses) : THSVS_IMAGE_LAYOUT_OPTIMAL;
    imageBarrier.nextLayout = barrier ? getAccessLayout(barrier->getInfo().nextAccesses) : THSVS_IMAGE_LAYOUT_OPTIMAL;

    VkPipelineStageFlags srcStages = {};
    VkPipelineStageFlags dstStages = {};
    VkImageMemoryBarrier vkImageBarrier = {};
    thsvsGetVulkanImageMemoryBarrier(imageBarrier, &srcStages, &dstStages, &vkImageBarrier);
    return {vkImageBarrier.oldLayout, vkImageBarrier.newLayout};
}

void cmdFuncCCVKCreateRenderPass(CCVKDevice *device, CCVKGPURenderPass *gpuRenderPass) {
    static ccstd::vector<VkSubpassDescriptionDepthStencilResolve> depthStencilResolves;
    static ccstd::vector<VkAttachmentDescription2> attachmentDescriptions;
    static ccstd::vector<VkAttachmentReference2> attachmentReferences;
    static ccstd::vector<VkSubpassDescription2> subpassDescriptions;
    static ccstd::vector<CCVKAccessInfo> beginAccessInfos;
    static ccstd::vector<CCVKAccessInfo> endAccessInfos;
    static ccstd::vector<AttachmentStatistics> attachmentStatistics;
    static SubpassDependencyManager dependencyManager;
    ccstd::vector<VkFragmentShadingRateAttachmentInfoKHR> shadingRateReferences;

    const size_t colorAttachmentCount = gpuRenderPass->colorAttachments.size();
    const size_t hasDepthStencil = gpuRenderPass->depthStencilAttachment.format != Format::UNKNOWN ? 1 : 0;
    const size_t hasDepthResolve = gpuRenderPass->depthStencilResolveAttachment.format != Format::UNKNOWN ? 1 : 0;
    auto attachmentCount = static_cast<uint32_t>(colorAttachmentCount + hasDepthStencil + hasDepthResolve);
    uint32_t depthIndex = colorAttachmentCount;
    uint32_t stencilIndex = colorAttachmentCount + 1;

    const bool hasStencil = GFX_FORMAT_INFOS[toNumber(gpuRenderPass->depthStencilAttachment.format)].hasStencil;

    attachmentDescriptions.assign(attachmentCount, {VK_STRUCTURE_TYPE_ATTACHMENT_DESCRIPTION_2});
    gpuRenderPass->clearValues.resize(attachmentCount);
    beginAccessInfos.resize(attachmentCount);
    endAccessInfos.resize(attachmentCount);
    shadingRateReferences.resize(gpuRenderPass->subpasses.size(), {VK_STRUCTURE_TYPE_FRAGMENT_SHADING_RATE_ATTACHMENT_INFO_KHR});

    for (size_t i = 0U; i < colorAttachmentCount; ++i) {
        const auto &attachment{gpuRenderPass->colorAttachments[i]};
        auto [initialLayout, finalLayout] =
            getInitialFinalLayout(device, static_cast<CCVKGeneralBarrier *>(attachment.barrier), false);

        VkFormat vkFormat = mapVkFormat(attachment.format, device->gpuDevice());
        attachmentDescriptions[i].format = vkFormat;
        attachmentDescriptions[i].samples = static_cast<VkSampleCountFlagBits>(attachment.sampleCount);
        attachmentDescriptions[i].loadOp = mapVkLoadOp(attachment.loadOp);
        attachmentDescriptions[i].storeOp = mapVkStoreOp(attachment.storeOp);
        attachmentDescriptions[i].stencilLoadOp = VK_ATTACHMENT_LOAD_OP_DONT_CARE;
        attachmentDescriptions[i].stencilStoreOp = VK_ATTACHMENT_STORE_OP_DONT_CARE;
        attachmentDescriptions[i].initialLayout = attachment.loadOp == gfx::LoadOp::DISCARD ? VK_IMAGE_LAYOUT_UNDEFINED : initialLayout;
        attachmentDescriptions[i].finalLayout = finalLayout;
    }
    if (hasDepthStencil) {
        const DepthStencilAttachment &attachment = gpuRenderPass->depthStencilAttachment;
        auto [initialLayout, finalLayout] = getInitialFinalLayout(device, static_cast<CCVKGeneralBarrier *>(attachment.barrier), true);

        VkFormat vkFormat = mapVkFormat(attachment.format, device->gpuDevice());
        attachmentDescriptions[depthIndex].format = vkFormat;
        attachmentDescriptions[depthIndex].samples = static_cast<VkSampleCountFlagBits>(attachment.sampleCount);
        attachmentDescriptions[depthIndex].loadOp = mapVkLoadOp(attachment.depthLoadOp);
        attachmentDescriptions[depthIndex].storeOp = mapVkStoreOp(attachment.depthStoreOp);
        attachmentDescriptions[depthIndex].stencilLoadOp = hasStencil ? mapVkLoadOp(attachment.stencilLoadOp) : VK_ATTACHMENT_LOAD_OP_DONT_CARE;
        attachmentDescriptions[depthIndex].stencilStoreOp = hasStencil ? mapVkStoreOp(attachment.stencilStoreOp) : VK_ATTACHMENT_STORE_OP_DONT_CARE;
        attachmentDescriptions[depthIndex].initialLayout = attachment.depthLoadOp == gfx::LoadOp::DISCARD ? VK_IMAGE_LAYOUT_UNDEFINED : initialLayout;
        attachmentDescriptions[depthIndex].finalLayout = finalLayout;
    }
    if (hasDepthResolve) {
        const DepthStencilAttachment &attachment = gpuRenderPass->depthStencilResolveAttachment;
        auto [initialLayout, finalLayout] = getInitialFinalLayout(device, static_cast<CCVKGeneralBarrier *>(attachment.barrier), true);

        VkFormat vkFormat = mapVkFormat(attachment.format, device->gpuDevice());

        attachmentDescriptions[stencilIndex].format = vkFormat;
        attachmentDescriptions[stencilIndex].samples = VK_SAMPLE_COUNT_1_BIT;
        attachmentDescriptions[stencilIndex].loadOp = mapVkLoadOp(attachment.depthLoadOp);
        attachmentDescriptions[stencilIndex].storeOp = mapVkStoreOp(attachment.depthStoreOp);
        attachmentDescriptions[stencilIndex].stencilLoadOp = hasStencil ? mapVkLoadOp(attachment.stencilLoadOp) : VK_ATTACHMENT_LOAD_OP_DONT_CARE;
        attachmentDescriptions[stencilIndex].stencilStoreOp = hasStencil ? mapVkStoreOp(attachment.stencilStoreOp) : VK_ATTACHMENT_STORE_OP_DONT_CARE;
        attachmentDescriptions[stencilIndex].initialLayout = attachment.depthLoadOp == gfx::LoadOp::DISCARD ? VK_IMAGE_LAYOUT_UNDEFINED : initialLayout;
        attachmentDescriptions[stencilIndex].finalLayout = finalLayout;
    }

    size_t subpassCount = gpuRenderPass->subpasses.size();
    attachmentReferences.clear();
    gpuRenderPass->sampleCounts.clear();

    for (const auto &subpassInfo : gpuRenderPass->subpasses) {
        VkSampleCountFlagBits sampleCount = VK_SAMPLE_COUNT_1_BIT;

        for (uint32_t input : subpassInfo.inputs) {
            bool appearsInOutput = std::find(subpassInfo.colors.begin(), subpassInfo.colors.end(), input) != subpassInfo.colors.end();
            VkImageLayout layout = appearsInOutput ? VK_IMAGE_LAYOUT_GENERAL : VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL;
            VkImageAspectFlags aspectFlag = VK_IMAGE_ASPECT_COLOR_BIT;
            if (input == gpuRenderPass->colorAttachments.size()) {
                layout = VK_IMAGE_LAYOUT_DEPTH_STENCIL_READ_ONLY_OPTIMAL;
                aspectFlag = VK_IMAGE_ASPECT_STENCIL_BIT | VK_IMAGE_ASPECT_DEPTH_BIT;
            }
            attachmentReferences.push_back({VK_STRUCTURE_TYPE_ATTACHMENT_REFERENCE_2, nullptr, input, layout, aspectFlag});
        }
        for (uint32_t color : subpassInfo.colors) {
            const VkAttachmentDescription2 &attachment = attachmentDescriptions[color];
            bool appearsInInput = std::find(subpassInfo.inputs.begin(), subpassInfo.inputs.end(), color) != subpassInfo.inputs.end();
            VkImageLayout layout = appearsInInput ? VK_IMAGE_LAYOUT_GENERAL : VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL;
            attachmentReferences.push_back({VK_STRUCTURE_TYPE_ATTACHMENT_REFERENCE_2, nullptr, color, layout, VK_IMAGE_ASPECT_COLOR_BIT});
            sampleCount = std::max(sampleCount, attachment.samples);
        }
        for (uint32_t resolveIn : subpassInfo.resolves) {
            VkImageLayout layout = VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL;
            auto resolve = resolveIn == gfx::INVALID_BINDING ? VK_ATTACHMENT_UNUSED : resolveIn;
            CC_ASSERT(INVALID_BINDING == VK_ATTACHMENT_UNUSED);
            attachmentReferences.push_back({VK_STRUCTURE_TYPE_ATTACHMENT_REFERENCE_2, nullptr, resolve, layout, VK_IMAGE_ASPECT_COLOR_BIT});
        }

        if (subpassInfo.depthStencil != INVALID_BINDING) {
            const VkAttachmentDescription2 &attachment = attachmentDescriptions[subpassInfo.depthStencil];
            sampleCount = std::max(sampleCount, attachment.samples);

            bool appearsInInput = std::find(subpassInfo.inputs.begin(), subpassInfo.inputs.end(), subpassInfo.depthStencil) != subpassInfo.inputs.end();
            VkImageAspectFlags aspect = hasStencil ? VK_IMAGE_ASPECT_DEPTH_BIT | VK_IMAGE_ASPECT_STENCIL_BIT : VK_IMAGE_ASPECT_DEPTH_BIT;
            VkImageLayout layout = appearsInInput ? VK_IMAGE_LAYOUT_GENERAL : VK_IMAGE_LAYOUT_DEPTH_STENCIL_ATTACHMENT_OPTIMAL;
            attachmentReferences.push_back({VK_STRUCTURE_TYPE_ATTACHMENT_REFERENCE_2, nullptr, subpassInfo.depthStencil, layout, aspect});
        }

        if (subpassInfo.depthStencilResolve != INVALID_BINDING) {
            VkImageAspectFlags aspect = hasStencil ? VK_IMAGE_ASPECT_DEPTH_BIT | VK_IMAGE_ASPECT_STENCIL_BIT : VK_IMAGE_ASPECT_DEPTH_BIT;
            VkImageLayout layout = VK_IMAGE_LAYOUT_DEPTH_STENCIL_ATTACHMENT_OPTIMAL;
            attachmentReferences.push_back({VK_STRUCTURE_TYPE_ATTACHMENT_REFERENCE_2, nullptr, subpassInfo.depthStencilResolve, layout, aspect});
        }

        if (subpassInfo.shadingRate != INVALID_BINDING && subpassInfo.shadingRate < colorAttachmentCount) {
            // layout is guaranteed
            attachmentDescriptions[subpassInfo.shadingRate].initialLayout = VK_IMAGE_LAYOUT_FRAGMENT_SHADING_RATE_ATTACHMENT_OPTIMAL_KHR;
            attachmentDescriptions[subpassInfo.shadingRate].finalLayout = VK_IMAGE_LAYOUT_FRAGMENT_SHADING_RATE_ATTACHMENT_OPTIMAL_KHR;
            const ColorAttachment &desc = gpuRenderPass->colorAttachments[subpassInfo.shadingRate];
            attachmentReferences.push_back({VK_STRUCTURE_TYPE_ATTACHMENT_REFERENCE_2, nullptr, subpassInfo.shadingRate, VK_IMAGE_LAYOUT_FRAGMENT_SHADING_RATE_ATTACHMENT_OPTIMAL_KHR, VK_IMAGE_ASPECT_COLOR_BIT});
        }

        gpuRenderPass->sampleCounts.push_back(sampleCount);
    }

    size_t offset{0U};
    subpassDescriptions.assign(subpassCount, {VK_STRUCTURE_TYPE_SUBPASS_DESCRIPTION_2}); // init to zeros first
    depthStencilResolves.resize(subpassCount, {VK_STRUCTURE_TYPE_SUBPASS_DESCRIPTION_DEPTH_STENCIL_RESOLVE});
    const VkPhysicalDeviceDepthStencilResolveProperties &prop{device->gpuContext()->physicalDeviceDepthStencilResolveProperties};
    for (uint32_t i = 0U; i < gpuRenderPass->subpasses.size(); ++i) {
        const SubpassInfo &subpassInfo = gpuRenderPass->subpasses[i];

        VkSubpassDescription2 &desc = subpassDescriptions[i];
        desc.pipelineBindPoint = VK_PIPELINE_BIND_POINT_GRAPHICS;

        if (!subpassInfo.inputs.empty()) {
            desc.inputAttachmentCount = utils::toUint(subpassInfo.inputs.size());
            desc.pInputAttachments = attachmentReferences.data() + offset;
            offset += subpassInfo.inputs.size();
        }

        if (!subpassInfo.colors.empty()) {
            desc.colorAttachmentCount = utils::toUint(subpassInfo.colors.size());
            desc.pColorAttachments = attachmentReferences.data() + offset;
            offset += subpassInfo.colors.size();
            if (!subpassInfo.resolves.empty()) {
                desc.pResolveAttachments = attachmentReferences.data() + offset;
                offset += subpassInfo.resolves.size();
            }
        }
        if (!subpassInfo.preserves.empty()) {
            desc.preserveAttachmentCount = utils::toUint(subpassInfo.preserves.size());
            desc.pPreserveAttachments = subpassInfo.preserves.data();
        }

        if (subpassInfo.depthStencil != INVALID_BINDING) {
            desc.pDepthStencilAttachment = attachmentReferences.data() + offset++;
        } else {
            desc.pDepthStencilAttachment = nullptr;
        }

        if (subpassInfo.depthStencilResolve != INVALID_BINDING) {
            VkSubpassDescriptionDepthStencilResolve &resolveDesc{depthStencilResolves[i]};

            VkResolveModeFlagBits depthResolveMode = VK_RESOLVE_MODES[toNumber(subpassInfo.depthResolveMode)];
            VkResolveModeFlagBits stencilResolveMode = VK_RESOLVE_MODES[toNumber(subpassInfo.stencilResolveMode)];

            if ((depthResolveMode & prop.supportedDepthResolveModes) == 0) {
                depthResolveMode = VK_RESOLVE_MODE_SAMPLE_ZERO_BIT;
                CC_LOG_WARNING("render pass depth resolve mode [%u] not supported, use Sample0 instead.", toNumber(subpassInfo.depthResolveMode));
            }
            if ((stencilResolveMode & prop.supportedStencilResolveModes) == 0) {
                stencilResolveMode = VK_RESOLVE_MODE_SAMPLE_ZERO_BIT;
                CC_LOG_WARNING("render pass stencil resolve mode [%u] not supported, use Sample0 instead.", toNumber(subpassInfo.stencilResolveMode));
            }

            if (!prop.independentResolveNone && stencilResolveMode != depthResolveMode) {
                stencilResolveMode = depthResolveMode;
            } else if (prop.independentResolveNone && !prop.independentResolve && stencilResolveMode &&
                       depthResolveMode && stencilResolveMode != depthResolveMode) {
                stencilResolveMode = VK_RESOLVE_MODE_NONE;
            }

            resolveDesc.depthResolveMode = depthResolveMode;
            resolveDesc.stencilResolveMode = stencilResolveMode;
            resolveDesc.pDepthStencilResolveAttachment = attachmentReferences.data() + offset++;
            desc.pNext = &resolveDesc;
        }

        if (subpassInfo.shadingRate != INVALID_BINDING) {
            VkFragmentShadingRateAttachmentInfoKHR &attachment = shadingRateReferences[i];
            attachment.pFragmentShadingRateAttachment = attachmentReferences.data() + offset++;
            attachment.shadingRateAttachmentTexelSize = {16, 16}; // todo
            desc.pNext = &attachment;
        }
    }

    size_t dependencyCount = gpuRenderPass->dependencies.size();
    gpuRenderPass->hasSelfDependency.resize(subpassCount, false);
    dependencyManager.clear();

    bool manuallyDeduce = true;
    if constexpr (ENABLE_GRAPH_AUTO_BARRIER) {
        // single pass front and rear cost 2 slot.
        manuallyDeduce = dependencyCount <= 2;
    } else {
        manuallyDeduce = dependencyCount == 0;
    }
    if (!manuallyDeduce) {
        // offset = 0U;
        ccstd::unordered_set<const GFXObject *> subpassExternalFilter;
        for (uint32_t i = 0U; i < dependencyCount; ++i) {
            const auto &dependency{gpuRenderPass->dependencies[i]};
            VkSubpassDependency2 vkDependency{VK_STRUCTURE_TYPE_SUBPASS_DEPENDENCY_2};
            vkDependency.srcSubpass = dependency.srcSubpass;
            vkDependency.dstSubpass = dependency.dstSubpass;
            vkDependency.dependencyFlags = VK_DEPENDENCY_BY_REGION_BIT;

            if (dependency.srcSubpass == dependency.dstSubpass && dependency.srcSubpass < subpassCount) {
                gpuRenderPass->hasSelfDependency[dependency.srcSubpass] = true;
            }

            auto addStageAccessMask = [&vkDependency](const SubpassDependency &deps) {
                ccstd::vector<ThsvsAccessType> prevAccesses;
                ccstd::vector<ThsvsAccessType> nextAccesses;
                getAccessTypes(deps.prevAccesses, prevAccesses);
                getAccessTypes(deps.nextAccesses, nextAccesses);

                ThsvsImageBarrier imageBarrier = {};
                imageBarrier.prevAccessCount = utils::toUint(prevAccesses.size());
                imageBarrier.pPrevAccesses = prevAccesses.data();
                imageBarrier.nextAccessCount = utils::toUint(nextAccesses.size());
                imageBarrier.pNextAccesses = nextAccesses.data();
                imageBarrier.srcQueueFamilyIndex = VK_QUEUE_FAMILY_IGNORED;
                imageBarrier.dstQueueFamilyIndex = VK_QUEUE_FAMILY_IGNORED;
                imageBarrier.prevLayout = getAccessLayout(deps.prevAccesses);
                imageBarrier.nextLayout = getAccessLayout(deps.nextAccesses);

                VkImageMemoryBarrier vkImageBarrier = {};
                thsvsGetVulkanImageMemoryBarrier(imageBarrier, &vkDependency.srcStageMask, &vkDependency.dstStageMask, &vkImageBarrier);

                vkDependency.srcAccessMask = vkImageBarrier.srcAccessMask;
                vkDependency.dstAccessMask = vkImageBarrier.dstAccessMask;
                dependencyManager.append(vkDependency);
            };
            if (vkDependency.srcStageMask == 0) {
                vkDependency.srcStageMask = VK_PIPELINE_STAGE_TOP_OF_PIPE_BIT;
            }
            addStageAccessMask(dependency);
        }

    } else {
        // try to deduce dependencies if not specified

        // first, gather necessary statistics for each attachment
        auto updateLifeCycle = [](AttachmentStatistics &statistics, uint32_t index, VkImageLayout layout, AttachmentStatistics::SubpassUsage usage) {
            if (statistics.records.count(index)) {
                statistics.records[index].usage |= usage;
            } else {
                statistics.records[index] = {layout, usage};
            }
            if (statistics.loadSubpass == VK_SUBPASS_EXTERNAL) statistics.loadSubpass = index;
            statistics.storeSubpass = index;
        };
        auto calculateLifeCycle = [&](uint32_t targetAttachment, AttachmentStatistics &statistics) {
            for (uint32_t j = 0U; j < utils::toUint(subpassCount); ++j) {
                auto &subpass = subpassDescriptions[j];
                for (size_t k = 0U; k < subpass.colorAttachmentCount; ++k) {
                    if (subpass.pColorAttachments[k].attachment == targetAttachment) {
                        updateLifeCycle(statistics, j, subpass.pColorAttachments[k].layout, AttachmentStatistics::SubpassUsage::COLOR);
                    }
                    if (subpass.pResolveAttachments && subpass.pResolveAttachments[k].attachment == targetAttachment) {
                        updateLifeCycle(statistics, j, subpass.pResolveAttachments[k].layout, AttachmentStatistics::SubpassUsage::COLOR_RESOLVE);
                    }
                }
                for (size_t k = 0U; k < subpass.inputAttachmentCount; ++k) {
                    if (subpass.pInputAttachments[k].attachment == targetAttachment) {
                        updateLifeCycle(statistics, j, subpass.pInputAttachments[k].layout, AttachmentStatistics::SubpassUsage::INPUT);
                    }
                }
                const auto *vrsDesc = static_cast<const VkFragmentShadingRateAttachmentInfoKHR *>(subpass.pNext);
                if (vrsDesc != nullptr && vrsDesc->sType == VK_STRUCTURE_TYPE_FRAGMENT_SHADING_RATE_ATTACHMENT_INFO_KHR && vrsDesc->pFragmentShadingRateAttachment->attachment == targetAttachment) {
                    updateLifeCycle(statistics, j, vrsDesc->pFragmentShadingRateAttachment->layout, AttachmentStatistics::SubpassUsage::SHADING_RATE);
                }

                if (subpass.pDepthStencilAttachment && subpass.pDepthStencilAttachment->attachment == targetAttachment) {
                    updateLifeCycle(statistics, j, subpass.pDepthStencilAttachment->layout, AttachmentStatistics::SubpassUsage::DEPTH);
                }
                if (depthStencilResolves[j].pDepthStencilResolveAttachment &&
                    depthStencilResolves[j].pDepthStencilResolveAttachment->attachment == targetAttachment) {
                    updateLifeCycle(statistics, j, depthStencilResolves[j].pDepthStencilResolveAttachment->layout, AttachmentStatistics::SubpassUsage::DEPTH_RESOLVE);
                }
            }
        };
        attachmentStatistics.resize(attachmentCount);
        for (uint32_t i = 0U; i < utils ::toUint(attachmentCount); ++i) {
            attachmentStatistics[i].clear();
            calculateLifeCycle(i, attachmentStatistics[i]);
            CC_ASSERT(attachmentStatistics[i].loadSubpass != VK_SUBPASS_EXTERNAL &&
                      attachmentStatistics[i].storeSubpass != VK_SUBPASS_EXTERNAL);
        }

        // wait for resources to become available (begin accesses)
        auto beginDependencyCheck = [](VkSubpassDependency2 &dependency, uint32_t attachment, const AttachmentStatistics::SubpassRef &ref) {
            const VkAttachmentDescription2 &desc = attachmentDescriptions[attachment];
            const CCVKAccessInfo &info = beginAccessInfos[attachment];
            if (desc.initialLayout != ref.layout || info.hasWriteAccess || desc.loadOp == VK_ATTACHMENT_LOAD_OP_CLEAR) {
                VkPipelineStageFlagBits dstStage{ref.hasDepth() ? VK_PIPELINE_STAGE_EARLY_FRAGMENT_TESTS_BIT : VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT};
                VkAccessFlagBits dstAccessRead{ref.hasDepth() ? VK_ACCESS_DEPTH_STENCIL_ATTACHMENT_READ_BIT : VK_ACCESS_COLOR_ATTACHMENT_READ_BIT};
                VkAccessFlagBits dstAccessWrite{ref.hasDepth() ? VK_ACCESS_DEPTH_STENCIL_ATTACHMENT_WRITE_BIT : VK_ACCESS_COLOR_ATTACHMENT_WRITE_BIT};
                dependency.srcStageMask |= info.stageMask;
                dependency.dstStageMask |= dstStage;
                dependency.srcAccessMask |= info.hasWriteAccess ? info.accessMask : 0;
                dependency.dstAccessMask |= dstAccessRead;
                if (desc.loadOp == VK_ATTACHMENT_LOAD_OP_CLEAR || desc.initialLayout != ref.layout) dependency.dstAccessMask |= dstAccessWrite;
                return true;
            }
            return false;
        };
        VkSubpassDependency2 beginDependency;
        uint32_t lastLoadSubpass{VK_SUBPASS_EXTERNAL};
        bool beginDependencyValid{false};
        for (uint32_t i = 0U; i < attachmentCount; ++i) {
            auto &statistics = attachmentStatistics[i];
            if (lastLoadSubpass != statistics.loadSubpass) {
                if (beginDependencyValid) dependencyManager.append(beginDependency);
                beginDependency = {VK_STRUCTURE_TYPE_SUBPASS_DEPENDENCY_2, nullptr,
                                   VK_SUBPASS_EXTERNAL, statistics.loadSubpass,
                                   VK_PIPELINE_STAGE_TOP_OF_PIPE_BIT, VK_PIPELINE_STAGE_BOTTOM_OF_PIPE_BIT};
                lastLoadSubpass = statistics.loadSubpass;
                beginDependencyValid = false;
            }
            beginDependencyValid |= beginDependencyCheck(beginDependency, i, statistics.records[statistics.loadSubpass]);
        }
        if (beginDependencyValid) dependencyManager.append(beginDependency);

        // make rendering result visible (end accesses)
        auto endDependencyCheck = [](VkSubpassDependency2 &dependency, uint32_t attachment, const AttachmentStatistics::SubpassRef &ref) {
            const VkAttachmentDescription2 &desc = attachmentDescriptions[attachment];
            const CCVKAccessInfo &info = endAccessInfos[attachment];
            if (desc.initialLayout != ref.layout || info.hasWriteAccess || desc.storeOp == VK_ATTACHMENT_STORE_OP_STORE) {
                VkPipelineStageFlagBits srcStage{ref.hasDepth() ? VK_PIPELINE_STAGE_LATE_FRAGMENT_TESTS_BIT : VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT};
                VkAccessFlagBits srcAccess{ref.hasDepth() ? VK_ACCESS_DEPTH_STENCIL_ATTACHMENT_WRITE_BIT : VK_ACCESS_COLOR_ATTACHMENT_WRITE_BIT};
                dependency.srcStageMask |= srcStage;
                dependency.srcAccessMask |= srcAccess;
                dependency.dstStageMask |= info.stageMask;
                dependency.dstAccessMask |= info.accessMask;
                return true;
            }
            return false;
        };
        VkSubpassDependency2 endDependency;
        uint32_t lastStoreSubpass{VK_SUBPASS_EXTERNAL};
        bool endDependencyValid{false};
        for (uint32_t i = 0U; i < attachmentCount; ++i) {
            auto &statistics = attachmentStatistics[i];
            if (lastStoreSubpass != statistics.storeSubpass) {
                if (endDependencyValid) dependencyManager.append(endDependency);
                endDependency = {VK_STRUCTURE_TYPE_SUBPASS_DEPENDENCY_2, nullptr,
                                 statistics.storeSubpass, VK_SUBPASS_EXTERNAL,
                                 VK_PIPELINE_STAGE_TOP_OF_PIPE_BIT, VK_PIPELINE_STAGE_BOTTOM_OF_PIPE_BIT};
                lastStoreSubpass = statistics.storeSubpass;
                endDependencyValid = false;
            }
            endDependencyValid |= endDependencyCheck(endDependency, i, statistics.records[statistics.storeSubpass]);
        }
        if (endDependencyValid) dependencyManager.append(endDependency);

        // other transitioning dependencies
        auto mapAccessFlags = [](AttachmentStatistics::SubpassUsage usage) {
            // there may be more kind of dependencies
            if (hasFlag(usage, AttachmentStatistics::SubpassUsage::INPUT)) {
                return std::make_pair(VK_PIPELINE_STAGE_FRAGMENT_SHADER_BIT, VK_ACCESS_INPUT_ATTACHMENT_READ_BIT);
            }
            return std::make_pair(VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT, VK_ACCESS_COLOR_ATTACHMENT_WRITE_BIT);
        };
        auto genDependency = [&](uint32_t srcIdx, AttachmentStatistics::SubpassUsage srcUsage,
                                 uint32_t dstIdx, AttachmentStatistics::SubpassUsage dstUsage) {
            VkSubpassDependency2 dependency{VK_STRUCTURE_TYPE_SUBPASS_DEPENDENCY_2, nullptr, srcIdx, dstIdx};
            std::tie(dependency.srcStageMask, dependency.srcAccessMask) = mapAccessFlags(srcUsage);
            std::tie(dependency.dstStageMask, dependency.dstAccessMask) = mapAccessFlags(dstUsage);
            dependency.dependencyFlags = VK_DEPENDENCY_BY_REGION_BIT;
            return dependency;
        };
        for (size_t i = 0U; i < attachmentCount; ++i) {
            auto &statistics{attachmentStatistics[i]};

            const AttachmentStatistics::SubpassRef *prevRef{nullptr};
            uint32_t prevIdx{0U};
            for (const auto &it : statistics.records) {
                if (prevRef && prevRef->usage != it.second.usage) {
                    dependencyManager.append(genDependency(prevIdx, prevRef->usage, it.first, it.second.usage));
                }
                prevIdx = it.first;
                prevRef = &it.second;
            }
        }
    }

    VkRenderPassCreateInfo2 renderPassCreateInfo{VK_STRUCTURE_TYPE_RENDER_PASS_CREATE_INFO_2};
    renderPassCreateInfo.attachmentCount = utils::toUint(attachmentDescriptions.size());
    renderPassCreateInfo.pAttachments = attachmentDescriptions.data();
    renderPassCreateInfo.subpassCount = utils::toUint(subpassDescriptions.size());
    renderPassCreateInfo.pSubpasses = subpassDescriptions.data();
    renderPassCreateInfo.dependencyCount = utils::toUint(dependencyManager.subpassDependencies.size());
    renderPassCreateInfo.pDependencies = dependencyManager.subpassDependencies.data();

    VK_CHECK(device->gpuDevice()->createRenderPass2(device->gpuDevice()->vkDevice, &renderPassCreateInfo,
                                                    nullptr, &gpuRenderPass->vkRenderPass));
}

void cmdFuncCCVKCreateFramebuffer(CCVKDevice *device, CCVKGPUFramebuffer *gpuFramebuffer) {
    size_t colorViewCount = gpuFramebuffer->gpuColorViews.size();
    const auto *gpuRenderPass = gpuFramebuffer->gpuRenderPass.get();
    const size_t hasDepthStencil = gpuRenderPass->depthStencilAttachment.format != Format::UNKNOWN ? 1 : 0;
    const size_t hasDepthResolve = gpuRenderPass->depthStencilResolveAttachment.format != Format::UNKNOWN ? 1 : 0;
    auto attachmentCount = static_cast<uint32_t>(colorViewCount + hasDepthStencil + hasDepthResolve);

    ccstd::vector<VkImageView> attachments(attachmentCount);
    VkFramebufferCreateInfo createInfo{VK_STRUCTURE_TYPE_FRAMEBUFFER_CREATE_INFO};
    createInfo.width = createInfo.height = UINT_MAX;

    uint32_t swapchainImageIndices = 0;

    for (size_t i = 0U; i < colorViewCount; ++i) {
        const CCVKGPUTextureView *texView = gpuFramebuffer->gpuColorViews[i];
        if (texView->gpuTexture->swapchain) {
            gpuFramebuffer->swapchain = texView->gpuTexture->swapchain;
            swapchainImageIndices |= (1 << i);
        } else {
            attachments[i] = gpuFramebuffer->gpuColorViews[i]->vkImageView;
        }

        if (!hasFlag(texView->gpuTexture->usage, TextureUsageBit::SHADING_RATE)) {
            createInfo.width = std::min(createInfo.width, std::max(1U, gpuFramebuffer->gpuColorViews[i]->gpuTexture->width >> gpuFramebuffer->gpuColorViews[i]->baseLevel));
            createInfo.height = std::min(createInfo.height, std::max(1U, gpuFramebuffer->gpuColorViews[i]->gpuTexture->height >> gpuFramebuffer->gpuColorViews[i]->baseLevel));
        }
    }
    if (hasDepthStencil) {
        if (gpuFramebuffer->gpuDepthStencilView->gpuTexture->swapchain) {
            gpuFramebuffer->swapchain = gpuFramebuffer->gpuDepthStencilView->gpuTexture->swapchain;
            swapchainImageIndices |= (1 << colorViewCount);
        } else {
            attachments[colorViewCount] = gpuFramebuffer->gpuDepthStencilView->vkImageView;
        }
        createInfo.width = std::min(createInfo.width, std::max(1U, gpuFramebuffer->gpuDepthStencilView->gpuTexture->width >> gpuFramebuffer->gpuDepthStencilView->baseLevel));
        createInfo.height = std::min(createInfo.height, std::max(1U, gpuFramebuffer->gpuDepthStencilView->gpuTexture->height >> gpuFramebuffer->gpuDepthStencilView->baseLevel));
    }
    if (hasDepthResolve) {
        attachments[colorViewCount + 1] = gpuFramebuffer->gpuDepthStencilResolveView->vkImageView;
    }

    gpuFramebuffer->isOffscreen = !swapchainImageIndices;
    gpuFramebuffer->width = createInfo.width;
    gpuFramebuffer->height = createInfo.height;

    if (gpuFramebuffer->isOffscreen) {
        createInfo.renderPass = gpuFramebuffer->gpuRenderPass->vkRenderPass;
        createInfo.attachmentCount = utils::toUint(attachments.size());
        createInfo.pAttachments = attachments.data();
        createInfo.layers = 1;
        VK_CHECK(vkCreateFramebuffer(device->gpuDevice()->vkDevice, &createInfo, nullptr, &gpuFramebuffer->vkFramebuffer));
    } else {
        size_t swapChainImageCount = gpuFramebuffer->swapchain->swapchainImages.size();
        gpuFramebuffer->vkFrameBuffers.resize(swapChainImageCount);
        createInfo.renderPass = gpuFramebuffer->gpuRenderPass->vkRenderPass;
        createInfo.attachmentCount = utils::toUint(attachments.size());
        createInfo.pAttachments = attachments.data();
        createInfo.layers = 1;
        for (size_t i = 0U; i < swapChainImageCount; ++i) {
            for (size_t j = 0U; j < colorViewCount; ++j) {
                if (swapchainImageIndices & (1 << j)) {
                    attachments[j] = gpuFramebuffer->gpuColorViews[j]->swapchainVkImageViews[i];
                }
            }
            if (swapchainImageIndices & (1 << colorViewCount)) {
                attachments[colorViewCount] = gpuFramebuffer->gpuDepthStencilView->swapchainVkImageViews[i];
            }
            VK_CHECK(vkCreateFramebuffer(device->gpuDevice()->vkDevice, &createInfo, nullptr, &gpuFramebuffer->vkFrameBuffers[i]));
        }
    }
}

void cmdFuncCCVKCreateShader(CCVKDevice *device, CCVKGPUShader *gpuShader) {
    SPIRVUtils *spirv = SPIRVUtils::getInstance();

    for (CCVKGPUShaderStage &stage : gpuShader->gpuStages) {
        spirv->compileGLSL(stage.type, "#version 460\n" + stage.source);
        if (stage.type == ShaderStageFlagBit::VERTEX) spirv->compressInputLocations(gpuShader->attributes);

        VkShaderModuleCreateInfo createInfo{VK_STRUCTURE_TYPE_SHADER_MODULE_CREATE_INFO};
        createInfo.codeSize = spirv->getOutputSize();
        createInfo.pCode = spirv->getOutputData();
        VK_CHECK(vkCreateShaderModule(device->gpuDevice()->vkDevice, &createInfo, nullptr, &stage.vkShader));
    }

    CC_LOG_INFO("Shader '%s' compilation succeeded.", gpuShader->name.c_str());
}

void cmdFuncCCVKCreateDescriptorSetLayout(CCVKDevice *device, CCVKGPUDescriptorSetLayout *gpuDescriptorSetLayout) {
    CCVKGPUDevice *gpuDevice = device->gpuDevice();
    size_t bindingCount = gpuDescriptorSetLayout->bindings.size();

    gpuDescriptorSetLayout->vkBindings.resize(bindingCount);
    for (size_t i = 0U; i < bindingCount; ++i) {
        const DescriptorSetLayoutBinding &binding = gpuDescriptorSetLayout->bindings[i];
        VkDescriptorSetLayoutBinding &vkBinding = gpuDescriptorSetLayout->vkBindings[i];
        vkBinding.stageFlags = mapVkShaderStageFlags(binding.stageFlags);
        vkBinding.descriptorType = mapVkDescriptorType(binding.descriptorType);
        vkBinding.binding = binding.binding;
        vkBinding.descriptorCount = binding.count;
    }

    VkDescriptorSetLayoutCreateInfo setCreateInfo{VK_STRUCTURE_TYPE_DESCRIPTOR_SET_LAYOUT_CREATE_INFO};
    setCreateInfo.bindingCount = utils::toUint(bindingCount);
    setCreateInfo.pBindings = gpuDescriptorSetLayout->vkBindings.data();
    VK_CHECK(vkCreateDescriptorSetLayout(gpuDevice->vkDevice, &setCreateInfo, nullptr, &gpuDescriptorSetLayout->vkDescriptorSetLayout));

    CCVKGPUDescriptorSetPool *pool = gpuDevice->getDescriptorSetPool(gpuDescriptorSetLayout->id);
    pool->link(gpuDevice, gpuDescriptorSetLayout->maxSetsPerPool, gpuDescriptorSetLayout->vkBindings, gpuDescriptorSetLayout->vkDescriptorSetLayout);

    gpuDescriptorSetLayout->defaultDescriptorSet = pool->request();

    if (gpuDevice->useDescriptorUpdateTemplate && bindingCount) {
        const ccstd::vector<VkDescriptorSetLayoutBinding> &bindings = gpuDescriptorSetLayout->vkBindings;

        ccstd::vector<VkDescriptorUpdateTemplateEntry> entries(bindingCount);
        for (size_t j = 0U, k = 0U; j < bindingCount; ++j) {
            const VkDescriptorSetLayoutBinding &binding = bindings[j];
            if (binding.descriptorType != VK_DESCRIPTOR_TYPE_INLINE_UNIFORM_BLOCK_EXT) {
                entries[j].dstBinding = binding.binding;
                entries[j].dstArrayElement = 0;
                entries[j].descriptorCount = binding.descriptorCount;
                entries[j].descriptorType = binding.descriptorType;
                entries[j].offset = sizeof(CCVKDescriptorInfo) * k;
                entries[j].stride = sizeof(CCVKDescriptorInfo);
                k += binding.descriptorCount;
            }
        }

        VkDescriptorUpdateTemplateCreateInfo createInfo = {VK_STRUCTURE_TYPE_DESCRIPTOR_UPDATE_TEMPLATE_CREATE_INFO};
        createInfo.descriptorUpdateEntryCount = utils::toUint(bindingCount);
        createInfo.pDescriptorUpdateEntries = entries.data();
        createInfo.templateType = VK_DESCRIPTOR_UPDATE_TEMPLATE_TYPE_DESCRIPTOR_SET;
        createInfo.descriptorSetLayout = gpuDescriptorSetLayout->vkDescriptorSetLayout;
        if (gpuDevice->minorVersion > 0) {
            VK_CHECK(vkCreateDescriptorUpdateTemplate(gpuDevice->vkDevice, &createInfo, nullptr, &gpuDescriptorSetLayout->vkDescriptorUpdateTemplate));
        } else {
            VK_CHECK(vkCreateDescriptorUpdateTemplateKHR(gpuDevice->vkDevice, &createInfo, nullptr, &gpuDescriptorSetLayout->vkDescriptorUpdateTemplate));
        }
    }
}

void cmdFuncCCVKCreatePipelineLayout(CCVKDevice *device, CCVKGPUPipelineLayout *gpuPipelineLayout) {
    CCVKGPUDevice *gpuDevice = device->gpuDevice();
    size_t layoutCount = gpuPipelineLayout->setLayouts.size();

    ccstd::vector<VkDescriptorSetLayout> descriptorSetLayouts(layoutCount);
    for (uint32_t i = 0; i < layoutCount; ++i) {
        descriptorSetLayouts[i] = gpuPipelineLayout->setLayouts[i]->vkDescriptorSetLayout;
    }

    VkPipelineLayoutCreateInfo pipelineLayoutCreateInfo{VK_STRUCTURE_TYPE_PIPELINE_LAYOUT_CREATE_INFO};
    pipelineLayoutCreateInfo.setLayoutCount = utils::toUint(layoutCount);
    pipelineLayoutCreateInfo.pSetLayouts = descriptorSetLayouts.data();
    VK_CHECK(vkCreatePipelineLayout(gpuDevice->vkDevice, &pipelineLayoutCreateInfo, nullptr, &gpuPipelineLayout->vkPipelineLayout));
}

void cmdFuncCCVKCreateComputePipelineState(CCVKDevice *device, CCVKGPUPipelineState *gpuPipelineState) {
    VkComputePipelineCreateInfo createInfo{VK_STRUCTURE_TYPE_COMPUTE_PIPELINE_CREATE_INFO};

    ///////////////////// Shader Stage /////////////////////

    const auto &stages = gpuPipelineState->gpuShader->gpuStages;
    VkPipelineShaderStageCreateInfo stageInfo{VK_STRUCTURE_TYPE_PIPELINE_SHADER_STAGE_CREATE_INFO};
    stageInfo.stage = mapVkShaderStageFlagBits(stages[0].type);
    stageInfo.module = stages[0].vkShader;
    stageInfo.pName = "main";

    createInfo.stage = stageInfo;
    createInfo.layout = gpuPipelineState->gpuPipelineLayout->vkPipelineLayout;

    ///////////////////// Creation /////////////////////

    auto *pipelineCache = device->pipelineCache();
    CC_ASSERT(pipelineCache != nullptr);
    pipelineCache->setDirty();
    VK_CHECK(vkCreateComputePipelines(device->gpuDevice()->vkDevice, pipelineCache->getHandle(),
                                      1, &createInfo, nullptr, &gpuPipelineState->vkPipeline));
}

void cmdFuncCCVKCreateGraphicsPipelineState(CCVKDevice *device, CCVKGPUPipelineState *gpuPipelineState) {
    static ccstd::vector<VkPipelineShaderStageCreateInfo> stageInfos;
    static ccstd::vector<VkVertexInputBindingDescription> bindingDescriptions;
    static ccstd::vector<VkVertexInputAttributeDescription> attributeDescriptions;
    static ccstd::vector<uint32_t> offsets;
    static ccstd::vector<VkDynamicState> dynamicStates;
    static ccstd::vector<VkPipelineColorBlendAttachmentState> blendTargets;

    VkGraphicsPipelineCreateInfo createInfo{VK_STRUCTURE_TYPE_GRAPHICS_PIPELINE_CREATE_INFO};

    ///////////////////// Shader Stage /////////////////////

    const auto &stages = gpuPipelineState->gpuShader->gpuStages;
    const size_t stageCount = stages.size();

    stageInfos.resize(stageCount, {VK_STRUCTURE_TYPE_PIPELINE_SHADER_STAGE_CREATE_INFO});
    for (size_t i = 0U; i < stageCount; ++i) {
        stageInfos[i].stage = mapVkShaderStageFlagBits(stages[i].type);
        stageInfos[i].module = stages[i].vkShader;
        stageInfos[i].pName = "main";
    }
    createInfo.stageCount = utils::toUint(stageCount);
    createInfo.pStages = stageInfos.data();

    ///////////////////// Input State /////////////////////

    const AttributeList &attributes = gpuPipelineState->inputState.attributes;
    const size_t attributeCount = attributes.size();
    uint32_t bindingCount = 1U;
    for (size_t i = 0U; i < attributeCount; ++i) {
        const Attribute &attr = attributes[i];
        bindingCount = std::max(bindingCount, attr.stream + 1);
    }

    bindingDescriptions.resize(bindingCount);
    for (uint32_t i = 0U; i < bindingCount; ++i) {
        bindingDescriptions[i].binding = i;
        bindingDescriptions[i].stride = 0;
        bindingDescriptions[i].inputRate = VK_VERTEX_INPUT_RATE_VERTEX;
    }
    for (size_t i = 0U; i < attributeCount; ++i) {
        const Attribute &attr = attributes[i];
        bindingDescriptions[attr.stream].stride += GFX_FORMAT_INFOS[toNumber(attr.format)].size;
        if (attr.isInstanced) {
            bindingDescriptions[attr.stream].inputRate = VK_VERTEX_INPUT_RATE_INSTANCE;
        }
    }

    const AttributeList &shaderAttrs = gpuPipelineState->gpuShader->attributes;
    const size_t shaderAttrCount = shaderAttrs.size();

    attributeDescriptions.resize(shaderAttrCount);
    for (size_t i = 0; i < shaderAttrCount; ++i) {
        bool attributeFound = false;
        offsets.assign(bindingCount, 0);
        for (const Attribute &attr : attributes) {
            if (shaderAttrs[i].name == attr.name) {
                attributeDescriptions[i].location = shaderAttrs[i].location;
                attributeDescriptions[i].binding = attr.stream;
                attributeDescriptions[i].format = mapVkFormat(attr.format, device->gpuDevice());
                attributeDescriptions[i].offset = offsets[attr.stream];
                attributeFound = true;
                break;
            }
            offsets[attr.stream] += GFX_FORMAT_INFOS[toNumber(attr.format)].size;
        }
        if (!attributeFound) { // handle absent attribute
            attributeDescriptions[i].location = shaderAttrs[i].location;
            attributeDescriptions[i].binding = 0;
            attributeDescriptions[i].format = mapVkFormat(shaderAttrs[i].format, device->gpuDevice());
            attributeDescriptions[i].offset = 0; // reuse the first attribute as dummy data
        }
    }

    VkPipelineVertexInputStateCreateInfo vertexInput{VK_STRUCTURE_TYPE_PIPELINE_VERTEX_INPUT_STATE_CREATE_INFO};
    vertexInput.vertexBindingDescriptionCount = bindingCount;
    vertexInput.pVertexBindingDescriptions = bindingDescriptions.data();
    vertexInput.vertexAttributeDescriptionCount = utils::toUint(shaderAttrCount);
    vertexInput.pVertexAttributeDescriptions = attributeDescriptions.data();
    createInfo.pVertexInputState = &vertexInput;

    ///////////////////// Input Asembly State /////////////////////

    VkPipelineInputAssemblyStateCreateInfo inputAssembly{VK_STRUCTURE_TYPE_PIPELINE_INPUT_ASSEMBLY_STATE_CREATE_INFO};
    inputAssembly.topology = VK_PRIMITIVE_MODES[toNumber(gpuPipelineState->primitive)];
    createInfo.pInputAssemblyState = &inputAssembly;

    ///////////////////// Dynamic State /////////////////////

    dynamicStates.assign({VK_DYNAMIC_STATE_VIEWPORT, VK_DYNAMIC_STATE_SCISSOR});
    insertVkDynamicStates(&dynamicStates, gpuPipelineState->dynamicStates);

    VkPipelineDynamicStateCreateInfo dynamicState{VK_STRUCTURE_TYPE_PIPELINE_DYNAMIC_STATE_CREATE_INFO};
    dynamicState.dynamicStateCount = utils::toUint(dynamicStates.size());
    dynamicState.pDynamicStates = dynamicStates.data();
    createInfo.pDynamicState = &dynamicState;

    ///////////////////// Viewport State /////////////////////

    VkPipelineViewportStateCreateInfo viewportState{VK_STRUCTURE_TYPE_PIPELINE_VIEWPORT_STATE_CREATE_INFO};
    viewportState.viewportCount = 1; // dynamic by default
    viewportState.scissorCount = 1;  // dynamic by default
    createInfo.pViewportState = &viewportState;

    ///////////////////// Rasterization State /////////////////////

    VkPipelineRasterizationStateCreateInfo rasterizationState{VK_STRUCTURE_TYPE_PIPELINE_RASTERIZATION_STATE_CREATE_INFO};

    // rasterizationState.depthClampEnable;
    rasterizationState.rasterizerDiscardEnable = gpuPipelineState->rs.isDiscard;
    rasterizationState.polygonMode = VK_POLYGON_MODES[toNumber(gpuPipelineState->rs.polygonMode)];
    rasterizationState.cullMode = VK_CULL_MODES[toNumber(gpuPipelineState->rs.cullMode)];
    rasterizationState.frontFace = gpuPipelineState->rs.isFrontFaceCCW ? VK_FRONT_FACE_COUNTER_CLOCKWISE : VK_FRONT_FACE_CLOCKWISE;
    rasterizationState.depthBiasEnable = gpuPipelineState->rs.depthBiasEnabled;
    rasterizationState.depthBiasConstantFactor = gpuPipelineState->rs.depthBias;
    rasterizationState.depthBiasClamp = gpuPipelineState->rs.depthBiasClamp;
    rasterizationState.depthBiasSlopeFactor = gpuPipelineState->rs.depthBiasSlop;
    rasterizationState.lineWidth = gpuPipelineState->rs.lineWidth;
    createInfo.pRasterizationState = &rasterizationState;

    ///////////////////// Multisample State /////////////////////

    VkPipelineMultisampleStateCreateInfo multisampleState{VK_STRUCTURE_TYPE_PIPELINE_MULTISAMPLE_STATE_CREATE_INFO};
    multisampleState.rasterizationSamples = gpuPipelineState->gpuRenderPass->sampleCounts[gpuPipelineState->subpass];
    multisampleState.alphaToCoverageEnable = gpuPipelineState->bs.isA2C;
    // multisampleState.sampleShadingEnable;
    // multisampleState.minSampleShading;
    // multisampleState.pSampleMask;
    // multisampleState.alphaToOneEnable;
    createInfo.pMultisampleState = &multisampleState;

    ///////////////////// Depth Stencil State /////////////////////

    VkPipelineDepthStencilStateCreateInfo depthStencilState = {VK_STRUCTURE_TYPE_PIPELINE_DEPTH_STENCIL_STATE_CREATE_INFO};
    depthStencilState.depthTestEnable = gpuPipelineState->dss.depthTest;
    depthStencilState.depthWriteEnable = gpuPipelineState->dss.depthWrite;
    depthStencilState.depthCompareOp = VK_CMP_FUNCS[toNumber(gpuPipelineState->dss.depthFunc)];
    depthStencilState.stencilTestEnable = gpuPipelineState->dss.stencilTestFront;

    depthStencilState.front = {
        VK_STENCIL_OPS[toNumber(gpuPipelineState->dss.stencilFailOpFront)],
        VK_STENCIL_OPS[toNumber(gpuPipelineState->dss.stencilPassOpFront)],
        VK_STENCIL_OPS[toNumber(gpuPipelineState->dss.stencilZFailOpFront)],
        VK_CMP_FUNCS[toNumber(gpuPipelineState->dss.stencilFuncFront)],
        gpuPipelineState->dss.stencilReadMaskFront,
        gpuPipelineState->dss.stencilWriteMaskFront,
        gpuPipelineState->dss.stencilRefFront,
    };
    depthStencilState.back = {
        VK_STENCIL_OPS[toNumber(gpuPipelineState->dss.stencilFailOpBack)],
        VK_STENCIL_OPS[toNumber(gpuPipelineState->dss.stencilPassOpBack)],
        VK_STENCIL_OPS[toNumber(gpuPipelineState->dss.stencilZFailOpBack)],
        VK_CMP_FUNCS[toNumber(gpuPipelineState->dss.stencilFuncBack)],
        gpuPipelineState->dss.stencilReadMaskBack,
        gpuPipelineState->dss.stencilWriteMaskBack,
        gpuPipelineState->dss.stencilRefBack,
    };
    // depthStencilState.depthBoundsTestEnable;
    // depthStencilState.minDepthBounds;
    // depthStencilState.maxDepthBounds;
    createInfo.pDepthStencilState = &depthStencilState;

    ///////////////////// Blend State /////////////////////

    size_t blendTargetCount = gpuPipelineState->gpuRenderPass->subpasses[gpuPipelineState->subpass].colors.size();
    blendTargets.resize(blendTargetCount, {});

    for (size_t i = 0U; i < blendTargetCount; ++i) {
        BlendTarget &target = i >= gpuPipelineState->bs.targets.size()
                                  ? gpuPipelineState->bs.targets[0]
                                  : gpuPipelineState->bs.targets[i];

        blendTargets[i].blendEnable = target.blend;
        blendTargets[i].srcColorBlendFactor = VK_BLEND_FACTORS[toNumber(target.blendSrc)];
        blendTargets[i].dstColorBlendFactor = VK_BLEND_FACTORS[toNumber(target.blendDst)];
        blendTargets[i].colorBlendOp = VK_BLEND_OPS[toNumber(target.blendEq)];
        blendTargets[i].srcAlphaBlendFactor = VK_BLEND_FACTORS[toNumber(target.blendSrcAlpha)];
        blendTargets[i].dstAlphaBlendFactor = VK_BLEND_FACTORS[toNumber(target.blendDstAlpha)];
        blendTargets[i].alphaBlendOp = VK_BLEND_OPS[toNumber(target.blendAlphaEq)];
        blendTargets[i].colorWriteMask = mapVkColorComponentFlags(target.blendColorMask);
    }
    Color &blendColor = gpuPipelineState->bs.blendColor;

    VkPipelineColorBlendStateCreateInfo colorBlendState{VK_STRUCTURE_TYPE_PIPELINE_COLOR_BLEND_STATE_CREATE_INFO};
    // colorBlendState.logicOpEnable;
    // colorBlendState.logicOp;
    colorBlendState.attachmentCount = utils::toUint(blendTargetCount);
    colorBlendState.pAttachments = blendTargets.data();
    colorBlendState.blendConstants[0] = blendColor.x;
    colorBlendState.blendConstants[1] = blendColor.y;
    colorBlendState.blendConstants[2] = blendColor.z;
    colorBlendState.blendConstants[3] = blendColor.w;
    createInfo.pColorBlendState = &colorBlendState;

    ///////////////////// ShadingRate /////////////////////
    VkPipelineFragmentShadingRateStateCreateInfoKHR shadingRateInfo = {VK_STRUCTURE_TYPE_PIPELINE_FRAGMENT_SHADING_RATE_STATE_CREATE_INFO_KHR};
    if (device->getCapabilities().supportVariableRateShading &&
        gpuPipelineState->gpuRenderPass->hasShadingAttachment(gpuPipelineState->subpass)) {
        shadingRateInfo.fragmentSize = {1, 1}; // perDraw && perVertex shading rate not support.
        shadingRateInfo.combinerOps[0] = VK_FRAGMENT_SHADING_RATE_COMBINER_OP_KEEP_KHR;
        shadingRateInfo.combinerOps[1] = VK_FRAGMENT_SHADING_RATE_COMBINER_OP_REPLACE_KHR;
        createInfo.pNext = &shadingRateInfo;
    }

    ///////////////////// References /////////////////////

    createInfo.layout = gpuPipelineState->gpuPipelineLayout->vkPipelineLayout;
    createInfo.renderPass = gpuPipelineState->gpuRenderPass->vkRenderPass;
    createInfo.subpass = gpuPipelineState->subpass;

    ///////////////////// Creation /////////////////////
    auto *pipelineCache = device->pipelineCache();
    CC_ASSERT(pipelineCache != nullptr);
    pipelineCache->setDirty();
    VK_CHECK(vkCreateGraphicsPipelines(device->gpuDevice()->vkDevice, pipelineCache->getHandle(),
                                       1, &createInfo, nullptr, &gpuPipelineState->vkPipeline));
}

void cmdFuncCCVKCreateRayTracingPipelineState(CCVKDevice* device, CCVKGPUPipelineState* gpuPipelineState) {
    
    static ccstd::vector<VkPipelineShaderStageCreateInfo> stageInfos;
    static ccstd::vector<VkRayTracingShaderGroupCreateInfoKHR> groupInfos;
    static ccstd::vector<VkDynamicState> dynamicStates;

    VkRayTracingPipelineCreateInfoKHR createInfo{VK_STRUCTURE_TYPE_RAY_TRACING_PIPELINE_CREATE_INFO_KHR};

    ///////////////////// Shader Stages /////////////////////
    const auto &stages = gpuPipelineState->gpuShader->gpuStages;
    const size_t stageCount = stages.size();

    stageInfos.resize(stageCount, {VK_STRUCTURE_TYPE_PIPELINE_SHADER_STAGE_CREATE_INFO});
    for (size_t i = 0U; i < stageCount; ++i) {
        stageInfos[i].stage = mapVkShaderStageFlagBits(stages[i].type);
        stageInfos[i].module = stages[i].vkShader;
        stageInfos[i].pName = "main";
    }
    createInfo.stageCount = utils::toUint(stageCount);
    createInfo.pStages = stageInfos.data();

    ///////////////////// Groups /////////////////////
    const auto &groups = gpuPipelineState->gpuShader->gpuGroups;
    const size_t groupCount = groups.size();

    groupInfos.resize(groupCount,{VK_STRUCTURE_TYPE_RAY_TRACING_SHADER_GROUP_CREATE_INFO_KHR});
    for (size_t i = 0U; i < groupCount; ++i) {
        groupInfos[i].type = mapVkRayTracingShaderGroupType(groups[i].type);
        groupInfos[i].generalShader = groups[i].generalShader;
        groupInfos[i].closestHitShader = groups[i].closestHitShader;
        groupInfos[i].anyHitShader = groups[i].anyHitShader;
        groupInfos[i].intersectionShader = groups[i].intersectionShader;
    }

    createInfo.groupCount = utils::toUint(groupCount);
    createInfo.pGroups = groupInfos.data();

    ///////////////////// Max Recursion Depth /////////////////////
    createInfo.maxPipelineRayRecursionDepth = std::clamp(gpuPipelineState->maxRecursionDepth,
        static_cast<uint32_t>(1),device->gpuContext()->physicalDeviceRaytracingPipelineProperties.maxRayRecursionDepth);
    
    ///////////////////// Dynamic State //////////////////////////
    dynamicStates.assign({VK_DYNAMIC_STATE_VIEWPORT, VK_DYNAMIC_STATE_SCISSOR});
    insertVkDynamicStates(&dynamicStates, gpuPipelineState->dynamicStates);
    VkPipelineDynamicStateCreateInfo dynamicState{VK_STRUCTURE_TYPE_PIPELINE_DYNAMIC_STATE_CREATE_INFO};
    dynamicState.dynamicStateCount = utils::toUint(dynamicStates.size());
    dynamicState.pDynamicStates = dynamicStates.data();
    createInfo.pDynamicState = &dynamicState;

    ///////////////////// Layout /////////////////////
    createInfo.layout = gpuPipelineState->gpuPipelineLayout->vkPipelineLayout;

    VK_CHECK(vkCreateRayTracingPipelinesKHR(device->gpuDevice()->vkDevice,VK_NULL_HANDLE,device->gpuDevice()->vkPipelineCache,1,&createInfo,nullptr,&gpuPipelineState->vkPipeline));
}

void cmdFuncCCVKCreateGeneralBarrier(CCVKDevice * /*device*/, CCVKGPUGeneralBarrier *gpuGeneralBarrier) {
    gpuGeneralBarrier->barrier.prevAccessCount = utils::toUint(gpuGeneralBarrier->prevAccesses.size());
    gpuGeneralBarrier->barrier.pPrevAccesses = gpuGeneralBarrier->prevAccesses.data();
    gpuGeneralBarrier->barrier.nextAccessCount = utils::toUint(gpuGeneralBarrier->nextAccesses.size());
    gpuGeneralBarrier->barrier.pNextAccesses = gpuGeneralBarrier->nextAccesses.data();

    thsvsGetVulkanMemoryBarrier(gpuGeneralBarrier->barrier, &gpuGeneralBarrier->srcStageMask, &gpuGeneralBarrier->dstStageMask, &gpuGeneralBarrier->vkBarrier);
}

namespace {
void bufferUpload(const CCVKGPUBufferView &stagingBuffer, CCVKGPUBuffer &gpuBuffer, VkBufferCopy region, const CCVKGPUCommandBuffer *gpuCommandBuffer) {
#if BARRIER_DEDUCTION_LEVEL >= BARRIER_DEDUCTION_LEVEL_BASIC
    if (gpuBuffer.transferAccess) {
        // guard against WAW hazard
        VkMemoryBarrier vkBarrier{VK_STRUCTURE_TYPE_MEMORY_BARRIER};
        vkBarrier.srcAccessMask = VK_ACCESS_TRANSFER_WRITE_BIT;
        vkBarrier.dstAccessMask = VK_ACCESS_TRANSFER_WRITE_BIT;
        vkCmdPipelineBarrier(gpuCommandBuffer->vkCommandBuffer,
                             VK_PIPELINE_STAGE_TRANSFER_BIT,
                             VK_PIPELINE_STAGE_TRANSFER_BIT,
                             0, 1, &vkBarrier, 0, nullptr, 0, nullptr);
    }
#endif
    vkCmdCopyBuffer(gpuCommandBuffer->vkCommandBuffer, stagingBuffer.gpuBuffer->vkBuffer, gpuBuffer.vkBuffer, 1, &region);
};
} // namespace

void cmdFuncCCVKUpdateBuffer(CCVKDevice *device, CCVKGPUBuffer *gpuBuffer, const void *buffer, uint32_t size, const CCVKGPUCommandBuffer *cmdBuffer) {
    if (!gpuBuffer) return;

    const void *dataToUpload = nullptr;
    size_t sizeToUpload = 0U;

    if (hasFlag(gpuBuffer->usage, BufferUsageBit::INDIRECT)) {
        size_t drawInfoCount = size / sizeof(DrawInfo);
        const auto *drawInfo = static_cast<const DrawInfo *>(buffer);
        if (drawInfoCount > 0) {
            if (drawInfo->indexCount) {
                for (size_t i = 0; i < drawInfoCount; ++i) {
                    gpuBuffer->indexedIndirectCmds[i].indexCount = drawInfo->indexCount;
                    gpuBuffer->indexedIndirectCmds[i].instanceCount = std::max(drawInfo->instanceCount, 1U);
                    gpuBuffer->indexedIndirectCmds[i].firstIndex = drawInfo->firstIndex;
                    gpuBuffer->indexedIndirectCmds[i].vertexOffset = drawInfo->vertexOffset;
                    gpuBuffer->indexedIndirectCmds[i].firstInstance = drawInfo->firstInstance;
                    drawInfo++;
                }
                dataToUpload = gpuBuffer->indexedIndirectCmds.data();
                sizeToUpload = drawInfoCount * sizeof(VkDrawIndexedIndirectCommand);
                gpuBuffer->isDrawIndirectByIndex = true;
            } else {
                for (size_t i = 0; i < drawInfoCount; ++i) {
                    gpuBuffer->indirectCmds[i].vertexCount = drawInfo->vertexCount;
                    gpuBuffer->indirectCmds[i].instanceCount = std::max(drawInfo->instanceCount, 1U);
                    gpuBuffer->indirectCmds[i].firstVertex = drawInfo->firstVertex;
                    gpuBuffer->indirectCmds[i].firstInstance = drawInfo->firstInstance;
                    drawInfo++;
                }
                dataToUpload = gpuBuffer->indirectCmds.data();
                sizeToUpload = drawInfoCount * sizeof(VkDrawIndirectCommand);
                gpuBuffer->isDrawIndirectByIndex = false;
            }
        }
    } else {
        dataToUpload = buffer;
        sizeToUpload = size;
    }

    // back buffer instances update command
    uint32_t backBufferIndex = device->gpuDevice()->curBackBufferIndex;
    if (gpuBuffer->instanceSize) {
        device->gpuBufferHub()->record(gpuBuffer, backBufferIndex, sizeToUpload, !cmdBuffer);
        if (!cmdBuffer) {
            uint8_t *dst = gpuBuffer->mappedData + backBufferIndex * gpuBuffer->instanceSize;
            memcpy(dst, dataToUpload, sizeToUpload);
            return;
        }
    }

    // upload buffer by chunks
    uint32_t chunkSize = std::min(static_cast<VkDeviceSize>(sizeToUpload), CCVKGPUStagingBufferPool::CHUNK_SIZE);

    uint32_t chunkOffset = 0U;
    while (sizeToUpload) {
        uint32_t chunkSizeToUpload = std::min(chunkSize, static_cast<uint32_t>(sizeToUpload));
        sizeToUpload -= chunkSizeToUpload;

        IntrusivePtr<CCVKGPUBufferView> stagingBuffer = device->gpuStagingBufferPool()->alloc(chunkSizeToUpload);
        memcpy(stagingBuffer->mappedData(), static_cast<const char *>(dataToUpload) + chunkOffset, chunkSizeToUpload);

        VkBufferCopy region{
            stagingBuffer->offset,
            gpuBuffer->getStartOffset(backBufferIndex) + chunkOffset,
            chunkSizeToUpload,
        };

        chunkOffset += chunkSizeToUpload;

        if (cmdBuffer) {
            bufferUpload(*stagingBuffer, *gpuBuffer, region, cmdBuffer);
        } else {
            device->gpuTransportHub()->checkIn(
                // capture by ref is safe here since the transport function will be executed immediately in the same thread
                [&stagingBuffer, &gpuBuffer, region](CCVKGPUCommandBuffer *gpuCommandBuffer) {
                    bufferUpload(*stagingBuffer, *gpuBuffer, region, gpuCommandBuffer);
                });
        }
    }

    gpuBuffer->transferAccess = THSVS_ACCESS_TRANSFER_WRITE;
    device->gpuBarrierManager()->checkIn(gpuBuffer);
}

void cmdFuncCCVKCopyBuffersToTexture(CCVKDevice *device, const uint8_t *const *buffers, CCVKGPUTexture *gpuTexture,
                                     const BufferTextureCopy *regions, uint32_t count, const CCVKGPUCommandBuffer *gpuCommandBuffer) {
    ccstd::vector<ThsvsAccessType> &curTypes = gpuTexture->currentAccessTypes;

    ThsvsImageBarrier barrier{};
    barrier.image = gpuTexture->vkImage;
    barrier.discardContents = false;
    barrier.srcQueueFamilyIndex = VK_QUEUE_FAMILY_IGNORED;
    barrier.dstQueueFamilyIndex = VK_QUEUE_FAMILY_IGNORED;
    barrier.subresourceRange.levelCount = VK_REMAINING_MIP_LEVELS;
    barrier.subresourceRange.layerCount = VK_REMAINING_ARRAY_LAYERS;
    barrier.subresourceRange.aspectMask = gpuTexture->aspectMask;
    barrier.prevAccessCount = utils::toUint(curTypes.size());
    barrier.pPrevAccesses = curTypes.data();
    barrier.nextAccessCount = 1;
    barrier.pNextAccesses = getAccessType(AccessFlagBit::TRANSFER_WRITE);

    if (gpuTexture->transferAccess != THSVS_ACCESS_TRANSFER_WRITE) {
        cmdFuncCCVKImageMemoryBarrier(gpuCommandBuffer, barrier);
    } else {
        // guard against WAW hazard
        VkMemoryBarrier vkBarrier{VK_STRUCTURE_TYPE_MEMORY_BARRIER};
        vkBarrier.srcAccessMask = VK_ACCESS_TRANSFER_WRITE_BIT;
        vkBarrier.dstAccessMask = VK_ACCESS_TRANSFER_WRITE_BIT;
        vkCmdPipelineBarrier(gpuCommandBuffer->vkCommandBuffer,
                             VK_PIPELINE_STAGE_TRANSFER_BIT,
                             VK_PIPELINE_STAGE_TRANSFER_BIT,
                             0, 1, &vkBarrier, 0, nullptr, 0, nullptr);
    }

    uint32_t optimalOffsetAlignment = device->gpuContext()->physicalDeviceProperties.limits.optimalBufferCopyOffsetAlignment;
    uint32_t optimalRowPitchAlignment = device->gpuContext()->physicalDeviceProperties.limits.optimalBufferCopyRowPitchAlignment;
    uint32_t offsetAlignment = lcm(GFX_FORMAT_INFOS[toNumber(gpuTexture->format)].size, optimalRowPitchAlignment);

    auto blockSize = formatAlignment(gpuTexture->format);

    uint32_t idx = 0;
    for (size_t i = 0U; i < count; ++i) {
        const BufferTextureCopy &region{regions[i]};

        Offset offset{
            region.texOffset.x == 0 ? 0 : utils::alignTo(region.texOffset.x, static_cast<int32_t>(blockSize.first)),
            region.texOffset.y == 0 ? 0 : utils::alignTo(region.texOffset.y, static_cast<int32_t>(blockSize.second)),
            region.texOffset.z,
        };

        Extent extent{
            utils::alignTo(region.texExtent.width, static_cast<uint32_t>(blockSize.first)),
            utils::alignTo(region.texExtent.height, static_cast<uint32_t>(blockSize.second)),
            region.texExtent.depth,
        };

        Extent stride{
            region.buffStride > 0 ? region.buffStride : extent.width,
            region.buffTexHeight > 0 ? region.buffTexHeight : extent.height,
            0, // useless
        };

        uint32_t layerCount = region.texSubres.layerCount;
        uint32_t baseLayer = region.texSubres.baseArrayLayer;
        uint32_t mipLevel = region.texSubres.mipLevel;

        uint32_t rowPitchSize = formatSize(gpuTexture->format, extent.width, 1, 1);
        rowPitchSize = utils::alignTo(rowPitchSize, optimalRowPitchAlignment);
        // what if the optimal alignment is smaller than a block size
        uint32_t rowPitch = rowPitchSize / formatSize(gpuTexture->format, 1, 1, 1) * blockSize.first;

        uint32_t destRowSize = formatSize(gpuTexture->format, extent.width, 1, 1);
        uint32_t destSliceSize = formatSize(gpuTexture->format, extent.width, extent.height, 1);
        uint32_t buffStrideSize = formatSize(gpuTexture->format, stride.width, 1, 1);
        uint32_t buffSliceSize = formatSize(gpuTexture->format, stride.width, stride.height, 1);

        // calculate the max height to upload per staging buffer chunk
        uint32_t chunkHeight = extent.height;
        size_t chunkSize = rowPitchSize * (extent.height / blockSize.second);
        while (chunkSize > CCVKGPUStagingBufferPool::CHUNK_SIZE) {
            chunkHeight = utils::alignTo((chunkHeight - 1) / 2 + 1, blockSize.second);
            chunkSize = rowPitchSize * (chunkHeight / blockSize.second);
        }

        uint32_t destOffset = 0;
        uint32_t buffOffset = 0;

        uint32_t destWidth = (region.texExtent.width + offset.x == (gpuTexture->width >> mipLevel)) ? region.texExtent.width : extent.width;
        uint32_t destHeight = (region.texExtent.height + offset.y == (gpuTexture->height >> mipLevel)) ? region.texExtent.height : extent.height;

        int32_t heightOffset = 0;
        uint32_t stepHeight = 0;
        for (uint32_t l = 0; l < layerCount; l++) {
            for (uint32_t depth = 0; depth < extent.depth; ++depth) {
                buffOffset = region.buffOffset + depth * buffSliceSize;
                // upload in chunks
                for (uint32_t h = 0U; h < extent.height; h += chunkHeight) {
                    destOffset = 0;
                    heightOffset = static_cast<int32_t>(h);
                    stepHeight = std::min(chunkHeight, extent.height - h);

                    uint32_t stagingBufferSize = rowPitchSize * (stepHeight / blockSize.second);
                    IntrusivePtr<CCVKGPUBufferView> stagingBuffer = device->gpuStagingBufferPool()->alloc(stagingBufferSize, offsetAlignment);

                    for (uint32_t j = 0; j < stepHeight; j += blockSize.second) {
                        memcpy(stagingBuffer->mappedData() + destOffset, buffers[idx] + buffOffset, destRowSize);
                        destOffset += rowPitchSize;
                        buffOffset += buffStrideSize;
                    }

                    VkBufferImageCopy stagingRegion;
                    stagingRegion.bufferOffset = stagingBuffer->offset;
                    stagingRegion.bufferRowLength = rowPitch;
                    stagingRegion.bufferImageHeight = stepHeight;
                    stagingRegion.imageSubresource = {gpuTexture->aspectMask, mipLevel, l + baseLayer, 1};
                    stagingRegion.imageOffset = {offset.x, offset.y + heightOffset, offset.z + static_cast<int>(depth)};
                    stagingRegion.imageExtent = {destWidth, std::min(stepHeight, destHeight - heightOffset), 1};

                    vkCmdCopyBufferToImage(gpuCommandBuffer->vkCommandBuffer, stagingBuffer->gpuBuffer->vkBuffer, gpuTexture->vkImage,
                                           VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL, 1, &stagingRegion);
                }
            }
            idx++;
        }
    }

    if (hasFlag(gpuTexture->flags, TextureFlags::GEN_MIPMAP)) {
        VkFormatProperties formatProperties;
        vkGetPhysicalDeviceFormatProperties(device->gpuContext()->physicalDevice, mapVkFormat(gpuTexture->format, device->gpuDevice()), &formatProperties);
        VkFormatFeatureFlags mipmapFeatures = VK_FORMAT_FEATURE_BLIT_SRC_BIT | VK_FORMAT_FEATURE_BLIT_DST_BIT | VK_FORMAT_FEATURE_SAMPLED_IMAGE_FILTER_LINEAR_BIT;

        if (formatProperties.optimalTilingFeatures & mipmapFeatures) {
            int width = static_cast<int>(gpuTexture->width);
            int height = static_cast<int>(gpuTexture->height);

            VkImageBlit blitInfo{};
            blitInfo.srcSubresource.aspectMask = gpuTexture->aspectMask;
            blitInfo.srcSubresource.layerCount = gpuTexture->arrayLayers;
            blitInfo.dstSubresource.aspectMask = gpuTexture->aspectMask;
            blitInfo.dstSubresource.layerCount = gpuTexture->arrayLayers;
            blitInfo.srcOffsets[1] = {width, height, 1};
            blitInfo.dstOffsets[1] = {std::max(width >> 1, 1), std::max(height >> 1, 1), 1};
            barrier.subresourceRange.levelCount = 1;
            barrier.prevAccessCount = 1;
            barrier.pPrevAccesses = getAccessType(AccessFlagBit::TRANSFER_WRITE);
            barrier.pNextAccesses = getAccessType(AccessFlagBit::TRANSFER_READ);

            for (uint32_t i = 1U; i < gpuTexture->mipLevels; ++i) {
                barrier.subresourceRange.baseMipLevel = i - 1;
                cmdFuncCCVKImageMemoryBarrier(gpuCommandBuffer, barrier);

                blitInfo.srcSubresource.mipLevel = i - 1;
                blitInfo.dstSubresource.mipLevel = i;
                vkCmdBlitImage(gpuCommandBuffer->vkCommandBuffer, gpuTexture->vkImage, VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL,
                               gpuTexture->vkImage, VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL, 1, &blitInfo, VK_FILTER_LINEAR);

                const int32_t w = blitInfo.srcOffsets[1].x = blitInfo.dstOffsets[1].x;
                const int32_t h = blitInfo.srcOffsets[1].y = blitInfo.dstOffsets[1].y;
                blitInfo.dstOffsets[1].x = std::max(w >> 1, 1);
                blitInfo.dstOffsets[1].y = std::max(h >> 1, 1);
            }

            barrier.subresourceRange.baseMipLevel = 0;
            barrier.subresourceRange.levelCount = gpuTexture->mipLevels - 1;
            barrier.pPrevAccesses = getAccessType(AccessFlagBit::TRANSFER_READ);
            barrier.pNextAccesses = getAccessType(AccessFlagBit::TRANSFER_WRITE);

            cmdFuncCCVKImageMemoryBarrier(gpuCommandBuffer, barrier);
        } else {
            const char *formatName = GFX_FORMAT_INFOS[toNumber(gpuTexture->format)].name.c_str();
            CC_LOG_WARNING("cmdFuncCCVKCopyBuffersToTexture: generate mipmap for %s is not supported on this platform", formatName);
        }
    }

    curTypes.assign({THSVS_ACCESS_TRANSFER_WRITE});
    gpuTexture->transferAccess = THSVS_ACCESS_TRANSFER_WRITE;
    device->gpuBarrierManager()->checkIn(gpuTexture);
}

void cmdFuncCCVKCopyTextureToBuffers(CCVKDevice *device, CCVKGPUTexture *srcTexture, CCVKGPUBufferView *destBuffer,
                                     const BufferTextureCopy *regions, uint32_t count, const CCVKGPUCommandBuffer *gpuCommandBuffer) {
    ccstd::vector<ThsvsAccessType> &curTypes = srcTexture->currentAccessTypes;

    ThsvsImageBarrier barrier{};
    barrier.image = srcTexture->vkImage;
    barrier.discardContents = false;
    barrier.srcQueueFamilyIndex = VK_QUEUE_FAMILY_IGNORED;
    barrier.dstQueueFamilyIndex = VK_QUEUE_FAMILY_IGNORED;
    barrier.subresourceRange.levelCount = VK_REMAINING_MIP_LEVELS;
    barrier.subresourceRange.layerCount = VK_REMAINING_ARRAY_LAYERS;
    barrier.subresourceRange.aspectMask = srcTexture->aspectMask;
    barrier.prevAccessCount = utils::toUint(curTypes.size());
    barrier.pPrevAccesses = curTypes.data();
    barrier.nextAccessCount = 1;
    barrier.pNextAccesses = getAccessType(AccessFlagBit::TRANSFER_READ);

    if (srcTexture->transferAccess != THSVS_ACCESS_TRANSFER_READ) {
        cmdFuncCCVKImageMemoryBarrier(gpuCommandBuffer, barrier);
    }

    ccstd::vector<VkBufferImageCopy> stagingRegions(count);
    VkDeviceSize offset = 0;
    for (size_t i = 0U; i < count; ++i) {
        const BufferTextureCopy &region = regions[i];
        VkBufferImageCopy &stagingRegion = stagingRegions[i];
        stagingRegion.bufferOffset = destBuffer->offset + offset;
        stagingRegion.bufferRowLength = region.buffStride;
        stagingRegion.bufferImageHeight = region.buffTexHeight;
        stagingRegion.imageSubresource = {srcTexture->aspectMask, region.texSubres.mipLevel, region.texSubres.baseArrayLayer, region.texSubres.layerCount};
        stagingRegion.imageOffset = {region.texOffset.x, region.texOffset.y, region.texOffset.z};
        stagingRegion.imageExtent = {region.texExtent.width, region.texExtent.height, region.texExtent.depth};

        uint32_t w = region.buffStride > 0 ? region.buffStride : region.texExtent.width;
        uint32_t h = region.buffTexHeight > 0 ? region.buffTexHeight : region.texExtent.height;
        uint32_t regionSize = formatSize(srcTexture->format, w, h, region.texExtent.depth);

        offset += regionSize;
    }
    vkCmdCopyImageToBuffer(gpuCommandBuffer->vkCommandBuffer, srcTexture->vkImage, VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL,
                           destBuffer->gpuBuffer->vkBuffer, utils::toUint(stagingRegions.size()), stagingRegions.data());

    curTypes.assign({THSVS_ACCESS_TRANSFER_READ});
    srcTexture->transferAccess = THSVS_ACCESS_TRANSFER_READ;
    device->gpuBarrierManager()->checkIn(srcTexture);
}

namespace {
template <class... Ts>
struct Overloaded : Ts... { using Ts::operator()...; };
template <class... Ts>
Overloaded(Ts...) -> Overloaded<Ts...>;

// Acceleration Structure Helper Functions

VkDeviceAddress getVkBufferDeviceAddr(VkDevice device, VkBuffer buffer) {
    VkBufferDeviceAddressInfo bufferDeviceAddrInfo{VK_STRUCTURE_TYPE_BUFFER_DEVICE_ADDRESS_INFO};
    bufferDeviceAddrInfo.buffer = buffer;
    return vkGetBufferDeviceAddressKHR(device, &bufferDeviceAddrInfo);
}

VkDeviceAddress getVkBufferDeviceAddr(VkDevice device, CCVKBuffer *buffer) {
    if (!buffer->gpuBuffer() || !buffer->gpuBuffer()->vkBuffer) return VkDeviceAddress{};
    return getVkBufferDeviceAddr(device, buffer->gpuBuffer()->vkBuffer);
}

VkDeviceAddress getVkBufferDeviceAddr(VkDevice device, const CCVKGPUBuffer *buffer) {
    if (!buffer->vkBuffer) return VkDeviceAddress{};
    return getVkBufferDeviceAddr(device, buffer->vkBuffer);
}

VkDeviceAddress getVkBufferDeviceAddr(CCVKDevice *device, const CCVKGPUBuffer *buffer) {
    return getVkBufferDeviceAddr(device->gpuDevice()->vkDevice, buffer);
}

void fillGeometryInfo(CCVKDevice *device, CCVKGPUAccelerationStructure *gpuAccelerationStructure, VkAccelerationStructureGeometryKHR &accelerationStructureGeom,const std::vector<ASInstance> &instances) {
    gpuAccelerationStructure->buildGeometryInfo.type = VK_ACCELERATION_STRUCTURE_TYPE_TOP_LEVEL_KHR;
    accelerationStructureGeom.flags = VK_GEOMETRY_OPAQUE_BIT_KHR;
    accelerationStructureGeom.geometryType = VK_GEOMETRY_TYPE_INSTANCES_KHR;

    const uint32_t instanceCount = instances.size();
    const uint32_t instanceBufferSize = instanceCount * sizeof(VkAccelerationStructureInstanceKHR);

    //todo DESIGN CONSIDERATION
    /* Who should hold instances buffer?
     * platform, abstraction, efficiency
     */

    // Create instances data buffer, but do not upload data yet.
    gpuAccelerationStructure->instancesBuffer = ccnew CCVKGPUBuffer;
    gpuAccelerationStructure->instancesBuffer->size = instanceBufferSize;
    gpuAccelerationStructure->instancesBuffer->usage = BufferUsageBit::SHADER_DEVICE_ADDRESS | BufferUsageBit::ACCELERATION_STRUCTURE_BUILD_INPUT_READ_ONLY | BufferUsageBit::TRANSFER_DST;
    gpuAccelerationStructure->instancesBuffer->memUsage = MemoryUsageBit::DEVICE;
    gpuAccelerationStructure->instancesBuffer->init();

    VkAccelerationStructureGeometryInstancesDataKHR instancesData{VK_STRUCTURE_TYPE_ACCELERATION_STRUCTURE_GEOMETRY_INSTANCES_DATA_KHR};
    instancesData.data.deviceAddress = getVkBufferDeviceAddr(device, gpuAccelerationStructure->instancesBuffer);

    accelerationStructureGeom.geometry.instances = instancesData;
    gpuAccelerationStructure->geometries.push_back(accelerationStructureGeom);
    gpuAccelerationStructure->rangeInfos.push_back({instanceCount, 0, 0, 0});
}

void fillGeometryInfo(CCVKDevice *device, CCVKGPUAccelerationStructure *gpuAccelerationStructure, VkAccelerationStructureGeometryKHR &accelerationStructureGeom, const std::vector<ASTriangleMesh> &mesh) {
    gpuAccelerationStructure->buildGeometryInfo.type = VK_ACCELERATION_STRUCTURE_TYPE_BOTTOM_LEVEL_KHR;
    for (const auto &triangles : mesh) {
        accelerationStructureGeom.flags = VK_GEOMETRY_OPAQUE_BIT_KHR;
        accelerationStructureGeom.geometryType = VK_GEOMETRY_TYPE_TRIANGLES_KHR;
        accelerationStructureGeom.geometry.triangles = mapVkASGeomTrianglesData(triangles, device->gpuDevice());
        gpuAccelerationStructure->geometries.push_back(accelerationStructureGeom);
        gpuAccelerationStructure->rangeInfos.push_back({triangles.indexCount / 3, 0, 0, 0});
    }
}

void fillGeometryInfo(CCVKDevice *device, CCVKGPUAccelerationStructure *gpuAccelerationStructure, VkAccelerationStructureGeometryKHR &accelerationStructureGeom, const std::vector<ASAABB> &aabbs) {
    gpuAccelerationStructure->buildGeometryInfo.type = VK_ACCELERATION_STRUCTURE_TYPE_BOTTOM_LEVEL_KHR;
    accelerationStructureGeom.geometryType = VK_GEOMETRY_TYPE_AABBS_KHR;
    accelerationStructureGeom.flags = VK_GEOMETRY_OPAQUE_BIT_KHR;

    const uint32_t aabbsCount = aabbs.size();
    const uint32_t aabbsBufferSize = aabbsCount * sizeof(VkAabbPositionsKHR);

    //Create aabbs data buffer

    gpuAccelerationStructure->aabbsBuffer = ccnew CCVKGPUBuffer;
    gpuAccelerationStructure->aabbsBuffer->size = aabbsBufferSize;
    gpuAccelerationStructure->aabbsBuffer->usage = BufferUsageBit::SHADER_DEVICE_ADDRESS | BufferUsageBit::ACCELERATION_STRUCTURE_BUILD_INPUT_READ_ONLY | BufferUsageBit::TRANSFER_DST;
    gpuAccelerationStructure->aabbsBuffer->memUsage = MemoryUsageBit::DEVICE;
    //cmdFuncCCVKCreateBuffer(device, gpuAccelerationStructure->aabbsBuffer);
    gpuAccelerationStructure->aabbsBuffer->init();

    ccstd::vector<VkAabbPositionsKHR> aabbPositions{};
    aabbPositions.reserve(aabbsCount);

    std::transform(aabbs.cbegin(), aabbs.cend(), std::back_inserter(aabbPositions),
                   [&](const ASAABB &aabb) { return VkAabbPositionsKHR{aabb.minX, aabb.minY, aabb.minZ, aabb.maxX, aabb.maxY, aabb.maxZ}; });

    cmdFuncCCVKUpdateBuffer(device, gpuAccelerationStructure->aabbsBuffer, aabbPositions.data(), aabbsBufferSize, nullptr);

    VkAccelerationStructureGeometryAabbsDataKHR aabbsData{VK_STRUCTURE_TYPE_ACCELERATION_STRUCTURE_GEOMETRY_AABBS_DATA_KHR};
    aabbsData.data.deviceAddress = getVkBufferDeviceAddr(device,gpuAccelerationStructure->aabbsBuffer);
    aabbsData.stride = sizeof(VkAabbPositionsKHR);
    accelerationStructureGeom.geometry.aabbs = aabbsData;
    gpuAccelerationStructure->geometries.push_back(accelerationStructureGeom);
    gpuAccelerationStructure->rangeInfos.push_back({aabbsCount, 0, 0, 0});
}

} // namespace

void cmdFuncCCVKCreateAcclerationStructure(CCVKDevice *device, CCVKGPUAccelerationStructure *gpuAccelerationStructure) {
    const auto *gpuDevice = CCVKDevice::getInstance()->gpuDevice();
    VkAccelerationStructureGeometryKHR accelerationStructureGeom{VK_STRUCTURE_TYPE_ACCELERATION_STRUCTURE_GEOMETRY_KHR};

    std::visit(Overloaded{
                   [](auto arg) {},
                   [&](const std::vector<ASInstance> &instances) {
                       fillGeometryInfo(device, gpuAccelerationStructure, accelerationStructureGeom, instances);
                   },
                   [&](const std::vector<ASTriangleMesh> &mesh) {
                       fillGeometryInfo(device, gpuAccelerationStructure, accelerationStructureGeom,mesh);
                   },
                   [&](const std::vector<ASAABB> &aabbs) {
                       fillGeometryInfo(device, gpuAccelerationStructure, accelerationStructureGeom, aabbs);
                   }},
               gpuAccelerationStructure->geomtryInfos);

    VkAccelerationStructureCreateInfoKHR accelerationStructureCreateInfo{VK_STRUCTURE_TYPE_ACCELERATION_STRUCTURE_CREATE_INFO_KHR};

    ccstd::vector<uint32_t> maxPrimitiveCount(gpuAccelerationStructure->geometries.size());

    const auto &pRangeInfo = gpuAccelerationStructure->rangeInfos;

    for (auto i = 0; i < maxPrimitiveCount.size(); ++i) {
        maxPrimitiveCount[i] = pRangeInfo[i].primitiveCount;
    }

    VkAccelerationStructureBuildGeometryInfoKHR &geomInfo = gpuAccelerationStructure->buildGeometryInfo;

    geomInfo.flags = mapVkBuildAccelerationStructureFlags(gpuAccelerationStructure->buildFlags);
    geomInfo.geometryCount = gpuAccelerationStructure->geometries.size();
    geomInfo.pGeometries = gpuAccelerationStructure->geometries.data();

    vkGetAccelerationStructureBuildSizesKHR(gpuDevice->vkDevice, VK_ACCELERATION_STRUCTURE_BUILD_TYPE_DEVICE_KHR,
                                            &geomInfo,
                                            maxPrimitiveCount.data(),
                                            &gpuAccelerationStructure->buildSizesInfo);

    accelerationStructureCreateInfo.size = gpuAccelerationStructure->buildSizesInfo.accelerationStructureSize;

    // Create Backing buffer
    gpuAccelerationStructure->backingBuffer = ccnew CCVKGPUBuffer;
    gpuAccelerationStructure->backingBuffer->size = accelerationStructureCreateInfo.size;
    gpuAccelerationStructure->backingBuffer->usage = BufferUsageBit::ACCELERATION_STRUCTURE_STORAGE | BufferUsageBit::TRANSFER_DST;
    gpuAccelerationStructure->backingBuffer->memUsage = MemoryUsageBit::DEVICE;
    gpuAccelerationStructure->backingBuffer->init();

    accelerationStructureCreateInfo.buffer = gpuAccelerationStructure->backingBuffer->vkBuffer;
    accelerationStructureCreateInfo.type = gpuAccelerationStructure->buildGeometryInfo.type;
    accelerationStructureCreateInfo.offset = 0;

    VK_CHECK(vkCreateAccelerationStructureKHR(gpuDevice->vkDevice, &accelerationStructureCreateInfo, nullptr, &gpuAccelerationStructure->vkAccelerationStructure));
}

namespace {

void updateInstanceDataGPUBuffer(CCVKDevice *device, CCVKGPUAccelerationStructure *accel, const CCVKGPUCommandBuffer *gpuCommandBuffer) {

    static ccstd::vector<VkAccelerationStructureInstanceKHR> instances{};
    instances.clear();
    const auto &asInstances = std::get<ccstd::vector<ASInstance>>(accel->geomtryInfos);
    instances.reserve(asInstances.size());
    std::transform(asInstances.cbegin(), asInstances.cend(), std::back_inserter(instances),
                   [&](const ASInstance &inst) { return mapVkASInstance(device->gpuDevice(), inst); });

    const uint32_t instanceBufferSize = instances.size() * sizeof(VkAccelerationStructureInstanceKHR);
    assert(accel->instancesBuffer->size >= instanceBufferSize);

    cmdFuncCCVKUpdateBuffer(device, accel->instancesBuffer, instances.data(), instanceBufferSize, gpuCommandBuffer);

    const uint32_t instanceCount = asInstances.size();
    accel->rangeInfos[0] = {instanceCount, 0, 0, 0};
}

void checkScratchBufferRequirement(CCVKDevice *device, CCVKGPUAccelerationStructure *accel) {
    // Create Scratch Buffer (if needed)
    if (!accel->scratchBuffer || accel->scratchBuffer->size < accel->buildSizesInfo.buildScratchSize) {

        accel->scratchBuffer = ccnew CCVKGPUBuffer;
        accel->scratchBuffer->size = accel->buildSizesInfo.buildScratchSize;
        accel->scratchBuffer->usage = BufferUsageBit::SHADER_DEVICE_ADDRESS | BufferUsageBit::ACCELERATION_STRUCTURE_BUILD_SCRATCH;
        accel->scratchBuffer->memUsage = MemoryUsageBit::DEVICE;
        accel->scratchBuffer->init();
    }
}

}

void cmdFuncCCVKBuildAccelerationStructure(CCVKDevice *device,CCVKGPUAccelerationStructure *accel, const CCVKGPUCommandBuffer *gpuCommandBuffer) {

    checkScratchBufferRequirement(device, accel);

    cmdFuncCCVKBuildAccelerationStructure(device, accel, gpuCommandBuffer, accel->scratchBuffer);
}

void cmdFuncCCVKBuildAccelerationStructure(CCVKDevice *device, CCVKGPUAccelerationStructure *accel, const CCVKGPUCommandBuffer *gpuCommandBuffer, const CCVKGPUBuffer *scratchBuffer ) {
    if (!accel->vkAccelerationStructure) {
        return;
    }

    if (accel->buildGeometryInfo.type == VK_ACCELERATION_STRUCTURE_TYPE_TOP_LEVEL_KHR) {
        updateInstanceDataGPUBuffer(device, accel, gpuCommandBuffer);
    }

    auto &buildGeomInfo = accel->buildGeometryInfo;
    buildGeomInfo.srcAccelerationStructure = VK_NULL_HANDLE;
    buildGeomInfo.dstAccelerationStructure = accel->vkAccelerationStructure;
    buildGeomInfo.mode = VK_BUILD_ACCELERATION_STRUCTURE_MODE_BUILD_KHR;

    buildGeomInfo.scratchData.deviceAddress = getVkBufferDeviceAddr(device->gpuDevice()->vkDevice, scratchBuffer);

    CC_ASSERT(buildGeomInfo.scratchData.deviceAddress != 0);
    CC_ASSERT(isMultipleOf(buildGeomInfo.scratchData.deviceAddress, device->gpuContext()->physicalDeviceAccelerationStructureProperties.minAccelerationStructureScratchOffsetAlignment));

    const auto &accelRangeInfosConRef = accel->rangeInfos;
    const size_t rangeInfoCount = accelRangeInfosConRef.size();
    ccstd::vector<const VkAccelerationStructureBuildRangeInfoKHR *> buildRangeInfoPtrs(rangeInfoCount);

    for (uint32_t i = 0; i < rangeInfoCount; ++i) {
        buildRangeInfoPtrs[i] = &accelRangeInfosConRef[i];
    }

    {
        VkMemoryBarrier barrier{VK_STRUCTURE_TYPE_MEMORY_BARRIER};
        barrier.srcAccessMask = VK_ACCESS_ACCELERATION_STRUCTURE_WRITE_BIT_KHR;
        barrier.dstAccessMask = VK_ACCESS_ACCELERATION_STRUCTURE_READ_BIT_KHR | VK_ACCESS_ACCELERATION_STRUCTURE_WRITE_BIT_KHR;
        vkCmdPipelineBarrier(gpuCommandBuffer->vkCommandBuffer,
                             VK_PIPELINE_STAGE_ACCELERATION_STRUCTURE_BUILD_BIT_KHR,
                             VK_PIPELINE_STAGE_ACCELERATION_STRUCTURE_BUILD_BIT_KHR,
                             0, 1, &barrier, 0, nullptr, 0, nullptr);
    }

    vkCmdBuildAccelerationStructuresKHR(gpuCommandBuffer->vkCommandBuffer, 1, &buildGeomInfo, buildRangeInfoPtrs.data());

    {
        VkMemoryBarrier barrier{VK_STRUCTURE_TYPE_MEMORY_BARRIER};
        barrier.srcAccessMask = VK_ACCESS_ACCELERATION_STRUCTURE_WRITE_BIT_KHR;
        barrier.dstAccessMask = VK_ACCESS_ACCELERATION_STRUCTURE_READ_BIT_KHR | VK_ACCESS_ACCELERATION_STRUCTURE_WRITE_BIT_KHR;
        vkCmdPipelineBarrier(gpuCommandBuffer->vkCommandBuffer,
                             VK_PIPELINE_STAGE_ACCELERATION_STRUCTURE_BUILD_BIT_KHR,
                             VK_PIPELINE_STAGE_ACCELERATION_STRUCTURE_BUILD_BIT_KHR,
                             0, 1, &barrier, 0, nullptr, 0, nullptr);
    }

    if (hasFlag(accel->buildFlags, ASBuildFlagBits::ALLOW_COMPACTION)) {
        const auto &vkdevice = device->gpuDevice()->vkDevice;

        if (!accel->vkCompactedSizeQueryPool) {
            VkQueryPoolCreateInfo queryPoolCreateInfo = {VK_STRUCTURE_TYPE_QUERY_POOL_CREATE_INFO};
            queryPoolCreateInfo.queryCount = 1;
            queryPoolCreateInfo.queryType = VK_QUERY_TYPE_ACCELERATION_STRUCTURE_COMPACTED_SIZE_KHR;
            VK_CHECK(vkCreateQueryPool(vkdevice, &queryPoolCreateInfo, nullptr, &accel->vkCompactedSizeQueryPool));
            vkCmdResetQueryPool(gpuCommandBuffer->vkCommandBuffer, accel->vkCompactedSizeQueryPool, 0, 1);
        }

        vkCmdWriteAccelerationStructuresPropertiesKHR(gpuCommandBuffer->vkCommandBuffer, 1, &accel->vkAccelerationStructure,
                                                      VK_QUERY_TYPE_ACCELERATION_STRUCTURE_COMPACTED_SIZE_KHR, accel->vkCompactedSizeQueryPool, 0);
    }
}

void cmdFuncCCVKUpdateAccelerationStructure(CCVKDevice *device, CCVKGPUAccelerationStructure *accel, const CCVKGPUCommandBuffer *gpuCommandBuffer)
{
    if (!accel->vkAccelerationStructure || !hasFlag(accel->buildFlags, ASBuildFlagBits::ALLOW_UPDATE)) {
        return;
    }

    if (accel->buildGeometryInfo.type == VK_ACCELERATION_STRUCTURE_TYPE_TOP_LEVEL_KHR) {
        updateInstanceDataGPUBuffer(device, accel,gpuCommandBuffer);
    }

    VkAccelerationStructureBuildGeometryInfoKHR &buildGeomInfo = accel->buildGeometryInfo;
    buildGeomInfo.srcAccelerationStructure = accel->vkAccelerationStructure;
    buildGeomInfo.dstAccelerationStructure = accel->vkAccelerationStructure;
    buildGeomInfo.mode = VK_BUILD_ACCELERATION_STRUCTURE_MODE_UPDATE_KHR;

    checkScratchBufferRequirement(device, accel);

    buildGeomInfo.scratchData.deviceAddress = getVkBufferDeviceAddr(device->gpuDevice()->vkDevice, accel->scratchBuffer);

    const auto &accelRangeInfosConRef = accel->rangeInfos;
    const size_t rangeInfoCount = accelRangeInfosConRef.size();
    ccstd::vector<const VkAccelerationStructureBuildRangeInfoKHR *> buildRangeInfoPtrs(rangeInfoCount);

    for (uint32_t i = 0; i < rangeInfoCount; ++i) {
        buildRangeInfoPtrs[i] = &accelRangeInfosConRef[i];
    }

     {
        VkMemoryBarrier barrier{VK_STRUCTURE_TYPE_MEMORY_BARRIER};
        barrier.srcAccessMask = VK_ACCESS_ACCELERATION_STRUCTURE_WRITE_BIT_KHR;
        barrier.dstAccessMask = VK_ACCESS_ACCELERATION_STRUCTURE_READ_BIT_KHR | VK_ACCESS_ACCELERATION_STRUCTURE_WRITE_BIT_KHR;
        vkCmdPipelineBarrier(gpuCommandBuffer->vkCommandBuffer,
                             VK_PIPELINE_STAGE_ACCELERATION_STRUCTURE_BUILD_BIT_KHR,
                             VK_PIPELINE_STAGE_ACCELERATION_STRUCTURE_BUILD_BIT_KHR,
                             0, 1, &barrier, 0, nullptr, 0, nullptr);
    }

    vkCmdBuildAccelerationStructuresKHR(gpuCommandBuffer->vkCommandBuffer, 1, &buildGeomInfo, buildRangeInfoPtrs.data());

     {
        VkMemoryBarrier barrier{VK_STRUCTURE_TYPE_MEMORY_BARRIER};
        barrier.srcAccessMask = VK_ACCESS_ACCELERATION_STRUCTURE_WRITE_BIT_KHR;
        barrier.dstAccessMask = VK_ACCESS_ACCELERATION_STRUCTURE_READ_BIT_KHR | VK_ACCESS_ACCELERATION_STRUCTURE_WRITE_BIT_KHR;
        vkCmdPipelineBarrier(gpuCommandBuffer->vkCommandBuffer,
                             VK_PIPELINE_STAGE_ACCELERATION_STRUCTURE_BUILD_BIT_KHR,
                             VK_PIPELINE_STAGE_ACCELERATION_STRUCTURE_BUILD_BIT_KHR,
                             0, 1, &barrier, 0, nullptr, 0, nullptr);
    }
}

void cmdFuncCCVKCompactAccelerationStructure(CCVKDevice *device, CCVKGPUAccelerationStructure *accel, CCVKGPUAccelerationStructure *res, const CCVKGPUCommandBuffer *gpuCommandBuffer) {

    if (!accel->vkAccelerationStructure||
        !hasFlag(accel->buildFlags, ASBuildFlagBits::ALLOW_COMPACTION)||
        !accel->vkCompactedSizeQueryPool) {
        return;
    }

    const auto &vkdevice = device->gpuDevice()->vkDevice;
    uint32_t compactedSize{0};
    vkGetQueryPoolResults(vkdevice, accel->vkCompactedSizeQueryPool, 0, 1, sizeof(uint32_t), &compactedSize, sizeof(uint32_t), VK_QUERY_RESULT_WAIT_BIT);

    res->backingBuffer = ccnew CCVKGPUBuffer;
    res->backingBuffer->size = compactedSize;
    res->backingBuffer->usage = BufferUsageBit::ACCELERATION_STRUCTURE_STORAGE | BufferUsageBit::TRANSFER_DST;
    res->backingBuffer->memUsage = MemoryUsageBit::DEVICE;
    res->backingBuffer->init();

    VkAccelerationStructureCreateInfoKHR compactedAccelCreateInfo = {VK_STRUCTURE_TYPE_ACCELERATION_STRUCTURE_CREATE_INFO_KHR};
    compactedAccelCreateInfo.size = compactedSize;
    compactedAccelCreateInfo.type = accel->buildGeometryInfo.type;
    compactedAccelCreateInfo.offset = 0;
    compactedAccelCreateInfo.buffer = res->backingBuffer->vkBuffer;

    VK_CHECK(vkCreateAccelerationStructureKHR(vkdevice, &compactedAccelCreateInfo, nullptr, &res->vkAccelerationStructure));

    VkCopyAccelerationStructureInfoKHR copyInfo = {VK_STRUCTURE_TYPE_COPY_ACCELERATION_STRUCTURE_INFO_KHR};
    copyInfo.src = accel->vkAccelerationStructure;
    copyInfo.dst = res->vkAccelerationStructure;
    copyInfo.mode = VK_COPY_ACCELERATION_STRUCTURE_MODE_COMPACT_KHR;

    vkCmdCopyAccelerationStructureKHR(gpuCommandBuffer->vkCommandBuffer, &copyInfo);
}

void cmdFuncCCVKDestroyQueryPool(CCVKGPUDevice *gpuDevice, CCVKGPUQueryPool *gpuQueryPool) {
    if (gpuQueryPool->vkPool != VK_NULL_HANDLE) {
        vkDestroyQueryPool(gpuDevice->vkDevice, gpuQueryPool->vkPool, nullptr);
        gpuQueryPool->vkPool = VK_NULL_HANDLE;
    }
}

void cmdFuncCCVKDestroyRenderPass(CCVKGPUDevice *gpuDevice, CCVKGPURenderPass *gpuRenderPass) {
    if (gpuRenderPass->vkRenderPass != VK_NULL_HANDLE) {
        vkDestroyRenderPass(gpuDevice->vkDevice, gpuRenderPass->vkRenderPass, nullptr);
        gpuRenderPass->vkRenderPass = VK_NULL_HANDLE;
    }
}

void cmdFuncCCVKDestroySampler(CCVKGPUDevice *gpuDevice, CCVKGPUSampler *gpuSampler) {
    if (gpuSampler->vkSampler != VK_NULL_HANDLE) {
        vkDestroySampler(gpuDevice->vkDevice, gpuSampler->vkSampler, nullptr);
        gpuSampler->vkSampler = VK_NULL_HANDLE;
    }
}

void cmdFuncCCVKDestroyShader(CCVKGPUDevice *gpuDevice, CCVKGPUShader *gpuShader) {
    for (CCVKGPUShaderStage &stage : gpuShader->gpuStages) {
        vkDestroyShaderModule(gpuDevice->vkDevice, stage.vkShader, nullptr);
        stage.vkShader = VK_NULL_HANDLE;
    }
}

void cmdFuncCCVKDestroyDescriptorSetLayout(CCVKGPUDevice *gpuDevice, CCVKGPUDescriptorSetLayout *gpuDescriptorSetLayout) {
    if (gpuDescriptorSetLayout->vkDescriptorUpdateTemplate != VK_NULL_HANDLE) {
        if (gpuDevice->minorVersion > 0) {
            vkDestroyDescriptorUpdateTemplate(gpuDevice->vkDevice, gpuDescriptorSetLayout->vkDescriptorUpdateTemplate, nullptr);
        } else {
            vkDestroyDescriptorUpdateTemplateKHR(gpuDevice->vkDevice, gpuDescriptorSetLayout->vkDescriptorUpdateTemplate, nullptr);
        }
        gpuDescriptorSetLayout->vkDescriptorUpdateTemplate = VK_NULL_HANDLE;
    }

    if (gpuDescriptorSetLayout->vkDescriptorSetLayout != VK_NULL_HANDLE) {
        vkDestroyDescriptorSetLayout(gpuDevice->vkDevice, gpuDescriptorSetLayout->vkDescriptorSetLayout, nullptr);
        gpuDescriptorSetLayout->vkDescriptorSetLayout = VK_NULL_HANDLE;
    }
}

void cmdFuncCCVKDestroyPipelineLayout(CCVKGPUDevice *gpuDevice, CCVKGPUPipelineLayout *gpuPipelineLayout) {
    if (gpuPipelineLayout->vkPipelineLayout != VK_NULL_HANDLE) {
        vkDestroyPipelineLayout(gpuDevice->vkDevice, gpuPipelineLayout->vkPipelineLayout, nullptr);
        gpuPipelineLayout->vkPipelineLayout = VK_NULL_HANDLE;
    }
}

void cmdFuncCCVKDestroyPipelineState(CCVKGPUDevice *gpuDevice, CCVKGPUPipelineState *gpuPipelineState) {
    if (gpuPipelineState->vkPipeline != VK_NULL_HANDLE) {
        vkDestroyPipeline(gpuDevice->vkDevice, gpuPipelineState->vkPipeline, nullptr);
        gpuPipelineState->vkPipeline = VK_NULL_HANDLE;
    }
}

void cmdFuncCCVKDestroyAccelerationStructure(CCVKGPUDevice *gpuDevice, CCVKGPUAccelerationStructure *gpuAccelerationStructure) {
    
}

void cmdFuncCCVKImageMemoryBarrier(const CCVKGPUCommandBuffer *gpuCommandBuffer, const ThsvsImageBarrier &imageBarrier) {
    VkPipelineStageFlags srcStageMask = VK_PIPELINE_STAGE_TOP_OF_PIPE_BIT;
    VkPipelineStageFlags dstStageMask = VK_PIPELINE_STAGE_BOTTOM_OF_PIPE_BIT;
    VkPipelineStageFlags tempSrcStageMask = 0;
    VkPipelineStageFlags tempDstStageMask = 0;
    VkImageMemoryBarrier vkBarrier;
    thsvsGetVulkanImageMemoryBarrier(imageBarrier, &tempSrcStageMask, &tempDstStageMask, &vkBarrier);
    srcStageMask |= tempSrcStageMask;
    dstStageMask |= tempDstStageMask;
    vkCmdPipelineBarrier(gpuCommandBuffer->vkCommandBuffer, srcStageMask, dstStageMask, 0, 0, nullptr, 0, nullptr, 1, &vkBarrier);
}

const CCVKGPUGeneralBarrier *CCVKGPURenderPass::getBarrier(size_t index, CCVKGPUDevice *gpuDevice) const {
    if (index < colorAttachments.size()) {
        return colorAttachments[index].barrier ? static_cast<CCVKGeneralBarrier *>(colorAttachments[index].barrier)->gpuBarrier() : &gpuDevice->defaultColorBarrier;
    }
    return depthStencilAttachment.barrier ? static_cast<CCVKGeneralBarrier *>(depthStencilAttachment.barrier)->gpuBarrier() : &gpuDevice->defaultDepthStencilBarrier;
}

bool CCVKGPURenderPass::hasShadingAttachment(uint32_t subPassId) const {
    CC_ASSERT(subPassId < subpasses.size());
    return subpasses[subPassId].shadingRate != INVALID_BINDING;
}

void CCVKGPUBarrierManager::update(CCVKGPUTransportHub *transportHub) {
    if (_buffersToBeChecked.empty() && _texturesToBeChecked.empty()) return;

    static ccstd::vector<ThsvsAccessType> prevAccesses;
    static ccstd::vector<ThsvsAccessType> nextAccesses;
    static ccstd::vector<VkImageMemoryBarrier> vkImageBarriers;
    VkPipelineStageFlags srcStageMask = VK_PIPELINE_STAGE_TOP_OF_PIPE_BIT;
    VkPipelineStageFlags dstStageMask = VK_PIPELINE_STAGE_BOTTOM_OF_PIPE_BIT;
    vkImageBarriers.clear();
    prevAccesses.clear();
    nextAccesses.clear();

    for (CCVKGPUBuffer *gpuBuffer : _buffersToBeChecked) {
        ccstd::vector<ThsvsAccessType> &render = gpuBuffer->renderAccessTypes;
        if (gpuBuffer->transferAccess == THSVS_ACCESS_NONE) continue;
        if (std::find(prevAccesses.begin(), prevAccesses.end(), gpuBuffer->transferAccess) == prevAccesses.end()) {
            prevAccesses.push_back(gpuBuffer->transferAccess);
        }
        nextAccesses.insert(nextAccesses.end(), render.begin(), render.end());
        gpuBuffer->transferAccess = THSVS_ACCESS_NONE;
    }

    VkMemoryBarrier vkBarrier;
    VkMemoryBarrier *pVkBarrier = nullptr;
    if (!prevAccesses.empty()) {
        ThsvsGlobalBarrier globalBarrier{};
        globalBarrier.prevAccessCount = utils::toUint(prevAccesses.size());
        globalBarrier.pPrevAccesses = prevAccesses.data();
        globalBarrier.nextAccessCount = utils::toUint(nextAccesses.size());
        globalBarrier.pNextAccesses = nextAccesses.data();
        VkPipelineStageFlags tempSrcStageMask = 0;
        VkPipelineStageFlags tempDstStageMask = 0;
        thsvsGetVulkanMemoryBarrier(globalBarrier, &tempSrcStageMask, &tempDstStageMask, &vkBarrier);
        srcStageMask |= tempSrcStageMask;
        dstStageMask |= tempDstStageMask;
        pVkBarrier = &vkBarrier;
    }

    ThsvsImageBarrier imageBarrier{};
    imageBarrier.discardContents = false;
    imageBarrier.prevLayout = THSVS_IMAGE_LAYOUT_OPTIMAL;
    imageBarrier.nextLayout = THSVS_IMAGE_LAYOUT_OPTIMAL;
    imageBarrier.srcQueueFamilyIndex = VK_QUEUE_FAMILY_IGNORED;
    imageBarrier.dstQueueFamilyIndex = VK_QUEUE_FAMILY_IGNORED;
    imageBarrier.subresourceRange.levelCount = VK_REMAINING_MIP_LEVELS;
    imageBarrier.subresourceRange.layerCount = VK_REMAINING_ARRAY_LAYERS;
    imageBarrier.prevAccessCount = 1;

    for (CCVKGPUTexture *gpuTexture : _texturesToBeChecked) {
        ccstd::vector<ThsvsAccessType> &render = gpuTexture->renderAccessTypes;
        if (gpuTexture->transferAccess == THSVS_ACCESS_NONE || render.empty()) continue;
        ccstd::vector<ThsvsAccessType> &current = gpuTexture->currentAccessTypes;
        imageBarrier.pPrevAccesses = &gpuTexture->transferAccess;
        imageBarrier.nextAccessCount = utils::toUint(render.size());
        imageBarrier.pNextAccesses = render.data();
        imageBarrier.image = gpuTexture->vkImage;
        imageBarrier.subresourceRange.aspectMask = gpuTexture->aspectMask;

        VkPipelineStageFlags tempSrcStageMask = 0;
        VkPipelineStageFlags tempDstStageMask = 0;
        vkImageBarriers.emplace_back();
        thsvsGetVulkanImageMemoryBarrier(imageBarrier, &tempSrcStageMask, &tempDstStageMask, &(vkImageBarriers.back()));
        srcStageMask |= tempSrcStageMask;
        dstStageMask |= tempDstStageMask;

        // don't override any other access changes since this barrier always happens first
        if (current.size() == 1 && current[0] == gpuTexture->transferAccess) {
            current = render;
        }
        gpuTexture->transferAccess = THSVS_ACCESS_NONE;
    }

    if (pVkBarrier || !vkImageBarriers.empty()) {
        transportHub->checkIn([&](CCVKGPUCommandBuffer *gpuCommandBuffer) {
            vkCmdPipelineBarrier(gpuCommandBuffer->vkCommandBuffer, srcStageMask, dstStageMask, 0,
                                 pVkBarrier ? 1 : 0, pVkBarrier, 0, nullptr, utils::toUint(vkImageBarriers.size()), vkImageBarriers.data());
        });
    }

    _buffersToBeChecked.clear();
    _texturesToBeChecked.clear();
}

void CCVKGPUBufferHub::flush(CCVKGPUTransportHub *transportHub) {
    auto &buffers = _buffersToBeUpdated[_device->curBackBufferIndex];
    if (buffers.empty()) return;

    bool needTransferCmds = false;
    for (auto &buffer : buffers) {
        if (buffer.second.canMemcpy) {
            uint8_t *src = buffer.first->mappedData + buffer.second.srcIndex * buffer.first->instanceSize;
            uint8_t *dst = buffer.first->mappedData + _device->curBackBufferIndex * buffer.first->instanceSize;
            memcpy(dst, src, buffer.second.size);
        } else {
            needTransferCmds = true;
        }
    }
    if (needTransferCmds) {
        transportHub->checkIn([&](const CCVKGPUCommandBuffer *gpuCommandBuffer) {
            VkBufferCopy region;
            for (auto &buffer : buffers) {
                if (buffer.second.canMemcpy) continue;
                region.srcOffset = buffer.first->getStartOffset(buffer.second.srcIndex);
                region.dstOffset = buffer.first->getStartOffset(_device->curBackBufferIndex);
                region.size = buffer.second.size;
                vkCmdCopyBuffer(gpuCommandBuffer->vkCommandBuffer, buffer.first->vkBuffer, buffer.first->vkBuffer, 1, &region);
            }
        });
    }

    buffers.clear();
}

} // namespace gfx
} // namespace cc
