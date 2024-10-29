#pragma once

#include <spine/spine.h>

// #include <map>
#include <cstdint>
#include <string>
#include "mesh-type-define.h"
#include "spine-model.h"

enum DEBUG_SHAPE_TYPE {
    DEBUG_REGION = 0,
    DEBUG_MESH = 1
};
class SpineDebugShape {
public:
    SpineDebugShape() {}
    ~SpineDebugShape() {}
    uint32_t type = 0;
    uint32_t vOffset = 0;
    uint32_t vCount = 0;
    uint32_t iOffset = 0;
    uint32_t iCount = 0;
};

class SpineSkeletonInstance {
    struct UserData {
        bool useTint = false;
        bool premultipliedAlpha = false;
        bool debugMode = false;
        bool useSlotTexture = false;
        Color4F color = Color4F(1.0F, 1.0F, 1.0F, 1.0F);
    };

public:
    SpineSkeletonInstance();
    ~SpineSkeletonInstance();
    spine::Skeleton *initSkeleton(spine::SkeletonData *data);
    spine::TrackEntry *setAnimation(float trackIndex, const std::string &name, bool loop);
    void setSkin(const std::string &name);
    void updateAnimation(float dltTime);
    SpineModel *updateRenderData();
    void setPremultipliedAlpha(bool val);
    void setUseTint(bool useTint);
    void setDebugMode(bool debug);
    void setColor(float r, float g, float b, float a);
    void setJitterEffect(spine::JitterVertexEffect *effect);
    void setSwirlEffect(spine::SwirlVertexEffect *effect);
    void clearEffect();
    spine::AnimationState *getAnimationState();
    void setMix(const std::string &from, const std::string &to, float duration);
    inline void setListener(uint32_t listenerID) { _eventListenerID = listenerID;}
    void setTrackEntryListener(uint32_t trackId, spine::TrackEntry *entry);
    void onAnimationStateEvent(spine::TrackEntry *entry, spine::EventType type, spine::Event *event);
    void onTrackEntryEvent(spine::TrackEntry *entry, spine::EventType type, spine::Event *event);
    spine::Vector<SpineDebugShape> &getDebugShapes();
    void resizeSlotRegion(const std::string &slotName, uint32_t width, uint32_t height, bool createNew = false);
    void setSlotTexture(const std::string &slotName, uint32_t index);
    void destroy();
    bool isCache{false};
    bool enable{true};
    float dtRate{1.0F};
private:
    void collectMeshData();

private:
    spine::Skeleton *_skeleton = nullptr;
    spine::SkeletonData *_skeletonData = nullptr;
    spine::AnimationStateData *_animStateData = nullptr;
    spine::AnimationState *_animState = nullptr;
    spine::SkeletonClipping *_clipper = nullptr;
    spine::VertexEffect *_effect = nullptr;
    SpineModel *_model = nullptr;
    uint32_t _eventListenerID = 0;
    uint32_t _trackEntryListenerID = 0;
    UserData _userData;
    spine::Vector<SpineDebugShape> _debugShapes{};
    // std::map<spine::Slot *, uint32_t> _slotTextureSet{};
    spine::HashMap<spine::Slot*, uint32_t> _slotTextureSet{};
};
