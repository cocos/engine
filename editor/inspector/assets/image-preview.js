'use strict';

exports.template = /* html */`
<ui-section header="i18n:ENGINE.inspector.preview.header" class="preview-section config no-padding" expand>
    <div class="image-preview">
        <div class="image-content">
            <ui-asset-image class="image" size="origin"></ui-asset-image>
        </div>
        <div class="label">
            <span class="size"></span>
        </div>
    </div>
</ui-section>
`;

exports.style = /* css */`
    .preview-section {
        margin-top: 0px;
    }
    .image-preview {
        position: relative;
        display: flex;
    }
    .image-preview > .image-content {
        height: var(--inspector-footer-preview-height, 200px);
        background: var(--color-normal-fill-emphasis);
        box-sizing: border-box;
    }
    
    .image-preview > .image {
        width: 100%;
        height: 100%;
    }
    .image-preview > .label {
        position: absolute;
        width: 100%;
        left: 0;
        bottom: 0;
        text-align: center;
    }
    .image-preview > .label > .size {
        font-size: 10px;
        padding: 2px 8px;
        background-color: var(--color-primary-fill);
        color: var(--color-primary-contrast-weakest);
        border-radius: calc(var(--size-normal-radius) * 1px);
    }
    .image-preview > .label > .size:empty {
        display: none;
    }
`;

exports.$ = {
    container: '.image-preview',
    image: '.image',
    size: '.size',
};

/**
 * attribute corresponds to the edit element
 */
const Elements = {
    image: {
        ready() {
            const $uiImg = this.$.image.$uiImage;
            $uiImg.setAttribute('show-alpha', true);

            const $img = $uiImg.$img;
            $img.addEventListener('load', () => {
                this.$.size.innerHTML = `${$img.naturalWidth} x ${$img.naturalHeight}`;
            });
        },
        update() {
            const panel = this;
            panel.$.image.value = panel.asset.uuid;
            this.$.size.innerHTML = '';


        },
    },
};

exports.ready = function() {
    for (const prop in Elements) {
        const element = Elements[prop];
        if (element.ready) {
            element.ready.call(this);
        }
    }
};

exports.update = function(assetList, metaList) {
    this.assetList = assetList;
    this.metaList = metaList;
    this.asset = assetList[0];
    this.meta = metaList[0];

    // 如何多选就隐藏预览
    if (assetList.length > 1) {
        this.$.container.style.display = 'none';
    } else {
        this.$.container.style.display = 'block';
    }

    for (const prop in Elements) {
        const element = Elements[prop];
        if (element.update) {
            element.update.call(this);
        }
    }
};
