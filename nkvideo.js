function nkAdmin(){return localStorage.getItem('nanostream-role')==='admin'}
function syncNkAdminNav(){
  const on=nkAdmin();
  document.querySelectorAll('[data-admin-only]').forEach(el=>el.classList.toggle('hidden',!on));
}
syncNkAdminNav();
const nkState={home:[],detail:null};
function nkDate(s){
  if(!s)return '';
  const d=new Date(s.replace(' ','T'));
  return isNaN(d)?s:d.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'});
}
function nkImgUrl(url){
  if(!url)return '';
  return `${API}/nkvideo/image?token=${encodeURIComponent(authToken||'')}&url=${encodeURIComponent(url)}`;
}
function nkImg(url,title){
  if(!url)return '<div class="nk-noimg">Tidak ada gambar</div>';
  return `<img src="${esc(nkImgUrl(url))}" alt="${esc(title||'')}" loading="lazy" decoding="async">`;
}
function nkCard(a){
  return `<article class="nk-card" data-slug="${esc(a.slug||'')}" onclick="loadNkDetail(this.dataset.slug)">
    <div class="nk-poster">${nkImg(a.cover,a.title)}<span class="nk-badge">18+</span><span class="nk-play">&#9654;</span></div>
    <div class="nk-card-body"><h3>${esc(a.title||'')}</h3><span>${esc(nkDate(a.date))}</span></div>
  </article>`;
}
function nkLocked(gen){
  setView(gen,`<div class="nk-locked"><div class="nk-lock-icon">&#128274;</div><h2>Khusus admin</h2><p>Masuk dengan akun admin untuk membuka katalog video.</p><div class="nk-row"><button class="btn btn-primary" onclick="showAuth()">Masuk</button><button class="btn btn-secondary" onclick="navClick('home',loadHome)">Beranda</button></div></div>`);
}
function nkPager(page,total,fn){
  return `<div class="nk-pager"><button class="btn btn-secondary" ${page<=1?'disabled':''} onclick="${fn}(${Math.max(1,page-1)})">&#8592; Sebelumnya</button><span>${page}</span><button class="btn btn-secondary" ${total<18?'disabled':''} onclick="${fn}(${page+1})">Berikutnya &#8594;</button></div>`;
}
function nkHero(title,sub,q){
  return `<section class="nk-hero">
    <div class="nk-hero-bg" style="background-image:url('${esc(nkImgUrl(nkState.home[0]?.cover||''))}')"></div>
    <div class="nk-hero-inner"><span class="nk-kicker">KHUSUS ADMIN</span><h1>${esc(title)}</h1><p>${esc(sub)}</p>
      <div class="nk-search"><span class="nk-search-ic">&#128269;</span><input id="nkSearchInput" type="search" value="${esc(q||'')}" placeholder="Cari judul video..." onkeydown="if(event.key==='Enter')nkSearchGo()"><button class="btn btn-primary" onclick="nkSearchGo()">Cari</button></div>
      <div class="nk-cats"><button class="nk-chip active" onclick="loadNkHome(1)">Semua</button><button class="nk-chip" onclick="loadNkCategory('hentai')">Hentai</button><button class="nk-chip" onclick="loadNkCategory('2d-animation')">2D Animation</button><button class="nk-chip" onclick="loadNkCategory('3d-hentai')">3D Hentai</button><button class="nk-chip" onclick="loadNkCategory('jav')">JAV</button></div>
    </div>
  </section>`;
}
function nkGrid(items,empty){
  return items.length?`<div class="nk-grid">${items.map(nkCard).join('')}</div>`:`<div class="nk-empty">${esc(empty||'Tidak ada judul ditemukan.')}</div>`;
}
async function loadNkHome(page=1){
  const gen=view('loadNkHome',[page]);
  if(!nkAdmin())return nkLocked(gen);
  setActiveNav('nkvideo');
  setView(gen,'<div class="nk-empty">Memuat katalog...</div>');
  try{
    const d=await authApi(`/nkvideo/home?page=${page}&limit=18`);
    if(stale(gen))return;
    const items=(d.data&&d.data.items)||[];
    nkState.home=items;
    setView(gen,`${nkHero('Katalog Video','Koleksi video sub Indonesia · akses admin','')}
      <section class="nk-section"><div class="nk-section-head"><h2>Terbaru</h2><span>${items.length} judul</span></div>${nkGrid(items)}</section>
      <section class="nk-section">${nkPager(page,items.length,'loadNkHome')}</section>`);
  }catch(e){if(!stale(gen))setView(gen,`<div class="nk-empty">${esc(e.message||'Gagal memuat katalog')}</div>`)}
}
async function loadNkCategory(cat,page=1){
  const gen=view('loadNkCategory',[cat,page]);
  if(!nkAdmin())return nkLocked(gen);
  setActiveNav('nkvideo');
  setView(gen,'<div class="nk-empty">Memuat katalog...</div>');
  try{
    const d=await authApi(`/nkvideo/home?category=${encodeURIComponent(cat)}&page=${page}&limit=18`);
    if(stale(gen))return;
    const items=(d.data&&d.data.items)||[];
    setView(gen,`${nkHero(`Kategori ${cat}`,`Filter: ${cat}`,'')}
      <section class="nk-section"><div class="nk-section-head"><h2>${esc(cat)}</h2><span>${items.length} judul</span></div>${nkGrid(items,'Tidak ada judul pada kategori ini.')}</section>
      <section class="nk-section">${nkPager(page,items.length,`loadNkCategory('${esc(cat)}')`)}</section>`);
  }catch(e){if(!stale(gen))setView(gen,`<div class="nk-empty">${esc(e.message||'Gagal memuat katalog')}</div>`)}
}
function nkSearchGo(){
  const q=document.getElementById('nkSearchInput')?.value.trim();
  if(q)loadNkSearch(q);
}
async function loadNkSearch(q,page=1){
  const gen=view('loadNkSearch',[q,page]);
  if(!nkAdmin())return nkLocked(gen);
  setActiveNav('nkvideo');
  setView(gen,'<div class="nk-empty">Mencari...</div>');
  try{
    const d=await authApi(`/nkvideo/search?q=${encodeURIComponent(q)}&page=${page}&limit=18`);
    if(stale(gen))return;
    const items=(d.data&&d.data.items)||[];
    setView(gen,`${nkHero(`Hasil: ${q}`,`${items.length} judul ditemukan`,q)}
      <section class="nk-section">${nkGrid(items,'Tidak ada hasil untuk kata kunci ini.')}</section>
      <section class="nk-section">${nkPager(page,items.length,`loadNkSearch('${esc(q)}')`)}</section>`);
  }catch(e){if(!stale(gen))setView(gen,`<div class="nk-empty">${esc(e.message||'Pencarian gagal')}</div>`)}
}
function nkTagList(info){
  const g=info.find(x=>/genre/i.test(x.key));
  if(!g)return '';
  return g.value.split(',').slice(0,6).map(t=>`<span class="nk-tag">${esc(t.trim())}</span>`).join('');
}
async function loadNkDetail(slug){
  const gen=view('loadNkDetail',[slug]);
  if(!nkAdmin())return nkLocked(gen);
  setActiveNav('nkvideo');
  setView(gen,'<div class="nk-empty">Memuat detail...</div>');
  try{
    const d=await authApi(`/nkvideo/detail?slug=${encodeURIComponent(slug)}`);
    if(stale(gen))return;
    const a=(d.data&&d.data.item)||{};
    const info=(d.data&&d.data.info)||[];
    const streams=(d.data&&d.data.streams)||[];
    nkState.detail=a;
    const direct=streams.some(s=>s.file);
    setView(gen,`<div class="nk-crumb"><button onclick="loadNkHome()">&#8592; Katalog</button><span>/</span><span>Detail</span></div>
      <section class="nk-detail">
        <div class="nk-cover">${nkImg(a.cover,a.title)}</div>
        <div class="nk-detail-body">
          <span class="nk-kicker">KHUSUS ADMIN</span>
          <h1>${esc(a.title||'')}</h1>
          <div class="nk-sub">${esc(nkDate(a.date))} &middot; ${streams.length} server &middot; ${direct?'Tanpa iklan':'Player eksternal'}</div>
          <div class="nk-tags">${nkTagList(info)}</div>
          <div class="nk-meta">${info.slice(0,8).map(x=>`<div><span>${esc(x.key)}</span><b>${esc(x.value)}</b></div>`).join('')}</div>
          <div class="nk-row"><button class="btn btn-primary" onclick="document.getElementById('nkPlayer').scrollIntoView({block:'center'});document.querySelector('.nk-srv')?.click()">&#9654; Tonton Sekarang</button><button class="btn btn-secondary" onclick="nkSave(this)">&#9733; Simpan</button></div>
        </div>
      </section>
      <section class="nk-section" id="nkPlayer">
        <div class="nk-section-head"><h2>Tonton</h2><span>${direct?'Video langsung, tanpa iklan':'Sumber player eksternal'}</span></div>
        <div class="nk-servers">${streams.map((s,i)=>`<button class="nk-srv ${i===0?'active':''}" data-url="${esc(s.url)}" data-file="${esc(s.file||'')}" data-i="${i}" onclick="nkPlay(this)">${esc(s.label)} ${s.file?'<small>HD</small>':''}</button>`).join('')||'<div class="nk-empty">Server tidak tersedia.</div>'}</div>
        <div class="nk-stage">
          <video id="nkVideo" class="nk-video hidden" controls playsinline preload="metadata" poster="${esc(nkImgUrl(a.cover))}"></video>
          <iframe id="nkFrame" class="nk-frame hidden" allowfullscreen="true" scrolling="no" frameborder="0" title="Player"></iframe>
          <div id="nkIdle" class="nk-idle"><span>&#9654;</span><p>Pilih server untuk memutar</p></div>
        </div>
        <div class="nk-tools"><a id="nkOpenTab" class="btn btn-secondary hidden" target="_blank" rel="noopener" href="#">Buka di Tab Baru</a><button class="btn btn-secondary hidden" id="nkCloseBtn" onclick="nkClosePlayer()">Tutup</button></div>
      </section>`);
  }catch(e){if(!stale(gen))setView(gen,`<div class="nk-empty">${esc(e.message||'Gagal memuat detail')}</div>`)}
}
function nkPlay(btn){
  const video=document.getElementById('nkVideo');
  const frame=document.getElementById('nkFrame');
  const idle=document.getElementById('nkIdle');
  if(!video||!frame||!idle)return;
  video.pause();
  frame.src='about:blank';
  document.querySelectorAll('.nk-srv').forEach(b=>b.classList.toggle('active',b===btn));
  idle.classList.add('hidden');
  document.getElementById('nkCloseBtn').classList.remove('hidden');
  const tab=document.getElementById('nkOpenTab');
  const file=btn.dataset.file||'';
  const embed=btn.dataset.url||'';
  if(file){
    video.classList.remove('hidden');
    frame.classList.add('hidden');
    video.src=file;
    video.play().catch(()=>{});
    tab.href=file;
    tab.textContent='Buka Video di Tab Baru';
  }else{
    frame.classList.remove('hidden');
    video.classList.add('hidden');
    frame.src=embed;
    tab.href=embed;
    tab.textContent='Buka Player di Tab Baru';
  }
  tab.classList.remove('hidden');
}
function nkClosePlayer(){
  const video=document.getElementById('nkVideo');
  const frame=document.getElementById('nkFrame');
  if(video){video.pause();video.removeAttribute('src');video.classList.add('hidden')}
  if(frame){frame.src='about:blank';frame.classList.add('hidden')}
  document.getElementById('nkIdle')?.classList.remove('hidden');
  document.getElementById('nkCloseBtn')?.classList.add('hidden');
  document.getElementById('nkOpenTab')?.classList.add('hidden');
}
function nkSave(btn){
  const a=nkState.detail||{};
  const key='nanostream-nk-saved';
  let arr=[];
  try{arr=JSON.parse(localStorage.getItem(key)||'[]')}catch(e){arr=[]}
  if(arr.some(x=>x.slug===a.slug)){
    arr=arr.filter(x=>x.slug!==a.slug);
    btn.textContent='\u2606 Simpan';
  }else{
    arr.unshift({slug:a.slug,title:a.title,cover:a.cover});
    btn.textContent='\u2605 Tersimpan';
  }
  localStorage.setItem(key,JSON.stringify(arr.slice(0,100)));
}
