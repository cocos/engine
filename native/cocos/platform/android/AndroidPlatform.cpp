/****************************************************************************
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
****************************************************************************/

#include "platform/android/AndroidPlatform.h"
#include <android/native_window_jni.h>
#include <thread>
#include "application/ApplicationManager.h"
#include "base/Log.h"
#include "base/memory/Memory.h"
#include "base/std/container/unordered_map.h"
#include "game-activity/native_app_glue/android_native_app_glue.h"
#include "java/jni/JniHelper.h"
#include "modules/Screen.h"
#include "modules/System.h"
#include "platform/BasePlatform.h"
#include "platform/android/FileUtils-android.h"
#include "platform/java/jni/JniImp.h"
#include "platform/java/modules/Accelerometer.h"
#include "platform/java/modules/Battery.h"
#include "platform/java/modules/Network.h"
#include "platform/java/modules/SystemWindow.h"
#include "platform/java/modules/SystemWindowManager.h"
#include "platform/java/modules/Vibrator.h"

#include "platform/interfaces/modules/IXRInterface.h"
#if CC_USE_XR
#include "platform/java/modules/XRInterface.h"
#endif

#include "base/StringUtil.h"
#include "engine/EngineEvents.h"
#include "paddleboat.h"
#include "platform/java/jni/JniImp.h"
#include "platform/interfaces/modules/Device.h"

#define ABORT_GAME                          \
    {                                       \
        CC_LOG_ERROR("*** GAME ABORTING."); \
        *((volatile char *)0) = 'a';        \
    }

