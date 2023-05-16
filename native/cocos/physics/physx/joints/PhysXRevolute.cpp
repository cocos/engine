/****************************************************************************
 Copyright (c) 2020-2023 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights to
 use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 of the Software, and to permit persons to whom the Software is furnished to do so,
 subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
****************************************************************************/

#include "physics/physx/joints/PhysXRevolute.h"
#include "math/Quaternion.h"
#include "physics/physx/PhysXSharedBody.h"
#include "physics/physx/PhysXUtils.h"

namespace cc {
namespace physics {

void PhysXRevolute::onComponentSet() {
    _mJoint = PxRevoluteJointCreate(PxGetPhysics(), &getTempRigidActor(), physx::PxTransform{physx::PxIdentity}, nullptr, physx::PxTransform{physx::PxIdentity});
}

void PhysXRevolute::setPivotA(float x, float y, float z) {
    _mPivotA = physx::PxVec3{x, y, z};
    updatePose();
}

void PhysXRevolute::setPivotB(float x, float y, float z) {
    _mPivotB = physx::PxVec3{x, y, z};
    updatePose();
}

void PhysXRevolute::setAxis(float x, float y, float z) {
    _mAxis = physx::PxVec3{x, y, z};
    updatePose();
}

void PhysXRevolute::updateScale0() {
    updatePose();
}

void PhysXRevolute::updateScale1() {
    updatePose();
}

void PhysXRevolute::updatePose() {
    physx::PxTransform pose0{physx::PxIdentity};
    physx::PxTransform pose1{physx::PxIdentity};

    auto xAxis = _mAxis.getNormalized();
    auto yAxis = physx::PxVec3(0, 1, 0);
    auto zAxis = _mAxis.cross(yAxis);
    if (zAxis.magnitude() < 0.0001) {
        yAxis = physx::PxVec3(0, 0, 1).cross(xAxis);
        zAxis = xAxis.cross(yAxis);
    } else {
        yAxis = zAxis.cross(xAxis);
    }

    yAxis = yAxis.getNormalized();
    zAxis = zAxis.getNormalized();

    Mat4 transform(
        xAxis.x, xAxis.y, xAxis.z, 0,
        yAxis.x, yAxis.y, yAxis.z, 0,
        zAxis.x, zAxis.y, zAxis.z, 0,
        0.F, 0.F, 0.F, 1.F);

    auto quat = Quaternion();
    transform.getRotation(&quat);

    // pos and rot in with respect to bodyA
    auto *node0 = _mSharedBody->getNode();
    node0->updateWorldTransform();
    pose0.p = _mPivotA * node0->getWorldScale();
    pose0.q = physx::PxQuat(quat.x, quat.y, quat.z, quat.w);
    _mJoint->setLocalPose(physx::PxJointActorIndex::eACTOR0, pose0);

    if (_mConnectedBody) {
        auto *node1 = _mConnectedBody->getNode();
        node1->updateWorldTransform();
        pose1.p = _mPivotB * node1->getWorldScale();
        const auto &rot_0 = node0->getWorldRotation();
        const auto &rot_1_i = node1->getWorldRotation().getInversed();
        pose1.q = physx::PxQuat(rot_1_i.x, rot_1_i.y, rot_1_i.z, rot_1_i.w) * physx::PxQuat(rot_0.x, rot_0.y, rot_0.z, rot_0.w) * pose0.q;
    } else {
        const auto &wr = node0->getWorldRotation();
        auto rot = physx::PxQuat{wr.x, wr.y, wr.z, wr.w};
        pose1.p = _mPivotA * node0->getWorldScale();
        rot.rotate(pose1.p);
        pose1.p += _mPivotB + node0->getWorldPosition();
        pose1.q = rot * pose0.q;
    }
    _mJoint->setLocalPose(physx::PxJointActorIndex::eACTOR1, pose1);
}

} // namespace physics
} // namespace cc
