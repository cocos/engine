# Cocos Creator Engine Errors

### 0100

%s not yet implemented.

### 0200

You should specify a valid DOM canvas element.

### 1000

<!-- DEPRECATED -->
cc.ActionManager.addAction(): action must be non-null

### 1001

<!-- DEPRECATED -->
cocos2d: removeAction: Target not found

### 1002

<!-- DEPRECATED -->
cc.ActionManager.removeActionByTag(): an invalid tag

### 1003

<!-- DEPRECATED -->
cc.ActionManager.removeActionByTag(): target must be non-null

### 1004

<!-- DEPRECATED -->
cc.ActionManager.getActionByTag(): an invalid tag

### 1005

<!-- DEPRECATED -->
cocos2d : getActionByTag(tag = %s): Action not found

### 1006

[Action step]. override me

### 1007

[Action update]. override me

### 1008

[Action reverse]. override me

### 1009

<!-- DEPRECATED -->
cc.EaseElastic.reverse(): it should be overridden in subclass.

### 1010

<!-- DEPRECATED -->
cc.IntervalAction: reverse not implemented.

### 1011

<!-- DEPRECATED -->
cc.ActionInterval.setAmplitudeRate(): it should be overridden in subclass.

### 1012

<!-- DEPRECATED -->
cc.ActionInterval.getAmplitudeRate(): it should be overridden in subclass.

### 1013

<!-- DEPRECATED -->
The speed parameter error

### 1014

<!-- DEPRECATED -->
The repeat parameter error

### 1015

<!-- DEPRECATED -->
parameters should not be ending with null in Javascript

### 1016

<!-- DEPRECATED -->
cc.RotateTo.reverse(): it should be overridden in subclass.

### 1017

<!-- DEPRECATED -->
cc.GridAction.getGrid(): it should be overridden in subclass.

### 1018

<!-- DEPRECATED -->
Grid size must be (1,1)

### 1019

<!-- DEPRECATED -->
Failed to construct, Sequence construction needs two or more actions.

### 1020

<!-- DEPRECATED -->
Failed to construct, Spawn construction needs two or more actions.

### 1021

<!-- DEPRECATED -->
cc.Speed.initWithAction(): action must be non nil

### 1022

<!-- DEPRECATED -->
cc.Follow.initWithAction(): followedNode must be non nil

### 1023

<!-- DEPRECATED -->
cc.ActionEase.initWithAction(): action must be non nil

### 1024

<!-- DEPRECATED -->
Invalid configuration. It must at least have one control point

### 1025

<!-- DEPRECATED -->
cc.Sequence.initWithTwoActions(): arguments must all be non nil

### 1026

<!-- DEPRECATED -->
cc.RepeatForever.initWithAction(): action must be non null

### 1027

<!-- DEPRECATED -->
cc.Spawn.initWithTwoActions(): arguments must all be non null

### 1028

<!-- DEPRECATED -->
cc.ReverseTime.initWithAction(): action must be non null

### 1029

<!-- DEPRECATED -->
cc.ReverseTime.initWithAction(): the action was already passed in.

### 1030

<!-- DEPRECATED -->
cc.Animate.initWithAnimation(): animation must be non-NULL

### 1100

Expected 'data' dict, but not found. Config file: %s

### 1101

Please load the resource first : %s

### 1102

Effect settings not found, effects will not be imported.

### 1103

Success to load scene: %s

### 1200

cocos2d: Director: Error in gettimeofday

### 1201

<!-- DEPRECATED -->
cocos2d: Director: unrecognized projection

### 1202

<!-- DEPRECATED -->
cocos2d: Director: unrecognized projection

### 1203

<!-- DEPRECATED -->
cocos2d: Director: Error in gettimeofday

### 1204

Running scene should not be null

### 1205

The scene should not be null

### 1206

loadScene: The scene index to load (%s) is out of range.

### 1207

loadScene: Unknown name type to load: '%s'

### 1208

loadScene: Failed to load scene '%s' because '%s' is already being loaded.

### 1209

loadScene: Can not load the scene '%s' because it was not in the build settings before playing.

### 1210

Failed to preload '%s', %s

### 1211

loadScene: The scene index to load (%s) is out of range.

### 1212

loadScene: Unknown name type to load: '%s'

### 1213

loadScene: Failed to load scene '%s' because '%s' is already loading

### 1214

loadScene: Can not load the scene '%s' because it was not in the build settings before playing.

### 1215

Failed to preload '%s', %s

### 1216

Director.runSceneImmediate: scene is not valid

### 1217

Director._initOnEngineInitialized: renderer root initialization failed

### 1218

Forward render pipeline initialized.

### 1219

Deferred render pipeline initialized. Note that non-transparent materials with no lighting will not be rendered, such as builtin-unlit.

### 1220

Failed to set shading scale, pipelineSceneData is invalid.

### 1221

Setting orientation is not supported yet.

### 1222

Failed to initialize render pipeline.

### 1223

Custom pipeline and legacy pipeline are all culled. 

### 1300

%s is not in the model pool and cannot be destroyed by destroyModel.

### 1400

'%s' is deprecated, please use '%s' instead.

### 1401

<!-- DEPRECATED -->
The first argument should be the destination object

### 1402

<!-- DEPRECATED -->
The 'visible' property of %s is deprecated, use 'enabled' instead please.

### 1403

<!-- DEPRECATED -->
Sorry, cc.audioEngine.willPlayMusic is removed.

### 1404

cc.spriteFrameCache is removed, please use cc.loader to load and cache sprite frames of atlas format.

### 1405

<!-- DEPRECATED -->
The '%s' will be removed in v2.0, please use '%s' instead.

### 1406

'%s.%s' is removed

### 1407

<!-- DEPRECATED -->
cc.pool is being removed from v2.0, you are getting cc.js.Pool instead

### 1408

'%s' is removed

### 1409

element type is wrong!

### 1500

<!-- DEPRECATED -->
CCSheduler#scheduleCallback. Callback already scheduled. Updating interval from:%s to %s

### 1501

<!-- DEPRECATED -->
cc.scheduler.scheduleCallbackForTarget(): callback_fn should be non-null.

### 1502

cc.scheduler.scheduleCallbackForTarget(): target should be non-null.

### 1503

cc.Scheduler.pauseTarget():target should be non-null

### 1504

cc.Scheduler.resumeTarget():target should be non-null

### 1505

cc.Scheduler.isTargetPaused():target should be non-null

### 1506

warning: you CANNOT change update priority in scheduled function

### 1507

scheduler#scheduleSelector. Selector already scheduled. Updating interval from: %.4f to %.4f

### 1508

Argument callback must not be empty

### 1509

Argument target must be non-nullptr

### 1510

cc.Scheduler: Illegal target which doesn't have id, you should do Scheduler.enableForTarget(target) before all scheduler API usage on target

### 1511

cc.Scheduler: pause state of the scheduled task doesn't match the element pause state in Scheduler, the given paused state will be ignored.

### 1512

<!-- DEPRECATED -->
cc.Scheduler: updateFunc parameter is deprecated in scheduleUpdate function, and will be removed in v2.0

### 1513

cc.Scheduler: scheduler stopped using `__instanceId` as id since v2.0, you should do Scheduler.enableForTarget(target) before all scheduler API usage on target

### 1514

since v3.8.0, `Scheduler.schedule(target, callback, interval)` is deprecated, please use `Scheduler.schedule(callback, target, interval)` instead.

### 1600

<!-- DEPRECATED -->
getZOrder is deprecated. Please use getLocalZOrder instead.

### 1601

<!-- DEPRECATED -->
setZOrder is deprecated. Please use setLocalZOrder instead.

### 1602

<!-- DEPRECATED -->
RotationX != RotationY. Don't know which one to return

### 1603

<!-- DEPRECATED -->
ScaleX != ScaleY. Don't know which one to return

### 1604

<!-- DEPRECATED -->
An Node can't be added as a child of itself.

### 1605

<!-- DEPRECATED -->
child already added. It can't be added again

### 1606

<!-- DEPRECATED -->
child must be non-null

### 1607

removeFromParentAndCleanup is deprecated. Use removeFromParent instead

### 1608

<!-- DEPRECATED -->
boundingBox is deprecated. Use getBoundingBox instead

### 1609

<!-- DEPRECATED -->
argument tag is an invalid tag

### 1610

<!-- DEPRECATED -->
cocos2d: removeChildByTag(tag = %s): child not found!

### 1611

<!-- DEPRECATED -->
removeAllChildrenWithCleanup is deprecated. Use removeAllChildren instead

### 1612

<!-- DEPRECATED -->
cc.Node.stopActionBy(): argument tag an invalid tag

### 1613

<!-- DEPRECATED -->
cc.Node.getActionByTag(): argument tag is an invalid tag

### 1614

<!-- DEPRECATED -->
resumeSchedulerAndActions is deprecated, please use resume instead.

### 1615

<!-- DEPRECATED -->
pauseSchedulerAndActions is deprecated, please use pause instead.

### 1616

<!-- DEPRECATED -->
Unknown callback function

### 1617

<!-- DEPRECATED -->
child must be non-null

### 1618

<!-- DEPRECATED -->
cc.Node.runAction(): action must be non-null

### 1619

callback function must be non-null

### 1620

