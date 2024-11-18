/****************************************************************************
 Copyright (c) 2022-2024 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

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

#pragma once
#include "FGDispatcherTypes.h"
#include "LayoutGraphTypes.h"
#include "NativePipelineTypes.h"
#include "RenderGraphTypes.h"

namespace cc {

namespace render {

constexpr uint32_t INVALID_ID = 0xFFFFFFFF;
constexpr gfx::Color RASTER_COLOR{0.0, 1.0, 0.0, 1.0};
constexpr gfx::Color RASTER_UPLOAD_COLOR{1.0, 1.0, 0.0, 1.0};
constexpr gfx::Color RENDER_QUEUE_COLOR{0.0, 0.5, 0.5, 1.0};
constexpr gfx::Color COMPUTE_COLOR{0.0, 0.0, 1.0, 1.0};

inline gfx::MarkerInfo makeMarkerInfo(const char* str, const gfx::Color& color) {
    return gfx::MarkerInfo{str, color};
}

struct RenderGraphVisitorContext {
    RenderGraphVisitorContext(RenderGraphVisitorContext&&) = delete;
    RenderGraphVisitorContext(RenderGraphVisitorContext const&) = delete;
    RenderGraphVisitorContext& operator=(RenderGraphVisitorContext&&) = delete;
    RenderGraphVisitorContext& operator=(RenderGraphVisitorContext const&) = delete;

    NativeRenderContext& context;
    LayoutGraphData& lg;
    const RenderGraph& g;
    ResourceGraph& resourceGraph;
    const FrameGraphDispatcher& fgd;
    const ccstd::pmr::vector<bool>& validPasses;
    gfx::Device* device = nullptr;
    gfx::CommandBuffer* cmdBuff = nullptr;
    NativePipeline* ppl = nullptr;
    ccstd::pmr::unordered_map<
        RenderGraph::vertex_descriptor,
        PmrFlatMap<NameLocalID, ResourceGraph::vertex_descriptor>>& perPassResourceIndex;
    ccstd::pmr::unordered_map<
        RenderGraph::vertex_descriptor,
        std::tuple<gfx::DescriptorSet*, gfx::DescriptorSet*>>& renderGraphDescriptorSet;
    ccstd::pmr::unordered_map<
        RenderGraph::vertex_descriptor, gfx::DescriptorSet*>& uiDescriptorSet;
    ccstd::pmr::unordered_map<
        RenderGraph::vertex_descriptor,
        gfx::DescriptorSet*>& profilerPerPassDescriptorSets;
    ccstd::pmr::unordered_map<
        RenderGraph::vertex_descriptor,
        gfx::DescriptorSet*>& perInstanceDescriptorSets;
    ProgramLibrary* programLib = nullptr;
    ccstd::pmr::vector<ccstd::optional<gfx::Viewport>>& viewportStack;
    CustomRenderGraphContext customContext;
    boost::container::pmr::memory_resource* scratch = nullptr;
    gfx::RenderPass* currentPass = nullptr;
    uint32_t subpassIndex = 0;
    RenderGraph::vertex_descriptor currentInFlightPassID = RenderGraph::null_vertex();
    Mat4 currentProjMatrix;
};

} // namespace render

} // namespace cc
