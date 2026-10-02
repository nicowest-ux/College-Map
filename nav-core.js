(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.CampusNavCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const normAngle=a=>((a%360)+360)%360;
  const angleDelta=(a,b)=>{let d=normAngle(b)-normAngle(a);if(d>180)d-=360;if(d<-180)d+=360;return d};

  function distance(a,b){
    if(!a||!b)return null;
    return Math.hypot(a[0]-b[0],a[1]-b[1]);
  }

  function bearing(a,b){
    if(!a||!b)return null;
    const dy=-(b[0]-a[0]),dx=b[1]-a[1];
    return normAngle(Math.atan2(dx,dy)*180/Math.PI);
  }

  function turn(prev,at,next){
    const a=bearing(prev,at),b=bearing(at,next);
    if(a==null||b==null)return {action:'continue',icon:'↑',delta:null,label:'Continue'};
    const d=angleDelta(a,b),ad=Math.abs(d);
    if(ad<22)return {action:'continue',icon:'↑',delta:d,label:'Continue straight'};
    if(ad<55)return d<0?{action:'slight-left',icon:'↖',delta:d,label:'Keep left'}:{action:'slight-right',icon:'↗',delta:d,label:'Keep right'};
    if(ad<135)return d<0?{action:'left',icon:'↰',delta:d,label:'Turn left'}:{action:'right',icon:'↱',delta:d,label:'Turn right'};
    return {action:'uturn',icon:'↶',delta:d,label:'Turn around'};
  }

  function edgeAllowed(edge,options={}){
    if(!edge||edge.closed===true||edge.enabled===false)return false;
    const profile=options.profile||'student';
    if(edge.access==='staff'&&profile!=='staff')return false;
    if(edge.access==='student'&&profile==='visitor')return false;
    if(options.stepFree===true&&edge.mode==='stairs')return false;
    if(options.stepFree===true&&edge.stepFree!==true)return false;
    return true;
  }

  function edgeCost(edge,from,to){
    if(Number.isFinite(+edge.seconds)&&+edge.seconds>0)return +edge.seconds;
    if(Number.isFinite(+edge.weight)&&+edge.weight>0)return +edge.weight;
    if(Number.isFinite(+edge.meters)&&+edge.meters>0)return +edge.meters;
    const d=distance(from?.pos,to?.pos);
    return d==null?100:d;
  }

  function makeArc(edge,from,to,reversed){
    const instruction=reversed?(edge.reverseInstruction||edge.instruction):edge.instruction;
    return {
      to:to.id,
      edge:{...edge,instruction:instruction||'',_reversed:!!reversed},
      cost:edgeCost(edge,from,to)
    };
  }

  function shortestPath({checkpoints=[],edges=[],startIds=[],endIds=[],options={}}={}){
    const byId=new Map(checkpoints.filter(Boolean).map(c=>[c.id,c]));
    const starts=[...new Set(startIds)].filter(id=>byId.has(id));
    const ends=new Set([...new Set(endIds)].filter(id=>byId.has(id)));
    if(!starts.length||!ends.size)return null;

    const adj=new Map();
    const add=(from,arc)=>{if(!adj.has(from))adj.set(from,[]);adj.get(from).push(arc)};
    for(const edge of edges){
      if(!edgeAllowed(edge,options))continue;
      const from=byId.get(edge.from),to=byId.get(edge.to);
      if(!from||!to)continue;
      add(from.id,makeArc(edge,from,to,false));
      if(edge.oneWay!==true)add(to.id,makeArc(edge,to,from,true));
    }

    const dist=new Map(),prev=new Map(),open=new Set();
    for(const id of starts){dist.set(id,0);open.add(id)}
    let target=null;
    while(open.size){
      let u=null,best=Infinity;
      for(const id of open){const d=dist.get(id)??Infinity;if(d<best){best=d;u=id}}
      open.delete(u);
      if(ends.has(u)){target=u;break}
      for(const arc of adj.get(u)||[]){
        const nd=best+arc.cost;
        if(nd<(dist.get(arc.to)??Infinity)){
          dist.set(arc.to,nd);
          prev.set(arc.to,{from:u,arc});
          open.add(arc.to);
        }
      }
    }
    if(!target)return null;

    const segments=[];let cur=target;
    while(prev.has(cur)){
      const p=prev.get(cur);
      segments.unshift({from:p.from,to:cur,edge:p.arc.edge,cost:p.arc.cost});
      cur=p.from;
    }
    const nodes=[cur,...segments.map(s=>s.to)];
    return {segments,nodes,cost:dist.get(target)||0,startId:cur,endId:target};
  }

  function pathSteps(path,checkpoints=[]){
    if(!path)return [];
    const byId=new Map(checkpoints.map(c=>[c.id,c]));
    return path.segments.map((seg,i)=>{
      const from=byId.get(seg.from),to=byId.get(seg.to);
      const prev=i?byId.get(path.segments[i-1].from):null;
      const next=i+1<path.segments.length?byId.get(path.segments[i+1].to):null;
      const derived=prev&&from&&to?turn(prev.pos,from.pos,to.pos):{action:'continue',icon:'↑',label:'Continue'};
      const isLast=i===path.segments.length-1;
      return {
        action:isLast?'arrive':derived.action,
        icon:isLast?'✓':derived.icon,
        text:seg.edge.instruction||`${isLast?'Arrive at':'Continue to'} ${to?.name||seg.to}.`,
        anchor:seg.to,
        fromAnchor:seg.from,
        confirm:to?`Look for ${to.name}.`:'',
        access:seg.edge.access||'public',
        stepFree:seg.edge.stepFree===true,
        closed:seg.edge.closed===true,
        seconds:Number.isFinite(+seg.edge.seconds)?+seg.edge.seconds:null,
        meters:Number.isFinite(+seg.edge.meters)?+seg.edge.meters:null,
        mode:seg.edge.mode||null,
        geometry:!!(from?.pos&&to?.pos),
        nextAnchor:next?.id||null
      };
    });
  }

  function compactPathSteps(path,checkpoints=[],options={}){
    if(!path||!path.segments?.length)return [];
    const byId=new Map(checkpoints.map(c=>[c.id,c]));
    const keep=[];
    for(let i=0;i<path.segments.length;i++){
      const seg=path.segments[i],from=byId.get(seg.from),to=byId.get(seg.to);
      const prev=i?byId.get(path.segments[i-1].from):null;
      const derived=prev&&from&&to?turn(prev.pos,from.pos,to.pos):{action:'continue',icon:'↑',delta:0,label:'Continue straight'};
      const edgeMode=seg.edge.mode||'corridor';
      const toType=to?.type||'';
      const explicit=!!seg.edge.instruction;
      const special=edgeMode==='stairs'||edgeMode==='lift'||edgeMode==='outside'||edgeMode==='doorway'||(toType&&toType!=='corridor'&&toType!=='room-section');
      const significantTurn=Math.abs(derived.delta||0)>=28;
      const last=i===path.segments.length-1;
      const first=i===0;
      if(first||last||explicit||special||significantTurn)keep.push({i,seg,from,to,derived,last});
    }
    const out=[];
    for(let k=0;k<keep.length;k++){
      const item=keep[k],{i,seg,from,to,derived,last}=item;
      const mode=seg.edge.mode||'corridor';
      let action=last?'arrive':derived.action,icon=last?'✓':derived.icon,text='';
      if(seg.edge.instruction)text=seg.edge.instruction;
      else if(mode==='lift'){action='lift';icon='↕';text='Take the lift'+(to?.floor?' to '+(options.floorLabel?options.floorLabel(to.floor):to.floor):'')+'.'}
      else if(mode==='stairs'){action='stairs';icon='⇅';text='Take the stairs'+(to?.floor?' to '+(options.floorLabel?options.floorLabel(to.floor):to.floor):'')+'.'}
      else if(mode==='outside'){text=(derived.label||'Continue')+' along the outdoor route.'}
      else if(mode==='doorway'){text=(from?.room?('Leave '+from.room):'Leave your starting point')+' and join the corridor.'}
      else if(last){text='Arrive at '+(options.targetLabel||to?.name||seg.to)+'.'}
      else {
        const destName=to&&to.type!=='corridor'&&to.type!=='room-section'&&to.name?to.name:null;
        text=(derived.label||'Continue straight')+(destName?' toward '+destName:' along the corridor')+'.';
      }
      const fromIndex=k?keep[k-1].i+1:0;
      let meters=0,seconds=0,hasMeters=true,hasSeconds=true;
      for(let j=fromIndex;j<=i;j++){
        const e=path.segments[j]?.edge||{};
        if(Number.isFinite(+e.meters))meters+=+e.meters;else hasMeters=false;
        if(Number.isFinite(+e.seconds))seconds+=+e.seconds;else hasSeconds=false;
      }
      out.push({
        action,icon,text,anchor:seg.to,fromAnchor:path.segments[fromIndex]?.from||seg.from,
        confirm:to&&to.type!=='corridor'&&to.type!=='room-section'?('Look for '+to.name+'.'):'',
        access:seg.edge.access||'public',stepFree:seg.edge.stepFree===true,closed:seg.edge.closed===true,
        seconds:hasSeconds?seconds:null,meters:hasMeters?meters:null,mode,geometry:!!(from?.pos&&to?.pos),
        nextAnchor:null,segmentIndex:i,fromSegmentIndex:fromIndex
      });
    }
    for(let i=0;i<out.length-1;i++)out[i].nextAnchor=out[i+1].anchor;
    return out;
  }

  function routeQuality(route){
    if(!route)return {level:'none',label:'No route',detail:'No route could be built.'};
    if(route.precision==='survey graph')return {level:'high',label:'Turn-by-turn route ready',detail:'Follows the mapped corridor network and any required floor changes.'};
    if(route.precision==='guided room section')return {level:'good',label:'Turn-by-turn route ready',detail:'Follows the mapped corridor network. The final doorway position is approximate until that door is surveyed.'};
    if(route.precision==='verified landmark route')return {level:'good',label:'Landmark guided',detail:'The route is confirmed by named landmarks; some anchor coordinates are still being surveyed.'};
    if(route.precision==='floor-level guidance')return {level:'limited',label:'Partial route data',detail:'Part of this journey still needs a mapped corridor connection.'};
    return {level:'limited',label:'Route data incomplete',detail:'A complete walkable route cannot yet be calculated from the confirmed position.'};
  }

  function pathMetrics(path){
    if(!path)return {steps:0,seconds:null,meters:null,geometryLegs:0};
    let seconds=0,meters=0,hasSeconds=true,hasMeters=true,geometryLegs=0;
    for(const s of path.segments){
      if(Number.isFinite(+s.edge.seconds))seconds+=+s.edge.seconds;else hasSeconds=false;
      if(Number.isFinite(+s.edge.meters))meters+=+s.edge.meters;else hasMeters=false;
      if(s.geometry)geometryLegs++;
    }
    return {steps:path.segments.length,seconds:hasSeconds?seconds:null,meters:hasMeters?meters:null,geometryLegs};
  }

  function routeConfidence(route,positionConfidence=100){
    const q=routeQuality(route).level;
    const base=q==='high'?96:q==='good'?82:58;
    return Math.round(clamp(Math.min(base,Number(positionConfidence)||base),0,100));
  }

  return {clamp,normAngle,angleDelta,distance,bearing,turn,edgeAllowed,shortestPath,pathSteps,compactPathSteps,routeQuality,pathMetrics,routeConfidence};
});