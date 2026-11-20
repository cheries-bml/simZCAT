const SESSION_KEY = "educat_session";

export async function login(username, password) {
  const [usersRes, rolesRes] = await Promise.all([
    fetch("data/users.json"),
    fetch("data/roles.json")
  ]);

  if (!usersRes.ok || !rolesRes.ok) {
    throw new Error("Unable to load authentication data.");
  }

  const users = await usersRes.json();
  const roles = await rolesRes.json();

  const user = users.find(
    (u) => u.username === username.trim() && u.password === password
  );

  if (!user) return null;

  const roleInfo = roles[user.role] || { label: user.role, permissions: [] };
  const session = {
    username: user.username,
    name: user.name,
    role: user.role,
    roleLabel: roleInfo.label,
    permissions: roleInfo.permissions
  };

  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function getSession() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function logout() {
  sessionStorage.removeItem(SESSION_KEY);
}
