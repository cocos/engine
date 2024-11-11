/****************************************************************************
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

#pragma once

#include "base/Ptr.h"
#include "base/Value.h"
#include "base/std/any.h"
#include "base/std/container/unordered_map.h"
#include "base/std/optional.h"
#include "base/std/variant.h"
#include "bindings/jswrapper/SeApi.h"
#include "core/TypedArray.h"
#include "core/assets/AssetsModuleHeader.h"
#include "core/assets/RenderingSubMesh.h"

#if CC_USE_PHYSICS_PHYSX
    #include "physics/spec/IShape.h"
    #include "physics/spec/IWorld.h"
#endif

namespace cc {
class Data;
class Vec4;
class Vec2;
class Vec3;
class Size;
class Mat3;
class Mat4;
class Quaternion;
class Color;
class Rect;

template <typename K, typename V>
class RefMap;

struct NativeDep;

class ArrayBuffer;

// class TypedArray;
// class IBArray;

namespace network {
struct DownloaderHints;
class DownloadTask;
} // namespace network

namespace scene {
class FogInfo;
class ShadowsInfo;
class SkyboxInfo;
} // namespace scene

namespace geometry {
class AABB;
class Capsule;
class Line;
class Ray;
class Sphere;
class Triangle;
class Plane;
class Frustum;
class Spline;
} // namespace geometry

namespace extension {
struct ManifestAsset;
}

namespace middleware {
class Texture2D;
}

namespace gfx {
struct Viewport;
struct Offset;
struct Extent;
struct TextureSubres;
struct TextureCopy;
struct BufferTextureCopy;
struct BufferInfo;
struct BufferViewInfo;
struct TextureInfo;
struct DescriptorSetInfo;
struct BindingMappingInfo;
struct ShaderStage;
struct UniformSampler;
struct UniformBlock;
struct Uniform;
struct ShaderInfo;
struct DrawInfo;
struct IndirectBuffer;
struct SamplerInfo;
struct ColorAttachment;
struct DepthStencilAttachment;
struct SubPassInfo;
struct RenderPassInfo;
struct QueueInfo;
struct PipelineLayoutInfo;
struct DescriptorSetLayoutBinding;
struct DescriptorSetLayoutInfo;
struct FramebufferInfo;
struct CommandBufferInfo;
struct InputAssemblerInfo;
} // namespace gfx
} // namespace cc

#if CC_USE_SPINE

namespace spine {
class String;
template <typename T>
class Vector;
template <typename K, typename V>
class Map;
class Vector2;
} // namespace spine

#endif

////////////////////////////////////////////////////////////////////////////
/////////////////sevalue to native/////////////////////////////
////////////////////////////////////////////////////////////////////////////

// se value -> native value
CC_DEPRECATED(3.6, "use sevalue_to_native instead")
bool seval_to_ccvalue(const se::Value &v, cc::Value *ret); // NOLINT(readability-identifier-naming)
CC_DEPRECATED(3.6, "use sevalue_to_native instead")
bool seval_to_ccvaluemap(const se::Value &v, cc::ValueMap *ret); // NOLINT(readability-identifier-naming)
CC_DEPRECATED(3.6, "use sevalue_to_native instead")
bool seval_to_ccvaluemapintkey(const se::Value &v, cc::ValueMapIntKey *ret); // NOLINT(readability-identifier-naming)
CC_DEPRECATED(3.6, "use sevalue_to_native instead")
bool seval_to_ccvaluevector(const se::Value &v, cc::ValueVector *ret); // NOLINT(readability-identifier-naming)
CC_DEPRECATED(3.6, "use sevalue_to_native instead")
bool sevals_variadic_to_ccvaluevector(const se::ValueArray &args, cc::ValueVector *ret); // NOLINT(readability-identifier-naming)

CC_DEPRECATED(3.6, "use sevalue_to_native instead")
bool seval_to_Data(const se::Value &v, cc::Data *ret); // NOLINT(readability-identifier-naming)
CC_DEPRECATED(3.6, "use sevalue_to_native instead")
bool seval_to_DownloaderHints(const se::Value &v, cc::network::DownloaderHints *ret); // NOLINT(readability-identifier-naming)

bool sevalue_to_native(const se::Value &from, cc::MacroValue *to, se::Object *ctx);                    // NOLINT(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::IPreCompileInfoValueType *to, se::Object * /*ctx*/); // NOLINT(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::IPropertyEditorValueType *to, se::Object * /*ctx*/); // NOLINT(readability-identifier-naming)

