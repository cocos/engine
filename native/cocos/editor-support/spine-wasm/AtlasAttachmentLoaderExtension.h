#pragma once

#include "mesh-type-define.h"
#include "spine/spine.h"

class AttachmentVertices {
public:
    AttachmentVertices(int verticesCount, uint16_t *triangles, int trianglesCount, const spine::String& textureUUID);
    virtual ~AttachmentVertices();
    AttachmentVertices *copy();
    Triangles *_triangles = nullptr;
    spine::String _textureId;
};

class AtlasAttachmentLoaderExtension : public spine::AtlasAttachmentLoader {
public:
    AtlasAttachmentLoaderExtension(spine::Atlas *atlas);
    virtual ~AtlasAttachmentLoaderExtension();
    virtual void configureAttachment(spine::Attachment *attachment);

private:
    spine::Atlas *_atlasCache;
};
