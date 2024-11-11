/****************************************************************************
 Copyright (c) 2020-2022 Xiamen Yaji Software Co., Ltd.

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

#include "VKAccelerationStructure.h"
#include "VKCommands.h"
#include "VKDevice.h"
#include "VKCommandBuffer.h"

namespace cc {
namespace gfx {

CCVKAccelerationStructure::CCVKAccelerationStructure() {
    _typedID = generateObjectID<decltype(this)>();
}

CCVKAccelerationStructure::~CCVKAccelerationStructure() {
    destroy();
}

void CCVKAccelerationStructure::doInit(const AccelerationStructureInfo& info) {
    _gpuAccelerationStructure = ccnew CCVKGPUAccelerationStructure;

    doSetInfo(info);

    cmdFuncCCVKCreateAcclerationStructure(CCVKDevice::getInstance(), _gpuAccelerationStructure); 
}

void CCVKAccelerationStructure::doUpdate() {

    auto* device = CCVKDevice::getInstance();
    auto* cmdBuf = device->getCommandBuffer();

    cmdBuf->begin();
    cmdBuf->updateAccelerationStructure(this);
    cmdBuf->end();

    device->flushCommands(&cmdBuf, 1);
    device->getQueue()->submit(&cmdBuf, 1);
}

void CCVKAccelerationStructure::doBuild() {

    auto* device = CCVKDevice::getInstance();
    auto* cmdBuf = device->getCommandBuffer();

    cmdBuf->begin();
    cmdBuf->buildAccelerationStructure(this);
    cmdBuf->end();
    device->flushCommands(&cmdBuf, 1);
    device->getQueue()->submit(&cmdBuf, 1);
    //device->waitAllFences();
}

void CCVKAccelerationStructure::doBuild(const IntrusivePtr<Buffer>& scratchBuffer) {
    auto* device = CCVKDevice::getInstance();
    auto* cmdBuf = device->getCommandBuffer();

    cmdBuf->begin();
    cmdBuf->buildAccelerationStructure(this, scratchBuffer);
    cmdBuf->end();
    device->flushCommands(&cmdBuf, 1);
    device->getQueue()->submit(&cmdBuf, 1);
}


void CCVKAccelerationStructure::doCompact() {
    auto* device = CCVKDevice::getInstance();
    IntrusivePtr<CCVKAccelerationStructure> compactedAccel = ccnew CCVKAccelerationStructure;
    compactedAccel->_gpuAccelerationStructure = ccnew CCVKGPUAccelerationStructure;

    auto* cmdBuf = device->getCommandBuffer();
    cmdBuf->begin();
    cmdBuf->compactAccelerationStructure(this,compactedAccel);
    cmdBuf->end();
    device->flushCommands(&cmdBuf, 1);
    device->getQueue()->submit(&cmdBuf, 1);

    //device->waitAllFences();
    
    device->gpuRecycleBin()->collect(_gpuAccelerationStructure);
    _gpuAccelerationStructure->vkAccelerationStructure = compactedAccel->_gpuAccelerationStructure->vkAccelerationStructure;
    _gpuAccelerationStructure->backingBuffer = compactedAccel->_gpuAccelerationStructure->backingBuffer;
    compactedAccel->_gpuAccelerationStructure->vkAccelerationStructure = VK_NULL_HANDLE;
}

void CCVKAccelerationStructure::doDestroy() {
    _gpuAccelerationStructure = nullptr;
}

void CCVKGPUAccelerationStructure::shutdown() {
    if (vkCompactedSizeQueryPool) {
        vkDestroyQueryPool(CCVKDevice::getInstance()->gpuDevice()->vkDevice, vkCompactedSizeQueryPool, nullptr);
    }
    vkCompactedSizeQueryPool = VK_NULL_HANDLE;
    CCVKDevice::getInstance()->gpuRecycleBin()->collect(this);
    backingBuffer = nullptr;
    instancesBuffer = nullptr;
    scratchBuffer = nullptr;
    aabbsBuffer = nullptr;
}


} // namespace gfx
} //namespace cc