// ccstd::any
bool sevalue_to_native(const se::Value &from, ccstd::any *to, se::Object *ctx); // NOLINT(readability-identifier-naming)
////////////////// ArrayBuffer
bool sevalue_to_native(const se::Value &from, cc::ArrayBuffer *to, se::Object * /*ctx*/);  // NOLINT(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::ArrayBuffer **to, se::Object * /*ctx*/); // NOLINT(readability-identifier-naming)

bool sevalue_to_native(const se::Value &from, ccstd::vector<cc::MacroRecord> *to, se::Object * /*ctx*/); // NOLINT(readability-identifier-naming)

bool sevalue_to_native(const se::Value &from, cc::MaterialProperty *to, se::Object * /*ctx*/); // NOLINT(readability-identifier-naming)

inline bool sevalue_to_native(const se::Value &from, ccstd::string *to, se::Object * /*ctx*/) { // NOLINT(readability-identifier-naming)
    if (from.isString()) {
        *to = from.toString();
        return true;
    }
    if (from.isNumber()) {
        *to = from.toStringForce();
        return true;
    }
    if (from.isNullOrUndefined()) {
        to->clear();
        return true;
    }
    CC_ABORTF("parmater '%s' is not a string nor number", from.toStringForce().c_str());
    to->clear();
    return false;
}

inline bool seval_to_std_string(const se::Value &from, ccstd::string *ret) { // NOLINT(readability-identifier-naming)
    assert(ret);
    *ret = from.toStringForce();
    return true;
}

inline bool sevalue_to_native(const se::Value &from, std::string_view *to, se::Object * /*ctx*/) { // NOLINT(readability-identifier-naming)
    if (from.isString()) {
        *to = from.toString();
    }
    return true;
}

///// integers
inline bool sevalue_to_native(const se::Value &from, bool *to, se::Object * /*ctx*/) { // NOLINT(readability-identifier-naming)
    *to = from.isNullOrUndefined() ? false : (from.isNumber() ? from.toDouble() != 0 : from.toBoolean());
    return true;
}

inline bool sevalue_to_native(const se::Value &from, int32_t *to, se::Object * /*ctx*/) { // NOLINT(readability-identifier-naming)
    *to = from.toInt32();
    return true;
}
inline bool sevalue_to_native(const se::Value &from, uint32_t *to, se::Object * /*ctx*/) { // NOLINT(readability-identifier-naming)
    *to = from.toUint32();
    return true;
}

inline bool sevalue_to_native(const se::Value &from, int16_t *to, se::Object * /*ctx*/) { // NOLINT(readability-identifier-naming)
    *to = from.toInt16();
    return true;
}
inline bool sevalue_to_native(const se::Value &from, uint16_t *to, se::Object * /*ctx*/) { // NOLINT(readability-identifier-naming)
    *to = from.toUint16();
    return true;
}

inline bool sevalue_to_native(const se::Value &from, int8_t *to, se::Object * /*ctx*/) { // NOLINT(readability-identifier-naming)
    *to = from.toInt8();
    return true;
}
inline bool sevalue_to_native(const se::Value &from, uint8_t *to, se::Object * /*ctx*/) { // NOLINT(readability-identifier-naming)
    *to = from.toUint8();
    return true;
}

inline bool sevalue_to_native(const se::Value &from, uint64_t *to, se::Object * /*ctx*/) { // NOLINT(readability-identifier-naming)
    *to = from.toUint64();
    return true;
}

inline bool sevalue_to_native(const se::Value &from, int64_t *to, se::Object * /*ctx*/) { // NOLINT(readability-identifier-naming)
    *to = from.toInt64();
    return true;
}

#if CC_PLATFORM == CC_PLATFORM_IOS || CC_PLATFORM == CC_PLATFORM_MACOS
inline bool sevalue_to_native(const se::Value &from, unsigned long *to, se::Object * /*ctx*/) { // NOLINT(readability-identifier-naming)
    // on mac: unsiged long  === uintptr_t
    static_assert(sizeof(*to) == 8, "");
    *to = static_cast<unsigned long>(from.toUint64());
    return true;
}
inline bool sevalue_to_native(const se::Value &from, long *to, se::Object * /*ctx*/) { // NOLINT(readability-identifier-naming)
    // on mac: unsiged long  === uintptr_t
    static_assert(sizeof(*to) == 8, "");
    *to = static_cast<long>(from.toUint64());
    return true;
}
#endif

