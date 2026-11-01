(() => {
  "use strict";

  const page = document.querySelector("[data-product-page]");
  const missing = document.querySelector("[data-product-missing]");
  const details = document.querySelector("[data-product-details]");

  const products = Array.isArray(window.COPY_CENTER_PRODUCTS)
    ? window.COPY_CENTER_PRODUCTS
    : [];
  const categories = Array.isArray(window.COPY_CENTER_CATEGORIES)
    ? window.COPY_CENTER_CATEGORIES
    : [];

  const categoryLabel = (id) =>
    categories.find((category) => category.id === id)?.label || "Produtos";

  const priceFormatter = new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  });
  const integerFormatter = new Intl.NumberFormat("pt-PT");
  const formatPrice = (value) => priceFormatter.format(Number(value) || 0);
  const formatInteger = (value) => integerFormatter.format(Number(value) || 0);
  const ratingFormatter = new Intl.NumberFormat("pt-PT", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const formatRating = (value) => ratingFormatter.format(Number(value) || 0);

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  // Sem id válido: mostra o primeiro produto (ex.: acesso direto a produto.html).
  const product =
    products.find((entry) => entry.id === id) || (id ? null : products[0]);

  const showMissing = () => {
    if (page) page.hidden = true;
    if (details) details.hidden = true;
    if (missing) missing.hidden = false;
    document.title = "Produto não encontrado | Copy Center";
  };

  if (!product) {
    showMissing();
    return;
  }

  // ---------- Preencher conteúdo ----------

  document.title = `${product.name} | Copy Center`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute("content", product.description);

  const setText = (selector, value) => {
    const el = document.querySelector(selector);
    if (el) el.textContent = value;
  };

  const imageUrl = product.image;
  const imageEl = document.querySelector("[data-product-image]");
  if (imageEl) {
    imageEl.src = imageUrl;
    imageEl.alt = product.name;
  }

  const breadcrumbCategory = document.querySelector("[data-breadcrumb-category]");
  if (breadcrumbCategory) {
    const link = breadcrumbCategory.querySelector("a");
    if (link) {
      link.textContent = categoryLabel(product.category);
      link.href = `produtos.html?categoria=${encodeURIComponent(product.category)}`;
    }
    breadcrumbCategory.hidden = false;
  }
  setText("[data-breadcrumb-name]", product.name);

  setText("[data-product-category]", categoryLabel(product.category));
  setText("[data-product-name]", product.name);

  // ---------- Avaliação ----------
  const ratingEl = document.querySelector("[data-product-rating]");
  if (ratingEl) {
    const rating = Number(product.rating) || 0;
    const reviews = Number(product.reviews) || 0;
    ratingEl.setAttribute(
      "aria-label",
      `Avaliação média ${formatRating(rating)} em 5, ${formatInteger(reviews)} avaliações`
    );
  }
  const starsEl = document.querySelector("[data-product-stars]");
  if (starsEl) {
    const filled = Math.round(Number(product.rating) || 0);
    starsEl.innerHTML = "";
    for (let i = 0; i < 5; i += 1) {
      const star = document.createElement("span");
      star.className = "rating__star" + (i < filled ? " is-filled" : "");
      star.innerHTML =
        '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-star"/></svg>';
      starsEl.appendChild(star);
    }
  }
  setText(
    "[data-product-reviews]",
    `${formatRating(product.rating)} · ${formatInteger(product.reviews)} avaliações`
  );

  setText("[data-product-price]", formatPrice(product.unitPrice));

  const priceNote = document.querySelector("[data-product-price-note]");
  if (priceNote) {
    priceNote.textContent = "por unidade";
  }

  setText("[data-product-lead]", product.description);

  // ---------- Cores ----------
  const colorsField = document.querySelector("[data-product-colors-field]");
  const colorsWrap = document.querySelector("[data-product-colors]");
  let selectedColor = "";

  const colors = Array.isArray(product.colors) ? product.colors : [];
  if (colorsField && colorsWrap && colors.length) {
    colors.forEach((color, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("role", "radio");
      button.setAttribute("aria-checked", index === 0 ? "true" : "false");
      button.dataset.colorName = color.name;
      button.style.setProperty("--swatch", color.hex);
      button.setAttribute("aria-label", color.name);
      if (index === 0) {
        button.classList.add("is-active");
        selectedColor = color.name;
      }
      colorsWrap.appendChild(button);
    });

    colorsWrap.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      colorsWrap.querySelectorAll("button").forEach((item) => {
        const isActive = item === button;
        item.classList.toggle("is-active", isActive);
        item.setAttribute("aria-checked", isActive ? "true" : "false");
      });
      selectedColor = button.dataset.colorName || "";
    });

    colorsField.hidden = false;
  }

  // ---------- Quantidade ----------
  // Começa sempre em 1 unidade; os packs são sugestões que preenchem a quantidade.
  const packSizes = [25, 50, 75, 100];
  const qtyInput = document.querySelector("[data-qty-input]");
  if (qtyInput) {
    qtyInput.min = "1";
    qtyInput.step = "1";
    qtyInput.value = "1";
  }

  const setQty = (value) => {
    const parsed = Number.parseInt(value, 10);
    qtyInput.value = String(
      Number.isFinite(parsed) && parsed >= 1 ? parsed : 1
    );
    syncPackSelection();
  };

  document.querySelector("[data-qty-minus]")?.addEventListener("click", () => {
    setQty((Number(qtyInput.value) || 1) - 1);
  });

  document.querySelector("[data-qty-plus]")?.addEventListener("click", () => {
    setQty((Number(qtyInput.value) || 1) + 1);
  });

  qtyInput?.addEventListener("change", () => setQty(qtyInput.value));

  // ---------- Packs de quantidade ----------
  const packsField = document.querySelector("[data-product-packs-field]");
  const packsWrap = document.querySelector("[data-product-packs]");
  const packButtons = [];

  const syncPackSelection = () => {
    const current = Number(qtyInput?.value) || 1;
    packButtons.forEach((button) => {
      const active = Number(button.dataset.pack) === current;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  };

  if (packsField && packsWrap && Number(product.packSize) > 1) {
    packSizes.forEach((size) => {
      const total = (product.packPrice / product.packSize) * size;
      const perUnit = total / size;

      const button = document.createElement("button");
      button.type = "button";
      button.dataset.pack = String(size);
      button.setAttribute("aria-pressed", "false");
      button.setAttribute("aria-label", `Pack de ${size} unidades`);

      const amount = document.createElement("b");
      amount.textContent = `${formatInteger(size)} un.`;

      const price = document.createElement("small");
      price.textContent = `${formatPrice(total)} · ${formatPrice(perUnit)}/un.`;

      button.append(amount, price);
      button.addEventListener("click", () => setQty(size));
      packsWrap.appendChild(button);
      packButtons.push(button);
    });

    packsField.hidden = false;
    syncPackSelection();
  }

  // ---------- Descrição / detalhes ----------
  const descriptionEl = document.querySelector("[data-product-description]");
  const specsEl = document.querySelector("[data-product-specs]");

  if (descriptionEl) {
    descriptionEl.textContent = `${product.description} Personalizado com o logótipo da sua empresa e produzido em Lisboa.`;
  }

  if (specsEl) {
    const specItems = [
      `Categoria: ${categoryLabel(product.category)}.`,
      "Sem quantidade mínima: escolha a partir de 1 unidade.",
      Number(product.packSize) > 1
        ? `Packs sugeridos de 25, 50, 75 ou 100 unidades com preço por unidade reduzido.`
        : null,
      `Preço unitário de ${formatPrice(product.unitPrice)} s/ IVA.`,
      "Personalização com logótipo incluída no preço.",
    ].filter(Boolean);
    specsEl.innerHTML = "";
    specItems.forEach((text) => {
      const li = document.createElement("li");
      li.textContent = text;
      specsEl.appendChild(li);
    });
  }

  // ---------- Partilhar ----------
  const shareUrl = `${window.location.origin}${window.location.pathname}?id=${encodeURIComponent(product.id)}`;
  const shareText = `${product.name} · Copy Center`;

  const whatsappShare = document.querySelector("[data-share-whatsapp]");
  if (whatsappShare) {
    whatsappShare.href = `https://wa.me/?text=${encodeURIComponent(
      `${shareText} — ${shareUrl}`
    )}`;
  }

  const facebookShare = document.querySelector("[data-share-facebook]");
  if (facebookShare) {
    facebookShare.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      shareUrl
    )}`;
  }

  const copyButton = document.querySelector("[data-share-copy]");
  const copyLabel = document.querySelector("[data-share-copy-label]");
  copyButton?.addEventListener("click", async () => {
    const original = copyLabel ? copyLabel.textContent : "";
    const showCopied = (ok) => {
      if (!copyLabel) return;
      copyLabel.textContent = ok ? "Ligação copiada!" : "Copie: " + shareUrl;
      copyButton.classList.toggle("is-copied", ok);
      window.setTimeout(() => {
        copyLabel.textContent = original;
        copyButton.classList.remove("is-copied");
      }, 2200);
    };

    try {
      await navigator.clipboard.writeText(shareUrl);
      showCopied(true);
    } catch (error) {
      // Fallback para navegadores sem acesso à área de transferência.
      const field = document.createElement("textarea");
      field.value = shareUrl;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (copyError) {
        ok = false;
      }
      document.body.removeChild(field);
      showCopied(ok);
    }
  });

  // ---------- Adicionar ao carrinho ----------
  document.querySelector("[data-add-to-cart]")?.addEventListener("click", () => {
    const quantity = Number(qtyInput?.value) || 1;
    const cart = window.CopyCenterCart;

    if (!cart) {
      const message = `Olá! Quero encomendar ${quantity} × ${product.name}${
        selectedColor ? ` (${selectedColor})` : ""
      }.`;
      window.open(
        `https://wa.me/351968897834?text=${encodeURIComponent(message)}`,
        "_blank",
        "noopener"
      );
      return;
    }

    cart.addSimple({
      id: product.id,
      name: product.name,
      price: product.unitPrice,
      image: imageUrl,
      meta: `s/ IVA · ${formatPrice(product.unitPrice)} /un.`,
      url: `produto.html?id=${encodeURIComponent(product.id)}`,
      packSize: 1,
      colors: selectedColor ? [{ hex: "", name: selectedColor }] : [],
    });

    // Ajusta a quantidade escolhida no carrinho.
    if (quantity > 1) {
      try {
        const key = "copycenter_cart";
        const items = JSON.parse(localStorage.getItem(key) || "[]");
        const item = items.find((entry) => entry.id === product.id);
        if (item) {
          item.quantity = quantity;
          localStorage.setItem(key, JSON.stringify(items));
        }
        document.querySelectorAll(".cart__count").forEach((el) => {
          el.textContent = String(
            items.reduce((sum, entry) => sum + (Number(entry.quantity) || 0), 0)
          );
        });
      } catch (error) {
        console.error("Não foi possível ajustar a quantidade.", error);
      }
    }
  });

  // ---------- Mostrar ----------
  if (page) page.hidden = false;
  if (details) details.hidden = false;
})();
