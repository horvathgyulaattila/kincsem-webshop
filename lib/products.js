// lib/products.js

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_NAME) {
  console.warn("Airtable env változók hiányoznak.")
}

const AIRTABLE_API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(
  AIRTABLE_TABLE_NAME
)}`

// Egyszerű in-memory cache (serverless környezetben is működik request-élettartamon belül)
let productsCache = null
let productsCacheTimestamp = 0
const CACHE_TTL_MS = 60 * 1000 // 60 másodperc

function mapAirtableRecord(record) {
  const f = record.fields || {}

  return {
    id: f.id || null,
    name: f.name || "",
    price: typeof f.price === "number" ? f.price : 0,
    stripePriceId: f.stripePriceId || null,
    image: Array.isArray(f.image) && f.image[0] ? f.image[0].url : null,
    woodType: f.woodType || "",
    size: f.size || "",
    batch: typeof f.batch === "number" ? f.batch : null,
    stock: typeof f.stock === "number" ? f.stock : 0,
    description: f.description || "",
    active: !!f.active,
    stripeMode: f.stripeLive ? "live" : "test",
    // opcionálisan: airtableRecordId: record.id
  }
}

async function fetchAllProductsFromAirtable() {
  const res = await fetch(AIRTABLE_API_URL, {
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
    },
  })

  if (!res.ok) {
    console.error("Airtable hiba:", res.status, await res.text())
    throw new Error("Nem sikerült lekérni a termékeket az Airtable-ből.")
  }

  const data = await res.json()
  const records = data.records || []

  const products = records
    .map(mapAirtableRecord)
    .filter((p) => p.id && p.active)

  return products
}

export async function getAllProducts() {
  const now = Date.now()

  if (productsCache && now - productsCacheTimestamp < CACHE_TTL_MS) {
    return productsCache
  }

  const products = await fetchAllProductsFromAirtable()
  productsCache = products
  productsCacheTimestamp = now

  return products
}

export async function getProductById(productId) {
  if (!productId) return null

  const products = await getAllProducts()
  return products.find((p) => p.id === productId) || null
}

export async function decreaseStock(productId) {
  if (!productId) return

  // Először lekérjük a terméket, hogy tudjuk az aktuális készletet
  const products = await getAllProducts()
  const product = products.find((p) => p.id === productId)

  if (!product) {
    console.warn("Készletcsökkentés: termék nem található:", productId)
    return
  }

  if (product.stock <= 0) {
    console.warn("Készletcsökkentés: már 0 a készlet:", productId)
    return
  }

  // Itt feltételezzük, hogy az Airtable-ben van egy "id" mező (amit te adsz meg),
  // és az alapján PATCH-elünk. Ha inkább az Airtable rekord ID-t akarjuk használni,
  // akkor azt is el tudjuk tárolni.
  const res = await fetch(`${AIRTABLE_API_URL}?filterByFormula=${encodeURIComponent(
    `{id} = "${productId}"`
  )}`, {
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
    },
  })

  if (!res.ok) {
    console.error("Airtable keresés hiba (decreaseStock):", res.status, await res.text())
    return
  }

  const data = await res.json()
  const record = data.records && data.records[0]

  if (!record) {
    console.warn("Készletcsökkentés: Airtable rekord nem található:", productId)
    return
  }

  const airtableRecordId = record.id
  const newStock = product.stock - 1

  const patchRes = await fetch(`${AIRTABLE_API_URL}/${airtableRecordId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: {
        stock: newStock,
      },
    }),
  })

  if (!patchRes.ok) {
    console.error("Airtable készlet frissítés hiba:", patchRes.status, await patchRes.text())
    return
  }

  // Cache frissítése
  productsCache = products.map((p) =>
    p.id === productId ? { ...p, stock: newStock } : p
  )
}
