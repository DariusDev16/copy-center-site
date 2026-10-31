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

  // Simple Cart System
  const CART_KEY = "copycenter_cart";

  const cart = {
    getCart() {
      try {
        const data = localStorage.getItem(CART_KEY);
        return data ? JSON.parse(data) : [];
      } catch (e) {
        console.error("Failed to parse cart from localStorage", e);
        return [];
      }
    },
    saveCart(items) {
      try {
        localStorage.setItem(CART_KEY, JSON.stringify(items));
      } catch (e) {
        console.error("Failed to save cart to localStorage", e);
      }
    },
    addItem(product) {
      const cartItems = this.getCart();
      const existing = cartItems.find((item) => item.id === product.id);
      if (existing) {
        existing.quantity += 1;
      } else {
        cartItems.push({ ...product, quantity: 1 });
      }
      this.saveCart(cartItems);
      this.updateCount();
      this.showNotification(`${product.name} adicionado ao carrinho.`);
    },
    removeItem(id) {
      let cartItems = this.getCart();
      cartItems = cartItems.filter((item) => item.id !== id);
      this.saveCart(cartItems);
      this.updateCount();
    },
    updateQuantity(id, delta) {
      const cartItems = this.getCart();
      const item = cartItems.find((item) => item.id === id);
      if (!item) return;
      item.quantity = Math.max(0, item.quantity + delta);
      if (item.quantity === 0) {
        this.removeItem(id);
        return;
      }
      this.saveCart(cartItems);
      this.updateCount();
    },
    updateCount() {
      const countEl = document.querySelector(".cart__count");
      if (!countEl) return;
      const totalItems = this.getCart().reduce((sum, item) => sum + item.quantity, 0);
      countEl.textContent = totalItems;
    },
    showNotification(message) {
      // Simple toast notification at bottom center
      let toast = document.createElement("div");
      toast.className = "cart-toast";
      toast.textContent = message;
      toast.style.position = "fixed";
      toast.style.left = "50%";
      toast.style.bottom = "20px";
      toast.style.transform = "translateX(-50%)";
      toast.style.background = "#25a244";
      toast.style.color = "#fff";
      toast.style.padding = "12px 24px";
      toast.style.borderRadius = "8px";
      toast.style.zIndex = "9999";
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.3s ease";
      document.body.appendChild(toast);
      requestAnimationFrame(() => {
        toast.style.opacity = "1";
      });
      setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => document.body.removeChild(toast), 300);
      }, 2000);
    },
    init() {
      this.updateCount();
      this.initProductCards();
      this.initCartButton();
    },
    initProductCards() {
      const productCards = document.querySelectorAll(".product-card");
      productCards.forEach((card, index) => {
        // Assign a unique ID based on index and product name
        const nameEl = card.querySelector(".product-card__name");
        const priceEl = card.querySelector(".product-card__price b");
        const unitPriceEl = card.querySelector(".product-card__price small");
        const imgEl = card.querySelector(".product-card__media img");

        const product = {
          id: `product-${index}`, // simplistic ID; in a real app use a proper ID
          name: nameEl ? nameEl.textContent.trim() : "Produto sem nome",
          price: parseFloat(priceEl?.textContent.replace(/[€\s]/g, '').replace(',', '.')) || 0,
          unitPrice: unitPriceEl
            ? parseFloat(unitPriceEl.textContent.match(/[0-9.,]+/g)?.[0].replace('.', '').replace(',', '.')) || 0
            : 0,
          units: unitPriceEl ? unitPriceEl.textContent.match(/[0-9]+/)?.[0] || "0" : "0",
          image: imgEl?.src || "",
        };

        card.dataset.product = JSON.stringify(product);

        // Add "Add to Cart" button inside the card
        const addBtn = document.createElement("button");
        addBtn.className = "product-card__add";
        addBtn.type = "button";
        addBtn.setAttribute("aria-label", "Adicionar ao carrinho");
        addBtn.innerHTML = `
          <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
            <use href="#i-bag"/>
          </svg>
          <span>Adicionar</span>
        `;
        addBtn.style.cssText = `
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 12px;
          padding: 8px 12px;
          background: #25a244;
          color: #fff;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        `;
        addBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          cart.addItem(product);
        });

        // Append button to card (outside anchor)
        const cardWrapper = card;
        cardWrapper.appendChild(addBtn);
      });
    },
    initCartButton() {
      const cartLink = document.querySelector(".icon-btn.cart");
      if (!cartLink) return;
      cartLink.addEventListener("click", (e) => {
        e.preventDefault();
        // For now, just show a simple cart summary in console or could open a modal
        const cartItems = this.getCart();
        if (cartItems.length === 0) {
          this.showNotification("O carrinho está vazio.");
          return;
        }
        // Simple alert with cart contents
        const summary = cartItems
          .map((item) => `${item.name} x${item.quantity} – €${(item.price * item.quantity).toFixed(2)}`)
          .join("\n");
        alert(`Carrinho:\n${summary}\n\nTotal items: ${cartItems.reduce((s, i) => s + i.quantity, 0)}`);
      });
    },
  };

  // Initialize cart
  cart.init();

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
