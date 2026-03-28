import { Readable } from "stream";

/**
 * Represents extracted data from an invoice/receipt
 */
export interface ExtractedInvoiceData {
  vendor: string | null;
  date: string | null;
  amount: number | null;
  category: string | null;
  description: string | null;
  confidence: number;
  rawText: string;
}

/**
 * Extract invoice data from raw OCR text using pattern matching
 */
export function extractInvoiceData(ocrText: string): ExtractedInvoiceData {
  const text = ocrText.toLowerCase();
  let confidence = 0;

  // Extract vendor name (usually at the top)
  const vendorMatch = ocrText.match(/^([A-Za-z0-9\s&.,'-]+?)(?:\n|$)/m);
  const vendor = vendorMatch ? vendorMatch[1].trim() : null;
  if (vendor && vendor.length > 2) confidence += 0.15;

  // Extract date (common formats: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD)
  const dateMatch = ocrText.match(
    /(?:date|fecha|dated)[\s:]*([0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{2,4}|[0-9]{4}[-/][0-9]{1,2}[-/][0-9]{1,2})/i
  );
  const date = dateMatch ? dateMatch[1] : null;
  if (date) confidence += 0.2;

  // Extract amount (currency patterns: $123.45, 123,45, etc.)
  const amountMatch = ocrText.match(
    /(?:total|amount|subtotal|due|balance)[\s:]*\$?([0-9]{1,10}[.,][0-9]{2}|[0-9]{1,10})/i
  );
  const amountStr = amountMatch ? amountMatch[1].replace(/,/g, ".") : null;
  const amount = amountStr ? parseFloat(amountStr) : null;
  if (amount && amount > 0 && amount < 1000000) confidence += 0.25;

  // Extract category based on keywords
  const categoryKeywords: Record<string, string[]> = {
    fuel: ["gas", "fuel", "gasolina", "combustible", "shell", "chevron", "exxon", "bp"],
    maintenance: ["maintenance", "repair", "oil change", "mantenimiento", "reparación", "aceite"],
    tolls: ["toll", "peaje", "toll road", "autopista"],
    insurance: ["insurance", "premium", "seguro"],
    parking: ["parking", "estacionamiento", "valet"],
    meals: ["restaurant", "food", "comida", "café", "coffee"],
    supplies: ["supplies", "office", "suministros"],
    utilities: ["electric", "water", "gas bill", "servicios"],
    other: [],
  };

  let category = "other";
  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((kw) => text.includes(kw))) {
      category = cat;
      confidence += 0.15;
      break;
    }
  }

  // Extract description (usually a line with item details)
  const descriptionMatch = ocrText.match(/(?:item|description|desc)[\s:]*([^\n]{10,100})/i);
  const description = descriptionMatch ? descriptionMatch[1].trim() : null;
  if (description) confidence += 0.1;

  // Normalize confidence to 0-1 range
  confidence = Math.min(confidence, 1);

  return {
    vendor: vendor || null,
    date: date || null,
    amount: amount || null,
    category,
    description: description || null,
    confidence,
    rawText: ocrText,
  };
}

/**
 * Validate extracted invoice data
 */
export function validateInvoiceData(data: ExtractedInvoiceData): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.vendor || data.vendor.length < 2) {
    errors.push("Vendor name is missing or too short");
  }

  if (!data.date) {
    errors.push("Date is missing");
  }

  if (!data.amount || data.amount <= 0) {
    errors.push("Amount is missing or invalid");
  }

  if (data.confidence < 0.4) {
    errors.push("Confidence level is too low (less than 40%)");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Categorize expense based on keywords and patterns
 */
export function categorizeExpense(
  description: string,
  vendor: string | null
): string {
  const text = `${description} ${vendor || ""}`.toLowerCase();

  const categories: Record<string, string[]> = {
    fuel: ["gas", "fuel", "gasolina", "combustible", "shell", "chevron", "exxon", "bp", "speedway"],
    maintenance: [
      "maintenance",
      "repair",
      "oil change",
      "mantenimiento",
      "reparación",
      "aceite",
      "tire",
      "llanta",
      "service",
    ],
    tolls: ["toll", "peaje", "toll road", "autopista", "highway"],
    insurance: ["insurance", "premium", "seguro"],
    parking: ["parking", "estacionamiento", "valet", "garaje"],
    meals: ["restaurant", "food", "comida", "café", "coffee", "lunch", "dinner", "breakfast"],
    supplies: ["supplies", "office", "suministros", "material"],
    utilities: ["electric", "water", "gas bill", "servicios", "internet"],
    equipment: ["equipment", "tool", "equipo", "herramienta"],
    other: [],
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some((kw) => text.includes(kw))) {
      return category;
    }
  }

  return "other";
}

/**
 * Format date string to ISO format (YYYY-MM-DD)
 */
export function formatDateToISO(dateStr: string | null): string | null {
  if (!dateStr) return null;

  // Try MM/DD/YYYY or DD/MM/YYYY
  const slashMatch = dateStr.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (slashMatch) {
    let month = parseInt(slashMatch[1]);
    let day = parseInt(slashMatch[2]);
    const year = parseInt(slashMatch[3]);

    // Assume MM/DD/YYYY if first number > 12
    if (month > 12) {
      [month, day] = [day, month];
    }

    const fullYear = year < 100 ? (year > 50 ? 1900 + year : 2000 + year) : year;
    return `${fullYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  // Try YYYY-MM-DD
  const dashMatch = dateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (dashMatch) {
    const year = parseInt(dashMatch[1]);
    const month = parseInt(dashMatch[2]);
    const day = parseInt(dashMatch[3]);
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return null;
}

/**
 * Process OCR result and return structured invoice data
 */
export function processOCRResult(ocrText: string): ExtractedInvoiceData {
  const extracted = extractInvoiceData(ocrText);

  // Format date to ISO
  if (extracted.date) {
    extracted.date = formatDateToISO(extracted.date);
  }

  // Recategorize based on vendor and description
  if (extracted.vendor || extracted.description) {
    extracted.category = categorizeExpense(
      extracted.description || "",
      extracted.vendor
    );
  }

  return extracted;
}

/**
 * Merge multiple OCR results (for multi-page documents)
 */
export function mergeOCRResults(results: ExtractedInvoiceData[]): ExtractedInvoiceData {
  if (results.length === 0) {
    return {
      vendor: null,
      date: null,
      amount: null,
      category: "other",
      description: null,
      confidence: 0,
      rawText: "",
    };
  }

  if (results.length === 1) {
    return results[0];
  }

  // Use the result with highest confidence as base
  const best = results.reduce((prev, current) =>
    current.confidence > prev.confidence ? current : prev
  );

  // Merge amounts (sum all amounts)
  const totalAmount = results.reduce((sum, r) => sum + (r.amount || 0), 0);

  // Merge text
  const mergedText = results.map((r) => r.rawText).join("\n---\n");

  // Average confidence
  const avgConfidence =
    results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

  return {
    vendor: best.vendor,
    date: best.date,
    amount: totalAmount,
    category: best.category,
    description: best.description,
    confidence: avgConfidence,
    rawText: mergedText,
  };
}
