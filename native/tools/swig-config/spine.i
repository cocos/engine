// Define module
// target_namespace means the name exported to JS, could be same as which in other modules
// spine at the last means the suffix of binding function name, different modules should use unique name
// Note: doesn't support number prefix
%module(target_namespace="spine") spine

// Disable some swig warnings, find warning number reference here ( https://www.swig.org/Doc4.1/Warnings.html )
#pragma SWIG nowarn=503,302,401,317,402

// Insert code at the beginning of generated header file (.h)
%insert(header_file) %{
#pragma once
#include "bindings/jswrapper/SeApi.h"
#include "bindings/manual/jsb_conversions.h"
#include "editor-support/spine-creator-support/spine-cocos2dx.h"
#include "editor-support/spine-creator-support/Vector2.h"
%}

// Insert code at the beginning of generated source file (.cpp)
%{
#include "bindings/auto/jsb_2d_auto.h"
#include "bindings/auto/jsb_assets_auto.h"
#include "bindings/auto/jsb_cocos_auto.h"
#include "bindings/auto/jsb_spine_auto.h"
using namespace spine;

#define SWIGINTERN static
%}

// ----- Ignore Section ------
// Brief: Classes, methods or attributes need to be ignored
//
// Usage:
//
//  %ignore your_namespace::your_class_name;
//  %ignore your_namespace::your_class_name::your_method_name;
//  %ignore your_namespace::your_class_name::your_attribute_name;
//
// Note: 
//  1. 'Ignore Section' should be placed before attribute definition and %import/%include
//  2. namespace is needed
//
%ignore cc::RefCounted;
%ignore *::rtti;
%ignore spine::SkeletonCache::SegmentData;
%ignore spine::SkeletonCache::BoneData;
%ignore spine::SkeletonCache::FrameData;
%ignore spine::SkeletonCache::AnimationData;
%ignore spine::Skin::AttachmentMap::getEntries;
%ignore spine::AttachmentLoader::getRTTI;

%ignore spine::Polygon::Polygon;
%ignore spine::Polygon::_vertices;

%ignore spine::SkeletonRenderer::create;
%ignore spine::SkeletonRenderer::initWithJsonFile;
%ignore spine::SkeletonRenderer::initWithBinaryFile;
%ignore spine::SkeletonRenderer::createWithData;
%ignore spine::SkeletonRenderer::initWithData;
%ignore spine::SkeletonRenderer::createWithSkeleton;
%ignore spine::SkeletonRenderer::createWithFile;
%ignore spine::SkeletonRenderer::requestDrawInfo;
%ignore spine::SkeletonRenderer::requestMaterial;
%ignore spine::SkeletonAnimation::createWithData;
%ignore spine::SkeletonAnimation::onTrackEntryEvent;
%ignore spine::SkeletonAnimation::onAnimationStateEvent;
%ignore spine::TrackEntry::setListener;
%ignore spine::AnimationState::setListener;
%ignore spine::Attachment::getRTTI;
%ignore spine::AttachmentTimeline::getRTTI;
%ignore spine::BoundingBoxAttachment::getRTTI;
%ignore spine::Bone::getRTTI;
%ignore spine::Bone::worldToLocal(float, float, float&, float&);
%ignore spine::Bone::localToWorld(float, float, float&, float&);
%ignore spine::ClippingAttachment::getRTTI;
%ignore spine::ColorTimeline::getRTTI;
%ignore spine::CurveTimeline::getRTTI;
%ignore spine::DeformTimeline::getVertices;
%ignore spine::DeformTimeline::getRTTI;
%ignore spine::DrawOrderTimeline::getRTTI;
%ignore spine::EventTimeline::getRTTI;
%ignore spine::IkConstraint::getRTTI;
%ignore spine::IkConstraint::apply(Bone&, float, float, bool, bool, bool, float);
%ignore spine::IkConstraint::apply(Bone&, Bone&, float, float, int, bool, float, float);
%ignore spine::IkConstraintTimeline::getRTTI;
%ignore spine::MeshAttachment::getRTTI;
%ignore spine::PathAttachment::getRTTI;
%ignore spine::PathConstraint::getRTTI;
%ignore spine::PathConstraintMixTimeline::getRTTI;
%ignore spine::PathConstraintPositionTimeline::getRTTI;
%ignore spine::PathConstraintSpacingTimeline::getRTTI;
%ignore spine::PointAttachment::getRTTI;
%ignore spine::RegionAttachment::getRTTI;
%ignore spine::RotateTimeline::getRTTI;
%ignore spine::ScaleTimeline::getRTTI;
%ignore spine::ShearTimeline::getRTTI;
%ignore spine::Skin::findNamesForSlot;
%ignore spine::Skin::getAttachments;
%ignore spine::Timeline::getRTTI;
%ignore spine::TransformConstraint::getRTTI;
%ignore spine::TransformConstraintTimeline::getRTTI;
%ignore spine::TranslateTimeline::getRTTI;
%ignore spine::TwoColorTimeline::getRTTI;
%ignore spine::VertexAttachment::getRTTI;
%ignore spine::Interpolation::getRTTI;
%ignore spine::VertexEffect::getRTTI;
%ignore spine::ConstraintData::getRTTI;

