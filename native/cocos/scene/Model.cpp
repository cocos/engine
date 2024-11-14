/****************************************************************************
 Copyright (c) 2021-2023 Xiamen Yaji Software Co., Ltd.

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
#include "base/std/container/array.h"

// #include "core/Director.h"
#include "core/Root.h"
#include "core/TypedArray.h"
#include "core/assets/Material.h"
#include "core/scene-graph/Scene.h"
#include "core/scene-graph/SceneGlobals.h"
#include "gfx-base/GFXTexture.h"
#include "gi/light-probe/LightProbe.h"
#include "gi/light-probe/SH.h"
#include "profiler/Profiler.h"
#include "renderer/pipeline/Define.h"
#include "renderer/pipeline/InstancedBuffer.h"
#include "renderer/pipeline/custom/RenderInterfaceTypes.h"
#include "scene/Model.h"
#include "scene/Pass.h"
#include "scene/ReflectionProbe.h"
#include "scene/ReflectionProbeManager.h"
#include "scene/RenderScene.h"
#include "scene/SubModel.h"

namespace {
const cc::gfx::SamplerInfo LIGHTMAP_SAMPLER_HASH{
    cc::gfx::Filter::LINEAR,
    cc::gfx::Filter::LINEAR,
    cc::gfx::Filter::NONE,
    cc::gfx::Address::CLAMP,
    cc::gfx::Address::CLAMP,
    cc::gfx::Address::CLAMP,
};

const cc::gfx::SamplerInfo LIGHTMAP_SAMPLER_WITH_MIP_HASH{
    cc::gfx::Filter::LINEAR,
    cc::gfx::Filter::LINEAR,
    cc::gfx::Filter::LINEAR,
    cc::gfx::Address::CLAMP,
    cc::gfx::Address::CLAMP,
    cc::gfx::Address::CLAMP,
};

const ccstd::vector<cc::scene::IMacroPatch> SHADOW_MAP_PATCHES{{"CC_RECEIVE_SHADOW", true}};
const ccstd::vector<cc::scene::IMacroPatch> LIGHT_PROBE_PATCHES{{"CC_USE_LIGHT_PROBE", true}};
const ccstd::string CC_USE_REFLECTION_PROBE = "CC_USE_REFLECTION_PROBE";
const ccstd::string CC_DISABLE_DIRECTIONAL_LIGHT = "CC_DISABLE_DIRECTIONAL_LIGHT";
const ccstd::vector<cc::scene::IMacroPatch> STATIC_LIGHTMAP_PATHES{{"CC_USE_LIGHTMAP", 1}};
const ccstd::vector<cc::scene::IMacroPatch> STATIONARY_LIGHTMAP_PATHES{{"CC_USE_LIGHTMAP", 2}};
const ccstd::vector<cc::scene::IMacroPatch> HIGHP_LIGHTMAP_PATHES{{"CC_LIGHT_MAP_VERSION", 2}};
} // namespace

namespace cc {
namespace scene {

Model::Model() {
    _device = Root::getInstance()->getDevice();
}

Model::~Model() = default;

void Model::initialize() {
    if (_inited) return;
    _receiveShadow = true;
    _castShadow = false;
    _enabled = true;
    _visFlags = Layers::Enum::NONE;
    _inited = true;
    _bakeToReflectionProbe = true;
    _reflectionProbeType = scene::UseReflectionProbeType::NONE;
}

void Model::destroy() {
    for (SubModel *subModel : _subModels) {
        CC_SAFE_DESTROY(subModel);
    }
    _subModels.clear();

    CC_SAFE_DESTROY_NULL(_localBuffer);
    CC_SAFE_DESTROY_NULL(_localSHBuffer);
    CC_SAFE_DESTROY_NULL(_worldBoundBuffer);

    _worldBounds = nullptr;
    _modelBounds = nullptr;
    _inited = false;
    _localDataUpdated = true;
    _transform = nullptr;
    _node = nullptr;
    _isDynamicBatching = false;
}

void Model::updateTransform(uint32_t stamp) {
    CC_PROFILE(ModelUpdateTransform);
    if (isModelImplementedInJS()) {
        if (!_isCalledFromJS) {
            emit<UpdateTransform>(stamp);
            _isCalledFromJS = false;
            return;
        }
    }

    Node *node = _transform;
    if (node->getChangedFlags() || node->isTransformDirty()) {
        node->updateWorldTransform();
        _localDataUpdated = true;
        if (_modelBounds != nullptr && _modelBounds->isValid() && _worldBounds != nullptr) {
            _modelBounds->transform(node->getWorldMatrix(), _worldBounds);
            _worldBoundsDirty = true;
        }
    }
}

void Model::updateWorldBound() {
    Node *node = _transform;
    if (node) {
        node->updateWorldTransform();
        _localDataUpdated = true;
        if (_modelBounds != nullptr && _modelBounds->isValid() && _worldBounds != nullptr) {
            _modelBounds->transform(node->getWorldMatrix(), _worldBounds);
            _worldBoundsDirty = true;
        }
    }
}

void Model::updateWorldBoundsForJSSkinningModel(const Vec3 &min, const Vec3 &max) {
    Node *node = _transform;
    if (node) {
        if (_modelBounds != nullptr && _modelBounds->isValid() && _worldBounds != nullptr) {
            geometry::AABB::fromPoints(min, max, _modelBounds);
            _modelBounds->transform(node->getWorldMatrix(), _worldBounds);
            _worldBoundsDirty = true;
        }
    }
}

void Model::updateWorldBoundsForJSBakedSkinningModel(geometry::AABB *aabb) {
    _worldBounds->center = aabb->center;
    _worldBounds->halfExtents = aabb->halfExtents;
    _worldBoundsDirty = true;
}

void Model::updateUBOs(uint32_t stamp) {
    CC_PROFILE(ModelUpdateUBOs);
    if (isModelImplementedInJS()) {
        if (!_isCalledFromJS) {
            emit<UpdateUBO>(stamp);
            _isCalledFromJS = false;
            return;
        }
    }

    for (SubModel *subModel : _subModels) {
        subModel->update();
    }
    _updateStamp = stamp;

    updateSHUBOs();

    const auto *pipeline = Root::getInstance()->getPipeline();
    const auto *shadowInfo = pipeline->getPipelineSceneData()->getShadows();
    const auto forceUpdateUBO = shadowInfo->isEnabled() && shadowInfo->getType() == ShadowType::PLANAR;

    if (!_localDataUpdated) {
        return;
    }
    _localDataUpdated = false;
    getTransform()->updateWorldTransform();
    const auto &worldMatrix = getTransform()->getWorldMatrix();
    bool hasNonInstancingPass = false;
    for (const auto &subModel : _subModels) {
        const auto idx = subModel->getInstancedWorldMatrixIndex();
        if (idx >= 0) {
            ccstd::vector<TypedArray> &attrs = subModel->getInstancedAttributeBlock().views;
            subModel->updateInstancedWorldMatrix(worldMatrix, idx);
        } else {
            hasNonInstancingPass = true;
        }
    }

    if ((hasNonInstancingPass || forceUpdateUBO) && _localBuffer) {
        Mat4 mat4;
        Mat4::inverseTranspose(worldMatrix, &mat4);

        _localBuffer->write(worldMatrix, sizeof(float) * pipeline::UBOLocal::MAT_WORLD_OFFSET);
        _localBuffer->write(mat4, sizeof(float) * pipeline::UBOLocal::MAT_WORLD_IT_OFFSET);
        _localBuffer->write(_lightmapUVParam, sizeof(float) * pipeline::UBOLocal::LIGHTINGMAP_UVPARAM);
        _localBuffer->write(_shadowBias, sizeof(float) * (pipeline::UBOLocal::LOCAL_SHADOW_BIAS));

        auto *probe = scene::ReflectionProbeManager::getInstance()->getReflectionProbeById(_reflectionProbeId);
        auto *blendProbe = scene::ReflectionProbeManager::getInstance()->getReflectionProbeById(_reflectionProbeBlendId);
        if (probe) {
            if (probe->getProbeType() == scene::ReflectionProbe::ProbeType::PLANAR) {
                const Vec4 plane = {probe->getNode()->getUp().x, probe->getNode()->getUp().y, probe->getNode()->getUp().z, 1.F};
                _localBuffer->write(plane, sizeof(float) * (pipeline::UBOLocal::REFLECTION_PROBE_DATA1));
                const Vec4 depthScale = {1.F, 0.F, 0.F, 1.F};
                _localBuffer->write(depthScale, sizeof(float) * (pipeline::UBOLocal::REFLECTION_PROBE_DATA2));
            } else {
                uint16_t mipAndUseRGBE = probe->isRGBE() ? 1000 : 0;
                const Vec4 pos = {probe->getNode()->getWorldPosition().x, probe->getNode()->getWorldPosition().y, probe->getNode()->getWorldPosition().z, 0.F};
                _localBuffer->write(pos, sizeof(float) * (pipeline::UBOLocal::REFLECTION_PROBE_DATA1));
                const Vec4 boxSize = {probe->getBoudingSize().x, probe->getBoudingSize().y, probe->getBoudingSize().z, static_cast<float>(probe->getCubeMap() ? probe->getCubeMap()->mipmapLevel() + mipAndUseRGBE : 1 + mipAndUseRGBE)};
                _localBuffer->write(boxSize, sizeof(float) * (pipeline::UBOLocal::REFLECTION_PROBE_DATA2));
            }
            if (_reflectionProbeType == scene::UseReflectionProbeType::BLEND_PROBES ||
                _reflectionProbeType == scene::UseReflectionProbeType::BLEND_PROBES_AND_SKYBOX) {
                if (blendProbe) {
                    uint16_t mipAndUseRGBE = blendProbe->isRGBE() ? 1000 : 0;
                    const Vec3 worldPos = blendProbe->getNode()->getWorldPosition();
                    Vec3 boudingBox = blendProbe->getBoudingSize();
                    const Vec4 pos = {worldPos.x, worldPos.y, worldPos.z, _reflectionProbeBlendWeight};
                    _localBuffer->write(pos, sizeof(float) * (pipeline::UBOLocal::REFLECTION_PROBE_BLEND_DATA1));
                    const Vec4 boxSize = {boudingBox.x, boudingBox.y, boudingBox.z, static_cast<float>(blendProbe->getCubeMap() ? blendProbe->getCubeMap()->mipmapLevel() + mipAndUseRGBE : 1 + mipAndUseRGBE)};
                    _localBuffer->write(boxSize, sizeof(float) * (pipeline::UBOLocal::REFLECTION_PROBE_BLEND_DATA2));
                } else if (_reflectionProbeType == scene::UseReflectionProbeType::BLEND_PROBES_AND_SKYBOX) {
                    // blend with skybox
                    const Vec4 pos = {0.F, 0.F, 0.F, _reflectionProbeBlendWeight};
                    _localBuffer->write(pos, sizeof(float) * (pipeline::UBOLocal::REFLECTION_PROBE_BLEND_DATA1));
                }
            }
        }

        _localBuffer->update();
        const bool enableOcclusionQuery = Root::getInstance()->getPipeline()->isOcclusionQueryEnabled();
        if (enableOcclusionQuery) {
            updateWorldBoundUBOs();
        }
    }
}

void Model::updateOctree() {
    if (_scene && _worldBoundsDirty) {
        _worldBoundsDirty = false;
        _scene->updateOctree(this);
    }
}

void Model::updateWorldBoundUBOs() {
    if (_worldBoundBuffer) {
        const Vec3 &center = _worldBounds ? _worldBounds->getCenter() : Vec3{0.0F, 0.0F, 0.0F};
        const Vec3 &halfExtents = _worldBounds ? _worldBounds->getHalfExtents() : Vec3{1.0F, 1.0F, 1.0F};
        const Vec4 worldBoundCenter{center.x, center.y, center.z, 0.0F};
        const Vec4 worldBoundHalfExtents{halfExtents.x, halfExtents.y, halfExtents.z, 1.0F};
        _worldBoundBuffer->write(worldBoundCenter, sizeof(float) * pipeline::UBOWorldBound::WORLD_BOUND_CENTER);
        _worldBoundBuffer->write(worldBoundHalfExtents, sizeof(float) * pipeline::UBOWorldBound::WORLD_BOUND_HALF_EXTENTS);
        _worldBoundBuffer->update();
    }
}

void Model::createBoundingShape(const ccstd::optional<Vec3> &minPos, const ccstd::optional<Vec3> &maxPos) {
    if (!minPos.has_value() || !maxPos.has_value()) {
        return;
    }

    if (!_modelBounds) {
        _modelBounds = ccnew geometry::AABB();
    }
    geometry::AABB::fromPoints(minPos.value(), maxPos.value(), _modelBounds);

    if (!_worldBounds) {
        _worldBounds = ccnew geometry::AABB();
    }
    geometry::AABB::fromPoints(minPos.value(), maxPos.value(), _worldBounds);
    _worldBoundsDirty = true;
}

SubModel *Model::createSubModel() {
    return ccnew SubModel();
}

void Model::initSubModel(index_t idx, cc::RenderingSubMesh *subMeshData, Material *mat) {
    initialize();
    if (idx >= static_cast<index_t>(_subModels.size())) {
        _subModels.resize(1 + idx, nullptr);
    }

    if (_subModels[idx] == nullptr) {
        _subModels[idx] = createSubModel();
    } else {
        CC_SAFE_DESTROY(_subModels[idx]);
    }
    _subModels[idx]->initialize(subMeshData, mat->getPasses(), getMacroPatches(idx));
    _subModels[idx]->setOwner(this);
    updateAttributesAndBinding(idx);
}

void Model::setSubModelMesh(index_t idx, cc::RenderingSubMesh *subMesh) const {
    if (idx < _subModels.size()) {
        _subModels[idx]->setSubMesh(subMesh);
    }
}

void Model::setSubModelMaterial(index_t idx, Material *mat) {
    if (idx < _subModels.size()) {
        _subModels[idx]->setPasses(mat->getPasses());
        updateAttributesAndBinding(idx);
    }
}

void Model::onGlobalPipelineStateChanged() const {
    for (SubModel *subModel : _subModels) {
        subModel->onPipelineStateChanged();
    }
}

void Model::onMacroPatchesStateChanged() {
    for (index_t i = 0; i < _subModels.size(); ++i) {
        _subModels[i]->onMacroPatchesStateChanged(getMacroPatches(i));
    }
}

void Model::onGeometryChanged() {
    for (SubModel *subModel : _subModels) {
        subModel->onGeometryChanged();
    }
}

void Model::initLightingmap(Texture2D *texture, const Vec4 &uvParam) {
    _lightmap = texture;
    _lightmapUVParam = uvParam;
}

void Model::updateLightingmap(Texture2D *texture, const Vec4 &uvParam) {
    _localDataUpdated = true;
    _lightmap = texture;
    _lightmapUVParam = uvParam;

    if (texture == nullptr) {
        texture = BuiltinResMgr::getInstance()->get<Texture2D>(ccstd::string("empty-texture"));
    }
    gfx::Texture *gfxTexture = texture->getGFXTexture();
    if (gfxTexture) {
        auto *sampler = _device->getSampler(texture->getMipmaps().size() > 1 ? LIGHTMAP_SAMPLER_WITH_MIP_HASH : LIGHTMAP_SAMPLER_HASH);
        for (SubModel *subModel : _subModels) {
            gfx::DescriptorSet *descriptorSet = subModel->getDescriptorSet();
            // // TODO(Yun Hsiao Wu): should manage lightmap macro switches automatically
            // // USE_LIGHTMAP -> CC_USE_LIGHTMAP
            descriptorSet->bindTexture(pipeline::LIGHTMAPTEXTURE::BINDING, gfxTexture);
            descriptorSet->bindSampler(pipeline::LIGHTMAPTEXTURE::BINDING, sampler);
            descriptorSet->update();
        }
    }
}

bool Model::isLightProbeAvailable() const {
    if (!_useLightProbe) {
        return false;
    }

    const auto *pipeline = Root::getInstance()->getPipeline();
    const auto *lightProbes = pipeline->getPipelineSceneData()->getLightProbes();
    if (!lightProbes || lightProbes->empty()) {
        return false;
    }

    if (!_worldBounds) {
        return false;
    }

    return true;
}

void Model::updateSHBuffer() {
    if (_localSHData.empty()) {
        return;
    }

    bool hasNonInstancingPass = false;
    for (const auto &subModel : _subModels) {
        const auto idx = subModel->getInstancedSHIndex();
        if (idx >= 0) {
            subModel->updateInstancedSH(_localSHData, idx);
        } else {
            hasNonInstancingPass = true;
        }
    }

    if (hasNonInstancingPass && _localSHBuffer) {
        _localSHBuffer->update(_localSHData.buffer()->getData());
    }
}

void Model::clearSHUBOs() {
    if (_localSHData.empty()) {
        return;
    }

    for (auto i = 0; i < pipeline::UBOSH::COUNT; i++) {
        _localSHData[i] = 0.0;
    }

    updateSHBuffer();
}

void Model::updateSHUBOs() {
    if (!isLightProbeAvailable()) {
        return;
    }

    const auto center = _worldBounds->getCenter();
#if !CC_EDITOR
    if (center.approxEquals(_lastWorldBoundCenter, math::EPSILON)) {
        return;
    }
#endif

    ccstd::vector<Vec3> coefficients;
    Vec4 weights(0.0F, 0.0F, 0.0F, 0.0F);
    const auto *pipeline = Root::getInstance()->getPipeline();
    const auto *lightProbes = pipeline->getPipelineSceneData()->getLightProbes();

    _lastWorldBoundCenter.set(center);
    _tetrahedronIndex = lightProbes->getData()->getInterpolationWeights(center, _tetrahedronIndex, weights);
    bool result = lightProbes->getData()->getInterpolationSHCoefficients(_tetrahedronIndex, weights, coefficients);
    if (!result) {
        return;
    }

    if (_localSHData.empty()) {
        return;
    }

    gi::SH::reduceRinging(coefficients, lightProbes->getReduceRinging());
    gi::SH::updateUBOData(_localSHData, pipeline::UBOSH::SH_LINEAR_CONST_R_OFFSET, coefficients);
    updateSHBuffer();
}

ccstd::vector<IMacroPatch> Model::getMacroPatches(index_t subModelIndex) {
    if (isModelImplementedInJS()) {
        if (!_isCalledFromJS) {
            ccstd::vector<IMacroPatch> macroPatches;
            emit<GetMacroPatches>(subModelIndex, &macroPatches);
            _isCalledFromJS = false;
            return macroPatches;
        }
    }

    ccstd::vector<IMacroPatch> patches;
    if (_receiveShadow) {
        for (const auto &patch : SHADOW_MAP_PATCHES) {
            patches.push_back(patch);
        }
    }

    if (_useLightProbe) {
        for (const auto &patch : LIGHT_PROBE_PATCHES) {
            patches.push_back(patch);
        }
    }

    patches.push_back({CC_USE_REFLECTION_PROBE, static_cast<int32_t>(_reflectionProbeType)});

    if (_lightmap != nullptr) {
        bool stationary = false;
        if (getNode() != nullptr && getNode()->getScene() != nullptr) {
            stationary = getNode()->getScene()->getSceneGlobals()->getBakedWithStationaryMainLight();
        }

        if (stationary) {
            for (const auto &patch : STATIONARY_LIGHTMAP_PATHES) {
                patches.push_back(patch);
            }
        } else {
            for (const auto &patch : STATIC_LIGHTMAP_PATHES) {
                patches.push_back(patch);
            }
        }

        // use highp lightmap
        if (getNode() != nullptr && getNode()->getScene() != nullptr) {
            if (getNode()->getScene()->getSceneGlobals()->getBakedWithHighpLightmap()) {
                for (const auto &patch : HIGHP_LIGHTMAP_PATHES) {
                    patches.push_back(patch);
                }
            }
        }
    }
    patches.push_back({CC_DISABLE_DIRECTIONAL_LIGHT, !_receiveDirLight});

    return patches;
}

void Model::updateAttributesAndBinding(index_t subModelIndex) {
    if (subModelIndex >= _subModels.size()) return;
    SubModel *subModel = _subModels[subModelIndex];
    initLocalDescriptors(subModelIndex);
    updateLocalDescriptors(subModelIndex, subModel->getDescriptorSet());

    initLocalSHDescriptors(subModelIndex);
    updateLocalSHDescriptors(subModelIndex, subModel->getDescriptorSet());

    initWorldBoundDescriptors(subModelIndex);
    if (subModel->getWorldBoundDescriptorSet()) {
        updateWorldBoundDescriptors(subModelIndex, subModel->getWorldBoundDescriptorSet());
    }

    ccstd::vector<gfx::Attribute> attributes;
    ccstd::unordered_map<ccstd::string, gfx::Attribute> attributeMap;
    for (const auto &pass : *(subModel->getPasses())) {
        gfx::Shader *shader = pass->getShaderVariant(subModel->getPatches());
        for (const auto &attr : shader->getAttributes()) {
            if (attributeMap.find(attr.name) == attributeMap.end()) {
                attributes.push_back(attr);
                attributeMap.insert({attr.name, attr});
            }
        }
    }
    updateInstancedAttributes(attributes, subModel);
}

void Model::updateInstancedAttributes(const ccstd::vector<gfx::Attribute> &attributes, SubModel *subModel) {
    if (isModelImplementedInJS()) {
        if (!_isCalledFromJS) {
            emit<UpdateInstancedAttributes>(attributes, subModel); // FIXME
            _isCalledFromJS = false;
            return;
        }
    }
    subModel->updateInstancedAttributes(attributes);
    _localDataUpdated = true;
}

void Model::initLocalDescriptors(index_t /*subModelIndex*/) {
    if (!_localBuffer) {
        _localBuffer = _device->createBuffer({gfx::BufferUsageBit::UNIFORM | gfx::BufferUsageBit::TRANSFER_DST,
                                              gfx::MemoryUsageBit::DEVICE,
                                              pipeline::UBOLocal::SIZE,
                                              pipeline::UBOLocal::SIZE,
                                              gfx::BufferFlagBit::ENABLE_STAGING_WRITE});
    }
}

