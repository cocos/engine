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
#pragma once
// clang-format off
#include "cocos/base/std/hash/hash.h"

namespace cc {

namespace render {

enum class UpdateFrequency;
enum class ParameterType;

struct RasterPassTag;
struct RasterSubpassTag;
struct ComputeSubpassTag;
struct ComputeTag;
struct ResolveTag;
struct CopyTag;
struct MoveTag;
struct RaytraceTag;

enum class ResourceResidency;
enum class QueueHint;
enum class ResourceDimension;
enum class ViewDimension;
enum class ResourceFlags : uint32_t;

struct BufferTag;
struct TextureTag;

enum class TaskType;
enum class SceneFlags : uint32_t;
enum class LightingMode : uint32_t;
enum class AttachmentType;
enum class AccessType;
enum class ClearValueType;

struct LightInfo;

enum class ResolveFlags : uint32_t;

struct ResolvePair;
struct CopyPair;
struct UploadPair;
struct MovePair;
struct PipelineStatistics;

} // namespace render

} // namespace cc

namespace ccstd {

template <>
struct hash<cc::render::ResolvePair> {
    hash_t operator()(const cc::render::ResolvePair& val) const noexcept;
};

} // namespace ccstd

// clang-format on
