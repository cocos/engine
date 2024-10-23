cmake_minimum_required(VERSION 3.8)

set(CMAKE_VERBOSE_MAKEFILE ON)
set(CMAKE_BUILD_TYPE "MinSizeRel")

set(APP_NAME "spine" CACHE STRING "Project Name")
project(${APP_NAME}_wasm)

set(BUILD_WASM 1)

set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -DEMSCRIPTEN_HAS_UNBOUND_TYPE_NAMES=0")
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fno-exceptions -frtti -DEMSCRIPTEN_HAS_UNBOUND_TYPE_NAMES=1")

message("Current directory: ${CMAKE_CURRENT_LIST_DIR}")

include_directories(${CMAKE_CURRENT_LIST_DIR}/..)
file(GLOB SPINE_CORE_SRC "${CMAKE_CURRENT_LIST_DIR}/../spine/*.cpp")
file(GLOB COCOS_ADAPTER_SRC "${CMAKE_CURRENT_LIST_DIR}/*.cpp")

add_executable(${APP_NAME} ${SPINE_CORE_SRC} ${COCOS_ADAPTER_SRC})

set(EMS_LINK_FLAGS "-O3 -s WASM=${BUILD_WASM} -s INITIAL_MEMORY=33554432 -s ALLOW_MEMORY_GROWTH=1 -s DYNAMIC_EXECUTION=0 -s ERROR_ON_UNDEFINED_SYMBOLS=0 \
		-flto --no-entry --bind -s USE_ES6_IMPORT_META=0 -s EXPORT_ES6=1 -s MODULARIZE=1 -s EXPORT_NAME='spineWasm' \
		-s ENVIRONMENT=web -s FILESYSTEM=0 -s NO_EXIT_RUNTIME=1 -s LLD_REPORT_UNDEFINED \
		-s MIN_SAFARI_VERSION=110000 \
		-s EXPORTED_FUNCTIONS=['_spineListenerCallBackFromJS','_spineTrackListenerCallback'] \
		--js-library ../library_spine.js \
		--closure=1 \
		--closure-args=--externs=../library_spine_externs.js")


set_target_properties(${APP_NAME} PROPERTIES CXX_STANDARD 11 LINK_FLAGS ${EMS_LINK_FLAGS})