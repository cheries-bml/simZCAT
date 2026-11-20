
const App = {
  current:'dashboard',
  async init(){
    try{ await Auth.loadAll(); }catch(e){
      $('#loginError').textContent='Cannot load data files. Serve via HTTP (GitHub Pages / Live Server), not file:// — '+e.message;
      $('#loginError').classList.remove('hidden');
      return;
    }
    // login bindings
    $('#loginForm').addEventListener('submit', async (e)=>{
      e.preventDefault();
      const btn=$('#loginBtn'); btn.disabled=true; btn.textContent='Signing in…';
      try{
        await Auth.login($('#username').value, $('#password').value);
        this.showApp();
      }catch(err){
        const el=$('#loginError'); el.textContent=err.message; el.classList.remove('hidden');
      } finally { btn.disabled=false; btn.innerHTML='Sign in <span class="material-symbols-outlined">arrow_forward</span>'; }
    });
    $('#togglePass').addEventListener('click', ()=>{
      const p=$('#password'); const isPass=p.type==='password'; p.type=isPass?'text':'password';
      $('#togglePass').innerHTML='<span class="material-symbols-outlined">'+(isPass?'visibility_off':'visibility')+'</span>';
    });
    $$('[data-demo]').forEach(b=>b.addEventListener('click', ()=>{
      const u=b.dataset.demo;
      $('#username').value=u;
      $('#password').value = u==='super'?'Super123!': u==='teacher'?'Teach123!':'Student123!';
      $('#loginError').classList.add('hidden');
    }));
    $('#logoutBtn').addEventListener('click', ()=>{ Auth.logout(); this.showLogin(); });
    $('#refreshBtn').addEventListener('click', async ()=>{ try{ await Auth.loadAll(); this.navigate(this.current); }catch(e){ alert(e.message); } });
    $('#menuBtn').addEventListener('click', ()=>{ $('.sidebar').classList.toggle('open'); });

    if(Auth.restore()){
      // re-validate session user still exists
      const exists = Auth.usersRaw.find(u=>u.username===Auth.user.username && u.active);
      if(exists) this.showApp(); else { Auth.logout(); this.showLogin(); }
    } else this.showLogin();
  },
  showLogin(){ hide($('#appView')); show($('#loginView')); },
  showApp(){
    hide($('#loginView')); show($('#appView'));
    $('#userName').textContent=Auth.user.name;
    $('#userRole').textContent=Auth.user.role;
    $('#userAvatar').textContent=(Auth.user.name||'U').charAt(0).toUpperCase();
    this.buildNav();
    this.navigate('dashboard');
  },
  buildNav(){
    const items=[
      {id:'dashboard', label:'Dashboard', icon:'dashboard', perm:'dashboard'},
      {id:'cat', label:'Take Test (CAT)', icon:'quiz', perm:'take_test'},
      {id:'teach', label:'Teach / Discuss', icon:'menu_book', perm:'teach'},
      {id:'materials', label:'Materials', icon:'folder', perm:'materials'},
      {id:'generator', label:'Generate Test', icon:'auto_awesome', perm:'generate'},
      {id:'admin', label:'Manage Data', icon:'admin_panel_settings', perm:'manage_data'},
    ];
    const nav=$('#nav');
    nav.innerHTML=items.filter(i=>Auth.can(i.perm)).map(i=>'<button data-nav="'+i.id+'" class="'+(i.id===this.current?'active':'')+'"><span class="material-symbols-outlined">'+i.icon+'</span>'+i.label+'</button>').join('');
    $$('[data-nav]', nav).forEach(b=>b.addEventListener('click', ()=>this.navigate(b.dataset.nav)));
  },
  setTitle(t, sub){ $('#pageTitle').textContent=t; $('#pageSub').textContent=sub||''; $('.sidebar').classList.remove('open'); },
  navigate(view){
    if(view==='admin' && !Auth.isSuper()){
      $('#view').innerHTML='<div class="card"><h3>Restricted</h3><p>This page is for role <strong>super</strong> only.</p></div>';
      this.setTitle('Restricted','Super only'); this.current=view; this.buildNav(); return;
    }
    this.current=view; this.buildNav();
    if(view==='dashboard') this.renderDashboard();
    else if(view==='cat') this.renderCATSetup();
    else if(view==='teach') this.renderTeachSetup();
    else if(view==='materials') { this.setTitle('Materials','PDF, PNG, JPG, TXT, MD'); Materials.renderList(); }
    else if(view==='generator') { this.setTitle('Generate Test','From /questions/'); Generator.render(); }
    else if(view==='admin') this.renderAdmin();
  },
  renderDashboard(){
    this.setTitle('Dashboard','Welcome back, '+Auth.user.name);
    const qCount = (Auth.qIndex?.files||[]).reduce((s,f)=>s+(f.count||0),0);
    const mCount = (Auth.mIndex?.materials||[]).length;
    const view=$('#view');
    view.innerHTML=`
      <div class="grid cols3">
        <div class="card"><div class="kpi"><div class="kpi-icon"><span class="material-symbols-outlined">quiz</span></div><div><div class="stat">${qCount}</div><div class="stat-label">Questions available</div></div></div><p style="margin-top:10px">From ${(Auth.qIndex?.files||[]).length} file(s) in /questions/</p></div>
        <div class="card"><div class="kpi"><div class="kpi-icon"><span class="material-symbols-outlined">folder</span></div><div><div class="stat">${mCount}</div><div class="stat-label">Materials</div></div></div><p style="margin-top:10px">PDF, image, text & markdown</p></div>
        <div class="card"><div class="kpi"><div class="kpi-icon"><span class="material-symbols-outlined">badge</span></div><div><div class="stat" style="text-transform:capitalize">${esc(Auth.user.role)}</div><div class="stat-label">Your role</div></div></div><p style="margin-top:10px">${esc(Auth.user.name)} • ${esc(Auth.user.username)}</p></div>
      </div>
      <div class="grid cols2" style="margin-top:16px">
        <div class="card"><h3>Start quickly</h3><p>Choose what to do next.</p><div class="row" style="margin-top:12px">
          ${Auth.can('take_test')?'<button class="btn primary" onclick="App.navigate(\'cat\')"><span class="material-symbols-outlined">play_arrow</span> Take test</button>':''}
          ${Auth.can('teach')?'<button class="btn ghost" onclick="App.navigate(\'teach\')">Teach / Discuss</button>':''}
          ${Auth.can('generate')?'<button class="btn ghost" onclick="App.navigate(\'generator\')">Generate test</button>':''}
          <button class="btn ghost" onclick="App.navigate(\'materials\')">Materials</button>
        </div></div>
        <div class="card"><h3>Question files</h3><p>Loaded via GET from JSON.</p><div style="margin-top:10px">${(Auth.qIndex?.files||[]).map(f=>'<div class="row between" style="padding:8px 0;border-bottom:1px solid #f1f5f9"><span><strong>'+esc(f.title)+'</strong><br><span class="muted">'+esc(f.file)+'</span></span><span class="badge">'+esc(String(f.count))+' Q</span></div>').join('')||'<p class="muted">No files</p>'}</div></div>
      </div>
      <div class="card" style="margin-top:16px"><h3>How updates work</h3><p>All data is JSON. Edit a file in GitHub, commit & push. GitHub Pages serves the new version. No POST requests, no database.</p></div>
    `;
  },
  renderCATSetup(){
    this.setTitle('Take Test (CAT)','Computer Assisted Test');
    const files=Auth.qIndex?.files||[];
    $('#view').innerHTML=`
      <div class="card"><h3>Choose test</h3>
        <div class="form-grid" style="margin-top:12px">
          <label class="field-label">Question file</label><select id="catFile" class="select">${files.map(f=>'<option value="'+esc(f.file)+'">'+esc(f.title)+' ('+esc(f.count)+' Q)</option>').join('')}</select>
          <div class="grid cols2">
            <div><label class="field-label">Difficulty</label><select id="catDiff" class="select"><option value="all">All levels</option><option value="easy">Easy</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></div>
            <div><label class="field-label">Number of questions</label><input id="catCount" type="number" min="1" max="50" value="10" class="text-input"></div>
          </div>
          <button class="btn primary" onclick="App.startCAT()">Start test <span class="material-symbols-outlined">arrow_forward</span></button>
        </div>
      </div>
      <div class="card" style="margin-top:16px"><h3>Types supported</h3><p>Multiple choice (single / multiple correct) and Correction (click segments, type fix, or No Error). Answers are checked locally.</p></div>
    `;
  },
  async startCAT(){
    const file=$('#catFile').value; const diff=$('#catDiff').value; const count=parseInt($('#catCount').value||'10',10);
    this.setTitle('Test','In progress');
    await CAT.startFromFile(file, {difficulty:diff, count});
  },
  renderTeachSetup(){
    this.setTitle('Teach / Discuss','Show answer + explanation');
    if(!Auth.can('teach')){ $('#view').innerHTML='<div class="card"><p>Not available for your role.</p></div>'; return; }
    const files=Auth.qIndex?.files||[];
    $('#view').innerHTML=`
      <div class="card"><h3>Choose file to discuss</h3><div class="form-grid" style="margin-top:12px"><select id="teachFile" class="select">${files.map(f=>'<option value="'+esc(f.file)+'">'+esc(f.title)+'</option>').join('')}</select><button class="btn primary" onclick="App.startTeach()">Open for teaching</button></div></div>
    `;
  },
  async startTeach(){
    const file=$('#teachFile').value;
    this.setTitle('Teach','Discussing questions');
    await Teach.open(file);
  },
  renderAdmin(){
    if(!Auth.isSuper()){ $('#view').innerHTML='<div class="card"><h3>Restricted</h3><p>Super only.</p></div>'; return; }
    this.setTitle('Manage Data','Super only • Edit via GitHub push');
    const users = Auth.usersRaw.map(u=>'<tr><td><strong>'+esc(u.username)+'</strong></td><td>'+esc(u.name)+'</td><td><span class="badge '+esc(u.role)+'">'+esc(u.role)+'</span></td><td>'+(u.active?'Active':'Inactive')+'</td></tr>').join('');
    const roles = Object.entries(Auth.roles).map(([k,v])=>'<tr><td><strong>'+esc(k)+'</strong></td><td>'+esc(v.label||k)+'</td><td>'+esc((v.permissions||[]).join(', '))+'</td></tr>').join('');
    $('#view').innerHTML=`
      <div class="alert info">To update data: edit the JSON file on GitHub → Commit → Push. The site reloads from the new file. No edits are made from this app.</div>
      <div class="grid cols2">
        <div class="card"><h3>Users</h3><p class="muted">Passwords are stored as hashes only. Hashes are not shown here.</p><table class="table"><thead><tr><th>Username</th><th>Name</th><th>Role</th><th>Status</th></tr></thead><tbody>${users}</tbody></table><p class="muted" style="margin-top:10px">File: <code>data/users.json</code></p></div>
        <div class="card"><h3>Roles</h3><table class="table"><thead><tr><th>Role</th><th>Label</th><th>Permissions</th></tr></thead><tbody>${roles}</tbody></table><p class="muted" style="margin-top:10px">File: <code>data/roles.json</code></p></div>
      </div>
      <div class="card" style="margin-top:16px"><h3>Files</h3><p>Config: <code>data/config.json</code> • Questions: <code>/questions/</code> • Materials: <code>/materials/</code></p><p class="muted">Repo: ${esc(Auth.config?.githubRepoUrl||'')}</p><div class="row" style="margin-top:10px"><a class="btn primary" href="${esc(Auth.config?.githubRepoUrl||'#')}" target="_blank" rel="noopener">Open repo on GitHub <span class="material-symbols-outlined">open_in_new</span></a><button class="btn ghost" onclick="App.navigate('dashboard')">Back</button></div></div>
    `;
  }
};
document.addEventListener('DOMContentLoaded', ()=>App.init());
