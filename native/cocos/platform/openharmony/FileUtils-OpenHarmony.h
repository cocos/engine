/****************************************************************************
 Copyright (c) 2021-2023 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
 worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
 not use Cocos Creator software for developing other software or tools that's
 used for developing games. You are not granted to publish, distribute,
 sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
****************************************************************************/
#pragma once
//clang-format off
#include <cstdint>
//clang-format on
#include <napi/native_api.h>
#include <rawfile/raw_dir.h>
#include <rawfile/raw_file.h>
#include <rawfile/raw_file_manager.h>

#include "base/Macros.h"
#include "platform/FileUtils.h"

namespace cc {

class CC_DLL FileUtilsOpenHarmony : public FileUtils {
public:
    FileUtilsOpenHarmony();
    ~FileUtilsOpenHarmony() override;
    static bool initResourceManager(napi_env env, napi_value info);

    bool init() override;

    bool isAbsolutePath(const std::string &strPath) const override;

    std::string getWritablePath() const override;

    long getFileSize(const std::string &filepath) override;

    std::string getSuitableFOpen(const std::string &filenameUtf8) const override;

    FileUtils::Status getContents(const std::string &filename, ResizableBuffer *buffer) override;

    FileUtils::Status getRawFileDescriptor(const std::string &filename, RawFileDescriptor64 &descriptor);

    bool renameFile(const std::string &oldfullpath, const std::string &newfullpath) override;
    bool removeFile(const std::string &filepath) override;
    bool removeDirectory(const std::string &dirPath) override;

    static std::string _ohWritablePath;

private:
    bool isFileExistInternal(const std::string &strFilePath) const override;
    bool isDirectoryExistInternal(const std::string &dirPath) const override;

    static NativeResourceManager *_nativeResourceManager;
};

} // namespace cc
