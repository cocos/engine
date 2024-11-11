#include "RayTracingScene.h"
#include "../pipeline/GlobalDescriptorSetManager.h"
#include "3d/assets/Mesh.h"
#include "gfx-base/GFXDevice.h"
#include "scene/Model.h"
#include "scene/RenderScene.h"
#include "core/Root.h"
#include "../renderer/pipeline/custom/RenderInterfaceTypes.h"

namespace cc
{
namespace scene
{

    namespace{

    void fillBlasGeomTriangleMesh(gfx::ASTriangleMesh& blasGeomMesh, const IntrusivePtr<scene::SubModel>& pSubModel) {
        blasGeomMesh.flag = gfx::ASGeometryFlagBit::GEOMETRY_OPAQUE;
        const auto* inputAssembler = pSubModel->getInputAssembler();
        blasGeomMesh.vertexCount = inputAssembler->getVertexCount();
        blasGeomMesh.indexCount = inputAssembler->getIndexCount();
        blasGeomMesh.indexBuffer = inputAssembler->getIndexBuffer();

        const auto& attributes = inputAssembler->getAttributes();

        const auto& posAttribute = std::find_if(attributes.cbegin(), attributes.cend(), [](const gfx::Attribute& attr) {
            return attr.name == gfx::ATTR_NAME_POSITION;
        });

        if (posAttribute != attributes.cend()) {
            const auto& vertexBufferList = inputAssembler->getVertexBuffers();
            auto* const posBuffer = vertexBufferList[posAttribute->stream];
            blasGeomMesh.vertexBuffer = posBuffer;
            blasGeomMesh.vertexStride = posBuffer->getStride();
            blasGeomMesh.vertexFormat = posAttribute->format;
        }
    }

    void fillBlasInfo(gfx::AccelerationStructureInfo& blasInfo, const IntrusivePtr<scene::Model>& pModel) {
        if (pModel->getNode()->getName() == "AABB") {
            gfx::ASAABB blasGeomAABB{};
            blasGeomAABB.flag = gfx::ASGeometryFlagBit::GEOMETRY_OPAQUE;
            blasGeomAABB.minX = blasGeomAABB.minY = blasGeomAABB.minZ = - 0.5;
            blasGeomAABB.maxX = blasGeomAABB.maxY = blasGeomAABB.maxZ = 0.5;
            blasInfo.aabbs.push_back(blasGeomAABB);
        } else {
            for (const auto& pSubModel : pModel->getSubModels()) {
                gfx::ASTriangleMesh blasGeomMesh{};
                fillBlasGeomTriangleMesh(blasGeomMesh, pSubModel);
                blasInfo.triangleMeshes.push_back(blasGeomMesh);
            }
        }
        blasInfo.buildFlag = gfx::ASBuildFlagBits::ALLOW_COMPACTION | gfx::ASBuildFlagBits::PREFER_FAST_TRACE;
    }

    bool similarTransformMatrix(const Mat4* mat1, const Mat4* mat2) {
        Vec3 vec1;
        Vec3 vec2;
        mat1->getScale(&vec1);
        mat2->getScale(&vec2);
        bool similarScale = (vec1 - vec2).lengthSquared() < 1;
        mat1->getTranslation(&vec1);
        mat2->getTranslation(&vec2);
        bool similarTranslate = (vec1 - vec2).lengthSquared() < 1;
        // Quaternion quat1;//Quaternion quat2;
        return similarScale && similarTranslate;
    };

    } // anonymous namespace

    RayTracingScene::RayTracingScene() {
        _globalDSManager = Root::getInstance()->getPipeline()->getGlobalDSManager(); 
    }

    void RayTracingScene::handleNewModel(const IntrusivePtr<scene::Model>& pModel) {

        RayTracingInstanceDescriptor instance_descriptor{};
        instance_descriptor.transform = pModel->getTransform()->getWorldMatrix();
        instance_descriptor.mask = 0xFF;
        instance_descriptor.flags = gfx::GeometryInstanceFlagBits::TRIANGLE_FACING_CULL_DISABLE;
        instance_descriptor.uuid = pModel->getNode()->getUuid();

        gfx::AccelerationStructureInfo blasInfo{};
        fillBlasInfo(blasInfo, pModel);

        for (const auto & mesh : blasInfo.triangleMeshes) {
            RayTracingMeshDescriptor m;
            m.indexBuffer = mesh.indexBuffer;
            m.vertexBuffer = mesh.vertexBuffer;
            m.indexCount = mesh.indexCount;
            m.vertexCount = mesh.vertexCount;
            m.vertexFormat = mesh.vertexFormat;

            RayTracingGeometryShadingDescriptor descriptor;
            descriptor.meshDescriptor = std::move(m);
            descriptor.materialID = 1;
            instance_descriptor.shadingGeometries.emplace_back(descriptor);
        }

        _modelCache.emplace(pModel->getNode()->getUuid(), std::pair{true, addInstance(instance_descriptor)});
    }

