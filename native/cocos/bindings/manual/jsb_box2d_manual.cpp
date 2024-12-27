#include "jsb_box2d_manual.h"
#include "bindings/auto/jsb_box2d_auto.h"
#include "bindings/manual/jsb_global.h"

namespace {

class TempFloatArray final {
public:
    TempFloatArray() = default;
    ~TempFloatArray() = default;

    inline void setData(float *data) { _data = data; }

    inline const float &operator[](size_t index) const { return _data[index]; }
    inline float &operator[](size_t index) { return _data[index]; }

private:
    float *_data{nullptr};

    CC_DISALLOW_ASSIGN(TempFloatArray)
};

TempFloatArray tempFloatArray;

bool js_b2World_SetContactListener(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    b2World *arg1 = (b2World *) NULL ;
    JSB_b2ContactListener *arg2 = (JSB_b2ContactListener *) NULL ;
    
    if(argc != 1) {
        SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 1);
        return false;
    }
    arg1 = SE_THIS_OBJECT<b2World>(s);
    if (nullptr == arg1) return true;
    
    ok &= sevalue_to_native(args[0], &arg2, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    (arg1)->SetContactListener(arg2);
    
    
    return true;
}
SE_BIND_FUNC(js_b2World_SetContactListener)

bool js_b2World_SetDebugDraw(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    b2World *arg1 = (b2World *) NULL ;
    JSBB2Draw *arg2 = (JSBB2Draw *) NULL ;
    
    if(argc != 1) {
        SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 1);
        return false;
    }
    arg1 = SE_THIS_OBJECT<b2World>(s);
    if (nullptr == arg1) return true;
    
    ok &= sevalue_to_native(args[0], &arg2, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    (arg1)->SetDebugDraw(arg2);
    
    
    return true;
}
SE_BIND_FUNC(js_b2World_SetDebugDraw)

bool js_b2World_QueryAABB(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    b2World *arg1 = (b2World *) NULL ;
    JSBQueryCallback *arg2 = (JSBQueryCallback *) NULL ;
    b2AABB *arg3 = 0 ;
    b2AABB temp3 ;
    
    if(argc != 2) {
        SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 2);
        return false;
    }
    arg1 = SE_THIS_OBJECT<b2World>(s);
    if (nullptr == arg1) return true;
    
