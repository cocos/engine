/*
 Copyright (c) 2008-2010 Ricardo Quesada
 Copyright (c) 2011-2012 cocos2d-x.org
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.

 http://www.cocos2d-x.org

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

import { ccclass } from 'cc.decorator';
import { EDITOR, TEST, BUILD } from 'internal:constants';
import { Rect, Size, Vec2, Vec3, Vec4, cclegacy, errorID, warnID, js, v3, mat4, rect, v4, v2, size } from '../../core';
import { Asset } from '../../asset/assets/asset';
import { TextureBase } from '../../asset/assets/texture-base';
import { ImageAsset, ImageSource } from '../../asset/assets/image-asset';
import { Texture2D } from '../../asset/assets/texture-2d';
import { dynamicAtlasManager } from '../utils/dynamic-atlas/atlas-manager';
import { Mesh } from '../../3d/assets/mesh';
import { createMesh } from '../../3d/misc';
import { Attribute, AttributeName, Format, PrimitiveMode, Sampler, SamplerInfo, Texture } from '../../gfx';
import { ccwindow } from '../../core/global-exports';

const INSET_LEFT = 0;
const INSET_TOP = 1;
const INSET_RIGHT = 2;
const INSET_BOTTOM = 3;
const temp_vec3 = v3();
const temp_matrix = mat4();

const vec3TransformMat4 = Vec3.transformMat4;
const vec3ToArray = Vec3.toArray;

enum MeshType {
    RECT = 0,
    POLYGON = 1, // Todo: Polygon mode need add
}

/**
 * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
 */
export interface IUV {
    u: number;
    v: number;
}

interface IVertices {
    rawPosition: Vec3[]; // Original position of the vertex, pixel value
    positions: number[]; // The position of the vertex after being affected by the attribute
    indexes: number[]; // IB
    uv: number[]; // Pixel uv value
    nuv: number[]; // Normalized uv value
    minPos: Vec3;
    maxPos: Vec3;
}

interface IVerticesSerialize { // hack for format
    rawPosition: number[];
    indexes: number[];
    uv: number[];
    nuv: number[];
    minPos: Vec3;
    maxPos: Vec3;
}

interface ISpriteFramesSerializeData {
    name: string;
    base: string;
    image: string;
    atlas: string | undefined;
    rect: Rect;
    offset: Vec2;
    originalSize: Size;
    rotated: boolean;
    capInsets: number[];
    vertices: IVerticesSerialize;
    texture: string;
    packable: boolean;
    pixelsToUnit: number;
    pivot: Vec2;
    meshType: MeshType;
}

interface ISpriteFrameOriginal {
    spriteframe: SpriteFrame;
    x: number;
    y: number;
}

/**
 * @en Information object interface for initialize a [[SpriteFrame]] asset.
 * @zh 用于初始化 [[SpriteFrame]] 资源的对象接口描述。
 */
export interface ISpriteFrameInitInfo {
    /**
     * @en The texture of the sprite frame, could be `TextureBase`.
     * @zh 贴图对象资源，可以是 `TextureBase` 类型。
     */
    texture?: TextureBase;
    /**
     * @en The original size of the sprite frame.
     * @zh 精灵帧原始尺寸。
     */
    originalSize?: Size;
    /**
     * @en The rect of the sprite frame in atlas texture.
     * @zh 精灵帧裁切矩形。
     */
    rect?: Rect;
    /**
     * @en The offset of the sprite frame center from the original center of the original rect.
     * Sprite frame in an atlas texture could be trimmed for clipping the transparent pixels, so the trimmed rect is smaller than the original one,
     * the offset defines the distance from the original center to the trimmed center.
     * @zh 精灵帧偏移量。
     * 在图集中的精灵帧可能会被剔除透明像素以获得更高的空间利用李，剔除后的矩形尺寸比剪裁前更小，偏移量指的是从原始矩形的中心到剪裁后的矩形中心的距离。
     */
    offset?: Vec2;
    /**
     * @en Top side border for sliced 9 frame.
     * @zh 九宫格精灵帧的上边界。
     * @default 0
     */
    borderTop?: number;
    /**
     * @en Bottom side border for sliced 9 frame.
     * @zh 九宫格精灵帧的下边界。
     * @default 0
     */
    borderBottom?: number;
    /**
     * @en Left side border for sliced 9 frame.
     * @zh 九宫格精灵帧的左边界。
     * @default 0
     */
    borderLeft?: number;
    /**
     * @en Right side border for sliced 9 frame.
     * @zh 九宫格精灵帧的右边界。
     * @default 0
     */
    borderRight?: number;
    /**
     * @en Whether the content of sprite frame is rotated.
     * @zh 是否旋转。
     */
    isRotate?: boolean;
    /**
     * @en Whether the uv is flipped.
     * @zh 是否转置 UV。
     */
    isFlipUv?: boolean;
}

const temp_uvs: IUV[] = [{ u: 0, v: 0 }, { u: 0, v: 0 }, { u: 0, v: 0 }, { u: 0, v: 0 }];

export enum SpriteFrameEvent {
    UV_UPDATED = 'uv_updated',
}

