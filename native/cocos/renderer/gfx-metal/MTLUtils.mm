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

#include "MTLUtils.h"

#include "MTLDevice.h"
#include "MTLGPUObjects.h"
#include "MTLPipelineState.h"
#include "MTLRenderPass.h"
#include "MTLShader.h"
#include "glslang/StandAlone/ResourceLimits.h"
#include "glslang/SPIRV/GlslangToSpv.h"
#include "spirv_cross/spirv_msl.hpp"
#include "TargetConditionals.h"
#include "base/Log.h"
#include <regex>

namespace cc {
namespace gfx {
namespace {

ccstd::unordered_map<size_t, PipelineState *> pipelineMap;
ccstd::unordered_map<size_t, RenderPass *> renderPassMap;

EShLanguage getShaderStage(ShaderStageFlagBit type) {
    switch (type) {
        case ShaderStageFlagBit::VERTEX: return EShLangVertex;
        case ShaderStageFlagBit::CONTROL: return EShLangTessControl;
        case ShaderStageFlagBit::EVALUATION: return EShLangTessEvaluation;
        case ShaderStageFlagBit::GEOMETRY: return EShLangGeometry;
        case ShaderStageFlagBit::FRAGMENT: return EShLangFragment;
        case ShaderStageFlagBit::COMPUTE: return EShLangCompute;
        default: {
            CC_ABORT();
            return EShLangVertex;
        }
    }
}

glslang::EShTargetClientVersion getClientVersion(int vulkanMinorVersion) {
    switch (vulkanMinorVersion) {
        case 0: return glslang::EShTargetVulkan_1_0;
        case 1: return glslang::EShTargetVulkan_1_1;
        case 2: return glslang::EShTargetVulkan_1_2;
        default: {
            CC_ABORT();
            return glslang::EShTargetVulkan_1_0;
        }
    }
}

glslang::EShTargetLanguageVersion getTargetVersion(int vulkanMinorVersion) {
    switch (vulkanMinorVersion) {
        case 0: return glslang::EShTargetSpv_1_0;
        case 1: return glslang::EShTargetSpv_1_3;
        case 2: return glslang::EShTargetSpv_1_5;
        default: {
            CC_ABORT();
            return glslang::EShTargetSpv_1_0;
        }
    }
}

//See more details at https://developer.apple.com/documentation/metal/mtlfeatureset
enum class GPUFamily {
    Apple1, // A7,
    Apple2, // A8
    Apple3, // A9, A10
    Apple4, // A11
    Apple5, // A12
    Apple6, // A13

    Mac1,
    Mac2,
};

#if CC_PLATFORM == CC_PLATFORM_IOS
ccstd::string getIOSFeatureSetToString(MTLFeatureSet featureSet) {
    if (@available(iOS 11.0, *)) {
        switch (featureSet) {
            case MTLFeatureSet_iOS_GPUFamily1_v4:
                return "MTLFeatureSet_iOS_GPUFamily2_v4";
            case MTLFeatureSet_iOS_GPUFamily2_v3:
                return "MTLFeatureSet_iOS_GPUFamily2_v3";
            case MTLFeatureSet_iOS_GPUFamily3_v3:
                return "MTLFeatureSet_iOS_GPUFamily3_v3";
            case MTLFeatureSet_iOS_GPUFamily4_v1:
                return "MTLFeatureSet_iOS_GPUFamily4_v1";
            default:
                break;
        }
    }
    if (@available(iOS 12.0, *)) {
        switch (featureSet) {
            case MTLFeatureSet_iOS_GPUFamily1_v5:
                return "MTLFeatureSet_iOS_GPUFamily1_v5";
            case MTLFeatureSet_iOS_GPUFamily2_v5:
                return "MTLFeatureSet_iOS_GPUFamily2_v5";
            case MTLFeatureSet_iOS_GPUFamily3_v4:
                return "MTLFeatureSet_iOS_GPUFamily3_v4";
            case MTLFeatureSet_iOS_GPUFamily4_v2:
                return "MTLFeatureSet_iOS_GPUFamily4_v2";
            default:
                break;
        }
    }
    return "Invalid metal feature set";
}

GPUFamily getIOSGPUFamily(MTLFeatureSet featureSet) {
    if (@available(iOS 12.0, *)) {
        switch (featureSet) {
            case MTLFeatureSet_iOS_GPUFamily1_v5:
                return GPUFamily::Apple1;
            case MTLFeatureSet_iOS_GPUFamily2_v5:
                return GPUFamily::Apple2;
            case MTLFeatureSet_iOS_GPUFamily3_v4:
                return GPUFamily::Apple3;
            case MTLFeatureSet_iOS_GPUFamily4_v2:
                return GPUFamily::Apple4;
            default:
                break;
        }
    }
    if (@available(iOS 11.0, *)) {
        switch (featureSet) {
            case MTLFeatureSet_iOS_GPUFamily1_v4:
                return GPUFamily::Apple1;
            case MTLFeatureSet_iOS_GPUFamily2_v4:
                return GPUFamily::Apple2;
            case MTLFeatureSet_iOS_GPUFamily3_v3:
                return GPUFamily::Apple3;
            case MTLFeatureSet_iOS_GPUFamily4_v1:
                return GPUFamily::Apple4;
            default:
                break;
        }
    }
    return GPUFamily::Apple1;
}
#else
ccstd::string getMacFeatureSetToString(MTLFeatureSet featureSet) {
    if (@available(macOS 10.14, *)) {
        switch (featureSet) {
            case MTLFeatureSet_macOS_GPUFamily1_v4:
                return "MTLFeatureSet_macOS_GPUFamily1_v4";
            case MTLFeatureSet_macOS_GPUFamily2_v1:
                return "MTLFeatureSet_macOS_GPUFamily2_v1";
            default:
                break;
        }
    }
    return "Invalid metal feature set";
}

GPUFamily getMacGPUFamily(MTLFeatureSet featureSet) {
    if (@available(macOS 10.14, *)) {
        if (MTLFeatureSet_macOS_GPUFamily2_v1 <= featureSet) {
            return GPUFamily::Mac2;
        }
    }
    return GPUFamily::Mac1;
}
#endif

bool isASTCFormat(Format format) {
    switch (format) {
        case Format::ASTC_RGBA_4X4:
        case Format::ASTC_SRGBA_4X4:
        case Format::ASTC_RGBA_5X4:
        case Format::ASTC_SRGBA_5X4:
        case Format::ASTC_RGBA_5X5:
        case Format::ASTC_SRGBA_5X5:
        case Format::ASTC_RGBA_6X5:
        case Format::ASTC_SRGBA_6X5:
        case Format::ASTC_RGBA_6X6:
        case Format::ASTC_SRGBA_6X6:
        case Format::ASTC_RGBA_8X5:
        case Format::ASTC_SRGBA_8X5:
        case Format::ASTC_RGBA_8X6:
        case Format::ASTC_SRGBA_8X6:
        case Format::ASTC_RGBA_8X8:
        case Format::ASTC_SRGBA_8X8:
        case Format::ASTC_RGBA_10X5:
        case Format::ASTC_SRGBA_10X5:
        case Format::ASTC_RGBA_10X6:
        case Format::ASTC_SRGBA_10X6:
        case Format::ASTC_RGBA_10X8:
        case Format::ASTC_SRGBA_10X8:
        case Format::ASTC_RGBA_10X10:
        case Format::ASTC_SRGBA_10X10:
        case Format::ASTC_RGBA_12X10:
        case Format::ASTC_SRGBA_12X10:
        case Format::ASTC_RGBA_12X12:
        case Format::ASTC_SRGBA_12X12:
            return true;
        default:
            return false;
    }
}

gfx::Shader *createShader(CCMTLDevice *device, CCMTLRenderPass *renderPass) {
    ccstd::string vs = R"(
            layout(location = 0) in vec2 a_position;
            void main() {
                gl_Position = vec4(a_position, 1.0, 1.0);
            }
    )";
    //    ccstd::string fs = R"(
    //            precision mediump float;
    //            layout(set = 0, binding = 0) uniform Color {
    //                vec4 u_color;
    //            };
    //            layout(location = 0) out vec4 o_color;
    //
    //            void main() {
    //                o_color = u_color;
    //            }
    //    )";

    ccstd::string fs = R"(
            precision mediump float;
            layout(set = 0, binding = 0) uniform Color {
                vec4 u_color;
            };
    )";

    //TODO_Zeqiang: gather info in framegraph.
    if (renderPass->getSubpasses().empty()) {
        for (size_t i = 0; i < renderPass->getColorAttachments().size(); ++i) {
            fs += "\n layout(location = " + std::to_string(i) + ") out vec4 o_color" + std::to_string(i) + ";";
        }

        fs += "\nvoid main() {\n    o_color0 = u_color;\n";

        for (size_t i = 1; i < renderPass->getColorAttachments().size(); ++i) {
            fs += "    o_color" + std::to_string(i) + " = vec4(0.0);\n";
        }
    } else {
        const auto &subpasses = renderPass->getSubpasses();
        for (size_t i = 0; i < subpasses[renderPass->getCurrentSubpassIndex()].colors.size(); ++i) {
            fs += "\n layout(location = " + std::to_string(i) + ") out vec4 o_color" + std::to_string(i) + ";";
        }

        fs += "\nvoid main() {\n    o_color0 = u_color;\n";

        for (size_t i = 1; i < subpasses[renderPass->getCurrentSubpassIndex()].colors.size(); ++i) {
            fs += "    o_color" + std::to_string(i) + " = vec4(0.0);\n";
        }
    }

