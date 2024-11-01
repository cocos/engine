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

#ifdef SPINE_UE4
    #include "SpinePluginPrivatePCH.h"
#endif

#include <spine/MathUtil.h>
#include <stdlib.h>
#include <string.h>

// Required for division by 0 in _isNaN on MSVC
#ifdef _MSC_VER
    #pragma warning(disable : 4723)
#endif

using namespace spine;

RTTI_IMPL_NOPARENT(Interpolation)
RTTI_IMPL(PowInterpolation, Interpolation)
RTTI_IMPL(PowOutInterpolation, Interpolation)

float MathUtil::sign(float v) {
    return ((v) < 0 ? -1.0f : (v) > 0 ? 1.0f
                                      : 0.0f);
}

float MathUtil::clamp(float x, float min, float max) {
    return ((x) < (min) ? (min) : ((x) > (max) ? (max) : (x)));
}

/* Need to pass 0 as an argument, so VC++ doesn't error with C2124 */
static inline bool _isNan(float value, float zero) {
    float _nan = (float)0.0 / zero;
    return 0 == memcmp((void *)&value, (void *)&_nan, sizeof(value));
}

bool MathUtil::isNan(float v) {
    return _isNan(v, 0);
}

float MathUtil::randomTriangular(float min, float max, float mode) {
    float u = random();
    float d = max - min;
    if (u <= (mode - min) / d) return min + sqrt(u * d * (mode - min));
    return max - sqrt((1 - u) * d * (max - mode));
}

uint64_t MathUtil::ipow(uint64_t base, uint32_t exp) {
	uint64_t result = 1;

	while (exp) {
		if (exp & 1) {
			result *= base;
        }
		exp >>= 1;
		base *= base;
	}

	return result;
}