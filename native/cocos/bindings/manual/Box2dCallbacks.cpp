#include "Box2dCallbacks.h"
#include "bindings/auto/jsb_box2d_auto.h"
#include "bindings/manual/jsb_global.h"

#define GET_THIS(name) \
do {\
    if (_thisObject != nullptr) { \
        _thisObject->decRef(); \
    } \
    _thisObject = thisObject; \
    _thisObject->incRef(); \
} while(0)

#define GET_JS_PROPERTY(name) \
do {\
    if (_cb##name != nullptr) { \
        _cb##name->decRef(); \
        _cb##name = nullptr; \
    } \
    se::Value callbackVal; \
    bool ok = thisObject->getProperty(#name, &callbackVal); \
    CC_ASSERT(ok && callbackVal.isObject() && callbackVal.toObject()->isFunction()); \
    se::Object* callbackObj = callbackVal.toObject(); \
    callbackObj->incRef(); \
    _cb##name = callbackObj; \
} while(0)

#define SAFE_RELEASE_CALLBACK(name) \
do {\
    if (_cb##name != nullptr) { \
        _cb##name->decRef(); \
        _cb##name = nullptr; \
    } \
} while(0)

#define SAFE_RELEASE_THIS() \
do { \
    if (_thisObject != nullptr) { \
        _thisObject->decRef(); \
        _thisObject = nullptr; \
    } \
} while(0)

JSBQueryCallback::JSBQueryCallback() {
    _args.resize(1);
}

JSBQueryCallback::~JSBQueryCallback() {
    SAFE_RELEASE_THIS();
    SAFE_RELEASE_CALLBACK(ReportFixture);
}

void JSBQueryCallback::initWithThis(se::Object *thisObject) {
    GET_THIS();
    GET_JS_PROPERTY(ReportFixture);
}
       
bool JSBQueryCallback::ReportFixture(b2Fixture* fixture) {
    se::AutoHandleScope hs;
    if (_cbReportFixture == nullptr) {
        return false;
    }

    bool ok = nativevalue_to_se(fixture, _args[0]);
    SE_PRECONDITION2(ok, false, "Error processing arguments");

    se::Value rval;
    ok = _cbReportFixture->call(_args, _thisObject, &rval);
    if (rval.isBoolean()) {
        return rval.toBoolean();
    }
    
    return false;
}



JSBRayCastCallback::JSBRayCastCallback() {
    _args.resize(4);
}

void JSBRayCastCallback::initWithThis(se::Object *thisObject) {
    GET_THIS();
    GET_JS_PROPERTY(ReportFixture);
}

JSBRayCastCallback::~JSBRayCastCallback() {
    SAFE_RELEASE_THIS();
    SAFE_RELEASE_CALLBACK(ReportFixture);
}
    
float JSBRayCastCallback::ReportFixture(b2Fixture* fixture, const b2Vec2& point, const b2Vec2& normal, float fraction) {
    se::AutoHandleScope hs;
    
    if (_cbReportFixture == nullptr) {
        return 0.F;
    }
    
    bool ok = nativevalue_to_se(fixture, _args[0]);
    SE_PRECONDITION2(ok, 0.F, "Error processing arguments");
    ok = nativevalue_to_se(point, _args[1]);
    SE_PRECONDITION2(ok, 0.F, "Error processing arguments");
    ok = nativevalue_to_se(normal, _args[2]);
    SE_PRECONDITION2(ok, 0.F, "Error processing arguments");
    ok = nativevalue_to_se(fraction, _args[3]);
    SE_PRECONDITION2(ok, 0.F, "Error processing arguments");

    se::Value rval;
    ok = _cbReportFixture->call(_args, _thisObject, &rval);
    if (rval.isNumber()) {
        return rval.toFloat();
    }
    
    return 0.F;
}

JSBB2Draw::JSBB2Draw() {
    _args1.resize(1);
    _args3.resize(3);
    _args4.resize(4);
}

JSBB2Draw::~JSBB2Draw() {
    SAFE_RELEASE_THIS();
    SAFE_RELEASE_CALLBACK(DrawPolygon);
    SAFE_RELEASE_CALLBACK(DrawSolidPolygon);
    SAFE_RELEASE_CALLBACK(DrawCircle);
    SAFE_RELEASE_CALLBACK(DrawSolidCircle);
    SAFE_RELEASE_CALLBACK(DrawSegment);
    SAFE_RELEASE_CALLBACK(DrawTransform);
    SAFE_RELEASE_CALLBACK(DrawPoint);
}

void JSBB2Draw::initWithThis(se::Object *thisObject) {
    GET_THIS();
    GET_JS_PROPERTY(DrawPolygon);
    GET_JS_PROPERTY(DrawSolidPolygon);
    GET_JS_PROPERTY(DrawCircle);
    GET_JS_PROPERTY(DrawSolidCircle);
    GET_JS_PROPERTY(DrawSegment);
    GET_JS_PROPERTY(DrawTransform);
    GET_JS_PROPERTY(DrawPoint);
}

void JSBB2Draw::DrawPolygonWithCallback(se::Object *cbObj, const b2Vec2* vertices, int32 vertexCount, const b2Color& color) {
    if (cbObj == nullptr || vertexCount <= 0 || vertices == nullptr) {
        return;
    }

    se::AutoHandleScope hs;
    ccstd::vector<b2Vec2> verticeArray;
    verticeArray.resize(vertexCount);
    memcpy(verticeArray.data(), vertices, sizeof(b2Vec2) * vertexCount);
    
    bool ok = nativevalue_to_se(verticeArray, _args3[0]);
    SE_PRECONDITION2_VOID(ok, "Error processing arguments");
    ok = nativevalue_to_se(vertexCount, _args3[1]);
    SE_PRECONDITION2_VOID(ok, "Error processing arguments");
    ok = nativevalue_to_se(color, _args3[2]);
    SE_PRECONDITION2_VOID(ok, "Error processing arguments");

    cbObj->call(_args3, _thisObject);
}

/// Draw a closed polygon provided in CCW order.
void JSBB2Draw::DrawPolygon(const b2Vec2* vertices, int32 vertexCount, const b2Color& color) {
    DrawPolygonWithCallback(_cbDrawPolygon, vertices, vertexCount, color);
}

/// Draw a solid closed polygon provided in CCW order.
void JSBB2Draw::DrawSolidPolygon(const b2Vec2* vertices, int32 vertexCount, const b2Color& color) {
    DrawPolygonWithCallback(_cbDrawSolidPolygon, vertices, vertexCount, color);
}


/// Draw a circle.
void JSBB2Draw::DrawCircle(const b2Vec2& center, float radius, const b2Color& color) {
    if (_cbDrawCircle == nullptr) {
        return;
    }

    se::AutoHandleScope hs;
    
    bool ok = nativevalue_to_se(center, _args3[0]);
    SE_PRECONDITION2_VOID(ok, "Error processing arguments");
    ok = nativevalue_to_se(radius, _args3[1]);
    SE_PRECONDITION2_VOID(ok, "Error processing arguments");
    ok = nativevalue_to_se(color, _args3[2]);
    SE_PRECONDITION2_VOID(ok, "Error processing arguments");

    _cbDrawCircle->call(_args3, _thisObject);
}

/// Draw a solid circle.
void JSBB2Draw::DrawSolidCircle(const b2Vec2& center, float radius, const b2Vec2& axis, const b2Color& color) {
    if (_cbDrawSolidCircle == nullptr) {
        return;
    }

    se::AutoHandleScope hs;

    bool ok = nativevalue_to_se(center, _args4[0]);
    SE_PRECONDITION2_VOID(ok, "Error processing arguments");
    ok = nativevalue_to_se(radius, _args4[1]);
    SE_PRECONDITION2_VOID(ok, "Error processing arguments");
    ok = nativevalue_to_se(axis, _args4[2]);
    SE_PRECONDITION2_VOID(ok, "Error processing arguments");
    ok = nativevalue_to_se(color, _args4[3]);
    SE_PRECONDITION2_VOID(ok, "Error processing arguments");

    _cbDrawSolidCircle->call(_args4, _thisObject);
}

/// Draw a line segment.
void JSBB2Draw::DrawSegment(const b2Vec2& p1, const b2Vec2& p2, const b2Color& color) {
    if (_cbDrawSegment == nullptr) {
        return;
    }

    se::AutoHandleScope hs;

    bool ok = nativevalue_to_se(p1, _args3[0]);
    SE_PRECONDITION2_VOID(ok, "Error processing arguments");
    ok = nativevalue_to_se(p2, _args3[1]);
    SE_PRECONDITION2_VOID(ok, "Error processing arguments");
    ok = nativevalue_to_se(color, _args3[2]);
    SE_PRECONDITION2_VOID(ok, "Error processing arguments");

    _cbDrawSegment->call(_args3, _thisObject);
}

/// Draw a transform. Choose your own length scale.
/// @param xf a transform.
void JSBB2Draw::DrawTransform(const b2Transform& xf) {
    if (_cbDrawTransform== nullptr) {
        return;
    }

    se::AutoHandleScope hs;

    bool ok = nativevalue_to_se(xf, _args1[0]);
    SE_PRECONDITION2_VOID(ok, "Error processing arguments");

    _cbDrawTransform->call(_args1, _thisObject);
}

/// Draw a point.
void JSBB2Draw::DrawPoint(const b2Vec2& p, float size, const b2Color& color) {
    if (_cbDrawPoint == nullptr) {
        return;
    }

    se::AutoHandleScope hs;
    
    bool ok = nativevalue_to_se(p, _args3[0]);
    SE_PRECONDITION2_VOID(ok, "Error processing arguments");
    ok = nativevalue_to_se(size, _args3[1]);
    SE_PRECONDITION2_VOID(ok, "Error processing arguments");
    ok = nativevalue_to_se(color, _args3[2]);
    SE_PRECONDITION2_VOID(ok, "Error processing arguments");

    _cbDrawPoint->call(_args3, _thisObject);
}
    


// b2ContactListener

JSB_b2ContactListener::JSB_b2ContactListener() {
    _args1.resize(1);
    _args2.resize(2);
}
JSB_b2ContactListener::~JSB_b2ContactListener() {
    SAFE_RELEASE_THIS();
    SAFE_RELEASE_CALLBACK(BeginContact);
    SAFE_RELEASE_CALLBACK(EndContact);
    SAFE_RELEASE_CALLBACK(PreSolve);
    SAFE_RELEASE_CALLBACK(PostSolve);
}

void JSB_b2ContactListener::initWithThis(se::Object *thisObject) {
    GET_THIS();
    GET_JS_PROPERTY(BeginContact);
    GET_JS_PROPERTY(EndContact);
    GET_JS_PROPERTY(PreSolve);
    GET_JS_PROPERTY(PostSolve);
}

void JSB_b2ContactListener::BeginContact(b2Contact* contact) {
    se::AutoHandleScope hs;
    if (_cbBeginContact == nullptr) {
        return;
    }

    bool ok = nativevalue_to_se(contact, _args1[0]);
    SE_PRECONDITION2_VOID(ok, "Error processing arguments");
    ok = _cbBeginContact->call(_args1, _thisObject);
}

void JSB_b2ContactListener::EndContact(b2Contact* contact) {
    se::AutoHandleScope hs;
    if (_cbEndContact == nullptr) {
        return;
    }

    bool ok = nativevalue_to_se(contact, _args1[0]);
    SE_PRECONDITION2_VOID(ok, "Error processing arguments");
    ok = _cbEndContact->call(_args1, _thisObject);
}

void JSB_b2ContactListener::PreSolve(b2Contact* contact, const b2Manifold* oldManifold) {
    se::AutoHandleScope hs;
    if (_cbPreSolve == nullptr) {
        return;
    }

    bool ok = nativevalue_to_se(contact, _args2[0]);
    SE_PRECONDITION2_VOID(ok, "Error processing arguments");
    
    static b2Manifold gManifold;
    gManifold = *oldManifold;
    ok = nativevalue_to_se(gManifold, _args2[1]);
    SE_PRECONDITION2_VOID(ok, "Error processing arguments");
    
    ok = _cbPreSolve->call(_args2, _thisObject);
}

void JSB_b2ContactListener::PostSolve(b2Contact* contact, const b2ContactImpulse* impulse) {
    se::AutoHandleScope hs;
    if (_cbPostSolve == nullptr) {
        return;
    }

    bool ok = nativevalue_to_se(contact, _args2[0]);
    SE_PRECONDITION2_VOID(ok, "Error processing arguments");
    
    static b2ContactImpulse gImpulse;
    gImpulse = *impulse;
    ok = nativevalue_to_se(gImpulse, _args2[1]);
    SE_PRECONDITION2_VOID(ok, "Error processing arguments");
    
    ok = _cbPostSolve->call(_args2, _thisObject);
}
