/* eslint-disable @typescript-eslint/no-unsafe-return */

const propUtils = require('../utils/prop');

exports.template = /* html*/`
<div class="particle-system-component">
    <div class="content">
        <ui-prop type="dump" key="duration"></ui-prop>
        <ui-prop type="dump" key="capacity"></ui-prop>
        <ui-prop type="dump" key="loop"></ui-prop>
        <ui-prop type="dump" key="playOnAwake"></ui-prop>
        <ui-prop type="dump" key="prewarm"></ui-prop>
        <ui-prop type="dump" key="simulationSpace"></ui-prop>
        <ui-prop type="dump" key="simulationSpeed"></ui-prop>
        <ui-prop type="dump" key="startDelay"></ui-prop>
        <ui-prop type="dump" key="startLifetime"></ui-prop>
        <ui-prop type="dump" key="startColor"></ui-prop>
        <ui-prop type="dump" key="scaleSpace"></ui-prop>
        <ui-prop type="dump" key="startSize3D"></ui-prop>
        <!-- hack changeName if startSize3D change -->
        <ui-prop type="dump" key="startSizeX" displayName="Start Size" showflag="!startSize3D"></ui-prop>
        <ui-prop type="dump" class="indent" key="startSizeX" showflag="startSize3D"></ui-prop>
        <ui-prop type="dump" class="indent" key="startSizeY"></ui-prop>
        <ui-prop type="dump" class="indent" key="startSizeZ"></ui-prop>
        <ui-prop type="dump" key="startSpeed"></ui-prop>
        <ui-prop type="dump" key="startRotation3D"></ui-prop>
        <ui-prop type="dump" class="indent" key="startRotationX"></ui-prop>
        <ui-prop type="dump" class="indent" key="startRotationY"></ui-prop>
        <!-- hack changeName if startRotation3D change -->
        <ui-prop type="dump" class="indent" key="startRotationZ" showflag="startRotation3D"></ui-prop>
        <ui-prop type="dump" showflag="!startRotation3D" displayName="Start Rotation" key="startRotationZ"></ui-prop>
        <ui-prop type="dump" key="gravityModifier"></ui-prop>
        <ui-prop type="dump" key="rateOverTime"></ui-prop>
        <ui-prop type="dump" key="rateOverDistance"></ui-prop>
        <ui-prop type="dump" key="bursts"></ui-prop>
        <!-- Render other data that has not taken over -->
        <div id="customProps"></div>

        <ui-section key="renderCulling" autoExpand cache-expand="particle-system-cullingMode">
            <ui-prop slot="header" no-label class="header" empty="true" labelflag="renderCulling" key="renderCulling">
                <ui-checkbox></ui-checkbox><ui-label></ui-label>
            </ui-prop>
            <ui-prop type="dump" key="cullingMode" disableflag="!renderCulling"></ui-prop>
            <ui-prop type="dump" key="aabbHalfX" disableflag="!renderCulling"></ui-prop>
            <ui-prop type="dump" key="aabbHalfY" disableflag="!renderCulling"></ui-prop>
            <ui-prop type="dump" key="aabbHalfZ" disableflag="!renderCulling"></ui-prop>
            <ui-prop empty="true" disableflag="!renderCulling">
                <ui-label slot="label" value="Show Bounds"></ui-label>
                <ui-checkbox slot="content" id="showBounds"></ui-checkbox>
            </ui-prop>
            <ui-button id="resetBounds" style="width:200px;margin: 4px auto 0 auto;">Regenerate bounding box</ui-button>
        </ui-section>
        <ui-section key="noiseModule.value.enable" autoExpand cache-expand="particle-system-useNoise">
            <ui-prop slot="header" no-label class="header" empty="true" key="noiseModule.value.enable">
                <ui-checkbox></ui-checkbox><ui-label value="Noise Module"></ui-label>
            </ui-prop>
            <ui-prop>
                <ui-label slot="label" value="Noise Preview"></ui-label>
                <div slot="content" style="display: flex;flex-direction: row-reverse;padding: 5px;">
                     <canvas id="noisePreview" width="100" height="100"></canvas>
                </div>
            </ui-prop>

            <ui-prop type="dump" key="noiseModule.value.strengthX" disableflag="!noiseModule.value.enable"></ui-prop>
            <ui-prop type="dump" key="noiseModule.value.strengthY" disableflag="!noiseModule.value.enable"></ui-prop>
            <ui-prop type="dump" key="noiseModule.value.strengthZ" disableflag="!noiseModule.value.enable"></ui-prop>
            <ui-prop type="dump" key="noiseModule.value.noiseSpeedX" disableflag="!noiseModule.value.enable"></ui-prop>
            <ui-prop type="dump" key="noiseModule.value.noiseSpeedY" disableflag="!noiseModule.value.enable"></ui-prop>
            <ui-prop type="dump" key="noiseModule.value.noiseSpeedZ" disableflag="!noiseModule.value.enable"></ui-prop>
            <ui-prop type="dump" key="noiseModule.value.noiseFrequency" disableflag="!noiseModule.value.enable"></ui-prop>
            <ui-prop type="dump" key="noiseModule.value.remapX" disableflag="!noiseModule.value.enable"></ui-prop>
            <ui-prop type="dump" key="noiseModule.value.remapY" disableflag="!noiseModule.value.enable"></ui-prop>
            <ui-prop type="dump" key="noiseModule.value.remapZ" disableflag="!noiseModule.value.enable"></ui-prop>
            <ui-prop type="dump" key="noiseModule.value.octaves" disableflag="!noiseModule.value.enable"></ui-prop>
            <ui-prop type="dump" key="noiseModule.value.octaveMultiplier" disableflag="!noiseModule.value.enable"></ui-prop>
            <ui-prop type="dump" key="noiseModule.value.octaveScale" disableflag="!noiseModule.value.enable"></ui-prop>
        </ui-section>
        <ui-section key="shapeModule" cache-expand="particle-system-shapeModule">
            <ui-prop slot="header" no-label class="header" type="dump" key="shapeModule.value.enable" labelflag="shapeModule"
                empty="true">
                <ui-checkbox></ui-checkbox><ui-label></ui-label>
            </ui-prop>
            <ui-prop type="dump" key="shapeModule.value.shapeType"></ui-prop>
            <ui-prop empty="true" labelflag="shapeModule.value.emitFrom" type="dump" key="shapeModule.value.emitFrom">
                <ui-label slot="label"></ui-label>
                <ui-select slot="content" id="emitFromSelect"></ui-select>
            </ui-prop>
            <ui-prop type="dump" key="shapeModule.value.radius"></ui-prop>
            <ui-prop type="dump" key="shapeModule.value.radiusThickness"></ui-prop>
            <ui-prop type="dump" key="shapeModule.value.angle"></ui-prop>
            <ui-prop type="dump" key="shapeModule.value.arc"></ui-prop>
            <ui-prop type="dump" key="shapeModule.value.arcMode"></ui-prop>
            <ui-prop type="dump" key="shapeModule.value.arcSpread"></ui-prop>
            <ui-prop type="dump" key="shapeModule.value.arcSpeed"></ui-prop>
            <ui-prop type="dump" key="shapeModule.value.length"></ui-prop>
            <ui-prop type="dump" key="shapeModule.value.boxThickness"></ui-prop>
            <ui-prop type="dump" key="shapeModule.value.position"></ui-prop>
            <ui-prop type="dump" key="shapeModule.value.rotation"></ui-prop>
            <ui-prop type="dump" key="shapeModule.value.scale"></ui-prop>
            <ui-prop type="dump" key="shapeModule.value.alignToDirection"></ui-prop>
            <ui-prop type="dump" key="shapeModule.value.randomDirectionAmount"></ui-prop>
            <ui-prop type="dump" key="shapeModule.value.sphericalDirectionAmount"></ui-prop>
            <ui-prop type="dump" key="shapeModule.value.randomPositionAmount"></ui-prop>
        </ui-section>
        <ui-section key="velocityOvertimeModule" autoflag="true" cache-expand="particle-system-velocityOvertimeModule"></ui-section>
        <ui-section key="forceOvertimeModule" autoflag="true" cache-expand="particle-system-forceOvertimeModule"></ui-section>
        <ui-section empty="true" key="sizeOvertimeModule"
            cache-expand="particle-system-sizeOvertimeModule">
            <ui-prop slot="header" no-label class="header" type="dump" key="sizeOvertimeModule.value.enable"
                labelflag="sizeOvertimeModule" empty="true">
                <ui-checkbox></ui-checkbox><ui-label></ui-label>
            </ui-prop>
            <ui-prop type="dump" key="sizeOvertimeModule.value.separateAxes"></ui-prop>
            <ui-prop type="dump" key="sizeOvertimeModule.value.size"></ui-prop>
            <ui-prop type="dump" key="sizeOvertimeModule.value.x"></ui-prop>
            <ui-prop type="dump" key="sizeOvertimeModule.value.y"></ui-prop>
            <ui-prop type="dump" key="sizeOvertimeModule.value.z"></ui-prop>
        </ui-section>
        <ui-section empty="true" key="rotationOvertimeModule"
            cache-expand="particle-system-rotationOvertimeModule">
            <ui-prop slot="header" no-label class="header" type="dump" key="rotationOvertimeModule.value.enable"
                labelflag="rotationOvertimeModule" empty="true">
                <ui-checkbox></ui-checkbox><ui-label></ui-label>
            </ui-prop>
            <ui-prop type="dump" key="rotationOvertimeModule.value.separateAxes"></ui-prop>
            <ui-prop type="dump" key="rotationOvertimeModule.value.x"></ui-prop>
            <ui-prop type="dump" key="rotationOvertimeModule.value.y"></ui-prop>
            <ui-prop type="dump" key="rotationOvertimeModule.value.z"></ui-prop>
        </ui-section>
        <ui-section key="colorOverLifetimeModule" autoflag="true"
            cache-expand="particle-system-colorOverLifetimeModule"></ui-section>
        <ui-section key="textureAnimationModule" autoflag="true"
            cache-expand="particle-system-textureAnimationModule"></ui-section>
        <ui-section type="dump" showflag="!renderer.value.useGPU" key="limitVelocityOvertimeModule"
            cache-expand="particle-system-limitVelocityOvertimeModule">
            <ui-prop slot="header" no-label class="header" type="dump" key="limitVelocityOvertimeModule.value.enable"
                labelflag="limitVelocityOvertimeModule" empty="true">
                <ui-checkbox></ui-checkbox><ui-label></ui-label>
            </ui-prop>
            <ui-prop type="dump" key="limitVelocityOvertimeModule.value.space"></ui-prop>
            <ui-prop type="dump" key="limitVelocityOvertimeModule.value.dampen"></ui-prop>
            <ui-prop type="dump" key="limitVelocityOvertimeModule.value.separateAxes"></ui-prop>
            <ui-prop type="dump" key="limitVelocityOvertimeModule.value.limit"></ui-prop>
            <ui-prop type="dump" key="limitVelocityOvertimeModule.value.limitX"></ui-prop>
            <ui-prop type="dump" key="limitVelocityOvertimeModule.value.limitY"></ui-prop>
            <ui-prop type="dump" key="limitVelocityOvertimeModule.value.limitZ"></ui-prop>
        </ui-section>
        <ui-section empty="true" showflag="!renderer.value.useGPU" key="trailModule"
            cache-expand="particle-system-trailModule">
            <ui-prop slot="header" no-label class="header" type="dump" key="trailModule.value.enable" labelflag="trailModule"
                empty="true">
                <ui-checkbox></ui-checkbox><ui-label></ui-label>
            </ui-prop>
            <ui-prop type="dump" key="trailModule.value.mode"></ui-prop>
            <ui-prop type="dump" key="trailModule.value.lifeTime"></ui-prop>
            <ui-prop type="dump" key="trailModule.value.minParticleDistance"></ui-prop>
            <ui-prop type="dump" key="trailModule.value.space"></ui-prop>
            <ui-prop type="dump" key="trailModule.value.textureMode"></ui-prop>
            <ui-prop type="dump" key="trailModule.value.widthFromParticle"></ui-prop>
            <ui-prop type="dump" key="trailModule.value.widthRatio"></ui-prop>
            <ui-prop type="dump" key="trailModule.value.colorFromParticle"></ui-prop>
            <ui-prop type="dump" key="trailModule.value.colorOverTrail"></ui-prop>
            <ui-prop type="dump" key="trailModule.value.colorOvertime"></ui-prop>
        </ui-section>
        <ui-section empty="true" key="renderer" expand>
            <div slot="header" style="overflow: hidden;">
                <ui-label name style="white-space: nowrap;" value="Renderer"></ui-label>
                <ui-label type style="white-space: nowrap;opacity: 0.55;margin-left: 4px;flex:auto;font-weight:normal;" value=": cc.ParticleSystemRenderer"></ui-label>
            </div>
            <ui-prop type="dump" key="renderer.value.renderMode"></ui-prop>
            <ui-prop type="dump" key="renderer.value.velocityScale"></ui-prop>
            <ui-prop type="dump" key="renderer.value.lengthScale"></ui-prop>
            <ui-prop type="dump" key="renderer.value.mesh"></ui-prop>
            <ui-prop class="cpu-material" type="dump" key="renderer.value.cpuMaterial"></ui-prop>
            <ui-prop class="trail-material" type="dump" key="renderer.value.trailMaterial"></ui-prop>
            <ui-prop class="gpu-material" type="dump" key="renderer.value.gpuMaterial"></ui-prop>
            <ui-prop id="use-gpu" type="dump" key="renderer.value.useGPU"></ui-prop>
            <ui-prop type="dump" key="renderer.value.alignSpace"></ui-prop>
        </ui-section>
    </div>
</div>

`;
const excludeList = [
    'duration', 'capacity', 'loop', 'playOnAwake', 'prewarm',
    'simulationSpace', 'simulationSpeed', 'startDelay',
    'startLifetime', 'startColor', 'scaleSpace', 'startSize3D',
    'startSizeX', 'startSizeY', 'startSizeZ', 'startSpeed',
    'startRotation3D', 'startRotationX', 'startRotationY',
    'startRotationZ', 'gravityModifier', 'rateOverTime',
    'rateOverDistance', 'bursts', 'shapeModule',
    'velocityOvertimeModule', 'forceOvertimeModule', 'sizeOvertimeModule',
    'rotationOvertimeModule', 'colorOverLifetimeModule', 'textureAnimationModule',
    'trailModule', 'renderer', 'renderCulling', 'limitVelocityOvertimeModule', 'cullingMode',
    'aabbHalfX', 'aabbHalfY', 'aabbHalfZ', 'noiseModule',
];

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

    getEnumName(type, value) {
        for (const opt of type.enumList) {
            if (opt.value === value) {
                return opt.name;
            }
        }
        return String();
    },

    getEnumObjFromName(type, ...name) {
        const enumMap = {};
        for (const opt of type.enumList) {
            enumMap[opt.name] = {
                name: opt.name,
                value: opt.value,
            };
        }
        return name.map((value) => enumMap[value]);
    },

    getShapeTypeEmitFrom(shapeType) {
        const shapeTypeName = this.getEnumName(this.dump.value.shapeModule.value.shapeType, shapeType);
        let emitEnum = null;
        switch (shapeTypeName) {
            case 'Box':
                emitEnum = this.getEnumObjFromName(this.dump.value.shapeModule.value.emitFrom, 'Volume', 'Shell', 'Edge');
                break;
            case 'Cone':
                emitEnum = this.getEnumObjFromName(this.dump.value.shapeModule.value.emitFrom, 'Base', 'Shell', 'Volume');
                break;
            case 'Sphere':
                emitEnum = this.getEnumObjFromName(this.dump.value.shapeModule.value.emitFrom, 'Volume', 'Shell');
                break;
            case 'Hemisphere':
                emitEnum = this.getEnumObjFromName(this.dump.value.shapeModule.value.emitFrom, 'Volume', 'Shell');
                break;
            default:
                emitEnum = [];
        }
        return emitEnum;
    },

};

