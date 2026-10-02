import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { parseInformalMessageLocally, EXTRACTION_SYSTEM_PROMPT } from './src/services/aiExtractor.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());

// EXACT SYSTEM INSTRUCTION FOR KAHAWA AI AGENT
export const KAHAWA_AI_SYSTEM_INSTRUCTION = `[01 ROLE]
You are "Kahawa AI," an expert Ugandan agricultural AI assistant, coffee supply-chain advisor, and plant pathologist built into the KahawaLink Uganda platform. Your goal is to serve smallholder farmers, local buyers, input suppliers, and agricultural extension officers across all coffee-growing regions of Uganda (Central, Masaka, Bugisu, Rwenzori, Ankole, West Nile, Sebei).

[02 CONTEXT & DOMAIN KNOWLEDGE]
- Coffee Varieties: Robusta (dominant in Central, Western, South-Western lowlands) and Arabica (Bugisu/Mt. Elgon, Rwenzori, Mt. Nebbi/West Nile).
- Coffee Processing Terms: Kiboko (dry cherry), FAQ (Fair Average Quality / Kase), Parchment (Clean Arabica), Red Cherries, Hulling, Washing Station.
- Market Dynamics: Provide realistic benchmark pricing insights aligned with Uganda Coffee Development Authority (UCDA) standards in Uganda Shillings (UGX per kg).
- Pests & Diseases: Expert in diagnosing and treating Coffee Wilt Disease (CWD), Coffee Berry Borer (CBB), Coffee Leaf Rust (CLR), and Black Coffee Twig Borer (BCTB).
- Localization: Able to understand and respond in simple, accessible English, with ability to output key terms or phrases in Luganda, Runyankole, or Lugbara when requested.

[03 TASK & CORE CAPABILITIES]
1. Image & Symptom Analysis (Vision Mode): When provided with crop images or symptom descriptions, identify diseases or deficiencies, explain the cause, and offer organic/affordable treatment steps.
2. Market Price & Selling Advice: Help farmers calculate fair market prices based on grade, weight (kg), and region to avoid middleman exploitation.
3. Good Agricultural Practices (GAP): Advise on pruning, soil fertilizing, shade tree planting, harvesting mature cherries, and moisture control during drying (target 12-13%).
4. Buyer & Supplier Matching: Structure farmer queries into structured JSON listings (Produce offered or Inputs required) for the app backend.

[04 CONSTRAINTS & SAFETY BOUNDARIES]
- NEVER advise using banned or hazardous agrochemicals in Uganda. Prioritize IPM (Integrated Pest Management) and UCDA-approved treatments.
- Keep responses concise, action-oriented, and mobile-friendly (bullet points, clear steps, bold key actions).
- If a plant disease diagnosis is uncertain from an image, recommend consulting a local district extension officer alongside basic quarantine steps.
- Always quote prices in UGX (Uganda Shillings) per kilogram.

[05 OUTPUT FORMATS]
For Farmer Advice:
🩺 Quick Summary / Diagnosis**
⚡ Immediate Action Steps** (Low-cost solutions first)
🌱 Prevention & GAP Tip**

For System API/Data Structuring Requests:
Return structured JSON with keys: {"crop_type": "", "quantity_kg": 0, "grade": "", "district": "", "price_ugx_per_kg": 0}.`;

// Initialize GoogleGenAI server-side with User-Agent header for telemetry
const getGenAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

const PRIMARY_MODEL = process.env.GEMMA_MODEL || 'gemma-4-26b-a4b-it';