%ignore spine::SkeletonDataMgr::destroyInstance;
%ignore spine::SkeletonDataMgr::hasSkeletonData;
%ignore spine::SkeletonDataMgr::setSkeletonData;
%ignore spine::SkeletonDataMgr::retainByUUID;
%ignore spine::SkeletonDataMgr::releaseByUUID;
%ignore spine::SkeletonCacheAnimation::render;
%ignore spine::SkeletonCacheAnimation::requestDrawInfo;
%ignore spine::SkeletonCacheAnimation::requestMaterial;
%ignore spine::Timeline::apply(Skeleton&, float, float, Vector<Event*>*, float, MixBlend, MixDirection);
%ignore spine::AnimationState::apply(Skeleton&);
%ignore spine::Animation::apply(Skeleton&, float, float, bool, Vector<Event*>*, float, MixBlend, MixDirection);
%ignore spine::VertexAttachment::computeWorldVertices;
%ignore spine::Bone::Bone(BoneData&, Skeleton&, Bone*);
%ignore spine::Bone::Bone(BoneData&, Skeleton&);
%ignore spine::Event::Event(float, const EventData&);
%ignore spine::IkConstraint::IkConstraint(IkConstraintData&, Skeleton&);
%ignore spine::PathConstraint::PathConstraint(PathConstraintData&, Skeleton&);
%ignore spine::PointAttachment::computeWorldPosition;
%ignore spine::PointAttachment::computeWorldRotation(Bone&);
%ignore spine::RegionAttachment::computeWorldVertices;
%ignore spine::Slot::Slot(SlotData&, Bone&);
%ignore spine::VertexEffect::begin(Skeleton &);
%ignore spine::TransformConstraint::TransformConstraint(TransformConstraintData&, Skeleton&);
%ignore spine::SkeletonBounds::update(Skeleton&, bool);
%ignore spine::SlotData::SlotData(int, const String&, BoneData&);
%ignore spine::SwirlVertexEffect::SwirlVertexEffect(float, Interpolation&);
%ignore spine::SwirlVertexEffect::transform(float&, float&);
%ignore spine::JitterVertexEffect::transform(float&, float&);
%ignore spine::VertexEffect::transform(float&, float&);
%ignore spine::DeformTimeline::setFrame(int, float, Vector<float>&);
%ignore spine::DrawOrderTimeline::setFrame(size_t, float, Vector<int>&);
%ignore spine::Skeleton::getBounds;
%ignore spine::Bone::updateWorldTransform(float, float, float, float, float, float, float);
%ignore spine::Skin::findAttachmentsForSlot;
%ignore spine::SkeletonBinary::readSkeletonData(const unsigned char*, int);
%ignore spine::AttachmentLoader::newRegionAttachment(Skin&, const String&, const String&);
%ignore spine::AttachmentLoader::newMeshAttachment(Skin&, const String&, const String&);
%ignore spine::AttachmentLoader::newBoundingBoxAttachment(Skin&, const String&);
%ignore spine::AttachmentLoader::newPathAttachment(Skin&, const String&);
%ignore spine::AttachmentLoader::newPointAttachment(Skin&, const String&);
%ignore spine::AttachmentLoader::newClippingAttachment(Skin&, const String&);
%ignore spine::TextureLoader::load(AtlasPage&, const String&);

// ----- Rename Section ------
// Brief: Classes, methods or attributes needs to be renamed
//
// Usage:
//
//  %rename(rename_to_name) your_namespace::original_class_name;
//  %rename(rename_to_name) your_namespace::original_class_name::method_name;
//  %rename(rename_to_name) your_namespace::original_class_name::attribute_name;
// 
// Note:
//  1. 'Rename Section' should be placed before attribute definition and %import/%include
//  2. namespace is needed
%rename(create) spine::SkeletonAnimation::createWithFile;
%rename(setCompleteListenerNative) spine::SkeletonAnimation::setCompleteListener;
%rename(setTrackCompleteListenerNative) spine::SkeletonAnimation::setTrackCompleteListener;
%rename(create) spine::SkeletonRenderer::createWithFile;

%rename(frames) spine::TranslateTimeline::_frames;
%rename(boneIndex) spine::TranslateTimeline::_boneIndex;
%rename(frames) spine::TwoColorTimeline::_frames;
%rename(frames) spine::IkConstraintTimeline::_frames;
%rename(ikConstraintIndex) spine::IkConstraintTimeline::_ikConstraintIndex;
%rename(frames) spine::TransformConstraintTimeline::_frames;
%rename(transformConstraintIndex) spine::TransformConstraintTimeline::_transformConstraintIndex;
%rename(frames) spine::PathConstraintPositionTimeline::_frames;
%rename(pathConstraintIndex) spine::PathConstraintPositionTimeline::_pathConstraintIndex;
%rename(frames) spine::PathConstraintMixTimeline::_frames;
%rename(pathConstraintIndex) spine::PathConstraintMixTimeline::_pathConstraintIndex;
%rename(events) spine::AnimationState::_events;
%rename(queue) spine::AnimationState::_queue;
%rename(animationsChanged) spine::AnimationState::_animationsChanged;
%rename(trackEntryPool) spine::AnimationState::_trackEntryPool;
%rename(listener) spine::TrackEntry::_listener;
%rename(nextAnimationLast) spine::TrackEntry::_nextAnimationLast;
%rename(trackLast) spine::TrackEntry::_trackLast;
%rename(nextTrackLast) spine::TrackEntry::_nextTrackLast;
%rename(interruptAlpha) spine::TrackEntry::_interruptAlpha;
%rename(totalAlpha) spine::TrackEntry::_totalAlpha;
%rename(timelineMode) spine::TrackEntry::_timelineMode;
%rename(timelineHoldMix) spine::TrackEntry::_timelineHoldMix;
%rename(timelinesRotation) spine::TrackEntry::_timelinesRotation;
%rename(drainDisabled) spine::EventQueue::_drainDisabled;
%rename(animState) spine::EventQueue::_state;
%rename(setMixWith) spine::AnimationStateData::setMix;
%rename(TextureAtlas) spine::Atlas;
%rename(sorted) spine::Bone::_sorted;
%rename(spaces) spine::PathConstraint::_spaces;
%rename(positions) spine::PathConstraint::_positions;
%rename(world) spine::PathConstraint::_world;
%rename(curves) spine::PathConstraint::_curves;
%rename(lengths) spine::PathConstraint::_lengths;
%rename(segments) spine::PathConstraint::_segments;
%rename(attachmentLoader) spine::SkeletonBinary::_attachmentLoader;
%rename(minX) spine::SkeletonBounds::_minX;
%rename(minY) spine::SkeletonBounds::_minY;
%rename(maxX) spine::SkeletonBounds::_maxX;
%rename(maxY) spine::SkeletonBounds::_maxY;
%rename(boundingBoxes) spine::SkeletonBounds::_boundingBoxes;
%rename(polygons) spine::SkeletonBounds::_polygons;
%rename(attachmentLoader) spine::SkeletonJson::_attachmentLoader;
%rename(JitterEffect) spine::JitterVertexEffect;
%rename(SwirlEffect) spine::SwirlVertexEffect;
%rename(setSkinByName) spine::Skeleton::setSkin(const String &);
%rename(slotIndex) spine::Skin::AttachmentMap::Entry::_slotIndex;
%rename(name) spine::Skin::AttachmentMap::Entry::_name;
%rename(attachment) spine::Skin::AttachmentMap::Entry::_attachment;
%rename(signum) spine::MathUtil::sign(float);
%rename(TextureAtlasPage) spine::AtlasPage;
%rename(TextureAtlasRegion) spine::AtlasRegion;

