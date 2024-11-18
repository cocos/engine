/****************************************************************************
 Copyright (c) 2022 Xiamen Yaji Software Co., Ltd.

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

if (cc.internal.VideoPlayer) {
    const { EventType } = cc.internal.VideoPlayer;

    const vec3 = cc.Vec3;
    const mat4 = cc.Mat4;
    const _mat4_temp = new mat4();

    const _topLeft = new vec3();
    const _bottomRight = new vec3();
    let kVideoTag = 0;
    const videoPlayers = [];
    const VideoEvent = {
        PLAYING: 0,
        PAUSED: 1,
        STOPPED: 2,
        COMPLETED: 3,
        META_LOADED: 4,
        CLICKED: 5,
        READY_TO_PLAY: 6,
        UPDATE: 7,
        QUIT_FULLSCREEN: 1000,
    };

    cc.internal.VideoPlayerImplManager.getImpl = function (componenet) {
        return new VideoPlayerImplOpenHarmony(componenet);
    };
    window.oh.onVideoEvent = (args) => {
        const data = JSON.parse(args);
        videoPlayers.forEach((player) => {
            if (player.index === data.videoTag) {
                player.dispatchEvent(data.videoEvent, data.args);
            }
        });
    };
    class VideoPlayer {
        constructor () {
            this._events = {};
            this._currentTime = 0;
            this._duration = 0;
            this._videoIndex = kVideoTag++;
            this._matViewProj_temp = new mat4();
            window.oh.postMessage('createVideo', this._videoIndex);
            videoPlayers.push(this);
        }
        get index () {
            return this._videoIndex;
        }
        play () {
            window.oh.postMessage('startVideo', this._videoIndex);
        }

        // private function
        _isURL (url) {
            const regexp = /((http|https):\/\/([\w\-]+\.)+[\w\-]+(\/[\w\u4e00-\u9fa5\-\.\/?\@\%\!\&=\+\~\:\#\;\,]*)?)/ig;
            if (regexp.test(url)) {
              return true;
            } else {
              return false;
            }
        }

        setURL (url) {
            if (this._isURL(url)) {
                window.oh.postMessage('setVideoUrl', { tag: this._videoIndex, resourceType: 0, url });
            } else {
                window.oh.postMessage('setVideoUrl', { tag: this._videoIndex, resourceType: 1, url });
            }
        }

        pause () {
            window.oh.postMessage('pauseVideo', this._videoIndex);
        }
        setVisible (visible) {
            window.oh.postMessage('setVideoVisible', { tag: this._videoIndex, visible });
        }
        resume () {
            window.oh.postMessage('resumeVideo', this._videoIndex);
        }
        currentTime () {
            window.oh.postSyncMessage('currentTime', this._videoIndex).then((result) => {
                this._currentTime = result;
            });
            return this._currentTime;
        }
        stop () {
            window.oh.postMessage('stopVideo', this._videoIndex);
        }
        seekTo (val) {
            window.oh.postMessage('seekVideoTo', { tag: this._videoIndex, time: val });
        }
        duration () {
            window.oh.postSyncMessage('getVideoDuration', this._videoIndex).then((result) => {
                this._duration = result;
            });
            return this._duration;
        }
        destroy () {
            window.oh.postMessage('removeVideo', this._videoIndex);
        }
        setFullScreenEnabled (enable) {
            window.oh.postMessage('setFullScreenEnabled', { tag: this._videoIndex, fullScreen: enable });
        }
        setKeepAspectRatioEnabled (enable) {
            cc.warn('The platform does not support');
        }
        setFrame (x, y, w, h) {
            window.oh.postMessage('setVideoRect', { tag: this._videoIndex, x, y, w, h });
        }

        eventTypeToEventName (ev) {
            let evString;
            switch (ev) {
                case VideoEvent.PLAYING:
                    evString = 'play';
                    break;
                case VideoEvent.PAUSED:
                    evString = 'pause';
                    break;
                case VideoEvent.STOPPED:
                    evString = 'stoped';
                    break;
                case VideoEvent.COMPLETED:
                    evString = 'ended';
                    break;
                case VideoEvent.META_LOADED:
                    evString = 'loadedmetadata';
                    break;
                case VideoEvent.CLICKED:
                    evString = 'click';
                    break;
                case VideoEvent.READY_TO_PLAY:
                    evString = 'suspend';
                    break;
                case VideoEvent.UPDATE:
                    evString = 'update';
                    break;
                case VideoEvent.QUIT_FULLSCREEN:
                    evString = 'suspend';
                    break;
                default:
                    evString = 'none';
                    break;
            }
            return evString;
        }

        dispatchEvent (type, args) {
            const eventName = this.eventTypeToEventName(type);
            const listeners = this._events[eventName];

            if (listeners) {
                for (let i = 0; i < listeners.length; i++) {
                    listeners[i](args);
                }
            }
        }

        addEventListener (name, listener) {
            if (!this._events[name]) {
                this._events[name] = [];
            }
            this._events[name].push(listener);
        }

        removeEventListener (name, listener) {
            const listeners = this._events[name];

            if (listeners && listeners.length > 0) {
                for (let i = listeners.length; i--; i > 0) {
                    if (listeners[i] === listener) {
                        listeners.splice(i, 1);
                        break;
                    }
                }
            }
        }
    }

    class VideoPlayerImplOpenHarmony extends cc.internal.VideoPlayerImpl {
        constructor (componenet) {
            super(componenet);
            this._matViewProj_temp = new mat4();
            this._loaded = false;
        }

        syncClip (clip) {
            this.removeVideoPlayer();
            if (!clip) {
                return;
            }
            this.createVideoPlayer(clip._nativeAsset);
        }

        syncURL (url) {
            this.removeVideoPlayer();
            if (!url) {
                return;
            }
            this.createVideoPlayer(url);
        }

        onCanPlay (args = 0) {
            if (this._loaded) {
                return;
            }
            this._video._duration = args;
            this._loaded = true;
            this.video.setVisible(this._visible);
            this.dispatchEvent(EventType.READY_TO_PLAY);
            //this.delayedPlay();
        }

        onUpdate (args = 0) {
          if (this.video) {
            this.video._currentTime = args;
          }
        }

        _bindEvent () {
            this.video.addEventListener('loadedmetadata', this.onLoadedMetadata.bind(this));
            this.video.addEventListener('suspend', this.onCanPlay.bind(this));
            this.video.addEventListener('play', this.onPlay.bind(this));
            this.video.addEventListener('pause', this.onPause.bind(this));
            this.video.addEventListener('stoped', this.onStoped.bind(this));
            this.video.addEventListener('click', this.onClick.bind(this));
            this.video.addEventListener('ended', this.onEnded.bind(this));
            this.video.addEventListener('update', this.onUpdate.bind(this));
        }

        _unBindEvent () {
            this.video.removeEventListener('loadedmetadata', this.onLoadedMetadata.bind(this));
            this.video.removeEventListener('suspend', this.onCanPlay.bind(this));
            this.video.removeEventListener('play', this.onPlay.bind(this));
            this.video.removeEventListener('pause', this.onPause.bind(this));
            this.video.removeEventListener('stoped', this.onStoped.bind(this));
            this.video.removeEventListener('click', this.onClick.bind(this));
            this.video.removeEventListener('ended', this.onEnded.bind(this));
            this.video.removeEventListener('update', this.onUpdate.bind(this));
        }

        onLoadedMetadata () {
            this._loadedMeta = true;
            this._forceUpdate = true;
            if (this._visible) {
                this.enable();
            } else {
                this.disable();
            }
            this.dispatchEvent(EventType.META_LOADED);
            this.delayedFullScreen();
            this.delayedPlay();
        }

        createVideoPlayer (url) {
            this._video = new VideoPlayer();
            this._bindEvent();
            this._video.setVisible(this._visible);
            this._video.setURL(url);
            this._forceUpdate = true;
        }

        removeVideoPlayer () {
            const video = this.video;
            if (video) {
                video.stop();
                video.setVisible(false);
                video.destroy();
                this._unBindEvent();
                this._playing = false;
                this._loaded = false;
                this._loadedMeta = false;
                this._ignorePause = false;
                this._cachedCurrentTime = 0;
                this._video = null;
            }
        }

        getDuration () {
            if (!this.video) {
                return -1;
            }
            return this.video.duration();
        }

        syncPlaybackRate () {
            cc.warn('The platform does not support');
        }

        syncVolume () {
            cc.warn('The platform does not support');
        }

        syncMute () {
            cc.warn('The platform does not support');
        }

        syncLoop () {
            cc.warn('The platform does not support');
        }

        syncStayOnBottom () {
            cc.warn('The platform does not support');
        }

        getCurrentTime () {
            if (this.video) {
                this._cachedCurrentTime = this.video.currentTime();
                return this._cachedCurrentTime;
            }
            return -1;
        }

        seekTo (val) {
            const video = this._video;
            if (!video) return;
            video.seekTo(val);
            this._cachedCurrentTime = val;
        }

        disable (noPause) {
            if (this.video) {
                if (!noPause) {
                    this.video.pause();
                }
                this.video.setVisible(false);
                this._visible = false;
            }
        }

        enable () {
            if (this.video) {
                this.video.setVisible(true);
                this._visible = true;
            }
        }

        canPlay () {
            this.video.play();
            this.syncCurrentTime();
        }

        resume () {
            if (this.video) {
                this.video.resume();
                this.syncCurrentTime();
                this._playing = true;
            }
        }

        pause () {
            if (this.video) {
                this._cachedCurrentTime = this.video.currentTime();
                this.video.pause();
            }
        }

        stop () {
            if (this.video) {
                //this._ignorePause = true;
                this.video.seekTo(0);
                this._cachedCurrentTime = 0;
                this.video.stop();
            }
        }

        canFullScreen (enabled) {
            if (this.video) {
                this.video.setFullScreenEnabled(enabled);
            }
        }

        syncKeepAspectRatio (enabled) {
            if (this.video) {
                this.video.setKeepAspectRatioEnabled(enabled);
            }
        }

        syncMatrix () {
            if (!this._video || !this._component || !this._uiTrans) return;

            const camera = this.UICamera;
            if (!camera) {
                return;
            }

            this._component.node.getWorldMatrix(_mat4_temp);
            const { width, height } = this._uiTrans.contentSize;
            if (!this._forceUpdate
                && camera.matViewProj.equals(this._matViewProj_temp)
                && this._m00 === _mat4_temp.m00 && this._m01 === _mat4_temp.m01
                && this._m04 === _mat4_temp.m04 && this._m05 === _mat4_temp.m05
                && this._m12 === _mat4_temp.m12 && this._m13 === _mat4_temp.m13
                && this._w === width && this._h === height) {
                return;
            }

            this._matViewProj_temp.set(camera.matViewProj);
            // update matrix cache
            this._m00 = _mat4_temp.m00;
            this._m01 = _mat4_temp.m01;
            this._m04 = _mat4_temp.m04;
            this._m05 = _mat4_temp.m05;
            this._m12 = _mat4_temp.m12;
            this._m13 = _mat4_temp.m13;
            this._w = width;
            this._h = height;

            const canvas_width = cc.game.canvas.width;
            const canvas_height = cc.game.canvas.height;

            const ap = this._uiTrans.anchorPoint;
            // Vectors in node space
            vec3.set(_topLeft, -ap.x * this._w, (1.0 - ap.y) * this._h, 0);
            vec3.set(_bottomRight, (1 - ap.x) * this._w, -ap.y * this._h, 0);
            // Convert to world space
            vec3.transformMat4(_topLeft, _topLeft, _mat4_temp);
            vec3.transformMat4(_bottomRight, _bottomRight, _mat4_temp);
            // need update camera data
            camera.update();
            // Convert to Screen space
            camera.worldToScreen(_topLeft, _topLeft);
            camera.worldToScreen(_bottomRight, _bottomRight);

            const finalWidth = _bottomRight.x - _topLeft.x;
            const finalHeight = _topLeft.y - _bottomRight.y;
            this._video.setFrame(_topLeft.x, canvas_height - _topLeft.y, finalWidth, finalHeight);
            this._forceUpdate = false;
        }
    }
}
