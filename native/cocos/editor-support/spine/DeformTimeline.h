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

#ifndef Spine_DeformTimeline_h
#define Spine_DeformTimeline_h

#include <spine/CurveTimeline.h>

namespace spine {
class VertexAttachment;

class SP_API DeformTimeline : public CurveTimeline {
    friend class SkeletonBinary;
    friend class SkeletonJson;

    RTTI_DECL

public:
    explicit DeformTimeline(int frameCount);

    virtual void apply(Skeleton& skeleton, float lastTime, float time, Vector<Event*>* pEvents, float alpha, MixBlend blend, MixDirection direction);

    virtual int getPropertyId();

    /// Sets the time and value of the specified keyframe.
    void setFrame(int frameIndex, float time, Vector<float>& vertices);

    int getSlotIndex();
    void setSlotIndex(int inValue);
    inline Vector<float>& getFrames() { return _frames; }
    inline Vector<Vector<float> >& getVertices() { return _frameVertices; }
    VertexAttachment* getAttachment();
    void setAttachment(VertexAttachment* inValue);

#ifndef __EMSCRIPTEN__
private:
#endif
    int _slotIndex;
    Vector<float> _frames;
    Vector<Vector<float> > _frameVertices;
    VertexAttachment* _attachment;
};
} // namespace spine

#endif /* Spine_DeformTimeline_h */
