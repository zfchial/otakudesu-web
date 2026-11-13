const API='https://api.xox.web.id/api';
const content=document.getElementById('content');
const loader=document.getElementById('loading');
let currentAnimeUrl='';
let restoring=false;
let firstView=true;
let renderGen=0;
let deferredInstallPrompt=null;
let authToken=localStorage.getItem('nanostream-token')||'';
let activeSearchSource='otakudesu';
let scheduleDaysCache=[];

const fallback='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 4"><rect width="3" height="4" fill="#18181b"/></svg>');
const playIconSvg='<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
const chevronSvg='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';

function esc(s){
  const d=document.createElement('div');
  d.textContent=s??'';
  return d.innerHTML;
}

function show(h){
  content.innerHTML=h;
  staggerCards();
  const prog=document.getElementById('topProgress');
  if(prog)prog.classList.add('hidden');
}

function staggerCards(){
  const cards=[...content.querySelectorAll('.card')].slice(0,24);
  cards.forEach((c,i)=>{
    c.style.animationDelay=Math.min(i*28,560)+'ms';
  });
}

function wait(v){
  loader.classList.toggle('hidden',!v);
  const prog=document.getElementById('topProgress');
  if(prog)prog.classList.toggle('hidden',!v);
}

function showToast(msg,actionLabel,actionFn){
  const t=document.getElementById('toast');
  if(!t)return;
  t.innerHTML=`<span>${esc(msg)}</span>${actionLabel?`<button id="toastAct">${esc(actionLabel)}</button>`:''}`;
  t.classList.remove('hidden');
  if(actionLabel&&actionFn){
    document.getElementById('toastAct').onclick=()=>{t.classList.add('hidden');actionFn()};
  }else{
    setTimeout(()=>t.classList.add('hidden'),3200);
  }
}

function setActiveNav(key){
  document.querySelectorAll('[data-nav]').forEach(a=>{
    a.classList.toggle('active',a.dataset.nav===key);
  });
  document.querySelectorAll('[data-pill]').forEach(b=>{
    b.classList.toggle('active',b.dataset.pill===key);
  });
  document.querySelectorAll('[data-bnav]').forEach(b=>{
    b.classList.toggle('active',b.dataset.bnav===key);
  });
}

function navClick(key,fn){
  closeSearchSheet();
  setActiveNav(key);
  scrollTo(0,0);
  fn();
}

function syncSearchSource(src){
  activeSearchSource=src||'otakudesu';
  const sel=document.getElementById('searchSource');
  if(sel&&sel.value!==activeSearchSource)sel.value=activeSearchSource;
  document.querySelectorAll('[data-src]').forEach(b=>{
    b.classList.toggle('active',b.dataset.src===activeSearchSource);
  });
}

let anibiAvailable=false;

function applyAnibiAvailability(ok){
  anibiAvailable=!!ok;
  document.querySelectorAll('[data-needs-anibi]').forEach(el=>{
    el.classList.toggle('hidden',!anibiAvailable);
  });
  const opt=document.querySelector('#searchSource option[value="anibi"]');
  if(opt)opt.hidden=!anibiAvailable;
  const fs=document.getElementById('footerSources');
  if(fs)fs.textContent=anibiAvailable?'OtakuDesu · Samehadaku · Anibiplay':'OtakuDesu · Samehadaku';
  if(!anibiAvailable&&activeSearchSource==='anibi')syncSearchSource('otakudesu');
}

async function syncAnibiAvailability(){
  try{
    const r=await fetch(API+'/anibi/health');
    const d=await r.json();
    applyAnibiAvailability(d&&d.ok===true&&d.api_key===true);
  }catch(e){
    applyAnibiAvailability(false);
  }
}

function openSearchSheet(){
  const sheet=document.getElementById('searchSheet');
  if(!sheet)return;
  sheet.classList.remove('hidden');
  document.getElementById('searchBackdrop')?.classList.remove('hidden');
  setActiveNav('search');
  const inp=document.getElementById('mobileSearchInput');
  if(inp)setTimeout(()=>inp.focus(),40);
}

function quickSearch(q){
  const inp=document.getElementById('mobileSearchInput');
  if(inp)inp.value=q;
  const desk=document.getElementById('searchInput');
  if(desk)desk.value=q;
  closeSearchSheet();
  setActiveNav('');
  if(activeSearchSource==='samehadaku')return shSearch(q);
  if(activeSearchSource==='anibi')return anibiSearch(q);
  return doSearch(q);
}

function closeSearchSheet(restoreKey='home'){
  const sheet=document.getElementById('searchSheet');
  document.getElementById('searchBackdrop')?.classList.add('hidden');
  if(sheet&&!sheet.classList.contains('hidden')){
    sheet.classList.add('hidden');
    if(restoreKey)setActiveNav(restoreKey);
  }
}

function mobileSearchGo(){
  const q=document.getElementById('mobileSearchInput')?.value.trim();
  if(!q)return;
  const desk=document.getElementById('searchInput');
  if(desk)desk.value=q;
  closeSearchSheet();
  setActiveNav('');
  if(activeSearchSource==='samehadaku')return shSearch(q);
  if(activeSearchSource==='anibi')return anibiSearch(q);
  return doSearch(q);
}

function view(name,args=[]){
  renderGen++;
  const state={nanostream:true,name,args};
  if(restoring)return renderGen;
  if(firstView){
    history.replaceState(state,'',location.href);
    firstView=false;
  }else{
    history.pushState(state,'',location.href);
  }
  return renderGen;
}

function stale(gen){return gen!==renderGen}
function setView(gen,html){if(!stale(gen))show(html)}

function restore(state){
  if(!state?.nanostream)return;
  restoring=true;
  closeSearchSheet();
  const fn=window[state.name];
  if(typeof fn==='function')fn(...(state.args||[]));
  restoring=false;
}
window.addEventListener('popstate',e=>restore(e.state));

async function api(path,retry=1){
  wait(true);
  try{
    for(let i=0;;i++){
      try{
        const r=await fetch(API+path);
        const d=await r.json();
        if(!d.ok)throw Error(d.error||`API ${r.status}`);
        return d;
      }catch(e){
        if(i>=retry||/\b(401|403|404)\b/.test(e.message))throw e;
        await new Promise(r=>setTimeout(r,1200));
      }
    }
  }finally{
    wait(false);
  }
}

function applyTheme(t){
  document.documentElement.dataset.theme=t;
  const meta=document.getElementById('metaThemeColor');
  if(meta)meta.setAttribute('content',t==='light'?'#f8fafc':'#09090b');
}

function toggleTheme(){
  const cur=document.documentElement.dataset.theme||'dark';
  const next=cur==='dark'?'light':'dark';
  localStorage.setItem('nanostream-theme',next);
  applyTheme(next);
}

function updateAccount(){
  const el=document.getElementById('account-label');
  const name=localStorage.getItem('nanostream-user')||'';
  if(el)el.textContent=name||(authToken?'Akun':'Login');
}

function accountAction(){
  closeSearchSheet();
  loadAccount();
}

function authHeaders(){
  return authToken?{Authorization:`Bearer ${authToken}`}:{};
}

