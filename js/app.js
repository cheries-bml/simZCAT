// CAT Learning - static, JSON-only, GET-only. No POST. No DB.
// Data: data/config.json, data/roles.json, data/users.json, data/materials.json
// Questions: questions/index.json -> questions/*.json
// Updates: edit JSON in GitHub, commit + push. App never writes.
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
let CONFIG={}, ROLES=[], USERS=[], MATERIALS=[], QINDEX=[];
let user=null, perms=new Set();
let testFiles=[]; // {file,title,subject,data}
let curTest=null, curIdx=0, answers={}, timerId=null, timeLeft=0, testPace='normal', testTitle='';
let teachData=null, teachIdx=0, teachReveal={ans:false,exp:false};
let genPool=[];

const esc = s => String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
async function getJSON(p){ const r=await fetch(p+'?v='+Date.now(),{method:'GET',cache:'no-store'}); if(!r.ok) throw new Error(p+' '+r.status); return r.json(); }
async function sha256(t){ const b=await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join(''); }
const norm = s => String(s||'').toLowerCase().trim().replace(/[.\s]+$/,'').replace(/\s+/g,' ');
function levelOf(q){ return q?.config?.level ?? 3; }
function levelLabel(l){ return l<=2?'Easy':l===3?'Intermediate':'Advanced'; }
function levelClass(l){ return l<=2?'easy':l===3?'mid':'adv'; }
function hasPerm(p){ return perms.has(p); }
function showView(name){
  $$('.view').forEach(v=>v.classList.add('hidden'));
  const el=$('#view-'+name); if(el) el.classList.remove('hidden');
  $$('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.view===name));
  const titles={dashboard:['Dashboard','Overview'],tests:['Take Test','Choose a test'],teach:['Teach','Discuss questions'],materials:['Materials','Teacher files'],generator:['Generate Test','Build from question bank'],system:['System','Super only']};
  if(titles[name]){ $('#pageTitle').textContent=titles[name][0]; $('#pageSub').textContent=titles[name][1]; }
  $('.sidebar')?.classList.remove('open');
  window.scrollTo(0,0);
}
function applyPerms(){
  $$('.nav-btn').forEach(b=>{ const p=b.dataset.perm; if(p && !hasPerm(p)) b.style.display='none'; else b.style.display='flex'; });
  if(user){
    $('#userNameLabel').textContent=user.name; $('#userNameSub').textContent='@'+user.username+' • '+user.role;
    $('#helloName').textContent=user.name.split(' ')[0]; $('#avatarLetter').textContent=(user.name[0]||'U').toUpperCase();
    $('#userRoleLabel').textContent=ROLES.find(r=>r.id===user.role)?.label||user.role;
  }
}
async function loadAll(){
  try{
    CONFIG=await getJSON('data/config.json');
    ROLES=(await getJSON('data/roles.json')).roles||[];
    USERS=(await getJSON('data/users.json')).users||[];
    MATERIALS=(await getJSON('data/materials.json')).materials||[];
    QINDEX=(await getJSON('questions/index.json')).files||[];
    // preload question files (GET only)
    testFiles=[];
    for(const f of QINDEX){
      try{ const d=await getJSON(f.file); testFiles.push({file:f.file,title:d.meta?.title||f.title,subject:f.subject||'',data:d}); }catch(e){ console.warn(e); }
    }
    $('#statTests').textContent=String(testFiles.length);
    renderTestLists(); renderMaterials(); renderGeneratorSources();
  }catch(e){ console.error(e); const pill=$('#statusPill'); if(pill) pill.textContent='● Data error'; const le=$('#loginError'); if(le && !USERS.length){ le.textContent='Cannot load JSON data. Open via http server / GitHub Pages, not file://.'; le.classList.remove('hidden'); } }
}
// LOGIN
$('#loginForm')?.addEventListener('submit', async e=>{
  e.preventDefault();
  const u=$('#username').value.trim().toLowerCase(), p=$('#password').value;
  const err=$('#loginError'); err.classList.add('hidden');
  if(!USERS.length){ try{ await loadAll(); }catch{} }
  if(!USERS.length){
    err.textContent='Cannot load data/users.json. Do not open via file:// — run: python3 -m http.server 8000, or use GitHub Pages.';
    err.classList.remove('hidden'); return;
  }
  const found=USERS.find(x=>x.username.toLowerCase()===u && x.active!==false);
  if(!found){ err.textContent='Invalid username or password.'; err.classList.remove('hidden'); return; }
  const h=await sha256(p);
  if(h!==found.passwordHash){ err.textContent='Invalid username or password. Check caps / spelling.'; err.classList.remove('hidden'); return; }
  user={username:found.username,name:found.name,role:found.role};
  const role=ROLES.find(r=>r.id===user.role); perms=new Set(role?.permissions||[]);
  sessionStorage.setItem('cat_user', JSON.stringify(user));
  $('#loginView').classList.add('hidden'); $('#appView').classList.remove('hidden');
  applyPerms(); showView('dashboard');
});
$('#logoutBtn')?.addEventListener('click', ()=>{ sessionStorage.removeItem('cat_user'); user=null; location.reload(); });
$('#menuBtn')?.addEventListener('click', ()=>$('.sidebar').classList.toggle('open'));
$$('.nav-btn').forEach(b=>b.addEventListener('click', ()=>{ if(hasPerm(b.dataset.perm||'take_test')||b.dataset.view==='dashboard'||b.dataset.view==='system'&&hasPerm('view_system')) showView(b.dataset.view); else if(b.dataset.view==='dashboard') showView('dashboard'); else showView(b.dataset.view); }));
$$('[data-goto]').forEach(b=>b.addEventListener('click', ()=>showView(b.dataset.goto)));
// TEST LIST
function renderTestLists(){
  const html=testFiles.map((t,i)=>`<div class="row-item"><div><strong>${esc(t.title)}</strong><span>${esc(t.subject)} • ${t.data.questions?.length||0} questions • ${esc(t.data.meta?.description||'')}</span></div><div style="display:flex;gap:8px"><span class="badge">${esc(t.subject||'Test')}</span><button class="btn small primary" data-start="${i}">Start</button></div></div>`).join('')||'<p class="muted">No test files. Add JSON to /questions/ and list in questions/index.json</p>';
  $('#testList').innerHTML=html; $('#dashTests').innerHTML=html;
  $$('[data-start]').forEach(b=>b.addEventListener('click', ()=>startTest(testFiles[+b.dataset.start], {pace:testPace})));
}
function startTest(file, opts={}){
  const qs=[...(file.data.questions||[])]; if(!qs.length) return alert('No questions in this file.');
  const pace=opts.pace||CONFIG.timer?.defaultPace||'normal';
  testPace=pace; testTitle=file.title;
  curTest={file:file.file,title:file.title,meta:file.data.meta,questions:qs};
  curIdx=0; answers={};
  const total=qs.reduce((s,q)=>s+((q.config?.time_in_seconds?.[pace])||30),0);
  timeLeft=total;
  $('#testRunner').classList.remove('hidden'); $('#resultBox').classList.add('hidden');
  $('#runnerTitle').textContent=file.title; $('#runnerMeta').textContent=(file.data.meta?.description||'')+' • '+qs.length+' questions';
  showView('tests'); startTimer(); renderQuestion();
}
function startTimer(){
  clearInterval(timerId);
  if(curTest?.meta?.config?.no_timer){ $('#timerText').textContent='No timer'; return; }
  const tick=()=>{ const m=Math.floor(timeLeft/60), s=timeLeft%60; $('#timerText').textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0'); if(timeLeft<=0){ clearInterval(timerId); finishTest(true); } timeLeft--; };
  tick(); timerId=setInterval(tick,1000);
}
function renderQuestion(){
  const q=curTest.questions[curIdx]; if(!q) return;
  const total=curTest.questions.length;
  $('#progressBar').style.width=((curIdx+1)/total*100)+'%';
  $('#progressText').textContent=`Question ${curIdx+1} of ${total} • ${levelLabel(levelOf(q))} • Level ${levelOf(q)}`;
  $('#qDots').innerHTML=curTest.questions.map((_,i)=>`<button class="dot ${i===curIdx?'active':''} ${answers[i]!==undefined?'answered':''}" data-dot="${i}">${i+1}</button>`).join('');
  $$('[data-dot]').forEach(b=>b.addEventListener('click', ()=>{ curIdx=+b.dataset.dot; renderQuestion(); }));
  let inner=`<span class="badge ${levelClass(levelOf(q))}">${levelLabel(levelOf(q))}</span> <span class="badge">${esc(q.type)}</span>`;
  if(q.data?.hint) inner+=`<div class="hint">💡 ${esc(q.data.hint)}</div>`;
  if(q.data?.passage) inner+=`<div class="passage">${q.data.passage}</div>`;
  if(q.data?.question) inner+=`<h3 style="margin:14px 0 6px">${q.data.question}</h3>`;
  if(q.data?.image?.url) inner+=`<img src="${q.data.image.url}" alt="" style="max-width:100%;border-radius:12px;margin:8px 0">`;
  if(q.type==='multiple_choice'){
    const opts=q.options||{}; const keys=Object.keys(opts);
    const correctCount=keys.filter(k=>opts[k].correct).length;
    const multi=correctCount>1;
    inner+=`<p class="muted small">${multi?'Select all that apply':'Select one answer'}</p>`;
    inner+=keys.map(k=>{ const sel=answers[curIdx]; const checked=multi?(sel||[]).includes(k):sel===k; return `<label class="opt ${checked?'selected':''}"><input type="${multi?'checkbox':'radio'}" name="q${curIdx}" value="${k}" ${checked?'checked':''}><span><strong>${k}.</strong> ${opts[k].text}</span></label>`; }).join('');
  } else if(q.type==='correction'){
    const segs=q.multiErrorSegments||[];
    inner+=`<p class="muted small">Tap a highlighted part to mark it as an error, then type the correction. If no error, choose No Error.</p><div class="passage" id="segRow">`+segs.map(s=> s.clickable? `<span class="seg clickable ${(answers[curIdx]?.selected||[]).includes(s.id)?'selected':''}" data-seg="${s.id}">${esc(s.text)}</span>` : `<span class="seg">${esc(s.text)}</span>`).join(' ')+`</div>`;
    inner+=`<div id="corrInputs"></div><button class="btn small" id="noErrorBtn" style="margin-top:8px">${answers[curIdx]?.noError?'✓ No Error selected':'Choose No Error'}</button>`;
  } else {
    inner+=`<p class="muted">Unsupported type: ${esc(q.type)}</p>`;
  }
  $('#questionBox').innerHTML=inner;
  // MC handlers
  $$('#questionBox input[name="q'+curIdx+'"]').forEach(inp=>inp.addEventListener('change', ()=>{
    if(inp.type==='checkbox'){ const cur=new Set(answers[curIdx]||[]); inp.checked?cur.add(inp.value):cur.delete(inp.value); answers[curIdx]=[...cur]; }
    else answers[curIdx]=inp.value;
    renderQuestion();
  }));
  // Correction handlers
  $$('#questionBox .seg.clickable').forEach(el=>el.addEventListener('click', ()=>{
    const id=el.dataset.seg; const cur=answers[curIdx]||{selected:[],corrections:{},noError:false};
    cur.noError=false; cur.selected=cur.selected.includes(id)?cur.selected.filter(x=>x!==id):[...cur.selected,id];
    if(!cur.selected.includes(id)) delete cur.corrections[id];
    answers[curIdx]=cur; renderQuestion();
  }));
  const corrDiv=$('#corrInputs');
  if(corrDiv && q.type==='correction'){
    const cur=answers[curIdx]||{selected:[],corrections:{}};
    corrDiv.innerHTML=(cur.selected||[]).map(id=>{ const seg=(q.multiErrorSegments||[]).find(s=>s.id===id); return `<div class="corr-input"><label>Correction for “${esc(seg?.text||id)}”<input data-corr="${id}" placeholder="Type correct form…" value="${esc(cur.corrections?.[id]||'')}"></label></div>`; }).join('');
    $$('[data-corr]').forEach(inp=>inp.addEventListener('input', ()=>{ const c=answers[curIdx]||{selected:[],corrections:{}}; c.corrections=c.corrections||{}; c.corrections[inp.dataset.corr]=inp.value; answers[curIdx]=c; }));
  }
  $('#noErrorBtn')?.addEventListener('click', ()=>{ answers[curIdx]={selected:[],corrections:{},noError:true}; renderQuestion(); });
  $('#prevBtn').onclick=()=>{ if(curIdx>0){curIdx--; renderQuestion();} };
  $('#nextBtn').onclick=()=>{ if(curIdx<curTest.questions.length-1){curIdx++; renderQuestion();} };
}
function scoreQuestion(q, ans){
  if(q.type==='multiple_choice'){
    const correct=Object.keys(q.options||{}).filter(k=>q.options[k].correct);
    if(correct.length>1){ const sel=[...(ans||[])].sort(); return JSON.stringify(sel)===JSON.stringify([...correct].sort()); }
    return ans===correct[0];
  }
  if(q.type==='correction'){
    const segs=q.multiErrorSegments||[]; const trueErrors=segs.filter(s=>s.clickable&&s.isError).map(s=>s.id).sort();
    if((ans?.noError)){ return trueErrors.length===0; }
    const sel=[...(ans?.selected||[])].sort(); if(JSON.stringify(sel)!==JSON.stringify(trueErrors)) return false;
    for(const id of trueErrors){ const seg=segs.find(s=>s.id===id); const typed=norm(ans?.corrections?.[id]||''); const ok=(seg.correctAnswers||[]).some(c=>norm(c)===typed); if(!ok) return false; }
    return true;
  }
  return false;
}
function correctText(q){
  if(q.type==='multiple_choice'){ return Object.keys(q.options||{}).filter(k=>q.options[k].correct).map(k=>k+'. '+q.options[k].text).join(' • '); }
  if(q.type==='correction'){ const segs=q.multiErrorSegments||[]; const errs=segs.filter(s=>s.isError); if(!errs.length) return 'No Error'; return errs.map(s=>`“${s.text}” → ${(s.correctAnswers||[]).join(' / ')}`).join(' • '); }
  return '';
}
$('#finishBtn')?.addEventListener('click', ()=>finishTest(false));
function finishTest(auto=false){
  clearInterval(timerId);
  const qs=curTest.questions; let score=0; const rows=qs.map((q,i)=>{ const ok=scoreQuestion(q, answers[i]); if(ok) score++; return {q,ok,ans:answers[i]}; });
  const pct=Math.round(score/qs.length*100);
  $('#testRunner').classList.add('hidden');
  const box=$('#resultBox'); box.classList.remove('hidden');
  box.innerHTML=`<h3>${auto?'Time up — ':'Finished — '} ${score} / ${qs.length} correct (${pct}%)</h3><p class="muted">${esc(testTitle)}</p><div class="row"><button class="btn primary" id="reviewBtn">Review with explanations</button><button class="btn" id="retakeBtn">Retake</button></div><div class="list" style="margin-top:14px">${rows.map((r,i)=>`<div class="row-item"><div><strong>Q${i+1}. ${r.ok?'✓ Correct':'✗ Incorrect'}</strong><span>${esc(r.q.data?.question||r.q.type)} • Correct: ${esc(correctText(r.q))}</span></div><span class="badge ${r.ok?'easy':'adv'}">${r.ok?'Correct':'Review'}</span></div>`).join('')}</div><div id="reviewDetail"></div>`;
  $('#retakeBtn').onclick=()=>{ const f=testFiles.find(x=>x.file===curTest.file); if(f) startTest(f,{pace:testPace}); };
  $('#reviewBtn').onclick=()=>{ $('#reviewDetail').innerHTML=rows.map((r,i)=>`<div class="card"><h4>Q${i+1} — ${r.ok?'✓':'✗'} ${esc(r.q.data?.question||'Correction question')}</h4>${r.q.data?.passage?`<div class="passage">${r.q.data.passage}</div>`:''}${r.q.type==='correction'?`<div class="passage">${(r.q.multiErrorSegments||[]).map(s=>`<span class="seg ${s.isError?'correct':''}">${esc(s.text)}</span>`).join(' ')}</div>`:''}<p><strong>Correct:</strong> ${esc(correctText(r.q))}</p>${explainHTML(r.q)}</div>`).join(''); };
}
function explainHTML(q){
  const e=q.explanation; if(!e) return '';
  return `<div class="explain"><h5>Explanation${e.topic?' • '+esc(e.topic):''}</h5><p>${e.text||''}</p>${e.concept?`<p><strong>Concept:</strong> ${esc(e.concept)}</p>`:''}${e.formula?`<div class="formula">${esc(e.formula)}</div>`:''}${e.examples?.length?`<p><strong>Examples:</strong></p><ul>${e.examples.map(x=>`<li>${x}</li>`).join('')}</ul>`:''}</div>`;
}
// TEACH
function renderTeachSelect(){
  $('#teachFile').innerHTML=testFiles.map((t,i)=>`<option value="${i}">${esc(t.title)} (${t.data.questions?.length||0})</option>`).join('');
}
$('#teachLoad')?.addEventListener('click', ()=>{
  const t=testFiles[+$('#teachFile').value]; if(!t) return;
  teachData=t.data; teachIdx=0; teachReveal={ans:false,exp:false}; renderTeach();
});
function renderTeach(){
  const q=teachData.questions[teachIdx]; const total=teachData.questions.length;
  $('#teachBox').classList.remove('hidden'); $('#teachNav').classList.remove('hidden');
  $('#teachCount').textContent=`Question ${teachIdx+1} of ${total}`;
  let h=`<span class="badge ${levelClass(levelOf(q))}">${levelLabel(levelOf(q))}</span> <span class="badge">${esc(q.type)}</span>`;
  if(q.data?.hint) h+=`<div class="hint">💡 ${esc(q.data.hint)}</div>`;
  if(q.data?.passage) h+=`<div class="passage">${q.data.passage}</div>`;
  if(q.data?.question) h+=`<h3>${q.data.question}</h3>`;
  if(q.type==='multiple_choice') h+=Object.keys(q.options||{}).map(k=>`<div class="opt"><span><strong>${k}.</strong> ${q.options[k].text}</span>${teachReveal.ans && q.options[k].correct?' <span class="badge easy">✓ Correct</span>':''}</div>`).join('');
  if(q.type==='correction') h+=`<div class="passage">${(q.multiErrorSegments||[]).map(s=> s.clickable? `<span class="seg clickable ${teachReveal.ans&&s.isError?'correct':''}">${esc(s.text)}</span>` : `<span class="seg">${esc(s.text)}</span>`).join(' ')}</div><p class="muted small">Click Reveal to show which parts are errors.</p>`;
  h+=`<div class="row" style="margin-top:12px"><button class="btn primary" id="revealAns">👁 Reveal answer</button><button class="btn" id="revealExp">📖 Reveal explanation</button><button class="btn" id="resetReveal">Reset</button></div>`;
  if(teachReveal.ans) h+=`<div class="explain"><h5>Answer</h5><p>${esc(correctText(q))}</p></div>`;
  if(teachReveal.exp) h+=explainHTML(q);
  $('#teachBox').innerHTML=h;
  $('#revealAns').onclick=()=>{teachReveal.ans=true; renderTeach();};
  $('#revealExp').onclick=()=>{teachReveal.exp=true; renderTeach();};
  $('#resetReveal').onclick=()=>{teachReveal={ans:false,exp:false}; renderTeach();};
  $('#teachPrev').onclick=()=>{ if(teachIdx>0){teachIdx--; teachReveal={ans:false,exp:false}; renderTeach();} };
  $('#teachNext').onclick=()=>{ if(teachIdx<total-1){teachIdx++; teachReveal={ans:false,exp:false}; renderTeach();} };
}
// MATERIALS
function renderMaterials(){
  const q=($('#matSearch').value||'').toLowerCase(), t=$('#matType').value;
  const list=MATERIALS.filter(m=> (!t||m.type===t) && (!q || m.title.toLowerCase().includes(q)));
  $('#matList').innerHTML=list.map((m,i)=>`<div class="card"><span class="badge">${esc(m.type.toUpperCase())}</span><h4 style="margin-top:8px">${esc(m.title)}</h4><p class="muted small">${esc(m.subject||'')} • ${esc(m.file)}</p>${(m.type==='png'||m.type==='jpg')?`<img class="mat-thumb" src="${m.file}" alt="">`:''}<button class="btn small primary" data-mat="${MATERIALS.indexOf(m)}">Open →</button></div>`).join('')||'<p class="muted">No materials. Add files to /materials/ and list in data/materials.json</p>';
  $$('[data-mat]').forEach(b=>b.addEventListener('click', ()=>openMaterial(MATERIALS[+b.dataset.mat])));
}
$('#matSearch')?.addEventListener('input', renderMaterials); $('#matType')?.addEventListener('change', renderMaterials);
async function openMaterial(m){
  const v=$('#matViewer'); v.classList.remove('hidden'); v.scrollIntoView({behavior:'smooth'});
  if(m.type==='pdf') v.innerHTML=`<h4>${esc(m.title)}</h4><iframe class="viewer-frame" src="${m.file}"></iframe><p><a class="btn small" href="${m.file}" target="_blank" rel="noopener">Open in new tab ↗</a></p>`;
  else if(m.type==='png'||m.type==='jpg'||m.type==='jpeg') v.innerHTML=`<h4>${esc(m.title)}</h4><img src="${m.file}" style="max-width:100%;border-radius:12px"><p><a class="btn small" href="${m.file}" target="_blank" rel="noopener">Open full image ↗</a></p>`;
  else if(m.type==='txt'||m.type==='md'){ try{ const txt=await (await fetch(m.file)).text(); const html=m.type==='md'?mdToHtml(txt):`<pre style="white-space:pre-wrap">${esc(txt)}</pre>`; v.innerHTML=`<h4>${esc(m.title)}</h4><div class="md-body">${html}</div>`; }catch{ v.innerHTML=`<p>Could not load file.</p>`; } }
  else v.innerHTML=`<h4>${esc(m.title)}</h4><p><a class="btn" href="${m.file}" target="_blank" rel="noopener">Download / open file</a></p>`;
}
function mdToHtml(t){
  return esc(t).split('\n').map(l=>{
    if(l.startsWith('### ')) return `<h3>${l.slice(4)}</h3>`;
    if(l.startsWith('## ')) return `<h2>${l.slice(3)}</h2>`;
    if(l.startsWith('# ')) return `<h1>${l.slice(2)}</h1>`;
    if(l.startsWith('- ')) return `<li>${l.slice(2).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')}</li>`;
    if(!l.trim()) return '<br>';
    return `<p>${l.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')}</p>`;
  }).join('');
}
// GENERATOR
function renderGeneratorSources(){
  renderTeachSelect();
  const sel=$('#genSource'); sel.innerHTML='<option value="__all__">All files</option>'+testFiles.map(t=>`<option value="${t.file}">${esc(t.title)}</option>`).join('');
}
$('#genBtn')?.addEventListener('click', ()=>{
  const src=$('#genSource').value, diff=$('#genLevel').value, n=parseInt($('#genCount').value||'10',10), pace=$('#genPace').value;
  let pool=[];
  for(const t of testFiles){ if(src!=='__all__' && t.file!==src) continue; for(const q of (t.data.questions||[])) pool.push({q, file:t.file, title:t.title}); }
  if(diff!=='mixed'){ pool=pool.filter(x=> diff==='easy'?levelOf(x.q)<=2 : diff==='intermediate'?levelOf(x.q)===3 : levelOf(x.q)>=4); }
  const shuffled=[...pool].sort(()=>Math.random()-0.5);
  const picked=shuffled.slice(0, Math.min(n, shuffled.length));
  genPool=picked;
  $('#genInfo').textContent=`Found ${pool.length} matching • picked ${picked.length}`;
  const box=$('#genResult'); box.classList.remove('hidden');
  if(!picked.length){ box.innerHTML='<p>No questions match. Try Mixed or another source.</p>'; return; }
  box.innerHTML=`<h4>Generated test — ${esc(diff)} • ${picked.length} questions</h4><p class="muted">${picked.map(p=>`Q${p.q.id} (Lv ${levelOf(p.q)})`).join(' • ')}</p><button class="btn primary" id="genStart">▶ Start this test</button>`;
  $('#genStart').onclick=()=>{ const fake={file:'generated',title:`Generated — ${diff} (${picked.length} Q)`,data:{meta:{title:`Generated — ${diff}`,description:'Generated test',config:{no_timer:false}},questions:picked.map(p=>p.q)}}; startTest(fake,{pace}); };
});
// SYSTEM (super only)
function renderSystem(){
  if(!hasPerm('view_system')) return;
  $('#sysInfo').innerHTML=`<div class="sys-item"><strong>App</strong>${esc(CONFIG.appName||'CAT')} • v${esc(CONFIG.version||'')}</div><div class="sys-item"><strong>Role</strong>${esc(user.role)} • ${perms.size} permissions</div><div class="sys-item"><strong>Users</strong>${USERS.length} accounts</div><div class="sys-item"><strong>Materials</strong>${MATERIALS.length} files</div><div class="sys-item"><strong>Test files</strong>${testFiles.length} files • ${testFiles.reduce((s,t)=>s+(t.data.questions?.length||0),0)} questions</div><div class="sys-item"><strong>Mode</strong>Static • GET only • No DB</div>`;
  $('#sysFiles').innerHTML=[['data/config.json','Config'],['data/roles.json','Roles'],['data/users.json','Users (hashes)'],['data/materials.json','Materials'],['questions/index.json','Question index'],...testFiles.map(t=>[t.file, t.title])].map(([f,l])=>`<div class="row-item"><div><strong>${esc(l)}</strong><span>${esc(f)}</span></div><span class="badge">GET</span></div>`).join('');
}
function downloadJSON(name,obj){ const b=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download=name; a.click(); URL.revokeObjectURL(a.href); }
$('#dlConfig')?.addEventListener('click', ()=>downloadJSON('config.json',CONFIG));
$('#dlRoles')?.addEventListener('click', ()=>downloadJSON('roles.json',{roles:ROLES}));
$('#dlUsersSafe')?.addEventListener('click', ()=>downloadJSON('users.json',{users:USERS.map(u=>({username:u.username,name:u.name,role:u.role,active:u.active}))}));
// INIT
(async()=>{
  await loadAll(); renderSystem();
  const saved=sessionStorage.getItem('cat_user');
  if(saved){ try{ user=JSON.parse(saved); const r=ROLES.find(x=>x.id===user.role); perms=new Set(r?.permissions||[]); $('#loginView').classList.add('hidden'); $('#appView').classList.remove('hidden'); applyPerms(); showView('dashboard'); }catch{ sessionStorage.removeItem('cat_user'); } }
})();
