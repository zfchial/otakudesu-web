function nkAdmin(){return localStorage.getItem('nanostream-role')==='admin'}
function syncNkAdminNav(){
  const on=nkAdmin();
  document.querySelectorAll('[data-admin-only]').forEach(el=>el.classList.toggle('hidden',!on));
}
syncNkAdminNav();
function nkImg(url,title){
  if(!url)return `<div class="poster-fallback"></div>`;
  const src=`${API}/nkvideo/image?token=${encodeURIComponent(authToken||'')}&url=${encodeURIComponent(url)}`;
  return `<img src="${esc(src)}" alt="${esc(title||'')}" loading="lazy" decoding="async">`;
}
function nkCard(a){
  return `<article class="card" data-slug="${esc(a.slug||'')}" onclick="loadNkDetail(this.dataset.slug)">
    <div class="poster">${nkImg(a.cover,a.title)}</div>
    <div class="card-body"><div class="card-title" title="${esc(a.title||'')}">${esc(a.title||'')}</div><div class="meta">${esc(a.date||'')}</div></div>
  </article>`;
}
function nkLocked(gen){
  setView(gen,`<div class="empty"><strong>Halaman khusus admin.</strong><p>Masuk dengan akun admin untuk membuka katalog ini.</p><button class="btn btn-primary" onclick="showAuth()">Masuk</button> <button class="btn btn-secondary" onclick="navClick('home',loadHome)">Beranda</button></div>`);
}
function nkPager(page,total,fn){
  return `<div class="pager"><button class="btn btn-secondary" ${page<=1?'disabled':''} onclick="${fn}(${Math.max(1,page-1)})">&#8592; Sebelumnya</button><span>Halaman ${page}</span><button class="btn btn-secondary" ${total<18?'disabled':''} onclick="${fn}(${page+1})">Berikutnya &#8594;</button></div>`;
}
async function loadNkHome(page=1){
  const gen=view('loadNkHome',[page]);
  if(!nkAdmin())return nkLocked(gen);
  setActiveNav('nkvideo');
  setView(gen,`<div class="loading-state">Memuat katalog...</div>`);
  try{
    const d=await authApi(`/nkvideo/home?page=${page}&limit=18`);
    if(stale(gen))return;
    const items=(d.data&&d.data.items)||[];
    setView(gen,`${head('Katalog Video','Sumber tambahan · khusus admin')}
      <section class="section">
        <div class="nk-search"><input id="nkSearchInput" type="search" placeholder="Cari judul..." onkeydown="if(event.key==='Enter')nkSearchGo()"><button class="btn btn-primary" onclick="nkSearchGo()">Cari</button></div>
        <div class="nk-cats">
          <button class="pill active" onclick="loadNkHome(1)">Semua</button>
          <button class="pill" onclick="loadNkCategory('hentai')">Hentai</button>
          <button class="pill" onclick="loadNkCategory('2d-animation')">2D Animation</button>
          <button class="pill" onclick="loadNkCategory('3d-hentai')">3D Hentai</button>
          <button class="pill" onclick="loadNkCategory('jav')">JAV</button>
        </div>
      </section>
      <section class="section">${items.length?`<div class="grid">${items.map(nkCard).join('')}</div>`:'<div class="empty">Tidak ada judul.</div>'}</section>
      <section class="section">${nkPager(page,items.length,'loadNkHome')}</section>`);
  }catch(e){if(!stale(gen))setView(gen,`<div class="empty">${esc(e.message||'Gagal memuat katalog')}</div>`)}
}
async function loadNkCategory(cat,page=1){
  const gen=view('loadNkCategory',[cat,page]);
  if(!nkAdmin())return nkLocked(gen);
  setActiveNav('nkvideo');
  setView(gen,`<div class="loading-state">Memuat katalog...</div>`);
  try{
    const d=await authApi(`/nkvideo/home?category=${encodeURIComponent(cat)}&page=${page}&limit=18`);
    if(stale(gen))return;
    const items=(d.data&&d.data.items)||[];
    setView(gen,`${head(`Kategori ${esc(cat)}`,'Khusus admin',"loadNkHome()")}
      <section class="section">${items.length?`<div class="grid">${items.map(nkCard).join('')}</div>`:'<div class="empty">Tidak ada judul pada kategori ini.</div>'}</section>
      <section class="section">${nkPager(page,items.length,`loadNkCategory('${esc(cat)}')`)}</section>`);
  }catch(e){if(!stale(gen))setView(gen,`<div class="empty">${esc(e.message||'Gagal memuat katalog')}</div>`)}
}
function nkSearchGo(){
  const q=document.getElementById('nkSearchInput')?.value.trim();
  if(q)loadNkSearch(q);
}
async function loadNkSearch(q,page=1){
  const gen=view('loadNkSearch',[q,page]);
  if(!nkAdmin())return nkLocked(gen);
  setActiveNav('nkvideo');
  setView(gen,`<div class="loading-state">Mencari...</div>`);
  try{
    const d=await authApi(`/nkvideo/search?q=${encodeURIComponent(q)}&page=${page}&limit=18`);
    if(stale(gen))return;
    const items=(d.data&&d.data.items)||[];
    setView(gen,`${head(`Hasil: ${esc(q)}`,`${items.length} judul`,"loadNkHome()")}
      <section class="section">${items.length?`<div class="grid">${items.map(nkCard).join('')}</div>`:'<div class="empty">Tidak ada hasil.</div>'}</section>
      <section class="section">${nkPager(page,items.length,`loadNkSearch('${esc(q)}')`)}</section>`);
  }catch(e){if(!stale(gen))setView(gen,`<div class="empty">${esc(e.message||'Pencarian gagal')}</div>`)}
}
async function loadNkDetail(slug){
  const gen=view('loadNkDetail',[slug]);
  if(!nkAdmin())return nkLocked(gen);
  setActiveNav('nkvideo');
  setView(gen,`<div class="loading-state">Memuat detail...</div>`);
  try{
    const d=await authApi(`/nkvideo/detail?slug=${encodeURIComponent(slug)}`);
    if(stale(gen))return;
    const a=(d.data&&d.data.item)||{};
    const info=(d.data&&d.data.info)||[];
    const streams=(d.data&&d.data.streams)||[];
    setView(gen,`<section class="section">
      <button class="btn btn-secondary" onclick="loadNkHome()">&#8592; Katalog</button>
      <div class="nk-detail">
        <div class="nk-cover">${nkImg(a.cover,a.title)}</div>
        <div class="nk-meta"><h1>${esc(a.title||'')}</h1>
          <p class="muted">${esc(a.date||'')}</p>
          <div class="nk-info">${info.map(x=>`<div><span>${esc(x.key)}</span><b>${esc(x.value)}</b></div>`).join('')}</div>
        </div>
      </div>
    </section>
    <section class="section">${head('Streaming',`${streams.length} server`)}
      <div class="nk-servers">${streams.map((s,i)=>`<button class="btn ${i===0?'btn-primary':'btn-secondary'}" data-url="${esc(s.url)}" data-i="${i}" onclick="nkPlay(this)">${esc(s.label)}</button>`).join('')||'<div class="empty">Server tidak tersedia.</div>'}</div>
      <div id="nkPlayer" class="nk-player hidden"><div class="nk-player-head"><span id="nkServerLabel"></span><button class="btn btn-secondary" onclick="nkClosePlayer()">Tutup</button><a id="nkOpenTab" class="btn btn-secondary" target="_blank" rel="noopener" href="#">Buka di Tab Baru</a></div><iframe id="nkFrame" src="" allowfullscreen="true" scrolling="no" frameborder="0" title="Player"></iframe></div>
    </section>`);
  }catch(e){if(!stale(gen))setView(gen,`<div class="empty">${esc(e.message||'Gagal memuat detail')}</div>`)}
}
function nkPlay(btn){
  const frame=document.getElementById('nkFrame');
  const box=document.getElementById('nkPlayer');
  if(!frame||!box)return;
  frame.src=btn.dataset.url||'';
  document.getElementById('nkServerLabel').textContent=btn.textContent.trim();
  const link=document.getElementById('nkOpenTab');
  if(link)link.href=btn.dataset.url||'#';
  box.classList.remove('hidden');
  document.querySelectorAll('.nk-servers .btn').forEach(b=>b.classList.toggle('btn-primary',b===btn));
  box.scrollIntoView({block:'center'});
}
function nkClosePlayer(){
  const frame=document.getElementById('nkFrame');
  if(frame)frame.src='about:blank';
  document.getElementById('nkPlayer')?.classList.add('hidden');
}
