// Define module
// target_namespace means the name exported to JS, could be same as which in other modules
// scene at the last means the suffix of binding function name, different modules should use unique name
// Note: doesn't support number prefix
%module(target_namespace="jsb") scene

// Disable some swig warnings, find warning number reference here ( https://www.swig.org/Doc4.1/Warnings.html )
#pragma SWIG nowarn=503,302,401,317,402

// Insert code at the beginning of generated header file (.h)
%insert(header_file) %{
#pragma once
#include "bindings/jswrapper/SeApi.h"
#include "bindings/manual/jsb_conversions.h"
#include "bindings/auto/jsb_gi_auto.h"
#include "core/Root.h"
#include "core/scene-graph/Node.h"
#include "core/scene-graph/Scene.h"
#include "core/scene-graph/SceneGlobals.h"
#include "scene/Light.h"
#include "scene/LODGroup.h"
#include "scene/Fog.h"
#include "scene/Shadow.h"
#include "scene/Skybox.h"
#include "scene/Skin.h"
#include "scene/PostSettings.h"
#include "scene/DirectionalLight.h"
#include "scene/SpotLight.h"
#include "scene/SphereLight.h"
#include "scene/PointLight.h"
#include "scene/RangedDirectionalLight.h"
#include "scene/Model.h"
#include "scene/SubModel.h"
#include "scene/Pass.h"
#include "scene/RenderScene.h"
#include "scene/DrawBatch2D.h"
#include "scene/RenderWindow.h"
#include "scene/Camera.h"
#include "scene/Define.h"
#include "scene/Ambient.h"
#include "renderer/core/PassInstance.h"
#include "renderer/core/MaterialInstance.h"
#include "3d/models/MorphModel.h"
#include "3d/models/SkinningModel.h"
#include "3d/models/BakedSkinningModel.h"
#include "renderer/core/ProgramLib.h"
#include "scene/Octree.h"
#include "scene/ReflectionProbe.h"
%}

// Insert code at the beginning of generated source file (.cpp)
%{
#include "bindings/auto/jsb_scene_auto.h"
#include "bindings/auto/jsb_gfx_auto.h"
#include "bindings/auto/jsb_pipeline_auto.h"
#include "bindings/auto/jsb_geometry_auto.h"
#include "bindings/auto/jsb_assets_auto.h"
#include "bindings/auto/jsb_render_auto.h"
#include "bindings/auto/jsb_cocos_auto.h"
#include "bindings/auto/jsb_2d_auto.h"

using namespace cc;
%}

