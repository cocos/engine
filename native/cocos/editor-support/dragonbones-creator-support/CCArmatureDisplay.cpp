/****************************************************************************
 Copyright (c) 2012-2020 DragonBones team and other contributors
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

#include "dragonbones-creator-support/CCArmatureDisplay.h"
#include "2d/renderer/RenderDrawInfo.h"
#include "2d/renderer/RenderEntity.h"
#include "MiddlewareMacro.h"
#include "SharedBufferManager.h"
#include "base/DeferredReleasePool.h"
#include "base/TypeDef.h"
#include "base/memory/Memory.h"
#include "dragonbones-creator-support/CCSlot.h"
#include "gfx-base/GFXDef.h"
#include "math/Math.h"
#include "math/Vec3.h"
#include "renderer/core/MaterialInstance.h"

USING_NS_MW;        // NOLINT(google-build-using-namespace)
using namespace cc; // NOLINT(google-build-using-namespace)

static const std::string TECH_STAGE = "opaque";
static const std::string TEXTURE_KEY = "texture";
namespace cc {

}
DRAGONBONES_NAMESPACE_BEGIN

CCArmatureDisplay *CCArmatureDisplay::create() {
    return new (std::nothrow) CCArmatureDisplay();
}

CCArmatureDisplay::CCArmatureDisplay() {
    _sharedBufferOffset = new IOTypedArray(se::Object::TypedArrayType::UINT32, sizeof(uint32_t) * 2);
}

CCArmatureDisplay::~CCArmatureDisplay() {
    dispose();

    if (_debugBuffer) {
        delete _debugBuffer;
        _debugBuffer = nullptr;
    }

    if (_sharedBufferOffset) {
        delete _sharedBufferOffset;
        _sharedBufferOffset = nullptr;
    }
    for (auto *draw : _drawInfoArray) {
        CC_SAFE_DELETE(draw);
    }

    for (auto &item : _materialCaches) {
        CC_SAFE_DELETE(item.second);
    }
}

void CCArmatureDisplay::dispose() {
    if (_armature != nullptr) {
        _armature->dispose();
        _armature = nullptr;
    }
}

void CCArmatureDisplay::dbInit(Armature *armature) {
    _armature = armature;
}

void CCArmatureDisplay::dbClear() {
    _armature = nullptr;
    release();
}

void CCArmatureDisplay::dbUpdate() {}

void CCArmatureDisplay::dbRender() {
    _sharedBufferOffset->reset();
    _sharedBufferOffset->clear();

    if (this->_armature->getParent()) {
        return;
    }
    if (!_entity) {
        return;
    }
    auto *entity = _entity;
    entity->clearDynamicRenderDrawInfos();

    auto *mgr = MiddlewareManager::getInstance();

    auto *attachMgr = mgr->getAttachInfoMgr();
    auto *attachInfo = attachMgr->getBuffer();
    if (!attachInfo) return;

    // store attach info offset
    _sharedBufferOffset->writeUint32(static_cast<uint32_t>(attachInfo->getCurPos()) / sizeof(uint32_t));

    _preBlendMode = -1;
    _preISegWritePos = -1;
    _curISegLen = 0;

    _debugSlotsLen = 0;
    _materialLen = 0;
    _preTexture = nullptr;
    _curTexture = nullptr;
    _curDrawInfo = nullptr;

    // Traverse all aramture to fill vertex and index buffer.
    traverseArmature(_armature);

    if (_curDrawInfo) _curDrawInfo->setIbCount(_curISegLen);

    if (_useAttach || _debugDraw) {
        const auto &bones = _armature->getBones();
        std::size_t count = bones.size();

        cc::Mat4 boneMat = cc::Mat4::IDENTITY;

        if (_debugDraw) {
            // If enable debug draw,then init debug buffer.
            if (_debugBuffer == nullptr) {
                _debugBuffer = new IOTypedArray(se::Object::TypedArrayType::FLOAT32, MAX_DEBUG_BUFFER_SIZE);
            }
            _debugBuffer->reset();
            _debugBuffer->writeFloat32(static_cast<float>(count) * 4);
        }

        for (int i = 0; i < count; i++) {
            Bone *bone = static_cast<Bone *>(bones[i]);

            float boneLen = 5;
            if (bone->_boneData->length > boneLen) {
                boneLen = bone->_boneData->length;
            }

            boneMat.m[0] = bone->globalTransformMatrix.a;
            boneMat.m[1] = bone->globalTransformMatrix.b;
            boneMat.m[4] = -bone->globalTransformMatrix.c;
            boneMat.m[5] = -bone->globalTransformMatrix.d;
            boneMat.m[12] = bone->globalTransformMatrix.tx;
            boneMat.m[13] = bone->globalTransformMatrix.ty;
            attachInfo->checkSpace(sizeof(boneMat), true);
            attachInfo->writeBytes(reinterpret_cast<const char *>(&boneMat), sizeof(boneMat));

            if (_debugDraw) {
                float bx = bone->globalTransformMatrix.tx;
                float by = bone->globalTransformMatrix.ty;
                float endx = bx + bone->globalTransformMatrix.a * boneLen;
                float endy = by + bone->globalTransformMatrix.b * boneLen;
                _debugBuffer->writeFloat32(bx);
                _debugBuffer->writeFloat32(by);
                _debugBuffer->writeFloat32(endx);
                _debugBuffer->writeFloat32(endy);
            }
        }

        if (_debugBuffer && _debugBuffer->isOutRange()) {
            _debugBuffer->writeFloat32(0, 0);
            CC_LOG_INFO("Dragonbones debug data is too large,debug buffer has no space to put in it!!!!!!!!!!");
            CC_LOG_INFO("You can adjust MAX_DEBUG_BUFFER_SIZE in MiddlewareMacro");
        }
    }
}

const cc::Vec2 &CCArmatureDisplay::convertToRootSpace(float x, float y) const {
    auto *slot = reinterpret_cast<CCSlot *>(_armature->getParent());
    if (!slot) {
        _tmpVec2.set(x, y);
        return _tmpVec2;
    }

    slot->updateWorldMatrix();
    cc::Mat4 &worldMatrix = slot->worldMatrix;
    _tmpVec2.x = x * worldMatrix.m[0] + y * worldMatrix.m[4] + worldMatrix.m[12];
    _tmpVec2.y = x * worldMatrix.m[1] + y * worldMatrix.m[5] + worldMatrix.m[13];
    return _tmpVec2;
}

CCArmatureDisplay *CCArmatureDisplay::getRootDisplay() {
    Slot *slot = _armature->getParent();
    if (!slot) {
        return this;
    }

    Slot *parentSlot = slot->_armature->getParent();
    while (parentSlot) {
        slot = parentSlot;
        parentSlot = parentSlot->_armature->getParent();
    }
    return static_cast<CCArmatureDisplay *>(slot->_armature->getDisplay());
}

void CCArmatureDisplay::traverseArmature(Armature *armature, float parentOpacity) {
    static cc::Mat4 matrixTemp;
    auto &nodeWorldMat = _entity->getNode()->getWorldMatrix();

    // data store in buffer which 0 to 3 is render order, left data is node world matrix
    const auto &slots = armature->getSlots();
    auto *mgr = MiddlewareManager::getInstance();

    middleware::MeshBuffer *mb = mgr->getMeshBuffer(VF_XYZUVC);
    IOBuffer &vb = mb->getVB();
    IOBuffer &ib = mb->getIB();

    float realOpacity = _nodeColor.a;

    auto *attachMgr = mgr->getAttachInfoMgr();
    auto *attachInfo = attachMgr->getBuffer();
    if (!attachInfo) return;

    // range [0.0, 255.0]
    Color4B color(0, 0, 0, 0);
    CCSlot *slot = nullptr;
    int isFull = 0;

    auto flush = [&]() {
        // fill pre segment count field
        if (_curDrawInfo) _curDrawInfo->setIbCount(_curISegLen);

        _curDrawInfo = requestDrawInfo(_materialLen);
        _entity->addDynamicRenderDrawInfo(_curDrawInfo);
        // prepare to fill new segment field
        switch (slot->_blendMode) {
            case BlendMode::Add:
                _curBlendSrc = static_cast<int>(_premultipliedAlpha ? gfx::BlendFactor::ONE : gfx::BlendFactor::SRC_ALPHA);
                _curBlendDst = static_cast<int>(gfx::BlendFactor::ONE);
                break;
            case BlendMode::Multiply:
                _curBlendSrc = static_cast<int>(gfx::BlendFactor::DST_COLOR);
                _curBlendDst = static_cast<int>(gfx::BlendFactor::ONE_MINUS_SRC_ALPHA);
                break;
            case BlendMode::Screen:
                _curBlendSrc = static_cast<int>(gfx::BlendFactor::ONE);
                _curBlendDst = static_cast<int>(gfx::BlendFactor::ONE_MINUS_SRC_COLOR);
                break;
            default:
                _curBlendSrc = static_cast<int>(_premultipliedAlpha ? gfx::BlendFactor::ONE : gfx::BlendFactor::SRC_ALPHA);
                _curBlendDst = static_cast<int>(gfx::BlendFactor::ONE_MINUS_SRC_ALPHA);
                break;
        }

        auto *material = requestMaterial(_curBlendSrc, _curBlendDst);
        _curDrawInfo->setMaterial(material);
        gfx::Texture *texture = _curTexture->getGFXTexture();
        gfx::Sampler *sampler = _curTexture->getGFXSampler();
        _curDrawInfo->setTexture(texture);
        _curDrawInfo->setSampler(sampler);
        UIMeshBuffer *uiMeshBuffer = mb->getUIMeshBuffer();
        _curDrawInfo->setMeshBuffer(uiMeshBuffer);
        _curDrawInfo->setIndexOffset(static_cast<uint32_t>(ib.getCurPos()) / sizeof(uint16_t));

        // reset pre blend mode to current
        _preBlendMode = static_cast<int>(slot->_blendMode);
        // reset pre texture index to current
        _preTexture = _curTexture;

        // reset index segmentation count
        _curISegLen = 0;
        // material length increased
        _materialLen++;
    };

    for (auto *i : slots) {
        isFull = 0;
        slot = dynamic_cast<CCSlot *>(i); //TODO(zhakasi): refine the logic
        if (slot == nullptr) {
            return;
        }
        if (!slot->getVisible()) {
            continue;
        }

        slot->updateWorldMatrix();

        // If slots has child armature,will traverse child first.
        Armature *childArmature = slot->getChildArmature();
        if (childArmature != nullptr) {
            traverseArmature(childArmature, parentOpacity * static_cast<float>(slot->color.a) / 255.0F);
            continue;
        }

        if (!slot->getTexture()) continue;
        _curTexture = static_cast<cc::Texture2D *>(slot->getTexture()->getRealTexture());
        auto vbSize = slot->triangles.vertCount * sizeof(middleware::V3F_T2F_C4B);
        isFull |= vb.checkSpace(vbSize, true);

        // If texture or blendMode change,will change material.
        if (_preTexture != _curTexture || _preBlendMode != static_cast<int>(slot->_blendMode) || isFull) {
            flush();
        }

        // Calculation vertex color.
        color.a = (uint8_t)(realOpacity * static_cast<float>(slot->color.a) * parentOpacity);
        float multiplier = _premultipliedAlpha ? color.a / 255.0F : 1.0F;
        color.r = _nodeColor.r * slot->color.r * multiplier;
        color.g = _nodeColor.g * slot->color.g * multiplier;
        color.b = _nodeColor.b * slot->color.b * multiplier;

        // Transform component matrix to global matrix
        middleware::Triangles &triangles = slot->triangles;
        cc::Mat4 *worldMatrix = &slot->worldMatrix;
        cc::Mat4::multiply(nodeWorldMat, *worldMatrix, &matrixTemp);
        worldMatrix = &matrixTemp;

        middleware::V3F_T2F_C4B *worldTriangles = slot->worldVerts;

        for (int v = 0, w = 0, vn = triangles.vertCount; v < vn; ++v, w += 2) {
            middleware::V3F_T2F_C4B *vertex = triangles.verts + v;
            middleware::V3F_T2F_C4B *worldVertex = worldTriangles + v;

            vertex->vertex.z = 0; //reset for z value
            worldVertex->vertex.transformMat4(vertex->vertex, *worldMatrix);

            worldVertex->color = color;
        }

        // Fill MiddlewareManager vertex buffer
        auto vertexOffset = vb.getCurPos() / sizeof(middleware::V3F_T2F_C4B);
        vb.writeBytes(reinterpret_cast<char *>(worldTriangles), vbSize);

        auto ibSize = triangles.indexCount * sizeof(uint16_t);
        ib.checkSpace(ibSize, true);
        // If vertex buffer current offset is zero,fill it directly or recalculate vertex offset.
        if (vertexOffset > 0) {
            for (int ii = 0, nn = triangles.indexCount; ii < nn; ii++) {
                ib.writeUint16(triangles.indices[ii] + vertexOffset);
            }
        } else {
            ib.writeBytes(reinterpret_cast<char *>(triangles.indices), ibSize);
        }

        // Record this turn index segmentation count,it will store in material buffer in the end.
        _curISegLen += triangles.indexCount;
    }
}

bool CCArmatureDisplay::hasDBEventListener(const std::string &type) const {
    auto it = _listenerIDMap.find(type);
    return it != _listenerIDMap.end();
}

void CCArmatureDisplay::addDBEventListener(const std::string &type, const std::function<void(EventObject *)> & /*listener*/) {
    _listenerIDMap[type] = true;
}

