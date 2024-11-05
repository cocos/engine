/* eslint-disable quote-props */

module.exports = {
    classes: {
        'cc': {
            'UIRenderer': {
                properties: {
                    customMaterial: {
                        displayName: '自定义材质',
                        tooltip: '使用自定义材质。',
                    },
                    color: {
                        displayName: '颜色',
                        tooltip: '渲染颜色。',
                    },
                },
            },
            'Label': {
                properties: {
                    __extends__: 'classes.cc.UIRenderer.properties',
                    'string': {
                        displayName: '字符串',
                        tooltip: '显示的文本内容字符串。',
                    },
                    'horizontalAlign': {
                        displayName: '水平对齐',
                        tooltip: '文字水平对齐模式。',
                        tooltip_left: '左对齐。',
                        tooltip_right: '右对齐。',
                        tooltip_center: '居中对齐。',
                    },
                    'verticalAlign': {
                        displayName: '竖直对齐',
                        tooltip: '文字竖直对齐模式。',
                        tooltip_top: '上对齐。',
                        tooltip_bottom: '下对齐。',
                        tooltip_center: '居中对齐。',
                    },
                    'fontSize': {
                        displayName: '字体大小',
                        tooltip: '文字尺寸，以点为单位。',
                    },
                    'lineHeight': {
                        displayName: '行高',
                        tooltip: '文字行高，以点为单位。',
                    },
                    'spacingX': {
                        displayName: '水平间距',
                        tooltip: '文本字符之间的间距。仅在使用位图字体时生效。',
                    },
                    'overflow': {
                        displayName: '溢出处理',
                        tooltip: '文字排版模式，包括以下三种：<br> ' +
                            '1. CLAMP: 节点约束框之外的文字会被截断。 <br> ' +
                            '2. SHRINK: 自动根据节点约束框缩小文字。<br> ' +
                            '3. RESIZE: 根据文本内容自动更新节点的 height 属性。',
                    },
                    'enableWrapText': {
                        displayName: '自动换行',
                        tooltip: '自动换行。',
                    },
                    'useSystemFont': {
                        displayName: '系统字体',
                        tooltip: '是否使用系统默认字体，选中此项会将引用的字体资产置空。',
                    },
                    'fontFamily': {
                        displayName: '字体族',
                        tooltip: '文字字体名字。',
                    },
                    'font': {
                        displayName: '字体',
                        tooltip: '使用的字体资源。',
                    },
                    'cacheMode': {
                        displayName: '缓存模式',
                        tooltip: '文本缓存模式，包括以下三种：<br> ' +
                            '1. NONE: 不做任何缓存，文本内容进行一次绘制。 <br> ' +
                            '2. BITMAP: 将文本作为静态图像加入动态图集进行批次合并，但是不能频繁动态修改文本内容。 <br> ' +
                            '3. CHAR: 将文本拆分为字符并且把字符纹理缓存到一张字符图集中进行复用，适用于字符内容重复并且频繁更新的文本内容。',
                    },
                    'isBold': {
                        displayName: '粗体',
                        tooltip: '使字体加粗。',
                    },
                    'isItalic': {
                        displayName: '斜体',
                        tooltip: '使字体倾斜。',
                    },
                    'isUnderline': {
                        displayName: '下划线',
                        tooltip: '为字体加下划线。',
                    },
                    'underlineHeight': {
                        displayName: '下划线高度',
                        tooltip: '下划线高度。',
                    },
                    'enableOutline': {
                        displayName: '启用描边',
                        tooltip: '是否启用描边。',
                    },
                    'outlineColor': {
                        displayName: '描边颜色',
                        tooltip: '描边颜色。',
                    },
                    'outlineWidth': {
                        displayName: '描边宽度',
                        tooltip: '描边宽度。',
                    },
                    'enableShadow': {
                        displayName: '启用阴影',
                        tooltip: '是否启用阴影。',
                    },
                    'shadowColor': {
                        displayName: '阴影颜色',
                        tooltip: '阴影颜色。',
                    },
                    'shadowOffset': {
                        displayName: '阴影偏移',
                        tooltip: '阴影偏移量。',
                    },
                    'shadowBlur': {
                        displayName: '阴影模糊',
                        tooltip: '阴影模糊程度。',
                    },
                },
            },
            'RichText': {
                properties: {
                    'string': {
                        tooltip: '显示的富文本内容字符串。',
                    },
                    'horizontalAlign': {
                        displayName: '水平对齐',
                        tooltip: '文字水平对齐模式。',
                        tooltip_left: '左对齐。',
                        tooltip_right: '右对齐。',
                        tooltip_center: '居中对齐。',
                    },
                    'verticalAlign': {
                        displayName: '竖直对齐',
                        tooltip: '文字竖直对齐模式。',
                        tooltip_top: '上对齐。',
                        tooltip_bottom: '下对齐。',
                        tooltip_center: '居中对齐。',
                    },
                    'fontSize': {
                        displayName: '字体大小',
                        tooltip: '文字尺寸，以点为单位。',
                    },
                    'fontColor': {
                        displayName: '颜色',
                        tooltip: '富文本默认文字颜色。在文本内容没有设置颜色参数时生效。暂不支持颜色级联。',
                    },
                    'fontFamily': {
                        displayName: '字体族',
                        tooltip: '文字字体名字。',
                    },
                    'font': {
                        displayName: '字体',
                        tooltip: '使用的字体资源。',
                    },
                    'useSystemFont': {
                        displayName: '系统字体',
                        tooltip: '是否使用系统默认字体，选中此项会将引用的字体资产置空。',
                    },
                    'cacheMode': {
                        displayName: '缓存模式',
                        tooltip: '文本缓存模式，包括以下三种：<br> ' +
                            '1. NONE: 不做任何缓存，文本内容进行一次绘制。 <br> ' +
                            '2. BITMAP: 将文本作为静态图像加入动态图集进行批次合并，但是不能频繁动态修改文本内容。 <br> ' +
                            '3. CHAR: 将文本拆分为字符并且把字符纹理缓存到一张字符图集中进行复用，适用于字符内容重复并且频繁更新的文本内容。',
                    },
                    'maxWidth': {
                        displayName: '缓存模式',
                        tooltip: '富文本的最大宽度, 传 0 的话意味着必须手动换行。',
                    },
                    'lineHeight': {
                        displayName: '行高',
                        tooltip: '文字行高，以点为单位。',
                    },
                    'imageAtlas': {
                        displayName: '图集',
                        tooltip: '对于 img 标签里面的 src 属性名称，' +
                            '<br>都需要在 image atlas 里面找到一个有效的 sprite frame，' +
                            '<br>否则 img tag 会判定为无效。',
                    },
                    'handleTouchEvent': {
                        displayName: '阻止输入事件',
                        tooltip: '选中此选项后，rich text 将阻止节点边界框中的所有输入事件（鼠标和触摸），' +
                            '<br>从而防止输入事件穿透到底层节点。',
                    },
                },
            },
            'Sprite': {
                properties: {
                    __extends__: 'classes.cc.UIRenderer.properties',
                    'grayscale': {
                        displayName: 'Grayscale',
                        tooltip: '是否开启灰度渲染模式',
                    },
                    'spriteAtlas': {
                        displayName: 'Sprite Atlas',
                        tooltip: '图片资源所属的 Atlas 图集资源',
                    },
                    'sprite_frame': {
                        displayName: 'Sprite Frame',
                        tooltip: '渲染 Sprite 使用的 Sprite Frame 图片资源',
                    },
                    'type': {
                        displayName: 'Type',
                        tooltip: '渲染模式：<br> - 普通(Simple)：修改尺寸会整体拉伸图像，适用于序列帧动画和普通图像 <br>' +
                            '- 九宫格 Sliced 修改尺寸时四个角的区域不会拉伸，适用于 UI 按钮和面板背景 <br>' +
                            '- 平铺 Tiled 修改尺寸时会不断平铺原始大小的图片 <br>' +
                            '- 填充 Filled 设置一定的填充起始位置和方向，能够以一定比率剪裁显示图片',
                    },
                    'size_mode': {
                        displayName: 'Size Mode',
                        tooltip: '指定 Sprite 所在节点的尺寸<br>CUSTOM 表示自定义尺寸<br>TRIMMED 表示取原始图片剪裁透明像素后的尺寸<br>RAW 表示取原始图片未剪裁的尺寸',
                    },
                    'trim': {
                        displayName: 'Trim',
                        tooltip: '节点约束框内是否包括透明像素区域，勾选此项会去除节点约束框内的透明区域',
                    },
                },
            },
        },
    },
};