interval must be positive

### 1621

<!-- DEPRECATED -->
cocos2d: Could not initialize cc.AtlasNode. Invalid Texture.

### 1622

<!-- DEPRECATED -->
_ccsg.Node._requestDirtyFlag: failed to satisfy the request, key (%s) for flag have already been taken

### 1623

Set '%s' to normal node (not persist root node).

### 1624

Replacing with the same sgNode

### 1625

The replacement sgNode should not contain any child.

### 1626

Should not set alpha via 'color', set 'opacity' please.

### 1627

Not support for asynchronous creating node in SG

### 1628

<!-- DEPRECATED -->
Renderer error: Size of the cc._RendererInSG._sgNode must be zero

### 1629

<!-- DEPRECATED -->
The node '%s' has a component inherited from 'cc._RendererInSG'

### 1630

<!-- DEPRECATED -->
JSB environment is not support invoke node.runAction before the 'cc._RendererInSG' component enabled.

### 1631

<!-- DEPRECATED -->
Please use runAction in the method 'start' instead.

### 1632

Node name can not include '/'.

### 1633

Internal error, should not remove unknown node from parent.

### 1634

<!-- DEPRECATED -->
addChild: The child to add must be instance of cc.Node, not %s.

### 1635

reorderChild: this child is not in children list.

### 1636

Node's zIndex value can't be greater than cc.macro.MAX_ZINDEX, setting to the maximum value

### 1637

Node's zIndex value can't be smaller than cc.macro.MIN_ZINDEX, setting to the minimum value

### 1638

Private node's zIndex can't be set, it will keep cc.macro.MIN_ZINDEX as its value

### 1639

<!-- DEPRECATED -->
cc.Action is deprecated, please use cc.Tween instead

### 1640

Node %s(%s) has not attached to a scene.

### 1700

<!-- DEPRECATED -->
cc.AtlasNode.updateAtlasValues(): Shall be overridden in subclasses

### 1701

<!-- DEPRECATED -->

### 1702

<!-- DEPRECATED -->
cocos2d: Could not initialize cc.AtlasNode. Invalid Texture.

### 1703

<!-- DEPRECATED -->
The new text must be String

### 1800

cc._EventListenerKeyboard.checkAvailable(): Invalid EventListenerKeyboard!

### 1801

cc._EventListenerTouchOneByOne.checkAvailable(): Invalid EventListenerTouchOneByOne!

### 1802

cc._EventListenerTouchAllAtOnce.checkAvailable(): Invalid EventListenerTouchAllAtOnce!

### 1803

cc._EventListenerAcceleration.checkAvailable():_onAccelerationEvent must be non-nil

### 1900

Invalid parameter.

### 2000

<!-- DEPRECATED -->
Don't call this method if the event is for touch.

### 2100

<!-- DEPRECATED -->
parameters should not be ending with null in Javascript

### 2101

<!-- DEPRECATED -->
Invalid index in MultiplexLayer switchTo message

### 2102

<!-- DEPRECATED -->
Invalid index in MultiplexLayer switchTo message

### 2103

<!-- DEPRECATED -->
cc.Layer.addLayer(): layer should be non-null

### 2104

Layer collision. The name of layer (%s) is collided with the name or value of some layer

### 2200

Design resolution not valid

### 2201

should set resolutionPolicy

### 2300

The touches is more than MAX_TOUCHES.

### 2301

Cannot create the same touch object.

### 2302

The touches is more than MAX_TOUCHES, release touch id %s.

### 2400

<!-- DEPRECATED -->
WebGL error %s

### 2401

<!-- DEPRECATED -->
Too many graphics vertices generated, only 65536 vertices support.

### 2402

Forward pipeline startup failed!

### 2500

<!-- DEPRECATED -->
cocos2d: cc.SpriteFrameAnimationCache: No animations were found in provided dictionary.

### 2501

<!-- DEPRECATED -->
cc.SpriteFrameAnimationCache. Invalid animation format

### 2502

<!-- DEPRECATED -->
cc.SpriteFrameAnimationCache.addAnimations(): File could not be found

### 2503

<!-- DEPRECATED -->
cocos2d: cc.SpriteFrameAnimationCache: Animation '%s' found in dictionary without any frames - cannot add to animation cache.

### 2504

<!-- DEPRECATED -->
cocos2d: cc.SpriteFrameAnimationCache: Animation '%s' refers to frame '%s' which is not currently in the cc.SpriteFrameCache. This frame will not be added to the animation.

### 2505

<!-- DEPRECATED -->
cocos2d: cc.SpriteFrameAnimationCache: None of the frames for animation '%s' were found in the cc.SpriteFrameCache. Animation is not being added to the Animation Cache.

### 2506

<!-- DEPRECATED -->
cocos2d: cc.SpriteFrameAnimationCache: An animation in your dictionary refers to a frame which is not in the cc.SpriteFrameCache. Some or all of the frames for the animation '%s' may be missing.

### 2507

<!-- DEPRECATED -->
cocos2d: CCAnimationCache: Animation '%s' found in dictionary without any frames - cannot add to animation cache.

### 2508

<!-- DEPRECATED -->
cocos2d: cc.SpriteFrameAnimationCache: Animation '%s' refers to frame '%s' which is not currently in the cc.SpriteFrameCache. This frame will not be added to the animation.

### 2509

<!-- DEPRECATED -->
cc.SpriteFrameAnimationCache.addAnimations(): Invalid texture file name

### 2600

<!-- DEPRECATED -->
cc.Sprite.reorderChild(): this child is not in children list

### 2601

<!-- DEPRECATED -->
cc.Sprite.setIgnoreAnchorPointForPosition(): it is invalid in cc.Sprite when using SpriteBatchNode

### 2602

<!-- DEPRECATED -->
cc.Sprite.setDisplayFrameWithAnimationName(): Frame not found

### 2603

<!-- DEPRECATED -->
cc.Sprite.setDisplayFrameWithAnimationName(): Invalid frame index

### 2604

<!-- DEPRECATED -->
setDisplayFrame is deprecated, please use setSpriteFrame instead.

### 2605

<!-- DEPRECATED -->
cc.Sprite._updateBlendFunc():_updateBlendFunc doesn't work when the sprite is rendered using a cc.CCSpriteBatchNode

### 2606

<!-- DEPRECATED -->
cc.Sprite.initWithSpriteFrame(): spriteFrame should be non-null

### 2607

<!-- DEPRECATED -->
cc.Sprite.initWithSpriteFrameName(): spriteFrameName should be non-null

### 2608

<!-- DEPRECATED -->
%s is null, please check.

### 2609

<!-- DEPRECATED -->
cc.Sprite.initWithFile(): filename should be non-null

### 2610

<!-- DEPRECATED -->
cc.Sprite.setDisplayFrameWithAnimationName(): animationName must be non-null

### 2611

<!-- DEPRECATED -->
cc.Sprite.reorderChild(): child should be non-null

### 2612

<!-- DEPRECATED -->
cc.Sprite.addChild(): cc.Sprite only supports cc.Sprites as children when using cc.SpriteBatchNode

### 2613

<!-- DEPRECATED -->
cc.Sprite.addChild(): cc.Sprite only supports a sprite using same texture as children when using cc.SpriteBatchNode

### 2614

<!-- DEPRECATED -->
cc.Sprite.addChild(): child should be non-null

### 2615

<!-- DEPRECATED -->
cc.Sprite.texture setter: Batched sprites should use the same texture as the batchnode

### 2616

<!-- DEPRECATED -->
cc.SpriteBatchNode.updateQuadFromSprite(): cc.SpriteBatchNode only supports cc.Sprites as children

### 2617

<!-- DEPRECATED -->
cc.SpriteBatchNode.insertQuadFromSprite(): cc.SpriteBatchNode only supports cc.Sprites as children

### 2618

<!-- DEPRECATED -->
cc.SpriteBatchNode.addChild(): cc.SpriteBatchNode only supports cc.Sprites as children

### 2619

<!-- DEPRECATED -->
cc.SpriteBatchNode.addChild(): cc.Sprite is not using the same texture

### 2620

<!-- DEPRECATED -->
Sprite.initWithTexture(): Argument must be non-nil

### 2621

<!-- DEPRECATED -->
Invalid spriteFrameName

### 2622

<!-- DEPRECATED -->
Invalid argument: cc.Sprite.texture setter expects a cc.Texture2D.

### 2623

<!-- DEPRECATED -->
cc.SpriteBatchNode.updateQuadFromSprite(): sprite should be non-null

### 2624

<!-- DEPRECATED -->
cc.SpriteBatchNode.insertQuadFromSprite(): sprite should be non-null

### 2625

<!-- DEPRECATED -->
too many tiles, only 16384 tiles will be show

### 2626

<!-- DEPRECATED -->
Unrecognized fill type in bar fill

### 2627

<!-- DEPRECATED -->
Can not generate quad

### 2628

<!-- DEPRECATED -->
%s does not exist

### 2700

<!-- DEPRECATED -->
cc.SpriteBatchNode.addQuadFromSprite(): SpriteBatchNode only supports cc.Sprites as children

### 2701

<!-- DEPRECATED -->
cocos2d: CCSpriteBatchNode: resizing TextureAtlas capacity from %s to %s.

### 2702

