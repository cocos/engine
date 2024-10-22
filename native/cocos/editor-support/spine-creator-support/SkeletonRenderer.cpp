/******************************************************************************
 * Spine Runtimes License Agreement
 * Last updated January 1, 2020. Replaces all prior versions.
 *
 * Copyright (c) 2013-2020, Esoteric Software LLC
 *
 * Integration of the Spine Runtimes into software or otherwise creating
 * derivative works of the Spine Runtimes is permitted under the terms and
 * conditions of Section 2 of the Spine Editor License Agreement:
 * http://esotericsoftware.com/spine-editor-license
 *
 * Otherwise, it is permitted to integrate the Spine Runtimes into software
 * or otherwise create derivative works of the Spine Runtimes (collectively,
 * "Products"), provided that each user of the Products must obtain their own
 * Spine Editor license and redistribution of the Products in any form must
 * include this license and copyright notice.
 *
 * THE SPINE RUNTIMES ARE PROVIDED BY ESOTERIC SOFTWARE LLC "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL ESOTERIC SOFTWARE LLC BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES,
 * BUSINESS INTERRUPTION, OR LOSS OF USE, DATA, OR PROFITS) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THE SPINE RUNTIMES, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *****************************************************************************/

#include "spine-creator-support/SkeletonRenderer.h"
#include <algorithm>
#include "2d/renderer/RenderDrawInfo.h"
#include "2d/renderer/RenderEntity.h"
#include "MiddlewareMacro.h"
#include "SharedBufferManager.h"
#include "SkeletonDataMgr.h"
#include "base/DeferredReleasePool.h"
#include "base/TypeDef.h"
#include "base/memory/Memory.h"
#include "gfx-base/GFXDef.h"
#include "math/Math.h"
#include "math/Vec3.h"
#include "renderer/core/MaterialInstance.h"
#include "spine-creator-support/AttachmentVertices.h"
#include "spine-creator-support/spine-cocos2dx.h"

USING_NS_MW;             // NOLINT(google-build-using-namespace)
using namespace spine;   // NOLINT(google-build-using-namespace)
using namespace cc;      // NOLINT(google-build-using-namespace)
using namespace cc::gfx; // NOLINT(google-build-using-namespace)

using std::max;
using std::min;

static const std::string TECH_STAGE = "opaque";
static const std::string TEXTURE_KEY = "texture";

static spine::Cocos2dTextureLoader textureLoader;
static std::vector<middleware::Texture2D *> _slotTextureSet{};

enum DebugType {
    NONE = 0,
    SLOTS,
    MESH,
    BONES
};
SkeletonRenderer *SkeletonRenderer::create() {
    return new SkeletonRenderer();
}

SkeletonRenderer *SkeletonRenderer::createWithSkeleton(Skeleton *skeleton, bool ownsSkeleton, bool ownsSkeletonData) {
    return new SkeletonRenderer(skeleton, ownsSkeleton, ownsSkeletonData);
}

SkeletonRenderer *SkeletonRenderer::createWithData(SkeletonData *skeletonData, bool ownsSkeletonData) {
    return new SkeletonRenderer(skeletonData, ownsSkeletonData);
}

SkeletonRenderer *SkeletonRenderer::createWithFile(const std::string &skeletonDataFile, const std::string &atlasFile, float scale) {
    return new SkeletonRenderer(skeletonDataFile, atlasFile, scale);
}

void SkeletonRenderer::initialize() {
    if (_clipper == nullptr) {
        _clipper = new (__FILE__, __LINE__) SkeletonClipping();
    }

    if (_sharedBufferOffset == nullptr) {
        // store global TypedArray begin and end offset
        _sharedBufferOffset = new cc::middleware::IOTypedArray(se::Object::TypedArrayType::UINT32, sizeof(uint32_t) * 2);
    }

    _skeleton->setToSetupPose();
    _skeleton->updateWorldTransform();
}

void SkeletonRenderer::beginSchedule() {
    MiddlewareManager::getInstance()->addTimer(this);
}

void SkeletonRenderer::onEnable() {
    beginSchedule();
}

void SkeletonRenderer::onDisable() {
    stopSchedule();
}

void SkeletonRenderer::stopSchedule() {
    MiddlewareManager::getInstance()->removeTimer(this);
    if (_sharedBufferOffset) {
        _sharedBufferOffset->reset();
        _sharedBufferOffset->clear();
    }
    if (_debugBuffer) {
        _debugBuffer->reset();
        _debugBuffer->clear();
    }
}

void SkeletonRenderer::setSkeletonData(SkeletonData *skeletonData, bool ownsSkeletonData) {
    _skeleton = new (__FILE__, __LINE__) Skeleton(skeletonData);
    _ownsSkeletonData = ownsSkeletonData;
}

SkeletonRenderer::SkeletonRenderer() = default;

SkeletonRenderer::SkeletonRenderer(Skeleton *skeleton, bool ownsSkeleton, bool ownsSkeletonData, bool ownsAtlas) {
    initWithSkeleton(skeleton, ownsSkeleton, ownsSkeletonData, ownsAtlas);
}

SkeletonRenderer::SkeletonRenderer(SkeletonData *skeletonData, bool ownsSkeletonData) {
    initWithData(skeletonData, ownsSkeletonData);
}

SkeletonRenderer::SkeletonRenderer(const std::string &skeletonDataFile, const std::string &atlasFile, float scale) {
    initWithJsonFile(skeletonDataFile, atlasFile, scale);
}

SkeletonRenderer::~SkeletonRenderer() {
    CC_SAFE_RELEASE(_effectDelegate);
    if (_ownsSkeletonData) delete _skeleton->getData();
    if (_ownsSkeleton) delete _skeleton;
    if (_ownsAtlas && _atlas) delete _atlas;
    delete _attachmentLoader;
    delete _clipper;

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

    stopSchedule();
}

