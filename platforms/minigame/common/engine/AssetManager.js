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

/* eslint-disable no-global-assign */
/* eslint-disable no-undef */
/* eslint-disable import/no-dynamic-require */
const cacheManager = require('./cache-manager');

const { fs, downloadFile, readText, readArrayBuffer, readJson, loadSubpackage, getUserDataPath, exists } = window.fsUtils;

const REGEX = /^https?:\/\/.*/;

const downloader = cc.assetManager.downloader;
const parser = cc.assetManager.parser;
const presets = cc.assetManager.presets;
downloader.maxConcurrency = 12;
downloader.maxRequestsPerFrame = 64;
presets.scene.maxConcurrency = 12;
presets.scene.maxRequestsPerFrame = 64;

const subpackages = {};

const sys = cc.sys;
if (sys.platform === sys.Platform.TAOBAO_MINI_GAME) {
    require = globalThis.__taobaoRequire;
}

function downloadScript (url, options, onComplete) {
    if (REGEX.test(url)) {
        onComplete && onComplete(new Error('Can not load remote scripts'));
    } else {
        if (sys.platform !== sys.Platform.TAOBAO_CREATIVE_APP) { //Can't load scripts dynamically on Taobao platform
            require(`../../../${url}`);
        }
        onComplete && onComplete(null);
    }
}

function handleZip (url, options, onComplete) {
    const cachedUnzip = cacheManager.cachedFiles.get(url);
    if (cachedUnzip) {
        cacheManager.updateLastTime(url);
        onComplete && onComplete(null, cachedUnzip.url);
    } else if (REGEX.test(url)) {
        downloadFile(url, null, options.header, options.onFileProgress, (err, downloadedZipPath) => {
            if (err) {
                onComplete && onComplete(err);
                return;
            }
            cacheManager.unzipAndCacheBundle(url, downloadedZipPath, options.__cacheBundleRoot__, onComplete);
        });
    } else {
        cacheManager.unzipAndCacheBundle(url, url, options.__cacheBundleRoot__, onComplete);
    }
}

function loadAudioPlayer (url, options, onComplete) {
    cc.AudioPlayer.load(url).then((player) => {
        const audioMeta = {
            player,
            url,
            duration: player.duration,
            type: player.type,
        };
        onComplete(null, audioMeta);
    }).catch((err) => {
        onComplete(err);
    });
}

function download (url, func, options, onFileProgress, onComplete) {
    const result = transformUrl(url, options);
    if (result.inLocal) {
        func(result.url, options, onComplete);
    } else if (result.inCache) {
        cacheManager.updateLastTime(url);
        func(result.url, options, (err, data) => {
            if (err) {
                cacheManager.removeCache(url);
            }
            onComplete(err, data);
        });
    } else {
        downloadFile(url, null, options.header, onFileProgress, (err, path) => {
            if (err) {
                onComplete(err, null);
                return;
            }
            func(path, options, (err, data) => {
                if (!err) {
                    cacheManager.tempFiles.add(url, path);
                    cacheManager.cacheFile(url, path, options.cacheEnabled, options.__cacheBundleRoot__, true);
                }
                onComplete(err, data);
            });
        });
    }
}

function parseArrayBuffer (url, options, onComplete) {
    readArrayBuffer(url, onComplete);
}

function parseText (url, options, onComplete) {
    readText(url, onComplete);
}

function parseJson (url, options, onComplete) {
    readJson(url, onComplete);
}

function downloadText (url, options, onComplete) {
    download(url, parseText, options, options.onFileProgress, onComplete);
}

function downloadJson (url, options, onComplete) {
    download(url, parseJson, options, options.onFileProgress, onComplete);
}

function downloadArrayBuffer (url, options, onComplete) {
    download(url, parseArrayBuffer, options, options.onFileProgress, onComplete);
}

function loadFont (url, options, onComplete) {
    const fontFamily = __globalAdapter.loadFont(url);
    onComplete(null, fontFamily || 'Arial');
}

function doNothing (content, options, onComplete) {
    exists(content, (existence) => {
        if (existence) {
            onComplete(null, content);
        } else {
            onComplete(new Error(`file ${content} does not exist!`));
        }
    });
}

function downloadAsset (url, options, onComplete) {
    download(url, doNothing, options, options.onFileProgress, onComplete);
}