async function authApi(path,method='GET',body){
  const r=await fetch(API+path,{
    method,
    headers:{'Content-Type':'application/json',...authHeaders()},
    body:body?JSON.stringify(body):undefined
  });
  if(r.status===401){
    authToken='';
    localStorage.removeItem('nanostream-token');
    localStorage.removeItem('nanostream-user');
    updateAccount();
    showAuth();
    throw Error('Sesi berakhir, silakan login ulang');
  }
  const d=await r.json();
  if(!d.ok)throw Error(d.error||'Request gagal');
  return d;
}

function authCard(mode='login'){
  const reg=mode==='register';
  return `<section class="auth-shell">
    <div class="auth-art">
      <div class="auth-art-top">
        <span class="auth-kicker">NANOSTREAM ACCOUNT</span>
        <h1>Simpan daftar tontonan di <em>NanoStream</em>.</h1>
        <p>Sinkronkan Daftar Saya dan lanjutkan episode terakhir lintas perangkat.</p>
      </div>
      <ul class="auth-points">
        <li><span class="auth-point-icon">${playIconSvg}</span><span>Daftar Saya tersimpan otomatis</span></li>
        <li><span class="auth-point-icon">${playIconSvg}</span><span>Riwayat episode dan posisi tonton</span></li>
        <li><span class="auth-point-icon">${playIconSvg}</span><span>Sinkronisasi cloud antar perangkat</span></li>
      </ul>
    </div>
    <div class="auth-form">
      <div class="auth-tabs" role="tablist">
        <button class="auth-tab${!reg?' active':''}" onclick="switchAuthMode('login')" role="tab">Masuk</button>
        <button class="auth-tab${reg?' active':''}" onclick="switchAuthMode('register')" role="tab">Daftar</button>
      </div>
      <span class="auth-form-kicker">${reg?'BUAT AKUN':'SELAMAT DATANG KEMBALI'}</span>
      <h2>${reg?'Daftar akun NanoStream':'Masuk ke NanoStream'}</h2>
      <p class="auth-lead">${reg?'Buat akun untuk menyimpan koleksi dan riwayat tontonan.':'Masukkan username dan password akunmu.'}</p>
      <label>Username<input id="authUser" autocomplete="username" placeholder="contoh: nanofan" value="${esc(localStorage.getItem('nanostream-user')||'')}"></label>
      <label>Password<input id="authPass" type="password" autocomplete="${reg?'new-password':'current-password'}" placeholder="Minimal 6 karakter"></label>
      <p id="authMsg" class="auth-msg"></p>
      <button class="btn btn-primary auth-submit" onclick="${reg?'registerUser()':'loginUser()'}"><span>${reg?'Buat Akun':'Masuk Sekarang'}</span><span>&rarr;</span></button>
      <p class="auth-switch">${reg?'Sudah punya akun?':'Belum punya akun?'} <button class="auth-link" onclick="switchAuthMode('${reg?'login':'register'}')">${reg?'Masuk di sini':'Daftar akun baru'}</button></p>
    </div>
  </section>`;
}

let authMode='login';

function switchAuthMode(mode){
  authMode=mode;
  show(authCard(mode));
}

function showAuth(){
  setActiveNav('');
  show(authCard(authMode));
}

function avatarInitial(name){
  const s=(name||'?').trim();
  return (s[0]||'?').toUpperCase();
}

function formatDuration(sec){
  sec=Number(sec||0);
  if(sec<60)return `${sec} detik`;
  const h=Math.floor(sec/3600);
  const m=Math.floor((sec%3600)/60);
  if(!h)return `${m} menit`;
  return `${h} jam ${m} menit`;
}

async function loadAccount(){
  if(!authToken){
    setActiveNav('');
    showAuth();
    return;
  }
  setActiveNav('account');
  const gen=view('loadAccount');
  try{
    const [p,b,h]=await Promise.all([authApi('/profile'),authApi('/bookmarks'),authApi('/history')]);
    const d=p.data||{};
    const name=d.username||localStorage.getItem('nanostream-user')||'Pengguna';
    localStorage.setItem('nanostream-user',name);
    updateAccount();
    const joined=d.joined_at?String(d.joined_at).slice(0,10):'-';
    const total=d.total_watch_seconds||0;
    setView(gen,`<section class="acc-page">
      <div class="acc-hero">
        <div class="acc-avatar">${esc(avatarInitial(name))}</div>
        <div class="acc-hero-info">
          <span class="acc-kicker">PROFIL PENONTON</span>
          <h1>${esc(name)}</h1>
          <p>Bergabung sejak ${esc(joined)}</p>
        </div>
        <div class="acc-hero-actions">
          <button class="btn btn-secondary" onclick="logoutNow()">Keluar</button>
        </div>
      </div>
      <div class="acc-stats">
        <div class="acc-stat"><span class="acc-stat-value">${Number(d.bookmarks_count||0)}</span><span class="acc-stat-label">Disimpan</span></div>
        <div class="acc-stat"><span class="acc-stat-value">${Number(d.history_count||0)}</span><span class="acc-stat-label">Riwayat</span></div>
        <div class="acc-stat"><span class="acc-stat-value">${esc(formatDuration(total))}</span><span class="acc-stat-label">Waktu tonton</span></div>
      </div>
      <div class="acc-tabs" role="tablist">
        <button class="acc-tab active" onclick="accTab(this,'acc-collections')">Koleksi</button>
        <button class="acc-tab" onclick="accTab(this,'acc-history')">Riwayat</button>
      </div>
      <div id="acc-collections" class="acc-panel">${accCollections((b.data||[]))}</div>
      <div id="acc-history" class="acc-panel hidden">${accHistoryList((h.data||[]))}</div>
    </section>`);
  }catch(e){
    setView(gen,`<div class="empty">${esc(e.message)}</div>`);
  }
}

function accTab(btn,id){
  document.querySelectorAll('.acc-tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.acc-panel').forEach(p=>p.classList.add('hidden'));
  document.getElementById(id)?.classList.remove('hidden');
}

function accCollections(items){
  if(!items.length)return '<div class="empty">Belum ada judul tersimpan. Tekan tombol simpan pada anime untuk menambahkannya.</div>';
  return `<div class="grid">${items.map(x=>card({title:x.title,url:x.anime_url,image:x.image,type:'Tersimpan'},'ongoing','otakudesu')).join('')}</div>`;
}

function accHistoryList(items){
  if(!items.length)return '<div class="empty">Belum ada riwayat tontonan.</div>';
  return `<div class="history-list">${items.map(x=>`<article class="history-item">
      <div class="history-item-main">
        <strong>${esc(x.title)}</strong>
        <small>${esc(x.episode||'Episode')} &middot; ${formatTime(x.position_seconds)}${x.duration_seconds?' / '+formatTime(x.duration_seconds):''}${x.watch_seconds?` &middot; Ditonton ${formatDuration(x.watch_seconds)}`:''}</small>
      </div>
      <button class="btn btn-primary" data-url="${esc(x.episode_url)}" onclick="loadEpisode(this.dataset.url)">${playIconSvg}<span>Lanjut</span></button>
    </article>`).join('')}</div>`;
}

async function loginUser(){
  try{
    const d=await authApi('/auth/login','POST',{
      username:document.getElementById('authUser').value.trim(),
      password:document.getElementById('authPass').value
    });
    authToken=d.token;
    localStorage.setItem('nanostream-token',authToken);
    localStorage.setItem('nanostream-user',document.getElementById('authUser').value.trim());
    updateAccount();
    showToast('Berhasil masuk');
    loadAccount();
  }catch(e){
    document.getElementById('authMsg').textContent=e.message;
  }
}

