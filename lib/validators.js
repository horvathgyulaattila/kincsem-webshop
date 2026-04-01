// lib/validators.js

//
// 1) Email validáció
//
export function isValidEmail(email) {
  if (!email) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

//
// 2) Kötelező mezők ellenőrzése
//
export function validateRequiredFields(obj, requiredFields = []) {
  const missing = []

  for (const field of requiredFields) {
    const value = field.split(".").reduce((acc, key) => acc?.[key], obj)
    if (!value) missing.push(field)
  }

  return {
    ok: missing.length === 0,
    missing,
  }
}

//
// 3) KATA védelem – céges rendelés kiszűrése
//
// Tiltott minták:
// - adószám (8-1-2 számjegy)
// - "Kft", "Bt", "Zrt", "Kkt", "Kht", "Nonprofit", "Egyesület"
// - "adó", "tax", "company", "vállalkozás"
//

const COMPANY_KEYWORDS = [
  "kft",
  "bt",
  "zrt",
  "kkt",
  "kht",
  "nonprofit",
  "egyesület",
  "alapítvány",
  "company",
  "vállalkozás",
  "bt.",
  "kft.",
]

export function isCompanyName(name = "") {
  const lower = name.toLowerCase()
  return COMPANY_KEYWORDS.some((kw) => lower.includes(kw))
}

export function containsTaxNumber(text = "") {
  // Magyar adószám formátum: 8 számjegy - 1 számjegy - 2 számjegy
  return /\b\d{8}-\d{1}-\d{2}\b/.test(text)
}

//
// 4) Komplett KATA validáció
//
export function validateKataCompliance({ name, notes }) {
  if (isCompanyName(name)) {
    return {
      ok: false,
      reason: "Céges név nem engedélyezett (KATA szabályok).",
    }
  }

  if (containsTaxNumber(name) || containsTaxNumber(notes)) {
    return {
      ok: false,
      reason: "Adószám nem adható meg (KATA szabályok).",
    }
  }

  return { ok: true }
}