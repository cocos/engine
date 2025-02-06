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

#include "core/scene-graph/Node.h"
#include "base/StringUtil.h"
#include "core/data/Object.h"
#include "core/memop/CachedArray.h"
#include "core/platform/Debug.h"
#include "core/scene-graph/NodeEnum.h"
#include "core/scene-graph/Scene.h"
#include "core/utils/IDGenerator.h"
#include "math/Utils.h"

namespace cc {

// static variables

uint32_t Node::clearFrame{0};
uint32_t Node::clearRound{1000};
const uint32_t Node::TRANSFORM_ON{1 << 0};
uint32_t Node::globalFlagChangeVersion{0};

namespace {
const ccstd::string EMPTY_NODE_NAME;
IDGenerator idGenerator("Node");
int skewCompCount = 0;
} // namespace

Node::Node() : Node(EMPTY_NODE_NAME) {
}

Node::Node(const ccstd::string &name) {
#define NODE_SHARED_MEMORY_BYTE_LENGTH (28)
    static_assert(offsetof(Node, _skewY) + sizeof(_skewY) - offsetof(Node, _eventMask) == NODE_SHARED_MEMORY_BYTE_LENGTH, "Wrong shared memory size");
    _sharedMemoryActor.initialize(&_eventMask, NODE_SHARED_MEMORY_BYTE_LENGTH);
#undef NODE_SHARED_MEMORY_BYTE_LENGTH

    _id = idGenerator.getNewId();
    if (name.empty()) {
        _name.append("New Node");
    } else {
        _name = name;
    }
    // _eventProcessor = ccnew NodeEventProcessor(this);
}

Node::~Node() {
    if (!_children.empty()) {
        // Reset children's _parent to nullptr to avoid dangerous pointer
        for (const auto &child : _children) {
            child->_parent = nullptr;
        }
    }
}

void Node::onBatchCreated(bool dontChildPrefab) {
    // onBatchCreated was implemented in TS, so code should never go here.
    CC_ABORT();
    emit<BatchCreated>(dontChildPrefab);
}

Node *Node::instantiate(Node *cloned, bool isSyncedNode) {
    if (!cloned) {
        CC_ABORT();
        // TODO(): cloned = legacyCC.instantiate._clone(this, this);
        return nullptr;
    }
    // TODO():
    // const newPrefabInfo = cloned._prefab;
    // if (EDITOR && newPrefabInfo) {
    //    if (cloned == = newPrefabInfo.root) {
    //        // newPrefabInfo.fileId = '';
    //    } else {
    //        // var PrefabUtils = Editor.require('scene://utils/prefab');
    //        // PrefabUtils.unlinkPrefab(cloned);
    //    }
    //}
    // if (EDITOR && legacyCC.GAME_VIEW) {
    //    const syncing = newPrefabInfo&& cloned == = newPrefabInfo.root && newPrefabInfo.sync;
    //    if (!syncing) {
    //        cloned._name += ' (Clone)';
    //    }
    //}
    cloned->_parent = nullptr;
    cloned->onBatchCreated(isSyncedNode);
    return cloned;
}

void Node::onHierarchyChangedBase(Node *oldParent) { // NOLINT(misc-unused-parameters)
    Node *newParent = _parent;
    auto *scene = dynamic_cast<Scene *>(newParent);
    if (isPersistNode() && scene == nullptr) {
        emit<RemovePersistRootNode>();
#if CC_EDITOR
        debug::warnID(1623);
#endif
    }
#if CC_EDITOR
    auto *curScene = getScene();
    const bool inCurrentSceneBefore = oldParent && oldParent->isChildOf(curScene);
    const bool inCurrentSceneNow = newParent && newParent->isChildOf(curScene);
    if (!inCurrentSceneBefore && inCurrentSceneNow) {
        // attached
        this->notifyEditorAttached(true);
    } else if (inCurrentSceneBefore && !inCurrentSceneNow) {
        // detached
        this->notifyEditorAttached(false);
    }
    // conflict detection
    // _Scene.DetectConflict.afterAddChild(this);
#endif

    bool shouldActiveNow = isActive() && !!(newParent && newParent->isActiveInHierarchy());
    if (isActiveInHierarchy() != shouldActiveNow) {
        // Director::getInstance()->getNodeActivator()->activateNode(this, shouldActiveNow); // TODO(xwx): use TS temporarily
        emit<ActiveNode>(shouldActiveNow);
    }
}

void Node::setActive(bool isActive) {
    uint8_t isActiveU8 = isActive ? 1 : 0;
    if (_active != isActiveU8) {
        _active = isActiveU8;
        Node *parent = _parent;
        if (parent) {
            bool couldActiveInScene = parent->isActiveInHierarchy();
            if (couldActiveInScene) {
                // Director::getInstance()->getNodeActivator()->activateNode(this, isActive); // TODO(xwx): use TS temporarily
                emit<ActiveNode>(isActive);
            }
        }
    }
}

void Node::setParent(Node *parent, bool isKeepWorld /* = false */) {
    if (isKeepWorld) {
        updateWorldTransform();
    }

    if (_parent == parent) {
        return;
    }

    Node *oldParent = _parent;
    Node *newParent = parent;
#if CC_DEBUG > 0
    if (oldParent && (oldParent->_objFlags & Flags::DEACTIVATING) == Flags::DEACTIVATING) {
        debug::errorID(3821);
    }
#endif
    _parent = newParent;
    _siblingIndex = 0;
    onSetParent(oldParent, isKeepWorld);
    emit<ParentChanged>(oldParent);
    if (oldParent) {
        if (!(oldParent->_objFlags & Flags::DESTROYING)) {
            index_t removeAt = getIdxOfChild(oldParent->_children, this);
            // TODO(): DEV
            /*if (DEV && removeAt < 0) {
                errorID(1633);
                return;
            }*/
            if (removeAt < 0) {
                return;
            }
            oldParent->_children.erase(oldParent->_children.begin() + removeAt);
            oldParent->updateSiblingIndex();
            oldParent->emit<ChildRemoved>(this);
        }
    }
    if (newParent) {
#if CC_DEBUG > 0
        if ((newParent->_objFlags & Flags::DEACTIVATING) == Flags::DEACTIVATING) {
            debug::errorID(3821);
        }
#endif
        newParent->_children.emplace_back(this);
        _siblingIndex = static_cast<index_t>(newParent->_children.size() - 1);
        newParent->emit<ChildAdded>(this);
    }
    onHierarchyChanged(oldParent);
}

void Node::walk(const WalkCallback &preFunc) {
    walk(preFunc, nullptr);
}

void Node::walk(const WalkCallback &preFunc, const WalkCallback &postFunc) { // NOLINT(misc-no-recursion)
    if (preFunc) {
        preFunc(this);
    }

    for (const auto &child : _children) {
        if (child) {
            child->walk(preFunc, postFunc);
        }
    }

    if (postFunc) {
        postFunc(this);
    }
}

// Component *Node::addComponent(Component *comp) {
//     comp->_node = this; // cjh TODO: shared_ptr
//     _components.emplace_back(comp);
//
//     if (isActiveInHierarchy()) {
//         NodeActivator::activateComp(comp);
//     }
//
//     return comp;
// }
//
// void Node::removeComponent(Component *comp) {
//     auto iteComp = std::find(_components.begin(), _components.end(), comp);
//     if (iteComp != _components.end()) {
//         _components.erase(iteComp);
//     }
// }

bool Node::onPreDestroyBase() {
    Flags destroyingFlag = Flags::DESTROYING;
    _objFlags |= destroyingFlag;
    bool destroyByParent = (!!_parent) && (!!(_parent->_objFlags & destroyingFlag));
#if CC_EDITOR
    if (!destroyByParent) {
        this->notifyEditorAttached(false);
    }
#endif
    if (isPersistNode()) {
        emit<RemovePersistRootNode>();
    }
    if (!destroyByParent) {
        if (_parent) {
            emit<ParentChanged>(this);
            index_t childIdx = getIdxOfChild(_parent->_children, this);
            if (childIdx != -1) {
                _parent->_children.erase(_parent->_children.begin() + childIdx);
            }
            _siblingIndex = 0;
            _parent->updateSiblingIndex();
            _parent->emit<ChildRemoved>(this);
        }
    }

    // NOTE: The following code is not needed now since we override Node._onPreDestroy in node.jsb.ts
    //  and the logic will be done in TS.
    //     emit(NodeEventType::NODE_DESTROYED, this);
    //     for (const auto &child : _children) {
    //         child->destroyImmediate();
    //     }
    //
    //     emit(EventTypesToJS::NODE_DESTROY_COMPONENTS);

    offAll();
    return destroyByParent;
}

Node *Node::getChildByName(const ccstd::string &name) const {
    if (name.empty()) {
        CC_LOG_INFO("Invalid name");
        return nullptr;
    }
    for (const auto &child : _children) {
        if (child->_name == name) {
            return child;
        }
    }
    return nullptr;
}

void Node::setScene(Node *node) {
    node->updateScene();
}

void Node::updateScene() {
    if (_parent == nullptr) {
        return;
    }
    _scene = _parent->_scene;
    emit<SceneUpdated>(_scene);
}

/* static */
index_t Node::getIdxOfChild(const ccstd::vector<IntrusivePtr<Node>> &child, Node *target) {
    auto iteChild = std::find(child.begin(), child.end(), target);
    if (iteChild != child.end()) {
        return static_cast<index_t>(iteChild - child.begin());
    }
    return CC_INVALID_INDEX;
}

Node *Node::getChildByUuid(const ccstd::string &uuid) const {
    if (uuid.empty()) {
        CC_LOG_INFO("Invalid uuid");
        return nullptr;
    }
    for (const auto &child : _children) {
        if (child->_id == uuid) {
            return child;
        }
    }
    return nullptr;
}

bool Node::isChildOf(Node *parent) const {
    const Node *child = this;
    do {
        if (child == parent) {
            return true;
        }
        child = child->_parent;
    } while (child);
    return false;
}

void Node::removeAllChildren() {
    for (auto i = static_cast<index_t>(_children.size() - 1); i >= 0; --i) {
        if (_children[i]) {
            _children[i]->setParent(nullptr);
        }
    }
    _children.clear();
}

void Node::setSiblingIndex(index_t index) {
    if (!_parent) {
        return;
    }
    if (!!(_parent->_objFlags & Flags::DEACTIVATING)) {
        debug::errorID(3821);
        return;
    }
    ccstd::vector<IntrusivePtr<Node>> &siblings = _parent->_children;
    index = index >= 0 ? index : static_cast<index_t>(siblings.size()) + index;
    index = index >= 0 ? index : 0;
    index_t oldIdx = getIdxOfChild(siblings, this);
    if (index != oldIdx) {
        if (oldIdx != CC_INVALID_INDEX) {
            siblings.erase(siblings.begin() + oldIdx);
        }
        if (index < siblings.size()) {
            siblings.insert(siblings.begin() + index, this);
        } else {
            siblings.emplace_back(this);
        }
        _parent->updateSiblingIndex();
        emit<SiblingIndexChanged>(index);
    }
}

Node *Node::getChildByPath(const ccstd::string &path) const {
    size_t end = 0;
    ccstd::vector<ccstd::string> segments = StringUtil::split(path, "/");
    auto *lastNode = const_cast<Node *>(this);
    for (const ccstd::string &segment : segments) {
        if (segment.empty()) {
            continue;
        }
        Node *next{nullptr};
        if (lastNode) {
            for (const auto &child : lastNode->_children) {
                if (child->_name == segment) {
                    next = child;
                    break;
                }
            }
            lastNode = next;
        } else {
            break;
        }
    }
    return lastNode;
}

//
void Node::setPositionInternal(float x, float y, float z, bool calledFromJS) {
    if (_localPosition.approxEquals({x, y, z})) {
        return;
    }

    _localPosition.set(x, y, z);
    invalidateChildren(TransformBit::POSITION);

    if (_eventMask & TRANSFORM_ON) {
        emit<TransformChanged>(TransformBit::POSITION);
    }

    if (!calledFromJS) {
        notifyLocalPositionUpdated();
    }
}

void Node::setRotationInternal(float x, float y, float z, float w, bool calledFromJS) {
    if (_localRotation.approxEquals({x, y, z, w})) {
        return;
    }

    _localRotation.set(x, y, z, w);
    _eulerDirty = true;

    invalidateChildren(TransformBit::ROTATION);

    if (_eventMask & TRANSFORM_ON) {
        emit<TransformChanged>(TransformBit::ROTATION);
    }

    if (!calledFromJS) {
        notifyLocalRotationUpdated();
    }
}

void Node::setRotationFromEuler(float x, float y, float z) {
    _euler.set(x, y, z);
    Quaternion::fromEuler(x, y, z, &_localRotation);
    _eulerDirty = false;
    invalidateChildren(TransformBit::ROTATION);
    if (_eventMask & TRANSFORM_ON) {
        emit<TransformChanged>(TransformBit::ROTATION);
    }

    notifyLocalRotationUpdated();
}

void Node::setScaleInternal(float x, float y, float z, bool calledFromJS) {
    if (_localScale.approxEquals({x, y, z})) {
        return;
    }

    _localScale.set(x, y, z);

    invalidateChildren(TransformBit::SCALE);
    if (_eventMask & TRANSFORM_ON) {
        emit<TransformChanged>(TransformBit::SCALE);
    }

    if (!calledFromJS) {
        notifyLocalScaleUpdated();
    }
}
void Node::updateWorldTransform() { // NOLINT(misc-no-recursion)
    uint32_t dirtyBits = 0;
    updateWorldTransformRecursive(dirtyBits);
}

void Node::updateLocalMatrixBySkew(Mat4 *outLocalMatrix) {
    if (_skewX == 0 && _skewY == 0) {
        return;
    }
    const float skewX = tanf(mathutils::toRadian(_skewX));
    const float skewY = tanf(mathutils::toRadian(_skewY));
    float *m = outLocalMatrix->m;
    const float a = m[0];
    const float b = m[1];
    const float c = m[4];
    const float d = m[5];
    m[0] = a + c * skewY;
    m[1] = b + d * skewY;
    m[4] = c + a * skewX;
    m[5] = d + b * skewX;
}

void Node::updateWorldTransformRecursive(uint32_t &dirtyBits) { // NOLINT(misc-no-recursion)
    const uint32_t currDirtyBits = _transformFlags;
    if (!currDirtyBits) {
        return;
    }

    Node *parent = getParent();
    if (parent && parent->_transformFlags) {
        parent->updateWorldTransformRecursive(dirtyBits);
    }
    dirtyBits |= currDirtyBits;
    bool positionDirty = dirtyBits & static_cast<uint32_t>(TransformBit::POSITION);
    bool rotationScaleSkewDirty = dirtyBits & static_cast<uint32_t>(TransformBit::RSS);
    bool foundSkewInAncestor = false;
    if (parent) {
        if (positionDirty && !rotationScaleSkewDirty) {
            _worldPosition.transformMat4(_localPosition, parent->_worldMatrix);
            _worldMatrix.m[12] = _worldPosition.x;
            _worldMatrix.m[13] = _worldPosition.y;
            _worldMatrix.m[14] = _worldPosition.z;
        }
        if (rotationScaleSkewDirty) {
            static Mat4 tempMat4;
            static Mat4 localMatrix;
            Mat4 *originalWorldMatrix = &_worldMatrix;
            Mat4::fromRTS(_localRotation, _localPosition, _localScale, &localMatrix);
            if (skewCompCount > 0) {
                foundSkewInAncestor = findSkewAndGetOriginalWorldMatrix(_parent, &tempMat4);
                if (_hasSkewComp || foundSkewInAncestor) {
                    // Save the original world matrix without skew side effect.
                    Mat4::multiply(tempMat4, localMatrix, &tempMat4);
                    originalWorldMatrix = &tempMat4;
                    
                    if (_hasSkewComp) {
                        updateLocalMatrixBySkew(&localMatrix);
                    }
                }
            }
            Mat4::multiply(parent->_worldMatrix, localMatrix, &_worldMatrix);
            const bool rotChanged = dirtyBits & static_cast<uint32_t>(TransformBit::ROTATION);
            Quaternion *rotTmp = rotChanged ? &_worldRotation : nullptr;
            Mat4::toRTS(*originalWorldMatrix, rotTmp, &_worldPosition, &_worldScale);
            if (skewCompCount > 0 && foundSkewInAncestor) {
                // NOTE: world position from Mat4.toSRT(originalWorldMatrix, ...) will not consider the skew factor.
                // So we need to update the world position manually here.
                Vec3::transformMat4(_localPosition, parent->_worldMatrix, &_worldPosition);
            }
        }
    } else {
        if (dirtyBits & static_cast<uint32_t>(TransformBit::POSITION)) {
            _worldPosition.set(_localPosition);
            _worldMatrix.m[12] = _worldPosition.x;
            _worldMatrix.m[13] = _worldPosition.y;
            _worldMatrix.m[14] = _worldPosition.z;
        }
        if (dirtyBits & static_cast<uint32_t>(TransformBit::RSS)) {
            if (dirtyBits & static_cast<uint32_t>(TransformBit::ROTATION)) {
                _worldRotation.set(_localRotation);
            }
            if (dirtyBits & static_cast<uint32_t>(TransformBit::SCALE)) {
                _worldScale.set(_localScale);
            }
            Mat4::fromRTS(_worldRotation, _worldPosition, _worldScale, &_worldMatrix);
            if (_hasSkewComp) {
                updateLocalMatrixBySkew(&_worldMatrix);
            }
        }
    }
    
    _transformFlags = (static_cast<uint32_t>(TransformBit::NONE));
}

const Mat4 &Node::getWorldMatrix() const { // NOLINT(misc-no-recursion)
    const_cast<Node *>(this)->updateWorldTransform();
    return _worldMatrix;
}

Mat4 Node::getWorldRS() {
    updateWorldTransform();
    Mat4 target{_worldMatrix};
    target.m[12] = target.m[13] = target.m[14] = 0;
    return target;
}

Mat4 Node::getWorldRT() {
    updateWorldTransform();
    Mat4 target;
    Mat4::fromRT(_worldRotation, _worldPosition, &target);
    return target;
}

void Node::invalidateChildren(TransformBit dirtyBit) { // NOLINT(misc-no-recursion)
    auto curDirtyBit{static_cast<uint32_t>(dirtyBit)};
    const uint32_t hasChangedFlags = getChangedFlags();
    const uint32_t transformFlags = _transformFlags;
    if (isValid() && (transformFlags & hasChangedFlags & curDirtyBit) != curDirtyBit) {
        _transformFlags = (transformFlags | curDirtyBit);
        setChangedFlags(hasChangedFlags | curDirtyBit);

        for (Node *child : getChildren()) {
            child->invalidateChildren(dirtyBit | TransformBit::POSITION);
        }
    }
}

void Node::setWorldPosition(float x, float y, float z) {
    bool forceUpdate = _parent != nullptr && (_transformFlags & static_cast<uint32_t>(TransformBit::POSITION)) != static_cast<uint32_t>(TransformBit::NONE);

    if (!forceUpdate && _worldPosition.approxEquals({x, y, z})) {
        return;
    }

    _worldPosition.set(x, y, z);
    if (_parent) {
        _parent->updateWorldTransform();
        Mat4 invertWMat{_parent->_worldMatrix};
        invertWMat.inverse();
        _localPosition.transformMat4(_worldPosition, invertWMat);
    } else {
        _localPosition.set(_worldPosition);
    }
    notifyLocalPositionUpdated();

    invalidateChildren(TransformBit::POSITION);

    if (_eventMask & TRANSFORM_ON) {
        emit<TransformChanged>(TransformBit::POSITION);
    }
}

const Vec3 &Node::getWorldPosition() const {
    const_cast<Node *>(this)->updateWorldTransform();
    return _worldPosition;
}

void Node::setWorldRotation(float x, float y, float z, float w) {
    bool forceUpdate = _parent != nullptr && (_transformFlags & static_cast<uint32_t>(TransformBit::ROTATION)) != static_cast<uint32_t>(TransformBit::NONE);

    if (!forceUpdate && _worldRotation.approxEquals({x, y, z, w})) {
        return;
    }

    _worldRotation.set(x, y, z, w);
    if (_parent) {
        _parent->updateWorldTransform();
        _localRotation.set(_parent->_worldRotation.getConjugated());
        _localRotation.multiply(_worldRotation);
    } else {
        _localRotation.set(_worldRotation);
    }

    _eulerDirty = true;

    notifyLocalRotationUpdated();

    invalidateChildren(TransformBit::ROTATION);

    if (_eventMask & TRANSFORM_ON) {
        emit<TransformChanged>(TransformBit::ROTATION);
    }
}

const Quaternion &Node::getWorldRotation() const { // NOLINT(misc-no-recursion)
    const_cast<Node *>(this)->updateWorldTransform();
    return _worldRotation;
}

void Node::setWorldScale(float x, float y, float z) {
    bool forceUpdate = _parent != nullptr && (_transformFlags & static_cast<uint32_t>(TransformBit::SCALE)) != static_cast<uint32_t>(TransformBit::NONE);

    if (!forceUpdate && _worldScale.approxEquals({x, y, z})) {
        return;
    }

    TransformBit rotationFlag = TransformBit::NONE;
    if (_parent != nullptr) {
        updateWorldTransform(); // ensure reentryability
        
        if (_hasSkewComp) {
            Mat4::fromRTS(_localRotation, _localPosition, _localScale, &_worldMatrix);
            Mat4::multiply(_parent->_worldMatrix, _worldMatrix, &_worldMatrix);
        }
        
        float *m = _worldMatrix.m;
        Vec3 oldWorldScale(Vec3(m[0], m[1], m[2]).length(),
                           Vec3(m[4], m[5], m[6]).length(),
                           Vec3(m[8], m[9], m[10]).length());
        
        _worldScale.set(x, y, z);
        Mat3 localRS;
        Mat3 localRotInv;
        Mat4 worldMatrixTmp = _worldMatrix;
        Vec3 rescaleFactor;
        
        if (oldWorldScale.x == 0) {
            oldWorldScale.x = 1;
            worldMatrixTmp.m[0] = 1.F;
            rotationFlag = TransformBit::ROTATION;
        }
        
        if (oldWorldScale.y == 0) {
            oldWorldScale.y = 1;
            worldMatrixTmp.m[5] = 1.F;
            rotationFlag = TransformBit::ROTATION;
        }
        
        if (oldWorldScale.z == 0) {
            oldWorldScale.z = 1;
            worldMatrixTmp.m[10] = 1.F;
            rotationFlag = TransformBit::ROTATION;
        }
        
        rescaleFactor = _worldScale / oldWorldScale;
        
        // apply new world scale to temp world matrix
        worldMatrixTmp.scale(rescaleFactor); // need opt
        // get temp local matrix
        Mat4 tmpLocalTransform = _parent->getWorldMatrix().getInversed() * worldMatrixTmp;
        // convert to Matrix 3 x 3
        Mat3::fromMat4(tmpLocalTransform, &localRS);
        Mat3::fromQuat(_localRotation.getConjugated(), &localRotInv);
        // remove rotation part of the local matrix
        Mat3::multiply(localRotInv, localRS, &localRS);

        // extract scaling part from local matrix
        _localScale.x = Vec3{localRS.m[0], localRS.m[1], localRS.m[2]}.length();
        _localScale.y = Vec3{localRS.m[3], localRS.m[4], localRS.m[5]}.length();
        _localScale.z = Vec3{localRS.m[6], localRS.m[7], localRS.m[8]}.length();
        
        if (_localScale.x == 0 || _localScale.y == 0 || _localScale.z == 0) {
            rotationFlag = TransformBit::ROTATION;
        }
    } else {
        _worldScale.set(x, y, z);
        _localScale = _worldScale;
    }

    notifyLocalScaleUpdated();

    invalidateChildren(TransformBit::SCALE | rotationFlag);
    if (_eventMask & TRANSFORM_ON) {
        emit<TransformChanged>(TransformBit::SCALE | rotationFlag);
    }
}

const Vec3 &Node::getWorldScale() const {
    const_cast<Node *>(this)->updateWorldTransform();
    return _worldScale;
}

void Node::setForward(const Vec3 &dir) {
    const float len = dir.length();
    Vec3 v3Temp = dir * (-1.F / len);
    Quaternion qTemp{Quaternion::identity()};
    Quaternion::fromViewUp(v3Temp, &qTemp);
    setWorldRotation(qTemp);
}

void Node::setAngle(float val) {
    if (_euler.approxEquals({0, 0, val})) {
        return;
    }

    _euler.set(0, 0, val);
    Quaternion::createFromAngleZ(val, &_localRotation);
    _eulerDirty = false;
    invalidateChildren(TransformBit::ROTATION);
    if (_eventMask & TRANSFORM_ON) {
        emit<TransformChanged>(TransformBit::ROTATION);
    }

    notifyLocalRotationUpdated();
}

/* static */
bool Node::findSkewAndGetOriginalWorldMatrix(Node *node, Mat4 *out) {
    if (!node) {
        return false;
    }
    static ccstd::vector<Node*> tempNodes;
    tempNodes.resize(0);
    auto &ancestors = tempNodes;
    Node *startNode = nullptr;
    for (auto *cur = node; cur; cur = cur->_parent) {
        ancestors.emplace_back(cur);
        if (cur->_hasSkewComp) {
            startNode = cur;
        }
    }

    bool ret = false;
    Mat4 curMat4;
    if (startNode) {
        out->set(startNode->_parent->_worldMatrix); // Set the first no-skew node's world matrix to out.
        auto iter = std::find(ancestors.begin(), ancestors.end(), startNode);
        long start = static_cast<long>(iter - ancestors.begin());
        for (long i = start; i >= 0; --i) {
            const auto *cur = ancestors[i];
            Mat4::fromRTS(cur->_localRotation, cur->_localPosition, cur->_localScale, &curMat4);
            Mat4::multiply(*out, curMat4, out);
        }
        ret = true;
    } else {
        out->set(node->_worldMatrix);
    }

    tempNodes.resize(0);
    return ret;
}

void Node::onSetParent(Node *oldParent, bool keepWorldTransform) {
    if (_parent) {
        if ((oldParent == nullptr || oldParent->_scene != _parent->_scene) && _parent->_scene != nullptr) {
            walk(setScene);
        }
    }

    if (keepWorldTransform) {
        if (_parent) {
            _parent->updateWorldTransform();
            if (mathutils::approx<float>(_parent->_worldMatrix.determinant(), 0.F, mathutils::EPSILON)) {
                CC_LOG_WARNING("14300");
                _transformFlags |= static_cast<uint32_t>(TransformBit::TRS);
                updateWorldTransform();
            } else {
                const bool hasSkew = skewCompCount > 0;
                const auto *newParentMatrix = &_parent->_worldMatrix;
                Mat4 localMatrix;
                Mat4 tempMatrix;

                if (hasSkew) {
                    if (oldParent) {
                        // Calculate old parent's world matrix without skew side effect.
                        const bool foundSkewInOldParent = Node::findSkewAndGetOriginalWorldMatrix(oldParent, &tempMatrix);
                        Mat4::fromRTS(_localRotation, _localPosition, _localScale, &localMatrix);
                        const Mat4 &oldParentMatrix = foundSkewInOldParent ? tempMatrix : oldParent->_worldMatrix;
                        // Calculate current node's world matrix without skew side effect.
                        Mat4::multiply(oldParentMatrix, localMatrix, &_worldMatrix);
                    }
                    
                    // Calculate new parent's world matrix without skew side effect.
                    const bool foundSkewInNewParent = Node::findSkewAndGetOriginalWorldMatrix(_parent, &tempMatrix);
                    if (foundSkewInNewParent) {
                        newParentMatrix = &tempMatrix;
                    }
                }
                
                // Calculate current node's new local transform
                localMatrix = newParentMatrix->getInversed() * _worldMatrix;
                Mat4::toRTS(localMatrix, &_localRotation, &_localPosition, &_localScale);
            }
        } else {
            _localPosition.set(_worldPosition);
            _localRotation.set(_worldRotation);
            _localScale.set(_worldScale);
        }

        notifyLocalPositionRotationScaleUpdated();
        _eulerDirty = true;
    }
    invalidateChildren(TransformBit::TRS);
}

void Node::rotate(const Quaternion &rot, NodeSpace ns /* = NodeSpace::LOCAL*/, bool calledFromJS /* = false*/) {
    Quaternion qTempA{rot};
    qTempA.normalize();
    if (ns == NodeSpace::LOCAL) {
        _localRotation *= qTempA;
    } else if (ns == NodeSpace::WORLD) {
        Quaternion qTempB{Quaternion::identity()};
        qTempB = qTempA * getWorldRotation();
        qTempA = _worldRotation;
        qTempA.inverse();
        qTempB = qTempA * qTempB;
        _localRotation = _localRotation * qTempB;
    }
    _eulerDirty = true;
    invalidateChildren(TransformBit::ROTATION);
    if (_eventMask & TRANSFORM_ON) {
        emit<TransformChanged>(TransformBit::ROTATION);
    }

    if (!calledFromJS) {
        notifyLocalRotationUpdated();
    }
}

void Node::lookAt(const Vec3 &pos, const Vec3 &up) {
    Vec3 vTemp = getWorldPosition();
    Quaternion qTemp{Quaternion::identity()};
    vTemp -= pos;
    vTemp.normalize();
    Quaternion::fromViewUp(vTemp, up, &qTemp);
    setWorldRotation(qTemp);
}

Vec3 Node::inverseTransformPoint(const Vec3 &p) { // NOLINT(misc-no-recursion)
    Vec3 out(p);
    inverseTransformPointRecursive(out);
    return out;
}

void Node::inverseTransformPointRecursive(Vec3 &out) const { // NOLINT(misc-no-recursion)
    auto *parent = getParent();
    if (!parent) {
        return;
    }
    parent->inverseTransformPointRecursive(out);
    Vec3::transformInverseRTS(out, getRotation(), getPosition(), getScale(), &out);
}

void Node::setMatrix(const Mat4 &val) {
    val.decompose(&_localScale, &_localRotation, &_localPosition);
    notifyLocalPositionRotationScaleUpdated();

    invalidateChildren(TransformBit::TRS);
    _eulerDirty = true;
    if (_eventMask & TRANSFORM_ON) {
        emit<TransformChanged>(TransformBit::TRS);
    }
}

void Node::setWorldRotationFromEuler(float x, float y, float z) {
    Quaternion tmpRotation;
    Quaternion::fromEuler(x, y, z, &tmpRotation);
    setWorldRotation(tmpRotation);
}

void Node::setRTSInternal(Quaternion *rot, Vec3 *pos, Vec3 *scale, bool calledFromJS) {
    uint32_t dirtyBit = 0;
    if (rot) {
        dirtyBit |= static_cast<uint32_t>(TransformBit::ROTATION);
        _localRotation = *rot;
        _eulerDirty = true;
    }
    if (pos) {
        _localPosition = *pos;
        dirtyBit |= static_cast<uint32_t>(TransformBit::POSITION);
    }
    if (scale) {
        _localScale = *scale;
        dirtyBit |= static_cast<uint32_t>(TransformBit::SCALE);
    }

    if (!calledFromJS) {
        notifyLocalPositionRotationScaleUpdated();
    }

    if (dirtyBit) {
        invalidateChildren(static_cast<TransformBit>(dirtyBit));
        if (_eventMask & TRANSFORM_ON) {
            emit<TransformChanged>(static_cast<TransformBit>(dirtyBit));
        }
    }
}

void Node::resetChangedFlags() {
    globalFlagChangeVersion++;
}

void Node::clearNodeArray() {
    if (clearFrame < clearRound) {
        clearFrame++;
    } else {
        clearFrame = 0;
    }
}

ccstd::string Node::getPathInHierarchy() const {
    ccstd::string result = getName();
    Node *curNode = getParent();
    while (curNode && curNode->getParent()) {
        result.insert(0, "/").insert(0, curNode->getName());
        curNode = curNode->getParent();
    }
    return result;
}

void Node::translate(const Vec3 &trans, NodeSpace ns) {
    Vec3 v3Temp{trans};
    if (ns == NodeSpace::LOCAL) {
        v3Temp.transformQuat(_localRotation);
        _localPosition.x += v3Temp.x;
        _localPosition.y += v3Temp.y;
        _localPosition.z += v3Temp.z;
    } else if (ns == NodeSpace::WORLD) {
        if (_parent) {
            Quaternion qTemp = _parent->getWorldRotation();
            qTemp.inverse();
            v3Temp.transformQuat(qTemp);
            Vec3 scale{_worldScale};
            _localPosition.x += v3Temp.x / scale.x;
            _localPosition.y += v3Temp.y / scale.y;
            _localPosition.z += v3Temp.z / scale.z;
        } else {
            _localPosition.x += trans.x;
            _localPosition.y += trans.y;
            _localPosition.z += trans.z;
        }
    }

    notifyLocalPositionUpdated();

    invalidateChildren(TransformBit::POSITION);
    if (_eventMask & TRANSFORM_ON) {
        emit<TransformChanged>(TransformBit::POSITION);
    }
}

bool Node::onPreDestroy() {
    bool result = onPreDestroyBase();
    // TODO(Lenovo): bookOfChange free
    return result;
}

void Node::onHierarchyChanged(Node *oldParent) {
    emit<Reattach>();
    onHierarchyChangedBase(oldParent);
}

/* static */
// Node *Node::find(const ccstd::string &path, Node *referenceNode /* = nullptr*/) {
//     return cc::find(path, referenceNode);
// }

// For deserialization
// void Node::_setChild(index_t i, Node *child) {
//    if (i < _children.size()) {
//        _children[i] = child;
//    } else {
//        CC_LOG_ERROR("Invalid index (%d) for Node children (size: %u)", i, static_cast<uint32_t>(_children.size()));
//    }
//}
//
// Node *Node::_getChild(index_t i) {
//    if (i < _children.size()) {
//        return _children[i];
//    }
//    CC_LOG_ERROR("Invalid index (%d) for Node children (size: %u)", i, static_cast<uint32_t>(_children.size()));
//    return nullptr;
//}
//
// void Node::_setChildrenSize(uint32_t size) {
//    _children.resize(size);
//}
//
// uint32_t Node::_getChildrenSize() {
//    return _children.size();
//}
//
void Node::_setChildren(ccstd::vector<IntrusivePtr<Node>> &&children) {
    _children = std::move(children);
}

void Node::destruct() {
    CCObject::destruct();
    _children.clear();
    _scene = nullptr;
    _userData = nullptr;
}

//
void Node::_incSkewCompCount() {
    ++skewCompCount;
}

void Node::_decSkewCompCount() {
    --skewCompCount;
}

} // namespace cc
