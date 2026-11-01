/* Copy Center — enriquece os cartões da página inicial.
 *
 * Os cartões da homepage estão escritos em HTML. Este script lê o catálogo
 * (catalogo-data.js) e acrescenta-lhes a avaliação (estrelas + número de
 * avaliações). Desta forma os dados de avaliação ficam numa só fonte (o
 * catálogo).
 */
(() => {
  "use strict";

  const products = Array.isArray(window.COPY_CENTER_PRODUCTS)
    ? window.COPY_CENTER_PRODUCTS
    : [];
  if (!products.length) return;

  const byId = new Map(products.map((product) => [product.id, product]));

  const integerFormatter = new Intl.NumberFormat("pt-PT");
  const ratingFormatter = new Intl.NumberFormat("pt-PT", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const formatInteger = (value) => integerFormatter.format(Number(value) || 0);
  const formatRating = (value) => ratingFormatter.format(Number(value) || 0);

  const STAR_SVG =
    '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-star"/></svg>';

  const createStars = (rating) => {
    const wrap = document.createElement("span");
    wrap.className = "product-card__stars rating__stars";
    const filled = Math.round(Number(rating) || 0);
    for (let i = 0; i < 5; i += 1) {
      const star = document.createElement("span");
      star.className = "rating__star" + (i < filled ? " is-filled" : "");
      star.innerHTML = STAR_SVG;
      wrap.appendChild(star);
    }
    return wrap;
  };

  const idFromHref = (href) => {
    if (!href) return null;
    const match = href.match(/[?&]id=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  };

  document.querySelectorAll(".product-card").forEach((card) => {
    const product = byId.get(idFromHref(card.getAttribute("href")));
    if (!product) return;

    const rating = Number(product.rating) || 0;
    const reviews = Number(product.reviews) || 0;

    // ----- Avaliação -----
    if (!card.querySelector(".product-card__rating")) {
      const ratingRow = document.createElement("span");
      ratingRow.className = "product-card__rating";
      ratingRow.setAttribute(
        "aria-label",
        `Avaliação ${formatRating(rating)} em 5, ${formatInteger(reviews)} avaliações`
      );
      ratingRow.appendChild(createStars(rating));
      const ratingText = document.createElement("span");
      ratingText.className = "product-card__rating-text";
      ratingText.textContent = `${formatRating(rating)} (${formatInteger(reviews)})`;
      ratingRow.appendChild(ratingText);

      const nameEl = card.querySelector(".product-card__name");
      const priceEl = card.querySelector(".product-card__price");
      if (nameEl && priceEl) {
        card.insertBefore(ratingRow, priceEl);
      } else {
        card.appendChild(ratingRow);
      }
    }
  });
})();
