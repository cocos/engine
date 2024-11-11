#pragma once

#include "gfx-base/GFXAccelerationStructure.h"

namespace cc {
namespace gfx {

class CC_DLL EmptyAccelerationStructure final : public AccelerationStructure {
public:
    void doInit(const AccelerationStructureInfo& info) override;
    void doDestroy() override;
    void doUpdate() override;
    void doBuild() override;
    void doBuild(const IntrusivePtr<Buffer>& scratchBuffer) override;
    void doCompact() override;
    uint64_t doGetBuildScratchSize() const override { return 0U; }
    uint64_t doGetUpdateScratchSize() const override { return 0U; }
    void doSetInfo(const AccelerationStructureInfo& info) override{}
};

} // namespace gfx
} // namespace cc
