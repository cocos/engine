#include "util-function.h"
// #include <stdint.h>
// // extern "C" {
// // extern void consoleInfo(char* ptr, uint32_t length);
// // }
// static char* logBuffer = nullptr;
// const int LOG_LENGTH = 1024;

// void LogUtil::Initialize() {
//     //logBuffer = new char[LOG_LENGTH];
// }

// void LogUtil::PrintToJs(std::string& message) {
//     // int length = message.length();
//     // if (length >= LOG_LENGTH) length = LOG_LENGTH -1;
//     // memcpy(logBuffer, message.c_str(), length);
//     // logBuffer[length] = 0;
//     // consoleInfo(logBuffer, length);
// }

// void LogUtil::PrintToJs(const char* message) {
//     // std::string strMessage(message);
//     // int length = strMessage.length();
//     // if (length >= LOG_LENGTH) length = LOG_LENGTH - 1;
//     // memcpy(logBuffer, strMessage.c_str(), length);
//     // logBuffer[length] = 0;
//     // consoleInfo(logBuffer, length);
// }

// void LogUtil::PrintToJs(char* str, int length) {
//     // if (length >= LOG_LENGTH) length = LOG_LENGTH - 1;
//     // memcpy(logBuffer, str, length);
//     // logBuffer[length] = 0;
//     // consoleInfo(logBuffer, length);
// }

// void LogUtil::PrintIntValue(int value, const char* message) {
//     // std::string strInt = std::to_string(value);
//     // std::string finalStr = std::string(message) + strInt;
//     // LogUtil::PrintToJs(finalStr);
// }

// void LogUtil::ReleaseBuffer() {
//     //delete[] logBuffer;
// }

// // const uint32_t MEMORY_SIZE = 8 * 1024 * 1024;
// // static uint8_t* uint8Ptr = nullptr;

// // uint8_t* StoreMemory::getStoreMemory() {
// //     if (uint8Ptr) return uint8Ptr;

// //     uint32_t* uint32Ptr = new uint32_t[MEMORY_SIZE / 4];
// //     uint8Ptr = (uint8_t*)uint32Ptr;
// //     return uint8Ptr;
// // }

// // void StoreMemory::freeStoreMemory() {
// //     if (uint8Ptr) {
// //         delete[] uint8Ptr;
// //         uint8Ptr = nullptr;
// //     }
// // }

// // uint32_t StoreMemory::storeMemorySize() {
// //     return MEMORY_SIZE;
// // }