<!-- DEPRECATED -->
cocos2d: WARNING: Not enough memory to resize the atlas

### 2703

<!-- DEPRECATED -->
cc.SpriteBatchNode.addChild(): Child doesn't belong to Sprite

### 2704

<!-- DEPRECATED -->
cc.SpriteBatchNode.addChild(): sprite batch node should contain the child

### 2705

<!-- DEPRECATED -->
cc.SpriteBatchNode.addQuadFromSprite(): child should be non-null

### 2706

<!-- DEPRECATED -->
cc.SpriteBatchNode.addChild(): child should be non-null

### 2707

<!-- DEPRECATED -->
cc.SpriteBatchNode.updateQuadFromSprite(): cc.SpriteBatchNode only supports cc.Sprites as children

### 2708

<!-- DEPRECATED -->
cc.SpriteBatchNode.insertQuadFromSprite(): cc.SpriteBatchNode only supports cc.Sprites as children

### 2709

<!-- DEPRECATED -->
cc.SpriteBatchNode.addChild(): cc.SpriteBatchNode only supports cc.Sprites as children

### 2710

<!-- DEPRECATED -->
Sprite.initWithTexture(): Argument must be non-nil

### 2711

<!-- DEPRECATED -->
cc.Sprite.addChild(): child should be non-null

### 2712

<!-- DEPRECATED -->
Invalid spriteFrameName

### 2713

<!-- DEPRECATED -->
Invalid argument: cc.Sprite texture setter expects a cc.Texture2D.

### 2714

<!-- DEPRECATED -->
cc.SpriteBatchNode.updateQuadFromSprite(): sprite should be non-null

### 2715

<!-- DEPRECATED -->
cc.SpriteBatchNode.insertQuadFromSprite(): sprite should be non-null

### 2716

<!-- DEPRECATED -->
cc.SpriteBatchNode.addChild(): child should be non-null

### 2728

<!-- DEPRECATED -->
%s does not exist

### 2800

<!-- DEPRECATED -->
cocos2d: WARNING: originalWidth/Height not found on the cc.SpriteFrame. AnchorPoint won't work as expected. Regenrate the .plist

### 2801

<!-- DEPRECATED -->
cocos2d: WARNING: an alias with name %s already exists

### 2802

<!-- DEPRECATED -->
cocos2d: WARNING: Sprite frame: %s has already been added by another source, please fix name conflit

### 2803

<!-- DEPRECATED -->
cocos2d: cc.SpriteFrameCahce: Frame %s not found

### 2804

<!-- DEPRECATED -->
Please load the resource first : %s

### 2805

<!-- DEPRECATED -->
cc.SpriteFrameCache.addSpriteFrames(): plist should be non-null

### 2806

<!-- DEPRECATED -->
Argument must be non-nil

### 2900

<!-- DEPRECATED -->
cocos2d: Could not open file: %s

### 2901

<!-- DEPRECATED -->
cc.TextureAtlas.insertQuad(): invalid totalQuads

### 2902

<!-- DEPRECATED -->
cc.TextureAtlas.initWithTexture():texture should be non-null

### 2903

<!-- DEPRECATED -->
cc.TextureAtlas.updateQuad(): quad should be non-null

### 2904

<!-- DEPRECATED -->
cc.TextureAtlas.updateQuad(): Invalid index

### 2905

<!-- DEPRECATED -->
cc.TextureAtlas.insertQuad(): Invalid index

### 2906

<!-- DEPRECATED -->
cc.TextureAtlas.insertQuad(): Invalid index + amount

### 2907

<!-- DEPRECATED -->
cc.TextureAtlas.insertQuadFromIndex(): Invalid newIndex

### 2908

<!-- DEPRECATED -->
cc.TextureAtlas.insertQuadFromIndex(): Invalid fromIndex

### 2909

<!-- DEPRECATED -->
cc.TextureAtlas.removeQuadAtIndex(): Invalid index

### 2910

<!-- DEPRECATED -->
cc.TextureAtlas.removeQuadsAtIndex(): index + amount out of bounds

### 2911

<!-- DEPRECATED -->
cc.TextureAtlas.moveQuadsFromIndex(): move is out of bounds

### 2912

<!-- DEPRECATED -->
cc.TextureAtlas.moveQuadsFromIndex(): Invalid newIndex

### 2913

<!-- DEPRECATED -->
cc.TextureAtlas.moveQuadsFromIndex(): Invalid oldIndex

### 3000

<!-- DEPRECATED -->
TextureCache:addPVRTCImage does not support on HTML5

### 3001

<!-- DEPRECATED -->
TextureCache:addPVRTCImage does not support on HTML5

### 3002

<!-- DEPRECATED -->
textureForKey is deprecated. Please use getTextureForKey instead.

### 3003

<!-- DEPRECATED -->
addPVRImage does not support on HTML5

### 3004

<!-- DEPRECATED -->
cocos2d: Couldn't add UIImage in TextureCache

### 3005

<!-- DEPRECATED -->
cocos2d: '%s' id=%s %s x %s

### 3006

<!-- DEPRECATED -->
cocos2d: '%s' id= HTMLCanvasElement %s x %s

### 3007

<!-- DEPRECATED -->
cocos2d: TextureCache dumpDebugInfo: %s textures, HTMLCanvasElement for %s KB (%s MB)

### 3008

<!-- DEPRECATED -->
cc.Texture.addUIImage(): image should be non-null

### 3009

<!-- DEPRECATED -->
TextureCache: url should be non-null

### 3100

<!-- DEPRECATED -->
initWithETCFile does not support on HTML5

### 3101

<!-- DEPRECATED -->
initWithPVRFile does not support on HTML5

### 3102

<!-- DEPRECATED -->
initWithPVRTCData does not support on HTML5

### 3103

cc.Texture.addImage(): path should be non-null

### 3104

<!-- DEPRECATED -->
cocos2d: cc.Texture2D. Can't create Texture. UIImage is nil

### 3105

<!-- DEPRECATED -->
cocos2d: WARNING: Image (%s x %s) is bigger than the supported %s x %s

### 3106

<!-- DEPRECATED -->
initWithString isn't supported on cocos2d-html5

### 3107

<!-- DEPRECATED -->
initWithETCFile does not support on HTML5

### 3108

<!-- DEPRECATED -->
initWithPVRFile does not support on HTML5

### 3109

<!-- DEPRECATED -->
initWithPVRTCData does not support on HTML5

### 3110

<!-- DEPRECATED -->
bitsPerPixelForFormat: %s, cannot give useful result, it's a illegal pixel format

### 3111

<!-- DEPRECATED -->
cocos2d: cc.Texture2D: Using RGB565 texture since image has no alpha

### 3112

<!-- DEPRECATED -->
cc.Texture.addImage(): path should be non-null

### 3113

<!-- DEPRECATED -->
NSInternalInconsistencyException

### 3114

<!-- DEPRECATED -->
SpriteFrame: Failed to load sprite texture '%s'

### 3115

<!-- DEPRECATED -->
Frame Grabber: could not attach texture to framebuffer

### 3116

<!-- DEPRECATED -->
WebGLRenderingContext.CLAMP_TO_EDGE should be used in NPOT textures

### 3117

<!-- DEPRECATED -->
Mimpap texture only works in POT textures

### 3118

<!-- DEPRECATED -->
contentSize parameter is deprecated and ignored for cc.Texture2D initWithData function.

### 3119

Lazy init texture with image element failed due to image loading failure: %s

### 3120

Loading texture with unsupported type: '%s'. Add '%s' into 'cc.macro.SUPPORT_TEXTURE_FORMATS' please.

### 3121

Can't find a texture format supported by the current platform! Please add a fallback format in the editor.

### 3122

Error Texture in %s.

### 3123

Set same texture %s.

### 3124

Texture: setMipRange failed because base level is larger than max level

### 3200

<!-- DEPRECATED -->
Missing file: %s

### 3300

Rect width exceeds maximum margin: %s

### 3301

Rect height exceeds maximum margin: %s

### 3500

0 priority is forbidden for fixed priority since it's used for scene graph based priority.

### 3501

Invalid listener type!

### 3502

Can't set fixed priority with scene graph based listener.

### 3503

Invalid parameters.

### 3504

listener must be a cc.EventListener object when adding a fixed priority listener

### 3505

The listener has been registered, please don't register it again.

### 3506

Unsupported listener target.

### 3507

Invalid scene graph priority!

### 3508

If program goes here, there should be event in dispatch.

### 3509

_inDispatch should be 1 here.

### 3510

%s's scene graph node not contains in the parent's children

### 3511

event is undefined

### 3512

Event manager only support scene graph priority for ui nodes which contain UIComponent

### 3520

Device Motion Event request permission: %s

### 3521

Device Motion Event request permission failed: %s

### 3600

<!-- DEPRECATED -->
cc.Class will automatically call super constructor of %s, you should not call it manually.

### 3601

The editor property 'playOnFocus' should be used with 'executeInEditMode' in class '%s'

### 3602

Unknown editor property '%s' in class '%s'.

### 3603

Use 'cc.Float' or 'cc.Integer' instead of 'cc.Number' please.

### 3604

Can only indicate one type attribute for %s.

### 3605

The default value of %s is not instance of %s.

### 3606