/**
 * @en
 * A `SpriteFrame` support several types.
 *  1. Rectangle sprite frame
 *  2. Sliced 9 sprite frame
 *  3. Mesh sprite frame
 * It mainly contains:<br/>
 *  - texture: A `TextureBase` that will be used by render process.<br/>
 *  - rectangle: A rectangle of the texture.
 *  - Sliced 9 border insets: The distance of each side from the internal rect to the sprite frame rect.
 *  - vertices: Vertex list for the mesh type sprite frame.
 *  - uv: The quad uv.
 *  - uvSliced: The sliced 9 uv.
 *
 * @zh
 * 精灵帧资源。
 * 一个 SpriteFrame 支持多种类型
 *  1. 矩形精灵帧
 *  2. 九宫格精灵帧
 *  3. 网格精灵帧
 * 它主要包含下列数据：<br/>
 *  - 纹理：会被渲染流程使用的 `TextureBase` 资源。<br/>
 *  - 矩形：在纹理中的矩形区域。
 *  - 九宫格信息：九宫格的内部矩形四个边距离 SpriteFrame 外部矩形的距离。
 *  - 网格信息：网格类型精灵帧的所有顶点列表。
 *  - uv: 四边形 UV。
 *  - uvSliced: 九宫格 UV。
 * 可通过 `SpriteFrame` 获取该组件。
 *
 * @example
 * ```ts
 * import { resources } from 'cc';
 * // First way to use a SpriteFrame
 * const url = "assets/PurpleMonster/icon/spriteFrame";
 * resources.load(url, (err, spriteFrame) => {
 *   const node = new Node("New Sprite");
 *   const sprite = node.addComponent(Sprite);
 *   sprite.spriteFrame = spriteFrame;
 *   node.parent = self.node;
 * });
 *
 * // Second way to use a SpriteFrame
 * const self = this;
 * const url = "test_assets/PurpleMonster";
 * resources.load(url, (err, imageAsset) => {
 *  if(err){
 *    return;
 *  }
 *
 *  const node = new Node("New Sprite");
 *  const sprite = node.addComponent(Sprite);
 *  const spriteFrame = new SpriteFrame();
 *  const tex = imageAsset._texture;
 *  spriteFrame.texture = tex;
 *  sprite.spriteFrame = spriteFrame;
 *  node.parent = self.node;
 * });
 *
 * // Third way to use a SpriteFrame
 * const self = this;
 * const cameraComp = this.getComponent(Camera);
 * const renderTexture = new RenderTexture();
 * renderTexture.reset({
 *   width: 512,
 *   height: 512,
 *   depthStencilFormat: RenderTexture.DepthStencilFormat.DEPTH_24_STENCIL_8
 * });
 *
 * cameraComp.targetTexture = renderTexture;
 * const spriteFrame = new SpriteFrame();
 * spriteFrame.texture = renderTexture;
 * ```
 */
@ccclass('cc.SpriteFrame')
export class SpriteFrame extends Asset {
    /**
     * @en Create a SpriteFrame object by an image asset or an native image asset.
     * @zh 通过 Image 资源或者平台相关 Image 对象创建一个 SpriteFrame 资源。
     * @param imageSourceOrImageAsset @en ImageAsset or ImageSource, ImageSource could be HTMLCanvasElement, HTMLImageElement, IMemoryImageSource.
     *                                @zh 图像资源或图像原始图像源，图像原始图像源支持 HTMLCanvasElement HTMLImageElement IMemoryImageSource 三种资源。
     * @returns @en SpriteFrame asset. @zh 精灵资源。
     */
    public static createWithImage (imageSourceOrImageAsset: ImageSource | ImageAsset): SpriteFrame {
        const img = imageSourceOrImageAsset instanceof ImageAsset ? imageSourceOrImageAsset : new ImageAsset(imageSourceOrImageAsset);
        const tex = new Texture2D();
        tex.image = img;
        const spf = new SpriteFrame();
        spf.texture = tex;
        return spf;
    }

    /**
     * @en uv update event.
     * @zh uv 更新事件。
     */
    public static EVENT_UV_UPDATED = SpriteFrameEvent.UV_UPDATED;
    public static MeshType = MeshType;

    /**
     * @en Top border distance of sliced 9 rect.
     * @zh 九宫格内部矩形顶部边框距离 SpriteFrame 矩形的距离。
     */
    get insetTop (): number {
        return this._capInsets[INSET_TOP];
    }

    set insetTop (value) {
        if (this._capInsets[INSET_TOP] === value) {
            return;
        }

        this._capInsets[INSET_TOP] = value;
        if (this._texture) {
            this._calculateSlicedUV();
        }
    }

    /**
     * @en Bottom border distance of sliced 9 rect.
     * @zh 九宫格内部矩形底部边框距离 SpriteFrame 矩形的距离。
     */
    get insetBottom (): number {
        return this._capInsets[INSET_BOTTOM];
    }

    set insetBottom (value) {
        if (this._capInsets[INSET_BOTTOM] === value) {
            return;
        }

        this._capInsets[INSET_BOTTOM] = value;
        if (this._texture) {
            this._calculateSlicedUV();
        }
    }

    /**
     * @en Left border distance of sliced 9 rect.
     * @zh 九宫格内部矩形左边框距离 SpriteFrame 矩形的距离。
     */
    get insetLeft (): number {
        return this._capInsets[INSET_LEFT];
    }

    set insetLeft (value) {
        if (this._capInsets[INSET_LEFT] === value) {
            return;
        }

        this._capInsets[INSET_LEFT] = value;
        if (this._texture) {
            this._calculateSlicedUV();
        }
    }

    /**
     * @en Right border distance of sliced 9 rect.
     * @zh 九宫格内部矩形右边框距离 SpriteFrame 矩形的距离。
     */
    get insetRight (): number {
        return this._capInsets[INSET_RIGHT];
    }

    set insetRight (value) {
        if (this._capInsets[INSET_RIGHT] === value) {
            return;
        }

        this._capInsets[INSET_RIGHT] = value;
        if (this._texture) {
            this._calculateSlicedUV();
        }
    }

    /**
     * @en Returns the rect of the sprite frame in the texture.
     * If it's an atlas texture, a transparent pixel area is proposed for the actual mapping of the current texture.
     * @zh 获取 SpriteFrame 的纹理矩形区域。
     * 如果是一个 atlas 的贴图，则为当前贴图的实际剔除透明像素区域。
     */
    get rect (): Rect {
        return this._rect;
    }

    set rect (value) {
        if (this._rect.equals(value)) {
            return;
        }

        this._rect.set(value);
        if (this._texture) {
            this._calculateUV();
        }
        this._calcTrimmedBorder();
    }

    /**
     * @en The original size before trimmed.
     * @zh 修剪前的原始大小。
     */
    get originalSize (): Size {
        return this._originalSize;
    }

    set originalSize (value) {
        if (this._originalSize.equals(value)) {
            return;
        }

        this._originalSize.set(value);
        if (this._texture) {
            this._calculateUV();
        }
        this._calcTrimmedBorder();
    }