#define ABORT_IF(cond)                                   \
    {                                                    \
        if (!(cond)) {                                   \
            CC_LOG_ERROR("ASSERTION FAILED: %s", #cond); \
            ABORT_GAME;                                  \
        }                                                \
    }

#define INPUT_ACTION_COUNT 6

// Interval time per frame, in milliseconds
#define LOW_FREQUENCY_TIME_INTERVAL 50

// Maximum runtime of game threads while in the background, in seconds
#define LOW_FREQUENCY_EXPIRED_DURATION_SECONDS 60

#define CC_ENABLE_SUSPEND_GAME_THREAD true

extern int cocos_main(int argc, const char **argv); // NOLINT(readability-identifier-naming)

namespace cc {

struct cc::KeyboardEvent keyboardEvent;

struct InputAction {
    uint32_t buttonMask{0};
    int32_t actionCode{-1};
};

extern ccstd::unordered_map<int32_t, const char *> androidKeyCodes;

static const InputAction PADDLEBOAT_ACTIONS[INPUT_ACTION_COUNT] = {
    {PADDLEBOAT_BUTTON_DPAD_UP, static_cast<int>(KeyCode::DPAD_UP)},
    {PADDLEBOAT_BUTTON_DPAD_LEFT, static_cast<int>(KeyCode::DPAD_LEFT)},
    {PADDLEBOAT_BUTTON_DPAD_DOWN, static_cast<int>(KeyCode::DPAD_DOWN)},
    {PADDLEBOAT_BUTTON_DPAD_RIGHT, static_cast<int>(KeyCode::DPAD_RIGHT)},
};

struct ControllerKeyRemap {
    Paddleboat_Buttons buttonMask;
    StickKeyCode actionCode{StickKeyCode::UNDEFINE};
    const char *name;
};

#define REMAP_WITH_NAME(btn, key) \
    { btn, key, #btn }

static const ControllerKeyRemap PADDLEBOAT_MAPKEY[] = {
    REMAP_WITH_NAME(PADDLEBOAT_BUTTON_A, StickKeyCode::A),
    REMAP_WITH_NAME(PADDLEBOAT_BUTTON_B, StickKeyCode::B),
    REMAP_WITH_NAME(PADDLEBOAT_BUTTON_X, StickKeyCode::X),
    REMAP_WITH_NAME(PADDLEBOAT_BUTTON_Y, StickKeyCode::Y),
    REMAP_WITH_NAME(PADDLEBOAT_BUTTON_L1, StickKeyCode::L1),
    // REMAP_WITH_NAME(PADDLEBOAT_BUTTON_L2, StickKeyCode::TRIGGER_LEFT),
    REMAP_WITH_NAME(PADDLEBOAT_BUTTON_L3, StickKeyCode::L3),
    REMAP_WITH_NAME(PADDLEBOAT_BUTTON_R1, StickKeyCode::R1),
    // REMAP_WITH_NAME(PADDLEBOAT_BUTTON_R2, StickKeyCode::TRIGGER_RIGHT),
    REMAP_WITH_NAME(PADDLEBOAT_BUTTON_R3, StickKeyCode::R3),
    REMAP_WITH_NAME(PADDLEBOAT_BUTTON_SELECT, StickKeyCode::MINUS),
    REMAP_WITH_NAME(PADDLEBOAT_BUTTON_START, StickKeyCode::PLUS),
    REMAP_WITH_NAME(PADDLEBOAT_BUTTON_SYSTEM, StickKeyCode::MENU),
    REMAP_WITH_NAME(PADDLEBOAT_BUTTON_TOUCHPAD, StickKeyCode::UNDEFINE),
    REMAP_WITH_NAME(PADDLEBOAT_BUTTON_AUX1, StickKeyCode::UNDEFINE),
    REMAP_WITH_NAME(PADDLEBOAT_BUTTON_AUX2, StickKeyCode::UNDEFINE),
    REMAP_WITH_NAME(PADDLEBOAT_BUTTON_AUX3, StickKeyCode::UNDEFINE),
    REMAP_WITH_NAME(PADDLEBOAT_BUTTON_AUX4, StickKeyCode::UNDEFINE),
};
#undef REMAP_WITH_NAME

const int INPUT_ACTION_REMAP_COUNT = sizeof(PADDLEBOAT_MAPKEY) / sizeof(ControllerKeyRemap);

static const InputAction INPUT_KEY_ACTIONS[] = {
    {AKEYCODE_BACK, static_cast<int>(KeyCode::MOBILE_BACK)},
    {AKEYCODE_ENTER, static_cast<int>(KeyCode::ENTER)},
    {AKEYCODE_MENU, static_cast<int>(KeyCode::ALT_LEFT)},
    {AKEYCODE_DPAD_UP, static_cast<int>(KeyCode::DPAD_UP)},
    {AKEYCODE_DPAD_DOWN, static_cast<int>(KeyCode::DPAD_DOWN)},
    {AKEYCODE_DPAD_LEFT, static_cast<int>(KeyCode::DPAD_LEFT)},
    {AKEYCODE_DPAD_RIGHT, static_cast<int>(KeyCode::DPAD_RIGHT)},
    {AKEYCODE_DPAD_CENTER, static_cast<int>(KeyCode::DPAD_CENTER)},
};

static bool keyState[INPUT_ACTION_COUNT] = {false};

extern void gameControllerStatusCallback(int32_t controllerIndex,
                                         Paddleboat_ControllerStatus status,
                                         void *userData);

class GameInputProxy {
public:
    explicit GameInputProxy(AndroidPlatform *platform) {
        _androidPlatform = platform;
        if (0 != platform->_app->activity->vm->AttachCurrentThread(&_jniEnv, nullptr)) {
            CC_LOG_FATAL("*** FATAL ERROR: Failed to attach thread to JNI.");
            ABORT_GAME
        }
        ABORT_IF(_jniEnv != nullptr)

        Paddleboat_init(_jniEnv, platform->_app->activity->javaGameActivity);
        Paddleboat_setControllerStatusCallback(gameControllerStatusCallback, this);
        // This is needed to allow controller events through to us.
        // By default, only touch-screen events are passed through, to match the
        // behaviour of NativeActivity.
        android_app_set_motion_event_filter(platform->_app, nullptr);

        // Flags to control how the IME behaves.
        static constexpr int INPUTTYPE_DOT_TYPE_CLASS_TEXT = 1;
        static constexpr int IME_ACTION_NONE = 1;
        static constexpr int IME_FLAG_NO_FULLSCREEN = 33554432;

        GameActivity_setImeEditorInfo(platform->_app->activity, INPUTTYPE_DOT_TYPE_CLASS_TEXT,
                                      IME_ACTION_NONE, IME_FLAG_NO_FULLSCREEN);
    }

    ~GameInputProxy() {
        Paddleboat_setControllerStatusCallback(nullptr, nullptr);
        Paddleboat_destroy(_jniEnv);
        if (_jniEnv) {
            CC_LOG_INFO("Detaching current thread from JNI.");
            _androidPlatform->_app->activity->vm->DetachCurrentThread();
            CC_LOG_INFO("Current thread detached from JNI.");
            _jniEnv = nullptr;
        }
    }
    void checkForNewAxis() {
        // Tell GameActivity about any new axis ids so it reports
        // their events
        const uint64_t activeAxisIds = Paddleboat_getActiveAxisMask();
        uint64_t newAxisIds = activeAxisIds ^ _activeAxisIds;
        if (newAxisIds != 0) {
            _activeAxisIds = activeAxisIds;
            int32_t currentAxisId = 0;
            while (newAxisIds != 0) {
                if ((newAxisIds & 1) != 0) {
                    CC_LOG_INFO("Enable Axis: %d", currentAxisId);
                    GameActivityPointerAxes_enableAxis(currentAxisId);
                }
                ++currentAxisId;
                newAxisIds >>= 1;
            }
        }
    }

    void handleInput() {
        checkForNewAxis();
        Paddleboat_update(_jniEnv);
        // If we get any key or motion events that were handled by a game controller,
        // read controller data and cook it into an event
        bool controllerEvent = false;

        // Swap input buffers so we don't miss any events while processing inputBuffer.
        android_input_buffer *inputBuffer = android_app_swap_input_buffers(
            _androidPlatform->_app);
        // Early exit if no events.
        if (inputBuffer == nullptr) return;

        if (inputBuffer->keyEventsCount != 0) {
            for (uint64_t i = 0; i < inputBuffer->keyEventsCount; ++i) {
                GameActivityKeyEvent *keyEvent = &inputBuffer->keyEvents[i];
                if (_gameControllerIndex >= 0 && Paddleboat_processGameActivityKeyInputEvent(keyEvent,
                                                                                             sizeof(GameActivityKeyEvent))) {
                    controllerEvent = true;
                } else {
                    cookGameActivityKeyEvent(keyEvent);
                }
            }
            android_app_clear_key_events(inputBuffer);
        }
        if (inputBuffer->motionEventsCount != 0) {
            for (uint64_t i = 0; i < inputBuffer->motionEventsCount; ++i) {
                GameActivityMotionEvent *motionEvent = &inputBuffer->motionEvents[i];

                if (_gameControllerIndex >= 0 && Paddleboat_processGameActivityMotionInputEvent(motionEvent,
                                                                                                sizeof(GameActivityMotionEvent))) {
                    controllerEvent = true;
                } else {
                    // Didn't belong to a game controller, process it ourselves if it is a touch event
                    bool isMouseEvent = motionEvent->pointerCount > 0 && (motionEvent->pointers[0].toolType == AMOTION_EVENT_TOOL_TYPE_STYLUS || motionEvent->pointers[0].toolType == AMOTION_EVENT_TOOL_TYPE_MOUSE);
                    if (isMouseEvent) {
                        cookGameActivityMouseEvent(motionEvent);
                    } else {
                        cookGameActivityMotionEvent(motionEvent);
                    }
                }
            }
            android_app_clear_motion_events(inputBuffer);
        }

        if (controllerEvent) {
            cookGameControllerEvent(_gameControllerIndex);
        }
    }

    struct ButtonState {
        uint32_t buttonsDown;
        uint32_t &prevState;
#define DEF_ATTR(name, code)                                                                      \
    bool name##Pressed() const { return buttonsDown & PADDLEBOAT_BUTTON_##code; }                 \
    bool name##Rel() const { return !name##Pressed() && (prevState & PADDLEBOAT_BUTTON_##code); } \
    bool name() const { return name##Pressed() || name##Rel(); }

        DEF_ATTR(dpadLeft, DPAD_LEFT)
        DEF_ATTR(dpadRight, DPAD_RIGHT)
        DEF_ATTR(dpadUp, DPAD_UP)
        DEF_ATTR(dpadDown, DPAD_DOWN)

        DEF_ATTR(l2, L2)
        DEF_ATTR(r2, R2)

#undef DEF_ATTR
    };

    bool cookGameControllerEvent(const int32_t gameControllerIndex) {
        static std::vector<uint32_t> prevStates{4};
        bool addedControllerEvent = false;
        cc::ControllerInfo info;
        if (gameControllerIndex >= 0) {
            if (gameControllerIndex >= prevStates.size()) {
                prevStates.resize(gameControllerIndex * 2 + 1);
            }
            uint32_t &prevButtonsDown = prevStates[gameControllerIndex];

            info.napdId = gameControllerIndex;
            Paddleboat_Controller_Data controllerData;
            if (Paddleboat_getControllerData(gameControllerIndex, &controllerData) ==
                PADDLEBOAT_NO_ERROR) {
                addedControllerEvent = true;
                // Generate events from buttons
                for (auto inputAction : PADDLEBOAT_ACTIONS) {
                    if (controllerData.buttonsDown & inputAction.buttonMask) {
                        reportKeyState(inputAction.actionCode, true);
                    } else if (prevButtonsDown & inputAction.buttonMask) {
                        reportKeyState(inputAction.actionCode, false);
                    }
                }
                for (auto remap : PADDLEBOAT_MAPKEY) {
                    auto code = remap.actionCode;
                    if (controllerData.buttonsDown & remap.buttonMask) {
                        if (code == StickKeyCode::UNDEFINE) {
                            CC_LOG_ERROR("key \"%s\" is unhandled", remap.name);
                        }
                        cc::ControllerInfo::ButtonInfo buttonInfo{code, true};
                        info.buttonInfos.emplace_back(buttonInfo);
                    } else if (prevButtonsDown & remap.buttonMask) {
                        cc::ControllerInfo::ButtonInfo buttonInfo{code, false};
                        buttonInfo.key = code;
                        buttonInfo.isPress = false;
                        info.buttonInfos.emplace_back(buttonInfo);
                    }
                }
                const ButtonState bts{controllerData.buttonsDown, prevButtonsDown};
                if (bts.dpadLeft() || bts.dpadRight()) {
                    float dLeft = bts.dpadLeftRel() ? 0.0F : (bts.dpadLeftPressed() ? -1.0F : 0.0F);
                    float dRight = bts.dpadRightRel() ? 0.0F : (bts.dpadRightPressed() ? 1.0F : 0.0F);
                    const ControllerInfo::AxisInfo axisInfo(StickAxisCode::X, dLeft + dRight);
                    info.axisInfos.emplace_back(axisInfo);
                }
                if (bts.dpadUp() || bts.dpadDown()) {
                    float dUp = bts.dpadUpRel() ? 0.0F : (bts.dpadUp() ? 1.0F : 0.0F);
                    float dDown = bts.dpadDownRel() ? 0.0F : (bts.dpadDown() ? -1.0F : 0.0F);
                    const ControllerInfo::AxisInfo axisInfo(StickAxisCode::Y, dUp + dDown);
                    info.axisInfos.emplace_back(axisInfo);
                }
                if (bts.l2()) {
                    const ControllerInfo::AxisInfo axisInfo(StickAxisCode::L2, bts.l2Rel() ? 0.0F : (bts.l2Pressed() ? controllerData.triggerL2 : 0.0F));
                    info.axisInfos.emplace_back(axisInfo);
                }
                if (bts.r2()) {
                    const ControllerInfo::AxisInfo axisInfo(StickAxisCode::R2, bts.r2Rel() ? 0.0F : (bts.r2Pressed() ? controllerData.triggerR2 : 0.0F));
                    info.axisInfos.emplace_back(axisInfo);
                }

                auto lx = controllerData.leftStick.stickX;
                auto ly = -controllerData.leftStick.stickY;
                auto rx = controllerData.rightStick.stickX;
                auto ry = -controllerData.rightStick.stickY;

                info.axisInfos.emplace_back(StickAxisCode::LEFT_STICK_X, lx);
                info.axisInfos.emplace_back(StickAxisCode::LEFT_STICK_Y, ly);
                info.axisInfos.emplace_back(StickAxisCode::RIGHT_STICK_X, rx);
                info.axisInfos.emplace_back(StickAxisCode::RIGHT_STICK_Y, ry);

                ControllerEvent controllerEvent;
                controllerEvent.type = ControllerEvent::Type::GAMEPAD;
                controllerEvent.controllerInfos.emplace_back(std::make_unique<ControllerInfo>(std::move(info)));
                events::Controller::broadcast(controllerEvent);

                // Update our prev variable so we can det
                // ect delta changes from down to up
                prevButtonsDown = controllerData.buttonsDown;
            }
        }
        return addedControllerEvent;
    }

    // NOLINTNEXTLINE
    bool cookGameActivityMouseEvent(GameActivityMotionEvent *motionEvent) {
        cc::MouseEvent mouseEvent;
        if (motionEvent->pointerCount > 0) {
            mouseEvent.windowId = ISystemWindow::mainWindowId; // must be main window here

            int action = motionEvent->action;
            int actionMasked = action & AMOTION_EVENT_ACTION_MASK;
            int button = motionEvent->buttonState;

            setMousePosition(mouseEvent, motionEvent);
            switch (button) {
                case AMOTION_EVENT_BUTTON_PRIMARY:
                    mouseEvent.button = 0;
                    break;
                case AMOTION_EVENT_BUTTON_SECONDARY:
                    mouseEvent.button = 2;
                    break;
                case AMOTION_EVENT_BUTTON_TERTIARY:
                    mouseEvent.button = 1;
                    break;
                case AMOTION_EVENT_BUTTON_BACK:
                    mouseEvent.button = 3;
                    break;
                case AMOTION_EVENT_BUTTON_FORWARD:
                    mouseEvent.button = 4;
                    break;
                default:
                    mouseEvent.button = 0;
            }

            if (actionMasked == AMOTION_EVENT_ACTION_DOWN ||
                actionMasked == AMOTION_EVENT_ACTION_POINTER_DOWN) {
                mouseEvent.type = cc::MouseEvent::Type::DOWN;
            } else if (actionMasked == AMOTION_EVENT_ACTION_UP ||
                       actionMasked == AMOTION_EVENT_ACTION_POINTER_UP) {
                mouseEvent.type = cc::MouseEvent::Type::UP;
            } else if (actionMasked == AMOTION_EVENT_ACTION_SCROLL) {
                mouseEvent.type = cc::MouseEvent::Type::WHEEL;
                // TODO(): wheel delta
            } else if (actionMasked == AMOTION_EVENT_ACTION_MOVE) {
                mouseEvent.type = cc::MouseEvent::Type::MOVE;
            } else if (actionMasked == AMOTION_EVENT_ACTION_HOVER_MOVE) {
                mouseEvent.type = cc::MouseEvent::Type::MOVE;
            } else if (actionMasked == AMOTION_EVENT_ACTION_HOVER_ENTER) {
                return false;
            } else if (actionMasked == AMOTION_EVENT_ACTION_HOVER_EXIT) {
                return false;
            } else {
                return false;
            }

            events::Mouse::broadcast(mouseEvent);
            return true;
        }
        return false;
    }

    // NOLINTNEXTLINE
    bool cookGameActivityMotionEvent(GameActivityMotionEvent *motionEvent) {
        cc::TouchEvent touchEvent;
        if (motionEvent->pointerCount > 0) {
            touchEvent.windowId = ISystemWindow::mainWindowId; // must be main window here

            int action = motionEvent->action;
            int actionMasked = action & AMOTION_EVENT_ACTION_MASK;
            int eventChangedIndex = -1;

            bool isMouseEvent = motionEvent->pointerCount > 0 && (motionEvent->pointers[0].toolType == AMOTION_EVENT_TOOL_TYPE_STYLUS || motionEvent->pointers[0].toolType == AMOTION_EVENT_TOOL_TYPE_MOUSE);

            if (actionMasked == AMOTION_EVENT_ACTION_DOWN ||
                actionMasked == AMOTION_EVENT_ACTION_POINTER_DOWN) {
                if (actionMasked == AMOTION_EVENT_ACTION_POINTER_DOWN) {
                    eventChangedIndex = ((action & AMOTION_EVENT_ACTION_POINTER_INDEX_MASK)
                            >> AMOTION_EVENT_ACTION_POINTER_INDEX_SHIFT);
                } else {
                    eventChangedIndex = 0;
                }
                touchEvent.type = cc::TouchEvent::Type::BEGAN;
            } else if (actionMasked == AMOTION_EVENT_ACTION_UP ||
                       actionMasked == AMOTION_EVENT_ACTION_POINTER_UP) {
                touchEvent.type = cc::TouchEvent::Type::ENDED;
                if (actionMasked == AMOTION_EVENT_ACTION_POINTER_UP) {
                    eventChangedIndex = ((action & AMOTION_EVENT_ACTION_POINTER_INDEX_MASK)
                            >> AMOTION_EVENT_ACTION_POINTER_INDEX_SHIFT);
                } else {
                    eventChangedIndex = 0;
                }
            } else if (actionMasked == AMOTION_EVENT_ACTION_CANCEL) {
                touchEvent.type = cc::TouchEvent::Type::CANCELLED;
            } else if (actionMasked == AMOTION_EVENT_ACTION_MOVE) {
                touchEvent.type = cc::TouchEvent::Type::MOVED;
            } else {
                return false;
            }

            bool touchHandled = true;
            if (eventChangedIndex >= 0) {
                touchHandled = addTouchEvent(touchEvent, eventChangedIndex, motionEvent);
            } else {
                for (int i = 0; i < motionEvent->pointerCount; i++) {
                    addTouchEvent(touchEvent, i, motionEvent);
                }
            }
            events::Touch::broadcast(touchEvent);
            touchEvent.touches.clear();
            return touchHandled;
        }
        return false;
    }

    // NOLINTNEXTLINE
    bool cookGameActivityKeyEvent(GameActivityKeyEvent *keyEvent) {
        if (_gameControllerIndex >= 0) {
            for (const auto &action : INPUT_KEY_ACTIONS) {
                if (action.buttonMask != keyEvent->keyCode) {
                    continue;
                }
                keyboardEvent.action = 0 == keyEvent->action ? cc::KeyboardEvent::Action::PRESS
                                                             : cc::KeyboardEvent::Action::RELEASE;
                keyboardEvent.key = action.actionCode;
                events::Keyboard::broadcast(keyboardEvent);
                return true;
            }
        }
        keyboardEvent.action = 0 == keyEvent->action ? cc::KeyboardEvent::Action::PRESS
                                                     : cc::KeyboardEvent::Action::RELEASE;
        keyboardEvent.key = keyEvent->keyCode;
        auto keyCodeItr = androidKeyCodes.find(keyEvent->keyCode);
        if (keyCodeItr == androidKeyCodes.end()) {
            keyboardEvent.code.clear();
        } else {
            keyboardEvent.code = keyCodeItr->second;
        }
        events::Keyboard::broadcast(keyboardEvent);
        return true;
    }

    // NOLINTNEXTLINE
    void reportKeyState(int keyCode, bool state) {
        bool wentDown = !keyState[keyCode] && state;
        bool wentUp = keyState[keyCode] && !state;
        keyState[keyCode] = state;

        if (wentUp) {
            keyboardEvent.key = keyCode;
            keyboardEvent.action = cc::KeyboardEvent::Action::RELEASE;
            events::Keyboard::broadcast(keyboardEvent);
        } else if (wentDown) {
            keyboardEvent.key = keyCode;
            keyboardEvent.action = cc::KeyboardEvent::Action::PRESS;
            events::Keyboard::broadcast(keyboardEvent);
        }
    }

    int32_t getActiveGameControllerIndex() const {
        return _gameControllerIndex;
    }

    void setActiveGameControllerIndex(const int32_t controllerIndex) {
        _gameControllerIndex = controllerIndex;
    }

    void handleAppCommand(int32_t cmd) {
        switch (cmd) {
            case APP_CMD_SAVE_STATE:
                // The system has asked us to save our current state.
                CC_LOG_DEBUG("AndroidPlatform: APP_CMD_SAVE_STATE");
                break;
            case APP_CMD_INIT_WINDOW: {
                _hasWindow = true;
                ANativeWindow *nativeWindow = _androidPlatform->_app->window;

                // We have a window!
                CC_LOG_DEBUG("AndroidPlatform: APP_CMD_INIT_WINDOW");
                if (!_launched) {
                    _launched = true;

                    _androidPlatform->_rotation = getDeviceRotationJNI();
                    ISystemWindowInfo info;
                    info.width = ANativeWindow_getWidth(nativeWindow);
                    info.height = ANativeWindow_getHeight(nativeWindow);
                    info.externalHandle = nativeWindow;
                    _androidPlatform->getInterface<SystemWindowManager>()->createWindow(info);

                    if (cocos_main(0, nullptr) != 0) {
                        CC_LOG_ERROR("AndroidPlatform: Launch game failed!");
                    } else {
                        IXRInterface *xr = CC_GET_XR_INTERFACE();
                        if (xr) {
                            xr->onRenderResume();
                        }
                    }
                } else {
                    IXRInterface *xr = CC_GET_XR_INTERFACE();
                    if (xr) {
                        xr->onRenderResume();
                    }

                    auto *windowMgr = _androidPlatform->getInterface<SystemWindowManager>();
                    auto *window = static_cast<cc::SystemWindow *>(windowMgr->getWindow(ISystemWindow::mainWindowId));
                    window->setWindowHandle(nativeWindow);
                    events::WindowRecreated::broadcast(ISystemWindow::mainWindowId);
                }
                break;
            }
            case APP_CMD_TERM_WINDOW: {
                _hasWindow = false;
                // The window is going away -- kill the surface
                CC_LOG_DEBUG("AndroidPlatform: APP_CMD_TERM_WINDOW");
                IXRInterface *xr = CC_GET_XR_INTERFACE();
                if (xr) {
                    xr->onRenderPause();
                }
                // NOLINTNEXTLINE
                events::WindowDestroy::broadcast(ISystemWindow::mainWindowId);
                break;
            }
            case APP_CMD_GAINED_FOCUS:
                _isActive = true;
                CC_LOG_INFO("AndroidPlatform: APP_CMD_GAINED_FOCUS");
                break;
            case APP_CMD_LOST_FOCUS:
                _isActive = false;
                CC_LOG_INFO("AndroidPlatform: APP_CMD_LOST_FOCUS");
                break;
            case APP_CMD_PAUSE:
                _isActive = false;
                CC_LOG_INFO("AndroidPlatform: APP_CMD_PAUSE");
                break;
            case APP_CMD_RESUME: {
                _isActive = true;
                CC_LOG_INFO("AndroidPlatform: APP_CMD_RESUME");
                break;
            }
            case APP_CMD_DESTROY: {
                CC_LOG_INFO("AndroidPlatform: APP_CMD_DESTROY");
                IXRInterface *xr = CC_GET_XR_INTERFACE();
                if (xr) {
                    xr->onRenderDestroy();
                }
                WindowEvent ev;
                ev.type = WindowEvent::Type::CLOSE;
                events::WindowEvent::broadcast(ev);
                break;
            }
            case APP_CMD_STOP: {
                CC_LOG_INFO("AndroidPlatform: APP_CMD_STOP");
                _isVisible = false;
                Paddleboat_onStop(_jniEnv);
                WindowEvent ev;
                ev.type = WindowEvent::Type::HIDDEN;
                events::WindowEvent::broadcast(ev);
                break;
            }
            case APP_CMD_START: {
                CC_LOG_INFO("AndroidPlatform: APP_CMD_START");
                _isVisible = true;
                Paddleboat_onStart(_jniEnv);
                WindowEvent ev;
                ev.type = WindowEvent::Type::SHOW;
                events::WindowEvent::broadcast(ev);
                break;
            }
            case APP_CMD_WINDOW_RESIZED: {
                CC_LOG_INFO("AndroidPlatform: APP_CMD_WINDOW_RESIZED");
                cc::WindowEvent ev;
                ev.type = cc::WindowEvent::Type::SIZE_CHANGED;
                ev.width = ANativeWindow_getWidth(_androidPlatform->_app->window);
                ev.height = ANativeWindow_getHeight(_androidPlatform->_app->window);
                ev.windowId = ISystemWindow::mainWindowId;
                events::WindowEvent::broadcast(ev);
                break;
            }
            case APP_CMD_CONFIG_CHANGED: {
                CC_LOG_INFO("AndroidPlatform: APP_CMD_CONFIG_CHANGED");
                int rotation = getDeviceRotationJNI();
                if (_androidPlatform->_rotation != rotation) {
                    CC_LOG_INFO("AndroidPlatform: orientation-change");
                    _androidPlatform->_rotation = rotation;
                    int orientation = static_cast<int>(Device::Orientation::PORTRAIT);
                    switch (rotation) {
                        case 0: // ROTATION_0
                            orientation = static_cast<int>(Device::Orientation::PORTRAIT);
                            break;
                        case 1: // ROTATION_90
                            orientation = static_cast<int>(cc::Device::Orientation::LANDSCAPE_RIGHT);
                            break;
                        case 2: // ROTATION_180
                            orientation = static_cast<int>(cc::Device::Orientation::PORTRAIT_UPSIDE_DOWN);
                            break;
                        case 3: // ROTATION_270
                            orientation = static_cast<int>(cc::Device::Orientation::LANDSCAPE_LEFT);
                            break;
                    }
                    cc::events::Orientation::broadcast(orientation);
                }
                // Window was resized or some other configuration changed.
                // Note: we don't handle this event because we check the surface dimensions
                // every frame, so that's how we know it was resized. If you are NOT doing that,
                // then you need to handle this event!
                break;
            }
            case APP_CMD_LOW_MEMORY: {
                // system told us we have low memory. So if we are not visible, let's
                // cooperate by deallocating all of our graphic resources.
                CC_LOG_INFO("AndroidPlatform: APP_CMD_LOW_MEMORY");
                events::LowMemory::broadcast();
                break;
            }
            case APP_CMD_CONTENT_RECT_CHANGED:
                CC_LOG_DEBUG("AndroidPlatform: APP_CMD_CONTENT_RECT_CHANGED");
                break;
            case APP_CMD_WINDOW_REDRAW_NEEDED:
                CC_LOG_INFO("AndroidPlatform: APP_CMD_WINDOW_REDRAW_NEEDED");
                break;
            case APP_CMD_WINDOW_INSETS_CHANGED:
                CC_LOG_DEBUG("AndroidPlatform: APP_CMD_WINDOW_INSETS_CHANGED");
                //            ARect insets;
                //            // Log all the insets types
                //            for (int type = 0; type < GAMECOMMON_INSETS_TYPE_COUNT; ++type) {
                //                GameActivity_getWindowInsets(_app->activity, (GameCommonInsetsType)type, &insets);
                //            }
                break;
            default:
                CC_LOG_INFO("AndroidPlatform: (unknown command).");
                break;
        }
        if (_eventCallback) {
            _eventCallback(cmd);
        }
    }

    using AppEventCallback = std::function<void(int32_t)>;
    void registerAppEventCallback(AppEventCallback callback) {
        _eventCallback = std::move(callback);
    }

    inline bool isAnimating() const {
        return _isVisible && _hasWindow;
    }

    inline bool isActive() const {
        return _isActive;
    }

private:
    static bool addTouchEvent(cc::TouchEvent &touchEvent, int index, GameActivityMotionEvent *motionEvent) {
        if (index < 0 || index >= motionEvent->pointerCount) {
            return false;
        }
        int id = motionEvent->pointers[index].id;
        float x = GameActivityPointerAxes_getX(&motionEvent->pointers[index]);
        float y = GameActivityPointerAxes_getY(&motionEvent->pointers[index]);
        touchEvent.touches.emplace_back(x, y, id);
        return true;
    }

    static void setMousePosition(cc::MouseEvent &mouseEvent, GameActivityMotionEvent *motionEvent) {
        if (motionEvent->pointerCount == 0) {
            ABORT_IF(false);
        }
        mouseEvent.x = GameActivityPointerAxes_getX(&motionEvent->pointers[0]);
        mouseEvent.y = GameActivityPointerAxes_getY(&motionEvent->pointers[0]);
    }

    AppEventCallback _eventCallback{nullptr};
    AndroidPlatform *_androidPlatform{nullptr};
    JNIEnv *_jniEnv{nullptr}; // JNI environment
    uint64_t _activeAxisIds{0};
    int32_t _gameControllerIndex{-1}; // Most recently connected game controller index
    bool _launched{false};
    bool _isVisible{false};
    bool _hasWindow{false};
    bool _isActive{false};
};

static void handleCmdProxy(struct android_app *app, int32_t cmd) {
    auto *proxy = static_cast<GameInputProxy *>(app->userData);
    proxy->handleAppCommand(cmd);
}

void gameControllerStatusCallback(const int32_t controllerIndex,
                                  const Paddleboat_ControllerStatus status,
                                  void *userData) {
    auto *inputProxy = static_cast<GameInputProxy *>(userData);
    if (inputProxy) {
        // Always make the most recently connected controller the active one
        if (status == PADDLEBOAT_CONTROLLER_JUST_CONNECTED) {
            inputProxy->setActiveGameControllerIndex(controllerIndex);
        } else if (status == PADDLEBOAT_CONTROLLER_JUST_DISCONNECTED) {
            // We only care if the controller that disconnected was the one
            // we are currently using
            if (controllerIndex == inputProxy->getActiveGameControllerIndex()) {
                // Default to no fallback controller, loop and look for another connected
                // one
                int32_t newControllerIndex = -1;

                for (int32_t i = 0; i < PADDLEBOAT_MAX_CONTROLLERS; ++i) {
                    if (i != controllerIndex &&
                        Paddleboat_getControllerStatus(i) == PADDLEBOAT_CONTROLLER_ACTIVE) {
                        newControllerIndex = i;
                        break;
                    }
                }
                inputProxy->setActiveGameControllerIndex(newControllerIndex);
            }
        }
        ControllerChangeEvent event;
        for (int32_t i = 0; i < PADDLEBOAT_MAX_CONTROLLERS; ++i) {
            if (Paddleboat_getControllerStatus(i) == PADDLEBOAT_CONTROLLER_ACTIVE) {
                event.controllerIds.emplace_back(i);
            }
        }
        events::ControllerChange::broadcast(event);
    }
}

AndroidPlatform::~AndroidPlatform() = default;

int AndroidPlatform::init() {
#if CC_USE_XR
    registerInterface(std::make_shared<XRInterface>());
#endif
    IXRInterface *xr = CC_GET_XR_INTERFACE();
    if (xr) {
        JniHelper::getEnv();
        xr->initialize(JniHelper::getJavaVM(), getActivity());
    }
    cc::FileUtilsAndroid::setAssetManager(_app->activity->assetManager);
    _inputProxy = ccnew GameInputProxy(this);
    _inputProxy->registerAppEventCallback([this](int32_t cmd) {
        IXRInterface *xr = CC_GET_XR_INTERFACE();
        if (xr) {
            xr->handleAppCommand(cmd);
        }

        if (APP_CMD_START == cmd || APP_CMD_INIT_WINDOW == cmd) {
            if (_inputProxy->isAnimating()) {
                _isLowFrequencyLoopEnabled = false;
                _loopTimeOut = 0;
            }
        } else if (APP_CMD_STOP == cmd) {
            _lowFrequencyTimer.reset();
            _loopTimeOut = LOW_FREQUENCY_TIME_INTERVAL;
            _isLowFrequencyLoopEnabled = true;
            if (xr && !xr->getXRConfig(xr::XRConfigKey::INSTANCE_CREATED).getBool()) {
                // xr will sleep,  -1 we will block forever waiting for events.
                _loopTimeOut = -1;
                _isLowFrequencyLoopEnabled = false;
            }
        }
    });
    _app->userData = _inputProxy;
    _app->onAppCmd = handleCmdProxy;

    registerInterface(std::make_shared<Accelerometer>());
    registerInterface(std::make_shared<Battery>());
    registerInterface(std::make_shared<Network>());
    registerInterface(std::make_shared<Screen>());
    registerInterface(std::make_shared<System>());
    registerInterface(std::make_shared<SystemWindowManager>());
    registerInterface(std::make_shared<Vibrator>());

    return 0;
}

void AndroidPlatform::onDestroy() {
    UniversalPlatform::onDestroy();
    unregisterAllInterfaces();
    JniHelper::onDestroy();
    CC_SAFE_DELETE(_inputProxy)
}

cc::ISystemWindow *AndroidPlatform::createNativeWindow(uint32_t windowId, void *externalHandle) {
    return ccnew SystemWindow(windowId, externalHandle);
}

int AndroidPlatform::getSdkVersion() const {
    return AConfiguration_getSdkVersion(_app->config);
}

int32_t AndroidPlatform::run(int /*argc*/, const char ** /*argv*/) {
    loop();
    return 0;
}

void AndroidPlatform::exit() {
    _app->destroyRequested = 1;
}

int32_t AndroidPlatform::loop() {
    IXRInterface *xr = CC_GET_XR_INTERFACE();
    while (true) {
        struct android_poll_source *source;

        // suspend thread while _loopTimeOut set to -1
        while (ALooper_pollOnce(_loopTimeOut, nullptr, nullptr,
                                reinterpret_cast<void **>(&source)) >= 0) {
            // Process events
            if (source != nullptr) {
                source->process(_app, source);
            }

            // Exit the game loop when the Activity is destroyed
            if (_app->destroyRequested) {
                break;
            }
        }
        // Exit the game loop when the Activity is destroyed
        if (_app->destroyRequested) {
            break;
        }
        if (xr && !xr->platformLoopStart()) continue;
        _inputProxy->handleInput();
        if (_inputProxy->isAnimating() && (xr ? xr->getXRConfig(xr::XRConfigKey::SESSION_RUNNING).getBool() : true)) {
            runTask();
            if (_inputProxy->isActive()) {
                flushTasksOnGameThreadAtForegroundJNI();
            }
        }
        flushTasksOnGameThreadJNI();

#if CC_ENABLE_SUSPEND_GAME_THREAD
        if (_isLowFrequencyLoopEnabled) {
            // Suspend a game thread after it has been running in the background for a specified amount of time
            if (_lowFrequencyTimer.getSeconds() > LOW_FREQUENCY_EXPIRED_DURATION_SECONDS) {
                _isLowFrequencyLoopEnabled = false;
                _loopTimeOut = -1;
            }
        }
#endif
        if (xr) xr->platformLoopEnd();
    }
    onDestroy();
    return 0;
}

void AndroidPlatform::pollEvent() {
    //
}

void *AndroidPlatform::getActivity() { // Dangerous
    return _app->activity->javaGameActivity;
}

void *AndroidPlatform::getEnv() {
    return JniHelper::getEnv();
}

} // namespace cc
