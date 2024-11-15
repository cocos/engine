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

#pragma once

#include <cmath>
#include <tuple>
#include "base/Ptr.h"
#include "base/RefCounted.h"
#include "core/TypedArray.h"
#include "core/assets/RenderingSubMesh.h"
#include "core/assets/Texture2D.h"
#include "core/assets/TextureCube.h"
#include "core/builtin/BuiltinResMgr.h"
#include "core/event/EventTarget.h"
#include "core/geometry/AABB.h"
#include "core/scene-graph/Layers.h"
#include "core/scene-graph/Node.h"
#include "renderer/gfx-base/GFXBuffer.h"
#include "renderer/gfx-base/GFXDef-common.h"
#include "renderer/gfx-base/GFXTexture.h"
#include "scene/SubModel.h"

namespace cc {

class Material;

namespace scene {

/**
 * @en Use Reflection probe
 * @zh 使用反射探针。
 */
enum class UseReflectionProbeType {
    /**
     * @en Use the default skybox.
     * @zh 使用默认天空盒。
     */
    NONE,
    /**
     * @en Cubemap generate by probe.
     * @zh Probe烘焙的cubemap。
     */
    BAKED_CUBEMAP,
    /**
     * @en Realtime planar reflection.
     * @zh 实时平面反射。
     */
    PLANAR_REFLECTION,
    /**
     * @en Mixing between reflection probe.
     * @zh 反射探针之间进行混合。
     */
    BLEND_PROBES,
    /**
     * @en Mixing between reflection probe and skybox.
     * @zh 反射探针之间混合或反射探针和天空盒之间混合。
     */
    BLEND_PROBES_AND_SKYBOX,
};

// SubModel.h -> Define.h -> Model.h, so do not include SubModel.h here.
class SubModel;
// RenderScene.h <-> Model.h, so do not include RenderScene.h here.
class RenderScene;
class OctreeNode;
class Octree;
class Pass;
struct IMacroPatch;

class Model : public RefCounted {
    IMPL_EVENT_TARGET(Model)

    DECLARE_TARGET_EVENT_BEGIN(Model)
    TARGET_EVENT_ARG1(UpdateTransform, uint32_t)
    TARGET_EVENT_ARG1(UpdateUBO, uint32_t)
    TARGET_EVENT_ARG2(UpdateLocalSHDescriptor, index_t, gfx::DescriptorSet *)
    TARGET_EVENT_ARG2(UpdateLocalDescriptors, index_t, gfx::DescriptorSet *)
    TARGET_EVENT_ARG2(UpdateWorldBound, index_t, gfx::DescriptorSet *)
    TARGET_EVENT_ARG2(UpdateInstancedAttributes, const std::vector<gfx::Attribute> &, SubModel *)
    TARGET_EVENT_ARG2(GetMacroPatches, index_t, std::vector<IMacroPatch> *)
    DECLARE_TARGET_EVENT_END()
public:
    enum class Type {
        DEFAULT,
        SKINNING,
        BAKED_SKINNING,
        BATCH_2D,
        PARTICLE_BATCH,
        LINE,
    };

    Model();
    ~Model() override;

    virtual void destroy();
    virtual void initSubModel(index_t idx, RenderingSubMesh *subMeshData, Material *mat);
    virtual ccstd::vector<IMacroPatch> getMacroPatches(index_t subModelIndex);
    virtual void setSubModelMaterial(index_t idx, Material *mat);
    virtual void updateInstancedAttributes(const ccstd::vector<gfx::Attribute> &attributes, SubModel *subModel);
    virtual void updateTransform(uint32_t stamp);
    virtual void updateUBOs(uint32_t stamp);
    virtual void updateLocalDescriptors(index_t subModelIndex, gfx::DescriptorSet *descriptorSet);
    virtual void updateLocalSHDescriptors(index_t subModelIndex, gfx::DescriptorSet *descriptorSet);
    virtual void updateWorldBoundDescriptors(index_t subModelIndex, gfx::DescriptorSet *descriptorSet);

