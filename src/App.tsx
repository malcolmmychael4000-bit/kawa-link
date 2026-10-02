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
  CheckCircle2, 
  Sparkles, 
  Filter, 
  PlusCircle, 
  User, 
  RefreshCw, 
  Layers, 
  X, 
  Search, 
  ShieldAlert, 
  ArrowUpDown, 
  Trash2, 
  Edit3, 
  Home, 
  ListFilter, 
  Check, 
  AlertTriangle,
  Scale,
  Calendar,
  DollarSign
} from 'lucide-react';

const STORAGE_LISTINGS_KEY = 'kawalink_listings_v1';
const STORAGE_PROFILE_KEY = 'kawalink_user_profile_v1';
const STORAGE_REVEALED_KEY = 'kawalink_revealed_contacts_v1';
const STORAGE_ONBOARDED_KEY = 'kawalink_onboarded_v1';

// Role Definitions for Welcome / Profile
const ROLE_OPTIONS = [
  {
    id: 'Farmer / Smallholder',
    title: 'Farmer / Smallholder',
    icon: '🌾',
    desc: 'I grow and harvest coffee cherries (Robusta or Arabica)'
  },
  {
    id: 'Cooperative Union',
    title: 'Cooperative / Society',
    icon: '🏢',
    desc: 'We aggregate, mill, and trade coffee on behalf of members'
  },
  {
    id: 'Coffee Buyer / Exporter',
    title: 'Coffee Buyer / Exporter',
    icon: '📦',
    desc: 'I source Kiboko, FAQ, parchment, or green beans for local or export trade'
  },
  {
    id: 'Input / Equipment Supplier',
    title: 'Input / Equipment Supplier',
    icon: '🚜',
    desc: 'I provide seedlings, organic fertilizer, tarpaulins, or hulling machinery'
  },
  {
    id: 'Extension Officer',
    title: 'Extension Officer / NGO',
    icon: '🔬',
    desc: 'I provide agronomic advice, GAP training, quality certification, and support'
  }
];

