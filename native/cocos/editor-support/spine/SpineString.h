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

#ifndef SPINE_STRING_H
#define SPINE_STRING_H

#include <spine/Extension.h>
#include <spine/SpineObject.h>
#include <stdio.h>
#include <string.h>

namespace spine {
class SP_API String : public SpineObject {
public:
    String();
    String(const char *chars, size_t len, bool own);
    String(const char *chars, bool own = false);
    String(const String &other);
    ~String();

    inline size_t length() const {
        return _length;
    }

    inline bool isEmpty() const {
        return _length == 0;
    }

    inline const char *buffer() const {
        return _buffer;
    }

    void own(const String &other);
    void own(const char *chars);
    void unown();
    String &operator=(const String &other);
    String &operator=(const char *chars);

    String &append(const char *chars);
    String &append(const String &other);

#ifndef __EMSCRIPTEN__
    String &append(int other);
    String &append(float other);
#endif

    friend bool operator==(const String &a, const String &b);
    friend bool operator!=(const String &a, const String &b);
    
private:
    mutable size_t _length;
    mutable char *_buffer;
};
} // namespace spine

#endif //SPINE_STRING_H
