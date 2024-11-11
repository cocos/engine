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

#include "base/Agent.h"
#include "gfx-base/GFXBuffer.h"

namespace cc {
namespace gfx {

class CC_DLL BufferValidator final : public Agent<Buffer> {
public:
    explicit BufferValidator(Buffer *actor);
    ~BufferValidator() override;

    void update(const void *buffer, uint32_t size) override;

    void sanityCheck(const void *buffer, uint32_t size);

    inline bool isInited() const { return _inited; }

    inline bool isValid() const { return !_expired; }

protected:
    void doInit(const BufferInfo &info) override;
    void doInit(const BufferViewInfo &info) override;
    void doResize(uint32_t size, uint32_t count) override;
    void doDestroy() override;
    uint64_t doGetDeviceAddress() const override;

    void flush(const uint8_t *buffer) override;
    uint8_t *getStagingAddress() const override;

    void addView(BufferValidator *view);
    void removeView(BufferValidator *view);
    void onExpire();

    ccstd::vector<uint8_t> _buffer;

    BufferValidator *_source{nullptr};
    ccstd::vector<BufferValidator *> _views; // weak reference

    uint64_t _lastUpdateFrame{0U};
    uint64_t _totalUpdateTimes{0U};
    uint64_t _creationFrame{0U};

    bool _inited{false};
    bool _expired{false};

    ccstd::string _initStack;
};

} // namespace gfx
} // namespace cc