inline bool sevalue_to_native(const se::Value &from, float *to, se::Object * /*ctx*/) { // NOLINT(readability-identifier-naming)
    *to = from.toFloat();
    return true;
}
inline bool sevalue_to_native(const se::Value &from, double *to, se::Object * /*unused*/) { // NOLINT(readability-identifier-naming)
    *to = from.toDouble();
    return true;
}

// inline bool sevalue_to_native(const se::Value & /*from*/, void * /*to*/, se::Object * /*ctx*/) { // NOLINT(readability-identifier-naming)
//     CC_ABORT();                                                                               // void not supported
//     return false;
// }

bool sevalue_to_native(const se::Value &from, cc::Data *to, se::Object * /*ctx*/); // NOLINT(readability-identifier-naming)

bool sevalue_to_native(const se::Value &from, cc::Value *to, se::Object * /*unused*/); // NOLINT(readability-identifier-naming)

inline bool sevalue_to_native(const se::Value &from, se::Value *to, se::Object * /*unused*/) { // NOLINT(readability-identifier-naming)
    *to = from;
    return true;
}

inline bool sevalue_to_native(const se::Value &from, se::Object **to, se::Object * /*unused*/) { // NOLINT(readability-identifier-naming)
    *to = from.toObject();
    return true;
}

inline bool sevalue_to_native(const se::Value &from, const se::Object **to, se::Object * /*unused*/) { // NOLINT(readability-identifier-naming)
    *to = from.toObject();
    return true;
}

bool sevalue_to_native(const se::Value &from, cc::Vec4 *to, se::Object * /*unused*/); // NOLINT(readability-identifier-naming)

bool sevalue_to_native(const se::Value &from, cc::Mat3 *to, se::Object * /*unused*/); // NOLINT(readability-identifier-naming)

bool sevalue_to_native(const se::Value &from, cc::Mat4 *to, se::Object * /*unused*/); // NOLINT(readability-identifier-naming)

bool sevalue_to_native(const se::Value &from, cc::Vec3 *to, se::Object * /*unused*/); // NOLINT(readability-identifier-naming)

bool sevalue_to_native(const se::Value &from, cc::Vec2 *to, se::Object * /*unused*/); // NOLINT(readability-identifier-naming)

bool sevalue_to_native(const se::Value &from, cc::Size *to, se::Object * /*unused*/); // NOLINT(readability-identifier-naming)

bool sevalue_to_native(const se::Value &from, cc::Quaternion *to, se::Object * /*unused*/); // NOLINT(readability-identifier-naming)

bool sevalue_to_native(const se::Value &from, cc::Color *to, se::Object * /*unused*/); // NOLINT(readability-identifier-naming)

bool sevalue_to_native(const se::Value &from, cc::Rect *to, se::Object * /*unused*/);      // NOLINT(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::gfx::Rect *to, se::Object * /*unused*/); // NOLINT(readability-identifier-naming)

inline bool sevalue_to_native(const se::Value &from, ccstd::vector<se::Value> *to, se::Object * /*unused*/) { // NOLINT(readability-identifier-naming)
    if (from.isNullOrUndefined()) {
        to->clear();
        return true;
    }
    CC_ASSERT(from.isObject() && from.toObject()->isArray());
    auto *array = from.toObject();
    to->clear();
    uint32_t size;
    array->getArrayLength(&size);
    for (uint32_t i = 0; i < size; i++) {
        se::Value ele;
        array->getArrayElement(i, &ele);
        to->emplace_back(ele);
    }
    return true;
}

//////////////////  ccstd::any
inline bool sevalue_to_native(const se::Value & /*from*/, ccstd::any * /*to*/, se::Object * /*ctx*/) { // NOLINT(readability-identifier-naming)
    CC_ABORT();
    SE_LOGE("Can not convert any to specific types");
    return false;
}

bool sevalue_to_native(const se::Value &from, cc::TypedArray *to, se::Object * /*ctx*/); // NOLINT(readability-identifier-naming)