function downloadBundle (nameOrUrl, options, onComplete) {
    const bundleName = cc.path.basename(nameOrUrl);
    const version = options.version || cc.assetManager.downloader.bundleVers[bundleName];
    const suffix = version ? `${version}.` : '';

    function getConfigPathForSubPackage () {
        if (sys.platform === sys.Platform.TAOBAO_MINI_GAME) {
            return `${bundleName}/config.${suffix}json`;
        }
        return `subpackages/${bundleName}/config.${suffix}json`;
    }

    function appendBaseToJsonData (data) {
        if (!data) return;

        if (sys.platform === sys.Platform.TAOBAO_MINI_GAME) {
            data.base = `${bundleName}/`;
        } else {
            data.base = `subpackages/${bundleName}/`;
        }
    }

    if (subpackages[bundleName]) {
        const config = getConfigPathForSubPackage();
        loadSubpackage(bundleName, options.onFileProgress, (err) => {
            if (err) {
                onComplete(err, null);
                return;
            }
            downloadJson(config, options, (err, data) => {
                appendBaseToJsonData(data);
                onComplete(err, data);
            });
        });
    } else {
        let js; let url;
        if (REGEX.test(nameOrUrl) || nameOrUrl.startsWith(getUserDataPath())) {
            url = nameOrUrl;
            js = `src/bundle-scripts/${bundleName}/index.${suffix}js`;
            cacheManager.makeBundleFolder(bundleName);
        } else if (downloader.remoteBundles.indexOf(bundleName) !== -1) {
            url = `${downloader.remoteServerAddress}remote/${bundleName}`;
            js = `src/bundle-scripts/${bundleName}/index.${suffix}js`;
            cacheManager.makeBundleFolder(bundleName);
        } else {
            url = `assets/${bundleName}`;
            js = `assets/${bundleName}/index.${suffix}js`;
        }
        if (sys.platform === sys.Platform.TAOBAO_MINI_GAME) {
            require(js);
        } else if (sys.platform !== sys.Platform.TAOBAO_CREATIVE_APP) { // Can't load scripts dynamically on Taobao platform
            require(`./${js}`);
        }
        options.__cacheBundleRoot__ = bundleName;
        const config = `${url}/config.${suffix}json`;
        downloadJson(config, options, (err, data) => {
            if (err) {
                onComplete && onComplete(err);
                return;
            }
            if (data.isZip) {
                const zipVersion = data.zipVersion;
                const zipUrl = `${url}/res.${zipVersion ? `${zipVersion}.` : ''}zip`;
                handleZip(zipUrl, options, (err, unzipPath) => {
                    if (err) {
                        onComplete && onComplete(err);
                        return;
                    }
                    data.base = `${unzipPath}/res/`;
                    // PATCH: for android alipay version before v10.1.95 (v10.1.95 included)
                    // to remove in the future
                    if (sys.platform === sys.Platform.ALIPAY_MINI_GAME && sys.os === sys.OS.ANDROID) {
                        const resPath = `${unzipPath}res/`;
                        if (fs.accessSync({ path: resPath }).success) {
                            data.base = resPath;
                        }
                    }
                    onComplete && onComplete(null, data);
                });
            } else {
                data.base = `${url}/`;
                onComplete && onComplete(null, data);
            }
        });
    }
}

const originParsePVRTex = parser.parsePVRTex;
const parsePVRTex = function (file, options, onComplete) {
    readArrayBuffer(file, (err, data) => {
        if (err) {
            onComplete(err);
            return;
        }
        originParsePVRTex(data, options, onComplete);
    });
};

const originParsePKMTex = parser.parsePKMTex;
const parsePKMTex = function (file, options, onComplete) {
    readArrayBuffer(file, (err, data) => {
        if (err) {
            onComplete(err);
            return;
        }
        originParsePKMTex(data, options, onComplete);
    });
};

const originParseASTCTex = parser.parseASTCTex;
const parseASTCTex = function (file, options, onComplete) {
    readArrayBuffer(file, (err, data) => {
        if (err) {
            onComplete(err);
            return;
        }
        originParseASTCTex(data, options, onComplete);
    });
};

const originParsePlist = parser.parsePlist;
const parsePlist = function (url, options, onComplete) {
    readText(url, (err, file) => {
        if (err) {
            onComplete(err);
            return;
        }
        originParsePlist(file, options, onComplete);
    });
};

downloader.downloadScript = downloadScript;
downloader._downloadArrayBuffer = downloadArrayBuffer;
downloader._downloadJson = downloadJson;
parser.parsePVRTex = parsePVRTex;
parser.parsePKMTex = parsePKMTex;
parser.parseASTCTex = parseASTCTex;
parser.parsePlist = parsePlist;

