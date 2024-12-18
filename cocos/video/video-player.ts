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

import { ccclass, displayOrder, executeInEditMode, help, menu, slide, range, requireComponent, tooltip, type, serializable } from 'cc.decorator';
import { EDITOR_NOT_IN_PREVIEW } from 'internal:constants';
import { warn } from '../core/platform';
import { Component, EventHandler as ComponentEventHandler } from '../scene-graph';
import { UITransform } from '../2d/framework';
import { clamp } from '../core/math';
import { VideoClip } from './assets/video-clip';
import { VideoPlayerImplManager } from './video-player-impl-manager';
import { VideoPlayerEventType, ResourceType } from './video-player-enums';
import { legacyCC } from '../core/global-exports';
import { VideoPlayerImplWeb } from './video-player-impl-web';

/**
 * @en
 * VideoPlayer is a component for playing videos, you can use it for showing videos in your game.
 * Because different platforms have different authorization, API and control methods for VideoPlayer component.
 * And have not yet formed a unified standard, only Web, iOS, and Android platforms are currently supported.
 * @zh
 * Video 组件，用于在游戏中播放视频。
 * 由于不同平台对于 VideoPlayer 组件的授权、API、控制方式都不同，还没有形成统一的标准，所以目前只支持 Web、iOS 和 Android 平台。
 */
@ccclass('cc.VideoPlayer')
@help('i18n:cc.VideoPlayer')
@menu('Video/VideoPlayer')
@requireComponent(UITransform)
@executeInEditMode
export class VideoPlayer extends Component {
    @serializable
    protected _resourceType = ResourceType.LOCAL;
    @serializable
    protected _remoteURL = '';
    @type(VideoClip)
    @serializable
    protected _clip: VideoClip | null = null;
    @serializable
    protected _playOnAwake = true;
    @serializable
    protected _volume = 1.0;
    @serializable
    protected _mute = false;
    @serializable
    protected _playbackRate = 1;
    @serializable
    protected _loop = false;
    @serializable
    protected _fullScreenOnAwake = false;
    @serializable
    protected _stayOnBottom = false;
    @serializable
    protected _keepAspectRatio = true;

    protected _impl: VideoPlayerImplWeb | null = null;
    protected _cachedCurrentTime = 0;

    constructor () {
        super();
    }

    /**
     * @en
     * The resource type of video player, REMOTE for remote url and LOCAL for local file path.
     * @zh
     * 视频来源：REMOTE 表示远程视频 URL，LOCAL 表示本地视频地址。
     */
    @type(ResourceType)
    @tooltip('i18n:videoplayer.resourceType')
    get resourceType (): number {
        return this._resourceType;
    }
    set resourceType (val) {
        if (this._resourceType !== val) {
            this._resourceType = val;
            this.syncSource();
        }
    }

    /**
     * @en
     * The remote URL of video.
     * @zh
     * 远程视频的 URL。
     */
    @tooltip('i18n:videoplayer.remoteURL')
    get remoteURL (): string {
        return this._remoteURL;
    }
    set remoteURL (val: string) {
        if (this._remoteURL !== val) {
            this._remoteURL = val;
            this.syncSource();
        }
    }

    /**
     * @en
     * The local video clip.
     * @zh
     * 本地视频剪辑。
     */
    @type(VideoClip)
    @tooltip('i18n:videoplayer.clip')
    get clip (): VideoClip | null {
        return this._clip;
    }
    set clip (val) {
        if (this._clip !== val) {
            this._clip = val;
            this.syncSource();
        }
    }

    /**
     * @en
     * Whether the video start playing automatically after loaded.
     * @zh
     * 视频加载后是否自动开始播放。
     */
    @tooltip('i18n:videoplayer.playOnAwake')
    get playOnAwake (): boolean {
        return this._playOnAwake;
    }
    set playOnAwake (value) {
        this._playOnAwake = value;
    }

