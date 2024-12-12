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

#include <unordered_map>
#include <vector>
#include "MeshBuffer.h"
#include "MiddlewareMacro.h"
#include "SharedBufferManager.h"
#include "base/RefCounted.h"

MIDDLEWARE_BEGIN

/**
 * All middleware must implement IMiddleware interface.
 */
class IMiddleware {
public:
    IMiddleware() = default;
    virtual ~IMiddleware() = default;
    virtual void update(float dt) = 0;
    virtual void render(float dt) = 0;
};

/**
 * Update all middleware,and fill vertex and index into buffer,
 * and then upload vertex buffer,index buffer to opengl.
 */
class MiddlewareManager {
public:
    static MiddlewareManager *getInstance() {
        if (instance == nullptr) {
            instance = new MiddlewareManager;
        }

        return instance;
    }

    static void destroyInstance() {
        if (instance) {
            delete instance;
            instance = nullptr;
        }
    }

    static uint8_t generateModuleID() {
        static uint8_t uniqueId = 0;
        uniqueId++;
        return uniqueId;
    }

    /**
     * @brief update all elements
     * @param[in] dt Delta time.
     */
    void update(float dt);

    /**
     * @brief render all elements
     */
    void render(float dt);

    /**
     * @brief Mark the add flag to _operateCacheMap, and perform the update in the next frame
     * @param[in] editor Module must implement IMiddleware interface.
     */
    void addTimer(IMiddleware *editor);

    /**
     * @brief Mark the remove flag to _operateCacheMap, and perform the update in the next frame
     * @param[in] editor Module must implement IMiddleware interface.
     */
    void removeTimer(IMiddleware *editor);

    MeshBuffer *getMeshBuffer(int format);

    se_object_ptr getVBTypedArray(int format, int bufferPos);
    se_object_ptr getIBTypedArray(int format, int bufferPos);
    std::size_t getBufferCount(int format);
    std::size_t getVBTypedArrayLength(int format, std::size_t bufferPos);
    std::size_t getIBTypedArrayLength(int format, std::size_t bufferPos);

    SharedBufferManager *getRenderInfoMgr();
    SharedBufferManager *getAttachInfoMgr();

    MiddlewareManager();
    ~MiddlewareManager();

private:
    void updateOperateCache();

    ccstd::vector<IMiddleware *> _updateList;
    ccstd::unordered_map<IMiddleware *, bool> _operateCacheMap;
    ccstd::unordered_map<int, MeshBuffer *> _mbMap;

    SharedBufferManager _renderInfo;
    SharedBufferManager _attachInfo;

    static MiddlewareManager *instance;
};
MIDDLEWARE_END