    fs += "}";

    gfx::ShaderStageList shaderStageList;
    gfx::ShaderStage vertexShaderStage;
    vertexShaderStage.stage = gfx::ShaderStageFlagBit::VERTEX;
    vertexShaderStage.source = std::move(vs);
    shaderStageList.emplace_back(std::move(vertexShaderStage));

    gfx::ShaderStage fragmentShaderStage;
    fragmentShaderStage.stage = gfx::ShaderStageFlagBit::FRAGMENT;
    fragmentShaderStage.source = std::move(fs);
    shaderStageList.emplace_back(std::move(fragmentShaderStage));

    gfx::UniformBlockList uniformBlockList = {
        {0, 0, "Color", {{"u_color", gfx::Type::FLOAT4, 1}}, 1},
    };
    gfx::AttributeList attributeList = {{"a_position", gfx::Format::RG32F, false, 0, false, 0}};

    gfx::ShaderInfo shaderInfo;
    shaderInfo.name = "Clear Render Area";
    shaderInfo.stages = std::move(shaderStageList);
    shaderInfo.attributes = std::move(attributeList);
    shaderInfo.blocks = std::move(uniformBlockList);
    return device->createShader(shaderInfo);
}

CCMTLGPUPipelineState *getClearRenderPassPipelineState(CCMTLDevice *device, RenderPass *curPass) {
    ccstd::hash_t rpHash = curPass->getHash();
    const auto iter = pipelineMap.find(rpHash);
    if (iter != pipelineMap.end()) {
        auto *ccMtlPiplineState = static_cast<CCMTLPipelineState *>(iter->second);
        return ccMtlPiplineState->getGPUPipelineState();
    }

    gfx::Attribute position = {"a_position", gfx::Format::RG32F, false, 0, false};
    gfx::PipelineStateInfo pipelineInfo;
    pipelineInfo.primitive = gfx::PrimitiveMode::TRIANGLE_LIST;
    pipelineInfo.shader = createShader(device, static_cast<CCMTLRenderPass *>(curPass));
    pipelineInfo.inputState = {{position}};
    pipelineInfo.renderPass = curPass;

    DepthStencilState dsState;
    dsState.depthWrite = curPass->getDepthStencilAttachment().format != Format::UNKNOWN;
    dsState.depthTest = 0;
    dsState.depthFunc = ComparisonFunc::ALWAYS;
    pipelineInfo.depthStencilState = dsState;

    PipelineState *pipelineState = device->createPipelineState(std::move(pipelineInfo));
    pipelineMap.emplace(curPass->getHash(), pipelineState);
    ((CCMTLPipelineState *)pipelineState)->check();
    delete pipelineInfo.shader;
    return static_cast<CCMTLPipelineState *>(pipelineState)->getGPUPipelineState();
}
} // namespace

MTLResourceOptions mu::toMTLResourceOption(MemoryUsage usage) {
    if (usage & MemoryUsage::HOST && usage & MemoryUsage::DEVICE)
        return MTLResourceStorageModeShared;
    else if (hasFlag(MemoryUsage::DEVICE, usage))
        return MTLResourceStorageModePrivate;
    else
#if (CC_PLATFORM == CC_PLATFORM_IOS)
        return MTLResourceStorageModeShared;
#else
        return MTLResourceStorageModeManaged;
#endif
}

MTLLoadAction mu::toMTLLoadAction(LoadOp op) {
    switch (op) {
        case LoadOp::CLEAR: return MTLLoadActionClear;
        case LoadOp::LOAD: return MTLLoadActionLoad;
        case LoadOp::DISCARD: return MTLLoadActionDontCare;
    }
}

MTLStoreAction mu::toMTLStoreAction(StoreOp op) {
    switch (op) {
        case StoreOp::STORE: return MTLStoreActionStore;
        case StoreOp::DISCARD: return MTLStoreActionDontCare;
    }
}

MTLStoreAction mu::toMTLMSAAStoreAction(StoreOp op) {
    switch (op) {
        case StoreOp::STORE: return MTLStoreActionMultisampleResolve;
        case StoreOp::DISCARD: return MTLStoreActionStoreAndMultisampleResolve;
        default: return MTLStoreActionUnknown;
    }
}

MTLClearColor mu::toMTLClearColor(const Color &clearColor) {
    return MTLClearColorMake(clearColor.x, clearColor.y, clearColor.z, clearColor.w);
}

MTLMultisampleDepthResolveFilter mu::toMTLDepthResolveMode(ResolveMode mode) {
    switch (mode) {
        case ResolveMode::SAMPLE_ZERO:
            return MTLMultisampleDepthResolveFilterSample0;
        case ResolveMode::MIN:
            return MTLMultisampleDepthResolveFilterMin;
        case ResolveMode::MAX:
            return MTLMultisampleDepthResolveFilterMax;
        default:
            return MTLMultisampleDepthResolveFilterSample0;
    }
}

API_AVAILABLE(ios(12.0))
MTLMultisampleStencilResolveFilter mu::toMTLStencilResolveMode(ResolveMode mode) {
    switch (mode) {
        case ResolveMode::SAMPLE_ZERO:
            return MTLMultisampleStencilResolveFilterSample0;
        case ResolveMode::MIN:
        case ResolveMode::MAX:
        default:
            return MTLMultisampleStencilResolveFilterDepthResolvedSample;
    }
}

MTLVertexFormat mu::toMTLVertexFormat(Format format, bool isNormalized) {
    switch (format) {
        case Format::R32F: return MTLVertexFormatFloat;
        case Format::R32I: return MTLVertexFormatInt;
        case Format::R32UI: return MTLVertexFormatUInt;
        case Format::RG8: return isNormalized ? MTLVertexFormatUChar2Normalized : MTLVertexFormatUChar2;
        case Format::RG8I: return isNormalized ? MTLVertexFormatChar2Normalized : MTLVertexFormatChar2;
        case Format::RG16F: return MTLVertexFormatHalf2;
        case Format::RG16UI: return isNormalized ? MTLVertexFormatUShort2Normalized : MTLVertexFormatUShort2;
        case Format::RG16I: return isNormalized ? MTLVertexFormatShort2Normalized : MTLVertexFormatShort2;
        case Format::RG32I: return MTLVertexFormatInt2;
        case Format::RG32UI: return MTLVertexFormatUInt2;
        case Format::RG32F: return MTLVertexFormatFloat2;
        case Format::RGB8: return isNormalized ? MTLVertexFormatUChar3Normalized : MTLVertexFormatUChar3;
        case Format::RGB8I: return isNormalized ? MTLVertexFormatChar3Normalized : MTLVertexFormatChar3;
        case Format::RGB16I: return isNormalized ? MTLVertexFormatShort3Normalized : MTLVertexFormatShort3;
        case Format::RGB16UI: return isNormalized ? MTLVertexFormatUShort3Normalized : MTLVertexFormatUShort3;
        case Format::RGB16F: return MTLVertexFormatHalf3;
        case Format::RGB32I: return MTLVertexFormatInt3;
        case Format::RGB32UI: return MTLVertexFormatUInt3;
        case Format::RGB32F: return MTLVertexFormatFloat3;
        case Format::RGBA8: return isNormalized ? MTLVertexFormatUChar4Normalized : MTLVertexFormatUChar4;
        case Format::RGBA8I: return isNormalized ? MTLVertexFormatChar4Normalized : MTLVertexFormatChar4;
        case Format::RGBA16I: return isNormalized ? MTLVertexFormatShort4Normalized : MTLVertexFormatShort4;
        case Format::RGBA16UI: return isNormalized ? MTLVertexFormatUShort4Normalized : MTLVertexFormatUShort4;
        case Format::RGBA16F: return MTLVertexFormatHalf4;
        case Format::RGBA32I: return MTLVertexFormatInt4;
        case Format::RGBA32UI: return MTLVertexFormatUInt4;
        case Format::RGBA32F: return MTLVertexFormatFloat4;
        case Format::RGB10A2: return isNormalized ? MTLVertexFormatInt1010102Normalized : MTLVertexFormatInvalid;
        case Format::RGB10A2UI: return isNormalized ? MTLVertexFormatUInt1010102Normalized : MTLVertexFormatInvalid;
        case Format::BGRA8: {
#if CC_PLATFORM == CC_PLATFORM_IOS
            if (@available(iOS 11.0, *)) {
                if (isNormalized) {
                    return MTLVertexFormatUChar4Normalized_BGRA;
                } else {
                    CC_LOG_ERROR("Invalid metal vertex format %u", format);
                    return MTLVertexFormatInvalid;
                }
            }
#else
            if (@available(macOS 10.14, *)) {
                if (isNormalized) {
                    return MTLVertexFormatUChar4Normalized_BGRA;
                } else {
                    CC_LOG_ERROR("Invalid metal vertex format %u", format);
                    return MTLVertexFormatInvalid;
                }
            }
#endif
        }
        default: {
            CC_LOG_ERROR("Invalid vertex format %u", format);
            return MTLVertexFormatInvalid;
        }
    }
}

Format mu::convertGFXPixelFormat(Format format) {
    switch (format) {
        case Format::RGB8: return Format::RGBA8;
        case Format::RGB32F: return Format::RGBA32F;
        default: return format;
    }
}

