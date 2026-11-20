export class MaterialsModule {
  async init() {
    const res = await fetch("data/materials.json");
    const items = await res.json();
    const list = document.getElementById("materials-list");

    list.innerHTML = items
      .map(
        (m) => `
        <li data-path="${m.path}" data-type="${m.type}">
          <i data-lucide="file-text"></i>
          <span>${m.title} <small class="muted">(${m.type.toUpperCase()})</small></span>
        </li>`
      )
      .join("");

    list.querySelectorAll("li").forEach((li) => {
      li.onclick = () => this.openMaterial(li.dataset.path, li.dataset.type);
    });
  }

  async openMaterial(path, type) {
    const viewer = document.getElementById("material-viewer");
    const ext = type.toLowerCase();

    if (ext === "pdf") {
      viewer.innerHTML = `<iframe src="${path}"></iframe>`;
    } else if (["png", "jpg", "jpeg"].includes(ext)) {
      viewer.innerHTML = `<img src="${path}" alt="Teaching material" />`;
    } else if (ext === "md") {
      const text = await (await fetch(path)).text();
      viewer.innerHTML = window.marked ? window.marked.parse(text) : `<pre>${text}</pre>`;
    } else {
      const text = await (await fetch(path)).text();
      viewer.innerHTML = `<pre>${text}</pre>`;
    }
  }
}
