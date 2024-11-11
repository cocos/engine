/****************************************************************************
 Copyright (c) 2019-2023 Xiamen Yaji Software Co., Ltd.

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

#include "GLES2Std.h"

#include "GLES2Buffer.h"
#include "GLES2CommandBuffer.h"
#include "GLES2Commands.h"
#include "GLES2DescriptorSet.h"
#include "GLES2DescriptorSetLayout.h"
#include "GLES2Device.h"
#include "GLES2Framebuffer.h"
#include "GLES2GPUObjects.h"
#include "GLES2InputAssembler.h"
#include "GLES2PipelineLayout.h"
#include "GLES2PipelineState.h"
#include "GLES2PrimaryCommandBuffer.h"
#include "GLES2QueryPool.h"
#include "GLES2Queue.h"
#include "GLES2RenderPass.h"
#include "GLES2Shader.h"
#include "GLES2Swapchain.h"
#include "GLES2Texture.h"
#include "base/memory/Memory.h"
#include "profiler/Profiler.h"
#include "states/GLES2Sampler.h"
#include "GLES2AccelerationStructure.h"

// when capturing GLES commands (RENDERDOC_HOOK_EGL=1, default value)
// renderdoc doesn't support this extension during replay
#define ALLOW_MULTISAMPLED_RENDER_TO_TEXTURE_ON_DESKTOP 0

namespace cc {
namespace gfx {

GLES2Device *GLES2Device::instance = nullptr;

GLES2Device *GLES2Device::getInstance() {
    return GLES2Device::instance;
}

GLES2Device::GLES2Device() {
    _api = API::GLES2;
    _deviceName = "GLES2";

    GLES2Device::instance = this;
}

GLES2Device::~GLES2Device() {
    GLES2Device::instance = nullptr;
}

bool GLES2Device::doInit(const DeviceInfo & /*info*/) {
    _gpuContext = ccnew GLES2GPUContext;
    _gpuStateCache = ccnew GLES2GPUStateCache;
    _gpuBlitManager = ccnew GLES2GPUBlitManager;
    _gpuFramebufferHub = ccnew GLES2GPUFramebufferHub;
    _gpuConstantRegistry = ccnew GLES2GPUConstantRegistry;
    _gpuFramebufferCacheMap = ccnew GLES2GPUFramebufferCacheMap(_gpuStateCache);

    if (!_gpuContext->initialize(_gpuStateCache, _gpuConstantRegistry)) {
        destroy();
        return false;
    };

    _bindingMappings.blockOffsets.resize(_bindingMappingInfo.setIndices.size());
    _bindingMappings.samplerTextureOffsets.resize(_bindingMappingInfo.setIndices.size());
    for (size_t i = 0; i < _bindingMappingInfo.setIndices.size(); ++i) {
        uint32_t curSet{_bindingMappingInfo.setIndices[i]};
        uint32_t prevSet{i ? _bindingMappingInfo.setIndices[i - 1] : curSet};
        // accumulate the per set offset according to the specified capacity
        _bindingMappings.blockOffsets[curSet] = i ? static_cast<int32_t>(_bindingMappingInfo.maxBlockCounts[prevSet]) + _bindingMappings.blockOffsets[prevSet] : 0;
        _bindingMappings.samplerTextureOffsets[curSet] = i ? static_cast<int32_t>(_bindingMappingInfo.maxSamplerTextureCounts[prevSet]) + _bindingMappings.samplerTextureOffsets[prevSet] : 0;
    }
    for (uint32_t curSet : _bindingMappingInfo.setIndices) {
        // textures always come after UBOs
        _bindingMappings.samplerTextureOffsets[curSet] -= static_cast<int32_t>(_bindingMappingInfo.maxBlockCounts[curSet]);
    }
    _bindingMappings.flexibleSet = _bindingMappingInfo.setIndices.back();

    ccstd::string extStr = reinterpret_cast<const char *>(glGetString(GL_EXTENSIONS));
    _extensions = StringUtil::split(extStr, " ");

    _multithreadedCommandRecording = false;

    initFormatFeature();

    if (checkExtension("element_index_uint")) {
        _features[toNumber(Feature::ELEMENT_INDEX_UINT)] = true;
    }

    if (checkExtension("draw_buffers")) {
        _features[toNumber(Feature::MULTIPLE_RENDER_TARGETS)] = true;
        glGetIntegerv(GL_MAX_DRAW_BUFFERS_EXT, reinterpret_cast<GLint *>(&_caps.maxColorRenderTargets));
    }

    if (checkExtension("blend_minmax")) {
        _features[toNumber(Feature::BLEND_MINMAX)] = true;
    }

    _gpuConstantRegistry->useVAO = checkExtension("vertex_array_object");
    _gpuConstantRegistry->useDrawInstanced = checkExtension("draw_instanced");
    _gpuConstantRegistry->useInstancedArrays = checkExtension("instanced_arrays");
    _gpuConstantRegistry->useDiscardFramebuffer = checkExtension("discard_framebuffer");

    _features[toNumber(Feature::INSTANCED_ARRAYS)] = _gpuConstantRegistry->useInstancedArrays;
    _features[toNumber(Feature::RASTERIZATION_ORDER_NOCOHERENT)] = false;

    ccstd::string fbfLevelStr = "NONE";
    // PVRVFrame has issues on their support
#ifndef ENABLE_GLES2_SUBPASS
    _features[toNumber(Feature::INPUT_ATTACHMENT_BENEFIT)] = false;
    _features[toNumber(Feature::SUBPASS_COLOR_INPUT)] = false;
    _features[toNumber(Feature::SUBPASS_DEPTH_STENCIL_INPUT)] = false;
    _features[toNumber(Feature::RASTERIZATION_ORDER_NOCOHERENT)] = false;
#elif CC_PLATFORM != CC_PLATFORM_WINDOWS
    if (checkExtension("framebuffer_fetch")) {
        ccstd::string nonCoherent = "framebuffer_fetch_non";

        auto it = std::find_if(_extensions.begin(), _extensions.end(), [&nonCoherent](auto &ext) {
            return ext.find(nonCoherent) != ccstd::string::npos;
        });

        if (it != _extensions.end()) {
            if (*it == CC_TOSTR(GL_EXT_shader_framebuffer_fetch_non_coherent)) {
                _gpuConstantRegistry->mFBF = FBFSupportLevel::NON_COHERENT_EXT;
                fbfLevelStr = "NON_COHERENT_EXT";
                _features[toNumber(Feature::RASTERIZATION_ORDER_NOCOHERENT)] = true;
            } else if (*it == CC_TOSTR(GL_QCOM_shader_framebuffer_fetch_noncoherent)) {
                _gpuConstantRegistry->mFBF = FBFSupportLevel::NON_COHERENT_QCOM;
                fbfLevelStr = "NON_COHERENT_QCOM";
                GL_CHECK(glEnable(GL_FRAMEBUFFER_FETCH_NONCOHERENT_QCOM));
                _features[toNumber(Feature::RASTERIZATION_ORDER_NOCOHERENT)] = true;
            }
        } else if (checkExtension(CC_TOSTR(GL_EXT_shader_framebuffer_fetch))) {
            // we only care about EXT_shader_framebuffer_fetch, the ARM version does not support MRT
            _gpuConstantRegistry->mFBF = FBFSupportLevel::COHERENT;
            fbfLevelStr = "COHERENT";
        }
        _features[toNumber(Feature::INPUT_ATTACHMENT_BENEFIT)] = _gpuConstantRegistry->mFBF != FBFSupportLevel::NONE;
        _features[toNumber(Feature::SUBPASS_COLOR_INPUT)] = true;
    }

    if (checkExtension(CC_TOSTR(ARM_shader_framebuffer_fetch_depth_stencil))) {
        _features[toNumber(Feature::SUBPASS_DEPTH_STENCIL_INPUT)] = true;
        fbfLevelStr += "_DEPTH_STENCIL";
    }
#endif

#if CC_PLATFORM != CC_PLATFORM_WINDOWS || ALLOW_MULTISAMPLED_RENDER_TO_TEXTURE_ON_DESKTOP
    if (checkExtension("multisampled_render_to_texture")) {
        if (checkExtension("multisampled_render_to_texture2")) {
            _gpuConstantRegistry->mMSRT = MSRTSupportLevel::LEVEL2;
        } else {
            _gpuConstantRegistry->mMSRT = MSRTSupportLevel::LEVEL1;
        }
    }
#endif
    _features[toNumber(Feature::MULTI_SAMPLE_RESOLVE_DEPTH_STENCIL)] = false; // not implement yet.

    if (checkExtension(CC_TOSTR(GL_EXT_debug_marker))) {
        _gpuConstantRegistry->debugMarker = true;
    }

    ccstd::string compressedFmts;
    if (getFormatFeatures(Format::ETC_RGB8) != FormatFeature::NONE) {
        compressedFmts += "etc1 ";
    }

    if (getFormatFeatures(Format::PVRTC_RGB2) != FormatFeature::NONE) {
        compressedFmts += "pvrtc ";
    }

    if (getFormatFeatures(Format::ASTC_RGBA_4X4) != FormatFeature::NONE) {
        compressedFmts += "astc ";
    }

    _renderer = reinterpret_cast<const char *>(glGetString(GL_RENDERER));
    _vendor = reinterpret_cast<const char *>(glGetString(GL_VENDOR));
    _version = reinterpret_cast<const char *>(glGetString(GL_VERSION));

    glGetIntegerv(GL_MAX_VERTEX_ATTRIBS, reinterpret_cast<GLint *>(&_caps.maxVertexAttributes));
    glGetIntegerv(GL_MAX_VERTEX_UNIFORM_VECTORS, reinterpret_cast<GLint *>(&_caps.maxVertexUniformVectors));
    glGetIntegerv(GL_MAX_FRAGMENT_UNIFORM_VECTORS, reinterpret_cast<GLint *>(&_caps.maxFragmentUniformVectors));
    glGetIntegerv(GL_MAX_TEXTURE_IMAGE_UNITS, reinterpret_cast<GLint *>(&_caps.maxTextureUnits));
    glGetIntegerv(GL_MAX_VERTEX_TEXTURE_IMAGE_UNITS, reinterpret_cast<GLint *>(&_caps.maxVertexTextureUnits));
    glGetIntegerv(GL_MAX_TEXTURE_SIZE, reinterpret_cast<GLint *>(&_caps.maxTextureSize));
    glGetIntegerv(GL_MAX_CUBE_MAP_TEXTURE_SIZE, reinterpret_cast<GLint *>(&_caps.maxCubeMapTextureSize));
    _caps.uboOffsetAlignment = 16;

    if (checkExtension("GL_OES_texture_3D")) {
        glGetIntegerv(GL_MAX_3D_TEXTURE_SIZE_OES, reinterpret_cast<GLint *>(&_caps.max3DTextureSize));
        // texture2DArray fallback to texture3DOES
        _caps.maxArrayTextureLayers = _caps.max3DTextureSize;
    } else {
        _caps.max3DTextureSize = 0;
        _caps.maxArrayTextureLayers = 0;
    }

    QueueInfo queueInfo;
    queueInfo.type = QueueType::GRAPHICS;
    _queue = createQueue(queueInfo);

    QueryPoolInfo queryPoolInfo{QueryType::OCCLUSION, DEFAULT_MAX_QUERY_OBJECTS, true};
    _queryPool = createQueryPool(queryPoolInfo);

    CommandBufferInfo cmdBuffInfo;
    cmdBuffInfo.type = CommandBufferType::PRIMARY;
    cmdBuffInfo.queue = _queue;
    _cmdBuff = createCommandBuffer(cmdBuffInfo);

    _gpuStateCache->initialize(_caps.maxTextureUnits, _caps.maxVertexAttributes);
    _gpuBlitManager->initialize();

    CC_LOG_INFO("GLES2 device initialized.");
    CC_LOG_INFO("RENDERER: %s", _renderer.c_str());
    CC_LOG_INFO("VENDOR: %s", _vendor.c_str());
    CC_LOG_INFO("VERSION: %s", _version.c_str());
    CC_LOG_INFO("COMPRESSED_FORMATS: %s", compressedFmts.c_str());
    CC_LOG_INFO("USE_VAO: %s", _gpuConstantRegistry->useVAO ? "true" : "false");
    CC_LOG_INFO("FRAMEBUFFER_FETCH: %s", fbfLevelStr.c_str());

    return true;
}

