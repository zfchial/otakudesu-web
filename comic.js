const comicState={url:'',title:'',cover:'',chapters:[],page:0,series:'',readerUrl:'',readerObserver:null,saveTimer:null,images:[]};
const COMIC_HISTORY_KEY='nanostream-comic-history-v1';
const COMIC_BOOKMARKS_KEY='nanostream-comic-bookmarks-v1';

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
  const btn=document.getElementById('comicBookmarkBtn');
  if(btn)btn.textContent=saved?'+ Simpan Komik':'Tersimpan';
  showToast(saved?'Komik dihapus dari daftar':'Komik disimpan di perangkat ini');
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
    const [d,gd]=await Promise.all([api('/komik/home'),api('/komik/genres').catch(()=>({data:{genres:[]}}))]);
    if(stale(gen))return;
    const items=comicFilterItems((d.data&&d.data.items)||[],kind,sort);
    const genres=(gd.data&&gd.data.genres)||[];
    const history=comicHistory();
    const saved=comicBookmarks();
    document.title='Komik Bahasa Indonesia · NanoStream';
    setView(gen,`<section class="section">
      ${head('Komik Bahasa Indonesia','Manga, manhwa, dan manhua bahasa Indonesia','loadComicSearch()')}
      ${comicSearchBar()}
      ${history.length?`${head('Lanjut Baca','Tersimpan otomatis di perangkat ini')}<div class="rail comic-history-rail">${history.slice(0,12).map(comicContinueCard).join('')}</div>`:''}
      ${saved.length?`${head('Komik Tersimpan','Daftar bacaan di perangkat ini')}<div class="rail">${saved.slice(0,12).map(c=>comicCard({...c,chapters:[],genres:[]})).join('')}</div>`:''}
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

async function loadComicDetail(url){
  if(!url)return;
  setActiveNav('comic');
  const gen=view('loadComicDetail',[url]);
  try{
    const d=await api(`/komik/detail?url=${encodeURIComponent(url)}`);
    const c=d.data||{};
    comicState.url=url;
    comicState.title=c.title||'';
    comicState.cover=c.cover||'';
    comicState.chapters=c.chapters||[];
    const history=comicHistoryFor(url);
    const saved=comicIsSaved(url);
    const genres=(c.genres||[]).map(g=>`<button class="chip comic-genre-chip" data-slug="${esc(g.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''))}" onclick="loadComicGenre(this.dataset.slug)">${esc(g)}</button>`).join('');
    const chapters=c.chapters?.length?`<div class="comic-chapters">${c.chapters.map(ch=>`<a class="comic-chapter" href="#" data-url="${esc(ch.url)}" onclick="loadComicReader(this.dataset.url);return false"><span class="cc-num">${esc(ch.title)}</span><span class="cc-date">${esc(ch.date||'')}</span></a>`).join('')}</div>`:'<div class="empty">Daftar chapter belum tersedia.</div>';
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
  comicSaveProgress(comicState.page,total);
  comicPreload(comicState.page);
  if(reader?.classList.contains('single'))comicSyncUrl('page',comicState.page,true);
}

function comicGoPage(delta){
  comicShowPage((comicState.page||1)+delta);
  document.querySelector('.comic-page.current')?.scrollIntoView({block:'start',behavior:'smooth'});
}

function comicPreload(page){
  comicState.images.slice(page,page+3).forEach(src=>{const im=new Image();im.src=src});
}

function comicImageRetry(btn){
  const img=btn.parentElement.querySelector('img');
  if(!img)return;
  const original=img.dataset.src||img.src;
  const proxied=API+'/komik/image?url='+encodeURIComponent(original);
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
  const gen=view('loadComicReader',[url,startPage]);
  comicShowSkeleton(gen,true);
  try{
    const d=await api(`/komik/reader?url=${encodeURIComponent(url)}`);
    const r=d.data||{};
    if(stale(gen))return;
    const imgs=r.images||[];
    comicState.readerUrl=url;
    comicState.series=r.series||comicState.url;
    comicState.images=imgs.map(im=>im.url);
    const saved=comicHistory().find(x=>x.url===url);
    const initial=Math.max(1,Math.min(imgs.length||1,Number(startPage)||Number(saved?.page)||1));
    const settings=comicReaderSettings();
    const width=Number(settings.width)||820;
    const mode=settings.mode||'vertical';
    const pages=imgs.map((im,i)=>`<figure class="comic-page${i===initial-1?' current':''}" data-page="${i+1}" id="comic-page-${i+1}"><img data-src="${esc(im.url)}" src="${esc(im.url)}" alt="Halaman ${im.page||i+1}" loading="${i<3?'eager':'lazy'}" decoding="async" onerror="this.classList.add('hidden');this.nextElementSibling.classList.remove('hidden')"><button class="comic-image-error hidden" onclick="comicImageRetry(this)">Gambar gagal dimuat. Coba lagi</button><figcaption>${im.page||i+1} / ${im.total||imgs.length}</figcaption></figure>`).join('');
    document.title=`${r.title||'Baca Komik'} · NanoStream`;
    setView(gen,`
      <section class="section comic-reader-head">
        <button class="btn btn-secondary" onclick="comicBack()">&#8592; Kembali</button>
        <h2>${esc(r.title||'Reader Komik')}</h2>
        <span class="reader-count">${imgs.length} halaman</span>
      </section>
      <div class="comic-reader-tools">
        <div class="comic-tool-group"><button class="comic-mode${mode!=='single'?' active':''}" data-mode="vertical" onclick="comicSetMode('vertical')">Vertikal</button><button class="comic-mode${mode==='single'?' active':''}" data-mode="single" onclick="comicSetMode('single')">Per Halaman</button></div>
        <div class="comic-tool-group"><button class="comic-width${width===640?' active':''}" data-width="640" onclick="comicSetWidth(640)">Sempit</button><button class="comic-width${width===820?' active':''}" data-width="820" onclick="comicSetWidth(820)">Sedang</button><button class="comic-width${width===1100?' active':''}" data-width="1100" onclick="comicSetWidth(1100)">Lebar</button></div>
        <div class="comic-page-control"><button class="btn btn-secondary" onclick="comicGoPage(-1)">&#8592;</button><span>Hal <b id="comicPageCurrent">${initial}</b> / ${imgs.length}</span><input id="comicPageRange" type="range" min="1" max="${Math.max(imgs.length,1)}" value="${initial}" oninput="comicShowPage(this.value)" aria-label="Pilih halaman"><button class="btn btn-secondary" onclick="comicGoPage(1)">&#8594;</button></div>
      </div>
      ${imgs.length?`<div class="comic-reader${mode==='single'?' single':''}" style="--comic-width:${width}px">${pages}</div>`:'<div class="empty">Halaman komik tidak ditemukan.</div>'}
      <div class="comic-reader-nav">
        ${r.prev?`<button class="btn btn-secondary" data-url="${esc(r.prev)}" onclick="loadComicReader(this.dataset.url)">&#8592; Chapter Sebelumnya</button>`:'<span></span>'}
        ${r.next?`<button class="btn btn-primary" data-url="${esc(r.next)}" onclick="loadComicReader(this.dataset.url)">Chapter Berikutnya &#8594;</button>`:'<span></span>'}
      </div>`);
    comicShowPage(initial);
    comicWatchPages();
    comicPreload(initial);
    requestAnimationFrame(()=>document.getElementById(`comic-page-${initial}`)?.scrollIntoView({block:'start'}));
  }catch(e){comicError(gen,e)}
}

function comicBack(){
  if(comicState.series||comicState.url)return loadComicDetail(comicState.series||comicState.url);
  loadComicHome();
}

document.addEventListener('keydown',e=>{
  if(!document.querySelector('.comic-reader.single'))return;
  if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
  if(e.key==='ArrowRight')comicGoPage(1);
  if(e.key==='ArrowLeft')comicGoPage(-1);
});
