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

#include "base/std/hash/hash.h"

#include "GFXBuffer.h"
#include "GFXInputAssembler.h"
#include "GFXObject.h"

namespace cc {
namespace gfx {

InputAssembler::InputAssembler()
: GFXObject(ObjectType::INPUT_ASSEMBLER) {
}

InputAssembler::~InputAssembler() = default;

ccstd::hash_t InputAssembler::computeAttributesHash() const {
    ccstd::hash_t seed = static_cast<uint32_t>(_attributes.size()) * 6;
    for (const auto &attribute : _attributes) {
        ccstd::hash_combine(seed, attribute.name);
        ccstd::hash_combine(seed, attribute.format);
        ccstd::hash_combine(seed, attribute.isNormalized);
        ccstd::hash_combine(seed, attribute.stream);
        ccstd::hash_combine(seed, attribute.isInstanced);
        ccstd::hash_combine(seed, attribute.location);
    }
    return seed;
}

void InputAssembler::initialize(const InputAssemblerInfo &info) {
    _attributes = info.attributes;
    _vertexBuffers = info.vertexBuffers;
    _indexBuffer = info.indexBuffer;
    _indirectBuffer = info.indirectBuffer;
    _attributesHash = computeAttributesHash();

    if (_indexBuffer) {
        _drawInfo.indexCount = _indexBuffer->getCount();
        _drawInfo.firstIndex = 0;
    }
    if (!_vertexBuffers.empty()) {
        _drawInfo.vertexCount = _vertexBuffers[0]->getCount();
        _drawInfo.firstVertex = 0;
        _drawInfo.vertexOffset = 0;
    }

    doInit(info);
}

void InputAssembler::destroy() {
    doDestroy();

    _attributes.clear();
    _attributesHash = 0U;

    _vertexBuffers.clear();
    _indexBuffer = nullptr;
    _indirectBuffer = nullptr;

    _drawInfo = DrawInfo();
}

} // namespace gfx
} // namespace cc
