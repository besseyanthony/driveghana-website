// Minimal DOM helpers. Everything the API returns is rendered through escapeHtml so
// a future data source can never inject markup into the page.

const ENTITIES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ENTITIES[char]);
}

/** Show or hide an element using the `hidden` attribute. */
export function setHidden(element, hidden) {
  if (!element) return;
  element.hidden = Boolean(hidden);
}

/**
 * Write a status message and tag it so CSS can colour it.
 * @param {HTMLElement|null} element
 * @param {string} message
 * @param {"info"|"success"|"error"} [tone]
 */
export function setStatus(element, message, tone = "info") {
  if (!element) return;
  element.textContent = message;
  element.dataset.tone = tone;
  element.hidden = message === "";
}
