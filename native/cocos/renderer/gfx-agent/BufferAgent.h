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
#include "base/threading/MessageQueue.h"
#include "gfx-base/GFXBuffer.h"

namespace cc {

class ThreadSafeLinearAllocator;

namespace gfx {

class CC_DLL BufferAgent final : public Agent<Buffer> {
public:
    explicit BufferAgent(Buffer *actor);
    ~BufferAgent() override;

    void update(const void *buffer, uint32_t size) override;

    static void getActorBuffer(const BufferAgent *buffer, MessageQueue *mq, uint32_t size, uint8_t **pActorBuffer, bool *pNeedFreeing);

private:
    void doInit(const BufferInfo &info) override;
    void doInit(const BufferViewInfo &info) override;
    void doResize(uint32_t size, uint32_t count) override;
    void doDestroy() override;
    uint64_t doGetDeviceAddress() const override;

    void flush(const uint8_t *buffer) override;
    uint8_t *getStagingAddress() const override;

    static constexpr uint32_t STAGING_BUFFER_THRESHOLD = MessageQueue::MEMORY_CHUNK_SIZE / 2;

    std::unique_ptr<uint8_t[]> _stagingBuffer;
};

} // namespace gfx
} // namespace cc