async function registerUser(){
  try{
    const d=await authApi('/auth/register','POST',{
      username:document.getElementById('authUser').value.trim(),
      password:document.getElementById('authPass').value
    });
    authToken=d.token;
    localStorage.setItem('nanostream-token',authToken);
    localStorage.setItem('nanostream-user',document.getElementById('authUser').value.trim());
    updateAccount();
    showToast('Akun berhasil dibuat');
    loadAccount();
  }catch(e){
    document.getElementById('authMsg').textContent=e.message;
  }
}

function logoutNow(){
  authToken='';
  localStorage.removeItem('nanostream-token');
  localStorage.removeItem('nanostream-user');
  updateAccount();
  showToast('Berhasil keluar dari akun');
  loadHome();
}

function requireAuth(){
  if(!authToken){showAuth();return false}
  return true;
}

async function addBookmark(btn){
  if(!requireAuth())return;
  try{
    await authApi('/bookmarks','POST',{
      anime_url:btn.dataset.url,
      title:btn.dataset.title,
      image:btn.dataset.image
    });
    btn.textContent='✓ Di Daftar Saya';
    showToast('Ditambahkan ke Daftar Saya');
  }catch(e){
    showToast(e.message);
  }
}

function formatTime(sec){
  sec=Number(sec||0);
  return `${Math.floor(sec/60)}:${String(Math.floor(sec%60)).padStart(2,'0')}`;
}

async function loadBookmarks(){
  setActiveNav('bookmarks');
  if(!requireAuth())return;
  const gen=view('loadBookmarks');
  try{
    const d=await authApi('/bookmarks');
    const items=(d.data||[]).map(x=>({title:x.title,url:x.anime_url,image:x.image,episode:'Tersimpan'}));
    setView(gen,`<section class="section">${head('Daftar Saya',`${items.length} judul tersimpan`)}${grid(items,'ongoing')}</section>`);
  }catch(e){
    setView(gen,`<div class="empty">${esc(e.message)}</div>`);
  }
}

async function loadHistory(){
  setActiveNav('history');
  if(!requireAuth())return;
  const gen=view('loadHistory');
  try{
    const d=await authApi('/history');
    const items=(d.data||[]).map(x=>`<article class="history-item">
      <div>
        <strong>${esc(x.title)}</strong>
        <small>${esc(x.episode||'Episode')} &middot; ${formatTime(x.position_seconds)}${x.duration_seconds?' / '+formatTime(x.duration_seconds):''}${x.watch_seconds?` &middot; Ditonton ${formatDuration(x.watch_seconds)}`:''}</small>
      </div>
      <button class="btn btn-primary" data-url="${esc(x.episode_url)}" onclick="loadEpisode(this.dataset.url)">${playIconSvg}<span>Lanjut</span></button>
    </article>`).join('');
    setView(gen,`<section class="section">
      <div class="section-head">
        <h2>Riwayat Tontonan</h2>
        <p>Lanjutkan dari posisi terakhir</p>
        <div class="history-head-actions">
          <button class="btn btn-secondary" onclick="logoutNow()">Logout</button>
        </div>
      </div>
      ${items?`<div class="history-list">${items}</div>`:'<div class="empty">Belum ada riwayat tontonan.</div>'}
    </section>`);
  }catch(e){
    setView(gen,`<div class="empty">${esc(e.message)}</div>`);
  }
}

let watchAcc=0;
let watchSent=0;
let watchTimer=null;

async function saveHistory(data){
  if(!authToken||!data||!data.episode_url)return;
  try{await authApi('/history','POST',data)}catch{}
}

function historyPayload(extra){
  const base=window.currentWatch||{};
  return {...base,...(extra||{})};
}

function flushWatch(extra){
  const delta=watchAcc-watchSent;
  if(delta<=0&&!extra)return;
  watchSent=watchAcc;
  saveHistory(historyPayload({watch_seconds:Math.floor(delta),...(extra||{})}));
}

function resetWatch(){
  watchAcc=0;
  watchSent=0;
  nativePlayerActive=false;
  if(watchTimer){clearInterval(watchTimer);watchTimer=null;}
}

async function lookupHistoryPosition(episodeUrl){
  if(!authToken||!episodeUrl)return null;
  try{
    const d=await authApi('/history');
    const items=d.data||[];
    const hit=items.find(x=>x.episode_url===episodeUrl);
    return hit?{position:Number(hit.position_seconds||0),duration:Number(hit.duration_seconds||0),watch:Number(hit.watch_seconds||0)}:null;
  }catch(e){
    return null;
  }
}

function trackNativePlayer(v){
  let last=Number(v.currentTime||0);
  const resync=()=>{
    last=Number(v.currentTime||0);
  };
  v.addEventListener('seeking',resync);
  v.addEventListener('seeked',resync);
  v.addEventListener('ratechange',resync);
  v.addEventListener('pause',()=>{
    flushWatch({position_seconds:Math.floor(v.currentTime),duration_seconds:Number.isFinite(v.duration)?Math.floor(v.duration):null});
  });
  v.addEventListener('ended',()=>{
    flushWatch({position_seconds:Math.floor(v.duration||v.currentTime),duration_seconds:Number.isFinite(v.duration)?Math.floor(v.duration):null});
  });
  v.addEventListener('timeupdate',()=>{
    const pos=Number(v.currentTime||0);
    const dur=Number.isFinite(v.duration)&&v.duration>0?Math.floor(v.duration):null;
    const delta=pos-last;
    if(delta>0&&delta<=4)watchAcc+=delta;
    last=pos;
    window.currentWatch=window.currentWatch||{};
    window.currentWatch.position_seconds=Math.floor(pos);
    window.currentWatch.duration_seconds=dur;
    if(watchAcc-watchSent>=8){
      flushWatch({position_seconds:Math.floor(pos),duration_seconds:dur});
    }
  });
  const originalPlay=v.play.bind(v);
  v.play=()=>{
    last=Number(v.currentTime||0);
    return originalPlay();
  };
}

let nativePlayerActive=false;

function trackPassiveWatch(){
  if(watchTimer)clearInterval(watchTimer);
  watchTimer=setInterval(()=>{
    if(nativePlayerActive)return;
    if(document.visibilityState==='visible'&&window.currentWatch&&window.currentWatch.episode_url){
      watchAcc+=10;
      if(watchAcc-watchSent>=20)flushWatch();
    }
  },10000);
}

async function upgradePlayer(embedUrl){
  const frame=document.getElementById('player');
  if(!frame||!embedUrl)return;
  const src=frame.querySelector('iframe')?.src||embedUrl;
  try{
    const d=await api(`/stream/resolve?url=${encodeURIComponent(src)}`);
    const m=d.data||{};
    if(!m.media_url)return;
    const v=document.createElement('video');
    v.controls=true;
    v.playsInline=true;
    v.preload='metadata';
    v.className='native-video';
    const proxied=`${API}/stream/proxy?url=${encodeURIComponent(m.media_url)}`;
    v.src=proxied;
    frame.innerHTML='';
    frame.appendChild(v);
    nativePlayerActive=true;
    const saved=await lookupHistoryPosition(window.currentWatch&&window.currentWatch.episode_url);
    if(saved&&saved.position>2){
      v.addEventListener('loadedmetadata',()=>{
        try{v.currentTime=Math.min(saved.position,(v.duration||saved.position)-1);}catch(e){}
      },{once:true});
    }
    trackNativePlayer(v);
  }catch(e){
    nativePlayerActive=false;
    trackPassiveWatch();
  }
}

