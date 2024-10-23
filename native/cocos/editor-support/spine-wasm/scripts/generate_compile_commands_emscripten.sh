#!/bin/bash

set -e

rm -rf build
mkdir build
cd build
cp ../CMakeLists.header.txt ./CMakeLists.txt
emcmake cmake . -DCMAKE_EXPORT_COMPILE_COMMANDS=ON -GNinja \
    -DCMAKE_CXX_FLAGS="-I${EMSDK}/upstream/emscripten/system/include -I${EMSDK}/upstream/include/c++/v1"

cp ./compile_commands.json ../..
rm -rf build
cd ..
