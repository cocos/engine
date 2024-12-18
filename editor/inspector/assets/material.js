'use strict';

const { join, sep, normalize } = require('path');
module.paths.push(join(Editor.App.path, 'node_modules'));

const { materialTechniquePolyfill } = require('../utils/material');
const { setDisabled, setReadonly, setHidden, loopSetAssetDumpDataReadonly, injectionStyle } = require('../utils/prop');
const { escape, isNil } = require('lodash');

const effectGroupNameRE = /^db:\/\/(\w+)\//i; // match root DB name
const effectDirRE = /^effects\//i;

/**
 * @param {string} label
 */
function formatOptionLabel(label) {
    // 1. remove group name if matched
    // 2. remove prefix 'effects'(after 'db://' prefix removed)
    // 3. escape label string because it will be used as html template string
    return escape(label.replace(effectGroupNameRE, '').replace(effectDirRE, ''));
}

/**
 *
 * @param {{name: string; uuid: string; assetPath: string}[]} effects
 * @returns html template
 */
function renderGroupEffectOptions(effects) {
    // group effects by group name, and no longer rely on the ordering of the input `effects`.
    const groups = {};

    /**
     * ungrouped options. html template string.
     * @type {string[]}
     */
    const extras = [];

    for (const effect of effects) {
        const groupName = effectGroupNameRE.exec(effect.assetPath)?.[1] ?? '';

        if (groupName !== '') {
            let group = groups[groupName];
            // group not found yet, init it
            if (!Array.isArray(group)) {
                group = [];
                groups[groupName] = group;
            }

            const label = formatOptionLabel(effect.assetPath);

            group.push(`<option value="${effect.name}" data-uuid="${effect.uuid}">${label}</option>`);

            continue;
        }

        // no group name, add to extras and render as ungrouped(before grouped options)
        const label = formatOptionLabel(effect.name);
        extras.push(`<option value="${effect.name}" data-uuid="${effect.uuid}">${label}</option>`);
    }

    let htmlTemplate = '';

    for (const extra of extras) {
        htmlTemplate += extra;
    }

    for (const name in groups) {
        const options = groups[name];
        htmlTemplate += `<optgroup label="${name}">${options.join('')}</optgroup>`;
    }

    return htmlTemplate;
}

exports.style = `
.invalid { display: none; text-align: center; margin-top: 8px; }
.invalid[active] { display: block; }
.invalid[active] ~ * { display: none; }

:host > .header {
    padding-right: 4px;
}
:host > .default > .section {
    padding-right: 4px;
}

.custom[src] + .default { display: none; }

ui-button.location { flex: none; margin-left: 4px; }
`;

exports.template = /* html */ `
<div class="invalid">
    <ui-label value="i18n:ENGINE.assets.multipleWarning"></ui-label>
</div>
<header class="header">
    <ui-prop>
        <ui-label slot="label">Effect</ui-label>
        <ui-select class="effect" slot="content"></ui-select>
        <ui-button class="location" slot="content" tooltip="i18n:ENGINE.assets.locate_asset">
            <ui-icon value="location"></ui-icon>
        </ui-button>
    </ui-prop>
    <ui-prop>
        <ui-label slot="label">Technique</ui-label>
        <ui-select class="technique" slot="content"></ui-select>
    </ui-prop>
</header>
<ui-panel class="custom"></ui-panel>
<div class="default">
    <section class="section">
        <ui-prop class="useInstancing" type="dump"></ui-prop>
    </section>
    <section class="material-dump"></section>
</div>
`;

exports.$ = {
    invalid: '.invalid',

    header: '.header',
    effect: '.effect',
    location: '.location',
    technique: '.technique',
    useInstancing: '.useInstancing',
    materialDump: '.material-dump',

    custom: '.custom',
};