    ok &= sevalue_to_native(args[0], &arg2, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    
    ok &= sevalue_to_native(args[1], &temp3, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    arg3 = &temp3;
    
    ((b2World const *)arg1)->QueryAABB(arg2,(b2AABB const &)*arg3);
    
    
    return true;
}
SE_BIND_FUNC(js_b2World_QueryAABB)

bool js_b2World_RayCast(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    b2World *arg1 = (b2World *) NULL ;
    JSBRayCastCallback *arg2 = (JSBRayCastCallback *) NULL ;
    b2Vec2 *arg3 = 0 ;
    b2Vec2 *arg4 = 0 ;
    b2Vec2 temp3 ;
    b2Vec2 temp4 ;
    
    if(argc != 3) {
        SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 3);
        return false;
    }
    arg1 = SE_THIS_OBJECT<b2World>(s);
    if (nullptr == arg1) return true;
    
    ok &= sevalue_to_native(args[0], &arg2, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    
    ok &= sevalue_to_native(args[1], &temp3, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    arg3 = &temp3;
    
    
    ok &= sevalue_to_native(args[2], &temp4, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    arg4 = &temp4;
    
    ((b2World const *)arg1)->RayCast(arg2,(b2Vec2 const &)*arg3,(b2Vec2 const &)*arg4);
    
    
    return true;
}
SE_BIND_FUNC(js_b2World_RayCast)

bool js_Contact_GetWorldManifold(se::State& s)
{
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    b2Contact *arg1 = (b2Contact *) NULL ;
    
    if(argc != 1) {
        SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 1);
        return false;
    }
    arg1 = SE_THIS_OBJECT<b2Contact>(s);
    if (nullptr == arg1) return true;
    
    b2WorldManifold worldManifold;
    
    ((b2Contact const *)arg1)->GetWorldManifold(&worldManifold);
    
    se::Object *worldManifoldObj = args[0].toObject();
    
    {
        se::Value normal;
        worldManifoldObj->getProperty("normal", &normal);
        if (normal.isObject()) {
            normal.toObject()->setProperty("x", se::Value(worldManifold.normal.x));
            normal.toObject()->setProperty("y", se::Value(worldManifold.normal.y));
        }
    }
    
    {
        se::Value points;
        worldManifoldObj->getProperty("points", &points);
        if (points.isObject() && points.toObject()->isArray()) {
            auto* pointsObj = points.toObject();
            for (uint32_t i = 0; i < b2_maxManifoldPoints; ++i) {
                se::Value e;
                if (pointsObj->getArrayElement(i, &e) && e.isObject()) {
                    e.toObject()->setProperty("x", se::Value(worldManifold.points[i].x));
                    e.toObject()->setProperty("y", se::Value(worldManifold.points[i].y));
                }
            }
        }
    }
    
    {
        se::Value separations;
        worldManifoldObj->getProperty("separations", &separations);
        if (separations.isObject() && separations.toObject()->isArray()) {
            auto* separationsObj = separations.toObject();
            for (uint32_t i = 0; i < b2_maxManifoldPoints; ++i) {
                separationsObj->setArrayElement(i, se::Value(worldManifold.separations[i]));
            }
        }
    }
    
    return true;
}
SE_BIND_FUNC(js_Contact_GetWorldManifold) 

bool js_b2PolygonShape_Set(se::State& s) {
    CC_UNUSED bool ok = true;
    const auto& args = s.args();
    size_t argc = args.size();
    if (argc != 2) {
        return false;
    }
    
    b2PolygonShape *arg1 = SE_THIS_OBJECT<b2PolygonShape>(s);
    if (nullptr == arg1) return true;
    
    int32 count = 0;
    ok = sevalue_to_native(args[1], &count, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    if (count <= 0) {
        return true;
    }

    ccstd::vector<b2Vec2> vertex;
    vertex.resize(count);
    ok = sevalue_to_native(args[0], &vertex, s.thisObject());
    SE_PRECONDITION2(ok, false, "Error processing arguments");
    arg1->Set(vertex.data(), count);
    return true;
}
SE_BIND_FUNC(js_b2PolygonShape_Set)

bool js_b2_setTempFloatArray(se::State &s) // NOLINT(readability-identifier-naming)
{
    const auto &args = s.args();
    size_t argc = args.size();
    CC_UNUSED bool ok = true;
    if (argc == 1) {
        uint8_t *buffer = nullptr;
        args[0].toObject()->getArrayBufferData(&buffer, nullptr);
        tempFloatArray.setData(reinterpret_cast<float *>(buffer));
        return true;
    }
    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", (int)argc, 1);
    return false;
}
SE_BIND_FUNC(js_b2_setTempFloatArray)

bool js_Body_GetTransformJSB(void *s) // NOLINT(readability-identifier-naming)
{
    auto *cobj = reinterpret_cast<b2Body *>(s);
    const auto &pos = cobj->GetPosition();
    float angle = cobj->GetAngle();
    
    tempFloatArray[0] = pos.x;
    tempFloatArray[1] = pos.y;
    tempFloatArray[2] = angle;
    return true;
}
SE_BIND_FUNC_FAST(js_Body_GetTransformJSB)

bool js_Body_SetTransformJSB(void *s) // NOLINT(readability-identifier-naming)
{
    auto *cobj = reinterpret_cast<b2Body *>(s);
    cobj->SetTransform(b2Vec2{tempFloatArray[0], tempFloatArray[1]}, tempFloatArray[2]);
    return true;
}
SE_BIND_FUNC_FAST(js_Body_SetTransformJSB)

bool js_Body_SetPositionJSB(void *s) // NOLINT(readability-identifier-naming)
{
    auto *cobj = reinterpret_cast<b2Body *>(s);
    cobj->SetTransform(b2Vec2{tempFloatArray[0], tempFloatArray[1]}, cobj->GetAngle());
    return true;
}
SE_BIND_FUNC_FAST(js_Body_SetPositionJSB)

bool js_Body_SetAngleJSB(void *s) // NOLINT(readability-identifier-naming)
{
    auto *cobj = reinterpret_cast<b2Body *>(s);
    cobj->SetTransform(cobj->GetPosition(), tempFloatArray[0]);
    return true;
}
SE_BIND_FUNC_FAST(js_Body_SetAngleJSB)

} // namespace {

bool register_all_box2d_manual(se::Object *obj) { // NOLINT
    // Get the ns
    se::Value nsVal;
    if (!obj->getProperty("b2", &nsVal)) {
        se::HandleObject jsobj(se::Object::createPlainObject());
        nsVal.setObject(jsobj);
        obj->setProperty("b2", nsVal);
    }
    
    se::Object *nsObj = nsVal.toObject();
    
    __jsb_b2PolygonShape_proto->defineFunction("Set", _SE(js_b2PolygonShape_Set));
    __jsb_b2World_proto->defineFunction("SetDebugDraw", _SE(js_b2World_SetDebugDraw));
    __jsb_b2World_proto->defineFunction("SetContactListener", _SE(js_b2World_SetContactListener));
    __jsb_b2World_proto->defineFunction("QueryAABB", _SE(js_b2World_QueryAABB));
    __jsb_b2World_proto->defineFunction("RayCast", _SE(js_b2World_RayCast));
    
    __jsb_b2Contact_proto->defineFunction("GetWorldManifold", _SE(js_Contact_GetWorldManifold));
    
    nsVal.toObject()->defineFunction("_setTempFloatArray", _SE(js_b2_setTempFloatArray));
    
    __jsb_b2Body_proto->defineFunction("_GetTransformJSB", _SE(js_Body_GetTransformJSB));

    __jsb_b2Body_proto->defineFunction("_SetTransformJSB", _SE(js_Body_SetTransformJSB));
    __jsb_b2Body_proto->defineFunction("_SetPositionJSB", _SE(js_Body_SetPositionJSB));
    __jsb_b2Body_proto->defineFunction("_SetAngleJSB", _SE(js_Body_SetAngleJSB));
    
    nsObj->setProperty("maxFloat", se::Value(b2_maxFloat));
    nsObj->setProperty("epsilon", se::Value(b2_epsilon));
    nsObj->setProperty("pi", se::Value(b2_pi));
    
    nsObj->setProperty("maxManifoldPoints", se::Value(b2_maxManifoldPoints));
    nsObj->setProperty("maxPolygonVertices", se::Value(b2_maxPolygonVertices));
    nsObj->setProperty("aabbExtension", se::Value(b2_aabbExtension));
    nsObj->setProperty("aabbMultiplier", se::Value(b2_aabbMultiplier));
    nsObj->setProperty("linearSlop", se::Value(b2_linearSlop));
    nsObj->setProperty("angularSlop", se::Value(b2_angularSlop));
    nsObj->setProperty("polygonRadius", se::Value(b2_polygonRadius));
    nsObj->setProperty("maxSubSteps", se::Value(b2_maxSubSteps));
    nsObj->setProperty("maxTOIContacts", se::Value(b2_maxTOIContacts));
    nsObj->setProperty("velocityThreshold", se::Value(b2_velocityThreshold));
    nsObj->setProperty("maxLinearCorrection", se::Value(b2_maxLinearCorrection));
    nsObj->setProperty("maxAngularCorrection", se::Value(b2_maxAngularCorrection));
    nsObj->setProperty("maxTranslation", se::Value(b2_maxTranslation));
    nsObj->setProperty("maxTranslationSquared", se::Value(b2_maxTranslationSquared));
    nsObj->setProperty("maxRotation", se::Value(b2_maxRotation));
    nsObj->setProperty("maxRotationSquared", se::Value(b2_maxRotationSquared));
    nsObj->setProperty("baumgarte", se::Value(b2_baumgarte));
    nsObj->setProperty("toiBaumgarte", se::Value(b2_toiBaumgarte));
    nsObj->setProperty("timeToSleep", se::Value(b2_timeToSleep));
    nsObj->setProperty("linearSleepTolerance", se::Value(b2_linearSleepTolerance));
    nsObj->setProperty("angularSleepTolerance", se::Value(b2_angularSleepTolerance));
    
    return true;
}
