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

#include "VKUtils.h"

#include "VKBuffer.h"
#include "VKAccelerationStructure.h"

#include "VKGPUObjects.h"
#include "gfx-base/GFXBuffer.h"
#include "vulkan/vulkan_core.h"

namespace cc {
namespace gfx {

VkQueryType mapVkQueryType(QueryType type) {
    switch (type) {
        case QueryType::OCCLUSION: return VK_QUERY_TYPE_OCCLUSION;
        case QueryType::PIPELINE_STATISTICS: return VK_QUERY_TYPE_PIPELINE_STATISTICS;
        case QueryType::TIMESTAMP: return VK_QUERY_TYPE_TIMESTAMP;
        case QueryType::ACCELERATION_STRUCTURE_COMPACTED_SIZE: return VK_QUERY_TYPE_ACCELERATION_STRUCTURE_COMPACTED_SIZE_KHR;
        case QueryType::ACCELERATION_STRUCTURE_SERIALIZATION_SIZE: return VK_QUERY_TYPE_ACCELERATION_STRUCTURE_SERIALIZATION_SIZE_KHR;
        default: {
            CC_ABORT();
            return VK_QUERY_TYPE_OCCLUSION;
        }
    }
}

VkFormat mapVkFormat(Format format, const CCVKGPUDevice *gpuDevice) {
    switch (format) {
        case Format::R8: return VK_FORMAT_R8_UNORM;
        case Format::R8SN: return VK_FORMAT_R8_SNORM;
        case Format::R8UI: return VK_FORMAT_R8_UINT;
        case Format::R8I: return VK_FORMAT_R8_SINT;
        case Format::RG8: return VK_FORMAT_R8G8_UNORM;
        case Format::RG8SN: return VK_FORMAT_R8G8_SNORM;
        case Format::RG8UI: return VK_FORMAT_R8G8_UINT;
        case Format::RG8I: return VK_FORMAT_R8G8_SINT;
        case Format::RGB8: return VK_FORMAT_R8G8B8_UNORM;
        case Format::SRGB8: return VK_FORMAT_R8G8B8_SRGB;
        case Format::RGB8SN: return VK_FORMAT_R8G8B8_SNORM;
        case Format::RGB8UI: return VK_FORMAT_R8G8B8_UINT;
        case Format::RGB8I: return VK_FORMAT_R8G8B8_SINT;
        case Format::RGBA8: return VK_FORMAT_R8G8B8A8_UNORM;
        case Format::BGRA8: return VK_FORMAT_B8G8R8A8_UNORM;
        case Format::SRGB8_A8: return VK_FORMAT_R8G8B8A8_SRGB;
        case Format::RGBA8SN: return VK_FORMAT_R8G8B8A8_SNORM;
        case Format::RGBA8UI: return VK_FORMAT_R8G8B8A8_UINT;
        case Format::RGBA8I: return VK_FORMAT_R8G8B8A8_SINT;
        case Format::R16I: return VK_FORMAT_R16_SINT;
        case Format::R16UI: return VK_FORMAT_R16_UINT;
        case Format::R16F: return VK_FORMAT_R16_SFLOAT;
        case Format::RG16I: return VK_FORMAT_R16G16_SINT;
        case Format::RG16UI: return VK_FORMAT_R16G16_UINT;
        case Format::RG16F: return VK_FORMAT_R16G16_SFLOAT;
        case Format::RGB16I: return VK_FORMAT_R16G16B16_SINT;
        case Format::RGB16UI: return VK_FORMAT_R16G16B16_UINT;
        case Format::RGB16F: return VK_FORMAT_R16G16B16_SFLOAT;
        case Format::RGBA16I: return VK_FORMAT_R16G16B16A16_SINT;
        case Format::RGBA16UI: return VK_FORMAT_R16G16B16A16_UINT;
        case Format::RGBA16F: return VK_FORMAT_R16G16B16A16_SFLOAT;
        case Format::R32I: return VK_FORMAT_R32_SINT;
        case Format::R32UI: return VK_FORMAT_R32_UINT;
        case Format::R32F: return VK_FORMAT_R32_SFLOAT;
        case Format::RG32I: return VK_FORMAT_R32G32_SINT;
        case Format::RG32UI: return VK_FORMAT_R32G32_UINT;
        case Format::RG32F: return VK_FORMAT_R32G32_SFLOAT;
        case Format::RGB32I: return VK_FORMAT_R32G32B32_SINT;
        case Format::RGB32UI: return VK_FORMAT_R32G32B32_UINT;
        case Format::RGB32F: return VK_FORMAT_R32G32B32_SFLOAT;
        case Format::RGBA32I: return VK_FORMAT_R32G32B32A32_SINT;
        case Format::RGBA32UI: return VK_FORMAT_R32G32B32A32_UINT;
        case Format::RGBA32F: return VK_FORMAT_R32G32B32A32_SFLOAT;

        case Format::R5G6B5: return VK_FORMAT_R5G6B5_UNORM_PACK16;
        case Format::R11G11B10F: return VK_FORMAT_B10G11R11_UFLOAT_PACK32;
        case Format::RGB5A1: return VK_FORMAT_R5G5B5A1_UNORM_PACK16;
        case Format::RGBA4: return VK_FORMAT_R4G4B4A4_UNORM_PACK16;
        case Format::RGB10A2: return VK_FORMAT_A2B10G10R10_UNORM_PACK32;
        case Format::RGB10A2UI: return VK_FORMAT_A2B10G10R10_UINT_PACK32;
        case Format::RGB9E5: return VK_FORMAT_E5B9G9R9_UFLOAT_PACK32;
        case Format::DEPTH: return gpuDevice->depthFormat;
        case Format::DEPTH_STENCIL: return gpuDevice->depthStencilFormat;

        case Format::BC1: return VK_FORMAT_BC1_RGB_UNORM_BLOCK;
        case Format::BC1_ALPHA: return VK_FORMAT_BC1_RGBA_UNORM_BLOCK;
        case Format::BC1_SRGB: return VK_FORMAT_BC1_RGB_SRGB_BLOCK;
        case Format::BC1_SRGB_ALPHA: return VK_FORMAT_BC1_RGBA_SRGB_BLOCK;
        case Format::BC2: return VK_FORMAT_BC2_UNORM_BLOCK;
        case Format::BC2_SRGB: return VK_FORMAT_BC2_SRGB_BLOCK;
        case Format::BC3: return VK_FORMAT_BC3_UNORM_BLOCK;
        case Format::BC3_SRGB: return VK_FORMAT_BC3_SRGB_BLOCK;
        case Format::BC4: return VK_FORMAT_BC4_UNORM_BLOCK;
        case Format::BC4_SNORM: return VK_FORMAT_BC4_SNORM_BLOCK;
        case Format::BC5: return VK_FORMAT_BC5_UNORM_BLOCK;
        case Format::BC5_SNORM: return VK_FORMAT_BC5_SNORM_BLOCK;
        case Format::BC6H_UF16: return VK_FORMAT_BC6H_UFLOAT_BLOCK;
        case Format::BC6H_SF16: return VK_FORMAT_BC6H_SFLOAT_BLOCK;
        case Format::BC7: return VK_FORMAT_BC7_UNORM_BLOCK;
        case Format::BC7_SRGB: return VK_FORMAT_BC7_SRGB_BLOCK;

        case Format::ETC2_RGB8: return VK_FORMAT_ETC2_R8G8B8_UNORM_BLOCK;
        case Format::ETC2_SRGB8: return VK_FORMAT_ETC2_R8G8B8_SRGB_BLOCK;
        case Format::ETC2_RGB8_A1: return VK_FORMAT_ETC2_R8G8B8A1_UNORM_BLOCK;
        case Format::ETC2_SRGB8_A1: return VK_FORMAT_ETC2_R8G8B8A1_SRGB_BLOCK;
        case Format::ETC2_RGBA8: return VK_FORMAT_ETC2_R8G8B8A8_UNORM_BLOCK;
        case Format::ETC2_SRGB8_A8: return VK_FORMAT_ETC2_R8G8B8A8_SRGB_BLOCK;
        case Format::EAC_R11: return VK_FORMAT_EAC_R11_UNORM_BLOCK;
        case Format::EAC_R11SN: return VK_FORMAT_EAC_R11_SNORM_BLOCK;
        case Format::EAC_RG11: return VK_FORMAT_EAC_R11G11_UNORM_BLOCK;
        case Format::EAC_RG11SN: return VK_FORMAT_EAC_R11G11_SNORM_BLOCK;

        case Format::PVRTC_RGB2:
        case Format::PVRTC_RGBA2: return VK_FORMAT_PVRTC1_2BPP_UNORM_BLOCK_IMG;
        case Format::PVRTC_RGB4:
        case Format::PVRTC_RGBA4: return VK_FORMAT_PVRTC1_4BPP_UNORM_BLOCK_IMG;
        case Format::PVRTC2_2BPP: return VK_FORMAT_PVRTC2_2BPP_UNORM_BLOCK_IMG;
        case Format::PVRTC2_4BPP: return VK_FORMAT_PVRTC2_4BPP_UNORM_BLOCK_IMG;

        case Format::ASTC_RGBA_4X4: return VK_FORMAT_ASTC_4x4_UNORM_BLOCK;
        case Format::ASTC_RGBA_5X4: return VK_FORMAT_ASTC_5x4_UNORM_BLOCK;
        case Format::ASTC_RGBA_5X5: return VK_FORMAT_ASTC_5x5_UNORM_BLOCK;
        case Format::ASTC_RGBA_6X5: return VK_FORMAT_ASTC_6x5_UNORM_BLOCK;
        case Format::ASTC_RGBA_6X6: return VK_FORMAT_ASTC_6x6_UNORM_BLOCK;
        case Format::ASTC_RGBA_8X5: return VK_FORMAT_ASTC_8x5_UNORM_BLOCK;
        case Format::ASTC_RGBA_8X6: return VK_FORMAT_ASTC_8x6_UNORM_BLOCK;
        case Format::ASTC_RGBA_8X8: return VK_FORMAT_ASTC_8x8_UNORM_BLOCK;
        case Format::ASTC_RGBA_10X5: return VK_FORMAT_ASTC_10x5_UNORM_BLOCK;
        case Format::ASTC_RGBA_10X6: return VK_FORMAT_ASTC_10x6_UNORM_BLOCK;
        case Format::ASTC_RGBA_10X8: return VK_FORMAT_ASTC_10x8_UNORM_BLOCK;
        case Format::ASTC_RGBA_10X10: return VK_FORMAT_ASTC_10x10_UNORM_BLOCK;
        case Format::ASTC_RGBA_12X10: return VK_FORMAT_ASTC_12x10_UNORM_BLOCK;
        case Format::ASTC_RGBA_12X12: return VK_FORMAT_ASTC_12x12_UNORM_BLOCK;

        case Format::ASTC_SRGBA_4X4: return VK_FORMAT_ASTC_4x4_SRGB_BLOCK;
        case Format::ASTC_SRGBA_5X4: return VK_FORMAT_ASTC_5x4_SRGB_BLOCK;
        case Format::ASTC_SRGBA_5X5: return VK_FORMAT_ASTC_5x5_SRGB_BLOCK;
        case Format::ASTC_SRGBA_6X5: return VK_FORMAT_ASTC_6x5_SRGB_BLOCK;
        case Format::ASTC_SRGBA_6X6: return VK_FORMAT_ASTC_6x6_SRGB_BLOCK;
        case Format::ASTC_SRGBA_8X5: return VK_FORMAT_ASTC_8x5_SRGB_BLOCK;
        case Format::ASTC_SRGBA_8X6: return VK_FORMAT_ASTC_8x6_SRGB_BLOCK;
        case Format::ASTC_SRGBA_8X8: return VK_FORMAT_ASTC_8x8_SRGB_BLOCK;
        case Format::ASTC_SRGBA_10X5: return VK_FORMAT_ASTC_10x5_SRGB_BLOCK;
        case Format::ASTC_SRGBA_10X6: return VK_FORMAT_ASTC_10x6_SRGB_BLOCK;
        case Format::ASTC_SRGBA_10X8: return VK_FORMAT_ASTC_10x8_SRGB_BLOCK;
        case Format::ASTC_SRGBA_10X10: return VK_FORMAT_ASTC_10x10_SRGB_BLOCK;
        case Format::ASTC_SRGBA_12X10: return VK_FORMAT_ASTC_12x10_SRGB_BLOCK;
        case Format::ASTC_SRGBA_12X12: return VK_FORMAT_ASTC_12x12_SRGB_BLOCK;

        default: {
            CC_ABORT();
            return VK_FORMAT_B8G8R8A8_UNORM;
        }
    }
}

VkAttachmentLoadOp mapVkLoadOp(LoadOp loadOp) {
    switch (loadOp) {
        case LoadOp::CLEAR: return VK_ATTACHMENT_LOAD_OP_CLEAR;
        case LoadOp::LOAD: return VK_ATTACHMENT_LOAD_OP_LOAD;
        case LoadOp::DISCARD: return VK_ATTACHMENT_LOAD_OP_DONT_CARE;
        default: {
            CC_ABORT();
            return VK_ATTACHMENT_LOAD_OP_LOAD;
        }
    }
}

VkAttachmentStoreOp mapVkStoreOp(StoreOp storeOp) {
    switch (storeOp) {
        case StoreOp::STORE: return VK_ATTACHMENT_STORE_OP_STORE;
        case StoreOp::DISCARD: return VK_ATTACHMENT_STORE_OP_DONT_CARE;
        default: {
            CC_ABORT();
            return VK_ATTACHMENT_STORE_OP_STORE;
        }
    }
}

VkBufferUsageFlagBits mapVkBufferUsageFlagBits(BufferUsage usage) {
    uint32_t flags = 0U;
    if (hasFlag(usage, BufferUsage::TRANSFER_SRC)) flags |= VK_BUFFER_USAGE_TRANSFER_SRC_BIT;
    if (hasFlag(usage, BufferUsage::TRANSFER_DST)) flags |= VK_BUFFER_USAGE_TRANSFER_DST_BIT;
    if (hasFlag(usage, BufferUsage::INDEX)) flags |= VK_BUFFER_USAGE_INDEX_BUFFER_BIT;
    if (hasFlag(usage, BufferUsage::VERTEX)) flags |= VK_BUFFER_USAGE_VERTEX_BUFFER_BIT;
    if (hasFlag(usage, BufferUsage::UNIFORM)) flags |= VK_BUFFER_USAGE_UNIFORM_BUFFER_BIT;
    if (hasFlag(usage, BufferUsage::STORAGE)) flags |= VK_BUFFER_USAGE_STORAGE_BUFFER_BIT;
    if (hasFlag(usage, BufferUsage::INDIRECT)) flags |= VK_BUFFER_USAGE_INDIRECT_BUFFER_BIT;
    if (hasFlag(usage, BufferUsageBit::SHADER_DEVICE_ADDRESS)) flags |= VK_BUFFER_USAGE_SHADER_DEVICE_ADDRESS_BIT;
    if (hasFlag(usage, BufferUsageBit::ACCELERATION_STRUCTURE_BUILD_INPUT_READ_ONLY)) flags |= VK_BUFFER_USAGE_ACCELERATION_STRUCTURE_BUILD_INPUT_READ_ONLY_BIT_KHR;
    if (hasFlag(usage, BufferUsageBit::ACCELERATION_STRUCTURE_STORAGE)) flags |= VK_BUFFER_USAGE_ACCELERATION_STRUCTURE_STORAGE_BIT_KHR;
    return static_cast<VkBufferUsageFlagBits>(flags);
}

VkImageType mapVkImageType(TextureType type) {
    switch (type) {
        case TextureType::TEX1D:
        case TextureType::TEX1D_ARRAY: return VK_IMAGE_TYPE_1D;
        case TextureType::CUBE:
        case TextureType::TEX2D:
        case TextureType::TEX2D_ARRAY: return VK_IMAGE_TYPE_2D;
        case TextureType::TEX3D: return VK_IMAGE_TYPE_3D;
        default: {
            CC_ABORT();
            return VK_IMAGE_TYPE_2D;
        }
    }
}

VkFormatFeatureFlags mapVkFormatFeatureFlags(TextureUsage usage) {
    uint32_t flags = 0U;
    if (hasFlag(usage, TextureUsage::TRANSFER_SRC)) flags |= VK_FORMAT_FEATURE_TRANSFER_SRC_BIT;
    if (hasFlag(usage, TextureUsage::TRANSFER_DST)) flags |= VK_FORMAT_FEATURE_TRANSFER_DST_BIT;
    if (hasFlag(usage, TextureUsage::SAMPLED)) flags |= VK_FORMAT_FEATURE_SAMPLED_IMAGE_BIT;
    if (hasFlag(usage, TextureUsage::STORAGE)) flags |= VK_FORMAT_FEATURE_STORAGE_IMAGE_BIT;
    if (hasFlag(usage, TextureUsage::COLOR_ATTACHMENT)) flags |= VK_FORMAT_FEATURE_COLOR_ATTACHMENT_BIT;
    if (hasFlag(usage, TextureUsage::DEPTH_STENCIL_ATTACHMENT)) flags |= VK_FORMAT_FEATURE_DEPTH_STENCIL_ATTACHMENT_BIT;
    return static_cast<VkFormatFeatureFlags>(flags);
}

VkImageUsageFlags mapVkImageUsageFlags(TextureUsage usage, TextureFlags textureFlags) {
    VkImageUsageFlags flags = 0;
    if (hasFlag(usage, TextureUsage::TRANSFER_SRC)) flags |= VK_IMAGE_USAGE_TRANSFER_SRC_BIT;
    if (hasFlag(usage, TextureUsage::TRANSFER_DST)) flags |= VK_IMAGE_USAGE_TRANSFER_DST_BIT;
    if (hasFlag(usage, TextureUsage::SAMPLED)) flags |= VK_IMAGE_USAGE_SAMPLED_BIT;
    if (hasFlag(usage, TextureUsage::STORAGE)) flags |= VK_IMAGE_USAGE_STORAGE_BIT;
    if (hasFlag(usage, TextureUsage::COLOR_ATTACHMENT)) flags |= VK_IMAGE_USAGE_COLOR_ATTACHMENT_BIT;
    if (hasFlag(usage, TextureUsage::DEPTH_STENCIL_ATTACHMENT)) flags |= VK_IMAGE_USAGE_DEPTH_STENCIL_ATTACHMENT_BIT;
    if (hasFlag(usage, TextureUsage::INPUT_ATTACHMENT)) flags |= VK_IMAGE_USAGE_INPUT_ATTACHMENT_BIT;
    if (hasFlag(usage, TextureUsage::SHADING_RATE)) flags |= VK_IMAGE_USAGE_FRAGMENT_SHADING_RATE_ATTACHMENT_BIT_KHR;

    if (hasFlag(textureFlags, TextureFlags::GEN_MIPMAP)) {
        flags |= VK_IMAGE_USAGE_TRANSFER_SRC_BIT;
    }
    if (hasFlag(textureFlags, TextureFlags::LAZILY_ALLOCATED)) {
        flags |= VK_IMAGE_USAGE_TRANSIENT_ATTACHMENT_BIT;
    }
    return flags;
}

VkImageAspectFlags mapVkImageAspectFlags(Format format) {
    VkImageAspectFlags aspectMask = VK_IMAGE_ASPECT_COLOR_BIT;
    const FormatInfo &info = GFX_FORMAT_INFOS[toNumber(format)];
    if (info.hasDepth) aspectMask = VK_IMAGE_ASPECT_DEPTH_BIT;
    if (info.hasStencil) aspectMask |= VK_IMAGE_ASPECT_STENCIL_BIT;
    return aspectMask;
}

VkImageCreateFlags mapVkImageCreateFlags(TextureType type) {
    uint32_t res = 0U;
    switch (type) {
        case TextureType::CUBE: res |= VK_IMAGE_CREATE_CUBE_COMPATIBLE_BIT; break;
        default: break;
    }
    return static_cast<VkImageCreateFlags>(res);
}

VkImageViewType mapVkImageViewType(TextureType viewType) {
    switch (viewType) {
        case TextureType::TEX1D: return VK_IMAGE_VIEW_TYPE_1D;
        case TextureType::TEX1D_ARRAY: return VK_IMAGE_VIEW_TYPE_1D_ARRAY;
        case TextureType::TEX2D: return VK_IMAGE_VIEW_TYPE_2D;
        case TextureType::TEX2D_ARRAY: return VK_IMAGE_VIEW_TYPE_2D_ARRAY;
        case TextureType::TEX3D: return VK_IMAGE_VIEW_TYPE_3D;
        case TextureType::CUBE: return VK_IMAGE_VIEW_TYPE_CUBE;
        default: {
            CC_ABORT();
            return VK_IMAGE_VIEW_TYPE_2D;
        }
    }
}

VkCommandBufferLevel mapVkCommandBufferLevel(CommandBufferType type) {
    switch (type) {
        case CommandBufferType::PRIMARY: return VK_COMMAND_BUFFER_LEVEL_PRIMARY;
        case CommandBufferType::SECONDARY: return VK_COMMAND_BUFFER_LEVEL_SECONDARY;
        default: {
            CC_ABORT();
            return VK_COMMAND_BUFFER_LEVEL_SECONDARY;
        }
    }
}

VkDescriptorType mapVkDescriptorType(DescriptorType type) {
    switch (type) {
        case DescriptorType::DYNAMIC_UNIFORM_BUFFER: return VK_DESCRIPTOR_TYPE_UNIFORM_BUFFER_DYNAMIC;
        case DescriptorType::UNIFORM_BUFFER: return VK_DESCRIPTOR_TYPE_UNIFORM_BUFFER;
        case DescriptorType::DYNAMIC_STORAGE_BUFFER: return VK_DESCRIPTOR_TYPE_STORAGE_BUFFER_DYNAMIC;
        case DescriptorType::STORAGE_BUFFER: return VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
        case DescriptorType::SAMPLER_TEXTURE: return VK_DESCRIPTOR_TYPE_COMBINED_IMAGE_SAMPLER;
        case DescriptorType::SAMPLER: return VK_DESCRIPTOR_TYPE_SAMPLER;
        case DescriptorType::TEXTURE: return VK_DESCRIPTOR_TYPE_SAMPLED_IMAGE;
        case DescriptorType::STORAGE_IMAGE: return VK_DESCRIPTOR_TYPE_STORAGE_IMAGE;
        case DescriptorType::INPUT_ATTACHMENT: return VK_DESCRIPTOR_TYPE_INPUT_ATTACHMENT;
        case DescriptorType::ACCELERATION_STRUCTURE: return VK_DESCRIPTOR_TYPE_ACCELERATION_STRUCTURE_KHR;
        default: {
            CC_ABORT();
            return VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
        }
    }
}

VkColorComponentFlags mapVkColorComponentFlags(ColorMask colorMask) {
    uint32_t flags = 0U;
    if (hasFlag(colorMask, ColorMask::R)) flags |= VK_COLOR_COMPONENT_R_BIT;
    if (hasFlag(colorMask, ColorMask::G)) flags |= VK_COLOR_COMPONENT_G_BIT;
    if (hasFlag(colorMask, ColorMask::B)) flags |= VK_COLOR_COMPONENT_B_BIT;
    if (hasFlag(colorMask, ColorMask::A)) flags |= VK_COLOR_COMPONENT_A_BIT;
    return static_cast<VkColorComponentFlags>(flags);
}

VkShaderStageFlagBits mapVkShaderStageFlagBits(ShaderStageFlagBit stage) {
    switch (stage) {
        case ShaderStageFlagBit::VERTEX: return VK_SHADER_STAGE_VERTEX_BIT;
        case ShaderStageFlagBit::CONTROL: return VK_SHADER_STAGE_TESSELLATION_CONTROL_BIT;
        case ShaderStageFlagBit::EVALUATION: return VK_SHADER_STAGE_TESSELLATION_EVALUATION_BIT;
        case ShaderStageFlagBit::GEOMETRY: return VK_SHADER_STAGE_GEOMETRY_BIT;
        case ShaderStageFlagBit::FRAGMENT: return VK_SHADER_STAGE_FRAGMENT_BIT;
        case ShaderStageFlagBit::COMPUTE: return VK_SHADER_STAGE_COMPUTE_BIT;
        case ShaderStageFlagBit::RAYGEN: return VK_SHADER_STAGE_RAYGEN_BIT_KHR;
        case ShaderStageFlagBit::ANY_HIT: return VK_SHADER_STAGE_ANY_HIT_BIT_KHR;
        case ShaderStageFlagBit::CLOSEST_HIT: return VK_SHADER_STAGE_CLOSEST_HIT_BIT_KHR;
        case ShaderStageFlagBit::MISS: return VK_SHADER_STAGE_MISS_BIT_KHR;
        case ShaderStageFlagBit::INTERSECTION: return VK_SHADER_STAGE_INTERSECTION_BIT_KHR;
        case ShaderStageFlagBit::CALLABLE: return VK_SHADER_STAGE_CALLABLE_BIT_KHR;
        default: {
            CC_ABORT();
            return VK_SHADER_STAGE_VERTEX_BIT;
        }
    }
}

VkShaderStageFlags mapVkShaderStageFlags(ShaderStageFlagBit stages) {
    uint32_t flags = 0U;
    if (hasFlag(stages, ShaderStageFlagBit::VERTEX)) flags |= VK_SHADER_STAGE_VERTEX_BIT;
    if (hasFlag(stages, ShaderStageFlagBit::CONTROL)) flags |= VK_SHADER_STAGE_TESSELLATION_CONTROL_BIT;
    if (hasFlag(stages, ShaderStageFlagBit::EVALUATION)) flags |= VK_SHADER_STAGE_TESSELLATION_EVALUATION_BIT;
    if (hasFlag(stages, ShaderStageFlagBit::GEOMETRY)) flags |= VK_SHADER_STAGE_GEOMETRY_BIT;
    if (hasFlag(stages, ShaderStageFlagBit::FRAGMENT)) flags |= VK_SHADER_STAGE_FRAGMENT_BIT;
    if (hasFlag(stages, ShaderStageFlagBit::COMPUTE)) flags |= VK_SHADER_STAGE_COMPUTE_BIT;
    return static_cast<VkShaderStageFlags>(flags);
}

VkRayTracingShaderGroupTypeKHR mapVkRayTracingShaderGroupType(RayTracingShaderGroupType type) {
    switch (type) {
        case RayTracingShaderGroupType::GENERAL: return VK_RAY_TRACING_SHADER_GROUP_TYPE_GENERAL_KHR;
        case RayTracingShaderGroupType::TRIANGLES_HIT_GROUP: return VK_RAY_TRACING_SHADER_GROUP_TYPE_TRIANGLES_HIT_GROUP_KHR;
        case RayTracingShaderGroupType::PROCEDURAL_HIT_GROUP: return VK_RAY_TRACING_SHADER_GROUP_TYPE_PROCEDURAL_HIT_GROUP_KHR;
        default: {
            CC_ASSERT(false);
            return VK_RAY_TRACING_SHADER_GROUP_TYPE_GENERAL_KHR;
        }
    }
}

SurfaceTransform mapSurfaceTransform(VkSurfaceTransformFlagBitsKHR transform) {
    if (transform & VK_SURFACE_TRANSFORM_ROTATE_90_BIT_KHR) return SurfaceTransform::ROTATE_90;
    if (transform & VK_SURFACE_TRANSFORM_ROTATE_180_BIT_KHR) return SurfaceTransform::ROTATE_180;
    if (transform & VK_SURFACE_TRANSFORM_ROTATE_270_BIT_KHR) return SurfaceTransform::ROTATE_270;
    return SurfaceTransform::IDENTITY;
}

VkGeometryFlagsKHR mapVkGeometryFlags(ASGeometryFlagBit flags) {
    VkGeometryFlagsKHR _flags = 0U;
    if (hasFlag(flags, ASGeometryFlagBit::GEOMETRY_OPAQUE)) _flags |= VK_GEOMETRY_OPAQUE_BIT_KHR;
    return static_cast<VkGeometryFlagsKHR>(_flags);
}

VkBuildAccelerationStructureFlagsKHR mapVkBuildAccelerationStructureFlags(ASBuildFlags flags) {
    VkBuildAccelerationStructureFlagsKHR _flags = 0U;
    if (hasFlag(flags, ASBuildFlagBits::ALLOW_COMPACTION)) _flags |= VK_BUILD_ACCELERATION_STRUCTURE_ALLOW_COMPACTION_BIT_KHR;
    if (hasFlag(flags, ASBuildFlagBits::ALLOW_UPDATE)) _flags |= VK_BUILD_ACCELERATION_STRUCTURE_ALLOW_UPDATE_BIT_KHR;
    if (hasFlag(flags, ASBuildFlagBits::LOW_MEMORY)) _flags |= VK_BUILD_ACCELERATION_STRUCTURE_LOW_MEMORY_BIT_KHR;
    if (hasFlag(flags, ASBuildFlagBits::PREFER_FAST_TRACE)) _flags |= VK_BUILD_ACCELERATION_STRUCTURE_PREFER_FAST_TRACE_BIT_KHR;
    if (hasFlag(flags, ASBuildFlagBits::PREFER_FAST_BUILD)) _flags |= VK_BUILD_ACCELERATION_STRUCTURE_PREFER_FAST_BUILD_BIT_KHR;
    return static_cast<VkBuildAccelerationStructureFlagsKHR>( _flags);
}

VkGeometryInstanceFlagsKHR mapVkGeomtryInstanceFlags(GeometryInstanceFlags flags) {
    VkGeometryInstanceFlagsKHR _flags = 0U;
    if (hasFlag(flags, GeometryInstanceFlags::FORCE_NO_OPAQUE)) _flags |= VK_GEOMETRY_INSTANCE_FORCE_NO_OPAQUE_BIT_KHR;
    if (hasFlag(flags, GeometryInstanceFlags::FORCE_OPAQUE)) _flags |= VK_GEOMETRY_INSTANCE_FORCE_OPAQUE_BIT_KHR;
    if (hasFlag(flags, GeometryInstanceFlags::TRIANGLE_FACING_CULL_DISABLE)) _flags |= VK_GEOMETRY_INSTANCE_TRIANGLE_CULL_DISABLE_BIT_NV;
    if (hasFlag(flags, GeometryInstanceFlags::TRIANGLE_FRONT_COUNTERCLOCKWISE_BIT_KHR)) _flags |= VK_GEOMETRY_INSTANCE_TRIANGLE_FRONT_COUNTERCLOCKWISE_BIT_KHR;
    return static_cast<VkGeometryInstanceFlagsKHR>(_flags);
}

ccstd::string mapVendorName(uint32_t vendorID) {
    switch (vendorID) {
        case 0x1002: return "Advanced Micro Devices, Inc.";
        case 0x1010: return "Imagination Technologies";
        case 0x106b: return "Apple Inc.";
        case 0x10DE: return "Nvidia Corporation";
        case 0x13B5: return "Arm Limited";
        case 0x5143: return "Qualcomm Incorporated";
        case 0x8086: return "Intel Corporation";
    }
    return StringUtil::format("Unknown VendorID %d", vendorID);
}

VkTransformMatrixKHR mapVkTransformMatrix(const Mat4& matrix) {
    VkTransformMatrixKHR vkTransform{};
    vkTransform.matrix[0][0] = matrix.m[0];
    vkTransform.matrix[0][1] = matrix.m[4];
    vkTransform.matrix[0][2] = matrix.m[8];
    vkTransform.matrix[0][3] = matrix.m[12];

    vkTransform.matrix[1][0] = matrix.m[1];
    vkTransform.matrix[1][1] = matrix.m[5];
    vkTransform.matrix[1][2] = matrix.m[9];
    vkTransform.matrix[1][3] = matrix.m[13];

    vkTransform.matrix[2][0] = matrix.m[2];
    vkTransform.matrix[2][1] = matrix.m[6];
    vkTransform.matrix[2][2] = matrix.m[10];
    vkTransform.matrix[2][3] = matrix.m[14];
    return vkTransform;
}

namespace {

VkDeviceAddress getVkBufferDeviceAddr(VkDevice device, VkBuffer buffer) {
    VkBufferDeviceAddressInfo bufferDeviceAddrInfo{VK_STRUCTURE_TYPE_BUFFER_DEVICE_ADDRESS_INFO};
    bufferDeviceAddrInfo.buffer = buffer;
    return vkGetBufferDeviceAddress(device, &bufferDeviceAddrInfo);
}

VkDeviceAddress getVkBufferDeviceAddr(const CCVKGPUDevice * device, const CCVKBuffer * buffer) {
    if (!buffer->gpuBuffer() || !buffer->gpuBuffer()->vkBuffer) return VkDeviceAddress{};
    return getVkBufferDeviceAddr(device->vkDevice,buffer->gpuBuffer()->vkBuffer);
}
}

VkAccelerationStructureGeometryTrianglesDataKHR mapVkASGeomTrianglesData(const ASTriangleMesh &mesh, const CCVKGPUDevice *gpuDevice) {
    VkAccelerationStructureGeometryTrianglesDataKHR trianglesData{
        VK_STRUCTURE_TYPE_ACCELERATION_STRUCTURE_GEOMETRY_TRIANGLES_DATA_KHR};
    trianglesData.vertexFormat = mapVkFormat(mesh.vertexFormat, gpuDevice);
    trianglesData.indexType = mesh.indexBuffer->getStride() == 2 ? VK_INDEX_TYPE_UINT16 : VK_INDEX_TYPE_UINT32;
    trianglesData.vertexStride = mesh.vertexStride;
    trianglesData.transformData = {};//todo 
    trianglesData.maxVertex = mesh.vertexCount;
    trianglesData.vertexData.deviceAddress = mesh.vertexBuffer->getDeviceAddress();//getVkBufferDeviceAddr(gpuDevice,static_cast<CCVKBuffer *const>(mesh.vertexBuffer));
    trianglesData.indexData.deviceAddress = mesh.indexBuffer->getDeviceAddress();//getVkBufferDeviceAddr(gpuDevice, static_cast<CCVKBuffer *const>(mesh.indexBuffer));
    return trianglesData;
}

VkAccelerationStructureInstanceKHR mapVkASInstance(const CCVKGPUDevice *gpuDevice,const ASInstance & instance) {
    VkAccelerationStructureInstanceKHR inst{};
    inst.transform = mapVkTransformMatrix(instance.transform);
    inst.mask = instance.mask;
    inst.instanceCustomIndex = instance.instanceCustomIdx;
    inst.instanceShaderBindingTableRecordOffset = instance.shaderBindingTableRecordOffset;
    inst.flags = mapVkGeomtryInstanceFlags(instance.flags);
    VkAccelerationStructureDeviceAddressInfoKHR deviceAddressInfo{VK_STRUCTURE_TYPE_ACCELERATION_STRUCTURE_DEVICE_ADDRESS_INFO_KHR};
    deviceAddressInfo.accelerationStructure = static_cast<CCVKAccelerationStructure *>(instance.accelerationStructureRef)->gpuAccelerationStructure()->vkAccelerationStructure;
    inst.accelerationStructureReference = vkGetAccelerationStructureDeviceAddressKHR(gpuDevice->vkDevice, &deviceAddressInfo);
    return inst;
}

const VkSurfaceTransformFlagsKHR TRANSFORMS_THAT_REQUIRE_FLIPPING =
    VK_SURFACE_TRANSFORM_ROTATE_90_BIT_KHR |
    VK_SURFACE_TRANSFORM_ROTATE_270_BIT_KHR;

const VkPrimitiveTopology VK_PRIMITIVE_MODES[] = {
    VK_PRIMITIVE_TOPOLOGY_POINT_LIST,                    // POINT_LIST
    VK_PRIMITIVE_TOPOLOGY_LINE_LIST,                     // LINE_LIST
    VK_PRIMITIVE_TOPOLOGY_LINE_STRIP,                    // LINE_STRIP
    static_cast<VkPrimitiveTopology>(0),                 // LINE_LOOP
    VK_PRIMITIVE_TOPOLOGY_LINE_LIST_WITH_ADJACENCY,      // LINE_LIST_ADJACENCY
    VK_PRIMITIVE_TOPOLOGY_LINE_STRIP_WITH_ADJACENCY,     // LINE_STRIP_ADJACENCY
    static_cast<VkPrimitiveTopology>(0),                 // ISO_LINE_LIST
    VK_PRIMITIVE_TOPOLOGY_TRIANGLE_LIST,                 // TRIANGLE_LIST
    VK_PRIMITIVE_TOPOLOGY_TRIANGLE_STRIP,                // TRIANGLE_STRIP
    VK_PRIMITIVE_TOPOLOGY_TRIANGLE_FAN,                  // TRIANGLE_FAN
    VK_PRIMITIVE_TOPOLOGY_TRIANGLE_LIST_WITH_ADJACENCY,  // TRIANGLE_LIST_ADJACENCY
    VK_PRIMITIVE_TOPOLOGY_TRIANGLE_STRIP_WITH_ADJACENCY, // TRIANGLE_STRIP_ADJACENCY,
    static_cast<VkPrimitiveTopology>(0),                 // TRIANGLE_PATCH_ADJACENCY,
    VK_PRIMITIVE_TOPOLOGY_PATCH_LIST,                    // QUAD_PATCH_LIST,
};

const VkCullModeFlags VK_CULL_MODES[] = {
    VK_CULL_MODE_NONE,
    VK_CULL_MODE_FRONT_BIT,
    VK_CULL_MODE_BACK_BIT,
};

const VkPolygonMode VK_POLYGON_MODES[] = {
    VK_POLYGON_MODE_FILL,
    VK_POLYGON_MODE_LINE,
    VK_POLYGON_MODE_POINT,
};

const VkCompareOp VK_CMP_FUNCS[] = {
    VK_COMPARE_OP_NEVER,
    VK_COMPARE_OP_LESS,
    VK_COMPARE_OP_EQUAL,
    VK_COMPARE_OP_LESS_OR_EQUAL,
    VK_COMPARE_OP_GREATER,
    VK_COMPARE_OP_NOT_EQUAL,
    VK_COMPARE_OP_GREATER_OR_EQUAL,
    VK_COMPARE_OP_ALWAYS,
};

const VkStencilOp VK_STENCIL_OPS[] = {
    VK_STENCIL_OP_ZERO,
    VK_STENCIL_OP_KEEP,
    VK_STENCIL_OP_REPLACE,
    VK_STENCIL_OP_INCREMENT_AND_CLAMP,
    VK_STENCIL_OP_DECREMENT_AND_CLAMP,
    VK_STENCIL_OP_INVERT,
    VK_STENCIL_OP_INCREMENT_AND_WRAP,
    VK_STENCIL_OP_DECREMENT_AND_WRAP,
};

const VkBlendOp VK_BLEND_OPS[] = {
    VK_BLEND_OP_ADD,
    VK_BLEND_OP_SUBTRACT,
    VK_BLEND_OP_REVERSE_SUBTRACT,
    VK_BLEND_OP_MIN,
    VK_BLEND_OP_MAX,
};

const VkBlendFactor VK_BLEND_FACTORS[] = {
    VK_BLEND_FACTOR_ZERO,
    VK_BLEND_FACTOR_ONE,
    VK_BLEND_FACTOR_SRC_ALPHA,
    VK_BLEND_FACTOR_DST_ALPHA,
    VK_BLEND_FACTOR_ONE_MINUS_SRC_ALPHA,
    VK_BLEND_FACTOR_ONE_MINUS_DST_ALPHA,
    VK_BLEND_FACTOR_SRC_COLOR,
    VK_BLEND_FACTOR_DST_COLOR,
    VK_BLEND_FACTOR_ONE_MINUS_SRC_COLOR,
    VK_BLEND_FACTOR_ONE_MINUS_DST_COLOR,
    VK_BLEND_FACTOR_SRC_ALPHA_SATURATE,
    VK_BLEND_FACTOR_CONSTANT_COLOR,
    VK_BLEND_FACTOR_ONE_MINUS_CONSTANT_COLOR,
    VK_BLEND_FACTOR_CONSTANT_ALPHA,
    VK_BLEND_FACTOR_ONE_MINUS_CONSTANT_ALPHA,
};

const VkFilter VK_FILTERS[] = {
    static_cast<VkFilter>(0), // NONE
    VK_FILTER_NEAREST,        // POINT
    VK_FILTER_LINEAR,         // LINEAR
    static_cast<VkFilter>(0), // ANISOTROPIC
};

const VkSamplerMipmapMode VK_SAMPLER_MIPMAP_MODES[] = {
    static_cast<VkSamplerMipmapMode>(0), // NONE
    VK_SAMPLER_MIPMAP_MODE_NEAREST,      // POINT
    VK_SAMPLER_MIPMAP_MODE_LINEAR,       // LINEAR
    VK_SAMPLER_MIPMAP_MODE_LINEAR,       // ANISOTROPIC
};

const VkSamplerAddressMode VK_SAMPLER_ADDRESS_MODES[] = {
    VK_SAMPLER_ADDRESS_MODE_REPEAT,          // WRAP
    VK_SAMPLER_ADDRESS_MODE_MIRRORED_REPEAT, // MIRROR
    VK_SAMPLER_ADDRESS_MODE_CLAMP_TO_EDGE,   // CLAMP
    VK_SAMPLER_ADDRESS_MODE_CLAMP_TO_BORDER, // BORDER
};

const VkPipelineBindPoint VK_PIPELINE_BIND_POINTS[] = {
    VK_PIPELINE_BIND_POINT_GRAPHICS,
    VK_PIPELINE_BIND_POINT_COMPUTE,
    VK_PIPELINE_BIND_POINT_RAY_TRACING_KHR,
};

const VkResolveModeFlagBits VK_RESOLVE_MODES[] = {
    VK_RESOLVE_MODE_NONE,
    VK_RESOLVE_MODE_SAMPLE_ZERO_BIT,
    VK_RESOLVE_MODE_AVERAGE_BIT,
    VK_RESOLVE_MODE_MIN_BIT,
    VK_RESOLVE_MODE_MAX_BIT,
};

const VkImageLayout VK_IMAGE_LAYOUTS[] = {
    VK_IMAGE_LAYOUT_UNDEFINED,
    VK_IMAGE_LAYOUT_GENERAL,
    VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL,
    VK_IMAGE_LAYOUT_DEPTH_STENCIL_ATTACHMENT_OPTIMAL,
    VK_IMAGE_LAYOUT_DEPTH_STENCIL_READ_ONLY_OPTIMAL,
    VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL,
    VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL,
    VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL,
    VK_IMAGE_LAYOUT_PREINITIALIZED,
    VK_IMAGE_LAYOUT_PRESENT_SRC_KHR,
};

const VkStencilFaceFlags VK_STENCIL_FACE_FLAGS[] = {
    VK_STENCIL_FACE_FRONT_BIT,
    VK_STENCIL_FACE_BACK_BIT,
    VK_STENCIL_FACE_FRONT_AND_BACK,
};

const VkAccessFlags FULL_ACCESS_FLAGS =
    VK_ACCESS_INDIRECT_COMMAND_READ_BIT |
    VK_ACCESS_INDEX_READ_BIT |
    VK_ACCESS_VERTEX_ATTRIBUTE_READ_BIT |
    VK_ACCESS_UNIFORM_READ_BIT |
    VK_ACCESS_INPUT_ATTACHMENT_READ_BIT |
    VK_ACCESS_SHADER_READ_BIT |
    VK_ACCESS_SHADER_WRITE_BIT |
    VK_ACCESS_COLOR_ATTACHMENT_READ_BIT |
    VK_ACCESS_COLOR_ATTACHMENT_WRITE_BIT |
    VK_ACCESS_DEPTH_STENCIL_ATTACHMENT_READ_BIT |
    VK_ACCESS_DEPTH_STENCIL_ATTACHMENT_WRITE_BIT |
    VK_ACCESS_TRANSFER_READ_BIT |
    VK_ACCESS_TRANSFER_WRITE_BIT |
    VK_ACCESS_HOST_READ_BIT |
    VK_ACCESS_HOST_WRITE_BIT;

void fullPipelineBarrier(VkCommandBuffer cmdBuff) {
#if CC_DEBUG > 0
    VkMemoryBarrier memoryBarrier{VK_STRUCTURE_TYPE_MEMORY_BARRIER};
    memoryBarrier.srcAccessMask = FULL_ACCESS_FLAGS;
    memoryBarrier.dstAccessMask = FULL_ACCESS_FLAGS;
    vkCmdPipelineBarrier(cmdBuff, VK_PIPELINE_STAGE_ALL_COMMANDS_BIT, VK_PIPELINE_STAGE_ALL_COMMANDS_BIT,
                         0, 1, &memoryBarrier, 0, nullptr, 0, nullptr);
#endif
}

static constexpr ThsvsAccessType THSVS_ACCESS_TYPES[] = {
    THSVS_ACCESS_NONE,                                                       // NONE
    THSVS_ACCESS_INDIRECT_BUFFER,                                            // INDIRECT_BUFFER
    THSVS_ACCESS_INDEX_BUFFER,                                               // INDEX_BUFFER
    THSVS_ACCESS_VERTEX_BUFFER,                                              // VERTEX_BUFFER
    THSVS_ACCESS_VERTEX_SHADER_READ_UNIFORM_BUFFER,                          // VERTEX_SHADER_READ_UNIFORM_BUFFER
    THSVS_ACCESS_VERTEX_SHADER_READ_SAMPLED_IMAGE_OR_UNIFORM_TEXEL_BUFFER,   // VERTEX_SHADER_READ_TEXTURE
    THSVS_ACCESS_VERTEX_SHADER_READ_OTHER,                                   // VERTEX_SHADER_READ_OTHER
    THSVS_ACCESS_FRAGMENT_SHADER_READ_UNIFORM_BUFFER,                        // FRAGMENT_SHADER_READ_UNIFORM_BUFFER
    THSVS_ACCESS_FRAGMENT_SHADER_READ_SAMPLED_IMAGE_OR_UNIFORM_TEXEL_BUFFER, // FRAGMENT_SHADER_READ_TEXTURE
    THSVS_ACCESS_FRAGMENT_SHADER_READ_COLOR_INPUT_ATTACHMENT,                // FRAGMENT_SHADER_READ_COLOR_INPUT_ATTACHMENT
    THSVS_ACCESS_FRAGMENT_SHADER_READ_DEPTH_STENCIL_INPUT_ATTACHMENT,        // FRAGMENT_SHADER_READ_DEPTH_STENCIL_INPUT_ATTACHMENT
    THSVS_ACCESS_FRAGMENT_SHADER_READ_OTHER,                                 // FRAGMENT_SHADER_READ_OTHER
    THSVS_ACCESS_COLOR_ATTACHMENT_READ,                                      // COLOR_ATTACHMENT_READ
    THSVS_ACCESS_DEPTH_STENCIL_ATTACHMENT_READ,                              // DEPTH_STENCIL_ATTACHMENT_READ
    THSVS_ACCESS_COMPUTE_SHADER_READ_UNIFORM_BUFFER,                         // COMPUTE_SHADER_READ_UNIFORM_BUFFER
    THSVS_ACCESS_COMPUTE_SHADER_READ_SAMPLED_IMAGE_OR_UNIFORM_TEXEL_BUFFER,  // COMPUTE_SHADER_READ_TEXTURE
    THSVS_ACCESS_COMPUTE_SHADER_READ_OTHER,                                  // COMPUTE_SHADER_READ_OTHER
    THSVS_ACCESS_TRANSFER_READ,                                              // TRANSFER_READ
    THSVS_ACCESS_HOST_READ,                                                  // HOST_READ
    THSVS_ACCESS_PRESENT,                                                    // PRESENT
    THSVS_ACCESS_VERTEX_SHADER_WRITE,                                        // VERTEX_SHADER_WRITE
    THSVS_ACCESS_FRAGMENT_SHADER_WRITE,                                      // FRAGMENT_SHADER_WRITE
    THSVS_ACCESS_COLOR_ATTACHMENT_WRITE,                                     // COLOR_ATTACHMENT_WRITE
    THSVS_ACCESS_DEPTH_STENCIL_ATTACHMENT_WRITE,                             // DEPTH_STENCIL_ATTACHMENT_WRITE
    THSVS_ACCESS_COMPUTE_SHADER_WRITE,                                       // COMPUTE_SHADER_WRITE
    THSVS_ACCESS_TRANSFER_WRITE,                                             // TRANSFER_WRITE
    THSVS_ACCESS_HOST_PREINITIALIZED,                                        // HOST_PREINITIALIZED
    THSVS_ACCESS_HOST_WRITE,                                                 // HOST_WRITE
    THSVS_ACCESS_SHADING_RATE_READ_NV,                                       // SHADING_RATE
};

const ThsvsAccessType *getAccessType(AccessFlagBit flag) {
    return &THSVS_ACCESS_TYPES[utils::getBitPosition(toNumber(flag))];
}

ThsvsImageLayout getAccessLayout(AccessFlags flag) {
    if (hasAllFlags(flag, AccessFlagBit::FRAGMENT_SHADER_READ_COLOR_INPUT_ATTACHMENT | AccessFlagBit::COLOR_ATTACHMENT_WRITE) ||
        hasAllFlags(flag, AccessFlagBit::FRAGMENT_SHADER_READ_DEPTH_STENCIL_INPUT_ATTACHMENT | AccessFlagBit::DEPTH_STENCIL_ATTACHMENT_WRITE)) {
        return THSVS_IMAGE_LAYOUT_GENERAL;
    }
    return THSVS_IMAGE_LAYOUT_OPTIMAL;
}

void getAccessTypes(AccessFlags flag, ccstd::vector<ThsvsAccessType> &v) {
    for (uint32_t mask = toNumber(flag); mask; mask = utils::clearLowestBit(mask)) {
        v.push_back(THSVS_ACCESS_TYPES[utils::getBitPosition(utils::getLowestBit(mask))]);
    }
}

VkDeviceSize roundUp(VkDeviceSize numToRound, uint32_t multiple) {
    return ((numToRound + multiple - 1) / multiple) * multiple;
}

bool isMultipleOf(VkDeviceSize numToCheck, uint32_t multiple) {
    return numToCheck % multiple == 0;
}

bool isLayerSupported(const char *required, const ccstd::vector<VkLayerProperties> &available) {
    for (const VkLayerProperties &availableLayer : available) {
        if (strcmp(availableLayer.layerName, required) == 0) {
            return true;
        }
    }
    return false;
}

bool isExtensionSupported(const char *required, const ccstd::vector<VkExtensionProperties> &available) {
    for (const VkExtensionProperties &availableExtension : available) {
        if (strcmp(availableExtension.extensionName, required) == 0) {
            return true;
        }
    }
    return false;
}

bool isFormatSupported(VkPhysicalDevice device, VkFormat format) {
    VkFormatProperties properties;
    vkGetPhysicalDeviceFormatProperties(device, format, &properties);
    return (properties.optimalTilingFeatures & VK_FORMAT_FEATURE_SAMPLED_IMAGE_BIT) != 0;
}

} // namespace gfx
} // namespace cc