// ----- Module Macro Section ------
// Brief: Generated code should be wrapped inside a macro
// Usage:
//  1. Configure for class
//    %module_macro(CC_USE_GEOMETRY_RENDERER) cc::pipeline::GeometryRenderer;
//  2. Configure for member function or attribute
//    %module_macro(CC_USE_GEOMETRY_RENDERER) cc::pipeline::RenderPipeline::geometryRenderer;
// Note: Should be placed before 'Attribute Section'

// Write your code bellow


// ----- Attribute Section ------
// Brief: Define attributes ( JS properties with getter and setter )
// Usage:
//  1. Define an attribute without setter
//    %attribute(your_namespace::your_class_name, cpp_member_variable_type, js_property_name, cpp_getter_name)
//  2. Define an attribute with getter and setter
//    %attribute(your_namespace::your_class_name, cpp_member_variable_type, js_property_name, cpp_getter_name, cpp_setter_name)
//  3. Define an attribute without getter
//    %attribute_writeonly(your_namespace::your_class_name, cpp_member_variable_type, js_property_name, cpp_setter_name)
//
// Note:
//  1. Don't need to add 'const' prefix for cpp_member_variable_type 
//  2. The return type of getter should keep the same as the type of setter's parameter
//  3. If using reference, add '&' suffix for cpp_member_variable_type to avoid generated code using value assignment
//  4. 'Attribute Section' should be placed before 'Import Section' and 'Include Section'
//

%attribute(spine::Animation, spine::String&, name, getName);
%attribute(spine::Animation, spine::Vector<spine::Timeline*>&, timelines, getTimelines);
%attribute(spine::Animation, float, duration, getDuration, setDuration);

%attribute(spine::RotateTimeline, int, boneIndex, getBoneIndex, setBoneIndex);
%attribute(spine::RotateTimeline, spine::Vector<float>&, frames, getFrames);

%attribute(spine::ColorTimeline, int, slotIndex, getSlotIndex, setSlotIndex);
%attribute(spine::ColorTimeline, spine::Vector<float>&, frames, getFrames);

%attribute(spine::TwoColorTimeline, int, slotIndex, getSlotIndex, setSlotIndex);

%attribute(spine::AttachmentTimeline, size_t, slotIndex, getSlotIndex, setSlotIndex);
%attribute(spine::AttachmentTimeline, spine::Vector<float>&, frames, getFrames);
%attribute(spine::AttachmentTimeline, spine::Vector<spine::String>&, attachmentNames, getAttachmentNames);

%attribute(spine::DeformTimeline, int, slotIndex, getSlotIndex, setSlotIndex);
%attribute(spine::DeformTimeline, spine::Vector<float>&, frames, getFrames);
%attribute(spine::DeformTimeline, spine::Vector<float>&, frameVertices, getVertices);
%attribute(spine::DeformTimeline, spine::VertexAttachment*, attachment, getAttachment);

%attribute(spine::EventTimeline, spine::Vector<float>, frames, getFrames);
%attribute(spine::EventTimeline, spine::Vector<spine::Event*>&, events, getEvents);

%attribute(spine::DrawOrderTimeline, spine::Vector<float>&, frames, getFrames);
%attribute(spine::DrawOrderTimeline, spine::Vector<spine::Vector<int>>&, drawOrders, getDrawOrders);

%attribute(spine::AnimationState, spine::AnimationStateData*, data, getData);
%attribute(spine::AnimationState, spine::Vector<spine::TrackEntry*>&, tracks, getTracks);
%attribute(spine::AnimationState, float, timeScale, getTimeScale, setTimeScale);

%attribute(spine::TrackEntry, spine::Animation*, animation, getAnimation);
%attribute(spine::TrackEntry, spine::TrackEntry*, next, getNext);
%attribute(spine::TrackEntry, spine::TrackEntry*, mixingFrom, getMixingFrom);
%attribute(spine::TrackEntry, spine::TrackEntry*, mixingTo, getMixingTo);
%attribute(spine::TrackEntry, int, trackIndex, getTrackIndex);
%attribute(spine::TrackEntry, bool, loop, getLoop, setLoop);
%attribute(spine::TrackEntry, bool, holdPrevious, getHoldPrevious, setHoldPrevious);
%attribute(spine::TrackEntry, float, eventThreshold, getEventThreshold, setEventThreshold);
%attribute(spine::TrackEntry, float, attachmentThreshold, getAttachmentThreshold, setAttachmentThreshold);
%attribute(spine::TrackEntry, float, drawOrderThreshold, getDrawOrderThreshold, setDrawOrderThreshold);
%attribute(spine::TrackEntry, float, animationStart, getAnimationStart, setAnimationStart);
%attribute(spine::TrackEntry, float, animationEnd, getAnimationEnd, setAnimationEnd);
%attribute(spine::TrackEntry, float, animationLast, getAnimationLast, setAnimationLast);
%attribute(spine::TrackEntry, float, delay, getDelay, setDelay);
%attribute(spine::TrackEntry, float, trackTime, getTrackTime, setTrackTime);
%attribute(spine::TrackEntry, float, trackEnd, getTrackEnd, setTrackEnd);
%attribute(spine::TrackEntry, float, timeScale, getTimeScale, setTimeScale);
%attribute(spine::TrackEntry, float, alpha, getAlpha, setAlpha);
%attribute(spine::TrackEntry, float, mixTime, getMixTime, setMixTime);
%attribute(spine::TrackEntry, float, mixDuration, getMixDuration, setMixDuration);
%attribute(spine::TrackEntry, spine::MixBlend, mixBlend, getMixBlend, setMixBlend);