void Model::initLocalSHDescriptors(index_t /*subModelIndex*/) {
#if !CC_EDITOR
    if (!_useLightProbe) {
        return;
    }
#endif

    if (_localSHData.empty()) {
        _localSHData.reset(pipeline::UBOSH::COUNT);
    }

    if (!_localSHBuffer) {
        _localSHBuffer = _device->createBuffer({
            gfx::BufferUsageBit::UNIFORM | gfx::BufferUsageBit::TRANSFER_DST,
            gfx::MemoryUsageBit::DEVICE,
            pipeline::UBOSH::SIZE,
            pipeline::UBOSH::SIZE,
        });
    }
}

void Model::initWorldBoundDescriptors(index_t /*subModelIndex*/) {
    if (!_worldBoundBuffer) {
        _worldBoundBuffer = _device->createBuffer({gfx::BufferUsageBit::UNIFORM | gfx::BufferUsageBit::TRANSFER_DST,
                                                   gfx::MemoryUsageBit::DEVICE,
                                                   pipeline::UBOWorldBound::SIZE,
                                                   pipeline::UBOWorldBound::SIZE,
                                                   gfx::BufferFlagBit::ENABLE_STAGING_WRITE});
    }
}

void Model::updateLocalDescriptors(index_t subModelIndex, gfx::DescriptorSet *descriptorSet) {
    if (isModelImplementedInJS()) {
        if (!_isCalledFromJS) {
            emit<UpdateLocalDescriptors>(subModelIndex, descriptorSet);
            _isCalledFromJS = false;
            return;
        }
    }

    if (_localBuffer) {
        descriptorSet->bindBuffer(pipeline::UBOLocal::BINDING, _localBuffer);
    }
}

