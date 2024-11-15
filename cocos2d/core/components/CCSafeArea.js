/****************************************************************************
 Copyright (c) 2020 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
 worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
 not use Cocos Creator software for developing other software or tools that's
 used for developing games. You are not granted to publish, distribute,
 sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/

const Widget = require('./CCWidget');
const WidgetManager = require('../base-ui/CCWidgetManager');
/**
 * !#en
 * This component is used to adjust the layout of current node to respect the safe area of a notched mobile device such as the iPhone X.
 * It is typically used for the top node of the UI interaction area. For specific usage, refer to the official [example-cases/02_ui/16_safeArea/SafeArea.fire](https://github.com/cocos-creator/example-cases).
 *
 * The concept of safe area is to give you a fixed inner rectangle in which you can safely display content that will be drawn on screen.
 * You are strongly discouraged from providing controls outside of this area. But your screen background could embellish edges.
 *
 * This component internally uses the API `cc.sys.getSafeAreaRect();` to obtain the safe area of the current iOS or Android device,
 * and implements the adaptation by using the Widget component and set anchor.
 *
 * !#zh
 * 该组件会将所在节点的布局适配到 iPhone X 等异形屏手机的安全区域内，通常用于 UI 交互区域的顶层节点，具体用法可参考官方范例 [example-cases/02_ui/16_safeArea/SafeArea.fire](https://github.com/cocos-creator/example-cases)。
 *
 * 该组件内部通过 API `cc.sys.getSafeAreaRect();` 获取到当前 iOS 或 Android 设备的安全区域，并通过 Widget 组件实现适配。
 *
 * @class SafeArea
 * @extends Component
 */
var SafeArea = cc.Class({
    name: 'cc.SafeArea',
    extends: require('./CCComponent'),

    editor: CC_EDITOR && {
        help: 'i18n:COMPONENT.help_url.safe_area',
        menu: 'i18n:MAIN_MENU.component.ui/SafeArea',
        inspector: 'packages://inspector/inspectors/comps/safe-area.js',
        executeInEditMode: true,
        requireComponent: Widget,
    },

    onEnable () {
        this.updateArea();
        cc.view.on('canvas-resize', this.updateArea, this);
    },

    onDisable () {
        cc.view.off('canvas-resize', this.updateArea, this);
    },

    /**
     * !#en Adapt to safe area
     * !#zh 立即适配安全区域
     * @method updateArea
     * @example
     * let safeArea = this.node.addComponent(cc.SafeArea);
     * safeArea.updateArea();
     */
    updateArea () {
        // TODO Remove Widget dependencies in the future
        let widget = this.node?.getComponent(Widget);
        if (!widget) {
            return;
        }

        if (CC_EDITOR) {
            widget.top = widget.bottom = widget.left = widget.right = 0;
            widget.isAlignTop = widget.isAlignBottom = widget.isAlignLeft = widget.isAlignRight = true;
            return;
        }
        // IMPORTANT: need to update alignment to get the latest position
        widget.updateAlignment();
        let lastPos = this.node.position;
        let lastAnchorPoint = this.node.getAnchorPoint();
        //
        widget.isAlignTop = widget.isAlignBottom = widget.isAlignLeft = widget.isAlignRight = true;
        let screenWidth = cc.winSize.width, screenHeight = cc.winSize.height;
        let safeArea = cc.sys.getSafeAreaRect();
        widget.top = screenHeight - safeArea.y - safeArea.height;
        widget.bottom = safeArea.y;
        widget.left = safeArea.x;
        widget.right = screenWidth - safeArea.x - safeArea.width;
        widget.updateAlignment();
        // set anchor, keep the original position unchanged
        let curPos = this.node.position;
        let anchorX = lastAnchorPoint.x - (curPos.x - lastPos.x) / this.node.width;
        let anchorY = lastAnchorPoint.y - (curPos.y - lastPos.y) / this.node.height;
        this.node.setAnchorPoint(anchorX, anchorY);
        // IMPORTANT: restore to lastPos even if widget is not ALWAYS
        WidgetManager.add(widget);
    }
});

cc.SafeArea = module.exports = SafeArea;
