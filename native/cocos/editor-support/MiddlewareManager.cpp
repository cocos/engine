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

#include "MiddlewareManager.h"
#include <algorithm>
#include "2d/renderer/Batcher2d.h"
#include "SeApi.h"
#include "core/Root.h"

MIDDLEWARE_BEGIN

MiddlewareManager *MiddlewareManager::instance = nullptr;

MiddlewareManager::MiddlewareManager() : _renderInfo(se::Object::TypedArrayType::UINT32),
                                         _attachInfo(se::Object::TypedArrayType::FLOAT32) {
}

MiddlewareManager::~MiddlewareManager() {
    for (auto it : _mbMap) {
        auto *buffer = it.second;

        delete buffer;
    }
    _mbMap.clear();
}

MeshBuffer *MiddlewareManager::getMeshBuffer(int format) {
    MeshBuffer *mb = _mbMap[format];
    if (!mb) {
        mb = new MeshBuffer(format);
        _mbMap[format] = mb;
    }
    return mb;
}

void MiddlewareManager::updateCache() {
    for (auto &iter: _updateMap) {
        auto it = std::find(_updateList.begin(), _updateList.end(), iter.first);
        if (iter.second && it == _updateList.end()) {
            _updateList.push_back(iter.first);
        } else if (!iter.second && it != _updateList.end()) {
            _updateList.erase(it);
        }
    }
    _updateMap.clear();
}

void MiddlewareManager::update(float dt) {
    updateCache();
    _attachInfo.reset();
    auto *attachBuffer = _attachInfo.getBuffer();
    if (attachBuffer) {
        attachBuffer->writeUint32(0);
    }

    for (size_t i = 0, len = _updateList.size(); i < len; ++i) {
        auto *editor = _updateList[i];
        editor->update(dt);
    }
}

void MiddlewareManager::render(float dt) {
    for (auto it : _mbMap) {
        auto *buffer = it.second;
        if (buffer) {
            buffer->reset();
        }
    }


    for (size_t i = 0, len = _updateList.size(); i < len; ++i) {
        auto *editor = _updateList[i];
        editor->render(dt);
    }

    for (auto it : _mbMap) {
        auto *buffer = it.second;
        if (buffer) {
            buffer->uploadIB();
            buffer->uploadVB();
        }

        uint16_t accID = 65534;
        auto *batch2d = Root::getInstance()->getBatcher2D();
        if (it.first == VF_XYZUVCC) {
            accID = 65535;
        }
        ccstd::vector<UIMeshBuffer *> uiMeshArray;
        auto &uiBufArray = buffer->uiMeshBuffers();
        for (auto &item : uiBufArray) {
            uiMeshArray.push_back((UIMeshBuffer *)item);
        }
        batch2d->syncMeshBuffersToNative(accID, std::move(uiMeshArray));
    }
}

void MiddlewareManager::addTimer(IMiddleware *editor) {
    _updateMap[editor] = true;
}

void MiddlewareManager::removeTimer(IMiddleware *editor) {
    _updateMap[editor] = false;
}

se_object_ptr MiddlewareManager::getVBTypedArray(int format, int bufferPos) {
    MeshBuffer *mb = _mbMap[format];
    if (!mb) return nullptr;
    return mb->getVBTypedArray(bufferPos);
}

se_object_ptr MiddlewareManager::getIBTypedArray(int format, int bufferPos) {
    MeshBuffer *mb = _mbMap[format];
    if (!mb) return nullptr;
    return mb->getIBTypedArray(bufferPos);
}

SharedBufferManager *MiddlewareManager::getRenderInfoMgr() {
    return &_renderInfo;
}

SharedBufferManager *MiddlewareManager::getAttachInfoMgr() {
    return &_attachInfo;
}

std::size_t MiddlewareManager::getVBTypedArrayLength(int format, std::size_t bufferPos) {
    MeshBuffer *mb = _mbMap[format];
    if (!mb) return 0;
    return mb->getVBTypedArrayLength(bufferPos);
}

std::size_t MiddlewareManager::getIBTypedArrayLength(int format, std::size_t bufferPos) {
    MeshBuffer *mb = _mbMap[format];
    if (!mb) return 0;
    return mb->getIBTypedArrayLength(bufferPos);
}

std::size_t MiddlewareManager::getBufferCount(int format) {
    MeshBuffer *mb = getMeshBuffer(format);
    if (!mb) return 0;
    return mb->getBufferCount();
}

MIDDLEWARE_END