exports.methods = {
    record() {
        return JSON.stringify({
            material: this.material,
            cacheData: this.cacheData,
        });
    },
    async restore(record) {
        record = JSON.parse(record);
        if (!record || typeof record !== 'object' || !record.material) {
            return false;
        }

        this.material = record.material;
        this.cacheData = record.cacheData;

        await this.updateEffect();

        await this.updateInterface();

        await this.change();

        return true;
    },

    async apply() {
        this.reset();
        await Editor.Message.request('scene', 'apply-material', this.asset.uuid, this.material);
    },

    async abort() {
        this.reset();
        await Editor.Message.request('scene', 'preview-material', this.asset.uuid);
    },

    reset() {
        this.dirtyData.uuid = '';
        this.cacheData = {};
    },

    async change() {
        this.canUpdatePreview = true;
        await this.setDirtyData();
        this.dispatch('change');
    },

    snapshot() {
        this.dispatch('snapshot');
    },

    async updateEffect() {
        const effectMap = await Editor.Message.request('scene', 'query-all-effects');
        // see: https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Intl/Collator
        const collator = new Intl.Collator(undefined, { numeric: true });

        this.effects = Object.values(effectMap)
            .filter((effect) => !effect.hideInEditor)
            .sort((a, b) => collator.compare(a.name, b.name));

        const effectOptionsHTML = renderGroupEffectOptions(this.effects);

        this.$.effect.innerHTML = effectOptionsHTML;

        this.$.effect.value = this.material.effect;
        setDisabled(this.asset.readonly, this.$.effect);
    },

    async updateInterface() {
        this.updateTechnique();

        const currentEffectInfo = this.effects.find((effect) => {
            return effect.name === this.material.effect;
        });

        this.customInterface = '';
        if (currentEffectInfo && currentEffectInfo.uuid) {
            const meta = await Editor.Message.request('asset-db', 'query-asset-meta', currentEffectInfo.uuid);
            if (meta && meta.userData && meta.userData.editor) {
                this.customInterface = meta.userData.editor.inspector;
            }
        }

        if (this.customInterface && this.customInterface.startsWith('packages://')) {
            try {
                const relatePath = normalize(this.customInterface.replace('packages://', ''));
                const name = relatePath.split(sep)[0];

                const packagePath = Editor.Package.getPackages({ name, enable: true })[0].path;

                const filePath = join(packagePath, relatePath.split(name)[1]);
                if (this.$.custom.getAttribute('src') !== filePath) {
                    this.$.custom.injectionStyle(injectionStyle);
                    this.$.custom.setAttribute('src', filePath);
                }

                this.$.custom.update(this.material, this.assetList, this.metaList);

            } catch (err) {
                console.error(err);
                console.error(Editor.I18n.t('ENGINE.assets.material.illegal-inspector-url'));
            }
        } else {
            this.$.custom.removeAttribute('src');
            this.updatePasses();
        }
    },

    updateTechnique() {
        let techniqueOption = '';
        this.material.data.forEach((technique, index) => {
            const name = technique.name ? `${index} - ${technique.name}` : index;
            techniqueOption += `<option value="${index}">${name}</option>`;
        });
        this.$.technique.innerHTML = techniqueOption;
        this.$.technique.value = this.material.technique;

        setDisabled(this.asset.readonly, this.$.technique);
    },

    async updatePasses() {
        const technique = materialTechniquePolyfill(this.material.data[this.material.technique]);

        this.technique = technique;
        if (!technique || !technique.passes) {
            return;
        }

        if (this.requestInitCache) {
            this.initCache();

            if (!this.canUpdatePreview) {
                await this.updatePreview(false);
            }
        } else {
            this.useCache();
            await this.updatePreview(true);
        }

        if (technique.passes) {
            // The interface is not a regular data loop, which needs to be completely cleared and placed, but the UI-prop element is still reusable
            const $container = this.$.materialDump;
            $container.innerText = '';

            if (!$container.$children) {
                $container.$children = {};
            }

            for (let i = 0; i < technique.passes.length; i++) {
                const pass = technique.passes[i];

                // if asset is readonly
                if (this.asset.readonly) {
                    for (const key in pass.value) {
                        loopSetAssetDumpDataReadonly(pass.value[key]);
                    }
                }

                $container.$children[i] = document.createElement('ui-prop');
                $container.$children[i].setAttribute('type', 'dump');
                $container.$children[i].setAttribute('ui-section-config', '');
                $container.$children[i].setAttribute('pass-index', i);
                $container.appendChild($container.$children[i]);
                $container.$children[i].render(pass);

                // Add the checkbox given by the switch attribute
                if (pass.switch && pass.switch.name) {
                    const $checkbox = document.createElement('ui-checkbox');
                    $checkbox.innerText = pass.switch.name;
                    $checkbox.setAttribute('slot', 'header');
                    $checkbox.addEventListener('change', (e) => {
                        pass.switch.value = e.target.value;
                    });
                    setReadonly(this.asset.readonly, $checkbox);
                    $checkbox.value = pass.switch.value;

                    const $section = $container.$children[i].querySelector('ui-section');
                    $section.appendChild($checkbox);

                    // header and switch element appear in `header` slot at the same time, keep the middle distance 12px
                    const $header = $section.querySelector('div[slot=header]');
                    $header.style.width = 'auto';
                    $header.style.flex = '1';
                    $header.style.minWidth = '0';
                    $header.style.marginRight = '12px';
                }

                $container.$children[i].querySelectorAll('ui-prop').forEach(($prop) => {
                    const dump = $prop.dump;
                    if (dump && dump.childMap && dump.children.length) {
                        if (!$prop.$childMap) {
                            $prop.$childMap = document.createElement('section');
                            $prop.$childMap.setAttribute(
                                'style',
                                'margin-left: var(--ui-prop-margin-left, unset);',
                            );
                            $prop.$childMap.$props = {};

                            for (const childName in dump.childMap) {
                                if (dump.childMap[childName].value === undefined) {
                                    continue;
                                }

                                if (this.asset.readonly) {
                                    loopSetAssetDumpDataReadonly(dump.childMap[childName]);
                                }

                                $prop.$childMap.$props[childName] = document.createElement('ui-prop');
                                $prop.$childMap.$props[childName].setAttribute('type', 'dump');
                                $prop.$childMap.$props[childName].render(dump.childMap[childName]);
                                $prop.$childMap.appendChild($prop.$childMap.$props[childName]);
                            }

                            if (Array.from($prop.$childMap.children).length) {
                                $prop.after($prop.$childMap);
                            }

                            $prop.addEventListener('change-dump', (e) => {
                                if (e.target.dump.value) {
                                    $prop.$childMap.removeAttribute('hidden');
                                } else {
                                    $prop.$childMap.setAttribute('hidden', '');
                                }
                            });
                        }

                        if (dump.value) {
                            $prop.$childMap.removeAttribute('hidden');
                        } else {
                            $prop.$childMap.setAttribute('hidden', '');
                        }
                    }
                });
            }

            // when passes length more than one, the ui-section of pipeline state collapse
            if (technique.passes.length > 1) {
                $container.querySelectorAll('[cache-expand$="PassStates"]').forEach(($pipelineState) => {
                    const cacheExpand = $pipelineState.getAttribute('cache-expand');
                    if (!this.defaultCollapsePasses[cacheExpand]) {
                        $pipelineState.expand = false;
                        this.defaultCollapsePasses[cacheExpand] = true;
                    }
                });
            }
        }

        this.updateInstancing();
    },

    updateInstancing() {
        const technique = this.technique;

        const firstPass = technique.passes[0];
        if (firstPass.childMap.USE_INSTANCING) {
            technique.useInstancing.value = firstPass.childMap.USE_INSTANCING.value;

            this.changeInstancing(technique.useInstancing.value);
        }

        if (technique.useInstancing) {
            this.$.useInstancing.render(technique.useInstancing);
            setHidden(technique.useInstancing && !technique.useInstancing.visible, this.$.useInstancing);
            setReadonly(this.asset.readonly, this.$.useInstancing);
        }
    },

    async updatePreview(emit) {
        await Editor.Message.request('scene', 'preview-material', this.asset.uuid, this.material, { emit });

        Editor.Message.broadcast('material-inspector:change-dump');
    },

    changeInstancing(checked) {
        this.technique.passes.forEach((pass) => {
            if (pass.childMap.USE_INSTANCING) {
                pass.childMap.USE_INSTANCING.value = checked;
            }
        });
    },

    initCache() {
        const excludeNames = [
            'children',
            'defines',
            'extends',
        ];

        const cacheData = this.cacheData;
        this.technique.passes.forEach((pass, i) => {
            if (isNil(pass.propertyIndex)) {
                return;
            }

            cacheProperty(pass.value, i);
        });

        function cacheProperty(prop, passIndex) {
            for (const name in prop) {
                // 这些字段是基础类型或配置性的数据，不需要变动
                if (excludeNames.includes(name)) {
                    continue;
                }

                if (prop[name] && typeof prop[name] === 'object') {
                    if (!cacheData[name]) {
                        cacheData[name] = {};
                    }

                    const { type, value, isObject } = prop[name];
                    if (type && value !== undefined) {
                        if (!cacheData[name][passIndex]) {
                            if (name === 'USE_INSTANCING') {
                                continue;
                            }
                            cacheData[name][passIndex] = { type };
                            if (value && typeof value === 'object') {
                                cacheData[name][passIndex].value = JSON.parse(JSON.stringify(value));
                            } else {
                                cacheData[name][passIndex].value = value;
                            }
                        }
                    }

                    if (isObject) {
                        cacheProperty(value, passIndex);
                    } else if (prop[name].childMap && typeof prop[name].childMap === 'object') {
                        cacheProperty(prop[name].childMap, passIndex);
                    }
                }
            }
        }

        this.requestInitCache = false;
        this.updateInstancing();
    },

    storeCache(dump, passIndex) {
        const { name, type, value, default: defaultValue } = dump;

        if (JSON.stringify(value) === JSON.stringify(defaultValue)) {
            if (this.cacheData[name] && this.cacheData[name][passIndex] !== undefined) {
                delete this.cacheData[name][passIndex];
            }
        } else {
            const cacheData = this.cacheData;
            if (!cacheData[name]) {
                cacheData[name] = {};
            }
            cacheData[name][passIndex] = JSON.parse(JSON.stringify({ type, value }));
        }
    },

    useCache() {
        const cacheData = this.cacheData;
        this.technique.passes.forEach((pass, i) => {
            if (isNil(pass.propertyIndex)) {
                return;
            }

            updateProperty(pass.value, i);
        });

        function updateProperty(prop, passIndex) {
            for (const name in prop) {
                if (prop[name] && typeof prop[name] === 'object') {
                    if (name in cacheData) {
                        const passItem = cacheData[name][passIndex];
                        if (passItem) {
                            const { type, value } = passItem;
                            if (prop[name].type === type && JSON.stringify(prop[name].value) !== JSON.stringify(value)) {
                                if (value && typeof value === 'object') {
                                    prop[name].value = JSON.parse(JSON.stringify(value));
                                } else {
                                    prop[name].value = value;
                                }
                            }
                        }
                    }

                    if (prop[name].isObject) {
                        updateProperty(prop[name].value, passIndex);
                    } else if (prop[name].childMap && typeof prop[name].childMap === 'object') {
                        updateProperty(prop[name].childMap, passIndex);
                    }
                }
            }
        }
    },

    async setDirtyData() {
        this.dirtyData.realtime = JSON.stringify({
            effect: this.material.effect,
            technique: this.material.technique,
            techniqueData: this.material.data[this.material.technique],
        });

        if (!this.dirtyData.origin) {
            this.dirtyData.origin = this.dirtyData.realtime;

            this.dispatch('snapshot');
        }

        if (this.canUpdatePreview) {
            await this.updatePreview(true);
        }
    },

    isDirty() {
        const isDirty = this.dirtyData.origin !== this.dirtyData.realtime;
        return isDirty;
    },
};