void SkeletonRenderer::initWithUUID(const std::string &uuid) {
    _ownsSkeleton = true;
    _uuid = uuid;
    SkeletonData *skeletonData = SkeletonDataMgr::getInstance()->retainByUUID(uuid);
    CC_ASSERT(skeletonData);

    setSkeletonData(skeletonData, false);
    initialize();
}

void SkeletonRenderer::initWithSkeleton(Skeleton *skeleton, bool ownsSkeleton, bool ownsSkeletonData, bool ownsAtlas) {
    _skeleton = skeleton;
    _ownsSkeleton = ownsSkeleton;
    _ownsSkeletonData = ownsSkeletonData;
    _ownsAtlas = ownsAtlas;

    initialize();
}

void SkeletonRenderer::initWithData(SkeletonData *skeletonData, bool ownsSkeletonData) {
    _ownsSkeleton = true;
    setSkeletonData(skeletonData, ownsSkeletonData);
    initialize();
}

void SkeletonRenderer::initWithJsonFile(const std::string &skeletonDataFile, Atlas *atlas, float scale) {
    _atlas = atlas;
    _attachmentLoader = new (__FILE__, __LINE__) Cocos2dAtlasAttachmentLoader(_atlas);

    SkeletonJson json(_attachmentLoader);
    json.setScale(scale);
    SkeletonData *skeletonData = json.readSkeletonDataFile(skeletonDataFile.c_str());
    CC_ASSERT(skeletonData); // Can use json.getError() to get error message.

    _ownsSkeleton = true;
    setSkeletonData(skeletonData, true);

    initialize();
}

void SkeletonRenderer::initWithJsonFile(const std::string &skeletonDataFile, const std::string &atlasFile, float scale) {
    _atlas = new (__FILE__, __LINE__) Atlas(atlasFile.c_str(), &textureLoader);
    CC_ASSERT(_atlas);

    _attachmentLoader = new (__FILE__, __LINE__) Cocos2dAtlasAttachmentLoader(_atlas);

    SkeletonJson json(_attachmentLoader);
    json.setScale(scale);
    SkeletonData *skeletonData = json.readSkeletonDataFile(skeletonDataFile.c_str());
    CC_ASSERT(skeletonData); // Can use json.getError() to get error message.

    _ownsSkeleton = true;
    _ownsAtlas = true;
    setSkeletonData(skeletonData, true);

    initialize();
}

void SkeletonRenderer::initWithBinaryFile(const std::string &skeletonDataFile, Atlas *atlas, float scale) {
    _atlas = atlas;
    _attachmentLoader = new (__FILE__, __LINE__) Cocos2dAtlasAttachmentLoader(_atlas);

    SkeletonBinary binary(_attachmentLoader);
    binary.setScale(scale);
    SkeletonData *skeletonData = binary.readSkeletonDataFile(skeletonDataFile.c_str());
    CC_ASSERT(skeletonData); // Can use binary.getError() to get error message.

    _ownsSkeleton = true;
    setSkeletonData(skeletonData, true);

    initialize();
}

void SkeletonRenderer::initWithBinaryFile(const std::string &skeletonDataFile, const std::string &atlasFile, float scale) {
    _atlas = new (__FILE__, __LINE__) Atlas(atlasFile.c_str(), &textureLoader);
    CC_ASSERT(_atlas);

    _attachmentLoader = new (__FILE__, __LINE__) Cocos2dAtlasAttachmentLoader(_atlas);

    SkeletonBinary binary(_attachmentLoader);
    binary.setScale(scale);
    SkeletonData *skeletonData = binary.readSkeletonDataFile(skeletonDataFile.c_str());
    CC_ASSERT(skeletonData); // Can use binary.getError() to get error message.

    _ownsSkeleton = true;
    _ownsAtlas = true;
    setSkeletonData(skeletonData, true);

    initialize();
}

