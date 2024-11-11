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

#include "VKBuffer.h"
#include "VKCommandBuffer.h"
#include "VKCommands.h"
#include "VKDevice.h"
#include "profiler/Profiler.h"

namespace cc {
namespace gfx {

CCVKBuffer::CCVKBuffer() {
    _typedID = generateObjectID<decltype(this)>();
}

CCVKBuffer::~CCVKBuffer() {
    destroy();
}

void CCVKBuffer::doInit(const BufferInfo & /*info*/) {
    createBuffer(_size, _count);

    createBufferView(_size);
}

void CCVKBuffer::doInit(const BufferViewInfo &info) {
    auto *buffer = static_cast<CCVKBuffer *>(info.buffer);
    _gpuBuffer = buffer->gpuBuffer();

    createBufferView(_size);
}

void CCVKBuffer::createBuffer(uint32_t size, uint32_t count) {
    _gpuBuffer = ccnew CCVKGPUBuffer;
    _gpuBuffer->size = size;
    _gpuBuffer->count = count;

    _gpuBuffer->usage = _usage;
    _gpuBuffer->memUsage = _memUsage;
    _gpuBuffer->stride = _stride;
    _gpuBuffer->init();
}

void CCVKBuffer::createBufferView(uint32_t range) {
    _gpuBufferView = ccnew CCVKGPUBufferView;
    _gpuBufferView->range = range;

    _gpuBufferView->gpuBuffer = _gpuBuffer;
    _gpuBufferView->offset = _offset;
}

void CCVKBuffer::doDestroy() {
    _gpuBufferView = nullptr;
    _gpuBuffer = nullptr;
}

void CCVKBuffer::doResize(uint32_t size, uint32_t count) {
    createBuffer(size, count);

    // Hold reference to keep the old bufferView alive during DescriptorHub::update and IAHub::update.
    IntrusivePtr<CCVKGPUBufferView> oldBufferView = _gpuBufferView;
    createBufferView(size);
    CCVKDevice::getInstance()->gpuDescriptorHub()->update(oldBufferView, _gpuBufferView);
    CCVKDevice::getInstance()->gpuIAHub()->update(oldBufferView, _gpuBufferView);
}

void CCVKBuffer::update(const void *buffer, uint32_t size) {
    CC_PROFILE(CCVKBufferUpdate);
    cmdFuncCCVKUpdateBuffer(CCVKDevice::getInstance(), _gpuBuffer, buffer, size, nullptr);
}

uint64_t CCVKBuffer::doGetDeviceAddress() const {
    const VkBufferDeviceAddressInfo addressInfo{VK_STRUCTURE_TYPE_BUFFER_DEVICE_ADDRESS_INFO,nullptr,_gpuBuffer->vkBuffer};
    return vkGetBufferDeviceAddressKHR(CCVKDevice::getInstance()->gpuDevice()->vkDevice, &addressInfo);
}


void CCVKGPUBuffer::shutdown() {
    CCVKDevice::getInstance()->gpuBarrierManager()->cancel(this);
    CCVKDevice::getInstance()->gpuRecycleBin()->collect(this);
    CCVKDevice::getInstance()->gpuBufferHub()->erase(this);
    CC_ASSERT(CCVKDevice::getInstance()->getMemoryStatus().bufferSize >= size);
    CCVKDevice::getInstance()->getMemoryStatus().bufferSize -= size;
    CC_PROFILE_MEMORY_DEC(Buffer, size);
}

void CCVKGPUBuffer::init() {
    if (hasFlag(usage, BufferUsageBit::INDIRECT)) {
        const size_t drawInfoCount = size / sizeof(DrawInfo);
        indexedIndirectCmds.resize(drawInfoCount);
        indirectCmds.resize(drawInfoCount);
    }

    cmdFuncCCVKCreateBuffer(CCVKDevice::getInstance(), this);
    CCVKDevice::getInstance()->getMemoryStatus().bufferSize += size;
    CC_PROFILE_MEMORY_INC(Buffer, size);
}

void CCVKGPUBufferView::shutdown() {
    CCVKDevice::getInstance()->gpuDescriptorHub()->disengage(this);
    CCVKDevice::getInstance()->gpuIAHub()->disengage(this);
}

} // namespace gfx
} // namespace cc
