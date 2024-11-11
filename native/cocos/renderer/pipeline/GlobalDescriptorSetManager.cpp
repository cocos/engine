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

#include "GlobalDescriptorSetManager.h"

#include "Define.h"
#include "RenderInstancedQueue.h"
#include "gfx-base/GFXDevice.h"
#include "scene/Light.h"

namespace cc {
namespace pipeline {
void GlobalDSManager::activate(gfx::Device *device) {
    _device = device;

    _linearSampler = device->getSampler({
        gfx::Filter::LINEAR,
        gfx::Filter::LINEAR,
        gfx::Filter::NONE,
        gfx::Address::CLAMP,
        gfx::Address::CLAMP,
        gfx::Address::CLAMP,
    });

    _pointSampler = device->getSampler({
        gfx::Filter::POINT,
        gfx::Filter::POINT,
        gfx::Filter::NONE,
        gfx::Address::CLAMP,
        gfx::Address::CLAMP,
        gfx::Address::CLAMP,
    });

    //tips: for compatibility with old version, when maxVertexUniformVectors is 128, maxJoints = 30
    uint maxJoints = (_device->getCapabilities().maxVertexUniformVectors - 38) / 3;
    maxJoints = maxJoints < 256 ? maxJoints : 256;
    SkinningJointCapacity::jointUniformCapacity = maxJoints;
    UBOSkinning::initLayout(maxJoints);

    _defaultTexture = _device->createTexture({gfx::TextureType::TEX2D,
                                              gfx::TextureUsageBit::SAMPLED,
                                              gfx::Format::RGBA8,
                                              2,
                                              2});

    setDescriptorSetLayout();
    _descriptorSetLayout = device->createDescriptorSetLayout({globalDescriptorSetLayout.bindings});
    _globalDescriptorSet = device->createDescriptorSet({_descriptorSetLayout});
}

void GlobalDSManager::bindBuffer(uint32_t binding, gfx::Buffer *buffer) {
    if (_globalDescriptorSet != nullptr) {
        _globalDescriptorSet->bindBuffer(binding, buffer);
    }

    for (const auto &pair : _descriptorSetMap) {
        if (pair.second != nullptr) {
            pair.second->bindBuffer(binding, buffer);
        }
    }
}

void GlobalDSManager::bindSampler(uint32_t binding, gfx::Sampler *sampler) {
    if (_globalDescriptorSet != nullptr) {
        _globalDescriptorSet->bindSampler(binding, sampler);
    }

    for (const auto &pair : _descriptorSetMap) {
        if (pair.second != nullptr) {
            pair.second->bindSampler(binding, sampler);
        }
    }
}

void GlobalDSManager::bindTexture(uint32_t binding, gfx::Texture *texture) {
    if (!texture) {
        texture = _defaultTexture.get();
    }
    if (_globalDescriptorSet != nullptr) {
        _globalDescriptorSet->bindTexture(binding, texture);
    }

    for (const auto &pair : _descriptorSetMap) {
        if (pair.second != nullptr) {
            pair.second->bindTexture(binding, texture);
        }
    }
}

void GlobalDSManager::bindAccelerationStructure(uint32_t binding, gfx::AccelerationStructure* accel) {
    if (!accel) {
        // consider create a default acceleration structure
    }
    if (_globalDescriptorSet!=nullptr) {
        _globalDescriptorSet->bindAccelerationStructure(binding, accel);
    }

    for (const auto &pair : _descriptorSetMap) {
        if (pair.second != nullptr) {
            pair.second->bindAccelerationStructure(binding, accel);
        }
    }
}


void GlobalDSManager::update() {
    if (_globalDescriptorSet != nullptr) {
        _globalDescriptorSet->update();
    }

    for (const auto &pair : _descriptorSetMap) {
        if (pair.second != nullptr) {
            pair.second->update();
        }
    }
}

gfx::DescriptorSet *GlobalDSManager::getOrCreateDescriptorSet(const scene::Light *light) {
    CC_ASSERT(light);
    // The global descriptorSet is managed by the pipeline and binds the buffer
    if (_descriptorSetMap.count(light) == 0 || (_descriptorSetMap.at(light) == nullptr)) {
        auto *descriptorSet = _device->createDescriptorSet({_descriptorSetLayout});
        _descriptorSetMap[light] = descriptorSet;

        const auto begin = static_cast<uint32_t>(PipelineGlobalBindings::UBO_GLOBAL);
        const auto end = static_cast<uint32_t>(PipelineGlobalBindings::COUNT);
        for (uint32_t i = begin; i < end; ++i) {
            auto *const buffer = _globalDescriptorSet->getBuffer(i);
            if (buffer != nullptr) {
                descriptorSet->bindBuffer(i, buffer);
            }
            auto *const sampler = _globalDescriptorSet->getSampler(i);
            if (sampler != nullptr) {
                descriptorSet->bindSampler(i, sampler);
            }
            auto *const texture = _globalDescriptorSet->getTexture(i);
            if (texture != nullptr) {
                descriptorSet->bindTexture(i, texture);
            }
            auto *const accel = _globalDescriptorSet->getAccelerationStructure(i);
            if (accel != nullptr) {
                descriptorSet->bindAccelerationStructure(i, accel);
            }
        }

        auto *shadowUBO = _device->createBuffer({
            gfx::BufferUsageBit::UNIFORM | gfx::BufferUsageBit::TRANSFER_DST,
            gfx::MemoryUsageBit::HOST | gfx::MemoryUsageBit::DEVICE,
            UBOShadow::SIZE,
            UBOShadow::SIZE,
            gfx::BufferFlagBit::NONE,
        });
        _shadowUBOs.emplace_back(shadowUBO);
        descriptorSet->bindBuffer(UBOShadow::BINDING, shadowUBO);

        descriptorSet->update();
    }

    return _descriptorSetMap.at(light);
}

void GlobalDSManager::destroy() {
    _shadowUBOs.clear();
    _descriptorSetMap.clear();
    _descriptorSetLayout = nullptr;
    _globalDescriptorSet = nullptr;
    _linearSampler = nullptr;
    _pointSampler = nullptr;

    _defaultTexture = nullptr;
}

void GlobalDSManager::setDescriptorSetLayout() {
    globalDescriptorSetLayout.bindings.resize(static_cast<size_t>(PipelineGlobalBindings::COUNT));

    globalDescriptorSetLayout.blocks[UBOGlobal::NAME] = UBOGlobal::LAYOUT;
    globalDescriptorSetLayout.bindings[UBOGlobal::BINDING] = UBOGlobal::DESCRIPTOR;
    globalDescriptorSetLayout.blocks[UBOCamera::NAME] = UBOCamera::LAYOUT;
    globalDescriptorSetLayout.bindings[UBOCamera::BINDING] = UBOCamera::DESCRIPTOR;
    globalDescriptorSetLayout.blocks[UBOShadow::NAME] = UBOShadow::LAYOUT;
    globalDescriptorSetLayout.bindings[UBOShadow::BINDING] = UBOShadow::DESCRIPTOR;
    globalDescriptorSetLayout.blocks[UBOCSM::NAME] = UBOCSM::LAYOUT;
    globalDescriptorSetLayout.bindings[UBOCSM::BINDING] = UBOCSM::DESCRIPTOR;
    globalDescriptorSetLayout.samplers[SHADOWMAP::NAME] = SHADOWMAP::LAYOUT;
    globalDescriptorSetLayout.bindings[SHADOWMAP::BINDING] = SHADOWMAP::DESCRIPTOR;
    globalDescriptorSetLayout.samplers[ENVIRONMENT::NAME] = ENVIRONMENT::LAYOUT;
    globalDescriptorSetLayout.bindings[ENVIRONMENT::BINDING] = ENVIRONMENT::DESCRIPTOR;
    globalDescriptorSetLayout.samplers[SPOTSHADOWMAP::NAME] = SPOTSHADOWMAP::LAYOUT;
    globalDescriptorSetLayout.bindings[SPOTSHADOWMAP::BINDING] = SPOTSHADOWMAP::DESCRIPTOR;
    globalDescriptorSetLayout.samplers[DIFFUSEMAP::NAME] = DIFFUSEMAP::LAYOUT;
    globalDescriptorSetLayout.bindings[DIFFUSEMAP::BINDING] = DIFFUSEMAP::DESCRIPTOR;

    globalDescriptorSetLayout.tlas = TOPLEVELAS::LAYOUT;
    globalDescriptorSetLayout.bindings[TOPLEVELAS::BINDING] = TOPLEVELAS::DESCRIPTOR;

    globalDescriptorSetLayout.storeBuffers[SCENEGEOMETRYDESC::NAME] = SCENEGEOMETRYDESC::LAYOUT;
    globalDescriptorSetLayout.bindings[SCENEGEOMETRYDESC::BINDING] = SCENEGEOMETRYDESC::DESCRIPTOR;
    globalDescriptorSetLayout.storeBuffers[SCENEINSTANCEDESC::NAME] = SCENEINSTANCEDESC::LAYOUT;
    globalDescriptorSetLayout.bindings[SCENEINSTANCEDESC::BINDING] = SCENEINSTANCEDESC::DESCRIPTOR;

    localDescriptorSetLayout.bindings.resize(static_cast<size_t>(ModelLocalBindings::COUNT));
    localDescriptorSetLayout.blocks[UBOLocalBatched::NAME] = UBOLocalBatched::LAYOUT;
    localDescriptorSetLayout.bindings[UBOLocalBatched::BINDING] = UBOLocalBatched::DESCRIPTOR;
    localDescriptorSetLayout.blocks[UBOLocal::NAME] = UBOLocal::LAYOUT;
    localDescriptorSetLayout.bindings[UBOLocal::BINDING] = UBOLocal::DESCRIPTOR;
    localDescriptorSetLayout.blocks[UBOWorldBound::NAME] = UBOWorldBound::LAYOUT;
    localDescriptorSetLayout.bindings[UBOWorldBound::BINDING] = UBOWorldBound::DESCRIPTOR;
    localDescriptorSetLayout.blocks[UBOForwardLight::NAME] = UBOForwardLight::LAYOUT;
    localDescriptorSetLayout.bindings[UBOForwardLight::BINDING] = UBOForwardLight::DESCRIPTOR;
    localDescriptorSetLayout.blocks[UBOSkinningTexture::NAME] = UBOSkinningTexture::LAYOUT;
    localDescriptorSetLayout.bindings[UBOSkinningTexture::BINDING] = UBOSkinningTexture::DESCRIPTOR;
    localDescriptorSetLayout.blocks[UBOSkinningAnimation::NAME] = UBOSkinningAnimation::LAYOUT;
    localDescriptorSetLayout.bindings[UBOSkinningAnimation::BINDING] = UBOSkinningAnimation::DESCRIPTOR;
    localDescriptorSetLayout.blocks[UBOSkinning::NAME] = UBOSkinning::layout;
    localDescriptorSetLayout.bindings[UBOSkinning::BINDING] = UBOSkinning::DESCRIPTOR;
    localDescriptorSetLayout.blocks[UBOMorph::NAME] = UBOMorph::LAYOUT;
    localDescriptorSetLayout.bindings[UBOMorph::BINDING] = UBOMorph::DESCRIPTOR;
    localDescriptorSetLayout.blocks[UBOUILocal::NAME] = UBOUILocal::LAYOUT;
    localDescriptorSetLayout.bindings[UBOUILocal::BINDING] = UBOUILocal::DESCRIPTOR;
    localDescriptorSetLayout.blocks[UBOSH::NAME] = UBOSH::LAYOUT;
    localDescriptorSetLayout.bindings[UBOSH::BINDING] = UBOSH::DESCRIPTOR;
    localDescriptorSetLayout.samplers[JOINTTEXTURE::NAME] = JOINTTEXTURE::LAYOUT;
    localDescriptorSetLayout.bindings[JOINTTEXTURE::BINDING] = JOINTTEXTURE::DESCRIPTOR;
    localDescriptorSetLayout.samplers[REALTIMEJOINTTEXTURE::NAME] = REALTIMEJOINTTEXTURE::LAYOUT;
    localDescriptorSetLayout.bindings[REALTIMEJOINTTEXTURE::BINDING] = REALTIMEJOINTTEXTURE::DESCRIPTOR;
    localDescriptorSetLayout.samplers[POSITIONMORPH::NAME] = POSITIONMORPH::LAYOUT;
    localDescriptorSetLayout.bindings[POSITIONMORPH::BINDING] = POSITIONMORPH::DESCRIPTOR;
    localDescriptorSetLayout.samplers[NORMALMORPH::NAME] = NORMALMORPH::LAYOUT;
    localDescriptorSetLayout.bindings[NORMALMORPH::BINDING] = NORMALMORPH::DESCRIPTOR;
    localDescriptorSetLayout.samplers[TANGENTMORPH::NAME] = TANGENTMORPH::LAYOUT;
    localDescriptorSetLayout.bindings[TANGENTMORPH::BINDING] = TANGENTMORPH::DESCRIPTOR;
    localDescriptorSetLayout.samplers[LIGHTMAPTEXTURE::NAME] = LIGHTMAPTEXTURE::LAYOUT;
    localDescriptorSetLayout.bindings[LIGHTMAPTEXTURE::BINDING] = LIGHTMAPTEXTURE::DESCRIPTOR;
    localDescriptorSetLayout.samplers[SPRITETEXTURE::NAME] = SPRITETEXTURE::LAYOUT;
    localDescriptorSetLayout.bindings[SPRITETEXTURE::BINDING] = SPRITETEXTURE::DESCRIPTOR;
    localDescriptorSetLayout.samplers[REFLECTIONTEXTURE::NAME] = REFLECTIONTEXTURE::LAYOUT;
    localDescriptorSetLayout.bindings[REFLECTIONTEXTURE::BINDING] = REFLECTIONTEXTURE::DESCRIPTOR;
    localDescriptorSetLayout.storeImages[REFLECTIONSTORAGE::NAME] = REFLECTIONSTORAGE::LAYOUT;
    localDescriptorSetLayout.bindings[REFLECTIONSTORAGE::BINDING] = REFLECTIONSTORAGE::DESCRIPTOR;

    localDescriptorSetLayout.samplers[REFLECTIONPROBECUBEMAP::NAME] = REFLECTIONPROBECUBEMAP::LAYOUT;
    localDescriptorSetLayout.bindings[REFLECTIONPROBECUBEMAP::BINDING] = REFLECTIONPROBECUBEMAP::DESCRIPTOR;
    localDescriptorSetLayout.samplers[REFLECTIONPROBEPLANARMAP::NAME] = REFLECTIONPROBEPLANARMAP::LAYOUT;
    localDescriptorSetLayout.bindings[REFLECTIONPROBEPLANARMAP::BINDING] = REFLECTIONPROBEPLANARMAP::DESCRIPTOR;
    localDescriptorSetLayout.samplers[REFLECTIONPROBEDATAMAP::NAME] = REFLECTIONPROBEDATAMAP::LAYOUT;
    localDescriptorSetLayout.bindings[REFLECTIONPROBEDATAMAP::BINDING] = REFLECTIONPROBEDATAMAP::DESCRIPTOR;
    localDescriptorSetLayout.samplers[REFLECTIONPROBEBLENDCUBEMAP::NAME] = REFLECTIONPROBEBLENDCUBEMAP::LAYOUT;
    localDescriptorSetLayout.bindings[REFLECTIONPROBEBLENDCUBEMAP::BINDING] = REFLECTIONPROBEBLENDCUBEMAP::DESCRIPTOR;
}

} // namespace pipeline
} // namespace cc
