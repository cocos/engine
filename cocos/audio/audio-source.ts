/*
 Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

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

import { AudioPlayer, OneShotAudio } from 'pal/audio';
import { ccclass, help, menu, tooltip, type, range, serializable } from 'cc.decorator';
import { AudioPCMDataView, AudioState } from '../../pal/audio/type';
import { Component } from '../scene-graph/component';
import { clamp, warn } from '../core';
import { AudioClip } from './audio-clip';
import { audioManager } from './audio-manager';
import { Node } from '../scene-graph';

const _LOADED_EVENT = 'audiosource-loaded';

enum AudioSourceEventType {
    STARTED = 'started',
    ENDED = 'ended',
}

enum AudioOperationType {
     PLAY = 'play',
     STOP = 'stop',
     PAUSE = 'pause',
     SEEK = 'seek'
}

interface AudioOperationInfo {
    op: AudioOperationType;
    params: any[] | null;
}

/**
 * @en
 * A representation of a single audio source, <br>
 * contains basic functionalities like play, pause and stop.
 * @zh
 * 音频组件，代表单个音源，提供播放、暂停、停止等基本功能。
 */
@ccclass('cc.AudioSource')
@help('i18n:cc.AudioSource')
@menu('Audio/AudioSource')
export class AudioSource extends Component {
    static get maxAudioChannel (): number {
        return AudioPlayer.maxAudioChannel;
    }
    public static AudioState = AudioState;

    public static EventType = AudioSourceEventType;

    @type(AudioClip)
    protected _clip: AudioClip | null = null;
    protected _player: AudioPlayer | null = null;
    private _hasRegisterListener: boolean = false;

    @serializable
    protected _loop = false;
    @serializable
    protected _playOnAwake = true;
    @serializable
    protected _volume = 1;

    private _cachedCurrentTime = -1;

    // An operation queue to store the operations before loading the AudioPlayer.
    private _operationsBeforeLoading: AudioOperationInfo[] = [];
    private _isLoaded = false;

    private _lastSetClip: AudioClip | null = null;

    constructor () {
        super();
    }

    private _resetPlayer (): void {
        if (this._player) {
            audioManager.removePlaying(this._player);
            this._unregisterListener();
            this._player.destroy();
            this._player = null;
        }
    }
    /**
     * @en
     * The default AudioClip to be played for this audio source.
     * @zh
     * 设定要播放的音频。
     */
    @type(AudioClip)
    @tooltip('i18n:audio.clip')
    set clip (val) {
        if (val === this._clip) {
            return;
        }
        this._clip = val;
        this._syncPlayer();
    }
    get clip (): AudioClip | null {
        return this._clip;
    }
    private _syncPlayer (): void {
        const clip = this._clip;
        if (this._lastSetClip === clip) {
            return;
        }
        if (!clip) {
            this._lastSetClip = null;
            this._resetPlayer();
            return;
        }
        if (!clip._nativeAsset) {
            // eslint-disable-next-line no-console
            console.error('Invalid audio clip');
            return;
        }
        // The state of _isloaded cannot be modified if clip is the wrong argument.
        // Because load is an asynchronous function, if it is called multiple times with the same arguments.
        // It may cause an illegal state change
        this._isLoaded = false;
        this._lastSetClip = clip;
        this._operationsBeforeLoading.length = 0;
        AudioPlayer.load(clip._nativeAsset.url, {
            audioLoadMode: clip.loadMode,
        }).then((player) => {
            if (this._lastSetClip !== clip) {
                // In case the developers set AudioSource.clip concurrently,
                // we should choose the last one player of AudioClip set to AudioSource.clip
                // instead of the last loaded one.
                player.destroy();
                return;
            }
            this._isLoaded = true;
            // clear old player
            this._resetPlayer();
            this._player = player;
            this._syncStates();
            this.node?.emit(_LOADED_EVENT);
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        }).catch((e) => {});
    }

    private _registerListener (): void {
        if (!this._hasRegisterListener && this._player) {
            const player = this._player;
            player.onEnded(() => {
                audioManager.removePlaying(player);
                this.node?.emit(AudioSourceEventType.ENDED, this);
            });
            player.onInterruptionBegin(() => {
                audioManager.removePlaying(player);
            });
            player.onInterruptionEnd(() => {
                if (this._player === player) {
                    audioManager.addPlaying(player);
                }
            });
            this._hasRegisterListener = true;
        }
    }

    private _unregisterListener (): void {
        if (this._player && this._hasRegisterListener) {
            this._player.offEnded();
            this._player.offInterruptionBegin();
            this._player.offInterruptionEnd();
            this._hasRegisterListener = false;
        }
    }

    /**
     * @en
     * Is looping enabled for this audio source?
     * @zh
     * 是否循环播放音频？
     */
    @tooltip('i18n:audio.loop')
    set loop (val) {
        this._loop = val;
        if (this._player) {
            this._player.loop = val;
        }
    }
    get loop (): boolean {
        return this._loop;
    }