/**
 * Methods for automatic rendering of components
 * @param assetList
 * @param metaList
 */
exports.update = async function(assetList, metaList) {
    this.assetList = assetList;
    this.metaList = metaList;
    this.asset = assetList[0];
    this.meta = metaList[0];

    // 增加容错
    if (!this.$this.isConnected) {
        return;
    }

    if (assetList.length !== 1) {
        this.$.invalid.setAttribute('active', '');
        return;
    } else {
        this.$.invalid.removeAttribute('active');
    }

    if (this.dirtyData.uuid !== this.asset.uuid) {
        this.dirtyData.uuid = this.asset.uuid;
        this.dirtyData.origin = '';
        this.dirtyData.realtime = '';
        this.cacheData = {};
        this.requestInitCache = true;
    }

    this.material = await Editor.Message.request('scene', 'query-material', this.asset.uuid);

    await this.updateEffect();

    await this.updateInterface();
    await this.setDirtyData();
};

/**
 * Method of initializing the panel
 */
exports.ready = function() {
    this.defaultCollapsePasses = {};
    this.canUpdatePreview = false;
    // Used to determine whether the material has been modified in isDirty()
    this.dirtyData = {
        uuid: '',
        origin: '',
        realtime: '',
    };

    // Retain the previously modified data when switching pass
    this.cacheData = {};

    // The event that is triggered when the effect used is modified
    this.$.effect.addEventListener('change', async (event) => {
        this.material.effect = event.target.value;
        this.material.data = await Editor.Message.request('scene', 'query-effect', this.material.effect);

        // change effect then make technique back to 0
        this.$.technique.value = this.material.technique = 0;

        await this.updateInterface();

        await this.change();
        this.snapshot();
    });

    this.$.location.addEventListener('change', () => {
        const effect = this.effects.find((_effect) => _effect.name === this.material.effect);
        if (effect) {
            Editor.Message.send('assets', 'twinkle', effect.uuid);
        }
    });

    // Event triggered when the technique being used is changed
    this.$.technique.addEventListener('change', async (event) => {
        this.material.technique = Number(event.target.value);
        await this.updateInterface();
        await this.change();
        this.snapshot();
    });

    // The event is triggered when the useInstancing is modified
    this.$.useInstancing.addEventListener('change-dump', async (event) => {
        this.changeInstancing(event.target.dump.value);
        this.storeCache(event.target.dump, 0);
        await this.change();
        this.snapshot();
    });

    // The event triggered when the content of material is modified
    this.$.materialDump.addEventListener('change-dump', async (event) => {
        const dump = event.target.dump;

        if (!event.path) {
            event.path = event.composedPath();
        }

        let passIndex = 0;
        for (let element of event.path) {
            if (element instanceof HTMLElement && element.hasAttribute('pass-index')) {
                passIndex = Number(element.getAttribute('pass-index'));
                break;
            }
        }

        this.storeCache(dump, passIndex);
        await this.change();
    });

    this.$.materialDump.addEventListener('confirm-dump', () => {
        this.snapshot();
    });

    this.$.custom.addEventListener('change', () => {
        this.change();
    });

    this.$.custom.addEventListener('snapshot', () => {
        this.snapshot();
    });
};

exports.close = function() {
    // Used to determine whether the material has been modified in isDirty()
    this.dirtyData = {
        uuid: '',
        origin: '',
        realtime: '',
    };

    this.cacheData = {};
};
