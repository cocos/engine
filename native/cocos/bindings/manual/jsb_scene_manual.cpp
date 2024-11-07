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

#include "jsb_scene_manual.h"
#include "bindings/auto/jsb_gfx_auto.h"
#include "bindings/auto/jsb_scene_auto.h"
#include "core/Root.h"
#include "core/scene-graph/Node.h"
#include "scene/Model.h"
#include "application/ApplicationManager.h"

#ifndef JSB_ALLOC
    #define JSB_ALLOC(kls, ...) ccnew kls(__VA_ARGS__)
#endif

#ifndef JSB_FREE
    #define JSB_FREE(ptr) delete ptr
#endif

#define DEFINE_JS_OBJECT_IN_EVENT_CALLBACK(emmiter)              \
    se::Object *jsObject = emitter->getScriptObject();           \
    if (jsObject == nullptr) {                                   \
        jsObject = se::NativePtrToObjectMap::findFirst(emitter); \
        emmiter->setScriptObject(jsObject);                      \
    }

namespace {

class TempFloatArray final {
public:
    TempFloatArray() = default;
    ~TempFloatArray() = default;

    inline void setData(float *data) { _data = data; }

    inline void writeVec3(const cc::Vec3 &p) {
        _data[0] = p.x;
        _data[1] = p.y;
        _data[2] = p.z;
    }

    inline cc::Vec3 readVec3() const {
        return cc::Vec3{_data[0], _data[1], _data[2]};
    }

    inline void writeQuaternion(const cc::Quaternion &p) {
        _data[0] = p.x;
        _data[1] = p.y;
        _data[2] = p.z;
        _data[3] = p.w;
    }

    inline cc::Quaternion readQuaternion() const {
        return cc::Quaternion{_data[0], _data[1], _data[2], _data[3]};
    }

    inline void writeMat4(const cc::Mat4 &m) {
        memcpy(_data, m.m, sizeof(float) * 16);
    }

    inline cc::Mat4 readMat4() const {
        cc::Mat4 ret;
        memcpy(ret.m, _data, sizeof(float) * 16);
        return ret;
    }

    inline void writeRay(const cc::geometry::Ray &ray) {
        _data[0] = ray.o.x;
        _data[1] = ray.o.y;
        _data[2] = ray.o.z;
        _data[3] = ray.d.x;
        _data[4] = ray.d.y;
        _data[5] = ray.d.z;
    }

    inline cc::geometry::Ray readRay() const {
        return cc::geometry::Ray{_data[0], _data[1], _data[2], _data[3], _data[4], _data[5]};
    }

    inline const float &operator[](size_t index) const { return _data[index]; }
    inline float &operator[](size_t index) { return _data[index]; }

private:
    float *_data{nullptr};

    CC_DISALLOW_ASSIGN(TempFloatArray)
};

TempFloatArray tempFloatArray;

} // namespace