No needs to indicate the '%s' attribute for %s, which its default value is type of %s.

### 3607

The default value of %s must be an empty string.

### 3608

The type of %s must be CCString, not String.

### 3609

The type of %s must be CCBoolean, not Boolean.

### 3610

The type of %s must be CCFloat or CCInteger, not Number.

### 3611

Can not indicate the '%s' attribute for %s, which its default value is type of %s.

### 3612

%s Just set the default value to 'new %s()' and it will be handled properly.

### 3613

'No need to use 'serializable: false' or 'editorOnly: true' for the getter of '%s.%s', every getter is actually non-serialized.

### 3614

Should not define constructor for cc.Component %s.

### 3615

Each script can have at most one Component.

### 3616

Should not specify class name %s for Component which defines in project.

### 3617

<!-- DEPRECATED -->
Can not instantiate CCClass '%s' with arguments.

### 3618

ctor of '%s' can not be another CCClass

### 3619

<!-- DEPRECATED -->
ctor of '%s' must be function type

### 3620

<!-- DEPRECATED -->
this._super declared in '%s.%s' but no super method defined

### 3621

<!-- DEPRECATED -->
Unknown type of %s.%s, maybe you want is '%s'.

### 3622

<!-- DEPRECATED -->
Unknown type of %s.%s, property should be defined in 'properties' or 'ctor'

### 3623

Can not use 'editor' attribute, '%s' not inherits from Components.

### 3624

<!-- DEPRECATED -->
'%s' overrided '%s' but '%s' is defined as 'false' so the super method will not be called. You can set '%s' to null to disable this warning.

### 3625

[isChildClassOf] superclass should be function type, not

### 3626

Can't remove '%s' because '%s' depends on it.

### 3627

Should not add renderer component (%s) to a Canvas node.

### 3628

Should not add %s to a node which size is already used by its other component.

### 3629

<!-- DEPRECATED -->
attribute must be type object

### 3630

<!-- DEPRECATED -->
RawType is only available for Assets

### 3631

<!-- DEPRECATED -->
RawType name cannot contain uppercase

### 3632

<!-- DEPRECATED -->
Each asset cannot have more than one RawType

### 3633

Properties function of '%s' should return an object!

### 3634

Disallow to use '.' in property name

### 3635

<!-- DEPRECATED -->
Default array must be empty, set default value of %s.%s to [], and initialize in 'onLoad' or 'ctor' please. (just like 'this.%s = [...];')

### 3636

<!-- DEPRECATED -->
Do not set default value to non-empty object, unless the object defines its own 'clone' function. Set default value of %s.%s to null or {}, and initialize in 'onLoad' or 'ctor' please. (just like 'this.%s = {foo: bar};')

### 3637

Can not declare %s.%s, it is already defined in the prototype of %s

### 3638

<!-- DEPRECATED -->
'%s': the getter of '%s' is already defined!

### 3639

Can not apply the specified attribute to the getter of '%s.%s', attribute index: %s

### 3640

'%s': the setter of '%s' is already defined!

### 3641

Can not construct %s because it contains object property.

### 3642

<!-- DEPRECATED -->
Cannot define %s.%s because static member name can not be '%s'.

### 3643

<!-- DEPRECATED -->
Can not define a member called 'constructor' in the class '%s', please use 'ctor' instead.

### 3644

Please define 'type' parameter of %s.%s as the actual constructor.

### 3645

Please define 'type' parameter of %s.%s as the constructor of %s.

### 3646

Unknown 'type' parameter of %s.%s：%s

### 3647

The length of range array must be equal or greater than 2

### 3648

Can not declare %s.%s method, it is already defined in the properties of %s.

### 3649

<!-- DEPRECATED -->
CCClass %s have conflict between its ctor and __ctor__.

### 3650

<!-- DEPRECATED -->
No need to specify "%s" attribute for "%s" property in "%s" class.

### 3651

<!-- DEPRECATED -->
Can not call `_super` or `prototype.ctor` in ES6 Classes "%s", use `super` instead please.

### 3652

Failed to `new %s()` under the hood, %s
It is used for getting default values declared in TypeScript in the first place.
Please ensure the constructor can be called during the script's initialization.

### 3653

Please do not specify "default" attribute in decorator of "%s" property in "%s" class.
Default value must be initialized at their declaration:

```
// Before:
@property({
  type: cc.SpriteFrame
  default: null  // <--
})
myProp;
// After:
@property({
  type: cc.SpriteFrame
})
myProp = null;   // <--
```

### 3654

Please specify a default value for "%s.%s" property at its declaration:

```
// Before:
@property(...)
myProp;
// After:
@property(...)
myProp = 0;
```

### 3655

Can not specify "get" or "set"  attribute in decorator for "%s" property in "%s" class.
Please use:

```
@property(...)
get %s () {
    ...
}
@property
set %s (value) {
    ...
}
```

### 3656

<!-- DEPRECATED -->
The default value of %s.%s must be an empty string.

### 3657

<!-- DEPRECATED -->
The value assigned to %s should be Texture2D object, not url string. Since 1.8,
you can declare a texture object directly in properties by using:

```
{
    default: null,
    type: cc.Texture2D, // use 'type:' instead of 'url:'
}
```

### 3658

<!-- DEPRECATED -->
browser does not support getters

### 3659

Violation error: extending enumerations shall have non-overlaped member names or member values

### 3660

You are explicitly specifying `undefined` type to cc property "%s" of cc class "%s".
Is this intended? If not, this may indicate a circular reference.
For example:

```
// foo.ts
import { _decorator } from 'cc';
import { Bar } from './bar';  // Given that './bar' also reference 'foo.ts'.
                              // When importing './bar', execution of './bar' is hung on to wait execution of 'foo.ts',
                              // the `Bar` imported here is `undefined` until './bar' finish its execution.
                              // It leads to that
@_decorator.ccclass           //  ↓
export class Foo {            //  ↓
    @_decorator.type(Bar)     //  → is equivalent to `@_decorator.type(undefined)`
    public bar: Bar;          // To eliminate this error, either:
                              // - Refactor your module structure(recommended), or
                              // - specify the type as cc class name: `@_decorator.type('Bar'/* or any name you specified for `Bar` */)`
}
```

### 3661

<!-- DEPRECATED -->
Register a cc-class through `cc.Class({ /* ... */ })` is deprecated (when registering cc-class "%s"). Use ES6 class syntax and decorators for that purpose instead.

### 3700

internal error: _prefab is undefined

### 3701

Failed to load prefab asset for node '%s'

### 3702

The json file of asset %s is empty or missing.

### 3800

The target can not be made persist because it's not a cc.Node or it doesn't have _id property.

### 3801

The node can not be made persist because it's not under root node.

### 3802

The node can not be made persist because it's not in current scene.

### 3803

The target can not be made persist because it's not a cc.Node or it doesn't have _id property.

### 3804

getComponent: Type must be non-nil

### 3805

Can't add component '%s' because %s already contains the same component.

### 3806

Can't add component '%s' to %s because it conflicts with the existing '%s' derived component.

### 3807

addComponent: Failed to get class '%s'

### 3808

addComponent: Should not add component ('%s') when the scripts are still loading.

### 3809

addComponent: The component to add must be a constructor

### 3810

addComponent: The component to add must be child class of cc.Component

### 3811

_addComponentAt: The component to add must be a constructor

### 3812

_addComponentAt: Index out of range

### 3813

removeComponent: Component must be non-nil

### 3814

Argument must be non-nil

### 3815

Component not owned by this entity

### 3816

Node '%s' is already activating

### 3817

Sorry, the component of '%s' which with an index of %s is corrupted! It has been removed.

### 3818

Failed to read or parse project.json

### 3819

Warning: target element is not a DIV or CANVAS

### 3820

The renderer doesn't support the renderMode %s

### 3821

Cannot change hierarchy while activating or deactivating the parent.

### 3822

addComponent: Cannot add any component to the scene.

### 3823

The enabled component (id: %s, name: %s) doesn't have a valid node

### 3900

Invalid clip to add

### 3901

Invalid clip to remove

### 3902

clip is defaultClip, set force to true to force remove clip and animation state

### 3903

animation state is playing, set force to true to force stop and remove clip and animation state

### 3904

motion path of target [%s] in prop [%s] frame [%s] is not valid

### 3905

sprite frames must be an Array.

### 3906

Can't find easing type [%s]

### 3907

Animation state is not playing or already removed

### 3908

<!-- DEPRECATED -->
animation not added or already removed

### 3909

<!-- DEPRECATED -->
[animate] keyFrames must be non-nil

### 3910

<!-- DEPRECATED -->
[animate] ratio should >= 0!

### 3911

<!-- DEPRECATED -->
[animate] ratio should in the order of smallest to largest!

### 3912

already-playing

### 3920

Current context does not allow root motion.

### 3921

You provided a ill-formed track path. The last component of track path should be property key, or the setter should not be empty.

### 3923

Root motion is ignored since root bone could not be located in animation.

### 3924

Root motion is ignored since the root bone could not be located in scene.

### 3925

Target of hierarchy path should be of type Node.

### 3926

Node "%s" has no path "%s".

### 3927

Target of component path should be of type Node.

### 3928

Node "%s" has no component "%s".

### 3929

Target object has no property "%s".

### 3930

