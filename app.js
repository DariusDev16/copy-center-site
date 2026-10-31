(() => {
  "use strict";

  const body = document.body;
  const menuToggle = document.querySelector("[data-menu-toggle]");
  const drawer = document.getElementById("drawer");
  const menuClosers = document.querySelectorAll("[data-menu-close]");
  const pageRegions = document.querySelectorAll(
    ".announcement, .site-header, main, .site-footer, .skip-link, .chat"
  );
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const setMenu = (open, returnFocus) => {
    body.classList.toggle("nav-open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
    drawer.setAttribute("aria-hidden", String(!open));
    pageRegions.forEach((region) => region.toggleAttribute("inert", open));
    if (open) {
      requestAnimationFrame(() => {
        drawer.querySelector("[data-menu-close]").focus();
      });
    } else if (returnFocus) {
      menuToggle.focus();
    }
  };

  if (menuToggle && drawer) {
    menuToggle.addEventListener("click", () => {
      setMenu(!body.classList.contains("nav-open"), false);
    });

    menuClosers.forEach((el) => {
      el.addEventListener("click", () => setMenu(false, true));
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && body.classList.contains("nav-open")) {
        setMenu(false, true);
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 900 && body.classList.contains("nav-open")) {
        setMenu(false, false);
      }
    });
  }

  document.querySelectorAll("[data-carousel]").forEach((carousel) => {
    const track = carousel.querySelector(".carousel__track");
    const slides = [...track.children];
    const prev = carousel.querySelector(".carousel__arrow--prev");
    const next = carousel.querySelector(".carousel__arrow--next");
    const dots = carousel.querySelector(".carousel__dots");

    if (!slides.length) return;

    const behavior = reduceMotion ? "auto" : "smooth";

    const gap = () => {
      const styles = getComputedStyle(track);
      return parseFloat(styles.columnGap || styles.gap) || 0;
    };

    const step = () => slides[0].getBoundingClientRect().width + gap();
    const maxScroll = () => Math.max(0, track.scrollWidth - track.clientWidth);
    const pageCount = () =>
      Math.max(1, Math.min(slides.length, Math.round(maxScroll() / step()) + 1));

    const renderDots = () => {
      dots.innerHTML = "";
      const total = pageCount();
      for (let i = 0; i < total; i += 1) {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.setAttribute("aria-label", `Ir para o produto ${i + 1}`);
        dot.addEventListener("click", () => {
          track.scrollTo({ left: i * step(), behavior });
        });
        dots.append(dot);
      }
    };

    const update = () => {
      const width = step();
      const total = pageCount();
      const index = width
        ? Math.max(0, Math.min(total - 1, Math.round(track.scrollLeft / width)))
        : 0;

      [...dots.children].forEach((dot, i) => {
        dot.classList.toggle("is-active", i === index);
        if (i === index) {
          dot.setAttribute("aria-current", "true");
        } else {
          dot.removeAttribute("aria-current");
        }
      });

      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= maxScroll() - 2;
    };

    prev.addEventListener("click", () => {
      track.scrollBy({ left: -step(), behavior });
    });

    next.addEventListener("click", () => {
      track.scrollBy({ left: step(), behavior });
    });

    track.addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });

    let resizeFrame;
    window.addEventListener("resize", () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        renderDots();
        update();
      });
    });

    renderDots();
    update();
  });
})();
