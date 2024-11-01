/* eslint-disable @typescript-eslint/no-unsafe-return */
const i18nPrefix = 'i18n:';
/*
 * Returns the ordered PropMap
 * @param {*} value of dump
 * @returns {key:string dump:object}[]
 */
exports.sortProp = function(propMap) {
    const orderList = [];
    const normalList = [];

    Object.keys(propMap).forEach((key) => {
        const item = propMap[key];
        if (item != null) {
            if ('displayOrder' in item) {
                orderList.push({
                    key,
                    dump: item,
                });
            } else {
                normalList.push({
                    key,
                    dump: item,
                });
            }
        }
    });

    orderList.sort((a, b) => a.dump.displayOrder - b.dump.displayOrder);

    return orderList.concat(normalList);
};

/**
 *
 * This method is used to update the custom node
 * @param {HTMLElement} container
 * @param {string[]} excludeList
 * @param {object} dump
 * @param {(element,prop)=>void} update
 */
exports.updateCustomPropElements = function(container, excludeList, dump, update) {
    const sortedProp = exports.sortProp(dump.value);
    container.$ = container.$ || {};
    /**
     * @type {Array<HTMLElement>}
     */
    const children = [];
    sortedProp.forEach((prop) => {
        if (!excludeList.includes(prop.key)) {
            if (!prop.dump.visible) {
                return;
            }
            let node = container.$[prop.key];
            if (!node) {
                node = document.createElement('ui-prop');
                node.setAttribute('type', 'dump');
                node.dump = prop.dump;
                node.key = prop.key;
                container.$[prop.key] = node;
            }

            if (typeof update === 'function') {
                update(node, prop);
            }

            children.push(node);
        }
    });
    const currentChildren = Array.from(container.children);
    children.forEach((child, i) => {
        if (child === currentChildren[i]) {
            return;
        }

        container.appendChild(child);
    });

    // delete extra children
    currentChildren.forEach(($child) => {
        if (!children.includes($child)) {
            $child.remove();
        }
    });
};

/**
 * Tool function: recursively set readonly in resource data
 */
exports.loopSetAssetDumpDataReadonly = function(dump) {
    if (typeof dump !== 'object') {
        return;
    }

    if (dump.readonly === undefined) {
        return;
    }

    dump.readonly = true;

    if (dump.isArray) {
        for (let i = 0; i < dump.value.length; i++) {
            exports.loopSetAssetDumpDataReadonly(dump.value[i]);
        }
        return;
    }

    for (const key in dump.value) {
        exports.loopSetAssetDumpDataReadonly(dump.value[key]);
    }
};

/**
 * Tool functions: set to unavailable
 * @param {object} data  dump | function
 * @param element
 */
exports.setDisabled = function(data, element) {
    if (!element) {
        return;
    }

    let disabled = data;

    if (typeof data === 'function') {
        disabled = data();
    }

    if (disabled === true) {
        element.setAttribute('disabled', 'true');
    } else {
        element.removeAttribute('disabled');
    }
};

/**
 * Tool function: Set read-only status
 * @param {object} data  dump | function
 * @param element
 */
exports.setReadonly = function(data, element) {
    if (!element) {
        return;
    }

    let readonly = data;

    if (typeof data === 'function') {
        readonly = data();
    }

    if (readonly === true) {
        element.setAttribute('readonly', 'true');
    } else {
        element.removeAttribute('readonly');
    }

    if (element.render && element.dump) {
        element.dump.readonly = readonly;
        element.render();
    }
};

/**
 * Tool function: Set the display status
 * @param {Function | boolean} data  dump | function
 * @param {HTMLElement} element
 */
exports.setHidden = function(data, element) {
    if (!element) {
        return;
    }

    let hidden = data;

    if (typeof data === 'function') {
        hidden = data();
    }

    if (hidden === true) {
        element.setAttribute('hidden', '');
    } else {
        element.removeAttribute('hidden');
    }
};

// In order to avoid a large number of operations in a short time, the function of returning the same operation result in a time period is added
let getMessageProtocolSceneResult = '';
let getMessageProtocolSceneStartTime = Date.now();
exports.getMessageProtocolScene = function(element) {
    if (getMessageProtocolSceneResult && Date.now() - getMessageProtocolSceneStartTime < 1000) {
        return getMessageProtocolSceneResult;
    }

    getMessageProtocolSceneResult = '';
    getMessageProtocolSceneStartTime = Date.now();

    while (element) {
        element = element.parentElement || element.getRootNode().host;
        if (element && element.messageProtocol) {
            getMessageProtocolSceneResult = element.messageProtocol.scene;
            break;
        }
    }

    if (!getMessageProtocolSceneResult) {
        getMessageProtocolSceneResult = 'scene';
    }

    return getMessageProtocolSceneResult;
};

