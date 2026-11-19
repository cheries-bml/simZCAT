// SimpleAuth v2 — assets/js/app.js — GET only, no DB, no POST
const DATA = { config: 'data/config.json', users: 'data/users.json', roles: 'data/roles.json' };
let CONFIG = null, USERS = [], ROLES = [], currentUser = null, currentRole = null;
const $ = (id) => document.getElementById(id);
const show = (el) => { if (el) el.hidden = false; };
const hide = (el) => { if (el) el.hidden = true; };

async function getJSON(url) {
  const res = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' }, cache: 'no-store' });
  if (!res.ok) throw new Error('GET ' + url + ' failed');
  return res.json();
}
async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function getSessionKey() { return (CONFIG && CONFIG.sessionKey) || 'simpleauth_session'; }
function saveSession(user) {
  const payload = { userId: user.id, username: user.username, roleId: user.roleId, loginAt: new Date().toISOString(), expiresAt: new Date(Date.now() + (CONFIG?.sessionTimeoutMinutes || 120) * 60000).toISOString() };
  const store = $('rememberMe')?.checked ? localStorage : sessionStorage;
  sessionStorage.removeItem(getSessionKey()); localStorage.removeItem(getSessionKey());
  store.setItem(getSessionKey(), JSON.stringify(payload));
  return payload;
}
function readSession() {
  const raw = sessionStorage.getItem(getSessionKey()) || localStorage.getItem(getSessionKey());
  if (!raw) return null;
  try { const s = JSON.parse(raw); if (new Date(s.expiresAt) < new Date()) { clearSession(); return null; } return s; } catch { return null; }
}
function clearSession() { sessionStorage.removeItem(getSessionKey()); localStorage.removeItem(getSessionKey()); }

