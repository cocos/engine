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
#include "cocos/renderer/pipeline/custom/RenderCommonFwd.h"

namespace cc {

namespace render {

void save(OutputArchive& ar, const LightInfo& v);
void load(InputArchive& ar, LightInfo& v);

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

void save(OutputArchive& ar, const DescriptorGroupBlock& v);
void load(InputArchive& ar, DescriptorGroupBlock& v);

void save(OutputArchive& ar, const ResolvePair& v);
void load(InputArchive& ar, ResolvePair& v);

void save(OutputArchive& ar, const CopyPair& v);
void load(InputArchive& ar, CopyPair& v);

void save(OutputArchive& ar, const MovePair& v);
void load(InputArchive& ar, MovePair& v);

void save(OutputArchive& ar, const PipelineStatistics& v);
void load(InputArchive& ar, PipelineStatistics& v);

} // namespace render

} // namespace cc
