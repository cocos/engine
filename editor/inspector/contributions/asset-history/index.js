'use strict';

const HistoryManagerBase = require('./history-manager-base');
const SnapshotCommand = require('./snapshot-command');

class AssetHistoryManager extends HistoryManagerBase {
    lastRecord = {
        uuidListStr: '',
        metaListStr:'',
        renderDataStr: '',
    };

    constructor() {
        super();
    }

    async snapshot(panel) {
        // 避免连续 change 产生大量的快照
        clearTimeout(this.timeId);
        this.timeId = setTimeout(() => {
            this.record(panel);
        }, 200);
    }

    async record(panel) {
        const record = await panel.record();

        if (this.lastRecord.uuidListStr === record.uuidListStr) {
            // 数据没变化
            const metaChanged = this.lastRecord.metaListStr !== record.metaListStr;
            const renderChanged = this.lastRecord.renderDataStr !== record.renderDataStr;
            if (!metaChanged && !renderChanged) {
                return;
            }

            const undoData = Object.assign({}, this.lastRecord);

            Object.assign(this.lastRecord, record);

            const redoData = Object.assign({}, this.lastRecord);

            const command = new AssetHistoryCommand(undoData, redoData);
            command.panel = panel;
            command.manager = this;
            this.push(command);
        } else {
            Object.assign(this.lastRecord, record);

            this.rebase();
        }
    }

    async undo() {
        await super.undo();
    }

    async redo() {
        await super.redo();
    }
}
class AssetHistoryCommand extends SnapshotCommand {
    async execute(record) {
        if (this.panel) {
            const success = this.panel.restore(record);

            if (success) {
                this.manager.lastRecord = record;
            }
        }
    }
}

module.exports = AssetHistoryManager;