bool sevalue_to_native(const se::Value &from, cc::IBArray *to, se::Object * /*ctx*/); // NOLINT(readability-identifier-naming)

// bool sevalue_to_native(const se::Value &from, cc::gfx::Context **to, se::Object*) {// NOLINT(readability-identifier-naming)
//     CC_ASSERT(from.isObject());
//     *to = (cc::gfx::Context*)from.toObject()->getPrivateData();
//     return true;
// }

inline bool sevalue_to_native(const se::Value &from, void **to, se::Object * /*ctx*/) { // NOLINT(readability-identifier-naming)
    CC_ASSERT_NOT_NULL(to);
    if (from.isNumber() || from.isBigInt()) {
        // NOLINTNEXTLINE(performance-no-int-to-ptr)
        *to = reinterpret_cast<void *>(from.toUint64());
        return true;
    }
    if (from.isObject()) {
        *to = from.toObject()->getPrivateData();
        return true;
    }
    SE_LOGE("[warn] failed to convert to void *\n");
    return false;
}

inline bool sevalue_to_native(const se::Value &from, ccstd::string **to, se::Object * /*ctx*/) { // NOLINT(readability-identifier-naming)
    if (to != nullptr && *to != nullptr) {
        **to = from.toString();
    }
    return true;
}

bool sevalue_to_native(const se::Value &from, cc::ValueMap *to, se::Object * /*ctx*/); // NOLINT(readability-identifier-naming)

bool sevalue_to_native(const se::Value &from, ccstd::vector<bool> *to, se::Object * /*ctx*/); // NOLINT(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, ccstd::variant<ccstd::string, bool> *to, se::Object * /*ctx*/); // NOLINT(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, ccstd::vector<unsigned char> *to, se::Object * /*ctx*/);       // NOLINT(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::IPropertyValue *to, se::Object *ctx);                      // NOLINT(readability-identifier-naming)
inline bool sevalue_to_native(const se::Value & /*from*/, ccstd::monostate * /*to*/, se::Object * /*ctx*/) { // NOLINT(readability-identifier-naming)
    // nothing todo
    return false;
}

//////////////////////// scene info
bool sevalue_to_native(const se::Value &from, cc::scene::FogInfo *, se::Object * /*ctx*/);     // NOLINT(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::scene::ShadowsInfo *, se::Object * /*ctx*/); // NOLINT(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::scene::SkyboxInfo *, se::Object * /*ctx*/);  // NOLINT(readability-identifier-naming)

/////////////////////// geometry

bool sevalue_to_native(const se::Value &from, cc::geometry::AABB *, se::Object * /*ctx*/);         // NOLINT(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::geometry::Capsule *, se::Object * /*ctx*/);      // NOLINT(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::geometry::Line *, se::Object * /*ctx*/);         // NOLINT(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::geometry::Ray *, se::Object * /*ctx*/);          // NOLINT(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::geometry::Sphere *, se::Object * /*ctx*/);       // NOLINT(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::geometry::Triangle *, se::Object * /*ctx*/);     // NOLINT(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::geometry::Plane *to, se::Object * /*unused*/);   // NOLINT(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::geometry::Plane **to, se::Object * /*unused*/);  // NOLINT(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::geometry::Frustum *to, se::Object * /*unused*/); // NOLINT(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::geometry::Spline *to, se::Object * /*unused*/);  // NOLINT(readability-identifier-naming)

////////////////////////////////////////////////////////////////////////////
////////////////////nativevalue to se /////////////////////////////////////
////////////////////////////////////////////////////////////////////////////

// native value -> se value
CC_DEPRECATED(3.6, "use native_to_se instead")
bool ccvalue_to_seval(const cc::Value &v, se::Value *ret); // NOLINT(readability-identifier-naming)
CC_DEPRECATED(3.6, "use native_to_se instead")
bool ccvaluemap_to_seval(const cc::ValueMap &v, se::Value *ret); // NOLINT(readability-identifier-naming)
CC_DEPRECATED(3.6, "use native_to_se instead")
bool ccvaluemapintkey_to_seval(const cc::ValueMapIntKey &v, se::Value *ret); // NOLINT(readability-identifier-naming)
CC_DEPRECATED(3.6, "use native_to_se instead")
bool ccvaluevector_to_seval(const cc::ValueVector &v, se::Value *ret); // NOLINT(readability-identifier-naming)

