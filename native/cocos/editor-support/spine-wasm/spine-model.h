#pragma once

#include <spine/spine.h>
#include <vector>
class SlotMesh {
public:
    SlotMesh() {}
    SlotMesh(uint8_t* vb, uint16_t* ib, uint32_t vc, uint32_t ic)
    : vBuf(vb), iBuf(ib), vCount(vc), iCount(ic) {}
    ~SlotMesh() {}
    void set(uint8_t* vb, uint16_t* ib, uint32_t vc, uint32_t ic)
    {
        this->vBuf = vb;
        this->iBuf = ib;
        this->vCount = vc;
        this->iCount = ic;
    }
    uint8_t* vBuf;
    uint16_t* iBuf;
    uint32_t vCount;
    uint32_t iCount;
    uint32_t blendMode;
    uint32_t textureID;
};

class SpineModel {
public:
    SpineModel();
    ~SpineModel();
    void addSlotMesh(SlotMesh& mesh, bool needMerge = true);
    void clearMeshes();
    void setBufferPtr(uint8_t* vp, uint16_t* ip);
    std::vector<uint32_t>* data;
    std::vector<uint32_t>* getData();

public:
    uint32_t vCount;
    uint32_t iCount;
    uint32_t vPtr;
    uint32_t iPtr;
    uint32_t byteStride;
};
