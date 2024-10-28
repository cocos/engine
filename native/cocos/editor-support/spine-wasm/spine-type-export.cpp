#include <emscripten/bind.h>
#include <emscripten/wire.h>
#include <type_traits>
#include <vector>
#include "spine-skeleton-instance.h"
#include "spine-wasm.h"
#include "Vector2.h"


using namespace spine;

#define DEFINE_ALLOW_RAW_POINTER(type) \
namespace emscripten { namespace internal { \
    template<> \
    struct TypeID<type*> { \
        static constexpr TYPEID get() { \
            return TypeID<type>::get(); \
        } \
    }; \
    template<> \
    struct TypeID<const type*> { \
        static constexpr TYPEID get() { \
            return TypeID<type>::get(); \
        } \
    }; \
}}


#define DEFINE_SPINE_CLASS_TYPEID(cls) \
namespace emscripten { namespace internal { \
    template<> \
    constexpr TYPEID getLightTypeID<cls>(const cls& value) { \
        return value.getRTTI().getClassName(); \
    } \
    template<> \
    struct LightTypeID<cls* const> { \
        static constexpr TYPEID get() { \
            return #cls "*"; \
        } \
    }; \
    template<> \
    struct LightTypeID<cls*> { \
        static constexpr TYPEID get() { \
            return #cls "*"; \
        } \
    }; \
    template<> \
    struct LightTypeID<cls* const &> { \
        static constexpr TYPEID get() { \
            return #cls "*"; \
        } \
    }; \
    template<> \
    struct LightTypeID<cls*&> { \
        static constexpr TYPEID get() { \
            return #cls "*"; \
        } \
    }; \
    template<> \
    struct LightTypeID<const cls*> { \
        static constexpr TYPEID get() { \
            return "const " #cls "*"; \
        } \
    }; \
    template<> \
    struct LightTypeID<const cls* const> { \
        static constexpr TYPEID get() { \
            return "const " #cls "*"; \
        } \
    }; \
    template<> \
    struct LightTypeID<const cls* &> { \
        static constexpr TYPEID get() { \
            return "const " #cls "*"; \
        } \
    }; \
    template<> \
    struct LightTypeID<const cls* const &> { \
        static constexpr TYPEID get() { \
            return "const " #cls "*"; \
        } \
    }; \
    template<> \
    struct LightTypeID<cls> { \
        static constexpr TYPEID get() { \
            return #cls; \
        } \
    }; \
    template<> \
    struct LightTypeID<cls&> { \
        static constexpr TYPEID get() { \
            return #cls; \
        } \
    }; \
    template<> \
    struct LightTypeID<const cls> { \
        static constexpr TYPEID get() { \
            return #cls; \
        } \
    }; \
    template<> \
    struct LightTypeID<const cls&> { \
        static constexpr TYPEID get() { \
            return #cls; \
        } \
    }; \
}}

#define GETTER_RVAL_TO_PTR(ClassType, Method, ReturnType) \
    optional_override([](ClassType &obj) { return const_cast<ReturnType>(&obj.Method()); })


DEFINE_SPINE_CLASS_TYPEID(ConstraintData)
DEFINE_SPINE_CLASS_TYPEID(IkConstraintData)
DEFINE_SPINE_CLASS_TYPEID(PathConstraintData)
DEFINE_SPINE_CLASS_TYPEID(Attachment)
DEFINE_SPINE_CLASS_TYPEID(VertexAttachment)
DEFINE_SPINE_CLASS_TYPEID(BoundingBoxAttachment)
DEFINE_SPINE_CLASS_TYPEID(ClippingAttachment)
DEFINE_SPINE_CLASS_TYPEID(MeshAttachment)
DEFINE_SPINE_CLASS_TYPEID(PathAttachment)
DEFINE_SPINE_CLASS_TYPEID(PointAttachment)
DEFINE_SPINE_CLASS_TYPEID(RegionAttachment)
DEFINE_SPINE_CLASS_TYPEID(AttachmentLoader)
DEFINE_SPINE_CLASS_TYPEID(AtlasAttachmentLoader)
DEFINE_SPINE_CLASS_TYPEID(Interpolation)
DEFINE_SPINE_CLASS_TYPEID(PowInterpolation)
DEFINE_SPINE_CLASS_TYPEID(PowOutInterpolation)
DEFINE_SPINE_CLASS_TYPEID(Updatable)
DEFINE_SPINE_CLASS_TYPEID(IkConstraint)
DEFINE_SPINE_CLASS_TYPEID(PathConstraint)
DEFINE_SPINE_CLASS_TYPEID(TransformConstraintData)
DEFINE_SPINE_CLASS_TYPEID(TransformConstraint)
DEFINE_SPINE_CLASS_TYPEID(Bone)
DEFINE_SPINE_CLASS_TYPEID(Timeline)
DEFINE_SPINE_CLASS_TYPEID(CurveTimeline)
DEFINE_SPINE_CLASS_TYPEID(TranslateTimeline)
DEFINE_SPINE_CLASS_TYPEID(ScaleTimeline)
DEFINE_SPINE_CLASS_TYPEID(ShearTimeline)
DEFINE_SPINE_CLASS_TYPEID(RotateTimeline)
DEFINE_SPINE_CLASS_TYPEID(ColorTimeline)
DEFINE_SPINE_CLASS_TYPEID(TwoColorTimeline)
DEFINE_SPINE_CLASS_TYPEID(AttachmentTimeline)
DEFINE_SPINE_CLASS_TYPEID(DeformTimeline)
DEFINE_SPINE_CLASS_TYPEID(EventTimeline)
DEFINE_SPINE_CLASS_TYPEID(DrawOrderTimeline)
DEFINE_SPINE_CLASS_TYPEID(IkConstraintTimeline)
DEFINE_SPINE_CLASS_TYPEID(TransformConstraintTimeline)
DEFINE_SPINE_CLASS_TYPEID(PathConstraintPositionTimeline)
DEFINE_SPINE_CLASS_TYPEID(PathConstraintMixTimeline)
DEFINE_SPINE_CLASS_TYPEID(VertexEffect)
DEFINE_SPINE_CLASS_TYPEID(JitterVertexEffect)
DEFINE_SPINE_CLASS_TYPEID(SwirlVertexEffect)


