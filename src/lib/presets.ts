// ───────────────────────────────────────────────────────────────
// Industry presets. A preset = which modules are on, the words the
// app uses, a default look, and realistic sample data.
// To add an industry: copy one block, change the data, add the key
// to `Industry` in types.ts. No other code changes are needed.
// ───────────────────────────────────────────────────────────────
import type { Category, Deal, Banner, Industry, L, Modules, OptionGroup, Product, Reward, DeliveryZone } from './types';

export interface Preset {
  industry: Industry;
  label: L;
  emoji: string;
  blurb: L;
  sampleName: L;
  sampleTagline: L;
  logoEmoji: string;
  palette: { primary: string; secondary: string };
  font: 'modern' | 'classic' | 'friendly';
  radius: 'sharp' | 'soft' | 'round';
  hours: [string, string];
  modules: Modules;
  terms: {
    catalog: L;
    reserve: L;
    reserveCta: L;
    party: L;
    delivery: L;
    kitchen: L;
  };
  pointsPerUnit: number;
  stampsTarget: number;
  stampReward: L;
  stampRule: 'perOrder' | 'perItem';
  stampCategoryIds: string[];
  zones: DeliveryZone[];
  categories: Category[];
  products: Product[];
  rewards: Reward[];
  deals: (Omit<Deal, 'endsAt'> & { flashHours?: number })[];
  banners: Banner[];
  reservations: { slotMinutes: number; capacityPerSlot: number; maxParty: number };
}

const g = (id: string, en: string, ar: string, required: boolean, multi: boolean, opts: [string, string, string, number][]): OptionGroup => ({
  id, name: { en, ar }, required, multi, options: opts.map(([oid, oen, oar, d]) => ({ id: oid, name: { en: oen, ar: oar }, priceDelta: d })),
});

let n = 0;
const p = (
  categoryId: string, en: string, ar: string, descEn: string, descAr: string, price: number, emoji: string, bg: string,
  extra: Partial<Product> = {},
): Product => ({
  id: 'p' + ++n, categoryId, name: { en, ar }, desc: { en: descEn, ar: descAr }, price, emoji, bg,
  active: true, stock: null, groups: [], tags: [], ...extra,
});

// ── Shared option groups ────────────────────────────────────────
const burgerAddons = g('g-add', 'Add-ons', 'إضافات', false, true, [
  ['o-cheese', 'Extra cheese', 'جبنة إضافية', 1], ['o-bacon', 'Beef bacon', 'لحم مقدد', 1.5], ['o-avo', 'Avocado', 'أفوكادو', 1.5], ['o-egg', 'Fried egg', 'بيض مقلي', 1],
]);
const burgerSide = g('g-side', 'Choose a side', 'اختر طبقاً جانبياً', true, false, [
  ['o-fries', 'Fries', 'بطاطا مقلية', 0], ['o-salad', 'Side salad', 'سلطة جانبية', 0], ['o-wedges', 'Potato wedges', 'بطاطا ودجز', 1],
]);
const grillBread = g('g-bread', 'Served with', 'يُقدّم مع', true, false, [
  ['o-fr2', 'Fries & garlic', 'بطاطا وثوم', 0], ['o-rice', 'Rice', 'أرز', 0], ['o-grv', 'Grilled veggies', 'خضار مشوية', 1],
]);
const drinkSize = g('g-dsize', 'Size', 'الحجم', true, false, [['o-reg', 'Regular', 'عادي', 0], ['o-lg', 'Large', 'كبير', 1]]);
const coffeeSize = g('g-size', 'Size', 'الحجم', true, false, [
  ['o-s', 'Small', 'صغير', 0], ['o-m', 'Medium', 'وسط', 0.5], ['o-l', 'Large', 'كبير', 1],
]);
const milk = g('g-milk', 'Milk', 'الحليب', false, false, [
  ['o-full', 'Full fat', 'كامل الدسم', 0], ['o-skim', 'Skimmed', 'خالي الدسم', 0], ['o-oat', 'Oat', 'شوفان', 0.6], ['o-alm', 'Almond', 'لوز', 0.6],
]);
const extras = g('g-extra', 'Extras', 'إضافات', false, true, [
  ['o-shot', 'Extra shot', 'جرعة إضافية', 0.6], ['o-van', 'Vanilla syrup', 'شراب الفانيليا', 0.4], ['o-car', 'Caramel syrup', 'شراب الكراميل', 0.4], ['o-cream', 'Whipped cream', 'كريمة مخفوقة', 0.4],
]);

const foodZones: DeliveryZone[] = [
  { id: 'z1', name: { en: 'Nearby (0–3 km)', ar: 'قريب (0–3 كم)' }, fee: 1.5, eta: 25 },
  { id: 'z2', name: { en: 'City (3–8 km)', ar: 'المدينة (3–8 كم)' }, fee: 3, eta: 40 },
  { id: 'z3', name: { en: 'Outskirts (8–15 km)', ar: 'الضواحي (8–15 كم)' }, fee: 5, eta: 55 },
];

const allOn: Modules = {
  ordering: true, delivery: true, pickup: true, dineIn: true, loyaltyPoints: true, loyaltyStamps: true, vipTiers: true,
  staticQr: true, deals: true, campaigns: true, reservations: true,
  wallet: true, tips: true, reviews: true, referrals: true, tableQr: true,
};

const tag = (list: Product[], map: Record<string, Partial<Product>>) =>
  list.forEach((x) => map[x.id] && Object.assign(x, map[x.id]));

