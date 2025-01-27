'use strict';

const { PreviewControl, hideElement } = require('../utils/preview');

exports.template = /* html */`
<ui-section header="i18n:ENGINE.inspector.preview.header" class="preview-section config no-padding" expand>
    <div class="preview">
        <div class="content">
            <div class="attribute">
                <ui-prop>
                    <ui-label slot="label" value="i18n:ENGINE.inspector.spine.skin"></ui-label>
                    <ui-select-pro slot="content" class="skin"></ui-select-pro>
                </ui-prop>
                <ui-prop>
                    <ui-label slot="label" value="i18n:ENGINE.inspector.spine.animation"></ui-label>
                    <ui-select-pro slot="content" class="animation"></ui-select-pro>
                </ui-prop>
                <ui-prop>
                    <ui-label slot="label" value="i18n:ENGINE.inspector.spine.loop"></ui-label>
                    <ui-checkbox slot="content" class="loop"></ui-checkbox>
                </ui-prop>
                <ui-prop>
                    <ui-label slot="label" value="i18n:ENGINE.inspector.spine.enable"></ui-label>
                    <div slot="content">
                        <ui-checkbox class="premultipliedAlpha">
                            <ui-label value="i18n:ENGINE.inspector.spine.premultipliedAlpha"></ui-label>
                        </ui-checkbox>
                        <ui-checkbox class="useTint">
                            <ui-label value="i18n:ENGINE.inspector.spine.useTint"></ui-label>
                        </ui-checkbox>
                    </div>
                </ui-prop>
                <ui-prop>
                    <ui-label slot="label" value="i18n:ENGINE.inspector.spine.debug"></ui-label>
                    <div slot="content">
                        <ui-checkbox class="debugSlots">
                            <ui-label value="i18n:ENGINE.inspector.spine.debugSlots"></ui-label>
                        </ui-checkbox>
                        <ui-checkbox class="debugBones">
                            <ui-label value="i18n:ENGINE.inspector.spine.debugBones"></ui-label>
                        </ui-checkbox>
                        <ui-checkbox class="debugMesh">
                            <ui-label value="i18n:ENGINE.inspector.spine.debugMesh"></ui-label>
                        </ui-checkbox>
                    </div>
                </ui-prop>
                <ui-prop class="time-scale-prop">
                    <ui-label slot="label" value="i18n:ENGINE.inspector.spine.timeScale"></ui-label>
                    <div slot="content">
                        <ui-slider class="timeScale" value="1"></ui-slider>
                        <ui-button class="reset-timeScale">
                            <ui-icon value="reset"></ui-icon>
                        </ui-button>
                    </div>
                </ui-prop>
                <ui-prop hidden>
                    <ui-label slot="label" value="Track"></ui-label>
                    <ui-radio-group slot="content" class="track-group"></ui-radio-group>
                </ui-prop>
                
            </div>
            <inspector-resize-preview></inspector-resize-preview>
            <div class="buttons-group">
                <div class="play-buttons">
                    <ui-button class="transparent rewind" type="icon">
                        <ui-icon value="rewind"></ui-icon>
                    </ui-button>
                    <ui-button class="transparent prevPlay" type="icon">
                        <ui-icon value="prev-play"></ui-icon>
                    </ui-button>
                    <ui-button class="transparent play" disabled type="icon">
                        <ui-icon value="play"></ui-icon>
                    </ui-button>
                    <ui-button class="transparent pause" type="icon" hidden>
                        <ui-icon value="pause"></ui-icon>
                    </ui-button>
                    <ui-button class="transparent stop" type="icon">
                        <ui-icon value="stop"></ui-icon>
                    </ui-button>
                    <ui-button class="transparent nextPlay" type="icon">
                        <ui-icon value="next-play"></ui-icon>
                    </ui-button>
                    <ui-button class="transparent forward" type="icon">
                        <ui-icon value="forward"></ui-icon>
                    </ui-button>
                </div>
            </div>
            <ui-scale-plate class="duration"></ui-scale-plate>    
        </div>
    </div>
</ui-section>
`;

