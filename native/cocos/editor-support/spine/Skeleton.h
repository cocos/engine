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

#ifndef Spine_Skeleton_h
#define Spine_Skeleton_h

#include <spine/Color.h>
#include <spine/MathUtil.h>
#include <spine/SpineObject.h>
#include <spine/SpineString.h>
#include <spine/Vector.h>

namespace spine {
class SkeletonData;

class Bone;

class Updatable;

class Slot;

class IkConstraint;

class PathConstraint;

class TransformConstraint;

class Skin;

class Attachment;

class SP_API Skeleton : public SpineObject {
    friend class AnimationState;

    friend class SkeletonBounds;

    friend class SkeletonClipping;

    friend class AttachmentTimeline;

    friend class ColorTimeline;

    friend class DeformTimeline;

    friend class DrawOrderTimeline;

    friend class EventTimeline;

    friend class IkConstraintTimeline;

    friend class PathConstraintMixTimeline;

    friend class PathConstraintPositionTimeline;

    friend class PathConstraintSpacingTimeline;

    friend class ScaleTimeline;

    friend class ShearTimeline;

    friend class TransformConstraintTimeline;

    friend class TranslateTimeline;

    friend class TwoColorTimeline;

public:
    explicit Skeleton(SkeletonData *skeletonData);

    ~Skeleton();

    /// Caches information about bones and constraints. Must be called if bones, constraints or weighted path attachments are added
    /// or removed.
    void updateCache();

    void printUpdateCache();

    /// Updates the world transform for each bone and applies constraints.
    void updateWorldTransform();

    /// Sets the bones, constraints, and slots to their setup pose values.
    void setToSetupPose();

    /// Sets the bones and constraints to their setup pose values.
    void setBonesToSetupPose();

    void setSlotsToSetupPose();

    /// @return May be NULL.
    Bone *findBone(const String &boneName);

    /// @return -1 if the bone was not found.
    int findBoneIndex(const String &boneName);

    /// @return May be NULL.
    Slot *findSlot(const String &slotName);

    /// @return -1 if the bone was not found.
    int findSlotIndex(const String &slotName);

    /// Sets a skin by name (see setSkin).
    void setSkin(const String &skinName);

    /// Attachments from the new skin are attached if the corresponding attachment from the old skin was attached.
    /// If there was no old skin, each slot's setup mode attachment is attached from the new skin.
    /// After changing the skin, the visible attachments can be reset to those attached in the setup pose by calling
    /// See Skeleton::setSlotsToSetupPose()
    /// Also, often AnimationState::apply(Skeleton&) is called before the next time the
    /// skeleton is rendered to allow any attachment keys in the current animation(s) to hide or show attachments from the new skin.
    /// @param newSkin May be NULL.
    void setSkin(Skin *newSkin);

    /// @return May be NULL.
    Attachment *getAttachment(const String &slotName, const String &attachmentName);

    /// @return May be NULL.
    Attachment *getAttachment(int slotIndex, const String &attachmentName);

    /// @param attachmentName May be empty.
    void setAttachment(const String &slotName, const String &attachmentName);

    /// @return May be NULL.
    IkConstraint *findIkConstraint(const String &constraintName);

    /// @return May be NULL.
    TransformConstraint *findTransformConstraint(const String &constraintName);

    /// @return May be NULL.
    PathConstraint *findPathConstraint(const String &constraintName);

    void update(float delta);

    /// Returns the axis aligned bounding box (AABB) of the region and mesh attachments for the current pose.
    /// @param outX The horizontal distance between the skeleton origin and the left side of the AABB.
    /// @param outY The vertical distance between the skeleton origin and the bottom side of the AABB.
    /// @param outWidth The width of the AABB
    /// @param outHeight The height of the AABB.
    /// @param outVertexBuffer Reference to hold a Vector of floats. This method will assign it with new floats as needed.
    void getBounds(float &outX, float &outY, float &outWidth, float &outHeight, Vector<float> &outVertexBuffer);

    Bone *getRootBone();

    SkeletonData *getData();

    inline Vector<Bone *> &getBones() { return _bones; }

    inline Vector<Updatable *> &getUpdateCacheList() { return _updateCache; }

    inline Vector<Slot *> &getSlots() { return _slots; }

    inline Vector<Slot *> &getDrawOrder() { return _drawOrder; }

    inline Vector<IkConstraint *> &getIkConstraints() { return _ikConstraints; }

    inline Vector<PathConstraint *> &getPathConstraints() { return _pathConstraints; }

    inline Vector<TransformConstraint *> &getTransformConstraints() { return _transformConstraints; }

    Skin *getSkin();

    Color &getColor();

    inline float getTime() const {
        return _time;
    }

    inline void setTime(float inValue) {
        _time = inValue;
    }

    inline void setPosition(float x, float y) {
        _x = x;
        _y = y;
    }

    inline float getX() const {
        return _x;
    }

    inline void setX(float inValue) {
        _x = inValue;
    }

    inline float getY() const {
        return _y;
    }

    inline void setY(float inValue) {
        _y = inValue;
    }

    inline float getScaleX() const {
        return _scaleX;
    }

    inline void setScaleX(float inValue) {
        _scaleX = inValue;
    }

    inline float getScaleY() const {
        return _scaleY;
    }

    inline void setScaleY(float inValue) {
        _scaleY = inValue;
    }
#ifndef __EMSCRIPTEN__
private:
#endif
    SkeletonData *_data;
    Vector<Bone *> _bones;
    Vector<Slot *> _slots;
    Vector<Slot *> _drawOrder;
    Vector<IkConstraint *> _ikConstraints;
    Vector<TransformConstraint *> _transformConstraints;
    Vector<PathConstraint *> _pathConstraints;
    Vector<Updatable *> _updateCache;
    Vector<Bone *> _updateCacheReset;
    Skin *_skin;
    Color _color;
    float _time;
    float _scaleX, _scaleY;
    float _x, _y;

    void sortIkConstraint(IkConstraint *constraint);

    void sortPathConstraint(PathConstraint *constraint);

    void sortTransformConstraint(TransformConstraint *constraint);

    void sortPathConstraintAttachment(Skin *skin, size_t slotIndex, Bone &slotBone);

    void sortPathConstraintAttachment(Attachment *attachment, Bone &slotBone);

    void sortBone(Bone *bone);

    static void sortReset(Vector<Bone *> &bones);
};
} // namespace spine

#endif /* Spine_Skeleton_h */
