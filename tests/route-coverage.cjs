const Core=require('../nav-core.js');
global.window={};
require('../annotated-nav.js');
require('../room-guide-hints.js');
require('../data.js');
const D=window.CAMPUS_V6;

const roomBy=id=>D.rooms.find(r=>r.id===id)||null;
const posFor=r=>r?.pos||null;
const floorLabel=f=>f==='G'?'Ground Floor':f==='LG'?'Lower Ground':f==='1'?'First Floor':f==='2'?'Second Floor':f;
function floorCorridorNodes(bldg,floor){return (D.checkpoints||[]).filter(c=>c.type==='corridor'&&c.pos&&c.bldg===bldg&&c.floor===floor)}
function rankedRoomSectionPos(r){
 const nodes=floorCorridorNodes(r.bldg,r.floor);if(!nodes.length)return null;
 const rooms=D.rooms.filter(x=>x.bldg===r.bldg&&x.floor===r.floor).sort((a,b)=>a.id.localeCompare(b.id,undefined,{numeric:true,sensitivity:'base'}));
 const idx=Math.max(0,rooms.findIndex(x=>x.id===r.id)),frac=rooms.length>1?idx/(rooms.length-1):.5;
 const ys=nodes.map(n=>n.pos[0]),xs=nodes.map(n=>n.pos[1]),axis=(Math.max(...xs)-Math.min(...xs))>=(Math.max(...ys)-Math.min(...ys))?1:0;
 const ordered=[...nodes].sort((a,b)=>a.pos[axis]-b.pos[axis]);
 return ordered[Math.round(frac*(ordered.length-1))]?.pos||null
}
function roomGuidePos(r){return posFor(r)||D.roomGuideHints?.[r.id]||rankedRoomSectionPos(r)||null}
function checkpoints(){
 const merged=new Map();
 for(const c of D.checkpoints||[])merged.set(c.id,{...c});
 for(const r of D.rooms||[]){
  const exact=posFor(r),p=exact||roomGuidePos(r);if(!p)continue;
  const id=(exact?'ROOM_':'ROOM_GUIDE_')+r.id;
  if(!merged.has(id))merged.set(id,{id,name:exact?r.id+' doorway':r.id+' room section',type:exact?'room':'room-section',room:r.id,bldg:r.bldg,floor:r.floor,pos:p,verified:!!exact,source:exact?'room-door':'room-guide-section',estimated:!exact});
 }
 return [...merged.values()]
}
function generatedConnectorEdges(cps){
 const corr=cps.filter(c=>c.type==='corridor'&&c.pos),out=[];
 for(const c of cps){
  if(!c.pos||c.type==='corridor')continue;let best=null,bd=Infinity;
  for(const n of corr){if(n.bldg!==c.bldg||n.floor!==c.floor)continue;const d=Math.hypot(n.pos[0]-c.pos[0],n.pos[1]-c.pos[1]);if(d<bd){bd=d;best=n}}
  const limit=c.type==='room-section'?150:115;
  if(best&&bd<=limit)out.push({from:c.id,to:best.id,mode:c.type==='room'?'doorway':'corridor',access:'public',stepFree:true,source:c.type==='room-section'?'room-section-snap':'auto-snap',weight:Math.max(1,bd)})
 }
 return out
}
function graphStitchEdges(cps){
 const corr=(D.checkpoints||[]).filter(c=>c.type==='corridor'&&c.pos),base=D.edges||[],degree=new Map(corr.map(c=>[c.id,0]));
 for(const e of base){if(degree.has(e.from))degree.set(e.from,degree.get(e.from)+1);if(degree.has(e.to))degree.set(e.to,degree.get(e.to)+1)}
 const ends=corr.filter(c=>(degree.get(c.id)||0)<=1),out=[],seen=new Set();
 for(let i=0;i<ends.length;i++)for(let j=i+1;j<ends.length;j++){
  const a=ends[i],b=ends[j];if(a.floor!==b.floor)continue;
  const d=Math.hypot(a.pos[0]-b.pos[0],a.pos[1]-b.pos[1]);if(d>28)continue;
  const key=[a.id,b.id].sort().join('|');if(seen.has(key))continue;seen.add(key);
  out.push({from:a.id,to:b.id,mode:'corridor',access:'public',stepFree:true,source:'stitch',weight:Math.max(1,d)})
 }
 return out
}
const cps=checkpoints(),edges=[...(D.edges||[]),...generatedConnectorEdges(cps),...graphStitchEdges(cps)];
const roomNodeIds=r=>cps.filter(c=>c.room===r.id).map(c=>c.id);
function route(a,b,stepFree=false){
 const startIds=roomNodeIds(a),endIds=roomNodeIds(b);if(!startIds.length||!endIds.length)return null;
 return Core.shortestPath({checkpoints:cps,edges,startIds,endIds,options:{profile:'student',stepFree}})
}
const floorGroups=new Map();
for(const r of D.rooms){const k=r.bldg+'|'+r.floor;if(!floorGroups.has(k))floorGroups.set(k,[]);floorGroups.get(k).push(r)}
const reps=[...floorGroups.entries()].map(([key,rooms])=>({key,room:rooms.find(r=>roomGuidePos(r))||rooms[0]})).filter(x=>roomGuidePos(x.room));
const anchor=roomBy('B007')||reps[0]?.room;
const reach=reps.map(x=>({key:x.key,room:x.room.id,route:route(anchor,x.room,false),stepFree:route(anchor,x.room,true)}));
const generalReach=reach.filter(x=>x.route).length,stepReach=reach.filter(x=>x.stepFree).length;
console.log('=== Campus Navigator route coverage audit ===');
console.log('Anchor:',anchor.id,anchor.bldg,floorLabel(anchor.floor));
console.log('Floor representatives:',reps.length);
console.log('General reachable floors:',generalReach+'/'+reps.length);
console.log('Step-free reachable floors:',stepReach+'/'+reps.length);
console.log('\nUnreachable floor representatives from '+anchor.id+':');
for(const x of reach.filter(x=>!x.route))console.log(' -',x.key,'via',x.room);
console.log('\nReachable but not step-free from '+anchor.id+':');
for(const x of reach.filter(x=>x.route&&!x.stepFree))console.log(' -',x.key,'via',x.room);
console.log('\nReachable floor routes:');
for(const x of reach.filter(x=>x.route)){
 const modes=[...new Set(x.route.segments.map(s=>s.edge.mode||'corridor'))].join(',');
 console.log(' -',x.key,'via',x.room,'nodes='+x.route.nodes.length,'modes='+modes,'stepFree='+(!!x.stepFree));
}
let pairs=0,ok=0,sf=0;
for(let i=0;i<reps.length;i++)for(let j=i+1;j<reps.length;j++){pairs++;const p=route(reps[i].room,reps[j].room,false);if(p)ok++;if(route(reps[i].room,reps[j].room,true))sf++}
console.log('\nFloor-pair connectivity:',ok+'/'+pairs,'general;',sf+'/'+pairs,'step-free');

