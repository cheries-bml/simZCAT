/* CAT Learning — JSON only, GET only, modal dialogs only */
const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = s => String(s||'').trim().toLowerCase().replace(/\s+/g,' ');

let CFG=null, ROLES=null, USERS=null;
let currentUser=null, currentRole=null;
let questionFiles={}; // filename -> data
let currentTest=null; // {meta, questions, answers:{}, teaching:{peek,explain}}
let selectedDiff='intermediate', selectedCount=10, timerMode='off', timerInt=null, timerLeft=0;
let materialFilter='all', materialQuery='';

async function getJSON(path){
  const r = await fetch(path, {method:'GET', headers:{'Accept':'application/json'}});
  if(!r.ok) throw new Error('Cannot load '+path);
  return r.json();
}
async function sha256(str){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

/* ---------- Modal & Toast (no alert) ---------- */
function showModal(title, bodyHTML, footHTML=''){
  $('#modalTitle').textContent=title;
  $('#modalBody').innerHTML=bodyHTML;
  $('#modalFoot').innerHTML=footHTML;
  $('#modalBackdrop').style.display='grid';
}
function closeModal(){ $('#modalBackdrop').style.display='none'; }
function showToast(msg, icon='check_circle'){
  const t=$('#toast'); $('#toastText').textContent=msg; $('#toastIcon').textContent=icon;
  t.style.display='flex'; clearTimeout(t._h); t._h=setTimeout(()=>t.style.display='none', 2800);
}
function confirmModal(title, body, confirmLabel, onConfirm){
  showModal(title, `<p>${body}</p>`, `<button class="btn" data-close>Cancel</button><button class="btn btn-primary" id="confirmBtn">${confirmLabel}</button>`);
  $('#confirmBtn').onclick=()=>{ closeModal(); onConfirm(); };
}

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', init);
async function init(){
  try{
    CFG = await getJSON('./data/config.json');
    ROLES = await getJSON('./data/roles.json');
    // users.json is fetched only for login check, never rendered with hashes
    USERS = await getJSON('./data/users.json');
  }catch(e){
    showModal('Cannot load data', `<p>Could not load <code>data/*.json</code>. Serve this folder over HTTP (GitHub Pages or <code>python -m http.server</code>). Opening via <code>file://</code> blocks <code>fetch()</code>.</p><p class="tiny muted">${esc(e.message)}</p>`, `<button class="btn btn-primary" data-close>Got it</button>`);
    return;
  }
  $('#brandName').textContent = CFG.appName || 'CAT Learning';
  $('#brandTagline').textContent = CFG.tagline || 'Computer Assisted Test';
  document.title = (CFG.appName||'CAT Learning') + ' — Computer Assisted Test';

  // Restore session
  const saved = sessionStorage.getItem('cat_user') || localStorage.getItem('cat_user');
  if(saved){
    try{
      const u = JSON.parse(saved);
      const found = (USERS.users||[]).find(x=>x.username===u.username && x.role===u.role);
      if(found) setUser({username:found.username, name:found.name, role:found.role});
    }catch{}
  }

  bindEvents();
  renderDemoUsers();
  await loadQuestionFiles();
  renderDashboard();
  renderMaterials();
  showView(currentUser ? 'dashboard' : 'login');
}

function bindEvents(){
  $('#modalClose').onclick=closeModal;
  $('#modalBackdrop').addEventListener('click', e=>{ if(e.target.id==='modalBackdrop') closeModal(); });
  document.addEventListener('click', e=>{
    const c=e.target.closest('[data-close]'); if(c) closeModal();
    const nav=e.target.closest('[data-nav]'); if(nav) showView(nav.dataset.nav);
  });
  $$('.nav-item').forEach(b=> b.onclick=()=> showView(b.dataset.view));
  $('#loginForm').addEventListener('submit', handleLogin);
  $('#togglePass').onclick=()=>{
    const p=$('#password'); const show=p.type==='password'; p.type=show?'text':'password';
    $('#togglePass').innerHTML=`<span class="material-symbols-outlined">${show?'visibility_off':'visibility'}</span>`;
  };
  $('#forgotBtn').onclick=()=> showModal('Need help logging in?', `<p>Ask your teacher / admin to check <code>data/users.json</code>. Demo accounts are shown on the login card.</p><p class="tiny muted">Passwords are stored as SHA-256 hashes. To reset, update the hash in the JSON file and push to GitHub.</p>`, `<button class="btn btn-primary" data-close>Got it</button>`);
  $('#logoutBtn').onclick=()=>{ sessionStorage.removeItem('cat_user'); localStorage.removeItem('cat_user'); currentUser=null; currentRole=null; stopTimer(); showView('login'); showToast('Logged out'); };
  $('#howItWorksBtn').onclick=()=> showModal('How it works', `<div class="md-preview"><h3>For students</h3><ol><li>Choose difficulty &amp; question count</li><li>Answer all questions</li><li>Submit to see score &amp; review</li></ol><h3>For teachers</h3><p>On the same test page, use <b>Teaching mode</b> to peek answers and reveal explanations. Permissions come from <code>data/roles.json</code>.</p><h3>For super</h3><p>Admin view shows config, roles and counts. No passwords shown.</p></div>`, `<button class="btn btn-primary" data-close>Got it</button>`);
  // Builder
  $$('#difficultySeg .seg-btn').forEach(b=> b.onclick=()=>{ selectedDiff=b.dataset.diff; $$('#difficultySeg .seg-btn').forEach(x=>x.classList.toggle('active', x===b)); updatePreview(); });
  $$('.count-btn').forEach(b=> b.onclick=()=>{ selectedCount=Number(b.dataset.count); $$('.count-btn').forEach(x=>x.classList.toggle('active', x===b)); $('#customCount').value=''; updatePreview(); });
  $('#customCount').addEventListener('input', e=>{ const v=Number(e.target.value); if(v>0){ selectedCount=v; $$('.count-btn').forEach(x=>x.classList.remove('active')); updatePreview(); }});
  $('#timerSelect').addEventListener('change', e=> timerMode=e.target.value);
  $('#shuffleCheck').addEventListener('change', updatePreview);
  $('#testFileSelect').addEventListener('change', updatePreview);
  $('#startTestBtn').onclick=()=> startTest();
  $('#quickStartBtn').onclick=()=> startTest();
  $('#exitTestBtn').onclick=()=> confirmModal('Exit test?', 'Your current answers will be lost.', 'Exit test', ()=>{ stopTimer(); currentTest=null; showView('dashboard'); });
  $('#submitTestBtn').onclick=()=> submitTest();
  $('#peekBtn').onclick=()=> toggleTeaching('peek');
  $('#explainBtn').onclick=()=> toggleTeaching('explain');
  $('#revealAllBtn').onclick=()=>{ if(!currentTest) return; currentTest.teaching.peek=true; currentTest.teaching.explain=true; syncTeachButtons(); renderQuestions(); showToast('All answers & explanations revealed'); };
  $('#materialSearch').addEventListener('input', e=>{ materialQuery=e.target.value.toLowerCase(); renderMaterials(); });
  $$('#materialFilters .filter-btn').forEach(b=> b.onclick=()=>{ materialFilter=b.dataset.filter; $$('#materialFilters .filter-btn').forEach(x=>x.classList.toggle('active', x===b)); renderMaterials(); });
  $('#clearHistoryBtn').onclick=()=>{ localStorage.removeItem('cat_history'); renderDashboard(); showToast('History cleared'); };
}

/* ---------- Auth ---------- */
function renderDemoUsers(){
  const grid=$('#demoGrid');
  if(!USERS?.users) return;
  grid.innerHTML = USERS.users.map(u=> `<button type="button" class="demo-user" data-fill="${esc(u.username)}"><b>${esc(u.username)}</b><span>${esc(u.role)} • ${esc(u.name)}</span><span>Click to fill username</span></button>`).join('');
  $$('.demo-user', grid).forEach(b=> b.onclick=()=>{ $('#username').value=b.dataset.fill; $('#password').focus(); });
}
async function handleLogin(e){
  e.preventDefault();
  const username=$('#username').value.trim();
  const password=$('#password').value;
  const err=$('#loginError');
  if(!username || !password){ err.textContent='Enter username and password.'; err.style.display='block'; return; }
  const btn=$('#loginBtn'); btn.disabled=true; btn.textContent='Checking…';
  try{
    const hash = await sha256(password);
    const found = (USERS.users||[]).find(u=> u.username.toLowerCase()===username.toLowerCase());
    // Support both passwordHash and plain password (for easy editing) — prefer hash
    const ok = found && (found.passwordHash ? found.passwordHash.toLowerCase()===hash : found.password===password);
    if(!found || !ok){ err.textContent='Invalid username or password.'; err.style.display='block'; showToast('Login failed — check username / password','error'); return; }
    if(found.active===false){ err.textContent='This account is inactive.'; err.style.display='block'; return; }
    const user={username:found.username, name:found.name||found.username, role:found.role};
    const store = $('#rememberMe').checked ? localStorage : sessionStorage;
    // clear other store to avoid confusion
    sessionStorage.removeItem('cat_user'); localStorage.removeItem('cat_user');
    store.setItem('cat_user', JSON.stringify(user));
    setUser(user);
    showToast(`Welcome, ${user.name}`);
    showView('dashboard');
  }catch(ex){
    err.textContent='Login error. Try again.'; err.style.display='block';
  }finally{ btn.disabled=false; btn.innerHTML='<span class="material-symbols-outlined">login</span> Log in'; }
}
function setUser(user){
  currentUser=user;
  currentRole = ROLES?.roles?.[user.role] || null;
  $('#userChip').style.display='flex';
  $('#rolePill').style.display='inline-flex';
  $('#logoutBtn').style.display='inline-flex';
  $('#sidebar').style.display='flex';
  $('#userNameLabel').textContent=user.name;
  $('#userAvatar').textContent=(user.name||'U').slice(0,1).toUpperCase();
  $('#rolePill').textContent = (currentRole?.label||user.role).toUpperCase();
  $('#navAdmin').style.display = currentRole?.permissions?.canViewAdmin ? 'flex' : 'none';
  $('#greeting').textContent = `Hello, ${user.name}`;
  $('#greetingSub').textContent = currentRole ? `${currentRole.label} • ${currentRole.description||''}` : '';
}
function can(perm){ return !!currentRole?.permissions?.[perm]; }

/* ---------- Navigation ---------- */
function showView(view){
  if(!currentUser && view!=='login'){ view='login'; }
  if(view==='admin' && !can('canViewAdmin')){
    showModal('Restricted', `<p>This page is only for role <b>super</b>.</p>`, `<button class="btn btn-primary" data-close>Back</button>`);
    view='dashboard';
  }
  if(view==='test' && !currentTest){
    // keep test view but show empty state
  }
  $$('.view').forEach(v=> v.style.display='none');
  const el=$('#view-'+view); if(el) el.style.display='block';
  $$('.nav-item').forEach(b=> b.classList.toggle('active', b.dataset.view===view));
  if(view==='dashboard') renderDashboard();
  if(view==='materials') renderMaterials();
  if(view==='admin') renderAdmin();
  if(view==='test' && currentTest) renderTest();
  window.scrollTo({top:0});
}

/* ---------- Questions ---------- */
async function loadQuestionFiles(){
  const files = CFG.questionFiles || [{file:'sample-english.json', label:'Sample English'}];
  const sel=$('#testFileSelect'); sel.innerHTML='';
  for(const f of files){
    try{
      const data=await getJSON('./questions/'+f.file);
      questionFiles[f.file]=data;
      const opt=document.createElement('option'); opt.value=f.file; opt.textContent=`${f.label} — ${(data.questions||[]).length} questions`; sel.appendChild(opt);
    }catch(e){ console.warn('Missing question file', f.file); }
  }
  if(!sel.options.length){
    sel.innerHTML='<option value="">No question files found</option>';
  }
  updatePreview();
}
function levelToDiff(level){
  const l=Number(level||3);
  if(l<=2) return 'easy';
  if(l===3) return 'intermediate';
  return 'advanced';
}
function getPool(){
  const file=$('#testFileSelect')?.value;
  const data=questionFiles[file];
  if(!data) return [];
  return (data.questions||[]).map(q=> ({...q, _file:file, _meta:data.meta}));
}
function filterByDifficulty(pool, diff){
  if(diff==='mixed') return pool;
  return pool.filter(q=> levelToDiff(q.config?.level)===diff);
}
function shuffle(arr){ const a=[...arr]; for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function updatePreview(){
  const pool=getPool(); const filtered=filterByDifficulty(pool, selectedDiff);
  const count = selectedCount===0 ? filtered.length : Math.min(selectedCount, filtered.length);
  $('#poolCount').textContent = `${pool.length} questions in pool`;
  const by={easy:pool.filter(q=>levelToDiff(q.config?.level)==='easy').length, intermediate:pool.filter(q=>levelToDiff(q.config?.level)==='intermediate').length, advanced:pool.filter(q=>levelToDiff(q.config?.level)==='advanced').length};
  $('#genPreview').innerHTML = `<b>Preview:</b> ${count} question${count!==1?'s':''} • <b>${selectedDiff}</b> • Available in this difficulty: ${filtered.length} (Easy ${by.easy} • Intermediate ${by.intermediate} • Advanced ${by.advanced}) ${filtered.length===0?'<br><span style="color:#dc2626">No questions for this difficulty. Try Mixed.</span>':''}`;
}
function startTest(){
  if(!can('canTakeTest') && !can('canTeach')){
    showModal('Not allowed', `<p>Your role cannot start a test.</p>`, `<button class="btn btn-primary" data-close>Got it</button>`); return;
  }
  const pool=getPool(); const filtered=filterByDifficulty(pool, selectedDiff);
  if(!filtered.length){ showModal('No questions', `<p>No questions found for <b>${selectedDiff}</b> in this file. Try Mixed.</p>`, `<button class="btn btn-primary" data-close>Got it</button>`); return; }
  let picked = shuffle(filtered);
  if(selectedCount>0) picked=picked.slice(0, selectedCount);
  if($('#shuffleCheck').checked){
    picked = picked.map(q=>{
      if(q.type==='multiple_choice' && q.options){
        const entries=Object.entries(q.options);
        const shuffled=shuffle(entries);
        const newOpts={}; const letters=['A','B','C','D','E','F','G'];
        shuffled.forEach(([_,v],i)=> newOpts[letters[i]]=v);
        return {...q, options:newOpts};
      }
      return q;
    });
  } else {
    picked = picked; // already shuffled order, keep as is
  }
  const meta = questionFiles[$('#testFileSelect').value]?.meta || {title:'Test'};
  currentTest={ meta, questions:picked, answers:{}, teaching:{peek:false, explain:false}, startedAt:Date.now(), difficulty:selectedDiff, timerMode };
  // Timer
  stopTimer();
  if(timerMode!=='off'){
    let total=0;
    picked.forEach(q=>{ const t=q.config?.time_in_seconds?.[timerMode] || q.config?.time_in_seconds?.normal || 30; total+=Number(t); });
    timerLeft=total; $('#timerPill').style.display='inline-flex'; updateTimerUI();
    timerInt=setInterval(()=>{ timerLeft--; updateTimerUI(); if(timerLeft<=0){ stopTimer(); showModal('Time up', `<p>Time is up. Your test will be submitted.</p>`, `<button class="btn btn-primary" data-close>See score</button>`); submitTest(); } },1000);
  } else { $('#timerPill').style.display='none'; }
  $('#testResult').style.display='none';
  showView('test');
  renderTest();
  showToast(`Test started — ${picked.length} questions`);
}
function updateTimerUI(){
  const m=Math.floor(timerLeft/60), s=timerLeft%60;
  $('#timerText').textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
function stopTimer(){ if(timerInt) clearInterval(timerInt); timerInt=null; }

/* ---------- Render Test ---------- */
function renderTest(){
  if(!currentTest){ $('#testEmpty').style.display='block'; $('#testActive').style.display='none'; return; }
  $('#testEmpty').style.display='none'; $('#testActive').style.display='block';
  $('#testTitle').textContent=currentTest.meta.title||'Test';
  $('#testMeta').textContent=`${currentTest.meta.description||''} • ${currentTest.questions.length} questions • ${currentTest.difficulty} • ${currentTest.meta.author? 'By '+currentTest.meta.author:''}`;
  // Teaching bar
  const showTeach = can('canTeach') || can('canPeekAnswer') || can('canShowExplanation');
  $('#teachBar').style.display = showTeach ? 'block' : 'none';
  syncTeachButtons();
  renderQuestions();
  updateProgress();
}
function syncTeachButtons(){
  if(!currentTest) return;
  $('#peekBtn').classList.toggle('on', currentTest.teaching.peek);
  $('#explainBtn').classList.toggle('on', currentTest.teaching.explain);
}
function toggleTeaching(kind){
  if(!currentTest) return;
  if(kind==='peek' && !can('canPeekAnswer')){ showModal('Restricted', `<p>Peeking answers requires teacher / super role.</p>`, `<button class="btn btn-primary" data-close>Got it</button>`); return; }
  if(kind==='explain' && !can('canShowExplanation')){ showModal('Restricted', `<p>Showing explanations requires teacher / super role.</p>`, `<button class="btn btn-primary" data-close>Got it</button>`); return; }
  currentTest.teaching[kind==='peek'?'peek':'explain'] = !currentTest.teaching[kind==='peek'?'peek':'explain'];
  syncTeachButtons(); renderQuestions();
}
function renderQuestions(){
  const wrap=$('#questionsList'); wrap.innerHTML='';
  currentTest.questions.forEach((q, idx)=>{
    const card=document.createElement('div'); card.className='q-card'; card.id='q-'+q.id;
    const diffLabel=levelToDiff(q.config?.level);
    const diffPill = diffLabel==='easy' ? 'pill-success' : diffLabel==='advanced' ? 'pill-warn' : 'pill-primary';
    let body='';
    body+=`<div class="q-top"><span class="pill ${diffPill}">${diffLabel} • Q${idx+1}</span><span class="tiny muted">${q.type==='correction' ? 'Correction' : 'Multiple choice'} • ${q.config?.time_in_seconds?.normal||30}s</span></div>`;
    if(q.data?.hint) body+=`<div class="q-hint"><span class="material-symbols-outlined">lightbulb</span><span>${q.data.hint}</span></div>`;
    if(q.data?.passage) body+=`<div class="q-passage">${q.data.passage}</div>`;
    if(q.data?.image?.url) body+=`<img class="q-image" src="${esc(q.data.image.url)}" alt="Question image" onerror="this.style.display='none'" />`;
    if(q.data?.question) body+=`<p class="q-text">${q.data.question}</p>`;
    // For correction, question text is in segments
    if(q.type==='correction'){
      body+=`<p class="q-text">Find the error(s) — click a part, then type the correction.</p>`;
      body+=`<div class="segments" id="segs-${q.id}">` + (q.data?.multiErrorSegments||[]).map(seg=>{
        const isSel = (currentTest.answers[q.id]?.selected||[]).includes(seg.id);
        return `<button type="button" class="seg-word ${seg.clickable?'clickable':''} ${isSel?'selected':''}" data-seg="${seg.id}" data-q="${q.id}">${esc(seg.text)}</button>`;
      }).join('') + `</div>`;
      body+=`<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button type="button" class="btn btn-sm" data-noerror="${q.id}">No Error</button><span class="tiny muted">Choose No Error if the sentence is already correct.</span></div>`;
      body+=`<div id="corr-inputs-${q.id}"></div>`;
    }
    if(q.type==='multiple_choice'){
      body+=`<div class="options">` + Object.entries(q.options||{}).map(([letter, opt])=>{
        const sel=currentTest.answers[q.id]===letter;
        const isCorrect = !!opt.correct;
        const showCorrect = currentTest.teaching.peek && isCorrect;
        return `<button type="button" class="option ${sel?'selected':''} ${showCorrect?'correct':''}" data-opt="${letter}" data-q="${q.id}"><span class="option-letter">${letter}</span><span>${opt.text||''}</span>${showCorrect?'<span class="pill pill-success" style="margin-left:auto">Correct</span>':''}</button>`;
      }).join('') + `</div>`;
    }
    // Teaching peek for correction
    if(currentTest.teaching.peek && q.type==='correction'){
      const errors=(q.data?.multiErrorSegments||[]).filter(s=>s.isError);
      body+=`<div class="answer-peek"><b>Teacher peek — errors:</b> ${errors.length? errors.map(e=> `${esc(e.text)} → <b>${esc((e.correctAnswers||[]).join(' / '))}</b>`).join(' • ') : 'No error'}</div>`;
    }
    // Explanation (teaching) — only if teacher toggled it, or after submit handled separately
    if(currentTest.teaching.explain && q.explanation){
      body+= explanationHTML(q);
    }
    card.innerHTML=body;
    wrap.appendChild(card);
    // Correction inputs render
    if(q.type==='correction') renderCorrectionInputs(q);
  });
  // Bind
  $$('.option', wrap).forEach(b=> b.onclick=()=>{ const qid=b.dataset.q; currentTest.answers[qid]=b.dataset.opt; renderQuestions(); updateProgress(); });
  $$('.seg-word.clickable', wrap).forEach(b=> b.onclick=()=>{
    const qid=b.dataset.q; const seg=b.dataset.seg;
    const ans=currentTest.answers[qid] || {selected:[], corrections:{}, noError:false};
    if(ans.noError) ans.noError=false;
    if(ans.selected.includes(seg)) ans.selected=ans.selected.filter(x=>x!==seg);
    else ans.selected.push(seg);
    currentTest.answers[qid]=ans; renderQuestions(); updateProgress();
  });
  $$('[data-noerror]', wrap).forEach(b=> b.onclick=()=>{ const qid=b.dataset.noerror; currentTest.answers[qid]={selected:[], corrections:{}, noError:true}; renderQuestions(); updateProgress(); showToast('Marked as No Error'); });
}
function renderCorrectionInputs(q){
  const holder=document.getElementById('corr-inputs-'+q.id); if(!holder) return;
  const ans=currentTest.answers[q.id]; if(!ans || !ans.selected?.length){ holder.innerHTML=''; return; }
  holder.innerHTML = ans.selected.map(segId=>{
    const seg=(q.data?.multiErrorSegments||[]).find(s=>s.id===segId);
    if(!seg) return '';
    return `<label class="field-label">Correction for “${esc(seg.text)}”</label><input class="correction-input" data-corr="${segId}" data-q="${q.id}" placeholder="Type the correct form…" value="${esc(ans.corrections?.[segId]||'')}" />`;
  }).join('');
  $$('.correction-input', holder).forEach(inp=> inp.addEventListener('input', e=>{
    const qid=e.target.dataset.q; const sid=e.target.dataset.corr;
    if(!currentTest.answers[qid]) currentTest.answers[qid]={selected:[], corrections:{}, noError:false};
    currentTest.answers[qid].corrections[sid]=e.target.value;
    updateProgress();
  }));
}
function explanationHTML(q){
  const ex=q.explanation; if(!ex) return '';
  return `<div class="explanation"><h4><span class="material-symbols-outlined">lightbulb</span> Explanation ${ex.topic? '• '+esc(ex.topic):''}</h4><p>${ex.text||''}</p>${ex.formula?`<p><b>Formula:</b> ${ex.formula}</p>`:''}${ex.concept?`<p><b>Concept:</b> ${esc(ex.concept)}</p>`:''}${ex.examples?.length?`<p><b>Examples:</b></p><ul>${ex.examples.map(e=>`<li>${e}</li>`).join('')}</ul>`:''}<div class="meta">${ex.topic?`<span>${esc(ex.topic)}</span>`:''}${ex.concept?`<span>${esc(ex.concept)}</span>`:''}</div></div>`;
}
function updateProgress(){
  if(!currentTest) return;
  const answered=currentTest.questions.filter(q=>{
    const a=currentTest.answers[q.id];
    if(q.type==='multiple_choice') return !!a;
    if(q.type==='correction') return a && (a.noError || a.selected?.length);
    return !!a;
  }).length;
  $('#progressPill').textContent=`${answered} / ${currentTest.questions.length} answered`;
  $('#progressFill').style.width=`${Math.round(answered/currentTest.questions.length*100)}%`;
}
function checkMCQ(q, chosen){
  if(!chosen) return false;
  const opt=q.options?.[chosen]; return !!opt?.correct;
}
function checkCorrection(q, ans){
  if(!ans) return false;
  const trueErrors=(q.data?.multiErrorSegments||[]).filter(s=>s.isError);
  if(trueErrors.length===0) return !!ans.noError;
  if(ans.noError) return false;
  if((ans.selected||[]).length!==trueErrors.length) return false;
  // Every selected must be a true error and correction must match one accepted answer
  for(const seg of trueErrors){
    if(!(ans.selected||[]).includes(seg.id)) return false;
    const typed=norm(ans.corrections?.[seg.id]);
    const accepted=(seg.correctAnswers||[]).map(norm);
    if(!accepted.includes(typed)) return false;
  }
  return true;
}
function submitTest(){
  if(!currentTest) return;
  const unanswered=currentTest.questions.filter(q=> !currentTest.answers[q.id] && !(q.type==='correction' && currentTest.answers[q.id]));
  // Require all answered? Allow submit with warning
  const doSubmit=()=>{
    stopTimer();
    let correct=0; const rows=[];
    currentTest.questions.forEach((q,i)=>{
      let isCorrect=false, detail='';
      if(q.type==='multiple_choice'){ isCorrect=checkMCQ(q, currentTest.answers[q.id]); detail=`Your answer: ${currentTest.answers[q.id]||'—'} • Correct: ${Object.entries(q.options||{}).filter(([_,o])=>o.correct).map(([k])=>k).join(', ')}`; }
      else { isCorrect=checkCorrection(q, currentTest.answers[q.id]); const trueErr=(q.data?.multiErrorSegments||[]).filter(s=>s.isError); detail=trueErr.length? `Errors: ${trueErr.map(s=>s.text+' → '+(s.correctAnswers||[]).join(' / ')).join(' • ')}` : 'No error'; }
      if(isCorrect) correct++;
      rows.push({q, i, isCorrect, detail});
    });
    const pct=Math.round(correct/currentTest.questions.length*100);
    const history=JSON.parse(localStorage.getItem('cat_history')||'[]');
    history.unshift({title:currentTest.meta.title, date:new Date().toISOString().slice(0,10), score:`${correct}/${currentTest.questions.length}`, pct, difficulty:currentTest.difficulty});
    localStorage.setItem('cat_history', JSON.stringify(history.slice(0,10)));
    const resultEl=$('#testResult');
    resultEl.style.display='block';
    resultEl.innerHTML=`
      <div class="score-hero"><p>Your score</p><h2>${correct} / ${currentTest.questions.length} • ${pct}%</h2><p>${pct>=80?'Excellent work!':pct>=60?'Good job — keep practising.':'Keep practising — review the explanations below.'} • ${esc(currentTest.meta.title||'Test')}</p><div style="margin-top:14px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button class="btn btn-primary" id="retakeBtn"><span class="material-symbols-outlined">refresh</span> Retake</button><button class="btn" style="background:#fff;color:#111827" id="backDashBtn">Back to Dashboard</button></div></div>
      <h3>Review</h3>
      ${rows.map(r=>`<div class="result-row ${r.isCorrect?'correct':'wrong'}"><div><b>Q${r.i+1}.</b> ${esc(r.q.data?.question || (r.q.type==='correction' ? 'Correction question' : ''))}<div class="tiny muted">${r.detail}</div>${r.q.explanation? `<div class="tiny" style="margin-top:6px">${r.q.explanation.text||''}</div>`:''}</div><span class="pill ${r.isCorrect?'pill-success':'pill-muted'}">${r.isCorrect?'Correct':'Wrong'}</span></div>`).join('')}
    `;
    $('#testActive').style.display='none';
    $('#retakeBtn').onclick=()=>{ $('#testResult').style.display='none'; startTest(); };
    $('#backDashBtn').onclick=()=>{ currentTest=null; showView('dashboard'); };
    window.scrollTo({top:0});
    showToast(`Score: ${correct}/${currentTest.questions.length} (${pct}%)`);
  };
  if(unanswered.length){
    showModal('Submit with unanswered?', `<p>You have <b>${unanswered.length}</b> unanswered question(s). Submit anyway?</p>`, `<button class="btn" data-close>Keep answering</button><button class="btn btn-primary" id="confirmSubmit">Submit anyway</button>`);
    $('#confirmSubmit').onclick=()=>{ closeModal(); doSubmit(); };
  } else doSubmit();
}

/* ---------- Dashboard ---------- */
function renderDashboard(){
  if(!currentUser) return;
  const pool=getPool();
  const history=JSON.parse(localStorage.getItem('cat_history')||'[]');
  const totalTests=history.length;
  const avg = totalTests? Math.round(history.reduce((s,h)=>s+h.pct,0)/totalTests):0;
  $('#statsGrid').innerHTML=`
    <div class="stat"><div class="stat-icon"><span class="material-symbols-outlined">quiz</span></div><div><b>${pool.length}</b><br><span>Questions in bank</span></div></div>
    <div class="stat"><div class="stat-icon"><span class="material-symbols-outlined">history</span></div><div><b>${totalTests}</b><br><span>Tests taken</span></div></div>
    <div class="stat"><div class="stat-icon"><span class="material-symbols-outlined">star</span></div><div><b>${avg}%</b><br><span>Average score</span></div></div>
    <div class="stat"><div class="stat-icon"><span class="material-symbols-outlined">folder_open</span></div><div><b>${(CFG.materials||[]).length}</b><br><span>Materials</span></div></div>
  `;
  $('#materialsPreview').innerHTML=(CFG.materials||[]).slice(0,3).map(m=> materialRow(m)).join('') || '<p class="muted">No materials yet.</p>';
  $$('#materialsPreview [data-open-material]').forEach(b=> b.onclick=()=> openMaterial(b.dataset.openMaterial));
  $('#historyList').innerHTML= history.length? history.map(h=>`<div class="list-item"><div><h4>${esc(h.title)}</h4><p>${h.date} • ${h.difficulty}</p></div><span class="pill ${h.pct>=70?'pill-success':'pill-muted'}">${h.score} • ${h.pct}%</span></div>`).join('') : '<p class="muted">No tests yet. Start your first test above.</p>';
  updatePreview();
}
function materialRow(m){
  const icon = m.type==='pdf' ? 'picture_as_pdf' : m.type==='image' ? 'image' : m.type==='markdown' ? 'article' : 'description';
  return `<div class="list-item"><div style="display:flex;gap:10px;align-items:center"><span class="material-symbols-outlined" style="color:#4f46e5">${icon}</span><div><h4>${esc(m.title)}</h4><p>${esc(m.description||'')} • ${esc(m.type||'').toUpperCase()}</p></div></div><button class="btn btn-sm" data-open-material="${esc(m.file)}">Open</button></div>`;
}

/* ---------- Materials ---------- */
function renderMaterials(){
  const grid=$('#materialsGrid');
  const mats=(CFG.materials||[]).filter(m=>{
    if(materialFilter!=='all'){
      if(materialFilter==='image' && m.type!=='image') return false;
      if(materialFilter==='pdf' && m.type!=='pdf') return false;
      if(materialFilter==='text' && m.type!=='text') return false;
      if(materialFilter==='markdown' && m.type!=='markdown') return false;
    }
    if(materialQuery && !(m.title+' '+ (m.description||'')).toLowerCase().includes(materialQuery)) return false;
    return true;
  });
  if(!mats.length){ grid.innerHTML='<p class="muted">No materials match.</p>'; return; }
  grid.innerHTML=mats.map(m=>{
    const thumb = m.type==='image' ? `<img src="./materials/${esc(m.file)}" alt="${esc(m.title)}" onerror="this.parentElement.innerHTML='<span class=\\'material-symbols-outlined\\'>image</span>'" />` : `<span class="material-symbols-outlined">${m.type==='pdf'?'picture_as_pdf': m.type==='markdown'?'article':'description'}</span>`;
    return `<div class="mat-card"><div class="mat-thumb">${thumb}</div><div class="mat-body"><h4>${esc(m.title)}</h4><p>${esc(m.description||'')}</p></div><div class="mat-foot"><span class="pill pill-muted">${esc(m.type||'').toUpperCase()}</span><button class="btn btn-primary btn-sm" data-open-material="${esc(m.file)}">Open</button></div></div>`;
  }).join('');
  $$('[data-open-material]', grid).forEach(b=> b.onclick=()=> openMaterial(b.dataset.openMaterial));
}
async function openMaterial(file){
  const m=(CFG.materials||[]).find(x=>x.file===file); if(!m) return;
  const url='./materials/'+file;
  let body='';
  if(m.type==='pdf'){
    body=`<div class="viewer"><iframe src="${url}" title="${esc(m.title)}"></iframe><p class="tiny muted" style="margin-top:8px"><a href="${url}" target="_blank" rel="noopener">Open PDF in new tab</a></p></div>`;
  } else if(m.type==='image'){
    body=`<div class="viewer"><img src="${url}" alt="${esc(m.title)}" /><p class="tiny muted" style="margin-top:8px"><a href="${url}" target="_blank" rel="noopener">Open image in new tab</a></p></div>`;
  } else {
    try{
      const r=await fetch(url); const text=await r.text();
      if(m.type==='markdown') body=`<div class="viewer md-preview">${mdToHtml(text)}</div>`;
      else body=`<div class="viewer"><pre>${esc(text)}</pre></div>`;
    }catch{ body=`<p>Could not load file.</p>`; }
  }
  showModal(`${esc(m.title)}`, body, `<a class="btn" href="${url}" target="_blank" rel="noopener">Open in new tab</a><button class="btn btn-primary" data-close>Close</button>`);
}
function mdToHtml(md){
  let h=esc(md);
  h=h.replace(/^### (.*)$/gm,'<h3>$1</h3>').replace(/^## (.*)$/gm,'<h2>$1</h2>').replace(/^# (.*)$/gm,'<h1>$1</h1>').replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/^- (.*)$/gm,'<li>$1</li>').replace(/\n/g,'<br>');
  return h;
}

/* ---------- Admin (SUPER ONLY) ---------- */
function renderAdmin(){
  if(!can('canViewAdmin')) return;
  // Never show password hashes
  const safeConfig={...CFG}; delete safeConfig.secrets;
  $('#adminConfig').textContent=JSON.stringify(safeConfig, null, 2);
  $('#adminRoles').textContent=JSON.stringify(ROLES, null, 2);
  const total=Object.values(questionFiles).reduce((s,d)=> s+(d.questions?.length||0),0);
  const byDiff={easy:0, intermediate:0, advanced:0};
  Object.values(questionFiles).forEach(d=> (d.questions||[]).forEach(q=> byDiff[levelToDiff(q.config?.level)]++));
  $('#adminStats').innerHTML=`<div class="list"><div class="list-item"><div><h4>Total questions</h4><p>Across ${Object.keys(questionFiles).length} file(s) in /questions/</p></div><b>${total}</b></div><div class="list-item"><div><h4>By difficulty</h4><p>Easy / Intermediate / Advanced</p></div><b>${byDiff.easy} / ${byDiff.intermediate} / ${byDiff.advanced}</b></div></div>`;
  $('#adminUsers').innerHTML=(USERS.users||[]).map(u=>`<div class="list-item"><div><h4>${esc(u.name||u.username)} — @${esc(u.username)}</h4><p>Role: ${esc(u.role)} • ${u.active===false?'Inactive':'Active'}</p></div><span class="pill pill-muted">${esc(u.role)}</span></div>`).join('');
}
