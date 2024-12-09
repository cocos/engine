/****************************************************************************
 Copyright (c) 2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

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
const cacheManager = require('./jsb-cache-manager');

// @ts-expect-error jsb polyfills
(function () {
    if (globalThis.spine === undefined || globalThis.middleware === undefined) return;
    if (cc.internal.SpineSkeletonData === undefined) return;
    const spine = globalThis.spine;
    const middleware = globalThis.middleware;

    middleware.generateGetSet(spine);

    // spine global time scale
    Object.defineProperty(spine, 'timeScale', {
        get () {
            return this._timeScale;
        },
        set (value) {
            this._timeScale = value;
            spine.SkeletonAnimation.setGlobalTimeScale(value);
        },
        configurable: true,
    });

    const _slotColor = cc.color(0, 0, 255, 255);
    const _boneColor = cc.color(255, 0, 0, 255);
    const _meshColor = cc.color(255, 255, 0, 255);
    const _originColor = cc.color(0, 255, 0, 255);

    const skeletonDataProto = cc.internal.SpineSkeletonData.prototype;
    let _gTextureIdx = 1;
    const _textureKeyMap = {};
    const _textureMap = new WeakMap();

    const skeletonDataMgr = spine.SkeletonDataMgr.getInstance();
    spine.skeletonDataMgr = skeletonDataMgr;
    skeletonDataMgr.setDestroyCallback((textureIndex) => {
        if (!textureIndex) return;
        const texKey = _textureKeyMap[textureIndex];
        if (texKey && _textureMap.has(texKey)) {
            _textureMap.delete(texKey);
            delete _textureKeyMap[textureIndex];
        }
    });

    const skeletonCacheMgr = spine.SkeletonCacheMgr.getInstance();
    spine.skeletonCacheMgr = skeletonCacheMgr;
    skeletonDataProto.destroy = function () {
        this.reset();
        skeletonCacheMgr.removeSkeletonCache(this._uuid);
        cc.Asset.prototype.destroy.call(this);
    };

    skeletonDataProto.reset = function () {
        if (this._skeletonCache) {
            spine.disposeSkeletonData(this._uuid);
            this._jsbTextures = null;
            this._skeletonCache = null;
        }
        this._atlasCache = null;
    };

    skeletonDataProto.getRuntimeData = function () {
        if (!this._skeletonCache) {
            this.init();
        }
        return this._skeletonCache;
    };

    skeletonDataProto.init = function () {
        if (this._skeletonCache) return;

        const uuid = this._uuid;
        if (!uuid) {
            cc.errorID(7504);
            return;
        }

        const atlasText = this.atlasText;
        if (!atlasText) {
            cc.errorID(7508, this.name);
            return;
        }

        const textures = this.textures;
        const textureNames = this.textureNames;
        if (!(textures && textures.length > 0 && textureNames && textureNames.length > 0)) {
            cc.errorID(7507, this.name);
            return;
        }

        const jsbTextures = {};
        for (let i = 0; i < textures.length; ++i) {
            const texture = textures[i];
            const textureIdx = this.recordTexture(texture);
            const spTex = new middleware.Texture2D();
            spTex.setRealTextureIndex(textureIdx);
            spTex.setPixelsWide(texture.width);
            spTex.setPixelsHigh(texture.height);
            spTex.setRealTexture(texture);
            jsbTextures[textureNames[i]] = spTex;
        }
        this._jsbTextures = jsbTextures;

        let filePath = this.skeletonJsonStr;
        if (!filePath) {
            filePath = cacheManager.getCache(this.nativeUrl) || this.nativeUrl;
        }
        this._skeletonCache = spine.initSkeletonData(uuid, filePath, atlasText, jsbTextures, this.scale);
        if (this._skeletonCache) {
            this.width = this._skeletonCache.width;
            this.height = this._skeletonCache.height;
        }
    };

    skeletonDataProto.recordTexture = function (texture) {
        const index = _gTextureIdx;
        const texKey = _textureKeyMap[index] = { key: index };
        _textureMap.set(texKey, texture);
        _gTextureIdx++;
        return index;
    };

    skeletonDataProto.getTextureByIndex = function (textureIdx) {
        const texKey = _textureKeyMap[textureIdx];
        if (!texKey) return null;
        return _textureMap.get(texKey);
    };

    const animation = spine.SkeletonAnimation.prototype;
    // The methods are added to be compatibility with old versions.
    animation.setCompleteListener = function (listener) {
        this._compeleteListener = listener;
        this.setCompleteListenerNative(function (trackEntry) {
            const loopCount = Math.floor(trackEntry.trackTime / trackEntry.animationEnd);
            this._compeleteListener && this._compeleteListener(trackEntry, loopCount);
        });
    };

    // The methods are added to be compatibility with old versions.
    animation.setTrackCompleteListener = function (trackEntry, listener) {
        this._trackCompeleteListener = listener;
        this.setTrackCompleteListenerNative(trackEntry, function (trackEntryNative) {
            const loopCount = Math.floor(trackEntryNative.trackTime / trackEntryNative.animationEnd);
            this._trackCompeleteListener && this._trackCompeleteListener(trackEntryNative, loopCount);
        });
    };

    // Temporary solution before upgrade the Spine API
    animation.setAnimationListener = function (target, callback) {
        this._target = target;
        this._callback = callback;

        // eslint-disable-next-line no-undef
        const AnimationEventType = legacyCC.internal.SpineAnimationEventType;

        this.setStartListener(function (trackEntry) {
            if (this._target && this._callback) {
                this._callback.call(this._target, this, trackEntry, AnimationEventType.START, null, 0);
            }
        });

        this.setInterruptListener(function (trackEntry) {
            if (this._target && this._callback) {
                this._callback.call(this._target, this, trackEntry, AnimationEventType.INTERRUPT, null, 0);
            }
        });

        this.setEndListener(function (trackEntry) {
            if (this._target && this._callback) {
                this._callback.call(this._target, this, trackEntry, AnimationEventType.END, null, 0);
            }
        });

        this.setDisposeListener(function (trackEntry) {
            if (this._target && this._callback) {
                this._callback.call(this._target, this, trackEntry, AnimationEventType.DISPOSE, null, 0);
            }
        });

        this.setCompleteListener(function (trackEntry, loopCount) {
            if (this._target && this._callback) {
                this._callback.call(this._target, this, trackEntry, AnimationEventType.COMPLETE, null, loopCount);
            }
        });

        this.setEventListener(function (trackEntry, event) {
            if (this._target && this._callback) {
                this._callback.call(this._target, this, trackEntry, AnimationEventType.EVENT, event, 0);
            }
        });
    };

    const skeleton = cc.internal.SpineSkeleton.prototype;
    const AnimationCacheMode = cc.internal.SpineSkeleton.AnimationCacheMode;
    Object.defineProperty(skeleton, 'paused', {
        get () {
            return this._paused || false;
        },
        set (value) {
            this._paused = value;
            if (this._nativeSkeleton) {
                this._nativeSkeleton.paused(value);
            }
        },
    });

    Object.defineProperty(skeleton, 'premultipliedAlpha', {
        get () {
            if (this._premultipliedAlpha === undefined) {
                return true;
            }
            return this._premultipliedAlpha;
        },
        set (value) {
            this._premultipliedAlpha = value;
            if (this._nativeSkeleton) {
                this._nativeSkeleton.setOpacityModifyRGB(this._premultipliedAlpha);
            }
        },
    });

    Object.defineProperty(skeleton, 'timeScale', {
        get () {
            if (this._timeScale === undefined) return 1.0;
            return this._timeScale;
        },
        set (value) {
            this._timeScale = value;
            if (this._nativeSkeleton) {
                this._nativeSkeleton.setTimeScale(this._timeScale);
            }
        },
    });

    const _updateMaterial = skeleton.updateMaterial;
    skeleton.updateMaterial = function () {
        _updateMaterial.call(this);
        if (this._nativeSkeleton) {
            const mat = this.getMaterialTemplate();
            this._nativeSkeleton.setMaterial(mat);
        }
    };

    const _updateDebugDraw = skeleton._updateDebugDraw;
    skeleton._updateDebugDraw = function () {
        _updateDebugDraw.call(this);
        if (this._nativeSkeleton && !this.isAnimationCached()) {
            this._nativeSkeleton.setDebugMeshEnabled(this.debugMesh);
            this._nativeSkeleton.setDebugSlotsEnabled(this.debugSlots);
            this._nativeSkeleton.setDebugBonesEnabled(this.debugBones);
        }
    };

    const _updateUseTint = skeleton._updateUseTint;
    skeleton._updateUseTint = function () {
        _updateUseTint.call(this);
        if (this._nativeSkeleton) {
            this._nativeSkeleton.setUseTint(this.useTint);
        }
    };

    skeleton._updateBatch = function () {
        if (this._nativeSkeleton) {
            this._renderEntity.setUseLocal(!this.enableBatch);
            this._nativeSkeleton.setBatchEnabled(this.enableBatch);
            this.markForUpdateRenderData();
        }
    };

    skeleton.setSkeletonData = function (skeletonData) {
        if (skeletonData.width != null && skeletonData.height != null) {
            const uiTrans = this.node._uiProps.uiTransformComp;
            uiTrans.setContentSize(skeletonData.width, skeletonData.height);
        }

        const uuid = skeletonData._uuid;
        if (!uuid) {
            cc.errorID(7504);
            return;
        }

        const texValues = skeletonData.textures;
        const texKeys = skeletonData.textureNames;
        if (!(texValues && texValues.length > 0 && texKeys && texKeys.length > 0)) {
            cc.errorID(7507, skeletonData.name);
            return;
        }

        if (this._nativeSkeleton) {
            this._nativeSkeleton.stopSchedule();
            this._nativeSkeleton._comp = null;
            this._nativeSkeleton = null;
        }

        let nativeSkeleton = null;
        if (this.isAnimationCached()) {
            nativeSkeleton = new spine.SkeletonCacheAnimation(uuid, this._cacheMode === AnimationCacheMode.SHARED_CACHE);
        } else {
            nativeSkeleton = new spine.SkeletonAnimation();
            try {
                spine.initSkeletonRenderer(nativeSkeleton, uuid);
            } catch (e) {
                cc._throw(e);
                return;
            }
            nativeSkeleton.setDebugSlotsEnabled(this.debugSlots);
            nativeSkeleton.setDebugMeshEnabled(this.debugMesh);
            nativeSkeleton.setDebugBonesEnabled(this.debugBones);
        }

        this._nativeSkeleton = nativeSkeleton;
        nativeSkeleton._comp = this;
        if (this.shouldSchedule) nativeSkeleton.beginSchedule();

        nativeSkeleton.setUseTint(this.useTint);
        nativeSkeleton.setOpacityModifyRGB(this.premultipliedAlpha);
        nativeSkeleton.setTimeScale(this.timeScale);
        nativeSkeleton.setBatchEnabled(this.enableBatch);
        const compColor = this.color;
        nativeSkeleton.setColor(compColor.r, compColor.g, compColor.b, compColor.a);
        const materialTemplate = this.getMaterialTemplate();
        nativeSkeleton.setMaterial(materialTemplate);
        this._renderEntity.setUseLocal(!this.enableBatch);
        nativeSkeleton.setRenderEntity(this._renderEntity.nativeObj);

        this._skeleton = nativeSkeleton.getSkeleton();

        // init skeleton listener
        this._startListener && this.setStartListener(this._startListener);
        this._endListener && this.setEndListener(this._endListener);
        this._completeListener && this.setCompleteListener(this._completeListener);
        this._eventListener && this.setEventListener(this._eventListener);
        this._interruptListener && this.setInterruptListener(this._interruptListener);
        this._disposeListener && this.setDisposeListener(this._disposeListener);
        this._sharedBufferOffset = nativeSkeleton.getSharedBufferOffset();
        this._useAttach = false;

        this.markForUpdateRenderData();
    };

    skeleton._updateColor = function () {
        if (this._nativeSkeleton) {
            const compColor = this._color;
            this.setEntityColorDirty(true);
            this.setEntityColor(compColor);
            this.setEntityOpacity(this.node._uiProps.localOpacity);
            this._nativeSkeleton.setColor(compColor.r, compColor.g, compColor.b, compColor.a);
            this.markForUpdateRenderData();
        }
    };

    skeleton.setAnimationStateData = function (stateData) {
        if (this._nativeSkeleton && !this.isAnimationCached()) {
            this._stateData = stateData;
            this._nativeSkeleton.setAnimationStateData(stateData);
        }
    };

    const _onEnable = skeleton.onEnable;
    skeleton.onEnable = function () {
        if (_onEnable) {
            _onEnable.call(this);
        }
        this.shouldSchedule = true;
        if (this._nativeSkeleton) {
            this._nativeSkeleton.onEnable();
        }
        middleware.retain();
    };

    const _onDisable = skeleton.onDisable;
    skeleton.onDisable = function () {
        if (_onDisable) {
            _onDisable.call(this);
        }

        if (this._nativeSkeleton) {
            this._nativeSkeleton.onDisable();
        }
        middleware.release();
    };

    skeleton.setVertexEffectDelegate = function (effectDelegate) {
        if (this._nativeSkeleton && !this.isAnimationCached()) {
            this._nativeSkeleton.setVertexEffectDelegate(effectDelegate);
        }
    };

    // eslint-disable-next-line no-unused-vars
    skeleton.updateAnimation = function (dt) {
        const nativeSkeleton = this._nativeSkeleton;
        if (!nativeSkeleton) return;

        const node = this.node;
        if (!node) return;

        if (this.__preColor__ === undefined || !this.color.equals(this.__preColor__)) {
            const compColor = this.color;
            nativeSkeleton.setColor(compColor.r, compColor.g, compColor.b, compColor.a);
            this.__preColor__ = compColor;
        }

        const socketNodes = this.socketNodes;
        if (!this._useAttach && socketNodes.size > 0) {
            this._useAttach = true;
            nativeSkeleton.setAttachEnabled(true);
        }
    };

    skeleton.updateWorldTransform = function () {
        if (this._nativeSkeleton && !this.isAnimationCached()) {
            this._nativeSkeleton.updateWorldTransform();
        }
    };

    skeleton.setToSetupPose = function () {
        if (this._nativeSkeleton) {
            this._nativeSkeleton.setToSetupPose();
        }
    };

    skeleton.setBonesToSetupPose = function () {
        if (this._nativeSkeleton) {
            this._nativeSkeleton.setBonesToSetupPose();
        }
    };

    skeleton.setSlotsToSetupPose = function () {
        if (this._nativeSkeleton) {
            this._nativeSkeleton.setSlotsToSetupPose();
        }
    };

    skeleton.setSlotsRange = function (startSlotIndex, endSlotIndex) {
        if (this._nativeSkeleton && !this.isAnimationCached()) {
            this._nativeSkeleton.setSlotsRange(startSlotIndex, endSlotIndex);
        }
    };

    skeleton.updateAnimationCache = function (animName) {
        if (!this.isAnimationCached()) return;
        if (this._nativeSkeleton) {
            if (animName) {
                this._nativeSkeleton.updateAnimationCache(animName);
            } else {
                this._nativeSkeleton.updateAllAnimationCache();
            }
        }
    };

    skeleton.invalidAnimationCache = function () {
        if (!this.isAnimationCached()) return;
        if (this._nativeSkeleton) {
            this._nativeSkeleton.updateAllAnimationCache();
        }
    };

    skeleton.findBone = function (boneName) {
        if (this._nativeSkeleton) return this._nativeSkeleton.findBone(boneName);
        return null;
    };

    skeleton.findSlot = function (slotName) {
        if (this._nativeSkeleton) return this._nativeSkeleton.findSlot(slotName);
        return null;
    };

    skeleton.setSkin = function (skinName) {
        if (this._nativeSkeleton) return this._nativeSkeleton.setSkin(skinName);
        return null;
    };

    skeleton.getAttachment = function (slotName, attachmentName) {
        if (this._nativeSkeleton) return this._nativeSkeleton.getAttachment(slotName, attachmentName);
        return null;
    };

    skeleton.setAttachment = function (slotName, attachmentName) {
        this._nativeSkeleton && this._nativeSkeleton.setAttachment(slotName, attachmentName);
    };

    // eslint-disable-next-line no-unused-vars
    skeleton.getTextureAtlas = function (regionAttachment) {
        cc.warn('Spine Skeleton getTextureAtlas not support in native');
        return null;
    };

    skeleton.setMix = function (fromAnimation, toAnimation, duration) {
        if (this._nativeSkeleton && !this.isAnimationCached()) {
            this._nativeSkeleton.setMix(fromAnimation, toAnimation, duration);
        }
    };

    skeleton.setAnimation = function (trackIndex, name, loop) {
        const strName = name.toString();
        this._playTimes = loop ? 0 : 1;
        let res = null;
        if (this._nativeSkeleton) {
            if (!this._nativeSkeleton.findAnimation(strName)) return res;
            this._animationName = strName;
            if (this.isAnimationCached()) {
                res = this._nativeSkeleton.setAnimation(strName, loop);
            } else {
                res = this._nativeSkeleton.setAnimation(trackIndex, strName, loop);
            }
            /**
             * note: since native spine animation update called after Director.EVENT_BEFORE_UPDATE
             * and before setAnimation. it's need to update native animation to first frame directly.
             */
            this._nativeSkeleton.update(0);
        }
        return res;
    };

    skeleton.addAnimation = function (trackIndex, name, loop, delay) {
        if (this._nativeSkeleton) {
            delay = delay || 0;
            if (this.isAnimationCached()) {
                return this._nativeSkeleton.addAnimation(name, loop, delay);
            } else {
                return this._nativeSkeleton.addAnimation(trackIndex, name, loop, delay);
            }
        }
        return null;
    };

    skeleton.findAnimation = function (name) {
        if (this._nativeSkeleton) return this._nativeSkeleton.findAnimation(name);
        return null;
    };

    skeleton.getCurrent = function (trackIndex) {
        if (this._nativeSkeleton && !this.isAnimationCached()) {
            return this._nativeSkeleton.getCurrent(trackIndex);
        }
        return null;
    };

    skeleton.clearTracks = function () {
        if (this._nativeSkeleton && !this.isAnimationCached()) {
            this._nativeSkeleton.clearTracks();
        }
    };

    skeleton.clearTrack = function (trackIndex) {
        if (this._nativeSkeleton && !this.isAnimationCached()) {
            this._nativeSkeleton.clearTrack(trackIndex);
        }
    };

    skeleton.setStartListener = function (listener) {
        this._startListener = listener;
        if (this._nativeSkeleton) {
            if (this.isAnimationCached()) {
                this._nativeSkeleton.setStartListener(function (animationName) {
                    const self = this._comp;
                    self._startEntry.animation.name = animationName;
                    self._startListener && self._startListener(self._startEntry);
                });
            } else {
                this._nativeSkeleton.setStartListener(listener);
            }
        }
    };

    skeleton.setInterruptListener = function (listener) {
        this._interruptListener = listener;
        if (this._nativeSkeleton && !this.isAnimationCached()) {
            this._nativeSkeleton.setInterruptListener(listener);
        }
    };

    skeleton.setEndListener = function (listener) {
        this._endListener = listener;
        if (this._nativeSkeleton) {
            if (this.isAnimationCached()) {
                this._nativeSkeleton.setEndListener(function (animationName) {
                    const self = this._comp;
                    self._endEntry.animation.name = animationName;
                    self._endListener && self._endListener(self._endEntry);
                });
            } else {
                this._nativeSkeleton.setEndListener(listener);
            }
        }
    };

    skeleton.setDisposeListener = function (listener) {
        this._disposeListener = listener;
        if (this._nativeSkeleton && !this.isAnimationCached()) {
            this._nativeSkeleton.setDisposeListener(listener);
        }
    };

    skeleton.setCompleteListener = function (listener) {
        this._completeListener = listener;
        if (this._nativeSkeleton) {
            if (this.isAnimationCached()) {
                this._nativeSkeleton.setCompleteListener(function (animationName) {
                    const self = this._comp;
                    self._endEntry.animation.name = animationName;
                    self._completeListener && self._completeListener(self._endEntry);
                });
            } else {
                this._nativeSkeleton.setCompleteListener(listener);
            }
        }
    };

    skeleton.setEventListener = function (listener) {
        this._eventListener = listener;
        if (this._nativeSkeleton && !this.isAnimationCached()) {
            this._nativeSkeleton.setEventListener(listener);
        }
    };

    skeleton.setTrackStartListener = function (entry, listener) {
        if (this._nativeSkeleton && !this.isAnimationCached()) {
            this._nativeSkeleton.setTrackStartListener(entry, listener);
        }
    };

    skeleton.setTrackInterruptListener = function (entry, listener) {
        if (this._nativeSkeleton && !this.isAnimationCached()) {
            this._nativeSkeleton.setTrackInterruptListener(entry, listener);
        }
    };

    skeleton.setTrackEndListener = function (entry, listener) {
        if (this._nativeSkeleton && !this.isAnimationCached()) {
            this._nativeSkeleton.setTrackEndListener(entry, listener);
        }
    };

    skeleton.setTrackDisposeListener = function (entry, listener) {
        if (this._nativeSkeleton && !this.isAnimationCached()) {
            this._nativeSkeleton.setTrackDisposeListener(entry, listener);
        }
    };

    skeleton.setTrackCompleteListener = function (entry, listener) {
        if (this._nativeSkeleton && !this.isAnimationCached()) {
            this._nativeSkeleton.setTrackCompleteListener(entry, listener);
        }
    };

    skeleton.setTrackEventListener = function (entry, listener) {
        if (this._nativeSkeleton && !this.isAnimationCached()) {
            this._nativeSkeleton.setTrackEventListener(entry, listener);
        }
    };

    skeleton.getState = function () {
        if (this._nativeSkeleton && !this.isAnimationCached()) {
            return this._nativeSkeleton.getState();
        }
        return null;
    };

    skeleton._ensureListener = function () {
        cc.warn('Spine Skeleton _ensureListener not need in native');
    };

    skeleton._updateSkeletonData = function () {
        if (this.skeletonData) {
            this.skeletonData.init();
            this.setSkeletonData(this.skeletonData);

            this._indexBoneSockets();
            this._updateSocketBindings();
            this.attachUtil.init(this);
            this._preCacheMode = this._cacheMode;

            this.defaultSkin && this._nativeSkeleton.setSkin(this.defaultSkin);
            this.animation = this.defaultAnimation;
        } else if (this._nativeSkeleton) {
            this._nativeSkeleton.stopSchedule();
            this._nativeSkeleton._comp = null;
            this._nativeSkeleton = null;
        }
        this._needUpdateSkeltonData = false;
    };

    const _onDestroy = skeleton.onDestroy;
    skeleton.onDestroy = function () {
        _onDestroy.call(this);
        if (this._nativeSkeleton) {
            this._nativeSkeleton.stopSchedule();
            this._nativeSkeleton._comp = null;
            this._nativeSkeleton = null;
        }
        this._stateData = null;
    };

    skeleton._render = function () {
        const nativeSkeleton = this._nativeSkeleton;
        if (!nativeSkeleton) return;

        if (!this.isAnimationCached() && (this.debugBones || this.debugSlots || this.debugMesh) && this._debugRenderer) {
            const graphics = this._debugRenderer;
            graphics.clear();
            graphics.lineWidth = 5;

            const debugData = this._debugData || nativeSkeleton.getDebugData();
            if (!debugData) return;
            let debugIdx = 0; let debugType = 0; let debugLen = 0;

            debugType = debugData[debugIdx++];
            while (debugType !== 0) {
                debugLen = debugData[debugIdx++];

                switch (debugType) {
                    case 1: // slots
                        graphics.strokeColor = _slotColor;
                        for (let i = 0; i < debugLen; i += 8) {
                            graphics.moveTo(debugData[debugIdx++], debugData[debugIdx++]);
                            graphics.lineTo(debugData[debugIdx++], debugData[debugIdx++]);
                            graphics.lineTo(debugData[debugIdx++], debugData[debugIdx++]);
                            graphics.lineTo(debugData[debugIdx++], debugData[debugIdx++]);
                            graphics.close();
                            graphics.stroke();
                        }
                    break;
                    case 2: // mesh
                        graphics.strokeColor = _meshColor;
                        for (let i = 0; i < debugLen; i += 6) {
                            graphics.moveTo(debugData[debugIdx++], debugData[debugIdx++]);
                            graphics.lineTo(debugData[debugIdx++], debugData[debugIdx++]);
                            graphics.lineTo(debugData[debugIdx++], debugData[debugIdx++]);
                            graphics.close();
                            graphics.stroke();
                        }
                    break;
                    case 3: // bones
                        graphics.strokeColor = _boneColor;
                        graphics.fillColor = _slotColor; // Root bone color is same as slot color.
                        for (let i = 0; i < debugLen; i += 4) {
                            const bx = debugData[debugIdx++];
                            const by = debugData[debugIdx++];
                            const x = debugData[debugIdx++];
                            const y = debugData[debugIdx++];

                            // Bone lengths.
                            graphics.moveTo(bx, by);
                            graphics.lineTo(x, y);
                            graphics.stroke();

                            // Bone origins.
                            graphics.circle(bx, by, Math.PI * 1.5);
                            graphics.fill();
                            if (i === 0) {
                                graphics.fillColor = _originColor;
                            }
                        }
                    break;
                    default:
                    return;
                }
                debugType = debugData[debugIdx++];
            }
        }
    };

    const _tempAttachMat4 = cc.mat4();
    skeleton.syncAttachedNode = function () {
        const nativeSkeleton = this._nativeSkeleton;
        if (!nativeSkeleton) return;
        const socketNodes = this.socketNodes;
        if (socketNodes.size > 0 && this._useAttach) {
            const sharedBufferOffset = this._sharedBufferOffset;
            if (!sharedBufferOffset) return;
            const attachInfoMgr = middleware.attachInfoMgr;
            const attachInfo = attachInfoMgr.attachInfo;

            const attachInfoOffset = sharedBufferOffset[0];
            // reset attach info offset
            sharedBufferOffset[0] = 0;
            for (const boneIdx of socketNodes.keys()) {
                const boneNode = socketNodes.get(boneIdx);
                // Node has been destroy
                if (!boneNode || !boneNode.isValid) {
                    socketNodes.delete(boneIdx);
                    continue;
                }

                const tm = _tempAttachMat4;
                const matOffset = attachInfoOffset + boneIdx * 16;
                tm.m00 = attachInfo[matOffset];
                tm.m01 = attachInfo[matOffset + 1];
                tm.m04 = attachInfo[matOffset + 4];
                tm.m05 = attachInfo[matOffset + 5];
                tm.m12 = attachInfo[matOffset + 12];
                tm.m13 = attachInfo[matOffset + 13];
                boneNode.matrix = tm;
            }
        }
    };

    skeleton.setSlotTexture = function (slotName, tex2d, createNew) {
        if (this.isAnimationCached()) {
            console.error(`Cached mode can't change texture of slot`);
            return;
        }
        if (!this._nativeSkeleton) return;
        const slot = this.findSlot(slotName);
        if (!slot) {
            console.error(`No slot named:${slotName}`);
            return;
        }
        const createNewAttachment = createNew || false;
        this._nativeSkeleton.setSlotTexture(slotName, tex2d, createNewAttachment);
    };

    //////////////////////////////////////////
    // assembler
    const assembler = cc.internal.SpineAssembler;

    // eslint-disable-next-line no-unused-vars
    assembler.createData = function (comp) {
    };

    assembler.updateRenderData = function (comp) {
        comp._render();
        comp.syncAttachedNode();
    };

    // eslint-disable-next-line no-unused-vars
    assembler.fillBuffers = function (comp, renderer) {
    };
}());
