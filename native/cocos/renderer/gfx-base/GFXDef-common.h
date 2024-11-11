/****************************************************************************
 Copyright (c) 2019-2023 Xiamen Yaji Software Co., Ltd.

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

#include "base/Ptr.h"
#include "base/TypeDef.h"
#include "base/memory/Memory.h"
#include "base/std/container/string.h"
#include "base/std/container/vector.h"
#include "math/Math.h"
#include "math/Mat4.h"

#ifdef Status
    // Fix linux compile errors
    // In /usr/include/X11/Xlib.h Status defined as int
    #undef Status
#endif

#define CC_USE_PIPELINE_CACHE 0

/**
 * Some general guide lines:
 * Always use explicit numeric types rather than `int`, `long`, etc. for a stable memory layout
 * Structs marked with ALIGNAS specifiers MUST guarantee not to be implicitly padded
 *
 * This file should be synced with cocos/core/gfx/base/define.ts
 * every time changes being made, by manually running:
 * node native/tools/gfx-define-generator/generate.js
 *
 * Due to Clang AST's incompleteness for now we are parsing this header manually.
 * Some caveat:
 * * native-specific structs should not be included here, put them in GFXDef.h instead
 * * no typedefs, only usings
 * * define struct members first, then other helper functions
 * * aliases can only be used as types, not values (e.g. BufferUsage::NONE is illegal)
 * * parser directives can be specified in comments right after struct member declarations:
 *   * @ts-nullable: declare the member optional
 *   * @ts-boolean: declare the member as boolean, even if the type is not `bool`
 *   * @ts-overrides `YAML declaration`: overrides any parsed results, use with caution
 * * each struct member have to be specified in a single line, including optional parser directives
 * * members with a name starts with an underscore is automatically ignored
 */

namespace cc {
namespace gfx {

class GFXObject;
class Device;
class Swapchain;
class Buffer;
class GeneralBarrier;
class TextureBarrier;
class BufferBarrier;
class Texture;
class Sampler;
class Shader;
class InputAssembler;
class RenderPass;
class Framebuffer;
class DescriptorSetLayout;
class PipelineLayout;
class PipelineState;
class DescriptorSet;
class CommandBuffer;
class Queue;
class QueryPool;
class Window;
class Context;
class AccelerationStructure;

using BufferBarrierList = ccstd::vector<BufferBarrier *>;
using TextureBarrierList = ccstd::vector<TextureBarrier *>;
using BufferDataList = ccstd::vector<const uint8_t *>;
using BufferSrcList = ccstd::vector<uint8_t *>;
using CommandBufferList = ccstd::vector<CommandBuffer *>;
using QueryPoolList = ccstd::vector<QueryPool *>;
using IndexList = ccstd::vector<uint32_t>;

constexpr uint32_t MAX_ATTACHMENTS = 4U;
constexpr uint32_t INVALID_BINDING = ~0U;
constexpr uint32_t SUBPASS_EXTERNAL = ~0U;
constexpr ccstd::hash_t INVALID_SHADER_HASH = 0xFFFFFFFFU;

// Although the standard is not limited, some devices do not support up to 65536 queries
constexpr uint32_t DEFAULT_MAX_QUERY_OBJECTS = 32767;

using BufferList = ccstd::vector<Buffer *>;
using TextureList = ccstd::vector<Texture *>;
using SamplerList = ccstd::vector<Sampler *>;
using AccelerationStructureList = ccstd::vector<AccelerationStructure *>;
using DescriptorSetLayoutList = ccstd::vector<DescriptorSetLayout *>;

// make sure you have FILLED GRAPHs before enable this!
static constexpr bool ENABLE_GRAPH_AUTO_BARRIER{false};

/**
 * @en Graphics object type
 * @zh 图形API对象的类型
 */
enum class ObjectType : uint32_t {
    UNKNOWN,
    SWAPCHAIN,
    BUFFER,
    TEXTURE,
    RENDER_PASS,
    FRAMEBUFFER,
    SAMPLER,
    SHADER,
    DESCRIPTOR_SET_LAYOUT,
    PIPELINE_LAYOUT,
    PIPELINE_STATE,
    DESCRIPTOR_SET,
    INPUT_ASSEMBLER,
    COMMAND_BUFFER,
    QUEUE,
    QUERY_POOL,
    GLOBAL_BARRIER,
    TEXTURE_BARRIER,
    BUFFER_BARRIER,
    ACCELERATION_STRUCTURE,
    COUNT,
};
CC_ENUM_CONVERSION_OPERATOR(ObjectType);

enum class Status : uint32_t {
    UNREADY,
    FAILED,
    SUCCESS,
};
CC_ENUM_CONVERSION_OPERATOR(Status);

enum class API : uint32_t {
    UNKNOWN,
    GLES2,
    GLES3,
    METAL,
    VULKAN,
    NVN,
    WEBGL,
    WEBGL2,
    WEBGPU,
};
CC_ENUM_CONVERSION_OPERATOR(API);

enum class SurfaceTransform : uint32_t {
    IDENTITY,
    ROTATE_90,
    ROTATE_180,
    ROTATE_270,
};
CC_ENUM_CONVERSION_OPERATOR(SurfaceTransform);

enum class Feature : uint32_t {
    ELEMENT_INDEX_UINT,
    INSTANCED_ARRAYS,
    MULTIPLE_RENDER_TARGETS,
    BLEND_MINMAX,
    COMPUTE_SHADER,

    INPUT_ATTACHMENT_BENEFIT, // @deprecated
    SUBPASS_COLOR_INPUT,
    SUBPASS_DEPTH_STENCIL_INPUT,
    RASTERIZATION_ORDER_NOCOHERENT,

    MULTI_SAMPLE_RESOLVE_DEPTH_STENCIL,   // resolve depth stencil
    COUNT,
};
CC_ENUM_CONVERSION_OPERATOR(Feature);

enum class  Format : uint32_t {

    UNKNOWN,

    A8,
    L8,
    LA8,

    R8,
    R8SN,
    R8UI,
    R8I,
    R16F,
    R16UI,
    R16I,
    R32F,
    R32UI,
    R32I,

    RG8,
    RG8SN,
    RG8UI,
    RG8I,
    RG16F,
    RG16UI,
    RG16I,
    RG32F,
    RG32UI,
    RG32I,

    RGB8,
    SRGB8,
    RGB8SN,
    RGB8UI,
    RGB8I,
    RGB16F,
    RGB16UI,
    RGB16I,
    RGB32F,
    RGB32UI,
    RGB32I,

    RGBA8,
    BGRA8,
    SRGB8_A8,
    RGBA8SN,
    RGBA8UI,
    RGBA8I,
    RGBA16F,
    RGBA16UI,
    RGBA16I,
    RGBA32F,
    RGBA32UI,
    RGBA32I,

    // Special Format
    R5G6B5,
    R11G11B10F,
    RGB5A1,
    RGBA4,
    RGB10A2,
    RGB10A2UI,
    RGB9E5,

    // Depth-Stencil Format
    DEPTH,
    DEPTH_STENCIL,

    // Compressed Format

