let currentUser=null;
let _memSession=null;
function getSession(){
  try{ const v=sessionStorage.getItem('cat_session'); if(v) return JSON.parse(v); }catch(e){}
  try{ const v=localStorage.getItem('cat_session'); if(v) return JSON.parse(v); }catch(e){}
  return _memSession;
}
function setSession(u){
  _memSession=u;
  try{ sessionStorage.setItem('cat_session', JSON.stringify(u)); }catch(e){}
  try{ localStorage.setItem('cat_session', JSON.stringify(u)); }catch(e){}
}
function clearSession(){
  _memSession=null;
  try{ sessionStorage.removeItem('cat_session'); }catch(e){}
  try{ localStorage.removeItem('cat_session'); }catch(e){}
}
async function doLogin(username,password){
  const users=await loadJSON('data/users.json');
  const clean=(username||'').trim();
  const user=users.find(u=>u.username===clean);
  if(!user) throw new Error('Invalid username or password.');
  const hash=await sha256Hex(password||'');
  if(hash!==user.passwordHash) throw new Error('Invalid username or password.');
  const safe={username:user.username,name:user.name,role:user.role};
  setSession(safe); currentUser=safe; return safe;
}
function doLogout(){
  clearSession(); currentUser=null;
  // No reload - just switch views (reload breaks file:// in some browsers)
  try{
    el('appShell').hidden=true;
    el('loginScreen').hidden=false;
    el('username').value=''; el('password').value='';
    el('loginError').hidden=true;
  }catch(e){ location.reload(); }
}
