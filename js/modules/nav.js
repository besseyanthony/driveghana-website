/** Mobile navigation toggle. Closes itself when any link inside is followed. */
export function initNav({ toggle, links } = {}) {
  if (!toggle || !links) return;

  const close = () => {
    links.classList.remove("open");
    toggle.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  };

  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    toggle.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
  });

  links.querySelectorAll("a").forEach((link) => link.addEventListener("click", close));

  return { close };
}
