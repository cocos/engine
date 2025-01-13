'use strict';

const { PreviewControl, hideElement } = require("../utils/preview");

exports.template = /* html */`
<ui-section header="i18n:ENGINE.inspector.preview.header" class="preview-section config no-padding" expand>
    <div class="preview"></div>
</ui-section>
`;

exports.style = /* css */`
    .preview-section {
        margin-top: 0px;
    }
    .preview { }
`;

exports.$ = {
    container: '.preview',
};

const Elements = {
    preview: {
        ready(panel) {
            panel.preview.init();
        },
        async update(panel) {
            await panel.preview.callPreviewFunction('setPrefab', panel.asset.uuid);
        },
        close(panel) {},
    },
};

exports.methods = {};

exports.ready = function() {
    this.preview = new PreviewControl('scene:prefab-preview', 'query-prefab-preview-data', this.$.container);

    Object.values(Elements).forEach((element) => element.ready && element.ready(this));
};

exports.update = function(assetList, metaList) {
    this.assetList = assetList;
    this.metaList = metaList;
    this.asset = assetList[0];
    this.meta = metaList[0];

    // 如何多选就隐藏预览
    hideElement(this.$.container, assetList.length > 1);

    Object.values(Elements).forEach((element) => element.update && element.update(this));
};

exports.close = function() {
    this.preview.close();

    Object.values(Elements).forEach((element) => element.close && element.close(this));
};
