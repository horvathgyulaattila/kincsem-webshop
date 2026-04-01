// api/stripe-webhook.js

import Stripe from "stripe"
import { buffer } from "micro" // Vercel esetén kell a raw body-hoz
import { getProductById, decreaseStock } from "../lib/products.js"
import { getInvoiceItem } from "../lib/shipping.js"
import { sendInvoice } from "../lib/szamlazz.js"
import { sendCustomerToMailerLite, sendAdminNotification } from "../lib/mailerlite.js"

// Stripe inicializálás
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// A Stripe webhookhoz kötelező kikapcsolni a bodyParser-t (Vercel)
export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Csak POST metódus engedélyezett.")
  }

  let event

  try {
    // 1) RAW BODY beolvasása
    const rawBody = await buffer(req)
    const signature = req.headers["stripe-signature"]

    // 2) Stripe aláírás ellenőrzése
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error("Stripe webhook signature error:", err)
    return res.status(400).send("Invalid signature")
  }

  // 3) Csak a checkout.session.completed esemény érdekel
  if (event.type !== "checkout.session.completed") {
    return res.status(200).send("Ignored")
  }

  const session = event.data.object
  const metadata = session.metadata || {}

  try {
    // 4) Metadata kinyerése
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

    // 5) Termék lekérése Airtable-ből
    const product = await getProductById(productId)

    if (!product) {
      console.error("Webhook: termék nem található:", productId)
      await sendAdminNotification(
        `HIBA: A termék nem található a webhook során: ${productId}`
      )
      return res.status(200).send("ok")
    }

    // 6) Számla generálása Számlázz.hu-n
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

    // 7) MailerLite értesítés (vásárló)
    await sendCustomerToMailerLite({
      email: customer.email,
      name: customer.name,
      productName: product.name,
      shippingMethod: metadata.shippingLabel,
      invoiceNumber,
    })

    // 8) Készlet csökkentése Airtable-ben
    await decreaseStock(productId)

    // 9) Admin értesítés (kötelező)
    await sendAdminNotification(
      `Új rendelés érkezett!\n\n` +
        `Termék: ${product.name}\n` +
        `Vevő: ${customer.name}\n` +
        `Email: ${customer.email}\n` +
        `Szállítás: ${metadata.shippingLabel}\n` +
        `Számla: ${invoiceNumber}`
    )

    // 10) Stripe felé válasz
    return res.status(200).send("ok")
  } catch (err) {
    console.error("Webhook feldolgozási hiba:", err)
    // Stripe felé akkor is 200-at küldünk, hogy ne próbálja újra
    return res.status(200).send("ok")
  }
}