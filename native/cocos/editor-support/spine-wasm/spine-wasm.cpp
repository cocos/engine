#include "spine-wasm.h"
#include "AtlasAttachmentLoaderExtension.h"
#include "spine-mesh-data.h"
#include "util-function.h"
#include "wasmSpineExtension.h"

#include <emscripten/emscripten.h>
#include <emscripten/val.h>

#include "spine/HashMap.h"

using namespace spine;

static void logToConsole(const char* message) {
    EM_ASM({
        console.log(UTF8ToString($0));
    }, message);
}

namespace {
    HashMap<String, SkeletonData*> skeletonDataMap{};

    static void updateAttachmentVerticesTextureId(SkeletonData* skeletonData, const spine::Vector<spine::String>& textureNames, const spine::Vector<spine::String>& textureUUIDs) {
        spine::HashMap<spine::String, spine::String> textureMap{};
        int textureSize = textureNames.size();
        for (int i = 0; i < textureSize; ++i) {
            textureMap.put(textureNames[i], textureUUIDs[i]);
        }

        auto& skins = skeletonData->getSkins();
        auto skinSize = skins.size();
        for (int i = 0; i < skinSize; ++i) {
            auto* skin = skins[i];
            auto entries = skin->getAttachments();
            while (entries.hasNext()) {
                Skin::AttachmentMap::Entry& entry = entries.next();
                AttachmentVertices* attachmentVertices;
                auto* attachment = entry._attachment;
                if (attachment->getRTTI().isExactly(MeshAttachment::rtti)) {
                    auto* meshAttachment = static_cast<MeshAttachment *>(attachment);
                    attachmentVertices = static_cast<AttachmentVertices*>(meshAttachment->getRendererObject());
                } else {
                    auto* regionAttachment = static_cast<RegionAttachment *>(attachment);
                    attachmentVertices = static_cast<AttachmentVertices*>(regionAttachment->getRendererObject());
                }
                auto& textureName = attachmentVertices->_textureId;
                if (textureMap.containsKey(textureName)) {
                    attachmentVertices->_textureId = textureMap[textureName];
                } else {
                    spine::String logInfo(attachment->getName());
                    logInfo.append(" attachment's texture is not exist ");
                    logInfo.append(textureName);
                    logToConsole(logInfo.buffer());
                }
            }
        }
    }
}

uint32_t SpineWasmUtil::s_listenerID = 0;
EventType SpineWasmUtil::s_currentType = EventType_Event;
TrackEntry* SpineWasmUtil::s_currentEntry = nullptr;
Event* SpineWasmUtil::s_currentEvent = nullptr;
uint8_t* SpineWasmUtil::s_mem = nullptr;

void SpineWasmUtil::spineWasmInit() {
    // LogUtil::Initialize();
    SpineExtension* extension = new WasmSpineExtension();
    SpineExtension::setInstance(extension);

    SpineMeshData::initMeshMemory();

    //LogUtil::PrintToJs("spineWasmInit");
}

void SpineWasmUtil::spineWasmDestroy() {
    auto* extension = SpineExtension::getInstance();
    delete extension;
    freeStoreMemory();
    SpineMeshData::releaseMeshMemory();
    // LogUtil::ReleaseBuffer();
}

SkeletonData* SpineWasmUtil::querySpineSkeletonDataByUUID(const String& uuid) {
    if (!skeletonDataMap.containsKey(uuid)) {
        return nullptr;
    }
    return skeletonDataMap[uuid];
}

SkeletonData* SpineWasmUtil::createSpineSkeletonDataWithJson(const String& jsonStr, const String& altasStr, const spine::Vector<spine::String>& textureNames, const spine::Vector<spine::String>& textureUUIDs) {
#if ENABLE_JSON_PARSER
    auto* atlas = new Atlas(altasStr.buffer(), altasStr.length(), "", nullptr, false);
    if (!atlas) {
        return nullptr;
    }
    AttachmentLoader* attachmentLoader = new AtlasAttachmentLoaderExtension(atlas);
    SkeletonJson json(attachmentLoader);
    json.setScale(1.0F);
    SkeletonData* skeletonData = json.readSkeletonData(jsonStr.buffer());

    updateAttachmentVerticesTextureId(skeletonData, textureNames, textureUUIDs);

    return skeletonData;
#else
    return nullptr;
#endif
}

SkeletonData* SpineWasmUtil::createSpineSkeletonDataWithBinary(uint32_t byteSize, const String& altasStr, const spine::Vector<spine::String>& textureNames, const spine::Vector<spine::String>& textureUUIDs) {
#if ENABLE_BINARY_PARSER
    auto* atlas = new Atlas(altasStr.buffer(), altasStr.length(), "", nullptr, false);
    if (!atlas) {
        return nullptr;
    }
    AttachmentLoader* attachmentLoader = new AtlasAttachmentLoaderExtension(atlas);
    SkeletonBinary binary(attachmentLoader);
    binary.setScale(1.0F);
    SkeletonData* skeletonData = binary.readSkeletonData(s_mem, byteSize);

    updateAttachmentVerticesTextureId(skeletonData, textureNames, textureUUIDs);

    return skeletonData;
#else
    return nullptr;
#endif
}

void SpineWasmUtil::registerSpineSkeletonDataWithUUID(SkeletonData* data, const String& uuid) {
    if (!skeletonDataMap.containsKey(uuid)) {
        skeletonDataMap.put(uuid, data);
    }
}

void SpineWasmUtil::destroySpineSkeletonDataWithUUID(const String& uuid) {
    if (skeletonDataMap.containsKey(uuid)) {
        auto* data = skeletonDataMap[uuid];
        delete data;
        skeletonDataMap.remove(uuid);
    }
}

void SpineWasmUtil::destroySpineSkeleton(Skeleton* skeleton) {
    if (skeleton) {
        delete skeleton;
    }
}

uint32_t SpineWasmUtil::createStoreMemory(uint32_t size) {
    s_mem = new uint8_t[size];

    return (uint32_t)s_mem;
}

void SpineWasmUtil::freeStoreMemory() {
    if (s_mem) {
        delete[] s_mem;
        s_mem = nullptr;
    }
}

uint32_t SpineWasmUtil::getCurrentListenerID() {
    return s_listenerID;
}

EventType SpineWasmUtil::getCurrentEventType() {
    return s_currentType;
}

TrackEntry* SpineWasmUtil::getCurrentTrackEntry() {
    return s_currentEntry;
}

Event* SpineWasmUtil::getCurrentEvent() {
    return s_currentEvent;
}