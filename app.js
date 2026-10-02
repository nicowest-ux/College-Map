(() => {
'use strict';
const D=window.CAMPUS_V6||window.CAMPUS_V5,$=id=>document.getElementById(id),Core=window.CampusNavCore;
if(!D||!Core){document.body.innerHTML='<div style="padding:24px;font-family:system-ui">Campus navigation failed to load. Please refresh this page.</div>';return;}
const store={get(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}};
const EMPTY_SURVEY={checkpoints:[],edges:[]};
const state={
 selected:null,start:null,destination:null,position:store.get('cn_position',null),cal:store.get('cn_calibration',{}),
 survey:store.get('cn_survey',EMPTY_SURVEY),saved:new Set(store.get('cn_saved',[])),placing:null,placingAnchor:null,tapPosition:false,
 tracking:false,heading:0,route:null,routeIndex:0,confidence:store.get('cn_confidence',100),scale:1,tx:0,ty:0,
 stepFree:store.get('cn_stepfree',false),voice:store.get('cn_voice',false),tourLoaded:false,
 profile:store.get('cn_profile','student'),lastConfirmed:store.get('cn_lastConfirmed',null),
 recent:store.get('cn_recent',[]),searchMode:'browse',pendingDestination:null,pendingCheckpoint:null,pendingPlace:null,routeDraft:null,
 haptics:store.get('cn_haptics',true),autoZoom:store.get('cn_autozoom',true),stepsSinceAnchor:0,
 activeRoute:store.get('cn_active_route',null),draftIgnoreStepFree:false,
 tourLinks:store.get('cn_tour_links',{}),headingCal:store.get('cn_heading_cal',{}),strideM:store.get('cn_stride_m',0.72),
 rawHeading:null,compassAccuracy:null,cameraStream:null,cameraActive:false,cameraStartedTracking:false,legWalkMeters:0,tourScene:null,tourUrl:null
};
if(!state.survey||!Array.isArray(state.survey.checkpoints)||!Array.isArray(state.survey.edges))state.survey=structuredClone(EMPTY_SURVEY);
for(const key of [...state.saved]){if(!String(key).includes(':')){state.saved.delete(key);state.saved.add('room:'+key)}}store.set('cn_saved',[...state.saved]);

/* ---------- zero-dependency image map engine ---------- */
const mapEl=$('map');
mapEl.innerHTML=`<div id="mapStage" class="map-stage"><img id="floorImage" draggable="false" alt="Campus floor plans"><svg id="routeSvg" class="route-svg" viewBox="0 0 ${D.image.width} ${D.image.height}" preserveAspectRatio="none"></svg><div id="zoneLayer" class="map-layer zone-layer"></div><div id="roomLayer" class="map-layer"></div><div id="checkpointLayer" class="map-layer"></div><div id="positionLayer" class="map-layer"></div></div>`;
const stage=$('mapStage'),img=$('floorImage'),zoneLayer=$('zoneLayer'),roomLayer=$('roomLayer'),checkpointLayer=$('checkpointLayer'),positionLayer=$('positionLayer'),routeSvg=$('routeSvg');
img.src=D.image.src;stage.style.width=D.image.width+'px';stage.style.height=D.image.height+'px';
function updateZoomMode(){mapEl.dataset.zoom=state.scale<.55?'overview':state.scale<1.35?'mid':'detail'}
function applyTransform(){stage.style.transform=`translate3d(${state.tx}px,${state.ty}px,0) scale(${state.scale})`;updateZoomMode()}
function fitBounds(bounds,animate=true){const [[y1,x1],[y2,x2]]=bounds,w=Math.max(10,x2-x1),h=Math.max(10,y2-y1),cw=mapEl.clientWidth||innerWidth,ch=mapEl.clientHeight||innerHeight;let s=Math.min(cw/w,ch/h)*.86;s=Math.max(.2,Math.min(4,s));const cx=(x1+x2)/2,cy=(y1+y2)/2;state.scale=s;state.tx=cw/2-cx*s;state.ty=ch/2-cy*s;stage.classList.toggle('animate-map',animate);applyTransform();setTimeout(()=>stage.classList.remove('animate-map'),350)}
function fitAll(){fitBounds([[0,0],[D.image.height,D.image.width]])}
function flyTo(pos,scale=2.15){const [y,x]=pos,cw=mapEl.clientWidth,ch=mapEl.clientHeight;state.scale=Math.max(.3,Math.min(4,scale));state.tx=cw/2-x*state.scale;state.ty=ch/2-y*state.scale;stage.classList.add('animate-map');applyTransform();setTimeout(()=>stage.classList.remove('animate-map'),350)}
function screenToMap(clientX,clientY){const r=mapEl.getBoundingClientRect();return [(clientY-r.top-state.ty)/state.scale,(clientX-r.left-state.tx)/state.scale]}
let pointers=new Map(),dragStart=null,lastTap=0;
mapEl.addEventListener('pointerdown',e=>{if(e.target.closest('button,.room-hit,.checkpoint-hit'))return;mapEl.setPointerCapture?.(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1)dragStart={x:e.clientX,y:e.clientY,tx:state.tx,ty:state.ty,moved:false};});
mapEl.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const old=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1&&dragStart){const dx=e.clientX-dragStart.x,dy=e.clientY-dragStart.y;if(Math.abs(dx)+Math.abs(dy)>4)dragStart.moved=true;state.tx=dragStart.tx+dx;state.ty=dragStart.ty+dy;applyTransform();}else if(pointers.size===2){const pts=[...pointers.values()];const before=[...pointers.entries()].map(([id,p])=>id===e.pointerId?old:p);const d0=Math.hypot(before[0].x-before[1].x,before[0].y-before[1].y),d1=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);if(d0>0&&d1>0){const mx=(pts[0].x+pts[1].x)/2,my=(pts[0].y+pts[1].y)/2;const mapPt=screenToMap(mx,my);const ns=Math.max(.2,Math.min(4,state.scale*(d1/d0)));const r=mapEl.getBoundingClientRect();state.scale=ns;state.tx=mx-r.left-mapPt[1]*ns;state.ty=my-r.top-mapPt[0]*ns;applyTransform();}}});
function pointerEnd(e){const was=dragStart,p=pointers.get(e.pointerId);pointers.delete(e.pointerId);if(pointers.size===0){if(was&&!was.moved&&p){const now=Date.now();if(now-lastTap<300){const [y,x]=screenToMap(e.clientX,e.clientY);flyTo([y,x],Math.min(4,state.scale*1.55));}else handleMapTap(e.clientX,e.clientY);lastTap=now;}dragStart=null;}else if(pointers.size===1){const p=[...pointers.values()][0];dragStart={x:p.x,y:p.y,tx:state.tx,ty:state.ty,moved:true};}}
mapEl.addEventListener('pointerup',pointerEnd);mapEl.addEventListener('pointercancel',pointerEnd);
mapEl.addEventListener('wheel',e=>{e.preventDefault();const [y,x]=screenToMap(e.clientX,e.clientY);const ns=Math.max(.2,Math.min(4,state.scale*(e.deltaY<0?1.15:.87)));const r=mapEl.getBoundingClientRect();state.scale=ns;state.tx=e.clientX-r.left-x*ns;state.ty=e.clientY-r.top-y*ns;applyTransform();},{passive:false});
function handleMapTap(cx,cy){const [y,x]=screenToMap(cx,cy);if(state.placing){state.cal[state.placing.id]={pos:[+y.toFixed(1),+x.toFixed(1)],verifiedAt:new Date().toISOString()};store.set('cn_calibration',state.cal);const id=state.placing.id;state.placing=null;mapEl.classList.remove('calibrating');renderRooms();renderStudio();toast(`${id} doorway verified`);return}if(state.placingAnchor){const a={...state.placingAnchor,pos:[+y.toFixed(1),+x.toFixed(1)],verified:true,createdAt:new Date().toISOString()};state.survey.checkpoints.push(a);state.placingAnchor=null;mapEl.classList.remove('calibrating');saveSurvey();renderCheckpoints();renderStudio();toast(`${a.name} anchor saved`);return}if(state.tapPosition){state.tapPosition=false;mapEl.classList.remove('calibrating');setPosition([y,x],'manual map pin',null,null,88);if(state.pendingPlace)routeToPlace(state.pendingPlace);else if(state.pendingCheckpoint)openCheckpointPlanner(state.pendingCheckpoint);else if(state.pendingDestination||state.destination)openRoutePlanner(state.pendingDestination||state.destination)}}
img.addEventListener('load',()=>{fitAll();setTimeout(updateAccuracy,0)});window.addEventListener('resize',()=>{if(!state.selected&&!state.route)fitAll()});

