// api/products.js
// Netlify Function – termékek lekérése Airtable-ből

import { getAllProducts, getProductById } from "../lib/products.js"

export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Csak GET metódus engedélyezett." })
    }
  }

  try {
    const params = new URLSearchParams(event.queryStringParameters || {})
    const id = params.get("id")

    // Egyetlen termék lekérése ID alapján
    if (id) {
      const product = await getProductById(id)

      if (!product) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: "A termék nem található." })
        }
      }

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product })
      }
    }

    // Összes termék lekérése
    const products = await getAllProducts()

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ products })
    }

  } catch (err) {
    console.error("Termék lekérési hiba:", err)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Szerver hiba a termékek lekérésekor." })
    }
  }
}
