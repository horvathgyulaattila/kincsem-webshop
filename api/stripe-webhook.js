// api/stripe-webhook.js
// Netlify Function – Stripe webhook feldolgozása

import Stripe from "stripe"
import { getProductById, decreaseStock } from "../lib/products.js"
import { getInvoiceItem } from "../lib/shipping.js"
import { sendInvoice } from "../lib/szamlazz.js"
import { sendCustomerToMailerLite, sendAdminNotification } from "../lib/mailerlite.js"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Csak POST metódus engedélyezett." })
    }
  }

  let stripeEvent

  try {
    // 1) Raw body és aláírás ellenőrzése
    // Netlify-on az event.body string (nem Buffer), de a Stripe SDK ezt kezeli
    const signature = event.headers["stripe-signature"]

    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error("Stripe webhook signature error:", err)
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid signature" })
    }
  }

  // 2) Csak a checkout.session.completed esemény érdekel
  if (stripeEvent.type !== "checkout.session.completed") {
    return {
      statusCode: 200,
      body: "Ignored"
    }
  }

  const session = stripeEvent.data.object
  const metadata = session.metadata || {}

  try {
    // 3) Metadata kinyerése
    const productId = metadata.productId
    const shippingMethod = metadata.shippingMethod

    const customer = {
      name: metadata.customerName,
      email: metadata.customerEmail,
      address: {
        street: metadata.customerStreet,
        city: metadata.customerCity,
        zip: metadata.customerZip,
      },
    }

    const notes = metadata.notes || ""

    // 4) Termék lekérése Airtable-ből
    const product = await getProductById(productId)

    if (!product) {
      console.error("Webhook: termék nem található:", productId)
      await sendAdminNotification(
        `HIBA: A termék nem található a webhook során: ${productId}`
      )
      return { statusCode: 200, body: "ok" }
    }

    // 5) Számla generálása Számlázz.hu-n
    const invoiceItems = [
      {
        name: product.name,
        quantity: 1,
        unitPrice: product.price,
        vat: "AAM",
      },
      getInvoiceItem(shippingMethod),
    ]

    const invoiceResponse = await sendInvoice({
      customer,
      items: invoiceItems,
      notes,
    })

    const invoiceNumber = invoiceResponse?.invoiceNumber || "N/A"

    // 6) MailerLite értesítés (vásárló)
    await sendCustomerToMailerLite({
      email: customer.email,
      name: customer.name,
      productName: product.name,
      shippingMethod: metadata.shippingLabel,
      invoiceNumber,
    })

    // 7) Készlet csökkentése Airtable-ben
    await decreaseStock(productId)

    // 8) Admin értesítés
    await sendAdminNotification(
      `Új rendelés érkezett!\n\n` +
        `Termék: ${product.name}\n` +
        `Vevő: ${customer.name}\n` +
        `Email: ${customer.email}\n` +
        `Szállítás: ${metadata.shippingLabel}\n` +
        `Számla: ${invoiceNumber}`
    )

    return { statusCode: 200, body: "ok" }

  } catch (err) {
    console.error("Webhook feldolgozási hiba:", err)
    // Stripe felé akkor is 200-at küldünk, hogy ne próbálja újra
    return { statusCode: 200, body: "ok" }
  }
}