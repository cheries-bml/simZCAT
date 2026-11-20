export class CATModule {
  constructor(config) {
    this.config = config;
    this.banks = [];
    this.questions = [];
    this.meta = null;
    this.currentIndex = 0;
    this.answers = {};
    this.timerInterval = null;
  }

  async init() {
    const res = await fetch("questions/index.json");
    this.banks = await res.json();

    const select = document.getElementById("bank-select");
    select.innerHTML = this.banks
      .map((b) => `<option value="${b.file}">${b.title}</option>`)
      .join("");

    document.getElementById("start-test-btn").onclick = () => this.startTest();
    document.getElementById("prev-q-btn").onclick = () => this.navigate(-1);
    document.getElementById("next-q-btn").onclick = () => this.navigate(1);
    document.getElementById("submit-exam-btn").onclick = () => this.finishTest();
  }

  async startTest() {
    const file = document.getElementById("bank-select").value;
    const difficulty = document.getElementById("difficulty-select").value;
    const count = parseInt(document.getElementById("question-count").value, 10) || 5;

    const res = await fetch(file);
    const data = await res.json();
    this.meta = data.meta;

    let pool = [...data.questions];
    if (difficulty !== "all") {
      const allowedLevels = this.config.difficultyLevels[difficulty] || [];
      pool = pool.filter((q) => allowedLevels.includes(q.config?.level));
    }

    // Shuffle and slice to requested count
    pool.sort(() => Math.random() - 0.5);
    this.questions = pool.slice(0, Math.min(count, pool.length));

    if (this.questions.length === 0) {
      alert("No questions match the selected difficulty filter.");
      return;
    }

    this.currentIndex = 0;
    this.answers = {};

    document.getElementById("cat-setup-panel").classList.add("hidden");
    document.getElementById("cat-result-panel").classList.add("hidden");
    document.getElementById("cat-exam-panel").classList.remove("hidden");
    document.getElementById("exam-title").textContent = this.meta.title;

    this.setupTimer();
    this.renderQuestion();
  }

  setupTimer() {
    clearInterval(this.timerInterval);
    const timerEl = document.getElementById("exam-timer");
    if (this.meta?.config?.no_timer) {
      timerEl.classList.add("hidden");
      return;
    }

    let totalSeconds = this.questions.reduce(
      (sum, q) => sum + (q.config?.time_in_seconds?.normal || 30),
      0
    );
    timerEl.classList.remove("hidden");

    this.timerInterval = setInterval(() => {
      totalSeconds--;
      const mins = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
      const secs = String(totalSeconds % 60).padStart(2, "0");
      document.getElementById("timer-text").textContent = `${mins}:${secs}`;
      if (totalSeconds <= 0) this.finishTest();
    }, 1000);
  }

  renderQuestion() {
    const q = this.questions[this.currentIndex];
    const container = document.getElementById("cat-question-container");
    document.getElementById("exam-progress").textContent =
      `Question ${this.currentIndex + 1} of ${this.questions.length}`;

    let html = "";
    if (q.data?.hint) html += `<p class="hint-text">${q.data.hint}</p>`;
    if (q.data?.image?.url) {
      html += `<img src="${q.data.image.url}" alt="Question visual" class="q-image" />`;
    }
    if (q.data?.passage) {
      html += `<div class="passage-box">${q.data.passage}</div>`;
    }
    if (q.data?.question) {
      html += `<h3 style="margin-bottom:1rem;">${q.data.question}</h3>`;
    }

    if (q.type === "multiple_choice") {
      const saved = this.answers[q.id];
      html += `<div class="options-list">`;
      for (const [key, opt] of Object.entries(q.options)) {
        const selectedClass = saved === key ? "selected" : "";
        html += `
          <div class="option-item ${selectedClass}" data-key="${key}">
            <strong>${key}.</strong> <span>${opt.text}</span>
          </div>`;
      }
      html += `</div>`;
    } else if (q.type === "correction") {
      const savedMap = this.answers[q.id] || { noError: false, corrections: {} };
      html += `<div class="segment-sentence">`;
      q.multiErrorSegments.forEach((seg) => {
        if (!seg.clickable) {
          html += `<span>${seg.text} </span>`;
        } else {
          const editedVal = savedMap.corrections[seg.id];
          const display = editedVal ? `${seg.text} → [${editedVal}]` : seg.text;
          html += `<span class="seg-clickable ${editedVal ? "edited" : ""}" data-seg="${seg.id}">${display}</span> `;
        }
      });
      html += `</div>
        <div id="seg-editor" class="seg-editor-box hidden">
          <input type="text" id="seg-input" placeholder="Type corrected phrase..." />
          <button type="button" id="seg-save-btn" class="btn btn-primary">Apply</button>
        </div>
        <label style="display:flex;align-items:center;gap:0.5rem;margin-top:0.75rem;">
          <input type="checkbox" id="no-error-chk" style="width:auto;" ${savedMap.noError ? "checked" : ""}/>
          No Error
        </label>`;
    }

    container.innerHTML = html;
    this.bindQuestionEvents(q);
  }

  bindQuestionEvents(q) {
    if (q.type === "multiple_choice") {
      document.querySelectorAll(".option-item").forEach((el) => {
        el.onclick = () => {
          this.answers[q.id] = el.dataset.key;
          this.renderQuestion();
        };
      });
    } else if (q.type === "correction") {
      if (!this.answers[q.id]) {
        this.answers[q.id] = { noError: false, corrections: {} };
      }
      let activeSegId = null;

      document.querySelectorAll(".seg-clickable").forEach((el) => {
        el.onclick = () => {
          activeSegId = el.dataset.seg;
          const editor = document.getElementById("seg-editor");
          const input = document.getElementById("seg-input");
          editor.classList.remove("hidden");
          input.value = this.answers[q.id].corrections[activeSegId] || "";
          input.focus();
        };
      });

      const saveBtn = document.getElementById("seg-save-btn");
      if (saveBtn) {
        saveBtn.onclick = () => {
          const val = document.getElementById("seg-input").value.trim();
          if (val) {
            this.answers[q.id].corrections[activeSegId] = val;
            this.answers[q.id].noError = false;
          } else {
            delete this.answers[q.id].corrections[activeSegId];
          }
          this.renderQuestion();
        };
      }

      const noErrChk = document.getElementById("no-error-chk");
      if (noErrChk) {
        noErrChk.onchange = (e) => {
          this.answers[q.id].noError = e.target.checked;
          if (e.target.checked) this.answers[q.id].corrections = {};
          this.renderQuestion();
        };
      }
    }
  }

  navigate(step) {
    const next = this.currentIndex + step;
    if (next >= 0 && next < this.questions.length) {
      this.currentIndex = next;
      this.renderQuestion();
    }
  }

  finishTest() {
    clearInterval(this.timerInterval);
    let score = 0;

    this.questions.forEach((q) => {
      if (q.type === "multiple_choice") {
        const chosen = this.answers[q.id];
        if (chosen && q.options[chosen]?.correct) score++;
      } else if (q.type === "correction") {
        const ans = this.answers[q.id] || { noError: false, corrections: {} };
        const errorSegs = q.multiErrorSegments.filter((s) => s.isError);
        if (errorSegs.length === 0 && ans.noError) {
          score++;
        } else if (errorSegs.length > 0) {
          const allMatched = errorSegs.every((seg) => {
            const userText = (ans.corrections[seg.id] || "").toLowerCase();
            return seg.correctAnswers.some((c) => c.toLowerCase() === userText);
          });
          const noExtraEdits = Object.keys(ans.corrections).length === errorSegs.length;
          if (allMatched && noExtraEdits) score++;
        }
      }
    });

    document.getElementById("cat-exam-panel").classList.add("hidden");
    const resultPanel = document.getElementById("cat-result-panel");
    resultPanel.classList.remove("hidden");
    resultPanel.innerHTML = `
      <h2>Test Completed</h2>
      <p style="font-size:1.25rem;margin:0.75rem 0;">
        Score: <strong>${score} / ${this.questions.length}</strong>
      </p>
      <button id="retake-btn" class="btn btn-primary">Back to Setup</button>
    `;
    document.getElementById("retake-btn").onclick = () => {
      resultPanel.classList.add("hidden");
      document.getElementById("cat-setup-panel").classList.remove("hidden");
    };
  }
}
