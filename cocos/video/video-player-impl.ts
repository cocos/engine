/*
 Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights to
 use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 of the Software, and to permit persons to whom the Software is furnished to do so,
 subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
*/

import { legacyCC } from '../core/global-exports';
import { UITransform } from '../2d/framework';
import { VideoPlayerEventType } from './video-player-enums';
import { error } from '../core/platform';
import { director } from '../game/director';
import { Node } from '../scene-graph';
import type { Camera } from '../render-scene/scene';
import type { VideoPlayer } from './video-player';
import type { VideoClip } from './assets/video-clip';

export abstract class VideoPlayerImpl {
    protected _componentEventList: Map<string, () => void> = new Map();
    protected _state = VideoPlayerEventType.NONE;
    protected _video: HTMLVideoElement | null = null;

    protected _onInterruptedBegin: () => void;
    protected _onInterruptedEnd: () => void;
    protected _interrupted = false;

    protected _loaded = false;
    protected _loadedMeta = false;
    protected _ignorePause = false;
    protected _fullScreenOnAwake = false;

    protected _visible = true;

    protected _playing = false;
    protected _cachedCurrentTime = -1;

    protected _waitingFullscreen = false;
    protected _waitingPlay = false;

    protected _keepAspectRatio = false;

    protected _component: VideoPlayer | null = null;
    protected _uiTrans: UITransform | null = null;
    protected _node: Node | null = null;

    protected _stayOnBottom = false;
    protected _dirty = false;
    protected _forceUpdate = false;
    protected _w = 0;
    protected _h = 0;
    protected _m00 = 0;
    protected _m01 = 0;
    protected _m04 = 0;
    protected _m05 = 0;
    protected _m12 = 0;
    protected _m13 = 0;

    constructor (component: VideoPlayer) {
        this._component = component;
        this._node = component.node;
        this._uiTrans = component.node.getComponent(UITransform);
        this._onInterruptedBegin = (): void => {
            if (!this.video || this._state !== VideoPlayerEventType.PLAYING) { return; }
            this.video.pause();
            this._interrupted = true;
        };
        this._onInterruptedEnd = (): void => {
            if (!this._interrupted || !this.video) { return; }
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.video.play();
            this._interrupted = false;
        };
        /* handle pause & resume */
        legacyCC.game.on(legacyCC.Game.EVENT_PAUSE, this._onInterruptedBegin);
        legacyCC.game.on(legacyCC.Game.EVENT_RESUME, this._onInterruptedEnd);
    }

    //
    public abstract canPlay(): void;
    public abstract canFullScreen(enabled: boolean): void;

    public abstract pause (): void;
    public abstract resume(): void;
    public abstract stop (): void;
    public abstract seekTo(val: number): void;

    //
    public abstract createVideoPlayer(url: string): void;
    public abstract removeVideoPlayer(): void;
    public abstract enable(): void;
    public abstract disable(noPause?: boolean): void;

    // synchronizing video player data
    public abstract syncClip(clip: VideoClip | null): void;
    public abstract syncURL(url: string): void;
    public abstract syncStayOnBottom(enabled: boolean): void;
    public abstract syncKeepAspectRatio(enabled: boolean): void;
    public abstract syncPlaybackRate(val: number): void;
    public abstract syncVolume(val: number): void;
    public abstract syncMute(enabled: boolean): void;
    public abstract syncLoop(enabled: boolean): void
    public abstract syncMatrix(): void;

    // get video player data
    public abstract getDuration(): number;
    public abstract getCurrentTime(): number;
    public get fullScreenOnAwake (): boolean { return this._fullScreenOnAwake; }
    public get loaded (): boolean { return this._loaded; }
    public get componentEventList (): Map<string, () => void> { return this._componentEventList; }
    public get video (): HTMLVideoElement | null { return this._video; }
    public get state (): VideoPlayerEventType { return this._state; }
    public get isPlaying (): boolean { return this._playing; }
    get UICamera (): Camera | null {
        return director.root!.batcher2D.getFirstRenderCamera(this._node!);
    }

