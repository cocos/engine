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

#include "GLES3Std.h"

#include "GLES3Buffer.h"
#include "GLES3CommandBuffer.h"
#include "GLES3Commands.h"
#include "GLES3DescriptorSet.h"
#include "GLES3DescriptorSetLayout.h"
#include "GLES3Device.h"
#include "GLES3Framebuffer.h"
#include "GLES3GPUObjects.h"
#include "GLES3InputAssembler.h"
#include "GLES3PipelineCache.h"
#include "GLES3PipelineLayout.h"
#include "GLES3PipelineState.h"
#include "GLES3PrimaryCommandBuffer.h"
#include "GLES3QueryPool.h"
#include "GLES3Queue.h"
#include "GLES3RenderPass.h"
#include "GLES3Shader.h"
#include "GLES3Swapchain.h"
#include "GLES3Texture.h"
#include "application/ApplicationManager.h"
#include "platform/interfaces/modules/IXRInterface.h"
#include "profiler/Profiler.h"
#include "states/GLES3GeneralBarrier.h"
#include "states/GLES3Sampler.h"
#include "GLES3AccelerationStructure.h"

// when capturing GLES commands (RENDERDOC_HOOK_EGL=1, default value)
// renderdoc doesn't support this extension during replay
#define ALLOW_MULTISAMPLED_RENDER_TO_TEXTURE_ON_DESKTOP 0