void CCArmatureDisplay::dispatchDBEvent(const std::string &type, EventObject *value) {
    auto it = _listenerIDMap.find(type);
    if (it == _listenerIDMap.end()) {
        return;
    }

    if (_dbEventCallback) {
        _dbEventCallback(value);
    }
}

void CCArmatureDisplay::removeDBEventListener(const std::string &type, const std::function<void(EventObject *)> & /*listener*/) {
    auto it = _listenerIDMap.find(type);
    if (it != _listenerIDMap.end()) {
        _listenerIDMap.erase(it);
    }
}

se_object_ptr CCArmatureDisplay::getDebugData() const {
    if (_debugBuffer) {
        return _debugBuffer->getTypeArray();
    }
    return nullptr;
}

void CCArmatureDisplay::setColor(float r, float g, float b, float a) {
    _nodeColor.r = r / 255.0F;
    _nodeColor.g = g / 255.0F;
    _nodeColor.b = b / 255.0F;
    _nodeColor.a = a / 255.0F;
}

se_object_ptr CCArmatureDisplay::getSharedBufferOffset() const {
    if (_sharedBufferOffset) {
        return _sharedBufferOffset->getTypeArray();
    }
    return nullptr;
}

void CCArmatureDisplay::setBatchEnabled(bool enabled) {
    if (enabled != _enableBatch) {
        _needClearMaterialCaches = true;
        _enableBatch = enabled;
    }
}