// Helper: Call Gemma 4 / GenAI with fallback strategy
async function callKahawaAI(prompt: string, jsonMode: boolean = false) {
  const ai = getGenAIClient();
  if (!ai) throw new Error('No API key attached');

  const modelsToTry = [PRIMARY_MODEL, 'gemma-4', 'gemini-3.8-flash'];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const config: any = {
        systemInstruction: KAHAWA_AI_SYSTEM_INSTRUCTION,
      };

      if (jsonMode) {
        config.responseMimeType = 'application/json';
      }

      // Try with tools if supported, or plain config
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        config,
      });

      if (response && response.text) {
        return {
          text: response.text,
          modelUsed: model,
        };
      }
    } catch (err: any) {
      console.warn(`Attempt with ${model} failed:`, err?.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error('All model attempts failed');
}

// 1. API Route: Data Structuring / Listing Extractor
app.post('/api/extract-listing', async (req, res) => {
  const { text, defaultContact, defaultRole } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text content is required' });
  }

  const prompt = `Convert this Ugandan coffee trade message into structured JSON according to your [04 TASK & CORE CAPABILITIES]:
"${text.trim()}"

Return pure JSON matching:
{
  "type": "selling" | "buying",
  "variety": "Robusta" | "Arabica" | "Mixed/Other",
  "grade": "kiboko" | "FAQ" | "parchment" | "green bean" | "other",
  "quantity_kg": number,
  "price_ugx_per_kg": number,
  "region": "Central" | "Western" | "Eastern" | "Northern",
  "district": string,
  "notes": string
}`;

  try {
    const aiResult = await callKahawaAI(prompt, true);
    const cleanJson = aiResult.text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    const parsedData = JSON.parse(cleanJson);

    return res.json({
      success: true,
      listing: {
        type: parsedData.type || 'selling',
        role: defaultRole || 'Farmer / Smallholder',
        variety: parsedData.variety || 'Robusta',
        grade: parsedData.grade || 'kiboko',
        quantity_kg: Number(parsedData.quantity_kg) || 300,
        price_ugx_per_kg: Number(parsedData.price_ugx_per_kg) || 4500,
        region: parsedData.region || 'Central',
        district: parsedData.district || 'Masaka',
        notes: parsedData.notes || text.trim(),
        contact: {
          name: defaultContact?.name || 'Local Coffee Producer',
          phone: defaultContact?.phone || '+256 770 000 000',
          momo_network: defaultContact?.momo_network || 'MTN MoMo',
          whatsapp: defaultContact?.whatsapp || defaultContact?.phone || '+256 770 000 000',
        },
      },
      source: 'ai',
      modelUsed: aiResult.modelUsed,
    });
  } catch (error: any) {
    console.warn('Extraction fallback to local rule parser:', error?.message);
    const fallbackListing = parseInformalMessageLocally(text, defaultContact, defaultRole);
    return res.json({
      success: true,
      listing: fallbackListing,
      source: 'fallback_rule_engine',
      modelUsed: 'local_uganda_coffee_engine',
      error: error?.message,
    });
  }
});

