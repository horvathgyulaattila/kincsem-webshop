// public/script.js

async function fetchProducts() {
  const res = await fetch("/api/products")
  const data = await res.json()
  return data.products
}

function renderProductCard(product) {
  return `
    <a class="product-card" href="/product.html?id=${product.id}">
      <img src="${product.image}" alt="${product.name}">
      <h3>${product.name}</h3>
      <p class="price">${product.price} Ft</p>
      ${product.stock > 0 
        ? `<span class="stock in-stock">Raktáron</span>`
        : `<span class="stock out-of-stock">Elfogyott</span>`}
    </a>
  `
}

async function loadProductList() {
  const container = document.querySelector("#product-list")
  const products = await fetchProducts()

  container.innerHTML = products
    .map((p) => renderProductCard(p))
    .join("")
}

document.addEventListener("DOMContentLoaded", loadProductList)