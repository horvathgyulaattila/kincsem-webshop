import Stripe from "stripe"
import { getProductById } from "../lib/products.js"
import {
  getShippingMethod,
  getStripeLineItem,
  getShippingMetadata
} from "../lib/shipping.js"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Csak POST metódus engedélyezett." })
    }
  }

  try {
    const body = JSON.parse(event.body || "{}")

    const {
      productId,
      shippingMethod,
      customer,
      notes = ""
    } = body

    // -----------------------------
    // 1) VALIDÁCIÓ
    // -----------------------------
    if (!productId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Hiányzik a productId." })
      }
    }

    if (!shippingMethod) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Hiányzik a shippingMethod." })
      }
    }

    if (!customer || !customer.name || !customer.email || !customer.address) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Hiányos vásárlói adatok." })
      }
    }

    if (!customer.email.includes("@")) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Érvénytelen email cím." })
      }
    }

    // -----------------------------
    // 2) TERMÉK LEKÉRÉSE
    // -----------------------------
    const product = await getProductById(productId)

    if (!product) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "A termék nem található vagy inaktív." })
      }
    }

    if (product.stock <= 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "A termék elfogyott." })
      }
    }

    // -----------------------------
    // 3) SZÁLLÍTÁSI MÓD
    // -----------------------------
    const shipping = getShippingMethod(shippingMethod)

    if (!shipping) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Érvénytelen szállítási mód." })
      }
    }

    // -----------------------------
    // 4) STRIPE LINE ITEMEK
    // -----------------------------
    const productLineItem = {
      price_data: {
        currency: "huf",
        product_data: {
          name: product.name,
        },
        unit_amount: product.price,
      },
      quantity: 1
    }

    const shippingLineItem = getStripeLineItem(shippingMethod)

    const lineItems = [productLineItem, shippingLineItem]

    // -----------------------------
    // 5) METADATA
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
    // 7) VÁLASZ
    // -----------------------------
    return {
      statusCode: 200,
      body: JSON.stringify({
        checkoutUrl: session.url
      })
    }

  } catch (err) {
    console.error("Checkout hiba:", err)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Szerver hiba a checkout során." })
    }
  }
}
