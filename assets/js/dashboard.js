import { loadData, getSession, touchSession, logout, can } from "./auth.js";
import { el } from "./util.js";
import { renderTests, canLeave } from "./test-ui.js";

// Each section is shown only if the user's role has the permission.
const SECTIONS = [
  { id: "overview", label: "Overview", permission: "overview.view", render: renderOverview },
  { id: "test",     label: "Test",     permission: "test.view",     render: () => renderTests({ config: data.config, session }) },
  { id: "reports",  label: "Reports",  permission: "reports.view",  render: renderReports },
  { id: "users",    label: "Users",    permission: "users.view",    render: renderUsers },
  { id: "settings", label: "Settings", permission: "settings.view", render: renderSettings },
];

const $ = (id) => document.getElementById(id);
const content = $("content");
let data, session;

function renderOverview() {
  const role = data.roles[session.role];
  return [
    el("h1", { textContent: `Welcome back, ${session.name.split(" ")[0]}` }),
    el("p", { className: "lede", textContent: `You are signed in as ${role.label}.` }),
    el("section", { className: "panel" },
      el("h2", { textContent: "Your permissions" }),
      el("ul", { className: "chips" }, ...role.permissions.map((p) => el("li", { textContent: p })))),
  ];
}

function renderReports() {
  return [
    el("h1", { textContent: "Reports" }),
    el("p", { className: "lede", textContent: "Visible to editors and administrators." }),
    el("section", { className: "panel", textContent: "No reports yet. Add your own content in assets/js/dashboard.js." }),
  ];
}

function renderUsers() {
  const rows = data.users.map((u) => el("tr", {},
    el("td", { textContent: u.name }),
    el("td", { textContent: u.username }),
    el("td", { textContent: u.email }),
    el("td", { textContent: data.roles[u.role]?.label ?? u.role }),
    el("td", { textContent: u.active ? "Active" : "Disabled", className: u.active ? "" : "status-off" })));
  const head = el("tr", {}, ...["Name", "Username", "Email", "Role", "Status"].map((t) => el("th", { textContent: t })));
  return [
    el("h1", { textContent: "Users" }),
    el("p", { className: "lede", textContent: "Loaded from data/users.json." }),
    el("section", { className: "panel table-wrap" }, el("table", {}, el("thead", {}, head), el("tbody", {}, ...rows))),
  ];
}

function renderSettings() {
  const { passwordSalt, ...safe } = data.config; // never display the salt
  return [
    el("h1", { textContent: "Settings" }),
    el("p", { className: "lede", textContent: "Loaded from data/config.json." }),
    el("section", { className: "panel" }, el("pre", { textContent: JSON.stringify(safe, null, 2) })),
  ];
}

function show(id) {
  if (!canLeave()) return; // a running test asks for confirmation first
  const section = SECTIONS.find((s) => s.id === id);
  content.replaceChildren(...section.render());
  document.querySelectorAll("#nav button").forEach((b) => {
    if (b.dataset.id === id) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  history.replaceState(null, "", `#${id}`);
  window.scrollTo({ top: 0 });
}

async function init() {
  try {
    data = await loadData();
  } catch (err) {
    document.body.hidden = false;
    content.textContent = err.message;
    return;
  }

  session = getSession();
  if (!session) {
    location.replace(data.config.loginPage);
    return;
  }

  const allowed = SECTIONS.filter((s) => can(session, data.roles, s.permission));
  document.title = `Dashboard · ${data.config.appName}`;
  $("app-name").textContent = data.config.appName;
  $("user-name").textContent = session.name;
  $("user-role").textContent = data.roles[session.role]?.label ?? session.role;
  $("logout-btn").addEventListener("click", () => logout(data.config));

  $("nav").replaceChildren(...allowed.map((s) =>
    el("button", { type: "button", textContent: s.label, dataset: { id: s.id }, onclick: () => show(s.id) })));

  const start = allowed.find((s) => s.id === location.hash.slice(1)) ?? allowed[0];
  if (!start) { logout(data.config); return; }
  show(start.id);
  document.body.hidden = false;

  // Sliding session: activity extends it; expiry signs the user out.
  ["click", "keydown"].forEach((evt) => document.addEventListener(evt, () => touchSession(data.config)));
  setInterval(() => { if (!getSession()) logout(data.config); }, 15000);
}

init();
