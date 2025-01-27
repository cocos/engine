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
 THE SOFTWARE.                                                                    \
 ****************************************************************************/

#include "platform/openharmony/modules/CanvasRenderingContext2DDelegate.h"
#include <native_drawing/drawing_text_typography.h>
#include <native_drawing/drawing_canvas.h>
#include <native_drawing/drawing_font_collection.h>
#include <native_drawing/drawing_pen.h>
#include <native_drawing/drawing_path.h>
#include <native_drawing/drawing_brush.h>

namespace cc {
namespace {
#define CLAMP(V, HI) std::min((V), (HI))

void unMultiplyAlpha(unsigned char *ptr, ssize_t size) {
    float alpha;
    for (int i = 0; i < size; i += 4) {
        alpha = (float)ptr[i + 3];
        if (alpha > 0) {
            ptr[i] = CLAMP((int)((float)ptr[i] / alpha * 255), 255);
            ptr[i + 1] = CLAMP((int)((float)ptr[i + 1] / alpha * 255), 255);
            ptr[i + 2] = CLAMP((int)((float)ptr[i + 2] / alpha * 255), 255);
        }
    }
}
}
enum class TextAlign { LEFT, CENTER, RIGHT };

enum class TextBaseline { TOP, MIDDLE, BOTTOM, ALPHABETIC };

class CanvasRenderingContext2DDelegate::ScopedTypography {
public:
    ScopedTypography(OH_Drawing_Typography* typography) :_typegraphy(typography) {}
    ~ScopedTypography() {
        if(_typegraphy) {
            OH_Drawing_DestroyTypography(_typegraphy);
        }
    }
    OH_Drawing_Typography* get() {
        return _typegraphy;
    }
private:
    OH_Drawing_Typography* _typegraphy{nullptr};
};

CanvasRenderingContext2DDelegate::CanvasRenderingContext2DDelegate() {
    _typographyStyle = OH_Drawing_CreateTypographyStyle();
    OH_Drawing_SetTypographyTextDirection(_typographyStyle, TEXT_DIRECTION_LTR);
    OH_Drawing_SetTypographyTextAlign(_typographyStyle, TEXT_ALIGN_LEFT);

    _fontCollection = OH_Drawing_CreateFontCollection();
    _typographyCreate = OH_Drawing_CreateTypographyHandler(_typographyStyle, _fontCollection);
    _textStyle = OH_Drawing_CreateTextStyle();
}

CanvasRenderingContext2DDelegate::~CanvasRenderingContext2DDelegate() {
    if(_typographyStyle) {
        OH_Drawing_DestroyTypographyStyle(_typographyStyle);
        _typographyStyle = nullptr;
    }

    if(_typographyCreate) {
        OH_Drawing_DestroyTypographyHandler(_typographyCreate);
        _typographyCreate = nullptr;
    }

    if(_textStyle) {
        OH_Drawing_DestroyTextStyle(_textStyle);
        _textStyle = nullptr;
    }

    if (_strokeTextStyle) {
        OH_Drawing_DestroyTextStyle(_strokeTextStyle);
        _strokeTextStyle = nullptr;
    }

    if(_canvas) {
        OH_Drawing_CanvasDestroy(_canvas);
        _canvas = nullptr;
    }

    if(_bitmap) {
        OH_Drawing_BitmapDestroy(_bitmap);
        _bitmap = nullptr;
    }

    if (_pen) {
        OH_Drawing_PenDestroy(_pen);
        _pen = nullptr;
    }
}

void CanvasRenderingContext2DDelegate::recreateBuffer(float w, float h) {
    _bufferWidth  = w;
    _bufferHeight = h;
    if (_bufferWidth < 1.0F || _bufferHeight < 1.0F) {
        return;
    }

    if(_canvas) {
        OH_Drawing_CanvasDestroy(_canvas);
        _canvas = nullptr;
    }
    if(_bitmap) {
        OH_Drawing_BitmapDestroy(_bitmap);
        _bitmap = nullptr;
    }

    _bufferSize = static_cast<int>(_bufferWidth * _bufferHeight * 4);
    auto *data  = static_cast<uint8_t *>(malloc(sizeof(uint8_t) * _bufferSize));
    memset(data, 0x00, _bufferSize);
    _imageData.fastSet(data, _bufferSize);

    _bitmap = OH_Drawing_BitmapCreate();
    OH_Drawing_BitmapBuild(_bitmap, _bufferWidth, _bufferHeight, &_format);
    _canvas = OH_Drawing_CanvasCreate();
    OH_Drawing_CanvasBind(_canvas, _bitmap);
}

void CanvasRenderingContext2DDelegate::beginPath() {
}

void CanvasRenderingContext2DDelegate::closePath() {
}

void CanvasRenderingContext2DDelegate::moveTo(float x, float y) {
    //MoveToEx(_DC, static_cast<int>(x), static_cast<int>(-(y - _bufferHeight - _fontSize)), nullptr);
    _x = x;
    _y = y;
}

void CanvasRenderingContext2DDelegate::lineTo(float x, float y) {
}

void CanvasRenderingContext2DDelegate::stroke() {
}

void CanvasRenderingContext2DDelegate::saveContext() {
}

void CanvasRenderingContext2DDelegate::restoreContext() {
}

void CanvasRenderingContext2DDelegate::clearRect(float x, float y, float w, float h) {
    if (_bufferWidth < 1.0F || _bufferHeight < 1.0F) {
        return;
    }

    if (_imageData.isNull()) {
        return;
    }

    recreateBuffer(w, h);
}

void CanvasRenderingContext2DDelegate::fillRect(float x, float y, float w, float h) {
    if (_bufferWidth < 1.0F || _bufferHeight < 1.0F) {
        return;
    }
    uint8_t r = static_cast<uint8_t>(_fillStyle[0]);
    uint8_t g = static_cast<uint8_t>(_fillStyle[1]);
    uint8_t b = static_cast<uint8_t>(_fillStyle[2]);
    uint8_t a = static_cast<uint8_t>(_fillStyle[3]);

    OH_Drawing_Path* path = OH_Drawing_PathCreate();
    OH_Drawing_PathMoveTo(path, x, y);
    OH_Drawing_PathLineTo(path, x + w, y);
    OH_Drawing_PathLineTo(path, x + w, y + h);
    OH_Drawing_PathLineTo(path, x, y + h);
    OH_Drawing_PathLineTo(path, x, y);
    OH_Drawing_PathClose(path);
    OH_Drawing_Brush* brush = OH_Drawing_BrushCreate();
    OH_Drawing_BrushSetColor(brush, OH_Drawing_ColorSetArgb(a, r, g, b));
    OH_Drawing_CanvasAttachBrush(_canvas, brush);
    OH_Drawing_CanvasDrawPath(_canvas, path);
}

void CanvasRenderingContext2DDelegate::setPremultiply(bool multiply) { _premultiply = multiply; }


void CanvasRenderingContext2DDelegate::fillText(const ccstd::string &text, float x, float y, float /*maxWidth*/) {
    if (text.empty() || _bufferWidth < 1.0F || _bufferHeight < 1.0F) {
        return;
    }
    Size  textSize    = {0, 0};
    Point offsetPoint = convertDrawPoint(Point{x, y}, text, _textStyle);
    drawText(text, (int)offsetPoint[0], (int)offsetPoint[1]);
    if (!_premultiply) {
        unMultiplyAlpha(_imageData.getBytes(), _imageData.getSize());
    }
}

void CanvasRenderingContext2DDelegate::strokeText(const ccstd::string &text, float x, float y, float /*maxWidth*/) {
    if (_pen) {
        OH_Drawing_PenDestroy(_pen);
        _pen = nullptr;
    }
    
    if (_strokeTextStyle) {
        OH_Drawing_DestroyTextStyle(_strokeTextStyle);
        _strokeTextStyle = nullptr;
    }

    uint8_t r = static_cast<uint8_t>(_strokeStyle[0]);
    uint8_t g = static_cast<uint8_t>(_strokeStyle[1]);
    uint8_t b = static_cast<uint8_t>(_strokeStyle[2]);
    uint8_t a = static_cast<uint8_t>(_strokeStyle[3]);

    _strokeTextStyle = OH_Drawing_CreateTextStyle();
    setTextStyle(_strokeTextStyle);
    _pen = OH_Drawing_PenCreate();
    OH_Drawing_PenSetColor(_pen, OH_Drawing_ColorSetArgb(a, r, g, b));
    OH_Drawing_PenSetWidth(_pen, _lineWidth);
    OH_Drawing_SetTextStyleForegroundPen(_strokeTextStyle, _pen);

    Point offsetPoint = convertDrawPoint(Point{x, y}, text, _strokeTextStyle);
    auto typography = createTypography(text, _strokeTextStyle);
    OH_Drawing_TypographyPaint(typography->get(), _canvas, offsetPoint[0], offsetPoint[1]);
}

CanvasRenderingContext2DDelegate::Size CanvasRenderingContext2DDelegate::measureText(const ccstd::string &text) {
    auto typography = createTypography(text, _textStyle);
    return ccstd::array<float, 2>{static_cast<float>(OH_Drawing_TypographyGetMaxIntrinsicWidth(typography->get())),
                                static_cast<float>(OH_Drawing_TypographyGetHeight(typography->get()))};
}

void CanvasRenderingContext2DDelegate::updateFont(const ccstd::string &fontName,
                                                  float              fontSize,
                                                  bool               bold,
                                                  bool               italic,
                                                  bool               oblique,
                                                  bool /* smallCaps */) {
    _fontName = fontName;
    _fontSize = static_cast<int>(fontSize);
    _italic = italic;
    _bold = bold;

    if (_typographyCreate) {
        OH_Drawing_DestroyTypographyHandler(_typographyCreate);
    }
    if (_textStyle) {
        OH_Drawing_DestroyTextStyle(_textStyle);
    }

    const auto &fontInfoMap = getFontFamilyCollectionMap();
    auto it = fontInfoMap.find(_fontName);
    if (it != fontInfoMap.end()) {
        _fontCollection = it->second;
    } else {
        _fontCollection = fontInfoMap.at(defaultFontKey);
    }
    _typographyStyle = OH_Drawing_CreateTypographyStyle();
    OH_Drawing_SetTypographyTextDirection(_typographyStyle, TEXT_DIRECTION_LTR);
    OH_Drawing_SetTypographyTextAlign(_typographyStyle, TEXT_ALIGN_LEFT);
    _typographyCreate = OH_Drawing_CreateTypographyHandler(_typographyStyle, _fontCollection);
    _textStyle = OH_Drawing_CreateTextStyle();

    setTextStyle(_textStyle);
}

void CanvasRenderingContext2DDelegate::setTextStyle(OH_Drawing_TextStyle *textStyle) {
    const char *fontFamilies[1];
    fontFamilies[0] = _fontName.c_str();
    OH_Drawing_SetTextStyleFontFamilies(textStyle, 1, fontFamilies);

    if (_fontSize)
        OH_Drawing_SetTextStyleFontSize(textStyle, _fontSize);
    if (_bold)
        OH_Drawing_SetTextStyleFontWeight(textStyle, FONT_WEIGHT_700);
    else
        OH_Drawing_SetTextStyleFontWeight(textStyle, FONT_WEIGHT_400);
    if (_italic)
        OH_Drawing_SetTextStyleFontStyle(textStyle, FONT_STYLE_ITALIC);
    else
        OH_Drawing_SetTextStyleFontStyle(textStyle, FONT_STYLE_NORMAL);
}

void CanvasRenderingContext2DDelegate::setTextAlign(TextAlign align) {
    _textAlign = align;
}

void CanvasRenderingContext2DDelegate::setTextBaseline(TextBaseline baseline) {
    _textBaseLine = baseline;
}

void CanvasRenderingContext2DDelegate::setFillStyle(uint8_t r, uint8_t g, uint8_t b, uint8_t a) {
    _fillStyle = {static_cast<float>(r), static_cast<float>(g), static_cast<float>(b), static_cast<float>(a)};
    OH_Drawing_SetTextStyleColor(_textStyle, OH_Drawing_ColorSetArgb(a, r, g, b));
}

void CanvasRenderingContext2DDelegate::setStrokeStyle(uint8_t r, uint8_t g, uint8_t b, uint8_t a) {
    _strokeStyle = {static_cast<float>(r), static_cast<float>(g), static_cast<float>(b), static_cast<float>(a)};
}

void CanvasRenderingContext2DDelegate::setLineWidth(float lineWidth) {
    _lineWidth = lineWidth;
}

const cc::Data &CanvasRenderingContext2DDelegate::getDataRef() const {
    void* bitmapAddr = OH_Drawing_BitmapGetPixels(_bitmap);
    memcpy(_imageData.getBytes(), bitmapAddr, _bufferSize);
    return _imageData;
}

void CanvasRenderingContext2DDelegate::removeCustomFont() {
}

// x, y offset value
int CanvasRenderingContext2DDelegate::drawText(const ccstd::string &text, int x, int y) {
    auto typography = createTypography(text, _textStyle);
    OH_Drawing_TypographyPaint(typography->get(), _canvas, (double)x, (double)y);
    return 0;
}

CanvasRenderingContext2DDelegate::Size CanvasRenderingContext2DDelegate::sizeWithText(const wchar_t *pszText, int nLen) {
    return ccstd::array<float, 2>{0.0F, 0.0F};
}

void CanvasRenderingContext2DDelegate::prepareBitmap(int nWidth, int nHeight) {
}

void CanvasRenderingContext2DDelegate::deleteBitmap() {
}

void CanvasRenderingContext2DDelegate::fillTextureData() {
}

ccstd::array<float, 2> CanvasRenderingContext2DDelegate::convertDrawPoint(Point point, const ccstd::string &text, OH_Drawing_TextStyle *textStyle) {
    auto typography = createTypography(text, textStyle);
    Size textSize {static_cast<float>(OH_Drawing_TypographyGetMaxIntrinsicWidth(typography->get())),
                   static_cast<float>(OH_Drawing_TypographyGetHeight(typography->get()))};
    
    if (_textAlign == TextAlign::CENTER) {
        point[0] -= textSize[0] / 2.0f;
    } else if (_textAlign == TextAlign::RIGHT) {
        point[0] -= textSize[0];
    }
    double alphabeticBaseLine = OH_Drawing_TypographyGetAlphabeticBaseline(typography->get());
    if (_textBaseLine == TextBaseline::TOP) {
        //point[1] += -alphabeticBaseLine;
    } else if (_textBaseLine == TextBaseline::MIDDLE) {
        point[1] += -textSize[1] / 2.0f;
    } else if (_textBaseLine == TextBaseline::BOTTOM) {
        point[1] += -textSize[1];
    } else if (_textBaseLine == TextBaseline::ALPHABETIC) {
        //GetTextMetrics(_DC, &_tm);
        //point[1] -= _tm.tmAscent;
        point[1] -= alphabeticBaseLine;
    }
    return point;
}

std::unique_ptr<CanvasRenderingContext2DDelegate::ScopedTypography> CanvasRenderingContext2DDelegate::createTypography(const ccstd::string &text, OH_Drawing_TextStyle *textStyle) {
    OH_Drawing_TypographyHandlerPushTextStyle(_typographyCreate, textStyle);
    OH_Drawing_TypographyHandlerAddText(_typographyCreate, text.c_str());
    OH_Drawing_TypographyHandlerPopTextStyle(_typographyCreate);
    OH_Drawing_Typography* typography = OH_Drawing_CreateTypography(_typographyCreate);
    OH_Drawing_TypographyLayout(typography, _bufferWidth);
    return std::make_unique<ScopedTypography>(typography);
}


void CanvasRenderingContext2DDelegate::fill() {
}

void CanvasRenderingContext2DDelegate::setLineCap(const ccstd::string &lineCap) {
}

void CanvasRenderingContext2DDelegate::setLineJoin(const ccstd::string &lineJoin) {
}

void CanvasRenderingContext2DDelegate::fillImageData(const Data & /* imageData */,
                                                     float /* imageWidth */,
                                                     float /* imageHeight */,
                                                     float /* offsetX */,
                                                     float /* offsetY */) {
}

void CanvasRenderingContext2DDelegate::rect(float /* x */,
                                            float /* y */,
                                            float /* w */,
                                            float /* h */) {
}

void CanvasRenderingContext2DDelegate::updateData() {

}

} // namespace cc