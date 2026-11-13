const CACHE_SHELL='nanostream-shell-v17';
const CACHE_DATA='nanostream-data-v17';
const SHELL=[
  './',
  './index.html',
  './style.css',
  './app.js',
  './comic.js',
  './manifest.webmanifest',
  './icons/favicon-32.png',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_SHELL).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(k=>k!==CACHE_SHELL&&k!==CACHE_DATA).map(k=>caches.delete(k))
    )).then(()=>self.clients.claim())
  );
});

self.addEventListener('message',event=>{
  if(event.data&&event.data.type==='SKIP_WAITING')self.skipWaiting();
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);

  if(url.pathname.includes('/api/auth')||url.pathname.includes('/api/bookmarks')||url.pathname.includes('/api/history'))return;

  if(url.origin!==self.location.origin&&url.pathname.includes('/api/')){
    event.respondWith(
      fetch(event.request).then(res=>{
        if(res.ok){
          const copy=res.clone();
          caches.open(CACHE_DATA).then(c=>c.put(event.request,copy));
        }
        return res;
      }).catch(()=>caches.match(event.request))
    );
    return;
  }

  if(url.origin===self.location.origin){
    event.respondWith(
      fetch(event.request).then(res=>{
        if(res.ok){
          const copy=res.clone();
          caches.open(CACHE_SHELL).then(c=>c.put(event.request,copy));
        }
        return res;
      }).catch(()=>caches.match(event.request).then(r=>r||caches.match('./index.html')))
    );
  }
});
