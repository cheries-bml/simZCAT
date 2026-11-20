// admin.js - Super only, no sensitive data
const ADMIN = {
  async render(){
    const isSuper = Auth.user?.role==='super';
    document.getElementById('adminLocked').classList.toggle('hidden', isSuper);
    document.getElementById('adminContent').classList.toggle('hidden', !isSuper);
    if(!isSuper) return;
    try{
      const [users, roles, config] = await Promise.all([fetchJSON('data/users.json'), fetchJSON('data/roles.json'), fetchJSON('data/config.json')]);
      document.getElementById('adminUserCount').textContent=users.length;
      document.getElementById('adminRoleCount').textContent=roles.length;
      document.getElementById('adminTestCount').textContent=(config.questionsFiles||[]).length;
      // Users table - never show passwordHash
      document.getElementById('adminUsersTable').innerHTML=`<table class="table"><thead><tr><th>Username</th><th>Name</th><th>Role</th><th>Status</th></tr></thead><tbody>${users.map(u=>`<tr><td><b>${esc(u.username)}</b></td><td>${esc(u.displayName||'')}</td><td><span class="pill">${esc(u.role)}</span></td><td>${u.active?'<span class="pill success">Active</span>':'<span class="pill danger">Inactive</span>'}</td></tr>`).join('')}</tbody></table>`;
      document.getElementById('adminRolesTable').innerHTML=roles.map(r=>`<div style="margin-bottom:12px"><b>${esc(r.label)}</b> <span class="pill gray">${esc(r.id)}</span><p class="small muted">${esc(r.description||'')}</p><div class="chip-row">${(r.permissions||[]).map(p=>`<span class="pill">${esc(p)}</span>`).join('')}</div></div>`).join('');
    }catch(e){
      showToast('Could not load admin data');
    }
  }
};
