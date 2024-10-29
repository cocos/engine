/*
 Copyright (c) 2022-2023 Xiamen Yaji Software Co., Ltd.

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
*/
/* eslint @typescript-eslint/no-explicit-any: "off" */

declare namespace spine {

    class String {
        constructor(name: string, own: boolean);
        constructor(val: spine.String);
        length: number;
        isEmpty: boolean;
        strPtr: number;
        str: string;
    }

    class SPVectorFloat {
        size(): number;
        resize(newSize: number, defaultValue: number);
        set(index: number, value: number);
        get(index: number): number;
        delete();
    }

    class Animation {
        constructor(name: string, timelines: Array<Timeline>, duration: number);
        duration: number;
        name: string;
        timelines: Array<Timeline>;
        apply(skeleton: Skeleton, lastTime: number, time: number, loop: boolean, events: Array<Event>, alpha: number, blend: MixBlend, direction: MixDirection): void;
        hasTimeline(id: number): boolean;
    }
    interface Timeline {
        apply(skeleton: Skeleton, lastTime: number, time: number, events: Array<Event>, alpha: number, blend: MixBlend, direction: MixDirection): void;
        getPropertyId(): number;
    }
    enum MixBlend {
        setup = 0,
        first = 1,
        replace = 2,
        add = 3
    }
    enum MixDirection {
        mixIn = 0,
        mixOut = 1
    }
    enum TimelineType {
        rotate = 0,
        translate = 1,
        scale = 2,
        shear = 3,
        attachment = 4,
        color = 5,
        deform = 6,
        event = 7,
        drawOrder = 8,
        ikConstraint = 9,
        transformConstraint = 10,
        pathConstraintPosition = 11,
        pathConstraintSpacing = 12,
        pathConstraintMix = 13,
        twoColor = 14
    }
    abstract class CurveTimeline implements Timeline {
        static readonly LINEAR: number;
        static readonly STEPPED: number;
        static readonly BEZIER: number;
        static readonly BEZIER_SIZE: number;
        abstract getPropertyId(): number;
        constructor(frameCount: number);
        getFrameCount(): number;
        setLinear(frameIndex: number): void;
        setStepped(frameIndex: number): void;
        getCurveType(frameIndex: number): number;
        setCurve(frameIndex: number, cx1: number, cy1: number, cx2: number, cy2: number): void;
        getCurvePercent(frameIndex: number, percent: number): number;
        abstract apply(skeleton: Skeleton, lastTime: number, time: number, events: Array<Event>, alpha: number, blend: MixBlend, direction: MixDirection): void;
    }
    class RotateTimeline extends CurveTimeline {
        static ENTRIES: number;
        static PREV_TIME: number;
        static PREV_ROTATION: number;
        static ROTATION: number;
        boneIndex: number;
        frames: ArrayLike<number>;
        constructor(frameCount: number);
        getPropertyId(): number;
        setFrame(frameIndex: number, time: number, degrees: number): void;
        apply(skeleton: Skeleton, lastTime: number, time: number, events: Array<Event>, alpha: number, blend: MixBlend, direction: MixDirection): void;
    }
    class TranslateTimeline extends CurveTimeline {
        static readonly ENTRIES: number;
        frames: ArrayLike<number>;
        constructor(frameCount: number);
        getPropertyId(): number;
        setFrame(frameIndex: number, time: number, x: number, y: number): void;
        apply(skeleton: Skeleton, lastTime: number, time: number, events: Array<Event>, alpha: number, blend: MixBlend, direction: MixDirection): void;
    }
    class ScaleTimeline extends TranslateTimeline {
        constructor(frameCount: number);
        getPropertyId(): number;
        apply(skeleton: Skeleton, lastTime: number, time: number, events: Array<Event>, alpha: number, blend: MixBlend, direction: MixDirection): void;
    }
    class ShearTimeline extends TranslateTimeline {
        constructor(frameCount: number);
        getPropertyId(): number;
        apply(skeleton: Skeleton, lastTime: number, time: number, events: Array<Event>, alpha: number, blend: MixBlend, direction: MixDirection): void;
    }
    class ColorTimeline extends CurveTimeline {
        static ENTRIES: number;
        slotIndex: number;
        frames: ArrayLike<number>;
        constructor(frameCount: number);
        getPropertyId(): number;
        getSlotIndex(): number;
        setSlotIndex(inValue: number): void;
        setFrame(frameIndex: number, time: number, r: number, g: number, b: number, a: number): void;
        apply(skeleton: Skeleton, lastTime: number, time: number, events: Array<Event>, alpha: number, blend: MixBlend, direction: MixDirection): void;
    }
    class TwoColorTimeline extends CurveTimeline {
        static readonly ENTRIES: number;
        slotIndex: number;
        frames: ArrayLike<number>;
        constructor(frameCount: number);
        getPropertyId(): number;
        getSlotIndex(): number;
        setSlotIndex(inValue: number): void;
        setFrame(frameIndex: number, time: number, r: number, g: number, b: number, a: number, r2: number, g2: number, b2: number): void;
        apply(skeleton: Skeleton, lastTime: number, time: number, events: Array<Event>, alpha: number, blend: MixBlend, direction: MixDirection): void;
    }
    class AttachmentTimeline implements Timeline {
        slotIndex: number;
        frames: ArrayLike<number>;
        attachmentNames: Array<string>;
        constructor(frameCount: number);
        getPropertyId(): number;
        getFrameCount(): number;
        getSlotIndex(): number;
        setSlotIndex(inValue: number): void;
        getAttachmentNames(): Array<string>;
        setFrame(frameIndex: number, time: number, attachmentName: string): void;
        apply(skeleton: Skeleton, lastTime: number, time: number, events: Array<Event>, alpha: number, blend: MixBlend, direction: MixDirection): void;
    }
    class DeformTimeline extends CurveTimeline {
        slotIndex: number;
        attachment: VertexAttachment;
        frames: ArrayLike<number>;
        frameVertices: Array<ArrayLike<number>>;
        constructor(frameCount: number);
        getPropertyId(): number;
        setFrame(frameIndex: number, time: number, vertices: ArrayLike<number>): void;
        apply(skeleton: Skeleton, lastTime: number, time: number, firedEvents: Array<Event>, alpha: number, blend: MixBlend, direction: MixDirection): void;
    }
    class EventTimeline implements Timeline {
        frames: ArrayLike<number>;
        events: Array<Event>;
        constructor(frameCount: number);
        getPropertyId(): number;
        getFrameCount(): number;
        setFrame(frameIndex: number, event: Event): void;
        apply(skeleton: Skeleton, lastTime: number, time: number, firedEvents: Array<Event>, alpha: number, blend: MixBlend, direction: MixDirection): void;
    }
    class DrawOrderTimeline implements Timeline {
        frames: ArrayLike<number>;
        drawOrders: Array<Array<number>>;
        constructor(frameCount: number);
        getPropertyId(): number;
        getFrameCount(): number;
        setFrame(frameIndex: number, time: number, drawOrder: Array<number>): void;
        apply(skeleton: Skeleton, lastTime: number, time: number, firedEvents: Array<Event>, alpha: number, blend: MixBlend, direction: MixDirection): void;
    }
    class IkConstraintTimeline extends CurveTimeline {
        static readonly ENTRIES: number;
        frames: ArrayLike<number>;
        constructor(frameCount: number);
        getPropertyId(): number;
        setFrame(frameIndex: number, time: number, mix: number, softness: number, bendDirection: number, compress: boolean, stretch: boolean): void;
        apply(skeleton: Skeleton, lastTime: number, time: number, firedEvents: Array<Event>, alpha: number, blend: MixBlend, direction: MixDirection): void;
    }
    class TransformConstraintTimeline extends CurveTimeline {
        static ENTRIES: number;
        constructor(frameCount: number);
        getPropertyId(): number;
        setFrame(frameIndex: number, time: number, rotateMix: number, translateMix: number, scaleMix: number, shearMix: number): void;
        apply(skeleton: Skeleton, lastTime: number, time: number, firedEvents: Array<Event>, alpha: number, blend: MixBlend, direction: MixDirection): void;
    }
    class PathConstraintPositionTimeline extends CurveTimeline {
        static readonly ENTRIES: number;
        constructor(frameCount: number);
        getPropertyId(): number;
        setFrame(frameIndex: number, time: number, value: number): void;
        apply(skeleton: Skeleton, lastTime: number, time: number, firedEvents: Array<Event>, alpha: number, blend: MixBlend, direction: MixDirection): void;
    }
    class PathConstraintSpacingTimeline extends PathConstraintPositionTimeline {
        constructor(frameCount: number);
        getPropertyId(): number;
        apply(skeleton: Skeleton, lastTime: number, time: number, firedEvents: Array<Event>, alpha: number, blend: MixBlend, direction: MixDirection): void;
    }
    class PathConstraintMixTimeline extends CurveTimeline {
        static readonly ENTRIES: number;
        frames: ArrayLike<number>;
        constructor(frameCount: number);
        getPropertyId(): number;
        setFrame(frameIndex: number, time: number, rotateMix: number, translateMix: number): void;
        apply(skeleton: Skeleton, lastTime: number, time: number, firedEvents: Array<Event>, alpha: number, blend: MixBlend, direction: MixDirection): void;
    }
    class AnimationState {
        data: AnimationStateData;
        tracks: TrackEntry[];
        timeScale: number;
        constructor(data: AnimationStateData);
        update(delta: number): void;
        apply(skeleton: Skeleton): boolean;
        applyAttachmentTimeline(timeline: AttachmentTimeline, skeleton: Skeleton, time: number, blend: MixBlend, attachments: boolean): void;
        setAttachment(skeleton: Skeleton, slot: Slot, attachmentName: string, attachments: boolean): void;
        applyRotateTimeline(timeline: Timeline, skeleton: Skeleton, time: number, alpha: number, blend: MixBlend, timelinesRotation: Array<number>, i: number, firstFrame: boolean): void;
        clearTracks(): void;
        clearTrack(trackIndex: number): void;
        setAnimation(trackIndex: number, animationName: string, loop: boolean): TrackEntry;
        setAnimationWith(trackIndex: number, animation: Animation, loop: boolean): TrackEntry;
        addAnimation(trackIndex: number, animationName: string, loop: boolean, delay: number): TrackEntry;
        addAnimationWith(trackIndex: number, animation: Animation, loop: boolean, delay: number): TrackEntry;
        setEmptyAnimation(trackIndex: number, mixDuration: number): TrackEntry;
        addEmptyAnimation(trackIndex: number, mixDuration: number, delay: number): TrackEntry;
        setEmptyAnimations(mixDuration: number): void;
        trackEntry(trackIndex: number, animation: Animation, loop: boolean, last: TrackEntry): TrackEntry;
        getCurrent(trackIndex: number): TrackEntry;
        setListener(listener: AnimationStateListener): void;
        clearListeners(): void;
    }
    class TrackEntry {
        animation: Animation;
        next: TrackEntry;
        mixingFrom: TrackEntry;
        mixingTo: TrackEntry;
        listener: AnimationStateListener;
        trackIndex: number;
        loop: boolean;
        holdPrevious: boolean;
        eventThreshold: number;
        attachmentThreshold: number;
        drawOrderThreshold: number;
        animationStart: number;
        animationEnd: number;
        animationLast: number;
        nextAnimationLast: number;
        delay: number;
        trackTime: number;
        trackLast: number;
        nextTrackLast: number;
        trackEnd: number;
        timeScale: number;
        alpha: number;
        mixTime: number;
        mixDuration: number;
        interruptAlpha: number;
        totalAlpha: number;
        mixBlend: MixBlend;
        timelineMode: number[];
        timelineHoldMix: TrackEntry[];
        timelinesRotation: number[];
        reset(): void;
        getAnimationTime(): number;
        setAnimationLast(animationLast: number): void;
        isComplete(): boolean;
        resetRotationDirections(): void;
    }
    class EventQueue {
        objects: Array<any>;
        drainDisabled: boolean;
        animState: AnimationState;
        constructor(animState: AnimationState);
        start(entry: TrackEntry): void;
        interrupt(entry: TrackEntry): void;
        end(entry: TrackEntry): void;
        dispose(entry: TrackEntry): void;
        complete(entry: TrackEntry): void;
        event(entry: TrackEntry, event: Event): void;
        drain(): void;
        clear(): void;
    }
    enum EventType {
        start = 0,
        interrupt = 1,
        end = 2,
        dispose = 3,
        complete = 4,
        event = 5
    }
    interface AnimationStateListener {
        start(entry: TrackEntry): void;
        interrupt(entry: TrackEntry): void;
        end(entry: TrackEntry): void;
        dispose(entry: TrackEntry): void;
        complete(entry: TrackEntry): void;
        event(entry: TrackEntry, event: Event): void;
    }
    abstract class AnimationStateAdapter implements AnimationStateListener {
        start(entry: TrackEntry): void;
        interrupt(entry: TrackEntry): void;
        end(entry: TrackEntry): void;
        dispose(entry: TrackEntry): void;
        complete(entry: TrackEntry): void;
        event(entry: TrackEntry, event: Event): void;
    }
    class AnimationStateData {
        skeletonData: SkeletonData;
        animationToMixTime: Map<string, number>;
        defaultMix: number;
        constructor(skeletonData: SkeletonData);
        setMix(fromName: string, toName: string, duration: number): void;
        setMixWith(from: Animation, to: Animation, duration: number): void;
        getMix(from: Animation, to: Animation): number;
    }
    class AssetManager implements Disposable {
        private pathPrefix;
        private textureLoader;
        private assets;
        private errors;
        private toLoad;
        private loaded;
        private rawDataUris;
        constructor(textureLoader: (image: HTMLImageElement) => any, pathPrefix?: string);
        private downloadText;
        private downloadBinary;
        setRawDataURI(path: string, data: string): void;
        loadBinary(path: string, success?: (path: string, binary: Uint8Array) => void, error?: (path: string, error: string) => void): void;
        loadText(path: string, success?: (path: string, text: string) => void, error?: (path: string, error: string) => void): void;
        loadTexture(path: string, success?: (path: string, image: HTMLImageElement) => void, error?: (path: string, error: string) => void): void;
        loadTextureAtlas(path: string, success?: (path: string, atlas: TextureAtlas) => void, error?: (path: string, error: string) => void): void;
        get(path: string): any;
        remove(path: string): void;
        removeAll(): void;
        isLoadingComplete(): boolean;
        getToLoad(): number;
        getLoaded(): number;
        dispose(): void;
        hasErrors(): boolean;
        getErrors(): Map<string, string>;
    }
    class AtlasAttachmentLoader implements AttachmentLoader {
        atlas: TextureAtlas;
        constructor(atlas: TextureAtlas);
        newRegionAttachment(skin: Skin, name: string, path: string): RegionAttachment;
        newMeshAttachment(skin: Skin, name: string, path: string): MeshAttachment;
        newBoundingBoxAttachment(skin: Skin, name: string): BoundingBoxAttachment;
        newPathAttachment(skin: Skin, name: string): PathAttachment;
        newPointAttachment(skin: Skin, name: string): PointAttachment;
        newClippingAttachment(skin: Skin, name: string): ClippingAttachment;
    }
    enum BlendMode {
        Normal = 0,
        Additive = 1,
        Multiply = 2,
        Screen = 3
    }
    class Bone implements Updatable {
        data: BoneData;
        skeleton: Skeleton;
        parent: Bone;
        children: Bone[];
        x: number;
        y: number;
        rotation: number;
        scaleX: number;
        scaleY: number;
        shearX: number;
        shearY: number;
        ax: number;
        ay: number;
        arotation: number;
        ascaleX: number;
        ascaleY: number;
        ashearX: number;
        ashearY: number;
        appliedValid: boolean;
        a: number;
        b: number;
        c: number;
        d: number;
        worldY: number;
        worldX: number;
        sorted: boolean;
        active: boolean;
        constructor(data: BoneData, skeleton: Skeleton, parent: Bone);
        isActive(): boolean;
        update(): void;
        updateWorldTransform(): void;
        updateWorldTransformWith(x: number, y: number, rotation: number, scaleX: number, scaleY: number, shearX: number, shearY: number): void;
        setToSetupPose(): void;
        getWorldRotationX(): number;
        getWorldRotationY(): number;
        getWorldScaleX(): number;
        getWorldScaleY(): number;
        worldToLocal(world: Vector2): Vector2;
        localToWorld(local: Vector2): Vector2;
        worldToLocalRotation(worldRotation: number): number;
        localToWorldRotation(localRotation: number): number;
        rotateWorld(degrees: number): void;
    }
    class BoneData {
        index: number;
        name: string;
        parent: BoneData;
        length: number;
        x: number;
        y: number;
        rotation: number;
        scaleX: number;
        scaleY: number;
        shearX: number;
        shearY: number;
        transformMode: TransformMode;
        skinRequired: boolean;
        constructor(index: number, name: string, parent: BoneData);
    }
    enum TransformMode {
        Normal = 0,
        OnlyTranslation = 1,
        NoRotationOrReflection = 2,
        NoScale = 3,
        NoScaleOrReflection = 4
    }
    abstract class ConstraintData {
        name: string;
        order: number;
        skinRequired: boolean;
        constructor(name: string, order: number, skinRequired: boolean);
    }
    class Event {
        data: EventData;
        intValue: number;
        floatValue: number;
        stringValue: string;
        time: number;
        volume: number;
        balance: number;
        constructor(time: number, data: EventData);
    }
    class EventData {
        name: string;
        intValue: number;
        floatValue: number;
        stringValue: string;
        audioPath: string;
        volume: number;
        balance: number;
        constructor(name: string);
    }
    class IkConstraint implements Updatable {
        data: IkConstraintData;
        bones: Array<Bone>;
        target: Bone;
        bendDirection: number;
        compress: boolean;
        stretch: boolean;
        mix: number;
        softness: number;
        active: boolean;
        constructor(data: IkConstraintData, skeleton: Skeleton);
        isActive(): boolean;
        apply(): void;
        update(): void;
        apply1(bone: Bone, targetX: number, targetY: number, compress: boolean, stretch: boolean, uniform: boolean, alpha: number): void;
        apply2(parent: Bone, child: Bone, targetX: number, targetY: number, bendDir: number, stretch: boolean, softness: number, alpha: number): void;
    }
    class IkConstraintData extends ConstraintData {
        bones: BoneData[];
        target: BoneData;
        bendDirection: number;
        compress: boolean;
        stretch: boolean;
        uniform: boolean;
        mix: number;
        softness: number;
        constructor(name: string);
    }
    class PathConstraint implements Updatable {
        static NONE: number;
        static BEFORE: number;
        static AFTER: number;
        static epsilon: number;
        data: PathConstraintData;
        bones: Array<Bone>;
        target: Slot;
        position: number;
        spacing: number;
        rotateMix: number;
        translateMix: number;
        spaces: number[];
        positions: number[];
        world: number[];
        curves: number[];
        lengths: number[];
        segments: number[];
        active: boolean;
        constructor(data: PathConstraintData, skeleton: Skeleton);
        isActive(): boolean;
        apply(): void;
        update(): void;
    }
    class PathConstraintData extends ConstraintData {
        bones: BoneData[];
        target: SlotData;
        positionMode: PositionMode;
        spacingMode: SpacingMode;
        rotateMode: RotateMode;
        offsetRotation: number;
        position: number;
        spacing: number;
        rotateMix: number;
        translateMix: number;
        constructor(name: string);
    }
    enum PositionMode {
        Fixed = 0,
        Percent = 1
    }
    enum SpacingMode {
        Length = 0,
        Fixed = 1,
        Percent = 2
    }
    enum RotateMode {
        Tangent = 0,
        Chain = 1,
        ChainScale = 2
    }
    class SharedAssetManager implements Disposable {
        private pathPrefix;
        private clientAssets;
        private queuedAssets;
        private rawAssets;
        private errors;
        constructor(pathPrefix?: string);
        private queueAsset;
        loadText(clientId: string, path: string): void;
        loadJson(clientId: string, path: string): void;
        loadTexture(clientId: string, textureLoader: (image: HTMLImageElement | ImageBitmap) => any, path: string): void;
        get(clientId: string, path: string): any;
        private updateClientAssets;
        isLoadingComplete(clientId: string): boolean;
        dispose(): void;
        hasErrors(): boolean;
        getErrors(): Map<string, string>;
    }
    class Skeleton {
        data: SkeletonData;
        bones: Array<Bone>;
        slots: Array<Slot>;
        drawOrder: Array<Slot>;
        ikConstraints: Array<IkConstraint>;
        transformConstraints: Array<TransformConstraint>;
        pathConstraints: Array<PathConstraint>;
        _updateCache: Updatable[];
        skin: Skin;
        color: Color;
        time: number;
        scaleX: number;
        scaleY: number;
        x: number;
        y: number;
        constructor(data: SkeletonData);
        updateCache(): void;
        updateWorldTransform(): void;
        setToSetupPose(): void;
        setBonesToSetupPose(): void;
        setSlotsToSetupPose(): void;
        getRootBone(): Bone;
        findBone(boneName: string): Bone;
        findBoneIndex(boneName: string): number;
        findSlot(slotName: string): Slot;
        findSlotIndex(slotName: string): number;
        setSkinByName(skinName: string): void;
        setSkin(newSkin: Skin): void;
        getAttachmentByName(slotName: string, attachmentName: string): Attachment;
        getAttachment(slotIndex: number, attachmentName: string): Attachment;
        setAttachment(slotName: string, attachmentName: string): void;
        findIkConstraint(constraintName: string): IkConstraint;
        findTransformConstraint(constraintName: string): TransformConstraint;
        findPathConstraint(constraintName: string): PathConstraint;
        //getBounds(offset: Vector2, size: Vector2, temp?: Array<number>): void;
        update(delta: number): void;
    }
    class SkeletonBinary {
        static AttachmentTypeValues: number[];
        static TransformModeValues: TransformMode[];
        static PositionModeValues: PositionMode[];
        static SpacingModeValues: SpacingMode[];
        static RotateModeValues: RotateMode[];
        static BlendModeValues: BlendMode[];
        static BONE_ROTATE: number;
        static BONE_TRANSLATE: number;
        static BONE_SCALE: number;
        static BONE_SHEAR: number;
        static SLOT_ATTACHMENT: number;
        static SLOT_COLOR: number;
        static SLOT_TWO_COLOR: number;
        static PATH_POSITION: number;
        static PATH_SPACING: number;
        static PATH_MIX: number;
        static CURVE_LINEAR: number;
        static CURVE_STEPPED: number;
        static CURVE_BEZIER: number;
        scale: number;
        attachmentLoader: AttachmentLoader;
        private linkedMeshes;
        constructor(attachmentLoader: AttachmentLoader);
        readSkeletonData(binary: Uint8Array): SkeletonData;
        private readSkin;
        private readAttachment;
        private readVertices;
        private readFloatArray;
        private readShortArray;
        private readAnimation;
        private readCurve;
        setCurve(timeline: CurveTimeline, frameIndex: number, cx1: number, cy1: number, cx2: number, cy2: number): void;
    }
    class SkeletonBounds {
        update(skeleton: Skeleton, updateAabb: boolean): void;
        aabbContainsPoint(x: number, y: number): boolean;
        aabbIntersectsSegment(x1: number, y1: number, x2: number, y2: number): boolean;
        aabbIntersectsSkeleton(bounds: SkeletonBounds): boolean;
        containsPoint(x: number, y: number): BoundingBoxAttachment;
        containsPointPolygon(polygon: ArrayLike<number>, x: number, y: number): boolean;
        intersectsSegment(x1: number, y1: number, x2: number, y2: number): BoundingBoxAttachment;
        intersectsSegmentPolygon(polygon: ArrayLike<number>, x1: number, y1: number, x2: number, y2: number): boolean;
        getPolygon(boundingBox: BoundingBoxAttachment): ArrayLike<number>;
        getWidth(): number;
        getHeight(): number;
    }
    class SkeletonClipping {
        private triangulator;
        private clippingPolygon;
        private clipOutput;
        clippedVertices: number[];
        clippedTriangles: number[];
        clippedUVs: number[];
        private scratch;
        private clipAttachment;
        private clippingPolygons;
        clipStart(slot: Slot, clip: ClippingAttachment): number;
        clipEndWithSlot(slot: Slot): void;
        clipEnd(): void;
        isClipping(): boolean;
        clipTriangles(vertices: ArrayLike<number>, verticesLength: number, triangles: ArrayLike<number>, trianglesLength: number, uvs: ArrayLike<number>, light: Color, dark: Color, twoColor: boolean, strideFloat?: number, offsetV?: number, offsetI?: number): void;
    }
    class SkeletonData {
        name: string;
        bones: BoneData[];
        slots: SlotData[];
        skins: Skin[];
        defaultSkin: Skin;
        events: EventData[];
        animations: Animation[];
        ikConstraints: IkConstraintData[];
        transformConstraints: TransformConstraintData[];
        pathConstraints: PathConstraintData[];
        x: number;
        y: number;
        width: number;
        height: number;
        version: string;
        hash: string;
        fps: number;
        imagesPath: string;
        audioPath: string;
        findBone(boneName: string): BoneData;
        findBoneIndex(boneName: string): number;
        findSlot(slotName: string): SlotData;
        findSlotIndex(slotName: string): number;
        findSkin(skinName: string): Skin;
        findEvent(eventDataName: string): EventData;
        findAnimation(animationName: string): Animation;
        findIkConstraint(constraintName: string): IkConstraintData;
        findTransformConstraint(constraintName: string): TransformConstraintData;
        findPathConstraint(constraintName: string): PathConstraintData;
        findPathConstraintIndex(pathConstraintName: string): number;
    }
    class SkeletonJson {
        attachmentLoader: AttachmentLoader;
        scale: number;
        private linkedMeshes;
        constructor(attachmentLoader: AttachmentLoader);
        readSkeletonData(json: string): SkeletonData;
        readAttachment(map: any, skin: Skin, slotIndex: number, name: string, skeletonData: SkeletonData): Attachment;
        readVertices(map: any, attachment: VertexAttachment, verticesLength: number): void;
        readAnimation(map: any, name: string, skeletonData: SkeletonData): void;
        readCurve(map: any, timeline: CurveTimeline, frameIndex: number): void;
        getValue(map: any, prop: string, defaultValue: any): any;
        static blendModeFromString(str: string): BlendMode;
        static positionModeFromString(str: string): PositionMode;
        static spacingModeFromString(str: string): SpacingMode;
        static rotateModeFromString(str: string): RotateMode;
        static transformModeFromString(str: string): TransformMode;
    }
    class SkinEntry {
        slotIndex: number;
        name: string;
        attachment: Attachment;
        constructor(slotIndex: number, name: string, attachment: Attachment);
    }
    class Skin {
        name: string;
        attachments: Map<string, Attachment>[];
        bones: BoneData[];
        constraints: ConstraintData[];
        constructor(name: string);
        setAttachment(slotIndex: number, name: string, attachment: Attachment): void;
        addSkin(skin: Skin): void;
        copySkin(skin: Skin): void;
        findNamesForSlot(slotIndex: number, names: Array<string>): void;
        getBones(): Array<Bone>;
        getConstraints(): Array<ConstraintData>;
        getAttachment(slotIndex: number, name: string): Attachment;
        removeAttachment(slotIndex: number, name: string): void;
        getAttachments(): Array<SkinEntry>;
        getAttachmentsForSlot(slotIndex: number, attachments: Array<SkinEntry>): void;
    }
    class Slot {
        data: SlotData;
        bone: Bone;
        color: Color;
        darkColor: Color;
        attachment: Attachment;
        private attachmentTime;
        attachmentState: number;
        deform: number[];
        constructor(data: SlotData, bone: Bone);
        getSkeleton(): Skeleton;
        getAttachment(): Attachment;
        setAttachment(attachment: Attachment): void;
        setAttachmentTime(time: number): void;
        getAttachmentTime(): number;
        setToSetupPose(): void;
    }
    class SlotData {
        index: number;
        name: string;
        boneData: BoneData;
        color: Color;
        darkColor: Color;
        attachmentName: string;
        blendMode: BlendMode;
        constructor(index: number, name: string, boneData: BoneData);
    }
    abstract class Texture {
        protected _image: HTMLImageElement | ImageBitmap;
        constructor(image: HTMLImageElement | ImageBitmap);
        getImage(): HTMLImageElement | ImageBitmap;
        abstract setFilters(minFilter: TextureFilter, magFilter: TextureFilter): void;
        abstract setWraps(uWrap: TextureWrap, vWrap: TextureWrap): void;
        abstract dispose(): void;
        static filterFromString(text: string): TextureFilter;
        static wrapFromString(text: string): TextureWrap;
    }
    enum TextureFilter {
        Nearest = 9728,
        Linear = 9729,
        MipMap = 9987,
        MipMapNearestNearest = 9984,
        MipMapLinearNearest = 9985,
        MipMapNearestLinear = 9986,
        MipMapLinearLinear = 9987
    }
    enum TextureWrap {
        MirroredRepeat = 33648,
        ClampToEdge = 33071,
        Repeat = 10497
    }
    class TextureRegion {
        renderObject: any;
        u: number;
        v: number;
        u2: number;
        v2: number;
        width: number;
        height: number;
        rotate: boolean;
        offsetX: number;
        offsetY: number;
        originalWidth: number;
        originalHeight: number;
    }
    class FakeTexture extends Texture {
        setFilters(minFilter: TextureFilter, magFilter: TextureFilter): void;
        setWraps(uWrap: TextureWrap, vWrap: TextureWrap): void;
        dispose(): void;
    }
    class TextureAtlas implements Disposable {
        pages: TextureAtlasPage[];
        regions: TextureAtlasRegion[];
        constructor(atlasText: string, textureLoader: (path: string) => any);
        private load;
        findRegion(name: string): TextureAtlasRegion;
        dispose(): void;
    }
    class TextureAtlasPage {
        name: string;
        minFilter: TextureFilter;
        magFilter: TextureFilter;
        uWrap: TextureWrap;
        vWrap: TextureWrap;
        texture: Texture;
        width: number;
        height: number;
    }
    class TextureAtlasRegion extends TextureRegion {
        page: TextureAtlasPage;
        name: string;
        x: number;
        y: number;
        index: number;
        rotate: boolean;
        degrees: number;
        texture: Texture;
    }
    class TransformConstraint implements Updatable {
        data: TransformConstraintData;
        bones: Array<Bone>;
        target: Bone;
        rotateMix: number;
        translateMix: number;
        scaleMix: number;
        shearMix: number;
        active: boolean;
        constructor(data: TransformConstraintData, skeleton: Skeleton);
        isActive(): boolean;
        apply(): void;
        update(): void;
    }
    class TransformConstraintData extends ConstraintData {
        bones: BoneData[];
        target: BoneData;
        rotateMix: number;
        translateMix: number;
        scaleMix: number;
        shearMix: number;
        offsetRotation: number;
        offsetX: number;
        offsetY: number;
        offsetScaleX: number;
        offsetScaleY: number;
        offsetShearY: number;
        relative: boolean;
        local: boolean;
        constructor(name: string);
    }
    class Triangulator {
        private convexPolygons;
        private convexPolygonsIndices;
        private indicesArray;
        private isConcaveArray;
        private triangles;
        private polygonPool;
        private polygonIndicesPool;
        triangulate(verticesArray: ArrayLike<number>): Array<number>;
        decompose(verticesArray: Array<number>, triangles: Array<number>): Array<Array<number>>;
        private static isConcave;
        private static positiveArea;
        private static winding;
    }
    abstract class Updatable {
        update(): void;
        isActive(): boolean;
    }
    class IntSet {
        array: number[];
        add(value: number): boolean;
        contains(value: number): boolean;
        remove(value: number): void;
        clear(): void;
    }
    interface Disposable {
        dispose(): void;
    }
    interface Restorable {
        restore(): void;
    }
    class Color {
        r: number;
        g: number;
        b: number;
        a: number;
        static WHITE: Color;
        static RED: Color;
        static GREEN: Color;
        static BLUE: Color;
        static MAGENTA: Color;
        constructor(r?: number, g?: number, b?: number, a?: number);
        set(r: number, g: number, b: number, a: number): Color;
        setFromColor(c: Color): Color;
        setFromString(hex: string): Color;
        add(r: number, g: number, b: number, a: number): Color;
        clamp(): Color;
        static rgba8888ToColor(color: Color, value: number): void;
        static rgb888ToColor(color: Color, value: number): void;
    }
    class MathUtils {
        static readonly PI: number;
        static readonly PI2: number;
        static readonly radiansToDegrees: number;
        static readonly radDeg: number;
        static readonly degreesToRadians: number;
        static readonly degRad: number;
        static abs(value: number): number;
        static signum(value: number): number;
        static clamp(value: number, min: number, max: number): number;
        static fmod(a: number, b: number): number;
        static atan2(y: number, x: number): number;
        static cos(radians: number): number;
        static sin(radians: number): number;
        static sqrt(value: number): number;
        static acos(value: number): number;
        static sinDeg(degrees: number): number;
        static cosDeg(degrees: number): number;
        static isNan(value: number): number;
        static random(): number;
        static randomTriangular(min: number, max: number): number;
        static randomTriangularWith(min: number, max: number, mode: number): number;
        static pow(a: number, b: number): number;
    }
    abstract class Interpolation {
        protected abstract applyInternal(a: number): number;
        apply(start: number, end: number, a: number): number;
    }
    class Pow extends Interpolation {
        protected power: number;
        constructor(power: number);
        applyInternal(a: number): number;
    }
    class PowOut extends Pow {
        constructor(power: number);
        applyInternal(a: number): number;
    }
    class Utils {
        static SUPPORTS_TYPED_ARRAYS: boolean;
        static arrayCopy<T>(source: ArrayLike<T>, sourceStart: number, dest: ArrayLike<T>, destStart: number, numElements: number): void;
        static setArraySize<T>(array: Array<T>, size: number, value?: any): Array<T>;
        static ensureArrayCapacity<T>(array: Array<T>, size: number, value?: any): Array<T>;
        static newArray<T>(size: number, defaultValue: T): Array<T>;
        static newFloatArray(size: number): ArrayLike<number>;
        static newShortArray(size: number): ArrayLike<number>;
        static toFloatArray(array: Array<number>): number[] | Float32Array;
        static toSinglePrecision(value: number): number;
        static webkit602BugfixHelper(alpha: number, blend: MixBlend): void;
        static contains<T>(array: Array<T>, element: T, identity?: boolean): boolean;
    }
    class DebugUtils {
        static logBones(skeleton: Skeleton): void;
    }
    class Pool<T> {
        private items;
        private instantiator;
        constructor(instantiator: () => T);
        obtain(): T;
        free(item: T): void;
        freeAll(items: ArrayLike<T>): void;
        clear(): void;
    }
    class Vector2 {
        x: number;
        y: number;
        constructor(x?: number, y?: number);
        set(x: number, y: number): Vector2;
        length(): number;
        normalize(): Vector2;
    }
    class TimeKeeper {
        maxDelta: number;
        framesPerSecond: number;
        delta: number;
        totalTime: number;
        private lastTime;
        private frameCount;
        private frameTime;
        update(): void;
    }
    interface ArrayLike<T> {
        length: number;
        [n: number]: T;
    }
    class WindowedMean {
        values: Array<number>;
        addedValues: number;
        lastValue: number;
        mean: number;
        dirty: boolean;
        constructor(windowSize?: number);
        hasEnoughData(): boolean;
        addValue(value: number): void;
        getMean(): number;
    }
    abstract class VertexEffect {
        begin(skeleton: Skeleton): void;
        transform(x: number, y: number): void;
        end(): void;
    }
    // interface Math {
    //     fround(n: number): number;
    // }
    abstract class Attachment {
        name: string;
        constructor(name: string);
        abstract copy(): Attachment;
    }
    abstract class VertexAttachment extends Attachment {
        private static nextID;
        id: number;
        bones: Array<number>;
        vertices: ArrayLike<number>;
        worldVerticesLength: number;
        deformAttachment: VertexAttachment;
        constructor(name: string);
        computeWorldVertices(slot: Slot, start: number, count: number, worldVertices: ArrayLike<number>, offset: number, stride: number): void;
        copyTo(attachment: VertexAttachment): void;
    }
    interface AttachmentLoader {
        newRegionAttachment(skin: Skin, name: string, path: string): RegionAttachment;
        newMeshAttachment(skin: Skin, name: string, path: string): MeshAttachment;
        newBoundingBoxAttachment(skin: Skin, name: string): BoundingBoxAttachment;
        newPathAttachment(skin: Skin, name: string): PathAttachment;
        newPointAttachment(skin: Skin, name: string): PointAttachment;
        newClippingAttachment(skin: Skin, name: string): ClippingAttachment;
    }
    enum AttachmentType {
        Region = 0,
        BoundingBox = 1,
        Mesh = 2,
        LinkedMesh = 3,
        Path = 4,
        Point = 5,
        Clipping = 6
    }
    class BoundingBoxAttachment extends VertexAttachment {
        constructor(name: string);
        copy(): Attachment;
    }
    class ClippingAttachment extends VertexAttachment {
        endSlot: SlotData;
        constructor(name: string);
        copy(): Attachment;
    }
    class MeshAttachment extends VertexAttachment {
        path: string;
        regionUVs: ArrayLike<number>;
        uvs: ArrayLike<number>;
        triangles: Array<number>;
        color: Color;
        width: number;
        height: number;
        hullLength: number;
        edges: Array<number>;
        private parentMesh;
        constructor(name: string);
        updateUVs(): void;
        getParentMesh(): MeshAttachment;
        setParentMesh(parentMesh: MeshAttachment): void;
        copy(): Attachment;
        newLinkedMesh(): MeshAttachment;
    }
    class PathAttachment extends VertexAttachment {
        lengths: Array<number>;
        closed: boolean;
        constantSpeed: boolean;
        constructor(name: string);
        copy(): Attachment;
    }
    class PointAttachment extends VertexAttachment {
        x: number;
        y: number;
        rotation: number;
        constructor(name: string);
        computeWorldPosition(bone: Bone, point: Vector2): Vector2;
        computeWorldRotation(bone: Bone): number;
        copy(): Attachment;
    }
    class RegionAttachment extends Attachment {
        static OX1: number;
        static OY1: number;
        static OX2: number;
        static OY2: number;
        static OX3: number;
        static OY3: number;
        static OX4: number;
        static OY4: number;
        static X1: number;
        static Y1: number;
        static C1R: number;
        static C1G: number;
        static C1B: number;
        static C1A: number;
        static U1: number;
        static V1: number;
        static X2: number;
        static Y2: number;
        static C2R: number;
        static C2G: number;
        static C2B: number;
        static C2A: number;
        static U2: number;
        static V2: number;
        static X3: number;
        static Y3: number;
        static C3R: number;
        static C3G: number;
        static C3B: number;
        static C3A: number;
        static U3: number;
        static V3: number;
        static X4: number;
        static Y4: number;
        static C4R: number;
        static C4G: number;
        static C4B: number;
        static C4A: number;
        static U4: number;
        static V4: number;
        x: number;
        y: number;
        scaleX: number;
        scaleY: number;
        rotation: number;
        width: number;
        height: number;
        color: Color;
        path: string;
        rendererObject: any;
        region: TextureRegion;
        offset: ArrayLike<number>;
        uvs: ArrayLike<number>;
        tempColor: Color;
        constructor(name: string);
        updateOffset(): void;
        computeWorldVertices(bone: Bone, worldVertices: ArrayLike<number>, offset: number, stride: number): void;
        copy(): Attachment;
    }
    class JitterEffect implements VertexEffect {
        jitterX: number;
        jitterY: number;
        constructor(jitterX: number, jitterY: number);
        begin(skeleton: Skeleton): void;
        transform(x: number, y: number): void;
        end(): void;
    }
    class SwirlEffect implements VertexEffect {
        static interpolation: PowOut;
        centerX: number;
        centerY: number;
        radius: number;
        angle: number;
        worldX;
        worldY;
        constructor(radius: number, interpolation?: Interpolation);
        begin(skeleton: Skeleton): void;
        transform(x: number, y: number): void;
        end(): void;
    }

