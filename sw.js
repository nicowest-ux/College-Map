const CACHE='campus-navigator-v6-nav-20261002';
const CORE=['./','./index.html','./styles.css','./nav-core.js','./data.js','./app.js','./manifest.json','./floorplan.png','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);if(r.mode==='navigate'){e.respondWith(fetch(r).then(res=>{if(res&&res.ok){const cp=res.clone();caches.open(CACHE).then(c=>c.put('./index.html',cp));}return res;}).catch(()=>caches.match('./index.html')));return;}if(u.origin===self.location.origin){e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{if(res&&res.ok){const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp));}return res;})));}});
