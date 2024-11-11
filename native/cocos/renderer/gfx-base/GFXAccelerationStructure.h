#pragma once

#include "GFXObject.h"
#include "base/RefCounted.h"

namespace cc {
namespace gfx {
class CC_DLL AccelerationStructure : public GFXObject, public RefCounted {
public:
    AccelerationStructure();
    ~AccelerationStructure() override;

    void initialize(const AccelerationStructureInfo &info);
    void build();
    void build(const IntrusivePtr<Buffer> &scratchBuffer);
    void update();
    void compact();
    void destroy();
    uint64_t getBuildScratchSize() const;
    uint64_t getUpdateScratchSize() const;

    const AccelerationStructureInfo &getInfo() const {
        return _info;
    }

    void setInfo(const AccelerationStructureInfo &info) {
        doSetInfo(info);
    }

protected:

    virtual void doInit(const AccelerationStructureInfo &info) = 0;
    virtual void doBuild() = 0;
    virtual void doBuild(const IntrusivePtr<Buffer> &scratchBuffer) = 0;
    virtual void doDestroy() = 0;
    virtual void doUpdate() = 0;
    virtual void doCompact() = 0;
    virtual uint64_t doGetBuildScratchSize() const = 0;
    virtual uint64_t doGetUpdateScratchSize() const = 0;
    virtual void doSetInfo(const AccelerationStructureInfo &info) = 0;

    AccelerationStructureInfo _info;
};

} // namespace gfx
} // namespace cc
