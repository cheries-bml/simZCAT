
const Auth = {
  user:null, config:null, roles:null, usersRaw:[], qIndex:null, mIndex:null,
  async loadAll(){
    const [cfg, roles, users, qi, mi] = await Promise.all([
      fetchJSON('data/config.json'),
      fetchJSON('data/roles.json'),
      fetchJSON('data/users.json'),
      fetchJSON('questions/index.json'),
      fetchJSON('materials/index.json'),
    ]);
    this.config=cfg; this.roles=roles.roles||roles; this.usersRaw=users.users||[];
    this.qIndex=qi; this.mIndex=mi;
    return true;
  },
  async login(username, password){
    const u = this.usersRaw.find(x=>x.username.toLowerCase()===username.trim().toLowerCase());
    if(!u || !u.active) throw new Error('Invalid username or password.');
    const hash = await sha256Hex(password);
    if(hash !== u.passwordHash) throw new Error('Invalid username or password.');
    this.user = {username:u.username, name:u.name, role:u.role};
    sessionStorage.setItem('cat_session', JSON.stringify(this.user));
    return this.user;
  },
  restore(){
    try{
      const s = sessionStorage.getItem('cat_session');
      if(s){ this.user = JSON.parse(s); return this.user; }
    }catch(e){}
    return null;
  },
  logout(){ this.user=null; sessionStorage.removeItem('cat_session'); },
  can(perm){
    if(!this.user) return false;
    const r = this.roles[this.user.role];
    return r && r.permissions.includes(perm);
  },
  isSuper(){ return this.user && this.user.role==='super'; }
};
