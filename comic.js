const comicState={url:'',title:'',cover:'',chapters:[],page:0,series:'',readerUrl:'',readerObserver:null,saveTimer:null,images:[],chapterTitle:''};
const COMIC_HISTORY_KEY='nanostream-comic-history-v1';
const COMIC_BOOKMARKS_KEY='nanostream-comic-bookmarks-v1';
const isDoujinUrl=u=>/https?:\/\/([^/]*\.)?(desu\.xxx|desu\.pics|doujindesu\.tv)/i.test(u||'');
function comicImgProxy(url){if(isDoujinUrl(url))return API+'/doujin/image?url='+encodeURIComponent(url)+(authToken?'&token='+encodeURIComponent(authToken):'');return API+'/komik/image?url='+encodeURIComponent(url)}
function comicIsAdmin(){return localStorage.getItem('nanostream-role')==='admin'}
async function refreshComicRole(){if(!authToken){localStorage.removeItem('nanostream-role');return}try{const p=await authApi('/profile');localStorage.setItem('nanostream-role',p.data?.role||'user')}catch(e){}}
function comicSourceTabs(active){return `<div class="comic-filters"><div class="comic-kind-tabs"><button class="comic-kind${active==='komik'?' active':''}" onclick="loadComicHome()">Komikindo</button>${comicIsAdmin()?`<button class="comic-kind${active==='doujin'?' active':''}" onclick="loadComicDoujin()">Doujindesu</button>`:''}</div></div>`}
function comicAdminLocked(gen){setView(gen,`<div class="empty comic-error"><strong>Doujindesu khusus admin.</strong><p>Masuk dengan akun admin untuk membuka sumber ini.</p><button class="btn btn-primary" onclick="showAuth()">Masuk</button> <button class="btn btn-secondary" onclick="loadComicHome()">Kembali ke Komik</button></div>`)}
const COMIC_CHAPTER_FAVS_KEY='nanostream-comic-chapter-favs-v1';
const comicStarSvg='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
const comicIcLeft='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';
const comicIcRight='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>';
const comicIcPages='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="12" height="16" rx="2"/><path d="M7 8h4M7 12h4M17 5v14"/></svg>';
const comicIcSingle='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>';
const comicIcJump='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15M13 6l6 6-6 6"/></svg>';
const comicIcFull='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>';
const comicIcDown='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5M4 21h16"/></svg>';
const comicIcUp='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg>';
function comicChapterFavs(){return comicReadStore(COMIC_CHAPTER_FAVS_KEY)}
function comicWriteFavs(items){comicWriteStore(COMIC_CHAPTER_FAVS_KEY,items)}
function comicIsChapterFav(url){return comicChapterFavs().some(x=>x.url===url)}
function comicFavPayload(x){return{chapter_url:x.url,series_url:x.series||'',series_title:x.title||'',chapter_title:x.chapter||x.chapterTitle||'',cover:x.cover||''}}
async function comicSyncAccount(){
  if(!authToken)return;
  try{
    const [b,h,f]=await Promise.all([
      authApi('/comic/bookmarks').catch(()=>null),
      authApi('/comic/history').catch(()=>null),
      authApi('/comic/chapter-favs').catch(()=>null)
    ]);
    if(b&&Array.isArray(b.data)){
      const merged=b.data.map(x=>({url:x.url,title:x.title,cover:x.cover||'',savedAt:Date.parse(x.created_at)||Date.now()}));
      for(const x of comicBookmarks()){
        if(!merged.some(y=>y.url===x.url)){merged.push(x);authApi('/comic/bookmarks','POST',{url:x.url,title:x.title,cover:x.cover}).catch(()=>{})}
      }
      comicWriteStore(COMIC_BOOKMARKS_KEY,merged);
    }
    if(h&&Array.isArray(h.data)){
      const merged=h.data.map(x=>({url:x.url,series:x.series||'',title:x.title,chapter:x.chapter_title||'',cover:x.cover||'',page:x.page||1,total:x.total||1,updatedAt:Date.parse(x.updated_at)||Date.now()}));
      for(const x of comicHistory()){
        const hit=merged.find(y=>y.url===x.url);
        const payload={url:x.url,series:x.series,title:x.title,cover:x.cover,chapter_title:x.chapter,page:x.page||1,total:x.total||0};
        if(!hit){merged.push(x);authApi('/comic/history','POST',payload).catch(()=>{})}
        else if((x.updatedAt||0)>(hit.updatedAt||0)){Object.assign(hit,x);authApi('/comic/history','POST',payload).catch(()=>{})}
      }
      merged.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
      comicWriteStore(COMIC_HISTORY_KEY,merged);
    }
    if(f&&Array.isArray(f.data)){
      const merged=f.data.map(x=>({url:x.chapter_url,series:x.series_url||'',title:x.series_title||'',chapter:x.chapter_title||'',cover:x.cover||'',savedAt:Date.parse(x.created_at)||Date.now()}));
      for(const x of comicChapterFavs()){
        if(!merged.some(y=>y.url===x.url)){merged.push(x);authApi('/comic/chapter-favs','POST',comicFavPayload(x)).catch(()=>{})}
      }
      comicWriteFavs(merged);
    }
  }catch(e){}
}
function comicPushHistory(item){
  if(!authToken||!item)return;
  const now=Date.now();
  if(now-(comicState.lastHistSync||0)<5000)return;
  comicState.lastHistSync=now;
  authApi('/comic/history','POST',{url:item.url,series:item.series,title:item.title,cover:item.cover,chapter_title:item.chapter,page:item.page||1,total:item.total||0}).catch(()=>{});
}
function comicToggleChapterFav(btn){
  const url=btn.dataset.url;
  if(!url)return;
  const items=comicChapterFavs();
  const idx=items.findIndex(x=>x.url===url);
  const removing=idx>=0;
  const entry={url,series:btn.dataset.series||comicState.url||'',title:btn.dataset.seriesTitle||comicState.title||'',chapter:btn.dataset.title||comicState.chapterTitle||'',cover:btn.dataset.cover||comicState.cover||'',savedAt:Date.now()};
  if(removing)items.splice(idx,1);
  else items.unshift(entry);
  comicWriteFavs(items);
  if(authToken){
    if(removing)authApi(`/comic/chapter-favs/remove?url=${encodeURIComponent(url)}`,'DELETE').catch(()=>{});
    else authApi('/comic/chapter-favs','POST',comicFavPayload(entry)).catch(()=>{});
  }
  document.querySelectorAll('.cc-fav').forEach(b=>{if(b.dataset.url===url)b.classList.toggle('active',!removing)});
  const rb=document.getElementById('comicReaderFavBtn');
  if(rb&&rb.dataset.url===url){rb.classList.toggle('active',!removing);rb.innerHTML=`${comicStarSvg}<span>${removing?'Favoritkan Chapter':'Chapter Difavoritkan'}</span>`}
  showToast(removing?'Chapter dihapus dari favorit':'Chapter difavoritkan');
}
function comicFavCard(x){
  return `<article class="card comic-continue-card" data-url="${esc(x.url||'')}" onclick="loadComicReader(this.dataset.url)">
    <div class="poster">${comicImg(x.cover,x.title)}<span class="poster-badge">${comicStarSvg}</span></div>
    <div class="card-body"><div class="card-title" title="${esc(x.title||'')}">${esc(x.title||'Komik')}</div><div class="meta">${esc(x.chapter||'Chapter')}</div></div>
  </article>`;
}
let comicLastScrollY=0;
let comicScrollSrc='';
let comicUserScrolling=false;
for(const ev of ['wheel','touchmove','pointerdown'])document.addEventListener(ev,()=>{if(document.querySelector('.comic-reader'))comicUserScrolling=true},{capture:true,passive:true});
document.addEventListener('keydown',e=>{if(['ArrowDown','ArrowUp','PageDown','PageUp',' ','Home','End'].includes(e.key))comicUserScrolling=true},{capture:true});
function comicScrollPos(){
  const wrap=document.getElementById('comicReaderWrap');
  if(!wrap)return null;
  const fs=wrap.classList.contains('fs')||wrap.classList.contains('pseudo-fullscreen')||document.fullscreenElement===wrap;
  return fs?{src:'wrap',y:wrap.scrollTop}:{src:'win',y:window.scrollY};
}
document.addEventListener('scroll',()=>{
  const wrap=document.getElementById('comicReaderWrap');
  if(!wrap)return;
  if(wrap.querySelector('.comic-reader.single'))return;
  if(!comicUserScrolling)return;
  if(Date.now()-(comicState.readerOpenedAt||0)<800)return;
  if(Date.now()-(comicState.lastToggleAt||0)<350)return;
  const s=comicScrollPos();
  if(!s)return;
  if(s.src!==comicScrollSrc){comicScrollSrc=s.src;comicLastScrollY=s.y;return}
  const dy=s.y-comicLastScrollY;
  comicLastScrollY=s.y;
  if(dy>18&&s.y>250&&!comicState.toolsPinned){wrap.classList.add('tools-hidden');comicState.lastToggleAt=Date.now()}
  else if(dy<-18){wrap.classList.remove('tools-hidden');comicState.toolsPinned=false;comicState.lastToggleAt=Date.now()}
},{capture:true,passive:true});
function comicToggleTools(){
  const wrap=document.getElementById('comicReaderWrap');
  if(!wrap)return;
  const hidden=wrap.classList.toggle('tools-hidden');
  comicState.toolsPinned=!hidden;
  comicState.lastToggleAt=Date.now();
  const fab=wrap.querySelector('.comic-tools-fab');
  if(fab)fab.title=hidden?'Tampilkan pengaturan baca':'Sembunyikan pengaturan baca';
}
async function comicEnsureChapters(url,series){
  if((comicState.chapters||[]).some(x=>x.url===url))return comicState.chapters;
  if(!series)return [];
  try{
    const dj=isDoujinUrl(series);
    const d=await api(`${dj?'/doujin':'/komik'}/detail?url=${encodeURIComponent(series)}`);
    const cs=(d.data&&d.data.chapters)||[];
    if(cs.length){
      comicState.chapters=cs;
      comicState.series=series;
      comicState.title=d.data.title||comicState.title;
      comicState.cover=d.data.cover||comicState.cover;
    }
    return cs;
  }catch(e){return []}
}
function comicReaderSkeleton(){
  return `<section class="section comic-reader-head"><span class="comic-skeleton sk-back"></span><span class="comic-skeleton sk-title"></span></section><div class="comic-reader-tools"><span class="comic-skeleton sk-tools"></span></div><div class="comic-reader"><div class="comic-skeleton sk-page"></div><div class="comic-skeleton sk-page"></div></div>`;
}

