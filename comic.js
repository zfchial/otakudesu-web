const comicState={url:'',title:'',cover:'',chapters:[],page:0,series:'',readerUrl:''};

function comicImg(src,title){
  if(!src)return fallback;
  return `<img src="${esc(src)}" alt="${esc(title||'')}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${fallback}'">`;
}

function comicCard(c){
  const chapters=(c.chapters||[]).slice(0,3);
  const ug=[...new Set((c.genres||[]).filter(Boolean))];
  const gs=ug.length>1?ug.slice(0,3).map(g=>`<span class="comic-card-genre">${esc(g)}</span>`).join(''):'';
  const kind=c.kind?`<span class="comic-card-kind">${esc(c.kind)}</span>`:'';
  const meta=chapters.length?chapters.map(x=>x.title).join(' · '):(ug.length===1?ug[0]:'Detail & Daftar Chapter');
  return `<article class="card comic-card" data-url="${esc(c.url||'')}" onclick="loadComicDetail(this.dataset.url)">
    <div class="poster">${comicImg(c.cover,c.title)}<span class="poster-badge">Komik</span>${kind}</div>
    <div class="card-body">
      <div class="card-title">${esc(c.title||'')}</div>
      <div class="meta">${esc(meta)}</div>
      ${gs?`<div class="comic-card-genres">${gs}</div>`:''}
    </div>
  </article>`;
}

function comicGenreChips(list,active){
  return `<div class="comic-genres">${(list||[]).map(g=>`<button class="comic-genre${g.slug===active?' active':''}" data-slug="${esc(g.slug)}" onclick="loadComicGenre(this.dataset.slug)">${esc(g.name)}</button>`).join('')}</div>`;
}

