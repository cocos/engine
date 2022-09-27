/****************************************************************************
 Copyright (c) 2019-2022 Xiamen Yaji Software Co., Ltd.

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

#include "base/std/hash/hash.h"

#include "GFXObject.h"
#include "GFXRenderPass.h"
#include "base/Utils.h"
#include "gfx-base/GFXDef-common.h"

namespace cc {
namespace gfx {

RenderPass::RenderPass()
: GFXObject(ObjectType::RENDER_PASS) {
}

RenderPass::~RenderPass() = default;

// Based on render pass compatibility
ccstd::hash_t RenderPass::computeHash() {
    ccstd::hash_t seed = static_cast<uint32_t>(_colorAttachments.size()) * 2 + 3;
    for (const ColorAttachment &ca : _colorAttachments) {
        ccstd::hash_combine(seed, ca);
    }
    const auto &ds = _depthStencilAttachment;
    ccstd::hash_combine(seed, ds);
    ccstd::hash_combine(seed, _fsrInfo.enabled);
    if(_fsrInfo.enabled) {
        ccstd::hash_combine(seed, _fsrInfo.ratio);
    }
    ccstd::hash_combine(seed, _subpasses);
    return seed;
}

ccstd::hash_t RenderPass::computeHash(const RenderPassInfo &info) {
    return Hasher<RenderPassInfo>()(info);
}

void RenderPass::initialize(const RenderPassInfo &info) {
    _colorAttachments = info.colorAttachments;
    _depthStencilAttachment = info.depthStencilAttachment;
    _subpasses = info.subpasses;
    _dependencies = info.dependencies;
    _hash = computeHash();
    _fsrInfo = info.fsrInfo;
    _taaInfo = info.taaInfo;

    doInit(info);
}

void RenderPass::destroy() {
    doDestroy();

    _colorAttachments.clear();
    _subpasses.clear();
    _hash = 0U;
}

} // namespace gfx
} // namespace cc
