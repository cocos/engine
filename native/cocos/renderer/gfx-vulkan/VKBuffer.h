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

#include "VKStd.h"
#include "gfx-base/GFXBuffer.h"
#include "gfx-vulkan/VKGPUObjects.h"

namespace cc {
namespace gfx {

class CC_VULKAN_API CCVKBuffer final : public Buffer {
public:
    CCVKBuffer();
    ~CCVKBuffer() override;

    void update(const void *buffer, uint32_t size) override;

    inline CCVKGPUBuffer *gpuBuffer() const { return _gpuBuffer; }
    inline CCVKGPUBufferView *gpuBufferView() const { return _gpuBufferView; }

protected:
    void doInit(const BufferInfo &info) override;
    void doInit(const BufferViewInfo &info) override;
    void doDestroy() override;
    void doResize(uint32_t size, uint32_t count) override;
    uint64_t doGetDeviceAddress() const override;

    void createBuffer(uint32_t size, uint32_t count);
    void createBufferView(uint32_t range);

    IntrusivePtr<CCVKGPUBuffer> _gpuBuffer;
    IntrusivePtr<CCVKGPUBufferView> _gpuBufferView;
};

} // namespace gfx
} // namespace cc
