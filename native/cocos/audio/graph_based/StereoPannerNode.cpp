#include "audio/graph_based/StereoPannerNode.h"
#include "LabSound/core/StereoPannerNode.h"
namespace cc {
StereoPannerNode::StereoPannerNode(BaseAudioContext* ctx, const StereoPannerOptions& options) : AudioNode(ctx) {
    _node = std::make_shared<lab::StereoPannerNode>(*ctx->getInnerContext());
    _pan = std::shared_ptr<AudioParam>(AudioParam::createParam( std::dynamic_pointer_cast<lab::StereoPannerNode>(_node)->pan().get()));
    if (options.pan) {
        _pan->setValue(options.pan);
    }
}
AudioParam* StereoPannerNode::pan() {
    return _pan.get();
}
}
