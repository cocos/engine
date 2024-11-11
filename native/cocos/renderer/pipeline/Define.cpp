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

#include "Define.h"
#include "bindings/jswrapper/SeApi.h"
#include "gfx-base/GFXDevice.h"
#include "scene/Light.h"

namespace cc {
namespace pipeline {

static uint32_t globalUBOCount = static_cast<uint32_t>(PipelineGlobalBindings::SAMPLER_SHADOWMAP);
static uint32_t globalSamplerCount = static_cast<uint32_t>(PipelineGlobalBindings::COUNT) - globalUBOCount;

static uint32_t localUBOCount = static_cast<uint32_t>(ModelLocalBindings::SAMPLER_JOINTS);
static uint32_t localSamplerCount = static_cast<uint32_t>(ModelLocalBindings::STORAGE_REFLECTION) - localUBOCount;
static uint32_t localStorageImageCount = static_cast<uint32_t>(ModelLocalBindings::COUNT) - localUBOCount - localSamplerCount;

uint32_t globalSet = static_cast<uint32_t>(SetIndex::GLOBAL);
uint32_t materialSet = static_cast<uint32_t>(SetIndex::MATERIAL);
uint32_t localSet = static_cast<uint32_t>(SetIndex::LOCAL);

gfx::BindingMappingInfo bindingMappingInfo = {
    {globalUBOCount, 0, localUBOCount, 0},         // Uniform Buffer Counts
    {globalSamplerCount, 0, localSamplerCount, 0}, // Combined Sampler Texture Counts
    {0, 0, 0, 0},                                  // Sampler Counts
    {0, 0, 0, 0},                                  // Texture Counts
    {0, 0, 0, 0},                                  // Storage Buffer Counts
    {0, 0, localStorageImageCount, 0},             // Storage Image Counts
    {0, 0, 0, 0},                                  // Subpass Input Counts
    {0, 2, 1, 3},                                  // Set Order Indices
};

DescriptorSetLayoutInfos globalDescriptorSetLayout;
DescriptorSetLayoutInfos localDescriptorSetLayout;
const ccstd::string UBOGlobal::NAME = "CCGlobal";
const gfx::DescriptorSetLayoutBinding UBOGlobal::DESCRIPTOR = {
    UBOGlobal::BINDING,
    gfx::DescriptorType::UNIFORM_BUFFER,
    1,
    gfx::ShaderStageFlagBit::ALL,
    {},
};
const gfx::UniformBlock UBOGlobal::LAYOUT = {
    globalSet,
    UBOGlobal::BINDING,
    UBOGlobal::NAME,
    {
        {"cc_time", gfx::Type::FLOAT4, 1},
        {"cc_screenSize", gfx::Type::FLOAT4, 1},
        {"cc_nativeSize", gfx::Type::FLOAT4, 1},
        {"cc_probeInfo", gfx::Type::FLOAT4, 1},

        {"cc_debug_view_mode", gfx::Type::FLOAT4, 1},
    },
    1,
};

const ccstd::string UBOLocalBatched::NAME = "CCLocalBatched";
const gfx::DescriptorSetLayoutBinding UBOLocalBatched::DESCRIPTOR = {
    UBOLocalBatched::BINDING,
    gfx::DescriptorType::UNIFORM_BUFFER,
    1,
    gfx::ShaderStageFlagBit::VERTEX,
    {},
};
const gfx::UniformBlock UBOLocalBatched::LAYOUT = {
    localSet,
    UBOLocalBatched::BINDING,
    UBOLocalBatched::NAME,
    {
        {"cc_matWorlds", gfx::Type::MAT4, static_cast<uint32_t>(UBOLocalBatched::BATCHING_COUNT)},
    },
    1,
};

const ccstd::string UBOCamera::NAME = "CCCamera";
const gfx::DescriptorSetLayoutBinding UBOCamera::DESCRIPTOR = {
    UBOCamera::BINDING,
    gfx::DescriptorType::DYNAMIC_UNIFORM_BUFFER,
    1,
    gfx::ShaderStageFlagBit::ALL,
    {},
};
const gfx::UniformBlock UBOCamera::LAYOUT = {
    globalSet,
    UBOCamera::BINDING,
    UBOCamera::NAME,
    {
        {"cc_matView", gfx::Type::MAT4, 1},
        {"cc_matViewInv", gfx::Type::MAT4, 1},
        {"cc_matProj", gfx::Type::MAT4, 1},
        {"cc_matProjInv", gfx::Type::MAT4, 1},
        {"cc_matViewProj", gfx::Type::MAT4, 1},
        {"cc_matViewProjInv", gfx::Type::MAT4, 1},
        {"cc_cameraPos", gfx::Type::FLOAT4, 1},
        {"cc_surfaceTransform", gfx::Type::FLOAT4, 1},
        {"cc_screenScale", gfx::Type::FLOAT4, 1},
        {"cc_exposure", gfx::Type::FLOAT4, 1},
        {"cc_mainLitDir", gfx::Type::FLOAT4, 1},
        {"cc_mainLitColor", gfx::Type::FLOAT4, 1},
        {"cc_ambientSky", gfx::Type::FLOAT4, 1},
        {"cc_ambientGround", gfx::Type::FLOAT4, 1},
        {"cc_fogColor", gfx::Type::FLOAT4, 1},
        {"cc_fogBase", gfx::Type::FLOAT4, 1},
        {"cc_fogAdd", gfx::Type::FLOAT4, 1},
        {"cc_nearFar", gfx::Type::FLOAT4, 1},
        {"cc_viewPort", gfx::Type::FLOAT4, 1},
    },
    1,
};

const ccstd::string UBOShadow::NAME = "CCShadow";
const gfx::DescriptorSetLayoutBinding UBOShadow::DESCRIPTOR = {
    UBOShadow::BINDING,
    gfx::DescriptorType::UNIFORM_BUFFER,
    1,
    gfx::ShaderStageFlagBit::ALL,
    {},
};
const gfx::UniformBlock UBOShadow::LAYOUT = {
    globalSet,
    UBOShadow::BINDING,
    UBOShadow::NAME,
    {
        {"cc_matLightView", gfx::Type::MAT4, 1},
        {"cc_matLightViewProj", gfx::Type::MAT4, 1},
        {"cc_shadowInvProjDepthInfo", gfx::Type::FLOAT4, 1},
        {"cc_shadowProjDepthInfo", gfx::Type::FLOAT4, 1},
        {"cc_shadowProjInfo", gfx::Type::FLOAT4, 1},
        {"cc_shadowNFLSInfo", gfx::Type::FLOAT4, 1},
        {"cc_shadowWHPBInfo", gfx::Type::FLOAT4, 1},
        {"cc_shadowLPNNInfo", gfx::Type::FLOAT4, 1},
        {"cc_shadowColor", gfx::Type::FLOAT4, 1},
        {"cc_planarNDInfo", gfx::Type::FLOAT4, 1},
    },
    1,
};

const ccstd::string UBOCSM::NAME = "CCCSM";
const gfx::DescriptorSetLayoutBinding UBOCSM::DESCRIPTOR = {
    UBOCSM::BINDING,
    gfx::DescriptorType::UNIFORM_BUFFER,
    1,
    gfx::ShaderStageFlagBit::FRAGMENT,
    {},
};
const gfx::UniformBlock UBOCSM::LAYOUT = {
    globalSet,
    UBOCSM::BINDING,
    UBOCSM::NAME,
    {
        {"cc_csmViewDir0", gfx::Type::FLOAT4, UBOCSM::CSM_LEVEL_COUNT},
        {"cc_csmViewDir1", gfx::Type::FLOAT4, UBOCSM::CSM_LEVEL_COUNT},
        {"cc_csmViewDir2", gfx::Type::FLOAT4, UBOCSM::CSM_LEVEL_COUNT},
        {"cc_csmAtlas", gfx::Type::FLOAT4, UBOCSM::CSM_LEVEL_COUNT},
        {"cc_matCSMViewProj", gfx::Type::MAT4, UBOCSM::CSM_LEVEL_COUNT},
        {"cc_csmProjDepthInfo", gfx::Type::FLOAT4, UBOCSM::CSM_LEVEL_COUNT},
        {"cc_csmProjInfo", gfx::Type::FLOAT4, UBOCSM::CSM_LEVEL_COUNT},
        {"cc_csmSplitsInfo", gfx::Type::FLOAT4, 1},
    },
    1,
};

const ccstd::string UBOLocal::NAME = "CCLocal";
const gfx::DescriptorSetLayoutBinding UBOLocal::DESCRIPTOR = {
    UBOLocal::BINDING,
    gfx::DescriptorType::UNIFORM_BUFFER,
    1,
    gfx::ShaderStageFlagBit::VERTEX | gfx::ShaderStageFlagBit::FRAGMENT | gfx::ShaderStageFlagBit::COMPUTE,
    {},
};
const gfx::UniformBlock UBOLocal::LAYOUT = {
    localSet,
    UBOLocal::BINDING,
    UBOLocal::NAME,
    {
        {"cc_matWorld", gfx::Type::MAT4, 1},
        {"cc_matWorldIT", gfx::Type::MAT4, 1},
        {"cc_lightingMapUVParam", gfx::Type::FLOAT4, 1},
        {"cc_localShadowBias", gfx::Type::FLOAT4, 1},
        {"cc_reflectionProbeData1", gfx::Type::FLOAT4, 1},
        {"cc_reflectionProbeData2", gfx::Type::FLOAT4, 1},
        {"cc_reflectionProbeBlendData1", gfx::Type::FLOAT4, 1},
        {"cc_reflectionProbeBlendData1", gfx::Type::FLOAT4, 1},
    },
    1,
};

const ccstd::string UBOWorldBound::NAME = "CCWorldBound";
const gfx::DescriptorSetLayoutBinding UBOWorldBound::DESCRIPTOR = {
    UBOWorldBound::BINDING,
    gfx::DescriptorType::UNIFORM_BUFFER,
    1,
    gfx::ShaderStageFlagBit::VERTEX | gfx::ShaderStageFlagBit::FRAGMENT | gfx::ShaderStageFlagBit::COMPUTE,
    {},
};
const gfx::UniformBlock UBOWorldBound::LAYOUT = {
    localSet,
    UBOWorldBound::BINDING,
    UBOWorldBound::NAME,
    {
        {"cc_worldBoundCenter", gfx::Type::FLOAT4, 1},
        {"cc_worldBoundHalfExtents", gfx::Type::FLOAT4, 1},
    },
    1,
};

const ccstd::string UBOForwardLight::NAME = "CCForwardLight";
const gfx::DescriptorSetLayoutBinding UBOForwardLight::DESCRIPTOR = {
    UBOForwardLight::BINDING,
    gfx::DescriptorType::DYNAMIC_UNIFORM_BUFFER,
    1,
    gfx::ShaderStageFlagBit::FRAGMENT,
    {},
};
const gfx::UniformBlock UBOForwardLight::LAYOUT = {
    localSet,
    UBOForwardLight::BINDING,
    UBOForwardLight::NAME,
    {
        {"cc_lightPos", gfx::Type::FLOAT4, static_cast<uint32_t>(UBOForwardLight::LIGHTS_PER_PASS)},
        {"cc_lightColor", gfx::Type::FLOAT4, static_cast<uint32_t>(UBOForwardLight::LIGHTS_PER_PASS)},
        {"cc_lightSizeRangeAngle", gfx::Type::FLOAT4, static_cast<uint32_t>(UBOForwardLight::LIGHTS_PER_PASS)},
        {"cc_lightDir", gfx::Type::FLOAT4, static_cast<uint32_t>(UBOForwardLight::LIGHTS_PER_PASS)},
        {"cc_lightBoundingSizeVS", gfx::Type::FLOAT4, static_cast<uint32_t>(UBOForwardLight::LIGHTS_PER_PASS)},
    },
    1,
};

const ccstd::string UBOSkinningTexture::NAME = "CCSkinningTexture";
const gfx::DescriptorSetLayoutBinding UBOSkinningTexture::DESCRIPTOR = {
    UBOSkinningTexture::BINDING,
    gfx::DescriptorType::UNIFORM_BUFFER,
    1,
    gfx::ShaderStageFlagBit::VERTEX,
    {},
};
const gfx::UniformBlock UBOSkinningTexture::LAYOUT = {
    localSet,
    UBOSkinningTexture::BINDING,
    UBOSkinningTexture::NAME,
    {
        {"cc_jointTextureInfo", gfx::Type::FLOAT4, 1},
    },
    1,
};

const ccstd::string UBOSkinningAnimation::NAME = "CCSkinningAnimation";
const gfx::DescriptorSetLayoutBinding UBOSkinningAnimation::DESCRIPTOR = {
    UBOSkinningAnimation::BINDING,
    gfx::DescriptorType::UNIFORM_BUFFER,
    1,
    gfx::ShaderStageFlagBit::VERTEX,
    {},
};
const gfx::UniformBlock UBOSkinningAnimation::LAYOUT = {
    localSet,
    UBOSkinningAnimation::BINDING,
    UBOSkinningAnimation::NAME,
    {
        {"cc_jointAnimInfo", gfx::Type::FLOAT4, 1},
    },
    1,
};

uint SkinningJointCapacity::jointUniformCapacity = 0;
uint32_t UBOSkinning::count = 0;
uint32_t UBOSkinning::size = 0;
const ccstd::string UBOSkinning::NAME = "CCSkinning";
const gfx::DescriptorSetLayoutBinding UBOSkinning::DESCRIPTOR = {
    UBOSkinning::BINDING,
    gfx::DescriptorType::UNIFORM_BUFFER,
    1,
    gfx::ShaderStageFlagBit::VERTEX,
    {},
};
gfx::UniformBlock UBOSkinning::layout = {
    localSet,
    UBOSkinning::BINDING,
    UBOSkinning::NAME,
    {
        {"cc_joints", gfx::Type::FLOAT4, 0},
    },
    1,
};
void UBOSkinning::initLayout(uint32_t capacity) {
    UBOSkinning::count = capacity * 12;
    UBOSkinning::size = UBOSkinning::count * sizeof(float);
    UBOSkinning::layout.members[0].count = capacity * 3;
}

const uint32_t UBOMorph::COUNT_BASE_4_BYTES = static_cast<uint32_t>(4 * std::ceil(UBOMorph::MAX_MORPH_TARGET_COUNT / 4) + 4);
const uint32_t UBOMorph::SIZE = UBOMorph::COUNT_BASE_4_BYTES * 4;
const ccstd::string UBOMorph::NAME = "CCMorph";
const gfx::DescriptorSetLayoutBinding UBOMorph::DESCRIPTOR = {
    UBOMorph::BINDING,
    gfx::DescriptorType::UNIFORM_BUFFER,
    1,
    gfx::ShaderStageFlagBit::VERTEX,
    {},
};
const gfx::UniformBlock UBOMorph::LAYOUT = {
    localSet,
    UBOMorph::BINDING,
    UBOMorph::NAME,
    {
        {"cc_displacementWeights", gfx::Type::FLOAT4, static_cast<uint32_t>(UBOMorph::MAX_MORPH_TARGET_COUNT / 4)},
        {"cc_displacementTextureInfo", gfx::Type::FLOAT4, 1},
    },
    1,
};

const ccstd::string UBOUILocal::NAME = "CCUILocal";
const gfx::DescriptorSetLayoutBinding UBOUILocal::DESCRIPTOR = {
    UBOUILocal::BINDING,
    gfx::DescriptorType::DYNAMIC_UNIFORM_BUFFER,
    1,
    gfx::ShaderStageFlagBit::VERTEX,
};
const gfx::UniformBlock UBOUILocal::LAYOUT = {
    localSet,
    UBOUILocal::BINDING,
    UBOUILocal::NAME,
    {
        {"cc_local_data", gfx::Type::FLOAT4, 1},
    },
    1,
};

const ccstd::string UBOSH::NAME = "CCSH";
const gfx::DescriptorSetLayoutBinding UBOSH::DESCRIPTOR = {
    UBOSH::BINDING,
    gfx::DescriptorType::UNIFORM_BUFFER,
    1,
    gfx::ShaderStageFlagBit::FRAGMENT,
    {},
};
const gfx::UniformBlock UBOSH::LAYOUT = {
    localSet,
    UBOSH::BINDING,
    UBOSH::NAME,
    {
        {"cc_sh_linear_const_r", gfx::Type::FLOAT4, 1},
        {"cc_sh_linear_const_g", gfx::Type::FLOAT4, 1},
        {"cc_sh_linear_const_b", gfx::Type::FLOAT4, 1},
        {"cc_sh_quadratic_r", gfx::Type::FLOAT4, 1},
        {"cc_sh_quadratic_g", gfx::Type::FLOAT4, 1},
        {"cc_sh_quadratic_b", gfx::Type::FLOAT4, 1},
        {"cc_sh_quadratic_a", gfx::Type::FLOAT4, 1},
    },
    1,
};

const ccstd::string SHADOWMAP::NAME = "cc_shadowMap";
const gfx::DescriptorSetLayoutBinding SHADOWMAP::DESCRIPTOR = {
    SHADOWMAP::BINDING,
    gfx::DescriptorType::SAMPLER_TEXTURE,
    1,
    gfx::ShaderStageFlagBit::FRAGMENT,
    {},
};
const gfx::UniformSamplerTexture SHADOWMAP::LAYOUT = {
    globalSet,
    SHADOWMAP::BINDING,
    SHADOWMAP::NAME,
    gfx::Type::SAMPLER2D,
    1,
};

const ccstd::string ENVIRONMENT::NAME = "cc_environment";
const gfx::DescriptorSetLayoutBinding ENVIRONMENT::DESCRIPTOR = {
    ENVIRONMENT::BINDING,
    gfx::DescriptorType::SAMPLER_TEXTURE,
    1,
    gfx::ShaderStageFlagBit::FRAGMENT,
    {},
};
const gfx::UniformSamplerTexture ENVIRONMENT::LAYOUT = {
    globalSet,
    ENVIRONMENT::BINDING,
    ENVIRONMENT::NAME,
    gfx::Type::SAMPLER_CUBE,
    1,
};

const ccstd::string SPOTSHADOWMAP::NAME = "cc_spotShadowMap";
const gfx::DescriptorSetLayoutBinding SPOTSHADOWMAP::DESCRIPTOR = {
    SPOTSHADOWMAP::BINDING,
    gfx::DescriptorType::SAMPLER_TEXTURE,
    1,
    gfx::ShaderStageFlagBit::FRAGMENT,
    {},
};
const gfx::UniformSamplerTexture SPOTSHADOWMAP::LAYOUT = {
    globalSet,
    SPOTSHADOWMAP::BINDING,
    SPOTSHADOWMAP::NAME,
    gfx::Type::SAMPLER2D,
    1,
};

const ccstd::string DIFFUSEMAP::NAME = "cc_diffuseMap";
const gfx::DescriptorSetLayoutBinding DIFFUSEMAP::DESCRIPTOR = {
    DIFFUSEMAP::BINDING,
    gfx::DescriptorType::SAMPLER_TEXTURE,
    1,
    gfx::ShaderStageFlagBit::FRAGMENT,
    {},
};
const gfx::UniformSamplerTexture DIFFUSEMAP::LAYOUT = {
    globalSet,
    DIFFUSEMAP::BINDING,
    DIFFUSEMAP::NAME,
    gfx::Type::SAMPLER_CUBE,
    1,
};

const ccstd::string TOPLEVELAS::NAME = "cc_toplevelAccelerationStructure";
const gfx::DescriptorSetLayoutBinding TOPLEVELAS::DESCRIPTOR = {
    BINDING,
    gfx::DescriptorType::ACCELERATION_STRUCTURE,
    1,
    gfx::ShaderStageFlagBit::FRAGMENT,
    {},
};
const gfx::AccelerationStructureLayout TOPLEVELAS::LAYOUT = {
    globalSet,
    BINDING,
    NAME,
    gfx::Type::ACCELERATION_STRUCTURE,
    1,
};

const ccstd::string SCENEGEOMETRYDESC::NAME = "cc_scene_geometry_desc";
const gfx::DescriptorSetLayoutBinding SCENEGEOMETRYDESC::DESCRIPTOR = {
    BINDING,
    gfx::DescriptorType::STORAGE_BUFFER,
    1,
    gfx::ShaderStageFlagBit::FRAGMENT,
    {},
};
const gfx::UniformStorageBuffer SCENEGEOMETRYDESC::LAYOUT = {
    globalSet,
    BINDING,
    NAME,
    1, gfx::MemoryAccess::READ_ONLY
};

const ccstd::string SCENEINSTANCEDESC::NAME = "cc_scene_instance_desc";
const gfx::DescriptorSetLayoutBinding SCENEINSTANCEDESC::DESCRIPTOR = {
    BINDING,
    gfx::DescriptorType::STORAGE_BUFFER,
    1,
    gfx::ShaderStageFlagBit::FRAGMENT,
    {},
};
const gfx::UniformStorageBuffer SCENEINSTANCEDESC::LAYOUT = {
    globalSet,
    BINDING,
    NAME,
    1,
    gfx::MemoryAccess::READ_ONLY
};

const ccstd::string JOINTTEXTURE::NAME = "cc_jointTexture";
const gfx::DescriptorSetLayoutBinding JOINTTEXTURE::DESCRIPTOR = {
    JOINTTEXTURE::BINDING,
    gfx::DescriptorType::SAMPLER_TEXTURE,
    1,
    gfx::ShaderStageFlagBit::VERTEX,
    {},
};
const gfx::UniformSamplerTexture JOINTTEXTURE::LAYOUT = {
    localSet,
    JOINTTEXTURE::BINDING,
    JOINTTEXTURE::NAME,
    gfx::Type::SAMPLER2D,
    1,
};

const ccstd::string REALTIMEJOINTTEXTURE::NAME = "cc_realtimeJoint";
const gfx::DescriptorSetLayoutBinding REALTIMEJOINTTEXTURE::DESCRIPTOR = {
    REALTIMEJOINTTEXTURE::BINDING,
    gfx::DescriptorType::SAMPLER_TEXTURE,
    1,
    gfx::ShaderStageFlagBit::VERTEX,
    {},
};
const gfx::UniformSamplerTexture REALTIMEJOINTTEXTURE::LAYOUT = {
    localSet,
    REALTIMEJOINTTEXTURE::BINDING,
    REALTIMEJOINTTEXTURE::NAME,
    gfx::Type::SAMPLER2D,
    1,
};

const ccstd::string POSITIONMORPH::NAME = "cc_PositionDisplacements";
const gfx::DescriptorSetLayoutBinding POSITIONMORPH::DESCRIPTOR = {
    POSITIONMORPH::BINDING,
    gfx::DescriptorType::SAMPLER_TEXTURE,
    1,
    gfx::ShaderStageFlagBit::VERTEX,
    {},
};
const gfx::UniformSamplerTexture POSITIONMORPH::LAYOUT = {
    localSet,
    POSITIONMORPH::BINDING,
    POSITIONMORPH::NAME,
    gfx::Type::SAMPLER2D,
    1,
};

const ccstd::string NORMALMORPH::NAME = "cc_NormalDisplacements";
const gfx::DescriptorSetLayoutBinding NORMALMORPH::DESCRIPTOR = {
    NORMALMORPH::BINDING,
    gfx::DescriptorType::SAMPLER_TEXTURE,
    1,
    gfx::ShaderStageFlagBit::VERTEX,
    {},
};
const gfx::UniformSamplerTexture NORMALMORPH::LAYOUT = {
    localSet,
    NORMALMORPH::BINDING,
    NORMALMORPH::NAME,
    gfx::Type::SAMPLER2D,
    1,
};

const ccstd::string TANGENTMORPH::NAME = "cc_TangentDisplacements";
const gfx::DescriptorSetLayoutBinding TANGENTMORPH::DESCRIPTOR = {
    TANGENTMORPH::BINDING,
    gfx::DescriptorType::SAMPLER_TEXTURE,
    1,
    gfx::ShaderStageFlagBit::VERTEX,
    {},
};
const gfx::UniformSamplerTexture TANGENTMORPH::LAYOUT = {
    localSet,
    TANGENTMORPH::BINDING,
    TANGENTMORPH::NAME,
    gfx::Type::SAMPLER2D,
    1,
};

const ccstd::string LIGHTMAPTEXTURE::NAME = "cc_lightingMap";
const gfx::DescriptorSetLayoutBinding LIGHTMAPTEXTURE::DESCRIPTOR = {
    LIGHTMAPTEXTURE::BINDING,
    gfx::DescriptorType::SAMPLER_TEXTURE,
    1,
    gfx::ShaderStageFlagBit::FRAGMENT,
    {},
};
const gfx::UniformSamplerTexture LIGHTMAPTEXTURE::LAYOUT = {
    localSet,
    LIGHTMAPTEXTURE::BINDING,
    LIGHTMAPTEXTURE::NAME,
    gfx::Type::SAMPLER2D,
    1,
};

const ccstd::string SPRITETEXTURE::NAME = "cc_spriteTexture";
const gfx::DescriptorSetLayoutBinding SPRITETEXTURE::DESCRIPTOR = {
    SPRITETEXTURE::BINDING,
    gfx::DescriptorType::SAMPLER_TEXTURE,
    1,
    gfx::ShaderStageFlagBit::FRAGMENT,
    {},
};
const gfx::UniformSamplerTexture SPRITETEXTURE::LAYOUT = {
    localSet,
    static_cast<uint32_t>(ModelLocalBindings::SAMPLER_SPRITE),
    "cc_spriteTexture",
    gfx::Type::SAMPLER2D,
    1,
};

const ccstd::string REFLECTIONTEXTURE::NAME = "cc_reflectionTexture";
const gfx::DescriptorSetLayoutBinding REFLECTIONTEXTURE::DESCRIPTOR = {
    REFLECTIONTEXTURE::BINDING,
    gfx::DescriptorType::SAMPLER_TEXTURE,
    1,
    gfx::ShaderStageFlagBit::FRAGMENT,
    {},
};
const gfx::UniformSamplerTexture REFLECTIONTEXTURE::LAYOUT = {
    localSet,
    static_cast<uint32_t>(ModelLocalBindings::SAMPLER_REFLECTION),
    "cc_reflectionTexture",
    gfx::Type::SAMPLER2D,
    1,
};

const ccstd::string REFLECTIONSTORAGE::NAME = "cc_reflectionStorage";
const gfx::DescriptorSetLayoutBinding REFLECTIONSTORAGE::DESCRIPTOR = {
    REFLECTIONSTORAGE::BINDING,
    gfx::DescriptorType::STORAGE_IMAGE,
    1,
    gfx::ShaderStageFlagBit::COMPUTE,
    {},
};
const gfx::UniformStorageImage REFLECTIONSTORAGE::LAYOUT = {
    localSet,
    static_cast<uint32_t>(ModelLocalBindings::STORAGE_REFLECTION),
    "cc_reflectionStorage",
    gfx::Type::IMAGE2D,
    1,
};

const ccstd::string REFLECTIONPROBECUBEMAP::NAME = "cc_reflectionProbeCubemap";
const gfx::DescriptorSetLayoutBinding REFLECTIONPROBECUBEMAP::DESCRIPTOR = {
    REFLECTIONPROBECUBEMAP::BINDING,
    gfx::DescriptorType::SAMPLER_TEXTURE,
    1,
    gfx::ShaderStageFlagBit::FRAGMENT,
    {},
};
const gfx::UniformSamplerTexture REFLECTIONPROBECUBEMAP::LAYOUT = {
    localSet,
    REFLECTIONPROBECUBEMAP::BINDING,
    REFLECTIONPROBECUBEMAP::NAME,
    gfx::Type::SAMPLER_CUBE,
    1,
};

const ccstd::string REFLECTIONPROBEPLANARMAP::NAME = "cc_reflectionProbePlanarMap";
const gfx::DescriptorSetLayoutBinding REFLECTIONPROBEPLANARMAP::DESCRIPTOR = {
    REFLECTIONPROBEPLANARMAP::BINDING,
    gfx::DescriptorType::SAMPLER_TEXTURE,
    1,
    gfx::ShaderStageFlagBit::FRAGMENT,
    {},
};
const gfx::UniformSamplerTexture REFLECTIONPROBEPLANARMAP::LAYOUT = {
    localSet,
    REFLECTIONPROBEPLANARMAP::BINDING,
    REFLECTIONPROBEPLANARMAP::NAME,
    gfx::Type::SAMPLER2D,
    1,
};

const ccstd::string REFLECTIONPROBEDATAMAP::NAME = "cc_reflectionProbeDataMap";
const gfx::DescriptorSetLayoutBinding REFLECTIONPROBEDATAMAP::DESCRIPTOR = {
    REFLECTIONPROBEDATAMAP::BINDING,
    gfx::DescriptorType::SAMPLER_TEXTURE,
    1,
    gfx::ShaderStageFlagBit::FRAGMENT,
    {},
};
const gfx::UniformSamplerTexture REFLECTIONPROBEDATAMAP::LAYOUT = {
    localSet,
    REFLECTIONPROBEDATAMAP::BINDING,
    REFLECTIONPROBEDATAMAP::NAME,
    gfx::Type::SAMPLER2D,
    1,
};

const ccstd::string REFLECTIONPROBEBLENDCUBEMAP::NAME = "cc_reflectionProbeBlendCubemap";
const gfx::DescriptorSetLayoutBinding REFLECTIONPROBEBLENDCUBEMAP::DESCRIPTOR = {
    REFLECTIONPROBEBLENDCUBEMAP::BINDING,
    gfx::DescriptorType::SAMPLER_TEXTURE,
    1,
    gfx::ShaderStageFlagBit::FRAGMENT,
    {},
};
const gfx::UniformSamplerTexture REFLECTIONPROBEBLENDCUBEMAP::LAYOUT = {
    localSet,
    REFLECTIONPROBEBLENDCUBEMAP::BINDING,
    REFLECTIONPROBEBLENDCUBEMAP::NAME,
    gfx::Type::SAMPLER_CUBE,
    1,
};

uint32_t skyboxFlag = static_cast<uint32_t>(gfx::ClearFlagBit::STENCIL) << 1;

uint32_t nextPow2(uint32_t val) {
    --val;
    val |= (val >> 1);
    val |= (val >> 2);
    val |= (val >> 4);
    val |= (val >> 8);
    val |= (val >> 16);
    ++val;
    return val;
}

bool supportsR16HalfFloatTexture(const gfx::Device* device) {
    return hasAllFlags(device->getFormatFeatures(gfx::Format::R16F), gfx::FormatFeature::RENDER_TARGET | gfx::FormatFeature::SAMPLED_TEXTURE);
}
bool supportsRGBA16HalfFloatTexture(const gfx::Device* device) {
    return hasAllFlags(device->getFormatFeatures(gfx::Format::RGBA16F), gfx::FormatFeature::RENDER_TARGET | gfx::FormatFeature::SAMPLED_TEXTURE);
}

bool supportsR32FloatTexture(const gfx::Device* device) {
    return hasAllFlags(device->getFormatFeatures(gfx::Format::R32F), gfx::FormatFeature::RENDER_TARGET | gfx::FormatFeature::SAMPLED_TEXTURE);
}
bool supportsRGBA32FloatTexture(const gfx::Device* device) {
    return hasAllFlags(device->getFormatFeatures(gfx::Format::RGBA32F), gfx::FormatFeature::RENDER_TARGET | gfx::FormatFeature::SAMPLED_TEXTURE);
}

static ccstd::unordered_map<ccstd::string, uint32_t> phases; //cjh how to clear this global variable when exiting game?
static uint32_t phaseNum = 0;

uint32_t getPhaseID(const ccstd::string& phaseName) {
    const auto iter = phases.find(phaseName);
    if (iter == phases.end()) {
        phases.emplace(phaseName, 1 << phaseNum);
        ++phaseNum;
    }
    return phases.at(phaseName);
}

void localDescriptorSetLayoutResizeMaxJoints(uint32_t maxCount) {
    UBOSkinning::initLayout(maxCount);
    localDescriptorSetLayout.blocks[UBOSkinning::NAME] = UBOSkinning::layout;
    localDescriptorSetLayout.bindings[UBOSkinning::BINDING] = UBOSkinning::DESCRIPTOR;
}

} // namespace pipeline
} // namespace cc