void Model::updateLocalSHDescriptors(index_t subModelIndex, gfx::DescriptorSet *descriptorSet) {
    if (isModelImplementedInJS()) {
        if (!_isCalledFromJS) {
            emit<UpdateLocalSHDescriptor>(subModelIndex, descriptorSet);
            _isCalledFromJS = false;
            return;
        }
    }

    if (_localSHBuffer) {
        descriptorSet->bindBuffer(pipeline::UBOSH::BINDING, _localSHBuffer);
    }
}

void Model::updateWorldBoundDescriptors(index_t subModelIndex, gfx::DescriptorSet *descriptorSet) {
    if (isModelImplementedInJS()) {
        if (!_isCalledFromJS) {
            emit<UpdateWorldBound>(subModelIndex, descriptorSet);
            _isCalledFromJS = false;
            return;
        }
    }

    if (_worldBoundBuffer) {
        descriptorSet->bindBuffer(pipeline::UBOLocal::BINDING, _worldBoundBuffer);
    }
}

void Model::updateLocalShadowBias() {
    _localDataUpdated = true;
}

void Model::updateReflectionProbeCubemap(TextureCube *texture) {
    _localDataUpdated = true;
    if (texture == nullptr) {
        texture = BuiltinResMgr::getInstance()->get<TextureCube>(ccstd::string("default-cube-texture"));
    }
    gfx::Texture *gfxTexture = texture->getGFXTexture();
    if (gfxTexture) {
        auto *sampler = _device->getSampler(texture->getSamplerInfo());
        for (SubModel *subModel : _subModels) {
            gfx::DescriptorSet *descriptorSet = subModel->getDescriptorSet();
            descriptorSet->bindTexture(pipeline::REFLECTIONPROBECUBEMAP::BINDING, gfxTexture);
            descriptorSet->bindSampler(pipeline::REFLECTIONPROBECUBEMAP::BINDING, sampler);
            descriptorSet->update();
        }
    }
}
void Model::updateReflectionProbePlanarMap(gfx::Texture *texture) {
    _localDataUpdated = true;

    gfx::Texture *bindingTexture = texture;
    if (!bindingTexture) {
        bindingTexture = BuiltinResMgr::getInstance()->get<Texture2D>(ccstd::string("empty-texture"))->getGFXTexture();
    }
    if (bindingTexture) {
        gfx::SamplerInfo info{
            cc::gfx::Filter::LINEAR,
            cc::gfx::Filter::LINEAR,
            cc::gfx::Filter::NONE,
            cc::gfx::Address::CLAMP,
            cc::gfx::Address::CLAMP,
            cc::gfx::Address::CLAMP,
        };
        auto *sampler = _device->getSampler(info);
        for (SubModel *subModel : _subModels) {
            gfx::DescriptorSet *descriptorSet = subModel->getDescriptorSet();
            descriptorSet->bindTexture(pipeline::REFLECTIONPROBEPLANARMAP::BINDING, bindingTexture);
            descriptorSet->bindSampler(pipeline::REFLECTIONPROBEPLANARMAP::BINDING, sampler);
            descriptorSet->update();
        }
    }
}

