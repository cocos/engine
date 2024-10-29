#include "spine-model.h"

SpineModel::SpineModel() {
    _data.setSize(6, 0);
}

SpineModel::~SpineModel() {
}

void SpineModel::addSlotMesh(SlotMesh& mesh, bool needMerge) {
    bool canMerge = false;
    auto count = _data.size();
    if (needMerge && count > 0) {
        if (_data[count - 2] == mesh.blendMode && _data[count - 1] == mesh.textureID) {
            canMerge = true;
            _data[count-4] += mesh.vCount;
            _data[count-3] += mesh.iCount;
        }
    }
    if (!canMerge) {
        _data.setSize(count + 6, 0);
        _data[count] = (uint32_t)mesh.vBuf;
        _data[count + 1] = (uint32_t)mesh.iBuf;
        _data[count + 2] = mesh.vCount;
        _data[count + 3] = mesh.iCount;
        _data[count + 4] = mesh.blendMode;
        _data[count + 5] = mesh.textureID;
    }

    auto indexCount = mesh.iCount;
    uint16_t* iiPtr = mesh.iBuf;
    for (uint32_t i = 0; i < indexCount; i++) {
        iiPtr[i] += vCount;
    } 

    auto vertexCount = mesh.vCount;
    float* floatPtr = (float*)mesh.vBuf;
    int floatStride = this->byteStride / 4;
    for (uint32_t i = 0; i < vertexCount; i++) {
        floatPtr[floatStride * i + 2] = 0;
    }
    vCount += vertexCount;
    iCount += indexCount;
}

void SpineModel::clearMeshes() {
    _data.setSize(0, 0);
    vCount = 0;
    iCount = 0;
}

spine::Vector<uint32_t>* SpineModel::getData() {
    return &_data;
}

void SpineModel::setBufferPtr(uint8_t* vp, uint16_t* ip) {
    vPtr = (uint32_t)vp;
    iPtr = (uint32_t)ip;
}