const uiElements = {
    resetBounds: {
        async ready() {
            this.$.resetBounds.addEventListener('confirm', async () => {
                const nodeDumps = this.dump.value.node.values || [this.dump.value.node.value];
                const componentUUIDs = this.dump.value.uuid.values || [this.dump.value.uuid.value];
                await Promise.all(componentUUIDs.map(uuid => {
                    return new Promise((res) => {
                        Editor.Message.request(propUtils.getMessageProtocolScene(this.$this), 'execute-component-method', {
                            uuid,
                            name: '_calculateBounding',
                            args: [true],
                        }).then(() => {
                            Editor.Message.request(propUtils.getMessageProtocolScene(this.$this), 'execute-component-method', {
                                uuid,
                                name: 'gizmo.onNodeChanged',
                                args: [],
                            });
                            res();
                        });
                    });
                }));
                nodeDumps.forEach(dump => {
                    Editor.Message.broadcast('scene:change-node', dump.uuid);
                });
            });
        },
        update() {
            const isInvalid = propUtils.isMultipleInvalid(this.dump.value.renderCulling);
            if (isInvalid || !this.dump.value.renderCulling.value) {
                this.$.resetBounds.setAttribute('disabled', true);
            } else {
                if (this.$.resetBounds.hasAttribute('disabled')) {
                    this.$.resetBounds.removeAttribute('disabled');
                }
            }
        },
    },
    uiSections: {
        ready() {
            this.$.uiSections = this.$this.shadowRoot.querySelectorAll('ui-section');
            this.$.uiSections.forEach((element) => {
                // expand when checkbox enable
                if (element.hasAttribute('autoExpand')) {
                    element.addEventListener('checkbox-enable', () => {
                        element.setAttribute('expand', 'expand');
                    });
                }
            });
        },
        update() {
            this.$.uiSections.forEach((element) => {
                const key = element.getAttribute('key');
                const showflag = element.getAttribute('showflag');
                const autoflag = element.getAttribute('autoflag');
                if (showflag) {
                    if (typeof showflag === 'string') {
                        if (showflag.startsWith('!')) {
                            const dump = this.getObjectByKey(this.dump.value, showflag.slice(1));
                            const isInvalid = propUtils.isMultipleInvalid(dump);
                            if (dump.value || isInvalid) {
                                // continue when don't show
                                element.style = 'display: none;';
                                return true;
                            }
                        } else {
                            const dump = this.getObjectByKey(this.dump.value, showflag);
                            const isInvalid = propUtils.isMultipleInvalid(dump);
                            if (!dump.value || isInvalid) {
                                // continue when don't show
                                element.style = 'display: none;';
                                return true;
                            }
                        }
                    }
                }
                element.style = '';
                if (autoflag) {
                    const oldChildren = Array.from(element.children);
                    const children = [];

                    const oldCheckbox = element.querySelector('[slot="header"] > ui-checkbox');
                    if (oldCheckbox) {
                        oldCheckbox.removeEventListener('change', oldCheckbox.changeEvent);
                        oldCheckbox.changeEvent = undefined;
                    }

                    const header = document.createElement('ui-prop');
                    header.setAttribute('slot', 'header');
                    header.setAttribute('no-label', '');
                    header.setAttribute('type', 'dump');
                    header.setAttribute('empty', 'true');
                    header.className = 'header';
                    const dump = this.getObjectByKey(this.dump.value, key);
                    header.dump = dump;
                    const checkbox = document.createElement('ui-checkbox');
                    checkbox.changeEvent = (event) => {
                        dump.value.enable.value = event.target.value;
                        header.dispatch('change-dump');
                    };
                    checkbox.addEventListener('change', checkbox.changeEvent);
                    checkbox.setAttribute('value', dump.value.enable.value);
                    const label = document.createElement('ui-label');
                    label.setAttribute('value', propUtils.getName(dump));
                    label.setAttribute('tooltip', dump.tooltip);
                    header.replaceChildren(...[checkbox, label]);
                    children.push(header);
                    const propMap = dump.value;

                    for (const propKey in propMap) {
                        const propDump = propMap[propKey];
                        if (propKey === 'enable') {
                            continue;
                        }
                        const oldProp = oldChildren.find((child) => child.getAttribute('key') === propKey);
                        const uiProp = oldProp || document.createElement('ui-prop');
                        uiProp.setAttribute('type', 'dump');
                        uiProp.setAttribute('key', propKey);
                        const isShow = propDump.visible;
                        if (isShow) {
                            uiProp.render(propDump);
                            children.push(uiProp);
                        }
                    }
                    children.sort((a, b) => (a.dump.displayOrder ? a.dump.displayOrder : 0 - b.dump.displayOrder ? b.dump.displayOrder : 0));
                    children.forEach((newChild, index) => {
                        const oldChild = oldChildren[index];
                        if (oldChild === newChild) {
                            return;
                        }
                        if (oldChild) {
                            oldChild.replaceWith(newChild);
                        } else {
                            element.appendChild(newChild);
                        }
                    });
                    while (oldChildren.length > children.length) {
                        const oldChild = oldChildren.pop();
                        oldChild.remove();
                    }
                }
            });
        },
    },
    showBounds: {
        ready() {
            this.$.showBounds.addEventListener('change', (event) => {
                const componentUUIDs = this.dump.value.uuid.values || [this.dump.value.uuid.value];
                componentUUIDs.forEach(uuid => {
                    Editor.Message.send(propUtils.getMessageProtocolScene(this.$this), 'execute-component-method', {
                        uuid,
                        name: 'gizmo.showBoundingBox',
                        args: [event.target.value],
                    });
                });
            });
        },
        async update() {
            if (!this.dump.value.renderCulling.value) {
                this.$.showBounds.setAttribute('disabled', true);
            } else if (this.$.showBounds.hasAttribute('disabled')) {
                this.$.showBounds.removeAttribute('disabled');
            }
            const componentUUIDs = this.dump.value.uuid.values || [this.dump.value.uuid.value];
            const values = await Promise.all(
                componentUUIDs.map(
                    uuid => Editor.Message.request(propUtils.getMessageProtocolScene(this.$this), 'execute-component-method', {
                        uuid,
                        name: 'gizmo.isShowBoundingBox',
                        args: [],
                    })));
            const invalid = values.some(v => v !== values[0]);
            this.$.showBounds.invalid = invalid;
            this.$.showBounds.value = values[0];
        },
    },
    emitFromSelect: {
        ready() {
            this.$.emitFromSelect.addEventListener('change', (event) => {
                this.dump.value.shapeModule.value.emitFrom.value = event.target.value;
                this.$.emitFromSelect.parentNode.dispatch('change-dump');
            });
        },
        update() {
            this.$.emitFromSelect.setAttribute('value', this.dump.value.shapeModule.value.emitFrom.value);
            const datas = this.getShapeTypeEmitFrom(this.dump.value.shapeModule.value.shapeType.value);
            const children = datas.map((data) => {
                const child = document.createElement('option');
                child.innerHTML = data.name;
                child.setAttribute('value', data.value);
                return child;
            });
            this.$.emitFromSelect.replaceChildren(...children);
        },
    },
    baseProps: {
        ready() {
            this.$.baseProps = this.$this.shadowRoot.querySelectorAll('ui-prop:not(.customProp)');
            this.$.baseProps.forEach((element) => {
                const key = element.getAttribute('key');
                const isEmpty = element.getAttribute('empty');
                const isHeader = element.getAttribute('slot') === 'header';
                element.addEventListener('change-dump', () => {
                    uiElements.baseProps.update.call(this, key);
                });
                if (isEmpty) {
                    if (isHeader) {
                        /**
                         * @type {HTMLInputElement}
                         */
                        const checkbox = element.querySelector('ui-checkbox');
                        if (checkbox) {
                            checkbox.addEventListener('change', (event) => {
                                const dump = this.getObjectByKey(this.dump.value, key);
                                const value = event.target.value;
                                if (dump.values) {
                                    dump.values = dump.values.map(v => value);
                                }
                                dump.value = value;
                                element.dispatch('change-dump');
                                if (value) {
                                    // bubbles the event when value is true
                                    const event = new Event('checkbox-enable', { bubbles: true, cancelable: true });
                                    checkbox.dispatchEvent(event);
                                }
                            });
                        }
                    }
                }
            });
        },
        /**
         *
         * @param {string} [eventInstigatorKey]
         */
        update(eventInstigatorKey) {
            this.$.baseProps.forEach((element) => {
                const key = element.getAttribute('key');
                const isEmpty = element.getAttribute('empty');
                let isShow = !key || this.getObjectByKey(this.dump.value, key).visible;
                const isHeader = element.getAttribute('slot') === 'header';
                const displayName = element.getAttribute('displayName');
                const dump = this.getObjectByKey(this.dump.value, key);
                const showflag = element.getAttribute('showflag');
                const disableflag = element.getAttribute('disableflag');
                let isDisable = false;
                if (typeof showflag === 'string') {
                    // only update the elements relate to eventInstigator
                    if (eventInstigatorKey) {
                        if (showflag.startsWith(`!${eventInstigatorKey}`)) {
                            const dump = this.getObjectByKey(this.dump.value, showflag.slice(1));
                            const isInvalid = propUtils.isMultipleInvalid(dump);
                            isShow = isShow && !isInvalid && !dump.value;
                        } else if (showflag.startsWith(eventInstigatorKey)) {
                            const dump = this.getObjectByKey(this.dump.value, showflag);
                            const isInvalid = propUtils.isMultipleInvalid(dump);
                            isShow = isShow && !isInvalid && dump.value;
                        } else {
                            return;
                        }
                    } else {
                        if (showflag.startsWith('!')) {
                            const dump = this.getObjectByKey(this.dump.value, showflag.slice(1));
                            const isInvalid = propUtils.isMultipleInvalid(dump);
                            isShow = isShow && !isInvalid && !dump.value;
                        } else {
                            const dump = this.getObjectByKey(this.dump.value, showflag);
                            const isInvalid = propUtils.isMultipleInvalid(dump);
                            isShow = isShow && !isInvalid && dump.value;
                        }
                    }
                } else if (typeof disableflag === 'string') {
                    // only update the elements relate to eventInstigator
                    if (eventInstigatorKey) {
                        const contentSlot = element.querySelector('[slot=content]');
                        if (!contentSlot) {
                            return;
                        }
                        if (disableflag.startsWith(`!${eventInstigatorKey}`)) {
                            const dump = this.getObjectByKey(this.dump.value, disableflag.slice(1));
                            const isInvalid = propUtils.isMultipleInvalid(dump) || !dump.value;
                            if (isInvalid) {
                                contentSlot.setAttribute('disabled', true);
                            } else if (contentSlot.hasAttribute('disabled')) {
                                contentSlot.removeAttribute('disabled');
                            }
                        } else if (disableflag.startsWith(eventInstigatorKey)) {
                            const dump = this.getObjectByKey(this.dump.value, disableflag);
                            const isInvalid = propUtils.isMultipleInvalid(dump) || !!dump.value;
                            if (isInvalid) {
                                contentSlot.setAttribute('disabled', true);
                            } else if (contentSlot.hasAttribute('disabled')) {
                                contentSlot.removeAttribute('disabled');
                            }
                        } else {
                            return;
                        }
                    } else {
                        if (disableflag.startsWith('!')) {
                            const dump = this.getObjectByKey(this.dump.value, disableflag.slice(1));
                            const isInvalid = propUtils.isMultipleInvalid(dump);
                            isDisable = isInvalid || !dump.value;
                        } else {
                            const dump = this.getObjectByKey(this.dump.value, disableflag);
                            const isInvalid = propUtils.isMultipleInvalid(dump);
                            isDisable = isInvalid || !!dump.value;
                        }
                    }
                }
                else if (eventInstigatorKey) {
                    // skip all element without showflag
                    return;
                }

                dump.displayName = displayName;
                if (!isEmpty) {
                    if (isShow) {
                        element.render(dump);
                    }
                    if (typeof disableflag === 'string') {
                        const contentSlot = element.querySelector('[slot=content]');
                        if (contentSlot) {
                            if (isDisable) {
                                contentSlot.setAttribute('disabled', true);
                            } else if (contentSlot.hasAttribute('disabled')) {
                                contentSlot.removeAttribute('disabled');
                            }
                        }
                    }
                } else {
                    const label = element.querySelector('ui-label');
                    if (label) {
                        const labelflag = element.getAttribute('labelflag');
                        if (labelflag) {
                            const dump = this.getObjectByKey(this.dump.value, labelflag);
                            label.setAttribute('value', propUtils.getName(dump));
                            label.setAttribute('tooltip', dump.tooltip);
                        }
                    }
                    if (isHeader) {
                        const checkbox = element.querySelector('ui-checkbox');
                        if (checkbox) {
                            checkbox.setAttribute('value', dump.value);
                            checkbox.invalid = propUtils.isMultipleInvalid(dump);
                        }
                    }

                    element.dump = dump;
                }
                element.style = isShow ? '' : 'display: none;';
            });
        },
    },
    customProps: {
        update() {
            propUtils.updateCustomPropElements(this.$.customProps, excludeList, this.dump, (element, prop) => {
                element.className = 'customProp';
                if (prop.dump.visible) {
                    element.render(prop.dump);
                }
                element.hidden = !prop.dump.visible;
            });
        },
    },
    noisePreview: {
        async update() {
            if (!this.dump?.value?.uuid?.values && !this.dump?.value?.uuid?.value) { return; }
            let uuid = this.dump.value.uuid.values ? this.dump.value.uuid.values[0] : this.dump.value.uuid.value;
            if (!uuid) { return; }
            let data = await Editor.Message.request(propUtils.getMessageProtocolScene(this.$this), 'execute-component-method', {
                uuid,
                name: 'getNoisePreview',
                args: [100, 100],
            });
            if (data.length === 0) { return; }

            data = data.reduce((result, item) => {
                const value = item * 255;
                const rgba = [value, value, value, 255];
                result.push(...rgba);
                return result;
            }, []);

            const imageData = new ImageData(new Uint8ClampedArray(data), 100, 100);
            const context = this.$.noisePreview.getContext('2d');
            context.putImageData(imageData, 0, 0);
        },
    },
    useGPU: {
        changeState(useGPU) {
            if (useGPU) {
                this.$.cpuMaterial.setAttribute('state-disabled', '');
                this.$.trailMaterial.setAttribute('state-disabled', '');
                this.$.gpuMaterial.removeAttribute('state-disabled');
            } else {
                this.$.cpuMaterial.removeAttribute('state-disabled');
                this.$.trailMaterial.removeAttribute('state-disabled');
                this.$.gpuMaterial.setAttribute('state-disabled', '');
            }
        },
        ready() {
            this.$.useGPU.addEventListener('change', (event) => {
                uiElements.useGPU.changeState(event.target.value);
            });
        },
        update() {
            uiElements.useGPU.changeState.call(this, this.dump.value.renderer.value.useGPU.value);
        },
    },
};
exports.$ = {
    customProps: '#customProps',
    emitFromSelect: '#emitFromSelect',
    showBounds: '#showBounds',
    resetBounds: '#resetBounds',
    noisePreview: '#noisePreview',
    useGPU: '#use-gpu',
    cpuMaterial: '.cpu-material',
    gpuMaterial: '.gpu-material',
    trailMaterial: '.trail-material',
};
exports.ready = function() {
    for (const key in uiElements) {
        const element = uiElements[key];
        if (typeof element.ready === 'function') {
            element.ready.call(this);
        }
    }
};
exports.update = function(dump) {
    this.dump = dump;
    for (const key in uiElements) {
        const element = uiElements[key];
        if (typeof element.update === 'function') {
            element.update.call(this);
        }
    }
};
exports.style = /* css */`
    .particle-system-component > .content > .indent {
        margin-left: calc(var(--ui-prop-margin-left) + 8px);
    }
    .particle-system-component ui-section .header ui-checkbox {
        margin-right: 4px;
    }
    .trail-material[state-disabled] {
        opacity: 0.5;
    }
    .gpu-material[state-disabled] {
        opacity: 0.5;
    }
    .cpu-material[state-disabled] {
        opacity: 0.5;
    }
`;