// Candidate joins between disconnected corridor components on the same level.
// These are diagnostics only; they are not automatically added to routing.
const corridor=(D.checkpoints||[]).filter(x=>x.type==='corridor'&&x.pos);
const corridorIds=new Set(corridor.map(x=>x.id));
const adj=new Map(corridor.map(x=>[x.id,new Set()]));
for(const e of edges){
 if(corridorIds.has(e.from)&&corridorIds.has(e.to)){adj.get(e.from).add(e.to);if(!e.oneWay)adj.get(e.to).add(e.from)}
}
const component=new Map();let ci=0;
for(const n of corridor){
 if(component.has(n.id))continue;const stack=[n.id];component.set(n.id,ci);
 while(stack.length){const id=stack.pop();for(const nb of adj.get(id)||[]){if(!component.has(nb)){component.set(nb,ci);stack.push(nb)}}}
 ci++;
}
const deg=id=>(adj.get(id)?.size||0);
const endNodes=corridor.filter(x=>deg(x.id)<=1);
const candidates=[];
for(let i=0;i<endNodes.length;i++)for(let j=i+1;j<endNodes.length;j++){
 const a=endNodes[i],b=endNodes[j];if(a.floor!==b.floor||component.get(a.id)===component.get(b.id))continue;
 const dist=Core.distance(a.pos,b.pos);if(dist<=180)candidates.push({a,b,dist});
}
candidates.sort((x,y)=>x.dist-y.dist);
console.log('\nNearest disconnected corridor-end candidates AFTER runtime stitching (diagnostic only):');
for(const x of candidates.slice(0,40))console.log(
 ' -',x.dist.toFixed(1)+'px',x.a.id,'['+x.a.bldg+' '+x.a.floor+']',JSON.stringify(x.a.pos),
 '<->',x.b.id,'['+x.b.bldg+' '+x.b.floor+']',JSON.stringify(x.b.pos)
);

function hypotheticalEdges(limit){
 const base=[...edges],components=new Map(component);
 for(const x of candidates){if(x.dist>limit)break;base.push({from:x.a.id,to:x.b.id,mode:'corridor',access:'public',stepFree:true,source:'hypothetical-stitch',weight:Math.max(1,x.dist)})}
 return base
}
function routeWithEdges(a,b,edgeSet,stepFree=false){
 const startIds=roomNodeIds(a),endIds=roomNodeIds(b);if(!startIds.length||!endIds.length)return null;
 return Core.shortestPath({checkpoints:cps,edges:edgeSet,startIds,endIds,options:{profile:'student',stepFree}})
}
console.log('\nMinimum corridor-node distances between building graphs on the same level:');
const groups=new Map();
for(const n of corridor){const k=n.bldg+'|'+n.floor;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(n)}
const gkeys=[...groups.keys()];
const cross=[];
for(let i=0;i<gkeys.length;i++)for(let j=i+1;j<gkeys.length;j++){
 const [ba,fa]=gkeys[i].split('|'),[bb,fb]=gkeys[j].split('|');if(fa!==fb||ba===bb)continue;
 let best=null,bd=Infinity;
 for(const a of groups.get(gkeys[i]))for(const b of groups.get(gkeys[j])){const d=Core.distance(a.pos,b.pos);if(d<bd){bd=d;best={a,b}}}
 if(best)cross.push({ka:gkeys[i],kb:gkeys[j],d:bd,...best})
}
cross.sort((a,b)=>a.d-b.d);
for(const x of cross.slice(0,40))console.log(' -',x.d.toFixed(1)+'px',x.ka,x.a.id,JSON.stringify(x.a.pos),'<->',x.kb,x.b.id,JSON.stringify(x.b.pos));

console.log('\nHypothetical same-floor stitch impact:');
for(const limit of [40,50,65,90,120,180]){
 const es=hypotheticalEdges(limit);let reachN=0,pairN=0;
 for(const x of reps)if(routeWithEdges(anchor,x.room,es,false))reachN++;
 for(let i=0;i<reps.length;i++)for(let j=i+1;j<reps.length;j++)if(routeWithEdges(reps[i].room,reps[j].room,es,false))pairN++;
 console.log(' - <= '+limit+'px: anchor floors '+reachN+'/'+reps.length+'; floor pairs '+pairN+'/'+pairs);
}
process.exitCode=0;