    /**
     * @en The offset of the sprite frame center.
     * Sprite frame in an atlas texture could be trimmed for clipping the transparent pixels, so the trimmed rect is smaller than the original one,
     * the offset defines the distance from the original center to the trimmed center.
     * @zh 精灵帧偏移量。
     * 在图集中的精灵帧可能会被剔除透明像素以获得更高的空间利用李，剔除后的矩形尺寸比剪裁前更小，偏移量指的是从原始矩形的中心到剪裁后的矩形中心的距离。
     */
    get offset (): Vec2 {
        return this._offset;
    }

    set offset (value) {
        this._offset.set(value);
        this._calcTrimmedBorder();
    }

    /**
     * @en Whether the content of sprite frame is rotated.
     * @zh 是否旋转。
     */
    get rotated (): boolean {
        return this._rotated;
    }

    set rotated (rotated) {
        if (this._rotated === rotated) {
            return;
        }

        this._rotated = rotated;
        if (this._texture) {
            this._calculateUV();
        }
    }

    /**
     * @en The texture of the sprite frame, could be `TextureBase`.
     * @zh 贴图对象资源，可以是 `TextureBase` 类型。
     */
    get texture (): TextureBase {
        return this._texture;
    }

    set texture (value) {
        if (!value) {
            warnID(3122, this.name);
            return;
        }

        if (value === this._texture) {
            return;
        }

        this.reset({ texture: value }, true);
    }

    /**
     * @en The uuid of the atlas asset, if exists.
     * @zh 图集资源的 uuid。
     */
    get atlasUuid (): string {
        return this._atlasUuid;
    }

    set atlasUuid (value: string) {
        this._atlasUuid = value;
    }

    /**
     * @en The pixel width of the sprite frame.
     * @zh 精灵帧的像素宽度。
     */
    get width (): number {
        return this._texture.width;
    }

    /**
     * @en The pixel height of the sprite frame.
     * @zh 精灵帧的像素高度。
     */
    get height (): number {
        return this._texture.height;
    }

    /**
     * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    set _textureSource (value: TextureBase) {
        // Optimization for build
        if (globalThis.Build) {
            this._texture = value;
            return;
        }
        if (value) {
            this._refreshTexture(value);
            this._calculateUV();
        }
    }

    /**
     * @en Whether flip the uv in X direction.
     * @zh 沿 X 轴方向, 翻转 UV。
     */
    get flipUVX (): boolean {
        return this._isFlipUVX;
    }

    set flipUVX (value) {
        this._isFlipUVX = value;
        this._calculateUV();
    }

    /**
     * @en Whether flip the uv in Y direction.
     * @zh 沿 Y 轴方向, 翻转 UV。
     */
    get flipUVY (): boolean {
        return this._isFlipUVY;
    }

    set flipUVY (value) {
        this._isFlipUVY = value;
        this._calculateUV();
    }

    /**
     * @en Sets whether sprite can be packed into dynamic atlas.
     * @zh 设置精灵是否允许参与自动合图。
     */
    get packable (): boolean {
        return this._packable;
    }
    set packable (value: boolean) {
        this._packable = value;
    }

    /**
     * @en Original information before packed to dynamic atlas, includes texture, width, height. It's null before being packed to dynamic atlas.
     * @zh 精灵自动合图之前的原始 texture 和宽高信息。在参与自动合图之前此值为 null。
     */
    get original (): {
        _texture: TextureBase;
        _x: number;
        _y: number;
    } | null {
        return this._original;
    }

    /**
     * @en Number of pixels corresponding to unit size in world space (pixels per unit).
     * @zh 世界空间中的单位大小对应的像素数量（像素每单位）。
     */
    get pixelsToUnit (): number {
        return this._pixelsToUnit;
    }

    /**
     * @en Local origin position when generating the mesh.
     * @zh 生成 mesh 时本地坐标原点位置。
     */
    get pivot (): Vec2 {
        return this._pivot;
    }

    /**
     * @en mesh information, you should call the [[ensureMeshData]] function before using it.
     * @zh mesh 信息，你应该在使用它之前调用 [[ensureMeshData]] 函数来确保其可用。
     */
    get mesh (): Mesh | null {
        return this._mesh;
    }

    /**
     * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    get trimmedBorder (): Vec4 {
        return this._trimmedBorder;
    }

    /**
     * @en Vertex list for the mesh type sprite frame.
     * @zh 网格类型精灵帧的所有顶点列表。
     */
    public vertices: IVertices | null = null;

    /**
     * @en UV for quad vertices.
     * @zh 矩形的顶点 UV。
     */
    public uv: number[] = [];

    /**
     * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    public unbiasUV: number[] = [];

    /**
     * @en UV for sliced 9 vertices.
     * @zh 九宫格的顶点 UV。
     */
    public uvSliced: IUV[] = [];

    // the location of the sprite on rendering texture
    protected _rect = rect();

    protected _trimmedBorder = v4();

    // for trimming
    protected _offset = v2();

    // for trimming
    protected _originalSize = size();

    protected _rotated = false;

    protected _capInsets = [0, 0, 0, 0];

    protected _atlasUuid = '';
    // TODO: not initialized in constructor
    protected _texture!: TextureBase;

    protected _isFlipUVY = false;

    protected _isFlipUVX = false;

    // store original info before packed to dynamic atlas
    protected _original: {
        _texture: TextureBase,
        _x: number,
        _y: number,
    } | null = null;

    protected _packable = true;

    protected _pixelsToUnit = 100;

    protected _pivot = v2(0.5, 0.5); // center

    // Todo: Some features need add
    protected _meshType = MeshType.RECT;
    protected _extrude = 0; // when polygon type use
    protected _customOutLine = [];// MayBe later
    // Here you can generate polygons by polygon-separator, expecting the generated polygons to be pixel-standard vertex arrays,
    // and save this array in the file
    // that is, the mesh information of the original image
    // (two-dimensional mesh information, which needs to be serialized and is the basis for the polygon mesh generation)
    // In addition to the vertex array, a mesh should be generated based on the conditions
    // i.e., the mesh information generated by combining the above five conditions, which needs to be serialized
    // and at runtime, the actual mesh used is the generated mesh (static mesh)
    // (updated after attribute value changes in the editor, adjusting vertices/re-generation)