namespace cc {
namespace gfx {

GLES3Device *GLES3Device::instance = nullptr;

GLES3Device *GLES3Device::getInstance() {
    return GLES3Device::instance;
}

GLES3Device::GLES3Device() {
    _api = API::GLES3;
    _deviceName = "GLES3";

    GLES3Device::instance = this;
}

GLES3Device::~GLES3Device() {
    GLES3Device::instance = nullptr;
}

bool GLES3Device::doInit(const DeviceInfo & /*info*/) {
    _xr = CC_GET_XR_INTERFACE();
    if (_xr) _xr->preGFXDeviceInitialize(_api);
    _gpuContext = ccnew GLES3GPUContext;
    _gpuStateCache = ccnew GLES3GPUStateCache;
    _gpuFramebufferHub = ccnew GLES3GPUFramebufferHub;
    _gpuConstantRegistry = ccnew GLES3GPUConstantRegistry;
    _gpuFramebufferCacheMap = ccnew GLES3GPUFramebufferCacheMap(_gpuStateCache);

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

    initFormatFeature();

    _multithreadedCommandRecording = false;

    _features[toNumber(Feature::INSTANCED_ARRAYS)] = true;
    _features[toNumber(Feature::MULTIPLE_RENDER_TARGETS)] = true;
    _features[toNumber(Feature::BLEND_MINMAX)] = true;
    _features[toNumber(Feature::ELEMENT_INDEX_UINT)] = true;
    _features[toNumber(Feature::RASTERIZATION_ORDER_NOCOHERENT)] = false;

    if (_gpuConstantRegistry->glMinorVersion) {
        _features[toNumber(Feature::COMPUTE_SHADER)] = true;
    }

    ccstd::string fbfLevelStr = "NONE";
    // PVRVFrame has issues on their support
    if (checkExtension("framebuffer_fetch")) {
        ccstd::string nonCoherent = "framebuffer_fetch_non";

        auto it = std::find_if(_extensions.begin(), _extensions.end(), [&nonCoherent](auto &ext) {
            return ext.find(nonCoherent) != ccstd::string::npos;
        });

        if (it != _extensions.end()) {
            if (*it == CC_TOSTR(GL_EXT_shader_framebuffer_fetch_non_coherent)) {
                _gpuConstantRegistry->mFBF = FBFSupportLevel::NON_COHERENT_EXT;
                _features[toNumber(Feature::RASTERIZATION_ORDER_NOCOHERENT)] = true;
                fbfLevelStr                = "NON_COHERENT_EXT";
            } else if (*it == CC_TOSTR(GL_QCOM_shader_framebuffer_fetch_noncoherent)) {
                _gpuConstantRegistry->mFBF = FBFSupportLevel::NON_COHERENT_QCOM;
                fbfLevelStr                = "NON_COHERENT_QCOM";
                _features[toNumber(Feature::RASTERIZATION_ORDER_NOCOHERENT)] = true;
                GL_CHECK(glEnable(GL_FRAMEBUFFER_FETCH_NONCOHERENT_QCOM));
            }
        } else if (checkExtension(CC_TOSTR(GL_EXT_shader_framebuffer_fetch))) {
            // we only care about EXT_shader_framebuffer_fetch, the ARM version does not support MRT
            _gpuConstantRegistry->mFBF = FBFSupportLevel::COHERENT;
            fbfLevelStr                = "COHERENT";
        }
        _features[toNumber(Feature::INPUT_ATTACHMENT_BENEFIT)] = _gpuConstantRegistry->mFBF != FBFSupportLevel::NONE;
        _features[toNumber(Feature::SUBPASS_COLOR_INPUT)] = true;
    }

    if (checkExtension(CC_TOSTR(GL_EXT_debug_marker))) {
        _gpuConstantRegistry->debugMarker = true;
    }

    if (checkExtension(CC_TOSTR(ARM_shader_framebuffer_fetch_depth_stencil))) {
        _features[toNumber(Feature::SUBPASS_DEPTH_STENCIL_INPUT)] = true;
        fbfLevelStr                += "_DEPTH_STENCIL";
    }

    ccstd::string msaaLevelStr = "NONE";
#if CC_PLATFORM != CC_PLATFORM_WINDOWS || ALLOW_MULTISAMPLED_RENDER_TO_TEXTURE_ON_DESKTOP
    if (checkExtension("multisampled_render_to_texture")) {
        msaaLevelStr = "MSRT1";
        if (checkExtension("multisampled_render_to_texture2")) {
            _gpuConstantRegistry->mMSRT = MSRTSupportLevel::LEVEL2;
            msaaLevelStr = "MSRT2";
        } else {
            _gpuConstantRegistry->mMSRT = MSRTSupportLevel::LEVEL1;
        }
    }
#endif
    _features[toNumber(Feature::MULTI_SAMPLE_RESOLVE_DEPTH_STENCIL)] = true;

    ccstd::string compressedFmts;

    if (getFormatFeatures(Format::ETC_RGB8) != FormatFeature::NONE) {
        compressedFmts += "etc1 ";
    }

    compressedFmts += "etc2 ";

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
    glGetIntegerv(GL_MAX_UNIFORM_BUFFER_BINDINGS, reinterpret_cast<GLint *>(&_caps.maxUniformBufferBindings));
    glGetIntegerv(GL_MAX_UNIFORM_BLOCK_SIZE, reinterpret_cast<GLint *>(&_caps.maxUniformBlockSize));
    glGetIntegerv(GL_MAX_DRAW_BUFFERS, reinterpret_cast<GLint *>(&_caps.maxColorRenderTargets));
    glGetIntegerv(GL_MAX_TEXTURE_IMAGE_UNITS, reinterpret_cast<GLint *>(&_caps.maxTextureUnits));
    glGetIntegerv(GL_MAX_VERTEX_TEXTURE_IMAGE_UNITS, reinterpret_cast<GLint *>(&_caps.maxVertexTextureUnits));
    glGetIntegerv(GL_MAX_TEXTURE_SIZE, reinterpret_cast<GLint *>(&_caps.maxTextureSize));
    glGetIntegerv(GL_MAX_CUBE_MAP_TEXTURE_SIZE, reinterpret_cast<GLint *>(&_caps.maxCubeMapTextureSize));
    glGetIntegerv(GL_UNIFORM_BUFFER_OFFSET_ALIGNMENT, reinterpret_cast<GLint *>(&_caps.uboOffsetAlignment));
    glGetIntegerv(GL_MAX_ARRAY_TEXTURE_LAYERS, reinterpret_cast<GLint *>(&_caps.maxArrayTextureLayers));
    glGetIntegerv(GL_MAX_3D_TEXTURE_SIZE, reinterpret_cast<GLint *>(&_caps.max3DTextureSize));

    if (_gpuConstantRegistry->glMinorVersion) {
        glGetIntegerv(GL_MAX_IMAGE_UNITS, reinterpret_cast<GLint *>(&_caps.maxImageUnits));
        glGetIntegerv(GL_MAX_SHADER_STORAGE_BLOCK_SIZE, reinterpret_cast<GLint *>(&_caps.maxShaderStorageBlockSize));
        glGetIntegerv(GL_MAX_SHADER_STORAGE_BUFFER_BINDINGS, reinterpret_cast<GLint *>(&_caps.maxShaderStorageBufferBindings));
        glGetIntegerv(GL_MAX_COMPUTE_SHARED_MEMORY_SIZE, reinterpret_cast<GLint *>(&_caps.maxComputeSharedMemorySize));
        glGetIntegerv(GL_MAX_COMPUTE_WORK_GROUP_INVOCATIONS, reinterpret_cast<GLint *>(&_caps.maxComputeWorkGroupInvocations));
        glGetIntegeri_v(GL_MAX_COMPUTE_WORK_GROUP_SIZE, 0, reinterpret_cast<GLint *>(&_caps.maxComputeWorkGroupSize.x));
        glGetIntegeri_v(GL_MAX_COMPUTE_WORK_GROUP_SIZE, 1, reinterpret_cast<GLint *>(&_caps.maxComputeWorkGroupSize.y));
        glGetIntegeri_v(GL_MAX_COMPUTE_WORK_GROUP_SIZE, 2, reinterpret_cast<GLint *>(&_caps.maxComputeWorkGroupSize.z));
        glGetIntegeri_v(GL_MAX_COMPUTE_WORK_GROUP_COUNT, 0, reinterpret_cast<GLint *>(&_caps.maxComputeWorkGroupCount.x));
        glGetIntegeri_v(GL_MAX_COMPUTE_WORK_GROUP_COUNT, 1, reinterpret_cast<GLint *>(&_caps.maxComputeWorkGroupCount.y));
        glGetIntegeri_v(GL_MAX_COMPUTE_WORK_GROUP_COUNT, 2, reinterpret_cast<GLint *>(&_caps.maxComputeWorkGroupCount.z));
    }

    if (checkExtension("occlusion_query_boolean")) {
        _caps.supportQuery = true;
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

    _gpuStateCache->initialize(_caps.maxTextureUnits, _caps.maxImageUnits, _caps.maxUniformBufferBindings, _caps.maxShaderStorageBufferBindings, _caps.maxVertexAttributes);

#if CC_USE_PIPELINE_CACHE
    _pipelineCache = std::make_unique<GLES3PipelineCache>();
    _pipelineCache->init();
#endif

    CC_LOG_INFO("GLES3 device initialized.");
    CC_LOG_INFO("RENDERER: %s", _renderer.c_str());
    CC_LOG_INFO("VENDOR: %s", _vendor.c_str());
    CC_LOG_INFO("VERSION: %s", _version.c_str());
    CC_LOG_INFO("COMPRESSED_FORMATS: %s", compressedFmts.c_str());
    CC_LOG_INFO("FRAMEBUFFER_FETCH: %s", fbfLevelStr.c_str());
    CC_LOG_INFO("MULTI_SAMPLE_RENDER_TO_TEXTURE: %s", msaaLevelStr.c_str());

    if (_xr) {
        _xr->initializeGLESData(pfnGLES3wLoadProc(), GLES3Device::getInstance()->context());
        _xr->postGFXDeviceInitialize(_api);
    }
    return true;
}

void GLES3Device::doDestroy() {
    CC_SAFE_DELETE(_gpuFramebufferCacheMap)
    CC_SAFE_DELETE(_gpuConstantRegistry)
    CC_SAFE_DELETE(_gpuFramebufferHub)
    CC_SAFE_DELETE(_gpuStateCache)

    CC_ASSERT(!_memoryStatus.bufferSize);  // Buffer memory leaked
    CC_ASSERT(!_memoryStatus.textureSize); // Texture memory leaked

    CC_SAFE_DESTROY_AND_DELETE(_cmdBuff)
    CC_SAFE_DESTROY_AND_DELETE(_queryPool)
    CC_SAFE_DESTROY_AND_DELETE(_queue)
    CC_SAFE_DESTROY_AND_DELETE(_gpuContext)

    _pipelineCache.reset();
}

void GLES3Device::acquire(Swapchain *const *swapchains, uint32_t count) {
    _gpuContext->makeCurrent();

    if (_onAcquire) _onAcquire->execute();

    _swapchains.clear();
    if (_xr) {
        GLuint xrFramebuffer = 0;
#if XR_OEM_HUAWEIVR
        stateCache()->glTextures[stateCache()->texUint] = 0;
        glGetIntegerv(GL_DRAW_FRAMEBUFFER_BINDING, reinterpret_cast<GLint *>(&xrFramebuffer));
        stateCache()->glDrawFramebuffer = xrFramebuffer;
#else
        xr::XRSwapchain xrSwapchain = _xr->doGFXDeviceAcquire(_api);
        xrFramebuffer = xrSwapchain.glDrawFramebuffer;
#endif
        for (uint32_t i = 0; i < count; ++i) {
            GL_CHECK(_xr->attachGLESFramebufferTexture2D(););
            static_cast<GLES3Swapchain *>(swapchains[i])->gpuSwapchain()->glFramebuffer = xrFramebuffer;
            _swapchains.push_back(static_cast<GLES3Swapchain *>(swapchains[i])->gpuSwapchain());
        }
        return;
    }

    for (uint32_t i = 0; i < count; ++i) {
        _swapchains.push_back(static_cast<GLES3Swapchain *>(swapchains[i])->gpuSwapchain());
    }
}

void GLES3Device::present() {
    CC_PROFILE(GLES3DevicePresent);
    auto *queue = static_cast<GLES3Queue *>(_queue);
    _numDrawCalls = queue->_numDrawCalls;
    _numInstances = queue->_numInstances;
    _numTriangles = queue->_numTriangles;

    bool isGFXDeviceNeedsPresent = _xr ? _xr->isGFXDeviceNeedsPresent(_api) : true;
    for (auto *swapchain : _swapchains) {
        if (isGFXDeviceNeedsPresent) _gpuContext->present(swapchain);
    }
    if (_xr) _xr->postGFXDevicePresent(_api);

    // Clear queue stats
    queue->_numDrawCalls = 0;
    queue->_numInstances = 0;
    queue->_numTriangles = 0;
}

void GLES3Device::bindContext(bool bound) {
    _gpuContext->bindContext(bound);
}

void GLES3Device::initFormatFeature() {
    _textureExclusive.fill(true);

    FormatFeature tempFeature = {};

    // builtin
    tempFeature = FormatFeature::SAMPLED_TEXTURE | FormatFeature::RENDER_TARGET | FormatFeature::LINEAR_FILTER | FormatFeature::STORAGE_TEXTURE | FormatFeature::VERTEX_ATTRIBUTE;

    _formatFeatures[toNumber(Format::R8)] = tempFeature;
    _formatFeatures[toNumber(Format::RG8)] = tempFeature;
    _formatFeatures[toNumber(Format::RGB8)] = tempFeature;
    _formatFeatures[toNumber(Format::RGBA8)] = tempFeature;

    tempFeature = FormatFeature::SAMPLED_TEXTURE | FormatFeature::RENDER_TARGET | FormatFeature::LINEAR_FILTER | FormatFeature::STORAGE_TEXTURE;

    _formatFeatures[toNumber(Format::R8SN)] = tempFeature;
    _formatFeatures[toNumber(Format::RG8SN)] = tempFeature;
    _formatFeatures[toNumber(Format::RGB8SN)] = tempFeature;
    _formatFeatures[toNumber(Format::RGBA8SN)] = tempFeature;
    _formatFeatures[toNumber(Format::R5G6B5)] = tempFeature;
    _formatFeatures[toNumber(Format::RGBA4)] = tempFeature;
    _formatFeatures[toNumber(Format::RGB5A1)] = tempFeature;
    _formatFeatures[toNumber(Format::RGB10A2)] = tempFeature;

    _formatFeatures[toNumber(Format::SRGB8)] = tempFeature;
    _formatFeatures[toNumber(Format::SRGB8_A8)] = tempFeature;

    _formatFeatures[toNumber(Format::R11G11B10F)] = tempFeature;
    _formatFeatures[toNumber(Format::RGB9E5)] = tempFeature;

    _formatFeatures[toNumber(Format::DEPTH)] = tempFeature;
    _formatFeatures[toNumber(Format::DEPTH_STENCIL)] = tempFeature;

    tempFeature = FormatFeature::SAMPLED_TEXTURE | FormatFeature::RENDER_TARGET | FormatFeature::LINEAR_FILTER | FormatFeature::STORAGE_TEXTURE | FormatFeature::VERTEX_ATTRIBUTE;

    _formatFeatures[toNumber(Format::R16F)] = tempFeature;
    _formatFeatures[toNumber(Format::RG16F)] = tempFeature;
    _formatFeatures[toNumber(Format::RGB16F)] = tempFeature;
    _formatFeatures[toNumber(Format::RGBA16F)] = tempFeature;

    tempFeature = FormatFeature::SAMPLED_TEXTURE | FormatFeature::STORAGE_TEXTURE | FormatFeature::VERTEX_ATTRIBUTE;

    _formatFeatures[toNumber(Format::R32F)] = tempFeature;
    _formatFeatures[toNumber(Format::RG32F)] = tempFeature;
    _formatFeatures[toNumber(Format::RGB32F)] = tempFeature;
    _formatFeatures[toNumber(Format::RGBA32F)] = tempFeature;

    _formatFeatures[toNumber(Format::RGB10A2UI)] = FormatFeature::RENDER_TARGET | FormatFeature::LINEAR_FILTER | FormatFeature::STORAGE_TEXTURE;

    tempFeature = FormatFeature::SAMPLED_TEXTURE | FormatFeature::RENDER_TARGET | FormatFeature::LINEAR_FILTER | FormatFeature::STORAGE_TEXTURE | FormatFeature::VERTEX_ATTRIBUTE;

    _formatFeatures[toNumber(Format::R8I)] = tempFeature;
    _formatFeatures[toNumber(Format::R8UI)] = tempFeature;
    _formatFeatures[toNumber(Format::R16I)] = tempFeature;
    _formatFeatures[toNumber(Format::R16UI)] = tempFeature;
    _formatFeatures[toNumber(Format::R32I)] = tempFeature;
    _formatFeatures[toNumber(Format::R32UI)] = tempFeature;

    _formatFeatures[toNumber(Format::RG8I)] = tempFeature;
    _formatFeatures[toNumber(Format::RG8UI)] = tempFeature;
    _formatFeatures[toNumber(Format::RG16I)] = tempFeature;
    _formatFeatures[toNumber(Format::RG16UI)] = tempFeature;
    _formatFeatures[toNumber(Format::RG32I)] = tempFeature;
    _formatFeatures[toNumber(Format::RG32UI)] = tempFeature;

    _formatFeatures[toNumber(Format::RGB8I)] = tempFeature;
    _formatFeatures[toNumber(Format::RGB8UI)] = tempFeature;
    _formatFeatures[toNumber(Format::RGB16I)] = tempFeature;
    _formatFeatures[toNumber(Format::RGB16UI)] = tempFeature;
    _formatFeatures[toNumber(Format::RGB32I)] = tempFeature;
    _formatFeatures[toNumber(Format::RGB32UI)] = tempFeature;

    _formatFeatures[toNumber(Format::RGBA8I)] = tempFeature;
    _formatFeatures[toNumber(Format::RGBA8UI)] = tempFeature;
    _formatFeatures[toNumber(Format::RGBA16I)] = tempFeature;
    _formatFeatures[toNumber(Format::RGBA16UI)] = tempFeature;
    _formatFeatures[toNumber(Format::RGBA32I)] = tempFeature;
    _formatFeatures[toNumber(Format::RGBA32UI)] = tempFeature;

    _textureExclusive[toNumber(Format::R8)] = false;
    _textureExclusive[toNumber(Format::RG8)] = false;
    _textureExclusive[toNumber(Format::RGB8)] = false;
    _textureExclusive[toNumber(Format::R5G6B5)] = false;
    _textureExclusive[toNumber(Format::RGBA4)] = false;

    _textureExclusive[toNumber(Format::RGB5A1)] = false;
    _textureExclusive[toNumber(Format::RGBA8)] = false;
    _textureExclusive[toNumber(Format::RGB10A2)] = false;
    _textureExclusive[toNumber(Format::RGB10A2UI)] = false;
    _textureExclusive[toNumber(Format::SRGB8_A8)] = false;

    _textureExclusive[toNumber(Format::R8I)] = false;
    _textureExclusive[toNumber(Format::R8UI)] = false;
    _textureExclusive[toNumber(Format::R16I)] = false;
    _textureExclusive[toNumber(Format::R16UI)] = false;
    _textureExclusive[toNumber(Format::R32I)] = false;
    _textureExclusive[toNumber(Format::R32UI)] = false;

    _textureExclusive[toNumber(Format::RG8I)] = false;
    _textureExclusive[toNumber(Format::RG8UI)] = false;
    _textureExclusive[toNumber(Format::RG16I)] = false;
    _textureExclusive[toNumber(Format::RG16UI)] = false;
    _textureExclusive[toNumber(Format::RG32I)] = false;
    _textureExclusive[toNumber(Format::RG32UI)] = false;

    _textureExclusive[toNumber(Format::RGBA8I)] = false;
    _textureExclusive[toNumber(Format::RGBA8UI)] = false;
    _textureExclusive[toNumber(Format::RGBA16I)] = false;
    _textureExclusive[toNumber(Format::RGBA16UI)] = false;
    _textureExclusive[toNumber(Format::RGBA32I)] = false;
    _textureExclusive[toNumber(Format::RGBA32UI)] = false;

    _textureExclusive[toNumber(Format::DEPTH)] = false;
    _textureExclusive[toNumber(Format::DEPTH_STENCIL)] = false;

    if (checkExtension("render_snorm")) {
        // https://www.khronos.org/registry/OpenGL/extensions/EXT/EXT_render_snorm.txt
        // For 16, see https://www.khronos.org/registry/OpenGL/extensions/EXT/EXT_texture_norm16.txt
        _textureExclusive[toNumber(Format::R8SN)] = false;
        _textureExclusive[toNumber(Format::RG8SN)] = false;
        _textureExclusive[toNumber(Format::RGB8SN)] = false;
        _textureExclusive[toNumber(Format::RGBA8SN)] = false;
    }

    if (checkExtension("color_buffer_float")) {
        _formatFeatures[toNumber(Format::R32F)] |= FormatFeature::RENDER_TARGET;
        _formatFeatures[toNumber(Format::RG32F)] |= FormatFeature::RENDER_TARGET;
        _formatFeatures[toNumber(Format::RGBA32F)] |= FormatFeature::RENDER_TARGET;

        _textureExclusive[toNumber(Format::R32F)] = false;
        _textureExclusive[toNumber(Format::RG32F)] = false;
        _textureExclusive[toNumber(Format::RGBA32F)] = false;
    }
    if (checkExtension("color_buffer_half_float")) {
        _textureExclusive[toNumber(Format::R16F)] = false;
        _textureExclusive[toNumber(Format::RG16F)] = false;
        _textureExclusive[toNumber(Format::RGB16F)] = false;
        _textureExclusive[toNumber(Format::RGBA16F)] = false;
    }

    if (checkExtension("texture_float_linear")) {
        _formatFeatures[toNumber(Format::RGB32F)] |= FormatFeature::LINEAR_FILTER;
        _formatFeatures[toNumber(Format::RGBA32F)] |= FormatFeature::LINEAR_FILTER;
        _formatFeatures[toNumber(Format::R32F)] |= FormatFeature::LINEAR_FILTER;
        _formatFeatures[toNumber(Format::RG32F)] |= FormatFeature::LINEAR_FILTER;
    }

    if (checkExtension("texture_half_float_linear")) {
        _formatFeatures[toNumber(Format::RGB16F)] |= FormatFeature::LINEAR_FILTER;
        _formatFeatures[toNumber(Format::RGBA16F)] |= FormatFeature::LINEAR_FILTER;
        _formatFeatures[toNumber(Format::R16F)] |= FormatFeature::LINEAR_FILTER;
        _formatFeatures[toNumber(Format::RG16F)] |= FormatFeature::LINEAR_FILTER;
    }

    const FormatFeature compressedFeature = FormatFeature::SAMPLED_TEXTURE | FormatFeature::LINEAR_FILTER;

    if (checkExtension("compressed_ETC1")) {
        _formatFeatures[toNumber(Format::ETC_RGB8)] = compressedFeature;
    }

    _formatFeatures[toNumber(Format::ETC2_RGB8)] = compressedFeature;
    _formatFeatures[toNumber(Format::ETC2_RGBA8)] = compressedFeature;
    _formatFeatures[toNumber(Format::ETC2_SRGB8)] = compressedFeature;
    _formatFeatures[toNumber(Format::ETC2_SRGB8_A8)] = compressedFeature;
    _formatFeatures[toNumber(Format::ETC2_RGB8_A1)] = compressedFeature;
    _formatFeatures[toNumber(Format::ETC2_SRGB8_A1)] = compressedFeature;

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

CommandBuffer *GLES3Device::createCommandBuffer(const CommandBufferInfo &info, bool hasAgent) {
    if (hasAgent || info.type == CommandBufferType::PRIMARY) return ccnew GLES3PrimaryCommandBuffer;
    return ccnew GLES3CommandBuffer;
}

Queue *GLES3Device::createQueue() {
    return ccnew GLES3Queue;
}

QueryPool *GLES3Device::createQueryPool() {
    return ccnew GLES3QueryPool;
}

Swapchain *GLES3Device::createSwapchain() {
    if (_xr) {
        _xr->createXRSwapchains();
    }
    return ccnew GLES3Swapchain;
}

Buffer *GLES3Device::createBuffer() {
    return ccnew GLES3Buffer;
}

Texture *GLES3Device::createTexture() {
    return ccnew GLES3Texture;
}

Shader *GLES3Device::createShader() {
    return ccnew GLES3Shader;
}

InputAssembler *GLES3Device::createInputAssembler() {
    return ccnew GLES3InputAssembler;
}

RenderPass *GLES3Device::createRenderPass() {
    return ccnew GLES3RenderPass;
}

Framebuffer *GLES3Device::createFramebuffer() {
    return ccnew GLES3Framebuffer;
}

DescriptorSet *GLES3Device::createDescriptorSet() {
    return ccnew GLES3DescriptorSet;
}

DescriptorSetLayout *GLES3Device::createDescriptorSetLayout() {
    return ccnew GLES3DescriptorSetLayout;
}

PipelineLayout *GLES3Device::createPipelineLayout() {
    return ccnew GLES3PipelineLayout;
}

PipelineState *GLES3Device::createPipelineState() {
    return ccnew GLES3PipelineState;
}

AccelerationStructure *GLES3Device::createAccelerationStructure(){
    return ccnew GLES3AccelerationStructure;
}

Sampler *GLES3Device::createSampler(const SamplerInfo &info) {
    return ccnew GLES3Sampler(info);
}

GeneralBarrier *GLES3Device::createGeneralBarrier(const GeneralBarrierInfo &info) {
    return ccnew GLES3GeneralBarrier(info);
}

void GLES3Device::copyBuffersToTexture(const uint8_t *const *buffers, Texture *dst, const BufferTextureCopy *regions, uint32_t count) {
    CC_PROFILE(GLES3DeviceCopyBuffersToTexture);
    cmdFuncGLES3CopyBuffersToTexture(this, buffers, static_cast<GLES3Texture *>(dst)->gpuTexture(), regions, count);
}

void GLES3Device::copyTextureToBuffers(Texture *srcTexture, uint8_t *const *buffers, const BufferTextureCopy *regions, uint32_t count) {
    CC_PROFILE(GLES3DeviceCopyTextureToBuffers);
    cmdFuncGLES3CopyTextureToBuffers(this, static_cast<GLES3Texture *>(srcTexture)->gpuTextureView(), buffers, regions, count);
}

void GLES3Device::getQueryPoolResults(QueryPool *queryPool) {
    CC_PROFILE(GLES3DeviceGetQueryPoolResults);
    auto *cmdBuff = static_cast<GLES3CommandBuffer *>(getCommandBuffer());
    cmdBuff->getQueryPoolResults(queryPool);
}

SampleCount GLES3Device::getMaxSampleCount(Format format, TextureUsage usage, TextureFlags flags) const {
    return static_cast<SampleCount>(cmdFuncGLES3GetMaxSampleCount(this, format, usage, flags));
}

} // namespace gfx
} // namespace cc
