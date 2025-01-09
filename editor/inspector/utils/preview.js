/**
 * Hide or show an HTML element based on the value.
 * 根据值隐藏或显示 HTML 元素。
 *
 * @param {HTMLElement} element - The HTML element to hide or show. 要隐藏或显示的 HTML 元素。
 * @param {boolean} value - If true, the element is hidden; otherwise, it is shown. 如果为 true，则隐藏元素；否则显示。
 */
function hideElement(element, value) {
    element.style.display = value ? 'none' : 'block';
}

/**
 * 处理展示预览以及操作预览面板的辅助类
 * Helper classes that handle the Showcase Preview and Manipulation Preview panels
 */
class PreviewControl {
    _gLPreviewConfig = {
        name: '',
        method: '',
    };

    _animationId = -1;
    _isDirty = false;
    _glPreview = null;

    // html element
    _canvasElement = null;
    _imageElement = null;

    _resizeObserver = null;

    _observerBind = this._observer.bind(this);
    _onMouseDownBind = this._onMouseDown.bind(this);
    _onMouseWheelBind = this._onMouseWheel.bind(this);

    constructor(name, method, canvas, image) {
        this._canvasElement = canvas;
        this._imageElement = image;
        this._gLPreviewConfig = {
            name: name,
            method: method,
        };
    }

    async callPreviewFunction(funcName, ...args) {
        return await Editor.Message.request('scene', 'call-preview-function', this._gLPreviewConfig.name, funcName, ...args);
    }

    async init() {
        const GLPreview = Editor._Module.require('PreviewExtends').default;
        this._glPreview = new GLPreview(this._gLPreviewConfig.name, this._gLPreviewConfig.method);
        await this._glPreview.init({
            width: this._canvasElement.clientWidth,
            height: this._canvasElement.clientHeight,
        });
        this._resizeObserver = new window.ResizeObserver(this._observerBind);
        this._resizeObserver.observe(this._imageElement);
        this._registerEventListener();

        await this._refresh();
    }

    doRefreshDirty() {
        this._observer();
        this._refresh();
    }

    close() {
        this._resizeObserver && this._resizeObserver.unobserve(this._imageElement);
        cancelAnimationFrame(this._animationId);
        this._unregisterEventListener();
    }

    _registerEventListener() {
        this._canvasElement.addEventListener('mousedown', this._onMouseDownBind);
        this._canvasElement.addEventListener('wheel', this._onMouseWheelBind);
    }

    _unregisterEventListener() {
        this._canvasElement.removeEventListener('mousedown', this._onMouseDownBind);
        this._canvasElement.removeEventListener('wheel', this._onMouseWheelBind);
    }

    _observer() {
        this._isDirty = true;
    }

    async _refresh() {
        if (this._isDirty) {
            try {
                this._isDirty = false;
                const canvas = this._canvasElement;
                const image = this._imageElement;

                const width = image.clientWidth;
                const height = image.clientHeight;
                if (canvas.width !== width || canvas.height !== height) {
                    canvas.width = width;
                    canvas.height = height;

                    await this._glPreview.initGL(canvas, {
                        width, height,
                    });
                    await this._glPreview.resizeGL(width, height);
                }

                const info = await this._glPreview.queryPreviewData({
                    width: canvas.width,
                    height: canvas.height,
                });

                this._glPreview.drawGL(info);
            } catch (e) {
                console.warn(e);
            }
        }

        cancelAnimationFrame(this._animationId);
        this._animationId = requestAnimationFrame(() => {
            this._refresh();
        });
    }

    async _onMouseDown(event) {
        await this.callPreviewFunction('onMouseDown', {
            x: event.x,
            y: event.y,
            button: event.button,
        });

        const mousemove = async (event) => {
            await this.callPreviewFunction('onMouseMove', {
                movementX: event.movementX,
                movementY: event.movementY,
            });

            this._isDirty = true;
        };

        const mouseup = async (event) => {
            await this.callPreviewFunction('onMouseUp', {
                x: event.x,
                y: event.y,
            });

            document.removeEventListener('mousemove', mousemove);
            document.removeEventListener('mouseup', mouseup);

            this._isDirty = false;
        };

        document.addEventListener('mousemove', mousemove);
        document.addEventListener('mouseup', mouseup);

        this._isDirty = true;
    }

    async _onMouseWheel(event) {
        await this.callPreviewFunction('onMouseWheel', {
            wheelDeltaY: 0 - event.deltaY,
            wheelDeltaX: 0 - event.deltaX,
        });

        this._isDirty = true;
    }
}

module.exports = {
    hideElement,
    PreviewControl,
};
