#include "StencilManager.h"
namespace cc {
namespace {
StencilManager* instance = nullptr;
}

StencilManager* StencilManager::getInstance() {
    if (instance == nullptr) {
        instance = new StencilManager();
    }
    return instance;
}

StencilManager::StencilManager(/* args */) {
    _seArrayBufferObject = se::Object::createExternalArrayBufferObject(&_stencilSharedBuffer, sizeof(StencilEntity), [](void* a, size_t b, void* c) {});
    _seArrayBufferObject->root();
    _stencilSharedBuffer = new ArrayBuffer();
    _stencilSharedBuffer->setJSArrayBuffer(_seArrayBufferObject);
}

StencilManager::~StencilManager() {
}

gfx::DepthStencilState* StencilManager::getDepthStencilState(StencilStage stage, Material* mat) {
    uint64_t key = 0;
    bool depthTest = false;
    bool depthWrite = false;
    gfx::ComparisonFunc depthFunc = gfx::ComparisonFunc::LESS;
    auto* cacheMap = &_cacheStateMap;

    if (mat && mat->getPasses()->at(0)) {
        IntrusivePtr<scene::Pass> pass = mat->getPasses()->at(0);
        const gfx::DepthStencilState* dss = pass->getDepthStencilState();
        uint32_t depthTestValue = 0;
        uint32_t depthWriteValue = 0;
        if (dss->depthTest) {
            depthTestValue = 1;
        }
        if (dss->depthWrite) {
            depthWriteValue = 1;
        }
        key = (depthTestValue) | (depthWriteValue << 1) | ((uint32_t)dss->depthFunc << 2) | ((uint32_t)_stage << 6) | (_maskStackSize << 9);

        depthTest = dss->depthTest;
        depthWrite = static_cast<uint32_t>(dss->depthWrite);
        depthFunc = dss->depthFunc;
        cacheMap = &_cacheStateMapWithDepth;

    } else {
        key = ((static_cast<uint32_t>(stage)) << 16) | (_maskStackSize);
    }

    auto iter = cacheMap->find(0);
    if (iter != cacheMap->end()) {
        return iter->second;
    }

    setDepthStencilStateFromStage(stage);

    gfx::DepthStencilState* depthStencilState = new gfx::DepthStencilState();
    depthStencilState->depthTest = depthTest;
    depthStencilState->depthWrite = depthWrite;
    depthStencilState->depthFunc = depthFunc;
    depthStencilState->stencilTestFront = _stencilPattern.stencilTest;
    depthStencilState->stencilFuncFront = _stencilPattern.func;
    depthStencilState->stencilReadMaskFront = _stencilPattern.stencilMask;
    depthStencilState->stencilWriteMaskFront = _stencilPattern.writeMask;
    depthStencilState->stencilFailOpFront = _stencilPattern.failOp;
    depthStencilState->stencilZFailOpFront = _stencilPattern.zFailOp;
    depthStencilState->stencilPassOpFront = _stencilPattern.passOp;
    depthStencilState->stencilRefFront = _stencilPattern.ref;
    depthStencilState->stencilTestBack = _stencilPattern.stencilTest;
    depthStencilState->stencilFuncBack = _stencilPattern.func;
    depthStencilState->stencilReadMaskBack = _stencilPattern.stencilMask;
    depthStencilState->stencilWriteMaskBack = _stencilPattern.writeMask;
    depthStencilState->stencilFailOpBack = _stencilPattern.failOp;
    depthStencilState->stencilZFailOpBack = _stencilPattern.zFailOp;
    depthStencilState->stencilPassOpBack = _stencilPattern.passOp;
    depthStencilState->stencilRefBack = _stencilPattern.ref;

    const auto& pair = std::pair<uint64_t, gfx::DepthStencilState*>(key, depthStencilState);
    cacheMap->insert(pair);

    return depthStencilState;
}

void StencilManager::setDepthStencilStateFromStage(StencilStage stage) {
    StencilEntity& pattern = _stencilPattern;

    if (_stage == StencilStage::DISABLED) {
        pattern.stencilTest = false;
        pattern.func = gfx::ComparisonFunc::ALWAYS;
        pattern.failOp = gfx::StencilOp::KEEP;
        pattern.stencilMask = pattern.writeMask = 0xffff;
        pattern.ref = 1;
    } else {
        pattern.stencilTest = true;
        if (stage == StencilStage::ENABLED) {
            pattern.func = gfx::ComparisonFunc::EQUAL;
            pattern.failOp = gfx::StencilOp::KEEP;
            pattern.stencilMask = pattern.ref = getStencilRef();
            pattern.writeMask = getWriteMask();
        } else if (stage == StencilStage::CLEAR) {
            pattern.func = gfx::ComparisonFunc::NEVER;
            pattern.failOp = gfx::StencilOp::ZERO;
            pattern.writeMask = pattern.stencilMask = pattern.ref = getWriteMask();
        } else if (stage == StencilStage::CLEAR_INVERTED) {
            pattern.func = gfx::ComparisonFunc::NEVER;
            pattern.failOp = gfx::StencilOp::REPLACE;
            pattern.writeMask = pattern.stencilMask = pattern.ref = getWriteMask();
        } else if (stage == StencilStage::ENTER_LEVEL) {
            pattern.func = gfx::ComparisonFunc::NEVER;
            pattern.failOp = gfx::StencilOp::REPLACE;
            pattern.writeMask = pattern.stencilMask = pattern.ref = getWriteMask();
        } else if (stage == StencilStage::ENTER_LEVEL_INVERTED) {
            pattern.func = gfx::ComparisonFunc::NEVER;
            pattern.failOp = gfx::StencilOp::ZERO;
            pattern.writeMask = pattern.stencilMask = pattern.ref = getWriteMask();
        }
    }
}

void StencilManager::setStencilStage(uint32_t stageIndex) {
    _stage = static_cast<StencilStage>(stageIndex);
}
} // namespace cc
