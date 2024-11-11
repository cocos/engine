#pragma once

#include "renderer/gfx-base/GFXAccelerationStructure.h"
#include "base/Ptr.h"
#include "gfx-base/GFXBuffer.h"
#include "gfx-base/GFXDevice.h"
#include "RayTracingSceneTypes.h"

namespace cc
{

namespace pipeline{
class GlobalDSManager;
}

namespace scene
{
    class RenderScene;
    class Model;

    namespace {
    template <class... Ts>
    struct Overloaded : Ts... {
        using Ts::operator()...;
    };
    template <class... Ts>
    Overloaded(Ts...) -> Overloaded<Ts...>;
    } // namespace

    class RayTracingScene final
    {
    public:
        RayTracingScene();
        void update(const scene::RenderScene* scene);
       
        void destroy();

        void build(const RayTracingSceneDescriptor& rtScene);

        void update(const RayTracingSceneDescriptor& rtScene);

        void update(const RayTracingSceneUpdateInfo& updateInfo);
        
        void fillBlasInfo2(gfx::AccelerationStructureInfo& blasInfo, const RayTracingInstanceDescriptor& instance) {

            if (instance.shadingGeometries.empty()) {
                return;
            }

            if (instance.shadingGeometries[0].meshDescriptor) {
                //triangle mesh
                for (const auto& shadingGeom : instance.shadingGeometries) {
                    gfx::ASTriangleMesh blasGeomMesh{};
                    fillblasGeomTriangleMesh(blasGeomMesh, shadingGeom.meshDescriptor.value());
                    blasInfo.triangleMeshes.push_back(blasGeomMesh);
                }
            } else {
                //aabb
                gfx::ASAABB blasGeomAABB{};
                blasGeomAABB.flag = gfx::ASGeometryFlagBit::GEOMETRY_OPAQUE;
                blasGeomAABB.minX = blasGeomAABB.minY = blasGeomAABB.minZ = -0.5;
                blasGeomAABB.maxX = blasGeomAABB.maxY = blasGeomAABB.maxZ = 0.5;
                blasInfo.aabbs.push_back(blasGeomAABB);
            }

            blasInfo.buildFlag = gfx::ASBuildFlagBits::ALLOW_COMPACTION | gfx::ASBuildFlagBits::PREFER_FAST_TRACE;
        }

        void fillblasGeomTriangleMesh(gfx::ASTriangleMesh& blasGeomMesh, const RayTracingMeshDescriptor& mesh) {
            blasGeomMesh.flag = gfx::ASGeometryFlagBit::GEOMETRY_OPAQUE;
            blasGeomMesh.vertexCount = mesh.vertexCount;
            blasGeomMesh.indexCount = mesh.indexCount;
            blasGeomMesh.indexBuffer = mesh.indexBuffer;
            blasGeomMesh.vertexBuffer = mesh.vertexBuffer;
            blasGeomMesh.vertexStride = mesh.vertexBuffer->getStride();
            blasGeomMesh.vertexFormat = mesh.vertexFormat;
        }

    protected:
        AccelerationStructurePtr _topLevelAccelerationStructure;

        /*
         * first: model's uuid
         * second:
         *  first: is alive
         *  second: Acceleration Structure Instance obj
         */
        ccstd::unordered_map<ccstd::string,std::pair<bool,gfx::ASInstance>> _modelCache;

        //ccstd::unordered_map<std::pair<uint64_t,std::vector<uint64_t>>, std::pair<IntrusivePtr<gfx::AccelerationStructure>, uint64_t>> _shadingBlasMap;
         
        pipeline::GlobalDSManager* _globalDSManager{nullptr};
        
    private:

        bool needRebuild = false;
        bool needUpdate = false;
        bool needRecreate = false;

        bool use_ray_query = true;

        RayTracingSceneAccelerationStructureManager accelerationStructureManager;

        RayQueryBindingTable rqBinding;
        RayTracingBindingTable rtBinding;

        inline void handleNewModel(const IntrusivePtr<scene::Model>& model);
        inline void handleModel(const IntrusivePtr<scene::Model>& model);

        gfx::ASInstance addInstance(const RayTracingInstanceDescriptor& instance) {
            gfx::ASInstance asInstanceInfo{};
            asInstanceInfo.mask = instance.mask;
            asInstanceInfo.flags = instance.flags;
            asInstanceInfo.transform = instance.transform;

            gfx::AccelerationStructureInfo blasInfo{};

            fillBlasInfo2(blasInfo, instance);
            asInstanceInfo.accelerationStructureRef = accelerationStructureManager.registry(blasInfo);

            if (use_ray_query) {
                asInstanceInfo.instanceCustomIdx = rqBinding.registry(instance.shadingGeometries);
            }else {
                asInstanceInfo.shaderBindingTableRecordOffset = rtBinding.registry(instance.shadingGeometries);
            }

            return asInstanceInfo;
        }
    };
} // namespace pipeline
} // namespace cc
