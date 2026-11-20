const aiState={slug:'',episode:1,hls:null,streams:[]};
function aiImg(url,title){
  if(!url)return '<div class="ai-noimg">No image</div>';
  return `<img src="${esc(`${API}/aidrama/image?url=${encodeURIComponent(url)}`)}" alt="${esc(title||'')}" loading="lazy" decoding="async">`;
}
function aiCard(a){
  return `<article class="ai-card" data-slug="${esc(a.slug||'')}" onclick="loadAiDetail(this.dataset.slug)">
    <div class="ai-poster">${aiImg(a.cover,a.title)}<span class="ai-play">&#9654;</span></div>
    <div class="ai-card-body"><h3>${esc(a.title||'')}</h3><p>${esc((a.description||'').slice(0,90))}</p></div>
  </article>`;
}
function aiLocked(gen){
  setView(gen,`<div class="nk-empty">Memuat...</div>`);
}
async function loadAiHome(page=1){
  const gen=view('loadAiHome',[page]);
  setActiveNav('aidrama');
  setView(gen,'<div class="nk-empty">Memuat katalog...</div>');
  try{
    const d=await api(`/aidrama/home?page=${page}&limit=18`);
    if(stale(gen))return;
    const items=(d.data&&d.data.items)||[];
    const hot=(d.data&&d.data.trending)||[];
    setView(gen,`<section class="ai-hero">
      <div class="nk-kicker">TRENDING · DRAMA AI</div>
      <h1>Drama AI China</h1><p>Serial pendek AI yang lagi ramai · subtitle Indonesia</p>
      <div class="nk-search"><span class="nk-search-ic">&#128269;</span><input id="aiSearchInput" type="search" placeholder="Cari judul drama AI..." onkeydown="if(event.key==='Enter')aiSearchGo()"><button class="btn btn-primary" onclick="aiSearchGo()">Cari</button></div>
    </section>
    <section class="nk-section"><div class="nk-section-head"><h2>Sedang Trending</h2><span>Populer saat ini</span></div>
      <div class="ai-hot">${hot.map((h,i)=>`<button class="ai-hot-item" onclick="aiHotOpen('${esc(h.slug)}')"><span>${i+1}</span><b>${esc(h.name||'')}</b></button>`).join('')||'<div class="nk-empty">Belum ada data trending.</div>'}</div>
    </section>
    <section class="nk-section"><div class="nk-section-head"><h2>Episode Baru</h2><span>${items.length} judul</span></div>${items.length?`<div class="nk-grid">${items.map(aiCard).join('')}</div>`:'<div class="nk-empty">Tidak ada judul.</div>'}</section>
    <section class="nk-section"><div class="nk-pager"><button class="btn btn-secondary" ${page<=1?'disabled':''} onclick="loadAiHome(${Math.max(1,page-1)})">&#8592; Sebelumnya</button><span>${page}</span><button class="btn btn-secondary" ${items.length<18?'disabled':''} onclick="loadAiHome(${page+1})">Berikutnya &#8594;</button></div></section>`);
  }catch(e){if(!stale(gen))setView(gen,`<div class="nk-empty">${esc(e.message||'Gagal memuat katalog')}</div>`)}
}
function aiSearchGo(){
  const q=document.getElementById('aiSearchInput')?.value.trim();
  if(q)loadAiSearch(q);
}
async function aiHotOpen(slug){
  if(!slug)return;
  const gen=view('loadAiDetail',[slug]);
  setActiveNav('aidrama');
  setView(gen,'<div class="nk-empty">Memuat detail...</div>');
  try{
    const d=await api(`/aidrama/detail?slug=${encodeURIComponent(slug)}`);
    if(stale(gen))return;
    loadAiDetail(slug,d);
  }catch(e){if(!stale(gen))setView(gen,`<div class="nk-empty">${esc(e.message||'Gagal memuat detail')}</div>`)}
}
async function loadAiSearch(q,page=1){
  const gen=view('loadAiSearch',[q,page]);
  setActiveNav('aidrama');
  setView(gen,'<div class="nk-empty">Mencari...</div>');
  try{
    const d=await api(`/aidrama/search?q=${encodeURIComponent(q)}`);
    if(stale(gen))return;
    const items=(d.data&&d.data.items)||[];
    setView(gen,`<section class="ai-hero"><div class="nk-kicker">PENCARIAN</div><h1>Hasil: ${esc(q)}</h1><p>${items.length} judul ditemukan</p>
      <div class="nk-search"><span class="nk-search-ic">&#128269;</span><input id="aiSearchInput" type="search" value="${esc(q)}" onkeydown="if(event.key==='Enter')aiSearchGo()"><button class="btn btn-primary" onclick="aiSearchGo()">Cari</button></div></section>
      <section class="nk-section">${items.length?`<div class="nk-grid">${items.map(aiCard).join('')}</div>`:'<div class="nk-empty">Tidak ada hasil.</div>'}</section>`);
  }catch(e){if(!stale(gen))setView(gen,`<div class="nk-empty">${esc(e.message||'Pencarian gagal')}</div>`)}
}
function aiProgress(slug,n){
  try{return JSON.parse(localStorage.getItem('nanostream-ai-progress')||'{}')[`${slug}:${n}`]||null}catch(e){return null}
}
function aiSaveProgress(slug,n,time,dur){
  try{
    const key='nanostream-ai-progress';
    const all=JSON.parse(localStorage.getItem(key)||'{}');
    all[`${slug}:${n}`]={time,dur,at:Date.now()};
    localStorage.setItem(key,JSON.stringify(all));
  }catch(e){}
}
async function loadAiDetail(slug,preset){
  const gen=view('loadAiDetail',[slug]);
  setActiveNav('aidrama');
  setView(gen,'<div class="nk-empty">Memuat detail...</div>');
  try{
    const d=preset||await api(`/aidrama/detail?slug=${encodeURIComponent(slug)}`);
    if(stale(gen))return;
    const a=(d.data&&d.data.item)||{};
    const eps=a.episodes||[];
    aiState.slug=slug;
    aiState.episode=1;
    setView(gen,`<div class="nk-crumb"><button onclick="loadAiHome()">&#8592; Katalog</button><span>/</span><span>Detail</span></div>
      <section class="nk-detail"><div class="nk-cover">${aiImg(a.cover,a.title)}</div>
        <div class="nk-detail-body"><span class="nk-kicker">DRAMA AI</span><h1>${esc(a.title||'')}</h1>
          <div class="nk-sub">${eps.length} episode &middot; drama pendek AI</div>
          <p class="ai-desc">${esc(a.description||'')}</p>
          <div class="nk-row"><button class="btn btn-primary" onclick="loadAiPlayer('${esc(slug)}',${eps[0]?.n||1})">&#9654; Tonton Episode 1</button></div>
        </div>
      </section>
      <section class="nk-section"><div class="nk-section-head"><h2>Daftar Episode</h2><span>${eps.length} episode</span></div>
        <div class="ai-eps">${eps.map(e=>{const p=aiProgress(slug,e.n);return `<button class="ai-ep ${p&&p.dur&&p.time/p.dur>.9?'done':''}" onclick="loadAiPlayer('${esc(slug)}',${e.n})">${e.n}${p&&p.dur&&p.time/p.dur<.9?' <small>&#9654;</small>':''}</button>`}).join('')}</div>
      </section>
      <section class="nk-section" id="aiPlayer"><div class="nk-section-head"><h2 id="aiPlayerTitle">Player</h2><span id="aiPlayerInfo">Pilih episode</span></div>
        <div class="ai-stage"><video id="aiVideo" controls playsinline preload="metadata"></video><div class="nk-idle"><span>&#9654;</span><p>Pilih episode untuk mulai menonton</p></div></div>
        <div class="nk-tools"><a id="aiOpenTab" class="btn btn-secondary hidden" target="_blank" rel="noopener" href="#">Buka Video di Tab Baru</a><button class="btn btn-secondary" id="aiPrev" onclick="aiStep(-1)">&#8592; Episode sebelumnya</button><button class="btn btn-secondary" id="aiNext" onclick="aiStep(1)">Episode berikutnya &#8594;</button></div>
        <div class="nk-servers" id="aiStreams"></div>
      </section>`);
  }catch(e){if(!stale(gen))setView(gen,`<div class="nk-empty">${esc(e.message||'Gagal memuat detail')}</div>`)}
}
async function loadAiPlayer(slug,n){
  aiState.slug=slug;
  aiState.episode=n;
  try{
    const d=await api(`/aidrama/episode?slug=${encodeURIComponent(slug)}&n=${n}`);
    const streams=(d.data&&d.data.streams)||[];
    aiState.streams=streams;
    const title=document.getElementById('aiPlayerTitle');
    if(title)title.textContent=`Episode ${n}`;
    const info=document.getElementById('aiPlayerInfo');
    if(info)info.textContent=`${streams.length} kualitas tersedia`;
    const box=document.getElementById('aiStreams');
    if(box)box.innerHTML=streams.map((s,i)=>`<button class="nk-srv ${i===1||(streams.length===1&&i===0)?'active':''}" onclick="aiAttach(${i})">${esc(s.quality||s.label)}</button>`).join('');
    const v=document.getElementById('aiVideo');
    if(v){
      const cover=d.data&&d.data.item&&d.data.item.cover;
      if(cover)v.poster=`${API}/aidrama/image?url=${encodeURIComponent(cover)}`;
      v.addEventListener('playing',()=>v.closest('.ai-stage').classList.add('playing'),{once:true});
      aiAttach(streams.length>1?1:0);
      const p=aiProgress(slug,n);
      v.addEventListener('loadedmetadata',()=>{if(p&&p.dur&&p.time<p.dur-5)v.currentTime=p.time},{once:true});
      let last=0;
      v.addEventListener('timeupdate',()=>{const now=Date.now();if(now-last>3000){last=now;aiSaveProgress(slug,n,Math.floor(v.currentTime),Math.floor(v.duration||0))}});
      document.getElementById('aiPlayer')?.scrollIntoView({block:'start'});
    }
  }catch(e){showToast?.(e.message||'Gagal memuat episode')}
}
function aiAttach(i){
  const s=aiState.streams[i];
  const v=document.getElementById('aiVideo');
  if(!s||!v)return;
  document.querySelectorAll('#aiStreams .nk-srv').forEach((b,j)=>b.classList.toggle('active',j===i));
  const mp4=`${API}/aidrama/mp4?url=${encodeURIComponent(s.url)}`;
  const tab=document.getElementById('aiOpenTab');
  if(tab){tab.href=mp4;tab.classList.remove('hidden')}
  showToast?.('Menyiapkan video...');
  v.src=mp4;
  v.play().catch(()=>{});
}
function aiStep(dir){
  const n=aiState.episode+dir;
  if(n<1)return;
  loadAiPlayer(aiState.slug,n);
}
