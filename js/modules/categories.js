/**
 * "Choose Your Type Of Car" tiles. Exactly one tile is active at a time; the active
 * tile's `data-category` is reported so the booking flow can filter search results.
 *
 * @param {{row: HTMLElement|null, onSelect?: (category: string) => void}} options
 */
export function initCategories({ row, onSelect } = {}) {
  if (!row) return { getSelected: () => "", select: () => {} };

  const tiles = [...row.querySelectorAll(".category-tile")];

  const activate = (tile) => {
    row.querySelector(".category-tile.active")?.classList.remove("active");
    tile.classList.add("active");
    tiles.forEach((t) => t.setAttribute("aria-pressed", String(t === tile)));
  };

  tiles.forEach((tile) => {
    tile.setAttribute("aria-pressed", String(tile.classList.contains("active")));
    tile.addEventListener("click", () => {
      activate(tile);
      onSelect?.(tile.dataset.category ?? "");
    });
  });

  return {
    getSelected: () => row.querySelector(".category-tile.active")?.dataset.category ?? "",
    /** Programmatically activate a category, e.g. when a filter is cleared. */
    select(category) {
      const tile = tiles.find((t) => t.dataset.category === category);
      if (tile) activate(tile);
    },
  };
}
