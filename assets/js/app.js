// app.js - routing, init, dashboard, wiring
function showView(name){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-'+name)?.classList.add('active');
  document.querySelectorAll('#mainNav button[data-view]').forEach(b=>b.classList.toggle('active', b.dataset.view===name));
  if(name==='admin') ADMIN.render();
  if(name==='materials') MATERIALS.renderList();
  if(name==='teach') {
    const canTeach = Auth.user?.role==='teacher' || Auth.user?.role==='super';
    document.getElementById('teachLocked').classList.toggle('hidden', canTeach);
    document.getElementById('teachContent').classList.toggle('hidden', !canTeach);
  }
  window.scrollTo({top:0, behavior:'smooth'});
}
function applyRoleUI(){
  const role=Auth.user?.role||'student';
  const isSuper = role==='super';
  const canTeach = role==='teacher' || isSuper;
  document.getElementById('navAdmin').style.display = isSuper ? 'flex' : 'none';
  document.getElementById('navTeach').style.display = canTeach ? 'flex' : 'none';
  document.getElementById('dashTeachBtn').style.display = canTeach ? 'inline-flex' : 'none';
  document.getElementById('rolePill').textContent = Auth.getRole(role).label;
  document.getElementById('userRoleLabel').textContent = role;
  document.getElementById('userName').textContent = Auth.user?.displayName || Auth.user?.username || '';
  document.getElementById('userAvatar').textContent = (Auth.user?.displayName||'U').charAt(0).toUpperCase();
  document.getElementById('teachRolePill').textContent = Auth.getRole(role).label + ' only';
}
async function initDashboard(){
  const cfg=Auth.config;
  document.getElementById('appName').textContent=cfg.appName||'CAT Learn';
  document.getElementById('appVersionPill').textContent='v'+(cfg.version||'1.0.0');
  document.getElementById('welcomeTitle').textContent='Welcome, '+(Auth.user?.displayName?.split(' ')[0]||Auth.user?.username||'')+' 👋';
  document.getElementById('welcomeSub').textContent='Role: '+Auth.getRole(Auth.user.role).label+' • '+cfg.tagline;
  // test list + stats
  const files=cfg.questionsFiles||[];
  document.getElementById('testList').innerHTML = files.map(f=>`<li><div><b>${esc(f.label||f.id)}</b><div class="meta">${esc(f.file)}</div></div><button class="btn btn-outline btn-sm" data-goto="cat">Open</button></li>`).join('') || '<li>No tests configured.</li>';
  // stats: count questions in first file + materials
  let qCount='—', matCount='—';
  try{ const d=await fetchJSON(files[0]?.file||'questions/sample-test.json'); qCount=d.questions?.length ?? '—'; }catch{}
  try{ const m=await fetchJSON('data/materials.json'); matCount=m.length; }catch{}
  document.getElementById('statGrid').innerHTML=`
    <div class="card"><div class="stat"><span class="stat-icon blue"><span class="material-symbols-outlined">quiz</span></span><div><h3>Questions</h3><div class="big">${qCount}</div><p>In first test file</p></div></div></div>
    <div class="card"><div class="stat"><span class="stat-icon green"><span class="material-symbols-outlined">folder_open</span></span><div><h3>Materials</h3><div class="big">${matCount}</div><p>PDF / image / text / MD</p></div></div></div>
    <div class="card"><div class="stat"><span class="stat-icon purple"><span class="material-symbols-outlined">school</span></span><div><h3>Teaching</h3><div class="big">${Auth.user?.role==='student'?'CAT':'Ready'}</div><p>${Auth.user?.role==='student'?'Teaching is teacher-only':'Answers + explanations'}</p></div></div></div>
    <div class="card"><div class="stat"><span class="stat-icon amber"><span class="material-symbols-outlined">shield</span></span><div><h3>Role</h3><div class="big">${esc(Auth.getRole(Auth.user.role).label)}</div><p>Admin is Super only</p></div></div></div>`;
  // CAT selects
  const catSel=document.getElementById('catTestFile');
  const teachSel=document.getElementById('teachTestFile');
  catSel.innerHTML=files.map(f=>`<option value="${esc(f.file)}">${esc(f.label||f.id)}</option>`).join('');
  teachSel.innerHTML=files.map(f=>`<option value="${esc(f.file)}">${esc(f.label||f.id)}</option>`).join('');
  await updateCatSetupInfo();
  await MATERIALS.load(); MATERIALS.renderList();
}
async function updateCatSetupInfo(){
  try{
    const file=document.getElementById('catTestFile').value;
    const diff=document.getElementById('catDifficulty').value;
    const data=await fetchJSON(file);
    CAT.meta=data.meta; CAT.allQuestions=data.questions||[];
    const pool=CAT.filtered(diff);
    const counts={easy:0, intermediate:0, advanced:0};
    for(const q of CAT.allQuestions) counts[levelToDifficulty(q.config?.level)]++;
    document.getElementById('catSetupInfoText').innerHTML=`<b>${esc(data.meta?.title||'Test')}</b> — ${esc(data.meta?.description||'')} • Total ${CAT.allQuestions.length} questions (Easy ${counts.easy} • Intermediate ${counts.intermediate} • Advanced ${counts.advanced}) • Filtered: <b>${pool.length}</b> for ${diff==='all'?'all levels':diffLabel(diff)}`;
  }catch(e){
    document.getElementById('catSetupInfoText').textContent='Could not load test file. Check config.json → questionsFiles.';
  }
}
async function startCAT(){
  const file=document.getElementById('catTestFile').value;
  const diff=document.getElementById('catDifficulty').value;
  const count=document.getElementById('catCount').value;
  try{
    await CAT.loadFile(file);
    const info=CAT.generate(diff, count);
    if(info.selected===0){ showToast('No questions for this difficulty. Try All levels.'); return; }
    document.getElementById('catSetupCard').classList.add('hidden');
    document.getElementById('catResultCard').classList.add('hidden');
    document.getElementById('catRunCard').classList.remove('hidden');
    CAT.renderRun(); CAT.startTimer();
    showToast('Test generated — '+info.selected+' questions');
  }catch(e){ showToast('Could not start test.'); }
}
document.addEventListener('DOMContentLoaded', async ()=>{
  // Nav
  document.querySelectorAll('#mainNav button[data-view]').forEach(b=>b.addEventListener('click', ()=>showView(b.dataset.view)));
  document.querySelectorAll('[data-goto]').forEach(b=>b.addEventListener('click', ()=>showView(b.dataset.goto)));
  document.getElementById('logoutBtn').addEventListener('click', ()=>{ Auth.logout(); location.reload(); });
  // Demo fill
  document.querySelectorAll('.demo-card').forEach(b=>b.addEventListener('click', ()=>{
    document.getElementById('username').value=b.dataset.user;
    document.getElementById('password').value=b.dataset.pass;
    document.getElementById('username').focus();
  }));
  // Login
  document.getElementById('loginForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const btn=document.getElementById('loginBtn');
    const err=document.getElementById('loginError');
    err.classList.add('hidden'); err.textContent='';
    btn.disabled=true; btn.textContent='Signing in…';
    try{
      await Auth.loadStatic();
      const u=document.getElementById('username').value;
      const p=document.getElementById('password').value;
      await Auth.login(u,p);
      // success -> show app
      document.getElementById('loginView').classList.add('hidden');
      document.getElementById('appView').classList.remove('hidden');
      applyRoleUI();
      await initDashboard();
      showView('dashboard');
      showToast('Welcome, '+Auth.user.displayName);
    }catch(errObj){
      err.textContent=errObj.message||'Login failed.';
      err.classList.remove('hidden');
    } finally { btn.disabled=false; btn.innerHTML='<span class="material-symbols-outlined">login</span> Sign in'; }
  });
  // CAT wiring
  document.getElementById('catTestFile')?.addEventListener('change', updateCatSetupInfo);
  document.getElementById('catDifficulty')?.addEventListener('change', updateCatSetupInfo);
  document.getElementById('startCatBtn').addEventListener('click', startCAT);
  document.getElementById('shuffleCatBtn').addEventListener('click', async ()=>{ await updateCatSetupInfo(); showToast('Preview shuffled — press Generate & Start'); });
  document.getElementById('catPrevBtn').addEventListener('click', ()=>CAT.prev());
  document.getElementById('catNextBtn').addEventListener('click', ()=>{ if(CAT.current===CAT.selected.length-1){ CAT.goTo(0); } else CAT.next(); });
  document.getElementById('catSubmitBtn').addEventListener('click', ()=>{ if(confirm('Submit test now?')) CAT.submit(); });
  // Teach wiring
  document.getElementById('teachLoadBtn').addEventListener('click', async ()=>{
    const f=document.getElementById('teachTestFile').value;
    await TEACH.load(f); TEACH.render();
  });
  document.getElementById('teachFilter').addEventListener('change', ()=>{ TEACH.applyFilter(); TEACH.render(); });
  document.getElementById('teachShowAnswer').addEventListener('change', ()=>TEACH.render());
  document.getElementById('teachShowExplain').addEventListener('change', ()=>TEACH.render());
  document.getElementById('teachTestFile')?.addEventListener('change', async (e)=>{ await TEACH.load(e.target.value); TEACH.render(); });

  // Restore session if exists
  try{
    await Auth.loadStatic();
    const restored=Auth.restore();
    if(restored){
      document.getElementById('loginView').classList.add('hidden');
      document.getElementById('appView').classList.remove('hidden');
      applyRoleUI();
      await initDashboard();
      // Preload teach first file
      try{ const f=Auth.config.questionsFiles?.[0]?.file; if(f){ await TEACH.load(f); TEACH.render(); } }catch{}
      showView('dashboard');
    }
  }catch{}
});
