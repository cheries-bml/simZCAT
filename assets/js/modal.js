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
    const dlg = el("dialog", { className: `modal${wide ? " modal-wide" : ""}`, "aria-labelledby": titleId });
    dlg.setAttribute("role", role);
    const close = (value) => { result = value; dlg.close(); };

    dlg.append(el("div", { className: "modal-card" },
      el("div", { className: "modal-head" },
        el("h2", { id: titleId, textContent: title }),
        el("button", { type: "button", className: "modal-x", "aria-label": "Close", textContent: "×", onclick: () => close(dismissValue) })),
      el("div", { className: "modal-body" }, body),
      el("div", { className: "modal-foot" }, ...actions.map((a) =>
        el("button", {
          type: "button", textContent: a.label, autofocus: !!a.primary,
          className: `btn${a.primary ? "" : " btn-ghost"}${a.danger ? " btn-danger" : ""}`,
          onclick: () => close(a.value),
        })))));

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
