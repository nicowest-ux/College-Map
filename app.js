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
 recent:store.get('cn_recent',[]),searchMode:'browse',pendingDestination:null,pendingCheckpoint:null,routeDraft:null,
 haptics:store.get('cn_haptics',true),autoZoom:store.get('cn_autozoom',true),stepsSinceAnchor:0,
 activeRoute:store.get('cn_active_route',null),draftIgnoreStepFree:false
};
if(!state.survey||!Array.isArray(state.survey.checkpoints)||!Array.isArray(state.survey.edges))state.survey=structuredClone(EMPTY_SURVEY);
for(const key of [...state.saved]){if(!String(key).includes(':')){state.saved.delete(key);state.saved.add('room:'+key)}}store.set('cn_saved',[...state.saved]);

/* ---------- zero-dependency image map engine ---------- */
const mapEl=$('map');
mapEl.innerHTML=`<div id="mapStage" class="map-stage"><img id="floorImage" draggable="false" alt="Campus floor plans"><svg id="routeSvg" class="route-svg" viewBox="0 0 ${D.image.width} ${D.image.height}" preserveAspectRatio="none"></svg><div id="zoneLayer" class="map-layer zone-layer"></div><div id="roomLayer" class="map-layer"></div><div id="checkpointLayer" class="map-layer"></div><div id="positionLayer" class="map-layer"></div></div>`;
const stage=$('mapStage'),img=$('floorImage'),zoneLayer=$('zoneLayer'),roomLayer=$('roomLayer'),checkpointLayer=$('checkpointLayer'),positionLayer=$('positionLayer'),routeSvg=$('routeSvg');
img.src=D.image.src;stage.style.width=D.image.width+'px';stage.style.height=D.image.height+'px';
function applyTransform(){stage.style.transform=`translate3d(${state.tx}px,${state.ty}px,0) scale(${state.scale})`;}
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
function handleMapTap(cx,cy){const [y,x]=screenToMap(cx,cy);if(state.placing){state.cal[state.placing.id]={pos:[+y.toFixed(1),+x.toFixed(1)],verifiedAt:new Date().toISOString()};store.set('cn_calibration',state.cal);const id=state.placing.id;state.placing=null;mapEl.classList.remove('calibrating');renderRooms();renderStudio();toast(`${id} doorway verified`);return}if(state.placingAnchor){const a={...state.placingAnchor,pos:[+y.toFixed(1),+x.toFixed(1)],verified:true,createdAt:new Date().toISOString()};state.survey.checkpoints.push(a);state.placingAnchor=null;mapEl.classList.remove('calibrating');saveSurvey();renderCheckpoints();renderStudio();toast(`${a.name} anchor saved`);return}if(state.tapPosition){state.tapPosition=false;mapEl.classList.remove('calibrating');setPosition([y,x],'manual map pin',null,null,88);if(state.pendingCheckpoint)openCheckpointPlanner(state.pendingCheckpoint);else if(state.pendingDestination||state.destination)openRoutePlanner(state.pendingDestination||state.destination)}}
img.addEventListener('load',()=>{fitAll();setTimeout(updateAccuracy,0)});window.addEventListener('resize',()=>{if(!state.selected&&!state.route)fitAll()});

/* ---------- campus entities ---------- */
function posFor(r){return state.cal[r.id]?.pos||r.pos||null}
function verified(r){return !!state.cal[r.id]||!!r.verified}
function roomBy(q){q=(q||'').trim().toLowerCase();return D.rooms.find(r=>r.id.toLowerCase()===q)||D.rooms.find(r=>(r.aliases||[]).some(a=>a.toLowerCase()===q))||null}
function placeBy(id){return D.places.find(p=>p.id===id)||null}
function floorLabel(f){return f==='G'?'Ground Floor':f==='LG'?'Lower Ground Floor':f==='1'?'First Floor':f==='2'?'Second Floor':f}
function floorView(r){return D.floorViews[`${r.bldg}|${r.floor}`]}
function entityKey(sel){return !sel?null:sel.type==='room'?`room:${sel.value.id}`:`place:${sel.value.id}`}
function targetRoom(sel){if(!sel)return null;if(sel.type==='room')return sel.value;if(sel.type==='place'&&sel.value.room)return roomBy(sel.value.room);return null}
function labelFor(sel){return !sel?'':sel.type==='room'?sel.value.id:sel.value.name}
function toast(s){const t=$('toast');t.textContent=s;t.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>t.hidden=true,3000)}
function focusRoom(r){const p=posFor(r);if(p)flyTo(p,2.25);else{const v=floorView(r);if(v)fitBounds(v.bounds)}}
function saveSurvey(){store.set('cn_survey',state.survey)}
function allCheckpoints(){const merged=new Map();for(const c of D.checkpoints||[])merged.set(c.id,{...c,seed:true});for(const c of state.survey.checkpoints||[])merged.set(c.id,{...c,seed:false});return [...merged.values()]}
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
 zoneLayer.innerHTML='';
 for(const [key,view] of Object.entries(D.floorViews||{})){
   const [bldg,floor]=key.split('|'),rooms=floorRooms(bldg,floor);if(!rooms.length)continue;
   const ys=view.bounds.map(p=>p[0]),xs=view.bounds.map(p=>p[1]),y=(Math.min(...ys)+Math.max(...ys))/2,x=(Math.min(...xs)+Math.max(...xs))/2,precise=rooms.filter(verified).length;
   const b=document.createElement('button');b.className='zone-hit'+(precise?' has-precise':'');b.style.left=x+'px';b.style.top=y+'px';b.setAttribute('aria-label',bldg+' '+floorLabel(floor)+', '+rooms.length+' rooms');
   b.innerHTML='<b>'+bldg+'</b><small>'+floorLabel(floor).replace(' Floor','')+' · '+rooms.length+' rooms</small>';
   b.onclick=e=>{e.stopPropagation();openFloorZone(bldg,floor)};zoneLayer.appendChild(b)
 }
}
function renderRooms(){roomLayer.innerHTML='';for(const r of D.rooms){const p=posFor(r);if(!p)continue;const b=document.createElement('button');b.className='room-hit verified';b.style.left=p[1]+'px';b.style.top=p[0]+'px';b.title=r.id;b.setAttribute('aria-label','Precise room pin '+r.id);b.innerHTML='<span></span><em>'+r.id+'</em>';b.onclick=e=>{e.stopPropagation();selectEntity({type:'room',value:r})};roomLayer.appendChild(b)}renderZones();updateAccuracy()}
function renderCheckpoints(){checkpointLayer.innerHTML='';for(const c of allCheckpoints()){if(!c.pos||c.type==='room')continue;const b=document.createElement('button');b.className=`checkpoint-hit ${c.verified?'verified':''}`;b.style.left=c.pos[1]+'px';b.style.top=c.pos[0]+'px';b.title=c.name;b.setAttribute('aria-label',c.name);b.innerHTML=`<span>${checkpointIcon(c.type)}</span>`;b.onclick=e=>{e.stopPropagation();anchorAt(c)};checkpointLayer.appendChild(b)}}
function checkpointIcon(type){return ({entrance:'↗',junction:'⌁',stairs:'⇅',lift:'↕',toilet:'WC',printer:'▣',water:'◌',landmark:'◉',room:'•'})[type]||'◉'}
function updateAccuracy(){const rooms=D.rooms.filter(verified).length,anchors=allCheckpoints().filter(c=>c.pos&&c.verified).length,links=(state.survey.edges||[]).length;const roomPct=Math.round(rooms/D.rooms.length*100);$('accuracyText').textContent=rooms+' rooms · '+anchors+' anchors';$('accuracyBadge').dataset.level=roomPct>=70?'high':roomPct>=30?'mid':'low';if($('studioStats')){const a=typeof surveyAudit==='function'?surveyAudit():{isolated:0,unsafe:0,closed:0};$('studioStats').innerHTML='<b>'+rooms+'/'+D.rooms.length+'</b> precise room-door pins · <b>'+anchors+'</b> precise anchors · <b>'+links+'</b> custom surveyed links.<br><b>'+a.isolated+'</b> isolated mapped anchors · <b>'+a.unsafe+'</b> links without verified step-free status · <b>'+a.closed+'</b> closed links.<br>Navigation will not invent geometry for gaps in this survey.'}}