Can not decide type for untyped track: runtime binding does not provide a getter.

### 3931

Can not decide type for untyped track: got a unsupported value from runtime binding.

### 3932

Common targets should only target Vectors/`Size`/`Color`.

### 3933

Each curve that has common target should be numeric curve and targets string property.

### 3934

Misconfigured legacy curve: the first keyframe value is number but others aren't.

### 3935

We don't currently support conversion of \`CubicSplineQuatValue\`.

### 3936

Instancing/Batching enabled for non-baked skinning model '%s', this may result in unexpected rendering artifacts. Consider turning it off in the material if you do not intend to do this.

### 3937

Previous error occurred when instantiating animation clip %s on node %s.

### 3938

'%s' is not found from '%s'. It's specified as the root node to play animation clip '%s'.

### 3940

Error when animation attempted to bind material uniform target: target %s is not a material.

### 3941

Error when animation attempted to bind material uniform target: material %s has no recorded pass %s.

### 3942

Error when animation attempted to bind material uniform target: material %s at pass %s has no recorded uniform %s.

### 3943

Error when animation attempted to bind material uniform target: material %s at pass %s's uniform %s has no recorded channel %s.

### 4000

<!-- DEPRECATED -->
Sorry, the cc.Font has been modified from Raw Asset to Asset. Please load the font asset before using.

### 4001

<!-- DEPRECATED -->
_ccsg.Label._initBMFontWithString(): Impossible to create font. Please check file

### 4002

<!-- DEPRECATED -->
_ccsg.Label._initBMFontWithString(): re-init is no longer supported

### 4003

Label font size can't be shirnked less than 0!

### 4004

force notify all fonts loaded!

### 4005

<!-- DEPRECATED -->
cc.LabelAtlas.initWithString(): Unsupported version. Upgrade cocos2d version

### 4006

<!-- DEPRECATED -->
cc.LabelAtlas._updateAtlasValues(): Invalid String length

### 4007

<!-- DEPRECATED -->
cc.LabelBMFont.initWithString(): re-init is no longer supported

### 4008

<!-- DEPRECATED -->
cc.LabelBMFont.initWithString(): Impossible to create font. Please check file

### 4009

<!-- DEPRECATED -->
cocos2d: LabelBMFont: character not found %s

### 4010

<!-- DEPRECATED -->
cc.LabelBMFont.setFntFile() : Impossible to create font. Please check file

### 4011

Property spriteFrame of Font '%s' is invalid. Using system font instead.

### 4012

The texture of Font '%s' must be already loaded on JSB. Using system font instead.

### 4013

Sorry, lineHeight of system font not supported on JSB.

### 4100

<!-- DEPRECATED -->
Property padding is deprecated, please use paddingLeft, paddingRight, paddingTop and paddingBottom instead

### 4200

MaskType: IMAGE_STENCIL only support WebGL mode.

### 4201

The alphaThreshold invalid in Canvas Mode.

### 4202

The inverted invalid in Canvas Mode.

### 4300

Can not found the %s page.

### 4301

Can not add a page without UITransform.

### 4302

Can not set the scroll view content when it hasn't UITransform or its parent hasn't UITransform.

### 4303

The %s scrollBar on the '%s' node is not available, please check it.

### 4400

Invalid RichText img tag! The sprite frame name can't be found in the ImageAtlas!

### 4500

Graphics: There is no model in %s.

### 4600

Script attached to '%s' is missing or invalid.

### 4601

Failed to load wasm module, WebAssembly is not supported on this platform, but as a fallback Asm.js module is culled by mistake.

### 4700

The dom control is not created!

### 4800

unknown asset type

### 4901

loadRes: should not specify the extname in %s %s

### 4902

No need to release non-cached asset.

### 4903

<!-- DEPRECATED -->
Can not get class '%s'

### 4904

<!-- DEPRECATED -->
%s does not exist

### 4905

<!-- DEPRECATED -->
%s load error, must be json file

### 4906

<!-- DEPRECATED -->
Can't find the parser : %s

### 4907

<!-- DEPRECATED -->
%s is armature. please use:

### 4908

<!-- DEPRECATED -->
ccs.armatureDataManager.addArmatureFileInfoAsync(%s);

### 4909

<!-- DEPRECATED -->
var armature = new ccs.Armature('name');

### 4910

<!-- DEPRECATED -->
Can't find the parser : %s

### 4911

<!-- DEPRECATED -->
register parser error

### 4912

<!-- DEPRECATED -->
Can't find the parser : %s

### 4913

<!-- DEPRECATED -->
Group versions haven't been loaded, you can also set group data with 'cc.LoaderLayer.groups'

### 4914

Resources url '%s' does not exist.

### 4915

Pack indices and data do not match in size

### 4916

Failed to download package for %s

### 4917

<!-- DEPRECATED -->
cc.LabelBMFont._parseCommonArguments(): page can't be larger than supported

### 4918

<!-- DEPRECATED -->
cc.LabelBMFont._parseCommonArguments(): only supports 1 page

### 4919

<!-- DEPRECATED -->
cc.LabelBMFont._parseImageFileName() : file could not be found

### 4920

<!-- DEPRECATED -->
Sorry, you shouldn't use id as item identity any more, please use url or uuid instead, the current id is being set as url: (%s)

### 4921

Invalid pipe or invalid index provided!

### 4922

The pipe to be inserted is already in the pipeline!

### 4923

Uuid Loader: Parse asset [ %s ] failed : %s

### 4924

JSON Loader: Input item doesn't contain string content

### 4925

Uuid Loader: Deserialize asset [ %s ] failed : %s

### 4926

Audio Downloader: no web audio context.

### 4927

Audio Downloader: audio not supported on this browser!

### 4928

Load %s failed!

### 4929

Load Webp ( %s ) failed

### 4930

Load image ( %s ) failed

### 4931

<!-- DEPRECATED -->
Download Uuid: can not find type of raw asset[ %s ]: %s

### 4932

Since v1.10, for any atlas ("%s") in the "resources" directory, it is not possible to find the contained SpriteFrames via `loadRes`, `getRes` or `releaseRes`. Load the SpriteAtlas first and then use `spriteAtlas.getSpriteFrame(name)` instead please.

### 4933

Download Font [ %s ] failed, using Arial or system default font instead

### 4934

Please assure that the full path of sub asset is correct!

### 4935

Failed to skip prefab asset while deserializing PrefabInfo

### 5000

You are trying to destroy a object twice or more.

### 5001

object not yet destroyed

### 5100

Not a plist file!

### 5200

Warning: localStorage isn't enabled. Please confirm browser cookie or privacy option

### 5201

browser don't support web audio

### 5202

This feature supports WebGL render mode only.

### 5203

Audio buffer cache %s has not been added.

### 5204

Audio buffer %s has been cached.

### 5300

Type of target to deserialize not matched with data: target is %s, data is %s

### 5301

Can not find script '%s'

### 5302

Can not find class '%s'

### 5303

Failed to deserialize %s, missing _deserialize function.

### 5304

Unable to deserialize version %s data.

### 5400

<!-- DEPRECATED -->
'%s' is deprecated, use '%s' instead please.

### 5401

<!-- DEPRECATED -->
'%s' is deprecated, use '%s' instead please.

### 5402

cc.js.addon called on non-object:

### 5403

cc.js.mixin: arguments must be type object:

### 5404

The base class to extend from must be non-nil

### 5405

The class to extend must be non-nil

### 5406

Class should be extended before assigning any prototype members.

### 5500

'notify' can not be used in 'get/set' !

### 5501

'notify' must be used with 'default' !

### 5502

<!-- DEPRECATED -->
Invalid url of %s.%s

### 5503

<!-- DEPRECATED -->
The 'url' attribute of '%s.%s' is undefined when loading script.

### 5504

<!-- DEPRECATED -->
The 'url' type of '%s.%s' must be child class of cc.RawAsset.

### 5505

<!-- DEPRECATED -->
The 'url' type of '%s.%s' must not be child class of cc.Asset, otherwise you should use 'type: %s' instead.

### 5506

<!-- DEPRECATED -->
Can not specify 'type' attribute for '%s.%s', because its 'url' is already defined.

### 5507

The 'default' attribute of '%s.%s' must be an array

### 5508

Invalid type of %s.%s

### 5509

<!-- DEPRECATED -->
The 'type' attribute of '%s.%s' must be child class of cc.Asset, otherwise you should use 'url: %s' instead

### 5510

The 'type' attribute of '%s.%s' can not be 'Number', use cc.Float or cc.Integer instead please.

### 5511

The 'type' attribute of '%s.%s' is undefined when loading script

### 5512

Can not serialize '%s.%s' because the specified type is anonymous, please provide a class name or set the 'serializable' attribute of '%s.%s' to 'false'.

### 5513

The 'default' value of '%s.%s' should not be used with a 'get' function.

### 5514

The 'default' value of '%s.%s' should not be used with a 'set' function.

### 5515

The 'default' value of '%s.%s' can not be an constructor. Set default to null please.

### 5516

<!-- DEPRECATED -->
Property '%s.%s' must define at least one of 'default', 'get' or 'set'.

### 5517

'%s.%s' hides inherited property '%s.%s'. To make the current property override that implementation, add the `override: true` attribute please.

### 5600

