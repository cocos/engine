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

#ifndef Spine_VertexEffect_h
#define Spine_VertexEffect_h

#include <spine/MathUtil.h>
#include <spine/SpineObject.h>
#include <spine/RTTI.h>

namespace spine {

class Skeleton;
class Color;

class SP_API VertexEffect : public SpineObject {
    RTTI_DECL
public:
    virtual void begin(Skeleton &skeleton) = 0;
    virtual void transform(float &x, float &y) = 0;
    virtual void end() = 0;
};

class SP_API JitterVertexEffect : public VertexEffect {
    RTTI_DECL
public:
    JitterVertexEffect(float jitterX, float jitterY);

    void begin(Skeleton &skeleton);
    void transform(float &x, float &y);
    void end();

    void setJitterX(float jitterX);
    float getJitterX();

    void setJitterY(float jitterY);
    float getJitterY();

#ifndef __EMSCRIPTEN__
protected:
#endif
    float _jitterX;
    float _jitterY;
};

class SP_API SwirlVertexEffect : public VertexEffect {
    RTTI_DECL
public:
    SwirlVertexEffect(float radius, Interpolation &interpolation);

    void begin(Skeleton &skeleton);
    void transform(float &x, float &y);
    void end();

    void setCenterX(float centerX);
    float getCenterX();

    void setCenterY(float centerY);
    float getCenterY();

    void setRadius(float radius);
    float getRadius();

    void setAngle(float angle);
    float getAngle();

    void setWorldX(float worldX);
    float getWorldX();

    void setWorldY(float worldY);
    float getWorldY();

#ifndef __EMSCRIPTEN__
protected:
#endif
    float _centerX;
    float _centerY;
    float _radius;
    float _angle;
    float _worldX;
    float _worldY;

    Interpolation &_interpolation;
};
} // namespace spine

#endif /* Spine_VertexEffect_h */