    void RayTracingScene::handleModel(const IntrusivePtr<scene::Model>& pModel) {
        
        if (!pModel->getNode()->isValid() || !pModel->getNode()->isActive() || pModel->getNode()->getName() == "Profiler_Root") {
            return;
        }

        auto modelIt = _modelCache.find(pModel->getNode()->getUuid());

        if (modelIt != _modelCache.cend()) {
            // Find existing Instance
            // set alive flag true
            modelIt->second.first = true;

            if (pModel->getTransform()->getChangedFlags()) {
                // Instance transform changed, tlas should be updated.
                auto lastUpdateTransfrom = &modelIt->second.second.transform;
                const auto* currentTransfrom = &pModel->getTransform()->getWorldMatrix();
                similarTransformMatrix(lastUpdateTransfrom, currentTransfrom) ? needUpdate = true : needRebuild = true;
                modelIt->second.second.transform = *currentTransfrom;
            }

        } else {
            // New instance should be added to top-level acceleration structure.
            // Tlas should be recreate and rebuild.
            needRecreate = needRebuild = true;
            handleNewModel(pModel);
        }
    }

    void RayTracingScene::build(const RayTracingSceneDescriptor& rtScene) {
        gfx::AccelerationStructureInfo tlasInfo{};
        tlasInfo.buildFlag = gfx::ASBuildFlagBits::ALLOW_UPDATE | gfx::ASBuildFlagBits::PREFER_FAST_TRACE;

        for (const auto& instance : rtScene.instances) {
            tlasInfo.instances.emplace_back(addInstance(instance));
        }

        _topLevelAccelerationStructure = gfx::Device::getInstance()->createAccelerationStructure(tlasInfo);
        _topLevelAccelerationStructure->build();
        // todo if all instances are static and no instance can be added or removed, then we can compact TLAS
        /*
         *  bool satisfied_condition = false;
            if (satisfied_condition) {
                _topLevelAccelerationStructure->compact();
            }
         */
    }

    void RayTracingScene::update(const RayTracingSceneDescriptor& rtScene) {
        
    }

    void RayTracingScene::update(const scene::RenderScene* scene) {

        needRebuild = needUpdate = needRecreate = false;

        for (const auto& pModel : scene->getModels()) {
            handleModel(pModel);
        }

        //sweep deactive model entries
        auto modelIt = _modelCache.begin();
        while (modelIt != _modelCache.end()) {
            if (modelIt->second.first) {
                modelIt->second.first = false;
                ++modelIt;
            } else {
                modelIt = _modelCache.erase(modelIt);
                needRebuild = true;
            }
        }

        if (needRebuild||needUpdate) {

            gfx::AccelerationStructureInfo tlasInfo{};
            tlasInfo.buildFlag = gfx::ASBuildFlagBits::ALLOW_UPDATE | gfx::ASBuildFlagBits::PREFER_FAST_TRACE;
            tlasInfo.instances.reserve(_modelCache.size());
            for (const auto& inst : _modelCache) {
                tlasInfo.instances.emplace_back(inst.second.second);
            }
            if (needRecreate) {
                _topLevelAccelerationStructure = gfx::Device::getInstance()->createAccelerationStructure(tlasInfo);
                rqBinding.recreate();
            } else {
                _topLevelAccelerationStructure->setInfo(tlasInfo);
            }
            if (needRebuild) {
                _topLevelAccelerationStructure->build();
                rqBinding.update();
            } else if (needUpdate) {
                _topLevelAccelerationStructure->update();
                rqBinding.update();
            }
        }

        if (needRecreate) {
            _globalDSManager->bindAccelerationStructure(pipeline::TOPLEVELAS::BINDING, _topLevelAccelerationStructure);
            _globalDSManager->bindBuffer(pipeline::SCENEGEOMETRYDESC::BINDING, rqBinding._geomDescGPUBuffer);
            _globalDSManager->bindBuffer(pipeline::SCENEINSTANCEDESC::BINDING, rqBinding._instanceDescGPUBuffer);
            _globalDSManager->update();
        }

        needRecreate = needRebuild = needUpdate = false;
    }

    void RayTracingScene::update(const RayTracingSceneUpdateInfo& updateInfo) {

        auto tlasInfo = _topLevelAccelerationStructure->getInfo();

        for (const auto& event : updateInfo.events) {
            std::visit(Overloaded{
                           [](auto arg) {},
                           [&](const RayTracingSceneAddInstanceEvent& e) {
                               tlasInfo.instances.push_back(addInstance(e.instDescriptor));
                           },
                           [&](const RayTracingSceneRemoveInstanceEvent& e) {
                               if (use_ray_query) {
                                   rqBinding.unregistry(tlasInfo.instances[e.instIdx]);
                               }else {
                                   rtBinding.unregistry(tlasInfo.instances[e.instIdx]);
                               }
                               tlasInfo.instances.erase(tlasInfo.instances.begin() + e.instIdx);
                           },
                           [&](const RayTracingSceneMoveInstanceEvent& e) {
                               tlasInfo.instances[e.instIdx].transform = e.transform;
                           }},event
            );
        }

        _topLevelAccelerationStructure->setInfo(tlasInfo);
        _topLevelAccelerationStructure->update();
        rqBinding.update();
    }

