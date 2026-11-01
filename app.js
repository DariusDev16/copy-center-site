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

  // ---------- Carrinho (localStorage + WhatsApp) ----------

  const CART_KEY = "copycenter_cart";
  const WHATSAPP_NUMBER = "351968897834";
  const VAT_RATE = 0.23;

  const COLOR_NAMES = {
    "#1c1c1c": "Preto",
    "#20304a": "Azul-escuro",
    "#2f8f4e": "Verde",
    "#37475a": "Azul-escuro",
    "#4f5b4a": "Verde-escuro",
    "#6c233b": "Vinho",
    "#6e7d66": "Verde",
    "#6f3fa0": "Roxo",
    "#7c8f5a": "Verde",
    "#8a6a58": "Castanho",
    "#8ec3ea": "Azul-claro",
    "#9db3c6": "Azul",
    "#a7a29b": "Cinza",
    "#b23b52": "Vermelho",
    "#b4c5b1": "Verde-claro",
    "#b8b1a8": "Bege",
    "#b9a7a0": "Bege",
    "#b9d08b": "Verde-claro",
    "#c9d3dd": "Cinza",
    "#e6007e": "Magenta",
    "#e9b7cf": "Rosa",
    "#f08a24": "Laranja",
    "#f4d21f": "Amarelo",
    "#f6c6d4": "Rosa",
  };

  const priceFormatter = new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  });

  const formatPrice = (value) => priceFormatter.format(Number(value) || 0);

  const slugify = (value) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const parsePrice = (value) => {
    if (!value) return 0;
    const text = value.replace(/[^\d,.-]/g, "");
    const normalized = text.includes(",")
      ? text.replace(/\./g, "").replace(",", ".")
      : text;
    return parseFloat(normalized) || 0;
  };

  const rgbToHex = (value) => {
    const channels = value.match(/\d+/g);
    if (!channels) return "";
    return `#${channels
      .slice(0, 3)
      .map((channel) => Number(channel).toString(16).padStart(2, "0"))
      .join("")}`;
  };

  const readColors = (card) =>
    [...card.querySelectorAll(".swatches i")]
      .map((swatch) => {
        const hex = rgbToHex(getComputedStyle(swatch).backgroundColor);
        return {
          hex,
          name: swatch.dataset.colorName || COLOR_NAMES[hex] || "Outra cor",
        };
      })
      .filter(
        (color, index, colors) =>
          color.hex &&
          colors.findIndex((entry) => entry.name === color.name) === index
      );

  // ---------- Ligação dos cartões de produto à página de detalhe ----------

  const catalogProducts = Array.isArray(window.COPY_CENTER_PRODUCTS)
    ? window.COPY_CENTER_PRODUCTS
    : [];

  const stripPersonalizacao = (value) =>
    value.replace(/\s+c\/\s*personalização\s*$/i, "").trim();

  const normalizeName = (value) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const productNameIndex = new Map();
  const productImageIndex = new Map();
  catalogProducts.forEach((product) => {
    productNameIndex.set(normalizeName(product.name), product.id);
    const file = String(product.image || "")
      .split("?")[0]
      .split("/")
      .pop();
    if (file) productImageIndex.set(file, product.id);
  });

  const resolveProductId = ({ name, imageSrc }) => {
    const canonicalName = stripPersonalizacao(name || "");
    const byName = productNameIndex.get(normalizeName(canonicalName));
    if (byName) return byName;

    const file = String(imageSrc || "")
      .split("?")[0]
      .split("/")
      .pop();
    return file ? productImageIndex.get(file) : undefined;
  };

  const linkProductCards = () => {
    document
      .querySelectorAll(".product-card, .offer")
      .forEach((card) => {
        if (card.dataset.url) return;

        const href = card.getAttribute("href");
        if (href && href !== "#" && !href.startsWith("#")) {
          card.dataset.url = href;
          return;
        }

        const nameEl = card.querySelector(
          ".product-card__name, .offer__name"
        );
        const imgEl = card.querySelector(
          ".product-card__media img, .offer__media img"
        );
        const id = resolveProductId({
          name: nameEl ? nameEl.textContent.trim() : "",
          imageSrc: imgEl ? imgEl.getAttribute("src") : "",
        });

        if (!id) return;
        const url = `produto.html?id=${encodeURIComponent(id)}`;
        card.dataset.url = url;
        card.setAttribute("href", url);
      });
  };

  const cart = {
    getCart() {
      try {
        const data = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
        if (!Array.isArray(data)) return [];

        // Converte carrinhos antigos (preço por pack) para preço por unidade.
        let changed = false;
        const items = data.map((item) => {
          if (item.unitPrice !== undefined && item.unitPrice !== null) {
            return item;
          }

          changed = true;
          const meta = typeof item.meta === "string" ? item.meta : "";
          const packMatch = meta.match(/^(\d[\d.]*)\s+unidades/i);
          const unitMatch = meta.match(/(\d+(?:[.,]\d+)?)\s*€\s*\/\s*un/i);
          const packSize = packMatch
            ? parseInt(packMatch[1].replace(/\./g, ""), 10)
            : 1;
          const packPrice = Number(item.price) || 0;
          const unitPrice =
            packSize > 1 && packPrice > 0
              ? Number((packPrice / packSize).toFixed(6))
              : unitMatch
                ? parsePrice(unitMatch[1])
                : packPrice;

          return {
            ...item,
            price: unitPrice,
            unitPrice,
            packSize,
            quantity: (Number(item.quantity) || 1) * (packSize > 1 ? packSize : 1),
            quantityMode: "custom",
          };
        });

        if (changed) this.saveCart(items);
        return items;
      } catch (error) {
        console.error("Não foi possível ler o carrinho.", error);
        return [];
      }
    },

    saveCart(items) {
      try {
        localStorage.setItem(CART_KEY, JSON.stringify(items));
      } catch (error) {
        console.error("Não foi possível guardar o carrinho.", error);
      }
    },

    getTotals() {
      return this.getCart().reduce(
        (totals, item) => {
          const quantity = Number(item.quantity) || 0;
          totals.products += 1;
          totals.units += quantity;
          totals.subtotal += (Number(item.price) || 0) * quantity;
          return totals;
        },
        { products: 0, units: 0, subtotal: 0 }
      );
    },

    addItem(product) {
      const items = this.getCart();
      const existing = items.find((item) => item.id === product.id);

      if (existing) {
        existing.quantity += 1;
        if (!existing.colors?.length && product.colors?.length) {
          existing.colors = product.colors;
        }
      } else {
        items.push({ ...product, quantity: 1, quantityMode: "custom" });
      }

      this.saveCart(items);
      this.updateCount();
      this.showNotification(`${product.name} adicionado ao carrinho.`);
    },

    removeItem(id) {
      this.saveCart(this.getCart().filter((item) => item.id !== id));
      this.updateCount();
      this.renderPage();
    },

    setQuantity(id, quantity, mode = "custom") {
      const items = this.getCart();
      const item = items.find((entry) => entry.id === id);
      if (!item) return;

      const nextQuantity = Math.max(0, Math.floor(Number(quantity) || 0));

      if (nextQuantity === 0) {
        this.removeItem(id);
        return;
      }

      item.quantity = nextQuantity;
      item.quantityMode = mode === "preset" ? "preset" : "custom";
      this.saveCart(items);
      this.updateCount();

      const row = document.querySelector(`.cart-item[data-id="${id}"]`);
      const input = row?.querySelector("[data-qty]");
      const lineTotal = row?.querySelector("[data-line-total]");
      const qtyGroup = row?.querySelector(".qty");
      const presetSelect = row?.querySelector("[data-qty-preset]");

      if (input) input.value = nextQuantity;
      if (lineTotal) lineTotal.textContent = formatPrice(item.price * nextQuantity);
      if (qtyGroup) qtyGroup.hidden = item.quantityMode === "preset";
      if (presetSelect) {
        presetSelect.value =
          item.quantityMode === "preset" ? String(nextQuantity) : "custom";
      }

      this.updateSummary();
    },

    updateCount() {
      const total = this.getCart().reduce(
        (sum, item) => sum + (Number(item.quantity) || 0),
        0
      );

      document.querySelectorAll(".cart__count").forEach((element) => {
        element.textContent = total;
      });

      const cartLink = document.querySelector(".icon-btn.cart");
      if (cartLink) {
        cartLink.setAttribute(
          "aria-label",
          `Carrinho, ${total} ${total === 1 ? "produto" : "produtos"}`
        );
      }
    },

    showNotification(message) {
      const toast = document.createElement("div");
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
        setTimeout(() => toast.remove(), 300);
      }, 2000);
    },

    init() {
      this.updateCount();
      linkProductCards();
      this.initProductCards();
      this.initCartPage();
      document.addEventListener("catalog:rendered", () => {
        linkProductCards();
        this.initProductCards();
      });
    },

    initProductCards() {
      document.querySelectorAll(".product-card").forEach((card) => {
        if (card.dataset.cartInitialized === "true") return;

        const nameEl = card.querySelector(".product-card__name");
        const priceEl = card.querySelector(".product-card__price b");
        const metaEl = card.querySelector(".product-card__price small");
        const imgEl = card.querySelector(".product-card__media img");
        const name = nameEl ? nameEl.textContent.trim() : "Produto sem nome";
        const href = card.getAttribute("href");
        const meta = metaEl ? metaEl.textContent.trim() : "";
        const unitMatch = meta.match(/(\d+(?:[.,]\d+)?)\s*€\s*\/\s*un/i);
        const packMatch = meta.match(/^(\d[\d.]*)\s+unidades/i);
        const dataUnitPrice = Number(card.dataset.unitPrice);
        const hasDataUnitPrice =
          card.dataset.unitPrice !== undefined &&
          Number.isFinite(dataUnitPrice) &&
          dataUnitPrice > 0;
        const dataPackSize = parseInt(card.dataset.packSize, 10);
        const packSize =
          Number.isFinite(dataPackSize) && dataPackSize > 0
            ? dataPackSize
            : packMatch
              ? parseInt(packMatch[1].replace(/\./g, ""), 10)
              : 1;
        const packPrice =
          Number(card.dataset.packPrice) ||
          parsePrice(priceEl?.textContent);
        let unitPrice = hasDataUnitPrice
          ? dataUnitPrice
          : unitMatch
            ? parsePrice(unitMatch[1])
            : packPrice;

        // Em packs, o preço unitário exato mantém o total do pack correto.
        if (!hasDataUnitPrice && packSize > 1 && packPrice > 0) {
          unitPrice = Number((packPrice / packSize).toFixed(6));
        }

        const canonicalName = name
          .replace(/\s+c\/\s*personalização\s*$/i, "")
          .trim();
        const product = {
          id:
            card.dataset.productId ||
            slugify(canonicalName) ||
            `produto-${Date.now()}`,
          name,
          price: unitPrice,
          unitPrice,
          packSize,
          packPrice,
          meta,
          image: imgEl ? imgEl.getAttribute("src") : "",
          url:
            card.dataset.url ||
            (href && href !== "#" ? href : "index.html"),
          colors: readColors(card),
          color: "",
          quantityMode: "custom",
        };

        const addButton = document.createElement("button");
        addButton.className = "product-card__add";
        addButton.type = "button";
        addButton.setAttribute("aria-label", `Adicionar ${name} ao carrinho`);
        addButton.innerHTML = `
          <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
            <use href="#i-bag"/>
          </svg>
          <span>Adicionar</span>
        `;
        addButton.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          this.addItem(product);
        });

        const footer = document.createElement("div");
        footer.className = "product-card__footer";
        footer.appendChild(addButton);
        card.appendChild(footer);
        card.dataset.cartInitialized = "true";
      });
    },

    initCartPage() {
      const list = document.querySelector("[data-cart-list]");
      if (!list) return;

      this.list = list;
      this.template = document.getElementById("cart-item-template");
      this.layout = document.querySelector(".cart-layout");
      this.emptyState = document.querySelector(".cart-empty");
      this.checkoutLink = document.querySelector("[data-cart-checkout]");

      list.addEventListener("click", (event) => {
        const button = event.target.closest("[data-action]");
        if (!button) return;

        const row = button.closest(".cart-item");
        const id = row?.dataset.id;
        const item = this.getCart().find((entry) => entry.id === id);
        if (!item) return;

        if (button.dataset.action === "increase") {
          this.setQuantity(id, item.quantity + 1, "custom");
        } else if (button.dataset.action === "decrease") {
          this.setQuantity(id, item.quantity - 1, "custom");
        } else if (button.dataset.action === "remove") {
          this.removeItem(id);
        }
      });

      list.addEventListener("change", (event) => {
        const row = event.target.closest(".cart-item");
        const id = row?.dataset.id;
        if (!id) return;

        const items = this.getCart();
        const item = items.find((entry) => entry.id === id);
        if (!item) return;

        if (event.target.matches("[data-qty]")) {
          this.setQuantity(id, event.target.value, "custom");
        }

        if (event.target.matches("[data-qty-preset]")) {
          if (event.target.value === "custom") {
            this.setQuantity(id, item.quantity, "custom");
          } else {
            this.setQuantity(id, Number(event.target.value), "preset");
          }
        }

        if (event.target.matches("[data-color-select]")) {
          item.color = event.target.value;
          this.saveCart(items);
          this.updateSummary();
        }
      });

      document.querySelector("[data-cart-clear]")?.addEventListener("click", () => {
        if (!this.getCart().length) return;
        if (!window.confirm("Esvaziar o carrinho?")) return;
        this.saveCart([]);
        this.updateCount();
        this.renderPage();
      });

      document.querySelectorAll('input[name="entrega"]').forEach((input) => {
        input.addEventListener("change", () => this.updateSummary());
      });

      document.getElementById("notas")?.addEventListener("input", () => {
        this.updateSummary();
      });

      this.renderPage();
    },

    renderPage() {
      if (!this.list || !this.template) return;

      const items = this.getCart();
      this.list.innerHTML = "";
      items.forEach((item) => this.list.appendChild(this.createRow(item)));

      const hasItems = items.length > 0;
      if (this.layout) this.layout.hidden = !hasItems;
      if (this.emptyState) this.emptyState.hidden = hasItems;

      this.updateSummary();
    },

    createRow(item) {
      const row = this.template.content.firstElementChild.cloneNode(true);
      const name = item.name || "Produto";
      const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));

      row.dataset.id = item.id;

      const media = row.querySelector("[data-media]");
      media.href = item.url || "index.html";
      media.setAttribute("aria-label", `Ver ${name}`);

      const image = row.querySelector("img");
      image.src = item.image || "assets/img/logo.svg";
      image.alt = name;

      row.querySelector("[data-name]").textContent = name;
      row.querySelector("[data-name-link]").href = item.url || "index.html";
      const unitPrice = Number(item.unitPrice ?? item.price) || 0;
      row.querySelector("[data-meta]").textContent = unitPrice
        ? `${formatPrice(unitPrice)}/un. · s/ IVA`
        : "s/ IVA";

      const quantityInput = row.querySelector("[data-qty]");
      quantityInput.value = quantity;
      quantityInput.name = `qty-${item.id}`;
      quantityInput.setAttribute("aria-label", `Quantidade de ${name}`);

      const presetSelect = row.querySelector("[data-qty-preset]");
      const isPreset =
        item.quantityMode === "preset" &&
        ["25", "50", "75", "100"].includes(String(quantity));
      presetSelect.value = isPreset ? String(quantity) : "custom";
      presetSelect.setAttribute("aria-label", `Quantidade de ${name}`);

      const qtyGroup = row.querySelector(".qty");
      qtyGroup.setAttribute("aria-label", `Quantidade de ${name}`);
      qtyGroup.hidden = isPreset;

      const colorField = row.querySelector("[data-color-field]");
      const colorSelect = row.querySelector("[data-color-select]");
      if (item.colors?.length) {
        colorField.hidden = false;

        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "Escolher cor";
        colorSelect.appendChild(placeholder);

        item.colors.forEach((color) => {
          const option = document.createElement("option");
          option.value = color.name;
          option.textContent = color.name;
          colorSelect.appendChild(option);
        });

        colorSelect.value = item.color || "";
      }

      row.querySelector("[data-line-total]").textContent = formatPrice(
        unitPrice * quantity
      );

      return row;
    },

    updateSummary() {
      const items = this.getCart();
      const totals = this.getTotals();
      const vat = totals.subtotal * VAT_RATE;
      const total = totals.subtotal + vat;
      const delivery =
        document.querySelector('input[name="entrega"]:checked')?.value || "loja";

      const setText = (selector, value) => {
        const element = document.querySelector(selector);
        if (element) element.textContent = value;
      };

      setText(
        "[data-cart-meta]",
        `${totals.products} ${totals.products === 1 ? "produto" : "produtos"} · ` +
          `${totals.units} ${totals.units === 1 ? "unidade" : "unidades"}`
      );
      setText(
        "[data-cart-subtotal-label]",
        `Subtotal (${totals.units} ${totals.units === 1 ? "unidade" : "unidades"})`
      );
      setText("[data-cart-subtotal]", formatPrice(totals.subtotal));
      setText("[data-cart-shipping]", delivery === "loja" ? "Grátis" : "A calcular");
      setText("[data-cart-vat]", formatPrice(vat));
      setText("[data-cart-total]", formatPrice(total));

      if (this.checkoutLink) {
        this.checkoutLink.href = items.length
          ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
              this.buildMessage(items, delivery)
            )}`
          : `https://wa.me/${WHATSAPP_NUMBER}`;
      }
    },

    buildMessage(items, delivery) {
      const totals = this.getTotals();
      const vat = totals.subtotal * VAT_RATE;
      const lines = ["Olá! Quero encomendar os seguintes produtos da Copy Center:", ""];

      items.forEach((item, index) => {
        const unitPrice = Number(item.unitPrice ?? item.price) || 0;
        lines.push(`${index + 1}. ${item.name}`);
        lines.push(
          `Quantidade: ${item.quantity} ${
            item.quantity === 1 ? "unidade" : "unidades"
          }`
        );
        if (item.colors?.length) {
          lines.push(`Cor: ${item.color || "a confirmar"}`);
        }
        lines.push(`Preço unitário: ${formatPrice(unitPrice)}`);
        lines.push(`Total: ${formatPrice(unitPrice * item.quantity)}`);
        lines.push("");
      });

      lines.push(`Subtotal (s/ IVA): ${formatPrice(totals.subtotal)}`);
      lines.push(`IVA (23%): ${formatPrice(vat)}`);
      lines.push(`Total c/ IVA: ${formatPrice(totals.subtotal + vat)}`);
      lines.push("");
      lines.push(
        delivery === "loja"
          ? "Entrega: levantamento na loja"
          : "Entrega: envio (portes a confirmar)"
      );

      const notes = document.getElementById("notas")?.value.trim();
      if (notes) lines.push(`Notas: ${notes}`);
      lines.push("");
      lines.push("Obrigado!");

      return lines.join("\n");
    },
  };

  cart.init();

  // Exposto para páginas de produto (detalhe) poderem adicionar ao carrinho.
  window.CopyCenterCart = {
    add: (product) => cart.addItem(product),
    addSimple: ({ id, name, price, image, meta, url, packSize, colors }) =>
      cart.addItem({
        id,
        name,
        price: Number(price) || 0,
        unitPrice: Number(price) || 0,
        packSize: packSize || 1,
        packPrice: (Number(price) || 0) * (packSize || 1),
        meta: meta || "",
        image: image || "",
        url: url || "produto.html",
        colors: colors || [],
        color: "",
        quantityMode: "custom",
      }),
  };

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
