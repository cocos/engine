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

#include "scene/RenderScene.h"
#include "scene/Camera.h"

#include <utility>
#include "3d/models/BakedSkinningModel.h"
#include "3d/models/SkinningModel.h"
#include "base/Log.h"
#include "core/Root.h"
#include "core/scene-graph/Node.h"
#include "RayTracingScene.h"
#include "profiler/Profiler.h"
#include "renderer/pipeline/PipelineSceneData.h"
#include "renderer/pipeline/custom/RenderInterfaceTypes.h"
#include "scene/Camera.h"
#include "scene/DirectionalLight.h"
#include "scene/DrawBatch2D.h"
#include "scene/LODGroup.h"
#include "scene/Model.h"
#include "scene/Octree.h"
#include "scene/PointLight.h"
#include "scene/RangedDirectionalLight.h"
#include "scene/SphereLight.h"
#include "scene/SpotLight.h"

namespace cc {
namespace scene {

/**
 * @zh 管理LODGroup的使用状态，包含使用层级及其上的model可见相机列表；便于判断当前model是否被LODGroup裁剪
 * @en Manage the usage status of LODGroup, including the usage level and the list of visible cameras on its models; easy to determine whether the current mod is cropped by LODGroup。
 */
class LodStateCache : public RefCounted {
public:
    struct LODInfo {
        /**
         * @zh 当前使用哪一级的 LOD, -1 表示没有层级被使用
         * @en Which level of LOD is currently in use, -1 means no levels are used
         */
        int8_t usedLevel{-1};
        int8_t lastUsedLevel{-1};
        bool transformDirty{true};
    };

    explicit LodStateCache(RenderScene *scene) : _renderScene(scene){};
    ~LodStateCache() override = default;

    void addCamera(const Camera *camera);

    void removeCamera(const Camera *camera);

    void addLodGroup(const LODGroup *lodGroup);

    void removeLodGroup(const LODGroup *lodGroup);

    void removeModel(const Model *model);

    void updateLodState();

    bool isLodModelCulled(const Camera *camera, const Model *model);

    void clearCache();

private:
    /**
     * @zh LOD使用的model集合以及每个model当前能被看到的相机列表；包含每个LODGroup的每一级LOD
     * @en The set of models used by the LOD and the list of cameras that each models can currently be seen, contains each level of LOD for each LODGroup.
     */
    ccstd::unordered_map<const Model *, ccstd::unordered_map<const Camera *, bool>> _modelsInLODGroup;

    /**
     * @zh 指定相机下，LODGroup使用哪一级的LOD
     * @en Specify which level of LOD is used by the LODGroup under the camera.
     */
    ccstd::unordered_map<const Camera *, ccstd::unordered_map<const LODGroup *, LODInfo>> _lodStateInCamera;

    /**
     * @zh 上一帧添加的LODGroup
     * @en The LODGroup added in the previous frame.
     */
    ccstd::vector<const LODGroup *> _newAddedLodGroupVec;

    /**
     * @zh 每个LOD上的所有models，包含所有LODGroup中的所有LOD
     * @en All mods on each LOD, containing all LODs in all LODGroups.
     */
    ccstd::unordered_map<const LODGroup *, ccstd::unordered_map<uint8_t, ccstd::vector<const Model *>>> _levelModels;

