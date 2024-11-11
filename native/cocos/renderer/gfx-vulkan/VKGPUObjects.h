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

#include "VKStd.h"
#include "VKUtils.h"
#include "base/Log.h"
#include "base/std/container/unordered_set.h"
#include "core/memop/CachedArray.h"
#include "gfx-base/GFXDeviceObject.h"
#include "vulkan/vulkan_core.h"

#define TBB_USE_EXCEPTIONS 0 // no-rtti for now
#include "tbb/concurrent_unordered_map.h"

namespace cc {
namespace gfx {

class CCVKGPUContext final {
public:
    bool initialize();
    void destroy();

    VkInstance vkInstance = VK_NULL_HANDLE;
    VkDebugUtilsMessengerEXT vkDebugUtilsMessenger = VK_NULL_HANDLE;
    VkDebugReportCallbackEXT vkDebugReport = VK_NULL_HANDLE;

    VkPhysicalDevice physicalDevice = VK_NULL_HANDLE;
    VkPhysicalDeviceFeatures physicalDeviceFeatures{};
    VkPhysicalDeviceFeatures2 physicalDeviceFeatures2{VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_FEATURES_2};
    VkPhysicalDeviceVulkan11Features physicalDeviceVulkan11Features{VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_VULKAN_1_1_FEATURES};
    VkPhysicalDeviceVulkan12Features physicalDeviceVulkan12Features{VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_VULKAN_1_2_FEATURES};
    VkPhysicalDeviceFragmentShadingRateFeaturesKHR physicalDeviceFragmentShadingRateFeatures{VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_FRAGMENT_SHADING_RATE_FEATURES_KHR};
    VkPhysicalDeviceDepthStencilResolveProperties physicalDeviceDepthStencilResolveProperties{VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_DEPTH_STENCIL_RESOLVE_PROPERTIES};
    VkPhysicalDeviceRayTracingPipelinePropertiesKHR physicalDeviceRaytracingPipelineProperties{VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_RAY_TRACING_PIPELINE_PROPERTIES_KHR};
    VkPhysicalDeviceAccelerationStructurePropertiesKHR physicalDeviceAccelerationStructureProperties{VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_ACCELERATION_STRUCTURE_PROPERTIES_KHR};
    VkPhysicalDeviceProperties physicalDeviceProperties{};
    VkPhysicalDeviceProperties2 physicalDeviceProperties2{VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_PROPERTIES_2};
    VkPhysicalDeviceMemoryProperties physicalDeviceMemoryProperties{};
    ccstd::vector<VkQueueFamilyProperties> queueFamilyProperties;

    uint32_t majorVersion = 0;
    uint32_t minorVersion = 0;

    bool validationEnabled = false;
    bool debugUtils = false;
    bool debugReport = false;

    ccstd::vector<const char *> layers;
    ccstd::vector<const char *> extensions;

    inline bool checkExtension(const ccstd::string &extension) const {
        return std::any_of(extensions.begin(), extensions.end(), [&extension](auto &ext) {
            return std::strcmp(ext, extension.c_str()) == 0;
        });
    }
};

struct CCVKAccessInfo {
    VkPipelineStageFlags stageMask{0};
    VkAccessFlags accessMask{0};
    VkImageLayout imageLayout{VK_IMAGE_LAYOUT_UNDEFINED};
    bool hasWriteAccess{false};
};

struct CCVKGPUGeneralBarrier {
    VkPipelineStageFlags srcStageMask = 0U;
    VkPipelineStageFlags dstStageMask = 0U;
    VkMemoryBarrier vkBarrier{};

    ccstd::vector<ThsvsAccessType> prevAccesses;
    ccstd::vector<ThsvsAccessType> nextAccesses;

    ThsvsGlobalBarrier barrier{};
};

struct CCVKDeviceObjectDeleter {
    template <typename T>
    void operator()(T *ptr) const;
};

class CCVKGPUDeviceObject : public GFXDeviceObject<CCVKDeviceObjectDeleter> {
public:
    CCVKGPUDeviceObject() = default;
    ~CCVKGPUDeviceObject() = default;

    virtual void shutdown(){};
};

template <typename T>
void CCVKDeviceObjectDeleter::operator()(T *ptr) const {
    auto *object = const_cast<CCVKGPUDeviceObject *>(static_cast<const CCVKGPUDeviceObject *>(ptr));
    object->shutdown();
    delete object;
}

class CCVKGPURenderPass final : public CCVKGPUDeviceObject {
public:
    void shutdown() override;

    ColorAttachmentList colorAttachments;
    DepthStencilAttachment depthStencilAttachment;
    DepthStencilAttachment depthStencilResolveAttachment;
    SubpassInfoList subpasses;
    SubpassDependencyList dependencies;

    VkRenderPass vkRenderPass;

    // helper storage
    ccstd::vector<VkClearValue> clearValues;
    ccstd::vector<VkSampleCountFlagBits> sampleCounts; // per subpass
    ccstd::vector<bool> hasSelfDependency; // per subpass

    const CCVKGPUGeneralBarrier *getBarrier(size_t index, CCVKGPUDevice *gpuDevice) const;
    bool hasShadingAttachment(uint32_t subPassId) const;
};

struct CCVKGPUSwapchain;
struct CCVKGPUFramebuffer;
struct CCVKGPUTexture : public CCVKGPUDeviceObject {
    void shutdown() override;
    void init();

    TextureType type = TextureType::TEX2D;
    Format format = Format::UNKNOWN;
    TextureUsage usage = TextureUsageBit::NONE;
    uint32_t width = 0U;
    uint32_t height = 0U;
    uint32_t depth = 1U;
    uint32_t size = 0U;
    uint32_t arrayLayers = 1U;
    uint32_t mipLevels = 1U;
    SampleCount samples = SampleCount::X1;
    TextureFlags flags = TextureFlagBit::NONE;
    VkImageAspectFlags aspectMask = VK_IMAGE_ASPECT_COLOR_BIT;

    /*
     * allocate and bind memory by Texture.
     * If any of the following conditions are met, then the statement is false
     * 1. Texture is a swapchain image.
     * 2. Texture has flag LAZILY_ALLOCATED.
     * 3. Memory bound manually bound.
     * 4. Sparse Image.
     */
    bool memoryAllocated = true;

    VkImage vkImage = VK_NULL_HANDLE;
    VmaAllocation vmaAllocation = VK_NULL_HANDLE;

    CCVKGPUSwapchain *swapchain = nullptr;
    ccstd::vector<VkImage> swapchainVkImages;
    ccstd::vector<VmaAllocation> swapchainVmaAllocations;

    ccstd::vector<ThsvsAccessType> currentAccessTypes;

    // for barrier manager
    ccstd::vector<ThsvsAccessType> renderAccessTypes; // gathered from descriptor sets
    ThsvsAccessType transferAccess = THSVS_ACCESS_NONE;

    VkImage externalVKImage = VK_NULL_HANDLE;
};

struct CCVKGPUTextureView : public CCVKGPUDeviceObject {
    void shutdown() override;
    void init();

    IntrusivePtr<CCVKGPUTexture> gpuTexture;
    TextureType type = TextureType::TEX2D;
    Format format = Format::UNKNOWN;
    uint32_t baseLevel = 0U;
    uint32_t levelCount = 1U;
    uint32_t baseLayer = 0U;
    uint32_t layerCount = 1U;
    uint32_t basePlane = 0U;
    uint32_t planeCount = 1U;

    ccstd::vector<VkImageView> swapchainVkImageViews;

