'use strict';

const { readFileSync, existsSync } = require('fs');
const { updateElementReadonly } = require('../utils/assets');

exports.template = /* html */`
<div class="asset-effect">
    <ui-prop>
        <ui-label slot="label" value="i18n:ENGINE.assets.effect.shader" tooltip="i18n:ENGINE.assets.effect.shaderTip"></ui-label>
        <ui-select slot="content" class="shader-select"></ui-select>
    </ui-prop>

    <ui-section expand class="section" cache-expand="effect-combinations">
        <ui-label slot="header" value="i18n:ENGINE.assets.effect.combinations" tooltip="i18n:ENGINE.assets.effect.combinationsTip"></ui-label>
        <div class="description">
            <ui-label value="i18n:ENGINE.assets.effect.choose"></ui-label>
        </div>
        <div class="combinations">
        </div>
    </ui-section>

    <div class="codes"></div>

    <ui-label class="multiple-warn-tip" value="i18n:ENGINE.assets.multipleWarning"></ui-label>
</div>
`;

exports.style = /* css */`
    .asset-effect {
        padding-right: 4px;
    }

    .asset-effect[multiple-invalid] > *:not(.multiple-warn-tip) {
        display: none!important;
     }

     .asset-effect[multiple-invalid] > .multiple-warn-tip {
        display: block;
     }

    .asset-effect .multiple-warn-tip {
        display: none;
        text-align: center;
        color: var(--color-focus-contrast-weakest);
        margin-top: 8px;
    }

    .asset-effect > .section > .description {
        text-align: center;
        color: var(--color-normal-fill-weakest);
    }
    .asset-effect > .section > .combinations .tab {
        margin-left: 4px;
        min-width: 60px;
        width: calc(50% - 4px);
    }
    .asset-effect > .section > .combinations .tab[checked="true"] {
        background-color: var(--color-info-fill-important);
        border-color: var(--color-info-fill-important);
        color: var(--color-info-contrast-important);
    }
    .asset-effect > .codes .tabs  {
        margin: 4px auto 6px auto;
    }
    .asset-effect > .codes .tabs > .tab  {
        padding: 0;
        width: 110px;
        height: 20px;
        box-sizing: border-box;
        text-align: center;
        cursor: pointer;
        display: inline-block;
        color: var(--color-normal-contrast-emphasis);
        border: calc(var(--size-normal-border) * 1px) solid var(--color-default-border);
    }
    .asset-effect > .codes .tabs > .tab:first-child  {
        border-top-left-radius: 2px;
        border-bottom-left-radius: 2px;
        border-right: 1px solid var(--color-default-border);
    }
    .asset-effect > .codes .tabs > .tab:last-child  {
        border-top-right-radius: 2px;
        border-bottom-right-radius: 2px;
        border-left: 1px solid var(--color-default-border);
    }
    .asset-effect > .codes .tabs > .tab:hover,
    .asset-effect > .codes .tabs > .tab[active="true"]  {
        background-color: var(--color-default-fill-normal);
        background-color: var(--color-default-fill-important);
        color: var(--color-normal-contrast);
    }
    .asset-effect > .codes ui-code  {
        max-height: 400px;
        border: none;
        border-radius: 0;
        background-color: var(--color-normal-fill-emphasis);
    }
`;

exports.$ = {
    container: '.asset-effect',
    shaderSelect: '.shader-select',
    combinations: '.combinations',
    codes: '.codes',
};

/**
 * Property corresponds to the edit element
 */
