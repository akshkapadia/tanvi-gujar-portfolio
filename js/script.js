const navLinks = document.querySelectorAll("[data-nav]");
const navToggle = document.getElementById("navToggle");
const navPill = document.getElementById("navPill");

function closeMenu() {
  navPill.classList.remove("open");
  navToggle.classList.remove("open");
  navToggle.setAttribute("aria-expanded", "false");
}

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    navLinks.forEach((l) => l.classList.remove("active"));
    link.classList.add("active");
    closeMenu();
  });
});

if (navToggle && navPill) {
  navToggle.addEventListener("click", () => {
    const isOpen = navPill.classList.toggle("open");
    navToggle.classList.toggle("open", isOpen);
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  document.addEventListener("click", (e) => {
    if (!navPill.contains(e.target) && !navToggle.contains(e.target)) {
      closeMenu();
    }
  });
}