    // descriptor infos
    VkImageView vkImageView = VK_NULL_HANDLE;
};

struct CCVKGPUSampler : public CCVKGPUDeviceObject {
    void shutdown() override;
    void init();

    Filter minFilter = Filter::LINEAR;
    Filter magFilter = Filter::LINEAR;
    Filter mipFilter = Filter::NONE;
    Address addressU = Address::WRAP;
    Address addressV = Address::WRAP;
    Address addressW = Address::WRAP;
    uint32_t maxAnisotropy = 0U;
    ComparisonFunc cmpFunc = ComparisonFunc::NEVER;

    // descriptor infos
    VkSampler vkSampler;
};

struct CCVKGPUBuffer : public CCVKGPUDeviceObject {
    void shutdown() override;
    void init();

    BufferUsage usage = BufferUsage::NONE;
    MemoryUsage memUsage = MemoryUsage::NONE;
    uint32_t stride = 0U;
    uint32_t count = 0U;
    void *buffer = nullptr;

    bool isDrawIndirectByIndex = false;
    ccstd::vector<VkDrawIndirectCommand> indirectCmds;
    ccstd::vector<VkDrawIndexedIndirectCommand> indexedIndirectCmds;

    uint8_t *mappedData = nullptr;
    VmaAllocation vmaAllocation = VK_NULL_HANDLE;

    // descriptor infos
    VkBuffer vkBuffer = VK_NULL_HANDLE;
    VkDeviceSize size = 0U;

    VkDeviceSize instanceSize = 0U; // per-back-buffer instance
    ccstd::vector<ThsvsAccessType> currentAccessTypes;

    // for barrier manager
    ccstd::vector<ThsvsAccessType> renderAccessTypes; // gathered from descriptor sets
    ThsvsAccessType transferAccess = THSVS_ACCESS_NONE;

    VkDeviceSize getStartOffset(uint32_t curBackBufferIndex) const {
        return instanceSize * curBackBufferIndex;
    }
};

struct CCVKGPUBufferView : public CCVKGPUDeviceObject {
    void shutdown() override;
    ConstPtr<CCVKGPUBuffer> gpuBuffer;
    uint32_t offset = 0U;
    uint32_t range = 0U;

    uint8_t *mappedData() const {
        return gpuBuffer->mappedData + offset;
    }

    VkDeviceSize getStartOffset(uint32_t curBackBufferIndex) const {
        return gpuBuffer->getStartOffset(curBackBufferIndex) + offset;
    }
};

struct CCVKGPUFramebuffer : public CCVKGPUDeviceObject {
    void shutdown() override;

    ConstPtr<CCVKGPURenderPass> gpuRenderPass;
    ccstd::vector<ConstPtr<CCVKGPUTextureView>> gpuColorViews;
    ConstPtr<CCVKGPUTextureView> gpuDepthStencilView;
    ConstPtr<CCVKGPUTextureView> gpuDepthStencilResolveView;
    VkFramebuffer vkFramebuffer = VK_NULL_HANDLE;
    std::vector<VkFramebuffer> vkFrameBuffers;
    CCVKGPUSwapchain *swapchain = nullptr;
    bool isOffscreen = true;
    uint32_t width = 0U;
    uint32_t height = 0U;
};

struct CCVKGPUSwapchain : public CCVKGPUDeviceObject {
    VkSurfaceKHR vkSurface = VK_NULL_HANDLE;
    VkSwapchainCreateInfoKHR createInfo{VK_STRUCTURE_TYPE_SWAPCHAIN_CREATE_INFO_KHR};

    uint32_t curImageIndex = 0U;
    VkSwapchainKHR vkSwapchain = VK_NULL_HANDLE;
    ccstd::vector<VkBool32> queueFamilyPresentables;
    VkResult lastPresentResult = VK_NOT_READY;

    // external references
    ccstd::vector<VkImage> swapchainImages;
};

struct CCVKGPUCommandBuffer : public CCVKGPUDeviceObject {
    VkCommandBuffer vkCommandBuffer = VK_NULL_HANDLE;
    VkCommandBufferLevel level = VK_COMMAND_BUFFER_LEVEL_PRIMARY;
    uint32_t queueFamilyIndex = 0U;
    bool began = false;
    mutable ccstd::unordered_set<VkBuffer> recordedBuffers;
};

struct CCVKGPUQueue {
    QueueType type = QueueType::GRAPHICS;
    VkQueue vkQueue = VK_NULL_HANDLE;
    uint32_t queueFamilyIndex = 0U;
    ccstd::vector<uint32_t> possibleQueueFamilyIndices;
    ccstd::vector<VkSemaphore> lastSignaledSemaphores;
    ccstd::vector<VkPipelineStageFlags> submitStageMasks;
    ccstd::vector<VkCommandBuffer> commandBuffers;
};

struct CCVKGPUQueryPool : public CCVKGPUDeviceObject {
    void shutdown() override;

    QueryType type{QueryType::OCCLUSION};
    uint32_t maxQueryObjects{0};
    bool forceWait{true};
    VkQueryPool vkPool{VK_NULL_HANDLE};
};

struct CCVKGPUShaderStage {
    CCVKGPUShaderStage(ShaderStageFlagBit t, ccstd::string s)
    : type(t),
      source(std::move(s)) {
    }
    ShaderStageFlagBit type = ShaderStageFlagBit::NONE;
    ccstd::string source;
    VkShaderModule vkShader = VK_NULL_HANDLE;
};

/*
 * Use for ray tracing shaders
 */
struct CCVKGPUShaderGroup {
    RayTracingShaderGroupType type{RayTracingShaderGroupType::GENERAL};
    uint32_t generalShader{VK_SHADER_UNUSED_KHR};
    uint32_t closestHitShader{VK_SHADER_UNUSED_KHR};
    uint32_t anyHitShader{VK_SHADER_UNUSED_KHR};
    uint32_t intersectionShader{VK_SHADER_UNUSED_KHR};
};

struct CCVKGPUShader : public CCVKGPUDeviceObject {
    void shutdown() override;

    ccstd::string name;
    AttributeList attributes;
    ccstd::vector<CCVKGPUShaderStage> gpuStages;
    ccstd::vector<CCVKGPUShaderGroup> gpuGroups;
    bool initialized = false;
};

struct CCVKGPUInputAssembler : public CCVKGPUDeviceObject {
    void shutdown() override;
    void update(const CCVKGPUBufferView *oldBuffer, const CCVKGPUBufferView *newBuffer);

    AttributeList attributes;
    ccstd::vector<ConstPtr<CCVKGPUBufferView>> gpuVertexBuffers;
    ConstPtr<CCVKGPUBufferView> gpuIndexBuffer;
    ConstPtr<CCVKGPUBufferView> gpuIndirectBuffer;
    ccstd::vector<VkBuffer> vertexBuffers;
    ccstd::vector<VkDeviceSize> vertexBufferOffsets;
};

struct CCVKGPUAccelerationStructure : public CCVKGPUDeviceObject {
    void shutdown() override;

    ASBuildFlags buildFlags = ASBuildFlagBits::PREFER_FAST_BUILD | ASBuildFlagBits::ALLOW_UPDATE;
    VkAccelerationStructureBuildGeometryInfoKHR buildGeometryInfo{VK_STRUCTURE_TYPE_ACCELERATION_STRUCTURE_BUILD_GEOMETRY_INFO_KHR};
    VkAccelerationStructureBuildSizesInfoKHR buildSizesInfo{VK_STRUCTURE_TYPE_ACCELERATION_STRUCTURE_BUILD_SIZES_INFO_KHR};
    ccstd::vector<VkAccelerationStructureBuildRangeInfoKHR> rangeInfos{};

