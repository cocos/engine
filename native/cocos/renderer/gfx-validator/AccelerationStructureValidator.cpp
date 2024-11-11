#include <cstring>
#include "AccelerationStructureValidator.h"
#include "DeviceValidator.h"
#include "ValidationUtils.h"
#include "base/Log.h"

namespace cc {
namespace gfx {

AccelerationStructureValidator::AccelerationStructureValidator(AccelerationStructure *actor)
    :Agent<AccelerationStructure>(actor) {
    _typedID = actor->getTypedID();
}

AccelerationStructureValidator::~AccelerationStructureValidator() {
    DeviceResourceTracker<AccelerationStructure>::erase(this);
    CC_SAFE_DELETE(_actor);
}

void AccelerationStructureValidator::doInit(const AccelerationStructureInfo& info) {
    CC_ASSERT(!isInited());
    _inited = true;

    CC_ASSERT(!(hasFlag(info.buildFlag, ASBuildFlagBits::PREFER_FAST_BUILD) && hasFlag(info.buildFlag, ASBuildFlagBits::PREFER_FAST_TRACE)));
    CC_ASSERT(!(info.aabbs.empty() && info.triangleMeshes.empty() && info.instances.empty()));
}

void AccelerationStructureValidator::doDestroy() {
    CC_ASSERT(isInited());
    _inited = false;

    /////////// execute ///////////

    _actor->destroy();
}

void AccelerationStructureValidator::doBuild() {
    CC_ASSERT(isInited());

    /////////// execute ///////////

    _actor->build();
}

void AccelerationStructureValidator::doUpdate() {
    CC_ASSERT(isInited());

    /////////// execute ///////////

    _actor->update();
}

void AccelerationStructureValidator::doCompact() {
    CC_ASSERT(isInited());

    /////////// execute ///////////

    _actor->compact();
}

} // namespace gfx
} // namespace cc
