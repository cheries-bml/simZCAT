import { login, getSession, logout } from "./auth.js";
import { CATModule } from "./cat.js";
import { TeachingModule } from "./teaching.js";
import { MaterialsModule } from "./materials.js";

let appConfig = {};

async function bootstrap() {
  const cfgRes = await fetch("data/config.json");
  appConfig = await cfgRes.json();

  document.getElementById("app-title").textContent = appConfig.appName;
  document.getElementById("sidebar-title").textContent = appConfig.appName;

  const session = getSession();
  if (session) {
    await enterApp(session);
  } else {
    showLogin();
  }

  document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = document.getElementById("username").value;
    const pass = document.getElementById("password").value;
    const errEl = document.getElementById("login-error");

    try {
      const authSession = await login(user, pass);
      if (!authSession) {
        errEl.textContent = "Invalid credentials.";
        errEl.classList.remove("hidden");
        return;
      }
      errEl.classList.add("hidden");
      await enterApp(authSession);
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove("hidden");
    }
  });

  document.getElementById("logout-btn").addEventListener("click", () => {
    logout();
    location.reload();
  });

  if (window.lucide) window.lucide.createIcons();
}

function showLogin() {
  document.getElementById("login-view").classList.remove("hidden");
  document.getElementById("app-shell").classList.add("hidden");
}

async function enterApp(session) {
  document.getElementById("login-view").classList.add("hidden");
  document.getElementById("app-shell").classList.remove("hidden");

  document.getElementById("user-display-name").textContent = session.name;
  document.getElementById("user-display-role").textContent = session.roleLabel;

  buildNavigation(session);

  const cat = new CATModule(appConfig);
  await cat.init();

  const materials = new MaterialsModule();
  await materials.init();

  if (session.permissions.includes("teaching")) {
    const teaching = new TeachingModule();
    await teaching.init();
  }

  // Strictly restrict verbose/sensitive diagnostics to "super" role only
  if (session.role === "super") {
    document.getElementById("super-diagnostics").textContent = JSON.stringify(
      { session, config: appConfig },
      null,
      2
    );
  }

  if (window.lucide) window.lucide.createIcons();
}

function buildNavigation(session) {
  const navItems = [
    { id: "cat", label: "CAT Exam", icon: "file-check", perm: "cat" },
    { id: "teaching", label: "Teaching Mode", icon: "presentation", perm: "teaching" },
    { id: "materials", label: "Materials", icon: "book-open", perm: "materials" }
  ];

  // Super-only view
  if (session.role === "super") {
    navItems.push({ id: "admin", label: "System", icon: "shield-alert", perm: "admin" });
  }

  const navMenu = document.getElementById("nav-menu");
  const allowed = navItems.filter((item) => session.permissions.includes(item.perm));

  navMenu.innerHTML = allowed
    .map(
      (item, idx) => `
      <button class="nav-item ${idx === 0 ? "active" : ""}" data-view="view-${item.id}">
        <i data-lucide="${item.icon}"></i>
        <span>${item.label}</span>
      </button>`
    )
    .join("");

  navMenu.querySelectorAll(".nav-item").forEach((btn) => {
    btn.onclick = () => {
      navMenu.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      switchView(btn.dataset.view, session);
    };
  });

  if (allowed.length > 0) switchView(`view-${allowed[0].id}`, session);
}

function switchView(viewId, session) {
  // Guard sensitive view
  if (viewId === "view-admin" && session.role !== "super") return;

  document.querySelectorAll(".view-section").forEach((sec) => sec.classList.add("hidden"));
  const target = document.getElementById(viewId);
  if (target) target.classList.remove("hidden");
}

bootstrap();
