/*
 * Copyright 2022 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

#pragma once

#if CC_PLATFORM == CC_PLATFORM_ANDROID && __ANDROID_API__ >= 30 && CC_USE_ADPF
    #include <android/api-level.h>
    #include <android/log.h>
    #include <android/thermal.h>
    #if __ANDROID_API__ >= 33
        #include <android/performance_hint.h>
        #include <ctime>
    #endif
    #include <jni.h>

    #include <chrono>
    #include <memory>
    #include <thread>
    #include "3d/models/SkinningModel.h"
    #include "engine/EngineEvents.h"
    #include "platform/java/jni/JniHelper.h"

// Forward declarations of functions that need to be in C decl.

typedef void (*thermalStateChangeListener)(int32_t, int32_t);

/*
 * ADPFManager class anages the ADPF APIs.
 */
class ADPFManager {
public:
    // Singleton function.
    static ADPFManager &getInstance() {
        static ADPFManager instance;
        return instance;
    }

    // Dtor.
    ~ADPFManager() {
        // Remove global reference.
        auto env = cc::JniHelper::getEnv();
        if (env != nullptr) {
            if (obj_power_service_ != nullptr) {
                env->DeleteGlobalRef(obj_power_service_);
            }
            if (obj_perfhint_service_ != nullptr) {
                env->DeleteGlobalRef(obj_perfhint_service_);
            }
            if (obj_perfhint_session_ != nullptr) {
                env->DeleteGlobalRef(obj_perfhint_session_);
            }
            if (thermal_manager_ != nullptr) {
                AThermal_releaseManager(thermal_manager_);
            }
        }

        // clean all hint sessions
        for (const auto &kv : map_hint_sessions) {
            jobject global_hint_session = kv.second;
            env->DeleteGlobalRef(global_hint_session);
        }
    }

    // Delete copy constructor since the class is used as a singleton.
    ADPFManager(ADPFManager const &) = delete;

    void operator=(ADPFManager const &) = delete;

    // Invoke the method periodically (once a frame) to monitor
    // the device's thermal throttling status.
    void monitor();

    // Invoke the API first to set the android_app instance.

    // Method to set thermal status. Need to be public since the method
    // is called from C native listener.
    void setThermalStatus(int32_t i);

    // Get current thermal status and headroom.
    int32_t getThermalStatus() { return thermal_status_; }
    float getThermalStatusNormalized() const;

    float getFrameTimeMS() const { return frame_time_ns_ / 1000000.0F; }

    float getThermalHeadroom() { return thermal_headroom_; }

    void setThermalListener(thermalStateChangeListener listener);

    // Indicates the start and end of the performance intensive task.
    // The methods call performance hint API to tell the performance
    // hint to the system.
    void beginPerfHintSession();

    void endPerfHintSession(jlong target_duration_ns);

    void addThreadIdToHintSession(int32_t tid);
    void removeThreadIdFromHintSession(int32_t tid);

    // Method to retrieve thermal manager. The API is used to register/unregister
    // callbacks from C API.
    AThermalManager *getThermalManager() { return thermal_manager_; }

    void initialize();
    void destroy();

private:
    // Update thermal headroom each sec.
    static constexpr auto kThermalHeadroomUpdateThreshold = std::chrono::seconds(1);

    // Function pointer from the game, will be invoked when we receive state changed event from Thermal API
    static thermalStateChangeListener thermalListener;

    // Ctor. It's private since the class is designed as a singleton.
    ADPFManager()
    : thermal_manager_(nullptr),
      thermal_status_(0),
      thermal_headroom_(0.f),
      obj_power_service_(nullptr),
      get_thermal_headroom_(0),
      obj_perfhint_service_(nullptr),
      obj_perfhint_session_(nullptr),
      report_actual_work_duration_(0),
      update_target_work_duration_(0),
      preferred_update_rate_(0) {
        last_clock_ = std::chrono::high_resolution_clock::now();
    }

    // Functions to initialize ADPF API's calls.
    bool initializePowerManager();

    float updateThermalStatusHeadRoom();

    bool initializePerformanceHintManager();

    void registerThreadIdsToHintSession();

    AThermalManager *thermal_manager_ = nullptr;
    int32_t thermal_status_;
    float thermal_headroom_ = 0;
    float thermal_headroom_valid_ = 0;
    std::chrono::time_point<std::chrono::high_resolution_clock> last_clock_;
    jobject obj_power_service_;
    jmethodID get_thermal_headroom_;

    std::unordered_map<std::string, jobject> map_hint_sessions;

    jobject obj_perfhint_service_;
    jobject obj_perfhint_session_;
    jmethodID create_hint_session_;
    jmethodID set_threads_;
    jmethodID report_actual_work_duration_;
    jmethodID update_target_work_duration_;
    jlong preferred_update_rate_;

    cc::events::BeforeTick::Listener beforeTick;
    cc::events::AfterTick::Listener afterTick;

    int64_t frame_time_ns_{0};

    std::vector<int32_t> thread_ids_;
    std::chrono::time_point<std::chrono::steady_clock> perf_start_;

    #if __ANDROID_API__ >= 33
    APerformanceHintManager *hint_manager_ = nullptr;
    APerformanceHintSession *hint_session_ = nullptr;
    int64_t last_target_ = 16666666;
    #endif
};

    #define CC_SUPPORT_ADPF 1 // NOLINT
#else
    #define CC_SUPPORT_ADPF 0 // NOLINT
#endif                        // ADPF_MANAGER_H_
