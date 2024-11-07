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

#include "scene/Camera.h"
#include "core/Root.h"
#include "core/platform/Debug.h"
#include "core/scene-graph/Node.h"
#include "math/MathUtil.h"
#include "renderer/gfx-base/GFXDevice.h"
#include "renderer/pipeline/Define.h"
#if CC_USE_GEOMETRY_RENDERER
    #include "renderer/pipeline/GeometryRenderer.h"
#endif
#include "application/ApplicationManager.h"
#include "platform/interfaces/modules/IXRInterface.h"

namespace cc {
namespace scene {

namespace {
ccstd::array<Mat4, 4> correctionMatrices;

void assignMat4(Mat4 &mat4, float m0, float m1, float m2, float m3, float m4, float m5) {
    mat4.m[0] = m0;
    mat4.m[1] = m1;
    mat4.m[2] = m2;
    mat4.m[3] = m3;
    mat4.m[4] = m4;
    mat4.m[5] = m5;
}

constexpr ccstd::array<ccstd::array<float, 4>, 4> PRE_TRANSFORMS = {{
    {{1, 0, 0, 1}},   // SurfaceTransform.IDENTITY
    {{0, 1, -1, 0}},  // SurfaceTransform.ROTATE_90
    {{-1, 0, 0, -1}}, // SurfaceTransform.ROTATE_180
    {{0, -1, 1, 0}}   // SurfaceTransform.ROTATE_270
}};

} // namespace

const ccstd::vector<float> Camera::FSTOPS{1.8F, 2.0F, 2.2F, 2.5F, 2.8F, 3.2F, 3.5F, 4.0F, 4.5F, 5.0F, 5.6F, 6.3F, 7.1F, 8.0F, 9.0F, 10.0F, 11.0F, 13.0F, 14.0F, 16.0F, 18.0F, 20.0F, 22.0F};
const ccstd::vector<float> Camera::SHUTTERS{1.0F, 1.0F / 2.0F, 1.0F / 4.0F, 1.0F / 8.0F, 1.0F / 15.0F, 1.0F / 30.0F, 1.0F / 60.0F, 1.0F / 125.0F,
                                            1.0F / 250.0F, 1.0F / 500.0F, 1.0F / 1000.0F, 1.0F / 2000.0F, 1.0F / 4000.0F};
const ccstd::vector<float> Camera::ISOS{100.0F, 200.0F, 400.0F, 800.0F};

Camera::Camera(gfx::Device *device)
: _device(device) {
    _apertureValue = Camera::FSTOPS.at(static_cast<int>(_aperture));
    _shutterValue = Camera::SHUTTERS.at(static_cast<int>(_shutter));
    _isoValue = Camera::ISOS[static_cast<int>(_iso)];

    _aspect = _screenScale = 1.F;
    _frustum = ccnew geometry::Frustum();
    _frustum->addRef();
    _frustum->setAccurate(true);

    if (correctionMatrices.empty()) {
        float ySign = _device->getCapabilities().clipSpaceSignY;
        assignMat4(correctionMatrices[static_cast<int>(gfx::SurfaceTransform::IDENTITY)], 1.F, 0, 0, 0, 0, ySign);
        assignMat4(correctionMatrices[static_cast<int>(gfx::SurfaceTransform::ROTATE_90)], 0, 1.F, 0, 0, -ySign, 0);
        assignMat4(correctionMatrices[static_cast<int>(gfx::SurfaceTransform::ROTATE_180)], -1, 0, 0, 0, 0, -ySign);
        assignMat4(correctionMatrices[static_cast<int>(gfx::SurfaceTransform::ROTATE_270)], 0, -1, 0, 0, ySign, 0);
    }
    _xr = CC_GET_XR_INTERFACE();
}

Camera::~Camera() = default;

bool Camera::initialize(const ICameraInfo &info) {
    _usage = info.usage;
    _trackingType = info.trackingType;
    _cameraType = info.cameraType;
    _node = info.node;
    _width = 1.F;
    _height = 1.F;
    _clearFlag = gfx::ClearFlagBit::NONE;
    _clearDepth = 1.0F;
    _visibility = pipeline::CAMERA_DEFAULT_MASK;
    _name = info.name;
    _proj = info.projection;
    _priority = info.priority;
    _aspect = _screenScale = 1.F;
    updateExposure();
    changeTargetWindow(info.window);
    return true;
}

void Camera::destroy() {
    detachFromScene();
    if (_window) {
        _window->detachCamera(this);
        _window = nullptr;
    }
    _name.clear();
#if CC_USE_GEOMETRY_RENDERER
    CC_SAFE_DESTROY_NULL(_geometryRenderer);
#endif
    CC_SAFE_RELEASE_NULL(_frustum);
}

void Camera::attachToScene(RenderScene *scene) {
    _enabled = true;
    _scene = scene;
}

void Camera::detachFromScene() {
    _enabled = false;
    _scene = nullptr;
}

void Camera::resize(uint32_t width, uint32_t height) {
    if (!_window) {
        return;
    }

    _width = width;
    _height = height;
    updateAspect();
}

void Camera::setFixedSize(uint32_t width, uint32_t height) {
    _width = width;
    _height = height;
    updateAspect(false);
    _isWindowSize = false;
}

// Editor specific gizmo camera logic
void Camera::syncCameraEditor(const Camera *camera) {
#if CC_EDITOR
    _position = camera->_position;
    _forward = camera->_forward;
    _matView = camera->_matView;
    _matProj = camera->_matProj;
    _matProjInv = camera->_matProjInv;
    _matViewProj = camera->_matViewProj;
#endif
}

void Camera::update(bool forceUpdate /*false*/) {
    if (!_node) {
        return;
    }

    bool viewProjDirty = false;
    // view matrix
    if (_node->getChangedFlags() || forceUpdate) {
        _matView = _node->getWorldMatrix().getInversed();
        _forward.set(-_matView.m[2], -_matView.m[6], -_matView.m[10]);
        Mat4 scaleMat{};
        scaleMat.scale(_node->getWorldScale());
        // remove scale
        Mat4::multiply(scaleMat, _matView, &_matView);
        _position.set(_node->getWorldPosition());
        viewProjDirty = true;
    }

    // projection matrix
    auto *swapchain = _window->getSwapchain();
    const auto &orientation = swapchain ? swapchain->getSurfaceTransform() : gfx::SurfaceTransform::IDENTITY;
    if (swapchain) {
        _systemWindowId = swapchain->getWindowId();
    }

    if (_isProjDirty || _curTransform != orientation) {
        _curTransform = orientation;
        const float projectionSignY = _device->getCapabilities().clipSpaceSignY;
        // Only for rendertexture processing
        if (_proj == CameraProjection::PERSPECTIVE) {
            Mat4::createPerspective(_fov, _aspect, _nearClip, _farClip,
                                    _fovAxis == CameraFOVAxis::VERTICAL, _device->getCapabilities().clipSpaceMinZ, projectionSignY, static_cast<int>(orientation), &_matProj);
        } else {
            const float x = _orthoHeight * _aspect;
            const float y = _orthoHeight;
            Mat4::createOrthographicOffCenter(-x, x, -y, y, _nearClip, _farClip,
                                              _device->getCapabilities().clipSpaceMinZ, projectionSignY,
                                              static_cast<int>(orientation), &_matProj);
        }
        _matProjInv = _matProj.getInversed();
        viewProjDirty = true;
        _isProjDirty = false;
    }

    if (_xr) {
        xr::XREye wndXREye = _xr->getXREyeByRenderWindow(_window);
        if (wndXREye != xr::XREye::NONE && _xr->getXRConfig(xr::XRConfigKey::SESSION_RUNNING).getBool()) {
            // xr flow
            if (_proj == CameraProjection::PERSPECTIVE) {
                const auto &projFloat = _xr->getXRViewProjectionData(static_cast<uint32_t>(wndXREye), _nearClip, _farClip);
                std::memcpy(_matProj.m, projFloat.data(), sizeof(float) * 16);
            } else {
                const ccstd::array<float, 4> &preTransform = PRE_TRANSFORMS[static_cast<int>(orientation)];
                _xr->adaptOrthographicMatrix(this, preTransform, _matProj, _matView);
            }
            _matProjInv = _matProj.getInversed();
            viewProjDirty = true;
        }
    }

    // view-projection
    if (viewProjDirty) {
        Mat4::multiply(_matProj, _matView, &_matViewProj);
        _matViewProjInv = _matViewProj.getInversed();
        _frustum->update(_matViewProj, _matViewProjInv);
    }
}

void Camera::changeTargetWindow(RenderWindow *window) {
    if (_window) {
        _window->detachCamera(this);
    }
    RenderWindow *win = window ? window : Root::getInstance()->getMainWindow();
    if (win) {
        win->attachCamera(this);
        _window = win;

        // window size is pre-rotated
        auto *swapchain = win->getSwapchain();
        const auto orientation = swapchain ? swapchain->getSurfaceTransform() : gfx::SurfaceTransform::IDENTITY;
        if (static_cast<int32_t>(orientation) % 2) {
            resize(win->getHeight(), win->getWidth());
        } else {
            resize(win->getWidth(), win->getHeight());
        }

        if (swapchain) {
            _systemWindowId = swapchain->getWindowId();
        }
    }
}

void Camera::initGeometryRenderer() {
#if CC_USE_GEOMETRY_RENDERER
    if (!_geometryRenderer) {
        _geometryRenderer = ccnew pipeline::GeometryRenderer();
        _geometryRenderer->activate(_device);
    }
#endif
}

void Camera::detachCamera() {
    if (_window) {
        _window->detachCamera(this);
    }
}

geometry::Ray Camera::screenPointToRay(float x, float y) {
    CC_ASSERT_NOT_NULL(_node);
    const float cx = _orientedViewport.x * static_cast<float>(_width);
    const float cy = _orientedViewport.y * static_cast<float>(_height);
    const float cw = _orientedViewport.z * static_cast<float>(_width);
    const float ch = _orientedViewport.w * static_cast<float>(_height);
    const bool isProj = _proj == CameraProjection::PERSPECTIVE;
    const float ySign = _device->getCapabilities().clipSpaceSignY;
    const ccstd::array<float, 4> &preTransform = PRE_TRANSFORMS[static_cast<int>(_curTransform)];

    Vec3 tmpVec3{
        (x - cx) / cw * 2 - 1.F,
        (y - cy) / ch * 2 - 1.F,
        isProj ? 1.F : -1.F};
    float tmpX = tmpVec3.x;
    tmpVec3.x = tmpX * preTransform[0] + tmpVec3.y * preTransform[2] * ySign;
    tmpVec3.y = tmpX * preTransform[1] + tmpVec3.y * preTransform[3] * ySign;

    geometry::Ray out;
    if (isProj) {
        tmpVec3.transformMat4(tmpVec3, _matViewProjInv);
    } else {
        out.o.transformMat4(tmpVec3, _matViewProjInv);
    }

    if (isProj) {
        // camera origin
        geometry::Ray::fromPoints(&out, _node->getWorldPosition(), tmpVec3);
    } else {
        out.d.set(0, 0, -1.F);
        out.d.transformQuat(_node->getWorldRotation());
    }

    return out;
}

Vec3 Camera::screenToWorld(const Vec3 &screenPos) {
    const float cx = _orientedViewport.x * static_cast<float>(_width);
    const float cy = _orientedViewport.y * static_cast<float>(_height);
    const float cw = _orientedViewport.z * static_cast<float>(_width);
    const float ch = _orientedViewport.w * static_cast<float>(_height);
    const float ySign = _device->getCapabilities().clipSpaceSignY;
    const ccstd::array<float, 4> &preTransform = PRE_TRANSFORMS[static_cast<int>(_curTransform)];
    Vec3 out;

    if (_proj == CameraProjection::PERSPECTIVE) {
        // calculate screen pos in far clip plane
        out.set(
            (screenPos.x - cx) / cw * 2 - 1,
            (screenPos.y - cy) / ch * 2 - 1,
            1.0F);

        // transform to world
        float tmpX = out.x;
        out.x = tmpX * preTransform[0] + out.y * preTransform[2] * ySign;
        out.y = tmpX * preTransform[1] + out.y * preTransform[3] * ySign;
        out.transformMat4(out, _matViewProjInv);
        // lerp to depth z
        Vec3 tmpVec3;
        if (_node) {
            tmpVec3.set(_node->getWorldPosition());
        }

        out = tmpVec3.lerp(out, MathUtil::lerp(_nearClip / _farClip, 1, screenPos.z));
    } else {
        out.set(
            (screenPos.x - cx) / cw * 2 - 1,
            (screenPos.y - cy) / ch * 2 - 1,
            screenPos.z * 2 - 1);

        // transform to world
        float tmpX = out.x;
        out.x = tmpX * preTransform[0] + out.y * preTransform[2] * ySign;
        out.y = tmpX * preTransform[1] + out.y * preTransform[3] * ySign;
        out.transformMat4(out, _matViewProjInv);
    }

    return out;
}

Vec3 Camera::worldToScreen(const Vec3 &worldPos) {
    const float ySign = _device->getCapabilities().clipSpaceSignY;
    const ccstd::array<float, 4> &preTransform = PRE_TRANSFORMS[static_cast<int>(_curTransform)];
    Vec3 out;
    Vec3::transformMat4(worldPos, _matViewProj, &out);

    float tmpX = out.x;
    out.x = tmpX * preTransform[0] + out.y * preTransform[2] * ySign;
    out.y = tmpX * preTransform[1] + out.y * preTransform[3] * ySign;

    const float cx = _orientedViewport.x * static_cast<float>(_width);
    const float cy = _orientedViewport.y * static_cast<float>(_height);
    const float cw = _orientedViewport.z * static_cast<float>(_width);
    const float ch = _orientedViewport.w * static_cast<float>(_height);

    out.x = cx + (out.x + 1) * 0.5F * cw;
    out.y = cy + (out.y + 1) * 0.5F * ch;
    out.z = out.z * 0.5F + 0.5F;

    return out;
}

Mat4 Camera::worldMatrixToScreen(const Mat4 &worldMatrix, uint32_t width, uint32_t height) {
    Mat4 out;
    Mat4::multiply(_matViewProj, worldMatrix, &out);
    Mat4::multiply(correctionMatrices[static_cast<int>(_curTransform)], out, &out);

    const float halfWidth = static_cast<float>(width) / 2;
    const float halfHeight = static_cast<float>(height) / 2;
    Mat4 tmpMat4(Mat4::IDENTITY);
    tmpMat4.translate(halfWidth, halfHeight, 0);
    tmpMat4.scale(halfWidth, halfHeight, 1);

    out.multiply(tmpMat4);

    return out;
}

/**
* @en Calculate and set oblique view frustum projection matrix.
* @zh 计算并设置斜视锥体投影矩阵
* @param clipPlane clip plane in camera space
*/
void Camera::calculateObliqueMat(const Vec4 &viewSpacePlane) {
    float clipSpaceMinZ = _device->getCapabilities().clipSpaceMinZ;
    Vec4 far{math::sgn(viewSpacePlane.x), math::sgn(viewSpacePlane.y), 1.F, 0.F};

    _matProjInv.transformVector(&far);

    const Vec4 m4 = {_matProj.m[3], _matProj.m[7], clipSpaceMinZ, _matProj.m[15]};
    const float scale = 2.F / Vec4::dot(viewSpacePlane, far);
    const Vec4 newViewSpaceNearPlane = viewSpacePlane * scale;

    const Vec4 m3 = newViewSpaceNearPlane - m4;

    _matProj.m[2] = m3.x;
    _matProj.m[6] = m3.y;
    _matProj.m[10] = m3.z;
    _matProj.m[14] = m3.w;
}

float Camera::getClipSpaceMinz() const {
    return _device->getCapabilities().clipSpaceMinZ;
}

void Camera::setNode(Node *val) { _node = val; }

void Camera::setExposure(float ev100) {
    _exposure = 0.833333F / std::pow(2.0F, ev100);
}

void Camera::updateExposure() {
    const float ev100 = std::log2((_apertureValue * _apertureValue) / _shutterValue * 100.F / _isoValue);
    setExposure(ev100);
}

void Camera::updateAspect(bool oriented) {
    _aspect = (static_cast<float>(getWindow()->getWidth()) * _viewport.z) / (static_cast<float>(getWindow()->getHeight()) * _viewport.w);
    // window size/viewport is pre-rotated, but aspect should be oriented to acquire the correct projection
    if (oriented) {
        auto *swapchain = getWindow()->getSwapchain();
        const auto orientation = swapchain ? swapchain->getSurfaceTransform() : gfx::SurfaceTransform::IDENTITY;
        if (static_cast<int32_t>(orientation) % 2) _aspect = 1 / _aspect;
    }
    _isProjDirty = true;
}

void Camera::setViewport(const Rect &val) {
    debug::warnID(8302);
    setViewportInOrientedSpace(val);
}

void Camera::setViewportInOrientedSpace(const Rect &val) {
    const auto x = val.x;
    const auto width = val.width;
    const auto height = val.height;

    const auto y = _device->getCapabilities().screenSpaceSignY < 0 ? 1.F - val.y - height : val.y;

    auto *swapchain = getWindow()->getSwapchain();
    const auto orientation = swapchain ? swapchain->getSurfaceTransform() : gfx::SurfaceTransform::IDENTITY;
    switch (orientation) {
        case gfx::SurfaceTransform::ROTATE_90:
            _viewport.x = 1 - y - height;
            _viewport.y = x;
            _viewport.z = height;
            _viewport.w = width;
            break;
        case gfx::SurfaceTransform::ROTATE_180:
            _viewport.x = 1 - x - width;
            _viewport.y = 1 - y - height;
            _viewport.z = width;
            _viewport.w = height;
            break;
        case gfx::SurfaceTransform::ROTATE_270:
            _viewport.x = y;
            _viewport.y = 1 - x - width;
            _viewport.z = height;
            _viewport.w = width;
            break;
        case gfx::SurfaceTransform::IDENTITY:
            _viewport.x = x;
            _viewport.y = y;
            _viewport.z = width;
            _viewport.w = height;
            break;
        default:
            break;
    }
    _orientedViewport.x = x;
    _orientedViewport.y = y;
    _orientedViewport.z = width;
    _orientedViewport.w = height;

    resize(_width, _height);
}

} // namespace scene
} // namespace cc
