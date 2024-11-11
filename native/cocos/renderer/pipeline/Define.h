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

#pragma once

#include <functional>
#include "base/Ptr.h"
#include "base/RefCounted.h"
#include "base/TypeDef.h"
#include "base/Value.h"
#include "renderer/gfx-base/GFXDef.h"

namespace cc {

namespace scene {
class Model;
class SubModel;
class Light;
} // namespace scene

namespace pipeline {

class RenderStage;
class RenderFlow;

// The actual uniform vectors used is JointUniformCapacity * 3.
// We think this is a reasonable default capacity considering MAX_VERTEX_UNIFORM_VECTORS in WebGL spec is just 128.
// Skinning models with number of bones more than this capacity will be automatically switched to texture skinning.
// But still, you can tweak this for your own need by changing the number below
// and the JOINT_UNIFORM_CAPACITY macro in cc-skinning shader header.
class CC_DLL SkinningJointCapacity {
public:
    static uint32_t jointUniformCapacity;
};

constexpr float SHADOW_CAMERA_MAX_FAR = 2000.0F;
const float COEFFICIENT_OF_EXPANSION = 2.0F * sqrtf(3.0F);

struct CC_DLL RenderObject {
    float depth = 0.0F;
    const scene::Model *model = nullptr;
};
using RenderObjectList = ccstd::vector<struct RenderObject>;

struct CC_DLL RenderTargetInfo {
    uint32_t width = 0;
    uint32_t height = 0;
};

struct CC_DLL RenderPass {
    uint32_t priority = 0;
    uint32_t hash = 0;
    float depth = 0.0F;
    uint32_t shaderID = 0;
    uint32_t passIndex = 0;
    const scene::SubModel *subModel = nullptr;
};
using RenderPassList = ccstd::vector<RenderPass>;

using ColorDesc = gfx::ColorAttachment;
using ColorDescList = ccstd::vector<ColorDesc>;

using DepthStencilDesc = gfx::DepthStencilAttachment;

struct CC_DLL RenderPassDesc {
    uint32_t index = 0;
    ColorDescList colorAttachments;
    DepthStencilDesc depthStencilAttachment;
};
using RenderPassDescList = ccstd::vector<RenderPassDesc>;

struct CC_DLL RenderTextureDesc {
    ccstd::string name;
    gfx::TextureType type = gfx::TextureType::TEX2D;
    gfx::TextureUsage usage = gfx::TextureUsage::COLOR_ATTACHMENT;
    gfx::Format format = gfx::Format::UNKNOWN;
    int width = -1;
    int height = -1;
};
using RenderTextureDescList = ccstd::vector<RenderTextureDesc>;

struct CC_DLL FrameBufferDesc {
    ccstd::string name;
    uint32_t renderPass = 0;
    ccstd::vector<ccstd::string> colorTextures;
    ccstd::string depthStencilTexture;
};
using FrameBufferDescList = ccstd::vector<FrameBufferDesc>;

enum class RenderFlowType : uint8_t {
    SCENE,
    POSTPROCESS,
    UI,
};
CC_ENUM_CONVERSION_OPERATOR(RenderFlowType)

using RenderStageList = ccstd::vector<IntrusivePtr<RenderStage>>;
using RenderFlowList = ccstd::vector<IntrusivePtr<RenderFlow>>;
using LightList = ccstd::vector<scene::Light *>;
using UintList = ccstd::vector<uint32_t>;

enum class CC_DLL RenderPassStage {
    DEFAULT = 100,
    UI = 200,
};
CC_ENUM_CONVERSION_OPERATOR(RenderPassStage)

struct CC_DLL InternalBindingDesc {
    gfx::DescriptorType type;
    gfx::UniformBlock blockInfo;
    gfx::UniformSamplerTexture samplerInfo;
    Value defaultValue;
};

struct CC_DLL InternalBindingInst : public InternalBindingDesc {
    gfx::Buffer *buffer = nullptr;
    gfx::Sampler *sampler = nullptr;
    gfx::Texture *texture = nullptr;
};

struct CC_DLL RenderQueueCreateInfo {
    bool isTransparent = false;
    uint32_t phases = 0;
    std::function<bool(const RenderPass &a, const RenderPass &b)> sortFunc;
};

enum class CC_DLL RenderPriority {
    MIN = 0,
    MAX = 0xff,
    DEFAULT = 0x80,
};
CC_ENUM_CONVERSION_OPERATOR(RenderPriority)

enum class CC_DLL RenderQueueSortMode {
    FRONT_TO_BACK,
    BACK_TO_FRONT,
};
CC_ENUM_CONVERSION_OPERATOR(RenderQueueSortMode)

class CC_DLL RenderQueueDesc : public RefCounted {
public:
    RenderQueueDesc() = default;
    RenderQueueDesc(bool isTransparent, RenderQueueSortMode sortMode, const ccstd::vector<ccstd::string> &stages) // NOLINT
    : isTransparent(isTransparent), sortMode(sortMode), stages(stages) {}
    bool isTransparent = false;
    RenderQueueSortMode sortMode = RenderQueueSortMode::FRONT_TO_BACK;
    ccstd::vector<ccstd::string> stages;
};
using RenderQueueDescList = ccstd::vector<IntrusivePtr<RenderQueueDesc>>;

uint32_t getPhaseID(const ccstd::string &phase);

inline bool opaqueCompareFn(const RenderPass &a, const RenderPass &b) {
    if (a.hash != b.hash) {
        return a.hash < b.hash;
    }

    if (math::isNotEqualF(a.depth, b.depth)) {
        return a.depth < b.depth;
    }

    return a.shaderID < b.shaderID;
}

inline bool transparentCompareFn(const RenderPass &a, const RenderPass &b) {
    if (a.priority != b.priority) {
        return a.priority < b.priority;
    }

    if (a.hash != b.hash) {
        return a.hash < b.hash;
    }

    if (math::isNotEqualF(a.depth, b.depth)) {
        return b.depth < a.depth;
    }

    return a.shaderID < b.shaderID;
}

inline uint32_t convertPhase(const ccstd::vector<ccstd::string> &stages) {
    uint32_t phase = 0;
    for (const auto &stage : stages) {
        phase |= getPhaseID(stage);
    }
    return phase;
}

using RenderQueueSortFunc = std::function<int(const RenderPass &, const RenderPass &)>;

inline RenderQueueSortFunc convertQueueSortFunc(const RenderQueueSortMode &mode) {
    std::function<int(const RenderPass &, const RenderPass &)> sortFunc = opaqueCompareFn;
    switch (mode) {
        case RenderQueueSortMode::BACK_TO_FRONT:
            sortFunc = transparentCompareFn;
            break;
        case RenderQueueSortMode::FRONT_TO_BACK:
            sortFunc = opaqueCompareFn;
            break;
        default:
            break;
    }

    return sortFunc;
}

enum class CC_DLL PipelineGlobalBindings {
    UBO_GLOBAL,
    UBO_CAMERA,
    UBO_SHADOW,
    UBO_CSM, // should reserve slot for this optional ubo

