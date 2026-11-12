const API='https://api.xox.web.id/api';
const content=document.getElementById('content');const loader=document.getElementById('loading');let currentAnimeUrl='';let restoring=false;let firstView=true;let renderGen=0;
function view(name,args=[]){renderGen++;const state={nanostream:true,name,args};if(restoring)return renderGen;if(firstView){history.replaceState(state,'',location.href);firstView=false}else history.pushState(state,'',location.href);return renderGen}
function stale(gen){return gen!==renderGen}
function setView(gen,html){if(!stale(gen))show(html)}function restore(state){if(!state?.nanostream)return;restoring=true;const fn=window[state.name];if(typeof fn==='function')fn(...(state.args||[]));restoring=false}window.addEventListener('popstate',e=>restore(e.state));
const fallback='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 4"><rect width="3" height="4" fill="#222631"/></svg>');
function esc(s){const d=document.createElement('div');d.textContent=s??'';return d.innerHTML}function show(h){content.innerHTML=h}function wait(v){loader.classList.toggle('hidden',!v)}
async function api(path,retry=1){wait(true);try{
  for(let i=0;;i++){
    try{const r=await fetch(API+path);const d=await r.json();if(!d.ok)throw Error(d.error||`API ${r.status}`);return d}
    catch(e){if(i>=retry||/(401|403|404)/.test(e.message))throw e;await new Promise(r=>setTimeout(r,1200))}
  }
}finally{wait(false)}}
function toggleTheme(){const el=document.documentElement;const next=el.dataset.theme==='dark'?'light':'dark';el.dataset.theme=next;localStorage.setItem('nanostream-theme',next)}
function accountAction(){authToken?loadHistory():showAuth()}
function updateAccount(){const el=document.getElementById('account-label');if(el)el.textContent=authToken?'My account':'Login'}
function authCard(){return `<section class="auth-shell"><div class="auth-art"><div class="auth-orb"></div><span class="auth-kicker">NANOSTREAM ACCOUNT</span><h1>Your watchlist,<br><em>your story.</em></h1><p>Save anime favoritmu dan lanjutkan episode terakhir tanpa kehilangan posisi.</p><div class="auth-points"><span>Bookmark personal</span><span>Riwayat per episode</span><span>Progress menit tersimpan</span></div></div><div class="auth-form"><span class="auth-form-kicker">WELCOME BACK</span><h2>Masuk ke NanoStream</h2><p class="auth-lead">Gunakan akunmu untuk mengakses bookmark dan riwayat tontonan.</p><label>Username<input id="authUser" autocomplete="username" placeholder="contoh: nanofan"></label><label>Password<input id="authPass" type="password" autocomplete="current-password" placeholder="Minimal 6 karakter"></label><button class="btn btn-primary auth-submit" onclick="loginUser()">Masuk ke akun <span>→</span></button><button class="auth-register" onclick="registerUser()">Belum punya akun? <strong>Daftar sekarang</strong></button><p id="authMsg" class="auth-msg"></p></div></section>`}
async function addBookmark(url,title,image){if(!requireAuth())return;try{await authApi('/bookmarks','POST',{anime_url:url,title,image});alert('Bookmark tersimpan')}catch(e){alert(e.message)}}let authToken=localStorage.getItem('nanostream-token')||'';function authHeaders(){return authToken?{Authorization:`Bearer ${authToken}`}:{}}async function authApi(path,method='GET',body){const r=await fetch(API+path,{method,headers:{'Content-Type':'application/json',...authHeaders()},body:body?JSON.stringify(body):undefined});const d=await r.json();if(!d.ok)throw Error(d.error||'Request gagal');return d}function showAuth(){show(authCard())}async function loginUser(){try{const d=await authApi('/auth/login','POST',{username:document.getElementById('authUser').value,password:document.getElementById('authPass').value});authToken=d.token;localStorage.setItem('nanostream-token',authToken);updateAccount();loadHome()}catch(e){document.getElementById('authMsg').textContent=e.message}}async function registerUser(){try{const d=await authApi('/auth/register','POST',{username:document.getElementById('authUser').value,password:document.getElementById('authPass').value});authToken=d.token;localStorage.setItem('nanostream-token',authToken);updateAccount();loadHome()}catch(e){document.getElementById('authMsg').textContent=e.message}}function requireAuth(){if(!authToken){showAuth();return false}return true}function formatTime(sec){sec=Number(sec||0);return `${Math.floor(sec/60)}:${String(Math.floor(sec%60)).padStart(2,'0')}`}async function loadBookmarks(){if(!requireAuth())return;try{const d=await authApi('/bookmarks');const items=d.data.map(x=>({title:x.title,url:x.anime_url,image:x.image,episode:'Bookmark'}));show(head('My Bookmarks','Anime yang kamu simpan')+grid(items,'ongoing'))}catch(e){show(`<div class="empty">${esc(e.message)}</div>`)}}async function loadHistory(){if(!requireAuth())return;try{const d=await authApi('/history');const items=d.data.map(x=>`<article class="history-item"><div><strong>${esc(x.title)}</strong><small>${esc(x.episode||'Episode')} · ${formatTime(x.position_seconds)}${x.duration_seconds?' / '+formatTime(x.duration_seconds):''}</small></div><button class="btn btn-primary" onclick="loadEpisode('${x.episode_url}')">Continue</button></article>`).join('');show(head('Watch History','Lanjutkan dari menit terakhir')+(items?`<div class="history-list">${items}</div>`:'<div class="empty">Belum ada riwayat tontonan.</div>'))}catch(e){show(`<div class="empty">${esc(e.message)}</div>`)}}async function saveHistory(data){if(authToken)try{await authApi('/history','POST',data)}catch(e){console.warn(e.message)}}
const saved=localStorage.getItem('nanostream-theme');if(saved)document.documentElement.dataset.theme=saved;
function goHome(){loadHome()}function img(src,title){const u=src&&src.startsWith('https://otakudesu.blog')?`${API}/image?url=${encodeURIComponent(src)}`:src;return `<img src="${esc(u||fallback)}" alt="${esc(title)}" loading="lazy" decoding="async" onerror="this.src='${fallback}'">`}
function head(title,sub='',more=''){return `<div class="section-head"><h2>${title}</h2>${sub?`<p>${sub}</p>`:''}${more?`<a href="#" onclick="${more};return false">See all →</a>`:''}</div>`}
function cardMeta(a,type){
  if(type==='complete')return `<span class="rating">★ ${esc(a.rating||a.info||'—')}</span>`+(a.date||a.type?` · ${esc(a.date||a.type)}`:'');
  const parts=[a.day,a.date,a.type].filter(Boolean);
  return parts.length?esc(parts.join(' · ')):`<span class="rating">★ ${esc(a.rating||a.info||'—')}</span>`;
}
function card(a,type='ongoing',kind='otakudesu'){
  const badge=type==='complete'?(a.episodes||a.info||'Complete'):(a.episode||a.info||'Ongoing');
  return `<article class="card" data-url="${esc(a.url||'')}" data-kind="${kind}" data-slug="${esc(a.slug||'')}" onclick="cardGo(this)"><div class="poster">${img(a.image,a.title)}<span class="poster-badge">${esc(badge)}</span></div><div class="card-body"><div class="card-title">${esc(a.title)}</div><div class="meta">${cardMeta(a,type)}</div></div></article>`;
}
function cardGo(el){const k=el.dataset.kind;if(k==='samehadaku')return loadSamehadakuAnime(el.dataset.url);if(k==='samehadaku-ep')return loadSamehadakuEpisode(el.dataset.url);if(k==='anibi')return loadAnibiDetail(el.dataset.slug);loadDetail(el.dataset.url)}
function grid(items,type,kind='otakudesu'){return items?.length?`<div class="grid">${items.map(a=>card(a,type,kind)).join('')}</div>`:'<div class="empty">Belum ada anime.</div>'}
async function loadHome(){view('loadHome');try{const[o,c]=await Promise.all([api('/ongoing?page=1'),api('/complete?page=1')]);const hero=o.data[0];show(`<section class="hero" style="--hero-image:url('${esc(hero?.image||'')}')"><div><div class="hero-kicker">Featured this week</div><h1>${esc(hero?.title||'Streaming anime favoritmu')}</h1><p class="hero-copy">Tonton episode terbaru anime subtitle Indonesia dengan pilihan mirror streaming dan download yang lengkap.</p><div class="hero-actions"><button class="btn btn-primary" onclick="loadDetail('${hero?.url||''}')">Watch now</button><button class="btn btn-secondary" onclick="loadOngoing(1)">Browse ongoing</button></div></div></section><section class="section">${head('Ongoing Anime','Episode terbaru setiap minggu','loadOngoing(1)')}${grid(o.data,'ongoing')}</section><section class="section">${head('Complete Anime','Selesai ditonton kapan saja','loadComplete(1)')}${grid(c.data,'complete')}</section>`)}catch(e){show(`<div class="empty">${esc(e.message)}</div>`)}}
function pageButtons(page,fn,hasNext=true,args=''){const call=n=>`${fn}(${args?`${args},`:''}${n})`;return `<div class="pagination"><button class="page-btn" ${page<2?'disabled':`onclick="${call(page-1)}"`}>← Previous</button><button class="page-btn" ${hasNext?'': 'disabled'} ${hasNext?`onclick="${call(page+1)}"`:''}>Next →</button></div>`}
async function loadOngoing(page){view('loadOngoing',[page]);try{const d=await api(`/ongoing?page=${page}`);show(`${head('Ongoing Anime',`Page ${page}`)}${grid(d.data,'ongoing')}${pageButtons(page,'loadOngoing',d.data.length)}`);scrollTo(0,0)}catch(e){show(`<div class="empty">${esc(e.message)}</div>`)}}
async function loadComplete(page){view('loadComplete',[page]);try{const d=await api(`/complete?page=${page}`);show(`${head('Complete Anime',`Page ${page}`)}${grid(d.data,'complete')}${pageButtons(page,'loadComplete',d.data.length)}`);scrollTo(0,0)}catch(e){show(`<div class="empty">${esc(e.message)}</div>`)}}
async function loadGenres(){view('loadGenres');try{const d=await api('/genres');show(`${head('Browse by Genre','Pilih genre favoritmu')}<div class="genre-menu">${d.data.map(g=>`<a class="genre-card" href="#" onclick="loadGenre('${g.slug}');return false"><strong>${esc(g.name)}</strong><span>Explore anime →</span></a>`).join('')}</div>`)}catch(e){show(`<div class="empty">${esc(e.message)}</div>`)}}
async function loadGenre(slug,page=1){view('loadGenre',[slug,page]);try{const d=await api(`/genre/${encodeURIComponent(slug)}?page=${page}`);show(`${head(`${esc(slug.charAt(0).toUpperCase()+slug.slice(1))} Anime`,`Page ${page}`)}${grid(d.data,'ongoing')}${pageButtons(page,'loadGenre',d.has_next,`'${esc(slug)}'`)}`);scrollTo(0,0)}catch(e){show(`<div class="empty">${esc(e.message)}</div>`)}}
function searchGo(){const s=document.getElementById('searchSource');const v=s?s.value:'otakudesu';if(v==='samehadaku')return shSearch();if(v==='anibi')return anibiSearch();return doSearch()}
async function doSearch(){const q=document.getElementById('searchInput').value.trim();if(!q)return;view('doSearch',[q]);try{const d=await api(`/search?q=${encodeURIComponent(q)}`);show(`${head(`Search results for “${esc(q)}”`,`${d.count} anime ditemukan`)}<div class="grid">${d.data.map(a=>card(a,a.status==='Completed'?'complete':'ongoing')).join('')}</div>`)}catch(e){show(`<div class="empty">${esc(e.message)}</div>`)}}
function row(k,v){return v?`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`:''}function sortMirrors(list){return [...(list||[])].sort((a,b)=>{const am=String(a.name||'').toLowerCase()==='mega'?0:1;const bm=String(b.name||'').toLowerCase()==='mega'?0:1;return am-bm})}
async function loadDetail(url){view('loadDetail',[url]);currentAnimeUrl=url;try{const d=await api(`/detail?url=${encodeURIComponent(url)}`),i=d.data.info,e=d.data.episodes||[],genres=(i.Genre||'').split(',').map(x=>x.trim()).filter(Boolean);show(`<section class="detail"><img class="detail-poster" src="${esc(i.image&&i.image.startsWith('https://otakudesu.blog')?`${API}/image?url=${encodeURIComponent(i.image)}`:(i.image||fallback))}" alt="${esc(i.Judul)}" onerror="this.src='${fallback}'"><div class="detail-main"><div class="hero-kicker">Anime detail</div><h1>${esc(i.Judul||'Untitled')}</h1><div class="detail-sub">${esc(i.Japanese||'')} ${i.Skor?` · <span class="rating">★ ${esc(i.Skor)}</span>`:''}</div><div class="chips">${genres.map(g=>`<span class="chip">${esc(g)}</span>`).join('')}</div><button class="btn btn-primary" onclick="addBookmark('${url}','${esc(i.Judul||'Untitled')}','${esc(i.image||'')}')">+ Bookmark</button><dl class="info-table">${row('Status',i.Status)}${row('Type',i.Tipe)}${row('Episodes',i['Total Episode'])}${row('Duration',i.Durasi)}${row('Studio',i.Studio)}${row('Producer',i.Produser)}${row('Release',i['Tanggal Rilis'])}</dl>${i.sinopsis?`<p class="synopsis">${esc(i.sinopsis)}</p>`:'<p class="synopsis">Informasi sinopsis belum tersedia untuk judul ini.</p>'}</div></section><section class="section">${head(`Episodes (${e.length})`)}<div class="episodes">${e.map(x=>`<div class="episode" data-url="${esc(x.url)}" onclick="loadEpisode(this.dataset.url)"><b class="episode-num">${x.num}</b><span class="episode-title">${esc(x.title.replace(/Subtitle Indonesia/i,'').trim())}</span><small class="episode-date">${esc(x.date)}</small></div>`).join('')}</div></section>`);scrollTo(0,0)}catch(e){show(`<div class="empty">${esc(e.message)}</div>`)}}
async function loadEpisode(url){view('loadEpisode',[url]);window.currentWatch={episode_url:url,anime_url:currentAnimeUrl,title:url,episode:''};try{const d=await api(`/episode?url=${encodeURIComponent(url)}`),e=d.data,n=e.nav||{},m=e.mirrors||{};window.currentWatch.title=e.title;window.currentWatch.episode=e.title;saveHistory({...window.currentWatch,position_seconds:0,duration_seconds:null});show(`<section><div class="section-head"><h2>${esc(e.title.replace(/Subtitle Indonesia/i,'').trim())}</h2></div><div class="player"><div class="player-frame" id="player">${e.default_embed?`<iframe src="${esc(e.default_embed)}" allowfullscreen></iframe>`:'<div class="empty">Pilih mirror streaming.</div>'}</div><div class="mirrors">${Object.entries(m).filter(([,ls])=>ls&&ls.length).map(([q,ls])=>`<div class="quality"><span>${esc(q)}</span>${sortMirrors(ls).map(x=>`<button class="mirror" data-id="${esc(x.post_id)}" data-i="${esc(x.mirror_index)}" data-q="${esc(x.quality)}" onclick="loadMirror(this)">${esc(x.name)}</button>`).join('')}</div>`).join('')}</div></div><div class="episode-nav"><button class="page-btn" ${n.prev?`onclick="loadEpisode('${n.prev}')"`:'disabled'}>← Previous</button><button class="btn btn-primary" onclick="loadDetail('${n.all_episodes||currentAnimeUrl}')">All episodes</button><button class="page-btn" ${n.next?`onclick="loadEpisode('${n.next}')"`:'disabled'}>Next →</button></div><div class="section" style="margin-top:16px"><button class="btn btn-secondary" onclick="loadSamehadaku('${url}')">Play via Samehadaku</button></div></section>${e.downloads?.length?`<section class="section">${head('Download')}<div class="downloads">${e.downloads.map(x=>`<div class="download"><strong>${esc(x.quality)}</strong><small>${esc(x.size)}</small><div class="download-links">${x.links.map(l=>`<a href="${l.url}" target="_blank" rel="noopener">${esc(l.name)}</a>`).join('')}</div></div>`).join('')}</div></section>`:''}`);scrollTo(0,0)}catch(e){show(`<div class="empty">${esc(e.message)}</div>`)}}
async function loadSamehadaku(url){try{const d=await api(`/samehadaku-episode?url=${encodeURIComponent(url)}`),e=d.data;shakeSource=null;show(episodeShell(e,'samehadaku'))}catch(err){show(`<div class="empty">${esc(err.message)}</div>`)}}