    std::variant<ccstd::vector<ASTriangleMesh>, ccstd::vector<ASAABB>, ccstd::vector<ASInstance>> geomtryInfos;
    ccstd::vector<VkAccelerationStructureGeometryKHR> geometries;
    
    VkQueryPool vkCompactedSizeQueryPool = VK_NULL_HANDLE;
    
    IntrusivePtr<CCVKGPUBuffer> scratchBuffer;
    IntrusivePtr<CCVKGPUBuffer> backingBuffer;
    IntrusivePtr<CCVKGPUBuffer> instancesBuffer;
    IntrusivePtr<CCVKGPUBuffer> aabbsBuffer;

    VkAccelerationStructureKHR vkAccelerationStructure = VK_NULL_HANDLE;
};


union CCVKDescriptorInfo {
    VkDescriptorImageInfo image;
    VkDescriptorBufferInfo buffer;
    VkBufferView texelBufferView;
    VkAccelerationStructureKHR accelerationStructure;
};
struct CCVKGPUDescriptor {
    DescriptorType type = DescriptorType::UNKNOWN;
    ccstd::vector<ThsvsAccessType> accessTypes;
    ConstPtr<CCVKGPUBufferView> gpuBufferView;
    ConstPtr<CCVKGPUTextureView> gpuTextureView;
    ConstPtr<CCVKGPUSampler> gpuSampler;
    ConstPtr<CCVKGPUAccelerationStructure> gpuAccelerrationStructure;
};

struct CCVKGPUDescriptorSetLayout;
struct CCVKGPUDescriptorSet : public CCVKGPUDeviceObject {
    void shutdown() override;

    void update(const CCVKGPUBufferView *oldView, const CCVKGPUBufferView *newView);
    void update(const CCVKGPUTextureView *oldView, const CCVKGPUTextureView *newView);

    ccstd::vector<CCVKGPUDescriptor> gpuDescriptors;

    // references
    ConstPtr<CCVKGPUDescriptorSetLayout> gpuLayout;

    struct Instance {
        VkDescriptorSet vkDescriptorSet = VK_NULL_HANDLE;
        ccstd::vector<CCVKDescriptorInfo> descriptorInfos;
        ccstd::vector<VkWriteDescriptorSet> descriptorUpdateEntries;
        VkWriteDescriptorSetAccelerationStructureKHR writeDesAS;
    };
    ccstd::vector<Instance> instances; // per swapchain image

    uint32_t layoutID = 0U;
};

struct CCVKGPUPipelineLayout : public CCVKGPUDeviceObject {
    void shutdown() override;

    ccstd::vector<ConstPtr<CCVKGPUDescriptorSetLayout>> setLayouts;

    VkPipelineLayout vkPipelineLayout = VK_NULL_HANDLE;

    // helper storage
    ccstd::vector<uint32_t> dynamicOffsetOffsets;
    uint32_t dynamicOffsetCount;
};

struct CCVKGPUPipelineState : public CCVKGPUDeviceObject {
    void shutdown() override;

    PipelineBindPoint bindPoint = PipelineBindPoint::GRAPHICS;
    PrimitiveMode primitive = PrimitiveMode::TRIANGLE_LIST;
    ConstPtr<CCVKGPUShader> gpuShader;
    ConstPtr<CCVKGPUPipelineLayout> gpuPipelineLayout;
    InputState inputState;
    RasterizerState rs;
    DepthStencilState dss;
    BlendState bs;
    DynamicStateList dynamicStates;
    ConstPtr<CCVKGPURenderPass> gpuRenderPass;
    uint32_t subpass = 0U;
    //ray tracing only 
    uint32_t maxRecursionDepth = 1U;
    
    VkPipeline vkPipeline = VK_NULL_HANDLE;
};

struct CCVKGPUBufferBarrier {
    VkPipelineStageFlags srcStageMask = 0U;
    VkPipelineStageFlags dstStageMask = 0U;
    VkBufferMemoryBarrier vkBarrier{};

    ccstd::vector<ThsvsAccessType> prevAccesses;
    ccstd::vector<ThsvsAccessType> nextAccesses;

    ThsvsBufferBarrier barrier{};
};

struct CCVKGPUTextureBarrier {
    VkPipelineStageFlags srcStageMask = 0U;
    VkPipelineStageFlags dstStageMask = 0U;
    VkImageMemoryBarrier vkBarrier{};

    ccstd::vector<ThsvsAccessType> prevAccesses;
    ccstd::vector<ThsvsAccessType> nextAccesses;

    ThsvsImageBarrier barrier{};
};

class CCVKGPUCommandBufferPool;
class CCVKGPUDescriptorSetPool;
class CCVKGPUDevice final {
public:
    VkDevice vkDevice{VK_NULL_HANDLE};
    ccstd::vector<VkLayerProperties> layers;
    ccstd::vector<VkExtensionProperties> extensions;
    VmaAllocator memoryAllocator{VK_NULL_HANDLE};
    uint32_t minorVersion{0U};

    VkFormat depthFormat{VK_FORMAT_UNDEFINED};
    VkFormat depthStencilFormat{VK_FORMAT_UNDEFINED};

    uint32_t curBackBufferIndex{0U};
    uint32_t backBufferCount{3U};

    bool useDescriptorUpdateTemplate{false};
    bool useMultiDrawIndirect{false};

    PFN_vkCreateRenderPass2 createRenderPass2{nullptr};

    // for default backup usages
    IntrusivePtr<CCVKGPUSampler> defaultSampler;
    IntrusivePtr<CCVKGPUTexture> defaultTexture;
    IntrusivePtr<CCVKGPUTextureView> defaultTextureView;
    IntrusivePtr<CCVKGPUBuffer> defaultBuffer;

    CCVKGPUGeneralBarrier defaultColorBarrier;
    CCVKGPUGeneralBarrier defaultDepthStencilBarrier;

    ccstd::unordered_set<CCVKGPUSwapchain *> swapchains;

    CCVKGPUCommandBufferPool *getCommandBufferPool();
    CCVKGPUDescriptorSetPool *getDescriptorSetPool(uint32_t layoutID);

private:
    friend class CCVKDevice;

    // cannot use thread_local here because we need explicit control over their destruction
    using CommandBufferPools = tbb::concurrent_unordered_map<size_t, CCVKGPUCommandBufferPool *, std::hash<size_t>>;
    CommandBufferPools _commandBufferPools;

    ccstd::unordered_map<uint32_t, std::unique_ptr<CCVKGPUDescriptorSetPool>> _descriptorSetPools;
};

/**
 * A simple pool for reusing fences.
 */
class CCVKGPUFencePool final {
public:
    explicit CCVKGPUFencePool(CCVKGPUDevice *device)
    : _device(device) {
    }

    ~CCVKGPUFencePool() {
        for (VkFence fence : _fences) {
            vkDestroyFence(_device->vkDevice, fence, nullptr);
        }
        _fences.clear();
        _count = 0;
    }

    VkFence alloc() {
        if (_count < _fences.size()) {
            return _fences[_count++];
        }

        VkFence fence = VK_NULL_HANDLE;
        VkFenceCreateInfo createInfo{VK_STRUCTURE_TYPE_FENCE_CREATE_INFO};
        VK_CHECK(vkCreateFence(_device->vkDevice, &createInfo, nullptr, &fence));
        _fences.push_back(fence);
        _count++;

        return fence;
    }

    void reset() {
        if (_count) {
            VK_CHECK(vkResetFences(_device->vkDevice, _count, _fences.data()));
            _count = 0;
        }
    }

