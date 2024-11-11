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

#pragma once

#include "VKGPUObjects.h"
#include "VKStd.h"
#include "gfx-base/GFXAccelerationStructure.h"

namespace cc {

namespace gfx {

struct CCVKGPUAccelerationStructure;

class CC_VULKAN_API CCVKAccelerationStructure final : public AccelerationStructure {
public:

    CCVKAccelerationStructure();
    ~CCVKAccelerationStructure() override;

    inline CCVKGPUAccelerationStructure *gpuAccelerationStructure() const { return _gpuAccelerationStructure; }

protected:
    void doInit(const AccelerationStructureInfo &info) override;
    void doDestroy() override;
    void doUpdate() override;
    void doBuild() override;
    void doBuild(const IntrusivePtr<Buffer>& scratchBuffer) override;
    void doCompact() override;
    uint64_t doGetBuildScratchSize() const override { return _gpuAccelerationStructure->buildSizesInfo.buildScratchSize; }
    uint64_t doGetUpdateScratchSize() const override { return _gpuAccelerationStructure->buildSizesInfo.buildScratchSize; }
    void doSetInfo(const AccelerationStructureInfo& info) override {
        _info = info;
        if (!info.instances.empty()) {
            _gpuAccelerationStructure->geomtryInfos = info.instances;
        } else if (!info.triangleMeshes.empty()) {
            _gpuAccelerationStructure->geomtryInfos = info.triangleMeshes;
        } else if (!info.aabbs.empty()) {
            _gpuAccelerationStructure->geomtryInfos = info.aabbs;
        }

        _gpuAccelerationStructure->buildFlags = info.buildFlag;
    }

    IntrusivePtr<CCVKGPUAccelerationStructure> _gpuAccelerationStructure;
};

} // namespace gfx
} // namespace cc
