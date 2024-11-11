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

#include <cstdint>
#include <memory>
#include <type_traits>
#include "base/TypeDef.h"
#include "base/std/variant.h"
#include "bindings/jswrapper/Object.h"
#include "core/ArrayBuffer.h"

namespace cc {

template <typename T>
se::Object::TypedArrayType toTypedArrayType() {
    return se::Object::TypedArrayType::NONE;
}

template <>
inline se::Object::TypedArrayType toTypedArrayType<int8_t>() {
    return se::Object::TypedArrayType::INT8;
}

template <>
inline se::Object::TypedArrayType toTypedArrayType<int16_t>() {
    return se::Object::TypedArrayType::INT16;
}

template <>
inline se::Object::TypedArrayType toTypedArrayType<int32_t>() {
    return se::Object::TypedArrayType::INT32;
}

template <>
inline se::Object::TypedArrayType toTypedArrayType<uint8_t>() {
    return se::Object::TypedArrayType::UINT8;
}

template <>
inline se::Object::TypedArrayType toTypedArrayType<uint16_t>() {
    return se::Object::TypedArrayType::UINT16;
}

template <>
inline se::Object::TypedArrayType toTypedArrayType<uint32_t>() {
    return se::Object::TypedArrayType::UINT32;
}

template <>
inline se::Object::TypedArrayType toTypedArrayType<float>() {
    return se::Object::TypedArrayType::FLOAT32;
}

template <>
inline se::Object::TypedArrayType toTypedArrayType<double>() {
    return se::Object::TypedArrayType::FLOAT64;
}

template <typename T>
class TypedArrayTemp {
public:
    static constexpr uint32_t BYTES_PER_ELEMENT{sizeof(T)};
    using value_type = T;

    TypedArrayTemp() = default;

    explicit TypedArrayTemp(uint32_t length) {
        reset(length);
    }

    explicit TypedArrayTemp(ArrayBuffer *buffer)
    : TypedArrayTemp(buffer, 0) {}

    TypedArrayTemp(ArrayBuffer *buffer, uint32_t byteOffset)
    : TypedArrayTemp(buffer, byteOffset, (buffer->byteLength() - byteOffset) / BYTES_PER_ELEMENT) {}

    TypedArrayTemp(ArrayBuffer *buffer, uint32_t byteOffset, uint32_t length)
    : _buffer(buffer),
      _byteOffset(byteOffset),
      _byteLength(length * BYTES_PER_ELEMENT),
      _byteEndPos(byteOffset + length * BYTES_PER_ELEMENT) {
        CC_ASSERT(_byteEndPos <= _buffer->byteLength());
        _jsTypedArray = se::Object::createTypedArrayWithBuffer(toTypedArrayType<T>(), buffer->getJSArrayBuffer(), byteOffset, _byteLength);
        _jsTypedArray->root();
    }

    TypedArrayTemp(const TypedArrayTemp &o) {
        *this = o;
    }

    TypedArrayTemp(TypedArrayTemp &&o) noexcept {
        *this = std::move(o);
    }

    ~TypedArrayTemp() {
        if (_jsTypedArray != nullptr) {
            _jsTypedArray->unroot();
            _jsTypedArray->decRef();
        }
    }

    TypedArrayTemp &operator=(const TypedArrayTemp &o) {
        if (this != &o) {
            setJSTypedArray(o._jsTypedArray);
        }
        return *this;
    }

    TypedArrayTemp &operator=(TypedArrayTemp &&o) noexcept {
        if (this != &o) {
            _buffer = o._buffer;
            _byteOffset = o._byteOffset;
            _byteLength = o._byteLength;
            _byteEndPos = o._byteEndPos;

            if (_jsTypedArray != nullptr) {
                _jsTypedArray->unroot();
                _jsTypedArray->decRef();
            }
            _jsTypedArray = o._jsTypedArray;

            o._buffer = nullptr;
            o._byteOffset = 0;
            o._byteLength = 0;
            o._byteEndPos = 0;
            o._jsTypedArray = nullptr;
        }
        return *this;
    }

    T &operator[](uint32_t idx) {
        CC_ASSERT(idx < length());
        return *((reinterpret_cast<T *>(_buffer->_data + _byteOffset)) + idx);
    }

    const T &operator[](uint32_t idx) const {
        CC_ASSERT(idx < length());
        return *((reinterpret_cast<T *>(_buffer->_data + _byteOffset)) + idx);
    }

    TypedArrayTemp subarray(uint32_t begin, uint32_t end) {
        return TypedArrayTemp(_buffer, begin * BYTES_PER_ELEMENT + _byteOffset, end - begin);
    }

    TypedArrayTemp subarray(uint32_t begin) {
        return TypedArrayTemp(_buffer, begin * BYTES_PER_ELEMENT + _byteOffset);
    }

    TypedArrayTemp slice() {
        return slice(0);
    }

    TypedArrayTemp slice(uint32_t start) {
        return slice(start, _byteLength / BYTES_PER_ELEMENT);
    }