void GLES2Device::doDestroy() {
    _gpuBlitManager->destroy();

    CC_SAFE_DELETE(_stagingBuffer);
    CC_SAFE_DELETE(_gpuFramebufferCacheMap)
    CC_SAFE_DELETE(_gpuConstantRegistry)
    CC_SAFE_DELETE(_gpuFramebufferHub)
    CC_SAFE_DELETE(_gpuBlitManager)
    CC_SAFE_DELETE(_gpuStateCache)

    CC_ASSERT(!_memoryStatus.bufferSize);  // Buffer memory leaked.
    CC_ASSERT(!_memoryStatus.textureSize); // Texture memory leaked.

    CC_SAFE_DESTROY_AND_DELETE(_cmdBuff)
    CC_SAFE_DESTROY_AND_DELETE(_queryPool)
    CC_SAFE_DESTROY_AND_DELETE(_queue)
    CC_SAFE_DESTROY_AND_DELETE(_gpuContext)
}

void GLES2Device::acquire(Swapchain *const *swapchains, uint32_t count) {
    _gpuContext->makeCurrent();

    if (_onAcquire) _onAcquire->execute();

    _swapchains.clear();
    for (uint32_t i = 0; i < count; ++i) {
        _swapchains.push_back(static_cast<GLES2Swapchain *>(swapchains[i])->gpuSwapchain());
    }
}

