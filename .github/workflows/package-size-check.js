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

        'Pass._rootBuffer',
        'Pass._buffers',
        'Pass._descriptorSet',
        'Pass._pipelineLayout',
        'Pass._passIndex',
        'Pass._propertyIndex',
        'Pass._programName',
        'Pass._dynamics',
        'Pass._propertyHandleMap',
        'Pass._rootBlock',
        'Pass._blocksInt',
        'Pass._blocks',
        'Pass._shaderInfo',
        'Pass._defines',
        'Pass._properties',
        'Pass._shader',
        'Pass._bs',
        'Pass._dss',
        'Pass._rs',
        'Pass._priority',
        'Pass._stage',
        'Pass._phase',
        'Pass._passID',
        'Pass._subpassID',
        'Pass._phaseID',
        'Pass._primitive',
        'Pass._batchingScheme',
        'Pass._dynamicStates',
        'Pass._instancedBuffers',
        'Pass._hash',
        'Pass._root',
        'Pass._device',
        'Pass._rootBufferDirty',
        'Pass._doInit',
        'Pass._syncBatchingScheme',
        'PassInstance._onStateChange',

        'RenderWindow._title',
        'RenderWindow._width',
        'RenderWindow._height',
        'RenderWindow._swapchain',
        'RenderWindow._renderPass',
        'RenderWindow._colorTextures',
        'RenderWindow._depthStencilTexture',
        'RenderWindow._cameras',
        'RenderWindow._hasOnScreenAttachments',
        'RenderWindow._hasOffScreenAttachments',
        'RenderWindow._framebuffer',
        'RenderWindow._device',
        'RenderWindow._renderWindowId',
        'RenderWindow._isResized',
        'RenderWindow._colorName',
        'RenderWindow._depthStencilName',

        'ProgramLib._templates',
        'ProgramLib._cache',
        'ProgramLib._templateInfos',

        'TextureBase._width',
        'TextureBase._height',
        'TextureBase._getGFXDevice',
        'TextureBase._getGFXFormat',
        'TextureBase._setGFXFormat',
        'TextureBase._getGFXPixelFormat',

        'SimpleTexture._gfxTexture',
        'SimpleTexture._gfxTextureView',
        'SimpleTexture._baseLevel',
        'SimpleTexture._maxLevel',
        'SimpleTexture._assignImage',
        'SimpleTexture._checkTextureLoaded',
        'SimpleTexture._textureReady',
        'SimpleTexture._setMipmapLevel',
        'SimpleTexture._setMipRange',
        'SimpleTexture._getGfxTextureCreateInfo',
        'SimpleTexture._getGfxTextureViewCreateInfo',
        'SimpleTexture._tryReset',
        'SimpleTexture._createTexture',
        'SimpleTexture._createTextureView',
        'SimpleTexture._tryDestroyTexture',
        'SimpleTexture._tryDestroyTextureView',

        'Material._passes',
        'Material._hash',
        'Material._fillInfo',
        'Material._prepareInfo',
        'Material._createPasses',
        'Material._update',
        'Material._uploadProperty',
        'Material._bindTexture',
        'Material._doDestroy',

        'RenderTexture._initWindow',


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