    // Mesh api
    protected _mesh: Mesh | null = null;
    protected _minPos = v3();
    protected _maxPos = v3();

    constructor (name?: string) {
        super(name);

        if (EDITOR) {
            // Atlas asset uuid
            this._atlasUuid = '';
        }
    }

    /**
     * @en
     * Returns whether the texture have been loaded.
     * @zh
     * 返回是否已加载精灵帧。
     *
     * @deprecated since v3.3, Useless Code.
     */
    public textureLoaded (): boolean {
        return !!this.texture;
    }

    /**
     * @en
     * Returns whether the sprite frame is rotated in the texture.
     * @zh
     * 获取 SpriteFrame 是否旋转。
     * @deprecated since v1.2, please use [[rotated]] instead.
     */
    public isRotated (): boolean {
        return this._rotated;
    }

    /**
     * @en
     * Set whether the sprite frame is rotated in the texture.
     * @zh
     * 设置 SpriteFrame 是否旋转。
     * @param rotated @en rotated.  @zh 是否旋转。
     * @deprecated since v1.2, please use [[rotated]] instead.
     */
    public setRotated (rotated: boolean): void {
        this.rotated = rotated;
    }

    /**
     * @en Returns the rect of the sprite frame in the texture.
     * If it's an atlas texture, a transparent pixel area is proposed for the actual mapping of the current texture.
     * @zh 获取 SpriteFrame 的纹理矩形区域。
     * 如果是一个 atlas 的贴图，则为当前贴图的实际剔除透明像素区域。
     * @param out @en The output rect. @zh 输出的矩形区域。
     * @returns @en The rect. @zh 矩形区域。
     * @deprecated since v1.2, please use [[rect]].
     */
    public getRect (out?: Rect): Rect {
        if (out) {
            out.set(this._rect);
            return out;
        }

        return this._rect.clone();
    }

    /**
     * @en Sets the rect of the sprite frame in the texture.
     * @zh 设置 SpriteFrame 的纹理矩形区域。
     * @param rect @en The new rect. @zh 想要设置的 rect。
     * @deprecated since v1.2, please use [[rect]].
     */
    public setRect (rect: Rect): void {
        this.rect = rect;
    }

    /**
     * @en Returns the original size before trimmed.
     * @zh 获取修剪前的原始大小。
     * @param out @en The output original size. @zh 输出的原始大小。
     * @returns @en The original size. @zh 原始大小。
     * @deprecated since v1.2, please use [[originalSize]].
     */
    public getOriginalSize (out?: Size): Size {
        if (out) {
            out.set(this._originalSize);
            return out;
        }

        return this._originalSize.clone();
    }

    /**
     * @en Sets the original size before trimmed.
     * @zh 设置修剪前的原始大小。
     * @param size @en The new original size. @zh 新设置的原始大小。
     * @deprecated since v1.2, please use [[originalSize]].
     */
    public setOriginalSize (size: Size): void {
        this.originalSize = size;
    }

    /**
     * @en Gets the offset of the frame.
     * @zh 获取偏移量。
     * @param out @en The output offset object. @zh 输出的偏移量。
     * @returns @en The offset object. @zh 偏移量。
     * @deprecated since v1.2, please use [[offset]]
     */
    public getOffset (out?: Vec2): Vec2 {
        if (out) {
            out.set(this._offset);
            return out;
        }

        return this._offset.clone();
    }

    /**
     * @en Sets the offset of the frame.
     * @zh 设置偏移量。
     * @param offset @en The new offset. @zh 新设置的偏移量。
     * @deprecated since v1.2, please use [[offset]]
     */
    public setOffset (offset: Vec2): void {
        this.offset = offset;
    }

    /**
     * @en Gets the related GFX [[gfx.Texture]] resource.
     * @zh 获取渲染贴图的 GFX 资源。
     * @returns @en Gfx Texture resource. @zh GFX 贴图资源。
     */
    public getGFXTexture (): Texture | null {
        return this._texture.getGFXTexture();
    }

    /**
     * @en Gets the GFX sampler of its texture.
     * @zh 贴图资源的采样器。
     * @returns @en The GFX sampler resource. @zh GFX贴图采样器。
     */
    public getGFXSampler (): Sampler {
        return this._texture.getGFXSampler();
    }

    /**
     * @en Gets the hash of its texture.
     * @zh 贴图资源的哈希值。
     * @returns @en Texture`s hash. @zh 贴图哈希值。
     */
    public getHash (): number {
        return this._texture.getHash();
    }

    /**
     * @en Gets the sampler hash of its texture.
     * @zh 贴图资源的采样器哈希值。
     * @returns @en Sampler`s hash. @zh 采样器哈希值。
     */
    public getSamplerInfo (): Readonly<SamplerInfo> {
        return this._texture.getSamplerInfo();
    }

    /**
     * @en Resets the sprite frame data.
     * @zh 重置 SpriteFrame 数据。
     * @param info @en SpriteFrame initialization information. @zh SpriteFrame 初始化信息。
     * @param clearData @en Clear Data before initialization. @zh 是否在初始化前清空原有数据。
     */
    public reset (info?: ISpriteFrameInitInfo, clearData = false): void {
        const self = this;
        let calUV = false;
        if (clearData) {
            self._originalSize.set(0, 0);
            self._rect.set(0, 0, 0, 0);
            self._offset.set(0, 0);
            self._capInsets = [0, 0, 0, 0];
            self._rotated = false;
            calUV = true;
        }

        if (info) {
            if (info.texture) {
                self._rect.set(0, 0, info.texture.width, info.texture.height);
                self._refreshTexture(info.texture);
                self.checkRect(self._texture);
            }

            if (info.originalSize) {
                self._originalSize.set(info.originalSize);
            }

            if (info.rect) {
                self._rect.set(info.rect);
            }

            if (info.offset) {
                self._offset.set(info.offset);
            }

            const thisCapInsets = self._capInsets;
            if (info.borderTop !== undefined) {
                thisCapInsets[INSET_TOP] = info.borderTop;
            }

            if (info.borderBottom !== undefined) {
                thisCapInsets[INSET_BOTTOM] = info.borderBottom;
            }

            if (info.borderLeft !== undefined) {
                thisCapInsets[INSET_LEFT] = info.borderLeft;
            }

            if (info.borderRight !== undefined) {
                thisCapInsets[INSET_RIGHT] = info.borderRight;
            }

            if (info.isRotate !== undefined) {
                self._rotated = !!info.isRotate;
            }

            if (info.isFlipUv !== undefined) {
                self._isFlipUVY = !!info.isFlipUv;
            }

            calUV = true;
        }

        if (calUV && self.texture) {
            self._calculateUV();
        }
        self._calcTrimmedBorder();
    }

