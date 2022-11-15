/****************************************************************************
 Copyright (c) 2017-2022 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
 worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
 not use Cocos Creator software for developing other software or tools that's
 used for developing games. You are not granted to publish, distribute,
 sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
****************************************************************************/

#pragma once

#include "base/Config.h"
#include "base/TypeDef.h"
#include "engine/BaseEngine.h"
#include "engine/EngineEvents.h"
#include "math/Vec2.h"
#include "base/module/Module.h"

#include <map>
#include <memory>

namespace se {
class ScriptEngine;
}

namespace cc {

namespace gfx {
class Device;
}

class FileUtils;
class DebugRenderer;
class Profiler;
class BuiltinResMgr;
class ProgramLib;

#define NANOSECONDS_PER_SECOND 1000000000
#define NANOSECONDS_60FPS      16666667L

class CC_DLL Engine : public BaseEngine {
public:
    /**
     @brief Constructor of Engine.
     */
    Engine();
    /**
     @brief Constructor of Engine.
     */
    ~Engine();
    /**
     @brief Implement initialization engine.
     */
    int32_t init() override;
    /**
     @brief Implement the main logic of the running engine.
     */
    int32_t run() override;
    /**
     @brief Implement pause engine running.
     */
    void pause() override;
    /**
     @brief Implement resume engine running.
     */
    void resume() override;
    /**
     @brief Implement restart engine running.
     */
    int restart() override;
    /**
     @brief Implement close engine running.
     */
    void close() override;
    /**
     * @brief Sets the preferred frame rate for main loop callback.
     * @param fps The preferred frame rate for main loop callback.
     */
    void setPreferredFramesPerSecond(int fps) override;
    /**
     @brief Gets the total number of frames in the main loop.
     */
    uint getTotalFrames() const override;
    /**
     @brief Get engine scheduler.
     */
    Scheduler* getScheduler() const override;

    bool isInited() const override { return _inited; }


private:
    void destroy();
    void tick();
    bool redirectWindowEvent(const WindowEvent &ev);
    void doRestart();

    bool _close{false};
    bool _pause{false};
    bool _resune{false};
    
    int64_t _prefererredNanosecondsPerFrame{NANOSECONDS_60FPS};
    uint _totalFrames{0};
    cc::Vec2 _viewLogicalSize{0, 0};
    bool _needRestart{false};
    bool _inited{false};

    events::WindowEvent::Listener _windowEventListener;

    CC_DISALLOW_COPY_MOVE_ASSIGN(Engine);
};

} // namespace cc
