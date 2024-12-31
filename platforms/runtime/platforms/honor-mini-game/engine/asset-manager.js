const cacheManager = require('../../../common/engine/cache-manager');
const { downloadFile, readText, readArrayBuffer, readJson, loadSubpackage, getUserDataPath, _subpackagesPath } = require('../../../common/engine/fs-utils');

cc.assetManager.fsUtils = ral.fsUtils;

const REGEX = /^https?:\/\/.*/;

const downloader = cc.assetManager.downloader;
const parser = cc.assetManager.parser;
const presets = cc.assetManager.presets;
downloader.maxConcurrency = 12;
downloader.maxRequestsPerFrame = 64;
presets.scene.maxConcurrency = 12;
presets.scene.maxRequestsPerFrame = 64;

const subpackages = {};
const loadedScripts = {};

function downloadScript (url, options, onComplete) {
    if (REGEX.test(url)) {
        onComplete && onComplete(new Error('Can not load remote scripts'));
        return;
    }

    if (loadedScripts[url]) return onComplete && onComplete();

    require(url);
    loadedScripts[url] = true;
    onComplete && onComplete(null);
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

function loadFont (url, options, onComplete) {
    const fontFamilyName = _getFontFamily(url);

    const fontFace = new FontFace(fontFamilyName, `url('${url}')`);
    document.fonts.add(fontFace);

    fontFace.load();
    fontFace.loaded.then(() => {
        onComplete(null, fontFamilyName);
    }, () => {
        cc.warnID(4933, fontFamilyName);
        onComplete(null, fontFamilyName);
    });
}

function _getFontFamily (fontHandle) {
    let ttfIndex = fontHandle.lastIndexOf('.ttf');
    if (ttfIndex === -1) {
        ttfIndex = fontHandle.lastIndexOf('.tmp');
    }
    if (ttfIndex === -1) return fontHandle;

    const slashPos = fontHandle.lastIndexOf('/');
    let fontFamilyName;
    if (slashPos === -1) {
        fontFamilyName = `${fontHandle.substring(0, ttfIndex)}_LABEL`;
    } else {
        fontFamilyName = `${fontHandle.substring(slashPos + 1, ttfIndex)}_LABEL`;
    }
    return fontFamilyName;
}

function doNothing (content, options, onComplete) { onComplete(null, content); }

function downloadAsset (url, options, onComplete) {
    download(url, doNothing, options, options.onFileProgress, onComplete);
}

function downloadBundle (nameOrUrl, options, onComplete) {
    const bundleName = cc.path.basename(nameOrUrl);
    const version = options.version || cc.assetManager.downloader.bundleVers[bundleName];
    const suffix = version ? `${version}.` : '';

    if (subpackages[bundleName]) {
        var config = `${bundleName}/config.${suffix}json`;
        loadSubpackage(bundleName, options.onFileProgress, (err) => {
            if (err) {
                onComplete(err, null);
                return;
            }
            downloadJson(config, options, (err, data) => {
                data && (data.base = `${bundleName}/`);
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

        if (!loadedScripts[js]) {
            require(js);
            loadedScripts[js] = true;
        }

        options.__cacheBundleRoot__ = bundleName;
        var config = `${url}/config.${suffix}json`;
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
                    onComplete && onComplete(null, data);
                });
            } else {
                data.base = `${url}/`;
                onComplete && onComplete(null, data);
            }
        });
    }
}

function downloadArrayBuffer (url, options, onComplete) {
    download(url, parseArrayBuffer, options, options.onFileProgress, onComplete);
}

const originParsePVRTex = parser.parsePVRTex;
const parsePVRTex = function (file, options, onComplete) {
    readArrayBuffer(file, (err, data) => {
        if (err) return onComplete(err);
        originParsePVRTex(data, options, onComplete);
    });
};

const originParsePKMTex = parser.parsePKMTex;
const parsePKMTex = function (file, options, onComplete) {
    readArrayBuffer(file, (err, data) => {
        if (err) return onComplete(err);
        originParsePKMTex(data, options, onComplete);
    });
};

const originParseASTCTex = parser.parseASTCTex;
const parseASTCTex = function (file, options, onComplete) {
    readArrayBuffer(file, (err, data) => {
        if (err) return onComplete(err);
        originParseASTCTex(data, options, onComplete);
    });
};

const originParsePlist = parser.parsePlist;
const parsePlist = function (url, options, onComplete) {
    readText(url, (err, file) => {
        if (err) return onComplete(err);
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

var transformUrl = function (url, options) {
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
};

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
    subpacks && subpacks.forEach((x) => subpackages[x] = `${_subpackagesPath}${x}`);
    cacheManager.init();
};
