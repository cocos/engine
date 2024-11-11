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

#include "SPIRVUtils.h"

#include "base/Log.h"
#include "base/Utils.h"
#include "glslang/Public/ShaderLang.h"
#include "glslang/SPIRV/GlslangToSpv.h"
#include "glslang/StandAlone/ResourceLimits.h"
#include "spirv/spirv.h"

#define CC_GLSLANG_VERSION_GREATOR_OR_EQUAL_TO(major, minor, patch) \
    (((major) < GLSLANG_VERSION_MAJOR) || ((major) == GLSLANG_VERSION_MAJOR && \
    (((minor) < GLSLANG_VERSION_MINOR) || ((minor) == GLSLANG_VERSION_MINOR && \
     ((patch) <= GLSLANG_VERSION_PATCH)))))

namespace cc {
namespace gfx {

namespace {
EShLanguage getShaderStage(ShaderStageFlagBit type) {
    switch (type) {
        case ShaderStageFlagBit::VERTEX: return EShLangVertex;
        case ShaderStageFlagBit::CONTROL: return EShLangTessControl;
        case ShaderStageFlagBit::EVALUATION: return EShLangTessEvaluation;
        case ShaderStageFlagBit::GEOMETRY: return EShLangGeometry;
        case ShaderStageFlagBit::FRAGMENT: return EShLangFragment;
        case ShaderStageFlagBit::COMPUTE: return EShLangCompute;
        default: {
            CC_ABORT();
            return EShLangVertex;
        }
    }
}

#include <glslang/build_info.h>

glslang::EShTargetClientVersion getClientVersion(int vulkanMinorVersion) {
    switch (vulkanMinorVersion) {
        case 0: return glslang::EShTargetVulkan_1_0;
        case 1: return glslang::EShTargetVulkan_1_1;
        case 2: return glslang::EShTargetVulkan_1_2;
#if CC_GLSLANG_VERSION_GREATOR_OR_EQUAL_TO(11, 10, 0)
        case 3: return glslang::EShTargetVulkan_1_3;
#else
        case 3: return glslang::EShTargetVulkan_1_2;
#endif
        default: {
            CC_ABORT();
            return glslang::EShTargetVulkan_1_0;
        }
    }
}

glslang::EShTargetLanguageVersion getTargetVersion(int vulkanMinorVersion) {
    switch (vulkanMinorVersion) {
        case 0: return glslang::EShTargetSpv_1_0;
        case 1: return glslang::EShTargetSpv_1_3;
        case 2: return glslang::EShTargetSpv_1_5;
#if CC_GLSLANG_VERSION_GREATOR_OR_EQUAL_TO(11, 10, 0)
        case 3: return glslang::EShTargetSpv_1_6;
#else
        case 3: return glslang::EShTargetSpv_1_5;
#endif
        default: {
            CC_ABORT();
            return glslang::EShTargetSpv_1_0;
        }
    }
}

// https://www.khronos.org/registry/spir-v/specs/1.0/SPIRV.pdf
struct Id {
    uint32_t opcode{0};
    uint32_t typeId{0};
    uint32_t storageClass{0};
    uint32_t *pLocation{nullptr};
};
} // namespace

SPIRVUtils SPIRVUtils::instance;

void SPIRVUtils::initialize(int vulkanMinorVersion) {
    glslang::InitializeProcess();

    _clientInputSemanticsVersion = 100 + vulkanMinorVersion * 10;
    _clientVersion = getClientVersion(vulkanMinorVersion);
    _targetVersion = getTargetVersion(vulkanMinorVersion);
}

void SPIRVUtils::destroy() {
    glslang::FinalizeProcess();
    _output.clear();
}

void SPIRVUtils::compileGLSL(ShaderStageFlagBit type, const ccstd::string &source) {
    EShLanguage stage = getShaderStage(type);
    const char *string = source.c_str();

    _shader = std::make_unique<glslang::TShader>(stage);
    _shader->setStrings(&string, 1);

    _shader->setEnvInput(glslang::EShSourceGlsl, stage, glslang::EShClientVulkan, _clientInputSemanticsVersion);
    _shader->setEnvClient(glslang::EShClientVulkan, _clientVersion);
    _shader->setEnvTarget(glslang::EShTargetSpv, _targetVersion);

    auto messages = static_cast<EShMessages>(EShMsgSpvRules | EShMsgVulkanRules);

    if (!_shader->parse(&glslang::DefaultTBuiltInResource, _clientInputSemanticsVersion, false, messages)) {
        CC_LOG_ERROR("GLSL Parsing Failed:\n%s\n%s", _shader->getInfoLog(), _shader->getInfoDebugLog());
    }

    _program = std::make_unique<glslang::TProgram>();
    _program->addShader(_shader.get());

    if (!_program->link(messages)) {
        CC_LOG_ERROR("GLSL Linking Failed:\n%s\n%s", _program->getInfoLog(), _program->getInfoDebugLog());
    }

    _output.clear();
    spv::SpvBuildLogger logger;
    glslang::SpvOptions spvOptions;

    spvOptions.disableOptimizer = false; // Do not disable optimizer in debug mode. It will cause the shader to fail to compile.
    spvOptions.optimizeSize = true;
#if CC_DEBUG > 0
    // spvOptions.validate = true;
#else
    spvOptions.stripDebugInfo = true;
#endif
    glslang::GlslangToSpv(*_program->getIntermediate(stage), _output, &logger, &spvOptions);
}

void SPIRVUtils::compressInputLocations(gfx::AttributeList &attributes) {
    static ccstd::vector<Id> ids;
    static ccstd::vector<uint32_t> activeLocations;
    static ccstd::vector<uint32_t> newLocations;

    uint32_t *code = _output.data();
    uint32_t codeSize = utils::toUint(_output.size());

    CC_ASSERT(code[0] == SpvMagicNumber);

    uint32_t idBound = code[3];
    ids.assign(idBound, {});

    uint32_t *insn = code + 5;
    while (insn != code + codeSize) {
        auto opcode = static_cast<uint16_t>(insn[0]);
        auto wordCount = static_cast<uint16_t>(insn[0] >> 16);

        switch (opcode) {
            case SpvOpDecorate: {
                CC_ASSERT_GE(wordCount, 3);

                uint32_t id = insn[1];
                CC_ASSERT_LT(id, idBound);

                switch (insn[2]) {
                    case SpvDecorationLocation:
                        CC_ASSERT_EQ(wordCount, 4);
                        ids[id].pLocation = &insn[3];
                        break;
                }
            } break;
            case SpvOpVariable: {
                CC_ASSERT_GE(wordCount, 4);

                uint32_t id = insn[2];
                CC_ASSERT_LT(id, idBound);

                CC_ASSERT(ids[id].opcode == 0);
                ids[id].opcode = opcode;
                ids[id].typeId = insn[1];
                ids[id].storageClass = insn[3];
            } break;
        }

        CC_ASSERT(insn + wordCount <= code + codeSize);
        insn += wordCount;
    }

    _program->buildReflection();
    activeLocations.clear();
    int activeCount = _program->getNumPipeInputs();
    for (int i = 0; i < activeCount; ++i) {
        activeLocations.push_back(_program->getPipeInput(i).getType()->getQualifier().layoutLocation);
    }

    uint32_t location = 0;
    uint32_t unusedLocation = activeCount;
    newLocations.assign(attributes.size(), UINT_MAX);

    for (auto &id : ids) {
        if (id.opcode == SpvOpVariable && id.storageClass == SpvStorageClassInput && id.pLocation) {
            uint32_t oldLocation = *id.pLocation;

            // update locations in SPIRV
            if (std::find(activeLocations.begin(), activeLocations.end(), *id.pLocation) != activeLocations.end()) {
                *id.pLocation = location++;
            } else {
                *id.pLocation = unusedLocation++;
            }

            // save record
            bool found{false};
            for (size_t i = 0; i < attributes.size(); ++i) {
                if (attributes[i].location == oldLocation) {
                    newLocations[i] = *id.pLocation;
                    found = true;
                    break;
                }
            }
              
            // Missing attribute declarations?
            CC_ASSERT(found);
        }
    }

    // update gfx references
    for (size_t i = 0; i < attributes.size(); ++i) {
        attributes[i].location = newLocations[i];
    }

    attributes.erase(std::remove_if(attributes.begin(), attributes.end(), [](const auto &attr) {
                         return attr.location == UINT_MAX;
                     }),
                     attributes.end());
}

} // namespace gfx
} // namespace cc
