/**
 Copyright 2013 BlackBerry Inc.
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.

 Original file from GamePlay3D: http://gameplay3d.org

 This file was modified to fit the cocos2d-x project
 */

#include "math/Vec2.h"
#include "math/MathUtil.h"
#include "base/Macros.h"

NS_CC_MATH_BEGIN

// returns true if segment a-b intersects with segment c-d. s->e is the overlap part
bool isOneDimensionSegmentOverlap(float a, float b, float c, float d, float *s, float *e) {
    float abmin = std::min(a, b);
    float abmax = std::max(a, b);
    float cdmin = std::min(c, d);
    float cdmax = std::max(d, d);

    if (abmax < cdmin || cdmax < abmin) {
        // ABmin->ABmax->CDmin->CDmax or CDmin->CDmax->ABmin->ABmax
        return false;
    } else {
        if (abmin >= cdmin && abmin <= cdmax) {
            // CDmin->ABmin->CDmax->ABmax or CDmin->ABmin->ABmax->CDmax
            if (s != nullptr) *s = abmin;
            if (e != nullptr) *e = cdmax < abmax ? cdmax : abmax;
        } else if (abmax >= cdmin && abmax <= cdmax) {
            // ABmin->CDmin->ABmax->CDmax
            if (s != nullptr) s = &cdmin;
            if (e != nullptr) *e = abmax;
        } else {
            // ABmin->CDmin->CDmax->ABmax
            if (s != nullptr) *s = cdmin;
            if (e != nullptr) *e = cdmax;
        }
        return true;
    }
}

// cross product of 2 vector. a->b X c->d
float crossProduct2Vector(const Vec2 &a, const Vec2 &b, const Vec2 &c, const Vec2 &d) {
    return (d.y - c.y) * (b.x - a.x) - (d.x - c.x) * (b.y - a.y);
}

float Vec2::angle(const Vec2 &v1, const Vec2 &v2) {
    float dz = v1.x * v2.y - v1.y * v2.x;
    return atan2f(fabsf(dz) + MATH_FLOAT_SMALL, dot(v1, v2));
}

void Vec2::add(const Vec2 &v1, const Vec2 &v2, Vec2 *dst) {
    CC_ASSERT(dst);

    dst->x = v1.x + v2.x;
    dst->y = v1.y + v2.y;
}

void Vec2::clamp(const Vec2 &min, const Vec2 &max) {
    CC_ASSERT(!(min.x > max.x || min.y > max.y));

    // Clamp the x value.
    if (x < min.x) {
        x = min.x;
    }
    if (x > max.x) {
        x = max.x;
    }

    // Clamp the y value.
    if (y < min.y) {
        y = min.y;
    }
    if (y > max.y) {
        y = max.y;
    }
}

void Vec2::clamp(const Vec2 &v, const Vec2 &min, const Vec2 &max, Vec2 *dst) {
    CC_ASSERT(dst);
    CC_ASSERT(!(min.x > max.x || min.y > max.y));

    // Clamp the x value.
    dst->x = v.x;
    if (dst->x < min.x) {
        dst->x = min.x;
    }
    if (dst->x > max.x) {
        dst->x = max.x;
    }

    // Clamp the y value.
    dst->y = v.y;
    if (dst->y < min.y) {
        dst->y = min.y;
    }
    if (dst->y > max.y) {
        dst->y = max.y;
    }
}

float Vec2::distance(const Vec2 &v) const {
    float dx = v.x - x;
    float dy = v.y - y;

    return std::sqrt(dx * dx + dy * dy);
}

float Vec2::dot(const Vec2 &v1, const Vec2 &v2) {
    return (v1.x * v2.x + v1.y * v2.y);
}

float Vec2::length() const {
    return std::sqrt(x * x + y * y);
}

void Vec2::normalize() {
    float n = x * x + y * y;
    // Already normalized.
    if (n == 1.0F) {
        return;
    }

    n = std::sqrt(n);
    // Too close to zero.
    if (n < MATH_TOLERANCE) {
        return;
    }

    n = 1.0F / n;
    x *= n;
    y *= n;
}

Vec2 Vec2::getNormalized() const {
    Vec2 v(*this);
    v.normalize();
    return v;
}

void Vec2::rotate(const Vec2 &point, float angle) {
    float sinAngle = std::sin(angle);
    float cosAngle = std::cos(angle);

    if (point.isZero()) {
        float tempX = x * cosAngle - y * sinAngle;
        y           = y * cosAngle + x * sinAngle;
        x           = tempX;
    } else {
        float tempX = x - point.x;
        float tempY = y - point.y;

        x = tempX * cosAngle - tempY * sinAngle + point.x;
        y = tempY * cosAngle + tempX * sinAngle + point.y;
    }
}

void Vec2::set(const float *array) {
    CC_ASSERT(array);

    x = array[0];
    y = array[1];
}

void Vec2::subtract(const Vec2 &v1, const Vec2 &v2, Vec2 *dst) {
    CC_ASSERT(dst);

    dst->x = v1.x - v2.x;
    dst->y = v1.y - v2.y;
}

