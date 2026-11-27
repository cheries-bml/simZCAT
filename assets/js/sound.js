// SoundManager: a small reusable sound player built on the browser's Audio API (HTMLAudioElement).
// One shared instance plays one sound at a time, caches the audio it has loaded, and tells anyone who listens
// what is happening (idle / loading / playing / paused / ended / error), so any button or bar can follow it.

// File type -> MIME type, used to ask the browser whether it can play the format before trying.
const MIME = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg", oga: "audio/ogg", opus: "audio/ogg; codecs=opus",
  m4a: "audio/mp4", aac: "audio/aac", flac: "audio/flac",
};

export class SoundManager {
  #cache = new Map();   // absolute url -> HTMLAudioElement
  #audio = null;        // the sound that is current
  #url = null;
  #state = "idle";      // "idle" | "loading" | "playing" | "paused" | "ended" | "error"
  #reason = "";         // for "error": "unsupported" | "load" | "blocked"
  #listeners = new Set();

  /** File extension of a path or URL, lowercase, without query or hash. */
  static extension(path) { return (String(path).split(/[?#]/)[0].split(".").pop() || "").toLowerCase(); }

  /** Paths such as "./qsound/a/q1.mp3" are relative to the page (dashboard.html), which works on GitHub Pages project sites. */
  static resolve(path) { return new URL(path, document.baseURI).href; }

  /** Can this browser play the file's format? Unknown extensions are tried anyway. */
  static canPlay(path) {
    const mime = MIME[SoundManager.extension(path)];
    if (!mime) return true;
    try { return new Audio().canPlayType(mime) !== ""; } catch { return false; }
  }

  get info() {
    const a = this.#audio;
    return { url: this.#url, state: this.#state, reason: this.#reason, currentTime: a?.currentTime ?? 0, duration: Number.isFinite(a?.duration) ? a.duration : 0 };
  }

  /** fn(info) is called on every change. Returns a function that stops listening. */
  on(fn) {
    this.#listeners.add(fn);
    return () => this.#listeners.delete(fn);
  }

  #emit(info = this.info) {
    for (const fn of [...this.#listeners]) {
      try { fn(info); } catch (err) { console.error(err); }
    }
  }

  #set(state, reason = "") {
    this.#state = state;
    this.#reason = reason;
    this.#emit();
  }

  #create(url) {
    const audio = new Audio();
    audio.preload = "auto";
    const current = () => this.#audio === audio;
    audio.addEventListener("waiting", () => { if (current() && this.#state === "playing") this.#set("loading"); });
    audio.addEventListener("playing", () => { if (current()) this.#set("playing"); });
    audio.addEventListener("pause", () => { if (current() && !audio.ended && this.#state === "playing") this.#set("paused"); });
    audio.addEventListener("ended", () => { if (current()) this.#set("ended"); });
    audio.addEventListener("error", () => { if (current()) this.#set("error", "load"); });
    for (const evt of ["timeupdate", "loadedmetadata", "durationchange"]) audio.addEventListener(evt, () => { if (current()) this.#emit(); });
    audio.src = url;
    return audio;
  }

  #halt() {
    if (!this.#audio) return;
    this.#audio.pause();
    try { this.#audio.currentTime = 0; } catch { /* not seekable yet */ }
  }

  /** Starts (or restarts) a sound. Resolves true when playback started. Must be called from a click or key press. */
  async play(path) {
    const url = SoundManager.resolve(path);
    if (this.#url && this.#url !== url) { // another sound was current: stop it and tell its player
      const old = this.#url;
      this.#halt();
      this.#emit({ url: old, state: "idle", reason: "", currentTime: 0, duration: 0 });
    }
    this.#url = url;
    if (!SoundManager.canPlay(path)) {
      this.#audio = null;
      this.#set("error", "unsupported");
      return false;
    }
    let audio = this.#cache.get(url);
    if (audio?.error) { this.#cache.delete(url); audio = null; } // a failed load is tried again from scratch
    if (!audio) { audio = this.#create(url); this.#cache.set(url, audio); }
    this.#audio = audio;
    if (audio.ended || this.#state === "ended") audio.currentTime = 0;
    this.#set("loading");
    try {
      await audio.play();
      return true;
    } catch (err) {
      if (err?.name !== "AbortError") { // AbortError = another play() or pause() took over
        console.error(err);
        this.#set("error", err?.name === "NotAllowedError" ? "blocked" : "load");
      }
      return false;
    }
  }

  pause() {
    if (this.#audio && this.#state === "playing") {
      this.#audio.pause();
      this.#set("paused");
    }
  }

  /** Stops and rewinds. */
  stop() {
    if (!this.#audio && this.#state === "idle") return;
    this.#halt();
    this.#set("idle");
  }

  /** Plays the sound, or pauses it if it is the one playing. */
  toggle(path) {
    if (this.#url === SoundManager.resolve(path) && this.#state === "playing") { this.pause(); return Promise.resolve(false); }
    return this.play(path);
  }

  destroy() {
    this.stop();
    this.#cache.clear();
    this.#listeners.clear();
    this.#audio = null;
    this.#url = null;
  }
}

/** The shared instance used by the app. */
export const sounds = new SoundManager();
