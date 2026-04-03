// lib/shipping.js

// Itt definiáljuk a szállítási módok "adatbázisát"
const shippingMethods = {
  pickup: {
    id: "pickup",
    label: "Személyes átvétel",
    price: 0,
    description: "Személyes átvétel a műhelyben",
  },
  gls: {
    id: "gls",
    label: "GLS házhozszállítás",
    price: 1990,
  },
  mpl: {
    id: "mpl",
    label: "MPL házhozszállítás",
    price: 1790,
  },
  foxpost: {
    id: "foxpost",
    label: "Foxpost automata",
    price: 990,
  },
}

// Szállítási mód lekérése ID alapján
export function getShippingMethod(id) {
  if (!id) return null
  return shippingMethods[id] || null
}

// Stripe line item generálása a szállításhoz
export function getStripeLineItem(id) {
  const method = getShippingMethod(id)
  if (!method) return null

  return {
    price_data: {
      currency: "huf",
      product_data: {
        name: `Szállítás (${method.label})`,
      },
      // Stripe: amount fillérben → Ft * 100, ha így akarod kezelni
      // Ha a termékáraknál is fillérben gondolkodunk, akkor itt is:
      unit_amount: method.price * 100,
    },
    quantity: 1,
  }
}

// Számlázz.hu tétel generálása a szállításhoz
export function getInvoiceItem(id) {
  const method = getShippingMethod(id)
  if (!method) return null

  return {
    name: `Szállítás (${method.label})`,
    quantity: 1,
    unitPrice: method.price,
    vat: "AAM", // új KATA
  }
}

// Metadata szöveg generálása (Stripe metadata-hoz, MailerLite-hoz, stb.)
export function getShippingMetadata(id) {
  const method = getShippingMethod(id)
  if (!method) return ""
  return `${method.label} – ${method.price} Ft`
}
