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
#include "base/Ptr.h"
#include "base/RefCounted.h"
#include "base/std/container/string.h"
#include "core/ArrayBuffer.h"
#include "core/TypedArray.h"
#include "core/assets/EffectAsset.h"
#include "renderer/core/PassUtils.h"
#include "renderer/gfx-base/GFXBuffer.h"
#include "renderer/gfx-base/GFXDef-common.h"
#include "renderer/gfx-base/GFXDescriptorSet.h"
#include "renderer/gfx-base/GFXDevice.h"
#include "renderer/pipeline/Define.h"

namespace cc {

class Root;
struct IProgramInfo;
namespace pipeline {
class InstancedBuffer;
} // namespace pipeline
namespace scene {
struct IMacroPatch;

struct PassDynamicsValue {
    bool dirty{false};
    float value{0.F};
};
using IPassDynamics = ccstd::unordered_map<uint32_t, PassDynamicsValue>;

enum class BatchingSchemes {
    NONE = 0,
    INSTANCING = 1,
};

struct IBlockRef {
    float *data{nullptr};
    size_t count{0};
    size_t offset{0};
};

class Pass : public RefCounted {
public:
    /**
     * @en Get the type of member in uniform buffer object with the handle
     * @zh 根据 handle 获取 uniform 的具体类型。
     */
    static gfx::Type getTypeFromHandle(uint32_t handle) {
        return cc::getTypeFromHandle(handle);
    }

    /**
     * @en Get the binding with handle
     * @zh 根据 handle 获取 binding。
     */
    static uint32_t getBindingFromHandle(uint32_t handle) {
        return cc::getBindingFromHandle(handle);
    }

    /**
     * @en Get the array length with handle
     * @zh 根据 handle 获取数组长度。
     */
    static uint32_t getCountFromHandle(uint32_t handle) {
        return cc::getCountFromHandle(handle);
    }

    static uint32_t getOffsetFromHandle(uint32_t handle) {
        return cc::getOffsetFromHandle(handle);
    }

    /**
     * @en Fill a pass represented by the given pass handle with the given override info
     * @param pass The pass handle point to the pass
     * @param info The pass override info
     */
    static void fillPipelineInfo(Pass *pass, const IPassInfoFull &info);

    /**
     * @en Get pass hash value by [[Pass]] hash information.
     * @zh 根据 [[Pass]] 的哈希信息获取哈希值。
     *
     * @param pass Handle of the pass info used to compute hash value.
     */
    static ccstd::hash_t getPassHash(Pass *pass);

    Pass();
    explicit Pass(Root *root);
    ~Pass() override;

    /**
     * @en Initialize the pass with given pass info, shader will be compiled in the init process
     * @zh 根据指定参数初始化当前 pass，shader 会在这一阶段就尝试编译。
     */
    void initialize(const IPassInfoFull &info);

    /**
     * @en Get the handle of a UBO member, or specific channels of it.
     * @zh 获取指定 UBO 成员，或其更具体分量的读写句柄。默认以成员自身的类型为目标读写类型（即读写时必须传入与成员类型相同的变量）。
     * @param name Name of the target UBO member.
     * @param offset Channel offset into the member.
     * @param targetType Target type of the handle, i.e. the type of data when read/write to it.
     * @example
     * ```
     * import { Vec3, gfx } from 'cc';
     * // say 'pbrParams' is a uniform vec4
     * const hParams = pass.getHandle('pbrParams'); // get the default handle
     * pass.setUniform(hAlbedo, new Vec3(1, 0, 0)); // wrong! pbrParams.w is NaN now
     *
     * // say 'albedoScale' is a uniform vec4, and we only want to modify the w component in the form of a single float
     * const hThreshold = pass.getHandle('albedoScale', 3, gfx.Type.FLOAT);
     * pass.setUniform(hThreshold, 0.5); // now, albedoScale.w = 0.5
     * ```
     */
    uint32_t getHandle(const ccstd::string &name, uint32_t offset = 0, gfx::Type targetType = gfx::Type::UNKNOWN) const;

    /**
     * @en Gets the uniform binding with its name
     * @zh 获取指定 uniform 的 binding。
     * @param name The name of target uniform
     */
    uint32_t getBinding(const ccstd::string &name) const;

    /**
     * @en Sets a vector type uniform value, if a uniform requires frequent update, please use this method.
     * @zh 设置指定普通向量类 uniform 的值，如果需要频繁更新请尽量使用此接口。
     * @param handle The handle for the target uniform
     * @param value New value
     */
    void setUniform(uint32_t handle, const MaterialProperty &value);

