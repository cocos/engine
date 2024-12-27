/*
 Copyright (c) 2021-2024 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com

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
*/

/**
 * ========================= !DO NOT CHANGE THE FOLLOWING SECTION MANUALLY! =========================
 * The following section is auto-generated.
 * ========================= !DO NOT CHANGE THE FOLLOWING SECTION MANUALLY! =========================
 */
// clang-format off
#include "cocos/bindings/auto/jsb_gfx_auto.h"
#include "cocos/bindings/auto/jsb_scene_auto.h"
#include "cocos/renderer/pipeline/custom/RenderCommonJsb.h"
#include "cocos/renderer/pipeline/custom/RenderCommonTypes.h"
#include "cocos/renderer/pipeline/custom/details/JsbConversion.h"

bool nativevalue_to_se(const cc::render::LightInfo &from, se::Value &to, se::Object *ctx) { // NOLINT
    se::HandleObject obj(se::Object::createPlainObject());
    se::Value        tmp;

    nativevalue_to_se(from.light, tmp, ctx);
    obj->setProperty("light", tmp);

    nativevalue_to_se(from.probe, tmp, ctx);
    obj->setProperty("probe", tmp);

    nativevalue_to_se(from.level, tmp, ctx);
    obj->setProperty("level", tmp);

    nativevalue_to_se(from.culledByLight, tmp, ctx);
    obj->setProperty("culledByLight", tmp);

    to.setObject(obj);
    return true;
}

bool nativevalue_to_se(const cc::render::Descriptor &from, se::Value &to, se::Object *ctx) { // NOLINT
    se::HandleObject obj(se::Object::createPlainObject());
    se::Value        tmp;

    nativevalue_to_se(from.type, tmp, ctx);
    obj->setProperty("type", tmp);

    nativevalue_to_se(from.count, tmp, ctx);
    obj->setProperty("count", tmp);

    to.setObject(obj);
    return true;
}

bool nativevalue_to_se(const cc::render::DescriptorBlockFlattened &from, se::Value &to, se::Object *ctx) { // NOLINT
    se::HandleObject obj(se::Object::createPlainObject());
    se::Value        tmp;

    nativevalue_to_se(from.descriptorNames, tmp, ctx);
    obj->setProperty("descriptorNames", tmp);

    nativevalue_to_se(from.uniformBlockNames, tmp, ctx);
    obj->setProperty("uniformBlockNames", tmp);

    nativevalue_to_se(from.descriptors, tmp, ctx);
    obj->setProperty("descriptors", tmp);

    nativevalue_to_se(from.uniformBlocks, tmp, ctx);
    obj->setProperty("uniformBlocks", tmp);

    nativevalue_to_se(from.capacity, tmp, ctx);
    obj->setProperty("capacity", tmp);

    nativevalue_to_se(from.count, tmp, ctx);
    obj->setProperty("count", tmp);

    to.setObject(obj);
    return true;
}

bool nativevalue_to_se(const cc::render::DescriptorBlockIndex &from, se::Value &to, se::Object *ctx) { // NOLINT
    se::HandleObject obj(se::Object::createPlainObject());
    se::Value        tmp;

    nativevalue_to_se(from.updateFrequency, tmp, ctx);
    obj->setProperty("updateFrequency", tmp);

    nativevalue_to_se(from.parameterType, tmp, ctx);
    obj->setProperty("parameterType", tmp);

    nativevalue_to_se(from.descriptorType, tmp, ctx);
    obj->setProperty("descriptorType", tmp);

    nativevalue_to_se(from.visibility, tmp, ctx);
    obj->setProperty("visibility", tmp);

    to.setObject(obj);
    return true;
}

bool nativevalue_to_se(const cc::render::DescriptorGroupBlockIndex &from, se::Value &to, se::Object *ctx) { // NOLINT
    se::HandleObject obj(se::Object::createPlainObject());
    se::Value        tmp;

    nativevalue_to_se(from.updateFrequency, tmp, ctx);
    obj->setProperty("updateFrequency", tmp);

    nativevalue_to_se(from.parameterType, tmp, ctx);
    obj->setProperty("parameterType", tmp);

    nativevalue_to_se(from.descriptorType, tmp, ctx);
    obj->setProperty("descriptorType", tmp);

    nativevalue_to_se(from.visibility, tmp, ctx);
    obj->setProperty("visibility", tmp);

    nativevalue_to_se(from.accessType, tmp, ctx);
    obj->setProperty("accessType", tmp);

    nativevalue_to_se(from.viewDimension, tmp, ctx);
    obj->setProperty("viewDimension", tmp);

    nativevalue_to_se(from.format, tmp, ctx);
    obj->setProperty("format", tmp);

    to.setObject(obj);
    return true;
}