/* ---------- campus entities ---------- */
function posFor(r){return state.cal[r.id]?.pos||r.pos||null}
function verified(r){return !!state.cal[r.id]||!!r.verified}
function roomGuideHint(r){return r?(D.roomGuideHints?.[r.id]||null):null}
function naturalRoomCompare(a,b){return a.id.localeCompare(b.id,undefined,{numeric:true,sensitivity:'base'})}
function floorCorridorNodes(bldg,floor){return (D.checkpoints||[]).filter(c=>c.type==='corridor'&&c.pos&&c.bldg===bldg&&c.floor===floor)}
function rankedRoomSectionPos(r){
 const nodes=floorCorridorNodes(r.bldg,r.floor);if(!nodes.length)return null;
 const rooms=D.rooms.filter(x=>x.bldg===r.bldg&&x.floor===r.floor).sort(naturalRoomCompare),idx=Math.max(0,rooms.findIndex(x=>x.id===r.id)),frac=rooms.length>1?idx/(rooms.length-1):.5;
 const ys=nodes.map(n=>n.pos[0]),xs=nodes.map(n=>n.pos[1]),axis=(Math.max(...xs)-Math.min(...xs))>=(Math.max(...ys)-Math.min(...ys))?1:0;
 const ordered=[...nodes].sort((a,b)=>a.pos[axis]-b.pos[axis]),pick=ordered[Math.round(frac*(ordered.length-1))];
 return pick?.pos||null
}
function roomGuidePos(r){return posFor(r)||roomGuideHint(r)||rankedRoomSectionPos(r)||null}
function roomBy(q){q=(q||'').trim().toLowerCase();return D.rooms.find(r=>r.id.toLowerCase()===q)||D.rooms.find(r=>(r.aliases||[]).some(a=>a.toLowerCase()===q))||null}
function placeBy(id){return D.places.find(p=>p.id===id)||null}
function floorLabel(f){return f==='G'?'Ground Floor':f==='LG'?'Lower Ground Floor':f==='1'?'First Floor':f==='2'?'Second Floor':f}
function floorView(r){return D.floorViews[`${r.bldg}|${r.floor}`]}
function entityKey(sel){return !sel?null:sel.type==='room'?`room:${sel.value.id}`:`place:${sel.value.id}`}
function targetRoom(sel){if(!sel)return null;if(sel.type==='room')return sel.value;if(sel.type==='place'&&sel.value.room)return roomBy(sel.value.room);return null}
function labelFor(sel){return !sel?'':sel.type==='room'?sel.value.id:sel.value.name}
function toast(s){const t=$('toast');t.textContent=s;t.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>t.hidden=true,3000)}
function focusRoom(r){const p=roomGuidePos(r);if(p)flyTo(p,2.25);else{const v=floorView(r);if(v)fitBounds(v.bounds)}}
function saveSurvey(){store.set('cn_survey',state.survey)}
function allCheckpoints(){
 const merged=new Map();for(const c of D.checkpoints||[])merged.set(c.id,{...c,seed:true});
 for(const r of D.rooms||[]){
   const exact=posFor(r),p=exact||roomGuidePos(r);if(!p)continue;
   const id=(exact?'ROOM_':'ROOM_GUIDE_')+r.id;
   if(!merged.has(id))merged.set(id,{id,name:exact?r.id+' doorway':r.id+' room section',type:exact?'room':'room-section',room:r.id,bldg:r.bldg,floor:r.floor,pos:p,verified:!!exact&&verified(r),source:exact?'room-door':'room-guide-section',estimated:!exact})
 }
 for(const c of state.survey.checkpoints||[])merged.set(c.id,{...c,seed:false});return [...merged.values()]
}
function checkpointBy(id){return allCheckpoints().find(c=>c.id===id)||null}
function checkpointMatches(text){const q=norm(text);return allCheckpoints().map(c=>({c,score:[c.name,c.type,c.id,...(c.keywords||[])].map(norm).reduce((n,h)=>n+(h&&q.includes(h)?40:h&&h.includes(q)?25:0),0)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score)}
function floorRooms(bldg,floor){return D.rooms.filter(r=>r.bldg===bldg&&r.floor===floor)}
function openFloorZone(bldg,floor){
 const view=D.floorViews[bldg+'|'+floor];if(view)fitBounds(view.bounds);
 const rooms=floorRooms(bldg,floor),precise=rooms.filter(verified).length;
 $('floorZoneTitle').textContent=bldg+' · '+floorLabel(floor);
 $('floorZoneMeta').textContent=rooms.length+' rooms · '+precise+' precise doorway pin'+(precise===1?'':'s')+'. Unverified rooms remain searchable without pretending their doorway is exact.';
 $('floorZoneRooms').innerHTML=rooms.map(r=>resultMarkup({type:'room',value:r})).join('');
 bindResults($('floorZoneRooms'));openSheet('floorZoneSheet')
}
function renderZones(){
 // The printed floorplan already contains building/floor names. Extra floating floor badges
 // obscured the drawing, so the layer is intentionally kept clean.
 zoneLayer.innerHTML='';
}
function importantRoomIds(){
 const ids=new Set(),sel=targetRoom(state.selected);
 if(sel)ids.add(sel.id);if(state.start)ids.add(state.start.id);if(state.destination)ids.add(state.destination.id);
 if(state.route?.a)ids.add(state.route.a.id);if(state.route?.b)ids.add(state.route.b.id);
 if(state.position?.roomId)ids.add(state.position.roomId);
 return ids
}
function renderRooms(){
 roomLayer.innerHTML='';const important=importantRoomIds();
 for(const r of D.rooms){
   const p=posFor(r);if(!p)continue;
   const isImportant=important.has(r.id),b=document.createElement('button');
   b.className='room-hit verified map-room-marker'+(isImportant?' important':'');
   b.style.left=p[1]+'px';b.style.top=p[0]+'px';b.title=r.id;b.setAttribute('aria-label','Room '+r.id);
   const scene=roomTourScene(r.id);b.innerHTML='<span></span><em>'+r.id+(scene?' · 360°':'')+'</em>';
   b.onclick=e=>{e.stopPropagation();if(scene?.exact&&isImportant)openTour(scene,r.id);else selectEntity({type:'room',value:r})};
   roomLayer.appendChild(b)
 }
 renderZones();updateAccuracy()
}
function pinPriority(c){
 const current=currentRouteStep?.(),routeAnchor=current?.anchor;
 if(c.id===routeAnchor)return 100;
 if(c.id===state.pendingCheckpoint?.id)return 95;
 if(c.id===state.position?.checkpointId)return 90;
 return ({lift:80,stairs:75,toilet:70,entrance:65,printer:55,water:55,landmark:40})[c.type]||10
}
function renderCheckpoints(){
 checkpointLayer.innerHTML='';
 const allowed=new Set(['toilet','lift','stairs','entrance','printer','water','landmark']);
 const importantIds=new Set([currentRouteStep?.()?.anchor,state.pendingCheckpoint?.id,state.position?.checkpointId].filter(Boolean));
 const candidates=allCheckpoints().filter(c=>c.pos&&allowed.has(c.type)).sort((a,b)=>pinPriority(b)-pinPriority(a));
 const placed=[];
 for(const c of candidates){
   const important=importantIds.has(c.id),threshold=c.type==='toilet'?30:24;
   const clash=!important&&placed.some(x=>x.c.bldg===c.bldg&&x.c.floor===c.floor&&Math.hypot(x.c.pos[0]-c.pos[0],x.c.pos[1]-c.pos[1])<threshold);
   if(clash)continue;
   placed.push({c});
   const b=document.createElement('button');
   const facility=['toilet','lift','stairs','entrance','printer','water'].includes(c.type);
   b.className='checkpoint-hit type-'+c.type+(facility?' facility':'')+(important?' important':'');
   b.style.left=c.pos[1]+'px';b.style.top=c.pos[0]+'px';b.title=c.name;b.setAttribute('aria-label',c.name+' — tap for directions');
   b.innerHTML='<span>'+checkpointIcon(c.type)+'</span>';
   b.onclick=e=>{e.stopPropagation();state.selected=null;routeToCheckpoint(c)};
   checkpointLayer.appendChild(b)
 }
}
function checkpointIcon(type){return ({entrance:'↗',junction:'⌁',stairs:'⇅',lift:'↕',toilet:'WC',printer:'▣',water:'◌',landmark:'◉',room:'•'})[type]||'◉'}
function updateAccuracy(){const rooms=D.rooms.filter(verified).length,anchors=allCheckpoints().filter(c=>c.pos&&c.verified).length,links=(state.survey.edges||[]).length;const roomPct=Math.round(rooms/D.rooms.length*100);$('accuracyText').textContent=rooms+' rooms · '+anchors+' anchors';$('accuracyBadge').dataset.level=roomPct>=70?'high':roomPct>=30?'mid':'low';if($('studioStats')){const a=typeof surveyAudit==='function'?surveyAudit():{isolated:0,unsafe:0,closed:0};$('studioStats').innerHTML='<b>'+rooms+'/'+D.rooms.length+'</b> precise room-door pins · <b>'+anchors+'</b> precise anchors · <b>'+links+'</b> custom surveyed links.<br><b>'+a.isolated+'</b> isolated mapped anchors · <b>'+a.unsafe+'</b> links without verified step-free status · <b>'+a.closed+'</b> closed links.<br>Navigation will not invent geometry for gaps in this survey.'}}

/* ---------- sheets ---------- */
function openSheet(id){closeSheets(false);$('backdrop').hidden=false;$(id).hidden=false}
function closeSheets(hideBackdrop=true){document.querySelectorAll('.sheet').forEach(x=>x.hidden=true);if(hideBackdrop)$('backdrop').hidden=true}
$('backdrop').onclick=()=>closeSheets();document.querySelectorAll('.close').forEach(b=>b.onclick=()=>closeSheets());

/* ---------- destination detail ---------- */
function directPlaceCheckpoint(place){
 const ids={FYI:'LANDMARK_FYI',FRAME:'LANDMARK_FRAME',THEATRE:'LANDMARK_THEATRE',FOCUS:'LANDMARK_FOCUS',RECEPTION:'LANDMARK_ENTRANCE',CAREERS:'LANDMARK_FYI'};
 const id=ids[place?.id];return id?checkpointBy(id):allCheckpoints().find(c=>c.place===place?.id)||null
}
function placeCheckpoint(place){return directPlaceCheckpoint(place)}
function placeCandidates(place){
 const cps=allCheckpoints();if(!place)return[];
 if(place.id==='TOILETS')return cps.filter(c=>c.type==='toilet');
 if(place.id==='LIFT')return cps.filter(c=>c.type==='lift');
 if(place.id==='FOOD'){const ids=new Set(['LANDMARK_RELISH','LANDMARK_COSTA','LANDMARK_CAFE6','LANDMARK_STORE']);return cps.filter(c=>ids.has(c.id))}
 const direct=directPlaceCheckpoint(place);return direct?[direct]:[]
}
function bestReachableCheckpoint(candidates){
 if(!candidates.length)return null;const ref=currentStartRef();if(!ref)return candidates[0];
 const cps=allCheckpoints(),startIds=startIdsForGraph(ref,cps);let best=null,bestCost=Infinity;
 for(const cp of candidates){const path=Core.shortestPath({checkpoints:cps,edges:allEdges(),startIds,endIds:[cp.id],options:{profile:state.profile,stepFree:state.stepFree}});if(path&&path.cost<bestCost){bestCost=path.cost;best=cp}}
 if(best)return best;
 const p=state.position?.pos||roomGuidePos(ref.room);if(p)return [...candidates].sort((a,b)=>Core.distance(p,a.pos)-Core.distance(p,b.pos))[0];
 return candidates[0]
}
function placeFinalText(place,cp){
 if(place.id==='CAREERS')return 'Arrive at Futures Careers & Guidance at the back of the FYi computer area.';
 if(place.id==='TOILETS')return 'Arrive at the toilets.';
 if(place.id==='FOOD')return 'Arrive at '+cp.name+', one of the campus food and drink locations.';
 if(place.id==='RECEPTION')return 'Arrive at Reception / Main Entrance.';
 return 'Arrive at '+place.name+'.'
}
function computePlaceRoute(place,cp,options={}){
 const ignoreStepFree=!!options.ignoreStepFree,ref=currentStartRef();
 if(!ref)return {a:null,b:null,fromLabel:'Starting point needed',targetLabel:place.name,steps:[],precision:'none',note:'Tell me where you are first and I’ll calculate the full corridor route.',blocked:true,blockedReason:'start',targetCheckpoint:cp,place};
 if(!cp)return {a:ref.room||null,b:null,fromLabel:ref.label,targetLabel:place.name,steps:[],precision:'none',note:'This destination does not yet have a route anchor. I will not substitute “follow signs” for missing navigation data.',blocked:true,blockedReason:'coverage',place};
 const graph=buildGraphRoute(ref,[cp.id],place.id==='FOOD'?(place.name+' — '+cp.name):place.name,null,ignoreStepFree,{targetCheckpoint:cp,place,finalText:placeFinalText(place,cp)});
 if(graph){graph.place=place;graph.targetCheckpoint=cp;return graph}
 return {a:ref.room||null,b:null,fromLabel:ref.label,targetLabel:place.name,steps:[],precision:'none',note:'I cannot yet connect your position to '+place.name+' through the mapped corridor network. Re-anchor to a room or landmark and I’ll recalculate.',blocked:true,blockedReason:state.stepFree&&!ignoreStepFree?'stepfree':'coverage',targetCheckpoint:cp,place}
}
function selectEntity(sel){
 state.selected=sel;renderRooms();renderCheckpoints();const r=targetRoom(sel),cp=sel.type==='place'?bestReachableCheckpoint(placeCandidates(sel.value)):null;if(r)focusRoom(r);else if(cp?.pos)flyTo(cp.pos,2.3);
 const isRoom=sel.type==='room',v=sel.value;
 $('roomKind').textContent=isRoom?'ROOM':'DESTINATION';$('roomName').textContent=isRoom?v.id:v.name;
 if(isRoom){
   $('roomMeta').textContent=v.bldg+' · '+floorLabel(v.floor)+((v.aliases||[])[0]?' · '+v.aliases[0]:'');
   $('destinationDescription').textContent='';
   $('roomAccuracy').textContent=verified(v)?'✓ Precise room-door pin verified':'✓ Interactive corridor guidance available to this room section; exact doorway pin is still being surveyed.';
   $('roomAccuracy').className='room-accuracy '+(verified(v)?'good':'warn');$('calibrateRoom').hidden=false;$('setHere').hidden=!verified(v);$('setHere').textContent='I’m at this room';
 } else {
   const linked=r?'Linked to '+r.id+' · '+r.bldg+' · '+floorLabel(r.floor):cp?'Route anchor: '+cp.name+' · '+(cp.bldg||'Campus'):'Destination route anchor still being mapped.';
   $('roomMeta').textContent=v.kind+' · '+linked;$('destinationDescription').textContent=v.description||'';
   $('roomAccuracy').textContent=(r||cp)?'✓ Can be used as a navigation destination':'This destination still needs a route anchor before turn-by-turn guidance can be trusted.';
   $('roomAccuracy').className='room-accuracy '+((r||cp)?'good':'warn');$('calibrateRoom').hidden=true;
   $('setHere').hidden=!(r&&verified(r))&&!cp?.verified;$('setHere').textContent='I’m at this place';
 }
 const key=entityKey(sel),scene=tourSceneForSelection(sel);$('saveRoom').textContent=state.saved.has(key)?'★ Saved':'☆ Save';
 $('goHere').textContent='Take me there';$('goHere').classList.add('primary');$('lookAround').hidden=!scene;$('lookAround').textContent=scene?(scene.exact?'View this place in 360°':'360° nearby'):'360° unavailable';openSheet('roomSheet')
}
$('setHere').onclick=()=>{
 const r=targetRoom(state.selected),cp=state.selected?.type==='place'?bestReachableCheckpoint(placeCandidates(state.selected.value)):null;
 if(cp?.pos){anchorAt(cp);closeSheets();return}
 if(!r||!verified(r)){toast('Use a confirmed room or landmark to set a precise starting position');return}
 const p=posFor(r);state.start=r;if(p){const rcp=allCheckpoints().find(c=>c.room===r.id&&c.source==='room-door');setPosition(p,'verified room',r.id,rcp?.id||null,100);closeSheets()}
};
function openPlacePlanner(place,cp,options={}){
 state.pendingPlace=place;state.pendingCheckpoint=cp;state.pendingDestination=null;state.destinationPlace=place;
 state.draftIgnoreStepFree=!!options.ignoreStepFree;state.routeDraft=computePlaceRoute(place,cp,{ignoreStepFree:state.draftIgnoreStepFree});renderPlanner();openSheet('plannerSheet')
}
function routeToPlace(place){
 const r=place.room?roomBy(place.room):null;
 if(r){state.destinationPlace=place;state.pendingPlace=place;routeTo(r,{keepPlace:true});return}
 if(place.id==='SCIENCE'){const sr=roomBy('M011')||roomBy('M009');if(sr){state.destinationPlace=place;state.pendingPlace=place;routeTo(sr,{keepPlace:true});return}}
 if(place.id==='SPORTS'){const sr=roomBy('S001');if(sr){state.destinationPlace=place;state.pendingPlace=place;routeTo(sr,{keepPlace:true});return}}
 const candidates=placeCandidates(place),cp=bestReachableCheckpoint(candidates);
 openPlacePlanner(place,cp)
}
$('goHere').onclick=()=>{if(!state.selected)return;if(state.selected.type==='room')routeTo(state.selected.value);else routeToPlace(state.selected.value)};
$('lookAround').onclick=()=>{const scene=tourSceneForSelection(state.selected);if(scene)openTour(scene,labelFor(state.selected));else toast('No exact 360° scene is linked to this location yet')};
$('saveRoom').onclick=()=>{const key=entityKey(state.selected);if(!key)return;state.saved.has(key)?state.saved.delete(key):state.saved.add(key);store.set('cn_saved',[...state.saved]);selectEntity(state.selected)};
$('calibrateRoom').onclick=()=>{if(state.selected?.type==='room')calibrationMode(state.selected.value)};

/* ---------- search ---------- */
function norm(s){return (s||'').toLowerCase().replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim()}
function scoreEntity(q,sel){const n=norm(q);if(!n)return 1;if(sel.type==='room'){const r=sel.value,hay=norm([r.id,r.bldg,...(r.aliases||[])].join(' '));if(norm(r.id)===n)return 100;if(hay.includes(n))return 60;return n.split(' ').reduce((s,w)=>s+(hay.includes(w)?6:0),0)}const p=sel.value,hay=norm([p.name,p.kind,p.description,...(p.keywords||[])].join(' '));if(norm(p.name)===n)return 95;if((p.keywords||[]).some(k=>norm(k)===n))return 85;if(hay.includes(n))return 55;return n.split(' ').reduce((s,w)=>s+(hay.includes(w)?7:0),0)}
function allEntities(){return [...D.places.map(value=>({type:'place',value})),...D.rooms.map(value=>({type:'room',value}))]}
function resultMarkup(sel){if(sel.type==='place'){const p=sel.value,r=targetRoom(sel);return '<button class="result" data-kind="place" data-id="'+p.id+'"><span class="result-icon">'+(p.icon||'•')+'</span><span class="result-copy"><b>'+p.name+'</b><small>'+p.kind+(r?' · '+r.id:'')+'</small></span><em>'+(r&&verified(r)?'Verified':'Explore')+'</em></button>'}const r=sel.value;return '<button class="result" data-kind="room" data-id="'+r.id+'"><span class="result-icon">'+r.id[0]+'</span><span class="result-copy"><b>'+r.id+'</b><small>'+r.bldg+' · '+floorLabel(r.floor)+((r.aliases||[])[0]?' · '+r.aliases[0]:'')+'</small></span><em>'+(verified(r)?'Precise':'Floor only')+'</em></button>'}
function selectSearchResult(sel){
 const mode=state.searchMode||'browse',r=targetRoom(sel);
 if(mode==='start'||mode==='reanchor'){
   if(!r){toast('Choose a room or use a surveyed landmark as your start');return}
   state.start=r;
   const p=posFor(r),cp=allCheckpoints().find(c=>c.room===r.id&&c.pos);
   if(p)setPosition(p,'room start: '+r.id,r.id,cp?.id||null,100);
   else {state.position={pos:null,source:'room start: '+r.id,roomId:r.id,checkpointId:null,at:Date.now()};store.set('cn_position',state.position);renderPosition()}
   state.searchMode='browse';closeSheets();
   if(mode==='reanchor'&&state.route){rerouteFromCurrent();return}
   if(state.pendingPlace){routeToPlace(state.pendingPlace);return}
   if(state.pendingCheckpoint){openCheckpointPlanner(state.pendingCheckpoint);return}
   if(state.pendingDestination||state.destination){openRoutePlanner(state.pendingDestination||state.destination);return}
   selectEntity({type:'room',value:r});return;
 }
 if(mode==='destination'){
   state.searchMode='browse';closeSheets();
   if(r)routeTo(r);else selectEntity(sel);return;
 }
 closeSheets();selectEntity(sel)
}
function bindResults(root=$('searchResults')){root.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>{const sel=b.dataset.kind==='room'?{type:'room',value:roomBy(b.dataset.id)}:{type:'place',value:placeBy(b.dataset.id)};if(sel.value)selectSearchResult(sel)})}
function search(q=''){
 const recentIds=new Set((state.recent||[]).map(x=>x.id));
 const scored=allEntities().map(sel=>({sel,score:scoreEntity(q,sel)+(sel.type==='room'&&recentIds.has(sel.value.id)?(q?4:40):0)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||(a.sel.type==='place'?-1:1)).slice(0,q?60:28);
 $('searchResults').innerHTML=scored.map(x=>resultMarkup(x.sel)).join('')||'<p class="empty">No matching destination. Try a room number or describe what you need.</p>';bindResults()
}
function openSearch(mode='browse',prefill=''){
 state.searchMode=mode;
 const title=$('searchSheet').querySelector('h2');
 if(title)title.textContent=mode==='start'?'Where are you starting?':mode==='destination'?'Choose a destination':mode==='reanchor'?'What room can you see?':'Where do you need to go?';
 $('roomSearch').placeholder=mode==='start'||mode==='reanchor'?'Try B007, Tech Support…':'Try exams, quiet study, B014…';
 $('roomSearch').value=prefill;search(prefill);openSheet('searchSheet');setTimeout(()=>$('roomSearch').focus(),50)
}
$('searchBtn').onclick=()=>openSearch('browse');$('roomSearch').oninput=e=>search(e.target.value);
/* ---------- position & heading assist ---------- */
function floorKeyFor(bldg,floor){return bldg&&floor?bldg+'|'+floor:null}
function currentFloorKey(){
 const cp=state.position?.checkpointId&&checkpointBy(state.position.checkpointId);if(cp)return floorKeyFor(cp.bldg,cp.floor);
 const r=state.position?.roomId&&roomBy(state.position.roomId);if(r)return floorKeyFor(r.bldg,r.floor);
 const s=currentRouteStep?.();if(s){const a=checkpointBy(s.fromAnchor)||checkpointBy(s.anchor);if(a)return floorKeyFor(a.bldg,a.floor)}
 if(state.start)return floorKeyFor(state.start.bldg,state.start.floor);return null
}
function mapFacingHeading(){if(state.rawHeading==null)return 0;const k=currentFloorKey(),off=k&&state.headingCal[k];return off==null?0:Core.normAngle(state.rawHeading-off)}
function renderPosition(){positionLayer.innerHTML='';if(!state.position)return;const p=state.position.pos;if(p){const d=document.createElement('div');d.className='you'+((currentFloorKey()&&state.headingCal[currentFloorKey()]!=null)?'':' heading-uncalibrated');d.style.left=p[1]+'px';d.style.top=p[0]+'px';d.innerHTML='<i style="transform:translate(-50%,-100%) rotate('+mapFacingHeading()+'deg)"></i><b></b>';positionLayer.appendChild(d)}if($('positionInfo')){const last=state.lastConfirmed?' Last confirmed: '+state.lastConfirmed.name+'.':'';const compass=state.rawHeading==null?' Compass not active.':' Facing '+Math.round(state.rawHeading)+'°'+(state.compassAccuracy>0?' (±'+Math.round(state.compassAccuracy)+'°)':'')+'.';$('positionInfo').textContent='Position source: '+(state.position.source||'manual')+' · confidence '+Math.round(state.confidence)+'%.'+last+compass+(state.tracking?' Heading/step assist is on.':'' )}}
function setPosition(pos,source='manual map pin',roomId=null,checkpointId=null,confidence=88){state.position={pos,source,roomId,checkpointId,at:Date.now()};state.confidence=confidence;state.stepsSinceAnchor=0;state.legWalkMeters=0;store.set('cn_position',state.position);store.set('cn_confidence',state.confidence);renderPosition();renderCameraGuide();if(pos&&state.autoZoom)flyTo(pos,2.2);toast('Indoor position set')}
function openPosition(){$('positionInfo').textContent=state.position?'Current source: '+state.position.source+'. Confidence '+Math.round(state.confidence)+'%.':'No indoor position set yet.';openSheet('positionSheet')}
$('tapStart').onclick=()=>{closeSheets();state.tapPosition=true;mapEl.classList.add('calibrating');toast('Tap your exact current position')};
$('chooseStart').onclick=()=>{closeSheets();openSearch('start')};
$('followMeBtn').onclick=enableTracking;$('landmarkStart').onclick=openLandmarks;
async function requestMotionAccess(){
 let ok=true;
 try{
   if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function'){
     let p;try{p=await DeviceOrientationEvent.requestPermission(true)}catch{p=await DeviceOrientationEvent.requestPermission()}
     if(p!=='granted')ok=false
   }
   if(typeof DeviceMotionEvent!=='undefined'&&typeof DeviceMotionEvent.requestPermission==='function'){
     const p=await DeviceMotionEvent.requestPermission();if(p!=='granted')ok=false
   }
 }catch{ok=false}
 return ok
}
async function enableTracking(){if(!state.position){openPosition();return}const ok=await requestMotionAccess();if(!ok){toast('Motion/compass permission was not granted');return}state.tracking=!state.tracking;$('followMeBtn').textContent=state.tracking?'Stop heading assist':'Heading assist';toast(state.tracking?'Heading assist on — exact position still comes from confirmed anchors':'Heading assist stopped');renderPosition()}
function smoothHeading(prev,next,w=.22){if(prev==null)return Core.normAngle(next);return Core.normAngle(prev+Core.angleDelta(prev,next)*w)}
function handleOrientation(e){let h=null;if(Number.isFinite(e.webkitCompassHeading)){h=e.webkitCompassHeading;if(Number.isFinite(e.webkitCompassAccuracy))state.compassAccuracy=e.webkitCompassAccuracy}else if((e.absolute===true||e.type==='deviceorientationabsolute')&&Number.isFinite(e.alpha))h=360-e.alpha;if(h==null)return;state.rawHeading=smoothHeading(state.rawHeading,h);renderPosition();renderGuideLens();renderCameraGuide()}
window.addEventListener('deviceorientationabsolute',handleOrientation);window.addEventListener('deviceorientation',handleOrientation);
function measuredCurrentSegment(){
 if(!state.route||state.route.precision!=='survey graph'||!state.route.path)return null;const seg=state.route.path.segments[state.routeIndex];if(!seg)return null;
 const from=checkpointBy(seg.from),to=checkpointBy(seg.to),meters=Number(seg.edge?.meters);if(!from?.pos||!to?.pos||!Number.isFinite(meters)||meters<=0||from.bldg!==to.bldg||from.floor!==to.floor)return null;
 return {seg,from,to,meters}
}
function advanceMeasuredProgress(){
 const m=measuredCurrentSegment();if(!m)return;state.legWalkMeters+=state.strideM;const frac=Math.min(.92,state.legWalkMeters/m.meters),p=[m.from.pos[0]+(m.to.pos[0]-m.from.pos[0])*frac,m.from.pos[1]+(m.to.pos[1]-m.from.pos[1])*frac];
 state.position={pos:p,source:'estimated on measured surveyed link',roomId:null,checkpointId:null,at:Date.now()};state.confidence=Math.max(58,96-frac*26);store.set('cn_position',state.position);store.set('cn_confidence',state.confidence);renderPosition();renderCameraGuide()
}
let lastMag=0,lastStepAt=0;window.addEventListener('devicemotion',e=>{if((!state.tracking&&!state.cameraActive)||!state.position)return;const a=e.accelerationIncludingGravity;if(!a)return;const mag=Math.sqrt((a.x||0)**2+(a.y||0)**2+(a.z||0)**2),now=Date.now();if(lastMag&&Math.abs(mag-lastMag)>2.15&&now-lastStepAt>430){lastStepAt=now;state.stepsSinceAnchor++;advanceMeasuredProgress()}lastMag=mag});
function anchorAt(c){
 if(c.pos)setPosition(c.pos,'confirmed landmark: '+c.name,c.room||null,c.id,100);
 else {state.position={pos:state.position?.pos||null,source:'semantic landmark: '+c.name,roomId:c.room||null,checkpointId:c.id,at:Date.now()};state.confidence=Math.max(state.confidence,82);state.legWalkMeters=0;store.set('cn_position',state.position);store.set('cn_confidence',state.confidence);renderPosition()}
 if(c.room)state.start=roomBy(c.room)||state.start;
 state.lastConfirmed={id:c.id,name:c.name,at:Date.now()};store.set('cn_lastConfirmed',state.lastConfirmed);
 if(state.route)handleRouteAnchor(c);
 renderCameraGuide();toast('Confirmed: '+c.name)
}
function openLandmarks(){const cps=allCheckpoints();let list=cps;if(state.route){const ids=new Set(state.route.steps.map(s=>s.anchor).filter(Boolean));list=[...cps.filter(c=>ids.has(c.id)),...cps.filter(c=>!ids.has(c.id))]}else if(state.start)list=cps.filter(c=>!c.bldg||c.bldg===state.start.bldg);$('landmarkResults').innerHTML=list.slice(0,36).map(c=>'<button class="result" data-cp="'+c.id+'"><span class="result-icon">'+checkpointIcon(c.type)+'</span><span class="result-copy"><b>'+c.name+'</b><small>'+(c.bldg||'Campus')+(c.floor?' · '+floorLabel(c.floor):'')+(c.pos?' · precise anchor':' · landmark')+'</small></span><em>'+(c.verified?'Precise':'Guide')+'</em></button>').join('')||'<p class="empty">No landmarks surveyed yet.</p>';$('landmarkResults').querySelectorAll('[data-cp]').forEach(b=>b.onclick=()=>{const c=checkpointBy(b.dataset.cp);if(c){anchorAt(c);closeSheets();if(!state.route){if(state.pendingPlace)routeToPlace(state.pendingPlace);else if(state.pendingCheckpoint)openCheckpointPlanner(state.pendingCheckpoint);else if(state.pendingDestination||state.destination)openRoutePlanner(state.pendingDestination||state.destination)}}});openSheet('landmarkSheet')}
$('landmarkTour').onclick=openRouteVisual;

/* ---------- camera guide ---------- */
function cameraLegData(){
 const step=currentRouteStep?.();if(!step)return null;const from=checkpointBy(step.fromAnchor),to=checkpointBy(step.anchor),seg=state.route?.path?.segments?.[Number.isInteger(step.segmentIndex)?step.segmentIndex:state.routeIndex]||null;
 const mode=step.mode||seg?.edge?.mode||(to?.type==='stairs'?'stairs':to?.type==='lift'?'lift':'corridor'),sameFloor=from&&to&&from.bldg===to.bldg&&from.floor===to.floor;
 const mapBearing=from?.pos&&to?.pos&&sameFloor?Core.bearing(from.pos,to.pos):null,key=from?floorKeyFor(from.bldg,from.floor):currentFloorKey(),offset=key&&state.headingCal[key],targetHeading=mapBearing!=null&&offset!=null?Core.normAngle(mapBearing+offset):null;
 const delta=targetHeading!=null&&state.rawHeading!=null?Core.angleDelta(state.rawHeading,targetHeading):null,meters=Number(step.meters??seg?.edge?.meters),remaining=Number.isFinite(meters)?Math.max(0,meters-state.legWalkMeters):null;
 return {step,from,to,seg,mode,sameFloor,mapBearing,key,offset,targetHeading,delta,meters:Number.isFinite(meters)?meters:null,remaining,floorChange:!!(from&&to&&from.floor!==to.floor)}
}
function fallbackTurnDegrees(action){return ({left:-90,'slight-left':-45,right:90,'slight-right':45,uturn:180,continue:0,straight:0,arrive:0})[action]??0}
function compassQuality(){const a=state.compassAccuracy;if(state.rawHeading==null)return 'Compass unavailable';if(!(a>0))return 'Compass active';if(a<=15)return 'Compass good ±'+Math.round(a)+'°';if(a<=30)return 'Compass fair ±'+Math.round(a)+'°';return 'Compass weak ±'+Math.round(a)+'°'}
function renderCameraGuide(){if(!$('cameraGuide')||$('cameraGuide').hidden||!state.route)return;const d=cameraLegData();if(!d)return;$('cameraRouteTitle').textContent=state.route.targetLabel||'Route';$('cameraSensorStatus').textContent=compassQuality();$('cameraInstruction').textContent=d.step.text;
 let rot=d.delta!=null?d.delta:fallbackTurnDegrees(d.step.action);rot=Math.max(-180,Math.min(180,rot));$('cameraArrow3d').style.setProperty('--arrow-rotate',rot+'deg');
 let label=d.delta!=null?(Math.abs(d.delta)<14?'Straight ahead':d.delta<0?'Turn left':'Turn right'):(d.step.action==='arrive'?'Destination':(d.step.action||'Follow route').replace(/-/g,' '));$('cameraTurnLabel').textContent=label;
 const cue=$('cameraFloorCue');if(d.floorChange||d.mode==='stairs'||d.mode==='lift'){cue.hidden=false;const destFloor=d.to?.floor?floorLabel(d.to.floor):'';cue.textContent=(d.mode==='lift'?'↕ Use lift':d.mode==='stairs'?'⇅ Use stairs':'⇅ Change level')+(destFloor?' · '+destFloor:'')}else cue.hidden=true;
 $('cameraDistance').textContent=d.remaining!=null?'About '+Math.max(0,Math.round(d.remaining))+' m to '+(d.to?.name||'next anchor'):(d.to?'Next anchor: '+d.to.name:'');
 $('cameraCalibrate').hidden=!(d.mapBearing!=null&&state.rawHeading!=null);$('cameraCalibrate').textContent=d.offset==null?'Point down route · Calibrate':'Recalibrate heading';
 const cp=d.to;$('cameraConfirm').hidden=!cp;$('cameraConfirm').textContent=cp?'✓ I’m at '+cp.name:'Confirm landmark';
 const calibrated=d.offset!=null?'Heading calibrated for '+(d.key||'this floor')+'. ':'Heading not calibrated for this floor. ';
 const pos=state.position?.source||'No position';$('cameraPrecision').textContent=calibrated+'Position: '+pos+'. Exactness is restored whenever you confirm a surveyed anchor.'
}
async function startCameraGuide(){
 if(!state.route){toast('Start a route first');return}if(!navigator.mediaDevices?.getUserMedia){toast('This browser cannot provide the rear camera');return}
 const motionOk=await requestMotionAccess();try{const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false});state.cameraStream=stream;$('cameraVideo').srcObject=stream;await $('cameraVideo').play().catch(()=>{});state.cameraActive=true;state.cameraStartedTracking=!state.tracking;state.tracking=true;$('cameraGuide').hidden=false;renderCameraGuide();if(!motionOk)toast('Camera is on; compass permission is unavailable, so only turn cues can be shown')}catch(e){toast('Camera permission was not granted')}}
