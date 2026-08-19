// Thin fetch wrapper around the DriveGhana JSON API.

const SERVICE_UNAVAILABLE =
  "We can't reach the booking service right now. Please try again shortly.";

export class ApiError extends Error {
  constructor(message, { status = 0, fields = {}, cause } = {}) {
    super(message, { cause });
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }

  /** True when the API could not be reached at all (offline, or no backend running). */
  get isOffline() {
    return this.status === 0;
  }
}

async function request(path, { method = "GET", body, params, fetchImpl = globalThis.fetch } = {}) {
  const url = new URL(path, globalThis.location?.origin ?? "http://localhost");
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  let response;
  try {
    response = await fetchImpl(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (cause) {
    throw new ApiError(SERVICE_UNAVAILABLE, { status: 0, cause });
  }

  const payload = await response.json().catch(() => null);

  // Our API always answers with a JSON body, errors included. Anything else means the
  // request never reached it — typically this build running on a static host (GitHub
  // Pages) where `/api/*` just returns the host's own HTML 404 page. Report that as an
  // unreachable service rather than leaking a bare status code to the visitor.
  if (payload === null) {
    throw new ApiError(SERVICE_UNAVAILABLE, { status: 0 });
  }

  if (!response.ok) {
    throw new ApiError(payload.error?.message ?? `Request failed (${response.status}).`, {
      status: response.status,
      fields: payload.error?.fields ?? {},
    });
  }

  return payload;
}

export const api = {
  /** @param {{pickupLocation:string, pickupDate:string, returnDate:string, category?:string}} params */
  availability: (params, options) => request("/api/availability", { params, ...options }),

  createBooking: (body, options) => request("/api/bookings", { method: "POST", body, ...options }),

  subscribe: (email, options) =>
    request("/api/newsletter", { method: "POST", body: { email }, ...options }),
};