void GLES2Device::present() {
    CC_PROFILE(GLES2DevicePresent);
    auto *queue = static_cast<GLES2Queue *>(_queue);
    _numDrawCalls = queue->_numDrawCalls;
    _numInstances = queue->_numInstances;
    _numTriangles = queue->_numTriangles;

    for (auto *swapchain : _swapchains) {
        _gpuContext->present(swapchain);
    }

    // Clear queue stats
    queue->_numDrawCalls = 0;
    queue->_numInstances = 0;
    queue->_numTriangles = 0;
}

void GLES2Device::bindContext(bool bound) {
    _gpuContext->bindContext(bound);
}

void GLES2Device::initFormatFeature() {
    _textureExclusive.fill(true);

    const FormatFeature completeFeature = FormatFeature::RENDER_TARGET | FormatFeature::SAMPLED_TEXTURE | FormatFeature::LINEAR_FILTER;

    // builtin formatFeatures
    _formatFeatures[toNumber(Format::RGB8)] = completeFeature;
    _formatFeatures[toNumber(Format::R5G6B5)] = completeFeature;
    _textureExclusive[toNumber(Format::R5G6B5)] = false;

    _formatFeatures[toNumber(Format::RGBA8)] = completeFeature;
    _formatFeatures[toNumber(Format::RGBA4)] = completeFeature;
    _textureExclusive[toNumber(Format::RGBA4)] = false;

    _formatFeatures[toNumber(Format::RGB5A1)] = completeFeature;
    _textureExclusive[toNumber(Format::RGB5A1)] = false;

    _formatFeatures[toNumber(Format::R8)] |= FormatFeature::VERTEX_ATTRIBUTE;
    _formatFeatures[toNumber(Format::RG8)] |= FormatFeature::VERTEX_ATTRIBUTE;
    _formatFeatures[toNumber(Format::RGB8)] |= FormatFeature::VERTEX_ATTRIBUTE;
    _formatFeatures[toNumber(Format::RGBA8)] |= FormatFeature::VERTEX_ATTRIBUTE;

    _formatFeatures[toNumber(Format::R8I)] |= FormatFeature::VERTEX_ATTRIBUTE;
    _formatFeatures[toNumber(Format::RG8I)] |= FormatFeature::VERTEX_ATTRIBUTE;
    _formatFeatures[toNumber(Format::RGB8I)] |= FormatFeature::VERTEX_ATTRIBUTE;
    _formatFeatures[toNumber(Format::RGBA8I)] |= FormatFeature::VERTEX_ATTRIBUTE;

    _formatFeatures[toNumber(Format::R8UI)] |= FormatFeature::VERTEX_ATTRIBUTE;
    _formatFeatures[toNumber(Format::RG8UI)] |= FormatFeature::VERTEX_ATTRIBUTE;
    _formatFeatures[toNumber(Format::RGB8UI)] |= FormatFeature::VERTEX_ATTRIBUTE;
    _formatFeatures[toNumber(Format::RGBA8UI)] |= FormatFeature::VERTEX_ATTRIBUTE;

    _formatFeatures[toNumber(Format::R16I)] |= FormatFeature::VERTEX_ATTRIBUTE;
    _formatFeatures[toNumber(Format::RG16I)] |= FormatFeature::VERTEX_ATTRIBUTE;
    _formatFeatures[toNumber(Format::RGB16I)] |= FormatFeature::VERTEX_ATTRIBUTE;
    _formatFeatures[toNumber(Format::RGBA16I)] |= FormatFeature::VERTEX_ATTRIBUTE;

    _formatFeatures[toNumber(Format::R16UI)] |= FormatFeature::VERTEX_ATTRIBUTE;
    _formatFeatures[toNumber(Format::RG16UI)] |= FormatFeature::VERTEX_ATTRIBUTE;
    _formatFeatures[toNumber(Format::RGB16UI)] |= FormatFeature::VERTEX_ATTRIBUTE;
    _formatFeatures[toNumber(Format::RGBA16UI)] |= FormatFeature::VERTEX_ATTRIBUTE;

    _formatFeatures[toNumber(Format::R32F)] |= FormatFeature::VERTEX_ATTRIBUTE;
    _formatFeatures[toNumber(Format::RG32F)] |= FormatFeature::VERTEX_ATTRIBUTE;
    _formatFeatures[toNumber(Format::RGB32F)] |= FormatFeature::VERTEX_ATTRIBUTE;
    _formatFeatures[toNumber(Format::RGBA32F)] |= FormatFeature::VERTEX_ATTRIBUTE;

    if (checkExtension("OES_vertex_half_float")) {
        _formatFeatures[toNumber(Format::R16F)] |= FormatFeature::VERTEX_ATTRIBUTE;
        _formatFeatures[toNumber(Format::RG16F)] |= FormatFeature::VERTEX_ATTRIBUTE;
        _formatFeatures[toNumber(Format::RGB16F)] |= FormatFeature::VERTEX_ATTRIBUTE;
        _formatFeatures[toNumber(Format::RGBA16F)] |= FormatFeature::VERTEX_ATTRIBUTE;
    }

    _formatFeatures[toNumber(Format::DEPTH)] |= FormatFeature::RENDER_TARGET;
    _textureExclusive[toNumber(Format::DEPTH)] = false;

    _formatFeatures[toNumber(Format::DEPTH_STENCIL)] |= FormatFeature::RENDER_TARGET;
    _textureExclusive[toNumber(Format::DEPTH_STENCIL)] = false;

    if (checkExtension("EXT_sRGB")) {
        _formatFeatures[toNumber(Format::SRGB8)] |= completeFeature;
        _formatFeatures[toNumber(Format::SRGB8_A8)] |= completeFeature;
        _textureExclusive[toNumber(Format::SRGB8_A8)] = false;
    }

    if (checkExtension("texture_rg")) {
        _formatFeatures[toNumber(Format::R8)] |= completeFeature;
        _formatFeatures[toNumber(Format::RG8)] |= completeFeature;
    }

    if (checkExtension("texture_float")) {
        _formatFeatures[toNumber(Format::RGB32F)] |= FormatFeature::RENDER_TARGET | FormatFeature::SAMPLED_TEXTURE;
        _formatFeatures[toNumber(Format::RGBA32F)] |= FormatFeature::RENDER_TARGET | FormatFeature::SAMPLED_TEXTURE;
        if (checkExtension("texture_rg")) {
            _formatFeatures[toNumber(Format::R32F)] |= FormatFeature::RENDER_TARGET | FormatFeature::SAMPLED_TEXTURE;
            _formatFeatures[toNumber(Format::RG32F)] |= FormatFeature::RENDER_TARGET | FormatFeature::SAMPLED_TEXTURE;
        }
    }

    if (checkExtension("texture_half_float")) {
        _formatFeatures[toNumber(Format::RGB16F)] |= FormatFeature::RENDER_TARGET | FormatFeature::SAMPLED_TEXTURE;
        _formatFeatures[toNumber(Format::RGBA16F)] |= FormatFeature::RENDER_TARGET | FormatFeature::SAMPLED_TEXTURE;
        if (checkExtension("texture_rg")) {
            _formatFeatures[toNumber(Format::R16F)] |= FormatFeature::RENDER_TARGET | FormatFeature::SAMPLED_TEXTURE;
            _formatFeatures[toNumber(Format::RG16F)] |= FormatFeature::RENDER_TARGET | FormatFeature::SAMPLED_TEXTURE;
        }
    }

    if (checkExtension("color_buffer_half_float")) {
        _formatFeatures[toNumber(Format::RGB16F)] |= FormatFeature::RENDER_TARGET;
        _textureExclusive[toNumber(Format::RGB16F)] = false;
        _formatFeatures[toNumber(Format::RGBA16F)] |= FormatFeature::RENDER_TARGET;
        _textureExclusive[toNumber(Format::RGBA16F)] = false;
        if (checkExtension("texture_rg")) {
            _formatFeatures[toNumber(Format::R16F)] |= FormatFeature::RENDER_TARGET;
            _textureExclusive[toNumber(Format::R16F)] = false;
            _formatFeatures[toNumber(Format::RG16F)] |= FormatFeature::RENDER_TARGET;
            _textureExclusive[toNumber(Format::RG16F)] = false;
        }
    }

    if (checkExtension("texture_float_linear")) {
        _formatFeatures[toNumber(Format::RGB32F)] |= FormatFeature::LINEAR_FILTER;
        _formatFeatures[toNumber(Format::RGBA32F)] |= FormatFeature::LINEAR_FILTER;
        if (checkExtension("texture_rg")) {
            _formatFeatures[toNumber(Format::R32F)] |= FormatFeature::LINEAR_FILTER;
            _formatFeatures[toNumber(Format::RG32F)] |= FormatFeature::LINEAR_FILTER;
        }
    }

    if (checkExtension("OES_texture_half_float_linear")) {
        _formatFeatures[toNumber(Format::RGB16F)] |= FormatFeature::LINEAR_FILTER;
        _formatFeatures[toNumber(Format::RGBA16F)] |= FormatFeature::LINEAR_FILTER;
        if (checkExtension("texture_rg")) {
            _formatFeatures[toNumber(Format::R16F)] |= FormatFeature::LINEAR_FILTER;
            _formatFeatures[toNumber(Format::RG16F)] |= FormatFeature::LINEAR_FILTER;
        }
    }

    if (checkExtension("depth_texture")) {
        _formatFeatures[toNumber(Format::DEPTH)] |= completeFeature;
    }

    if (checkExtension("packed_depth_stencil")) {
        _formatFeatures[toNumber(Format::DEPTH_STENCIL)] |= completeFeature;
    }

    // compressed texture feature
    const FormatFeature compressedFeature = FormatFeature::SAMPLED_TEXTURE | FormatFeature::LINEAR_FILTER;
    if (checkExtension("compressed_ETC1")) {
        _formatFeatures[toNumber(Format::ETC_RGB8)] |= compressedFeature;
    }

    if (checkExtension("texture_compression_pvrtc")) {
        _formatFeatures[toNumber(Format::PVRTC_RGB2)] |= compressedFeature;
        _formatFeatures[toNumber(Format::PVRTC_RGBA2)] |= compressedFeature;
        _formatFeatures[toNumber(Format::PVRTC_RGB4)] |= compressedFeature;
        _formatFeatures[toNumber(Format::PVRTC_RGBA4)] |= compressedFeature;
    }

    if (checkExtension("texture_compression_astc")) {
        _formatFeatures[toNumber(Format::ASTC_RGBA_4X4)] |= compressedFeature;
        _formatFeatures[toNumber(Format::ASTC_RGBA_5X4)] |= compressedFeature;
        _formatFeatures[toNumber(Format::ASTC_RGBA_5X5)] |= compressedFeature;
        _formatFeatures[toNumber(Format::ASTC_RGBA_6X5)] |= compressedFeature;
        _formatFeatures[toNumber(Format::ASTC_RGBA_6X6)] |= compressedFeature;
        _formatFeatures[toNumber(Format::ASTC_RGBA_8X5)] |= compressedFeature;
        _formatFeatures[toNumber(Format::ASTC_RGBA_8X6)] |= compressedFeature;
        _formatFeatures[toNumber(Format::ASTC_RGBA_8X8)] |= compressedFeature;
        _formatFeatures[toNumber(Format::ASTC_RGBA_10X5)] |= compressedFeature;
        _formatFeatures[toNumber(Format::ASTC_RGBA_10X6)] |= compressedFeature;
        _formatFeatures[toNumber(Format::ASTC_RGBA_10X8)] |= compressedFeature;
        _formatFeatures[toNumber(Format::ASTC_RGBA_10X10)] |= compressedFeature;
        _formatFeatures[toNumber(Format::ASTC_RGBA_12X10)] |= compressedFeature;
        _formatFeatures[toNumber(Format::ASTC_RGBA_12X12)] |= compressedFeature;

        _formatFeatures[toNumber(Format::ASTC_SRGBA_4X4)] |= compressedFeature;
        _formatFeatures[toNumber(Format::ASTC_SRGBA_5X4)] |= compressedFeature;
        _formatFeatures[toNumber(Format::ASTC_SRGBA_5X5)] |= compressedFeature;
        _formatFeatures[toNumber(Format::ASTC_SRGBA_6X5)] |= compressedFeature;
        _formatFeatures[toNumber(Format::ASTC_SRGBA_6X6)] |= compressedFeature;
        _formatFeatures[toNumber(Format::ASTC_SRGBA_8X5)] |= compressedFeature;
        _formatFeatures[toNumber(Format::ASTC_SRGBA_8X6)] |= compressedFeature;
        _formatFeatures[toNumber(Format::ASTC_SRGBA_8X8)] |= compressedFeature;
        _formatFeatures[toNumber(Format::ASTC_SRGBA_10X5)] |= compressedFeature;
        _formatFeatures[toNumber(Format::ASTC_SRGBA_10X6)] |= compressedFeature;
        _formatFeatures[toNumber(Format::ASTC_SRGBA_10X8)] |= compressedFeature;
        _formatFeatures[toNumber(Format::ASTC_SRGBA_10X10)] |= compressedFeature;
        _formatFeatures[toNumber(Format::ASTC_SRGBA_12X10)] |= compressedFeature;
        _formatFeatures[toNumber(Format::ASTC_SRGBA_12X12)] |= compressedFeature;
    }
}

