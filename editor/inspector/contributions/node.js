'use strict';
const fs = require('fs');
const path = require('path');
module.paths.push(path.join(Editor.App.path, 'node_modules'));
const Profile = require('@base/electron-profile');
const { throttle } = require('lodash');
const utils = require('./utils');
const { trackEventWithTimer } = require('../utils/metrics');
const { injectionStyle, setLabel } = require('../utils/prop');

// ipc messages protocol
const messageProtocol = {
    scene: 'scene',
};

const lockList = [];
let lockPerform = false;
let lastSnapShot = null;
async function performLock() {
    if (lockPerform) { return; }
    if (lockList.length === 0) { return; }
    lockPerform = true;
    const params = lockList.shift();
    const { snapshotLock, lock, uuids, cancel } = params;
    if (snapshotLock && !lock) {

        if (lastSnapShot) {
            await endRecording(lastSnapShot, cancel);
            lastSnapShot = null;
        }
    // start snapshot
    } else if (!snapshotLock && lock) {
        lastSnapShot = await beginRecording(uuids);
    }
    lockPerform = false;
    await performLock();
}
/**
 * 替换之前的snapshotLock,由于UI层的事件是同步的，
 * 而新的beginRecording是异步的，所以需要使用队列来保证顺序
 * @param {*} lock
 * @param {*} uuids
 * @param {*} cancel
 */
function snapshotLock(panel, lock, uuids, cancel = false) {
    // 保存当前状态，放到队列中
    const params = {
        snapshotLock:panel.snapshotLock,
        lock,
        uuids,
        cancel,
    };
    lockList.push(params);
    // 执行队列中的操作;
    performLock();
    panel.snapshotLock = lock;
}

// 不传options时，会自动记录到undo队列，不需要调用endRecording
async function beginRecording(uuids, options) {
    if (!uuids) { return; }
    const undoID = await Editor.Message.request(messageProtocol.scene, 'begin-recording', uuids, options);
    return undoID;
}

async function endRecording(undoID, cancel) {
    if (!undoID) { return; }
    if (cancel) {
        await Editor.Message.request(messageProtocol.scene, 'cancel-recording', undoID);
    } else {
        await Editor.Message.request(messageProtocol.scene, 'end-recording', undoID);
    }
}

exports.listeners = {
    async 'change-dump'(event) {
        const panel = this;

        const target = event.target;
        if (!target) {
            return;
        }

        clearTimeout(panel.previewTimeId);

        if (!panel.snapshotLock) {
            snapshotLock(panel, true, panel.uuidList);
        }

        const dump = target.dump;
        if (!dump || panel.isDialoging) {
            return;
        }

        let setChildrenLayer = false;
        if (dump.path === 'layer') {
            if (panel.dumps && panel.dumps.some((perdump) => perdump.children && perdump.children.length > 0)) {
                // 只修改自身节点
                let choose = 1;

                // 有子节点的时候才弹出对话框
                panel.isDialoging = true;
                const warnResult = await Editor.Dialog.warn(Editor.I18n.t(`ENGINE.components.layer.confirm_message`), {
                    buttons: [
                        Editor.I18n.t('ENGINE.components.layer.change_children'),
                        Editor.I18n.t('ENGINE.components.layer.change_self'),
                        'Cancel',
                    ],
                    cancel: 2,
                });
                choose = warnResult.response;

                panel.isDialoging = false;

                // 取消，需要还原数值
                if (choose === 2) {
                    dump.value = panel.$.nodeLayerSelect.prevValues[0];
                    if (dump.values) {
                        dump.values = panel.$.nodeLayerSelect.prevValues;
                    }
                    Elements.layer.update.call(panel);
                    return;
                } else {
                    setChildrenLayer = choose === 0 ? true : false;
                }
            }
        }

        try {
            panel.readyToUpdate = false;

            for (let i = 0; i < panel.uuidList.length; i++) {
                const uuid = panel.uuidList[i];
                const { path, type, isArray } = dump;
                let value = dump.value;

                if (dump.values) {
                    value = dump.values[i];
                }

                if (setChildrenLayer) {
                    await Editor.Message.request(messageProtocol.scene, 'set-node-and-children-layer', {
                        uuid,
                        dump: {
                            value,
                        },
                    });

                    continue;
                }

                await Editor.Message.request(messageProtocol.scene, 'set-property', {
                    uuid,
                    path,
                    dump: {
                        type,
                        isArray,
                        value,
                    },
                });
            }
        } catch (error) {
            console.error(error);
        } finally {
            if (!panel.snapshotLock) {
                snapshotLock(panel, false);
            }
            panel.readyToUpdate = true;
        }
    },
    'confirm-dump'() {
        const panel = this;
        clearTimeout(panel.previewTimeId);
        snapshotLock(panel, false);
        // In combination with change-dump, snapshot only generated once after ui-elements continuously changed.
    },
    async 'create-dump'(event) {
        const panel = this;

        const target = event.target;
        if (!target) {
            return;
        }

        clearTimeout(panel.previewTimeId);

        const undoID = await beginRecording(panel.uuidList);
        const dump = target.dump;
        let cancel = false;
        try {
            for (let i = 0; i < panel.uuidList.length; i++) {
                const uuid = panel.uuidList[i];
                if (i > 0) {
                    dump.values[i] = dump.value;
                }

                await Editor.Message.request(messageProtocol.scene, 'update-property-from-null', {
                    uuid,
                    path: dump.path,
                });
            }

        } catch (error) {
            cancel = true;
            console.error(error);
        }
        await endRecording(undoID, cancel);
    },
    async 'reset-dump'(event) {
        const panel = this;

        const target = event.target;
        if (!target) {
            return;
        }

        clearTimeout(panel.previewTimeId);

        const undoID = await beginRecording(panel.uuidList);
        const dump = target.dump;
        try {
            for (let i = 0; i < panel.uuidList.length; i++) {
                const uuid = panel.uuidList[i];
                if (i > 0) {
                    dump.values[i] = dump.value;
                }

                await Editor.Message.request(messageProtocol.scene, 'reset-property', {
                    uuid,
                    path: dump.path,
                });
            }
        } catch (error) {
            await endRecording(undoID, true);
            console.error(error);
        }
    },
    'preview-dump'(event) {
        const panel = this;

        const target = event.target;
        if (!target) {
            return;
        }

        const dump = target.dump;
        if (!dump || panel.isDialoging) {
            return;
        }

        /**
         * Some assets don`t need to preview, like:
         * cc.AnimationClip
         */
        const notNeedToPreview = [
            'cc.AnimationClip',
        ];
        if (notNeedToPreview.includes(dump.type)) {
            return;
        }

        const { method, value: assetUuid } = event.detail;

        clearTimeout(panel.previewTimeId);

        if (method === 'confirm') {
            try {
                panel.previewTimeId = setTimeout(() => {
                    for (let i = 0; i < panel.uuidList.length; i++) {
                        const uuid = panel.uuidList[i];
                        const { path, type } = dump;
                        let value = dump.value;

                        if (dump.values) {
                            value = dump.values[i];
                        }

                        // 预览新的值
                        value.uuid = assetUuid;

                        Editor.Message.send(messageProtocol.scene, 'preview-set-property', {
                            uuid,
                            path,
                            dump: {
                                type,
                                value,
                            },
                        });
                    }
                }, 500);
            } catch (error) {
                console.error(error);
            }
        } else if (method === 'cancel') {
            panel.previewTimeId = setTimeout(() => {
                try {
                    for (let i = 0; i < panel.uuidList.length; i++) {
                        const uuid = panel.uuidList[i];
                        const { path } = dump;

                        Editor.Message.send(messageProtocol.scene, 'cancel-preview-set-property', {
                            uuid,
                            path,
                        });
                    }
                } catch (error) {
                    console.error(error);
                }
            }, 50);
        }
    },
};