void SkeletonRenderer::render(float /*deltaTime*/) {
    if (!_skeleton) return;
    auto *entity = _entity;
    entity->clearDynamicRenderDrawInfos();
    _sharedBufferOffset->reset();
    _sharedBufferOffset->clear();

    // avoid other place call update.
    auto *mgr = MiddlewareManager::getInstance();
    if (!mgr->isRendering) return;

    auto *attachMgr = mgr->getAttachInfoMgr();
    auto *attachInfo = attachMgr->getBuffer();
    if (!attachInfo) return;
    // store attach info offset
    _sharedBufferOffset->writeUint32(static_cast<uint32_t>(attachInfo->getCurPos()) / sizeof(uint32_t));

    // If opacity is 0,then return.
    if (_skeleton->getColor().a == 0) {
        return;
    }
    auto &nodeWorldMat = entity->getNode()->getWorldMatrix();
    // color range is [0.0, 1.0]
    cc::middleware::Color4F color;
    cc::middleware::Color4F darkColor;
    AttachmentVertices *attachmentVertices = nullptr;
    bool inRange = !(_startSlotIndex != -1 || _endSlotIndex != -1);
    auto vertexFormat = _useTint ? VF_XYZUVCC : VF_XYZUVC;
    cc::middleware::MeshBuffer *mb = mgr->getMeshBuffer(vertexFormat);
    cc::middleware::IOBuffer &vb = mb->getVB();
    cc::middleware::IOBuffer &ib = mb->getIB();

    // vertex size int bytes with one color
    unsigned int vbs1 = sizeof(V3F_T2F_C4B);
    // vertex size in floats with one color
    unsigned int vs1 = vbs1 / sizeof(float);
    // vertex size int bytes with two color
    unsigned int vbs2 = sizeof(V3F_T2F_C4B_C4B);
    // verex size in floats with two color
    unsigned int vs2 = vbs2 / sizeof(float);

    auto vbs = vbs1;
    if (_useTint) {
        vbs = vbs2;
    }

    unsigned int vbSize = 0;
    unsigned int ibSize = 0;

    int curBlendSrc = -1;
    int curBlendDst = -1;
    int curBlendMode = -1;
    int preBlendMode = -1;
    uint32_t curISegLen = 0;
    cc::Texture2D *preTexture = nullptr;
    cc::Texture2D *curTexture = nullptr;
    RenderDrawInfo *curDrawInfo = nullptr;

    int materialLen = 0;
    Slot *slot = nullptr;
    int isFull = 0;

    if (_debugSlots || _debugBones || _debugMesh) {
        // If enable debug draw,then init debug buffer.
        if (_debugBuffer == nullptr) {
            _debugBuffer = new cc::middleware::IOTypedArray(se::Object::TypedArrayType::FLOAT32, MAX_DEBUG_BUFFER_SIZE);
        }
        _debugBuffer->reset();
    }

    auto flush = [&]() {
        // fill pre segment indices count field
        if (curDrawInfo) {
            curDrawInfo->setIbCount(curISegLen);
        }
        curDrawInfo = requestDrawInfo(materialLen);
        entity->addDynamicRenderDrawInfo(curDrawInfo);
        // prepare to fill new segment field
        curBlendMode = slot->getData().getBlendMode();
        switch (curBlendMode) {
            case BlendMode_Additive:
                curBlendSrc = static_cast<int>(_premultipliedAlpha ? BlendFactor::ONE : BlendFactor::SRC_ALPHA);
                curBlendDst = static_cast<int>(BlendFactor::ONE);
                break;
            case BlendMode_Multiply:
                curBlendSrc = static_cast<int>(BlendFactor::DST_COLOR);
                curBlendDst = static_cast<int>(BlendFactor::ONE_MINUS_SRC_ALPHA);
                break;
            case BlendMode_Screen:
                curBlendSrc = static_cast<int>(_premultipliedAlpha ? BlendFactor::ONE : BlendFactor::SRC_ALPHA);
                curBlendDst = static_cast<int>(BlendFactor::ONE_MINUS_SRC_COLOR);
                break;
            default:
                curBlendSrc = static_cast<int>(_premultipliedAlpha ? BlendFactor::ONE : BlendFactor::SRC_ALPHA);
                curBlendDst = static_cast<int>(BlendFactor::ONE_MINUS_SRC_ALPHA);
        }
        auto *material = requestMaterial(curBlendSrc, curBlendDst);
        curDrawInfo->setMaterial(material);
        gfx::Texture *texture = curTexture->getGFXTexture();
        gfx::Sampler *sampler = curTexture->getGFXSampler();
        curDrawInfo->setTexture(texture);
        curDrawInfo->setSampler(sampler);
        auto *uiMeshBuffer = mb->getUIMeshBuffer();
        curDrawInfo->setMeshBuffer(uiMeshBuffer);
        curDrawInfo->setIndexOffset(static_cast<uint32_t>(ib.getCurPos()) / sizeof(uint16_t));
        // reset pre blend mode to current
        preBlendMode = static_cast<int>(slot->getData().getBlendMode());
        // reset pre texture index to current
        preTexture = curTexture;
        // reset index segmentation count
        curISegLen = 0;
        // material length increased
        materialLen++;
    };

    VertexEffect *effect = nullptr;
    if (_effectDelegate) {
        effect = _effectDelegate->getVertexEffect();
    }

    if (effect) {
        effect->begin(*_skeleton);
    }

    auto &drawOrder = _skeleton->getDrawOrder();
    for (size_t i = 0, n = drawOrder.size(); i < n; ++i) {
        isFull = 0;
        slot = drawOrder[i];

        if (slot->getBone().isActive() == false) {
            continue;
        }

        if (_startSlotIndex >= 0 && _startSlotIndex == slot->getData().getIndex()) {
            inRange = true;
        }

        if (!inRange) {
            _clipper->clipEnd(*slot);
            continue;
        }

        if (_endSlotIndex >= 0 && _endSlotIndex == slot->getData().getIndex()) {
            inRange = false;
        }

        if (!slot->getAttachment()) {
            _clipper->clipEnd(*slot);
            continue;
        }

        cc::middleware::Triangles triangles;
        cc::middleware::TwoColorTriangles trianglesTwoColor;

        if (slot->getAttachment()->getRTTI().isExactly(RegionAttachment::rtti)) {
            auto *attachment = dynamic_cast<RegionAttachment *>(slot->getAttachment());
            attachmentVertices = reinterpret_cast<AttachmentVertices *>(attachment->getRendererObject());

            // Early exit if attachment is invisible
            if (attachment->getColor().a == 0) {
                _clipper->clipEnd(*slot);
                continue;
            }

            if (!_useTint) {
                triangles.vertCount = attachmentVertices->_triangles->vertCount;
                vbSize = triangles.vertCount * sizeof(V3F_T2F_C4B);
                isFull |= vb.checkSpace(vbSize, true);
                triangles.verts = reinterpret_cast<V3F_T2F_C4B *>(vb.getCurBuffer());
                memcpy(static_cast<void *>(triangles.verts), static_cast<void *>(attachmentVertices->_triangles->verts), vbSize);
                attachment->computeWorldVertices(slot->getBone(), reinterpret_cast<float *>(triangles.verts), 0, vs1);

                triangles.indexCount = attachmentVertices->_triangles->indexCount;
                ibSize = triangles.indexCount * sizeof(uint16_t);
                ib.checkSpace(ibSize, true);
                triangles.indices = reinterpret_cast<uint16_t *>(ib.getCurBuffer());
                memcpy(triangles.indices, attachmentVertices->_triangles->indices, ibSize);
            } else {
                trianglesTwoColor.vertCount = attachmentVertices->_triangles->vertCount;
                vbSize = trianglesTwoColor.vertCount * sizeof(V3F_T2F_C4B_C4B);
                isFull |= vb.checkSpace(vbSize, true);
                trianglesTwoColor.verts = reinterpret_cast<V3F_T2F_C4B_C4B *>(vb.getCurBuffer());
                for (int ii = 0; ii < trianglesTwoColor.vertCount; ii++) {
                    trianglesTwoColor.verts[ii].texCoord = attachmentVertices->_triangles->verts[ii].texCoord;
                }
                attachment->computeWorldVertices(slot->getBone(), reinterpret_cast<float *>(trianglesTwoColor.verts), 0, vs2);

                trianglesTwoColor.indexCount = attachmentVertices->_triangles->indexCount;
                ibSize = trianglesTwoColor.indexCount * sizeof(uint16_t);
                ib.checkSpace(ibSize, true);
                trianglesTwoColor.indices = reinterpret_cast<uint16_t *>(ib.getCurBuffer());
                memcpy(trianglesTwoColor.indices, attachmentVertices->_triangles->indices, ibSize);
            }

            color.r = attachment->getColor().r;
            color.g = attachment->getColor().g;
            color.b = attachment->getColor().b;
            color.a = attachment->getColor().a;

            if (_debugSlots) {
                _debugBuffer->writeFloat32(DebugType::SLOTS);
                _debugBuffer->writeFloat32(8);
                float *vertices = _useTint ? reinterpret_cast<float *>(trianglesTwoColor.verts) : reinterpret_cast<float *>(triangles.verts);
                unsigned int stride = _useTint ? vs2 : vs1;
                // Quadrangle has 4 vertex.
                for (int ii = 0; ii < 4; ii++) {
                    _debugBuffer->writeFloat32(vertices[0]);
                    _debugBuffer->writeFloat32(vertices[1]);
                    vertices += stride;
                }
            }
        } else if (slot->getAttachment()->getRTTI().isExactly(MeshAttachment::rtti)) {
            auto *attachment = dynamic_cast<MeshAttachment *>(slot->getAttachment());
            attachmentVertices = static_cast<AttachmentVertices *>(attachment->getRendererObject());

            // Early exit if attachment is invisible
            if (attachment->getColor().a == 0) {
                _clipper->clipEnd(*slot);
                continue;
            }

            if (!_useTint) {
                triangles.vertCount = attachmentVertices->_triangles->vertCount;
                vbSize = triangles.vertCount * sizeof(V3F_T2F_C4B);
                isFull |= vb.checkSpace(vbSize, true);
                triangles.verts = reinterpret_cast<V3F_T2F_C4B *>(vb.getCurBuffer());
                memcpy(static_cast<void *>(triangles.verts), static_cast<void *>(attachmentVertices->_triangles->verts), vbSize);
                attachment->computeWorldVertices(*slot, 0, attachment->getWorldVerticesLength(), reinterpret_cast<float *>(triangles.verts), 0, vs1);

                triangles.indexCount = attachmentVertices->_triangles->indexCount;
                ibSize = triangles.indexCount * sizeof(uint16_t);
                ib.checkSpace(ibSize, true);
                triangles.indices = reinterpret_cast<uint16_t *>(ib.getCurBuffer());
                memcpy(triangles.indices, attachmentVertices->_triangles->indices, ibSize);
            } else {
                trianglesTwoColor.vertCount = attachmentVertices->_triangles->vertCount;
                vbSize = trianglesTwoColor.vertCount * sizeof(V3F_T2F_C4B_C4B);
                isFull |= vb.checkSpace(vbSize, true);
                trianglesTwoColor.verts = reinterpret_cast<V3F_T2F_C4B_C4B *>(vb.getCurBuffer());
                for (int ii = 0; ii < trianglesTwoColor.vertCount; ii++) {
                    trianglesTwoColor.verts[ii].texCoord = attachmentVertices->_triangles->verts[ii].texCoord;
                }
                attachment->computeWorldVertices(*slot, 0, attachment->getWorldVerticesLength(), reinterpret_cast<float *>(trianglesTwoColor.verts), 0, vs2);

                trianglesTwoColor.indexCount = attachmentVertices->_triangles->indexCount;
                ibSize = trianglesTwoColor.indexCount * sizeof(uint16_t);
                ib.checkSpace(ibSize, true);
                trianglesTwoColor.indices = reinterpret_cast<uint16_t *>(ib.getCurBuffer());
                memcpy(trianglesTwoColor.indices, attachmentVertices->_triangles->indices, ibSize);
            }

            color.r = attachment->getColor().r;
            color.g = attachment->getColor().g;
            color.b = attachment->getColor().b;
            color.a = attachment->getColor().a;

            if (_debugMesh) {
                int indexCount = _useTint ? trianglesTwoColor.indexCount : triangles.indexCount;
                uint16_t *indices = _useTint ? trianglesTwoColor.indices : triangles.indices;
                float *vertices = _useTint ? reinterpret_cast<float *>(trianglesTwoColor.verts) : reinterpret_cast<float *>(triangles.verts);

                unsigned int stride = _useTint ? vs2 : vs1;
                _debugBuffer->writeFloat32(DebugType::MESH);
                _debugBuffer->writeFloat32(static_cast<float>(indexCount * 2));
                for (int ii = 0; ii < indexCount; ii += 3) {
                    unsigned int v1 = indices[ii] * stride;
                    unsigned int v2 = indices[ii + 1] * stride;
                    unsigned int v3 = indices[ii + 2] * stride;
                    _debugBuffer->writeFloat32(vertices[v1]);
                    _debugBuffer->writeFloat32(vertices[v1 + 1]);
                    _debugBuffer->writeFloat32(vertices[v2]);
                    _debugBuffer->writeFloat32(vertices[v2 + 1]);
                    _debugBuffer->writeFloat32(vertices[v3]);
                    _debugBuffer->writeFloat32(vertices[v3 + 1]);
                }
            }

        } else if (slot->getAttachment()->getRTTI().isExactly(ClippingAttachment::rtti)) {
            auto *clip = dynamic_cast<ClippingAttachment *>(slot->getAttachment());
            _clipper->clipStart(*slot, clip);
            continue;
        } else {
            _clipper->clipEnd(*slot);
            continue;
        }

        color.a = _skeleton->getColor().a * slot->getColor().a * color.a * _entity->getOpacity() * 255;
        // skip rendering if the color of this attachment is 0
        if (color.a == 0) {
            _clipper->clipEnd(*slot);
            continue;
        }

        float multiplier = _premultipliedAlpha ? color.a : 255;
        float red = _nodeColor.r * _skeleton->getColor().r * color.r * multiplier;
        float green = _nodeColor.g * _skeleton->getColor().g * color.g * multiplier;
        float blue = _nodeColor.b * _skeleton->getColor().b * color.b * multiplier;

        color.r = red * slot->getColor().r;
        color.g = green * slot->getColor().g;
        color.b = blue * slot->getColor().b;

        if (slot->hasDarkColor()) {
            darkColor.r = red * slot->getDarkColor().r;
            darkColor.g = green * slot->getDarkColor().g;
            darkColor.b = blue * slot->getDarkColor().b;
        } else {
            darkColor.r = 0;
            darkColor.g = 0;
            darkColor.b = 0;
        }
        darkColor.a = _premultipliedAlpha ? 255 : 0;

        // One color tint logic
        if (!_useTint) {
            // Cliping logic
            Color4B light;
            light.r = (uint8_t)color.r;
            light.g = (uint8_t)color.g;
            light.b = (uint8_t)color.b;
            light.a = (uint8_t)color.a;
            if (_clipper->isClipping()) {
                _clipper->clipTriangles(reinterpret_cast<float *>(&triangles.verts[0].vertex), triangles.indices, triangles.indexCount, reinterpret_cast<float *>(&triangles.verts[0].texCoord), vs1);

                if (_clipper->getClippedTriangles().size() == 0) {
                    _clipper->clipEnd(*slot);
                    continue;
                }

                triangles.vertCount = static_cast<int>(_clipper->getClippedVertices().size()) >> 1;
                vbSize = triangles.vertCount * sizeof(V3F_T2F_C4B);
                isFull |= vb.checkSpace(vbSize, true);
                triangles.verts = reinterpret_cast<V3F_T2F_C4B *>(vb.getCurBuffer());

                triangles.indexCount = static_cast<int>(_clipper->getClippedTriangles().size());
                ibSize = triangles.indexCount * sizeof(uint16_t);
                ib.checkSpace(ibSize, true);
                triangles.indices = reinterpret_cast<uint16_t *>(ib.getCurBuffer());
                memcpy(triangles.indices, _clipper->getClippedTriangles().buffer(), sizeof(uint16_t) * _clipper->getClippedTriangles().size());

                float *verts = _clipper->getClippedVertices().buffer();
                float *uvs = _clipper->getClippedUVs().buffer();

                if (effect) {
                    for (int v = 0, vn = triangles.vertCount, vv = 0; v < vn; ++v, vv += 2) {
                        V3F_T2F_C4B *vertex = triangles.verts + v;
                        vertex->vertex.x = verts[vv];
                        vertex->vertex.y = verts[vv + 1];
                        vertex->texCoord.u = uvs[vv];
                        vertex->texCoord.v = uvs[vv + 1];
                        effect->transform(vertex->vertex.x, vertex->vertex.y);
                        vertex->color = light;
                    }
                } else {
                    for (int v = 0, vn = triangles.vertCount, vv = 0; v < vn; ++v, vv += 2) {
                        V3F_T2F_C4B *vertex = triangles.verts + v;
                        vertex->vertex.x = verts[vv];
                        vertex->vertex.y = verts[vv + 1];
                        vertex->texCoord.u = uvs[vv];
                        vertex->texCoord.v = uvs[vv + 1];
                        vertex->color = light;
                    }
                }
                // No cliping logic
            } else {
                if (effect) {
                    for (int v = 0, vn = triangles.vertCount; v < vn; ++v) {
                        V3F_T2F_C4B *vertex = triangles.verts + v;
                        effect->transform(vertex->vertex.x, vertex->vertex.y);
                        vertex->color = light;
                    }
                } else {
                    for (int v = 0, vn = triangles.vertCount; v < vn; ++v) {
                        V3F_T2F_C4B *vertex = triangles.verts + v;
                        vertex->color = light;
                    }
                }
            }
        }
        // Two color tint logic
        else {
            Color4B light;
            Color4B dark;
            light.r = (uint8_t)color.r;
            light.g = (uint8_t)color.g;
            light.b = (uint8_t)color.b;
            light.a = (uint8_t)color.a;
            dark.r = (uint8_t)darkColor.r;
            dark.g = (uint8_t)darkColor.g;
            dark.b = (uint8_t)darkColor.b;
            dark.a = (uint8_t)darkColor.a;
            if (_clipper->isClipping()) {
                _clipper->clipTriangles(reinterpret_cast<float *>(&trianglesTwoColor.verts[0].vertex), trianglesTwoColor.indices, trianglesTwoColor.indexCount, reinterpret_cast<float *>(&trianglesTwoColor.verts[0].texCoord), vs2);

                if (_clipper->getClippedTriangles().size() == 0) {
                    _clipper->clipEnd(*slot);
                    continue;
                }

                trianglesTwoColor.vertCount = static_cast<int>(_clipper->getClippedVertices().size()) >> 1;
                vbSize = trianglesTwoColor.vertCount * sizeof(V3F_T2F_C4B_C4B);
                isFull |= vb.checkSpace(vbSize, true);
                trianglesTwoColor.verts = reinterpret_cast<V3F_T2F_C4B_C4B *>(vb.getCurBuffer());

                trianglesTwoColor.indexCount = static_cast<int>(_clipper->getClippedTriangles().size());
                ibSize = trianglesTwoColor.indexCount * sizeof(uint16_t);
                trianglesTwoColor.indices = reinterpret_cast<uint16_t *>(ib.getCurBuffer());
                memcpy(trianglesTwoColor.indices, _clipper->getClippedTriangles().buffer(), sizeof(uint16_t) * _clipper->getClippedTriangles().size());

                float *verts = _clipper->getClippedVertices().buffer();
                float *uvs = _clipper->getClippedUVs().buffer();

                if (effect) {
                    for (int v = 0, vn = trianglesTwoColor.vertCount, vv = 0; v < vn; ++v, vv += 2) {
                        V3F_T2F_C4B_C4B *vertex = trianglesTwoColor.verts + v;
                        vertex->vertex.x = verts[vv];
                        vertex->vertex.y = verts[vv + 1];
                        vertex->texCoord.u = uvs[vv];
                        vertex->texCoord.v = uvs[vv + 1];
                        effect->transform(vertex->vertex.x, vertex->vertex.y);
                        vertex->color = light;
                        vertex->color2 = dark;
                    }
                } else {
                    for (int v = 0, vn = trianglesTwoColor.vertCount, vv = 0; v < vn; ++v, vv += 2) {
                        V3F_T2F_C4B_C4B *vertex = trianglesTwoColor.verts + v;
                        vertex->vertex.x = verts[vv];
                        vertex->vertex.y = verts[vv + 1];
                        vertex->texCoord.u = uvs[vv];
                        vertex->texCoord.v = uvs[vv + 1];
                        vertex->color = light;
                        vertex->color2 = dark;
                    }
                }
            } else {
                if (effect) {
                    for (int v = 0, vn = trianglesTwoColor.vertCount; v < vn; ++v) {
                        V3F_T2F_C4B_C4B *vertex = trianglesTwoColor.verts + v;
                        effect->transform(vertex->vertex.x, vertex->vertex.y);
                        vertex->color = light;
                        vertex->color2 = dark;
                    }
                } else {
                    for (int v = 0, vn = trianglesTwoColor.vertCount; v < vn; ++v) {
                        V3F_T2F_C4B_C4B *vertex = trianglesTwoColor.verts + v;
                        vertex->color = light;
                        vertex->color2 = dark;
                    }
                }
            }
        }

        curTexture = (cc::Texture2D *)attachmentVertices->_texture->getRealTexture();
        // If texture or blendMode change,will change material.
        if (preTexture != curTexture || preBlendMode != slot->getData().getBlendMode() || isFull) {
            flush();
        }
        if (_enableBatch) {
            uint8_t *vbBuffer = vb.getCurBuffer();
            cc::Vec3 *point = nullptr;
            for (unsigned int ii = 0, nn = vbSize; ii < nn; ii += vbs) {
                point = reinterpret_cast<cc::Vec3 *>(vbBuffer + ii);
                point->z = 0;
                point->transformMat4(*point, nodeWorldMat);
            }
        }
        auto vertexOffset = vb.getCurPos() / vbs;
        if (vbSize > 0 && ibSize > 0) {
            if (vertexOffset > 0) {
                auto *ibBuffer = reinterpret_cast<uint16_t *>(ib.getCurBuffer());
                for (unsigned int ii = 0, nn = ibSize / sizeof(uint16_t); ii < nn; ii++) {
                    ibBuffer[ii] += vertexOffset;
                }
            }
            vb.move(static_cast<int>(vbSize));
            ib.move(static_cast<int>(ibSize));

            // Record this turn index segmentation count,it will store in material buffer in the end.
            curISegLen += ibSize / sizeof(uint16_t);
        }

        _clipper->clipEnd(*slot);
    } // End slot traverse

    _clipper->clipEnd();

    if (effect) effect->end();

    if (curDrawInfo) curDrawInfo->setIbCount(curISegLen);

    if (_useAttach || _debugBones) {
        auto &bones = _skeleton->getBones();
        size_t bonesCount = bones.size();

        cc::Mat4 boneMat = cc::Mat4::IDENTITY;

        if (_debugBones) {
            _debugBuffer->writeFloat32(DebugType::BONES);
            _debugBuffer->writeFloat32(static_cast<float>(bonesCount * 4));
        }

        for (size_t i = 0, n = bonesCount; i < n; i++) {
            Bone *bone = bones[i];

            boneMat.m[0] = bone->getA();
            boneMat.m[1] = bone->getC();
            boneMat.m[4] = bone->getB();
            boneMat.m[5] = bone->getD();
            boneMat.m[12] = bone->getWorldX();
            boneMat.m[13] = bone->getWorldY();
            attachInfo->checkSpace(sizeof(boneMat), true);
            attachInfo->writeBytes(reinterpret_cast<const char *>(&boneMat), sizeof(boneMat));

            if (_debugBones) {
                float boneLength = bone->getData().getLength();
                float x = boneLength * bone->getA() + bone->getWorldX();
                float y = boneLength * bone->getC() + bone->getWorldY();
                _debugBuffer->writeFloat32(bone->getWorldX());
                _debugBuffer->writeFloat32(bone->getWorldY());
                _debugBuffer->writeFloat32(x);
                _debugBuffer->writeFloat32(y);
            }
        }
    }

    // debug end
    if (_debugBuffer) {
        if (_debugBuffer->isOutRange()) {
            _debugBuffer->reset();
            CC_LOG_INFO("Spine debug data is too large, debug buffer has no space to put in it!!!!!!!!!!");
            CC_LOG_INFO("You can adjust MAX_DEBUG_BUFFER_SIZE macro");
        }
        _debugBuffer->writeFloat32(DebugType::NONE);
    }
}

