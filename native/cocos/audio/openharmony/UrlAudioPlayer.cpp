/****************************************************************************
Copyright (c) 2016 Chukong Technologies Inc.
Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

http://www.cocos2d-x.org

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
****************************************************************************/

#define LOG_TAG "UrlAudioPlayer"

#include "audio/openharmony/UrlAudioPlayer.h"
#include <map>
#include <algorithm> // for std::find
#include "audio/android/ICallerThreadUtils.h"
#include "audio/android/cutils/log.h"
#include "cocos/application/ApplicationManager.h"

namespace {

std::mutex __playerContainerMutex;

std::map<OH_AVPlayer *, cc::UrlAudioPlayer *> __playerContainer;
std::once_flag __onceFlag;

} // namespace

namespace cc {

UrlAudioPlayer::UrlAudioPlayer(ICallerThreadUtils *callerThreadUtils)
: _callerThreadUtils(callerThreadUtils), _id(-1), _playObj(nullptr), _volume(0.0f), _duration(0.0f), _isLoop(false), _isAudioFocus(true), _state(State::INVALID), _playEventCallback(nullptr), _isDestroyed(std::make_shared<bool>(false)) {
    _callerThreadId = callerThreadUtils->getCallerThreadId();
}

UrlAudioPlayer::~UrlAudioPlayer() {
    __playerContainerMutex.lock();

    auto it = __playerContainer.begin();
    while (it != __playerContainer.end()) {
        if (it->second == this) {
            it = __playerContainer.erase(it);
        } else {
            it++;
        }
    }

    __playerContainerMutex.unlock();
}

void UrlAudioPlayer::setPlayEventCallback(const PlayEventCallback &playEventCallback) {
    _playEventCallback = playEventCallback;
}

void UrlAudioPlayer::stop() {
    int32_t status = OH_AVPlayer_Stop(_playObj);
    if (status != 0) {
        ALOGE("UrlAudioPlayer::stop failed");
        return;
    }

    if (_state == State::PLAYING || _state == State::PAUSED) {
        setLoop(false);
        setState(State::STOPPED);

        if (_playEventCallback != nullptr) {
            _playEventCallback(State::STOPPED);
        }

        destroy();
        delete this;
    } else {
        ALOGW("UrlAudioPlayer (%p, state:%d) isn't playing or paused, could not invoke stop!", this, static_cast<int>(_state));
    }
}

void UrlAudioPlayer::pause() {
    if (_state == State::PLAYING) {
        int32_t status = OH_AVPlayer_Pause(_playObj);
        if (status != 0) {
            ALOGE("UrlAudioPlayer::pause failed");
            return;
        }
        setState(State::PAUSED);
    } else {
        ALOGW("UrlAudioPlayer (%p, state:%d) isn't playing, could not invoke pause!", this, static_cast<int>(_state));
    }
}

void UrlAudioPlayer::resume() {
    if (_state == State::PAUSED) {
        int32_t status = OH_AVPlayer_Play(_playObj);
        if (status != 0) {
            ALOGE("UrlAudioPlayer::resume failed");
            return;
        }
        setState(State::PLAYING);
    } else {
        ALOGW("UrlAudioPlayer (%p, state:%d) isn't paused, could not invoke resume!", this, static_cast<int>(_state));
    }
}

void UrlAudioPlayer::play() {
    if (_state == State::INITIALIZED || _state == State::PAUSED) {
        int32_t status = OH_AVPlayer_Play(_playObj);
        if (status != 0) {
            ALOGE("UrlAudioPlayer::play failed");
            return;
        }
        setState(State::PLAYING);
    } else {
        ALOGW("UrlAudioPlayer (%p, state:%d) isn't paused or initialized, could not invoke play!", this, static_cast<int>(_state));
    }
}

void UrlAudioPlayer::setVolumeToAVPlayer(float volume) {
    int32_t status = OH_AVPlayer_SetVolume(_playObj, volume, volume);
    if (status != 0) {
        ALOGE("UrlAudioPlayer::setVolume %f failed", volume);
    }
}

void UrlAudioPlayer::setVolume(float volume) {
    _volume = volume;
    if (_isAudioFocus) {
        setVolumeToAVPlayer(_volume);
    }
}

float UrlAudioPlayer::getVolume() const {
    return _volume;
}

void UrlAudioPlayer::setAudioFocus(bool isFocus) {
    _isAudioFocus = isFocus;
    float volume = _isAudioFocus ? _volume : 0.0f;
    setVolumeToAVPlayer(volume);
}

float UrlAudioPlayer::getDuration() const {
    if (_duration > 0) {
        return _duration;
    }

    int32_t duration = 0;
    int32_t status = OH_AVPlayer_GetDuration(_playObj, &duration);
    if (status != 0) {
        ALOGE("UrlAudioPlayer::getDuration failed");
        return -1.0f;
    }

    const_cast<UrlAudioPlayer *>(this)->_duration = duration / 1000.0f;
    if (_duration <= 0) {
        return -1.0f;
    }
    return _duration;
}

float UrlAudioPlayer::getPosition() const {
    int32_t currentTime = 0;
    int status = OH_AVPlayer_GetCurrentTime(_playObj, &currentTime);
    if (status != 0) {
        ALOGE("UrlAudioPlayer::getPosition failed");
        return -1.0f;
    }
    return currentTime / 1000.0f;
}

bool UrlAudioPlayer::setPosition(float pos) {
    int32_t millisecond = 1000.0f * pos;
    int status = OH_AVPlayer_Seek(_playObj, millisecond, AV_SEEK_NEXT_SYNC);
    if (status != 0) {
        ALOGE("UrlAudioPlayer::setPosition %f failed", pos);
        return false;
    }
    return true;
}

void UrlAudioPlayer::onInfo(OH_AVPlayer *player, AVPlayerOnInfoType type, int32_t extra) {
    if (type == AV_INFO_TYPE_STATE_CHANGE) {
        if (extra == AV_COMPLETED) {
            UrlAudioPlayer *audioPlayer = nullptr;
            auto it = __playerContainer.find(player);
            if (it != __playerContainer.end()) {
                UrlAudioPlayer *audioPlayer = it->second;
                audioPlayer->playEventCallback();
            }
        }
    } else if (type == AV_INFO_TYPE_INTERRUPT_EVENT) {
        auto it = __playerContainer.find(player);
        if (it != __playerContainer.end()) {
            UrlAudioPlayer *audioPlayer = it->second;
            const int32_t interruptHintResume = 1;
            const int32_t interruptHintPause = 2;
            if (extra == interruptHintResume) {
                audioPlayer->resume();
            } else if (extra == interruptHintPause) {
                audioPlayer->pause();
            } else {
                ALOGV("UrlAudioPlayer was interrupted, hint type is %d", extra);
            }
        }
    }
}

void UrlAudioPlayer::onError(OH_AVPlayer *player, int32_t errorCode, const char *errorMsg) {
    ALOGE("UrlAudioPlayer play failed, errorCode is: %d, errorMsg is %s", errorCode, errorMsg);
}

void UrlAudioPlayer::playEventCallback() {
    std::shared_ptr<bool> isDestroyed = _isDestroyed;
    auto func = [this, isDestroyed]() {
        // If it was destroyed, just return.
        if (*isDestroyed) {
            ALOGV("The UrlAudioPlayer (%p) was destroyed!", this);
            return;
        }

        // Note that It's in the caller's thread (Cocos Thread)
        //  If state is already stopped, ignore the play over event.
        if (_state == State::STOPPED) {
            return;
        }

        setState(State::OVER);
        if (_playEventCallback != nullptr) {
            _playEventCallback(State::OVER);
        }

        ALOGV("UrlAudioPlayer (%p) played over, destroy self ...", this);
        destroy();
        delete this;
    };

    if (_callerThreadId == std::this_thread::get_id()) {
        func();
    } else {
        CC_CURRENT_ENGINE()->getScheduler()->performFunctionInCocosThread(func);
    }
}

bool UrlAudioPlayer::prepare(const std::string &url, std::shared_ptr<AssetFd> assetFd, int32_t start, int32_t length) {
    _url = url;
    _assetFd = assetFd;
    _playObj = OH_AVPlayer_Create();

    __playerContainerMutex.lock();
    __playerContainer[_playObj] = this;
    __playerContainerMutex.unlock();

    AVPlayerCallback callback;
    callback.onInfo = this->onInfo;
    callback.onError = this->onError;
    OH_AVPlayer_SetPlayerCallback(_playObj, callback);
    OH_AVPlayer_SetFDSource(_playObj, _assetFd->getFd(), start, length);
    OH_AVPlayer_SetAudioRendererInfo(_playObj, OH_AudioStream_Usage::AUDIOSTREAM_USAGE_GAME);
    OH_AVErrCode code = OH_AVPlayer_Prepare(_playObj);
    if (code == AV_ERR_OK) {
        setState(State::INITIALIZED);
        return true;
    }

    ALOGE("Oops, prepare error: %d", (int)code);
    return false;
}

void UrlAudioPlayer::rewind() {
    // Not supported currently. since cocos audio engine will new -> prepare -> play again.
}

void UrlAudioPlayer::setLoop(bool isLoop) {
    _isLoop = isLoop;
    int status = OH_AVPlayer_SetLooping(_playObj, _isLoop);
    if (status != 0) {
        ALOGE("UrlAudioPlayer::setLoop %d failed", _isLoop ? 1 : 0);
    }
}

bool UrlAudioPlayer::isLoop() const {
    return _isLoop;
}

void UrlAudioPlayer::stopAll() {
    __playerContainerMutex.lock();
    auto temp = __playerContainer;
    __playerContainerMutex.unlock();

    auto it = temp.begin();
    while (it != temp.end()) {
        UrlAudioPlayer *thiz = it->second;
        thiz->stop();
        it++;
    }
}

void UrlAudioPlayer::destroy() {
    if (!*_isDestroyed) {
        *_isDestroyed = true;
        OH_AVErrCode code = OH_AVPlayer_Release(_playObj);
        if (code == AV_ERR_OK) {
            ALOGE("UrlAudioPlayer release error, code: %d", code);
        }
    }
}

} // namespace cc
