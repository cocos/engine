/****************************************************************************
 Copyright (c) 2022-2023 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
 worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
 not use Cocos Creator software for developing other software or tools that's
 used for developing games. You are not granted to publish, distribute,
 sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
****************************************************************************/

#pragma once

#include "platform/interfaces/modules/canvas/ICanvasRenderingContext2D.h"

#include <array>
#include <cstdint>
#include <regex>
#include <memory>

#include <native_drawing/drawing_types.h>
#include <native_drawing/drawing_bitmap.h>
#include <native_drawing/drawing_text_declaration.h>

#include "base/csscolorparser.h"
#include "cocos/bindings/manual/jsb_platform.h"
#include "math/Math.h"
#include "platform/FileUtils.h"

namespace cc {

class CanvasRenderingContext2DDelegate : public ICanvasRenderingContext2D::Delegate {
public:
    using Point   = ccstd::array<float, 2>;
    using Vec2    = ccstd::array<float, 2>;
    using Size    = ccstd::array<float, 2>;
    using Color4F = ccstd::array<float, 4>;
    using TextAlign = ICanvasRenderingContext2D::TextAlign;
    using TextBaseline = ICanvasRenderingContext2D::TextBaseline;
    
    CanvasRenderingContext2DDelegate();
    ~CanvasRenderingContext2DDelegate() override;

    void            recreateBuffer(float w, float h) override;
    void            beginPath() override;
    void            closePath() override;
    void            moveTo(float x, float y) override;
    void            lineTo(float x, float y) override;
    void            stroke() override;
    void            saveContext() override;
    void            restoreContext() override;
    void            clearRect(float /*x*/, float /*y*/, float w, float h) override;
    void            fillRect(float x, float y, float w, float h) override;
    void            fillText(const ccstd::string &text, float x, float y, float /*maxWidth*/) override;
    void            strokeText(const ccstd::string &text, float /*x*/, float /*y*/, float /*maxWidth*/) override;
    Size            measureText(const ccstd::string &text) override;
    void            updateFont(const ccstd::string &fontName, float fontSize, bool bold, bool italic, bool oblique, bool smallCaps) override;
    void            setTextAlign(TextAlign align) override;
    void            setTextBaseline(TextBaseline baseline) override;
    void            setFillStyle(uint8_t r, uint8_t g, uint8_t b, uint8_t a) override;
    void            setStrokeStyle(uint8_t r, uint8_t g, uint8_t b, uint8_t a) override;
    void            setLineWidth(float lineWidth) override;
    const cc::Data &getDataRef() const override;
    void            fill() override;
    void            setLineCap(const ccstd::string &lineCap) override;
    void            setLineJoin(const ccstd::string &lineCap) override;
    void            fillImageData(const Data &imageData, float imageWidth, float imageHeight, float offsetX, float offsetY) override;
    void            rect(float x, float y, float w, float h) override;
    void            setShadowBlur(float blur)override{}
    void            setShadowColor(uint8_t r, uint8_t g, uint8_t b, uint8_t a) override{}
    void            setShadowOffsetX(float offsetX) override{}
    void            setShadowOffsetY(float offsetY) override{}
    void            updateData() override;
    void            setTextStyle(OH_Drawing_TextStyle *textStyle);
private:
    static wchar_t *     utf8ToUtf16(const ccstd::string &str, int *pRetLen = nullptr);
    void                 removeCustomFont();
    int                  drawText(const ccstd::string &text, int x, int y);
    Size                 sizeWithText(const wchar_t *pszText, int nLen);
    void                 prepareBitmap(int nWidth, int nHeight);
    void                 deleteBitmap();
    void                 fillTextureData();
    ccstd::array<float, 2> convertDrawPoint(Point point, const ccstd::string &text, OH_Drawing_TextStyle *textStyle);

    class ScopedTypography;
    std::unique_ptr<ScopedTypography> createTypography(const ccstd::string &text, OH_Drawing_TextStyle *textStyle);
    void setPremultiply(bool multiply);
public:
    int          _screen{0};

private:

    int32_t _x{0};
    int32_t _y{0};
    int32_t _lineCap{0};
    int32_t _lineJoin{0};

private:
    OH_Drawing_Bitmap* _bitmap{nullptr};
    OH_Drawing_BitmapFormat _format {COLOR_FORMAT_RGBA_8888, ALPHA_FORMAT_OPAQUE};
    OH_Drawing_Canvas* _canvas{nullptr};
    OH_Drawing_TypographyStyle* _typographyStyle{nullptr};
    OH_Drawing_TypographyCreate* _typographyCreate{nullptr};
    OH_Drawing_FontCollection* _fontCollection{nullptr};
    OH_Drawing_TextStyle* _textStyle{nullptr};
    OH_Drawing_TextStyle *_strokeTextStyle{nullptr};
    OH_Drawing_Pen *_pen{nullptr};

    cc::Data    _imageData;
    ccstd::string _curFontPath;
    int         _savedDC{0};
    float       _lineWidth{0.0F};
    float       _bufferWidth{0.0F};
    float       _bufferHeight{0.0F};
    int32_t     _bufferSize{0};

    ccstd::string      _fontName;
    int                _fontSize{0};
    Size               _textSize;
    TextAlign          _textAlign{TextAlign::CENTER};
    TextBaseline       _textBaseLine{TextBaseline::TOP};
    Color4F            _fillStyle{0};
    Color4F            _strokeStyle{0};
    bool               _bold{false};
    bool               _italic{false};
    bool               _premultiply{true};
    
};

} // namespace cc