// ── RESTAURANT ──────────────────────────────────────────────────
n = 100;
const restaurant: Preset = {
  industry: 'restaurant',
  label: { en: 'Restaurant', ar: 'مطعم' },
  emoji: '🍔',
  blurb: { en: 'Menu, delivery, table booking, loyalty', ar: 'قائمة طعام، توصيل، حجز طاولات، ولاء' },
  sampleName: { en: 'Urban Grill', ar: 'أوربان غريل' },
  sampleTagline: { en: 'Flame-grilled. Made fresh.', ar: 'مشوي على الفحم. طازج دائماً.' },
  logoEmoji: '🔥',
  palette: { primary: '#c2410c', secondary: '#fde68a' },
  font: 'modern',
  radius: 'soft',
  hours: ['11:00', '23:30'],
  modules: { ...allOn, loyaltyStamps: false, wallet: false },
  terms: {
    catalog: { en: 'Menu', ar: 'القائمة' },
    reserve: { en: 'Book a table', ar: 'احجز طاولة' },
    reserveCta: { en: 'Reserve', ar: 'احجز' },
    party: { en: 'Guests', ar: 'عدد الأشخاص' },
    delivery: { en: 'Delivery', ar: 'توصيل' },
    kitchen: { en: 'Kitchen', ar: 'المطبخ' },
  },
  pointsPerUnit: 10,
  stampsTarget: 10,
  stampReward: { en: 'Free burger', ar: 'برغر مجاني' },
  stampRule: 'perOrder',
  stampCategoryIds: [],
  zones: foodZones,
  categories: [
    { id: 'c-burg', name: { en: 'Burgers', ar: 'برغر' }, emoji: '🍔' },
    { id: 'c-grill', name: { en: 'Grills', ar: 'مشاوي' }, emoji: '🍢' },
    { id: 'c-salad', name: { en: 'Salads', ar: 'سلطات' }, emoji: '🥗' },
    { id: 'c-side', name: { en: 'Sides', ar: 'مقبلات' }, emoji: '🍟' },
    { id: 'c-dess', name: { en: 'Desserts', ar: 'حلويات' }, emoji: '🍰' },
    { id: 'c-drink', name: { en: 'Drinks', ar: 'مشروبات' }, emoji: '🥤' },
  ],
  products: [
    p('c-burg', 'Classic Smash Burger', 'برغر سماش كلاسيك', 'Double smashed beef, cheddar, pickles, house sauce.', 'لحم بقري مزدوج، شيدر، مخلل، صلصة البيت.', 8.5, '🍔', '#fde7d4', { popular: true, groups: [burgerSide, burgerAddons] }),
    p('c-burg', 'Truffle Mushroom Burger', 'برغر الفطر والترافل', 'Swiss cheese, sautéed mushrooms, truffle mayo.', 'جبنة سويسرية، فطر سوتيه، مايونيز الترافل.', 10.5, '🍄', '#efe4d6', { isNew: true, groups: [burgerSide, burgerAddons] }),
    p('c-burg', 'Crispy Chicken Burger', 'برغر الدجاج المقرمش', 'Buttermilk fried chicken, slaw, spicy mayo.', 'دجاج مقلي مقرمش، كول سلو، مايونيز حار.', 8, '🍗', '#fdecc8', { groups: [burgerSide, burgerAddons] }),
    p('c-grill', 'Shish Tawook Platter', 'صحن شيش طاووق', 'Marinated chicken skewers, garlic sauce, pickles.', 'أسياخ دجاج متبلة، ثوم، مخلل.', 11, '🍢', '#fbe3c4', { popular: true, groups: [grillBread] }),
    p('c-grill', 'Mixed Grill', 'مشاوي مشكلة', 'Tawook, kafta and beef skewers for one.', 'طاووق، كفتة ولحم لشخص واحد.', 16, '🥩', '#f8d7cf', { groups: [grillBread] }),
    p('c-grill', 'Kafta Platter', 'صحن كفتة', 'Charcoal-grilled minced beef with parsley & onion.', 'لحم مفروم مشوي مع البقدونس والبصل.', 10, '🔥', '#fde2d0', { groups: [grillBread] }),
    p('c-salad', 'Fattoush', 'فتوش', 'Crisp vegetables, toasted bread, sumac dressing.', 'خضار طازجة، خبز محمص، صلصة السماق.', 5.5, '🥗', '#e3f4d7', { popular: true }),
    p('c-salad', 'Chicken Caesar', 'سيزر بالدجاج', 'Romaine, grilled chicken, parmesan, croutons.', 'خس، دجاج مشوي، بارميزان، خبز محمص.', 7.5, '🥬', '#e6f2dc'),
    p('c-salad', 'Tabbouleh', 'تبولة', 'Parsley, tomato, bulgur, lemon & olive oil.', 'بقدونس، بندورة، برغل، ليمون وزيت زيتون.', 5, '🌿', '#dff1d6'),
    p('c-side', 'Fries', 'بطاطا مقلية', 'Golden and crispy, sea salt.', 'ذهبية ومقرمشة مع ملح البحر.', 3, '🍟', '#fff1c7'),
    p('c-side', 'Loaded Fries', 'بطاطا محمّلة', 'Cheese sauce, jalapeños, crispy onions.', 'صلصة الجبنة، هالبينو، بصل مقرمش.', 5.5, '🧀', '#ffe9b8', { isNew: true }),
    p('c-side', 'Hummus', 'حمص', 'Creamy chickpeas, tahini, olive oil.', 'حمص كريمي، طحينة، زيت زيتون.', 4, '🫘', '#f3e8d2'),
    p('c-dess', 'Molten Chocolate Cake', 'كيك الشوكولا الذائبة', 'Warm centre, vanilla ice cream.', 'قلب دافئ مع آيس كريم الفانيليا.', 6, '🍫', '#eadbd3'),
    p('c-dess', 'Kunafa', 'كنافة', 'Warm cheese kunafa with syrup and pistachio.', 'كنافة بالجبنة مع القطر والفستق.', 6.5, '🧁', '#fbe6c8', { popular: true }),
    p('c-drink', 'Mint Lemonade', 'ليموناضة بالنعنع', 'Fresh lemons, mint, crushed ice.', 'ليمون طازج، نعنع، ثلج مجروش.', 4, '🍋', '#f2f8c9', { groups: [drinkSize] }),
    p('c-drink', 'Soft Drink', 'مشروب غازي', 'Cola, diet cola, orange or lemon.', 'كولا، دايت، برتقال أو ليمون.', 2, '🥤', '#e2ecf8'),
    p('c-drink', 'Fresh Orange Juice', 'عصير برتقال طازج', 'Squeezed to order.', 'معصور عند الطلب.', 4.5, '🍊', '#ffe6c7', { groups: [drinkSize] }),
    p('c-drink', 'Water', 'مياه', '500 ml still water.', 'مياه 500 مل.', 1, '💧', '#e3f1fb'),
  ],
  rewards: [
    { id: 'rw1', name: { en: 'Free soft drink', ar: 'مشروب غازي مجاني' }, cost: 100, kind: 'item', value: 0, productId: 'p116', emoji: '🥤', active: true },
    { id: 'rw2', name: { en: 'Free fries', ar: 'بطاطا مجانية' }, cost: 150, kind: 'item', value: 0, productId: 'p110', emoji: '🍟', active: true },
    { id: 'rw3', name: { en: '$5 off your order', ar: 'خصم 5$ على طلبك' }, cost: 300, kind: 'discount', value: 5, emoji: '💸', active: true },
    { id: 'rw4', name: { en: 'Free dessert', ar: 'حلوى مجانية' }, cost: 400, kind: 'item', value: 0, productId: 'p114', emoji: '🍰', active: true },
  ],
  deals: [
    { id: 'd1', title: { en: '20% off your first order', ar: 'خصم 20% على طلبك الأول' }, desc: { en: 'Use code WELCOME20 at checkout.', ar: 'استخدم الرمز WELCOME20 عند الدفع.' }, code: 'WELCOME20', kind: 'percent', value: 20, minOrder: 0, emoji: '🎉', bg: '#fde68a', active: true },
    { id: 'd2', title: { en: 'Free delivery over $25', ar: 'توصيل مجاني فوق 25$' }, desc: { en: 'Every day, every zone.', ar: 'كل يوم ولكل المناطق.' }, code: 'FREEDEL', kind: 'freeDelivery', value: 0, minOrder: 25, emoji: '🛵', bg: '#d9f99d', active: true },
    { id: 'd3', title: { en: 'Flash: $5 off orders over $30', ar: 'عرض سريع: خصم 5$ فوق 30$' }, desc: { en: 'Today only — hurry!', ar: 'اليوم فقط — أسرع!' }, code: 'FLASH5', kind: 'fixed', value: 5, minOrder: 30, emoji: '⚡', bg: '#fecaca', active: true, flashHours: 6 },
  ],
  banners: [
    { id: 'b1', title: { en: 'New: Truffle Burger', ar: 'جديد: برغر الترافل' }, subtitle: { en: 'Rich, earthy, unforgettable.', ar: 'غني ولا يُنسى.' }, emoji: '🍄', bg: '#7c2d12' },
    { id: 'b2', title: { en: 'Earn points on every bite', ar: 'اجمع النقاط مع كل لقمة' }, subtitle: { en: '10 points for every $1', ar: '10 نقاط مقابل كل 1$' }, emoji: '⭐', bg: '#92400e' },
    { id: 'b3', title: { en: 'Book your table', ar: 'احجز طاولتك' }, subtitle: { en: 'Weekends fill up fast.', ar: 'عطلة نهاية الأسبوع تمتلئ بسرعة.' }, emoji: '🍽️', bg: '#1f2937' },
  ],
  reservations: { slotMinutes: 30, capacityPerSlot: 6, maxParty: 12 },
};

