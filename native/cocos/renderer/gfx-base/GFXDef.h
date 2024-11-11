/****************************************************************************
 Copyright (c) 2019-2023 Xiamen Yaji Software Co., Ltd.

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

#include <functional>
#include "GFXDef-common.h"
#include "base/std/hash/hash.h"

namespace cc {
namespace gfx {

template <typename T, typename Enable = std::enable_if_t<std::is_class<T>::value>>
struct Hasher final {
    // NOTE: ccstd::hash_t is a typedef of uint32_t now, sizeof(ccstd::hash_t) == sizeof(size_t) on 32 bits architecture device,
    // sizeof(ccstd::hash_t) < sizeof(size_t) on 64 bits architecture device.
    // STL containers like ccstd::unordered_map<K, V, Hasher> expects the custom Hasher function to return size_t.
    // So it's safe to return ccstd::hash_t for operator() function now.
    // If we need to define ccstd::hash_t to uint64_t someday, we must take care of the return value of operator(),
    // it should be size_t and we need to convert hash value from uint64_t to uint32_t for 32 bit architecture device.
    ccstd::hash_t operator()(const T &info) const;
};

// make this ccstd::hash compatible
template <typename T, typename Enable = std::enable_if_t<std::is_class<T>::value>>
ccstd::hash_t hash_value(const T &info) { return Hasher<T>()(info); } // NOLINT(readability-identifier-naming)

#define DEFINE_CMP_OP(type)                            \
    bool operator==(const type &lhs, const type &rhs); \
    inline bool operator!=(const type &lhs, const type &rhs) { return !(lhs == rhs); }

DEFINE_CMP_OP(DepthStencilAttachment)
DEFINE_CMP_OP(SubpassInfo)
DEFINE_CMP_OP(SubpassDependency)
DEFINE_CMP_OP(RenderPassInfo)
DEFINE_CMP_OP(FramebufferInfo)
DEFINE_CMP_OP(Viewport)
DEFINE_CMP_OP(Rect)
DEFINE_CMP_OP(Color)
DEFINE_CMP_OP(Offset)
DEFINE_CMP_OP(Extent)
DEFINE_CMP_OP(Size)
DEFINE_CMP_OP(TextureInfo)
DEFINE_CMP_OP(TextureViewInfo)
DEFINE_CMP_OP(BufferInfo)
DEFINE_CMP_OP(SamplerInfo)
DEFINE_CMP_OP(GeneralBarrierInfo)
DEFINE_CMP_OP(TextureBarrierInfo)
DEFINE_CMP_OP(BufferBarrierInfo)

#undef DEFINE_CMP_OP

class Executable {
public:
    virtual ~Executable() = default;
    virtual void execute() = 0;
};

template <typename ExecuteMethodType>
class CallbackExecutable final : public Executable {
public:
    using ExecuteMethod = std::remove_reference_t<ExecuteMethodType>;

    explicit CallbackExecutable(ExecuteMethod &execute) : Executable(), _execute(execute) {}
    explicit CallbackExecutable(ExecuteMethod &&execute) : Executable(), _execute(execute) {}

    void execute() override { _execute(); }

private:
    ExecuteMethod _execute;
};

struct SwapchainTextureInfo final {
    Swapchain *swapchain{nullptr};
    Format format{Format::UNKNOWN};
    uint32_t width{0};
    uint32_t height{0};
};

constexpr TextureUsage TEXTURE_USAGE_TRANSIENT = static_cast<TextureUsage>(
    static_cast<uint32_t>(TextureUsageBit::COLOR_ATTACHMENT) |
    static_cast<uint32_t>(TextureUsageBit::DEPTH_STENCIL_ATTACHMENT) |
    static_cast<uint32_t>(TextureUsageBit::INPUT_ATTACHMENT));

constexpr DescriptorType DESCRIPTOR_BUFFER_TYPE = static_cast<DescriptorType>(
    static_cast<uint32_t>(DescriptorType::STORAGE_BUFFER) |
    static_cast<uint32_t>(DescriptorType::DYNAMIC_STORAGE_BUFFER) |
    static_cast<uint32_t>(DescriptorType::UNIFORM_BUFFER) |
    static_cast<uint32_t>(DescriptorType::DYNAMIC_UNIFORM_BUFFER));

constexpr DescriptorType DESCRIPTOR_TEXTURE_TYPE = static_cast<DescriptorType>(
    static_cast<uint32_t>(DescriptorType::SAMPLER_TEXTURE) |
    static_cast<uint32_t>(DescriptorType::SAMPLER) |
    static_cast<uint32_t>(DescriptorType::TEXTURE) |
    static_cast<uint32_t>(DescriptorType::STORAGE_IMAGE) |
    static_cast<uint32_t>(DescriptorType::INPUT_ATTACHMENT));

constexpr DescriptorType DESCRIPTOR_SAMPLER_TYPE = static_cast<DescriptorType>(
    static_cast<uint32_t>(DescriptorType::SAMPLER_TEXTURE) |
    static_cast<uint32_t>(DescriptorType::SAMPLER) |
    static_cast<uint32_t>(DescriptorType::TEXTURE) |
    static_cast<uint32_t>(DescriptorType::STORAGE_IMAGE) |
    static_cast<uint32_t>(DescriptorType::INPUT_ATTACHMENT));

constexpr DescriptorType DESCRIPTOR_DYNAMIC_TYPE = static_cast<DescriptorType>(
    static_cast<uint32_t>(DescriptorType::DYNAMIC_STORAGE_BUFFER) |
    static_cast<uint32_t>(DescriptorType::DYNAMIC_UNIFORM_BUFFER));

constexpr DescriptorType ACCELERATION_STRUCTURE_TYPE = static_cast<DescriptorType>(DescriptorType::ACCELERATION_STRUCTURE);

extern const FormatInfo GFX_FORMAT_INFOS[];

std::pair<uint32_t, uint32_t> formatAlignment(Format format);

uint32_t formatSize(Format format, uint32_t width, uint32_t height, uint32_t depth);

uint32_t formatSurfaceSize(Format format, uint32_t width, uint32_t height, uint32_t depth, uint32_t mips);

/**
 * @en Get the memory size of the specified type.
 * @zh 得到 GFX 数据类型的大小。
 * @param type The target type.
 */
uint32_t getTypeSize(gfx::Type type);

uint32_t gcd(uint32_t a, uint32_t b);

uint32_t lcm(uint32_t a, uint32_t b);

} // namespace gfx
} // namespace cc