    /**
     * @en
     * The Video playback rate. The value range is from [0.0 ~ 10.0].
     * @zh
     * 视频播放时的速率, 值的区间为[0.0 ~ 10.0]。
     */
    @slide
    @range([0.0, 10, 1.0])
    @tooltip('i18n:videoplayer.playbackRate')
    get playbackRate (): number {
        return this._playbackRate;
    }
    set playbackRate (value: number) {
        this._playbackRate = value;
        if (this._impl) {
            this._impl.syncPlaybackRate(value);
        }
    }

    /**
     * @en
     * The volume of the video. The value range is from [0.0 ~ 1.0].
     * @zh
     * 视频的音量. 值的区间为[0.0 ~ 1.0]。
     */
    @slide
    @range([0.0, 1.0, 0.1])
    @tooltip('i18n:videoplayer.volume')
    get volume (): number {
        return this._volume;
    }
    set volume (value: number) {
        this._volume = value;
        if (this._impl) {
            this._impl.syncVolume(value);
        }
    }

    /**
     * @en
     * Mutes the VideoPlayer. When the volume is set to 0, the volume is muted, and unmuted is to restore the original volume.
     * @zh
     * 是否静音视频。设置音量为0时是静音，取消静音是恢复原来的音量。
     */
    @tooltip('i18n:videoplayer.mute')
    get mute (): boolean {
        return this._mute;
    }
    set mute (value) {
        this._mute = value;
        if (this._impl) {
            this._impl.syncMute(value);
        }
    }

    /**
     * @en
     * Whether the video should play again when it ends.
     * @zh
     * 视频是否应在结束时再次播放。
     */
    @tooltip('i18n:videoplayer.loop')
    get loop (): boolean {
        return this._loop;
    }
    set loop (value) {
        this._loop = value;
        if (this._impl) {
            this._impl.syncLoop(value);
        }
    }

    /**
     * @en
     * Whether to keep the original aspect ratio of the video.
     * @zh
     * 是否保持视频原来的宽高比。
     */
    @tooltip('i18n:videoplayer.keepAspectRatio')
    get keepAspectRatio (): boolean {
        return this._keepAspectRatio;
    }
    set keepAspectRatio (value) {
        if (this._keepAspectRatio !== value) {
            this._keepAspectRatio = value;
            if (this._impl) {
                this._impl.syncKeepAspectRatio(value);
            }
        }
    }

    /**
     * @en
     * Whether to play the video in full screen.
     * @zh
     * 是否全屏播放视频。
     */
    @tooltip('i18n:videoplayer.fullScreenOnAwake')
    get fullScreenOnAwake (): boolean {
        if (!EDITOR_NOT_IN_PREVIEW) {
            if (this._impl) {
                this._fullScreenOnAwake = this._impl.fullScreenOnAwake;
                return this._fullScreenOnAwake;
            }
        }
        return this._fullScreenOnAwake;
    }
    set fullScreenOnAwake (value: boolean) {
        if (this._fullScreenOnAwake !== value) {
            this._fullScreenOnAwake = value;
            if (this._impl) {
                this._impl.syncFullScreenOnAwake(value);
            }
        }
    }

    /**
     * @en
     * Always at the bottom of the game view.
     * This property relies on the translucency feature of Canvas, please enable ENABLE_TRANSPARENT_CANVAS in project preferences.
     * Note: It's only available on the Web platform.
     * Due to the support and limitations of each browser, the effect may not be guaranteed to be consistent.
     * @zh
     * 永远在游戏视图最底层。
     * 该属性依赖 Canvas 的半透明特性，请在项目偏好设置里开启 ENABLE_TRANSPARENT_CANVAS。
     * 注意：该属性只有在 Web 平台上有效果。由于各浏览器的支持与限制，效果可能无法保证一致。
     */
    @tooltip('i18n:videoplayer.stayOnBottom')
    get stayOnBottom (): boolean {
        return this._stayOnBottom;
    }
    set stayOnBottom (value: boolean) {
        if (this._stayOnBottom !== value) {
            this._stayOnBottom = value;
            if (this._impl) {
                this._impl.syncStayOnBottom(value);
            }
        }
    }

