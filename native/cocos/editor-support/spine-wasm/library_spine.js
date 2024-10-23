mergeInto(LibraryManager.library, {
    spineListenerCallBackFromJS: function () {
        var wasmUtil = Module['SpineWasmUtil'];
        var listenerID = wasmUtil.getCurrentListenerID();
        var trackEntry = wasmUtil.getCurrentTrackEntry();
        var event = wasmUtil.getCurrentEvent();
        var eventType = wasmUtil.getCurrentEventType();
        globalThis.TrackEntryListeners.emitListener(listenerID, trackEntry, event, eventType);
    },

    spineTrackListenerCallback: function() {
        var wasmUtil = Module['SpineWasmUtil'];
        var listenerID = wasmUtil.getCurrentListenerID();
        var eventType = wasmUtil.getCurrentEventType();
        var trackEntry = wasmUtil.getCurrentTrackEntry();
        var event = wasmUtil.getCurrentEvent();
        globalThis.TrackEntryListeners.emitTrackEntryListener(listenerID, trackEntry, event, eventType);
    }
});
