const downloader = cc.assetManager.downloader;
const originalDownloadTTF = downloader.handlers['.ttf'];

function downloadTTF (url, options, onComplete) {
    // can't use cached ttf on Xiaomi platform
    options.cacheEnabled = false;
    originalDownloadTTF(url, options, onComplete);
}

downloader.register({
    '.ttf': downloadTTF,
});
