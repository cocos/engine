import { cclegacy } from './base';
import { graphicsAssembler } from '../cocos/2d/assembler/graphics';

export * from '../cocos/2d/components/graphics';
export { graphicsAssembler };

cclegacy.UI.graphicsAssembler = graphicsAssembler;
