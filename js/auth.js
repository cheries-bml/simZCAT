// Auth - GET only. Session in sessionStorage. No POST.
let CONFIG={}, ROLES={}, USERS=[], CURRENT_USER=null;

async function loadAppData(){
  CONFIG = await getJSON('data/config.json');
  ROLES = await getJSON('data/roles.json');
  USERS = await getJSON('data/users.json');
  if(CONFIG.appName){ $('#appName').textContent = CONFIG.appName; document.title = CONFIG.appName; }
  if(CONFIG.school) $('#schoolName').textContent = CONFIG.school;
}

function getSession(){ try{ return JSON.parse(sessionStorage.getItem('cat_session')||'null'); }catch{ return null; } }
function hasPermission(perm){ if(!CURRENT_USER) return false; const r = ROLES[CURRENT_USER.role]; return r?.permissions?.includes(perm) || CURRENT_USER.role==='super'; }
function isSuper(){ return CURRENT_USER?.role==='super'; }

async function tryLogin(username, password){
  const user = USERS.find(u=>u.username===username);
  if(!user) return false;
  const hash = await sha256(password);
  if(hash !== user.password_sha256) return false;
  CURRENT_USER = { username:user.username, name:user.name||user.username, role:user.role };
  sessionStorage.setItem('cat_session', JSON.stringify(CURRENT_USER));
  return true;
}
function logout(){ sessionStorage.removeItem('cat_session'); location.reload(); }
function restoreSession(){
  const s=getSession(); if(!s) return false;
  const found = USERS.find(u=>u.username===s.username && u.role===s.role);
  if(!found) return false;
  CURRENT_USER = s; return true;
}
