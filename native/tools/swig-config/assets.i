// Define module
// target_namespace means the name exported to JS, could be same as which in other modules
// assets at the last means the suffix of binding function name, different modules should use unique name
// Note: doesn't support number prefix
%module(target_namespace="jsb") assets

// Disable some swig warnings, find warning number reference here ( https://www.swig.org/Doc4.1/Warnings.html )
#pragma SWIG nowarn=503,302,401,317,402

// Insert code at the beginning of generated header file (.h)
%insert(header_file) %{
#pragma once
#include "bindings/jswrapper/SeApi.h"
#include "bindings/manual/jsb_conversions.h"
#include "core/assets/Asset.h"
#include "core/assets/BufferAsset.h"
#include "core/assets/EffectAsset.h"
#include "core/assets/ImageAsset.h"
#include "core/assets/Material.h"
#include "core/builtin/BuiltinResMgr.h"
#include "3d/assets/Morph.h"
#include "3d/assets/Mesh.h"
#include "3d/assets/Skeleton.h"
#include "3d/misc/CreateMesh.h"
%}

// Insert code at the beginning of generated source file (.cpp)
%{
#include "bindings/auto/jsb_assets_auto.h"
#include "bindings/auto/jsb_cocos_auto.h"
#include "bindings/auto/jsb_gfx_auto.h"
#include "bindings/auto/jsb_scene_auto.h"
#include "renderer/core/PassUtils.h"
#include "renderer/gfx-base/GFXDef-common.h"
#include "renderer/pipeline/Define.h"
#include "renderer/pipeline/RenderStage.h"
#include "scene/Pass.h"
#include "scene/RenderWindow.h"
#include "core/scene-graph/Scene.h"
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
%ignore cc::Asset::createNode; //FIXME: swig needs to support std::function
%ignore cc::IMemoryImageSource::data;
%ignore cc::IMemoryImageSource::compressed;
%ignore cc::SimpleTexture::uploadDataWithArrayBuffer;
%ignore cc::TextureCube::_mipmaps;
// %ignore cc::Mesh::copyAttribute;
// %ignore cc::Mesh::copyIndices;
%ignore cc::Material::setProperty;
%ignore cc::ImageAsset::setData;
%ignore cc::EffectAsset::_techniques;
%ignore cc::EffectAsset::_shaders;
%ignore cc::EffectAsset::_combinations;
%ignore cc::IPassInfoFull::passID;
%ignore cc::IPassInfoFull::phaseID;
%ignore cc::MeshUtils::createMeshInfo;
%ignore cc::MeshUtils::createDynamicMeshInfo;

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

%rename(cpp_keyword_struct) cc::Mesh::ICreateInfo::structInfo;
%rename(cpp_keyword_switch) cc::IPassInfoFull::switch_;
%rename(cpp_keyword_register) cc::EffectAsset::registerAsset;

%rename(_getProperty) cc::Material::getProperty;
%rename(_propsInternal) cc::Material::_props;
%rename(getHash) cc::Material::getHashForMaterial;

%rename(_getBindposes) cc::Skeleton::getBindposes;
%rename(_setBindposes) cc::Skeleton::setBindposes;

%rename(buffer) cc::BufferAsset::getBuffer;



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
%attribute(cc::Asset, ccstd::string&, _uuid, getUuid, setUuid);
%attribute(cc::Asset, ccstd::string&, uuid, getUuid);
%attribute(cc::Asset, ccstd::string, nativeUrl, getNativeUrl);
%attribute(cc::Asset, cc::NativeDep, _nativeDep, getNativeDep);
%attribute(cc::Asset, bool, isDefault, isDefault);

%attribute(cc::ImageAsset, cc::PixelFormat, format, getFormat, setFormat);
%attribute(cc::ImageAsset, ccstd::string&, url, getUrl, setUrl);

%attribute(cc::BufferAsset, cc::ArrayBuffer*, _nativeAsset, getNativeAssetForJS, setNativeAssetForJS);

%attribute(cc::TextureBase, bool, isCompressed, isCompressed);
%attribute(cc::TextureBase, uint32_t, _width, getWidth, setWidth);
%attribute(cc::TextureBase, uint32_t, width, getWidth, setWidth);
%attribute(cc::TextureBase, uint32_t, _height, getHeight, setHeight);
%attribute(cc::TextureBase, uint32_t, height, getHeight, setHeight);

%attribute(cc::SimpleTexture, uint32_t, mipmapLevel, mipmapLevel);
%attribute(cc::RenderTexture, cc::scene::RenderWindow*, window, getWindow);

%attribute(cc::Mesh, ccstd::hash_t, _hash, getHash, setHash);
%attribute(cc::Mesh, ccstd::hash_t, hash, getHash);
%attribute(cc::Mesh, cc::Uint8Array&, data, getData);
%attribute(cc::Mesh, cc::Uint8Array&, _data, getData);
%attribute(cc::Mesh, cc::Mesh::JointBufferIndicesType&, jointBufferIndices, getJointBufferIndices);
%attribute(cc::Mesh, cc::Mesh::RenderingSubMeshList&, renderingSubMeshes, getRenderingSubMeshes);
%attribute(cc::Mesh, uint32_t, subMeshCount, getSubMeshCount);
%attribute(cc::Mesh, cc::ArrayBuffer*, _nativeAsset, getAssetData, setAssetData);
%attribute(cc::Mesh, bool, _allowDataAccess, isAllowDataAccess, setAllowDataAccess);
%attribute(cc::Mesh, bool, allowDataAccess, isAllowDataAccess, setAllowDataAccess);

%attribute(cc::Material, cc::EffectAsset*, effectAsset, getEffectAsset, setEffectAsset);
%attribute(cc::Material, ccstd::string, effectName, getEffectName);
%attribute(cc::Material, uint32_t, technique, getTechniqueIndex);
%attribute(cc::Material, ccstd::hash_t, hash, getHash);
%attribute(cc::Material, cc::Material*, parent, getParent);

%attribute(cc::RenderingSubMesh, cc::Mesh*, mesh, getMesh, setMesh);
%attribute(cc::RenderingSubMesh, ccstd::optional<uint32_t>&, subMeshIdx, getSubMeshIdx, setSubMeshIdx);
%attribute(cc::RenderingSubMesh, ccstd::vector<cc::IFlatBuffer>&, flatBuffers, getFlatBuffers, setFlatBuffers);
%attribute(cc::RenderingSubMesh, ccstd::vector<cc::IFlatBuffer>&, _flatBuffers, getFlatBuffers, setFlatBuffers);
%attribute(cc::RenderingSubMesh, cc::gfx::BufferList&, jointMappedBuffers, getJointMappedBuffers);
%attribute(cc::RenderingSubMesh, cc::gfx::InputAssemblerInfo&, iaInfo, getIaInfo);
%attribute(cc::RenderingSubMesh, cc::gfx::InputAssemblerInfo&, _iaInfo, getIaInfo);
%attribute(cc::RenderingSubMesh, cc::gfx::PrimitiveMode, primitiveMode, getPrimitiveMode);

%attribute(cc::Skeleton, ccstd::vector<ccstd::string>&, joints, getJoints, setJoints);
%attribute(cc::Skeleton, ccstd::vector<ccstd::string>&, _joints, getJoints, setJoints);
%attribute(cc::Skeleton, ccstd::hash_t, hash, getHash, setHash);
%attribute(cc::Skeleton, ccstd::hash_t, _hash, getHash, setHash);
%attribute(cc::Skeleton, ccstd::vector<cc::Mat4>&, _invBindposes, getInverseBindposes);
%attribute(cc::Skeleton, ccstd::vector<cc::Mat4>&, inverseBindposes, getInverseBindposes);

%attribute(cc::EffectAsset, ccstd::vector<cc::ITechniqueInfo> &, techniques, getTechniques, setTechniques);
%attribute(cc::EffectAsset, ccstd::vector<cc::IShaderInfo> &, shaders, getShaders, setShaders);
%attribute(cc::EffectAsset, ccstd::vector<cc::IPreCompileInfo> &, combinations, getCombinations, setCombinations);



// ----- Import Section ------
// Brief: Import header files which are depended by 'Include Section'
// Note: 
//   %import "your_header_file.h" will not generate code for that header file
//
%import "base/Macros.h"
%import "base/RefCounted.h"
%import "base/TypeDef.h"
%import "base/Ptr.h"
%import "base/memory/Memory.h"

%import "core/event/Event.h"

%include "core/Types.h"

%import "core/ArrayBuffer.h"
%import "core/data/Object.h"
%import "core/scene-graph/Node.h"
%import "core/TypedArray.h"
%import "core/assets/AssetEnum.h"

%import "renderer/gfx-base/GFXDef-common.h"
%import "renderer/gfx-base/GFXTexture.h"
%import "renderer/pipeline/Define.h"
%import "renderer/pipeline/RenderStage.h"
%import "renderer/core/PassUtils.h"

%import "math/MathBase.h"
%import "math/Vec2.h"
%import "math/Vec3.h"
%import "math/Vec4.h"
%import "math/Color.h"
%import "math/Mat3.h"
%import "math/Mat4.h"
%import "math/Quaternion.h"

// ----- Include Section ------
// Brief: Include header files in which classes and methods will be bound

%include "3d/assets/Types.h"
%include "primitive/PrimitiveDefine.h"
%include "core/assets/Asset.h"
%include "core/assets/TextureBase.h"
%include "core/assets/SimpleTexture.h"
%include "core/assets/Texture2D.h"
%include "core/assets/TextureCube.h"
%include "core/assets/RenderTexture.h"
%include "core/assets/BufferAsset.h"
%include "core/assets/EffectAsset.h"
%include "core/assets/ImageAsset.h"
%include "core/assets/SceneAsset.h"
%include "core/assets/TextAsset.h"
%include "core/assets/Material.h"
%include "core/assets/RenderingSubMesh.h"
%include "core/builtin/BuiltinResMgr.h"
%include "3d/assets/Morph.h"
%include "3d/assets/MorphRendering.h"
%include "3d/assets/Mesh.h"
%include "3d/assets/Skeleton.h"
%include "3d/misc/CreateMesh.h"


