#pragma once

#include "renderer/gfx-base/GFXAccelerationStructure.h"
#include "base/Ptr.h"
#include "gfx-base/GFXBuffer.h"
#include <queue>

namespace cc {
namespace scene {

class RenderScene;
class Model;

struct RayTracingMeshDescriptor final {
    IntrusivePtr<gfx::Buffer> vertexBuffer;
    IntrusivePtr<gfx::Buffer> indexBuffer;
    uint32_t vertexCount;
    uint32_t indexCount;
    gfx::Format vertexFormat;
};

struct RayTracingGeometryShadingDescriptor final {
    std::optional<RayTracingMeshDescriptor> meshDescriptor;
    uint32_t materialID{};
    uint64_t shaderGroupHandle{};
};

struct RayTracingInstanceDescriptor final {
    uint32_t instanceCustomIdx;
    uint32_t mask;
    gfx::GeometryInstanceFlags flags;
    Mat4 transform;
    ccstd::vector<RayTracingGeometryShadingDescriptor> shadingGeometries;
    ccstd::string uuid;
    bool changed;
};

struct RayTracingSceneDescriptor final {
    ccstd::vector<RayTracingInstanceDescriptor> instances;
};

struct RayTracingSceneAddInstanceEvent final{
    RayTracingInstanceDescriptor instDescriptor;
};

struct RayTracingSceneRemoveInstanceEvent final{
    uint32_t instIdx;
};

struct RayTracingSceneMoveInstanceEvent final{
    Mat4& transform;
    uint32_t instIdx;
};

using RayTracingUpdateEvent = std::variant<RayTracingSceneAddInstanceEvent, RayTracingSceneRemoveInstanceEvent, RayTracingSceneMoveInstanceEvent>;

struct RayTracingSceneUpdateInfo {
    ccstd::vector<RayTracingUpdateEvent> events;
};

using AccelerationStructurePtr = IntrusivePtr<gfx::AccelerationStructure>;

struct RayTracingSceneAccelerationStructureManager final {

    std::optional<AccelerationStructurePtr> checkExistingBlas(const gfx::AccelerationStructureInfo& info) {
        for (const auto & r : _geomBlasRecords) {
            if (r.first == info) {
                return r.second;
            }
        }
        return {};
    }
;
    AccelerationStructurePtr registry(const gfx::AccelerationStructureInfo& info) {

        if (auto result = checkExistingBlas(info)) {
            return result.value();
        }

        return createBlas(info);
    }

private:

    using AccelerationStructureRecord = std::pair<gfx::AccelerationStructureInfo,AccelerationStructurePtr>;

    ccstd::vector<AccelerationStructureRecord> _geomBlasRecords;

    AccelerationStructurePtr createBlas(const gfx::AccelerationStructureInfo& info) {
        auto blas = gfx::Device::getInstance()->createAccelerationStructure(info);
        blas->build();
        blas->compact();
        _geomBlasRecords.emplace_back(info, blas);
        return blas;
    }
};

enum class AllocationPolicy {
    // No fragment management
    MONOTONIC_STACK,
    //Sequential - Not very suit for real-time application
    BEST_FIT,
    WORST_FIT,
    FIRST_FIT,
    NEXT_FIT,

    //Segregated
    FAST_FIT,

    //Buddy Systems - Need predefining max size
    BUDDY,

    //Indexed
    INDEXED_FIT,
    HALF_FIT,

};

template <typename BlockType, typename Derived>
struct ArenaAllocatorBase {
    static_assert(std::is_trivially_copyable<BlockType>::value);
    static_assert(!std::is_abstract<BlockType>::value);
    using ConsecutiveBlocks = std::vector<BlockType>;

    int allocate(const ConsecutiveBlocks& blocks) {
        int offset = -1;
        if (static_cast<Derived*>(this)->use_avaiable_free_blocks(blocks.size(), offset)) {
            std::copy(blocks.cbegin(), blocks.cend(), _blocks.begin() + offset);
            return offset;
        }
        offset = this->_blocks.size();
        this->_blocks.insert(this->_blocks.end(), blocks.cbegin(), blocks.cend());
        return offset;
    }

    void deallocate(const int offset, const size_t size) {
        static_cast<Derived*>(this)->add_free_blocks(offset, size);
    }

    auto data() const {
        return _blocks.data();
    }

