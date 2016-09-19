/****************************************************************************
 Copyright (c) 2013-2016 Chukong Technologies Inc.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and  non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Chukong Aipu reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/

/**
 * !#en The toggle component is a CheckBox, when it used together with a ToggleGroup, it
 * could be treated as a RadioButton.
 * !#zh Toggle 是一个 CheckBox，当它和 ToggleGroup 一起使用的时候，可以变成 RadioButton。
 */
var Toggle = cc.Class({
    name: 'cc.Toggle',
    extends: require('./CCButton.js'),
    editor: CC_EDITOR && {
        menu: 'i18n:MAIN_MENU.component.ui/Toggle',
        help: 'i18n:COMPONENT.help_url.toggle',
        inspector: 'packages://inspector/inspectors/comps/toggle.js',
    },

    ctor: function () {
        this._checkmarkSprite = null;
    },

    properties: {
        /**
         * !#en When this value is true, the check mark target will be active, otherwise
         * the check mark target will be inactive.
         * !#zh 如果这个设置为 true，则 check mark 节点会处于 active 状态，否则处于 inactive 状态。
         * @property {Boolean} isChecked
         */
        isChecked: {
            default: true,
            tooltip: 'i18n:COMPONENT.toggle.isChecked',
            notify: function() {
                this._updateCheckMark();
            }
        },

        /**
         * !#en The toggle group which the toggle belongs to, when it is null, the toggle is a CheckBox.
         * Otherwise, the toggle is a RadioButton.
         * !#zh Toggle 所属的 ToggleGroup，这个属性是可选的。如果这个属性为 null，则 Toggle 是一个 CheckBox，
         * 否则，Toggle 是一个 RadioButton。
         * @property {cc.ToggleGroup} toggleGroup
         */
        toggleGroup: {
            default: null,
            tooltip: 'i18n:COMPONENT.toggle.toggleGroup',
            type: cc.ToggleGroup
        },

        /**
         * !#en The image node used for the checkmark.
         * !#zh Toggle 处于选中状态时显示的图片, 这里需要一个包含该图片的节点。
         * @property {cc.Node} checkMark
         */
        checkMark: {
            default: null,
            type: cc.Node,
            tooltip: 'i18n:COMPONENT.toggle.checkMark',
            notify: function () {
                this._applyCheckmarkTarget();
            }
        },

        /**
         * !#en If Toggle is clicked, it will trigger event's handler
         * !#zh Toggle 按钮的点击事件列表。
         * @property {Component.EventHandler[]} checkEvents
         */
        checkEvents: {
            default: [],
            tooltip: 'i18n:COMPONENT.toggle.checkEvents',
            type: cc.Component.EventHandler
        },

        _resizeToTarget: {
            animatable: false,
            set: function (value) {
                if(value) {
                    this._resizeNodeToTargetNode();
                }
            }
        },

    },

    __preload: function () {
        this._super();
        this._applyCheckmarkTarget();
        this._registerToggleEvent();
    },

    onEnable: function () {
        this._super();
        if(this.toggleGroup) {
            this.toggleGroup.addToggle(this);
        }
    },

    onDisable: function () {
        this._super();
        if(this.toggleGroup) {
            this.toggleGroup.removeToggle(this);
        }
    },

    _applyCheckmarkTarget: function () {
        this._checkmarkSprite = this._getTargetSprite(this.checkMark);
    },

    _updateCheckMark: function () {
        if(this.checkMark && this.enabledInHierarchy) {
            this.checkMark.active = !!this.isChecked;
        }
    },

    _updateDisabledState: function () {
        this._super();

        if(this._checkmarkSprite) {
            this._checkmarkSprite._sgNode.setState(0);
        }
        if(this.enableAutoGrayEffect) {
            if(this._checkmarkSprite && !this.interactable) {
                this._checkmarkSprite._sgNode.setState(1);
            }
        }
    },

    _registerToggleEvent: function () {
        var event = new cc.Component.EventHandler();
        event.target = this.node;
        event.component = 'cc.Toggle';
        event.handler = 'toggle';
        this.clickEvents.push(event);

    },

    toggle: function (event) {
        if(this.toggleGroup && this.isChecked) {
            if(!this.toggleGroup.allowSwitchOff) {
                return;
            }
        }
        this.isChecked = !this.isChecked;

        this._updateCheckMark();

        this._emitToggleEvents(event);

        if(this.toggleGroup) {
            this.toggleGroup.updateToggles(this);
        }
    },

    _emitToggleEvents: function (event) {
        this.node.emit('toggle-event', this);
        if(this.checkEvents) {
            cc.Component.EventHandler.emitEvents(this.checkEvents, event, this);
        }
    },

    /**
     * !#en Make the toggle button checked.
     * !#zh 使 toggle 按钮处于选中状态
     * @method check
     */
    check: function () {
        if(this.toggleGroup && this.isChecked) {
            if(!this.toggleGroup.allowSwitchOff) {
                return;
            }
        }

        this.isChecked = true;
        this.node.emit('toggle-event', this);

        if(this.toggleGroup) {
            this.toggleGroup.updateToggles(this);
        }
    },

    /**
     * !#en Make the toggle button unchecked.
     * !#zh 使 toggle 按钮处于未选中状态
     * @method uncheck
     */
    uncheck: function () {
        if(this.toggleGroup && this.isChecked) {
            if(!this.toggleGroup.allowSwitchOff) {
                return;
            }
        }

        this.isChecked = false;

        this.node.emit('toggle-event', this);
    }


});

cc.Toggle = module.exports = Toggle;