function imgUrl(src){
  if(!src)return fallback;
  return src.startsWith('https://otakudesu.blog')?`${API}/image?url=${encodeURIComponent(src)}`:src;
}

function img(src,title){
  const u=imgUrl(src);
  return `<img src="${esc(u)}" alt="${esc(title||'')}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${fallback}'">`;
}

function cleanTitle(s){
  return String(s||'').replace(/\s*(Subtitle Indonesia|Sub\s*Indo)\s*$/i,'').trim();
}

function head(title,sub='',more=''){
  return `<div class="section-head"><h2>${title}</h2>${sub?`<p>${sub}</p>`:''}${more?`<a href="#" onclick="${more};return false">Semua &#8250;</a>`:''}</div>`;
}

function cardMeta(a,type){
  if(type==='complete'){
    return `<span class="rating">&#9733; ${esc(a.rating||a.info||'—')}</span>`+(a.date||a.type?` &middot; ${esc(a.date||a.type)}`:'');
  }
  const parts=[a.day,a.date,a.type].filter(Boolean);
  return parts.length?esc(parts.join(' · ')):`<span class="rating">&#9733; ${esc(a.rating||a.info||'—')}</span>`;
}

function card(a,type='ongoing',kind='otakudesu',rankNum=0){
  const badge=type==='complete'?(a.episodes||a.info||'Complete'):(a.episode||a.info||'Ongoing');
  const title=cleanTitle(a.title);
  return `<article class="card${rankNum?' rank-card':''}" data-url="${esc(a.url||'')}" data-kind="${esc(kind)}" data-slug="${esc(a.slug||'')}" onclick="cardGo(this)">
    <div class="poster">${img(a.image,title)}<span class="poster-badge">${esc(badge)}</span>${rankNum?`<span class="rank-badge">TOP ${rankNum}</span>`:''}</div>
    <div class="card-body">
      <div class="card-title">${esc(title)}</div>
      <div class="meta">${cardMeta(a,type)}</div>
    </div>
  </article>`;
}

function cardGo(el){
  const k=el.dataset.kind;
  if(k==='samehadaku')return loadSamehadakuAnime(el.dataset.url);
  if(k==='samehadaku-ep')return loadSamehadakuEpisode(el.dataset.url);
  if(k==='anibi')return loadAnibiDetail(el.dataset.slug);
  loadDetail(el.dataset.url);
}

function rail(items,type,kind='otakudesu',withRank=false){
  return items?.length?`<div class="rail">${items.map((a,idx)=>card(a,type,kind,withRank&&idx<5?idx+1:0)).join('')}</div>`:'<div class="empty">Belum ada anime untuk ditampilkan.</div>';
}

function grid(items,type,kind='otakudesu'){
  return items?.length?`<div class="grid">${items.map(a=>card(a,type,kind)).join('')}</div>`:'<div class="empty">Belum ada anime untuk ditampilkan.</div>';
}

async function loadHome(){
  setActiveNav('home');
  const gen=view('loadHome');
  try{
    const [o,c]=await Promise.all([api('/ongoing?page=1'),api('/complete?page=1')]);
    const hero=o.data&&o.data[0];
    const ongoingList=o.data||[];
    const completeList=c.data||[];
    const railOngoing=(ongoingList.length>1?ongoingList.slice(1,13):ongoingList.slice(0,12));
    setView(gen,`
      ${hero?`<section class="hero">
        <div class="hero-body">
          <span class="hero-kicker">Unggulan Hari Ini</span>
          <h1>${esc(cleanTitle(hero.title||'Streaming anime favoritmu'))}</h1>
          <div class="hero-tags">
            <span class="tag-box">HD</span>
            <span class="tag-box">SUB ID</span>
            <span>${esc(hero.episode||'Ongoing')}${hero.day?` &middot; ${esc(hero.day)}`:''}</span>
          </div>
          <p class="hero-copy">Streaming anime subtitle Indonesia dari katalog OtakuDesu dan Samehadaku${anibiAvailable?', dan Anibiplay':''} dalam satu antarmuka bersih tanpa gangguan.</p>
          <div class="hero-actions">
            <button class="btn btn-primary" data-url="${esc(hero.url||'')}" onclick="loadDetail(this.dataset.url)">${playIconSvg}<span>Putar</span></button>
            <button class="btn btn-secondary" data-url="${esc(hero.url||'')}" data-title="${esc(cleanTitle(hero.title||'Anime'))}" data-image="${esc(hero.image||'')}" onclick="addBookmark(this)">+ Daftar Saya</button>
            <button class="btn btn-secondary btn-hide-mobile" onclick="navClick('samehadaku',loadSamehadakuHome)">Mirror Samehadaku</button>
          </div>
        </div>
        ${hero.image?`<div class="hero-media">${img(hero.image,hero.title)}</div>`:''}
      </section>`:''}
      <section class="section">${head('Top 10 & Sedang Tayang','Episode terbaru setiap minggu',"navClick('ongoing',()=>loadOngoing(1))")}${rail(railOngoing,'ongoing','otakudesu',true)}</section>
      <section class="section">${head('Serial Tamat Siap Maraton','Tonton full episode sampai selesai',"navClick('complete',()=>loadComplete(1))")}${rail(completeList.slice(0,12),'complete','otakudesu',false)}</section>
      <section class="section">${head('Rilisan Terbaru Minggu Ini','Katalog lengkap ongoing',"navClick('ongoing',()=>loadOngoing(1))")}${grid(ongoingList.slice(0,12),'ongoing')}</section>`);
  }catch(e){
    setView(gen,`<div class="empty">${esc(e.message)}</div>`);
  }
}

function pageButtons(page,fn,hasNext=true,args=''){
  const call=n=>`${fn}(${args?`${args},`:''}${n})`;
  return `<div class="pagination">
    <button class="page-btn" ${page<2?'disabled':`onclick="${call(page-1)}"`}>&larr; Sebelumnya</button>
    <button class="page-btn" ${hasNext?`onclick="${call(page+1)}"`:'disabled'}>Berikutnya &rarr;</button>
  </div>`;
}

async function loadOngoing(page=1){
  setActiveNav('ongoing');
  const gen=view('loadOngoing',[page]);
  try{
    const d=await api(`/ongoing?page=${page}`);
    setView(gen,`<section class="section">${head('Ongoing Anime',`Halaman ${page}`)}${grid(d.data,'ongoing')}${pageButtons(page,'loadOngoing',d.data?.length>0)}</section>`);
    scrollTo(0,0);
  }catch(e){
    setView(gen,`<div class="empty">${esc(e.message)}</div>`);
  }
}

async function loadComplete(page=1){
  setActiveNav('complete');
  const gen=view('loadComplete',[page]);
  try{
    const d=await api(`/complete?page=${page}`);
    setView(gen,`<section class="section">${head('Complete Anime',`Halaman ${page}`)}${grid(d.data,'complete')}${pageButtons(page,'loadComplete',d.data?.length>0)}</section>`);
    scrollTo(0,0);
  }catch(e){
    setView(gen,`<div class="empty">${esc(e.message)}</div>`);
  }
}

