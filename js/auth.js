// auth.js — login with SHA-256 comparison. GET only.
const Auth = {
  async sha256(text){
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
  },
  async login(username, password){
    const name = (username||"").trim().toLowerCase();
    const user = (Store.users||[]).find(u=>u.username.toLowerCase()===name && u.active!==false);
    if(!user) return {ok:false, msg:"Username or password is incorrect."};
    const hash = await this.sha256(password||"");
    if(hash !== user.passwordHash) return {ok:false, msg:"Username or password is incorrect."};
    // Never store hash in session
    Store.saveSession(user);
    return {ok:true, user};
  },
  logout(){
    Store.clearSession();
    TestEngine.reset();
    App.showView("login");
  }
};
