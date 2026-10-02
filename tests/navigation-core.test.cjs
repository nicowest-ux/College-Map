const assert=require('assert');
const N=require('../nav-core.js');
const cps=[
 {id:'A',pos:[0,0]},{id:'B',pos:[0,10]},{id:'C',pos:[0,20]},{id:'D',pos:[10,10]}
];

let p=N.shortestPath({checkpoints:cps,edges:[
 {from:'A',to:'B',weight:1,stepFree:true,access:'public'},
 {from:'B',to:'C',weight:1,stepFree:true,access:'public'},
 {from:'A',to:'D',weight:1,stepFree:true,access:'staff'},
 {from:'D',to:'C',weight:.2,stepFree:true,access:'staff'}
],startIds:['A'],endIds:['C'],options:{profile:'student'}});
assert.deepStrictEqual(p.nodes,['A','B','C'],'student route must avoid staff-only shortcut');

p=N.shortestPath({checkpoints:cps,edges:[
 {from:'A',to:'B',weight:1,access:'public'},
 {from:'B',to:'C',weight:1,stepFree:true,access:'public'}
],startIds:['A'],endIds:['C'],options:{profile:'student',stepFree:true}});
assert.strictEqual(p,null,'step-free routing must reject links that are not explicitly verified step-free');

p=N.shortestPath({checkpoints:cps,edges:[
 {from:'A',to:'B',weight:1,stepFree:true,closed:true},
 {from:'A',to:'D',weight:2,stepFree:true},
 {from:'D',to:'B',weight:2,stepFree:true}
],startIds:['A'],endIds:['B'],options:{stepFree:true}});
assert.deepStrictEqual(p.nodes,['A','D','B'],'closed links must never be routed');

p=N.shortestPath({checkpoints:cps,edges:[
 {from:'A',to:'B',weight:1,oneWay:true},
],startIds:['B'],endIds:['A'],options:{}});
assert.strictEqual(p,null,'one-way links must not route backwards');

p=N.shortestPath({checkpoints:cps,edges:[
 {from:'A',to:'B',weight:1,instruction:'Go to B',reverseInstruction:'Return to A'}
],startIds:['B'],endIds:['A'],options:{}});
assert.strictEqual(p.segments[0].edge.instruction,'Return to A','reverse instruction should be used when traversing backwards');

const t=N.turn([10,0],[0,0],[0,10]);
assert.strictEqual(t.action,'right');

console.log('navigation core tests passed');
// camera-guide heading helpers and edge metadata
assert.strictEqual(N.normAngle(-10),350);
assert.strictEqual(N.angleDelta(350,10),20);
assert.strictEqual(N.angleDelta(10,350),-20);
const modePath=N.shortestPath({checkpoints:cps,edges:[{from:'A',to:'B',weight:1,stepFree:true,mode:'lift',meters:6}],startIds:['A'],endIds:['B'],options:{}});
const modeSteps=N.pathSteps(modePath,cps);
assert.strictEqual(modeSteps[0].mode,'lift');
assert.strictEqual(modeSteps[0].meters,6);
console.log('camera-guide heading helpers passed');