    TypedArrayTemp slice(uint32_t start, uint32_t end) {
        CC_ASSERT_GT(end, start);
        CC_ASSERT(start < (_byteLength / BYTES_PER_ELEMENT));
        CC_ASSERT(end <= (_byteLength / BYTES_PER_ELEMENT));
        uint32_t newBufByteLength = (end - start) * BYTES_PER_ELEMENT;
        auto *buffer = ccnew ArrayBuffer(newBufByteLength);
        memcpy(buffer->getData(), _buffer->getData() + start * BYTES_PER_ELEMENT + _byteOffset, newBufByteLength);
        return TypedArrayTemp(buffer);
    }

    void set(ArrayBuffer *buffer) {
        set(buffer, 0);
    }

    void set(ArrayBuffer *buffer, uint32_t offset) {
        CC_ASSERT(buffer->byteLength() + _byteOffset + offset * BYTES_PER_ELEMENT <= _byteEndPos);
        CC_ASSERT(_buffer);
        memcpy(_buffer->_data + _byteOffset + offset * BYTES_PER_ELEMENT, buffer->_data, buffer->byteLength());
    }

    template <typename SrcType>
    void set(const TypedArrayTemp<SrcType> &array) {
        set(array, 0);
    }

    template <typename SrcType>
    typename std::enable_if_t<std::is_same<T, SrcType>::value, void>
    set(const TypedArrayTemp<SrcType> &array, uint32_t offset);

    template <typename SrcType>
    typename std::enable_if_t<!std::is_same<T, SrcType>::value, void>
    set(const TypedArrayTemp<SrcType> &array, uint32_t offset);

    void reset(uint32_t length) {
        if (_jsTypedArray != nullptr) {
            _jsTypedArray->unroot();
            _jsTypedArray->decRef();
            _jsTypedArray = nullptr;
        }
        const uint32_t byteLength = length * BYTES_PER_ELEMENT;
        _buffer = ccnew ArrayBuffer(byteLength);
        _byteLength = _buffer->byteLength();
        _byteOffset = 0;
        _byteEndPos = byteLength;
        _jsTypedArray = se::Object::createTypedArrayWithBuffer(toTypedArrayType<T>(), _buffer->getJSArrayBuffer(), 0, byteLength);
        _jsTypedArray->root();
    }

    void clear() {
        if (_jsTypedArray != nullptr) {
            _jsTypedArray->unroot();
            _jsTypedArray->decRef();
            _jsTypedArray = nullptr;
        }
        _buffer = nullptr;
        _byteLength = 0;
        _byteOffset = 0;
        _byteEndPos = 0;
    }

