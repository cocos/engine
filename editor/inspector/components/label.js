const { setTooltip, setHidden, isMultipleInvalid, createRadioGroup, setLabel } = require('../utils/prop');
const { template, $, update, close } = require('./base');
const fontStyles = ['isBold', 'isItalic', 'isUnderline'];
exports.template = template;
exports.$ = $;
exports.update = update;
exports.close = close;
exports.style = /* css */`
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
        isBold: {
            create() {
                const prop = document.createElement('ui-prop');
                const label = document.createElement('ui-label');
                label.setAttribute('slot', 'label');
                label.value = 'i18n:ENGINE.components.label.font_style';
                label.setAttribute('tooltip', 'i18n:ENGINE.components.label.font_style_tooltip');
                prop.appendChild(label);
                const content = document.createElement('div');
                content.setAttribute('slot', 'content');
                content.classList.add('fontStyleParent');
                const styleDisplayNames = ['B', 'I', 'U'];
                const styleClassNames = ['bold', 'italic', 'underline'];
                for (let index = 0; index < fontStyles.length; index++) {
                    const style = fontStyles[index];
                    const label = document.createElement('ui-label');
                    label.innerHTML = styleDisplayNames[index];
                    label.setAttribute('key', style);
                    setTooltip(this.dump.value[style], label);
                    label.classList.add('fontStyle', styleClassNames[index]);
                    label.addEventListener('click', () => {
                        prop.dump = this.dump.value[style];
                        prop.dump.value = !prop.dump.value;
                        if (prop.dump.values) {
                            prop.dump.values.forEach((_, index) => prop.dump.values[index] = prop.dump.value);
                        }
                        prop.dispatch('change-dump');
                        prop.dispatch('confirm-dump');
                        this.dump.value[style].value ? label.classList.add('select') : label.classList.remove('select');
                    });
                    content.appendChild(label);
                }
                prop.appendChild(content);
                return prop;
            },
            update(element, dump) {
                const parent = element.querySelector('[slot="content"]');
                for (let index = 0; index < fontStyles.length; index++) {
                    const div = parent.querySelector(`[key="${fontStyles[index]}"]`);
                    const key = fontStyles[index];
                    if (div) {
                        const multipleInvalid = isMultipleInvalid(this.dump.value[key]);
                        if (multipleInvalid) {
                            div.classList.remove('select');
                            div.classList.add('invalid');
                        } else {
                            div.classList.remove('invalid');
                            this.dump.value[key].value ? div.classList.add('select') : div.classList.remove('select');
                        }
                    }
                }
            },
        },
        isItalic: {
            update(element, dump) {
                setHidden(true, element);
            },
        },
        isUnderline: {
            update(element, dump) {
                setHidden(true, element);
            },
        },
    };
};
