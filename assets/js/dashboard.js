import { loadData, getSession, touchSession, logout, can, permissionsOf, roleLabel, userRoles } from "./auth.js";
import { el } from "./util.js";
import { alertModal } from "./modal.js";
import { renderTests, canLeave } from "./test-ui.js";
import { renderReports } from "./reports.js";
import { renderPasswordTool } from "./password-tool.js";

// Each section is shown only if the user's roles grant the permission.
const SECTIONS = [
  { id: "overview",  label: "Overview",  permission: "overview.view",  render: renderOverview },
  { id: "test",      label: "Test",      permission: "test.view",      render: (opts) => renderTests({ config: data.config, session, roles: data.roles }, opts?.path) },
  { id: "reports",   label: "Reports",   permission: "reports.view",   render: () => renderReports({ config: data.config, session, roles: data.roles, onRetake: (path) => show("test", { path }) }) },
  { id: "users",     label: "Users",     permission: "users.view",     render: renderUsers },
  { id: "passwords", label: "Passwords", permission: "passwords.tool", render: () => renderPasswordTool({ config: data.config, users: data.users }) },
  { id: "settings",  label: "Settings",  permission: "settings.view",  render: renderSettings },
];

const $ = (id) => document.getElementById(id);
const labels = (keys) => keys.map((k) => roleLabel(data.roles, k)).join(", ");
const content = $("content");
let data, session;

function renderOverview() {
  return [
    el("h1", { textContent: `Welcome back, ${session.name.split(" ")[0]}` }),
    el("p", { className: "lede", textContent: `You are signed in as ${labels(session.roles)}.` }),
    el("section", { className: "panel" },
      el("h2", { textContent: "Your permissions" }),
      el("ul", { className: "chips" }, ...permissionsOf(session, data.roles).map((p) => el("li", { textContent: p })))),
  ];
}

function renderUsers() {
  const rows = data.users.map((u) => el("tr", {},
    el("td", { textContent: u.name }),
    el("td", { textContent: u.username }),
    el("td", { textContent: u.email }),
    el("td", { textContent: labels(userRoles(u)) }),
    el("td", { textContent: u.active ? "Active" : "Disabled", className: u.active ? "" : "status-off" })));
  const head = el("tr", {}, ...["Name", "Username", "Email", "Roles", "Status"].map((t) => el("th", { textContent: t })));
  return [
    el("h1", { textContent: "Users" }),
    el("section", { className: "panel table-wrap" }, el("table", {}, el("thead", {}, head), el("tbody", {}, ...rows))),
  ];
}

function renderSettings() {
  const { passwordSalt, ...safe } = data.config; // keep the salt off the screen
  return [
    el("h1", { textContent: "Settings" }),
    el("section", { className: "panel" }, el("pre", { textContent: JSON.stringify(safe, null, 2) })),
  ];
}

async function show(id, opts) {
  if (!(await canLeave())) return; // a running test asks for confirmation first
  const section = SECTIONS.find((s) => s.id === id);
  content.replaceChildren(...section.render(opts));
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
    content.replaceChildren(el("p", { className: "muted", textContent: "The app data could not be loaded." }));
    console.error(err);
    alertModal("Something went wrong", "Please try again later.");
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
  $("user-role").textContent = labels(session.roles);
  $("logout-btn").addEventListener("click", async () => { if (await canLeave()) logout(data.config); });

  $("nav").replaceChildren(...allowed.map((s) =>
    el("button", { type: "button", textContent: s.label, dataset: { id: s.id }, onclick: () => show(s.id) })));

  const start = allowed.find((s) => s.id === location.hash.slice(1)) ?? allowed[0];
  if (!start) { logout(data.config); return; }
  await show(start.id);
  document.body.hidden = false;

  // Sliding session: activity extends it; expiry signs the user out.
  ["click", "keydown"].forEach((evt) => document.addEventListener(evt, () => touchSession(data.config)));
  setInterval(() => { if (!getSession()) logout(data.config); }, 15000);
}

init();
