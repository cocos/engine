/*
 Copyright (c) 2021-2024 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com

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
*/

/**
 * ========================= !DO NOT CHANGE THE FOLLOWING SECTION MANUALLY! =========================
 * The following section is auto-generated.
 * ========================= !DO NOT CHANGE THE FOLLOWING SECTION MANUALLY! =========================
 */
// clang-format off
#pragma once
#include "cocos/renderer/pipeline/custom/LayoutGraphTypes.h"
#include "cocos/renderer/pipeline/custom/RenderCommonNames.h"

namespace cc {

namespace render {

inline const char* getName(LayoutType e) noexcept {
    switch (e) {
        case LayoutType::VULKAN: return "VULKAN";
        case LayoutType::WEBGPU: return "WEBGPU";
    }
    return "";
}
inline const char* getName(const Layout& /*v*/) noexcept { return "Layout"; }
inline const char* getName(DescriptorTypeOrder e) noexcept {
    switch (e) {
        case DescriptorTypeOrder::UNIFORM_BUFFER: return "UNIFORM_BUFFER";
        case DescriptorTypeOrder::DYNAMIC_UNIFORM_BUFFER: return "DYNAMIC_UNIFORM_BUFFER";
        case DescriptorTypeOrder::SAMPLER_TEXTURE: return "SAMPLER_TEXTURE";
        case DescriptorTypeOrder::SAMPLER: return "SAMPLER";
        case DescriptorTypeOrder::TEXTURE: return "TEXTURE";
        case DescriptorTypeOrder::STORAGE_BUFFER: return "STORAGE_BUFFER";
        case DescriptorTypeOrder::DYNAMIC_STORAGE_BUFFER: return "DYNAMIC_STORAGE_BUFFER";
        case DescriptorTypeOrder::STORAGE_IMAGE: return "STORAGE_IMAGE";
        case DescriptorTypeOrder::INPUT_ATTACHMENT: return "INPUT_ATTACHMENT";
    }
    return "";
}
inline const char* getName(const Descriptor& /*v*/) noexcept { return "Descriptor"; }
inline const char* getName(const DescriptorBlock& /*v*/) noexcept { return "DescriptorBlock"; }
inline const char* getName(const DescriptorBlockFlattened& /*v*/) noexcept { return "DescriptorBlockFlattened"; }
inline const char* getName(const DescriptorBlockIndex& /*v*/) noexcept { return "DescriptorBlockIndex"; }
inline const char* getName(const DescriptorGroupBlockIndex& /*v*/) noexcept { return "DescriptorGroupBlockIndex"; }
inline const char* getName(const DescriptorDB& /*v*/) noexcept { return "DescriptorDB"; }
inline const char* getName(const RenderStageTag& /*v*/) noexcept { return "RenderStage"; }
inline const char* getName(const RenderPhaseTag& /*v*/) noexcept { return "RenderPhase"; }
inline const char* getName(const RenderPhase& /*v*/) noexcept { return "RenderPhase"; }
inline const char* getName(RenderPassType e) noexcept {
    switch (e) {
        case RenderPassType::SINGLE_RENDER_PASS: return "SINGLE_RENDER_PASS";
        case RenderPassType::RENDER_PASS: return "RENDER_PASS";
        case RenderPassType::RENDER_SUBPASS: return "RENDER_SUBPASS";
    }
    return "";
}
inline const char* getName(const LayoutGraph& /*v*/) noexcept { return "LayoutGraph"; }
inline const char* getName(const UniformData& /*v*/) noexcept { return "UniformData"; }
inline const char* getName(const UniformBlockData& /*v*/) noexcept { return "UniformBlockData"; }
inline const char* getName(const NameLocalID& /*v*/) noexcept { return "NameLocalID"; }
inline const char* getName(const DescriptorData& /*v*/) noexcept { return "DescriptorData"; }
inline const char* getName(const DescriptorBlockData& /*v*/) noexcept { return "DescriptorBlockData"; }
inline const char* getName(const DescriptorSetLayoutData& /*v*/) noexcept { return "DescriptorSetLayoutData"; }
inline const char* getName(const DescriptorSetData& /*v*/) noexcept { return "DescriptorSetData"; }
inline const char* getName(const PipelineLayoutData& /*v*/) noexcept { return "PipelineLayoutData"; }
inline const char* getName(const ShaderBindingData& /*v*/) noexcept { return "ShaderBindingData"; }
inline const char* getName(const ShaderLayoutData& /*v*/) noexcept { return "ShaderLayoutData"; }
inline const char* getName(const TechniqueData& /*v*/) noexcept { return "TechniqueData"; }
inline const char* getName(const EffectData& /*v*/) noexcept { return "EffectData"; }
inline const char* getName(const ShaderProgramData& /*v*/) noexcept { return "ShaderProgramData"; }
inline const char* getName(const RenderStageData& /*v*/) noexcept { return "RenderStageData"; }
inline const char* getName(const RenderPhaseData& /*v*/) noexcept { return "RenderPhaseData"; }
inline const char* getName(const LayoutGraphData& /*v*/) noexcept { return "LayoutGraphData"; }

} // namespace render

} // namespace cc

// clang-format on
