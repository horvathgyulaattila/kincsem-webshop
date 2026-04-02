// public/script.js

async function fetchProducts() {
  const res = await fetch("/api/products")
  const data = await res.json()
  return data.products || []
}

function renderProductCard(product) {
  const stockBadge = product.stock > 0
    ? `<span class="stock in-stock">Raktáron</span>`
    : `<span class="stock out-of-stock">Elfogyott</span>`

  const imgTag = product.image
    ? `<img src="${product.image}" alt="${product.name}" loading="lazy">`
    : `<div style="height:200px;background:var(--bg-alt);"></div>`

  return `
    <a class="product-card" href="/product.html?id=${product.id}">
      ${imgTag}
      <div class="product-card-body">
        <h3>${product.name}</h3>
        <p class="price">${product.price.toLocaleString("hu-HU")} Ft</p>
        ${stockBadge}
      </div>
    </a>
  `
}

async function loadProductList() {
  const container = document.querySelector("#product-list")
  if (!container) return

  try {
    const products = await fetchProducts()

    if (products.length === 0) {
      container.innerHTML = `<p class="product-loading">Jelenleg nincs elérhető termék.</p>`
      return
    }

    container.innerHTML = products.map(renderProductCard).join("")
  } catch (err) {
    console.error("Termékek betöltési hiba:", err)
    container.innerHTML = `<p class="product-loading">A termékek betöltése sikertelen.</p>`
  }
}

document.addEventListener("DOMContentLoaded", loadProductList)