<!-- DEPRECATED -->
Argument must be non-nil

### 5601

Can not get current scene.

### 5602

Scene is destroyed

### 5603

reference node is destroyed

### 5700

no %s or %s on %s

### 5800

%s.lerp not yet implemented.

### 5801

%s.clone not yet implemented.

### 5802

%s.equals not yet implemented.

### 5900

MotionStreak only support WebGL mode.

### 5901

cc.MotionStreak.getOpacity has not been supported.

### 5902

cc.MotionStreak.setOpacity has not been supported.

### 6000

Custom should not be false if file is not specified.

### 6001

The new %s must not be NaN

### 6002

<!-- DEPRECATED -->
_ccsg.ParticleSystem.addChild() : Can't add a ParticleSystem that uses a different blending function

### 6003

<!-- DEPRECATED -->
cc.ParticleBatchNode.removeChild(): doesn't contain the sprite. Can't remove it

### 6004

<!-- DEPRECATED -->
cc.ParticleBatchNode.reorderChild(): Child doesn't belong to batch

### 6005

<!-- DEPRECATED -->
cc.ParticleBatchNode._increaseAtlasCapacityTo() : WARNING: Not enough memory to resize the atlas

### 6006

<!-- DEPRECATED -->
cocos2d: cc.ParticleBatchNode: resizing TextureAtlas capacity from [%d] to [%d]

### 6007

<!-- DEPRECATED -->
cc.ParticleBatchNode._addChildHelper(): child already added. It can't be added again

### 6008

<!-- DEPRECATED -->
_ccsg.ParticleSystem.initWithFile(): Particles: file not found

### 6009

<!-- DEPRECATED -->
_ccsg.ParticleSystem.initWithDictionary(): Invalid emitterType in config file

### 6010

<!-- DEPRECATED -->
_ccsg.ParticleSystem: error decoding or ungzipping textureImageData

### 6011

<!-- DEPRECATED -->
_ccsg.ParticleSystem: unknown image format with Data

### 6012

<!-- DEPRECATED -->
_ccsg.ParticleSystem.initWithDictionary() : error loading the texture

### 6013

<!-- DEPRECATED -->
Particle system: not enough memory

### 6014

<!-- DEPRECATED -->
Can't change blending functions when the particle is being batched

### 6015

<!-- DEPRECATED -->
_ccsg.ParticleSystem.setDisplayFrame(): QuadParticle only supports SpriteFrames with no offsets

### 6016

<!-- DEPRECATED -->
_ccsg.ParticleSystem._allocMemory(): Memory should not be allocated when not using batchNode

### 6017

Incomplete or corrupt PNG file

### 6018

Invalid filter algorithm: %s

### 6019

Invalid byte order value.

### 6020

You forgot your towel!

### 6021

Unknown Field Tag: %s

### 6022

Too many bits requested

### 6023

No bits requested

### 6024

Cannot recover from missing StripByteCounts

### 6025

Cannot handle sub-byte bits per sample

### 6026

Cannot handle sub-byte bits per pixel

### 6027

Palette image missing color map

### 6028

Unknown Photometric Interpretation: %s

### 6029

Unkown error

### 6030

cc.ParticleSystem: error decoding or ungzipping textureImageData

### 6031

cc.ParticleSystem: unknown image format with Data

### 6032

cc.ParticleSystem.initWithDictionary() : error loading the texture

### 6033

cc.ParticleSystem: not allowing create to be invoked twice with different particle system

### 6034

cc.ParticleSystem: shouldn't be initialized repetitively, otherwise there will be potential leak

### 6035

cc.ParticleSystem: change material failed, please use proper particle material

### 6036

cc.ParticleSystem: life time should bigger than 1 or buffer will be insufficient

### 6100

<!-- DEPRECATED -->
Not supported file types, Please try use the ccs.load

### 6200

<!-- DEPRECATED -->
Canvas doesn't support mesh slot!

### 6300

<!-- DEPRECATED -->
only cc.DrawNode is accepted as stencil

### 6301

<!-- DEPRECATED -->
Stencil buffer is not enabled.

### 6302

<!-- DEPRECATED -->
Nesting more than %d stencils is not supported. Everything will be drawn without stencil for this node and its children.

### 6400

asset.url is not usable in core process

### 6401

<!-- DEPRECATED -->
asset.urls is not usable in core process

### 6402

AssetLibrary has already been initialized!

### 6500

Widget target must be one of the parent nodes of it

### 6501

<!-- DEPRECATED -->
%s's widget target must have UITransform, Please add it in target

### 6600

collider not added or already removed

### 6601

Can't find testFunc for (%s, $s).

### 6700

Can't init canvas '%s' because it conflicts with the existing '%s', the scene should only have one active canvas at the same time.

### 6701

<!-- DEPRECATED -->
Should not add Canvas to a node which already contains a renderer component (%s).

### 6702

<!-- DEPRECATED -->
Should not add Canvas to a node which size is already used by its other component.

### 6703

<!-- DEPRECATED -->
Can't initialise DrawingPrimitiveWebGL. context need is WebGLRenderingContext.

### 6704

<!-- DEPRECATED -->
Polygon's point must greater than 2

### 6705

Argument must be non-nil

### 6706

Priority can't be set in RenderRoot2D node

### 6800

Callback of event must be non-nil

### 6801

The message must be provided

### 6900

The thing you want to instantiate must be an object

### 6901

The thing you want to instantiate is nil

### 6902

The thing you want to instantiate is destroyed

### 6903

The instantiate method for given asset do not implemented

### 6904

Can not instantiate array

### 6905

Can not instantiate DOM element

### 7000

<!-- DEPRECATED -->
Failed to init asset's raw path.

### 7001

<!-- DEPRECATED -->
Should not load '%s' from script dynamically, unless it is placed in the 'resources' folder.

### 7002

<!-- DEPRECATED -->
Sorry can not load '%s' because it is not placed in the 'resources' folder.

### 7003

<!-- DEPRECATED -->
Failed to init builtin asset's raw path.

### 7100

%s already defined in Enum.

### 7101

Sorry, 'cc.Enum' not available on this platform, please report this error here: <https://github.com/cocos-creator/engine/issues/new>

### 7200

Method 'initWithTMXFile' is no effect now, please set property 'tmxAsset' instead.

### 7201

Method 'initWithXML' is no effect now, please set property 'tmxAsset' instead.

### 7202

Add component TiledLayer into node failed.

### 7203

Property 'mapLoaded' is unused now. Please write the logic to the callback 'start'.

### 7204

<!-- DEPRECATED -->
_ccsg.TMXLayer.getTileAt(): TMXLayer: the tiles map has been released

### 7205

<!-- DEPRECATED -->
_ccsg.TMXLayer.getTileGIDAt(): TMXLayer: the tiles map has been released

### 7206

<!-- DEPRECATED -->
_ccsg.TMXLayer.setTileGID(): TMXLayer: the tiles map has been released

### 7207

<!-- DEPRECATED -->
_ccsg.TMXLayer.setTileGID(): invalid gid: %s

### 7208

<!-- DEPRECATED -->
_ccsg.TMXLayer.getTileFlagsAt(): TMXLayer: the tiles map has been released

### 7209

<!-- DEPRECATED -->
_ccsg.TMXLayer.removeTileAt(): TMXLayer: the tiles map has been released

### 7210

TMX Hexa zOrder not supported

### 7211

TMX invalid value

### 7212

<!-- DEPRECATED -->
_ccsg.TMXTiledMap.initWithTMXFile(): Map not found. Please check the filename.

### 7213

<!-- DEPRECATED -->
_ccsg.TMXTiledMap.initWithXML(): Map not found. Please check the filename.

### 7214

<!-- DEPRECATED -->
propertiesForGID is deprecated. Please use getPropertiesForGID instead.

### 7215

cocos2d: Warning: TMX Layer %s has no tiles

### 7216

cocos2d: TMXFormat: Unsupported TMX version: %s

### 7217

cocos2d: TMXFomat: Unsupported orientation: %s

### 7218

cc.TMXMapInfo.parseXMLFile(): unsupported compression method

### 7219

cc.TMXMapInfo.parseXMLFile(): Only base64 and/or gzip/zlib maps are supported

### 7220

<!-- DEPRECATED -->
TMX Parser: please load the xml resource first: %s

### 7221

cc.TMXMapInfo.parseXMLFile(): Texture '%s' not found.

### 7222

Parse %s failed.

### 7223

<!-- DEPRECATED -->
_ccsg.TMXLayer.setTileGID(): pos should be non-null

### 7224

<!-- DEPRECATED -->
_ccsg.TMXTiledMap.getLayer(): layerName should be non-null or non-empty string.

### 7225

<!-- DEPRECATED -->
_ccsg.TMXTiledMap.getObjectGroup(): groupName should be non-null or non-empty string.

### 7226

<!-- DEPRECATED -->
_ccsg.TMXLayer.getTileAt(): pos should be non-null

### 7227

<!-- DEPRECATED -->
_ccsg.TMXLayer.getTileAt(): invalid position

### 7228

<!-- DEPRECATED -->
_ccsg.TMXLayer.getTileGIDAt(): pos should be non-null

### 7229

<!-- DEPRECATED -->
_ccsg.TMXLayer.getTileGIDAt(): invalid position

