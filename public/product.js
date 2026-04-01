// public/product.js

function getQueryParam(key) {
  const url = new URL(window.location.href)
  return url.searchParams.get(key)
}

async function fetchProduct(id) {
  const res = await fetch(`/api/products?id=${id}`)
  const data = await res.json()
  return data.product
}

function renderProduct(product) {
  document.querySelector("#product-image").src = product.image
  document.querySelector("#product-name").textContent = product.name
  document.querySelector("#product-price").textContent = product.price + " Ft"
  document.querySelector("#product-description").textContent = product.description

  const btn = document.querySelector("#buy-button")

  if (product.stock > 0) {
    btn.disabled = false
    btn.textContent = "Megvásárolom"
  } else {
    btn.disabled = true
    btn.textContent = "Elfogyott"
  }
}

async function loadProductPage() {
  const id = getQueryParam("id")
  const product = await fetchProduct(id)
  renderProduct(product)

  // rendelés indítása
  document.querySelector("#buy-button").addEventListener("click", () => {
    window.location.href = `/checkout.html?id=${product.id}`
  })
}

document.addEventListener("DOMContentLoaded", loadProductPage)