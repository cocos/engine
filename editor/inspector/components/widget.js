/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable consistent-return */
/* eslint-disable @typescript-eslint/no-unsafe-return */
const { join } = require('path');

module.paths.push(join(Editor.App.path, 'node_modules'));
const Vue = require('vue/dist/vue.min.js');
const propUtils = require('../utils/prop');

const cssMediaWidth = 340;
let layout = 'vertical';

exports.template = `
<style>
.widget-component {
    position: relative;
    margin-bottom: 4px;
    margin-left: 4px;
}

.widget-component[layout='horizontal'] {
    margin-left: 8px;
}

.widget-component[layout='vertical']>.layout {
    padding-left: 0;
    padding-top: 8px;
}

.widget-component[layout='vertical']>.layout .rect {
    position: relative;
    top: 0;
    left: 0;
    height: 154px;
    width: 150px;
    margin: 0 auto;
}
.widget-component[layout='horizontal']>.layout .rect {
    position: absolute;
    top: calc(50% - 65px);
    left: -5px;
}
.widget-component .m20-t {
    margin-top: 20px;
}

.widget-component>.layout {
    position: relative;
    padding-left: 150px;
    padding-top: 8px;
    padding-bottom: 8px;
}

.widget-component>.layout .ui-prop {
    display: inline-block;
}

.widget-component>.layout ui-num-input {
    max-width: 80px;
    user-select: none;
}

.widget-component>.layout ui-checkbox {
    user-select: none;
}

.widget-component>.layout .rect>.top {
    position: absolute;
    top: 0;
    left: 0;
    width: 140px;
    height: 20px;
    text-align: center;
}

.widget-component>.layout .rect>.right {
    position: absolute;
    top: 140px;
    left: 120px;
    width: 140px;
    text-align: center;
    height: 20px;
    transform: rotate(-90deg);
    transform-origin: 0 0;
}

.widget-component>.layout .rect>.bottom {
    position: absolute;
    top: 125px;
    left: 0;
    width: 140px;
    height: 20px;
    text-align: center;
}

.widget-component>.layout .rect>.left {
    position: absolute;
    top: 140px;
    left: -2px;
    width: 140px;
    text-align: center;
    height: 20px;
    transform: rotate(-90deg);
    transform-origin: 0 0;
}

.widget-component>.layout .rect .widget-rect {
    position: absolute;
    top: 21px;
    left: 20px;
    width: 100px;
    height: 100px;
    background-color: var(--color-normal-fill-weaker);
    border: 1px solid var(--color-normal-fill-important);
    box-shadow: var(--color-normal-fill-emphasis) 0 0 4px;
    box-sizing: border-box;
}

.widget-component>.layout .rect .widget-rect>.center {
    position: absolute;
    top: 25%;
    left: 25%;
    width: 50%;
    height: 50%;
    z-index: 2;
    background-color: var(--color-normal-fill);
    border: 1px solid var(--color-normal-fill-important);
    border-radius: 2px;
    box-sizing: border-box;
}

.widget-component>.layout .rect .widget-rect>.center[bottom] {
    top: auto;
    bottom: 12.5%;
}

.widget-component>.layout .rect .widget-rect>.center[bottom][top] {
    height: auto;
}

.widget-component>.layout .rect .widget-rect>.center[bottom]>ui-icon[bottom] {
    display: block;
}

.widget-component>.layout .rect .widget-rect>.center[top] {
    top: 12.5%;
}

.widget-component>.layout .rect .widget-rect>.center[top]>ui-icon[top] {
    display: block;
}

.widget-component>.layout .rect .widget-rect>.center[right] {
    left: auto;
    right: 12.5%;
}

.widget-component>.layout .rect .widget-rect>.center[right][left] {
    width: auto;
}

.widget-component>.layout .rect .widget-rect>.center[right]>ui-icon[right] {
    display: block;
}

.widget-component>.layout .rect .widget-rect>.center[left] {
    left: 12.5%;
}

.widget-component>.layout .rect .widget-rect>.center[left]>ui-icon[left] {
    display: block;
}

.widget-component>.layout .rect .widget-rect>.center>ui-icon {
    display: none;
}

.widget-component>.layout .rect .widget-rect>.center>ui-icon[top] {
    position: absolute;
    top: -15px;
    left: calc(50% - 7px);
    font-size: 11px;
    line-height: 10px;
}

.widget-component>.layout .rect .widget-rect>.center>ui-icon[right] {
    transform: rotate(90deg);
    position: absolute;
    right: -15px;
    top: calc(50% - 7px);
    font-size: 11px;
    line-height: 11px;
}

.widget-component>.layout .rect .widget-rect>.center>ui-icon[bottom] {
    position: absolute;
    bottom: -15px;
    left: calc(50% - 7px);
    font-size: 11px;
    line-height: 10px;
}

.widget-component>.layout .rect .widget-rect>.center>ui-icon[left] {
    transform: rotate(90deg);
    position: absolute;
    left: -15px;
    top: calc(50% - 7px);
    font-size: 11px;
    line-height: 11px;
}

.widget-component>.layout .rect .widget-rect>.top {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 12.5%;
    border-bottom: 1px dashed var(--color-normal-contrast);
}

.widget-component>.layout .rect .widget-rect>.bottom {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 12.5%;
    border-top: 1px dashed var(--color-normal-contrast);
}

.widget-component>.layout .rect .widget-rect>.left {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 12.5%;
    border-right: 1px dashed var(--color-normal-contrast);
}

.widget-component>.layout .rect .widget-rect>.right {
    position: absolute;
    top: 0;
    right: 0;
    height: 100%;
    width: 12.5%;
    border-left: 1px dashed var(--color-normal-contrast);
}

.widget-component>.layout .rect .widget-rect>.horizontal {
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    z-index: 11;
    height: 1px;
    border-top: 1px dashed var(--color-normal-contrast);
    font-size: 0;
}

.widget-component>.layout .rect .widget-rect>.vertical {
    position: absolute;
    top: 0;
    left: 50%;
    bottom: 0;
    z-index: 11;
    width: 1px;
    border-left: 1px dashed var(--color-normal-contrast);
    font-size: 0;
}

.widget-component>.layout>.right>.line {
    --ui-prop-margin-left: 0;
    display: flex;
    justify-content: space-between;
}

.widget-component>.layout>.right>.line>.name {
    width: 60%;
}

.widget-component>.layout>.right>.inputs>.ui-prop {
    visibility: hidden;
    pointer-events: none;
}

.widget-component>.layout>.right>.inputs>.ui-prop[active] {
    visibility: visible;
    pointer-events: auto;
}

.widget-component .button-group {
    border: 1px solid var(--color-default-border-important);
    border-radius: 2px;
    overflow: hidden;
    display: flex;
    flex: 1;
    justify-content: space-between;
}

.widget-component .button-group .button {
    flex: 1;
    padding: 0 5px;
    text-align: center;
    font-size: 11px;
    border-right: 1px solid var(--color-default-border-important);
    cursor: pointer;
}

.widget-component .button-group .button:last-child {
    border-right: none;
}

.widget-component .button-group .button[active],
.widget-component .button-group .button:hover {
    color: var(--color-normal-contrast-weakest);
    background-color: var(--color-normal-fill-emphasis);
}

.widget-component .button-group .button[active] .icon .long,
.widget-component .button-group .button[active] .icon .short,
.widget-component .button-group .button:hover .icon .long,
.widget-component .button-group .button:hover .icon .short {
    background-color: var(--color-normal-contrast-weakest);
}

.widget-component .button-group .button .icon {
    width: 18px;
    height: 18px;
    margin: 1px auto 0 auto;
    font-size: 0;
    position: relative;
}

.widget-component .button-group .button .icon .line {
    position: absolute;
    z-index: 3;
}

.widget-component .button-group .button .icon .line.second {
    display: none;
}

.widget-component .button-group .button .icon .long {
    position: absolute;
    width: 12px;
    height: 4px;
    background-color: var(--color-normal-contrast-weakest);
}

.widget-component .button-group .button .icon .short {
    position: absolute;
    width: 7px;
    height: 4px;
    background-color: var(--color-normal-contrast-weakest);
}

.widget-component .button-group .button .left.bottom {
    transform: rotate(-90deg);
}

.widget-component .button-group .button .left .line {
    left: 0;
    top: 0;
    height: 100%;
    border-left: 1px dashed var(--color-focus-border);
}

.widget-component .button-group .button .left .long {
    left: 2px;
    top: 4px;
}

.widget-component .button-group .button .left .short {
    left: 2px;
    top: 11px;
}

.widget-component .button-group .button .center.middle {
    transform: rotate(-90deg);
}

.widget-component .button-group .button .center .line {
    left: 9px;
    top: 0;
    height: 100%;
    border-left: 1px dashed var(--color-focus-border);
}

.widget-component .button-group .button .center .long {
    left: 4px;
    top: 4px;
}

.widget-component .button-group .button .center .short {
    left: 6px;
    top: 11px;
}

.widget-component .button-group .button .right.top {
    transform: rotate(-90deg);
}

.widget-component .button-group .button .right .line {
    right: 0;
    top: 0;
    height: 100%;
    border-left: 1px dashed var(--color-focus-border);
}

.widget-component .button-group .button .right .long {
    right: 2px;
    top: 4px;
}

.widget-component .button-group .button .right .short {
    right: 2px;
    top: 11px;
}

.widget-component .button-group .button .horizontal.vertical {
    transform: rotate(-90deg);
}

.widget-component .button-group .button .horizontal .line {
    left: 0;
    top: 0;
    height: 100%;
    border-left: 1px dashed var(--color-focus-border);
}

.widget-component .button-group .button .horizontal .line.second {
    display: block;
    left: unset;
    right: 0;
    top: 0;
}

.widget-component .button-group .button .horizontal .long {
    left: 2px;
    right: 2px;
    top: 4px;
    width: auto;
}

.widget-component .button-group .button .horizontal .short {
    left: 2px;
    right: 2px;
    top: 11px;
    width: auto;
}

.widget-component .direction>.name {
    display: inline-block;
}

.widget-component .direction>.icon {
    float: right;
    font-size: 10px;
    margin-right: 2px;
}

.widget-component .direction>.icon>ui-icon:hover {
    color: var(--color-warn-fill);
}

.widget-component .direction>.icon>.lock {
    color: var(--color-warn-fill);
}
</style>
<div id="app"></div>
`;
const excludeList = ['uuid', 'name', 'enabled', '_name', '_objFlags', '__scriptAsset', 'node', '_enabled', '__prefab', 'target', 'isAlignTop', 'isAlignBottom', 'isAlignLeft', 'isAlignRight', 'isAlignVerticalCenter', 'isAlignHorizontalCenter', 'isStretchWidth', 'isStretchHeight', 'top', 'editorTop', 'bottom', 'editorBottom', 'left', 'editorLeft', 'right', 'editorRight', 'horizontalCenter', 'editorHorizontalCenter', 'verticalCenter', 'editorVerticalCenter', 'isAbsoluteTop', 'isAbsoluteBottom', 'isAbsoluteLeft', 'isAbsoluteRight', 'isAbsoluteHorizontalCenter', 'isAbsoluteVerticalCenter', 'alignMode', 'alignFlags', '_alignFlags', '_target', '_left', '_right', '_top', '_bottom', '_horizontalCenter', '_verticalCenter', '_isAbsLeft', '_isAbsRight', '_isAbsTop', '_isAbsBottom', '_isAbsHorizontalCenter', '_isAbsVerticalCenter', '_originalWidth', '_originalHeight', '_alignMode', '_lockFlags'];
// Used to determine if the value is locked
const LockFlags = {
    top: 1 << 0,
    middle: 1 << 1,
    bottom: 1 << 2,
    left: 1 << 3,
    center: 1 << 4,
    right: 1 << 5,
};
exports.$ = {
    app: '#app',
};
exports.methods = {
    getObjectByKey(target, key) {
        let params = [];
        if (typeof key === 'string') {
            params = key.split('.');
        } else if (key instanceof Array) {
            params = key;
        }
        if (params.length > 0) {
            const value = params.shift();
            return this.getObjectByKey(target[value], params);
        } else {
            return target;
        }
    },
    getDimensionHorizontal() {
        const {
            isAlignLeft, isAlignRight, isAlignHorizontalCenter,
        } = this.dump.value;

        let dimension = '';

        if (isAlignLeft.value) {
            dimension = 'left';
        }
        if (isAlignRight.value) {
            dimension = 'right';
        }
        if (isAlignLeft.value && isAlignRight.value) {
            dimension = 'stretch';
        }
        if (isAlignHorizontalCenter.value) {
            dimension = 'center';
        }

        return dimension;
    },
    getDimensionVertical() {
        const {
            isAlignTop, isAlignBottom, isAlignVerticalCenter,
        } = this.dump.value;

        let dimension = '';

        if (isAlignTop.value) {
            dimension = 'top';
        }
        if (isAlignBottom.value) {
            dimension = 'bottom';
        }
        if (isAlignTop.value && isAlignBottom.value) {
            dimension = 'stretch';
        }
        if (isAlignVerticalCenter.value) {
            dimension = 'middle';
        }
        return dimension;
    },
    isInvalid(key) {
        if (Array.isArray(this.dump.value[key].values)) {
            return this.dump.value[key].values.some((value) => value !== this.dump.value[key].value);
        }

        return false;
    },
    update() {
        for (const key in uiElements) {
            const element = uiElements[key];
            if (typeof element.update === 'function') {
                element.update.call(this);
            }
        }
    },
    change(key, newValue) {
        this.dump.value[key].value = newValue;
        this.$refs.summitProp.dump = this.dump.value[key];

        if ('values' in this.dump.value[key]) {
            this.dump.value[key].values.forEach((_, index) => {
                this.dump.value[key].values[index] = newValue;
            });
        }

        this.$refs.summitProp.dispatch('change-dump');
    },
    snapshot() {
        // next tick snapshot
        setTimeout(() => {
            this.$refs.summitProp.dispatch('confirm-dump');
        });
    },

    getUnit(type) {
        const data = this.dump.value;

        switch (type) {
            case 'editorTop':
                return data.isAbsoluteTop.value ? 'px' : '%';
            case 'editorBottom':
                return data.isAbsoluteBottom.value ? 'px' : '%';
            case 'editorLeft':
                return data.isAbsoluteLeft.value ? 'px' : '%';
            case 'editorRight':
                return data.isAbsoluteRight.value ? 'px' : '%';
            case 'editorHorizontalCenter':
                return data.isAbsoluteHorizontalCenter.value ? 'px' : '%';
            case 'editorVerticalCenter':
                return data.isAbsoluteVerticalCenter.value ? 'px' : '%';
            default:
                break;
        }
    },

    changeUnit(type) {
        function update(dump, force) {
            if (force !== true && dump === this.dump) {
                return;
            }
            const value = dump.value;
            switch (type) {
                case 'editorTop':
                    value.isAbsoluteTop.value = !value.isAbsoluteTop.value;

                    if ('values' in value.isAbsoluteTop) {
                        value.isAbsoluteTop.values.forEach((val, index) => {
                            value.isAbsoluteTop.values[index] = value.isAbsoluteTop.value;
                        });
                    }

                    return { path: 'isAbsoluteTop', dump: value.isAbsoluteTop };
                case 'editorBottom':
                    value.isAbsoluteBottom.value = !value.isAbsoluteBottom.value;

                    if ('values' in value.isAbsoluteBottom) {
                        value.isAbsoluteBottom.values.forEach((val, index) => {
                            value.isAbsoluteBottom.values[index] = value.isAbsoluteBottom.value;
                        });
                    }

                    return { path: 'isAbsoluteBottom', dump: value.isAbsoluteBottom };
                case 'editorLeft':
                    value.isAbsoluteLeft.value = !value.isAbsoluteLeft.value;

                    if ('values' in value.isAbsoluteLeft) {
                        value.isAbsoluteLeft.values.forEach((val, index) => {
                            value.isAbsoluteLeft.values[index] = value.isAbsoluteLeft.value;
                        });
                    }

                    return { path: 'isAbsoluteLeft', dump: value.isAbsoluteLeft };
                case 'editorRight':
                    value.isAbsoluteRight.value = !value.isAbsoluteRight.value;

                    if ('values' in value.isAbsoluteRight) {
                        value.isAbsoluteRight.values.forEach((val, index) => {
                            value.isAbsoluteRight.values[index] = value.isAbsoluteRight.value;
                        });
                    }

                    return { path: 'isAbsoluteRight', dump: value.isAbsoluteRight };
                case 'editorHorizontalCenter':
                    value.isAbsoluteHorizontalCenter.value = !value.isAbsoluteHorizontalCenter.value;

                    if ('values' in value.isAbsoluteHorizontalCenter) {
                        value.isAbsoluteHorizontalCenter.values.forEach((val, index) => {
                            value.isAbsoluteHorizontalCenter.values[index] = value.isAbsoluteHorizontalCenter.value;
                        });
                    }

                    return { path: 'isAbsoluteHorizontalCenter', dump: value.isAbsoluteHorizontalCenter };
                case 'editorVerticalCenter':
                    value.isAbsoluteVerticalCenter.value = !value.isAbsoluteVerticalCenter.value;

                    if ('values' in value.isAbsoluteVerticalCenter) {
                        value.isAbsoluteVerticalCenter.values.forEach((val, index) => {
                            value.isAbsoluteVerticalCenter.values[index] = value.isAbsoluteVerticalCenter.value;
                        });
                    }

                    return { path: 'isAbsoluteVerticalCenter', dump: value.isAbsoluteVerticalCenter };
                default:
                    break;
            }
        }
        const { dump } = update(this.dump, true);
        this.$refs.summitProp.dump = dump;
        this.$refs.summitProp.dispatch('change-dump');
        this.snapshot();
    },

    select(event) {

        if (!event.path) {
            event.path = event.composedPath();
        }

        // Handling through delegated events
        const button = event.path.find((element) => element && element.classList && element.classList.contains('button'));

        if (!button) {
            return;
        }

        const dimension = button.getAttribute('dimension');

        let horizontal;
        let vertical;

        switch (dimension) {
            case 'horizontal':
                horizontal = {
                    isAlignLeft: {
                        value: false,
                    },
                    isAlignRight: {
                        value: false,
                    },
                    isAlignHorizontalCenter: {
                        value: false,
                    },
                };
                break;
            case 'left':
                horizontal = {
                    isAlignLeft: {
                        value: true,
                    },
                    isAlignRight: {
                        value: false,
                    },
                    isAlignHorizontalCenter: {
                        value: false,
                    },
                };
                break;
            case 'center':
                horizontal = {
                    isAlignLeft: {
                        value: false,
                    },
                    isAlignRight: {
                        value: false,
                    },
                    isAlignHorizontalCenter: {
                        value: true,
                    },
                };
                break;
            case 'right':
                horizontal = {
                    isAlignLeft: {
                        value: false,
                    },
                    isAlignRight: {
                        value: true,
                    },
                    isAlignHorizontalCenter: {
                        value: false,
                    },
                };
                break;
            case 'h-stretch':
                horizontal = {
                    isAlignLeft: {
                        value: true,
                    },
                    isAlignRight: {
                        value: true,
                    },
                    isAlignHorizontalCenter: {
                        value: false,
                    },
                };
                break;
            case 'vertical':
                vertical = {
                    isAlignTop: {
                        value: false,
                    },
                    isAlignVerticalCenter: {
                        value: false,
                    },
                    isAlignBottom: {
                        value: false,
                    },
                };
                break;
            case 'top':
                vertical = {
                    isAlignTop: {
                        value: true,
                    },
                    isAlignVerticalCenter: {
                        value: false,
                    },
                    isAlignBottom: {
                        value: false,
                    },
                };
                break;
            case 'middle':
                vertical = {
                    isAlignTop: {
                        value: false,
                    },
                    isAlignVerticalCenter: {
                        value: true,
                    },
                    isAlignBottom: {
                        value: false,
                    },
                };
                break;
            case 'bottom':
                vertical = {
                    isAlignTop: {
                        value: false,
                    },
                    isAlignVerticalCenter: {
                        value: false,
                    },
                    isAlignBottom: {
                        value: true,
                    },
                };
                break;
            case 'v-stretch':
                vertical = {
                    isAlignTop: {
                        value: true,
                    },
                    isAlignVerticalCenter: {
                        value: false,
                    },
                    isAlignBottom: {
                        value: true,
                    },
                };
                break;
            default:
                break;
        }

        const dump = this.dump;
        if (horizontal) {
            if (dump.value.isAlignLeft.value !== horizontal.isAlignLeft.value || !this.isHorizontalAlignValid) {
                dump.value.isAlignLeft.value = horizontal.isAlignLeft.value;
                this.$refs.summitProp.dump = dump.value.isAlignLeft;

                if ('values' in dump.value.isAlignLeft) {
                    dump.value.isAlignLeft.values.forEach((val, index) => {
                        dump.value.isAlignLeft.values[index] = dump.value.isAlignLeft.value;
                    });
                }

                this.$refs.summitProp.dispatch('change-dump');
            }
            if (dump.value.isAlignRight.value !== horizontal.isAlignRight.value || !this.isHorizontalAlignValid) {
                dump.value.isAlignRight.value = horizontal.isAlignRight.value;
                this.$refs.summitProp.dump = dump.value.isAlignRight;

                if ('values' in dump.value.isAlignRight) {
                    dump.value.isAlignRight.values.forEach((val, index) => {
                        dump.value.isAlignRight.values[index] = dump.value.isAlignRight.value;
                    });
                }

                this.$refs.summitProp.dispatch('change-dump');
            }
            if (dump.value.isAlignHorizontalCenter.value !== horizontal.isAlignHorizontalCenter.value || !this.isHorizontalAlignValid) {
                dump.value.isAlignHorizontalCenter.value = horizontal.isAlignHorizontalCenter.value;
                this.$refs.summitProp.dump = dump.value.isAlignHorizontalCenter;

                if ('values' in dump.value.isAlignHorizontalCenter) {
                    dump.value.isAlignHorizontalCenter.values.forEach((val, index) => {
                        dump.value.isAlignHorizontalCenter.values[index] = dump.value.isAlignHorizontalCenter.value;
                    });
                }

                this.$refs.summitProp.dispatch('change-dump');
            }
            this.dimensionHorizontal = this.getDimensionHorizontal();
        }

        if (vertical) {
            if (dump.value.isAlignTop.value !== vertical.isAlignTop.value || !this.isVerticalAlignValid) {
                dump.value.isAlignTop.value = vertical.isAlignTop.value;
                this.$refs.summitProp.dump = dump.value.isAlignTop;

                if ('values' in dump.value.isAlignTop) {
                    dump.value.isAlignTop.values.forEach((val, index) => {
                        dump.value.isAlignTop.values[index] = dump.value.isAlignTop.value;
                    });
                }

                this.$refs.summitProp.dispatch('change-dump');
            }
            if (dump.value.isAlignVerticalCenter.value !== vertical.isAlignVerticalCenter.value || !this.isVerticalAlignValid) {
                dump.value.isAlignVerticalCenter.value = vertical.isAlignVerticalCenter.value;
                this.$refs.summitProp.dump = dump.value.isAlignVerticalCenter;

                if ('values' in dump.value.isAlignVerticalCenter) {
                    dump.value.isAlignVerticalCenter.values.forEach((val, index) => {
                        dump.value.isAlignVerticalCenter.values[index] = dump.value.isAlignVerticalCenter.value;
                    });
                }

                this.$refs.summitProp.dispatch('change-dump');
            }
            if (dump.value.isAlignBottom.value !== vertical.isAlignBottom.value || !this.isVerticalAlignValid) {
                dump.value.isAlignBottom.value = vertical.isAlignBottom.value;
                this.$refs.summitProp.dump = dump.value.isAlignBottom;

                if ('values' in dump.value.isAlignBottom) {
                    dump.value.isAlignBottom.values.forEach((val, index) => {
                        dump.value.isAlignBottom.values[index] = dump.value.isAlignBottom.value;
                    });
                }

                this.$refs.summitProp.dispatch('change-dump');
            }
            this.dimensionVertical = this.getDimensionVertical();
        }

        this.snapshot();
    },

    toggleLock(direction) {
        const isLock = this.isLock(direction);
        let directions = [direction];
        let lockValue = this.dump.value._lockFlags.value;
        const isStretchWidth = this.dump.value.isStretchWidth.value;
        const isStretchHeight = this.dump.value.isStretchHeight.value;

        const stretchWidth = ['left', 'right'];
        if (isStretchWidth && stretchWidth.includes(direction)) {
            directions = stretchWidth;
        }

        const stretchHeight = ['top', 'bottom'];
        if (isStretchHeight && stretchHeight.includes(direction)) {
            directions = stretchHeight;
        }

        directions.forEach((dir) => {
            const lockDirection = LockFlags[dir];
            if (isLock) {
                lockValue &= ~lockDirection;
            } else {
                lockValue |= lockDirection;
            }
        });
        // Submit data
        this.dump.value._lockFlags.value = lockValue;
        this.$refs.summitProp.dump = this.dump.value._lockFlags;

        if ('values' in this.dump.value._lockFlags) {
            this.dump.value._lockFlags.values.forEach((val, index) => {
                this.dump.value._lockFlags.values[index] = lockValue;
            });
        }

        this.$refs.summitProp.dispatch('change-dump');
        this.snapshot();
    },
    isLock(direction) {
        const lockValue = this.dump.value._lockFlags.value;
        const lockDirection = LockFlags[direction];
        return lockValue & lockDirection;
    },
    setLayout() {
        const rect = this.$this.getBoundingClientRect();

        this.layout ??= layout;

        if (rect.width) {
            if (rect.width > cssMediaWidth) {
                layout = this.layout = 'horizontal';
            } else {
                layout = this.layout = 'vertical';
            }
        }
    },
};
const uiElements = {
    baseProps: {
        ready() {
            this.$baseProps = this.$el && this.$el.querySelectorAll('ui-prop:not(.customProp)');
        },
        update() {
            if (!this.$baseProps) {
                uiElements.baseProps.ready.call(this);
            }
            this.$baseProps.forEach((element) => {
                const key = element.getAttribute('dump-key');
                const dump = this.getObjectByKey(this.dump.value, key);
                const isEmpty = element.getAttribute('empty');
                if (!isEmpty) {
                    const isShow = dump.visible;
                    if (isShow) {
                        element.render(dump);
                    }
                    element.style = isShow ? '' : 'display: none;';
                }
            });
        },
    },
    customProps: {
        update() {
            if (!this.$customProps) {
                this.$customProps = this.$el.querySelector('#customProps');
            }
            propUtils.updateCustomPropElements(this.$customProps, excludeList, this.dump, (element, prop) => {
                element.className = 'customProp';
                if (prop.dump.visible) {
                    element.render(prop.dump);
                }
                element.hidden = !prop.dump.visible;
            });
        },
    },
};
const template = /* html*/`
<div class="widget-component" :layout="layout">
    <!--TODO: don't hack-->
    <ui-prop ref="summitProp" style="display:none"></ui-prop>
    <div class="layout">
        <div class="rect">
            <div class="top" v-show="dimensionVertical==='top' || dimensionVertical==='stretch'">top</div>
            <div class="right" v-show="dimensionHorizontal==='right' || dimensionHorizontal==='stretch'">right</div>
            <div class="bottom" v-show="dimensionVertical==='bottom' || dimensionVertical==='stretch'">bottom</div>
            <div class="left" v-show="dimensionHorizontal==='left' || dimensionHorizontal==='stretch'">left</div>

            <div class="widget-rect">
                <div class="center" :top="dump.value.isAlignTop.value" :bottom="dump.value.isAlignBottom.value"
                    :left="dump.value.isAlignLeft.value" :right="dump.value.isAlignRight.value">
                    <ui-icon value="arrowsv" top></ui-icon>
                    <ui-icon value="arrowsv" right></ui-icon>
                    <ui-icon value="arrowsv" bottom></ui-icon>
                    <ui-icon value="arrowsv" left></ui-icon>
                </div>
                <div class="top" v-if="dump.value.isAlignTop.value">
                </div>
                <div class="bottom" v-if="dump.value.isAlignBottom.value">
                </div>
                <div class="left" v-if="dump.value.isAlignLeft.value">
                </div>
                <div class="right" v-if="dump.value.isAlignRight.value">
                </div>
                <div class="vertical" v-if="dump.value.isAlignHorizontalCenter.value"></div>
                <div class="horizontal" v-if="dump.value.isAlignVerticalCenter.value"></div>
            </div>
        </div>

        <div class="right">
            <div class="line">
                <ui-label>Horizontal Alignment</ui-label>
            </div>

            <div class="line">
                <div class="button-group" @click="select($event)">
                    <div class="button" dimension="horizontal" :active="isHorizontalAlignValid && dimensionHorizontal === ''">NONE</div>

                    <div class="button" dimension="left" :active="isHorizontalAlignValid && dimensionHorizontal === 'left'">
                        <widget-icon class="left" title="Left"></widget-icon>
                    </div>

                    <div class="button" dimension="center" :active="isHorizontalAlignValid && dimensionHorizontal === 'center'">
                        <widget-icon class="center" title="Center"></widget-icon>
                    </div>

                    <div class="button" dimension="right" :active="isHorizontalAlignValid && dimensionHorizontal === 'right'">
                        <widget-icon class="right" title="Right"></widget-icon>
                    </div>

                    <div class="button" dimension="h-stretch" :active="isHorizontalAlignValid && dimensionHorizontal === 'stretch'">
                        <widget-icon class="horizontal" title="Horizontal Stretch"></widget-icon>
                    </div>
                </div>
            </div>

            <div class="line inputs" v-if="dimensionHorizontal && isHorizontalAlignValid">
                <ui-prop empty="true" type="dump" dump-key="editorLeft" :active="isHorizontalAlignValid && dump.value.isAlignLeft.value">
                    <div class="direction" v-show="dump.value.isAlignLeft.value">
                        <span class="name">Left</span>
                        <div class="icon" title="Lock left value" @click="toggleLock('left')">
                            <ui-icon class="lock" value="lock" v-if="isLock('left')"></ui-icon>
                            <ui-icon value="unlock" v-else></ui-icon>
                        </div>
                    </div>
                    <ui-num-input tabindex="0" :unit="getUnit('editorLeft')" :invalid="isInvalid('editorLeft')"
                        :disabled="!dump.value.isAlignLeft.value" :value="dump.value.editorLeft.value"
                        @change="change('editorLeft', $event.target.value)" 
                        @confirm="snapshot()" 
                        @unit-click="changeUnit('editorLeft')"
                        v-show="dump.value.isAlignLeft.value">
                    </ui-num-input>
                </ui-prop>

                <ui-prop empty="true" type="dump" dump-key="editorHorizontalCenter"
                    :active="isHorizontalAlignValid && dump.value.isAlignHorizontalCenter.value">
                    <div class="direction" v-show="dump.value.isAlignHorizontalCenter.value">
                        <span class="name">Center</span>
                        <div class="icon" title="Lock center value" @click="toggleLock('center')">
                            <ui-icon class="lock" value="lock" v-if="isLock('center')"></ui-icon>
                            <ui-icon value="unlock" v-else></ui-icon>
                        </div>
                    </div>
                    <ui-num-input tabindex="0" :unit="getUnit('editorHorizontalCenter')"
                        v-show="dump.value.isAlignHorizontalCenter.value" :invalid="isInvalid('editorHorizontalCenter')"
                        :disabled="!dump.value.isAlignHorizontalCenter.value"
                        :value="dump.value.editorHorizontalCenter.value"
                        @change="change('editorHorizontalCenter', $event.target.value)"
                        @confirm="snapshot()" 
                        @unit-click="changeUnit('editorHorizontalCenter')"></ui-num-input>
                </ui-prop>

                <ui-prop empty="true" type="dump" dump-key="editorRight" :active="isHorizontalAlignValid && dump.value.isAlignRight.value">
                    <div class="direction" v-show="dump.value.isAlignRight.value">
                        <span class="name">Right</span>
                        <div class="icon" title="Lock right value" @click="toggleLock('right')">
                            <ui-icon class="lock" value="lock" v-if="isLock('right')"></ui-icon>
                            <ui-icon value="unlock" v-else></ui-icon>
                        </div>
                    </div>
                    <ui-num-input tabindex="0" :unit="getUnit('editorRight')" :invalid="isInvalid('editorRight')"
                        :disabled="!dump.value.isAlignRight.value" :value="dump.value.editorRight.value"
                        v-show="dump.value.isAlignRight.value"
                        @change="change('editorRight', $event.target.value)" 
                        @confirm="snapshot()" 
                        @unit-click="changeUnit('editorRight')">
                    </ui-num-input>
                </ui-prop>

            </div>

            <div class="line m20-t">
                <ui-label>Vertical Alignment</ui-label>
            </div>

            <div class="line">
                <div class="button-group" @click="select($event)">
                    <div class="button" dimension="vertical" :active="isVerticalAlignValid && dimensionVertical === ''">NONE</div>

                    <div class="button" dimension="top" :active="isVerticalAlignValid && dimensionVertical === 'top'">
                        <widget-icon class="top right" title="Top"></widget-icon>
                    </div>

                    <div class="button" dimension="middle" :active="isVerticalAlignValid && dimensionVertical === 'middle'">
                        <widget-icon class="middle center" title="Middle"></widget-icon>
                    </div>

                    <div class="button" dimension="bottom" :active="isVerticalAlignValid && dimensionVertical === 'bottom'">
                        <widget-icon class="bottom left" title="Bottom"></widget-icon>
                    </div>

                    <div class="button" dimension="v-stretch" :active="isVerticalAlignValid && dimensionVertical === 'stretch'">
                        <widget-icon class="vertical horizontal" title="Vertical Stretch"></widget-icon>
                    </div>
                </div>
            </div>

            <div class="line inputs" v-if="dimensionVertical && isVerticalAlignValid">
                <ui-prop empty="true" type="dump" dump-key="editorTop" :active="isVerticalAlignValid && dump.value.isAlignTop.value">
                    <div class="direction" v-show="dump.value.isAlignTop.value">
                        <span class="name">Top</span>
                        <div class="icon" title="Lock top value" @click="toggleLock('top')">
                            <ui-icon class="lock" value="lock" v-if="isLock('top')"></ui-icon>
                            <ui-icon value="unlock" v-else></ui-icon>
                        </div>
                    </div>
                    <ui-num-input tabindex="0" :unit="getUnit('editorTop')" :invalid="isInvalid('editorTop')"
                        :disabled="!dump.value.isAlignTop.value"
                        @change="change('editorTop', $event.target.value)" 
                        @confirm="snapshot()" 
                        :value="dump.value.editorTop.value" @unit-click="changeUnit('editorTop')"
                        v-show="dump.value.isAlignTop.value">
                    </ui-num-input>
                </ui-prop>

                <ui-prop empty="true" type="dump" dump-key="editorVerticalCenter"
                    :active="isVerticalAlignValid && dump.value.isAlignVerticalCenter.value">
                    <div class="direction" v-show="dump.value.isAlignVerticalCenter.value">
                        <span class="name">Middle</span>
                        <div class="icon" title="Lock middle value" @click="toggleLock('middle')">
                            <ui-icon class="lock" value="lock" v-if="isLock('middle')"></ui-icon>
                            <ui-icon value="unlock" v-else></ui-icon>
                        </div>
                    </div>
                    <ui-num-input tabindex="0" :unit="getUnit('editorVerticalCenter')"
                        :invalid="isInvalid('editorVerticalCenter')" :disabled="!dump.value.isAlignVerticalCenter.value"
                        @change="change('editorVerticalCenter', $event.target.value)"
                        @confirm="snapshot()" 
                        :value="dump.value.editorVerticalCenter.value" @unit-click="changeUnit('editorVerticalCenter')"
                        v-show="dump.value.isAlignVerticalCenter.value"></ui-num-input>
                </ui-prop>

                <ui-prop empty="true" type="dump" dump-key="editorBottom" :active="isVerticalAlignValid && dump.value.isAlignBottom.value">
                    <div class="direction" v-show="dump.value.isAlignBottom.value">
                        <span class="name">Bottom</span>
                        <div class="icon" title="Lock bottom value" @click="toggleLock('bottom')">
                            <ui-icon class="lock" value="lock" v-if="isLock('bottom')"></ui-icon>
                            <ui-icon value="unlock" v-else></ui-icon>
                        </div>
                    </div>
                    <ui-num-input tabindex="0" :unit="getUnit('editorBottom')" :invalid="isInvalid('editorBottom')"
                        :disabled="!dump.value.isAlignBottom.value" :value="dump.value.editorBottom.value"
                        @change="change('editorBottom', $event.target.value)" 
                        @confirm="snapshot()" 
                        @unit-click="changeUnit('editorBottom')"
                        v-show="dump.value.isAlignBottom.value">
                    </ui-num-input>
                </ui-prop>
            </div>
        </div>
    </div>

    <ui-prop type="dump" dump-key="target"></ui-prop>
    <ui-prop type="dump" dump-key="alignMode"></ui-prop>
    <!-- Render other data that is not taken over -->
    <div id="customProps"></div>
</div>
`;
const components = {
    'widget-icon': {
        template: `
        <div class="icon">
            <span class="line"></span>
            <span class="long"></span>
            <span class="short"></span>
            <span class="line second"></span>
        </div>
        `,
    },
};
const computed = {
    isHorizontalAlignValid() {
        return !(this.isInvalid('isAlignLeft') || this.isInvalid('isAlignRight') || this.isInvalid('isAlignHorizontalCenter'));
    },
    isVerticalAlignValid() {
        return !(this.isInvalid('isAlignTop') || this.isInvalid('isAlignBottom') || this.isInvalid('isAlignVerticalCenter'));
    },
};
exports.ready = function() {
    this.resizeObserver = new window.ResizeObserver((entries) => {
        window.requestAnimationFrame(() => {
            // avoid error: ResizeObserver loop limit exceeded
            if (!Array.isArray(entries) || !entries.length) {
                return;
            }

            this.setLayout();
        });
    });

    this.resizeObserver.observe(this.$this);

    for (const key in uiElements) {
        const element = uiElements[key];
        if (typeof element.ready === 'function') {
            element.ready.call(this);
        }
    }
};
exports.update = function(dump) {
    this.dump = dump;
    this.dimensionHorizontal = this.getDimensionHorizontal();
    this.dimensionVertical = this.getDimensionVertical();

    this.setLayout();

    if (!this.vm) {
        this.vm = new Vue({
            el: this.$.app,
            data: this,
            template,
            components,
            computed,
            methods: exports.methods,
        });
    }
    this.vm.update();
};
exports.close = function() {
    this.resizeObserver.unobserve(this.$this);
};