    class SkeletonSystem {
        public static destroySpineInstance(instance: SkeletonInstance): void;
        public static updateAnimation(deltaTime: number): void;
        public static updateRenderData(): void;
        public static getCount(): number;
    }

    class SkeletonInstance {
        dtRate: number;
        isCache: boolean;
        isDelete: boolean;
        enable: boolean;
        setTrackEntryListener: any;
        destroy();
        initSkeleton(data: SkeletonData);
        getAnimationState();
        setAnimation(trackIndex: number, name: string, loop: boolean): spine.TrackEntry | null;
        setSkin(name: string);
        setPremultipliedAlpha(usePremultipliedAlpha: boolean);
        setColor(r: number, g: number, b: number, a: number);
        setMix(fromName: string, toName: string, duration: number);
        updateAnimation(dt: number);
        setUseTint(useTint: boolean);
        clearEffect();
        setJitterEffect(jitter: spine.VertexEffect);
        setSwirlEffect(swirl: spine.VertexEffect);
        updateRenderData();
        setListener(id: number);
        setDebugMode(debug: boolean);
        getDebugShapes();
        resizeSlotRegion(slotName: string, width: number, height: number, createNew: boolean);
        setSlotTexture(slotName: string, index: number);
    }

    class wasmUtil {
        static spineWasmInit(): void;
        static spineWasmDestroy(): void;
        static queryStoreMemory(size: number): number;
        static querySpineSkeletonDataByUUID(uuid: string): SkeletonData;
        static createSpineSkeletonDataWithJson(jsonStr: string, atlasText: string): SkeletonData;
        static createSpineSkeletonDataWithBinary(byteSize: number, atlasText: string): SkeletonData;
        static registerSpineSkeletonDataWithUUID(data: SkeletonData, uuid: string);
        static destroySpineSkeletonDataWithUUID(uuid: string);
        static destroySpineSkeleton(skeleton: Skeleton): void;
        static getCurrentListenerID(): number;
        static getCurrentEventType(): EventType;
        static getCurrentTrackEntry(): TrackEntry;
        static getCurrentEvent(): Event;
        static wasm: any;
    }
}

export default spine;