let shSource=null;
async function loadSamehadakuHome(){
  const gen=view('loadSamehadakuHome');
  try{
    const [l,c]=await Promise.all([api('/samehadaku/latest'),api('/samehadaku/catalog')]);
    setView(gen,`<section class="section">${head('Samehadaku · Episode Terbaru',`${l.count} judul · tema ${esc(l.theme||'li')}`)}${grid(l.data,'ongoing','samehadaku-ep')}</section>
    <section class="section">${head('Samehadaku · Katalog')}${grid(c.data,'complete','samehadaku')}</section>`);
    scrollTo(0,0);
  }catch(e){show(`<div class="empty">${esc(e.message)}</div>`)}
}

async function shSearch(){
  const q=document.getElementById('searchInput').value.trim();
  if(!q)return;
  const gen=view('shSearch',[q]);
  try{const d=await api(`/samehadaku/search?q=${encodeURIComponent(q)}`);setView(gen,`${head(`Samehadaku · “${esc(q)}”`,`${d.count} hasil`)}${grid(d.data,'ongoing','samehadaku')}`);scrollTo(0,0)}
  catch(e){show(`<div class="empty">${esc(e.message)}</div>`)}
}

async function loadSamehadakuAnime(url){
  const gen=view('loadSamehadakuAnime',[url]);
  try{
    const r=await api(`/samehadaku/anime?url=${encodeURIComponent(url)}`),d=r.data||{},i=d.info||{},eps=d.episodes||[];
    setView(gen,`<section class="detail"><div class="detail-main"><div class="hero-kicker">Samehadaku · ${esc(d.theme||'li')}</div>
      <h1>${esc(i.title||'Untitled')}</h1>
      <div class="chips">${(i.genres||[]).map(g=>`<span class="chip">${esc(g)}</span>`).join('')}</div>
      <dl class="info-table">${row('Status',i.status)}${row('Type',i.type)}${row('Episodes',i.episodes)}${row('Duration',i.duration)}${row('Studio',i.studio)}${row('Released',i.released)}${row('Score',i.score)}</dl>
      ${i.synopsis?`<p class="synopsis">${esc(i.synopsis)}</p>`:''}</div></section>
    <section class="section">${head(`Episodes (${eps.length})`)}<div class="episodes">${eps.map(x=>`<div class="episode" data-url="${esc(x.url)}" onclick="loadSamehadakuEpisode(this.dataset.url)"><b class="episode-num">${esc(x.num)}</b><span class="episode-title">${esc(String(x.title||'').replace(/Subtitle Indonesia/i,'').trim())}</span><small class="episode-date">${esc(x.date||'')}</small></div>`).join('')}</div></section>`);
    scrollTo(0,0);
  }catch(e){show(`<div class="empty">${esc(e.message)}</div>`)}
}