MTLPixelFormat mu::toMTLPixelFormat(Format format) {
    switch (format) {
        case Format::A8: return MTLPixelFormatA8Unorm;
        case Format::R8: return MTLPixelFormatR8Unorm;
        case Format::R8SN: return MTLPixelFormatR8Snorm;
        case Format::R8UI: return MTLPixelFormatR8Uint;
        case Format::R16F: return MTLPixelFormatR16Float;
        case Format::R32F: return MTLPixelFormatR32Float;
        case Format::R32UI: return MTLPixelFormatR32Uint;
        case Format::R32I: return MTLPixelFormatR32Sint;

        case Format::RG8: return MTLPixelFormatRG8Unorm;
        case Format::RG8SN: return MTLPixelFormatRG8Snorm;
        case Format::RG8UI: return MTLPixelFormatRG8Uint;
        case Format::RG8I: return MTLPixelFormatRG8Sint;
        case Format::RG16F: return MTLPixelFormatRG16Float;
        case Format::RG16UI: return MTLPixelFormatRG16Uint;
        case Format::RG16I:
            return MTLPixelFormatRG16Sint;

            //            case Format::RGB8SN: return MTLPixelFormatRGBA8Snorm;
            //            case Format::RGB8UI: return MTLPixelFormatRGBA8Uint;
            //            case Format::RGB8I: return MTLPixelFormatRGBA8Sint;
            //            case Format::RGB16F: return MTLPixelFormatRGBA16Float;
            //            case Format::RGB16UI: return MTLPixelFormatRGBA16Uint;
            //            case Format::RGB16I: return MTLPixelFormatRGBA16Sint;
            //            case Format::RGB32F: return MTLPixelFormatRGBA32Float;
            //            case Format::RGB32UI: return MTLPixelFormatRGBA32Uint;
            //            case Format::RGB32I: return MTLPixelFormatRGBA32Sint;
            //            case Format::SRGB8: return MTLPixelFormatRGBA8Unorm_sRGB;

        case Format::RGBA8: return MTLPixelFormatRGBA8Unorm;
        case Format::RGBA8SN: return MTLPixelFormatRGBA8Snorm;
        case Format::RGBA8UI: return MTLPixelFormatRGBA8Uint;
        case Format::RGBA8I: return MTLPixelFormatRGBA8Sint;
        case Format::SRGB8_A8: return MTLPixelFormatRGBA8Unorm_sRGB;
        case Format::RGBA16F: return MTLPixelFormatRGBA16Float;
        case Format::RGBA16UI: return MTLPixelFormatRGBA16Uint;
        case Format::RGBA16I: return MTLPixelFormatRGBA16Sint;
        case Format::RGBA32F: return MTLPixelFormatRGBA32Float;
        case Format::RGBA32UI: return MTLPixelFormatRGBA32Uint;
        case Format::RGBA32I: return MTLPixelFormatRGBA32Sint;
        case Format::BGRA8:
            return MTLPixelFormatBGRA8Unorm;

            // Should convert.
            //            case Format::R5G6B5: return MTLPixelFormatB5G6R5Unorm;
            //            case Format::RGB5A1: return MTLPixelFormatBGR5A1Unorm;
            //            case Format::RGBA4: return MTLPixelFormatABGR4Unorm;
            //            case Format::RGB10A2: return MTLPixelFormatBGR10A2Unorm;
        case Format::RGB9E5: return MTLPixelFormatRGB9E5Float;
        case Format::RGB10A2UI: return MTLPixelFormatRGB10A2Uint;
        case Format::R11G11B10F: return MTLPixelFormatRG11B10Float;
        case Format::DEPTH: return MTLPixelFormatDepth32Float;
#if (CC_PLATFORM == CC_PLATFORM_MACOS)
        // FIXME: works fine on imac, but invalid pixel format on intel macbook.
        //case Format::DEPTH_STENCIL: return MTLPixelFormatDepth24Unorm_Stencil8;
        case Format::DEPTH_STENCIL: return MTLPixelFormatDepth32Float_Stencil8;
        case Format::BC1:
        case Format::BC1_ALPHA: return MTLPixelFormatBC1_RGBA;
        case Format::BC1_SRGB_ALPHA: return MTLPixelFormatBC1_RGBA_sRGB;
        case Format::BC2: return MTLPixelFormatBC2_RGBA;
        case Format::BC2_SRGB: return MTLPixelFormatBC2_RGBA_sRGB;
        case Format::BC3: return MTLPixelFormatBC3_RGBA;
        case Format::BC3_SRGB: return MTLPixelFormatBC3_RGBA_sRGB;
        case Format::BC4: return MTLPixelFormatBC4_RUnorm;
        case Format::BC4_SNORM: return MTLPixelFormatBC4_RSnorm;
#else
        case Format::DEPTH_STENCIL: return MTLPixelFormatDepth32Float_Stencil8;
        case Format::ASTC_RGBA_4X4: return MTLPixelFormatASTC_4x4_LDR;
        case Format::ASTC_RGBA_5X4: return MTLPixelFormatASTC_5x4_LDR;
        case Format::ASTC_RGBA_5X5: return MTLPixelFormatASTC_5x5_LDR;
        case Format::ASTC_RGBA_6X5: return MTLPixelFormatASTC_6x5_LDR;
        case Format::ASTC_RGBA_6X6: return MTLPixelFormatASTC_6x6_LDR;
        case Format::ASTC_RGBA_8X5: return MTLPixelFormatASTC_8x5_LDR;
        case Format::ASTC_RGBA_8X6: return MTLPixelFormatASTC_8x6_LDR;
        case Format::ASTC_RGBA_8X8: return MTLPixelFormatASTC_8x8_LDR;
        case Format::ASTC_RGBA_10X5: return MTLPixelFormatASTC_10x5_LDR;
        case Format::ASTC_RGBA_10X6: return MTLPixelFormatASTC_10x6_LDR;
        case Format::ASTC_RGBA_10X8: return MTLPixelFormatASTC_10x8_LDR;
        case Format::ASTC_RGBA_10X10: return MTLPixelFormatASTC_10x10_LDR;
        case Format::ASTC_RGBA_12X10: return MTLPixelFormatASTC_12x10_LDR;
        case Format::ASTC_RGBA_12X12: return MTLPixelFormatASTC_12x12_LDR;

        case Format::ASTC_SRGBA_4X4: return MTLPixelFormatASTC_4x4_sRGB;
        case Format::ASTC_SRGBA_5X4: return MTLPixelFormatASTC_5x4_sRGB;
        case Format::ASTC_SRGBA_5X5: return MTLPixelFormatASTC_5x5_sRGB;
        case Format::ASTC_SRGBA_6X5: return MTLPixelFormatASTC_6x5_sRGB;
        case Format::ASTC_SRGBA_6X6: return MTLPixelFormatASTC_6x6_sRGB;
        case Format::ASTC_SRGBA_8X5: return MTLPixelFormatASTC_8x5_sRGB;
        case Format::ASTC_SRGBA_8X6: return MTLPixelFormatASTC_8x6_sRGB;
        case Format::ASTC_SRGBA_8X8: return MTLPixelFormatASTC_8x8_sRGB;
        case Format::ASTC_SRGBA_10X5: return MTLPixelFormatASTC_10x5_sRGB;
        case Format::ASTC_SRGBA_10X6: return MTLPixelFormatASTC_10x6_sRGB;
        case Format::ASTC_SRGBA_10X8: return MTLPixelFormatASTC_10x8_sRGB;
        case Format::ASTC_SRGBA_10X10: return MTLPixelFormatASTC_10x10_sRGB;
        case Format::ASTC_SRGBA_12X10: return MTLPixelFormatASTC_12x10_sRGB;
        case Format::ASTC_SRGBA_12X12: return MTLPixelFormatASTC_12x12_sRGB;

        case Format::ETC2_RGB8: return MTLPixelFormatETC2_RGB8;
        case Format::ETC2_SRGB8: return MTLPixelFormatETC2_RGB8_sRGB;
        case Format::ETC2_RGB8_A1: return MTLPixelFormatETC2_RGB8A1;
        case Format::ETC2_SRGB8_A1: return MTLPixelFormatETC2_RGB8A1_sRGB;
        case Format::ETC2_RGBA8: return MTLPixelFormatEAC_RGBA8;
        case Format::ETC2_SRGB8_A8: return MTLPixelFormatEAC_RGBA8_sRGB;

        case Format::EAC_R11: return MTLPixelFormatEAC_R11Unorm;
        case Format::EAC_R11SN: return MTLPixelFormatEAC_R11Snorm;
        case Format::EAC_RG11: return MTLPixelFormatEAC_RG11Unorm;
        case Format::EAC_RG11SN: return MTLPixelFormatEAC_RG11Snorm;

        case Format::PVRTC_RGB2: return MTLPixelFormatPVRTC_RGB_2BPP;
        case Format::PVRTC_RGBA2: return MTLPixelFormatPVRTC_RGBA_2BPP;
        case Format::PVRTC_RGB4: return MTLPixelFormatPVRTC_RGB_4BPP;
        case Format::PVRTC_RGBA4: return MTLPixelFormatPVRTC_RGBA_4BPP;
#endif
        default: break;
    }
    CC_LOG_ERROR("Invalid pixel format %u", format);
    return MTLPixelFormatInvalid;
}

MTLColorWriteMask mu::toMTLColorWriteMask(ColorMask mask) {
    switch (mask) {
        case ColorMask::R: return MTLColorWriteMaskRed;
        case ColorMask::G: return MTLColorWriteMaskGreen;
        case ColorMask::B: return MTLColorWriteMaskBlue;
        case ColorMask::A: return MTLColorWriteMaskAlpha;
        case ColorMask::ALL: return MTLColorWriteMaskAll;
        default: return MTLColorWriteMaskNone;
    }
}

