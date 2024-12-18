/****************************************************************************
 Copyright (c) 2016 Chukong Technologies Inc.
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

#pragma once

#include <condition_variable>
#include <memory>
#include "audio/android/IAudioPlayer.h"
#include "audio/android/OpenSLHelper.h"
#include "audio/android/PcmData.h"
#include "audio/include/AudioDef.h"
#include "base/std/container/unordered_map.h"

namespace cc {
// Manage PcmAudioPlayer& UrlAudioPlayer

class PcmAudioPlayer;
class PcmAudioService;
class UrlAudioPlayer;
class AudioMixerController;
class ICallerThreadUtils;
class AssetFd;
class LegacyThreadPool;

class AudioPlayerProvider {
public:
#if CC_PLATFORM == CC_PLATFORM_ANDROID
    AudioPlayerProvider(SLEngineItf engineItf, SLObjectItf outputMixObject, int deviceSampleRate,
                        int bufferSizeInFrames, const FdGetterCallback &fdGetterCallback,
                        ICallerThreadUtils *callerThreadUtils);
#elif CC_PLATFORM == CC_PLATFORM_OPENHARMONY
    AudioPlayerProvider(SLEngineItf engineItf, int deviceSampleRate,
                        const FdGetterCallback &fdGetterCallback, ICallerThreadUtils *callerThreadUtils);
    int getBufferSizeInFrames() const {
        return _bufferSizeInFrames;
    }
#endif

    virtual ~AudioPlayerProvider();
    bool isFileCached(const ccstd::string &audioFilePath);
    IAudioPlayer *getAudioPlayer(const ccstd::string &audioFilePath);
    bool getPcmHeader(const ccstd::string &audioFilePath, PCMHeader &header);
    bool getPcmData(const ccstd::string &audioFilePath, PcmData &data);
    using PreloadCallback = std::function<void(bool, PcmData)>;
    void preloadEffect(const ccstd::string &audioFilePath, const PreloadCallback &callback);
    void registerPcmData(const ccstd::string &audioFilePath, PcmData &data);
    float getDurationFromFile(const ccstd::string &filePath);
    void clearPcmCache(const ccstd::string &audioFilePath);

    void clearAllPcmCaches();

    void pause();

    void resume();

private:
    struct AudioFileInfo {
        ccstd::string url;
        std::shared_ptr<AssetFd> assetFd;
        off_t start{};
        off_t length;

        AudioFileInfo()
        : assetFd(nullptr) {}

        inline bool isValid() const {
            return !url.empty() && length > 0;
        }
    };

    PcmAudioPlayer *obtainPcmAudioPlayer(const ccstd::string &url, const PcmData &pcmData);

    UrlAudioPlayer *createUrlAudioPlayer(const AudioFileInfo &info);

    void preloadEffect(const AudioFileInfo &info, const PreloadCallback &callback, bool isPreloadInPlay2d);

    AudioFileInfo getFileInfo(const ccstd::string &audioFilePath);

    bool isSmallFile(const AudioFileInfo &info);

    SLEngineItf _engineItf;
    SLObjectItf _outputMixObject;
    int _deviceSampleRate;
    int _bufferSizeInFrames;
    FdGetterCallback _fdGetterCallback;
    ICallerThreadUtils *_callerThreadUtils;

    ccstd::unordered_map<ccstd::string, PcmData> _pcmCache;
    std::mutex _pcmCacheMutex;

    struct PreloadCallbackParam {
        PreloadCallback callback;
        bool isPreloadInPlay2d;
    };

    ccstd::unordered_map<ccstd::string, ccstd::vector<PreloadCallbackParam>> _preloadCallbackMap;
    std::mutex _preloadCallbackMutex;

    std::mutex _preloadWaitMutex;
    std::condition_variable _preloadWaitCond;

    PcmAudioService *_pcmAudioService;
    AudioMixerController *_mixController;

    LegacyThreadPool *_threadPool;
};

} // namespace cc