    public static EventType = VideoPlayerEventType;
    public static ResourceType = ResourceType;

    /**
     * @en
     * The video player's callback, it will be triggered in certain situations, such as playing, paused, stopped and completed.
     * @zh
     * 视频播放回调函数，该回调函数会在特定情况被触发，比如播放中，暂时，停止和完成播放。
     */
    @serializable
    @type([ComponentEventHandler])
    @displayOrder(100)
    @tooltip('i18n:videoplayer.videoPlayerEvent')
    public videoPlayerEvent: ComponentEventHandler[] = [];

    /**
     * @en
     * Gets the original video object, generally used for user customization.
     * @zh
     * 获取原始视频对象，一般用于用户定制。
     */
    get nativeVideo (): HTMLVideoElement | null {
        return (this._impl && this._impl.video) || null;
    }

    /**
     * @en
     * Gets the time progress of the current video playback.
     * @zh
     * 获取当前视频播放的时间进度。
     */
    get currentTime (): number {
        if (!this._impl) { return this._cachedCurrentTime; }
        return this._impl.getCurrentTime();
    }

    /**
     * @en
     * Sets the time point when the video starts to play, in seconds.
     * @zh
     * 设置视频开始播放的时间点，单位是秒。
     */
    set currentTime (val: number) {
        if (Number.isNaN(val)) { warn(`illegal video time! value:${val}`); return; }
        val = clamp(val, 0, this.duration);
        this._cachedCurrentTime = val;
        if (this._impl) {
            this._impl.seekTo(val);
        }
    }

    /**
     * @en
     * Gets the audio duration, in seconds.
     * @zh
     * 获取以秒为单位的视频总时长。
     */
    get duration (): number {
        if (!this._impl) { return 0; }
        return this._impl.getDuration();
    }

    /**
     * @en
     * Gets current audio state.
     * @zh
     * 获取当前视频状态。
     */
    get state (): VideoPlayerEventType {
        if (!this._impl) { return VideoPlayerEventType.NONE; }
        return this._impl.state;
    }

    /**
     * @en
     * Whether the current video is playing, The return value type is Boolean.
     * @zh
     * 当前视频是否正在播放，返回值为布尔类型。
     */
    get isPlaying (): boolean {
        if (!this._impl) { return false; }
        return this._impl.isPlaying;
    }

    protected syncSource (): void {
        if (!this._impl) { return; }
        if (this._resourceType === ResourceType.REMOTE) {
            this._impl.syncURL(this._remoteURL);
        } else {
            this._impl.syncClip(this._clip);
        }
        this._cachedCurrentTime = 0;

        this._impl.syncLoop(this._loop);
        this._impl.syncVolume(this._volume);
        this._impl.syncMute(this._mute);
        this._impl.seekTo(this._cachedCurrentTime);
        this._impl.syncPlaybackRate(this._playbackRate);
        this._impl.syncStayOnBottom(this._stayOnBottom);
        this._impl.syncKeepAspectRatio(this._keepAspectRatio);
        this._impl.syncFullScreenOnAwake(this._fullScreenOnAwake);
    }

    public __preload (): void {
        if (EDITOR_NOT_IN_PREVIEW) {
            return;
        }
        this._impl = VideoPlayerImplManager.getImpl(this);
        this.syncSource();

        this._impl.componentEventList.set(VideoPlayerEventType.META_LOADED, this.onMetaLoaded.bind(this));
        this._impl.componentEventList.set(VideoPlayerEventType.READY_TO_PLAY, this.onReadyToPlay.bind(this));
        this._impl.componentEventList.set(VideoPlayerEventType.PLAYING, this.onPlaying.bind(this));
        this._impl.componentEventList.set(VideoPlayerEventType.PAUSED, this.onPaused.bind(this));
        this._impl.componentEventList.set(VideoPlayerEventType.STOPPED, this.onStopped.bind(this));
        this._impl.componentEventList.set(VideoPlayerEventType.COMPLETED, this.onCompleted.bind(this));
        this._impl.componentEventList.set(VideoPlayerEventType.ERROR, this.onError.bind(this));
        this._impl.componentEventList.set(VideoPlayerEventType.CLICKED, this.onClicked.bind(this));
        if (this._playOnAwake && this._impl.loaded) {
            this.play();
        }
    }

