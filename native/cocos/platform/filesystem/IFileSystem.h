
/****************************************************************************
 Copyright (c) 2022 Xiamen Yaji Software Co., Ltd.

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

#include "base/Macros.h"
#include "base/std/container/unordered_map.h"

#include "cocos/platform/filesystem/FilePath.h"
#include "cocos/platform/filesystem/IFileHandle.h"

namespace cc {
class CC_DLL IFileSystem {
public:
    enum class AccessFlag {
        READ_ONLY = 0x0000,
        WRITE_ONLY = 0x0001 << 0,
        READ_WRITE = 0x0001 << 1,
        APPEND = 0x0001 << 2,
    };
    virtual ~IFileSystem() = default;

    virtual bool createDirectory(const FilePath& path) = 0;
    virtual bool removeDirectory(const FilePath& path) = 0;

    virtual bool removeFile(const FilePath& filePath) = 0;
    virtual bool renameFile(const FilePath& oldFilePath, const FilePath& newFilePath) = 0;

    virtual bool pathExists(const FilePath& path) const = 0;
    virtual bool isAbsolutePath(const FilePath& path) const;

    virtual std::unique_ptr<IFileHandle> open(const FilePath& filePath, AccessFlag flag) = 0;
    virtual int64_t getFileSize(const FilePath& filePath) const = 0;

    virtual FilePath getUserAppDataPath() const = 0;

    virtual void setRootPath(const FilePath& rootPath) {
        _rootPath = rootPath;
    };
    virtual FilePath rootPath() const { return _rootPath; };
    /**
     *  List all files in a directory.
     *
     *  @param dirPath The path of the directory, it could be a relative or an absolute path.
     *  @return File paths in a string vector
     */
    virtual void listFiles(const FilePath& path, ccstd::vector<ccstd::string>* files) const;

    /**
     *  List all files recursively in a directory.
     *
     *  @param dirPath The path of the directory, it could be a relative or an absolute path.
     *  @return File paths in a string vector
     */
    virtual void listFilesRecursively(const FilePath& path, ccstd::vector<ccstd::string>* files) const;

protected:
    /**
     * Writable path.
     */
    ccstd::string _writablePath;

    FilePath _rootPath;
};

} // namespace cc