%attribute(spine::AnimationStateData, spine::SkeletonData*, skeletonData, getSkeletonData);
%attribute(spine::AnimationStateData, float, defaultMix, getDefaultMix, setDefaultMix);

%attribute(spine::Bone, spine::BoneData&, data, getData);
%attribute(spine::Bone, spine::Skeleton&, skeleton, getSkeleton);
%attribute(spine::Bone, spine::Bone*, parent, getParent);
%attribute(spine::Bone, spine::Vector<spine::Bone*>&, children, getChildren);
%attribute(spine::Bone, float, x, getX, setX);
%attribute(spine::Bone, float, y, getY, setY);
%attribute(spine::Bone, float, rotation, getRotation, setRotation);
%attribute(spine::Bone, float, scaleX, getScaleX, setScaleX);
%attribute(spine::Bone, float, scaleY, getScaleY, setScaleY);
%attribute(spine::Bone, float, shearX, getShearX, setShearX);
%attribute(spine::Bone, float, shearY, getShearY, setShearY);
%attribute(spine::Bone, float, ax, getAX, setAX);
%attribute(spine::Bone, float, ay, getAY, setAY);
%attribute(spine::Bone, float, arotation, getAppliedRotation, setAppliedRotation);
%attribute(spine::Bone, float, ascaleX, getAScaleX, setAScaleX);
%attribute(spine::Bone, float, ascaleY, getAScaleY, setAScaleY);
%attribute(spine::Bone, float, ashearX, getAShearX, setAShearX);
%attribute(spine::Bone, float, ashearY, getAShearY, setAShearY);
%attribute(spine::Bone, bool, appliedValid, isAppliedValid, setAppliedValid);
%attribute(spine::Bone, float, a, getA, setA);
%attribute(spine::Bone, float, b, getB, setB);
%attribute(spine::Bone, float, c, getC, setC);
%attribute(spine::Bone, float, d, getD, setD);
%attribute(spine::Bone, float, worldX, getWorldX, setWorldX);
%attribute(spine::Bone, float, worldY, getWorldY, setWorldY);
%attribute(spine::Bone, bool, active, isActive, setActive);

%attribute(spine::BoneData, int, index, getIndex);
%attribute(spine::BoneData, spine::String&, name, getName);
%attribute(spine::BoneData, spine::BoneData*, parent, getParent);
%attribute(spine::BoneData, float, length, getLength, setLength);
%attribute(spine::BoneData, float, x, getX, setX);
%attribute(spine::BoneData, float, y, getY, setY);
%attribute(spine::BoneData, float, rotation, getRotation, setRotation);
%attribute(spine::BoneData, float, scaleX, getScaleX, setScaleX);
%attribute(spine::BoneData, float, scaleY, getScaleY, setScaleY);
%attribute(spine::BoneData, float, shearX, getShearX, setShearX);
%attribute(spine::BoneData, float, shearY, getShearY, setShearY);
%attribute(spine::BoneData, spine::TransformMode, transformMode, getTransformMode, setTransformMode);
%attribute(spine::BoneData, bool, skinRequired, isSkinRequired, setSkinRequired);

%attribute(spine::ConstraintData, spine::String&, name, getName);
%attribute(spine::ConstraintData, size_t, order, getOrder, setOrder);
%attribute(spine::ConstraintData, bool, skinRequired, isSkinRequired, setSkinRequired);

%attribute(spine::Event, spine::EventData&, data, getData);
%attribute(spine::Event, int, intValue, getIntValue, setIntValue);
%attribute(spine::Event, float, floatValue, getFloatValue, setFloatValue);
%attribute(spine::Event, spine::String&, stringValue, getStringValue, setStringValue);
%attribute(spine::Event, float, time, getTime);
%attribute(spine::Event, float, volume, getVolume, setVolume);
%attribute(spine::Event, float, balance, getBalance, setBalance);

%attribute(spine::EventData, spine::String&, name, getName);
%attribute(spine::EventData, int, intValue, getIntValue, setIntValue);
%attribute(spine::EventData, float, floatValue, getFloatValue, setFloatValue);
%attribute(spine::EventData, spine::String&, stringValue, getStringValue, setStringValue);
%attribute(spine::EventData, float, volume, getVolume, setVolume);
%attribute(spine::EventData, float, balance, getBalance, setBalance);
%attribute(spine::EventData, spine::String&, audioPath, getAudioPath, setAudioPath);

%attribute(spine::IkConstraint, spine::IkConstraintData&, data, getData);
%attribute(spine::IkConstraint, spine::Vector<spine::Bone*>&, bones, getBones);
%attribute(spine::IkConstraint, spine::Bone*, target, getTarget, setTarget);
%attribute(spine::IkConstraint, int, bendDirection, getBendDirection, setBendDirection);
%attribute(spine::IkConstraint, bool, compress, getCompress, setCompress);
%attribute(spine::IkConstraint, bool, stretch, getStretch, setStretch);
%attribute(spine::IkConstraint, float, mix, getMix, setMix);
%attribute(spine::IkConstraint, float, softness, getSoftness, setSoftness);
%attribute(spine::IkConstraint, bool, active, isActive, setActive);

