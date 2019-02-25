largeModule('Tween', SetupEngine);

var tween = cc.tween;
// init a new node
function initNode (name) {
    var node = new cc.Node();
    node.name = name;
    node.position = cc.v2(0, 0);
    node.scale = 1;
    node.anchorX = 0.5;
    node.anchorY = 0.5;
    node.width = 100;
    node.height = 100;
    node.rotation = 0;
    return node;
}

asyncTest('basic test', function () {
    cc.game.resume();
    var node1 = initNode('node1');
    tween(node1)
      .to(1, { scale: 2 })
      .call(function () {
        strictEqual(node1.scale, 2, 'tween to scale');
      })
      .by(1, { scale: 2 })
      .call(function () {
        strictEqual(node1.scale, 4, 'tween by scale');
        start();
      })
      .start();

    var obj = { a: 0 };
    tween(obj)
      .to(0.5, { a: 100 })
      .call(function () {
        strictEqual(obj.a, 100, 'Object propertype test');
      })
      .start();
    
    var node2 = initNode('node2');
    var node3 = initNode('node3');
    let count = 0;
    function check () {
      if (node2.scale !== 1 && node3.scale !== 1) {
          count++;
          if (count === 2) {
            strictEqual(node2.scale, 2, 'run tween on different target: node2');
            strictEqual(node3.scale, 2, 'run tween on different target: node3');
          }
      }
    }
    var tmpTween = tween()
                    .to(0.5, { scale: 2 })
                    .call(check);
    // run tween on different target
    tmpTween.clone(node2).start();
    tmpTween.clone(node3).start();
});

asyncTest('ease test', function () {
    cc.game.resume();
    // builtin easing
    var node = initNode('easeNode');
    tween(node).to(0.1, { scale: 2 }, { easing: 'sineOutIn' })
               .call(function () { 
                 strictEqual(node.scale, 2, 'easeing can set value');
              })
               .start();

    node.scale = 1;
    // custom easing
    tween(node).to(0.1, { scale: 2 }, { easing: function (t) { return t * t; }})
               .call(function () { 
                 strictEqual(node.scale, 2, 'easeing can set calculation equation.');
                })
               .start();
    
    node.scale = 1;
    // easing to single property
    tween(node).to(0.5, { scale: 2, position: { value: cc.v2(100, 100), easing: 'sineOutIn' } })
               .call(function () {
                    strictEqual(node.scale, 2, 'easeing can set multiple value: scale');
                    deepEqual(node.position, cc.v2(100, 100), 'easeing can set multiple value: position');
                    start();
               })
               .start();
});
 
asyncTest('progress test', function () {
  cc.game.resume();
    var node = initNode('progressNode');
    // custom property progress 
    tween(node).to(0.1, { scale: 2 }, {
        progress: function (start, end, current, t) {
            return start + (end - start) * t;
        }
    })
    .call(function () { strictEqual(node.scale, 2, 'tween can set progress property'); })
    .start();
    // custom property progress to single property
    node.scale = 1;
    tween(node).to(0.5, { 
        scale: 2, 
        position: {
          value: cc.v2(100, 100),
          progress: function (start, end, current, t) { 
            return start.lerp(end, t, current); 
          }
        }
      })
      .call(function () {
        strictEqual(node.scale, 2, 'custom property progress: scale not setting');
        deepEqual(node.position, cc.v2(100, 100), 'custom property progress to single property: position');
        start();
      })
      .start();
});

asyncTest('reuse test', function () {
    cc.game.resume();
    var scale = tween().to(0.5, { scale: 2 });
    var angle = tween().to(0.5, { rotation: 90 });
    var position = tween().to(0.5, { position: cc.v2(100, 100) });
    
    var node = initNode('reuseNode');
    tween(node).then(scale).then(angle).then(position)
                        .call(function () { 
                          strictEqual(node.scale, 2, 'reuse check: scale');
                          strictEqual(node.rotation, 90, 'reuse check: rotation');
                          deepEqual(node.position, cc.v2(100, 100), 'reuse check: postion'); 
                          start(); 
                        })
                        .start();
});