CommandBuffer *GLES2Device::createCommandBuffer(const CommandBufferInfo &info, bool hasAgent) {
    if (hasAgent || info.type == CommandBufferType::PRIMARY) return ccnew GLES2PrimaryCommandBuffer;
    return ccnew GLES2CommandBuffer;
}

Queue *GLES2Device::createQueue() {
    return ccnew GLES2Queue;
}

QueryPool *GLES2Device::createQueryPool() {
    return ccnew GLES2QueryPool;
}

Swapchain *GLES2Device::createSwapchain() {
    return ccnew GLES2Swapchain;
}

Buffer *GLES2Device::createBuffer() {
    return ccnew GLES2Buffer;
}

Texture *GLES2Device::createTexture() {
    return ccnew GLES2Texture;
}

Shader *GLES2Device::createShader() {
    return ccnew GLES2Shader;
}

InputAssembler *GLES2Device::createInputAssembler() {
    return ccnew GLES2InputAssembler;
}

RenderPass *GLES2Device::createRenderPass() {
    return ccnew GLES2RenderPass;
}

Framebuffer *GLES2Device::createFramebuffer() {
    return ccnew GLES2Framebuffer;
}

DescriptorSet *GLES2Device::createDescriptorSet() {
    return ccnew GLES2DescriptorSet;
}