%attribute(spine::IkConstraintData, spine::Vector<spine::BoneData*>&, bones, getBones);
%attribute(spine::IkConstraintData, spine::BoneData*, target, getTarget);
%attribute(spine::IkConstraintData, int, bendDirection, getBendDirection, setBendDirection);
%attribute(spine::IkConstraintData, bool, compress, getCompress, setCompress);
%attribute(spine::IkConstraintData, bool, stretch, getStretch, setStretch);
%attribute(spine::IkConstraintData, bool, uniform, getUniform, setUniform);
%attribute(spine::IkConstraintData, float, mix, getMix, setMix);
%attribute(spine::IkConstraintData, float, softness, getSoftness, setSoftness);

%attribute(spine::PathConstraint, spine::PathConstraintData&, data, getData);
%attribute(spine::PathConstraint, spine::Vector<spine::Bone*>&, bones, getBones);
%attribute(spine::PathConstraint, spine::Slot*, target, getTarget, setTarget);
%attribute(spine::PathConstraint, float, position, getPosition, setPosition);
%attribute(spine::PathConstraint, float, spacing, getSpacing, setSpacing);
%attribute(spine::PathConstraint, float, rotateMix, getRotateMix, setRotateMix);
%attribute(spine::PathConstraint, float, translateMix, getTranslateMix, setTranslateMix);
%attribute(spine::PathConstraint, bool, active, isActive, setActive);

%attribute(spine::PathConstraintData, spine::Vector<spine::BoneData*>&, bones, getBones);
%attribute(spine::PathConstraintData, spine::SlotData*, target, getTarget, setTarget);
%attribute(spine::PathConstraintData, spine::PositionMode, positionMode, getPositionMode, setPositionMode);
%attribute(spine::PathConstraintData, spine::SpacingMode, spacingMode, getSpacingMode, setSpacingMode);
%attribute(spine::PathConstraintData, spine::RotateMode, rotateMode, getRotateMode, setRotateMode);
%attribute(spine::PathConstraintData, float, offsetRotation, getOffsetRotation, setOffsetRotation);
%attribute(spine::PathConstraintData, float, position, getPosition, setPosition);
%attribute(spine::PathConstraintData, float, spacing, getSpacing, setSpacing);
%attribute(spine::PathConstraintData, float, rotateMix, getRotateMix, setRotateMix);
%attribute(spine::PathConstraintData, float, translateMix, getTranslateMix, setTranslateMix);

%attribute(spine::Skeleton, spine::SkeletonData*, data, getData);
%attribute(spine::Skeleton, spine::Vector<spine::Bone*>&, bones, getBones);
%attribute(spine::Skeleton, spine::Vector<spine::Slot*>&, slots, getSlots);
%attribute(spine::Skeleton, spine::Vector<spine::Slot*>&, drawOrder, getDrawOrder);
%attribute(spine::Skeleton, spine::Vector<spine::IkConstraint*>&, ikConstraints, getIkConstraints);
%attribute(spine::Skeleton, spine::Vector<spine::TransformConstraint*>&, transformConstraints, getTransformConstraints);
%attribute(spine::Skeleton, spine::Vector<spine::PathConstraint*>&, pathConstraints, getPathConstraints);
%attribute(spine::Skeleton, spine::Vector<spine::Updatable*>&, _updateCache, getUpdateCacheList);
%attribute(spine::Skeleton, spine::Skin*, skin, getSkin, setSkin);
%attribute(spine::Skeleton, spine::Color&, color, getColor);
%attribute(spine::Skeleton, float, time, getTime, setTime);
%attribute(spine::Skeleton, float, scaleX, getScaleX, setScaleX);
%attribute(spine::Skeleton, float, scaleY, getScaleY, setScaleY);
%attribute(spine::Skeleton, float, x, getX, setX);
%attribute(spine::Skeleton, float, y, getY, setY);

%attribute_writeonly(spine::SkeletonBinary, float, scale, setScale);

%attribute(spine::SkeletonClipping, spine::Vector<float>&, clippedVertices, getClippedVertices);
%attribute(spine::SkeletonClipping, spine::Vector<unsigned short>&, clippedTriangles, getClippedTriangles);

%attribute(spine::SkeletonData, spine::String&, name, getName, setName);
%attribute(spine::SkeletonData, spine::Vector<spine::BoneData*>&, bones, getBones);
%attribute(spine::SkeletonData, spine::Vector<spine::SlotData*>&, slots, getSlots);
%attribute(spine::SkeletonData, spine::Vector<spine::Skin*>&, skins, getSkins);
%attribute(spine::SkeletonData, spine::Skin*, defaultSkin, getDefaultSkin, setDefaultSkin);
%attribute(spine::SkeletonData, spine::Vector<spine::EventData*>&, events, getEvents);
%attribute(spine::SkeletonData, spine::Vector<spine::Animation*>&, animations, getAnimations);
%attribute(spine::SkeletonData, spine::Vector<spine::IkConstraintData*>&, ikConstraints, getIkConstraints);
%attribute(spine::SkeletonData, spine::Vector<spine::TransformConstraintData*>&, transformConstraints, getTransformConstraints);
%attribute(spine::SkeletonData, spine::Vector<spine::PathConstraintData*>&, pathConstraints, getPathConstraints);
%attribute(spine::SkeletonData, float, x, getX, setX);
%attribute(spine::SkeletonData, float, y, getY, setY);
%attribute(spine::SkeletonData, float, width, getWidth, setWidth);
%attribute(spine::SkeletonData, float, height, getHeight, setHeight);
%attribute(spine::SkeletonData, spine::String&, version, getVersion, setVersion);
%attribute(spine::SkeletonData, spine::String&, hash, getHash, setHash);
%attribute(spine::SkeletonData, float, fps, getFps, setFps);
%attribute(spine::SkeletonData, spine::String&, imagesPath, getImagesPath, setImagesPath);
%attribute(spine::SkeletonData, spine::String&, audioPath, getAudioPath, setAudioPath);

