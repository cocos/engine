#include "spine-skeleton-instance.h"
#include <spine/spine.h>
#include "AtlasAttachmentLoaderExtension.h"
#include "spine-mesh-data.h"
#include "spine-wasm.h"

SlotMesh globalMesh(nullptr, nullptr, 0, 0);

extern "C" {
extern void spineListenerCallBackFromJS();
extern void spineTrackListenerCallback();
}
using namespace spine;

static void animationCallback(AnimationState *state, EventType type, TrackEntry *entry, Event *event) {
    SpineSkeletonInstance *instance = (static_cast<SpineSkeletonInstance *>(state->getRendererObject()));
    instance->onAnimationStateEvent(entry, type, event);
}

static void trackEntryCallback(AnimationState *state, EventType type, TrackEntry *entry, Event *event) {
    void* renderObj = state->getRendererObject();
    if (renderObj) {
        (static_cast<SpineSkeletonInstance *>(renderObj))->onTrackEntryEvent(entry, type, event);
        if (type == EventType_Dispose) {
            if (entry->getRendererObject()) {
                entry->setRendererObject(nullptr);
            }
        }
    }
}

SpineSkeletonInstance::SpineSkeletonInstance() {
    _model = new SpineModel();
}

SpineSkeletonInstance::~SpineSkeletonInstance() {
    _skeletonData = nullptr;
    if (_clipper) delete _clipper;
    if (_animState) delete _animState;
    if (_animStateData) delete _animStateData;
    if (_skeleton) delete _skeleton;
    if (_model) delete _model;
}

void SpineSkeletonInstance::destroy() {
    delete this;
}

Skeleton *SpineSkeletonInstance::initSkeleton(SkeletonData *data) {
    if (_clipper) delete _clipper;
    if (_animState) delete _animState;
    if (_animStateData) delete _animStateData;
    if (_skeleton) delete _skeleton;

    _skeletonData = data;
    _skeleton = new Skeleton(_skeletonData);
    _animStateData = new AnimationStateData(_skeletonData);
    _animState = new AnimationState(_animStateData);
    _clipper = new SkeletonClipping();
    _skeleton->setToSetupPose();
    _skeleton->updateWorldTransform();
    _animState->setRendererObject(this);
    _animState->setListener(animationCallback);
    return _skeleton;
}

TrackEntry *SpineSkeletonInstance::setAnimation(float trackIndex, const spine::String &name, bool loop) {
    if (!_skeleton) return nullptr;
    spine::Animation *animation = _skeleton->getData()->findAnimation(name);
    if (!animation) {
        _animState->clearTracks();
        _skeleton->setToSetupPose();
        return nullptr;
    }
    auto *trackEntry = _animState->setAnimation(trackIndex, animation, loop);
    _animState->apply(*_skeleton);
    _skeleton->updateWorldTransform();
    return trackEntry;
}

void SpineSkeletonInstance::setSkin(const spine::String &name) {
    if (!_skeleton) return;
    _skeleton->setSkin(name);
    _skeleton->setSlotsToSetupPose();
}

void SpineSkeletonInstance::updateAnimation(float dltTime) {
    if (!_skeleton) return;
    dltTime *= dtRate;
    _skeleton->update(dltTime);
    _animState->update(dltTime);
    _animState->apply(*_skeleton);
}

SpineModel *SpineSkeletonInstance::updateRenderData() {
    if (_userData.debugMode) {
        _debugShapes.clear();
    }
    _skeleton->updateWorldTransform();
    SpineMeshData::reset();
    _model->clearMeshes();
    if (_userData.useTint) {
        _model->byteStride = sizeof(V3F_T2F_C4B_C4B);
    } else {
        _model->byteStride = sizeof(V3F_T2F_C4B);
    }
    collectMeshData();
    _model->setBufferPtr(SpineMeshData::vb(), SpineMeshData::ib());
    return _model;
}