    // Block Compression Format, DDS (DirectDraw Surface)
    // DXT1: 3 channels (5:6:5), 1/8 original size, with 0 or 1 bit of alpha
    BC1,
    BC1_ALPHA,
    BC1_SRGB,
    BC1_SRGB_ALPHA,
    // DXT3: 4 channels (5:6:5), 1/4 original size, with 4 bits of alpha
    BC2,
    BC2_SRGB,
    // DXT5: 4 channels (5:6:5), 1/4 original size, with 8 bits of alpha
    BC3,
    BC3_SRGB,
    // 1 channel (8), 1/4 original size
    BC4,
    BC4_SNORM,
    // 2 channels (8:8), 1/2 original size
    BC5,
    BC5_SNORM,
    // 3 channels (16:16:16), half-floating point, 1/6 original size
    // UF16: unsigned float, 5 exponent bits + 11 mantissa bits
    // SF16: signed float, 1 signed bit + 5 exponent bits + 10 mantissa bits
    BC6H_UF16,
    BC6H_SF16,
    // 4 channels (4~7 bits per channel) with 0 to 8 bits of alpha, 1/3 original size
    BC7,
    BC7_SRGB,

    // Ericsson Texture Compression Format
    ETC_RGB8,
    ETC2_RGB8,
    ETC2_SRGB8,
    ETC2_RGB8_A1,
    ETC2_SRGB8_A1,
    ETC2_RGBA8,
    ETC2_SRGB8_A8,
    EAC_R11,
    EAC_R11SN,
    EAC_RG11,
    EAC_RG11SN,

    // PVRTC (PowerVR)
    PVRTC_RGB2,
    PVRTC_RGBA2,
    PVRTC_RGB4,
    PVRTC_RGBA4,
    PVRTC2_2BPP,
    PVRTC2_4BPP,

    // ASTC (Adaptive Scalable Texture Compression)
    ASTC_RGBA_4X4,
    ASTC_RGBA_5X4,
    ASTC_RGBA_5X5,
    ASTC_RGBA_6X5,
    ASTC_RGBA_6X6,
    ASTC_RGBA_8X5,
    ASTC_RGBA_8X6,
    ASTC_RGBA_8X8,
    ASTC_RGBA_10X5,
    ASTC_RGBA_10X6,
    ASTC_RGBA_10X8,
    ASTC_RGBA_10X10,
    ASTC_RGBA_12X10,
    ASTC_RGBA_12X12,

    // ASTC (Adaptive Scalable Texture Compression) SRGB
    ASTC_SRGBA_4X4,
    ASTC_SRGBA_5X4,
    ASTC_SRGBA_5X5,
    ASTC_SRGBA_6X5,
    ASTC_SRGBA_6X6,
    ASTC_SRGBA_8X5,
    ASTC_SRGBA_8X6,
    ASTC_SRGBA_8X8,
    ASTC_SRGBA_10X5,
    ASTC_SRGBA_10X6,
    ASTC_SRGBA_10X8,
    ASTC_SRGBA_10X10,
    ASTC_SRGBA_12X10,
    ASTC_SRGBA_12X12,

