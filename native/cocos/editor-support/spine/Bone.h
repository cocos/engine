/******************************************************************************
 * Spine Runtimes License Agreement
 * Last updated January 1, 2020. Replaces all prior versions.
 *
 * Copyright (c) 2013-2020, Esoteric Software LLC
 *
 * Integration of the Spine Runtimes into software or otherwise creating
 * derivative works of the Spine Runtimes is permitted under the terms and
 * conditions of Section 2 of the Spine Editor License Agreement:
 * http://esotericsoftware.com/spine-editor-license
 *
 * Otherwise, it is permitted to integrate the Spine Runtimes into software
 * or otherwise create derivative works of the Spine Runtimes (collectively,
 * "Products"), provided that each user of the Products must obtain their own
 * Spine Editor license and redistribution of the Products in any form must
 * include this license and copyright notice.
 *
 * THE SPINE RUNTIMES ARE PROVIDED BY ESOTERIC SOFTWARE LLC "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL ESOTERIC SOFTWARE LLC BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES,
 * BUSINESS INTERRUPTION, OR LOSS OF USE, DATA, OR PROFITS) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THE SPINE RUNTIMES, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *****************************************************************************/

#ifndef Spine_Bone_h
#define Spine_Bone_h

#include <spine/SpineObject.h>
#include <spine/Updatable.h>
#include <spine/Vector.h>

namespace spine {
class BoneData;

class Skeleton;

/// Stores a bone's current pose.
///
/// A bone has a local transform which is used to compute its world transform. A bone also has an applied transform, which is a
/// local transform that can be applied to compute the world transform. The local transform and applied transform may differ if a
/// constraint or application code modifies the world transform after it was computed from the local transform.
class SP_API Bone : public Updatable {
    friend class AnimationState;

    friend class RotateTimeline;

    friend class IkConstraint;

    friend class TransformConstraint;

    friend class VertexAttachment;

    friend class PathConstraint;

    friend class Skeleton;

    friend class RegionAttachment;

    friend class PointAttachment;

    friend class ScaleTimeline;

    friend class ShearTimeline;

    friend class TranslateTimeline;

    RTTI_DECL

public:
    static void setYDown(bool inValue);

    static bool isYDown();

    /// @param parent May be NULL.
    Bone(BoneData &data, Skeleton &skeleton, Bone *parent = NULL);

    /// Same as updateWorldTransform. This method exists for Bone to implement Spine::Updatable.
    virtual void update();

    /// Computes the world transform using the parent bone and this bone's local transform.
    void updateWorldTransform();

    /// Computes the world transform using the parent bone and the specified local transform.
    void updateWorldTransform(float x, float y, float rotation, float scaleX, float scaleY, float shearX, float shearY);

    void setToSetupPose();

    void worldToLocal(float worldX, float worldY, float &outLocalX, float &outLocalY);

    void localToWorld(float localX, float localY, float &outWorldX, float &outWorldY);

    float worldToLocalRotation(float worldRotation);

    float localToWorldRotation(float localRotation);

    /// Rotates the world transform the specified amount and sets isAppliedValid to false.
    /// @param degrees Degrees.
    void rotateWorld(float degrees);

    float getWorldToLocalRotationX();

    float getWorldToLocalRotationY();

    BoneData &getData();

    Skeleton &getSkeleton();

    Bone *getParent();

    inline Vector<Bone *> &getChildren() { return _children; }

    /// The local X translation.
    inline float getX() const {
        return _x;
    }

    inline void setX(float inValue) {
        _x = inValue;
    }

    /// The local Y translation.
    inline float getY() const {
        return _y;
    }

    inline void setY(float inValue) {
        _y = inValue;
    }

    /// The local rotation.
    inline float getRotation() const {
        return _rotation;
    }

    inline void setRotation(float inValue) {
        _rotation = inValue;
    }

    /// The local scaleX.
    inline float getScaleX() const {
        return _scaleX;
    }

