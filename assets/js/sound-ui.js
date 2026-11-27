// The "Listen" player shown with a question: a button, a progress bar and the time. It follows the shared SoundManager.
import { el, mount } from "./util.js";
import { icon } from "./icons.js";
import { sounds, SoundManager } from "./sound.js";
import { fmtTime } from "./test-engine.js";

const LOOK = {
  idle: ["volume", "Listen"],
  loading: ["volume", "Loading…"],
  playing: ["pause", "Pause"],
  paused: ["play", "Resume"],
  ended: ["replay", "Listen again"],
  error: ["warn", "Try again"],
};
const MESSAGES = {
  unsupported: "Your browser cannot play this audio format.",
  load: "The sound could not be loaded.",
  blocked: "Your browser blocked the sound. Press Listen to try again.",
};

/** path: the sound as written in the question file (relative to the page, e.g. "./qsound/easy/q1.mp3"). */
export function createSoundPlayer(path) {
  const url = SoundManager.resolve(path);
  const bar = el("span", { className: "sound-bar" });
  const time = el("span", { className: "sound-time" });
  const msg = el("span", { className: "sound-msg", role: "status" });
  const btn = el("button", { type: "button", className: "sound-btn", onclick: () => sounds.toggle(path) });
  const eq = el("span", { className: "sound-eq", "aria-hidden": "true" }, el("i"), el("i"), el("i"));
  const node = el("div", { className: "sound-player" },
    btn,
    el("div", { className: "sound-meter" }, el("div", { className: "sound-track" }, bar), time, eq),
    msg);

  function paint({ state, reason = "", currentTime = 0, duration = 0 }) {
    const [iconName, label] = LOOK[state];
    mount(btn, icon(iconName, { size: 20 }), label);
    btn.disabled = state === "loading" || (state === "error" && reason === "unsupported");
    bar.style.width = duration ? `${Math.min(100, (currentTime / duration) * 100)}%` : state === "ended" ? "100%" : "0%";
    time.textContent = duration && state !== "idle" ? `${fmtTime(currentTime)} / ${fmtTime(duration)}` : "";
    msg.textContent = state === "error" ? MESSAGES[reason] ?? MESSAGES.load : "";
    node.classList.toggle("is-playing", state === "playing");
    node.classList.toggle("is-error", state === "error");
  }

  const off = sounds.on((info) => {
    if (!node.isConnected) { off(); return; } // the question was replaced: stop following
    paint(info.url === url ? info : { state: "idle" });
  });
  paint(SoundManager.canPlay(path) ? { state: "idle" } : { state: "error", reason: "unsupported" });
  return node;
}