// ── CAFÉ ────────────────────────────────────────────────────────
n = 200;
const cafe: Preset = {
  industry: 'cafe',
  label: { en: 'Café', ar: 'مقهى' },
  emoji: '☕',
  blurb: { en: 'Pickup orders, stamp cards, rewards', ar: 'طلبات استلام، بطاقات أختام، مكافآت' },
  sampleName: { en: 'Bean & Co.', ar: 'بين آند كو' },
  sampleTagline: { en: 'Specialty coffee, baked daily.', ar: 'قهوة مختصة ومخبوزات يومية.' },
  logoEmoji: '☕',
  palette: { primary: '#4a2c20', secondary: '#d9a066' },
  font: 'classic',
  radius: 'round',
  hours: ['07:00', '22:00'],
  modules: { ...allOn, vipTiers: true },
  terms: {
    catalog: { en: 'Menu', ar: 'القائمة' },
    reserve: { en: 'Reserve a spot', ar: 'احجز مكاناً' },
    reserveCta: { en: 'Reserve', ar: 'احجز' },
    party: { en: 'People', ar: 'الأشخاص' },
    delivery: { en: 'Delivery', ar: 'توصيل' },
    kitchen: { en: 'Bar', ar: 'البار' },
  },
  pointsPerUnit: 10,
  stampsTarget: 8,
  stampReward: { en: 'Free coffee of your choice', ar: 'قهوة مجانية من اختيارك' },
  stampRule: 'perItem',
  stampCategoryIds: ['c-hot', 'c-cold'],
  zones: foodZones,
  categories: [
    { id: 'c-hot', name: { en: 'Coffee', ar: 'قهوة' }, emoji: '☕' },
    { id: 'c-cold', name: { en: 'Iced', ar: 'مثلجات' }, emoji: '🧊' },
    { id: 'c-tea', name: { en: 'Tea', ar: 'شاي' }, emoji: '🍵' },
    { id: 'c-bake', name: { en: 'Bakery', ar: 'مخبوزات' }, emoji: '🥐' },
    { id: 'c-sweet', name: { en: 'Sweets', ar: 'حلويات' }, emoji: '🍰' },
  ],
  products: [
    p('c-hot', 'Espresso', 'إسبريسو', 'Double shot, house blend.', 'جرعة مزدوجة من مزيج البيت.', 2.5, '☕', '#efe2d6', { groups: [extras] }),
    p('c-hot', 'Americano', 'أمريكانو', 'Espresso with hot water.', 'إسبريسو مع ماء ساخن.', 3, '☕', '#eadccf', { groups: [coffeeSize, extras] }),
    p('c-hot', 'Cappuccino', 'كابتشينو', 'Equal parts espresso, milk and foam.', 'إسبريسو وحليب ورغوة بالتساوي.', 3.8, '☕', '#f1e4d4', { popular: true, groups: [coffeeSize, milk, extras] }),
    p('c-hot', 'Flat White', 'فلات وايت', 'Velvety micro-foam, strong and smooth.', 'رغوة ناعمة، قوية ومتوازنة.', 4, '🥛', '#f4ebe0', { groups: [coffeeSize, milk, extras] }),
    p('c-hot', 'Spanish Latte', 'سبانش لاتيه', 'Sweet condensed milk and espresso.', 'حليب مكثف محلى مع إسبريسو.', 4.5, '🍮', '#f6e3c8', { popular: true, groups: [coffeeSize, milk, extras] }),
    p('c-hot', 'Turkish Coffee', 'قهوة تركية', 'Cardamom optional, served with water.', 'مع الهيل حسب الرغبة، تُقدّم مع الماء.', 2.5, '🫖', '#e8d6c6'),
    p('c-cold', 'Iced Latte', 'آيس لاتيه', 'Espresso over ice and cold milk.', 'إسبريسو على الثلج مع حليب بارد.', 4.5, '🧋', '#e4eef6', { popular: true, groups: [coffeeSize, milk, extras] }),
    p('c-cold', 'Cold Brew', 'كولد برو', 'Steeped 18 hours. Smooth and bold.', 'منقوع 18 ساعة. ناعم وقوي.', 4.2, '🧊', '#dde8ef', { groups: [coffeeSize] }),
    p('c-cold', 'Iced Matcha', 'آيس ماتشا', 'Ceremonial matcha, milk, ice.', 'ماتشا فاخرة مع حليب وثلج.', 5, '🍵', '#e1f1d9', { isNew: true, groups: [coffeeSize, milk] }),
    p('c-cold', 'Mango Smoothie', 'سموذي المانجو', 'Mango, yogurt, honey.', 'مانجو، لبن، عسل.', 5, '🥭', '#ffe9c2'),
    p('c-tea', 'Chai Latte', 'شاي لاتيه', 'Spiced black tea with steamed milk.', 'شاي أسود بالبهارات مع حليب.', 4, '🫖', '#f2e1cf', { groups: [coffeeSize, milk] }),
    p('c-tea', 'Fresh Mint Tea', 'شاي بالنعنع', 'Green tea and fresh mint.', 'شاي أخضر ونعنع طازج.', 2.8, '🌿', '#e2f3dc'),
    p('c-bake', 'Butter Croissant', 'كرواسون بالزبدة', 'Flaky, baked every morning.', 'هش ويُخبز كل صباح.', 2.8, '🥐', '#fbe9c9', { popular: true }),
    p('c-bake', 'Pain au Chocolat', 'كرواسون بالشوكولا', 'Dark chocolate batons.', 'بقطع الشوكولا الداكنة.', 3.2, '🍫', '#efdcd0'),
    p('c-bake', 'Zaatar Croissant', 'كرواسون بالزعتر', 'Zaatar, olive oil, labneh.', 'زعتر، زيت زيتون، لبنة.', 3.5, '🌿', '#e9edd0', { isNew: true }),
    p('c-bake', 'Cheese Toastie', 'توست بالجبنة', 'Three cheeses on sourdough.', 'ثلاثة أنواع جبنة على خبز العجين المخمر.', 5.5, '🧀', '#fff0c4'),
    p('c-sweet', 'San Sebastián Cheesecake', 'تشيز كيك سان سيباستيان', 'Burnt top, creamy centre.', 'سطح محروق وقلب كريمي.', 5.5, '🍰', '#f7e6cf', { popular: true }),
    p('c-sweet', 'Chocolate Chip Cookie', 'كوكيز بالشوكولا', 'Crispy edges, gooey middle.', 'أطراف مقرمشة وقلب طري.', 2.2, '🍪', '#f1dfcc'),
  ],
  rewards: [
    { id: 'rw1', name: { en: 'Free croissant', ar: 'كرواسون مجاني' }, cost: 120, kind: 'item', value: 0, productId: 'p213', emoji: '🥐', active: true },
    { id: 'rw2', name: { en: 'Free coffee', ar: 'قهوة مجانية' }, cost: 200, kind: 'item', value: 0, productId: 'p203', emoji: '☕', active: true },
    { id: 'rw3', name: { en: '$3 off your order', ar: 'خصم 3$ على طلبك' }, cost: 250, kind: 'discount', value: 3, emoji: '💸', active: true },
    { id: 'rw4', name: { en: 'Free cheesecake slice', ar: 'قطعة تشيز كيك مجانية' }, cost: 400, kind: 'item', value: 0, productId: 'p217', emoji: '🍰', active: true },
  ],
  deals: [
    { id: 'd1', title: { en: 'Happy hour: 25% off', ar: 'ساعة السعادة: خصم 25%' }, desc: { en: 'Every day 3–5 pm. Code HAPPY25.', ar: 'يومياً 3–5 مساءً. الرمز HAPPY25.' }, code: 'HAPPY25', kind: 'percent', value: 25, minOrder: 0, emoji: '🕒', bg: '#fde68a', active: true },
    { id: 'd2', title: { en: 'First order? 15% off', ar: 'طلبك الأول؟ خصم 15%' }, desc: { en: 'Welcome to the family.', ar: 'أهلاً بك في عائلتنا.' }, code: 'HELLO15', kind: 'percent', value: 15, minOrder: 0, emoji: '👋', bg: '#e9d5ff', active: true },
    { id: 'd3', title: { en: 'Flash: $2 off pastries', ar: 'عرض سريع: خصم 2$ على المخبوزات' }, desc: { en: 'Until the oven empties!', ar: 'حتى نفاد الكمية!' }, code: 'BAKE2', kind: 'fixed', value: 2, minOrder: 6, emoji: '⚡', bg: '#fecaca', active: true, flashHours: 4 },
  ],
  banners: [
    { id: 'b1', title: { en: 'Meet the Iced Matcha', ar: 'تعرّف على الآيس ماتشا' }, subtitle: { en: 'Our new summer favourite.', ar: 'مفضّلتنا الجديدة لهذا الصيف.' }, emoji: '🍵', bg: '#3f6212' },
    { id: 'b2', title: { en: 'Buy 7, get the 8th free', ar: 'اشترِ 7 والثامنة مجاناً' }, subtitle: { en: 'Collect stamps on every coffee.', ar: 'اجمع الأختام مع كل قهوة.' }, emoji: '☕', bg: '#4a2c20' },
    { id: 'b3', title: { en: 'Order ahead, skip the line', ar: 'اطلب مسبقاً وتجاوز الطابور' }, subtitle: { en: 'Ready when you arrive.', ar: 'جاهز عند وصولك.' }, emoji: '🏃', bg: '#78350f' },
  ],
  reservations: { slotMinutes: 60, capacityPerSlot: 4, maxParty: 8 },
};

