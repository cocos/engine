'use strict';

const { join } = require('path');

module.exports = {
    image: join(__dirname, './assets/image-preview.js'),
    texture: join(__dirname, './assets/image-preview.js'),
    'sprite-frame': join(__dirname, './assets/image-preview.js'),
    fbx: join(__dirname, './assets/fbx/preview.js'),
    gltf: join(__dirname, './assets/fbx/preview.js'), // reuse
    'gltf-mesh': join(__dirname, './assets/mesh-preview.js'),
    'gltf-skeleton': join(__dirname, './assets/skeleton-preview.js'),
    'gltf-scene': join(__dirname, './assets/prefab-preview.js'),
    prefab: join(__dirname, './assets/prefab-preview.js'),
    'spine-data': join(__dirname, './assets/spine-preview.js'),
};
