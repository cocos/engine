/****************************************************************************
 Copyright (c) 2022-2023 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

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

#include "ReflectionComp.h"
#include "../Define.h"
#include "base/Log.h"
#include "base/StringUtil.h"

namespace cc {

ReflectionComp::~ReflectionComp() {
    CC_SAFE_DESTROY_AND_DELETE(_compShader[0]);
    CC_SAFE_DESTROY_AND_DELETE(_compShader[1]);
    CC_SAFE_DESTROY_AND_DELETE(_compDescriptorSetLayout);
    CC_SAFE_DESTROY_AND_DELETE(_compPipelineLayout);
    CC_SAFE_DESTROY_AND_DELETE(_compPipelineState[0]);
    CC_SAFE_DESTROY_AND_DELETE(_compPipelineState[1]);
    CC_SAFE_DESTROY_AND_DELETE(_compDescriptorSet);

    CC_SAFE_DESTROY_AND_DELETE(_compDenoiseShader[0]);
    CC_SAFE_DESTROY_AND_DELETE(_compDenoiseShader[1]);
    CC_SAFE_DESTROY_AND_DELETE(_compDenoiseDescriptorSetLayout);
    CC_SAFE_DESTROY_AND_DELETE(_compDenoisePipelineLayout);
    CC_SAFE_DESTROY_AND_DELETE(_compDenoisePipelineState[0]);
    CC_SAFE_DESTROY_AND_DELETE(_compDenoisePipelineState[1]);
    CC_SAFE_DESTROY_AND_DELETE(_compDenoiseDescriptorSet);

    CC_SAFE_DESTROY_AND_DELETE(_localDescriptorSetLayout);

    CC_SAFE_DESTROY_AND_DELETE(_compConstantsBuffer);
}

namespace {
struct ConstantBuffer {
    Mat4 matView;
    Mat4 matProjInv;
    Mat4 matViewProj;
    Mat4 matViewProjInv;
    Vec4 viewPort; // viewport of lighting pass
    Vec2 texSize;  // texture size of reflect texture
};

} // namespace

void ReflectionComp::applyTexSize(uint32_t width, uint32_t height, const Mat4 &matView,
                                  const Mat4 &matViewProj, const Mat4 &matViewProjInv,
                                  const Mat4 &matProjInv, const Vec4 &viewPort) {
    const uint32_t globalWidth = width;
    const uint32_t globalHeight = height;
    const uint32_t groupWidth = this->getGroupSizeX();
    const uint32_t groupHeight = this->getGroupSizeY();

    _dispatchInfo = {(globalWidth - 1) / groupWidth + 1, (globalHeight - 1) / groupHeight + 1, 1};
    _denoiseDispatchInfo = {((globalWidth - 1) / 2) / groupWidth + 1, ((globalHeight - 1) / 2) / groupHeight + 1, 1};

    ConstantBuffer constants;
    constants.matView = matView;
    constants.matProjInv = matProjInv;
    constants.matViewProj = matViewProj;
    constants.matViewProjInv = matViewProjInv;
    constants.viewPort = viewPort;
    constants.texSize = {static_cast<float>(width), static_cast<float>(height)};
    constants.viewPort = viewPort;

    if (_compConstantsBuffer) {
        _compConstantsBuffer->update(&constants, sizeof(constants));
    }
}

void ReflectionComp::init(gfx::Device *dev, uint32_t groupSizeX, uint32_t groupSizeY) {
    if (!dev->hasFeature(gfx::Feature::COMPUTE_SHADER)) return;

    _device = dev;
    _groupSizeX = groupSizeX;
    _groupSizeY = groupSizeY;

    gfx::SamplerInfo samplerInfo;
    samplerInfo.minFilter = gfx::Filter::POINT;
    samplerInfo.magFilter = gfx::Filter::POINT;
    _sampler = _device->getSampler(samplerInfo);

    const uint32_t maxInvocations = _device->getCapabilities().maxComputeWorkGroupInvocations;
    CC_ASSERT(_groupSizeX * _groupSizeY <= maxInvocations); // maxInvocations is too small
    CC_LOG_INFO(" work group size: %dx%d", _groupSizeX, _groupSizeY);

    const gfx::DescriptorSetLayoutInfo layoutInfo = {pipeline::localDescriptorSetLayout.bindings};
    _localDescriptorSetLayout = _device->createDescriptorSetLayout(layoutInfo);

    const gfx::GeneralBarrierInfo infoPre = {
        gfx::AccessFlagBit::COLOR_ATTACHMENT_WRITE,
        gfx::AccessFlagBit::COMPUTE_SHADER_READ_TEXTURE,
    };

    const gfx::TextureBarrierInfo infoBeforeDenoise = {
        gfx::AccessFlagBit::COMPUTE_SHADER_WRITE,
        gfx::AccessFlagBit::COMPUTE_SHADER_READ_TEXTURE,
    };

    const gfx::TextureBarrierInfo infoBeforeDenoise2 = {
        gfx::AccessFlagBit::NONE,
        gfx::AccessFlagBit::COMPUTE_SHADER_WRITE,
    };

    const gfx::TextureBarrierInfo infoAfterDenoise = {
        gfx::AccessFlagBit::COMPUTE_SHADER_WRITE,
        gfx::AccessFlagBit::FRAGMENT_SHADER_READ_TEXTURE,
    };

    _barrierPre = _device->getGeneralBarrier(infoPre);
    _barrierBeforeDenoise.push_back(_device->getTextureBarrier(infoBeforeDenoise));
    _barrierBeforeDenoise.push_back(_device->getTextureBarrier(infoBeforeDenoise2));
    _barrierAfterDenoise.push_back(_device->getTextureBarrier(infoAfterDenoise));

    _compConstantsBuffer = _device->createBuffer({gfx::BufferUsage::UNIFORM,
                                                  gfx::MemoryUsage::DEVICE | gfx::MemoryUsage::HOST,
                                                  (sizeof(Mat4) * 4 + sizeof(Vec2) + sizeof(Vec4) + 15) / 16 * 16});

    initReflectionRes();
    initDenoiseRes();
}

void ReflectionComp::getReflectorShader(ShaderSources<ComputeShaderSource> &sources, bool useEnvmap) const {
    sources.glsl4 = StringUtil::format(
        R"(
        #define CC_USE_ENVMAP %d

        layout(local_size_x = %d, local_size_y = %d, local_size_z = 1) in;

        layout(set = 0, binding = 0) uniform Constants
        {
            mat4 matView;
            mat4 matProjInv;
            mat4 matViewProj;
            mat4 matViewProjInv;
            vec4 viewPort;
            vec2 texSize;
        };

        layout(set = 0, binding = 1, std140) uniform CCLocal
        {
            mat4 cc_matWorld;
            mat4 cc_matWorldIT;
            vec4 cc_lightingMapUVParam;
        };

        layout(set = 0, binding = 2) uniform sampler2D lightingTex;
        layout(set = 0, binding = 3) uniform sampler2D depth;
        layout(set = 0, binding = 4, rgba8) writeonly uniform lowp image2D reflectionTex;

        vec4 screen2WS(vec3 coord) {
            vec4 ndc = vec4(
                       2.0 * (coord.x - viewPort.x) / viewPort.z - 1.0,
                       2.0 * (coord.y - viewPort.y) / viewPort.w - 1.0,
                       coord.z,
                       1.0
            );

            vec4 world = matViewProjInv * ndc;
            world = world / world.w;
            return world;
        }

        void main() {
            float _HorizontalPlaneHeightWS = 0.01;
            _HorizontalPlaneHeightWS = (cc_matWorld * vec4(0,0,0,1)).y;
            vec2 uv = vec2(gl_GlobalInvocationID.xy) / texSize;
            vec4 depValue = texture(depth, uv);
            vec2 screenPos = vec2(uv * vec2(viewPort.z, viewPort.w) + vec2(viewPort.x, viewPort.y));
            vec3 posWS = screen2WS(vec3(screenPos, depValue.r)).xyz;
            if(posWS.y <= _HorizontalPlaneHeightWS) return;

            #if CC_USE_ENVMAP
              imageStore(reflectionTex, ivec2(gl_GlobalInvocationID.xy), vec4(0, 0, 0, 1));
            #endif

            vec3 reflectedPosWS = posWS;
            reflectedPosWS.y = reflectedPosWS.y - _HorizontalPlaneHeightWS;
            reflectedPosWS.y = reflectedPosWS.y * -1.0;
            reflectedPosWS.y = reflectedPosWS.y + _HorizontalPlaneHeightWS;

            vec4 reflectedPosCS = matViewProj * vec4(reflectedPosWS, 1);
            vec2 reflectedPosNDCxy = reflectedPosCS.xy / reflectedPosCS.w;//posCS -> posNDC
            vec2 reflectedScreenUV = reflectedPosNDCxy * 0.5 + 0.5; //posNDC

            vec2 earlyExitTest = abs(reflectedScreenUV - 0.5);
            if (earlyExitTest.x >= 0.5 || earlyExitTest.y >= 0.5) return;

            vec4 inputPixelSceneColor = texture(lightingTex, uv);
            imageStore(reflectionTex, ivec2(reflectedScreenUV * texSize), inputPixelSceneColor);
        })",
        useEnvmap, _groupSizeX, _groupSizeY);
    sources.glsl3 = StringUtil::format(
        R"(
        #define CC_USE_ENVMAP %d

        layout(local_size_x = %d, local_size_y = %d, local_size_z = 1) in;

        layout(std140) uniform Constants
        {
            mat4 matView;
            mat4 matProjInv;
            mat4 matViewProj;
            mat4 matViewProjInv;
            vec4 viewPort;
            vec2 texSize;
        };
        uniform sampler2D lightingTex;
        uniform sampler2D depth;
        layout(rgba8) writeonly uniform lowp image2D reflectionTex;

        layout(std140) uniform CCLocal
        {
            mat4 cc_matWorld;
            mat4 cc_matWorldIT;
            vec4 cc_lightingMapUVParam;
        };

        vec4 screen2WS(vec3 coord) {
            vec4 ndc = vec4(
                       2.0 * (coord.x - viewPort.x) / viewPort.z - 1.0,
                       2.0 * (coord.y - viewPort.y) / viewPort.w - 1.0,
                       2.0 * coord.z - 1.0,
                       1.0
            );

            vec4 world = matViewProjInv * ndc;
            world = world / world.w;
            return world;
        }

        void main() {
            float _HorizontalPlaneHeightWS = 0.01;
            _HorizontalPlaneHeightWS = (cc_matWorld * vec4(0,0,0,1)).y;
            vec2 uv = vec2(gl_GlobalInvocationID.xy) / texSize;
            vec4 depValue = texture(depth, uv);
            vec2 screenPos = uv * vec2(viewPort.z, viewPort.w) + vec2(viewPort.x, viewPort.y);
            vec3 posWS = screen2WS(vec3(screenPos, depValue.r)).xyz;
            if(posWS.y <= _HorizontalPlaneHeightWS) return;

            #if CC_USE_ENVMAP
              if (posWS.y - 0.5 > _HorizontalPlaneHeightWS) imageStore(reflectionTex, ivec2(gl_GlobalInvocationID.xy), vec4(0, 0, 0, 1));
            #endif

            vec3 reflectedPosWS = posWS;
            reflectedPosWS.y = reflectedPosWS.y - _HorizontalPlaneHeightWS;
            reflectedPosWS.y = reflectedPosWS.y * -1.0;
            reflectedPosWS.y = reflectedPosWS.y + _HorizontalPlaneHeightWS;

            vec4 reflectedPosCS = matViewProj * vec4(reflectedPosWS, 1);
            vec2 reflectedPosNDCxy = reflectedPosCS.xy / reflectedPosCS.w;//posCS -> posNDC
            vec2 reflectedScreenUV = reflectedPosNDCxy * 0.5 + 0.5; //posNDC

            vec2 earlyExitTest = abs(reflectedScreenUV - 0.5);
            if (earlyExitTest.x >= 0.5 || earlyExitTest.y >= 0.5) return;

            vec4 inputPixelSceneColor = texture(lightingTex, uv);
            imageStore(reflectionTex, ivec2(reflectedScreenUV * texSize), inputPixelSceneColor);
        })",
        useEnvmap, _groupSizeX, _groupSizeY);
}

void ReflectionComp::initReflectionRes() {
    for (int i = 0; i < 2; ++i) {
        ShaderSources<ComputeShaderSource> sources;
        getReflectorShader(sources, i);

        gfx::ShaderInfo shaderInfo;
        shaderInfo.name = "Compute ";
        shaderInfo.stages = {{gfx::ShaderStageFlagBit::COMPUTE, getAppropriateShaderSource(sources)}};
        shaderInfo.blocks = {
            {0, 0, "Constants", {
                                    {"matView", gfx::Type::MAT4, 1},
                                    {"matProjInv", gfx::Type::MAT4, 1},
                                    {"matViewProj", gfx::Type::MAT4, 1},
                                    {"matViewProjInv", gfx::Type::MAT4, 1},
                                    {"viewPort", gfx::Type::FLOAT4, 1},
                                    {"texSize", gfx::Type::FLOAT2, 1},
                                },
             1},
            {0, 1, "CCLocal", {{"cc_matWorld", gfx::Type::MAT4, 1}, {"cc_matWorldIT", gfx::Type::MAT4, 1}, {"cc_lightingMapUVParam", gfx::Type::FLOAT4, 1}}, 1}};
        shaderInfo.samplerTextures = {
            {0, 2, "lightingTex", gfx::Type::SAMPLER2D, 1},
            {0, 3, "depth", gfx::Type::SAMPLER2D, 1}};
        shaderInfo.images = {
            {0, 4, "reflectionTex", gfx::Type::IMAGE2D, 1, gfx::MemoryAccessBit::WRITE_ONLY}};
        _compShader[i] = _device->createShader(shaderInfo);
    }

    gfx::DescriptorSetLayoutInfo dslInfo;
    dslInfo.bindings.push_back({0, gfx::DescriptorType::UNIFORM_BUFFER, 1, gfx::ShaderStageFlagBit::COMPUTE});
    dslInfo.bindings.push_back({1, gfx::DescriptorType::UNIFORM_BUFFER, 1, gfx::ShaderStageFlagBit::COMPUTE});
    dslInfo.bindings.push_back({2, gfx::DescriptorType::SAMPLER_TEXTURE, 1, gfx::ShaderStageFlagBit::COMPUTE});
    dslInfo.bindings.push_back({3, gfx::DescriptorType::SAMPLER_TEXTURE, 1, gfx::ShaderStageFlagBit::COMPUTE});
    dslInfo.bindings.push_back({4, gfx::DescriptorType::STORAGE_IMAGE, 1, gfx::ShaderStageFlagBit::COMPUTE});

    _compDescriptorSetLayout = _device->createDescriptorSetLayout(dslInfo);
    _compDescriptorSet = _device->createDescriptorSet({_compDescriptorSetLayout});

    _compPipelineLayout = _device->createPipelineLayout({{_compDescriptorSetLayout}});

    for (int i = 0; i < 2; ++i) {
        gfx::PipelineStateInfo pipelineInfo;
        pipelineInfo.shader = _compShader[i];
        pipelineInfo.pipelineLayout = _compPipelineLayout;
        pipelineInfo.bindPoint = gfx::PipelineBindPoint::COMPUTE;

        _compPipelineState[i] = _device->createPipelineState(pipelineInfo);
    }
}

void ReflectionComp::getDenoiseShader(ShaderSources<ComputeShaderSource> &sources, bool useEnvmap) const {
    std::ignore = sources;
    std::ignore = useEnvmap;
    std::ignore = _device;
}

void ReflectionComp::initDenoiseRes() {
    for (int i = 0; i < 2; ++i) {
        ShaderSources<ComputeShaderSource> sources;
        getDenoiseShader(sources, i);

        gfx::ShaderInfo shaderInfo;
        shaderInfo.name = "Compute ";
        shaderInfo.stages = {{gfx::ShaderStageFlagBit::COMPUTE, getAppropriateShaderSource(sources)}};

        if (i == 0) {
            shaderInfo.blocks = {};
            shaderInfo.samplerTextures = {
                {0, 1, "reflectionTex", gfx::Type::SAMPLER2D, 1}};
        } else {
            shaderInfo.blocks = {
                {0, 0, "Constants", {
                                        {"matView", gfx::Type::MAT4, 1},
                                        {"matProjInv", gfx::Type::MAT4, 1},
                                        {"matViewProj", gfx::Type::MAT4, 1},
                                        {"matViewProjInv", gfx::Type::MAT4, 1},
                                        {"viewPort", gfx::Type::FLOAT4, 1},
                                        {"texSize", gfx::Type::FLOAT2, 1},
                                    },
                 1},
            };
            shaderInfo.samplerTextures = {
                {0, 1, "reflectionTex", gfx::Type::SAMPLER2D, 1},
                {0, 2, "envMap", gfx::Type::SAMPLER_CUBE, 1},
                {0, 3, "depth", gfx::Type::SAMPLER2D, 1}};
        }

        shaderInfo.images = {
            {1, 12, "denoiseTex", gfx::Type::IMAGE2D, 1, gfx::MemoryAccessBit::WRITE_ONLY}};

        _compDenoiseShader[i] = _device->createShader(shaderInfo);
    }

    gfx::DescriptorSetLayoutInfo dslInfo;
    dslInfo.bindings.push_back({0, gfx::DescriptorType::UNIFORM_BUFFER, 1, gfx::ShaderStageFlagBit::COMPUTE});
    dslInfo.bindings.push_back({1, gfx::DescriptorType::SAMPLER_TEXTURE, 1, gfx::ShaderStageFlagBit::COMPUTE});
    dslInfo.bindings.push_back({2, gfx::DescriptorType::SAMPLER_TEXTURE, 1, gfx::ShaderStageFlagBit::COMPUTE});
    dslInfo.bindings.push_back({3, gfx::DescriptorType::SAMPLER_TEXTURE, 1, gfx::ShaderStageFlagBit::COMPUTE});
    _compDenoiseDescriptorSetLayout = _device->createDescriptorSetLayout(dslInfo);
    _compDenoisePipelineLayout = _device->createPipelineLayout({{_compDenoiseDescriptorSetLayout, _localDescriptorSetLayout}});
    _compDenoiseDescriptorSet = _device->createDescriptorSet({_compDenoiseDescriptorSetLayout});

    for (int i = 0; i < 2; ++i) {
        gfx::PipelineStateInfo pipelineInfo;
        pipelineInfo.shader = _compDenoiseShader[i];
        pipelineInfo.pipelineLayout = _compDenoisePipelineLayout;
        pipelineInfo.bindPoint = gfx::PipelineBindPoint::COMPUTE;

        _compDenoisePipelineState[i] = _device->createPipelineState(pipelineInfo);
    }
}

template <typename T>
T &ReflectionComp::getAppropriateShaderSource(ShaderSources<T> &sources) {
    switch (_device->getGfxAPI()) {
        case gfx::API::GLES2:
            return sources.glsl1;
        case gfx::API::GLES3:
            return sources.glsl3;
        case gfx::API::METAL:
        case gfx::API::VULKAN:
            return sources.glsl4;
        default: break;
    }
    return sources.glsl4;
}

} // namespace cc