static bool js_root_registerListeners(se::State &s) // NOLINT(readability-identifier-naming)
{
    auto *cobj = SE_THIS_OBJECT<cc::Root>(s);
    SE_PRECONDITION2(cobj, false, "Invalid Native Object");

#define DISPATCH_EVENT_TO_JS_ARGS_0(eventType, jsFuncName, postCode)                                               \
    cobj->on<eventType>([](cc::Root *rootObj) {                                                                    \
        se::AutoHandleScope hs;                                                                                    \
        se::Value rootVal;                                                                                         \
        bool ok = nativevalue_to_se(rootObj, rootVal);                                                             \
        SE_PRECONDITION2_FUNCNAME_VOID(ok, #jsFuncName, "js_root_registerListeners : Error processing arguments"); \
        if (rootVal.isObject()) {                                                                                  \
            se::ScriptEngine::getInstance()->callFunction(rootVal.toObject(), #jsFuncName, 0, nullptr);            \
        }                                                                                                          \
        postCode                                                                                                   \
    });

    DISPATCH_EVENT_TO_JS_ARGS_0(cc::Root::BeforeCommit, _onDirectorBeforeCommit, {});
    DISPATCH_EVENT_TO_JS_ARGS_0(cc::Root::BeforeRender, _onDirectorBeforeRender, {});
    DISPATCH_EVENT_TO_JS_ARGS_0(cc::Root::AfterRender, _onDirectorAfterRender, {});
    DISPATCH_EVENT_TO_JS_ARGS_0(cc::Root::PipelineChanged, _onDirectorPipelineChanged, {});

    return true;
}
SE_BIND_FUNC(js_root_registerListeners) // NOLINT(readability-identifier-naming)

static void registerOnTransformChanged(cc::Node *node) {
    node->on<cc::Node::TransformChanged>(
        +[](cc::Node *emitter, cc::TransformBit transformBit) {
            DEFINE_JS_OBJECT_IN_EVENT_CALLBACK(emitter)

            se::AutoHandleScope hs;
            se::Value arg0;
            nativevalue_to_se(transformBit, arg0);
            se::ScriptEngine::getInstance()->callFunction(jsObject, "_onTransformChanged", 1, &arg0);
        });
}

static void registerOnParentChanged(cc::Node *node) {
    node->on<cc::Node::ParentChanged>(
        +[](cc::Node *emitter, cc::Node *oldParent) {
            DEFINE_JS_OBJECT_IN_EVENT_CALLBACK(emitter)

            se::AutoHandleScope hs;
            se::Value arg0;
            nativevalue_to_se(oldParent, arg0);
            se::ScriptEngine::getInstance()->callFunction(jsObject, "_onParentChanged", 1, &arg0);
        });
}

static void registerOnMobilityChanged(cc::Node *node) {
    node->on<cc::Node::MobilityChanged>(
        +[](cc::Node *emitter) {
            DEFINE_JS_OBJECT_IN_EVENT_CALLBACK(emitter)

            se::AutoHandleScope hs;
            se::ScriptEngine::getInstance()->callFunction(jsObject, "_onMobilityChanged", 0, nullptr);
        });
}

static void registerOnLayerChanged(cc::Node *node) {
    node->on<cc::Node::LayerChanged>(
        +[](cc::Node *emitter, uint32_t layer) {
            DEFINE_JS_OBJECT_IN_EVENT_CALLBACK(emitter)

            se::AutoHandleScope hs;
            se::Value arg0;
            nativevalue_to_se(layer, arg0);
            se::ScriptEngine::getInstance()->callFunction(jsObject, "_onLayerChanged", 1, &arg0);
        });
}

static void registerOnChildRemoved(cc::Node *node) {
    node->on<cc::Node::ChildRemoved>(
        +[](cc::Node *emitter, cc::Node *child) {
            DEFINE_JS_OBJECT_IN_EVENT_CALLBACK(emitter)

            se::AutoHandleScope hs;
            se::Value arg0;
            nativevalue_to_se(child, arg0);
            se::ScriptEngine::getInstance()->callFunction(jsObject, "_onChildRemoved", 1, &arg0);
        });
}

static void registerOnChildAdded(cc::Node *node) {
    node->on<cc::Node::ChildAdded>(
        +[](cc::Node *emitter, cc::Node *child) {
            DEFINE_JS_OBJECT_IN_EVENT_CALLBACK(emitter)

            se::AutoHandleScope hs;
            se::Value arg0;
            nativevalue_to_se(child, arg0);
            se::ScriptEngine::getInstance()->callFunction(jsObject, "_onChildAdded", 1, &arg0);
        });
}

static void registerOnSiblingOrderChanged(cc::Node *node) {
    node->on<cc::Node::SiblingOrderChanged>(
        +[](cc::Node *emitter) {
            DEFINE_JS_OBJECT_IN_EVENT_CALLBACK(emitter)

            se::AutoHandleScope scope;
            se::ScriptEngine::getInstance()->callFunction(jsObject, "_onSiblingOrderChanged", 0, nullptr);
        });
}

static void registerOnActiveNode(cc::Node *node) {
    node->on<cc::Node::ActiveNode>(
        +[](cc::Node *emitter, bool shouldActiveNow) {
            DEFINE_JS_OBJECT_IN_EVENT_CALLBACK(emitter)

            se::AutoHandleScope hs;
            se::Value arg0;
            nativevalue_to_se(shouldActiveNow, arg0);
            se::ScriptEngine::getInstance()->callFunction(jsObject, "_onActiveNode", 1, &arg0);
        });
}

static void registerOnBatchCreated(cc::Node *node) {
    node->on<cc::Node::BatchCreated>(
        +[](cc::Node *emitter, bool dontChildPrefab) {
            DEFINE_JS_OBJECT_IN_EVENT_CALLBACK(emitter)

            se::AutoHandleScope hs;
            se::Value arg0;
            nativevalue_to_se(dontChildPrefab, arg0);
            se::ScriptEngine::getInstance()->callFunction(jsObject, "_onBatchCreated", 1, &arg0);
        });
}

static void registerLocalPositionRotationScaleUpdated(cc::Node *node) {
    node->on<cc::Node::LocalPositionUpdated>(
        +[](cc::Node *emitter, float x, float y, float z) {
            DEFINE_JS_OBJECT_IN_EVENT_CALLBACK(emitter)

            se::AutoHandleScope hs;
            ccstd::array<se::Value, 3> args;
            nativevalue_to_se(x, args[0]);
            nativevalue_to_se(y, args[1]);
            nativevalue_to_se(z, args[2]);
            se::ScriptEngine::getInstance()->callFunction(jsObject, "_onLocalPositionUpdated", static_cast<uint32_t>(args.size()), args.data());
        });

    node->on<cc::Node::LocalRotationUpdated>(
        +[](cc::Node *emitter, float x, float y, float z, float w) {
            DEFINE_JS_OBJECT_IN_EVENT_CALLBACK(emitter)

            se::AutoHandleScope hs;
            ccstd::array<se::Value, 4> args;
            nativevalue_to_se(x, args[0]);
            nativevalue_to_se(y, args[1]);
            nativevalue_to_se(z, args[2]);
            nativevalue_to_se(w, args[3]);
            se::ScriptEngine::getInstance()->callFunction(jsObject, "_onLocalRotationUpdated", static_cast<uint32_t>(args.size()), args.data());
        });

    node->on<cc::Node::LocalScaleUpdated>(
        +[](cc::Node *emitter, float x, float y, float z) {
            DEFINE_JS_OBJECT_IN_EVENT_CALLBACK(emitter)

            se::AutoHandleScope hs;
            ccstd::array<se::Value, 3> args;
            nativevalue_to_se(x, args[0]);
            nativevalue_to_se(y, args[1]);
            nativevalue_to_se(z, args[2]);
            se::ScriptEngine::getInstance()->callFunction(jsObject, "_onLocalScaleUpdated", static_cast<uint32_t>(args.size()), args.data());
        });

    node->on<cc::Node::LocalRTSUpdated>(
        +[](cc::Node *emitter, float px, float py, float pz, float rx, float ry, float rz, float rw, float sx, float sy, float sz) {
            DEFINE_JS_OBJECT_IN_EVENT_CALLBACK(emitter)

            se::AutoHandleScope hs;
            ccstd::array<se::Value, 10> args;
            nativevalue_to_se(px, args[0]);
            nativevalue_to_se(py, args[1]);
            nativevalue_to_se(pz, args[2]);

            nativevalue_to_se(rx, args[3]);
            nativevalue_to_se(ry, args[4]);
            nativevalue_to_se(rz, args[5]);
            nativevalue_to_se(rw, args[6]);

            nativevalue_to_se(sx, args[7]);
            nativevalue_to_se(sy, args[8]);
            nativevalue_to_se(sz, args[9]);

            se::ScriptEngine::getInstance()->callFunction(jsObject, "_onLocalPositionRotationScaleUpdated", static_cast<uint32_t>(args.size()), args.data());
        });
}

static void registerOnLightProbeBakingChanged(cc::Node *node, se::Object *jsObject) {
    node->on<cc::Node::LightProbeBakingChanged>(
        [jsObject](cc::Node * /*emitter*/) {
            se::AutoHandleScope hs;
            se::ScriptEngine::getInstance()->callFunction(jsObject, "_onLightProbeBakingChanged", 0, nullptr);
        });
}

static bool js_scene_Node_registerListeners(cc::Node *cobj) // NOLINT(readability-identifier-naming)
{
#define NODE_DISPATCH_EVENT_TO_JS(eventType, jsFuncName)                                      \
    cobj->on<eventType>(                                                                      \
        +[](cc::Node *emitter) {                                                              \
            DEFINE_JS_OBJECT_IN_EVENT_CALLBACK(emitter)                                       \
            se::AutoHandleScope scope;                                                        \
            se::ScriptEngine::getInstance()->callFunction(jsObject, #jsFuncName, 0, nullptr); \
        });

    registerOnActiveNode(cobj);
    // NOTE: Node.prototype._onBatchCreated was implemented in TS and invoked in scene.jsb.ts (Scene.prototype._load),
    // so don't need to register the listener here.
    // registerOnBatchCreated(cobj);
    registerOnChildAdded(cobj);
    registerOnChildRemoved(cobj);

    NODE_DISPATCH_EVENT_TO_JS(cc::Node::Reattach, _onReAttach);
    NODE_DISPATCH_EVENT_TO_JS(cc::Node::RemovePersistRootNode, _onRemovePersistRootNode);

    cobj->on<cc::Node::SiblingIndexChanged>(+[](cc::Node *emitter, index_t newIndex) {
        DEFINE_JS_OBJECT_IN_EVENT_CALLBACK(emitter)

        se::AutoHandleScope hs;
        se::Value arg0;
        nativevalue_to_se(newIndex, arg0);
        se::ScriptEngine::getInstance()->callFunction(jsObject, "_onSiblingIndexChanged", 1, &arg0);
    });

    cobj->on<cc::Node::SceneUpdated>(
        +[](cc::Node *emitter, cc::Scene *scene) {
            DEFINE_JS_OBJECT_IN_EVENT_CALLBACK(emitter)

            se::AutoHandleScope hs;
            se::Value arg0;
            nativevalue_to_se(scene, arg0);
            se::ScriptEngine::getInstance()->callFunction(jsObject, "_onSceneUpdated", 1, &arg0);
        });

#if CC_EDITOR
    cobj->on<cc::Node::EditorAttached>(
        +[](cc::Node *emitter, bool attached) {
            DEFINE_JS_OBJECT_IN_EVENT_CALLBACK(emitter)

            se::AutoHandleScope hs;
            se::Value arg0;
            nativevalue_to_se(attached, arg0);
            se::ScriptEngine::getInstance()->callFunction(jsObject, "_onEditorAttached", 1, &arg0);
        });
#endif

    registerLocalPositionRotationScaleUpdated(cobj);

    return true;
}

static bool js_cc_Node_initAndReturnSharedBuffer(se::State &s) // NOLINT(readability-identifier-naming)
{
    auto *cobj = SE_THIS_OBJECT<cc::Node>(s);
    SE_PRECONDITION2(cobj, false, "Invalid Native Object");

    auto *result = cobj->_getSharedArrayBufferObject();
    js_scene_Node_registerListeners(cobj);
    s.rval().setObject(result);
    return true;
}
SE_BIND_FUNC(js_cc_Node_initAndReturnSharedBuffer) // NOLINT(readability-identifier-naming)

static bool js_scene_Node_registerOnTransformChanged(se::State &s) // NOLINT(readability-identifier-naming)
{
    auto *cobj = SE_THIS_OBJECT<cc::Node>(s);
    SE_PRECONDITION2(cobj, false, "Invalid Native Object");
    registerOnTransformChanged(cobj);
    return true;
}
SE_BIND_FUNC(js_scene_Node_registerOnTransformChanged) // NOLINT(readability-identifier-naming)

static bool js_scene_Node_registerOnParentChanged(se::State &s) // NOLINT(readability-identifier-naming)
{
    auto *cobj = SE_THIS_OBJECT<cc::Node>(s);
    SE_PRECONDITION2(cobj, false, "Invalid Native Object");

    registerOnParentChanged(cobj);
    return true;
}
SE_BIND_FUNC(js_scene_Node_registerOnParentChanged) // NOLINT(readability-identifier-naming)

static bool js_scene_Node_registerOnMobilityChanged(se::State &s) // NOLINT(readability-identifier-naming)
{
    auto *cobj = SE_THIS_OBJECT<cc::Node>(s);
    SE_PRECONDITION2(cobj, false, "Invalid Native Object");

    registerOnMobilityChanged(cobj);
    return true;
}
SE_BIND_FUNC(js_scene_Node_registerOnMobilityChanged) // NOLINT(readability-identifier-naming)

static bool js_scene_Node_registerOnLayerChanged(se::State &s) // NOLINT(readability-identifier-naming)
{
    auto *cobj = SE_THIS_OBJECT<cc::Node>(s);
    SE_PRECONDITION2(cobj, false, "Invalid Native Object");

    registerOnLayerChanged(cobj);
    return true;
}
SE_BIND_FUNC(js_scene_Node_registerOnLayerChanged) // NOLINT(readability-identifier-naming)

static bool js_scene_Node_registerOnSiblingOrderChanged(se::State &s) // NOLINT(readability-identifier-naming)
{
    auto *cobj = SE_THIS_OBJECT<cc::Node>(s);
    SE_PRECONDITION2(cobj, false, "Invalid Native Object");

    registerOnSiblingOrderChanged(cobj);
    return true;
}
SE_BIND_FUNC(js_scene_Node_registerOnSiblingOrderChanged) // NOLINT(readability-identifier-naming)

static bool js_scene_Node_registerOnLightProbeBakingChanged(se::State &s) // NOLINT(readability-identifier-naming)
{
    auto *cobj = SE_THIS_OBJECT<cc::Node>(s);
    SE_PRECONDITION2(cobj, false, "Invalid Native Object");

    auto *jsObject = s.thisObject();

    registerOnLightProbeBakingChanged(cobj, jsObject);
    return true;
}
SE_BIND_FUNC(js_scene_Node_registerOnLightProbeBakingChanged) // NOLINT(readability-identifier-naming)

static bool js_scene_Camera_screenPointToRay(void *nativeObject) // NOLINT(readability-identifier-naming)
{
    auto *cobj = reinterpret_cast<cc::scene::Camera *>(nativeObject);
    cc::geometry::Ray ray = cobj->screenPointToRay(tempFloatArray[0], tempFloatArray[1]);
    tempFloatArray.writeRay(ray);
    return true;
}
SE_BIND_FUNC_FAST(js_scene_Camera_screenPointToRay)

static bool js_scene_Camera_screenToWorld(void *nativeObject) // NOLINT(readability-identifier-naming)
{
    auto *cobj = reinterpret_cast<cc::scene::Camera *>(nativeObject);
    cc::Vec3 ret = cobj->screenToWorld(tempFloatArray.readVec3());
    tempFloatArray.writeVec3(ret);
    return true;
}
SE_BIND_FUNC_FAST(js_scene_Camera_screenToWorld)

static bool js_scene_Camera_worldToScreen(void *nativeObject) // NOLINT(readability-identifier-naming)
{
    auto *cobj = reinterpret_cast<cc::scene::Camera *>(nativeObject);
    cc::Vec3 ret = cobj->worldToScreen(tempFloatArray.readVec3());
    tempFloatArray.writeVec3(ret);
    return true;
}
SE_BIND_FUNC_FAST(js_scene_Camera_worldToScreen)

static bool js_scene_Camera_worldMatrixToScreen(void *nativeObject) // NOLINT(readability-identifier-naming)
{
    auto *cobj = reinterpret_cast<cc::scene::Camera *>(nativeObject);
    cc::Mat4 worldMatrix = tempFloatArray.readMat4();
    cc::Mat4 ret = cobj->worldMatrixToScreen(worldMatrix, static_cast<uint32_t>(tempFloatArray[16]), static_cast<uint32_t>(tempFloatArray[17]));
    tempFloatArray.writeMat4(ret);
    return true;
}
SE_BIND_FUNC_FAST(js_scene_Camera_worldMatrixToScreen)

static bool js_scene_Node_setTempFloatArray(se::State &s) // NOLINT(readability-identifier-naming)
{
    const auto &args = s.args();
    size_t argc = args.size();
    CC_UNUSED bool ok = true;
    if (argc == 1) {
        uint8_t *buffer = nullptr;
        args[0].toObject()->getArrayBufferData(&buffer, nullptr);
        tempFloatArray.setData(reinterpret_cast<float *>(buffer));
        return true;
    }
    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 1);
    return false;
}
SE_BIND_FUNC(js_scene_Node_setTempFloatArray)

#define FAST_GET_VALUE(ns, className, method, type)                   \
    static bool js_scene_##className##_##method(void *nativeObject) { \
        auto *cobj = reinterpret_cast<ns::className *>(nativeObject); \
        auto result = cobj->method();                                 \
        tempFloatArray.write##type(result);                           \
        return true;                                                  \
    }                                                                 \
    SE_BIND_FUNC_FAST(js_scene_##className##_##method)

#define FAST_GET_CONST_REF(ns, className, method, type)               \
    static bool js_scene_##className##_##method(void *nativeObject) { \
        auto *cobj = reinterpret_cast<ns::className *>(nativeObject); \
        const auto &result = cobj->method();                          \
        tempFloatArray.write##type(result);                           \
        return true;                                                  \
    }                                                                 \
    SE_BIND_FUNC_FAST(js_scene_##className##_##method)

FAST_GET_VALUE(cc, Node, getRight, Vec3)
FAST_GET_VALUE(cc, Node, getForward, Vec3)
FAST_GET_VALUE(cc, Node, getUp, Vec3)
FAST_GET_VALUE(cc, Node, getWorldRS, Mat4)
FAST_GET_VALUE(cc, Node, getWorldRT, Mat4)

FAST_GET_CONST_REF(cc, Node, getWorldPosition, Vec3)
FAST_GET_CONST_REF(cc, Node, getWorldRotation, Quaternion)
FAST_GET_CONST_REF(cc, Node, getWorldScale, Vec3)
FAST_GET_CONST_REF(cc, Node, getWorldMatrix, Mat4)
FAST_GET_CONST_REF(cc, Node, getEulerAngles, Vec3)

FAST_GET_CONST_REF(cc::scene, Camera, getMatView, Mat4)
FAST_GET_CONST_REF(cc::scene, Camera, getMatProj, Mat4)
FAST_GET_CONST_REF(cc::scene, Camera, getMatProjInv, Mat4)
FAST_GET_CONST_REF(cc::scene, Camera, getMatViewProj, Mat4)
FAST_GET_CONST_REF(cc::scene, Camera, getMatViewProjInv, Mat4)

static bool js_scene_Node_setPosition(void *s) // NOLINT(readability-identifier-naming)
{
    auto *cobj = reinterpret_cast<cc::Node *>(s);
    auto argc = static_cast<size_t>(tempFloatArray[0]);
    if (argc == 2) {
        cobj->setPositionInternal(tempFloatArray[1], tempFloatArray[2], true);
    } else {
        cobj->setPositionInternal(tempFloatArray[1], tempFloatArray[2], tempFloatArray[3], true);
    }
    return true;
}
SE_BIND_FUNC_FAST(js_scene_Node_setPosition)

static bool js_scene_Node_setRotation(void *s) // NOLINT(readability-identifier-naming)
{
    auto *cobj = reinterpret_cast<cc::Node *>(s);
    cobj->setRotationInternal(tempFloatArray[0], tempFloatArray[1], tempFloatArray[2], tempFloatArray[3], true);
    return true;
}
SE_BIND_FUNC_FAST(js_scene_Node_setRotation)

static bool js_scene_Node_setRotationFromEuler(void *s) // NOLINT(readability-identifier-naming)
{
    auto *cobj = reinterpret_cast<cc::Node *>(s);
    cobj->setRotationFromEuler(tempFloatArray[0], tempFloatArray[1], tempFloatArray[2]);
    return true;
}
SE_BIND_FUNC_FAST(js_scene_Node_setRotationFromEuler)

static bool js_scene_Node_setScale(void *s) // NOLINT(readability-identifier-naming)
{
    auto *cobj = reinterpret_cast<cc::Node *>(s);
    auto argc = static_cast<size_t>(tempFloatArray[0]);
    if (argc == 2) {
        cobj->setScaleInternal(tempFloatArray[1], tempFloatArray[2], true);

    } else {
        cobj->setScaleInternal(tempFloatArray[1], tempFloatArray[2], tempFloatArray[3], true);
    }
    return true;
}
SE_BIND_FUNC_FAST(js_scene_Node_setScale)

static bool js_scene_Node_setRTS(void *s) // NOLINT(readability-identifier-naming)
{
    auto *cobj = reinterpret_cast<cc::Node *>(s);
    cc::Quaternion qt;
    auto rotSize = static_cast<int32_t>(tempFloatArray[0]);
    if (rotSize > 0) {
        qt.set(tempFloatArray[1], tempFloatArray[2], tempFloatArray[3], tempFloatArray[4]);
    }

    auto posSize = static_cast<int32_t>(tempFloatArray[5]);
    cc::Vec3 pos;
    if (posSize > 0) {
        pos.set(tempFloatArray[6], tempFloatArray[7], tempFloatArray[8]);
    }

    auto scaleSize = static_cast<int32_t>(tempFloatArray[9]);
    cc::Vec3 scale;
    if (scaleSize > 0) {
        scale.set(tempFloatArray[10], tempFloatArray[11], tempFloatArray[12]);
    }
    cobj->setRTSInternal(rotSize > 0 ? &qt : nullptr, posSize > 0 ? &pos : nullptr, scaleSize > 0 ? &scale : nullptr, true);
    return true;
}
SE_BIND_FUNC_FAST(js_scene_Node_setRTS)

static bool js_scene_Node_rotateForJS(void *s) // NOLINT(readability-identifier-naming)
{
    auto *cobj = reinterpret_cast<cc::Node *>(s);
    auto argc = static_cast<size_t>(tempFloatArray[0]);
    if (argc == 4) {
        cobj->rotateForJS(tempFloatArray[1], tempFloatArray[2], tempFloatArray[3], tempFloatArray[4]);
    } else {
        auto size = static_cast<int32_t>(tempFloatArray[5]);
        cobj->rotateForJS(tempFloatArray[1], tempFloatArray[2], tempFloatArray[3], tempFloatArray[4], size == 0 ? cc::NodeSpace::LOCAL : static_cast<cc::NodeSpace>(static_cast<int>(std::roundf(tempFloatArray[5]))));
    }

    const auto &lrot = cobj->getRotation();
    tempFloatArray.writeQuaternion(lrot);
    return true;
}
SE_BIND_FUNC_FAST(js_scene_Node_rotateForJS)

static bool js_scene_Node_inverseTransformPoint(void *nativeObject) // NOLINT(readability-identifier-naming)
{
    auto *cobj = reinterpret_cast<cc::Node *>(nativeObject);
    auto p = cobj->inverseTransformPoint(tempFloatArray.readVec3());
    tempFloatArray.writeVec3(p);
    return true;
}
SE_BIND_FUNC_FAST(js_scene_Node_inverseTransformPoint)

static bool js_scene_Pass_blocks_getter(se::State &s) { // NOLINT(readability-identifier-naming)
    auto *cobj = SE_THIS_OBJECT<cc::scene::Pass>(s);
    SE_PRECONDITION2(cobj, false, "Invalid Native Object");
    auto *thiz = s.thisObject();

    se::Value blocksVal;
    if (thiz->getProperty("_blocks", &blocksVal, true) && blocksVal.isObject() && blocksVal.toObject()->isArray()) {
        s.rval() = blocksVal;
        return true;
    }

    const auto &blocks = cobj->getBlocks();
    const uint8_t *blockDataBase = cobj->getRootBlock()->getData();

    se::HandleObject jsBlocks{se::Object::createArrayObject(blocks.size())};
    int32_t i = 0;
    for (const auto &block : blocks) {
        se::HandleObject jsBlock{
            se::Object::createTypedArrayWithBuffer(
                se::Object::TypedArrayType::FLOAT32,
                cobj->getRootBlock()->getJSArrayBuffer(),
                reinterpret_cast<const uint8_t *>(block.data) - blockDataBase,
                block.count * 4)};
        jsBlocks->setArrayElement(i, se::Value(jsBlock));
        ++i;
    }
    thiz->setProperty("_blocks", se::Value(jsBlocks));
    s.rval().setObject(jsBlocks);
    return true;
}
SE_BIND_PROP_GET(js_scene_Pass_blocks_getter)

static bool js_scene_RenderScene_root_getter(se::State &s) { // NOLINT(readability-identifier-naming)
    nativevalue_to_se(cc::Root::getInstance(), s.rval());
    return true;
}
SE_BIND_PROP_GET(js_scene_RenderScene_root_getter)

static bool js_Model_setInstancedAttribute(se::State &s) // NOLINT(readability-identifier-naming)
{
    auto *cobj = SE_THIS_OBJECT<cc::scene::Model>(s);
    SE_PRECONDITION2(cobj, false, "Invalid Native Object");
    const auto &args = s.args();
    size_t argc = args.size();
    CC_UNUSED bool ok = true;
    if (argc == 2) {
        ccstd::string name;
        ok &= sevalue_to_native(args[0], &name, s.thisObject());
        SE_PRECONDITION2(ok, false, "Error processing arguments");

        const auto &val = args[1];
        if (val.isObject()) {
            if (val.toObject()->isArray()) {
                uint32_t len = 0;
                val.toObject()->getArrayLength(&len);

                se::Value dataVal;
                ccstd::array<float, 64> stackData;
                float *pData = nullptr;
                bool needFree = false;

                if (len <= static_cast<uint32_t>(stackData.size())) {
                    pData = stackData.data();
                } else {
                    pData = static_cast<float *>(CC_MALLOC(len));
                    needFree = true;
                }

                for (uint32_t i = 0; i < len; ++i) {
                    ok = val.toObject()->getArrayElement(i, &dataVal);
                    CC_ASSERT(ok && dataVal.isNumber());
                    pData[i] = dataVal.toFloat();
                }

                cobj->setInstancedAttribute(name, pData, len * sizeof(float));

                if (needFree) {
                    CC_FREE(pData);
                }
                return true;
            }

            if (val.toObject()->isTypedArray()) {
                se::Object::TypedArrayType type = val.toObject()->getTypedArrayType();
                switch (type) {
                    case se::Object::TypedArrayType::FLOAT32: {
                        uint8_t *data = nullptr;
                        size_t byteLength = 0;
                        if (val.toObject()->getTypedArrayData(&data, &byteLength) && data != nullptr && byteLength > 0) {
                            cobj->setInstancedAttribute(name, reinterpret_cast<const float *>(data), static_cast<uint32_t>(byteLength));
                        }
                    } break;

                    default:
                        // FIXME:
                        CC_ABORT();
                        break;
                }
                return true;
            }
        }

        SE_REPORT_ERROR("js_Model_setInstancedAttribute : Error processing arguments");
        return false;
    }
    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 0);
    return false;
}
SE_BIND_FUNC(js_Model_setInstancedAttribute)

static bool js_Model_registerListeners(se::State &s) // NOLINT(readability-identifier-naming)
{
    auto *cobj = SE_THIS_OBJECT<cc::scene::Model>(s);
    SE_PRECONDITION2(cobj, false, "Invalid Native Object");
    auto *thiz = s.thisObject();

#define MODEL_DISPATCH_EVENT_TO_JS(eventType, jsFuncName)                               \
    cobj->on<eventType>([=](cc::scene::Model * /*emitter*/, uint32_t stamp) {           \
        cobj->setCalledFromJS(true);                                                    \
        se::AutoHandleScope hs;                                                         \
        se::Value stampVal{stamp};                                                      \
        se::ScriptEngine::getInstance()->callFunction(thiz, #jsFuncName, 1, &stampVal); \
    })

    MODEL_DISPATCH_EVENT_TO_JS(cc::scene::Model::UpdateTransform, updateTransform);
    MODEL_DISPATCH_EVENT_TO_JS(cc::scene::Model::UpdateUBO, updateUBOs);

#undef MODEL_DISPATCH_EVENT_TO_JS

    cobj->on<cc::scene::Model::UpdateLocalDescriptors>(
        [=](cc::scene::Model * /*emitter*/, index_t subModelIndex, cc::gfx::DescriptorSet *descriptorSet) {
            cobj->setCalledFromJS(true);
            se::AutoHandleScope hs;

            ccstd::array<se::Value, 2> args;
            nativevalue_to_se(subModelIndex, args[0]);
            nativevalue_to_se(descriptorSet, args[1]);
            se::ScriptEngine::getInstance()->callFunction(thiz, "_updateLocalDescriptors", static_cast<uint32_t>(args.size()), args.data());
        });

    cobj->on<cc::scene::Model::UpdateLocalSHDescriptor>([=](cc::scene::Model * /*emitter*/, index_t subModelIndex, cc::gfx::DescriptorSet *descriptorSet) {
        cobj->setCalledFromJS(true);
        se::AutoHandleScope hs;

        ccstd::array<se::Value, 2> args;
        nativevalue_to_se(subModelIndex, args[0]);
        nativevalue_to_se(descriptorSet, args[1]);
        se::ScriptEngine::getInstance()->callFunction(thiz, "_updateLocalSHDescriptors", static_cast<uint32_t>(args.size()), args.data());
    });

    cobj->on<cc::scene::Model::UpdateWorldBound>([=](cc::scene::Model * /*emitter*/, index_t subModelIndex, cc::gfx::DescriptorSet *descriptorSet) {
        cobj->setCalledFromJS(true);
        se::AutoHandleScope hs;

        ccstd::array<se::Value, 2> args;
        nativevalue_to_se(subModelIndex, args[0]);
        nativevalue_to_se(descriptorSet, args[1]);
        se::ScriptEngine::getInstance()->callFunction(thiz, "_updateWorldBoundDescriptors", static_cast<uint32_t>(args.size()), args.data());
    });

    cobj->on<cc::scene::Model::UpdateInstancedAttributes>([=](cc::scene::Model * /*emitter*/, const ccstd::vector<cc::gfx::Attribute> &attributes, cc::scene::SubModel *subModel) {
        cobj->setCalledFromJS(true);
        se::AutoHandleScope hs;

        ccstd::array<se::Value, 2> args;
        nativevalue_to_se(attributes, args[0]);
        nativevalue_to_se(subModel, args[1]);
        se::ScriptEngine::getInstance()->callFunction(thiz, "_updateInstancedAttributes", static_cast<uint32_t>(args.size()), args.data());
    });

    cobj->on<cc::scene::Model::GetMacroPatches>(
        [=](cc::scene::Model * /*emitter*/, index_t subModelIndex, ccstd::vector<cc::scene::IMacroPatch> *pPatches) {
            cobj->setCalledFromJS(true);
            se::AutoHandleScope hs;

            se::Value rval;
            ccstd::array<se::Value, 1> args;
            nativevalue_to_se(subModelIndex, args[0]);
            bool ok = se::ScriptEngine::getInstance()->callFunction(thiz, "getMacroPatches", static_cast<uint32_t>(args.size()), args.data(), &rval);

            if (ok) {
                sevalue_to_native(rval, pPatches);
            }
        });

    return true;
}
SE_BIND_FUNC(js_Model_registerListeners) // NOLINT(readability-identifier-naming)

static bool js_assets_MaterialInstance_registerListeners(se::State &s) // NOLINT(readability-identifier-naming)
{
    auto *cobj = SE_THIS_OBJECT<cc::MaterialInstance>(s);
    SE_PRECONDITION2(cobj, false, "Invalid Native Object");
    cobj->setRebuildPSOCallback([](index_t /*index*/, cc::Material *material) {
        se::AutoHandleScope hs;
        se::Value matVal;
        bool ok = nativevalue_to_se(material, matVal);
        if (!ok) {
            return;
        }
        se::ScriptEngine::getInstance()->callFunction(matVal.toObject(), "_onRebuildPSO", 0, nullptr);
    });

    return true;
}
SE_BIND_FUNC(js_assets_MaterialInstance_registerListeners) // NOLINT(readability-identifier-naming)

bool register_all_scene_manual(se::Object *obj) // NOLINT(readability-identifier-naming)
{
    // Get the ns
    se::Value nsVal;
    if (!obj->getProperty("ns", &nsVal)) {
        se::HandleObject jsobj(se::Object::createPlainObject());
        nsVal.setObject(jsobj);
        obj->setProperty("ns", nsVal);
    }

    __jsb_cc_Root_proto->defineFunction("_registerListeners", _SE(js_root_registerListeners));

    __jsb_cc_scene_Camera_proto->defineFunction("screenPointToRay", _SE(js_scene_Camera_screenPointToRay));
    __jsb_cc_scene_Camera_proto->defineFunction("screenToWorld", _SE(js_scene_Camera_screenToWorld));
    __jsb_cc_scene_Camera_proto->defineFunction("worldToScreen", _SE(js_scene_Camera_worldToScreen));
    __jsb_cc_scene_Camera_proto->defineFunction("worldMatrixToScreen", _SE(js_scene_Camera_worldMatrixToScreen));

    __jsb_cc_scene_Camera_proto->defineFunction("getMatView", _SE(js_scene_Camera_getMatView));
    __jsb_cc_scene_Camera_proto->defineFunction("getMatProj", _SE(js_scene_Camera_getMatProj));
    __jsb_cc_scene_Camera_proto->defineFunction("getMatProjInv", _SE(js_scene_Camera_getMatProjInv));
    __jsb_cc_scene_Camera_proto->defineFunction("getMatViewProj", _SE(js_scene_Camera_getMatViewProj));
    __jsb_cc_scene_Camera_proto->defineFunction("getMatViewProjInv", _SE(js_scene_Camera_getMatViewProjInv));

    // Node TS wrapper will invoke this function to let native object listen some events.
    __jsb_cc_Node_proto->defineFunction("_initAndReturnSharedBuffer", _SE(js_cc_Node_initAndReturnSharedBuffer));

    __jsb_cc_Node_proto->defineFunction("_registerOnTransformChanged", _SE(js_scene_Node_registerOnTransformChanged));
    __jsb_cc_Node_proto->defineFunction("_registerOnParentChanged", _SE(js_scene_Node_registerOnParentChanged));
    __jsb_cc_Node_proto->defineFunction("_registerOnMobilityChanged", _SE(js_scene_Node_registerOnMobilityChanged));
    __jsb_cc_Node_proto->defineFunction("_registerOnLayerChanged", _SE(js_scene_Node_registerOnLayerChanged));
    __jsb_cc_Node_proto->defineFunction("_registerOnSiblingOrderChanged", _SE(js_scene_Node_registerOnSiblingOrderChanged));
    __jsb_cc_Node_proto->defineFunction("_registerOnLightProbeBakingChanged", _SE(js_scene_Node_registerOnLightProbeBakingChanged));

    se::Value jsbVal;
    obj->getProperty("jsb", &jsbVal);
    se::Value nodeVal;
    jsbVal.toObject()->getProperty("Node", &nodeVal);

    nodeVal.toObject()->defineFunction("_setTempFloatArray", _SE(js_scene_Node_setTempFloatArray));

    __jsb_cc_Node_proto->defineFunction("_setPosition", _SE(js_scene_Node_setPosition));
    __jsb_cc_Node_proto->defineFunction("_setScale", _SE(js_scene_Node_setScale));
    __jsb_cc_Node_proto->defineFunction("_setRotation", _SE(js_scene_Node_setRotation));
    __jsb_cc_Node_proto->defineFunction("_setRotationFromEuler", _SE(js_scene_Node_setRotationFromEuler));
    __jsb_cc_Node_proto->defineFunction("_rotateForJS", _SE(js_scene_Node_rotateForJS));

    __jsb_cc_Node_proto->defineFunction("_getEulerAngles", _SE(js_scene_Node_getEulerAngles));
    __jsb_cc_Node_proto->defineFunction("_getForward", _SE(js_scene_Node_getForward));
    __jsb_cc_Node_proto->defineFunction("_getUp", _SE(js_scene_Node_getUp));
    __jsb_cc_Node_proto->defineFunction("_getRight", _SE(js_scene_Node_getRight));

    __jsb_cc_Node_proto->defineFunction("_getWorldPosition", _SE(js_scene_Node_getWorldPosition));
    __jsb_cc_Node_proto->defineFunction("_getWorldRotation", _SE(js_scene_Node_getWorldRotation));
    __jsb_cc_Node_proto->defineFunction("_getWorldScale", _SE(js_scene_Node_getWorldScale));

    __jsb_cc_Node_proto->defineFunction("_getWorldMatrix", _SE(js_scene_Node_getWorldMatrix));
    __jsb_cc_Node_proto->defineFunction("_getWorldRS", _SE(js_scene_Node_getWorldRS));
    __jsb_cc_Node_proto->defineFunction("_getWorldRT", _SE(js_scene_Node_getWorldRT));

    __jsb_cc_Node_proto->defineFunction("_setRTS", _SE(js_scene_Node_setRTS));
    __jsb_cc_Node_proto->defineFunction("_inverseTransformPoint", _SE(js_scene_Node_inverseTransformPoint));

    __jsb_cc_scene_Pass_proto->defineProperty("blocks", _SE(js_scene_Pass_blocks_getter), nullptr);

    __jsb_cc_scene_RenderScene_proto->defineProperty("root", _SE(js_scene_RenderScene_root_getter), nullptr);

    __jsb_cc_scene_Model_proto->defineFunction("_setInstancedAttribute", _SE(js_Model_setInstancedAttribute));

    __jsb_cc_scene_Model_proto->defineFunction("_registerListeners", _SE(js_Model_registerListeners));
    __jsb_cc_MaterialInstance_proto->defineFunction("_registerListeners", _SE(js_assets_MaterialInstance_registerListeners));

    return true;
}