function stopCameraGuide(){if(state.cameraStream){for(const t of state.cameraStream.getTracks())t.stop();state.cameraStream=null}$('cameraVideo').srcObject=null;$('cameraGuide').hidden=true;state.cameraActive=false;if(state.cameraStartedTracking){state.tracking=false;state.cameraStartedTracking=false}renderPosition()}
function calibrateCameraHeading(){const d=cameraLegData();if(!d?.key||d.mapBearing==null||state.rawHeading==null){toast('This route leg needs surveyed geometry before heading can be calibrated');return}state.headingCal[d.key]=Core.normAngle(state.rawHeading-d.mapBearing);store.set('cn_heading_cal',state.headingCal);renderPosition();renderCameraGuide();buzz([20,40,20]);toast('Heading calibrated for this floor')}
$('cameraGuideBtn').onclick=startCameraGuide;$('cameraClose').onclick=stopCameraGuide;$('cameraCalibrate').onclick=calibrateCameraHeading;$('cameraReanchor').onclick=()=>{stopCameraGuide();openLandmarks()};$('cameraConfirm').onclick=()=>{const d=cameraLegData();if(d?.to)anchorAt(d.to);else nextRouteStep();renderCameraGuide()};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.cameraActive)stopCameraGuide()});

/* ---------- guidance ---------- */
function calibrationMode(room){state.placing=room;closeSheets();toast('Tap the exact doorway for '+room.id);mapEl.classList.add('calibrating')}
function generatedConnectorEdges(){
 const cps=allCheckpoints(),corr=cps.filter(c=>c.type==='corridor'&&c.pos),out=[];
 for(const c of cps){
  if(!c.pos||c.type==='corridor')continue;let best=null,bd=Infinity;
  for(const n of corr){if(n.bldg!==c.bldg||n.floor!==c.floor)continue;const d=Math.hypot(n.pos[0]-c.pos[0],n.pos[1]-c.pos[1]);if(d<bd){bd=d;best=n}}
  const limit=c.type==='room-section'?150:115;
  if(best&&bd<=limit)out.push({from:c.id,to:best.id,mode:c.type==='room'?'doorway':'corridor',access:'public',stepFree:null,source:c.type==='room-section'?'room-section-snap':'auto-snap-to-annotated-corridor',meters:null})
 }
 return out
}
function graphStitchEdges(){
 const corr=(D.checkpoints||[]).filter(c=>c.type==='corridor'&&c.pos),base=D.edges||[],degree=new Map(corr.map(c=>[c.id,0]));
 for(const e of base){if(degree.has(e.from))degree.set(e.from,degree.get(e.from)+1);if(degree.has(e.to))degree.set(e.to,degree.get(e.to)+1)}
 const ends=corr.filter(c=>(degree.get(c.id)||0)<=1),out=[],seen=new Set();
 for(let i=0;i<ends.length;i++)for(let j=i+1;j<ends.length;j++){
   const a=ends[i],b=ends[j];if(a.floor!==b.floor)continue;
   const d=Math.hypot(a.pos[0]-b.pos[0],a.pos[1]-b.pos[1]);
   if(d>28)continue;const key=[a.id,b.id].sort().join('|');if(seen.has(key))continue;seen.add(key);
   out.push({from:a.id,to:b.id,mode:'corridor',access:'public',stepFree:null,source:'annotated-component-stitch',weight:Math.max(1,d)})
 }
 return out
}
function allEdges(){return [...(D.edges||[]),...(state.survey.edges||[]),...generatedConnectorEdges(),...graphStitchEdges()]}
function currentStartRef(){
 const cp=state.position?.checkpointId?checkpointBy(state.position.checkpointId):null;
 if(cp)return {kind:'checkpoint',checkpoint:cp,label:cp.name,room:cp.room?roomBy(cp.room):null};
 const r=state.start||((state.position?.roomId&&roomBy(state.position.roomId))||null);
 if(r)return {kind:'room',room:r,label:r.id};
 return null
}
function startIdsForGraph(ref,cps){
 if(!ref)return[];
 if(ref.kind==='checkpoint')return[ref.checkpoint.id];
 if(ref.room){const exact=cps.filter(c=>c.room===ref.room.id&&c.source==='room-door').map(c=>c.id);if(exact.length)return exact;return cps.filter(c=>c.room===ref.room.id).map(c=>c.id)}
 return[]
}
function routeQuality(route){return Core.routeQuality(route)}
function routeEndpointCheckpoint(path,cps,which='end'){if(!path)return null;const id=which==='start'?path.startId:path.endId;return cps.find(c=>c.id===id)||null}
function nearbyRouteLandmark(cp,cps){
 if(!cp?.pos)return null;let best=null,bd=Infinity;
 for(const l of cps){if(!l.pos||l.type!=='landmark'||l.id===cp.id||l.bldg!==cp.bldg||l.floor!==cp.floor)continue;const d=Core.distance(cp.pos,l.pos);if(d<bd){bd=d;best=l}}
 return bd<=62?best:null
}
function landmarkInstruction(step,landmark){
 if(!landmark)return step.text;
 const name=landmark.name;
 if(step.action==='left')return 'Turn left at '+name+'.';
 if(step.action==='right')return 'Turn right at '+name+'.';
 if(step.action==='slight-left')return 'Keep left by '+name+'.';
 if(step.action==='slight-right')return 'Keep right by '+name+'.';
 if(step.action==='uturn')return 'Turn around at '+name+'.';
 if(step.action==='continue')return 'Continue straight past '+name+'.';
 return step.text
}
function enrichRouteSteps(steps,cps){
 const used=new Set();
 for(let i=0;i<Math.max(0,steps.length-1);i++){
   const s=steps[i],cp=cps.find(c=>c.id===s.anchor);if(!cp||s.mode==='lift'||s.mode==='stairs')continue;
   const l=nearbyRouteLandmark(cp,cps);if(!l||used.has(l.id))continue;used.add(l.id);
   s.text=landmarkInstruction(s,l);s.confirm='Look for '+l.name+'.';s.confirmCheckpointId=l.id
 }
 return steps
}
function buildGraphRoute(ref,targetIds,targetLabel,targetRoom=null,ignoreStepFree=false,extra={}){
 const cps=allCheckpoints(),startIds=startIdsForGraph(ref,cps);
 if(!startIds.length||!targetIds.length)return null;
 const path=Core.shortestPath({checkpoints:cps,edges:allEdges(),startIds,endIds:targetIds,options:{profile:state.profile,stepFree:state.stepFree&&!ignoreStepFree}});
 if(!path)return null;
 const startCp=routeEndpointCheckpoint(path,cps,'start'),endCp=routeEndpointCheckpoint(path,cps,'end');
 const estimatedStart=startCp?.source==='room-guide-section',estimatedDestination=endCp?.source==='room-guide-section'||!!extra.estimatedDestination;
 let steps=enrichRouteSteps(Core.compactPathSteps(path,cps,{targetLabel,floorLabel}),cps);
 if(!steps.length)steps=[{action:'arrive',icon:'✓',text:'You are already at '+targetLabel+'.',anchor:path.endId,fromAnchor:path.startId,confirm:'Destination confirmed.',segmentIndex:0}];
 if(steps.length){
   const last=steps[steps.length-1];
   if(estimatedDestination){
     last.action='arrive';last.icon='◎';last.text='You’re at the '+targetLabel+' section.';
     last.confirm='The corridor route is complete. If the exact door is not immediately visible, tap “I’m lost” and enter the nearest room number so I can refine the final approach.'
   }else last.text=extra.finalText||('Arrive at '+targetLabel+'.');
 }
 const precision=estimatedStart||estimatedDestination?'guided room section':'survey graph';
 const note=estimatedDestination?'Full corridor guidance is available. The final room-section position comes from the floorplan and is not yet a surveyed doorway pin.':estimatedStart?'Your starting room uses a floorplan room-section position; the corridor journey itself follows mapped paths.':'Route follows the mapped corridor network.';
 return {a:ref.room||null,b:targetRoom,fromLabel:ref.label,targetLabel,steps,precision,note,path,ignoreStepFree,blocked:false,estimatedStart,estimatedDestination,targetCheckpoint:extra.targetCheckpoint||null,place:extra.place||null}
}
function roomTargetIds(room,cps){
 const exact=cps.filter(c=>c.room===room.id&&c.source==='room-door').map(c=>c.id);if(exact.length)return exact;
 return cps.filter(c=>c.room===room.id&&c.source==='room-guide-section').map(c=>c.id)
}
function computeRoomRoute(dest,options={}){
 const ignoreStepFree=!!options.ignoreStepFree,ref=currentStartRef(),a=ref?.room||null,b=dest;
 if(!ref)return {a:null,b,fromLabel:'Starting point needed',targetLabel:b.id,steps:[],precision:'none',note:'Tell me where you are first so I can calculate the corridor route.',blocked:true,blockedReason:'start'};
 const cps=allCheckpoints(),endIds=roomTargetIds(b,cps);
 const graph=buildGraphRoute(ref,endIds,b.id,b,ignoreStepFree,{estimatedDestination:!posFor(b)});
 if(graph)return graph;
 const template=a?D.routeTemplates?.[a.id+'>'+b.id]:null;
 if(template){
   const accessOK=template.audience!=='staff'||state.profile==='staff';
   const stepOK=!state.stepFree||ignoreStepFree||template.stepFree===true;
   if(!accessOK)return {a,b,fromLabel:ref.label,targetLabel:b.id,steps:[],precision:'none',note:'The known route crosses a staff-only area for your current route profile.',blocked:true,blockedReason:'access'};
   const steps=template.steps.map((x,i,arr)=>({...x,fromAnchor:i?arr[i-1].anchor:null}));
   return {a,b,fromLabel:ref.label,targetLabel:b.id,steps,precision:'verified landmark route',note:template.note||'Landmark-by-landmark route.',ignoreStepFree,blocked:!stepOK,blockedReason:stepOK?null:'stepfree'};
 }
 return {a,b,fromLabel:ref.label,targetLabel:b.id,steps:[],precision:'none',note:'I cannot yet connect these two points through the mapped corridor network. I will not replace missing route data with “follow signs”. Re-anchor to a nearby room or landmark and I’ll calculate again.',blocked:true,blockedReason:'coverage'}
}
function computeCheckpointRoute(cp,options={}){
 const ref=currentStartRef(),ignoreStepFree=!!options.ignoreStepFree;
 if(!ref)return {a:null,b:null,fromLabel:'Starting point needed',targetLabel:cp.name,steps:[],precision:'none',note:'Tell me where you are first so I can calculate the route.',blocked:true,blockedReason:'start',targetCheckpoint:cp};
 const graph=buildGraphRoute(ref,[cp.id],cp.name,null,ignoreStepFree,{targetCheckpoint:cp});
 if(graph){graph.targetCheckpoint=cp;return graph}
 return {a:ref.room||null,b:null,fromLabel:ref.label,targetLabel:cp.name,steps:[],precision:'none',note:'I cannot yet connect your confirmed position to this destination through the mapped corridor network. Re-anchor to a nearby room or landmark and I’ll recalculate.',blocked:true,blockedReason:state.stepFree&&!ignoreStepFree?'stepfree':'coverage',targetCheckpoint:cp}
}
function plannerSummary(route){
 const q=routeQuality(route),count=route.steps?.length||0;
 let s=q.label+(count?' · '+count+' step'+(count===1?'':'s'):'');
 if(route.precision==='survey graph'||route.precision==='guided room section')s+=' · corridor route';
 return s
}
function renderPlanner(){
 const r=state.routeDraft;if(!r)return;
 $('plannerFrom').textContent=r.fromLabel||'Set starting point';$('plannerTo').textContent=r.targetLabel||'Destination';
 const q=routeQuality(r);$('plannerQuality').dataset.level=q.level;$('plannerQuality').innerHTML='<b>'+q.label+'</b><span>'+q.detail+'</span>';
 $('plannerSummary').textContent=plannerSummary(r);
 const warning=$('plannerWarning');warning.hidden=!r.note&&!r.blocked;warning.textContent=r.note||'';
 const begin=$('plannerBegin');begin.disabled=!!r.blocked&&r.blockedReason!=='start';begin.textContent=r.blocked?(r.blockedReason==='start'?'Choose starting point':r.blockedReason==='coverage'?'Route connection needed':'Route not verified'):'Start turn-by-turn';if($('plannerVisual'))$('plannerVisual').hidden=!r.tourScene;
 $('plannerGeneral').hidden=!(r.blocked&&r.blockedReason==='stepfree');
 $('plannerSwap').hidden=!(r.a&&r.b);
}
function openRoutePlanner(dest,options={}){
 if(dest)state.destination=dest;state.pendingDestination=state.destination;state.pendingCheckpoint=null;
 state.draftIgnoreStepFree=!!options.ignoreStepFree;state.routeDraft=computeRoomRoute(state.destination,{ignoreStepFree:state.draftIgnoreStepFree});renderPlanner();openSheet('plannerSheet')
}
function openCheckpointPlanner(cp,options={}){
 state.pendingCheckpoint=cp;state.pendingDestination=null;state.routeDraft=computeCheckpointRoute(cp,{ignoreStepFree:!!options.ignoreStepFree});state.draftIgnoreStepFree=!!options.ignoreStepFree;renderPlanner();openSheet('plannerSheet')
}
function routeTo(dest,options={}){if(!options.keepPlace){state.pendingPlace=null;state.destinationPlace=null}state.destination=dest;state.pendingDestination=dest;renderRooms();renderCheckpoints();openRoutePlanner(dest)}
function routeToCheckpoint(cp){state.pendingCheckpoint=cp;renderCheckpoints();openCheckpointPlanner(cp)}
function buzz(pattern=18){if(state.haptics&&navigator.vibrate)try{navigator.vibrate(pattern)}catch{}}
function saveActiveRoute(){
 if(!state.route?.b){store.set('cn_active_route',null);state.activeRoute=null;return}
 state.activeRoute={from:state.route.a?.id||null,to:state.route.b.id,index:state.routeIndex,at:Date.now(),ignoreStepFree:!!state.route.ignoreStepFree};
 store.set('cn_active_route',state.activeRoute);renderResumeRoute()
}
function beginRoute(route,resumeIndex=0){
 if(!route||route.blocked){renderPlanner();return}
 state.route=route;state.routeDraft=null;state.routeIndex=Math.max(0,Math.min(resumeIndex,Math.max(0,route.steps.length-1)));state.legWalkMeters=0;renderRooms();renderCheckpoints();closeSheets();$('assistantCard').hidden=true;$('tourSheet').hidden=true;document.body.classList.add('navigating');$('guideLens').hidden=false;$('routeCard').hidden=false;$('welcomeCard').hidden=true;renderRoute();focusRoute();focusCurrentLeg();rememberDestination(route.b);saveActiveRoute();buzz();if(state.voice)setTimeout(speak,120)
}
function finishRoute(){
 if(!state.route)return;const dest=state.route.b,target=state.route.targetCheckpoint;state.routeIndex=Math.max(0,state.route.steps.length-1);buzz([30,40,70]);toast('Destination reached');endRoute();if(dest)setTimeout(()=>selectEntity({type:'room',value:dest}),180);else if(target?.pos&&state.autoZoom)setTimeout(()=>flyTo(target.pos,2.4),180)
}
function endRoute(){if(state.cameraActive)stopCameraGuide();state.route=null;routeSvg.innerHTML='';renderRooms();renderCheckpoints();$('routeCard').hidden=true;$('guideLens').hidden=true;document.body.classList.remove('navigating');$('context').textContent='Blackpool Sixth · Find your way';renderTourGuide();store.set('cn_active_route',null);state.activeRoute=null;renderResumeRoute()}
function focusRoute(){
 routeSvg.innerHTML='';if(!state.route)return;
 const endpoint=[];
 const pathCps=allCheckpoints(),pathStart=state.route.path?routeEndpointCheckpoint(state.route.path,pathCps,'start'):null,pathEnd=state.route.path?routeEndpointCheckpoint(state.route.path,pathCps,'end'):null;
 const pa=state.route.a?(posFor(state.route.a)||pathStart?.pos):state.position?.pos,pb=state.route.b?(posFor(state.route.b)||pathEnd?.pos):state.route.targetCheckpoint?.pos;
 if(pa)endpoint.push('<circle class="route-endpoint start" cx="'+pa[1]+'" cy="'+pa[0]+'" r="16"/><text class="route-endpoint-label" x="'+pa[1]+'" y="'+(pa[0]+5)+'">S</text>');
 if(pb)endpoint.push('<circle class="route-endpoint end" cx="'+pb[1]+'" cy="'+pb[0]+'" r="16"/><text class="route-endpoint-label" x="'+pb[1]+'" y="'+(pb[0]+5)+'">D</text>');
 let routeMarkup='';
 if(['survey graph','guided room section'].includes(state.route.precision)&&state.route.path){const cps=allCheckpoints(),byId=new Map(cps.map(c=>[c.id,c])),points=state.route.path.nodes.map(id=>byId.get(id)?.pos).filter(Boolean);if(points.length===state.route.path.nodes.length&&points.length>1){const d=points.map((p,i)=>(i?'L ':'M ')+p[1]+' '+p[0]).join(' ');routeMarkup='<path class="route-line surveyed" d="'+d+'"/>';const ys=points.map(p=>p[0]),xs=points.map(p=>p[1]);if(state.autoZoom)fitBounds([[Math.min(...ys)-90,Math.min(...xs)-90],[Math.max(...ys)+90,Math.max(...xs)+90]])}}
 routeSvg.innerHTML=routeMarkup+endpoint.join('');
 if(!routeMarkup){if(pa&&pb&&state.autoZoom)fitBounds([[Math.min(pa[0],pb[0])-110,Math.min(pa[1],pb[1])-110],[Math.max(pa[0],pb[0])+110,Math.max(pa[1],pb[1])+110]]);else if(pb&&state.autoZoom)flyTo(pb,2.2)}
}
function focusCurrentLeg(){
 if(!state.route||!state.autoZoom)return;const s=currentRouteStep(),from=checkpointBy(s?.fromAnchor),to=checkpointBy(s?.anchor);
 if(from?.pos&&to?.pos){fitBounds([[Math.min(from.pos[0],to.pos[0])-75,Math.min(from.pos[1],to.pos[1])-75],[Math.max(from.pos[0],to.pos[0])+75,Math.max(from.pos[1],to.pos[1])+75]])}
 else if(to?.pos)flyTo(to.pos,2.35);else if(state.position?.pos)flyTo(state.position.pos,2.15);else if(state.route.b)focusRoom(state.route.b)
}
function currentRouteStep(){return state.route?.steps?.[state.routeIndex]||null}
function renderRoute(){
 const r=state.route;if(!r)return;const step=currentRouteStep();if(!step)return;const pct=((state.routeIndex+1)/r.steps.length)*100,q=routeQuality(r),confidence=Core.routeConfidence(r,state.confidence);
 $('routeEyebrow').textContent=q.label.toUpperCase();$('routeTitle').textContent=(r.fromLabel||'Start')+' → '+r.targetLabel;$('routeStatus').textContent='Step '+(state.routeIndex+1)+' of '+r.steps.length+' · '+q.label;
 $('routeTrust').dataset.level=q.level;$('routeTrust').innerHTML='<b>'+q.label+'</b><span>'+q.detail+(r.note?' '+r.note:'')+'</span>';
 $('nextInstruction').innerHTML='<span class="instruction-icon">'+(step.icon||'↑')+'</span><span>'+step.text+'</span>';
 const next=r.steps[state.routeIndex+1];$('routeNextPreview').hidden=!next;$('routeNextPreview').textContent=next?'Next: '+next.text:'';
 $('routeSteps').innerHTML=r.steps.map((s,i)=>'<li class="'+(i===state.routeIndex?'current':i<state.routeIndex?'done':'')+'"><b>'+(s.icon||'•')+'</b> '+s.text+'</li>').join('');$('routeProgress').style.width=pct+'%';
 const cp=checkpointBy(step.confirmCheckpointId||step.anchor);$('routeLandmark').hidden=!step.confirm&&!cp;if(step.confirm||cp){$('routeLandmarkIcon').textContent=step.icon||checkpointIcon(cp?.type);$('routeLandmarkName').textContent=cp?.name||'Visual landmark';$('routeLandmarkHint').textContent=step.confirm||''}
 $('confirmLandmark').hidden=!(cp||step.confirm);$('confirmLandmark').textContent=cp?'✓ I can see '+cp.name:'✓ I can see this';
 $('nextStep').textContent=state.routeIndex===r.steps.length-1?'Finish':'Done — next';$('prevStep').disabled=state.routeIndex===0;
 $('context').textContent='Navigating to '+r.targetLabel;renderGuideLens();renderTourGuide();renderCameraGuide();saveActiveRoute()
}
function renderGuideLens(){if(!state.route||$('guideLens').hidden)return;const s=currentRouteStep(),q=routeQuality(state.route);$('guideLensIcon').textContent=s?.icon||'↑';$('guideLensText').textContent=s?.text||'';$('guideLensMeta').textContent=(state.heading?Math.round(state.heading)+'° heading · ':'')+q.label}
function renderTourGuide(){if(!$('tourGuideBar'))return;if(!state.route){$('tourGuideBar').hidden=true;return}const s=currentRouteStep();$('tourGuideBar').hidden=false;$('tourGuideIcon').textContent=s?.icon||'↑';$('tourGuideText').textContent=s?.text||''}
function speak(){if(!state.route||!('speechSynthesis'in window))return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(currentRouteStep().text);u.rate=.95;speechSynthesis.speak(u)}
function nextRouteStep(){if(!state.route)return;if(state.routeIndex<state.route.steps.length-1){state.routeIndex++;state.legWalkMeters=0;renderRoute();focusCurrentLeg();buzz();if(state.voice)speak()}else finishRoute()}
function handleRouteAnchor(c){
 if(!state.route)return;const idx=state.route.steps.findIndex(s=>s.anchor===c.id||s.confirmCheckpointId===c.id);
 if(idx>=0){state.routeIndex=Math.min(idx+1,state.route.steps.length-1);renderRoute();focusCurrentLeg();buzz();if(state.voice)speak();return}
 rerouteFromCurrent()
}
function rerouteFromCurrent(){
 if(!state.route)return;let nr=null;if(state.route.b)nr=computeRoomRoute(state.route.b,{ignoreStepFree:state.route.ignoreStepFree});else if(state.route.targetCheckpoint)nr=computeCheckpointRoute(state.route.targetCheckpoint,{ignoreStepFree:state.route.ignoreStepFree});
 if(nr&&!nr.blocked&&(nr.precision==='survey graph'||nr.precision==='guided room section')){toast('Route updated from your confirmed position');beginRoute(nr,0)}
 else {toast('Position updated. No better surveyed route is available yet');renderRoute()}
}
function openLostRecovery(){
 if(!state.route){openPosition();return}const step=currentRouteStep();$('lostContext').innerHTML='<b>Current instruction</b><p>'+step.text+'</p><small>Choose something you can definitely see. We will re-anchor or rebuild the route rather than guessing.</small>';
 const anchors=state.route.steps.map((s,i)=>({s,i,c:checkpointBy(s.confirmCheckpointId||s.anchor)})).filter(x=>x.c||x.s.confirm).sort((x,y)=>Math.abs(x.i-state.routeIndex)-Math.abs(y.i-state.routeIndex));
 $('lostChoices').innerHTML=anchors.slice(0,8).map(x=>'<button class="result" data-route-index="'+x.i+'"><span class="result-icon">'+(x.s.icon||'◉')+'</span><span class="result-copy"><b>'+(x.c?.name||'Route landmark')+'</b><small>'+((x.i<state.routeIndex?'Earlier · ':x.i>state.routeIndex?'Ahead · ':'Current · ')+(x.s.confirm||x.s.text))+'</small></span><em>'+(x.c?.pos?'Anchor':'Guide')+'</em></button>').join('')||'<p class="empty">No surveyed landmarks on this route yet. Use the 360° visual check or identify a room number.</p>';
 $('lostChoices').querySelectorAll('[data-route-index]').forEach(b=>b.onclick=()=>{const i=+b.dataset.routeIndex,s=state.route.steps[i],cp=checkpointBy(s.confirmCheckpointId||s.anchor);state.routeIndex=i;if(cp)anchorAt(cp);else{renderRoute();focusCurrentLeg()}closeSheets();toast('Route re-oriented')});openSheet('lostSheet')
}
$('plannerChangeStart').onclick=()=>{closeSheets();openSearch('start')};
$('plannerChangeDest').onclick=()=>{closeSheets();openSearch('destination')};
$('plannerSwap').onclick=()=>{const r=state.routeDraft;if(!r?.a||!r?.b)return;const old=r.a;state.start=r.b;const p=posFor(r.b),cp=allCheckpoints().find(c=>c.room===r.b.id&&c.pos);if(p)setPosition(p,'room start: '+r.b.id,r.b.id,cp?.id||null,100);else{state.position={pos:null,source:'room start: '+r.b.id,roomId:r.b.id,checkpointId:null,at:Date.now()};store.set('cn_position',state.position);renderPosition()}state.destination=old;openRoutePlanner(old)};
$('plannerBegin').onclick=()=>{if(state.routeDraft?.blockedReason==='start'){openPosition();return}beginRoute(state.routeDraft)};$('plannerVisual').onclick=()=>{const s=state.routeDraft?.tourScene;if(s)openTour(s,state.routeDraft?.targetLabel);else openTourPicker()};
$('plannerGeneral').onclick=()=>{if(state.pendingPlace)openPlacePlanner(state.pendingPlace,bestReachableCheckpoint(placeCandidates(state.pendingPlace)),{ignoreStepFree:true});else if(state.pendingCheckpoint)openCheckpointPlanner(state.pendingCheckpoint,{ignoreStepFree:true});else if(state.destination)openRoutePlanner(state.destination,{ignoreStepFree:true})};
$('nextStep').onclick=nextRouteStep;$('prevStep').onclick=()=>{if(state.route&&state.routeIndex>0){state.routeIndex--;renderRoute();focusCurrentLeg()}};
$('speakStep').onclick=speak;$('endRoute').onclick=endRoute;$('visualCheck').onclick=openRouteVisual;$('recalibrate').onclick=openPosition;$('guideLensClose').onclick=()=>$('guideLens').hidden=true;$('tourBackToGuide').onclick=()=>{closeTour();$('routeCard').hidden=false};
$('confirmLandmark').onclick=()=>{const s=currentRouteStep();if(!s)return;const cp=checkpointBy(s.confirmCheckpointId||s.anchor);if(cp)anchorAt(cp);else nextRouteStep()};
$('lostBtn').onclick=openLostRecovery;$('lostRoom').onclick=()=>{closeSheets();openSearch('reanchor')};
$('lostTour').onclick=openRouteVisual;$('lostPosition').onclick=openPosition;
/* ---------- immersive tour ---------- */
function roomTourScene(roomId){const local=state.tourLinks?.[roomId];if(local)return {mediaName:local,exact:true,source:'survey'};return D.roomTourScenes?.[roomId]||null}
function tourSceneForSelection(sel){if(!sel)return null;if(sel.type==='room')return roomTourScene(sel.value.id);if(sel.type==='place'){const direct=D.tourScenes?.[sel.value.id];if(direct)return direct;const r=targetRoom(sel);return r?roomTourScene(r.id):null}return null}
function checkpointTourScene(cp){if(!cp)return null;if(cp.tourScene)return {mediaName:cp.tourScene,exact:true,source:'survey'};if(cp.room)return roomTourScene(cp.room);return null}
function tourSceneUrl(scene){if(!scene?.mediaName)return null;const base=D.tourUrl.endsWith('/')?D.tourUrl:D.tourUrl+'/';return base+'index.htm?skip-loading=1#media-name='+encodeURIComponent(scene.mediaName)}
function sceneForCurrentRoute(){const d=cameraLegData?.();return checkpointTourScene(d?.to)||tourSceneForSelection(state.destinationPlace?{type:'place',value:state.destinationPlace}:state.route?.b?{type:'room',value:state.route.b}:null)}
function openTour(scene=null,title=null){
 if(typeof scene==='string')scene={mediaName:scene,exact:true};if(!scene)scene=tourSceneForSelection(state.selected)||sceneForCurrentRoute();if(!scene){openTourPicker();return}
 const url=tourSceneUrl(scene);if(!url){toast('No linked 360° scene for this location');return}closeSheets();$('tourSheet').hidden=false;state.tourScene=scene;state.tourUrl=url;$('tourTitle').textContent=title||scene.mediaName;$('tourMeta').textContent=(scene.exact?'Opening the linked panorama directly.':'Opening the closest relevant panorama. ')+(scene.note||'');if($('tourFrame').src!==url)$('tourFrame').src=url;renderTourGuide();document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode==='tour'))
}
function openTourPicker(){
 const entries=Object.entries(D.tourScenes||{}).map(([id,scene])=>({place:placeBy(id),scene})).filter(x=>x.place&&x.scene);
 $('tourPickerResults').innerHTML=entries.map(x=>'<button class="result" data-tour-place="'+x.place.id+'"><span class="result-icon">'+(x.place.icon||'◉')+'</span><span class="result-copy"><b>'+x.place.name+'</b><small>'+x.scene.mediaName+(x.scene.exact?' · exact linked scene':' · nearby scene')+'</small></span><em>360°</em></button>').join('')||'<p class="empty">No direct panorama links are configured yet.</p>';
 $('tourPickerResults').querySelectorAll('[data-tour-place]').forEach(b=>b.onclick=()=>{const p=placeBy(b.dataset.tourPlace);if(p)openTour(D.tourScenes[p.id],p.name)});openSheet('tourPickerSheet')
}
function openRouteVisual(){const s=sceneForCurrentRoute();if(s)openTour(s,state.route?.targetLabel||s.mediaName);else openTourPicker()}
function closeTour(){$('tourSheet').hidden=true;document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode==='map'))}
$('closeTour').onclick=closeTour;$('openTourExternal').onclick=()=>{if(state.tourUrl)window.open(state.tourUrl,'_blank','noopener')};function setMode(mode){document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));if(mode==='tour'){openTourPicker();return}if(mode==='guide'){showAssistant();return}if(mode==='map')$('tourSheet').hidden=true}document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));