    // Total count
    COUNT,
};
CC_ENUM_CONVERSION_OPERATOR(Format);

enum class FormatType : uint32_t {
    NONE,
    UNORM,
    SNORM,
    UINT,
    INT,
    UFLOAT,
    FLOAT,
};
CC_ENUM_CONVERSION_OPERATOR(FormatType);

enum class Type : uint32_t {
    UNKNOWN,
    BOOL,
    BOOL2,
    BOOL3,
    BOOL4,
    INT,
    INT2,
    INT3,
    INT4,
    UINT,
    UINT2,
    UINT3,
    UINT4,
    FLOAT,
    FLOAT2,
    FLOAT3,
    FLOAT4,
    MAT2,
    MAT2X3,
    MAT2X4,
    MAT3X2,
    MAT3,
    MAT3X4,
    MAT4X2,
    MAT4X3,
    MAT4,
    // combined image samplers
    SAMPLER1D,
    SAMPLER1D_ARRAY,
    SAMPLER2D,
    SAMPLER2D_ARRAY,
    SAMPLER3D,
    SAMPLER_CUBE,
    // sampler
    SAMPLER,
    // sampled textures
    TEXTURE1D,
    TEXTURE1D_ARRAY,
    TEXTURE2D,
    TEXTURE2D_ARRAY,
    TEXTURE3D,
    TEXTURE_CUBE,
    // storage images
    IMAGE1D,
    IMAGE1D_ARRAY,
    IMAGE2D,
    IMAGE2D_ARRAY,
    IMAGE3D,
    IMAGE_CUBE,
    // input attachment
    SUBPASS_INPUT,
    //acceleration structure
    ACCELERATION_STRUCTURE,
    COUNT,
};
CC_ENUM_CONVERSION_OPERATOR(Type);

bool isCombinedImageSampler(Type type);
bool isSampledImage(Type type);
bool isStorageImage(Type type);

enum class BufferUsageBit : uint32_t {
    NONE = 0,
    TRANSFER_SRC = 0x1,
    TRANSFER_DST = 0x2,
    INDEX = 0x4,
    VERTEX = 0x8,
    UNIFORM = 0x10,
    STORAGE = 0x20,
    INDIRECT = 0x40,
    SHADER_DEVICE_ADDRESS = 0x80,
    ACCELERATION_STRUCTURE_BUILD_INPUT_READ_ONLY = 0x100,
    ACCELERATION_STRUCTURE_STORAGE = 0x200,
    ACCELERATION_STRUCTURE_BUILD_SCRATCH = 0x400
};
using BufferUsage = BufferUsageBit;
CC_ENUM_BITWISE_OPERATORS(BufferUsageBit);

enum class BufferFlagBit : uint32_t {
    NONE = 0,
    ENABLE_STAGING_WRITE = 0x01,
};
using BufferFlags = BufferFlagBit;
CC_ENUM_BITWISE_OPERATORS(BufferFlagBit);

enum class MemoryAccessBit : uint32_t {
    NONE = 0,
    READ_ONLY = 0x1,
    WRITE_ONLY = 0x2,
    READ_WRITE = READ_ONLY | WRITE_ONLY,
};
using MemoryAccess = MemoryAccessBit;
CC_ENUM_BITWISE_OPERATORS(MemoryAccessBit);

enum class MemoryUsageBit : uint32_t {
    NONE = 0,
    DEVICE = 0x1, // for rarely-updated resources, use MemoryUsageBit::DEVICE
    HOST = 0x2,   // for frequently-updated resources, use MemoryUsageBit::DEVICE | MemoryUsageBit::HOST
};
using MemoryUsage = MemoryUsageBit;
CC_ENUM_BITWISE_OPERATORS(MemoryUsageBit);

enum class TextureType : uint32_t {
    TEX1D,
    TEX2D,
    TEX3D,
    CUBE,
    TEX1D_ARRAY,
    TEX2D_ARRAY,
};
CC_ENUM_CONVERSION_OPERATOR(TextureType);

enum class TextureUsageBit : uint32_t {
    NONE = 0,
    TRANSFER_SRC = 0x1,
    TRANSFER_DST = 0x2,
    SAMPLED = 0x4,
    STORAGE = 0x8,
    COLOR_ATTACHMENT = 0x10,
    DEPTH_STENCIL_ATTACHMENT = 0x20,
    INPUT_ATTACHMENT = 0x40,
    SHADING_RATE = 0x80,
};
using TextureUsage = TextureUsageBit;
CC_ENUM_BITWISE_OPERATORS(TextureUsageBit);

enum class TextureFlagBit : uint32_t {
    NONE = 0,
    GEN_MIPMAP = 0x1,           // Generate mipmaps using bilinear filter
    GENERAL_LAYOUT = 0x2,       // @deprecated, For inout framebuffer attachments
    EXTERNAL_OES = 0x4,         // External oes texture
    EXTERNAL_NORMAL = 0x8,      // External normal texture
    LAZILY_ALLOCATED = 0x10,    // Try lazily allocated mode.
    MUTABLE_VIEW_FORMAT = 0x40, // texture view as different format
    MUTABLE_STORAGE = 0x80,     // mutable storage for gl image
};
using TextureFlags = TextureFlagBit;
CC_ENUM_BITWISE_OPERATORS(TextureFlagBit);

enum class FormatFeatureBit : uint32_t {
    NONE = 0,
    RENDER_TARGET = 0x1,     // Allow usages as render pass attachments
    SAMPLED_TEXTURE = 0x2,   // Allow sampled reads in shaders
    LINEAR_FILTER = 0x4,     // Allow linear filtering when sampling in shaders or blitting
    STORAGE_TEXTURE = 0x8,   // Allow storage reads & writes in shaders
    VERTEX_ATTRIBUTE = 0x10, // Allow usages as vertex input attributes
    SHADING_RATE = 0x20,     // Allow usages as shading rate
};
using FormatFeature = FormatFeatureBit;
CC_ENUM_BITWISE_OPERATORS(FormatFeatureBit);

enum class SampleCount : uint32_t {
    X1  = 0x01,
    X2  = 0x02,
    X4  = 0x04,
    X8  = 0x08,
    X16 = 0x10,
    X32 = 0x20,
    X64 = 0x40
};
CC_ENUM_CONVERSION_OPERATOR(SampleCount);

enum class VsyncMode : uint32_t {
    // The application does not synchronizes with the vertical sync.
    // If application renders faster than the display refreshes, frames are wasted and tearing may be observed.
    // FPS is uncapped. Maximum power consumption. If unsupported, "ON" value will be used instead. Minimum latency.
    OFF,
    // The application is always synchronized with the vertical sync. Tearing does not happen.
    // FPS is capped to the display's refresh rate. For fast applications, battery life is improved. Always supported.
    ON,
    // The application synchronizes with the vertical sync, but only if the application rendering speed is greater than refresh rate.
    // Compared to OFF, there is no tearing. Compared to ON, the FPS will be improved for "slower" applications.
    // If unsupported, "ON" value will be used instead. Recommended for most applications. Default if supported.
    RELAXED,
    // The presentation engine will always use the latest fully rendered image.
    // Compared to OFF, no tearing will be observed.
    // Compared to ON, battery power will be worse, especially for faster applications.
    // If unsupported,  "OFF" will be attempted next.
    MAILBOX,
    // The application is capped to using half the vertical sync time.
    // FPS artificially capped to Half the display speed (usually 30fps) to maintain battery.
    // Best possible battery savings. Worst possible performance.
    // Recommended for specific applications where battery saving is critical.
    HALF,
};
CC_ENUM_CONVERSION_OPERATOR(VsyncMode);

enum class Filter : uint32_t {
    NONE,
    POINT,
    LINEAR,
    ANISOTROPIC,
};
CC_ENUM_CONVERSION_OPERATOR(Filter);

enum class Address : uint32_t {
    WRAP,
    MIRROR,
    CLAMP,
    BORDER,
};
CC_ENUM_CONVERSION_OPERATOR(Address);

enum class ComparisonFunc : uint32_t {
    NEVER,
    LESS,
    EQUAL,
    LESS_EQUAL,
    GREATER,
    NOT_EQUAL,
    GREATER_EQUAL,
    ALWAYS,
};
CC_ENUM_CONVERSION_OPERATOR(ComparisonFunc);

enum class StencilOp : uint32_t {
    ZERO,
    KEEP,
    REPLACE,
    INCR,
    DECR,
    INVERT,
    INCR_WRAP,
    DECR_WRAP,
};
CC_ENUM_CONVERSION_OPERATOR(StencilOp);

enum class BlendFactor : uint32_t {
    ZERO,
    ONE,
    SRC_ALPHA,
    DST_ALPHA,
    ONE_MINUS_SRC_ALPHA,
    ONE_MINUS_DST_ALPHA,
    SRC_COLOR,
    DST_COLOR,
    ONE_MINUS_SRC_COLOR,
    ONE_MINUS_DST_COLOR,
    SRC_ALPHA_SATURATE,
    CONSTANT_COLOR,
    ONE_MINUS_CONSTANT_COLOR,
    CONSTANT_ALPHA,
    ONE_MINUS_CONSTANT_ALPHA,
};
CC_ENUM_CONVERSION_OPERATOR(BlendFactor);

enum class BlendOp : uint32_t {
    ADD,
    SUB,
    REV_SUB,
    MIN,
    MAX,
};
CC_ENUM_CONVERSION_OPERATOR(BlendOp);

enum class ColorMask : uint32_t {
    NONE = 0x0,
    R = 0x1,
    G = 0x2,
    B = 0x4,
    A = 0x8,
    ALL = R | G | B | A,
};
CC_ENUM_BITWISE_OPERATORS(ColorMask);

enum class ShaderStageFlagBit : uint32_t {
    NONE = 0x0,
    VERTEX = 0x1,
    CONTROL = 0x2,
    EVALUATION = 0x4,
    GEOMETRY = 0x8,
    FRAGMENT = 0x10,
    COMPUTE = 0x20,
    RAYGEN = 0x40,
    MISS = 0x80,
    CLOSEST_HIT = 0x100,
    ANY_HIT = 0x200,
    INTERSECTION = 0x400, 
    CALLABLE = 0x800,
    ALL = VERTEX | CONTROL | EVALUATION | GEOMETRY | FRAGMENT | COMPUTE | RAYGEN | MISS | CLOSEST_HIT | ANY_HIT | INTERSECTION | CALLABLE,
};
using ShaderStageFlags = ShaderStageFlagBit;
CC_ENUM_BITWISE_OPERATORS(ShaderStageFlagBit);

enum class RayTracingShaderGroupType : uint32_t {
    GENERAL,
    TRIANGLES_HIT_GROUP,
    PROCEDURAL_HIT_GROUP,
};

enum class LoadOp : uint32_t {
    LOAD,    // Load the previous content from memory
    CLEAR,   // Clear the content to a fixed value
    DISCARD, // Discard the previous content
};
CC_ENUM_CONVERSION_OPERATOR(LoadOp);

enum class StoreOp : uint32_t {
    STORE,   // Store the pending content to memory
    DISCARD, // Discard the pending content
};
CC_ENUM_CONVERSION_OPERATOR(StoreOp);

enum class AccessFlagBit : uint32_t {
    NONE = 0,

    // Read accesses
    INDIRECT_BUFFER = 1 << 0,                                     // Read as an indirect buffer for drawing or dispatch
    INDEX_BUFFER = 1 << 1,                                        // Read as an index buffer for drawing
    VERTEX_BUFFER = 1 << 2,                                       // Read as a vertex buffer for drawing
    VERTEX_SHADER_READ_UNIFORM_BUFFER = 1 << 3,                   // Read as a uniform buffer in a vertex shader
    VERTEX_SHADER_READ_TEXTURE = 1 << 4,                          // Read as a sampled image/uniform texel buffer in a vertex shader
    VERTEX_SHADER_READ_OTHER = 1 << 5,                            // Read as any other resource in a vertex shader
    FRAGMENT_SHADER_READ_UNIFORM_BUFFER = 1 << 6,                 // Read as a uniform buffer in a fragment shader
    FRAGMENT_SHADER_READ_TEXTURE = 1 << 7,                        // Read as a sampled image/uniform texel buffer in a fragment shader
    FRAGMENT_SHADER_READ_COLOR_INPUT_ATTACHMENT = 1 << 8,         // Read as an input attachment with a color format in a fragment shader
    FRAGMENT_SHADER_READ_DEPTH_STENCIL_INPUT_ATTACHMENT = 1 << 9, // Read as an input attachment with a depth/stencil format in a fragment shader
    FRAGMENT_SHADER_READ_OTHER = 1 << 10,                         // Read as any other resource in a fragment shader
    COLOR_ATTACHMENT_READ = 1 << 11,                              // Read by standard blending/logic operations or subpass load operations
    DEPTH_STENCIL_ATTACHMENT_READ = 1 << 12,                      // Read by depth/stencil tests or subpass load operations
    COMPUTE_SHADER_READ_UNIFORM_BUFFER = 1 << 13,                 // Read as a uniform buffer in a compute shader
    COMPUTE_SHADER_READ_TEXTURE = 1 << 14,                        // Read as a sampled image/uniform texel buffer in a compute shader
    COMPUTE_SHADER_READ_OTHER = 1 << 15,                          // Read as any other resource in a compute shader
    TRANSFER_READ = 1 << 16,                                      // Read as the source of a transfer operation
    HOST_READ = 1 << 17,                                          // Read on the host
    PRESENT = 1 << 18,                                            // Read by the presentation engine