    SAMPLER_SHADOWMAP,
    SAMPLER_ENVIRONMENT,
    SAMPLER_SPOT_SHADOW_MAP,
    SAMPLER_DIFFUSEMAP,

    ACCEL_STRUC_TOPLEVEL,
    STORAGE_SCENE_GEOM,
    STORAGE_SCENE_INSTANCE,

    COUNT,
};
CC_ENUM_CONVERSION_OPERATOR(PipelineGlobalBindings)

enum class CC_DLL ModelLocalBindings {
    UBO_LOCAL,
    UBO_FORWARD_LIGHTS,
    UBO_SKINNING_ANIMATION,
    UBO_SKINNING_TEXTURE,
    UBO_MORPH,
    UBO_UI_LOCAL,
    UBO_SH,

    SAMPLER_JOINTS,
    SAMPLER_MORPH_POSITION,
    SAMPLER_MORPH_NORMAL,
    SAMPLER_MORPH_TANGENT,
    SAMPLER_LIGHTMAP,
    SAMPLER_SPRITE,
    SAMPLER_REFLECTION,

    STORAGE_REFLECTION,

    SAMPLER_REFLECTION_PROBE_CUBE,
    SAMPLER_REFLECTION_PROBE_PLANAR,
    SAMPLER_REFLECTION_PROBE_DATA_MAP,
    SAMPLER_REFLECTION_PROBE_BLEND_CUBE,
    COUNT,
};
CC_ENUM_CONVERSION_OPERATOR(ModelLocalBindings)

enum class CC_DLL SetIndex {
    GLOBAL,
    MATERIAL,
    LOCAL,
    COUNT,
};
CC_ENUM_CONVERSION_OPERATOR(SetIndex)

extern CC_DLL uint32_t globalSet;
extern CC_DLL uint32_t materialSet;
extern CC_DLL uint32_t localSet;

extern CC_DLL gfx::BindingMappingInfo bindingMappingInfo;

struct CC_DLL UBOLocalBatched {
    static constexpr uint32_t BATCHING_COUNT = 10;
    static constexpr uint32_t MAT_WORLDS_OFFSET = 0;
    static constexpr uint32_t COUNT = 16 * UBOLocalBatched::BATCHING_COUNT;
    static constexpr uint32_t SIZE = UBOLocalBatched::COUNT * 4;
    static constexpr uint32_t BINDING = static_cast<uint32_t>(ModelLocalBindings::UBO_LOCAL);
    static const gfx::DescriptorSetLayoutBinding DESCRIPTOR;
    static const gfx::UniformBlock LAYOUT;
    static const ccstd::string NAME;
};

struct CC_DLL UBOLocal {
    static constexpr uint32_t MAT_WORLD_OFFSET = 0;
    static constexpr uint32_t MAT_WORLD_IT_OFFSET = UBOLocal::MAT_WORLD_OFFSET + 16;
    static constexpr uint32_t LIGHTINGMAP_UVPARAM = UBOLocal::MAT_WORLD_IT_OFFSET + 16;
    static constexpr uint32_t LOCAL_SHADOW_BIAS = UBOLocal::LIGHTINGMAP_UVPARAM + 4;
    static constexpr uint32_t REFLECTION_PROBE_DATA1 = UBOLocal::LOCAL_SHADOW_BIAS + 4;
    static constexpr uint32_t REFLECTION_PROBE_DATA2 = UBOLocal::REFLECTION_PROBE_DATA1 + 4;
    static constexpr uint32_t REFLECTION_PROBE_BLEND_DATA1 = UBOLocal::REFLECTION_PROBE_DATA2 + 4;
    static constexpr uint32_t REFLECTION_PROBE_BLEND_DATA2 = UBOLocal::REFLECTION_PROBE_BLEND_DATA1 + 4;
    static constexpr uint32_t COUNT = UBOLocal::REFLECTION_PROBE_BLEND_DATA2 + 4;
    static constexpr uint32_t SIZE = UBOLocal::COUNT * 4;
    static constexpr uint32_t BINDING = static_cast<uint32_t>(ModelLocalBindings::UBO_LOCAL);
    static const gfx::DescriptorSetLayoutBinding DESCRIPTOR;
    static const gfx::UniformBlock LAYOUT;
    static const ccstd::string NAME;
};

struct CC_DLL UBOWorldBound {
    static constexpr uint32_t WORLD_BOUND_CENTER = 0;
    static constexpr uint32_t WORLD_BOUND_HALF_EXTENTS = UBOWorldBound::WORLD_BOUND_CENTER + 4;
    static constexpr uint32_t COUNT = UBOWorldBound::WORLD_BOUND_HALF_EXTENTS + 4;
    static constexpr uint32_t SIZE = UBOWorldBound::COUNT * 4;
    static constexpr uint32_t BINDING = static_cast<uint32_t>(ModelLocalBindings::UBO_LOCAL);
    static const gfx::DescriptorSetLayoutBinding DESCRIPTOR;
    static const gfx::UniformBlock LAYOUT;
    static const ccstd::string NAME;
};

struct CC_DLL UBOForwardLight {
    static constexpr uint32_t LIGHTS_PER_PASS = 1;
    static constexpr uint32_t LIGHT_POS_OFFSET = 0;
    static constexpr uint32_t LIGHT_COLOR_OFFSET = UBOForwardLight::LIGHT_POS_OFFSET + UBOForwardLight::LIGHTS_PER_PASS * 4;
    static constexpr uint32_t LIGHT_SIZE_RANGE_ANGLE_OFFSET = UBOForwardLight::LIGHT_COLOR_OFFSET + UBOForwardLight::LIGHTS_PER_PASS * 4;
    static constexpr uint32_t LIGHT_DIR_OFFSET = UBOForwardLight::LIGHT_SIZE_RANGE_ANGLE_OFFSET + UBOForwardLight::LIGHTS_PER_PASS * 4;
    static constexpr uint32_t LIGHT_BOUNDING_SIZE_VS_OFFSET = UBOForwardLight::LIGHT_DIR_OFFSET + UBOForwardLight::LIGHTS_PER_PASS * 4;
    static constexpr uint32_t COUNT = UBOForwardLight::LIGHT_BOUNDING_SIZE_VS_OFFSET + UBOForwardLight::LIGHTS_PER_PASS * 4;
    static constexpr uint32_t SIZE = UBOForwardLight::COUNT * 4;
    static constexpr uint32_t BINDING = static_cast<uint32_t>(ModelLocalBindings::UBO_FORWARD_LIGHTS);
    static const gfx::DescriptorSetLayoutBinding DESCRIPTOR;
    static const gfx::UniformBlock LAYOUT;
    static const ccstd::string NAME;
};

struct CC_DLL UBODeferredLight {
    static constexpr uint32_t LIGHTS_PER_PASS = 10;
};

struct CC_DLL UBOSkinningTexture {
    static constexpr uint32_t JOINTS_TEXTURE_INFO_OFFSET = 0;
    static constexpr uint32_t COUNT = UBOSkinningTexture::JOINTS_TEXTURE_INFO_OFFSET + 4;
    static constexpr uint32_t SIZE = UBOSkinningTexture::COUNT * 4;
    static constexpr uint32_t BINDING = static_cast<uint32_t>(ModelLocalBindings::UBO_SKINNING_TEXTURE);
    static const gfx::DescriptorSetLayoutBinding DESCRIPTOR;
    static const gfx::UniformBlock LAYOUT;
    static const ccstd::string NAME;
};

struct CC_DLL UBOSkinningAnimation {
    static constexpr uint32_t JOINTS_ANIM_INFO_OFFSET = 0;
    static constexpr uint32_t COUNT = UBOSkinningAnimation::JOINTS_ANIM_INFO_OFFSET + 4;
    static constexpr uint32_t SIZE = UBOSkinningAnimation::COUNT * 4;
    static constexpr uint32_t BINDING = static_cast<uint32_t>(ModelLocalBindings::UBO_SKINNING_ANIMATION);
    static const gfx::DescriptorSetLayoutBinding DESCRIPTOR;
    static const gfx::UniformBlock LAYOUT;
    static const ccstd::string NAME;
};

struct CC_DLL UBOSkinning {
    static uint32_t count;
    static uint32_t size;
    static constexpr uint32_t BINDING = static_cast<uint32_t>(ModelLocalBindings::UBO_SKINNING_TEXTURE);
    static const gfx::DescriptorSetLayoutBinding DESCRIPTOR;
    static gfx::UniformBlock layout;
    static const ccstd::string NAME;
    static void initLayout(uint capacity);
};

struct CC_DLL UBOMorph {
    static constexpr uint32_t MAX_MORPH_TARGET_COUNT = 60;
    static constexpr uint32_t OFFSET_OF_WEIGHTS = 0;
    static constexpr uint32_t OFFSET_OF_DISPLACEMENT_TEXTURE_WIDTH = 4 * MAX_MORPH_TARGET_COUNT;
    static constexpr uint32_t OFFSET_OF_DISPLACEMENT_TEXTURE_HEIGHT = OFFSET_OF_DISPLACEMENT_TEXTURE_WIDTH + 4;
    static constexpr uint32_t OFFSET_OF_VERTICES_COUNT = OFFSET_OF_DISPLACEMENT_TEXTURE_HEIGHT + 4;
    static const uint32_t COUNT_BASE_4_BYTES;
    static const uint32_t SIZE;
    static constexpr uint32_t BINDING = static_cast<uint32_t>(ModelLocalBindings::UBO_MORPH);
    static const gfx::DescriptorSetLayoutBinding DESCRIPTOR;
    static const gfx::UniformBlock LAYOUT;
    static const ccstd::string NAME;
};

struct CC_DLL UBOUILocal {
    static constexpr uint32_t BINDING = static_cast<uint32_t>(ModelLocalBindings::UBO_UI_LOCAL);
    static const gfx::DescriptorSetLayoutBinding DESCRIPTOR;
    static const gfx::UniformBlock LAYOUT;
    static const ccstd::string NAME;
};

struct CC_DLL UBOSH {
    static constexpr uint32_t SH_LINEAR_CONST_R_OFFSET = 0;
    static constexpr uint32_t SH_LINEAR_CONST_G_OFFSET = UBOSH::SH_LINEAR_CONST_R_OFFSET + 4;
    static constexpr uint32_t SH_LINEAR_CONST_B_OFFSET = UBOSH::SH_LINEAR_CONST_G_OFFSET + 4;
    static constexpr uint32_t SH_QUADRATIC_R_OFFSET = UBOSH::SH_LINEAR_CONST_B_OFFSET + 4;
    static constexpr uint32_t SH_QUADRATIC_G_OFFSET = UBOSH::SH_QUADRATIC_R_OFFSET + 4;
    static constexpr uint32_t SH_QUADRATIC_B_OFFSET = UBOSH::SH_QUADRATIC_G_OFFSET + 4;
    static constexpr uint32_t SH_QUADRATIC_A_OFFSET = UBOSH::SH_QUADRATIC_B_OFFSET + 4;
    static constexpr uint32_t COUNT = UBOSH::SH_QUADRATIC_A_OFFSET + 4;
    static constexpr uint32_t SIZE = UBOSH::COUNT * 4;
    static constexpr uint32_t BINDING = static_cast<uint32_t>(ModelLocalBindings::UBO_SH);
    static const gfx::DescriptorSetLayoutBinding DESCRIPTOR;
    static const gfx::UniformBlock LAYOUT;
    static const ccstd::string NAME;
};

enum class CC_DLL ForwardStagePriority {
    AR = 5,
    FORWARD = 10,
    UI = 20
};
CC_ENUM_CONVERSION_OPERATOR(ForwardStagePriority)

enum class CC_DLL ForwardFlowPriority {
    SHADOW = 0,
    FORWARD = 1,
    UI = 10,
};
CC_ENUM_CONVERSION_OPERATOR(ForwardFlowPriority)

enum class CC_DLL RenderFlowTag {
    SCENE,
    POSTPROCESS,
    UI,
};
CC_ENUM_CONVERSION_OPERATOR(RenderFlowTag)

enum class CC_DLL DeferredStagePriority {
    GBUFFER = 10,
    LIGHTING = 15,
    TRANSPARANT = 18,
    BLOOM = 19,
    POSTPROCESS = 20,
    UI = 30
};
CC_ENUM_CONVERSION_OPERATOR(DeferredStagePriority)

enum class CC_DLL DeferredFlowPriority {
    SHADOW = 0,
    MAIN = 1,
    UI = 10
};
CC_ENUM_CONVERSION_OPERATOR(DeferredFlowPriority)

struct CC_DLL UBOGlobal {
    static constexpr uint32_t TIME_OFFSET = 0;
    static constexpr uint32_t SCREEN_SIZE_OFFSET = UBOGlobal::TIME_OFFSET + 4;
    static constexpr uint32_t NATIVE_SIZE_OFFSET = UBOGlobal::SCREEN_SIZE_OFFSET + 4;
    static constexpr uint32_t PROBE_INFO_OFFSET = UBOGlobal::NATIVE_SIZE_OFFSET + 4;

