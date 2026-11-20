let appConfig={appName:'CAT Learning',version:'1.0.0'};
const TITLES={dashboard:'Dashboard',cat:'CAT Test',teaching:'Teaching',materials:'Materials',generator:'Generate Test',admin:'Admin'};
async function init(){
  try{ appConfig=await loadJSON('data/config.json'); }catch(e){ console.warn('config fallback', e); }
  el('appVersion').textContent='v'+(appConfig.version||'1.0.0');
  currentUser=getSession();
  if(!currentUser){ el('loginScreen').hidden=false; el('appShell').hidden=true; }
  else { el('loginScreen').hidden=true; el('appShell').hidden=false; setupShell(); }
  el('loginForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const btn=el('loginBtn'); const errEl=el('loginError');
    errEl.hidden=true; errEl.textContent='';
    btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-circle-notch fa-spin"></i> Logging in...';
    try{
      const u=await doLogin(el('username').value, el('password').value);
      currentUser=u;
      // No reload - enter app directly
      el('loginScreen').hidden=true; el('appShell').hidden=false;
      setupShell(); showView('dashboard');
    }catch(err){
      console.error('Login failed:', err);
      errEl.textContent = err.message || 'Login failed. Check username / password.';
      errEl.hidden=false;
    }finally{
      btn.disabled=false; btn.innerHTML='<i class="fa-solid fa-right-to-bracket"></i> Login';
    }
  });
  el('logoutBtn').addEventListener('click',doLogout);
  document.querySelectorAll('#mainNav button').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
  document.querySelectorAll('[data-goto]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.goto)));
  el('catStartBtn').addEventListener('click',startCAT);
  el('catPrev').addEventListener('click',()=>{if(cat.index>0){cat.index--;renderCAT();}});
  el('catNext').addEventListener('click',()=>{if(cat.index<cat.questions.length-1){cat.index++;renderCAT();}});
  el('catSubmit').addEventListener('click',submitCAT);
  el('teachStartBtn').addEventListener('click',startTeaching);
  el('teachReveal').addEventListener('click',toggleTeachReveal);
  el('teachPrev').addEventListener('click',()=>{if(teach.index>0){teach.index--;renderTeaching();}});
  el('teachNext').addEventListener('click',()=>{if(teach.index<teach.questions.length-1){teach.index++;renderTeaching();}});
  el('genBtn').addEventListener('click',generateTest);
  el('genStartCat').addEventListener('click',startGeneratedAsCAT);
  el('genDownload').addEventListener('click',downloadGenerated);
}
function setupShell(){
  // Reset nav visibility each login (student hides generator, super shows admin)
  el('navAdmin').hidden = !(currentUser.role==='super');
  const genBtn=document.querySelector('[data-view="generator"]');
  if(genBtn) genBtn.style.display = (currentUser.role==='student') ? 'none' : '';
  el('userChip').innerHTML='<strong>'+escapeHtml(currentUser.name)+'</strong><br>@'+escapeHtml(currentUser.username)+' • '+escapeHtml(currentUser.role);
  el('roleBadge').textContent=currentUser.role;
  renderDashboard(); initCAT(); initTeaching(); initMaterials(); initGenerator();
}
async function renderDashboard(){
  try{
    const idx=await loadJSON('questions/index.json');
    const mats=await loadJSON('data/materials.json');
    el('dashStats').innerHTML='<div class="card"><div class="stat-num">'+idx.files.length+'</div><div class="stat-label"><i class="fa-solid fa-layer-group"></i> Question files</div></div><div class="card"><div class="stat-num">'+mats.materials.length+'</div><div class="stat-label"><i class="fa-solid fa-folder-open"></i> Materials</div></div><div class="card"><div class="stat-num">'+escapeHtml(currentUser.role)+'</div><div class="stat-label"><i class="fa-solid fa-user"></i> Your role</div></div>';
  }catch(e){ el('dashStats').innerHTML='<div class="card"><p class="muted">Could not load dashboard data.</p></div>'; }
}
function showView(name){
  if(name==='admin' && (!currentUser || currentUser.role!=='super')){ alert('Admin is for role super only.'); return; }
  if(name==='generator' && currentUser.role==='student'){ alert('Generator is for teacher / super.'); return; }
  document.querySelectorAll('.view').forEach(v=>v.hidden=true);
  el('view-'+name).hidden=false;
  document.querySelectorAll('#mainNav button').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
  el('pageTitle').textContent=TITLES[name]||name;
  if(name==='admin') renderAdmin();
}
document.addEventListener('DOMContentLoaded',init);
