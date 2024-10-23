#pragma once

#include <stdint.h>

struct Vec3 {
    float x;
    float y;
    float z;
};

struct Tex2F {
    float u;
    float v;
};

struct Color4B {
    Color4B(uint8_t r, uint8_t g, uint8_t b, uint8_t a) : r(r), g(g), b(b), a(a) {}
    Color4B() {}
    Color4B &operator=(const Color4B &right) = default;

    uint8_t r = 0;
    uint8_t g = 0;
    uint8_t b = 0;
    uint8_t a = 0;

    static const Color4B WHITE;
};

struct Color4F {
    Color4F(float r, float g, float b, float a) : r(r), g(g), b(b), a(a) {}
    Color4F() {}
    Color4F &operator=(const Color4F &right) = default;

    float r = 0;
    float g = 0;
    float b = 0;
    float a = 0;
};

struct V3F_T2F_C4B {
    Vec3 vertex;
    // tex coords (2F)
    Tex2F texCoord;

    Color4B color;
};

struct V3F_T2F_C4B_C4B { // NOLINT
    // vertices (3F)
    Vec3 vertex;

    // tex coords (2F)
    Tex2F texCoord;

    // colors (4F)
    Color4B color;

    // colors (4F)
    Color4B color2;
};

struct Triangles {
    /**Vertex data pointer.*/
    V3F_T2F_C4B *verts = nullptr;
    /**Index data pointer.*/
    unsigned short *indices = nullptr; // NOLINT
    /**The number of vertices.*/
    int vertCount = 0;
    /**The number of indices.*/
    int indexCount = 0;
};
