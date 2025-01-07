#include "AtlasAttachmentLoaderExtension.h"
#include "mesh-type-define.h"
//#include "LogUtil.h"
using namespace spine;

static uint16_t quadTriangles[6] = {0, 1, 2, 2, 3, 0};

AttachmentVertices::AttachmentVertices(int verticesCount, uint16_t *triangles, int trianglesCount, const spine::String& textureUUID) {
    _triangles = new Triangles();
    _triangles->verts = new V3F_T2F_C4B[verticesCount];
    _triangles->vertCount = verticesCount;
    _triangles->indices = triangles;
    _triangles->indexCount = trianglesCount;
    _textureId = textureUUID;
}

AttachmentVertices::~AttachmentVertices() {
    delete[] _triangles->verts;
    delete _triangles;
}

AttachmentVertices *AttachmentVertices::copy() {
    AttachmentVertices *atv = new AttachmentVertices(_triangles->vertCount, _triangles->indices, _triangles->indexCount, _textureId);
    return atv;
}

static void deleteAttachmentVertices(void *vertices) {
    delete static_cast<AttachmentVertices *>(vertices);
}

AtlasAttachmentLoaderExtension::AtlasAttachmentLoaderExtension(Atlas *atlas) : AtlasAttachmentLoader(atlas), _atlasCache(atlas) {
}

AtlasAttachmentLoaderExtension::~AtlasAttachmentLoaderExtension() = default;

void AtlasAttachmentLoaderExtension::configureAttachment(Attachment *attachment) {
    if (attachment->getRTTI().isExactly(RegionAttachment::rtti)) {
        auto *regionAttachment = static_cast<RegionAttachment *>(attachment);
        auto &pages = _atlasCache->getPages();
        auto *region = static_cast<AtlasRegion *>(regionAttachment->getRendererObject());
        auto *attachmentVertices = new AttachmentVertices(4, quadTriangles, 6, region->page->name);
        V3F_T2F_C4B *vertices = attachmentVertices->_triangles->verts;
        const auto &uvs = regionAttachment->getUVs();
        for (int i = 0, ii = 0; i < 4; ++i, ii += 2) {
            vertices[i].texCoord.u = uvs[ii];
            vertices[i].texCoord.v = uvs[ii + 1];
        }
        regionAttachment->setRendererObject(attachmentVertices, deleteAttachmentVertices);
    } else if (attachment->getRTTI().isExactly(MeshAttachment::rtti)) {
        auto *meshAttachment = static_cast<MeshAttachment *>(attachment);
        auto &pages = _atlasCache->getPages();
        auto *region = static_cast<AtlasRegion *>(meshAttachment->getRendererObject());
        auto *attachmentVertices = new AttachmentVertices(
            static_cast<int32_t>(meshAttachment->getWorldVerticesLength() >> 1), meshAttachment->getTriangles().buffer(), static_cast<int32_t>(meshAttachment->getTriangles().size()), region->page->name);
        V3F_T2F_C4B *vertices = attachmentVertices->_triangles->verts;
        const auto &uvs = meshAttachment->getUVs();
        for (size_t i = 0, ii = 0, nn = meshAttachment->getWorldVerticesLength(); ii < nn; ++i, ii += 2) {
            vertices[i].texCoord.u = uvs[ii];
            vertices[i].texCoord.v = uvs[ii + 1];
        }
        meshAttachment->setRendererObject(attachmentVertices, deleteAttachmentVertices);
    }
}