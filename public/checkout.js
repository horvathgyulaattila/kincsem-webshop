// public/checkout.js

function getQueryParam(key) {
  const url = new URL(window.location.href)
  return url.searchParams.get(key)
}

async function startCheckout() {
  const productId = getQueryParam("id")

  const customer = {
    name: document.querySelector("#name").value,
    email: document.querySelector("#email").value,
    address: {
      street: document.querySelector("#street").value,
      city: document.querySelector("#city").value,
      zip: document.querySelector("#zip").value,
    },
  }

  const shippingMethod = document.querySelector("input[name='shipping']:checked")?.value
  const notes = document.querySelector("#notes").value || ""

  const payload = {
    productId,
    shippingMethod,
    customer,
    notes,
  }

  const res = await fetch("/api/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  const data = await res.json()

  if (data.error) {
    alert(data.error)
    return
  }

  window.location.href = data.checkoutUrl
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelector("#checkout-form").addEventListener("submit", (e) => {
    e.preventDefault()
    startCheckout()
  })
})