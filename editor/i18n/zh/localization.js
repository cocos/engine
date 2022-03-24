const pkg = require('../../../package.json');
const version = pkg.version.replace(/(^\d+\.\d+)\..*$/, (str, a) => {
    return a;
});

const url = 'https://docs.cocos.com/creator';

module.exports = {
    menu: {
        custom_script: '自定义脚本',
    },
    help: {
        cc: {
            Node: `${url}/${version}/manual/zh/concepts/scene/node-component.html`,
            MeshRenderer: `${url}/${version}/manual/zh/engine/renderable/model-component.html`,
            UITransform: `${url}/${version}/manual/zh/ui-system/components/editor/ui-transform.html`,
            Sprite: `${url}/${version}/manual/zh/ui-system/components/editor/sprite.html`,
            SubContextView: `${url}/${version}/manual/zh/editor/publish/build-open-data-context.html`,
            BlockInputEvents: `${url}/${version}/manual/zh/ui-system/components/editor/block-input-events.html`,
            Camera: `${url}/${version}/manual/zh/editor/components/camera-component.html`,
            Canvas: `${url}/${version}/manual/zh/ui-system/components/editor/canvas.html`,
            SkinnedMeshRenderer: `${url}/${version}/manual/zh/engine/animation/skeletal-animation.html`,
            SkinnedMeshBatchRenderer: `${url}/${version}/manual/zh/engine/animation/skeletal-animation.html`,
            Ambient: `${url}/${version}/manual/zh/concepts/scene/light/lighttype/ambient.html`,
            Skybox: `${url}/${version}/manual/zh/concepts/scene/skybox.html`,
            Fog: `${url}/${version}/manual/zh/concepts/scene/fog.html`,
            Shadow: `${url}/${version}/manual/zh/concepts/scene/light/shadow.html`,
            DirectionalLight: `${url}/${version}/manual/zh/concepts/scene/light/dir-light.html`,
            SphereLight: `${url}/${version}/manual/zh/concepts/scene/light/sphere-light.html`,
            SpotLight: `${url}/${version}/manual/zh/concepts/scene/light/spot-light.html`,
            UICoordinateTracker: `${url}/${version}/manual/zh/ui-system/components/editor/ui-coordinate-tracker.html`,
            Animation: `${url}/${version}/manual/zh/engine/animation/animation-component.html`,
            SkeletalAnimation: `${url}/${version}/manual/zh/engine/animation/skeletal-animation.html`,
            AudioSource: `${url}/${version}/manual/zh/audio-system/overview.html`,
            Billboard: `${url}/${version}/manual/zh/particle-system/billboard-component.html`,
            Line: `${url}/${version}/manual/zh/particle-system/line-component.html`,
            ParticleSystem: `${url}/${version}/manual/zh/particle-system/main-module.html`,
            Button: `${url}/${version}/manual/zh/ui-system/components/editor/button.html`,
            Label: `${url}/${version}/manual/zh/ui-system/components/editor/label.html`,
            EditBox: `${url}/${version}/manual/zh/ui-system/components/editor/editbox.html`,
            Layout: `${url}/${version}/manual/zh/ui-system/components/editor/layout.html`,
            Graphics: `${url}/${version}/manual/zh/ui-system/components/editor/graphics.html`,
            Mask: `${url}/${version}/manual/zh/ui-system/components/editor/mask.html`,
            ProgressBar: `${url}/${version}/manual/zh/ui-system/components/editor/progress.html`,
            LabelOutline: `${url}/${version}/manual/zh/ui-system/components/editor/label-outline.html`,
            RichText: `${url}/${version}/manual/zh/ui-system/components/editor/richtext.html`,
            ScrollBar: `${url}/${version}/manual/zh/ui-system/components/editor/scrollbar.html`,
            ScrollView: `${url}/${version}/manual/zh/ui-system/components/editor/scrollview.html`,
            Slider: `${url}/${version}/manual/zh/ui-system/components/editor/slider.html`,
            ToggleContainer: `${url}/${version}/manual/zh/ui-system/components/editor/toggleContainer.html`,
            Toggle: `${url}/${version}/manual/zh/ui-system/components/editor/toggle.html`,
            UIMeshRenderer: `${url}/${version}/manual/zh/ui-system/components/editor/ui-model.html`,
            Widget: `${url}/${version}/manual/zh/ui-system/components/editor/widget.html`,
            PageViewIndicator: `${url}/${version}/manual/zh/ui-system/components/editor/pageviewindicator.html`,
            PageView: `${url}/${version}/manual/zh/ui-system/components/editor/pageview.html`,
            UIStaticBatch: `${url}/${version}/manual/zh/ui-system/components/editor/ui-static.html`,
            UIOpacity: `${url}/${version}/manual/zh/ui-system/components/editor/ui-opacity.html`,
            BoxCollider: `${url}/${version}/manual/zh/physics/physics-collider.html`,
            SphereCollider: `${url}/${version}/manual/zh/physics/physics-component.html`,
            CapsuleCollider: `${url}/${version}/manual/zh/physics/physics-component.html`,
            CylinderCollider: `${url}/${version}/manual/zh/physics/physics-component.html`,
            MeshCollider: `${url}/${version}/manual/zh/physics/physics-component.html`,
            RigidBody: `${url}/${version}/manual/zh/physics/physics-rigidbody.html`,
            ConstantForce: `${url}/${version}/manual/zh/physics/physics-component.html`,
            VideoPlayer: `${url}/${version}/manual/zh/ui-system/components/editor/videoplayer.html`,
            WebView: `${url}/${version}/manual/zh/ui-system/components/editor/webview.html`,
            SafeArea: `${url}/${version}/manual/zh/ui-system/components/editor/safearea.html`,
            Terrain: `${url}/${version}/manual/zh/editor/terrain/`,
            TiledMap: ``,
            Spine: ``,
            OctreeCulling: `${url}/${version}/manual/zh/advanced-topics/native-scene-culling.html`,
        },
        assets: {
            javascript: `${url}/${version}/manual/zh/concepts/scene/node-component.html`,
        },
    },
    ambient: {
        skyLightingColor: '天空颜色（上半球光照）',
        groundLightingColor: '地面颜色（下半球光照）',
        skyIllum: '环境光强度',
    },
    skybox: {
        applyDiffuseMap: '勾选后，场景物体将使用更精确的漫反射图来取代默认的半球光照。',
        enabled: '勾选后即可开启天空盒，使用设置的立方体贴图进行渲染',
        useIBL: '勾选后，场景物体将使用设置的立方体贴图来进行环境光漫反射及镜面反射计算.',
        useHDR: '切换高/低动态范围模式，每种模式都有自己独立的光源设定。\n高动态（HDR）模式会使用光度学灯光单位，配合相机镜头属性进行曝光计算，\n低动态（LDR）模式使用无单位光源和无曝光的镜头，更便于保留原图颜色',
        envmap: '设置一个立方体贴图作为环境光源和天空盒，贴图类型包括十字型 HDR 贴图、经纬度图、手动创建的 CubeMap 等。目前支持 HDR/TGA/PNG 等文件格式。',
    },
    fog: {
        enabled: '雾开关',
        accurate: '切换顶点雾和像素雾。勾选该项则使用像素雾，像素雾在顶点数少面积大的物体上有更精确的雾化效果；顶点雾则有更好的性能。',
        fogColor: '内散射颜色',
        type: '不同的计算雾化模型，目前包括 LINEAR（线性雾）、EXP（指数雾）、EXP_SQUARED（指数平房雾）、LAYERED（层雾）。',
        fogDensity: '该值越大雾气越浓',
        fogStart: '雾效影响的起始位置',
        fogEnd: '雾效影响的结束位置',
        fogAtten: '雾化衰减系数，该值越小则雾越浓',
        fogTop: '模型顶点在世界坐标系垂直方向上的位置，小于该位置时所有的顶点都会受到雾化效果的影响',
        fogRange: '雾化效果从设置的 fogTop 往下所影响的范围',
    },
    shadow: {
        enabled: '是否开启实时阴影',
        planeDirection: '阴影接收平面的法线，垂直于阴影，用于调整阴影的倾斜度',
        planeHeight: '阴影接收平面距离原点的高度',
        saturation: '阴影饱和度，建议设置为 1.0。若需要减小方向光阴影的饱和程度，推荐通过增加环境光来实现，而不是调节该值。',
        pcf: '开启软阴影，目前支持 HARD（硬采样）、SOFT（4 倍采样）、SOFT_2X（9 倍采样）类型',
        bias: '增加深度偏移值（世界空间单位）可以有效消除阴影摩尔纹，但是过大的值可能造成漏光现象',
        normalBias: '法线深度偏移值（世界空间单位），可以消除物体表面朝向平行于阳光方向的阴影摩尔纹，防止曲面出现锯齿状；但是过大的值可能会造成阴影位置偏差',
        shadowMapSize: '阴影贴图分辨率，目前支持 Low_256x256、Medium_512x512、High_1024x1024、Ultra_2048x2048 四种精度的纹理',
        fixedArea: '切换固定区域和 CSM 模式。固定区域是一种旧模式，我们并不推荐使用。勾选该项则开启 CSM 模式，该模式下阴影会跟随方向光节点的位置，在方向光包围盒附近分布，而非跟随相机。',
        near: '固定区域开始值',
        far: '固定区域结束值',
        orthoSize: '固定区域大小，该值越大则阴影精度越低',
        invisibleOcclusionRange: '如果有背后的潜在投射物阴影丢失，请增大该值（世界空间单位）',
        shadowDistance: '阴影有效距离（世界空间单位），该值越大则阴影精度越低',
        maxReceived: '产生阴影的有效光源数量',
    },
    animation: {
        default_clip: '在勾选自动播放或调用 play() 时默认播放的动画 clip。',
        clips: '通过脚本可以访问并播放的 AnimationClip 列表',
        play_on_load: '是否在运行游戏后自动播放默认动画 clip。',
        use_baked_animation: '是否使用预烘焙动画，默认启用，可以大幅提高运行效时率，但所有动画效果会被彻底固定，不支持任何形式的编辑',
        sockets: '当前动画组件维护的挂点数组。要挂载自定义节点到受动画驱动的骨骼上，必须先在此注册挂点',
    },
    audio: {
        clip: '通过该组件播放的默认 AudioClip 引用',
        volume: '音频的音量',
        loop: '是否循环播放音频',
        playOnAwake: '是否在运行游戏后自动播放音源',
    },
    batched_skinning_model: {
        atlas_size: '合图生成的最终图集的边长',
        batchable_texture_names: '材质中真正参与合图的贴图属性，不参与的属性统一使用第一个 unit 的贴图',
        units: '合批前的子蒙皮模型数组，最主要的数据来源',
    },
    camera: {
        priority: '相机的渲染优先级，值越小越优先渲染',
        visibility: '可见性掩码，声明在当前相机中可见的节点层级集合',
        clear_flags: '相机的缓冲清除标志位，指定帧缓冲的哪部分要每帧清除',
        color: '相机的颜色缓冲默认值',
        depth: '相机的深度缓冲默认值',
        stencil: '相机的模板缓冲默认值',
        projection: '相机的投影类型',
        fov_axis: '指定视角的固定轴向，在此轴上不会跟随屏幕长宽比例变化',
        fov: '相机的视角大小',
        ortho_height: '正交模式下的相机视角高度',
        near: '相机的近裁剪距离，应在可接受范围内尽量取最大',
        far: '相机的远裁剪距离，应在可接受范围内尽量取最小',
        aperture: '相机光圈，影响相机的曝光参数',
        shutter: '相机快门，影响相机的曝光参数',
        ISO: '相机感光度，影响相机的曝光参数',
        rect: '此相机最终渲染到屏幕上的视口位置和大小',
        target_texture: '指定此相机的渲染输出目标贴图，默认为空，直接渲染到屏幕',
    },
    lights: {
        color: '光源颜色',
        use_color_temperature: '是否启用光源色温',
        color_temperature: '光源色温',
        illuminance: '光源强度',
        luminous_power: '光通量',
        luminance: '光亮度',
        term: '当前使用的光度学计量单位',
        size: '光源大小',
        range: '光源范围',
    },
    model: {
        shadow_casting_model: '阴影投射方式',
        mesh: '模型的网格数据',
        skinning_root: '骨骼根节点的引用，对应控制此模型的动画组件所在节点',
    },
    sprite: {
        gray_scale: '是否开启灰度渲染模式',
        atlas: '图片资源所属的 Atlas 图集资源',
        sprite_frame: '渲染 Sprite 使用的 SpriteFrame 图片资源',
        type:
            '渲染模式：\n - 普通(Simple)：修改尺寸会整体拉伸图像，适用于序列帧动画和普通图像 \n' +
            '- 九宫格（Sliced）：修改尺寸时四个角的区域不会拉伸，适用于 UI 按钮和面板背景 \n' +
            '- 平铺（Tiled）：修改尺寸时会不断平铺原始大小的图片 \n' +
            '- 填充（Filled）：设置一定的填充起始位置和方向，能够以一定比率剪裁显示图片',
        original_size: '是否使用图片资源的原始尺寸作为 Sprite 节点的 size',
        edit_button: '编辑',
        select_button: '选择',
        select_tooltip: '选择 Atlas 中的其他 SpriteFrame',
        edit_tooltip: '打开 Sprite 编辑器，设置九宫格等数据',
        fill_type: '填充方向，可以选择横向（Horizontal），纵向（Vertical）和扇形（Radial）三种方向',
        fill_center: '扇形填充时，指定扇形的中心点，取值范围 0 ~ 1',
        fill_start: '填充起始位置，输入一个 0 ~ 1 之间的小数表示起始位置的百分比',
        fill_range: '填充总量，取值范围 0 ~ 1 指定显示图像范围的百分比',
        src_blend_factor: '混合显示两张图片时，源图片的取值模式',
        dst_blend_factor: '混合显示两张图片时，目标图片的取值模式',
        size_mode:
            '指定 Sprite 所在节点的尺寸，CUSTOM 表示自定义尺寸，TRIMMED 表示取原始图片剪裁透明像素后的尺寸，RAW 表示取原始图片未剪裁的尺寸',
        trim: '节点约束框内是否包括透明像素区域，勾选此项会去除节点约束框内的透明区域',
    },
    UIOpacity: {
        opacity: '设置物体的不透明度，取值范围为 0 ~ 255',
    },
    billboard: {
        texture: 'billboard 纹理',
        height: 'billboard 高度',
        width: 'billboard 宽度',
        rotation: 'billboard 绕中心点旋转的角度',
    },
    button: {
        click_event: {
            target: '接收点击事件的节点',
            component: '接收点击事件的组件',
            handler: '处理点击事件的方法',
            customEventData: '传给事件处理函数的额外参数，这个数据会当作最后一个参数传递给事件处理函数。',
        },
        interactable: '按钮是否可交互，这一项未选中时，按钮处在禁用状态',
        transition: '按钮状态变化时的过渡类型',
        normal_color: '普通状态的按钮背景颜色',
        pressed_color: '按下状态的按钮背景颜色',
        hover_color: '悬停状态的按钮背景颜色',
        disabled_color: '禁用状态的按钮背景颜色',
        duration: '按钮颜色变化或者缩放变化的过渡时间',
        zoom_scale: '当用户点击按钮后，按钮会缩放到一个值，这个值等于 Button 原始 scale * zoomScale, zoomScale 可以为负数',
        auto_gray_effect:
            '如果这个标记为 true，当 button 的 interactable 属性为 false 的时候，会使用内置 shader 让 button 的 target 节点的 sprite 组件变灰',
        normal_sprite: '普通状态的按钮背景图资源',
        pressed_sprite: '按下状态的按钮背景图资源',
        hover_sprite: '悬停状态的按钮背景图资源',
        disabled_sprite: '禁用状态的按钮背景图资源',
        target: '指定背景节点，状态改变时会修改此节点的 Color 或 Sprite 属性',
        click_events: '按钮点击事件的列表。先将数量改为1或更多，就可以为每个点击事件设置接受者和处理方法',
    },
    canvas: {
        camera: '2D渲染相机',
        align: '自动为 camera 计算参数',
        design_resolution:
            '设计分辨率是游戏在设计时使用的分辨率参考，以像素为单位，通过下面的适配策略，可以在不同分辨率的设备上按照一定的方式对 Canvas 进行整体缩放来适配。',
        fit_height: '自动缩放 Canvas 使设计分辨率的高度充满设备屏幕的高度',
        fit_width: '自动缩放 Canvas 使设计分辨率的宽度充满设备屏幕的宽度',
    },
    forceOvertimeModule: {
        x: 'X 轴方向上的加速度分量',
        y: 'Y 轴方向上的加速度分量',
        z: 'Z 轴方向上的加速度分量',
        space: '加速度计算时采用的坐标系',
    },
    label: {
        string: 'Label 显示的文本内容字符串',
        horizontal_align: '文字水平对齐模式',
        vertical_align: '文字垂直对齐模式',
        font_size: '文字尺寸，以 point 为单位',
        font_family: '文字字体名字',
        line_height: '文字行高，以 point 为单位',
        overflow:
            '文字排版模式，包括以下三种：\n 1. CLAMP: 节点约束框之外的文字会被截断 \n 2. SHRINK: 自动根据节点约束框缩小文字\n 3. RESIZE: 根据文本内容自动更新节点的 height 属性.',
        wrap: '是否允许自动换行',
        font: 'Label 使用的字体资源',
        system_font: '是否使用系统默认字体，选中此项会将 file 属性置空',
        cache_mode:
            '文本缓存模式，包括以下三种：\n 1. NONE: 不做任何缓存，文本内容进行一次绘制 \n 2. BITMAP: 将文本作为静态图像加入动态图集进行批次合并，但是不能频繁动态修改文本内容 \n 3. CHAR: 将文本拆分为字符并且把字符纹理缓存到一张字符图集中进行复用，适用于字符内容重复并且频繁更新的文本内容',
        font_bold: '字体加粗',
        font_italic: '字体倾斜',
        font_underline: '字体加下划线',
        spacing_x: '文本字符之间的间距。仅在使用 BMFont 位图字体时生效',
        underline_height: '下划线高度',
    },
    labelOutline: {
        color: '描边的颜色',
        width: '描边的宽度',
    },
    labelShadow: {
        color: '阴影的颜色',
        offset: '字体与阴影的偏移',
        blur: '阴影的模糊程度',
    },
    limitVelocityOvertimeModule: {
        limitX: 'X 轴方向上的速度下限',
        limitY: 'Y 轴方向上的速度下限',
        limitZ: 'Z 轴方向上的速度下限',
        limit: '速度下限',
        dampen: '当前速度与速度下限的插值',
        separateAxes: '是否三个轴分开限制',
        space: '计算速度下限时采用的坐标系',
    },
    line: {
        texture: '线段中显示的贴图',
        wordSpace: 'positions是否为世界空间坐标',
        positions: '每段折线的拐点坐标',
        width: '线段宽度，如果采用曲线，则表示沿着线段方向上的曲线变化',
        tile: '贴图平铺次数',
        offset: '贴图坐标的偏移',
        color: '线段颜色，如果采用渐变色，则表示沿着线段方向上的颜色渐变',
    },
    progress: {
        bar_sprite: '进度条显示用的 Sprite 节点，可以动态改变尺寸',
        mode: '进度条显示模式, 包括以下三种：\n 1. HORIZONTAL: 水平方向模式 \n 2. VERTICAL: 垂直方向模式 \n 3. FILLED: 扇形填充模式',
        total_length: '进度条在 progress 为 1 时的最大长度',
        progress: '当前进度指示，范围从0到1',
        reverse: '是否反向驱动进度条',
    },
    scrollbar: {
        handle: '作为当前滚动区域位置显示的滑块 Sprite',
        direction: 'ScrollBar的滚动方向',
        auto_hide: '是否在没有滚动动作时自动隐藏 ScrollBar',
        auto_hide_time: '没有滚动动作后经过多久会自动隐藏\n注意：只有当 “enableAutoHide” 为 true 时，才有效',
    },
    scrollview: {
        content: '包含可滚动展示内容的节点引用',
        horizontal: '是否开启水平滚动',
        vertical: '是否开启垂直滚动',
        inertia: '是否开启滚动惯性',
        brake: '开启惯性后，在用户停止触摸后滚动多快停止，0表示永不停止，1表示立刻停止',
        elastic: '是否允许滚动内容超过边界，并在停止触摸后回弹',
        horizontal_bar: '水平滚动的 ScrollBar',
        vertical_bar: '垂直滚动的 ScrollBar',
        bounceDuration: '回弹持续的时间，0 表示将立即反弹',
        scrollEvents: '滚动视图的事件回调函数',
        cancelInnerEvents: '滚动行为是否会取消子节点上注册的触摸事件',
    },
    pageview: {
        sizeMode: '页面视图中每个页面大小类型',
        direction: '页面视图滚动方向',
        scrollThreshold: '滚动临界值，默认单位百分比，当拖拽超出该数值时，松开会自动滚动下一页，小于时则还原',
        pageTurningEventTiming: '设置 PageView 页面自动滚动动画结束的阈值，修改此值可以调整 PageView 事件的发送时机。',
        indicator: '页面视图指示器组件',
        pageTurningSpeed: '每个页面翻页时所需时间。单位：秒',
        pageEvents: '页面视图的事件回调函数',
        autoPageTurningThreshold:
            '快速滑动翻页临界值\n当用户快速滑动时，会根据滑动开始和结束的距离与时间计算出一个速度值\n该值与此临界值相比较，如果大于临界值，则进行自动翻页',
    },
    pageview_indicator: {
        spriteFrame: '每个页面标记显示的图片',
        direction: '页面标记摆放方向',
        cell_size: '页面标记的大小',
        spacing: '页面标记之间的边距',
    },
    particleSystemRenderer: {
        renderMode: '设定粒子生成模式',
        velocityScale: '在粒子生成方式为 StrecthedBillboard 时,对粒子在运动方向上按速度大小进行拉伸',
        lengthScale: '在粒子生成方式为 StrecthedBillboard 时,对粒子在运动方向上按粒子大小进行拉伸',
        mesh: '粒子发射的模型',
        particleMaterial: '粒子使用的材质',
        trailMaterial: '拖尾使用的材质',
        useGPU: '是否启用GPU粒子',
    },
    renderable2D: {
        srcBlendFactor: '原始混合因子',
        dstBlendFactor: '目标混合因子',
        customMaterial: '用户指定的材质',
        color: '渲染颜色',
    },
    rotationOvertimeModule: {
        separateAxes: '是否三个轴分开设定旋转（暂不支持）',
        x: '绕 X 轴设定旋转',
        y: '绕 Y 轴设定旋转',
        z: '绕 Z 轴设定旋转',
    },
    sizeOvertimeModule: {
        separateAxes: '是否分开设定每个轴上独立控制粒子大小',
        size: '定义一条曲线来决定粒子在其生命周期中的大小变化',
        x: '定义一条曲线来决定粒子在其生命周期中 X 轴方向上的大小变化',
        y: '定义一条曲线来决定粒子在其生命周期中 Y 轴方向上的大小变化',
        z: '定义一条曲线来决定粒子在其生命周期中 Z 轴方向上的大小变化',
    },
    textureAnimationModule: {
        mode: '设定粒子贴图动画的类型（暂只支持 Grid 模式）',
        numTilesX: 'X 方向动画帧数',
        numTilesY: 'Y 方向动画帧数',
        animation: '动画播放方式',
        frameOverTime: '一个周期内动画播放的帧与时间变化曲线',
        startFrame: '从第几帧开始播放，时间为整个粒子系统的生命周期',
        cycleCount: '一个生命周期内播放循环的次数',
        randomRow: '随机从动画贴图中选择一行以生成动画,\n此选项仅在动画播放方式为 SingleRow 时生效',
        rowIndex: '从动画贴图中选择特定行以生成动画,\n此选项仅在动画播放方式为 SingleRow 时且禁用 randomRow 时可用',
    },
    toggle: {
        interactable: 'Toggle 是否可交互，这一项未选中时，Toggle 处在禁用状态',
        transition: 'Toggle 状态变化时的过渡类型',
        normal_color: '普通状态的 Toggle 背景颜色',
        resize_node: '把 Toggle 的 node 的大小重置成 Target 的 node 的大小',
        pressed_color: '按下状态的 Toggle 背景颜色',
        hover_color: '悬停状态的 Toggle 背景颜色',
        disabled_color: '禁用状态的 Toggle 背景颜色',
        duration: 'Toggle 颜色变化或者缩放变化的过渡时间',
        zoom_scale: '当用户点击 Toggle 后，Toggle 会缩放到一个值，这个值等于 Toggle 原始 scale * zoomScale, zoomScale 可以为负数',
        auto_gray_effect:
            '如果这个标记为 true，当 toggle 的 interactable 属性为 false 的时候，会使用内置 shader 让 toggle 的 target 节点的 sprite 组件变灰',
        normal_sprite: '普通状态的 Toggle 背景图资源',
        pressed_sprite: '按下状态的 Toggle 背景图资源',
        hover_sprite: '悬停状态的 Toggle 背景图资源',
        disabled_sprite: '禁用状态的 Toggle 背景图资源',
        target: '指定 Toggle 背景节点，Toggle 状态改变时会修改此节点的 Color 或 Sprite 属性',
        isChecked: '如果这个设置为 true，则 check mark 组件会处于 enabled 状态，否则处于 disabled 状态。',
        checkMark: 'Toggle 处于选中状态时显示的精灵图片',
        toggleGroup:
            'Toggle 所属的 ToggleGroup，这个属性是可选的。如果这个属性为 null，则 Toggle 是一个 CheckBox，否则，Toggle 是一个 RadioButton。',
        check_events: 'Toggle 按钮的点击事件列表',
    },
    toggle_group: {
        allowSwitchOff: '如果这个设置为 true， 那么 toggle 按钮在被点击的时候可以反复地被选中和未选中。',
        check_events: 'Toggle 按钮的点击事件列表',
    },
    shapeModule: {
        position: '粒子发射器位置',
        rotation: '粒子发射器旋转角度',
        scale: '粒子发射器缩放比例',
        arc: '粒子发射器在一个扇形范围内发射',
        angle: '圆锥的轴与母线的夹角\n决定圆锥发射器的开合程度',
        shapeType: '粒子发射器类型',
        emitFrom: '粒子从发射器哪个部位发射',
        alignToDirection: '根据粒子的初始方向决定粒子的移动方向',
        randomDirectionAmount: '粒子生成方向随机设定',
        sphericalDirectionAmount: '表示当前发射方向与当前位置到结点中心连线方向的插值',
        randomPositionAmount: '粒子生成位置随机设定（设定此值为非 0 会使粒子生成位置超出生成器大小范围）',
        radius: '粒子发射器半径',
        radiusThickness: '粒子发射器发射位置（对 Box 类型的发射器无效）:\n - 0 表示从表面发射；\n - 1 表示从中心发射；\n - 0 ~ 1 之间表示在中心到表面之间发射。',
        arcMode: '粒子在扇形范围内的发射方式',
        arcSpread: '控制可能产生粒子的弧周围的离散间隔',
        arcSpeed: '粒子沿圆周发射的速度',
        length: '圆锥顶部截面距离底部的轴长\n决定圆锥发射器的高度',
        boxThickness: '粒子发射器发射位置（针对 Box 类型的粒子发射器）',
    },
    slider: {
        handle: '滑块按钮部件',
        direction: '滑动方向',
        progress: '当前进度值，该数值的区间是 0-1 之间。',
        slideEvents: '滑动器组件事件回调函数',
    },
    trailSegment: {
        mode: 'Particle在每个粒子的运动轨迹上形成拖尾效果',
        lifeTime: '拖尾的生命周期',
        minParticleDistance: '粒子每生成一个拖尾节点所运行的最短距离',
        space: '拖尾所在的坐标系，World在世界坐标系中运行，Local在本地坐标系中运行',
        textureMode: '贴图在拖尾上的展开形式，Stretch贴图覆盖在整条拖尾上，Repeat贴图覆盖在一段拖尾上',
        widthFromParticle: '拖尾宽度继承自粒子大小',
        widthRatio: '拖尾宽度，如果继承自粒子则是粒子大小的比例',
        colorFromParticle: '拖尾颜色是否继承自粒子',
        colorOverTrail: '拖尾颜色随拖尾自身长度的颜色渐变',
        colorOvertime: '拖尾颜色随时间的颜色渐变',
    },
    velocityOvertimeModule: {
        x: 'X 轴方向上的速度分量',
        y: 'Y 轴方向上的速度分量',
        z: 'Z 轴方向上的速度分量',
        speedModifier: '速度修正系数（只支持 CPU 粒子）',
        space: '速度计算时采用的坐标系',
    },
    widget: {
        target: '指定一个对齐目标，只能是当前节点的其中一个父节点，默认为空，为空时表示当前父节点',
        align_top: '是否对齐 target 顶边',
        align_bottom: '是否对齐 target 底边',
        align_left: '是否对齐 target 左边',
        align_right: '是否对齐 target 右边',
        align_h_center: '是否对齐 target 水平中点，开启这一选项将取消水平轴上的其他对齐选项',
        align_v_center: '是否对齐 target 垂直中点，开启这一选项将取消垂直轴上的其他对齐选项',
        align_mode: '指定 Widget 的对齐模式，用于决定运行时 Widget 应该何时刷新。',
        top: '本节点顶边和 target 顶边的距离，可输入负值，默认单位为像素（px），也可以输入百分比，根据 target height 和百分比数值计算出距离',
        bottom:
            '本节点底边和 target 底边的距离，可输入负值，默认单位为像素（px），也可以输入百分比，根据 target height 和百分比数值计算出距离',
        left: '本节点左边和 target 左边的距离，可输入负值，默认单位为像素（px），也可以输入百分比，根据 target width 和百分比数值计算出距离',
        right: '本节点右边和 target 右边的距离，可输入负值，默认单位为像素（px），也可以输入百分比，根据 target width 和百分比数值计算出距离',
        horizontal_center: '水平居中的偏移值，可输入负值，默认单位为像素（px），也可以是百分比',
        vertical_center: '垂直居中的偏移值，可输入负值，默认单位为像素（px），也可以是百分比',
    },
    layout: {
        layout_type:
            '自动布局模式，包括：\n 1. NONE，不会对子节点进行自动布局 \n 2. HORIZONTAL，横向自动排布子物体 \n 3. VERTICAL，垂直自动排布子物体\n 4. GRID, 采用网格方式对子物体自动进行布局',
        resize_mode:
            '缩放模式，包括：\n 1. NONE，不会对子节点和容器进行大小缩放 \n 2. CONTAINER, 对容器的大小进行缩放 \n 3. CHILD, 对子节点的大小进行缩放',
        padding_left: 'Layout 节点左边界和子节点的内边距',
        padding_right: 'Layout 节点右边界和子节点的内边距',
        padding_top: 'Layout 节点上边界和子节点的内边距',
        padding_bottom: 'Layout 节点下边界和子节点的内边距',
        space_x: '相邻子节点之间的水平距离',
        space_y: '相邻子节点之间的垂直距离',
        vertical_direction: '垂直排列子节点的方向，包括：\n 1. TOP_TO_BOTTOM, 从上到下排列 \n 2. BOTTOM_TO_TOP, 从下到上排列',
        horizontal_direction: '水平排列子节点的方向，包括：\n 1. LEFT_TO_RIGHT, 从左到右排列 \n 2. RIGHT_TO_LEFT, 从右到左排列',
        cell_size: '网格布局中，规定每一个网格的大小',
        start_axis: '网格布局中，子物体排版时的起始方向轴，支持水平和垂直两个方向。',
        constraint: '网格布局中，内容布局约束，包括：\n 1.NONE，无约束 \n 2.FIXED_ROW，行数固定 \n 3.FIXED_COL，列数固定',
        constraint_number: '网格布局中，内容布局约束的行或列数量',
        affected_scale: '子节点缩放比例是否影响布局',
        align_horizontal: '自动对齐。在 Type 为 Horizontal 时自动对齐纵坐标',
        align_vertical: '自动对齐。在 Type 为 Vertical 时自动对齐横坐标',
    },
    particle: {
        export_title: '将自定义的粒子数据导出成 plist 文件',
        export: '导出',
        export_error: '该资源不支持导出到项目外',
        sync: '同步',
        sync_tips: '同步 File 中的参数到 Custom',
    },
    editbox: {
        string: '输入框的初始输入内容，如果为空则会显示占位符的文本',
        backgroundImage: '输入框的背景图片',
        input_flag: '指定输入标识：可以指定输入方式为密码或者单词首字母大写',
        returnType: '指定移动设备上面回车按钮的样式',
        input_mode: '指定输入模式: ANY表示多行输入，其它都是单行输入，移动平台上还可以指定键盘样式。',
        font_size: '输入框文本的字体大小',
        line_height: '输入框文本的行高',
        font_color: '输入框文本的颜色',
        stay_on_top: '设置为 True 则输入框总是可见，并且永远在游戏视图的上面',
        tab_index: '修改 DOM 输入元素的 tabIndex，这个属性只有在 Web 上面修改有意义。',
        placeholder: '输入框占位符的文本内容',
        placeholder_font_size: '输入框占位符的字体大小',
        placeholder_font_color: '输入框占位符的字体颜色',
        max_length: '输入框最大允许输入的字符个数',
        text_lable: '输入框输入文本节点上挂载的 Label 组件对象',
        placeholder_label: '输入框占位符节点上挂载的 Label 组件对象',
        editing_began: '开始编辑文本输入框触发的事件回调',
        text_changed: '编辑文本输入框时触发的事件回调',
        editing_ended: '结束编辑文本输入框时触发的事件回调\n在单行模式下面，一般是在用户按下回车或者点击屏幕输入框以外的地方调用该函数\n如果是多行输入，一般是在用户点击屏幕输入框以外的地方调用该函数',
        editing_return: '当用户按下回车按键时的事件回调\n如果是单行输入框，按回车键还会使输入框失去焦点',
    },
    videoplayer: {
        resourceType: '视频来源：REMOTE 表示远程视频 URL，LOCAL 表示本地视频地址。',
        remoteURL: '远程视频的 URL',
        clip: '本地视频剪辑',
        playOnAwake: '视频加载后是否自动开始播放？',
        volume: '视频的音量（0.0 ~ 1.0）',
        playbackRate: '视频播放时的速率（0.0 ~ 10.0）',
        mute: '是否静音视频。静音时设置音量为 0，取消静音是恢复原来的音量。',
        loop: '视频是否应在结束时再次播放',
        keepAspectRatio: '是否保持视频原来的宽高比',
        fullScreenOnAwake: '是否全屏播放视频？',
        stayOnBottom: '永远在游戏视图最底层（这个属性只有在 Web 平台上有效果。注意：具体效果无法保证一致，跟各个浏览器是否支持与限制有关）',
        videoPlayerEvent: '视频播放回调函数，该回调函数会在特定情况被触发，比如播放中，暂时，停止和完成播放。',
    },
    webview: {
        url: '指定一个 URL 地址，这个地址以 http 或者 https 开头，请填写一个有效的 URL 地址。',
        webviewEvents: 'Webview 的回调事件，当网页加载过程中，加载完成后或者加载出错时都会回调此函数',
    },
    richtext: {
        string: '富文本的内容字符串, 你可以在里面使用 BBCode 来指定特定文本的样式',
        horizontal_align: '水平对齐方式',
        vertical_align: '竖直对齐方式',
        font_size: '字体大小, 单位是 point',
        font: '富文本定制字体',
        font_family: '富文本定制系统字体',
        use_system_font: '是否使用系统字体',
        cache_mode: '文本缓存模式, 该模式只支持系统字体',
        max_width: '富文本的最大宽度, 传 0 的话意味着必须手动换行.',
        line_height: '字体行高, 单位是 point',
        image_atlas: '对于 img 标签里面的 src 属性名称，都需要在 imageAtlas 里面找到一个有效的 spriteFrame，否则 img tag 会判定为无效',
        handleTouchEvent: '选中此选项后，RichText 将阻止节点边界框中的所有输入事件（鼠标和触摸），从而防止输入事件穿透到底层节点',
    },
    UICoordinateTracker: {
        target: '目标对象',
        camera: '照射相机',
        use_scale: '是否是缩放映射',
        distance: '距相机多少距离为正常显示计算大小',
        sync_events: '映射数据事件\n回调的第一个参数是映射后的本地坐标，第二个是距相机距离',
    },
    subContextView: {
        design_size: '开放数据域的设计分辨率，禁止在运行时动态更新',
        fps: '主域更新开放数据域贴图的频率',
    },
    skeleton: {
        skeleton_data: '骨骼信息数据，拖拽 Spine 导出的骨骼动画信息 json 资源到这里来开始使用',
        default_skin: '选择默认的皮肤',
        animation: '正在播放的动画名称',
        loop: '是否循环播放当前动画',
        time_scale: '当前骨骼中所有动画的时间缩放率',
        debug_slots: '是否显示 slot 的 debug 信息',
        debug_bones: '是否显示 bone 的 debug 信息',
        premultipliedAlpha: '是否启用贴图预乘',
    },
    dragon_bones: {
        dragon_bones_asset: '骨骼信息数据，拖拽 DragonBones 导出的骨骼动画信息 json 资源到这里来开始使用',
        dragon_bones_atlas_asset: 'Texture 信息数据，拖拽 DragonBones 导出的 Texture 信息 json 资源到这里来开始使用',
        armature_name: '当前的 Armature 名称',
        animation_name: '当前播放的动画名称',
        time_scale: '当前骨骼中所有动画的时间缩放率',
        play_times: '播放默认动画的循环次数\n-1 表示使用配置文件中的默认值\n0 表示无限循环\n>0 表示循环次数',
        debug_bones: '是否显示 bone 的 debug 信息',
    },
    motionStreak: {
        fadeTime: '拖尾的渐隐时间,以秒为单位',
        minSeg: '拖尾之间最小距离',
        stroke: '拖尾的宽度',
        texture: '拖尾的贴图',
        color: '拖尾的颜色',
        fastMode: '是否启用了快速模式',
    },
    missing_scirpt: {
        error_compiled:
            '载入脚本时报错或脚本已丢失，请检查报错信息并进行修正，该组件将在修正后自动还原。如果脚本已删除，请手动删除该组件。',
        error_not_compiled: '脚本编译失败，请检查报错信息并进行修正，该组件将在修正后自动还原。',
    },
    collider: {
        editing: '是否需要编辑此碰撞组件',
        category: '碰撞组件所属类别',
        mask: '可以与碰撞组件相碰撞的组件掩码',
    },
    particle_system: {
        preview: '在编辑器模式下预览粒子，启用后选中粒子时，粒子将自动播放',
        custom: '是否自定义粒子属性',
        file: 'plist 格式的粒子配置文件',
        spriteFrame: '粒子贴图定义',
        texture: '粒子贴图，只读属性，请使用 spriteFrame 属性来替换贴图',
        particleCount: '当前播放的粒子数量',
        srcBlendFactor: '指定原图混合模式',
        dstBlendFactor: '指定目标的混合模式',
        playOnLoad: '如果设置为 true 运行时会自动发射粒子',
        autoRemoveOnFinish: '粒子播放完毕后自动销毁所在的节点',
        duration: '发射器生存时间，单位秒，-1表示持续发射',
        emissionRate: '每秒发射的粒子数目',
        life: '粒子的运行时间及变化范围',
        totalParticles: '粒子最大数量',
        startColor: '粒子初始颜色',
        startColorVar: '粒子初始颜色变化范围',
        endColor: '粒子结束颜色',
        endColorVar: '粒子结束颜色变化范围',
        angle: '粒子角度及变化范围',
        startSize: '粒子的初始大小及变化范围',
        endSize: '粒子结束时的大小及变化范围',
        startSpin: '粒子开始自旋角度及变化范围',
        endSpin: '粒子结束自旋角度及变化范围',
        sourcePos: '发射器位置',
        posVar: '发射器位置的变化范围。（横向和纵向）',
        positionType: '粒子位置类型',
        emitterMode: '发射器类型',
        gravity: '重力',
        speed: '速度及变化范围',
        tangentialAccel: '每个粒子的切向加速度及变化范围，即垂直于重力方向的加速度，只有在重力模式下可用',
        radialAccel: '粒子径向加速度及变化范围，即平行于重力方向的加速度，只有在重力模式下可用',
        rotationIsDir: '每个粒子的旋转是否等于其方向，只有在重力模式下可用',
        startRadius: '初始半径及变化范围，表示粒子出生时相对发射器的距离，只有在半径模式下可用',
        endRadius: '结束半径及变化范围，只有在半径模式下可用',
        rotatePerS: '粒子每秒围绕起始点的旋转角度及变化范围，只有在半径模式下可用',
        capacity: '粒子系统能生成的最大粒子数量',
        scaleSpace: '选择缩放坐标系',
        startSize3D: '是否分别设置粒子X,Y和Z轴的初始大小',
        startSizeX: 'X轴初始大小',
        startSizeY: 'Y轴初始大小',
        startSizeZ: 'Z轴初始大小',
        startSpeed: '初始速度',
        startRotation3D: '是否分别设置粒子X,Y和Z轴的初始旋转角度',
        startRotationX: 'X轴初始旋转角度',
        startRotationY: 'Y轴初始旋转角度',
        startRotationZ: 'Z轴初始旋转角度',
        startDelay: '粒子系统开始运行后，延迟粒子发射的时间',
        startLifetime: '粒子生命周期',
        duration: '粒子系统运行时间',
        loop: '粒子系统是否循环播放',
        prewarm: '选中之后，粒子系统会以已播放完一轮之后的状态开始播放（仅当循环播放启用时有效）',
        simulationSpace: '选择粒子系统所在的坐标系',
        simulationSpeed: '控制整个粒子系统的更新速度',
        playOnAwake: '粒子系统加载后是否自动开始播放',
        gravityModifier: '粒子受重力影响的重力系数（只支持 CPU 粒子）',
        rateOverTime: '每秒发射的粒子数',
        rateOverDistance: '每移动单位距离发射的粒子数',
        bursts: '设定在指定时间发射指定数量的粒子的 burst 的数量',
        colorOverLifetimeModule: '颜色控制模块',
        shapeModule: '粒子发射器模块',
        sizeOvertimeModule: '粒子大小模块',
        velocityOvertimeModule: '粒子速度模块',
        forceOvertimeModule: '粒子加速度模块',
        limitVelocityOvertimeModule: '粒子限制速度模块（只支持 CPU 粒子）',
        rotationOvertimeModule: '粒子旋转模块',
        textureAnimationModule: '贴图动画模块',
        trailModule: '粒子轨迹模块（只支持 CPU 粒子）',
        renderer: '粒子渲染模块',
        renderCulling: '是否开启粒子剔除功能。开启该项将会生成一个粒子发射器包围盒，若包围盒不在摄像机的可见范围内，该粒子发射器便会被剔除。粒子发射器被剔除后的行为请参考下面的 cullingMode。',
        cullingMode: '粒子发射器被剔除之后的行为，可设置的选项包括 pause、pause and catchup、always simulate。\n选择 pause 时，若粒子发射器包围盒不在摄像机的可见范围内，粒子暂停模拟。若恢复可见，则粒子会接着上次暂停的时间继续模拟；\n选择 pause and catchup 时，若粒子发射器包围盒不在摄像机的可见范围内，粒子暂停模拟。若恢复可见，则粒子会以当前的时间开始模拟；\n选择 always simulate 时，无论粒子发射器包围盒是否在摄像机的可见范围内，粒子都会一直模拟，只是不在摄像机的可见范围内时不进行渲染。',
        alignSpace: '粒子对齐方向空间，可设置的选项包括：视角空间、世界空间和局部空间。\n选择视角空间时，粒子网格的旋转方向将会跟随摄像机的视角方向；\n选择世界空间时，粒子网格的方向将会使用发射器节点的世界空间旋转方向；\n选择局部空间时，粒子网格使用发射器节点的局部空间旋转方向。',
        aabbHalfX: '设置发射器包围盒半宽',
        aabbHalfY: '设置发射器包围盒半高',
        aabbHalfZ: '设置发射器包围盒半长',
        dataCulling: '是否剔除非 enable 的模块数据',
    },
    mask: {
        type: '遮罩类型',
        spriteFrame: '遮罩所需要的贴图',
        inverted: '反向遮罩（不支持 Canvas 模式）',
        alphaThreshold: 'Alpha阈值，只有当模板的像素的 alpha 大于 alphaThreshold 时，才会绘制内容（不支持 Canvas 模式）',
        segements: '椭圆遮罩的曲线细分数',
    },
    physics: {
        rigidbody: {
            enabledContactListener: '是否启用接触接听器。当 collider 产生碰撞时，只有开启了接触接听器才会调用相应的回调函数',
            bullet: '这个刚体是否是一个快速移动的刚体，并且需要禁止穿过其他快速移动的刚体',
            type: '刚体类型： Static（静态）, Kinematic（不受外力）, Dynamic（动态）和 Animated（通过设置线性速度和角速度驱动）',
            allowSleep: '如果此刚体永远都不应该进入睡眠，那么设置这个属性为 false。需要注意这将使 CPU 占用率提高',
            gravityScale: '缩放应用在此刚体上的重力值',
            linearDamping:
                'Linear damping 用于衰减刚体的线性速度。衰减系数可以大于 1，但是当衰减系数比较大的时候，衰减的效果会变得比较敏感。',
            angularDamping:
                'Angular damping 用于衰减刚体的角速度。衰减系数可以大于 1，但是当衰减系数比较大的时候，衰减的效果会变得比较敏感。',
            linearVelocity: '刚体在世界坐标下的线性速度',
            angularVelocity: '刚体的角速度',
            fixedRotation: '是否禁止此刚体进行旋转',
            awake: '是否立刻唤醒此刚体',
        },
        physics_collider: {
            density: '密度',
            sensor: '一个传感器类型的碰撞体会产生碰撞回调，但是不会发生物理碰撞效果。',
            friction: '摩擦系数，取值一般在 [0, 1] 之间',
            restitution: '弹性系数，取值一般在 [0, 1]之间',
            anchor: '刚体的锚点。',
            connectedAnchor: '关节另一端刚体的锚点。',
            connectedBody: '关节另一端链接的刚体',
            collideConnected: '链接到关节上的两个刚体是否应该相互碰撞？',
            distance: '关节两端的距离',
            frequency: '弹性系数。',
            dampingRatio: '阻尼，表示关节变形后，恢复到初始状态受到的阻力。',
            linearOffset: '关节另一端的刚体相对于起始端刚体的位置偏移量',
            angularOffset: '关节另一端的刚体相对于起始端刚体的角度偏移量',
            maxForce: '可以应用于刚体的最大的力值',
            maxTorque: '可以应用于刚体的最大扭矩值',
            correctionFactor: '位置矫正系数，范围为 [0, 1]',
            mouseRegion: '用于注册触摸事件的节点。如果没有设置这个值，那么将会使用关节的节点来注册事件。',
            target: '目标点，鼠标关节将会移动选中的刚体到指定的目标点',
            localAxisA: '指定刚体可以移动的方向。',
            enableLimit: '是否开启关节的距离限制？',
            enableMotor: '是否开启关节马达？',
            lowerLimit: '刚体能够移动的最小值',
            upperLimit: '刚体能够移动的最大值',
            maxMotorForce: '可以施加到刚体的最大力。',
            motorSpeed: '期望的马达速度。',
            referenceAngle: '相对角度。两个物体之间角度为零时可以看作相等于关节角度',
            lowerAngle: '角度的最低限制。',
            upperAngle: '角度的最高限制。',
            maxMotorTorque: '可以施加到刚体的最大扭矩。',
            maxLength: '最大长度。',
            offset: '位置偏移量',
            size: '包围盒大小',
            radius: '圆形半径',
            tag: '标签。当一个节点上有多个碰撞组件时，在发生碰撞后，可以使用此标签来判断是节点上的哪个碰撞组件被碰撞了。',
            points: '多边形顶点数组',
        },
    },
    block_input_events: {
        brief_help: '该组件将拦截所有输入事件，防止输入穿透到屏幕下方的其它节点，一般用于屏幕上层 UI 的背景。',
    },
    tiledtile: {
        row: '指定 TiledTile 的横向坐标，以地图块为单位',
        column: '指定 TiledTile 的纵向坐标，以地图块为单位',
        gid: '指定 TiledTile 的 gid 值',
        layer: '指定 TiledTile 属于哪一个 TiledLayer',
    },
    INSPECTOR: {
        component: {
            script: '自定义脚本',
        },
    },
    features: {
        categories: {
            '2d': {
                label: '2D',
                description: '2D',
            },
            '3d': {
                label: '3D',
                description: '3D',
            },
            animation: {
                label: '动画',
                description: '动画系统。',
            },
        },
        core: {
            label: "核心功能",
            description: "Cocos Creator 核心功能。",
        },
        graphics: {
            label: "图形后端",
            description: "选择支撑渲染系统的图形后端。",
        },
        gfx_webgl: {
            label: "WebGL",
            description: "包含对 WebGL 1.0 图形 API 的支持。",
        },
        gfx_webgl2: {
            label: "WebGL 2.0",
            description: "包含对 WebGL 2.0 图形 API 的支持。\n当 WebGL 2.0 在目标平台上不可用时会自动回退至 WebGL 1.0。",
        },
        ui: {
            label: "用户界面",
            description: "用户界面支持。",
        },
        gpu_driven: {
            label: "GPU驱动",
            description: "是否启用GPU驱动方案",
        },
        base_3d: {
            label: "基础 3D 功能",
            description: "常用于一般 3D 应用的工具与组件。",
        },
        particle: {
            label: "粒子系统",
            description: "粒子系统支持。",
        },
        physics: {
            label: "物理系统",
            description: "选择不同的物理系统。",
        },
        physics_builtin: {
            label: "内置物理系统",
            description: "内置的物理系统支持。",
        },
        physics_cannon: {
            label: "基于 cannon.js 的物理系统",
            description: "基于 cannon.js 的物理系统支持。",
        },
        physics_ammo: {
            label: "基于 Bullet 的物理系统",
            description: "基于 Bullet 的物理系统支持。",
        },
        physics_physx: {
            label: "基于 PhysX 的物理系统",
            description: "基于 PhysX 的物理系统支持。",
        },
        primitives: {
            label: "基础几何体",
            description: "创建基础几何体的库。",
        },
        base_2d: {
            label: "基础 2D 功能",
            description: "常用于一般 2D 应用的工具与组件。",
        },
        physics_2d: {
            label: "2D 物理系统",
            description: "应用于 2D 的物理系统支持。",
        },
        physics_2d_builtin: {
            label: "内置 2D 物理系统",
            description: "内置的 2D 物理系统支持。",
        },
        physics_2d_box2d: {
            label: "基于 Box2D 的 2D 物理系统",
            description: "基于 Box2D 的 2D 物理系统支持。",
        },
        intersection_2d: {
            label: "2D 相交检测算法",
            description: "包含用于二维相交检测的算法。",
        },
        particle_2d: {
            label: "2D 粒子系统",
            description: "应用于 2D 的粒子系统支持。",
        },
        terrain: {
            label: "地形",
            description: "地形功能支持。",
        },
        audio: {
            label: "音频",
            description: "音频播放支持。",
        },
        video: {
            label: "视频",
            description: "视频播放支持。",
        },
        webview: {
            label: "Web View",
            description: "支持显示 Web 内容。",
        },
        tween: {
            label: "缓动系统",
            description: "缓动系统支持。",
        },
        profiler: {
            label: "运行状态统计",
            description: "包含用于统计、显示渲染数据的组件与工具。",
        },
        tiled_map: {
            label: "Tiled 地图",
            description: "Tiled 地图支持。",
        },
        spine: {
            label: "Spine 动画",
            description: "Spine 动画支持。",
        },
        dragon_bones: {
            label: "DragonBones",
            description: "DragonBones 支持。",
        },
        animation: {
            label: "基础动画功能",
            description: "基础动画功能支持。",
        },
        skeletal_animation: {
            label: "骨骼动画",
            description: "骨骼动画支持。",
        },
    },
    renderable_2d: {
        srcBlendFactor: '指定源的混合模式，这会克隆一个新的材质对象，注意这带来的性能和内存损耗',
        dstBlendFactor: '指定目标的混合模式，这会克隆一个新的材质对象，注意这带来的性能和内存损耗',
        color: '渲染颜色，一般情况下会和贴图颜色相乘',
    },
    ui_transform: {
        content_size:'内容尺寸',
        anchor_point:'锚点位置',
        priority:'渲染排序优先级',
    },
    graphics: {
        lineWidth: '线条宽度',
        lineJoin: '用来设置 2 个长度不为 0 的相连部分（线段、圆弧、曲线）如何连接在一起',
        lineCap: '指定如何绘制每一条线段末端',
        strokeColor: '笔触的颜色',
        fillColor: '填充绘画的颜色',
        miterLimit: '设置斜接面限制比例',
    },
    physics3d: {
        rigidbody: {
            group: '刚体分组',
            type: '刚体类型：Static为静态, Kinematic为运动学（通过变换信息操控）, Dynamic为动力学（通过物理数值操控）',
            mass: '刚体质量，需大于 0',
            allowSleep: '是否允许自动休眠',
            linearDamping: '线性阻尼，用于衰减线性速度，值越大，衰减越快',
            angularDamping: '角阻尼，用于衰减角速度，值越大，衰减越快',
            useGravity: '是否使用重力',
            linearFactor: '线性因子，用于缩放每个轴方向上的物理数值（速度或力）',
            angularFactor: '角因子，用于缩放每个轴方向上的物理数值（速度或力）',
        },
        collider: {
            attached: '碰撞体所附加的刚体',
            sharedMaterial: '所使用的物理材质，未设置时为默认值',
            isTrigger: '是否为触发器，触发器不会产生物理反馈',
            center: '在本地坐标系中，形状的中心位置',
            sphere_radius: '在本地坐标系中，球的半径',
            box_size: '在本地坐标系中，盒的大小',
            capsule_radius: '在本地坐标系中，胶囊体上的球的半径',
            capsule_cylinderHeight: '在本地坐标系中，胶囊体上的圆柱体的高度',
            capsule_direction: '在本地坐标系中，胶囊体的朝向',
            cone_radius: '在本地坐标系中，圆锥体上圆面的半径',
            cone_height: '在本地坐标系中，圆锥体在相应轴向的高度',
            cone_direction: '在本地坐标系中，圆锥体的朝向',
            cylinder_radius: '在本地坐标系中，圆柱体上圆面的半径',
            cylinder_height: '在本地坐标系中，圆柱体在相应轴向的高度',
            cylinder_direction: '在本地坐标系中，圆柱体的朝向',
            plane_normal: '在本地坐标系中，平面的法线',
            plane_constant: '在本地坐标系中，平面从原点开始沿着法线运动的距离',
            mesh_mesh: '所使用的网格资源',
            mesh_convex: '是否使用凸包近似代替，顶点数应小于255，开启后可以支持动力学',
            terrain_terrain: '所使用的地形资源',
            simplex_shapeType: '单纯形类型，点、线、三角形、四面体',
            simplex_vertex0: '形状的顶点0',
            simplex_vertex1: '形状的顶点1',
            simplex_vertex2: '形状的顶点2',
            simplex_vertex3: '形状的顶点3',
        },
        constant_force:{
            force: '在世界坐标系中，对刚体施加的力',
            localForce: '在本地坐标系中，对刚体施加的力',
            torque: '在世界坐标系中，对刚体施加的扭转力',
            localTorque: '在本地坐标系中，对刚体施加的扭转力',
        },
    },
    octree_culling: {
        enabled: '八叉树剔除开关，仅在原生平台中生效',
        minPos: '世界包围盒最小顶点的坐标',
        maxPos: '世界包围盒最大顶点的坐标',
        depth: '八叉树深度',
    },
};
