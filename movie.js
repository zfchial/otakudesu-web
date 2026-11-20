const movieState={slug:'',epId:0,files:[]};
function movieImg(url,title){
  if(!url)return '<div class="nk-noimg">No image</div>';
  return `<img src="${esc(url)}" alt="${esc(title||'')}" loading="lazy" decoding="async">`;
}
function movieCard(m){
  return `<article class="nk-card" data-slug="${esc(m.slug||'')}" onclick="loadMovieDetail(this.dataset.slug)">
    <div class="nk-poster">${movieImg(m.cover,m.title)}<span class="nk-badge">${esc(m.year||'')}</span><span class="nk-play">&#9654;</span></div>
    <div class="nk-card-body"><h3>${esc(m.title||'')}</h3><span>${esc(m.country||'Film')}</span></div>
  </article>`;
}
function movieClean(items){
  return (items||[]).filter(x=>!/(variety|episode\s*\d|weekly idol)/i.test(x.title||''));
}
async function loadMovieHome(page=1,country=''){
  setActiveNav('movie');
  const gen=view('loadMovieHome',[page,country]);
  setView(gen,'<div class="nk-empty">Memuat film...</div>');
  try{
    const qs=new URLSearchParams({page:String(page),limit:'24',format:'Movie'});
    if(country)qs.set('country',country);
    const d=await api(`/drama/catalog?${qs}`);
    if(stale(gen))return;
    const items=movieClean(d.data&&d.data.items);
    const chips=[['','Semua'],['South Korea','Korea'],['China','China'],['Japan','Jepang'],['Thailand','Thailand']];
    setView(gen,`<section class="nk-hero"><div class="nk-kicker">FILM · SUB INDONESIA</div><h1>Film Dunia</h1><p>Kumpulan film dari berbagai negara dengan subtitle Indonesia</p>
      <div class="nk-cats">${chips.map(([v,l])=>`<button class="nk-chip ${country===v?'active':''}" onclick="loadMovieHome(1,'${v}')">${l}</button>`).join('')}</div></section>
      <section class="nk-section"><div class="nk-section-head"><h2>Film Terbaru</h2><span>${items.length} judul</span></div>
        ${items.length?`<div class="nk-grid">${items.map(movieCard).join('')}</div>`:'<div class="nk-empty">Tidak ada film ditemukan.</div>'}</section>
      <section class="nk-section"><div class="nk-pager"><button class="btn btn-secondary" ${page<=1?'disabled':''} onclick="loadMovieHome(${Math.max(1,page-1)},'${country}')">&#8592; Sebelumnya</button><span>${page}</span><button class="btn btn-secondary" ${(d.data&&d.data.page||page)>=(d.data&&d.data.pages||1)?'disabled':''} onclick="loadMovieHome(${page+1},'${country}')">Berikutnya &#8594;</button></div></section>`);
  }catch(e){if(!stale(gen))setView(gen,`<div class="nk-empty">${esc(e.message||'Gagal memuat film')}</div>`)}
}
async function loadMovieDetail(slug){
  setActiveNav('movie');
  const gen=view('loadMovieDetail',[slug]);
  setView(gen,'<div class="nk-empty">Memuat detail...</div>');
  try{
    const d=await api(`/drama/detail?slug=${encodeURIComponent(slug)}`);
    if(stale(gen))return;
    const m=d.data||{};
    const eps=m.episodes||[];
    movieState.slug=slug;
    setView(gen,`<div class="nk-crumb"><button onclick="loadMovieHome()">&#8592; Daftar Film</button><span>/</span><span>Detail</span></div>
      <section class="nk-detail"><div class="nk-cover">${movieImg(m.cover,m.title)}</div>
        <div class="nk-detail-body"><span class="nk-kicker">FILM · SUB INDONESIA</span><h1>${esc(m.title||'')}</h1>
          <div class="nk-sub">${esc(m.year||'')} &middot; ${esc(m.country||'')} &middot; ${esc(m.format||'Movie')}</div>
          <div class="nk-tags">${(m.genres||[]).slice(0,6).map(g=>`<span class="nk-tag">${esc(g)}</span>`).join('')}</div>
          <p class="ai-desc">${esc(m.synopsis||'')}</p>
          <div class="nk-meta"><div><span> Judul Asli</span><b>${esc(m.original_title||'-')}</b></div><div><span>Status</span><b>${esc(m.airing_status||'Tersedia')}</b></div><div><span>Episode</span><b>${eps.length} file</b></div></div>
          <div class="nk-row"><button class="btn btn-primary" onclick="loadMoviePlayer('${esc(slug)}',${eps[0]?.id||0})">&#9654; Tonton Film</button></div>
        </div>
      </section>
      <section class="nk-section" id="moviePlayer"><div class="nk-section-head"><h2>Pemutar</h2><span>Pilih kualitas</span></div>
        <div class="ai-stage" id="movieStage"><video id="movieVideo" controls playsinline preload="metadata" poster="${esc(m.cover||'')}"></video></div>
        <div class="nk-servers" id="movieFiles"></div>
      </section>`);
  }catch(e){if(!stale(gen))setView(gen,`<div class="nk-empty">${esc(e.message||'Gagal memuat detail')}</div>`)}
}
function movieSave(slug,epId,time,dur){
  try{
    const key='nanostream-movie-progress';
    const all=JSON.parse(localStorage.getItem(key)||'{}');
    all[`${slug}:${epId}`]={time,dur,at:Date.now()};
    localStorage.setItem(key,JSON.stringify(all));
  }catch(e){}
}
function movieProgress(slug,epId){
  try{return JSON.parse(localStorage.getItem('nanostream-movie-progress')||'{}')[`${slug}:${epId}`]||null}catch(e){return null}
}
async function loadMoviePlayer(slug,epId){
  if(!slug||!epId)return;
  setActiveNav('movie');
  try{
    const d=await api(`/drama/episode?id=${epId}`);
    const e=(d.data||{}).episode||{};
    const files=(e.files||[]).filter(f=>f.url);
    movieState.files=files;
    movieState.epId=epId;
    const box=document.getElementById('movieFiles');
    if(box)box.innerHTML=files.map((f,i)=>`<button class="nk-srv ${i===0?'active':''}" data-i="${i}" onclick="moviePlay(${i})">${esc(f.resolution||'Video')}</button>`).join('');
    const v=document.getElementById('movieVideo');
    if(v){
      const p=movieProgress(slug,epId);
      v.addEventListener('loadedmetadata',()=>{if(p&&p.dur&&p.time<p.dur-10)v.currentTime=p.time},{once:true});
      let last=0;
      v.addEventListener('timeupdate',()=>{const now=Date.now();if(now-last>3000){last=now;movieSave(slug,epId,Math.floor(v.currentTime),Math.floor(v.duration||0))}});
      moviePlay(0);
      document.getElementById('moviePlayer')?.scrollIntoView({block:'center'});
    }
  }catch(e){showToast?.(e.message||'Gagal memuat video')}
}
function moviePlay(i){
  const f=movieState.files[i];
  const v=document.getElementById('movieVideo');
  if(!f||!v)return;
  document.querySelectorAll('#movieFiles .nk-srv').forEach((b,j)=>b.classList.toggle('active',j===i));
  v.src=f.url;
  v.play().catch(()=>{});
}
