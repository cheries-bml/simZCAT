import { loadData, getSession, touchSession, logout, can, roleLabel, userRoles } from "./auth.js";
import { el, mount } from "./util.js";
import { alertModal } from "./modal.js";
import { icon } from "./icons.js";
import { brandNodes } from "./brand.js";
import { renderHome } from "./home.js";
import { renderTests, canLeave } from "./test-ui.js";
import { renderReports } from "./reports.js";
import { renderPasswordTool } from "./password-tool.js";

// Each section is shown only if the user's roles grant the permission.
// "overview" is the home page; it is opened from the logo, not from the menu.
const SECTIONS = [
  { id: "overview",  label: "Home",      permission: "overview.view",  render: () => renderHome({ config: data.config, session, roles: data.roles, go: show }) },
  { id: "test",      label: "Test",      icon: "test",     permission: "test.view",      render: (opts) => renderTests({ config: data.config, session, roles: data.roles }, opts?.path) },
  { id: "reports",   label: "Reports",   icon: "chart",    permission: "reports.view",   render: () => renderReports({ config: data.config, session, roles: data.roles, onRetake: (path) => show("test", { path }) }) },
  { id: "users",     label: "Users",     icon: "users",    permission: "users.view",     render: renderUsers },
  { id: "passwords", label: "Passwords", icon: "key",      permission: "passwords.tool", render: () => renderPasswordTool({ config: data.config, users: data.users }) },
  { id: "settings",  label: "Settings",  icon: "settings", permission: "settings.view",  render: renderSettings },
];

const $ = (id) => document.getElementById(id);
const labels = (keys) => keys.map((k) => roleLabel(data.roles, k)).join(", ");
const content = $("content");
const brand = $("brand");
let data, session;

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
  if (id === "overview") brand.setAttribute("aria-current", "page");
  else brand.removeAttribute("aria-current");
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
  $("user-name").textContent = session.name;
  $("user-role").textContent = labels(session.roles);
  $("logout-btn").prepend(icon("logout", { size: 16 }));
  $("logout-btn").addEventListener("click", async () => { if (await canLeave()) logout(data.config); });

  // The logo is the link to the home page.
  mount(brand, brandNodes(data.config));
  const home = allowed.find((s) => s.id === "overview") ?? allowed[0];
  brand.addEventListener("click", (e) => { e.preventDefault(); if (home) show(home.id); });

  $("nav").replaceChildren(...allowed.filter((s) => s.id !== "overview").map((s) =>
    el("button", { type: "button", dataset: { id: s.id }, onclick: () => show(s.id) }, icon(s.icon, { size: 18 }), s.label)));

  const start = allowed.find((s) => s.id === location.hash.slice(1)) ?? allowed[0];
  if (!start) { logout(data.config); return; }
  await show(start.id);
  document.body.hidden = false;

  // Sliding session: activity extends it; expiry signs the user out.
  ["click", "keydown"].forEach((evt) => document.addEventListener(evt, () => touchSession(data.config)));
  setInterval(() => { if (!getSession()) logout(data.config); }, 15000);
}

init();