    // video player event
    public onLoadedMetadata (e: Event): void {
        this._loadedMeta = true;
        this._forceUpdate = true;
        if (this._visible) {
            this.enable();
        } else {
            this.disable();
        }
        this.dispatchEvent(VideoPlayerEventType.META_LOADED);
        const video = e.target as HTMLVideoElement;
        if (this._keepAspectRatio && video) {
            this.syncUITransform(video.videoWidth, video.videoHeight);
        }
        this.delayedFullScreen();
        this.delayedPlay();
    }

    public onCanPlay (e: Event): void {
        this._loaded = true;
        this.dispatchEvent(VideoPlayerEventType.READY_TO_PLAY);
    }

    public onPlay (e: Event): void {
        this._playing = true;
        this.dispatchEvent(VideoPlayerEventType.PLAYING);
    }

    public onPlaying (e: Event): void {
        this.dispatchEvent(VideoPlayerEventType.PLAYING);
    }

    public onPause (e: Event): void {
        this._playing = false;
        if (this._ignorePause) {
            this._ignorePause = false;
            return;
        }
        this.dispatchEvent(VideoPlayerEventType.PAUSED);
    }

    public onStoped (e: Event): void {
        this._playing = false;
        this._ignorePause = false;
        this.dispatchEvent(VideoPlayerEventType.STOPPED);
    }

    public onEnded (e: Event): void {
        this._playing = false;
        this.dispatchEvent(VideoPlayerEventType.COMPLETED);
    }

    public onClick (e: Event): void {
        this.dispatchEvent(VideoPlayerEventType.CLICKED);
    }

    public onError (e: Event): void {
        this.dispatchEvent(VideoPlayerEventType.ERROR);
        const video = e.target as HTMLVideoElement;
        if (video && video.error) {
            error(`Error ${video.error.code}; details: ${video.error.message}`);
        }
    }

    public play (): void {
        if (this._loadedMeta || this._loaded) {
            this.canPlay();
        } else {
            this._waitingPlay = true;
        }
    }

    public delayedPlay (): void {
        if (this._waitingPlay) {
            this.canPlay();
            this._waitingPlay = false;
        }
    }

    public syncFullScreenOnAwake (enabled: boolean): void {
        this._fullScreenOnAwake = enabled;
        if (this._loadedMeta || this._loaded) {
            this.canFullScreen(enabled);
        } else {
            this._waitingFullscreen = true;
        }
    }

    public delayedFullScreen (): void {
        if (this._waitingFullscreen) {
            this.canFullScreen(this._fullScreenOnAwake);
            this._waitingFullscreen = false;
        }
    }

    protected dispatchEvent (key: string): void {
        const callback = this._componentEventList.get(key);
        if (callback) {
            this._state = key as VideoPlayerEventType;
            callback.call(this);
        }
    }

    protected syncUITransform (width: number, height: number): void {
        const uiTrans = this._uiTrans;
        if (uiTrans) {
            uiTrans.width = width;
            uiTrans.height = height;
        }
    }

    protected syncCurrentTime (): void {
        if (!this.video) {
            return;
        }
        if (this._cachedCurrentTime !== -1 && this.video.currentTime !== this._cachedCurrentTime) {
            this.seekTo(this._cachedCurrentTime);
            this._cachedCurrentTime = -1;
        }
    }

    public destroy (): void {
        this.removeVideoPlayer();
        this._componentEventList.clear();
        legacyCC.game.off(legacyCC.Game.EVENT_PAUSE, this._onInterruptedBegin);
        legacyCC.game.off(legacyCC.Game.EVENT_RESUME, this._onInterruptedEnd);
    }
}

legacyCC.internal.VideoPlayerImpl = VideoPlayerImpl;
