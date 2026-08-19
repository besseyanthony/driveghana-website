import { isValidEmail } from "../../shared/validation.js";
import { api as defaultApi, ApiError } from "../api/client.js";
import { setStatus } from "../lib/dom.js";

/** Mailing list signup in the "Get Member-Only Deals First" panel. */
export function initNewsletter({ form, input, status, api = defaultApi } = {}) {
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = input?.value ?? "";
    if (!isValidEmail(email)) {
      setStatus(status, "Enter a valid email address.", "error");
      return;
    }

    setStatus(status, "Signing you up…", "info");

    try {
      const result = await api.subscribe(email.trim());
      setStatus(status, result.message, "success");
      if (result.created) form.reset();
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      setStatus(status, error.fields.email ?? error.message, "error");
    }
  });
}