async function loadSamehadakuEpisode(url){
  const gen=view('loadSamehadakuEpisode',[url]);
  try{const d=await api(`/samehadaku/episode?url=${encodeURIComponent(url)}`);setView(gen,episodeShell(d.data,'samehadaku'))}
  catch(e){show(`<div class="empty">${esc(e.message)}</div>`)}
}
async function loadMirror(btn){const id=btn.dataset.id,index=btn.dataset.i,q=btn.dataset.q;document.querySelectorAll('.mirror').forEach(x=>x.classList.remove('active'));btn.classList.add('active');const p=document.getElementById('player');p.innerHTML='<div class="empty">Loading mirror...</div>';try{const d=await api(`/embed?id=${encodeURIComponent(id)}&i=${encodeURIComponent(index)}&q=${encodeURIComponent(q)}`);p.innerHTML=`<iframe src="${esc(d.data.embed_url)}" allowfullscreen></iframe>`}catch(e){p.innerHTML=`<div class="empty">${esc(e.message)}</div>`}}
function mirrorBtn(x){return `<button class="mirror" data-url="${esc(x.url||x.embed_url||'')}" data-id="${esc(x.post_id||'')}" data-i="${esc(x.mirror_index??'')}" data-q="${esc(x.quality||'')}" onclick="playMirror(this)">${esc(x.name||'Mirror')}</button>`}
function mirrorGroups(m){
  if(!m)return '';
  if(Array.isArray(m))return m.length?`<div class="quality"><span>Streaming</span>${sortMirrors(m).map(mirrorBtn).join('')}</div>`:'';
  return Object.entries(m).filter(([,ls])=>Array.isArray(ls)&&ls.length).map(([q,ls])=>`<div class="quality"><span>${esc(q)}</span>${sortMirrors(ls).map(mirrorBtn).join('')}</div>`).join('');
}