%attribute(spine::SkeletonJson, float, scale, setScale);

%attribute(spine::Skin, spine::String&, name, getName);
%attribute(spine::Skin, spine::Vector<BoneData*>&, bones, getBones);
%attribute(spine::Skin, spine::Vector<ConstraintData*>&, constraints, getConstraints);

%attribute(spine::Slot, spine::SlotData&, data, getData);
%attribute(spine::Slot, spine::Bone&, bone, getBone);
%attribute(spine::Slot, spine::Color&, color, getColor);
%attribute(spine::Slot, spine::Color&, darkColor, getDarkColor);
%attribute(spine::Slot, spine::Attachment*, attachment, getAttachment, setAttachment);
%attribute(spine::Slot, spine::Vector<float>&, deform, getDeform);

%attribute(spine::SlotData, int, index, getIndex);
%attribute(spine::SlotData, spine::String&, name, getName);
%attribute(spine::SlotData, spine::BoneData&, boneData, getBoneData);
%attribute(spine::SlotData, spine::Color&, color, getColor);
%attribute(spine::SlotData, spine::Color&, darkColor, getDarkColor);
%attribute(spine::SlotData, spine::String&, attachmentName, getAttachmentName, setAttachmentName);
%attribute(spine::SlotData, spine::BlendMode, blendMode, getBlendMode, setBlendMode);

%attribute(spine::TransformConstraint, spine::TransformConstraintData&, data, getData);
%attribute(spine::TransformConstraint, spine::Vector<spine::Bone*>&, bones, getBones);
%attribute(spine::TransformConstraint, spine::Bone*, target, getTarget, setTarget);
%attribute(spine::TransformConstraint, float, rotateMix, getRotateMix, setRotateMix);
%attribute(spine::TransformConstraint, float, translateMix, getTranslateMix, setTranslateMix);
%attribute(spine::TransformConstraint, float, scaleMix, getScaleMix, setScaleMix);
%attribute(spine::TransformConstraint, float, shearMix, getShearMix, setShearMix);
%attribute(spine::TransformConstraint, bool, active, isActive, setActive);

%attribute(spine::TransformConstraintData, spine::Vector<spine::BoneData*>&, bones, getBones);
%attribute(spine::TransformConstraintData, spine::BoneData*, target, getTarget);
%attribute(spine::TransformConstraintData, float, rotateMix, getRotateMix);
%attribute(spine::TransformConstraintData, float, translateMix, getTranslateMix);
%attribute(spine::TransformConstraintData, float, scaleMix, getScaleMix);
%attribute(spine::TransformConstraintData, float, shearMix, getShearMix);
%attribute(spine::TransformConstraintData, float, offsetRotation, getOffsetRotation);
%attribute(spine::TransformConstraintData, float, offsetX, getOffsetX);
%attribute(spine::TransformConstraintData, float, offsetY, getOffsetY);
%attribute(spine::TransformConstraintData, float, offsetScaleX, getOffsetScaleX);
%attribute(spine::TransformConstraintData, float, offsetScaleY, getOffsetScaleY);
%attribute(spine::TransformConstraintData, float, offsetShearY, getOffsetShearY);
%attribute(spine::TransformConstraintData, bool, relative, isRelative);
%attribute(spine::TransformConstraintData, bool, local, isLocal);

%attribute(spine::Attachment, spine::String&, name, getName);

%attribute(spine::VertexAttachment, int, id, getId);
%attribute(spine::VertexAttachment, spine::Vector<size_t>&, bones, getBones);
%attribute(spine::VertexAttachment, spine::Vector<float>&, vertices, getVertices);
%attribute(spine::VertexAttachment, size_t, worldVerticesLength, getWorldVerticesLength, setWorldVerticesLength);
%attribute(spine::VertexAttachment, spine::VertexAttachment*, deformAttachment, getDeformAttachment, setDeformAttachment);

%attribute(spine::ClippingAttachment, spine::SlotData*, endSlot, getEndSlot, setEndSlot);

%attribute(spine::MeshAttachment, spine::String&, path, getPath, setPath);
%attribute(spine::MeshAttachment, spine::Vector<float>&, regionUVs, getRegionUVs);
%attribute(spine::MeshAttachment, spine::Vector<float>&, uvs, getUVs);
%attribute(spine::MeshAttachment, spine::Vector<unsigned short>&, triangles, getTriangles);
%attribute(spine::MeshAttachment, spine::Color&, color, getColor);
%attribute(spine::MeshAttachment, float, width, getWidth, setWidth);
%attribute(spine::MeshAttachment, float, height, getHeight, setHeight);
%attribute(spine::MeshAttachment, int, hullLength, getHullLength, setHullLength);
%attribute(spine::MeshAttachment, spine::Vector<unsigned short>&, edges, getEdges);

%attribute(spine::PathAttachment, spine::Vector<float>&, lengths, getLengths);
%attribute(spine::PathAttachment, bool, closed, isClosed, setClosed);
%attribute(spine::PathAttachment, bool, constantSpeed, isConstantSpeed, setConstantSpeed);

%attribute(spine::PointAttachment, float, x, getX, setX);
%attribute(spine::PointAttachment, float, y, getY, setY);
%attribute(spine::PointAttachment, float, rotation, getRotation, setRotation);