cc::Rect SkeletonRenderer::getBoundingBox() const {
    static cc::middleware::IOBuffer buffer(1024);
    float *worldVertices = nullptr;
    float minX = 999999.0F;
    float minY = 999999.0F;
    float maxX = -999999.0F;
    float maxY = -999999.0F;
    for (int i = 0; i < _skeleton->getSlots().size(); ++i) {
        Slot *slot = _skeleton->getSlots()[i];
        if (!slot->getAttachment()) continue;
        int verticesCount;
        if (slot->getAttachment()->getRTTI().isExactly(RegionAttachment::rtti)) {
            auto *attachment = dynamic_cast<RegionAttachment *>(slot->getAttachment());
            buffer.checkSpace(8 * sizeof(float));
            worldVertices = reinterpret_cast<float *>(buffer.getCurBuffer());
            attachment->computeWorldVertices(slot->getBone(), worldVertices, 0, 2);
            verticesCount = 8;
        } else if (slot->getAttachment()->getRTTI().isExactly(MeshAttachment::rtti)) {
            auto *mesh = dynamic_cast<MeshAttachment *>(slot->getAttachment());
            buffer.checkSpace(mesh->getWorldVerticesLength() * sizeof(float));
            worldVertices = reinterpret_cast<float *>(buffer.getCurBuffer());
            mesh->computeWorldVertices(*slot, 0, mesh->getWorldVerticesLength(), worldVertices, 0, 2);
            verticesCount = static_cast<int>(mesh->getWorldVerticesLength());
        } else {
            continue;
        }
        for (int ii = 0; ii < verticesCount; ii += 2) {
            float x = worldVertices[ii];
            float y = worldVertices[ii + 1];
            minX = min(minX, x);
            minY = min(minY, y);
            maxX = max(maxX, x);
            maxY = max(maxY, y);
        }
    }
    if (minX == 999999.0F) minX = minY = maxX = maxY = 0;
    return cc::Rect(minX, minY, maxX - minX, maxY - minY);
}