    /**
     * @en Gets a uniform's value.
     * @zh 获取指定普通向量类 uniform 的值。
     * @param handle The handle for the target uniform
     */
    MaterialProperty getUniform(uint32_t handle) const;

    /**
     * @en Sets an array type uniform value, if a uniform requires frequent update, please use this method.
     * @zh 设置指定数组类 uniform 的值，如果需要频繁更新请尽量使用此接口。
     * @param handle The handle for the target uniform
     * @param value New value
     */
    void setUniformArray(uint32_t handle, const MaterialPropertyList &value);

    /**
     * @en Bind a GFX [[Texture]] the given uniform binding
     * @zh 绑定实际 GFX [[Texture]] 到指定 binding。
     * @param binding The binding for target uniform of texture type
     * @param value Target texture
     */
    void bindTexture(uint32_t binding, gfx::Texture *value, uint32_t index = 0);

    /**
     * @en Bind a GFX [[Sampler]] the given uniform binding
     * @zh 绑定实际 GFX [[Sampler]] 到指定 binding。
     * @param binding The binding for target uniform of sampler type
     * @param value Target sampler
     */
    void bindSampler(uint32_t binding, gfx::Sampler *value, uint32_t index = 0);

    /**
     * @en Sets the dynamic pipeline state property at runtime
     * @zh 设置运行时 pass 内可动态更新的管线状态属性。
     * @param state Target dynamic state
     * @param value Target value
     */
    void setDynamicState(gfx::DynamicStateFlagBit state, float value);

    /**
     * @en Override all pipeline states with the given pass override info.
     * @zh 重载当前所有管线状态。
     * @param original The original pass info
     * @param value The override pipeline state info
     */
    virtual void overridePipelineStates(const IPassInfo &original, const PassOverrides &overrides);

    void update();

    pipeline::InstancedBuffer *getInstancedBuffer(int32_t extraKey = 0);

    /**
     * @en Destroy the current pass.
     * @zh 销毁当前 pass。
     */
    void destroy();

    /**
     * @en Resets the value of the given uniform by name to the default value in [[EffectAsset]].
     * This method does not support array type uniform.
     * @zh 重置指定（非数组） Uniform 为 [[EffectAsset]] 默认值。
     */
    void resetUniform(const ccstd::string &name);

    void resetTexture(const ccstd::string &name);

    /**
     * @en Resets the value of the given texture by name to the default value in [[EffectAsset]].
     * @zh 重置指定贴图为 [[EffectAsset]] 默认值。
     */
    void resetTexture(const ccstd::string &name, uint32_t index);

    /**
     * @en Resets all uniform buffer objects to the default values in [[EffectAsset]]
     * @zh 重置所有 UBO 为默认值。
     */
    void resetUBOs();

    /**
     * @en Resets all textures and samplers to the default values in [[EffectAsset]]
     * @zh 重置所有 texture 和 sampler 为初始默认值。
     */
    void resetTextures();

    /**
     * @en Try to compile the shader and retrieve related resources references.
     * @zh 尝试编译 shader 并获取相关资源引用。
     */
    virtual bool tryCompile();
    virtual bool tryCompile(const ccstd::optional<MacroRecord> & /*defineOverrides*/) { return Pass::tryCompile(); }

    /**
     * @en Gets the shader variant of the current pass and given macro patches
     * @zh 结合指定的编译宏组合获取当前 Pass 的 Shader Variant
     * @param patches The macro patches
     */
    gfx::Shader *getShaderVariant();
    gfx::Shader *getShaderVariant(const ccstd::vector<IMacroPatch> &patches);

    IPassInfoFull getPassInfoFull() const;