MTLBlendFactor mu::toMTLBlendFactor(BlendFactor factor) {
    switch (factor) {
        case BlendFactor::ZERO: return MTLBlendFactorZero;
        case BlendFactor::ONE: return MTLBlendFactorOne;
        case BlendFactor::SRC_ALPHA: return MTLBlendFactorSourceAlpha;
        case BlendFactor::DST_ALPHA: return MTLBlendFactorDestinationAlpha;
        case BlendFactor::ONE_MINUS_SRC_ALPHA: return MTLBlendFactorOneMinusSourceAlpha;
        case BlendFactor::ONE_MINUS_DST_ALPHA: return MTLBlendFactorOneMinusDestinationAlpha;
        case BlendFactor::SRC_COLOR: return MTLBlendFactorSourceColor;
        case BlendFactor::DST_COLOR: return MTLBlendFactorDestinationColor;
        case BlendFactor::ONE_MINUS_SRC_COLOR: return MTLBlendFactorOneMinusSourceColor;
        case BlendFactor::ONE_MINUS_DST_COLOR: return MTLBlendFactorOneMinusDestinationColor;
        case BlendFactor::SRC_ALPHA_SATURATE: return MTLBlendFactorSourceAlphaSaturated;
        default: {
            CC_LOG_ERROR("Unsupported blend factor %u", (uint32_t)factor);
            return MTLBlendFactorZero;
        }
    }
}

MTLBlendOperation mu::toMTLBlendOperation(BlendOp op) {
    switch (op) {
        case BlendOp::ADD: return MTLBlendOperationAdd;
        case BlendOp::SUB: return MTLBlendOperationSubtract;
        case BlendOp::REV_SUB: return MTLBlendOperationReverseSubtract;
        case BlendOp::MIN: return MTLBlendOperationMin;
        case BlendOp::MAX: return MTLBlendOperationMax;
    }
}

MTLCullMode mu::toMTLCullMode(CullMode mode) {
    switch (mode) {
        case CullMode::FRONT: return MTLCullModeFront;
        case CullMode::BACK: return MTLCullModeBack;
        case CullMode::NONE: return MTLCullModeNone;
    }
}

MTLWinding mu::toMTLWinding(bool isFrontFaceCCW) {
    if (isFrontFaceCCW)
        return MTLWindingCounterClockwise;
    else
        return MTLWindingClockwise;
}

MTLViewport mu::toMTLViewport(const Viewport &viewport) {
    MTLViewport mtlViewport;
    mtlViewport.originX = viewport.left;
    mtlViewport.originY = viewport.top;
    mtlViewport.width = viewport.width;
    mtlViewport.height = viewport.height;
    mtlViewport.znear = viewport.minDepth;
    mtlViewport.zfar = viewport.maxDepth;

    return mtlViewport;
}

MTLScissorRect mu::toMTLScissorRect(const Rect &rect) {
    MTLScissorRect scissorRect;
    scissorRect.x = static_cast<NSUInteger>(rect.x);
    scissorRect.y = static_cast<NSUInteger>(rect.y);
    scissorRect.width = rect.width;
    scissorRect.height = rect.height;

    return scissorRect;
}

MTLTriangleFillMode mu::toMTLTriangleFillMode(PolygonMode mode) {
    switch (mode) {
        case PolygonMode::FILL: return MTLTriangleFillModeFill;
        case PolygonMode::LINE: return MTLTriangleFillModeLines;
        case PolygonMode::POINT: {
            CC_LOG_WARNING("Metal doesn't support PolygonMode::POINT, translate to PolygonMode::LINE.");
            return MTLTriangleFillModeLines;
        }
    }
}

MTLDepthClipMode mu::toMTLDepthClipMode(bool isClip) {
    if (isClip)
        return MTLDepthClipModeClip;
    else
        return MTLDepthClipModeClamp;
}

MTLCompareFunction mu::toMTLCompareFunction(ComparisonFunc func) {
    switch (func) {
        case ComparisonFunc::NEVER: return MTLCompareFunctionNever;
        case ComparisonFunc::LESS: return MTLCompareFunctionLess;
        case ComparisonFunc::EQUAL: return MTLCompareFunctionEqual;
        case ComparisonFunc::LESS_EQUAL: return MTLCompareFunctionLessEqual;
        case ComparisonFunc::GREATER: return MTLCompareFunctionGreater;
        case ComparisonFunc::NOT_EQUAL: return MTLCompareFunctionNotEqual;
        case ComparisonFunc::GREATER_EQUAL: return MTLCompareFunctionGreaterEqual;
        case ComparisonFunc::ALWAYS: return MTLCompareFunctionAlways;
        default: return MTLCompareFunctionNever;
    }
}

MTLStencilOperation mu::toMTLStencilOperation(StencilOp op) {
    switch (op) {
        case StencilOp::ZERO: return MTLStencilOperationZero;
        case StencilOp::KEEP: return MTLStencilOperationKeep;
        case StencilOp::REPLACE: return MTLStencilOperationReplace;
        case StencilOp::INCR: return MTLStencilOperationIncrementClamp;
        case StencilOp::DECR: return MTLStencilOperationDecrementClamp;
        case StencilOp::INVERT: return MTLStencilOperationInvert;
        case StencilOp::INCR_WRAP: return MTLStencilOperationIncrementWrap;
        case StencilOp::DECR_WRAP: return MTLStencilOperationDecrementWrap;
    }
}

MTLPrimitiveType mu::toMTLPrimitiveType(PrimitiveMode mode) {
    switch (mode) {
        case PrimitiveMode::POINT_LIST: return MTLPrimitiveTypePoint;
        case PrimitiveMode::LINE_LIST: return MTLPrimitiveTypeLine;
        case PrimitiveMode::LINE_STRIP: return MTLPrimitiveTypeLineStrip;
        case PrimitiveMode::TRIANGLE_LIST: return MTLPrimitiveTypeTriangle;
        case PrimitiveMode::TRIANGLE_STRIP: return MTLPrimitiveTypeTriangleStrip;

        case PrimitiveMode::LINE_LOOP: {
            CC_LOG_ERROR("Metal doesn't support PrimitiveMode::LINE_LOOP. Translate to PrimitiveMode::LINE_LIST.");
            return MTLPrimitiveTypeLine;
        }
        default: {
            //TODO: how to support these mode?
            CC_ABORT();
            return MTLPrimitiveTypeTriangle;
        }
    }
}

MTLTextureUsage mu::toMTLTextureUsage(TextureUsage usage) {
    if (usage == TextureUsage::NONE)
        return MTLTextureUsageUnknown;

    MTLTextureUsage ret = MTLTextureUsageUnknown;
    if (hasFlag(usage, TextureUsage::TRANSFER_SRC))
        ret |= MTLTextureUsageShaderRead;
    if (hasFlag(usage, TextureUsage::TRANSFER_DST))
        ret |= MTLTextureUsageShaderWrite;
    if (hasFlag(usage, TextureUsage::SAMPLED) || hasFlag(usage, TextureUsageBit::INPUT_ATTACHMENT))
        ret |= MTLTextureUsageShaderRead;
    if (hasFlag(usage, TextureUsage::STORAGE))
        ret |= MTLTextureUsageShaderWrite;
    if (hasFlag(usage, TextureUsage::COLOR_ATTACHMENT) ||
        hasFlag(usage, TextureUsage::DEPTH_STENCIL_ATTACHMENT)) {
        ret |= MTLTextureUsageRenderTarget | MTLTextureUsageShaderWrite;
    }

    return ret;
}

MTLTextureType mu::toMTLTextureType(TextureType type) {
    switch (type) {
        case TextureType::TEX1D: return MTLTextureType1D;
        case TextureType::TEX2D: return MTLTextureType2D;
        case TextureType::TEX3D: return MTLTextureType3D;
        case TextureType::CUBE: return MTLTextureTypeCube;
        case TextureType::TEX1D_ARRAY: return MTLTextureType1DArray;
        case TextureType::TEX2D_ARRAY: return MTLTextureType2DArray;
    }
}

NSUInteger mu::toMTLSampleCount(SampleCount count) {
    return static_cast<NSUInteger>(count);
}

MTLSamplerAddressMode mu::toMTLSamplerAddressMode(Address mode) {
    switch (mode) {
        case Address::WRAP: return MTLSamplerAddressModeRepeat;
        case Address::MIRROR: return MTLSamplerAddressModeMirrorRepeat;
        case Address::CLAMP: return MTLSamplerAddressModeClampToEdge;
        case Address::BORDER: {
#if (CC_PLATFORM == CC_PLATFORM_MACOS)
            return MTLSamplerAddressModeClampToBorderColor;
#endif
        }
    }

    return MTLSamplerAddressModeClampToEdge;
}

int mu::toMTLSamplerBorderColor(const Color &color) {
#if (CC_PLATFORM == CC_PLATFORM_MACOS)
    float diff = color.x - 0.5f;
    if (math::isEqualF(color.w, 0.f))
        return MTLSamplerBorderColorTransparentBlack;
    else if (math::isEqualF(diff, 0.f))
        return MTLSamplerBorderColorOpaqueBlack;
    else
        return MTLSamplerBorderColorOpaqueWhite;
#endif

    return 0;
}