    VkFence *data() {
        return _fences.data();
    }

    uint32_t size() const {
        return _count;
    }

private:
    CCVKGPUDevice *_device = nullptr;
    uint32_t _count = 0U;
    ccstd::vector<VkFence> _fences;
};

/**
 * A simple pool for reusing semaphores.
 */
class CCVKGPUSemaphorePool final {
public:
    explicit CCVKGPUSemaphorePool(CCVKGPUDevice *device)
    : _device(device) {
    }

    ~CCVKGPUSemaphorePool() {
        for (VkSemaphore semaphore : _semaphores) {
            vkDestroySemaphore(_device->vkDevice, semaphore, nullptr);
        }
        _semaphores.clear();
        _count = 0;
    }

    VkSemaphore alloc() {
        if (_count < _semaphores.size()) {
            return _semaphores[_count++];
        }

        VkSemaphore semaphore = VK_NULL_HANDLE;
        VkSemaphoreCreateInfo createInfo{VK_STRUCTURE_TYPE_SEMAPHORE_CREATE_INFO};
        VK_CHECK(vkCreateSemaphore(_device->vkDevice, &createInfo, nullptr, &semaphore));
        _semaphores.push_back(semaphore);
        _count++;

        return semaphore;
    }

    void reset() {
        _count = 0;
    }

    uint32_t size() const {
        return _count;
    }

private:
    CCVKGPUDevice *_device;
    uint32_t _count = 0U;
    ccstd::vector<VkSemaphore> _semaphores;
};

/**
 * Unlimited descriptor set pool, based on multiple fix-sized VkDescriptorPools.
 */
class CCVKGPUDescriptorSetPool final {
public:
    ~CCVKGPUDescriptorSetPool() {
        for (auto &pool : _pools) {
            vkDestroyDescriptorPool(_device->vkDevice, pool, nullptr);
        }
    }

    void link(CCVKGPUDevice *device, uint32_t maxSetsPerPool, const ccstd::vector<VkDescriptorSetLayoutBinding> &bindings, VkDescriptorSetLayout setLayout) {
        _device = device;
        _maxSetsPerPool = maxSetsPerPool;
        _setLayouts.insert(_setLayouts.cbegin(), _maxSetsPerPool, setLayout);

        ccstd::unordered_map<VkDescriptorType, uint32_t> typeMap;
        for (const auto &vkBinding : bindings) {
            typeMap[vkBinding.descriptorType] += maxSetsPerPool * vkBinding.descriptorCount;
        }

        // minimal reserve for empty set layouts
        if (bindings.empty()) {
            typeMap[VK_DESCRIPTOR_TYPE_UNIFORM_BUFFER] = 1;
        }

        _poolSizes.clear();
        for (auto &it : typeMap) {
            _poolSizes.push_back({it.first, it.second});
        }
    }

    VkDescriptorSet request() {
        if (_freeList.empty()) {
            requestPool();
        }
        return pop();
    }

    void requestPool() {
        VkDescriptorPoolCreateInfo createInfo{VK_STRUCTURE_TYPE_DESCRIPTOR_POOL_CREATE_INFO};
        createInfo.maxSets = _maxSetsPerPool;
        createInfo.poolSizeCount = utils::toUint(_poolSizes.size());
        createInfo.pPoolSizes = _poolSizes.data();

        VkDescriptorPool descriptorPool = VK_NULL_HANDLE;
        VK_CHECK(vkCreateDescriptorPool(_device->vkDevice, &createInfo, nullptr, &descriptorPool));
        _pools.push_back(descriptorPool);

        std::vector<VkDescriptorSet> sets(_maxSetsPerPool, VK_NULL_HANDLE);
        VkDescriptorSetAllocateInfo info{VK_STRUCTURE_TYPE_DESCRIPTOR_SET_ALLOCATE_INFO};
        info.pSetLayouts = _setLayouts.data();
        info.descriptorSetCount = _maxSetsPerPool;
        info.descriptorPool = descriptorPool;
        VK_CHECK(vkAllocateDescriptorSets(_device->vkDevice, &info, sets.data()));

        _freeList.insert(_freeList.end(), sets.begin(), sets.end());
    }

    void yield(VkDescriptorSet set) {
        _freeList.emplace_back(set);
    }

private:
    VkDescriptorSet pop() {
        VkDescriptorSet output = VK_NULL_HANDLE;
        if (!_freeList.empty()) {
            output = _freeList.back();
            _freeList.pop_back();
            return output;
        }
        return VK_NULL_HANDLE;
    }

    CCVKGPUDevice *_device = nullptr;

    ccstd::vector<VkDescriptorPool> _pools;
    ccstd::vector<VkDescriptorSet> _freeList;

    ccstd::vector<VkDescriptorPoolSize> _poolSizes;
    ccstd::vector<VkDescriptorSetLayout> _setLayouts;
    uint32_t _maxSetsPerPool = 0U;
};

struct CCVKGPUDescriptorSetLayout : public CCVKGPUDeviceObject {
    void shutdown() override;

    DescriptorSetLayoutBindingList bindings;
    ccstd::vector<uint32_t> dynamicBindings;

    ccstd::vector<VkDescriptorSetLayoutBinding> vkBindings;
    VkDescriptorSetLayout vkDescriptorSetLayout = VK_NULL_HANDLE;
    VkDescriptorUpdateTemplate vkDescriptorUpdateTemplate = VK_NULL_HANDLE;
    VkDescriptorSet defaultDescriptorSet = VK_NULL_HANDLE;

    ccstd::vector<uint32_t> bindingIndices;
    ccstd::vector<uint32_t> descriptorIndices;
    uint32_t descriptorCount = 0U;

    uint32_t id = 0U;
    uint32_t maxSetsPerPool = 10U;
};

/**
 * Command buffer pool based on VkCommandPools, always try to reuse previous allocations first.
 */
class CCVKGPUCommandBufferPool final {
public:
    explicit CCVKGPUCommandBufferPool(CCVKGPUDevice *device)
    : _device(device) {
    }

    ~CCVKGPUCommandBufferPool() {
        for (auto &it : _pools) {
            CommandBufferPool &pool = it.second;
            if (pool.vkCommandPool != VK_NULL_HANDLE) {
                vkDestroyCommandPool(_device->vkDevice, pool.vkCommandPool, nullptr);
                pool.vkCommandPool = VK_NULL_HANDLE;
            }
            for (auto &item: pool.usedCommandBuffers)item.clear();
            for (auto &item: pool.commandBuffers)item.clear();
        }
        _pools.clear();
    }

    uint32_t getHash(uint32_t queueFamilyIndex) {
        return (queueFamilyIndex << 10) | _device->curBackBufferIndex;
    }
    static uint32_t getBackBufferIndex(uint32_t hash) {
        return hash & ((1 << 10) - 1);
    }