    // Write accesses
    VERTEX_SHADER_WRITE = 1 << 19,            // Written as any resource in a vertex shader
    FRAGMENT_SHADER_WRITE = 1 << 20,          // Written as any resource in a fragment shader
    COLOR_ATTACHMENT_WRITE = 1 << 21,         // Written as a color attachment during rendering, or via a subpass store op
    DEPTH_STENCIL_ATTACHMENT_WRITE = 1 << 22, // Written as a depth/stencil attachment during rendering, or via a subpass store op
    COMPUTE_SHADER_WRITE = 1 << 23,           // Written as any resource in a compute shader
    TRANSFER_WRITE = 1 << 24,                 // Written as the destination of a transfer operation
    HOST_PREINITIALIZED = 1 << 25,            // Data pre-filled by host before device access starts
    HOST_WRITE = 1 << 26,                     // Written on the host

    SHADING_RATE = 1 << 27, // Read as a shading rate image
};
CC_ENUM_BITWISE_OPERATORS(AccessFlagBit);
using AccessFlags = AccessFlagBit;

enum class ResolveMode : uint32_t {
    NONE,
    SAMPLE_ZERO,
    AVERAGE,
    MIN,
    MAX,
};
CC_ENUM_CONVERSION_OPERATOR(ResolveMode);

enum class PipelineBindPoint : uint32_t {
    GRAPHICS,
    COMPUTE,
    RAY_TRACING,
};
CC_ENUM_CONVERSION_OPERATOR(PipelineBindPoint);

enum class PrimitiveMode : uint32_t {
    POINT_LIST,
    LINE_LIST,
    LINE_STRIP,
    LINE_LOOP,
    LINE_LIST_ADJACENCY,
    LINE_STRIP_ADJACENCY,
    ISO_LINE_LIST,
    // raycast detectable:
    TRIANGLE_LIST,
    TRIANGLE_STRIP,
    TRIANGLE_FAN,
    TRIANGLE_LIST_ADJACENCY,
    TRIANGLE_STRIP_ADJACENCY,
    TRIANGLE_PATCH_ADJACENCY,
    QUAD_PATCH_LIST,
};
CC_ENUM_CONVERSION_OPERATOR(PrimitiveMode);

enum class PolygonMode : uint32_t {
    FILL,
    POINT,
    LINE,
};
CC_ENUM_CONVERSION_OPERATOR(PolygonMode);

enum class ShadeModel : uint32_t {
    GOURAND,
    FLAT,
};
CC_ENUM_CONVERSION_OPERATOR(ShadeModel);

enum class CullMode : uint32_t {
    NONE,
    FRONT,
    BACK,
};
CC_ENUM_CONVERSION_OPERATOR(CullMode);

enum class DynamicStateFlagBit : uint32_t {
    NONE = 0x0,
    LINE_WIDTH = 0x1,
    DEPTH_BIAS = 0x2,
    BLEND_CONSTANTS = 0x4,
    DEPTH_BOUNDS = 0x8,
    STENCIL_WRITE_MASK = 0x10,
    STENCIL_COMPARE_MASK = 0x20,
};
using DynamicStateFlags = DynamicStateFlagBit;
CC_ENUM_BITWISE_OPERATORS(DynamicStateFlagBit);

using DynamicStateList = ccstd::vector<DynamicStateFlagBit>;

enum class StencilFace : uint32_t {
    FRONT = 0x1,
    BACK = 0x2,
    ALL = 0x3,
};
CC_ENUM_BITWISE_OPERATORS(StencilFace);

enum class DescriptorType : uint32_t {
    UNKNOWN = 0,
    UNIFORM_BUFFER = 0x1,
    DYNAMIC_UNIFORM_BUFFER = 0x2,
    STORAGE_BUFFER = 0x4,
    DYNAMIC_STORAGE_BUFFER = 0x8,
    SAMPLER_TEXTURE = 0x10,
    SAMPLER = 0x20,
    TEXTURE = 0x40,
    STORAGE_IMAGE = 0x80,
    INPUT_ATTACHMENT = 0x100,
    ACCELERATION_STRUCTURE = 0x200
};
CC_ENUM_BITWISE_OPERATORS(DescriptorType);

enum class QueueType : uint32_t {
    GRAPHICS,
    COMPUTE,
    TRANSFER,
};
CC_ENUM_CONVERSION_OPERATOR(QueueType);

enum class QueryType : uint32_t {
    OCCLUSION,
    PIPELINE_STATISTICS,
    TIMESTAMP,
    ACCELERATION_STRUCTURE_COMPACTED_SIZE,
    ACCELERATION_STRUCTURE_SERIALIZATION_SIZE
};
CC_ENUM_CONVERSION_OPERATOR(QueryType);

enum class CommandBufferType : uint32_t {
    PRIMARY,
    SECONDARY,
};
CC_ENUM_CONVERSION_OPERATOR(CommandBufferType);

enum class ClearFlagBit : uint32_t {
    NONE = 0,
    COLOR = 0x1,
    DEPTH = 0x2,
    STENCIL = 0x4,
    DEPTH_STENCIL = DEPTH | STENCIL,
    ALL = COLOR | DEPTH | STENCIL,
};
using ClearFlags = ClearFlagBit;
CC_ENUM_BITWISE_OPERATORS(ClearFlagBit);

enum class BarrierType : uint32_t {
    FULL,
    SPLIT_BEGIN,
    SPLIT_END,
};
CC_ENUM_BITWISE_OPERATORS(BarrierType);

enum class PassType : uint32_t {
    RASTER,
    COMPUTE,
    COPY,
    MOVE,
    RAYTRACE,
    PRESENT,
};
CC_ENUM_CONVERSION_OPERATOR(PassType);

#define EXPOSE_COPY_FN(type)      \
    type &copy(const type &rhs) { \
        *this = rhs;              \
        return *this;             \
    }

struct Size {
    uint32_t x{0};
    uint32_t y{0};
    uint32_t z{0};

    EXPOSE_COPY_FN(Size)
};

struct DeviceCaps {
    uint32_t maxVertexAttributes{0};
    uint32_t maxVertexUniformVectors{0};
    uint32_t maxFragmentUniformVectors{0};
    uint32_t maxTextureUnits{0};
    uint32_t maxImageUnits{0};
    uint32_t maxVertexTextureUnits{0};
    uint32_t maxColorRenderTargets{0};
    uint32_t maxShaderStorageBufferBindings{0};
    uint32_t maxShaderStorageBlockSize{0};
    uint32_t maxUniformBufferBindings{0};
    uint32_t maxUniformBlockSize{0};
    uint32_t maxTextureSize{0};
    uint32_t maxCubeMapTextureSize{0};
    uint32_t maxArrayTextureLayers{0};
    uint32_t max3DTextureSize{0};
    uint32_t uboOffsetAlignment{1};