    void RayTracingScene::destroy() {
        _topLevelAccelerationStructure = nullptr;
        _modelCache.clear();
    }

    uint16_t RayQueryBindingTable::registrySubmeshes(const ccstd::vector<SubMeshGeomDescriptor>& subMeshes) {

        for (auto & sm : _geomDescLUT) {
            if (std::get<0>(sm) == subMeshes) {
                std::get<2>(sm)++;
                return std::get<1>(sm);
            }
        }

        auto offset = static_cast<uint16_t>(_geomDesc.allocate(subMeshes));
        _geomDescLUT.emplace_back(subMeshes, offset,1);
        return offset;
    }

    uint16_t RayQueryBindingTable::registryMaterials(const ccstd::vector<uint64_t>& materials) {

        for (auto & m : _materialDescLUT) {
            if (std::get<0>(m) == materials) {
                std::get<2>(m)++;
                return std::get<1>(m);
            }
        }

        auto offset = static_cast<uint16_t>(_materialDesc.allocate(materials));
        _materialDescLUT.emplace_back(materials, offset,1);
        return offset;
    }

    uint32_t RayQueryBindingTable::registry(const ccstd::vector<RayTracingGeometryShadingDescriptor>& shadingGeometries) {
        MeshShadingDescriptor shadingDesciptor{};
        shadingDesciptor.subMeshCount = shadingGeometries.size();
        shadingDesciptor.padding = shadingGeometries[0].meshDescriptor.has_value() ? (shadingGeometries[0].meshDescriptor.value().indexBuffer->getStride() == 2 ? 0 : 1) : -1;

        ccstd::vector<SubMeshGeomDescriptor> meshes;
        meshes.reserve(shadingGeometries.size());
        std::transform(shadingGeometries.cbegin(), shadingGeometries.cend(), std::back_inserter(meshes), [&](const RayTracingGeometryShadingDescriptor& geom) {
            const auto& meshDescriptor = geom.meshDescriptor;
            if (meshDescriptor) {
                return SubMeshGeomDescriptor{meshDescriptor.value().indexBuffer->getDeviceAddress(), meshDescriptor.value().vertexBuffer->getDeviceAddress()};
            }
            return SubMeshGeomDescriptor{~0U, ~0U};
        });

        ccstd::vector<uint64_t> materials;
        materials.reserve(shadingGeometries.size());
        std::transform(shadingGeometries.cbegin(), shadingGeometries.cend(), std::back_inserter(materials), [&](const RayTracingGeometryShadingDescriptor& geom) {
            return geom.materialID;
        });

        shadingDesciptor.subMeshGeometryOffset = registrySubmeshes(meshes);
        shadingDesciptor.subMeshMaterialOffset = registryMaterials(materials);

        for (auto & s : _shadingInstanceDescriptorsLUT) {
            if (std::get<0>(s)== shadingDesciptor) {
                std::get<2>(s)++;
                return std::get<1>(s);
            }
        }

        auto offset = static_cast<uint32_t>(_shadingInstanceDescriptors.allocate({shadingDesciptor}));
        _shadingInstanceDescriptorsLUT.emplace_back(shadingDesciptor, offset,1);
        return offset;
    }

    void RayQueryBindingTable::recreate() {
        gfx::BufferInfo bufferInfo{};
       
        bufferInfo.flags = gfx::BufferFlags::NONE;
        bufferInfo.usage = gfx::BufferUsage::STORAGE | gfx::BufferUsage::TRANSFER_DST;
        bufferInfo.memUsage = gfx::MemoryUsage::HOST;

        bufferInfo.size = static_cast<uint32_t>(_geomDesc.size()) * sizeof(SubMeshGeomDescriptor);
        _geomDescGPUBuffer = gfx::Device::getInstance()->createBuffer(bufferInfo);

        bufferInfo.size = static_cast<uint32_t>(_geomDesc.size()) * sizeof(uint64_t);
        _materialDescGPUBuffer = gfx::Device::getInstance()->createBuffer(bufferInfo);

         bufferInfo.size = static_cast<uint32_t>(_shadingInstanceDescriptors.size()) * sizeof(MeshShadingDescriptor);
        _instanceDescGPUBuffer = gfx::Device::getInstance()->createBuffer(bufferInfo);
    }

}  // namespace scene
} // namespace cc