bool nativevalue_to_se(const cc::render::ResolvePair &from, se::Value &to, se::Object *ctx) { // NOLINT
    se::HandleObject obj(se::Object::createPlainObject());
    se::Value        tmp;

    nativevalue_to_se(from.source, tmp, ctx);
    obj->setProperty("source", tmp);

    nativevalue_to_se(from.target, tmp, ctx);
    obj->setProperty("target", tmp);

    nativevalue_to_se(from.resolveFlags, tmp, ctx);
    obj->setProperty("resolveFlags", tmp);

    nativevalue_to_se(from.mode, tmp, ctx);
    obj->setProperty("mode", tmp);

    nativevalue_to_se(from.mode1, tmp, ctx);
    obj->setProperty("mode1", tmp);

    to.setObject(obj);
    return true;
}

bool nativevalue_to_se(const cc::render::CopyPair &from, se::Value &to, se::Object *ctx) { // NOLINT
    se::HandleObject obj(se::Object::createPlainObject());
    se::Value        tmp;

    nativevalue_to_se(from.source, tmp, ctx);
    obj->setProperty("source", tmp);

    nativevalue_to_se(from.target, tmp, ctx);
    obj->setProperty("target", tmp);

    nativevalue_to_se(from.mipLevels, tmp, ctx);
    obj->setProperty("mipLevels", tmp);

    nativevalue_to_se(from.numSlices, tmp, ctx);
    obj->setProperty("numSlices", tmp);

    nativevalue_to_se(from.sourceMostDetailedMip, tmp, ctx);
    obj->setProperty("sourceMostDetailedMip", tmp);

    nativevalue_to_se(from.sourceFirstSlice, tmp, ctx);
    obj->setProperty("sourceFirstSlice", tmp);

    nativevalue_to_se(from.sourcePlaneSlice, tmp, ctx);
    obj->setProperty("sourcePlaneSlice", tmp);

    nativevalue_to_se(from.targetMostDetailedMip, tmp, ctx);
    obj->setProperty("targetMostDetailedMip", tmp);

    nativevalue_to_se(from.targetFirstSlice, tmp, ctx);
    obj->setProperty("targetFirstSlice", tmp);

    nativevalue_to_se(from.targetPlaneSlice, tmp, ctx);
    obj->setProperty("targetPlaneSlice", tmp);

    to.setObject(obj);
    return true;
}

bool nativevalue_to_se(const cc::render::UploadPair &from, se::Value &to, se::Object *ctx) { // NOLINT
    se::HandleObject obj(se::Object::createPlainObject());
    se::Value        tmp;

    nativevalue_to_se(from.source, tmp, ctx);
    obj->setProperty("source", tmp);

    nativevalue_to_se(from.target, tmp, ctx);
    obj->setProperty("target", tmp);

    nativevalue_to_se(from.mipLevels, tmp, ctx);
    obj->setProperty("mipLevels", tmp);

    nativevalue_to_se(from.numSlices, tmp, ctx);
    obj->setProperty("numSlices", tmp);

    nativevalue_to_se(from.targetMostDetailedMip, tmp, ctx);
    obj->setProperty("targetMostDetailedMip", tmp);

    nativevalue_to_se(from.targetFirstSlice, tmp, ctx);
    obj->setProperty("targetFirstSlice", tmp);

    nativevalue_to_se(from.targetPlaneSlice, tmp, ctx);
    obj->setProperty("targetPlaneSlice", tmp);

    to.setObject(obj);
    return true;
}

