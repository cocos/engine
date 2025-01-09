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
#include "NativeTypes.h"

namespace cc {

namespace render {

ProgramInfo::ProgramInfo(const allocator_type& alloc) noexcept
: attributes(alloc) {}

ProgramInfo::ProgramInfo(IProgramInfo programInfoIn, gfx::ShaderInfo shaderInfoIn, ccstd::pmr::vector<gfx::Attribute> attributesIn, ccstd::vector<signed> blockSizesIn, ccstd::unordered_map<ccstd::string, uint32_t> handleMapIn, const allocator_type& alloc)
: programInfo(std::move(programInfoIn)),
  shaderInfo(std::move(shaderInfoIn)),
  attributes(std::move(attributesIn), alloc),
  blockSizes(std::move(blockSizesIn)),
  handleMap(std::move(handleMapIn)) {}

ProgramInfo::ProgramInfo(ProgramInfo&& rhs, const allocator_type& alloc)
: programInfo(std::move(rhs.programInfo)),
  shaderInfo(std::move(rhs.shaderInfo)),
  attributes(std::move(rhs.attributes), alloc),
  blockSizes(std::move(rhs.blockSizes)),
  handleMap(std::move(rhs.handleMap)) {}

ProgramInfo::ProgramInfo(ProgramInfo const& rhs, const allocator_type& alloc)
: programInfo(rhs.programInfo),
  shaderInfo(rhs.shaderInfo),
  attributes(rhs.attributes, alloc),
  blockSizes(rhs.blockSizes),
  handleMap(rhs.handleMap) {}

ProgramGroup::ProgramGroup(const allocator_type& alloc) noexcept
: programInfos(alloc),
  programProxies(alloc) {}

ProgramGroup::ProgramGroup(ProgramGroup&& rhs, const allocator_type& alloc)
: programInfos(std::move(rhs.programInfos), alloc),
  programProxies(std::move(rhs.programProxies), alloc) {}

ProgramGroup::ProgramGroup(ProgramGroup const& rhs, const allocator_type& alloc)
: programInfos(rhs.programInfos, alloc),
  programProxies(rhs.programProxies, alloc) {}

} // namespace render

} // namespace cc

// NOLINTEND(misc-include-cleaner, bugprone-easily-swappable-parameters)
// clang-format on