void SpineSkeletonInstance::collectMeshData() {
    uint32_t byteStrideOneColor = sizeof(V3F_T2F_C4B);
    uint32_t byteStrideTwoColor = sizeof(V3F_T2F_C4B_C4B);
    uint32_t sizeof_float = sizeof(float);
    uint32_t strideOneColor = byteStrideOneColor / sizeof_float;
    uint32_t strideTwoColor = byteStrideTwoColor / sizeof_float;
    uint16_t sizeof_uint16 = sizeof(uint16_t);

    uint32_t byteStrideColor = !_userData.useTint ? byteStrideOneColor : byteStrideTwoColor;
    uint32_t strideColor = byteStrideColor / sizeof_float;

    Color4F color;
    auto &slotArray = _skeleton->getDrawOrder();
    uint32_t slotCount = slotArray.size();
    DEBUG_SHAPE_TYPE debugShapeType = DEBUG_SHAPE_TYPE::DEBUG_REGION;

    SlotMesh currMesh = globalMesh;
    if (_effect) {
        _effect->begin(*_skeleton);
    }
    const Color& skeletonColor = _skeleton->getColor();
    for (uint32_t drawIdx = 0; drawIdx < slotCount; ++drawIdx) {
        auto* slot = slotArray[drawIdx];
        auto& bone = slot->getBone();
        if (!bone.isActive()) {
            continue;
        }

        if (!slot->getAttachment()) {
            _clipper->clipEnd(*slot);
            continue;
        } 
        color.r = _userData.color.r;
        color.g = _userData.color.g;
        color.b = _userData.color.b;
        color.a = _userData.color.a;
        spine::Attachment* attachmentSlot = slot->getAttachment();
        const spine::RTTI& attachmentRTTI = attachmentSlot->getRTTI();
        if (attachmentRTTI.isExactly(spine::RegionAttachment::rtti)) {
            debugShapeType = DEBUG_SHAPE_TYPE::DEBUG_REGION;
            auto *attachment = static_cast<spine::RegionAttachment *>(attachmentSlot);
            auto *attachmentVertices = reinterpret_cast<AttachmentVertices *>(attachment->getRendererObject());
             
            auto& triangles = attachmentVertices->_triangles;
            auto vertCount = triangles->vertCount;
            auto indexCount = triangles->indexCount;
            auto ibSize = indexCount * sizeof_uint16;

            auto vbSize = vertCount * byteStrideColor;
            auto *vertices = SpineMeshData::queryVBuffer();
            auto *indices = SpineMeshData::queryIBuffer();
            
            if (!_userData.useTint) {
                memcpy(static_cast<void *>(vertices), static_cast<void *>(triangles->verts), vbSize);
            } else {
                V3F_T2F_C4B_C4B *verts = (V3F_T2F_C4B_C4B *)vertices;
                for (int ii = 0; ii < vertCount; ii++) {
                    verts[ii].texCoord = triangles->verts[ii].texCoord;
                }
            }
            memcpy(indices, triangles->indices, ibSize);
            attachment->computeWorldVertices(bone, (float *)vertices, 0, strideColor);
            currMesh.set((uint8_t *)vertices, indices, vertCount, indexCount);
            const Color& attachmentColor = attachment->getColor();
            color.r *= attachmentColor.r;
            color.g *= attachmentColor.g;
            color.b *= attachmentColor.b;
            color.a *= attachmentColor.a;
            currMesh.textureID = attachmentVertices->_textureId;
        } else if (attachmentRTTI.isExactly(spine::MeshAttachment::rtti)) {
            debugShapeType = DEBUG_SHAPE_TYPE::DEBUG_MESH;
            auto *attachment = static_cast<spine::MeshAttachment *>(attachmentSlot);
            auto *attachmentVertices = static_cast<AttachmentVertices *>(attachment->getRendererObject());

            auto& triangles = attachmentVertices->_triangles;
            auto vertCount = triangles->vertCount;
            auto indexCount = triangles->indexCount;
            auto ibSize = indexCount * sizeof_uint16;

            auto vbSize = vertCount * byteStrideColor;
            auto *vertices = SpineMeshData::queryVBuffer();
            auto *indices = SpineMeshData::queryIBuffer();
            if (!_userData.useTint) {
                memcpy(static_cast<void *>(vertices), static_cast<void *>(triangles->verts), vbSize);
            } else {
                V3F_T2F_C4B_C4B *verts = (V3F_T2F_C4B_C4B *)vertices;
                for (int ii = 0; ii < vertCount; ii++) {
                    verts[ii].texCoord = triangles->verts[ii].texCoord;
                }
            }
            memcpy(indices, triangles->indices, ibSize);
            attachment->computeWorldVertices(*slot, 0, attachment->getWorldVerticesLength(), (float *)vertices, 0, strideColor);
            currMesh.set((uint8_t *)vertices, indices, vertCount, indexCount);
            const Color& attachmentColor = attachment->getColor();
            color.r *= attachmentColor.r;
            color.g *= attachmentColor.g;
            color.b *= attachmentColor.b;
            color.a *= attachmentColor.a;
            currMesh.textureID = attachmentVertices->_textureId;
        } else if (attachmentRTTI.isExactly(spine::ClippingAttachment::rtti)) {
            auto *clip = static_cast<spine::ClippingAttachment *>(attachmentSlot);
            _clipper->clipStart(*slot, clip);
            continue;
        } else {
            _clipper->clipEnd(*slot);
            continue;
        }
        const Color& slotColor = slot->getColor();
        uint32_t uintA = (uint32_t)(255 * skeletonColor.a * slotColor.a * color.a);
        uint32_t multiplier = _userData.premultipliedAlpha ? uintA : 255;
        uint32_t uintR = (uint32_t)(skeletonColor.r * slotColor.r * color.r * multiplier);
        uint32_t uintG = (uint32_t)(skeletonColor.g * slotColor.g * color.g * multiplier);
        uint32_t uintB = (uint32_t)(skeletonColor.b * slotColor.b * color.b * multiplier);
        uint32_t light = (uintA << 24) + (uintB << 16) + (uintG << 8) + uintR;

        if (slot->hasDarkColor()) {
            const Color& slotDarkColor = slot->getDarkColor();
            uintR = (uint32_t)(skeletonColor.r * slotDarkColor.r * color.r * multiplier);
            uintG = (uint32_t)(skeletonColor.g * slotDarkColor.g * color.g * multiplier);
            uintB = (uint32_t)(skeletonColor.b * slotDarkColor.b * color.b * multiplier);
        } else {
            uintR = 0;
            uintG = 0;
            uintB = 0;
        }
        uintA = _userData.premultipliedAlpha ? 255 : 0;
        uint32_t dark = (uintA << 24) + (uintB << 16) + (uintG << 8) + uintR;

        if (!_userData.useTint) {
            if (_clipper->isClipping()) {
                _clipper->clipTriangles(reinterpret_cast<float *>(currMesh.vBuf), currMesh.iBuf, currMesh.iCount, (float *)(&currMesh.vBuf[3 * 4]), strideColor);
                auto& clippedTriangles = _clipper->getClippedTriangles();
                if (clippedTriangles.size() == 0) {
                    _clipper->clipEnd(*slot);
                    continue;
                }
                auto& clippedVertices = _clipper->getClippedVertices();
                auto& clippedUVs = _clipper->getClippedUVs();
                const auto vertCount = static_cast<int>(clippedVertices.size()) >> 1;
                const auto indexCount = static_cast<int>(clippedTriangles.size());
                const auto vbSize = vertCount * byteStrideColor;
                uint8_t *vPtr = SpineMeshData::queryVBuffer();
                uint16_t *iPtr = SpineMeshData::queryIBuffer();
                currMesh.set(vPtr, iPtr, vertCount, indexCount);
                memcpy(iPtr, clippedTriangles.buffer(), sizeof_uint16 * indexCount);
                float *verts = clippedVertices.buffer();
                float *uvs = clippedUVs.buffer();

                V3F_T2F_C4B *vertices = (V3F_T2F_C4B *)currMesh.vBuf;
                if (_effect) {
                    for (int v = 0, vn = vertCount, vv = 0; v < vn; ++v, vv += 2) {
                        vertices[v].vertex.x = verts[vv];
                        vertices[v].vertex.y = verts[vv + 1];
                        vertices[v].texCoord.u = uvs[vv];
                        vertices[v].texCoord.v = uvs[vv + 1];
                        _effect->transform(vertices[v].vertex.x, vertices[v].vertex.y);
                        *((uint32_t *)&vertices[v].color) = light;
                    }
                } else {
                    for (int v = 0, vn = vertCount, vv = 0; v < vn; ++v, vv += 2) {
                        vertices[v].vertex.x = verts[vv];
                        vertices[v].vertex.y = verts[vv + 1];
                        vertices[v].texCoord.u = uvs[vv];
                        vertices[v].texCoord.v = uvs[vv + 1];
                        *((uint32_t *)&vertices[v].color) = light;
                    }
                }
            } else {
                auto vertCount = currMesh.vCount;
                V3F_T2F_C4B *vertex = (V3F_T2F_C4B *)currMesh.vBuf;
                if (_effect) {
                    for (int v = 0; v < vertCount; ++v) {
                        _effect->transform(vertex[v].vertex.x, vertex[v].vertex.y);
                        *((uint32_t *)&vertex[v].color) = light;
                    }
                } else {
                    for (int v = 0; v < vertCount; ++v) {
                        *((uint32_t *)&vertex[v].color) = light;
                    }
                }
            }
        } else {
            if (_clipper->isClipping()) {
                _clipper->clipTriangles(reinterpret_cast<float *>(currMesh.vBuf), currMesh.iBuf, currMesh.iCount, (float *)(&currMesh.vBuf[3 * 4]), strideColor);
                auto& clippedTriangles = _clipper->getClippedTriangles();
                if (clippedTriangles.size() == 0) {
                    _clipper->clipEnd(*slot);
                    continue;
                }
                auto& clippedVertices = _clipper->getClippedVertices();
                auto& clippedUVs = _clipper->getClippedUVs();
                const auto vertCount = static_cast<int>(clippedVertices.size()) >> 1;
                const auto indexCount = static_cast<int>(clippedTriangles.size());
                const auto vbSize = vertCount * byteStrideColor;
                uint8_t *vPtr = SpineMeshData::queryVBuffer();
                uint16_t *iPtr = SpineMeshData::queryIBuffer();
                currMesh.set(vPtr, iPtr, vertCount, indexCount);
                memcpy(iPtr, clippedTriangles.buffer(), sizeof_uint16 * indexCount);
                float *verts = clippedVertices.buffer();
                float *uvs = clippedUVs.buffer();

                V3F_T2F_C4B_C4B *vertices = (V3F_T2F_C4B_C4B *)currMesh.vBuf;
                if (_effect) {
                    for (int v = 0, vn = vertCount, vv = 0; v < vn; ++v, vv += 2) {
                        vertices[v].vertex.x = verts[vv];
                        vertices[v].vertex.y = verts[vv + 1];
                        vertices[v].texCoord.u = uvs[vv];
                        vertices[v].texCoord.v = uvs[vv + 1];
                        _effect->transform(vertices[v].vertex.x, vertices[v].vertex.y);
                        *((uint32_t *)&vertices[v].color) = light;
                        *((uint32_t *)&vertices[v].color2) = dark;
                    }
                } else {
                    for (int v = 0, vn = vertCount, vv = 0; v < vn; ++v, vv += 2) {
                        vertices[v].vertex.x = verts[vv];
                        vertices[v].vertex.y = verts[vv + 1];
                        vertices[v].texCoord.u = uvs[vv];
                        vertices[v].texCoord.v = uvs[vv + 1];
                        *((uint32_t *)&vertices[v].color) = light;
                        *((uint32_t *)&vertices[v].color2) = dark;
                    }
                }
            } else {
                auto vertCount = currMesh.vCount;
                V3F_T2F_C4B_C4B *vertex = (V3F_T2F_C4B_C4B *)currMesh.vBuf; 
                if (_effect) {
                    for (int v = 0; v < vertCount; ++v) {
                        _effect->transform(vertex[v].vertex.x, vertex[v].vertex.y);
                        *((uint32_t *)&vertex[v].color) = light;
                        *((uint32_t *)&vertex[v].color2) = dark;
                    }
                } else {
                    for (int v = 0; v < vertCount; ++v) {
                        *((uint32_t *)&vertex[v].color) = light;
                        *((uint32_t *)&vertex[v].color2) = dark;
                    }
                }
            }
        }

        SpineMeshData::moveVB(currMesh.vCount * byteStrideColor);
        SpineMeshData::moveIB(currMesh.iCount);
        // record debug shape info
        if (_userData.debugMode) {
            size_t currentShapesLen = _debugShapes.size();
            _debugShapes.setSize(currentShapesLen + 1, {});
            SpineDebugShape& debugShape = _debugShapes[currentShapesLen];
            debugShape.type = static_cast<uint32_t>(debugShapeType);
            debugShape.vOffset = _model->vCount;
            debugShape.vCount = currMesh.vCount;
            debugShape.iOffset = _model->iCount;
            debugShape.iCount = currMesh.iCount;
        }

        currMesh.blendMode = static_cast<uint32_t>(slot->getData().getBlendMode());
        if (_userData.useSlotTexture) {
            if (_slotTextureSet.containsKey(slot)) {
                currMesh.textureID = _slotTextureSet[slot];
            }
        }
        _model->addSlotMesh(currMesh);
        _clipper->clipEnd(*slot);
    }

    _clipper->clipEnd();
    if (_effect) _effect->end();
}