MTLSamplerMinMagFilter mu::toMTLSamplerMinMagFilter(Filter filter) {
    switch (filter) {
        case Filter::LINEAR:
        case Filter::ANISOTROPIC:
            return MTLSamplerMinMagFilterLinear;
        default:
            return MTLSamplerMinMagFilterNearest;
    }
}

MTLSamplerMipFilter mu::toMTLSamplerMipFilter(Filter filter) {
    switch (filter) {
        case Filter::NONE: return MTLSamplerMipFilterNotMipmapped;
        case Filter::LINEAR:
        case Filter::ANISOTROPIC:
            return MTLSamplerMipFilterLinear;
        case Filter::POINT: return MTLSamplerMipFilterNearest;
    }
}

bool mu::isImageBlockSupported() {
    //implicit imageblocks
    if (!mu::isFramebufferFetchSupported()) {
        return false;
    }
#if (CC_PLATFORM == CC_PLATFORM_IOS) //|| TARGET_CPU_ARM64
    return true;
#else
    return false;
#endif
}

bool mu::isFramebufferFetchSupported() {
    return true;
}

ccstd::string mu::spirv2MSL(const uint32_t *ir, size_t word_count,
                            ShaderStageFlagBit shaderType,
                            CCMTLGPUShader *gpuShader,
                            RenderPass* renderPass,
                            uint32_t subpassIndex) {
    CCMTLDevice *device = CCMTLDevice::getInstance();
    spirv_cross::CompilerMSL msl(ir, word_count);

    // The SPIR-V is now parsed, and we can perform reflection on it.
    auto executionModel = msl.get_execution_model();
    auto active = msl.get_active_interface_variables();
    spirv_cross::ShaderResources resources = msl.get_shader_resources(active);
    msl.set_enabled_interface_variables(std::move(active));

    // Set some options.
    spirv_cross::CompilerMSL::Options options;
    options.enable_decoration_binding = true;
#if (CC_PLATFORM == CC_PLATFORM_MACOS)
    options.platform = spirv_cross::CompilerMSL::Options::Platform::macOS;
#elif (CC_PLATFORM == CC_PLATFORM_IOS)
    options.platform = spirv_cross::CompilerMSL::Options::Platform::iOS;
#endif
    options.emulate_subgroups = true;
    options.pad_fragment_output_components = true;
    // fully support
    options.set_msl_version(2, 0, 0);
    if (isFramebufferFetchSupported()) {
        options.use_framebuffer_fetch_subpasses = true;
#if (CC_PLATFORM == CC_PLATFORM_MACOS)
        options.set_msl_version(2, 3, 0);
#endif
    }
    msl.set_msl_options(options);

    // TODO: bindings from shader just kind of validation, cannot be directly input
    // Get all uniform buffers in the shader.
    uint32_t maxBufferBindingIndex = device->getMaximumBufferBindingIndex();
    for (const auto &ubo : resources.uniform_buffers) {
        auto set = msl.get_decoration(ubo.id, spv::DecorationDescriptorSet);
        auto binding = msl.get_decoration(ubo.id, spv::DecorationBinding);
        auto size = msl.get_declared_struct_size(msl.get_type(ubo.base_type_id));

        if (binding >= maxBufferBindingIndex) {
            CC_LOG_ERROR("Implementation limits: %s binding at %d, should not use more than %d entries in the buffer argument table", ubo.name.c_str(), binding, maxBufferBindingIndex);
        }

        uint32_t fakeHash = set * 128 + binding;
        spirv_cross::MSLResourceBinding newBinding;
        newBinding.stage = executionModel;
        auto mappedBinding = gpuShader->bufferIndex;
        newBinding.desc_set = set;
        newBinding.binding = binding;
        if (gpuShader->resourceBinding.find(fakeHash) == gpuShader->resourceBinding.end()) {
            newBinding.msl_buffer = mappedBinding;
            gpuShader->blocks[fakeHash] = {ubo.name, set, binding, mappedBinding, shaderType, size};
            gpuShader->resourceBinding[fakeHash] = {mappedBinding, 0, 0};
            ++gpuShader->bufferIndex;
        } else {
            gpuShader->blocks[fakeHash].stages |= shaderType;
            gpuShader->resourceBinding[fakeHash].bufferBinding = gpuShader->blocks[fakeHash].mappedBinding;
            newBinding.msl_sampler = gpuShader->resourceBinding[fakeHash].samplerBinding;
            newBinding.msl_texture = gpuShader->resourceBinding[fakeHash].textureBinding;
            newBinding.msl_buffer = gpuShader->resourceBinding[fakeHash].bufferBinding;
        }
        msl.add_msl_resource_binding(newBinding);
    }

    for (const auto &ubo : resources.storage_buffers) {
        auto set = msl.get_decoration(ubo.id, spv::DecorationDescriptorSet);
        auto binding = msl.get_decoration(ubo.id, spv::DecorationBinding);
        auto size = msl.get_declared_struct_size(msl.get_type(ubo.base_type_id));

        if (binding >= maxBufferBindingIndex) {
            CC_LOG_ERROR("Implementation limits: %s binding at %d, should not use more than %d entries in the buffer argument table", ubo.name.c_str(), binding, maxBufferBindingIndex);
        }

        uint32_t fakeHash = set * 128 + binding;
        spirv_cross::MSLResourceBinding newBinding;
        newBinding.stage = executionModel;
        auto mappedBinding = gpuShader->bufferIndex;
        newBinding.desc_set = set;
        newBinding.binding = binding;
        newBinding.msl_buffer = mappedBinding;
        if (gpuShader->resourceBinding.find(fakeHash) == gpuShader->resourceBinding.end()) {
            gpuShader->blocks[fakeHash] = {ubo.name, set, binding, mappedBinding, shaderType, size};
            gpuShader->resourceBinding[fakeHash] = {mappedBinding, 0, 0};
            ++gpuShader->bufferIndex;
        } else {
            auto mappedBinding = gpuShader->blocks[fakeHash].mappedBinding;
            gpuShader->blocks[fakeHash].stages |= shaderType;
            gpuShader->resourceBinding[fakeHash].bufferBinding = mappedBinding;
            newBinding.msl_sampler = gpuShader->resourceBinding[fakeHash].samplerBinding;
            newBinding.msl_texture = gpuShader->resourceBinding[fakeHash].textureBinding;
            newBinding.msl_buffer = gpuShader->resourceBinding[fakeHash].bufferBinding;
        }
        msl.add_msl_resource_binding(newBinding);
    }

    //TODO: coulsonwang, need to set sampler binding explicitly
    if (resources.sampled_images.size() > device->getMaximumSamplerUnits()) {
        CC_LOG_ERROR("Implementation limits: Should not use more than %d entries in the sampler state argument table", device->getMaximumSamplerUnits());
        return "";
    }

    // avoid conflict index with input attachments.
    const uint8_t rtOffsets = executionModel == spv::ExecutionModelFragment ? resources.subpass_inputs.size() : 0;
    for (const auto &sampler : resources.sampled_images) {
        auto set = msl.get_decoration(sampler.id, spv::DecorationDescriptorSet);
        auto binding = msl.get_decoration(sampler.id, spv::DecorationBinding);
        int size = 1;
        const spirv_cross::SPIRType &type = msl.get_type(sampler.type_id);
        if (type.array_size_literal[0]) {
            size = type.array[0];
        }

        for (int i = 0; i < size; ++i) {
            auto mappedBinding = gpuShader->samplerIndex + rtOffsets;
            uint32_t fakeHash = set * 128 + binding;
            spirv_cross::MSLResourceBinding newBinding;
            newBinding.stage = executionModel;
            newBinding.desc_set = set;
            newBinding.binding = binding + i;
            newBinding.msl_texture = mappedBinding;
            newBinding.msl_sampler = gpuShader->samplerIndex;

            if(gpuShader->resourceBinding.find(fakeHash) == gpuShader->resourceBinding.end()) {
                gpuShader->resourceBinding[fakeHash] = {0, mappedBinding, mappedBinding};
                gpuShader->samplers[mappedBinding] = {sampler.name, set, binding, newBinding.msl_texture, newBinding.msl_sampler, shaderType};
                ++gpuShader->samplerIndex;
            } else {
                gpuShader->resourceBinding[fakeHash].samplerBinding = mappedBinding;
                gpuShader->resourceBinding[fakeHash].textureBinding = mappedBinding;
                gpuShader->samplers[mappedBinding].stages |= shaderType;
                newBinding.msl_buffer = gpuShader->resourceBinding[fakeHash].bufferBinding;
                newBinding.msl_texture = gpuShader->resourceBinding[fakeHash].textureBinding;
                newBinding.msl_sampler = gpuShader->resourceBinding[fakeHash].samplerBinding;
            }
            msl.add_msl_resource_binding(newBinding);
        }
    }

    if (executionModel == spv::ExecutionModelFragment) {
        auto* ccRenderPass = static_cast<CCMTLRenderPass*>(renderPass);
        const auto& readBuffer = ccRenderPass ? ccRenderPass->getReadBuffer(subpassIndex) : ccstd::vector<uint32_t>{};
        if (!resources.subpass_inputs.empty()) {
//            gpuShader->inputs.resize(resources.subpass_inputs.size());
            for (size_t i = 0; i < resources.subpass_inputs.size(); i++) {
                const auto &attachment = resources.subpass_inputs[i];
                auto inputIndex = msl.get_decoration(attachment.id, spv::DecorationInputAttachmentIndex);
                auto loc = inputIndex >= readBuffer.size() ? inputIndex : readBuffer[inputIndex];
                // depth stencil input not support in metal
                CC_ASSERT(loc != renderPass->getColorAttachments().size());
                auto& input = gpuShader->inputs.emplace_back();
                input.name = attachment.name;
                msl.set_decoration(attachment.id, spv::DecorationInputAttachmentIndex, loc);
            }
        }

        gpuShader->outputs.resize(resources.stage_outputs.size());
        const auto& drawBuffer = renderPass ? ccRenderPass->getDrawBuffer(subpassIndex) : ccstd::vector<uint32_t>{};
        for (size_t i = 0; i < resources.stage_outputs.size(); i++) {
            const auto &stageOutput = resources.stage_outputs[i];
            auto set = msl.get_decoration(stageOutput.id, spv::DecorationDescriptorSet);
            auto id = msl.get_decoration(stageOutput.id, spv::DecorationLocation);
            auto loc = id >= drawBuffer.size() ? id : drawBuffer[id];
            msl.set_decoration(stageOutput.id, spv::DecorationLocation, loc);

            gpuShader->outputs[i].name = stageOutput.name;
            gpuShader->outputs[i].set = set;
            gpuShader->outputs[i].binding = loc;
        }
    } else if (executionModel == spv::ExecutionModelGLCompute) {
        spirv_cross::SpecializationConstant x, y, z;
        auto workGroupID = msl.get_work_group_size_specialization_constants(x, y, z);
        const auto& workGroupSizeSpv = msl.get_constant(workGroupID);
        const auto& workGroupSize = workGroupSizeSpv.vector().r;
        gpuShader->workGroupSize[0] = workGroupSize[0].u32;
        gpuShader->workGroupSize[1] = workGroupSize[1].u32;
        gpuShader->workGroupSize[2] = workGroupSize[2].u32;
    }

    // Compile to MSL, ready to give to metal driver.
    ccstd::string output = msl.compile();
    if (!output.size()) {
        CC_LOG_ERROR("Compile to MSL failed.");
        CC_LOG_ERROR("%s", output.c_str());
    }

    return output;
}

