#pragma once

#include <spine/spine.h>
#include <string>

class SpineWasmUtil {
public:
    static void spineWasmInit();
    static void spineWasmDestroy();
    static uint32_t queryStoreMemory(uint32_t size);
    static void freeStoreMemory();

    static spine::SkeletonData* querySpineSkeletonDataByUUID(const spine::String& uuid);
    static spine::SkeletonData* createSpineSkeletonDataWithJson(const spine::String& jsonStr, const spine::String& altasStr);
    static spine::SkeletonData* createSpineSkeletonDataWithBinary(uint32_t byteSize, const spine::String& altasStr);
    static void registerSpineSkeletonDataWithUUID(spine::SkeletonData* data, const spine::String& uuid);
    static void destroySpineSkeletonDataWithUUID(const spine::String& uuid);
    static void destroySpineSkeleton(spine::Skeleton* skeleton);

    static uint32_t getCurrentListenerID();
    static spine::EventType getCurrentEventType();
    static spine::TrackEntry* getCurrentTrackEntry();
    static spine::Event* getCurrentEvent();

    static uint32_t s_listenerID;
    static spine::EventType s_currentType;
    static spine::TrackEntry* s_currentEntry;
    static spine::Event* s_currentEvent;

    static uint8_t* s_mem;
    static uint32_t s_memSize;
};