    inline void setScaleX(float inValue) {
        _scaleX = inValue;
    }

    /// The local scaleY.
    inline float getScaleY() const {
        return _scaleY;
    }

    inline void setScaleY(float inValue) {
        _scaleY = inValue;
    }

    /// The local shearX.
    inline float getShearX() const {
        return _shearX;
    }

    inline void setShearX(float inValue) {
        _shearX = inValue;
    }

    /// The local shearY.
    inline float getShearY() const {
        return _shearY;
    }

    inline void setShearY(float inValue) {
        _shearY = inValue;
    }

    /// The rotation, as calculated by any constraints.
    inline float getAppliedRotation() const {
        return _arotation;
    }

    inline void setAppliedRotation(float inValue) {
        _arotation = inValue;
    }

    /// The applied local x translation.
    inline float getAX() const {
        return _ax;
    }

    inline void setAX(float inValue) {
        _ax = inValue;
    }

    /// The applied local y translation.
    inline float getAY() const {
        return _ay;
    }

    inline void setAY(float inValue) {
        _ay = inValue;
    }

    /// The applied local scaleX.
    inline float getAScaleX() const {
        return _ascaleX;
    }

    inline void setAScaleX(float inValue) {
        _ascaleX = inValue;
    }

    /// The applied local scaleY.
    inline float getAScaleY() const {
        return _ascaleY;
    }

    inline void setAScaleY(float inValue) {
        _ascaleY = inValue;
    }

    /// The applied local shearX.
    inline float getAShearX() const {
        return _ashearX;
    }

    inline void setAShearX(float inValue) {
        _ashearX = inValue;
    }

    /// The applied local shearY.
    inline float getAShearY() const {
        return _ashearY;
    }

    inline void setAShearY(float inValue) {
        _ashearY = inValue;
    }

    inline float getA() const {
        return _a;
    }

    inline void setA(float inValue) {
        _a = inValue;
    }

    inline float getB() const {
        return _b;
    }

    inline void setB(float inValue) {
        _b = inValue;
    }

    inline float getC() const {
        return _c;
    }

    inline void setC(float inValue) {
        _c = inValue;
    }

    inline float getD() const {
        return _d;
    }

    inline void setD(float inValue) {
        _d = inValue;
    }

    inline float getWorldX() const {
        return _worldX;
    }

    inline void setWorldX(float inValue) {
        _worldX = inValue;
    }

    inline float getWorldY() const {
        return _worldY;
    }

    inline void setWorldY(float inValue) {
        _worldY = inValue;
    }

    float getWorldRotationX() const;

    float getWorldRotationY() const;

    /// Returns the magnitide (always positive) of the world scale X.
    float getWorldScaleX() const;

    /// Returns the magnitide (always positive) of the world scale Y.
    float getWorldScaleY() const;

    inline bool isAppliedValid() const {
        return _appliedValid;
    }

    void setAppliedValid(bool valid) {
        _appliedValid = valid;
    }

    virtual bool isActive();

    virtual void setActive(bool inValue);;

private:
    static bool yDown;

    BoneData &_data;
    Skeleton &_skeleton;
    Bone *_parent;
    Vector<Bone *> _children;

#ifdef __EMSCRIPTEN__
public:
#endif
    float _x, _y, _rotation, _scaleX, _scaleY, _shearX, _shearY;
    float _ax, _ay, _arotation, _ascaleX, _ascaleY, _ashearX, _ashearY;
    bool _appliedValid;
    float _a, _b, _worldX;
    float _c, _d, _worldY;
    bool _sorted;
    bool _active;

    /// Computes the individual applied transform values from the world transform. This can be useful to perform processing using
    /// the applied transform after the world transform has been modified directly (eg, by a constraint)..
    ///
    /// Some information is ambiguous in the world transform, such as -1,-1 scale versus 180 rotation.
    void updateAppliedTransform();
};

} // namespace spine

#endif /* Spine_Bone_h */