async function loadGenres(){
  setActiveNav('genres');
  const gen=view('loadGenres');
  try{
    const d=await api('/genres');
    const list=d.data||[];
    const groups=[
      {title:'Populer', slugs:['action','adventure','fantasy','comedy','romance']},
      {title:'Cerita & Nuansa', slugs:['drama','mystery','psychological','historical','horror']},
      {title:'Petualangan & Aksi', slugs:['adventure','martial-arts','military','police','samurai']},
      {title:'Sains & Fantasi', slugs:['sci-fi','mecha','magic','demons','supernatural']},
      {title:'Gaya Hidup', slugs:['school','slice-of-life','sports','music','game']},
      {title:'Lainnya', slugs:[]}
    ];
    const bySlug=new Map(list.map(g=>[g.slug,g]));
    const used=new Set();
    const sections=[];
    for(const grp of groups){
      let items=grp.slugs.map(s=>bySlug.get(s)).filter(g=>g&&!used.has(g.slug));
      items.forEach(g=>used.add(g.slug));
      if(grp.title==='Lainnya'){
        const rest=list.filter(g=>!used.has(g.slug));
        if(!rest.length)continue;
        sections.push({title:grp.title,items:rest});
        continue;
      }
      if(!items.length)continue;
      sections.push({title:grp.title,items});
    }
    const cardHtml=g=>`<a class="genre-card" href="#" data-slug="${esc(g.slug)}" onclick="loadGenre(this.dataset.slug,1);return false"><span>${esc(g.name)}</span>${chevronSvg}</a>`;
    setView(gen,`<div class="genre-shell">
      <div class="genre-intro">
        <span class="hero-kicker">Koleksi</span>
        <h2>Jelajahi ${list.length} Genre Anime</h2>
        <p>Pilih genre untuk melihat seluruh judul di dalamnya. Semua Judul diurutkan dari yang paling baru.</p>
      </div>
      <div class="genre-groups">
        ${sections.map(sec=>`<section class="genre-group">
          <h3 class="genre-group-title">${esc(sec.title)}</h3>
          <div class="genre-menu">${sec.items.map(cardHtml).join('')}</div>
        </section>`).join('')}
      </div>
    </div>`);
  }catch(e){
    setView(gen,`<div class="empty">${esc(e.message)}</div>`);
  }
}

async function loadGenre(slug,page=1){
  setActiveNav('genres');
  const gen=view('loadGenre',[slug,page]);
  try{
    const d=await api(`/genre/${encodeURIComponent(slug)}?page=${page}`);
    const title=`Genre: ${slug.charAt(0).toUpperCase()+slug.slice(1)}`;
    setView(gen,`<section class="section">${head(esc(title),`Halaman ${page}`,'loadGenres()')}${grid(d.data,'ongoing')}${pageButtons(page,'loadGenre',d.has_next,`'${esc(slug)}'`)}</section>`);
    scrollTo(0,0);
  }catch(e){
    setView(gen,`<div class="empty">${esc(e.message)}</div>`);
  }
}

function searchGo(){
  const s=document.getElementById('searchSource');
  const v=s?s.value:activeSearchSource;
  syncSearchSource(v);
  setActiveNav('');
  if(v==='samehadaku')return shSearch();
  if(v==='anibi')return anibiSearch();
  return doSearch();
}

async function doSearch(forcedQ){
  const q=(forcedQ??document.getElementById('searchInput').value).trim();
  if(!q)return;
  const gen=view('doSearch',[q]);
  try{
    const d=await api(`/search?q=${encodeURIComponent(q)}`);
    setView(gen,`<section class="section">${head(`Hasil "${esc(q)}"`,`${d.count||0} judul di OtakuDesu`)}${d.data?.length?`<div class="grid">${d.data.map(a=>card(a,a.status==='Completed'?'complete':'ongoing')).join('')}</div>`:'<div class="empty">Tidak ada judul yang cocok.</div>'}</section>`);
  }catch(e){
    setView(gen,`<div class="empty">${esc(e.message)}</div>`);
  }
}

function row(k,v){return v?`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`:''}

function sortMirrors(list){
  return [...(list||[])].sort((a,b)=>{
    const am=String(a.name||'').toLowerCase()==='mega'?0:1;
    const bm=String(b.name||'').toLowerCase()==='mega'?0:1;
    return am-bm;
  });
}