// ── BAKERY, PASTRY & DESSERTS ──────────────────────────────────
n = 400;
const cakeSize = g('g-cake', 'Size', 'الحجم', true, false, [['o-slice', 'Slice', 'قطعة', 0], ['o-6', 'Whole 6"', 'كاملة 6 إنش', 22], ['o-8', 'Whole 8"', 'كاملة 8 إنش', 32]]);
const boxOf = g('g-box', 'Box', 'العلبة', true, false, [['o-b1', 'Single', 'قطعة', 0], ['o-b6', 'Box of 6', 'علبة 6', 9], ['o-b12', 'Box of 12', 'علبة 12', 19]]);
const message = g('g-msg', 'Message on the cake', 'عبارة على الكيك', false, false, [['o-msg', 'Add a written message', 'أضف عبارة مكتوبة', 2]]);
const bakery: Preset = {
  industry: 'bakery',
  label: { en: 'Bakery & desserts', ar: 'مخبز وحلويات' },
  emoji: '🥐',
  blurb: { en: 'Daily bakes, cakes to order, pickup & delivery', ar: 'مخبوزات يومية، كيك حسب الطلب، استلام وتوصيل' },
  sampleName: { en: 'Golden Crumb', ar: 'غولدن كرامب' },
  sampleTagline: { en: 'Baked at dawn. Gone by noon.', ar: 'يُخبز فجراً وينفد ظهراً.' },
  logoEmoji: '🥐',
  palette: { primary: '#9a3412', secondary: '#fcd9a8' },
  font: 'classic',
  radius: 'round',
  hours: ['06:30', '21:00'],
  modules: { ...allOn, dineIn: false, tableQr: false, tips: false, vipTiers: false },
  terms: {
    catalog: { en: 'Shop', ar: 'المتجر' },
    reserve: { en: 'Order a custom cake', ar: 'اطلب كيك خاص' },
    reserveCta: { en: 'Book', ar: 'احجز' },
    party: { en: 'Servings', ar: 'عدد الحصص' },
    delivery: { en: 'Delivery', ar: 'توصيل' },
    kitchen: { en: 'Bakery', ar: 'المخبز' },
  },
  pointsPerUnit: 10,
  stampsTarget: 10,
  stampReward: { en: 'Free box of 6 pastries', ar: 'علبة 6 معجنات مجاناً' },
  stampRule: 'perOrder',
  stampCategoryIds: [],
  zones: foodZones,
  categories: [
    { id: 'c-morning', name: { en: 'Morning bakes', ar: 'مخبوزات الصباح' }, emoji: '🌅', availableFrom: '06:30', availableTo: '12:00' },
    { id: 'c-bread', name: { en: 'Breads', ar: 'خبز' }, emoji: '🍞' },
    { id: 'c-cakes', name: { en: 'Cakes', ar: 'كيك' }, emoji: '🎂' },
    { id: 'c-sweets', name: { en: 'Pastries & sweets', ar: 'معجنات وحلويات' }, emoji: '🧁' },
    { id: 'c-drinks', name: { en: 'Drinks', ar: 'مشروبات' }, emoji: '☕' },
  ],
  products: [
    p('c-morning', 'Butter Croissant', 'كرواسون بالزبدة', 'Laminated with French butter, 27 layers.', 'بالزبدة الفرنسية، 27 طبقة.', 2.5, '🥐', '#fde9c7', { popular: true, stock: 18, groups: [boxOf], allergens: ['gluten', 'dairy', 'eggs'], calories: 280 }),
    p('c-morning', 'Zaatar Manousheh', 'منقوشة زعتر', 'Stone-baked, extra olive oil.', 'على الصاج مع زيت زيتون إضافي.', 2, '🫓', '#eef0d4', { popular: true, allergens: ['gluten', 'sesame'], calories: 420 }),
    p('c-morning', 'Cheese Kaak', 'كعك بالجبنة', 'Sesame kaak with akkawi cheese.', 'كعك بالسمسم مع جبنة عكاوي.', 3, '🥯', '#f8e7c9', { allergens: ['gluten', 'sesame', 'dairy'], calories: 390 }),
    p('c-bread', 'Sourdough Loaf', 'رغيف خبز مخمّر', '36-hour ferment, crackling crust.', 'تخمير 36 ساعة وقشرة مقرمشة.', 6, '🍞', '#efdcc2', { stock: 9, allergens: ['gluten'], tags: ['vegan'] }),
    p('c-bread', 'Baguette', 'باغيت', 'Classic French stick, baked every 2 hours.', 'باغيت فرنسي يُخبز كل ساعتين.', 2.5, '🥖', '#f3e3c5', { allergens: ['gluten'], tags: ['vegan'] }),
    p('c-bread', 'Multigrain Loaf', 'خبز الحبوب', 'Seeds, oats and rye.', 'بذور وشوفان وجاودار.', 5.5, '🌾', '#e8dcc4', { allergens: ['gluten', 'sesame'], tags: ['healthy', 'vegan'] }),
    p('c-cakes', 'Chocolate Fudge Cake', 'كيك الشوكولا', 'Three layers of dark chocolate ganache.', 'ثلاث طبقات من غاناش الشوكولا الداكنة.', 5.5, '🍫', '#ead7cc', { popular: true, groups: [cakeSize, message], allergens: ['gluten', 'dairy', 'eggs'], calories: 520, prepMinutes: 120 }),
    p('c-cakes', 'Strawberry Shortcake', 'كيك الفراولة', 'Vanilla sponge, cream, fresh strawberries.', 'إسفنج فانيليا، كريمة وفراولة طازجة.', 5, '🍰', '#fde2e4', { isNew: true, groups: [cakeSize, message], allergens: ['gluten', 'dairy', 'eggs'], calories: 410, prepMinutes: 120 }),
    p('c-cakes', 'Lotus Cheesecake', 'تشيز كيك لوتس', 'Biscoff base, creamy baked filling.', 'قاعدة لوتس وحشوة كريمية مخبوزة.', 6, '🧀', '#f6e5cf', { popular: true, groups: [cakeSize], allergens: ['gluten', 'dairy', 'eggs'], calories: 560 }),
    p('c-sweets', 'Pistachio Maamoul', 'معمول بالفستق', 'Semolina, rose water, Aleppo pistachio.', 'سميد وماء ورد وفستق حلبي.', 1.5, '🥮', '#eaf0d6', { groups: [boxOf], allergens: ['gluten', 'nuts', 'dairy'], calories: 180 }),
    p('c-sweets', 'Pain au Chocolat', 'كرواسون بالشوكولا', 'Two batons of dark chocolate.', 'قطعتان من الشوكولا الداكنة.', 3, '🍫', '#efdcd0', { groups: [boxOf], allergens: ['gluten', 'dairy', 'eggs'] }),
    p('c-sweets', 'Cinnamon Roll', 'لفائف القرفة', 'Cream cheese frosting, still warm.', 'كريمة الجبن، دافئة.', 3.5, '🌀', '#f5e1c8', { isNew: true, allergens: ['gluten', 'dairy', 'eggs'], calories: 450 }),
    p('c-sweets', 'Macarons', 'ماكرون', 'Assorted flavours.', 'نكهات متنوعة.', 1.8, '🍬', '#fbe3ef', { groups: [boxOf], allergens: ['nuts', 'eggs', 'dairy'], tags: ['glutenFree'] }),
    p('c-drinks', 'Cappuccino', 'كابتشينو', 'Double shot, silky milk.', 'جرعة مزدوجة وحليب ناعم.', 3.5, '☕', '#efe2d6', { allergens: ['dairy'] }),
    p('c-drinks', 'Fresh Orange Juice', 'عصير برتقال', 'Squeezed to order.', 'معصور عند الطلب.', 4, '🍊', '#ffe6c7', { tags: ['vegan', 'healthy'] }),
  ],
  rewards: [
    { id: 'rw1', name: { en: 'Free croissant', ar: 'كرواسون مجاني' }, cost: 100, kind: 'item', value: 0, productId: 'p401', emoji: '🥐', active: true },
    { id: 'rw2', name: { en: 'Free cinnamon roll', ar: 'لفائف قرفة مجانية' }, cost: 150, kind: 'item', value: 0, productId: 'p412', emoji: '🌀', active: true },
    { id: 'rw3', name: { en: '$5 off your order', ar: 'خصم 5$' }, cost: 300, kind: 'discount', value: 5, emoji: '💸', active: true },
    { id: 'rw4', name: { en: 'Free cake slice', ar: 'قطعة كيك مجانية' }, cost: 350, kind: 'item', value: 0, productId: 'p407', emoji: '🍰', active: true },
  ],
  deals: [
    { id: 'd1', title: { en: 'Morning bundle: 6 croissants', ar: 'باقة الصباح: 6 كرواسون' }, desc: { en: 'Before 10 am, code MORNING6.', ar: 'قبل العاشرة، الرمز MORNING6.' }, code: 'MORNING6', kind: 'percent', value: 15, minOrder: 10, emoji: '🌅', bg: '#fde68a', active: true },
    { id: 'd2', title: { en: 'Free delivery over $20', ar: 'توصيل مجاني فوق 20$' }, desc: { en: 'Fresh to your door.', ar: 'طازج حتى بابك.' }, code: 'FRESH20', kind: 'freeDelivery', value: 0, minOrder: 20, emoji: '🛵', bg: '#d9f99d', active: true },
    { id: 'd3', title: { en: 'End of day: 30% off', ar: 'نهاية اليوم: خصم 30%' }, desc: { en: 'Today’s bakes, before we close.', ar: 'مخبوزات اليوم قبل الإغلاق.' }, code: 'LASTCALL', kind: 'percent', value: 30, minOrder: 0, emoji: '⚡', bg: '#fecaca', active: true, flashHours: 3 },
  ],
  banners: [
    { id: 'b1', title: { en: 'Out of the oven', ar: 'خرج للتو من الفرن' }, subtitle: { en: 'Croissants every morning from 6:30.', ar: 'كرواسون كل صباح من 6:30.' }, emoji: '🥐', bg: '#9a3412' },
    { id: 'b2', title: { en: 'Cakes for every occasion', ar: 'كيك لكل مناسبة' }, subtitle: { en: 'Order 24 hours ahead.', ar: 'اطلب قبل 24 ساعة.' }, emoji: '🎂', bg: '#7c2d12' },
    { id: 'b3', title: { en: 'Collect your 10th box free', ar: 'العلبة العاشرة مجاناً' }, subtitle: { en: 'One stamp per order.', ar: 'ختم مع كل طلب.' }, emoji: '🎁', bg: '#57534e' },
  ],
  reservations: { slotMinutes: 60, capacityPerSlot: 3, maxParty: 60 },
};

