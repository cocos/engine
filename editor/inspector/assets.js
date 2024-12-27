const { join } = require('path');

module.exports = {
    'animation-graph': join(__dirname, './assets/animation-graph.js'),
    'animation-graph-variant': join(__dirname, './assets/animation-graph-variant.js'),
    'animation-mask': join(__dirname, './assets/animation-mask.js'),
    'audio-clip': join(__dirname, './assets/audio-clip.js'),
    'auto-atlas': join(__dirname, './assets/texture/auto-atlas.js'), // reuse
    'dragonbones-atlas': join(__dirname, './assets/json.js'), // reuse
    dragonbones: join(__dirname, './assets/json.js'),  // reuse
    'effect-header': join(__dirname, './assets/effect-header.js'),
    'erp-texture-cube': join(__dirname, './assets/erp-texture-cube.js'),
    'gltf-material': join(__dirname, './assets/material.js'), // reuse
    'label-atlas': join(__dirname, './assets/label-atlas.js'),
    'physics-material': join(__dirname, './assets/physics-material.js'),
    'render-pipeline': join(__dirname, './assets/render-pipeline.js'),
    'render-texture': join(__dirname, './assets/render-texture.js'),
    'sprite-frame': join(__dirname, './assets/sprite-frame.js'),
    'spine-data': join(__dirname, './assets/spine-data.js'),
    'texture-cube': join(__dirname, './assets/texture-cube.js'),
    'video-clip': join(__dirname, './assets/video-clip.js'),
    effect: join(__dirname, './assets/effect.js'),
    fbx: join(__dirname, './assets/fbx/index.js'),
    gltf: join(__dirname, './assets/fbx/index.js'), // reuse
    image: join(__dirname, './assets/image.js'),
    javascript: join(__dirname, './assets/javascript.js'),
    json: join(__dirname, './assets/json.js'),
    material: join(__dirname, './assets/material.js'),
    particle: join(__dirname, './assets/particle.js'),
    text: join(__dirname, './assets/text.js'),
    texture: join(__dirname, './assets/texture/index.js'),
    typescript: join(__dirname, './assets/typescript.js'),
    unknown: join(__dirname, './assets/unknown.js'),
    prefab: join(__dirname, './assets/prefab.js'),
    "*": join(__dirname, './assets/asterisk.js'),
};