    auto size() const {
        return _blocks.size();
    }

protected:
    ConsecutiveBlocks _blocks;
};

template <typename BlockType, AllocationPolicy policy = AllocationPolicy::FIRST_FIT>
struct ArenaAllocator {};

#define ARENA_ALLOCATOR_DEFINITION_START(policy) template <typename BlockType> \
struct ArenaAllocator<BlockType, policy> : ArenaAllocatorBase<BlockType, ArenaAllocator<BlockType, (policy)>> {
#define ARENA_ALLOCATOR_DEFINITION_END(policy) \
    }                                          \
    ;

/***********************************************************
 *  Monotonic Stack Policy
 ***********************************************************/
ARENA_ALLOCATOR_DEFINITION_START(AllocationPolicy::MONOTONIC_STACK)
bool use_avaiable_free_blocks(const int size, int& offset) {
    return false;
}

void add_free_blocks(const int offset, const int size) {

}
ARENA_ALLOCATOR_DEFINITION_END(AllocationPolicy::MONOTONIC_STACK)

/***********************************************************
 *  Best Fit Policy
 ***********************************************************/

ARENA_ALLOCATOR_DEFINITION_START(AllocationPolicy::BEST_FIT)

struct customLess {
    bool operator()(const std::pair<int, int>& l, const std::pair<int, int>& r) const {
        return l.second - l.first > r.second - r.first;
    }
};

bool use_avaiable_free_blocks(const int size, int& offset) {
    std::priority_queue<std::pair<int, int>, std::vector<std::pair<int, int>>, customLess> new_map;
    bool find = false;
    for (; !free_blocks_max_heap.empty(); free_blocks_max_heap.pop()) {
        std::pair<int, int> fb = free_blocks_max_heap.top();
        if (fb.second - fb.first > size) {
            find = true;
            offset = fb.first;
            fb.first += size;
            if (fb.first < fb.second) {
                new_map.push(fb);
            }
        } else {
            new_map.push(fb);
        }
    }
    free_blocks_max_heap = new_map;
    return find;
}

void add_free_blocks(const int offset, const int size) {
}

private:
std::priority_queue<std::pair<int, int>, std::vector<std::pair<int, int>>, customLess> free_blocks_max_heap{};
ARENA_ALLOCATOR_DEFINITION_END(AllocationPolicy::BEST_FIT)

/***********************************************************
 *  Worst Fit Policy
 ***********************************************************/

ARENA_ALLOCATOR_DEFINITION_START(AllocationPolicy::WORST_FIT)

bool use_avaiable_free_blocks(const int size, int& offset) {
    return false;
}

void add_free_blocks(const int offset, const int size) {
}

struct customGreater {
    bool operator()(const std::pair<int, int>& l, const std::pair<int, int>& r) const {
        return l.second - l.first < r.second - r.first;
    }
};

private:
std::priority_queue<std::pair<int, int>, std::vector<std::pair<int, int>>, customGreater> free_blocks_min_heap;

ARENA_ALLOCATOR_DEFINITION_END(AllocationPolicy::WORST_FIT)

/***********************************************************
 *  First Fit Policy
 ***********************************************************/

ARENA_ALLOCATOR_DEFINITION_START(AllocationPolicy::FIRST_FIT)

bool use_avaiable_free_blocks(const int size, int& offset) {
    for (auto free_block_it = free_blocks_list.begin(); free_block_it != free_blocks_list.end(); ++free_block_it) {
        assert(free_block_it->second >= free_block_it->first);
        if (free_block_it->second - free_block_it->first + 1 >= size) {
            free_block_it->first += size;
            if (free_block_it->first >= free_block_it->second) {
                free_blocks_list.erase(free_block_it);
            }
            return true;
        }
    }
    return false;
}

void add_free_blocks(const int offset, const int size) {
    if (!merge_free_blocks(offset, offset + size)) {
        free_blocks_list.emplace_back(offset, offset + size);
    }
}

private:
bool merge_free_blocks(int start, int end) {
    auto front_merge_target = free_blocks_list.end();
    auto rear_merge_target = free_blocks_list.end();

    for (auto fb = free_blocks_list.begin(); fb != free_blocks_list.end(); ++fb) {
        if (fb->second == start - 1) {
            fb->second = end;
            front_merge_target = fb;
        }

        if (fb->first == end + 1) {
            fb->first = start;
            rear_merge_target = fb;
        }
    }

    if (front_merge_target == free_blocks_list.end() && rear_merge_target == free_blocks_list.end()) {
        return false;
    }

    if (front_merge_target != free_blocks_list.end() && rear_merge_target != free_blocks_list.end()) {
        front_merge_target->second = rear_merge_target->second;
        free_blocks_list.erase(rear_merge_target);
    }

    return true;
}

std::list<std::pair<int, int>> free_blocks_list;
ARENA_ALLOCATOR_DEFINITION_END(AllocationPolicy::FIRST_FIT)

/***********************************************************
 *  Next Fit Policy
 ***********************************************************/

ARENA_ALLOCATOR_DEFINITION_START(AllocationPolicy::NEXT_FIT)

// todo may need a circle list

ARENA_ALLOCATOR_DEFINITION_END(AllocationPolicy::NEXT_FIT)

struct SubMeshGeomDescriptor final {
    uint64_t indexAddress{0};
    uint64_t vertexAddress{0};

