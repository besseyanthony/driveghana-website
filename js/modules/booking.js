import { rentalDays, startOfToday } from "../../shared/dates.js";
import { formatCedis } from "../../shared/pricing.js";
import { validateSearch } from "../../shared/validation.js";
import { api as defaultApi, ApiError } from "../api/client.js";
import { escapeHtml, setHidden, setStatus } from "../lib/dom.js";

const CATEGORY_LABELS = {
  sedan: "Sedan",
  suv: "SUV",
  minivan: "Minivan & Bus",
  pickup: "Pickup",
  luxury: "Luxury",
};

function prettyDate(iso) {
  const date = new Date(`${iso}T00:00:00.000Z`);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/**
 * Resolve the photo to show for a vehicle.
 *
 * The API returns a repo-relative path such as `images/category-suv.png`, but the
 * production bundle serves those files from hashed `/assets/` URLs. The category
 * tiles already carry a correctly-resolved `<img>` for every category in every mode
 * (dev server, bundle, and plain static hosting), so borrow the URL from there and
 * only fall back to the raw path if the tile is missing.
 */
function resolveVehicleImage(vehicle) {
  const tileImage = document.querySelector(
    `#categoryRow .category-tile[data-category="${vehicle.category}"] img`,
  );
  return tileImage?.getAttribute("src") || vehicle.image;
}

function quoteLine(quote) {
  const parts = [`${quote.days} ${quote.days === 1 ? "day" : "days"}`];
  if (quote.discount > 0) parts.push(`weekly discount −${formatCedis(quote.discount)}`);
  parts.push(`incl. ${formatCedis(quote.serviceFee)} service fee`);
  return parts.join(" · ");
}

function vehicleCard(vehicle) {
  return `
    <article class="result-card" data-vehicle-id="${escapeHtml(vehicle.id)}">
      <div class="result-photo">
        <img src="${escapeHtml(resolveVehicleImage(vehicle))}" alt="${escapeHtml(vehicle.name)}" loading="lazy" />
        <span class="result-tag">${escapeHtml(CATEGORY_LABELS[vehicle.category] ?? vehicle.category)}</span>
      </div>
      <div class="result-body">
        <h3>${escapeHtml(vehicle.name)}</h3>
        <ul class="spec-chips">
          <li>${escapeHtml(vehicle.seats)} Seats</li>
          <li>${escapeHtml(vehicle.transmission)}</li>
          <li>${escapeHtml(vehicle.fuel)}</li>
        </ul>
        <p class="result-total">
          <strong>${escapeHtml(formatCedis(vehicle.quote.total))}</strong>
          <span>${escapeHtml(quoteLine(vehicle.quote))}</span>
        </p>
        <div class="result-foot">
          <p class="price">${escapeHtml(formatCedis(vehicle.pricePerDay))}<span>/day</span></p>
          <button type="button" class="btn btn-primary btn-sm result-reserve"
                  data-vehicle-id="${escapeHtml(vehicle.id)}">Reserve</button>
        </div>
      </div>
    </article>
  `;
}

/**
 * Wire the hero search bar, the availability results panel and the reservation form
 * to the API.
 *
 * @param {object} options
 * @param {Record<string, HTMLElement|null>} options.elements
 * @param {typeof defaultApi} [options.api]
 * @param {() => Date} [options.now] Injected in tests to freeze "today".
 */
export function initBookingFlow({ elements, api = defaultApi, now = () => new Date() } = {}) {
  const el = elements ?? {};
  if (!el.searchForm) return null;

  /** @type {{pickupLocation:string,pickupDate:string,returnDate:string,category?:string}|null} */
  let lastSearch = null;
  let vehiclesById = new Map();
  let selectedVehicleId = null;
  // Category tiles narrow an existing result set, and stick for the next search.
  let pendingCategory = "";

  function readSearchInputs() {
    return {
      pickupLocation: el.pickupLocation?.value ?? "",
      pickupDate: el.pickupDate?.value ?? "",
      returnDate: el.returnDate?.value ?? "",
    };
  }

  function renderResults(payload) {
    vehiclesById = new Map(payload.vehicles.map((vehicle) => [vehicle.id, vehicle]));

    const { pickupLocation, pickupDate, returnDate, category } = payload.search;
    const days = rentalDays(pickupDate, returnDate);

    if (el.resultsTitle) {
      el.resultsTitle.textContent = payload.count
        ? `${payload.count} ${payload.count === 1 ? "vehicle" : "vehicles"} available in ${pickupLocation}`
        : `No vehicles available in ${pickupLocation}`;
    }

    if (el.resultsMeta) {
      el.resultsMeta.textContent = payload.locationServed
        ? `${prettyDate(pickupDate)} → ${prettyDate(returnDate)} · ${days} ${days === 1 ? "day" : "days"}`
        : `We don't serve ${pickupLocation} yet. We hand over cars in ${payload.servedLocations.join(", ")}.`;
    }

    if (el.clearFilter) {
      setHidden(el.clearFilter, !category);
      el.clearFilter.textContent = category
        ? `Showing ${CATEGORY_LABELS[category] ?? category} only — show all types`
        : "";
    }

    if (el.resultsGrid) {
      el.resultsGrid.innerHTML = payload.vehicles.map(vehicleCard).join("");
      if (payload.locationServed && payload.count === 0) {
        el.resultsGrid.innerHTML = `<p class="results-empty">Every car in ${escapeHtml(pickupLocation)} is taken for those dates. Try different dates${category ? " or clear the type filter" : ""}.</p>`;
      }
    }

    setHidden(el.resultsSection, false);
  }

  async function runSearch(search, { silent = false } = {}) {
    if (!silent) setStatus(el.searchStatus, "Checking availability…", "info");

    try {
      const payload = await api.availability(search);
      lastSearch = payload.search;
      renderResults(payload);
      if (!silent) setStatus(el.searchStatus, "", "info");
      return payload;
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      setStatus(el.searchStatus, error.message, "error");
      if (silent) return null;
      setHidden(el.resultsSection, true);
      return null;
    }
  }

  function closeReserveForm() {
    selectedVehicleId = null;
    setHidden(el.reserveForm, true);
    setStatus(el.reserveStatus, "", "info");
  }

  function openReserveForm(vehicleId) {
    const vehicle = vehiclesById.get(vehicleId);
    if (!vehicle || !el.reserveForm) return;

    selectedVehicleId = vehicleId;
    setHidden(el.bookingConfirmation, true);
    setHidden(el.reserveForm, false);
    setStatus(el.reserveStatus, "", "info");

    if (el.reserveVehicleName) el.reserveVehicleName.textContent = vehicle.name;
    if (el.reserveSummary) {
      el.reserveSummary.textContent = `${lastSearch.pickupLocation} · ${prettyDate(lastSearch.pickupDate)} → ${prettyDate(lastSearch.returnDate)} · ${formatCedis(vehicle.quote.total)} total`;
    }

    el.reserveForm.scrollIntoView({ behavior: "smooth", block: "center" });
    el.customerName?.focus();
  }

  function showConfirmation(booking) {
    if (!el.bookingConfirmation) return;

    el.bookingConfirmation.innerHTML = `
      <h3>Reservation confirmed 🎉</h3>
      <p class="confirmation-ref">Reference <strong>${escapeHtml(booking.reference)}</strong></p>
      <p>${escapeHtml(booking.vehicleName)} · ${escapeHtml(booking.pickupLocation)} ·
         ${escapeHtml(prettyDate(booking.pickupDate))} → ${escapeHtml(prettyDate(booking.returnDate))}</p>
      <p>${escapeHtml(booking.quote.days)} ${booking.quote.days === 1 ? "day" : "days"} ·
         total <strong>${escapeHtml(formatCedis(booking.quote.total))}</strong></p>
      <p class="confirmation-note">A voucher is on its way to ${escapeHtml(booking.customerEmail)}.</p>
    `;
    setHidden(el.bookingConfirmation, false);
    el.bookingConfirmation.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  el.searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setHidden(el.bookingConfirmation, true);
    closeReserveForm();

    const input = readSearchInputs();
    const { valid, errors, value } = validateSearch(input, { today: startOfToday(now()) });
    if (!valid) {
      setStatus(el.searchStatus, Object.values(errors)[0], "error");
      return;
    }

    await runSearch({ ...value, category: pendingCategory });
  });

  el.resultsGrid?.addEventListener("click", (event) => {
    const button = event.target.closest?.(".result-reserve");
    if (button) openReserveForm(button.dataset.vehicleId);
  });

  el.reserveCancel?.addEventListener("click", closeReserveForm);

  el.reserveForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!selectedVehicleId || !lastSearch) return;

    setStatus(el.reserveStatus, "Confirming your reservation…", "info");

    try {
      const { booking } = await api.createBooking({
        vehicleId: selectedVehicleId,
        pickupLocation: lastSearch.pickupLocation,
        pickupDate: lastSearch.pickupDate,
        returnDate: lastSearch.returnDate,
        customerName: el.customerName?.value ?? "",
        customerEmail: el.customerEmail?.value ?? "",
      });

      closeReserveForm();
      el.reserveForm.reset();
      showConfirmation(booking);
      // The car just became unavailable — refresh the grid so the page tells the truth.
      await runSearch(lastSearch, { silent: true });
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      const firstField = Object.values(error.fields)[0];
      setStatus(
        el.reserveStatus,
        firstField ? `${error.message} ${firstField}` : error.message,
        "error",
      );
    }
  });

  el.clearFilter?.addEventListener("click", async () => {
    pendingCategory = "";
    if (lastSearch) await runSearch({ ...lastSearch, category: "" });
  });

  return {
    /** Called by the category tiles. */
    async setCategory(category) {
      pendingCategory = category;
      if (lastSearch) {
        closeReserveForm();
        await runSearch({ ...lastSearch, category });
      }
    },
    getLastSearch: () => lastSearch,
  };
}
