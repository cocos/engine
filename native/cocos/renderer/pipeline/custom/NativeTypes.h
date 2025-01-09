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
// NOLINTBEGIN(misc-include-cleaner, bugprone-easily-swappable-parameters)
#pragma once
#include "cocos/base/std/container/string.h"
#include "cocos/base/std/hash/hash.h"
#include "cocos/renderer/gfx-base/GFXRenderPass.h"
#include "cocos/renderer/pipeline/GlobalDescriptorSetManager.h"
#include "cocos/renderer/pipeline/custom/LayoutGraphTypes.h"
#include "cocos/renderer/pipeline/custom/NativeFwd.h"
#include "cocos/renderer/pipeline/custom/PrivateTypes.h"
#include "cocos/renderer/pipeline/custom/details/Map.h"

namespace cc {

namespace render {

struct ProgramInfo {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {attributes.get_allocator().resource()};
    }

    ProgramInfo(const allocator_type& alloc) noexcept; // NOLINT
    ProgramInfo(IProgramInfo programInfoIn, gfx::ShaderInfo shaderInfoIn, ccstd::pmr::vector<gfx::Attribute> attributesIn, ccstd::vector<signed> blockSizesIn, ccstd::unordered_map<ccstd::string, uint32_t> handleMapIn, const allocator_type& alloc);
    ProgramInfo(ProgramInfo&& rhs, const allocator_type& alloc);
    ProgramInfo(ProgramInfo const& rhs, const allocator_type& alloc);

    ProgramInfo(ProgramInfo&& rhs) noexcept = default;
    ProgramInfo(ProgramInfo const& rhs) = delete;
    ProgramInfo& operator=(ProgramInfo&& rhs) = default;
    ProgramInfo& operator=(ProgramInfo const& rhs) = default;

    IProgramInfo programInfo;
    gfx::ShaderInfo shaderInfo;
    ccstd::pmr::vector<gfx::Attribute> attributes;
    ccstd::vector<signed> blockSizes;
    ccstd::unordered_map<ccstd::string, uint32_t> handleMap;
};

struct ProgramGroup {
    using allocator_type = boost::container::pmr::polymorphic_allocator<char>;
    allocator_type get_allocator() const noexcept { // NOLINT
        return {programInfos.get_allocator().resource()};
    }

    ProgramGroup(const allocator_type& alloc) noexcept; // NOLINT
    ProgramGroup(ProgramGroup&& rhs, const allocator_type& alloc);
    ProgramGroup(ProgramGroup const& rhs, const allocator_type& alloc);

    ProgramGroup(ProgramGroup&& rhs) noexcept = default;
    ProgramGroup(ProgramGroup const& rhs) = delete;
    ProgramGroup& operator=(ProgramGroup&& rhs) = default;
    ProgramGroup& operator=(ProgramGroup const& rhs) = default;

    PmrTransparentMap<ccstd::pmr::string, ProgramInfo> programInfos;
    PmrFlatMap<ccstd::pmr::string, IntrusivePtr<ProgramProxy>> programProxies;
};

} // namespace render

} // namespace cc

// NOLINTEND(misc-include-cleaner, bugprone-easily-swappable-parameters)
// clang-format on
