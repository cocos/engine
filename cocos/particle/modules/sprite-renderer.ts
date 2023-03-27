import { Enum, Material, Quat, RenderingSubMesh, Vec4 } from '../../core';
import { displayName, displayOrder, serializable, tooltip, type } from '../../core/data/decorators';
import { Attribute, AttributeName, BufferInfo, BufferUsageBit, deviceManager, Format, FormatInfos, MemoryUsageBit } from '../../core/gfx';
import { MacroRecord, MaterialInstance } from '../../core/renderer';
import { AlignmentSpace, RenderMode, Space } from '../enum';
import { ParticleEmitterParams, ParticleExecContext } from '../particle-base';
import { BuiltinParticleParameter, ParticleDataSet } from '../particle-data-set';
import { RendererModule } from './renderer';

const CC_USE_WORLD_SPACE = 'CC_USE_WORLD_SPACE';
const CC_RENDER_MODE = 'CC_RENDER_MODE';
const INSTANCE_PARTICLE = 'CC_INSTANCE_PARTICLE';

const meshPosition = new Attribute(AttributeName.ATTR_POSITION, Format.RGB32F, false, 0);           // mesh position
const meshUv = new Attribute(AttributeName.ATTR_TEX_COORD, Format.RGB32F, false, 0);                // mesh uv
const particlePosition = new Attribute('a_particle_position', Format.RGB32F, false, 1, true);       // particle position
const particleRotation = new Attribute('a_particle_rotation', Format.RGB32F, false, 1, true);        // particle rotation
const particleSize = new Attribute('a_particle_size', Format.RGB32F, false, 1, true);               // particle size
const particleFrameId = new Attribute('a_particle_frame_id', Format.R32F, false, 1, true);          // particle frame id
const particleColor = new Attribute('a_particle_color', Format.RGBA8, true, 1, true);               // particle color
const particleVelocity = new Attribute('a_particle_velocity', Format.RGB32F, false, 1, true);       // particle velocity
const fixedVertexBuffer = new Float32Array([
    0, 0, 0, 0, 0, 0, // bottom-left
    1, 0, 0, 1, 0, 0, // bottom-right
    0, 1, 0, 0, 1, 0, // top-left
    1, 1, 0, 1, 1, 0, // top-right
]);
export class SpriteRendererModule extends RendererModule {
    /**
     * @zh 设定粒子生成模式。
     */
    @type(Enum(RenderMode))
    @displayOrder(0)
    @tooltip('i18n:particleSystemRenderer.renderMode')
    public get renderMode () {
        return this._renderMode;
    }

    public set renderMode (val) {
        this._renderMode = val;
    }

    @tooltip('i18n:particleSystemRenderer.velocityScale')
    public get velocityScale () {
        return this._velocityScale;
    }

    public set velocityScale (val) {
        this._velocityScale = val;
    }

    @tooltip('i18n:particleSystemRenderer.lengthScale')
    public get lengthScale () {
        return this._lengthScale;
    }

    public set lengthScale (val) {
        this._lengthScale = val;
    }

    @serializable
    private _velocityScale = 1;
    @serializable
    private _lengthScale = 1;
    private _alignmentSpace = AlignmentSpace.LOCAL;
    @serializable
    private _renderMode = RenderMode.BILLBOARD;
    private _defines: MacroRecord = {};
    private _vertexStreamAttributes: Attribute[] = [particlePosition, particleRotation, particleSize, particleFrameId, particleColor, particleVelocity];
    private _frameTile_velLenScale = new Vec4(1, 1, 0, 0);
    private _tmp_velLenScale = new Vec4(1, 1, 0, 0);
    private _node_scale = new Vec4();
    private _rotation = new Quat();
    private _renderingSubMesh: RenderingSubMesh | null = null;