    /**
     * @en
     * Is the autoplay enabled? <br>
     * Note that for most platform autoplay will only start <br>
     * after a user gesture is received, according to the latest autoplay policy: <br>
     * https://www.chromium.org/audio-video/autoplay
     * @zh
     * 是否启用自动播放。 <br>
     * 请注意，根据最新的自动播放策略，现在对大多数平台，自动播放只会在第一次收到用户输入后生效。 <br>
     * 参考：https://www.chromium.org/audio-video/autoplay
     */
    @tooltip('i18n:audio.playOnAwake')
    set playOnAwake (val) {
        this._playOnAwake = val;
    }
    get playOnAwake (): boolean {
        return this._playOnAwake;
    }

    /**
     * @en
     * The volume of this audio source (0.0 to 1.0).<br>
     * Note: Volume control may be ineffective on some platforms.
     * @zh
     * 音频的音量（大小范围为 0.0 到 1.0）。<br>
     * 请注意，在某些平台上，音量控制可能不起效。<br>
     */
    @range([0.0, 1.0])
    @tooltip('i18n:audio.volume')
    set volume (val) {
        if (Number.isNaN(val)) { warn('illegal audio volume!'); return; }
        val = clamp(val, 0, 1);
        if (this._player) {
            this._player.volume = val;
            this._volume = this._player.volume;
        } else {
            this._volume = val;
        }
    }
    get volume (): number {
        return this._volume;
    }

    public onLoad (): void {
        this._syncPlayer();
    }

    public onEnable (): void {
        // audio source component may be played before
        if (this._playOnAwake && !this.playing) {
            this.play();
        }
    }

    public onDisable (): void {
        const rootNode = this._getRootNode();
        if (rootNode?._persistNode) {
            return;
        }
        this.pause();
    }

    public onDestroy (): void {
        this.stop();
        this.clip = null;// It will trigger _syncPlayer then call resetPlayer
    }
    /**
     * @en
     * Get PCM data from specified channel.
     * Currently it is only available in Native platform and Web Audio (including Web and ByteDance platforms).
     *
     * @zh
     * 通过指定的通道获取音频的 PCM data。
     * 目前仅在原生平台和 Web Audio（包括 Web 和 字节平台）中可用。
     *
     * @param channelIndex The channel index. 0 is left channel, 1 is right channel.
     * @returns A Promise to get the PCM data after audio is loaded.
     *
     * @example
     * ```ts
     * audioSource.getPCMData(0).then(dataView => {
     *   if (!dataView)  return;
     *   for (let i = 0; i < dataView.length; ++i) {
     *     console.log('data: ' + dataView.getData(i));
     *   }
     * });
     * ```
     */
    public getPCMData (channelIndex: number): Promise<AudioPCMDataView | undefined> {
        return new Promise((resolve) => {
            if (channelIndex !== 0 && channelIndex !== 1) {
                warn('Only support channel index 0 or 1 to get buffer');
                resolve(undefined);
                return;
            }
            if (this._player) {
                resolve(this._player.getPCMData(channelIndex));
            } else {
                this.node?.once(_LOADED_EVENT, () => {
                    resolve(this._player?.getPCMData(channelIndex));
                });
            }
        });
    }

    /**
     * @en
     * Get the sample rate of audio.
     * Currently it is only available in Native platform and Web Audio (including Web and ByteDance platforms).
     *
     * @zh
     * 获取音频的采样率。
     * 目前仅在原生平台和 Web Audio（包括 Web 和 字节平台）中可用。
     *
     * @returns A Promise to get the sample rate after audio is loaded.
     */
    public getSampleRate (): Promise<number> {
        return new Promise((resolve) => {
            if (this._player) {
                resolve(this._player.sampleRate);
            } else {
                this.node?.once(_LOADED_EVENT, () => {
                    resolve(this._player!.sampleRate);
                });
            }
        });
    }

    private _getRootNode (): Node | null | undefined {
        let currentNode = this.node as Node | undefined | null;
        let currentGrandparentNode = currentNode?.parent?.parent;
        while (currentGrandparentNode) {
            currentNode = currentNode?.parent;
            currentGrandparentNode = currentNode?.parent?.parent;
        }
        return currentNode;
    }

    /**
     * @en
     * Play the clip.<br>
     * Restart if already playing.<br>
     * Resume if paused.
     *
     * NOTE: On Web platforms, the Auto Play Policy bans auto playing audios at the first time, because the user gesture is required.
     * there are 2 ways to play audios at the first time:
     * - play audios in the callback of TOUCH_END or MOUSE_UP event
     * - play audios straightly, the engine will auto play audios at the next user gesture.
     *
     * @zh
     * 开始播放。<br>
     * 如果音频处于正在播放状态，将会重新开始播放音频。<br>
     * 如果音频处于暂停状态，则会继续播放音频。
     *
     * 注意:在 Web 平台，Auto Play Policy 禁止首次自动播放音频，因为需要发生用户交互之后才能播放音频。
     * 有两种方式实现音频首次自动播放：
     * - 在 TOUCH_END 或者 MOUSE_UP 的事件回调里播放音频。
     * - 直接播放音频，引擎会在下一次发生用户交互时自动播放。
     */
    public play (): void {
        if (!this._isLoaded && this.clip) {
            this._operationsBeforeLoading.push({ op: AudioOperationType.PLAY, params: null });
            return;
        }
        this._registerListener();
        audioManager.discardOnePlayingIfNeeded();
        // Replay if the audio is playing
        if (this.state === AudioState.PLAYING) {
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            this._player?.stop().catch((e) => {});
        }
        const player = this._player;
        if (player) {
            player.play().then(() => {
                this.node?.emit(AudioSourceEventType.STARTED, this);
            }).catch((e) => {
                audioManager.removePlaying(player);
            });
            audioManager.addPlaying(player);
        }
    }

