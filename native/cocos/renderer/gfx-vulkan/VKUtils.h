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

#define WIN32_LEAN_AND_MEAN

#include "base/Macros.h"
#include "base/StringUtil.h"
#include "base/Utils.h"
#include "gfx-base/GFXDef.h"

#include "vk_mem_alloc.h"
#include "volk.h"

#include "thsvs_simpler_vulkan_synchronization.h"

#define DEFAULT_TIMEOUT 10000000000 // 10 second

#define BARRIER_DEDUCTION_LEVEL_NONE  0
#define BARRIER_DEDUCTION_LEVEL_BASIC 1
#define BARRIER_DEDUCTION_LEVEL_FULL  2

#ifndef BARRIER_DEDUCTION_LEVEL
    #define BARRIER_DEDUCTION_LEVEL BARRIER_DEDUCTION_LEVEL_BASIC
#endif

namespace cc {
namespace gfx {

class CCVKGPUDevice;

VkQueryType mapVkQueryType(QueryType type);
VkFormat mapVkFormat(Format format, const CCVKGPUDevice *gpuDevice);
VkAttachmentLoadOp mapVkLoadOp(LoadOp loadOp);
VkAttachmentStoreOp mapVkStoreOp(StoreOp storeOp);
VkBufferUsageFlagBits mapVkBufferUsageFlagBits(BufferUsage usage);
VkImageType mapVkImageType(TextureType type);
VkFormatFeatureFlags mapVkFormatFeatureFlags(TextureUsage usage);
VkImageUsageFlags mapVkImageUsageFlags(TextureUsage usage, TextureFlags textureFlags);
VkImageAspectFlags mapVkImageAspectFlags(Format format);
VkImageCreateFlags mapVkImageCreateFlags(TextureType type);
VkImageViewType mapVkImageViewType(TextureType viewType);
VkCommandBufferLevel mapVkCommandBufferLevel(CommandBufferType type);
VkDescriptorType mapVkDescriptorType(DescriptorType type);
VkColorComponentFlags mapVkColorComponentFlags(ColorMask colorMask);
VkShaderStageFlagBits mapVkShaderStageFlagBits(ShaderStageFlagBit stage);
VkShaderStageFlags mapVkShaderStageFlags(ShaderStageFlagBit stages);
VkRayTracingShaderGroupTypeKHR mapVkRayTracingShaderGroupType(RayTracingShaderGroupType type);
SurfaceTransform mapSurfaceTransform(VkSurfaceTransformFlagBitsKHR transform);
VkGeometryFlagsKHR mapVkGeometryFlags(ASGeometryFlagBit flags);
VkBuildAccelerationStructureFlagsKHR mapVkBuildAccelerationStructureFlags(ASBuildFlags flags);
ccstd::string mapVendorName(uint32_t vendorID);
VkTransformMatrixKHR mapVkTransformMatrix(const Mat4& matrix);
VkAccelerationStructureGeometryTrianglesDataKHR mapVkASGeomTrianglesData(const ASTriangleMesh &mesh, const CCVKGPUDevice *gpuDevice);
VkAccelerationStructureInstanceKHR mapVkASInstance(const CCVKGPUDevice *gpuDevice, const ASInstance &instance);

void fullPipelineBarrier(VkCommandBuffer cmdBuff);
const ThsvsAccessType *getAccessType(AccessFlagBit flag);
ThsvsImageLayout getAccessLayout(AccessFlags flag);
void getAccessTypes(AccessFlags flag, ccstd::vector<ThsvsAccessType> &v);
VkDeviceSize roundUp(VkDeviceSize numToRound, uint32_t multiple);
bool isMultipleOf(VkDeviceSize numToCheck, uint32_t multiple);
bool isLayerSupported(const char *required, const ccstd::vector<VkLayerProperties> &available);
bool isExtensionSupported(const char *required, const ccstd::vector<VkExtensionProperties> &available);
bool isFormatSupported(VkPhysicalDevice device, VkFormat format);

extern const VkSurfaceTransformFlagsKHR TRANSFORMS_THAT_REQUIRE_FLIPPING;
extern const VkPrimitiveTopology VK_PRIMITIVE_MODES[];
extern const VkCullModeFlags VK_CULL_MODES[];
extern const VkPolygonMode VK_POLYGON_MODES[];
extern const VkCompareOp VK_CMP_FUNCS[];
extern const VkStencilOp VK_STENCIL_OPS[];
extern const VkBlendOp VK_BLEND_OPS[];
extern const VkBlendFactor VK_BLEND_FACTORS[];
extern const VkFilter VK_FILTERS[];
extern const VkSamplerMipmapMode VK_SAMPLER_MIPMAP_MODES[];
extern const VkSamplerAddressMode VK_SAMPLER_ADDRESS_MODES[];
extern const VkPipelineBindPoint VK_PIPELINE_BIND_POINTS[];
extern const VkResolveModeFlagBits VK_RESOLVE_MODES[];
extern const VkImageLayout VK_IMAGE_LAYOUTS[];
extern const VkStencilFaceFlags VK_STENCIL_FACE_FLAGS[];
extern const VkAccessFlags FULL_ACCESS_FLAGS;

} // namespace gfx
} // namespace cc
