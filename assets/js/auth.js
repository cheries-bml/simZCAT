// auth.js - login with users.json, roles.json, config.json (GET only, SHA-256)
const Auth = {
  user:null, roles:[], config:null,
  async loadStatic(){
    const [config, roles] = await Promise.all([fetchJSON('data/config.json'), fetchJSON('data/roles.json')]);
    this.config=config; this.roles=roles; return {config, roles};
  },
  getRole(id){ return this.roles.find(r=>r.id===id) || {id, label:id, permissions:[]}; },
  hasPerm(perm){
    if(!this.user) return false;
    const r=this.getRole(this.user.role);
    return r.permissions.includes(perm);
  },
  async login(username, password){
    const users = await fetchJSON('data/users.json'); // GET only
    const u = users.find(x=>x.username.toLowerCase()===username.trim().toLowerCase());
    if(!u) throw new Error('Invalid username or password.');
    if(!u.active) throw new Error('Account is inactive.');
    const hash = await sha256Hex(password);
    if(hash !== u.passwordHash) throw new Error('Invalid username or password.');
    // Never store hash in session
    this.user = {username:u.username, displayName:u.displayName, role:u.role, loginAt: Date.now()};
    sessionStorage.setItem('cat_session', JSON.stringify(this.user));
    return this.user;
  },
  restore(){
    try{
      const s=sessionStorage.getItem('cat_session');
      if(!s) return null;
      this.user=JSON.parse(s);
      return this.user;
    }catch{ return null; }
  },
  logout(){
    this.user=null;
    sessionStorage.removeItem('cat_session');
  }
};