exports.template = /* html*/`
<ui-drag-area class="container">
    <header class="header">
        <section class="prefab" hidden>
            <ui-label value="Prefab"></ui-label>
            <ui-button role="edit" tooltip="i18n:ENGINE.prefab.edit">
                <ui-icon value="edit"></ui-icon>
            </ui-button>
            <div class="unlink-btns">
                <ui-button role="unlink" tooltip="i18n:ENGINE.prefab.unlink_tip">
                    <ui-icon value="unlink"></ui-icon>
                </ui-button>
                <ui-button role="show-more">
                    <ui-icon value="arrow-triangle"></ui-icon>
                </ui-button>
            </div>
            <ui-button role="local" tooltip="i18n:ENGINE.prefab.local">
                <ui-icon value="location"></ui-icon>
            </ui-button>
            <ui-button role="reset" tooltip="i18n:ENGINE.prefab.reset">
                <ui-icon value="reset"></ui-icon>
            </ui-button>
            <ui-button role="save" tooltip="i18n:ENGINE.prefab.save">
                <ui-icon value="save-o"></ui-icon>
            </ui-button>
        </section>

        <section class="node">
            <ui-checkbox class="active"></ui-checkbox>
            <ui-input class="name"></ui-input>
        </section>
    </header>

    <section class="body">
        <section class="component scene">
            <ui-prop class="release" type="dump"></ui-prop>
            <ui-prop class="ambient" type="dump" ui-section-config></ui-prop>
            <ui-section class="skybox config" expand cache-expand="inspector-scene-skybox">
                <div slot="header" class="component-header">
                    <span>Skybox</span>
                    <ui-link tooltip="i18n:scene.menu.help_url">
                        <ui-icon value="help"></ui-icon>
                    </ui-link>
                </div>
                <div class="before"></div>
                <ui-section class="envmap" expand cache-expand="inspector-scene-skybox-envmap">
                    <ui-label slot="header" value="Envmap"></ui-label>
                    <ui-radio-group class="useHDR" default-value="HDR" value="HDR">
                        <ui-prop class="envmap-prop">
                            <ui-radio class="envmap-radio" slot="label" type="single" value="HDR" tabindex="0">
                                <ui-label value="HDR"></ui-label>
                            </ui-radio>
                            <ui-prop slot="content" class="envmapHDR" type="dump" no-label ui-section-config></ui-prop>
                        </ui-prop>
                        <ui-prop class="envmap-prop">
                            <ui-radio class="envmap-radio" slot="label" type="single" value="LDR" tabindex="0">
                                <ui-label value="LDR"></ui-label>
                            </ui-radio>
                            <ui-prop slot="content" class="envmapLDR" type="dump" no-label ui-section-config></ui-prop>
                        </ui-prop>
                    </ui-radio-group>
                    <ui-prop class="reflection">
                        <ui-label slot="label">Reflection Convolution</ui-label>
                        <div slot="content">
                            <ui-loading style="display:none; position: relative;top: 4px;"></ui-loading>
                            <ui-button class="blue bake" style="display:none;">Bake</ui-button>
                            <ui-button class="red remove" style="display:none;">Remove</ui-button>
                        </div>
                    </ui-prop>
                </ui-section>
                <div class="after"></div>
            </ui-section>
            <ui-prop class="fog" type="dump" ui-section-config></ui-prop>
            <ui-prop class="shadows" type="dump" ui-section-config></ui-prop>
            <ui-prop class="octree" type="dump" ui-section-config></ui-prop>
            <ui-prop class="skin" type="dump" ui-section-config></ui-prop>
            <ui-prop class="postSettings" type="dump" ui-section-config></ui-prop>
        </section>

        <ui-section class="component node config" expand cache-expand="inspector-node">
            <header class="component-header" slot="header">
                <span class="name">Node</span>
                <ui-link class="link" tooltip="i18n:ENGINE.menu.help_url">
                    <ui-icon value="help"></ui-icon>
                </ui-link>
                <ui-icon class="menu" value="menu" tooltip="i18n:ENGINE.menu.component"></ui-icon>
            </header>

            <ui-prop class="position" type="dump"></ui-prop>
            <ui-prop class="rotation" type="dump"></ui-prop>
            <ui-prop class="scale" type="dump"></ui-prop>
            <ui-prop class="mobility" type="dump"></ui-prop>
            <ui-prop class="layer">
                <ui-label slot="label" value="Layer"></ui-label>
                <div class="layer-content" slot="content">
                    <ui-prop class="layer-select" type="dump" no-label></ui-prop>
                    <ui-button class="layer-edit">Edit</ui-button>
                </div>
            </ui-prop>
            <div class="node-section"></div>
        </ui-section>

        <section class="section-body"></section>
        <section class="section-missing"></section>

        <footer class="footer">
            <ui-button class="add-component" size="medium">
                <ui-label value="i18n:ENGINE.components.add_component"></ui-label>
            </ui-button>
        </footer>

        <section class="section-asset"></section>
    </section>
</ui-drag-area>
`;
exports.style = fs.readFileSync(path.join(__dirname, './node.css'), 'utf8');

exports.$ = {
    container: '.container',
    header: '.container > .header',
    body: '.container > .body',

    prefab: '.container > .header > .prefab',
    prefabUnlink: '.container > .header > .prefab [role="unlink"]',
    prefabMore: '.container > .header > .prefab [role="show-more"]',
    prefabLocal: '.container > .header > .prefab > [role="local"]',
    prefabReset: '.container > .header > .prefab > [role="reset"]',
    prefabSave: '.container > .header > .prefab > [role="save"]',
    prefabEdit: '.container > .header > .prefab > [role="edit"]',

    active: '.container > .header > .node > .active',
    name: '.container > .header > .node > .name',

    scene: '.container > .body > .scene',
    sceneRelease: '.container > .body > .scene > .release',
    sceneAmbient: '.container > .body > .scene > .ambient',
    sceneFog: '.container > .body > .scene > .fog',
    sceneShadows: '.container > .body > .scene > .shadows',
    sceneSkybox: '.container > .body > .scene > .skybox',
    sceneSkyboxBefore: '.container > .body > .scene > .skybox > .before',
    sceneSkyboxUseHDR: '.container > .body > .scene > .skybox .useHDR',
    sceneSkyboxEnvmapHDR: '.container > .body > .scene > .skybox .envmapHDR',
    sceneSkyboxEnvmapLDR: '.container > .body > .scene > .skybox .envmapLDR',
    sceneSkyboxReflection: '.container > .body > .scene > .skybox .reflection',
    sceneSkyboxReflectionLoading: '.container > .body > .scene > .skybox .reflection ui-loading',
    sceneSkyboxReflectionBake: '.container > .body > .scene > .skybox .reflection .bake',
    sceneSkyboxReflectionRemove: '.container > .body > .scene > .skybox .reflection .remove',
    sceneSkyboxAfter: '.container > .body > .scene > .skybox > .after',
    sceneOctree: '.container > .body > .scene > .octree',
    sceneSkin: '.container > .body > .scene > .skin',
    scenePostSettings: '.container > .body > .scene > .postSettings',

    node: '.container > .body > .node',
    nodeHeader: '.container > .body > .node > .component-header',
    nodeSection: '.container > .body > .node >.node-section',
    nodeMenu: '.container > .body > .node > .component-header > .menu',
    nodeLink: '.container > .body > .node > .component-header > .link',

    nodePosition: '.container > .body > .node > .position',
    nodeRotation: '.container > .body > .node > .rotation',
    nodeScale: '.container > .body > .node > .scale',
    nodeMobility: '.container > .body > .node > .mobility',
    nodeLayer: '.container > .body > .node > .layer',
    nodeLayerSelect: '.container > .body > .node > .layer .layer-select',
    nodeLayerButton: '.container > .body > .node > .layer .layer-edit',

    sectionBody: '.container > .body > .section-body',
    sectionMissing: '.container > .body > .section-missing',
    sectionAsset: '.container > .body > .section-asset',

    footer: '.container > .body > .footer',
    componentAdd: '.container > .body > .footer .add-component',
};