async function loadComicGenre(slug,page){
  if(!slug)return;
  page=page||1;
  const gen=view('loadComicGenre',[slug,page]);
  try{
    const d=await api(`/komik/genre?slug=${encodeURIComponent(slug)}&page=${page}`);
    const items=(d.data&&d.data.items)||[];
    const gd=await api('/komik/genres').catch(()=>({data:{genres:[]}}));
    const all=(gd.data&&gd.data.genres)||[];
    const label=(all.find(g=>g.slug===slug)||{}).name||slug.replace(/-/g,' ');
    setView(gen,`<section class="section">
      ${head(`Genre ${esc(label)}`,`${items.length} judul di halaman ${page}`,'loadComicHome()')}
      <div class="comic-search-bar">
        <input id="comicSearchInput" type="search" placeholder="Cari judul komik..." onkeydown="if(event.key==='Enter')loadComicSearch()">
        <button class="btn btn-primary" onclick="loadComicSearch()">Cari Komik</button>
      </div>
      ${comicGenreChips(all,slug)}
      ${items.length?`<div class="grid">${items.map(comicCard).join('')}</div>`:'<div class="empty">Tidak ada komik pada genre ini.</div>'}
      <div class="comic-pager">
        ${page>1?`<button class="btn btn-secondary" onclick="loadComicGenre('${esc(slug)}',${page-1})">&#8592; Sebelumnya</button>`:'<span></span>'}
        ${items.length>=20?`<button class="btn btn-secondary" onclick="loadComicGenre('${esc(slug)}',${page+1})">Berikutnya &#8594;</button>`:'<span></span>'}
      </div>
    </section>`);
  }catch(e){
    setView(gen,`<div class="empty">${esc(e.message)}</div>`);
  }
}

async function loadComicGenres(){
  setActiveNav('comic');
  const gen=view('loadComicGenres');
  try{
    const gd=await api('/komik/genres');
    const genres=(gd.data&&gd.data.genres)||[];
    setView(gen,`<section class="section">
      ${head('Genre Komik',`${genres.length} genre tersedia`,'loadComicHome()')}
      <div class="comic-genres">${genres.map(g=>`<button class="comic-genre" data-slug="${esc(g.slug)}" onclick="loadComicGenre(this.dataset.slug)">${esc(g.name)}</button>`).join('')}</div>
    </section>`);
  }catch(e){
    setView(gen,`<div class="empty">${esc(e.message)}</div>`);
  }
}

async function loadComicHome(){
  setActiveNav('comic');
  const gen=view('loadComicHome');
  try{
    const d=await api('/komik/home');
    const items=(d.data&&d.data.items)||[];
    const gd=await api('/komik/genres').catch(()=>({data:{genres:[]}}));
    const genres=(gd.data&&gd.data.genres)||[];
    setView(gen,`<section class="section">
      ${head('Komik Bahasa Indonesia','Manga, manhwa, dan manhua subtitle Indonesia','loadComicSearch()')}
      <div class="comic-search-bar">
        <input id="comicSearchInput" type="search" placeholder="Cari judul komik..." onkeydown="if(event.key==='Enter')loadComicSearch()">
        <button class="btn btn-primary" onclick="loadComicSearch()">Cari Komik</button>
      </div>
      ${genres.length?`<div class="section-head comic-genre-head"><h2>Genre</h2><a href="#" onclick="loadComicGenres();return false">Semua &#8250;</a></div><div class="comic-genres">${genres.map(g=>`<button class="comic-genre" data-slug="${esc(g.slug)}" onclick="loadComicGenre(this.dataset.slug)">${esc(g.name)}</button>`).join('')}</div>`:''}
      ${items.length?`<div class="grid">${items.map(comicCard).join('')}</div>`:'<div class="empty">Katalog komik belum tersedia.</div>'}
    </section>`);
  }catch(e){
    setView(gen,`<div class="empty">${esc(e.message)}</div>`);
  }
}

async function loadComicSearch(forcedQ){
  const q=(forcedQ??document.getElementById('comicSearchInput')?.value??'').trim();
  if(!q){
    return loadComicHome();
  }
  const gen=view('loadComicSearch',[q]);
  try{
    const d=await api(`/komik/search?q=${encodeURIComponent(q)}`);
    const items=(d.data&&d.data.items)||[];
    setView(gen,`<section class="section">
      ${head(`Komik "${esc(q)}"`,`${items.length} judul ditemukan`,'loadComicHome()')}
      <div class="comic-search-bar">
        <input id="comicSearchInput" type="search" value="${esc(q)}" placeholder="Cari judul komik..." onkeydown="if(event.key==='Enter')loadComicSearch()">
        <button class="btn btn-primary" onclick="loadComicSearch()">Cari Komik</button>
      </div>
      ${items.length?`<div class="grid">${items.map(comicCard).join('')}</div>`:'<div class="empty">Tidak ada komik yang cocok.</div>'}
    </section>`);
  }catch(e){
    setView(gen,`<div class="empty">${esc(e.message)}</div>`);
  }
}

async function loadComicDetail(url){
  if(!url)return;
  const gen=view('loadComicDetail',[url]);
  try{
    const d=await api(`/komik/detail?url=${encodeURIComponent(url)}`);
    const c=d.data||{};
    comicState.url=url;
    comicState.title=c.title||'';
    comicState.cover=c.cover||'';
    comicState.chapters=c.chapters||[];
    const genres=(c.genres||[]).map(g=>`<button class="chip comic-genre-chip" data-slug="${esc(g.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''))}" onclick="loadComicGenre(this.dataset.slug)">${esc(g)}</button>`).join('');
    const chapters=c.chapters?.length?`<div class="comic-chapters">${c.chapters.map((ch,i)=>`<a class="comic-chapter" href="#" data-url="${esc(ch.url)}" onclick="loadComicReader(this.dataset.url);return false"><span class="cc-num">${esc(ch.title)}</span><span class="cc-date">${esc(ch.date||'')}</span></a>`).join('')}</div>`:'<div class="empty">Daftar chapter belum tersedia.</div>';
    setView(gen,`
      <section class="detail comic-detail">
        <img class="detail-poster" src="${esc(c.cover||fallback)}" alt="${esc(c.title||'')}" onerror="this.onerror=null;this.src='${fallback}'">
        <div class="detail-main">
          <span class="hero-kicker">Komik</span>
          <h1>${esc(c.title||'Untitled')}</h1>
          <div class="detail-sub">${c.total_chapters||0} chapter tersedia</div>
          ${genres?`<div class="chips">${genres}</div>`:''}
          ${c.description?`<p class="hero-copy">${esc(c.description)}</p>`:''}
          ${c.chapters?.length?`<div class="hero-actions" style="margin:12px 0"><button class="btn btn-primary" data-url="${esc(c.chapters[0].url)}" onclick="loadComicReader(this.dataset.url)">${playIconSvg}<span>Baca Chapter Terbaru</span></button></div>`:''}
        </div>
      </section>
      <section class="section">
        ${head('Daftar Chapter',`${c.total_chapters||0} chapter`)}
        ${chapters}
      </section>`);
  }catch(e){
    setView(gen,`<div class="empty">${esc(e.message)}</div>`);
  }
}

async function loadComicReader(url){
  if(!url)return;
  const gen=view('loadComicReader',[url]);
  try{
    const d=await api(`/komik/reader?url=${encodeURIComponent(url)}`);
    const r=d.data||{};
    const imgs=r.images||[];
    comicState.readerUrl=url;
    const pages=imgs.map((im,i)=>`<figure class="comic-page"><img src="${esc(im.url)}" alt="Halaman ${im.page||i+1}" loading="${i<3?'eager':'lazy'}" decoding="async" onerror="this.onerror=null;this.style.display='none'"><figcaption>${im.page||i+1} / ${im.total||imgs.length}</figcaption></figure>`).join('');
    setView(gen,`
      <section class="section comic-reader-head">
        <button class="btn btn-secondary" onclick="comicBack()">&#8592; Kembali</button>
        <h2>${esc(r.title||'Reader Komik')}</h2>
        <span class="reader-count">${imgs.length} halaman</span>
      </section>
      ${imgs.length?`<div class="comic-reader">${pages}</div>`:'<div class="empty">Halaman komik tidak ditemukan.</div>'}
      <div class="comic-reader-nav">
        ${r.prev?`<button class="btn btn-secondary" data-url="${esc(r.prev)}" onclick="loadComicReader(this.dataset.url)">&#8592; Chapter Sebelumnya</button>`:'<span></span>'}
        ${r.next?`<button class="btn btn-primary" data-url="${esc(r.next)}" onclick="loadComicReader(this.dataset.url)">Chapter Berikutnya &#8594;</button>`:'<span></span>'}
      </div>`);
    const first=document.querySelector('.comic-page img');
    if(first)first.scrollIntoView({block:'start'});
  }catch(e){
    setView(gen,`<div class="empty">${esc(e.message)}</div>`);
  }
}

function comicBack(){
  if(comicState.url)return loadComicDetail(comicState.url);
  loadComicHome();
}
