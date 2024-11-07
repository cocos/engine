/****************************************************************************
 Copyright (c) 2021-2023 Xiamen Yaji Software Co., Ltd.

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

#pragma once

#include <cstdint>
#include "base/Macros.h"
#include "base/Ptr.h"
#include "base/RefCounted.h"
#include "base/std/container/string.h"
#include "base/std/optional.h"
#include "cocos/math/Geometry.h"
#include "cocos/math/Utils.h"
#include "core/geometry/Frustum.h"
#include "core/geometry/Ray.h"
#include "math/Mat4.h"
#include "math/Vec3.h"
#include "math/Vec4.h"
#include "platform/interfaces/modules/IXRInterface.h"
#include "renderer/gfx-base/GFXDef-common.h"
#include "renderer/pipeline/Define.h"

namespace cc {
class IXRInterface;
class Node;

namespace pipeline {
class GeometryRenderer;
}

namespace scene {

// As RenderScene includes Camera.h, so use forward declaration here.
class RenderScene;
// As RenderWindow includes Camera.h, so use forward declaration here.
class RenderWindow;

enum class CameraProjection {
    ORTHO,
    PERSPECTIVE,
    UNKNOWN
};

enum class CameraFOVAxis {
    VERTICAL,
    HORIZONTAL,
};

enum class CameraAperture {
    F1_8,
    F2_0,
    F2_2,
    F2_5,
    F2_8,
    F3_2,
    F3_5,
    F4_0,
    F4_5,
    F5_0,
    F5_6,
    F6_3,
    F7_1,
    F8_0,
    F9_0,
    F10_0,
    F11_0,
    F13_0,
    F14_0,
    F16_0,
    F18_0,
    F20_0,
    F22_0,
};

enum class CameraISO {
    ISO100,
    ISO200,
    ISO400,
    ISO800,
};

enum class CameraShutter {
    D1,
    D2,
    D4,
    D8,
    D15,
    D30,
    D60,
    D125,
    D250,
    D500,
    D1000,
    D2000,
    D4000,
};

enum class CameraType {
    DEFAULT = -1,
    LEFT_EYE = 0,
    RIGHT_EYE = 1,
    MAIN = 2,
};

enum class TrackingType {
    NO_TRACKING = 0,
    POSITION_AND_ROTATION = 1,
    POSITION = 2,
    ROTATION = 3,
};

enum class CameraUsage {
    EDITOR,
    GAME_VIEW,
    SCENE_VIEW,
    PREVIEW,
    GAME = 100,
};

struct ICameraInfo {
    ccstd::string name;
    Node *node{nullptr};
    CameraProjection projection;
    ccstd::optional<uint32_t> targetDisplay;
    RenderWindow *window{nullptr};
    uint32_t priority{0};
    ccstd::optional<ccstd::string> pipeline;
    CameraType cameraType{CameraType::DEFAULT};
    TrackingType trackingType{TrackingType::NO_TRACKING};
    CameraUsage usage{CameraUsage::GAME};
};

class Camera : public RefCounted {
public:
    static constexpr int32_t SKYBOX_FLAG{static_cast<int32_t>(gfx::ClearFlagBit::STENCIL) << 1};

    explicit Camera(gfx::Device *device);
    ~Camera() override;

    /**
     * this exposure value corresponding to default standard camera exposure parameters
     */
    static constexpr float getStandardExposureValue() {
        return 1.F / 38400.F;
    }

    /**
     * luminance unit scale used by area lights
     */
    static constexpr float getStandardLightMeterScale() {
        return 10000.F;
    }

    bool initialize(const ICameraInfo &info);
    void destroy();
    void attachToScene(RenderScene *scene);
    void detachFromScene();
    void resize(uint32_t width, uint32_t height);
    void setFixedSize(uint32_t width, uint32_t height);
    void syncCameraEditor(const Camera *camera);
    void update(bool forceUpdate = false); // for lazy eval situations like the in-editor preview
    void changeTargetWindow(RenderWindow *window);

    /**
     * transform a screen position (in oriented space) to a world space ray
     */
    geometry::Ray screenPointToRay(float x, float y);

    /**
     * transform a screen position (in oriented space) to world space
     */
    Vec3 screenToWorld(const Vec3 &screenPos);

    /**
     * transform a world space position to screen space
     */
    Vec3 worldToScreen(const Vec3 &worldPos);

    /**
     * transform a world space matrix to screen space
     * @param {Mat4} out the resulting vector
     * @param {Mat4} worldMatrix the world space matrix to be transformed
     * @param {number} width framebuffer width
     * @param {number} height framebuffer height
     * @returns {Mat4} the resulting vector
     */
    Mat4 worldMatrixToScreen(const Mat4 &worldMatrix, uint32_t width, uint32_t height);

    void setNode(Node *val);
    inline Node *getNode() const { return _node.get(); }

    inline void setEnabled(bool val) { _enabled = val; }
    inline bool isEnabled() const { return _enabled; }

    inline void setOrthoHeight(float val) {
        _orthoHeight = val;
        _isProjDirty = true;
    }
    inline float getOrthoHeight() const { return _orthoHeight; }

    inline void setProjectionType(CameraProjection val) {
        _proj = val;
        _isProjDirty = true;
    }
    inline CameraProjection getProjectionType() const { return _proj; }

    inline void setFovAxis(CameraFOVAxis axis) {
        _fovAxis = axis;
        _isProjDirty = true;
    }
    inline CameraFOVAxis getFovAxis() const { return _fovAxis; }

    inline void setFov(float fov) {
        _fov = fov;
        _isProjDirty = true;
    }
    inline float getFov() const { return _fov; }

    inline void setNearClip(float nearClip) {
        _nearClip = nearClip;
        _isProjDirty = true;
    }
    inline float getNearClip() const { return _nearClip; }

    inline void setFarClip(float farClip) {
        _farClip = farClip;
        _isProjDirty = true;
    }
    inline float getFarClip() const { return _farClip; }

    inline void setClearColor(const gfx::Color &val) { _clearColor = val; }
    inline const gfx::Color &getClearColor() const { return _clearColor; }

    /**
     * Pre-rotated (i.e. always in identity/portrait mode) if possible.
     */
    inline const Vec4 &getViewport() const { return _viewport; }
    void setViewport(const Rect &val);
    void setViewportInOrientedSpace(const Rect &val);

    inline RenderScene *getScene() const { return _scene; }
    inline const ccstd::string &getName() const { return _name; }
    inline uint32_t getWidth() const { return _width; }
    inline uint32_t getHeight() const { return _height; }
    inline float getAspect() const { return _aspect; }
    inline const Mat4 &getMatView() const { return _matView; }
    inline const Mat4 &getMatProj() const { return _matProj; }
    inline const Mat4 &getMatProjInv() const { return _matProjInv; }
    inline const Mat4 &getMatViewProj() const { return _matViewProj; }
    inline const Mat4 &getMatViewProjInv() const { return _matViewProjInv; }

    inline void setFrustum(const geometry::Frustum &val) {
        *_frustum = val;
    }
    inline const geometry::Frustum &getFrustum() const { return *_frustum; }

    inline void setWindow(RenderWindow *val) { _window = val; }
    inline RenderWindow *getWindow() const { return _window; }

    inline void setForward(const Vec3 &val) { _forward = val; }
    inline const Vec3 &getForward() const { return _forward; }

    inline void setPosition(const Vec3 &val) { _position = val; }
    inline const Vec3 &getPosition() const { return _position; }

    inline void setVisibility(uint32_t vis) { _visibility = vis; }
    inline uint32_t getVisibility() const { return _visibility; }

    inline uint32_t getPriority() const { return _priority; }
    inline void setPriority(uint32_t val) { _priority = val; }

    inline void setAperture(CameraAperture val) {
        _aperture = val;
        _apertureValue = Camera::FSTOPS[static_cast<int>(_aperture)];
        updateExposure();
    }
    inline CameraAperture getAperture() const { return _aperture; }

    inline float getApertureValue() const { return _apertureValue; }

    inline void setShutter(CameraShutter val) {
        _shutter = val;
        _shutterValue = Camera::SHUTTERS[static_cast<int>(_shutter)];
        updateExposure();
    }
    inline CameraShutter getShutter() const { return _shutter; }

    inline float getShutterValue() const { return _shutterValue; }

    inline void setIso(CameraISO val) {
        _iso = val;
        _isoValue = Camera::ISOS[static_cast<int>(_iso)];
        updateExposure();
    }
    inline CameraISO getIso() const { return _iso; }

    inline float getIsoValue() const { return _isoValue; }

    inline void setEc(float val) { _ec = val; }
    inline float getEc() const { return _ec; }

    inline float getExposure() const { return _exposure; }

    inline gfx::ClearFlagBit getClearFlag() const { return _clearFlag; }
    inline void setClearFlag(gfx::ClearFlagBit flag) { _clearFlag = flag; }

    inline float getClearDepth() const { return _clearDepth; }
    inline void setClearDepth(float depth) { _clearDepth = depth; }

    inline uint32_t getClearStencil() const { return _clearStencil; }
    inline void setClearStencil(uint32_t stencil) { _clearStencil = stencil; }

    inline bool isWindowSize() const { return _isWindowSize; }
    inline void setWindowSize(bool val) { _isWindowSize = val; }

    inline float getScreenScale() const { return _screenScale; }
    inline void setScreenScale(float val) { _screenScale = val; }

    inline gfx::SurfaceTransform getSurfaceTransform() const { return _curTransform; }

    void initGeometryRenderer();
    inline pipeline::GeometryRenderer *getGeometryRenderer() const {
#if CC_USE_GEOMETRY_RENDERER
        return _geometryRenderer.get();
#else
        return nullptr;
#endif
    }

    void detachCamera();

    uint32_t getSystemWindowId() const { return _systemWindowId; }

    inline CameraType getCameraType() const { return _cameraType; }
    inline void setCameraType(CameraType type) { _cameraType = type; }

    inline TrackingType getTrackingType() const { return _trackingType; }
    inline void setTrackingType(TrackingType type) { _trackingType = type; }

    inline CameraUsage getCameraUsage() const { return _usage; }
    inline void setCameraUsage(CameraUsage usage) { _usage = usage; }

    inline bool isCullingEnabled() const { return _isCullingEnabled; }
    inline void setCullingEnable(bool val) { _isCullingEnabled = val; }

    void calculateObliqueMat(const Vec4 &viewSpacePlane);

    float getClipSpaceMinz() const;