    /**
     * @en
     * Pause the clip.
     * @zh
     * 暂停播放。
     */
    public pause (): void {
        if (!this._isLoaded && this.clip) {
            this._operationsBeforeLoading.push({ op: AudioOperationType.PAUSE, params: null });
            return;
        }
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        this._player?.pause().catch((e) => {});
    }

    /**
     * @en
     * Stop the clip.
     * @zh
     * 停止播放。
     */
    public stop (): void {
        if (!this._isLoaded && this.clip) {
            this._operationsBeforeLoading.push({ op: AudioOperationType.STOP, params: null });
            return;
        }
        if (this._player) {
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            this._player.stop().catch((e) => {});
            audioManager.removePlaying(this._player);
        }
    }

    /**
     * @en
     * Plays an AudioClip, and scales volume by volumeScale. The result volume is `audioSource.volume * volumeScale`. <br>
     * @zh
     * 以指定音量倍数播放一个音频一次。最终播放的音量为 `audioSource.volume * volumeScale`。 <br>
     * @param clip The audio clip to be played.
     * @param volumeScale volume scaling factor wrt. current value.
     */
    public playOneShot (clip: AudioClip, volumeScale = 1): void {
        if (!clip._nativeAsset) {
            // eslint-disable-next-line no-console
            console.error('Invalid audio clip');
            return;
        }
        let player: OneShotAudio;
        AudioPlayer.loadOneShotAudio(clip._nativeAsset.url, this._volume * volumeScale, {
            audioLoadMode: clip.loadMode,
        }).then((oneShotAudio) => {
            player = oneShotAudio;
            audioManager.discardOnePlayingIfNeeded();
            oneShotAudio.onEnd = (): void => {
                audioManager.removePlaying(oneShotAudio);
            };
            oneShotAudio.play();
            audioManager.addPlaying(oneShotAudio);
        }).catch((e): void => {
            if (player) {
                audioManager.removePlaying(player);
            }
        });
    }

    protected _syncStates (): void {
        if (this._player) {
            this._player.loop = this._loop;
            this._player.volume = this._volume;
            this._operationsBeforeLoading.forEach((opInfo): void => {
                if (opInfo.op === AudioOperationType.SEEK) {
                    this._cachedCurrentTime = (opInfo.params && opInfo.params[0]) as number;
                    if (this._player) {
                        // eslint-disable-next-line @typescript-eslint/no-empty-function
                        this._player.seek(this._cachedCurrentTime).catch((e): void => {});
                    }
                } else {
                    this[opInfo.op]?.();
                }
            });
            this._operationsBeforeLoading.length = 0;
        }
    }

    /**
     * @en
     * Set current playback time, in seconds.
     * @zh
     * 以秒为单位设置当前播放时间。
     * @param num playback time to jump to.
     */
    set currentTime (num: number) {
        if (Number.isNaN(num)) { warn('illegal audio time!'); return; }
        num = clamp(num, 0, this.duration);
        if (!this._isLoaded && this.clip) {
            this._operationsBeforeLoading.push({ op: AudioOperationType.SEEK, params: [num] });
            return;
        }
        this._cachedCurrentTime = num;
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        this._player?.seek(this._cachedCurrentTime).catch((e): void => {});
    }

    /**
     * @en
     * Get the current playback time, in seconds.
     * @zh
     * 以秒为单位获取当前播放时间。
     */
    get currentTime (): number {
        return this._player ? this._player.currentTime : (this._cachedCurrentTime < 0 ? 0 : this._cachedCurrentTime);
    }

    /**
     * @en
     * Get the audio duration, in seconds.
     * @zh
     * 获取以秒为单位的音频总时长。
     */
    get duration (): number {
        return this._clip?.getDuration() ?? (this._player ? this._player.duration : 0);
    }

    /**
     * @en
     * Get current audio state.
     * @zh
     * 获取当前音频状态。
     */
    get state (): AudioState {
        return this._player ? this._player.state : AudioState.INIT;
    }

    /**
     * @en
     * Is the audio currently playing?
     * @zh
     * 当前音频是否正在播放？
     */
    get playing (): boolean {
        return this.state === AudioSource.AudioState.PLAYING;
    }
}