    inline ArrayBuffer *buffer() const { return _buffer; }
    inline uint32_t byteLength() const { return _byteLength; }
    inline uint32_t length() const { return _byteLength / BYTES_PER_ELEMENT; }
    inline uint32_t byteOffset() const { return _byteOffset; }
    inline bool empty() const { return _byteLength == 0; }
    inline se::Object *getJSTypedArray() const { return _jsTypedArray; }
    inline void setJSTypedArray(se::Object *typedArray) {
        if (_jsTypedArray != nullptr) {
            _jsTypedArray->unroot();
            _jsTypedArray->decRef();
        }
        _jsTypedArray = typedArray;

        if (_jsTypedArray != nullptr) {
            _jsTypedArray->root();
            _jsTypedArray->incRef();

            se::Value tmpVal;
            _jsTypedArray->getProperty("buffer", &tmpVal, true);
            CC_ASSERT(tmpVal.isObject());
            CC_ASSERT(tmpVal.toObject()->isArrayBuffer());

            _buffer = ccnew ArrayBuffer();
            _buffer->setJSArrayBuffer(tmpVal.toObject());

            _jsTypedArray->getProperty("byteOffset", &tmpVal, true);
            CC_ASSERT(tmpVal.isNumber());
            _byteOffset = tmpVal.toUint32();

            _jsTypedArray->getProperty("byteLength", &tmpVal, true);
            CC_ASSERT(tmpVal.isNumber());
            _byteLength = tmpVal.toUint32();

            _byteEndPos = _buffer->byteLength();
        } else {
            _buffer = nullptr;
            _byteOffset = 0;
            _byteLength = 0;
            _byteEndPos = 0;
        }
    }

private:
    ArrayBuffer::Ptr _buffer;
    uint32_t _byteOffset{0};
    uint32_t _byteLength{0};
    uint32_t _byteEndPos{0};
    se::Object *_jsTypedArray{nullptr};
};

template <typename T>
template <typename SrcType>
typename std::enable_if_t<std::is_same<T, SrcType>::value, void> TypedArrayTemp<T>::set(const TypedArrayTemp<SrcType> &array, uint32_t offset) {
    CC_ASSERT(_buffer);
    uint32_t dstByteOffset = _byteOffset + offset * BYTES_PER_ELEMENT;
    uint32_t srcByteOffset = array.byteOffset();
    uint32_t srcCount = array.length();
    CC_ASSERT(dstByteOffset + srcCount * TypedArrayTemp<SrcType>::BYTES_PER_ELEMENT <= _byteEndPos);
    memcpy(_buffer->_data + dstByteOffset, array._buffer->_data + srcByteOffset, array.byteLength());
}

template <typename T>
template <typename SrcType>
typename std::enable_if_t<!std::is_same<T, SrcType>::value, void> TypedArrayTemp<T>::set(const TypedArrayTemp<SrcType> &array, uint32_t offset) {
    CC_ASSERT(_buffer);
    uint32_t dstByteOffset = _byteOffset + offset * BYTES_PER_ELEMENT;
    uint32_t srcByteOffset = array.byteOffset();
    uint32_t srcCount = array.length();
    uint32_t remainCount = (_byteEndPos - dstByteOffset) / BYTES_PER_ELEMENT;
    CC_ASSERT_LE(srcCount, remainCount);
    for (uint32_t i = 0; i < srcCount; ++i) {
        (*this)[offset + i] = reinterpret_cast<T>(array[i]);
    }
}

using Int8Array = TypedArrayTemp<int8_t>;
using Int16Array = TypedArrayTemp<int16_t>;
using Int32Array = TypedArrayTemp<int32_t>;
using Uint8Array = TypedArrayTemp<uint8_t>;
using Uint16Array = TypedArrayTemp<uint16_t>;
using Uint32Array = TypedArrayTemp<uint32_t>;
using Float32Array = TypedArrayTemp<float>;
using Float64Array = TypedArrayTemp<double>;
using TypedArray = ccstd::variant<ccstd::monostate, Int8Array, Int16Array, Int32Array, Uint8Array, Uint16Array, Uint32Array, Float32Array, Float64Array>;
using TypedArrayElementType = ccstd::variant<ccstd::monostate, int8_t, int16_t, int32_t, uint8_t, uint16_t, uint32_t, float, double>;

uint32_t getTypedArrayLength(const TypedArray &arr);
uint32_t getTypedArrayBytesPerElement(const TypedArray &arr);

template <typename T>
T getTypedArrayValue(const TypedArray &arr, uint32_t idx) {
#define TYPEDARRAY_GET_VALUE(type)            \
    do {                                      \
        auto *p = ccstd::get_if<type>(&arr);  \
        if (p != nullptr) {                   \
            return static_cast<T>((*p)[idx]); \
        }                                     \
    } while (false)

    TYPEDARRAY_GET_VALUE(Float32Array);
    TYPEDARRAY_GET_VALUE(Uint32Array);
    TYPEDARRAY_GET_VALUE(Uint16Array);
    TYPEDARRAY_GET_VALUE(Uint8Array);
    TYPEDARRAY_GET_VALUE(Int32Array);
    TYPEDARRAY_GET_VALUE(Int16Array);
    TYPEDARRAY_GET_VALUE(Int8Array);
    TYPEDARRAY_GET_VALUE(Float64Array);
#undef TYPEDARRAY_GET_VALUE

    return 0;
}

void setTypedArrayValue(TypedArray &arr, uint32_t idx, const TypedArrayElementType &value);

template <typename T>
T &getTypedArrayValueRef(const TypedArray &arr, uint32_t idx) {
#define TYPEDARRAY_GET_VALUE_REF(type)       \
    do {                                     \
        auto *p = ccstd::get_if<type>(&arr); \
        if (p != nullptr) {                  \
            return (*p)[idx];                \
        }                                    \
    } while (false)

    TYPEDARRAY_GET_VALUE_REF(Float32Array);
    TYPEDARRAY_GET_VALUE_REF(Uint32Array);
    TYPEDARRAY_GET_VALUE_REF(Uint16Array);
    TYPEDARRAY_GET_VALUE_REF(Uint8Array);
    TYPEDARRAY_GET_VALUE_REF(Int32Array);
    TYPEDARRAY_GET_VALUE_REF(Int16Array);
    TYPEDARRAY_GET_VALUE_REF(Int8Array);
    TYPEDARRAY_GET_VALUE_REF(Float64Array);
#undef TYPEDARRAY_GET_VALUE_REF
}

template <typename T>
T getTypedArrayElementValue(const TypedArrayElementType &element) {
#define CAST_TO_T(type)                          \
    do {                                         \
        auto *p = ccstd::get_if<type>(&element); \
        if (p != nullptr) {                      \
            return static_cast<T>(*p);           \
        }                                        \
    } while (false)

    CAST_TO_T(float);
    CAST_TO_T(uint32_t);
    CAST_TO_T(uint16_t);
    CAST_TO_T(uint8_t);
    CAST_TO_T(int32_t);
    CAST_TO_T(int16_t);
    CAST_TO_T(int8_t);
    CAST_TO_T(double);
#undef CAST_TO_T

    return 0;
}

} // namespace cc
