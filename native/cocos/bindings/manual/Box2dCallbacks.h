#pragma once

#include "box2d/box2d.h"
#include "bindings/jswrapper/SeApi.h"

class JSBQueryCallback : public b2QueryCallback {
public:
    JSBQueryCallback();
    ~JSBQueryCallback();
    
    void initWithThis(se::Object *thisObject);
    
    bool ReportFixture(b2Fixture* fixture) override;
    
private:
    se::Object *_cbReportFixture{};
    se::Object *_thisObject{};
    se::ValueArray _args;
};

class JSBRayCastCallback  : public b2RayCastCallback {
public:
    JSBRayCastCallback();
    ~JSBRayCastCallback();
    
    void initWithThis(se::Object *thisObject);
    
    float ReportFixture(b2Fixture* fixture, const b2Vec2& point, const b2Vec2& normal, float fraction) override;
    
private:
    se::Object *_cbReportFixture{};
    se::Object *_thisObject{};
    se::ValueArray _args;
};

class JSBB2Draw : public b2Draw {
public:
    JSBB2Draw();
    ~JSBB2Draw();
    
    void initWithThis(se::Object *thisObject);
    
private:
    void DrawPolygonWithCallback(se::Object *cbObj, const b2Vec2* vertices, int32 vertexCount, const b2Color& color);
public:
    /// Draw a closed polygon provided in CCW order.
    void DrawPolygon(const b2Vec2* vertices, int32 vertexCount, const b2Color& color) override;

    /// Draw a solid closed polygon provided in CCW order.
    void DrawSolidPolygon(const b2Vec2* vertices, int32 vertexCount, const b2Color& color) override;

    
    /// Draw a circle.
    void DrawCircle(const b2Vec2& center, float radius, const b2Color& color) override;
    
    /// Draw a solid circle.
    void DrawSolidCircle(const b2Vec2& center, float radius, const b2Vec2& axis, const b2Color& color) override;
    
    /// Draw a line segment.
    void DrawSegment(const b2Vec2& p1, const b2Vec2& p2, const b2Color& color) override;

    /// Draw a transform. Choose your own length scale.
    /// @param xf a transform.
    void DrawTransform(const b2Transform& xf) override;

    /// Draw a point.
    void DrawPoint(const b2Vec2& p, float size, const b2Color& color) override;
    
   
    /// Set the drawing flags.
    inline void SetFlags(uint32 flags) { b2Draw::SetFlags(flags); }

    /// Get the drawing flags.
    inline uint32 GetFlags() const  { return b2Draw::GetFlags(); };
    
    /// Append flags to the current flags.
    inline void AppendFlags(uint32 flags) { b2Draw::AppendFlags(flags); }

    /// Clear flags from the current flags.
    inline void ClearFlags(uint32 flags) { b2Draw::ClearFlags(flags); }
    
private:
    se::Object *_cbDrawPolygon{};
    se::Object *_cbDrawSolidPolygon{};
    se::Object *_cbDrawCircle{};
    se::Object *_cbDrawSolidCircle{};
    se::Object *_cbDrawSegment{};
    se::Object *_cbDrawTransform{};
    se::Object *_cbDrawPoint{};
    
    se::Object *_thisObject{};
    se::ValueArray _args1;
    se::ValueArray _args3;
    se::ValueArray _args4;
};

// b2ContactListener
class JSB_b2ContactListener : public b2ContactListener {
public:
    JSB_b2ContactListener();
    ~JSB_b2ContactListener();
    
    void initWithThis(se::Object *thisObject);
    void BeginContact(b2Contact* contact) override;
    void EndContact(b2Contact* contact) override;
    void PreSolve(b2Contact* contact, const b2Manifold* oldManifold) override;
    void PostSolve(b2Contact* contact, const b2ContactImpulse* impulse) override;

private:
    se::Object *_thisObject{};
    se::Object *_cbBeginContact{};
    se::Object *_cbEndContact{};
    se::Object *_cbPreSolve{};
    se::Object *_cbPostSolve{};
    se::ValueArray _args1;
    se::ValueArray _args2;
};
