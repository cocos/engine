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

#ifndef Spine_MathUtil_h
#define Spine_MathUtil_h

#include <spine/SpineObject.h>
#include <spine/RTTI.h>
#include <math.h>
#include <cstdint>

namespace spine {

class SP_API MathUtil {
private:
    MathUtil();

public:
    static constexpr float Pi = 3.1415926535897932385f;
    static constexpr float Pi_2 = 3.1415926535897932385f * 2;
    static constexpr float Deg_Rad = (3.1415926535897932385f / 180.0f);
    static constexpr float Rad_Deg = (180.0f / 3.1415926535897932385f);

    template <typename T>
    static inline T min(T a, T b) { return a < b ? a : b; }

    template <typename T>
    static inline T max(T a, T b) { return a > b ? a : b; }

    static float sign(float val);

    static float clamp(float x, float lower, float upper);

    static inline float abs(float v) {
        return ::abs(v);
    }

    /// Returns the sine in radians from a lookup table.
    static inline float sin(float radians) {
        return ::sin(radians);
    }

    /// Returns the cosine in radians from a lookup table.
    static inline float cos(float radians) {
        return ::cos(radians);
    }

    /// Returns the sine in radians from a lookup table.
    static inline float sinDeg(float degrees) {
        return ::sin(degrees * MathUtil::Deg_Rad);
    }

    /// Returns the cosine in radians from a lookup table.
    static inline float cosDeg(float degrees) {
        return ::cos(degrees * MathUtil::Deg_Rad);
    }

    /// Returns atan2 in radians, faster but less accurate than Math.Atan2. Average error of 0.00231 radians (0.1323
    /// degrees), largest error of 0.00488 radians (0.2796 degrees).
    static inline float atan2(float y, float x) {
        return ::atan2(y, x);
    }

    static inline float acos(float v) {
        return ::acos(v);
    }

    static inline float sqrt(float v) {
        return ::sqrt(v);
    }

    static inline float fmod(float a, float b) {
        return ::fmod(a, b);
    }

    static bool isNan(float v);

    static inline float random() {
        return ::rand() / static_cast<float>(RAND_MAX);
    }

    static inline float randomTriangular(float min, float max) {
        return randomTriangular(min, max, (min + max) * 0.5f);
    }

    static float randomTriangular(float min, float max, float mode);

    static inline float pow(float a, float b) {
        return (float)::pow(a, b);
    }

    static uint64_t ipow(uint64_t base, uint32_t exp);
};

struct SP_API Interpolation {
    RTTI_DECL
    virtual float apply(float a) = 0;

    virtual float interpolate(float start, float end, float a) {
        return start + (end - start) * apply(a);
    }

    virtual ~Interpolation(){};
};


struct SP_API PowInterpolation : public Interpolation {
    RTTI_DECL
    PowInterpolation(int power) : power(power) {
    }

    float apply(float a) {
        if (a <= 0.5f) return MathUtil::pow(a * 2.0f, (float)power) / 2.0f;
        return MathUtil::pow((a - 1.0f) * 2.0f, (float)power) / (power % 2 == 0 ? -2.0f : 2.0f) + 1.0f;
    }

    int power;
};

struct SP_API PowOutInterpolation : public Interpolation {
    RTTI_DECL
    PowOutInterpolation(int power) : power(power) {
    }

    float apply(float a) {
        return MathUtil::pow(a - 1, (float)power) * (power % 2 == 0 ? -1.0f : 1.0f) + 1.0f;
    }

    int power;
};

} // namespace spine

#endif /* Spine_MathUtil_h */
