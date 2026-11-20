async function renderAdmin(){
  if(!currentUser || currentUser.role!=='super'){ el('adminContent').innerHTML='<p class="error">Access denied. Only role <strong>super</strong> can view this page.</p>'; return; }
  const [roles,config,users]=await Promise.all([loadJSON('data/roles.json'),loadJSON('data/config.json'),loadJSON('data/users.json')]);
  const safeUsers=users.map(u=>({username:u.username,name:u.name,role:u.role}));
  el('adminContent').innerHTML='<h4>Users ('+safeUsers.length+')</h4><table><tr><th>Username</th><th>Name</th><th>Role</th></tr>'+safeUsers.map(u=>'<tr><td>'+escapeHtml(u.username)+'</td><td>'+escapeHtml(u.name)+'</td><td>'+escapeHtml(u.role)+'</td></tr>').join('')+'</table><h4>Roles</h4><pre>'+escapeHtml(JSON.stringify(roles,null,2))+'</pre><h4>Config</h4><pre>'+escapeHtml(JSON.stringify(config,null,2))+'</pre><p class="muted small">To change users / roles / config, edit the JSON files in <code>data/</code> and push to GitHub. No credentials are shown here.</p>';
}
