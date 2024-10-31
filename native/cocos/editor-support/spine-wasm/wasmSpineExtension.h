#ifndef __WASM_SPINE_EXTENSION_H__
#define __WASM_SPINE_EXTENSION_H__
#include "spine/spine.h"

class WasmSpineExtension : public spine::SpineExtension {
public:
    WasmSpineExtension();

    virtual ~WasmSpineExtension();

protected:
    virtual void *_alloc(size_t size, const char *file, int line);

    virtual void *_calloc(size_t size, const char *file, int line);

    virtual void *_realloc(void *ptr, size_t size, const char *file, int line);

    virtual void _free(void *mem, const char *file, int line);

    virtual char *_readFile(const spine::String &path, int *length);
};

#endif