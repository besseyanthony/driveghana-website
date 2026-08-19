const REVEAL_SELECTOR = [
  ".section-head",
  ".service-card",
  ".fleet-card",
  ".testimonial-card",
  ".dest-card",
  ".split-text",
  ".split-photo",
  ".video-thumb",
  ".newsletter-panel",
].join(", ");

/**
 * Fade section content in as it scrolls into view. Falls back to showing everything
 * immediately when IntersectionObserver is unavailable (older browsers, jsdom).
 */
export function initReveal(root = document) {
  const targets = [...root.querySelectorAll(REVEAL_SELECTOR)];
  targets.forEach((el) => el.classList.add("reveal"));

  if (typeof IntersectionObserver !== "function") {
    targets.forEach((el) => el.classList.add("visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12 },
  );

  targets.forEach((el) => observer.observe(el));
  return observer;
}