%typemap(out, func_only=1) cc::MaterialProperty %{
	ccstd::visit(
        [&](auto &param) {
            using ParamType = std::remove_reference_t<decltype(param)>;
            if constexpr (std::is_same_v<ParamType, int32_t> || std::is_same_v<ParamType, float>) {
                ok = nativevalue_to_se(param, s.rval());
            } else {
                auto *temp = ccnew ParamType(param);
                ok = nativevalue_to_se(temp, s.rval());
                if (ok) {
                    s.rval().toObject()->getPrivateObject()->tryAllowDestroyInGC();
                } else {
                    s.rval().setUndefined();
                    delete temp;
                }
            }
        },
        result);

    SE_PRECONDITION2(ok, false, "Error processing arguments");
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
%ignore cc::RefCounted;

%ignore cc::scene::Pass::getBlocks;
%ignore cc::scene::Pass::initPassFromTarget;

%ignore cc::Root::getEventProcessor;
%ignore cc::Node::getEventProcessor;

%ignore cc::scene::IMacroPatch::IMacroPatch(const std::pair<const std::string, cc::MacroValue>&);

%ignore cc::Node::setRTSInternal;
%ignore cc::Node::setRTS;
//FIXME: These methods binding code will generate SwigValueWrapper type which is not supported now.
%ignore cc::scene::SubModel::getInstancedAttributeBlock;
%ignore cc::scene::SubModel::getInstancedWorldMatrixIndex;
%ignore cc::scene::SubModel::setInstancedWorldMatrixIndex;
%ignore cc::scene::SubModel::getInstancedSHIndex;
%ignore cc::scene::SubModel::setInstancedSHIndex;
%ignore cc::scene::SubModel::getInstancedAttributeIndex;
%ignore cc::scene::SubModel::setInstancedAttributeIndex;
%ignore cc::scene::SubModel::updateInstancedAttributes;
%ignore cc::scene::SubModel::updateInstancedWorldMatrix;
%ignore cc::scene::SubModel::updateInstancedSH;

%ignore cc::scene::Model::getLocalData;
%ignore cc::scene::Model::getEventProcessor;
%ignore cc::scene::Model::getOctreeNode;
%ignore cc::scene::Model::setOctreeNode;
%ignore cc::scene::Model::updateOctree;

%ignore cc::scene::SkinningModel::uploadJointData;

%ignore cc::scene::RenderScene::updateBatches;
%ignore cc::scene::RenderScene::addBatch;
%ignore cc::scene::RenderScene::removeBatch;
%ignore cc::scene::RenderScene::removeBatches;
%ignore cc::scene::RenderScene::getBatches;
%ignore cc::scene::RenderScene::getLODGroups;
%ignore cc::scene::RenderScene::removeLODGroups;

%ignore cc::scene::BakedSkinningModel::updateInstancedJointTextureInfo;
%ignore cc::scene::BakedSkinningModel::updateModelBounds;

%ignore cc::Node::setLayerPtr;
%ignore cc::Node::setUIPropsTransformDirtyCallback;
%ignore cc::Node::rotate;
%ignore cc::Node::setUserData;
%ignore cc::Node::getUserData;
%ignore cc::Node::getChildren;
%ignore cc::Node::rotateForJS;
%ignore cc::Node::setScale;
%ignore cc::Node::setRotation;
%ignore cc::Node::setRotationFromEuler;
%ignore cc::Node::setPosition;
%ignore cc::Node::isActiveInHierarchy;
%ignore cc::Node::setActiveInHierarchy;
%ignore cc::Node::setActiveInHierarchyPtr;
%ignore cc::Node::getUIProps;
%ignore cc::Node::getPosition;
%ignore cc::Node::getRotation;
%ignore cc::Node::getScale;
%ignore cc::Node::getEulerAngles;
%ignore cc::Node::getForward;
%ignore cc::Node::getUp;
%ignore cc::Node::getRight;
%ignore cc::Node::getWorldPosition;
%ignore cc::Node::getWorldRotation;
%ignore cc::Node::getWorldScale;
%ignore cc::Node::getWorldMatrix;
%ignore cc::Node::getWorldRS;
%ignore cc::Node::getWorldRT;
%ignore cc::Node::isTransformDirty;
%ignore cc::Node::_getSharedArrayBufferObject;

%ignore cc::scene::Camera::screenPointToRay;
%ignore cc::scene::Camera::screenToWorld;
%ignore cc::scene::Camera::worldToScreen;
%ignore cc::scene::Camera::worldMatrixToScreen;
%ignore cc::scene::Camera::getMatView;
%ignore cc::scene::Camera::getMatProj;
%ignore cc::scene::Camera::getMatProjInv;
%ignore cc::scene::Camera::getMatViewProj;
%ignore cc::scene::Camera::getMatViewProjInv;

%ignore cc::scene::RenderWindow::onNativeWindowDestroy;
%ignore cc::scene::RenderWindow::onNativeWindowResume;

%ignore cc::JointTexturePool::getDefaultPoseTexture;
//
%ignore cc::Layers::addLayer;
%ignore cc::Layers::deleteLayer;
%ignore cc::Layers::nameToLayer;
%ignore cc::Layers::layerToName;

%ignore cc::JointInfo;
%ignore cc::BakedJointInfo;
%ignore cc::ITemplateInfo;

%ignore cc::Root::frameSync;

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

%rename(IInstancedAttributeBlock) cc::scene::InstancedAttributeBlock;

%rename(_initialize) cc::Root::initialize;
%rename(resetHasChangedFlags) cc::Node::resetChangedFlags;
%rename(_parentInternal) cc::Node::_parent;
%rename(_updateSiblingIndex) cc::Node::updateSiblingIndex;
%rename(_onPreDestroyBase) cc::Node::onPreDestroyBase;
%rename(_onPreDestroy) cc::Node::onPreDestroy;

%rename(_enabled) cc::scene::FogInfo::_isEnabled;
%rename(cpp_keyword_register) cc::ProgramLib::registerEffect;

%rename(_initLocalDescriptors) cc::scene::Model::initLocalDescriptors;
%rename(_updateLocalDescriptors) cc::scene::Model::updateLocalDescriptors;
%rename(_initLocalSHDescriptors) cc::scene::Model::initLocalSHDescriptors;
%rename(_updateLocalSHDescriptors) cc::scene::Model::updateLocalSHDescriptors;
%rename(_updateInstancedAttributes) cc::scene::Model::updateInstancedAttributes;
%rename(_updateWorldBoundDescriptors) cc::scene::Model::updateWorldBoundDescriptors;

%rename(_load) cc::Scene::load;
%rename(_activate) cc::Scene::activate;

%rename(_updatePassHash) cc::scene::Pass::updatePassHash;
%rename(_getUniform) cc::scene::Pass::getUniform;

// ----- Module Macro Section ------
// Brief: Generated code should be wrapped inside a macro
// Usage:
//  1. Configure for class
//    %module_macro(CC_USE_GEOMETRY_RENDERER) cc::pipeline::GeometryRenderer;
//  2. Configure for member function or attribute
//    %module_macro(CC_USE_GEOMETRY_RENDERER) cc::pipeline::RenderPipeline::geometryRenderer;
// Note: Should be placed before 'Attribute Section'
%module_macro(CC_USE_GEOMETRY_RENDERER) cc::scene::Camera::geometryRenderer;

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
//TODO: %attribute code needs to be generated from ts file automatically.
%attribute(cc::Root, cc::gfx::Device*, device, getDevice, setDevice);
%attribute(cc::Root, cc::gfx::Device*, _device, getDevice, setDevice);
%attribute(cc::Root, cc::scene::RenderWindow*, mainWindow, getMainWindow);
%attribute(cc::Root, cc::scene::RenderWindow*, curWindow, getCurWindow, setCurWindow);
%attribute(cc::Root, cc::scene::RenderWindow*, tempWindow, getTempWindow, setTempWindow);
%attribute(cc::Root, %arg(ccstd::vector<IntrusivePtr<cc::scene::RenderWindow>> &), windows, getWindows);
%attribute(cc::Root, %arg(ccstd::vector<IntrusivePtr<cc::scene::RenderScene>> &), scenes, getScenes);
%attribute(cc::Root, float, cumulativeTime, getCumulativeTime);
%attribute(cc::Root, float, frameTime, getFrameTime);
%attribute(cc::Root, uint32_t, frameCount, getFrameCount);
%attribute(cc::Root, uint32_t, fps, getFps);
%attribute(cc::Root, uint32_t, fixedFPS, getFixedFPS, setFixedFPS);
%attribute(cc::Root, bool, useDeferredPipeline, isUsingDeferredPipeline);
%attribute(cc::Root, bool, usesCustomPipeline, usesCustomPipeline);
%attribute(cc::Root, cc::render::PipelineRuntime *, pipeline, getPipeline);
%attribute(cc::Root, cc::render::Pipeline*, customPipeline, getCustomPipeline);
%attribute(cc::Root, %arg(ccstd::vector<cc::scene::Camera*> &), cameraList, getCameraList);
%attribute(cc::Root, cc::pipeline::DebugView*, debugView, getDebugView);

%attribute(cc::scene::RenderWindow, uint32_t, width, getWidth);
%attribute(cc::scene::RenderWindow, uint32_t, height, getHeight);
%attribute(cc::scene::RenderWindow, cc::gfx::Framebuffer*, framebuffer, getFramebuffer);
%attribute(cc::scene::RenderWindow, %arg(ccstd::vector<IntrusivePtr<Camera>> &), cameras, getCameras);
%attribute(cc::scene::RenderWindow, cc::gfx::Swapchain*, swapchain, getSwapchain);
%attribute(cc::scene::RenderWindow, uint32_t, renderWindowId, getRenderWindowId);
%attribute(cc::scene::RenderWindow, ccstd::string &, colorName, getColorName);
%attribute(cc::scene::RenderWindow, ccstd::string &, depthStencilName, getDepthStencilName);

%attribute(cc::scene::Pass, cc::Root*, root, getRoot);
%attribute(cc::scene::Pass, cc::gfx::Device*, device, getDevice);
%attribute(cc::scene::Pass, cc::IProgramInfo*, shaderInfo, getShaderInfo);
%attribute(cc::scene::Pass, cc::gfx::DescriptorSetLayout*, localSetLayout, getLocalSetLayout);
%attribute(cc::scene::Pass, ccstd::string&, program, getProgram);
%attribute(cc::scene::Pass, cc::PassPropertyInfoMap& , properties, getProperties);
%attribute(cc::scene::Pass, cc::MacroRecord&, defines, getDefines);
%attribute(cc::scene::Pass, index_t, passIndex, getPassIndex);
%attribute(cc::scene::Pass, index_t, propertyIndex, getPropertyIndex);
%attribute(cc::scene::Pass, cc::scene::IPassDynamics &, dynamics, getDynamics);
%attribute(cc::scene::Pass, bool, rootBufferDirty, isRootBufferDirty);
%attribute(cc::scene::Pass, cc::pipeline::RenderPriority, priority, getPriority);
%attribute(cc::scene::Pass, cc::gfx::PrimitiveMode, primitive, getPrimitive);
%attribute(cc::scene::Pass, cc::pipeline::RenderPassStage, stage, getStage);
%attribute(cc::scene::Pass, uint32_t, phase, getPhase);
%attribute(cc::scene::Pass, uint32_t, phaseID, getPhaseID);
%attribute(cc::scene::Pass, cc::gfx::RasterizerState *, rasterizerState, getRasterizerState);
%attribute(cc::scene::Pass, cc::gfx::DepthStencilState *, depthStencilState, getDepthStencilState);
%attribute(cc::scene::Pass, cc::gfx::BlendState *, blendState, getBlendState);
%attribute(cc::scene::Pass, cc::gfx::DynamicStateFlagBit, dynamicStates, getDynamicStates);
%attribute(cc::scene::Pass, cc::scene::BatchingSchemes, batchingScheme, getBatchingScheme);
%attribute(cc::scene::Pass, cc::gfx::DescriptorSet *, descriptorSet, getDescriptorSet);
%attribute(cc::scene::Pass, ccstd::hash_t, hash, getHash);
%attribute(cc::scene::Pass, cc::gfx::PipelineLayout*, pipelineLayout, getPipelineLayout);

%attribute(cc::PassInstance, cc::scene::Pass*, parent, getParent);

%attribute(cc::Node, ccstd::string &, uuid, getUuid);
%attribute(cc::Node, float, angle, getAngle, setAngle);
%attribute_writeonly(cc::Node, Mat4&, matrix, setMatrix);
%attribute(cc::Node, uint32_t, hasChangedFlags, getChangedFlags, setChangedFlags);
%attribute(cc::Node, uint32_t, flagChangedVersion, getFlagChangedVersion);
%attribute(cc::Node, bool, _persistNode, isPersistNode, setPersistNode);
%attribute(cc::Node, cc::MobilityMode, mobility, getMobility, setMobility);

%attribute(cc::scene::Ambient, cc::Vec4&, skyColor, getSkyColor, setSkyColor);
%attribute(cc::scene::Ambient, float, skyIllum, getSkyIllum, setSkyIllum);
%attribute(cc::scene::Ambient, Vec4&, groundAlbedo, getGroundAlbedo, setGroundAlbedo);
%attribute(cc::scene::Ambient, bool, enabled, isEnabled, setEnabled);
%attribute(cc::scene::Ambient, uint8_t, mipmapCount, getMipmapCount, setMipmapCount);

%attribute(cc::scene::Light, bool, baked, isBaked, setBaked);
%attribute(cc::scene::Light, cc::Vec3&, color, getColor, setColor);
%attribute(cc::scene::Light, bool, useColorTemperature, isUseColorTemperature, setUseColorTemperature);
%attribute(cc::scene::Light, float, colorTemperature, getColorTemperature, setColorTemperature);
%attribute(cc::scene::Light, cc::Node*, node, getNode, setNode);
%attribute(cc::scene::Light, cc::scene::LightType, type, getType, setType);
%attribute(cc::scene::Light, ccstd::string&, name, getName, setName);
%attribute(cc::scene::Light, cc::scene::RenderScene*, scene, getScene);
%attribute(cc::scene::Light, uint32_t, visibility, getVisibility, setVisibility);
%attribute(cc::scene::Light, cc::Vec3&, colorTemperatureRGB, getColorTemperatureRGB, setColorTemperatureRGB);

%attribute(cc::scene::LODData, float, screenUsagePercentage, getScreenUsagePercentage, setScreenUsagePercentage);
%attribute(cc::scene::LODData, ccstd::vector<cc::IntrusivePtr<cc::scene::Model>>&, models, getModels);
%attribute(cc::scene::LODGroup, uint8_t, lodCount, getLodCount);
%attribute(cc::scene::LODGroup, bool, enabled, isEnabled, setEnabled);
%attribute(cc::scene::LODGroup, cc::Vec3&, localBoundaryCenter, getLocalBoundaryCenter, setLocalBoundaryCenter);
%attribute(cc::scene::LODGroup, float, objectSize, getObjectSize, setObjectSize);
%attribute(cc::scene::LODGroup, cc::Node*, node, getNode, setNode);
%attribute(cc::scene::LODGroup, ccstd::vector<cc::IntrusivePtr<cc::scene::LODData>>&, lodDataArray, getLodDataArray);
%attribute(cc::scene::LODGroup, cc::scene::RenderScene*, scene, getScene);


%attribute(cc::scene::DirectionalLight, cc::Vec3&, direction, getDirection, setDirection);
%attribute(cc::scene::DirectionalLight, float, illuminance, getIlluminance, setIlluminance);
%attribute(cc::scene::DirectionalLight, float, illuminanceHDR, getIlluminanceHDR, setIlluminanceHDR);
%attribute(cc::scene::DirectionalLight, float, illuminanceLDR, getIlluminanceLDR, setIlluminanceLDR);
%attribute(cc::scene::DirectionalLight, bool, shadowEnabled, isShadowEnabled, setShadowEnabled);
%attribute(cc::scene::DirectionalLight, cc::scene::PCFType, shadowPcf, getShadowPcf, setShadowPcf);
%attribute(cc::scene::DirectionalLight, float, shadowBias, getShadowBias, setShadowBias);
%attribute(cc::scene::DirectionalLight, float, shadowNormalBias, getShadowNormalBias, setShadowNormalBias);
%attribute(cc::scene::DirectionalLight, float, shadowSaturation, getShadowSaturation, setShadowSaturation);
%attribute(cc::scene::DirectionalLight, float, shadowDistance, getShadowDistance, setShadowDistance);
%attribute(cc::scene::DirectionalLight, float, shadowInvisibleOcclusionRange, getShadowInvisibleOcclusionRange, setShadowInvisibleOcclusionRange);
%attribute(cc::scene::DirectionalLight, bool, shadowFixedArea, isShadowFixedArea, setShadowFixedArea);
%attribute(cc::scene::DirectionalLight, float, shadowNear, getShadowNear, setShadowNear);
%attribute(cc::scene::DirectionalLight, float, shadowFar, getShadowFar, setShadowFar);
%attribute(cc::scene::DirectionalLight, float, shadowOrthoSize, getShadowOrthoSize, setShadowOrthoSize);
%attribute(cc::scene::DirectionalLight, cc::scene::CSMLevel, csmLevel, getCSMLevel, setCSMLevel);
%attribute(cc::scene::DirectionalLight, bool, csmNeedUpdate, isCSMNeedUpdate, setCSMNeedUpdate);
%attribute(cc::scene::DirectionalLight, float, csmLayerLambda, getCSMLayerLambda, setCSMLayerLambda);
%attribute(cc::scene::DirectionalLight, cc::scene::CSMOptimizationMode, csmOptimizationMode, getCSMOptimizationMode, setCSMOptimizationMode);
%attribute(cc::scene::DirectionalLight, bool, csmLayersTransition, getCSMLayersTransition, setCSMLayersTransition);
%attribute(cc::scene::DirectionalLight, float, csmTransitionRange, getCSMTransitionRange, setCSMTransitionRange);

%attribute(cc::scene::SpotLight, cc::Vec3&, position, getPosition);
%attribute(cc::scene::SpotLight, float, range, getRange, setRange);
%attribute(cc::scene::SpotLight, float, luminance, getLuminance, setLuminance);
%attribute(cc::scene::SpotLight, float, luminanceHDR, getLuminanceHDR, setLuminanceHDR);
%attribute(cc::scene::SpotLight, float, luminanceLDR, getLuminanceLDR, setLuminanceLDR);
%attribute(cc::scene::SpotLight, cc::Vec3&, direction, getDirection);
%attribute(cc::scene::SpotLight, float, spotAngle, getSpotAngle, setSpotAngle);
%attribute(cc::scene::SpotLight, float, angle, getAngle);
%attribute(cc::scene::SpotLight, cc::geometry::AABB&, aabb, getAABB);
%attribute(cc::scene::SpotLight, cc::geometry::Frustum &, frustum, getFrustum, setFrustum);
%attribute(cc::scene::SpotLight, bool, shadowEnabled, isShadowEnabled, setShadowEnabled);
%attribute(cc::scene::SpotLight, float, shadowPcf, getShadowPcf, setShadowPcf);
%attribute(cc::scene::SpotLight, float, shadowBias, getShadowBias, setShadowBias);
%attribute(cc::scene::SpotLight, float, shadowNormalBias, getShadowNormalBias, setShadowNormalBias);
%attribute(cc::scene::SpotLight, float, size, getSize, setSize);
%attribute(cc::scene::SpotLight, float, angleAttenuationStrength, getAngleAttenuationStrength, setAngleAttenuationStrength);

%attribute(cc::scene::SphereLight, cc::Vec3&, position, getPosition, setPosition);
%attribute(cc::scene::SphereLight, float, size, getSize, setSize);
%attribute(cc::scene::SphereLight, float, range, getRange, setRange);
%attribute(cc::scene::SphereLight, float, luminance, getLuminance, setLuminance);
%attribute(cc::scene::SphereLight, float, luminanceHDR, getLuminanceHDR, setLuminanceHDR);
%attribute(cc::scene::SphereLight, float, luminanceLDR, getLuminanceLDR, setLuminanceLDR);
%attribute(cc::scene::SphereLight, cc::geometry::AABB&, aabb, getAABB);

%attribute(cc::scene::PointLight, cc::Vec3&, position, getPosition, setPosition);
%attribute(cc::scene::PointLight, float, range, getRange, setRange);
%attribute(cc::scene::PointLight, float, luminance, getLuminance, setLuminance);
%attribute(cc::scene::PointLight, float, luminanceHDR, getLuminanceHDR, setLuminanceHDR);
%attribute(cc::scene::PointLight, float, luminanceLDR, getLuminanceLDR, setLuminanceLDR);
%attribute(cc::scene::PointLight, cc::geometry::AABB&, aabb, getAABB);

%attribute(cc::scene::RangedDirectionalLight, float, illuminance, getIlluminance, setIlluminance);
%attribute(cc::scene::RangedDirectionalLight, float, illuminanceHDR, getIlluminanceHDR, setIlluminanceHDR);
%attribute(cc::scene::RangedDirectionalLight, float, illuminanceLDR, getIlluminanceLDR, setIlluminanceLDR);

%attribute(cc::scene::Camera, cc::scene::CameraISO, iso, getIso, setIso);
%attribute(cc::scene::Camera, float, isoValue, getIsoValue);
%attribute(cc::scene::Camera, float, ec, getEc, setEc);
%attribute(cc::scene::Camera, float, exposure, getExposure);
%attribute(cc::scene::Camera, cc::scene::CameraShutter, shutter, getShutter, setShutter);
%attribute(cc::scene::Camera, float, shutterValue, getShutterValue);
%attribute(cc::scene::Camera, float, apertureValue, getApertureValue);
%attribute(cc::scene::Camera, uint32_t, width, getWidth);
%attribute(cc::scene::Camera, uint32_t, height, getHeight);
%attribute(cc::scene::Camera, float, aspect, getAspect);
%attribute(cc::scene::Camera, cc::scene::RenderScene*, scene, getScene);
%attribute(cc::scene::Camera, ccstd::string&, name, getName);
%attribute(cc::scene::Camera, cc::scene::RenderWindow*, window, getWindow, setWindow);
%attribute(cc::scene::Camera, cc::Vec3&, forward, getForward, setForward);
%attribute(cc::scene::Camera, cc::scene::CameraAperture, aperture, getAperture, setAperture);
%attribute(cc::scene::Camera, cc::Vec3&, position, getPosition, setPosition);
%attribute(cc::scene::Camera, cc::scene::CameraProjection, projectionType, getProjectionType, setProjectionType);
%attribute(cc::scene::Camera, cc::scene::CameraFOVAxis, fovAxis, getFovAxis, setFovAxis);
%attribute(cc::scene::Camera, float, fov, getFov, setFov);
%attribute(cc::scene::Camera, float, nearClip, getNearClip, setNearClip);
%attribute(cc::scene::Camera, float, farClip, getFarClip, setFarClip);
%attribute(cc::scene::Camera, cc::Rect&, viewport, getViewport, setViewport);
%attribute(cc::scene::Camera, float, orthoHeight, getOrthoHeight, setOrthoHeight);
%attribute(cc::scene::Camera, cc::gfx::Color&, clearColor, getClearColor, setClearColor);
%attribute(cc::scene::Camera, float, clearDepth, getClearDepth, setClearDepth);
%attribute(cc::scene::Camera, cc::gfx::ClearFlagBit, clearFlag, getClearFlag, setClearFlag);
%attribute(cc::scene::Camera, float, clearStencil, getClearStencil, setClearStencil);
%attribute(cc::scene::Camera, bool, enabled, isEnabled, setEnabled);
%attribute(cc::scene::Camera, float, exposure, getExposure);
%attribute(cc::scene::Camera, cc::geometry::Frustum&, frustum, getFrustum, setFrustum);
%attribute(cc::scene::Camera, bool, isWindowSize, isWindowSize, setWindowSize);
%attribute(cc::scene::Camera, uint32_t, priority, getPriority, setPriority);
%attribute(cc::scene::Camera, float, screenScale, getScreenScale, setScreenScale);
%attribute(cc::scene::Camera, uint32_t, visibility, getVisibility, setVisibility);
%attribute(cc::scene::Camera, cc::Node*, node, getNode, setNode);
%attribute(cc::scene::Camera, cc::gfx::SurfaceTransform, surfaceTransform, getSurfaceTransform);
%attribute(cc::scene::Camera, cc::pipeline::GeometryRenderer *, geometryRenderer, getGeometryRenderer);
%attribute(cc::scene::Camera, uint32_t, systemWindowId, getSystemWindowId);
%attribute(cc::scene::Camera, cc::scene::CameraUsage, cameraUsage, getCameraUsage, setCameraUsage);
%attribute(cc::scene::Camera, cc::scene::TrackingType, trackingType, getTrackingType, setTrackingType);
%attribute(cc::scene::Camera, cc::scene::CameraType, cameraType, getCameraType, setCameraType);

%attribute(cc::scene::RenderScene, ccstd::string&, name, getName);
%attribute(cc::scene::RenderScene, ccstd::vector<cc::IntrusivePtr<cc::scene::Camera>>&, cameras, getCameras);
%attribute(cc::scene::RenderScene, ccstd::vector<cc::IntrusivePtr<cc::scene::SphereLight>>&, sphereLights, getSphereLights);
%attribute(cc::scene::RenderScene, ccstd::vector<cc::IntrusivePtr<cc::scene::SpotLight>>&, spotLights, getSpotLights);
%attribute(cc::scene::RenderScene, ccstd::vector<cc::IntrusivePtr<cc::scene::PointLight>>&, pointLights, getPointLights);
%attribute(cc::scene::RenderScene, ccstd::vector<cc::IntrusivePtr<cc::scene::RangedDirectionalLight>>&, rangedDirLights, getRangedDirLights);
%attribute(cc::scene::RenderScene, ccstd::vector<cc::IntrusivePtr<cc::scene::Model>>&, models, getModels);
%attribute(cc::scene::RenderScene, ccstd::vector<cc::IntrusivePtr<cc::scene::LODGroup>>&, lodGroups, getLODGroups);


%attribute(cc::scene::Skybox, cc::scene::Model*, model, getModel);
%attribute(cc::scene::Skybox, bool, enabled, isEnabled, setEnabled);
%attribute(cc::scene::Skybox, bool, useHDR, isUseHDR, setUseHDR);
%attribute(cc::scene::Skybox, bool, useIBL, isUseIBL, setUseIBL);
%attribute(cc::scene::Skybox, bool, useDiffuseMap, isUseDiffuseMap, setUseDiffuseMap);
%attribute(cc::scene::Skybox, bool, isRGBE, isRGBE);
%attribute(cc::scene::Skybox, cc::TextureCube*, envmap, getEnvmap, setEnvmap);
%attribute(cc::scene::Skybox, cc::TextureCube*, diffuseMap, getDiffuseMap, setDiffuseMap);

%attribute(cc::scene::Fog, bool, enabled, isEnabled, setEnabled);
%attribute(cc::scene::Fog, bool, accurate, isAccurate, setAccurate);
%attribute(cc::scene::Fog, cc::Color&, fogColor, getFogColor, setFogColor);
%attribute(cc::scene::Fog, cc::scene::FogType, type, getType, setType);
%attribute(cc::scene::Fog, float, fogDensity, getFogDensity, setFogDensity);
%attribute(cc::scene::Fog, float, fogStart, getFogStart, setFogStart);
%attribute(cc::scene::Fog, float, fogEnd, getFogEnd, setFogEnd);
%attribute(cc::scene::Fog, float, fogAtten, getFogAtten, setFogAtten);
%attribute(cc::scene::Fog, float, fogTop, getFogTop, setFogTop);
%attribute(cc::scene::Fog, float, fogRange, getFogRange, setFogRange);
%attribute(cc::scene::Fog, cc::Vec4&, colorArray, getColorArray);

%attribute(cc::scene::Skin, bool, enabled, isEnabled, setEnabled);
%attribute(cc::scene::Skin, float, blurRadius, getBlurRadius, setBlurRadius);
%attribute(cc::scene::Skin, float, sssIntensity, getSSSIntensity, setSSSIntensity);

%attribute(cc::scene::PostSettings, cc::scene::ToneMappingType, toneMappingType, getToneMappingType, setToneMappingType);

%attribute(cc::scene::Model, cc::scene::RenderScene*, scene, getScene, setScene);
%attribute(cc::scene::Model, ccstd::vector<cc::IntrusivePtr<cc::scene::SubModel>> &, _subModels, getSubModels);
%attribute(cc::scene::Model, ccstd::vector<cc::IntrusivePtr<cc::scene::SubModel>> &, subModels, getSubModels);
%attribute(cc::scene::Model, bool, inited, isInited);
%attribute(cc::scene::Model, bool, _localDataUpdated, isLocalDataUpdated, setLocalDataUpdated);
%attribute(cc::scene::Model, cc::geometry::AABB *, _worldBounds, getWorldBounds, setWorldBounds);
%attribute(cc::scene::Model, cc::geometry::AABB *, worldBounds, getWorldBounds, setWorldBounds);
%attribute(cc::scene::Model, cc::geometry::AABB *, _modelBounds, getModelBounds, setModelBounds);
%attribute(cc::scene::Model, cc::geometry::AABB *, modelBounds, getModelBounds, setModelBounds);
%attribute(cc::scene::Model, cc::gfx::Buffer *, worldBoundBuffer, getWorldBoundBuffer, setWorldBoundBuffer);
%attribute(cc::scene::Model, cc::gfx::Buffer *, localBuffer, getLocalBuffer, setLocalBuffer);
%attribute(cc::scene::Model, uint32_t, updateStamp, getUpdateStamp);
%attribute(cc::scene::Model, bool, receiveShadow, isReceiveShadow, setReceiveShadow);
%attribute(cc::scene::Model, bool, castShadow, isCastShadow, setCastShadow);
%attribute(cc::scene::Model, float, shadowBias, getShadowBias, setShadowBias);
%attribute(cc::scene::Model, float, shadowNormalBias, getShadowNormalBias, setShadowNormalBias);
%attribute(cc::scene::Model, cc::Node*, node, getNode, setNode);
%attribute(cc::scene::Model, cc::Node*, transform, getTransform, setTransform);
%attribute(cc::scene::Model, cc::Layers::Enum, visFlags, getVisFlags, setVisFlags);
%attribute(cc::scene::Model, bool, enabled, isEnabled, setEnabled);
%attribute(cc::scene::Model, cc::scene::Model::Type, type, getType, setType);
%attribute(cc::scene::Model, bool, isDynamicBatching, isDynamicBatching, setDynamicBatching);
%attribute(cc::scene::Model, uint32_t, priority, getPriority, setPriority);
%attribute(cc::scene::Model, int32_t, tetrahedronIndex, getTetrahedronIndex, setTetrahedronIndex);
%attribute(cc::scene::Model, bool, useLightProbe, getUseLightProbe, setUseLightProbe);
%attribute(cc::scene::Model, bool, bakeToReflectionProbe, getBakeToReflectionProbe, setBakeToReflectionProbe);
%attribute(cc::scene::Model, cc::scene::UseReflectionProbeType, reflectionProbeType, getReflectionProbeType, setReflectionProbeType);
%attribute(cc::scene::Model, bool, receiveDirLight, isReceiveDirLight, setReceiveDirLight);
%attribute(cc::scene::Model, int32_t, reflectionProbeId, getReflectionProbeId, setReflectionProbeId);
%attribute(cc::scene::Model, int32_t, reflectionProbeBlendId, getReflectionProbeBlendId, setReflectionProbeBlendId);
%attribute(cc::scene::Model, float, reflectionProbeBlendWeight, getReflectionProbeBlendWeight, setReflectionProbeBlendWeight);

%attribute(cc::scene::SubModel, cc::scene::SharedPassArray &, passes, getPasses, setPasses);
%attribute(cc::scene::SubModel, ccstd::vector<cc::IntrusivePtr<cc::gfx::Shader>> &, shaders, getShaders, setShaders);
%attribute(cc::scene::SubModel, cc::RenderingSubMesh*, subMesh, getSubMesh, setSubMesh);
%attribute(cc::scene::SubModel, cc::pipeline::RenderPriority, priority, getPriority, setPriority);
%attribute(cc::scene::SubModel, cc::gfx::InputAssembler *, inputAssembler, getInputAssembler, setInputAssembler);
%attribute(cc::scene::SubModel, cc::gfx::DescriptorSet *, descriptorSet, getDescriptorSet, setDescriptorSet);
%attribute(cc::scene::SubModel, ccstd::vector<cc::scene::IMacroPatch> &, patches, getPatches);

%attribute(cc::scene::ShadowsInfo, bool, enabled, isEnabled, setEnabled);
%attribute(cc::scene::ShadowsInfo, cc::scene::ShadowType, type, getType, setType);
%attribute(cc::scene::ShadowsInfo, cc::Color&, shadowColor, getShadowColor, setShadowColor);
%attribute(cc::scene::ShadowsInfo, cc::Vec3&, planeDirection, getPlaneDirection, setPlaneDirection);
%attribute(cc::scene::ShadowsInfo, float, planeHeight, getPlaneHeight, setPlaneHeight);
%attribute(cc::scene::ShadowsInfo, float, planeBias, getPlaneBias, setPlaneBias);
%attribute(cc::scene::ShadowsInfo, uint32_t, maxReceived, getMaxReceived, setMaxReceived);
%attribute(cc::scene::ShadowsInfo, float, shadowMapSize, getShadowMapSize, setShadowMapSize);

%attribute(cc::scene::Shadows, bool, enabled, isEnabled, setEnabled);
%attribute(cc::scene::Shadows, cc::scene::ShadowType, type, getType, setType);
%attribute(cc::scene::Shadows, cc::Vec3&, normal, getNormal, setNormal);
%attribute(cc::scene::Shadows, float, distance, getDistance, setDistance);
%attribute(cc::scene::Shadows, float, planeBias, getPlaneBias, setPlaneBias);
%attribute(cc::scene::Shadows, cc::Color&, shadowColor, getShadowColor, setShadowColor);
%attribute(cc::scene::Shadows, uint32_t, maxReceived, getMaxReceived, setMaxReceived);
%attribute(cc::scene::Shadows, cc::Vec2&, size, getSize, setSize);
%attribute(cc::scene::Shadows, bool, shadowMapDirty, isShadowMapDirty, setShadowMapDirty);
%attribute(cc::scene::Shadows, cc::Mat4&, matLight, getMatLight);
%attribute(cc::scene::Shadows, cc::Material*, material, getMaterial);
%attribute(cc::scene::Shadows, cc::Material*, instancingMaterial, getInstancingMaterial);

%attribute_writeonly(cc::scene::AmbientInfo, cc::Vec4&, skyColor, setSkyColor);
%attribute(cc::scene::AmbientInfo, float, skyIllum, getSkyIllum, setSkyIllum);
%attribute_writeonly(cc::scene::AmbientInfo, cc::Vec4&, groundAlbedo, setGroundAlbedo);
%attribute(cc::scene::AmbientInfo, cc::Vec4&, _skyColor, getSkyColorHDR, setSkyColorHDR);
%attribute(cc::scene::AmbientInfo, float, _skyIllum, getSkyIllumHDR, setSkyIllumHDR);
%attribute(cc::scene::AmbientInfo, cc::Vec4&, _groundAlbedo, getGroundAlbedoHDR, setGroundAlbedoHDR);
%attribute(cc::scene::AmbientInfo, cc::Vec4&, skyColorLDR, getSkyColorLDR);
%attribute(cc::scene::AmbientInfo, cc::Vec4&, groundAlbedoLDR, getGroundAlbedoLDR);
%attribute(cc::scene::AmbientInfo, float, skyIllumLDR, getSkyIllumLDR);
%attribute(cc::scene::AmbientInfo, cc::Color&, skyLightingColor, getSkyLightingColor, setSkyLightingColor);
%attribute(cc::scene::AmbientInfo, cc::Color&, groundLightingColor, getGroundLightingColor, setGroundLightingColor);

%attribute(cc::scene::FogInfo, cc::scene::FogType, type, getType, setType);
%attribute(cc::scene::FogInfo, cc::Color&, fogColor, getFogColor, setFogColor);
%attribute(cc::scene::FogInfo, bool, enabled, isEnabled, setEnabled);
%attribute(cc::scene::FogInfo, bool, accurate, isAccurate, setAccurate);
%attribute(cc::scene::FogInfo, float, fogDensity, getFogDensity, setFogDensity);
%attribute(cc::scene::FogInfo, float, fogStart, getFogStart, setFogStart);
%attribute(cc::scene::FogInfo, float, fogEnd, getFogEnd, setFogEnd);
%attribute(cc::scene::FogInfo, float, fogAtten, getFogAtten, setFogAtten);
%attribute(cc::scene::FogInfo, float, fogTop, getFogTop, setFogTop);
%attribute(cc::scene::FogInfo, float, fogRange, getFogRange, setFogRange);

%attribute(cc::scene::SkyboxInfo, cc::TextureCube*, _envmap, getEnvmapForJS, setEnvmapForJS);
%attribute(cc::scene::SkyboxInfo, bool, applyDiffuseMap, isApplyDiffuseMap, setApplyDiffuseMap);
%attribute(cc::scene::SkyboxInfo, bool, enabled, isEnabled, setEnabled);
%attribute(cc::scene::SkyboxInfo, bool, useIBL, isUseIBL, setUseIBL);
%attribute(cc::scene::SkyboxInfo, bool, useHDR, isUseHDR, setUseHDR);
%attribute(cc::scene::SkyboxInfo, cc::TextureCube*, envmap, getEnvmap, setEnvmap);
%attribute(cc::scene::SkyboxInfo, cc::TextureCube*, diffuseMap, getDiffuseMap, setDiffuseMap);
%attribute(cc::scene::SkyboxInfo, cc::TextureCube*, reflectionMap, getReflectionMap, setReflectionMap);
%attribute(cc::scene::SkyboxInfo, cc::Material*, skyboxMaterial, getSkyboxMaterial, setSkyboxMaterial);
%attribute(cc::scene::SkyboxInfo, float, rotationAngle, getRotationAngle, setRotationAngle);
%attribute(cc::scene::SkyboxInfo, cc::scene::EnvironmentLightingType, envLightingType, getEnvLightingType, setEnvLightingType);

%attribute(cc::scene::OctreeInfo, bool, enabled, isEnabled, setEnabled);
%attribute(cc::scene::OctreeInfo, cc::Vec3&, minPos, getMinPos, setMinPos);
%attribute(cc::scene::OctreeInfo, cc::Vec3&, maxPos, getMaxPos, setMaxPos);
%attribute(cc::scene::OctreeInfo, uint32_t, depth, getDepth, setDepth);

%attribute(cc::scene::PostSettingsInfo, cc::scene::ToneMappingType, toneMappingType, getToneMappingType, setToneMappingType);

%attribute(cc::Scene, bool, autoReleaseAssets, isAutoReleaseAssets, setAutoReleaseAssets);

%attribute(cc::scene::ReflectionProbe, cc::scene::ReflectionProbe::ProbeType, probeType, getProbeType, setProbeType);
%attribute(cc::scene::ReflectionProbe, uint32_t, resolution, getResolution, setResolution);
%attribute(cc::scene::ReflectionProbe, cc::gfx::ClearFlagBit, clearFlag, getClearFlag, setClearFlag);
%attribute(cc::scene::ReflectionProbe, cc::gfx::Color&, backgroundColor, getBackgroundColor, setBackgroundColor);
%attribute(cc::scene::ReflectionProbe, uint32_t, visibility, getVisibility, setVisibility);
%attribute(cc::scene::ReflectionProbe, cc::Vec3&, size, getBoudingSize, setBoudingSize);
%attribute(cc::scene::ReflectionProbe, cc::geometry::AABB *, boundingBox, getBoundingBox);
%attribute(cc::scene::ReflectionProbe, cc::Node*, previewSphere, getPreviewSphere, setPreviewSphere);
%attribute(cc::scene::ReflectionProbe, cc::Node*, previewPlane, getPreviewPlane, setPreviewPlane);
%attribute(cc::scene::ReflectionProbe, ccstd::vector<cc::IntrusivePtr<cc::RenderTexture>> &, bakedCubeTextures, getBakedCubeTextures);
%attribute(cc::scene::ReflectionProbe, cc::TextureCube*, cubemap, getCubeMap, setCubeMap);
%attribute(cc::scene::ReflectionProbe, cc::Node*, node, getNode);
%attribute(cc::scene::ReflectionProbe, cc::RenderTexture*, realtimePlanarTexture, getRealtimePlanarTexture);
%attribute(cc::scene::ReflectionProbe, cc::scene::Camera*, camera, getCamera);

%attribute(cc::SceneGlobals, bool, bakedWithStationaryMainLight, getBakedWithStationaryMainLight, setBakedWithStationaryMainLight);
%attribute(cc::SceneGlobals, bool, bakedWithHighpLightmap, getBakedWithHighpLightmap, setBakedWithHighpLightmap);


// ----- Import Section ------
// Brief: Import header files which are depended by 'Include Section'
// Note:
//   %import "your_header_file.h" will not generate code for that header file
//
%import "base/Macros.h"
%import "base/RefCounted.h"
%import "base/TypeDef.h"
%import "base/memory/Memory.h"
%import "base/Ptr.h"

%import "core/ArrayBuffer.h"
%import "core/data/Object.h"
%import "core/TypedArray.h"

%import "math/MathBase.h"
%import "math/Vec2.h"
%import "math/Vec3.h"
%import "math/Vec4.h"
%import "math/Color.h"
%import "math/Mat3.h"
%import "math/Mat4.h"
%import "math/Quaternion.h"

%import "core/event/Event.h"

// %import "renderer/gfx-base/GFXDef-common.h"
%import "core/data/Object.h"
%import "renderer/pipeline/RenderPipeline.h"
%import "renderer/core/PassUtils.h"

%import "core/assets/Asset.h"
%import "core/assets/TextureBase.h"
%import "core/assets/SimpleTexture.h"
%import "core/assets/Texture2D.h"
%import "core/assets/TextureCube.h"
%import "core/assets/RenderTexture.h"
%import "core/assets/BufferAsset.h"
%import "core/assets/EffectAsset.h"
%import "core/assets/ImageAsset.h"
%import "core/assets/SceneAsset.h"
%import "core/assets/TextAsset.h"
%import "core/assets/Material.h"
%import "core/assets/RenderingSubMesh.h"

%import "core/geometry/Enums.h"
%import "core/geometry/AABB.h"
%import "core/geometry/Capsule.h"
// %import "core/geometry/Curve.h"
%import "core/geometry/Distance.h"
%import "core/geometry/Frustum.h"
// %import "core/geometry/Intersect.h"
%import "core/geometry/Line.h"
%import "core/geometry/Obb.h"
%import "core/geometry/Plane.h"
%import "core/geometry/Ray.h"
%import "core/geometry/Spec.h"
%import "core/geometry/Sphere.h"
%import "core/geometry/Spline.h"
%import "core/geometry/Triangle.h"
%import "3d/assets/Skeleton.h"

// ----- Include Section ------
// Brief: Include header files in which classes and methods will be bound
%include "core/scene-graph/NodeEnum.h"
%include "core/scene-graph/Layers.h"
%include "core/scene-graph/Node.h"
%include "core/scene-graph/Scene.h"
%include "core/scene-graph/SceneGlobals.h"
%include "core/Root.h"
// %include "core/animation/SkeletalAnimationUtils.h"
// %include "3d/skeletal-animation/SkeletalAnimationUtils.h"

%include "scene/Define.h"
%include "scene/Light.h"
%include "scene/LODGroup.h"
%include "scene/Fog.h"
%include "scene/Shadow.h"
%include "scene/Skybox.h"
%include "scene/Skin.h"
%include "scene/PostSettings.h"
%include "scene/DirectionalLight.h"
%include "scene/SpotLight.h"
%include "scene/SphereLight.h"
%include "scene/PointLight.h"
%include "scene/RangedDirectionalLight.h"
%include "scene/Model.h"
%include "scene/SubModel.h"
%include "scene/Pass.h"
%include "scene/RenderScene.h"
%include "scene/RenderWindow.h"
%include "scene/Camera.h"
%include "scene/Ambient.h"
%include "scene/ReflectionProbe.h"
%include "renderer/core/PassInstance.h"
%include "renderer/core/MaterialInstance.h"

%import "3d/assets/Morph.h"
%import "3d/assets/MorphRendering.h"

%include "3d/models/MorphModel.h"
%include "3d/models/SkinningModel.h"
%include "3d/models/BakedSkinningModel.h"

%include "renderer/core/ProgramLib.h"
%include "scene/Octree.h"

