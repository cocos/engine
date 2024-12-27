// Define module
// target_namespace means the name exported to JS, could be same as which in other modules
// box2d at the last means the suffix of binding function name, different modules should use unique name
// Note: doesn't support number prefix
%module(target_namespace="b2") box2d

// Disable some swig warnings, find warning number reference here ( https://www.swig.org/Doc4.1/Warnings.html )
#pragma SWIG nowarn=503,302,401,317,402

// Insert code at the beginning of generated header file (.h)
%insert(header_file) %{
#pragma once
#include "bindings/jswrapper/SeApi.h"
#include "bindings/manual/jsb_conversions.h"
#include "bindings/manual/Box2dCallbacks.h"
%}

// Insert code at the beginning of generated source file (.cpp)
%{
#include "bindings/auto/jsb_box2d_auto.h"

#define SWIGINTERN static
%}

// ----- Ignore Section ------
// Brief: Classes, methods or attributes need to be ignored
//
// Usage:
//
//  %ignore your_namespace::your_class_name;
//  %ignore your_namespace::your_class_name::your_method_name;
//  %ignore your_namespace::your_class_name::your_attribute_name;
//
// Note: 
//  1. 'Ignore Section' should be placed before attribute definition and %import/%include
//  2. namespace is needed
//

%ignore b2ContactRegister;
%ignore b2BlockAllocator;
%ignore b2GetPointStates;
%ignore b2JointUserData;

// Callbacks need to be ignored.
%ignore b2ContactListener;
%ignore b2QueryCallback;
%ignore b2RayCastCallback;
%ignore b2Draw;
//

%ignore b2Manifold::points;
%ignore b2WorldManifold::points;
%ignore b2WorldManifold::separations;
%ignore b2Hull::points;

%ignore b2PolygonShape::m_vertices;

%ignore b2PolygonShape::m_normals;

%ignore b2ContactImpulse::normalImpulses;
%ignore b2ContactImpulse::tangentImpulses;

%ignore b2ChainShape::CreateLoop;
%ignore b2ChainShape::CreateChain;
%ignore b2DistanceProxy::Set;
%ignore b2PolygonShape::Set;
%ignore b2Joint::Draw;

%ignore b2World::SetContactListener;
%ignore b2World::SetDebugDraw;
%ignore b2World::QueryAABB;
%ignore b2World::RayCast;

%ignore b2Contact::GetWorldManifold;

%rename("$ignore", regextarget=1, fullname=1) ".*Clone$";
%rename("$ignore", regextarget=1, fullname=1) "b2.*Def::userData$";
// %rename("$ignore", regextarget=1, fullname=1) "b2.*Def::userData$";


// ----- Rename Section ------
// Brief: Classes, methods or attributes needs to be renamed
//
// Usage:
//
//  %rename(rename_to_name) your_namespace::original_class_name;
//  %rename(rename_to_name) your_namespace::original_class_name::method_name;
//  %rename(rename_to_name) your_namespace::original_class_name::attribute_name;
// 
// Note:
//  1. 'Rename Section' should be placed before attribute definition and %import/%include
//  2. namespace is needed

%rename(Vec2) b2Vec2;
%rename(Vec3) b2Vec3;
%rename(Mat22) b2Mat22;
%rename(Mat33) b2Mat33;
%rename(Rot) b2Rot;
%rename(Transform) b2Transform;
%rename(Sweep) b2Sweep;
%rename(MassData) b2MassData;
%rename(Shape) b2Shape;
%rename(Color) b2Color;
// %rename(Draw) b2Draw;
%rename(ContactFeature) b2ContactFeature;
%rename(ContactID) b2ContactID;
%rename(ManifoldPoint) b2ManifoldPoint;
%rename(Manifold) b2Manifold;
%rename(WorldManifold) b2WorldManifold;
%rename(ClipVertex) b2ClipVertex;
%rename(RayCastInput) b2RayCastInput;
%rename(RayCastOutput) b2RayCastOutput;
%rename(AABB) b2AABB;
%rename(Jacobian) b2Jacobian;
%rename(JointEdge) b2JointEdge;
%rename(JointDef) b2JointDef;
%rename(Joint) b2Joint;
%rename(ChainShape) b2ChainShape;
%rename(CircleShape) b2CircleShape;
%rename(EdgeShape) b2EdgeShape;
%rename(PolygonShape) b2PolygonShape;
%rename(Pair) b2Pair;
%rename(BroadPhase) b2BroadPhase;
%rename(TreeNode) b2TreeNode;
%rename(DynamicTree) b2DynamicTree;
%rename(BodyDef) b2BodyDef;
%rename(Body) b2Body;
%rename(ContactEdge) b2ContactEdge;
%rename(Contact) b2Contact;
%rename(Filter) b2Filter;
%rename(FixtureDef) b2FixtureDef;
%rename(FixtureProxy) b2FixtureProxy;
%rename(Fixture) b2Fixture;
%rename(Profile) b2Profile;
%rename(TimeStep) b2TimeStep;
%rename(Position) b2Position;
%rename(Velocity) b2Velocity;
%rename(SolverData) b2SolverData;
%rename(World) b2World;
%rename(DestructionListener) b2DestructionListener;
%rename(ContactFilter) b2ContactFilter;
%rename(ContactImpulse) b2ContactImpulse;
// %rename(ContactListener) b2ContactListener;
// %rename(QueryCallback) b2QueryCallback;
// %rename(RayCastCallback) b2RayCastCallback;
%rename(RopeJointDef) b2RopeJointDef;
%rename(RopeJoint) b2RopeJoint;
%rename(FrictionJointDef) b2FrictionJointDef;
%rename(FrictionJoint) b2FrictionJoint;
%rename(GearJointDef) b2GearJointDef;
%rename(GearJoint) b2GearJoint;
%rename(DistanceJointDef) b2DistanceJointDef;
%rename(DistanceJoint) b2DistanceJoint;
%rename(MotorJointDef) b2MotorJointDef;
%rename(MotorJoint) b2MotorJoint;
%rename(MouseJointDef) b2MouseJointDef;
%rename(MouseJoint) b2MouseJoint;
%rename(PrismaticJointDef) b2PrismaticJointDef;
%rename(PrismaticJoint) b2PrismaticJoint;
%rename(PulleyJointDef) b2PulleyJointDef;
%rename(PulleyJoint) b2PulleyJoint;
%rename(RevoluteJointDef) b2RevoluteJointDef;
%rename(RevoluteJoint) b2RevoluteJoint;
%rename(WeldJointDef) b2WeldJointDef;
%rename(WeldJoint) b2WeldJoint;
%rename(WheelJointDef) b2WheelJointDef;
%rename(WheelJoint) b2WheelJoint;

