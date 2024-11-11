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

#include "VKAccelerationStructure.h"
#include "VKBuffer.h"
#include "VKCommandBuffer.h"
#include "VKCommands.h"
#include "VKDescriptorSet.h"
#include "VKDescriptorSetLayout.h"
#include "VKFramebuffer.h"
#include "VKGPUObjects.h"
#include "VKInputAssembler.h"
#include "VKPipelineCache.h"
#include "VKPipelineLayout.h"
#include "VKPipelineState.h"
#include "VKQueryPool.h"
#include "VKQueue.h"
#include "VKRenderPass.h"
#include "VKShader.h"
#include "VKSwapchain.h"
#include "VKTexture.h"
#include "VKUtils.h"
#include "base/Utils.h"
#include "gfx-base/GFXDef-common.h"
#include "states/VKBufferBarrier.h"
#include "states/VKGeneralBarrier.h"
#include "states/VKSampler.h"
#include "states/VKTextureBarrier.h"

#include "application/ApplicationManager.h"
#include "gfx-base/SPIRVUtils.h"
#include "platform/interfaces/modules/IXRInterface.h"
#include "profiler/Profiler.h"
#include "vulkan/vulkan_core.h"

#if CC_SWAPPY_ENABLED
    #include "swappy/swappyVk.h"
#endif

CC_DISABLE_WARNINGS()
#define VMA_IMPLEMENTATION
#include "vk_mem_alloc.h"
#define THSVS_ERROR_CHECK_MIXED_IMAGE_LAYOUT
// remote potential hazard because of programmable blend
//#define THSVS_ERROR_CHECK_POTENTIAL_HAZARD
#define THSVS_SIMPLER_VULKAN_SYNCHRONIZATION_IMPLEMENTATION
#include "thsvs_simpler_vulkan_synchronization.h"
CC_ENABLE_WARNINGS()

