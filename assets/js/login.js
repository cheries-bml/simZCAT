import { loadData, login, getSession } from "./auth.js";
import { alertModal } from "./modal.js";

const form = document.getElementById("login-form");
const button = document.getElementById("login-btn");

async function init() {
  let data;
  try {
    data = await loadData();
  } catch (err) {
    console.error(err);
    alertModal("Something went wrong", "Please try again later.");
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
    const username = form.username.value;
    const password = form.password.value;
    if (!username.trim() || !password) {
      await alertModal("Missing details", "Enter your username and password.");
      (username.trim() ? form.password : form.username).focus();
      return;
    }
    button.disabled = true;
    const result = await login(username, password, data);
    button.disabled = false;
    if (result.ok) {
      location.replace(data.config.defaultPage);
    } else {
      form.password.value = "";
      await alertModal("Sign-in failed", result.message);
      form.password.focus();
    }
  });
}

init();
