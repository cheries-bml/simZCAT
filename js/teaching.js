export class TeachingModule {
  constructor() {
    this.showAnswers = true;
    this.currentData = null;
  }

  async init() {
    const res = await fetch("questions/index.json");
    const banks = await res.json();

    const select = document.getElementById("teach-bank-select");
    select.innerHTML = banks
      .map((b) => `<option value="${b.file}">${b.title}</option>`)
      .join("");

    select.onchange = () => this.loadBank(select.value);
    document.getElementById("toggle-all-answers").onclick = () => {
      this.showAnswers = !this.showAnswers;
      this.render();
    };

    if (banks.length > 0) await this.loadBank(banks[0].file);
  }

  async loadBank(file) {
    const res = await fetch(file);
    this.currentData = await res.json();
    this.render();
  }

  render() {
    const container = document.getElementById("teaching-container");
    if (!this.currentData) return;

    container.innerHTML = this.currentData.questions
      .map((q, idx) => {
        let body = "";
        if (q.data?.passage) body += `<div class="passage-box">${q.data.passage}</div>`;
        if (q.data?.question) body += `<p><strong>Q${idx + 1}.</strong> ${q.data.question}</p>`;

        if (q.type === "multiple_choice") {
          body += `<div style="margin-top:0.5rem;">`;
          for (const [k, opt] of Object.entries(q.options)) {
            const cls = this.showAnswers && opt.correct ? "option-item correct" : "option-item";
            body += `<div class="${cls}"><strong>${k}.</strong> ${opt.text}</div>`;
          }
          body += `</div>`;
        } else if (q.type === "correction") {
          body += `<div class="segment-sentence">`;
          q.multiErrorSegments.forEach((seg) => {
            if (this.showAnswers && seg.isError) {
              body += `<span class="seg-clickable edited" title="Error">${seg.text} <strong>[${seg.correctAnswers.join(" / ")}]</strong></span> `;
            } else {
              body += `<span>${seg.text} </span>`;
            }
          });
          body += `</div>`;
        }

        const expHtml = this.showAnswers && q.explanation
          ? `<div class="explanation-box">
              <p><strong>Explanation:</strong> ${q.explanation.text}</p>
              <p class="muted" style="font-size:0.85rem;margin-top:0.4rem;">
                Topic: ${q.explanation.topic} | Concept: ${q.explanation.concept}
              </p>
            </div>`
          : "";

        return `<div class="card">${body}${expHtml}</div>`;
      })
      .join("");
  }
}