    void createBoundingShape(const ccstd::optional<Vec3> &minPos, const ccstd::optional<Vec3> &maxPos);
    void initialize();
    void initLightingmap(Texture2D *texture, const Vec4 &uvParam);
    void initLocalDescriptors(index_t subModelIndex);
    void initLocalSHDescriptors(index_t subModelIndex);
    void initWorldBoundDescriptors(index_t subModelIndex);
    void onGlobalPipelineStateChanged() const;
    void onMacroPatchesStateChanged();
    void onGeometryChanged();
    void setSubModelMesh(index_t idx, RenderingSubMesh *subMesh) const;
    void setInstancedAttribute(const ccstd::string &name, const TypedArray &value);
    void updateWorldBound();
    void updateWorldBoundsForJSSkinningModel(const Vec3 &min, const Vec3 &max);
    void updateWorldBoundsForJSBakedSkinningModel(geometry::AABB *aabb);
    void updateLightingmap(Texture2D *texture, const Vec4 &uvParam);
    void clearSHUBOs();
    void updateSHUBOs();
    void updateOctree();
    void updateWorldBoundUBOs();
    void updateLocalShadowBias();
    void updateReflectionProbeCubemap(TextureCube *texture);
    void updateReflectionProbePlanarMap(gfx::Texture *texture);
    void updateReflectionProbeId();
    void updateReflectionProbeDataMap(Texture2D *texture);
    void updateReflectionProbeBlendCubemap(TextureCube *texture);

    inline void attachToScene(RenderScene *scene) {
        _scene = scene;
        _localDataUpdated = true;
    }
    inline void detachFromScene() { _scene = nullptr; };
    inline void setCastShadow(bool value) { _castShadow = value; }
    inline void setEnabled(bool value) { _enabled = value; }
    inline void setLocalBuffer(gfx::Buffer *buffer) { _localBuffer = buffer; }
    inline void setLocalSHBuffer(gfx::Buffer *buffer) { _localSHBuffer = buffer; }
    inline void setWorldBoundBuffer(gfx::Buffer *buffer) { _worldBoundBuffer = buffer; }

    inline void setNode(Node *node) { _node = node; }
    inline void setReceiveShadow(bool value) {
        _receiveShadow = value;
        onMacroPatchesStateChanged();
    }
    inline void setShadowBias(float bias) { _shadowBias.x = bias; }
    inline void setShadowNormalBias(float normalBias) { _shadowBias.y = normalBias; }
    inline void setTransform(Node *node) { _transform = node; }
    inline void setVisFlags(Layers::Enum flags) { _visFlags = flags; }
    inline void setBounds(geometry::AABB *world) {
        _worldBounds = world;
        _modelBounds->set(_worldBounds->getCenter(), _worldBounds->getHalfExtents());
        _worldBoundsDirty = true;
    }
    inline void setOctreeNode(OctreeNode *node) { _octreeNode = node; }
    inline void setScene(RenderScene *scene) {
        _scene = scene;
        if (scene) _localDataUpdated = true;
    }

    inline bool isInited() const { return _inited; }
    inline bool isCastShadow() const { return _castShadow; }
    inline bool isEnabled() const { return _enabled; }
    inline bool getUseLightProbe() const { return _useLightProbe; }
    inline void setUseLightProbe(bool val) {
        _useLightProbe = val;
        onMacroPatchesStateChanged();
    }
    inline bool getBakeToReflectionProbe() const { return _bakeToReflectionProbe; }
    inline void setBakeToReflectionProbe(bool val) {
        _bakeToReflectionProbe = val;
    }
    inline UseReflectionProbeType getReflectionProbeType() const { return _reflectionProbeType; }
    void setReflectionProbeType(UseReflectionProbeType val);
    inline int32_t getReflectionProbeId() const { return _reflectionProbeId; }
    inline void setReflectionProbeId(int32_t reflectionProbeId) {
        _reflectionProbeId = reflectionProbeId;
        _shadowBias.z = reflectionProbeId;
    }
    inline int32_t getReflectionProbeBlendId() const { return _reflectionProbeBlendId; }
    inline void setReflectionProbeBlendId(int32_t reflectionProbeId) {
        _reflectionProbeBlendId = reflectionProbeId;
        _shadowBias.w = reflectionProbeId;
    }
    inline float getReflectionProbeBlendWeight() const { return _reflectionProbeBlendWeight; }
    inline void setReflectionProbeBlendWeight(float weight) { _reflectionProbeBlendWeight = weight; }
    inline int32_t getTetrahedronIndex() const { return _tetrahedronIndex; }
    inline void setTetrahedronIndex(int32_t index) { _tetrahedronIndex = index; }
    inline bool showTetrahedron() const { return isLightProbeAvailable(); }
    inline gfx::Buffer *getLocalBuffer() const { return _localBuffer.get(); }
    inline gfx::Buffer *getLocalSHBuffer() const { return _localSHBuffer.get(); }
    inline gfx::Buffer *getWorldBoundBuffer() const { return _worldBoundBuffer.get(); }
    inline Float32Array getLocalSHData() const { return _localSHData; }
    inline geometry::AABB *getModelBounds() const { return _modelBounds; }
    inline Node *getNode() const { return _node.get(); }
    inline bool isReceiveShadow() const { return _receiveShadow; }
    inline const ccstd::vector<IntrusivePtr<SubModel>> &getSubModels() const { return _subModels; }
    inline Node *getTransform() const { return _transform.get(); }
    inline bool isLocalDataUpdated() const { return _localDataUpdated; }
    inline uint32_t getUpdateStamp() const { return _updateStamp; }
    inline Layers::Enum getVisFlags() const { return _visFlags; }
    inline geometry::AABB *getWorldBounds() const { return _worldBounds; }
    inline Type getType() const { return _type; };
    inline void setType(Type type) { _type = type; }
    inline OctreeNode *getOctreeNode() const { return _octreeNode; }
    inline RenderScene *getScene() const { return _scene; }
    inline void setDynamicBatching(bool val) { _isDynamicBatching = val; }
    inline bool isDynamicBatching() const { return _isDynamicBatching; }
    inline float getShadowBias() const { return _shadowBias.x; }
    inline float getShadowNormalBias() const { return _shadowBias.y; }
    inline uint32_t getPriority() const { return _priority; }
    inline void setPriority(uint32_t value) { _priority = value; }
    inline bool isReceiveDirLight() const { return _receiveDirLight; }
    inline void setReceiveDirLight(bool value) {
        _receiveDirLight = value;
        onMacroPatchesStateChanged();
    }
    inline void invalidateLocalData() { _localDataUpdated = true; }

