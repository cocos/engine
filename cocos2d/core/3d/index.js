
if (!CC_TEST && (!CC_EDITOR || !Editor.isMainProcess)) {
    require('./primitive');
    require('./physics/exports/physics-builtin');
    require('./physics/exports/physics-framework');
}

require('./CCModel');
require('./skeleton/CCSkeleton');
require('./skeleton/CCSkeletonAnimationClip');
require('./actions');

if (!CC_EDITOR || !Editor.isMainProcess) {
    require('./skeleton/CCSkeletonAnimation');
    require('./skeleton/CCSkinnedMeshRenderer');
    require('./skeleton/skinned-mesh-renderer');
    require('./CCLightComponent');
}
