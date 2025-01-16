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
#pragma once
// clang-format off
// IWYU pragma: begin_exports
#include "cocos/renderer/pipeline/custom/RenderCommonFwd.h"
// IWYU pragma: end_exports
#include "cocos/base/std/hash/hash.h"

namespace cc {

namespace render {

enum class LayoutType : uint8_t;

struct Layout;

enum class DescriptorTypeOrder : uint8_t;

struct Descriptor;
struct DescriptorBlock;
struct DescriptorBlockFlattened;
struct DescriptorBlockIndex;
struct DescriptorGroupBlockIndex;
struct DescriptorDB;
struct RenderStageTag;
struct RenderPhaseTag;
struct RenderPhase;

enum class RenderPassType : uint8_t;

struct LayoutGraph;

using UniformID = uint32_t;

struct UniformData;
struct UniformBlockData;
struct NameLocalID;
struct DescriptorData;
struct DescriptorBlockData;
struct DescriptorSetLayoutData;
struct DescriptorSetData;
struct PipelineLayoutData;
struct ShaderBindingData;
struct ShaderLayoutData;
struct TechniqueData;
struct EffectData;
struct ShaderProgramData;
struct RenderStageData;
struct RenderPhaseData;
struct LayoutGraphData;

} // namespace render

} // namespace cc

namespace ccstd {

template <>
struct hash<cc::render::NameLocalID> {
    hash_t operator()(const cc::render::NameLocalID& val) const noexcept;
};

} // namespace ccstd

// clang-format on
