const westState={streams:[]};
function westImg(url,title){
  if(!url)return '<div class="nk-noimg">No image</div>';
  return `<img src="${esc(url)}" alt="${esc(title||'')}" loading="lazy" decoding="async">`;
}
function westDate(s){
  if(!s)return '';
  const d=new Date(s);
  return isNaN(d)?s:d.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'});
}
function westCard(m){
  return `<article class="nk-card" data-slug="${esc(m.slug||'')}" onclick="loadWestDetail(this.dataset.slug)">
    <div class="nk-poster">${westImg(m.cover,m.title)}<span class="nk-badge">18+</span><span class="nk-play">&#9654;</span></div>
    <div class="nk-card-body"><h3>${esc(m.title||'')}</h3><span>${esc(westDate(m.date))}</span></div>
  </article>`;
}
async function loadWestHome(page=1){
  const gen=view('loadWestHome',[page]);
  if(!nkAdmin())return nkLocked(gen);
  setActiveNav('western');
  setView(gen,'<div class="nk-empty">Memuat film...</div>');
  try{
    const d=await authApi(`/western/home?page=${page}&limit=24`);
    if(stale(gen))return;
    const items=(d.data&&d.data.items)||[];
    setView(gen,`<section class="nk-hero"><div class="nk-kicker">FILM BARAT · SUB INDONESIA</div><h1>Film Amerika & Barat</h1><p>Hollywood dan film internasional dengan subtitle Indonesia</p>
      <div class="nk-search"><span class="nk-search-ic">&#128269;</span><input id="westSearchInput" type="search" placeholder="Cari judul film..." onkeydown="if(event.key==='Enter')westSearchGo()"><button class="btn btn-primary" onclick="westSearchGo()">Cari</button></div></section>
      <section class="nk-section"><div class="nk-section-head"><h2>Film Terbaru</h2><span>${items.length} judul</span></div>${items.length?`<div class="nk-grid">${items.map(westCard).join('')}</div>`:'<div class="nk-empty">Belum ada film.</div>'}</section>
      <section class="nk-section"><div class="nk-pager"><button class="btn btn-secondary" ${page<=1?'disabled':''} onclick="loadWestHome(${Math.max(1,page-1)})">&#8592; Sebelumnya</button><span>${page}</span><button class="btn btn-secondary" ${d.data?.has_next?'':'disabled'} onclick="loadWestHome(${page+1})">Berikutnya &#8594;</button></div></section>`);
  }catch(e){if(!stale(gen))setView(gen,`<div class="nk-empty">${esc(e.message||'Gagal memuat film')}</div>`)}
}
function westSearchGo(){
  const q=document.getElementById('westSearchInput')?.value.trim();
  if(q)loadWestSearch(q);
}
async function loadWestSearch(q){
  const gen=view('loadWestSearch',[q]);
  if(!nkAdmin())return nkLocked(gen);
  setActiveNav('western');
  setView(gen,'<div class="nk-empty">Mencari...</div>');
  try{
    const d=await authApi(`/western/search?q=${encodeURIComponent(q)}`);
    if(stale(gen))return;
    const items=(d.data&&d.data.items)||[];
    setView(gen,`<section class="nk-hero"><div class="nk-kicker">PENCARIAN</div><h1>Hasil: ${esc(q)}</h1><p>${items.length} judul ditemukan</p>
      <div class="nk-search"><span class="nk-search-ic">&#128269;</span><input id="westSearchInput" type="search" value="${esc(q)}" onkeydown="if(event.key==='Enter')westSearchGo()"><button class="btn btn-primary" onclick="westSearchGo()">Cari</button></div></section>
      <section class="nk-section">${items.length?`<div class="nk-grid">${items.map(westCard).join('')}</div>`:'<div class="nk-empty">Tidak ada hasil.</div>'}</section>`);
  }catch(e){if(!stale(gen))setView(gen,`<div class="nk-empty">${esc(e.message||'Pencarian gagal')}</div>`)}
}
async function loadWestDetail(slug){
  const gen=view('loadWestDetail',[slug]);
  if(!nkAdmin())return nkLocked(gen);
  setActiveNav('western');
  setView(gen,'<div class="nk-empty">Memuat detail...</div>');
  try{
    const d=await authApi(`/western/detail?slug=${encodeURIComponent(slug)}`);
    if(stale(gen))return;
    const m=(d.data&&d.data.item)||{};
    westState.streams=(d.data&&d.data.streams)||[];
    setView(gen,`<div class="nk-crumb"><button onclick="loadWestHome()">&#8592; Daftar Film</button><span>/</span><span>Detail</span></div>
      <section class="nk-detail"><div class="nk-cover">${westImg(m.cover,m.title)}</div>
        <div class="nk-detail-body"><span class="nk-kicker">FILM BARAT · SUB INDO</span><h1>${esc(m.title||'')}</h1>
          <div class="nk-tags">${((m.genres||[]).slice(0,6)).map(g=>`<span class="nk-tag">${esc(g)}</span>`).join('')}</div>
          <p class="ai-desc">${esc(m.description||'')}</p>
          <div class="nk-row"><button class="btn btn-primary" ${westState.streams.length?'onclick="westPlay(0)"':'disabled'}>&#9654; ${westState.streams.length?'Tonton Film':'Video Belum Tersedia'}</button></div>
        </div>
      </section>
      <section class="nk-section" id="westPlayer"><div class="nk-section-head"><h2>Pemutar</h2><span>Server video</span></div>
        <div class="nk-servers">${westState.streams.map((s,i)=>`<button class="nk-srv ${i===0?'active':''}" onclick="westPlay(${i})">${esc(s.label||'Video '+(i+1))}</button>`).join('')||'<div class="nk-empty">Video belum tersedia.</div>'}</div>
        <div class="ai-stage" id="westStage"><iframe id="westFrame" src="" allowfullscreen="true" frameborder="0" title="Player"></iframe><div class="nk-idle"><span>&#9654;</span><p>Pilih server untuk memutar</p></div></div>
        <div class="nk-tools"><a id="westTab" class="btn btn-secondary hidden" target="_blank" rel="noopener" href="#">Buka Video di Tab Baru</a></div>
      </section>`);
  }catch(e){if(!stale(gen))setView(gen,`<div class="nk-empty">${esc(e.message||'Gagal memuat detail')}</div>`)}
}
function westPlay(i){
  const s=westState.streams[i];
  const f=document.getElementById('westFrame');
  if(!s||!s.file||!f)return;
  const url=`${API}/western/mp4?url=${encodeURIComponent(s.file)}`;
  f.src=url;
  document.querySelectorAll('#westPlayer .nk-srv').forEach((b,j)=>b.classList.toggle('active',j===i));
  document.getElementById('westStage')?.classList.add('playing');
  const tab=document.getElementById('westTab');
  if(tab){tab.href=url;tab.classList.remove('hidden')}
  showToast?.('Menyiapkan video...');
  document.getElementById('westPlayer')?.scrollIntoView({block:'center'});
}