function comicCatalogSkeleton(){
  return `<section class="section"><span class="comic-skeleton sk-title"></span><div class="comic-skeleton sk-search"></div><div class="grid">${Array.from({length:12},()=>'<div class="comic-skeleton sk-card"></div>').join('')}</div></section>`;
}

function comicShowSkeleton(gen,reader=false){
  if(!stale(gen))show(reader?comicReaderSkeleton():comicCatalogSkeleton());
}

function comicImg(src,title){
  if(!src)return fallback;
  if(isDoujinUrl(src))src=comicImgProxy(src);
  return `<img src="${esc(src)}" alt="${esc(title||'')}" title="${esc(title||'')}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${fallback}'">`;
}

function comicReadStore(key){
  try{
    const value=JSON.parse(localStorage.getItem(key)||'[]');
    return Array.isArray(value)?value:[];
  }catch(e){return []}
}

function comicWriteStore(key,items){
  try{localStorage.setItem(key,JSON.stringify(items.slice(0,80)))}catch(e){}
}

function comicHistory(){return comicReadStore(COMIC_HISTORY_KEY)}
function comicBookmarks(){return comicReadStore(COMIC_BOOKMARKS_KEY)}
function comicHistoryFor(url){return comicHistory().find(x=>x.series===url||x.url===url)}
function comicIsSaved(url){return comicBookmarks().some(x=>x.url===url)}

function comicToggleBookmark(){
  if(!comicState.url)return;
  const items=comicBookmarks().filter(x=>x.url!==comicState.url);
  const saved=items.length!==comicBookmarks().length;
  if(!saved)items.unshift({url:comicState.url,title:comicState.title,cover:comicState.cover,savedAt:Date.now()});
  comicWriteStore(COMIC_BOOKMARKS_KEY,items);
  if(authToken){
    if(saved)authApi(`/comic/bookmarks/remove?url=${encodeURIComponent(comicState.url)}`,'DELETE').catch(()=>{});
    else authApi('/comic/bookmarks','POST',{url:comicState.url,title:comicState.title,cover:comicState.cover}).catch(()=>{});
  }
  const btn=document.getElementById('comicBookmarkBtn');
  if(btn)btn.textContent=saved?'+ Simpan Komik':'Tersimpan';
  showToast(saved?'Komik dihapus dari daftar':(authToken?'Komik disimpan ke akun':'Komik disimpan di perangkat ini'));
}

function comicSaveProgress(page,total){
  if(!comicState.readerUrl)return;
  const items=comicHistory().filter(x=>x.url!==comicState.readerUrl);
  items.unshift({
    url:comicState.readerUrl,
    series:comicState.series||comicState.url,
    title:comicState.title||document.querySelector('.comic-reader-head h2')?.textContent||'Komik',
    chapter:document.querySelector('.comic-reader-head h2')?.textContent||'Chapter',
    cover:comicState.cover,
    page:Math.max(1,Number(page)||1),
    total:Math.max(1,Number(total)||1),
    updatedAt:Date.now()
  });
  comicWriteStore(COMIC_HISTORY_KEY,items);
  comicPushHistory(items[0]);
}

function comicContinue(item){
  if(item.url)return loadComicReader(item.url,item.page||1);
  if(item.series)return loadComicDetail(item.series);
}

function comicContinueCard(item){
  return `<article class="card comic-continue-card" data-url="${esc(item.url||item.series||'')}" data-page="${Number(item.page)||1}" onclick="loadComicReader(this.dataset.url,Number(this.dataset.page))">
    <div class="poster">${comicImg(item.cover,item.title)}<span class="poster-badge">Hal ${Number(item.page)||1}</span></div>
    <div class="card-body"><div class="card-title" title="${esc(item.title)}">${esc(item.title)}</div><div class="meta">${esc(item.chapter||'Chapter')} · ${Number(item.page)||1}/${Number(item.total)||1} halaman</div></div>
  </article>`;
}