CC_DEPRECATED(3.6, "use native_to_se instead")
bool ManifestAsset_to_seval(const cc::extension::ManifestAsset &v, se::Value *ret); // NOLINT(readability-identifier-naming)
CC_DEPRECATED(3.6, "use native_to_se instead")
bool Data_to_seval(const cc::Data &v, se::Value *ret); // NOLINT(readability-identifier-naming)
CC_DEPRECATED(3.6, "use native_to_se instead")
bool DownloadTask_to_seval(const cc::network::DownloadTask &v, se::Value *ret); // NOLINT(readability-identifier-naming)

CC_DEPRECATED(3.6, "use native_to_se instead")
bool Vec2_to_seval(const cc::Vec2 &v, se::Value *ret); // NOLINT(readability-identifier-naming)
CC_DEPRECATED(3.6, "use native_to_se instead")
bool Vec3_to_seval(const cc::Vec3 &v, se::Value *ret); // NOLINT(readability-identifier-naming)
CC_DEPRECATED(3.6, "use native_to_se instead")
bool Vec4_to_seval(const cc::Vec4 &v, se::Value *ret); // NOLINT(readability-identifier-naming)
CC_DEPRECATED(3.6, "use native_to_se instead")
bool Mat4_to_seval(const cc::Mat4 &v, se::Value *ret); // NOLINT(readability-identifier-naming)
CC_DEPRECATED(3.6, "use native_to_se instead")
bool Size_to_seval(const cc::Size &v, se::Value *ret); // NOLINT(readability-identifier-naming)
CC_DEPRECATED(3.6, "use native_to_se instead")
bool Rect_to_seval(const cc::Rect &v, se::Value *ret); // NOLINT(readability-identifier-naming)

// bool nativevalue_to_se(const cc::TypedArray &typedArray, se::Value &to, se::Object * /*ctx*/); // NOLINT(readability-identifier-naming) // NOLINT

/**
 * WARN: call nativevalue_to_se instead and it converts cc::Data to ArrayBuffer
 */
bool Data_to_TypedArray(const cc::Data &v, se::Value *ret); // NOLINT(readability-identifier-naming)

bool nativevalue_to_se(const cc::ArrayBuffer &arrayBuffer, se::Value &to, se::Object * /*ctx*/); // NOLINT(readability-identifier-naming) // NOLINT
inline bool nativevalue_to_se(cc::ArrayBuffer *arrayBuffer, se::Value &to, se::Object *ctx) {    // NOLINT(readability-identifier-naming) // NOLINT
    if (arrayBuffer == nullptr) {
        return false;
    }
    return nativevalue_to_se(*arrayBuffer, to, ctx);
}

inline bool nativevalue_to_se(const ccstd::vector<int8_t> &from, se::Value &to, se::Object * /*ctx*/) { // NOLINT(readability-identifier-naming)
    se::HandleObject array{se::Object::createTypedArray(se::Object::TypedArrayType::INT8, from.data(), from.size())};
    to.setObject(array);
    return true;
}

inline bool nativevalue_to_se(const ccstd::vector<uint8_t> &from, se::Value &to, se::Object * /*ctx*/) { // NOLINT(readability-identifier-naming)
    se::HandleObject array{se::Object::createTypedArray(se::Object::TypedArrayType::UINT8, from.data(), from.size())};
    to.setObject(array);
    return true;
}

inline bool nativevalue_to_se(int64_t from, se::Value &to, se::Object * /*ctx*/) { // NOLINT(readability-identifier-naming)
    to.setInt64(from);
    return true;
}

inline bool nativevalue_to_se(uint64_t from, se::Value &to, se::Object * /*ctx*/) { // NOLINT(readability-identifier-naming)
    to.setUint64(from);
    return true;
}

inline bool nativevalue_to_se(int32_t from, se::Value &to, se::Object * /*ctx*/) { // NOLINT(readability-identifier-naming)
    to.setInt32(from);
    return true;
}