downloader.register({
    '.js': downloadScript,

    // Audio
    '.mp3': downloadAsset,
    '.ogg': downloadAsset,
    '.wav': downloadAsset,
    '.m4a': downloadAsset,

    // Image
    '.png': downloadAsset,
    '.jpg': downloadAsset,
    '.bmp': downloadAsset,
    '.jpeg': downloadAsset,
    '.gif': downloadAsset,
    '.ico': downloadAsset,
    '.tiff': downloadAsset,
    '.image': downloadAsset,
    '.webp': downloadAsset,
    '.pvr': downloadAsset,
    '.pkm': downloadAsset,
    '.astc': downloadAsset,

    '.font': downloadAsset,
    '.eot': downloadAsset,
    '.ttf': downloadAsset,
    '.woff': downloadAsset,
    '.svg': downloadAsset,
    '.ttc': downloadAsset,

    // Txt
    '.txt': downloadAsset,
    '.xml': downloadAsset,
    '.vsh': downloadAsset,
    '.fsh': downloadAsset,
    '.atlas': downloadAsset,

    '.tmx': downloadAsset,
    '.tsx': downloadAsset,
    '.plist': downloadAsset,
    '.fnt': downloadAsset,

    '.json': downloadJson,
    '.ExportJson': downloadAsset,

    '.binary': downloadAsset,
    '.bin': downloadAsset,
    '.dbbin': downloadAsset,
    '.skel': downloadAsset,

    '.mp4': downloadAsset,
    '.avi': downloadAsset,
    '.mov': downloadAsset,
    '.mpg': downloadAsset,
    '.mpeg': downloadAsset,
    '.rm': downloadAsset,
    '.rmvb': downloadAsset,

    bundle: downloadBundle,

    default: downloadText,
});

parser.register({
    '.png': downloader.downloadDomImage,
    '.jpg': downloader.downloadDomImage,
    '.bmp': downloader.downloadDomImage,
    '.jpeg': downloader.downloadDomImage,
    '.gif': downloader.downloadDomImage,
    '.ico': downloader.downloadDomImage,
    '.tiff': downloader.downloadDomImage,
    '.image': downloader.downloadDomImage,
    '.webp': downloader.downloadDomImage,
    '.pvr': parsePVRTex,
    '.pkm': parsePKMTex,
    '.astc': parseASTCTex,

    '.font': loadFont,
    '.eot': loadFont,
    '.ttf': loadFont,
    '.woff': loadFont,
    '.svg': loadFont,
    '.ttc': loadFont,

    // Audio
    '.mp3': loadAudioPlayer,
    '.ogg': loadAudioPlayer,
    '.wav': loadAudioPlayer,
    '.m4a': loadAudioPlayer,

    // Txt
    '.txt': parseText,
    '.xml': parseText,
    '.vsh': parseText,
    '.fsh': parseText,
    '.atlas': parseText,

    '.tmx': parseText,
    '.tsx': parseText,
    '.fnt': parseText,
    '.plist': parsePlist,

    '.binary': parseArrayBuffer,
    '.bin': parseArrayBuffer,
    '.dbbin': parseArrayBuffer,
    '.skel': parseArrayBuffer,

    '.ExportJson': parseJson,
});

function transformUrl (url, options) {
    let inLocal = false;
    let inCache = false;
    const isInUserDataPath = url.startsWith(getUserDataPath());
    if (isInUserDataPath) {
        inLocal = true;
    } else if (REGEX.test(url)) {
        if (!options.reload) {
            const cache = cacheManager.cachedFiles.get(url);
            if (cache) {
                inCache = true;
                url = cache.url;
            } else {
                const tempUrl = cacheManager.tempFiles.get(url);
                if (tempUrl) {
                    inLocal = true;
                    url = tempUrl;
                }
            }
        }
    } else {
        inLocal = true;
    }
    return { url, inLocal, inCache };
}

cc.assetManager.transformPipeline.append((task) => {
    const input = task.output = task.input;
    for (let i = 0, l = input.length; i < l; i++) {
        const item = input[i];
        const options = item.options;
        if (!item.config) {
            if (item.ext === 'bundle') continue;
            options.cacheEnabled = options.cacheEnabled !== undefined ? options.cacheEnabled : false;
        } else {
            options.__cacheBundleRoot__ = item.config.name;
        }
        if (item.ext === '.cconb') {
            item.url = item.url.replace(item.ext, '.bin');
        } else if (item.ext === '.ccon') {
            item.url = item.url.replace(item.ext, '.json');
        }
    }
});

const originInit = cc.assetManager.init;
cc.assetManager.init = function (options) {
    originInit.call(cc.assetManager, options);
    const subpacks = cc.settings.querySettings('assets', 'subpackages');
    subpacks && subpacks.forEach((x) => subpackages[x] = `subpackages/${x}`);
    cacheManager.init();
};
