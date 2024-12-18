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

import { ccclass, serializable, override } from 'cc.decorator';
import { AudioPlayer } from 'pal/audio';
import { Asset } from '../asset/assets/asset';
import { cclegacy } from '../core';
import { AudioState, AudioType } from '../../pal/audio/type';

export interface AudioMeta {
    player: AudioPlayer | null,
    url: string;
    type: AudioType;
    duration: number;
}

/**
 * @en
 * The audio clip asset.
 * @zh
 * 音频片段资源。
 */
@ccclass('cc.AudioClip')
export class AudioClip extends Asset {
    public static AudioType = AudioType;

    /**
     * @engineInternal
     */
    public set duration (v: number) {
        this._duration = v;
    }
    @serializable
    protected _duration = 0; // we serialize this because it's unavailable at runtime on some platforms

    protected _loadMode = AudioType.UNKNOWN_AUDIO;

    protected _meta: AudioMeta | null = null;

    private _player: AudioPlayer | null = null;

    constructor () {
        super();
    }

    public destroy (): boolean {
        const destroyResult = super.destroy();
        this._player?.destroy();
        this._player = null;
        if (this._meta) {
            this._meta.player = null;
        }
        return destroyResult;
    }

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    set _nativeAsset (meta: AudioMeta | null) {
        this._meta = meta;
        if (meta) {
            this._loadMode = meta.type;
            this._player = meta.player;
        } else {
            this._meta = null;
            this._loadMode = AudioType.UNKNOWN_AUDIO;
            this._duration = 0;
        }
    }
    get _nativeAsset (): AudioMeta | null {
        return this._meta;
    }

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    @override
    get _nativeDep (): {
        uuid: string;
        audioLoadMode: AudioType;
        ext: string;
        __isNative__: boolean;
        } {
        return {
            uuid: this._uuid,
            audioLoadMode: this.loadMode,
            ext: this._native,
            __isNative__: true,
        };
    }

    get loadMode (): AudioType {
        return this._loadMode;
    }

    public validate (): boolean {
        return !!this._meta;
    }

    public getDuration (): number {
        // Dynamicly loaded audioClip._duration is 0
        if (this._duration) {
            return this._duration;
        }
        return this._meta ? this._meta.duration : 0;
    }

    // #region deprecated method
    /**
     * @deprecated since v3.1.0, please use AudioSource.prototype.state instead.
     */
    public get state (): AudioState {
        return this._player ? this._player.state : AudioState.INIT;
    }

    /**
     * @deprecated since v3.1.0, please use AudioSource.prototype.getCurrentTime() instead.
     */
    public getCurrentTime (): number {
        return this._player ? this._player.currentTime : 0;
    }

    /**
     * @deprecated since v3.1.0, please use AudioSource.prototype.getVolume() instead.
     */
    public getVolume (): number {
        return this._player ? this._player.volume : 0;
    }

    /**
     * @deprecated since v3.1.0, please use AudioSource.prototype.getLoop() instead.
     */
    public getLoop (): boolean {
        return this._player ? this._player.loop : false;
    }

    /**
     * @deprecated since v3.1.0, please use AudioSource.prototype.setCurrentTime() instead.
     */
    public setCurrentTime (time: number): void {
        this._player?.seek(time).catch((e) => {});
    }

    /**
     * @deprecated since v3.1.0, please use AudioSource.prototype.setVolume() instead.
     */
    public setVolume (volume: number): void {
        if (this._player) {
            this._player.volume = volume;
        }
    }

    /**
     * @deprecated since v3.1.0, please use AudioSource.prototype.setLoop() instead.
     */
    public setLoop (loop: boolean): void {
        if (this._player) {
            this._player.loop = loop;
        }
    }

    /**
     * @deprecated since v3.1.0, please use AudioSource.prototype.play() instead.
     */
    public play (): void {
        this._player?.play().catch((e) => {});
    }

    /**
     * @deprecated since v3.1.0, please use AudioSource.prototype.pause() instead.
     */
    public pause (): void {
        this._player?.pause().catch((e) => {});
    }

    /**
     * @deprecated since v3.1.0, please use AudioSource.prototype.stop() instead.
     */
    public stop (): void {
        this._player?.stop().catch((e) => {});
    }

    /**
     * @deprecated since v3.1.0, please use AudioSource.prototype.playOneShot() instead.
     */
    public playOneShot (volume = 1): void {
        if (this._nativeAsset) {
            AudioPlayer.loadOneShotAudio(this._nativeAsset.url, volume).then((oneShotAudio) => {
                oneShotAudio.play();
            }).catch((e) => {});
        }
    }
    // #endregion deprecated method
}

cclegacy.AudioClip = AudioClip;
