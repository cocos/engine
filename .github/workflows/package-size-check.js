const fs = require('fs-extra');
const ps = require('path');
const { buildEngine } = require('@cocos/ccbuild');

const engineRoot = ps.resolve(__dirname, '..', '..');
console.log(`Engine root: ${engineRoot}`);

const exportsDir = ps.join(engineRoot, 'exports');
const files = fs.readdirSync(exportsDir);
const features = [];
files.forEach(file => {
    const filePath = ps.join(exportsDir, file);
    const feature = ps.parse(ps.basename(filePath)).name;
    if (feature !== 'vendor-google') {
        features.push(feature);
    }
});

console.log(`features: [ ${features.join(', ')} ]`);

(async () => {
    const outDir = ps.join(engineRoot, 'build-cc-out');

    const options = {
        engine: engineRoot,
        out: outDir,
        platform: "WECHAT",
        moduleFormat: "system",
        compress: true,
        split: false,
        nativeCodeBundleMode: "wasm",
        assetURLFormat: "runtime-resolved",
        noDeprecatedFeatures: true,
        sourceMap: false,
        features,
        loose: true,
        mode: "BUILD",
        flags: {
            DEBUG: false,
            NET_MODE: 0,
            SERVER_MODE: false
        },
        wasmCompressionMode: 'brotli',
        inlineEnum: true,
        mangleProperties: {
            "mangleProtected": true,
            "mangleList": [],
            "dontMangleList": [
                "BaseFactory",
                "Slot"
            ]
        },
    };

    await fs.ensureDir(outDir);
    await fs.emptyDir(outDir);

    await buildEngine(options);
})();
