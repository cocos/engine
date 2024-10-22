/****************************************************************************
 Copyright (c) 2018 Xiamen Yaji Software Co., Ltd.

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

(function () {
    if (!(cc && cc.internal && cc.internal.EditBox)) {
        return;
    }

    const EditBox = cc.internal.EditBox;
    const KeyboardReturnType = EditBox.KeyboardReturnType;
    const InputMode = EditBox.InputMode;
    const InputFlag = EditBox.InputFlag;

    const worldMat = cc.mat4();

    function getInputType (type) {
        switch (type) {
            case InputMode.EMAIL_ADDR:
                return 'email';
            case InputMode.NUMERIC:
            case InputMode.DECIMAL:
                return 'number';
            case InputMode.PHONE_NUMBER:
                return 'phone';
            case InputMode.URL:
                return 'url';
            case InputMode.SINGLE_LINE:
            case InputMode.ANY:
            default:
                return 'text';
        }
    }

    function getKeyboardReturnType (type) {
        switch (type) {
            case KeyboardReturnType.DEFAULT:
            case KeyboardReturnType.DONE:
                return 'done';
            case KeyboardReturnType.SEND:
                return 'send';
            case KeyboardReturnType.SEARCH:
                return 'search';
            case KeyboardReturnType.GO:
                return 'go';
            case KeyboardReturnType.NEXT:
                return 'next';
        }
        return 'done';
    }

    const BaseClass = EditBox._EditBoxImpl;
    class JsbEditBoxImpl extends BaseClass {
        init (delegate) {
            if (!delegate) {
                cc.error('EditBox init failed');
                return;
            }
            this._delegate = delegate;
        }

        beginEditing () {
            const self = this;
            const delegate = this._delegate;
            const multiline = (delegate.inputMode === InputMode.ANY);
            const rect = this._getRect();
            this.setMaxLength(delegate.maxLength);

            let inputTypeString = getInputType(delegate.inputMode);
            if (delegate.inputFlag === InputFlag.PASSWORD) {
                inputTypeString = 'password';
            }

            function onConfirm (res) {
                delegate._editBoxEditingReturn();
            }

            function onInput (res) {
                if (res.value.length > self._maxLength) {
                    res.value = res.value.slice(0, self._maxLength);
                }

                if (delegate.string !== res.value) {
                    delegate._editBoxTextChanged(res.value);
                }
            }

            function onComplete (res) {
                self.endEditing();
            }

            jsb.inputBox.onInput(onInput);
            jsb.inputBox.onConfirm(onConfirm);
            jsb.inputBox.onComplete(onComplete);

            if (!cc.sys.isMobile) {
                delegate._hideLabels();
            }

            const editLabel = delegate.textLabel;
            jsb.inputBox.show({
                defaultValue: delegate.string,
                maxLength: self._maxLength,
                multiple: multiline,
                confirmHold: false,
                confirmType: getKeyboardReturnType(delegate.returnType),
                inputType: inputTypeString,
                originX: rect.x,
                originY: rect.y,
                width: rect.width,
                height: rect.height,
                isBold: editLabel.isBold,
                isItalic: editLabel.isItalic,
                isUnderline: editLabel.isUnderline,
                underlineColor: 0x00000000/* Black */,
                fontSize: /**number */editLabel.fontSize,
                fontColor: /**number */editLabel.color.toRGBValue(),
                backColor: 0x00ffffff/*White*/,
                backgroundColor: delegate.placeholderLabel.color.toRGBValue(),
                textAlignment: /*left = 0, center = 1, right = 2*/editLabel.horizontalAlign,
            });
            this._editing = true;
            delegate._editBoxEditingDidBegan();
        }

        endEditing () {
            this._editing = false;
            if (!cc.sys.isMobile) {
                this._delegate._showLabels();
            }
            jsb.inputBox.offConfirm();
            jsb.inputBox.offInput();
            jsb.inputBox.offComplete();
            jsb.inputBox.hide();
            this._delegate._editBoxEditingDidEnded();
        }

        setMaxLength (maxLength) {
            if (!isNaN(maxLength)) {
                if (maxLength < 0) {
                    //we can't set Number.MAX_VALUE to input's maxLength property
                    //so we use a magic number here, it should works at most use cases.
                    maxLength = 65535;
                }
                this._maxLength = maxLength;
            }
        }

        _getRect () {
            const node = this._delegate.node;
            let viewScaleX = cc.view.getScaleX();
            let viewScaleY = cc.view.getScaleY();
            const dpr = jsb.device.getDevicePixelRatio() || 1;
            node.getWorldMatrix(worldMat);

            const transform = node._uiProps.uiTransformComp;
            const vec3 = cc.v3();
            let width = 0;
            let height = 0;
            if (transform) {
                const contentSize = transform.contentSize;
                const anchorPoint = transform.anchorPoint;
                width = contentSize.width;
                height = contentSize.height;
                vec3.x = -anchorPoint.x * width;
                vec3.y = -anchorPoint.y * height;
            }

            const translate = new cc.Mat4();
            cc.Mat4.fromTranslation(translate, vec3);
            cc.Mat4.multiply(worldMat, translate, worldMat);

            viewScaleX /= dpr;
            viewScaleY /= dpr;

            const finalScaleX = worldMat.m00 * viewScaleX;
            const finaleScaleY = worldMat.m05 * viewScaleY;

            const viewportRect = cc.view.getViewportRect();
            const offsetX = viewportRect.x / dpr;
                const offsetY = viewportRect.y / dpr;
            return {
                x: worldMat.m12 * viewScaleX + offsetX,
                y: worldMat.m13 * viewScaleY + offsetY,
                width: width * finalScaleX,
                height: height * finaleScaleY,
            };
        }
    }
    EditBox._EditBoxImpl = JsbEditBoxImpl;
}());