void SkeletonRenderer::updateWorldTransform() {
    if (_skeleton) {
        _skeleton->updateWorldTransform();
    }
}

void SkeletonRenderer::setAttachEnabled(bool enabled) {
    _useAttach = enabled;
}

void SkeletonRenderer::setToSetupPose() {
    if (_skeleton) {
        _skeleton->setToSetupPose();
    }
}

void SkeletonRenderer::setBonesToSetupPose() {
    if (_skeleton) {
        _skeleton->setBonesToSetupPose();
    }
}

void SkeletonRenderer::setSlotsToSetupPose() {
    if (_skeleton) {
        _skeleton->setSlotsToSetupPose();
    }
}

spine::Bone *SkeletonRenderer::findBone(const std::string &boneName) const {
    if (_skeleton) {
        return _skeleton->findBone(boneName.c_str());
    }
    return nullptr;
}

spine::Slot *SkeletonRenderer::findSlot(const std::string &slotName) const {
    if (_skeleton) {
        return _skeleton->findSlot(slotName.c_str());
    }
    return nullptr;
}

void SkeletonRenderer::setSkin(const std::string &skinName) {
    if (_skeleton) {
        _skeleton->setSkin(skinName.empty() ? nullptr : skinName.c_str());
        _skeleton->setSlotsToSetupPose();
    }
}