protected:
    void setExposure(float ev100);

private:
    void updateExposure();
    void updateAspect(bool oriented = true);

    bool _isWindowSize{true};
    float _screenScale{0.F};
    gfx::Device *_device{nullptr};
    RenderScene *_scene{nullptr};
    IntrusivePtr<Node> _node;
    ccstd::string _name;
    bool _enabled{false};
    bool _isCullingEnabled{true};
    CameraProjection _proj{CameraProjection::UNKNOWN};
    float _aspect{0.F};
    float _orthoHeight{10.0F};
    CameraFOVAxis _fovAxis{CameraFOVAxis::VERTICAL};
    float _fov{static_cast<float>(mathutils::toRadian(45.F))};
    float _nearClip{1.0F};
    float _farClip{1000.0F};
    gfx::Color _clearColor{0.2, 0.2, 0.2, 1};
    Vec4 _viewport{0, 0, 1, 1};
    Vec4 _orientedViewport{0, 0, 1, 1};
    gfx::SurfaceTransform _curTransform{gfx::SurfaceTransform::IDENTITY};
    bool _isProjDirty{true};
    Mat4 _matView;
    Mat4 _matProj;
    Mat4 _matProjInv;
    Mat4 _matViewProj;
    Mat4 _matViewProjInv;
    geometry::Frustum *_frustum{nullptr};
    Vec3 _forward;
    Vec3 _position;
    uint32_t _priority{0};
    CameraAperture _aperture{CameraAperture::F16_0};
    float _apertureValue{0.F};
    CameraShutter _shutter{CameraShutter::D125};
    float _shutterValue{0.F};
    CameraISO _iso{CameraISO::ISO100};
    float _isoValue{0.F};
    float _ec = {0.F};
    RenderWindow *_window{nullptr};
    uint32_t _width{0};
    uint32_t _height{0};
    gfx::ClearFlagBit _clearFlag{gfx::ClearFlagBit::NONE};
    float _clearDepth{1.0F};
    CameraType _cameraType{CameraType::DEFAULT};
    TrackingType _trackingType{TrackingType::NO_TRACKING};
    CameraUsage _usage{CameraUsage::GAME};

#if CC_USE_GEOMETRY_RENDERER
    IntrusivePtr<pipeline::GeometryRenderer> _geometryRenderer;
#endif

    static const ccstd::vector<float> FSTOPS;
    static const ccstd::vector<float> SHUTTERS;
    static const ccstd::vector<float> ISOS;

    uint32_t _visibility = pipeline::CAMERA_DEFAULT_MASK;
    float _exposure{0.F};
    uint32_t _clearStencil{0};
    IXRInterface *_xr{nullptr};

    uint32_t _systemWindowId{0};

    CC_DISALLOW_COPY_MOVE_ASSIGN(Camera);
};

} // namespace scene
} // namespace cc
