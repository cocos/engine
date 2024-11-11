/****************************************************************************
 Copyright (c) 2020-2023 Xiamen Yaji Software Co., Ltd.

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

#include <cstdint>
#include "base/Ptr.h"
#include "base/std/container/unordered_map.h"
#include "base/std/container/vector.h"

namespace cc {
namespace scene {
class Light;
}
namespace gfx {
class DescriptorSet;
class DescriptorSetLayout;
class Sampler;
class Buffer;
class Texture;
class Device;
class AccelerationStructure;
} // namespace gfx
namespace pipeline {

class GlobalDSManager final {
public:
    GlobalDSManager() = default;
    ~GlobalDSManager() = default;

    inline gfx::Sampler *getLinearSampler() const { return _linearSampler; }
    inline gfx::Sampler *getPointSampler() const { return _pointSampler; }
    inline gfx::DescriptorSetLayout *getDescriptorSetLayout() const { return _descriptorSetLayout; }
    inline gfx::DescriptorSet *getGlobalDescriptorSet() const { return _globalDescriptorSet; }

    void activate(gfx::Device *device);
    void bindBuffer(uint32_t binding, gfx::Buffer *buffer);
    void bindTexture(uint32_t binding, gfx::Texture *texture);
    void bindSampler(uint32_t binding, gfx::Sampler *sampler);
    void bindAccelerationStructure(uint32_t binding, gfx::AccelerationStructure * accel);
    void update();
    gfx::DescriptorSet *getOrCreateDescriptorSet(const scene::Light *light);
    void destroy();

    static void setDescriptorSetLayout();

private:
    // weak reference
    gfx::Device *_device{nullptr};

    // Samplers are hold by device
    gfx::Sampler *_linearSampler{nullptr};
    gfx::Sampler *_pointSampler{nullptr};

    IntrusivePtr<gfx::Texture> _defaultTexture;

    IntrusivePtr<gfx::DescriptorSetLayout> _descriptorSetLayout;
    IntrusivePtr<gfx::DescriptorSet> _globalDescriptorSet;
    ccstd::vector<IntrusivePtr<gfx::Buffer>> _shadowUBOs;
    // light is weak reference
    ccstd::unordered_map<const scene::Light *, IntrusivePtr<gfx::DescriptorSet>> _descriptorSetMap;
};

} // namespace pipeline
} // namespace cc