bool nativevalue_to_se(const cc::render::MovePair &from, se::Value &to, se::Object *ctx) { // NOLINT
    se::HandleObject obj(se::Object::createPlainObject());
    se::Value        tmp;

    nativevalue_to_se(from.source, tmp, ctx);
    obj->setProperty("source", tmp);

    nativevalue_to_se(from.target, tmp, ctx);
    obj->setProperty("target", tmp);

    nativevalue_to_se(from.mipLevels, tmp, ctx);
    obj->setProperty("mipLevels", tmp);

    nativevalue_to_se(from.numSlices, tmp, ctx);
    obj->setProperty("numSlices", tmp);

    nativevalue_to_se(from.targetMostDetailedMip, tmp, ctx);
    obj->setProperty("targetMostDetailedMip", tmp);

    nativevalue_to_se(from.targetFirstSlice, tmp, ctx);
    obj->setProperty("targetFirstSlice", tmp);

    nativevalue_to_se(from.targetPlaneSlice, tmp, ctx);
    obj->setProperty("targetPlaneSlice", tmp);

    to.setObject(obj);
    return true;
}

template <>
bool sevalue_to_native<cc::render::LightInfo>(const se::Value &from, cc::render::LightInfo *to, se::Object *ctx) { // NOLINT
    SE_PRECONDITION2(from.isObject(), false, " Convert parameter to LightInfo failed !");

    auto *obj = const_cast<se::Object *>(from.toObject());
    bool ok = true;
    se::Value field;
    obj->getProperty("light", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->light), ctx);
    }
    obj->getProperty("probe", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->probe), ctx);
    }
    obj->getProperty("level", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->level), ctx);
    }
    obj->getProperty("culledByLight", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->culledByLight), ctx);
    }
    return ok;
}

template <>
bool sevalue_to_native<cc::render::Descriptor>(const se::Value &from, cc::render::Descriptor *to, se::Object *ctx) { // NOLINT
    SE_PRECONDITION2(from.isObject(), false, " Convert parameter to Descriptor failed !");

    auto *obj = const_cast<se::Object *>(from.toObject());
    bool ok = true;
    se::Value field;
    obj->getProperty("type", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->type), ctx);
    }
    obj->getProperty("count", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->count), ctx);
    }
    return ok;
}

template <>
bool sevalue_to_native<cc::render::DescriptorBlockFlattened>(const se::Value &from, cc::render::DescriptorBlockFlattened *to, se::Object *ctx) { // NOLINT
    SE_PRECONDITION2(from.isObject(), false, " Convert parameter to DescriptorBlockFlattened failed !");

    auto *obj = const_cast<se::Object *>(from.toObject());
    bool ok = true;
    se::Value field;
    obj->getProperty("descriptorNames", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->descriptorNames), ctx);
    }
    obj->getProperty("uniformBlockNames", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->uniformBlockNames), ctx);
    }
    obj->getProperty("descriptors", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->descriptors), ctx);
    }
    obj->getProperty("uniformBlocks", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->uniformBlocks), ctx);
    }
    obj->getProperty("capacity", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->capacity), ctx);
    }
    obj->getProperty("count", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->count), ctx);
    }
    return ok;
}

template <>
bool sevalue_to_native<cc::render::DescriptorBlockIndex>(const se::Value &from, cc::render::DescriptorBlockIndex *to, se::Object *ctx) { // NOLINT
    SE_PRECONDITION2(from.isObject(), false, " Convert parameter to DescriptorBlockIndex failed !");

    auto *obj = const_cast<se::Object *>(from.toObject());
    bool ok = true;
    se::Value field;
    obj->getProperty("updateFrequency", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->updateFrequency), ctx);
    }
    obj->getProperty("parameterType", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->parameterType), ctx);
    }
    obj->getProperty("descriptorType", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->descriptorType), ctx);
    }
    obj->getProperty("visibility", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->visibility), ctx);
    }
    return ok;
}

template <>
bool sevalue_to_native<cc::render::DescriptorGroupBlockIndex>(const se::Value &from, cc::render::DescriptorGroupBlockIndex *to, se::Object *ctx) { // NOLINT
    SE_PRECONDITION2(from.isObject(), false, " Convert parameter to DescriptorGroupBlockIndex failed !");

    auto *obj = const_cast<se::Object *>(from.toObject());
    bool ok = true;
    se::Value field;
    obj->getProperty("updateFrequency", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->updateFrequency), ctx);
    }
    obj->getProperty("parameterType", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->parameterType), ctx);
    }
    obj->getProperty("descriptorType", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->descriptorType), ctx);
    }
    obj->getProperty("visibility", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->visibility), ctx);
    }
    obj->getProperty("accessType", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->accessType), ctx);
    }
    obj->getProperty("viewDimension", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->viewDimension), ctx);
    }
    obj->getProperty("format", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->format), ctx);
    }
    return ok;
}