    /**
     * @en Check whether the rect of the sprite frame is out of the texture boundary.
     * @zh 判断精灵计算的矩形区域是否越界。
     * @param texture @en Texture resources for sprite frame. @zh SpriteFrame 的贴图资源。
     * @returns @en Out of the texture boundary or not. @zh 矩形区域是否越界。
     */
    public checkRect (texture: TextureBase): boolean {
        const rect = this._rect;
        let maxX = rect.x;
        let maxY = rect.y;
        if (this._rotated) {
            maxX += rect.height;
            maxY += rect.width;
        } else {
            maxX += rect.width;
            maxY += rect.height;
        }

        if (maxX > texture.width) {
            errorID(3300, `${this.name}/${texture.name}`, maxX, texture.width);
            return false;
        }

        if (maxY > texture.height) {
            errorID(3301, `${this.name}/${texture.name}`, maxY, texture.height);
            return false;
        }

        return true;
    }

    private _calcTrimmedBorder (): void {
        const self = this;
        const ow = self._originalSize.width;
        const oh = self._originalSize.height;
        const rw = self._rect.width;
        const rh = self._rect.height;
        const halfTrimmedWidth = (ow - rw) * 0.5;
        const halfTrimmedHeight = (oh - rh) * 0.5;
        const thisOffset = self._offset;
        const thisTrimmedBorder = self._trimmedBorder;
        // left
        thisTrimmedBorder.x = thisOffset.x + halfTrimmedWidth;
        // right
        thisTrimmedBorder.y = thisOffset.x - halfTrimmedWidth;
        // bottom
        thisTrimmedBorder.z = thisOffset.y + halfTrimmedHeight;
        // top
        thisTrimmedBorder.w = thisOffset.y - halfTrimmedHeight;
    }

    /**
     * @en Make sure the mesh is available, you should call it before using the mesh.
     * @zh 确保 mesh 可用，你应该在使用 mesh 之前调用它。
     */
    public ensureMeshData (): void {
        if (this._mesh) return;
        // If SpriteFrame from load, we need init vertices when use mesh
        this._initVertices();
        this._createMesh();
    }

    public destroy (): boolean {
        if (this._packable && dynamicAtlasManager) {
            dynamicAtlasManager.deleteAtlasSpriteFrame(this);
        }
        return super.destroy();
    }

    /**
     * Calculate UV for sliced
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     * @engineInternal
     * @mangle
     */
    public _calculateSlicedUV (): void {
        const self = this;
        const rect = self._rect;
        // const texture = self._getCalculateTarget()!;
        const tex = self.texture;
        const capInsets = self._capInsets;
        const atlasWidth = tex.width;
        const atlasHeight = tex.height;
        const leftWidth = capInsets[INSET_LEFT];
        const rightWidth = capInsets[INSET_RIGHT];
        const centerWidth = rect.width - leftWidth - rightWidth;
        const topHeight = capInsets[INSET_TOP];
        const bottomHeight = capInsets[INSET_BOTTOM];
        const centerHeight = rect.height - topHeight - bottomHeight;

        const uvSliced = self.uvSliced;
        uvSliced.length = 0;
        if (self._rotated) {
            temp_uvs[0].u = rect.x / atlasWidth;
            temp_uvs[1].u = (rect.x + bottomHeight) / atlasWidth;
            temp_uvs[2].u = (rect.x + bottomHeight + centerHeight) / atlasWidth;
            temp_uvs[3].u = (rect.x + rect.height) / atlasWidth;
            temp_uvs[3].v = rect.y / atlasHeight;
            temp_uvs[2].v = (rect.y + leftWidth) / atlasHeight;
            temp_uvs[1].v = (rect.y + leftWidth + centerWidth) / atlasHeight;
            temp_uvs[0].v = (rect.y + rect.width) / atlasHeight;

            for (let row = 0; row < 4; ++row) {
                const rowD = temp_uvs[row];
                for (let col = 0; col < 4; ++col) {
                    const colD = temp_uvs[3 - col];
                    uvSliced.push({
                        u: rowD.u,
                        v: colD.v,
                    });
                }
            }
        } else {
            temp_uvs[0].u = rect.x / atlasWidth;
            temp_uvs[1].u = (rect.x + leftWidth) / atlasWidth;
            temp_uvs[2].u = (rect.x + leftWidth + centerWidth) / atlasWidth;
            temp_uvs[3].u = (rect.x + rect.width) / atlasWidth;
            temp_uvs[3].v = rect.y / atlasHeight;
            temp_uvs[2].v = (rect.y + topHeight) / atlasHeight;
            temp_uvs[1].v = (rect.y + topHeight + centerHeight) / atlasHeight;
            temp_uvs[0].v = (rect.y + rect.height) / atlasHeight;

            for (let row = 0; row < 4; ++row) {
                const rowD = temp_uvs[row];
                for (let col = 0; col < 4; ++col) {
                    const colD = temp_uvs[col];
                    uvSliced.push({
                        u: colD.u,
                        v: rowD.v,
                    });
                }
            }
        }

        // UV update event for components to update uv buffer
        // CalculateUV will trigger _calculateSlicedUV so it's enough to emit here
        this.emit(SpriteFrameEvent.UV_UPDATED, this);
    }

