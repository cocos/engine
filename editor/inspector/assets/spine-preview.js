'use strict';

exports.template = /* html */`
<ui-section header="i18n:ENGINE.inspector.preview.header" class="preview-section config no-padding" expand>
    <div class="preview">
        <div class="control">
            <ui-prop class="skin">
                <ui-label slot="label" value="i18n:ENGINE.inspector.spine.skin"></ui-label>
                <ui-select-pro slot="content" class="skin-select-pro"></ui-select-pro>
            </ui-prop>
            <ui-prop class="animation">
                <ui-label slot="label" value="i18n:ENGINE.inspector.spine.animation"></ui-label>
                <ui-select-pro slot="content" class="animation-select-pro"></ui-select-pro>
            </ui-prop>
            <ui-prop class="loop">
                <ui-label slot="label" value="i18n:ENGINE.inspector.spine.loop"></ui-label>
                <ui-checkbox slot="content" class="loop-checkbox"></ui-checkbox>
            </ui-prop>
            <ui-prop class="timeScale">
                <ui-label slot="label" value="i18n:ENGINE.inspector.spine.timeScale"></ui-label>
                <ui-slider slot="content" class="time-scale-slider" value="1"></ui-slider>
            </ui-prop>
            <ui-prop class="premultipliedAlpha">
                <ui-label slot="label" value="i18n:ENGINE.inspector.spine.premultipliedAlpha"></ui-label>
                <ui-checkbox slot="content" class="premultiplied-alpha-checkbox"></ui-checkbox>
            </ui-prop>
            <ui-prop class="useTint">
                <ui-label slot="label" value="i18n:ENGINE.inspector.spine.useTint"></ui-label>
                <ui-checkbox slot="content" class="use-tint-checkbox"></ui-checkbox>
            </ui-prop>
            <ui-prop class="debugSlots">
                <ui-label slot="label" value="i18n:ENGINE.inspector.spine.debugSlots"></ui-label>
                <ui-checkbox slot="content" class="debug-slots-checkbox"></ui-checkbox>
            </ui-prop>
            <ui-prop class="debugBones">
                <ui-label slot="label" value="i18n:ENGINE.inspector.spine.debugBones"></ui-label>
                <ui-checkbox slot="content" class="debug-bones-checkbox"></ui-checkbox>
            </ui-prop>
            <ui-prop class="debugMesh">
                <ui-label slot="label" value="i18n:ENGINE.inspector.spine.debugMesh"></ui-label>
                <ui-checkbox slot="content" class="debug-mesh-checkbox"></ui-checkbox>
            </ui-prop>
        </div>
        <div class="image">
            <canvas class="canvas"></canvas>
            <div class="anim-control">
                <ui-button class="play" type="icon">
                    <ui-icon class="play-state" value="play"></ui-icon>
                </ui-button>
                <ui-button class="pause" type="icon" hidden>
                    <ui-icon class="play-state" value="pause"></ui-icon>
                </ui-button>
                <ui-button class="stop" type="icon">
                    <ui-icon class="play-state" value="stop"></ui-icon>
                </ui-button>
            </div>
            <ui-label class="duration" outline></ui-label>
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
.preview > .control {
    padding-top: 8px;
    padding-bottom: 8px;
    padding-right: 8px;
    display: flex;
    flex-direction: column;
}
.preview > .control[hidden] {
    display: none;
}
.preview > .control > ui-prop {
}
.preview > .image {
    height: var(--inspector-footer-preview-height, 200px);
    overflow: hidden;
    display: flex;
    flex: 1;
}
.preview > .image > .anim-control {
    position: absolute;
    right: 15px;
    bottom: 15px;
    height: 25px;
}
.preview > .image > .anim-control[hidden] {
    display: none;
}
.preview > .image .play[hidden] {
    display: none;
}
.preview > .image .pause[hidden] {
    display: none;
}
.preview > .image .duration {
    position: absolute;
    left: 50%;
    bottom: 4px;
    transform: translate(-50%);
}
.preview >.image > .canvas {
    flex: 1;
}
`;

exports.$ = {
    container: '.preview',
    canvas: '.canvas',
    image: '.image',
    skinSelectPro: '.skin-select-pro',
    animationSelectPro: '.animation-select-pro',
    control: '.control',
    playState: '.play-state',
    play: '.play',
    pause: '.pause',
    stop: '.stop',
    duration: '.duration',
    loop: '.loop-checkbox',
    useTint: '.use-tint-checkbox',
    timeScale: '.time-scale-slider',
    debugSlots: '.debug-slots-checkbox',
    debugBones: '.debug-bones-checkbox',
    premultipliedAlpha: '.premultiplied-alpha-checkbox',
    debugMesh: '.debug-mesh-checkbox',
    animationCtrl: '.anim-control',
};