    // infos
    inline Root *getRoot() const { return _root; }
    inline gfx::Device *getDevice() const { return _device; }
    inline const IProgramInfo *getShaderInfo() const { return _shaderInfo; }
    const gfx::DescriptorSetLayout *getLocalSetLayout() const;
    inline const ccstd::string &getProgram() const { return _programName; }
    inline const PassPropertyInfoMap &getProperties() const { return _properties; }
    inline const MacroRecord &getDefines() const { return _defines; }
    inline MacroRecord &getDefines() { return _defines; }
    inline index_t getPassIndex() const { return _passIndex; }
    inline index_t getPropertyIndex() const { return _propertyIndex; }
    // data
    inline const IPassDynamics &getDynamics() const { return _dynamics; }
    inline const ccstd::vector<IBlockRef> &getBlocks() const { return _blocks; }
    inline ArrayBuffer *getRootBlock() { return _rootBlock; }
    inline bool isRootBufferDirty() const { return _rootBufferDirty; }
    inline void setRootBufferDirty(bool val) { _rootBufferDirty = val; }
    // states
    inline pipeline::RenderPriority getPriority() const { return _priority; }
    // It is added for internal use by the engine.
    inline void setPriority(pipeline::RenderPriority priority) { _priority = priority; }
    inline gfx::PrimitiveMode getPrimitive() const { return _primitive; }
    inline pipeline::RenderPassStage getStage() const { return _stage; }
    inline uint32_t getPhase() const { return _phase; }
    inline uint32_t getPassID() const { return _passID; }
    inline uint32_t getSubpassOrPassID() const { return _subpassID == 0xFFFFFFFF ? _passID : _subpassID; }
    inline uint32_t getPhaseID() const { return _phaseID; }
    inline const gfx::RasterizerState *getRasterizerState() const { return &_rs; }
    inline const gfx::DepthStencilState *getDepthStencilState() const { return &_depthStencilState; }
    inline const gfx::BlendState *getBlendState() const { return &_blendState; }
    inline gfx::DynamicStateFlagBit getDynamicStates() const { return _dynamicStates; }
    inline BatchingSchemes getBatchingScheme() const { return _batchingScheme; }
    inline gfx::DescriptorSet *getDescriptorSet() const { return _descriptorSet; }
    inline ccstd::hash_t getHash() const { return _hash; }
    inline gfx::PipelineLayout *getPipelineLayout() const { return _pipelineLayout; }

    // Only for UI
    void initPassFromTarget(Pass *target, const gfx::DepthStencilState &dss, ccstd::hash_t hashFactor);
    void updatePassHash();

    //  internal use
    /**
     * @private
     */
    virtual void beginChangeStatesSilently() {}
    virtual void endChangeStatesSilently() {}

private:
    void buildUniformBlocks(
        const ccstd::vector<IBlockInfo> &blocks,
        const ccstd::vector<int32_t> &blockSizes);
    void buildMaterialUniformBlocks(
        const ccstd::vector<gfx::UniformBlock> &blocks,
        const ccstd::vector<int32_t> &blockSizes);
    void buildUniformBlock(
        uint32_t binding, int32_t size,
        gfx::BufferViewInfo &bufferViewInfo,
        ccstd::vector<uint32_t> &startOffsets,
        size_t &count);
    bool isBlend();

protected:
    void setState(const gfx::BlendState &bs, const gfx::DepthStencilState &dss, const gfx::RasterizerState &rs, gfx::DescriptorSet *ds);
    void doInit(const IPassInfoFull &info, bool copyDefines = false);
    virtual void syncBatchingScheme();

    // internal resources
    IntrusivePtr<gfx::Buffer> _rootBuffer;
    ccstd::vector<IntrusivePtr<gfx::Buffer>> _buffers;
    IntrusivePtr<gfx::DescriptorSet> _descriptorSet;
    IntrusivePtr<gfx::PipelineLayout> _pipelineLayout;
    // internal data
    index_t _passIndex{0};
    index_t _propertyIndex{0};
    ccstd::string _programName;
    IPassDynamics _dynamics;
    ccstd::unordered_map<ccstd::string, uint32_t> _propertyHandleMap;
    IntrusivePtr<ArrayBuffer> _rootBlock;
    ccstd::vector<IBlockRef> _blocks; // Point to position in _rootBlock

    const IProgramInfo *_shaderInfo; // weakref to template of ProgramLib
    MacroRecord _defines;
    PassPropertyInfoMap _properties;
    IntrusivePtr<gfx::Shader> _shader;
    gfx::BlendState _blendState{};
    gfx::DepthStencilState _depthStencilState{};
    gfx::RasterizerState _rs{};
    pipeline::RenderPriority _priority{pipeline::RenderPriority::DEFAULT};
    pipeline::RenderPassStage _stage{pipeline::RenderPassStage::DEFAULT};
    uint32_t _phase{0};
    uint32_t _passID{0xFFFFFFFF};
    uint32_t _subpassID{0xFFFFFFFF};
    uint32_t _phaseID{0xFFFFFFFF};
    ccstd::string _phaseString;
    gfx::PrimitiveMode _primitive{gfx::PrimitiveMode::TRIANGLE_LIST};
    BatchingSchemes _batchingScheme{BatchingSchemes::NONE};
    gfx::DynamicStateFlagBit _dynamicStates{gfx::DynamicStateFlagBit::NONE};
    ccstd::unordered_map<int32_t, IntrusivePtr<pipeline::InstancedBuffer>> _instancedBuffers;

    ccstd::hash_t _hash{0U};
    // external references
    Root *_root{nullptr};
    gfx::Device *_device{nullptr};

    bool _rootBufferDirty{false};

    CC_DISALLOW_COPY_MOVE_ASSIGN(Pass);
};

} // namespace scene
} // namespace cc