    /**
     * Calculate UV
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     * @engineInternal
     * @mangle
     */
    public _calculateUV (): void {
        const arrayFill = js.array.fillItems;
        const self = this;
        const rect = self._rect;
        const uv = self.uv;
        const unbiasUV = self.unbiasUV;
        const tex = self.texture;
        const texw = tex.width;
        const texh = tex.height;

        if (self._rotated) {
            const l = texw === 0 ? 0 : rect.x / texw;
            const r = texw === 0 ? 1 : (rect.x + rect.height) / texw;
            const t = texh === 0 ? 0 : rect.y / texh;
            const b = texh === 0 ? 1 : (rect.y + rect.width) / texh;

            if (self._isFlipUVX && self._isFlipUVY) {
                /*
                3 - 1
                |   |
                2 - 0
                */
                arrayFill(uv, r, b, r, t, l, b, l, t);
            } else if (self._isFlipUVX) {
                /*
                2 - 0
                |   |
                3 - 1
                */
                arrayFill(uv, r, t, r, b, l, t, l, b);
            } else if (self._isFlipUVY) {
                /*
                1 - 3
                |   |
                0 - 2
                */
                arrayFill(uv, l, b, l, t, r, b, r, t);
            } else {
                /*
                0 - 2
                |   |
                1 - 3
                */
                arrayFill(uv, l, t, l, b, r, t, r, b);
            }

            const ul = texw === 0 ? 0 : rect.x / texw;
            const ur = texw === 0 ? 1 : (rect.x + rect.height) / texw;
            const ut = texh === 0 ? 0 : rect.y / texh;
            const ub = texh === 0 ? 1 : (rect.y + rect.width) / texh;
            if (self._isFlipUVX && self._isFlipUVY) {
                arrayFill(unbiasUV, ur, ub, ur, ut, ul, ub, ul, ut);
            } else if (self._isFlipUVX) {
                arrayFill(unbiasUV, ur, ut, ur, ub, ul, ut, ul, ub);
            } else if (self._isFlipUVY) {
                arrayFill(unbiasUV, ul, ub, ul, ut, ur, ub, ur, ut);
            } else {
                arrayFill(unbiasUV, ul, ut, ul, ub, ur, ut, ur, ub);
            }
        } else {
            const l = texw === 0 ? 0 : rect.x / texw;
            const r = texw === 0 ? 1 : (rect.x + rect.width) / texw;
            const b = texh === 0 ? 1 : (rect.y + rect.height) / texh;
            const t = texh === 0 ? 0 : rect.y / texh;
            if (self._isFlipUVX && self._isFlipUVY) {
                /*
                1 - 0
                |   |
                3 - 2
                */
                arrayFill(uv, r, t, l, t, r, b, l, b);
            } else if (self._isFlipUVX) {
                /*
                3 - 2
                |   |
                1 - 0
                */
                arrayFill(uv, r, b, l, b, r, t, l, t);
            } else if (self._isFlipUVY) {
                /*
                0 - 1
                |   |
                2 - 3
                */
                arrayFill(uv, l, t, r, t, l, b, r, b);
            } else {
                /*
                2 - 3
                |   |
                0 - 1
                */
                arrayFill(uv, l, b, r, b, l, t, r, t);
            }
            const ul = texw === 0 ? 0 : rect.x / texw;
            const ur = texw === 0 ? 1 : (rect.x + rect.width) / texw;
            const ub = texh === 0 ? 1 : (rect.y + rect.height) / texh;
            const ut = texh === 0 ? 0 : rect.y / texh;
            if (self._isFlipUVX && self._isFlipUVY) {
                arrayFill(unbiasUV, ur, ut, ul, ut, ur, ub, ul, ub);
            } else if (self._isFlipUVX) {
                arrayFill(unbiasUV, ur, ub, ul, ub, ur, ut, ul, ut);
            } else if (self._isFlipUVY) {
                arrayFill(unbiasUV, ul, ut, ur, ut, ul, ub, ur, ub);
            } else {
                arrayFill(unbiasUV, ul, ub, ur, ub, ul, ut, ur, ut);
            }
        }

        self._calculateSlicedUV();
    }

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     * @engineInternal
     * @mangle
     */
    public _setDynamicAtlasFrame (frame): void {
        if (!frame) return;

        this._original = {
            _texture: this._texture,
            _x: this._rect.x,
            _y: this._rect.y,
        };

        this._texture = frame.texture;
        this._rect.x = frame.x;
        this._rect.y = frame.y;
        this._calculateUV();
    }

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     * @engineInternal
     * @mangle
     */
    public _resetDynamicAtlasFrame (): void {
        if (!this._original) return;
        this._rect.x = this._original._x;
        this._rect.y = this._original._y;
        this._texture = this._original._texture;
        this._original = null;
        this._calculateUV();
    }

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     * @engineInternal
     * @mangle
     */
    public _checkPackable (): void {
        const dynamicAtlas = dynamicAtlasManager;
        if (!dynamicAtlas) return;
        const texture = this._texture;

        if (!(texture instanceof Texture2D) || texture.isCompressed) {
            this._packable = false;
            return;
        }

        const w = this.width;
        const h = this.height;
        if (!texture.image
            || w > dynamicAtlas.maxFrameSize || h > dynamicAtlas.maxFrameSize) {
            this._packable = false;
            return;
        }
        const CanvasElement = ccwindow.HTMLCanvasElement;

        if (texture.image && texture.image instanceof CanvasElement) {
            this._packable = true;
        }
    }

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _serialize (ctxForExporting: any): any {
        if (EDITOR || TEST) {
            const rect = { x: this._rect.x, y: this._rect.y, width: this._rect.width, height: this._rect.height };
            const offset = { x: this._offset.x, y: this._offset.y };
            const originalSize = this._originalSize;
            let texture;
            if (this._texture) {
                texture = this._texture._uuid;
                if (ctxForExporting) {
                    ctxForExporting.dependsOn('_textureSource', texture);
                }
            }

            let vertices;
            if (this.vertices) {
                const posArray = [];
                for (let i = 0; i < this.vertices.rawPosition.length; i++) {
                    const pos = this.vertices.rawPosition[i];
                    vec3ToArray(posArray, pos, 3 * i);
                }
                vertices = {
                    rawPosition: posArray,
                    indexes: this.vertices.indexes,
                    uv: this.vertices.uv,
                    nuv: this.vertices.nuv,
                    minPos: { x: this.vertices.minPos.x, y: this.vertices.minPos.y, z: this.vertices.minPos.z },
                    maxPos: { x: this.vertices.maxPos.x, y: this.vertices.maxPos.y, z: this.vertices.maxPos.z },
                };
            }

            const serialize = {
                name: this._name,
                atlas: ctxForExporting ? undefined : this._atlasUuid,  // strip from json if exporting
                rect,
                offset,
                originalSize,
                rotated: this._rotated,
                capInsets: this._capInsets,
                vertices,
                texture: (!ctxForExporting && texture) || undefined,
                packable: this._packable,
                pixelsToUnit: this._pixelsToUnit,
                pivot: this._pivot,
                meshType: this._meshType,
            };

            // 为 underfined 的数据则不在序列化文件里显示
            return serialize;
        }
        return null;
    }