    uint32_t maxComputeSharedMemorySize{0};
    uint32_t maxComputeWorkGroupInvocations{0};
    Size maxComputeWorkGroupSize;
    Size maxComputeWorkGroupCount;

    bool supportQuery{false};
    bool supportVariableRateShading{false};
    bool supportSubPassShading{false};

    float clipSpaceMinZ{-1.F};
    float screenSpaceSignY{1.F};
    float clipSpaceSignY{1.F};

    EXPOSE_COPY_FN(DeviceCaps)
};

struct DeviceOptions {
    // whether deduce barrier in gfx internally.
    // if you wanna do the barrier thing by yourself
    // on the top of gfx layer, set it to false.
    bool enableBarrierDeduce{true};
};

struct Offset {
    int32_t x{0};
    int32_t y{0};
    int32_t z{0};

    EXPOSE_COPY_FN(Offset)
};

struct Rect {
    int32_t x{0};
    int32_t y{0};
    uint32_t width{0};
    uint32_t height{0};

    EXPOSE_COPY_FN(Rect)
};

struct Extent {
    uint32_t width{0};
    uint32_t height{0};
    uint32_t depth{1};

    EXPOSE_COPY_FN(Extent)
};

struct TextureSubresLayers {
    uint32_t mipLevel{0};
    uint32_t baseArrayLayer{0};
    uint32_t layerCount{1};

    EXPOSE_COPY_FN(TextureSubresLayers)
};

struct TextureSubresRange {
    uint32_t baseMipLevel{0};
    uint32_t levelCount{1};
    uint32_t baseArrayLayer{0};
    uint32_t layerCount{1};

    EXPOSE_COPY_FN(TextureSubresRange)
};

struct TextureCopy {
    TextureSubresLayers srcSubres;
    Offset srcOffset;
    TextureSubresLayers dstSubres;
    Offset dstOffset;
    Extent extent;

    EXPOSE_COPY_FN(TextureCopy)
};

struct TextureBlit {
    TextureSubresLayers srcSubres;
    Offset srcOffset;
    Extent srcExtent;
    TextureSubresLayers dstSubres;
    Offset dstOffset;
    Extent dstExtent;

    EXPOSE_COPY_FN(TextureBlit)
};
using TextureBlitList = ccstd::vector<TextureBlit>;

struct BufferTextureCopy {
    uint32_t buffOffset{0};
    uint32_t buffStride{0};
    uint32_t buffTexHeight{0};
    Offset texOffset;
    Extent texExtent;
    TextureSubresLayers texSubres;

    EXPOSE_COPY_FN(BufferTextureCopy)
};
using BufferTextureCopyList = ccstd::vector<BufferTextureCopy>;

struct Viewport {
    int32_t left{0};
    int32_t top{0};
    uint32_t width{0};
    uint32_t height{0};
    float minDepth{0.F};
    float maxDepth{1.F};

    EXPOSE_COPY_FN(Viewport)

    void reset() {
        *this = Viewport();
    }
};

struct Color {
    float x{0.F};
    float y{0.F};
    float z{0.F};
    float w{0.F};

    EXPOSE_COPY_FN(Color)
};
using ColorList = ccstd::vector<Color>;

struct MarkerInfo {
    ccstd::string name;
    Color color;
};

struct BindingMappingInfo {
    /**
     * For non-vulkan backends, to maintain compatibility and maximize
     * descriptor cache-locality, descriptor-set-based binding numbers need
     * to be mapped to backend-specific bindings based on maximum limit
     * of available descriptor slots in each set.
     *
     * The GFX layer assumes the binding numbers for each descriptor type inside each set
     * are guaranteed to be consecutive, so the mapping procedure is reduced
     * to a simple shifting operation. This data structure specifies the
     * capacity for each descriptor type in each set.
     *
     * The `setIndices` field defines the binding ordering between different sets.
     * The last set index is treated as the 'flexible set', whose capacity is dynamically
     * assigned based on the total available descriptor slots on the runtime device.
     */
    IndexList maxBlockCounts{0};
    IndexList maxSamplerTextureCounts{0};
    IndexList maxSamplerCounts{0};
    IndexList maxTextureCounts{0};
    IndexList maxBufferCounts{0};
    IndexList maxImageCounts{0};
    IndexList maxSubpassInputCounts{0};

    IndexList setIndices{0};

    EXPOSE_COPY_FN(BindingMappingInfo)
};

struct SwapchainInfo {
    uint32_t windowId{0};
    void *windowHandle{nullptr}; // @ts-overrides { type: 'HTMLCanvasElement' }
    VsyncMode vsyncMode{VsyncMode::ON};

    uint32_t width{0};
    uint32_t height{0};

    EXPOSE_COPY_FN(SwapchainInfo)
};

struct DeviceInfo {
    BindingMappingInfo bindingMappingInfo;

    EXPOSE_COPY_FN(DeviceInfo)
};

struct ALIGNAS(8) BufferInfo {
    BufferUsage usage{BufferUsageBit::NONE};
    MemoryUsage memUsage{MemoryUsageBit::NONE};
    uint32_t size{0};
    uint32_t stride{1}; // in bytes
    BufferFlags flags{BufferFlagBit::NONE};
    uint32_t _padding{0};

    EXPOSE_COPY_FN(BufferInfo)
};

struct BufferViewInfo {
    Buffer *buffer{nullptr};
    uint32_t offset{0};
    uint32_t range{0};

    EXPOSE_COPY_FN(BufferViewInfo)
};

struct DrawInfo {
    uint32_t vertexCount{0};
    uint32_t firstVertex{0};
    uint32_t indexCount{0};
    uint32_t firstIndex{0};
    int32_t vertexOffset{0};
    uint32_t instanceCount{0};
    uint32_t firstInstance{0};

    EXPOSE_COPY_FN(DrawInfo)
};

using DrawInfoList = ccstd::vector<DrawInfo>;

struct DispatchInfo {
    uint32_t groupCountX{0};
    uint32_t groupCountY{0};
    uint32_t groupCountZ{0};

    Buffer *indirectBuffer{nullptr}; // @ts-nullable
    uint32_t indirectOffset{0};

    EXPOSE_COPY_FN(DispatchInfo)
};

struct RayTracingInfo {
    //Shader Binding Tables
    Buffer* rayGenSBT;
    Buffer* hitGroupSBT;
    Buffer* missSBT;
    Buffer* callableSBT; 
    // Extent
    uint32_t width{0};
    uint32_t height{0};
    uint32_t depth{1};
    // Indirect
    Buffer *indirectBuffer{nullptr}; // @ts-nullable
    uint32_t indirectOffset{0};

    EXPOSE_COPY_FN(RayTracingInfo)
};

using DispatchInfoList = ccstd::vector<DispatchInfo>;

struct IndirectBuffer {
    DrawInfoList drawInfos;

    EXPOSE_COPY_FN(IndirectBuffer)
};

struct ALIGNAS(8) TextureInfo {
    TextureType type{TextureType::TEX2D};
    TextureUsage usage{TextureUsageBit::NONE};
    Format format{Format::UNKNOWN};
    uint32_t width{0};
    uint32_t height{0};
    TextureFlags flags{TextureFlagBit::NONE};
    uint32_t layerCount{1};
    uint32_t levelCount{1};
    SampleCount samples{SampleCount::X1};
    uint32_t depth{1};
    void *externalRes{nullptr}; // CVPixelBuffer for Metal, EGLImage for GLES
#if CC_CPU_ARCH == CC_CPU_ARCH_32
    uint32_t _padding{0};
#endif