const CheckBox = [
    'loop',
    'useTint',
    'debugSlots',
    'debugBones',
    'debugMesh',
    'premultipliedAlpha',
];

const Slider = [
    'timeScale',
];

const Other = [
    'play',
    'stop',
    'skinSelectPro',
    'animationSelectPro',
];

const Properties = CheckBox.concat(Slider).concat(Other);

async function callFunction(funcName, ...args) {
    return await Editor.Message.request('scene', 'call-preview-function', 'scene:spine-preview', funcName, ...args);
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
            panel.glPreview = new GlPreview('scene:spine-preview', 'query-spine-preview-data');

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
            const spineData = await callFunction('setSpine', panel.asset.uuid);
            panel.spinUpdate(spineData);
            this.isPreviewDataDirty = true;
        },
        close() {
            const panel = this;

            callFunction('stop');
            callFunction('close');
            panel.resizeObserver.unobserve(panel.$.image);
        },
    },
    spine: {
        updateEnum($selectPro, info) {
            const panel = this;

            $selectPro.innerHTML = '';
            for (const key in info.list) {
                const value = info.list[key];
                const option = document.createElement('ui-select-option-pro');
                option.setAttribute('label', key);
                option.setAttribute('value', value);
                if (info.index === value) {
                    panel.animationIndex = Number(value);
                    option.setAttribute('selected', '');
                }
                $selectPro.appendChild(option);
            }
        },
        ready() {
            const panel = this;

            panel.animationIndex = 0;
            panel.$.skinSelectPro.addEventListener('confirm', (event) => {
                callFunction('setSkinIndex', Number(event.detail));
            });
            panel.$.animationSelectPro.addEventListener('confirm', (event) => {
                panel.animationIndex = Number(event.detail);
                callFunction('play', panel.animationIndex);
            });
            panel.spinUpdate = Elements.spine.update.bind(panel);
        },
        update(info) {
            const panel = this;

            if (!info) {
                Properties.forEach(property => {
                    panel.$[property].setAttribute('disabled', '');
                });
                return;
            }

            Properties.forEach(property => {
                panel.$[property].removeAttribute('disabled');
            });

            Elements.spine.updateEnum.call(panel, panel.$.skinSelectPro, info.skin);
            Elements.spine.updateEnum.call(panel, panel.$.animationSelectPro, info.animation);
            Elements.spine.updateDuration.call(panel, 0, info.animation.durations[panel.animationIndex]);
            Elements.control.update.call(panel, false);
            Elements.control.updateInfo.call(panel, info);
            panel.isPreviewDataDirty = true;
        },
        updateDuration(delay, duration) {
            const panel = this;

            panel.$.duration.setAttribute('value', `${Number(delay).toFixed(3)} / ${duration.toFixed(3)}`);
        },
    },
    control: {
        ready() {
            const panel = this;

            Slider.forEach((key) => {
                panel.$[key].addEventListener('change', (event) => {
                    callFunction('setProperties', key, Number(event.target.value));
                });
            });

            CheckBox.forEach((key) => {
                panel.$[key].addEventListener('confirm', (event) => {
                    callFunction('setProperties', key, Boolean(event.target.value)).then((() => {
                        this.isPreviewDataDirty = true;
                    }));
                });
            });

            panel.$.play.addEventListener('click', () => {
                callFunction('play', panel.animationIndex);
            });
            panel.$.pause.addEventListener('confirm', (event) => {
                callFunction('pause');
            });
            panel.$.stop.addEventListener('confirm', (event) => {
                callFunction('stop');
            });
        },
        updateInfo(info) {
            const panel = this;

            CheckBox.forEach((key) => {
                panel.$[key].setAttribute('value', Boolean(info[key]));
            });
            Slider.forEach((key) => {
                panel.$[key].setAttribute('value', Number(info[key]));
            });
        },
        update(playing) {
            const panel = this;

            if (playing) {
                panel.$.play.setAttribute('hidden', '');
                panel.$.pause.removeAttribute('hidden');
            } else {
                panel.$.pause.setAttribute('hidden', '');
                panel.$.play.removeAttribute('hidden');
            }
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

    onAnimationUpdate(playing, delay, duration) {
        const panel = this;
        Elements.spine.updateDuration.call(panel, delay, duration);
        Elements.control.update.call(panel, playing);
        panel.isPreviewDataDirty = true;
    },
};

exports.ready = function() {
    this.onAnimationUpdateBind = this.onAnimationUpdate.bind(this);

    Editor.Message.addBroadcastListener('scene:spine-preview-animation-time-change', this.onAnimationUpdateBind);

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