template <>
bool sevalue_to_native<cc::render::ResolvePair>(const se::Value &from, cc::render::ResolvePair *to, se::Object *ctx) { // NOLINT
    SE_PRECONDITION2(from.isObject(), false, " Convert parameter to ResolvePair failed !");

    auto *obj = const_cast<se::Object *>(from.toObject());
    bool ok = true;
    se::Value field;
    obj->getProperty("source", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->source), ctx);
    }
    obj->getProperty("target", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->target), ctx);
    }
    obj->getProperty("resolveFlags", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->resolveFlags), ctx);
    }
    obj->getProperty("mode", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->mode), ctx);
    }
    obj->getProperty("mode1", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->mode1), ctx);
    }
    return ok;
}

template <>
bool sevalue_to_native<cc::render::CopyPair>(const se::Value &from, cc::render::CopyPair *to, se::Object *ctx) { // NOLINT
    SE_PRECONDITION2(from.isObject(), false, " Convert parameter to CopyPair failed !");

    auto *obj = const_cast<se::Object *>(from.toObject());
    bool ok = true;
    se::Value field;
    obj->getProperty("source", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->source), ctx);
    }
    obj->getProperty("target", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->target), ctx);
    }
    obj->getProperty("mipLevels", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->mipLevels), ctx);
    }
    obj->getProperty("numSlices", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->numSlices), ctx);
    }
    obj->getProperty("sourceMostDetailedMip", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->sourceMostDetailedMip), ctx);
    }
    obj->getProperty("sourceFirstSlice", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->sourceFirstSlice), ctx);
    }
    obj->getProperty("sourcePlaneSlice", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->sourcePlaneSlice), ctx);
    }
    obj->getProperty("targetMostDetailedMip", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->targetMostDetailedMip), ctx);
    }
    obj->getProperty("targetFirstSlice", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->targetFirstSlice), ctx);
    }
    obj->getProperty("targetPlaneSlice", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->targetPlaneSlice), ctx);
    }
    return ok;
}

template <>
bool sevalue_to_native<cc::render::UploadPair>(const se::Value &from, cc::render::UploadPair *to, se::Object *ctx) { // NOLINT
    SE_PRECONDITION2(from.isObject(), false, " Convert parameter to UploadPair failed !");

    auto *obj = const_cast<se::Object *>(from.toObject());
    bool ok = true;
    se::Value field;
    obj->getProperty("source", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->source), ctx);
    }
    obj->getProperty("target", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->target), ctx);
    }
    obj->getProperty("mipLevels", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->mipLevels), ctx);
    }
    obj->getProperty("numSlices", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->numSlices), ctx);
    }
    obj->getProperty("targetMostDetailedMip", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->targetMostDetailedMip), ctx);
    }
    obj->getProperty("targetFirstSlice", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->targetFirstSlice), ctx);
    }
    obj->getProperty("targetPlaneSlice", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->targetPlaneSlice), ctx);
    }
    return ok;
}

template <>
bool sevalue_to_native<cc::render::MovePair>(const se::Value &from, cc::render::MovePair *to, se::Object *ctx) { // NOLINT
    SE_PRECONDITION2(from.isObject(), false, " Convert parameter to MovePair failed !");

    auto *obj = const_cast<se::Object *>(from.toObject());
    bool ok = true;
    se::Value field;
    obj->getProperty("source", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->source), ctx);
    }
    obj->getProperty("target", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->target), ctx);
    }
    obj->getProperty("mipLevels", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->mipLevels), ctx);
    }
    obj->getProperty("numSlices", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->numSlices), ctx);
    }
    obj->getProperty("targetMostDetailedMip", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->targetMostDetailedMip), ctx);
    }
    obj->getProperty("targetFirstSlice", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->targetFirstSlice), ctx);
    }
    obj->getProperty("targetPlaneSlice", &field, true);
    if(!field.isNullOrUndefined()) {
        ok &= sevalue_to_native(field, &(to->targetPlaneSlice), ctx);
    }
    return ok;
}

// clang-format on