    EXPOSE_COPY_FN(TextureInfo)
};

struct ALIGNAS(8) TextureViewInfo {
    Texture *texture{nullptr};
    TextureType type{TextureType::TEX2D};
    Format format{Format::UNKNOWN};
    uint32_t baseLevel{0};
    uint32_t levelCount{1};
    uint32_t baseLayer{0};
    uint32_t layerCount{1};
    uint32_t basePlane{0};
    uint32_t planeCount{1};
#if CC_CPU_ARCH == CC_CPU_ARCH_32
    uint32_t _padding{0};
#endif

    EXPOSE_COPY_FN(TextureViewInfo)
};

struct ALIGNAS(8) SamplerInfo {
    Filter minFilter{Filter::LINEAR};
    Filter magFilter{Filter::LINEAR};
    Filter mipFilter{Filter::NONE};
    Address addressU{Address::WRAP};
    Address addressV{Address::WRAP};
    Address addressW{Address::WRAP};
    uint32_t maxAnisotropy{0};
    ComparisonFunc cmpFunc{ComparisonFunc::ALWAYS};

    EXPOSE_COPY_FN(SamplerInfo)
};

struct Uniform {
    ccstd::string name;
    Type type{Type::UNKNOWN};
    uint32_t count{0};

    EXPOSE_COPY_FN(Uniform)
};

using UniformList = ccstd::vector<Uniform>;

struct UniformBlock {
    uint32_t set{0};
    uint32_t binding{0};
    ccstd::string name;
    UniformList members;
    uint32_t count{0};
    uint32_t flattened{0};

    EXPOSE_COPY_FN(UniformBlock)
};

using UniformBlockList = ccstd::vector<UniformBlock>;

struct UniformSamplerTexture {
    uint32_t set{0};
    uint32_t binding{0};
    ccstd::string name;
    Type type{Type::UNKNOWN};
    uint32_t count{0};
    uint32_t flattened{0};

    EXPOSE_COPY_FN(UniformSamplerTexture)
};

using UniformSamplerTextureList = ccstd::vector<UniformSamplerTexture>;

struct UniformSampler {
    uint32_t set{0};
    uint32_t binding{0};
    ccstd::string name;
    uint32_t count{0};
    uint32_t flattened{0};

    EXPOSE_COPY_FN(UniformSampler)
};

using UniformSamplerList = ccstd::vector<UniformSampler>;

struct UniformTexture {
    uint32_t set{0};
    uint32_t binding{0};
    ccstd::string name;
    Type type{Type::UNKNOWN};
    uint32_t count{0};
    uint32_t flattened{0};

    EXPOSE_COPY_FN(UniformTexture)
};

using UniformTextureList = ccstd::vector<UniformTexture>;

struct AccelerationStructureLayout {
    uint32_t set{0};
    uint32_t binding{0};
    ccstd::string name;
    Type type{Type::UNKNOWN};
    uint32_t count{0};

    EXPOSE_COPY_FN(AccelerationStructureLayout)
};

struct UniformStorageImage {
    uint32_t set{0};
    uint32_t binding{0};
    ccstd::string name;
    Type type{Type::UNKNOWN};
    uint32_t count{0};
    MemoryAccess memoryAccess{MemoryAccessBit::READ_WRITE};
    uint32_t flattened{0};

    EXPOSE_COPY_FN(UniformStorageImage)
};

using UniformStorageImageList = ccstd::vector<UniformStorageImage>;

struct UniformStorageBuffer {
    uint32_t set{0};
    uint32_t binding{0};
    ccstd::string name;
    uint32_t count{0};
    MemoryAccess memoryAccess{MemoryAccessBit::READ_WRITE};
    uint32_t flattened{0};

    EXPOSE_COPY_FN(UniformStorageBuffer)
};

using UniformStorageBufferList = ccstd::vector<UniformStorageBuffer>;

struct UniformInputAttachment {
    uint32_t set{0};
    uint32_t binding{0};
    ccstd::string name;
    uint32_t count{0};
    uint32_t flattened{0};

    EXPOSE_COPY_FN(UniformInputAttachment)
};

using UniformInputAttachmentList = ccstd::vector<UniformInputAttachment>;

struct ShaderStage {
    ShaderStageFlagBit stage{ShaderStageFlagBit::NONE};
    ccstd::string source;

    EXPOSE_COPY_FN(ShaderStage)
};

using ShaderStageList = ccstd::vector<ShaderStage>;

struct Attribute {
    ccstd::string name;
    Format format{Format::UNKNOWN};
    bool isNormalized{false};
    uint32_t stream{0};
    bool isInstanced{false};
    uint32_t location{0};

    EXPOSE_COPY_FN(Attribute)
};

enum class ASGeometryFlagBit : uint32_t {
    GEOMETRY_OPAQUE = 0x1,
    COUNT
};

CC_ENUM_BITWISE_OPERATORS(ASGeometryFlagBit);
using ASGeometryFlags = ASGeometryFlagBit;

enum class ASBuildFlagBits : uint32_t {
    ALLOW_UPDATE = 0x1,
    ALLOW_COMPACTION = 0x2,
    PREFER_FAST_TRACE = 0x4,
    PREFER_FAST_BUILD = 0x8,
    LOW_MEMORY = 0x10,
};

CC_ENUM_BITWISE_OPERATORS(ASBuildFlagBits);
using ASBuildFlags = ASBuildFlagBits;

enum class GeometryInstanceFlagBits : uint32_t {
    TRIANGLE_FACING_CULL_DISABLE = 0x1,
    TRIANGLE_FLIP_FACING = 0x2,
    FORCE_OPAQUE = 0x4,
    FORCE_NO_OPAQUE = 0x8,
    TRIANGLE_FRONT_COUNTERCLOCKWISE_BIT_KHR = TRIANGLE_FLIP_FACING,
    COUNT
};

CC_ENUM_BITWISE_OPERATORS(GeometryInstanceFlagBits);
using GeometryInstanceFlags = GeometryInstanceFlagBits;

struct ASTriangleMesh {
    ASGeometryFlags flag;
    Format vertexFormat;
    uint32_t vertexCount;
    uint32_t vertexStride;
    uint32_t indexCount;
    Buffer* vertexBuffer;
    Buffer* indexBuffer;

    bool operator==(const ASTriangleMesh& other) const {
        return flag == other.flag && vertexBuffer == other.vertexBuffer && indexBuffer == other.indexBuffer
            && vertexFormat == other.vertexFormat && vertexCount == other.vertexCount && vertexStride == other.vertexStride;
    }
};

struct ASAABB {
    ASGeometryFlags flag;
    float minX;
    float minY;
    float minZ;
    float maxX;
    float maxY;
    float maxZ;

    bool operator==(const ASAABB& other) const {
        return minX == other.minX && minY == other.minY && minZ == other.minZ &&
               maxX == other.maxX && maxY == other.maxY && maxZ == other.maxZ;
    }
};

struct ASInstance {
    Mat4 transform{};
    uint32_t instanceCustomIdx;
    uint32_t mask;
    uint32_t shaderBindingTableRecordOffset;//The index of the first geometry of the instance in the Hit Group SBT.
    GeometryInstanceFlags flags;
    AccelerationStructure *accelerationStructureRef;
};

struct AccelerationStructureInfo{
    ccstd::vector<ASTriangleMesh> triangleMeshes;
    ccstd::vector<ASAABB> aabbs;
    ccstd::vector<ASInstance> instances;
    ASBuildFlags buildFlag;