inline bool nativevalue_to_se(uint32_t from, se::Value &to, se::Object * /*ctx*/) { // NOLINT(readability-identifier-naming)
    to.setUint32(from);
    return true;
}
inline bool nativevalue_to_se(int16_t from, se::Value &to, se::Object * /*ctx*/) { // NOLINT(readability-identifier-naming)
    to.setInt16(from);
    return true;
}
inline bool nativevalue_to_se(uint16_t from, se::Value &to, se::Object * /*ctx*/) { // NOLINT(readability-identifier-naming)
    to.setUint16(from);
    return true;
}

inline bool nativevalue_to_se(int8_t from, se::Value &to, se::Object * /*ctx*/) { // NOLINT(readability-identifier-naming)
    to.setInt8(from);
    return true;
}

inline bool nativevalue_to_se(uint8_t from, se::Value &to, se::Object * /*ctx*/) { // NOLINT(readability-identifier-naming)
    to.setUint8(from);
    return true;
}

inline bool nativevalue_to_se(float from, se::Value &to, se::Object * /*ctx*/) { // NOLINT(readability-identifier-naming)
    to.setFloat(from);
    return true;
}
inline bool nativevalue_to_se(double from, se::Value &to, se::Object * /*ctx*/) { // NOLINT(readability-identifier-naming)
    to.setDouble(from);
    return true;
}
inline bool nativevalue_to_se(bool from, se::Value &to, se::Object * /*ctx*/) { // NOLINT(readability-identifier-naming)
    to.setBoolean(from);
    return true;
}

#if CC_PLATFORM == CC_PLATFORM_IOS || CC_PLATFORM == CC_PLATFORM_MACOS
inline bool nativevalue_to_se(unsigned long from, se::Value &to, se::Object * /*ctx*/) { // NOLINT(readability-identifier-naming)
    static_assert(sizeof(from) == 8, "");
    to.setDouble(static_cast<double>(from));
    return true;
}
inline bool nativevalue_to_se(long from, se::Value &to, se::Object * /*ctx*/) { // NOLINT(readability-identifier-naming)
    static_assert(sizeof(from) == 8, "");
    to.setDouble(static_cast<double>(from));
    return true;
}

#endif

inline bool nativevalue_to_se(const ccstd::string &from, se::Value &to, se::Object * /*ctx*/) { // NOLINT(readability-identifier-naming)
    to.setString(from);
    return true;
}

inline bool nativevalue_to_se(const std::string_view &from, se::Value &to, se::Object * /*ctx*/) { // NOLINT(readability-identifier-naming)
    to.setString(from);
    return true;
}

inline bool nativevalue_to_se(const char *from, se::Value &to, se::Object * /*ctx*/) { // NOLINT(readability-identifier-naming)
    to.setString(from);
    return true;
}

inline bool nativevalue_to_se(char *from, se::Value &to, se::Object * /*ctx*/) { // NOLINT(readability-identifier-naming)
    to.setString(from);
    return true;
}

bool nativevalue_to_se(const cc::NativeDep &from, se::Value &to, se::Object *ctx); // NOLINT(readability-identifier-naming)

// JSB_REGISTER_OBJECT_TYPE(cc::network::DownloaderHints);

bool nativevalue_to_se(const cc::Data &from, se::Value &to, se::Object *ctx); // NOLINT(readability-identifier-naming)

bool nativevalue_to_se(const cc::Value &from, se::Value &to, se::Object *ctx); // NOLINT(readability-identifier-naming)

bool nativevalue_to_se(const ccstd::unordered_map<ccstd::string, cc::Value> &from, se::Value &to, se::Object *ctx); // NOLINT(readability-identifier-naming)

bool nativevalue_to_se(const cc::Size &from, se::Value &to, se::Object *ctx); // NOLINT(readability-identifier-naming)

bool nativevalue_to_se(const cc::extension::ManifestAsset &from, se::Value &to, se::Object *ctx); // NOLINT(readability-identifier-naming)

bool nativevalue_to_se(const cc::Rect &from, se::Value &to, se::Object *ctx); // NOLINT(readability-identifier-naming)

bool nativevalue_to_se(const cc::gfx::Rect &from, se::Value &to, se::Object *ctx); // NOLINT(readability-identifier-naming)

bool nativevalue_to_se(const cc::gfx::FormatInfo *from, se::Value &to, se::Object *ctx); // NOLINT(readability-identifier-naming

bool nativevalue_to_se(const cc::network::DownloadTask &from, se::Value &to, se::Object * /*ctx*/); // NOLINT(readability-identifier-naming)

