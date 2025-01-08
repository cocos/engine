/****************************************************************************
 Copyright (c) 2023 Xiamen Yaji Software Co., Ltd.

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
#include <iostream>

namespace cc {

/**
 * Binary input stream archive.
 */
class BinaryInputArchive {
public:
    explicit BinaryInputArchive(std::istream &stream) : _stream(stream) {}
    ~BinaryInputArchive() = default;

    /**
     * Read data from stream.
     * @param data Pointer to data address to read.
     * @param size Length of the data.
     */
    bool load(char *data, uint32_t size);

    /**
     * Read arithmetic data from stream.
     * @param val Data to read.
     */
    template <typename T, typename = std::enable_if<std::is_arithmetic_v<T>>>
    bool load(T &val) {
        return load(reinterpret_cast<char *>(std::addressof(val)), sizeof(T));
    }

    /**
     * Skip data length
     * @param length Skip length
     */
    void move(uint32_t length);

private:
    std::istream &_stream;
};

/**
 * Binary output stream archive.
 */
class BinaryOutputArchive {
public:
    explicit BinaryOutputArchive(std::ostream &stream) : _stream(stream) {}
    ~BinaryOutputArchive() = default;

    /**
     * Write data to stream.
     * @param data Pointer to data address to write.
     * @param size Length of the data.
     */
    void save(const char *data, uint32_t size);

    /**
     * Write arithmetic data to stream.
     * @param val Data to write.
     */
    template <typename T, typename = std::enable_if<std::is_arithmetic_v<T>>>
    void save(const T &v) {
        save(reinterpret_cast<const char *>(std::addressof(v)), sizeof(T));
    }

private:
    std::ostream &_stream;
};

} // namespace cc
