/****************************************************************************
 Copyright (c) 2021-2023 Xiamen Yaji Software Co., Ltd.

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

#include <cstdint>
#include <memory>
#include "base/Ptr.h"
#include "base/RefCounted.h"
#include "core/assets/RenderingSubMesh.h"
#include "renderer/gfx-base/GFXDescriptorSet.h"
#include "renderer/gfx-base/GFXInputAssembler.h"
#include "renderer/gfx-base/GFXShader.h"
#include "renderer/pipeline/Define.h"
#include "scene/Define.h"

namespace cc {
namespace scene {
class Pass;
struct InstancedAttributeBlock {
    Uint8Array buffer;
    ccstd::vector<TypedArray> views;
    ccstd::vector<gfx::Attribute> attributes;
};

using SharedPassArray = std::shared_ptr<ccstd::vector<IntrusivePtr<Pass>>>;

class SubModel : public RefCounted {
public:
    SubModel();
    ~SubModel() override = default;

    void update();

    gfx::Shader *getShader(uint32_t) const;
    Pass *getPass(uint32_t) const;

    inline void setWorldBoundDescriptorSet(gfx::DescriptorSet *descriptorSet) { _worldBoundDescriptorSet = descriptorSet; }
    inline void setDescriptorSet(gfx::DescriptorSet *descriptorSet) { _descriptorSet = descriptorSet; }
    inline void setInputAssembler(gfx::InputAssembler *ia) { _inputAssembler = ia; }
    inline void setShaders(const ccstd::vector<IntrusivePtr<gfx::Shader>> &shaders) { _shaders = shaders; }
    void setPasses(const SharedPassArray &passes);
    inline void setPriority(pipeline::RenderPriority priority) { _priority = priority; }
    inline void setOwner(Model *model) { _owner = model; }
    void setSubMesh(RenderingSubMesh *subMesh);
    inline void setInstancedWorldMatrixIndex(int32_t worldMatrixIndex) { _instancedWorldMatrixIndex = worldMatrixIndex; }
    inline void setInstancedSHIndex(int32_t index) { _instancedSHIndex = index; }
    void setInstancedAttribute(const ccstd::string &name, const TypedArray &value);

    inline gfx::DescriptorSet *getDescriptorSet() const { return _descriptorSet; }
    inline gfx::DescriptorSet *getWorldBoundDescriptorSet() const { return _worldBoundDescriptorSet; }
    inline gfx::InputAssembler *getInputAssembler() const { return _inputAssembler; }
    inline const ccstd::vector<IntrusivePtr<gfx::Shader>> &getShaders() const { return _shaders; }
    inline const SharedPassArray &getPasses() const { return _passes; }
    inline const ccstd::vector<IMacroPatch> &getPatches() const { return _patches; }
    inline pipeline::RenderPriority getPriority() const { return _priority; }
    inline RenderingSubMesh *getSubMesh() const { return _subMesh; }
    inline Model *getOwner() const { return _owner; }
    inline uint32_t getId() const { return _id; }
    inline InstancedAttributeBlock &getInstancedAttributeBlock() { return _instancedAttributeBlock; }
    inline int32_t getInstancedWorldMatrixIndex() const { return _instancedWorldMatrixIndex; }
    inline int32_t getInstancedSHIndex() const { return _instancedSHIndex; }
    int32_t getInstancedAttributeIndex(const ccstd::string &name) const;

    void initialize(RenderingSubMesh *subMesh, const SharedPassArray &passes, const ccstd::vector<IMacroPatch> &patches);
    void destroy();
    void onPipelineStateChanged();
    void onMacroPatchesStateChanged(const ccstd::vector<IMacroPatch> &patches);
    void onGeometryChanged();
    void updateInstancedAttributes(const ccstd::vector<gfx::Attribute> &attributes);
    void updateInstancedWorldMatrix(const Mat4 &mat, int32_t idx);
    void updateInstancedSH(const Float32Array &data, int32_t idx);
    inline int32_t getReflectionProbeType() const { return _reflectionProbeType; }
    void setReflectionProbeType(int32_t val) { _reflectionProbeType = val; }

protected:
    void flushPassInfo();

    pipeline::RenderPriority _priority{pipeline::RenderPriority::DEFAULT};

    int32_t _id{-1};
    int32_t _instancedWorldMatrixIndex{-1};
    int32_t _instancedSHIndex{-1};

    gfx::Device *_device{nullptr};
    Model *_owner{nullptr};
    gfx::Sampler *_reflectionSampler{nullptr};

    IntrusivePtr<gfx::InputAssembler> _inputAssembler;
    IntrusivePtr<gfx::DescriptorSet> _descriptorSet;
    IntrusivePtr<gfx::DescriptorSet> _worldBoundDescriptorSet;
    IntrusivePtr<gfx::Texture> _reflectionTex;
    IntrusivePtr<RenderingSubMesh> _subMesh;

    InstancedAttributeBlock _instancedAttributeBlock{};
    MacroRecord _globalPatches;

    ccstd::vector<IMacroPatch> _patches;
    ccstd::vector<IntrusivePtr<gfx::Shader>> _shaders;

    SharedPassArray _passes;

    int32_t _reflectionProbeType{0};

private:
    static inline int32_t generateId() {
        static int32_t generator = 0;
        return generator++;
    }

    CC_DISALLOW_COPY_MOVE_ASSIGN(SubModel);
};

} // namespace scene
} // namespace cc