    void request(CCVKGPUCommandBuffer *gpuCommandBuffer) {
        uint32_t hash = getHash(gpuCommandBuffer->queueFamilyIndex);

        if (_device->curBackBufferIndex != _lastBackBufferIndex) {
            reset();
            _lastBackBufferIndex = _device->curBackBufferIndex;
        }

        if (!_pools.count(hash)) {
            VkCommandPoolCreateInfo createInfo{VK_STRUCTURE_TYPE_COMMAND_POOL_CREATE_INFO};
            createInfo.queueFamilyIndex = gpuCommandBuffer->queueFamilyIndex;
            createInfo.flags = VK_COMMAND_POOL_CREATE_TRANSIENT_BIT;
            VK_CHECK(vkCreateCommandPool(_device->vkDevice, &createInfo, nullptr, &_pools[hash].vkCommandPool));
        }
        CommandBufferPool &pool = _pools[hash];

        CachedArray<VkCommandBuffer> &availableList = pool.commandBuffers[gpuCommandBuffer->level];
        if (availableList.size()) {
            gpuCommandBuffer->vkCommandBuffer = availableList.pop();
        } else {
            VkCommandBufferAllocateInfo allocateInfo{VK_STRUCTURE_TYPE_COMMAND_BUFFER_ALLOCATE_INFO};
            allocateInfo.commandPool = pool.vkCommandPool;
            allocateInfo.commandBufferCount = 1;
            allocateInfo.level = gpuCommandBuffer->level;
            VK_CHECK(vkAllocateCommandBuffers(_device->vkDevice, &allocateInfo, &gpuCommandBuffer->vkCommandBuffer));
        }
    }

    void yield(CCVKGPUCommandBuffer *gpuCommandBuffer) {
        if (gpuCommandBuffer->vkCommandBuffer) {
            uint32_t hash = getHash(gpuCommandBuffer->queueFamilyIndex);
            CC_ASSERT(_pools.count(hash)); // Wrong command pool to yield?

            CommandBufferPool &pool = _pools[hash];
            pool.usedCommandBuffers[gpuCommandBuffer->level].push(gpuCommandBuffer->vkCommandBuffer);
            gpuCommandBuffer->vkCommandBuffer = VK_NULL_HANDLE;
        }
    }

    void reset() {
        for (auto &it : _pools) {
            if (getBackBufferIndex(it.first) != _device->curBackBufferIndex) {
                continue;
            }
            CommandBufferPool &pool = it.second;

            bool needsReset = false;
            for (uint32_t i = 0U; i < 2U; ++i) {
                CachedArray<VkCommandBuffer> &usedList = pool.usedCommandBuffers[i];
                if (usedList.size()) {
                    pool.commandBuffers[i].concat(usedList);
                    usedList.clear();
                    needsReset = true;
                }
            }
            if (needsReset) {
                VK_CHECK(vkResetCommandPool(_device->vkDevice, pool.vkCommandPool, 0));
            }
        }
    }

private:
    struct CommandBufferPool {
        VkCommandPool vkCommandPool = VK_NULL_HANDLE;
        CachedArray<VkCommandBuffer> commandBuffers[2];
        CachedArray<VkCommandBuffer> usedCommandBuffers[2];
    };

    CCVKGPUDevice *_device = nullptr;
    uint32_t _lastBackBufferIndex = 0U;

    ccstd::unordered_map<uint32_t, CommandBufferPool> _pools;
};

/**
 * Staging buffer pool, based on multiple fix-sized VkBuffer blocks.
 */
class CCVKGPUStagingBufferPool final {
public:
    static constexpr VkDeviceSize CHUNK_SIZE = 16 * 1024 * 1024; // 16M per block by default

    explicit CCVKGPUStagingBufferPool(CCVKGPUDevice *device)

    : _device(device) {
    }

    ~CCVKGPUStagingBufferPool() {
        _pool.clear();
    }

    IntrusivePtr<CCVKGPUBufferView> alloc(uint32_t size) { return alloc(size, 1U); }

    IntrusivePtr<CCVKGPUBufferView> alloc(uint32_t size, uint32_t alignment) {
        CC_ASSERT_LE(size, CHUNK_SIZE);

        size_t bufferCount = _pool.size();
        Buffer *buffer = nullptr;
        VkDeviceSize offset = 0U;
        for (size_t idx = 0U; idx < bufferCount; idx++) {
            Buffer *cur = &_pool[idx];
            offset = roundUp(cur->curOffset, alignment);
            if (size + offset <= CHUNK_SIZE) {
                buffer = cur;
                break;
            }
        }
        if (!buffer) {
            _pool.resize(bufferCount + 1);
            buffer = &_pool.back();
            buffer->gpuBuffer = new CCVKGPUBuffer();
            buffer->gpuBuffer->size = CHUNK_SIZE;
            buffer->gpuBuffer->usage = BufferUsage::TRANSFER_SRC | BufferUsage::TRANSFER_DST;
            buffer->gpuBuffer->memUsage = MemoryUsage::HOST;
            buffer->gpuBuffer->init();
            offset = 0U;
        }
        auto *bufferView = new CCVKGPUBufferView;
        bufferView->gpuBuffer = buffer->gpuBuffer;
        bufferView->offset = offset;
        buffer->curOffset = offset + size;
        return bufferView;
    }

    void reset() {
        for (Buffer &buffer : _pool) {
            buffer.curOffset = 0U;
        }
    }

private:
    struct Buffer {
        IntrusivePtr<CCVKGPUBuffer> gpuBuffer;
        VkDeviceSize curOffset = 0U;
    };

    CCVKGPUDevice *_device = nullptr;
    ccstd::vector<Buffer> _pool;
};

/**
 * Manages descriptor set update events, across all back buffer instances.
 */
class CCVKGPUDescriptorSetHub final {
public:
    explicit CCVKGPUDescriptorSetHub(CCVKGPUDevice *device)
    : _device(device) {
        _setsToBeUpdated.resize(device->backBufferCount);
        if (device->minorVersion > 0) {
            _updateFn = vkUpdateDescriptorSetWithTemplate;
        } else {
            _updateFn = vkUpdateDescriptorSetWithTemplateKHR;
        }
    }

    void record(const CCVKGPUDescriptorSet *gpuDescriptorSet) {
        update(gpuDescriptorSet);
        for (uint32_t i = 0U; i < _device->backBufferCount; ++i) {
            if (i == _device->curBackBufferIndex) {
                _setsToBeUpdated[i].erase(gpuDescriptorSet);
            } else {
                _setsToBeUpdated[i].insert(gpuDescriptorSet);
            }
        }
    }

    void erase(CCVKGPUDescriptorSet *gpuDescriptorSet) {
        for (uint32_t i = 0U; i < _device->backBufferCount; ++i) {
            if (_setsToBeUpdated[i].count(gpuDescriptorSet)) {
                _setsToBeUpdated[i].erase(gpuDescriptorSet);
            }
        }
    }

    void flush() {
        DescriptorSetList &sets = _setsToBeUpdated[_device->curBackBufferIndex];
        for (const auto *set : sets) {
            update(set);
        }
        sets.clear();
    }

    void updateBackBufferCount(uint32_t backBufferCount) {
        _setsToBeUpdated.resize(backBufferCount);
    }

private:
    void update(const CCVKGPUDescriptorSet *gpuDescriptorSet) {
        const CCVKGPUDescriptorSet::Instance &instance = gpuDescriptorSet->instances[_device->curBackBufferIndex];
        if (gpuDescriptorSet->gpuLayout->vkDescriptorUpdateTemplate) {
            /*
            auto it = std::find_if(instance.descriptorInfos.cbegin(), instance.descriptorInfos.cend(), [](const CCVKDescriptorInfo &info) {
                return info.accelerationStructure != VK_NULL_HANDLE;
            });
            if (it!=instance.descriptorInfos.cend()) {
                CC_LOG_WARNING("wdwdw");
            }*/

            _updateFn(_device->vkDevice, instance.vkDescriptorSet,
                      gpuDescriptorSet->gpuLayout->vkDescriptorUpdateTemplate, instance.descriptorInfos.data());
        } else {
            const ccstd::vector<VkWriteDescriptorSet> &entries = instance.descriptorUpdateEntries;
            vkUpdateDescriptorSets(_device->vkDevice, utils::toUint(entries.size()), entries.data(), 0, nullptr);
        }
    }