// 2. API Route: Kahawa AI Plant Pathology & Extension Advisor
app.post('/api/kahawa-advisor', async (req, res) => {
  const { query, region, cropType } = req.body;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query is required' });
  }

  const prompt = `Ugandan Coffee Farmer Query:
Region: ${region || 'Central/Uganda'}
Crop Variety: ${cropType || 'Robusta / Arabica'}
Question / Symptoms / Concern:
"${query.trim()}"

Provide practical, mobile-friendly agricultural advice following your specified format:
🩺 Quick Summary / Diagnosis**
⚡ Immediate Action Steps** (Low-cost solutions first)
🌱 Prevention & GAP Tip**`;

  try {
    const result = await callKahawaAI(prompt, false);
    return res.json({
      success: true,
      advice: result.text,
      modelUsed: result.modelUsed,
      source: 'ai',
    });
  } catch (error: any) {
    console.warn('Advisor fallback triggered:', error?.message);

    // Contextual local agricultural fallback for common Ugandan queries
    const q = query.toLowerCase();
    let localAdvice = '';

    if (q.includes('twig') || q.includes('bctb') || q.includes('black') || q.includes('wilting branches')) {
      localAdvice = `🩺 **Quick Summary / Diagnosis: Black Coffee Twig Borer (BCTB / Ennoga)**
The small black beetle bores into primary coffee branches, laying eggs and introducing ambrosia fungus that dries the twigs.

⚡ **Immediate Action Steps:**
1. **Prune infested twigs**: Cut branches 2 to 3 inches below the lowest entrance hole.
2. **Burn immediately**: Never leave cut twigs on the ground; burn them to destroy beetles and larvae inside.
3. **Inspect shade**: Thin overshaded canopies to allow sunlight penetration.

🌱 **Prevention & GAP Tip:**
Plant recommended shade trees (Albizia chinensis, Cordia africana) and avoid host trees like avocado or eucalyptus close to your coffee plot.`;
    } else if (q.includes('rust') || q.includes('yellow') || q.includes('spots') || q.includes('clr')) {
      localAdvice = `🩺 **Quick Summary / Diagnosis: Coffee Leaf Rust (CLR / Hemileia vastatrix)**
Fungal disease causing orange-yellow powdery spots on the underside of coffee leaves, leading to premature leaf fall. More severe on Arabica (Bugisu, Rwenzori).

⚡ **Immediate Action Steps:**
1. **Prune excess suckers**: Open up the tree canopy to reduce damp humidity.
2. **Spray UCDA-approved copper fungicide**: Apply Copper Oxychloride (0.5%) before heavy rain seasons.
3. **Soil nutrition**: Apply well-decomposed manure or coffee pulp around root lines.

🌱 **Prevention & GAP Tip:**
Plant rust-tolerant varieties (e.g. SL14 or Katuka lines for Arabica) and maintain balanced weed mulching.`;
    } else if (q.includes('price') || q.includes('market') || q.includes('ucda') || q.includes('kiboko') || q.includes('faq')) {
      localAdvice = `🩺 **Quick Summary / Diagnosis: Current UCDA Market Benchmark Guidance**
Indicative farm-gate and mill-gate price benchmarks in Uganda Shillings:

⚡ **Immediate Action Steps:**
- **Robusta Kiboko (Dry Cherry):** UGX 4,400 – 4,900 / kg (Ensure moisture is 12-13%).
- **Robusta FAQ (Kase):** UGX 11,200 – 12,400 / kg.
- **Arabica Parchment:** UGX 11,800 – 13,200 / kg.
- **Arabica Clean / Green Bean:** UGX 15,500 – 18,000 / kg.

🌱 **Prevention & GAP Tip:**
Never sell un-dried or moldy cherries to middlemen at a discount. Pooling with your local cooperative guarantees higher volume premiums.`;
    } else {
      localAdvice = `🩺 **Quick Summary / Diagnosis: Coffee Agronomy & Farm Care**
Addressing your coffee field query for ${cropType || 'Ugandan coffee'}.

⚡ **Immediate Action Steps:**
1. **Soil & Mulch**: Mulch with maize stover or dry grass, leaving 6 inches free around the coffee collar.
2. **Moisture Control**: Dry harvested cherries strictly on raised tarpaulins or mesh beds until moisture reaches 12-13%.
3. **Pruning**: Desucker upright watershoots to channel nutrients to bearing primaries.

🌱 **Prevention & GAP Tip:**
Consult your district extension officer or local cooperative society agronomist for certified UCDA soil test kits and pest traps.`;
    }

    return res.json({
      success: true,
      advice: localAdvice,
      modelUsed: 'local_uganda_coffee_engine',
      source: 'fallback_rule_engine',
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    agentName: 'Kahawa AI',
    primaryModel: PRIMARY_MODEL,
    hasApiKey: !!process.env.GEMINI_API_KEY,
  });
});

// Vite Middleware for Development / Static for Production
async function setupVite() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`KawaLink server running on http://0.0.0.0:${port} with Kahawa AI Agent (${PRIMARY_MODEL})`);
  });
}

setupVite();