void SpineSkeletonInstance::setPremultipliedAlpha(bool val) {
    _userData.premultipliedAlpha = val;
}

void SpineSkeletonInstance::setColor(float r, float g, float b, float a) {
    _userData.color.r = r;
    _userData.color.g = g;
    _userData.color.b = b;
    _userData.color.a = a;
}

void SpineSkeletonInstance::setJitterEffect(JitterVertexEffect *effect) {
    _effect = effect;
}

void SpineSkeletonInstance::setSwirlEffect(SwirlVertexEffect *effect) {
    _effect = effect;
}

void SpineSkeletonInstance::clearEffect() {
    _effect = nullptr;
}

AnimationState *SpineSkeletonInstance::getAnimationState() {
    return _animState;
}

void SpineSkeletonInstance::setMix(const spine::String &from, const spine::String &to, float duration) {
    _animStateData->setMix(from, to, duration);
}

void SpineSkeletonInstance::setTrackEntryListener(uint32_t trackId, TrackEntry *entry) {
    if (!entry->getRendererObject()) {
        _trackEntryListenerID = trackId;
        entry->setRendererObject(this);
        entry->setListener(trackEntryCallback);
    }
}

void SpineSkeletonInstance::setUseTint(bool useTint) {
    _userData.useTint = useTint;
}