exports.updatePropByDump = function(panel, dump) {
    panel.dump = dump;

    if (!panel.elements) {
        panel.elements = {};
    }

    if (!panel.$props) {
        panel.$props = {};
    }

    if (!panel.$groups) {
        panel.$groups = {};
    }

    const oldPropKeys = Object.keys(panel.$props);
    const newPropKeys = [];

    Object.keys(dump.value).forEach((key, index) => {
        const info = dump.value[key];
        if (!info.visible) {
            return;
        }

        newPropKeys.push(key);

        const element = panel.elements[key];
        let $prop = panel.$props[key];
        if (!$prop) {
            if (element && element.create) {
                // when it need to go custom initialize
                $prop = panel.$props[key] = panel.$[key] = element.create.call(panel, info);
            } else {
                $prop = panel.$props[key] = panel.$[key] = document.createElement('ui-prop');
                $prop.setAttribute('type', 'dump');
            }

            const _displayOrder = info.group?.displayOrder ?? info.displayOrder;
            $prop.displayOrder = _displayOrder === undefined ? index : Number(_displayOrder);

            if (element && element.displayOrder !== undefined) {
                $prop.displayOrder = element.displayOrder;
            }

            if (!element || !element.isAppendToParent || element.isAppendToParent.call(panel)) {
                if (info.group && dump.groups) {
                    const { id = 'default', name } = info.group;

                    if (!panel.$groups[id] && dump.groups[id]) {
                        if (dump.groups[id].style === 'tab') {
                            panel.$groups[id] = exports.createTabGroup(dump.groups[id], panel);
                        } else if (dump.groups[id].style === 'section') {
                            panel.$groups[id] = exports.createGroup(dump.groups[id]);
                        }
                    }

                    if (panel.$groups[id]) {
                        if (!panel.$groups[id].isConnected) {
                            exports.appendChildByDisplayOrder(panel.$.componentContainer, panel.$groups[id]);
                        }
                        if (dump.groups[id].style === 'tab') {
                            exports.appendToTabGroup(panel.$groups[id], name);
                        } else if (dump.groups[id].style === 'section') {
                            exports.appendToGroup(panel.$groups[id], name);
                        }
                    }

                    if (dump.groups[id].style === 'tab') {
                        exports.appendChildByDisplayOrder(panel.$groups[id].tabs[name], $prop);
                    } else if (dump.groups[id].style === 'section') {
                        exports.appendChildByDisplayOrder(panel.$groups[id].names[name], $prop);
                    }
                } else {
                    exports.appendChildByDisplayOrder(panel.$.componentContainer, $prop);
                }
            }
        } else if (!$prop.isConnected || !$prop.parentElement) {
            if (!element || !element.isAppendToParent || element.isAppendToParent.call(panel)) {
                if (info.group && dump.groups) {
                    const { id = 'default', name } = info.group;
                    if (dump.groups[id].style === 'tab') {
                        exports.appendChildByDisplayOrder(panel.$groups[id].tabs[name], $prop);
                    } else {
                        exports.appendChildByDisplayOrder(panel.$groups[id].names[name], $prop);
                    }
                } else {
                    exports.appendChildByDisplayOrder(panel.$.componentContainer, $prop);
                }
            }
        }
        $prop.render(info);
    });

    for (const id of oldPropKeys) {
        if (!newPropKeys.includes(id)) {
            const $prop = panel.$props[id];
            if ($prop && $prop.parentElement) {
                $prop.parentElement.removeChild($prop);
            }
        }
    }

    for (const key in panel.elements) {
        const element = panel.elements[key];
        if (element && element.ready) {
            element.ready.call(panel, panel.$[key], dump.value);
            element.ready = undefined; // ready needs to be executed only once
        }
    }

    for (const key in panel.elements) {
        const element = panel.elements[key];
        if (element && element.update) {
            element.update.call(panel, panel.$[key], dump.value);
        }
    }

    exports.toggleGroup(panel.$groups);
};

/**
 * Tool function: check whether the value of the attribute is consistent after multi-selection
 */
exports.isMultipleInvalid = function(dump) {
    let invalid = false;

    if (dump.values && dump.values.some((ds) => ds !== dump.value)) {
        invalid = true;
    }

    return invalid;
};

/**
 * Get the name based on the dump data
 */
