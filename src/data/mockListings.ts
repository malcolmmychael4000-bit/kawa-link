import { CoffeeListing } from '../types/coffee';

export const INITIAL_MOCK_LISTINGS: CoffeeListing[] = [
  {
    id: 'kawa-001',
    type: 'selling',
    role: 'Farmer / Smallholder',
    variety: 'Robusta',
    grade: 'kiboko',
    quantity_kg: 850,
    price_ugx_per_kg: 4600,
    region: 'Central',
    district: 'Masaka',
    contact: {
      name: 'Masaka Smallholder 14',
      phone: '+256 772 411 204',
      momo_network: 'MTN MoMo',
      whatsapp: '+256 772 411 204'
    },
    notes: 'Well dried on raised tarpaulins. Moisture level tested below 13%. Ready for pickup near Bukakata road.',
    created_at: '2026-10-01T08:30:00Z',
    verified_farmer: true
  },
  {
    id: 'kawa-002',
    type: 'selling',
    role: 'Cooperative Union',
    variety: 'Arabica',
    grade: 'parchment',
    quantity_kg: 2400,
    price_ugx_per_kg: 12800,
    region: 'Eastern',
    district: 'Mbale',
    contact: {
      name: 'Bugisu High Altitude Coop Rep',
      phone: '+256 701 892 334',
      momo_network: 'Airtel Money',
      whatsapp: '+256 701 892 334'
    },
    notes: 'Washed Arabica from Mt. Elgon slopes (1800m ASL). Clean cupping profile, properly sorted parchment bags.',
    created_at: '2026-10-01T11:15:00Z',
    verified_farmer: true
  },
  {
    id: 'kawa-003',
    type: 'buying',
    role: 'Coffee Buyer / Exporter',
    variety: 'Robusta',
    grade: 'FAQ',
    quantity_kg: 5000,
    price_ugx_per_kg: 11800,
    region: 'Central',
    district: 'Kampala',
    contact: {
      name: 'Kampala Central Mill Buyer',
      phone: '+256 782 550 719',
      momo_network: 'Both',
      whatsapp: '+256 782 550 719'
    },
    notes: 'Buying clean Robusta FAQ at warehouse in Kawempe or can arrange bulk collection from Masaka/Mubende for lots > 2 tons. Immediate mobile money payment upon weighing.',
    created_at: '2026-10-01T14:45:00Z',
    verified_farmer: false
  },
  {
    id: 'kawa-004',
    type: 'selling',
    role: 'Farmer / Smallholder',
    variety: 'Arabica',
    grade: 'parchment',
    quantity_kg: 650,
    price_ugx_per_kg: 12200,
    region: 'Western',
    district: 'Kasese',
    contact: {
      name: 'Rwenzori Foothills Producer 08',
      phone: '+256 774 309 681',
      momo_network: 'MTN MoMo',
      whatsapp: '+256 774 309 681'
    },
    notes: 'Hand-pulped Rwenzori Arabica parchment. Solar dried. Stored in clean hermetic grain bags.',
    created_at: '2026-10-01T16:00:00Z',
    verified_farmer: true
  },
  {
    id: 'kawa-005',
    type: 'selling',
    role: 'Trader / Aggregator',
    variety: 'Robusta',
    grade: 'FAQ',
    quantity_kg: 1800,
    price_ugx_per_kg: 11200,
    region: 'Western',
    district: 'Mbarara',
    contact: {
      name: 'Ankole Coffee Aggregator 3',
      phone: '+256 706 724 990',
      momo_network: 'Airtel Money',
      whatsapp: '+256 706 724 990'
    },
    notes: 'Milled Robusta FAQ from Bushenyi and Sheema farms. Screen 15 up, outturn 80%. Ready at Mbarara depot.',
    created_at: '2026-10-02T01:20:00Z',
    verified_farmer: false
  },
  {
    id: 'kawa-006',
    type: 'selling',
    role: 'Farmer / Smallholder',
    variety: 'Arabica',
    grade: 'green bean',
    quantity_kg: 420,
    price_ugx_per_kg: 16500,
    region: 'Northern',
    district: 'Arua',
    contact: {
      name: 'West Nile Arabica Grower 19',
      phone: '+256 788 123 456',
      momo_network: 'MTN MoMo',
      whatsapp: '+256 788 123 456'
    },
    notes: 'Specialty lot from Zombo highlands. Fully washed, sorted screen 17+. Samples available on request.',
    created_at: '2026-10-02T02:00:00Z',
    verified_farmer: true
  },
  {
    id: 'kawa-007',
    type: 'buying',
    role: 'Cooperative Union',
    variety: 'Robusta',
    grade: 'kiboko',
    quantity_kg: 3000,
    price_ugx_per_kg: 4700,
    region: 'Central',
    district: 'Luwero',
    contact: {
      name: 'Greater Luwero Farmers Society',
      phone: '+256 752 901 882',
      momo_network: 'Both',
      whatsapp: '+256 752 901 882'
    },
    notes: 'Pooling dried kiboko for community hulling next Tuesday. Fair price paid per kg upon moisture test approval.',
    created_at: '2026-10-02T02:30:00Z',
    verified_farmer: false
  },
  {
    id: 'kawa-008',
    type: 'selling',
    role: 'Farmer / Smallholder',
    variety: 'Arabica',
    grade: 'parchment',
    quantity_kg: 320,
    price_ugx_per_kg: 13000,
    region: 'Eastern',
    district: 'Kapchorwa',
    contact: {
      name: 'Sebei Mountain Smallholder 05',
      phone: '+256 779 667 112',
      momo_network: 'MTN MoMo',
      whatsapp: '+256 779 667 112'
    },
    notes: 'Highland parchment coffee harvested last week. Washed with clean spring water. Ready for immediate collection.',
    created_at: '2026-10-02T03:10:00Z',
    verified_farmer: true
  }
];
