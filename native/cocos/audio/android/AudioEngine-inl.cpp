/****************************************************************************
 Copyright (c) 2014-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.

 http://www.cocos2d-x.org

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
****************************************************************************/
#define LOG_TAG "AudioEngineImpl"

#include "audio/android/AudioEngine-inl.h"

#include <unistd.h>
// for native asset manager
#if CC_PLATFORM == CC_PLATFORM_ANDROID
#include <android/asset_manager.h>
#include <android/asset_manager_jni.h>
#include <android/log.h>
#endif

#include <sys/types.h>
#include <mutex>
#include <thread>

#include "application/ApplicationManager.h"
#include "audio/include/AudioEngine.h"
#include "base/Log.h"
#include "base/Scheduler.h"
#include "base/UTF8.h"
#include "base/memory/Memory.h"
#if CC_PLATFORM == CC_PLATFORM_ANDROID
#include "platform/android/FileUtils-android.h"
#include "platform/java/jni/JniHelper.h"
#include "platform/java/jni/JniImp.h"
#elif CC_PLATFORM == CC_PLATFORM_OPENHARMONY
#include "cocos/platform/openharmony/FileUtils-OpenHarmony.h"
#endif

#include "audio/android/AudioDecoder.h"
#include "audio/android/AudioDecoderProvider.h"
#include "audio/android/AudioPlayerProvider.h"
#include "audio/android/IAudioPlayer.h"
#include "audio/android/ICallerThreadUtils.h"
#include "audio/android/UrlAudioPlayer.h"
#include "audio/android/cutils/log.h"
#include "engine/EngineEvents.h"

using namespace cc; //NOLINT

// Audio focus values synchronized with which in cocos/platform/android/java/src/com/cocos/lib/CocosNativeActivity.java
namespace {
AudioEngineImpl *gAudioImpl = nullptr;
int outputSampleRate = 44100;
#if CC_PLATFORM == CC_PLATFORM_ANDROID
int              bufferSizeInFrames = 192;
#endif

void getAudioInfo() {
#if CC_PLATFORM == CC_PLATFORM_ANDROID
    JNIEnv *  env         = JniHelper::getEnv();
    jclass    audioSystem = env->FindClass("android/media/AudioSystem");
    jmethodID method      = env->GetStaticMethodID(audioSystem, "getPrimaryOutputSamplingRate", "()I");
    outputSampleRate      = env->CallStaticIntMethod(audioSystem, method);
    method                = env->GetStaticMethodID(audioSystem, "getPrimaryOutputFrameCount", "()I");
    bufferSizeInFrames    = env->CallStaticIntMethod(audioSystem, method);
#else
    // In openharmony, setting to 48K does not cause audio delays
    outputSampleRate      = 48000;
#endif
}
} // namespace

class CallerThreadUtils : public ICallerThreadUtils {
public:
    void performFunctionInCallerThread(const std::function<void()> &func) override {
        CC_CURRENT_ENGINE()->getScheduler()->performFunctionInCocosThread(func);
    };

    std::thread::id getCallerThreadId() override {
        return _tid;
    };

    void setCallerThreadId(std::thread::id tid) {
        _tid = tid;
    };

private:
    std::thread::id _tid;
};

static CallerThreadUtils gCallerThreadUtils;

static int fdGetter(const ccstd::string &url, off_t *start, off_t *length) {
    int fd = -1;
#if CC_PLATFORM == CC_PLATFORM_ANDROID
    if (cc::FileUtilsAndroid::getObbFile() != nullptr) {
        int64_t startV;
        int64_t lenV;
        fd = cc::getObbAssetFileDescriptorJNI(url, &startV, &lenV);
        *start = static_cast<off_t>(startV);
        *length = static_cast<off_t>(lenV);
    }
    if (fd <= 0) {
        auto *asset = AAssetManager_open(cc::FileUtilsAndroid::getAssetManager(), url.c_str(), AASSET_MODE_UNKNOWN);
        // open asset as file descriptor
        fd = AAsset_openFileDescriptor(asset, start, length);
        AAsset_close(asset);
    }
#elif CC_PLATFORM == CC_PLATFORM_OPENHARMONY
    FileUtilsOpenHarmony* fileUtils = dynamic_cast<FileUtilsOpenHarmony*>(FileUtils::getInstance());
    if(fileUtils) {
        RawFileDescriptor64 descriptor;
        fileUtils->getRawFileDescriptor(url, descriptor);
        fd = descriptor.fd;
    }
#endif
    if (fd <= 0) {
        ALOGE("Failed to open file descriptor for '%s'", url.c_str());
    }

    return fd;
};

