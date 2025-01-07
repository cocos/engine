'use strict';

const { readJSONSync } = require('fs-extra');

exports.template = /* html */`
<section class="spine-data">
    <ui-section class="atlas-section" expand>
        <ui-prop slot="header">
            <ui-label slot="label" value="i18n:ENGINE.assets.spine_data.atlas"></ui-label>
            <ui-asset slot="content" class="atlas" droppable="cc.Asset" @confirm.stop></ui-asset>
        </ui-prop>
        <div class="textures"></div>
    </ui-section>
</section>`;

exports.$ = {
    container: '.spine-data',
    atlasSection: '.atlas-section',
    atlas: '.atlas',
    textures: '.textures',
};

exports.style = `
.spine-data {
    padding-right: 4px;
}

.spine-data > .atlas-section [slot="header"] {
    width: 100%;
    display: block;
}

.spine-data > .atlas-section[whole] {
    padding-left: 20px;
}

.spine-data > .atlas-section > .textures > {}
.spine-data > .atlas-section > .textures > .texture-item {
    margin-left: 4px;
}
`;

exports.ready = function() {
    const panel = this;

    function setAtlas(value) {
        panel.metaList.forEach((meta) => {
            meta.userData.atlasUuid = value;
        });
        panel.dispatch('change');
        panel.dispatch('snapshot');
    }

    panel.$.atlas.addEventListener('confirm', async (event) => {
        const atlas = event.target.value;
        if (!atlas) {
            setAtlas(atlas);
            return;
        }

        const assetInfo = await Editor.Message.request('asset-db', 'query-asset-info', atlas);
        if (!assetInfo) {
            panel.$.atlas.setAttribute('value', '');
            return;
        }

        if (!assetInfo.source.endsWith('.atlas')) {
            await Editor.Dialog.warn(Editor.I18n.t('ENGINE.assets.spine_data.atlas_warn'), {
                buttons: [
                    Editor.I18n.t('ENGINE.dialog.confirm'),
                ],
            });
            panel.$.atlas.setAttribute('value', '');
            return;
        }

        setAtlas(atlas);
    });
};

exports.update = function(assetList, metaList) {
    const panel = this;

    panel.assetList = assetList;
    panel.metaList = metaList;
    panel.asset = assetList[0];
    panel.meta = metaList[0];

    while (panel.$.textures.firstChild) {
        panel.$.textures.removeChild(panel.$.textures.firstChild);
    }

    // 先隐藏箭头，等有数值才显示
    panel.$.atlasSection.setAttribute('whole', '');

    const libraryJSON = panel.asset.library['.json'];
    if (libraryJSON) {
        const spData = readJSONSync(libraryJSON);
        if (spData && spData.textures && spData.textures.length > 0) {
            createTextureSection(spData.textures, panel.$.textures);
        }
    }
    // 只允许显示 .atlas 的资源
    panel.$.atlas.setAttribute('filter', JSON.stringify({
        pattern: 'db://**/*.atlas',
    }));
    panel.$.atlas.setAttribute('value', panel.meta.userData.atlasUuid);
};

function createTextureSection(textures, parentElement) {
    for (let i = 0; i < textures.length; i++) {
        const texture = textures[i];
        let item = parentElement.querySelector('.texture-item');
        let uiAsset = item && item.querySelector('.ui-asset');
        if (!uiAsset) {
            item = document.createElement('ui-prop');
            item.classList.add('texture-item');
            item.setAttribute('readonly', '');
            parentElement.appendChild(item);

            let type = texture.__expectedType__.split('cc.');
            type = type.length > 0 ? type[1] : type[0];

            const label = document.createElement('ui-label');
            label.setAttribute('slot', 'label');
            label.setAttribute('value', i);
            item.appendChild(label);

            uiAsset = document.createElement('ui-asset');
            uiAsset.setAttribute('slot', 'content');
            item.appendChild(uiAsset);
        }
        uiAsset.setAttribute('readonly', '');
        uiAsset.setAttribute('value', texture.__uuid__);
        uiAsset.setAttribute('droppable', texture.__expectedType__);
    }
}