void SpineSkeletonInstance::setDebugMode(bool debug) {
    _userData.debugMode = debug;
}

void SpineSkeletonInstance::onTrackEntryEvent(TrackEntry *entry, EventType type, Event *event) {
    if (!entry->getRendererObject()) return;
    SpineWasmUtil::s_listenerID = _trackEntryListenerID;
    SpineWasmUtil::s_currentType = type;
    SpineWasmUtil::s_currentEntry = entry;
    SpineWasmUtil::s_currentEvent = event;
    spineTrackListenerCallback();
}

void SpineSkeletonInstance::onAnimationStateEvent(TrackEntry *entry, EventType type, Event *event) {
    SpineWasmUtil::s_currentType = type;
    SpineWasmUtil::s_currentEntry = entry;
    SpineWasmUtil::s_currentEvent = event;
    if (_eventListenerID != 0) {
        SpineWasmUtil::s_listenerID = _eventListenerID;
        spineListenerCallBackFromJS();
    }
}

void SpineSkeletonInstance::resizeSlotRegion(const spine::String &slotName, uint32_t width, uint32_t height, bool createNew) {
    if (!_skeleton) return;
    auto* slot = _skeleton->findSlot(slotName);
    if (!slot) return;
    auto*attachment = slot->getAttachment();
    if (!attachment) return;
    if (createNew) {
        attachment = attachment->copy();
        slot->setAttachment(attachment);
    }
    if (attachment->getRTTI().isExactly(spine::RegionAttachment::rtti)) {
        auto *region = static_cast<RegionAttachment *>(attachment);
        region->setRegionWidth(width);
        region->setRegionHeight(height);
        region->setRegionOriginalWidth(width);
        region->setRegionOriginalHeight(height);
        region->setWidth(width);
        region->setHeight(height);
        region->setUVs(0, 0, 1.0f, 1.0f, false);
        region->updateOffset();
        auto *attachmentVertices = static_cast<AttachmentVertices *>(region->getRendererObject());
        if (createNew) {
            attachmentVertices = attachmentVertices->copy();
            region->setRendererObject(attachmentVertices);
        }
        V3F_T2F_C4B *vertices = attachmentVertices->_triangles->verts;
        const auto &UVs = region->getUVs();
        for (int i = 0, ii = 0; i < 4; ++i, ii += 2) {
            vertices[i].texCoord.u = UVs[ii];
            vertices[i].texCoord.v = UVs[ii + 1];
        }
    } else if (attachment->getRTTI().isExactly(spine::MeshAttachment::rtti)) {
        auto *mesh = static_cast<MeshAttachment *>(attachment);
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
        auto *attachmentVertices = static_cast<AttachmentVertices *>(mesh->getRendererObject());
        if (createNew) {
            attachmentVertices = attachmentVertices->copy();
            mesh->setRendererObject(attachmentVertices);
        }
        V3F_T2F_C4B *vertices = attachmentVertices->_triangles->verts;
        const auto &UVs = mesh->getUVs();
        for (size_t i = 0, ii = 0, nn = mesh->getWorldVerticesLength(); ii < nn; ++i, ii += 2) {
            vertices[i].texCoord.u = UVs[ii];
            vertices[i].texCoord.v = UVs[ii + 1];
        }
    }
}

void SpineSkeletonInstance::setSlotTexture(const spine::String &slotName, spine::String textureID) {
    if (!_skeleton) return;
    auto* slot = _skeleton->findSlot(slotName);
    if (!slot) return;
    _userData.useSlotTexture = true;

    _slotTextureSet.put(slot, textureID);
}