//====================================================
AudioEngineImpl::AudioEngineImpl()
: _engineObject(nullptr),
  _engineEngine(nullptr),
  _outputMixObject(nullptr),
  _audioPlayerProvider(nullptr),
  _audioIDIndex(0),
  _lazyInitLoop(true) {
    gCallerThreadUtils.setCallerThreadId(std::this_thread::get_id());
    gAudioImpl = this;
    getAudioInfo();
}

AudioEngineImpl::~AudioEngineImpl() {
    if (_audioPlayerProvider != nullptr) {
        delete _audioPlayerProvider;
        _audioPlayerProvider = nullptr;
    }

    if (_outputMixObject) {
        (*_outputMixObject)->Destroy(_outputMixObject);
    }
    if (_engineObject) {
        (*_engineObject)->Destroy(_engineObject);
    }

    gAudioImpl = nullptr;
}

bool AudioEngineImpl::init() {
    bool ret = false;
    do {
        // create engine
        auto result = slCreateEngine(&_engineObject, 0, nullptr, 0, nullptr, nullptr);
        if (SL_RESULT_SUCCESS != result) {
            CC_LOG_ERROR("create opensl engine fail");
            break;
        }

        // realize the engine
        result = (*_engineObject)->Realize(_engineObject, SL_BOOLEAN_FALSE);
        if (SL_RESULT_SUCCESS != result) {
            CC_LOG_ERROR("realize the engine fail");
            break;
        }

        // get the engine interface, which is needed in order to create other objects
        result = (*_engineObject)->GetInterface(_engineObject, SL_IID_ENGINE, &_engineEngine);
        if (SL_RESULT_SUCCESS != result) {
            CC_LOG_ERROR("get the engine interface fail");
            break;
        }
		#if CC_PLATFORM == CC_PLATFORM_ANDROID
	        // create output mix
	        const SLInterfaceID outputMixIIDs[] = {};
	        const SLboolean outputMixReqs[] = {};
	        result = (*_engineEngine)->CreateOutputMix(_engineEngine, &_outputMixObject, 0, outputMixIIDs, outputMixReqs);
	        if (SL_RESULT_SUCCESS != result) {
	            CC_LOG_ERROR("create output mix fail");
	            break;
	        }

	        // realize the output mix
	        result = (*_outputMixObject)->Realize(_outputMixObject, SL_BOOLEAN_FALSE);
	        if (SL_RESULT_SUCCESS != result) {
	            CC_LOG_ERROR("realize the output mix fail");
	            break;
	        }

	        _audioPlayerProvider = ccnew AudioPlayerProvider(_engineEngine, _outputMixObject, outputSampleRate, bufferSizeInFrames, fdGetter, &gCallerThreadUtils);
	    #elif CC_PLATFORM == CC_PLATFORM_OPENHARMONY
	        _audioPlayerProvider = ccnew AudioPlayerProvider(_engineEngine, outputSampleRate, fdGetter, &gCallerThreadUtils);
	    #endif
        ret = true;
    } while (false);

    return ret;
}

void AudioEngineImpl::setAudioFocusForAllPlayers(bool isFocus) {
    for (const auto &e : _audioPlayers) {
        e.second->setAudioFocus(isFocus);
    }
}

int AudioEngineImpl::play2d(const ccstd::string &filePath, bool loop, float volume) {
    ALOGV("play2d, _audioPlayers.size=%d", (int)_audioPlayers.size());
    auto audioId = AudioEngine::INVALID_AUDIO_ID;

    do {
		#if CC_PLATFORM == CC_PLATFORM_ANDROID
	        if (_engineEngine == nullptr || _audioPlayerProvider == nullptr) {
	            break;
	        }
        #elif CC_PLATFORM == CC_PLATFORM_OPENHARMONY
	        if (_audioPlayerProvider == nullptr)
	            break;
        #endif

        auto fullPath = FileUtils::getInstance()->fullPathForFilename(filePath);

        audioId = _audioIDIndex++;

        auto *player = _audioPlayerProvider->getAudioPlayer(fullPath);
        if (player != nullptr) {
            player->setId(audioId);
            _audioPlayers.insert(std::make_pair(audioId, player));

            player->setPlayEventCallback([this, player, filePath](IAudioPlayer::State state) {
                if (state != IAudioPlayer::State::OVER && state != IAudioPlayer::State::STOPPED) {
                    ALOGV("Ignore state: %d", static_cast<int>(state));
                    return;
                }

                int id = player->getId();

                ALOGV("Removing player id=%d, state:%d", id, (int)state);

                AudioEngine::remove(id);
                if (_audioPlayers.find(id) != _audioPlayers.end()) {
                    _audioPlayers.erase(id);
                }
                if (_urlAudioPlayersNeedResume.find(id) != _urlAudioPlayersNeedResume.end()) {
                    _urlAudioPlayersNeedResume.erase(id);
                }

                auto iter = _callbackMap.find(id);
                if (iter != _callbackMap.end()) {
                    if (state == IAudioPlayer::State::OVER) {
                        iter->second(id, filePath);
                    }
                    _callbackMap.erase(iter);
                }
            });

            player->setLoop(loop);
            player->setVolume(volume);
            player->play();
        } else {
            ALOGE("Oops, player is null ...");
            return AudioEngine::INVALID_AUDIO_ID;
        }

        AudioEngine::sAudioIDInfoMap[audioId].state = AudioEngine::AudioState::PLAYING;

    } while (false);

    return audioId;
}

