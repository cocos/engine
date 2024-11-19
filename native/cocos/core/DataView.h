/****************************************************************************
 Copyright (c) 2021-2023 Xiamen Yaji Software Co., Ltd.
 
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

#include "base/Macros.h"
#include "base/std/variant.h"
#include "core/ArrayBuffer.h"
#include "base/std/container/unordered_map.h"

namespace cc {

class DataView final {
public:
    DataView() = default;
    explicit DataView(ArrayBuffer *buffer);
    DataView(ArrayBuffer *buffer, uint32_t byteOffset);
    DataView(ArrayBuffer *buffer, uint32_t byteOffset, uint32_t byteLength);
    ~DataView() = default;

    void assign(ArrayBuffer *buffer);
    void assign(ArrayBuffer *buffer, uint32_t byteOffset);
    void assign(ArrayBuffer *buffer, uint32_t byteOffset, uint32_t byteLength);

    uint8_t getUint8(uint32_t offset) const;
    uint16_t getUint16(uint32_t offset) const;
    uint32_t getUint32(uint32_t offset) const;
    int8_t getInt8(uint32_t offset) const;
    int16_t getInt16(uint32_t offset) const;
    int32_t getInt32(uint32_t offset) const;
    float getFloat32(uint32_t offset) const;

    void setUint8(uint32_t offset, uint8_t value);
    void setUint16(uint32_t offset, uint16_t value);
    void setUint32(uint32_t offset, uint32_t value);
    void setInt8(uint32_t offset, int8_t value);
    void setInt16(uint32_t offset, int16_t value);
    void setInt32(uint32_t offset, int32_t value);
    void setFloat32(uint32_t offset, float value);

    inline const ArrayBuffer *buffer() const { return _buffer; }
    inline ArrayBuffer *buffer() { return _buffer; }
    inline uint32_t byteOffset() const { return _byteOffset; }
    inline uint32_t byteLength() const {
        return _byteEndPos - _byteOffset;
    }

    using Int32Reader = int32_t (DataView::*)(uint32_t) const;
    using UInt32Reader = uint32_t (DataView::*)(uint32_t) const;
    using Int16Reader = int16_t (DataView::*)(uint32_t) const;
    using UInt16Reader = uint16_t (DataView::*)(uint32_t) const;
    using Int8Reader = int8_t (DataView::*)(uint32_t) const;
    using UInt8Reader = uint8_t (DataView::*)(uint32_t) const;
    using ReaderVariant = ccstd::variant<ccstd::monostate, Int32Reader, UInt32Reader, Int16Reader, UInt16Reader, Int8Reader, UInt8Reader>;
    static ccstd::unordered_map<ccstd::string, ReaderVariant> intReaderMap;
    int32_t readInt(ReaderVariant &readerVariant, uint32_t offset);

    using IntWritter = void (DataView::*)(uint32_t, uint32_t);
    static ccstd::unordered_map<ccstd::string, IntWritter> intWritterMap;

private:
    ArrayBuffer::Ptr _buffer;
    uint8_t *_data{nullptr};
    uint32_t _byteOffset{0};
    uint32_t _byteEndPos{0};
};

} // namespace cc