inline bool nativevalue_to_se(const ccstd::monostate & /*from*/, se::Value &to, se::Object * /*ctx*/) { // NOLINT(readability-identifier-naming)
    to.setUndefined();
    return true;
}

inline bool nativevalue_to_se(const ccstd::any &from, se::Value &to, se::Object *ctx) { // NOLINT
    CC_ABORT();
    SE_LOGE("should not convert ccstd::any");
    return true;
}

using void_p = void *;
inline bool nativevalue_to_se(const void_p &from, se::Value &to, se::Object * /*ctx*/) { // NOLINT(readability-identifier-naming)
    if (!from) {
        to.setUndefined();
    } else {
        auto ptr = reinterpret_cast<uintptr_t>(from);
        sizeof(from) == 8 ? to.setUint64(static_cast<uint64_t>(ptr)) : to.setUint32(static_cast<uint32_t>(ptr));
    }
    return true;
}

// Spine conversions
#if CC_USE_SPINE

bool sevalue_to_native(const se::Value &, spine::String *, se::Object *); // NOLINT(readability-identifier-naming)

bool nativevalue_to_se(const spine::Vector<spine::String> &v, se::Value &ret, se::Object *ctx); // NOLINT(readability-identifier-naming)

bool nativevalue_to_se(const spine::String &obj, se::Value &val, se::Object *ctx); // NOLINT(readability-identifier-naming)

bool sevalue_to_native(const se::Value &v, spine::Vector<spine::String> *ret, se::Object *ctx); // NOLINT(readability-identifier-naming)

bool sevalue_to_native(const se::Value &from, spine::Vector2 *to, se::Object * /*unused*/); // NOLINT(readability-identifier-naming)

bool nativevalue_to_se(const spine::Vector2 &from, se::Value &to, se::Object * /*unused*/); // NOLINT(readability-identifier-naming)

#endif

bool sevalue_to_native(const se::Value &v, cc::gfx::AccelerationStructure **ret, se::Object *ctx); // NOLINT(readability-identifier-naming)

inline bool nativevalue_to_se(const se::Object *from, se::Value &to, se::Object * /*ctx*/) { // NOLINT(readability-identifier-naming)
    to.setObject(const_cast<se::Object *>(from));
    return true;
}

inline bool nativevalue_to_se(se::Object *from, se::Value &to, se::Object * /*ctx*/) { // NOLINT(readability-identifier-naming)
    to.setObject(from);
    return true;
}

#if CC_USE_MIDDLEWARE
bool seval_to_Map_string_key(const se::Value &v, cc::RefMap<ccstd::string, cc::middleware::Texture2D *> *ret); // NOLINT(readability-identifier-naming)
#endif                                                                                                         // CC_USE_MIDDLEWARE

#if CC_USE_PHYSICS_PHYSX

bool nativevalue_to_se(const ccstd::vector<std::shared_ptr<cc::physics::TriggerEventPair>> &from, se::Value &to, se::Object * /*ctx*/);
bool nativevalue_to_se(const ccstd::vector<cc::physics::ContactPoint> &from, se::Value &to, se::Object * /*ctx*/);
bool nativevalue_to_se(const ccstd::vector<std::shared_ptr<cc::physics::ContactEventPair>> &from, se::Value &to, se::Object *ctx);
bool nativevalue_to_se(const cc::physics::RaycastResult &from, se::Value &to, se::Object *ctx);
bool nativevalue_to_se(const ccstd::vector<std::shared_ptr<cc::physics::CCTShapeEventPair>> &from, se::Value &to, se::Object *ctx);
bool nativevalue_to_se(const ccstd::vector<std::shared_ptr<cc::physics::CCTTriggerEventPair>> &from, se::Value &to, se::Object * /*ctx*/);

bool sevalue_to_native(const se::Value &from, cc::physics::ConvexDesc *to, se::Object *ctx);
bool sevalue_to_native(const se::Value &from, cc::physics::TrimeshDesc *to, se::Object *ctx);
bool sevalue_to_native(const se::Value &from, cc::physics::HeightFieldDesc *to, se::Object *ctx);
bool sevalue_to_native(const se::Value &from, cc::physics::RaycastOptions *to, se::Object *ctx);

#endif // USE_PHYSICS_PHYSX
