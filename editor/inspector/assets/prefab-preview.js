'use strict';

exports.template = /* html */`
<ui-section header="i18n:ENGINE.inspector.preview.header" class="preview-section config no-padding" expand>
    <div class="preview">
        <div class="image">
            <canvas class="canvas"></canvas>
        </div>
    </div>
</ui-section>
`;

exports.style = /* css */`
    .preview-section {
        margin-top: 0px;
    }
    .preview { }
    .preview > .image {
        height: var(--inspector-footer-preview-height, 200px);
        overflow: hidden;
        display: flex;
        flex: 1;
    }
    .preview >.image > .canvas {
        flex: 1;
    }
`;


exports.$ = {
    container: '.preview',
    canvas: '.canvas',
    image: '.image',
};

async function callFunction(funcName, ...args) {
    return await Editor.Message.request('scene', 'call-preview-function', 'scene:prefab-preview', funcName, ...args);
}

const Elements = {
    preview: {
        ready() {
            const panel = this;

            let _isPreviewDataDirty = false;
            Object.defineProperty(panel, 'isPreviewDataDirty', {
                get() {
                    return _isPreviewDataDirty;
                },
                set(value) {
                    if (value !== _isPreviewDataDirty) {
                        _isPreviewDataDirty = value;
                        value && panel.refreshPreview();
                    }
                },
            });
            panel.$.canvas.addEventListener('mousedown', async (event) => {
                await callFunction('onMouseDown', { x: event.x, y: event.y, button: event.button });

                async function mousemove(event) {
                    await callFunction('onMouseMove', {
                        movementX: event.movementX,
                        movementY: event.movementY,
                    });

                    panel.isPreviewDataDirty = true;
                }

                async function mouseup(event) {
                    await callFunction('onMouseUp', {
                        x: event.x,
                        y: event.y,
                    });

                    document.removeEventListener('mousemove', mousemove);
                    document.removeEventListener('mouseup', mouseup);

                    panel.isPreviewDataDirty = false;
                }

                document.addEventListener('mousemove', mousemove);
                document.addEventListener('mouseup', mouseup);


                panel.isPreviewDataDirty = true;
            });

            panel.$.canvas.addEventListener('wheel', async (event) => {
                await callFunction('onMouseWheel', {
                    wheelDeltaY: event.wheelDeltaY,
                    wheelDeltaX: event.wheelDeltaX,
                });
                panel.isPreviewDataDirty = true;
            });


            const GlPreview = Editor._Module.require('PreviewExtends').default;
            panel.glPreview = new GlPreview('scene:prefab-preview', 'query-prefab-preview-data');

            function observer() {
                panel.isPreviewDataDirty = true;
            }

            panel.resizeObserver = new window.ResizeObserver(observer);
            panel.resizeObserver.observe(panel.$.image);
            observer();
        },
        async update() {
            const panel = this;

            if (!panel.$.canvas) {
                return;
            }

            await panel.glPreview.init({ width: panel.$.canvas.clientWidth, height: panel.$.canvas.clientHeight });
            await callFunction('setPrefab', panel.asset.uuid);
            this.isPreviewDataDirty = true;
        },
        close() {
            const panel = this;

            panel.resizeObserver.unobserve(panel.$.image);
        },
    },
};

exports.methods = {
    async refreshPreview() {
        const panel = this;

        // After await, the panel no longer exists
        if (!panel.$.canvas) {
            return;
        }

        const doDraw = async () => {
            try {
                const canvas = panel.$.canvas;
                const image = panel.$.image;

                const width = image.clientWidth;
                const height = image.clientHeight;
                if (canvas.width !== width || canvas.height !== height) {
                    canvas.width = width;
                    canvas.height = height;

                    await panel.glPreview.initGL(canvas, { width, height });
                    await panel.glPreview.resizeGL(width, height);
                }

                const info = await panel.glPreview.queryPreviewData({
                    width: canvas.width,
                    height: canvas.height,
                });

                panel.glPreview.drawGL(info);
            } catch (e) {
                console.warn(e);
            }
        };

        requestAnimationFrame(async () => {
            await doDraw();
            panel.isPreviewDataDirty = false;
        });
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

    // 如何多选就隐藏预览
    if (assetList.length > 1) {
        this.$.container.style.display = 'none';
    } else {
        this.$.container.style.display = 'block';
    }

    for (const prop in Elements) {
        const element = Elements[prop];
        if (element.update) {
            element.update.call(this);
        }
    }
};

exports.close = function() {
    for (const prop in Elements) {
        const element = Elements[prop];
        if (element.close) {
            element.close.call(this);
        }
    }
};