void SkeletonRenderer::setSkin(const char *skinName) {
    if (_skeleton) {
        _skeleton->setSkin(skinName);
        _skeleton->setSlotsToSetupPose();
    }
}

spine::Attachment *SkeletonRenderer::getAttachment(const std::string &slotName, const std::string &attachmentName) const {
    if (_skeleton) {
        return _skeleton->getAttachment(slotName.c_str(), attachmentName.c_str());
    }
    return nullptr;
}

bool SkeletonRenderer::setAttachment(const std::string &slotName, const std::string &attachmentName) {
    if (_skeleton) {
        _skeleton->setAttachment(slotName.c_str(), attachmentName.empty() ? nullptr : attachmentName.c_str());
    }
    return true;
}

bool SkeletonRenderer::setAttachment(const std::string &slotName, const char *attachmentName) {
    if (_skeleton) {
        _skeleton->setAttachment(slotName.c_str(), attachmentName);
    }
    return true;
}

void SkeletonRenderer::setUseTint(bool enabled) {
    _useTint = enabled;
}

void SkeletonRenderer::setVertexEffectDelegate(VertexEffectDelegate *effectDelegate) {
    if (_effectDelegate == effectDelegate) {
        return;
    }
    CC_SAFE_RELEASE(_effectDelegate);
    _effectDelegate = effectDelegate;
    CC_SAFE_ADD_REF(_effectDelegate);
}