/* ---------- sheets ---------- */
function openSheet(id){closeSheets(false);$('backdrop').hidden=false;$(id).hidden=false}
function closeSheets(hideBackdrop=true){document.querySelectorAll('.sheet').forEach(x=>x.hidden=true);if(hideBackdrop)$('backdrop').hidden=true}
$('backdrop').onclick=()=>closeSheets();document.querySelectorAll('.close').forEach(b=>b.onclick=()=>closeSheets());

/* ---------- destination detail ---------- */
function placeCheckpoint(place){return allCheckpoints().find(c=>c.place===place.id)||null}
function selectEntity(sel){
 state.selected=sel;const r=targetRoom(sel),cp=sel.type==='place'?placeCheckpoint(sel.value):null;if(r)focusRoom(r);else if(cp?.pos)flyTo(cp.pos,2.3);
 const isRoom=sel.type==='room',v=sel.value;
 $('roomKind').textContent=isRoom?'ROOM':'DESTINATION';$('roomName').textContent=isRoom?v.id:v.name;
 if(isRoom){
   $('roomMeta').textContent=v.bldg+' · '+floorLabel(v.floor)+((v.aliases||[])[0]?' · '+v.aliases[0]:'');
   $('destinationDescription').textContent='';
   $('roomAccuracy').textContent=verified(v)?'✓ Precise room-door pin verified':'Building and floor are known. The exact doorway is not yet survey-verified.';
   $('roomAccuracy').className='room-accuracy '+(verified(v)?'good':'warn');$('calibrateRoom').hidden=false;$('setHere').hidden=false;$('setHere').textContent='I’m at this room';
 } else {
   const linked=r?'Linked to '+r.id+' · '+r.bldg+' · '+floorLabel(r.floor):cp?'Linked to surveyed '+cp.type+' · '+(cp.bldg||'Campus'):'Chosen campus destination; exact navigation anchor still being surveyed.';
   $('roomMeta').textContent=v.kind+' · '+linked;$('destinationDescription').textContent=v.description||'';
   $('roomAccuracy').textContent=(r&&verified(r))||cp?.verified?'✓ Destination has a precise navigation anchor':'You can choose this as your destination now. Guidance will clearly show when the final indoor anchor is not yet surveyed.';
   $('roomAccuracy').className='room-accuracy '+(((r&&verified(r))||cp?.verified)?'good':'warn');$('calibrateRoom').hidden=true;
   $('setHere').hidden=!(r&&verified(r))&&!cp?.verified;$('setHere').textContent='I’m at this place';
 }
 const key=entityKey(sel);$('saveRoom').textContent=state.saved.has(key)?'★ Saved':'☆ Save';
 $('goHere').textContent='Take me there';$('goHere').classList.add('primary');openSheet('roomSheet')
}
$('setHere').onclick=()=>{
 const r=targetRoom(state.selected),cp=state.selected?.type==='place'?placeCheckpoint(state.selected.value):null;
 if(cp?.pos){anchorAt(cp);closeSheets();return}
 if(!r){toast('This destination does not have a precise start anchor yet');return}
 const p=posFor(r);state.start=r;if(p){const rcp=allCheckpoints().find(c=>c.room===r.id&&c.pos);setPosition(p,'verified room',r.id,rcp?.id||null,100);closeSheets()}else toast('This room needs an exact pin before it can be a precise start')
};
function routeToPlace(place){
 const r=place.room?roomBy(place.room):null,cp=placeCheckpoint(place);
 if(r){state.destinationPlace=place;routeTo(r);return}
 if(cp){state.destinationPlace=place;routeToCheckpoint(cp);return}
 state.destinationPlace=place;state.pendingCheckpoint=null;state.pendingDestination=null;
 const ref=currentStartRef();
 state.routeDraft={a:ref?.room||null,b:null,fromLabel:ref?.label||'Starting point not needed yet',targetLabel:place.name,steps:[],precision:'none',note:'You have selected '+place.name+' as your destination, but its exact indoor anchor has not yet been surveyed. Use the 360° visual guide while this location is being mapped.',blocked:true,blockedReason:'coverage',place};
 renderPlanner();$('plannerVisual').hidden=false;openSheet('plannerSheet')
}
$('goHere').onclick=()=>{if(!state.selected)return;if(state.selected.type==='room')routeTo(state.selected.value);else routeToPlace(state.selected.value)};
$('lookAround').onclick=openTour;
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
function renderPosition(){positionLayer.innerHTML='';if(!state.position)return;const p=state.position.pos;if(p){const d=document.createElement('div');d.className='you';d.style.left=p[1]+'px';d.style.top=p[0]+'px';d.innerHTML='<i style="transform:translate(-50%,-100%) rotate('+state.heading+'deg)"></i><b></b>';positionLayer.appendChild(d)}if($('positionInfo')){const last=state.lastConfirmed?' Last confirmed: '+state.lastConfirmed.name+'.':'';$('positionInfo').textContent='Position source: '+(state.position.source||'manual')+' · confidence '+Math.round(state.confidence)+'%.'+last+(state.tracking?' Heading assist is on; movement is not guessed between anchors.':'')}}
function setPosition(pos,source='manual map pin',roomId=null,checkpointId=null,confidence=88){state.position={pos,source,roomId,checkpointId,at:Date.now()};state.confidence=confidence;state.stepsSinceAnchor=0;store.set('cn_position',state.position);store.set('cn_confidence',state.confidence);renderPosition();if(pos&&state.autoZoom)flyTo(pos,2.2);toast('Indoor position set')}
function openPosition(){$('positionInfo').textContent=state.position?'Current source: '+state.position.source+'. Confidence '+Math.round(state.confidence)+'%.':'No indoor position set yet.';openSheet('positionSheet')}
$('tapStart').onclick=()=>{closeSheets();state.tapPosition=true;mapEl.classList.add('calibrating');toast('Tap your exact current position')};
$('chooseStart').onclick=()=>{closeSheets();openSearch('start')};
$('followMeBtn').onclick=enableTracking;$('landmarkStart').onclick=openLandmarks;
async function enableTracking(){if(!state.position){openPosition();return}try{if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function'){const p=await DeviceOrientationEvent.requestPermission();if(p!=='granted')throw new Error()}if(typeof DeviceMotionEvent!=='undefined'&&typeof DeviceMotionEvent.requestPermission==='function'){const p=await DeviceMotionEvent.requestPermission();if(p!=='granted')throw new Error()}state.tracking=!state.tracking;$('followMeBtn').textContent=state.tracking?'Stop heading assist':'Heading assist';toast(state.tracking?'Heading assist on — confirm landmarks as you walk':'Heading assist stopped');renderPosition()}catch{toast('Motion permission was not granted')}}
let lastMag=0,lastStepAt=0;window.addEventListener('deviceorientation',e=>{const h=e.webkitCompassHeading??(e.alpha!=null?360-e.alpha:null);if(h==null)return;state.heading=h;renderPosition();renderGuideLens()});
window.addEventListener('devicemotion',e=>{if(!state.tracking||!state.position)return;const a=e.accelerationIncludingGravity;if(!a)return;const mag=Math.sqrt((a.x||0)**2+(a.y||0)**2+(a.z||0)**2),now=Date.now();if(lastMag&&Math.abs(mag-lastMag)>2.2&&now-lastStepAt>420){lastStepAt=now;state.stepsSinceAnchor++;state.position.source='heading assist between confirmed anchors';state.confidence=Math.max(35,state.confidence-.35);store.set('cn_position',state.position);store.set('cn_confidence',state.confidence);renderPosition()}lastMag=mag});
function anchorAt(c){
 if(c.pos)setPosition(c.pos,'confirmed landmark: '+c.name,c.room||null,c.id,100);
 else {state.position={pos:state.position?.pos||null,source:'semantic landmark: '+c.name,roomId:c.room||null,checkpointId:c.id,at:Date.now()};state.confidence=Math.max(state.confidence,82);store.set('cn_position',state.position);store.set('cn_confidence',state.confidence);renderPosition()}
 if(c.room)state.start=roomBy(c.room)||state.start;
 state.lastConfirmed={id:c.id,name:c.name,at:Date.now()};store.set('cn_lastConfirmed',state.lastConfirmed);
 if(state.route)handleRouteAnchor(c);
 toast('Confirmed: '+c.name)
}
function openLandmarks(){const cps=allCheckpoints();let list=cps;if(state.route){const ids=new Set(state.route.steps.map(s=>s.anchor).filter(Boolean));list=[...cps.filter(c=>ids.has(c.id)),...cps.filter(c=>!ids.has(c.id))]}else if(state.start)list=cps.filter(c=>!c.bldg||c.bldg===state.start.bldg);$('landmarkResults').innerHTML=list.slice(0,36).map(c=>'<button class="result" data-cp="'+c.id+'"><span class="result-icon">'+checkpointIcon(c.type)+'</span><span class="result-copy"><b>'+c.name+'</b><small>'+(c.bldg||'Campus')+(c.floor?' · '+floorLabel(c.floor):'')+(c.pos?' · precise anchor':' · landmark')+'</small></span><em>'+(c.verified?'Precise':'Guide')+'</em></button>').join('')||'<p class="empty">No landmarks surveyed yet.</p>';$('landmarkResults').querySelectorAll('[data-cp]').forEach(b=>b.onclick=()=>{const c=checkpointBy(b.dataset.cp);if(c){anchorAt(c);closeSheets();if(!state.route){if(state.pendingCheckpoint)openCheckpointPlanner(state.pendingCheckpoint);else if(state.pendingDestination||state.destination)openRoutePlanner(state.pendingDestination||state.destination)}}});openSheet('landmarkSheet')}
$('landmarkTour').onclick=openTour;
/* ---------- guidance ---------- */
function calibrationMode(room){state.placing=room;closeSheets();toast('Tap the exact doorway for '+room.id);mapEl.classList.add('calibrating')}
function allEdges(){return [...(D.edges||[]),...(state.survey.edges||[])]}
function currentStartRef(){
 const cp=state.position?.checkpointId?checkpointBy(state.position.checkpointId):null;
 if(cp)return {kind:'checkpoint',checkpoint:cp,label:cp.name,room:cp.room?roomBy(cp.room):null};
 const r=state.start||((state.position?.roomId&&roomBy(state.position.roomId))||null);
 if(r)return {kind:'room',room:r,label:r.id};
 return null
}
function startIdsForGraph(ref,cps){if(!ref)return[];if(ref.kind==='checkpoint')return[ref.checkpoint.id];if(ref.room)return cps.filter(c=>c.room===ref.room.id).map(c=>c.id);return[]}
function routeQuality(route){return Core.routeQuality(route)}
function buildGraphRoute(ref,targetIds,targetLabel,targetRoom=null,ignoreStepFree=false){
 const cps=allCheckpoints(),startIds=startIdsForGraph(ref,cps);
 if(!startIds.length||!targetIds.length)return null;
 const path=Core.shortestPath({checkpoints:cps,edges:allEdges(),startIds,endIds:targetIds,options:{profile:state.profile,stepFree:state.stepFree&&!ignoreStepFree}});
 if(!path)return null;
 let steps=Core.pathSteps(path,cps);
 if(!steps.length)steps=[{action:'arrive',icon:'✓',text:'You are already at '+targetLabel+'.',anchor:path.endId,fromAnchor:path.startId,confirm:'Destination confirmed.'}];
 return {a:ref.room||null,b:targetRoom,fromLabel:ref.label,targetLabel,steps,precision:'survey graph',note:'Built only from surveyed links.',path,ignoreStepFree,blocked:false}
}
function computeRoomRoute(dest,options={}){
 const ignoreStepFree=!!options.ignoreStepFree,ref=currentStartRef(),a=ref?.room||null,b=dest;
 if(!ref)return {a:null,b,fromLabel:'Starting point needed',targetLabel:b.id,steps:[],precision:'none',note:'Set your current room or a surveyed landmark first.',blocked:true,blockedReason:'start'};
 const cps=allCheckpoints(),endIds=cps.filter(c=>c.room===b.id).map(c=>c.id);
 const graph=buildGraphRoute(ref,endIds,b.id,b,ignoreStepFree);
 if(graph)return graph;
 const template=a?D.routeTemplates?.[a.id+'>'+b.id]:null;
 if(template){
   const accessOK=template.audience!=='staff'||state.profile==='staff';
   const stepOK=!state.stepFree||ignoreStepFree||template.stepFree===true;
   if(!accessOK)return {a,b,fromLabel:ref.label,targetLabel:b.id,steps:[],precision:'none',note:'This route is restricted for your current route profile.',blocked:true,blockedReason:'access'};
   const steps=template.steps.map((x,i,arr)=>({...x,fromAnchor:i?arr[i-1].anchor:null}));
   return {a,b,fromLabel:ref.label,targetLabel:b.id,steps,precision:template.precision==='landmark-verified'?'verified landmark route':template.precision,note:template.note||'',ignoreStepFree,blocked:!stepOK,blockedReason:stepOK?null:'stepfree'};
 }
 if(!a)return {a:null,b,fromLabel:ref.label,targetLabel:b.id,steps:[],precision:'none',note:'Your start is precise, but it is not yet connected to a surveyed route graph for this destination.',blocked:true,blockedReason:'coverage'};
 const sameFloor=a.bldg===b.bldg&&a.floor===b.floor;
 const steps=sameFloor?[
   {action:'start',icon:'●',text:'Start at '+a.id+'.',anchor:null,confirm:''},
   {action:'orientation',icon:'◎',text:'Stay on '+floorLabel(b.floor)+' and use visible room numbers/signage toward '+b.id+'.',anchor:null,confirm:'This is floor guidance, not a surveyed corridor route.'},
   {action:'arrive',icon:'✓',text:'Look for '+b.id+' and confirm the room number before entering.',anchor:null,confirm:''}
 ]:[
   {action:'start',icon:'●',text:'Start at '+a.id+' in '+a.bldg+', '+floorLabel(a.floor)+'.',anchor:null,confirm:''},
   {action:'orientation',icon:'◎',text:'Follow official building signage toward '+b.bldg+'.',anchor:null,confirm:'No unsurveyed corridor turns are being invented.'},
   {action:'level',icon:'⇅',text:a.floor!==b.floor?'Use signed stairs or a lift to reach '+floorLabel(b.floor)+'.':'Remain on '+floorLabel(b.floor)+'.',anchor:null,confirm:''},
   {action:'arrive',icon:'✓',text:'Continue to '+b.id+' and confirm the room number.',anchor:null,confirm:''}
 ];
 const precision=sameFloor?'floor-level guidance':'building/floor guidance';
 const blocked=state.stepFree&&!ignoreStepFree;
 return {a,b,fromLabel:ref.label,targetLabel:b.id,steps,precision,note:blocked?'A verified step-free path has not yet been surveyed for this route.':'Turn-by-turn corridor geometry is not yet surveyed.',ignoreStepFree,blocked,blockedReason:blocked?'stepfree':null}
}
function computeCheckpointRoute(cp,options={}){
 const ref=currentStartRef(),ignoreStepFree=!!options.ignoreStepFree;
 if(!ref)return {a:null,b:null,fromLabel:'Starting point needed',targetLabel:cp.name,steps:[],precision:'none',note:'Set a surveyed start first.',blocked:true,blockedReason:'start',targetCheckpoint:cp};
 const graph=buildGraphRoute(ref,[cp.id],cp.name,null,ignoreStepFree);
 if(graph){graph.targetCheckpoint=cp;return graph}
 return {a:ref.room||null,b:null,fromLabel:ref.label,targetLabel:cp.name,steps:[],precision:'none',note:'This facility anchor is known, but your current position is not connected to it by a complete surveyed route.',blocked:true,blockedReason:state.stepFree&&!ignoreStepFree?'stepfree':'coverage',targetCheckpoint:cp}
}
function plannerSummary(route){
 const q=routeQuality(route),count=route.steps?.length||0;
 let s=q.label+(count?' · '+count+' step'+(count===1?'':'s'):'');
 if(route.precision==='survey graph')s+=' · access rules checked';
 return s
}
function renderPlanner(){
 const r=state.routeDraft;if(!r)return;
 $('plannerFrom').textContent=r.fromLabel||'Set starting point';$('plannerTo').textContent=r.targetLabel||'Destination';
 const q=routeQuality(r);$('plannerQuality').dataset.level=q.level;$('plannerQuality').innerHTML='<b>'+q.label+'</b><span>'+q.detail+'</span>';
 $('plannerSummary').textContent=plannerSummary(r);
 const warning=$('plannerWarning');warning.hidden=!r.note&&!r.blocked;warning.textContent=r.note||'';
 const begin=$('plannerBegin');begin.disabled=!!r.blocked&&r.blockedReason!=='start';begin.textContent=r.blocked?(r.blockedReason==='start'?'Choose starting point':r.blockedReason==='coverage'?'Precise route not yet surveyed':'Route not verified'):'Start guidance';if($('plannerVisual'))$('plannerVisual').hidden=!(r.place&&r.blockedReason==='coverage');
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
function routeTo(dest){state.destination=dest;state.pendingDestination=dest;openRoutePlanner(dest)}
function routeToCheckpoint(cp){state.pendingCheckpoint=cp;openCheckpointPlanner(cp)}
function buzz(pattern=18){if(state.haptics&&navigator.vibrate)try{navigator.vibrate(pattern)}catch{}}
function saveActiveRoute(){
 if(!state.route?.b){store.set('cn_active_route',null);state.activeRoute=null;return}
 state.activeRoute={from:state.route.a?.id||null,to:state.route.b.id,index:state.routeIndex,at:Date.now(),ignoreStepFree:!!state.route.ignoreStepFree};
 store.set('cn_active_route',state.activeRoute);renderResumeRoute()
}
function beginRoute(route,resumeIndex=0){
 if(!route||route.blocked){renderPlanner();return}
 state.route=route;state.routeDraft=null;state.routeIndex=Math.max(0,Math.min(resumeIndex,Math.max(0,route.steps.length-1)));closeSheets();$('assistantCard').hidden=true;$('tourSheet').hidden=true;document.body.classList.add('navigating');$('guideLens').hidden=false;$('routeCard').hidden=false;$('welcomeCard').hidden=true;renderRoute();focusRoute();focusCurrentLeg();rememberDestination(route.b);saveActiveRoute();buzz();if(state.voice)setTimeout(speak,120)
}
function finishRoute(){
 if(!state.route)return;const dest=state.route.b,target=state.route.targetCheckpoint;state.routeIndex=Math.max(0,state.route.steps.length-1);buzz([30,40,70]);toast('Destination reached');endRoute();if(dest)setTimeout(()=>selectEntity({type:'room',value:dest}),180);else if(target?.pos&&state.autoZoom)setTimeout(()=>flyTo(target.pos,2.4),180)
}
function endRoute(){state.route=null;routeSvg.innerHTML='';$('routeCard').hidden=true;$('guideLens').hidden=true;document.body.classList.remove('navigating');$('context').textContent='Blackpool Sixth · Find your way';renderTourGuide();store.set('cn_active_route',null);state.activeRoute=null;renderResumeRoute()}
function focusRoute(){
 routeSvg.innerHTML='';if(!state.route)return;
 const endpoint=[];
 const pa=state.route.a?posFor(state.route.a):state.position?.pos,pb=state.route.b?posFor(state.route.b):state.route.targetCheckpoint?.pos;
 if(pa)endpoint.push('<circle class="route-endpoint start" cx="'+pa[1]+'" cy="'+pa[0]+'" r="16"/><text class="route-endpoint-label" x="'+pa[1]+'" y="'+(pa[0]+5)+'">S</text>');
 if(pb)endpoint.push('<circle class="route-endpoint end" cx="'+pb[1]+'" cy="'+pb[0]+'" r="16"/><text class="route-endpoint-label" x="'+pb[1]+'" y="'+(pb[0]+5)+'">D</text>');
 let routeMarkup='';
 if(state.route.precision==='survey graph'&&state.route.path){const cps=allCheckpoints(),byId=new Map(cps.map(c=>[c.id,c])),points=state.route.path.nodes.map(id=>byId.get(id)?.pos).filter(Boolean);if(points.length===state.route.path.nodes.length&&points.length>1){const d=points.map((p,i)=>(i?'L ':'M ')+p[1]+' '+p[0]).join(' ');routeMarkup='<path class="route-line surveyed" d="'+d+'"/>';const ys=points.map(p=>p[0]),xs=points.map(p=>p[1]);if(state.autoZoom)fitBounds([[Math.min(...ys)-90,Math.min(...xs)-90],[Math.max(...ys)+90,Math.max(...xs)+90]])}}
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
 const cp=checkpointBy(step.anchor);$('routeLandmark').hidden=!step.confirm&&!cp;if(step.confirm||cp){$('routeLandmarkIcon').textContent=step.icon||checkpointIcon(cp?.type);$('routeLandmarkName').textContent=cp?.name||'Visual landmark';$('routeLandmarkHint').textContent=step.confirm||''}
 $('confirmLandmark').hidden=!(cp||step.confirm);$('confirmLandmark').textContent=cp?'✓ I can see '+cp.name:'✓ I can see this';
 $('nextStep').textContent=state.routeIndex===r.steps.length-1?'Finish':'Done — next';$('prevStep').disabled=state.routeIndex===0;
 $('context').textContent='Navigating to '+r.targetLabel;renderGuideLens();renderTourGuide();saveActiveRoute()
}
function renderGuideLens(){if(!state.route||$('guideLens').hidden)return;const s=currentRouteStep(),q=routeQuality(state.route);$('guideLensIcon').textContent=s?.icon||'↑';$('guideLensText').textContent=s?.text||'';$('guideLensMeta').textContent=(state.heading?Math.round(state.heading)+'° heading · ':'')+q.label}
function renderTourGuide(){if(!$('tourGuideBar'))return;if(!state.route){$('tourGuideBar').hidden=true;return}const s=currentRouteStep();$('tourGuideBar').hidden=false;$('tourGuideIcon').textContent=s?.icon||'↑';$('tourGuideText').textContent=s?.text||''}
function speak(){if(!state.route||!('speechSynthesis'in window))return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(currentRouteStep().text);u.rate=.95;speechSynthesis.speak(u)}
function nextRouteStep(){if(!state.route)return;if(state.routeIndex<state.route.steps.length-1){state.routeIndex++;renderRoute();focusCurrentLeg();buzz();if(state.voice)speak()}else finishRoute()}
function handleRouteAnchor(c){
 if(!state.route)return;const idx=state.route.steps.findIndex(s=>s.anchor===c.id);
 if(idx>=0){state.routeIndex=Math.min(idx+1,state.route.steps.length-1);renderRoute();focusCurrentLeg();buzz();if(state.voice)speak();return}
 rerouteFromCurrent()
}
function rerouteFromCurrent(){
 if(!state.route)return;let nr=null;if(state.route.b)nr=computeRoomRoute(state.route.b,{ignoreStepFree:state.route.ignoreStepFree});else if(state.route.targetCheckpoint)nr=computeCheckpointRoute(state.route.targetCheckpoint,{ignoreStepFree:state.route.ignoreStepFree});
 if(nr&&!nr.blocked&&nr.precision==='survey graph'){toast('Route updated from your confirmed position');beginRoute(nr,0)}
 else {toast('Position updated. No better surveyed route is available yet');renderRoute()}
}
function openLostRecovery(){
 if(!state.route){openPosition();return}const step=currentRouteStep();$('lostContext').innerHTML='<b>Current instruction</b><p>'+step.text+'</p><small>Choose something you can definitely see. We will re-anchor or rebuild the route rather than guessing.</small>';
 const anchors=state.route.steps.map((s,i)=>({s,i,c:checkpointBy(s.anchor)})).filter(x=>x.c||x.s.confirm).sort((x,y)=>Math.abs(x.i-state.routeIndex)-Math.abs(y.i-state.routeIndex));
 $('lostChoices').innerHTML=anchors.slice(0,8).map(x=>'<button class="result" data-route-index="'+x.i+'"><span class="result-icon">'+(x.s.icon||'◉')+'</span><span class="result-copy"><b>'+(x.c?.name||'Route landmark')+'</b><small>'+((x.i<state.routeIndex?'Earlier · ':x.i>state.routeIndex?'Ahead · ':'Current · ')+(x.s.confirm||x.s.text))+'</small></span><em>'+(x.c?.pos?'Anchor':'Guide')+'</em></button>').join('')||'<p class="empty">No surveyed landmarks on this route yet. Use the 360° visual check or identify a room number.</p>';
 $('lostChoices').querySelectorAll('[data-route-index]').forEach(b=>b.onclick=()=>{const i=+b.dataset.routeIndex,s=state.route.steps[i],cp=checkpointBy(s.anchor);state.routeIndex=i;if(cp)anchorAt(cp);else{renderRoute();focusCurrentLeg()}closeSheets();toast('Route re-oriented')});openSheet('lostSheet')
}
$('plannerChangeStart').onclick=()=>{closeSheets();openSearch('start')};
$('plannerChangeDest').onclick=()=>{closeSheets();openSearch('destination')};
$('plannerSwap').onclick=()=>{const r=state.routeDraft;if(!r?.a||!r?.b)return;const old=r.a;state.start=r.b;const p=posFor(r.b),cp=allCheckpoints().find(c=>c.room===r.b.id&&c.pos);if(p)setPosition(p,'room start: '+r.b.id,r.b.id,cp?.id||null,100);else{state.position={pos:null,source:'room start: '+r.b.id,roomId:r.b.id,checkpointId:null,at:Date.now()};store.set('cn_position',state.position);renderPosition()}state.destination=old;openRoutePlanner(old)};
$('plannerBegin').onclick=()=>{if(state.routeDraft?.blockedReason==='start'){openPosition();return}beginRoute(state.routeDraft)};$('plannerVisual').onclick=openTour;
$('plannerGeneral').onclick=()=>{if(state.pendingCheckpoint)openCheckpointPlanner(state.pendingCheckpoint,{ignoreStepFree:true});else if(state.destination)openRoutePlanner(state.destination,{ignoreStepFree:true})};
$('nextStep').onclick=nextRouteStep;$('prevStep').onclick=()=>{if(state.route&&state.routeIndex>0){state.routeIndex--;renderRoute();focusCurrentLeg()}};
$('speakStep').onclick=speak;$('endRoute').onclick=endRoute;$('visualCheck').onclick=openTour;$('recalibrate').onclick=openPosition;$('guideLensClose').onclick=()=>$('guideLens').hidden=true;$('tourBackToGuide').onclick=()=>{closeTour();$('routeCard').hidden=false};
$('confirmLandmark').onclick=()=>{const s=currentRouteStep();if(!s)return;const cp=checkpointBy(s.anchor);if(cp)anchorAt(cp);else nextRouteStep()};
$('lostBtn').onclick=openLostRecovery;$('lostRoom').onclick=()=>{closeSheets();openSearch('reanchor')};
$('lostTour').onclick=openTour;$('lostPosition').onclick=openPosition;
/* ---------- immersive tour ---------- */
function openTour(){closeSheets();$('tourSheet').hidden=false;if(!state.tourLoaded){$('tourFrame').src=D.tourUrl;state.tourLoaded=true}renderTourGuide();document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode==='tour'))}
function closeTour(){$('tourSheet').hidden=true;document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode==='map'))}
$('closeTour').onclick=closeTour;$('openTourExternal').onclick=()=>window.open(D.tourUrl,'_blank','noopener');function setMode(mode){document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));if(mode==='tour'){openTour();return}if(mode==='guide'){showAssistant();return}if(mode==='map')$('tourSheet').hidden=true}document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));

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
 if(facilityType&&/nearest|closest|where/.test(low)){const cp=nearestFacility(facilityType);if(cp){addFeed('The nearest surveyed '+facilityType+' anchor is '+cp.name+'. I’ll plan from your current confirmed point — I will not move your location to the destination.','bot');routeToCheckpoint(cp)}else addFeed('I know you need a '+facilityType+', but there is no precise surveyed '+facilityType+' anchor near your current confirmed position yet. Use the 360° view or local signage rather than me inventing a location.','bot');return}
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
$('menuBtn').onclick=()=>{openSheet('settingsSheet');$('stepFreeToggle').checked=state.stepFree;$('voiceToggle').checked=state.voice;$('profileSelect').value=state.profile;$('hapticToggle').checked=state.haptics;$('autoZoomToggle').checked=state.autoZoom};
$('positionBtn').onclick=openPosition;$('openTourSettings').onclick=openTour;
$('stepFreeToggle').onchange=e=>{state.stepFree=e.target.checked;store.set('cn_stepfree',state.stepFree);if(state.routeDraft&&(state.destination||state.pendingCheckpoint)){state.pendingCheckpoint?openCheckpointPlanner(state.pendingCheckpoint):openRoutePlanner(state.destination)}};
$('voiceToggle').onchange=e=>{state.voice=e.target.checked;store.set('cn_voice',state.voice)};
$('hapticToggle').onchange=e=>{state.haptics=e.target.checked;store.set('cn_haptics',state.haptics);if(state.haptics)buzz()};
$('autoZoomToggle').onchange=e=>{state.autoZoom=e.target.checked;store.set('cn_autozoom',state.autoZoom)};
$('profileSelect').onchange=e=>{state.profile=e.target.value;store.set('cn_profile',state.profile);toast('Route profile: '+state.profile);if(state.routeDraft){state.pendingCheckpoint?openCheckpointPlanner(state.pendingCheckpoint,{ignoreStepFree:state.draftIgnoreStepFree}):state.destination&&openRoutePlanner(state.destination,{ignoreStepFree:state.draftIgnoreStepFree})}};
/* ---------- precision map studio ---------- */
$('studioBtn').onclick=()=>{renderStudio();openSheet('studioSheet')};
function studioTab(name){document.querySelectorAll('[data-studio-tab]').forEach(b=>b.classList.toggle('active',b.dataset.studioTab===name));['rooms','anchors','links'].forEach(n=>$(`studio${n[0].toUpperCase()+n.slice(1)}Panel`).hidden=n!==name)}
document.querySelectorAll('[data-studio-tab]').forEach(b=>b.onclick=()=>studioTab(b.dataset.studioTab));
function surveyAudit(){const cps=allCheckpoints().filter(c=>c.pos),edges=allEdges(),degree=new Map(cps.map(c=>[c.id,0]));for(const e of edges){if(degree.has(e.from))degree.set(e.from,degree.get(e.from)+1);if(degree.has(e.to))degree.set(e.to,degree.get(e.to)+1)}const isolated=[...degree].filter(([,n])=>n===0).length,unsafe=edges.filter(e=>e.stepFree!==true).length,closed=edges.filter(e=>e.closed===true).length;return {isolated,unsafe,closed}}
function renderStudio(){
 const sorted=[...D.rooms].sort((a,b)=>a.id.localeCompare(b.id,undefined,{numeric:true}));$('studioRoom').innerHTML=sorted.map(r=>`<option value="${r.id}">${r.id} — ${r.bldg} ${floorLabel(r.floor)}${verified(r)?' ✓':''}</option>`).join('');
 $('anchorType').innerHTML=(D.surveyTypes||[]).map(t=>'<option value="'+t.id+'">'+t.icon+' '+t.label+'</option>').join('');if($('anchorRoomLink'))$('anchorRoomLink').innerHTML='<option value="">Not linked to a room</option>'+sorted.map(r=>'<option value="'+r.id+'">'+r.id+'</option>').join('');
 const buildings=[...new Set(D.rooms.map(r=>r.bldg))];$('anchorBuilding').innerHTML=buildings.map(b=>`<option>${b}</option>`).join('');
 const cps=allCheckpoints();const opts=cps.filter(c=>c.pos).map(c=>`<option value="${c.id}">${c.name}${c.seed?' · built-in':''}</option>`).join('');$('edgeFrom').innerHTML=opts;$('edgeTo').innerHTML=opts;
 $('anchorList').innerHTML=(state.survey.checkpoints||[]).map(c=>`<div class="result"><span class="result-icon">${checkpointIcon(c.type)}</span><span class="result-copy"><b>${c.name}</b><small>${c.bldg} · ${floorLabel(c.floor)} · ${c.id}</small></span><button class="tiny-btn" data-copy-cp="${c.id}">QR link</button><button class="tiny-btn danger" data-del-cp="${c.id}">×</button></div>`).join('')||'<p class="empty">No custom survey anchors yet.</p>';
 $('edgeList').innerHTML=(state.survey.edges||[]).map((e,i)=>`<div class="result"><span class="result-icon">↔</span><span class="result-copy"><b>${checkpointBy(e.from)?.name||e.from} → ${checkpointBy(e.to)?.name||e.to}</b><small>${e.instruction||'Connected'} · ${e.access}${e.stepFree?' · step-free':' · step-free unverified'}${e.oneWay?' · one-way':''}${e.closed?' · CLOSED':''}</small></span><button class="tiny-btn danger" data-del-edge="${i}">×</button></div>`).join('')||'<p class="empty">No surveyed anchor links yet.</p>';
 $('anchorList').querySelectorAll('[data-del-cp]').forEach(b=>b.onclick=()=>{const id=b.dataset.delCp;state.survey.checkpoints=state.survey.checkpoints.filter(c=>c.id!==id);state.survey.edges=state.survey.edges.filter(e=>e.from!==id&&e.to!==id);saveSurvey();renderCheckpoints();renderStudio()});
 $('anchorList').querySelectorAll('[data-copy-cp]').forEach(b=>b.onclick=async()=>{const u=new URL(location.href);u.search='';u.searchParams.set('cp',b.dataset.copyCp);try{await navigator.clipboard.writeText(u.toString());toast('Checkpoint link copied')}catch{prompt('Copy this checkpoint URL',u.toString())}});
 $('edgeList').querySelectorAll('[data-del-edge]').forEach(b=>b.onclick=()=>{state.survey.edges.splice(+b.dataset.delEdge,1);saveSurvey();renderStudio()});updateAccuracy()
}
$('studioPlace').onclick=()=>calibrationMode(roomBy($('studioRoom').value));
$('anchorPlace').onclick=()=>{const name=$('anchorName').value.trim();if(!name){toast('Give the anchor a name');return}const id='SURVEY_'+Date.now().toString(36).toUpperCase();state.placingAnchor={id,name,type:$('anchorType').value,bldg:$('anchorBuilding').value,floor:$('anchorFloor').value,room:$('anchorRoomLink')?.value||null,keywords:[name.toLowerCase()]};closeSheets();mapEl.classList.add('calibrating');toast(`Tap the exact position for ${name}`)};
$('edgeAdd').onclick=()=>{const from=$('edgeFrom').value,to=$('edgeTo').value;if(!from||!to||from===to){toast('Choose two different anchors');return}state.survey.edges.push({from,to,instruction:$('edgeInstruction').value.trim()||('Continue to '+(checkpointBy(to)?.name||to)+'.'),reverseInstruction:$('edgeReverseInstruction')?.value.trim()||'',stepFree:$('edgeStepFree').checked,access:$('edgeAccess').value,oneWay:!!$('edgeOneWay')?.checked,closed:!!$('edgeClosed')?.checked,seconds:+($('edgeSeconds')?.value||0)||null,createdAt:new Date().toISOString()});saveSurvey();renderStudio();toast('Survey link added')};
$('exportData').onclick=()=>{const blob=new Blob([JSON.stringify({version:6,created:new Date().toISOString(),roomCalibration:state.cal,survey:state.survey},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='campus-navigator-v6-survey.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)};
$('importData').onchange=e=>{const f=e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{try{const j=JSON.parse(rd.result);state.cal=j.roomCalibration||j.calibration||state.cal;state.survey=j.survey||state.survey;store.set('cn_calibration',state.cal);saveSurvey();renderRooms();renderCheckpoints();renderStudio();toast('Survey imported')}catch{toast('Invalid survey file')}};rd.readAsText(f)};
$('clearCalibration').onclick=()=>{if(confirm('Clear all local room corrections, anchors and links?')){state.cal={};state.survey=structuredClone(EMPTY_SURVEY);store.set('cn_calibration',{});saveSurvey();renderRooms();renderCheckpoints();renderStudio()}};

document.querySelectorAll('.bottom button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.bottom button').forEach(x=>x.classList.remove('active'));b.classList.add('active');const t=b.dataset.tab;if(t==='home'){$('welcomeCard').hidden=false;fitAll()}if(t==='find')$('searchBtn').click();if(t==='tour')openTour();if(t==='saved'){renderSaved();openSheet('savedSheet')}});

/* ---------- startup / deep links ---------- */
window.addEventListener('online',()=>$('offline').hidden=true);window.addEventListener('offline',()=>$('offline').hidden=false);$('offline').hidden=navigator.onLine;
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
renderHome();renderRooms();renderCheckpoints();renderPosition();renderStudio();renderSuggestions();$('stepFreeToggle').checked=state.stepFree;$('voiceToggle').checked=state.voice;$('profileSelect').value=state.profile;$('hapticToggle').checked=state.haptics;$('autoZoomToggle').checked=state.autoZoom;renderResumeRoute();
const url=new URL(location.href),action=url.searchParams.get('action'),cpId=url.searchParams.get('cp'),fromId=url.searchParams.get('from'),toId=url.searchParams.get('to');
setTimeout(()=>{
 if(img.complete)fitAll();
 if(cpId){const cp=checkpointBy(cpId);if(cp){anchorAt(cp);if(toId&&roomBy(toId))routeTo(roomBy(toId));else showAssistant('I am by '+cp.name)}}
 else if(fromId&&roomBy(fromId)){const r=roomBy(fromId);state.start=r;const p=posFor(r),cp=allCheckpoints().find(c=>c.room===r.id&&c.pos);if(p)setPosition(p,'deep-link start: '+r.id,r.id,cp?.id||null,100)}
 if(toId&&roomBy(toId)&&!cpId){state.destination=roomBy(toId);openRoutePlanner(state.destination)}
 if(action==='search')openSearch('browse');if(action==='assistant')showAssistant();if(action==='tour')openTour()
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
