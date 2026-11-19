// SimpleAuth v4 — app.js — auth + nav + overview + reports. GET only, with file:// fallback.
(function(){
"use strict";
let CONFIG=null, USERS=[], ROLES=[], currentUser=null, currentRole=null;
const $=(id)=>document.getElementById(id);
const show=(el)=>{if(el)el.hidden=false};
const hide=(el)=>{if(el)el.hidden=true};
function showGlobalError(msg){const e=$('globalError'); if(e){e.textContent=msg; e.hidden=false;}}
// Fallback data if fetch fails (file://, offline, CORS)
const FALLBACK_CONFIG={appName:"SimpleAuth",version:"4.0.0",brandColor:"#5b5ef4",sessionKey:"simpleauth_session",sessionTimeoutMinutes:120,footerText:"SimpleAuth v4.0.0"};
const FALLBACK_ROLES=[{id:"admin",name:"Administrator",description:"Full access.",permissions:["view_dashboard","view_users","view_reports","manage_users","manage_settings","export_data"],dashboardWidgets:["users","reports","settings","activity"],color:"#e17055"},{id:"manager",name:"Manager",description:"Team + reports.",permissions:["view_dashboard","view_users","view_reports","export_data"],dashboardWidgets:["users","reports","activity"],color:"#00b894"},{id:"staff",name:"Staff",description:"Reports only.",permissions:["view_dashboard","view_reports"],dashboardWidgets:["reports"],color:"#0984e3"}];
const FALLBACK_USERS=[{id:1,username:"admin",name:"Ayu Admin",email:"admin@simpleauth.demo",passwordHash:"240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9",passwordHint:"admin123",roleId:"admin",avatar:"A",active:true,department:"IT"},{id:2,username:"manager",name:"Budi Manager",email:"manager@simpleauth.demo",passwordHash:"866485796cfa8d7c0cf7111640205b83076433547577511d81f8030ae99ecea5",passwordHint:"manager123",roleId:"manager",avatar:"B",active:true,department:"Operations"},{id:3,username:"staff",name:"Citra Staff",email:"staff@simpleauth.demo",passwordHash:"10176e7b7b24d317acfcf8d2064cfd2f24e154f7b5a96603077d5ef813d6a6b6",passwordHint:"staff123",roleId:"staff",avatar:"C",active:true,department:"Support"}];

async function getJSON(url, fallback){
  try{
    const r=await fetch(url,{method:'GET',headers:{Accept:'application/json'},cache:'no-store'});
    if(!r.ok) throw new Error('HTTP '+r.status);
    return await r.json();
  }catch(err){
    console.warn('GET failed, using fallback for',url,err);
    if(fallback) return fallback;
    throw err;
  }
}
async function sha256Hex(text){
  try{
    if(window.crypto && window.crypto.subtle && window.isSecureContext!==false){
      // crypto.subtle may be undefined on file:// / http — catch below
      if(window.crypto.subtle){
        const buf=await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
        return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
      }
    }
  }catch(e){ console.warn('subtle failed, fallback to plain compare',e); }
  return 'plain:'+text;
}
function getSessionKey(){return (CONFIG&&CONFIG.sessionKey)||'simpleauth_session';}
function saveSession(u){
  const p={userId:u.id,username:u.username,roleId:u.roleId,loginAt:new Date().toISOString(),expiresAt:new Date(Date.now()+((CONFIG&&CONFIG.sessionTimeoutMinutes)||120)*60000).toISOString()};
  const store=($('rememberMe')&&$('rememberMe').checked)?localStorage:sessionStorage;
  try{sessionStorage.removeItem(getSessionKey()); localStorage.removeItem(getSessionKey()); store.setItem(getSessionKey(),JSON.stringify(p));}catch(e){}
  return p;
}
function readSession(){try{const raw=sessionStorage.getItem(getSessionKey())||localStorage.getItem(getSessionKey()); if(!raw) return null; const s=JSON.parse(raw); if(new Date(s.expiresAt)<new Date()){clearSession();return null;} return s;}catch{return null;}}
function clearSession(){try{sessionStorage.removeItem(getSessionKey()); localStorage.removeItem(getSessionKey());}catch{}}
window.switchPage=function(name){
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.nav===name));
  document.querySelectorAll('#appView .page').forEach(p=>p.hidden=true);
  const el=$('page-'+name); if(el) el.hidden=false;
  if(name==='test' && window.CAT && window.CAT.loadTests) window.CAT.loadTests(false);
  if(name==='reports' && window.renderReports) window.renderReports();
  window.scrollTo({top:0});
};
async function loadAllData(){
  try{
    const c=await getJSON('data/config.json', FALLBACK_CONFIG);
    const u=await getJSON('data/users.json', {users:FALLBACK_USERS});
    const r=await getJSON('data/roles.json', {roles:FALLBACK_ROLES});
    CONFIG=c; USERS=u.users||u||FALLBACK_USERS; ROLES=r.roles||r||FALLBACK_ROLES;
  }catch(e){ CONFIG=FALLBACK_CONFIG; USERS=FALLBACK_USERS; ROLES=FALLBACK_ROLES; showGlobalError('Could not load JSON via fetch — using built-in demo data. For full data, serve via GitHub Pages or Live Server.'); }
  const v=CONFIG.version?('v'+CONFIG.version):'v4.0.0';
  const appNameEl=$('appName'); if(appNameEl) appNameEl.textContent=CONFIG.appName||'SimpleAuth';
  const vp=$('versionPill'); if(vp) vp.textContent=v;
  const vt=$('versionText'); if(vt) vt.textContent=v+' • JSON only';
  const ft=$('footerText'); if(ft) ft.textContent=(CONFIG.appName||'SimpleAuth')+' '+v;
  if(CONFIG.brandColor) document.documentElement.style.setProperty('--brand', CONFIG.brandColor);
  const ls=$('loadStatus'); if(ls) ls.textContent='Loaded '+USERS.length+' users • '+ROLES.length+' roles • '+v;
  renderDemoList();
}
function renderDemoList(){
  const w=$('demoList'); if(!w) return; w.innerHTML='';
  USERS.forEach(u=>{
    const role=ROLES.find(r=>r.id===u.roleId);
    const b=document.createElement('button'); b.type='button'; b.className='demo-btn';
    b.innerHTML='<b>'+escapeHtml(u.username)+'</b><span>'+escapeHtml(role?role.name:u.roleId)+'</span>';
    b.onclick=()=>{ $('username').value=u.username; $('password').value=u.passwordHint||''; $('password').focus(); };
    w.appendChild(b);
  });
}
function escapeHtml(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function handleLogin(e){
  if(e) e.preventDefault();
  const usernameEl=$('username'), passwordEl=$('password'), err=$('loginError');
  const username=(usernameEl.value||'').trim().toLowerCase();
  const password=passwordEl.value||'';
  hide(err);
  if(!username||!password){ err.textContent='Enter username and password.'; show(err); return; }
  const btn=$('loginBtn'); btn.disabled=true; btn.textContent='Signing in…';
  try{
    // Always re-fetch users (GET) but fall back to embedded
    const fresh=await getJSON('data/users.json',{users:USERS});
    USERS=fresh.users||fresh||USERS;
    const user=USERS.find(u=>String(u.username).toLowerCase()===username && u.active!==false);
    if(!user) throw new Error('User not found. Try: admin / manager / staff');
    const hash=await sha256Hex(password);
    let ok=false;
    if(hash.startsWith('plain:')){ ok = password===user.passwordHint || hash==='plain:'+password && user.passwordHash===hash; if(!ok && user.passwordHint) ok=password===user.passwordHint; }
    else { ok = hash===user.passwordHash; }
    if(!ok) throw new Error('Wrong password.');
    const s=saveSession(user); currentUser=user; currentRole=ROLES.find(r=>r.id===user.roleId); afterLogin();
  }catch(ex){ err.textContent=ex.message||'Login failed'; show(err); }
  finally{ btn.disabled=false; btn.textContent='Sign in'; }
}
function afterLogin(){
  hide($('loginView')); show($('appView')); show($('mainNav')); show($('logoutBtnTop'));
  const wt=$('welcomeTitle'); if(wt) wt.textContent='Hello, '+currentUser.name;
  const ws=$('welcomeSub'); if(ws) ws.textContent='@'+currentUser.username+' • '+(currentRole?currentRole.name:currentUser.roleId);
  const rn=$('roleName'); if(rn) rn.textContent=currentRole?currentRole.name:currentUser.roleId;
  const rd=$('roleDesc'); if(rd) rd.textContent=currentRole?currentRole.description:'';
  const pc=$('permCount'); if(pc) pc.textContent=(currentRole&&currentRole.permissions?currentRole.permissions.length:0)+' permissions';
  const pa=$('profileAvatar'); if(pa) pa.textContent=currentUser.avatar||currentUser.name[0];
  const pn=$('profileName'); if(pn) pn.textContent=currentUser.name;
  const pe=$('profileEmail'); if(pe) pe.textContent=currentUser.email;
  const pm=$('profileMeta'); if(pm) pm.textContent=(currentUser.department||'')+' • @'+currentUser.username;
  const pl=$('permList'); if(pl){ pl.innerHTML=''; (currentRole&&currentRole.permissions||[]).forEach(p=>{const s=document.createElement('span'); s.textContent=p; pl.appendChild(s);}); }
  const wl=$('widgetList'); if(wl){ wl.innerHTML=''; const icons={users:'👥',reports:'📊',settings:'⚙️',activity:'📈'}; (currentRole&&currentRole.dashboardWidgets||[]).forEach(w=>{const d=document.createElement('div'); d.innerHTML='<b>'+(icons[w]||'🧩')+'</b><span>'+w+'</span>'; wl.appendChild(d);}); }
  const canView=currentRole&&currentRole.permissions&&currentRole.permissions.includes('view_users');
  const card=$('usersTableCard');
  if(canView && card){ show(card); const uc=$('userCount'); if(uc) uc.textContent=USERS.length+''; const tb=$('usersTableBody'); if(tb) tb.innerHTML=USERS.map(u=>{const r=ROLES.find(x=>x.id===u.roleId); return '<tr><td><strong>'+escapeHtml(u.name)+'</strong><br><small>'+escapeHtml(u.email)+'</small></td><td>@'+escapeHtml(u.username)+'</td><td><span class="badge" style="background:'+(r&&r.color||'#888')+'">'+escapeHtml(r?r.name:u.roleId)+'</span></td><td>'+escapeHtml(u.department||'-')+'</td><td>'+(u.active?'Active':'Inactive')+'</td></tr>';}).join(''); }
  else if(card) hide(card);
  const cj=$('configJson'); if(cj) cj.textContent=JSON.stringify(CONFIG,null,2);
  window.switchPage('overview');
  if(window.CAT) window.CAT.loadTests(false);
}
function logout(){ clearSession(); currentUser=null; currentRole=null; hide($('appView')); hide($('mainNav')); hide($('logoutBtnTop')); const cv=$('catView'); if(cv) hide(cv); show($('loginView')); const f=$('loginForm'); if(f) f.reset(); const u=$('username'); if(u) u.focus(); }
window.renderReports=function(){
  const list=$('reportsList'), empty=$('reportsEmpty'); if(!list) return;
  let attempts=[]; try{ attempts=JSON.parse(localStorage.getItem('simpleauth_reports')||'[]'); }catch{}
  if(!attempts.length){ list.innerHTML=''; if(empty) show(empty); return; }
  if(empty) hide(empty);
  list.innerHTML=attempts.slice().reverse().map(a=>{
    const pct=a.total?Math.round((a.correct/a.total)*100):0;
    return '<div class="report-card"><div><strong>'+escapeHtml(a.title)+'</strong><br><span class="muted small">'+new Date(a.date).toLocaleString()+' • '+a.total+' questions • '+escapeHtml(a.time||'')+'</span></div><div class="report-score">'+pct+'%</div></div>';
  }).join('');
};
document.addEventListener('DOMContentLoaded', async ()=>{
  try{
    const lf=$('loginForm'); if(lf) lf.addEventListener('submit',handleLogin);
    const lo=$('logoutBtnTop'); if(lo) lo.addEventListener('click',logout);
    document.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click',()=>window.switchPage(b.dataset.nav)));
    document.querySelectorAll('[data-goto]').forEach(b=>b.addEventListener('click',()=>window.switchPage(b.dataset.goto)));
    const tp=$('togglePass'); if(tp) tp.addEventListener('click',()=>{const p=$('password'); if(p) p.type=p.type==='password'?'text':'password';});
    const rf=$('refreshBtn'); if(rf) rf.addEventListener('click',async()=>{ await loadAllData(); if(currentUser) afterLogin(); });
    const tc=$('toggleConfig'); if(tc) tc.addEventListener('click',()=>{const el=$('configJson'); if(!el) return; el.hidden=!el.hidden; tc.textContent=el.hidden?'Show':'Hide';});
    const cr=$('clearReports'); if(cr) cr.addEventListener('click',()=>{ try{localStorage.removeItem('simpleauth_reports');}catch{} window.renderReports(); });
    await loadAllData();
    const s=readSession();
    if(s){ const u=USERS.find(x=>x.id===s.userId); if(u){ currentUser=u; currentRole=ROLES.find(r=>r.id===u.roleId); afterLogin(); } }
  }catch(err){ console.error(err); showGlobalError('App init failed: '+(err.message||err)+'. Try opening via GitHub Pages or Live Server.'); }
});
})();