%attribute(spine::RegionAttachment, float, x, getX, setX);
%attribute(spine::RegionAttachment, float, y, getY, setY);
%attribute(spine::RegionAttachment, float, scaleX, getScaleX, setScaleX);
%attribute(spine::RegionAttachment, float, scaleY, getScaleY, setScaleY);
%attribute(spine::RegionAttachment, float, rotation, getRotation, setRotation);
%attribute(spine::RegionAttachment, float, width, getWidth, setWidth);
%attribute(spine::RegionAttachment, float, height, getHeight, setHeight);
%attribute(spine::RegionAttachment, spine::Color&, color, getColor);
%attribute(spine::RegionAttachment, spine::String&, path, getPath, setPath);
%attribute(spine::RegionAttachment, void*, rendererObject, getRendererObject, setRendererObject);
%attribute(spine::RegionAttachment, spine::Vector<float>&, offset, getOffset);
%attribute(spine::RegionAttachment, spine::Vector<float>&, uvs, getUVs);

%attribute(spine::JitterVertexEffect, float, jitterX, getJitterX, setJitterX);
%attribute(spine::JitterVertexEffect, float, jitterY, getJitterY, setJitterY);

%attribute(spine::SwirlVertexEffect, float, centerX, getCenterX, setCenterX);
%attribute(spine::SwirlVertexEffect, float, centerY, getCenterY, setCenterY);
%attribute(spine::SwirlVertexEffect, float, radius, getRadius, setRadius);
%attribute(spine::SwirlVertexEffect, float, angle, getAngle, setAngle);

%attribute(spine::Vector2, float, x, getX, setX);
%attribute(spine::Vector2, float, y, getY, setY);

// ----- Import Section ------
// Brief: Import header files which are depended by 'Include Section'
// Note: 
//   %import "your_header_file.h" will not generate code for that header file
//
%import "base/Macros.h"
%import "base/RefCounted.h"
%import "editor-support/spine/dll.h"
%import "editor-support/spine/RTTI.h"
%import "editor-support/spine/SpineString.h"
%import "editor-support/spine/Vector.h"

// ----- Include Section ------
// Brief: Include header files in which classes and methods will be bound
%include "editor-support/spine/MathUtil.h"
%include "editor-support/spine/MixBlend.h"
%include "editor-support/spine/MixDirection.h"
%include "editor-support/spine/TransformMode.h"
%include "editor-support/spine/PositionMode.h"
%include "editor-support/spine/SpacingMode.h"
%include "editor-support/spine/RotateMode.h"
%include "editor-support/spine/BlendMode.h"
%include "editor-support/spine/Timeline.h"
%include "editor-support/spine/Animation.h"
%include "editor-support/spine/AnimationState.h"
%include "editor-support/spine/AnimationStateData.h"
%include "editor-support/spine/Attachment.h"
%include "editor-support/spine/AttachmentTimeline.h"
%include "editor-support/spine/VertexAttachment.h"
%include "editor-support/spine/BoundingBoxAttachment.h"
%include "editor-support/spine/Bone.h"
%include "editor-support/spine/BoneData.h"
%include "editor-support/spine/ClippingAttachment.h"
%include "editor-support/spine/Color.h"
%include "editor-support/spine/CurveTimeline.h"
%include "editor-support/spine/ColorTimeline.h"
%include "editor-support/spine/DeformTimeline.h"
%include "editor-support/spine/DrawOrderTimeline.h"
%include "editor-support/spine/Event.h"
%include "editor-support/spine/EventData.h"
%include "editor-support/spine/EventTimeline.h"
%include "editor-support/spine/ConstraintData.h"
%include "editor-support/spine/IkConstraint.h"
%include "editor-support/spine/IkConstraintData.h"
%include "editor-support/spine/IkConstraintTimeline.h"
%include "editor-support/spine/MeshAttachment.h"
%include "editor-support/spine/PathAttachment.h"
%include "editor-support/spine/PathConstraint.h"
%include "editor-support/spine/PathConstraintData.h"
%include "editor-support/spine/PathConstraintMixTimeline.h"
%include "editor-support/spine/PathConstraintPositionTimeline.h"
%include "editor-support/spine/PathConstraintSpacingTimeline.h"
%include "editor-support/spine/PointAttachment.h"
%include "editor-support/spine/RegionAttachment.h"
%include "editor-support/spine/TranslateTimeline.h"
%include "editor-support/spine/TwoColorTimeline.h"
%include "editor-support/spine/RotateTimeline.h"
%include "editor-support/spine/ScaleTimeline.h"
%include "editor-support/spine/ShearTimeline.h"
%include "editor-support/spine/Skeleton.h"
%include "editor-support/spine/Slot.h"
%include "editor-support/spine/Skin.h"
%include "editor-support/spine/SkeletonBounds.h"
%include "editor-support/spine/SkeletonData.h"
%include "editor-support/spine/SlotData.h"
%include "editor-support/spine/SkeletonBinary.h"
%include "editor-support/spine/AttachmentLoader.h"
%include "editor-support/spine/Atlas.h"
%include "editor-support/spine/TextureLoader.h"

%include "editor-support/spine/TransformConstraint.h"
%include "editor-support/spine/TransformConstraintData.h"
%include "editor-support/spine/TransformConstraintTimeline.h"
%include "editor-support/spine/VertexEffect.h"

%include "editor-support/spine-creator-support/VertexEffectDelegate.h"
%include "editor-support/spine-creator-support/SkeletonRenderer.h"
%include "editor-support/spine-creator-support/SkeletonAnimation.h"
%include "editor-support/spine-creator-support/SkeletonDataMgr.h"
%include "editor-support/spine-creator-support/SkeletonCacheAnimation.h"
%include "editor-support/spine-creator-support/SkeletonCacheMgr.h"

%extend spine::IkConstraint {
    void apply1(Bone *bone, float targetX, float targetY, bool compress, bool stretch, bool uniform, float alpha) {
        IkConstraint::apply(*bone, targetX, targetY, compress, stretch, uniform, alpha);
    }

    void apply2(Bone *parent, Bone *child, float targetX, float targetY, int bendDir, bool stretch, float softness, float alpha) {
        IkConstraint::apply(*parent, *child, targetX, targetY, bendDir, stretch, softness, alpha);
    }
};