const Elements = {
    shaders: {
        ready() {
            const panel = this;

            panel.shadersIndex = 0;

            panel.$.shaderSelect.addEventListener('change', (event) => {
                panel.shadersIndex = event.target.value;

                // There are other properties that are updated depending on its change
                Elements.combinations.update.call(panel);
                Elements.codes.update.call(panel);
            });

            panel.$.shaderSelect.addEventListener('confirm', () => {
                panel.dispatch('snapshot');
            });
        },
        update() {
            const panel = this;

            let optionsHtml = '';
            panel.shaders.forEach((shader, index) => {
                optionsHtml += `<option value="${index}">${shader.name}</option>`;
            });
            panel.$.shaderSelect.innerHTML = optionsHtml;

            if (panel.shadersIndex > panel.shaders.length - 1) {
                panel.shadersIndex = 0;
            }

            panel.$.shaderSelect.value = panel.shadersIndex;

            if (panel.shaders[panel.shadersIndex]) {
                panel.$.shaderSelect.setAttribute('tooltip', panel.shaders[panel.shadersIndex].name);
            }

            updateElementReadonly.call(this, panel.$.shaderSelect);
        },
    },
    combinations: {
        update() {
            const panel = this;

            panel.$.combinations.innerText = '';

            panel.shaders[panel.shadersIndex].defines.forEach((define) => {
                if (!define._enabled) {
                    return;
                }

                const prop = document.createElement('ui-prop');
                panel.$.combinations.appendChild(prop);

                const label = document.createElement('ui-label');
                label.setAttribute('slot', 'label');
                label.setAttribute('value', define.name);
                prop.appendChild(label);

                const content = document.createElement('div');
                content.setAttribute('slot', 'content');
                prop.appendChild(content);

                define._values.forEach((value) => {
                    const userCombinations = panel.combinations[panel.shadersIndex][define.name];
                    const checked = userCombinations && userCombinations.includes(value) ? 'true' : 'false';
                    const name = typeof value === 'boolean' ? (value ? 'on' : 'off') : value.toString();

                    const button = document.createElement('ui-button');
                    updateElementReadonly.call(panel, button);
                    button.setAttribute('class', 'tab');
                    button.setAttribute('checked', checked);
                    button.innerText = name;
                    button.addEventListener('click', () => {
                        if (!panel.combinations[panel.shadersIndex][define.name]) {
                            panel.combinations[panel.shadersIndex][define.name] = [];
                        }

                        const userCombinations = panel.combinations[panel.shadersIndex][define.name];

                        if (userCombinations.indexOf(value) !== -1) {
                            // Eliminate existing, can choose more
                            userCombinations.splice(userCombinations.indexOf(value), 1);
                            button.setAttribute('checked', 'false');
                        } else {
                            userCombinations.push(value);
                            button.setAttribute('checked', 'true');
                        }

                        panel.change();
                    });

                    content.appendChild(button);
                });
            });

            if (panel.$.combinations.children.length) {
                panel.$.combinations.parentElement.style.display = 'block';
            } else {
                panel.$.combinations.parentElement.style.display = 'none';
            }
        },
    },
    codes: {
        ready() {
            const panel = this;

            panel.glslNames = {
                glsl3: 'GLSL 300 ES Output',
                glsl1: 'GLSL 100 Output',
            };
            panel.shaderNames = {
                vert: 'Vertex Shader',
                frag: 'Fragment Shader',
            };
        },
        update() {
            const panel = this;

            panel.$.codes.innerText = '';

            for (const glslKey in panel.glslNames) {
                const section = document.createElement('ui-section');
                panel.$.codes.appendChild(section);
                section.setAttribute('class', 'section');
                section.setAttribute('expand', '');
                section.setAttribute('cache-expand', `effect-${glslKey}`);

                const glslName = panel.glslNames[glslKey];

                const header = document.createElement('div');
                section.appendChild(header);
                header.setAttribute('slot', 'header');
                header.innerHTML = `<span>${glslName}</span>`;

                const tabs = document.createElement('div');
                section.appendChild(tabs);
                tabs.setAttribute('class', 'tabs');

                const code = document.createElement('ui-code');
                section.appendChild(code);
                code.setAttribute('language', 'glsl');
                code.innerHTML = panel.shaders[panel.shadersIndex][glslKey][panel.shaders[panel.shadersIndex][glslKey].activeKey];

                for (const shaderKey in panel.shaderNames) {
                    const shaderName = panel.shaderNames[shaderKey];
                    const active = panel.shaders[panel.shadersIndex][glslKey].activeKey === shaderKey;

                    const tab = document.createElement('div');
                    tabs.appendChild(tab);
                    tab.setAttribute('class', 'tab');
                    tab.setAttribute('active', active);
                    tab.innerText = shaderName;

                    tab.addEventListener('click', () => {
                        if (tab.getAttribute('active') === 'true') {
                            return;
                        }

                        for (const child of tab.parentElement.children) {
                            if (child === tab) {
                                child.setAttribute('active', 'true');
                            } else {
                                child.setAttribute('active', 'false');
                            }
                        }

                        panel.shaders[panel.shadersIndex][glslKey].activeKey = shaderKey;
                        code.innerHTML = panel.shaders[panel.shadersIndex][glslKey][panel.shaders[panel.shadersIndex][glslKey].activeKey];
                    });
                }
            }
        },
    },
};

