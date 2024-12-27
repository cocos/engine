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
#include "cocos/renderer/pipeline/custom/RenderCommonTypes.h"

namespace cc {

namespace render {

inline const char* getName(UpdateFrequency e) noexcept {
    switch (e) {
        case UpdateFrequency::PER_INSTANCE: return "PER_INSTANCE";
        case UpdateFrequency::PER_BATCH: return "PER_BATCH";
        case UpdateFrequency::PER_PHASE: return "PER_PHASE";
        case UpdateFrequency::PER_PASS: return "PER_PASS";
        case UpdateFrequency::COUNT: return "COUNT";
    }
    return "";
}
inline const char* getName(ParameterType e) noexcept {
    switch (e) {
        case ParameterType::CONSTANTS: return "CONSTANTS";
        case ParameterType::CBV: return "CBV";
        case ParameterType::UAV: return "UAV";
        case ParameterType::SRV: return "SRV";
        case ParameterType::TABLE: return "TABLE";
        case ParameterType::SSV: return "SSV";
    }
    return "";
}
inline const char* getName(const RasterPassTag& /*v*/) noexcept { return "RasterPass"; }
inline const char* getName(const RasterSubpassTag& /*v*/) noexcept { return "RasterSubpass"; }
inline const char* getName(const ComputeSubpassTag& /*v*/) noexcept { return "ComputeSubpass"; }
inline const char* getName(const ComputeTag& /*v*/) noexcept { return "Compute"; }
inline const char* getName(const ResolveTag& /*v*/) noexcept { return "Resolve"; }
inline const char* getName(const CopyTag& /*v*/) noexcept { return "Copy"; }
inline const char* getName(const MoveTag& /*v*/) noexcept { return "Move"; }
inline const char* getName(const RaytraceTag& /*v*/) noexcept { return "Raytrace"; }
inline const char* getName(ResourceResidency e) noexcept {
    switch (e) {
        case ResourceResidency::MANAGED: return "MANAGED";
        case ResourceResidency::MEMORYLESS: return "MEMORYLESS";
        case ResourceResidency::PERSISTENT: return "PERSISTENT";
        case ResourceResidency::EXTERNAL: return "EXTERNAL";
        case ResourceResidency::BACKBUFFER: return "BACKBUFFER";
    }
    return "";
}
inline const char* getName(QueueHint e) noexcept {
    switch (e) {
        case QueueHint::NONE: return "NONE";
        case QueueHint::OPAQUE: return "OPAQUE";
        case QueueHint::MASK: return "MASK";
        case QueueHint::BLEND: return "BLEND";
    }
    return "";
}
inline const char* getName(ResourceDimension e) noexcept {
    switch (e) {
        case ResourceDimension::BUFFER: return "BUFFER";
        case ResourceDimension::TEXTURE1D: return "TEXTURE1D";
        case ResourceDimension::TEXTURE2D: return "TEXTURE2D";
        case ResourceDimension::TEXTURE3D: return "TEXTURE3D";
    }
    return "";
}
inline const char* getName(ViewDimension e) noexcept {
    switch (e) {
        case ViewDimension::UNKNOWN: return "UNKNOWN";
        case ViewDimension::BUFFER: return "BUFFER";
        case ViewDimension::TEX1D: return "TEX1D";
        case ViewDimension::TEX1DARRAY: return "TEX1DARRAY";
        case ViewDimension::TEX2D: return "TEX2D";
        case ViewDimension::TEX2DARRAY: return "TEX2DARRAY";
        case ViewDimension::TEX2DMS: return "TEX2DMS";
        case ViewDimension::TEX2DMSARRAY: return "TEX2DMSARRAY";
        case ViewDimension::TEX3D: return "TEX3D";
        case ViewDimension::TEXCUBE: return "TEXCUBE";
        case ViewDimension::TEXCUBEARRAY: return "TEXCUBEARRAY";
        case ViewDimension::RAYTRACING_ACCELERATION_STRUCTURE: return "RAYTRACING_ACCELERATION_STRUCTURE";
    }
    return "";
}
inline const char* getName(const BufferTag& /*v*/) noexcept { return "Buffer"; }
inline const char* getName(const TextureTag& /*v*/) noexcept { return "Texture"; }
inline const char* getName(TaskType e) noexcept {
    switch (e) {
        case TaskType::SYNC: return "SYNC";
        case TaskType::ASYNC: return "ASYNC";
    }
    return "";
}
inline const char* getName(LightingMode e) noexcept {
    switch (e) {
        case LightingMode::NONE: return "NONE";
        case LightingMode::DEFAULT: return "DEFAULT";
        case LightingMode::CLUSTERED: return "CLUSTERED";
    }
    return "";
}
inline const char* getName(AttachmentType e) noexcept {
    switch (e) {
        case AttachmentType::RENDER_TARGET: return "RENDER_TARGET";
        case AttachmentType::DEPTH_STENCIL: return "DEPTH_STENCIL";
        case AttachmentType::SHADING_RATE: return "SHADING_RATE";
    }
    return "";
}
inline const char* getName(AccessType e) noexcept {
    switch (e) {
        case AccessType::READ: return "READ";
        case AccessType::READ_WRITE: return "READ_WRITE";
        case AccessType::WRITE: return "WRITE";
    }
    return "";
}
inline const char* getName(ClearValueType e) noexcept {
    switch (e) {
        case ClearValueType::NONE: return "NONE";
        case ClearValueType::FLOAT_TYPE: return "FLOAT_TYPE";
        case ClearValueType::INT_TYPE: return "INT_TYPE";
    }
    return "";
}
inline const char* getName(const LightInfo& /*v*/) noexcept { return "LightInfo"; }
inline const char* getName(DescriptorTypeOrder e) noexcept {
    switch (e) {
        case DescriptorTypeOrder::UNIFORM_BUFFER: return "UNIFORM_BUFFER";
        case DescriptorTypeOrder::DYNAMIC_UNIFORM_BUFFER: return "DYNAMIC_UNIFORM_BUFFER";
        case DescriptorTypeOrder::SAMPLER_TEXTURE: return "SAMPLER_TEXTURE";
        case DescriptorTypeOrder::SAMPLER: return "SAMPLER";
        case DescriptorTypeOrder::TEXTURE: return "TEXTURE";
        case DescriptorTypeOrder::STORAGE_BUFFER: return "STORAGE_BUFFER";
        case DescriptorTypeOrder::DYNAMIC_STORAGE_BUFFER: return "DYNAMIC_STORAGE_BUFFER";
        case DescriptorTypeOrder::STORAGE_IMAGE: return "STORAGE_IMAGE";
        case DescriptorTypeOrder::INPUT_ATTACHMENT: return "INPUT_ATTACHMENT";
    }
    return "";
}
inline const char* getName(const Descriptor& /*v*/) noexcept { return "Descriptor"; }
inline const char* getName(const DescriptorBlock& /*v*/) noexcept { return "DescriptorBlock"; }
inline const char* getName(const DescriptorBlockFlattened& /*v*/) noexcept { return "DescriptorBlockFlattened"; }
inline const char* getName(const DescriptorBlockIndex& /*v*/) noexcept { return "DescriptorBlockIndex"; }
inline const char* getName(const DescriptorGroupBlockIndex& /*v*/) noexcept { return "DescriptorGroupBlockIndex"; }
inline const char* getName(const DescriptorGroupBlock& /*v*/) noexcept { return "DescriptorGroupBlock"; }
inline const char* getName(const ResolvePair& /*v*/) noexcept { return "ResolvePair"; }
inline const char* getName(const CopyPair& /*v*/) noexcept { return "CopyPair"; }
inline const char* getName(const UploadPair& /*v*/) noexcept { return "UploadPair"; }
inline const char* getName(const MovePair& /*v*/) noexcept { return "MovePair"; }
inline const char* getName(const PipelineStatistics& /*v*/) noexcept { return "PipelineStatistics"; }

} // namespace render

} // namespace cc

// clang-format on
