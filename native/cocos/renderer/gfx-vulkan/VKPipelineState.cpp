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

#include "VKPipelineState.h"
#include "VKCommands.h"
#include "VKDevice.h"
#include "VKPipelineLayout.h"
#include "VKRenderPass.h"
#include "VKShader.h"

namespace cc {
namespace gfx {

CCVKPipelineState::CCVKPipelineState() {
    _typedID = generateObjectID<decltype(this)>();
}

CCVKPipelineState::~CCVKPipelineState() {
    destroy();
}

void CCVKPipelineState::doInit(const PipelineStateInfo & /*info*/) {
    _gpuPipelineState = ccnew CCVKGPUPipelineState;
    _gpuPipelineState->bindPoint = _bindPoint;
    _gpuPipelineState->primitive = _primitive;
    _gpuPipelineState->gpuShader = static_cast<CCVKShader *>(_shader)->gpuShader();
    _gpuPipelineState->inputState = _inputState;
    _gpuPipelineState->rs = _rasterizerState;
    _gpuPipelineState->dss = _depthStencilState;
    _gpuPipelineState->bs = _blendState;
    _gpuPipelineState->subpass = _subpass;
    _gpuPipelineState->gpuPipelineLayout = static_cast<CCVKPipelineLayout *>(_pipelineLayout)->gpuPipelineLayout();
    if (_renderPass) _gpuPipelineState->gpuRenderPass = static_cast<CCVKRenderPass *>(_renderPass)->gpuRenderPass();

    for (uint32_t i = 0; i < 31; i++) {
        if (static_cast<uint32_t>(_dynamicStates) & (1 << i)) {
            _gpuPipelineState->dynamicStates.push_back(static_cast<DynamicStateFlagBit>(1 << i));
        }
    }

    if (_bindPoint == PipelineBindPoint::GRAPHICS) {
        cmdFuncCCVKCreateGraphicsPipelineState(CCVKDevice::getInstance(), _gpuPipelineState);
    } else if(_bindPoint == PipelineBindPoint::COMPUTE) {
        cmdFuncCCVKCreateComputePipelineState(CCVKDevice::getInstance(), _gpuPipelineState);
    } else if (_bindPoint == PipelineBindPoint::RAY_TRACING) {
        cmdFuncCCVKCreateRayTracingPipelineState(CCVKDevice::getInstance(), _gpuPipelineState);
        /*
        const uint32_t shaderGroupHandleSize = CCVKDevice::getInstance()->gpuContext()->physicalDeviceRaytracingPipelineProperties.shaderGroupHandleSize;
        const uint32_t shaderGroupBaseAlignment = CCVKDevice::getInstance()->gpuContext()->physicalDeviceRaytracingPipelineProperties.shaderGroupBaseAlignment;
        const uint32_t shaderGroupHandleAlignment = CCVKDevice::getInstance()->gpuContext()->physicalDeviceRaytracingPipelineProperties.shaderGroupHandleAlignment;
        const uint32_t shaderGroupCount = static_cast<uint32_t>(_gpuPipelineState->gpuShader->gpuGroups.size());
        const uint32_t shaderHandlesStorageSize = shaderGroupHandleSize * shaderGroupCount;
        std::vector<uint8_t> shaderHandlesStorage(shaderHandlesStorageSize);
        vkGetRayTracingShaderGroupHandlesKHR(CCVKDevice::getInstance()->gpuDevice()->vkDevice, _gpuPipelineState->vkPipeline, 0, shaderGroupCount, shaderHandlesStorageSize,shaderHandlesStorage.data());
        */
    }
}

void CCVKPipelineState::doDestroy() {
    _gpuPipelineState = nullptr;
}

void CCVKGPUPipelineState::shutdown() {
    CCVKDevice::getInstance()->gpuRecycleBin()->collect(this);
}

} // namespace gfx
} // namespace cc
