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

const mangleProperties = {
    mangleList: [
        'SpriteFrame._rect',
        'SpriteFrame._trimmedBorder',
        'SpriteFrame._offset',
        'SpriteFrame._originalSize',
        'SpriteFrame._rotated',
        'SpriteFrame._capInsets',
        'SpriteFrame._atlasUuid',
        'SpriteFrame._texture',
        'SpriteFrame._isFlipUVY',
        'SpriteFrame._isFlipUVX',
        'SpriteFrame._original',
        'SpriteFrame._packable',
        'SpriteFrame._pixelsToUnit',
        'SpriteFrame._pivot',
        'SpriteFrame._meshType',
        'SpriteFrame._extrude',
        'SpriteFrame._customOutLine',
        'SpriteFrame._mesh',
        'SpriteFrame._minPos',
        'SpriteFrame._maxPos',
        'SpriteFrame._refreshTexture',
        'SpriteFrame._initVertices',
        'SpriteFrame._updateMeshVertices',
        'SpriteFrame._createMesh',
        'SpriteFrame._updateMesh',
    ],
};

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
        mangleProperties,
    };

    await fs.ensureDir(outDir);
    await fs.emptyDir(outDir);

    await buildEngine(options);
})();