const uint8_t *mu::convertRGB8ToRGBA8(const uint8_t *source, uint32_t length) {
    uint32_t finalLength = length * 4;
    uint8_t *out = (uint8_t *)CC_MALLOC(finalLength);
    if (!out) {
        CC_LOG_WARNING("Failed to alloc memory in convertRGB8ToRGBA8().");
        return source;
    }

    const uint8_t *src = source;
    uint8_t *dst = out;
    for (uint32_t i = 0; i < length; ++i) {
        *dst++ = *src++;
        *dst++ = *src++;
        *dst++ = *src++;
        *dst++ = 255;
    }

    return out;
}

const uint8_t *mu::convertRGB32FToRGBA32F(const uint8_t *source, uint32_t length) {
    uint32_t finalLength = length * sizeof(float) * 4;
    uint8_t *out = (uint8_t *)CC_MALLOC(finalLength);
    if (!out) {
        CC_LOG_WARNING("Failed to alloc memory in convertRGB32FToRGBA32F().");
        return source;
    }

    const float *src = reinterpret_cast<const float *>(source);
    float *dst = reinterpret_cast<float *>(out);
    for (uint32_t i = 0; i < length; ++i) {
        *dst++ = *src++;
        *dst++ = *src++;
        *dst++ = *src++;
        *dst++ = 1.0f;
    }

    return out;
}

NSUInteger mu::highestSupportedFeatureSet(id<MTLDevice> device) {
    NSUInteger maxKnownFeatureSet;
#if CC_PLATFORM == CC_PLATFORM_IOS
    if (@available(iOS 12.0, *)) {
        maxKnownFeatureSet = MTLFeatureSet_iOS_GPUFamily5_v1;
    } else if (@available(iOS 11.0, *)) {
        maxKnownFeatureSet = MTLFeatureSet_iOS_GPUFamily4_v1;
    } else {
        CC_ASSERT(false);
        maxKnownFeatureSet = MTLFeatureSet_iOS_GPUFamily1_v4;
    }
#else
    if (@available(macOS 10.14, *)) {
        maxKnownFeatureSet = MTLFeatureSet_macOS_GPUFamily2_v1;
    } else {
        CC_ASSERT(false);
        maxKnownFeatureSet = MTLFeatureSet_macOS_GPUFamily1_v1;
    }
#endif
    for (int featureSet = static_cast<int>(maxKnownFeatureSet); featureSet >= 0; --featureSet) {
        if ([device supportsFeatureSet:MTLFeatureSet(featureSet)]) {
            maxKnownFeatureSet = static_cast<NSUInteger>(featureSet);
            break;
        }
    }
    return maxKnownFeatureSet;
}

uint32_t mu::getGPUFamily(MTLFeatureSet featureSet) {
#if CC_PLATFORM == CC_PLATFORM_IOS
    return static_cast<uint32_t>(getIOSGPUFamily(featureSet));
#else
    return static_cast<uint32_t>(getMacGPUFamily(featureSet));
#endif
}

uint32_t mu::getMaxVertexAttributes(uint32_t family) {
    switch (static_cast<GPUFamily>(family)) {
        case GPUFamily::Apple1:
        case GPUFamily::Apple2:
        case GPUFamily::Apple3:
        case GPUFamily::Apple4:
        case GPUFamily::Apple5:
        case GPUFamily::Apple6:
        case GPUFamily::Mac1:
        case GPUFamily::Mac2:
            return 31;
    }
}

uint32_t mu::getMaxUniformBufferBindings(uint32_t family) {
    switch (static_cast<GPUFamily>(family)) {
        case GPUFamily::Apple1:
        case GPUFamily::Apple2:
        case GPUFamily::Apple3:
        case GPUFamily::Apple4:
        case GPUFamily::Apple5:
        case GPUFamily::Apple6:
            return 31;
        case GPUFamily::Mac1:
        case GPUFamily::Mac2:
            return 14;
    }
}


uint32_t mu::getMaxEntriesInBufferArgumentTable(uint32_t family) {
    switch (static_cast<GPUFamily>(family)) {
        case GPUFamily::Apple1:
        case GPUFamily::Apple2:
        case GPUFamily::Apple3:
        case GPUFamily::Apple4:
        case GPUFamily::Apple5:
        case GPUFamily::Apple6:
        case GPUFamily::Mac1:
        case GPUFamily::Mac2:
            return 31;
    }
}

uint32_t mu::getMaxEntriesInTextureArgumentTable(uint32_t family) {
    switch (static_cast<GPUFamily>(family)) {
        case GPUFamily::Apple1:
        case GPUFamily::Apple2:
        case GPUFamily::Apple3:
            return 31;
        case GPUFamily::Apple4:
        case GPUFamily::Apple5:
            return 96;
        case GPUFamily::Apple6:
        case GPUFamily::Mac1:
        case GPUFamily::Mac2:
            return 128;
    }
}

uint32_t mu::getMaxEntriesInSamplerStateArgumentTable(uint32_t family) {
    switch (static_cast<GPUFamily>(family)) {
        case GPUFamily::Apple1:
        case GPUFamily::Apple2:
        case GPUFamily::Apple3:
        case GPUFamily::Apple4:
        case GPUFamily::Apple5:
        case GPUFamily::Apple6:
        case GPUFamily::Mac1:
        case GPUFamily::Mac2:
            return 16;
    }
}

uint32_t mu::getMaxTexture2DWidthHeight(uint32_t family) {
    switch (static_cast<GPUFamily>(family)) {
        case GPUFamily::Apple1:
        case GPUFamily::Apple2:
            return 8192;
        case GPUFamily::Apple3:
        case GPUFamily::Apple4:
        case GPUFamily::Apple5:
        case GPUFamily::Apple6:
        case GPUFamily::Mac1:
        case GPUFamily::Mac2:
            return 16384;
    }
}

uint32_t mu::getMaxCubeMapTextureWidthHeight(uint32_t family) {
    switch (static_cast<GPUFamily>(family)) {
        case GPUFamily::Apple1:
        case GPUFamily::Apple2:
            return 8192;
        case GPUFamily::Apple3:
        case GPUFamily::Apple4:
        case GPUFamily::Apple5:
        case GPUFamily::Apple6:
        case GPUFamily::Mac1:
        case GPUFamily::Mac2:
            return 16384;
    }
}

uint32_t mu::getMaxThreadsPerGroup(uint32_t family) {
    switch (static_cast<GPUFamily>(family)) {
        case GPUFamily::Apple1:
        case GPUFamily::Apple2:
        case GPUFamily::Apple3:
            return 512;
        case GPUFamily::Apple4:
        case GPUFamily::Apple5:
        case GPUFamily::Apple6:
        case GPUFamily::Mac1:
        case GPUFamily::Mac2:
            return 1024;
    }
}

uint32_t mu::getMaxColorRenderTarget(uint32_t family) {
    switch (static_cast<GPUFamily>(family)) {
        case GPUFamily::Apple1:
            return 4;
        case GPUFamily::Apple2:
        case GPUFamily::Apple3:
        case GPUFamily::Apple4:
        case GPUFamily::Apple5:
        case GPUFamily::Apple6:
        case GPUFamily::Mac1:
        case GPUFamily::Mac2:
            return 8;
    }
}

