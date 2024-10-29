#include "wasmSpineExtension.h"
#include <cstdlib>
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
    return ::malloc(sizeof(uint8_t) * size);
}

void *WasmSpineExtension::_calloc(size_t size, const char *file, int line) {
    SP_UNUSED(file);
    SP_UNUSED(line);
    return ::calloc(1, size);
}

void *WasmSpineExtension::_realloc(void *ptr, size_t size, const char *file, int line) {
    SP_UNUSED(file);
    SP_UNUSED(line);
    return ::realloc(ptr, sizeof(uint8_t) * size);
}

void WasmSpineExtension::_free(void *mem, const char *file, int line) {
    SP_UNUSED(file);
    SP_UNUSED(line);
    ::free(mem);
}

SpineExtension *spine::getDefaultExtension() {
    return new WasmSpineExtension();
}
