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
#include "base/std/container/string.h"

namespace cc {

static const char *nonUuidMark = ".";

/**
 * ID generator for runtime.
 */
class IDGenerator {
public:
    /**
     * @param [category] You can specify a unique category to avoid id collision with other instance of IdGenerator.
     */
    explicit IDGenerator(const ccstd::string &category);

    ccstd::string getNewId();

private:
    uint32_t _id{0};

    ccstd::string _prefix;
};

/*
* The global id generator might have a conflict problem once every 365 days,
* if the game runs at 60 FPS and each frame 4760273 counts of new id are requested.
*/
extern IDGenerator globalIdGenerator;

} // namespace cc
