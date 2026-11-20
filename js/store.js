// store.js — GET-only data layer. No POST. All updates via GitHub push.
const Store = {
  config: null, roles: null, users: null, materials: null, qIndex: null,
  session: null,
  // Fallback for file:// preview (same hashes as data/users.json, demo only)
  fallback: {
    config: { appName: "CAT Learning", tagline: "Computer Assisted Test", version: "1.0.0", sessionKey: "cat_session", test: { difficulties: [{id:"all",label:"All Levels",levels:[1,2,3,4,5]},{id:"easy",label:"Easy",levels:[1,2]},{id:"intermediate",label:"Intermediate",levels:[3]},{id:"advanced",label:"Advanced",levels:[4,5]}], defaultCount: 10, maxCount: 50, timerModes: [{id:"normal",label:"Normal"},{id:"fast",label:"Fast"},{id:"easy",label:"Relaxed"},{id:"none",label:"No Timer"}] } },
    roles: {
      super: { label:"Super", permissions:{canTakeTest:true,canTeach:true,canPeekAnswer:true,canPeekExplanation:true,canViewMaterials:true,canViewVerbose:true,canViewAdmin:true,canViewUsers:true,canViewConfig:true} },
      teacher: { label:"Teacher", permissions:{canTakeTest:true,canTeach:true,canPeekAnswer:true,canPeekExplanation:true,canViewMaterials:true,canViewVerbose:false,canViewAdmin:false,canViewUsers:false,canViewConfig:false} },
      student: { label:"Student", permissions:{canTakeTest:true,canTeach:false,canPeekAnswer:false,canPeekExplanation:false,canViewMaterials:true,canViewVerbose:false,canViewAdmin:false,canViewUsers:false,canViewConfig:false} }
    },
    users: [
      {id:1,username:"super",displayName:"Super Admin",role:"super",passwordHash:"4e4c56e4a15f89f05c2f4c72613da2a18c9665d4f0d6acce16415eb06f9be776",active:true},
      {id:2,username:"teacher",displayName:"Ms. Teacher",role:"teacher",passwordHash:"cde383eee8ee7a4400adf7a15f716f179a2eb97646b37e089eb8d6d04e663416",active:true},
      {id:3,username:"student",displayName:"Alex Student",role:"student",passwordHash:"703b0a3d6ad75b649a28adde7d83c6251da457549263bc7ff45ec709b0a8448b",active:true}
    ],
    materials: [{id:"guide",title:"Teacher Guide",file:"guide.md",type:"md",description:"How to run a CAT session and teaching mode.",subject:"General"}],
    qIndex: [{id:"sample-english",file:"sample-english.json",title:"Test title",description:"Question Description"}]
  },
  async getJSON(path, fallbackKey){
    try{
      const res = await fetch(path, {method:"GET", cache:"no-store"});
      if(!res.ok) throw new Error("HTTP "+res.status);
      return await res.json();
    }catch(e){
      if(fallbackKey && this.fallback[fallbackKey]) return this.fallback[fallbackKey];
      throw e;
    }
  },
  async loadAll(){
    const [config, roles, users, materials, qIndex] = await Promise.all([
      this.getJSON("data/config.json","config"),
      this.getJSON("data/roles.json","roles"),
      this.getJSON("data/users.json","users"),
      this.getJSON("data/materials.json","materials"),
      this.getJSON("questions/index.json","qIndex")
    ]);
    this.config=config; this.roles=roles; this.users=users; this.materials=materials; this.qIndex=qIndex;
    this.restoreSession();
    return true;
  },
  saveSession(user){
    this.session = { username:user.username, displayName:user.displayName, role:user.role, at: Date.now() };
    try{ sessionStorage.setItem(this.config.sessionKey||"cat_session", JSON.stringify(this.session)); }catch(e){}
  },
  restoreSession(){
    try{
      const raw = sessionStorage.getItem(this.config.sessionKey||"cat_session");
      if(raw) this.session = JSON.parse(raw);
    }catch(e){ this.session=null; }
  },
  clearSession(){
    this.session=null;
    try{ sessionStorage.removeItem(this.config.sessionKey||"cat_session"); }catch(e){}
  },
  currentRole(){
    if(!this.session) return null;
    return this.roles[this.session.role] || null;
  },
  can(perm){
    const r = this.currentRole();
    return !!(r && r.permissions && r.permissions[perm]);
  },
  escape(s){
    return String(s??"").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }
};
