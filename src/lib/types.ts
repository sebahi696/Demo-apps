// ───────────────────────────────────────────────────────────────
// Core data model. Everything a demo needs lives in one `Demo`
// object: `config` (what the questionnaire produced) + `data`
// (the live, editable business data).
// ───────────────────────────────────────────────────────────────

export type Lang = 'en' | 'ar';
/** Localized text. `ar` is optional — falls back to `en`. */
export type L = { en: string; ar?: string };

export type Industry = 'restaurant' | 'cafe' | 'bakery' | 'fastfood';
export type Role = 'customer' | 'staff' | 'rider' | 'owner';

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
  | 'reservations'
  | 'wallet'
  | 'tips'
  | 'reviews'
  | 'referrals'
  | 'tableQr';

export type Modules = Record<ModuleKey, boolean>;

export type PaymentKey = 'card' | 'applePay' | 'googlePay' | 'cash' | 'wallet';

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
  minOrder?: number; // overrides the global minimum for this zone
}

export interface Branch {
  id: string;
  name: L;
  address: string;
  phone: string;
}

/** Product badges customers can filter by. */
export type ProductTag = 'vegan' | 'vegetarian' | 'glutenFree' | 'spicy' | 'healthy' | 'kids' | 'sugarFree' | 'organic' | 'bestseller' | 'limited' | 'eco';

export type HomeSection = 'banners' | 'loyalty' | 'quick' | 'active' | 'deals' | 'reorder' | 'categories' | 'favorites' | 'popular' | 'new' | 'info';

export interface AppUi {
  theme: 'light' | 'dark';
  header: 'solid' | 'gradient' | 'image';
  menuLayout: 'list' | 'grid' | 'large';
  cardStyle: 'elevated' | 'outlined' | 'flat';
  sections: HomeSection[]; // order and visibility of the home screen
  coverEmoji: string;
  showCalories: boolean;
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
    closedDays: number[]; // 0 = Sunday
    ordersPaused: boolean;
    busyExtraMinutes: number;
  };
  branches: Branch[];
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
    referralBonus: number;
    birthdayReward: L;
    staticQr: { dailyLimit: number; cooldownMinutes: number; requirePin: boolean; pin: string };
    tiers: Tier[];
  };
  wallet: {
    topUps: number[];
    bonusPercent: number; // extra credit on top-ups
  };
  tips: number[]; // percent options
  /** Show prices in a second currency (e.g. Lebanese lira) at the owner's rate */
  dual: { enabled: boolean; currency: string; rate: number; roundTo: number };
  reservations: {
    slotMinutes: number;
    capacityPerSlot: number;
    maxParty: number;
    daysAhead: number;
  };
  /** How the customer app looks — every option is editable in Owner → App design */
  ui: AppUi;
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
  max?: number; // for multi groups: most a customer can pick
  options: { id: string; name: L; priceDelta: number }[];
}

export interface Category {
  id: string;
  name: L;
  emoji: string;
  /** Only orderable between these times, e.g. breakfast 07:00–11:30 */
  availableFrom?: string;
  availableTo?: string;
}

export interface Product {
  id: string;
  categoryId: string;
  name: L;
  desc: L;
  price: number;
  compareAt?: number; // original price when on sale / combo "worth"
  tags: ProductTag[];
  allergens?: string[];
  calories?: number;
  prepMinutes?: number;
  emoji: string;
  bg: string;
  image?: string;
  popular?: boolean;
  isNew?: boolean;
  active: boolean;
  stock: number | null; // null = not tracked
  soldOutAt?: string[]; // branch ids where it is sold out today
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
  wallet: number;
  birthday?: string; // MM-DD
  referralCode: string;
  referredBy?: string;
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
  phone?: string;
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
  history: { status: OrderStatus; at: number; by?: string }[]; // by = staff id
  createdAt: number;
  updatedAt: number;
  couponCode?: string;
  voucherId?: string;
  note?: string;
  pointsEarned: number;
  stampsEarned: number;
  tip: number;
  branchId?: string;
  riderId?: string;
  assignedAt?: number;
  collected?: number; // cash collected by the rider
  lostReason?: LostReason;
  rating?: number;
  review?: string;
  reply?: string;
  scheduledFor?: number; // pre-order time
}

export interface ServiceRequest {
  id: string;
  table: string;
  kind: 'waiter' | 'bill' | 'water' | 'cutlery';
  at: number;
  done: boolean;
}

export type LostReason = 'busy' | 'soldOut' | 'outsideArea' | 'closed' | 'customer' | 'other';

export interface Rider {
  id: string;
  name: string;
  phone: string;
  pin: string;
  active: boolean;
  onShift: boolean;
  shiftStart?: number;
  branchId?: string;
}

export interface CashCollection {
  id: string;
  riderId: string;
  orderId: string;
  orderNumber: number;
  amount: number;
  at: number;
  settled: boolean;
}

export interface Settlement {
  id: string;
  riderId: string;
  collected: number;
  counted: number;
  short: number;
  at: number;
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
  branchId?: string;
  status: ReservationStatus;
  createdAt: number;
}

export type LedgerSource = 'order' | 'qrStaff' | 'qrStatic' | 'reward' | 'manual' | 'signup' | 'reservation' | 'referral' | 'review';
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
  kind: RewardKind | 'stampCard' | 'birthday';
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

export type Audience = 'all' | 'vip' | 'inactive' | 'regulars' | 'quiet' | 'new' | 'birthdays';

export interface Campaign {
  id: string;
  title: L;
  body: L;
  audience: Audience;
  code?: string; // offer attached to the message
  costEstimate?: number;
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

export interface GiftCard {
  code: string;
  amount: number;
  fromName: string;
  toName: string;
  message: string;
  createdAt: number;
  redeemedBy?: string;
  redeemedAt?: number;
}

export interface WalletTx {
  id: string;
  customerId: string;
  amount: number; // + top-up / gift, - payment
  kind: 'topup' | 'bonus' | 'payment' | 'gift' | 'refund';
  note?: string;
  at: number;
}

export interface DemoData {
  categories: Category[];
  products: Product[];
  rewards: Reward[];
  deals: Deal[];
  banners: Banner[];
  customers: Customer[];
  meId: string;
  cart: { items: CartItem[]; couponCode?: string; voucherId?: string; table?: string };
  orders: Order[];
  reservations: Reservation[];
  ledger: LedgerEntry[];
  vouchers: Voucher[];
  notices: Notice[];
  campaigns: Campaign[];
  staff: StaffMember[];
  usedTokens: string[];
  staticScans: number[]; // timestamps of the demo user's static-QR claims
  favorites: string[];
  stockAlerts: string[]; // product ids the demo customer wants to hear about
  giftCards: GiftCard[];
  walletTx: WalletTx[];
  riders: Rider[];
  serviceRequests: ServiceRequest[];
  collections: CashCollection[];
  settlements: Settlement[];
  branchId?: string; // the demo customer's chosen branch
  tour: Record<string, boolean>;
  activity: Record<string, number>;
  nextOrderNumber: number;
}

export interface Demo {
  config: DemoConfig;
  data: DemoData;
}