// ── PIZZERIA, BURGERS & FAST FOOD ──────────────────────────────
n = 500;
const pizzaSize = g('g-psize', 'Size', 'الحجم', true, false, [['o-ps', 'Small 8"', 'صغير', 0], ['o-pm', 'Medium 12"', 'وسط', 3], ['o-pl', 'Large 14"', 'كبير', 5]]);
const crust = g('g-crust', 'Crust', 'العجينة', true, false, [['o-cl', 'Classic', 'كلاسيك', 0], ['o-th', 'Thin', 'رقيقة', 0], ['o-st', 'Cheese-stuffed', 'محشوة بالجبنة', 2]]);
const toppings = g('g-top', 'Extra toppings', 'إضافات', false, true, [['o-t1', 'Mushrooms', 'فطر', 1], ['o-t2', 'Olives', 'زيتون', 1], ['o-t3', 'Jalapeños', 'هالبينو', 1], ['o-t4', 'Extra mozzarella', 'موزاريلا إضافية', 1.5], ['o-t5', 'Pepperoni', 'بيبروني', 2]]);
toppings.max = 3;
const sauces = g('g-sauce', 'Dips (up to 2)', 'صلصات (حتى 2)', false, true, [['o-s1', 'Garlic', 'ثوم', 0.5], ['o-s2', 'BBQ', 'باربيكيو', 0.5], ['o-s3', 'Ranch', 'رانش', 0.5], ['o-s4', 'Spicy mayo', 'مايونيز حار', 0.5]]);
sauces.max = 2;
const comboBurger = g('g-cb', 'Choose your burger', 'اختر البرغر', true, false, [['o-cb1', 'Classic beef', 'لحم كلاسيك', 0], ['o-cb2', 'Crispy chicken', 'دجاج مقرمش', 0], ['o-cb3', 'Double smash', 'سماش مزدوج', 2.5]]);
const comboSide = g('g-cs', 'Choose a side', 'اختر طبقاً جانبياً', true, false, [['o-cs1', 'Fries', 'بطاطا', 0], ['o-cs2', 'Curly fries', 'بطاطا حلزونية', 1], ['o-cs3', 'Onion rings', 'حلقات البصل', 1]]);
const comboDrink = g('g-cd', 'Choose a drink', 'اختر مشروباً', true, false, [['o-cd1', 'Cola', 'كولا', 0], ['o-cd2', 'Diet cola', 'دايت', 0], ['o-cd3', 'Lemonade', 'ليموناضة', 1]]);
const fastfood: Preset = {
  industry: 'fastfood',
  label: { en: 'Pizzeria & fast food', ar: 'بيتزا ووجبات سريعة' },
  emoji: '🍕',
  blurb: { en: 'Meal deals, fast delivery, riders & cash', ar: 'وجبات كومبو، توصيل سريع، سائقون ونقود' },
  sampleName: { en: 'Slice Station', ar: 'سلايس ستيشن' },
  sampleTagline: { en: 'Hot, fast and at your door.', ar: 'ساخن وسريع وعلى بابك.' },
  logoEmoji: '🍕',
  palette: { primary: '#dc2626', secondary: '#facc15' },
  font: 'friendly',
  radius: 'round',
  hours: ['11:00', '01:00'],
  modules: { ...allOn, reservations: false, loyaltyStamps: true, vipTiers: false },
  terms: {
    catalog: { en: 'Menu', ar: 'القائمة' },
    reserve: { en: 'Book a party order', ar: 'احجز طلب حفلة' },
    reserveCta: { en: 'Book', ar: 'احجز' },
    party: { en: 'Guests', ar: 'الضيوف' },
    delivery: { en: 'Delivery', ar: 'توصيل' },
    kitchen: { en: 'Kitchen', ar: 'المطبخ' },
  },
  pointsPerUnit: 10,
  stampsTarget: 8,
  stampReward: { en: 'Free medium pizza', ar: 'بيتزا وسط مجانية' },
  stampRule: 'perOrder',
  stampCategoryIds: [],
  zones: foodZones,
  categories: [
    { id: 'c-deals', name: { en: 'Meal deals', ar: 'وجبات كومبو' }, emoji: '🔥' },
    { id: 'c-pizza', name: { en: 'Pizza', ar: 'بيتزا' }, emoji: '🍕' },
    { id: 'c-burg', name: { en: 'Burgers', ar: 'برغر' }, emoji: '🍔' },
    { id: 'c-chicken', name: { en: 'Chicken', ar: 'دجاج' }, emoji: '🍗' },
    { id: 'c-sides', name: { en: 'Sides', ar: 'مقبلات' }, emoji: '🍟' },
    { id: 'c-drinks', name: { en: 'Drinks', ar: 'مشروبات' }, emoji: '🥤' },
  ],
  products: [
    p('c-deals', 'Burger Meal', 'وجبة برغر', 'Any burger + side + drink.', 'أي برغر + طبق جانبي + مشروب.', 11, '🍔', '#fde7d4', { popular: true, compareAt: 14, groups: [comboBurger, comboSide, comboDrink], tags: ['bestseller'], allergens: ['gluten', 'dairy', 'sesame'] }),
    p('c-deals', 'Pizza Night for 2', 'سهرة بيتزا لشخصين', '2 medium pizzas + garlic bread + 2 drinks.', 'بيتزا وسط ×2 + خبز بالثوم + مشروبان.', 24, '🍕', '#fee2e2', { popular: true, compareAt: 31, groups: [crust], allergens: ['gluten', 'dairy'] }),
    p('c-deals', 'Family Bucket', 'دلو العائلة', '12 crispy pieces, 2 large fries, 4 dips.', '12 قطعة مقرمشة، بطاطا كبيرة ×2، 4 صلصات.', 29, '🪣', '#fef3c7', { compareAt: 36, allergens: ['gluten', 'eggs'] }),
    p('c-pizza', 'Margherita', 'مارغريتا', 'Tomato, mozzarella, basil.', 'بندورة، موزاريلا، ريحان.', 9, '🍕', '#fee2e2', { groups: [pizzaSize, crust, toppings], tags: ['vegetarian'], allergens: ['gluten', 'dairy'], calories: 780 }),
    p('c-pizza', 'Pepperoni', 'بيبروني', 'Double pepperoni, mozzarella.', 'بيبروني مزدوج وموزاريلا.', 11, '🍕', '#fecaca', { popular: true, groups: [pizzaSize, crust, toppings], allergens: ['gluten', 'dairy'], calories: 920 }),
    p('c-pizza', 'BBQ Chicken', 'دجاج باربيكيو', 'Grilled chicken, red onion, BBQ.', 'دجاج مشوي، بصل أحمر، باربيكيو.', 12, '🍗', '#fde8d4', { groups: [pizzaSize, crust, toppings], allergens: ['gluten', 'dairy'] }),
    p('c-pizza', 'Veggie Supreme', 'خضار سوبريم', 'Peppers, mushrooms, olives, onion.', 'فليفلة، فطر، زيتون، بصل.', 10.5, '🫑', '#e3f4d7', { groups: [pizzaSize, crust, toppings], tags: ['vegetarian'], allergens: ['gluten', 'dairy'] }),
    p('c-burg', 'Classic Cheeseburger', 'تشيز برغر كلاسيك', 'Beef, cheddar, pickles, house sauce.', 'لحم، شيدر، مخلل، صلصة البيت.', 7.5, '🍔', '#fde7d4', { popular: true, groups: [burgerAddons], allergens: ['gluten', 'dairy', 'sesame'], calories: 640 }),
    p('c-burg', 'Double Smash', 'سماش مزدوج', 'Two smashed patties, double cheese.', 'قطعتان مضغوطتان وجبنة مزدوجة.', 9.5, '🍔', '#fbd9c4', { isNew: true, groups: [burgerAddons], allergens: ['gluten', 'dairy', 'sesame'], calories: 910 }),
    p('c-burg', 'Zinger Burger', 'زنجر برغر', 'Spicy crispy chicken, lettuce, mayo.', 'دجاج مقرمش حار، خس، مايونيز.', 7, '🌶️', '#fdecc8', { groups: [burgerAddons], tags: ['spicy'], allergens: ['gluten', 'eggs'] }),
    p('c-chicken', 'Crispy Tenders (5)', 'أصابع دجاج (5)', 'Hand-breaded, with 2 dips.', 'مقرمشة مع صلصتين.', 7.5, '🍗', '#fdecc8', { groups: [sauces], tags: ['kids'], allergens: ['gluten', 'eggs'] }),
    p('c-chicken', 'Hot Wings (8)', 'أجنحة حارة (8)', 'Buffalo sauce, ranch.', 'صلصة بافلو مع رانش.', 8, '🔥', '#fee2e2', { groups: [sauces], tags: ['spicy'], allergens: ['dairy'] }),
    p('c-sides', 'Fries', 'بطاطا مقلية', 'Crispy, sea salt.', 'مقرمشة مع ملح البحر.', 2.5, '🍟', '#fff1c7', { tags: ['vegan'] }),
    p('c-sides', 'Garlic Bread', 'خبز بالثوم', 'With mozzarella.', 'مع موزاريلا.', 4, '🥖', '#f6e7cc', { tags: ['vegetarian'], allergens: ['gluten', 'dairy'] }),
    p('c-sides', 'Onion Rings', 'حلقات البصل', 'Beer-battered style.', 'مقرمشة.', 3.5, '🧅', '#fdf0d0', { tags: ['vegetarian'], allergens: ['gluten'] }),
    p('c-drinks', 'Soft Drink', 'مشروب غازي', 'Cola, diet, orange.', 'كولا، دايت، برتقال.', 1.5, '🥤', '#e2ecf8'),
    p('c-drinks', 'Milkshake', 'ميلك شيك', 'Vanilla, chocolate or strawberry.', 'فانيليا، شوكولا أو فراولة.', 4.5, '🥛', '#fbe3ef', { allergens: ['dairy'] }),
  ],
  rewards: [
    { id: 'rw1', name: { en: 'Free fries', ar: 'بطاطا مجانية' }, cost: 80, kind: 'item', value: 0, productId: 'p513', emoji: '🍟', active: true },
    { id: 'rw2', name: { en: 'Free cheeseburger', ar: 'تشيز برغر مجاني' }, cost: 250, kind: 'item', value: 0, productId: 'p508', emoji: '🍔', active: true },
    { id: 'rw3', name: { en: '$5 off', ar: 'خصم 5$' }, cost: 300, kind: 'discount', value: 5, emoji: '💸', active: true },
    { id: 'rw4', name: { en: 'Free medium pizza', ar: 'بيتزا وسط مجانية' }, cost: 500, kind: 'item', value: 0, productId: 'p505', emoji: '🍕', active: true },
  ],
  deals: [
    { id: 'd1', title: { en: 'Tuesday: 2-for-1 pizzas', ar: 'الثلاثاء: بيتزا 1+1' }, desc: { en: 'Code TWOFOR1 on any 2 pizzas.', ar: 'الرمز TWOFOR1 على أي بيتزا.' }, code: 'TWOFOR1', kind: 'percent', value: 50, minOrder: 18, emoji: '🍕', bg: '#fde68a', active: true },
    { id: 'd2', title: { en: 'Free delivery over $15', ar: 'توصيل مجاني فوق 15$' }, desc: { en: 'Every day.', ar: 'كل يوم.' }, code: 'FREEDEL', kind: 'freeDelivery', value: 0, minOrder: 15, emoji: '🛵', bg: '#d9f99d', active: true },
    { id: 'd3', title: { en: 'Late night: $3 off', ar: 'سهرة: خصم 3$' }, desc: { en: 'After 10 pm.', ar: 'بعد العاشرة مساءً.' }, code: 'LATE3', kind: 'fixed', value: 3, minOrder: 12, emoji: '🌙', bg: '#c7d2fe', active: true, flashHours: 5 },
  ],
  banners: [
    { id: 'b1', title: { en: 'Meal deals from $11', ar: 'وجبات كومبو من 11$' }, subtitle: { en: 'Burger + side + drink.', ar: 'برغر + طبق جانبي + مشروب.' }, emoji: '🍔', bg: '#b91c1c' },
    { id: 'b2', title: { en: 'Pizza night for two', ar: 'سهرة بيتزا لشخصين' }, subtitle: { en: 'Save $7 tonight.', ar: 'وفّر 7$ الليلة.' }, emoji: '🍕', bg: '#7f1d1d' },
    { id: 'b3', title: { en: 'Every 8th order: free pizza', ar: 'كل طلب ثامن: بيتزا مجانية' }, subtitle: { en: 'Collect stamps automatically.', ar: 'اجمع الأختام تلقائياً.' }, emoji: '⭐', bg: '#1f2937' },
  ],
  reservations: { slotMinutes: 60, capacityPerSlot: 2, maxParty: 80 },
};

