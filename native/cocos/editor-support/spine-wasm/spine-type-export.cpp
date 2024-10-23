#include <emscripten/bind.h>
#include <type_traits>
#include <vector>
#include "spine-skeleton-instance.h"
#include "spine-wasm.h"
#include "Vector2.h"

using namespace emscripten;
using namespace spine;

namespace {
std::string STRING_SP2STD(const spine::String &str) {
    std::string stdStr(str.buffer(), str.length());
    return stdStr;
}

const spine::String STRING_STD2SP(const std::string &str) {
    const spine::String spString(str.c_str());
    return spString;
}

const std::vector<std::string> VECTOR_SP2STD_STRING(Vector<String> &container) {
    int count = container.size();
    std::vector<std::string> stdVector(count);
    for (int i = 0; i < count; i++) {
        stdVector[i] = STRING_SP2STD(container[i]);
    }
    return stdVector;
}

template <typename T>
Vector<T> VECTOR_STD2SP(std::vector<T> &container) {
    int count = container.size();
    Vector<T> vecSP = Vector<T>();
    vecSP.setSize(count, 0);
    for (int i = 0; i < count; i++) {
        vecSP[i] = container[i];
    }
    return vecSP;
}

template <typename T>
Vector<T *> VECTOR_STD2SP_POINTER(std::vector<T *> &container) {
    int count = container.size();
    Vector<T *> vecSP = Vector<T *>();
    vecSP.setSize(count, nullptr);
    for (int i = 0; i < count; i++) {
        vecSP[i] = container[i];
    }
    return vecSP;
}

template <typename T>
void VECTOR_STD_COPY_SP(std::vector<T> &stdVector, Vector<T> &spVector) {
    int count = stdVector.size();
    for (int i = 0; i < count; i++) {
        stdVector[i] = spVector[i];
    }
}

String* constructorSpineString(emscripten::val name, bool own) {
    return new String(name.as<std::string>().c_str(), own);
}

using SPVectorFloat = Vector<float>;
using SPVectorVectorFloat = Vector<Vector<float>>;
using SPVectorInt = Vector<int>;
using SPVectorVectorInt = Vector<Vector<int>>;
using SPVectorSize_t = Vector<size_t>;
using SPVectorBonePtr = Vector<Bone*>;
using SPVectorBoneDataPtr = Vector<BoneData*>;
using SPVectorSlotDataPtr = Vector<SlotData*>;
using SPVectorTransformConstraintDataPtr = Vector<TransformConstraintData*>;
using SPVectorPathConstraintDataPtr = Vector<PathConstraintData*>;
using SPVectorUnsignedShort = Vector<unsigned short>;
using SPVectorConstraintDataPtr = Vector<ConstraintData*>;
using SPVectorSlotPtr = Vector<Slot*>;
using SPVectorSkinPtr = Vector<Skin*>;
using SPVectorEventDataPtr = Vector<spine::EventData*>;
using SPVectorAnimationPtr = Vector<Animation*>;
using SPVectorIkConstraintPtr = Vector<IkConstraint*>;
using SPVectorIkConstraintDataPtr = Vector<IkConstraintData*>;
using SPVectorTransformConstraintPtr = Vector<TransformConstraint*>;
using SPVectorPathConstraintPtr = Vector<PathConstraint*>;
using SPVectorTimelinePtr = Vector<Timeline*>;
using SPVectorTrackEntryPtr = Vector<TrackEntry*>;
using SPVectorUpdatablePtr = Vector<Updatable*>;

template <typename T> static void register_integer(const char* name) {
  using namespace internal;
  using UnderlyingType = typename std::underlying_type<T>::type;
  _embind_register_integer(TypeID<T>::get(), name, sizeof(T), std::numeric_limits<UnderlyingType>::min(),
    std::numeric_limits<UnderlyingType>::max());
}

#define REGISTER_SPINE_ENUM(name) \
    register_integer<spine::name>("spine::" #name)

} // namespace

EMSCRIPTEN_BINDINGS(spine) {
    REGISTER_SPINE_ENUM(TimelineType);
    REGISTER_SPINE_ENUM(MixDirection);
    REGISTER_SPINE_ENUM(MixBlend);
    REGISTER_SPINE_ENUM(EventType);
    REGISTER_SPINE_ENUM(BlendMode);
    REGISTER_SPINE_ENUM(TransformMode);
    REGISTER_SPINE_ENUM(PositionMode);
    REGISTER_SPINE_ENUM(SpacingMode);
    REGISTER_SPINE_ENUM(RotateMode);
    REGISTER_SPINE_ENUM(TextureFilter);
    REGISTER_SPINE_ENUM(TextureWrap);
    REGISTER_SPINE_ENUM(AttachmentType);

    register_vector<float>("VectorFloat");
    register_vector<std::vector<float>>("VectorVectorFloat");
    register_vector<unsigned short>("VectorUnsignedShort");
    register_vector<unsigned int>("VectorOfUInt");
    register_vector<std::string>("VectorString");
    register_vector<BoneData *>("VectorBoneData");
    register_vector<Bone *>("VectorBone");
    register_vector<Skin::AttachmentMap::Entry *>("VectorSkinEntry");
    register_vector<SlotData *>("VectorSlotData");
    register_vector<Slot *>("VectorSlot");
    register_vector<Animation *>("VectorAnimation");
    register_vector<Timeline *>("VectorTimeline");
    register_vector<Skin *>("VectorSkin");
    register_vector<EventData *>("VectorEventData");
    register_vector<Event *>("VectorEvent");
    register_vector<ConstraintData *>("VectorConstraintData");
    register_vector<IkConstraint *>("VectorIkConstraint");
    register_vector<PathConstraint *>("VectorPathConstraint");
    register_vector<TransformConstraint *>("VectorTransformConstraint");
    register_vector<IkConstraintData *>("VectorIkConstraintData");
    register_vector<TransformConstraintData *>("VectorTransformConstraintData");
    register_vector<PathConstraintData *>("VectorPathConstraintData");
    register_vector<TrackEntry *>("VectorTrackEntry");

    class_<SPVectorFloat>("SPVectorFloat")
        .constructor<>()
        .function("resize", &SPVectorFloat::setSize)
        .function("size", &SPVectorFloat::size)
        .function("get", &SPVectorFloat::operator[], allow_raw_pointers())
        .function("set",optional_override([](SPVectorFloat &obj, int index, float value) {
            obj[index] = value;
        }));

    class_<SPVectorVectorFloat>("SPVectorVectorFloat")
        .constructor<>()
        .function("resize", &SPVectorVectorFloat::setSize)
        .function("size", &SPVectorVectorFloat::size)
        .function("get", &SPVectorVectorFloat::operator[], allow_raw_pointers())
        .function("set",optional_override([](SPVectorVectorFloat &obj, int index, SPVectorFloat &value) {
            obj[index] = value;
        }));

    class_<SPVectorInt>("SPVectorInt")
        .constructor<>()
        .function("resize", &SPVectorInt::setSize)
        .function("size", &SPVectorInt::size)
        .function("get", &SPVectorInt::operator[], allow_raw_pointers())
        .function("set",optional_override([](SPVectorInt &obj, int index, int value) { 
            obj[index] = value;
        }));
    
    class_<SPVectorVectorInt>("SPVectorVectorInt")
        .constructor<>()
        .function("resize", &SPVectorVectorInt::setSize)
        .function("size", &SPVectorVectorInt::size)
        .function("get", &SPVectorVectorInt::operator[], allow_raw_pointers())
        .function("set",optional_override([](SPVectorVectorInt &obj, int index, SPVectorInt &value) {
            obj[index] = value;
        }));

    class_<SPVectorSize_t>("SPVectorSize_t")
        .constructor<>()
        .function("resize", &SPVectorSize_t::setSize)
        .function("size", &SPVectorSize_t::size)
        .function("get", &SPVectorSize_t::operator[], allow_raw_pointers())
        .function("set",optional_override([](SPVectorSize_t &obj, size_t index, size_t value) { 
            obj[index] = value;
        }));
    
    class_<SPVectorUnsignedShort>("SPVectorUnsignedShort")
        .constructor<>()
        .function("resize", &SPVectorUnsignedShort::setSize)
        .function("size", &SPVectorUnsignedShort::size)
        .function("get", &SPVectorUnsignedShort::operator[], allow_raw_pointers())
        .function("set",optional_override([](SPVectorUnsignedShort &obj, int index, int value) { 
            obj[index] = value;
        }));

    class_<SPVectorBonePtr>("SPVectorBonePtr")
        .constructor<>()
        .function("resize", &SPVectorBonePtr::setSize)
        .function("size", &SPVectorBonePtr::size)
        .function("get", &SPVectorBonePtr::operator[], allow_raw_pointers())
        .function("set",optional_override([](SPVectorBonePtr &obj, int index, Bone *value) {
            obj[index] = value;
        }), allow_raw_pointer<Bone*>());

    class_<SPVectorBoneDataPtr>("SPVectorBoneDataPtr")
        .constructor<>()
        .function("resize", &SPVectorBoneDataPtr::setSize)
        .function("size", &SPVectorBoneDataPtr::size)
        .function("get", &SPVectorBoneDataPtr::operator[], allow_raw_pointers())
        .function("set",optional_override([](SPVectorBoneDataPtr &obj, int index, BoneData *value) {
            obj[index] = value;
        }), allow_raw_pointer<BoneData*>());

    class_<SPVectorSlotDataPtr>("SPVectorSlotDataPtr")
        .function("size", &SPVectorSlotDataPtr::size)
        .function("get", &SPVectorSlotDataPtr::operator[], allow_raw_pointers());

    class_<SPVectorTransformConstraintDataPtr>("SPVectorTransformConstraintDataPtr")
        .function("size", &SPVectorTransformConstraintDataPtr::size)
        .function("get", &SPVectorTransformConstraintDataPtr::operator[], allow_raw_pointers());

    class_<SPVectorPathConstraintDataPtr>("SPVectorPathConstraintDataPtr")
        .function("size", &SPVectorPathConstraintDataPtr::size)
        .function("get", &SPVectorPathConstraintDataPtr::operator[], allow_raw_pointers());    

    class_<SPVectorConstraintDataPtr>("SPVectorConstraintDataPtr")
        .function("size", &SPVectorConstraintDataPtr::size)
        .function("get", &SPVectorConstraintDataPtr::operator[], allow_raw_pointers());

    class_<SPVectorSlotPtr>("SPVectorSlotPtr")
        .function("size", &SPVectorSlotPtr::size)
        .function("get", &SPVectorSlotPtr::operator[], allow_raw_pointers());

    class_<SPVectorSkinPtr>("SPVectorSkinPtr")
        .function("size", &SPVectorSkinPtr::size)
        .function("get", &SPVectorSkinPtr::operator[], allow_raw_pointers());
    
    class_<SPVectorEventDataPtr>("SPVectorEventDataPtr")
        .function("size", &SPVectorEventDataPtr::size)
        .function("get", &SPVectorEventDataPtr::operator[], allow_raw_pointers());

    class_<SPVectorAnimationPtr>("SPVectorAnimationPtr")
        .function("size", &SPVectorAnimationPtr::size)
        .function("get", &SPVectorAnimationPtr::operator[], allow_raw_pointers());
    
    class_<SPVectorIkConstraintPtr>("SPVectorIkConstraintPtr")
        .constructor<>()
        .function("resize", &SPVectorIkConstraintPtr::setSize)
        .function("size", &SPVectorIkConstraintPtr::size)
        .function("get", &SPVectorIkConstraintPtr::operator[], allow_raw_pointers())
        .function("set",optional_override([](SPVectorIkConstraintPtr &obj, int index, IkConstraint *value) {
            obj[index] = value;
        }), allow_raw_pointer<IkConstraint*>());
    
    class_<SPVectorIkConstraintDataPtr>("SPVectorIkConstraintDataPtr")
        .constructor<>()
        .function("resize", &SPVectorIkConstraintDataPtr::setSize)
        .function("size", &SPVectorIkConstraintDataPtr::size)
        .function("get", &SPVectorIkConstraintDataPtr::operator[], allow_raw_pointers())
        .function("set",optional_override([](SPVectorIkConstraintDataPtr &obj, int index, IkConstraintData *value) {
            obj[index] = value;
        }), allow_raw_pointer<IkConstraintData*>());

    class_<SPVectorTransformConstraintPtr>("SPVectorTransformConstraintPtr")
        .constructor<>()
        .function("resize", &SPVectorTransformConstraintPtr::setSize)
        .function("size", &SPVectorTransformConstraintPtr::size)
        .function("get", &SPVectorTransformConstraintPtr::operator[], allow_raw_pointers())
        .function("set",optional_override([](SPVectorTransformConstraintPtr &obj, int index, TransformConstraint *value) {
            obj[index] = value;
        }), allow_raw_pointer<TransformConstraint*>());
    
    class_<SPVectorPathConstraintPtr>("SPVectorPathConstraintPtr")
        .constructor<>()
        .function("resize", &SPVectorPathConstraintPtr::setSize)
        .function("size", &SPVectorPathConstraintPtr::size)
        .function("get", &SPVectorPathConstraintPtr::operator[], allow_raw_pointers())
        .function("set",optional_override([](SPVectorPathConstraintPtr &obj, int index, PathConstraint *value) {
            obj[index] = value;
        }), allow_raw_pointer<PathConstraint*>());
     
    class_<SPVectorTimelinePtr>("SPVectorTimelinePtr")
        .constructor<>()
        .function("resize", &SPVectorTimelinePtr::setSize)
        .function("size", &SPVectorTimelinePtr::size)
        .function("get", &SPVectorTimelinePtr::operator[], allow_raw_pointers())
        .function("set",optional_override([](SPVectorTimelinePtr &obj, int index, Timeline *value) {
            obj[index] = value;
        }), allow_raw_pointer<Timeline*>());

    class_<SPVectorTrackEntryPtr>("SPVectorTrackEntryPtr")
        .constructor<>()
        .function("resize", &SPVectorTrackEntryPtr::setSize)
        .function("size", &SPVectorTrackEntryPtr::size)
        .function("get", &SPVectorTrackEntryPtr::operator[], allow_raw_pointers())
        .function("set",optional_override([](SPVectorTrackEntryPtr &obj, int index, TrackEntry *value) {
            obj[index] = value;
        }), allow_raw_pointer<TrackEntry*>());

    class_<SPVectorUpdatablePtr>("SPVectorUpdatablePtr")
        .constructor<>()
        .function("resize", &SPVectorUpdatablePtr::setSize)
        .function("size", &SPVectorUpdatablePtr::size)
        .function("get", &SPVectorUpdatablePtr::operator[], allow_raw_pointers())
        .function("set",optional_override([](SPVectorUpdatablePtr &obj, int index, Updatable *value) {
            obj[index] = value;
        }), allow_raw_pointer<Updatable*>());


    class_<Vector2>("Vector2")
        .constructor<>()
        .constructor<float, float>()
        .function("setX", &Vector2::setX)
        .function("getX", &Vector2::getX)
        .function("setY", &Vector2::setY)
        .function("getY", &Vector2::getY)
        .function("set", &Vector2::set)
        .function("length", &Vector2::length)
        .function("normalize", &Vector2::normalize);

    class_<String>("String")
        .constructor<>()
        .constructor(constructorSpineString)
        .constructor<const String &>()
        .function("length", &String::length)
        .function("isEmpty", &String::isEmpty)
        .function("append", select_overload<String&(const String&)>(&String::append))
        .function("equals", select_overload<String&(const String&)>(&String::operator=))
        .function("buffer", &String::buffer, allow_raw_pointer<const char*>())
        //.function("estr", optional_override([](String &obj) {
        //    auto str = emscripten::val(obj.buffer());
        //    return str; }), allow_raw_pointers())
        .function("strPtr", optional_override([](String &obj) {
            return reinterpret_cast<uintptr_t>(obj.buffer());}), allow_raw_pointers())
        .function("str", optional_override([](String &obj) {
            std::string stdStr(obj.buffer(), obj.length());
            return stdStr; }), allow_raw_pointers());

    class_<Color>("Color")
        .constructor<>()
        .constructor<float, float, float, float>()
        .function("set", static_cast<Color &(Color::*)(float, float, float, float)>(&Color::set))
        .function("add", static_cast<Color &(Color::*)(float, float, float, float)>(&Color::add))
        .function("clamp", &Color::clamp)
        .property("r", &Color::r)
        .property("g", &Color::g)
        .property("b", &Color::b)
        .property("a", &Color::a);

    class_<Interpolation>("Interpolation")
        .function("apply", &Interpolation::apply, pure_virtual());

    class_<Triangulator>("Triangulator")
        .constructor<>()
        .function("triangulate", &Triangulator::triangulate)
        .function("decompose", &Triangulator::decompose, allow_raw_pointers());

    class_<ConstraintData>("ConstraintData")
        .constructor<const String &>()
        .function("getName", optional_override([](ConstraintData &obj) { return STRING_SP2STD(obj.getName()); }))
        .function("getOrder", &ConstraintData::getOrder)
        .function("setOrder", &ConstraintData::setOrder)
        .function("getSkinRequired", &ConstraintData::isSkinRequired)
        .function("setSkinRequired", &ConstraintData::setSkinRequired);

    class_<IkConstraintData, base<ConstraintData>>("IkConstraintData")
        .constructor<const String &>()
        .function("getBones", optional_override([](IkConstraintData &obj) {
            return &obj.getBones(); }), allow_raw_pointer<SPVectorBoneDataPtr>()) 
        .function("getTarget", &IkConstraintData::getTarget, allow_raw_pointer<BoneData>())
        .function("setTarget", &IkConstraintData::setTarget, allow_raw_pointer<BoneData>())
        .function("getBendDirection", &IkConstraintData::getBendDirection)
        .function("setBendDirection", &IkConstraintData::setBendDirection)
        .function("getCompress", &IkConstraintData::getCompress)
        .function("setCompress", &IkConstraintData::setCompress)
        .function("getStretch", &IkConstraintData::getStretch)
        .function("setStretch", &IkConstraintData::setStretch)
        .function("getUniform", &IkConstraintData::getUniform)
        .function("setUniform", &IkConstraintData::setUniform)
        .function("getMix", &IkConstraintData::getMix)
        .function("setMix", &IkConstraintData::setMix)
        .function("getSoftness", &IkConstraintData::getSoftness)
        .function("setSoftness", &IkConstraintData::setSoftness);

    class_<PathConstraintData, base<ConstraintData>>("PathConstraintData")
        .constructor<const String &>()
        .function("getBones",optional_override([](PathConstraintData &obj) {
            return &obj.getBones(); }), allow_raw_pointer<SPVectorBoneDataPtr>())
        .function("getTarget", &PathConstraintData::getTarget, allow_raw_pointer<SlotData>())
        .function("setTarget", &PathConstraintData::setTarget, allow_raw_pointer<SlotData>())
        .function("getPositionMode", &PathConstraintData::getPositionMode)
        .function("setPositionMode", &PathConstraintData::setPositionMode)
        .function("getSpacingMode", &PathConstraintData::getSpacingMode)
        .function("setSpacingMode", &PathConstraintData::setSpacingMode)
        .function("getRotateMode", &PathConstraintData::getRotateMode)
        .function("setRotateMode", &PathConstraintData::setRotateMode)
        .function("getOffsetRotation", &PathConstraintData::getOffsetRotation)
        .function("setOffsetRotation", &PathConstraintData::setOffsetRotation)
        .function("getPosition", &PathConstraintData::getPosition)
        .function("setPosition", &PathConstraintData::setPosition)
        .function("getSpacing", &PathConstraintData::getSpacing)
        .function("setSpacing", &PathConstraintData::setSpacing)
        .function("getRotateMix", &PathConstraintData::getRotateMix)
        .function("setRotateMix", &PathConstraintData::setRotateMix)
        .function("getTranslateMix", &PathConstraintData::getTranslateMix)
        .function("setTranslateMix", &PathConstraintData::setTranslateMix);

    class_<SkeletonBounds>("SkeletonBounds")
        .constructor<>()
        .function("update", &SkeletonBounds::update)
        .function("aabbContainsPoint", &SkeletonBounds::aabbcontainsPoint)
        .function("aabbIntersectsSegment", &SkeletonBounds::aabbintersectsSegment)
        .function("aabbIntersectsSkeleton", &SkeletonBounds::aabbIntersectsSkeleton)
        .function("containsPoint", optional_override([](SkeletonBounds &obj, float x, float y) {
            return obj.containsPoint(x, y); }),allow_raw_pointers())
        .function("containsPointPolygon", optional_override([](SkeletonBounds &obj,Polygon* polygon, float x, float y) {
            return obj.containsPoint(polygon, x, y); }),allow_raw_pointers())
        .function("intersectsSegment", optional_override([](SkeletonBounds &obj, float x1, float y1, float x2, float y2){
            return obj.intersectsSegment(x1, y1, x2, y2); }),allow_raw_pointers())
        .function("intersectsSegmentPolygon", optional_override([](SkeletonBounds &obj,Polygon* polygon,
        float x1, float y1, float x2, float y2){
            return obj.intersectsSegment(polygon, x1, y1, x2, y2); }),allow_raw_pointers())
        .function("getPolygon", &SkeletonBounds::getPolygon, allow_raw_pointers())
        .function("getWidth", &SkeletonBounds::getWidth)
        .function("getHeight", &SkeletonBounds::getHeight);

    class_<Event>("Event")
        .constructor<float, const EventData &>()
        .function("getData", optional_override([](Event &obj) {
            return const_cast<EventData*>(&obj.getData()); }), allow_raw_pointers())
        .function("getIntValue", &Event::getIntValue)
        .function("setIntValue", &Event::setIntValue)
        .function("getFloatValue", &Event::getFloatValue)
        .function("setFloatValue", &Event::setFloatValue)
        .function("getStringValue", optional_override([](Event &obj) { 
            return STRING_SP2STD(obj.getStringValue()); }))
        .function("setStringValue", optional_override([](Event &obj, const std::string &name) {
            return obj.setStringValue(STRING_STD2SP(name)); }), allow_raw_pointers())
        .function("getTime", &Event::getTime)
        .function("getVolume", &Event::getVolume)
        .function("setVolume", &Event::setVolume)
        .function("getBalance", &Event::getBalance)
        .function("setBalance", &Event::setBalance);

    class_<EventData>("EventData")
        .constructor<const String &>()
        .function("getName", optional_override([](EventData &obj) {
            return STRING_SP2STD(obj.getName()); }))
        .function("getIntValue", &EventData::getIntValue)
        .function("setIntValue", &EventData::setIntValue)
        .function("getFloatValue", &EventData::getFloatValue)
        .function("setFloatValue", &EventData::setFloatValue)
        .function("getStringValue", optional_override([](EventData &obj) {
            return STRING_SP2STD(obj.getStringValue()); }))
        .function("setStringValue", optional_override([](EventData &obj, const std::string &name) {
            return obj.setStringValue(STRING_STD2SP(name)); }), allow_raw_pointers())
        .function("getAudioPath", optional_override([](EventData &obj) {
            return STRING_SP2STD(obj.getAudioPath()); }))
        .function("setAudioPath", optional_override([](EventData &obj, const std::string &name) {
            return obj.setAudioPath(STRING_STD2SP(name)); }), allow_raw_pointers())
        .function("getVolume", &EventData::getVolume)
        .function("setVolume", &EventData::setVolume)
        .function("getBalance", &EventData::getBalance)
        .function("setBalance", &EventData::setBalance);

    class_<Attachment>("Attachment")
        //.function("getName", optional_override([](Attachment &obj) { 
        //    return emscripten::val(obj.getName().buffer()); }));
        .function("getName", &Attachment::getName, allow_raw_pointers());

    // pure_virtual and raw pointer
    class_<VertexAttachment, base<Attachment>>("VertexAttachment")
        .function("getId", &VertexAttachment::getId)
        .function("getBones", optional_override([](VertexAttachment &obj){
            return &obj.getBones(); }), allow_raw_pointer<SPVectorSize_t>())
        .function("getVertices", optional_override([](VertexAttachment &obj){
            return &obj.getVertices(); }), allow_raw_pointer<SPVectorFloat>())
        .function("getWorldVerticesLength", &VertexAttachment::getWorldVerticesLength)
        .function("setWorldVerticesLength", &VertexAttachment::setWorldVerticesLength)
        .function("getDeformAttachment", &VertexAttachment::getDeformAttachment, allow_raw_pointer<VertexAttachment>())
        .function("setDeformAttachment", &VertexAttachment::setDeformAttachment, allow_raw_pointer<VertexAttachment>())
        .function("computeWorldVertices", select_overload<void(Slot&, size_t, size_t, Vector<float>&, size_t, size_t)>
        (&VertexAttachment::computeWorldVertices), allow_raw_pointer<SPVectorFloat>())
        .function("copyTo", &VertexAttachment::copyTo, allow_raw_pointers());

    class_<BoundingBoxAttachment, base<VertexAttachment>>("BoundingBoxAttachment")
        .constructor<const String &>()
        .function("getName", optional_override([](BoundingBoxAttachment &obj) {
            return STRING_SP2STD(obj.getName()); }))
        .function("copy", &BoundingBoxAttachment::copy, allow_raw_pointers());

    class_<ClippingAttachment, base<VertexAttachment>>("ClippingAttachment")
        .constructor<const String &>()
        .function("getEndSlot", &ClippingAttachment::getEndSlot, allow_raw_pointers())
        .function("setEndSlot", &ClippingAttachment::setEndSlot, allow_raw_pointers())
        .function("copy", &ClippingAttachment::copy, allow_raw_pointers());

    class_<MeshAttachment, base<VertexAttachment>>("MeshAttachment")
        .constructor<const String &>()
        .function("getPath", optional_override([](MeshAttachment &obj) {
            return STRING_SP2STD(obj.getPath()); }))
        .function("setPath", optional_override([](MeshAttachment &obj, const std::string &path) {
            const String &pathSP = STRING_STD2SP(path);
            obj.setPath(pathSP); }))
        .function("getRegionUVs", optional_override([](MeshAttachment &obj) {
            return &obj.getRegionUVs(); }), allow_raw_pointer<SPVectorFloat>())
        .function("getUVs", optional_override([](MeshAttachment &obj) { 
            return &obj.getUVs(); }), allow_raw_pointer<SPVectorFloat>())
        .function("getTriangles", optional_override([](MeshAttachment &obj) {
            return &obj.getTriangles(); }), allow_raw_pointer<SPVectorUnsignedShort>())
        .function("getColor", optional_override([](MeshAttachment &obj) {
            return &obj.getColor(); }), allow_raw_pointers())
        .function("getWidth", &MeshAttachment::getWidth)
        .function("setWidth", &MeshAttachment::setWidth)
        .function("getHeight", &MeshAttachment::getHeight)
        .function("setHeight", &MeshAttachment::setHeight)
        .function("getHullLength", &MeshAttachment::getHullLength)
        .function("setHullLength", &MeshAttachment::setHullLength)
        .function("getEdges", optional_override([](MeshAttachment &obj) {
            return &obj.getEdges(); }), allow_raw_pointer<SPVectorUnsignedShort>())
        .function("updateUVs", &MeshAttachment::updateUVs)
        .function("getParentMesh", &MeshAttachment::getParentMesh, allow_raw_pointers())
        .function("setParentMesh", &MeshAttachment::setParentMesh, allow_raw_pointers())
        .function("copy", &MeshAttachment::copy, allow_raw_pointers())
        .function("newLinkedMesh", &MeshAttachment::newLinkedMesh, allow_raw_pointers());

    class_<PathAttachment, base<VertexAttachment>>("PathAttachment")
        .constructor<const String &>()
        .function("getLengths", optional_override([](PathAttachment &obj) {
            return &obj.getLengths(); }), allow_raw_pointer<SPVectorFloat>())
        .function("getClosed", &PathAttachment::isClosed)
        .function("setClosed", &PathAttachment::setClosed)
        .function("getConstantSpeed", &PathAttachment::isConstantSpeed)
        .function("setConstantSpeed", &PathAttachment::setConstantSpeed)
        .function("copy", &PathAttachment::copy, allow_raw_pointers());

    class_<PointAttachment, base<Attachment>>("PointAttachment")
        .constructor<const String &>()
        .function("getX", &PointAttachment::getX)
        .function("setX", &PointAttachment::setX)
        .function("getY", &PointAttachment::getY)
        .function("setY", &PointAttachment::setY)
        .function("getRotation", &PointAttachment::getRotation)
        .function("setRotation", &PointAttachment::setRotation)
        .function("computeWorldPosition", optional_override([](PointAttachment &obj, Bone &bone, float ox, float oy) {
            obj.computeWorldPosition(bone, ox, oy);}))
        .function("computeWorldRotation", &PointAttachment::computeWorldRotation)
        .function("copy", &PointAttachment::copy, allow_raw_pointers());

    class_<RegionAttachment, base<Attachment>>("RegionAttachment")
        .constructor<const String &>()
        .function("getX", &RegionAttachment::getX)
        .function("setX", &RegionAttachment::setX)
        .function("getY", &RegionAttachment::getY)
        .function("setY", &RegionAttachment::setY)
        .function("getScaleX", &RegionAttachment::getScaleX)
        .function("setScaleX", &RegionAttachment::setScaleX)
        .function("getScaleY", &RegionAttachment::getScaleY)
        .function("setScaleY", &RegionAttachment::setScaleY)
        .function("getRotation", &RegionAttachment::getRotation)
        .function("setRotation", &RegionAttachment::setRotation)
        .function("getWidth", &RegionAttachment::getWidth)
        .function("setWidth", &RegionAttachment::setWidth)
        .function("getHeight", &RegionAttachment::getHeight)
        .function("setHeight", &RegionAttachment::setHeight)
        .function("getColor", optional_override([](RegionAttachment &obj) {
            return &obj.getColor(); }), allow_raw_pointers())
        .function("getPath", optional_override([](RegionAttachment &obj) {
            return STRING_SP2STD(obj.getPath()); }))
        .function("setPath", optional_override([](RegionAttachment &obj, const std::string &path) {
            const String &pathSP = STRING_STD2SP(path);
            obj.setPath(pathSP); }))
        .function("getRendererObject", &RegionAttachment::getRendererObject, allow_raw_pointers())
        .function("getOffset", optional_override([](RegionAttachment &obj) {
            return &obj.getOffset(); }), allow_raw_pointer<SPVectorFloat>())
        .function("setUVs", &RegionAttachment::setUVs)
        .function("getUVs", optional_override([](RegionAttachment &obj) {
            return &obj.getUVs(); }), allow_raw_pointer<SPVectorFloat>())
        .function("updateOffset", &RegionAttachment::updateOffset)
        .function("computeWorldVertices", select_overload<void(Bone&, Vector<float>&, size_t, size_t)>
        (&RegionAttachment::computeWorldVertices), allow_raw_pointer<SPVectorFloat>())
        .function("copy", &RegionAttachment::copy, allow_raw_pointer<Attachment>());

    class_<AttachmentLoader>("AttachmentLoader")
        //.constructor<>()
        .function("newClippingAttachment", &AttachmentLoader::newClippingAttachment, pure_virtual(), allow_raw_pointers())
        .function("newPointAttachment", &AttachmentLoader::newPointAttachment, pure_virtual(), allow_raw_pointers())
        .function("newPathAttachment", &AttachmentLoader::newPathAttachment, pure_virtual(), allow_raw_pointers())
        .function("newBoundingBoxAttachment", &AttachmentLoader::newBoundingBoxAttachment, pure_virtual(), allow_raw_pointers())
        .function("newMeshAttachment", &AttachmentLoader::newMeshAttachment, pure_virtual(), allow_raw_pointers())
        .function("newRegionAttachment", &AttachmentLoader::newRegionAttachment, pure_virtual(), allow_raw_pointers());

    class_<AtlasAttachmentLoader, base<AttachmentLoader>>("AtlasAttachmentLoader")
        .constructor<Atlas *>()
        .function("newRegionAttachment", &AtlasAttachmentLoader::newRegionAttachment, allow_raw_pointer<RegionAttachment>())
        .function("newMeshAttachment", &AtlasAttachmentLoader::newMeshAttachment, allow_raw_pointer<MeshAttachment>())
        .function("newBoundingBoxAttachment", &AtlasAttachmentLoader::newBoundingBoxAttachment, allow_raw_pointer<BoundingBoxAttachment>())
        .function("newPathAttachment", &AtlasAttachmentLoader::newPathAttachment, allow_raw_pointer<PathAttachment>())
        .function("newPointAttachment", &AtlasAttachmentLoader::newPointAttachment, allow_raw_pointer<PointAttachment>())
        .function("newClippingAttachment", &AtlasAttachmentLoader::newClippingAttachment, allow_raw_pointer<ClippingAttachment>());

    class_<AtlasPage>("TextureAtlasPage")
        .constructor<const String &>()
        .function("getName", optional_override([](AtlasPage &obj) {
            return STRING_SP2STD((const String)obj.name); }))
        .property("minFilter", &AtlasPage::minFilter)
        .property("magFilter", &AtlasPage::magFilter)
        .property("uWrap", &AtlasPage::uWrap)
        .property("vWrap", &AtlasPage::vWrap)
        //.property("texture", &AtlasPage::texture) // no texture, use renderer object
        .property("width", &AtlasPage::width)
        .property("height", &AtlasPage::height);

    class_<AtlasRegion>("TextureAtlasRegion")
        //.property("page", &AtlasRegion::page)
        .function("getName", optional_override([](AtlasRegion &obj) {
            return STRING_SP2STD((const String)obj.name); }))
        .property("x", &AtlasRegion::x)
        .property("y", &AtlasRegion::y)
        .property("index", &AtlasRegion::index)
        .property("rotate", &AtlasRegion::rotate)
        .property("degrees", &AtlasRegion::degrees);
        //.property("texture", &AtlasRegion::height)

    class_<Atlas>("TextureAtlas")
        .constructor<const String &, TextureLoader *, bool>()
        .function("findRegion", optional_override([](Atlas &obj, const std::string &name) {
            return obj.findRegion(STRING_STD2SP(name)); }), allow_raw_pointers());

    class_<PowInterpolation, base<Interpolation>>("Pow")
        .constructor<int>()
        .function("apply", &PowInterpolation::apply);

    class_<PowOutInterpolation, base<Interpolation>>("PowOut")
        .constructor<int>()
        .function("apply", &PowInterpolation::apply);

    class_<SlotData>("SlotData")
        .constructor<int, const String &, BoneData &>()
        .function("getIndex", &SlotData::getIndex)
        .function("getName", optional_override([](SlotData &obj) {
            return STRING_SP2STD(obj.getName()); }))
        .function("getBoneData", optional_override([](SlotData &obj) {
            return &obj.getBoneData(); }), allow_raw_pointers())
        .function("getColor", optional_override([](SlotData &obj) {
            return &obj.getColor();}), allow_raw_pointers())
        .function("getDarkColor", optional_override([](SlotData &obj) {
            return &obj.getDarkColor();}), allow_raw_pointers())
        .function("getBlendMode", &SlotData::getBlendMode)
        .function("setBlendMode", &SlotData::setBlendMode);

    class_<Updatable>("Updatable")
        .function("update", &Updatable::update, pure_virtual())
        .function("isActive", &Updatable::isActive, pure_virtual());

    class_<IkConstraint, base<Updatable>>("IkConstraint")
        .constructor<IkConstraintData &, Skeleton &>()
        .function("getData", &IkConstraint::getData, allow_raw_pointers())
        .function("getBones", optional_override([](IkConstraint &obj) {
            return &obj.getBones(); }), allow_raw_pointer<SPVectorBonePtr>())
        .function("getTarget", &IkConstraint::getTarget, allow_raw_pointer<Bone>())
        .function("setTarget", &IkConstraint::setTarget, allow_raw_pointer<Bone>())
        .function("getBendDirection", &IkConstraint::getBendDirection)
        .function("setBendDirection", &IkConstraint::setBendDirection)
        .function("getCompress", &IkConstraint::getCompress)
        .function("setCompress", &IkConstraint::setCompress)
        .function("getStretch", &IkConstraint::getStretch)
        .function("setStretch", &IkConstraint::setStretch)
        .function("getMix", &IkConstraint::getMix)
        .function("setMix", &IkConstraint::setMix)
        .function("getSoftness", &IkConstraint::getSoftness)
        .function("setSoftness", &IkConstraint::setSoftness)
        .function("getActive", &IkConstraint::isActive)
        .function("setActive", &IkConstraint::setActive)
        .function("isActive", &IkConstraint::isActive)
        .function("apply", static_cast<void (IkConstraint::*)()>(&IkConstraint::apply))
        .function("update", &IkConstraint::update)
        .class_function("apply1", optional_override([](
            IkConstraint &obj, Bone &bone, float targetX, float targetY, 
            bool compress, bool stretch, bool uniform, float alpha){
                obj.apply(bone, targetX, targetY, compress, stretch, uniform, alpha);
        }))
        .class_function("apply2", optional_override([](
            IkConstraint &obj, Bone &parent, Bone &child, float targetX, float targetY,
            int bendDir, bool stretch, float softness, float alpha){
                obj.apply(parent, child, targetX, targetY, bendDir, stretch, softness, alpha);
        }));

    class_<PathConstraint, base<Updatable>>("PathConstraint")
        .constructor<PathConstraintData &, Skeleton &>()
        .function("getData", &PathConstraint::getData, allow_raw_pointers())
        .function("getBones", optional_override([](PathConstraint &obj) {
            return &obj.getBones(); }), allow_raw_pointer<SPVectorBonePtr>())
        .function("getTarget", &PathConstraint::getTarget, allow_raw_pointer<Slot>())
        .function("setTarget", &PathConstraint::setTarget, allow_raw_pointer<Slot>())
        .function("getPosition", &PathConstraint::getPosition)
        .function("setPosition", &PathConstraint::setPosition)
        .function("getSpacing", &PathConstraint::getSpacing)
        .function("setSpacing", &PathConstraint::setSpacing)
        .function("getRotateMix", &PathConstraint::getRotateMix)
        .function("setRotateMix", &PathConstraint::setRotateMix)
        .function("getTranslateMix", &PathConstraint::getTranslateMix)
        .function("getTranslateMix", &PathConstraint::setTranslateMix)
        .function("getActive", &PathConstraint::isActive)
        .function("isActive", &PathConstraint::isActive)
        .function("setActive", &PathConstraint::setActive)
        .function("apply", &PathConstraint::apply)
        .function("update", &PathConstraint::update);

    class_<TransformConstraintData, base<ConstraintData>>("TransformConstraintData")
        .constructor<const String &>()
        .function("getBones", optional_override([](TransformConstraintData &obj) { 
            return &obj.getBones(); }), allow_raw_pointer<SPVectorBoneDataPtr>())
        .function("getTarget", &TransformConstraintData::getTarget, allow_raw_pointers())
        .function("getRotateMix", &TransformConstraintData::getRotateMix)
        .function("getTranslateMix", &TransformConstraintData::getTranslateMix)
        .function("getScaleMix", &TransformConstraintData::getScaleMix)
        .function("getShearMix", &TransformConstraintData::getShearMix)
        .function("getOffsetRotation", &TransformConstraintData::getOffsetRotation)
        .function("getOffsetX", &TransformConstraintData::getOffsetX)
        .function("getOffsetY", &TransformConstraintData::getOffsetY)
        .function("getOffsetScaleX", &TransformConstraintData::getOffsetScaleX)
        .function("getOffsetScaleY", &TransformConstraintData::getOffsetScaleY)
        .function("getOffsetShearY", &TransformConstraintData::getOffsetShearY)
        .function("getRelative", &TransformConstraintData::isRelative)
        .function("getLocal", &TransformConstraintData::isLocal);

    class_<TransformConstraint, base<Updatable>>("TransformConstraint")
        .constructor<TransformConstraintData &, Skeleton &>()
        .function("getData", &TransformConstraint::getData, allow_raw_pointers())
        .function("getBones", optional_override([](TransformConstraint &obj) {
            return &obj.getBones(); }), allow_raw_pointer<SPVectorBonePtr>())
        .function("getTarget", &TransformConstraint::getTarget, allow_raw_pointers())
        .function("getRotateMix", &TransformConstraint::getRotateMix)
        .function("setRotateMix", &TransformConstraint::setRotateMix)
        .function("getTranslateMix", &TransformConstraint::getTranslateMix)
        .function("setTranslateMix", &TransformConstraint::setTranslateMix)
        .function("getScaleMix", &TransformConstraint::getScaleMix)
        .function("setScaleMix", &TransformConstraint::setScaleMix)
        .function("getShearMix", &TransformConstraint::getShearMix)
        .function("setShearMix", &TransformConstraint::setShearMix)
        .function("getActive", &TransformConstraint::isActive)
        .function("setActive", &TransformConstraint::setActive)
        .function("isActive", &TransformConstraint::isActive)
        .function("apply", &TransformConstraint::apply)
        .function("update", &TransformConstraint::update);

    class_<Bone, base<Updatable>>("Bone")
        .constructor<BoneData &, Skeleton &, Bone *>()
        .function("getData", optional_override([](Bone &obj) {
            return &obj.getData(); }), allow_raw_pointers())
        .function("getSkeleton", optional_override([](Bone &obj) {
            return &obj.getSkeleton(); }), allow_raw_pointers())
        .function("getParent", optional_override([](Bone &obj) {
            return obj.getParent(); }), allow_raw_pointers())
        .function("getChildren", optional_override([](Bone &obj) {
            return &obj.getChildren(); }), allow_raw_pointer<SPVectorBonePtr>())
        .function("getX", &Bone::getX)
        .function("setX", &Bone::setX)
        .function("getY", &Bone::getY)
        .function("setY", &Bone::setY)
        .function("getRotation", &Bone::getRotation)
        .function("setRotation", &Bone::setRotation)
        .function("getScaleX", &Bone::getScaleX)
        .function("setScaleX", &Bone::setScaleX)
        .function("getScaleY", &Bone::getScaleY)
        .function("setScaleY", &Bone::setScaleY)
        .function("getShearX", &Bone::getShearX)
        .function("setShearX", &Bone::setShearX)
        .function("getShearY", &Bone::getShearY)
        .function("setShearY", &Bone::setShearY)
        .function("getAX", &Bone::getAX)
        .function("setAX", &Bone::setAX)
        .function("getAY", &Bone::getAY)
        .function("setAY", &Bone::setAY)
        .function("getARotation", &Bone::getAppliedRotation)
        .function("setARotation", &Bone::setAppliedRotation)
        .function("getAScaleX", &Bone::getAScaleX)
        .function("setAScaleX", &Bone::setAScaleX)
        .function("getAScaleY", &Bone::getAScaleY)
        .function("setAScaleY", &Bone::setAScaleY)
        .function("getAShearX", &Bone::getAShearX)
        .function("setAShearX", &Bone::setAShearX)
        .function("getAShearY", &Bone::getAShearY)
        .function("setAShearY", &Bone::setAShearY)
        .function("getAppliedValid", &Bone::isAppliedValid)
        .function("setAppliedValid", &Bone::setAppliedValid)
        .function("getA", &Bone::getA)
        .function("setA", &Bone::setA)
        .function("getB", &Bone::getB)
        .function("setB", &Bone::setB)
        .function("getC", &Bone::getC)
        .function("setC", &Bone::setC)
        .function("getD", &Bone::getD)
        .function("setD", &Bone::setD)
        .function("getWorldX", &Bone::getWorldX)
        .function("setWorldX", &Bone::setWorldX)
        .function("getWorldY", &Bone::getWorldY)
        .function("setWorldY", &Bone::setWorldY)
        .function("getActive", &Bone::isActive)
        .function("setActive", &Bone::setActive)
        .function("isActive", &Bone::isActive)
        .function("update", &Bone::update)
        .function("updateWorldTransform", select_overload<void()>(&Bone::updateWorldTransform))
        .function("updateWorldTransformWith", select_overload<void(float, float, float, float, float, float, float)>(&Bone::updateWorldTransform))
        .function("setToSetupPose", &Bone::setToSetupPose)
        .function("getWorldRotationX", &Bone::getWorldRotationX)
        .function("getWorldRotationY", &Bone::getWorldRotationY)
        .function("getWorldScaleX", &Bone::getWorldScaleX)
        .function("getWorldScaleY", &Bone::getWorldScaleY) 
        .function("worldToLocal", optional_override([](Bone &obj, Vector2 &vec2) {
                float outLocalX, outLocalY;
                obj.worldToLocal(vec2.x, vec2.y, outLocalX, outLocalY);
                vec2.x = outLocalX;
                vec2.y = outLocalY;
            }), 
            allow_raw_pointers()
        )
        .function("localToWorld", optional_override([](Bone &obj, Vector2 &vec2) {
                float outWorldX, outWorldY;
                obj.localToWorld(vec2.x, vec2.y, outWorldX, outWorldY);
                vec2.x = outWorldX;
                vec2.y = outWorldY;
            }), 
            allow_raw_pointers()
        )
        .function("worldToLocalRotation", &Bone::worldToLocalRotation)
        .function("localToWorldRotation", &Bone::localToWorldRotation)
        .function("rotateWorld", &Bone::rotateWorld);

    class_<BoneData>("BoneData")
        .constructor<int, const String &, BoneData *>()
        .function("getIndex", &BoneData::getIndex)
        .function("getName", optional_override([](BoneData &obj) { return STRING_SP2STD(obj.getName()); }))
        .function("getParent", &BoneData::getParent, allow_raw_pointer<BoneData>())
        .function("getLength", &BoneData::getLength)
        .function("setLength", &BoneData::setLength)
        .function("getX", &BoneData::getX)
        .function("setX", &BoneData::setX)
        .function("getY", &BoneData::getY)
        .function("setY", &BoneData::setY)
        .function("getRotation", &BoneData::getRotation)
        .function("setRotation", &BoneData::setRotation)
        .function("getScaleX", &BoneData::getScaleX)
        .function("setScaleX", &BoneData::setScaleX)
        .function("getScaleY", &BoneData::getScaleY)
        .function("setScaleY", &BoneData::setScaleY)
        .function("getShearX", &BoneData::getShearX)
        .function("setShearX", &BoneData::setShearX)
        .function("getShearY", &BoneData::getShearY)
        .function("setShearY", &BoneData::setShearY)
        .function("getTransformMode", &BoneData::getTransformMode)
        .function("setTransformMode", &BoneData::setTransformMode)
        .function("getSkinRequired", &BoneData::isSkinRequired)
        .function("setShinRequired", &BoneData::setSkinRequired);

    class_<Slot>("Slot")
        .constructor<SlotData &, Bone &>()
        .function("getData", optional_override([](Slot &obj) {
            return &obj.getData(); }), allow_raw_pointers())
        .function("getBone", optional_override([](Slot &obj) {
            return &obj.getBone(); }), allow_raw_pointers())
        .function("getColor", optional_override([](Slot &obj) {
            return &obj.getColor(); }), allow_raw_pointers())
        .function("getDarkColor", optional_override([](Slot &obj) {
            return &obj.getDarkColor(); }), allow_raw_pointers())
        .function("getDeform", &Slot::getDeform, allow_raw_pointers())
        .function("getSkeleton", optional_override([](Slot &obj) {
            return &obj.getSkeleton(); }), allow_raw_pointers())
        .function("getAttachment", &Slot::getAttachment, allow_raw_pointers())
        .function("setAttachment", &Slot::setAttachment, allow_raw_pointers())
        .function("setAttachmentTime", &Slot::setAttachmentTime)
        .function("getAttachmentTime", &Slot::getAttachmentTime)
        .function("setToSetupPose", &Slot::setToSetupPose);

    class_<Skin>("Skin")
        .constructor<const String &>()
        .function("getName", optional_override([](Skin &obj) {
            return STRING_SP2STD(obj.getName()); }))
        .function("getBones", optional_override([](Skin &obj) {
            return &obj.getBones(); }), allow_raw_pointer<SPVectorBoneDataPtr>())
        .function("getConstraints", optional_override([](Skin &obj) {
            return &obj.getConstraints(); }), allow_raw_pointer<SPVectorConstraintDataPtr>())
        .function("setAttachment", optional_override([](Skin &obj, size_t index,
        const std::string &name, Attachment *attachment) {
            return obj.setAttachment(index, STRING_STD2SP(name), attachment);
        }), allow_raw_pointers())
        .function("addSkin", select_overload<void(Skin *)>(&Skin::addSkin), allow_raw_pointers())
        .function("copySkin", select_overload<void(Skin *)>(&Skin::copySkin), allow_raw_pointers())
        .function("findNamesForSlot", optional_override([](Skin &obj, size_t slotIndex) {
            std::vector<std::string> vetNames;
            std::vector<Skin::AttachmentMap::Entry *> entriesVector;
            auto entries = obj.getAttachments();
            while (entries.hasNext()) {
                Skin::AttachmentMap::Entry &entry = entries.next();
                if (entry._slotIndex == slotIndex) vetNames.push_back(STRING_SP2STD(entry._name));
            }
            return vetNames; 
        }), allow_raw_pointers())
        .function("getAttachment", optional_override([](Skin &obj, size_t slotIndex,
        const std::string &name) {
            return obj.getAttachment(slotIndex, STRING_STD2SP(name));
        }), allow_raw_pointers())
        .function("getAttachments", optional_override([](Skin &obj) {
            std::vector<Skin::AttachmentMap::Entry *> entriesVector;
            auto entries = obj.getAttachments();
            while (entries.hasNext()) {
                entriesVector.push_back(&entries.next());
            }
            return entriesVector;
        }),allow_raw_pointers())
        .function("removeAttachment", optional_override([](Skin &obj, size_t index,
        const std::string &name) {
            obj.removeAttachment(index, STRING_STD2SP(name)); }))
        .function("getAttachmentsForSlot", optional_override([](Skin &obj, size_t index) {
            std::vector<Skin::AttachmentMap::Entry *> entriesVector;
            auto entries = obj.getAttachments();
            while (entries.hasNext()) {
                Skin::AttachmentMap::Entry &entry = entries.next();
                if (entry._slotIndex == index) entriesVector.push_back(&entry);
            }
            return entriesVector;
        }),allow_raw_pointers());

    class_<Skin::AttachmentMap::Entry>("SkinEntry")
        .constructor<size_t, const String &, Attachment *>()
        .property("slotIndex", &Skin::AttachmentMap::Entry::_slotIndex)
        .function("getName", optional_override([](Skin::AttachmentMap::Entry &obj) { return STRING_SP2STD((const String)obj._name); }))
        .function("getAttachment", optional_override([](Skin::AttachmentMap::Entry &obj) { return obj._attachment; }), allow_raw_pointers());

    class_<SkeletonClipping>("SkeletonClipping")
        .constructor<>()
        .function("getClippedVertices", &SkeletonClipping::getClippedVertices)
        .function("getClippedTriangles", &SkeletonClipping::getClippedTriangles)
        .function("getClippedUVs", &SkeletonClipping::getClippedUVs)
        .function("clipStart", &SkeletonClipping::clipStart, allow_raw_pointers())
        .function("clipEndWithSlot", select_overload<void(Slot &)>(&SkeletonClipping::clipEnd))
        .function("clipEnd", select_overload<void()>(&SkeletonClipping::clipEnd))
        .function("isClipping", &SkeletonClipping::isClipping);

    class_<SkeletonData>("SkeletonData")
        .constructor<>()
        .function("getName", optional_override([](SkeletonData &obj) {
            return STRING_SP2STD(obj.getName()); }))
        .function("setName", &SkeletonData::setName)
        .function("getBones", optional_override([](SkeletonData &obj) {
            return &obj.getBones(); }), allow_raw_pointer<SPVectorBoneDataPtr>())
        .function("getSlots", optional_override([](SkeletonData &obj) {
            return &obj.getSlots(); }), allow_raw_pointer<SPVectorSlotDataPtr>())
        .function("getSkins", optional_override([](SkeletonData &obj) {
            return &obj.getSkins(); }), allow_raw_pointer<SPVectorSkinPtr>())
        .function("getDefaultSkin", &SkeletonData::getDefaultSkin, allow_raw_pointers())
        .function("setDefaultSkin", &SkeletonData::setDefaultSkin, allow_raw_pointers())
        .function("getEvents", optional_override([](SkeletonData &obj) {
            return &obj.getEvents(); }), allow_raw_pointer<SPVectorEventDataPtr>())
        .function("getAnimations", optional_override([](SkeletonData &obj) {
            return &obj.getAnimations(); }), allow_raw_pointer<SPVectorAnimationPtr>())
        .function("getIkConstraints", optional_override([](SkeletonData &obj) {
            return &obj.getIkConstraints(); }), allow_raw_pointer<SPVectorIkConstraintDataPtr>())
        .function("getTransformConstraints", optional_override([](SkeletonData &obj) {
            return &obj.getTransformConstraints(); }), allow_raw_pointer<SPVectorTransformConstraintDataPtr>())
        .function("getPathConstraints", optional_override([](SkeletonData &obj) {
            return &obj.getPathConstraints(); }), allow_raw_pointer<SPVectorPathConstraintDataPtr>())
        .function("getX", &SkeletonData::getX)
        .function("setX", &SkeletonData::setX)
        .function("getY", &SkeletonData::getY)
        .function("setY", &SkeletonData::setY)
        .function("getWidth", &SkeletonData::getWidth)
        .function("setWidth", &SkeletonData::setWidth)
        .function("getHeight", &SkeletonData::getHeight)
        .function("setHeight", &SkeletonData::setHeight)
        .function("getVersion", optional_override([](SkeletonData &obj) {
            return STRING_SP2STD(obj.getVersion()); }))
        .function("setVersion", &SkeletonData::setVersion)
        .function("getHash", optional_override([](SkeletonData &obj) {
            return STRING_SP2STD(obj.getHash()); }))
        .function("setHash", &SkeletonData::setHash)
        .function("getFps", &SkeletonData::getFps)
        .function("setFps", &SkeletonData::setFps)
        .function("getImagesPath", optional_override([](SkeletonData &obj) {
            return STRING_SP2STD(obj.getImagesPath()); }))
        .function("setImagesPath", &SkeletonData::setImagesPath)
        .function("getAudioPath", optional_override([](SkeletonData &obj) {
            return STRING_SP2STD(obj.getAudioPath()); }))
        .function("setAudioPath", &SkeletonData::setAudioPath)
        .function("findBone", optional_override([](SkeletonData &obj, const std::string &name) {
            return obj.findBone(STRING_STD2SP(name)); }), allow_raw_pointers())
        .function("findBoneIndex", optional_override([](SkeletonData &obj, const std::string &name) {
            return obj.findBoneIndex(STRING_STD2SP(name)); }))
        .function("findSlot", optional_override([](SkeletonData &obj, const std::string &name) {
            return obj.findSlot(STRING_STD2SP(name)); }), allow_raw_pointers())
        .function("findSlotIndex", optional_override([](SkeletonData &obj, const std::string &name) {
            return obj.findSlotIndex(STRING_STD2SP(name)); }))
        .function("findSkin", optional_override([](SkeletonData &obj, const std::string &name) {
            return obj.findSkin(STRING_STD2SP(name)); }), allow_raw_pointers())
        .function("findEvent", optional_override([](SkeletonData &obj, const std::string &name) {
            return obj.findEvent(STRING_STD2SP(name)); }), allow_raw_pointers())
        .function("findAnimation", optional_override([](SkeletonData &obj, const std::string &name) {
            return obj.findAnimation(STRING_STD2SP(name)); }), allow_raw_pointers())
        .function("findIkConstraint", optional_override([](SkeletonData &obj, const std::string &name) {
            return obj.findIkConstraint(STRING_STD2SP(name)); }), allow_raw_pointers())
        .function("findTransformConstraint", optional_override([](SkeletonData &obj, const std::string &name) {
            return obj.findTransformConstraint(STRING_STD2SP(name)); }), allow_raw_pointers())
        .function("findPathConstraint", optional_override([](SkeletonData &obj, const std::string &name) {
            return obj.findPathConstraint(STRING_STD2SP(name)); }), allow_raw_pointers())
        .function("findPathConstraintIndex", optional_override([](SkeletonData &obj, const std::string &name) {
            return obj.findPathConstraintIndex(STRING_STD2SP(name)); }));

    class_<Animation>("Animation")
        .constructor<const String &, Vector<Timeline *> &, float>()
        .function("apply", optional_override([](Animation &obj, Skeleton &skeleton,
        float lastTime, float time, bool loop, std::vector<Event *> &stdPEvents, float alpha,
        MixBlend blend, MixDirection direction) {
            auto pEvents = VECTOR_STD2SP_POINTER(stdPEvents);
            obj.apply(skeleton, lastTime, time, loop, &pEvents, alpha, blend, direction);
        }))
        .function("getName", optional_override([](Animation &obj) { return STRING_SP2STD(obj.getName()); }))
        .function("getTimelines", optional_override([](Animation &obj) {
            return &obj.getTimelines(); }), allow_raw_pointer<SPVectorTimelinePtr>())
        .function("hasTimeline", &Animation::hasTimeline)
        .function("getDuration", &Animation::getDuration)
        .function("setDuration", &Animation::setDuration);

    class_<Timeline>("Timeline")
        .function("apply", optional_override([](Timeline &obj, Skeleton &skeleton,
        float lastTime, float time, std::vector<Event *> &stdPEvents, float alpha,
        MixBlend blend, MixDirection direction) {
            auto pEvents = VECTOR_STD2SP_POINTER(stdPEvents);
            obj.apply(skeleton, lastTime, time, &pEvents, alpha, blend, direction);
        }), pure_virtual())
        .function("getPropertyId", &Timeline::getPropertyId, pure_virtual());

    class_<CurveTimeline, base<Timeline>>("CurveTimeline")
        .function("apply", optional_override([](CurveTimeline &obj, Skeleton &skeleton,
        float lastTime, float time, std::vector<Event *> &stdPEvents, float alpha,
        MixBlend blend, MixDirection direction) {
            auto pEvents = VECTOR_STD2SP_POINTER(stdPEvents);
            obj.apply(skeleton, lastTime, time, &pEvents, alpha, blend, direction);
        }), pure_virtual())
        .function("getPropertyId", &CurveTimeline::getPropertyId, pure_virtual())
        .function("getFrameCount", &CurveTimeline::getFrameCount)
        .function("setLinear", &CurveTimeline::setLinear)
        .function("setStepped", &CurveTimeline::setStepped)
        .function("setCurve", &CurveTimeline::setCurve)
        .function("getCurvePercent", &CurveTimeline::getCurvePercent)
        .function("getCurveType", &CurveTimeline::getCurveType);

    class_<TranslateTimeline, base<CurveTimeline>>("TranslateTimeline")
        .constructor<int>()
        .class_property("ENTRIES", &TranslateTimeline::ENTRIES)
        .function("getPropertyId", &TranslateTimeline::getPropertyId)
        .function("setFrame", &TranslateTimeline::setFrame)
        .function("apply", optional_override([](TranslateTimeline &obj, Skeleton &skeleton,
        float lastTime, float time, std::vector<Event *> &stdPEvents, float alpha,
        MixBlend blend, MixDirection direction) {
            auto pEvents = VECTOR_STD2SP_POINTER(stdPEvents);
            obj.apply(skeleton, lastTime, time, &pEvents, alpha, blend, direction);
        }), allow_raw_pointers());

    class_<ScaleTimeline, base<TranslateTimeline>>("ScaleTimeline")
        .constructor<int>()
        .function("getPropertyId", &ScaleTimeline::getPropertyId)
        .function("apply", optional_override([](ScaleTimeline &obj, Skeleton &skeleton,
        float lastTime, float time, std::vector<Event *> &stdPEvents, float alpha,
        MixBlend blend, MixDirection direction) {
            auto pEvents = VECTOR_STD2SP_POINTER(stdPEvents);
            obj.apply(skeleton, lastTime, time, &pEvents, alpha, blend, direction);
        }), allow_raw_pointers());

    class_<ShearTimeline, base<TranslateTimeline>>("ShearTimeline")
        .constructor<int>()
        .function("getPropertyId", &ShearTimeline::getPropertyId)
        .function("apply", optional_override([](ShearTimeline &obj, Skeleton &skeleton,
        float lastTime, float time, std::vector<Event *> &stdPEvents, float alpha,
        MixBlend blend, MixDirection direction) {
            auto pEvents = VECTOR_STD2SP_POINTER(stdPEvents);
            obj.apply(skeleton, lastTime, time, &pEvents, alpha, blend, direction);
        }), allow_raw_pointers());

    class_<RotateTimeline, base<CurveTimeline>>("RotateTimeline")
        .constructor<int>()
        //.class_property("ENTRIES", &RotateTimeline::ENTRIES) not bind
        .function("getBoneIndex", &RotateTimeline::getBoneIndex)
        .function("setBoneIndex", &RotateTimeline::setBoneIndex)
        .function("getFrames", optional_override([](RotateTimeline &obj) {
            return &obj.getFrames(); }), allow_raw_pointer<SPVectorFloat>())
        .function("getPropertyId", &RotateTimeline::getPropertyId)
        .function("setFrame", &RotateTimeline::setFrame)
        .function("apply", optional_override([](RotateTimeline &obj, Skeleton &skeleton,
        float lastTime, float time, std::vector<Event *> &stdPEvents, float alpha,
        MixBlend blend, MixDirection direction) {
            auto pEvents = VECTOR_STD2SP_POINTER(stdPEvents);
            obj.apply(skeleton, lastTime, time, &pEvents, alpha, blend, direction);
        }), allow_raw_pointers());

    class_<ColorTimeline, base<CurveTimeline>>("ColorTimeline")
        .constructor<int>()
        .class_property("ENTRIES", &ColorTimeline::ENTRIES) 
        .function("getSlotIndex", &ColorTimeline::getSlotIndex)
        .function("setSlotIndex", &ColorTimeline::setSlotIndex)
        .function("getFrames", optional_override([](ColorTimeline &obj) {
            return &obj.getFrames(); }), allow_raw_pointer<SPVectorFloat>())
        .function("getPropertyId", &ColorTimeline::getPropertyId)
        .function("setFrame", &ColorTimeline::setFrame)
        .function("apply", optional_override([](ColorTimeline &obj, Skeleton &skeleton,
        float lastTime, float time, std::vector<Event *> &stdPEvents, float alpha,
        MixBlend blend, MixDirection direction) {
            auto pEvents = VECTOR_STD2SP_POINTER(stdPEvents);
            obj.apply(skeleton, lastTime, time, &pEvents, alpha, blend, direction);
        }), allow_raw_pointers());

    class_<TwoColorTimeline, base<CurveTimeline>>("TwoColorTimeline")
        .constructor<int>()
        .class_property("ENTRIES", &ColorTimeline::ENTRIES)
        .function("getSlotIndex", &TwoColorTimeline::getSlotIndex)
        .function("setSlotIndex", &TwoColorTimeline::setSlotIndex)
        .function("getPropertyId", &TwoColorTimeline::getPropertyId)
        .function("setFrame", &TwoColorTimeline::setFrame)
        .function("apply", optional_override([](TwoColorTimeline &obj, Skeleton &skeleton,
        float lastTime, float time, std::vector<Event *> &stdPEvents, float alpha,
        MixBlend blend, MixDirection direction) {
            auto pEvents = VECTOR_STD2SP_POINTER(stdPEvents);
            obj.apply(skeleton, lastTime, time, &pEvents, alpha, blend, direction);
        }), allow_raw_pointers());

    class_<AttachmentTimeline, base<Timeline>>("AttachmentTimeline")
        .constructor<int>()
        .function("getSlotIndex", &AttachmentTimeline::getSlotIndex)
        .function("setSlotIndex", &AttachmentTimeline::setSlotIndex)
        .function("getFrames", optional_override([](AttachmentTimeline &obj) {
             return &obj.getFrames(); }), allow_raw_pointer<SPVectorFloat>())
        .function("getAttachmentNames",optional_override([](AttachmentTimeline &obj) {
            Vector<String> attachmentNames = obj.getAttachmentNames();
            return VECTOR_SP2STD_STRING(attachmentNames); }), allow_raw_pointers())
        .function("getPropertyId", &AttachmentTimeline::getPropertyId)
        .function("getFrameCount", &AttachmentTimeline::getFrameCount)
        .function("setFrame", optional_override([](AttachmentTimeline &obj, int frameIndex, float time, const std::string &attachmentName){
            const String attachmentNameSP = STRING_STD2SP(attachmentName);
            obj.setFrame(frameIndex, time, attachmentNameSP);
        }), allow_raw_pointers())
        .function("apply", optional_override([](AttachmentTimeline &obj, Skeleton &skeleton,
        float lastTime, float time, std::vector<Event *> &stdPEvents, float alpha,
        MixBlend blend, MixDirection direction) {
            auto pEvents = VECTOR_STD2SP_POINTER(stdPEvents);
            obj.apply(skeleton, lastTime, time, &pEvents, alpha, blend, direction);
        }), allow_raw_pointers());

    class_<DeformTimeline, base<CurveTimeline>>("DeformTimeline")
        .constructor<int>()
        .function("getSlotIndex", &DeformTimeline::getSlotIndex)
        .function("setSlotIndex", &DeformTimeline::setSlotIndex)
        .function("getAttachment", &DeformTimeline::getAttachment, allow_raw_pointers())
        .function("setAttachment", &DeformTimeline::setAttachment, allow_raw_pointers())
        .function("getFrames", optional_override([](DeformTimeline &obj) {
            return &obj.getFrames(); }), allow_raw_pointer<SPVectorFloat>())
        .function("getFrameVertices", optional_override([](DeformTimeline &obj) {
            return &obj.getVertices(); }), allow_raw_pointer<SPVectorVectorFloat>())
        .function("getPropertyId", &DeformTimeline::getPropertyId)
        .function("setFrame", optional_override([](DeformTimeline &obj, int frameIndex, float time, std::vector<float> &vertices){
            Vector<float> sp_vertices = VECTOR_STD2SP(vertices);
            obj.setFrame(frameIndex, time, sp_vertices);
        }), allow_raw_pointers())
        .function("apply", optional_override([](DeformTimeline &obj, Skeleton &skeleton,
        float lastTime, float time, std::vector<Event *> &stdPEvents, float alpha,
        MixBlend blend, MixDirection direction) {
            auto pEvents = VECTOR_STD2SP_POINTER(stdPEvents);
            obj.apply(skeleton, lastTime, time, &pEvents, alpha, blend, direction);
        }), allow_raw_pointers());

    class_<EventTimeline, base<Timeline>>("EventTimeline")
        .constructor<int>()
        .function("getFrames", optional_override([](EventTimeline &obj) {
            return &obj.getFrames(); }), allow_raw_pointer<SPVectorFloat>())
        .function("getEvents",  optional_override([](EventTimeline &obj) {
            return &obj.getEvents(); }), allow_raw_pointer<SPVectorEventDataPtr>())
        .function("getPropertyId", &EventTimeline::getPropertyId)
        .function("getFrameCount", &EventTimeline::getFrameCount)
        .function("setFrame", &EventTimeline::setFrame, allow_raw_pointers())
        .function("apply", optional_override([](EventTimeline &obj, Skeleton &skeleton,
        float lastTime, float time, std::vector<Event *> &stdPEvents, float alpha,
        MixBlend blend, MixDirection direction) {
            auto pEvents = VECTOR_STD2SP_POINTER(stdPEvents);
            obj.apply(skeleton, lastTime, time, &pEvents, alpha, blend, direction);
        }), allow_raw_pointers());

    class_<DrawOrderTimeline, base<Timeline>>("DrawOrderTimeline")
        .constructor<int>()
        .function("getFrames", optional_override([](DrawOrderTimeline &obj) {
            return &obj.getFrames(); }), allow_raw_pointer<SPVectorFloat>())
        .function("getPropertyId", &DrawOrderTimeline::getPropertyId)
        .function("getFrameCount", &DrawOrderTimeline::getFrameCount)
        .function("getDrawOrders", optional_override([](DrawOrderTimeline &obj) { 
            return &obj.getDrawOrders(); }), allow_raw_pointer<SPVectorVectorInt>())
        .function("setFrame", &DrawOrderTimeline::setFrame, allow_raw_pointers())
        .function("apply", optional_override([](DrawOrderTimeline &obj, Skeleton &skeleton,
        float lastTime, float time, std::vector<Event *> &stdPEvents, float alpha,
        MixBlend blend, MixDirection direction) {
            auto pEvents = VECTOR_STD2SP_POINTER(stdPEvents);
            obj.apply(skeleton, lastTime, time, &pEvents, alpha, blend, direction);
        }), allow_raw_pointers());

    class_<IkConstraintTimeline, base<CurveTimeline>>("IkConstraintTimeline")
        .constructor<int>()
        .class_property("ENTRIES", &IkConstraintTimeline::ENTRIES)
        .function("getPropertyId", &IkConstraintTimeline::getPropertyId)
        .function("setFrame", &IkConstraintTimeline::setFrame)
        .function("apply", optional_override([](IkConstraintTimeline &obj, Skeleton &skeleton,
        float lastTime, float time, std::vector<Event *> &stdPEvents, float alpha,
        MixBlend blend, MixDirection direction) {
            auto pEvents = VECTOR_STD2SP_POINTER(stdPEvents);
            obj.apply(skeleton, lastTime, time, &pEvents, alpha, blend, direction);
        }), allow_raw_pointers());

    class_<TransformConstraintTimeline, base<CurveTimeline>>("TransformConstraintTimeline")
        .constructor<int>()
        .class_property("ENTRIES", &TransformConstraintTimeline::ENTRIES)
        .function("getPropertyId", &TransformConstraintTimeline::getPropertyId)
        .function("setFrame", &TransformConstraintTimeline::setFrame)
        .function("apply", optional_override([](TransformConstraintTimeline &obj, Skeleton &skeleton,
        float lastTime, float time, std::vector<Event *> &stdPEvents, float alpha,
        MixBlend blend, MixDirection direction) {
            auto pEvents = VECTOR_STD2SP_POINTER(stdPEvents);
            obj.apply(skeleton, lastTime, time, &pEvents, alpha, blend, direction);
        }), allow_raw_pointers());

    class_<PathConstraintPositionTimeline, base<CurveTimeline>>("PathConstraintPositionTimeline")
        .constructor<int>()
        .class_property("ENTRIES", &TransformConstraintTimeline::ENTRIES)
        .function("getPropertyId", &PathConstraintPositionTimeline::getPropertyId)
        .function("setFrame", &PathConstraintPositionTimeline::setFrame)
        .function("apply", optional_override([](PathConstraintPositionTimeline &obj, Skeleton &skeleton,
        float lastTime, float time, std::vector<Event *> &stdPEvents, float alpha,
        MixBlend blend, MixDirection direction) {
            auto pEvents = VECTOR_STD2SP_POINTER(stdPEvents);
            obj.apply(skeleton, lastTime, time, &pEvents, alpha, blend, direction);
        }), allow_raw_pointers());

    class_<PathConstraintMixTimeline, base<CurveTimeline>>("PathConstraintMixTimeline")
        .constructor<int>()
        .class_property("ENTRIES", &PathConstraintMixTimeline::ENTRIES)
        .function("getPropertyId", &PathConstraintMixTimeline::getPropertyId)
        .function("apply", optional_override([](PathConstraintMixTimeline &obj, Skeleton &skeleton,
        float lastTime, float time, std::vector<Event *> &stdPEvents, float alpha,
        MixBlend blend, MixDirection direction) {
            auto pEvents = VECTOR_STD2SP_POINTER(stdPEvents);
            obj.apply(skeleton, lastTime, time, &pEvents, alpha, blend, direction);
        }), allow_raw_pointers());

    class_<TrackEntry>("TrackEntry")
        .constructor<>()
        .function("getAnimation", &TrackEntry::getAnimation, allow_raw_pointer<Animation>())
        .function("getNext", &TrackEntry::getNext, allow_raw_pointer<TrackEntry>())
        .function("getMixingFrom", &TrackEntry::getMixingFrom, allow_raw_pointer<TrackEntry>())
        .function("getMixingTo", &TrackEntry::getMixingTo, allow_raw_pointer<TrackEntry>())
        //.function("getProp_listener", &TrackEntry::listener)
        .function("getTrackIndex", &TrackEntry::getTrackIndex)
        .function("getLoop", &TrackEntry::getLoop)
        .function("setLoop", &TrackEntry::setLoop)
        .function("getHoldPrevious", &TrackEntry::getHoldPrevious)
        .function("setHoldPrevious", &TrackEntry::setHoldPrevious)
        .function("getEventThreshold", &TrackEntry::getEventThreshold)
        .function("setEventThreshold", &TrackEntry::setEventThreshold)
        .function("getAttachmentThreshold", &TrackEntry::getAttachmentThreshold)
        .function("setAttachmentThreshold", &TrackEntry::setAttachmentThreshold)
        .function("getDrawOrderThreshold", &TrackEntry::getDrawOrderThreshold)
        .function("setDrawOrderThreshold", &TrackEntry::setDrawOrderThreshold)
        .function("getAnimationStart", &TrackEntry::getAnimationStart)
        .function("setAnimationStart", &TrackEntry::setAnimationStart)
        .function("getAnimationEnd", &TrackEntry::getAnimationEnd)
        .function("setAnimationEnd", &TrackEntry::setAnimationEnd)
        .function("getAnimationLast", &TrackEntry::getAnimationLast)
        .function("setAnimationLast", &TrackEntry::setAnimationLast)
        //.function("getProp_nextAnimationLast", &TrackEntry::nextAnimationLast)
        .function("getDelay", &TrackEntry::getDelay)
        .function("setDelay", &TrackEntry::setDelay)
        .function("getTrackTime", &TrackEntry::getTrackTime)
        .function("setTrackTime", &TrackEntry::setTrackTime)
        //.function("getProp_trackLast", &TrackEntry::trackLast)
        //.function("getProp_nextTrackLast", &TrackEntry::nextTrackLast)
        .function("getTrackEnd", &TrackEntry::getTrackEnd)
        .function("setTrackEnd", &TrackEntry::setTrackEnd)
        .function("getTimeScale", &TrackEntry::getTimeScale)
        .function("setTimeScale", &TrackEntry::setTimeScale)
        .function("getAlpha", &TrackEntry::getAlpha)
        .function("setAlpha", &TrackEntry::setAlpha)
        .function("getMixTime", &TrackEntry::getMixTime)
        .function("setMixTime", &TrackEntry::setMixTime)
        .function("getMixDuration", &TrackEntry::getMixDuration)
        .function("setMixDuration", &TrackEntry::setMixDuration)
        //.function("getProp_interruptAlpha", &TrackEntry::_interruptAlpha)
        //.function("getProp_totalAlpha", &TrackEntry::getAlpha)
        .function("getMixBlend", &TrackEntry::getMixBlend)
        .function("setMixBlend", &TrackEntry::setMixBlend)
        //.function("getProp_timelineMode", &TrackEntry::timelineMode)
        //.function("getProp_timelineHoldMix", &TrackEntry::timelineHoldMix)
        //.function("getProp_timelinesRotation", &TrackEntry::timelinesRotation)
        //.function("reset", &TrackEntry::reset) //private
        .function("getAnimationTime", &TrackEntry::getAnimationTime)
        .function("isComplete", &TrackEntry::isComplete)
        .function("resetRotationDirections", &TrackEntry::resetRotationDirections);

    class_<AnimationStateData>("AnimationStateData")
        .constructor<SkeletonData *>()
        .function("getDefaultMix", &AnimationStateData::getDefaultMix)
        .function("setDefaultMix", &AnimationStateData::setDefaultMix)
        .function("getSkeletonData", &AnimationStateData::getSkeletonData, allow_raw_pointers())
        .function("setMix", optional_override([](AnimationStateData &obj, const std::string& fromName, const std::string& toName, float duration) { 
            return obj.setMix(STRING_STD2SP(fromName), STRING_STD2SP(toName), duration);}))
        .function("setMixWith", optional_override([](AnimationStateData &obj, Animation* from, Animation* to, float duration) { 
            return obj.setMix(from, to, duration);}), allow_raw_pointers())
        .function("getMix", &AnimationStateData::getMix, allow_raw_pointers());

    class_<AnimationState>("AnimationState")
        .constructor<AnimationStateData *>()
        .function("getData", &AnimationState::getData, allow_raw_pointers())
        .function("getTracks", optional_override([](AnimationState &obj) {
            return &obj.getTracks(); }), allow_raw_pointer<SPVectorTrackEntryPtr>())
        .function("getTimeScale", &AnimationState::getTimeScale)
        .function("setTimeScale", &AnimationState::setTimeScale)
        .function("update", &AnimationState::update)
        .function("apply", &AnimationState::apply)
        .function("clearTracks", &AnimationState::clearTracks)
        .function("clearTrack", &AnimationState::clearTrack)
        .function("setAnimation", optional_override([](AnimationState &obj, uint32_t trackIndex, const std::string &animName, bool loop) { return obj.setAnimation(trackIndex, STRING_STD2SP(animName), loop); }), allow_raw_pointers())
        .function("setAnimationWith", optional_override([](AnimationState &obj, uint32_t trackIndex, Animation *animation, bool loop) { return obj.setAnimation(trackIndex, animation, loop); }), allow_raw_pointers())
        .function("addAnimation", optional_override([](AnimationState &obj, uint32_t trackIndex, const std::string &animName, bool loop, float delay) { return obj.addAnimation(trackIndex, STRING_STD2SP(animName), loop, delay); }), allow_raw_pointers())
        .function("addAnimationWith", optional_override([](AnimationState &obj, uint32_t trackIndex, Animation *animation, bool loop, float delay) { return obj.addAnimation(trackIndex, animation, loop, delay); }), allow_raw_pointers())
        .function("setEmptyAnimation", &AnimationState::setEmptyAnimation, allow_raw_pointers())
        .function("addEmptyAnimation", &AnimationState::addEmptyAnimation, allow_raw_pointers())
        .function("setEmptyAnimations", &AnimationState::setEmptyAnimations)
        .function("getCurrent", &AnimationState::getCurrent, allow_raw_pointer<TrackEntry>())
        .function("setListener",  optional_override([](AnimationState &obj, AnimationStateListener inValue) {
            obj.setListener(inValue); }),allow_raw_pointers())
        .function("setListenerObject", optional_override([](AnimationState &obj, AnimationStateListenerObject *inValue) {
            obj.setListener(inValue); }),allow_raw_pointers())
        .function("disableQueue", &AnimationState::disableQueue)
        .function("enableQueue", &AnimationState::enableQueue);
        //.function("addListener", &AnimationState::addListener)
        //.function("removeListener", &AnimationState::removeListener)
        //.function("clearListeners", &AnimationState::clearListeners) // no have clearListeners

    //private
    // class_<EventQueue>("EventQueue")
    //     .constructor<AnimationState& , Pool<TrackEntry>& >()
    //     .function("start", &EventQueue::start, allow_raw_pointers())
    //     .function("interrupt", &EventQueue::interrupt, allow_raw_pointers())
    //     .function("end", &EventQueue::end, allow_raw_pointers())
    //     .function("dispose", &EventQueue::dispose, allow_raw_pointers())
    //     .function("complete", &EventQueue::complete, allow_raw_pointers())
    //     .function("event", &EventQueue::event, allow_raw_pointers())
    //     .function("drain", &EventQueue::drain)
    //     .function("clear");

    //class_<AnimationStateListener>("AnimationStateListener")

    //class_<AnimationStateListenerObject>("AnimationStateListenerObject")
    //    .constructor<>()
    //    .function("callback", &AnimationStateListenerObject::callback, pure_virtual());

    //class_<AnimationStateAdapter>("AnimationStateAdapter")

    class_<Skeleton>("Skeleton")
        .constructor<SkeletonData *>()
        .function("getData", &Skeleton::getData, allow_raw_pointer<SkeletonData>())
        .function("getBones", optional_override([](Skeleton &obj){
            return &obj.getBones(); }), allow_raw_pointer<SPVectorBonePtr>())
        .function("getSlots", optional_override([](Skeleton &obj){ 
            return &obj.getSlots(); }), allow_raw_pointer<SPVectorSlotPtr>())
        .function("getDrawOrder", optional_override([](Skeleton &obj){
            return &obj.getDrawOrder(); }), allow_raw_pointer<SPVectorSlotPtr>())
        .function("getIkConstraints", optional_override([](Skeleton &obj){
            return &obj.getIkConstraints(); }), allow_raw_pointer<SPVectorIkConstraintPtr>())
        .function("getTransformConstraints", optional_override([](Skeleton &obj){
            return &obj.getTransformConstraints(); }), allow_raw_pointer<SPVectorTransformConstraintPtr>())
        .function("getPathConstraints", optional_override([](Skeleton &obj){
            return &obj.getPathConstraints(); }), allow_raw_pointer<SPVectorPathConstraintPtr>())
        .function("getUpdateCacheList", optional_override([](Skeleton &obj){
            return &obj.getUpdateCacheList(); }), allow_raw_pointer<SPVectorUpdatablePtr>())
        .function("getSkin", &Skeleton::getSkin, allow_raw_pointer<Skin>())
        .function("getColor", optional_override([](Skeleton &obj){
            return &obj.getColor(); }), allow_raw_pointers())
        .function("getTime", &Skeleton::getTime)
        .function("setTime", &Skeleton::setTime)
        .function("getScaleX", &Skeleton::getScaleX)
        .function("setScaleX", &Skeleton::setScaleX)
        .function("getScaleY", &Skeleton::getScaleY)
        .function("setScaleY", &Skeleton::setScaleY)
        .function("getX", &Skeleton::getX)
        .function("setX", &Skeleton::setX)
        .function("getY", &Skeleton::getY)
        .function("setY", &Skeleton::setY)
        .function("updateCache", &Skeleton::updateCache)
        .function("updateWorldTransform", &Skeleton::updateWorldTransform)
        .function("setToSetupPose", &Skeleton::setToSetupPose)
        .function("setBonesToSetupPose", &Skeleton::setBonesToSetupPose)
        .function("setSlotsToSetupPose", &Skeleton::setSlotsToSetupPose)
        .function("getRootBone", &Skeleton::getRootBone, allow_raw_pointer<Bone>())
        .function("findBone", optional_override([](Skeleton &obj, const std::string& name) {
            return obj.findBone(STRING_STD2SP(name));}), allow_raw_pointers())
        .function("findBoneIndex", optional_override([](Skeleton &obj, const std::string& name) {
            return obj.findBoneIndex(STRING_STD2SP(name));}))
        .function("findSlot", optional_override([](Skeleton &obj, const std::string& name) {
            return obj.findSlot(STRING_STD2SP(name));}), allow_raw_pointers())
        .function("findSlotIndex", optional_override([](Skeleton &obj, const std::string& name) {
            return obj.findSlotIndex(STRING_STD2SP(name));}))
        .function("setSkinByName", optional_override([](Skeleton &obj, const std::string& name) {
            return obj.setSkin(STRING_STD2SP(name));}))
        .function("setSkin", static_cast<void (Skeleton::*)(Skin *)>(&Skeleton::setSkin), allow_raw_pointer<Skin>())
        .function("getAttachmentByName", optional_override([](Skeleton &obj, const std::string& slotName, const std::string& attachmentName) { 
            return obj.getAttachment(STRING_STD2SP(slotName), STRING_STD2SP(attachmentName));}), allow_raw_pointers())
        .function("getAttachment", optional_override([](Skeleton &obj, int slotIndex, const std::string& attachmentName) { 
            return obj.getAttachment(slotIndex, STRING_STD2SP(attachmentName));}),allow_raw_pointers())
        .function("setAttachment", optional_override([](Skeleton &obj, const std::string& slotName, const std::string& attachmentName) { 
            return obj.setAttachment(STRING_STD2SP(slotName), STRING_STD2SP(attachmentName));}))
        .function("findIkConstraint", optional_override([](Skeleton &obj, const std::string &name) { return obj.findIkConstraint(STRING_STD2SP(name)); }), allow_raw_pointers())
        .function("findTransformConstraint", optional_override([](Skeleton &obj, const std::string &name) { return obj.findTransformConstraint(STRING_STD2SP(name)); }), allow_raw_pointers())
        .function("findPathConstraint", optional_override([](Skeleton &obj, const std::string &name) { return obj.findPathConstraint(STRING_STD2SP(name)); }), allow_raw_pointers())
        //.function("getBounds", optional_override([](Skeleton &obj, &outX, ) {}), allow_raw_pointers())
        .function("update", &Skeleton::update);

    //incomplete
    // class_<SkeletonBinary>("SkeletonBinary")
    //     .constructor<Atlas*>()
    //     .constructor<AttachmentLoader*>()
    // .function("setScale", &SkeletonBinary::setScale)
    // .function("getError", &SkeletonBinary::getError);
    //.function("readSkeletonDataFile", optional_override([](SkeletonBinary &obj, const spine::String& path) { return obj.readSkeletonDataFile(path); }));

    // incomplete
    //class_<SkeletonJson>("SkeletonJson")
    //.constructor<Atlas*>()
    //.constructor<AttachmentLoader*>()
    //.function("setScale", &SkeletonJson::setScale);
    //.function("getError", &SkeletonJson::getError);

    class_<VertexEffect>("VertexEffect")
        .function("begin", &VertexEffect::begin, pure_virtual())
        .function("transform", optional_override([](VertexEffect &obj, float x, float y) {
            obj.transform(x, y); }), pure_virtual())
        .function("end", &VertexEffect::end, pure_virtual());

    class_<JitterVertexEffect, base<VertexEffect>>("JitterEffect")
        .constructor<float, float>()
        .function("getJitterX", &JitterVertexEffect::getJitterX)
        .function("setJitterX", &JitterVertexEffect::setJitterX)
        .function("getJitterY", &JitterVertexEffect::getJitterY)
        .function("setJitterY", &JitterVertexEffect::setJitterY)
        .function("begin", &JitterVertexEffect::begin)
        .function("transform", optional_override([](VertexEffect &obj, float x, float y) {
            obj.transform(x, y); }), pure_virtual())
        .function("end", &JitterVertexEffect::end);

    class_<SwirlVertexEffect, base<VertexEffect>>("SwirlEffect")
        .constructor<float, Interpolation &>()
        .function("begin", &SwirlVertexEffect::begin)
        .function("transform", optional_override([](VertexEffect &obj, float x, float y) {
            obj.transform(x, y); }), pure_virtual())
        .function("end", &SwirlVertexEffect::end)
        .function("getCenterX", &SwirlVertexEffect::getCenterX)
        .function("setCenterX", &SwirlVertexEffect::setCenterX)
        .function("getCenterY", &SwirlVertexEffect::getCenterY)
        .function("setCenterY", &SwirlVertexEffect::setCenterY)
        .function("getRadius", &SwirlVertexEffect::getRadius)
        .function("setRadius", &SwirlVertexEffect::setRadius)
        .function("getAngle", &SwirlVertexEffect::getAngle)
        .function("setAngle", &SwirlVertexEffect::setAngle)
        .function("getWorldX", &SwirlVertexEffect::getWorldX)
        .function("setWorldX", &SwirlVertexEffect::setWorldX)
        .function("getWorldY", &SwirlVertexEffect::getWorldY)
        .function("setWorldY", &SwirlVertexEffect::setWorldY);

    class_<SlotMesh>("SlotMesh")
        .property("vCount", &SlotMesh::vCount)
        .property("iCount", &SlotMesh::iCount)
        .property("blendMode", &SlotMesh::blendMode)
        .property("textureID", &SlotMesh::textureID);

    register_vector<SlotMesh>("VectorSlotMesh");
    class_<SpineModel>("SpineModel")
        .property("vCount", &SpineModel::vCount)
        .property("iCount", &SpineModel::iCount)
        .property("vPtr", &SpineModel::vPtr)
        .property("iPtr", &SpineModel::iPtr)
        .function("getData", &SpineModel::getData, allow_raw_pointer<std::vector<unsigned int>>());

    class_<SpineDebugShape>("SpineDebugShape")
        .property("type", &SpineDebugShape::type)
        .property("vOffset", &SpineDebugShape::vOffset)
        .property("vCount", &SpineDebugShape::vCount)
        .property("iOffset", &SpineDebugShape::iOffset)
        .property("iCount", &SpineDebugShape::iCount);

    register_vector<SpineDebugShape>("VectorDebugShape");
    class_<SpineSkeletonInstance>("SkeletonInstance")
        .constructor<>()
        .property("isCache", &SpineSkeletonInstance::isCache)
        .property("dtRate", &SpineSkeletonInstance::dtRate)
        .property("enable", &SpineSkeletonInstance::enable)
        .function("initSkeleton", &SpineSkeletonInstance::initSkeleton, allow_raw_pointers())
        .function("setAnimation", &SpineSkeletonInstance::setAnimation, allow_raw_pointers())
        .function("setSkin", &SpineSkeletonInstance::setSkin)
        .function("updateAnimation", &SpineSkeletonInstance::updateAnimation)
        .function("updateRenderData", &SpineSkeletonInstance::updateRenderData, allow_raw_pointer<SpineModel>())
        .function("setPremultipliedAlpha", &SpineSkeletonInstance::setPremultipliedAlpha)
        .function("setUseTint", &SpineSkeletonInstance::setUseTint)
        .function("setColor", &SpineSkeletonInstance::setColor)
        .function("setJitterEffect", &SpineSkeletonInstance::setJitterEffect, allow_raw_pointer<JitterVertexEffect *>())
        .function("setSwirlEffect", &SpineSkeletonInstance::setSwirlEffect, allow_raw_pointer<SwirlVertexEffect *>())
        .function("clearEffect", &SpineSkeletonInstance::clearEffect)
        .function("getAnimationState", &SpineSkeletonInstance::getAnimationState, allow_raw_pointer<AnimationState>())
        .function("setMix", &SpineSkeletonInstance::setMix)
        .function("setListener", &SpineSkeletonInstance::setListener)
        .function("setTrackEntryListener", &SpineSkeletonInstance::setTrackEntryListener, allow_raw_pointer<TrackEntry *>())
        .function("setDebugMode", &SpineSkeletonInstance::setDebugMode)
        .function("getDebugShapes", &SpineSkeletonInstance::getDebugShapes)
        .function("resizeSlotRegion", &SpineSkeletonInstance::resizeSlotRegion)
        .function("destroy", &SpineSkeletonInstance::destroy)
        .function("setSlotTexture", &SpineSkeletonInstance::setSlotTexture);
}

EMSCRIPTEN_BINDINGS(cocos_spine) {
    class_<SpineWasmUtil>("SpineWasmUtil")
    .class_function("spineWasmInit", &SpineWasmUtil::spineWasmInit)
    .class_function("spineWasmDestroy", &SpineWasmUtil::spineWasmDestroy)
    .class_function("queryStoreMemory", &SpineWasmUtil::queryStoreMemory)
    .class_function("querySpineSkeletonDataByUUID", &SpineWasmUtil::querySpineSkeletonDataByUUID, allow_raw_pointers())
    .class_function("createSpineSkeletonDataWithJson", &SpineWasmUtil::createSpineSkeletonDataWithJson, allow_raw_pointers())
    .class_function("createSpineSkeletonDataWithBinary", &SpineWasmUtil::createSpineSkeletonDataWithBinary, allow_raw_pointers())
    .class_function("registerSpineSkeletonDataWithUUID", &SpineWasmUtil::registerSpineSkeletonDataWithUUID, allow_raw_pointers())
    .class_function("destroySpineSkeletonDataWithUUID", &SpineWasmUtil::destroySpineSkeletonDataWithUUID)
    .class_function("destroySpineSkeleton", &SpineWasmUtil::destroySpineSkeleton, allow_raw_pointers())
    .class_function("getCurrentListenerID", &SpineWasmUtil::getCurrentListenerID)
    .class_function("getCurrentEventType", &SpineWasmUtil::getCurrentEventType)
    .class_function("getCurrentTrackEntry", &SpineWasmUtil::getCurrentTrackEntry, allow_raw_pointers())
    .class_function("getCurrentEvent", &SpineWasmUtil::getCurrentEvent, allow_raw_pointers());
}
