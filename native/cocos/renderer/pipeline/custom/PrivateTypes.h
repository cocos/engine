/*
 Copyright (c) 2021-2024 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com

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
*/

/**
 * ========================= !DO NOT CHANGE THE FOLLOWING SECTION MANUALLY! =========================
 * The following section is auto-generated.
 * ========================= !DO NOT CHANGE THE FOLLOWING SECTION MANUALLY! =========================
 */
// clang-format off
// NOLINTBEGIN(misc-include-cleaner, bugprone-easily-swappable-parameters)
#pragma once
#include "cocos/renderer/core/ProgramLib.h"
#include "cocos/renderer/pipeline/custom/PrivateFwd.h"
#include "cocos/renderer/pipeline/custom/RenderInterfaceTypes.h"


namespace cc {

namespace render {

class ProgramProxy : public RefCounted {
public:
    ProgramProxy() = default;
    ProgramProxy(ProgramProxy&& rhs) = delete;
    ProgramProxy(ProgramProxy const& rhs) = delete;
    ProgramProxy& operator=(ProgramProxy&& rhs) = delete;
    ProgramProxy& operator=(ProgramProxy const& rhs) = delete;
    ~ProgramProxy() noexcept override = default;

    virtual const ccstd::string &getName() const noexcept = 0;
    virtual gfx::Shader *getShader() const noexcept = 0;
};

class ProgramLibrary {
public:
    ProgramLibrary() noexcept = default;
    ProgramLibrary(ProgramLibrary&& rhs) = delete;
    ProgramLibrary(ProgramLibrary const& rhs) = delete;
    ProgramLibrary& operator=(ProgramLibrary&& rhs) = delete;
    ProgramLibrary& operator=(ProgramLibrary const& rhs) = delete;
    virtual ~ProgramLibrary() noexcept = default;

    virtual void addEffect(const EffectAsset *effectAsset) = 0;
    virtual void precompileEffect(gfx::Device *device, EffectAsset *effectAsset) = 0;
    virtual ccstd::string getKey(uint32_t phaseID, const ccstd::string &programName, const MacroRecord &defines) const = 0;
    virtual IntrusivePtr<gfx::PipelineLayout> getPipelineLayout(gfx::Device *device, uint32_t phaseID, const ccstd::string &programName) = 0;
    virtual const gfx::DescriptorSetLayout &getMaterialDescriptorSetLayout(gfx::Device *device, uint32_t phaseID, const ccstd::string &programName) = 0;
    virtual const gfx::DescriptorSetLayout &getLocalDescriptorSetLayout(gfx::Device *device, uint32_t phaseID, const ccstd::string &programName) = 0;
    virtual const IProgramInfo &getProgramInfo(uint32_t phaseID, const ccstd::string &programName) const = 0;
    virtual const gfx::ShaderInfo &getShaderInfo(uint32_t phaseID, const ccstd::string &programName) const = 0;
    virtual ProgramProxy *getProgramVariant(gfx::Device *device, uint32_t phaseID, const ccstd::string &name, MacroRecord &defines, const ccstd::pmr::string *key) = 0;
    virtual gfx::PipelineState *getComputePipelineState(gfx::Device *device, uint32_t phaseID, const ccstd::string &name, MacroRecord &defines, const ccstd::pmr::string *key) = 0;
    virtual const ccstd::vector<int> &getBlockSizes(uint32_t phaseID, const ccstd::string &programName) const = 0;
    virtual const ccstd::unordered_map<ccstd::string, uint32_t> &getHandleMap(uint32_t phaseID, const ccstd::string &programName) const = 0;
    virtual uint32_t getProgramID(uint32_t phaseID, const ccstd::pmr::string &programName) = 0;
    virtual uint32_t getDescriptorNameID(const ccstd::pmr::string &name) = 0;
    virtual const ccstd::pmr::string &getDescriptorName(uint32_t nameID) = 0;
    ProgramProxy *getProgramVariant(gfx::Device *device, uint32_t phaseID, const ccstd::string &name, MacroRecord &defines) {
        return getProgramVariant(device, phaseID, name, defines, nullptr);
    }
    gfx::PipelineState *getComputePipelineState(gfx::Device *device, uint32_t phaseID, const ccstd::string &name, MacroRecord &defines) {
        return getComputePipelineState(device, phaseID, name, defines, nullptr);
    }
};

} // namespace render

} // namespace cc

// NOLINTEND(misc-include-cleaner, bugprone-easily-swappable-parameters)
// clang-format on