async function loadAllData() {
  const [c, u, r] = await Promise.all([getJSON(DATA.config), getJSON(DATA.users), getJSON(DATA.roles)]);
  CONFIG = c; USERS = u.users || u; ROLES = r.roles || r;
  const v = CONFIG.version ? 'v' + CONFIG.version : 'v2.0.0';
  if ($('appName')) $('appName').textContent = CONFIG.appName || 'SimpleAuth';
  if ($('versionPill')) $('versionPill').textContent = v;
  if ($('versionText')) $('versionText').textContent = v;
  if ($('footerText')) $('footerText').textContent = (CONFIG.appName || 'SimpleAuth') + ' ' + v;
  if (CONFIG.brandColor) document.documentElement.style.setProperty('--brand', CONFIG.brandColor);
  document.title = (CONFIG.appName || 'SimpleAuth') + ' — Sign in';
  renderDemoList();
}
function renderDemoList() {
  const wrap = $('demoList'); if (!wrap) return;
  wrap.innerHTML = '';
  USERS.forEach(u => {
    const role = ROLES.find(r => r.id === u.roleId);
    const b = document.createElement('button'); b.type = 'button'; b.className = 'demo-btn';
    b.innerHTML = '<b>' + u.username + '</b><span>' + (role ? role.name : u.roleId) + '</span>';
    b.onclick = () => { $('username').value = u.username; $('password').value = u.passwordHint || ''; $('password').focus(); };
    wrap.appendChild(b);
  });
}
async function handleLogin(e) {
  e.preventDefault();
  const username = $('username').value.trim().toLowerCase();
  const password = $('password').value;
  const err = $('loginError'); hide(err);
  if (!username || !password) { err.textContent = 'Enter username and password.'; show(err); return; }
  $('loginBtn').disabled = true; $('loginBtn').textContent = 'Signing in…';
  try {
    const fresh = await getJSON(DATA.users); USERS = fresh.users || fresh;
    const user = USERS.find(u => u.username.toLowerCase() === username && u.active !== false);
    if (!user) throw new Error('User not found.');
    const hash = await sha256Hex(password);
    if (hash !== user.passwordHash) throw new Error('Wrong password.');
    const session = saveSession(user); currentUser = user; currentRole = ROLES.find(r => r.id === user.roleId);
    renderDashboard(session);
  } catch (ex) { err.textContent = ex.message; show(err); }
  finally { $('loginBtn').disabled = false; $('loginBtn').textContent = 'Sign in'; }
}
function renderDashboard(session) {
  hide($('loginView')); show($('dashboardView'));
  $('welcomeTitle').textContent = 'Hello, ' + currentUser.name;
  $('welcomeSub').textContent = '@' + currentUser.username + ' • ' + (currentRole?.name || currentUser.roleId);
  $('roleName').textContent = currentRole?.name || currentUser.roleId;
  $('roleDesc').textContent = currentRole?.description || '';
  $('permCount').textContent = (currentRole?.permissions?.length || 0) + ' permissions';
  $('sessionInfo').textContent = 'Active';
  $('sessionExpiry').textContent = session ? 'Expires ' + new Date(session.expiresAt).toLocaleTimeString() : '';
  $('profileAvatar').textContent = currentUser.avatar || currentUser.name[0];
  $('profileName').textContent = currentUser.name;
  $('profileEmail').textContent = currentUser.email;
  $('profileMeta').textContent = (currentUser.department || '') + ' • @' + currentUser.username;
  $('sessionJson').textContent = JSON.stringify(session, null, 2);
  $('permList').innerHTML = '';
  (currentRole?.permissions || []).forEach(p => { const s = document.createElement('span'); s.textContent = p; $('permList').appendChild(s); });
  $('widgetList').innerHTML = '';
  const icons = { users: '👥', reports: '📊', settings: '⚙️', activity: '📈' };
  (currentRole?.dashboardWidgets || []).forEach(w => { const d = document.createElement('div'); d.innerHTML = '<b>' + (icons[w] || '🧩') + '</b><span>' + w + '</span>'; $('widgetList').appendChild(d); });
  const canView = currentRole?.permissions?.includes('view_users');
  if (canView) {
    show($('usersTableCard')); $('userCount').textContent = USERS.length + '';
    $('usersTableBody').innerHTML = USERS.map(u => {
      const r = ROLES.find(x => x.id === u.roleId);
      return '<tr><td><strong>' + u.name + '</strong><br><small>' + u.email + '</small></td><td>@' + u.username + '</td><td><span class="badge" style="background:' + (r?.color || '#888') + '">' + (r?.name || u.roleId) + '</span></td><td>' + (u.department || '-') + '</td><td>' + (u.active ? 'Active' : 'Inactive') + '</td></tr>';
    }).join('');
  } else hide($('usersTableCard'));
  $('configJson').textContent = JSON.stringify(CONFIG, null, 2);
}
function logout() { clearSession(); currentUser = null; currentRole = null; hide($('dashboardView')); show($('loginView')); $('loginForm').reset(); $('username').focus(); }

document.addEventListener('DOMContentLoaded', async () => {
  $('loginForm').addEventListener('submit', handleLogin);
  $('logoutBtn').addEventListener('click', logout);
  $('togglePass').addEventListener('click', () => { const p = $('password'); p.type = p.type === 'password' ? 'text' : 'password'; });
  $('refreshBtn').addEventListener('click', async () => { await loadAllData(); const s = readSession(); if (s && currentUser) renderDashboard(s); });
  $('toggleConfig').addEventListener('click', () => { const el = $('configJson'); el.hidden = !el.hidden; $('toggleConfig').textContent = el.hidden ? 'Show' : 'Hide'; });
  $('copySession').addEventListener('click', async () => { try { await navigator.clipboard.writeText($('sessionJson').textContent); $('copySession').textContent = 'Copied'; setTimeout(() => $('copySession').textContent = 'Copy', 1200); } catch {} });
  try {
    await loadAllData();
    const s = readSession();
    if (s) { const u = USERS.find(x => x.id === s.userId); if (u) { currentUser = u; currentRole = ROLES.find(r => r.id === u.roleId); renderDashboard(s); } }
  } catch (err) { const e = $('loginError'); e.textContent = 'Failed to load JSON. Use GitHub Pages or Live Server.'; show(e); }
});