const Elements = {
    panel: {
        ready() {
            const panel = this;

            panel.throttleUpdate = throttle(async () => {
                if (!panel.readyToUpdate) {
                    return;
                }
                for (const prop in Elements) {
                    const element = Elements[prop];
                    if (element.update) {
                        await element.update.call(panel);
                    }
                }
            }, 100, { leading: false, trailing: true });

            panel.__nodeChanged__ = (uuid) => {
                if (Array.isArray(panel.uuidList) && panel.uuidList.includes(uuid)) {
                    panel.throttleUpdate();
                }
            };

            Editor.Message.addBroadcastListener('scene:change-node', panel.__nodeChanged__);

            panel.__animationTimeChange__ = () => {
                if (!panel.isAnimationMode()) {
                    return;
                }

                panel.__nodeChanged__(panel.uuidList[0]);
            };

            Editor.Message.addBroadcastListener('scene:animation-time-change', panel.__animationTimeChange__);

            panel.__projectSettingChanged__ = async function(name) {
                if (name !== 'layers') {
                    return;
                }

                for (const prop in Elements) {
                    const element = Elements[prop];
                    if (element.update) {
                        await element.update.call(panel);
                    }
                }
            };

            Editor.Message.addBroadcastListener('project:setting-change', panel.__projectSettingChanged__);

            panel.__throttleProfileChanged__ = throttle(async (protocol, file, key) => {
                if (protocol === 'defaultPreferences' && file === 'packages/inspector.json' && key === 'message-protocol') {
                    await panel.__queryMessageProtocolScene__();

                    for (const prop in Elements) {
                        const element = Elements[prop];
                        if (element.update) {
                            await element.update.call(panel);
                        }
                    }
                }
            }, 100, { leading: false, trailing: true });

            Profile.on('change', panel.__throttleProfileChanged__);

            // 识别拖入脚本资源
            panel.$.container.addEventListener('dragover', (event) => {
                event.preventDefault();

                if (panel.dump.isScene) {
                    event.dataTransfer.dropEffect = 'none';
                } else {
                    event.dataTransfer.dropEffect = 'copy';
                }
            });

            panel.$.container.addEventListener('drop', async (event) => {
                event.preventDefault();
                event.stopPropagation();

                if (panel.dump.isScene) {
                    return;
                }

                // 支持多选脚本拖入
                const { additional = [], value, type } = JSON.parse(JSON.stringify(Editor.UI.DragArea.currentDragInfo)) || {};

                if (value && additional.every((v) => v.value !== value)) {
                    additional.push({ value, type });
                }

                // Todo
                // await beginRecording(panel.uuidList);
                for (const info of additional) {
                    const config = panel.dropConfig[info.type];
                    if (config) {
                        await Editor.Message.request(config.package, config.message, info, panel.dumps, panel.uuidList);
                    }
                }
            });

            panel._readyToUpdate = true;
            if (panel.readyToUpdate === undefined) {
                Object.defineProperty(panel, 'readyToUpdate', {
                    enumerable: true,
                    get() {
                        return panel._readyToUpdate;
                    },
                    set(val) {
                        panel._readyToUpdate = val;
                        if (val && panel.throttleUpdate) {
                            panel.throttleUpdate();
                        }
                    },
                });
            }
        },
        async update() {
            const panel = this;

            let dumps = [];

            try {
                dumps = await Promise.all(
                    panel.uuidList.map((uuid) => {
                        return Editor.Message.request(messageProtocol.scene, 'query-node', uuid);
                    }),
                );
            } catch (err) {
                console.error(err);
            }

            dumps = dumps.filter(Boolean);

            panel.dump = dumps[0];
            panel.dumps = [];
            panel.uuidList = [];
            panel.assets = {};

            if (panel.dump) {
                panel.$.container.removeAttribute('hidden');

                // 以第一个节点的类型，过滤多选的其他不同类型，比如 node 和 sceneNode 就不能混为多选编辑
                const type = panel.dump.__type__;
                dumps.forEach((dump) => {
                    if (dump.__type__ === type) {
                        panel.uuidList.push(dump.uuid.value);
                        panel.dumps.push(dump);
                    }
                });

                // 补充缺失的 dump 数据，如 path values 等，收集节点内的资源
                utils.translationDump(panel.dump, panel.dumps.length > 1 ? panel.dumps : undefined, panel.assets);
            } else {
                panel.$.container.setAttribute('hidden', '');
            }
        },
        close() {
            const panel = this;

            panel.throttleUpdate.cancel();
            panel.throttleUpdate = undefined;

            Editor.Message.removeBroadcastListener('scene:change-node', panel.__nodeChanged__);
            Editor.Message.removeBroadcastListener('scene:animation-time-change', panel.__animationTimeChange__);
            Editor.Message.removeBroadcastListener('project:setting-change', panel.__projectSettingChanged__);

            Profile.removeListener('change', panel.__throttleProfileChanged__);
            panel.__throttleProfileChanged__.cancel();
            panel.__throttleProfileChanged__ = undefined;
        },
    },
    prefab: {
        ready() {
            const panel = this;

            panel.$.prefab.addEventListener('confirm', async (event) => {
                const button = event.target;

                if (!panel.dump || !panel.dump.__prefab__ || !button || !panel.dumps?.length) {
                    return;
                }

                const role = button.getAttribute('role');

                for (const dump of panel.dumps) {
                    const prefab = dump.__prefab__;

                    switch (role) {
                        case 'edit': {
                            const assetId = prefab.prefabStateInfo?.assetUuid;
                            if (!assetId) {
                                return;
                            }
                            Editor.Message.request('asset-db', 'open-asset', assetId);
                            break;
                        }
                        case 'unlink': {
                            await Editor.Message.request(messageProtocol.scene, 'unlink-prefab', prefab.rootUuid, false);
                            break;
                        }
                        case 'local': {
                            Editor.Message.send('assets', 'twinkle', prefab.uuid);
                            break;
                        }
                        case 'reset': {
                            await Editor.Message.request(messageProtocol.scene, 'restore-prefab', prefab.rootUuid, prefab.uuid);
                            break;
                        }
                        case 'save': {
                            // apply-prefab是自定义的undo,在场景中实现了undo
                            await Editor.Message.request(messageProtocol.scene, 'apply-prefab', prefab.rootUuid);
                            break;
                        }
                        case 'show-more': {
                            Editor.Menu.popup({
                                menu: [
                                    {
                                        label: Editor.I18n.t('ENGINE.prefab.unlink'),
                                        async click() {
                                            await Editor.Message.request(messageProtocol.scene, 'unlink-prefab', prefab.rootUuid, false);
                                        },
                                    },
                                    {
                                        label: Editor.I18n.t('ENGINE.prefab.unlink_recursively'),
                                        async click() {
                                            await Editor.Message.send('hierarchy', 'unlink-prefab-recursively');
                                        },
                                    },
                                ],
                            });
                            break;
                        }
                    }
                }
            });
        },
        async update() {
            const panel = this;

            if (!panel.dump || !panel.dump.__prefab__) {
                panel.$.prefab.setAttribute('hidden', '');
                return;
            }

            panel.$.prefab.removeAttribute('hidden');

            const prefab = panel.dump.__prefab__;
            const prefabStateInfo = prefab.prefabStateInfo;

            const canUnlink = panel.dumps.some(dump => {
                if (dump.__prefab__ && dump.__prefab__.prefabStateInfo) {
                    const state = dump.__prefab__.prefabStateInfo.state;
                    if (state === 2 || state === 3) {
                        return true;
                    }
                }
                return false;
            });
            if (canUnlink) {
                panel.$.prefabUnlink.removeAttribute('disabled');
                panel.$.prefabMore.removeAttribute('disabled');
            } else {
                panel.$.prefabUnlink.setAttribute('disabled', '');
                panel.$.prefabMore.setAttribute('disabled', '');
            }

            const assetInfo = await Editor.Message.request('asset-db', 'query-asset-info', prefab.uuid);
            if (assetInfo) {
                panel.$.prefab.removeAttribute('missing');

                if (prefabStateInfo.isRevertable) {
                    panel.$.prefabReset.removeAttribute('disabled');
                } else {
                    panel.$.prefabReset.setAttribute('disabled', '');
                }

                if (prefabStateInfo.isApplicable) {
                    panel.$.prefabSave.removeAttribute('disabled');
                } else {
                    panel.$.prefabSave.setAttribute('disabled', '');
                }

                if (assetInfo.uuid.includes('@')) {
                    panel.$.prefabEdit.setAttribute('disabled', '');
                } else {
                    panel.$.prefabEdit.removeAttribute('disabled');
                }
            } else {
                panel.$.prefab.setAttribute('missing', '');
                panel.$.prefabEdit.setAttribute('disabled', '');
                panel.$.prefabLocal.setAttribute('disabled', '');
                panel.$.prefabReset.setAttribute('disabled', '');
                panel.$.prefabSave.setAttribute('disabled', '');
            }

            if ((panel.dumps && panel.dumps.length > 1) || (Editor.EditMode.getMode() === 'prefab' && !prefabStateInfo.isUnwrappable)) {
                panel.$.prefabEdit.setAttribute('disabled', '');
            }
        },
    },
    header: {
        ready() {
            const panel = this;
            panel.$.active.addEventListener('change', (event) => {
                const value = event.target.value;
                const dump = event.target.dump;

                dump.value = value;

                if ('values' in dump) {
                    dump.values.forEach((val, index) => {
                        dump.values[index] = value;
                    });
                }
                panel.$.active.dispatch('change-dump');
            });
            panel.$.active.addEventListener('confirm', () => {
                panel.$.active.dispatch('confirm-dump');
            });

            panel.$.name.addEventListener('change', (event) => {
                const value = event.target.value;
                const dump = event.target.dump;

                dump.value = value;

                if ('values' in dump) {
                    dump.values.forEach((val, index) => {
                        dump.values[index] = value;
                    });
                }
                panel.$.name.dispatch('change-dump');
            });
            panel.$.name.addEventListener('confirm', () => {
                panel.$.name.dispatch('confirm-dump');
            });
        },
        update() {
            const panel = this;

            if (!panel.dump) {
                return;
            }

            let activeDisabled = false;
            let activeInvalid = false;
            let nameDisabled = false;
            let nameInvalid = false;

            if (panel.dump.isScene) {
                activeDisabled = true;
                nameDisabled = true;
            } else {

                if (panel.dumps && panel.dumps.length > 1) {
                    // when changing, stop validating
                    if (!panel.$.active.hasAttribute('focused')) {
                        if (panel.dumps.some((dump) => dump.active.value !== panel.dump.active.value)) {
                            activeInvalid = true;
                        }
                    }

                    // when changing, stop validating
                    if (!panel.$.name.hasAttribute('focused')) {
                        if (panel.dumps.some((dump) => dump.name.value !== panel.dump.name.value)) {
                            nameInvalid = true;
                        }
                    }
                }
            }

            panel.$.active.value = panel.dump.active.value;
            panel.$.active.dump = panel.dump.active;
            panel.$.active.disabled = activeDisabled;
            panel.$.active.invalid = activeInvalid;

            panel.$.name.value = panel.dump.name.value;
            panel.$.name.dump = panel.dump.name;
            panel.$.name.disabled = nameDisabled;
            panel.$.name.invalid = nameInvalid;
        },
    },
    scene: {
        ready() {
            const panel = this;

            const $help = panel.$.sceneSkybox.querySelector('ui-link');
            panel.setHelpUrl($help, { help: 'i18n:cc.Skybox' });
            $help.addEventListener('click', (event) => {
                event.stopPropagation();
                event.preventDefault();
            });

            panel.$.sceneSkyboxUseHDR.addEventListener('change', Elements.scene.skyboxUseHDRChange.bind(panel));
            panel.$.sceneSkyboxEnvmapHDR.addEventListener('change-dump', Elements.scene.skyboxEnvmapChange.bind(panel, true));
            panel.$.sceneSkyboxEnvmapLDR.addEventListener('change-dump', Elements.scene.skyboxEnvmapChange.bind(panel, false));
            panel.$.sceneSkyboxReflectionBake.addEventListener('confirm', Elements.scene.skyboxReflectionConvolutionBake.bind(panel));
            panel.$.sceneSkyboxReflectionRemove.addEventListener('confirm', Elements.scene.skyboxReflectionConvolutionRemove.bind(panel));
        },
        async update() {
            const panel = this;

            if (!panel.dump || !panel.dump.isScene) {
                if (!panel.isAnimationMode()) {
                    panel.toggleShowAddComponentBtn(true);
                }
                return;
            }
            // 场景模式要隐藏按钮
            panel.toggleShowAddComponentBtn(false);

            panel.$this.setAttribute('sub-type', 'scene');
            panel.$.container.removeAttribute('droppable');

            panel.$.sceneRelease.render(panel.dump.autoReleaseAssets);

            // 由于场景属性对象不是继承于 Component 所以没有修饰器，displayName, help 数据在这里配置
            panel.dump._globals.ambient.displayName = 'Ambient';
            panel.dump._globals.ambient.editor = { help: 'i18n:cc.Ambient' };
            panel.dump._globals.ambient.help = panel.getHelpUrl(panel.dump._globals.ambient.editor);
            panel.$.sceneAmbient.render(panel.dump._globals.ambient);

            panel.dump._globals.fog.displayName = 'Fog';
            panel.dump._globals.fog.editor = { help: 'i18n:cc.Fog' };
            panel.dump._globals.fog.help = panel.getHelpUrl(panel.dump._globals.fog.editor);
            panel.$.sceneFog.render(panel.dump._globals.fog);

            panel.dump._globals.shadows.displayName = 'Shadows';
            panel.dump._globals.shadows.editor = { help: 'i18n:cc.Shadow' };
            panel.dump._globals.shadows.help = panel.getHelpUrl(panel.dump._globals.shadows.editor);
            panel.$.sceneShadows.render(panel.dump._globals.shadows);

            // skyBox 逻辑 start
            let $sceneSkyboxContainer = panel.$.sceneSkyboxBefore;
            const oldSkyboxProps = Object.keys(panel.$skyboxProps);
            const newSkyboxProps = [];

            // these properties have custom editing interface
            const customProperties = ['envmap', 'useHDR', '_envmapHDR', '_envmapLDR'];
            const afterPositionProperties = ['reflectionMap', 'diffuseMap'];

            for (const key in panel.dump._globals.skybox.value) {
                const dump = panel.dump._globals.skybox.value[key];

                if (customProperties.includes(key)) {
                    if (key === 'useHDR') {
                        panel.$.sceneSkyboxUseHDR.value = dump.value ? 'HDR' : 'LDR';
                        panel.$.sceneSkyboxUseHDR.dump = dump;
                    } else if (key === '_envmapHDR') {
                        panel.$.sceneSkyboxEnvmapHDR.render(dump);
                    } else if (key === '_envmapLDR') {
                        panel.$.sceneSkyboxEnvmapLDR.render(dump);
                    }
                    continue;
                }

                if (!dump.visible) {
                    continue;
                }

                const id = `${dump.type || dump.name}:${dump.path}`;
                let $prop = panel.$skyboxProps[id];
                newSkyboxProps.push(id);

                if (afterPositionProperties.includes(key)) {
                    $sceneSkyboxContainer = panel.$.sceneSkyboxAfter;
                } else {
                    $sceneSkyboxContainer = panel.$.sceneSkyboxBefore;
                }

                if (!$prop) {
                    $prop = document.createElement('ui-prop');
                    $prop.setAttribute('type', 'dump');
                    panel.$skyboxProps[id] = $prop;
                    $sceneSkyboxContainer.appendChild($prop);
                } else if (!$prop.isConnected || !$prop.parentElement) {
                    $sceneSkyboxContainer.appendChild($prop);
                }

                $prop.render(dump);
            }

            for (const id of oldSkyboxProps) {
                if (!newSkyboxProps.includes(id)) {
                    const $prop = panel.$skyboxProps[id];
                    if ($prop && $prop.parentElement) {
                        $prop.parentElement.removeChild($prop);
                    }
                }
            }

            Elements.scene.skyboxReflectionConvolution.call(panel);
            // skyBox 逻辑 end

            panel.dump._globals.octree.displayName = 'Octree Scene Culling';
            panel.dump._globals.octree.editor = { help: 'i18n:cc.OctreeCulling' };
            panel.dump._globals.octree.help = panel.getHelpUrl(panel.dump._globals.octree.editor);
            panel.$.sceneOctree.render(panel.dump._globals.octree);

            panel.dump._globals.skin.displayName = 'Skin';
            panel.dump._globals.skin.editor = { help: 'i18n:cc.Skin' };
            panel.dump._globals.skin.help = panel.getHelpUrl(panel.dump._globals.skin.editor);
            panel.$.sceneSkin.render(panel.dump._globals.skin);

            panel.dump._globals.postSettings.displayName = 'PostSettings';
            panel.$.scenePostSettings.render(panel.dump._globals.postSettings);

            const $skyProps = panel.$.sceneSkybox.querySelectorAll('ui-prop[type="dump"]');
            $skyProps.forEach(($prop) => {
                if ($prop.dump.name === 'envLightingType') {
                    if (!$prop.regenerate) {
                        $prop.regenerate = Elements.scene.regenerate.bind(panel);
                        $prop.addEventListener('change-dump', $prop.regenerate);
                    }
                }
            });
        },
        async regenerate() {
            const panel = this;

            const dump = panel.dump._globals.skybox.value;
            if (!dump.envmap.value) {
                return;
            }

            const envMapUuid = dump.envmap.value.uuid;
            if (!envMapUuid) {
                return;
            }

            const envLightingType = dump.envLightingType.value;

            // DIFFUSEMAP_WITH_REFLECTION 的枚举值为 2
            if (envLightingType === 2) {
                await Editor.Message.request(messageProtocol.scene, 'execute-scene-script', {
                    name: 'inspector',
                    method: 'generateDiffuseMap',
                    args: [envMapUuid],
                });
            } else {
                await Editor.Message.request(messageProtocol.scene, 'execute-scene-script', {
                    name: 'inspector',
                    method: 'generateVector',
                    args: [envMapUuid],
                });
            }
        },
        async setEnvMapAndConvolutionMap(uuid) {
            await Editor.Message.request(messageProtocol.scene, 'execute-scene-script', {
                name: 'inspector',
                method: 'setSkyboxEnvMap',
                args: [uuid],
            });
            if (uuid) {
                await Editor.Message.request(messageProtocol.scene, 'execute-scene-script', {
                    name: 'inspector',
                    method: 'setReflectionConvolutionMap',
                    args: [uuid],
                });
            }
        },
        async skyboxReflectionConvolution() {
            const panel = this;

            panel.$.sceneSkyboxReflection.style.display = 'inline-block';
            panel.$.sceneSkyboxReflectionLoading.style.display = 'none';

            const reflectionMap = panel.dump._globals.skybox.value['reflectionMap'];
            if (reflectionMap.value && reflectionMap.value.uuid) {
                panel.$.sceneSkyboxReflectionBake.style.display = 'none';
                panel.$.sceneSkyboxReflectionRemove.style.display = 'inline-flex';
            } else {
                panel.$.sceneSkyboxReflectionBake.style.display = 'inline-flex';
                panel.$.sceneSkyboxReflectionRemove.style.display = 'none';

                // if envmap value unexist, the column of bake button hidden;
                const envMapData = panel.dump._globals.skybox.value['envmap'];
                if (!envMapData.value || !envMapData.value.uuid) {
                    panel.$.sceneSkyboxReflection.style.display = 'none';
                }
            }
        },
        async skyboxReflectionConvolutionBake() {
            const panel = this;

            const envMapData = panel.dump._globals.skybox.value['envmap'];
            if (!envMapData.value || !envMapData.value.uuid) {
                return;
            }

            panel.$.sceneSkyboxReflectionLoading.style.display = 'inline-flex';
            panel.$.sceneSkyboxReflectionBake.style.display = 'none';

            await Editor.Message.request(messageProtocol.scene, 'execute-scene-script', {
                name: 'inspector',
                method: 'bakeReflectionConvolution',
                args: [envMapData.value.uuid],
            });
        },
        async skyboxReflectionConvolutionRemove() {
            const panel = this;

            const reflectionMap = panel.dump._globals.skybox.value['reflectionMap'];
            if (reflectionMap.value && reflectionMap.value.uuid) {
                const $skyProps = panel.$.sceneSkybox.querySelectorAll('ui-prop[type="dump"]');
                for (const $skyProp of $skyProps) {
                    if ($skyProp.dump.name === 'reflectionMap') {
                        const textCubeAssetUuid = $skyProp.dump.value.uuid;
                        if (textCubeAssetUuid) {
                            // remove asset
                            try {
                                const imageAssetUuid = textCubeAssetUuid.split('@')[0];
                                const imageAssetUrl = await Editor.Message.request('asset-db', 'query-url', imageAssetUuid);
                                if (imageAssetUrl) {
                                    await Editor.Message.request('asset-db', 'delete-asset', imageAssetUrl);
                                }
                            } catch (error) {
                                console.error(error);
                            }

                            $skyProp.dump.value.uuid = '';
                            $skyProp.dispatch('change-dump');
                            $skyProp.dispatch('confirm-dump'); // for scene snapshot
                        }
                        break;
                    }
                }

            }
        },
        skyboxUseHDRChange(event) {
            const panel = this;

            const $radioGraph = event.currentTarget;
            const useHDR = $radioGraph.value === 'HDR';

            $radioGraph.dump.value = useHDR;
            $radioGraph.dispatch('change-dump');
            $radioGraph.dispatch('confirm-dump'); // for scene snapshot

            const $prop = useHDR ? panel.$.sceneSkyboxEnvmapHDR : panel.$.sceneSkyboxEnvmapLDR;
            const uuid = $prop.dump.value.uuid;
            Elements.scene.setEnvMapAndConvolutionMap.call(panel, uuid);

            panel.$.scenePostSettings.style.display = useHDR ? 'block' : 'none';
        },
        skyboxEnvmapChange(useHDR, event) {
            const panel = this;
            if (panel.dump._globals.skybox.value['useHDR'].value !== useHDR) {
                // 未选中项的变动，不需要后续执行
                return;
            }

            const $prop = event.currentTarget;
            const uuid = $prop.dump.value.uuid;
            Elements.scene.setEnvMapAndConvolutionMap.call(panel, uuid);
        },
    },
    node: {
        ready() {
            const panel = this;

            panel.$skyboxProps = {};

            panel.setHelpUrl(panel.$.nodeLink, { help: 'i18n:cc.Node' });

            panel.$.nodeMenu.addEventListener('click', (event) => {
                event.stopPropagation();
                exports.methods.nodeContextMenu(panel.uuidList, panel.dumps);
            });

            panel.$.nodeLink.addEventListener('click', (event) => {
                event.stopPropagation();
            });

            panel.i18nChangeBind = Elements.node.i18nChange.bind(panel);
            Editor.Message.addBroadcastListener('i18n:change', panel.i18nChangeBind);
        },
        async update() {
            const panel = this;

            panel.componentCacheExpand = {};

            if (!panel.dump || panel.dump.isScene) {
                return;
            }

            panel.$this.setAttribute('sub-type', 'node');
            panel.$.container.setAttribute('droppable', panel.dropConfig && Object.keys(panel.dropConfig).join());
            panel.$.nodePosition.render(panel.dump.position);
            panel.$.nodeRotation.render(panel.dump.rotation);
            panel.$.nodeScale.render(panel.dump.scale);
            panel.$.nodeMobility.render(panel.dump.mobility);
            setLabel(panel.dump.layer, panel.$.nodeLayer);

            // 查找需要渲染的 component 列表
            const componentList = [];
            for (let i = 0; i < panel.dump.__comps__.length; i++) {
                const comp = panel.dump.__comps__[i];
                if (
                    panel.dumps.every((dump) => {
                        return dump.__comps__[i] && dump.__comps__[i].type === comp.type;
                    })
                ) {
                    componentList.push(comp);
                }
            }

            const sectionBody = panel.$.sectionBody;

            const isNotEmpty = componentList.length && sectionBody.__sections__ && sectionBody.__sections__.length;
            const isSameLength = isNotEmpty && sectionBody.__sections__.length === componentList.length;
            const isAllSameType =
                isSameLength &&
                componentList.every((comp, i) => {
                    return (
                        comp.type === sectionBody.__sections__[i].__type__ &&
                        comp.mountedRoot === sectionBody.__sections__[i].dump?.mountedRoot
                    );
                });

            // 如果元素长度、类型一致，则直接更新现有的界面
            if (isAllSameType) {
                for (let index = 0; index < sectionBody.__sections__.length; index++) {
                    const $section = sectionBody.__sections__[index];

                    const dump = componentList[index];
                    $section.dump = dump;

                    // 处理 ui-checkbox 涉及多选的情况
                    const $active = $section.querySelector('ui-checkbox');
                    $active.dump = dump.value.enabled;
                    $active.value = dump.value.enabled.value;
                    if ($active.dump.values && $active.dump.values.some((ds) => ds !== $active.dump.value)) {
                        $active.invalid = true;
                    } else {
                        $active.invalid = false;
                    }

                    const $link = $section.querySelector('ui-link');
                    panel.setHelpUrl($link, dump.editor);

                    await Promise.all($section.__panels__.map(($panel) => {
                        return $panel.update(dump);
                    }));
                }
            } else {
                // 如果元素不一致，说明切换了选中元素，那么需要更新整个界面
                sectionBody.innerText = '';

                sectionBody.__sections__ = [];

                componentList.forEach(async (component, i) => {
                    const additional = JSON.stringify([{
                        type: component.type,
                        value: component.value.uuid.value,
                    }]);

                    const $section = document.createElement('ui-section');
                    $section.setAttribute('expand', '');
                    $section.setAttribute('class', 'component config');

                    let cacheExpandKey = `node-component:${component.type}`;
                    if (panel.componentCacheExpand[cacheExpandKey]) {
                        // when exist duplicated component, use uuid as key;
                        cacheExpandKey = `node-component:${component.value.uuid.value}`;
                    }
                    panel.componentCacheExpand[cacheExpandKey] = true;
                    $section.setAttribute('cache-expand', `${cacheExpandKey}`);

                    $section.innerHTML = `
                    <header class="component-header" slot="header">
                        <ui-checkbox class="active"></ui-checkbox>
                        <ui-drag-item type="${component.type}" types="${component.type}" additional='${additional}'>
                            <ui-icon default="component" color="true" value="${component.type}"></ui-icon>
                            <span class="name">${component.type}${component.mountedRoot ? '+' : ''}</span>
                        </ui-drag-item>
                        <ui-link class="link" tooltip="i18n:ENGINE.menu.help_url">
                            <ui-icon value="help"></ui-icon>
                        </ui-link>
                         <ui-icon class="menu" value="menu" tooltip="i18n:ENGINE.menu.component"></ui-icon>
                    </header>
                    `;

                    $section.dump = component;
                    $section.__panels__ = [];
                    $section.__type__ = component.type;

                    const $active = $section.querySelector('ui-checkbox');
                    $active.value = component.value.enabled.value;
                    $active.dump = component.value.enabled;
                    $active.addEventListener('change', (event) => {
                        event.stopPropagation();

                        const value = !!$active.value;
                        const dump = $active.dump;

                        dump.value = value;

                        if ('values' in dump) {
                            dump.values.forEach((val, index) => {
                                dump.values[index] = value;
                            });
                        }
                        $active.dispatch('change-dump');
                    });
                    $active.addEventListener('confirm', (event) => {
                        event.stopPropagation();
                        $active.dispatch('confirm-dump');
                    });

                    const $link = $section.querySelector('.link');
                    $link.addEventListener('click', (event) => {
                        event.stopPropagation();
                    });
                    panel.setHelpUrl($link, component.editor);

                    const $menu = $section.querySelector('.menu');
                    $menu.addEventListener('click', (event) => {
                        event.stopPropagation();
                        exports.methods.componentContextMenu(panel.uuidList, $section.dump, componentList.length, i, panel.dumps);
                    });

                    sectionBody.__sections__[i] = $section;
                    sectionBody.appendChild($section);

                    // 排序
                    const renderListHeader = panel.renderMap.header[$section.__type__] ?? [];
                    let renderListSection = panel.renderMap.section[$section.__type__] ?? [];
                    const renderListFooter = panel.renderMap.footer[$section.__type__] ?? [];


                    // 如果都没有渲染模板，使用默认 cc.Class 模板
                    if (!renderListSection.length) {
                        // 判断继承
                        if (Array.isArray(component.extends)) {
                            const parentClass = component.extends[0];
                            renderListSection = panel.renderMap.section[parentClass];
                        }
                        if (!renderListSection) {
                            renderListSection = panel.renderMap.section['cc.Class'];
                        }
                    }

                    let renderList = [...renderListHeader, ...renderListSection, ...renderListFooter];

                    renderList.forEach((file) => {
                        const $panel = document.createElement('ui-panel');
                        $panel.injectionStyle(injectionStyle);
                        $panel.setAttribute('src', file);

                        $panel.shadowRoot.addEventListener('change-dump', (event) => {
                            exports.listeners['change-dump'].call(panel, event);
                        });

                        $panel.shadowRoot.addEventListener('confirm-dump', (event) => {
                            exports.listeners['confirm-dump'].call(panel, event);
                        });

                        $panel.shadowRoot.addEventListener('reset-dump', (event) => {
                            exports.listeners['reset-dump'].call(panel, event);
                        });

                        $panel.shadowRoot.addEventListener('create-dump', (event) => {
                            exports.listeners['create-dump'].call(panel, event);
                        });

                        $panel.shadowRoot.addEventListener('preview-dump', (event) => {
                            exports.listeners['preview-dump'].call(panel, event);
                        });

                        $section.appendChild($panel);
                        $section.__panels__.push($panel);
                        $panel.dump = component;
                        $panel.messageProtocol = messageProtocol;
                        $panel.update(component);
                    });

                    // 组件丢失的提示
                    if (component.type === "cc.MissingScript") {
                        const $missTip = document.createElement('div');
                        $missTip.style.cssText = "border: 1px solid var(--color-normal-border); padding: 15px; border-radius: 4px;margin-top: 15px;";

                        const assetData = await Editor.Message.request('asset-db', 'query-asset-data', component.value.__scriptAsset.value.uuid);

                        $missTip.innerHTML = `${assetData ? assetData.url : ''} ${Editor.I18n.t('ENGINE.components.missScriptTip')}`;
                        $section.appendChild($missTip);
                    }
                });
            }

            // 自定义 node 数据
            if (panel.renderMap.section && panel.renderMap.section['cc.Node']) {
                const array = (panel.$.nodeSection.__node_panels__ = panel.$.nodeSection.__node_panels__ || []);

                panel.renderMap.section['cc.Node'].forEach((file, index) => {
                    if (!array[index]) {
                        array[index] = document.createElement('ui-panel');
                        array[index].injectionStyle(injectionStyle);
                        panel.$.nodeSection.appendChild(array[index]);
                    }
                    array[index].setAttribute('src', file);
                    array[index].dump = panel.dump;
                    array[index].messageProtocol = messageProtocol;
                    array[index].update(panel.dump);
                });

                for (let i = panel.renderMap.section['cc.Node'].length; i < array.length; i++) {
                    array[i].remove();
                }

                array.length = panel.renderMap.section['cc.Node'].length;
            } else if (panel.$.nodeSection.__node_panels__) {
                panel.$.nodeSection.__node_panels__.forEach((dom) => {
                    dom.remove();
                });
                delete panel.$.nodeSection.__node_panels__;
            }
        },
        close() {
            const panel = this;

            Editor.Message.removeBroadcastListener('i18n:change', panel.i18nChangeBind);
        },
        i18nChange() {
            const panel = this;

            const $links = panel.$.container.querySelectorAll('ui-link');
            $links.forEach($link => panel.setHelpUrl($link));
        },
    },
    missingComponent: {
        ready() {
            const panel = this;

            const sectionMissing = panel.$.sectionMissing;
            sectionMissing.addEventListener('click', (event) => {
                if (event.target.tagName !== 'UI-ICON') {
                    return;
                }

                if (!Array.isArray(panel.dump.removedComponents)) {
                    return;
                }

                const i = event.target.getAttribute('index');
                const type = event.target.getAttribute('value');

                const info = panel.dump.removedComponents[i];
                if (!info) {
                    return;
                }

                const uuidList = panel.uuidList;
                switch (type) {
                    case 'save-o': {
                        Editor.Message.request(messageProtocol.scene, 'apply-removed-component', uuidList[0], info.fileID);
                        break;
                    }
                    case 'reset': {
                        Editor.Message.request(messageProtocol.scene, 'revert-removed-component', uuidList[0], info.fileID);
                        break;
                    }
                }
            });
        },
        update() {
            const panel = this;

            if (!panel.dump || panel.dump.isScene) {
                return;
            }

            const uuidList = panel.uuidList;

            const sectionMissing = panel.$.sectionMissing;
            sectionMissing.__sections__ = sectionMissing.__sections__ || [];

            if (!panel.dump.removedComponents || uuidList.length !== 1) {
                panel.dump.removedComponents = [];
            }

            for (let i = 0; i < panel.dump.removedComponents.length; i++) {
                let $section = sectionMissing.__sections__[i];
                if (!$section) {
                    $section = document.createElement('section');
                    sectionMissing.__sections__[i] = $section;
                    sectionMissing.appendChild($section);
                }
                $section.innerHTML = `
                <span class="name"><span>${panel.dump.removedComponents[i].name}</span> [removed]</span>
                <ui-icon value="reset" index="${i}" tooltip="i18n:ENGINE.prefab.reset"></ui-icon>
                <ui-icon value="save-o" index="${i}" tooltip="i18n:ENGINE.prefab.save"></ui-icon>
                `;
            }

            while (sectionMissing.__sections__.length > panel.dump.removedComponents.length) {
                const $section = sectionMissing.__sections__.pop();
                $section.parentElement.removeChild($section);
            }
        },
    },
    layer: {
        ready() {
            const panel = this;

            panel.$.nodeLayerButton.addEventListener('change', (event) => {
                event.stopPropagation();
                Editor.Message.send('project', 'open-settings', 'project', 'layer');
            });
        },
        update() {
            const panel = this;

            if (!panel.dump || panel.dump.isScene) {
                return;
            }

            panel.$.nodeLayerSelect.render(panel.dump.layer);

            let prevValues = [panel.dump.layer.value];
            if (panel.dump.layer.values) {
                prevValues = panel.dump.layer.values.slice();
            }
            panel.$.nodeLayerSelect.prevValues = prevValues;
        },
    },
    footer: {
        ready() {
            const panel = this;

            panel.$.componentAdd.addEventListener('click', () => {
                Editor.Panel.__protected__.openKit('ui-kit.searcher', {
                    elem: panel.$.componentAdd,
                    params: [
                        {
                            type: 'add-component',
                        },
                    ],
                    listeners: {
                        async confirm(detail/* info */) {
                            if (!detail) { return; }

                            // 批量调用request意味着编辑操作在很多帧后才会完成，所以不能自动记录undo
                            const undoID = await beginRecording(panel.uuidList);
                            for (const uuid of panel.uuidList) {
                                await Editor.Message.request(messageProtocol.scene, 'create-component', {
                                    uuid,
                                    component: detail.info.cid,
                                });
                            }
                            if (detail.info.name) {
                                trackEventWithTimer('laber', `A100000_${detail.info.name}`);
                            }
                            await endRecording(undoID);
                        },
                    },
                });
            });
        },
        update() {},
    },
    materials: {
        async update() {
            const panel = this;

            const materialPanels = [];
            const materialPanelType = 'asset';

            const oldChildren = Array.from(panel.$.sectionAsset.children);

            const materialUuids = panel.assets['cc.Material'];
            let materialPrevPanel = null;

            for (const materialUuid in materialUuids) {
                let materialPanel = oldChildren.find((child) => child.getAttribute('uuid') === materialUuid);
                if (!materialPanel) {
                    // 添加新的
                    materialPanel = document.createElement('ui-panel');
                    materialPanel.injectionStyle(injectionStyle);
                    materialPanel.setAttribute('src', panel.typeManager[materialPanelType]);
                    materialPanel.setAttribute('type', materialPanelType);
                    materialPanel.setAttribute('sub-type', 'unknown');
                    materialPanel.setAttribute('uuid', materialUuid);

                    materialPanel.panelObject.replaceContainerWithUISection({
                        type: materialPanelType,
                        uuid: materialUuid,
                    });

                    const { section = {} } = panel.renderManager[materialPanelType];

                    // 按数组顺序放置
                    if (materialPrevPanel) {
                        materialPrevPanel.after(materialPanel);
                    } else {
                        panel.$.sectionAsset.prepend(materialPanel);
                    }

                    // call update after panel is connected(ensure lifecycle hook `ready` has been called)
                    materialPanel.update([materialUuid], { section });

                    materialPanel.focusEventInNode = () => {
                        const children = Array.from(materialPanel.parentElement.children);
                        children.forEach((child) => {
                            if (child === materialPanel) {
                                child.setAttribute('focused', '');
                            } else {
                                child.removeAttribute('focused');
                            }
                        });
                    };
                    materialPanel.blurEventInNode = () => {
                        if (panel.blurSleep) {
                            return;
                        }

                        materialPanel.removeAttribute('focused');
                    };
                    materialPanel.addEventListener('focus', materialPanel.focusEventInNode);
                    materialPanel.addEventListener('blur', materialPanel.blurEventInNode);
                }
                materialPanels.push(materialPanel);
                materialPrevPanel = materialPanel;
            }

            // 删除多余的
            for (const oldChild of oldChildren) {
                if (oldChild && materialPanels.indexOf(oldChild) === -1) {
                    await oldChild.panel.beforeClose.call(oldChild.panelObject);
                    oldChild.removeEventListener('focus', oldChild.focusEventInNode);
                    oldChild.removeEventListener('blur', oldChild.blurEventInNode);
                    oldChild.focusEventInNode = undefined;
                    oldChild.blurEventInNode = undefined;
                    oldChild.remove();
                }
            }
        },
        async beforeClose() {
            const panel = this;

            const children = Array.from(panel.$.sectionAsset.children);

            for (const materialPanel of children) {
                const next = await materialPanel.panel.beforeClose.call(materialPanel.panelObject);

                if (next === false) {
                    return false;
                } else {
                    materialPanel.removeEventListener('focus', materialPanel.focusEventInNode);
                    materialPanel.removeEventListener('blur', materialPanel.blurEventInNode);
                    materialPanel.focusEventInNode = undefined;
                    materialPanel.blurEventInNode = undefined;
                    materialPanel.remove();
                }
            }

            return true;
        },
    },
};