function downloadBlock(list){
  if(!list||!list.length)return '';
  const rows=[];
  for(const x of list){
    if(Array.isArray(x.links)&&x.links.length){
      rows.push(`<div class="download"><strong>${esc(x.quality||x.format||'')}</strong><small>${esc(x.size||'')}</small><div class="download-links">${x.links.map(l=>`<a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.name||'Link')}</a>`).join('')}</div></div>`);
    }else{
      rows.push(`<div class="download"><strong>${esc(x.name||x.format||x.quality||'')}</strong><small>${esc(x.size||'')}</small><div class="download-links">${Object.entries(x).filter(([k,v])=>k!=='name'&&k!=='format'&&k!=='quality'&&k!=='size'&&typeof v==='string'&&v.startsWith('http')).map(([k,v])=>`<a href="${esc(v)}" target="_blank" rel="noopener noreferrer">${esc(k)}</a>`).join('')}</div></div>`);
    }
  }
  return `<section class="section">${head('Download')}<div class="downloads">${rows.join('')}</div></section>`;
}

function episodeShell(e,source){
  const n=e.nav||{},m=e.mirrors||{},first=Array.isArray(m)?(m[0]||null):(Object.values(m).flat()[0]||null);
  const embed=e.embed_url||e.default_embed||first?.embed_url||'';
  const goto=source==='samehadaku'?'loadSamehadakuEpisode':'loadEpisode';
  const back=source==='samehadaku'?'loadSamehadakuHome':'loadHome';
  window.currentWatch={episode_url:e.url||'',anime_url:e.anime_url||currentAnimeUrl,title:e.title||'',episode:String(e.matched_episode||e.title||''),source};
  saveHistory({...window.currentWatch,position_seconds:0,duration_seconds:null});
  return `<section><div class="section-head"><h2>${esc(String(e.title||'').replace(/Subtitle Indonesia/i,'').trim())}</h2><p>${source==='samehadaku'?`Samehadaku · tema ${esc(e.theme||'li')}${e.matched_episode?` · episode ${esc(e.matched_episode)}`:''}`:'OtakuDesu'}</p></div>
  <div class="player"><div class="player-frame" id="player">${embed?`<iframe src="${esc(embed)}" allowfullscreen referrerpolicy="no-referrer"></iframe>`:'<div class="empty">Pilih mirror streaming.</div>'}</div>
  <div class="mirrors">${mirrorGroups(m)}</div></div>
  <div class="episode-nav"><button class="page-btn" ${n.prev?`data-url="${esc(n.prev)}" onclick="${goto}(this.dataset.url)"`:'disabled'}>← Previous</button><button class="btn btn-primary" onclick="${back}()">${source==='samehadaku'?'Semua episode':'All episodes'}</button><button class="page-btn" ${n.next?`data-url="${esc(n.next)}" onclick="${goto}(this.dataset.url)"`:'disabled'}>Next →</button></div>
  ${downloadBlock(e.downloads)}</section>`;
}

