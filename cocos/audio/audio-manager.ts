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
import { js } from '../core';

type ManagedAudio = AudioPlayer | OneShotAudio;
interface AudioInfo<T> {
    audio: T;
    playTime: number;
}

export class AudioManager {
    private _oneShotAudioInfoList: AudioInfo<OneShotAudio>[] = [];
    private _audioPlayerInfoList: AudioInfo<AudioPlayer>[] = [];

    constructor () {}

    private _findIndex (audioInfoList: AudioInfo<ManagedAudio>[], audio: ManagedAudio): number {
        return audioInfoList.findIndex((item) => item.audio === audio);
    }

    private _tryAddPlaying (audioInfoList: AudioInfo<ManagedAudio>[], audio: ManagedAudio): boolean {
        const idx = this._findIndex(audioInfoList, audio);
        if (idx > -1) {
            // update play time
            audioInfoList[idx].playTime = performance.now();
            return false;
        }
        audioInfoList.push({
            audio,
            playTime: performance.now(),
        });
        return true;
    }
    public addPlaying (audio: ManagedAudio): void {
        if (audio instanceof AudioPlayer) {
            this._tryAddPlaying(this._audioPlayerInfoList, audio);
        } else {
            this._tryAddPlaying(this._oneShotAudioInfoList, audio);
        }
    }

    private _tryRemovePlaying (audioInfoList: AudioInfo<ManagedAudio>[], audio: ManagedAudio): boolean {
        const idx = this._findIndex(audioInfoList, audio);
        if (idx === -1) {
            return false;
        }
        js.array.fastRemoveAt(audioInfoList, idx);
        return true;
    }
    public removePlaying (audio: ManagedAudio): void {
        if (audio instanceof AudioPlayer) {
            this._tryRemovePlaying(this._audioPlayerInfoList, audio);
        } else {
            this._tryRemovePlaying(this._oneShotAudioInfoList, audio);
        }
    }

    public discardOnePlayingIfNeeded (): void {
        if (this._audioPlayerInfoList.length + this._oneShotAudioInfoList.length < AudioPlayer.maxAudioChannel) {
            return;
        }

        // TODO: support discard policy for audio source
        let audioInfoToDiscard: AudioInfo<ManagedAudio> | undefined;
        if (this._oneShotAudioInfoList.length > 0) {
            this._oneShotAudioInfoList.forEach((audioInfo) => {
                if (!audioInfoToDiscard || audioInfo.playTime < audioInfoToDiscard.playTime) {
                    audioInfoToDiscard = audioInfo;
                }
            });
        } else {
            this._audioPlayerInfoList.forEach((audioInfo) => {
                if (!audioInfoToDiscard || audioInfo.playTime < audioInfoToDiscard.playTime) {
                    audioInfoToDiscard = audioInfo;
                }
            });
        }
        if (audioInfoToDiscard) {
            audioInfoToDiscard.audio.stop();
            this.removePlaying(audioInfoToDiscard.audio);
        }
    }

    public pause (): void {
        this._oneShotAudioInfoList.forEach((info): void => {
            info.audio.stop();
        });
        this._audioPlayerInfoList.forEach((info): void => {
            info.audio.pause().catch((e): void => {});
        });
    }

    public resume (): void {
        // onShotAudio can not be resumed
        this._audioPlayerInfoList.forEach((info): void => {
            info.audio.play().catch((e): void => {});
        });
    }
}

export const audioManager = new AudioManager();
