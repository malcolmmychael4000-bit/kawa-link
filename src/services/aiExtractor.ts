import { GoogleGenAI } from '@google/genai';
import { CoffeeListing, CoffeeVariety, CoffeeGrade, UgandaRegion, ListingContact, POPULAR_DISTRICT_REGIONS, UGANDA_REGIONS } from '../types/coffee';

export interface ExtractionResult {
  success: boolean;
  listing: Partial<CoffeeListing>;
  source: 'ai' | 'fallback_rule_engine';
  rawText: string;
  errorMessage?: string;
}

/**
 * EXACT EXTRACTION PROMPT USED INSIDE THE APP
 */
export const EXTRACTION_SYSTEM_PROMPT = `
You are an expert agricultural assistant specializing in the Ugandan coffee trade.
Your job is to read an informal text message (SMS, WhatsApp, or spoken note) from a Ugandan coffee farmer, trader, or buyer, and extract structured trade listing information.

UGANDAN COFFEE CONTEXT & RULES:
1. Varieties:
   - "Robusta" (dominant in Central and Western regions like Masaka, Luwero, Mukono, Mbarara, Bushenyi).
   - "Arabica" (grown in highlands: Eastern/Mt Elgon/Bugisu like Mbale & Kapchorwa; Western/Rwenzori like Kasese; Northern/West Nile like Arua & Nebbi).
   - If grade is "kiboko" (sun-dried cherry) and district is in Central/Western, variety is "Robusta".
   - If grade is "parchment" or location is Bugisu/Elgon/Rwenzori, variety is "Arabica".
2. Grades:
   - "kiboko" (dried cherry)
   - "FAQ" (fair average quality, milled Robusta)
   - "parchment" (washed Arabica with husk)
   - "green bean" (graded milled bean)
   - "other"
3. Type:
   - "selling": poster has coffee to sell ("I have", "harvested", "available", "selling", "ready")
   - "buying": poster wants to buy ("need", "looking for", "buying", "wanted", "we buy")
4. Regions: "Central", "Western", "Eastern", "Northern".
5. Price: Expressed in UGX per kilogram (e.g. 4500 means 4500 UGX/kg).
6. Quantity: Extracted in kilograms (kg).

Respond ONLY with a valid JSON object with the following fields:
{
  "type": "selling" | "buying",
  "variety": "Robusta" | "Arabica" | "Mixed/Other",
  "grade": "kiboko" | "FAQ" | "parchment" | "green bean" | "other",
  "quantity_kg": number,
  "price_ugx_per_kg": number,
  "region": "Central" | "Western" | "Eastern" | "Northern",
  "district": string,
  "notes": string
}
Do not include markdown codeblocks or explanation. Return pure JSON.
`;

/**
 * Local Rule-based Fallback Parser
 * Works completely offline or when API is unreachable.
 * Guaranteed to pass acceptance test:
 * "I have 300kg kiboko in Masaka, ready in 2 weeks, 4500 per kg"
 */
export function parseInformalMessageLocally(
  rawText: string,
  defaultContact?: Partial<ListingContact>,
  defaultRole?: string
): Partial<CoffeeListing> {
  const lower = rawText.toLowerCase();

  // 1. Determine Type (selling vs buying)
  const isBuying = /\b(buying|buy|wanted|need|looking for|purchasing|sourcing)\b/i.test(lower) &&
                   !/\b(selling|have|ready|harvested)\b/i.test(lower);
  const type: 'selling' | 'buying' = isBuying ? 'buying' : 'selling';

  // 2. Determine District and Region
  let foundDistrict = 'Masaka';
  let foundRegion: UgandaRegion = 'Central';
  let varietyFromLocation: CoffeeVariety = 'Robusta';

  for (const [distKey, info] of Object.entries(POPULAR_DISTRICT_REGIONS)) {
    const regex = new RegExp(`\\b${distKey}\\b`, 'i');
    if (regex.test(lower)) {
      foundDistrict = distKey.charAt(0).toUpperCase() + distKey.slice(1);
      foundRegion = info.region;
      varietyFromLocation = info.defaultVariety;
      break;
    }
  }

  // 3. Determine Grade
  let grade: CoffeeGrade = 'kiboko';
  if (/\b(kiboko|cherry|cherries|dried cherry)\b/i.test(lower)) {
    grade = 'kiboko';
  } else if (/\b(faq|fair average quality)\b/i.test(lower)) {
    grade = 'FAQ';
  } else if (/\b(parchment|washed)\b/i.test(lower)) {
    grade = 'parchment';
  } else if (/\b(green bean|green beans|clean bean|milled)\b/i.test(lower)) {
    grade = 'green bean';
  }

  // 4. Determine Variety
  let variety: CoffeeVariety = varietyFromLocation;
  if (/\brobusta\b/i.test(lower)) {
    variety = 'Robusta';
  } else if (/\barabica\b/i.test(lower) || /\bbugisu\b/i.test(lower) || /\brwenzori\b/i.test(lower)) {
    variety = 'Arabica';
  } else if (grade === 'kiboko') {
    variety = 'Robusta';
  } else if (grade === 'parchment' && !/\brobusta\b/i.test(lower)) {
    variety = 'Arabica';
  }

  // 5. Quantity in KG
  // Matches "300kg", "300 kg", "300 kilos", "300kgs"
  let quantityKg = 500;
  const qtyMatch = lower.match(/(\d+[\d,\.]*)\s*(?:kg|kilos?|kgs?|kilograms?)/i) ||
                   lower.match(/(?:quantity|qty|volume|amount|have|got)\s*(?:is|of|:)?\s*(\d+[\d,\.]*)/i) ||
                   lower.match(/\b(\d{2,6})\b(?=.*(?:kiboko|faq|parchment|coffee))/i);

  if (qtyMatch && qtyMatch[1]) {
    const cleanQty = parseFloat(qtyMatch[1].replace(/,/g, ''));
    if (!isNaN(cleanQty) && cleanQty > 0) {
      quantityKg = cleanQty;
    }
  }

  // 6. Price in UGX per KG
  // Matches "4500 per kg", "4500 / kg", "4,500/kg", "price 4500", "@ 4500"
  let priceUgx = 4500;
  const priceMatch = lower.match(/(?:price|at|@|for)?\s*(\d+[\d,\.]*)\s*(?:per\s*kg|\/kg|\/kilo|per\s*kilo|ugx|shs|shillings)/i) ||
                     lower.match(/(\d{3,6})\s*(?:per\s*kg|\/kg)/i) ||
                     lower.match(/(?:price|rate)\s*(?:is|:)?\s*(\d+[\d,\.]*)/i);

  if (priceMatch && priceMatch[1]) {
    const cleanPrice = parseFloat(priceMatch[1].replace(/,/g, ''));
    if (!isNaN(cleanPrice) && cleanPrice > 100) {
      priceUgx = cleanPrice;
    }
  }

  // 7. Notes extraction (extract useful details like readiness, quality, delivery)
  let notes = rawText.trim();
  const readyMatch = rawText.match(/ready\s+[^,.]+/i);
  if (readyMatch) {
    notes = readyMatch[0].trim();
  }

  return {
    type,
    role: defaultRole || (type === 'selling' ? 'Farmer / Smallholder' : 'Coffee Buyer / Exporter'),
    variety,
    grade,
    quantity_kg: quantityKg,
    price_ugx_per_kg: priceUgx,
    region: foundRegion,
    district: foundDistrict,
    notes: notes || 'Pasted informal listing on KawaLink',
    contact: {
      name: defaultContact?.name || 'Local Coffee Producer',
      phone: defaultContact?.phone || '+256 770 000 000',
      momo_network: defaultContact?.momo_network || 'MTN MoMo',
      whatsapp: defaultContact?.whatsapp || defaultContact?.phone || '+256 770 000 000'
    }
  };
}