void Model::updateReflectionProbeDataMap(Texture2D *texture) {
    _localDataUpdated = true;

    if (!texture) {
        texture = BuiltinResMgr::getInstance()->get<Texture2D>(ccstd::string("empty-texture"));
    }
    gfx::Texture *gfxTexture = texture->getGFXTexture();
    if (gfxTexture) {
        for (SubModel *subModel : _subModels) {
            gfx::DescriptorSet *descriptorSet = subModel->getDescriptorSet();
            descriptorSet->bindTexture(pipeline::REFLECTIONPROBEDATAMAP::BINDING, gfxTexture);
            descriptorSet->bindSampler(pipeline::REFLECTIONPROBEDATAMAP::BINDING, texture->getGFXSampler());
            descriptorSet->update();
        }
    }
}

void Model::updateReflectionProbeBlendCubemap(TextureCube *texture) {
    _localDataUpdated = true;
    if (texture == nullptr) {
        texture = BuiltinResMgr::getInstance()->get<TextureCube>(ccstd::string("default-cube-texture"));
    }
    gfx::Texture *gfxTexture = texture->getGFXTexture();
    if (gfxTexture) {
        auto *sampler = _device->getSampler(texture->getSamplerInfo());
        for (SubModel *subModel : _subModels) {
            gfx::DescriptorSet *descriptorSet = subModel->getDescriptorSet();
            descriptorSet->bindTexture(pipeline::REFLECTIONPROBEBLENDCUBEMAP::BINDING, gfxTexture);
            descriptorSet->bindSampler(pipeline::REFLECTIONPROBEBLENDCUBEMAP::BINDING, sampler);
            descriptorSet->update();
        }
    }
}

void Model::updateReflectionProbeId() {
    _localDataUpdated = true;
}

void Model::setInstancedAttribute(const ccstd::string &name, const float *value, uint32_t byteCount) {
    for (const auto &subModel : _subModels) {
        subModel->setInstancedAttribute(name, value, byteCount);
    }
}
void Model::setReflectionProbeType(UseReflectionProbeType val) {
    _reflectionProbeType = val;
    for (const auto &subModel : _subModels) {
        subModel->setReflectionProbeType(static_cast<int32_t>(val));
    }
    onMacroPatchesStateChanged();
}

} // namespace scene
} // namespace cc
