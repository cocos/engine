import { createCustomPipeline, addCustomBuiltinPipelines } from '../cocos/rendering/custom';
import { legacyCC } from '../cocos/core/global-exports';
import { PipelineBuilder } from '../cocos/rendering/custom/pipeline';

export * as rendering2 from '../cocos/rendering/custom/public';

legacyCC.internal.createCustomPipeline = createCustomPipeline;
legacyCC.internal.customPipelineBuilderMap = new Map<string, PipelineBuilder>();
addCustomBuiltinPipelines(legacyCC.internal.customPipelineBuilderMap);