uint32_t mu::getMinBufferOffsetAlignment(uint32_t family) {
    switch (static_cast<GPUFamily>(family)) {
        case GPUFamily::Apple1:
        case GPUFamily::Apple2:
        case GPUFamily::Apple3:
        case GPUFamily::Apple4:
        case GPUFamily::Apple5:
        case GPUFamily::Apple6:
#ifdef TARGET_OS_SIMULATOR
            return 256;
#else
            return 4; //4 Bytes
#endif
        case GPUFamily::Mac1:
        case GPUFamily::Mac2:
            return 256; //256 Bytes
    }
}

bool mu::isPVRTCSuppported(uint32_t family) {
    switch (static_cast<GPUFamily>(family)) {
        case GPUFamily::Apple1:
        case GPUFamily::Apple2:
        case GPUFamily::Apple3:
        case GPUFamily::Apple4:
        case GPUFamily::Apple5:
        case GPUFamily::Apple6:
            return true;
        case GPUFamily::Mac1:
        case GPUFamily::Mac2:
            return false;
    }
}

bool mu::isEAC_ETCCSuppported(uint32_t family) {
    switch (static_cast<GPUFamily>(family)) {
        case GPUFamily::Apple1:
        case GPUFamily::Apple2:
        case GPUFamily::Apple3:
        case GPUFamily::Apple4:
        case GPUFamily::Apple5:
        case GPUFamily::Apple6:
            return true;
        case GPUFamily::Mac1:
        case GPUFamily::Mac2:
            return false;
    }
}

bool mu::isASTCSuppported(uint32_t family) {
    switch (static_cast<GPUFamily>(family)) {
        case GPUFamily::Apple1:
            return false;
        case GPUFamily::Apple2:
        case GPUFamily::Apple3:
        case GPUFamily::Apple4:
        case GPUFamily::Apple5:
        case GPUFamily::Apple6:
            return true;
        case GPUFamily::Mac1:
        case GPUFamily::Mac2:
            return false;
    }
}

bool mu::isBCSupported(uint32_t family) {
    switch (static_cast<GPUFamily>(family)) {
        case GPUFamily::Apple1:
        case GPUFamily::Apple2:
        case GPUFamily::Apple3:
        case GPUFamily::Apple4:
        case GPUFamily::Apple5:
        case GPUFamily::Apple6:
            return false;
        case GPUFamily::Mac1:
        case GPUFamily::Mac2:
            return true;
    }
}

bool mu::isColorBufferFloatSupported(uint32_t family) {
    switch (static_cast<GPUFamily>(family)) {
        case GPUFamily::Apple1:
        case GPUFamily::Apple2:
        case GPUFamily::Apple3:
        case GPUFamily::Apple4:
        case GPUFamily::Apple5:
        case GPUFamily::Apple6:
        case GPUFamily::Mac1:
        case GPUFamily::Mac2:
            return true;
    }
}

bool mu::isColorBufferHalfFloatSupported(uint32_t family) {
    switch (static_cast<GPUFamily>(family)) {
        case GPUFamily::Apple1:
        case GPUFamily::Apple2:
        case GPUFamily::Apple3:
        case GPUFamily::Apple4:
        case GPUFamily::Apple5:
        case GPUFamily::Apple6:
        case GPUFamily::Mac1:
        case GPUFamily::Mac2:
            return true;
    }
}

bool mu::isLinearTextureSupported(uint32_t family) {
    switch (static_cast<GPUFamily>(family)) {
        case GPUFamily::Apple1:
        case GPUFamily::Apple2:
        case GPUFamily::Apple3:
        case GPUFamily::Apple4:
        case GPUFamily::Apple5:
        case GPUFamily::Apple6:
        case GPUFamily::Mac1:
        case GPUFamily::Mac2:
            return true;
    }
}

bool mu::isUISamplerSupported(uint32_t family) {
    switch (static_cast<GPUFamily>(family)) {
        case GPUFamily::Apple1:
        case GPUFamily::Apple2:
        case GPUFamily::Apple3:
        case GPUFamily::Apple4:
        case GPUFamily::Apple5:
        case GPUFamily::Apple6:
            return false;
        case GPUFamily::Mac1:
        case GPUFamily::Mac2:
            return true;
    }
}

bool mu::isRGB10A2UIStorageSupported(uint32_t family) {
    switch (static_cast<GPUFamily>(family)) {
        case GPUFamily::Apple1:
        case GPUFamily::Apple2:
            return false;
        case GPUFamily::Apple3:
        case GPUFamily::Apple4:
        case GPUFamily::Apple5:
        case GPUFamily::Apple6:
        case GPUFamily::Mac1:
        case GPUFamily::Mac2:
            return true;
    }
}

bool mu::isDDepthStencilFilterSupported(uint32_t family) {
    switch (static_cast<GPUFamily>(family)) {
        case GPUFamily::Apple1:
        case GPUFamily::Apple2:
        case GPUFamily::Apple3:
        case GPUFamily::Apple4:
        case GPUFamily::Apple5:
        case GPUFamily::Apple6:
            return false;
        case GPUFamily::Mac1:
        case GPUFamily::Mac2:
            return true;
    }
}

bool mu::isIndirectCommandBufferSupported(MTLFeatureSet featureSet) {
#if CC_PLATFORM == CC_PLATFORM_IOS
    if (@available(iOS 12.0, *)) {
        return featureSet >= MTLFeatureSet_iOS_GPUFamily3_v4;
    }
#else
    if (@available(macOS 10.14, *)) {
        return featureSet >= MTLFeatureSet_macOS_GPUFamily2_v1;
    }
#endif
    return false;
}
bool mu::isDepthStencilFormatSupported(id<MTLDevice> device, Format format, uint32_t family) {
    return true;
    //    GPUFamily gpuFamily = static_cast<GPUFamily>(family);
    //    switch (format) {
    //        case Format::D16:
    //            switch (gpuFamily) {
    //                case GPUFamily::Apple1:
    //                case GPUFamily::Apple2:
    //                case GPUFamily::Apple3:
    //                case GPUFamily::Apple4:
    //                case GPUFamily::Apple5:
    //                case GPUFamily::Apple6:
    //                case GPUFamily::Mac1:
    //                case GPUFamily::Mac2:
    //                    return true;
    //            }
    //        case Format::D32F:
    //        case Format::D32F_S8:
    //            switch (gpuFamily) {
    //                case GPUFamily::Apple1:
    //                case GPUFamily::Apple2:
    //                case GPUFamily::Apple3:
    //                case GPUFamily::Apple4:
    //                case GPUFamily::Apple5:
    //                case GPUFamily::Apple6:
    //#ifdef TARGET_OS_SIMULATOR
    //                    return true;
    //#else
    //                    return false;
    //#endif
    //                case GPUFamily::Mac1:
    //                case GPUFamily::Mac2:
    //                    return true;
    //            }
    //        case Format::D24S8:
    //#if (CC_PLATFORM == CC_PLATFORM_MACOS)
    //            return [device isDepth24Stencil8PixelFormatSupported];
    //#else
    //            return false;
    //#endif
    //        default:
    //            return false;
    //    }
}

bool mu::isIndirectDrawSupported(uint32_t family) {
#if CC_PLATFORM == CC_PLATFORM_IOS
    return static_cast<GPUFamily>(family) < GPUFamily::Apple3 ? false : true; //is only supported on MTLFeatureSet_iOS_GPUFamily3_v1 and later'
#else
    return true;
#endif
}

MTLPixelFormat mu::getSupportedDepthStencilFormat(id<MTLDevice> device, uint32_t family, uint32_t &depthBits) {
#if CC_PLATFORM == CC_PLATFORM_MACOS
    return MTLPixelFormatDepth24Unorm_Stencil8;
#else
    return MTLPixelFormatDepth32Float_Stencil8;
#endif
}

ccstd::string mu::featureSetToString(MTLFeatureSet featureSet) {
#if CC_PLATFORM == CC_PLATFORM_IOS
    return getIOSFeatureSetToString(featureSet);
#else
    return getMacFeatureSetToString(featureSet);
#endif
}

const uint8_t *const mu::convertData(const uint8_t *source, uint32_t length, Format type) {
    switch (type) {
        case Format::RGB8: return mu::convertRGB8ToRGBA8(source, length);
        case Format::RGB32F: return mu::convertRGB32FToRGBA32F(source, length);
        default: return source;
    }
}

uint32_t mu::getBlockSize(Format format) {
    switch (format) {
        case Format::ASTC_RGBA_4X4:
        case Format::ASTC_SRGBA_4X4:
        case Format::ASTC_RGBA_5X4:
        case Format::ASTC_SRGBA_5X4:
        case Format::ASTC_RGBA_5X5:
        case Format::ASTC_SRGBA_5X5:
        case Format::ASTC_RGBA_6X5:
        case Format::ASTC_SRGBA_6X5:
        case Format::ASTC_RGBA_6X6:
        case Format::ASTC_SRGBA_6X6:
        case Format::ASTC_RGBA_8X5:
        case Format::ASTC_SRGBA_8X5:
        case Format::ASTC_RGBA_8X6:
        case Format::ASTC_SRGBA_8X6:
        case Format::ASTC_RGBA_8X8:
        case Format::ASTC_SRGBA_8X8:
        case Format::ASTC_RGBA_10X5:
        case Format::ASTC_SRGBA_10X5:
        case Format::ASTC_RGBA_10X6:
        case Format::ASTC_SRGBA_10X6:
        case Format::ASTC_RGBA_10X8:
        case Format::ASTC_SRGBA_10X8:
        case Format::ASTC_RGBA_10X10:
        case Format::ASTC_SRGBA_10X10:
        case Format::ASTC_RGBA_12X10:
        case Format::ASTC_SRGBA_12X10:
        case Format::ASTC_RGBA_12X12:
        case Format::ASTC_SRGBA_12X12:
            return 16u;
        case Format::PVRTC_RGB2:
        case Format::PVRTC_RGBA2:
            return 32u; // blockWidth = 8, blockHeight = 4, bitsPerPixel = 2;
        case Format::PVRTC_RGB4:
        case Format::PVRTC_RGBA4:
            return 16u; // blockWidth = 4, blockHeight = 4, bitsPerPixel = 4;
        case Format::ETC2_RGB8:
        case Format::ETC2_SRGB8:
        case Format::ETC2_RGB8_A1:
        case Format::ETC2_SRGB8_A1:
        case Format::EAC_R11:
        case Format::EAC_R11SN:
            return 8u; // blockWidth = 4, blockHeight = 4
        case Format::ETC2_RGBA8:
        case Format::ETC2_SRGB8_A8:
        case Format::EAC_RG11:
        case Format::EAC_RG11SN: // blockWidth = 4, blockHeight = 4;
            return 16u;
        default:
            return GFX_FORMAT_INFOS[static_cast<uint32_t>(format)].size;
    }
}

