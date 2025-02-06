/****************************************************************************
 Copyright (c) 2020-2021 Huawei Technologies Co., Ltd.
 Copyright (c) 2022-2023 Xiamen Yaji Software Co., Ltd.

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

#include "../RenderStage.h"
#include "ReflectionComp.h"
#include "scene/Camera.h"

namespace cc {
namespace pipeline {

class RenderFlow;
class RenderInstancedQueue;
class RenderAdditiveLightQueue;
class PlanarShadowQueue;
struct DeferredRenderData;
class DeferredPipeline;

struct RenderElem {
    RenderObject renderObject;
    gfx::DescriptorSet *set;
    uint32_t modelIndex;
    uint32_t passIndex;
};

class CC_DLL LightingStage : public RenderStage {
public:
    static const RenderStageInfo &getInitializeInfo();

    LightingStage();
    ~LightingStage() override;

    bool initialize(const RenderStageInfo &info) override;
    void activate(RenderPipeline *pipeline, RenderFlow *flow) override;
    void destroy() override;
    void render(scene::Camera *camera) override;

private:
    void gatherLights(scene::Camera *camera);
    void initLightingBuffer();
    void fgLightingPass(scene::Camera *camera);
    void fgTransparent(scene::Camera *camera);

    void putTransparentObj2Queue();

    static RenderStageInfo initInfo;
    PlanarShadowQueue *_planarShadowQueue{nullptr};
    uint32_t _phaseID{0};

    gfx::Buffer *_deferredLitsBufs{nullptr};
    gfx::Buffer *_deferredLitsBufView{nullptr};
    ccstd::vector<float> _lightBufferData;
    uint32_t _lightBufferStride{0};
    uint32_t _lightBufferElementCount{0};
    bool _isTransparentQueueEmpty{true};
    float _lightMeterScale{10000.0};
    gfx::DescriptorSet *_descriptorSet{nullptr};
    gfx::DescriptorSetLayout *_descLayout{nullptr};
    uint32_t _maxDeferredLights{UBODeferredLight::LIGHTS_PER_PASS};

    ReflectionComp *_reflectionComp{nullptr};
    RenderQueue *_reflectionRenderQueue{nullptr};
    uint32_t _reflectionPhaseID{0};

    ccstd::vector<RenderElem> _reflectionElems;
    uint32_t _denoiseIndex = 0; // use to get corrrect texture string handle

    gfx::Sampler *_defaultSampler{nullptr};

    // SSPR texture size
    uint32_t _ssprTexWidth = 0;
    uint32_t _ssprTexHeight = 0;
    Mat4 _matViewProj;
};

} // namespace pipeline
} // namespace cc
