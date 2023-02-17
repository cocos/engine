/*
 Copyright (c) 2020 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
 worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
 not use Cocos Creator software for developing other software or tools that's
 used for developing games. You are not granted to publish, distribute,
 sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

import { approx, BitMask, CCFloat, Enum, EPSILON, pseudoRandom, Vec3 } from '../../core';
import { ccclass, range, serializable, type, visible } from '../../core/data/decorators';
import { Space } from '../enum';
import { ParticleModule, ParticleUpdateStage, UpdateModule } from '../particle-module';
import { ParticleSOAData, RecordReason } from '../particle-soa-data';
import { ParticleSystem } from '../particle-system';
import { particleSystemManager } from '../particle-system-manager';
import { ParticleSystemParams, ParticleUpdateContext, SpawnEvent } from '../particle-update-context';

const emitProbabilityRandomSeedOffset = 199208;

export enum EventCondition {
    BIRTH,
    LIFETIME,
    DEATH,
}

export enum InheritedProperty {
    COLOR = 1,
    SIZE = 1 << 1,
    ROTATION = 1 << 2,
    LIFETIME = 1 << 3,
    DURATION = 1 << 4
}

@ccclass('cc.EventData')
export class EventData {
    @type(Enum(EventCondition))
    @visible(true)
    @serializable
    public condition = EventCondition.BIRTH;

    @type(ParticleSystem)
    @visible(true)
    @serializable
    public emitter: ParticleSystem | null = null;

    @type(BitMask(InheritedProperty))
    @visible(true)
    @serializable
    public inheritedProperties = 0;

    @type(CCFloat)
    @range([0, 1])
    @serializable
    public probability = 1;
}

const inheritedPosition = new Vec3();
const inheritedVelocity = new Vec3();

@ccclass('cc.EventModule')
export class EventModule extends UpdateModule {
    @type([EventData])
    @visible(true)
    @serializable
    public eventInfos: EventData[] = [];

    public get name (): string {
        return 'EventModule';
    }

    public get updateStage (): ParticleUpdateStage {
        return ParticleUpdateStage.POST_UPDATE;
    }

    public get updatePriority (): number {
        return 0;
    }

    public update (particles: ParticleSOAData, params: ParticleSystemParams, context: ParticleUpdateContext,
        fromIndex: number, toIndex: number, dt: number) {
        const { randomSeed, invStartLifeTime, normalizedAliveTime } = particles;
        const { localToWorld } = context;
        const { simulationSpace } = params;
        for (let i = fromIndex; i < toIndex; i++) {
            particles.getPositionAt(inheritedPosition, i);
            particles.getFinalVelocity(inheritedVelocity, i);
            if (simulationSpace === Space.LOCAL) {
                Vec3.transformMat4(inheritedPosition, inheritedPosition, localToWorld);
                Vec3.transformMat4(inheritedVelocity, inheritedVelocity, localToWorld);
            }
            for (let j = 0; j < this.eventInfos.length; j++) {
                const eventInfo = this.eventInfos[i];
                if (eventInfo.condition === EventCondition.BIRTH && eventInfo.emitter && eventInfo.emitter.isValid
                    && !approx(eventInfo.probability, 0)
                    && pseudoRandom(randomSeed[i] + emitProbabilityRandomSeedOffset) <= eventInfo.probability) {
                    const spawnEvent = new SpawnEvent();
                    spawnEvent.emitter = eventInfo.emitter;
                    spawnEvent.deltaTime = dt;
                    spawnEvent.t = normalizedAliveTime[i] / invStartLifeTime[i];
                    spawnEvent.prevT = spawnEvent.t - dt;
                    spawnEvent.particleEmitterContext.localToWorld.set(localToWorld);
                    spawnEvent.particleEmitterContext.emitterVelocity.set(inheritedVelocity);
                    spawnEvent.particleEmitterContext.currentPosition.set(inheritedPosition);
                    spawnEvent.particleEmitterContext.lastPosition.set(inheritedPosition);
                    particleSystemManager.requestDispatchSpawnEvent(spawnEvent);
                }
            }
        }
    }
}