async function playMirror(btn){
  document.querySelectorAll('.mirror').forEach(x=>x.classList.remove('active'));
  btn.classList.add('active');
  const p=document.getElementById('player');
  if(!p)return;
  p.innerHTML='<div class="empty">Loading mirror...</div>';
  try{
    let url=btn.dataset.url;
    if(!url&&btn.dataset.id){
      const d=await api(`/embed?id=${encodeURIComponent(btn.dataset.id)}&i=${encodeURIComponent(btn.dataset.i)}&q=${encodeURIComponent(btn.dataset.q)}`);
      url=d.data.embed_url;
    }
    if(!url)throw Error('Mirror tanpa URL');
    p.innerHTML=`<iframe src="${esc(url)}" allowfullscreen referrerpolicy="no-referrer"></iframe>`;
  }catch(e){p.innerHTML=`<div class="empty">${esc(e.message)}</div>`}
}

async function loadAnibi(){
  const gen=view('loadAnibi');
  try{
    const s=await api('/anibi/schedule');
    const days=Object.entries(s.data||{});
    setView(gen,`<section class="section">${head('Anibiplay · Jadwal Rilis','Rilis per hari, langsung dari sumber')}<div class="schedule">${days.map(([day,list])=>`<div class="schedule-day"><h3>${esc(day)}</h3><div class="grid">${(list||[]).slice(0,12).map(a=>`<article class="card" data-kind="anibi" data-slug="${esc(a.slug||a.id)}" onclick="loadAnibiDetail(this.dataset.slug)"><div class="poster">${img(a.image,a.title)}<span class="poster-badge">Ep ${esc(a.last_episode?.label||'—')}</span></div><div class="card-body"><div class="card-title">${esc(a.title)}</div><div class="meta">${a.airing_today?'Airing today':esc(a.day||'')}</div></div></article>`).join('')}</div></div>`).join('')}</div></section>`);
    scrollTo(0,0);
  }catch(e){show(`<div class="empty">${esc(e.message)}</div>`)}
}