void AudioEngineImpl::setVolume(int audioID, float volume) {
    auto iter = _audioPlayers.find(audioID);
    if (iter != _audioPlayers.end()) {
        auto *player = iter->second;
        player->setVolume(volume);
    }
}

void AudioEngineImpl::setLoop(int audioID, bool loop) {
    auto iter = _audioPlayers.find(audioID);
    if (iter != _audioPlayers.end()) {
        auto *player = iter->second;
        player->setLoop(loop);
    }
}

void AudioEngineImpl::pause(int audioID) {
    auto iter = _audioPlayers.find(audioID);
    if (iter != _audioPlayers.end()) {
        auto *player = iter->second;
        player->pause();
    }
}

void AudioEngineImpl::resume(int audioID) {
    auto iter = _audioPlayers.find(audioID);
    if (iter != _audioPlayers.end()) {
        auto *player = iter->second;
        player->resume();
    }
}

void AudioEngineImpl::stop(int audioID) {
    auto iter = _audioPlayers.find(audioID);
    if (iter != _audioPlayers.end()) {
        auto *player = iter->second;
        player->stop();
    }
}

void AudioEngineImpl::stopAll() {
    if (_audioPlayers.empty()) {
        return;
    }

    // Create a temporary vector for storing all players since
    // p->stop() will trigger _audioPlayers.erase,
    // and it will cause a crash as it's already in for loop
    ccstd::vector<IAudioPlayer *> players;
    players.reserve(_audioPlayers.size());

    for (const auto &e : _audioPlayers) {
        players.push_back(e.second);
    }

    for (auto *p : players) {
        p->stop();
    }
}

float AudioEngineImpl::getDuration(int audioID) {
    auto iter = _audioPlayers.find(audioID);
    if (iter != _audioPlayers.end()) {
        auto *player = iter->second;
        return player->getDuration();
    }
    return 0.0F;
}

float AudioEngineImpl::getDurationFromFile(const ccstd::string &filePath) {
    if (_audioPlayerProvider != nullptr) {
        auto fullPath = FileUtils::getInstance()->fullPathForFilename(filePath);
        return _audioPlayerProvider->getDurationFromFile(fullPath);
    }
    return 0;
}

float AudioEngineImpl::getCurrentTime(int audioID) {
    auto iter = _audioPlayers.find(audioID);
    if (iter != _audioPlayers.end()) {
        auto *player = iter->second;
        return player->getPosition();
    }
    return 0.0F;
}

bool AudioEngineImpl::setCurrentTime(int audioID, float time) {
    auto iter = _audioPlayers.find(audioID);
    if (iter != _audioPlayers.end()) {
        auto *player = iter->second;
        return player->setPosition(time);
    }
    return false;
}

void AudioEngineImpl::setFinishCallback(int audioID, const std::function<void(int, const ccstd::string &)> &callback) {
    _callbackMap[audioID] = callback;
}

void AudioEngineImpl::preload(const ccstd::string &filePath, const std::function<void(bool)> &callback) {
    if (_audioPlayerProvider != nullptr) {
        ccstd::string fullPath = FileUtils::getInstance()->fullPathForFilename(filePath);
        _audioPlayerProvider->preloadEffect(fullPath, [callback](bool succeed, const PcmData & /*data*/) {
            if (callback != nullptr) {
                callback(succeed);
            }
        });
    } else {
        if (callback != nullptr) {
            callback(false);
        }
    }
}

void AudioEngineImpl::uncache(const ccstd::string &filePath) {
    if (_audioPlayerProvider != nullptr) {
        ccstd::string fullPath = FileUtils::getInstance()->fullPathForFilename(filePath);
        _audioPlayerProvider->clearPcmCache(fullPath);
    }
}

void AudioEngineImpl::uncacheAll() {
    if (_audioPlayerProvider != nullptr) {
        _audioPlayerProvider->clearAllPcmCaches();
    }
}

