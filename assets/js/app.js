// SimpleAuth v3 — app.js — auth + nav + overview + reports. GET only.
let CONFIG=null, USERS=[], ROLES=[], currentUser=null, currentRole=null;
const $=(id)=>document.getElementById(id);
const show=(el)=>{if(el)el.hidden=false}; const hide=(el)=>{if(el)el.hidden=true};
async function getJSON(url){const r=await fetch(url,{method:'GET',headers:{Accept:'application/json'},cache:'no-store'}); if(!r.ok) throw new Error('GET '+url); return r.json();}
async function sha256Hex(t){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t)); return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');}
function getSessionKey(){return (CONFIG&&CONFIG.sessionKey)||'simpleauth_session';}
function saveSession(u){const p={userId:u.id,username:u.username,roleId:u.roleId,loginAt:new Date().toISOString(),expiresAt:new Date(Date.now()+(CONFIG?.sessionTimeoutMinutes||120)*60000).toISOString()}; const s=$('rememberMe')?.checked?localStorage:sessionStorage; sessionStorage.removeItem(getSessionKey()); localStorage.removeItem(getSessionKey()); s.setItem(getSessionKey(),JSON.stringify(p)); return p;}
function readSession(){const raw=sessionStorage.getItem(getSessionKey())||localStorage.getItem(getSessionKey()); if(!raw) return null; try{const s=JSON.parse(raw); if(new Date(s.expiresAt)<new Date()){clearSession();return null;} return s;}catch{return null;}}
function clearSession(){sessionStorage.removeItem(getSessionKey()); localStorage.removeItem(getSessionKey());}
function switchPage(name){
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.nav===name));
  document.querySelectorAll('#appView .page').forEach(p=>p.hidden=true);
  const el=$('page-'+name); if(el) el.hidden=false;
  if(name==='test' && window.CAT && window.CAT.loadTests) window.CAT.loadTests();
  if(name==='reports' && window.renderReports) window.renderReports();
  window.scrollTo({top:0,behavior:'smooth'});
}
async function loadAllData(){
  const [c,u,r]=await Promise.all([getJSON('data/config.json'),getJSON('data/users.json'),getJSON('data/roles.json')]);
  CONFIG=c; USERS=u.users||u; ROLES=r.roles||r;
  const v=CONFIG.version?'v'+CONFIG.version:'v3.0.0';
  if($('appName')) $('appName').textContent=CONFIG.appName||'SimpleAuth';
  if($('versionPill')) $('versionPill').textContent=v;
  if($('versionText')) $('versionText').textContent=v;
  if($('footerText')) $('footerText').textContent=(CONFIG.appName||'SimpleAuth')+' '+v;
  if(CONFIG.brandColor) document.documentElement.style.setProperty('--brand',CONFIG.brandColor);
  renderDemoList();
}
function renderDemoList(){const w=$('demoList'); if(!w) return; w.innerHTML=''; USERS.forEach(u=>{const role=ROLES.find(r=>r.id===u.roleId); const b=document.createElement('button'); b.type='button'; b.className='demo-btn'; b.innerHTML='<b>'+u.username+'</b><span>'+(role?role.name:u.roleId)+'</span>'; b.onclick=()=>{$('username').value=u.username; $('password').value=u.passwordHint||''; $('password').focus();}; w.appendChild(b);});}
async function handleLogin(e){e.preventDefault(); const username=$('username').value.trim().toLowerCase(); const password=$('password').value; const err=$('loginError'); hide(err); if(!username||!password){err.textContent='Enter username and password.'; show(err); return;} $('loginBtn').disabled=true; $('loginBtn').textContent='Signing in…'; try{const fresh=await getJSON('data/users.json'); USERS=fresh.users||fresh; const user=USERS.find(u=>u.username.toLowerCase()===username&&u.active!==false); if(!user) throw new Error('User not found.'); const h=await sha256Hex(password); if(h!==user.passwordHash) throw new Error('Wrong password.'); const s=saveSession(user); currentUser=user; currentRole=ROLES.find(r=>r.id===user.roleId); afterLogin();}catch(ex){err.textContent=ex.message; show(err);}finally{$('loginBtn').disabled=false; $('loginBtn').textContent='Sign in';}}
function afterLogin(){
  hide($('loginView')); show($('appView')); show($('mainNav')); show($('logoutBtnTop'));
  $('welcomeTitle').textContent='Hello, '+currentUser.name;
  $('welcomeSub').textContent='@'+currentUser.username+' • '+(currentRole?.name||currentUser.roleId);
  $('roleName').textContent=currentRole?.name||currentUser.roleId;
  $('roleDesc').textContent=currentRole?.description||'';
  $('permCount').textContent=(currentRole?.permissions?.length||0)+' permissions';
  $('profileAvatar').textContent=currentUser.avatar||currentUser.name[0];
  $('profileName').textContent=currentUser.name; $('profileEmail').textContent=currentUser.email; $('profileMeta').textContent=(currentUser.department||'')+' • @'+currentUser.username;
  $('permList').innerHTML=''; (currentRole?.permissions||[]).forEach(p=>{const s=document.createElement('span'); s.textContent=p; $('permList').appendChild(s);});
  $('widgetList').innerHTML=''; const icons={users:'👥',reports:'📊',settings:'⚙️',activity:'📈'}; (currentRole?.dashboardWidgets||[]).forEach(w=>{const d=document.createElement('div'); d.innerHTML='<b>'+(icons[w]||'🧩')+'</b><span>'+w+'</span>'; $('widgetList').appendChild(d);});
  const canView=currentRole?.permissions?.includes('view_users');
  if(canView){show($('usersTableCard')); $('userCount').textContent=USERS.length+''; $('usersTableBody').innerHTML=USERS.map(u=>{const r=ROLES.find(x=>x.id===u.roleId); return '<tr><td><strong>'+u.name+'</strong><br><small>'+u.email+'</small></td><td>@'+u.username+'</td><td><span class="badge" style="background:'+(r?.color||'#888')+'">'+(r?.name||u.roleId)+'</span></td><td>'+(u.department||'-')+'</td><td>'+(u.active?'Active':'Inactive')+'</td></tr>';}).join('');} else hide($('usersTableCard'));
  $('configJson').textContent=JSON.stringify(CONFIG,null,2);
  switchPage('overview');
  if(window.CAT) window.CAT.loadTests(true);
}
function logout(){clearSession(); currentUser=null; currentRole=null; hide($('appView')); hide($('mainNav')); hide($('logoutBtnTop')); hide($('catView')); show($('loginView')); $('loginForm').reset(); $('username').focus();}
function renderReports(){
  const list=$('reportsList'); const empty=$('reportsEmpty'); if(!list) return;
  let attempts=[]; try{attempts=JSON.parse(localStorage.getItem('simpleauth_reports')||'[]');}catch{}
  if(!attempts.length){list.innerHTML=''; show(empty); return;}
  hide(empty);
  list.innerHTML=attempts.slice().reverse().map(a=>{
    const pct=Math.round((a.correct/a.total)*100);
    return '<div class="report-card"><div><strong>'+a.title+'</strong><br><span class="muted small">'+new Date(a.date).toLocaleString()+' • '+a.total+' questions • '+a.time+'</span><br><span class="muted small">Topics: '+(a.topics||[]).join(', ')||'-'}</span></div><div class="report-score">'+pct+'%</div></div>';
  }).join('');
}
window.renderReports=renderReports;
document.addEventListener('DOMContentLoaded', async ()=>{
  $('loginForm').addEventListener('submit',handleLogin);
  $('logoutBtnTop').addEventListener('click',logout);
  document.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click',()=>switchPage(b.dataset.nav)));
  document.querySelectorAll('[data-goto]').forEach(b=>b.addEventListener('click',()=>switchPage(b.dataset.goto)));
  $('togglePass').addEventListener('click',()=>{const p=$('password'); p.type=p.type==='password'?'text':'password';});
  $('refreshBtn').addEventListener('click',async()=>{await loadAllData(); if(currentUser) afterLogin();});
  $('toggleConfig').addEventListener('click',()=>{const el=$('configJson'); el.hidden=!el.hidden; $('toggleConfig').textContent=el.hidden?'Show':'Hide';});
  $('clearReports').addEventListener('click',()=>{localStorage.removeItem('simpleauth_reports'); renderReports();});
  try{await loadAllData(); const s=readSession(); if(s){const u=USERS.find(x=>x.id===s.userId); if(u){currentUser=u; currentRole=ROLES.find(r=>r.id===u.roleId); afterLogin();}}}catch(err){const e=$('loginError'); e.textContent='Failed to load JSON. Use GitHub Pages or Live Server.'; show(e);}
});