    bool operator==(const SubMeshGeomDescriptor& other) const noexcept {
        return indexAddress == other.indexAddress && vertexAddress == other.vertexAddress;
    }
};

using MeshGeometriesDescriptor = ccstd::vector<SubMeshGeomDescriptor>;

using MeshMaterialsDescriptor = ccstd::vector<uint32_t>;

struct MeshShadingDescriptor final {
    // The first submesh geometry position of the Mesh
    uint16_t subMeshGeometryOffset{0};
    // The first submesh material position of the Mesh
    uint16_t subMeshMaterialOffset{0};
    uint16_t subMeshCount{0};
    uint16_t padding{0};

    bool operator==(const MeshShadingDescriptor& other) const noexcept {
        return subMeshCount == other.subMeshCount &&
               subMeshGeometryOffset == other.subMeshGeometryOffset &&
               subMeshMaterialOffset == other.subMeshMaterialOffset;
    }
};

/*
   Definition:
       G = {g1, g2, ...} as all geometries of the model
       M = {m1, m2, ...} as all materials of the model
       T as the transform of the model
       I = {G,M,T} as a unique instance in the scene

   For I1 = {G1,M1,T1} and I2 = {G2,M2,T2}
       iff G1 = G2, then BLAS could be shared.
       iff G1 = G2 and M1 = M2, then MeshShadingDescriptor could be shared.
*/

struct RayQueryBindingTable final {
private:

    using BindingRecordOffsetType = int;
    using BindingRecordRefCountType = int;

    template<typename T>
    using BindingRecord = std::tuple<T,BindingRecordOffsetType,BindingRecordRefCountType>;

    // instanceDecs.geometryOffset + geometryIndex
    /*
     * IA n ：index address of the nth geometry
     * VA n : vertex address of the nth geometry
     *
     * |---------0---------||----2----||---------3---------||--------------5--------------||--------------8--------------||---11----||--------12---------|  geom_offset
     * |----0----|----1----||----2----||----3----|----4----||----5----|----6----|----7----||----8----|----9----|---10----||---11----||---12----|---13----|
     * |IA 0|VA 0|IA 1|VA 1||IA 0|VA 0||IA 0|VA 0|IA 1|VA 1||IA 0|VA 0|IA 1|VA 1|IA 2|VA 2||IA 0|VA 0|IA 1|VA 1|IA 2|VA 2||IA 0|VA 0||IA 0|VA 0|IA 1|VA 1|
     * |-------------------||---------||-------------------||-----------------------------||-----------------------------||---------||-------------------|
     */

    // MonotonicPool<SubMeshGeomDescriptor, true> _geomDesc;
    ArenaAllocator<SubMeshGeomDescriptor> _geomDesc;
    ccstd::vector<BindingRecord<ccstd::vector<SubMeshGeomDescriptor>>> _geomDescLUT;

    /*
     * matID n : matID of the nth geometry
     *
     * |-------0-------||---2---||-------3-------||-----------5-----------||-----------8-----------||--11---||------12-------|  material_offset
     * |---0---|---1---||---2---||---3---|---4---||---5---|---6---|---7---||---8---|---9---|--10---||--11---||--12---|--13---|
     * |matID 0|matID 1||matID 0||matID 0|matID 1||matID 0|matID 1|matID 2||matID 0|matID 1|matID 2||matID 0||matID 0|matID 1|
     * |---------------||-------||---------------||-----------------------||-----------------------||-------||---------------|
     */

    // MonotonicPool<uint64_t,true> _materialDesc;
    ArenaAllocator<uint64_t> _materialDesc;
    ccstd::vector<BindingRecord<ccstd::vector<uint64_t>>> _materialDescLUT;

    /* |----------------------------------------------||----------------------------------------------||----------------------------------------------|
     * |-------------------descriptor 0---------------||-------------------descriptor 1---------------||-------------------descriptor 2---------------| instanceCustomIndex
     * |geom_offset|material_offset|geom_count|padding||geom_offset|material_offset|geom_count|padding||geom_offset|material_offset|geom_count|padding|
     * |----------------------------------------------||----------------------------------------------||----------------------------------------------|
     */

    // MonotonicPool<MeshShadingDescriptor> _shadingInstanceDescriptors;
    ArenaAllocator<MeshShadingDescriptor> _shadingInstanceDescriptors;
    ccstd::vector<BindingRecord<MeshShadingDescriptor>> _shadingInstanceDescriptorsLUT;

    uint16_t registrySubmeshes(const ccstd::vector<SubMeshGeomDescriptor>& subMeshes);

    uint16_t registryMaterials(const ccstd::vector<uint64_t>& materials);