    using DescriptorSetList = ccstd::unordered_set<const CCVKGPUDescriptorSet *>;

    CCVKGPUDevice *_device = nullptr;
    ccstd::vector<DescriptorSetList> _setsToBeUpdated;
    PFN_vkUpdateDescriptorSetWithTemplate _updateFn = nullptr;
};

/**
 * Descriptor data maintenance hub, events like buffer/texture resizing,
 * descriptor set binding change, etc. should all request an update operation here.
 */
class CCVKGPUDescriptorHub final {
public:
    explicit CCVKGPUDescriptorHub(CCVKGPUDevice * /*device*/) {
    }

    void connect(CCVKGPUDescriptorSet *set, const CCVKGPUBufferView *buffer, VkDescriptorBufferInfo *descriptor, uint32_t instanceIdx) {
        _gpuBufferViewSet[buffer].sets.insert(set);
        _gpuBufferViewSet[buffer].descriptors.push(descriptor);
        _bufferInstanceIndices[descriptor] = instanceIdx;
    }
    void connect(CCVKGPUDescriptorSet *set, const CCVKGPUTextureView *texture, VkDescriptorImageInfo *descriptor) {
        _gpuTextureViewSet[texture].sets.insert(set);
        _gpuTextureViewSet[texture].descriptors.push(descriptor);
    }
    void connect(CCVKGPUSampler *sampler, VkDescriptorImageInfo *descriptor) {
        _samplers[sampler].push(descriptor);
    }
    void connect(CCVKGPUDescriptorSet *set, const CCVKGPUAccelerationStructure *accel, VkAccelerationStructureKHR *descriptor) {
        _accels[accel].sets.insert(set);
        _accels[accel].descriptors.push(descriptor);
    }

    void update(const CCVKGPUBufferView *buffer, VkDescriptorBufferInfo *descriptor) {
        auto it = _gpuBufferViewSet.find(buffer);
        if (it == _gpuBufferViewSet.end()) return;
        auto &descriptors = it->second.descriptors;
        for (uint32_t i = 0U; i < descriptors.size(); i++) {
            if (descriptors[i] == descriptor) {
                doUpdate(buffer, descriptor);
                break;
            }
        }
    }

    void update(const CCVKGPUTextureView *texture, VkDescriptorImageInfo *descriptor) {
        auto it = _gpuTextureViewSet.find(texture);
        if (it == _gpuTextureViewSet.end()) return;
        auto &descriptors = it->second.descriptors;
        for (uint32_t i = 0U; i < descriptors.size(); i++) {
            if (descriptors[i] == descriptor) {
                doUpdate(texture, descriptor);
                break;
            }
        }
    }

    void update(const CCVKGPUTextureView *texture, VkDescriptorImageInfo *descriptor, AccessFlags flags) {
        auto it = _gpuTextureViewSet.find(texture);
        if (it == _gpuTextureViewSet.end()) return;
        auto &descriptors = it->second.descriptors;
        for (uint32_t i = 0U; i < descriptors.size(); i++) {
            if (descriptors[i] == descriptor) {
                doUpdate(texture, descriptor, flags);
                break;
            }
        }
    }

    void update(const CCVKGPUSampler *sampler, VkDescriptorImageInfo *descriptor) {
        auto it = _samplers.find(sampler);
        if (it == _samplers.end()) return;
        auto &descriptors = it->second;
        for (uint32_t i = 0U; i < descriptors.size(); ++i) {
            if (descriptors[i] == descriptor) {
                doUpdate(sampler, descriptor);
                break;
            }
        }
    }

    void update(const CCVKGPUAccelerationStructure *accel, VkAccelerationStructureKHR *descriptor) {
        /*
        for (const auto &it : _accels) {
            if (it.first->vkAccelerationStructure != accel->vkAccelerationStructure) continue;
            const auto &info = it.second;
            for (uint32_t i = 0U; i < info.descriptors.size(); i++) {
                doUpdate(accel, info.descriptors[i]);
            }
            for (const auto *set : info.sets) {
                _descriptorSetHub->record(set);
            }
        }*/
        auto it = _accels.find(accel);
        if (it == _accels.end()) return;
        doUpdate(accel, descriptor);
    }
    // for resize events
    void update(const CCVKGPUBufferView *oldView, const CCVKGPUBufferView *newView) {
        auto iter = _gpuBufferViewSet.find(oldView);
        if (iter != _gpuBufferViewSet.end()) {
            auto &sets = iter->second.sets;
            for (auto *set : sets) {
                set->update(oldView, newView);
            }
            _gpuBufferViewSet.erase(iter);
        }
    }

    void update(const CCVKGPUTextureView *oldView, const CCVKGPUTextureView *newView) {
        auto iter = _gpuTextureViewSet.find(oldView);
        if (iter != _gpuTextureViewSet.end()) {
            auto &sets = iter->second.sets;
            for (auto *set : sets) {
                set->update(oldView, newView);
            }
            _gpuTextureViewSet.erase(iter);
        }
    }

    void disengage(const CCVKGPUBufferView *buffer) {
        auto it = _gpuBufferViewSet.find(buffer);
        if (it == _gpuBufferViewSet.end()) return;
        for (uint32_t i = 0; i < it->second.descriptors.size(); ++i) {
            _bufferInstanceIndices.erase(it->second.descriptors[i]);
        }
        _gpuBufferViewSet.erase(it);
    }
    void disengage(CCVKGPUDescriptorSet *set, const CCVKGPUBufferView *buffer, VkDescriptorBufferInfo *descriptor) {
        auto it = _gpuBufferViewSet.find(buffer);
        if (it == _gpuBufferViewSet.end()) return;
        it->second.sets.erase(set);
        auto &descriptors = it->second.descriptors;
        descriptors.fastRemove(descriptors.indexOf(descriptor));
        _bufferInstanceIndices.erase(descriptor);
    }
    void disengage(const CCVKGPUTextureView *texture) {
        auto it = _gpuTextureViewSet.find(texture);
        if (it == _gpuTextureViewSet.end()) return;
        _gpuTextureViewSet.erase(it);
    }
    void disengage(CCVKGPUDescriptorSet *set, const CCVKGPUTextureView *texture, VkDescriptorImageInfo *descriptor) {
        auto it = _gpuTextureViewSet.find(texture);
        if (it == _gpuTextureViewSet.end()) return;
        it->second.sets.erase(set);
        auto &descriptors = it->second.descriptors;
        descriptors.fastRemove(descriptors.indexOf(descriptor));
    }
    void disengage(const CCVKGPUSampler *sampler) {
        auto it = _samplers.find(sampler);
        if (it == _samplers.end()) return;
        _samplers.erase(it);
    }
    void disengage(const CCVKGPUSampler *sampler, VkDescriptorImageInfo *descriptor) {
        auto it = _samplers.find(sampler);
        if (it == _samplers.end()) return;
        auto &descriptors = it->second;
        descriptors.fastRemove(descriptors.indexOf(descriptor));
    }

    void disengage(const CCVKGPUAccelerationStructure *accel,VkAccelerationStructureKHR *descriptor) {
        auto it = _accels.find(accel);
        if (it == _accels.end()) return;
        auto &descriptors = it->second.descriptors;
        descriptors.fastRemove(descriptors.indexOf(descriptor));
    }

private:
    void doUpdate(const CCVKGPUBufferView *buffer, VkDescriptorBufferInfo *descriptor) {
        descriptor->buffer = buffer->gpuBuffer->vkBuffer;
        descriptor->offset = buffer->getStartOffset(_bufferInstanceIndices[descriptor]);
        descriptor->range = buffer->range;
    }