    static constexpr uint32_t DEBUG_VIEW_MODE_OFFSET = UBOGlobal::PROBE_INFO_OFFSET + 4;

    static constexpr uint32_t COUNT = UBOGlobal::DEBUG_VIEW_MODE_OFFSET + 4;

    static constexpr uint32_t SIZE = UBOGlobal::COUNT * 4;
    static constexpr uint32_t BINDING = static_cast<uint32_t>(PipelineGlobalBindings::UBO_GLOBAL);
    static const gfx::DescriptorSetLayoutBinding DESCRIPTOR;
    static const gfx::UniformBlock LAYOUT;
    static const ccstd::string NAME;
};

struct CC_DLL UBOCamera {
    static constexpr uint32_t MAT_VIEW_OFFSET = 0;
    static constexpr uint32_t MAT_VIEW_INV_OFFSET = UBOCamera::MAT_VIEW_OFFSET + 16;
    static constexpr uint32_t MAT_PROJ_OFFSET = UBOCamera::MAT_VIEW_INV_OFFSET + 16;
    static constexpr uint32_t MAT_PROJ_INV_OFFSET = UBOCamera::MAT_PROJ_OFFSET + 16;
    static constexpr uint32_t MAT_VIEW_PROJ_OFFSET = UBOCamera::MAT_PROJ_INV_OFFSET + 16;
    static constexpr uint32_t MAT_VIEW_PROJ_INV_OFFSET = UBOCamera::MAT_VIEW_PROJ_OFFSET + 16;
    static constexpr uint32_t CAMERA_POS_OFFSET = UBOCamera::MAT_VIEW_PROJ_INV_OFFSET + 16;
    static constexpr uint32_t SURFACE_TRANSFORM_OFFSET = UBOCamera::CAMERA_POS_OFFSET + 4;
    static constexpr uint32_t SCREEN_SCALE_OFFSET = UBOCamera::SURFACE_TRANSFORM_OFFSET + 4;
    static constexpr uint32_t EXPOSURE_OFFSET = UBOCamera::SCREEN_SCALE_OFFSET + 4;
    static constexpr uint32_t MAIN_LIT_DIR_OFFSET = UBOCamera::EXPOSURE_OFFSET + 4;
    static constexpr uint32_t MAIN_LIT_COLOR_OFFSET = UBOCamera::MAIN_LIT_DIR_OFFSET + 4;
    static constexpr uint32_t AMBIENT_SKY_OFFSET = UBOCamera::MAIN_LIT_COLOR_OFFSET + 4;
    static constexpr uint32_t AMBIENT_GROUND_OFFSET = UBOCamera::AMBIENT_SKY_OFFSET + 4;
    static constexpr uint32_t GLOBAL_FOG_COLOR_OFFSET = UBOCamera::AMBIENT_GROUND_OFFSET + 4;
    static constexpr uint32_t GLOBAL_FOG_BASE_OFFSET = UBOCamera::GLOBAL_FOG_COLOR_OFFSET + 4;
    static constexpr uint32_t GLOBAL_FOG_ADD_OFFSET = UBOCamera::GLOBAL_FOG_BASE_OFFSET + 4;
    static constexpr uint32_t GLOBAL_NEAR_FAR_OFFSET = UBOCamera::GLOBAL_FOG_ADD_OFFSET + 4;
    static constexpr uint32_t GLOBAL_VIEW_PORT_OFFSET = UBOCamera::GLOBAL_NEAR_FAR_OFFSET + 4;
    static constexpr uint32_t COUNT = UBOCamera::GLOBAL_VIEW_PORT_OFFSET + 4;
    static constexpr uint32_t SIZE = UBOCamera::COUNT * 4;
    static constexpr uint32_t BINDING = static_cast<uint32_t>(PipelineGlobalBindings::UBO_CAMERA);
    static const gfx::DescriptorSetLayoutBinding DESCRIPTOR;
    static const gfx::UniformBlock LAYOUT;
    static const ccstd::string NAME;
};

struct CC_DLL UBOShadow {
    static constexpr uint32_t MAT_LIGHT_VIEW_OFFSET = 0;
    static constexpr uint32_t MAT_LIGHT_VIEW_PROJ_OFFSET = UBOShadow::MAT_LIGHT_VIEW_OFFSET + 16;
    static constexpr uint32_t SHADOW_INV_PROJ_DEPTH_INFO_OFFSET = UBOShadow::MAT_LIGHT_VIEW_PROJ_OFFSET + 16;
    static constexpr uint32_t SHADOW_PROJ_DEPTH_INFO_OFFSET = UBOShadow::SHADOW_INV_PROJ_DEPTH_INFO_OFFSET + 4;
    static constexpr uint32_t SHADOW_PROJ_INFO_OFFSET = UBOShadow::SHADOW_PROJ_DEPTH_INFO_OFFSET + 4;
    static constexpr uint32_t SHADOW_NEAR_FAR_LINEAR_SATURATION_INFO_OFFSET = UBOShadow::SHADOW_PROJ_INFO_OFFSET + 4;
    static constexpr uint32_t SHADOW_WIDTH_HEIGHT_PCF_BIAS_INFO_OFFSET = UBOShadow::SHADOW_NEAR_FAR_LINEAR_SATURATION_INFO_OFFSET + 4;
    static constexpr uint32_t SHADOW_LIGHT_PACKING_NBIAS_NULL_INFO_OFFSET = UBOShadow::SHADOW_WIDTH_HEIGHT_PCF_BIAS_INFO_OFFSET + 4;
    static constexpr uint32_t SHADOW_COLOR_OFFSET = UBOShadow::SHADOW_LIGHT_PACKING_NBIAS_NULL_INFO_OFFSET + 4;
    static constexpr uint32_t PLANAR_NORMAL_DISTANCE_INFO_OFFSET = UBOShadow::SHADOW_COLOR_OFFSET + 4;
    static constexpr uint32_t COUNT = UBOShadow::PLANAR_NORMAL_DISTANCE_INFO_OFFSET + 4;
    static constexpr uint32_t SIZE = UBOShadow::COUNT * 4;
    static constexpr uint32_t BINDING = static_cast<uint32_t>(PipelineGlobalBindings::UBO_SHADOW);
    static const gfx::DescriptorSetLayoutBinding DESCRIPTOR;
    static const gfx::UniformBlock LAYOUT;
    static const ccstd::string NAME;
};

struct CC_DLL UBOCSM {
    static constexpr uint32_t CSM_LEVEL_COUNT = 4;
    static constexpr uint32_t CSM_VIEW_DIR_0_OFFSET = 0;
    static constexpr uint32_t CSM_VIEW_DIR_1_OFFSET = UBOCSM::CSM_VIEW_DIR_0_OFFSET + 4 * UBOCSM::CSM_LEVEL_COUNT;
    static constexpr uint32_t CSM_VIEW_DIR_2_OFFSET = UBOCSM::CSM_VIEW_DIR_1_OFFSET + 4 * UBOCSM::CSM_LEVEL_COUNT;
    static constexpr uint32_t CSM_ATLAS_OFFSET = UBOCSM::CSM_VIEW_DIR_2_OFFSET + 4 * UBOCSM::CSM_LEVEL_COUNT;
    static constexpr uint32_t MAT_CSM_VIEW_PROJ_LEVELS_OFFSET = UBOCSM::CSM_ATLAS_OFFSET + 4 * UBOCSM::CSM_LEVEL_COUNT;
    static constexpr uint32_t CSM_PROJ_DEPTH_INFO_LEVELS_OFFSET = UBOCSM::MAT_CSM_VIEW_PROJ_LEVELS_OFFSET + 16 * UBOCSM::CSM_LEVEL_COUNT;
    static constexpr uint32_t CSM_PROJ_INFO_LEVELS_OFFSET = UBOCSM::CSM_PROJ_DEPTH_INFO_LEVELS_OFFSET + 4 * UBOCSM::CSM_LEVEL_COUNT;
    static constexpr uint32_t CSM_SPLITS_INFO_OFFSET = UBOCSM::CSM_PROJ_INFO_LEVELS_OFFSET + 4 * UBOCSM::CSM_LEVEL_COUNT;
    static constexpr uint32_t COUNT = UBOCSM::CSM_SPLITS_INFO_OFFSET + 4;
    static constexpr uint32_t SIZE = UBOCSM::COUNT * 4;
    static constexpr uint32_t BINDING = static_cast<uint32_t>(PipelineGlobalBindings::UBO_CSM);
    static const gfx::DescriptorSetLayoutBinding DESCRIPTOR;
    static const gfx::UniformBlock LAYOUT;
    static const ccstd::string NAME;
};

struct CC_DLL DescriptorSetLayoutInfos {
    gfx::DescriptorSetLayoutBindingList bindings;
    ccstd::unordered_map<ccstd::string, gfx::UniformBlock> blocks;
    ccstd::unordered_map<ccstd::string, gfx::UniformSamplerTexture> samplers;
    ccstd::unordered_map<ccstd::string, gfx::UniformStorageImage> storeImages;
    ccstd::unordered_map<ccstd::string, gfx::UniformStorageBuffer> storeBuffers;
    gfx::AccelerationStructureLayout tlas;
};
extern CC_DLL DescriptorSetLayoutInfos globalDescriptorSetLayout;
extern CC_DLL DescriptorSetLayoutInfos localDescriptorSetLayout;

enum class LayerList : uint32_t {
    NONE = 0,
    IGNORE_RAYCAST = (1 << 20),
    GIZMOS = (1 << 21),
    EDITOR = (1 << 22),
    UI_3D = (1 << 23),
    SCENE_GIZMO = (1 << 24),
    UI_2D = (1 << 25),