function comicCard(c){
  const chapters=(c.chapters||[]).slice(0,3);
  const ug=[...new Set((c.genres||[]).filter(Boolean))];
  const gs=ug.length>1?ug.slice(0,3).map(g=>`<span class="comic-card-genre">${esc(g)}</span>`).join(''):'';
  const kind=c.kind?`<span class="comic-card-kind">${esc(c.kind)}</span>`:'';
  const meta=chapters.length?chapters.map(x=>x.title).join(' · '):(ug.length===1?ug[0]:'Detail & Daftar Chapter');
  return `<article class="card comic-card" data-url="${esc(c.url||'')}" onclick="loadComicDetail(this.dataset.url)">
    <div class="poster">${comicImg(c.cover,c.title)}${kind}</div>
    <div class="card-body">
      <div class="card-title" title="${esc(c.title||'')}">${esc(c.title||'')}</div>
      <div class="meta">${esc(meta)}</div>
      ${gs?`<div class="comic-card-genres">${gs}</div>`:''}
    </div>
  </article>`;
}

function comicGenreChips(list,active,limit){
  const arr=list||[];
  limit=limit||14;
  const act=arr.find(g=>g.slug===active);
  const rest=arr.filter(g=>g.slug!==active);
  const shown=act?[act,...rest.slice(0,Math.max(limit-1,0))]:rest.slice(0,limit);
  const hidden=arr.filter(g=>!shown.includes(g));
  const chips=shown.map(g=>`<button class="comic-genre${g.slug===active?' active':''}" data-slug="${esc(g.slug)}" onclick="loadComicGenre(this.dataset.slug)">${esc(g.name)}</button>`).join('')
    +hidden.map(g=>`<button class="comic-genre hidden-chip" data-slug="${esc(g.slug)}" onclick="loadComicGenre(this.dataset.slug)">${esc(g.name)}</button>`).join('');
  const more=hidden.length?`<button class="comic-genre comic-genre-more" onclick="var c=this.previousElementSibling;c.classList.add('expanded');this.remove()">+${hidden.length} lainnya</button>`:'';
  return `<div class="comic-genres-wrap"><div class="comic-genres">${chips}</div>${more}</div>`;
}

function comicSearchBar(q=''){
  return `<div class="comic-search-bar"><input id="comicSearchInput" type="search" value="${esc(q)}" placeholder="Cari judul komik..." onkeydown="if(event.key==='Enter')loadComicSearch()"><button class="btn btn-primary" onclick="loadComicSearch()">Cari Komik</button></div>`;
}

function comicKindFilter(kind='',sort='latest',slug=''){
  const action=slug?`loadComicGenre('${esc(slug)}',1)`:'loadComicHome()';
  return `<div class="comic-filters"><div class="comic-kind-tabs">${['','manga','manhwa','manhua'].map(k=>`<button class="comic-kind${kind===k?' active':''}" data-kind="${k}" data-action="${esc(action)}" onclick="comicApplyFilter(this.dataset.kind,document.getElementById('comicSort').value,'${esc(slug)}')">${k?k[0].toUpperCase()+k.slice(1):'Semua Tipe'}</button>`).join('')}</div><label class="comic-sort">Urutkan<select id="comicSort" onchange="comicApplyFilter(document.querySelector('.comic-kind.active')?.dataset.kind||'',this.value,'${esc(slug)}')"><option value="latest"${sort!=='title'?' selected':''}>Terbaru</option><option value="title"${sort==='title'?' selected':''}>Judul A–Z</option></select></label></div>`;
}

function comicApplyFilter(kind,sort,slug=''){
  if(slug)return loadComicGenre(slug,1,kind,sort);
  loadComicHome(kind,sort);
}

function comicFilterItems(items,kind,sort){
  let out=[...(items||[])];
  if(kind)out=out.filter(x=>(x.kind||'').toLowerCase()===kind.toLowerCase());
  if(sort==='title')out.sort((a,b)=>(a.title||'').localeCompare(b.title||'','id'));
  return out;
}

function comicPager(slug,page,items,kind='',sort='latest'){
  const k=kind?`,'${esc(kind)}'`:`,''`;
  const s=sort==='title'?`,'title'`:`,'latest'`;
  return `<div class="comic-pager">${page>1?`<button class="btn btn-secondary" onclick="loadComicGenre('${esc(slug)}',${page-1}${k}${s})">&#8592; Sebelumnya</button>`:'<span></span>'}<span class="comic-pager-info">Halaman ${page}</span>${items>=20?`<button class="btn btn-secondary" onclick="loadComicGenre('${esc(slug)}',${page+1}${k}${s})">Berikutnya &#8594;</button>`:'<span></span>'}</div>`;
}

function comicError(gen,e){
  setView(gen,`<div class="empty comic-error"><strong>Komik belum bisa dimuat.</strong><p>${esc(e.message)}</p><button class="btn btn-secondary" onclick="loadComicHome()">Coba Lagi</button></div>`);
}

async function loadComicGenre(slug,page,kind='',sort='latest'){
  if(!slug)return;
  page=page||1;
  setActiveNav('comic');
  const gen=view('loadComicGenre',[slug,page,kind,sort]);
  comicShowSkeleton(gen);
  try{
    const [d,gd]=await Promise.all([
      api(`/komik/genre?slug=${encodeURIComponent(slug)}&page=${page}&kind=${encodeURIComponent(kind)}&sort=${sort}`),
      api('/komik/genres').catch(()=>({data:{genres:[]}}))
    ]);
    if(stale(gen))return;
    const items=(d.data&&d.data.items)||[];
    const all=(gd.data&&gd.data.genres)||[];
    const label=d.data?.label||(all.find(g=>g.slug===slug)||{}).name||slug.replace(/-/g,' ');
    document.title=`Genre ${label} · NanoStream Komik`;
    setView(gen,`<section class="section">
      ${head(`Genre ${esc(label)}`,`${items.length} judul di halaman ${page}`,'loadComicHome()')}
      ${comicSearchBar()}
      ${comicGenreChips(all,slug,14)}
      ${comicKindFilter(kind,sort,slug)}
      ${comicPager(slug,page,items.length,kind,sort)}
      ${items.length?`<div class="grid">${items.map(comicCard).join('')}</div>`:'<div class="empty">Tidak ada komik pada filter ini.</div>'}
      ${comicPager(slug,page,items.length,kind,sort)}
    </section>`);
  }catch(e){comicError(gen,e)}
}

async function loadComicGenres(){
  setActiveNav('comic');
  const gen=view('loadComicGenres');
  try{
    const gd=await api('/komik/genres');
    const genres=(gd.data&&gd.data.genres)||[];
    document.title='Genre Komik · NanoStream';
    setView(gen,`<section class="section">${head('Genre Komik',`${genres.length} genre tersedia`,'loadComicHome()')}${comicGenreChips(genres,null,60)}</section>`);
  }catch(e){comicError(gen,e)}
}