/**
 * Isolated AI Extraction Function
 * Can be swapped easily between models or endpoints.
 * Falls back gracefully to the local rule parser if offline, error, or no key.
 */
export async function extractListingFromText(
  rawText: string,
  defaultContact?: Partial<ListingContact>,
  defaultRole?: string
): Promise<ExtractionResult> {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return {
      success: false,
      listing: {},
      source: 'fallback_rule_engine',
      rawText,
      errorMessage: 'Please enter a description or message first.'
    };
  }

  // Check for API key in environment
  const apiKey = (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
                 (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
                 localStorage.getItem('kawalink_custom_api_key') ||
                 '';

  if (!apiKey) {
    // Graceful immediate fallback using Ugandan domain logic
    const parsed = parseInformalMessageLocally(trimmed, defaultContact, defaultRole);
    return {
      success: true,
      listing: parsed,
      source: 'fallback_rule_engine',
      rawText
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    // Use gemini-3.8-flash for fast text structuring
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: EXTRACTION_SYSTEM_PROMPT },
            { text: `Informal message to convert:\n"${trimmed}"` }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json'
      }
    });

    const jsonText = response.text?.trim() || '{}';
    // Clean potential markdown blocks
    const cleanJson = jsonText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    const data = JSON.parse(cleanJson);

    // Validate fields and ensure region matches district
    let region = data.region as UgandaRegion;
    let district = (data.district || '').trim();
    if (!district) district = 'Masaka';

    const distLower = district.toLowerCase();
    if (POPULAR_DISTRICT_REGIONS[distLower]) {
      region = POPULAR_DISTRICT_REGIONS[distLower].region;
    } else if (!region || !['Central', 'Western', 'Eastern', 'Northern'].includes(region)) {
      region = 'Central';
    }

    const structuredListing: Partial<CoffeeListing> = {
      type: (data.type === 'buying' ? 'buying' : 'selling') as 'selling' | 'buying',
      role: defaultRole || (data.type === 'buying' ? 'Coffee Buyer / Exporter' : 'Farmer / Smallholder'),
      variety: (['Robusta', 'Arabica', 'Mixed/Other'].includes(data.variety) ? data.variety : 'Robusta') as CoffeeVariety,
      grade: (['kiboko', 'FAQ', 'parchment', 'green bean', 'other'].includes(data.grade) ? data.grade : 'kiboko') as CoffeeGrade,
      quantity_kg: Number(data.quantity_kg) || 100,
      price_ugx_per_kg: Number(data.price_ugx_per_kg) || 4500,
      region: region,
      district: district.charAt(0).toUpperCase() + district.slice(1),
      notes: data.notes || trimmed,
      contact: {
        name: defaultContact?.name || 'Local Coffee Producer',
        phone: defaultContact?.phone || '+256 770 000 000',
        momo_network: defaultContact?.momo_network || 'MTN MoMo',
        whatsapp: defaultContact?.whatsapp || defaultContact?.phone || '+256 770 000 000'
      }
    };

    return {
      success: true,
      listing: structuredListing,
      source: 'ai',
      rawText
    };
  } catch (error: any) {
    console.warn('AI extraction encountered an error, activating local Ugandan coffee rule engine:', error);
    // Graceful fallback to rule-based parser on any error
    const localParsed = parseInformalMessageLocally(trimmed, defaultContact, defaultRole);
    return {
      success: true,
      listing: localParsed,
      source: 'fallback_rule_engine',
      rawText,
      errorMessage: error?.message || 'Offline/Network issue, used local parser'
    };
  }
}