tag(restaurant.products, {
  p101: { tags: ['bestseller'] }, p102: { tags: ['limited'] }, p103: { tags: ['spicy'] }, p104: { tags: ['healthy', 'glutenFree'] },
  p107: { tags: ['vegan', 'healthy'] }, p109: { tags: ['vegan', 'healthy'] }, p111: { tags: ['spicy', 'vegetarian'] }, p112: { tags: ['vegan', 'glutenFree'] },
  p113: { tags: ['vegetarian'] }, p115: { tags: ['vegan'] }, p117: { tags: ['vegan', 'kids'] },
});
tag(cafe.products, {
  p203: { tags: ['bestseller'] }, p205: { tags: ['bestseller'] }, p209: { tags: ['vegan', 'healthy'] }, p210: { tags: ['vegetarian', 'healthy', 'kids'] },
  p212: { tags: ['vegan', 'sugarFree'] }, p213: { tags: ['vegetarian'] }, p215: { tags: ['vegetarian'] }, p217: { tags: ['vegetarian'] }, p218: { tags: ['kids'] },
});

// Combos, breakfast hours and allergens for the restaurant and café menus
n = 118;
restaurant.categories.unshift({ id: 'c-meals', name: { en: 'Meals & combos', ar: 'وجبات كومبو' }, emoji: '🍱' });
restaurant.products.push(
  p('c-meals', 'Grill Combo for 2', 'كومبو مشاوي لشخصين', 'Mixed grill, 2 sides, hummus, 2 drinks.', 'مشاوي مشكلة، طبقان جانبيان، حمص، مشروبان.', 29, '🍢', '#fbe3c4', { popular: true, compareAt: 36, groups: [grillBread], tags: ['bestseller'], allergens: ['sesame'] }),
  p('c-meals', 'Smash Burger Meal', 'وجبة سماش برغر', 'Smash burger, fries and a soft drink.', 'سماش برغر، بطاطا ومشروب غازي.', 11, '🍔', '#fde7d4', { compareAt: 13.5, groups: [burgerSide], allergens: ['gluten', 'dairy', 'sesame'] }),
);
tag(restaurant.products, {
  p101: { allergens: ['gluten', 'dairy', 'sesame'], calories: 720, prepMinutes: 12 }, p102: { allergens: ['gluten', 'dairy', 'eggs'], calories: 810 },
  p103: { allergens: ['gluten', 'eggs'], calories: 690 }, p104: { allergens: ['dairy'], calories: 640 }, p105: { calories: 980, prepMinutes: 20 },
  p107: { allergens: ['gluten'], calories: 260 }, p108: { allergens: ['gluten', 'dairy', 'eggs', 'fish'], calories: 470 }, p109: { allergens: ['gluten'], calories: 180 },
  p111: { allergens: ['dairy'] }, p112: { allergens: ['sesame'], calories: 330 }, p113: { allergens: ['gluten', 'dairy', 'eggs'], calories: 540 }, p114: { allergens: ['gluten', 'dairy', 'nuts'], calories: 610 },
});
n = 218;
cafe.categories.unshift({ id: 'c-bfast', name: { en: 'Breakfast', ar: 'فطور' }, emoji: '🍳', availableFrom: '07:00', availableTo: '11:30' });
cafe.products.push(
  p('c-bfast', 'Shakshuka', 'شكشوكة', 'Eggs poached in spiced tomato, sourdough.', 'بيض مطهو في صلصة البندورة مع خبز.', 7.5, '🍳', '#fde2d0', { popular: true, tags: ['vegetarian'], allergens: ['eggs', 'gluten'], calories: 480 }),
  p('c-bfast', 'Avocado Toast', 'توست الأفوكادو', 'Smashed avocado, feta, chili flakes.', 'أفوكادو مهروس، فيتا، رقائق الفلفل.', 8, '🥑', '#e3f4d7', { isNew: true, tags: ['vegetarian', 'healthy'], allergens: ['gluten', 'dairy'], calories: 420 }),
  p('c-bfast', 'Labneh & Zaatar Plate', 'صحن لبنة وزعتر', 'Labneh, olives, veggies, warm bread.', 'لبنة، زيتون، خضار، خبز دافئ.', 6.5, '🫒', '#eef0d4', { tags: ['vegetarian'], allergens: ['dairy', 'gluten', 'sesame'] }),
  p('c-bfast', 'Coffee & Croissant', 'قهوة وكرواسون', 'Any coffee with a butter croissant.', 'أي قهوة مع كرواسون بالزبدة.', 5, '🥐', '#f1e4d4', { compareAt: 6.6, groups: [coffeeSize, milk], tags: ['bestseller'], allergens: ['gluten', 'dairy'] }),
);
tag(cafe.products, {
  p203: { allergens: ['dairy'], calories: 120 }, p204: { allergens: ['dairy'] }, p205: { allergens: ['dairy'], calories: 210 }, p207: { allergens: ['dairy'] },
  p209: { allergens: ['dairy'] }, p210: { allergens: ['dairy'] }, p211: { allergens: ['dairy'] }, p213: { allergens: ['gluten', 'dairy', 'eggs'], calories: 280 },
  p214: { allergens: ['gluten', 'dairy', 'eggs'] }, p215: { allergens: ['gluten', 'dairy', 'sesame'] }, p216: { allergens: ['gluten', 'dairy'] },
  p217: { allergens: ['dairy', 'eggs', 'gluten'], calories: 490 }, p218: { allergens: ['gluten', 'dairy', 'eggs', 'nuts'] },
});