void SkeletonRenderer::setSlotsRange(int startSlotIndex, int endSlotIndex) {
    this->_startSlotIndex = startSlotIndex;
    this->_endSlotIndex = endSlotIndex;
}

spine::Skeleton *SkeletonRenderer::getSkeleton() const {
    return _skeleton;
}

void SkeletonRenderer::setTimeScale(float scale) {
    _timeScale = scale;
}

float SkeletonRenderer::getTimeScale() const {
    return _timeScale;
}

void SkeletonRenderer::paused(bool value) {
    _paused = value;
}

void SkeletonRenderer::setColor(float r, float g, float b, float a) {
    _nodeColor.r = r / 255.0F;
    _nodeColor.g = g / 255.0F;
    _nodeColor.b = b / 255.0F;
    _nodeColor.a = a / 255.0F;
}

void SkeletonRenderer::setBatchEnabled(bool enabled) {
    if (enabled != _enableBatch) {
        _needClearMaterialCaches = true;
        _enableBatch = enabled;
    }
}

void SkeletonRenderer::setDebugBonesEnabled(bool enabled) {
    _debugBones = enabled;
}

void SkeletonRenderer::setDebugSlotsEnabled(bool enabled) {
    _debugSlots = enabled;
}

void SkeletonRenderer::setDebugMeshEnabled(bool enabled) {
    _debugMesh = enabled;
}

