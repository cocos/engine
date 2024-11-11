#include "GFXAccelerationStructure.h"

namespace cc {

namespace gfx {

AccelerationStructure::AccelerationStructure()
: GFXObject(ObjectType::ACCELERATION_STRUCTURE){

}

AccelerationStructure::~AccelerationStructure() = default;

void AccelerationStructure::initialize(const AccelerationStructureInfo &info){
    _info = info;
    //todo
    doInit(info);
}

void AccelerationStructure::build() {
    doBuild();
}

void AccelerationStructure::build(const IntrusivePtr<Buffer>& scratchBuffer) {
    doBuild(scratchBuffer);
}


void AccelerationStructure::update(){
    doUpdate();
}

void AccelerationStructure::compact() {
    doCompact();
}

void AccelerationStructure::destroy() {
    doDestroy();
    _info = AccelerationStructureInfo();
}

uint64_t AccelerationStructure::getBuildScratchSize() const{
    return doGetBuildScratchSize();
}

uint64_t AccelerationStructure::getUpdateScratchSize() const{
    return doGetUpdateScratchSize();
}



} // namespace gfx
} // namespace cc
