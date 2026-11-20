// App shell - routing, login, dashboard, admin (super only)
function showView(name){
  $$('.view').forEach(v=>v.classList.add('hidden'));
  const el=$('#view-'+name); if(el) el.classList.remove('hidden');
  $$('.nav-item').forEach(b=>b.classList.toggle('active', b.dataset.view===name));
  if(name==='admin' && !isSuper()){ showView('dashboard'); return; }
  if(window.innerWidth<=820) $('#sidebar').classList.remove('open');
  refreshIcons();
}
function updateDashboard(){
  $('#welcomeText').textContent = `Halo, ${CURRENT_USER.name}`;
  $('#statRole').textContent = ROLES[CURRENT_USER.role]?.label || CURRENT_USER.role;
  $('#statMaterials').textContent = MATERIALS.length || '—';
  // Questions count from loaded CAT pool
  $('#statQuestions').textContent = catPool.length || '—';
  $('#userChip').textContent = `${CURRENT_USER.name} • ${CURRENT_USER.role}`;
}
function initAdmin(){
  if(!isSuper()) return;
  $('#navAdmin').classList.remove('hidden');
  $('#adminStatus').innerHTML = `Soal: ${catPool.length}<br>Materi: ${MATERIALS.length}<br>File soal: ${(CONFIG.questionFiles||[]).join(', ')}`;
  $('#adminConfig').innerHTML = `App: ${escapeHtml(CONFIG.appName||'')}<br>Per soal: ${CONFIG.secondsPerQuestion||60} detik<br>Review: ${CONFIG.allowReviewAfterTest!==false?'Aktif':'Nonaktif'}`;
}
async function initApp(){
  await loadAppData();
  // Restore session if exists
  if(restoreSession()){
    $('#loginView').classList.add('hidden'); $('#appShell').classList.remove('hidden');
    await initCat(); await initTeach(); await initMaterials(); await initGenerator();
    updateDashboard(); initAdmin(); showView('dashboard');
  }
  $('#loginForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const u=$('#username').value.trim(), p=$('#password').value;
    const ok = await tryLogin(u,p);
    if(!ok){ $('#loginError').textContent='Username atau password salah.'; $('#loginError').classList.remove('hidden'); return; }
    $('#loginView').classList.add('hidden'); $('#appShell').classList.remove('hidden');
    await initCat(); await initTeach(); await initMaterials(); await initGenerator();
    updateDashboard(); initAdmin(); showView('dashboard');
  });
  $('#logoutBtn').onclick = logout;
  $('#menuBtn').onclick = ()=> $('#sidebar').classList.toggle('open');
  $$('.nav-item').forEach(b=> b.onclick = ()=> showView(b.dataset.view));
  $$('[data-goto]').forEach(b=> b.onclick = ()=> showView(b.dataset.goto));
  $('#viewerClose').onclick = ()=> $('#materialViewer').classList.add('hidden');
  refreshIcons();
}
document.addEventListener('DOMContentLoaded', initApp);
