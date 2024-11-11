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

#include <sstream>
#include "base/DeferredReleasePool.h"
#include "base/TemplateUtils.h"
#include "base/Value.h"
#include "cocos/base/RefMap.h"
#include "cocos/base/RefVector.h"
#include "cocos/core/TypedArray.h"
#include "cocos/editor-support/middleware-adapter.h"
#include "cocos/math/Geometry.h"
#include "cocos/math/Quaternion.h"
#include "cocos/math/Vec2.h"
#include "cocos/math/Vec3.h"
#include "core/ArrayBuffer.h"
#include "core/assets/ImageAsset.h"
#include "core/assets/TextureCube.h"
#include "core/geometry/AABB.h"
#include "extensions/cocos-ext.h"
#include "jsb_conversions.h"
#include "network/Downloader.h"

#include "bindings/auto/jsb_assets_auto.h"
#include "bindings/auto/jsb_cocos_auto.h"
#if CC_USE_PHYSICS_PHYSX
#include "bindings/auto/jsb_physics_auto.h"
#endif
#include "cocos/core/geometry/Geometry.h"
#include "scene/Fog.h"
#include "scene/Shadow.h"
#include "scene/Skybox.h"

#if CC_USE_SPINE
#include "cocos/editor-support/spine-creator-support/Vector2.h"
#endif

///////////////////////// utils /////////////////////////

#define CHECK_ASSIGN_PRVOBJ_RET(jsObj, nativeObj)                            \
    se::PrivateObjectBase *_privateObjL = jsObj->getPrivateObject();         \
    if (_privateObjL) {                                                      \
        using target_type = typename std::decay<decltype(*nativeObj)>::type; \
        *nativeObj = *_privateObjL->get<target_type>();                      \
        return true;                                                         \
    }

template <typename A, typename T, typename F>
typename std::enable_if<std::is_member_function_pointer<F>::value, bool>::type
set_member_field(se::Object *obj, T *to, const ccstd::string &property, F f, se::Value &tmp) { // NOLINT
    bool ok = obj->getProperty(property.data(), &tmp, true);
    SE_PRECONDITION2(ok, false, "Property '%s' is not set", property.data());

    A m;
    ok = sevalue_to_native(tmp, &m, obj);
    SE_PRECONDITION2(ok, false, "Convert property '%s' failed", property.data());
    (to->*f)(m);
    return true;
}

template <typename T, typename F>
typename std::enable_if<std::is_member_object_pointer<F>::value, bool>::type
set_member_field(se::Object *obj, T *to, const ccstd::string &property, F f, se::Value &tmp) { // NOLINT
    bool ok = obj->getProperty(property.data(), &tmp, true);
    SE_PRECONDITION2(ok, false, "Property '%s' is not set", property.data());

    ok = sevalue_to_native(tmp, &(to->*f), obj);
    SE_PRECONDITION2(ok, false, "Convert property '%s' failed", property.data());
    return true;
}

static bool isNumberString(const ccstd::string &str) {
    for (const auto &c : str) { // NOLINT(readability-use-anyofallof) // remove after using c++20
        if (!isdigit(c)) {
            return false;
        }
    }
    return true;
}

namespace {
enum class DataType {
    INT,
    FLOAT
};
enum class MathType {
    VEC2 = 0,
    VEC3,
    VEC4,
    QUATERNION,
    MAT3,
    MAT4,
    SIZE,
    RECT,
    COLOR,
};
} // namespace

bool Vec2_to_seval(const cc::Vec2 &v, se::Value *ret) { // NOLINT(readability-identifier-naming)
    return ret ? nativevalue_to_se(v, *ret, nullptr) : false;
}

bool Vec3_to_seval(const cc::Vec3 &v, se::Value *ret) { // NOLINT(readability-identifier-naming)
    return ret ? nativevalue_to_se(v, *ret, nullptr) : false;
}

bool Vec4_to_seval(const cc::Vec4 &v, se::Value *ret) { // NOLINT(readability-identifier-naming)
    return ret ? nativevalue_to_se(v, *ret, nullptr) : false;
}

bool Mat4_to_seval(const cc::Mat4 &v, se::Value *ret) { // NOLINT(readability-identifier-naming)
    CC_ASSERT_NOT_NULL(ret);
    se::HandleObject obj(se::Object::createArrayObject(16));

    for (uint8_t i = 0; i < 16; ++i) {
        obj->setArrayElement(i, se::Value(v.m[i]));
    }

    obj->setProperty("type", se::Value(static_cast<uint32_t>(MathType::MAT4)));
    ret->setObject(obj);
    return true;
}

bool Size_to_seval(const cc::Size &v, se::Value *ret) { // NOLINT(readability-identifier-naming)
    return ret ? nativevalue_to_se(v, *ret, nullptr) : false;
}

bool Rect_to_seval(const cc::Rect &v, se::Value *ret) { // NOLINT(readability-identifier-naming)
    return ret ? nativevalue_to_se(v, *ret, nullptr) : false;
}
////////////////////////////////////////////////////////////////////////////
/////////////////sevalue to native//////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////

