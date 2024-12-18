/****************************************************************************
 Copyright (c) 2020 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of cache-manager software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in cache-manager License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
const {
    getUserDataPath, readJsonSync, makeDirSync,
    writeFileSync, copyFile, downloadFile, deleteFile,
    rmdirSync, unzip, isOutOfStorage,
} = window.fsUtils;

let checkNextPeriod = false;
let writeCacheFileList = null;
let cleaning = false;
let suffix = 0;
const REGEX = /^https?:\/\/.*/;

const cacheManager = {

    cacheDir: 'gamecaches',

    cachedFileName: 'cacheList.json',

    // whether or not cache asset into user's storage space
    cacheEnabled: true,

    // whether or not auto clear cache when storage ran out
    autoClear: true,

    // cache one per cycle
    cacheInterval: 500,

    deleteInterval: 500,

    writeFileInterval: 2000,

    // whether or not storage space has run out
    outOfStorage: false,

    tempFiles: null,

    cachedFiles: null,

    cacheQueue: {},

    version: '1.0',

    getCache (url) {
        return this.cachedFiles.has(url) ? this.cachedFiles.get(url).url : '';
    },

    getTemp (url) {
        return this.tempFiles.has(url) ? this.tempFiles.get(url) : '';
    },

    init () {
        this.cacheDir = `${getUserDataPath()}/${this.cacheDir}`;
        const cacheFilePath = `${this.cacheDir}/${this.cachedFileName}`;
        const result = readJsonSync(cacheFilePath);
        if (result instanceof Error || !result.version) {
            if (!(result instanceof Error)) rmdirSync(this.cacheDir, true);
            this.cachedFiles = new cc.AssetManager.Cache();
            makeDirSync(this.cacheDir, true);
            writeFileSync(cacheFilePath, JSON.stringify({ files: this.cachedFiles._map, version: this.version }), 'utf8');
        } else {
            this.cachedFiles = new cc.AssetManager.Cache(result.files);
        }
        this.tempFiles = new cc.AssetManager.Cache();
    },

    updateLastTime (url) {
        if (this.cachedFiles.has(url)) {
            const cache = this.cachedFiles.get(url);
            cache.lastTime = Date.now();
        }
    },

    _write () {
        writeCacheFileList = null;
        writeFileSync(`${this.cacheDir}/${this.cachedFileName}`, JSON.stringify({ files: this.cachedFiles._map, version: this.version }), 'utf8');
    },

    writeCacheFile () {
        if (!writeCacheFileList) {
            writeCacheFileList = setTimeout(this._write.bind(this), this.writeFileInterval);
        }
    },

    _cache () {
        checkNextPeriod = false;
        const self = this;
        let id = '';
        // eslint-disable-next-line no-unreachable-loop
        for (const key in this.cacheQueue) {
            id = key;
            break;
        }
        if (!id) return;
        const { srcUrl, isCopy, cacheBundleRoot } = this.cacheQueue[id];
        const time = Date.now().toString();

        let localPath = '';

        if (cacheBundleRoot) {
            localPath = `${this.cacheDir}/${cacheBundleRoot}/${time}${suffix++}${cc.path.extname(id)}`;
        } else {
            localPath = `${this.cacheDir}/${time}${suffix++}${cc.path.extname(id)}`;
        }

        function callback (err) {
            if (err)  {
                if (isOutOfStorage(err.message)) {
                    self.outOfStorage = true;
                    self.autoClear && self.clearLRU();
                    return;
                }
            } else {
                self.cachedFiles.add(id, { bundle: cacheBundleRoot, url: localPath, lastTime: time });
                self.writeCacheFile();
            }
            delete self.cacheQueue[id];
            if (!cc.js.isEmptyObject(self.cacheQueue) && !checkNextPeriod) {
                checkNextPeriod = true;
                setTimeout(self._cache.bind(self), self.cacheInterval);
            }
        }
        if (!isCopy) {
            downloadFile(srcUrl, localPath, null, callback);
        } else {
            copyFile(srcUrl, localPath, callback);
        }
    },

    cacheFile (id, srcUrl, cacheEnabled, cacheBundleRoot, isCopy) {
        cacheEnabled = cacheEnabled !== undefined ? cacheEnabled : this.cacheEnabled;
        if (!cacheEnabled || this.cacheQueue[id] || this.cachedFiles.has(id)) return;

        this.cacheQueue[id] = { srcUrl, cacheBundleRoot, isCopy };
        if (!checkNextPeriod && !this.outOfStorage) {
            checkNextPeriod = true;
            setTimeout(this._cache.bind(this), this.cacheInterval);
        }
    },

    clearCache () {
        rmdirSync(this.cacheDir, true);
        this.cachedFiles = new cc.AssetManager.Cache();
        makeDirSync(this.cacheDir, true);
        this.outOfStorage = false;
        clearTimeout(writeCacheFileList);
        this._write();
        cc.assetManager.bundles.forEach((bundle) => {
            if (REGEX.test(bundle.base)) this.makeBundleFolder(bundle.name);
        });
    },

    clearLRU () {
        if (cleaning) return;
        cleaning = true;
        const caches = [];
        const self = this;
        this.cachedFiles.forEach((val, key) => {
            if (self._isZipFile(key) && cc.assetManager.bundles.find((bundle) => bundle.base.indexOf(val.url) !== -1)) return;
            caches.push({ originUrl: key, url: val.url, lastTime: val.lastTime });
        });
        caches.sort((a, b) => a.lastTime - b.lastTime);
        // cache length above 3 then clear 1/3, or clear all caches
        if (caches.length < 3) {
            console.warn('Insufficient storage, cleaning now');
        } else {
            caches.length = Math.floor(caches.length / 3);
        }
        for (let i = 0, l = caches.length; i < l; i++) {
            const cacheKey = `${cc.assetManager.utils.getUuidFromURL(caches[i].originUrl)}@native`;
            cc.assetManager.files.remove(cacheKey);
            this.cachedFiles.remove(caches[i].originUrl);
        }

        clearTimeout(writeCacheFileList);
        this._write();
        function deferredDelete () {
            const item = caches.pop();
            self._removePathOrFile(item.originUrl, item.url);
            if (caches.length > 0) {
                setTimeout(deferredDelete, self.deleteInterval);
            } else {
                cleaning = false;
            }
        }
        setTimeout(deferredDelete, self.deleteInterval);
    },

    removeCache (url) {
        if (this.cachedFiles.has(url)) {
            const path = this.cachedFiles.remove(url).url;
            clearTimeout(writeCacheFileList);
            this._write();
            this._removePathOrFile(url, path);
        }
    },

    _removePathOrFile (url, path) {
        if (this._isZipFile(url)) {
            if (this._isZipFile(path)) {
                deleteFile(path, this._deleteFileCB.bind(this));
            } else {
                rmdirSync(path, true);
                this._deleteFileCB();
            }
        } else {
            deleteFile(path, this._deleteFileCB.bind(this));
        }
    },

    _deleteFileCB (err) {
        if (!err) this.outOfStorage = false;
    },

    makeBundleFolder (bundleName) {
        makeDirSync(`${this.cacheDir}/${bundleName}`, true);
    },

    unzipAndCacheBundle (id, zipFilePath, cacheBundleRoot, onComplete) {
        const time = Date.now().toString();
        const targetPath = `${this.cacheDir}/${cacheBundleRoot}/${time}${suffix++}`;
        const self = this;
        makeDirSync(targetPath, true);
        unzip(zipFilePath, targetPath, (err) => {
            if (err) {
                rmdirSync(targetPath, true);
                if (isOutOfStorage(err.message)) {
                    self.outOfStorage = true;
                    self.autoClear && self.clearLRU();
                }
                onComplete && onComplete(err);
                return;
            }
            self.cachedFiles.add(id, { bundle: cacheBundleRoot, url: targetPath, lastTime: time });
            self.writeCacheFile();
            onComplete && onComplete(null, targetPath);
        });
    },

    _isZipFile (url) {
        return url.slice(-4) === '.zip';
    },
};

cc.assetManager.cacheManager = module.exports = cacheManager;