exports.getName = function(dump) {
    if (!dump) {
        return '';
    }

    if (typeof dump.displayName === 'string') {
        const displayName = dump.displayName.trim();
        if (displayName.startsWith(i18nPrefix)) {
            const key = displayName.substring(i18nPrefix.length);
            if (Editor.I18n.t(key)) {
                return displayName;
            }
        } else if (displayName) {
            return displayName;
        }
    }

    let name = dump.name || '';

    name = name.trim().replace(/^\S/, (str) => str.toUpperCase());
    name = name.replace(/_/g, (str) => ' ');
    name = name.replace(/ \S/g, (str) => ` ${str.toUpperCase()}`);
    // 驼峰转中间空格
    name = name.replace(/([a-z])([A-Z])/g, '$1 $2');

    return name.trim();
};

exports.createGroup = function(dump) {
    const $group = document.createElement('div');
    $group.setAttribute('class', 'ui-prop-group');
    $group.dump = dump;
    $group.names = {};
    $group.displayOrder = dump.displayOrder;

    return $group;
};
exports.createTabGroup = function(dump, panel) {
    const $group = document.createElement('div');
    $group.setAttribute('class', 'tab-group');

    $group.dump = dump;
    $group.tabs = {};
    $group.displayOrder = dump.displayOrder;

    $group.$header = document.createElement('ui-tab');
    $group.$header.setAttribute('class', 'tab-header');
    $group.appendChild($group.$header);

    $group.$header.addEventListener('change', (e) => {
        active(e.target.value);
    });

    function active(index) {
        const tabNames = Object.keys($group.tabs);
        const tabName = tabNames[index];
        $group.childNodes.forEach((child) => {
            if (!child.classList.contains('tab-content')) {
                return;
            }
            if (child.getAttribute('name') === tabName) {
                child.style.display = 'block';
            } else {
                child.style.display = 'none';
            }
        });
    }

    // check style
    if (!panel.$this.shadowRoot.querySelector('style#group-style')) {
        const style = document.createElement('style');
        style.setAttribute('id', 'group-style');
        style.innerText = `
            .tab-group {
                margin-top: 4px;
            }
            .tab-content {
                display: none;
                padding-bottom: 6px;
            }`;

        panel.$.componentContainer.before(style);
    }

    setTimeout(() => {
        active(0);
    });

    return $group;
};

exports.appendToGroup = function($group, name) {
    if ($group.names[name]) {
        return;
    }

    const $content = document.createElement('ui-section');
    $content.setAttribute('class', 'ui-prop-group-content');
    $content.setAttribute('expand', '');

    let parentCacheKey = 'ui-prop-group-content';
    let $parent = $group;
    while ($parent) {
        if ($parent.hasAttribute('cache-expand')) {
            parentCacheKey = $parent.getAttribute('cache-expand');
            break;
        }

        $parent = $parent.parentElement;
    }
    $content.setAttribute('cache-expand', `${parentCacheKey}-${name}`);

    const $header = document.createElement('ui-label');
    $header.setAttribute('slot', 'header');

    let displayName = name;
    if (displayName.startsWith(i18nPrefix)) {
        displayName = exports.getName({ displayName: name });
    } else {
        displayName = exports.getName({ name });
    }

    $header.setAttribute('value', displayName);
    $content.appendChild($header);

    $group.appendChild($content);
    $group.names[name] = $content;

};
exports.appendToTabGroup = function($group, tabName) {
    if ($group.tabs[tabName]) {
        return;
    }

    const $content = document.createElement('div');

    $group.tabs[tabName] = $content;

    $content.setAttribute('class', 'tab-content');
    $content.setAttribute('name', tabName);
    $group.appendChild($content);

    const $label = document.createElement('ui-label');
    let displayName = tabName;
    if (displayName.startsWith(i18nPrefix)) {
        displayName = exports.getName({ displayName: tabName });
    } else {
        displayName = exports.getName({ name: tabName });
    }
    $label.setAttribute('value', displayName);

    const $button = document.createElement('ui-button');
    $button.setAttribute('name', tabName);
    $button.appendChild($label);
    $group.$header.appendChild($button);
};
exports.appendChildByDisplayOrder = function(parent, newChild) {
    const displayOrder = newChild.displayOrder || 0;
    const children = Array.from(parent.children);

    const child = children.find((child) => {
        if (child.dump && child.displayOrder > displayOrder) {
            return child;
        }

        return null;
    });

    if (child) {
        child.before(newChild);
    } else {
        parent.appendChild(newChild);
    }
};
exports.toggleGroup = function($groups) {
    for (const id in $groups) {
        if ($groups[id].dump.style === 'section') {
            const $contents = $groups[id].querySelectorAll('.ui-prop-group-content');
            $contents.forEach($content => {
                const $props = Array.from($content.querySelectorAll(':scope > ui-prop'));
                const show = $props.some($prop => getComputedStyle($prop).display !== 'none');
                if (show) {
                    $content.removeAttribute('hidden');
                } else {
                    $content.setAttribute('hidden', '');
                }
            });
        }

        if ($groups[id].dump.style === 'tab') {
            const $props = Array.from($groups[id].querySelectorAll('.tab-content > ui-prop'));
            const show = $props.some($prop => getComputedStyle($prop).display !== 'none');
            if (show) {
                $groups[id].removeAttribute('hidden');
            } else {
                $groups[id].setAttribute('hidden', '');
            }
        }
    }
},
exports.disconnectGroup = function(panel) {
    if (panel.$groups) {
        for (const key in panel.$groups) {
            if (panel.$groups[key] instanceof HTMLElement) {
                panel.$groups[key].remove();
            }
        }

        panel.$groups = {};
    }
};