    public execute (particles: ParticleDataSet, params: ParticleEmitterParams, context: ParticleExecContext) {
        if (!this.material) {
            return;
        }
        const material = this.material;
        this._defines[CC_USE_WORLD_SPACE] = params.simulationSpace === Space.WORLD;
        this._defines[CC_RENDER_MODE] = this.renderMode;
        material.recompileShaders(this._defines);
        switch (params.scaleSpace) {
        case Space.LOCAL:
            this._node_scale.set(context.localScale.x, context.localScale.y, context.localScale.z);
            break;
        case Space.WORLD:
            this._node_scale.set(context.worldScale.x, context.worldScale.y, context.worldScale.z);
            break;
        default:
            break;
        }
        material.setProperty('scale', this._node_scale);
        if (this._alignmentSpace === AlignmentSpace.LOCAL) {
            this._rotation.set(context.localRotation);
        } else if (this._alignmentSpace === AlignmentSpace.WORLD) {
            this._rotation.set(context.worldRotation);
        } else if (this._alignmentSpace === AlignmentSpace.VIEW) {
            // Quat.fromEuler(_node_rot, 0.0, 0.0, 0.0);
            this._rotation.set(0.0, 0.0, 0.0, 1.0);
        } else {
            this._rotation.set(0.0, 0.0, 0.0, 1.0);
        }
        material.setProperty('nodeRotation', this._rotation);
        if (particles.hasParameter(BuiltinParticleParameter.POSITION)) {
            const position = particles.position.data;
            for (let i = 0; i < count; i++) {
                const offset = i * this._vertDynamicAttrsFloatCount;
                const xOffset = i * 3;
                const yOffset = xOffset + 1;
                const zOffset = yOffset + 1;
                dynamicBuffer[offset] = position[xOffset];
                dynamicBuffer[offset + 1] = position[yOffset];
                dynamicBuffer[offset + 2] = position[zOffset];
            }
        }
        if (particles.hasParameter(BuiltinParticleParameter.ROTATION)) {
            const rotation = particles.rotation.data;
            for (let i = 0; i < count; i++) {
                const offset = i * this._vertDynamicAttrsFloatCount;
                const xOffset = i * 3;
                const yOffset = xOffset + 1;
                const zOffset = yOffset + 1;
                dynamicBuffer[offset + 3] = rotation[xOffset];
                dynamicBuffer[offset + 4] = rotation[yOffset];
                dynamicBuffer[offset + 5] = rotation[zOffset];
            }
        }
        if (particles.hasParameter(BuiltinParticleParameter.SIZE)) {
            const size = particles.size.data;
            for (let i = 0; i < count; i++) {
                const offset = i * this._vertDynamicAttrsFloatCount;
                const xOffset = i * 3;
                const yOffset = xOffset + 1;
                const zOffset = yOffset + 1;
                dynamicBuffer[offset + 6] = size[xOffset];
                dynamicBuffer[offset + 7] = size[yOffset];
                dynamicBuffer[offset + 8] = size[zOffset];
            }
        }
        if (particles.hasParameter(BuiltinParticleParameter.FRAME_INDEX)) {
            const frameIndex = particles.frameIndex.data;
            for (let i = 0; i < count; i++) {
                const offset = i * this._vertDynamicAttrsFloatCount;
                dynamicBuffer[offset + 9] = frameIndex[i];
            }
        }
        if (particles.hasParameter(BuiltinParticleParameter.COLOR)) {
            const color = particles.color.data;
            for (let i = 0; i < count; i++) {
                const offset = i * this._vertDynamicAttrsFloatCount;
                dynamicBufferUintView[offset + 10] = color[i];
            }
        }
        if (particles.hasParameter(BuiltinParticleParameter.VELOCITY)) {
            const { velocity } = particles;
            const velocityData = velocity.data;
            for (let i = 0; i < count; i++) {
                const offset = i * this._vertDynamicAttrsFloatCount;
                const xOffset = i * 3;
                const yOffset = xOffset + 1;
                const zOffset = yOffset + 1;
                dynamicBuffer[offset + 11] += velocityData[xOffset];
                dynamicBuffer[offset + 12] += velocityData[yOffset];
                dynamicBuffer[offset + 13] += velocityData[zOffset];
            }
        }
        this._insBuffers[1].update(dynamicBuffer); // update dynamic buffer
    }

    private _generateMesh () {
        if (!this._renderingSubMesh) {
            const vertexStreamSizeStatic = 0;
            let vertexStreamSizeDynamic = 0;
            for (const a of this._vertexStreamAttributes) {
                vertexStreamSizeDynamic += FormatInfos[a.format].size;
            }
            const vertexBuffer = deviceManager.gfxDevice.createBuffer(new BufferInfo(
                BufferUsageBit.VERTEX | BufferUsageBit.TRANSFER_DST,
                MemoryUsageBit.DEVICE,
                vertexStreamSizeStatic * 4,
                vertexStreamSizeStatic,
            ));

            const vBuffer = new ArrayBuffer(vertexStreamSizeStatic * 4);
        }
    }
}