void AudioEngineImpl::onPause() {
    if (_audioPlayerProvider != nullptr) {
        _audioPlayerProvider->pause();
    }
}

void AudioEngineImpl::onResume() {
    if (_audioPlayerProvider != nullptr) {
        _audioPlayerProvider->resume();
    }
}

PCMHeader AudioEngineImpl::getPCMHeader(const char *url) {
    PCMHeader header{};
    ccstd::string fileFullPath = FileUtils::getInstance()->fullPathForFilename(url);
    if (fileFullPath.empty()) {
        CC_LOG_DEBUG("file %s does not exist or failed to load", url);
        return header;
    }
    if (_audioPlayerProvider->getPcmHeader(url, header)) {
        CC_LOG_DEBUG("file %s pcm data already cached", url);
        return header;
    }
    #if CC_PLATFORM == CC_PLATFORM_ANDROID
    AudioDecoder *decoder = AudioDecoderProvider::createAudioDecoder(_engineEngine, fileFullPath, bufferSizeInFrames, outputSampleRate, fdGetter);
    #elif CC_PLATFORM == CC_PLATFORM_OPENHARMONY
    AudioDecoder *decoder = AudioDecoderProvider::createAudioDecoder(
        _engineEngine, fileFullPath, _audioPlayerProvider->getBufferSizeInFrames(), outputSampleRate, fdGetter);
    #endif
    if (decoder == nullptr) {
        CC_LOG_DEBUG("decode %s failed, the file formate might not support", url);
        return header;
    }
    if (!decoder->start()) {
        CC_LOG_DEBUG("[Audio Decoder] Decode failed %s", url);
        return header;
    }
    // Ready to decode
    do {
        PcmData data = decoder->getResult();
        header.bytesPerFrame = data.bitsPerSample / 8;
        header.channelCount = data.numChannels;
        header.dataFormat = AudioDataFormat::SIGNED_16;
        header.sampleRate = data.sampleRate;
        header.totalFrames = data.numFrames;
    } while (false);

    AudioDecoderProvider::destroyAudioDecoder(&decoder);
    return header;
}

ccstd::vector<uint8_t> AudioEngineImpl::getOriginalPCMBuffer(const char *url, uint32_t channelID) {
    ccstd::string fileFullPath = FileUtils::getInstance()->fullPathForFilename(url);
    ccstd::vector<uint8_t> pcmData;
    if (fileFullPath.empty()) {
        CC_LOG_DEBUG("file %s does not exist or failed to load", url);
        return pcmData;
    }
    PcmData data;
    if (_audioPlayerProvider->getPcmData(url, data)) {
        CC_LOG_DEBUG("file %s pcm data already cached", url);
    } else {
        #if CC_PLATFORM == CC_PLATFORM_ANDROID
        AudioDecoder *decoder = AudioDecoderProvider::createAudioDecoder(_engineEngine, fileFullPath, bufferSizeInFrames, outputSampleRate, fdGetter);
        #else 
        AudioDecoder *decoder = AudioDecoderProvider::createAudioDecoder(
            _engineEngine, fileFullPath, _audioPlayerProvider->getBufferSizeInFrames(), outputSampleRate, fdGetter);
        #endif
        if (decoder == nullptr) {
            CC_LOG_DEBUG("decode %s failed, the file formate might not support", url);
            return pcmData;
        }
        if (!decoder->start()) {
            CC_LOG_DEBUG("[Audio Decoder] Decode failed %s", url);
            return pcmData;
        }
        data = decoder->getResult();
        _audioPlayerProvider->registerPcmData(url, data);
        AudioDecoderProvider::destroyAudioDecoder(&decoder);
    }
    do {
        const uint32_t channelCount = data.numChannels;
        if (channelID >= channelCount) {
            CC_LOG_ERROR("channelID invalid, total channel count is %d but %d is required", channelCount, channelID);
            break;
        }
        // bytesPerSample  = bitsPerSample / 8, according to 1 byte = 8 bits
        const uint32_t bytesPerFrame = data.numChannels * data.bitsPerSample / 8;
        const uint32_t numFrames = data.numFrames;
        const uint32_t bytesPerChannelInFrame = bytesPerFrame / channelCount;

        pcmData.resize(bytesPerChannelInFrame * numFrames);
        uint8_t *p = pcmData.data();
        char *tmpBuf = data.pcmBuffer->data(); // shared ptr
        for (int itr = 0; itr < numFrames; itr++) {
            memcpy(p, tmpBuf + itr * bytesPerFrame + channelID * bytesPerChannelInFrame, bytesPerChannelInFrame);
            p += bytesPerChannelInFrame;
        }
    } while (false);

    return pcmData;
}
