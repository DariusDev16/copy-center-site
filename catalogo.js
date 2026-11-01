(() => {
  "use strict";

  const products = Array.isArray(window.COPY_CENTER_PRODUCTS)
    ? window.COPY_CENTER_PRODUCTS
    : [];
  const categories = Array.isArray(window.COPY_CENTER_CATEGORIES)
    ? window.COPY_CENTER_CATEGORIES
    : [];

  const grid = document.querySelector("[data-catalog-grid]");
  const countEl = document.querySelector("[data-catalog-count]");
  const emptyEl = document.querySelector("[data-catalog-empty]");
  const chipsEl = document.querySelector("[data-catalog-chips]");
  const searchForm = document.querySelector("[data-catalog-search-form]");
  const searchInput = document.querySelector("[data-catalog-search]");
  const clearSearchButton = document.querySelector("[data-catalog-clear]");
  const sortSelect = document.querySelector("[data-catalog-sort]");
  const clearFiltersButton = document.querySelector("[data-catalog-reset]");
  const headerSearchInput = document.querySelector(".site-header .search input");

  if (!grid) return;

  const priceFormatter = new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  });
  const integerFormatter = new Intl.NumberFormat("pt-PT", {
    useGrouping: "always",
  });
  const formatInteger = (value) =>
    integerFormatter.format(Number(value) || 0).replace(/[\u00a0\u202f]/g, ".");
  const formatPrice = (value) => priceFormatter.format(Number(value) || 0);
  const normalize = (value) =>
    String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const categoryById = new Map(
    categories.map((category) => [category.id, category.label])
  );
  const categoryLabel = (id) => categoryById.get(id) || "Produtos";
  const categoryCounts = products.reduce((counts, product) => {
    counts[product.category] = (counts[product.category] || 0) + 1;
    return counts;
  }, {});

  const SORT_OPTIONS = new Set(["relevance", "price-asc", "price-desc", "name"]);
  const state = {
    q: "",
    category: "todos",
    sort: "relevance",
  };

  const readStateFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const category = params.get("categoria") || "todos";
    const sort = params.get("ordem") || "relevance";

    state.q = (params.get("q") || "").trim();
    state.category =
      category === "todos" || categoryById.has(category) ? category : "todos";
    state.sort = SORT_OPTIONS.has(sort) ? sort : "relevance";
  };

  const writeStateToUrl = () => {
    const params = new URLSearchParams();

    if (state.q) params.set("q", state.q);
    if (state.category !== "todos") params.set("categoria", state.category);
    if (state.sort !== "relevance") params.set("ordem", state.sort);

    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`
    );
  };

  const matchesFilters = (product) => {
    if (state.category !== "todos" && product.category !== state.category) {
      return false;
    }
    if (!state.q) return true;

    const haystack = normalize(
      [
        product.name,
        product.description,
        categoryLabel(product.category),
        product.id,
      ].join(" ")
    );

    return normalize(state.q)
      .split(" ")
      .filter(Boolean)
      .every((term) => haystack.includes(term));
  };

  const compareProducts = (a, b) => {
    if (state.sort === "price-asc" || state.sort === "price-desc") {
      const difference = Number(a.product.unitPrice) - Number(b.product.unitPrice);
      if (difference !== 0) {
        return state.sort === "price-asc" ? difference : -difference;
      }
    }

    if (state.sort === "name") {
      return a.product.name.localeCompare(b.product.name, "pt");
    }

    return a.position - b.position;
  };

  const createSwatches = (product) => {
    if (!product.colors?.length && !product.moreColors) return null;

    const swatches = document.createElement("span");
    swatches.className = "swatches";
    swatches.setAttribute(
      "aria-label",
      `${product.colors.length + (product.moreColors || 0)} cores disponíveis`
    );

    // Filtrar cores duplicadas usando nomes para evitar exibição de duplicatas.
    const seenNames = new Set();
    product.colors.forEach((color) => {
      if (!color.hex) return;
      if (seenNames.has(color.name)) return; // Pular cor repetida
      seenNames.add(color.name);

      const swatch = document.createElement("i");
      swatch.style.background = color.hex;
      swatch.dataset.colorName = color.name;
      swatch.title = color.name;
      swatches.appendChild(swatch);
    });

    if (product.moreColors) {
      const more = document.createElement("em");
      more.className = "swatches__more";
      more.textContent = `+${product.moreColors}`;
      more.title = `${product.moreColors} cores adicionais`;
      swatches.appendChild(more);
    }

    return swatches;
  };

  const createProductCard = (product) => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.dataset.productId = product.id;
    card.dataset.category = product.category;
    card.dataset.unitPrice = String(product.unitPrice);
    card.dataset.packSize = String(product.packSize);
    card.dataset.packPrice = String(product.packPrice);
    const productUrl = `produto.html?id=${encodeURIComponent(product.id)}`;
    card.dataset.url = productUrl;

    const media = document.createElement("a");
    media.className = "product-card__media";
    media.href = productUrl;
    media.setAttribute("aria-label", `Ver ${product.name}`);

    const image = document.createElement("img");
    image.src = product.image;
    image.alt = product.name;
    image.width = 300;
    image.height = 300;
    image.loading = "lazy";
    image.decoding = "async";
    media.appendChild(image);

    const category = document.createElement("span");
    category.className = "product-card__category";
    category.textContent = categoryLabel(product.category);

    const name = document.createElement("h2");
    name.className = "product-card__name";

    const nameLink = document.createElement("a");
    nameLink.href = productUrl;
    nameLink.textContent = product.name;
    name.appendChild(nameLink);

    const price = document.createElement("span");
    price.className = "product-card__price";

    const priceValue = document.createElement("b");
    priceValue.textContent = formatPrice(product.unitPrice);

    const priceUnit = document.createElement("em");
    priceUnit.textContent = " /un. s/ IVA";

    const priceNote = document.createElement("small");
    priceNote.textContent =
      Number(product.packSize) > 1
        ? `Pack de ${formatInteger(product.packSize)} un. · ${formatPrice(product.packPrice)}`
        : "Preço por unidade";

    price.append(priceValue, priceUnit, priceNote);
    card.append(media, category, name, price);

    const swatches = createSwatches(product);
    if (swatches) card.appendChild(swatches);

    return card;
  };

  const renderChips = () => {
    if (!chipsEl) return;
    const options = [{ id: "todos", label: "Todos", count: products.length }].concat(
      categories.map((category) => ({
        id: category.id,
        label: category.label,
        count: categoryCounts[category.id] || 0,
      }))
    );

    chipsEl.replaceChildren(
      ...options.map((option) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "catalog-chip";
        button.dataset.category = option.id;
        button.setAttribute(
          "aria-label",
          `${option.label}: ${option.count} ${option.count === 1 ? "produto" : "produtos"}`
        );
        button.setAttribute(
          "aria-pressed",
          String(state.category === option.id)
        );
        button.classList.toggle("is-active", state.category === option.id);

        const label = document.createElement("span");
        label.textContent = option.label;

        const count = document.createElement("span");
        count.className = "catalog-chip__count";
        count.textContent = String(option.count);

        button.append(label, count);
        button.addEventListener("click", () => {
          state.category = option.id;
          render();
        });

        return button;
      })
    );
  };

  const updateControls = () => {
    if (searchInput && searchInput.value !== state.q) {
      searchInput.value = state.q;
    }
    if (headerSearchInput && headerSearchInput.value !== state.q) {
      headerSearchInput.value = state.q;
    }
    if (sortSelect) sortSelect.value = state.sort;
    if (clearSearchButton) clearSearchButton.hidden = !state.q;

    chipsEl?.querySelectorAll("[data-category]").forEach((chip) => {
      const active = chip.dataset.category === state.category;
      chip.classList.toggle("is-active", active);
      chip.setAttribute("aria-pressed", String(active));
    });
  };

  const render = (updateUrl = true) => {
    const filtered = products
      .map((product, position) => ({ product, position }))
      .filter(({ product }) => matchesFilters(product))
      .sort(compareProducts);

    grid.replaceChildren(
      ...filtered.map(({ product }) => createProductCard(product))
    );

    const total = filtered.length;
    grid.hidden = total === 0;
    if (emptyEl) emptyEl.hidden = total > 0;
    if (countEl) {
      countEl.textContent = `${total} ${total === 1 ? "produto" : "produtos"}`;
    }

    updateControls();
    if (updateUrl) writeStateToUrl();

    // O app.js volta a ligar os botões de adicionar aos cartões recém-criados.
    document.dispatchEvent(new CustomEvent("catalog:rendered"));
  };

  const resetFilters = () => {
    state.q = "";
    state.category = "todos";
    state.sort = "relevance";
    render();
    searchInput?.focus();
  };

  searchForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    state.q = searchInput ? searchInput.value.trim() : "";
    render();
  });

  searchInput?.addEventListener("input", () => {
    state.q = searchInput.value.trim();
    render();
  });

  clearSearchButton?.addEventListener("click", () => {
    state.q = "";
    if (searchInput) searchInput.value = "";
    render();
    searchInput?.focus();
  });

  sortSelect?.addEventListener("change", () => {
    state.sort = SORT_OPTIONS.has(sortSelect.value)
      ? sortSelect.value
      : "relevance";
    render();
  });

  clearFiltersButton?.addEventListener("click", resetFilters);

  window.addEventListener("popstate", () => {
    readStateFromUrl();
    render(false);
  });

  readStateFromUrl();
  renderChips();
  render(false);
})();