void SkeletonRenderer::setOpacityModifyRGB(bool value) {
    _premultipliedAlpha = value;
}

bool SkeletonRenderer::isOpacityModifyRGB() const {
    return _premultipliedAlpha;
}

se_object_ptr SkeletonRenderer::getDebugData() const {
    if (_debugBuffer) {
        return _debugBuffer->getTypeArray();
    }
    return nullptr;
}

se_object_ptr SkeletonRenderer::getSharedBufferOffset() const {
    if (_sharedBufferOffset) {
        return _sharedBufferOffset->getTypeArray();
    }
    return nullptr;
}

void SkeletonRenderer::setRenderEntity(cc::RenderEntity *entity) {
    _entity = entity;
}

void SkeletonRenderer::setMaterial(cc::Material *material) {
    _material = material;
    _needClearMaterialCaches = true;
}

cc::RenderDrawInfo *SkeletonRenderer::requestDrawInfo(int idx) {
    if (_drawInfoArray.size() < idx + 1) {
        cc::RenderDrawInfo *draw = new cc::RenderDrawInfo();
        draw->setDrawInfoType(static_cast<uint32_t>(RenderDrawInfoType::MIDDLEWARE));
        _drawInfoArray.push_back(draw);
    }
    return _drawInfoArray[idx];
}

cc::Material *SkeletonRenderer::requestMaterial(uint16_t blendSrc, uint16_t blendDst) {
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
        const MacroRecord macros{{"TWO_COLORED", _useTint}, {"USE_LOCAL", !_enableBatch}};
        materialInstance->recompileShaders(macros);
        _materialCaches[key] = materialInstance;
    }
    return _materialCaches[key];
}

void SkeletonRenderer::setSlotTexture(const std::string &slotName, cc::Texture2D *tex2d, bool createAttachment) {
    if (!_skeleton) return;
    auto slot = _skeleton->findSlot(slotName.c_str());
    if (!slot) return;
    auto attachment = slot->getAttachment();
    if (!attachment) return;
    auto width = tex2d->getWidth();
    auto height = tex2d->getHeight();

    if (createAttachment) {
        attachment = attachment->copy();
        slot->setAttachment(attachment);
    }
    AttachmentVertices *attachmentVertices = nullptr;
    if (attachment->getRTTI().isExactly(spine::RegionAttachment::rtti)) {
        auto region = static_cast<RegionAttachment *>(attachment);
        region->setRegionWidth(width);
        region->setRegionHeight(height);
        region->setRegionOriginalWidth(width);
        region->setRegionOriginalHeight(height);
        region->setWidth(width);
        region->setHeight(height);
        region->setUVs(0, 0, 1.0f, 1.0f, false);
        region->updateOffset();
        attachmentVertices = static_cast<AttachmentVertices *>(region->getRendererObject());
        if (createAttachment) {
            attachmentVertices = attachmentVertices->copy();
            region->setRendererObject(attachmentVertices);
        }
        V3F_T2F_C4B *vertices = attachmentVertices->_triangles->verts;
        auto UVs = region->getUVs();
        for (int i = 0, ii = 0; i < 4; ++i, ii += 2) {
            vertices[i].texCoord.u = UVs[ii];
            vertices[i].texCoord.v = UVs[ii + 1];
        }
    } else if (attachment->getRTTI().isExactly(spine::MeshAttachment::rtti)) {
        auto mesh = static_cast<MeshAttachment *>(attachment);
        mesh->setRegionWidth(width);
        mesh->setRegionHeight(height);
        mesh->setRegionOriginalWidth(width);
        mesh->setRegionOriginalHeight(height);
        mesh->setWidth(width);
        mesh->setHeight(height);
        mesh->setRegionU(0);
        mesh->setRegionV(0);
        mesh->setRegionU2(1.0f);
        mesh->setRegionV2(1.0f);
        mesh->setRegionRotate(true);
        mesh->setRegionDegrees(0);
        mesh->updateUVs();
        attachmentVertices = static_cast<AttachmentVertices *>(mesh->getRendererObject());
        if (createAttachment) {
            attachmentVertices = attachmentVertices->copy();
            mesh->setRendererObject(attachmentVertices);
        }
        V3F_T2F_C4B *vertices = attachmentVertices->_triangles->verts;
        auto UVs = mesh->getUVs();
        for (size_t i = 0, ii = 0, nn = mesh->getWorldVerticesLength(); ii < nn; ++i, ii += 2) {
            vertices[i].texCoord.u = UVs[ii];
            vertices[i].texCoord.v = UVs[ii + 1];
        }
    }
    if (!attachmentVertices) return;
    middleware::Texture2D *middlewareTexture = nullptr;
    for (auto &it : _slotTextureSet) {
        if (it->getRealTexture() == tex2d) {
            middlewareTexture = it;
            break;
        }
    }
    if (!middlewareTexture) {
        middlewareTexture = new middleware::Texture2D();
        middlewareTexture->addRef();
        middlewareTexture->setRealTexture(tex2d);
    }
    if (attachmentVertices->_texture) {
        attachmentVertices->_texture->release();
    }
    attachmentVertices->_texture = middlewareTexture;
}
