const { template, $, update, close } = require('./base');

exports.template = template;
exports.$ = $;
exports.update = update;
exports.close = close;

const { setHidden, isMultipleInvalid, getName, createRadioGroup, setLabel } = require('../utils/prop');

const fontStyles = ['isBold', 'isItalic', 'isUnderline'];

exports.style = `
ui-tab {
    flex: none;
}

.fontStyleParent {
    display:flex
}

.fontStyle:nth-child(2) {
    margin-left: 5px;
    margin-right: 5px;
}

.fontStyle {
    height: 20px;
    width: 42px;
    text-align: center;
    line-height: 20px;
    border: calc(var(--size-normal-border) * 1px) solid var(--color-default-border-weaker);
    border-radius: calc(var(--size-normal-radius) * 1px);
}

.fontStyle.invalid {
    background-color: var(--color-default-fill);
}

.fontStyle.select {
    background-color: var(--color-info-fill-important);
    border-color: var(--color-focus-border-emphasis);
}

.fontStyle.italic {
    font-style: italic;
}

.fontStyle.bold {
    font-weight: bold;
}

.fontStyle.underline {
    text-decoration-line: underline;
}
`;

exports.ready = function() {
    this.elements = {
        fontFamily: {
            update(element, dump) {
                setHidden(isMultipleInvalid(dump.useSystemFont) || !dump.useSystemFont.value, element);
            },
        },
        font: {
            update(element, dump) {
                setHidden(isMultipleInvalid(dump.useSystemFont) || !!dump.useSystemFont.value, element);
            },
        },
        horizontalAlign: {
            create(dump) {
                const prop = document.createElement('ui-prop');
                prop.dump = dump;
                const label = document.createElement('ui-label');
                label.setAttribute('slot', 'label');
                setLabel(dump, label);

                const content = createRadioGroup({
                    enumList: dump.enumList,
                    tooltip: dump.tooltip,
                    getIconName: (elName) => {
                        const iconName = elName.toLocaleLowerCase();
                        if (iconName === 'center') {
                            return `align-h-${iconName}`;
                        }
                        return `align-${iconName}`;
                    },
                    onChange: (event) => {
                        const value = Number(event.target.value);
                        if (Number.isFinite(value) && value !== -1) {
                            dump.value = value;
                            if (dump.values) {
                                dump.values.forEach((_, index) => dump.values[index] = dump.value);
                            }
                            prop.dispatch('change-dump');
                            prop.dispatch('confirm-dump');
                        }
                    },
                });

                prop.appendChild(label);
                prop.appendChild(content);
                return prop;
            },
            update(element, dump) {
                const radioGroup = element.querySelector('ui-radio-group');
                if (isMultipleInvalid(dump.horizontalAlign)) {
                    radioGroup.value = -1;
                } else {
                    radioGroup.value = dump.horizontalAlign.value;
                }
            },
        },
        verticalAlign: {
            create(dump) {
                const prop = document.createElement('ui-prop');
                prop.dump = dump;
                const label = document.createElement('ui-label');
                label.setAttribute('slot', 'label');
                setLabel(dump, label);

                const content = createRadioGroup({
                    enumList: dump.enumList,
                    tooltip: dump.tooltip,
                    getIconName: (elementName) => {
                        const iconName = elementName.toLocaleLowerCase();
                        if (iconName === 'center') {
                            return `align-v-${iconName}`;
                        }
                        return `align-${iconName}`;
                    },
                    onChange: (e) => {
                        const enumVal = Number(e.target.value);
                        if (!Number.isFinite(enumVal) || enumVal === -1) {
                            return;
                        }
                        dump.value = enumVal;
                        if (dump.values) {
                            dump.values.forEach((_, index) => (dump.values[index] = dump.value));
                        }
                        prop.dispatch('change-dump');
                        prop.dispatch('confirm-dump');
                    },
                });

                prop.appendChild(label);
                prop.appendChild(content);
                return prop;
            },
            update(element, dump) {
                const radioGroup = element.querySelector('ui-radio-group');
                if (isMultipleInvalid(dump.verticalAlign)) {
                    radioGroup.value = -1;
                } else {
                    radioGroup.value = dump.verticalAlign.value;
                }
            },
        },
    };
};
