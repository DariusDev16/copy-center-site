# Copy Center — front-end

Loja front-end da Copy Center: página inicial, catálogo completo e carrinho com finalização por WhatsApp.

## Ficheiros

- `index.html` — página inicial.
- `produtos.html` — catálogo “Todos os produtos”.
- `carrinho.html` — carrinho e resumo da encomenda.
- `styles.css` — desenho, componentes e responsividade.
- `catalogo-data.js` — contrato de dados do catálogo (produtos e categorias).
- `catalogo.js` — renderização, pesquisa, filtros, ordenação e parâmetros de URL.
- `app.js` — menu móvel, carrosséis, carrinho em `localStorage` e mensagem de WhatsApp.

## Catálogo

O catálogo é renderizado a partir de `catalogo-data.js`. Cada produto segue esta estrutura:

```js
{
  id,
  name,
  category,
  description,
  image,
  unitPrice,
  packSize,
  packPrice,
  colors: [{ hex, name }],
  moreColors
}
```

Para ligar o catálogo ao backend, basta substituir `window.COPY_CENTER_PRODUCTS` e `window.COPY_CENTER_CATEGORIES` por dados com o mesmo formato. A página aceita os parâmetros `?categoria=`, `?q=` e `?ordem=` (relevância, preço e nome).

## Notas

- As imagens dos produtos, do destaque e das categorias são servidas localmente a partir de `assets/img/`.
- Contactos, morada e avaliações são valores de demonstração.
- O carrinho guarda quantidades por unidade em `copycenter_cart`; a encomenda é enviada para o WhatsApp `+351 968 897 834`.
- Sem JavaScript, a página inicial continua a funcionar e os carrosséis deslizam nativamente. O catálogo precisa de JavaScript para ser renderizado.

## Ver

Abrir `index.html` no navegador ou servir a pasta:

```bash
python3 -m http.server 8000
```

<!-- Pages rebuild 2026-11-01T18:20:13Z -->