    public onEnable (): void {
        if (this._impl) {
            this._impl.enable();
        }
    }

    public onDisable (): void {
        if (this._impl) {
            this._impl.disable();
        }
    }

    public onDestroy (): void {
        if (this._impl) {
            this._impl.destroy();
            this._impl = null;
        }
    }

    public update (dt: number): void {
        if (this._impl) {
            this._impl.syncMatrix();
        }
    }

    public onMetaLoaded (): void {
        ComponentEventHandler.emitEvents(this.videoPlayerEvent, this, VideoPlayerEventType.META_LOADED);
        this.node.emit('meta-loaded', this);
    }

    public onReadyToPlay (): void {
        if (this._playOnAwake && !this.isPlaying) { this.play(); }
        ComponentEventHandler.emitEvents(this.videoPlayerEvent, this, VideoPlayerEventType.READY_TO_PLAY);
        this.node.emit(VideoPlayerEventType.READY_TO_PLAY, this);
    }

    public onPlaying (): void {
        ComponentEventHandler.emitEvents(this.videoPlayerEvent, this, VideoPlayerEventType.PLAYING);
        this.node.emit(VideoPlayerEventType.PLAYING, this);
    }

    public onPaused (): void {
        ComponentEventHandler.emitEvents(this.videoPlayerEvent, this, VideoPlayerEventType.PAUSED);
        this.node.emit(VideoPlayerEventType.PAUSED, this);
    }

    public onStopped (): void {
        ComponentEventHandler.emitEvents(this.videoPlayerEvent, this, VideoPlayerEventType.STOPPED);
        this.node.emit(VideoPlayerEventType.STOPPED, this);
    }

    public onCompleted (): void {
        ComponentEventHandler.emitEvents(this.videoPlayerEvent, this, VideoPlayerEventType.COMPLETED);
        this.node.emit(VideoPlayerEventType.COMPLETED, this);
    }

    public onError (): void {
        ComponentEventHandler.emitEvents(this.videoPlayerEvent, this, VideoPlayerEventType.ERROR);
        this.node.emit(VideoPlayerEventType.ERROR, this);
    }

    public onClicked (): void {
        ComponentEventHandler.emitEvents(this.videoPlayerEvent, this, VideoPlayerEventType.CLICKED);
        this.node.emit(VideoPlayerEventType.CLICKED, this);
    }

    /**
     * @en
     * Play the clip.<br>
     * Restart if already playing.<br>
     * Resume if paused.
     * @zh
     * 开始播放。<br>
     * 如果视频处于正在播放状态，将会重新开始播放视频。<br>
     * 如果视频处于暂停状态，则会继续播放视频。
     */
    public play (): void {
        if (this._impl) {
            this._impl.play();
        }
    }

    /**
     * @en
     * Resume the clip.
     * If a video is paused, call this method to resume playing.
     * @zh
     * 继续播放。如果一个视频播放被暂停播放了，调用这个接口可以继续播放。
     */
    public resume (): void {
        if (this._impl) {
            this._impl.resume();
        }
    }

    /**
     * @en
     * Pause the clip.
     * @zh
     * 暂停播放。
     */
    public pause (): void {
        if (this._impl) {
            this._impl.pause();
        }
    }

    /**
     * @en
     * Stop the clip.
     * @zh
     * 停止播放。
     */
    public stop (): void {
        if (this._impl) {
            this._impl.stop();
        }
    }
}

// TODO Since jsb adapter does not support import cc, put it on internal first and adjust it later.
legacyCC.internal.VideoPlayer = VideoPlayer;
