#include "spine-mesh-data.h"
#include <memory>

uint8_t* SpineMeshData::vBuf = nullptr;
uint8_t* SpineMeshData::vPtr = nullptr;
uint8_t* SpineMeshData::vEnd = nullptr;
uint16_t* SpineMeshData::iBuf = nullptr;
uint16_t* SpineMeshData::iPtr = nullptr;
uint16_t* SpineMeshData::iEnd = nullptr;

void SpineMeshData::initMeshMemory() {
    if (vBuf) return;
    const auto vCount = 65535;
    const auto byteStride = 7 * sizeof(float);
    vBuf = static_cast<uint8_t*>(::malloc(sizeof(uint8_t) * (2 * vCount * byteStride))); // 2 * 64KB * 28 = 3.5MB
    iBuf = static_cast<uint16_t*>(::malloc(sizeof(uint16_t) * (8 * 65535))); // 512KB

    vPtr = vBuf;
    iPtr = iBuf;
}

void SpineMeshData::releaseMeshMemory() {
    ::free(vBuf);
    vBuf = nullptr;
    
    ::free(iBuf);
    iBuf = nullptr;
}

void SpineMeshData::reset() {
    vPtr = vBuf;
    iPtr = iBuf;
}

void SpineMeshData::moveVB(uint32_t count) {
    vPtr += count;
}

void SpineMeshData::moveIB(uint32_t count) {
    iPtr += count;
}

uint8_t* SpineMeshData::queryVBuffer() {
    return vPtr;
}

uint16_t* SpineMeshData::queryIBuffer() {
    return iPtr;
}

uint8_t* SpineMeshData::vb() {
    return vBuf;
}

uint16_t* SpineMeshData::ib() {
    return iBuf;
}