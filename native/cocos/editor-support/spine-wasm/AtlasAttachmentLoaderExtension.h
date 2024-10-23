#pragma once

#include "mesh-type-define.h"
#include "spine/spine.h"

class AttachmentVertices {
public:
    AttachmentVertices(int verticesCount, uint16_t *triangles, int trianglesCount, uint32_t textureId);
    virtual ~AttachmentVertices();
    AttachmentVertices *copy();
    Triangles *_triangles = nullptr;
    uint32_t _textureId = 0;
};

class AtlasAttachmentLoaderExtension : public spine::AtlasAttachmentLoader {
public:
    AtlasAttachmentLoaderExtension(spine::Atlas *atlas);
    virtual ~AtlasAttachmentLoaderExtension();
    virtual void configureAttachment(spine::Attachment *attachment);

private:
    spine::Atlas *_atlasCache;
};
