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

#ifdef CC_WGPU_WASM
    #include "WGPUDef.h"
#endif
#include "gfx-base/GFXQueue.h"

namespace cc {
namespace gfx {

struct CCWGPUQueueObject;

class CCWGPUQueue final : public Queue {
public:
    CCWGPUQueue();
    ~CCWGPUQueue();

    void submit(CommandBuffer *const *cmdBuffs, uint32_t count) override;
    inline CCWGPUQueueObject *gpuQueueObject() { return _gpuQueueObject; }
    inline uint32_t getNumDrawCalls() const { return _numDrawCalls; }
    inline uint32_t getNumInstances() const { return _numInstances; }
    inline uint32_t getNumTris() const { return _numTriangles; }

    inline void resetStatus() { _numDrawCalls = _numInstances = _numTriangles = 0; }

protected:
    void doInit(const QueueInfo &info) override;
    void doDestroy() override;

    CCWGPUQueueObject *_gpuQueueObject = nullptr;

    uint32_t _numDrawCalls = 0;
    uint32_t _numInstances = 0;
    uint32_t _numTriangles = 0;
};

} // namespace gfx
} // namespace cc