### 7230

<!-- DEPRECATED -->
_ccsg.TMXLayer.setTileGID(): pos should be non-null

### 7231

<!-- DEPRECATED -->
_ccsg.TMXLayer.setTileGID(): invalid position

### 7232

<!-- DEPRECATED -->
_ccsg.TMXLayer.getTileFlagsAt(): pos should be non-null

### 7233

<!-- DEPRECATED -->
_ccsg.TMXLayer.getTileFlagsAt(): invalid position

### 7234

<!-- DEPRECATED -->
_ccsg.TMXLayer.removeTileAt(): pos should be non-null

### 7235

<!-- DEPRECATED -->
_ccsg.TMXLayer.removeTileAt(): invalid position

### 7236

cc.TMXLayer.getTileAt(): TMXLayer: the tiles map has been released

### 7237

cc.TMXLayer.getTileGIDAt(): TMXLayer: the tiles map has been released

### 7238

cc.TMXLayer.setTileGID(): TMXLayer: the tiles map has been released

### 7239

cc.TMXLayer.setTileGID(): invalid gid: %s

### 7240

cc.TMXLayer.getTileFlagsAt(): TMXLayer: the tiles map has been released

### 7241

cc.TiledMap.initWithXML(): Map not found. Please check the filename.

### 7242

TiledLayer.addUserNode node has been added.

### 7243

TiledLayer.removeUserNode node is not exist

### 7300

<!-- DEPRECATED -->
The new selected must be number

### 7301

<!-- DEPRECATED -->
The new bake must be boolean

### 7400

<!-- DEPRECATED -->
Failed to set _defaultArmatureIndex for '%s' because its dragonAsset is invalid.

### 7401

Failed to set _defaultArmatureIndex for '%s' because the index is out of range.

### 7402

Failed to set _animationIndex for '%s' because the index is out of range.

### 7500

<!-- DEPRECATED -->
Failed to set _defaultSkinIndex for '%s' because its skeletonData is invalid.

### 7501

Failed to set _defaultSkinIndex for '%s' because the index is out of range.

### 7502

Failed to set _animationIndex for '%s' because its skeletonData is invalid.

### 7503

Failed to set _animationIndex for '%s' because the index is out of range.

### 7504

Can not render dynamic created SkeletonData

### 7505

<!-- DEPRECATED -->
Invalid type of atlasFile, atlas should be registered as raw asset.

### 7506

Failed to load spine atlas '$s'

### 7507

Please re-import '%s' because its textures is not initialized! (This workflow will be improved in the future.)

### 7508

The atlas asset of '%s' is not exists!

### 7509

Spine: Animation not found: %s

### 7510

Spine: Animation not found: %s

### 7511

Spine: Invalid input!

### 7600

The context of RenderTexture is invalid.

### 7601

cc.RenderTexture._initWithWidthAndHeightForWebGL() : only RGB and RGBA formats are valid for a render texture;

### 7602

Could not attach texture to the framebuffer

### 7603

clearDepth isn't supported on Cocos2d-Html5

### 7604

saveToFile isn't supported on Cocos2d-Html5

### 7605

newCCImage isn't supported on Cocos2d-Html5

### 7606

GFXTexture is null

### 7607

readPixels buffer size smaller than %d

### 7700

On the web is always keep the aspect ratio

### 7701

Can't know status

### 7702

Video player's duration is not ready to get now!

### 7703

Video Downloader: video not supported on this browser!

### 7800

Web does not support loading

### 7801

Web does not support query history

### 7802

Web does not support query history

### 7803

The current browser does not support the GoBack

### 7804

The current browser does not support the GoForward

### 7805

Web does not support zoom

### 7900

cc.math.Matrix3.assign(): current matrix equals matIn

### 7901

cc.math.mat4Assign(): pOut equals pIn

### 7902

cc.mat.Matrix4.assignFrom(): mat4 equals current matrix

### 7903

cc.math.Matrix4 equal: pMat1 and pMat2 are same object.

### 7904

cc.math.Matrix4.extractPlane: Invalid plane index

### 7905

cc.math.mat4Assign(): pOut equals pIn

### 7906

cc.mat.Matrix4.assignFrom(): mat4 equals current matrix

### 7907

cc.math.Matrix4 equals: pMat1 and pMat2 are same object.

### 7908

Invalid matrix mode specified

### 7909

current quaternion is an invalid value

### 8000

Can't handle this field type or size

### 8001

No bytes requested

### 8002

Too many bytes requested

### 8003

Missing StripByteCounts!

### 8100

cocos2d: ERROR: Failed to compile shader:
 %s

### 8101

cocos2d: ERROR: Failed to compile vertex shader

### 8102

cocos2d: ERROR: Failed to compile fragment shader

### 8103

cc.GLProgram.link(): Cannot link invalid program

### 8104

cocos2d: ERROR: Failed to link program: %s

### 8105

cocos2d: cc.shaderCache._loadDefaultShader, error shader type

### 8106

Please load the resource firset : %s

### 8107

cc.GLProgram.getUniformLocationForName(): uniform name should be non-null

### 8108

cc.GLProgram.getUniformLocationForName(): Invalid operation. Cannot get uniform location when program is not initialized

### 8109

modelView matrix is undefined.

### 8200

Please set node's active instead of rigidbody's enabled.

### 8300

Should only one camera exists, please check your project.

### 8301

Camera does not support Canvas Mode.

### 8302

Camera.viewport is deprecated, please use setViewportInOrientedSpace instead.

### 8400

Wrong type arguments, 'filePath' must be a String.

### 8401

<!-- DEPRECATED -->
Since 1.10, `%s` accept %s instance directly, not a URL string. Please directly reference the %s object in your script, or load %s by loader first. Don't use %s's URL anymore.

### 9000

Stencil manager does not support level bigger than %d in this device.

### 9001

Stencil manager is already empty, cannot pop any mask

### 9002

Failed to request any buffer from a mesh buffer without accessor

### 9003

The internal state of LinearBufferAccessor have severe issue and irreversible, please check the reason

### 9004

Failed to allocate chunk in StaticVBAccessor, the requested buffer might be too large: %d bytes

### 9005

BATCHER2D_MEM_INCREMENT is too large, the Max value for BATCHER2D_MEM_INCREMENT is 2303KB (smaller than 65536 *9* 4 / 1024 = 2304KB)

### 9006

QuadRenderData is removed, please use MeshRenderData instead.

### 9007

Since v3.6, Because mask changes the inheritance relationship, you can directly manipulate the rendering components under the same node to complete the operation.

### 9008

request fullscreen is not supported on this platform.

### 9009

exit fullscreen is not supported on this platform.

### 9100

texture size exceeds current device limits %d/%d

### 9101

The length of the TypedArrayBuffer must be an integer.

### 9200

<!-- DEPRECATED -->
cc.view.enableAntiAlias is deprecated, please use cc.Texture2D.setFilters instead

### 9201

Cannot access game frame or container.

### 9202

Setting window size is not supported.

### 9300

The current buffer beyond the limit in ui static component, please reduce the amount

### 9301

The UI has not been initialized

### 9302

Can't getGFXSampler with out device

### 9600

[Physics]: please check to see if physics modules are included

### 9610

[Physics]: cannon.js physics system doesn't support capsule collider

### 9611

[Physics]: builtin physics system doesn't support mesh collider

### 9612

[Physics]: builtin physics system doesn't support cylinder collider

### 9613

[Physics]: cannon.js physics system doesn't support hinge drive and angular limit

### 9620

[Physics][Ammo]: changing the mesh is not supported after the initialization is completed

### 9630

[Physics]: A dynamic rigid body can not have the following collider shapes: Terrain, Plane and Non-convex Mesh. Node name: %s

### 9640

[Physics][builtin]: sweep functions are not supported in builtin

### 9641

[Physics][cannon.js]: sweep functions are not supported in cannon.js

### 9642

[Physics] PhysicsSystem initDefaultMaterial() Failed to load builtinMaterial.

### 9643

[Physics] Failed to load user customized default physics material: %s, will fallback to built-in default physics material

### 9644

[Physics] Failed to find ear. There might be self-intersection in the polygon.

### 10001

The sub-mesh contains %d vertices, which beyonds the capability (%d vertices most) of renderer of your platform.

### 10002

Sub-mesh may include at most %d morph targets, but you specified %d.

### 11000

WebGL context lost.

### 12001

BlendFactors are disabled when using custom material, please modify the blend state in the material instead.

### 12002

Can't add renderable component to this node because it already have one.

### 12003

<!-- DEPRECATED -->
The PrivateNode is deprecated, please use Node directly with CCObject.Flags.DontSave | CCObject.Flags.HideInHierarchy flags activated.

### 12004

SubModel can only support %d passes.

### 12005

Material already initialized, request aborted.

### 12006

Pass already destroyed.

### 12007

This is old usage, please swap the parameters.

### 12008

GeometryRenderer: too many lines.

### 12009

GeometryRenderer: too many triangles.

### 12010

PassUtils: illegal uniform handle, accessing uniform at offset %d

### 12011

Pass: setUniform is invoked with incompatible uniform data type for binding %d, expected type is %s

### 12012

Can't set a material instance to a sharedMaterial slot

### 12100

