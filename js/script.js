// DriveGhana — minimal interactivity

// Mobile nav toggle
const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");

navToggle.addEventListener("click", () => {
  const open = navLinks.classList.toggle("open");
  navToggle.classList.toggle("open", open);
  navToggle.setAttribute("aria-expanded", String(open));
});

// Close mobile menu when a link is clicked
navLinks.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("open");
    navToggle.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  });
});

// Category tile active state
const categoryRow = document.getElementById("categoryRow");
categoryRow.querySelectorAll(".category-tile").forEach((tile) => {
  tile.addEventListener("click", () => {
    categoryRow.querySelector(".active")?.classList.remove("active");
    tile.classList.add("active");
  });
});

// Default search dates: today and +3 days
const toISO = (d) => d.toISOString().slice(0, 10);
const today = new Date();
const returnDay = new Date(today);
returnDay.setDate(today.getDate() + 3);
document.getElementById("pickupDate").value = toISO(today);
document.getElementById("returnDate").value = toISO(returnDay);

// Scroll-reveal animation for section content
const revealTargets = document.querySelectorAll(
  ".section-head, .service-card, .fleet-card, .testimonial-card, .dest-card, .split-text, .split-photo, .video-thumb, .newsletter-panel"
);
revealTargets.forEach((el) => el.classList.add("reveal"));

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);
revealTargets.forEach((el) => observer.observe(el));