exports.style = /* css */`
.preview-section {
    margin-top: 0px;
    .preview {
        border-top: 1px solid var(--color-normal-border);
        
        & > .content {
            display: flex;
            padding-top: 4px;
            padding-bottom: 8px;
            padding-right: 8px;
            padding-left: 8px;
            flex-direction: column;
            
            & > .content[hidden] {
               display: none;
            }
            
            & > .attribute {
               padding-bottom: 4px;
               
               & > .time-scale-prop [slot="content"] {
                    display: flex;
                    
                    & > .timeScale {
                        flex: 1;
                    }
                }
            }
            
            & > .duration[disabled] {
                pointer-events: none;
            }
            
            & > .buttons-group {
                padding: 6px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                    
                & > .play-buttons {
                    & > ui-button[disabled] {
                       pointer-events: none;
                    }
                    & > ui-button[hidden] {
                       display: none;
                    }
                }
            }
        }
    }
}
`;

const Config = {
    CHECKBOX: ['loop', 'useTint', 'debugSlots', 'debugBones', 'debugMesh', 'premultipliedAlpha'],
    SLIDER: ['timeScale'],
    PLAY_CONTROL: ['rewind', 'prevPlay', 'play', 'nextPlay', 'pause', 'stop', 'forward'],
    OTHER: ['skin', 'animation', 'duration'],
};

const Properties = [...Config.CHECKBOX, ...Config.SLIDER, ...Config.OTHER, ...Config.PLAY_CONTROL];

exports.$ = {
    container: '.preview',

    ...Object.fromEntries(Properties.map((key) => [key, `.${key}`])),

    resetTimeScale: '.reset-timeScale',
    buttonsGroup: '.buttons-group',
    trackGroup: '.track-group',
};