exports.methods = {
    undo() {
        this.restore('undo');
    },
    redo() {
        this.restore('redo');
    },
    restore(cmd) {
        if (!cmd) {
            return;
        }

        const panel = this;

        panel.blurSleep = true;

        clearTimeout(panel.blurSleepTimeId);
        panel.blurSleepTimeId = setTimeout(() => {
            panel.blurSleep = false;
        }, 1000);

        const children = Array.from(panel.$.sectionAsset.children);
        for (const materialPanel of children) {
            if (materialPanel.hasAttribute('focused')) {
                materialPanel.panelObject[cmd]();
                return;
            }
        }

        Editor.Message.send(messageProtocol.scene, cmd);
    },

    setHelpUrl($link, data) {
        if (data) {
            $link.helpData = data;
        } else {
            if (!$link.helpData) {
                return;
            }
            data = $link.helpData;
        }

        const url = this.getHelpUrl(data);
        if (url) {
            $link.setAttribute('value', url);
        } else {
            $link.removeAttribute('value');
        }
    },
    /**
     * 获取组件帮助菜单的 url
     * @param editor
     */
    getHelpUrl(data) {
        if (!data || !data.help) {
            return '';
        }

        const help = data.help;

        /**
         * 约定的规则
         * 翻译的都需要 i18n: 开头
         * 没有的话属于直接是配置值的方式，配什么返回什么
         */
        if (!help.startsWith('i18n:')) {
            return help;
        }

        const i18nKey = help.substr(5);
        const url = Editor.I18n.t('ENGINE.help.' + i18nKey);
        if (url) {
            return url;
        }

        /**
         * 再在编辑器内部查找翻译一次
         * 结果可能为空，也是一种需求，即组件配置了但没有合适的文档配置
         */
        return Editor.I18n.t(i18nKey);
    },
    /**
     * 组件上的右键菜单
     */
    componentContextMenu(uuidList, dump, total, index, nodeDumps) {
        // 是否多选节点
        const isMultiple = uuidList.length > 1 ? true : false;

        const uuid = uuidList[0];

        const clipboardComponentInfo = Editor.Clipboard.read('_dump_component_');

        Editor.Menu.popup({
            menu: [
                {
                    label: Editor.I18n.t('ENGINE.menu.reset_component'),
                    async click() {
                        const values = dump.value.uuid.values || [dump.value.uuid.value];
                        const undoID = await beginRecording(values);
                        for (const compUuid of values) {
                            await Editor.Message.request(messageProtocol.scene, 'reset-component', {
                                uuid: compUuid,
                            });
                        }
                        await endRecording(undoID);
                    },
                },
                { type: 'separator' },
                {
                    label: Editor.I18n.t('ENGINE.menu.remove_component'),
                    async click() {
                        const values = dump.value.uuid.values || [dump.value.uuid.value];
                        // 收集待修改的uuids
                        const uuids = [];
                        const indexes = [];
                        for (const value of values) {
                            for (const nodeDump of nodeDumps) {
                                const uuid = nodeDump.uuid.value;
                                const index = nodeDump.__comps__.findIndex((dumpData) => dumpData.value.uuid.value === value);
                                if (index !== -1) {
                                    uuids.push(uuid);
                                    indexes.push(index);
                                    if (nodeDump.__comps__[index].type) {
                                        trackEventWithTimer('laber', `A100001_${nodeDump.__comps__[index].type}`);
                                    }
                                }
                            }
                        }
                        if (!uuids.length > 0) { return; }
                        const undoID = await beginRecording(uuids);
                        for (let i = 0; i < uuids.length; i++) {
                            await Editor.Message.request(messageProtocol.scene, 'remove-array-element', {
                                uuid: uuids[i],
                                path: '__comps__',
                                index: indexes[i],
                            });
                        }
                        await endRecording(undoID);
                    },
                },
                {
                    label: Editor.I18n.t('ENGINE.menu.move_up_component'),
                    enabled: !isMultiple && index !== 0,
                    async click() {
                        const undoID = await beginRecording(uuid);
                        await Editor.Message.request(messageProtocol.scene, 'move-array-element', {
                            uuid,
                            path: '__comps__',
                            target: index,
                            offset: -1,
                        });
                        await endRecording(undoID);
                    },
                },
                {
                    label: Editor.I18n.t('ENGINE.menu.move_down_component'),
                    enabled: !isMultiple && index !== total - 1,
                    async click() {
                        const undoID = await beginRecording(uuid);
                        await Editor.Message.request(messageProtocol.scene, 'move-array-element', {
                            uuid,
                            path: '__comps__',
                            target: index,
                            offset: 1,
                        });
                        await endRecording(undoID);
                    },
                },
                { type: 'separator' },
                {
                    label: Editor.I18n.t('ENGINE.menu.copy_component'),
                    enabled: !isMultiple,
                    click() {
                        const info = JSON.parse(JSON.stringify(dump));
                        delete info.value.__prefab;
                        Editor.Clipboard.write('_dump_component_', {
                            cid: dump.cid,
                            dump: info,
                        });
                    },
                },
                {
                    label: Editor.I18n.t('ENGINE.menu.paste_component_values'),
                    enabled: !!(clipboardComponentInfo && clipboardComponentInfo.cid === dump.cid),
                    async click() {
                        const values = dump.value.uuid.values || [dump.value.uuid.value];
                        const uuids = [];
                        const indexes = [];
                        for (const value of values) {
                            for (const nodeDump of nodeDumps) {
                                const uuid = nodeDump.uuid.value;
                                const index = nodeDump.__comps__.findIndex((dumpData) => dumpData.value.uuid.value === value);
                                if (index !== -1) {
                                    uuids.push(uuid);
                                    indexes.push(index);
                                }
                            }
                        }
                        const undoID = await beginRecording(uuids);
                        // 遍历uuids
                        for (let i = 0; i < uuids.length; i++) {
                            const uuid = uuids[i];
                            const index = indexes[i];

                            const nodeDump = nodeDumps.find(nodeDump => uuid === nodeDump.uuid.value);
                            await Editor.Message.request(messageProtocol.scene, 'set-property', {
                                uuid,
                                path: nodeDump.__comps__[index].path,
                                dump: clipboardComponentInfo.dump,
                            });
                        }
                        await endRecording(undoID);
                    },
                },
                { type: 'separator' },
                {
                    // 这个按钮不该出现在 component 上，应该在节点上
                    label: Editor.I18n.t('ENGINE.menu.paste_component'),
                    enabled: !!clipboardComponentInfo,
                    async click() {
                        const undoID = await beginRecording(uuidList);
                        const values = dump.value.uuid.values || [dump.value.uuid.value];
                        let index = 0;
                        for (const dump of values) {
                            const uuid = uuidList[index];
                            await Editor.Message.request(messageProtocol.scene, 'create-component', {
                                uuid,
                                component: clipboardComponentInfo.cid,
                            });

                            // 检查是否创建成功，是的话，给赋值
                            const nodeDump = await Editor.Message.request(messageProtocol.scene, 'query-node', uuid);
                            const length = nodeDump.__comps__ && nodeDump.__comps__.length;
                            if (length) {
                                const lastIndex = length - 1;
                                const lastComp = nodeDump.__comps__[lastIndex];

                                if (lastComp?.cid === clipboardComponentInfo.cid) {
                                    await Editor.Message.request(messageProtocol.scene, 'set-property', {
                                        uuid,
                                        path: `__comps__.${lastIndex}`,
                                        dump: clipboardComponentInfo.dump,
                                    });
                                }
                            }

                            index++;
                        }
                        await endRecording(undoID);
                    },
                },
            ],
        });
    },
    nodeContextMenu(uuidList, dumps) {
        const dump = dumps[0];

        // 是否多选节点
        const isMultiple = dump.length > 1 ? true : false;

        const clipboardNodeInfo = Editor.Clipboard.read('_dump_node_');
        const clipboardNodeWorldTransform = Editor.Clipboard.read('_dump_node_world_transform_');
        const clipboardComponentInfo = Editor.Clipboard.read('_dump_component_');

        function notEqualDefaultValueVec3(propName) {
            const keys = ['x', 'y', 'z'];
            return keys.some(key => {
                return dump[propName].value[key] !== dump[propName].default.value[key].value;
            });
        }

        Editor.Menu.popup({
            menu: [
                {
                    label: Editor.I18n.t('ENGINE.menu.reset_node'),
                    enabled: !dump.position.readonly && !dump.rotation.readonly && !dump.scale.readonly,
                    async click() {
                        const undoID = await beginRecording(uuidList);
                        for (const uuid of uuidList) {
                            await Editor.Message.request(messageProtocol.scene, 'reset-node', {
                                uuid,
                            });
                        }
                        await endRecording(undoID);
                    },
                },
                { type: 'separator' },
                {
                    label: Editor.I18n.t('ENGINE.menu.copy_node_value'),
                    enabled: !isMultiple,
                    async click() {
                        Editor.Clipboard.write('_dump_node_', {
                            type: dump.type,
                            attrs: ['position', 'rotation', 'scale', 'mobility', 'layer'],
                            dump: JSON.parse(JSON.stringify(dump)),
                        });
                    },
                },
                {
                    label: Editor.I18n.t('ENGINE.menu.paste_node_value'),
                    enabled: !!clipboardNodeInfo,
                    async click() {
                        const undoID = await beginRecording(uuidList);
                        for (const uuid of uuidList) {
                            for (const attr of clipboardNodeInfo.attrs) {
                                await Editor.Message.request(messageProtocol.scene, 'set-property', {
                                    uuid,
                                    path: attr,
                                    dump: clipboardNodeInfo.dump[attr],
                                });
                            }
                        }
                        await endRecording(undoID);
                    },
                },
                { type: 'separator' },
                {
                    label: Editor.I18n.t('ENGINE.menu.copy_node_world_transform'),
                    enabled: !isMultiple,
                    async click() {
                        const data = await Editor.Message.request(messageProtocol.scene, 'execute-scene-script', {
                            name: 'inspector',
                            method: 'queryNodeWorldTransform',
                            args: [dump.uuid.value],
                        });

                        if (data) {
                            Editor.Clipboard.write('_dump_node_world_transform_', {
                                data,
                            });
                        }
                    },
                },
                {
                    label: Editor.I18n.t('ENGINE.menu.paste_node_world_transform'),
                    enabled: !!clipboardNodeWorldTransform,
                    async click() {
                        if (clipboardNodeWorldTransform.data) {
                            const undoID = await beginRecording(uuidList);
                            for (const uuid of uuidList) {
                                await Editor.Message.request(messageProtocol.scene, 'execute-scene-script', {
                                    name: 'inspector',
                                    method: 'setNodeWorldTransform',
                                    args: [uuid, clipboardNodeWorldTransform.data],
                                });
                            }
                            await endRecording(undoID);
                        }
                    },
                },
                { type: 'separator' },
                {
                    label: Editor.I18n.t('ENGINE.menu.paste_component'),
                    enabled: !!clipboardComponentInfo,
                    async click() {
                        const undoID = await beginRecording(uuidList);
                        for (const uuid of uuidList) {
                            await Editor.Message.request(messageProtocol.scene, 'create-component', {
                                uuid,
                                component: clipboardComponentInfo.cid,
                            });

                            // 检查是否创建成功，是的话，给赋值
                            const nodeDump = await Editor.Message.request(messageProtocol.scene, 'query-node', uuid);
                            const length = nodeDump.__comps__ && nodeDump.__comps__.length;
                            if (length) {
                                const lastIndex = length - 1;
                                const lastComp = nodeDump.__comps__[lastIndex];

                                if (lastComp?.cid === clipboardComponentInfo.cid) {
                                    await Editor.Message.request(messageProtocol.scene, 'set-property', {
                                        uuid,
                                        path: `__comps__.${lastIndex}`,
                                        dump: clipboardComponentInfo.dump,
                                    });
                                }
                            }
                        }
                        await endRecording(undoID);
                    },
                },
                { type: 'separator' },
                {
                    label: Editor.I18n.t('ENGINE.menu.reset_node_position'),
                    enabled: !dump.position.readonly && notEqualDefaultValueVec3('position'),
                    async click() {
                        const undoID = await beginRecording(uuidList);
                        for (const uuid of uuidList) {
                            await Editor.Message.request(messageProtocol.scene, 'reset-property', {
                                uuid,
                                path: 'position',
                            });
                        }
                        await endRecording(undoID);
                    },
                },
                {
                    label: Editor.I18n.t('ENGINE.menu.reset_node_rotation'),
                    enabled: !dump.rotation.readonly && notEqualDefaultValueVec3('rotation'),
                    async click() {
                        const undoID = await beginRecording(uuidList);
                        for (const uuid of uuidList) {
                            await Editor.Message.request(messageProtocol.scene, 'reset-property', {
                                uuid,
                                path: 'rotation',
                            });
                        }
                        await endRecording(undoID);
                    },
                },
                {
                    label: Editor.I18n.t('ENGINE.menu.reset_node_scale'),
                    enabled: !dump.scale.readonly && notEqualDefaultValueVec3('scale'),
                    async click() {
                        const undoID = await beginRecording(uuidList);
                        for (const uuid of uuidList) {
                            await Editor.Message.request(messageProtocol.scene, 'reset-property', {
                                uuid,
                                path: 'scale',
                            });
                        }
                        await endRecording(undoID);
                    },
                },
                {
                    label: Editor.I18n.t('ENGINE.menu.reset_node_mobility'),
                    enabled: !dump.mobility.readonly && dump.mobility.value !== dump.mobility.default,
                    async click() {
                        const undoID = await beginRecording(uuidList);
                        for (const uuid of uuidList) {
                            await Editor.Message.request(messageProtocol.scene, 'reset-property', {
                                uuid,
                                path: 'mobility',
                            });
                        }
                        await endRecording(undoID);
                    },
                },
            ],
        });
    },
    async replaceAssetUuidInNodes(assetUuid, newAssetUuid) {
        const panel = this;

        const materialUuids = panel.assets['cc.Material'];
        if (!materialUuids) {
            return;
        }

        try {
            const undoID = await beginRecording(panel.uuidList);
            for (const dumpPath in materialUuids[assetUuid]) {
                const dumpData = materialUuids[assetUuid][dumpPath];
                for (let i = 0; i < panel.uuidList.length; i++) {
                    const nodeUuid = panel.uuidList[i];
                    await Editor.Message.request(messageProtocol.scene, 'set-property', {
                        uuid: nodeUuid,
                        path: dumpPath,
                        dump: {
                            type: dumpData.type,
                            value: { uuid: newAssetUuid },
                        },
                    });
                }
            }
            await endRecording(undoID);
        } catch (error) {
            console.error(error);
        }
    },
    toggleShowAddComponentBtn(show) {
        this.$.componentAdd.style.display = show ? 'inline-flex' : 'none';
    },
    isAnimationMode() {
        return Editor.EditMode.getMode() === 'animation';
    },
    handlerSceneChangeMode() {
        this.toggleShowAddComponentBtn(!this.isAnimationMode()); // 动画编辑模式下，要隐藏按钮
    },
};

