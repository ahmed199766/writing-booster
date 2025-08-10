self.addEventListener('install',e=>{ self.skipWaiting(); });
self.addEventListener('activate',e=>{ return self.clients.claim(); });
self.addEventListener('fetch',e=>{
  const url = new URL(e.request.url);
  if(e.request.mode==='navigate'){
    e.respondWith(fetch(e.request).catch(()=>caches.match('index.html')));
    return;
  }
  e.respondWith(caches.open('wb35-cache').then(async cache=>{
    const res = await cache.match(e.request);
    if(res) return res;
    const net = await fetch(e.request).catch(()=>null);
    if(net && e.request.method==='GET' && (url.pathname.endsWith('.css')||url.pathname.endsWith('.js')||url.pathname.endsWith('.html'))) cache.put(e.request, net.clone());
    return net || new Response('',{status:504});
  }));
});