%rename(DrawDebugData) b2World::DebugDraw;

%rename(QueryCallback) JSBQueryCallback;
%rename(RayCastCallback) JSBRayCastCallback;
%rename(Draw) JSBB2Draw;
%rename(ContactListener) JSB_b2ContactListener;

// ----- Module Macro Section ------
// Brief: Generated code should be wrapped inside a macro
// Usage:
//  1. Configure for class
//    %module_macro(CC_USE_GEOMETRY_RENDERER) cc::pipeline::GeometryRenderer;
//  2. Configure for member function or attribute
//    %module_macro(CC_USE_GEOMETRY_RENDERER) cc::pipeline::RenderPipeline::geometryRenderer;
// Note: Should be placed before 'Attribute Section'

// Write your code bellow


// ----- Attribute Section ------
// Brief: Define attributes ( JS properties with getter and setter )
// Usage:
//  1. Define an attribute without setter
//    %attribute(your_namespace::your_class_name, cpp_member_variable_type, js_property_name, cpp_getter_name)
//  2. Define an attribute with getter and setter
//    %attribute(your_namespace::your_class_name, cpp_member_variable_type, js_property_name, cpp_getter_name, cpp_setter_name)
//  3. Define an attribute without getter
//    %attribute_writeonly(your_namespace::your_class_name, cpp_member_variable_type, js_property_name, cpp_setter_name)
//
// Note:
//  1. Don't need to add 'const' prefix for cpp_member_variable_type 
//  2. The return type of getter should keep the same as the type of setter's parameter
//  3. If using reference, add '&' suffix for cpp_member_variable_type to avoid generated code using value assignment
//  4. 'Attribute Section' should be placed before 'Import Section' and 'Include Section'
//



// ----- Import Section ------
// Brief: Import header files which are depended by 'Include Section'
// Note: 
//   %import "your_header_file.h" will not generate code for that header file
//


// ----- Include Section ------
// Brief: Include header files in which classes and methods will be bound

%include "../external/sources/box2d/include/box2d/b2_math.h"
%include "../external/sources/box2d/include/box2d/b2_shape.h"
%include "../external/sources/box2d/include/box2d/b2_draw.h"
%include "../external/sources/box2d/include/box2d/b2_collision.h"
%include "../external/sources/box2d/include/box2d/b2_joint.h"

%include "../external/sources/box2d/include/box2d/b2_chain_shape.h"
%include "../external/sources/box2d/include/box2d/b2_circle_shape.h"
%include "../external/sources/box2d/include/box2d/b2_edge_shape.h"
%include "../external/sources/box2d/include/box2d/b2_polygon_shape.h"

%include "../external/sources/box2d/include/box2d/b2_broad_phase.h"
%include "../external/sources/box2d/include/box2d/b2_dynamic_tree.h"

%include "../external/sources/box2d/include/box2d/b2_body.h"
%include "../external/sources/box2d/include/box2d/b2_contact.h"
%include "../external/sources/box2d/include/box2d/b2_fixture.h"
%include "../external/sources/box2d/include/box2d/b2_time_step.h"
%include "../external/sources/box2d/include/box2d/b2_world.h"
%include "../external/sources/box2d/include/box2d/b2_world_callbacks.h"

%include "../external/sources/box2d/include/box2d/b2_rope_joint.h"
%include "../external/sources/box2d/include/box2d/b2_friction_joint.h"
%include "../external/sources/box2d/include/box2d/b2_distance_joint.h"
%include "../external/sources/box2d/include/box2d/b2_gear_joint.h"
%include "../external/sources/box2d/include/box2d/b2_motor_joint.h"
%include "../external/sources/box2d/include/box2d/b2_mouse_joint.h"
%include "../external/sources/box2d/include/box2d/b2_prismatic_joint.h"
%include "../external/sources/box2d/include/box2d/b2_pulley_joint.h"
%include "../external/sources/box2d/include/box2d/b2_revolute_joint.h"
%include "../external/sources/box2d/include/box2d/b2_weld_joint.h"
%include "../external/sources/box2d/include/box2d/b2_wheel_joint.h"

%include "bindings/manual/Box2dCallbacks.h"