/**
 * Create ui-radio-group according to configuration
 * @param {object} options
 * @param {any[]} options.enumList
 * @param {string} options.tooltip
 * @param {(elementName: string) => string}options.getIconName
 * @param {(event: CustomEvent) => {}} options.onChange
 * @returns
 */
exports.createRadioGroup = function(options) {
    const { enumList, getIconName, onChange, tooltip: rawTooltip } = options;
    const $radioGroup = document.createElement('ui-radio-group');
    $radioGroup.setAttribute('slot', 'content');
    $radioGroup.addEventListener('change', (e) => {
        onChange(e);
    });

    for (let index = 0; index < enumList.length; index++) {
        const element = enumList[index];
        const icon = document.createElement('ui-icon');
        const button = document.createElement('ui-radio-button');

        const iconName = getIconName(element.name);
        const tooltip = `${rawTooltip}_${element.name.toLocaleLowerCase()}`;

        icon.value = iconName;
        button.appendChild(icon);
        button.value = element.value;
        button.setAttribute('tooltip', tooltip);

        $radioGroup.appendChild(button);
    }

    return $radioGroup;
};

exports.injectionStyle = `
ui-prop,
ui-section { margin-top: 4px; }

ui-prop > ui-section,
ui-prop > ui-prop,
ui-section > ui-prop[slot="header"],
ui-prop [slot="content"] ui-prop { 
    margin-top: 0; 
    margin-left: 0;
}
ui-prop[ui-section-config] + ui-section.config,
ui-prop[ui-section-config] + ui-prop[ui-section-config],
ui-section.config + ui-prop[ui-section-config],
ui-section.config + ui-section.config { margin-top: 0; }

ui-prop[ui-section-config]:last-child {
    border-bottom: solid 1px var(--color-normal-fill-emphasis);
}
`;

/**
 * Obtain the api document path and obtain the className through the cc.xxx.properties configured by i18n.
 * If it does not exist, the ui-link component will not be added.
 * @param dump
 */
function getDocsURL(dump) {
    const mathResults = dump.displayName && dump.displayName.match(/(?<=cc\.\s*)(\w+)/);
    const className = mathResults && mathResults.length > 0 ? mathResults[0] : '';
    if (!className) {
        return '';
    }
    return `${Editor.App.urls.api}/class/${className}?id=${dump.name}`;
}

exports.setTooltip = function(dump, $label, name) {
    if (!name) {
        name = exports.getName(dump);
    }
    if (dump.tooltip) {
        let tooltipValid = true;
        if (dump.tooltip.startsWith(i18nPrefix)) {
            const key = dump.tooltip.substring(i18nPrefix.length);
            if (!Editor.I18n.t(key)) {
                tooltipValid = false;
            }
        }

        if (tooltipValid) {
            const url = getDocsURL(dump);
            const attributeTitle = `<ui-label style="font-weight:bold;" value="i18n:ENGINE.common.attribute.title"></ui-label>`;
            const attributeName = url ? `
                <ui-link value='${url}'>
                    <ui-label value="${dump.name || name}"></ui-label>
                </ui-link>`.trim() : `<ui-label value="${dump.name || name}"></ui-label>`;

            $label.setAttribute('tooltip', `
                <div>${attributeTitle}${attributeName}</div><br><ui-label value="${dump.tooltip}"></ui-label>`.trim()
            );
        }
    }
};

exports.setLabel = function(dump, $label) {
    const name = exports.getName(dump);
    $label.value = name;
    exports.setTooltip(dump, $label, name);
};
