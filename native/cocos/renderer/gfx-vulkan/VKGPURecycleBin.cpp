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

#include "VKDevice.h"
#include "VKGPUObjects.h"

namespace cc {
namespace gfx {
void CCVKGPURecycleBin::collect(const cc::gfx::CCVKGPUTexture *texture) {
    auto collectHandleFn = [this](VkImage image, VmaAllocation allocation) {
        Resource &res = emplaceBack();
        res.type = RecycledType::TEXTURE;
        res.image.vkImage = image;
        res.image.vmaAllocation = allocation;
    };
    collectHandleFn(texture->vkImage, texture->vmaAllocation);

    if (texture->swapchain != nullptr) {
        for (uint32_t i = 0; i < texture->swapchainVkImages.size() && i < texture->swapchainVmaAllocations.size(); ++i) {
            collectHandleFn(texture->swapchainVkImages[i], texture->swapchainVmaAllocations[i]);
        }
    }
}

void CCVKGPURecycleBin::collect(const cc::gfx::CCVKGPUTextureView *textureView) {
    auto collectHandleFn = [this](VkImageView view) {
        Resource &res = emplaceBack();
        res.type = RecycledType::TEXTURE_VIEW;
        res.vkImageView = view;
    };
    collectHandleFn(textureView->vkImageView);
    for (const auto &swapChainView : textureView->swapchainVkImageViews) {
        collectHandleFn(swapChainView);
    }
}

void CCVKGPURecycleBin::collect(const CCVKGPUFramebuffer *frameBuffer) {
    auto collectHandleFn = [this](VkFramebuffer fbo) {
        Resource &res = emplaceBack();
        res.type = RecycledType::FRAMEBUFFER;
        res.vkFramebuffer = fbo;
    };
    collectHandleFn(frameBuffer->vkFramebuffer);
    for (const auto &fbo : frameBuffer->vkFrameBuffers) {
        collectHandleFn(fbo);
    }
}

void CCVKGPURecycleBin::collect(const CCVKGPUDescriptorSet *set) {
    for (const auto &instance : set->instances) {
        collect(set->layoutID, instance.vkDescriptorSet);
    }
}

void CCVKGPURecycleBin::collect(uint32_t layoutId, VkDescriptorSet set) {
    Resource &res = emplaceBack();
    res.type = RecycledType::DESCRIPTOR_SET;
    res.set.layoutId = layoutId;
    res.set.vkSet = set;
}

void CCVKGPURecycleBin::collect(const CCVKGPUBuffer *buffer) {
    Resource &res = emplaceBack();
    res.type = RecycledType::BUFFER;
    res.buffer.vkBuffer = buffer->vkBuffer;
    res.buffer.vmaAllocation = buffer->vmaAllocation;
}

void CCVKGPURecycleBin::clear() {
    for (uint32_t i = 0U; i < _count; ++i) {
        Resource &res = _resources[i];
        switch (res.type) {
            case RecycledType::BUFFER:
                if (res.buffer.vkBuffer != VK_NULL_HANDLE && res.buffer.vmaAllocation != VK_NULL_HANDLE) {
                    vmaDestroyBuffer(_device->memoryAllocator, res.buffer.vkBuffer, res.buffer.vmaAllocation);
                    res.buffer.vkBuffer = VK_NULL_HANDLE;
                    res.buffer.vmaAllocation = VK_NULL_HANDLE;
                }
                break;
            case RecycledType::TEXTURE:
                if (res.image.vkImage != VK_NULL_HANDLE && res.image.vmaAllocation != VK_NULL_HANDLE) {
                    vmaDestroyImage(_device->memoryAllocator, res.image.vkImage, res.image.vmaAllocation);
                    res.image.vkImage = VK_NULL_HANDLE;
                    res.image.vmaAllocation = VK_NULL_HANDLE;
                }
                break;
            case RecycledType::TEXTURE_VIEW:
                if (res.vkImageView != VK_NULL_HANDLE) {
                    vkDestroyImageView(_device->vkDevice, res.vkImageView, nullptr);
                    res.vkImageView = VK_NULL_HANDLE;
                }
                break;
            case RecycledType::FRAMEBUFFER:
                if (res.vkFramebuffer != VK_NULL_HANDLE) {
                    vkDestroyFramebuffer(_device->vkDevice, res.vkFramebuffer, nullptr);
                    res.vkFramebuffer = VK_NULL_HANDLE;
                }
                break;
            case RecycledType::QUERY_POOL:
                if (res.vkQueryPool != VK_NULL_HANDLE) {
                    vkDestroyQueryPool(_device->vkDevice, res.vkQueryPool, nullptr);
                }
                break;
            case RecycledType::RENDER_PASS:
                if (res.vkRenderPass != VK_NULL_HANDLE) {
                    vkDestroyRenderPass(_device->vkDevice, res.vkRenderPass, nullptr);
                }
                break;
            case RecycledType::SAMPLER:
                if (res.vkSampler != VK_NULL_HANDLE) {
                    vkDestroySampler(_device->vkDevice, res.vkSampler, nullptr);
                }
                break;
            case RecycledType::PIPELINE_STATE:
                if (res.vkPipeline != VK_NULL_HANDLE) {
                    vkDestroyPipeline(_device->vkDevice, res.vkPipeline, nullptr);
                }
                break;
            case RecycledType::DESCRIPTOR_SET:
                if (res.set.vkSet != VK_NULL_HANDLE) {
                    CCVKDevice::getInstance()->gpuDevice()->getDescriptorSetPool(res.set.layoutId)->yield(res.set.vkSet);
                }
                break;
            case RecycledType::ACCELERATION_STRUCTURE:
                if (res.vkAccelerationStructure != VK_NULL_HANDLE) {
                    vkDestroyAccelerationStructureKHR(_device->vkDevice, res.vkAccelerationStructure, nullptr);
                }
                break;
            default: break;
        }
        res.type = RecycledType::UNKNOWN;
    }
    _count = 0;
}

} // namespace gfx
} // namespace cc
