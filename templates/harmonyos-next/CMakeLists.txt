# the minimum version of CMake.

cmake_minimum_required(VERSION 3.8)
set(CC_LIB_NAME cocos)
set(CC_PROJ_SOURCES)
set(CC_COMMON_SOURCES)
set(CC_ALL_SOURCES)

option(APP_NAME "Project Name" "test-cases")
project(${APP_NAME} CXX)

set(CMAKE_CXX_FLAGS_DEBUG  "-Werror=return-type")


include(${COMMON_DIR}/CMakeLists.txt)

cc_openharmony_before_target(${CC_LIB_NAME})
add_library(${CC_LIB_NAME} SHARED ${CC_ALL_SOURCES})
cc_openharmony_after_target(${CC_LIB_NAME})