void CCArmatureDisplay::setRenderEntity(cc::RenderEntity *entity) {
    _entity = entity;
}

void CCArmatureDisplay::setMaterial(cc::Material *material) {
    _material = material;
    _needClearMaterialCaches = true;
}

cc::RenderDrawInfo *CCArmatureDisplay::requestDrawInfo(int idx) {
    if (_drawInfoArray.size() < idx + 1) {
        cc::RenderDrawInfo *draw = new cc::RenderDrawInfo();
        draw->setDrawInfoType(static_cast<uint32_t>(RenderDrawInfoType::MIDDLEWARE));
        _drawInfoArray.push_back(draw);
    }
    return _drawInfoArray[idx];
}

cc::Material *CCArmatureDisplay::requestMaterial(uint16_t blendSrc, uint16_t blendDst) {
    if (_needClearMaterialCaches) {
        _needClearMaterialCaches = false;
        for (auto &item : _materialCaches) {
            CC_SAFE_DELETE(item.second);
        }
        _materialCaches.clear();
    }
    uint32_t key = static_cast<uint32_t>(blendSrc) << 16 | static_cast<uint32_t>(blendDst);
    if (_materialCaches.find(key) == _materialCaches.end()) {
        const IMaterialInstanceInfo info{
            (Material *)_material,
            0};
        MaterialInstance *materialInstance = new MaterialInstance(info);
        PassOverrides overrides;
        BlendStateInfo stateInfo;
        stateInfo.blendColor = gfx::Color{1.0F, 1.0F, 1.0F, 1.0F};
        BlendTargetInfo targetInfo;
        targetInfo.blendEq = gfx::BlendOp::ADD;
        targetInfo.blendAlphaEq = gfx::BlendOp::ADD;
        targetInfo.blendSrc = (gfx::BlendFactor)blendSrc;
        targetInfo.blendDst = (gfx::BlendFactor)blendDst;
        targetInfo.blendSrcAlpha = (gfx::BlendFactor)blendSrc;
        targetInfo.blendDstAlpha = (gfx::BlendFactor)blendDst;
        BlendTargetInfoList targetList{targetInfo};
        stateInfo.targets = targetList;
        overrides.blendState = stateInfo;
        materialInstance->overridePipelineStates(overrides);
        const MacroRecord macros{{"USE_LOCAL", false}};
        materialInstance->recompileShaders(macros);
        _materialCaches[key] = materialInstance;
    }
    return _materialCaches[key];
}

DRAGONBONES_NAMESPACE_END