exports.methods = {
    record() {
        return JSON.stringify({ shadersIndex: this.shadersIndex });
    },
    restore(record) {
        record = JSON.parse(record);

        this.$.shaderSelect.value = record.shadersIndex;
        this.$.shaderSelect.dispatch('change');
        return true;
    },
    refresh() {
        const panel = this;

        // notice : The data displayed uses both the library and the meta, so you need to keep both consistent
        if (panel.asset.uuid !== panel.meta.uuid) {
            return false;
        }

        const fileSource = panel.asset.library['.json'];

        if (!fileSource || !existsSync(fileSource)) {
            console.error('Read effect json file in library failed.');
            return false;
        }

        const dataSource = JSON.parse(readFileSync(fileSource, 'utf8'));

        if (!dataSource) {
            console.error('Read effect json file in library failed.');
            return false;
        }

        panel.shaders = dataSource.shaders;

        // The edited value of defines in each shader
        panel.combinations = [];
        if (Array.isArray(panel.meta.userData.combinations)) {
            panel.combinations = panel.meta.userData.combinations;
        }

        // Adjusting some data for display
        panel.shaders.forEach((shader, index) => {
            for (const glslKey in panel.glslNames) {
                shader[glslKey].activeKey = 'vert';
            }

            if (!panel.combinations[index]) {
                panel.combinations[index] = {};
            }

            // Configurable definition with injection of temporary data
            shader.defines.forEach((define) => {
                const { name, type } = define;
                if (name.startsWith('CC_')) {
                    // Prefixed with "CC_" are not processed
                    define._enabled = false;
                    return;
                } else {
                    define._enabled = true;
                }

                // The following data is used for display editing
                define._values = [];

                if (type === 'number' && define.range) {
                    const [min, max] = define.range;
                    for (let i = min; i <= max; i++) {
                        define._values.push(i);
                    }
                }

                if (type === 'boolean') {
                    define._values = [false, true];
                }

                if (type === 'string') {
                    define._values = define.options;
                }
            });
        });

        return true;
    },
    change() {
        const panel = this;

        // Need to exclude empty arrays, otherwise scene will report an error
        const submitData = [];
        panel.combinations.forEach((combination, index) => {
            submitData[index] = {};
            const names = Object.keys(combination);
            names.forEach((name) => {
                if (combination[name].length !== 0) {
                    submitData[index][name] = combination[name];
                }
            });
        });

        panel.meta.userData.combinations = submitData;

        panel.dispatch('change');
        panel.dispatch('snapshot');
    },
};

exports.ready = function() {
    for (const prop in Elements) {
        const element = Elements[prop];
        if (element.ready) {
            element.ready.call(this);
        }
    }
};

exports.update = function(assetList, metaList) {
    this.assetList = assetList;
    this.metaList = metaList;
    this.asset = assetList[0];
    this.meta = metaList[0];

    if (assetList.length > 1) {
        this.$.container.setAttribute('multiple-invalid', '');
        return;
    } else {
        this.$.container.removeAttribute('multiple-invalid');
    }

    const isLegal = this.refresh();
    if (!isLegal) {
        return;
    }

    for (const prop in Elements) {
        const element = Elements[prop];
        if (element.update) {
            element.update.call(this);
        }
    }
};
