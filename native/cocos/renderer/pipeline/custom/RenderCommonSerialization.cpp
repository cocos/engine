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
#include "cocos/renderer/pipeline/custom/RenderCommonSerialization.h"
#include "cocos/renderer/pipeline/custom/RenderCommonTypes.h"
#include "cocos/renderer/pipeline/custom/details/SerializationUtils.h"

namespace cc {

namespace render {

void save(OutputArchive& ar, const LightInfo& v) {
    // skip, light: IntrusivePtr<scene::Light>
    // skip, probe: scene::ReflectionProbe
    save(ar, v.level);
    save(ar, v.culledByLight);
}

void load(InputArchive& ar, LightInfo& v) {
    // skip, light: IntrusivePtr<scene::Light>
    // skip, probe: scene::ReflectionProbe
    load(ar, v.level);
    load(ar, v.culledByLight);
}

void save(OutputArchive& ar, const ResolvePair& v) {
    save(ar, v.source);
    save(ar, v.target);
    save(ar, v.resolveFlags);
    save(ar, v.mode);
    save(ar, v.mode1);
}

void load(InputArchive& ar, ResolvePair& v) {
    load(ar, v.source);
    load(ar, v.target);
    load(ar, v.resolveFlags);
    load(ar, v.mode);
    load(ar, v.mode1);
}

void save(OutputArchive& ar, const CopyPair& v) {
    save(ar, v.source);
    save(ar, v.target);
    save(ar, v.mipLevels);
    save(ar, v.numSlices);
    save(ar, v.sourceMostDetailedMip);
    save(ar, v.sourceFirstSlice);
    save(ar, v.sourcePlaneSlice);
    save(ar, v.targetMostDetailedMip);
    save(ar, v.targetFirstSlice);
    save(ar, v.targetPlaneSlice);
}

void load(InputArchive& ar, CopyPair& v) {
    load(ar, v.source);
    load(ar, v.target);
    load(ar, v.mipLevels);
    load(ar, v.numSlices);
    load(ar, v.sourceMostDetailedMip);
    load(ar, v.sourceFirstSlice);
    load(ar, v.sourcePlaneSlice);
    load(ar, v.targetMostDetailedMip);
    load(ar, v.targetFirstSlice);
    load(ar, v.targetPlaneSlice);
}

void save(OutputArchive& ar, const MovePair& v) {
    save(ar, v.source);
    save(ar, v.target);
    save(ar, v.mipLevels);
    save(ar, v.numSlices);
    save(ar, v.targetMostDetailedMip);
    save(ar, v.targetFirstSlice);
    save(ar, v.targetPlaneSlice);
}

void load(InputArchive& ar, MovePair& v) {
    load(ar, v.source);
    load(ar, v.target);
    load(ar, v.mipLevels);
    load(ar, v.numSlices);
    load(ar, v.targetMostDetailedMip);
    load(ar, v.targetFirstSlice);
    load(ar, v.targetPlaneSlice);
}

void save(OutputArchive& ar, const PipelineStatistics& v) {
    save(ar, v.numRenderPasses);
    save(ar, v.numManagedTextures);
    save(ar, v.totalManagedTextures);
    save(ar, v.numUploadBuffers);
    save(ar, v.numUploadBufferViews);
    save(ar, v.numFreeUploadBuffers);
    save(ar, v.numFreeUploadBufferViews);
    save(ar, v.numDescriptorSets);
    save(ar, v.numFreeDescriptorSets);
    save(ar, v.numInstancingBuffers);
    save(ar, v.numInstancingUniformBlocks);
}

void load(InputArchive& ar, PipelineStatistics& v) {
    load(ar, v.numRenderPasses);
    load(ar, v.numManagedTextures);
    load(ar, v.totalManagedTextures);
    load(ar, v.numUploadBuffers);
    load(ar, v.numUploadBufferViews);
    load(ar, v.numFreeUploadBuffers);
    load(ar, v.numFreeUploadBufferViews);
    load(ar, v.numDescriptorSets);
    load(ar, v.numFreeDescriptorSets);
    load(ar, v.numInstancingBuffers);
    load(ar, v.numInstancingUniformBlocks);
}

} // namespace render

} // namespace cc
