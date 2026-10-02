/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  CoffeeListing, 
  UserProfile, 
  ListingType, 
  CoffeeVariety, 
  CoffeeGrade, 
  UgandaRegion, 
  UGANDA_REGIONS, 
  POPULAR_DISTRICT_REGIONS 
} from './types/coffee';
import { INITIAL_MOCK_LISTINGS } from './data/mockListings';
import { extractListingFromText, ExtractionResult } from './services/aiExtractor';
import { 
  Phone, 
  MessageSquare, 
  MapPin, 
  Tag, 
  CheckCircle2, 
  Sparkles, 
  Filter, 
  PlusCircle, 
  User, 
  Sun, 
  Moon, 
  RefreshCw, 
  TrendingUp, 
  ShieldCheck, 
  Layers, 
  ChevronRight, 
  X, 
  ExternalLink,
  SlidersHorizontal,
  Info
} from 'lucide-react';

const STORAGE_LISTINGS_KEY = 'kawalink_listings_v1';
const STORAGE_PROFILE_KEY = 'kawalink_user_profile_v1';
const STORAGE_REVEALED_KEY = 'kawalink_revealed_contacts_v1';
const STORAGE_SUNLIGHT_KEY = 'kawalink_sunlight_mode_v1';

export default function App() {
  // --- State Initialization ---
  const [listings, setListings] = useState<CoffeeListing[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_LISTINGS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load listings from storage', e);
    }
    return INITIAL_MOCK_LISTINGS;
  });

  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PROFILE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load profile from storage', e);
    }
    return {
      name: 'Masaka Coffee Grower',
      role: 'Farmer / Smallholder',
      district: 'Masaka',
      region: 'Central',
      phone: '+256 772 123 456',
      momo_network: 'MTN MoMo',
      is_registered: true
    };
  });

  const [revealedContacts, setRevealedContacts] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_REVEALED_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load revealed contacts', e);
    }
    return {};
  });

  const [sunlightMode, setSunlightMode] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_SUNLIGHT_KEY) === 'true';
  });

  // UI Navigation Tabs
  const [activeTab, setActiveTab] = useState<'board' | 'create' | 'profile'>('board');
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Filters State
  const [filterType, setFilterType] = useState<string>('all'); // all, selling, buying
  const [filterRegion, setFilterRegion] = useState<string>('all');
  const [filterVariety, setFilterVariety] = useState<string>('all');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [searchDistrict, setSearchDistrict] = useState<string>('');

  // AI & Creation State
  const [informalInput, setInformalInput] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractionFeedback, setExtractionFeedback] = useState<{ source: string; message: string } | null>(null);
  const [useManualFormOnly, setUseManualFormOnly] = useState<boolean>(false);
  const [draftListing, setDraftListing] = useState<Partial<CoffeeListing> | null>(null);

  // Notification / Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_LISTINGS_KEY, JSON.stringify(listings));
    } catch (e) {
      console.error(e);
    }
  }, [listings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.error(e);
    }
  }, [profile]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_REVEALED_KEY, JSON.stringify(revealedContacts));
    } catch (e) {
      console.error(e);
    }
  }, [revealedContacts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_SUNLIGHT_KEY, String(sunlightMode));
    if (sunlightMode) {
      document.documentElement.classList.add('sunlight-contrast');
    } else {
      document.documentElement.classList.remove('sunlight-contrast');
    }
  }, [sunlightMode]);

  // Handle Express Interest
  const handleExpressInterest = (id: string, contactName: string) => {
    setRevealedContacts(prev => ({ ...prev, [id]: true }));
    showToast(`Contact revealed for ${contactName}! You can now call or WhatsApp directly.`);
  };

  // Handle AI Extraction
  const handleAiExtract = async () => {
    if (!informalInput.trim()) {
      showToast('Please paste or type an informal message first.');
      return;
    }

    setIsExtracting(true);
    setExtractionFeedback(null);

    try {
      const res: ExtractionResult = await extractListingFromText(
        informalInput,
        {
          name: profile.name,
          phone: profile.phone,
          momo_network: profile.momo_network,
          whatsapp: profile.phone
        },
        profile.role
      );

      if (res.success && res.listing) {
        setDraftListing({
          ...res.listing,
          contact: {
            name: profile.name || 'Coffee Trader',
            phone: profile.phone || '+256 770 000 000',
            momo_network: profile.momo_network || 'MTN MoMo',
            whatsapp: profile.phone || '+256 770 000 000'
          }
        });

        if (res.source === 'ai') {
          setExtractionFeedback({
            source: 'AI (Gemini/Gemma)',
            message: 'Extracted structured coffee specifications using AI.'
          });
        } else {
          setExtractionFeedback({
            source: 'Uganda Coffee Rule Engine (Offline/Local)',
            message: 'Extracted structured specifications using local Ugandan coffee standards.'
          });
        }
      } else {
        setExtractionFeedback({
          source: 'Manual Needed',
          message: res.errorMessage || 'Could not automatically structure message. Please use manual form.'
        });
        setUseManualFormOnly(true);
      }
    } catch (err: any) {
      setExtractionFeedback({
        source: 'Error Fallback',
        message: 'Extractor encountered an issue. Switched to manual entry form.'
      });
      setUseManualFormOnly(true);
    } finally {
      setIsExtracting(false);
    }
  };

  // Initialize manual draft
  const handleStartManual = () => {
    setDraftListing({
      type: 'selling',
      role: profile.role || 'Farmer / Smallholder',
      variety: 'Robusta',
      grade: 'kiboko',
      quantity_kg: 500,
      price_ugx_per_kg: 4500,
      region: profile.region || 'Central',
      district: profile.district || 'Masaka',
      contact: {
        name: profile.name,
        phone: profile.phone,
        momo_network: profile.momo_network,
        whatsapp: profile.phone
      },
      notes: ''
    });
    setUseManualFormOnly(true);
  };

  // Save new listing
  const handleSaveListing = () => {
    if (!draftListing) return;

    if (!draftListing.quantity_kg || draftListing.quantity_kg <= 0) {
      showToast('Please enter a valid quantity in kg.');
      return;
    }
    if (!draftListing.price_ugx_per_kg || draftListing.price_ugx_per_kg <= 0) {
      showToast('Please enter a valid price in UGX per kg.');
      return;
    }
    if (!draftListing.district) {
      showToast('Please specify a district.');
      return;
    }

    const newListing: CoffeeListing = {
      id: `kawa-${Date.now()}`,
      type: draftListing.type || 'selling',
      role: draftListing.role || profile.role,
      variety: draftListing.variety || 'Robusta',
      grade: draftListing.grade || 'kiboko',
      quantity_kg: Number(draftListing.quantity_kg),
      price_ugx_per_kg: Number(draftListing.price_ugx_per_kg),
      region: draftListing.region || 'Central',
      district: draftListing.district || 'Masaka',
      contact: {
        name: draftListing.contact?.name || profile.name || 'Coffee Producer',
        phone: draftListing.contact?.phone || profile.phone || '+256 770 000 000',
        momo_network: draftListing.contact?.momo_network || profile.momo_network || 'MTN MoMo',
        whatsapp: draftListing.contact?.whatsapp || profile.phone
      },
      notes: draftListing.notes || 'Posted via KawaLink',
      created_at: new Date().toISOString(),
      verified_farmer: profile.role.includes('Farmer')
    };

    setListings([newListing, ...listings]);
    setDraftListing(null);
    setInformalInput('');
    setExtractionFeedback(null);
    setActiveTab('board');
    showToast('Listing posted successfully to KawaLink board!');
  };

  // Reset to initial mock data
  const handleResetData = () => {
    if (confirm('Reset board back to standard 8 Ugandan mock listings?')) {
      setListings(INITIAL_MOCK_LISTINGS);
      setRevealedContacts({});
      showToast('Listings reset to initial Ugandan coffee board.');
    }
  };

  // Filter listings
  const filteredListings = useMemo(() => {
    return listings.filter(item => {
      if (filterType !== 'all' && item.type !== filterType) return false;
      if (filterRegion !== 'all' && item.region !== filterRegion) return false;
      if (filterVariety !== 'all' && item.variety !== filterVariety) return false;
      if (filterGrade !== 'all' && item.grade !== filterGrade) return false;
      if (searchDistrict.trim()) {
        const query = searchDistrict.toLowerCase();
        const matchesDistrict = item.district.toLowerCase().includes(query);
        const matchesNotes = item.notes.toLowerCase().includes(query);
        const matchesRole = item.role.toLowerCase().includes(query);
        if (!matchesDistrict && !matchesNotes && !matchesRole) return false;
      }
      return true;
    });
  }, [listings, filterType, filterRegion, filterVariety, filterGrade, searchDistrict]);

  return (
    <div className={`min-h-screen pb-16 ${sunlightMode ? 'bg-white text-black' : 'bg-cornsilk text-black'}`}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-saddlebrown text-cornsilk rounded shadow-lg border-2 border-darkgoldenrod text-sm font-semibold max-w-[90vw] text-center">
          {toastMessage}
        </div>
      )}

      {/* TOP HEADER - Mobile-First & High Contrast */}
      <header className={`sticky top-0 z-40 px-3 py-3 border-b-2 shadow-sm ${
        sunlightMode ? 'bg-black text-white border-black' : 'bg-saddlebrown text-cornsilk border-darkgoldenrod'
      }`}>
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          {/* Logo & Identity */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('board')}>
            <div className={`w-9 h-9 rounded flex items-center justify-center font-black text-lg ${
              sunlightMode ? 'bg-white text-black' : 'bg-forestgreen text-white border border-darkgoldenrod'
            }`}>
              ☕
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="font-extrabold tracking-tight text-lg">KawaLink</span>
                <span className="text-xs px-1.5 py-0.2 rounded font-bold uppercase bg-forestgreen text-white">
                  Uganda
                </span>
              </div>
              <p className="text-[11px] opacity-90 leading-tight">Coffee Trade Board • Low-Bandwidth</p>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-1.5">
            {/* Sunlight Mode Toggle */}
            <button
              onClick={() => setSunlightMode(!sunlightMode)}
              title="Toggle Bright Sunlight High Contrast Mode"
              className={`px-2 py-1 text-xs font-bold rounded flex items-center gap-1 border ${
                sunlightMode 
                  ? 'bg-white text-black border-white' 
                  : 'bg-darkgoldenrod text-black border-darkgoldenrod hover:bg-goldenrod'
              }`}
            >
              {sunlightMode ? <Sun size={14} className="stroke-[2.5]" /> : <Sun size={14} />}
              <span className="hidden sm:inline">{sunlightMode ? 'Sun Mode ON' : 'Sun Mode'}</span>
            </button>

            {/* Profile Avatar / Trigger */}
            <button
              onClick={() => setShowProfileModal(true)}
              className={`px-2 py-1 text-xs font-bold rounded flex items-center gap-1 border ${
                sunlightMode
                  ? 'bg-black text-white border-white'
                  : 'bg-forestgreen text-white border-forestgreen hover:bg-darkgreen'
              }`}
            >
              <User size={14} />
              <span className="max-w-[70px] truncate sm:max-w-none">{profile.role.split(' ')[0]}</span>
            </button>
          </div>
        </div>
      </header>

      {/* QUICK ROLE & REGION STATUS BAR */}
      <div className={`px-3 py-1.5 text-xs border-b ${
        sunlightMode ? 'bg-white text-black border-black font-bold' : 'bg-beige text-darkslategray border-saddlebrown'
      }`}>
        <div className="max-w-2xl mx-auto flex items-center justify-between flex-wrap gap-1">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-black">Active Profile:</span>
            <span className="font-bold underline cursor-pointer" onClick={() => setShowProfileModal(true)}>
              {profile.name} ({profile.role})
            </span>
            <span>•</span>
            <span className="flex items-center gap-0.5">
              <MapPin size={12} /> {profile.district} ({profile.region})
            </span>
          </div>
          <button 
            onClick={() => setShowProfileModal(true)} 
            className="text-[11px] underline font-bold text-saddlebrown hover:text-black"
          >
            Change Role
          </button>
        </div>
      </div>

      {/* NAVIGATION BAR - 3 Main Tabs */}
      <nav className="max-w-2xl mx-auto px-3 pt-3">
        <div className={`grid grid-cols-2 gap-2 p-1 rounded border-2 ${
          sunlightMode ? 'bg-white border-black' : 'bg-ivory border-saddlebrown'
        }`}>
          <button
            onClick={() => { setActiveTab('board'); setDraftListing(null); }}
            className={`py-2 px-3 text-sm font-extrabold rounded flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'board'
                ? (sunlightMode ? 'bg-black text-white' : 'bg-forestgreen text-white shadow-sm')
                : (sunlightMode ? 'text-black hover:bg-gray-100' : 'text-saddlebrown hover:bg-beige')
            }`}
          >
            <Layers size={16} />
            Browse Board ({listings.length})
          </button>

          <button
            onClick={() => setActiveTab('create')}
            className={`py-2 px-3 text-sm font-extrabold rounded flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'create'
                ? (sunlightMode ? 'bg-black text-white' : 'bg-saddlebrown text-cornsilk shadow-sm')
                : (sunlightMode ? 'text-black hover:bg-gray-100' : 'text-saddlebrown hover:bg-beige')
            }`}
          >
            <PlusCircle size={16} />
            Post Coffee / AI
          </button>
        </div>
      </nav>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-2xl mx-auto px-3 pt-3">
        
        {/* ============================================================== */}
        {/* TAB 1: POST / CONVERT INFORMAL COFFEE MESSAGE (AI + MANUAL)    */}
        {/* ============================================================== */}
        {activeTab === 'create' && (
          <div className="space-y-4">
            
            {/* Header / Intro Banner */}
            <div className={`p-3 rounded border-2 ${
              sunlightMode ? 'bg-white border-black' : 'bg-ivory border-saddlebrown'
            }`}>
              <div className="flex items-start gap-2">
                <Sparkles className="text-darkgoldenrod shrink-0 mt-0.5" size={20} />
                <div>
                  <h2 className="font-extrabold text-base leading-snug">
                    AI Listing Extractor (Gemma / Ugandan Standards)
                  </h2>
                  <p className="text-xs text-darkslategray mt-0.5">
                    Paste an informal WhatsApp message, SMS, or trade note. The system converts it into a structured coffee trade listing for free.
                  </p>
                </div>
              </div>

              {/* Acceptance Test Example Pre-fills */}
              <div className="mt-3 pt-2.5 border-t border-dashed border-saddlebrown">
                <span className="text-[11px] font-bold block mb-1">Tap a sample Ugandan message to test:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setInformalInput("I have 300kg kiboko in Masaka, ready in 2 weeks, 4500 per kg")}
                    className="text-left text-xs bg-cornsilk border border-saddlebrown px-2 py-1 rounded font-medium hover:bg-white"
                  >
                    🎯 <strong className="underline">Acceptance Test:</strong> "I have 300kg kiboko in Masaka, ready in 2 weeks, 4500 per kg"
                  </button>
                  <button
                    type="button"
                    onClick={() => setInformalInput("Urgent: Looking to buy 4000kg Arabica parchment in Mbale, willing to pay 12800 ugx per kg cash")}
                    className="text-left text-xs bg-cornsilk border border-saddlebrown px-2 py-1 rounded font-medium hover:bg-white"
                  >
                    📦 Arabica Buyer (Mbale Mt Elgon)
                  </button>
                  <button
                    type="button"
                    onClick={() => setInformalInput("Harvested 1500kg clean Robusta FAQ at farm in Mbarara. Selling at 11200 / kg")}
                    className="text-left text-xs bg-cornsilk border border-saddlebrown px-2 py-1 rounded font-medium hover:bg-white"
                  >
                    🚜 Robusta FAQ Seller (Mbarara)
                  </button>
                </div>
              </div>
            </div>

            {/* Input Box for Informal Text */}
            <div className={`p-3 rounded border-2 space-y-3 ${
              sunlightMode ? 'bg-white border-black' : 'bg-ivory border-saddlebrown'
            }`}>
              <label className="block text-xs font-extrabold uppercase tracking-wide">
                Informal Message / WhatsApp Trade Note:
              </label>
              <textarea
                rows={3}
                value={informalInput}
                onChange={(e) => setInformalInput(e.target.value)}
                placeholder="Example: I have 300kg kiboko in Masaka, ready in 2 weeks, 4500 per kg..."
                className="w-full p-2.5 text-sm rounded border-2 border-saddlebrown bg-white text-black font-mono focus:bg-cornsilk"
              />

              {/* Extraction Feedback Notice */}
              {extractionFeedback && (
                <div className={`p-2.5 rounded text-xs border font-medium ${
                  extractionFeedback.source.includes('Error') || extractionFeedback.source.includes('Manual')
                    ? 'bg-linen text-maroon border-maroon'
                    : 'bg-honeydew text-darkgreen border-darkgreen'
                }`}>
                  <div className="font-bold flex items-center gap-1">
                    <CheckCircle2 size={14} />
                    Engine: {extractionFeedback.source}
                  </div>
                  <div>{extractionFeedback.message}</div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  disabled={isExtracting}
                  onClick={handleAiExtract}
                  className={`flex-1 py-2.5 px-4 font-black rounded text-sm flex items-center justify-center gap-2 border-2 ${
                    sunlightMode 
                      ? 'bg-black text-white border-black hover:bg-gray-900' 
                      : 'bg-forestgreen text-white border-forestgreen hover:bg-darkgreen'
                  } disabled:opacity-50`}
                >
                  {isExtracting ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Structuring with AI...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      Convert with AI
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleStartManual}
                  className={`py-2.5 px-3 font-bold rounded text-xs border-2 ${
                    sunlightMode
                      ? 'bg-white text-black border-black hover:bg-gray-100'
                      : 'bg-linen text-saddlebrown border-saddlebrown hover:bg-beige'
                  }`}
                >
                  Manual Form
                </button>
              </div>
            </div>

            {/* STRUCTURED LISTING REVIEW & CONFIRMATION FORM */}
            {draftListing && (
              <div className={`p-3.5 rounded border-2 space-y-3 ${
                sunlightMode ? 'bg-white border-black' : 'bg-ivory border-darkgoldenrod'
              }`}>
                <div className="flex items-center justify-between pb-2 border-b border-saddlebrown">
                  <div>
                    <h3 className="font-black text-base text-saddlebrown flex items-center gap-1.5">
                      <CheckCircle2 className="text-forestgreen" size={18} />
                      Review & Confirm Structured Listing
                    </h3>
                    <p className="text-[11px] text-darkslategray">
                      Check that variety, grade, district, and price are accurate before posting.
                    </p>
                  </div>
                  <button 
                    onClick={() => setDraftListing(null)}
                    className="text-xs p-1 text-darkslategray hover:text-black font-bold"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Type: Selling vs Buying */}
                  <div>
                    <label className="font-bold block mb-1">Listing Type:</label>
                    <select
                      value={draftListing.type || 'selling'}
                      onChange={(e) => setDraftListing({ ...draftListing, type: e.target.value as ListingType })}
                      className="w-full p-2 rounded border border-saddlebrown bg-white font-bold"
                    >
                      <option value="selling">Selling (Coffee for Sale)</option>
                      <option value="buying">Buying (Coffee Wanted)</option>
                    </select>
                  </div>

                  {/* Variety: Robusta vs Arabica */}
                  <div>
                    <label className="font-bold block mb-1">Coffee Variety:</label>
                    <select
                      value={draftListing.variety || 'Robusta'}
                      onChange={(e) => setDraftListing({ ...draftListing, variety: e.target.value as CoffeeVariety })}
                      className="w-full p-2 rounded border border-saddlebrown bg-white font-bold"
                    >
                      <option value="Robusta">Robusta (Central & Western lowland)</option>
                      <option value="Arabica">Arabica (Elgon, Rwenzori, West Nile)</option>
                      <option value="Mixed/Other">Mixed / Other</option>
                    </select>
                  </div>

                  {/* Grade: Kiboko, FAQ, Parchment, Green Bean */}
                  <div>
                    <label className="font-bold block mb-1">Grade / Form:</label>
                    <select
                      value={draftListing.grade || 'kiboko'}
                      onChange={(e) => setDraftListing({ ...draftListing, grade: e.target.value as CoffeeGrade })}
                      className="w-full p-2 rounded border border-saddlebrown bg-white font-bold"
                    >
                      <option value="kiboko">kiboko (dry cherry)</option>
                      <option value="FAQ">FAQ (fair average quality)</option>
                      <option value="parchment">parchment (washed Arabica)</option>
                      <option value="green bean">green bean (sorted)</option>
                      <option value="other">other</option>
                    </select>
                  </div>

                  {/* Region: Central, Western, Eastern, Northern */}
                  <div>
                    <label className="font-bold block mb-1">Region:</label>
                    <select
                      value={draftListing.region || 'Central'}
                      onChange={(e) => {
                        const newReg = e.target.value as UgandaRegion;
                        const defaultDist = UGANDA_REGIONS[newReg]?.[0] || 'Masaka';
                        setDraftListing({ ...draftListing, region: newReg, district: defaultDist });
                      }}
                      className="w-full p-2 rounded border border-saddlebrown bg-white font-bold"
                    >
                      <option value="Central">Central (Masaka, Luwero, Mubende)</option>
                      <option value="Western">Western (Mbarara, Kasese, Bushenyi)</option>
                      <option value="Eastern">Eastern (Mbale, Kapchorwa, Elgon)</option>
                      <option value="Northern">Northern (Arua, Nebbi, West Nile)</option>
                    </select>
                  </div>

                  {/* District */}
                  <div>
                    <label className="font-bold block mb-1">District:</label>
                    <input
                      type="text"
                      value={draftListing.district || ''}
                      onChange={(e) => {
                        const dist = e.target.value;
                        const distLower = dist.toLowerCase();
                        let reg = draftListing.region || 'Central';
                        if (POPULAR_DISTRICT_REGIONS[distLower]) {
                          reg = POPULAR_DISTRICT_REGIONS[distLower].region;
                        }
                        setDraftListing({ ...draftListing, district: dist, region: reg });
                      }}
                      placeholder="e.g. Masaka, Mbale, Kasese..."
                      className="w-full p-2 rounded border border-saddlebrown bg-white font-semibold"
                    />
                  </div>

                  {/* Quantity (KG) */}
                  <div>
                    <label className="font-bold block mb-1">Quantity (kg):</label>
                    <input
                      type="number"
                      min={1}
                      value={draftListing.quantity_kg ?? ''}
                      onChange={(e) => setDraftListing({ ...draftListing, quantity_kg: Number(e.target.value) })}
                      placeholder="e.g. 300"
                      className="w-full p-2 rounded border border-saddlebrown bg-white font-bold"
                    />
                  </div>

                  {/* Price (UGX per kg) */}
                  <div className="sm:col-span-2">
                    <label className="font-bold block mb-1">Price (UGX per kg):</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={100}
                        step={50}
                        value={draftListing.price_ugx_per_kg ?? ''}
                        onChange={(e) => setDraftListing({ ...draftListing, price_ugx_per_kg: Number(e.target.value) })}
                        placeholder="e.g. 4500"
                        className="w-full p-2 rounded border border-saddlebrown bg-white font-bold text-base"
                      />
                      <span className="text-xs font-bold text-darkslategray whitespace-nowrap">UGX / kg</span>
                    </div>

                    {/* Calculated Total Batch Value */}
                    {draftListing.quantity_kg && draftListing.price_ugx_per_kg && (
                      <div className="mt-1.5 p-1.5 bg-cornsilk border border-saddlebrown rounded text-xs flex justify-between font-bold">
                        <span>Estimated Total Value:</span>
                        <span className="text-forestgreen">
                          UGX {(draftListing.quantity_kg * draftListing.price_ugx_per_kg).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Notes / Special Instructions */}
                  <div className="sm:col-span-2">
                    <label className="font-bold block mb-1">Trade Notes / Timing:</label>
                    <textarea
                      rows={2}
                      value={draftListing.notes || ''}
                      onChange={(e) => setDraftListing({ ...draftListing, notes: e.target.value })}
                      placeholder="e.g. Ready in 2 weeks, sun-dried on tarpaulins, moisture tested below 13%..."
                      className="w-full p-2 rounded border border-saddlebrown bg-white text-xs"
                    />
                  </div>

                  {/* Contact Summary (Read from profile) */}
                  <div className="sm:col-span-2 p-2 bg-linen border border-saddlebrown rounded text-xs">
                    <span className="font-bold block text-saddlebrown">Contact Details Attached to Listing:</span>
                    <div className="text-darkslategray mt-0.5">
                      {profile.name} • {profile.phone} • {profile.momo_network}
                    </div>
                    <span className="text-[10px] text-darkslategray italic block mt-0.5">
                      (🔒 Protected: Phone stays masked on the board until another user clicks "Express interest")
                    </span>
                  </div>
                </div>

                {/* Final Save Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSaveListing}
                    className={`w-full py-3 px-4 font-black rounded text-sm border-2 ${
                      sunlightMode
                        ? 'bg-black text-white border-black hover:bg-gray-900'
                        : 'bg-forestgreen text-white border-darkgreen hover:bg-darkgreen'
                    }`}
                  >
                    Confirm & Post Listing to Board
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: BROWSE & FILTER LISTINGS BOARD                          */}
        {/* ============================================================== */}
        {activeTab === 'board' && (
          <div className="space-y-3">
            
            {/* Filter Bar - Mobile-First & High Contrast */}
            <div className={`p-3 rounded border-2 space-y-2.5 ${
              sunlightMode ? 'bg-white border-black' : 'bg-ivory border-saddlebrown'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1 text-saddlebrown">
                  <Filter size={14} /> Filter Coffee Listings
                </span>
                {(filterType !== 'all' || filterRegion !== 'all' || filterVariety !== 'all' || filterGrade !== 'all' || searchDistrict) && (
                  <button
                    onClick={() => {
                      setFilterType('all');
                      setFilterRegion('all');
                      setFilterVariety('all');
                      setFilterGrade('all');
                      setSearchDistrict('');
                    }}
                    className="text-xs underline font-bold text-maroon hover:text-black"
                  >
                    Reset Filters
                  </button>
                )}
              </div>

              {/* Quick Type Tabs: All, Selling, Buying */}
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: 'all', label: 'All Listings' },
                  { id: 'selling', label: '🟢 For Sale' },
                  { id: 'buying', label: '🔴 Coffee Wanted' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterType(tab.id)}
                    className={`py-1.5 px-2 text-xs font-black rounded border ${
                      filterType === tab.id
                        ? (sunlightMode ? 'bg-black text-white border-black' : 'bg-saddlebrown text-white border-saddlebrown')
                        : (sunlightMode ? 'bg-white text-black border-black' : 'bg-cornsilk text-black border-saddlebrown hover:bg-beige')
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Secondary Select Dropdowns: Region, Variety, Grade */}
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {/* Region */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-darkslategray mb-0.5">Region:</label>
                  <select
                    value={filterRegion}
                    onChange={(e) => setFilterRegion(e.target.value)}
                    className="w-full p-1.5 rounded border border-saddlebrown bg-white text-black font-semibold text-xs"
                  >
                    <option value="all">All Regions</option>
                    <option value="Central">Central</option>
                    <option value="Western">Western</option>
                    <option value="Eastern">Eastern</option>
                    <option value="Northern">Northern</option>
                  </select>
                </div>

                {/* Variety */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-darkslategray mb-0.5">Variety:</label>
                  <select
                    value={filterVariety}
                    onChange={(e) => setFilterVariety(e.target.value)}
                    className="w-full p-1.5 rounded border border-saddlebrown bg-white text-black font-semibold text-xs"
                  >
                    <option value="all">All Varieties</option>
                    <option value="Robusta">Robusta</option>
                    <option value="Arabica">Arabica</option>
                  </select>
                </div>

                {/* Grade */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-darkslategray mb-0.5">Grade:</label>
                  <select
                    value={filterGrade}
                    onChange={(e) => setFilterGrade(e.target.value)}
                    className="w-full p-1.5 rounded border border-saddlebrown bg-white text-black font-semibold text-xs"
                  >
                    <option value="all">All Grades</option>
                    <option value="kiboko">kiboko (dry cherry)</option>
                    <option value="FAQ">FAQ (fair average)</option>
                    <option value="parchment">parchment</option>
                    <option value="green bean">green bean</option>
                  </select>
                </div>
              </div>

              {/* District / Text Search */}
              <div>
                <input
                  type="text"
                  value={searchDistrict}
                  onChange={(e) => setSearchDistrict(e.target.value)}
                  placeholder="Search district, road, or cooperative (e.g. Masaka, Mbale, Bukakata)..."
                  className="w-full p-2 text-xs rounded border border-saddlebrown bg-white text-black font-medium"
                />
              </div>
            </div>

            {/* Results Header Count */}
            <div className="flex items-center justify-between text-xs px-1 font-bold text-darkslategray">
              <span>Showing {filteredListings.length} of {listings.length} listings</span>
              <span>Updated live in UGX</span>
            </div>

            {/* LISTINGS BOARD CARDS */}
            {filteredListings.length === 0 ? (
              <div className={`p-8 text-center rounded border-2 border-dashed ${
                sunlightMode ? 'bg-white border-black' : 'bg-ivory border-saddlebrown'
              }`}>
                <p className="font-extrabold text-base mb-1">No coffee listings match these filters.</p>
                <p className="text-xs text-darkslategray mb-3">
                  Try adjusting the region or variety, or post a new listing.
                </p>
                <button
                  onClick={() => {
                    setFilterType('all');
                    setFilterRegion('all');
                    setFilterVariety('all');
                    setFilterGrade('all');
                    setSearchDistrict('');
                  }}
                  className="px-3 py-1.5 bg-saddlebrown text-white text-xs font-bold rounded"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredListings.map((item) => {
                  const isContactRevealed = !!revealedContacts[item.id];
                  const totalEst = item.quantity_kg * item.price_ugx_per_kg;

                  return (
                    <div
                      key={item.id}
                      className={`coffee-card p-3.5 rounded border-2 transition-all ${
                        sunlightMode 
                          ? 'bg-white border-black' 
                          : 'bg-ivory border-saddlebrown hover:border-darkgoldenrod'
                      }`}
                    >
                      {/* Top Header of Card: Type Badge, Role, Date */}
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <div className="flex items-center gap-1.5">
                          {item.type === 'selling' ? (
                            <span className="badge-sell text-[11px] font-black uppercase px-2 py-0.5 rounded bg-darkgreen text-white">
                              🟢 Coffee for Sale
                            </span>
                          ) : (
                            <span className="badge-buy text-[11px] font-black uppercase px-2 py-0.5 rounded bg-maroon text-white">
                              🔴 Wanted to Buy
                            </span>
                          )}

                          <span className="text-[11px] font-bold text-darkslategray bg-linen px-1.5 py-0.5 rounded border border-saddlebrown">
                            {item.role}
                          </span>
                        </div>

                        <span className="text-[10px] text-darkslategray font-medium">
                          {item.district} ({item.region})
                        </span>
                      </div>

                      {/* Main Title & Key Specs */}
                      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 pb-2 border-b border-dashed border-saddlebrown">
                        <div>
                          <h3 className="font-black text-lg text-black leading-tight">
                            {item.quantity_kg.toLocaleString()} kg • {item.variety} ({item.grade})
                          </h3>
                          <div className="text-xs text-darkslategray font-medium flex items-center gap-1 mt-0.5">
                            <MapPin size={13} className="text-forestgreen" />
                            <strong>{item.district} District</strong>, {item.region} Uganda
                          </div>
                        </div>

                        {/* Price Tag */}
                        <div className="sm:text-right mt-1 sm:mt-0">
                          <div className="text-lg font-black text-saddlebrown">
                            UGX {item.price_ugx_per_kg.toLocaleString()}{' '}
                            <span className="text-xs font-normal text-black">/ kg</span>
                          </div>
                          <div className="text-[11px] font-bold text-forestgreen">
                            Lot Value: ~UGX {totalEst.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {/* Notes / Description */}
                      {item.notes && (
                        <p className="text-xs text-black mt-2 font-medium bg-cornsilk p-2 rounded border border-beige">
                          "{item.notes}"
                        </p>
                      )}

                      {/* CONTACT SECTION - Strictly Hidden Until "Express Interest" is Clicked */}
                      <div className="mt-3 pt-2">
                        {!isContactRevealed ? (
                          <div className="bg-linen p-2.5 rounded border border-saddlebrown flex flex-col sm:flex-row items-center justify-between gap-2">
                            <div className="text-xs">
                              <span className="font-bold text-black block">
                                Poster: {item.contact.name}
                              </span>
                              <span className="text-[11px] text-darkslategray">
                                Payment: {item.contact.momo_network || 'Mobile Money'}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleExpressInterest(item.id, item.contact.name)}
                              className={`w-full sm:w-auto px-4 py-2 font-black rounded text-xs flex items-center justify-center gap-1.5 border-2 ${
                                sunlightMode
                                  ? 'bg-black text-white border-black hover:bg-gray-800'
                                  : 'bg-forestgreen text-white border-darkgreen hover:bg-darkgreen'
                              }`}
                            >
                              <Phone size={14} />
                              Express Interest & Reveal Contact
                            </button>
                          </div>
                        ) : (
                          /* REVEALED CONTACT DETAILS */
                          <div className={`p-3 rounded border-2 ${
                            sunlightMode ? 'bg-white border-black' : 'bg-honeydew border-darkgreen'
                          }`}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-1 text-xs font-bold text-darkgreen">
                                <CheckCircle2 size={16} />
                                <span>Contact Details Revealed</span>
                              </div>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-darkgreen text-white">
                                {item.contact.momo_network || 'Mobile Money'}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-darkslategray block text-[10px]">Contact Person:</span>
                                <span className="font-bold text-sm text-black">{item.contact.name}</span>
                              </div>
                              <div>
                                <span className="text-darkslategray block text-[10px]">Phone / Mobile Money:</span>
                                <span className="font-mono font-black text-base text-saddlebrown">{item.contact.phone}</span>
                              </div>
                            </div>

                            {/* Direct Connect Buttons: Tel & WhatsApp */}
                            <div className="mt-2.5 pt-2 border-t border-forestgreen flex gap-2">
                              <a
                                href={`tel:${item.contact.phone.replace(/\s+/g, '')}`}
                                className="flex-1 py-2 text-center text-xs font-black rounded bg-forestgreen text-white border border-darkgreen flex items-center justify-center gap-1.5"
                              >
                                <Phone size={13} />
                                Call Directly
                              </a>
                              <a
                                href={`https://wa.me/${item.contact.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 py-2 text-center text-xs font-black rounded bg-saddlebrown text-white border border-black flex items-center justify-center gap-1.5"
                              >
                                <MessageSquare size={13} />
                                WhatsApp
                              </a>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom Reset Data Link for Testing */}
            <div className="pt-4 pb-2 text-center">
              <button
                type="button"
                onClick={handleResetData}
                className="text-xs text-darkslategray underline hover:text-black font-semibold"
              >
                Reset board to original 8 Ugandan mock listings
              </button>
            </div>

          </div>
        )}

      </main>

      {/* ============================================================== */}
      {/* ROLE SELECTION & SIMPLE PROFILE MODAL                         */}
      {/* ============================================================== */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3">
          <div className={`w-full max-w-md rounded-lg border-2 p-4 max-h-[90vh] overflow-y-auto ${
            sunlightMode ? 'bg-white text-black border-black' : 'bg-ivory text-black border-saddlebrown'
          }`}>
            <div className="flex items-center justify-between pb-2 border-b border-saddlebrown">
              <div className="flex items-center gap-1.5">
                <User className="text-saddlebrown" size={20} />
                <h2 className="font-black text-base">Your KawaLink Profile</h2>
              </div>
              <button 
                onClick={() => setShowProfileModal(false)}
                className="p-1 text-darkslategray hover:text-black font-bold"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-darkslategray my-2">
              Select your role in the Ugandan coffee value chain. Your contact details will automatically be attached to your listings.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setShowProfileModal(false);
                showToast(`Profile updated as ${profile.role} in ${profile.district}!`);
              }}
              className="space-y-3 text-xs"
            >
              {/* Role Selection */}
              <div>
                <label className="font-extrabold block mb-1">Select Value Chain Role:</label>
                <select
                  value={profile.role}
                  onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                  className="w-full p-2 rounded border border-saddlebrown bg-white font-bold text-sm"
                >
                  <option value="Farmer / Smallholder">Farmer / Smallholder (Coffee Grower)</option>
                  <option value="Coffee Buyer / Exporter">Coffee Buyer / Exporter</option>
                  <option value="Cooperative Union">Cooperative Union / Society</option>
                  <option value="Trader / Aggregator">Trader / Middleman / Aggregator</option>
                  <option value="Input / Equipment Supplier">Input / Equipment Supplier</option>
                  <option value="Extension Officer">Extension Officer / Agronomist</option>
                  <option value="Stakeholder / NGO">Stakeholder / NGO / Certifier</option>
                </select>
              </div>

              {/* Name / Business Handle */}
              <div>
                <label className="font-extrabold block mb-1">Name or Trader Handle:</label>
                <input
                  type="text"
                  required
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  placeholder="e.g. Masaka Coffee Grower #14"
                  className="w-full p-2 rounded border border-saddlebrown bg-white font-semibold"
                />
              </div>

              {/* Region */}
              <div>
                <label className="font-extrabold block mb-1">Region:</label>
                <select
                  value={profile.region}
                  onChange={(e) => {
                    const newReg = e.target.value as UgandaRegion;
                    const defaultDist = UGANDA_REGIONS[newReg]?.[0] || 'Masaka';
                    setProfile({ ...profile, region: newReg, district: defaultDist });
                  }}
                  className="w-full p-2 rounded border border-saddlebrown bg-white font-bold"
                >
                  <option value="Central">Central (Masaka, Luwero, Mukono, Kampala)</option>
                  <option value="Western">Western (Mbarara, Kasese, Bushenyi)</option>
                  <option value="Eastern">Eastern (Mbale, Kapchorwa, Mt Elgon)</option>
                  <option value="Northern">Northern (Arua, Nebbi, West Nile)</option>
                </select>
              </div>

              {/* District */}
              <div>
                <label className="font-extrabold block mb-1">District:</label>
                <input
                  type="text"
                  required
                  value={profile.district}
                  onChange={(e) => setProfile({ ...profile, district: e.target.value })}
                  placeholder="e.g. Masaka, Mbale, Kasese, Arua..."
                  className="w-full p-2 rounded border border-saddlebrown bg-white font-semibold"
                />
              </div>

              {/* Phone / Mobile Money Number */}
              <div>
                <label className="font-extrabold block mb-1">Phone Number (Calls & WhatsApp):</label>
                <input
                  type="tel"
                  required
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="+256 772 000 000"
                  className="w-full p-2 rounded border border-saddlebrown bg-white font-mono font-bold"
                />
              </div>

              {/* Mobile Money Provider */}
              <div>
                <label className="font-extrabold block mb-1">Primary Mobile Money Network:</label>
                <select
                  value={profile.momo_network}
                  onChange={(e) => setProfile({ ...profile, momo_network: e.target.value as any })}
                  className="w-full p-2 rounded border border-saddlebrown bg-white font-bold"
                >
                  <option value="MTN MoMo">MTN MoMo</option>
                  <option value="Airtel Money">Airtel Money</option>
                  <option value="Both">Both MTN & Airtel</option>
                  <option value="Cash / Bank">Cash / Bank Transfer</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className={`w-full py-2.5 font-black rounded text-sm border-2 ${
                    sunlightMode 
                      ? 'bg-black text-white border-black' 
                      : 'bg-forestgreen text-white border-darkgreen hover:bg-darkgreen'
                  }`}
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="max-w-2xl mx-auto px-3 mt-8 pt-4 border-t border-saddlebrown text-[11px] text-darkslategray flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>
          <span className="font-bold text-saddlebrown">KawaLink Uganda</span> • Low-bandwidth coffee trading protocol
        </div>
        <div className="flex items-center gap-2">
          <span>⚡ High-Contrast Sunlight Safe</span>
          <span>•</span>
          <span>🔒 Protected Contacts</span>
        </div>
      </footer>

    </div>
  );
}
