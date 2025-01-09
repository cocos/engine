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
#include "RenderCommonTypes.h"

namespace cc {

namespace render {

ResolvePair::ResolvePair(const allocator_type& alloc) noexcept
: source(alloc),
  target(alloc) {}

ResolvePair::ResolvePair(ccstd::pmr::string sourceIn, ccstd::pmr::string targetIn, ResolveFlags resolveFlagsIn, gfx::ResolveMode modeIn, gfx::ResolveMode mode1In, const allocator_type& alloc) // NOLINT
: source(std::move(sourceIn), alloc),
  target(std::move(targetIn), alloc),
  resolveFlags(resolveFlagsIn),
  mode(modeIn),
  mode1(mode1In) {}

ResolvePair::ResolvePair(ResolvePair&& rhs, const allocator_type& alloc)
: source(std::move(rhs.source), alloc),
  target(std::move(rhs.target), alloc),
  resolveFlags(rhs.resolveFlags),
  mode(rhs.mode),
  mode1(rhs.mode1) {}

ResolvePair::ResolvePair(ResolvePair const& rhs, const allocator_type& alloc)
: source(rhs.source, alloc),
  target(rhs.target, alloc),
  resolveFlags(rhs.resolveFlags),
  mode(rhs.mode),
  mode1(rhs.mode1) {}

CopyPair::CopyPair(const allocator_type& alloc) noexcept
: source(alloc),
  target(alloc) {}

CopyPair::CopyPair(ccstd::pmr::string sourceIn, ccstd::pmr::string targetIn, uint32_t mipLevelsIn, uint32_t numSlicesIn, uint32_t sourceMostDetailedMipIn, uint32_t sourceFirstSliceIn, uint32_t sourcePlaneSliceIn, uint32_t targetMostDetailedMipIn, uint32_t targetFirstSliceIn, uint32_t targetPlaneSliceIn, const allocator_type& alloc) // NOLINT
: source(std::move(sourceIn), alloc),
  target(std::move(targetIn), alloc),
  mipLevels(mipLevelsIn),
  numSlices(numSlicesIn),
  sourceMostDetailedMip(sourceMostDetailedMipIn),
  sourceFirstSlice(sourceFirstSliceIn),
  sourcePlaneSlice(sourcePlaneSliceIn),
  targetMostDetailedMip(targetMostDetailedMipIn),
  targetFirstSlice(targetFirstSliceIn),
  targetPlaneSlice(targetPlaneSliceIn) {}

CopyPair::CopyPair(CopyPair&& rhs, const allocator_type& alloc)
: source(std::move(rhs.source), alloc),
  target(std::move(rhs.target), alloc),
  mipLevels(rhs.mipLevels),
  numSlices(rhs.numSlices),
  sourceMostDetailedMip(rhs.sourceMostDetailedMip),
  sourceFirstSlice(rhs.sourceFirstSlice),
  sourcePlaneSlice(rhs.sourcePlaneSlice),
  targetMostDetailedMip(rhs.targetMostDetailedMip),
  targetFirstSlice(rhs.targetFirstSlice),
  targetPlaneSlice(rhs.targetPlaneSlice) {}

CopyPair::CopyPair(CopyPair const& rhs, const allocator_type& alloc)
: source(rhs.source, alloc),
  target(rhs.target, alloc),
  mipLevels(rhs.mipLevels),
  numSlices(rhs.numSlices),
  sourceMostDetailedMip(rhs.sourceMostDetailedMip),
  sourceFirstSlice(rhs.sourceFirstSlice),
  sourcePlaneSlice(rhs.sourcePlaneSlice),
  targetMostDetailedMip(rhs.targetMostDetailedMip),
  targetFirstSlice(rhs.targetFirstSlice),
  targetPlaneSlice(rhs.targetPlaneSlice) {}

UploadPair::UploadPair(const allocator_type& alloc) noexcept
: target(alloc) {}

UploadPair::UploadPair(ccstd::vector<uint8_t> sourceIn, ccstd::pmr::string targetIn, uint32_t mipLevelsIn, uint32_t numSlicesIn, uint32_t targetMostDetailedMipIn, uint32_t targetFirstSliceIn, uint32_t targetPlaneSliceIn, const allocator_type& alloc) // NOLINT
: source(std::move(sourceIn)),
  target(std::move(targetIn), alloc),
  mipLevels(mipLevelsIn),
  numSlices(numSlicesIn),
  targetMostDetailedMip(targetMostDetailedMipIn),
  targetFirstSlice(targetFirstSliceIn),
  targetPlaneSlice(targetPlaneSliceIn) {}

UploadPair::UploadPair(UploadPair&& rhs, const allocator_type& alloc)
: source(std::move(rhs.source)),
  target(std::move(rhs.target), alloc),
  mipLevels(rhs.mipLevels),
  numSlices(rhs.numSlices),
  targetMostDetailedMip(rhs.targetMostDetailedMip),
  targetFirstSlice(rhs.targetFirstSlice),
  targetPlaneSlice(rhs.targetPlaneSlice) {}

MovePair::MovePair(const allocator_type& alloc) noexcept
: source(alloc),
  target(alloc) {}

MovePair::MovePair(ccstd::pmr::string sourceIn, ccstd::pmr::string targetIn, uint32_t mipLevelsIn, uint32_t numSlicesIn, uint32_t targetMostDetailedMipIn, uint32_t targetFirstSliceIn, uint32_t targetPlaneSliceIn, const allocator_type& alloc) // NOLINT
: source(std::move(sourceIn), alloc),
  target(std::move(targetIn), alloc),
  mipLevels(mipLevelsIn),
  numSlices(numSlicesIn),
  targetMostDetailedMip(targetMostDetailedMipIn),
  targetFirstSlice(targetFirstSliceIn),
  targetPlaneSlice(targetPlaneSliceIn) {}

MovePair::MovePair(MovePair&& rhs, const allocator_type& alloc)
: source(std::move(rhs.source), alloc),
  target(std::move(rhs.target), alloc),
  mipLevels(rhs.mipLevels),
  numSlices(rhs.numSlices),
  targetMostDetailedMip(rhs.targetMostDetailedMip),
  targetFirstSlice(rhs.targetFirstSlice),
  targetPlaneSlice(rhs.targetPlaneSlice) {}

MovePair::MovePair(MovePair const& rhs, const allocator_type& alloc)
: source(rhs.source, alloc),
  target(rhs.target, alloc),
  mipLevels(rhs.mipLevels),
  numSlices(rhs.numSlices),
  targetMostDetailedMip(rhs.targetMostDetailedMip),
  targetFirstSlice(rhs.targetFirstSlice),
  targetPlaneSlice(rhs.targetPlaneSlice) {}

} // namespace render

} // namespace cc

// clang-format on
