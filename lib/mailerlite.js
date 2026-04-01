// lib/mailerlite.js

const API_KEY = process.env.MAILERLITE_API_KEY
const GROUP_ID = process.env.MAILERLITE_GROUP_ID // ide kerülnek a vásárlók
const ADMIN_EMAIL = process.env.ADMIN_EMAIL // ide megy az admin értesítés

if (!API_KEY) {
  console.warn("Hiányzik a MAILERLITE_API_KEY env változó.")
}

const API_URL = "https://connect.mailerlite.com/api/subscribers"

/**
 * Vásárló felvétele a MailerLite listára
 * @param {Object} params
 * @param {String} params.email
 * @param {String} params.name
 * @param {String} params.productName
 * @param {String} params.shippingMethod
 * @param {String} params.invoiceNumber
 */
export async function sendCustomerToMailerLite({
  email,
  name,
  productName,
  shippingMethod,
  invoiceNumber,
}) {
  try {
    const payload = {
      email,
      fields: {
        name,
        product: productName,
        shipping: shippingMethod,
        invoice: invoiceNumber,
      },
      groups: [GROUP_ID],
    }

    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error("MailerLite hiba:", text)
      return null
    }

    return await res.json()
  } catch (err) {
    console.error("MailerLite API error:", err)
    return null
  }
}

/**
 * Admin értesítés küldése
 * @param {String} message - az adminnak küldött üzenet
 */
export async function sendAdminNotification(message) {
  try {
    const payload = {
      email: ADMIN_EMAIL,
      fields: {
        name: "Admin",
        message,
      },
      groups: [], // nem kell listára tenni
    }

    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error("MailerLite admin hiba:", text)
      return null
    }

    return await res.json()
  } catch (err) {
    console.error("MailerLite admin API error:", err)
    return null
  }
}