%extend spine::Bone {
    Bone(spine::BoneData *data, spine::Skeleton *skeleton, spine::Bone *parent) {
        return new Bone(*data, *skeleton, parent);
    }

    void updateWorldTransformWith(float x, float y, float rotation, float scaleX, float scaleY, float shearX, float shearY) {
        $self->updateWorldTransform(x, y, rotation, scaleX, scaleY, shearX, shearY);
    }
}

%extend spine::Slot {
    Slot(spine::SlotData *data, spine::Bone *bone) {
        return new Slot(*data, *bone);
    }
}

%extend spine::Timeline {
    void apply(spine::Skeleton *skeleton, float lastTime, float time, const ccstd::vector<spine::Event*>& events, float alpha, spine::MixBlend blend, spine::MixDirection direction) {
        spine::Vector<spine::Event*> spEvents;
        for (int i = 0; i < events.size(); ++i) {
            spEvents.add(events[i]);
        }
        $self->apply(*skeleton, lastTime, time, &spEvents, alpha, blend, direction);
    }
}

%extend spine::AnimationState {
    void apply(spine::Skeleton* skeleton) {
        $self->apply(*skeleton);
    }
}

%extend spine::Animation {
    void apply(spine::Skeleton *skeleton, float lastTime, float time, bool loop, const ccstd::vector<spine::Event*>& events, float alpha, spine::MixBlend blend, spine::MixDirection direction) {
        spine::Vector<spine::Event*> spEvents;
        for (int i = 0; i < events.size(); ++i) {
            spEvents.add(events[i]);
        }
        $self->apply(*skeleton, lastTime, time, loop, &spEvents, alpha, blend, direction);
    }
}

%extend spine::Event {
    Event(float time, spine::EventData *data) {
        return new Event(time, *data);
    }
}

%extend spine::IkConstraint {
    IkConstraint(spine::IkConstraintData *data, spine::Skeleton *skeleton) {
        return new IkConstraint(*data, *skeleton);
    }
}

%extend spine::PathConstraint {
    PathConstraint(spine::PathConstraintData* data, spine::Skeleton* skeleton) {
        return new PathConstraint(*data, *skeleton);
    }
}

%extend spine::PointAttachment {
    float computeWorldRotation(spine::Bone* bone) {
        return $self->computeWorldRotation(*bone);
    }
}

%extend spine::SkeletonBounds {
    void update(spine::Skeleton* skeleton, bool updateAabb) {
        $self->update(*skeleton, updateAabb);
    }
}

%extend spine::TransformConstraint {
    TransformConstraint(spine::TransformConstraintData* data, spine::Skeleton* skeleton) {
        return new TransformConstraint(*data, *skeleton);
    }
}

%extend spine::SlotData {
    SlotData(int index, const ccstd::string *name, spine::BoneData *boneData) {
        spine::String spName(name->data());
        return new SlotData(index, spName, *boneData);
    }
}

%extend spine::VertexEffect {
    void begin(spine::Skeleton *skeleton) {
        $self->begin(*skeleton);
    }
}

%extend spine::SwirlVertexEffect {
    SwirlVertexEffect(float radius, spine::Interpolation *interpolation) {
        return new SwirlVertexEffect(radius, *interpolation);
    }
}

%extend spine::DeformTimeline {
    void setFrame(int frameIndex, float time, const ccstd::vector<float>& vertices) {
        spine::Vector<float> spVertices;
        for (int i = 0; i < vertices.size(); ++i) {
            spVertices.add(vertices[i]);
        }
        $self->setFrame(frameIndex, time, spVertices);
    }
}

%extend spine::DrawOrderTimeline {
    void setFrame(size_t frameIndex, float time, const ccstd::vector<int>& drawOrder) {
        spine::Vector<int> spDrawOrder;
        spDrawOrder.ensureCapacity(drawOrder.size());
        for (int i = 0; i < drawOrder.size(); ++i) {
            spDrawOrder.add(drawOrder[i]);
        }
        $self->setFrame(frameIndex, time, spDrawOrder);
    }
}

%extend spine::Color {
    spine::Color &setFromColor(const spine::Color &other) {
        return $self->set(other);
    }
}

%extend spine::Skeleton {
    spine::Attachment &getAttachmentByName(const std::string &slotName, const std::string &attachmentName) {
        spine::String slot(slotName.data());
        spine::String attachment(attachmentName.data());
        return *($self->getAttachment(slot, attachment));
    }
}

%extend spine::SkeletonBinary {
    spine::SkeletonData *readSkeletonData(const std::vector<uint8_t>& binary) {
        std::vector<unsigned char> input;
        for (int i = 0; i < binary.size(); ++i) {
            input.push_back(binary[i]);
        }
        return $self->readSkeletonData(input.data(), input.size());
    }
}

%extend spine::AttachmentLoader {
    spine::RegionAttachment* newRegionAttachment(spine::Skin* skin, const spine::String& name, const spine::String& path) {
        return $self->newRegionAttachment(*skin, name, path);
    }

    spine::MeshAttachment* newMeshAttachment(spine::Skin* skin, const spine::String& name, const spine::String& path) {
        return $self->newMeshAttachment(*skin, name, path);
    }

    spine::BoundingBoxAttachment* newBoundingBoxAttachment(spine::Skin* skin, const spine::String& name) {
        return $self->newBoundingBoxAttachment(*skin, name);
    }

    spine::PathAttachment* newPathAttachment(spine::Skin* skin, const spine::String& name) {
        return $self->newPathAttachment(*skin, name);
    }

    spine::PointAttachment* newPointAttachment(spine::Skin* skin, const spine::String& name) {
        return $self->newPointAttachment(*skin, name);
    }

    spine::ClippingAttachment* newClippingAttachment(spine::Skin* skin, const spine::String& name) {
        return $self->newClippingAttachment(*skin, name);
    }
}

%extend spine::TextureLoader {
    void load(spine::AtlasPage* page, const spine::String& path) {
        $self->load(*page, path);
    }
}