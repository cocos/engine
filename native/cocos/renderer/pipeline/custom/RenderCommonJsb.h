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
#pragma once
#include "cocos/bindings/manual/jsb_conversions.h"
#include "cocos/renderer/pipeline/custom/RenderCommonFwd.h"

bool nativevalue_to_se(const cc::render::LightInfo &from, se::Value &to, se::Object *ctx); // NOLINT

bool nativevalue_to_se(const cc::render::ResolvePair &from, se::Value &to, se::Object *ctx); // NOLINT

bool nativevalue_to_se(const cc::render::CopyPair &from, se::Value &to, se::Object *ctx); // NOLINT

bool nativevalue_to_se(const cc::render::UploadPair &from, se::Value &to, se::Object *ctx); // NOLINT

bool nativevalue_to_se(const cc::render::MovePair &from, se::Value &to, se::Object *ctx); // NOLINT

// if function overload is used, android build fails
template <>
bool sevalue_to_native(const se::Value &from, cc::render::LightInfo *to, se::Object *ctx); // NOLINT

template <>
bool sevalue_to_native(const se::Value &from, cc::render::ResolvePair *to, se::Object *ctx); // NOLINT

template <>
bool sevalue_to_native(const se::Value &from, cc::render::CopyPair *to, se::Object *ctx); // NOLINT

template <>
bool sevalue_to_native(const se::Value &from, cc::render::UploadPair *to, se::Object *ctx); // NOLINT

template <>
bool sevalue_to_native(const se::Value &from, cc::render::MovePair *to, se::Object *ctx); // NOLINT

// clang-format on
