cmake_minimum_required(VERSION 3.8)

set(CMAKE_VERBOSE_MAKEFILE ON)

set(BUILD_WASM 1)
set(ENABLE_JSON_PARSER 1)
set(ENABLE_BINARY_PARSER 1)

set(CMAKE_BUILD_TYPE "MinSizeRel")
# set(CMAKE_BUILD_TYPE "RelWithDebInfo")
# set(CMAKE_BUILD_TYPE "Debug")

if(CMAKE_BUILD_TYPE STREQUAL "Debug")
    set(ENABLE_CLOSURE_COMPILER 0)
else()
    set(ENABLE_CLOSURE_COMPILER 1)
endif()

set(CMAKE_CXX_STANDARD 11)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

set(APP_NAME "spine" CACHE STRING "Project Name")
project(${APP_NAME}_wasm)

# --profiling
set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -DEMSCRIPTEN_HAS_UNBOUND_TYPE_NAMES=0 -DENABLE_JSON_PARSER=${ENABLE_JSON_PARSER} -DENABLE_BINARY_PARSER=${ENABLE_BINARY_PARSER}")
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fno-exceptions -fno-rtti \
    -DEMSCRIPTEN_HAS_UNBOUND_TYPE_NAMES=0 -DENABLE_JSON_PARSER=${ENABLE_JSON_PARSER} -DENABLE_BINARY_PARSER=${ENABLE_BINARY_PARSER}")

message(">>> --------------------------------------------------------------")
message(">>> Current directory: ${CMAKE_CURRENT_LIST_DIR}")
message(">>> CMAKE_BUILD_TYPE: ${CMAKE_BUILD_TYPE}")
message(">>> ENABLE_CLOSURE_COMPILER: ${ENABLE_CLOSURE_COMPILER}")
message(">>> ENABLE_JSON_PARSER: ${ENABLE_JSON_PARSER}")
message(">>> ENABLE_BINARY_PARSER: ${ENABLE_BINARY_PARSER}")
message(">>> --------------------------------------------------------------")

include_directories(${CMAKE_CURRENT_LIST_DIR}/..)
file(GLOB SPINE_CORE_SRC "${CMAKE_CURRENT_LIST_DIR}/../spine/*.cpp")
file(GLOB COCOS_ADAPTER_SRC "${CMAKE_CURRENT_LIST_DIR}/*.cpp")

add_executable(${APP_NAME} ${SPINE_CORE_SRC} ${COCOS_ADAPTER_SRC})

# -s EMBIND_AOT=0 -s MALLOC=emmalloc
set(EMS_LINK_FLAGS "-s VERBOSE=1 -s WASM=${BUILD_WASM} -s INITIAL_MEMORY=33554432 -s ALLOW_MEMORY_GROWTH=1 -s DYNAMIC_EXECUTION=0 -s ERROR_ON_UNDEFINED_SYMBOLS=0 \
        -flto --no-entry --bind -s USE_ES6_IMPORT_META=0 -s EXPORT_ES6=1 -s MODULARIZE=1 -s EXPORT_NAME='spineWasm' \
        -s ENVIRONMENT=web -s FILESYSTEM=0 -s NO_EXIT_RUNTIME=1 -s LLD_REPORT_UNDEFINED \
        -s MIN_SAFARI_VERSION=110000 \
        -s EXPORTED_FUNCTIONS=['_spineListenerCallBackFromJS','_spineTrackListenerCallback'] \
        --js-library ../library_spine.js \
        --closure=${ENABLE_CLOSURE_COMPILER} \
        --closure-args=--externs=../library_spine_externs.js")


set_target_properties(${APP_NAME} PROPERTIES CXX_STANDARD 11 LINK_FLAGS ${EMS_LINK_FLAGS})