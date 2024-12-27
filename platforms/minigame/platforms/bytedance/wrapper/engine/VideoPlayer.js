/****************************************************************************
 Copyright (c) 2023 Xiamen Yaji Software Co., Ltd.

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
    const _mat4_temp = cc.mat4();

    const _topLeft = new vec3();
    const _bottomRight = new vec3();

    const dpr = tt.getSystemInfoSync().pixelRatio;

    cc.internal.VideoPlayerImplManager.getImpl = function (componenet) {
        return new VideoPlayerImplMiniGame(componenet);
    };

    class VideoPlayerImplMiniGame extends cc.internal.VideoPlayerImpl {
        constructor (componenet) {
            super(componenet);
            this.videoNode = new cc.Node();
            this.videoNode.addComponent(cc.Sprite);
            this.videoNode.layer = this._node.layer;
            this._node.insertChild(this.videoNode, 0);
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

        onCanplay () {
            if (this._loaded) {
                return;
            }
            this._loaded = true;
            this.setVisible(this._visible);
            this.dispatchEvent(EventType.READY_TO_PLAY);
            this.delayedPlay();
        }

        _bindEvent () {
            const video = this._video;
                const self = this;

            if (!video) {
                return;
            }
            video.onCanplay(() => {
                if (self._video !== video) return;
                self._loaded = true;
                self._playing = true;
                try {
                    self.setVisible(self._visible);
                    self.dispatchEvent(EventType.READY_TO_PLAY);
                    video.play();
                    this.videoTexture = new cc.Texture2D();
                    this.videoTexture.reset({
                        width: video.width,
                        height: video.height,
                        format: cc.Texture2D.PixelFormat.RGBA8888,
                    });
                    const sprite = this.videoNode.getComponent(cc.Sprite);
                    const spriteFrame = new cc.SpriteFrame();
                    spriteFrame.texture = this.videoTexture;
                    sprite.spriteFrame = spriteFrame;
                } catch (err) {
                    console.error('Video playback error:', err);
                }
              });
            video.onPlay(() => {
                if (self._video !== video) return;
                self._playing = true;
                self.dispatchEvent(EventType.PLAYING);
            });
            video.onEnded(() => {
                if (self._video !== video) return;
                self._playing = false;
                self._currentTime = self._duration;  // ensure currentTime is at the end of duration
                self.dispatchEvent(EventType.COMPLETED);
            });
            video.onPause(() => {
                if (self._video !== video) return;
                self._playing = false;
                self.dispatchEvent(EventType.PAUSED);
            });
            video.onTimeUpdate((res) => {
                self._duration = res.duration;
                self._currentTime = res.position;
            });
            video.onStop(() => {
                if (self._video !== video) return;
                self._playing = false;
                self.dispatchEvent(EventType.STOPPED);
              });
        }

        _unbindEvent () {
            const video = this._video;
            if (!video) {
                return;
            }

            video.offPlay();
            video.offEnded();
            video.offPause();
            video.offTimeUpdate();
            video.offStop();
        }

        createVideoPlayer (url) {
            if (!tt.createVideo) {
                console.warn('VideoPlayer not supported');
                return;
            }

            if (!this._video) {
                this._video = tt.createOffscreenVideo();
                this._duration = 0;
                this._currentTime = 0;
                this._loaded = false;
                this.setVisible(this._visible);
                this._bindEvent();
                this._forceUpdate = true;
            }

            this.setURL(url);
            this._forceUpdate = true;
        }

        setURL (path) {
            const self = this;
            const video = self._video;
            if (!video || video.src === path) {
                return;
            }

            if (self._playing) {
                video.stop();
            }
            self._unbindEvent();
            video.autoplay = true;
            video.src = path;
            video.muted = true;

            self._loaded = false;
            function loadedCallback () {
                self._bindEvent();
                video.muted = false;
                self._loaded = true;
                self.dispatchEvent(EventType.READY_TO_PLAY);
            }
            function endedCallback () {
                video.offPlay();
                video.stop();
                self._playing = false;
                self._currentTime = 0;
                self.dispatchEvent(EventType.COMPLETED);
            }
            video.onPlay(loadedCallback);
            video.onEnded(endedCallback);
        }

        removeVideoPlayer () {
            const video = this.video;
            if (video) {
                video.stop();
                video.destroy();
                this._playing = false;
                this._loaded = false;
                this._loadedMeta = false;
                this._ignorePause = false;
                this._cachedCurrentTime = 0;
                this._video = null;
            }
        }

        setVisible (value) {
            const video = this._video;
            if (!video || this._visible === value) {
                return;
            }
            if (value) {
                video.width = this._actualWidth || 0;
            } else {
                video.width = 0;  // hide video
            }
            this._visible = value;
        }

        getDuration () {
            return this.duration();
        }

        duration () {
            return this._duration;
        }

        syncPlaybackRate (value) {
            const video = this._video;
            if (video && value !== video.playbackRate) {
                if (value === 0.5 | value === 0.8 | value === 1.0 | value === 1.25 | value === 1.5) {
                    video.playbackRate = value;
                } else {
                    console.warn('The platform does not support this PlaybackRate!');
                }
            }
        }

        syncVolume () {
            console.warn('The platform does not support');
        }

        syncMute (enable) {
            const video = this._video;
            if (video && video.muted !== enable) {
                video.muted = enable;
            }
        }

        syncLoop (enable) {
            const video = this._video;
            if (video && video.loop !== enable) {
                video.loop = enable;
            }
        }

        syncStayOnBottom () {
            console.warn('The platform does not support');
        }

        getCurrentTime () {
            if (this.video) {
                return this.currentTime();
            }
            return -1;
        }

        currentTime () {
            return this._currentTime;
        }

        seekTo (time) {
            const video = this._video;
            if (!video || !this._loaded) return;
            video.seek(time);
        }

        disable (noPause) {
            if (this._video) {
                if (!noPause) {
                    this._video.pause();
                }
                this.setVisible(false);
                this._visible = false;
            }
        }

        enable () {
            if (this._video) {
                this.setVisible(true);
                this._visible = true;
            }
        }

        canPlay () {
            this._playing = true;
            this._video.play();
            this.syncCurrentTime();
        }

        resume () {
            const video = this._video;
            if (this._playing || !video) return;

            video.play();
        }

        pause () {
            const video = this._video;
            if (!this._playing || !video) return;

            video.pause();
        }

        stop () {
            const self = this;
            const video = this._video;
            if (!video || !this._visible) return;
            video.stop().then((res) => {
                if (res.errMsg && !res.errMsg.includes('ok')) {
                    console.error('failed to stop video player');
                    return;
                }
                self._currentTime = 0;
                self._playing = false;
                self.dispatchEvent(EventType.STOPPED);
            });
        }

        canFullScreen (enabled) {
            if (this._video) {
                this.setFullScreenEnabled(enabled);
            }
        }

        setFullScreenEnabled (enable) {
            const video = this._video;
            if (!video || this._fullScreenEnabled === enable) {
                return;
            }
            if (enable) {
                video.requestFullScreen();
            } else {
                video.exitFullScreen();
            }
            this._fullScreenEnabled = enable;
        }

        syncKeepAspectRatio (enabled) {
            console.warn('On bytedance game videoPlayer is always keep the aspect ratio');
        }

        syncMatrix () {
            if (this.videoTexture) {
                this.videoTexture.uploadData(this.video);
            }
        }
    }
}