async function loadDetail(url){
  if(!url)return;
  const gen=view('loadDetail',[url]);
  currentAnimeUrl=url;
  try{
    const d=await api(`/detail?url=${encodeURIComponent(url)}`);
    const i=d.data.info||{};
    const e=d.data.episodes||[];
    const genres=(i.Genre||'').split(',').map(x=>x.trim()).filter(Boolean);
    setView(gen,`
      <section class="detail">
        <img class="detail-poster" src="${esc(imgUrl(i.image))}" alt="${esc(i.Judul||'')}" onerror="this.onerror=null;this.src='${fallback}'">
        <div class="detail-main">
          <span class="hero-kicker">OtakuDesu Detail</span>
          <h1>${esc(i.Judul||'Untitled')}</h1>
          <div class="detail-sub">${esc(i.Japanese||'')}${i.Skor?` &middot; <span class="rating">&#9733; ${esc(i.Skor)}</span>`:''}</div>
          ${genres.length?`<div class="chips">${genres.map(g=>`<span class="chip">${esc(g)}</span>`).join('')}</div>`:''}
          <div class="hero-actions" style="margin:12px 0">
            ${e[0]?`<button class="btn btn-primary" data-url="${esc(e[0].url)}" onclick="loadEpisode(this.dataset.url)">${playIconSvg}<span>Putar Episode Terbaru</span></button>`:''}
            <button class="btn btn-secondary" data-url="${esc(url)}" data-title="${esc(i.Judul||'Untitled')}" data-image="${esc(i.image||'')}" onclick="addBookmark(this)">+ Daftar Saya</button>
          </div>
          <dl class="info-table">
            ${row('Status',i.Status)}${row('Tipe',i.Tipe)}${row('Episode',i['Total Episode'])}${row('Durasi',i.Durasi)}${row('Studio',i.Studio)}${row('Produser',i.Produser)}${row('Rilis',i['Tanggal Rilis'])}
          </dl>
          <p class="synopsis">${esc(i.sinopsis||'Informasi sinopsis belum tersedia untuk judul ini.')}</p>
        </div>
      </section>
      <section class="section">
        ${head(`Daftar Episode (${e.length})`)}
        <div class="episodes">${e.map(x=>`
          <div class="episode" data-url="${esc(x.url)}" onclick="loadEpisode(this.dataset.url)">
            <span class="episode-play">${playIconSvg}</span>
            <span class="episode-info">
              <span class="episode-num">EPISODE ${esc(x.num)}</span>
              <span class="episode-title">${esc(String(x.title||'').replace(/Subtitle Indonesia/i,'').trim())}</span>
            </span>
            <small class="episode-date">${esc(x.date||'')}</small>
          </div>`).join('')}</div>
      </section>`);
    scrollTo(0,0);
  }catch(e){
    setView(gen,`<div class="empty">${esc(e.message)}</div>`);
  }
}

async function loadEpisode(url){
  if(!url)return;
  setActiveNav('home');
  const gen=view('loadEpisode',[url]);
  window.currentWatch={episode_url:url,anime_url:currentAnimeUrl,title:url,episode:''};
  try{
    const d=await api(`/episode?url=${encodeURIComponent(url)}`);
    const e=d.data||{};
    const n=e.nav||{};
    const m=e.mirrors||{};
    const mirrorCount=Object.values(m).reduce((a,l)=>a+(l&&l.length?l.length:0),0);
    const playable=e.default_embed||mirrorCount>0;
    window.currentWatch.title=e.title||url;
    window.currentWatch.episode=e.title||'';
    resetWatch();
    saveHistory(historyPayload({position_seconds:0,duration_seconds:null}));
    setView(gen,`
      <div class="player-wrap">
        <div class="player">
          <div class="player-frame" id="player">${e.default_embed?`<iframe src="${esc(e.default_embed)}" allowfullscreen referrerpolicy="no-referrer"></iframe>`:'<div class="empty">Pilih mirror streaming di bawah.</div>'}</div>
          <div class="mirrors">${Object.entries(m).filter(([,ls])=>ls&&ls.length).map(([q,ls],qi)=>`<div class="quality"><span>${esc(q)}</span>${sortMirrors(ls).map((x,mi)=>`<button class="mirror${qi===0&&mi===0&&e.default_embed?' active':''}" data-id="${esc(x.post_id)}" data-i="${esc(x.mirror_index)}" data-q="${esc(x.quality)}" onclick="loadMirror(this)">${esc(x.name)}</button>`).join('')}</div>`).join('')}</div>
        </div>
      </div>
      ${!playable?`<div class="episode-meta-bar"><div><h1>Episode tidak tersedia</h1><p>Mirror streaming untuk episode ini belum aktif. Pilih episode lain dari daftar halaman anime.</p></div><button class="btn btn-secondary" data-url="${esc(n.all_episodes||currentAnimeUrl)}" onclick="loadDetail(this.dataset.url)">Lihat Daftar Episode</button></div>`:''}
      ${playable?`<div class="episode-meta-bar">
        <div>
          <h1>${esc(String(e.title||'').replace(/Subtitle Indonesia/i,'').trim())}</h1>
          <p>Pilih kualitas atau server lain jika pemutaran lambat</p>
        </div>
        <button class="btn btn-secondary" data-url="${esc(url)}" onclick="loadSamehadaku(this.dataset.url)">Mirror Samehadaku</button>
      </div>`:''}
      <div class="episode-nav">
        <button class="page-btn" ${n.prev?`data-url="${esc(n.prev)}" onclick="loadEpisode(this.dataset.url)"`:'disabled'}>&larr; Ep Sblm</button>
        <button class="btn btn-secondary" data-url="${esc(n.all_episodes||currentAnimeUrl)}" onclick="loadDetail(this.dataset.url)">Semua Ep</button>
        <button class="page-btn" ${n.next?`data-url="${esc(n.next)}" onclick="loadEpisode(this.dataset.url)"`:'disabled'}>Ep Lanjut &rarr;</button>
      </div>
      ${downloadBlock(e.downloads)}`);
    upgradePlayer(e.default_embed);
    trackPassiveWatch();
    scrollTo(0,0);
  }catch(e){
    setView(gen,`<div class="empty">${esc(e.message)}</div>`);
  }
}

async function loadMirror(btn){
  const id=btn.dataset.id,index=btn.dataset.i,q=btn.dataset.q;
  document.querySelectorAll('.mirror').forEach(x=>x.classList.remove('active'));
  btn.classList.add('active');
  const p=document.getElementById('player');
  p.innerHTML='<div class="empty">Memuat mirror...</div>';
  try{
    const d=await api(`/embed?id=${encodeURIComponent(id)}&i=${encodeURIComponent(index)}&q=${encodeURIComponent(q)}`);
    p.innerHTML=`<iframe src="${esc(d.data.embed_url)}" allowfullscreen referrerpolicy="no-referrer"></iframe>`;
    upgradePlayer(d.data.embed_url);
  }catch(e){
    p.innerHTML=`<div class="empty">${esc(e.message)}</div>`;
  }
}

async function loadSamehadaku(url){
  const gen=view('loadSamehadaku',[url]);
  try{
    const d=await api(`/samehadaku-episode?url=${encodeURIComponent(url)}`);
    setView(gen,episodeShell(d.data,'samehadaku',url));
    upgradePlayer((d.data||{}).embed_url);
    trackPassiveWatch();
  }catch(err){
    setView(gen,`<div class="empty">${esc(err.message)}<div style="margin-top:14px"><button class="btn btn-secondary" data-url="${esc(url)}" onclick="loadEpisode(this.dataset.url)">Kembali ke OtakuDesu</button></div></div>`);
  }
}

async function loadSamehadakuHome(){
  setActiveNav('samehadaku');
  const gen=view('loadSamehadakuHome');
  try{
    const [l,c]=await Promise.all([api('/samehadaku/latest'),api('/samehadaku/catalog')]);
    setView(gen,`
      <section class="section">${head('Samehadaku · Episode Terbaru',`${l.count||0} judul · tema ${esc(l.theme||'li')}`)}${rail((l.data||[]).slice(0,12),'ongoing','samehadaku-ep',true)}</section>
      <section class="section">${head('Samehadaku · Katalog Anime')}${grid(c.data,'complete','samehadaku')}</section>`);
    scrollTo(0,0);
  }catch(e){
    setView(gen,`<div class="empty">${esc(e.message)}</div>`);
  }
}

async function shSearch(forcedQ){
  const q=(forcedQ??document.getElementById('searchInput').value).trim();
  if(!q)return;
  const gen=view('shSearch',[q]);
  try{
    const d=await api(`/samehadaku/search?q=${encodeURIComponent(q)}`);
    setView(gen,`<section class="section">${head(`Samehadaku · "${esc(q)}"`,`${d.count||0} hasil`)}${grid(d.data,'ongoing','samehadaku')}</section>`);
    scrollTo(0,0);
  }catch(e){
    setView(gen,`<div class="empty">${esc(e.message)}</div>`);
  }
}

async function loadSamehadakuAnime(url){
  const gen=view('loadSamehadakuAnime',[url]);
  try{
    const r=await api(`/samehadaku/anime?url=${encodeURIComponent(url)}`);
    const d=r.data||{},i=d.info||{},eps=d.episodes||[];
    setView(gen,`
      <section class="detail ${i.image?'':'no-poster'}">
        ${i.image?`<img class="detail-poster" src="${esc(i.image)}" alt="${esc(i.title||'')}" onerror="this.onerror=null;this.src='${fallback}'">`:''}
        <div class="detail-main">
          <span class="hero-kicker">Samehadaku · ${esc(d.theme||'li')}</span>
          <h1>${esc(i.title||'Untitled')}</h1>
          <div class="chips">${(i.genres||[]).map(g=>`<span class="chip">${esc(g)}</span>`).join('')}</div>
          ${eps[0]?`<div class="hero-actions" style="margin:12px 0"><button class="btn btn-primary" data-url="${esc(eps[0].url)}" onclick="loadSamehadakuEpisode(this.dataset.url)">${playIconSvg}<span>Putar Episode Terbaru</span></button></div>`:''}
          <dl class="info-table">
            ${row('Status',i.status)}${row('Tipe',i.type)}${row('Episode',i.episodes)}${row('Durasi',i.duration)}${row('Studio',i.studio)}${row('Rilis',i.released)}${row('Skor',i.score)}
          </dl>
          ${i.synopsis?`<p class="synopsis">${esc(i.synopsis)}</p>`:''}
        </div>
      </section>
      <section class="section">
        ${head(`Daftar Episode (${eps.length})`)}
        <div class="episodes">${eps.map(x=>`
          <div class="episode" data-url="${esc(x.url)}" onclick="loadSamehadakuEpisode(this.dataset.url)">
            <span class="episode-play">${playIconSvg}</span>
            <span class="episode-info">
              <span class="episode-num">EPISODE ${esc(x.num)}</span>
              <span class="episode-title">${esc(String(x.title||'').replace(/Subtitle Indonesia/i,'').trim())}</span>
            </span>
            <small class="episode-date">${esc(x.date||'')}</small>
          </div>`).join('')}</div>
      </section>`);
    scrollTo(0,0);
  }catch(e){
    setView(gen,`<div class="empty">${esc(e.message)}</div>`);
  }
}

async function loadSamehadakuEpisode(url){
  const gen=view('loadSamehadakuEpisode',[url]);
  try{
    const d=await api(`/samehadaku/episode?url=${encodeURIComponent(url)}`);
    setView(gen,episodeShell(d.data,'samehadaku'));
    upgradePlayer((d.data||{}).embed_url);
    trackPassiveWatch();
    scrollTo(0,0);
  }catch(e){
    setView(gen,`<div class="empty">${esc(e.message)}</div>`);
  }
}

function mirrorBtn(x,isActive=false){
  return `<button class="mirror${isActive?' active':''}" data-url="${esc(x.url||x.embed_url||'')}" data-id="${esc(x.post_id||'')}" data-i="${esc(x.mirror_index??'')}" data-q="${esc(x.quality||'')}" onclick="playMirror(this)">${esc(x.name||'Mirror')}</button>`;
}

function mirrorGroups(m){
  if(!m)return '';
  if(Array.isArray(m))return m.length?`<div class="quality"><span>Server</span>${sortMirrors(m).map((x,i)=>mirrorBtn(x,i===0)).join('')}</div>`:'';
  return Object.entries(m).filter(([,ls])=>Array.isArray(ls)&&ls.length).map(([q,ls],qi)=>`<div class="quality"><span>${esc(q)}</span>${sortMirrors(ls).map((x,mi)=>mirrorBtn(x,qi===0&&mi===0)).join('')}</div>`).join('');
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
  return `<section class="section">${head('Link Download')}<div class="downloads">${rows.join('')}</div></section>`;
}

function episodeShell(e,source,origin){
  const n=e.nav||{},m=e.mirrors||{},first=Array.isArray(m)?(m[0]||null):(Object.values(m).flat()[0]||null);
  const embed=e.embed_url||e.default_embed||first?.embed_url||first?.url||'';
  const goto=source==='samehadaku'?'loadSamehadakuEpisode':'loadEpisode';
  const back=source==='samehadaku'?'loadSamehadakuHome':'loadHome';
  const originBtn=origin?`<button class="btn btn-secondary" data-url="${esc(origin)}" onclick="loadEpisode(this.dataset.url)">Kembali ke OtakuDesu</button>`:'';
  window.currentWatch={episode_url:e.url||'',anime_url:e.anime_url||currentAnimeUrl,title:e.title||'',episode:String(e.matched_episode||e.title||''),source};
  resetWatch();
  saveHistory(historyPayload({position_seconds:0,duration_seconds:null}));
  return `
    <div class="player-wrap">
      <div class="player">
        <div class="player-frame" id="player">${embed?`<iframe src="${esc(embed)}" allowfullscreen referrerpolicy="no-referrer"></iframe>`:'<div class="empty">Pilih mirror streaming di bawah.</div>'}</div>
        <div class="mirrors">${mirrorGroups(m)}</div>
      </div>
    </div>
    <div class="episode-meta-bar">
      <div>
        <h1>${esc(String(e.title||'').replace(/Subtitle Indonesia/i,'').trim())}</h1>
        <p>${source==='samehadaku'?`Samehadaku · tema ${esc(e.theme||'li')}${e.matched_episode?` · episode ${esc(e.matched_episode)}`:''}${e.anime_title?` · ${esc(e.anime_title)}`:''}`:'OtakuDesu'}</p>
      </div>
    </div>
    <div class="episode-nav">
      <button class="page-btn" ${n.prev?`data-url="${esc(n.prev)}" onclick="${goto}(this.dataset.url)"`:'disabled'}>&larr; Ep Sblm</button>
      ${originBtn||`<button class="btn btn-secondary" onclick="${back}()">${source==='samehadaku'?'Katalog':'Beranda'}</button>`}
      <button class="page-btn" ${n.next?`data-url="${esc(n.next)}" onclick="${goto}(this.dataset.url)"`:'disabled'}>Ep Lanjut &rarr;</button>
    </div>
    ${downloadBlock(e.downloads)}`;
}

async function playMirror(btn){
  document.querySelectorAll('.mirror').forEach(x=>x.classList.remove('active'));
  btn.classList.add('active');
  const p=document.getElementById('player');
  if(!p)return;
  p.innerHTML='<div class="empty">Memuat mirror...</div>';
  try{
    let url=btn.dataset.url;
    if(!url&&btn.dataset.id){
      const d=await api(`/embed?id=${encodeURIComponent(btn.dataset.id)}&i=${encodeURIComponent(btn.dataset.i)}&q=${encodeURIComponent(btn.dataset.q)}`);
      url=d.data.embed_url;
    }
    if(!url)throw Error('Mirror tanpa URL');
    p.innerHTML=`<iframe src="${esc(url)}" allowfullscreen referrerpolicy="no-referrer"></iframe>`;
    upgradePlayer(url);
  }catch(e){
    p.innerHTML=`<div class="empty">${esc(e.message)}</div>`;
  }
}

function anibiScheduleCard(a){
  return `<article class="card" data-kind="anibi" data-slug="${esc(a.slug||a.id)}" onclick="loadAnibiDetail(this.dataset.slug)">
    <div class="poster">${img(a.image,a.title)}<span class="poster-badge">Ep ${esc(a.last_episode?.label||'—')}</span></div>
    <div class="card-body">
      <div class="card-title">${esc(a.title)}</div>
      <div class="meta">${a.airing_today?'Tayang hari ini':esc(a.day||'')}</div>
    </div>
  </article>`;
}

function selectScheduleDay(dayKey){
  document.querySelectorAll('.day-tab').forEach(b=>{
    b.classList.toggle('active',b.dataset.day===dayKey);
  });
  const wrap=document.getElementById('scheduleDayWrap');
  if(!wrap)return;
  if(dayKey==='all'){
    const flat=scheduleDaysCache.flatMap(([,list])=>(list||[]).slice(0,8));
    wrap.innerHTML=flat.length?`<div class="grid">${flat.map(anibiScheduleCard).join('')}</div>`:'<div class="empty">Belum ada jadwal.</div>';
    return;
  }
  const found=scheduleDaysCache.find(([d])=>d===dayKey);
  const list=found?(found[1]||[]):[];
  wrap.innerHTML=list.length?`<div class="grid">${list.map(anibiScheduleCard).join('')}</div>`:'<div class="empty">Tidak ada jadwal tayang pada hari ini.</div>';
}

async function loadAnibi(){
  if(!anibiAvailable){applyAnibiAvailability(false);return;}
  setActiveNav('anibi');
  const gen=view('loadAnibi');
  try{
    const s=await api('/anibi/schedule');
    scheduleDaysCache=Object.entries(s.data||{});
    const firstDay=scheduleDaysCache[0]?.[0]||'all';
    setView(gen,`<section class="section">
      ${head('Jadwal Rilis Mingguan','Pilih hari tayang dari Anibiplay')}
      <div class="day-tabs">
        ${scheduleDaysCache.map(([day],idx)=>`<button class="day-tab${idx===0?' active':''}" data-day="${esc(day)}" onclick="selectScheduleDay(this.dataset.day)">${esc(day)}</button>`).join('')}
        <button class="day-tab" data-day="all" onclick="selectScheduleDay('all')">Semua</button>
      </div>
      <div id="scheduleDayWrap"></div>
    </section>`);
    selectScheduleDay(firstDay);
    scrollTo(0,0);
  }catch(e){
    setView(gen,`<div class="empty">${esc(e.message)}</div>`);
  }
}

async function anibiSearch(forcedQ){
  if(!anibiAvailable){applyAnibiAvailability(false);return;}
  const q=(forcedQ??document.getElementById('searchInput').value).trim();
  if(!q)return;
  const gen=view('anibiSearch',[q]);
  try{
    const d=await api(`/anibi/search?q=${encodeURIComponent(q)}`);
    setView(gen,`<section class="section">${head(`Anibiplay · "${esc(q)}"`,`${d.count||0} dari ${d.total??d.count??0} hasil`)}${d.data?.length?`<div class="grid">${d.data.map(a=>`<article class="card" data-kind="anibi" data-slug="${esc(a.slug||a.id)}" onclick="loadAnibiDetail(this.dataset.slug)"><div class="poster">${img(a.image,a.title)}<span class="poster-badge">${esc(a.status||'—')}</span></div><div class="card-body"><div class="card-title">${esc(a.title)}</div><div class="meta"><span class="rating">&#9733; ${esc(a.rating||'—')}</span> &middot; ${esc(a.type||'')} &middot; ${esc(a.episodes??'')} ep</div></div></article>`).join('')}</div>`:'<div class="empty">Tidak ada hasil ditemukan.</div>'}</section>`);
    scrollTo(0,0);
  }catch(e){
    setView(gen,`<div class="empty">${esc(e.message)}</div>`);
  }
}

async function loadAnibiDetail(slug){
  if(!anibiAvailable){applyAnibiAvailability(false);return;}
  const gen=view('loadAnibiDetail',[slug]);
  try{
    const d=await api(`/anibi/detail/${encodeURIComponent(slug)}`);
    const x=d.data||{};
    setView(gen,`
      <section class="detail ${x.image?'':'no-poster'}">
        ${x.image?`<img class="detail-poster" src="${esc(x.image)}" alt="${esc(x.title||'')}" onerror="this.onerror=null;this.src='${fallback}'">`:''}
        <div class="detail-main">
          <span class="hero-kicker">Anibiplay · ${esc(x.platform||'Kisame')}</span>
          <h1>${esc(x.title||'Untitled')}</h1>
          <div class="detail-sub">${esc(x.origin||'')}${x.rating?` &middot; <span class="rating">&#9733; ${esc(x.rating)}</span>`:''}</div>
          <dl class="info-table">${row('Status',x.status)}${row('Tipe',x.type)}${row('Episode',x.episodes)}${row('Studio',x.studio)}${row('Rilis',x.published)}</dl>
          ${x.synopsis?`<p class="synopsis">${esc(x.synopsis)}</p>`:''}
        </div>
      </section>
      <section class="section">
        ${head('Daftar Episode')}
        <div class="episodes">${(x.episodes_list||x.episode_list||[]).map(e=>`<div class="episode"><span class="episode-play">${playIconSvg}</span><span class="episode-info"><span class="episode-num">EPISODE ${esc(e.num||e.label||'')}</span><span class="episode-title">${esc(e.title||'')}</span></span></div>`).join('')||'<div class="empty">Detail episode belum tersedia dari sumber ini.</div>'}</div>
      </section>`);
    scrollTo(0,0);
  }catch(e){
    setView(gen,`<div class="empty">${esc(e.message)}</div>`);
  }
}

async function installPWA(){
  if(!deferredInstallPrompt)return;
  deferredInstallPrompt.prompt();
  const choice=await deferredInstallPrompt.userChoice;
  if(choice&&choice.outcome==='accepted'){
    document.getElementById('installBtn')?.classList.add('hidden');
    showToast('NanoStream berhasil di-install');
  }
  deferredInstallPrompt=null;
}

function setupPWA(){
  window.addEventListener('beforeinstallprompt',e=>{
    e.preventDefault();
    deferredInstallPrompt=e;
    document.getElementById('installBtn')?.classList.remove('hidden');
  });
  window.addEventListener('appinstalled',()=>{
    deferredInstallPrompt=null;
    document.getElementById('installBtn')?.classList.add('hidden');
  });
  const syncNet=()=>{
    document.getElementById('offlineBanner')?.classList.toggle('hidden',navigator.onLine);
  };
  window.addEventListener('online',syncNet);
  window.addEventListener('offline',syncNet);
  syncNet();

  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('./sw.js').then(reg=>{
      reg.addEventListener('updatefound',()=>{
        const nw=reg.installing;
        if(!nw)return;
        nw.addEventListener('statechange',()=>{
          if(nw.state==='installed'&&navigator.serviceWorker.controller){
            showToast('Pembaruan aplikasi tersedia','Muat Ulang',()=>{
              nw.postMessage({type:'SKIP_WAITING'});
              location.reload();
            });
          }
        });
      });
    }).catch(()=>{});
  }
}

window.addEventListener('beforeunload',()=>{
  const delta=watchAcc-watchSent;
  if(delta>0&&authToken&&window.currentWatch&&window.currentWatch.episode_url){
    const payload=historyPayload({watch_seconds:Math.floor(delta),position_seconds:Math.floor(window.currentWatch.position_seconds||0)});
    try{localStorage.setItem('nanostream-pending-watch',JSON.stringify(payload));}catch(e){}
  }
});

document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='hidden')flushWatch();
});

window.addEventListener('message',e=>{
  const d=e.data||{};
  const position=Number(d.currentTime??d.position??d.seconds);
  const duration=Number(d.duration);
  if(window.currentWatch&&Number.isFinite(position)&&position>=0){
    saveHistory({...window.currentWatch,position_seconds:Math.floor(position),duration_seconds:Number.isFinite(duration)&&duration>0?Math.floor(duration):null});
  }
});

function flushPendingWatch(){
  try{
    const raw=localStorage.getItem('nanostream-pending-watch');
    if(!raw)return;
    localStorage.removeItem('nanostream-pending-watch');
    const p=JSON.parse(raw);
    if(p&&p.episode_url&&p.watch_seconds>0)saveHistory(p);
  }catch(e){}
}

(function init(){
  const savedTheme=localStorage.getItem('nanostream-theme')||'dark';
  applyTheme(savedTheme);
  updateAccount();
  flushPendingWatch();
  setupPWA();
  syncAnibiAvailability();
  const tab=new URLSearchParams(location.search).get('tab');
  if(tab==='ongoing')loadOngoing(1);
  else if(tab==='complete')loadComplete(1);
  else if(tab==='samehadaku')loadSamehadakuHome();
  else if(tab==='anibi')loadAnibi();
  else if(tab==='genres')loadGenres();
  else loadHome();
})();