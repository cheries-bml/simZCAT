import { loadData, login, getSession } from "./auth.js";

const form = document.getElementById("login-form");
const errorBox = document.getElementById("login-error");
const button = document.getElementById("login-btn");

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}

async function init() {
  let data;
  try {
    data = await loadData();
  } catch (err) {
    showError(`${err.message}. Serve the site over http(s), not file://.`);
    return;
  }

  document.title = `Sign in · ${data.config.appName}`;
  document.getElementById("app-name").textContent = data.config.appName;
  document.getElementById("app-tagline").textContent = data.config.tagline;

  if (getSession()) {
    location.replace(data.config.defaultPage);
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.hidden = true;
    const username = form.username.value;
    const password = form.password.value;
    if (!username.trim() || !password) {
      showError("Enter your username and password.");
      return;
    }
    button.disabled = true;
    const result = await login(username, password, data);
    button.disabled = false;
    if (result.ok) {
      location.replace(data.config.defaultPage);
    } else {
      form.password.value = "";
      showError(result.message);
    }
  });
}

init();