exports.listeners = {
    async 'change-dump'(event) {

        const target = event.target;
        if (!target) {
            return;
        }

        const dump = event.target.dump;
        if (!dump) {
            return;
        }

        // renderMode选择mesh次数
        if (dump.path.endsWith('renderer.renderMode') && dump.value === 4) {
            Editor.Metrics._trackEventWithTimer({
                category: 'particleSystem',
                id: 'A100011',
                value: 1,
            });
        }

        // 粒子系统其他模块埋点
        const trackMap = {
            'noiseModule.enable': 'A100000',
            'shapeModule.enable': 'A100001',
            velocityOvertimeModule: 'A100002',
            forceOvertimeModule: 'A100003',
            'sizeOvertimeModule.enable': 'A100004',
            'rotationOvertimeModule.enable': 'A100005',
            colorOverLifetimeModule: 'A100006',
            textureAnimationModule: 'A100007',
            'limitVelocityOvertimeModule.enable':'A100008',
            'trailModule.enable': 'A100009',
        };

        const dumpKey = Object.keys(trackMap).find(key => dump.path.endsWith(key));
        if (!dumpKey) { return; }

        const value = dump.type === 'Boolean' ? dump.value : dump.value.enable.value;
        if (!value) { return; }

        Editor.Metrics._trackEventWithTimer({
            category: 'particleSystem',
            id: trackMap[dumpKey],
            value: 1,
        });
    },
};
