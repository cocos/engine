export default {
    layers: [{
        graph: {
            nodes: [{
                name: 'Node1',
                type: 'pose',
            }, {
                name: 'Node2',
                type: 'pose',
            }],
            entryTransitions: [{
                to: 0,
            }],
            transitions: [{
                from: 0,
                to: 1,
                condition: {
                    operator: 'BE_TRUE',
                    lhs: true,
                },
            }, {
                from: 1,
                to: 0,
                condition: {
                    operator: 'BE_TRUE',
                    lhs: true,
                },
            }],
        },
    }],
} as import('../../../cocos/core/animation/newgen-anim/__tmp__/graph-description').GraphDescription;