DEFINE_ALLOW_RAW_POINTER(BoneData)
DEFINE_ALLOW_RAW_POINTER(Bone)
DEFINE_ALLOW_RAW_POINTER(SlotData)
DEFINE_ALLOW_RAW_POINTER(VertexAttachment)
DEFINE_ALLOW_RAW_POINTER(Color)
DEFINE_ALLOW_RAW_POINTER(EventData)
DEFINE_ALLOW_RAW_POINTER(Skeleton)
DEFINE_ALLOW_RAW_POINTER(Skin)

namespace {
// std::string STRING_SP2STD(const spine::String &str) {
//     std::string stdStr(str.buffer(), str.length());
//     return stdStr;
// }

// const String STRING_STD2SP(const std::string &str) {
//     const String spString(str.c_str());
//     return spString;
// }

// const std::vector<std::string> VECTOR_SP2STD_STRING(Vector<String> &container) {
//     int count = container.size();
//     std::vector<std::string> stdVector(count);
//     for (int i = 0; i < count; i++) {
//         stdVector[i] = STRING_SP2STD(container[i]);
//     }
//     return stdVector;
// }

// template <typename T>
// Vector<T> VECTOR_STD2SP(std::vector<T> &container) {
//     int count = container.size();
//     Vector<T> vecSP;
//     vecSP.setSize(count, 0);
//     for (int i = 0; i < count; i++) {
//         vecSP[i] = container[i];
//     }
//     return vecSP;
// }

// template <typename T>
// Vector<T *> VECTOR_STD2SP_POINTER(std::vector<T *> &container) {
//     int count = container.size();
//     Vector<T *> vecSP = Vector<T *>();
//     vecSP.setSize(count, nullptr);
//     for (int i = 0; i < count; i++) {
//         vecSP[i] = container[i];
//     }
//     return vecSP;
// }

// template <typename T>
// void VECTOR_STD_COPY_SP(std::vector<T> &stdVector, Vector<T> &spVector) {
//     int count = stdVector.size();
//     for (int i = 0; i < count; i++) {
//         stdVector[i] = spVector[i];
//     }
// }

// String* constructorSpineString(emscripten::val name, bool own) {
//     return new String(name.as<std::string>().c_str(), own);
// }

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
using SPVectorSPString = Vector<String>;
using SPVectorConstraintDataPtr = Vector<ConstraintData*>;
using SPVectorSlotPtr = Vector<Slot*>;
using SPVectorSkinPtr = Vector<Skin*>;
using SPVectorEventDataPtr = Vector<EventData*>;
using SPVectorEventPtr = Vector<spine::Event*>;
using SPVectorAnimationPtr = Vector<Animation*>;
using SPVectorIkConstraintPtr = Vector<IkConstraint*>;
using SPVectorIkConstraintDataPtr = Vector<IkConstraintData*>;
using SPVectorTransformConstraintPtr = Vector<TransformConstraint*>;
using SPVectorPathConstraintPtr = Vector<PathConstraint*>;
using SPVectorTimelinePtr = Vector<Timeline*>;
using SPVectorTrackEntryPtr = Vector<TrackEntry*>;
using SPVectorUpdatablePtr = Vector<Updatable*>;
using SPVectorSkinEntry = Vector<Skin::AttachmentMap::Entry>;
using SPVectorVectorSkinEntry = Vector<SPVectorSkinEntry>;

template <typename T>
void registerSpineInteger(const char* name) {
    using namespace emscripten::internal;
    using UnderlyingType = typename std::underlying_type<T>::type;
    _embind_register_integer(TypeID<T>::get(), name, sizeof(T), std::numeric_limits<UnderlyingType>::min(),
    std::numeric_limits<UnderlyingType>::max());
}

#define REGISTER_SPINE_ENUM(name) \
    registerSpineInteger<spine::name>("spine::" #name)


template<typename T, bool>
struct SpineVectorTrait {};

template<typename T>
struct SpineVectorTrait<T, false> {
    static emscripten::class_<spine::Vector<T>> register_spine_vector(const char* name) {
        typedef spine::Vector<T> VecType;

        void (VecType::*setSize)(const size_t, const T&) = &VecType::setSize;
        size_t (VecType::*size)() const = &VecType::size;
        T& (VecType::*get)(size_t) = &VecType::operator[];
        return emscripten::class_<spine::Vector<T>>(name)
            .template constructor<>()
            .function("resize", setSize)
            .function("size", size)
            .function("get", get, emscripten::allow_raw_pointers());
    }
};

template<typename T>
struct SpineVectorTrait<T, true> {
    static emscripten::class_<spine::Vector<T>> register_spine_vector(const char* name) {
        typedef spine::Vector<T> VecType;

        void (VecType::*setSize)(const size_t, const T&) = &VecType::setSize;
        size_t (VecType::*size)() const = &VecType::size;
        T& (VecType::*get)(size_t) = &VecType::operator[];
        return emscripten::class_<spine::Vector<T>>(name)
            .template constructor<>()
            .function("resize", setSize)
            .function("size", size)
            .function("get", get)
            .function("set", emscripten::optional_override([](VecType& obj, int index, const T& value){
                obj[index] = value;
            }), emscripten::allow_raw_pointers());
    }
};

#define REGISTER_SPINE_VECTOR(name, needSetter) \
    SpineVectorTrait<name::value_type, needSetter>::register_spine_vector(#name)


} // namespace

namespace emscripten { namespace internal {

template<typename GetterReturnType, typename GetterThisType>
struct GetterPolicy<GetterReturnType (GetterThisType::*)()> {
    using ReturnType = GetterReturnType;
    using Context = GetterReturnType (GetterThisType::*)();

    using Binding = internal::BindingType<ReturnType>;
    using WireType = typename Binding::WireType;

    // template<typename ClassType, typename ReturnPolicy>
    template<typename ClassType>
    static WireType get(const Context& context, ClassType& ptr) {
        // return Binding::toWireType(((ptr.*context)()), ReturnPolicy{});
        return Binding::toWireType(((ptr.*context)()));
    }

    static void* getContext(Context context) {
        return internal::getContext(context);
    }
};

// Non-const version
template<typename GetterReturnType, typename GetterThisType>
struct GetterPolicy<GetterReturnType (*)(GetterThisType&)> {
    using ReturnType = GetterReturnType;
    using Context = GetterReturnType (*)(GetterThisType &);

    using Binding = internal::BindingType<ReturnType>;
    using WireType = typename Binding::WireType;

    template<typename ClassType>
    static WireType get(const Context& context, ClassType& ptr) {
        return Binding::toWireType(context(ptr));
    }

    static void* getContext(Context context) {
        return internal::getContext(context);
    }
};

template<>
struct BindingType<String> {
    using T = char;
    static_assert(std::is_trivially_copyable<T>::value, "basic_string elements are memcpy'd");
    using WireType = struct {
        size_t length;
        T data[1]; // trailing data
    } *;
    static WireType toWireType(const String& v) {
        auto* wt = static_cast<WireType>(malloc(sizeof(size_t) + v.length() * sizeof(T)));
        wt->length = v.length();
        memcpy(wt->data, v.buffer(), v.length() * sizeof(T));
        return wt;
    }
    static String fromWireType(WireType v) {
        return String(v->data, v->length, false);
    }
};

}  // namespace internal
}  // namespace emscripten

#define ENABLE_EMBIND_TEST 0

#if ENABLE_EMBIND_TEST

class TestBase {
    RTTI_DECL
public:
    virtual void hello(const String& msg) {
        printf("TestBase::hello: %s\n", msg.buffer());
    }
};

RTTI_IMPL_NOPARENT(TestBase)

class TestFoo: public TestBase {
    RTTI_DECL
public:
    TestFoo() {
        printf("TestFoo::TestFoo: %p\n", this);
    }

    TestFoo(const TestFoo& o) {
        printf("TestFoo copy constructor %p, %p, o.x=%d\n", this, &o, o._x);
        *this = o;
    }

    ~TestFoo() {
        printf("TestFoo::~TestFoo: %p\n", this);
    }

    TestFoo &operator=(const TestFoo& o) {
        printf("TestFoo::operator=: %p\n", this);
        if (this != &o) {
            _x = o._x;
            printf("TestFoo::operator=, _x=%d\n", _x);
        } else {
            printf("TestFoo::operator=, same address\n");
        }
        return *this;
    }

    virtual void hello(const String& msg) override {
        printf("TestFoo::hello: %s\n", msg.buffer());
    }

    void setX(int x) { 
        _x = x;
    }
    int getX() const { 
        return _x;
    }
private:
    int _x = 0;
};
RTTI_IMPL(TestFoo, TestBase)

DEFINE_SPINE_CLASS_TYPEID(TestBase)
DEFINE_SPINE_CLASS_TYPEID(TestFoo)

DEFINE_ALLOW_RAW_POINTER(TestBase)
DEFINE_ALLOW_RAW_POINTER(TestFoo)

class TestBar {
public:
    RTTI_DECL
    TestBar() {
        printf("TestBar::TestBar: %p\n", this);
    }

    TestBar(const TestBar& o) {
        printf("TestBar copy constructor %p\n", this);
        *this = o;
    }

    ~TestBar() {
        printf("TestBar::~TestBar: %p\n", this);
        delete _foo;
    }

    TestBar &operator=(const TestBar& o) {
        printf("TestBar::operator=: %p\n", this);
        if (this != &o) {
            _foo = o._foo;
        }
        return *this;
    }

    const TestFoo* getFoo() const {
        return _foo;
    }

    void setFoo(TestFoo *foo) {
        if (_foo != foo) {
            delete _foo;
            _foo = foo;
        }
    }

   const TestBase* getBase() const {
        return _foo;
    }

    const TestFoo& getFooConst() {
        return *_foo;
    }

    void setFooConst(const TestFoo& foo) {
        _foo = &foo;
    }

private:
    const TestFoo *_foo = new TestFoo();
};

RTTI_IMPL_NOPARENT(TestBar)


#endif // ENABLE_EMBIND_TEST


EMSCRIPTEN_BINDINGS(spine) {
    using namespace emscripten;
    using namespace emscripten::internal;

#if ENABLE_EMBIND_TEST
    class_<TestBase>("TestBase")
        .constructor()
        .function("hello", &TestBase::hello);

    class_<TestFoo, base<TestBase>>("TestFoo")
        .constructor()
        .property("x", &TestFoo::getX, &TestFoo::setX);

    class_<TestBar>("TestBar")
        .constructor()
        // .property("foo", &TestBar::getFoo, &TestBar::setFoo)
        // .property("base", &TestBar::getBase)
        // .function("getBase", &TestBar::getBase, allow_raw_pointers())
        .function("getFooConst", &TestBar::getFooConst, allow_raw_pointers())
        .function("setFooConst", &TestBar::setFooConst, allow_raw_pointers())
        ;
#endif // ENABLE_EMBIND_TEST

	_embind_register_std_string(TypeID<spine::String>::get(), "std::string");

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

    register_vector<unsigned short>("VectorUnsignedShort");
    register_vector<unsigned int>("VectorOfUInt");
    register_vector<std::string>("VectorString");

    REGISTER_SPINE_VECTOR(SPVectorFloat, true);
    REGISTER_SPINE_VECTOR(SPVectorVectorFloat, true);
    REGISTER_SPINE_VECTOR(SPVectorInt, true);
    REGISTER_SPINE_VECTOR(SPVectorVectorInt, true);
    REGISTER_SPINE_VECTOR(SPVectorSize_t, true);
    REGISTER_SPINE_VECTOR(SPVectorUnsignedShort, true);

    REGISTER_SPINE_VECTOR(SPVectorSPString, true);
    REGISTER_SPINE_VECTOR(SPVectorBonePtr, false);
    REGISTER_SPINE_VECTOR(SPVectorBoneDataPtr, false);
    REGISTER_SPINE_VECTOR(SPVectorSlotDataPtr, false);
    REGISTER_SPINE_VECTOR(SPVectorTransformConstraintDataPtr, false);
    REGISTER_SPINE_VECTOR(SPVectorPathConstraintDataPtr, false);
    REGISTER_SPINE_VECTOR(SPVectorConstraintDataPtr, false);
    REGISTER_SPINE_VECTOR(SPVectorSlotPtr, false);
    REGISTER_SPINE_VECTOR(SPVectorSkinPtr, false);
    REGISTER_SPINE_VECTOR(SPVectorEventDataPtr, false);
    REGISTER_SPINE_VECTOR(SPVectorEventPtr, false);
    REGISTER_SPINE_VECTOR(SPVectorAnimationPtr, false);
    REGISTER_SPINE_VECTOR(SPVectorIkConstraintPtr, false);
    REGISTER_SPINE_VECTOR(SPVectorIkConstraintDataPtr, false);
    REGISTER_SPINE_VECTOR(SPVectorTransformConstraintPtr, false);
    REGISTER_SPINE_VECTOR(SPVectorPathConstraintPtr, false);
    REGISTER_SPINE_VECTOR(SPVectorTimelinePtr, true); // .set used in Animation constructor 
    REGISTER_SPINE_VECTOR(SPVectorTrackEntryPtr, false);
    REGISTER_SPINE_VECTOR(SPVectorUpdatablePtr, false);
    REGISTER_SPINE_VECTOR(SPVectorSkinEntry, false);
    REGISTER_SPINE_VECTOR(SPVectorVectorSkinEntry, false);

    class_<Vector2>("Vector2")
        .constructor<>()
        .constructor<float, float>()
        .property("x", &Vector2::x)
        .property("y", &Vector2::y)
        .function("set", &Vector2::set)
        .function("length", &Vector2::length)
        .function("normalize", &Vector2::normalize);

    // class_<String>("String")
    //     .constructor<>()
    //     .constructor(constructorSpineString)
    //     .constructor<const String &>()
    //     .function("length", &String::length)
    //     .function("isEmpty", &String::isEmpty)
    //     .function("append", select_overload<String&(const String&)>(&String::append))
    //     .function("equals", select_overload<String&(const String&)>(&String::operator=))
    //     .function("buffer", &String::buffer, allow_raw_pointer<const char*>())
    //     //.function("estr", optional_override([](String &obj) {
    //     //    auto str = emscripten::val(obj.buffer());
    //     //    return str; }), allow_raw_pointers())
    //     .function("strPtr", optional_override([](String &obj) {
    //         return reinterpret_cast<uintptr_t>(obj.buffer());}), allow_raw_pointers())
    //     .function("str", optional_override([](String &obj) {
    //         std::string stdStr(obj.buffer(), obj.length());
    //         return stdStr; }), allow_raw_pointers());

    class_<Color>("Color")
        .constructor<>()
        .constructor<float, float, float, float>()
        .function("set", select_overload<Color& (float, float, float, float)>(&Color::set))
        .function("add", select_overload<Color& (float, float, float, float)>(&Color::add))
        .function("clamp", &Color::clamp)
        .property("r", &Color::r)
        .property("g", &Color::g)
        .property("b", &Color::b)
        .property("a", &Color::a);

    class_<Interpolation>("Interpolation")
        .function("apply", &Interpolation::apply, pure_virtual());

    class_<HasRendererObject>("HasRendererObject")
        .constructor<>();

    // class_<Triangulator>("Triangulator")
    //     .constructor<>()
    //     .function("triangulate", &Triangulator::triangulate)
    //     .function("decompose", &Triangulator::decompose, allow_raw_pointers());

    class_<ConstraintData>("ConstraintData")
        .constructor<const String &>()
        .property("name", &ConstraintData::getName)
        .property("order", &ConstraintData::getOrder, &ConstraintData::setOrder)
        .property("skinRequired", &ConstraintData::isSkinRequired, &ConstraintData::setSkinRequired);

    class_<IkConstraintData, base<ConstraintData>>("IkConstraintData")
        .constructor<const String &>()
        .function("getBones", optional_override([](IkConstraintData &obj) {
            return &obj.getBones(); }), allow_raw_pointer<SPVectorBoneDataPtr>()) 
        .property("target", &IkConstraintData::getTarget, &IkConstraintData::setTarget)
        .property("bendDirection", &IkConstraintData::getBendDirection, &IkConstraintData::setBendDirection)
        .property("compress", &IkConstraintData::getCompress, &IkConstraintData::setCompress)
        .property("stretch", &IkConstraintData::getStretch, &IkConstraintData::setStretch)
        .property("uniform", &IkConstraintData::getUniform, &IkConstraintData::setUniform)
        .property("mix", &IkConstraintData::getMix, &IkConstraintData::setMix)
        .property("softness", &IkConstraintData::getSoftness, &IkConstraintData::setSoftness);

    class_<PathConstraintData, base<ConstraintData>>("PathConstraintData")
        .constructor<const String &>()
        .function("getBones",optional_override([](PathConstraintData &obj) {
            return &obj.getBones(); }), allow_raw_pointer<SPVectorBoneDataPtr>())
        .property("target", &PathConstraintData::getTarget, &PathConstraintData::setTarget)
        .property("positionMode", &PathConstraintData::getPositionMode, &PathConstraintData::setPositionMode)
        .property("spacingMode", &PathConstraintData::getSpacingMode, &PathConstraintData::setSpacingMode)
        .property("rotateMode", &PathConstraintData::getRotateMode, &PathConstraintData::setRotateMode)
        .property("offsetRotation", &PathConstraintData::getOffsetRotation, &PathConstraintData::setOffsetRotation)
        .property("position", &PathConstraintData::getPosition, &PathConstraintData::setPosition)
        .property("spacing", &PathConstraintData::getSpacing, &PathConstraintData::setSpacing)
        .property("rotateMix", &PathConstraintData::getRotateMix, &PathConstraintData::setRotateMix)
        .property("translateMix", &PathConstraintData::getTranslateMix, &PathConstraintData::setTranslateMix);

    class_<SkeletonBounds>("SkeletonBounds")
        .constructor<>()
        .function("update", &SkeletonBounds::update)
        .function("aabbContainsPoint", &SkeletonBounds::aabbcontainsPoint)
        .function("aabbIntersectsSegment", &SkeletonBounds::aabbintersectsSegment)
        .function("aabbIntersectsSkeleton", &SkeletonBounds::aabbIntersectsSkeleton)
        .function("containsPoint", optional_override([](SkeletonBounds &obj, float x, float y) {
            return obj.containsPoint(x, y); }),allow_raw_pointers())
        // .function("containsPointPolygon", optional_override([](SkeletonBounds &obj,Polygon* polygon, float x, float y) {
            // return obj.containsPoint(polygon, x, y); }),allow_raw_pointers())
        .function("intersectsSegment", optional_override([](SkeletonBounds &obj, float x1, float y1, float x2, float y2){
            return obj.intersectsSegment(x1, y1, x2, y2); }),allow_raw_pointers())
        // .function("intersectsSegmentPolygon", optional_override([](SkeletonBounds &obj,Polygon* polygon,
        // float x1, float y1, float x2, float y2){
            // return obj.intersectsSegment(polygon, x1, y1, x2, y2); }),allow_raw_pointers())
        // .function("getPolygon", &SkeletonBounds::getPolygon, allow_raw_pointers())
        .function("getWidth", &SkeletonBounds::getWidth)
        .function("getHeight", &SkeletonBounds::getHeight);

    class_<Event>("Event")
        .constructor<float, const EventData &>()
        .property("data", GETTER_RVAL_TO_PTR(Event, getData, EventData*))
        .property("intValue", &Event::getIntValue, &Event::setIntValue)
        .property("floatValue", &Event::getFloatValue, &Event::setFloatValue)
        .property("stringValue", &Event::getStringValue, &Event::setStringValue)
        .property("time", &Event::getTime)
        .property("volume", &Event::getVolume, &Event::setVolume)
        .property("balance", &Event::getBalance, &Event::setBalance);

    class_<EventData>("EventData")
        .constructor<const String &>()
        .property("name", &EventData::getName)
        .property("intValue", &EventData::getIntValue, &EventData::setIntValue)
        .property("floatValue", &EventData::getFloatValue, &EventData::setFloatValue)
        .property("stringValue", &EventData::getStringValue, &EventData::setStringValue)
        .property("audioPath", &EventData::getAudioPath, &EventData::setAudioPath)
        .property("volume", &EventData::getVolume, &EventData::setVolume)
        .property("balance", &EventData::getBalance, &EventData::setBalance);

    class_<Attachment>("Attachment")
        .property("name", &Attachment::getName);

    // pure_virtual and raw pointer
    class_<VertexAttachment, base<Attachment>>("VertexAttachment")
        .property("id", &VertexAttachment::getId)
        .function("getBones", optional_override([](VertexAttachment &obj){
            return &obj.getBones(); }), allow_raw_pointer<SPVectorSize_t>())
        .function("getVertices", optional_override([](VertexAttachment &obj){
            return &obj.getVertices(); }), allow_raw_pointer<SPVectorFloat>())
        .property("worldVerticesLength", &VertexAttachment::getWorldVerticesLength, &VertexAttachment::setWorldVerticesLength)
        .property("deformAttachment", &VertexAttachment::getDeformAttachment, &VertexAttachment::setDeformAttachment)
        .function("computeWorldVertices", select_overload<void(Slot&, size_t, size_t, Vector<float>&, size_t, size_t)>
        (&VertexAttachment::computeWorldVertices), allow_raw_pointer<SPVectorFloat>())
        .function("copyTo", &VertexAttachment::copyTo, allow_raw_pointers());

    class_<BoundingBoxAttachment, base<VertexAttachment>>("BoundingBoxAttachment")
        .constructor<const String &>()
        .property("name", &BoundingBoxAttachment::getName)
        .function("copy", &BoundingBoxAttachment::copy, allow_raw_pointers());

    class_<ClippingAttachment, base<VertexAttachment>>("ClippingAttachment")
        .constructor<const String &>()
        .property("endSlot", &ClippingAttachment::getEndSlot, &ClippingAttachment::setEndSlot)
        .function("copy", &ClippingAttachment::copy, allow_raw_pointers());

    class_<MeshAttachment, base<VertexAttachment>>("MeshAttachment")
        .constructor<const String &>()
        .property("path", &MeshAttachment::getPath, &MeshAttachment::setPath)
        .function("getRegionUVs", optional_override([](MeshAttachment &obj) {
            return &obj.getRegionUVs(); }), allow_raw_pointer<SPVectorFloat>())
        .function("getUVs", optional_override([](MeshAttachment &obj) { 
            return &obj.getUVs(); }), allow_raw_pointer<SPVectorFloat>())
        .function("getTriangles", optional_override([](MeshAttachment &obj) {
            return &obj.getTriangles(); }), allow_raw_pointer<SPVectorUnsignedShort>())
        .property("color", GETTER_RVAL_TO_PTR(MeshAttachment, getColor, Color*))
        .property("width", &MeshAttachment::getWidth, &MeshAttachment::setWidth)
        .property("height", &MeshAttachment::getHeight, &MeshAttachment::setHeight)
        .property("hullLength", &MeshAttachment::getHullLength, &MeshAttachment::setHullLength)
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
        .property("closed", &PathAttachment::isClosed, &PathAttachment::setClosed)
        .property("constantSpeed", &PathAttachment::isConstantSpeed, &PathAttachment::setConstantSpeed)
        .function("copy", &PathAttachment::copy, allow_raw_pointers());

    class_<PointAttachment, base<Attachment>>("PointAttachment")
        .constructor<const String &>()
        .property("x", &PointAttachment::getX, &PointAttachment::setX)
        .property("y", &PointAttachment::getY, &PointAttachment::setY)
        .property("rotation", &PointAttachment::getRotation, &PointAttachment::setRotation)
        .function("computeWorldPosition", optional_override([](PointAttachment &obj, Bone &bone, float ox, float oy) {
            obj.computeWorldPosition(bone, ox, oy);}))
        .function("computeWorldRotation", &PointAttachment::computeWorldRotation)
        .function("copy", &PointAttachment::copy, allow_raw_pointers());

    class_<RegionAttachment, base<Attachment>>("RegionAttachment")
        .constructor<const String &>()
        .property("x", &RegionAttachment::getX, &RegionAttachment::setX)
        .property("y", &RegionAttachment::getY, &RegionAttachment::setY)
        .property("scaleX", &RegionAttachment::getScaleX, &RegionAttachment::setScaleX)
        .property("scaleY", &RegionAttachment::getScaleY, &RegionAttachment::setScaleY)
        .property("rotation", &RegionAttachment::getRotation, &RegionAttachment::setRotation)
        .property("width", &RegionAttachment::getWidth, &RegionAttachment::setWidth)
        .property("height", &RegionAttachment::getHeight, &RegionAttachment::setHeight)
        .property("color", GETTER_RVAL_TO_PTR(RegionAttachment, getColor, Color*))
        .property("path", &RegionAttachment::getPath, &RegionAttachment::setPath)
        //cjh .function("getRendererObject", &RegionAttachment::getRendererObject, allow_raw_pointers())
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
        .function("getName", optional_override([] (AtlasPage &obj) { return obj.name; }))
        .property("minFilter", &AtlasPage::minFilter)
        .property("magFilter", &AtlasPage::magFilter)
        .property("uWrap", &AtlasPage::uWrap)
        .property("vWrap", &AtlasPage::vWrap)
        //.property("texture", &AtlasPage::texture) // no texture, use renderer object
        .property("width", &AtlasPage::width)
        .property("height", &AtlasPage::height);

    class_<AtlasRegion>("TextureAtlasRegion")
        //.property("page", &AtlasRegion::page)
        .function("getName", optional_override([] (AtlasRegion &obj) { return obj.name; }))
        .property("x", &AtlasRegion::x)
        .property("y", &AtlasRegion::y)
        .property("index", &AtlasRegion::index)
        .property("rotate", &AtlasRegion::rotate)
        .property("degrees", &AtlasRegion::degrees);
        //.property("texture", &AtlasRegion::height)

    class_<TextureLoader>("TextureLoader");
        

    class_<Atlas>("TextureAtlas")
        .constructor<const String &, TextureLoader *, bool>()
        .function("findRegion", &Atlas::findRegion, allow_raw_pointers());

    class_<PowInterpolation, base<Interpolation>>("Pow")
        .constructor<int>()
        .function("apply", &PowInterpolation::apply);


    class_<PowOutInterpolation, base<Interpolation>>("PowOut")
        .constructor<int>()
        .function("apply", &PowOutInterpolation::apply);

    class_<SlotData>("SlotData")
        .constructor<int, const String &, BoneData &>()
        .function("getIndex", &SlotData::getIndex)
        .function("getName", &SlotData::getName)
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
        .function("update", &TransformConstraint::update);

    class_<Bone, base<Updatable>>("Bone")
        .constructor<BoneData &, Skeleton &, Bone *>()
        .property("data", GETTER_RVAL_TO_PTR(Bone, getData, BoneData*))
        .property("skeleton", &Bone::getSkeleton)
        .property("parent", &Bone::getParent)
        .function("getChildren", optional_override([](Bone &obj) {
            return &obj.getChildren(); }), allow_raw_pointer<SPVectorBonePtr>())
        .property("x", &Bone::getX, &Bone::setX)
        .property("y", &Bone::getY, &Bone::setY)
        .property("rotation", &Bone::getRotation, &Bone::setRotation)
        .property("scaleX", &Bone::getScaleX, &Bone::setScaleX)
        .property("scaleY", &Bone::getScaleY, &Bone::setScaleY)
        .property("shearX", &Bone::getShearX, &Bone::setShearX)
        .property("shearY", &Bone::getShearY, &Bone::setShearY)
        .property("ax", &Bone::getAX, &Bone::setAX)
        .property("ay", &Bone::getAY, &Bone::setAY)
        .property("arotation", &Bone::getAppliedRotation, &Bone::setAppliedRotation)
        .property("ascaleX", &Bone::getAScaleX, &Bone::setAScaleX)
        .property("ascaleY", &Bone::getAScaleY, &Bone::setAScaleY)
        .property("ashearX", &Bone::getAShearX, &Bone::setAShearX)
        .property("ashearY", &Bone::getAShearY, &Bone::setAShearY)
        .property("appliedValid", &Bone::isAppliedValid, &Bone::setAppliedValid)
        .property("a", &Bone::getA, &Bone::setA)
        .property("b", &Bone::getB, &Bone::setB)
        .property("c", &Bone::getC, &Bone::setC)
        .property("d", &Bone::getD, &Bone::setD)
        .property("worldX", &Bone::getWorldX, &Bone::setWorldX)
        .property("worldY", &Bone::getWorldY, &Bone::setWorldY)
        .property("active", &Bone::isActive, &Bone::setActive)
        
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
        .property("index", &BoneData::getIndex)
        .property("name",  &BoneData::getName) //FIXME(cjh): Don't copy string
        .property("parent", &BoneData::getParent)
        .property("length", &BoneData::getLength, &BoneData::setLength)
        .property("x", &BoneData::getX, &BoneData::setX)
        .property("y", &BoneData::getY, &BoneData::setY)
        .property("rotation", &BoneData::getRotation, &BoneData::setRotation)
        .property("scaleX", &BoneData::getScaleX, &BoneData::setScaleX)
        .property("scaleY", &BoneData::getScaleY, &BoneData::setScaleY)
        .property("shearX", &BoneData::getShearX, &BoneData::setShearX)
        .property("shearY", &BoneData::getShearY, &BoneData::setShearY)
        .property("transformMode", &BoneData::getTransformMode, &BoneData::setTransformMode)
        .property("skinRequired", &BoneData::isSkinRequired, &BoneData::setSkinRequired);


    class_<Slot>("Slot")
        .constructor<SlotData &, Bone &>()
        .property("data", GETTER_RVAL_TO_PTR(Slot, getData, SlotData*))
        .property("bone", GETTER_RVAL_TO_PTR(Slot, getBone, Bone*))
        .property("color", GETTER_RVAL_TO_PTR(Slot, getColor, Color*))
        .property("darkColor", GETTER_RVAL_TO_PTR(Slot, getDarkColor, Color*))
        .function("getDeform", &Slot::getDeform, allow_raw_pointers())
        .property("skeleton", GETTER_RVAL_TO_PTR(Slot, getSkeleton, Skeleton*))
        .function("getAttachment", &Slot::getAttachment, allow_raw_pointers())
        .function("setAttachment", &Slot::setAttachment, allow_raw_pointers())
        .function("setAttachmentTime", &Slot::setAttachmentTime)
        .function("getAttachmentTime", &Slot::getAttachmentTime)
        .function("setToSetupPose", &Slot::setToSetupPose);

    class_<Skin>("Skin")
        .constructor<const String &>()
        .function("getName", &Skin::getName)
        .function("getBones", optional_override([](Skin &obj) {
            return &obj.getBones(); }), allow_raw_pointer<SPVectorBoneDataPtr>())
        .function("getConstraints", optional_override([](Skin &obj) {
            return &obj.getConstraints(); }), allow_raw_pointer<SPVectorConstraintDataPtr>())
        .function("setAttachment", &Skin::setAttachment, allow_raw_pointers())
        .function("addSkin", select_overload<void(Skin *)>(&Skin::addSkin), allow_raw_pointers())
        .function("copySkin", select_overload<void(Skin *)>(&Skin::copySkin), allow_raw_pointers())
        .function("findNamesForSlot", optional_override([](Skin &obj, size_t slotIndex) {
            std::vector<std::string> vetNames;
            std::vector<Skin::AttachmentMap::Entry *> entriesVector;
            auto entries = obj.getAttachments();
            while (entries.hasNext()) {
                Skin::AttachmentMap::Entry &entry = entries.next();
                if (entry._slotIndex == slotIndex) vetNames.push_back(entry._name.buffer());
            }
            return vetNames; 
        }), allow_raw_pointers())
        .function("getAttachment", &Skin::getAttachment, allow_raw_pointers())
        .function("getAttachments", optional_override([](Skin &obj) {
            std::vector<Skin::AttachmentMap::Entry *> entriesVector;
            auto entries = obj.getAttachments();
            while (entries.hasNext()) {
                entriesVector.push_back(&entries.next());
            }
            return entriesVector;
        }),allow_raw_pointers())
        .function("removeAttachment", &Skin::removeAttachment)
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
        .function("getName", optional_override([](Skin::AttachmentMap::Entry& obj) { return obj._name; }))
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
        .property("name", &SkeletonData::getName, &SkeletonData::setName)
        .function("getBones", optional_override([](SkeletonData &obj) {
            return &obj.getBones(); }), allow_raw_pointer<SPVectorBoneDataPtr>())
        .function("getSlots", optional_override([](SkeletonData &obj) {
            return &obj.getSlots(); }), allow_raw_pointer<SPVectorSlotDataPtr>())
        .function("getSkins", optional_override([](SkeletonData &obj) {
            return &obj.getSkins(); }), allow_raw_pointer<SPVectorSkinPtr>())
        .property("defaultSkin", &SkeletonData::getDefaultSkin, &SkeletonData::setDefaultSkin)
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
        .property("x", &SkeletonData::getX, &SkeletonData::setX)
        .property("y", &SkeletonData::getY, &SkeletonData::setY)
        .property("width", &SkeletonData::getWidth, &SkeletonData::setWidth)
        .property("height", &SkeletonData::getHeight, &SkeletonData::setHeight)
        .property("version", &SkeletonData::getVersion, &SkeletonData::setVersion)
        .property("hash", &SkeletonData::getHash, &SkeletonData::setHash)
        .property("fps", &SkeletonData::getFps, &SkeletonData::setFps)
        .property("imagesPath", &SkeletonData::getImagesPath, &SkeletonData::setImagesPath)
        .property("audioPath", &SkeletonData::getAudioPath, &SkeletonData::setAudioPath)

        .function("findBone", &SkeletonData::findBone, allow_raw_pointers())
        .function("findBoneIndex", &SkeletonData::findBoneIndex)
        .function("findSlot", &SkeletonData::findSlot, allow_raw_pointers())
        .function("findSlotIndex", &SkeletonData::findSlotIndex)
        .function("findSkin", &SkeletonData::findSkin, allow_raw_pointers())
        .function("findEvent", &SkeletonData::findEvent, allow_raw_pointers())
        .function("findAnimation", &SkeletonData::findAnimation, allow_raw_pointers())
        .function("findIkConstraint", &SkeletonData::findIkConstraint, allow_raw_pointers())
        .function("findTransformConstraint", &SkeletonData::findTransformConstraint, allow_raw_pointers())
        .function("findPathConstraint", &SkeletonData::findPathConstraint, allow_raw_pointers())
        .function("findPathConstraintIndex", &SkeletonData::findPathConstraintIndex);

    class_<Animation>("Animation")
        .constructor<const String &, Vector<Timeline *> &, float>()
        .function("getName", &Animation::getName)
        .function("getTimelines", optional_override([](Animation &obj) {
            return &obj.getTimelines(); }), allow_raw_pointer<SPVectorTimelinePtr>())
        .function("hasTimeline", &Animation::hasTimeline)
        .function("getDuration", &Animation::getDuration)
        .function("setDuration", &Animation::setDuration);

    class_<Timeline>("Timeline")
        .function("getPropertyId", &Timeline::getPropertyId, pure_virtual());

    class_<CurveTimeline, base<Timeline>>("CurveTimeline")
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
        .function("setFrame", &TranslateTimeline::setFrame);

    class_<ScaleTimeline, base<TranslateTimeline>>("ScaleTimeline")
        .constructor<int>()
        .function("getPropertyId", &ScaleTimeline::getPropertyId);

    class_<ShearTimeline, base<TranslateTimeline>>("ShearTimeline")
        .constructor<int>()
        .function("getPropertyId", &ShearTimeline::getPropertyId);

    class_<RotateTimeline, base<CurveTimeline>>("RotateTimeline")
        .constructor<int>()
        //.class_property("ENTRIES", &RotateTimeline::ENTRIES) not bind
        .function("getBoneIndex", &RotateTimeline::getBoneIndex)
        .function("setBoneIndex", &RotateTimeline::setBoneIndex)
        .function("getFrames", optional_override([](RotateTimeline &obj) {
            return &obj.getFrames(); }), allow_raw_pointer<SPVectorFloat>())
        .function("getPropertyId", &RotateTimeline::getPropertyId)
        .function("setFrame", &RotateTimeline::setFrame);

    class_<ColorTimeline, base<CurveTimeline>>("ColorTimeline")
        .constructor<int>()
        .class_property("ENTRIES", &ColorTimeline::ENTRIES) 
        .function("getSlotIndex", &ColorTimeline::getSlotIndex)
        .function("setSlotIndex", &ColorTimeline::setSlotIndex)
        .function("getFrames", optional_override([](ColorTimeline &obj) {
            return &obj.getFrames(); }), allow_raw_pointer<SPVectorFloat>())
        .function("getPropertyId", &ColorTimeline::getPropertyId)
        .function("setFrame", &ColorTimeline::setFrame);

    class_<TwoColorTimeline, base<CurveTimeline>>("TwoColorTimeline")
        .constructor<int>()
        .class_property("ENTRIES", &ColorTimeline::ENTRIES)
        .function("getSlotIndex", &TwoColorTimeline::getSlotIndex)
        .function("setSlotIndex", &TwoColorTimeline::setSlotIndex)
        .function("getPropertyId", &TwoColorTimeline::getPropertyId)
        .function("setFrame", &TwoColorTimeline::setFrame);

    class_<AttachmentTimeline, base<Timeline>>("AttachmentTimeline")
        .constructor<int>()
        .function("getSlotIndex", &AttachmentTimeline::getSlotIndex)
        .function("setSlotIndex", &AttachmentTimeline::setSlotIndex)
        .function("getFrames", optional_override([](AttachmentTimeline &obj) {
             return &obj.getFrames(); }), allow_raw_pointer<SPVectorFloat>())
        .function("getAttachmentNames", &AttachmentTimeline::getAttachmentNames)
        .function("getPropertyId", &AttachmentTimeline::getPropertyId)
        .function("getFrameCount", &AttachmentTimeline::getFrameCount)
        .function("setFrame", &AttachmentTimeline::setFrame, allow_raw_pointers());

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
        .function("setFrame", optional_override([](DeformTimeline &obj, int frameIndex, float time, emscripten::val jsArray){
            unsigned count = jsArray["length"].as<unsigned>();
            Vector<float> spVertices;
            spVertices.setSize(count, 0);
            for (int i = 0; i < count; i++) {
                spVertices[i] = jsArray[i].as<float>();
            }
            obj.setFrame(frameIndex, time, spVertices);
        }), allow_raw_pointers());

    class_<EventTimeline, base<Timeline>>("EventTimeline")
        .constructor<int>()
        .function("getFrames", optional_override([](EventTimeline &obj) {
            return &obj.getFrames(); }), allow_raw_pointer<SPVectorFloat>())
        .function("getEvents",  optional_override([](EventTimeline &obj) {
            return &obj.getEvents(); }), allow_raw_pointer<SPVectorEventPtr>())
        .function("getPropertyId", &EventTimeline::getPropertyId)
        .function("getFrameCount", &EventTimeline::getFrameCount)
        .function("setFrame", &EventTimeline::setFrame, allow_raw_pointers());

    class_<DrawOrderTimeline, base<Timeline>>("DrawOrderTimeline")
        .constructor<int>()
        .function("getFrames", optional_override([](DrawOrderTimeline &obj) {
            return &obj.getFrames(); }), allow_raw_pointer<SPVectorFloat>())
        .function("getPropertyId", &DrawOrderTimeline::getPropertyId)
        .function("getFrameCount", &DrawOrderTimeline::getFrameCount)
        .function("getDrawOrders", optional_override([](DrawOrderTimeline &obj) { 
            return &obj.getDrawOrders(); }), allow_raw_pointer<SPVectorVectorInt>())
        .function("setFrame", &DrawOrderTimeline::setFrame, allow_raw_pointers());

    class_<IkConstraintTimeline, base<CurveTimeline>>("IkConstraintTimeline")
        .constructor<int>()
        .class_property("ENTRIES", &IkConstraintTimeline::ENTRIES)
        .function("getPropertyId", &IkConstraintTimeline::getPropertyId)
        .function("setFrame", &IkConstraintTimeline::setFrame);

    class_<TransformConstraintTimeline, base<CurveTimeline>>("TransformConstraintTimeline")
        .constructor<int>()
        .class_property("ENTRIES", &TransformConstraintTimeline::ENTRIES)
        .function("getPropertyId", &TransformConstraintTimeline::getPropertyId)
        .function("setFrame", &TransformConstraintTimeline::setFrame);

    class_<PathConstraintPositionTimeline, base<CurveTimeline>>("PathConstraintPositionTimeline")
        .constructor<int>()
        .class_property("ENTRIES", &TransformConstraintTimeline::ENTRIES)
        .function("getPropertyId", &PathConstraintPositionTimeline::getPropertyId)
        .function("setFrame", &PathConstraintPositionTimeline::setFrame);

    class_<PathConstraintMixTimeline, base<CurveTimeline>>("PathConstraintMixTimeline")
        .constructor<int>()
        .class_property("ENTRIES", &PathConstraintMixTimeline::ENTRIES)
        .function("getPropertyId", &PathConstraintMixTimeline::getPropertyId);

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
        .function("setMix", select_overload<void(const String&, const String&, float)>(&AnimationStateData::setMix), allow_raw_pointers())
        .function("setMixWith", select_overload<void (Animation*, Animation* , float)>(&AnimationStateData::setMix), allow_raw_pointers())
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
        .function("setAnimation", select_overload<TrackEntry* (size_t, const String&, bool)>(&AnimationState::setAnimation), allow_raw_pointers())
        .function("setAnimationWith", optional_override([](AnimationState &obj, uint32_t trackIndex, Animation *animation, bool loop) { return obj.setAnimation(trackIndex, animation, loop); }), allow_raw_pointers())
        .function("addAnimation", select_overload<TrackEntry* (size_t, const String&, bool, float)>(&AnimationState::addAnimation), allow_raw_pointers())
        .function("addAnimationWith", select_overload<TrackEntry* (size_t, const String&, bool, float)>(&AnimationState::addAnimation), allow_raw_pointers())
        .function("setEmptyAnimation", &AnimationState::setEmptyAnimation, allow_raw_pointers())
        .function("addEmptyAnimation", &AnimationState::addEmptyAnimation, allow_raw_pointers())
        .function("setEmptyAnimations", &AnimationState::setEmptyAnimations)
        .function("getCurrent", &AnimationState::getCurrent, allow_raw_pointer<TrackEntry>())
        // .function("setListener",  optional_override([](AnimationState &obj, AnimationStateListener inValue) {
        //     obj.setListener(inValue); }),allow_raw_pointers())
        // .function("setListenerObject", optional_override([](AnimationState &obj, AnimationStateListenerObject *inValue) {
        //     obj.setListener(inValue); }),allow_raw_pointers())
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
        .function("findBone", &Skeleton::findBone, allow_raw_pointers())
        .function("findBoneIndex", &Skeleton::findBoneIndex)
        .function("findSlot", &Skeleton::findSlot, allow_raw_pointers())
        .function("findSlotIndex", &Skeleton::findSlotIndex)
        .function("setSkinByName", select_overload<void(const String &)>(&Skeleton::setSkin))
        .function("setSkin", static_cast<void (Skeleton::*)(Skin *)>(&Skeleton::setSkin), allow_raw_pointer<Skin>())
        .function("getAttachmentByName", select_overload<Attachment*(const String &, const String &)>(&Skeleton::getAttachment), allow_raw_pointers())
        .function("getAttachment", select_overload<Attachment*(int, const String &)>(&Skeleton::getAttachment),allow_raw_pointers())
        .function("setAttachment", &Skeleton::setAttachment)
        .function("findIkConstraint", &Skeleton::findIkConstraint, allow_raw_pointers())
        .function("findTransformConstraint", &Skeleton::findTransformConstraint, allow_raw_pointers())
        .function("findPathConstraint", &Skeleton::findPathConstraint, allow_raw_pointers())
        //.function("getBounds", optional_override([](Skeleton &obj, &outX, ) {}), allow_raw_pointers())
        .function("update", &Skeleton::update);

    //incomplete
    // class_<SkeletonBinary>("SkeletonBinary")
    //     .constructor<Atlas*>()
    //     .constructor<AttachmentLoader*>()
    // .function("setScale", &SkeletonBinary::setScale)
    // .function("getError", &SkeletonBinary::getError);
    //.function("readSkeletonDataFile", optional_override([](SkeletonBinary &obj, const String& path) { return obj.readSkeletonDataFile(path); }));

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
    using namespace emscripten;
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
