// api/create-checkout-session.js

import Stripe from "stripe"
import { getProductById } from "../lib/products.js"
import { 
  getShippingMethod, 
  getStripeLineItem, 
  getShippingMetadata 
} from "../lib/shipping.js"

// ENV változók
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Csak POST metódus engedélyezett." })
  }

  try {
    const {
      productId,
      shippingMethod,
      customer,
      notes = ""
    } = req.body || {}

    // -----------------------------
    // 1) VALIDÁCIÓ
    // -----------------------------

    if (!productId) {
      return res.status(400).json({ error: "Hiányzik a productId." })
    }

    if (!shippingMethod) {
      return res.status(400).json({ error: "Hiányzik a shippingMethod." })
    }

    if (!customer || !customer.name || !customer.email || !customer.address) {
      return res.status(400).json({ error: "Hiányos vásárlói adatok." })
    }

    // Egyszerű email validáció
    if (!customer.email.includes("@")) {
      return res.status(400).json({ error: "Érvénytelen email cím." })
    }

    // -----------------------------
    // 2) TERMÉK LEKÉRÉSE
    // -----------------------------

    const product = await getProductById(productId)

    if (!product) {
      return res.status(400).json({ error: "A termék nem található vagy inaktív." })
    }

    if (product.stock <= 0) {
      return res.status(400).json({ error: "A termék elfogyott." })
    }

    // -----------------------------
    // 3) SZÁLLÍTÁSI MÓD LEKÉRÉSE
    // -----------------------------

    const shipping = getShippingMethod(shippingMethod)

    if (!shipping) {
      return res.status(400).json({ error: "Érvénytelen szállítási mód." })
    }

    // -----------------------------
    // 4) STRIPE LINE ITEMEK
    // -----------------------------

    const productLineItem = {
      price: product.stripePriceId,
      quantity: 1
    }

    const shippingLineItem = getStripeLineItem(shippingMethod)

    const lineItems = [productLineItem, shippingLineItem]

    // -----------------------------
    // 5) METADATA ÖSSZEÁLLÍTÁSA
    // -----------------------------

    const metadata = {
      productId: product.id,
      productName: product.name,
      shippingMethod: shipping.id,
      shippingLabel: shipping.label,
      shippingPrice: String(shipping.price),
      customerName: customer.name,
      customerEmail: customer.email,
      customerStreet: customer.address.street || "",
      customerCity: customer.address.city || "",
      customerZip: customer.address.zip || "",
      notes: notes || ""
    }

    // -----------------------------
    // 6) STRIPE CHECKOUT SESSION
    // -----------------------------

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      success_url: process.env.SUCCESS_URL,
      cancel_url: process.env.CANCEL_URL,
      customer_email: customer.email,
      billing_address_collection: "required",
      metadata
    })

    // -----------------------------
    // 7) VÁLASZ A FRONTENDNEK
    // -----------------------------

    return res.status(200).json({
      checkoutUrl: session.url
    })

  } catch (err) {
    console.error("Checkout hiba:", err)
    return res.status(500).json({ error: "Szerver hiba a checkout során." })
  }
}