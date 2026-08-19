import { readIndexHtml } from "./fixtures.js";

/**
 * Replace the jsdom document with the real index.html.
 *
 * Loading the shipped markup (rather than a hand-written fixture) means these tests
 * fail if an id, class or data attribute the JS depends on is renamed or removed.
 */
export function loadIndexHtml() {
  const parsed = new DOMParser().parseFromString(readIndexHtml(), "text/html");
  document.replaceChild(document.importNode(parsed.documentElement, true), document.documentElement);

  // jsdom implements neither of these; the booking flow calls them for UX polish.
  Element.prototype.scrollIntoView = () => {};
}

/** Dispatch a cancelable submit event, the way a real form submission behaves. */
export function submitForm(form) {
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

export const byId = (id) => document.getElementById(id);

/** Fill an input and fire the `change` listeners the page installs. */
export function setValue(input, value) {
  input.value = value;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}
