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

#include "GFXObject.h"
#include "base/RefCounted.h"

namespace cc {
namespace gfx {

class CC_DLL DescriptorSet : public GFXObject, public RefCounted {
public:
    DescriptorSet();
    ~DescriptorSet() override;

    void initialize(const DescriptorSetInfo &info);
    void destroy();

    virtual void update() = 0;
    virtual void forceUpdate() = 0;

    virtual void bindBuffer(uint32_t binding, Buffer *buffer, uint32_t index, AccessFlags flags);
    virtual void bindSampler(uint32_t binding, Sampler *sampler, uint32_t index);
    virtual void bindTexture(uint32_t binding, Texture *texture, uint32_t index, AccessFlags flags);
    virtual void bindAccelerationStructure(uint32_t binding, AccelerationStructure *accel, uint32_t index);

    void bindBuffer(uint32_t binding, Buffer *buffer, uint32_t index);
    void bindTexture(uint32_t binding, Texture *texture, uint32_t index);

    // Functions invoked by JSB adapter
    bool bindBufferJSB(uint32_t binding, Buffer *buffer, uint32_t index);
    bool bindTextureJSB(uint32_t binding, Texture *texture, uint32_t index, AccessFlags flags);
    bool bindSamplerJSB(uint32_t binding, Sampler *sampler, uint32_t index);

    Buffer *getBuffer(uint32_t binding, uint32_t index) const;
    Texture *getTexture(uint32_t binding, uint32_t index) const;
    Sampler *getSampler(uint32_t binding, uint32_t index) const;
    AccelerationStructure *getAccelerationStructure(uint32_t binding, uint32_t index) const;

    inline const DescriptorSetLayout *getLayout() const { return _layout; }

    inline void bindBuffer(uint32_t binding, Buffer *buffer) { bindBuffer(binding, buffer, 0U); }
    inline void bindTexture(uint32_t binding, Texture *texture) { bindTexture(binding, texture, 0U); }
    inline void bindSampler(uint32_t binding, Sampler *sampler) { bindSampler(binding, sampler, 0U); }
    inline void bindAccelerationStructure(uint32_t binding, AccelerationStructure *accel) { bindAccelerationStructure(binding, accel, 0U); }

    inline Buffer *getBuffer(uint32_t binding) const { return getBuffer(binding, 0U); }
    inline Texture *getTexture(uint32_t binding) const { return getTexture(binding, 0U); }
    inline Sampler *getSampler(uint32_t binding) const { return getSampler(binding, 0U); }
    inline AccelerationStructure *getAccelerationStructure(uint32_t binding) const { return getAccelerationStructure(binding, 0U); }

protected:
    virtual void doInit(const DescriptorSetInfo &info) = 0;
    virtual void doDestroy() = 0;

    template <typename T>
    struct ObjectWithId {
        T *ptr = nullptr;
        uint32_t id = INVALID_OBJECT_ID;
        AccessFlags flags = AccessFlagBit::NONE;
    };

    const DescriptorSetLayout *_layout = nullptr;
    ccstd::vector<ObjectWithId<Buffer>> _buffers;
    ccstd::vector<ObjectWithId<Texture>> _textures;
    ccstd::vector<ObjectWithId<Sampler>> _samplers;
    ccstd::vector<ObjectWithId<AccelerationStructure>> _accels;

    bool _isDirty = false;
};

} // namespace gfx
} // namespace cc