    // For JS
    inline void setCalledFromJS(bool v) { _isCalledFromJS = v; }
    inline void setLocalDataUpdated(bool v) { _localDataUpdated = v; }
    inline void setWorldBounds(geometry::AABB *bounds) {
        _worldBounds = bounds;
        _worldBoundsDirty = true;
    }
    inline void setModelBounds(geometry::AABB *bounds) { _modelBounds = bounds; }
    inline bool isModelImplementedInJS() const { return (_type != Type::DEFAULT && _type != Type::SKINNING && _type != Type::BAKED_SKINNING); };

protected:
    static SubModel *createSubModel();

    void updateAttributesAndBinding(index_t subModelIndex);
    bool isLightProbeAvailable() const;
    void updateSHBuffer();

    // Please declare variables in descending order of memory size occupied by variables.
    Type _type{Type::DEFAULT};
    Layers::Enum _visFlags{Layers::Enum::NONE};

    UseReflectionProbeType _reflectionProbeType{ UseReflectionProbeType::NONE };
    int32_t _tetrahedronIndex{-1};
    uint32_t _descriptorSetCount{1};
    uint32_t _priority{0};
    uint32_t _updateStamp{0};
    int32_t _reflectionProbeId{-1};
    int32_t _reflectionProbeBlendId{ -1 };
    float _reflectionProbeBlendWeight{0.F};

    OctreeNode *_octreeNode{nullptr};
    RenderScene *_scene{nullptr};
    gfx::Device *_device{nullptr};

    IntrusivePtr<Node> _transform;
    IntrusivePtr<Node> _node;
    IntrusivePtr<gfx::Buffer> _localBuffer;
    IntrusivePtr<gfx::Buffer> _localSHBuffer;
    IntrusivePtr<gfx::Buffer> _worldBoundBuffer;
    IntrusivePtr<geometry::AABB> _worldBounds;
    IntrusivePtr<geometry::AABB> _modelBounds;
    IntrusivePtr<Texture2D> _lightmap;

    bool _enabled{false};
    bool _castShadow{false};
    bool _receiveShadow{false};
    bool _isDynamicBatching{false};
    bool _inited{false};
    bool _localDataUpdated{false};
    bool _worldBoundsDirty{true};
    bool _useLightProbe = false;
    bool _bakeToReflectionProbe{true};
    bool _receiveDirLight{true};
    // For JS
    bool _isCalledFromJS{false};

    Vec3 _lastWorldBoundCenter{INFINITY, INFINITY, INFINITY};

    Vec4 _shadowBias{0.F, 0.F, -1.F, -1.F};
    Vec4 _lightmapUVParam;

    // For JS
    // CallbacksInvoker _eventProcessor;
    ccstd::vector<IntrusivePtr<SubModel>> _subModels;

    Float32Array _localSHData;

private:
    CC_DISALLOW_COPY_MOVE_ASSIGN(Model);
};

} // namespace scene
} // namespace cc