    RenderScene *_renderScene{nullptr};
};

RenderScene::RenderScene() = default;

RenderScene::~RenderScene() = default;

void RenderScene::activate() {
    const auto *sceneData = Root::getInstance()->getPipeline()->getPipelineSceneData();
    _octree = sceneData->getOctree();
    _sceneAccel = ccnew RayTracingScene;
}

bool RenderScene::initialize(const IRenderSceneInfo &info) {
    _name = info.name;
    _lodStateCache = ccnew LodStateCache(this);
    _rayTracing = ccnew raytracing::RayTracing(this);
    return true;
}

void RenderScene::addLODGroup(LODGroup *group) {
    group->attachToScene(this);
    _lodGroups.emplace_back(group);
    _lodStateCache->addLodGroup(group);
}

void RenderScene::removeLODGroup(LODGroup *group) {
    auto iter = std::find(_lodGroups.begin(), _lodGroups.end(), group);
    if (iter != _lodGroups.end()) {
        _lodStateCache->removeLodGroup(group);
        group->detachFromScene();
        _lodGroups.erase(iter);
    } else {
        CC_LOG_WARNING("Try to remove invalid LODGroup.");
    }
}

void RenderScene::removeLODGroups() {
    for (const auto &group : _lodGroups) {
        _lodStateCache->removeLodGroup(group);
        group->detachFromScene();
    }
    _lodGroups.clear();
}

bool RenderScene::isCulledByLod(const Camera *camera, const Model *model) const {
    return _lodStateCache->isLodModelCulled(camera, model);
}

void RenderScene::setMainLight(DirectionalLight *dl) {
    _mainLight = dl;
    if (_mainLight) _mainLight->activate();
}

void RenderScene::update(uint32_t stamp) {
    CC_PROFILE(RenderSceneUpdate);

    if (_mainLight) {
        _mainLight->update();
    }
    for (const auto &light : _sphereLights) {
        light->update();
    }
    for (const auto &light : _spotLights) {
        light->update();
    }
    for (const auto &light : _pointLights) {
        light->update();
    }
    for (const auto &light : _rangedDirLights) {
        light->update();
    }
    for (const auto &model : _models) {
        if (model->isEnabled()) {
            model->updateTransform(stamp);
            model->updateUBOs(stamp);
            model->updateOctree();
        }
    }

    _sceneAccel->update(this);

    CC_PROFILE_OBJECT_UPDATE(Models, _models.size());
    CC_PROFILE_OBJECT_UPDATE(Cameras, _cameras.size());
    CC_PROFILE_OBJECT_UPDATE(DrawBatch2D, _batches.size());

    _lodStateCache->updateLodState();
}

void RenderScene::destroy() {
    removeCameras();
    removeSphereLights();
    removeSpotLights();
    removePointLights();
    removeLODGroups();
    removeModels();
    CC_SAFE_DELETE(_sceneAccel)
    _lodStateCache->clearCache();
}

void RenderScene::addCamera(Camera *camera) {
    camera->attachToScene(this);
    _cameras.emplace_back(camera);
    _lodStateCache->addCamera(camera);
}

void RenderScene::removeCamera(Camera *camera) {
    auto iter = std::find(_cameras.begin(), _cameras.end(), camera);
    if (iter != _cameras.end()) {
        _lodStateCache->removeCamera(camera);
        (*iter)->detachFromScene();
        _cameras.erase(iter);
    }
}

void RenderScene::removeCameras() {
    for (const auto &camera : _cameras) {
        _lodStateCache->removeCamera(camera);
        camera->detachFromScene();
        camera->destroy();
    }
    _cameras.clear();
}

void RenderScene::unsetMainLight(DirectionalLight *dl) {
    if (_mainLight == dl) {
        const auto &dlList = _directionalLights;
        if (!dlList.empty()) {
            setMainLight(dlList[dlList.size() - 1]);
            if (_mainLight->getNode() != nullptr) {
                uint32_t flag = _mainLight->getNode()->getChangedFlags();
                _mainLight->getNode()->setChangedFlags(flag | static_cast<uint32_t>(TransformBit::ROTATION));
            }
            return;
        }
        setMainLight(nullptr);
    }
}

void RenderScene::addDirectionalLight(DirectionalLight *dl) {
    dl->attachToScene(this);
    _directionalLights.emplace_back(dl);
}

void RenderScene::removeDirectionalLight(DirectionalLight *dl) {
    auto iter = std::find(_directionalLights.begin(), _directionalLights.end(), dl);
    if (iter != _directionalLights.end()) {
        (*iter)->detachFromScene();
        _directionalLights.erase(iter);
        return;
    }
}

void RenderScene::addSphereLight(SphereLight *light) {
    light->attachToScene(this);
    _sphereLights.emplace_back(light);
}

void RenderScene::removeSphereLight(SphereLight *sphereLight) {
    auto iter = std::find(_sphereLights.begin(), _sphereLights.end(), sphereLight);
    if (iter != _sphereLights.end()) {
        (*iter)->detachFromScene();
        _sphereLights.erase(iter);
    } else {
        CC_LOG_WARNING("Try to remove invalid sphere light.");
    }
}

void RenderScene::addSpotLight(SpotLight *spotLight) {
    spotLight->attachToScene(this);
    _spotLights.emplace_back(spotLight);
}

void RenderScene::removeSpotLight(SpotLight *spotLight) {
    auto iter = std::find(_spotLights.begin(), _spotLights.end(), spotLight);
    if (iter != _spotLights.end()) {
        (*iter)->detachFromScene();
        _spotLights.erase(iter);
    } else {
        CC_LOG_WARNING("Try to remove invalid spot light.");
    }
}

void RenderScene::removeSphereLights() {
    for (const auto &sphereLight : _sphereLights) {
        sphereLight->detachFromScene();
    }
    _sphereLights.clear();
}

void RenderScene::removeSpotLights() {
    for (const auto &spotLight : _spotLights) {
        spotLight->detachFromScene();
    }
    _spotLights.clear();
}

void RenderScene::addPointLight(PointLight *light) {
    _pointLights.emplace_back(light);
}

void RenderScene::removePointLight(PointLight *pointLight) {
    auto iter = std::find(_pointLights.begin(), _pointLights.end(), pointLight);
    if (iter != _pointLights.end()) {
        _pointLights.erase(iter);
    } else {
        CC_LOG_WARNING("Try to remove invalid point light.");
    }
}

void RenderScene::removePointLights() {
    for (const auto &pointLight : _pointLights) {
        pointLight->detachFromScene();
    }
    _pointLights.clear();
}

void RenderScene::addRangedDirLight(RangedDirectionalLight *rangedDirLight) {
    _rangedDirLights.emplace_back(rangedDirLight);
}

void RenderScene::removeRangedDirLight(RangedDirectionalLight *rangedDirLight) {
    const auto iter = std::find(_rangedDirLights.begin(), _rangedDirLights.end(), rangedDirLight);
    if (iter != _rangedDirLights.end()) {
        _rangedDirLights.erase(iter);
    } else {
        CC_LOG_WARNING("Try to remove invalid ranged directional light.");
    }
}

void RenderScene::removeRangedDirLights() {
    for (const auto &rangedDirLight : _rangedDirLights) {
        rangedDirLight->detachFromScene();
    }
    _rangedDirLights.clear();
}

void RenderScene::addModel(Model *model) {
    model->attachToScene(this);
    _models.emplace_back(model);

    if (_octree && _octree->isEnabled()) {
        _octree->insert(model);
    }
}

void RenderScene::removeModel(Model *model) {
    auto iter = std::find(_models.begin(), _models.end(), model);
    if (iter != _models.end()) {
        if (_octree && _octree->isEnabled()) {
            _octree->remove(*iter);
        }
        _lodStateCache->removeModel(model);
        model->detachFromScene();
        _models.erase(iter);
    } else {
        CC_LOG_WARNING("Try to remove invalid model.");
    }
}

void RenderScene::removeModels() {
    for (const auto &model : _models) {
        if (_octree && _octree->isEnabled()) {
            _octree->remove(model);
        }
        _lodStateCache->removeModel(model);
        model->detachFromScene();
        CC_SAFE_DESTROY(model);
    }
    _models.clear();
}
void RenderScene::addBatch(DrawBatch2D *drawBatch2D) {
    _batches.emplace_back(drawBatch2D);
}

void RenderScene::removeBatch(DrawBatch2D *drawBatch2D) {
    auto iter = std::find(_batches.begin(), _batches.end(), drawBatch2D);
    if (iter != _batches.end()) {
        _batches.erase(iter);
    } else {
        CC_LOG_WARNING("Try to remove invalid DrawBatch2D.");
    }
}

void RenderScene::removeBatches() {
    _batches.clear();
}

void RenderScene::updateOctree(Model *model) {
    if (_octree && _octree->isEnabled()) {
        _octree->update(model);
    }
}

void RenderScene::onGlobalPipelineStateChanged() {
    for (const auto &model : _models) {
        model->onGlobalPipelineStateChanged();
    }
}

void LodStateCache::addCamera(const Camera *camera) {
    for (const auto &lodGroup : _renderScene->getLODGroups()) {
        auto layer = lodGroup->getNode()->getLayer();
        if ((camera->getVisibility() & layer) == layer) {
            if (_lodStateInCamera.count(camera) == 0) {
                _lodStateInCamera[camera] = {};
            }
            break;
        }
    }
}

void LodStateCache::removeCamera(const Camera *camera) {
    if (_lodStateInCamera.count(camera) != 0) {
        _lodStateInCamera.erase(camera);
    }
}

void LodStateCache::addLodGroup(const LODGroup *lodGroup) {
    _newAddedLodGroupVec.push_back(lodGroup);

    for (const auto &camera : _renderScene->getCameras()) {
        if (_lodStateInCamera.count(camera)) {
            continue;
        }
        auto layer = lodGroup->getNode()->getLayer();
        if ((camera->getVisibility() & layer) == layer) {
            _lodStateInCamera[camera] = {};
        }
    }
}

void LodStateCache::removeLodGroup(const LODGroup *lodGroup) {
    for (auto index = 0; index < lodGroup->getLodCount(); index++) {
        const auto &lod = lodGroup->getLodDataArray()[index];
        for (const auto &model : lod->getModels()) {
            _modelsInLODGroup.erase(model);
        }
    }
    for (auto &visibleCamera : _lodStateInCamera) {
        visibleCamera.second.erase(lodGroup);
    }
    _levelModels.erase(lodGroup);
}

void LodStateCache::removeModel(const Model *model) {
    if (_modelsInLODGroup.count(model) != 0) {
        _modelsInLODGroup.erase(model);
    }
}

// Update list of visible cameras on _modelsInLODGroup and update lod usage level under specified camera.
void LodStateCache::updateLodState() {
    //insert _newAddedLodGroupVec's model into _modelsInLODGroup
    for (const auto &addedLodGroup : _newAddedLodGroupVec) {
        auto &lodModels = _levelModels[addedLodGroup];
        for (uint8_t index = 0; index < addedLodGroup->getLodCount(); index++) {
            auto &vecModels = lodModels[index];
            const auto &lod = addedLodGroup->getLodDataArray()[index];
            for (const auto &model : lod->getModels()) {
                auto &modelInfo = _modelsInLODGroup[model];
                vecModels.push_back(model);
            }
        }
    }
    _newAddedLodGroupVec.clear();

    //update current visible lod index & model's visible cameras list
    for (const auto &lodGroup : _renderScene->getLODGroups()) {
        if (lodGroup->isEnabled()) {
            const auto &lodLevels = lodGroup->getLockedLODLevels();
            // lodLevels is not empty, indicating that the user force to use certain layers of LOD
            if (!lodLevels.empty()) {
                //Update the dirty flag to make it easier to update the visible index of lod after lifting the forced use of lod.
                if (lodGroup->getNode()->getChangedFlags() > 0) {
                    for (auto &visibleCamera : _lodStateInCamera) {
                        auto &lodInfo = visibleCamera.second[lodGroup];
                        lodInfo.transformDirty = true;
                    }
                }
                //Update the visible camera list of all models on lodGroup when the visible level changes.
                if (lodGroup->isLockLevelChanged()) {
                    lodGroup->resetLockChangeFlag();
                    const auto &lodModels = _levelModels[lodGroup];
                    for (const auto &level : lodModels) {
                        const auto &vecModels = lodModels.at(level.first);
                        for (const auto &model : vecModels) {
                            _modelsInLODGroup[model].clear();
                        }
                    }

                    for (uint8_t visibleIndex : lodLevels) {
                        const auto &vecModels = lodModels.at(visibleIndex);
                        for (const auto &model : vecModels) {
                            if (model->getNode() && model->getNode()->isActive()) {
                                auto &modelInfo = _modelsInLODGroup[model];
                                for (const auto &visibleCamera : _lodStateInCamera) {
                                    modelInfo.emplace(visibleCamera.first, true);
                                }
                            }
                        }
                    }
                }
                continue;
            }

            //Normal Process, no LOD is forced.
            bool hasUpdated = false;
            for (auto &visibleCamera : _lodStateInCamera) {
                auto cameraChangeFlags = visibleCamera.first->getNode()->getChangedFlags();
                auto lodGroupChangeFlags = lodGroup->getNode()->getChangedFlags();
                auto &lodInfo = visibleCamera.second[lodGroup];
                //Changes in the camera matrix or changes in the matrix of the node where lodGroup is located or the transformDirty marker is true, etc. All need to recalculate the visible level of LOD.
                if (cameraChangeFlags > 0 || lodGroupChangeFlags > 0 || lodInfo.transformDirty) {
                    if (lodInfo.transformDirty) {
                        lodInfo.transformDirty = false;
                    }

                    int8_t index = lodGroup->getVisibleLODLevel(visibleCamera.first);
                    if (index != lodInfo.usedLevel) {
                        lodInfo.lastUsedLevel = lodInfo.usedLevel;
                        lodInfo.usedLevel = index;
                        hasUpdated = true;
                    }
                }
            }

            //The LOD of the last frame is forced to be used, the list of visible cameras of modelInfo needs to be updated.
            const auto &lodModels = _levelModels[lodGroup];
            if (lodGroup->isLockLevelChanged()) {
                lodGroup->resetLockChangeFlag();

                for (const auto &level : lodModels) {
                    const auto &vecModels = lodModels.at(level.first);
                    for (const auto &model : vecModels) {
                        _modelsInLODGroup[model].clear();
                    }
                }
                hasUpdated = true;
            } else if (hasUpdated) {
                for (auto &visibleCamera : _lodStateInCamera) {
                    const auto &lodInfo = visibleCamera.second[lodGroup];
                    int8_t usedLevel = lodInfo.usedLevel;
                    if (lodInfo.usedLevel != lodInfo.lastUsedLevel && lodInfo.lastUsedLevel >= 0) {
                        const auto &vecModels = lodModels.at(static_cast<uint8_t>(lodInfo.lastUsedLevel));
                        for (const auto &model : vecModels) {
                            _modelsInLODGroup[model].clear();
                        }
                    }
                }
            }
            //Update the visible camera list of all models on lodGroup.
            if (hasUpdated) {
                for (auto &visibleCamera : _lodStateInCamera) {
                    int8_t usedLevel = visibleCamera.second[lodGroup].usedLevel;
                    if (usedLevel >= 0) {
                        const auto &vecModels = lodModels.at(static_cast<uint8_t>(usedLevel));
                        for (const auto &model : vecModels) {
                            if (model->getNode() && model->getNode()->isActive()) {
                                auto &modelInfo = _modelsInLODGroup[model];
                                modelInfo.emplace(visibleCamera.first, true);
                            }
                        }
                    }
                }
            }
        }
    }
}

bool LodStateCache::isLodModelCulled(const Camera *camera, const Model *model) {
    const auto &itModel = _modelsInLODGroup.find(model);
    if (itModel == _modelsInLODGroup.end()) {
        return false;
    }

    const auto &visibleCamera = itModel->second;
    return visibleCamera.count(camera) == 0;
}

void LodStateCache::clearCache() {
    _levelModels.clear();
    _modelsInLODGroup.clear();
    _lodStateInCamera.clear();
    _newAddedLodGroupVec.clear();
}

} // namespace scene
} // namespace cc
