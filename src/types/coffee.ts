/**
 * Coffee Listing and User Profile Types for KawaLink Uganda
 */

export type ListingType = 'selling' | 'buying';

export type CoffeeVariety = 'Robusta' | 'Arabica' | 'Mixed/Other';

export type CoffeeGrade = 'kiboko' | 'FAQ' | 'parchment' | 'green bean' | 'other';

export type UgandaRegion = 'Central' | 'Western' | 'Eastern' | 'Northern';

export interface ListingContact {
  name: string;
  phone: string;
  momo_network?: 'MTN MoMo' | 'Airtel Money' | 'Both' | 'Cash / Bank';
  whatsapp?: string;
}

export interface CoffeeListing {
  id: string;
  type: ListingType;
  role: string;
  variety: CoffeeVariety;
  grade: CoffeeGrade;
  quantity_kg: number;
  price_ugx_per_kg: number;
  region: UgandaRegion;
  district: string;
  contact: ListingContact;
  notes: string;
  created_at: string;
  verified_farmer?: boolean;
}

export interface UserProfile {
  name: string;
  role: string;
  district: string;
  region: UgandaRegion;
  phone: string;
  momo_network: 'MTN MoMo' | 'Airtel Money' | 'Both' | 'Cash / Bank';
  is_registered: boolean;
}

export const UGANDA_REGIONS: Record<UgandaRegion, string[]> = {
  Central: ['Masaka', 'Luwero', 'Mukono', 'Wakiso', 'Mpigi', 'Mityana', 'Mubende', 'Kampala'],
  Western: ['Mbarara', 'Kasese', 'Bushenyi', 'Fort Portal / Kabarole', 'Ntungamo', 'Sheema', 'Rukungiri'],
  Eastern: ['Mbale', 'Kapchorwa', 'Sironko', 'Bududa', 'Iganga', 'Jinja', 'Kamuli'],
  Northern: ['Arua', 'Nebbi', 'Zombo', 'Gulu', 'Lira', 'Adjumani']
};

export const POPULAR_DISTRICT_REGIONS: Record<string, { region: UgandaRegion; defaultVariety: CoffeeVariety }> = {
  masaka: { region: 'Central', defaultVariety: 'Robusta' },
  luwero: { region: 'Central', defaultVariety: 'Robusta' },
  mukono: { region: 'Central', defaultVariety: 'Robusta' },
  wakiso: { region: 'Central', defaultVariety: 'Robusta' },
  mpigi: { region: 'Central', defaultVariety: 'Robusta' },
  mityana: { region: 'Central', defaultVariety: 'Robusta' },
  mubende: { region: 'Central', defaultVariety: 'Robusta' },
  kampala: { region: 'Central', defaultVariety: 'Robusta' },
  mbarara: { region: 'Western', defaultVariety: 'Robusta' },
  bushenyi: { region: 'Western', defaultVariety: 'Robusta' },
  kasese: { region: 'Western', defaultVariety: 'Arabica' }, // Rwenzori Arabica
  'fort portal': { region: 'Western', defaultVariety: 'Arabica' },
  kabarole: { region: 'Western', defaultVariety: 'Arabica' },
  ntungamo: { region: 'Western', defaultVariety: 'Robusta' },
  mbale: { region: 'Eastern', defaultVariety: 'Arabica' }, // Mt Elgon / Bugisu
  kapchorwa: { region: 'Eastern', defaultVariety: 'Arabica' },
  sironko: { region: 'Eastern', defaultVariety: 'Arabica' },
  bududa: { region: 'Eastern', defaultVariety: 'Arabica' },
  arua: { region: 'Northern', defaultVariety: 'Arabica' }, // West Nile Arabica
  nebbi: { region: 'Northern', defaultVariety: 'Arabica' },
  zombo: { region: 'Northern', defaultVariety: 'Arabica' },
  gulu: { region: 'Northern', defaultVariety: 'Robusta' }
};