DescriptorSetLayout *GLES2Device::createDescriptorSetLayout() {
    return ccnew GLES2DescriptorSetLayout;
}

PipelineLayout *GLES2Device::createPipelineLayout() {
    return ccnew GLES2PipelineLayout;
}

PipelineState *GLES2Device::createPipelineState() {
    return ccnew GLES2PipelineState;
}

AccelerationStructure *GLES2Device::createAccelerationStructure(){
    return ccnew GLES2AccelerationStructure;
}

Sampler *GLES2Device::createSampler(const SamplerInfo &info) {
    return ccnew GLES2Sampler(info);
}

void GLES2Device::copyBuffersToTexture(const uint8_t *const *buffers, Texture *dst, const BufferTextureCopy *regions, uint32_t count) {
    CC_PROFILE(GLES2DeviceCopyBuffersToTexture);
    cmdFuncGLES2CopyBuffersToTexture(this, buffers, static_cast<GLES2Texture *>(dst)->gpuTexture(), regions, count);
}

void GLES2Device::copyTextureToBuffers(Texture *src, uint8_t *const *buffers, const BufferTextureCopy *region, uint32_t count) {
    CC_PROFILE(GLES2DeviceCopyTextureToBuffers);
    cmdFuncGLES2CopyTextureToBuffers(this, static_cast<GLES2Texture *>(src)->gpuTexture(), buffers, region, count);
}

SampleCount GLES2Device::getMaxSampleCount(Format format, TextureUsage usage, TextureFlags flags) const {
    std::ignore = format;
    std::ignore = usage;
    std::ignore = flags;
    return static_cast<SampleCount>(cmdFuncGLES2GetMaxSampleCount());
}

} // namespace gfx
} // namespace cc
