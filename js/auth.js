let currentUser=null;
function getSession(){try{return JSON.parse(sessionStorage.getItem('cat_session')||'null');}catch(e){return null;}}
function setSession(u){sessionStorage.setItem('cat_session',JSON.stringify(u));}
async function doLogin(username,password){
  const users=await loadJSON('data/users.json');
  const user=users.find(u=>u.username===username.trim());
  if(!user) throw new Error('Invalid login');
  const hash=await sha256Hex(password);
  if(hash!==user.passwordHash) throw new Error('Invalid login');
  const safe={username:user.username,name:user.name,role:user.role};
  setSession(safe); currentUser=safe; return safe;
}
function doLogout(){sessionStorage.removeItem('cat_session');location.reload();}