export const PRESETS: Record<Industry, Preset> = { restaurant, cafe, bakery, fastfood };

export const TAGS: Record<string, { en: string; ar: string; icon: string }> = {
  vegan: { en: 'Vegan', ar: 'نباتي صرف', icon: '🌱' },
  vegetarian: { en: 'Vegetarian', ar: 'نباتي', icon: '🥕' },
  glutenFree: { en: 'Gluten-free', ar: 'خالٍ من الغلوتين', icon: '🌾' },
  spicy: { en: 'Spicy', ar: 'حار', icon: '🌶️' },
  healthy: { en: 'Healthy', ar: 'صحي', icon: '💚' },
  kids: { en: 'Kids', ar: 'للأطفال', icon: '🧒' },
  sugarFree: { en: 'Sugar-free', ar: 'بدون سكر', icon: '🚫🍬' },
  organic: { en: 'Organic', ar: 'عضوي', icon: '🍃' },
  bestseller: { en: 'Best seller', ar: 'الأكثر مبيعاً', icon: '🔥' },
  limited: { en: 'Limited', ar: 'كمية محدودة', icon: '⏳' },
  eco: { en: 'Eco', ar: 'صديق للبيئة', icon: '♻️' },
};

export const ALLERGENS: Record<string, { en: string; ar: string; icon: string }> = {
  gluten: { en: 'Gluten', ar: 'غلوتين', icon: '🌾' },
  dairy: { en: 'Milk', ar: 'حليب', icon: '🥛' },
  eggs: { en: 'Eggs', ar: 'بيض', icon: '🥚' },
  nuts: { en: 'Nuts', ar: 'مكسرات', icon: '🥜' },
  sesame: { en: 'Sesame', ar: 'سمسم', icon: '⚪' },
  soy: { en: 'Soy', ar: 'صويا', icon: '🫘' },
  fish: { en: 'Fish', ar: 'سمك', icon: '🐟' },
  shellfish: { en: 'Shellfish', ar: 'قشريات', icon: '🦐' },
  mustard: { en: 'Mustard', ar: 'خردل', icon: '🟡' },
};

