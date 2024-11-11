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

#include "base/memory/Memory.h"

#include <cstring>
#include "BufferAgent.h"
#include "DeviceAgent.h"

namespace cc {
namespace gfx {

BufferAgent::BufferAgent(Buffer *actor)
: Agent<Buffer>(actor) {
    _typedID = actor->getTypedID();
}

BufferAgent::~BufferAgent() {
    ENQUEUE_MESSAGE_2(
        DeviceAgent::getInstance()->getMessageQueue(),
        BufferDestruct,
        actor, _actor,
        stagingBuffer, std::move(_stagingBuffer),
        {
            CC_SAFE_DELETE(actor);
        });
}

void BufferAgent::doInit(const BufferInfo &info) {
    uint32_t size = getSize();
    if (hasFlag(info.flags, BufferFlagBit::ENABLE_STAGING_WRITE) || (size > STAGING_BUFFER_THRESHOLD && hasFlag(_memUsage, MemoryUsageBit::HOST))) {
        _stagingBuffer = std::make_unique<uint8_t[]>(size * DeviceAgent::MAX_FRAME_INDEX);
    }

    ENQUEUE_MESSAGE_2(
        DeviceAgent::getInstance()->getMessageQueue(),
        BufferInit,
        actor, getActor(),
        info, info,
        {
            actor->initialize(info);
        });
}

void BufferAgent::doInit(const BufferViewInfo &info) {
    BufferViewInfo actorInfo = info;
    actorInfo.buffer = static_cast<BufferAgent *>(info.buffer)->getActor();

    // buffer views don't need staging buffers

    ENQUEUE_MESSAGE_2(
        DeviceAgent::getInstance()->getMessageQueue(),
        BufferViewInit,
        actor, getActor(),
        info, actorInfo,
        {
            actor->initialize(info);
        });
}

void BufferAgent::doResize(uint32_t size, uint32_t /*count*/) {
    auto *mq = DeviceAgent::getInstance()->getMessageQueue();

    if (_stagingBuffer) {
        ENQUEUE_MESSAGE_1(
            mq, BufferFreeStagingBuffer,
            stagingBuffer, std::move(_stagingBuffer),
            {});
    }

    if (hasFlag(_flags, BufferFlagBit::ENABLE_STAGING_WRITE) || (size > STAGING_BUFFER_THRESHOLD && hasFlag(_memUsage, MemoryUsageBit::HOST))) {
        _stagingBuffer = std::make_unique<uint8_t[]>(size * DeviceAgent::MAX_FRAME_INDEX);
    }

    ENQUEUE_MESSAGE_2(
        mq, BufferResize,
        actor, getActor(),
        size, size,
        {
            actor->resize(size);
        });
}

void BufferAgent::doDestroy() {
    auto *mq = DeviceAgent::getInstance()->getMessageQueue();

    ENQUEUE_MESSAGE_2(
        mq, BufferDestroy,
        actor, getActor(),
        stagingBuffer, std::move(_stagingBuffer),
        {
            actor->destroy();
        });
}

void BufferAgent::update(const void *buffer, uint32_t size) {
    uint8_t *actorBuffer{nullptr};
    bool needFreeing{false};
    auto *mq{DeviceAgent::getInstance()->getMessageQueue()};

    getActorBuffer(this, mq, size, &actorBuffer, &needFreeing);
    memcpy(actorBuffer, buffer, size);

    ENQUEUE_MESSAGE_4(
        mq, BufferUpdate,
        actor, getActor(),
        buffer, actorBuffer,
        size, size,
        needFreeing, needFreeing,
        {
            actor->update(buffer, size);
            if (needFreeing) free(buffer);
        });
}

uint64_t BufferAgent::doGetDeviceAddress() const {
    return 0U;
}


void BufferAgent::flush(const uint8_t *buffer) {
    auto *mq = DeviceAgent::getInstance()->getMessageQueue();
    ENQUEUE_MESSAGE_3(
        mq, BufferUpdate,
        actor, getActor(),
        buffer, buffer,
        size, _size,
        {
            actor->update(buffer, size);
        });
}

void BufferAgent::getActorBuffer(const BufferAgent *buffer, MessageQueue *mq, uint32_t size, uint8_t **pActorBuffer, bool *pNeedFreeing) {
    if (buffer->_stagingBuffer) { // for frequent updates on big buffers
        uint32_t frameIndex = DeviceAgent::getInstance()->getCurrentIndex();
        *pActorBuffer = buffer->_stagingBuffer.get() + frameIndex * buffer->_size;
    } else if (size > STAGING_BUFFER_THRESHOLD) { // less frequent updates on big buffers
        *pActorBuffer = reinterpret_cast<uint8_t *>(malloc(size));
        *pNeedFreeing = true;
    } else { // for small enough buffers
        *pActorBuffer = mq->allocate<uint8_t>(size);
    }
}

uint8_t *BufferAgent::getStagingAddress() const {
    if (!_stagingBuffer) {
        return nullptr;
    }
    uint32_t frameIndex = DeviceAgent::getInstance()->getCurrentIndex();
    return _stagingBuffer.get() + _size * frameIndex;
}

} // namespace gfx
} // namespace cc
