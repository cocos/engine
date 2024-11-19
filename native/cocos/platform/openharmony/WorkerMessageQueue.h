/****************************************************************************
 Copyright (c) 2021-2023 Xiamen Yaji Software Co., Ltd.

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

#include <queue>

#include <thread>
#include <mutex>


namespace cc {

enum class MessageType {
    WM_XCOMPONENT_SURFACE_CREATED = 0,
    WM_XCOMPONENT_TOUCH_EVENT,
    WM_XCOMPONENT_SURFACE_CHANGED,
    WM_XCOMPONENT_SURFACE_HIDE,
    WM_XCOMPONENT_SURFACE_SHOW,
    WM_XCOMPONENT_SURFACE_DESTROY,
    WM_APP_SHOW,
    WM_APP_HIDE,
    WM_APP_DESTROY,
    WM_VSYNC,
};

struct WorkerMessageData {
    MessageType type;
    void* data;
    void* window;
};

class WorkerMessageQueue final {
public:
    void   enqueue(const WorkerMessageData& data);
    bool   dequeue(WorkerMessageData *data);
    bool   empty() const;
    size_t size() const {
        return _queue.size();
    }

private:
    std::mutex                    _mutex;
    std::queue<WorkerMessageData> _queue;
};

} // namespace cc