    static void doUpdate(const CCVKGPUTextureView *texture, VkDescriptorImageInfo *descriptor) {
        descriptor->imageView = texture->vkImageView;
    }

    static void doUpdate(const CCVKGPUTextureView *texture, VkDescriptorImageInfo *descriptor, AccessFlags flags) {
        descriptor->imageView = texture->vkImageView;
        if (hasFlag(texture->gpuTexture->flags, TextureFlagBit::GENERAL_LAYOUT)) {
            descriptor->imageLayout = VK_IMAGE_LAYOUT_GENERAL;
        } else {
            bool inoutAttachment = hasAllFlags(flags, AccessFlagBit::FRAGMENT_SHADER_READ_COLOR_INPUT_ATTACHMENT | AccessFlagBit::COLOR_ATTACHMENT_WRITE) ||
                                   hasAllFlags(flags, AccessFlagBit::FRAGMENT_SHADER_READ_DEPTH_STENCIL_INPUT_ATTACHMENT | AccessFlagBit::DEPTH_STENCIL_ATTACHMENT_WRITE);
            bool storageWrite = hasAnyFlags(flags, AccessFlagBit::VERTEX_SHADER_WRITE | AccessFlagBit::FRAGMENT_SHADER_WRITE | AccessFlagBit::COMPUTE_SHADER_WRITE);

            if (inoutAttachment || storageWrite) {
                descriptor->imageLayout = VK_IMAGE_LAYOUT_GENERAL;
            } else if (hasFlag(texture->gpuTexture->usage, TextureUsage::DEPTH_STENCIL_ATTACHMENT)) {
                descriptor->imageLayout = VK_IMAGE_LAYOUT_DEPTH_STENCIL_READ_ONLY_OPTIMAL;
            } else {
                descriptor->imageLayout = VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL;
            }
        }
    }

    static void doUpdate(const CCVKGPUSampler *sampler, VkDescriptorImageInfo *descriptor) {
        descriptor->sampler = sampler->vkSampler;
    }

    static void doUpdate(const CCVKGPUAccelerationStructure *accel, VkAccelerationStructureKHR *descriptor) {
        *descriptor = accel->vkAccelerationStructure;
    }

    template <typename T>
    struct DescriptorInfo {
        ccstd::unordered_set<CCVKGPUDescriptorSet *> sets;
        CachedArray<T *> descriptors;
    };

    ccstd::unordered_map<const VkDescriptorBufferInfo *, uint32_t> _bufferInstanceIndices;
    ccstd::unordered_map<const CCVKGPUBufferView *, DescriptorInfo<VkDescriptorBufferInfo>> _gpuBufferViewSet;
    ccstd::unordered_map<const CCVKGPUTextureView *, DescriptorInfo<VkDescriptorImageInfo>> _gpuTextureViewSet;
    ccstd::unordered_map<const CCVKGPUSampler *, CachedArray<VkDescriptorImageInfo *>> _samplers;
    ccstd::unordered_map<const CCVKGPUAccelerationStructure *, DescriptorInfo<VkAccelerationStructureKHR>> _accels;
};

/**
 * Recycle bin for GPU resources, clears after vkDeviceWaitIdle every frame.
 * All the destroy events will be postponed to that time.
 */
class CCVKGPURecycleBin final {
public:
    explicit CCVKGPURecycleBin(CCVKGPUDevice *device)
    : _device(device) {
        _resources.resize(16);
    }

    void collect(const CCVKGPUTexture *texture);
    void collect(const CCVKGPUTextureView *textureView);
    void collect(const CCVKGPUFramebuffer *frameBuffer);
    void collect(const CCVKGPUDescriptorSet *set);
    void collect(uint32_t layoutId, VkDescriptorSet set);
    void collect(const CCVKGPUBuffer *buffer);

#define DEFINE_RECYCLE_BIN_COLLECT_FN(_type, typeValue, expr)                        \
    void collect(const _type *gpuRes) { /* NOLINT(bugprone-macro-parentheses) N/A */ \
        Resource &res = emplaceBack();                                               \
        res.type = typeValue;                                                        \
        expr;                                                                        \
    }

    DEFINE_RECYCLE_BIN_COLLECT_FN(CCVKGPURenderPass, RecycledType::RENDER_PASS, res.vkRenderPass = gpuRes->vkRenderPass)
    DEFINE_RECYCLE_BIN_COLLECT_FN(CCVKGPUSampler, RecycledType::SAMPLER, res.vkSampler = gpuRes->vkSampler)
    DEFINE_RECYCLE_BIN_COLLECT_FN(CCVKGPUQueryPool, RecycledType::QUERY_POOL, res.vkQueryPool = gpuRes->vkPool)
    DEFINE_RECYCLE_BIN_COLLECT_FN(CCVKGPUPipelineState, RecycledType::PIPELINE_STATE, res.vkPipeline = gpuRes->vkPipeline)
    DEFINE_RECYCLE_BIN_COLLECT_FN(CCVKGPUAccelerationStructure,RecycledType::ACCELERATION_STRUCTURE,res.vkAccelerationStructure = gpuRes->vkAccelerationStructure)

    void clear();

private:
    enum class RecycledType {
        UNKNOWN,
        BUFFER,
        BUFFER_VIEW,
        TEXTURE,
        TEXTURE_VIEW,
        FRAMEBUFFER,
        QUERY_POOL,
        RENDER_PASS,
        SAMPLER,
        PIPELINE_STATE,
        DESCRIPTOR_SET,
        EVENT,
        ACCELERATION_STRUCTURE
    };
    struct Buffer {
        VkBuffer vkBuffer;
        VmaAllocation vmaAllocation;
    };
    struct Image {
        VkImage vkImage;
        VmaAllocation vmaAllocation;
    };
    struct Set {
        uint32_t layoutId;
        VkDescriptorSet vkSet;
    };
    struct Resource {
        RecycledType type = RecycledType::UNKNOWN;
        union {
            // resizable resources, cannot take over directly
            // or descriptor sets won't work
            Buffer buffer;
            Image image;
            Set set;
            VkBufferView vkBufferView;
            VkImageView vkImageView;
            VkFramebuffer vkFramebuffer;
            VkQueryPool vkQueryPool;
            VkRenderPass vkRenderPass;
            VkSampler vkSampler;
            VkEvent vkEvent;
            VkPipeline vkPipeline;
            VkAccelerationStructureKHR vkAccelerationStructure;
        };
    };

    Resource &emplaceBack() {
        if (_resources.size() <= _count) {
            _resources.resize(_count * 2);
        }
        return _resources[_count++];
    }

    CCVKGPUDevice *_device = nullptr;
    ccstd::vector<Resource> _resources;
    size_t _count = 0U;
};

class CCVKGPUInputAssemblerHub {
public:
    explicit CCVKGPUInputAssemblerHub(CCVKGPUDevice *device)
    : _gpuDevice(device) {
    }

    ~CCVKGPUInputAssemblerHub() = default;

    void connect(CCVKGPUInputAssembler *ia, const CCVKGPUBufferView *buffer) {
        _ias[buffer].insert(ia);
    }

    void update(CCVKGPUBufferView *oldBuffer, CCVKGPUBufferView *newBuffer) {
        auto iter = _ias.find(oldBuffer);
        if (iter != _ias.end()) {
            for (const auto &ia : iter->second) {
                ia->update(oldBuffer, newBuffer);
                _ias[newBuffer].insert(ia);
            }
            _ias.erase(iter);
        }
    }

