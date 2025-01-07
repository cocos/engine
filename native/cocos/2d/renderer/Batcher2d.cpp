/****************************************************************************
 Copyright (c) 2019-2023 Xiamen Yaji Software Co., Ltd.

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

#include "2d/renderer/Batcher2d.h"
#include "application/ApplicationManager.h"
#include "base/TypeDef.h"
#include "core/Root.h"
#include "core/scene-graph/Scene.h"
#include "editor-support/MiddlewareManager.h"
#include "renderer/pipeline/Define.h"
#include "scene/Pass.h"

namespace cc {

Batcher2d::Batcher2d() : Batcher2d(nullptr) {
}

Batcher2d::Batcher2d(Root* root)
: _drawBatchPool([]() { return ccnew scene::DrawBatch2D(); }, [](auto* obj) { delete obj; }, 10U) {
    if (root == nullptr) {
        root = Root::getInstance();
    }
    _root = root;
    _device = _root->getDevice();
    _stencilManager = StencilManager::getInstance();
}

Batcher2d::~Batcher2d() { // NOLINT
    _drawBatchPool.destroy();

    for (auto iter : _descriptorSetCache) {
        delete iter.second;
    }

    for (auto* drawBatch : _batches) {
        delete drawBatch;
    }
    _attributes.clear();

    if (_maskClearModel != nullptr) {
        Root::getInstance()->destroyModel(_maskClearModel);
        _maskClearModel = nullptr;
    }
    if (_maskModelMesh != nullptr) {
        _maskModelMesh->destroy();
        _maskModelMesh = nullptr;
    }
    _maskClearMtl = nullptr;
    _maskAttributes.clear();
}

void Batcher2d::syncMeshBuffersToNative(uint16_t accId, ccstd::vector<UIMeshBuffer*>&& buffers) {
    _meshBuffersMap[accId] = std::move(buffers);
}

UIMeshBuffer* Batcher2d::getMeshBuffer(uint16_t accId, uint16_t bufferId) { // NOLINT(bugprone-easily-swappable-parameters)
    const auto& map = _meshBuffersMap[accId];
    return map[bufferId];
}

gfx::Device* Batcher2d::getDevice() {
    if (_device == nullptr) {
        _device = Root::getInstance()->getDevice();
    }
    return _device;
}

void Batcher2d::updateDescriptorSet() {
}

void Batcher2d::syncRootNodesToNative(ccstd::vector<Node*>&& rootNodes) {
    _rootNodeArr = std::move(rootNodes);
}

void Batcher2d::fillBuffersAndMergeBatches() {
    size_t index = 0;
    for (auto* rootNode : _rootNodeArr) {
        // _batches will add by generateBatch
        walk(rootNode, 1, false);
        generateBatch(_currEntity, _currDrawInfo);

        auto* scene = rootNode->getScene()->getRenderScene();
        size_t const count = _batches.size();
        for (size_t i = index; i < count; i++) {
            scene->addBatch(_batches.at(i));
        }
        index = count;
    }
}

void Batcher2d::walk(Node* node, float parentOpacity, bool parentOpacityDirty) { // NOLINT(misc-no-recursion)
    if (!node->isActiveInHierarchy()) {
        return;
    }
    bool breakWalk = false;
    auto* entity = static_cast<RenderEntity*>(node->getUserData());
    bool opacityDirty = false;
    if (entity) {
        if (entity->getColorDirty() || parentOpacityDirty) {
            float localOpacity = entity->getLocalOpacity();
            float localColorAlpha = entity->getColorAlpha();
            entity->setOpacity(parentOpacity * localOpacity * localColorAlpha);
            entity->setColorDirty(false);
            entity->setVBColorDirty(true);
            opacityDirty = true;
        }
        if (math::isEqualF(entity->getOpacity(), 0)) {
            breakWalk = true;
        } else if (entity->isEnabled()) {
            uint32_t size = entity->getRenderDrawInfosSize();
            for (uint32_t i = 0; i < size; i++) {
                auto* drawInfo = entity->getRenderDrawInfoAt(i);
                handleDrawInfo(entity, drawInfo, node);
            }
            entity->setVBColorDirty(false);
        }
        if (entity->getRenderEntityType() == RenderEntityType::CROSSED) {
            breakWalk = true;
        }
    }

    if (!breakWalk) {
        const auto& children = node->getChildren();
        float thisOpacity = entity ? entity->getOpacity() : parentOpacity;
        for (const auto& child : children) {
            // we should find parent opacity recursively upwards if it doesn't have an entity.
            walk(child, thisOpacity, opacityDirty || parentOpacityDirty);
        }
    }

    // post assembler
    if (_stencilManager->getMaskStackSize() > 0 && entity && entity->isEnabled()) {
        handlePostRender(entity);
    }
}

void Batcher2d::handlePostRender(RenderEntity* entity) {
    bool isMask = entity->getIsMask();
    if (isMask) {
        generateBatch(_currEntity, _currDrawInfo);
        resetRenderStates();
        _stencilManager->exitMask();
    }
}
CC_FORCE_INLINE void Batcher2d::handleComponentDraw(RenderEntity* entity, RenderDrawInfo* drawInfo, Node* node) {
    ccstd::hash_t dataHash = drawInfo->getDataHash();
    if (drawInfo->getIsMeshBuffer()) {
        dataHash = 0;
    }

    // may slow
    bool isMask = entity->getIsMask();
    if (isMask) {
        // Mask subComp
        insertMaskBatch(entity);
    } else {
        entity->setEnumStencilStage(_stencilManager->getStencilStage());
    }
    auto tempStage = static_cast<StencilStage>(entity->getStencilStage());

    if (_currHash != dataHash || dataHash == 0 || _currMaterial != drawInfo->getMaterial() || _currStencilStage != tempStage) {
        // Generate a batch if not batching
        generateBatch(_currEntity, _currDrawInfo);

        if (!drawInfo->getIsMeshBuffer()) {
            UIMeshBuffer* buffer = drawInfo->getMeshBuffer();
            if (_currMeshBuffer != buffer) {
                _currMeshBuffer = buffer;
                _indexStart = _currMeshBuffer->getIndexOffset();
            }
        }

        _currHash = dataHash;
        _currMaterial = drawInfo->getMaterial();
        _currStencilStage = tempStage;
        _currLayer = entity->getNode()->getLayer();
        _currEntity = entity;
        _currDrawInfo = drawInfo;

        _currTexture = drawInfo->getTexture();
        _currSampler = drawInfo->getSampler();
        if (_currSampler == nullptr) {
            _currSamplerHash = 0;
        } else {
            _currSamplerHash = _currSampler->getHash();
        }
    }

    if (!drawInfo->getIsMeshBuffer()) {
        if (node->getChangedFlags() || node->isTransformDirty() || drawInfo->getVertDirty()) {
            fillVertexBuffers(entity, drawInfo);
            drawInfo->setVertDirty(false);
        }
        if (entity->getVBColorDirty()) {
            fillColors(entity, drawInfo);
        }

        fillIndexBuffers(drawInfo);
    }

    if (isMask) {
        _stencilManager->enableMask();
    }
}

CC_FORCE_INLINE void Batcher2d::handleModelDraw(RenderEntity* entity, RenderDrawInfo* drawInfo) {
    generateBatch(_currEntity, _currDrawInfo);
    resetRenderStates();

    // stencil stage
    gfx::DepthStencilState* depthStencil = nullptr;
    ccstd::hash_t dssHash = 0;
    Material* renderMat = drawInfo->getMaterial();

    bool isMask = entity->getIsMask();
    if (isMask) {
        // Mask Comp
        insertMaskBatch(entity);
    } else {
        entity->setEnumStencilStage(_stencilManager->getStencilStage());
    }

    StencilStage entityStage = entity->getEnumStencilStage();
    depthStencil = _stencilManager->getDepthStencilState(entityStage, renderMat);
    dssHash = _stencilManager->getStencilHash(entityStage);

    // Model
    auto* model = drawInfo->getModel();
    if (model == nullptr) return;
    auto stamp = CC_CURRENT_ENGINE()->getTotalFrames();
    model->updateTransform(stamp);
    model->updateUBOs(stamp);

    const auto& subModelList = model->getSubModels();
    for (const auto& submodel : subModelList) {
        auto* curdrawBatch = _drawBatchPool.alloc();
        curdrawBatch->setVisFlags(entity->getNode()->getLayer());
        curdrawBatch->setModel(model);
        curdrawBatch->setInputAssembler(submodel->getInputAssembler());
        curdrawBatch->setDescriptorSet(submodel->getDescriptorSet());

        curdrawBatch->fillPass(renderMat, depthStencil, dssHash, &(submodel->getPatches()));
        _batches.push_back(curdrawBatch);
    }

    if (isMask) {
        _stencilManager->enableMask();
    }
}

CC_FORCE_INLINE void Batcher2d::handleMiddlewareDraw(RenderEntity* entity, RenderDrawInfo* drawInfo) {
    auto layer = entity->getNode()->getLayer();
    Material* material = drawInfo->getMaterial();
    auto* texture = drawInfo->getTexture();
    auto* sampler = drawInfo->getSampler();
    auto* meshBuffer = drawInfo->getMeshBuffer();

    // check for merge draw
    auto enableBatch = !entity->getUseLocal();
    if (enableBatch && _currTexture == texture && _currMeshBuffer == meshBuffer && !_currEntity->getUseLocal() && material->getHash() == _currMaterial->getHash() && drawInfo->getIndexOffset() == _currDrawInfo->getIndexOffset() + _currDrawInfo->getIbCount() && layer == _currLayer) {
        auto ibCount = _currDrawInfo->getIbCount();
        _currDrawInfo->setIbCount(ibCount + drawInfo->getIbCount());
    } else {
        generateBatch(_currEntity, _currDrawInfo);
        _currLayer = layer;
        _currMaterial = material;
        _currTexture = texture;
        _currMeshBuffer = meshBuffer;
        _currEntity = entity;
        _currDrawInfo = drawInfo;
        _currHash = 0;
    }
}

CC_FORCE_INLINE void Batcher2d::handleSubNode(RenderEntity* entity, RenderDrawInfo* drawInfo) { // NOLINT
    if (drawInfo->getSubNode()) {
        walk(drawInfo->getSubNode(), entity->getOpacity(), false);
    }
}

CC_FORCE_INLINE void Batcher2d::handleDrawInfo(RenderEntity* entity, RenderDrawInfo* drawInfo, Node* node) { // NOLINT(misc-no-recursion)
    CC_ASSERT(entity);
    CC_ASSERT(drawInfo);
    RenderDrawInfoType drawInfoType = drawInfo->getEnumDrawInfoType();

    switch (drawInfoType) {
        case RenderDrawInfoType::COMP:
            handleComponentDraw(entity, drawInfo, node);
            break;
        case RenderDrawInfoType::MODEL:
            handleModelDraw(entity, drawInfo);
            break;
        case RenderDrawInfoType::MIDDLEWARE:
            handleMiddlewareDraw(entity, drawInfo);
            break;
        case RenderDrawInfoType::SUB_NODE:
            handleSubNode(entity, drawInfo);
            break;
        default:
            break;
    }
}

void Batcher2d::generateBatch(RenderEntity* entity, RenderDrawInfo* drawInfo) {
    if (drawInfo == nullptr) {
        return;
    }
    if (drawInfo->getEnumDrawInfoType() == RenderDrawInfoType::MIDDLEWARE) {
        generateBatchForMiddleware(entity, drawInfo);
        return;
    }
    if (_currMaterial == nullptr) {
        return;
    }
    gfx::InputAssembler* ia = nullptr;

    uint32_t indexOffset = 0;
    uint32_t indexCount = 0;
    if (drawInfo->getIsMeshBuffer()) {
        // Todo MeshBuffer RenderData
        ia = drawInfo->requestIA(getDevice());
        indexOffset = drawInfo->getIndexOffset();
        indexCount = drawInfo->getIbCount();
        _meshRenderDrawInfo.emplace_back(drawInfo);
    } else {
        UIMeshBuffer* currMeshBuffer = drawInfo->getMeshBuffer();

        currMeshBuffer->setDirty(true);

        ia = currMeshBuffer->requireFreeIA(getDevice());
        indexCount = currMeshBuffer->getIndexOffset() - _indexStart;
        if (ia == nullptr) {
            return;
        }
        indexOffset = _indexStart;
        _indexStart = currMeshBuffer->getIndexOffset();
    }

    _currMeshBuffer = nullptr;

    // stencilStage
    gfx::DepthStencilState* depthStencil = nullptr;
    ccstd::hash_t dssHash = 0;
    StencilStage entityStage = entity->getEnumStencilStage();
    depthStencil = _stencilManager->getDepthStencilState(entityStage, _currMaterial);
    dssHash = _stencilManager->getStencilHash(entityStage);

    auto* curdrawBatch = _drawBatchPool.alloc();
    curdrawBatch->setVisFlags(_currLayer);
    curdrawBatch->setInputAssembler(ia);
    curdrawBatch->setFirstIndex(indexOffset);
    curdrawBatch->setIndexCount(indexCount);
    curdrawBatch->fillPass(_currMaterial, depthStencil, dssHash);
    const auto &passes = curdrawBatch->getPasses();
    if (!passes.empty()) {
        const auto& pass = passes.at(0);
        if (entity->getUseLocal()) {
            drawInfo->updateLocalDescriptorSet(entity->getRenderTransform(), pass->getLocalSetLayout());
            curdrawBatch->setDescriptorSet(drawInfo->getLocalDes());
        } else {
            curdrawBatch->setDescriptorSet(getDescriptorSet(_currTexture, _currSampler, pass->getLocalSetLayout()));
        }
        _batches.push_back(curdrawBatch);
    }
}

void Batcher2d::generateBatchForMiddleware(RenderEntity* entity, RenderDrawInfo* drawInfo) {
    auto layer = entity->getNode()->getLayer();
    auto* material = drawInfo->getMaterial();
    auto* texture = drawInfo->getTexture();
    auto* sampler = drawInfo->getSampler();
    auto* meshBuffer = drawInfo->getMeshBuffer();
    // set meshbuffer offset
    auto indexOffset = drawInfo->getIndexOffset();
    auto indexCount = drawInfo->getIbCount();
    indexOffset += indexCount;
    if (meshBuffer->getIndexOffset() < indexOffset) {
        meshBuffer->setIndexOffset(indexOffset);
    }

    meshBuffer->setDirty(true);
    gfx::InputAssembler* ia = meshBuffer->requireFreeIA(getDevice());

    // stencilstage
    auto stencilStage = _stencilManager->getStencilStage();
    gfx::DepthStencilState* depthStencil = _stencilManager->getDepthStencilState(stencilStage, material);
    ccstd::hash_t dssHash = _stencilManager->getStencilHash(stencilStage);

    auto* curdrawBatch = _drawBatchPool.alloc();
    curdrawBatch->setVisFlags(_currLayer);
    curdrawBatch->setInputAssembler(ia);
    curdrawBatch->setFirstIndex(drawInfo->getIndexOffset());
    curdrawBatch->setIndexCount(drawInfo->getIbCount());
    curdrawBatch->fillPass(material, depthStencil, dssHash);
    const auto& pass = curdrawBatch->getPasses().at(0);
    if (entity->getUseLocal()) {
        drawInfo->updateLocalDescriptorSet(entity->getNode(), pass->getLocalSetLayout());
        curdrawBatch->setDescriptorSet(drawInfo->getLocalDes());
    } else {
        curdrawBatch->setDescriptorSet(getDescriptorSet(texture, sampler, pass->getLocalSetLayout()));
    }
    _batches.push_back(curdrawBatch);
    // make sure next generateBatch return.
    resetRenderStates();
    _currMeshBuffer = nullptr;
}

void Batcher2d::resetRenderStates() {
    _currMaterial = nullptr;
    _currTexture = nullptr;
    _currSampler = nullptr;
    _currSamplerHash = 0;
    _currLayer = 0;
    _currEntity = nullptr;
    _currDrawInfo = nullptr;
}

gfx::DescriptorSet* Batcher2d::getDescriptorSet(gfx::Texture* texture, gfx::Sampler* sampler, const gfx::DescriptorSetLayout* dsLayout) {
    ccstd::hash_t hash = 2;
    size_t textureHash;
    if (texture != nullptr) {
        textureHash = boost::hash_value(texture);
        ccstd::hash_combine(hash, textureHash);
    }
    if (sampler != nullptr) {
        ccstd::hash_combine(hash, sampler->getHash());
    }
    auto iter = _descriptorSetCache.find(hash);
    if (iter != _descriptorSetCache.end()) {
        if (texture != nullptr && sampler != nullptr) {
            iter->second->bindTexture(static_cast<uint32_t>(pipeline::ModelLocalBindings::SAMPLER_SPRITE), texture);
            iter->second->bindSampler(static_cast<uint32_t>(pipeline::ModelLocalBindings::SAMPLER_SPRITE), sampler);
        }
        iter->second->forceUpdate();
        return iter->second;
    }
    _dsInfo.layout = dsLayout;
    auto* ds = getDevice()->createDescriptorSet(_dsInfo);

    if (texture != nullptr && sampler != nullptr) {
        ds->bindTexture(static_cast<uint32_t>(pipeline::ModelLocalBindings::SAMPLER_SPRITE), texture);
        ds->bindSampler(static_cast<uint32_t>(pipeline::ModelLocalBindings::SAMPLER_SPRITE), sampler);
    }
    ds->update();
    _descriptorSetCache.emplace(hash, ds);

    return ds;
}

void Batcher2d::releaseDescriptorSetCache(gfx::Texture* texture, gfx::Sampler* sampler) {
    ccstd::hash_t hash = 2;
    size_t textureHash;
    if (texture != nullptr) {
        textureHash = boost::hash_value(texture);
        ccstd::hash_combine(hash, textureHash);
    }
    if (sampler != nullptr) {
        ccstd::hash_combine(hash, sampler->getHash());
    }
    auto iter = _descriptorSetCache.find(hash);
    if (iter != _descriptorSetCache.end()) {
        delete iter->second;
        _descriptorSetCache.erase(hash);
    }
}

bool Batcher2d::initialize() {
    _isInit = true;
    return _isInit;
}

void Batcher2d::update() {
    fillBuffersAndMergeBatches();
    resetRenderStates();
}

void Batcher2d::uploadBuffers() {
    if (_batches.empty()) {
        return;
    }

    for (auto& meshRenderData : _meshRenderDrawInfo) {
        meshRenderData->uploadBuffers();
    }

    for (auto& map : _meshBuffersMap) {
        for (auto& buffer : map.second) {
            buffer->uploadBuffers();
            buffer->reset();
        }
    }
    updateDescriptorSet();
}

void Batcher2d::reset() {
    for (auto& batch : _batches) {
        batch->clear();
        _drawBatchPool.free(batch);
    }
    _batches.clear();

    for (auto& meshRenderData : _meshRenderDrawInfo) {
        meshRenderData->resetMeshIA();
    }
    _meshRenderDrawInfo.clear();

    // meshDataArray
    for (auto& map : _meshBuffersMap) {
        for (auto& buffer : map.second) {
            if (buffer) {
                buffer->resetIA();
            }
        }
    }
    // meshBuffer cannot clear because it is not transported at every frame.

    _currMeshBuffer = nullptr;
    _indexStart = 0;
    _currHash = 0;
    _currLayer = 0;
    _currMaterial = nullptr;
    _currTexture = nullptr;
    _currSampler = nullptr;

    // stencilManager
}

void Batcher2d::insertMaskBatch(RenderEntity* entity) {
    generateBatch(_currEntity, _currDrawInfo);
    resetRenderStates();
    createClearModel();
    _maskClearModel->setNode(entity->getNode());
    _maskClearModel->setTransform(entity->getNode());
    _stencilManager->pushMask();
    auto stage = _stencilManager->clear(entity);

    gfx::DepthStencilState* depthStencil = nullptr;
    ccstd::hash_t dssHash = 0;
    if (_maskClearMtl != nullptr) {
        depthStencil = _stencilManager->getDepthStencilState(stage, _maskClearMtl);
        dssHash = _stencilManager->getStencilHash(stage);
    }

    // Model
    if (_maskClearModel == nullptr) return;
    auto stamp = CC_CURRENT_ENGINE()->getTotalFrames();
    _maskClearModel->updateTransform(stamp);
    _maskClearModel->updateUBOs(stamp);

    const auto& subModelList = _maskClearModel->getSubModels();
    for (const auto& submodel : subModelList) {
        auto* curdrawBatch = _drawBatchPool.alloc();
        curdrawBatch->setVisFlags(entity->getNode()->getLayer());
        curdrawBatch->setModel(_maskClearModel);
        curdrawBatch->setInputAssembler(submodel->getInputAssembler());
        curdrawBatch->setDescriptorSet(submodel->getDescriptorSet());

        curdrawBatch->fillPass(_maskClearMtl, depthStencil, dssHash, &(submodel->getPatches()));
        _batches.push_back(curdrawBatch);
    }

    _stencilManager->enterLevel(entity);
}

void Batcher2d::createClearModel() {
    if (_maskClearModel == nullptr) {
        _maskClearMtl = BuiltinResMgr::getInstance()->get<Material>(ccstd::string("default-clear-stencil"));

        _maskClearModel = Root::getInstance()->createModel<scene::Model>();
        uint32_t stride = 12; // vfmt

        auto* vertexBuffer = _device->createBuffer({
            gfx::BufferUsageBit::VERTEX | gfx::BufferUsageBit::TRANSFER_DST,
            gfx::MemoryUsageBit::DEVICE,
            4 * stride,
            stride,
        });
        const float vertices[] = {-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0};
        vertexBuffer->update(vertices);
        auto* indexBuffer = _device->createBuffer({
            gfx::BufferUsageBit::INDEX | gfx::BufferUsageBit::TRANSFER_DST,
            gfx::MemoryUsageBit::DEVICE,
            6 * sizeof(uint16_t),
            sizeof(uint16_t),
        });
        const uint16_t indices[] = {0, 2, 1, 2, 1, 3};
        indexBuffer->update(indices);

        gfx::BufferList vbReference;
        vbReference.emplace_back(vertexBuffer);
        _maskModelMesh = ccnew RenderingSubMesh(vbReference, _maskAttributes, _primitiveMode, indexBuffer);
        _maskModelMesh->setSubMeshIdx(0);

        _maskClearModel->initSubModel(0, _maskModelMesh, _maskClearMtl);
    }
}
} // namespace cc