async function loadComicHome(kind='',sort='latest'){
  setActiveNav('comic');
  document.querySelectorAll('#searchInput,#mobileSearchInput').forEach(i=>i.placeholder='Cari komik...');
  const gen=view('loadComicHome',[kind,sort]);
  comicShowSkeleton(gen);
  try{
    const [d,gd]=await Promise.all([api('/komik/home'),api('/komik/genres').catch(()=>({data:{genres:[]}})),refreshComicRole(),comicSyncAccount()]);
    if(stale(gen))return;
    const items=comicFilterItems((d.data&&d.data.items)||[],kind,sort);
    const genres=(gd.data&&gd.data.genres)||[];
    const history=comicHistory();
    const saved=comicBookmarks();
    const favs=comicChapterFavs();
    document.title='Komik Bahasa Indonesia · NanoStream';
    setView(gen,`<section class="section">
      ${head('Komik Bahasa Indonesia','Manga, manhwa, dan manhua bahasa Indonesia','loadComicSearch()')}
      ${comicSourceTabs('komik')}
      ${comicSearchBar()}
      ${history.length?`${head('Lanjut Baca','Tersimpan otomatis di perangkat ini')}<div class="rail comic-history-rail">${history.slice(0,12).map(comicContinueCard).join('')}</div>`:''}
      ${saved.length?`${head('Komik Tersimpan','Daftar bacaan di perangkat ini')}<div class="rail">${saved.slice(0,12).map(c=>comicCard({...c,chapters:[],genres:[]})).join('')}</div>`:''}
      ${favs.length?`${head('Chapter Favorit','Chapter yang kamu tandai bintang')}<div class="rail">${favs.slice(0,12).map(comicFavCard).join('')}</div>`:''}
      ${genres.length?`<div class="section-head comic-genre-head"><h2>Genre</h2><a href="#" onclick="loadComicGenres();return false">Semua &#8250;</a></div>${comicGenreChips(genres,null,12)}`:''}
      ${comicKindFilter(kind,sort)}
      ${items.length?`<div class="grid">${items.map(comicCard).join('')}</div>`:'<div class="empty">Tidak ada komik untuk filter ini.</div>'}
    </section>`);
  }catch(e){comicError(gen,e)}
}

async function loadComicSearch(forcedQ){
  const q=(forcedQ??document.getElementById('comicSearchInput')?.value??'').trim();
  if(!q)return loadComicHome();
  setActiveNav('comic');
  const gen=view('loadComicSearch',[q]);
  try{
    const d=await api(`/komik/search?q=${encodeURIComponent(q)}`);
    const items=(d.data&&d.data.items)||[];
    document.title=`Cari ${q} · NanoStream Komik`;
    setView(gen,`<section class="section">${head(`Komik "${esc(q)}"`,`${items.length} judul ditemukan`,'loadComicHome()')}${comicSearchBar(q)}${items.length?`<div class="grid">${items.map(comicCard).join('')}</div>`:'<div class="empty">Tidak ada komik yang cocok.</div>'}</section>`);
  }catch(e){comicError(gen,e)}
}

function comicDoujinSearchBar(q=''){
  return `<div class="comic-search-bar"><input id="comicDoujinSearchInput" type="search" value="${esc(q)}" placeholder="Cari judul doujin / manhwa..." onkeydown="if(event.key==='Enter')loadComicDoujinSearch()"><button class="btn btn-primary" onclick="loadComicDoujinSearch()">Cari Doujin</button></div>`;
}

function doujinPager(page,count,sort,kind,q=''){
  const prev=q?`loadComicDoujinSearch(this.dataset.q,${page-1})`:`loadComicDoujin(${page-1},'${sort}','${kind}')`;
  const next=q?`loadComicDoujinSearch(this.dataset.q,${page+1})`:`loadComicDoujin(${page+1},'${sort}','${kind}')`;
  return `<div class="comic-pager">${page>1?`<button class="btn btn-secondary" data-q="${esc(q)}" onclick="${prev}">&#8592; Sebelumnya</button>`:'<span></span>'}<span class="comic-pager-info">Halaman ${page}</span>${count>=24?`<button class="btn btn-secondary" data-q="${esc(q)}" onclick="${next}">Berikutnya &#8594;</button>`:'<span></span>'}</div>`;
}

async function loadComicDoujin(page=1,sort='latest',kind=''){
  setActiveNav('comic');
  document.querySelectorAll('#searchInput,#mobileSearchInput').forEach(i=>i.placeholder='Cari komik...');
  const gen=view('loadComicDoujin',[page,sort,kind]);
  comicShowSkeleton(gen);
  await refreshComicRole();
  if(stale(gen))return;
  if(!comicIsAdmin())return comicAdminLocked(gen);
  try{
    const d=await api(`/doujin/${sort==='rating'?'popular':'latest'}?page=${page}&limit=24`);
    if(stale(gen))return;
    const items=comicFilterItems((d.data&&d.data.items)||[],kind,'latest');
    document.title='Doujindesu · NanoStream Komik';
    setView(gen,`<section class="section">
      ${head('Doujindesu','Doujinshi & manhwa subtitle Indonesia','loadComicHome()')}
      ${comicSourceTabs('doujin')}
      ${comicDoujinSearchBar()}
      <div class="comic-filters"><div class="comic-kind-tabs">${['','doujinshi','manhwa','manga'].map(k=>`<button class="comic-kind${kind===k?' active':''}" onclick="loadComicDoujin(1,'${sort}','${k}')">${k?k[0].toUpperCase()+k.slice(1):'Semua Tipe'}</button>`).join('')}</div><label class="comic-sort">Urutkan<select onchange="loadComicDoujin(1,this.value,'${kind}')"><option value="latest"${sort!=='rating'?' selected':''}>Terbaru</option><option value="rating"${sort==='rating'?' selected':''}>Terpopuler</option></select></label></div>
      ${doujinPager(page,items.length,sort,kind)}
      ${items.length?`<div class="grid">${items.map(comicCard).join('')}</div>`:'<div class="empty">Tidak ada judul untuk filter ini.</div>'}
      ${doujinPager(page,items.length,sort,kind)}
    </section>`);
  }catch(e){comicError(gen,e)}
}

async function loadComicDoujinSearch(forcedQ,page=1){
  const q=(forcedQ??document.getElementById('comicDoujinSearchInput')?.value??'').trim();
  if(!q)return loadComicDoujin();
  setActiveNav('comic');
  const gen=view('loadComicDoujinSearch',[q,page]);
  comicShowSkeleton(gen);
  await refreshComicRole();
  if(stale(gen))return;
  if(!comicIsAdmin())return comicAdminLocked(gen);
  try{
    const d=await api(`/doujin/search?q=${encodeURIComponent(q)}&page=${page}&limit=24`);
    if(stale(gen))return;
    const items=(d.data&&d.data.items)||[];
    document.title=`Cari ${q} · Doujindesu · NanoStream`;
    setView(gen,`<section class="section">
      ${head(`Doujin "${esc(q)}"`,`${items.length} judul ditemukan`,'loadComicDoujin()')}
      ${comicSourceTabs('doujin')}
      ${comicDoujinSearchBar(q)}
      ${doujinPager(page,items.length,'latest','',q)}
      ${items.length?`<div class="grid">${items.map(comicCard).join('')}</div>`:'<div class="empty">Tidak ada doujin yang cocok.</div>'}
      ${doujinPager(page,items.length,'latest','',q)}
    </section>`);
  }catch(e){comicError(gen,e)}
}

async function loadComicDetail(url){
  if(!url)return;
  setActiveNav('comic');
  comicBatch.on=false;
  comicBatch.sel.clear();
  const gen=view('loadComicDetail',[url]);
  try{
    const dj=isDoujinUrl(url);
    const d=await api(`${dj?'/doujin':'/komik'}/detail?url=${encodeURIComponent(url)}`);
    const c=d.data||{};
    if(dj&&c.cover)c.cover=comicImgProxy(c.cover);
    comicState.url=url;
    comicState.title=c.title||'';
    comicState.cover=c.cover||'';
    comicState.chapters=c.chapters||[];
    const history=comicHistoryFor(url);
    const saved=comicIsSaved(url);
    const genres=(c.genres||[]).map(g=>dj?`<span class="chip comic-genre-chip">${esc(g)}</span>`:`<button class="chip comic-genre-chip" data-slug="${esc(g.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''))}" onclick="loadComicGenre(this.dataset.slug)">${esc(g)}</button>`).join('');
    const chapters=c.chapters?.length?`<div class="comic-batch-tools"><button class="btn btn-secondary" id="comicBatchToggle" onclick="comicBatchToggle()">Unduh Batch</button><span class="comic-batch-hint">Pilih beberapa chapter untuk diunduh sekaligus</span></div><div class="comic-batch-panel hidden" id="comicBatchPanel"><button class="btn btn-secondary" onclick="comicBatchSelectAll()">Pilih Semua</button><button class="btn btn-secondary" onclick="comicBatchClear()">Bersihkan</button><span class="comic-batch-count" id="comicBatchCount">0 dipilih</span><button class="btn btn-primary" id="comicBatchGo" onclick="comicBatchDownload()" disabled>Unduh ZIP</button></div><div class="comic-chapters" id="comicChapterList">${c.chapters.map(ch=>`<a class="comic-chapter" href="#" data-url="${esc(ch.url)}" onclick="return comicChapterClick(this)"><button class="cc-fav${comicIsChapterFav(ch.url)?' active':''}" data-url="${esc(ch.url)}" data-title="${esc(ch.title)}" data-series="${esc(url)}" data-series-title="${esc(c.title||'')}" data-cover="${esc(c.cover||'')}" title="Favoritkan chapter" onclick="event.stopPropagation();comicToggleChapterFav(this);return false">${comicStarSvg}</button><span class="cc-num">${esc(ch.title)}</span><span class="cc-date">${esc(ch.date||'')}</span></a>`).join('')}</div>`:'<div class="empty">Daftar chapter belum tersedia.</div>';
    const meta=[c.kind,c.status,c.author?`Pengarang: ${c.author}`:'',c.released?`Rilis: ${c.released}`:''].filter(Boolean).join(' · ');
    const latest=c.chapters?.[0];
    const first=c.chapters?.[c.chapters.length-1];
    document.title=`${c.title||'Komik'} · NanoStream`;
    setView(gen,`
      <section class="detail comic-detail">
        <img class="detail-poster" src="${esc(c.cover||fallback)}" alt="${esc(c.title||'')}" onerror="this.onerror=null;this.src='${fallback}'">
        <div class="detail-main">
          <span class="hero-kicker">Komik</span>
          <h1>${esc(c.title||'Untitled')}</h1>
          <div class="detail-sub">${esc(meta)}${meta?' · ':''}${c.total_chapters||0} chapter</div>
          ${genres?`<div class="chips">${genres}</div>`:''}
          ${c.description?`<p class="hero-copy">${esc(c.description)}</p>`:''}
          <div class="hero-actions comic-detail-actions">
            ${history?`<button class="btn btn-primary" data-url="${esc(history.url)}" onclick="loadComicReader(this.dataset.url,${history.page||1})">${playIconSvg}<span>Lanjut Halaman ${history.page||1}</span></button>`:''}
            ${latest?`<button class="btn ${history?'btn-secondary':'btn-primary'}" data-url="${esc(latest.url)}" onclick="loadComicReader(this.dataset.url)">Chapter Terbaru</button>`:''}
            ${first?`<button class="btn btn-secondary" data-url="${esc(first.url)}" onclick="loadComicReader(this.dataset.url)">Mulai dari Awal</button>`:''}
            <button id="comicBookmarkBtn" class="btn btn-secondary" onclick="comicToggleBookmark()">${saved?'Tersimpan':'+ Simpan Komik'}</button>
          </div>
        </div>
      </section>
      <section class="section">${head('Daftar Chapter',`${c.total_chapters||0} chapter`)}${chapters}</section>`);
  }catch(e){comicError(gen,e)}
}

function comicReaderSettings(){
  try{return JSON.parse(localStorage.getItem('nanostream-comic-reader')||'{}')}catch(e){return {}}
}

function comicSetMode(mode){
  const settings=comicReaderSettings();
  settings.mode=mode;
  localStorage.setItem('nanostream-comic-reader',JSON.stringify(settings));
  const reader=document.querySelector('.comic-reader');
  if(reader)reader.classList.toggle('single',mode==='single');
  if(mode==='single'){document.getElementById('comicReaderWrap')?.classList.remove('tools-hidden');comicState.toolsPinned=false}
  document.querySelectorAll('.comic-mode').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
  comicShowPage(comicState.page||1);
}

function comicSetWidth(width){
  const settings=comicReaderSettings();
  settings.width=width;
  localStorage.setItem('nanostream-comic-reader',JSON.stringify(settings));
  const reader=document.querySelector('.comic-reader');
  if(reader)reader.style.setProperty('--comic-width',width+'px');
  document.querySelectorAll('.comic-width').forEach(b=>b.classList.toggle('active',Number(b.dataset.width)===Number(width)));
}

function comicShowPage(page){
  const total=comicState.images.length;
  if(!total)return;
  comicState.page=Math.max(1,Math.min(total,Number(page)||1));
  const reader=document.querySelector('.comic-reader');
  if(reader?.classList.contains('single')){
    document.querySelectorAll('.comic-page').forEach((el,i)=>el.classList.toggle('current',i===comicState.page-1));
  }
  const counter=document.getElementById('comicPageCurrent');
  if(counter)counter.textContent=comicState.page;
  const range=document.getElementById('comicPageRange');
  if(range)range.value=comicState.page;
  const now=document.getElementById('comicPageNow');
  if(now)now.textContent=comicState.page;
  comicSaveProgress(comicState.page,total);
  comicPreload(comicState.page);
  if(reader?.classList.contains('single'))comicSyncUrl('page',comicState.page,true);
}

function comicGoPage(delta){
  comicShowPage((comicState.page||1)+delta);
  document.querySelector('.comic-page.current')?.scrollIntoView({block:'start',behavior:'smooth'});
}
function comicJumpPage(value){
  comicShowPage(value);
  const el=document.querySelector('.comic-reader.single .comic-page.current')||document.getElementById('comic-page-'+comicState.page);
  el?.scrollIntoView({block:'start'});
}

function comicPreload(page){
  comicState.images.slice(page,page+3).forEach(src=>{const im=new Image();im.src=src});
}

function comicImageRetry(btn){
  const img=btn.parentElement.querySelector('img');
  if(!img)return;
  const original=img.dataset.src||img.src;
  const proxied=comicImgProxy(original);
  const src=img.dataset.proxy==='1'?proxied+(proxied.includes('?')?'&':'?')+'retry='+Date.now():proxied;
  img.dataset.proxy='1';
  btn.classList.add('hidden');
  img.classList.remove('hidden');
  img.onerror=()=>{img.classList.add('hidden');btn.classList.remove('hidden')};
  img.onload=()=>{img.classList.remove('hidden');btn.classList.add('hidden')};
  img.src=src;
}

function comicWatchPages(){
  comicState.readerObserver?.disconnect();
  const pages=[...document.querySelectorAll('.comic-page')];
  if(!pages.length)return;
  comicState.readerObserver=new IntersectionObserver(entries=>{
    const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
    if(!visible)return;
    const page=Number(visible.target.dataset.page);
    if(!page||page===comicState.page)return;
    comicState.page=page;
    clearTimeout(comicState.saveTimer);
    comicState.saveTimer=setTimeout(()=>comicShowPage(page),250);
  },{threshold:[0.25,0.5,0.75]});
  pages.forEach(p=>comicState.readerObserver.observe(p));
}

async function loadComicReader(url,startPage=1){
  if(!url)return;
  setActiveNav('comic');
  document.body.classList.remove('comic-fs-lock');
  const gen=view('loadComicReader',[url,startPage]);
  comicShowSkeleton(gen,true);
  try{
    const dj=isDoujinUrl(url);
    const d=await api(`${dj?'/doujin':'/komik'}/reader?url=${encodeURIComponent(url)}`);
    const r=d.data||{};
    if(stale(gen))return;
    const imgs=r.images||[];
    if(dj)imgs.forEach(im=>{im.url=comicImgProxy(im.url)});
    comicState.readerUrl=url;
    comicState.toolsPinned=false;
    comicState.readerOpenedAt=Date.now();
    comicUserScrolling=false;
    comicLastScrollY=0;
    comicScrollSrc='';
    comicState.series=r.series||comicState.url;
    comicState.chapterTitle=r.title||'';
    comicState.images=imgs.map(im=>im.url);
    const saved=comicHistory().find(x=>x.url===url);
    const initial=Math.max(1,Math.min(imgs.length||1,Number(startPage)||Number(saved?.page)||1));
    const settings=comicReaderSettings();
    const width=Number(settings.width)||820;
    const mode=settings.mode||'vertical';
    const pages=imgs.map((im,i)=>`<figure class="comic-page${i===initial-1?' current':''}" data-page="${i+1}" id="comic-page-${i+1}"><img data-src="${esc(im.url)}" src="${esc(im.url)}" alt="Halaman ${im.page||i+1}" loading="${i<3?'eager':'lazy'}" decoding="async" onerror="this.classList.add('hidden');this.nextElementSibling.classList.remove('hidden')"><button class="comic-image-error hidden" onclick="comicImageRetry(this)">Gambar gagal dimuat. Coba lagi</button><figcaption>${im.page||i+1} / ${im.total||imgs.length}</figcaption></figure>`).join('');
    let chs=(comicState.chapters||[]).some(x=>x.url===url)?comicState.chapters:[];
    if(!chs.length){chs=await comicEnsureChapters(url,r.series||comicState.series||comicState.url);if(stale(gen))return}
    const ci=chs.findIndex(x=>x.url===url);
    const chPrev=ci>=0&&ci<chs.length-1?chs[ci+1]:null;
    const chNext=ci>0?chs[ci-1]:null;
    const prevUrl=r.prev||chPrev?.url||'';
    const nextUrl=r.next||chNext?.url||'';
    const chOpts=chs.map(x=>`<option value="${esc(x.url)}"${x.url===url?' selected':''}>${esc(x.title)}</option>`).join('');
    const fav=comicIsChapterFav(url);
    document.title=`${r.title||'Baca Komik'} · NanoStream`;
    setView(gen,`
      <div id="comicReaderWrap" class="comic-reader-wrap">
      <button class="comic-tools-fab" onclick="comicToggleTools()" title="Tampilkan pengaturan baca" aria-label="Tampilkan pengaturan baca"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="1" x2="7" y1="14" y2="14"/><line x1="9" x2="15" y1="8" y2="8"/><line x1="17" x2="23" y1="16" y2="16"/></svg><span>Baca</span></button>
      <section class="section comic-reader-head">
        <button class="btn btn-secondary" onclick="comicBack()">&#8592; Kembali</button>
        <h2>${esc(r.title||'Reader Komik')}</h2>
        <span class="reader-count">${imgs.length} halaman</span>
      </section>
      <div class="comic-reader-tools">
        <div class="crt-mini">
          <button class="crt-mini-btn" type="button" title="Chapter sebelumnya" ${prevUrl?`data-url="${esc(prevUrl)}" onclick="loadComicReader(this.dataset.url)"`:'disabled'}>${comicIcLeft}<span>Sebelumnya</span></button>
          ${chs.length?`<label class="crt-select-mini"><select id="comicChapterSelect" title="Pilih chapter" onchange="loadComicReader(this.value)">${chOpts}</select></label>`:''}
          <label class="crt-bar" title="Geser untuk pindah halaman"><span>Hal <b id="comicPageNow">${initial}</b></span><input id="comicPageRange" type="range" min="1" max="${Math.max(imgs.length,1)}" value="${initial}" oninput="document.getElementById('comicPageNow').textContent=this.value;comicShowPage(this.value)" onchange="comicJumpPage(this.value)"></label>
          <button class="crt-mini-btn" type="button" title="Chapter berikutnya" ${nextUrl?`data-url="${esc(nextUrl)}" onclick="loadComicReader(this.dataset.url)"`:'disabled'}><span>Berikutnya</span>${comicIcRight}</button>
          <button class="crt-mini-icon" id="comicFsBtn" type="button" title="Layar penuh" onclick="comicToggleFullscreen()">${comicIcFull}<span>Penuh</span></button>
          <button class="crt-mini-icon cc-fav-reader${fav?' active':''}" id="comicReaderFavBtn" data-url="${esc(url)}" data-title="${esc(r.title||'')}" data-series="${esc(r.series||comicState.url||'')}" data-series-title="${esc(comicState.title||'')}" data-cover="${esc(comicState.cover||'')}" title="Favoritkan chapter" onclick="comicToggleChapterFav(this)">${comicStarSvg}<span>Favorit</span></button>
        </div>
      </div>
      ${imgs.length?`<div class="comic-reader${mode==='single'?' single':''}" style="--comic-width:${width}px">${pages}</div>`:'<div class="empty">Halaman komik tidak ditemukan.</div>'}
      <div class="comic-reader-nav">
        ${r.prev?`<button class="btn btn-secondary" data-url="${esc(r.prev)}" onclick="loadComicReader(this.dataset.url)">&#8592; Chapter Sebelumnya</button>`:'<span></span>'}
        ${r.next?`<button class="btn btn-primary" data-url="${esc(r.next)}" onclick="loadComicReader(this.dataset.url)">Chapter Berikutnya &#8594;</button>`:'<span></span>'}
      </div>
      </div>`);
    comicShowPage(initial);
    comicWatchPages();
    comicPreload(initial);
    comicFsSync();
    requestAnimationFrame(()=>document.getElementById(`comic-page-${initial}`)?.scrollIntoView({block:'start'}));
  }catch(e){comicError(gen,e)}
}

function comicBack(){
  if(comicState.series||comicState.url)return loadComicDetail(comicState.series||comicState.url);
  loadComicHome();
}

document.addEventListener('keydown',e=>{
  if(!document.querySelector('.comic-reader'))return;
  if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
  if(e.key==='f'&&!e.ctrlKey&&!e.metaKey&&!e.altKey){comicToggleFullscreen();return}
  if(!document.querySelector('.comic-reader.single'))return;
  if(e.key==='ArrowRight')comicGoPage(1);
  if(e.key==='ArrowLeft')comicGoPage(-1);
});

function comicFsWrap(){return document.getElementById('comicReaderWrap')}

function comicFsActive(){
  const w=comicFsWrap();
  return !!w&&(document.fullscreenElement===w||w.classList.contains('pseudo-fullscreen'));
}

function comicFsSync(){
  const active=comicFsActive();
  const btn=document.getElementById('comicFsBtn');
  if(btn){btn.title=active?'Keluar layar penuh':'Layar penuh';const label=btn.querySelector('span');if(label)label.textContent=active?'Keluar':'Penuh'}
  const w=comicFsWrap();
  if(w)w.classList.toggle('fs',active);
  if(!active)document.body.classList.remove('comic-fs-lock');
}

async function comicToggleFullscreen(){
  const w=comicFsWrap();
  if(!w)return;
  if(comicFsActive()){
    if(document.fullscreenElement)await document.exitFullscreen().catch(()=>{});
    w.classList.remove('pseudo-fullscreen','fs');
    document.body.classList.remove('comic-fs-lock');
  }else{
    let native=false;
    try{
      if(w.requestFullscreen){await w.requestFullscreen();native=true}
    }catch(e){}
    if(!native){
      w.classList.add('pseudo-fullscreen','fs');
      document.body.classList.add('comic-fs-lock');
    }
  }
  comicFsSync();
  comicScrollSrc='';
  comicState.toolsPinned=false;
  document.getElementById('comicReaderWrap')?.classList.remove('tools-hidden');
}

document.addEventListener('fullscreenchange',comicFsSync);

const comicDl={active:false,cancel:false};
const comicBatch={on:false,sel:new Set()};

const comicCrcTable=(()=>{
  const t=new Uint32Array(256);
  for(let n=0;n<256;n++){
    let c=n;
    for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;
    t[n]=c>>>0;
  }
  return t;
})();

function comicCrc32(b){
  let c=0xFFFFFFFF;
  for(let i=0;i<b.length;i++)c=comicCrcTable[(c^b[i])&0xFF]^(c>>>8);
  return (c^0xFFFFFFFF)>>>0;
}

function comicZip(files){
  const enc=new TextEncoder();
  const chunks=[];
  const central=[];
  let offset=0;
  const now=new Date();
  const dosTime=(now.getHours()<<11)|(now.getMinutes()<<5)|(now.getSeconds()>>1);
  const dosDate=((now.getFullYear()-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate();
  for(const f of files){
    const name=enc.encode(f.name);
    const data=f.data;
    const crc=comicCrc32(data);
    const lh=new DataView(new ArrayBuffer(30));
    lh.setUint32(0,0x04034b50,true);
    lh.setUint16(4,20,true);
    lh.setUint16(6,0x0800,true);
    lh.setUint16(8,0,true);
    lh.setUint16(10,dosTime,true);
    lh.setUint16(12,dosDate,true);
    lh.setUint32(14,crc,true);
    lh.setUint32(18,data.length,true);
    lh.setUint32(22,data.length,true);
    lh.setUint16(26,name.length,true);
    lh.setUint16(28,0,true);
    chunks.push(new Uint8Array(lh.buffer),name,data);
    const ch=new DataView(new ArrayBuffer(46));
    ch.setUint32(0,0x02014b50,true);
    ch.setUint16(4,20,true);
    ch.setUint16(6,20,true);
    ch.setUint16(8,0x0800,true);
    ch.setUint16(10,0,true);
    ch.setUint16(12,dosTime,true);
    ch.setUint16(14,dosDate,true);
    ch.setUint32(16,crc,true);
    ch.setUint32(20,data.length,true);
    ch.setUint32(24,data.length,true);
    ch.setUint16(28,name.length,true);
    ch.setUint32(42,offset,true);
    central.push(new Uint8Array(ch.buffer),name);
    offset+=30+name.length+data.length;
  }
  const cdSize=central.reduce((s,c)=>s+c.length,0);
  const end=new DataView(new ArrayBuffer(22));
  end.setUint32(0,0x06054b50,true);
  end.setUint16(8,files.length,true);
  end.setUint16(10,files.length,true);
  end.setUint32(12,cdSize,true);
  end.setUint32(16,offset,true);
  return new Blob([...chunks,...central,new Uint8Array(end.buffer)],{type:'application/zip'});
}

function comicSafeName(s){
  return (s||'komik').replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,' ').trim().slice(0,120)||'komik';
}

function comicSaveBlob(blob,name){
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),30000);
}

async function comicFetchBytes(url){
  const proxied=comicImgProxy(url);
  for(let attempt=0;attempt<2;attempt++){
    try{
      const r=await fetch(attempt?proxied+'&retry='+Date.now():proxied);
      if(!r.ok)throw Error('HTTP '+r.status);
      const ct=(r.headers.get('content-type')||'').toLowerCase();
      if(ct.includes('json')||ct.includes('text'))throw Error('bukan gambar');
      const data=new Uint8Array(await r.arrayBuffer());
      if(!data.length)throw Error('kosong');
      let ext='jpg';
      if(ct.includes('png'))ext='png';
      else if(ct.includes('webp'))ext='webp';
      else if(ct.includes('gif'))ext='gif';
      else if(ct.includes('avif'))ext='avif';
      else{
        const m=url.split('?')[0].match(/\.(jpe?g|png|webp|gif|avif)$/i);
        if(m)ext=m[1].toLowerCase().replace('jpeg','jpg');
      }
      return {data,ext};
    }catch(e){
      if(attempt)throw e;
    }
  }
}

async function comicPool(items,limit,worker){
  let idx=0;
  const runners=Array.from({length:Math.min(limit,items.length)},async()=>{
    while(idx<items.length){
      if(comicDl.cancel)return;
      const i=idx++;
      await worker(items[i],i);
    }
  });
  await Promise.all(runners);
}

function comicDlShow(title){
  comicDl.active=true;
  comicDl.cancel=false;
  let el=document.getElementById('comicDlOverlay');
  if(!el){
    el=document.createElement('div');
    el.id='comicDlOverlay';
    el.className='comic-dl-overlay';
    document.body.appendChild(el);
  }
  el.innerHTML=`<div class="comic-dl-panel"><div class="comic-dl-title">${esc(title)}</div><div class="comic-dl-bar"><span id="comicDlBar"></span></div><div class="comic-dl-status" id="comicDlStatus">Menyiapkan...</div><button class="btn btn-secondary" onclick="comicDlCancel()">Batalkan</button></div>`;
}

function comicDlProgress(done,total,label){
  const bar=document.getElementById('comicDlBar');
  const st=document.getElementById('comicDlStatus');
  if(bar)bar.style.width=(total?Math.round(done/total*100):0)+'%';
  if(st)st.textContent=label||`${done} / ${total}`;
}

function comicDlHide(){
  comicDl.active=false;
  document.getElementById('comicDlOverlay')?.remove();
}

function comicDlCancel(){
  comicDl.cancel=true;
  comicDlProgress(0,0,'Membatalkan...');
}

async function comicDownloadChapter(){
  if(comicDl.active)return showToast('Unduhan lain sedang berjalan');
  const imgs=comicState.images||[];
  if(!imgs.length)return showToast('Tidak ada halaman untuk diunduh');
  const chapter=comicState.chapterTitle||'Chapter';
  const series=comicState.title||'';
  comicDlShow(`Mengunduh ${chapter}`);
  const files=[];
  let failed=0;
  let done=0;
  try{
    await comicPool(imgs,3,async(url,i)=>{
      try{
        const f=await comicFetchBytes(url);
        files[i]={name:String(i+1).padStart(3,'0')+'.'+f.ext,data:f.data};
      }catch(e){failed++}
      done++;
      comicDlProgress(done,imgs.length,`Halaman ${done}/${imgs.length}${failed?` · ${failed} gagal`:''}`);
    });
    if(comicDl.cancel){comicDlHide();return showToast('Unduhan dibatalkan')}
    const ok=files.filter(Boolean);
    if(!ok.length)throw Error('Semua halaman gagal diunduh');
    const name=series&&!chapter.toLowerCase().includes(series.toLowerCase())?`${series} - ${chapter}`:chapter;
    comicSaveBlob(comicZip(ok),comicSafeName(name)+'.zip');
    comicDlHide();
    showToast(failed?`Chapter terunduh (${failed} halaman gagal)`:'Chapter berhasil diunduh sebagai ZIP');
  }catch(e){
    comicDlHide();
    showToast('Unduhan gagal: '+e.message);
  }
}

function comicChapterClick(a){
  if(comicBatch.on){
    const url=a.dataset.url;
    const cb=a.querySelector('input');
    if(comicBatch.sel.has(url)){
      comicBatch.sel.delete(url);
      if(cb)cb.checked=false;
      a.classList.remove('selected');
    }else{
      comicBatch.sel.add(url);
      if(cb)cb.checked=true;
      a.classList.add('selected');
    }
    comicBatchCount();
    return false;
  }
  loadComicReader(a.dataset.url);
  return false;
}

function comicBatchCount(){
  const n=comicBatch.sel.size;
  const label=document.getElementById('comicBatchCount');
  const go=document.getElementById('comicBatchGo');
  if(label)label.textContent=`${n} dipilih`;
  if(go)go.disabled=!n;
}

function comicBatchToggle(){
  comicBatch.on=!comicBatch.on;
  comicBatch.sel.clear();
  const list=document.getElementById('comicChapterList');
  const panel=document.getElementById('comicBatchPanel');
  const btn=document.getElementById('comicBatchToggle');
  if(!list)return;
  list.classList.toggle('batch',comicBatch.on);
  if(panel)panel.classList.toggle('hidden',!comicBatch.on);
  if(btn)btn.textContent=comicBatch.on?'Batal Pilih':'Unduh Batch';
  list.querySelectorAll('.comic-chapter').forEach(a=>{
    let cb=a.querySelector('.comic-chapter-check');
    if(comicBatch.on&&!cb){
      cb=document.createElement('span');
      cb.className='comic-chapter-check';
      cb.innerHTML='<input type="checkbox" aria-label="Pilih chapter">';
      a.prepend(cb);
    }
    if(!comicBatch.on){
      cb?.remove();
      a.classList.remove('selected');
    }
  });
  comicBatchCount();
}

function comicBatchSelectAll(){
  const list=document.getElementById('comicChapterList');
  if(!list)return;
  list.querySelectorAll('.comic-chapter').forEach(a=>{
    comicBatch.sel.add(a.dataset.url);
    const cb=a.querySelector('input');
    if(cb)cb.checked=true;
    a.classList.add('selected');
  });
  comicBatchCount();
}

function comicBatchClear(){
  comicBatch.sel.clear();
  document.querySelectorAll('#comicChapterList .comic-chapter').forEach(a=>{
    const cb=a.querySelector('input');
    if(cb)cb.checked=false;
    a.classList.remove('selected');
  });
  comicBatchCount();
}

async function comicApiQuiet(path){
  const ctrl=new AbortController();
  const t=setTimeout(()=>ctrl.abort(),20000);
  let r;
  try{r=await fetch(API+path,{signal:ctrl.signal,headers:authHeaders()})}finally{clearTimeout(t)}
  const d=await r.json();
  if(!d.ok)throw Error(d.error||'API '+r.status);
  return d;
}

async function comicBatchDownload(){
  if(comicDl.active)return showToast('Unduhan lain sedang berjalan');
  const sel=(comicState.chapters||[]).filter(ch=>comicBatch.sel.has(ch.url));
  if(!sel.length)return showToast('Pilih minimal satu chapter');
  if(sel.length>25&&!confirm(`Unduh ${sel.length} chapter sekaligus bisa besar dan lama. Lanjutkan?`))return;
  comicDlShow(`Unduh batch ${sel.length} chapter`);
  const files=[];
  let failedCh=0;
  let failedPages=0;
  let doneCh=0;
  let totalBytes=0;
  let limitHit=false;
  try{
    for(const ch of sel){
      if(comicDl.cancel||limitHit)break;
      comicDlProgress(doneCh,sel.length,`Chapter ${doneCh+1}/${sel.length}: ${ch.title}`);
      let r;
      try{
        r=await comicApiQuiet(`${isDoujinUrl(ch.url)?'/doujin':'/komik'}/reader?url=${encodeURIComponent(ch.url)}`);
      }catch(e){
        failedCh++;
        doneCh++;
        continue;
      }
      const imgs=(r.data&&r.data.images)||[];
      const folder=comicSafeName(ch.title||`Chapter ${doneCh+1}`);
      let done=0;
      await comicPool(imgs,3,async(im,i)=>{
        try{
          const f=await comicFetchBytes(im.url);
          totalBytes+=f.data.length;
          if(totalBytes>600*1024*1024){limitHit=true;comicDl.cancel=true;return}
          files.push({name:`${folder}/${String(i+1).padStart(3,'0')}.${f.ext}`,data:f.data});
        }catch(e){failedPages++}
        done++;
        comicDlProgress(doneCh,sel.length,`${ch.title} · halaman ${done}/${imgs.length}`);
      });
      doneCh++;
    }
    if(comicDl.cancel&&!limitHit){
      comicDlHide();
      return showToast('Unduhan dibatalkan');
    }
    if(!files.length){
      comicDlHide();
      return showToast(comicDl.cancel?'Unduhan dibatalkan':'Tidak ada halaman yang berhasil diunduh');
    }
    comicSaveBlob(comicZip(files),comicSafeName(`${comicState.title||'Komik'} - Batch ${doneCh} Chapter`)+'.zip');
    comicDlHide();
    const notes=[];
    if(limitHit)notes.push('batas 600 MB tercapai');
    if(failedCh)notes.push(`${failedCh} chapter gagal`);
    if(failedPages)notes.push(`${failedPages} halaman gagal`);
    showToast(`Batch terunduh sebagai ZIP${notes.length?' ('+notes.join(', ')+')':''}`);
  }catch(e){
    comicDlHide();
    showToast('Unduhan batch gagal: '+e.message);
  }
}