namespace cc {
namespace gfx {

static VkResult VKAPI_PTR vkCreateRenderPass2KHRFallback(
    VkDevice device,
    const VkRenderPassCreateInfo2 *pCreateInfo,
    const VkAllocationCallbacks *pAllocator,
    VkRenderPass *pRenderPass);

CCVKDevice *CCVKDevice::instance = nullptr;

CCVKDevice *CCVKDevice::getInstance() {
    return CCVKDevice::instance;
}

CCVKDevice::CCVKDevice() {
    _api = API::VULKAN;
    _deviceName = "Vulkan";

    _caps.supportQuery = true;
    _caps.clipSpaceMinZ = 0.0F;
    _caps.screenSpaceSignY = -1.0F;
    _caps.clipSpaceSignY = -1.0F;
    CCVKDevice::instance = this;
}

CCVKDevice::~CCVKDevice() {
    CCVKDevice::instance = nullptr;
}

bool CCVKDevice::doInit(const DeviceInfo & /*info*/) {
    _xr = CC_GET_XR_INTERFACE();
    if (_xr) {
        _xr->preGFXDeviceInitialize(_api);
    }
    _gpuContext = std::make_unique<CCVKGPUContext>();
    if (!_gpuContext->initialize()) {
        return false;
    }

    const VkPhysicalDeviceFeatures2 &deviceFeatures2 = _gpuContext->physicalDeviceFeatures2;
    const VkPhysicalDeviceFeatures &deviceFeatures = deviceFeatures2.features;
    // const VkPhysicalDeviceVulkan11Features &deviceVulkan11Features = _gpuContext->physicalDeviceVulkan11Features;
    // const VkPhysicalDeviceVulkan12Features &deviceVulkan12Features = _gpuContext->physicalDeviceVulkan12Features;

    ///////////////////// Device Creation /////////////////////

    _gpuDevice = std::make_unique<CCVKGPUDevice>();
    _gpuDevice->minorVersion = _gpuContext->minorVersion;

    // only enable the absolute essentials
    ccstd::vector<const char *> requestedLayers{};
    ccstd::vector<const char *> requestedExtensions{
        VK_KHR_SWAPCHAIN_EXTENSION_NAME,
    };
    requestedExtensions.push_back(VK_KHR_FRAGMENT_SHADING_RATE_EXTENSION_NAME);
#if CC_DEBUG
    requestedExtensions.push_back(VK_EXT_DEBUG_MARKER_EXTENSION_NAME);
#endif
    if (_gpuDevice->minorVersion < 2) {
        requestedExtensions.push_back(VK_KHR_CREATE_RENDERPASS_2_EXTENSION_NAME);
    }
    if (_gpuDevice->minorVersion < 1) {
        requestedExtensions.push_back(VK_KHR_DEDICATED_ALLOCATION_EXTENSION_NAME);
        requestedExtensions.push_back(VK_KHR_GET_MEMORY_REQUIREMENTS_2_EXTENSION_NAME);
        requestedExtensions.push_back(VK_KHR_DESCRIPTOR_UPDATE_TEMPLATE_EXTENSION_NAME);
    }

    VkPhysicalDeviceFeatures2 requestedFeatures2{VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_FEATURES_2};
    VkPhysicalDeviceVulkan11Features requestedVulkan11Features{VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_VULKAN_1_1_FEATURES};
    VkPhysicalDeviceVulkan12Features requestedVulkan12Features{VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_VULKAN_1_2_FEATURES};
    // features should be enabled like this:
    requestedFeatures2.features.textureCompressionASTC_LDR = deviceFeatures.textureCompressionASTC_LDR;
    requestedFeatures2.features.textureCompressionBC = deviceFeatures.textureCompressionBC;
    requestedFeatures2.features.textureCompressionETC2 = deviceFeatures.textureCompressionETC2;
    requestedFeatures2.features.samplerAnisotropy = deviceFeatures.samplerAnisotropy;
    requestedFeatures2.features.depthBounds = deviceFeatures.depthBounds;
    requestedFeatures2.features.multiDrawIndirect = deviceFeatures.multiDrawIndirect;
    // requestedFeatures2.features.se
    requestedVulkan12Features.separateDepthStencilLayouts = _gpuContext->physicalDeviceVulkan12Features.separateDepthStencilLayouts;

    VkPhysicalDeviceFragmentShadingRateFeaturesKHR shadingRateRequest = {};
    shadingRateRequest.sType = VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_FRAGMENT_SHADING_RATE_FEATURES_KHR;
    shadingRateRequest.attachmentFragmentShadingRate = _gpuContext->physicalDeviceFragmentShadingRateFeatures.attachmentFragmentShadingRate;
    shadingRateRequest.pipelineFragmentShadingRate = _gpuContext->physicalDeviceFragmentShadingRateFeatures.pipelineFragmentShadingRate;

    requestedVulkan12Features.pNext = &shadingRateRequest;

    if (_gpuContext->validationEnabled) {
        requestedLayers.push_back("VK_LAYER_KHRONOS_validation");
    }

    #define CC_RAY_TRACING_ENABLE 1

#if CC_RAY_TRACING_ENABLE

    requestedExtensions.push_back(VK_KHR_DEFERRED_HOST_OPERATIONS_EXTENSION_NAME);
    requestedExtensions.push_back(VK_KHR_ACCELERATION_STRUCTURE_EXTENSION_NAME);
    requestedExtensions.push_back(VK_KHR_RAY_QUERY_EXTENSION_NAME);
    requestedExtensions.push_back(VK_KHR_BUFFER_DEVICE_ADDRESS_EXTENSION_NAME);

    requestedVulkan12Features.bufferDeviceAddress = true;

    VkPhysicalDeviceAccelerationStructureFeaturesKHR accelerationStructureFeatures{VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_ACCELERATION_STRUCTURE_FEATURES_KHR};
    accelerationStructureFeatures.accelerationStructure = true;

    VkPhysicalDeviceRayQueryFeaturesKHR rayQueryFeatures{VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_RAY_QUERY_FEATURES_KHR};
    rayQueryFeatures.rayQuery = true;

    VkPhysicalDeviceRayTracingPipelineFeaturesKHR rayTracingPipelineFeatures{VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_RAY_TRACING_PIPELINE_FEATURES_KHR};
    rayTracingPipelineFeatures.rayTracingPipeline = true;

    requestedVulkan12Features.pNext = &accelerationStructureFeatures;
    accelerationStructureFeatures.pNext = &rayQueryFeatures;
    rayQueryFeatures.pNext = &rayTracingPipelineFeatures;
    
#endif

    // check extensions
    uint32_t availableLayerCount;
    VK_CHECK(vkEnumerateDeviceLayerProperties(_gpuContext->physicalDevice, &availableLayerCount, nullptr));
    _gpuDevice->layers.resize(availableLayerCount);
    VK_CHECK(vkEnumerateDeviceLayerProperties(_gpuContext->physicalDevice, &availableLayerCount, _gpuDevice->layers.data()));

    uint32_t availableExtensionCount;
    VK_CHECK(vkEnumerateDeviceExtensionProperties(_gpuContext->physicalDevice, nullptr, &availableExtensionCount, nullptr));
    _gpuDevice->extensions.resize(availableExtensionCount);
    VK_CHECK(vkEnumerateDeviceExtensionProperties(_gpuContext->physicalDevice, nullptr, &availableExtensionCount, _gpuDevice->extensions.data()));

#if CC_SWAPPY_ENABLED
    uint32_t swappyRequiredExtensionCount = 0;
    SwappyVk_determineDeviceExtensions(_gpuContext->physicalDevice, availableExtensionCount,
                                       _gpuDevice->extensions.data(), &swappyRequiredExtensionCount, nullptr);
    ccstd::vector<char *> swappyRequiredExtensions(swappyRequiredExtensionCount);
    ccstd::vector<char> swappyRequiredExtensionsData(swappyRequiredExtensionCount * (VK_MAX_EXTENSION_NAME_SIZE + 1));
    for (uint32_t i = 0; i < swappyRequiredExtensionCount; i++) {
        swappyRequiredExtensions[i] = &swappyRequiredExtensionsData[i * (VK_MAX_EXTENSION_NAME_SIZE + 1)];
    }
    SwappyVk_determineDeviceExtensions(_gpuContext->physicalDevice, availableExtensionCount,
                                       _gpuDevice->extensions.data(), &swappyRequiredExtensionCount, swappyRequiredExtensions.data());
    ccstd::vector<ccstd::string> swappyRequiredExtList(swappyRequiredExtensionCount);

    for (size_t i = 0; i < swappyRequiredExtensionCount; ++i) {
        swappyRequiredExtList[i] = swappyRequiredExtensions[i];
        requestedExtensions.push_back(swappyRequiredExtList[i].c_str());
    }
#endif

    // just filter out the unsupported layers & extensions
    for (const char *layer : requestedLayers) {
        if (isLayerSupported(layer, _gpuDevice->layers)) {
            _layers.push_back(layer);
        }
    }
    for (const char *extension : requestedExtensions) {
        if (isExtensionSupported(extension, _gpuDevice->extensions)) {
            _extensions.push_back(extension);
        }
    }

    // prepare the device queues
    uint32_t queueFamilyPropertiesCount = utils::toUint(_gpuContext->queueFamilyProperties.size());
    ccstd::vector<VkDeviceQueueCreateInfo> queueCreateInfos(queueFamilyPropertiesCount, {VK_STRUCTURE_TYPE_DEVICE_QUEUE_CREATE_INFO});
    ccstd::vector<ccstd::vector<float>> queuePriorities(queueFamilyPropertiesCount);

    for (uint32_t queueFamilyIndex = 0U; queueFamilyIndex < queueFamilyPropertiesCount; ++queueFamilyIndex) {
        const VkQueueFamilyProperties &queueFamilyProperty = _gpuContext->queueFamilyProperties[queueFamilyIndex];

        queuePriorities[queueFamilyIndex].resize(queueFamilyProperty.queueCount, 1.0F);

        VkDeviceQueueCreateInfo &queueCreateInfo = queueCreateInfos[queueFamilyIndex];

        queueCreateInfo.queueFamilyIndex = queueFamilyIndex;
        queueCreateInfo.queueCount = queueFamilyProperty.queueCount;
        queueCreateInfo.pQueuePriorities = queuePriorities[queueFamilyIndex].data();
    }

    VkDeviceCreateInfo deviceCreateInfo{VK_STRUCTURE_TYPE_DEVICE_CREATE_INFO};

    deviceCreateInfo.queueCreateInfoCount = utils::toUint(queueCreateInfos.size());
    deviceCreateInfo.pQueueCreateInfos = queueCreateInfos.data();
    deviceCreateInfo.enabledLayerCount = utils::toUint(_layers.size());
    deviceCreateInfo.ppEnabledLayerNames = _layers.data();
    deviceCreateInfo.enabledExtensionCount = utils::toUint(_extensions.size());
    deviceCreateInfo.ppEnabledExtensionNames = _extensions.data();
    if (_gpuDevice->minorVersion < 1 && !_gpuContext->checkExtension(VK_KHR_GET_PHYSICAL_DEVICE_PROPERTIES_2_EXTENSION_NAME)) {
        deviceCreateInfo.pEnabledFeatures = &requestedFeatures2.features;
    } else {
        deviceCreateInfo.pNext = &requestedFeatures2;
        if (_gpuDevice->minorVersion >= 2) {
            requestedFeatures2.pNext = &requestedVulkan11Features;
            requestedVulkan11Features.pNext = &requestedVulkan12Features;
        }
    }

    if (_xr) {
        _gpuDevice->vkDevice = _xr->createXRVulkanDevice(&deviceCreateInfo);
    } else {
        VK_CHECK(vkCreateDevice(_gpuContext->physicalDevice, &deviceCreateInfo, nullptr, &_gpuDevice->vkDevice));
    }
    volkLoadDevice(_gpuDevice->vkDevice);

    SPIRVUtils::getInstance()->initialize(static_cast<int>(_gpuDevice->minorVersion));

    ///////////////////// Gather Device Properties /////////////////////

    auto findPreferredDepthFormat = [this](const VkFormat *formats, uint32_t count, VkFormat *pFormat) {
        for (uint32_t i = 0; i < count; ++i) {
            VkFormat format = formats[i];
            VkFormatProperties formatProperties;
            vkGetPhysicalDeviceFormatProperties(_gpuContext->physicalDevice, format, &formatProperties);
            // Format must support depth stencil attachment for optimal tiling
            if (formatProperties.optimalTilingFeatures & VK_FORMAT_FEATURE_DEPTH_STENCIL_ATTACHMENT_BIT) {
                if (formatProperties.optimalTilingFeatures & VK_FORMAT_FEATURE_SAMPLED_IMAGE_BIT) {
                    *pFormat = format;
                    break;
                }
            }
        }
    };

    VkFormat depthFormatPriorityList[]{
        VK_FORMAT_D32_SFLOAT,
        VK_FORMAT_X8_D24_UNORM_PACK32,
        VK_FORMAT_D16_UNORM,
    };
    findPreferredDepthFormat(depthFormatPriorityList, 3, &_gpuDevice->depthFormat);

    VkFormat depthStencilFormatPriorityList[]{
        VK_FORMAT_D24_UNORM_S8_UINT,
        VK_FORMAT_D32_SFLOAT_S8_UINT,
        VK_FORMAT_D16_UNORM_S8_UINT,
    };
    findPreferredDepthFormat(depthStencilFormatPriorityList, 3, &_gpuDevice->depthStencilFormat);

    initDeviceFeature();
    initFormatFeature();

    ccstd::string compressedFmts;

    if (getFormatFeatures(Format::BC1_SRGB_ALPHA) != FormatFeature::NONE) {
        compressedFmts += "dxt ";
    }

    if (getFormatFeatures(Format::ETC2_RGBA8) != FormatFeature::NONE) {
        compressedFmts += "etc2 ";
    }

    if (getFormatFeatures(Format::ASTC_RGBA_4X4) != FormatFeature::NONE) {
        compressedFmts += "astc ";
    }

    if (getFormatFeatures(Format::PVRTC_RGBA2) != FormatFeature::NONE) {
        compressedFmts += "pvrtc ";
    }

    _gpuDevice->useMultiDrawIndirect = deviceFeatures.multiDrawIndirect;
    _gpuDevice->useDescriptorUpdateTemplate = _gpuDevice->minorVersion > 0 || checkExtension(VK_KHR_DESCRIPTOR_UPDATE_TEMPLATE_EXTENSION_NAME);

    if (_gpuDevice->minorVersion > 1) {
        _gpuDevice->createRenderPass2 = vkCreateRenderPass2;
    } else if (checkExtension(VK_KHR_CREATE_RENDERPASS_2_EXTENSION_NAME)) {
        _gpuDevice->createRenderPass2 = vkCreateRenderPass2KHR;
    } else {
        _gpuDevice->createRenderPass2 = vkCreateRenderPass2KHRFallback;
    }

    const VkPhysicalDeviceLimits &limits = _gpuContext->physicalDeviceProperties.limits;
    _caps.maxVertexAttributes = limits.maxVertexInputAttributes;
    _caps.maxVertexUniformVectors = limits.maxUniformBufferRange / 16;
    _caps.maxFragmentUniformVectors = limits.maxUniformBufferRange / 16;
    _caps.maxUniformBufferBindings = limits.maxDescriptorSetUniformBuffers;
    _caps.maxUniformBlockSize = limits.maxUniformBufferRange;
    _caps.maxShaderStorageBlockSize = limits.maxStorageBufferRange;
    _caps.maxShaderStorageBufferBindings = limits.maxDescriptorSetStorageBuffers;
    _caps.maxTextureUnits = limits.maxDescriptorSetSampledImages;
    _caps.maxVertexTextureUnits = limits.maxPerStageDescriptorSampledImages;
    _caps.maxColorRenderTargets = limits.maxColorAttachments;
    _caps.maxTextureSize = limits.maxImageDimension2D;
    _caps.maxCubeMapTextureSize = limits.maxImageDimensionCube;
    _caps.maxArrayTextureLayers = limits.maxImageArrayLayers;
    _caps.max3DTextureSize = limits.maxImageDimension3D;
    _caps.uboOffsetAlignment = utils::toUint(limits.minUniformBufferOffsetAlignment);
    // compute shaders
    _caps.maxComputeSharedMemorySize = limits.maxComputeSharedMemorySize;
    _caps.maxComputeWorkGroupInvocations = limits.maxComputeWorkGroupInvocations;
    _caps.maxComputeWorkGroupCount = {limits.maxComputeWorkGroupCount[0], limits.maxComputeWorkGroupCount[1], limits.maxComputeWorkGroupCount[2]};
    _caps.maxComputeWorkGroupSize = {limits.maxComputeWorkGroupSize[0], limits.maxComputeWorkGroupSize[1], limits.maxComputeWorkGroupSize[2]};
#if defined(VK_USE_PLATFORM_ANDROID_KHR)
    // UNASSIGNED-BestPractices-vkCreateComputePipelines-compute-work-group-size
    _caps.maxComputeWorkGroupInvocations = std::min(_caps.maxComputeWorkGroupInvocations, 64U);
#endif // defined(VK_USE_PLATFORM_ANDROID_KHR)
    initExtensionCapability();

    ///////////////////// Resource Initialization /////////////////////

    QueueInfo queueInfo;
    queueInfo.type = QueueType::GRAPHICS;
    _queue = createQueue(queueInfo);

    QueryPoolInfo queryPoolInfo{QueryType::OCCLUSION, DEFAULT_MAX_QUERY_OBJECTS, false};
    _queryPool = createQueryPool(queryPoolInfo);

    CommandBufferInfo cmdBuffInfo;
    cmdBuffInfo.type = CommandBufferType::PRIMARY;
    cmdBuffInfo.queue = _queue;
    _cmdBuff = createCommandBuffer(cmdBuffInfo);

    VmaAllocatorCreateInfo allocatorInfo{};
    allocatorInfo.physicalDevice = _gpuContext->physicalDevice;
    allocatorInfo.device = _gpuDevice->vkDevice;
    allocatorInfo.instance = _gpuContext->vkInstance;
    allocatorInfo.flags |= VMA_ALLOCATOR_CREATE_BUFFER_DEVICE_ADDRESS_BIT;

    VmaVulkanFunctions vmaVulkanFunc{};
    vmaVulkanFunc.vkAllocateMemory = vkAllocateMemory;
    vmaVulkanFunc.vkBindBufferMemory = vkBindBufferMemory;
    vmaVulkanFunc.vkBindImageMemory = vkBindImageMemory;
    vmaVulkanFunc.vkCreateBuffer = vkCreateBuffer;
    vmaVulkanFunc.vkCreateImage = vkCreateImage;
    vmaVulkanFunc.vkDestroyBuffer = vkDestroyBuffer;
    vmaVulkanFunc.vkDestroyImage = vkDestroyImage;
    vmaVulkanFunc.vkFlushMappedMemoryRanges = vkFlushMappedMemoryRanges;
    vmaVulkanFunc.vkFreeMemory = vkFreeMemory;
    vmaVulkanFunc.vkGetBufferMemoryRequirements = vkGetBufferMemoryRequirements;
    vmaVulkanFunc.vkGetImageMemoryRequirements = vkGetImageMemoryRequirements;
    vmaVulkanFunc.vkGetPhysicalDeviceMemoryProperties = vkGetPhysicalDeviceMemoryProperties;
    vmaVulkanFunc.vkGetPhysicalDeviceProperties = vkGetPhysicalDeviceProperties;
    vmaVulkanFunc.vkInvalidateMappedMemoryRanges = vkInvalidateMappedMemoryRanges;
    vmaVulkanFunc.vkMapMemory = vkMapMemory;
    vmaVulkanFunc.vkUnmapMemory = vkUnmapMemory;
    vmaVulkanFunc.vkCmdCopyBuffer = vkCmdCopyBuffer;

    if (_gpuDevice->minorVersion > 0) {
        allocatorInfo.flags |= VMA_ALLOCATOR_CREATE_KHR_DEDICATED_ALLOCATION_BIT;
        vmaVulkanFunc.vkGetBufferMemoryRequirements2KHR = vkGetBufferMemoryRequirements2;
        vmaVulkanFunc.vkGetImageMemoryRequirements2KHR = vkGetImageMemoryRequirements2;
        vmaVulkanFunc.vkBindBufferMemory2KHR = vkBindBufferMemory2;
        vmaVulkanFunc.vkBindImageMemory2KHR = vkBindImageMemory2;
    } else {
        if (checkExtension(VK_KHR_DEDICATED_ALLOCATION_EXTENSION_NAME) &&
            checkExtension(VK_KHR_GET_MEMORY_REQUIREMENTS_2_EXTENSION_NAME)) {
            allocatorInfo.flags |= VMA_ALLOCATOR_CREATE_KHR_DEDICATED_ALLOCATION_BIT;
            vmaVulkanFunc.vkGetBufferMemoryRequirements2KHR = vkGetBufferMemoryRequirements2KHR;
            vmaVulkanFunc.vkGetImageMemoryRequirements2KHR = vkGetImageMemoryRequirements2KHR;
        }
        if (checkExtension(VK_KHR_BIND_MEMORY_2_EXTENSION_NAME)) {
            vmaVulkanFunc.vkBindBufferMemory2KHR = vkBindBufferMemory2KHR;
            vmaVulkanFunc.vkBindImageMemory2KHR = vkBindImageMemory2KHR;
        }
    }
    if (checkExtension(VK_EXT_MEMORY_BUDGET_EXTENSION_NAME)) {
        if (_gpuDevice->minorVersion > 0) {
            vmaVulkanFunc.vkGetPhysicalDeviceMemoryProperties2KHR = vkGetPhysicalDeviceMemoryProperties2;
        } else if (checkExtension(VK_KHR_GET_PHYSICAL_DEVICE_PROPERTIES_2_EXTENSION_NAME)) {
            vmaVulkanFunc.vkGetPhysicalDeviceMemoryProperties2KHR = vkGetPhysicalDeviceMemoryProperties2KHR;
        }
    }

    allocatorInfo.pVulkanFunctions = &vmaVulkanFunc;

    VK_CHECK(vmaCreateAllocator(&allocatorInfo, &_gpuDevice->memoryAllocator));

    uint32_t backBufferCount = _gpuDevice->backBufferCount;
    for (uint32_t i = 0U; i < backBufferCount; i++) {
        _gpuFencePools.push_back(std::make_unique<CCVKGPUFencePool>(_gpuDevice.get()));
        _gpuRecycleBins.push_back(std::make_unique<CCVKGPURecycleBin>(_gpuDevice.get()));
        _gpuStagingBufferPools.push_back(std::make_unique<CCVKGPUStagingBufferPool>(_gpuDevice.get()));
    }

    _gpuBufferHub = std::make_unique<CCVKGPUBufferHub>(_gpuDevice.get());
    _gpuIAHub = std::make_unique<CCVKGPUInputAssemblerHub>(_gpuDevice.get());
    _gpuTransportHub = std::make_unique<CCVKGPUTransportHub>(_gpuDevice.get(), static_cast<CCVKQueue *>(_queue)->gpuQueue());
    _gpuDescriptorHub = std::make_unique<CCVKGPUDescriptorHub>(_gpuDevice.get());
    _gpuSemaphorePool = std::make_unique<CCVKGPUSemaphorePool>(_gpuDevice.get());
    _gpuBarrierManager = std::make_unique<CCVKGPUBarrierManager>(_gpuDevice.get());
    _gpuDescriptorSetHub = std::make_unique<CCVKGPUDescriptorSetHub>(_gpuDevice.get());

    _gpuDevice->defaultSampler = ccnew CCVKGPUSampler();
    _gpuDevice->defaultSampler->init();

    _gpuDevice->defaultTexture = ccnew CCVKGPUTexture();
    _gpuDevice->defaultTexture->format = Format::RGBA8;
    _gpuDevice->defaultTexture->usage = TextureUsageBit::SAMPLED | TextureUsage::STORAGE;
    _gpuDevice->defaultTexture->width = _gpuDevice->defaultTexture->height = 1U;
    _gpuDevice->defaultTexture->size = formatSize(Format::RGBA8, 1U, 1U, 1U);
    _gpuDevice->defaultTexture->init();

    _gpuDevice->defaultTextureView = ccnew CCVKGPUTextureView();
    _gpuDevice->defaultTextureView->gpuTexture = _gpuDevice->defaultTexture;
    _gpuDevice->defaultTextureView->format = Format::RGBA8;
    _gpuDevice->defaultTextureView->init();

    ThsvsImageBarrier barrier{};
    barrier.nextAccessCount = 1;
    barrier.pNextAccesses = getAccessType(AccessFlagBit::VERTEX_SHADER_READ_TEXTURE);
    barrier.image = _gpuDevice->defaultTexture->vkImage;
    barrier.srcQueueFamilyIndex = VK_QUEUE_FAMILY_IGNORED;
    barrier.dstQueueFamilyIndex = VK_QUEUE_FAMILY_IGNORED;
    barrier.subresourceRange.aspectMask = VK_IMAGE_ASPECT_COLOR_BIT;
    barrier.subresourceRange.levelCount = VK_REMAINING_MIP_LEVELS;
    barrier.subresourceRange.layerCount = VK_REMAINING_ARRAY_LAYERS;
    gpuTransportHub()->checkIn(
        [&barrier](const CCVKGPUCommandBuffer *gpuCommandBuffer) {
            cmdFuncCCVKImageMemoryBarrier(gpuCommandBuffer, barrier);
        },
        true);

    _gpuDevice->defaultBuffer = ccnew CCVKGPUBuffer();
    _gpuDevice->defaultBuffer->usage = BufferUsage::UNIFORM | BufferUsage::STORAGE;
    _gpuDevice->defaultBuffer->memUsage = MemoryUsage::HOST | MemoryUsage::DEVICE;
    _gpuDevice->defaultBuffer->size = _gpuDevice->defaultBuffer->stride = 16U;
    _gpuDevice->defaultBuffer->count = 1U;
    _gpuDevice->defaultBuffer->init();

    getAccessTypes(AccessFlagBit::COLOR_ATTACHMENT_WRITE, _gpuDevice->defaultColorBarrier.nextAccesses);
    cmdFuncCCVKCreateGeneralBarrier(this, &_gpuDevice->defaultColorBarrier);

    getAccessTypes(AccessFlagBit::DEPTH_STENCIL_ATTACHMENT_WRITE, _gpuDevice->defaultDepthStencilBarrier.nextAccesses);
    cmdFuncCCVKCreateGeneralBarrier(this, &_gpuDevice->defaultDepthStencilBarrier);

    _pipelineCache = std::make_unique<CCVKPipelineCache>();
    _pipelineCache->init(_gpuDevice->vkDevice);

    ///////////////////// Print Debug Info /////////////////////

    ccstd::string instanceLayers;
    ccstd::string instanceExtensions;
    ccstd::string deviceLayers;
    ccstd::string deviceExtensions;
    for (const char *layer : _gpuContext->layers) {
        instanceLayers += layer + ccstd::string(" ");
    }
    for (const char *extension : _gpuContext->extensions) {
        instanceExtensions += extension + ccstd::string(" ");
    }
    for (const char *layer : _layers) {
        deviceLayers += layer + ccstd::string(" ");
    }
    for (const char *extension : _extensions) {
        deviceExtensions += extension + ccstd::string(" ");
    }

    uint32_t apiVersion = _gpuContext->physicalDeviceProperties.apiVersion;
    _renderer = _gpuContext->physicalDeviceProperties.deviceName;
    _vendor = mapVendorName(_gpuContext->physicalDeviceProperties.vendorID);
    _version = StringUtil::format("%d.%d.%d", VK_VERSION_MAJOR(apiVersion),
                                  VK_VERSION_MINOR(apiVersion), VK_VERSION_PATCH(apiVersion));

    CC_LOG_INFO("Vulkan device initialized.");
    CC_LOG_INFO("RENDERER: %s", _renderer.c_str());
    CC_LOG_INFO("VENDOR: %s", _vendor.c_str());
    CC_LOG_INFO("VERSION: %s", _version.c_str());
    CC_LOG_INFO("INSTANCE_LAYERS: %s", instanceLayers.c_str());
    CC_LOG_INFO("INSTANCE_EXTENSIONS: %s", instanceExtensions.c_str());
    CC_LOG_INFO("DEVICE_LAYERS: %s", deviceLayers.c_str());
    CC_LOG_INFO("DEVICE_EXTENSIONS: %s", deviceExtensions.c_str());
    CC_LOG_INFO("COMPRESSED_FORMATS: %s", compressedFmts.c_str());

    if (_xr) {
        cc::gfx::CCVKGPUQueue *vkQueue = static_cast<cc::gfx::CCVKQueue *>(getQueue())->gpuQueue();
        _xr->setXRConfig(xr::XRConfigKey::VK_QUEUE_FAMILY_INDEX, static_cast<int>(vkQueue->queueFamilyIndex));
        _xr->postGFXDeviceInitialize(_api);
    }
    return true;
}

void CCVKDevice::doDestroy() {
    waitAllFences();

    SPIRVUtils::getInstance()->destroy();

    if (_gpuDevice) {
        _gpuDevice->defaultBuffer = nullptr;
        _gpuDevice->defaultTexture = nullptr;
        _gpuDevice->defaultTextureView = nullptr;
        _gpuDevice->defaultSampler = nullptr;
    }

    CC_SAFE_DESTROY_AND_DELETE(_queryPool)
    CC_SAFE_DESTROY_AND_DELETE(_queue)
    CC_SAFE_DESTROY_AND_DELETE(_cmdBuff)

    _gpuStagingBufferPools.clear();
    _gpuFencePools.clear();

    _gpuBufferHub = nullptr;
    _gpuTransportHub = nullptr;
    _gpuSemaphorePool = nullptr;
    _gpuDescriptorHub = nullptr;
    _gpuBarrierManager = nullptr;
    _gpuDescriptorSetHub = nullptr;
    _gpuIAHub = nullptr;

    if (_gpuDevice) {
        uint32_t backBufferCount = _gpuDevice->backBufferCount;
        for (uint32_t i = 0U; i < backBufferCount; i++) {
            _gpuRecycleBins[i]->clear();
        }
    }
    _gpuStagingBufferPools.clear();
    _gpuRecycleBins.clear();
    _gpuFencePools.clear();

    if (_gpuDevice) {
        _pipelineCache.reset();

        if (_gpuDevice->memoryAllocator != VK_NULL_HANDLE) {
            VmaStats stats;
            vmaCalculateStats(_gpuDevice->memoryAllocator, &stats);
            CC_LOG_INFO("Total device memory leaked: %d bytes.", stats.total.usedBytes);
            CC_ASSERT(!_memoryStatus.bufferSize);  // Buffer memory leaked.
            CC_ASSERT(!_memoryStatus.textureSize); // Texture memory leaked.

            vmaDestroyAllocator(_gpuDevice->memoryAllocator);
            _gpuDevice->memoryAllocator = VK_NULL_HANDLE;
        }

        for (auto it = _gpuDevice->_commandBufferPools.begin(); it != _gpuDevice->_commandBufferPools.end(); ++it) {
            CC_SAFE_DELETE(it->second)
        }
        _gpuDevice->_commandBufferPools.clear();
        _gpuDevice->_descriptorSetPools.clear();

        if (_gpuDevice->vkDevice != VK_NULL_HANDLE) {
            vkDestroyDevice(_gpuDevice->vkDevice, nullptr);
            _gpuDevice->vkDevice = VK_NULL_HANDLE;
        }

        _gpuDevice = nullptr;
    }

    _gpuContext = nullptr;
}

namespace {
ccstd::vector<VkSwapchainKHR> vkSwapchains;
ccstd::vector<uint32_t> vkSwapchainIndices;
ccstd::vector<CCVKGPUSwapchain *> gpuSwapchains;
ccstd::vector<VkImageMemoryBarrier> vkAcquireBarriers;
ccstd::vector<VkImageMemoryBarrier> vkPresentBarriers;

VkImageMemoryBarrier acquireBarrier{
    VK_STRUCTURE_TYPE_IMAGE_MEMORY_BARRIER,
    nullptr,
    0,
    VK_ACCESS_COLOR_ATTACHMENT_WRITE_BIT,
    VK_IMAGE_LAYOUT_PRESENT_SRC_KHR,
    VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL,
    VK_QUEUE_FAMILY_IGNORED,
    VK_QUEUE_FAMILY_IGNORED,
    0, // NOLINT(modernize-use-nullptr) platform dependent type
    {VK_IMAGE_ASPECT_COLOR_BIT, 0, 1, 0, 1},
};
VkImageMemoryBarrier presentBarrier{
    VK_STRUCTURE_TYPE_IMAGE_MEMORY_BARRIER,
    nullptr,
    VK_ACCESS_COLOR_ATTACHMENT_WRITE_BIT,
    0,
    VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL,
    VK_IMAGE_LAYOUT_PRESENT_SRC_KHR,
    VK_QUEUE_FAMILY_IGNORED,
    VK_QUEUE_FAMILY_IGNORED,
    0, // NOLINT(modernize-use-nullptr) platform dependent type
    {VK_IMAGE_ASPECT_COLOR_BIT, 0, 1, 0, 1},
};
} // namespace

void CCVKDevice::acquire(Swapchain *const *swapchains, uint32_t count) {
    if (_onAcquire) _onAcquire->execute();

    auto *queue = static_cast<CCVKQueue *>(_queue);
    queue->gpuQueue()->lastSignaledSemaphores.clear();
    vkSwapchainIndices.clear();
    gpuSwapchains.clear();
    vkSwapchains.clear();
    vkAcquireBarriers.resize(count, acquireBarrier);
    vkPresentBarriers.resize(count, presentBarrier);
    for (uint32_t i = 0U; i < count; ++i) {
        auto *swapchain = static_cast<CCVKSwapchain *>(swapchains[i]);
        if (swapchain->gpuSwapchain()->lastPresentResult == VK_NOT_READY) {
            if (!swapchain->checkSwapchainStatus()) {
                continue;
            }
        }

        if (_xr) {
            xr::XRSwapchain xrSwapchain = _xr->doGFXDeviceAcquire(_api);
            swapchain->gpuSwapchain()->curImageIndex = xrSwapchain.swapchainImageIndex;
        }
        if (swapchain->gpuSwapchain()->vkSwapchain) {
            vkSwapchains.push_back(swapchain->gpuSwapchain()->vkSwapchain);
        }
        if (swapchain->gpuSwapchain()) {
            gpuSwapchains.push_back(swapchain->gpuSwapchain());
        }
        vkSwapchainIndices.push_back(swapchain->gpuSwapchain()->curImageIndex);
    }

    _gpuDescriptorSetHub->flush();
    _gpuSemaphorePool->reset();

    for (uint32_t i = 0; i < vkSwapchains.size(); ++i) {
        VkSemaphore acquireSemaphore = _gpuSemaphorePool->alloc();
        VkResult res = vkAcquireNextImageKHR(_gpuDevice->vkDevice, vkSwapchains[i], ~0ULL,
                                             acquireSemaphore, VK_NULL_HANDLE, &vkSwapchainIndices[i]);
        CC_ASSERT(res == VK_SUCCESS || res == VK_SUBOPTIMAL_KHR);
        gpuSwapchains[i]->curImageIndex = vkSwapchainIndices[i];
        queue->gpuQueue()->lastSignaledSemaphores.push_back(acquireSemaphore);

        vkAcquireBarriers[i].image = gpuSwapchains[i]->swapchainImages[vkSwapchainIndices[i]];
        vkPresentBarriers[i].image = gpuSwapchains[i]->swapchainImages[vkSwapchainIndices[i]];
    }

    if (this->_options.enableBarrierDeduce) {
        _gpuTransportHub->checkIn(
            [&](const CCVKGPUCommandBuffer *gpuCommandBuffer) {
                vkCmdPipelineBarrier(gpuCommandBuffer->vkCommandBuffer, VK_PIPELINE_STAGE_TOP_OF_PIPE_BIT, VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT,
                                     0, 0, nullptr, 0, nullptr, utils::toUint(vkSwapchains.size()), vkAcquireBarriers.data());
            },
            false, false);

        _gpuTransportHub->checkIn(
            [&](const CCVKGPUCommandBuffer *gpuCommandBuffer) {
                vkCmdPipelineBarrier(gpuCommandBuffer->vkCommandBuffer, VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT, VK_PIPELINE_STAGE_BOTTOM_OF_PIPE_BIT,
                                     0, 0, nullptr, 0, nullptr, utils::toUint(vkSwapchains.size()), vkPresentBarriers.data());
            },
            false, true);
    }
}

void CCVKDevice::present() {
    CC_PROFILE(CCVKDevicePresent);
    bool isGFXDeviceNeedsPresent = _xr ? _xr->isGFXDeviceNeedsPresent(_api) : true;
    auto *queue = static_cast<CCVKQueue *>(_queue);
    _numDrawCalls = queue->_numDrawCalls;
    _numInstances = queue->_numInstances;
    _numTriangles = queue->_numTriangles;
    queue->_numDrawCalls = 0;
    queue->_numInstances = 0;
    queue->_numTriangles = 0;

    if (!_gpuTransportHub->empty(false)) _gpuTransportHub->packageForFlight(false);
    if (!_gpuTransportHub->empty(true)) _gpuTransportHub->packageForFlight(true);

#if CC_SWAPPY_ENABLED
    // tripple buffer?
    // static vector<uint8_t> queueFmlIdxBuff(_gpuDevice->backBufferCount);
    // std::iota(std::begin(queueFmlIdxBuff), std::end(queueFmlIdxBuff), 0);
    SwappyVk_setQueueFamilyIndex(_gpuDevice->vkDevice, queue->gpuQueue()->vkQueue, queue->gpuQueue()->queueFamilyIndex);
    auto vkCCPresentFunc = SwappyVk_queuePresent;
#else
    auto vkCCPresentFunc = vkQueuePresentKHR;
#endif

    if (!vkSwapchains.empty()) { // don't present if not acquired
        VkPresentInfoKHR presentInfo{VK_STRUCTURE_TYPE_PRESENT_INFO_KHR};
        presentInfo.waitSemaphoreCount = utils::toUint(queue->gpuQueue()->lastSignaledSemaphores.size());
        presentInfo.pWaitSemaphores = queue->gpuQueue()->lastSignaledSemaphores.data();
        presentInfo.swapchainCount = utils::toUint(vkSwapchains.size());
        presentInfo.pSwapchains = vkSwapchains.data();
        presentInfo.pImageIndices = vkSwapchainIndices.data();

        VkResult res = !isGFXDeviceNeedsPresent ? VK_SUCCESS : vkCCPresentFunc(queue->gpuQueue()->vkQueue, &presentInfo);
        for (auto *gpuSwapchain : gpuSwapchains) {
            gpuSwapchain->lastPresentResult = res;
        }
    }

    _gpuDevice->curBackBufferIndex = (_gpuDevice->curBackBufferIndex + 1) % _gpuDevice->backBufferCount;

    uint32_t fenceCount = gpuFencePool()->size();
    if (fenceCount) {
        VK_CHECK(vkWaitForFences(_gpuDevice->vkDevice, fenceCount,
                                 gpuFencePool()->data(), VK_TRUE, DEFAULT_TIMEOUT));
    }

    gpuFencePool()->reset();
    gpuRecycleBin()->clear();
    gpuStagingBufferPool()->reset();
    if (_xr) {
        _xr->postGFXDevicePresent(_api);
    }
}

void CCVKDevice::frameSync() {
}

CCVKGPUFencePool *CCVKDevice::gpuFencePool() { return _gpuFencePools[_gpuDevice->curBackBufferIndex].get(); }
CCVKGPURecycleBin *CCVKDevice::gpuRecycleBin() { return _gpuRecycleBins[_gpuDevice->curBackBufferIndex].get(); }
CCVKGPUStagingBufferPool *CCVKDevice::gpuStagingBufferPool() { return _gpuStagingBufferPools[_gpuDevice->curBackBufferIndex].get(); }

void CCVKDevice::waitAllFences() {
    static ccstd::vector<VkFence> fences;
    fences.clear();

    for (auto &fencePool : _gpuFencePools) {
        fences.insert(fences.end(), fencePool->data(), fencePool->data() + fencePool->size());
    }

    if (!fences.empty()) {
        VK_CHECK(vkWaitForFences(_gpuDevice->vkDevice, utils::toUint(fences.size()), fences.data(), VK_TRUE, DEFAULT_TIMEOUT));

        for (auto &fencePool : _gpuFencePools) {
            fencePool->reset();
        }
    }
}

void CCVKDevice::updateBackBufferCount(uint32_t backBufferCount) {
    if (backBufferCount <= _gpuDevice->backBufferCount) return;
    for (uint32_t i = _gpuDevice->backBufferCount; i < backBufferCount; i++) {
        _gpuFencePools.push_back(std::make_unique<CCVKGPUFencePool>(_gpuDevice.get()));
        _gpuRecycleBins.push_back(std::make_unique<CCVKGPURecycleBin>(_gpuDevice.get()));
        _gpuStagingBufferPools.push_back(std::make_unique<CCVKGPUStagingBufferPool>(_gpuDevice.get()));
    }
    _gpuBufferHub->updateBackBufferCount(backBufferCount);
    _gpuDescriptorSetHub->updateBackBufferCount(backBufferCount);
    _gpuDevice->backBufferCount = backBufferCount;
}

void CCVKDevice::initDeviceFeature() {
    _features[toNumber(Feature::ELEMENT_INDEX_UINT)] = true;
    _features[toNumber(Feature::INSTANCED_ARRAYS)] = true;
    _features[toNumber(Feature::MULTIPLE_RENDER_TARGETS)] = true;
    _features[toNumber(Feature::BLEND_MINMAX)] = true;
    _features[toNumber(Feature::COMPUTE_SHADER)] = true;
    _features[toNumber(Feature::INPUT_ATTACHMENT_BENEFIT)] = true;
    _features[toNumber(Feature::SUBPASS_COLOR_INPUT)] = true;
    _features[toNumber(Feature::SUBPASS_DEPTH_STENCIL_INPUT)] = true;
    _features[toNumber(Feature::RASTERIZATION_ORDER_NOCOHERENT)] = true;
    _features[toNumber(Feature::MULTI_SAMPLE_RESOLVE_DEPTH_STENCIL)] = checkExtension("VK_KHR_depth_stencil_resolve");

    _gpuContext->debugReport = _gpuContext->checkExtension(VK_EXT_DEBUG_REPORT_EXTENSION_NAME) &&
        checkExtension(VK_EXT_DEBUG_MARKER_EXTENSION_NAME) &&
        (vkCmdDebugMarkerBeginEXT != nullptr) &&
        (vkCmdDebugMarkerInsertEXT != nullptr) &&
        (vkCmdDebugMarkerEndEXT != nullptr);
    _gpuContext->debugUtils = _gpuContext->checkExtension(VK_EXT_DEBUG_UTILS_EXTENSION_NAME) &&
        (vkCmdBeginDebugUtilsLabelEXT != nullptr) &&
        (vkCmdInsertDebugUtilsLabelEXT != nullptr) &&
        (vkCmdEndDebugUtilsLabelEXT != nullptr);
}

void CCVKDevice::initFormatFeature() {
    const auto formatLen = static_cast<size_t>(Format::COUNT);
    VkFormatProperties properties = {};
    VkFormat format = {};
    VkFormatFeatureFlags formatFeature = {};
    for (uint32_t i = toNumber(Format::R8); i < formatLen; ++i) {
        if (static_cast<Format>(i) == Format::ETC_RGB8) continue;
        format = mapVkFormat(static_cast<Format>(i), _gpuDevice.get());
        vkGetPhysicalDeviceFormatProperties(_gpuContext->physicalDevice, format, &properties);

        // render buffer support
        formatFeature = VK_FORMAT_FEATURE_COLOR_ATTACHMENT_BIT | VK_FORMAT_FEATURE_DEPTH_STENCIL_ATTACHMENT_BIT;
        if (properties.optimalTilingFeatures & formatFeature) {
            _formatFeatures[i] |= FormatFeature::RENDER_TARGET;
        }
        // texture storage support
        formatFeature = VK_FORMAT_FEATURE_STORAGE_IMAGE_BIT;
        if (properties.optimalTilingFeatures & formatFeature) {
            _formatFeatures[i] |= FormatFeature::STORAGE_TEXTURE;
        }
        // sampled render target support
        formatFeature = VK_FORMAT_FEATURE_SAMPLED_IMAGE_BIT;
        if (properties.optimalTilingFeatures & formatFeature) {
            _formatFeatures[i] |= FormatFeature::SAMPLED_TEXTURE;
        }
        // linear filter support
        formatFeature = VK_FORMAT_FEATURE_SAMPLED_IMAGE_FILTER_LINEAR_BIT;
        if (properties.optimalTilingFeatures & formatFeature) {
            _formatFeatures[i] |= FormatFeature::LINEAR_FILTER;
        }
        // vertex attribute support
        formatFeature = VK_FORMAT_FEATURE_VERTEX_BUFFER_BIT;
        if (properties.bufferFeatures & formatFeature) {
            _formatFeatures[i] |= FormatFeature::VERTEX_ATTRIBUTE;
        }
        // shading reate support
        formatFeature = VK_FORMAT_FEATURE_FRAGMENT_SHADING_RATE_ATTACHMENT_BIT_KHR;
        if (properties.optimalTilingFeatures & formatFeature) {
            _formatFeatures[i] |= FormatFeature ::SHADING_RATE;
        }
    }
}

void CCVKDevice::initExtensionCapability() {
    _caps.supportVariableRateShading = checkExtension(VK_KHR_FRAGMENT_SHADING_RATE_EXTENSION_NAME);
    _caps.supportVariableRateShading &= _gpuContext->physicalDeviceFragmentShadingRateFeatures.pipelineFragmentShadingRate &&
                                        _gpuContext->physicalDeviceFragmentShadingRateFeatures.attachmentFragmentShadingRate;
    _caps.supportVariableRateShading &= hasFlag(_formatFeatures[static_cast<uint32_t>(Format::R8UI)], FormatFeatureBit::SHADING_RATE);

    _caps.supportSubPassShading = checkExtension(VK_HUAWEI_SUBPASS_SHADING_EXTENSION_NAME);
}

CommandBuffer *CCVKDevice::createCommandBuffer(const CommandBufferInfo & /*info*/, bool /*hasAgent*/) {
    return ccnew CCVKCommandBuffer;
}

Queue *CCVKDevice::createQueue() {
    return ccnew CCVKQueue;
}

QueryPool *CCVKDevice::createQueryPool() {
    return ccnew CCVKQueryPool;
}

Swapchain *CCVKDevice::createSwapchain() {
    if (_xr) {
        _xr->createXRSwapchains();
    }
    return ccnew CCVKSwapchain;
}

Buffer *CCVKDevice::createBuffer() {
    return ccnew CCVKBuffer;
}

Texture *CCVKDevice::createTexture() {
    return ccnew CCVKTexture;
}

Shader *CCVKDevice::createShader() {
    return ccnew CCVKShader;
}

InputAssembler *CCVKDevice::createInputAssembler() {
    return ccnew CCVKInputAssembler;
}

RenderPass *CCVKDevice::createRenderPass() {
    return ccnew CCVKRenderPass;
}

Framebuffer *CCVKDevice::createFramebuffer() {
    return ccnew CCVKFramebuffer;
}

DescriptorSet *CCVKDevice::createDescriptorSet() {
    return ccnew CCVKDescriptorSet;
}

DescriptorSetLayout *CCVKDevice::createDescriptorSetLayout() {
    return ccnew CCVKDescriptorSetLayout;
}

PipelineLayout *CCVKDevice::createPipelineLayout() {
    return ccnew CCVKPipelineLayout;
}

PipelineState *CCVKDevice::createPipelineState() {
    return ccnew CCVKPipelineState;
}


AccelerationStructure *CCVKDevice::createAccelerationStructure() {
    return ccnew CCVKAccelerationStructure;
}

Sampler *CCVKDevice::createSampler(const SamplerInfo &info) {
    return ccnew CCVKSampler(info);
}

GeneralBarrier *CCVKDevice::createGeneralBarrier(const GeneralBarrierInfo &info) {
    return ccnew CCVKGeneralBarrier(info);
}

TextureBarrier *CCVKDevice::createTextureBarrier(const TextureBarrierInfo &info) {
    return ccnew CCVKTextureBarrier(info);
}

BufferBarrier *CCVKDevice::createBufferBarrier(const BufferBarrierInfo &info) {
    return ccnew CCVKBufferBarrier(info);
}

void CCVKDevice::copyBuffersToTexture(const uint8_t *const *buffers, Texture *dst, const BufferTextureCopy *regions, uint32_t count) {
    CC_PROFILE(CCVKDeviceCopyBuffersToTexture);
    gpuTransportHub()->checkIn([this, buffers, dst, regions, count](CCVKGPUCommandBuffer *gpuCommandBuffer) {
        cmdFuncCCVKCopyBuffersToTexture(this, buffers, static_cast<CCVKTexture *>(dst)->gpuTexture(), regions, count, gpuCommandBuffer);
    });
}

void CCVKDevice::copyTextureToBuffers(Texture *srcTexture, uint8_t *const *buffers, const BufferTextureCopy *regions, uint32_t count) {
    CC_PROFILE(CCVKDeviceCopyTextureToBuffers);
    uint32_t totalSize = 0U;
    Format format = srcTexture->getFormat();
    ccstd::vector<std::pair<uint32_t, uint32_t>> regionOffsetSizes(count);
    for (size_t i = 0U; i < count; ++i) {
        const BufferTextureCopy &region = regions[i];
        uint32_t w = region.buffStride > 0 ? region.buffStride : region.texExtent.width;
        uint32_t h = region.buffTexHeight > 0 ? region.buffTexHeight : region.texExtent.height;
        uint32_t regionSize = formatSize(format, w, h, region.texExtent.depth);
        regionOffsetSizes[i] = {totalSize, regionSize};
        totalSize += regionSize;
    }

    uint32_t texelSize = GFX_FORMAT_INFOS[toNumber(format)].size;
    IntrusivePtr<CCVKGPUBufferView> stagingBuffer = gpuStagingBufferPool()->alloc(totalSize, texelSize);

    // make sure the src texture is up-to-date
    waitAllFences();

    _gpuTransportHub->checkIn(
        [&](CCVKGPUCommandBuffer *cmdBuffer) {
            cmdFuncCCVKCopyTextureToBuffers(this, static_cast<const CCVKTexture *>(srcTexture)->gpuTexture(), stagingBuffer, regions, count, cmdBuffer);
        },
        true);

    for (uint32_t i = 0; i < count; ++i) {
        uint32_t regionOffset = 0;
        uint32_t regionSize = 0;
        std::tie(regionOffset, regionSize) = regionOffsetSizes[i];
        memcpy(buffers[i], stagingBuffer->mappedData() + regionOffset, regionSize);
    }
}

void CCVKDevice::getQueryPoolResults(QueryPool *queryPool) {
    CC_PROFILE(CCVKDeviceGetQueryPoolResults);
    auto *vkQueryPool = static_cast<CCVKQueryPool *>(queryPool);
    auto queryCount = static_cast<uint32_t>(vkQueryPool->_ids.size());
    CC_ASSERT(queryCount <= vkQueryPool->getMaxQueryObjects());

    const bool bWait = queryPool->getForceWait();
    uint32_t width = bWait ? 1U : 2U;
    uint64_t stride = sizeof(uint64_t) * width;
    VkQueryResultFlagBits flag = bWait ? VK_QUERY_RESULT_WAIT_BIT : VK_QUERY_RESULT_WITH_AVAILABILITY_BIT;
    ccstd::vector<uint64_t> results(queryCount * width, 0);

    if (queryCount > 0U) {
        VkResult result = vkGetQueryPoolResults(
            gpuDevice()->vkDevice,
            vkQueryPool->_gpuQueryPool->vkPool,
            0,
            queryCount,
            static_cast<size_t>(queryCount * stride),
            results.data(),
            stride,
            VK_QUERY_RESULT_64_BIT | flag);
        CC_ASSERT(result == VK_SUCCESS || result == VK_NOT_READY);
    }

    ccstd::unordered_map<uint32_t, uint64_t> mapResults;
    for (auto queryId = 0U; queryId < queryCount; queryId++) {
        uint32_t offset = queryId * width;
        if (bWait || results[offset + 1] > 0) {
            uint32_t id = vkQueryPool->_ids[queryId];
            auto iter = mapResults.find(id);
            if (iter != mapResults.end()) {
                iter->second += results[offset];
            } else {
                mapResults[id] = results[offset];
            }
        }
    }

    {
        std::lock_guard<std::mutex> lock(vkQueryPool->_mutex);
        vkQueryPool->_results = std::move(mapResults);
    }
}

//////////////////////////// Function Fallbacks /////////////////////////////////////////

static VkResult VKAPI_PTR vkCreateRenderPass2KHRFallback(
    VkDevice device,
    const VkRenderPassCreateInfo2 *pCreateInfo,
    const VkAllocationCallbacks *pAllocator,
    VkRenderPass *pRenderPass) {
    static ccstd::vector<VkAttachmentDescription> attachmentDescriptions;
    static ccstd::vector<VkSubpassDescription> subpassDescriptions;
    static ccstd::vector<VkAttachmentReference> attachmentReferences;
    static ccstd::vector<VkSubpassDependency> subpassDependencies;
    static ccstd::vector<size_t> inputs;
    static ccstd::vector<size_t> colors;
    static ccstd::vector<size_t> resolves;
    static ccstd::vector<size_t> depths;

    attachmentDescriptions.resize(pCreateInfo->attachmentCount);
    for (uint32_t i = 0; i < pCreateInfo->attachmentCount; ++i) {
        VkAttachmentDescription &desc{attachmentDescriptions[i]};
        const VkAttachmentDescription2 &desc2{pCreateInfo->pAttachments[i]};
        desc.flags = desc2.flags;
        desc.format = desc2.format;
        desc.samples = desc2.samples;
        desc.loadOp = desc2.loadOp;
        desc.storeOp = desc2.storeOp;
        desc.stencilLoadOp = desc2.stencilLoadOp;
        desc.stencilStoreOp = desc2.stencilStoreOp;
        desc.initialLayout = desc2.initialLayout;
        desc.finalLayout = desc2.finalLayout;
    }

    subpassDescriptions.resize(pCreateInfo->subpassCount);
    attachmentReferences.clear();
    inputs.assign(pCreateInfo->subpassCount, std::numeric_limits<size_t>::max());
    colors.assign(pCreateInfo->subpassCount, std::numeric_limits<size_t>::max());
    resolves.assign(pCreateInfo->subpassCount, std::numeric_limits<size_t>::max());
    depths.assign(pCreateInfo->subpassCount, std::numeric_limits<size_t>::max());
    for (uint32_t i = 0; i < pCreateInfo->subpassCount; ++i) {
        const VkSubpassDescription2 &desc2{pCreateInfo->pSubpasses[i]};
        if (desc2.inputAttachmentCount) {
            inputs[i] = attachmentReferences.size();
            for (uint32_t j = 0; j < desc2.inputAttachmentCount; ++j) {
                attachmentReferences.push_back({desc2.pInputAttachments[j].attachment, desc2.pInputAttachments[j].layout});
            }
        }
        if (desc2.colorAttachmentCount) {
            colors[i] = attachmentReferences.size();
            for (uint32_t j = 0; j < desc2.colorAttachmentCount; ++j) {
                attachmentReferences.push_back({desc2.pColorAttachments[j].attachment, desc2.pColorAttachments[j].layout});
            }
            if (desc2.pResolveAttachments) {
                resolves[i] = attachmentReferences.size();
                for (uint32_t j = 0; j < desc2.colorAttachmentCount; ++j) {
                    attachmentReferences.push_back({desc2.pResolveAttachments[j].attachment, desc2.pResolveAttachments[j].layout});
                }
            }
        }
        if (desc2.pDepthStencilAttachment) {
            depths[i] = attachmentReferences.size();
            attachmentReferences.push_back({desc2.pDepthStencilAttachment->attachment, desc2.pDepthStencilAttachment->layout});
        }
    }
    for (uint32_t i = 0; i < pCreateInfo->subpassCount; ++i) {
        VkSubpassDescription &desc{subpassDescriptions[i]};
        const VkSubpassDescription2 &desc2{pCreateInfo->pSubpasses[i]};
        desc.flags = desc2.flags;
        desc.pipelineBindPoint = desc2.pipelineBindPoint;
        desc.inputAttachmentCount = desc2.inputAttachmentCount;
        desc.pInputAttachments = inputs[i] > attachmentReferences.size() ? nullptr : &attachmentReferences[inputs[i]];
        desc.colorAttachmentCount = desc2.colorAttachmentCount;
        desc.pColorAttachments = colors[i] > attachmentReferences.size() ? nullptr : &attachmentReferences[colors[i]];
        desc.pResolveAttachments = resolves[i] > attachmentReferences.size() ? nullptr : &attachmentReferences[resolves[i]];
        desc.pDepthStencilAttachment = depths[i] > attachmentReferences.size() ? nullptr : &attachmentReferences[depths[i]];
        desc.preserveAttachmentCount = desc2.preserveAttachmentCount;
        desc.pPreserveAttachments = desc2.pPreserveAttachments;
    }

    subpassDependencies.resize(pCreateInfo->dependencyCount);
    for (uint32_t i = 0; i < pCreateInfo->dependencyCount; ++i) {
        VkSubpassDependency &desc{subpassDependencies[i]};
        const VkSubpassDependency2 &desc2{pCreateInfo->pDependencies[i]};
        desc.srcSubpass = desc2.srcSubpass;
        desc.dstSubpass = desc2.dstSubpass;
        desc.srcStageMask = desc2.srcStageMask;
        desc.dstStageMask = desc2.dstStageMask;
        desc.srcAccessMask = desc2.srcAccessMask;
        desc.dstAccessMask = desc2.dstAccessMask;
        desc.dependencyFlags = desc2.dependencyFlags;
    }

    VkRenderPassCreateInfo renderPassCreateInfo{VK_STRUCTURE_TYPE_RENDER_PASS_CREATE_INFO};
    renderPassCreateInfo.attachmentCount = utils::toUint(attachmentDescriptions.size());
    renderPassCreateInfo.pAttachments = attachmentDescriptions.data();
    renderPassCreateInfo.subpassCount = utils::toUint(subpassDescriptions.size());
    renderPassCreateInfo.pSubpasses = subpassDescriptions.data();
    renderPassCreateInfo.dependencyCount = utils::toUint(subpassDependencies.size());
    renderPassCreateInfo.pDependencies = subpassDependencies.data();

    return vkCreateRenderPass(device, &renderPassCreateInfo, pAllocator, pRenderPass);
}

SampleCount CCVKDevice::getMaxSampleCount(Format format, TextureUsage usage, TextureFlags flags) const {
    auto vkFormat = mapVkFormat(format, gpuDevice());
    auto usages = mapVkImageUsageFlags(usage, flags);

    VkImageFormatProperties imageFormatProperties = {};
    vkGetPhysicalDeviceImageFormatProperties(_gpuContext->physicalDevice, vkFormat, VK_IMAGE_TYPE_2D,
        VK_IMAGE_TILING_OPTIMAL, usages, 0, &imageFormatProperties);

    if (imageFormatProperties.sampleCounts & VK_SAMPLE_COUNT_64_BIT) return SampleCount::X64;
    if (imageFormatProperties.sampleCounts & VK_SAMPLE_COUNT_32_BIT) return SampleCount::X32;
    if (imageFormatProperties.sampleCounts & VK_SAMPLE_COUNT_16_BIT) return SampleCount::X16;
    if (imageFormatProperties.sampleCounts & VK_SAMPLE_COUNT_8_BIT)  return SampleCount::X8;
    if (imageFormatProperties.sampleCounts & VK_SAMPLE_COUNT_4_BIT)  return SampleCount::X4;
    if (imageFormatProperties.sampleCounts & VK_SAMPLE_COUNT_2_BIT)  return SampleCount::X2;

    return SampleCount::X1;
}

} // namespace gfx
} // namespace cc
