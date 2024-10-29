#include "wasmSpineExtension.h"
#include "util-function.h"

using namespace spine;
// extern "C" {
// extern uint32_t jsReadFile(char* fileName, uint32_t length);
// }

WasmSpineExtension::WasmSpineExtension() : DefaultSpineExtension() {
}

WasmSpineExtension::~WasmSpineExtension() {
}

char *WasmSpineExtension::_readFile(const String &path, int *length) {
    // size_t pathSize = path.length();
    // uint8_t* uint8Ptr = StoreMemory::getStoreMemory();
    // char* shareBuffer = (char*)uint8Ptr;
    // memcpy(shareBuffer, path.buffer(), pathSize);
    // uint32_t resultSize = jsReadFile(shareBuffer, pathSize);
    // *length = (int)resultSize;
    // uint8_t *data = new uint8_t[resultSize];
    // memcpy(data, shareBuffer, resultSize);
    // return (char*)data;
    //LogUtil::PrintToJs("Error WasmSpineExtension::_readFile");
    return nullptr;
}

void *WasmSpineExtension::_alloc(size_t size, const char *file, int line) {
    SP_UNUSED(file);
    SP_UNUSED(line);

    if (size == 0) {
        return nullptr;
    }
    return ::malloc(sizeof(uint8_t) * size);
}

void *WasmSpineExtension::_calloc(size_t size, const char *file, int line) {
    SP_UNUSED(file);
    SP_UNUSED(line);

    if (size == 0) {
        return nullptr;
    }
    const size_t bytes = sizeof(uint8_t) * size;
    uint8_t *ptr = static_cast<uint8_t*>(::malloc(bytes));
    if (ptr) memset(ptr, 0, bytes);
    return ptr;
}

void *WasmSpineExtension::_realloc(void *ptr, size_t size, const char *file, int line) {
    SP_UNUSED(file);
    SP_UNUSED(line);

    if (size == 0) {
        return nullptr;
    }
    const size_t bytes = sizeof(uint8_t) * size;
    uint8_t *mem = static_cast<uint8_t*>(::malloc(bytes));
    if (mem) memset(mem, 0, bytes);
    ::free(ptr);
    return mem;
}

void WasmSpineExtension::_free(void *mem, const char *file, int line) {
    SP_UNUSED(file);
    SP_UNUSED(line);

    ::free(mem);
}

SpineExtension *spine::getDefaultExtension() {
    return new WasmSpineExtension();
}
