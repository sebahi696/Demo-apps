// ───────────────────────────────────────────────────────────────
// Core data model. Everything a demo needs lives in one `Demo`
// object: `config` (what the questionnaire produced) + `data`
// (the live, editable business data).
// ───────────────────────────────────────────────────────────────

export type Lang = 'en' | 'ar';
/** Localized text. `ar` is optional — falls back to `en`. */
export type L = { en: string; ar?: string };

export type Industry = 'restaurant' | 'cafe' | 'retail';
export type Role = 'customer' | 'staff' | 'owner';

export type ModuleKey =
  | 'ordering'
  | 'delivery'
  | 'pickup'
  | 'dineIn'
  | 'loyaltyPoints'
  | 'loyaltyStamps'
  | 'vipTiers'
  | 'staticQr'
  | 'deals'
  | 'campaigns'
  | 'reservations';

export type Modules = Record<ModuleKey, boolean>;

export type PaymentKey = 'card' | 'applePay' | 'googlePay' | 'cash';

export interface Tier {
  id: string;
  name: L;
  minPoints: number; // lifetime points needed
  multiplier: number; // earn multiplier
  color: string;
}

export interface DeliveryZone {
  id: string;
  name: L;
  fee: number;
  eta: number; // minutes
}

export interface DemoConfig {
  id: string;
  createdAt: number;
  expiresAt: number;
  industry: Industry;
  /** 'wizard' = made from the questionnaire, 'shared' = opened from a share link */
  origin?: 'wizard' | 'shared';
  parentId?: string;
  /** Sales-console preview copies are never reported to the cloud */
  noSync?: boolean;
  business: {
    name: L;
    tagline: L;
    logo?: string; // data URL
    logoEmoji: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    country: string;
    currency: string;
    openTime: string; // "08:00"
    closeTime: string; // "23:00"
  };
  brand: {
    primary: string;
    secondary: string;
    radius: 'sharp' | 'soft' | 'round';
    font: 'modern' | 'classic' | 'friendly';
    headerStyle: 'solid' | 'light';
  };
  defaultLang: Lang;
  modules: Modules;
  payments: Record<PaymentKey, boolean>;
  fulfillment: {
    zones: DeliveryZone[];
    minOrder: number;
    freeDeliveryOver: number;
    prepMinutes: number;
    taxRate: number; // percent
    taxIncluded: boolean;
  };
  loyalty: {
    pointsPerUnit: number; // points per 1 currency unit spent
    stampsTarget: number;
    stampReward: L;
    stampRule: 'perOrder' | 'perItem';
    stampCategoryIds: string[]; // empty = all categories
    signupBonus: number;
    staticQr: { dailyLimit: number; cooldownMinutes: number; requirePin: boolean; pin: string };
    tiers: Tier[];
  };
  reservations: {
    slotMinutes: number;
    capacityPerSlot: number;
    maxParty: number;
    daysAhead: number;
  };
  lead: {
    ownerName: string;
    email: string;
    phone: string;
    answers: Record<string, string>;
  };
}

export interface OptionGroup {
  id: string;
  name: L;
  required: boolean;
  multi: boolean;
  options: { id: string; name: L; priceDelta: number }[];
}

export interface Category {
  id: string;
  name: L;
  emoji: string;
}

export interface Product {
  id: string;
  categoryId: string;
  name: L;
  desc: L;
  price: number;
  emoji: string;
  bg: string;
  image?: string;
  popular?: boolean;
  isNew?: boolean;
  active: boolean;
  stock: number | null; // null = not tracked
  groups: OptionGroup[];
}

export type RewardKind = 'discount' | 'item';
export interface Reward {
  id: string;
  name: L;
  cost: number; // points
  kind: RewardKind;
  value: number; // discount amount (kind=discount)
  productId?: string; // kind=item
  emoji: string;
  active: boolean;
}

export type DealKind = 'percent' | 'fixed' | 'freeDelivery';
export interface Deal {
  id: string;
  title: L;
  desc: L;
  code: string;
  kind: DealKind;
  value: number;
  minOrder: number;
  endsAt?: number; // flash deal
  emoji: string;
  bg: string;
  active: boolean;
}

export interface Banner {
  id: string;
  title: L;
  subtitle: L;
  emoji: string;
  bg: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  points: number;
  lifetimePoints: number;
  stamps: number;
  joinedAt: number;
  lastSeenAt: number;
}

export interface CartItem {
  key: string;
  productId: string;
  qty: number;
  optionIds: string[];
  note?: string;
}

export type Fulfillment = 'delivery' | 'pickup' | 'dineIn';
export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'outForDelivery'
  | 'completed'
  | 'cancelled';

export interface OrderItem {
  productId: string;
  name: L;
  emoji: string;
  qty: number;
  unitPrice: number;
  options: L[];
  free?: boolean;
}

export interface Order {
  id: string;
  number: number;
  customerId: string;
  customerName: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  tax: number;
  total: number;
  fulfillment: Fulfillment;
  zoneId?: string;
  address?: string;
  table?: string;
  payment: PaymentKey;
  paid: boolean;
  status: OrderStatus;
  history: { status: OrderStatus; at: number }[];
  createdAt: number;
  updatedAt: number;
  couponCode?: string;
  voucherId?: string;
  note?: string;
  pointsEarned: number;
  stampsEarned: number;
}

export type ReservationStatus = 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'noShow';
export interface Reservation {
  id: string;
  customerId: string;
  name: string;
  phone: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  party: number;
  note?: string;
  status: ReservationStatus;
  createdAt: number;
}

export type LedgerSource = 'order' | 'qrStaff' | 'qrStatic' | 'reward' | 'manual' | 'signup' | 'reservation';
export interface LedgerEntry {
  id: string;
  customerId: string;
  points: number; // + earn / - spend
  stamps: number;
  source: LedgerSource;
  note?: string;
  ref?: string;
  at: number;
}

export interface Voucher {
  id: string;
  code: string;
  customerId: string;
  rewardId: string;
  name: L;
  emoji: string;
  kind: RewardKind | 'stampCard';
  value: number;
  productId?: string;
  status: 'active' | 'used';
  createdAt: number;
  usedAt?: number;
}

export interface Notice {
  id: string;
  title: L;
  body: L;
  kind: 'order' | 'campaign' | 'loyalty' | 'reservation' | 'system';
  link?: string;
  at: number;
  read: boolean;
}

export interface Campaign {
  id: string;
  title: L;
  body: L;
  audience: 'all' | 'vip' | 'inactive';
  reach: number;
  sentAt: number;
}

export interface StaffMember {
  id: string;
  name: string;
  role: 'manager' | 'cashier' | 'kitchen';
  pin: string;
  active: boolean;
}

export interface DemoData {
  categories: Category[];
  products: Product[];
  rewards: Reward[];
  deals: Deal[];
  banners: Banner[];
  customers: Customer[];
  meId: string;
  cart: { items: CartItem[]; couponCode?: string; voucherId?: string };
  orders: Order[];
  reservations: Reservation[];
  ledger: LedgerEntry[];
  vouchers: Voucher[];
  notices: Notice[];
  campaigns: Campaign[];
  staff: StaffMember[];
  usedTokens: string[];
  staticScans: number[]; // timestamps of the demo user's static-QR claims
  tour: Record<string, boolean>;
  activity: Record<string, number>;
  nextOrderNumber: number;
}

export interface Demo {
  config: DemoConfig;
  data: DemoData;
}
