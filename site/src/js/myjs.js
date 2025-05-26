// Add click event for nav sub menus
document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".openAccordionNav").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const parentLi = btn.closest("li");
        const submenu = parentLi.querySelector("ol");
  
        if (submenu) {
            const e = submenu.style.display === 'none';
            submenu.style.display = e ? "block" : "none";
            btn.classList.toggle("accordionNavOpened", e);
        }
      });
    });
  });