async function anibiSearch(){
  const q=document.getElementById('searchInput').value.trim();
  if(!q)return;
  const gen=view('anibiSearch',[q]);
  try{const d=await api(`/anibi/search?q=${encodeURIComponent(q)}`);setView(gen,`${head(`Anibiplay · “${esc(q)}”`,`${d.count} dari ${d.total??d.count} hasil`)}${d.data?.length?`<div class="grid">${d.data.map(a=>`<article class="card" data-kind="anibi" data-slug="${esc(a.slug||a.id)}" onclick="loadAnibiDetail(this.dataset.slug)"><div class="poster">${img(a.image,a.title)}<span class="poster-badge">${esc(a.status||'—')}</span></div><div class="card-body"><div class="card-title">${esc(a.title)}</div><div class="meta"><span class="rating">★ ${esc(a.rating||'—')}</span> · ${esc(a.type||'')} · ${esc(a.episodes??'')} ep</div></div></article>`).join('')}</div>`:'<div class="empty">Tidak ada hasil.</div>'}`);scrollTo(0,0)}
  catch(e){show(`<div class="empty">${esc(e.message)}</div>`)}
}

async function loadAnibiDetail(slug){
  const gen=view('loadAnibiDetail',[slug]);
  try{
    const d=await api(`/anibi/detail/${encodeURIComponent(slug)}`),x=d.data||{};
    setView(gen,`<section class="detail"><div class="detail-main"><div class="hero-kicker">Anibiplay · ${esc(x.platform||'')}</div><h1>${esc(x.title||'Untitled')}</h1>
    <div class="detail-sub">${esc(x.origin||'')} ${x.rating?` · <span class="rating">★ ${esc(x.rating)}</span>`:''}</div>
    <dl class="info-table">${row('Status',x.status)}${row('Type',x.type)}${row('Episodes',x.episodes)}${row('Studio',x.studio)}${row('Published',x.published)}</dl>
    ${x.synopsis?`<p class="synopsis">${esc(x.synopsis)}</p>`:''}</div></section>
    <section class="section">${head('Episode & Mirror')}<div class="episodes">${(x.episodes_list||x.episode_list||[]).map(e=>`<div class="episode"><b class="episode-num">${esc(e.num||e.label||'')}</b><span class="episode-title">${esc(e.title||'')}</span></div>`).join('')||'<div class="empty">Detail episode tidak tersedia dari sumber ini.</div>'}</div></section>`);
    scrollTo(0,0);
  }catch(e){show(`<div class="empty">${esc(e.message)}<br><small>${esc(e.hint||'')}</small></div>`)}
}

window.addEventListener('message',e=>{const d=e.data||{};const position=Number(d.currentTime??d.position??d.seconds);const duration=Number(d.duration);if(window.currentWatch&&Number.isFinite(position)&&position>=0)saveHistory({...window.currentWatch,position_seconds:Math.floor(position),duration_seconds:Number.isFinite(duration)&&duration>0?Math.floor(duration):null})});if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));loadHome();
