document.querySelectorAll("a[download]").forEach((link) => {
  link.addEventListener("click", () => {
    link.setAttribute("aria-label", `${link.textContent.trim()} started`);
  });
});
