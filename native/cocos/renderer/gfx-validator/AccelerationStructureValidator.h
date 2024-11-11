#pragma once

#include "base/Agent.h"
#include "gfx-base/GFXAccelerationStructure.h"

namespace cc {
namespace gfx {

class CC_DLL AccelerationStructureValidator final : public Agent<AccelerationStructure> {
public:
    explicit AccelerationStructureValidator(AccelerationStructure *actor);
    ~AccelerationStructureValidator() override;
    inline bool isInited() const { return _inited; }

protected:
    friend class SwapchainValidator;

    void doInit(const AccelerationStructureInfo &info) override;
    void doDestroy() override;
    void doBuild() override;
    void doUpdate() override;
    void doCompact() override;

    bool _inited{false};
};

} // namespace gfx
} // namespace cc