    /**
     * @deprecated since v3.5.0, this is an engine private interface that will be removed in the future.
     */
    public _deserialize (serializeData: any, handle: any): void {
        const self = this;
        const data = serializeData as ISpriteFramesSerializeData;
        const rect = data.rect;
        if (rect) {
            self._rect = new Rect(rect.x, rect.y, rect.width, rect.height);
        }

        const offset = data.offset;
        if (data.offset) {
            self._offset = v2(offset.x, offset.y);
        }

        const originalSize = data.originalSize;
        if (data.originalSize) {
            self._originalSize = size(originalSize.width, originalSize.height);
        }
        self._rotated = !!data.rotated;
        self._name = data.name;
        self._packable = !!data.packable;

        self._pixelsToUnit = data.pixelsToUnit;
        const pivot = data.pivot;
        if (pivot) {
            self._pivot = v2(pivot.x, pivot.y);
        }
        self._meshType = data.meshType;

        const capInsets = data.capInsets;
        if (capInsets) {
            const thisCapInsets = self._capInsets;
            thisCapInsets[INSET_LEFT] = capInsets[INSET_LEFT];
            thisCapInsets[INSET_TOP] = capInsets[INSET_TOP];
            thisCapInsets[INSET_RIGHT] = capInsets[INSET_RIGHT];
            thisCapInsets[INSET_BOTTOM] = capInsets[INSET_BOTTOM];
        }

        if (!BUILD) {
            // manually load texture via _textureSetter
            if (data.texture) {
                handle.result.push(self, '_textureSource', data.texture, js.getClassId(Texture2D));
            }
        }

        if (EDITOR) {
            self._atlasUuid = data.atlas ? data.atlas : '';
        }

        const vertices = data.vertices;
        if (vertices) {
            if (!self.vertices) {
                self.vertices = {
                    rawPosition: [],
                    positions: [],
                    indexes: vertices.indexes,
                    uv: vertices.uv,
                    nuv: vertices.nuv,
                    minPos: v3(vertices.minPos.x, vertices.minPos.y, vertices.minPos.z),
                    maxPos: v3(vertices.maxPos.x, vertices.maxPos.y, vertices.maxPos.z),
                };
            }
            self.vertices.rawPosition.length = 0;
            const rawPosition = vertices.rawPosition;
            for (let i = 0; i < rawPosition.length; i += 3) {
                self.vertices.rawPosition.push(v3(rawPosition[i], rawPosition[i + 1], rawPosition[i + 2]));
            }
            self._updateMeshVertices();
        }
    }

    /**
     * @en clone a sprite frame.
     * @zh 克隆当前 sprite frame。
     */
    public clone (): SpriteFrame {
        const self = this;
        const sp = new SpriteFrame();
        const v = self.vertices;
        sp.vertices = v ? {
            rawPosition: v.rawPosition.slice(0),
            positions: v.positions.slice(0),
            indexes: v.indexes.slice(0),
            uv: v.uv.slice(0),
            nuv: v.nuv.slice(0),
            minPos: v.minPos.clone(),
            maxPos: v.maxPos.clone(),
        } : null as any;
        sp.uv.splice(0, sp.uv.length, ...self.uv);
        sp.unbiasUV.splice(0, sp.unbiasUV.length, ...self.unbiasUV);
        sp.uvSliced.splice(0, sp.uvSliced.length, ...self.uvSliced);
        sp._rect.set(self._rect);
        sp._trimmedBorder.set(self._trimmedBorder);
        sp._offset.set(self._offset);
        sp._originalSize.set(self._originalSize);
        sp._rotated = self._rotated;
        sp._capInsets.splice(0, sp._capInsets.length, ...self._capInsets);
        sp._atlasUuid = self._atlasUuid;
        sp._texture = self._texture;
        sp._isFlipUVX = self._isFlipUVX;
        sp._isFlipUVY = self._isFlipUVY;
        if (self._original) {
            sp._original = {
                _texture: self._original._texture,
                _x: self._original._x,
                _y: self._original._y,
            };
        } else {
            sp._original = null;
        }
        sp._packable = self._packable;
        sp._pixelsToUnit = self._pixelsToUnit;
        sp._pivot.set(self._pivot);
        sp._meshType = self._meshType;
        sp._extrude = self._extrude;
        sp._customOutLine.splice(0, sp._customOutLine.length, ...self._customOutLine);
        sp._minPos = self._minPos;
        sp._maxPos = self._maxPos;
        if (self._mesh) {
            // Creates a new mesh, and 'this' creates the mesh in the same way. So we can make a copy like this.
            // It must be placed last because the mesh will depend on some of its members when it is created.
            sp._createMesh();
        }
        return sp;
    }

    protected _refreshTexture (texture: TextureBase): void {
        const self = this;
        self._texture = texture;
        const tex = self._texture;
        const config: ISpriteFrameInitInfo = {};
        let isReset = false;
        if (self._rect.width === 0 || self._rect.height === 0 || !self.checkRect(tex)) {
            config.rect = rect(0, 0, tex.width, tex.height);
            isReset = true;
        }

        // If original size is not set or rect check failed, we should reset the original size
        if (self._originalSize.width === 0
            || self._originalSize.height === 0
            || isReset
        ) {
            config.originalSize = size(tex.width, tex.height);
            isReset = true;
        }

        if (isReset) {
            self.reset(config);
        }

        self._checkPackable();
        if (self._mesh) {
            self._updateMesh();
        }
    }

