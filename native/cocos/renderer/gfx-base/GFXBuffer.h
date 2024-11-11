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

class CC_DLL  Buffer : public GFXObject, public RefCounted {
public:
    Buffer();
    ~Buffer() override;

    static ccstd::hash_t computeHash(const BufferInfo &info);

    void initialize(const BufferInfo &info);
    void initialize(const BufferViewInfo &info);
    void resize(uint32_t size);
    void destroy();

    template <typename T>
    void write(const T &value, uint32_t offset) const {
        write(reinterpret_cast<const uint8_t *>(&value), offset, sizeof(T));
    }

    void write(const uint8_t *value, uint32_t offset, uint32_t size) const;

    virtual void update(const void *buffer, uint32_t size) = 0;

    inline void update(const void *buffer) { update(buffer, _size); }

    void update();

    inline BufferUsage getUsage() const { return _usage; }
    inline MemoryUsage getMemUsage() const { return _memUsage; }
    inline uint32_t getStride() const { return _stride; }
    inline uint32_t getCount() const { return _count; }
    inline uint32_t getSize() const { return _size; }
    inline BufferFlags getFlags() const { return _flags; }
    inline bool isBufferView() const { return _isBufferView; }
    inline uint64_t getDeviceAddress() const { return doGetDeviceAddress(); }

protected:
    virtual void doInit(const BufferInfo &info) = 0;
    virtual void doInit(const BufferViewInfo &info) = 0;
    virtual void doResize(uint32_t size, uint32_t count) = 0;
    virtual void doDestroy() = 0;
    virtual uint64_t doGetDeviceAddress() const = 0;

    static uint8_t *getBufferStagingAddress(Buffer *buffer);
    static void flushBuffer(Buffer *buffer, const uint8_t *data);

    virtual void flush(const uint8_t *data) { update(reinterpret_cast<const void *>(data), _size); }
    virtual uint8_t *getStagingAddress() const { return _data.get(); }

    BufferUsage _usage = BufferUsageBit::NONE;
    MemoryUsage _memUsage = MemoryUsageBit::NONE;
    uint32_t _stride = 0U;
    uint32_t _count = 0U;
    uint32_t _size = 0U;
    uint32_t _offset = 0U;
    BufferFlags _flags = BufferFlagBit::NONE;
    bool _isBufferView = false;
    uint8_t _rsv[3] = {0};
    std::unique_ptr<uint8_t[]> _data;
};

} // namespace gfx
} // namespace cc