/* ---------- concierge / intent recognition ---------- */
function addFeed(s,who){const d=document.createElement('div');d.className=who;d.textContent=s;$('assistantFeed').appendChild(d);$('assistantFeed').scrollTop=$('assistantFeed').scrollHeight}
function showAssistant(prefill=''){$('assistantCard').hidden=false;renderSuggestions();if(prefill){$('assistantInput').value=prefill;setTimeout(()=>$('assistantSend').click(),30)}else $('assistantInput').focus()}
function renderSuggestions(){const box=$('assistantSuggestions');box.innerHTML=[...D.intentGroups.slice(0,6),{id:'lost',label:'I’m lost'}].map(i=>'<button data-intent="'+i.id+'">'+i.label+'</button>').join('');box.querySelectorAll('[data-intent]').forEach(b=>b.onclick=()=>{if(b.dataset.intent==='lost'){addFeed('I’m lost','me');addFeed('I’ll re-orient you from something you can see rather than guessing.','bot');openLostRecovery();return}const it=D.intentGroups.find(i=>i.id===b.dataset.intent);if(it)resolveIntent(it)})}
function bestPlace(text){const q=norm(text);let best=null,score=0;for(const p of D.places){const hay=[p.name,p.kind,p.description,...(p.keywords||[])].map(norm);let s=0;for(const h of hay){if(q===h)s=Math.max(s,100);else if(q.includes(h)||h.includes(q))s=Math.max(s,70);for(const w of q.split(' '))if(w.length>2&&h.includes(w))s+=7}if(s>score){score=s;best=p}}return score>=12?best:null}
function bestIntent(text){const q=norm(text);let best=null,score=0;for(const it of D.intentGroups){let s=0;for(const k of it.keywords||[]){const h=norm(k);if(q===h)s+=100;else if(q.includes(h)||h.includes(q))s+=50;for(const w of q.split(' '))if(w.length>2&&h.includes(w))s+=5}if(s>score){score=s;best=it}}return score>=10?best:null}
function resolveIntent(it){const p=placeBy(it.place);if(!p)return;const r=p.room?roomBy(p.room):null;addFeed(p.name+': '+p.description+(r?' I can plan a route to '+r.id+'.':' I can show the real campus tour while its exact indoor anchor is being surveyed.'),'bot');selectEntity({type:'place',value:p})}
function nearestFacility(type){if(!state.position?.pos)return null;return allCheckpoints().filter(c=>c.type===type&&c.pos).map(c=>({c,d:Math.hypot(c.pos[0]-state.position.pos[0],c.pos[1]-state.position.pos[1])})).sort((a,b)=>a.d-b.d)[0]?.c||null}
function assistant(msg){
 const text=(msg||'').trim();if(!text)return;addFeed(text,'me');const low=text.toLowerCase();
 if(/where am i/.test(low)&&!/lost/.test(low)){const r=state.position?.roomId&&roomBy(state.position.roomId),cp=state.position?.checkpointId&&checkpointBy(state.position.checkpointId);addFeed(cp?'Your last precise/confirmed point is '+cp.name+'.':r?'Your current room is set to '+r.id+'.':state.lastConfirmed?'Your last confirmed landmark is '+state.lastConfirmed.name+'.':'I do not have a confirmed indoor position yet. Choose a room or landmark and I will anchor you there.','bot');return}
 if(/i(?:'m| am) lost|\blost\b/.test(low)){addFeed(state.lastConfirmed?'Your last confirmed anchor was '+state.lastConfirmed.name+'. I’ll help you re-orient from something you can see.':'I won’t guess your location. Pick a landmark, room number, or use the 360° view.','bot');openLostRecovery();return}
 if(/step[- ]?free|wheelchair|accessible/.test(low)){state.stepFree=true;store.set('cn_stepfree',true);$('stepFreeToggle').checked=true;addFeed('Step-free mode is on. A route will only be called step-free when every surveyed link is explicitly verified step-free.','bot')}
 const seenText=low.replace(/^(i can see|i see|i am by|i'm by|near)\s+/,'');const seen=checkpointMatches(seenText)[0];
 if(seen&&/i can see|i see|i am by|i'm by|near/.test(low)){anchorAt(seen.c);addFeed('Great — I’ve re-anchored you to '+seen.c.name+(seen.c.pos?' precisely on the map':' as a route landmark')+'.','bot');return}
 const facilityType=/toilet|loo|bathroom|wc/.test(low)?'toilet':/printer|print|refill/.test(low)?'printer':/water|fountain|bottle/.test(low)?'water':/lift|elevator/.test(low)?'lift':null;
 if(facilityType&&/nearest|closest|where/.test(low)){const cp=nearestFacility(facilityType);if(cp){addFeed('The nearest surveyed '+facilityType+' anchor is '+cp.name+'. I’ll plan from your current confirmed point — I will not move your location to the destination.','bot');routeToCheckpoint(cp)}else addFeed('I know you need a '+facilityType+', but there is no precise surveyed '+facilityType+' anchor near your current confirmed position yet. Use a confirmed room or landmark to re-anchor and I’ll calculate a route from there.','bot');return}
 let m=low.match(/(?:i(?:'m| am) at|i am in|start(?:ing)? at|from)\s+([a-z]\d{3}[a-z]?)/i);if(m){const r=roomBy(m[1]);if(r){state.start=r;const p=posFor(r),cp=allCheckpoints().find(c=>c.room===r.id&&c.pos);if(p)setPosition(p,'room start: '+r.id,r.id,cp?.id||null,100);else{state.position={pos:null,source:'room start: '+r.id,roomId:r.id,checkpointId:null,at:Date.now()};store.set('cn_position',state.position)}addFeed('Got it — '+r.id+' in '+r.bldg+', '+floorLabel(r.floor)+' is your start.'+(p?' Your position is anchored to its verified pin.':' Its exact doorway still needs survey verification.'),'bot');if(state.destination)openRoutePlanner(state.destination);return}}
 const code=(text.match(/\b[A-Z]\d{3}[A-Z]?\b/i)||[])[0];if(code){const r=roomBy(code);if(r){const wantsRoute=/take|go|directions|route|guide|to\b/.test(low);addFeed(r.id+' is in '+r.bldg+', '+floorLabel(r.floor)+'. '+(verified(r)?'Its doorway pin is verified.':'The correct building/floor are known; I will not invent an exact doorway.'),'bot');if(wantsRoute)routeTo(r);else selectEntity({type:'room',value:r});return}}
 const it=bestIntent(text);if(it){resolveIntent(it);return}const p=bestPlace(text);if(p){const r=p.room?roomBy(p.room):null;addFeed(p.name+': '+p.description+(r?' It is linked to '+r.id+'.':' Use Explore for a real visual look while its exact indoor anchor is being surveyed.'),'bot');if(/take|go|directions|route|guide/.test(low)&&r)routeTo(r);else selectEntity({type:'place',value:p});return}
 addFeed('I can help with rooms, exams, IT, study, food, support, accessibility, facilities, “I’m lost”, and visible landmarks. Try “take me to B014” or “I can see the student lockers”.','bot')
}
$('assistantClose').onclick=()=>$('assistantCard').hidden=true;$('assistantSend').onclick=()=>{const v=$('assistantInput').value;$('assistantInput').value='';assistant(v)};$('assistantInput').onkeydown=e=>{if(e.key==='Enter')$('assistantSend').click()};
/* ---------- home / saved / settings ---------- */
function rememberDestination(room){if(!room)return;state.recent=[{id:room.id,at:Date.now()},...(state.recent||[]).filter(x=>x.id!==room.id)].slice(0,8);store.set('cn_recent',state.recent)}
function renderHome(){const icons={'it-help':'⌘','exam-help':'✓','study':'▤','food':'☕','support':'♥','sport':'◉','arts':'◇','toilet':'WC','access':'↕','careers':'↗'};$('intentGrid').innerHTML=D.intentGroups.slice(0,8).map(i=>'<button class="intent" data-home-intent="'+i.id+'"><i>'+(icons[i.id]||'✦')+'</i>'+i.label+'</button>').join('');$('intentGrid').querySelectorAll('[data-home-intent]').forEach(b=>b.onclick=()=>{const it=D.intentGroups.find(i=>i.id===b.dataset.homeIntent);if(it)resolveIntent(it)});renderResumeRoute()}
function renderResumeRoute(){const b=$('resumeRoute');if(!b)return;const a=state.activeRoute;if(!a||Date.now()-a.at>8*60*60*1000||!roomBy(a.to)){b.hidden=true;return}const total=state.route?.b?.id===a.to?state.route.steps.length:null;b.hidden=false;b.innerHTML='<span>↗</span><span><b>Resume route to '+a.to+'</b><small>'+(total?'Step '+(a.index+1)+' of '+total:'Tap to rebuild from your saved start')+'</small></span><i>›</i>'}
$('resumeRoute').onclick=()=>{const a=state.activeRoute;if(!a)return;const from=a.from&&roomBy(a.from),to=roomBy(a.to);if(!to)return;if(from){state.start=from;const p=posFor(from),cp=allCheckpoints().find(c=>c.room===from.id&&c.pos);if(p&&!state.position)setPosition(p,'saved route start: '+from.id,from.id,cp?.id||null,100)}state.destination=to;const route=computeRoomRoute(to,{ignoreStepFree:!!a.ignoreStepFree});if(route&&!route.blocked)beginRoute(route,a.index||0);else openRoutePlanner(to,{ignoreStepFree:!!a.ignoreStepFree})};
$('askAnything').onclick=()=>showAssistant();$('welcomeClose').onclick=()=>$('welcomeCard').hidden=true;
function renderSaved(){const arr=[...state.saved];$('savedResults').innerHTML=arr.map(key=>{const [kind,id]=key.split(':');const sel=kind==='room'?{type:'room',value:roomBy(id)}:{type:'place',value:placeBy(id)};return sel.value?resultMarkup(sel):''}).join('')||'<p class="empty">Nothing saved yet.</p>';bindResults($('savedResults'))}
$('menuBtn').onclick=()=>{openSheet('settingsSheet');$('stepFreeToggle').checked=state.stepFree;$('voiceToggle').checked=state.voice;$('profileSelect').value=state.profile;$('hapticToggle').checked=state.haptics;$('autoZoomToggle').checked=state.autoZoom;$('strideInput').value=state.strideM.toFixed(2)};
$('positionBtn').onclick=openPosition;$('openTourSettings').onclick=openTourPicker;$('clearHeadingCalibration').onclick=()=>{state.headingCal={};store.set('cn_heading_cal',{});renderPosition();renderCameraGuide();toast('Heading calibration cleared')};
$('stepFreeToggle').onchange=e=>{state.stepFree=e.target.checked;store.set('cn_stepfree',state.stepFree);if(state.routeDraft&&(state.destination||state.pendingCheckpoint||state.pendingPlace)){state.pendingPlace?openPlacePlanner(state.pendingPlace,bestReachableCheckpoint(placeCandidates(state.pendingPlace))):state.pendingCheckpoint?openCheckpointPlanner(state.pendingCheckpoint):openRoutePlanner(state.destination)}};
$('voiceToggle').onchange=e=>{state.voice=e.target.checked;store.set('cn_voice',state.voice)};
$('hapticToggle').onchange=e=>{state.haptics=e.target.checked;store.set('cn_haptics',state.haptics);if(state.haptics)buzz()};
$('autoZoomToggle').onchange=e=>{state.autoZoom=e.target.checked;store.set('cn_autozoom',state.autoZoom)};$('strideInput').onchange=e=>{const v=Math.max(.4,Math.min(1.2,Number(e.target.value)||.72));state.strideM=v;e.target.value=v.toFixed(2);store.set('cn_stride_m',v)};
$('profileSelect').onchange=e=>{state.profile=e.target.value;store.set('cn_profile',state.profile);toast('Route profile: '+state.profile);if(state.routeDraft){state.pendingCheckpoint?openCheckpointPlanner(state.pendingCheckpoint,{ignoreStepFree:state.draftIgnoreStepFree}):state.destination&&openRoutePlanner(state.destination,{ignoreStepFree:state.draftIgnoreStepFree})}};
/* ---------- precision map studio ---------- */
$('studioBtn').onclick=()=>{renderStudio();openSheet('studioSheet')};
function studioTab(name){document.querySelectorAll('[data-studio-tab]').forEach(b=>b.classList.toggle('active',b.dataset.studioTab===name));['rooms','anchors','links'].forEach(n=>$('studio'+n[0].toUpperCase()+n.slice(1)+'Panel').hidden=n!==name)}
document.querySelectorAll('[data-studio-tab]').forEach(b=>b.onclick=()=>studioTab(b.dataset.studioTab));
function surveyAudit(){const cps=allCheckpoints().filter(c=>c.pos),edges=allEdges(),degree=new Map(cps.map(c=>[c.id,0]));for(const e of edges){if(degree.has(e.from))degree.set(e.from,degree.get(e.from)+1);if(degree.has(e.to))degree.set(e.to,degree.get(e.to)+1)}const isolated=[...degree].filter(([,n])=>n===0).length,unsafe=edges.filter(e=>e.stepFree!==true).length,closed=edges.filter(e=>e.closed===true).length,measured=edges.filter(e=>Number(e.meters)>0).length;return {isolated,unsafe,closed,measured}}
function tourOptions(){return '<option value="">No linked 360° scene</option>'+[...(D.tourMedia||[])].sort().map(n=>'<option value="'+n.replace(/"/g,'&quot;')+'">'+n+'</option>').join('')}
function syncStudioRoomTour(){const id=$('studioRoom').value,scene=roomTourScene(id);$('studioRoomTour').value=scene?.mediaName||''}
function renderStudio(){
 const sorted=[...D.rooms].sort((a,b)=>a.id.localeCompare(b.id,undefined,{numeric:true}));$('studioRoom').innerHTML=sorted.map(r=>'<option value="'+r.id+'">'+r.id+' — '+r.bldg+' '+floorLabel(r.floor)+(verified(r)?' ✓':'')+'</option>').join('');
 $('studioRoomTour').innerHTML=tourOptions();syncStudioRoomTour();
 $('anchorType').innerHTML=(D.surveyTypes||[]).map(t=>'<option value="'+t.id+'">'+t.icon+' '+t.label+'</option>').join('');if($('anchorRoomLink'))$('anchorRoomLink').innerHTML='<option value="">Not linked to a room</option>'+sorted.map(r=>'<option value="'+r.id+'">'+r.id+'</option>').join('');$('anchorTourScene').innerHTML=tourOptions();
 const buildings=[...new Set(D.rooms.map(r=>r.bldg))];$('anchorBuilding').innerHTML=buildings.map(b=>'<option>'+b+'</option>').join('');
 const cps=allCheckpoints();const opts=cps.filter(c=>c.pos).map(c=>'<option value="'+c.id+'">'+c.name+(c.seed?' · built-in':'')+'</option>').join('');$('edgeFrom').innerHTML=opts;$('edgeTo').innerHTML=opts;
 $('anchorList').innerHTML=(state.survey.checkpoints||[]).map(c=>'<div class="result"><span class="result-icon">'+checkpointIcon(c.type)+'</span><span class="result-copy"><b>'+c.name+'</b><small>'+c.bldg+' · '+floorLabel(c.floor)+' · '+c.id+(c.tourScene?' · 360° '+c.tourScene:'')+'</small></span><button class="tiny-btn" data-copy-cp="'+c.id+'">QR link</button><button class="tiny-btn danger" data-del-cp="'+c.id+'">×</button></div>').join('')||'<p class="empty">No custom survey anchors yet.</p>';
 $('edgeList').innerHTML=(state.survey.edges||[]).map((e,i)=>'<div class="result"><span class="result-icon">↔</span><span class="result-copy"><b>'+(checkpointBy(e.from)?.name||e.from)+' → '+(checkpointBy(e.to)?.name||e.to)+'</b><small>'+(e.instruction||'Connected')+' · '+(e.mode||'corridor')+(e.meters?' · '+e.meters+'m':'')+' · '+e.access+(e.stepFree?' · step-free':' · step-free unverified')+(e.oneWay?' · one-way':'')+(e.closed?' · CLOSED':'')+'</small></span><button class="tiny-btn danger" data-del-edge="'+i+'">×</button></div>').join('')||'<p class="empty">No surveyed anchor links yet.</p>';
 $('anchorList').querySelectorAll('[data-del-cp]').forEach(b=>b.onclick=()=>{const id=b.dataset.delCp;state.survey.checkpoints=state.survey.checkpoints.filter(c=>c.id!==id);state.survey.edges=state.survey.edges.filter(e=>e.from!==id&&e.to!==id);saveSurvey();renderCheckpoints();renderStudio()});
 $('anchorList').querySelectorAll('[data-copy-cp]').forEach(b=>b.onclick=async()=>{const u=new URL(location.href);u.search='';u.searchParams.set('cp',b.dataset.copyCp);try{await navigator.clipboard.writeText(u.toString());toast('Checkpoint link copied')}catch{prompt('Copy this checkpoint URL',u.toString())}});
 $('edgeList').querySelectorAll('[data-del-edge]').forEach(b=>b.onclick=()=>{state.survey.edges.splice(+b.dataset.delEdge,1);saveSurvey();renderStudio()});updateAccuracy()
}
$('studioRoom').onchange=syncStudioRoomTour;$('studioPlace').onclick=()=>calibrationMode(roomBy($('studioRoom').value));
$('studioLinkTour').onclick=()=>{const id=$('studioRoom').value,scene=$('studioRoomTour').value;if(scene)state.tourLinks[id]=scene;else delete state.tourLinks[id];store.set('cn_tour_links',state.tourLinks);renderRooms();toast(scene?'360° scene linked to '+id:'360° scene link removed')};
$('anchorPlace').onclick=()=>{const name=$('anchorName').value.trim();if(!name){toast('Give the anchor a name');return}const id='SURVEY_'+Date.now().toString(36).toUpperCase();state.placingAnchor={id,name,type:$('anchorType').value,bldg:$('anchorBuilding').value,floor:$('anchorFloor').value,room:$('anchorRoomLink')?.value||null,tourScene:$('anchorTourScene')?.value||null,keywords:[name.toLowerCase()]};closeSheets();mapEl.classList.add('calibrating');toast('Tap the exact position for '+name)};
$('edgeAdd').onclick=()=>{const from=$('edgeFrom').value,to=$('edgeTo').value;if(!from||!to||from===to){toast('Choose two different anchors');return}state.survey.edges.push({from,to,instruction:$('edgeInstruction').value.trim()||('Continue to '+(checkpointBy(to)?.name||to)+'.'),reverseInstruction:$('edgeReverseInstruction')?.value.trim()||'',mode:$('edgeMode')?.value||'corridor',meters:+($('edgeMeters')?.value||0)||null,stepFree:$('edgeStepFree').checked,access:$('edgeAccess').value,oneWay:!!$('edgeOneWay')?.checked,closed:!!$('edgeClosed')?.checked,seconds:+($('edgeSeconds')?.value||0)||null,createdAt:new Date().toISOString()});saveSurvey();renderStudio();toast('Survey link added')};
$('exportData').onclick=()=>{const blob=new Blob([JSON.stringify({version:6,created:new Date().toISOString(),roomCalibration:state.cal,survey:state.survey,tourLinks:state.tourLinks,headingCalibration:state.headingCal},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='campus-navigator-v6-survey.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)};
$('importData').onchange=e=>{const f=e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{try{const j=JSON.parse(rd.result);state.cal=j.roomCalibration||j.calibration||state.cal;state.survey=j.survey||state.survey;state.tourLinks=j.tourLinks||state.tourLinks;state.headingCal=j.headingCalibration||state.headingCal;store.set('cn_calibration',state.cal);store.set('cn_tour_links',state.tourLinks);store.set('cn_heading_cal',state.headingCal);saveSurvey();renderRooms();renderCheckpoints();renderStudio();toast('Survey imported')}catch{toast('Invalid survey file')}};rd.readAsText(f)};
$('clearCalibration').onclick=()=>{if(confirm('Clear all local room corrections, anchors, links, 360° links and heading calibration?')){state.cal={};state.survey=structuredClone(EMPTY_SURVEY);state.tourLinks={};state.headingCal={};store.set('cn_calibration',{});store.set('cn_tour_links',{});store.set('cn_heading_cal',{});saveSurvey();renderRooms();renderCheckpoints();renderStudio()}};

document.querySelectorAll('.bottom button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.bottom button').forEach(x=>x.classList.remove('active'));b.classList.add('active');const t=b.dataset.tab;if(t==='home'){$('welcomeCard').hidden=false;fitAll()}if(t==='find')$('searchBtn').click();if(t==='tour')openTourPicker();if(t==='saved'){renderSaved();openSheet('savedSheet')}});

/* ---------- startup / deep links ---------- */
window.addEventListener('online',()=>$('offline').hidden=true);window.addEventListener('offline',()=>$('offline').hidden=false);$('offline').hidden=navigator.onLine;
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
renderHome();renderRooms();renderCheckpoints();renderPosition();renderStudio();renderSuggestions();$('stepFreeToggle').checked=state.stepFree;$('voiceToggle').checked=state.voice;$('profileSelect').value=state.profile;$('hapticToggle').checked=state.haptics;$('autoZoomToggle').checked=state.autoZoom;$('strideInput').value=state.strideM.toFixed(2);renderResumeRoute();
const url=new URL(location.href),action=url.searchParams.get('action'),cpId=url.searchParams.get('cp'),fromId=url.searchParams.get('from'),toId=url.searchParams.get('to'),placeId=url.searchParams.get('place');
setTimeout(()=>{
 if(img.complete)fitAll();
 if(cpId){const cp=checkpointBy(cpId);if(cp){anchorAt(cp);if(toId&&roomBy(toId))routeTo(roomBy(toId));else showAssistant('I am by '+cp.name)}}
 else if(fromId&&roomBy(fromId)){const r=roomBy(fromId);state.start=r;const p=posFor(r),cp=allCheckpoints().find(c=>c.room===r.id&&c.pos);if(p)setPosition(p,'deep-link start: '+r.id,r.id,cp?.id||null,100)}
 if(toId&&roomBy(toId)&&!cpId){state.destination=roomBy(toId);openRoutePlanner(state.destination)}
 if(placeId&&placeBy(placeId)){routeToPlace(placeBy(placeId))}
 if(action==='search')openSearch('browse');if(action==='assistant')showAssistant();if(action==='tour')openTourPicker()
},80);
window.__CN_BOOTED=true;
const bootGuard=document.getElementById('bootGuard');
if(bootGuard){
  bootGuard.style.transition='opacity .18s ease';
  bootGuard.style.opacity='0';
  bootGuard.style.pointerEvents='none';
  setTimeout(()=>bootGuard.remove(),220);
}
})();