bool Vec2::equals(const Vec2 &target) const {
    return (std::abs(this->x - target.x) < FLT_EPSILON) && (std::abs(this->y - target.y) < FLT_EPSILON);
}

bool Vec2::fuzzyEquals(const Vec2 &b, float var) const {
    if (x - var <= b.x && b.x <= x + var) {
        if (y - var <= b.y && b.y <= y + var) {
            return true;
        }
    }

    return false;
}

float Vec2::getAngle(const Vec2 &other) const {
    Vec2  a2    = getNormalized();
    Vec2  b2    = other.getNormalized();
    float angle = atan2f(a2.cross(b2), a2.dot(b2));
    if (std::abs(angle) < FLT_EPSILON) {
        return 0.F;
    }
    return angle;
}

Vec2 Vec2::rotateByAngle(const Vec2 &pivot, float angle) const {
    return pivot + (*this - pivot).rotate(Vec2::forAngle(angle));
}

bool Vec2::isLineIntersect(const Vec2 &A, const Vec2 &B,
                           const Vec2 &C, const Vec2 &D,
                           float *S, float *T) {
    // FAIL: Line undefined
    if ((A.x == B.x && A.y == B.y) || (C.x == D.x && C.y == D.y)) {
        return false;
    }

    const float denom = crossProduct2Vector(A, B, C, D);

    if (denom == 0) {
        // Lines parallel or overlap
        return false;
    }

    if (S != nullptr) *S = crossProduct2Vector(C, D, C, A) / denom;
    if (T != nullptr) *T = crossProduct2Vector(A, B, C, A) / denom;

    return true;
}

bool Vec2::isLineParallel(const Vec2 &A, const Vec2 &B,
                          const Vec2 &C, const Vec2 &D) {
    // FAIL: Line undefined
    if ((A.x == B.x && A.y == B.y) || (C.x == D.x && C.y == D.y)) {
        return false;
    }

    if (crossProduct2Vector(A, B, C, D) == 0) {
        // line overlap
        if (crossProduct2Vector(C, D, C, A) == 0 || crossProduct2Vector(A, B, C, A) == 0) {
            return false;
        }

        return true;
    }

    return false;
}

bool Vec2::isLineOverlap(const Vec2 &A, const Vec2 &B,
                         const Vec2 &C, const Vec2 &D) {
    // FAIL: Line undefined
    if ((A.x == B.x && A.y == B.y) || (C.x == D.x && C.y == D.y)) {
        return false;
    }

    if (crossProduct2Vector(A, B, C, D) == 0 &&
        (crossProduct2Vector(C, D, C, A) == 0 || crossProduct2Vector(A, B, C, A) == 0)) {
        return true;
    }

    return false;
}

bool Vec2::isSegmentOverlap(const Vec2 &A, const Vec2 &B, const Vec2 &C, const Vec2 &D, Vec2 *S, Vec2 *E) {

    if (isLineOverlap(A, B, C, D)) {
        return isOneDimensionSegmentOverlap(A.x, B.x, C.x, D.x, &S->x, &E->x) &&
               isOneDimensionSegmentOverlap(A.y, B.y, C.y, D.y, &S->y, &E->y);
    }

    return false;
}

bool Vec2::isSegmentIntersect(const Vec2 &A, const Vec2 &B, const Vec2 &C, const Vec2 &D) {
    float S, T;

    if (isLineIntersect(A, B, C, D, &S, &T) &&
        (S >= 0.0f && S <= 1.0f && T >= 0.0f && T <= 1.0f)) {
        return true;
    }

    return false;
}

Vec2 Vec2::getIntersectPoint(const Vec2 &A, const Vec2 &B, const Vec2 &C, const Vec2 &D) {
    float S, T;

    if (isLineIntersect(A, B, C, D, &S, &T)) {
        // Vec2 of intersection
        Vec2 P;
        P.x = A.x + S * (B.x - A.x);
        P.y = A.y + S * (B.y - A.y);
        return P;
    }

    return Vec2::ZERO;
}

const Vec2 Vec2::ZERO(0.0f, 0.0f);
const Vec2 Vec2::ONE(1.0f, 1.0f);
const Vec2 Vec2::UNIT_X(1.0f, 0.0f);
const Vec2 Vec2::UNIT_Y(0.0f, 1.0f);
const Vec2 Vec2::ANCHOR_MIDDLE(0.5f, 0.5f);
const Vec2 Vec2::ANCHOR_BOTTOM_LEFT(0.0f, 0.0f);
const Vec2 Vec2::ANCHOR_TOP_LEFT(0.0f, 1.0f);
const Vec2 Vec2::ANCHOR_BOTTOM_RIGHT(1.0f, 0.0f);
const Vec2 Vec2::ANCHOR_TOP_RIGHT(1.0f, 1.0f);
const Vec2 Vec2::ANCHOR_MIDDLE_RIGHT(1.0f, 0.5f);
const Vec2 Vec2::ANCHOR_MIDDLE_LEFT(0.0f, 0.5f);
const Vec2 Vec2::ANCHOR_MIDDLE_TOP(0.5f, 1.0f);
const Vec2 Vec2::ANCHOR_MIDDLE_BOTTOM(0.5f, 0.0f);

NS_CC_MATH_END