    bool operator==(const AccelerationStructureInfo& other) const {
        return buildFlag == other.buildFlag && aabbs == other.aabbs && triangleMeshes == other.triangleMeshes;
    }
};

using AttributeList = ccstd::vector<Attribute>;

constexpr const char *ATTR_NAME_POSITION = "a_position";
constexpr const char *ATTR_NAME_NORMAL = "a_normal";
constexpr const char *ATTR_NAME_TANGENT = "a_tangent";
constexpr const char *ATTR_NAME_BITANGENT = "a_bitangent";
constexpr const char *ATTR_NAME_WEIGHTS = "a_weights";
constexpr const char *ATTR_NAME_JOINTS = "a_joints";
constexpr const char *ATTR_NAME_COLOR = "a_color";
constexpr const char *ATTR_NAME_COLOR1 = "a_color1";
constexpr const char *ATTR_NAME_COLOR2 = "a_color2";
constexpr const char *ATTR_NAME_TEX_COORD = "a_texCoord";
constexpr const char *ATTR_NAME_TEX_COORD1 = "a_texCoord1";
constexpr const char *ATTR_NAME_TEX_COORD2 = "a_texCoord2";
constexpr const char *ATTR_NAME_TEX_COORD3 = "a_texCoord3";
constexpr const char *ATTR_NAME_TEX_COORD4 = "a_texCoord4";
constexpr const char *ATTR_NAME_TEX_COORD5 = "a_texCoord5";
constexpr const char *ATTR_NAME_TEX_COORD6 = "a_texCoord6";
constexpr const char *ATTR_NAME_TEX_COORD7 = "a_texCoord7";
constexpr const char *ATTR_NAME_TEX_COORD8 = "a_texCoord8";
constexpr const char *ATTR_NAME_BATCH_ID = "a_batch_id";
constexpr const char *ATTR_NAME_BATCH_UV = "a_batch_uv";

struct ShaderInfo {
    ccstd::string name;
    ShaderStageList stages;
    AttributeList attributes;
    UniformBlockList blocks;
    UniformStorageBufferList buffers;
    UniformSamplerTextureList samplerTextures;
    UniformSamplerList samplers;
    UniformTextureList textures;
    UniformStorageImageList images;
    UniformInputAttachmentList subpassInputs;
    ccstd::hash_t hash = INVALID_SHADER_HASH;

    EXPOSE_COPY_FN(ShaderInfo)
};

struct InputAssemblerInfo {
    AttributeList attributes;
    BufferList vertexBuffers;
    Buffer *indexBuffer{nullptr};    // @ts-nullable
    Buffer *indirectBuffer{nullptr}; // @ts-nullable

    EXPOSE_COPY_FN(InputAssemblerInfo)
};

struct ALIGNAS(8) ColorAttachment {
    Format format{Format::UNKNOWN};
    SampleCount sampleCount{SampleCount::X1};
    LoadOp loadOp{LoadOp::CLEAR};
    StoreOp storeOp{StoreOp::STORE};
    GeneralBarrier *barrier{nullptr};
#if CC_CPU_ARCH == CC_CPU_ARCH_32
    uint32_t _padding{0};
#endif
    EXPOSE_COPY_FN(ColorAttachment)
};

using ColorAttachmentList = ccstd::vector<ColorAttachment>;

struct ALIGNAS(8) DepthStencilAttachment {
    Format format{Format::UNKNOWN};
    SampleCount sampleCount{SampleCount::X1};
    LoadOp depthLoadOp{LoadOp::CLEAR};
    StoreOp depthStoreOp{StoreOp::STORE};
    LoadOp stencilLoadOp{LoadOp::CLEAR};
    StoreOp stencilStoreOp{StoreOp::STORE};
    GeneralBarrier *barrier{nullptr};
#if CC_CPU_ARCH == CC_CPU_ARCH_32
    uint32_t _padding{0};
#endif
    EXPOSE_COPY_FN(DepthStencilAttachment)
};

struct SubpassInfo {
    IndexList inputs;
    IndexList colors;
    IndexList resolves;
    IndexList preserves;

    uint32_t depthStencil{INVALID_BINDING};
    uint32_t depthStencilResolve{INVALID_BINDING};
    uint32_t shadingRate{INVALID_BINDING};
    ResolveMode depthResolveMode{ResolveMode::NONE};
    ResolveMode stencilResolveMode{ResolveMode::NONE};

    EXPOSE_COPY_FN(SubpassInfo)
};

using SubpassInfoList = ccstd::vector<SubpassInfo>;

struct ALIGNAS(8) SubpassDependency {
    uint32_t srcSubpass{0};
    uint32_t dstSubpass{0};
    GeneralBarrier *generalBarrier{nullptr};

    AccessFlags prevAccesses{AccessFlagBit::NONE};
    AccessFlags nextAccesses{AccessFlagBit::NONE};

    EXPOSE_COPY_FN(SubpassDependency)
};

using SubpassDependencyList = ccstd::vector<SubpassDependency>;

struct RenderPassInfo {
    ColorAttachmentList colorAttachments;
    DepthStencilAttachment depthStencilAttachment;
    DepthStencilAttachment depthStencilResolveAttachment;
    SubpassInfoList subpasses;
    SubpassDependencyList dependencies;

    EXPOSE_COPY_FN(RenderPassInfo)
};

struct ResourceRange {
    uint32_t width{0};
    uint32_t height{0};
    uint32_t depthOrArraySize{0};
    uint32_t firstSlice{0};
    uint32_t numSlices{0};
    uint32_t mipLevel{0};
    uint32_t levelCount{0};
    uint32_t basePlane{0};
    uint32_t planeCount{0};
};

struct ALIGNAS(8) GeneralBarrierInfo {
    AccessFlags prevAccesses{AccessFlagBit::NONE};
    AccessFlags nextAccesses{AccessFlagBit::NONE};

    BarrierType type{BarrierType::FULL};
    uint32_t _padding{0};

    EXPOSE_COPY_FN(GeneralBarrierInfo)
};
using GeneralBarrierInfoList = ccstd::vector<GeneralBarrierInfo>;

struct ALIGNAS(8) TextureBarrierInfo {
    AccessFlags prevAccesses{AccessFlagBit::NONE};
    AccessFlags nextAccesses{AccessFlagBit::NONE};

    BarrierType type{BarrierType::FULL};

    ResourceRange range{};
    uint64_t discardContents{0}; // @ts-boolean

    Queue *srcQueue{nullptr}; // @ts-nullable
    Queue *dstQueue{nullptr}; // @ts-nullable

    EXPOSE_COPY_FN(TextureBarrierInfo)
};
using TextureBarrierInfoList = ccstd::vector<TextureBarrierInfo>;

struct ALIGNAS(8) BufferBarrierInfo {
    AccessFlags prevAccesses{AccessFlagBit::NONE};
    AccessFlags nextAccesses{AccessFlagBit::NONE};

    BarrierType type{BarrierType::FULL};

    uint32_t offset{0};
    uint32_t size{0};
    uint32_t _padding{0};
    uint64_t discardContents{0}; // @ts-boolean

    Queue *srcQueue{nullptr}; // @ts-nullable
    Queue *dstQueue{nullptr}; // @ts-nullable

