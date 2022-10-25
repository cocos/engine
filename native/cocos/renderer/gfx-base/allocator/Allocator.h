/****************************************************************************
Copyright (c) 2019-2021 Xiamen Yaji Software Co., Ltd.

http://www.cocos.com

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated engine source code (the "Software"), a limited,
worldwide, royalty-free, non-assignable, revocable and non-exclusive license
to use Cocos Creator solely to develop games on your target platforms. You shall
not use Cocos Creator software for developing other software or tools that's
used for developing games. You are not granted to publish, distribute,
sublicense, and/or sell copies of Cocos Creator.

The software or tools in this License Agreement are licensed, not sold.
Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
****************************************************************************/

#pragma once

#include "base/std/container/vector.h"
#include "base/std/container/list.h"

namespace cc::gfx {

struct AllocatorInfo {
    uint32_t blockSize;
};

class Allocator {
public:
    Allocator(AllocatorInfo info);
    ~Allocator() = default;

    using Handle = uint32_t;
    static constexpr Handle INVALID_HANDLE = ~(0U);

    struct Allocation {
        uint32_t blockIndex;
        uint32_t offset;
        uint32_t size;
    };

    struct Block {
        uint32_t used;
    };

    Handle allocate(uint32_t size, uint32_t alignment);

    void free(Handle);

    const Allocation *getAllocation(Handle) const;

private:
    Handle allocateFromBlock(uint32_t blockIndex, uint32_t size);

    AllocatorInfo _info;
    ccstd::vector<Block> _blocks;
    ccstd::vector<Allocation> _allocations;
    ccstd::list<Handle> _freelist;
};

} // namespace cc::gfx
