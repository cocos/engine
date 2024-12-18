'use strict';


exports.template = /* html */`
<ui-section header="i18n:ENGINE.inspector.preview.header" class="preview-section config no-padding" expand>
    <div class="preview">
        <div class="info">
            <ui-label value="Vertices:0" class="vertices"></ui-label>
            <ui-label value="Triangles:0" class="triangles"></ui-label>
            <div class="select-box">
                <ui-select class="preview-channel">
                </ui-select>
                <ui-select class="preview-type">
                </ui-select>
            </div>
            <div>
                <ui-label value="" class="minPosLabel"></ui-label>
            </div>
            <div>
                <ui-label value="" class="maxPosLabel"></ui-label>
            </div>
        </div>
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
.preview {
    border-top: 1px solid var(--color-normal-border);
}
.preview > .info {
    padding: 4px 4px 0 4px;
}
.preview > .info > ui-label {
    margin-right: 6px;
}
.preview > .image {
    height: var(--inspector-footer-preview-height, 200px);
    overflow: hidden;
    display: flex;
    flex: 1;
}
.preview >.image > .canvas {
    flex: 1;
}
.select-box {
    float: right;
}
.preview-channel {
    display: none;
}
.preview-channel.show {
    display: inline-block;
}
`;

exports.$ = {
    container: '.preview',
    vertices: '.vertices',
    triangles: '.triangles',
    image: '.image',
    canvas: '.canvas',
    minPosLabel: '.minPosLabel',
    maxPosLabel: '.maxPosLabel',
    previewType: '.preview-type',
    previewChannel: '.preview-channel',
};

async function callMeshPreviewFunction(funcName, ...args) {
    return await Editor.Message.request('scene', 'call-preview-function', 'scene:mesh-preview', funcName, ...args);
}
const previewSelectType = {
    shaded: 'Shaded',
    uv: 'UV Layout',
};
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

            panel.$.previewType.innerHTML = Object.values(previewSelectType).map(v => `<option value="${v}">${v}</option>`).join('');
            panel.$.previewType.value = previewSelectType.shaded;

            panel.$.previewType.addEventListener('confirm', (event) => {
                const value = event.target.value;
                if (value === previewSelectType.uv) {
                    panel.$.previewChannel.classList.add('show');
                    panel.$.previewChannel.value = 0;
                } else {
                    panel.$.previewChannel.classList.remove('show');
                }
                panel.isPreviewDataDirty = true;
            });
            panel.$.previewChannel.addEventListener('confirm', () => {
                panel.isPreviewDataDirty = true;
            });

            panel.$.canvas.addEventListener('mousedown', async (event) => {
                // Non-model previews do not respond to events
                if (panel.$.previewType.value !== previewSelectType.shaded) { return; }
                await callMeshPreviewFunction('onMouseDown', { x: event.x, y: event.y, button: event.button });

                async function mousemove(event) {
                    await callMeshPreviewFunction('onMouseMove', {
                        movementX: event.movementX,
                        movementY: event.movementY,
                    });

                    panel.isPreviewDataDirty = true;
                }

                async function mouseup(event) {
                    await callMeshPreviewFunction('onMouseUp', {
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
                // Non-model previews do not respond to events
                if (panel.$.previewType.value !== previewSelectType.shaded) { return; }
                await callMeshPreviewFunction('onMouseWheel', {
                    wheelDeltaY: event.wheelDeltaY,
                    wheelDeltaX: event.wheelDeltaX,
                });
                panel.isPreviewDataDirty = true;
            });

            const GlPreview = Editor._Module.require('PreviewExtends').default;
            panel.glPreview = new GlPreview('scene:mesh-preview', 'query-mesh-preview-data');

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

            // reset
            panel.$.previewType.value = previewSelectType.shaded;
            panel.$.previewChannel.value = 0;
            panel.$.previewChannel.classList.remove('show');

            const info = await callMeshPreviewFunction('setMesh', panel.asset.uuid);
            panel.previewUVs = await callMeshPreviewFunction('getModelUVs', panel.asset.uuid);

            if (panel.previewUVs.length === 0) {
                panel.$.previewType.innerHTML = `<option value="${previewSelectType.shaded}">${previewSelectType.shaded}</option>`;
            } else {
                panel.$.previewType.innerHTML = Object.values(previewSelectType).map(v => `<option value="${v}">${v}</option>`).join('');
                panel.$.previewChannel.innerHTML = panel.previewUVs.map((_, i) => `<option value="${i}">Channel ${i}</option>`).join('');
            }

            panel.infoUpdate(info);
            panel.isPreviewDataDirty = true;
        },
        close() {
            const panel = this;
            panel.resizeObserver.unobserve(panel.$.image);
            panel.previewUVs = [];
        },
    },
    info: {
        ready() {
            const panel = this;
            panel.infoUpdate = Elements.info.update.bind(panel);
        },
        update(info) {
            if (!info) {
                return;
            }

            const panel = this;

            panel.$.vertices.value = 'Vertices: ' + info.vertices;
            panel.$.triangles.value = 'Triangles: ' + info.polygons;

            panel.$.minPosLabel.value = '';
            if (info.minPosition) {
                const pos = info.minPosition;
                panel.$.minPosLabel.value = `MinPos: (${pos.x.toFixed(3)}, ${pos.y.toFixed(3)}, ${pos.z.toFixed(3)})`;
            }

            panel.$.maxPosLabel.value = '';
            if (info.maxPosition) {
                const pos = info.maxPosition;
                panel.$.maxPosLabel.value = `MaxPos: (${pos.x.toFixed(3)}, ${pos.y.toFixed(3)}, ${pos.z.toFixed(3)})`;
            }

            panel.isPreviewDataDirty = true;
        },
        close() {
            callMeshPreviewFunction('hide');
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

        const doDraw = async function() {
            try {
                const canvas = panel.$.canvas;
                const { clientWidth: width, clientHeight: height } = panel.$.image;

                if (canvas.width !== width || canvas.height !== height) {
                    canvas.width = width;
                    canvas.height = height;

                    await panel.glPreview.initGL(canvas, { width, height });
                    await panel.glPreview.resizeGL(width, height);
                }
                let info;
                if (panel.$.previewType.value === previewSelectType.shaded) {
                    info = await panel.glPreview.queryPreviewData({
                        width: canvas.width,
                        height: canvas.height,
                    });
                }
                if (panel.$.previewType.value === previewSelectType.uv) {
                    info = panel.glPreview.computedUV(panel.previewUVs[panel.$.previewChannel.value], canvas.width, canvas.height);
                }

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