    void disengage(const CCVKGPUBufferView *buffer) {
        auto iter = _ias.find(buffer);
        if (iter != _ias.end()) {
            _ias.erase(iter);
        }
    }

    void disengage(CCVKGPUInputAssembler *set, const CCVKGPUBufferView *buffer) {
        auto iter = _ias.find(buffer);
        if (iter != _ias.end()) {
            iter->second.erase(set);
        }
    }

private:
    CCVKGPUDevice *_gpuDevice = nullptr;
    ccstd::unordered_map<const CCVKGPUBufferView *, ccstd::unordered_set<CCVKGPUInputAssembler *>> _ias;
};

/**
 * Transport hub for data traveling between host and devices.
 * Record all transfer commands until batched submission.
 */
// #define ASYNC_BUFFER_UPDATE
class CCVKGPUTransportHub final {
public:
    CCVKGPUTransportHub(CCVKGPUDevice *device, CCVKGPUQueue *queue)
    : _device(device),
      _queue(queue) {
        _earlyCmdBuff.level = VK_COMMAND_BUFFER_LEVEL_PRIMARY;
        _earlyCmdBuff.queueFamilyIndex = _queue->queueFamilyIndex;

        _lateCmdBuff.level = VK_COMMAND_BUFFER_LEVEL_PRIMARY;
        _lateCmdBuff.queueFamilyIndex = _queue->queueFamilyIndex;

        VkFenceCreateInfo createInfo{VK_STRUCTURE_TYPE_FENCE_CREATE_INFO};
        VK_CHECK(vkCreateFence(_device->vkDevice, &createInfo, nullptr, &_fence));
    }

    ~CCVKGPUTransportHub() {
        if (_fence) {
            vkDestroyFence(_device->vkDevice, _fence, nullptr);
            _fence = VK_NULL_HANDLE;
        }
    }

    bool empty(bool late) const {
        const CCVKGPUCommandBuffer *cmdBuff = late ? &_lateCmdBuff : &_earlyCmdBuff;

        return !cmdBuff->vkCommandBuffer;
    }

    template <typename TFunc>
    void checkIn(const TFunc &record, bool immediateSubmission = false, bool late = false) {
        CCVKGPUCommandBufferPool *commandBufferPool = _device->getCommandBufferPool();
        CCVKGPUCommandBuffer *cmdBuff = late ? &_lateCmdBuff : &_earlyCmdBuff;

        if (!cmdBuff->vkCommandBuffer) {
            commandBufferPool->request(cmdBuff);
            VkCommandBufferBeginInfo beginInfo{VK_STRUCTURE_TYPE_COMMAND_BUFFER_BEGIN_INFO};
            beginInfo.flags = VK_COMMAND_BUFFER_USAGE_ONE_TIME_SUBMIT_BIT;
            VK_CHECK(vkBeginCommandBuffer(cmdBuff->vkCommandBuffer, &beginInfo));
        }

        record(cmdBuff);

        if (immediateSubmission) {
            VK_CHECK(vkEndCommandBuffer(cmdBuff->vkCommandBuffer));
            VkSubmitInfo submitInfo{VK_STRUCTURE_TYPE_SUBMIT_INFO};
            submitInfo.commandBufferCount = 1;
            submitInfo.pCommandBuffers = &cmdBuff->vkCommandBuffer;
            VK_CHECK(vkQueueSubmit(_queue->vkQueue, 1, &submitInfo, _fence));
            VK_CHECK(vkWaitForFences(_device->vkDevice, 1, &_fence, VK_TRUE, DEFAULT_TIMEOUT));
            vkResetFences(_device->vkDevice, 1, &_fence);
            commandBufferPool->yield(cmdBuff);
            cmdBuff->vkCommandBuffer = VK_NULL_HANDLE;
        }
    }

    VkCommandBuffer packageForFlight(bool late) {
        CCVKGPUCommandBuffer *cmdBuff = late ? &_lateCmdBuff : &_earlyCmdBuff;

        VkCommandBuffer vkCommandBuffer = cmdBuff->vkCommandBuffer;
        if (vkCommandBuffer) {
            VK_CHECK(vkEndCommandBuffer(vkCommandBuffer));
            _device->getCommandBufferPool()->yield(cmdBuff);
        }
        return vkCommandBuffer;
    }

private:
    CCVKGPUDevice *_device = nullptr;

    CCVKGPUQueue *_queue = nullptr;
    CCVKGPUCommandBuffer _earlyCmdBuff;
    CCVKGPUCommandBuffer _lateCmdBuff;
    VkFence _fence = VK_NULL_HANDLE;
};

class CCVKGPUBarrierManager final {
public:
    explicit CCVKGPUBarrierManager(CCVKGPUDevice *device)
    : _device(device) {}

    void checkIn(CCVKGPUBuffer *gpuBuffer) {
        _buffersToBeChecked.insert(gpuBuffer);
    }

    void checkIn(CCVKGPUTexture *gpuTexture, const ThsvsAccessType *newTypes = nullptr, uint32_t newTypeCount = 0) {
        ccstd::vector<ThsvsAccessType> &target = gpuTexture->renderAccessTypes;
        for (uint32_t i = 0U; i < newTypeCount; ++i) {
            if (std::find(target.begin(), target.end(), newTypes[i]) == target.end()) {
                target.push_back(newTypes[i]);
            }
        }
        _texturesToBeChecked.insert(gpuTexture);
    }

    void update(CCVKGPUTransportHub *transportHub);

    inline void cancel(CCVKGPUBuffer *gpuBuffer) { _buffersToBeChecked.erase(gpuBuffer); }
    inline void cancel(CCVKGPUTexture *gpuTexture) { _texturesToBeChecked.erase(gpuTexture); }

private:
    ccstd::unordered_set<CCVKGPUBuffer *> _buffersToBeChecked;
    ccstd::unordered_set<CCVKGPUTexture *> _texturesToBeChecked;
    CCVKGPUDevice *_device = nullptr;
};

/**
 * Manages buffer update events, across all back buffer instances.
 */
class CCVKGPUBufferHub final {
public:
    explicit CCVKGPUBufferHub(CCVKGPUDevice *device)
    : _device(device) {
        _buffersToBeUpdated.resize(device->backBufferCount);
    }

    void record(CCVKGPUBuffer *gpuBuffer, uint32_t backBufferIndex, size_t size, bool canMemcpy) {
        for (uint32_t i = 0U; i < _device->backBufferCount; ++i) {
            if (i == backBufferIndex) {
                _buffersToBeUpdated[i].erase(gpuBuffer);
            } else {
                _buffersToBeUpdated[i][gpuBuffer] = {backBufferIndex, size, canMemcpy};
            }
        }
    }

    void erase(CCVKGPUBuffer *gpuBuffer) {
        for (uint32_t i = 0U; i < _device->backBufferCount; ++i) {
            if (_buffersToBeUpdated[i].count(gpuBuffer)) {
                _buffersToBeUpdated[i].erase(gpuBuffer);
            }
        }
    }

    void updateBackBufferCount(uint32_t backBufferCount) {
        _buffersToBeUpdated.resize(backBufferCount);
    }

    void flush(CCVKGPUTransportHub *transportHub);

private:
    struct BufferUpdate {
        uint32_t srcIndex = 0U;
        size_t size = 0U;
        bool canMemcpy = false;
    };

    ccstd::vector<ccstd::unordered_map<CCVKGPUBuffer *, BufferUpdate>> _buffersToBeUpdated;

    CCVKGPUDevice *_device = nullptr;
};

} // namespace gfx
} // namespace cc