    EXPOSE_COPY_FN(BufferBarrierInfo)
};
using BufferBarrierInfoList = ccstd::vector<BufferBarrierInfo>;

struct FramebufferInfo {
    RenderPass *renderPass{nullptr};
    TextureList colorTextures;
    Texture *depthStencilTexture{nullptr}; // @ts-nullable
    Texture *depthStencilResolveTexture{nullptr}; // @ts-nullable

    EXPOSE_COPY_FN(FramebufferInfo)
};

struct DescriptorSetLayoutBinding {
    uint32_t binding{INVALID_BINDING};
    DescriptorType descriptorType{DescriptorType::UNKNOWN};
    uint32_t count{0};
    ShaderStageFlags stageFlags{ShaderStageFlagBit::NONE};
    SamplerList immutableSamplers;

    EXPOSE_COPY_FN(DescriptorSetLayoutBinding)
};
using DescriptorSetLayoutBindingList = ccstd::vector<DescriptorSetLayoutBinding>;

struct DescriptorSetLayoutInfo {
    DescriptorSetLayoutBindingList bindings;

    EXPOSE_COPY_FN(DescriptorSetLayoutInfo)
};

struct DescriptorSetInfo {
    const DescriptorSetLayout *layout{nullptr};

    EXPOSE_COPY_FN(DescriptorSetInfo)
};

struct PipelineLayoutInfo {
    DescriptorSetLayoutList setLayouts;

    EXPOSE_COPY_FN(PipelineLayoutInfo)
};

struct InputState {
    AttributeList attributes;

    EXPOSE_COPY_FN(InputState)
};

// The memory layout of this structure should exactly match a plain `Uint32Array`
struct RasterizerState {
    uint32_t isDiscard{0}; // @ts-boolean
    PolygonMode polygonMode{PolygonMode::FILL};
    ShadeModel shadeModel{ShadeModel::GOURAND};
    CullMode cullMode{CullMode::BACK};
    uint32_t isFrontFaceCCW{1};   // @ts-boolean
    uint32_t depthBiasEnabled{0}; // @ts-boolean
    float depthBias{0.F};
    float depthBiasClamp{0.F};
    float depthBiasSlop{0.F};
    uint32_t isDepthClip{1};   // @ts-boolean
    uint32_t isMultisample{0}; // @ts-boolean
    float lineWidth{1.F};

    void reset() {
        *this = RasterizerState();
    }

    EXPOSE_COPY_FN(RasterizerState)
};

// The memory layout of this structure should exactly match a plain `Uint32Array`
struct DepthStencilState {
    uint32_t depthTest{1};  // @ts-boolean
    uint32_t depthWrite{1}; // @ts-boolean
    ComparisonFunc depthFunc{ComparisonFunc::LESS};
    uint32_t stencilTestFront{0}; // @ts-boolean
    ComparisonFunc stencilFuncFront{ComparisonFunc::ALWAYS};
    uint32_t stencilReadMaskFront{0xffffffff};
    uint32_t stencilWriteMaskFront{0xffffffff};
    StencilOp stencilFailOpFront{StencilOp::KEEP};
    StencilOp stencilZFailOpFront{StencilOp::KEEP};
    StencilOp stencilPassOpFront{StencilOp::KEEP};
    uint32_t stencilRefFront{1};
    uint32_t stencilTestBack{0}; // @ts-boolean
    ComparisonFunc stencilFuncBack{ComparisonFunc::ALWAYS};
    uint32_t stencilReadMaskBack{0xffffffff};
    uint32_t stencilWriteMaskBack{0xffffffff};
    StencilOp stencilFailOpBack{StencilOp::KEEP};
    StencilOp stencilZFailOpBack{StencilOp::KEEP};
    StencilOp stencilPassOpBack{StencilOp::KEEP};
    uint32_t stencilRefBack{1};

    void reset() {
        *this = DepthStencilState();
    }

    EXPOSE_COPY_FN(DepthStencilState)
};

struct BlendTarget {
    uint32_t blend{0}; // @ts-boolean
    BlendFactor blendSrc{BlendFactor::ONE};
    BlendFactor blendDst{BlendFactor::ZERO};
    BlendOp blendEq{BlendOp::ADD};
    BlendFactor blendSrcAlpha{BlendFactor::ONE};
    BlendFactor blendDstAlpha{BlendFactor::ZERO};
    BlendOp blendAlphaEq{BlendOp::ADD};
    ColorMask blendColorMask{ColorMask::ALL};

    void reset() {
        *this = BlendTarget();
    }

    EXPOSE_COPY_FN(BlendTarget)
};

using BlendTargetList = ccstd::vector<BlendTarget>;

// The memory layout of this structure should exactly match a plain `Uint32Array`
struct BlendState {
    uint32_t isA2C{0};      // @ts-boolean
    uint32_t isIndepend{0}; // @ts-boolean
    Color blendColor;
    BlendTargetList targets{1};

    void setTarget(index_t index, const BlendTarget &target) {
        if (index >= targets.size()) {
            targets.resize(static_cast<size_t>(index) + 1);
        }
        targets[index] = target;
    }

    void reset() {
        *this = BlendState();
    }

    void destroy() {}

    EXPOSE_COPY_FN(BlendState)
};

struct PipelineStateInfo {
    Shader *shader{nullptr};
    PipelineLayout *pipelineLayout{nullptr};
    RenderPass *renderPass{nullptr};
    InputState inputState;
    RasterizerState rasterizerState;
    DepthStencilState depthStencilState;
    BlendState blendState;
    PrimitiveMode primitive{PrimitiveMode::TRIANGLE_LIST};
    DynamicStateFlags dynamicStates{DynamicStateFlagBit::NONE};
    PipelineBindPoint bindPoint{PipelineBindPoint::GRAPHICS};
    uint32_t subpass{0};

    EXPOSE_COPY_FN(PipelineStateInfo)
};

struct CommandBufferInfo {
    Queue *queue{nullptr};
    CommandBufferType type{CommandBufferType::PRIMARY};

    EXPOSE_COPY_FN(CommandBufferInfo)
};

struct QueueInfo {
    QueueType type{QueueType::GRAPHICS};

    EXPOSE_COPY_FN(QueueInfo)
};

struct QueryPoolInfo {
    QueryType type{QueryType::OCCLUSION};
    uint32_t maxQueryObjects{DEFAULT_MAX_QUERY_OBJECTS};
    bool forceWait{true};

    EXPOSE_COPY_FN(QueryPoolInfo)
};

struct FormatInfo {
    ccstd::string name;
    uint32_t size{0};
    uint32_t count{0};
    FormatType type{FormatType::NONE};
    bool hasAlpha{false};
    bool hasDepth{false};
    bool hasStencil{false};
    bool isCompressed{false};
};

struct MemoryStatus {
    uint32_t bufferSize{0};
    uint32_t textureSize{0};

    EXPOSE_COPY_FN(MemoryStatus)
};

struct DynamicStencilStates {
    uint32_t writeMask{0};
    uint32_t compareMask{0};
    uint32_t reference{0};

    EXPOSE_COPY_FN(DynamicStencilStates)
};

struct DynamicStates {
    Viewport viewport;
    Rect scissor;
    Color blendConstant;
    float lineWidth{1.F};
    float depthBiasConstant{0.F};
    float depthBiasClamp{0.F};
    float depthBiasSlope{0.F};
    float depthMinBounds{0.F};
    float depthMaxBounds{0.F};

    DynamicStencilStates stencilStatesFront;
    DynamicStencilStates stencilStatesBack;

    EXPOSE_COPY_FN(DynamicStates)
};

#undef EXPOSE_COPY_FN

} // namespace gfx
} // namespace cc