    void unregistrySubmeshes(const int offset) noexcept {
        for (auto it = _geomDescLUT.begin();it!=_geomDescLUT.end();++it) {
            if (std::get<1>(*it) == offset) {
                std::get<2>(*it)--;
                if (std::get<2>(*it) == 0) {
                    _geomDesc.deallocate(offset, std::get<0>(*it).size());
                    _geomDescLUT.erase(it);
                }
                break;
            }
        }

    }

    void unregistryMaterials(const int offset) noexcept {
        for (auto it =_materialDescLUT.begin(); it != _materialDescLUT.end(); ++it) {
            if (std::get<1>(*it) == offset) {
                std::get<2>(*it)--;
                if (std::get<2>(*it) == 0) {
                    _materialDesc.deallocate(offset, std::get<0>(*it).size());
                    _materialDescLUT.erase(it);
                }
                break;
            }
        }
    }

public:
    IntrusivePtr<gfx::Buffer> _geomDescGPUBuffer;
    IntrusivePtr<gfx::Buffer> _materialDescGPUBuffer;
    IntrusivePtr<gfx::Buffer> _instanceDescGPUBuffer;

    uint32_t registry(const ccstd::vector<RayTracingGeometryShadingDescriptor>& shadingGeometries);

    void unregistry(const gfx::ASInstance& a) {
        for (auto it = _shadingInstanceDescriptorsLUT.begin();it!=_shadingInstanceDescriptorsLUT.end();++it) {
            if (std::get<1>(*it) == a.instanceCustomIdx) {
                std::get<2>(*it)--;
                if (std::get<2>(*it) == 0) {
                    _shadingInstanceDescriptors.deallocate(a.instanceCustomIdx, 1);
                    auto& descriptor = std::get<0>(*it);
                    unregistrySubmeshes(descriptor.subMeshGeometryOffset);
                    unregistryMaterials(descriptor.subMeshMaterialOffset);
                    _shadingInstanceDescriptorsLUT.erase(it);
                }
                break;
            }
        }
    }

    void recreate();

    void update() {
        _geomDescGPUBuffer->update(_geomDesc.data());
        _materialDescGPUBuffer->update(_materialDesc.data());
        _instanceDescGPUBuffer->update(_shadingInstanceDescriptors.data());
    }

};

/*
 * first: subMesh Geometry info descriptor
 * second: material identifier
 */

struct ShaderRecord final {
    uint64_t shaderGroupHandle;
    SubMeshGeomDescriptor geom;
    uint32_t matID;
};

/*
 * IA n ：index address of the nth geometry
 * VA n : vertex address of the nth geometry
 * matID n : matID of the nth geometry
 *
 * |-----------------0-----------------||--------2--------||-----------------3-----------------||--------------------------5--------------------------|  SBTRecordOffset
 * |--------0--------|--------1--------||--------2--------||--------3--------|--------4--------||--------5--------|--------6--------|--------7--------|
 * |IA 0|VA 0|matID 0|IA 1|VA 1|matID 1||IA 0|VA 0|matID 0||IA 0|VA 0|matID 0|IA 1|VA 1|matID 1||IA 0|VA 0|matID 0|IA 1|VA 1|matID 1|IA 2|VA 2|matID 2|
 * |-----------------------------------||-----------------||-----------------------------------||-----------------------------------------------------|
 */

struct RayTracingBindingTable final{

    using ShaderRecordList = ArenaAllocator<ShaderRecord>;

    ShaderRecordList _hitGroup;
    IntrusivePtr<gfx::Buffer> _bingTableGPUBuffer;

    uint32_t registry(const ccstd::vector<RayTracingGeometryShadingDescriptor>& shadingGeometries) {
        ccstd::vector<ShaderRecord> shaderRecords;
        shaderRecords.reserve(shadingGeometries.size());
        std::transform(shadingGeometries.cbegin(), shadingGeometries.cend(), std::back_inserter(shaderRecords), [&](const RayTracingGeometryShadingDescriptor& geom) {
            const auto& meshDescriptor = geom.meshDescriptor;
            if (meshDescriptor) {
                return ShaderRecord{0,SubMeshGeomDescriptor{meshDescriptor.value().indexBuffer->getDeviceAddress(), meshDescriptor.value().vertexBuffer->getDeviceAddress()},geom.materialID};
            }
            return ShaderRecord{0,SubMeshGeomDescriptor{~0U, ~0U}, geom.materialID};
        });
        return _hitGroup.allocate(shaderRecords);
    }

    void unregistry(const gfx::ASInstance& a) {
        const auto offset = a.shaderBindingTableRecordOffset;
        const auto size = a.accelerationStructureRef->getInfo().triangleMeshes.size();
        _hitGroup.deallocate(offset, size);
    }
};

} // namespace scene
} // namespace cc
