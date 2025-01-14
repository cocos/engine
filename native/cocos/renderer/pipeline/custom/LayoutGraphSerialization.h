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
#include "cocos/renderer/pipeline/custom/ArchiveTypes.h"
#include "cocos/renderer/pipeline/custom/LayoutGraphFwd.h"

namespace cc {

namespace render {

void save(OutputArchive& ar, const Descriptor& v);
void load(InputArchive& ar, Descriptor& v);

void save(OutputArchive& ar, const DescriptorBlock& v);
void load(InputArchive& ar, DescriptorBlock& v);

void save(OutputArchive& ar, const DescriptorBlockFlattened& v);
void load(InputArchive& ar, DescriptorBlockFlattened& v);

void save(OutputArchive& ar, const DescriptorBlockIndex& v);
void load(InputArchive& ar, DescriptorBlockIndex& v);

void save(OutputArchive& ar, const DescriptorGroupBlockIndex& v);
void load(InputArchive& ar, DescriptorGroupBlockIndex& v);

void save(OutputArchive& ar, const DescriptorDB& v);
void load(InputArchive& ar, DescriptorDB& v);

void save(OutputArchive& ar, const RenderPhase& v);
void load(InputArchive& ar, RenderPhase& v);

void save(OutputArchive& ar, const LayoutGraph& g);
void load(InputArchive& ar, LayoutGraph& g);

void save(OutputArchive& ar, const UniformData& v);
void load(InputArchive& ar, UniformData& v);

void save(OutputArchive& ar, const UniformBlockData& v);
void load(InputArchive& ar, UniformBlockData& v);

void save(OutputArchive& ar, const NameLocalID& v);
void load(InputArchive& ar, NameLocalID& v);

void save(OutputArchive& ar, const DescriptorData& v);
void load(InputArchive& ar, DescriptorData& v);

void save(OutputArchive& ar, const DescriptorBlockData& v);
void load(InputArchive& ar, DescriptorBlockData& v);

void save(OutputArchive& ar, const DescriptorSetLayoutData& v);
void load(InputArchive& ar, DescriptorSetLayoutData& v);

void save(OutputArchive& ar, const DescriptorSetData& v);
void load(InputArchive& ar, DescriptorSetData& v);

void save(OutputArchive& ar, const PipelineLayoutData& v);
void load(InputArchive& ar, PipelineLayoutData& v);

void save(OutputArchive& ar, const ShaderBindingData& v);
void load(InputArchive& ar, ShaderBindingData& v);

void save(OutputArchive& ar, const ShaderLayoutData& v);
void load(InputArchive& ar, ShaderLayoutData& v);

void save(OutputArchive& ar, const TechniqueData& v);
void load(InputArchive& ar, TechniqueData& v);

void save(OutputArchive& ar, const EffectData& v);
void load(InputArchive& ar, EffectData& v);

void save(OutputArchive& ar, const ShaderProgramData& v);
void load(InputArchive& ar, ShaderProgramData& v);

void save(OutputArchive& ar, const RenderStageData& v);
void load(InputArchive& ar, RenderStageData& v);

void save(OutputArchive& ar, const RenderPhaseData& v);
void load(InputArchive& ar, RenderPhaseData& v);

void save(OutputArchive& ar, const LayoutGraphData& g);
void load(InputArchive& ar, LayoutGraphData& g);

} // namespace render

} // namespace cc
