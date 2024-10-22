cmake_minimum_required(VERSION 3.0)

set(CMAKE_VERBOSE_MAKEFILE ON)
set(CMAKE_BUILD_TYPE "MinSizeRel")

set(BUILD_WASM 1)

set(APP_NAME "spine" CACHE STRING "Project Name")
project(${APP_NAME}_wasm)

set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -DEMSCRIPTEN_HAS_UNBOUND_TYPE_NAMES=0")
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fno-exceptions -frtti -DEMSCRIPTEN_HAS_UNBOUND_TYPE_NAMES=1")

message("Current directory: ${CMAKE_CURRENT_SOURCE_DIR}")

#include_directories(../ ../../)
include_directories(../ ../../ ../spine-creator-support/)
file(GLOB SPINE_CORE_SRC "../spine/*.cpp" ../spine-creator-support/Vector2.cpp)
file(GLOB COCOS_ADAPTER_SRC "./*.cpp")

#file(GLOB SPINE_CORE_SRC ../spine-creator-support/Vector2.cpp)

add_executable(${APP_NAME} ${SPINE_CORE_SRC} ${COCOS_ADAPTER_SRC} )
#add_executable(${APP_NAME} ${COCOS_ADAPTER_SRC})

set(EMS_LINK_FLAGS "-O3 -s WASM=${BUILD_WASM} -s INITIAL_MEMORY=33554432 -s ALLOW_MEMORY_GROWTH=1 -s DYNAMIC_EXECUTION=0 -s ERROR_ON_UNDEFINED_SYMBOLS=0 \
		-flto --no-entry --bind -s USE_ES6_IMPORT_META=0 -s EXPORT_ES6=1 -s MODULARIZE=1 -s EXPORT_NAME='spineWasm' \
		-s ENVIRONMENT=web -s FILESYSTEM=0 -s NO_EXIT_RUNTIME=1 -s LLD_REPORT_UNDEFINED \
		-s MIN_SAFARI_VERSION=110000 \
		--js-library ../library_spine.js")


set_target_properties(${APP_NAME} PROPERTIES CXX_STANDARD 11 LINK_FLAGS ${EMS_LINK_FLAGS})