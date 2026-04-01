// lib/szamlazz.js

const API_KEY = process.env.SZAMLAZZ_API_KEY
const API_URL = "https://api.szamlazz.hu/v3/invoice"

if (!API_KEY) {
  console.warn("Hiányzik a SZAMLAZZ_API_KEY env változó.")
}

/**
 * Számla küldése a Számlázz.hu API-n keresztül
 * @param {Object} params
 * @param {Object} params.customer - vevő adatai
 * @param {Array} params.items - számlatételek
 * @param {String} params.notes - megjegyzés
 */
export async function sendInvoice({ customer, items, notes = "" }) {
  try {
    const payload = {
      invoice: {
        // AAM – új KATA
        paymentMethod: "bankcard",
        currency: "HUF",
        language: "hu",
        comment: notes || "Kizárólag magánszemély részére kiállított számla.",

        buyer: {
          name: customer.name,
          email: customer.email,
          address: {
            countryCode: "HU",
            postalCode: customer.address.zip,
            city: customer.address.city,
            streetAddress: customer.address.street,
          },
        },

        items: items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unit: "db",
          unitPrice: item.unitPrice,
          vat: item.vat, // "AAM"
        })),
      },
    }

    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": API_KEY,
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error("Számlázz.hu hiba:", text)
      throw new Error("Számlázz.hu API hiba.")
    }

    const data = await res.json()

    return {
      invoiceNumber: data.invoiceNumber,
      pdfUrl: data.invoicePdf,
    }
  } catch (err) {
    console.error("Számlázz.hu API error:", err)
    return null
  }
}