export default function App() {
  // --- Persistent State ---
  const [listings, setListings] = useState<CoffeeListing[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_LISTINGS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_MOCK_LISTINGS;
  });

  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PROFILE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {
      name: 'Masaka Coffee Grower 14',
      role: 'Farmer / Smallholder',
      district: 'Masaka',
      region: 'Central',
      phone: '+256 772 123 456',
      momo_network: 'MTN MoMo',
      is_registered: true
    };
  });

  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_ONBOARDED_KEY) === 'true';
  });

  const [revealedContacts, setRevealedContacts] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_REVEALED_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {};
  });

  // --- Active Navigation Tab: 4 items (Home, Post, My Listings, Profile) ---
  const [activeTab, setActiveTab] = useState<'home' | 'post' | 'my-listings' | 'profile'>('home');

  // --- Filtering & Sorting State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'selling' | 'buying'>('all');
  const [filterRegion, setFilterRegion] = useState<string>('all');
  const [filterVariety, setFilterVariety] = useState<string>('all');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc' | 'qty-desc'>('newest');

  // --- Post / AI Extraction State ---
  const [informalMessage, setInformalMessage] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [draftListing, setDraftListing] = useState<Partial<CoffeeListing> | null>(null);
  const [isManualForm, setIsManualForm] = useState(false);

  // --- Toast Notification ---
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_LISTINGS_KEY, JSON.stringify(listings));
  }, [listings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem(STORAGE_REVEALED_KEY, JSON.stringify(revealedContacts));
  }, [revealedContacts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_ONBOARDED_KEY, String(hasCompletedOnboarding));
  }, [hasCompletedOnboarding]);

  // Reveal Contact handler
  const handleExpressInterest = (id: string, name: string) => {
    setRevealedContacts(prev => ({ ...prev, [id]: true }));
    showToast(`Contact revealed for ${name}! Please verify quality before sending Mobile Money.`, 'info');
  };

  // AI Extraction handler
  const handleExtractMessage = async (textToExtract?: string) => {
    const raw = (textToExtract || informalMessage).trim();
    if (!raw) {
      showToast('Please paste a message first.', 'error');
      return;
    }

    setIsExtracting(true);
    setExtractionError(null);

    try {
      const result: ExtractionResult = await extractListingFromText(
        raw,
        {
          name: profile.name,
          phone: profile.phone,
          momo_network: profile.momo_network,
          whatsapp: profile.phone
        },
        profile.role,
        'gemma-4-26b-a4b-it'
      );

      if (result.success && result.listing) {
        setDraftListing({
          ...result.listing,
          contact: {
            name: profile.name || 'Coffee Trader',
            phone: profile.phone || '+256 770 000 000',
            momo_network: profile.momo_network || 'MTN MoMo',
            whatsapp: profile.phone || '+256 770 000 000'
          }
        });
        setIsManualForm(false);
      } else {
        setExtractionError(result.errorMessage || 'AI extraction could not structure text.');
        setIsManualForm(true);
      }
    } catch (err: any) {
      setExtractionError('Extraction could not connect. You can review or fill fields manually below.');
      setIsManualForm(true);
    } finally {
      setIsExtracting(false);
    }
  };

  // Initialize empty manual form
  const handleOpenManualForm = () => {
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
    setIsManualForm(true);
  };

  // Publish listing
  const handlePublishListing = () => {
    if (!draftListing) return;

    if (!draftListing.quantity_kg || draftListing.quantity_kg <= 0) {
      showToast('Please enter a valid quantity in kg.', 'error');
      return;
    }
    if (!draftListing.price_ugx_per_kg || draftListing.price_ugx_per_kg <= 0) {
      showToast('Please enter a valid price in UGX per kg.', 'error');
      return;
    }
    if (!draftListing.district) {
      showToast('Please specify a district.', 'error');
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
      notes: draftListing.notes || 'Posted on KawaLink Uganda',
      created_at: new Date().toISOString(),
      verified_farmer: profile.role.includes('Farmer')
    };

    setListings([newListing, ...listings]);
    setDraftListing(null);
    setInformalMessage('');
    setActiveTab('home');
    showToast('Listing posted successfully to KawaLink board!');
  };

  // Delete own listing
  const handleDeleteListing = (id: string) => {
    if (confirm('Are you sure you want to remove this listing?')) {
      setListings(listings.filter(l => l.id !== id));
      showToast('Listing removed.');
    }
  };

  // Filter & Sort computations
  const filteredListings = useMemo(() => {
    return listings
      .filter(item => {
        if (filterType !== 'all' && item.type !== filterType) return false;
        if (filterRegion !== 'all' && item.region !== filterRegion) return false;
        if (filterVariety !== 'all' && item.variety !== filterVariety) return false;
        if (filterGrade !== 'all' && item.grade !== filterGrade) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchDist = item.district.toLowerCase().includes(q);
          const matchNotes = item.notes.toLowerCase().includes(q);
          const matchRole = item.role.toLowerCase().includes(q);
          if (!matchDist && !matchNotes && !matchRole) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.price_ugx_per_kg - b.price_ugx_per_kg;
        if (sortBy === 'price-desc') return b.price_ugx_per_kg - a.price_ugx_per_kg;
        if (sortBy === 'qty-desc') return b.quantity_kg - a.quantity_kg;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [listings, filterType, filterRegion, filterVariety, filterGrade, searchQuery, sortBy]);

  // My listings computation
  const myListings = useMemo(() => {
    return listings.filter(item => item.contact.phone === profile.phone || item.contact.name === profile.name);
  }, [listings, profile]);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-canvas)] text-[var(--color-text-primary)]">
      
      {/* Toast Alert */}
      {toast && (
        <div 
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-md shadow-lg border-2 text-sm font-bold max-w-[92vw] text-center flex items-center gap-2"
          style={{
            backgroundColor: toast.type === 'error' ? 'var(--color-danger)' : 'var(--color-brand-primary)',
            color: 'var(--color-text-inverse)',
            borderColor: 'var(--color-accent-amber)'
          }}
        >
          {toast.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* TOP HEADER */}
      <header className="sticky top-0 z-40 bg-[var(--color-brand-primary)] text-[var(--color-text-inverse)] border-b-2 border-[var(--color-accent-amber)] px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2">
          {/* Logo & Subtitle */}
          <div 
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => setActiveTab('home')}
          >
            <div className="w-10 h-10 rounded-md bg-[var(--color-surface)] text-[var(--color-brand-primary)] flex items-center justify-center font-black text-xl border border-[var(--color-accent-amber)]">
              ☕
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight leading-none">KawaLink</span>
                <span className="badge-sell text-[10px] px-1.5 py-0.5">Uganda</span>
              </div>
              <p className="text-xs text-[var(--color-surface-subtle)] opacity-90 mt-0.5 leading-tight">
                Coffee Marketplace • Mobile-First
              </p>
            </div>
          </div>

          {/* User Role Badge */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('profile')}
              className="text-xs font-bold px-3 py-1.5 rounded-md border border-[var(--color-surface-subtle)] bg-[var(--color-action-active)] hover:bg-[var(--color-action-primary)] text-white flex items-center gap-1.5"
            >
              <User size={14} />
              <span className="max-w-[100px] truncate">{profile.role.split(' ')[0]}</span>
            </button>
          </div>
        </div>
      </header>

      {/* SUB-HEADER: Active District & UCDA Pricing Benchmark Bar */}
      <div className="bg-[var(--color-surface-subtle)] border-b border-[var(--color-border-subtle)] px-4 py-2 text-xs">
        <div className="max-w-3xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1 font-semibold text-[var(--color-text-secondary)]">
            <MapPin size={13} className="text-[var(--color-brand-primary)]" />
            <span>Market Region: <strong className="text-black">{profile.district} ({profile.region})</strong></span>
          </div>
          <div className="text-[11px] font-bold text-[var(--color-brand-primary)] flex items-center gap-1">
            <span>UCDA Benchmark: Robusta Kiboko ~4,500 UGX • FAQ ~11,500 UGX</span>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT CONTAINER */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-3 sm:p-4 pb-24">
        
        {/* ============================================================== */}
        {/* SCREEN 1: WELCOME & ROLE SELECTION (FIRST RUN OR PROFILE TAB) */}
        {/* ============================================================== */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            <div className="card-highland">
              <h2 className="font-extrabold text-xl mb-1 text-[var(--color-brand-primary)]">
                {hasCompletedOnboarding ? 'Edit Your Profile' : 'Welcome to KawaLink Uganda'}
              </h2>
              <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                Choose your role in the coffee value chain. Your contact details remain protected and are only shown when another user expresses interest.
              </p>

              {/* 5 Friendly Role Selection Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5">
                {ROLE_OPTIONS.map((roleOpt) => {
                  const isSelected = profile.role === roleOpt.id;
                  return (
                    <div
                      key={roleOpt.id}
                      onClick={() => setProfile({ ...profile, role: roleOpt.id })}
                      className={`p-3.5 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-[var(--color-brand-primary)] bg-[var(--color-surface-subtle)] shadow-sm' 
                          : 'border-[var(--color-border-subtle)] bg-[var(--color-surface)] hover:border-[var(--color-brand-primary)]'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">{roleOpt.icon}</span>
                        <span className="font-black text-base">{roleOpt.title}</span>
                        {isSelected && <Check className="ml-auto text-[var(--color-brand-primary)] stroke-[3]" size={18} />}
                      </div>
                      <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                        {roleOpt.desc}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Simple Profile Form */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  setHasCompletedOnboarding(true);
                  setActiveTab('home');
                  showToast('Profile saved! You can now browse and post on the board.');
                }}
                className="space-y-3.5 pt-3 border-t border-[var(--color-border-subtle)]"
              >
                <div>
                  <label className="block text-xs font-black uppercase mb-1">
                    Your Name or Cooperative Handle:
                  </label>
                  <input
                    type="text"
                    required
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    placeholder="e.g. Masaka Coffee Grower 14"
                    className="w-full p-3 rounded-md border-2 border-[var(--color-border)] bg-white text-base font-semibold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase mb-1">
                      Region in Uganda:
                    </label>
                    <select
                      value={profile.region}
                      onChange={(e) => {
                        const newReg = e.target.value as UgandaRegion;
                        const defaultDist = UGANDA_REGIONS[newReg]?.[0] || 'Masaka';
                        setProfile({ ...profile, region: newReg, district: defaultDist });
                      }}
                      className="w-full p-3 rounded-md border-2 border-[var(--color-border)] bg-white text-base font-bold"
                    >
                      <option value="Central">Central (Masaka, Luwero, Mukono)</option>
                      <option value="Western">Western (Mbarara, Kasese, Bushenyi)</option>
                      <option value="Eastern">Eastern (Mbale, Kapchorwa, Mt Elgon)</option>
                      <option value="Northern">Northern (Arua, Nebbi, West Nile)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase mb-1">
                      District:
                    </label>
                    <input
                      type="text"
                      required
                      value={profile.district}
                      onChange={(e) => setProfile({ ...profile, district: e.target.value })}
                      placeholder="e.g. Masaka, Mbale, Kasese..."
                      className="w-full p-3 rounded-md border-2 border-[var(--color-border)] bg-white text-base font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase mb-1">
                      Phone Number (Calls & WhatsApp):
                    </label>
                    <input
                      type="tel"
                      required
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      placeholder="+256 772 000 000"
                      className="w-full p-3 rounded-md border-2 border-[var(--color-border)] bg-white font-mono text-base font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase mb-1">
                      Mobile Money Network:
                    </label>
                    <select
                      value={profile.momo_network}
                      onChange={(e) => setProfile({ ...profile, momo_network: e.target.value as any })}
                      className="w-full p-3 rounded-md border-2 border-[var(--color-border)] bg-white text-base font-bold"
                    >
                      <option value="MTN MoMo">MTN MoMo</option>
                      <option value="Airtel Money">Airtel Money</option>
                      <option value="Both">Both MTN & Airtel</option>
                      <option value="Cash / Bank">Cash / Bank Transfer</option>
                    </select>
                  </div>
                </div>

                <p className="text-xs text-[var(--color-text-secondary)] italic">
                  🔒 Helper note: Your phone number is never shown publicly to protect you from spam. Buyers or sellers only reveal it when clicking "Express interest".
                </p>

                {/* Primary Action Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    className="btn-primary w-full text-base"
                  >
                    Save Profile & Enter Marketplace
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SCREEN 2 & 4: HOME / LISTINGS BOARD & CONTACT REVEAL          */}
        {/* ============================================================== */}
        {activeTab === 'home' && (
          <div className="space-y-4">
            
            {/* Filter & Search Bar */}
            <div className="card-highland space-y-3">
              {/* Search text input */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search district, road, or cooperative (e.g. Masaka, Mbale)..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-md border-2 border-[var(--color-border)] bg-white text-base"
                />
                <Search size={18} className="absolute left-3 top-3.5 text-[var(--color-text-secondary)]" />
              </div>

              {/* Quick Type Chips: All, Selling, Buying */}
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'all', label: 'All Listings' },
                  { id: 'selling', label: '🟢 For Sale' },
                  { id: 'buying', label: '🔴 Wanted' }
                ].map(typeTab => (
                  <button
                    key={typeTab.id}
                    onClick={() => setFilterType(typeTab.id as any)}
                    className={`py-2 px-2 text-xs font-black rounded-md border-2 transition-all ${
                      filterType === typeTab.id
                        ? 'bg-[var(--color-brand-primary)] text-white border-[var(--color-brand-primary)]'
                        : 'bg-white text-black border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-subtle)]'
                    }`}
                  >
                    {typeTab.label}
                  </button>
                ))}
              </div>

              {/* Dropdown Filters: Region, Variety, Grade, Sort */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[var(--color-text-secondary)] mb-0.5">Region:</label>
                  <select
                    value={filterRegion}
                    onChange={(e) => setFilterRegion(e.target.value)}
                    className="w-full p-2 rounded-md border border-[var(--color-border)] bg-white font-semibold"
                  >
                    <option value="all">All Regions</option>
                    <option value="Central">Central</option>
                    <option value="Western">Western</option>
                    <option value="Eastern">Eastern</option>
                    <option value="Northern">Northern</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-[var(--color-text-secondary)] mb-0.5">Variety:</label>
                  <select
                    value={filterVariety}
                    onChange={(e) => setFilterVariety(e.target.value)}
                    className="w-full p-2 rounded-md border border-[var(--color-border)] bg-white font-semibold"
                  >
                    <option value="all">All Varieties</option>
                    <option value="Robusta">Robusta</option>
                    <option value="Arabica">Arabica</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-[var(--color-text-secondary)] mb-0.5">Grade:</label>
                  <select
                    value={filterGrade}
                    onChange={(e) => setFilterGrade(e.target.value)}
                    className="w-full p-2 rounded-md border border-[var(--color-border)] bg-white font-semibold"
                  >
                    <option value="all">All Grades</option>
                    <option value="kiboko">kiboko (dry cherry)</option>
                    <option value="FAQ">FAQ (fair average)</option>
                    <option value="parchment">parchment</option>
                    <option value="green bean">green bean</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-[var(--color-text-secondary)] mb-0.5">Sort by:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full p-2 rounded-md border border-[var(--color-border)] bg-white font-semibold"
                  >
                    <option value="newest">Newest first</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="qty-desc">Quantity: High to Low</option>
                  </select>
                </div>
              </div>

              {/* Reset link if filters active */}
              {(filterType !== 'all' || filterRegion !== 'all' || filterVariety !== 'all' || filterGrade !== 'all' || searchQuery) && (
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => {
                      setFilterType('all');
                      setFilterRegion('all');
                      setFilterVariety('all');
                      setFilterGrade('all');
                      setSearchQuery('');
                      setSortBy('newest');
                    }}
                    className="text-xs font-bold text-[var(--color-danger)] underline cursor-pointer"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>

            {/* Results Count Summary */}
            <div className="flex items-center justify-between text-xs px-1 font-bold text-[var(--color-text-secondary)]">
              <span>Showing {filteredListings.length} of {listings.length} listings</span>
              <span>All prices in UGX / kg</span>
            </div>

            {/* SYSTEM STATE: EMPTY STATE */}
            {filteredListings.length === 0 && (
              <div className="card-highland text-center py-10 px-4">
                <div className="text-4xl mb-2">🌱</div>
                <h3 className="font-extrabold text-lg text-[var(--color-brand-primary)] mb-1">
                  No coffee listings match your filters
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)] max-w-sm mx-auto mb-4">
                  Try clearing your search or filters to see more coffee offers across Uganda.
                </p>
                <button
                  onClick={() => {
                    setFilterType('all');
                    setFilterRegion('all');
                    setFilterVariety('all');
                    setFilterGrade('all');
                    setSearchQuery('');
                  }}
                  className="btn-primary"
                >
                  Clear All Filters
                </button>
              </div>
            )}

            {/* LISTINGS CARD FEED */}
            <div className="space-y-3.5">
              {filteredListings.map((item) => {
                const isContactRevealed = !!revealedContacts[item.id];
                const totalEstimatedValue = item.quantity_kg * item.price_ugx_per_kg;

                return (
                  <article 
                    key={item.id}
                    className="card-highland transition-all hover:border-[var(--color-accent-amber)]"
                  >
                    {/* Header Row: Type tag, Variety/Grade chips, Posted Time */}
                    <div className="flex items-center justify-between gap-1.5 flex-wrap mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.type === 'selling' ? (
                          <span className="badge-sell">🟢 Selling</span>
                        ) : (
                          <span className="badge-buy">🔴 Buying</span>
                        )}

                        <span className={item.variety === 'Robusta' ? 'badge-robusta' : 'badge-arabica'}>
                          {item.variety}
                        </span>

                        <span className="badge-grade">
                          {item.grade}
                        </span>
                      </div>

                      <span className="text-xs text-[var(--color-text-secondary)] font-medium">
                        {item.district} ({item.region})
                      </span>
                    </div>

                    {/* Primary Specs in 3-Second Hierarchy: Price & Quantity */}
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 py-2 border-y border-[var(--color-surface-subtle)] my-2">
                      <div>
                        {/* Price per KG in Bold Tabular */}
                        <div className="text-2xl font-black text-[var(--color-brand-primary)] tracking-tight">
                          {item.price_ugx_per_kg.toLocaleString()}{' '}
                          <span className="text-sm font-bold text-black">UGX / kg</span>
                        </div>
                        {/* Quantity */}
                        <div className="text-sm font-extrabold text-[var(--color-text-secondary)] flex items-center gap-1 mt-0.5">
                          <Scale size={15} className="text-[var(--color-brand-primary)]" />
                          <span>Batch Size: <strong className="text-black">{item.quantity_kg.toLocaleString()} kg</strong></span>
                        </div>
                      </div>

                      {/* Lot Total Value */}
                      <div className="sm:text-right">
                        <div className="text-xs text-[var(--color-text-secondary)] uppercase font-bold">Estimated Lot Total</div>
                        <div className="text-base font-extrabold text-[var(--color-action-primary)]">
                          UGX {totalEstimatedValue.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Location & Poster Role */}
                    <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)] mb-2.5">
                      <div className="flex items-center gap-1">
                        <MapPin size={14} className="text-[var(--color-brand-primary)]" />
                        <span className="font-semibold text-black">{item.district} District</span>
                        <span>•</span>
                        <span>{item.role}</span>
                      </div>
                    </div>

                    {/* Trade Notes / Availability */}
                    {item.notes && (
                      <p className="text-xs bg-[var(--color-surface-subtle)] p-2.5 rounded-md border border-[var(--color-border-subtle)] text-black mb-3">
                        "{item.notes}"
                      </p>
                    )}

                    {/* SCREEN 4: CONTACT REVEAL & SAFETY TIP */}
                    <div>
                      {!isContactRevealed ? (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => handleExpressInterest(item.id, item.contact.name)}
                            className="btn-primary w-full text-sm"
                          >
                            <Phone size={16} />
                            Express Interest & Reveal Contact
                          </button>
                        </div>
                      ) : (
                        <div className="p-3 rounded-lg border-2 border-[var(--color-action-primary)] bg-[var(--color-surface-subtle)] space-y-2.5 animate-fadeIn">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-[var(--color-action-primary)] flex items-center gap-1">
                              <CheckCircle2 size={16} /> Contact Details Revealed
                            </span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[var(--color-brand-primary)] text-white">
                              {item.contact.momo_network || 'Mobile Money'}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-[var(--color-text-secondary)] block text-[10px] uppercase font-bold">Seller / Buyer Name:</span>
                              <span className="font-extrabold text-sm text-black">{item.contact.name}</span>
                            </div>
                            <div>
                              <span className="text-[var(--color-text-secondary)] block text-[10px] uppercase font-bold">Phone Number:</span>
                              <span className="font-mono font-black text-base text-[var(--color-brand-primary)]">{item.contact.phone}</span>
                            </div>
                          </div>

                          {/* Direct Actions: Call & WhatsApp */}
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <a
                              href={`tel:${item.contact.phone.replace(/\s+/g, '')}`}
                              className="btn-primary text-xs py-2"
                            >
                              <Phone size={14} /> Call Directly
                            </a>
                            <a
                              href={`https://wa.me/${item.contact.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-secondary text-xs py-2 bg-white"
                            >
                              <MessageSquare size={14} /> WhatsApp
                            </a>
                          </div>

                          {/* Safety Tip Box */}
                          <div className="p-2 rounded bg-white border border-[var(--color-accent-amber)] text-[11px] text-[var(--color-text-secondary)] flex items-start gap-1.5">
                            <ShieldAlert size={16} className="text-[var(--color-accent-amber)] shrink-0 mt-0.5" />
                            <span>
                              <strong>UCDA Safety Tip:</strong> Always agree on coffee grade, moisture level (12–13%), and certified weighing scale before sending Mobile Money.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                  </article>
                );
              })}
            </div>

          </div>
        )}

        {/* ============================================================== */}
        {/* SCREEN 3: POST A LISTING (AI PASTE & REVIEW + MANUAL FORM)    */}
        {/* ============================================================== */}
        {activeTab === 'post' && (
          <div className="space-y-4">
            
            {/* Post Header */}
            <div className="card-highland">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={20} className="text-[var(--color-accent-amber)]" />
                <h2 className="font-extrabold text-xl text-[var(--color-brand-primary)]">
                  Post Coffee Offer or Request
                </h2>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                Paste any informal WhatsApp message or SMS. Kahawa AI (Gemma 4) will automatically extract grade, variety, price, and quantity for your review.
              </p>

              {/* Sample 1-Tap Message Chips (including exact acceptance test) */}
              <div className="p-2.5 rounded-md bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] mb-3">
                <span className="text-[11px] font-black uppercase text-[var(--color-brand-primary)] block mb-1.5">
                  Tap a sample message to test:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const msg = "I have 300kg kiboko in Masaka, ready in 2 weeks, 4500 per kg";
                      setInformalMessage(msg);
                      handleExtractMessage(msg);
                    }}
                    className="text-left text-xs bg-white border border-[var(--color-border)] px-2.5 py-1.5 rounded-md font-bold hover:bg-[var(--color-canvas)]"
                  >
                    🎯 <strong className="underline">Acceptance Test:</strong> "I have 300kg kiboko in Masaka, ready in 2 weeks, 4500 per kg"
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const msg = "Buying 5000kg Arabica parchment in Mbale, 12800 per kg cash upon delivery";
                      setInformalMessage(msg);
                      handleExtractMessage(msg);
                    }}
                    className="text-left text-xs bg-white border border-[var(--color-border)] px-2.5 py-1.5 rounded-md font-bold hover:bg-[var(--color-canvas)]"
                  >
                    📦 Arabica Parchment Buyer (Mbale)
                  </button>
                </div>
              </div>

              {/* Large Paste Textarea */}
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase">
                  Paste your message here:
                </label>
                <textarea
                  rows={3}
                  value={informalMessage}
                  onChange={(e) => setInformalMessage(e.target.value)}
                  placeholder="Example: I have 300kg kiboko in Masaka, ready in 2 weeks, 4500 per kg..."
                  className="w-full p-3 rounded-md border-2 border-[var(--color-border)] bg-white text-base font-mono"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2.5 pt-3">
                <button
                  type="button"
                  disabled={isExtracting}
                  onClick={() => handleExtractMessage()}
                  className="btn-primary flex-1 text-base"
                >
                  {isExtracting ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      Extracting with AI...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      Extract Listing
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleOpenManualForm}
                  className="btn-secondary text-sm"
                >
                  Manual Form
                </button>
              </div>

              {/* SYSTEM STATE: ERROR STATE */}
              {extractionError && (
                <div className="mt-3 p-3 rounded-md bg-[var(--color-surface-subtle)] border-2 border-[var(--color-danger)] text-xs text-[var(--color-danger)] font-bold flex items-center justify-between gap-2">
                  <span>{extractionError}</span>
                  <button
                    onClick={handleOpenManualForm}
                    className="underline text-black font-black"
                  >
                    Fill manually
                  </button>
                </div>
              )}
            </div>

            {/* REVIEW SCREEN: STRUCTURED FORM (AI OR MANUAL) */}
            {draftListing && (
              <div className="card-highland space-y-4 border-2 border-[var(--color-brand-primary)] animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border-subtle)]">
                  <div>
                    <h3 className="font-black text-lg text-[var(--color-brand-primary)] flex items-center gap-1.5">
                      <CheckCircle2 size={20} className="text-[var(--color-action-primary)]" />
                      Review & Confirm Structured Listing
                    </h3>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      Review fields extracted by AI before publishing to the live board.
                    </p>
                  </div>
                  <button 
                    onClick={() => setDraftListing(null)}
                    className="text-xs font-bold p-1 text-[var(--color-text-secondary)] hover:text-black"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Type */}
                  <div>
                    <label className="font-black block mb-1">Listing Type:</label>
                    <select
                      value={draftListing.type || 'selling'}
                      onChange={(e) => setDraftListing({ ...draftListing, type: e.target.value as ListingType })}
                      className="w-full p-2.5 rounded-md border-2 border-[var(--color-border)] bg-white font-bold text-sm"
                    >
                      <option value="selling">Selling (Coffee for Sale)</option>
                      <option value="buying">Buying (Coffee Wanted)</option>
                    </select>
                  </div>

                  {/* Variety */}
                  <div>
                    <label className="font-black block mb-1">Coffee Variety:</label>
                    <select
                      value={draftListing.variety || 'Robusta'}
                      onChange={(e) => setDraftListing({ ...draftListing, variety: e.target.value as CoffeeVariety })}
                      className="w-full p-2.5 rounded-md border-2 border-[var(--color-border)] bg-white font-bold text-sm"
                    >
                      <option value="Robusta">Robusta (Central & Western lowland)</option>
                      <option value="Arabica">Arabica (Elgon, Rwenzori, West Nile)</option>
                      <option value="Mixed/Other">Mixed / Other</option>
                    </select>
                  </div>

                  {/* Grade */}
                  <div>
                    <label className="font-black block mb-1">Grade / Form:</label>
                    <select
                      value={draftListing.grade || 'kiboko'}
                      onChange={(e) => setDraftListing({ ...draftListing, grade: e.target.value as CoffeeGrade })}
                      className="w-full p-2.5 rounded-md border-2 border-[var(--color-border)] bg-white font-bold text-sm"
                    >
                      <option value="kiboko">kiboko (dry cherry)</option>
                      <option value="FAQ">FAQ (fair average quality)</option>
                      <option value="parchment">parchment (washed Arabica)</option>
                      <option value="green bean">green bean (sorted)</option>
                      <option value="other">other</option>
                    </select>
                  </div>

                  {/* Region */}
                  <div>
                    <label className="font-black block mb-1">Region:</label>
                    <select
                      value={draftListing.region || 'Central'}
                      onChange={(e) => {
                        const newReg = e.target.value as UgandaRegion;
                        const defaultDist = UGANDA_REGIONS[newReg]?.[0] || 'Masaka';
                        setDraftListing({ ...draftListing, region: newReg, district: defaultDist });
                      }}
                      className="w-full p-2.5 rounded-md border-2 border-[var(--color-border)] bg-white font-bold text-sm"
                    >
                      <option value="Central">Central (Masaka, Luwero, Mukono)</option>
                      <option value="Western">Western (Mbarara, Kasese, Bushenyi)</option>
                      <option value="Eastern">Eastern (Mbale, Kapchorwa, Mt Elgon)</option>
                      <option value="Northern">Northern (Arua, Nebbi, West Nile)</option>
                    </select>
                  </div>

                  {/* District */}
                  <div>
                    <label className="font-black block mb-1">District:</label>
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
                      placeholder="e.g. Masaka, Mbale..."
                      className="w-full p-2.5 rounded-md border-2 border-[var(--color-border)] bg-white font-bold text-sm"
                    />
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="font-black block mb-1">Quantity (kg):</label>
                    <input
                      type="number"
                      min={1}
                      value={draftListing.quantity_kg ?? ''}
                      onChange={(e) => setDraftListing({ ...draftListing, quantity_kg: Number(e.target.value) })}
                      placeholder="e.g. 300"
                      className="w-full p-2.5 rounded-md border-2 border-[var(--color-border)] bg-white font-black text-sm"
                    />
                  </div>

                  {/* Price per KG */}
                  <div className="sm:col-span-2">
                    <label className="font-black block mb-1">Price in UGX per kg:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={100}
                        step={50}
                        value={draftListing.price_ugx_per_kg ?? ''}
                        onChange={(e) => setDraftListing({ ...draftListing, price_ugx_per_kg: Number(e.target.value) })}
                        placeholder="e.g. 4500"
                        className="w-full p-2.5 rounded-md border-2 border-[var(--color-border)] bg-white font-black text-lg"
                      />
                      <span className="text-sm font-extrabold text-[var(--color-brand-primary)] whitespace-nowrap">
                        UGX / kg
                      </span>
                    </div>

                    {/* Auto Calculated Batch Total */}
                    {draftListing.quantity_kg && draftListing.price_ugx_per_kg && (
                      <div className="mt-1.5 p-2 bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] rounded-md flex justify-between items-center text-xs font-bold">
                        <span>Calculated Total Batch Value:</span>
                        <span className="text-[var(--color-action-primary)] text-sm font-black">
                          UGX {(draftListing.quantity_kg * draftListing.price_ugx_per_kg).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Notes / Availability */}
                  <div className="sm:col-span-2">
                    <label className="font-black block mb-1">Notes / Availability Timing:</label>
                    <textarea
                      rows={2}
                      value={draftListing.notes || ''}
                      onChange={(e) => setDraftListing({ ...draftListing, notes: e.target.value })}
                      placeholder="e.g. ready in 2 weeks, sun dried on tarpaulins..."
                      className="w-full p-2.5 rounded-md border-2 border-[var(--color-border)] bg-white text-xs"
                    />
                  </div>
                </div>

                {/* Primary Button: Looks good, post it */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handlePublishListing}
                    className="btn-primary w-full text-base"
                  >
                    Looks Good, Post It
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ============================================================== */}
        {/* SCREEN 5: MY LISTINGS (MANAGE POSTED COFFEE OFFERS)           */}
        {/* ============================================================== */}
        {activeTab === 'my-listings' && (
          <div className="space-y-4">
            <div className="card-highland">
              <h2 className="font-extrabold text-xl text-[var(--color-brand-primary)] mb-1">
                My Posted Listings
              </h2>
              <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                Manage your active coffee offers. You can mark listings as completed or remove them once traded.
              </p>

              {myListings.length === 0 ? (
                <div className="text-center py-8">
                  <p className="font-bold text-sm text-[var(--color-text-secondary)] mb-3">
                    You have not posted any coffee offers yet.
                  </p>
                  <button
                    onClick={() => setActiveTab('post')}
                    className="btn-primary text-sm"
                  >
                    Post Your First Coffee Listing
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {myListings.map(listing => (
                    <div 
                      key={listing.id}
                      className="p-3.5 rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col sm:flex-row justify-between sm:items-center gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={listing.type === 'selling' ? 'badge-sell' : 'badge-buy'}>
                            {listing.type === 'selling' ? 'Selling' : 'Buying'}
                          </span>
                          <span className="font-black text-base">{listing.variety} ({listing.grade})</span>
                        </div>
                        <div className="text-xs text-[var(--color-text-secondary)] font-medium">
                          {listing.quantity_kg.toLocaleString()} kg • UGX {listing.price_ugx_per_kg.toLocaleString()} / kg • {listing.district}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          onClick={() => handleDeleteListing(listing.id)}
                          className="px-3 py-1.5 rounded-md border border-[var(--color-danger)] text-[var(--color-danger)] font-bold text-xs hover:bg-[var(--color-surface-subtle)] flex items-center gap-1"
                        >
                          <Trash2 size={13} /> Remove
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="pt-2">
                    <button
                      onClick={() => setActiveTab('post')}
                      className="btn-primary w-full text-sm"
                    >
                      Post Another Coffee Listing
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* ============================================================== */}
      {/* SCREEN 7: BOTTOM NAVIGATION BAR (MAXIMUM 4 ITEMS FOR MOBILE)  */}
      {/* ============================================================== */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-surface)] border-t-2 border-[var(--color-brand-primary)] shadow-lg">
        <div className="max-w-md mx-auto grid grid-cols-4 py-1.5 px-2">
          {/* Tab 1: Home */}
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center justify-center py-1 rounded-md text-xs font-bold transition-colors ${
              activeTab === 'home'
                ? 'text-[var(--color-brand-primary)] font-black'
                : 'text-[var(--color-text-secondary)] hover:text-black'
            }`}
          >
            <Home size={20} className={activeTab === 'home' ? 'stroke-[2.5]' : ''} />
            <span className="mt-0.5">Home</span>
          </button>

          {/* Tab 2: Post */}
          <button
            onClick={() => setActiveTab('post')}
            className={`flex flex-col items-center justify-center py-1 rounded-md text-xs font-bold transition-colors ${
              activeTab === 'post'
                ? 'text-[var(--color-brand-primary)] font-black'
                : 'text-[var(--color-text-secondary)] hover:text-black'
            }`}
          >
            <PlusCircle size={20} className={activeTab === 'post' ? 'stroke-[2.5]' : ''} />
            <span className="mt-0.5">Post</span>
          </button>

          {/* Tab 3: My Listings */}
          <button
            onClick={() => setActiveTab('my-listings')}
            className={`flex flex-col items-center justify-center py-1 rounded-md text-xs font-bold transition-colors relative ${
              activeTab === 'my-listings'
                ? 'text-[var(--color-brand-primary)] font-black'
                : 'text-[var(--color-text-secondary)] hover:text-black'
            }`}
          >
            <Layers size={20} className={activeTab === 'my-listings' ? 'stroke-[2.5]' : ''} />
            <span className="mt-0.5">My Listings</span>
            {myListings.length > 0 && (
              <span className="absolute top-1 right-5 w-4 h-4 rounded-full bg-[var(--color-action-primary)] text-white text-[9px] flex items-center justify-center font-bold">
                {myListings.length}
              </span>
            )}
          </button>

          {/* Tab 4: Profile */}
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center justify-center py-1 rounded-md text-xs font-bold transition-colors ${
              activeTab === 'profile'
                ? 'text-[var(--color-brand-primary)] font-black'
                : 'text-[var(--color-text-secondary)] hover:text-black'
            }`}
          >
            <User size={20} className={activeTab === 'profile' ? 'stroke-[2.5]' : ''} />
            <span className="mt-0.5">Profile</span>
          </button>
        </div>
      </nav>

    </div>
  );
}