exports.update = async function update(uuidList, renderMap, dropConfig, typeManager, renderManager) {
    const panel = this;

    const enginePath = path.join('editor', 'inspector', 'components');
    Object.values(renderMap).forEach((config) => {
        Object.values(config).forEach((renders) => {
            renders.sort((a, b) => {
                return b.indexOf(enginePath) - a.indexOf(enginePath);
            });
        });
    });

    panel.uuidList = uuidList || [];
    panel.renderMap = renderMap;
    panel.dropConfig = dropConfig;
    panel.typeManager = typeManager;
    panel.renderManager = renderManager;

    for (const prop in Elements) {
        const element = Elements[prop];
        if (element.update) {
            await element.update.call(panel);
        }
    }
};

exports.ready = async function ready() {
    const panel = this;

    // 为了避免把 ui-num-input, ui-color 的连续 change 进行 snapshot
    panel.snapshotLock = false;

    // 节点的 ipc 协议，指向 scene 或 xr-scene 等进程
    panel.__queryMessageProtocolScene__ = async function() {
        try {
            if (!panel.messageProtocol) {
                panel.messageProtocol = messageProtocol;
            }
            const config = await await Editor.Profile.getConfig('inspector', 'message-protocol');
            if (config) {
                Object.assign(messageProtocol, config);
            }
        } catch (error) {
            console.error(error);
            messageProtocol.scene = 'scene';
        }
    };
    await panel.__queryMessageProtocolScene__();

    for (const prop in Elements) {
        const element = Elements[prop];
        if (element.ready) {
            element.ready.call(panel);
        }
    }

    this.replaceAssetUuidInNodesBind = this.replaceAssetUuidInNodes.bind(this);
    this.handlerSceneChangeModeBind = this.handlerSceneChangeMode.bind(this);
    Editor.Message.addBroadcastListener('inspector:replace-asset-uuid-in-nodes', this.replaceAssetUuidInNodesBind);
    Editor.Message.addBroadcastListener('scene:change-mode', this.handlerSceneChangeModeBind);
};

exports.close = async function close() {
    const panel = this;

    for (const prop in Elements) {
        const element = Elements[prop];
        if (element.close) {
            element.close.call(panel);
        }
    }

    Editor.Message.removeBroadcastListener('inspector:replace-asset-uuid-in-nodes', this.replaceAssetUuidInNodesBind);
    Editor.Message.removeBroadcastListener('scene:change-mode', this.handlerSceneChangeModeBind);
};

exports.beforeClose = async function beforeClose() {
    const panel = this;

    for (const prop in Elements) {
        const element = Elements[prop];
        if (element.beforeClose) {
            const next = await element.beforeClose.call(panel);
            if (next === false) {
                return false;
            }
        }
    }

    return true;
};

exports.config = {
    section: require('../components.js'),
    footer: require('../components-footer.js'),
};