// NOLINTNEXTLINE(readability-identifier-naming)
bool seval_to_ccvalue(const se::Value &v, cc::Value *ret) { // NOLINT
    return sevalue_to_native(v, ret, nullptr);
}
bool sevalue_to_native(const se::Value &from, cc::Value *to, se::Object * /*ctx*/) { // NOLINT
    CC_ASSERT_NOT_NULL(to);
    bool ok = true;
    if (from.isObject()) {
        se::Object *jsobj = from.toObject();
        if (!jsobj->isArray()) {
            // It's a normal js object.
            cc::ValueMap dictVal;
            ok = sevalue_to_native(from, &dictVal, nullptr);
            SE_PRECONDITION3(ok, false, *to = cc::Value::VALUE_NULL);
            *to = cc::Value(dictVal);
        } else {
            // It's a js array object.
            cc::ValueVector arrVal;
            ok = sevalue_to_native(from, &arrVal, nullptr);
            SE_PRECONDITION3(ok, false, *to = cc::Value::VALUE_NULL);
            *to = cc::Value(arrVal);
        }
    } else if (from.isString()) {
        *to = from.toString();
    } else if (from.isNumber()) {
        *to = from.toDouble();
    } else if (from.isBoolean()) {
        *to = from.toBoolean();
    } else if (from.isNullOrUndefined()) {
        *to = cc::Value::VALUE_NULL;
    } else {
        SE_PRECONDITION2(false, false, "type not supported!");
    }

    return ok;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool seval_to_ccvaluemap(const se::Value &v, cc::ValueMap *ret) { // NOLINT
    return sevalue_to_native(v, ret, nullptr);
}

bool sevalue_to_native(const se::Value &from, cc::ValueMap *to, se::Object * /*ctx*/) { // NOLINT
    CC_ASSERT_NOT_NULL(to);

    if (from.isNullOrUndefined()) {
        to->clear();
        return true;
    }

    SE_PRECONDITION3(from.isObject(), false, to->clear());
    SE_PRECONDITION3(!from.isNullOrUndefined(), false, to->clear());

    se::Object *obj = from.toObject();

    cc::ValueMap &dict = *to;

    ccstd::vector<ccstd::string> allKeys;
    SE_PRECONDITION3(obj->getAllKeys(&allKeys), false, to->clear());

    bool ok = false;
    se::Value value;
    cc::Value ccvalue;
    for (const auto &key : allKeys) {
        SE_PRECONDITION3(obj->getProperty(key.c_str(), &value), false, to->clear());
        ok = sevalue_to_native(value, &ccvalue, nullptr);
        SE_PRECONDITION3(ok, false, to->clear());
        dict.emplace(key, ccvalue);
    }

    return true;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool seval_to_ccvaluemapintkey(const se::Value &v, cc::ValueMapIntKey *ret) {
    CC_ASSERT_NOT_NULL(ret);
    if (v.isNullOrUndefined()) {
        ret->clear();
        return true;
    }

    SE_PRECONDITION3(v.isObject(), false, ret->clear());
    SE_PRECONDITION3(!v.isNullOrUndefined(), false, ret->clear());

    se::Object *obj = v.toObject();

    cc::ValueMapIntKey &dict = *ret;

    ccstd::vector<ccstd::string> allKeys;
    SE_PRECONDITION3(obj->getAllKeys(&allKeys), false, ret->clear());

    bool ok = false;
    se::Value value;
    cc::Value ccvalue;
    for (const auto &key : allKeys) {
        SE_PRECONDITION3(obj->getProperty(key.c_str(), &value), false, ret->clear());

        if (!isNumberString(key)) {
            SE_LOGD("seval_to_ccvaluemapintkey, found not numeric key: %s", key.c_str());
            continue;
        }

        int intKey = atoi(key.c_str());

        ok = seval_to_ccvalue(value, &ccvalue);
        SE_PRECONDITION3(ok, false, ret->clear());
        dict.emplace(intKey, ccvalue);
    }

    return true;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool seval_to_ccvaluevector(const se::Value &v, cc::ValueVector *ret) { // NOLINT
    CC_ASSERT_NOT_NULL(ret);

    SE_PRECONDITION3(v.isObject(), false, ret->clear());

    se::Object *obj = v.toObject();
    SE_PRECONDITION3(obj->isArray(), false, ret->clear());

    uint32_t len = 0;
    obj->getArrayLength(&len);

    bool ok = false;
    se::Value value;
    cc::Value ccvalue;
    for (uint32_t i = 0; i < len; ++i) {
        if (obj->getArrayElement(i, &value)) {
            ok = seval_to_ccvalue(value, &ccvalue);
            SE_PRECONDITION3(ok, false, ret->clear());
            ret->push_back(ccvalue);
        }
    }

    return true;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool sevals_variadic_to_ccvaluevector(const se::ValueArray &args, cc::ValueVector *ret) {
    bool ok = false;
    cc::Value ccvalue;

    for (const auto &arg : args) {
        ok = seval_to_ccvalue(arg, &ccvalue);
        SE_PRECONDITION3(ok, false, ret->clear());
        ret->push_back(ccvalue);
    }

    return true;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool seval_to_Data(const se::Value &v, cc::Data *ret) {
    return sevalue_to_native(v, ret, nullptr);
}
bool sevalue_to_native(const se::Value &v, cc::Data *ret, se::Object * /*ctx*/) { // NOLINT
    CC_ASSERT_NOT_NULL(ret);
    SE_PRECONDITION2(v.isObject() && (v.toObject()->isTypedArray() || v.toObject()->isArrayBuffer()), false, "Convert parameter to Data failed!");
    uint8_t *ptr = nullptr;
    size_t length = 0;
    se::Object *buffer = v.toObject();
    bool ok = false;
    if (buffer->isTypedArray()) {
        ok = buffer->getTypedArrayData(&ptr, &length);
    } else {
        ok = buffer->getArrayBufferData(&ptr, &length);
    }
    if (ok) {
        ret->copy(ptr, static_cast<int32_t>(length));
    } else {
        ret->clear();
    }
    return ok;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool seval_to_DownloaderHints(const se::Value &v, cc::network::DownloaderHints *ret) {
    const static cc::network::DownloaderHints ZERO{0, 0, ""};
    CC_ASSERT_NOT_NULL(ret);
    SE_PRECONDITION2(v.isObject(), false, "Convert parameter to DownloaderHints failed!");
    se::Value tmp;
    se::Object *obj = v.toObject();
    bool ok = false;

    ok = obj->getProperty("countOfMaxProcessingTasks", &tmp);
    SE_PRECONDITION3(ok && tmp.isNumber(), false, *ret = ZERO);
    ret->countOfMaxProcessingTasks = tmp.toUint32();

    ok = obj->getProperty("timeoutInSeconds", &tmp);
    SE_PRECONDITION3(ok && tmp.isNumber(), false, *ret = ZERO);
    ret->timeoutInSeconds = tmp.toUint32();

    ok = obj->getProperty("tempFileNameSuffix", &tmp);
    SE_PRECONDITION3(ok && tmp.isString(), false, *ret = ZERO);
    ret->tempFileNameSuffix = tmp.toString();

    return ok;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::Vec4 *to, se::Object * /*ctx*/) {
    SE_PRECONDITION2(from.isObject(), false, "Convert parameter to Vec4 failed!");
    se::Object *obj = from.toObject();
    CHECK_ASSIGN_PRVOBJ_RET(obj, to)
    se::Value tmp;
    set_member_field(obj, to, "x", &cc::Vec4::x, tmp);
    set_member_field(obj, to, "y", &cc::Vec4::y, tmp);
    set_member_field(obj, to, "z", &cc::Vec4::z, tmp);
    set_member_field(obj, to, "w", &cc::Vec4::w, tmp);
    return true;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::gfx::Rect *to, se::Object * /*ctx*/) {
    SE_PRECONDITION2(from.isObject(), false, "Convert parameter to Rect failed!");
    se::Object *obj = from.toObject();
    se::Value tmp;

    set_member_field(obj, to, "x", &cc::gfx::Rect::x, tmp);
    set_member_field(obj, to, "y", &cc::gfx::Rect::y, tmp);
    set_member_field(obj, to, "width", &cc::gfx::Rect::width, tmp);
    set_member_field(obj, to, "height", &cc::gfx::Rect::height, tmp);
    return true;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::Rect *to, se::Object * /*ctx*/) {
    SE_PRECONDITION2(from.isObject(), false, "Convert parameter to Rect failed!");
    se::Object *obj = from.toObject();
    se::Value tmp;

    set_member_field(obj, to, "x", &cc::Rect::x, tmp);
    set_member_field(obj, to, "y", &cc::Rect::y, tmp);
    set_member_field(obj, to, "width", &cc::Rect::width, tmp);
    set_member_field(obj, to, "height", &cc::Rect::height, tmp);
    return true;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::Mat3 *to, se::Object * /*ctx*/) {
    SE_PRECONDITION2(from.isObject(), false, "Convert parameter to Matrix3 failed!");
    se::Object *obj = from.toObject();

    CHECK_ASSIGN_PRVOBJ_RET(obj, to)

    if (obj->isTypedArray()) {
        // typed array
        SE_PRECONDITION2(obj->isTypedArray(), false, "Convert parameter to Matrix3 failed!");
        size_t length = 0;
        uint8_t *ptr = nullptr;
        obj->getTypedArrayData(&ptr, &length);

        memcpy(to->m, ptr, length);
    } else {
        bool ok = false;
        se::Value tmp;
        ccstd::string prefix = "m";
        for (uint32_t i = 0; i < 9; ++i) {
            ccstd::string name;
            if (i < 10) {
                name = prefix + "0" + std::to_string(i);
            } else {
                name = prefix + std::to_string(i);
            }
            ok = obj->getProperty(name.c_str(), &tmp, true);
            SE_PRECONDITION3(ok, false, *to = cc::Mat3::IDENTITY);

            if (tmp.isNumber()) {
                to->m[i] = tmp.toFloat();
            } else {
                SE_REPORT_ERROR("%u, not supported type in matrix", i);
                *to = cc::Mat3::IDENTITY;
                return false;
            }

            tmp.setUndefined();
        }
    }

    return true;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::Mat4 *to, se::Object * /*unused*/) {
    SE_PRECONDITION2(from.isObject(), false, "Convert parameter to Matrix4 failed!");
    se::Object *obj = from.toObject();
    CHECK_ASSIGN_PRVOBJ_RET(obj, to)

    if (obj->isTypedArray()) {
        // typed array
        SE_PRECONDITION2(obj->isTypedArray(), false, "Convert parameter to Matrix4 failed!");

        size_t length = 0;
        uint8_t *ptr = nullptr;
        obj->getTypedArrayData(&ptr, &length);

        memcpy(to->m, ptr, length);
    } else {
        bool ok = false;
        se::Value tmp;
        ccstd::string prefix = "m";
        for (uint32_t i = 0; i < 16; ++i) {
            ccstd::string name;
            if (i < 10) {
                name = prefix + "0" + std::to_string(i);
            } else {
                name = prefix + std::to_string(i);
            }
            ok = obj->getProperty(name.c_str(), &tmp, true);
            SE_PRECONDITION3(ok, false, *to = cc::Mat4::IDENTITY);

            if (tmp.isNumber()) {
                to->m[i] = tmp.toFloat();
            } else {
                SE_REPORT_ERROR("%u, not supported type in matrix", i);
                *to = cc::Mat4::IDENTITY;
                return false;
            }

            tmp.setUndefined();
        }
    }

    return true;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::Vec3 *to, se::Object * /*unused*/) {
    SE_PRECONDITION2(from.isObject(), false, "Convert parameter to Vec3 failed!");

    se::Object *obj = from.toObject();
    CHECK_ASSIGN_PRVOBJ_RET(obj, to)
    se::Value tmp;
    set_member_field(obj, to, "x", &cc::Vec3::x, tmp);
    set_member_field(obj, to, "y", &cc::Vec3::y, tmp);
    set_member_field(obj, to, "z", &cc::Vec3::z, tmp);
    return true;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::Color *to, se::Object * /*unused*/) {
    SE_PRECONDITION2(from.isObject(), false, "Convert parameter to Color failed!");
    se::Object *obj = from.toObject();
    CHECK_ASSIGN_PRVOBJ_RET(obj, to)
    se::Value t;
    set_member_field(obj, to, "r", &cc::Color::r, t);
    set_member_field(obj, to, "g", &cc::Color::g, t);
    set_member_field(obj, to, "b", &cc::Color::b, t);
    set_member_field(obj, to, "a", &cc::Color::a, t);
    return true;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::Vec2 *to, se::Object * /*unused*/) {
    SE_PRECONDITION2(from.isObject(), false, "Convert parameter to Vec2 failed!");

    se::Object *obj = from.toObject();
    CHECK_ASSIGN_PRVOBJ_RET(obj, to)
    se::Value tmp;
    set_member_field(obj, to, "x", &cc::Vec2::x, tmp);
    set_member_field(obj, to, "y", &cc::Vec2::y, tmp);
    return true;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::Size *to, se::Object * /*unused*/) {
    SE_PRECONDITION2(from.isObject(), false, "Convert parameter to Size failed!");

    se::Object *obj = from.toObject();
    se::Value tmp;
    set_member_field(obj, to, "width", &cc::Size::width, tmp);
    set_member_field(obj, to, "height", &cc::Size::height, tmp);
    return true;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::Quaternion *to, se::Object * /*unused*/) {
    SE_PRECONDITION2(from.isObject(), false, "Convert parameter to Quaternion failed!");
    se::Object *obj = from.toObject();
    CHECK_ASSIGN_PRVOBJ_RET(obj, to);
    se::Value tmp;
    set_member_field(obj, to, "x", &cc::Quaternion::x, tmp);
    set_member_field(obj, to, "y", &cc::Quaternion::y, tmp);
    set_member_field(obj, to, "z", &cc::Quaternion::z, tmp);
    set_member_field(obj, to, "w", &cc::Quaternion::w, tmp);
    return true;
}

//////////////////// geometry

// NOLINTNEXTLINE(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::geometry::AABB *to, se::Object * /*ctx*/) {
    SE_PRECONDITION2(from.isObject(), false, "Convert parameter to AABB failed!");
    se::Object *obj = from.toObject();
    CHECK_ASSIGN_PRVOBJ_RET(obj, to)
    se::Value tmp;
    set_member_field(obj, to, "halfExtents", &cc::geometry::AABB::halfExtents, tmp);
    set_member_field(obj, to, "center", &cc::geometry::AABB::center, tmp);
    return true;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::geometry::Capsule *to, se::Object * /*ctx*/) {
    SE_PRECONDITION2(from.isObject(), false, "Convert parameter to Capsule failed!");
    se::Object *obj = from.toObject();
    CHECK_ASSIGN_PRVOBJ_RET(obj, to)
    se::Value tmp;
    set_member_field(obj, to, "radius", &cc::geometry::Capsule::radius, tmp);
    set_member_field(obj, to, "halfHeight", &cc::geometry::Capsule::halfHeight, tmp);
    set_member_field(obj, to, "axis", &cc::geometry::Capsule::axis, tmp);
    return true;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::geometry::Line *to, se::Object * /*ctx*/) {
    SE_PRECONDITION2(from.isObject(), false, "Convert parameter to Line failed!");
    se::Object *obj = from.toObject();
    CHECK_ASSIGN_PRVOBJ_RET(obj, to)
    se::Value tmp;
    set_member_field(obj, to, "s", &cc::geometry::Line::s, tmp);
    set_member_field(obj, to, "e", &cc::geometry::Line::e, tmp);
    return true;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::geometry::Ray *to, se::Object * /*ctx*/) {
    SE_PRECONDITION2(from.isObject(), false, "Convert parameter to Ray failed!");
    se::Object *obj = from.toObject();
    CHECK_ASSIGN_PRVOBJ_RET(obj, to)
    se::Value tmp;
    set_member_field(obj, to, "o", &cc::geometry::Ray::o, tmp);
    set_member_field(obj, to, "d", &cc::geometry::Ray::d, tmp);
    return true;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::geometry::Sphere *to, se::Object * /*ctx*/) {
    SE_PRECONDITION2(from.isObject(), false, "Convert parameter to Sphere failed!");
    se::Object *obj = from.toObject();
    CHECK_ASSIGN_PRVOBJ_RET(obj, to)
    se::Value tmp;
    set_member_field<float>(obj, to, "radius", &cc::geometry::Sphere::setRadius, tmp);
    set_member_field<cc::Vec3>(obj, to, "center", &cc::geometry::Sphere::setCenter, tmp);
    return true;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::geometry::Triangle *to, se::Object * /*ctx*/) {
    SE_PRECONDITION2(from.isObject(), false, "Convert parameter to Plane failed!");
    se::Object *obj = from.toObject();
    CHECK_ASSIGN_PRVOBJ_RET(obj, to)
    se::Value tmp;
    set_member_field(obj, to, "a", &cc::geometry::Triangle::a, tmp);
    set_member_field(obj, to, "b", &cc::geometry::Triangle::b, tmp);
    set_member_field(obj, to, "c", &cc::geometry::Triangle::c, tmp);
    return true;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::geometry::Plane *to, se::Object * /*unused*/) {
    SE_PRECONDITION2(from.isObject(), false, "Convert parameter to Plane failed!");
    se::Object *obj = from.toObject();
    CHECK_ASSIGN_PRVOBJ_RET(obj, to)
    se::Value tmp;
    set_member_field(obj, to, "n", &cc::geometry::Plane::n, tmp);
    set_member_field(obj, to, "d", &cc::geometry::Plane::d, tmp);
    return true;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::geometry::Plane **to, se::Object *ctx) {
    return sevalue_to_native(from, *to, ctx);
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::geometry::Frustum *to, se::Object * /*unused*/) {
    SE_PRECONDITION2(from.isObject(), false, "Convert parameter to Frustum failed!");
    se::Object *obj = from.toObject();
    CHECK_ASSIGN_PRVOBJ_RET(obj, to)
    se::Value tmp;
    set_member_field(obj, to, "planes", &cc::geometry::Frustum::planes, tmp);
    set_member_field(obj, to, "vertices", &cc::geometry::Frustum::vertices, tmp);
    return true;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::geometry::Spline *to, se::Object * /*unused*/) {
    SE_PRECONDITION2(from.isObject(), false, "Convert parameter to Spline failed!");
    se::Object *obj = from.toObject();
    CHECK_ASSIGN_PRVOBJ_RET(obj, to)
    se::Value tmp;
    set_member_field<cc::geometry::SplineMode>(obj, to, "_mode", &cc::geometry::Spline::setMode, tmp);
    set_member_field<ccstd::vector<cc::Vec3>>(obj, to, "_knots", &cc::geometry::Spline::setKnots, tmp);
    return true;
}

////////////////////////// scene info

// NOLINTNEXTLINE(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::scene::FogInfo *to, se::Object * /*ctx*/) {
    SE_PRECONDITION2(from.isObject(), false, "Convert parameter to FogInfo failed!");
    se::Object *obj = from.toObject();
    se::Value tmp;
    set_member_field<cc::scene::FogType>(obj, to, "type", &cc::scene::FogInfo::setType, tmp);
    set_member_field<cc::Color>(obj, to, "fogColor", &cc::scene::FogInfo::setFogColor, tmp);
    set_member_field<bool>(obj, to, "enabled", &cc::scene::FogInfo::setEnabled, tmp);
    set_member_field<float>(obj, to, "fogDensity", &cc::scene::FogInfo::setFogDensity, tmp);
    set_member_field<float>(obj, to, "fogStart", &cc::scene::FogInfo::setFogStart, tmp);
    set_member_field<float>(obj, to, "fogEnd", &cc::scene::FogInfo::setFogEnd, tmp);
    set_member_field<float>(obj, to, "fogAtten", &cc::scene::FogInfo::setFogAtten, tmp);
    set_member_field<float>(obj, to, "fogTop", &cc::scene::FogInfo::setFogTop, tmp);
    set_member_field<float>(obj, to, "fogRange", &cc::scene::FogInfo::setFogRange, tmp);
    set_member_field<float>(obj, to, "accurate", &cc::scene::FogInfo::setAccurate, tmp);
    return true;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::scene::ShadowsInfo *to, se::Object * /*ctx*/) {
    SE_PRECONDITION2(from.isObject(), false, "Convert parameter to ShadowInfo failed!");
    se::Object *obj = from.toObject();
    se::Value tmp;
    set_member_field<cc::scene::ShadowType>(obj, to, "type", &cc::scene::ShadowsInfo::setType, tmp);
    set_member_field<bool>(obj, to, "enabled", &cc::scene::ShadowsInfo::setEnabled, tmp);
    set_member_field<cc::Vec3>(obj, to, "planeDirection", &cc::scene::ShadowsInfo::setPlaneDirection, tmp);
    set_member_field<float>(obj, to, "planeHeight", &cc::scene::ShadowsInfo::setPlaneHeight, tmp);
    set_member_field<cc::Color>(obj, to, "shadowColor", &cc::scene::ShadowsInfo::setShadowColor, tmp);
    set_member_field<float>(obj, to, "maxReceived", &cc::scene::ShadowsInfo::setMaxReceived, tmp);
    set_member_field<float>(obj, to, "size", &cc::scene::ShadowsInfo::setShadowMapSize, tmp);

    return true;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::scene::SkyboxInfo *to, se::Object * /*ctx*/) {
    SE_PRECONDITION2(from.isObject(), false, "Convert parameter to SkyboxInfo failed!");
    se::Object *obj = from.toObject();
    se::Value tmp;
    set_member_field<cc::TextureCube *>(obj, to, "envmap", &cc::scene::SkyboxInfo::setEnvmap, tmp);
    set_member_field<cc::TextureCube *>(obj, to, "diffuseMap", &cc::scene::SkyboxInfo::setDiffuseMap, tmp);
    set_member_field<bool>(obj, to, "enabled", &cc::scene::SkyboxInfo::setEnabled, tmp);
    set_member_field<bool>(obj, to, "useIBL", &cc::scene::SkyboxInfo::setUseIBL, tmp);
    set_member_field<bool>(obj, to, "useHDR", &cc::scene::SkyboxInfo::setUseHDR, tmp);
    set_member_field<bool>(obj, to, "applyDiffuseMap", &cc::scene::SkyboxInfo::setApplyDiffuseMap, tmp);

    return true;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::MacroValue *to, se::Object * /*ctx*/) {
    bool ret = true;
    if (from.isBoolean()) {
        *to = from.toBoolean();
    } else if (from.isNumber()) {
        *to = from.toInt32(); // NOTE: We only support macro with int32_t type now.
    } else if (from.isString()) {
        *to = from.toString();
    } else {
        ret = false;
    }

    return ret;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, ccstd::vector<cc::MacroRecord> *to, se::Object * /*ctx*/) {
    if (from.isNullOrUndefined()) {
        to->clear();
        return true;
    }

    SE_PRECONDITION2(from.isObject(), false, "sevalue_to_native(ccstd::vector<cc::MacroRecord>), not an object");
    auto *fromObj = from.toObject();
    CC_ASSERT(fromObj->isArray());
    uint32_t len = 0;
    bool ok = fromObj->getArrayLength(&len);
    if (ok) {
        to->resize(len);
        se::Value arrElement;
        for (uint32_t i = 0; i < len; ++i) {
            ok = fromObj->getArrayElement(i, &arrElement);
            if (!ok || !arrElement.isObject()) {
                continue;
            }
            cc::MacroRecord macroRecord;
            ccstd::vector<ccstd::string> keys;
            ok = arrElement.toObject()->getAllKeys(&keys);
            if (ok) {
                se::Value seMacroVal;
                for (const auto &key : keys) {
                    ok = arrElement.toObject()->getProperty(key, &seMacroVal);
                    cc::MacroValue macroVal;
                    sevalue_to_native(seMacroVal, &macroVal, nullptr);
                    macroRecord.emplace(key, std::move(macroVal));
                }
            }
            (*to)[i] = std::move(macroRecord);
        }
    }

    return true;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::MaterialProperty *to, se::Object *ctx) {
    if (from.isNullOrUndefined()) {
        *to = ccstd::monostate();
        return true;
    }

    // TODO(PatriceJiang): float/int32_t from js number
    if (from.isNumber()) {
        double v = from.toDouble();
        if (std::trunc(v) != v) {
            *to = static_cast<float>(v);
        } else {
            *to = static_cast<int32_t>(v);
        }
        return true;
    }

    if (from.isObject()) {
        auto *obj = const_cast<se::Object *>(from.toObject());
        bool hasX;
        bool hasY;
        bool hasZ;
        bool hasW;
        bool hasEuler;
        bool hasM01;
        bool hasM08;
        bool hasM15;
        bool hasAssetID;
        bool hasColorVal;

        se::Value tmp0;
        se::Value tmp1;
        se::Value tmp2;
        se::Value tmp3;
        se::Value tmp4;

        hasColorVal = obj->getProperty("_val", &tmp0, true);
        if (hasColorVal) {
            *to = cc::Color{tmp0.toUint32()};
            return true;
        }

        hasX = obj->getProperty("x", &tmp0, true);
        hasY = hasX && obj->getProperty("y", &tmp1, true);
        hasZ = hasY && obj->getProperty("z", &tmp2, true);
        hasW = hasZ && obj->getProperty("w", &tmp3, true);
        hasEuler = hasW && obj->getProperty("getEulerAngles", &tmp4, true);

        if (hasW) {
            if (hasEuler) {
                *to = cc::Quaternion(tmp0.toFloat(), tmp1.toFloat(), tmp2.toFloat(), tmp3.toFloat());
            } else {
                *to = cc::Vec4(tmp0.toFloat(), tmp1.toFloat(), tmp2.toFloat(), tmp3.toFloat());
            }
            return true;
        }

        if (hasZ) {
            *to = cc::Vec3(tmp0.toFloat(), tmp1.toFloat(), tmp2.toFloat());
            return true;
        }

        if (hasY) {
            *to = cc::Vec2(tmp0.toFloat(), tmp1.toFloat());
            return true;
        }

        hasM01 = obj->getProperty("m00", &tmp0, true);
        hasM08 = hasM01 && obj->getProperty("m08", &tmp1, true);
        hasM15 = hasM08 && obj->getProperty("m15", &tmp2, true);

        if (hasM15) {
            cc::Mat4 m4;
            sevalue_to_native(from, &m4, ctx);
            *to = m4;
            return true;
        }

        if (hasM08) {
            cc::Mat3 m3;
            sevalue_to_native(from, &m3, ctx);
            *to = m3;
            return true;
        }

        hasAssetID = obj->getProperty("_id", &tmp3, true);
        if (hasAssetID) {
            *to = reinterpret_cast<cc::TextureBase *>(obj->getPrivateData());
            return true;
        }

        if (obj->_getClass() != nullptr) {
            const auto *name = obj->_getClass()->getName();
            if (0 == strcmp(name, "Texture2D")) {
                *to = reinterpret_cast<cc::Texture2D *>(obj->getPrivateData());
                return true;
            }

            if (0 == strcmp(name, "TextureCube")) {
                *to = reinterpret_cast<cc::TextureCube *>(obj->getPrivateData());
                return true;
            }

            if (0 == strcmp(name, "RenderTexture")) {
                *to = reinterpret_cast<cc::RenderTexture *>(obj->getPrivateData());
                return true;
            }
        }

        // gfx::Texture?
        *to = reinterpret_cast<cc::gfx::Texture *>(obj->getPrivateData());
        return true;
    }

    return false;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::IPreCompileInfoValueType *to, se::Object *ctx) {
    se::Object *obj = from.toObject();
    SE_PRECONDITION2(obj->isArray(), false, "faild to convert to IPreCompileInfoValueType");

    uint32_t len;
    obj->getArrayLength(&len);
    if (len == 0) {
        // TODO(PatriceJiang): judge type of empty array?
        *to = ccstd::vector<bool>{};
        return false;
    }

    se::Value firstEle;
    obj->getArrayElement(0, &firstEle);
    if (firstEle.isBoolean()) {
        ccstd::vector<bool> result;
        sevalue_to_native(from, &result, ctx);
        *to = result;
        return true;
    }
    if (firstEle.isNumber()) {
        ccstd::vector<int32_t> result;
        sevalue_to_native(from, &result, ctx);
        *to = result;
        return true;
    }
    if (firstEle.isString()) {
        ccstd::vector<ccstd::string> result;
        sevalue_to_native(from, &result, ctx);
        *to = result;
        return true;
    }

    return false;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::IPropertyEditorValueType *to, se::Object *ctx) {
    bool ret = true;
    switch (from.getType()) {
        case se::Value::Type::String: {
            ccstd::string str;
            ret = sevalue_to_native(from, &str, ctx);
            *to = std::move(str);
        } break;
        case se::Value::Type::Boolean: {
            bool v{false};
            ret = sevalue_to_native(from, &v, ctx);
            *to = v;
        } break;
        case se::Value::Type::Number: {
            float v{0.F};
            ret = sevalue_to_native(from, &v, ctx);
            *to = v;
        } break;
        case se::Value::Type::Object: {
            CC_ASSERT_TRUE(from.toObject()->isArray());
            ccstd::vector<float> v;
            ret = sevalue_to_native(from, &v, ctx);
            *to = std::move(v);
        } break;
        default:
            *to = {};
            break;
    }

    return ret;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::IPropertyValue *to, se::Object * /*ctx*/) {
    if (from.isObject() && from.toObject()->isArray()) {
        uint32_t len = 0;
        bool ok = from.toObject()->getArrayLength(&len);
        ccstd::vector<float> arr;
        arr.resize(len);
        for (uint32_t i = 0; i < len; ++i) {
            se::Value e;
            ok = from.toObject()->getArrayElement(i, &e);
            if (ok) {
                if (e.isNumber()) {
                    arr[i] = e.toFloat();
                }
            }
        }
        *to = std::move(arr);
    } else if (from.isString()) {
        *to = from.toString();
    } else {
        CC_ABORT();
    }
    return true;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::ArrayBuffer *to, se::Object * /*ctx*/) {
    CC_ASSERT(from.isObject());
    to->setJSArrayBuffer(from.toObject());
    return true;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::ArrayBuffer **to, se::Object * /*ctx*/) {
    CC_ASSERT(from.isObject());
    auto *obj = from.toObject();
    CC_ASSERT((obj->isArrayBuffer() || obj->isTypedArray()));

    auto *ab = ccnew cc::ArrayBuffer();
    ab->addRef();
    if (obj->isArrayBuffer()) {
        ab->setJSArrayBuffer(obj);
    } else if (obj->isTypedArray()) {
        se::Value bufferVal;
        obj->getProperty("buffer", &bufferVal);
        ab->setJSArrayBuffer(bufferVal.toObject());
    } else {
        ab->release();
        return false;
    }

    *to = ab;
    cc::DeferredReleasePool::add(*to);
    return true;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, ccstd::vector<bool> *to, se::Object * /*ctx*/) {
    if (from.isNullOrUndefined()) {
        to->clear();
        return true;
    }

    se::Object *arr = from.toObject();
    uint32_t size;
    se::Value tmp;
    arr->getArrayLength(&size);
    to->resize(size);
    for (uint32_t i = 0; i < size; i++) {
        arr->getArrayElement(i, &tmp);
        (*to)[i] = tmp.toBoolean();
    }
    return true;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, ccstd::variant<ccstd::string, bool> *to, se::Object * /*ctx*/) {
    if (from.isBoolean()) {
        *to = from.toBoolean();
    } else if (from.isString()) {
        *to = from.toString();
    } else {
        CC_ASSERT(false);
    }
    return true;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, ccstd::vector<unsigned char> *to, se::Object * /*ctx*/) {
    if (from.isNullOrUndefined()) {
        to->clear();
        return true;
    }

    CC_ASSERT(from.isObject());
    se::Object *in = from.toObject();

    if (in->isTypedArray()) {
        uint8_t *data = nullptr;
        size_t dataLen = 0;
        in->getTypedArrayData(&data, &dataLen);
        to->resize(dataLen);
        to->assign(data, data + dataLen);
        return true;
    }

    if (in->isArrayBuffer()) {
        uint8_t *data = nullptr;
        size_t dataLen = 0;
        in->getArrayBufferData(&data, &dataLen);
        to->resize(dataLen);
        to->assign(data, data + dataLen);
        return true;
    }

    if (in->isArray()) {
        uint32_t len = 0;
        in->getArrayLength(&len);
        to->resize(len);
        se::Value ele;
        for (uint32_t i = 0; i < len; i++) {
            in->getArrayElement(i, &ele);
            (*to)[i] = ele.toUint8();
        }
        return true;
    }

    SE_LOGE("type error, ArrayBuffer/TypedArray/Array expected!");
    return false;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::TypedArray *to, se::Object * /*ctx*/) {
    CC_ASSERT(from.isObject());
    CC_ASSERT(from.toObject()->isTypedArray());
    if (to->index() == 0) {
        se::Object::TypedArrayType type = from.toObject()->getTypedArrayType();
        switch (type) {
            case se::Object::TypedArrayType::FLOAT32:
                *to = cc::Float32Array();
                break;
            case se::Object::TypedArrayType::UINT16:
                *to = cc::Uint16Array();
                break;
            case se::Object::TypedArrayType::UINT32:
                *to = cc::Uint32Array();
                break;
            case se::Object::TypedArrayType::UINT8:
                *to = cc::Uint8Array();
                break;
            case se::Object::TypedArrayType::INT32:
                *to = cc::Int32Array();
                break;
            case se::Object::TypedArrayType::INT16:
                *to = cc::Int16Array();
                break;
            case se::Object::TypedArrayType::INT8:
                *to = cc::Int8Array();
                break;
            case se::Object::TypedArrayType::FLOAT64:
                *to = cc::Float64Array();
                break;
            default:
                CC_ABORT();
        }
    }

    ccstd::visit(cc::overloaded{
                     [&](auto &typedArray) {
                         typedArray.setJSTypedArray(from.toObject());
                     },
                     [](ccstd::monostate & /*unused*/) {}},
                 *to);
    return true;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool sevalue_to_native(const se::Value &from, cc::IBArray *to, se::Object * /*ctx*/) {
    ccstd::visit(cc::overloaded{
                     [&](auto &typedArray) {
                         typedArray.setJSTypedArray(from.toObject());
                     },
                     [](ccstd::monostate & /*unused*/) {}},
                 *to);

    return true;
}

#if CC_USE_SPINE

// NOLINTNEXTLINE(readability-identifier-naming)
bool sevalue_to_native(const se::Value &val, spine::String *obj, se::Object * /*unused*/) {
    *obj = val.toString().data();
    return true;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool sevalue_to_native(const se::Value &v, spine::Vector<spine::String> *ret, se::Object * /*unused*/) {
    CC_ASSERT(v.isObject());
    se::Object *obj = v.toObject();
    CC_ASSERT(obj->isArray());

    bool ok = true;
    uint32_t len = 0;
    ok = obj->getArrayLength(&len);
    if (!ok) {
        ret->clear();
        return false;
    }

    se::Value tmp;
    for (uint32_t i = 0; i < len; ++i) {
        ok = obj->getArrayElement(i, &tmp);
        if (!ok || !tmp.isObject()) {
            ret->clear();
            return false;
        }

        const char *str = tmp.toString().c_str();
        ret->add(str);
    }

    return true;
}

bool sevalue_to_native(const se::Value &from, spine::Vector2 *to, se::Object * /*unused*/) {
    SE_PRECONDITION2(from.isObject(), false, "Convert parameter to Vec2 failed!");

    se::Object *obj = from.toObject();
    CHECK_ASSIGN_PRVOBJ_RET(obj, to)
    se::Value tmp;
    set_member_field(obj, to, "x", &spine::Vector2::x, tmp);
    set_member_field(obj, to, "y", &spine::Vector2::y, tmp);
    return true;
}

bool nativevalue_to_se(const spine::Vector2 &from, se::Value &to, se::Object * /*unused*/) {
    se::HandleObject obj(se::Object::createPlainObject());
    obj->setProperty("x", se::Value(from.x));
    obj->setProperty("y", se::Value(from.y));
    to.setObject(obj);
    return true;
}
#endif

// NOLINTNEXTLINE(readability-identifier-naming)
bool sevalue_to_native(const se::Value &v, cc::gfx::AccelerationStructure **ret, se::Object * /*unused*/) {
    // todo
    return true;
}

#if CC_USE_MIDDLEWARE
// NOLINTNEXTLINE(readability-identifier-naming)
bool seval_to_Map_string_key(const se::Value &v, cc::RefMap<ccstd::string, cc::middleware::Texture2D *> *ret) {
    CC_ASSERT_NOT_NULL(ret);
    CC_ASSERT(v.isObject());
    se::Object *obj = v.toObject();

    ccstd::vector<ccstd::string> allKeys;
    bool ok = obj->getAllKeys(&allKeys);
    if (!ok) {
        ret->clear();
        return false;
    }

    se::Value tmp;
    for (const auto &key : allKeys) {
        auto pngPos = key.find(".png");
        if (pngPos == ccstd::string::npos) {
            continue;
        }

        ok = obj->getProperty(key.c_str(), &tmp);
        if (!ok || !tmp.isObject()) {
            ret->clear();
            return false;
        }
        auto *nativeObj = static_cast<cc::middleware::Texture2D *>(tmp.toObject()->getPrivateData());
        ret->insert(key, nativeObj);
    }

    return true;
}

#endif

////////////////////////////////////////////////////////////////////////////
/////////////////nativevalue_to_se//////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////

// native to seval

// NOLINTNEXTLINE(readability-identifier-naming)
bool ccvalue_to_seval(const cc::Value &v, se::Value *ret) { // NOLINT
    return ret ? nativevalue_to_se(v, *ret, nullptr) : false;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool ccvaluemap_to_seval(const cc::ValueMap &v, se::Value *ret) { // NOLINT
    return ret ? nativevalue_to_se(v, *ret, nullptr) : false;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool ccvaluemapintkey_to_seval(const cc::ValueMapIntKey &v, se::Value *ret) { // NOLINT
    CC_ASSERT_NOT_NULL(ret);

    se::HandleObject obj(se::Object::createPlainObject());
    bool ok = true;
    for (const auto &e : v) {
        std::stringstream keyss;
        keyss << e.first;
        ccstd::string key = keyss.str();
        const cc::Value &value = e.second;

        if (key.empty()) {
            continue;
        }

        se::Value tmp;
        if (!ccvalue_to_seval(value, &tmp)) {
            ok = false;
            ret->setUndefined();
            break;
        }

        obj->setProperty(key.c_str(), tmp);
    }
    if (ok) {
        ret->setObject(obj);
    }

    return ok;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool ccvaluevector_to_seval(const cc::ValueVector &v, se::Value *ret) { // NOLINT
    CC_ASSERT_NOT_NULL(ret);
    se::HandleObject obj(se::Object::createArrayObject(v.size()));
    bool ok = true;

    uint32_t i = 0;
    for (const auto &value : v) {
        se::Value tmp;
        if (!ccvalue_to_seval(value, &tmp)) {
            ok = false;
            ret->setUndefined();
            break;
        }

        obj->setArrayElement(i, tmp);
        ++i;
    }
    if (ok) {
        ret->setObject(obj);
    }

    return ok;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool ManifestAsset_to_seval(const cc::extension::ManifestAsset &v, se::Value *ret) {
    return ret ? nativevalue_to_se(v, *ret, nullptr) : false;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool Data_to_seval(const cc::Data &v, se::Value *ret) {
    // NOTICE: should remove this function, kept for backward compatibility
    return Data_to_TypedArray(v, ret);
}

bool Data_to_TypedArray(const cc::Data &v, se::Value *ret) { // NOLINT(readability-identifier-naming)
    // NOTICE: should remove this function, kept for backward compatibility
    CC_ASSERT_NOT_NULL(ret);
    if (v.isNull()) {
        ret->setNull();
    } else {
        se::HandleObject obj(se::Object::createTypedArray(se::Object::TypedArrayType::UINT8, v.getBytes(), v.getSize()));
        ret->setObject(obj, true);
    }
    return true;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool DownloadTask_to_seval(const cc::network::DownloadTask &v, se::Value *ret) {
    return ret ? nativevalue_to_se(v, *ret, nullptr) : false;
}

bool nativevalue_to_se(const cc::network::DownloadTask &from, se::Value &to, se::Object * /*ctx*/) { // NOLINT(readability-identifier-naming)
    se::HandleObject obj(se::Object::createPlainObject());
    obj->setProperty("identifier", se::Value(from.identifier));
    obj->setProperty("requestURL", se::Value(from.requestURL));
    obj->setProperty("storagePath", se::Value(from.storagePath));
    to.setObject(obj);
    return true;
}

#if CC_USE_SPINE
// NOLINTNEXTLINE(readability-identifier-naming)
bool nativevalue_to_se(const spine::String &obj, se::Value &val, se::Object * /*unused*/) {
    val.setString(obj.buffer());
    return true;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool nativevalue_to_se(const spine::Vector<spine::String> &v, se::Value &ret, se::Object * /*unused*/) {
    se::HandleObject obj(se::Object::createArrayObject(v.size()));
    bool ok = true;

    spine::Vector<spine::String> tmpv = v;
    for (uint32_t i = 0, count = static_cast<uint32_t>(tmpv.size()); i < count; i++) {
        if (!obj->setArrayElement(i, se::Value(tmpv[i].buffer()))) {
            ok = false;
            ret.setUndefined();
            break;
        }
    }

    if (ok) {
        ret.setObject(obj);
    }

    return ok;
}
#endif

////////////////// custom types

// NOLINTNEXTLINE(readability-identifier-naming)
bool nativevalue_to_se(const cc::Data &from, se::Value &to, se::Object * /*unused*/) {
    se::HandleObject buffer{se::Object::createArrayBufferObject(from.getBytes(), from.getSize())};
    to.setObject(buffer);
    return true;
}

// NOLINTNEXTLINE
bool nativevalue_to_se(const cc::Value &from, se::Value &to, se::Object * /*unused*/) {
    bool ok = true;
    switch (from.getType()) {
        case cc::Value::Type::NONE:
            to.setNull();
            break;
        case cc::Value::Type::UNSIGNED:
            to.setUint32(from.asUnsignedInt());
            break;
        case cc::Value::Type::BOOLEAN:
            to.setBoolean(from.asBool());
            break;
        case cc::Value::Type::FLOAT:
        case cc::Value::Type::DOUBLE:
            to.setDouble(from.asDouble());
            break;
        case cc::Value::Type::INTEGER:
            to.setInt32(from.asInt());
            break;
        case cc::Value::Type::STRING:
            to.setString(from.asString());
            break;
        case cc::Value::Type::VECTOR:
            ok = nativevalue_to_se(from.asValueVector(), to, nullptr);
            break;
        case cc::Value::Type::MAP:
            ok = nativevalue_to_se(from.asValueMap(), to, nullptr);
            break;
        case cc::Value::Type::INT_KEY_MAP:
            ok = nativevalue_to_se(from.asIntKeyMap(), to, nullptr);
            break;
        default:
            SE_LOGE("Could not the way to convert cc::Value::Type (%d) type!", (int)from.getType());
            ok = false;
            break;
    }
    return ok;
}

// NOLINTNEXTLINE
bool nativevalue_to_se(const ccstd::unordered_map<ccstd::string, cc::Value> &from, se::Value &to, se::Object * /*unused*/) {
    se::HandleObject obj(se::Object::createPlainObject());
    bool ok = true;
    for (const auto &e : from) {
        const ccstd::string &key = e.first;
        const cc::Value &value = e.second;

        if (key.empty()) {
            continue;
        }

        se::Value tmp;
        if (!nativevalue_to_se(value, tmp, nullptr)) {
            ok = false;
            to.setUndefined();
            break;
        }

        obj->setProperty(key.c_str(), tmp);
    }
    if (ok) {
        to.setObject(obj);
    }

    return ok;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool nativevalue_to_se(const cc::Size &from, se::Value &to, se::Object * /*unused*/) {
    se::HandleObject obj(se::Object::createPlainObject());
    obj->setProperty("width", se::Value(from.width));
    obj->setProperty("height", se::Value(from.height));
    obj->setProperty("type", se::Value(static_cast<uint32_t>(MathType::SIZE)));
    to.setObject(obj);
    return true;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool nativevalue_to_se(const cc::extension::ManifestAsset &from, se::Value &to, se::Object * /*unused*/) {
    se::HandleObject obj(se::Object::createPlainObject());
    obj->setProperty("md5", se::Value(from.md5));
    obj->setProperty("path", se::Value(from.path));
    obj->setProperty("compressed", se::Value(from.compressed));
    obj->setProperty("size", se::Value(from.size));
    obj->setProperty("downloadState", se::Value(from.downloadState));
    to.setObject(obj);
    return true;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool nativevalue_to_se(const cc::Rect &from, se::Value &to, se::Object * /*unused*/) {
    se::HandleObject obj(se::Object::createPlainObject());
    obj->setProperty("x", se::Value(from.x));
    obj->setProperty("y", se::Value(from.y));
    obj->setProperty("width", se::Value(from.width));
    obj->setProperty("height", se::Value(from.height));
    obj->setProperty("type", se::Value(static_cast<uint32_t>(MathType::RECT)));
    to.setObject(obj);
    return true;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool nativevalue_to_se(const cc::gfx::Rect &from, se::Value &to, se::Object * /*unused*/) {
    se::HandleObject obj(se::Object::createPlainObject());
    obj->setProperty("x", se::Value(from.x));
    obj->setProperty("y", se::Value(from.y));
    obj->setProperty("width", se::Value(from.width));
    obj->setProperty("height", se::Value(from.height));
    to.setObject(obj);
    return true;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool nativevalue_to_se(const cc::gfx::FormatInfo *from, se::Value &to, se::Object * /*unused*/) {
    se::HandleObject obj(se::Object::createPlainObject());
    if (from) {
        obj->setProperty("name", se::Value(from->name));
        obj->setProperty("size", se::Value(from->size));
        obj->setProperty("count", se::Value(from->count));
        obj->setProperty("type", se::Value(static_cast<int>(from->type)));
        obj->setProperty("hasAlpha", se::Value(from->hasAlpha));
        obj->setProperty("hasDepth", se::Value(from->hasDepth));
        obj->setProperty("hasStencil", se::Value(from->hasStencil));
        obj->setProperty("isCompressed", se::Value(from->isCompressed));
        to.setObject(obj);
    } else {
        to.setNull();
    }
    return true;
}

// NOLINTNEXTLINE(readability-identifier-naming)
bool nativevalue_to_se(const cc::ArrayBuffer &arrayBuffer, se::Value &to, se::Object * /*ctx*/) {
    to.setObject(arrayBuffer.getJSArrayBuffer());
    return true;
}

//// NOLINTNEXTLINE(readability-identifier-naming)
// bool nativevalue_to_se(const cc::TypedArray &from, se::Value &to, se::Object * /*ctx*/) {
//     std::visit([&](auto &typedArray) {
//         to.setObject(typedArray.getJSTypedArray());
//     },
//                from);
//     return true;
// }

// NOLINTNEXTLINE(readability-identifier-naming)
bool nativevalue_to_se(const cc::NativeDep &from, se::Value &to, se::Object * /*ctx*/) {
    se::HandleObject obj(se::Object::createPlainObject());
    obj->setProperty("uuid", se::Value(from.uuid));
    obj->setProperty("ext", se::Value(from.ext));
    obj->setProperty("__isNative__", se::Value(from.__isNative__));
    to.setObject(obj);
    return true;
}

#if CC_USE_PHYSICS_PHYSX

bool nativevalue_to_se(const ccstd::vector<std::shared_ptr<cc::physics::TriggerEventPair>> &from, se::Value &to, se::Object * /*ctx*/) {
    se::HandleObject array(se::Object::createArrayObject(from.size() * cc::physics::TriggerEventPair::COUNT));
    for (size_t i = 0; i < from.size(); i++) {
        auto t = i * cc::physics::TriggerEventPair::COUNT;
        array->setArrayElement(static_cast<uint>(t + 0), se::Value(from[i]->shapeA));
        array->setArrayElement(static_cast<uint>(t + 1), se::Value(from[i]->shapeB));
        array->setArrayElement(static_cast<uint>(t + 2), se::Value(static_cast<uint8_t>(from[i]->state)));
    }
    to.setObject(array);
    return true;
}

bool nativevalue_to_se(const ccstd::vector<cc::physics::ContactPoint> &from, se::Value &to, se::Object * /*ctx*/) {
    const auto contactCount = from.size();
    se::HandleObject array(se::Object::createArrayObject(contactCount));
    for (size_t i = 0; i < contactCount; i++) {
        auto t = i * cc::physics::ContactPoint::COUNT;
        uint32_t j = 0;
        array->setArrayElement(static_cast<uint>(t + j++), se::Value(from[i].position.x));
        array->setArrayElement(static_cast<uint>(t + j++), se::Value(from[i].position.y));
        array->setArrayElement(static_cast<uint>(t + j++), se::Value(from[i].position.z));
        array->setArrayElement(static_cast<uint>(t + j++), se::Value(from[i].normal.x));
        array->setArrayElement(static_cast<uint>(t + j++), se::Value(from[i].normal.y));
        array->setArrayElement(static_cast<uint>(t + j++), se::Value(from[i].normal.z));
        array->setArrayElement(static_cast<uint>(t + j++), se::Value(from[i].impulse.x));
        array->setArrayElement(static_cast<uint>(t + j++), se::Value(from[i].impulse.y));
        array->setArrayElement(static_cast<uint>(t + j++), se::Value(from[i].impulse.z));
        array->setArrayElement(static_cast<uint>(t + j++), se::Value(from[i].separation));
        array->setArrayElement(static_cast<uint>(t + j++), se::Value(from[i].internalFaceIndex0));
        array->setArrayElement(static_cast<uint>(t + j++), se::Value(from[i].internalFaceIndex1));
    }
    to.setObject(array);
    return true;
}

bool nativevalue_to_se(const ccstd::vector<std::shared_ptr<cc::physics::ContactEventPair>> &from, se::Value &to, se::Object *ctx) {
    se::HandleObject array(se::Object::createArrayObject(from.size() * cc::physics::ContactEventPair::COUNT));
    for (size_t i = 0; i < from.size(); i++) {
        auto t = i * cc::physics::ContactEventPair::COUNT;
        array->setArrayElement(static_cast<uint>(t + 0), se::Value(from[i]->shapeA));
        array->setArrayElement(static_cast<uint>(t + 1), se::Value(from[i]->shapeB));
        array->setArrayElement(static_cast<uint>(t + 2), se::Value(static_cast<uint8_t>(from[i]->state)));
        array->setArrayElement(static_cast<uint>(t + 3), [&]() -> se::Value {
            auto obj = se::Value();
            nativevalue_to_se(from[i]->contacts, obj, ctx);
            return obj;
        }());
    }
    to.setObject(array);
    return true;
}

bool nativevalue_to_se(const ccstd::vector<cc::physics::CharacterControllerContact> &from, se::Value &to, se::Object * /*ctx*/) {
    const auto contactCount = from.size();
    se::HandleObject array(se::Object::createArrayObject(contactCount));
    for (size_t i = 0; i < contactCount; i++) {
        auto t = i * cc::physics::CharacterControllerContact::COUNT;
        uint32_t j = 0;
        array->setArrayElement(static_cast<uint>(t + j++), se::Value(from[i].worldPosition.x));
        array->setArrayElement(static_cast<uint>(t + j++), se::Value(from[i].worldPosition.y));
        array->setArrayElement(static_cast<uint>(t + j++), se::Value(from[i].worldPosition.z));
        array->setArrayElement(static_cast<uint>(t + j++), se::Value(from[i].worldNormal.x));
        array->setArrayElement(static_cast<uint>(t + j++), se::Value(from[i].worldNormal.y));
        array->setArrayElement(static_cast<uint>(t + j++), se::Value(from[i].worldNormal.z));
        array->setArrayElement(static_cast<uint>(t + j++), se::Value(from[i].motionDirection.x));
        array->setArrayElement(static_cast<uint>(t + j++), se::Value(from[i].motionDirection.y));
        array->setArrayElement(static_cast<uint>(t + j++), se::Value(from[i].motionDirection.z));
        array->setArrayElement(static_cast<uint>(t + j++), se::Value(from[i].motionLength));
    }
    to.setObject(array);
    return true;
}

bool nativevalue_to_se(const ccstd::vector<std::shared_ptr<cc::physics::CCTShapeEventPair>> &from, se::Value &to, se::Object *ctx) {
    se::HandleObject array(se::Object::createArrayObject(from.size() * cc::physics::CCTShapeEventPair::COUNT));
    for (size_t i = 0; i < from.size(); i++) {
        auto t = i * cc::physics::CCTShapeEventPair::COUNT;
        array->setArrayElement(static_cast<uint>(t + 0), se::Value(from[i]->cct));
        array->setArrayElement(static_cast<uint>(t + 1), se::Value(from[i]->shape));
        //array->setArrayElement(static_cast<uint>(t + 2), se::Value(static_cast<uint8_t>(from[i]->state)));
        array->setArrayElement(static_cast<uint>(t + 2), [&]() -> se::Value {
            auto obj = se::Value();
            nativevalue_to_se(from[i]->contacts, obj, ctx);
            return obj;
        }());
    }
    to.setObject(array);
    return true;
}

bool nativevalue_to_se(const ccstd::vector<std::shared_ptr<cc::physics::CCTTriggerEventPair>> &from, se::Value &to, se::Object * /*ctx*/) {
    se::HandleObject array(se::Object::createArrayObject(from.size() * cc::physics::CCTTriggerEventPair::COUNT));
    for (size_t i = 0; i < from.size(); i++) {
        auto t = i * cc::physics::CCTTriggerEventPair::COUNT;
        array->setArrayElement(static_cast<uint>(t + 0), se::Value(from[i]->cct));
        array->setArrayElement(static_cast<uint>(t + 1), se::Value(from[i]->shape));
        array->setArrayElement(static_cast<uint>(t + 2), se::Value(static_cast<uint8_t>(from[i]->state)));
    }
    to.setObject(array);
    return true;
}

bool nativevalue_to_se(const cc::physics::RaycastResult &from, se::Value &to, se::Object *ctx) {
    se::HandleObject obj(se::Object::createPlainObject());
    obj->setProperty("shape", se::Value(from.shape));
    obj->setProperty("distance", se::Value(from.distance));

    se::Value tmp;
    if (nativevalue_to_se(from.hitPoint, tmp, ctx)) obj->setProperty("hitPoint", tmp);
    if (nativevalue_to_se(from.hitNormal, tmp, ctx)) obj->setProperty("hitNormal", tmp);
    to.setObject(obj);
    return true;
}

bool sevalue_to_native(const se::Value &from, cc::physics::ConvexDesc *to, se::Object *ctx) {
    CC_ASSERT(from.isObject());
    se::Object *json = from.toObject();
    auto *data = static_cast<cc::physics::ConvexDesc *>(json->getPrivateData());
    if (data) {
        *to = *data;
        return true;
    }

    se::Value field;
    bool ok = true;

    json->getProperty("positionLength", &field);
    if (!field.isNullOrUndefined()) ok &= sevalue_to_native(field, &to->positionLength, ctx);

    CC_UNUSED size_t dataLength = 0;
    json->getProperty("positions", &field);
    if (!field.isNullOrUndefined()) {
        se::Object *obj = field.toObject();
        if (obj->isArrayBuffer()) {
            ok &= obj->getArrayBufferData(reinterpret_cast<uint8_t **>(&to->positions), &dataLength);
            SE_PRECONDITION2(ok, false, "getArrayBufferData failed!");
        } else if (obj->isTypedArray()) {
            ok &= obj->getTypedArrayData(reinterpret_cast<uint8_t **>(&to->positions), &dataLength);
            SE_PRECONDITION2(ok, false, "getTypedArrayData failed!");
        } else {
            ok &= false;
        }
    }
    return ok;
}

bool sevalue_to_native(const se::Value &from, cc::physics::TrimeshDesc *to, se::Object *ctx) {
    if (!sevalue_to_native(from, reinterpret_cast<cc::physics::ConvexDesc *>(to), ctx)) {
        return false;
    }

    CC_ASSERT(from.isObject());
    se::Object *json = from.toObject();
    auto *data = static_cast<cc::physics::TrimeshDesc *>(json->getPrivateData());
    if (data) {
        *to = *data;
        return true;
    }
    se::Value field;
    bool ok = true;

    json->getProperty("triangleLength", &field);
    if (!field.isNullOrUndefined()) ok &= sevalue_to_native(field, &(to->triangleLength), ctx);

    json->getProperty("isU16", &field);
    if (!field.isNullOrUndefined()) ok &= sevalue_to_native(field, &(to->isU16), ctx);

    CC_UNUSED size_t dataLength = 0;
    json->getProperty("triangles", &field);
    if (!field.isNullOrUndefined()) {
        se::Object *obj = field.toObject();
        if (obj->isArrayBuffer()) {
            ok &= obj->getArrayBufferData(reinterpret_cast<uint8_t **>(&to->triangles), &dataLength);
            SE_PRECONDITION2(ok, false, "getArrayBufferData failed!");
        } else if (obj->isTypedArray()) {
            ok &= obj->getTypedArrayData(reinterpret_cast<uint8_t **>(&to->triangles), &dataLength);
            SE_PRECONDITION2(ok, false, "getTypedArrayData failed!");
        } else {
            ok &= false;
        }
    }

    return ok;
}

bool sevalue_to_native(const se::Value &from, cc::physics::HeightFieldDesc *to, se::Object *ctx) {
    CC_ASSERT(from.isObject());
    se::Object *json = from.toObject();
    auto *data = static_cast<cc::physics::HeightFieldDesc *>(json->getPrivateData());
    if (data) {
        *to = *data;
        return true;
    }

    se::Value field;
    bool ok = true;

    json->getProperty("rows", &field);
    if (!field.isNullOrUndefined()) ok &= sevalue_to_native(field, &to->rows, ctx);

    json->getProperty("columns", &field);
    if (!field.isNullOrUndefined()) ok &= sevalue_to_native(field, &to->columns, ctx);

    CC_UNUSED size_t dataLength = 0;
    json->getProperty("samples", &field);
    if (!field.isNullOrUndefined()) {
        se::Object *obj = field.toObject();
        if (obj->isArrayBuffer()) {
            ok &= obj->getArrayBufferData(reinterpret_cast<uint8_t **>(&to->samples), &dataLength);
            SE_PRECONDITION2(ok, false, "getArrayBufferData failed!");
        } else if (obj->isTypedArray()) {
            ok &= obj->getTypedArrayData(reinterpret_cast<uint8_t **>(&to->samples), &dataLength);
            SE_PRECONDITION2(ok, false, "getTypedArrayData failed!");
        } else {
            ok &= false;
        }
    }
    return ok;
}

bool sevalue_to_native(const se::Value &from, cc::physics::RaycastOptions *to, se::Object *ctx) {
    CC_ASSERT(from.isObject());
    se::Object *json = from.toObject();
    auto *data = static_cast<cc::physics::RaycastOptions *>(json->getPrivateData());
    if (data) {
        *to = *data;
        return true;
    }

    se::Value field;
    bool ok = true;

    json->getProperty("origin", &field);
    if (!field.isNullOrUndefined()) ok &= sevalue_to_native(field, &to->origin, ctx);

    json->getProperty("unitDir", &field);
    if (!field.isNullOrUndefined()) ok &= sevalue_to_native(field, &to->unitDir, ctx);

    json->getProperty("mask", &field);
    if (!field.isNullOrUndefined()) ok &= sevalue_to_native(field, &to->mask, ctx);

    json->getProperty("distance", &field);
    if (!field.isNullOrUndefined()) ok &= sevalue_to_native(field, &to->distance, ctx);

    json->getProperty("queryTrigger", &field);
    if (!field.isNullOrUndefined()) ok &= sevalue_to_native(field, &to->queryTrigger, ctx);

    return ok;
}

#endif // CC_USE_PHYSICS_PHYSX