    /**
     * @en complete loading callback.
     * @zh 加载完成回调。
     * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    public onLoaded (): void {
        this._calcTrimmedBorder();
    }

    /**
     * @en default init.
     * @zh 默认初始化。
     * @param uuid @en Asset uuid. @zh 资源 uuid。
     * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    public initDefault (uuid?: string): void {
        super.initDefault(uuid);
        const texture = new Texture2D();
        texture.initDefault();
        this._refreshTexture(texture);
        this._calculateUV();
    }

    /**
     * @en Check whether the sprite frame is validate.
     * @zh 检查当前 sprite frame 对象是否是有效的。
     * @returns @en validate or not. @zh 是否有效。
     * @deprecated since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    public validate (): boolean {
        return this._texture && this._rect && this._rect.width !== 0 && this._rect.height !== 0;
    }

    protected _initVertices (): void {
        const self = this;
        if (!self.vertices) {
            self.vertices = {
                rawPosition: [],
                positions: [],
                indexes: [],
                uv: [],
                nuv: [],
                minPos: v3(),
                maxPos: v3(),
            };
        } else {
            const vertices = self.vertices;
            vertices.rawPosition.length = 0;
            vertices.positions.length = 0;
            vertices.indexes.length = 0;
            vertices.uv.length = 0;
            vertices.nuv.length = 0;
            vertices.minPos.set(0, 0, 0);
            vertices.maxPos.set(0, 0, 0);
        }

        const thisVertices = self.vertices;

        if (self._meshType === MeshType.POLYGON) {
            // Use Bayazit to generate vertices and assign values
        } else { // Rect mode
            // default center is 0.5，0.5
            const tex = self.texture;
            const texw = tex.width;
            const texh = tex.height;
            const rect = self.rect;
            const width = rect.width;
            const height = rect.height;
            const rectX = rect.x;
            const rectY = texh - rect.y - height;
            const halfWidth = width / 2;
            const halfHeight = height / 2;

            const l = texw === 0 ? 0 : rectX / texw;
            const r = texw === 0 ? 1 : (rectX + width) / texw;
            const t = texh === 0 ? 1 : (rectY + height) / texh;
            const b = texh === 0 ? 0 : rectY / texh;

            const uv = thisVertices.uv;
            const nuv = thisVertices.nuv;
            const rawPosition = thisVertices.rawPosition;
            const indexes = thisVertices.indexes;

            // left bottom
            temp_vec3.set(-halfWidth, -halfHeight, 0);
            rawPosition.push(temp_vec3.clone());
            uv.push(rectX, rectY + height);
            nuv.push(l, b);
            thisVertices.minPos.set(temp_vec3);
            // right bottom
            temp_vec3.set(halfWidth, -halfHeight, 0);
            rawPosition.push(temp_vec3.clone());
            uv.push(rectX + width, rectY + height);
            nuv.push(r, b);
            // left top
            temp_vec3.set(-halfWidth, halfHeight, 0);
            rawPosition.push(temp_vec3.clone());
            uv.push(rectX, rectY);
            nuv.push(l, t);
            // right top
            temp_vec3.set(halfWidth, halfHeight, 0);
            rawPosition.push(temp_vec3.clone());
            uv.push(rectX + width, rectY);
            nuv.push(r, t);
            thisVertices.maxPos.set(temp_vec3);

            indexes.push(0, 1, 2, 2, 1, 3);
        }
        this._updateMeshVertices();
    }

    // Combine vertex information, unit information, anchor points, extrude and even customOutline to generate the actual vertices used
    protected _updateMeshVertices (): void {
        // Start generating the Geometry information to generate the mesh
        temp_matrix.identity();
        const units = 1 / this._pixelsToUnit;
        const PosX = -(this._pivot.x - 0.5) * this.rect.width * units;
        const PosY = -(this._pivot.y - 0.5) * this.rect.height * units;
        const temp_vec3 = v3(PosX, PosY, 0);
        temp_matrix.transform(temp_vec3);
        temp_vec3.set(units, units, 1);
        temp_matrix.scale(temp_vec3);
        const vertices = this.vertices!;

        for (let i = 0; i < vertices.rawPosition.length; i++) {
            const pos = vertices.rawPosition[i];
            vec3TransformMat4(temp_vec3, pos, temp_matrix);
            vec3ToArray(vertices.positions, temp_vec3, 3 * i);
        }
        vec3TransformMat4(this._minPos, vertices.minPos, temp_matrix);
        vec3TransformMat4(this._maxPos, vertices.maxPos, temp_matrix);
    }

    protected _createMesh (): void {
        this._mesh = createMesh({
            primitiveMode: PrimitiveMode.TRIANGLE_LIST,
            positions: this.vertices!.positions,
            uvs: this.vertices!.nuv,
            indices: this.vertices!.indexes,
            minPos: this._minPos,
            maxPos: this._maxPos,

            // colors: [
            //     Color.WHITE.r, Color.WHITE.g, Color.WHITE.b, Color.WHITE.a,
            //     Color.WHITE.r, Color.WHITE.g, Color.WHITE.b, Color.WHITE.a,
            //     Color.WHITE.r, Color.WHITE.g, Color.WHITE.b, Color.WHITE.a,
            //     Color.WHITE.r, Color.WHITE.g, Color.WHITE.b, Color.WHITE.a],
            attributes: [
                new Attribute(AttributeName.ATTR_POSITION, Format.RGB32F),
                new Attribute(AttributeName.ATTR_TEX_COORD, Format.RG32F),
                // new Attribute(AttributeName.ATTR_COLOR, Format.RGBA8UI, true),
            ],
        });
    }

    protected _updateMesh (): void {
        if (this._mesh) {
            this._mesh.destroy();
        }
        this._initVertices();
        this._createMesh();
    }
}

cclegacy.SpriteFrame = SpriteFrame;