The font size is too big to be fitted into texture atlas. Please switch to other label cache modes or choose a smaller font size.

### 12101

The asset %s has been destroyed!

### 12102

Base pass cannot override states, please use pass instance instead.

### 12103

Custom pipeline create shader %s failed. Please reimport all effects (Menu->Developer->Refresh All Effect) and restart creator.

### 12104

Create shader %s failed.

### 12105

Pass resources incomplete.

### 12106

Cannot patch non-builtin macros.

### 12107

Custom pipeline invalid render pass, program: %s. Please reimport all effects (Menu->Developer->Refresh All Effect) and restart creator.

### 12108

Custom pipeline invalid render phase, program: %s. Please reimport all effects (Menu->Developer->Refresh All Effect) and restart creator.

### 12109

custom-pipeline module not available.

### 12110

MaterialPass passID in legacy pipeline is wrongly initialized.

### 13100

Incorrect CCON magic.

### 13101

Unknown CCON version number: %d.

### 13102

CCON Format error.

### 13103

Can not encode CCON binary: lack of text encoder.

### 13104

Can not decode CCON binary: lack of text decoder.

### 14000

State machine matched too many transitions(greater than %s) during this frame: %s.

### 14100

Pool.destroy no longer take a function as parameter, Please specify destruct function in the construction of Pool instead

### 14200

Can not update a static mesh.

### 14201

The primitiveIndex is out of range.

### 14202

meshopt asm decoder initialized

### 14203

meshopt wasm decoder initialized

### 14204

meshopt decoder error: %d

### 14300

Can not keep world transform due to the zero scaling of parent node

### 14400

Spline error: less than 2 knots.

### 14401

Spline error: less than 4 knots or not a multiple of 4.

<!-- Rendering algorithm reserved: 15000 - 16000 -->

### 15000

Can not find corresponding diffuse map for environment lighting, use hemisphere diffuse instead, change environment lighting type to regenerate diffuse map

### 15001

Can not find environment map, disable IBL lighting

### 15002

Diffuse map resource is missing, please change environment lighting type to regenerate resource

### 15003

The shadow visible distance is so small that CSM stratification is not effective, Please change the value of shadowDistance so that it is 10 times greater than 0.1

### 15004

The native folder may be generated from older versions, please refer https://docs.cocos.com/creator/manual/en/release-notes/ to upgrade.

### 15100

Camera '%s' clear flag is skybox, but skybox is disabled,  may cause strange background effect, please set camera clear flag to solid color.

### 16000

'%s' is deprecated since v%s.

### 16001

'%s' is deprecated since v%s, please use '%s' instead.

### 16002

'%s' is removed since v%s.

### 16003

'%s' is removed since v%s, please use '%s' instead.

### 16101

The effect('%s') you are looking for does not exist, please confirm the effect name in the editor. NOTE: Since 3.6, the name of the built-in effect has been changed to its name in the editor, please check it out. More information please refer to https://docs.cocos.com/creator/manual/en/shader/effect-inspector.html

### 16201

The asset replacing failed, can not found override asset('%s') for '%s' 

### 16301

node '%s' doesn't have any ModelRenderer component, this component will not work. please add ModelRenderer component first

### 16302

There is no reflection probe in the scene or no probe is near the current object. No reflection probe will take effect on this object. Please create a new reflection probe or move existing ones closer.

### 16303

Skin material needs floating-point render target, please check ENABLE_FLOAT_OUTPUT define in Project Settings--Macro

### 16304

Skin material may need more accurate calculations, please select a head model of standard size, check the isGlobalStandardSkinObject option in the MeshRender component.

### 16305

failed to stop accelerometer

### 16306

The data must have positions field

### 16307

please change type to sprite_stencil first

### 16308

illegal index count!

### 16309

Unsupported Format, convert to WebGL internal format failed.

### 16310

Unsupported Format, convert to WebGL format failed.

### 16311

Unsupported GLType, convert to GL type failed.

### 16312

Unsupported GLType, convert to TypedArrayConstructor failed.

### 16313

Unsupported GLType, convert to Type failed.

### 16314

Unsupported GLType, get type failed.

### 16315

Unsupported BufferType, create buffer failed.

### 16316

Unsupported BufferType, update buffer failed.

### 16317

Unsupported TextureType, create texture failed.

### 16318

glCheckFramebufferStatus() - FRAMEBUFFER_INCOMPLETE_ATTACHMENT

### 16319

glCheckFramebufferStatus() - FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT

### 16320

glCheckFramebufferStatus() - FRAMEBUFFER_INCOMPLETE_DIMENSIONS

### 16321

glCheckFramebufferStatus() - FRAMEBUFFER_UNSUPPORTED

### 16322

Unsupported ShaderType.

### 16323

 %s in '%s' compilation failed.

### 16324

Shader source dump: %s

### 16325

Shader '%s' compilation succeeded.

### 16326

Failed to link shader: %s

### 16327

Unsupported GL texture type, copy buffer to texture failed.

### 16328

Command 'draw' must be recorded inside a render pass.

### 16329

Command 'updateBuffer' must be recorded outside a render pass.

### 16330

Command 'copyBufferToTexture' must be recorded outside a render pass.

### 16331

InputAssemblerInfo.vertexBuffers is null.

### 16332

Illegal index buffer stride.

### 16333

This device does not support WebGL.

### 16334

A Class already exists with the same %s : %s. %s

### 16335

"%s" has already been set as name or alias of another class.

### 16336

"%s" has already been set as id or alias of another class.

### 16337

can not support canvas rendering in 3D

### 16338

The '_$erialized' prop in MissingScript is missing. Please contact jare.

### 16339

Error props: ['%s']

### 16340

Error when checking MissingScript 5, %s

### 16341

The '_$erialized' prop of MissingScript is missing. Will force the raw data to be save.

### 16342

Error props: ['%s']. Please contact jare.

### 16343

Unable to stash previously serialized data. %s

### 16344

Error when checking MissingScript 6, %s

### 16345

uniform '%s' must have a count

### 16346

Invalid GFX API!

### 16347

The number of mipmaps of each face is different.

### 16348

builtin UBO '%s' not available!

### 16349

builtin samplerTexture '%s' not available!

### 16350

The asset %s is missing!

### 16351

the native asset of %s is missing!

### 16352

The asset %s is invalid for some reason, detail message: %s, stack: %s

### 16353

Can't find letter in this bitmap-font

### 16354

Can't find letter definition in texture atlas %s for letter:%s

### 16355

Can't find letter definition in font family %s for letter: %s

### 16356

wrong format of version when compare version

### 16357

should use Vec3.multiply for vector * vector operation

### 16358

should use Vec3.scale for vector * scalar operation

### 16359

should use Vec2.multiply for vector * vector operation

### 16360

should use Vec2.scale for vector * scalar operation

### 16361

should use Vec4.multiply for vector * vector operation

### 16362

should use Vec4.scale for vector * scalar operation

### 16363

Unable to get device

### 16364

bitNum can't be undefined

### 16365

maximum layers reached.

### 16366

do not change buildin layers.

### 16367

name can't be undefined

### 16368

Unable to access unknown layer.

### 16369

unknown define type '%s'

### 16370

Shaders in material asset '%s' cannot be modified at runtime, please instantiate the material first.

### 16371

Pipeline states in material asset '%s' cannot be modified at runtime, please instantiate the material first.

### 16372

illegal pass index: %s.

### 16373

illegal property name: %s.

### 16374

Unexpected attribute!

### 16375

Unexpected: failed to create morph texture?

### 16376

The fnt config is not exists!

### 16377

SpriteAtlas is null.

### 16378

node '%s' doesn't have any renderable component

### 16379

cannot resize buffer views!

### 16380

cannot update through buffer views!

### 16381

Profiler._stats is deprecated, please use Profiler.stats instead.

### 16382

reverse: could not reverse a non-relative action

### 16383

Need 'clone' for custom prop '%s'

### 16384

Need 'add' for custom prop '%s'

### 16385

Need 'sub' for custom prop '%s' in reverse mode

### 16386

TweenAction: '%s' can't be converted to number

### 16387

Wrong return type for 'progress', number or string needed

### 16388

reverse: current tween could not be reversed, empty actions

### 16389

pause: tween wasn't started, can't pause

### 16390

resume: tween wasn't started, can't resume

### 16391

reverse: could not find action id %s

### 16392

Please set target to tween first

### 16393

start: no actions in Tween

### 16394

repeatForever: the last action is not ActionInterval

### 16395

reverseTime: the last action is not ActionInterval

### 16396

tweenUtil' is deprecated, please use 'tween' instead

### 16397

ProgressBar FILLED mode only works when barSprite's Type is FILLED!

### 16398

ProgressBar non-FILLED mode only works when barSprite's Type is non-FILLED!

### 16399

CopyTextureToBuffers: not supported texture target.

### 16400

Limit values to be greater than 0

### 16401

beginRenderPass: Only primary command buffer is supported.

### 16402

execute is not supported.

### 16403

GPU memory alias is not supported

### 16404

Block '%s' does not bound

### 16405

This device does not support WebGL2

### 16406

Can't find the spriteFrame of tilesets %s

### 16407

Spline error: invalid mode

### 16408

[Physics2D] b2PolygonShape failed to decompose polygon into convex polygons, node name: %s
