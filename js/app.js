// app.js — routing, dashboard, admin (super only)
const App = {
  async init(){
    try{ await Store.loadAll(); }catch(e){ console.warn("Load failed, using fallback"); Store.config=Store.fallback.config; Store.roles=Store.fallback.roles; Store.users=Store.fallback.users; Store.materials=Store.fallback.materials; Store.qIndex=Store.fallback.qIndex; Store.restoreSession(); }
    document.getElementById("appNameTop").textContent = Store.config.appName||"CAT Learning";
    document.getElementById("footerText").textContent = `${Store.config.appName||"CAT Learning"} • v${Store.config.version||"1.0.0"} • JSON only • GitHub Pages`;
    this.bindGlobal();
    this.fillSetup();
    Materials.renderList();
    this.renderDashboard();
    if(Store.session){ this.afterLogin(); } else { this.showView("login"); }
  },
  bindGlobal(){
    document.getElementById("loginForm").addEventListener("submit", async (e)=>{
      e.preventDefault();
      const u=document.getElementById("loginUsername").value;
      const p=document.getElementById("loginPassword").value;
      const btn=document.getElementById("loginBtn"); btn.disabled=true; btn.textContent="Signing in…";
      const res=await Auth.login(u,p);
      btn.disabled=false; btn.innerHTML=`<span class="material-symbols-outlined">login</span> Sign in`;
      const err=document.getElementById("loginError");
      if(!res.ok){ err.textContent=res.msg; err.style.display="block"; return; }
      err.style.display="none";
      this.afterLogin();
      this.toast(`Welcome, ${res.user.displayName}`);
    });
    document.getElementById("togglePw").addEventListener("click", ()=>{
      const inp=document.getElementById("loginPassword");
      inp.type = inp.type==="password" ? "text" : "password";
    });
    document.querySelectorAll(".demo-item").forEach(b=> b.addEventListener("click", ()=>{
      document.getElementById("loginUsername").value=b.dataset.user;
      document.getElementById("loginPassword").value=b.dataset.pass;
      document.getElementById("loginForm").requestSubmit();
    }));
    document.getElementById("logoutBtn").addEventListener("click", ()=> Auth.logout());
    document.getElementById("brandHome").addEventListener("click", (e)=>{ e.preventDefault(); this.showView(Store.session?"dashboard":"login"); });
    document.querySelectorAll("[data-view]").forEach(el=>{
      el.addEventListener("click", ()=>{
        const v=el.dataset.view;
        const mode=el.dataset.mode;
        if(mode==="teaching"){ const r=document.querySelector('input[name="testMode"][value="teaching"]'); if(r) r.checked=true; }
        this.showView(v);
      });
    });
    document.querySelectorAll(".topnav .nav-btn").forEach(b=> b.addEventListener("click", ()=> this.showView(b.dataset.view)));
    document.getElementById("startTestBtn").addEventListener("click", async ()=>{
      const file=document.getElementById("setupFile").value;
      const diff=document.getElementById("setupDifficulty").value;
      const count=parseInt(document.getElementById("setupCount").value||"10");
      const timer=document.getElementById("setupTimer").value;
      const mode=document.querySelector('input[name="testMode"]:checked')?.value || "test";
      if(mode==="teaching" && !Store.can("canTeach")){ this.toast("Teaching mode needs teacher or super role."); return; }
      try{
        await TestEngine.generate(file, diff, count, timer, mode);
        this.showView("test");
      }catch(e){ this.toast("Could not load questions. Check /questions/ files."); }
    });
    document.getElementById("nextBtn").addEventListener("click", ()=> TestEngine.next());
    document.getElementById("prevBtn").addEventListener("click", ()=> TestEngine.prev());
    document.getElementById("submitBtn").addEventListener("click", ()=> TestEngine.submit());
    document.getElementById("exitTestBtn").addEventListener("click", ()=>{ TestEngine.stopTimer(); this.showView("dashboard"); });
    document.getElementById("peekAllBtn").addEventListener("click", ()=>{ TestEngine.peekAll=true; TestEngine.renderQuestion(); });
    document.getElementById("hideAllBtn").addEventListener("click", ()=>{ TestEngine.peekAll=false; Object.values(TestEngine.answers).forEach(a=>a.peek=false); TestEngine.renderQuestion(); });
    // Setup change handlers
    document.getElementById("setupFile").addEventListener("change", ()=> this.updateSetupMeta());
    document.getElementById("setupDifficulty").addEventListener("change", ()=> this.updateSetupMeta());
    document.querySelectorAll('input[name="testMode"]').forEach(r=> r.addEventListener("change", ()=> this.updateSetupMeta()));
    // Admin tabs
    document.querySelectorAll(".tab").forEach(t=> t.addEventListener("click", ()=>{
      document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active")); t.classList.add("active");
      ["users","roles","config"].forEach(k=>{ document.getElementById("admin"+k[0].toUpperCase()+k.slice(1)).style.display = (t.dataset.tab===k?"block":"none"); });
    }));
  },
  afterLogin(){
    const s=Store.session;
    document.getElementById("topNav").style.display="flex";
    document.getElementById("userArea").style.display="flex";
    document.getElementById("userDisplay").textContent=s.displayName;
    document.getElementById("userRoleBadge").textContent=s.role;
    document.getElementById("navAdmin").style.display = Store.can("canViewAdmin") ? "inline-flex" : "none";
    document.getElementById("adminTeaser").style.display = Store.can("canViewAdmin") ? "block" : "none";
    // Teaching card / radio visibility by role
    const canTeach = Store.can("canTeach");
    document.getElementById("teachCard").style.display = canTeach ? "flex" : "none";
    document.getElementById("teachingRadio").style.display = canTeach ? "flex" : "none";
    document.getElementById("teachingNote").style.display = canTeach ? "none" : "block";
    // If student had teaching selected, reset to test
    if(!canTeach){ const r=document.querySelector('input[name="testMode"][value="test"]'); if(r) r.checked=true; }
    this.renderDashboard();
    this.showView("dashboard");
  },
  showView(name){
    // Guard: admin is super-only (verbose / sensitive)
    if(name==="admin" && !Store.can("canViewAdmin")){ this.toast("Admin is only for super role."); name="dashboard"; }
    if(name!=="login" && !Store.session){ name="login"; }
    if(name==="admin" && Store.can("canViewAdmin")) this.renderAdmin();
    if(name==="dashboard") this.renderDashboard();
    if(name==="materials") Materials.renderList();
    if(name==="test-setup") this.updateSetupMeta();
    document.querySelectorAll(".view").forEach(v=> v.style.display="none");
    const el=document.getElementById("view-"+name);
    if(el) el.style.display="block";
    document.querySelectorAll(".topnav .nav-btn").forEach(b=> b.classList.toggle("active", b.dataset.view===name));
    window.scrollTo({top:0});
  },
  fillSetup(){
    const f=document.getElementById("setupFile");
    f.innerHTML=(Store.qIndex||[]).map(x=>`<option value="${x.id}">${Store.escape(x.title)} — ${Store.escape(x.description||"")}</option>`).join("");
    const d=document.getElementById("setupDifficulty");
    d.innerHTML=(Store.config.test.difficulties||[]).map(x=>`<option value="${x.id}">${x.label}</option>`).join("");
    const t=document.getElementById("setupTimer");
    t.innerHTML=(Store.config.test.timerModes||[]).map(x=>`<option value="${x.id}">${x.label}</option>`).join("");
    document.getElementById("setupCount").value = Store.config.test.defaultCount||10;
    document.getElementById("setupCount").max = Store.config.test.maxCount||50;
  },
  async updateSetupMeta(){
    const file=document.getElementById("setupFile").value;
    const diff=document.getElementById("setupDifficulty").value;
    const mode=document.querySelector('input[name="testMode"]:checked')?.value || "test";
    document.getElementById("setupTitle").textContent = mode==="teaching" ? "Teaching Mode" : "Start Test";
    document.getElementById("setupSub").textContent = mode==="teaching" ? "Discuss questions with peek on the same page." : "Pick a test, difficulty and how many questions.";
    try{
      const meta=Store.qIndex.find(x=>x.id===file);
      document.getElementById("setupFileDesc").textContent = meta ? meta.description||"" : "";
      const data=await Store.getJSON("questions/"+meta.file);
      const diffObj=(Store.config.test.difficulties||[]).find(x=>x.id===diff) || {levels:[1,2,3,4,5]};
      const avail=(data.questions||[]).filter(q=> diffObj.levels.includes((q.config&&q.config.level)||1)).length;
      document.getElementById("setupAvailable").textContent = `Available for this difficulty: ${avail} / ${data.questions.length} questions.`;
    }catch(e){ document.getElementById("setupAvailable").textContent=""; }
  },
  renderDashboard(){
    if(!Store.session) return;
    const s=Store.session;
    document.getElementById("greeting").textContent = `Hello, ${s.displayName}`;
    document.getElementById("dashboardSub").textContent = `Role: ${s.role} • ${Store.roles[s.role]?.label||""} — choose what to do today.`;
    document.getElementById("dashboardRoleText").textContent = s.role;
    const tests=document.getElementById("dashboardTests");
    tests.innerHTML=(Store.qIndex||[]).map(x=>`<div class="list-item"><div><strong>${Store.escape(x.title)}</strong><small>${Store.escape(x.description||"")}</small></div><button class="btn btn-ghost btn-sm" onclick="document.getElementById('setupFile').value='${x.id}'; App.showView('test-setup')">Open</button></div>`).join("") || "<p class='muted'>No tests.</p>";
    Materials.renderList();
  },
  renderAdmin(){
    // Never show password hashes. Only super reaches here.
    const users=(Store.users||[]).map(u=>`<tr><td>${u.id}</td><td>${Store.escape(u.username)}</td><td>${Store.escape(u.displayName)}</td><td>${Store.escape(u.role)}</td><td>${u.active?"Active":"Inactive"}</td></tr>`).join("");
    document.getElementById("adminUsersList").innerHTML=`<table><thead><tr><th>ID</th><th>Username</th><th>Name</th><th>Role</th><th>Status</th></tr></thead><tbody>${users}</tbody></table>`;
    const rolesHtml=Object.entries(Store.roles||{}).map(([k,v])=>`<div class="list-item"><div><strong>${k} — ${Store.escape(v.label)}</strong><small>${Store.escape(v.description||"")}</small></div><div style="font-size:12px">${Object.entries(v.permissions||{}).map(([p,val])=>`<span class="badge">${p}: ${val?"Yes":"No"}</span>`).join(" ")}</div></div>`).join("");
    document.getElementById("adminRolesList").innerHTML=rolesHtml;
    const safeConfig={...Store.config};
    document.getElementById("adminConfigPre").textContent=JSON.stringify(safeConfig,null,2);
  },
  toast(msg){
    const t=document.getElementById("toast");
    t.textContent=msg; t.style.display="block";
    setTimeout(()=> t.style.display="none", 2600);
  }
};
document.addEventListener("DOMContentLoaded", ()=> App.init());
