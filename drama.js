const dramaState={slug:'',url:'',title:'',cover:'',episodes:[],epId:null,epLabel:'',files:[],quality:'',lastSave:0,lastPos:0,watchAccum:0};
const DRAMA_HISTORY_KEY='nanostream-drama-history-v1';
const DRAMA_BOOKMARKS_KEY='nanostream-drama-bookmarks-v1';
const isDramaUrl=u=>/\/drama\//.test(u||'');
function dramaParseUrl(u){const m=String(u||'').match(/\/drama\/([^/#?]+)(?:#ep-(\d+))?/);return m?{slug:m[1],epId:m[2]?Number(m[2]):null}:{slug:'',epId:null}}
function dramaEpMarker(seriesUrl,epId){return `${seriesUrl}#ep-${epId}`}
function dramaReadStore(key){try{const v=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(v)?v:[]}catch(e){return[]}}
function dramaWriteStore(key,items){try{localStorage.setItem(key,JSON.stringify(items.slice(0,200)))}catch(e){}}
function dramaLocalHistory(){return dramaReadStore(DRAMA_HISTORY_KEY)}
function dramaLocalBookmarks(){return dramaReadStore(DRAMA_BOOKMARKS_KEY)}
function dramaSkeleton(gen){setView(gen,`<section class="section"><span class="comic-skeleton sk-title"></span><div class="grid">${Array.from({length:12},()=>'<div class="comic-skeleton sk-card"></div>').join('')}</div></section>`)}
function dramaError(gen,e){setView(gen,`<div class="empty comic-error"><strong>Drama belum bisa dimuat.</strong><p>${esc(e.message)}</p><button class="btn btn-secondary" onclick="loadDramaHome()">Coba Lagi</button></div>`)}
function dramaCard(it){
  const meta=[it.year,it.country,it.latest_episode||(it.total_episodes?`${it.total_episodes} episode`:'')].filter(Boolean).join(' · ');
  const badge=it.format?`<span class="comic-card-kind">${esc(it.format)}</span>`:'';
  return `<article class="card comic-card" data-slug="${esc(it.slug)}" onclick="loadDramaDetail(this.dataset.slug)">
    <div class="poster">${comicImg(it.cover,it.title)}${badge}</div>
    <div class="card-body">
      <div class="card-title" title="${esc(it.title||'')}">${esc(it.title||'')}</div>
      <div class="meta">${esc(meta||'Detail & Daftar Episode')}</div>
    </div>
  </article>`;
}
function dramaContinueCard(h){
  const p=dramaParseUrl(h.episode_url);
  const pct=h.duration_seconds?Math.min(100,Math.round(h.position_seconds/h.duration_seconds*100)):0;
  return `<article class="card comic-card" data-slug="${esc(p.slug)}" data-ep="${p.epId||''}" data-pos="${h.position_seconds||0}" onclick="loadDramaPlayer(this.dataset.slug,Number(this.dataset.ep),Number(this.dataset.pos))">
    <div class="poster">${comicImg(h.image||'',h.title)}<span class="comic-card-kind">${pct}%</span></div>
    <div class="card-body">
      <div class="card-title" title="${esc(h.title||'')}">${esc(h.title||'')}</div>
      <div class="meta">${esc(h.episode||'')} · lanjut menit ${Math.floor((h.position_seconds||0)/60)}</div>
    </div>
  </article>`;
}
function dramaSearchBar(q=''){
  return `<div class="comic-search-bar"><input id="dramaSearchInput" type="search" value="${esc(q)}" placeholder="Cari drama / film Asia..." onkeydown="if(event.key==='Enter')loadDramaSearch()"><button class="btn btn-primary" onclick="loadDramaSearch()">Cari Drama</button></div>`;
}
async function dramaFilters(){
  if(window.__dramaFilters)return window.__dramaFilters;
  try{const d=await api('/drama/filters');window.__dramaFilters=d.data||{genres:[],countries:[],formats:['Series','Movie']}}catch(e){window.__dramaFilters={genres:[],countries:[],formats:['Series','Movie']}}
  return window.__dramaFilters;
}
function dramaFilterBar(f,country,format,genre){
  const opt=(list,cur)=>list.map(x=>`<option value="${esc(x)}"${x===cur?' selected':''}>${esc(x)}</option>`).join('');
  const go=`loadDramaHome(1,document.getElementById('dramaCountry').value,document.getElementById('dramaFormat').value,document.getElementById('dramaGenre').value)`;
  return `<div class="comic-filters drama-filters">
    <label class="comic-sort">Negara<select id="dramaCountry" onchange="${go}"><option value="">Semua Negara</option>${opt(f.countries||[],country)}</select></label>
    <label class="comic-sort">Tipe<select id="dramaFormat" onchange="${go}"><option value="">Series & Film</option>${opt(f.formats||['Series','Movie'],format)}</select></label>
    <label class="comic-sort">Genre<select id="dramaGenre" onchange="${go}"><option value="">Semua Genre</option>${opt(f.genres||[],genre)}</select></label>
  </div>`;
}
function dramaPager(page,pages,ctx){
  const c=esc(JSON.stringify(ctx||{}));
  return `<div class="comic-pager">${page>1?`<button class="btn btn-secondary" data-page="${page-1}" data-ctx="${c}" onclick="dramaPageGo(this)">&#8592; Sebelumnya</button>`:'<span></span>'}<span class="comic-pager-info">Halaman ${page} / ${pages||1}</span>${page<(pages||1)?`<button class="btn btn-secondary" data-page="${page+1}" data-ctx="${c}" onclick="dramaPageGo(this)">Berikutnya &#8594;</button>`:'<span></span>'}</div>`;
}
function dramaPageGo(btn){
  const page=Number(btn.dataset.page)||1;
  let ctx={};
  try{ctx=JSON.parse(btn.dataset.ctx||'{}')}catch(e){}
  if(ctx.q)return loadDramaSearch(ctx.q,page);
  loadDramaHome(page,ctx.country||'',ctx.format||'',ctx.genre||'');
}
async function dramaAccountRails(){
  if(!authToken)return{history:dramaLocalHistory(),saved:dramaLocalBookmarks()};
  try{
    const [h,b]=await Promise.all([authApi('/history').catch(()=>({data:[]})),authApi('/bookmarks').catch(()=>({data:[]}))]);
    const hist=(h.data||[]).filter(x=>isDramaUrl(x.episode_url));
    const saved=(b.data||[]).filter(x=>isDramaUrl(x.anime_url));
    const lh=dramaLocalHistory();
    const lb=dramaLocalBookmarks();
    const mergedH=[...hist];
    for(const x of lh){if(!mergedH.some(y=>y.episode_url===x.episode_url))mergedH.push(x)}
    const mergedB=[...saved];
    for(const x of lb){if(!mergedB.some(y=>y.anime_url===x.anime_url))mergedB.push(x)}
    for(const x of lh){if(!hist.some(y=>y.episode_url===x.episode_url))authApi('/history','POST',x).catch(()=>{})}
    for(const x of lb){if(!saved.some(y=>y.anime_url===x.anime_url))authApi('/bookmarks','POST',{anime_url:x.anime_url,title:x.title,image:x.image}).catch(()=>{})}
    return{history:mergedH,saved:mergedB};
  }catch(e){return{history:dramaLocalHistory(),saved:dramaLocalBookmarks()}}
}
async function loadDramaHome(page=1,country='',format='',genre=''){
  setActiveNav('drama');
  document.querySelectorAll('#searchInput,#mobileSearchInput').forEach(i=>i.placeholder='Cari drama...');
  const gen=view('loadDramaHome',[page,country,format,genre]);
  dramaSkeleton(gen);
  try{
    const qs=new URLSearchParams({page:String(page),limit:'24'});
    if(country)qs.set('country',country);
    if(format)qs.set('format',format);
    if(genre)qs.set('genre',genre);
    const [d,f,rails]=await Promise.all([api(`/drama/catalog?${qs}`),dramaFilters(),dramaAccountRails()]);
    if(stale(gen))return;
    const data=d.data||{};
    const items=data.items||[];
    const hist=(rails.history||[]).filter(x=>(x.position_seconds||0)>0).slice(0,12);
    const saved=(rails.saved||[]).slice(0,12);
    document.title='Drama & Film Asia Sub Indo · NanoStream';
    setView(gen,`<section class="section">
      ${head('Drama & Film Asia','Drama China, Korea, Jepang, dan film Asia subtitle Indonesia','loadDramaSearch()')}
      ${dramaSearchBar()}
      ${hist.length?`${head('Lanjut Nonton','Posisi tersimpan di akun / perangkat ini')}<div class="rail comic-history-rail">${hist.map(dramaContinueCard).join('')}</div>`:''}
      ${saved.length?`${head('Drama Tersimpan','Daftar tontonan favoritmu')}<div class="rail">${saved.map(b=>dramaCard({slug:dramaParseUrl(b.anime_url).slug,title:b.title,cover:b.image,format:'',year:'',country:''})).join('')}</div>`:''}
      ${dramaFilterBar(f,country,format,genre)}
      ${dramaPager(page,data.pages,{country,format,genre})}
      ${items.length?`<div class="grid">${items.map(dramaCard).join('')}</div>`:'<div class="empty">Tidak ada drama untuk filter ini.</div>'}
      ${dramaPager(page,data.pages,{country,format,genre})}
    </section>`);
  }catch(e){dramaError(gen,e)}
}
async function loadDramaSearch(forcedQ,page=1){
  const q=(forcedQ??document.getElementById('dramaSearchInput')?.value??'').trim();
  if(!q)return loadDramaHome();
  setActiveNav('drama');
  const gen=view('loadDramaSearch',[q,page]);
  dramaSkeleton(gen);
  try{
    const d=await api(`/drama/search?q=${encodeURIComponent(q)}&page=${page}&limit=24`);
    if(stale(gen))return;
    const data=d.data||{};
    const items=data.items||[];
    document.title=`Cari ${q} · NanoStream Drama`;
    setView(gen,`<section class="section">
      ${head(`Drama "${esc(q)}"`,`${data.total||0} judul ditemukan`,'loadDramaHome()')}
      ${dramaSearchBar(q)}
      ${dramaPager(page,data.pages,{q})}
      ${items.length?`<div class="grid">${items.map(dramaCard).join('')}</div>`:'<div class="empty">Tidak ada drama yang cocok.</div>'}
      ${dramaPager(page,data.pages,{q})}
    </section>`);
  }catch(e){dramaError(gen,e)}
}
function dramaIsSaved(slug){
  const url=`/drama/${slug}`;
  if(dramaLocalBookmarks().some(x=>String(x.anime_url||'').includes(url)))return true;
  return false;
}
async function dramaToggleBookmark(){
  const slug=dramaState.slug;
  if(!slug)return;
  const btn=document.getElementById('dramaBookmarkBtn');
  const local=dramaLocalBookmarks();
  const idx=local.findIndex(x=>String(x.anime_url||'').includes(`/drama/${slug}`));
  const removing=idx>=0;
  if(removing)local.splice(idx,1);
  else local.unshift({anime_url:dramaState.url,title:dramaState.title,image:dramaState.cover,at:Date.now()});
  dramaWriteStore(DRAMA_BOOKMARKS_KEY,local);
  if(authToken){
    try{
      if(removing){
        const b=await authApi('/bookmarks');
        const hit=(b.data||[]).find(x=>String(x.anime_url||'').includes(`/drama/${slug}`));
        if(hit)await authApi(`/bookmarks/remove?url=${encodeURIComponent(hit.anime_url)}`,'DELETE');
      }else{
        await authApi('/bookmarks','POST',{anime_url:dramaState.url,title:dramaState.title,image:dramaState.cover});
      }
    }catch(e){}
  }
  if(btn)btn.textContent=removing?'+ Simpan Drama':'Tersimpan';
  showToast(removing?'Drama dihapus dari daftar simpanan':'Drama disimpan');
}
async function loadDramaDetail(slugOrUrl){
  const p=dramaParseUrl(slugOrUrl);
  const slug=p.slug||String(slugOrUrl||'').trim();
  if(!slug)return;
  setActiveNav('drama');
  const gen=view('loadDramaDetail',[slug]);
  dramaSkeleton(gen);
  try{
    const d=await api(`/drama/detail?slug=${encodeURIComponent(slug)}`);
    if(stale(gen))return;
    const c=d.data||{};
    dramaState.slug=c.slug||slug;
    dramaState.url=c.url||'';
    dramaState.title=c.title||'';
    dramaState.cover=c.cover||'';
    dramaState.episodes=c.episodes||[];
    const eps=dramaState.episodes;
    const avail=eps.filter(x=>x.available);
    const first=avail[0];
    const latest=avail[avail.length-1];
    const saved=dramaIsSaved(dramaState.slug)||(authToken&&window.__dramaSavedCheck);
    const genres=(c.genres||[]).map(g=>`<button class="chip comic-genre-chip" data-g="${esc(g)}" onclick="loadDramaHome(1,'','',this.dataset.g)">${esc(g)}</button>`).join('');
    const cast=(c.cast||[]).slice(0,8).map(x=>esc(x.name)).filter(Boolean).join(', ');
    const meta=[c.year,c.country,c.format,c.airing_status,`${eps.length} episode`].filter(Boolean).join(' · ');
    const epGrid=eps.length?`<div class="drama-eps">${eps.map(ep=>`<button class="drama-ep${ep.available?'':' disabled'}" data-id="${ep.id}" ${ep.available?`onclick="loadDramaPlayer('${esc(dramaState.slug)}',${ep.id})"`:'disabled'}><span>${esc(ep.label||`Episode ${ep.number}`)}</span><small>${ep.available?(ep.files||[]).map(f=>f.resolution).join(' · '):'belum tersedia'}</small></button>`).join('')}</div>`:'<div class="empty">Daftar episode belum tersedia.</div>';
    document.title=`${c.title||'Drama'} · NanoStream`;
    setView(gen,`
      <section class="detail comic-detail">
        <img class="detail-poster" src="${esc(c.cover||fallback)}" alt="${esc(c.title||'')}" onerror="this.onerror=null;this.src='${fallback}'">
        <div class="detail-main">
          <span class="hero-kicker">Drama</span>
          <h1>${esc(c.title||'Untitled')}</h1>
          <div class="detail-sub">${esc(meta)}</div>
          ${genres?`<div class="chips">${genres}</div>`:''}
          ${c.synopsis?`<p class="hero-copy">${esc(c.synopsis)}</p>`:''}
          ${cast?`<p class="detail-sub">Pemain: ${cast}</p>`:''}
          <div class="hero-actions comic-detail-actions">
            ${latest?`<button class="btn btn-primary" onclick="loadDramaPlayer('${esc(dramaState.slug)}',${latest.id})">${playIconSvg}<span>Tonton ${esc(latest.label||'Episode Terbaru')}</span></button>`:''}
            ${first&&first.id!==latest?.id?`<button class="btn btn-secondary" onclick="loadDramaPlayer('${esc(dramaState.slug)}',${first.id})">Mulai dari Awal</button>`:''}
            <button id="dramaBookmarkBtn" class="btn btn-secondary" onclick="dramaToggleBookmark()">${dramaIsSaved(dramaState.slug)?'Tersimpan':'+ Simpan Drama'}</button>
          </div>
        </div>
      </section>
      <section class="section">${head('Daftar Episode',`${avail.length} dari ${eps.length} episode siap ditonton`)}${epGrid}</section>`);
    if(authToken){
      authApi('/bookmarks').then(b=>{
        const hit=(b.data||[]).some(x=>String(x.anime_url||'').includes(`/drama/${dramaState.slug}`));
        const btn=document.getElementById('dramaBookmarkBtn');
        if(btn&&hit)btn.textContent='Tersimpan';
        if(hit){const local=dramaLocalBookmarks();if(!local.some(x=>String(x.anime_url||'').includes(`/drama/${dramaState.slug}`))){local.unshift({anime_url:dramaState.url,title:dramaState.title,image:dramaState.cover,at:Date.now()});dramaWriteStore(DRAMA_BOOKMARKS_KEY,local)}}
      }).catch(()=>{});
    }
  }catch(e){dramaError(gen,e)}
}
function dramaQualityPref(){try{return localStorage.getItem('nanostream-drama-quality')||''}catch(e){return ''}}
function dramaPickFile(files){
  const sorted=[...(files||[])].filter(f=>f.url).sort((a,b)=>parseInt(b.resolution)-parseInt(a.resolution));
  if(!sorted.length)return null;
  const pref=dramaQualityPref();
  return sorted.find(f=>f.resolution===pref)||sorted.find(f=>f.resolution==='720p')||sorted[0];
}
function dramaSaveProgress(force=false){
  const v=document.getElementById('dramaVideo');
  if(!v||!dramaState.slug||!dramaState.epId)return;
  const now=Date.now();
  if(!force&&now-dramaState.lastSave<10000)return;
  dramaState.lastSave=now;
  const pos=Math.floor(v.currentTime||0);
  const dur=Math.floor(v.duration||0)||0;
  const delta=Math.max(0,pos-dramaState.lastPos);
  dramaState.lastPos=pos;
  dramaState.watchAccum+=delta;
  const payload={episode_url:dramaEpMarker(dramaState.url,dramaState.epId),anime_url:dramaState.url,title:dramaState.title,episode:dramaState.epLabel,position_seconds:pos,duration_seconds:dur||null,watch_seconds:delta};
  const lh=dramaLocalHistory().filter(x=>x.episode_url!==payload.episode_url);
  lh.unshift({...payload,image:dramaState.cover,at:now});
  dramaWriteStore(DRAMA_HISTORY_KEY,lh);
  if(authToken){
    const body=JSON.stringify(payload);
    if(force&&navigator.sendBeacon){
      fetch(API+'/history',{method:'POST',headers:{'Content-Type':'application/json',...authHeaders()},body,keepalive:true}).catch(()=>{});
    }else{
      authApi('/history','POST',payload).catch(()=>{});
    }
  }
}
function dramaSwitchQuality(res){
  const v=document.getElementById('dramaVideo');
  const f=dramaState.files.find(x=>x.resolution===res);
  if(!v||!f)return;
  const t=v.currentTime;
  const paused=v.paused;
  dramaState.quality=res;
  try{localStorage.setItem('nanostream-drama-quality',res)}catch(e){}
  v.src=f.url;
  v.currentTime=t;
  if(!paused)v.play().catch(()=>{});
}
function dramaRetryEpisode(){
  const id=dramaState.epId;
  if(id)loadDramaPlayer(dramaState.slug,id,Math.floor(document.getElementById('dramaVideo')?.currentTime||0));
}
async function loadDramaPlayer(slug,epId,startSec=0){
  if(!slug||!epId)return;
  setActiveNav('drama');
  const gen=view('loadDramaPlayer',[slug,epId,startSec]);
  dramaSkeleton(gen);
  try{
    const [ed,dd]=await Promise.all([
      api(`/drama/episode?id=${epId}`),
      api(`/drama/detail?slug=${encodeURIComponent(slug)}`).catch(()=>({data:{}}))
    ]);
    if(stale(gen))return;
    const e=(ed.data||{}).episode||{};
    const series=dd.data||{};
    dramaState.slug=slug;
    dramaState.url=series.url||`https://web.dramaindo.app/drama/${slug}`;
    dramaState.title=series.title||'';
    dramaState.cover=series.cover||'';
    dramaState.episodes=series.episodes||[];
    dramaState.epId=e.id||epId;
    dramaState.epLabel=e.label||`Episode ${e.number||''}`;
    dramaState.files=(e.files||[]).filter(f=>f.url);
    dramaState.lastPos=0;
    dramaState.watchAccum=0;
    dramaState.lastSave=0;
    const file=dramaPickFile(dramaState.files);
    if(!file){dramaError(gen,Error('Episode ini belum punya file video'));return}
    dramaState.quality=file.resolution;
    let initial=startSec;
    if(!initial){
      const marker=dramaEpMarker(dramaState.url,dramaState.epId);
      const local=dramaLocalHistory().find(x=>x.episode_url===marker);
      if(local)initial=local.position_seconds||0;
      if(authToken){
        try{const h=await authApi('/history');const hit=(h.data||[]).find(x=>x.episode_url===marker);if(hit&&(hit.position_seconds||0)>initial)initial=hit.position_seconds}catch(err){}
      }
    }
    const eps=dramaState.episodes;
    const idx=eps.findIndex(x=>Number(x.id)===Number(dramaState.epId));
    const prev=idx>0?eps[idx-1]:null;
    const next=idx>=0&&idx<eps.length-1?eps[idx+1]:null;
    const qOpts=dramaState.files.slice().sort((a,b)=>parseInt(b.resolution)-parseInt(a.resolution)).map(f=>`<option value="${esc(f.resolution)}"${f.resolution===dramaState.quality?' selected':''}>${esc(f.resolution)}${f.bytes?` (${(f.bytes/1048576).toFixed(0)} MB)`:''}</option>`).join('');
    document.title=`${dramaState.title} ${dramaState.epLabel} · NanoStream`;
    setView(gen,`
      <div class="drama-player-wrap">
      <section class="section comic-reader-head">
        <button class="btn btn-secondary" onclick="loadDramaDetail('${esc(slug)}')">&#8592; Detail</button>
        <h2>${esc(dramaState.title)} — ${esc(dramaState.epLabel)}</h2>
      </section>
      <div class="drama-quality-bar">
        <label class="comic-sort">Kualitas<select id="dramaQuality" onchange="dramaSwitchQuality(this.value)">${qOpts}</select></label>
        <span class="reader-count">Posisi tersimpan otomatis${authToken?' ke akun':' di perangkat ini'}</span>
      </div>
      <div class="drama-video-box">
        <video id="dramaVideo" controls autoplay playsinline preload="metadata" poster="${esc(dramaState.cover)}" src="${esc(file.url)}"></video>
        <div id="dramaVideoErr" class="empty hidden">Video gagal dimuat. <button class="btn btn-secondary" onclick="dramaRetryEpisode()">Coba Lagi</button></div>
      </div>
      <div class="comic-reader-nav">
        ${prev&&prev.available?`<button class="btn btn-secondary" onclick="loadDramaPlayer('${esc(slug)}',${prev.id})">&#8592; ${esc(prev.label||'Episode Sebelumnya')}</button>`:'<span></span>'}
        ${next&&next.available?`<button class="btn btn-primary" onclick="loadDramaPlayer('${esc(slug)}',${next.id})">${esc(next.label||'Episode Berikutnya')} &#8594;</button>`:'<span></span>'}
      </div>
      </div>`);
    const v=document.getElementById('dramaVideo');
    v.addEventListener('loadedmetadata',()=>{if(initial>0&&initial<(v.duration||Infinity)-5){v.currentTime=initial;dramaState.lastPos=initial}});
    v.addEventListener('timeupdate',()=>dramaSaveProgress());
    v.addEventListener('pause',()=>dramaSaveProgress(true));
    v.addEventListener('error',()=>{document.getElementById('dramaVideoErr')?.classList.remove('hidden')});
    window.addEventListener('pagehide',dramaPageHide);
  }catch(e){dramaError(gen,e)}
}
function dramaPageHide(){dramaSaveProgress(true)}