    PROFILER = (1 << 28),
    DEFAULT = (1 << 30),
    ALL = 0xffffffff,
};
CC_ENUM_CONVERSION_OPERATOR(LayerList)

const uint32_t CAMERA_DEFAULT_MASK = ~static_cast<uint32_t>(LayerList::UI_2D) & ~static_cast<uint32_t>(LayerList::PROFILER);
// constexpr CAMERA_DEFAULT_MASK = Layers.makeMaskExclude([Layers.BitMask.UI_2D, Layers.BitMask.GIZMOS, Layers.BitMask.EDITOR,
//                                                            Layers.BitMask.SCENE_GIZMO, Layers.BitMask.PROFILER]);

uint32_t nextPow2(uint32_t val);

bool supportsR16HalfFloatTexture(const gfx::Device *device);
bool supportsRGBA16HalfFloatTexture(const gfx::Device *device);

bool supportsR32FloatTexture(const gfx::Device *device);
bool supportsRGBA32FloatTexture(const gfx::Device *device);

extern CC_DLL uint32_t skyboxFlag;

struct CC_DLL SHADOWMAP {
    static constexpr uint32_t BINDING = static_cast<uint32_t>(PipelineGlobalBindings::SAMPLER_SHADOWMAP);
    static const gfx::DescriptorSetLayoutBinding DESCRIPTOR;
    static const gfx::UniformSamplerTexture LAYOUT;
    static const ccstd::string NAME;
};

struct CC_DLL ENVIRONMENT {
    static constexpr uint32_t BINDING = static_cast<uint32_t>(PipelineGlobalBindings::SAMPLER_ENVIRONMENT);
    static const gfx::DescriptorSetLayoutBinding DESCRIPTOR;
    static const gfx::UniformSamplerTexture LAYOUT;
    static const ccstd::string NAME;
};

struct CC_DLL SPOTSHADOWMAP {
    static constexpr uint32_t BINDING = static_cast<uint32_t>(PipelineGlobalBindings::SAMPLER_SPOT_SHADOW_MAP);
    static const gfx::DescriptorSetLayoutBinding DESCRIPTOR;
    static const gfx::UniformSamplerTexture LAYOUT;
    static const ccstd::string NAME;
};

struct CC_DLL DIFFUSEMAP {
    static constexpr uint32_t BINDING = static_cast<uint32_t>(PipelineGlobalBindings::SAMPLER_DIFFUSEMAP);
    static const gfx::DescriptorSetLayoutBinding DESCRIPTOR;
    static const gfx::UniformSamplerTexture LAYOUT;
    static const ccstd::string NAME;
};

struct CC_DLL TOPLEVELAS {
    static constexpr uint32_t BINDING = static_cast<uint32_t>(PipelineGlobalBindings::ACCEL_STRUC_TOPLEVEL);
    static const gfx::DescriptorSetLayoutBinding DESCRIPTOR;
    static const gfx::AccelerationStructureLayout LAYOUT;
    static const ccstd::string NAME;
};

struct CC_DLL SCENEGEOMETRYDESC {
    static constexpr uint32_t BINDING = static_cast<uint32_t>(PipelineGlobalBindings::STORAGE_SCENE_GEOM);
    static const gfx::DescriptorSetLayoutBinding DESCRIPTOR;
    static const gfx::UniformStorageBuffer LAYOUT;
    static const ccstd::string NAME;
};

struct CC_DLL SCENEINSTANCEDESC {
    static constexpr uint32_t BINDING = static_cast<uint32_t>(PipelineGlobalBindings::STORAGE_SCENE_INSTANCE);
    static const gfx::DescriptorSetLayoutBinding DESCRIPTOR;
    static const gfx::UniformStorageBuffer LAYOUT;
    static const ccstd::string NAME;
};

struct CC_DLL JOINTTEXTURE {
    static constexpr uint32_t BINDING = static_cast<uint32_t>(ModelLocalBindings::SAMPLER_JOINTS);
    static const gfx::DescriptorSetLayoutBinding DESCRIPTOR;
    static const gfx::UniformSamplerTexture LAYOUT;
    static const ccstd::string NAME;
};

struct CC_DLL REALTIMEJOINTTEXTURE {
    static constexpr uint BINDING = static_cast<uint>(ModelLocalBindings::SAMPLER_JOINTS);
    static const gfx::DescriptorSetLayoutBinding DESCRIPTOR;
    static const gfx::UniformSamplerTexture LAYOUT;
    static const ccstd::string NAME;
};

struct CC_DLL POSITIONMORPH {
    static constexpr uint32_t BINDING = static_cast<uint32_t>(ModelLocalBindings::SAMPLER_MORPH_POSITION);
    static const gfx::DescriptorSetLayoutBinding DESCRIPTOR;
    static const gfx::UniformSamplerTexture LAYOUT;
    static const ccstd::string NAME;
};

struct CC_DLL NORMALMORPH {
    static constexpr uint32_t BINDING = static_cast<uint32_t>(ModelLocalBindings::SAMPLER_MORPH_NORMAL);
    static const gfx::DescriptorSetLayoutBinding DESCRIPTOR;
    static const gfx::UniformSamplerTexture LAYOUT;
    static const ccstd::string NAME;
};

struct CC_DLL TANGENTMORPH {
    static constexpr uint32_t BINDING = static_cast<uint32_t>(ModelLocalBindings::SAMPLER_MORPH_TANGENT);
    static const gfx::DescriptorSetLayoutBinding DESCRIPTOR;
    static const gfx::UniformSamplerTexture LAYOUT;
    static const ccstd::string NAME;
};

struct CC_DLL LIGHTMAPTEXTURE {
    static constexpr uint32_t BINDING = static_cast<uint32_t>(ModelLocalBindings::SAMPLER_LIGHTMAP);
    static const gfx::DescriptorSetLayoutBinding DESCRIPTOR;
    static const gfx::UniformSamplerTexture LAYOUT;
    static const ccstd::string NAME;
};

struct CC_DLL SPRITETEXTURE {
    static constexpr uint32_t BINDING = static_cast<uint32_t>(ModelLocalBindings::SAMPLER_SPRITE);
    static const gfx::DescriptorSetLayoutBinding DESCRIPTOR;
    static const gfx::UniformSamplerTexture LAYOUT;
    static const ccstd::string NAME;
};

struct CC_DLL REFLECTIONTEXTURE {
    static constexpr uint32_t BINDING = static_cast<uint32_t>(ModelLocalBindings::SAMPLER_REFLECTION);
    static const gfx::DescriptorSetLayoutBinding DESCRIPTOR;
    static const gfx::UniformSamplerTexture LAYOUT;
    static const ccstd::string NAME;
};

struct CC_DLL REFLECTIONSTORAGE {
    static constexpr uint32_t BINDING = static_cast<uint32_t>(ModelLocalBindings::STORAGE_REFLECTION);
    static const gfx::DescriptorSetLayoutBinding DESCRIPTOR;
    static const gfx::UniformStorageImage LAYOUT;
    static const ccstd::string NAME;
};

struct CC_DLL REFLECTIONPROBECUBEMAP {
    static constexpr uint32_t BINDING = static_cast<uint32_t>(ModelLocalBindings::SAMPLER_REFLECTION_PROBE_CUBE);
    static const gfx::DescriptorSetLayoutBinding DESCRIPTOR;
    static const gfx::UniformSamplerTexture LAYOUT;
    static const ccstd::string NAME;
};

struct CC_DLL REFLECTIONPROBEPLANARMAP {
    static constexpr uint32_t BINDING = static_cast<uint32_t>(ModelLocalBindings::SAMPLER_REFLECTION_PROBE_PLANAR);
    static const gfx::DescriptorSetLayoutBinding DESCRIPTOR;
    static const gfx::UniformSamplerTexture LAYOUT;
    static const ccstd::string NAME;
};

struct CC_DLL REFLECTIONPROBEDATAMAP {
    static constexpr uint32_t BINDING = static_cast<uint32_t>(ModelLocalBindings::SAMPLER_REFLECTION_PROBE_DATA_MAP);
    static const gfx::DescriptorSetLayoutBinding DESCRIPTOR;
    static const gfx::UniformSamplerTexture LAYOUT;
    static const ccstd::string NAME;
};

struct CC_DLL REFLECTIONPROBEBLENDCUBEMAP {
    static constexpr uint32_t BINDING = static_cast<uint32_t>(ModelLocalBindings::SAMPLER_REFLECTION_PROBE_BLEND_CUBE);
    static const gfx::DescriptorSetLayoutBinding DESCRIPTOR;
    static const gfx::UniformSamplerTexture LAYOUT;
    static const ccstd::string NAME;
};

static constexpr uint32_t CLUSTER_LIGHT_BINDING = 4;
static constexpr uint32_t CLUSTER_LIGHT_INDEX_BINDING = 5;
static constexpr uint32_t CLUSTER_LIGHT_GRID_BINDING = 6;

void localDescriptorSetLayoutResizeMaxJoints(uint32_t maxCount);

} // namespace pipeline
} // namespace cc
