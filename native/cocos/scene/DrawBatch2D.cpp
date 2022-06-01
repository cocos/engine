/****************************************************************************
 Copyright (c) 2021-2022 Xiamen Yaji Software Co., Ltd.

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

#include "DrawBatch2D.h"
#include "core/Root.h"
#include "core/assets/Material.h"
#include "scene/Pass.h"

namespace cc {
namespace scene {

    DrawBatch2D::DrawBatch2D() {

    }

    DrawBatch2D::~DrawBatch2D() {

    }

    void DrawBatch2D::clear() {
    }

    void DrawBatch2D::fillPass(Material *mat, gfx::DepthStencilState *depthStencilState, ccstd::hash_t dsHash, gfx::BlendState *blendState, ccstd::hash_t bsHash, ccstd::vector<IMacroPatch> *patches) {
        auto &passes = *mat->getPasses();
        if (passes.empty()) return;
        uint32_t hashFactor = 0;
        _shaders.clear();
        if (_passes.size() < passes.size()) {
            uint32_t num = passes.size() - _passes.size();
            for (uint32_t i = 0; i < num; ++i) {
                _passes.push_back(*new Pass());
            }
        }

        for (uint32_t i = 0; i < passes.size(); ++i) {
            Pass *pass = passes[i];
            Pass *passInUse = &_passes[i];
            pass->update();
            // 可能有负值问题
            // if (bsHash == -1) {bsHash = 0;}
            hashFactor = (dsHash << 16) | bsHash;
            passInUse->initPassFromTarget(pass, *depthStencilState, *blendState, hashFactor);
            _shaders.push_back(passInUse->getShaderVariant(*patches));
        }
    }

} // namespace scene
} // namespace cc