uint32_t mu::getBytesPerRow(Format format, uint32_t width) {
    uint32_t blockSize = getBlockSize(format);
    uint32_t widthInBlock = 1u;
    switch (format) {
        case Format::ASTC_RGBA_4X4:
        case Format::ASTC_SRGBA_4X4:
            widthInBlock = (width + 3) / 4;
            break;
        case Format::ASTC_RGBA_5X4:
        case Format::ASTC_SRGBA_5X4:
        case Format::ASTC_RGBA_5X5:
        case Format::ASTC_SRGBA_5X5:
            widthInBlock = (width + 4) / 5;
            break;
        case Format::ASTC_RGBA_6X5:
        case Format::ASTC_SRGBA_6X5:
        case Format::ASTC_RGBA_6X6:
        case Format::ASTC_SRGBA_6X6:
            widthInBlock = (width + 5) / 6;
            break;
        case Format::ASTC_RGBA_8X5:
        case Format::ASTC_SRGBA_8X5:
        case Format::ASTC_RGBA_8X6:
        case Format::ASTC_SRGBA_8X6:
        case Format::ASTC_RGBA_8X8:
        case Format::ASTC_SRGBA_8X8:
            widthInBlock = (width + 7) / 8;
            break;
        case Format::ASTC_RGBA_10X5:
        case Format::ASTC_SRGBA_10X5:
        case Format::ASTC_RGBA_10X6:
        case Format::ASTC_SRGBA_10X6:
        case Format::ASTC_RGBA_10X8:
        case Format::ASTC_SRGBA_10X8:
        case Format::ASTC_RGBA_10X10:
        case Format::ASTC_SRGBA_10X10:
            widthInBlock = (width + 9) / 10;
            break;
        case Format::ASTC_RGBA_12X10:
        case Format::ASTC_SRGBA_12X10:
        case Format::ASTC_RGBA_12X12:
        case Format::ASTC_SRGBA_12X12:
            widthInBlock = (width + 11) / 12;
            break;
        case Format::PVRTC_RGB2:
        case Format::PVRTC_RGBA2:
            widthInBlock = width / 2;
            break;
        case Format::PVRTC_RGB4:
        case Format::PVRTC_RGBA4:
            widthInBlock = width / 4;
            break;
        case Format::ETC2_RGB8:
        case Format::ETC2_SRGB8:
        case Format::ETC2_RGB8_A1:
        case Format::ETC2_SRGB8_A1:
        case Format::EAC_R11:
        case Format::EAC_R11SN:
        case Format::EAC_RG11:
        case Format::EAC_RG11SN:
        case Format::ETC2_RGBA8:
        case Format::ETC2_SRGB8_A8:
            widthInBlock = width / 4;
            break;
        default:
            widthInBlock = width;
            break;
    }
    return widthInBlock * blockSize;
}

bool mu::pixelFormatIsColorRenderable(Format format) {
    MTLPixelFormat pixelFormat = toMTLPixelFormat(format);
    BOOL isCompressedFormat = false;
#if CC_PLATFORM == CC_PLATFORM_IOS
    isCompressedFormat = (pixelFormat >= MTLPixelFormatASTC_4x4_sRGB && pixelFormat <= MTLPixelFormatASTC_12x12_LDR) ||
                         (pixelFormat >= MTLPixelFormatPVRTC_RGB_2BPP && pixelFormat <= MTLPixelFormatPVRTC_RGBA_4BPP_sRGB) ||
                         (pixelFormat >= MTLPixelFormatEAC_R11Unorm && pixelFormat <= MTLPixelFormatETC2_RGB8A1_sRGB);
#else
    isCompressedFormat = (pixelFormat >= MTLPixelFormatBC1_RGBA && pixelFormat <= MTLPixelFormatBC3_RGBA_sRGB);
#endif
    BOOL is422Format = (pixelFormat == MTLPixelFormatGBGR422 || pixelFormat == MTLPixelFormatBGRG422);

    return !isCompressedFormat && !is422Format && !(pixelFormat == MTLPixelFormatInvalid);
}

//CompareFunction of MTLSamplerDescriptor is only supported on MTLFeatureSet_iOS_GPUFamily3_v1 and later
bool mu::isSamplerDescriptorCompareFunctionSupported(uint32_t family) {
#if CC_PLATFORM == CC_PLATFORM_IOS
    return (static_cast<GPUFamily>(family) < GPUFamily::Apple3) ? false : true;
#else
    return true;
#endif
}

void mu::clearRenderArea(CCMTLDevice *device, id<MTLRenderCommandEncoder> renderEncoder, RenderPass *renderPass, const Rect &renderArea, const Color *colors, float /*depth*/, uint32_t /*stencil*/) {
    const auto gpuPSO = getClearRenderPassPipelineState(device, renderPass);
    const auto mtlRenderPass = static_cast<CCMTLRenderPass *>(renderPass);
    uint32_t slot = 0u;

    const auto &renderTargetSizes = mtlRenderPass->getRenderTargetSizes();
    float renderTargetWidth = renderTargetSizes[slot].x;
    float renderTargetHeight = renderTargetSizes[slot].y;
    float halfWidth = renderTargetWidth * 0.5f;
    float halfHeight = renderTargetHeight * 0.5f;
    float rcpWidth = 1.0f / halfWidth;
    float rcpHeight = 1.0f / halfHeight;
    float width = renderArea.x + renderArea.width;
    float height = renderArea.height + renderArea.y;
    Vec2 leftTop{(renderArea.x - halfWidth) * rcpWidth, (halfHeight - renderArea.y) * rcpHeight};
    Vec2 rightTop{(width - halfWidth) * rcpWidth, (halfHeight - renderArea.y) * rcpHeight};
    Vec2 rightBottom{(width - halfWidth) * rcpWidth, (halfHeight - height) * rcpHeight};
    Vec2 leftBottom{(renderArea.x - halfWidth) * rcpWidth, (halfHeight - height) * rcpHeight};
    Vec2 vertexes[] = {leftTop, leftBottom, rightBottom, leftTop, rightBottom, rightTop};

    const auto &colorAttachments = renderPass->getColorAttachments();
    const auto &depthStencilAttachment = renderPass->getDepthStencilAttachment();
    [renderEncoder setViewport:(MTLViewport){0, 0, renderTargetWidth, renderTargetHeight, 0, 1}];
    MTLScissorRect scissorArea = {static_cast<NSUInteger>(renderArea.x), static_cast<NSUInteger>(renderArea.y), static_cast<NSUInteger>(renderArea.width), static_cast<NSUInteger>(renderArea.height)};
#if defined(CC_DEBUG) && (CC_DEBUG > 0)
    scissorArea.width = MIN(scissorArea.width, renderTargetWidth - scissorArea.x);
    scissorArea.height = MIN(scissorArea.height, renderTargetHeight - scissorArea.y);
#endif
    [renderEncoder setScissorRect:scissorArea];
    [renderEncoder setRenderPipelineState:gpuPSO->mtlRenderPipelineState];
    if (gpuPSO->mtlDepthStencilState) {
        [renderEncoder setStencilFrontReferenceValue:gpuPSO->stencilRefFront
                                  backReferenceValue:gpuPSO->stencilRefBack];
        [renderEncoder setDepthStencilState:gpuPSO->mtlDepthStencilState];
    }

    [renderEncoder setVertexBytes:vertexes
                           length:sizeof(vertexes)
                          atIndex:30];

    [renderEncoder setFragmentBytes:&colors[slot]
                             length:sizeof(colors[slot])
                            atIndex:0];

    uint32_t count = sizeof(vertexes) / sizeof(Vec2);
    [renderEncoder drawPrimitives:MTLPrimitiveTypeTriangle
                      vertexStart:0
                      vertexCount:count];
}

void mu::clearUtilResource() {
    if (!renderPassMap.empty()) {
        for (auto &pass : renderPassMap) {
            //TODO: create and destroy not in the same level
            pass.second->destroy();
            delete pass.second;
        }
        renderPassMap.clear();
    }
    if (!pipelineMap.empty()) {
        for (auto &pipeline : pipelineMap) {
            pipeline.second->destroy();
            delete pipeline.second;
        }
        pipelineMap.clear();
    }
}

} // namespace gfx
} // namespace cc
