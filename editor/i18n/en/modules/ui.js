/* eslint-disable quote-props */

module.exports = {
    classes: {
        'cc': {
            'UIRenderer': {
                properties: {
                    customMaterial: {
                        displayName: 'Custom Material',
                        tooltip: 'Use custom material.',
                    },
                    color: {
                        displayName: 'Color',
                        tooltip: 'Rendering color.',
                    },
                },
            },
            'Label': {
                properties: {
                    __extends__: 'classes.cc.UIRenderer.properties',
                    'string': {
                        displayName: 'string',
                        tooltip: 'The label text.',
                    },
                    'horizontalAlign': {
                        displayName: 'Horizontal Alignment',
                        tooltip: 'Horizontal alignment mode.',
                        tooltip_left: 'Align Left.',
                        tooltip_right: 'Align Right.',
                        tooltip_center: 'Align Center.',
                    },
                    'verticalAlign': {
                        displayName: 'Vertical Alignment',
                        tooltip: 'Vertical alignment mode.',
                        tooltip_top: 'Align Top.',
                        tooltip_bottom: 'Align Bottom.',
                        tooltip_center: 'Align Center.',
                    },
                    'fontSize': {
                        displayName: 'Font Size',
                        tooltip: 'Font size, in points.',
                    },
                    'lineHeight': {
                        displayName: 'Line Height',
                        tooltip: 'Line height, in points.',
                    },
                    'spacingX': {
                        displayName: 'Horizontal Spacing',
                        tooltip: 'The spacing between text characters, only available if bitmap font was used.',
                    },
                    'overflow': {
                        displayName: 'Overflow Processing',
                        tooltip: 'Text layout modes: <br> ' +
                            '1. CLAMP: Text nodes outside the bounding box will be truncated. <br> ' +
                            '2. SHRINK: Automatically shrink text box according to the constraint node. <br> ' +
                            '3. RESIZE: Automatically updates the Node based on height of the text.',
                    },
                    'enableWrapText': {
                        displayName: 'Auto Newline',
                        tooltip: 'Automatic newline.',
                    },
                    'useSystemFont': {
                        displayName: 'System Fonts',
                        tooltip: 'Whether to use system default fonts. ' +
                            '<br>The referenced font asset would be dereferenced once this option was checked.',
                    },
                    'fontFamily': {
                        displayName: 'Font Family',
                        tooltip: 'Font names.',
                    },
                    'font': {
                        displayName: 'Font',
                        tooltip: 'The font asset to use.',
                    },
                    'cacheMode': {
                        displayName: 'Cache Mode',
                        tooltip: 'Text cache modes：<br> ' +
                            '1. NONE: No cache，draw once. <br> ' +
                            '2. BITMAP: Text is added as a static image to the dynamic atlas for batch merging, but its content cannot be dynamically modified frequently. <br> ' +
                            '3. CHAR: Split the text into characters and cache the character texture into a character atlas for reuse, <br>' +
                                'which is suitable for text content with repeated character content and frequently updated.',
                    },
                    'isBold': {
                        displayName: 'Bold',
                        tooltip: 'Make words bold.',
                    },
                    'isItalic': {
                        displayName: 'Italic',
                        tooltip: 'Make words italic.',
                    },
                    'isUnderline': {
                        displayName: 'Underline',
                        tooltip: 'Underscore the words.',
                    },
                    'underlineHeight': {
                        displayName: 'Underline Height',
                        tooltip: 'The underline\'s height.',
                    },
                    'enableOutline': {
                        displayName: 'Enable Outline',
                        tooltip: 'Whether outline is enabled.',
                    },
                    'outlineColor': {
                        displayName: 'Outline Color',
                        tooltip: 'The color of outline.',
                    },
                    'outlineWidth': {
                        displayName: 'Outline Width',
                        tooltip: 'The width of outline',
                    },
                    'enableShadow': {
                        displayName: 'Enable Shadow',
                        tooltip: 'Whether shadow is enabled.',
                    },
                    'shadowColor': {
                        displayName: 'Enable Outline',
                        tooltip: 'The color of shadow.',
                    },
                    'shadowOffset': {
                        displayName: 'Shadow Offset',
                        tooltip: 'Offset between font and shadow.',
                    },
                    'shadowBlur': {
                        displayName: 'Shadow Blur',
                        tooltip: 'A non-negative float specifying the level of shadow blur.',
                    },
                },
            },
            'RichText': {
                properties: {
                    'string': {
                        displayName: 'string',
                        tooltip: 'Text of the RichText, you could use BBcode in the string.',
                    },
                    'horizontalAlign': {
                        displayName: 'Horizontal Alignment',
                        tooltip: 'Horizontal alignment mode.',
                        tooltip_left: 'Align Left.',
                        tooltip_right: 'Align Right.',
                        tooltip_center: 'Align Center.',
                    },
                    'verticalAlign': {
                        displayName: 'Vertical Alignment',
                        tooltip: 'Vertical alignment mode.',
                        tooltip_top: 'Align Top.',
                        tooltip_bottom: 'Align Bottom.',
                        tooltip_center: 'Align Center.',
                    },
                    'fontSize': {
                        displayName: 'Font Size',
                        tooltip: 'Font size, in points.',
                    },
                    'fontColor': {
                        displayName: 'Color',
                        tooltip: 'Default text color for rich text. ' +
                            '<br>It takes effect when the text content does not have a color parameter set. ' +
                            '<br>Color cascading is not supported yet.',
                    },
                    'fontFamily': {
                        displayName: 'Font Family',
                        tooltip: 'Font names.',
                    },
                    'font': {
                        displayName: 'Font',
                        tooltip: 'Custom TTF font of Rich Text.',
                    },
                    'useSystemFont': {
                        displayName: 'System Fonts',
                        tooltip: 'Whether to use system default fonts. ' +
                            '<br>The referenced font asset would be dereferenced once this option was checked.',
                    },
                    'cacheMode': {
                        displayName: 'Cache Mode',
                        tooltip: 'Text cache modes：<br> ' +
                            '1. NONE: No cache，draw once. <br> ' +
                            '2. BITMAP: Text is added as a static image to the dynamic atlas for batch merging, but its content cannot be dynamically modified frequently. <br> ' +
                            '3. CHAR: Split the text into characters and cache the character texture into a character atlas for reuse, <br>' +
                            'which is suitable for text content with repeated character content and frequently updated.',
                    },
                    'maxWidth': {
                        displayName: 'Max Width',
                        tooltip: 'The maximize width of RichText, pass 0 means not limit the maximize width.',
                    },
                    'lineHeight': {
                        displayName: 'Line Height',
                        tooltip: 'Line height, in points.',
                    },
                    'imageAtlas': {
                        displayName: 'Image Atlas',
                        tooltip: 'The image atlas for the img tag. ' +
                            '<br>For each src value in the img tag, ' +
                            '<br>there should be a valid sprite frame in the image atlas.',
                    },
                    'handleTouchEvent': {
                        displayName: 'Block input events',
                        tooltip: 'Once checked, the Rich Text will block all input events (mouse and touch) within the bounding box of the node, ' +
                            '<br>preventing the input from penetrating into the underlying node.',
                    },
                },
            },
            'Sprite': {
                properties: {
                    __extends__: 'classes.cc.UIRenderer.properties',
                    'grayscale': {
                        displayName: 'Grayscale',
                        tooltip: 'Whether turn on grayscale rendering mode.',
                    },
                    'spriteAtlas': {
                        displayName: 'Sprite Atlas',
                        tooltip: 'Atlas that the image belongs to.',
                    },
                    'sprite_frame': {
                        displayName: 'Sprite Frame',
                        tooltip: 'Sprite Frame image to use.',
                    },
                    'type': {
                        displayName: 'Type',
                        tooltip: 'Rendering mode:' +
                            '<br> - Simple: Modifying the size will stretch the image as a whole, which is suitable for sequence frame animation and normal images. <br>' +
                            '- Sliced: When changing the size, the four corners will not stretch, which is suitable for UI buttons and panel backgrounds. <br>' +
                            '- Tiled : When changing the size, the original size image will continue to be tiled. <br>' +
                            '- Filled : set a certain starting position and direction of filling, and the picture can be cropped and displayed at a certain ratio.',
                    },
                    'size_mode': {
                        displayName: 'Size Mode',
                        tooltip: 'Set the size of the node on which the Sprite component is on. ' +
                            '<br>CUSTOM for setting width and height manually;' +
                            '<br>TRIMMED to use image size with transparent pixels trimmed; ' +
                            '<br>RAW to use image size without trimming.',
                    },
                    'trim': {
                        displayName: 'Trim',
                        tooltip: "Whether to render transparent pixels around image in node's bounding box. " +
                            "<br>If you check this option the bounding box will not include transparent pixels around the image.",
                    },
                },
            },
        },
    },
};
