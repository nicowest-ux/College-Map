(() => {
  'use strict';

  const D = window.CAMPUS_DATA;
  if (!window.L || !D) {
    document.body.innerHTML = '<p style="padding:24px;font-family:sans-serif">Campus Map could not start. Refresh while online once so the offline files can be cached.</p>';
    return;
  }

  const $ = (id) => document.getElementById(id);
  const floorName = (f) => ({LG:'Lower Ground',G:'Ground',1:'1st Floor',2:'2nd Floor'}[f] || f);
  const amenityEmoji = { PRINTER:'🖨️', WATER:'💧', LIFT:'🛗', STUDY:'💻' };
  const amenityName = { PRINTER:'Printers', WATER:'Water', LIFT:'Lifts', STUDY:'Study hubs' };
  const storage = {
    get(key, fallback) { try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
  };

  const state = {
    building: 'ALL', floor: 'ALL', facility: 'NONE', stepFree: storage.get('cm_stepfree', false),
    selectedRoom: null, fromRoom: null, toRoom: null, pickerTarget: null,
    favorites: storage.get('cm_favorites', []), recents: storage.get('cm_recents', []),
    day: storage.get('cm_day', []), position: storage.get('cm_position', null),
    heading: 0, route: null, deferredInstall: null, theme: storage.get('cm_theme', 'system')
  };

  document.documentElement.dataset.theme = state.theme;

  const bounds = [[0,0],[D.image.height,D.image.width]];
  const map = L.map('map', {
    crs:L.CRS.Simple, minZoom:-0.5, maxZoom:3, zoomSnap:.25, zoomControl:false,
    attributionControl:false, maxBounds:[[-35,-35],[D.image.height+35,D.image.width+35]], maxBoundsViscosity:.85
  });
  L.imageOverlay(D.image.src, bounds, { interactive:false }).addTo(map);
  map.fitBounds(bounds, {padding:[10,10]});

  const roomLayer = L.layerGroup().addTo(map);
  const amenityLayer = L.layerGroup().addTo(map);
  const routeLayer = L.layerGroup().addTo(map);
  const positionLayer = L.layerGroup().addTo(map);

  function roomIcon(room, selected=false) {
    return L.divIcon({
      className:'', iconSize:selected?[22,22]:[17,17], iconAnchor:selected?[11,11]:[8.5,8.5],
      html:`<div class="room-marker${selected?' selected':''}" style="background:${room.color}" title="Room ${room.id}"></div>`
    });
  }

  function renderRooms() {
    roomLayer.clearLayers();
    D.rooms.forEach(room => {
      if (state.building !== 'ALL' && room.bldg !== state.building) return;
      if (state.floor !== 'ALL' && room.floor !== state.floor) return;
      const marker = L.marker(room.pos, {icon:roomIcon(room, state.selectedRoom?.id === room.id), keyboard:true, title:`Room ${room.id}`});
      marker.on('click', () => selectRoom(room));
      marker.addTo(roomLayer);
    });
  }

  function renderAmenities() {
    amenityLayer.clearLayers();
    if (state.facility === 'NONE') return;
    D.amenities.forEach(a => {
      if (a.type !== state.facility) return;
      if (state.building !== 'ALL' && a.bldg && a.bldg !== state.building) return;
      if (state.floor !== 'ALL' && a.floor && a.floor !== state.floor) return;
      const icon = L.divIcon({className:'',iconSize:[32,32],iconAnchor:[16,16],html:`<div class="amenity-marker">${amenityEmoji[a.type] || '•'}</div>`});
      L.marker(a.pos,{icon,title:a.name}).bindTooltip(a.name,{direction:'top'}).addTo(amenityLayer);
    });
  }

  function selectRoom(room, openCard=true) {
    state.selectedRoom = room;
    renderRooms();
    map.flyTo(room.pos, Math.max(map.getZoom(),1.35), {duration:.35});
    if (!openCard) return;
    $('roomTitle').textContent = `Room ${room.id}`;
    $('roomEyebrow').textContent = room.dept;
    $('roomMeta').textContent = `${room.bldg} · ${floorName(room.floor)}`;
    $('favoriteBtn').textContent = isFavorite(room.id) ? '★ Saved' : '☆ Save';
    $('favoriteBtn').setAttribute('aria-pressed', isFavorite(room.id));
    $('roomCard').hidden = false;
    $('routePanel').hidden = true;
  }

  function isFavorite(id) { return state.favorites.includes(id); }
  function toggleFavorite(room) {
    if (!room) return;
    state.favorites = isFavorite(room.id) ? state.favorites.filter(x=>x!==room.id) : [...state.favorites,room.id];
    storage.set('cm_favorites',state.favorites);
    $('favoriteBtn').textContent = isFavorite(room.id) ? '★ Saved' : '☆ Save';
    $('favoriteBtn').setAttribute('aria-pressed', isFavorite(room.id));
    toast(isFavorite(room.id) ? `Room ${room.id} saved` : `Room ${room.id} removed from saved`);
  }

  function addRecent(item) {
    const key = item.kind === 'room' ? item.id : `${item.kind}:${item.id}`;
    state.recents = [{...item,_key:key}, ...state.recents.filter(x=>x._key!==key)].slice(0,6);
    storage.set('cm_recents',state.recents);
  }

  function addDay(room) {
    if (!room || state.day.includes(room.id)) { toast('That room is already in My day'); return; }
    state.day.push(room.id); storage.set('cm_day',state.day); toast(`Room ${room.id} added to My day`);
  }

  function renderPosition() {
    positionLayer.clearLayers();
    if (!state.position?.pos) return;
    const icon = L.divIcon({className:'',iconSize:[34,34],iconAnchor:[17,17],html:`<div class="user-position"><div class="cone" id="headingCone" style="transform:rotate(${state.heading}deg)"></div><div class="dot"></div></div>`});
    L.marker(state.position.pos,{icon,zIndexOffset:1000,title:'My indoor position'}).addTo(positionLayer);
  }

  function setPosition(pos, label='Pinned location', roomId=null) {
    state.position = {pos:[Math.round(pos[0]),Math.round(pos[1])],label,roomId};
    storage.set('cm_position',state.position); renderPosition(); enableCompass(); toast(`Position set: ${label}`);
  }

  async function enableCompass() {
    try {
      if (typeof DeviceOrientationEvent === 'undefined') return;
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        const p = await DeviceOrientationEvent.requestPermission();
        if (p !== 'granted') return;
      }
      window.removeEventListener('deviceorientation', handleOrientation, true);
      window.addEventListener('deviceorientation', handleOrientation, true);
    } catch {}
  }
  function handleOrientation(e) {
    const heading = Number.isFinite(e.webkitCompassHeading) ? e.webkitCompassHeading : (Number.isFinite(e.alpha) ? 360-e.alpha : 0);
    state.heading = Math.round(heading || 0);
    const cone = $('headingCone'); if (cone) cone.style.transform = `rotate(${state.heading}deg)`;
  }

  function setPositionInteractively() {
    closeAllModals();
    toast('Tap the floor plan where you are standing');
    const oldCursor = map.getContainer().style.cursor;
    map.getContainer().style.cursor = 'crosshair';
    map.once('click', e => {
      map.getContainer().style.cursor = oldCursor;
      setPosition([e.latlng.lat,e.latlng.lng]);
      map.flyTo(state.position.pos, Math.max(map.getZoom(),1.35));
    });
  }

  function pathfind(startId, endId, stepFree=state.stepFree) {
    const startNode = D.roomToNode[startId], endNode = D.roomToNode[endId];
    if (!startNode || !endNode || !D.graph[startNode] || !D.graph[endNode]) return {ok:false,reason:'This room is not yet connected to the routing graph.'};
    if (startNode === endNode) {
      const s=D.rooms.find(r=>r.id===startId), t=D.rooms.find(r=>r.id===endId);
      return {ok:true,nodes:[startNode],coords:[s.pos,D.graph[startNode].pos,t.pos],cost:.5,edgeTypes:[]};
    }
    const dist = Object.fromEntries(Object.keys(D.graph).map(k=>[k,Infinity]));
    const prev = {}, prevEdge = {}, unvisited = new Set(Object.keys(D.graph)); dist[startNode]=0;
    while (unvisited.size) {
      let current=null, best=Infinity;
      for (const n of unvisited) if (dist[n] < best) { best=dist[n]; current=n; }
      if (!current || best === Infinity) break;
      unvisited.delete(current); if (current===endNode) break;
      for (const edge of D.graph[current].edges) {
        if (!unvisited.has(edge.node)) continue;
        if (stepFree && edge.type === 'STAIRS') continue;
        const alt=dist[current]+edge.weight;
        if (alt < dist[edge.node]) { dist[edge.node]=alt; prev[edge.node]=current; prevEdge[edge.node]=edge.type; }
      }
    }
    if (!Number.isFinite(dist[endNode])) return {ok:false,reason:stepFree?'No verified step-free path is currently mapped between these rooms.':'No connected path is currently mapped between these rooms.'};
    const nodes=[]; let c=endNode; while(c){nodes.unshift(c); if(c===startNode) break; c=prev[c];}
    if(nodes[0]!==startNode) return {ok:false,reason:'No connected route could be verified.'};
    const startRoom=D.rooms.find(r=>r.id===startId), endRoom=D.rooms.find(r=>r.id===endId);
    const coords=[startRoom.pos,...nodes.map(n=>D.graph[n].pos),endRoom.pos];
    const edgeTypes=nodes.slice(1).map(n=>prevEdge[n]).filter(Boolean);
    return {ok:true,nodes,coords,cost:dist[endNode],edgeTypes,startRoom,endRoom};
  }

  function routeSteps(result) {
    const steps=[{text:`Leave Room ${result.startRoom.id}`,sub:`${result.startRoom.bldg} · ${floorName(result.startRoom.floor)}`}];
    result.nodes.forEach((node,i)=>{
      if(i===0 && result.nodes.length>1) return;
      const type = result.edgeTypes[i-1];
      const verb = type==='LIFT' ? 'Take the lift to' : type==='STAIRS' ? 'Use the stairs to' : 'Continue through';
      steps.push({text:`${verb} ${D.graph[node].name}`,sub:type==='LIFT'?'Step-free segment':type==='STAIRS'?'Stairs':''});
    });
    steps.push({text:`Arrive at Room ${result.endRoom.id}`,sub:`${result.endRoom.bldg} · ${floorName(result.endRoom.floor)}`});
    return steps;
  }

  function startRoute(fromRoom,toRoom) {
    if (!fromRoom || !toRoom) { toast('Choose both a starting room and destination'); return; }
    if (fromRoom.id===toRoom.id) { toast('Start and destination are the same room'); return; }
    const result=pathfind(fromRoom.id,toRoom.id,state.stepFree);
    if(!result.ok){ toast(result.reason, 4200); return; }
    routeLayer.clearLayers();
    const routeColor=getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#0b5fff';
    const line=L.polyline(result.coords,{color:routeColor,weight:7,opacity:.92,lineCap:'round',lineJoin:'round'}).addTo(routeLayer);
    L.circleMarker(result.startRoom.pos,{radius:9,color:'#fff',weight:3,fillColor:'#15803d',fillOpacity:1}).addTo(routeLayer);
    L.circleMarker(result.endRoom.pos,{radius:9,color:'#fff',weight:3,fillColor:'#c62828',fillOpacity:1}).addTo(routeLayer);
    state.route={from:fromRoom,to:toRoom,result};
    $('routeTitle').textContent=`${fromRoom.id} → ${toRoom.id}`;
    const modes=[...new Set(result.edgeTypes)];
    $('routeSummary').textContent=`${state.stepFree?'Step-free · ':''}${modes.includes('LIFT')?'Lift included · ':''}Indoor route`; 
    const steps=routeSteps(result);
    $('routeSteps').innerHTML=steps.map(s=>`<li>${escapeHtml(s.text)}${s.sub?`<small>${escapeHtml(s.sub)}</small>`:''}</li>`).join('');
    $('routePanel').hidden=false; $('roomCard').hidden=true; closeAllModals();
    map.fitBounds(line.getBounds(),{paddingTopLeft:[90,170],paddingBottomRight:[60,150]});
    updateUrlRoute(fromRoom.id,toRoom.id);
  }

  function clearRoute() {
    state.route=null; routeLayer.clearLayers(); $('routePanel').hidden=true;
    const url=new URL(location.href); url.searchParams.delete('from'); url.searchParams.delete('to'); history.replaceState({},'',url);
  }

  function speakRoute() {
    if(!state.route || !('speechSynthesis' in window)){toast('Read-aloud is not available on this device');return;}
    speechSynthesis.cancel();
    const text=routeSteps(state.route.result).map(s=>s.text).join('. ');
    const u=new SpeechSynthesisUtterance(text); u.rate=.95; speechSynthesis.speak(u);
  }

  async function shareRoute() {
    if(!state.route)return;
    const url=new URL(location.href); url.searchParams.set('from',state.route.from.id);url.searchParams.set('to',state.route.to.id);
    const data={title:'Campus route',text:`Route from ${state.route.from.id} to ${state.route.to.id}`,url:url.toString()};
    try { if(navigator.share) await navigator.share(data); else { await navigator.clipboard.writeText(data.url); toast('Route link copied'); } } catch {}
  }
  function updateUrlRoute(from,to){ const url=new URL(location.href);url.searchParams.set('from',from);url.searchParams.set('to',to);history.replaceState({},'',url); }

  function queryItems(q='') {
    const needle=q.trim().toLowerCase();
    const rooms=D.rooms.map(r=>({kind:'room',id:r.id,title:`Room ${r.id}`,subtitle:`${r.dept} · ${r.bldg} · ${floorName(r.floor)}`,room:r,terms:`${r.id} ${r.dept} ${r.bldg} ${floorName(r.floor)}`.toLowerCase()}));
    const amenities=D.amenities.map(a=>({kind:'amenity',id:a.id,title:a.name,subtitle:`${amenityName[a.type]||a.type}${a.bldg?` · ${a.bldg}`:''}`,amenity:a,terms:`${a.name} ${a.type} ${a.bldg||''}`.toLowerCase()}));
    let items=[...rooms,...amenities];
    if(needle) items=items.filter(x=>x.terms.includes(needle));
    return items.slice(0,30);
  }

  function renderResultList(container,items,onPick) {
    container.innerHTML='';
    if(!items.length){container.innerHTML='<div class="empty-state">No matching places found.</div>';return;}
    items.forEach(item=>{
      const b=document.createElement('button'); b.className='result-row';
      b.innerHTML=`<span class="result-icon">${item.kind==='room'?'R':amenityEmoji[item.amenity.type]||'•'}</span><span class="result-main"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.subtitle)}</small></span><span>›</span>`;
      b.addEventListener('click',()=>onPick(item)); container.appendChild(b);
    });
  }

  function openSearch() {
    openModal('searchModal'); renderSearch(''); setTimeout(()=>$('searchInput').focus(),50);
  }
  function renderSearch(q) {
    renderResultList($('searchResults'),queryItems(q),item=>{
      addRecent(item.kind==='room'?{kind:'room',id:item.id,title:item.title,subtitle:item.subtitle}:{kind:'amenity',id:item.id,title:item.title,subtitle:item.subtitle});
      closeAllModals();
      if(item.kind==='room') selectRoom(item.room); else { state.facility=item.amenity.type; renderAmenities(); map.flyTo(item.amenity.pos,1.5); toast(item.amenity.name); }
    });
    renderRecents();
  }
  function renderRecents() {
    const items=state.recents.map(x=>{
      if(x.kind==='room'){const r=D.rooms.find(r=>r.id===x.id);return r?{kind:'room',id:r.id,title:`Room ${r.id}`,subtitle:`${r.dept} · ${r.bldg}`,room:r}:null;}
      const a=D.amenities.find(a=>a.id===x.id);return a?{kind:'amenity',id:a.id,title:a.name,subtitle:amenityName[a.type],amenity:a}:null;
    }).filter(Boolean);
    $('recentWrap').hidden=!items.length;
    renderResultList($('recentList'),items,item=>{closeAllModals(); item.kind==='room'?selectRoom(item.room):(state.facility=item.amenity.type,renderAmenities(),map.flyTo(item.amenity.pos,1.5));});
  }

  function openPicker(target) {
    state.pickerTarget=target; $('pickerHeading').textContent=target==='from'?'Choose starting room':'Choose destination';
    renderPicker(''); openModal('pickerModal',true); setTimeout(()=>$('pickerSearch').focus(),30);
  }
  function renderPicker(q='') {
    const needle=q.trim().toLowerCase(); const rooms=D.rooms.filter(r=>!needle||`${r.id} ${r.dept} ${r.bldg}`.toLowerCase().includes(needle));
    renderResultList($('pickerResults'),rooms.map(r=>({kind:'room',id:r.id,title:`Room ${r.id}`,subtitle:`${r.dept} · ${r.bldg} · ${floorName(r.floor)}`,room:r})),item=>{
      if(state.pickerTarget==='from')state.fromRoom=item.room; else state.toRoom=item.room; updateRouteForm(); closeModal('pickerModal');
    });
  }
  function updateRouteForm(){ $('fromLabel').textContent=state.fromRoom?`Room ${state.fromRoom.id} · ${state.fromRoom.bldg}`:'Choose starting point'; $('toLabel').textContent=state.toRoom?`Room ${state.toRoom.id} · ${state.toRoom.bldg}`:'Choose destination'; $('stepFreeToggle').checked=state.stepFree; $('stepFreeQuickBtn').setAttribute('aria-pressed',String(state.stepFree)); }
  function openNavigate(prefillTo=null){ if(prefillTo)state.toRoom=prefillTo; updateRouteForm();openModal('navigateModal'); }

  function openFilter(kind='building') {
    const groups=[
      {id:'building',title:'Building',values:['ALL',...Object.keys(D.buildings)],label:v=>v==='ALL'?'All buildings':v},
      {id:'floor',title:'Floor',values:['ALL','LG','G','1','2'],label:v=>v==='ALL'?'All floors':floorName(v)},
      {id:'facility',title:'Facilities',values:['NONE','PRINTER','WATER','LIFT','STUDY'],label:v=>v==='NONE'?'Hide facilities':amenityName[v]}
    ];
    $('filterContent').innerHTML=groups.map(g=>`<section class="filter-group" data-group="${g.id}"><h3>${g.title}</h3><div class="option-grid">${g.values.map(v=>`<button class="option-button ${state[g.id]===v?'active':''}" data-value="${v}">${escapeHtml(g.label(v))}</button>`).join('')}</div></section>`).join('');
    $('filterContent').querySelectorAll('.option-button').forEach(btn=>btn.addEventListener('click',()=>{const group=btn.closest('.filter-group').dataset.group;state[group]=btn.dataset.value;applyFilters();openFilter(group);}));
    openModal('filterModal');
    setTimeout(()=>document.querySelector(`[data-group="${kind}"]`)?.scrollIntoView({block:'nearest'}),0);
  }
  function applyFilters(){ renderRooms();renderAmenities();updateContext(); if(state.building!=='ALL'&&D.buildings[state.building])map.fitBounds(D.buildings[state.building],{padding:[35,35]}); }
  function updateContext(){
    $('contextLabel').textContent=`${state.building==='ALL'?'All buildings':state.building} · ${state.floor==='ALL'?'All floors':floorName(state.floor)}`;
    $('buildingFilterBtn').innerHTML=`Building <span>${state.building==='ALL'?'All':escapeHtml(state.building)}</span>`;
    $('floorFilterBtn').innerHTML=`Floor <span>${state.floor==='ALL'?'All':escapeHtml(floorName(state.floor))}</span>`;
    $('facilityFilterBtn').classList.toggle('active',state.facility!=='NONE');
  }

  function renderSaved(){ const rooms=state.favorites.map(id=>D.rooms.find(r=>r.id===id)).filter(Boolean); renderResultList($('savedList'),rooms.map(r=>({kind:'room',id:r.id,title:`Room ${r.id}`,subtitle:`${r.dept} · ${r.bldg}`,room:r})),item=>{closeAllModals();selectRoom(item.room);}); }
  function renderDay(){
    const wrap=$('dayList'); wrap.innerHTML='';
    if(!state.day.length){wrap.innerHTML='<div class="empty-state">Add rooms from the map to build a multi-stop route.</div>';return;}
    state.day.forEach((id,i)=>{const r=D.rooms.find(r=>r.id===id);if(!r)return;const row=document.createElement('div');row.className='result-row';row.innerHTML=`<span class="result-icon">${i+1}</span><span class="result-main"><strong>Room ${r.id}</strong><small>${r.bldg} · ${r.dept}</small></span><button class="icon-button subtle" aria-label="Remove Room ${r.id}">×</button>`;row.querySelector('button').onclick=()=>{state.day=state.day.filter(x=>x!==id);storage.set('cm_day',state.day);renderDay();};wrap.appendChild(row);});
  }
  function buildDayRoute(){
    if(state.day.length<2){toast('Add at least two rooms to My day');return;}
    routeLayer.clearLayers(); let coords=[],failed=[]; let totalEdges=[];
    for(let i=0;i<state.day.length-1;i++){const a=state.day[i],b=state.day[i+1],r=pathfind(a,b,state.stepFree);if(!r.ok){failed.push(`${a} → ${b}`);continue;}coords=coords.concat(coords.length?r.coords.slice(1):r.coords);totalEdges.push(...r.edgeTypes);}
    if(failed.length){toast(`Could not verify: ${failed.join(', ')}`,5000);return;}
    const line=L.polyline(coords,{color:'#15803d',weight:7,opacity:.9,lineCap:'round'}).addTo(routeLayer);
    $('routeTitle').textContent=`My day · ${state.day.length} stops`;$('routeSummary').textContent=state.day.join(' → ');
    $('routeSteps').innerHTML=state.day.map((id,i)=>`<li>${i===0?'Start at':'Continue to'} Room ${escapeHtml(id)}</li>`).join('');
    state.route={day:true};$('routePanel').hidden=false;closeAllModals();map.fitBounds(line.getBounds(),{padding:[80,100]});
  }

  function renderLegend(){ $('departmentLegend').innerHTML=D.departments.map(d=>`<div class="department-card" style="background:${d.color}">${escapeHtml(d.name)}</div>`).join(''); }
  function cycleTheme(){ const order=['system','light','dark'];state.theme=order[(order.indexOf(state.theme)+1)%order.length];storage.set('cm_theme',state.theme);document.documentElement.dataset.theme=state.theme;$('themeValue').textContent=state.theme[0].toUpperCase()+state.theme.slice(1);toast(`Appearance: ${$('themeValue').textContent}`); }

  function openModal(id,nested=false){ if(!nested) closeAllModals(); $(id).hidden=false;$('modalBackdrop').hidden=false; }
  function closeModal(id){$(id).hidden=true; const any=[...document.querySelectorAll('.modal-sheet')].some(m=>!m.hidden);$('modalBackdrop').hidden=!any;}
  function closeAllModals(){document.querySelectorAll('.modal-sheet').forEach(m=>m.hidden=true);$('modalBackdrop').hidden=true;}
  function toast(msg,duration=2200){const t=$('toast');t.textContent=msg;t.hidden=false;clearTimeout(toast._t);toast._t=setTimeout(()=>t.hidden=true,duration);}
  function escapeHtml(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

  function networkStatus(){ $('offlineBanner').hidden=navigator.onLine; }
  window.addEventListener('online',networkStatus);window.addEventListener('offline',networkStatus);networkStatus();

  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();state.deferredInstall=e;$('installBtn').hidden=false;});
  $('installBtn').addEventListener('click',async()=>{if(!state.deferredInstall)return;state.deferredInstall.prompt();await state.deferredInstall.userChoice;state.deferredInstall=null;$('installBtn').hidden=true;});

  if('serviceWorker' in navigator){
    window.addEventListener('load',async()=>{
      try{const reg=await navigator.serviceWorker.register('./sw.js');reg.addEventListener('updatefound',()=>{const w=reg.installing;w?.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller)$('updateBanner').hidden=false;});});}catch(e){console.warn('Service worker registration failed',e);}
    });
    navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload());
  }
  $('reloadAppBtn').onclick=()=>location.reload();

  $('searchTrigger').onclick=openSearch; $('searchInput').oninput=e=>renderSearch(e.target.value); $('clearSearchBtn').onclick=()=>{$('searchInput').value='';renderSearch('');$('searchInput').focus();};
  $('clearRecentsBtn').onclick=()=>{state.recents=[];storage.set('cm_recents',[]);renderRecents();};
  $('moreBtn').onclick=()=>openModal('moreModal');
  $('buildingFilterBtn').onclick=()=>openFilter('building'); $('floorFilterBtn').onclick=()=>openFilter('floor'); $('facilityFilterBtn').onclick=()=>openFilter('facility');
  $('stepFreeQuickBtn').onclick=()=>{state.stepFree=!state.stepFree;storage.set('cm_stepfree',state.stepFree);updateRouteForm();toast(state.stepFree?'Step-free routing on':'Step-free routing off');};
  $('zoomInBtn').onclick=()=>map.zoomIn();$('zoomOutBtn').onclick=()=>map.zoomOut();$('fitBtn').onclick=()=>map.fitBounds(bounds,{padding:[20,20]});$('positionBtn').onclick=setPositionInteractively;
  $('closeRoomBtn').onclick=()=>{$('roomCard').hidden=true;state.selectedRoom=null;renderRooms();};
  $('directionsBtn').onclick=()=>{if(state.selectedRoom)openNavigate(state.selectedRoom);}; $('setStartBtn').onclick=()=>{if(!state.selectedRoom)return;state.fromRoom=state.selectedRoom;setPosition(state.selectedRoom.pos,`Room ${state.selectedRoom.id}`,state.selectedRoom.id);toast(`Start set to Room ${state.selectedRoom.id}`);};
  $('favoriteBtn').onclick=()=>toggleFavorite(state.selectedRoom); $('addStopBtn').onclick=()=>addDay(state.selectedRoom);
  $('closeRouteBtn').onclick=clearRoute; $('speakRouteBtn').onclick=speakRoute;$('shareRouteBtn').onclick=shareRoute;
  $('fromPicker').onclick=()=>openPicker('from');$('toPicker').onclick=()=>openPicker('to');$('pickerSearch').oninput=e=>renderPicker(e.target.value);
  $('swapRouteBtn').onclick=()=>{[state.fromRoom,state.toRoom]=[state.toRoom,state.fromRoom];updateRouteForm();};
  $('stepFreeToggle').onchange=e=>{state.stepFree=e.target.checked;storage.set('cm_stepfree',state.stepFree);updateRouteForm();};
  $('useMapPositionBtn').onclick=()=>{if(state.position?.roomId){state.fromRoom=D.rooms.find(r=>r.id===state.position.roomId)||null;updateRouteForm();toast(state.fromRoom?`Using Room ${state.fromRoom.id} as start`:'Pinned position is not tied to a room');}else toast('Pin your location or set a room as your start point');};
  $('startRouteBtn').onclick=()=>startRoute(state.fromRoom,state.toRoom);
  $('resetFiltersBtn').onclick=()=>{state.building='ALL';state.floor='ALL';state.facility='NONE';applyFilters();openFilter();map.fitBounds(bounds);};
  $('themeBtn').onclick=cycleTheme;$('departmentBtn').onclick=()=>{$('departmentLegend').hidden=!$('departmentLegend').hidden;};$('clearPositionBtn').onclick=()=>{state.position=null;storage.set('cm_position',null);renderPosition();toast('Indoor position cleared');};
  $('clearDayBtn').onclick=()=>{state.day=[];storage.set('cm_day',[]);renderDay();};$('buildDayBtn').onclick=buildDayRoute;
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>closeModal(b.dataset.close)); $('modalBackdrop').onclick=closeAllModals;
  document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>{document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));b.classList.add('active');const a=b.dataset.action;if(a==='map'){closeAllModals();}if(a==='navigate')openNavigate();if(a==='saved'){renderSaved();openModal('savedModal');}if(a==='day'){renderDay();openModal('dayModal');}});
  window.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();openSearch();}if(e.key==='Escape')closeAllModals();});

  function hydrateDeepLink(){
    const u=new URL(location.href);
    const action=u.searchParams.get('action');
    const f=u.searchParams.get('from')?.toUpperCase(),t=u.searchParams.get('to')?.toUpperCase();
    if(f&&t){
      const fr=D.rooms.find(r=>r.id===f),tr=D.rooms.find(r=>r.id===t);
      if(fr&&tr){state.fromRoom=fr;state.toRoom=tr;setTimeout(()=>startRoute(fr,tr),250);return;}
    }
    if(action==='search') setTimeout(openSearch,180);
    if(action==='navigate') setTimeout(()=>openNavigate(),180);
  }

  $('themeValue').textContent=state.theme[0].toUpperCase()+state.theme.slice(1);renderLegend();updateRouteForm();updateContext();renderRooms();renderAmenities();renderPosition();hydrateDeepLink();
})();