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
    _container = null;

    _image = null;
    _canvas = null;

    _toolbar = null;
    _resetCamera = null;

    _resizeObserver = null;

    _observerBind = this._observer.bind(this);
    _onMouseDownBind = this._onMouseDown.bind(this);
    _onMouseWheelBind = this._onMouseWheel.bind(this);

    _onResetCameraBind = this._onResetCamera.bind(this);

    enabledResetCamera = true;

    /**
     * create
     *  image
     *    - toolbar
     *      - button:reset-camera
     *    - canvas
     * @param container - preview root
     * @private
     */
    _createElements(container) {
        this._container = container;

        this._image = document.createElement('div');
        this._image.classList.add('image');
        this._image.style = `
            height: var(--inspector-footer-preview-height, 200px);
            overflow: hidden;
            display: flex;
            flex: 1;
        `;
        this._container.appendChild(this._image);

        this._toolbar = document.createElement('div');
        this._toolbar.classList.add('toolbar');
        this._toolbar.style = `
            display: flex;
        `;
        this._image.appendChild(this._toolbar);

        if (this.enabledResetCamera) {
            this._resetCamera = document.createElement('ui-button');
            this._resetCamera.classList.add('reset-camera');
            this._resetCamera.setAttribute('type', 'icon');
            this._resetCamera.setAttribute('tooltip', 'i18n:ENGINE.inspector.preview.resetCameraView');
            this._resetCamera.style = `
                position: absolute;
                right: 10px;
                bottom: 10px;
            `;
            this._resetCamera.innerHTML = `<ui-icon value="reset"></ui-icon>`;
            this._toolbar.appendChild(this._resetCamera);
        }

        this._canvas = document.createElement('canvas');
        this._canvas.style = `
            flex: 1;
        `;
        this._canvas.classList.add('canvas');
        this._image.appendChild(this._canvas);
    }

    constructor(name, method, container) {
        this._gLPreviewConfig = {
            name: name,
            method: method,
        };
        this._createElements(container);
    }

    async callPreviewFunction(funcName, ...args) {
        try {
            const result = await Editor.Message.request('scene', 'call-preview-function', this._gLPreviewConfig.name, funcName, ...args);
            this.doRefreshDirty();
            return result;
        } catch (e) {
            console.error(e);
            return null;
        }
    }

    async init() {
        const GLPreview = Editor._Module.require('PreviewExtends').default;
        this._glPreview = new GLPreview(this._gLPreviewConfig.name, this._gLPreviewConfig.method);
        await this._glPreview.init({
            width: this._canvas.clientWidth,
            height: this._canvas.clientHeight,
        });
        this._resizeObserver = new window.ResizeObserver(this._observerBind);
        this._resizeObserver.observe(this._image);
        this._registerEventListener();

        await this._refresh();
    }

    doRefreshDirty() {
        this._observer();
        this._refresh();
    }

    close() {
        this._resizeObserver && this._resizeObserver.unobserve(this._image);
        cancelAnimationFrame(this._animationId);
        this._unregisterEventListener();
    }

    _registerEventListener() {
        this._resetCamera.addEventListener('click', this._onResetCameraBind);
        this._canvas.addEventListener('mousedown', this._onMouseDownBind);
        this._canvas.addEventListener('wheel', this._onMouseWheelBind);
    }

    _unregisterEventListener() {
        this._resetCamera.removeEventListener('click', this._onResetCameraBind);
        this._canvas.removeEventListener('mousedown', this._onMouseDownBind);
        this._canvas.removeEventListener('wheel', this._onMouseWheelBind);
    }

    _observer() {
        this._isDirty = true;
    }

    async _refresh() {
        if (this._isDirty) {
            try {
                this._isDirty = false;
                const canvas = this._canvas;
                const image = this._image;

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

    _onResetCamera() {
        this.callPreviewFunction('resetCameraView')
            .then(() => {
                this.doRefreshDirty();
            });
    }
}

module.exports = {
    hideElement,
    PreviewControl,
};
