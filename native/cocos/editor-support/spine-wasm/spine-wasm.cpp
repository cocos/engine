#include "spine-wasm.h"
#include <map>
#include "AtlasAttachmentLoaderExtension.h"
#include "spine-mesh-data.h"
#include "util-function.h"
#include "wasmSpineExtension.h"

using namespace spine;

std::map<std::string, SkeletonData*> skeletonDataMap{};

uint32_t SpineWasmUtil::s_listenerID = 0;
EventType SpineWasmUtil::s_currentType = EventType_Event;
TrackEntry* SpineWasmUtil::s_currentEntry = nullptr;
Event* SpineWasmUtil::s_currentEvent = nullptr;
uint8_t* SpineWasmUtil::s_mem = nullptr;
uint32_t SpineWasmUtil::s_memSize = 0;

void SpineWasmUtil::spineWasmInit() {
    LogUtil::Initialize();
    spine::SpineExtension* tension = new WasmSpineExtension();
    spine::SpineExtension::setInstance(tension);

    SpineMeshData::initMeshMemory();

    //LogUtil::PrintToJs("spineWasmInit");
}

void SpineWasmUtil::spineWasmDestroy() {
    auto* extension = spine::SpineExtension::getInstance();
    delete extension;
    freeStoreMemory();
    SpineMeshData::releaseMeshMemory();
    LogUtil::ReleaseBuffer();
}

SkeletonData* SpineWasmUtil::querySpineSkeletonDataByUUID(const std::string& uuid) {
    auto iter = skeletonDataMap.find(uuid);
    if (iter == skeletonDataMap.end()) {
        return nullptr;
    }
    SkeletonData* ptrVal = iter->second;
    return ptrVal;
}

SkeletonData* SpineWasmUtil::createSpineSkeletonDataWithJson(const std::string& jsonStr, const std::string& altasStr) {
#if ENABLE_JSON_PARSER
    auto* atlas = new Atlas(altasStr.c_str(), altasStr.size(), "", nullptr, false);
    if (!atlas) {
        return nullptr;
    }
    AttachmentLoader* attachmentLoader = new AtlasAttachmentLoaderExtension(atlas);
    spine::SkeletonJson json(attachmentLoader);
    json.setScale(1.0F);
    SkeletonData* skeletonData = json.readSkeletonData(jsonStr.c_str());

    return skeletonData;
#else
    return nullptr;
#endif
}

SkeletonData* SpineWasmUtil::createSpineSkeletonDataWithBinary(uint32_t byteSize, const std::string& altasStr) {
    auto* atlas = new Atlas(altasStr.c_str(), altasStr.size(), "", nullptr, false);
    if (!atlas) {
        return nullptr;
    }
    AttachmentLoader* attachmentLoader = new AtlasAttachmentLoaderExtension(atlas);
    spine::SkeletonBinary binary(attachmentLoader);
    binary.setScale(1.0F);
    SkeletonData* skeletonData = binary.readSkeletonData(s_mem, byteSize);
    return skeletonData;
}

void SpineWasmUtil::registerSpineSkeletonDataWithUUID(SkeletonData* data, const std::string& uuid) {
    auto iter = skeletonDataMap.find(uuid);
    if (iter == skeletonDataMap.end()) {
        skeletonDataMap[uuid] = data;
    }
}

void SpineWasmUtil::destroySpineSkeletonDataWithUUID(const std::string& uuid) {
    auto iter = skeletonDataMap.find(uuid);
    if (iter != skeletonDataMap.end()) {
        auto* data = skeletonDataMap[uuid];
        delete data;
        skeletonDataMap.erase(iter);
    }
}

void SpineWasmUtil::destroySpineSkeleton(Skeleton* skeleton) {
    if (skeleton) {
        delete skeleton;
    }
}

uint32_t SpineWasmUtil::queryStoreMemory(uint32_t size) {
    if (s_mem) {
        if (s_memSize < size) {
            delete[] s_mem;
            s_mem = new uint8_t[size];
            s_memSize = size;
        }
    } else {
        s_mem = new uint8_t[size];
        s_memSize = size;
    }
    return (uint32_t)s_mem;
}

void SpineWasmUtil::freeStoreMemory() {
    if (s_mem) {
        delete[] s_mem;
        s_mem = nullptr;
    }
    s_memSize = 0;
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