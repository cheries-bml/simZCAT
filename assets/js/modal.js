// In-page modal dialogs (built on <dialog>). Replace alert() / confirm().
import { el } from "./util.js";

let counter = 0;

/**
 * Opens a modal and resolves with the clicked action's value,
 * or `dismissValue` when closed with Esc, the × button or a backdrop click.
 * actions: [{ label, value, primary, danger }]
 */
export function openModal({ title, body, actions = [{ label: "OK", value: true, primary: true }], dismissValue = null, wide = false, role = "dialog" }) {
  return new Promise((resolve) => {
    const titleId = `modal-title-${++counter}`;
    let result = dismissValue;
    const dlg = el("dialog", { className: `modal${wide ? " modal-wide" : ""}${wide === "xl" ? " modal-xl" : ""}`, "aria-labelledby": titleId });
    dlg.setAttribute("role", role);
    const close = (value) => { result = value; dlg.close(); };

    dlg.append(el("div", { className: "modal-card" },
      el("div", { className: "modal-head" },
        el("h2", { id: titleId, textContent: title }),
        el("button", { type: "button", className: "modal-x", "aria-label": "Close", textContent: "×", onclick: () => close(dismissValue) })),
      el("div", { className: "modal-body" }, body),
      el("div", { className: "modal-foot" }, ...actions.map((a) => {
        const cls = `btn${a.primary ? "" : " btn-ghost"}${a.danger ? " btn-danger" : ""}`;
        if (a.href) { // a link that leaves the dialog open: open in a new tab, or download
          return el("a", { href: a.href, className: cls, ...(a.download ? { download: "" } : { target: "_blank", rel: "noopener noreferrer" }) }, a.icon ?? null, a.label);
        }
        return el("button", { type: "button", textContent: a.label, autofocus: !!a.primary, className: cls, onclick: () => close(a.value) });
      }))));

    dlg.addEventListener("click", (e) => { if (e.target === dlg) close(dismissValue); }); // backdrop
    dlg.addEventListener("close", () => { dlg.remove(); resolve(result); });
    document.body.append(dlg);
    dlg.showModal();
  });
}

export const alertModal = (title, message) =>
  openModal({ title, body: el("p", { textContent: message }), role: "alertdialog" });

/** Resolves true only when the confirm button is clicked. */
export async function confirmModal(title, message, { confirmLabel = "Confirm", cancelLabel = "Cancel", danger = false } = {}) {
  const value = await openModal({
    title, body: el("p", { textContent: message }), role: "alertdialog", dismissValue: false,
    actions: [{ label: cancelLabel, value: false }, { label: confirmLabel, value: true, primary: true, danger }],
  });
  return value === true;
}