/** Delivery areas used when the business is in Lebanon. */
export const LEBANON_ZONES = [
  { id: 'z1', name: { en: 'Hamra & Ras Beirut', ar: 'الحمرا ورأس بيروت' }, fee: 1.5, eta: 25 },
  { id: 'z2', name: { en: 'Achrafieh & Gemmayzeh', ar: 'الأشرفية والجميزة' }, fee: 2, eta: 30 },
  { id: 'z3', name: { en: 'Verdun & Mar Elias', ar: 'فردان ومار الياس' }, fee: 2, eta: 30 },
  { id: 'z4', name: { en: 'Jnah & Bir Hassan', ar: 'الجناح وبئر حسن' }, fee: 3, eta: 40, minOrder: 12 },
  { id: 'z5', name: { en: 'Dekwaneh & Sin el Fil', ar: 'الدكوانة وسن الفيل' }, fee: 4, eta: 45, minOrder: 15 },
];

export const BRANCH_NAMES: L[] = [
  { en: 'Downtown', ar: 'وسط المدينة' }, { en: 'Mall branch', ar: 'فرع المول' }, { en: 'Seaside', ar: 'الواجهة البحرية' },
  { en: 'University', ar: 'الجامعة' }, { en: 'Airport road', ar: 'طريق المطار' }, { en: 'Uptown', ar: 'أعلى المدينة' },
];

export const COMING_SOON: { label: L; emoji: string }[] = [
  { label: { en: 'Juice & smoothie bar', ar: 'عصائر وسموذي' }, emoji: '🥤' },
  { label: { en: 'Cloud kitchen', ar: 'مطبخ سحابي' }, emoji: '👩‍🍳' },
  { label: { en: 'Catering', ar: 'تموين' }, emoji: '🍱' },
];

export const DEFAULT_TIERS = [
  { id: 't0', name: { en: 'Member', ar: 'عضو' }, minPoints: 0, multiplier: 1, color: '#9ca3af' },
  { id: 't1', name: { en: 'Silver', ar: 'فضي' }, minPoints: 500, multiplier: 1.25, color: '#64748b' },
  { id: 't2', name: { en: 'Gold', ar: 'ذهبي' }, minPoints: 1500, multiplier: 1.5, color: '#ca8a04' },
  { id: 't3', name: { en: 'Platinum', ar: 'بلاتيني' }, minPoints: 4000, multiplier: 2, color: '#6366f1' },
];

export const COUNTRIES: { name: L; currency: string; dial: string }[] = [
  { name: { en: 'Lebanon', ar: 'لبنان' }, currency: 'USD', dial: '+961' },
  { name: { en: 'United Arab Emirates', ar: 'الإمارات' }, currency: 'AED', dial: '+971' },
  { name: { en: 'Saudi Arabia', ar: 'السعودية' }, currency: 'SAR', dial: '+966' },
  { name: { en: 'Qatar', ar: 'قطر' }, currency: 'QAR', dial: '+974' },
  { name: { en: 'Kuwait', ar: 'الكويت' }, currency: 'KWD', dial: '+965' },
  { name: { en: 'Bahrain', ar: 'البحرين' }, currency: 'BHD', dial: '+973' },
  { name: { en: 'Oman', ar: 'عُمان' }, currency: 'OMR', dial: '+968' },
  { name: { en: 'Jordan', ar: 'الأردن' }, currency: 'JOD', dial: '+962' },
  { name: { en: 'Egypt', ar: 'مصر' }, currency: 'EGP', dial: '+20' },
  { name: { en: 'Iraq', ar: 'العراق' }, currency: 'IQD', dial: '+964' },
  { name: { en: 'Other', ar: 'أخرى' }, currency: 'USD', dial: '+1' },
];

export const CURRENCIES = ['USD', 'EUR', 'LBP', 'AED', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR', 'JOD', 'EGP', 'IQD', 'GBP'];
