const { lstatSync, existsSync, readdirSync } = require('fs-extra');
const { dirname, join } = require('path');

const { template, $, update, close } = require('./base');

exports.template = template;
exports.$ = $;
exports.update = update;
exports.close = close;

const { setHidden, setReadonly, isMultipleInvalid } = require('../utils/prop');

const AUTO_ATLAS_EXTNAME = '.pac';
const ASSET_DIR = join(Editor.Project.path, 'assets');

// Query the automatic atlas with the .pac suffix
async function findAutoAtlasFolder(spriteFrameUuid) {
    const filePath = await Editor.Message.request('asset-db', 'query-path', spriteFrameUuid);

    if (!filePath) {
        return;
    }

    let dir = dirname(filePath);
    // Some resources may not be located in the assets directory, 
    // so it's necessary to perform length checks to avoid infinite loops.
    while (dir !== ASSET_DIR && dir.length > 1) {
        const files = readdirSync(dir);
        const file = files.find(file => file.endsWith(AUTO_ATLAS_EXTNAME));
        if (file) {
            const meta = await Editor.Message.request('asset-db', 'query-asset-meta', join(dir, file));
            if (meta && meta.importer === 'auto-atlas') {
                return meta.uuid;
            }
        } else {
            dir = dirname(dir);
        }
    }
    return null;
}

// query the dom node by type
function findDomByType(parentElement, type) {
    for (const child of parentElement.children) {
        if (child.dump.type === type) {
            return child;
        }
    }
    return null;
}

exports.ready = function() {
    this.elements = {
        fillType: {
            update(element, dump) {
                setHidden(isMultipleInvalid(dump.type) || dump.type.value !== 3, element);
            },
        },
        fillCenter: {
            update(element, dump) {
                this.elements.fillType.update.call(this, element, dump);
                setReadonly(dump.fillType.value !== 2, element);
            },
        },
        fillStart: {
            update(element, dump) {
                this.elements.fillType.update.call(this, element, dump);
            },
        },
        fillRange: {
            update(element, dump) {
                this.elements.fillType.update.call(this, element, dump);
            },
        },
        spriteFrame: {
            ready(element, dump) {
                element.addEventListener('change-dump', (event) => {
                    const spriteFrameDump = event.target.dump;
                    const spriteFrameUuid = spriteFrameDump.value.uuid;
                    if (!spriteFrameUuid) {
                        return;
                    }

                    const parentElement = event.target.parentElement;
                    if (!parentElement) {
                        return;
                    }

                    Editor.Message.request('asset-db', 'query-asset-meta', spriteFrameUuid)
                        .then(async (spriteFrameMeta) => {
                            if (!spriteFrameMeta || !spriteFrameMeta.userData) {
                                return;
                            }

                            let autoAtlasUuid = '';
                            if (!spriteFrameMeta.userData.atlasUuid) {
                                autoAtlasUuid = await findAutoAtlasFolder(spriteFrameUuid);
                            }

                            const spriteAtlasDom = findDomByType(parentElement, 'cc.SpriteAtlas');
                            if (!spriteAtlasDom) {
                                return;
                            }

                            spriteAtlasDom.value = spriteFrameMeta.userData.atlasUuid || autoAtlasUuid;
                            spriteAtlasDom.dispatch('change');
                            spriteAtlasDom.dispatch('confirm');
                        })
                        .catch((err) => {
                            console.error(err);
                        });
                });
            },
        },
    };
};