const Elements = {
    preview: {
        ready(panel) {
            panel.preview.init();
        },
        async update(panel) {
            const spineData = await panel.preview.callPreviewFunction('setSpine', panel.asset.uuid);
            panel.spinUpdate(panel, spineData);
        },
        close(panel) {
            panel.preview.callPreviewFunction('stop');
            panel.preview.callPreviewFunction('close');
            panel.preview.close();
        },
    },
    spine: {
        updateTrackGroup(trackGroupElement, index, total) {
            trackGroupElement.innerHTML = '';
            trackGroupElement.setAttribute('value', index);
            for (let i = 0; i < total; i++) {
                const item = document.createElement('ui-radio-button');
                item.setAttribute('value', i.toString());
                trackGroupElement.appendChild(item);
                const label = document.createElement('ui-label');
                label.setAttribute('value', i.toString());
                item.appendChild(label);
            }
        },
        updateEnum($selectPro, info, cb) {
            $selectPro.innerHTML = '';
            for (const key in info.list) {
                const value = info.list[key];
                const option = document.createElement('ui-select-option-pro');
                option.setAttribute('label', key);
                option.setAttribute('value', value);
                if (info.index === value) {
                    cb && cb(Number(value));
                    option.setAttribute('selected', '');
                }
                $selectPro.appendChild(option);
            }
        },
        ready(panel) {
            panel.animationIndex = 0;
            panel.$.skin.addEventListener('confirm', (event) => {
                panel.preview.callPreviewFunction('setSkinIndex', Number(event.detail));
            });
            panel.$.animation.addEventListener('confirm', async (event) => {
                panel.animationIndex = Number(event.detail);
                await panel.preview.callPreviewFunction('setAnimationIndex', panel.animationIndex);
                Elements.control.updateState(panel);
            });
            panel.$.duration.addEventListener('confirm', (event) => {
                panel.preview.callPreviewFunction('setCurrentTime', Number(event.target.value));
            });
            panel.$.resetTimeScale.addEventListener('click', (event) => {
                panel.$.timeScale.setAttribute('value', 1 + '');
                panel.preview.callPreviewFunction('setProperties', 'timeScale', 1);
            });
            panel.$.trackGroup.addEventListener('change', (event) => {
                panel.preview.callPreviewFunction('setTrackIndex', Number(event.target.value));
            });

            panel.spinUpdate = Elements.spine.update.bind(panel);
        },
        getDurations(panel, info) {
            return info.animation.durations[panel.animationIndex];
        },
        update(panel, info) {
            Properties.forEach(property => {
                panel.$[property].toggleAttribute('disabled', !info);
            });

            if (!info) { return; }

            Elements.control.updateState(panel);
            Elements.spine.updateTrackGroup(panel.$.trackGroup, info.trackIndex, info.trackTotals);
            Elements.spine.updateEnum(panel.$.skin, info.skin);
            Elements.spine.updateEnum(panel.$.animation, info.animation, (value) => {
                panel.animationIndex = value;
            });
            Elements.spine.updateDuration(panel, 0, Elements.spine.getDurations(panel, info));
            Elements.control.update(panel, false);
            Elements.control.updateInfo(panel, info);
        },
        updateDuration(panel, time, duration) {
            panel.$.duration.setConfig({
                min: 0,
                max: duration,
                minStep: 0.1,
            });
            panel.$.duration.setAttribute('value', time);
        },
    },
    control: {
        ready(panel) {
            Config.SLIDER.forEach((key) => {
                panel.$[key].addEventListener('change', (event) => {
                    panel.preview.callPreviewFunction('setProperties', key, Number(event.target.value));
                });
            });

            Config.CHECKBOX.forEach((key) => {
                panel.$[key].addEventListener('confirm', (event) => {
                    panel.preview.callPreviewFunction('setProperties', key, Boolean(event.target.value));
                });
            });

            Config.PLAY_CONTROL.forEach((key) => {
                panel.$[key].addEventListener('click', () => {
                    panel.preview.callPreviewFunction(key);
                });
            });
        },
        updateState(panel) {
            const disabled = 0 === panel.animationIndex;
            Config.PLAY_CONTROL.forEach(property => panel.$[property].toggleAttribute('disabled', disabled));
            panel.$.timeScale.toggleAttribute('disabled', disabled);
            panel.$.duration.toggleAttribute('disabled', disabled);
        },
        updateInfo(panel, info) {
            Config.CHECKBOX.forEach((key) => panel.$[key].setAttribute('value', Boolean(info[key])));
            Config.SLIDER.forEach((key) => panel.$[key].setAttribute('value', Number(info[key])));
        },
        update(panel, playing) {
            panel.$.play.toggleAttribute('hidden', playing);
            panel.$.pause.toggleAttribute('hidden', !playing);
        },
    },
};

exports.methods = {
    /**
     *
     * @param info
     *  isPlaying
     *  duration
     *  currentTime
     */
    onAnimationUpdate(info) {
        const panel = this;
        Elements.spine.updateDuration(panel, info.currentTime, info.duration);
        Elements.control.update(panel, info.isPlaying);
        panel.preview.doRefreshDirty();
    },
};

exports.ready = function() {
    this.onAnimationUpdateBind = this.onAnimationUpdate.bind(this);

    Editor.Message.__protected__.addBroadcastListener('scene:spine-preview-animation-time-change', this.onAnimationUpdateBind);

    this.preview = new PreviewControl('scene:spine-preview', 'query-spine-preview-data', this.$.container);

    Object.values(Elements).forEach((element) => element.ready && element.ready(this));
};

exports.update = function(assetList, metaList) {
    this.assetList = assetList;
    this.metaList = metaList;
    this.asset = assetList[0];
    this.meta = metaList[0];

    // 如何多选就隐藏预览
    hideElement(this.$.container, assetList.length > 1);

    Object.values(Elements).forEach((element) => element.update && element.update(this));
};

exports.close = function() {
    Editor.Message.__protected__.removeBroadcastListener('scene:spine-preview-animation-time-change', this.onAnimationUpdateBind);

    this.preview.close();

    Object.values(Elements).forEach((element) => element.close && element.close(this));
};
