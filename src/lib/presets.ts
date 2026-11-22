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
  active: true, stock: null, groups: [], ...extra,
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
const clothSize = g('g-csize', 'Size', 'المقاس', true, false, [
  ['o-xs', 'XS', 'XS', 0], ['o-sm', 'S', 'S', 0], ['o-md', 'M', 'M', 0], ['o-lgs', 'L', 'L', 0], ['o-xl', 'XL', 'XL', 0],
]);
const color3 = (a: [string, string], b: [string, string], c: [string, string]) =>
  g('g-color', 'Color', 'اللون', true, false, [['o-c1', a[0], a[1], 0], ['o-c2', b[0], b[1], 0], ['o-c3', c[0], c[1], 0]]);
const shoeSize = g('g-shoe', 'Size (EU)', 'المقاس', true, false, ['38', '39', '40', '41', '42', '43', '44'].map((s) => ['o-s' + s, s, s, 0] as [string, string, string, number]));

const foodZones: DeliveryZone[] = [
  { id: 'z1', name: { en: 'Nearby (0–3 km)', ar: 'قريب (0–3 كم)' }, fee: 1.5, eta: 25 },
  { id: 'z2', name: { en: 'City (3–8 km)', ar: 'المدينة (3–8 كم)' }, fee: 3, eta: 40 },
  { id: 'z3', name: { en: 'Outskirts (8–15 km)', ar: 'الضواحي (8–15 كم)' }, fee: 5, eta: 55 },
];

const allOn: Modules = {
  ordering: true, delivery: true, pickup: true, dineIn: true, loyaltyPoints: true, loyaltyStamps: true, vipTiers: true,
  staticQr: true, deals: true, campaigns: true, reservations: true,
};

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
  modules: { ...allOn, loyaltyStamps: false },
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

// ── RETAIL ──────────────────────────────────────────────────────
n = 300;
const retail: Preset = {
  industry: 'retail',
  label: { en: 'Retail store', ar: 'متجر' },
  emoji: '🛍️',
  blurb: { en: 'Online shop, shipping, click & collect, VIP', ar: 'متجر إلكتروني، شحن، استلام من المتجر، VIP' },
  sampleName: { en: 'Nova Boutique', ar: 'نوفا بوتيك' },
  sampleTagline: { en: 'Everyday pieces, effortless style.', ar: 'قطع يومية بأناقة بسيطة.' },
  logoEmoji: '✨',
  palette: { primary: '#18181b', secondary: '#e9c46a' },
  font: 'modern',
  radius: 'sharp',
  hours: ['10:00', '21:00'],
  modules: { ...allOn, dineIn: false, loyaltyStamps: false },
  terms: {
    catalog: { en: 'Shop', ar: 'المتجر' },
    reserve: { en: 'Book a styling visit', ar: 'احجز جلسة تنسيق' },
    reserveCta: { en: 'Book', ar: 'احجز' },
    party: { en: 'People', ar: 'الأشخاص' },
    delivery: { en: 'Shipping', ar: 'شحن' },
    kitchen: { en: 'Store', ar: 'المتجر' },
  },
  pointsPerUnit: 5,
  stampsTarget: 6,
  stampReward: { en: '$10 gift voucher', ar: 'قسيمة هدية بقيمة 10$' },
  stampRule: 'perOrder',
  stampCategoryIds: [],
  zones: [
    { id: 'z1', name: { en: 'Standard shipping', ar: 'شحن عادي' }, fee: 4, eta: 2880 },
    { id: 'z2', name: { en: 'Express (next day)', ar: 'شحن سريع (اليوم التالي)' }, fee: 8, eta: 1440 },
  ],
  categories: [
    { id: 'c-wom', name: { en: 'Women', ar: 'نساء' }, emoji: '👗' },
    { id: 'c-men', name: { en: 'Men', ar: 'رجال' }, emoji: '👔' },
    { id: 'c-shoe', name: { en: 'Shoes', ar: 'أحذية' }, emoji: '👟' },
    { id: 'c-bag', name: { en: 'Bags', ar: 'حقائب' }, emoji: '👜' },
    { id: 'c-acc', name: { en: 'Accessories', ar: 'إكسسوارات' }, emoji: '🕶️' },
  ],
  products: [
    p('c-wom', 'Linen Summer Dress', 'فستان صيفي من الكتان', 'Breathable linen, relaxed midi cut.', 'كتان مريح، قصة ميدي واسعة.', 49, '👗', '#f5ebe0', { popular: true, stock: 14, groups: [clothSize, color3(['Sand', 'رملي'], ['Olive', 'زيتي'], ['White', 'أبيض'])] }),
    p('c-wom', 'Wide-leg Trousers', 'بنطال واسع', 'High waist, flowing fit.', 'خصر عالٍ وقصة انسيابية.', 39, '👖', '#e7e5e4', { stock: 9, groups: [clothSize, color3(['Black', 'أسود'], ['Beige', 'بيج'], ['Navy', 'كحلي'])] }),
    p('c-wom', 'Silk Blouse', 'بلوزة حرير', 'Soft-touch satin, button front.', 'ساتان ناعم بأزرار أمامية.', 45, '👚', '#fce7f3', { isNew: true, stock: 6, groups: [clothSize, color3(['Ivory', 'عاجي'], ['Blush', 'وردي'], ['Black', 'أسود'])] }),
    p('c-wom', 'Knit Cardigan', 'كارديغان محبوك', 'Chunky knit, oversized.', 'حياكة سميكة بمقاس واسع.', 42, '🧶', '#f3e8d8', { stock: 3, groups: [clothSize] }),
    p('c-men', 'Oxford Shirt', 'قميص أوكسفورد', 'Crisp cotton, button-down collar.', 'قطن أنيق بياقة بأزرار.', 35, '👔', '#e0ecf7', { popular: true, stock: 20, groups: [clothSize, color3(['White', 'أبيض'], ['Sky', 'سماوي'], ['Pink', 'وردي'])] }),
    p('c-men', 'Slim Chinos', 'بنطال تشينو', 'Stretch cotton, tapered leg.', 'قطن مرن بقصة ضيقة.', 39, '👖', '#ece3d3', { stock: 12, groups: [clothSize, color3(['Khaki', 'كاكي'], ['Navy', 'كحلي'], ['Olive', 'زيتي'])] }),
    p('c-men', 'Piqué Polo', 'قميص بولو', 'Classic fit, breathable piqué.', 'قصة كلاسيكية وقماش مريح.', 29, '👕', '#e4f1e6', { stock: 18, groups: [clothSize, color3(['Navy', 'كحلي'], ['White', 'أبيض'], ['Green', 'أخضر'])] }),
    p('c-shoe', 'White Leather Sneakers', 'حذاء رياضي جلد أبيض', 'Minimal, comfortable, goes with everything.', 'بسيط ومريح ويناسب كل شيء.', 69, '👟', '#f4f4f5', { popular: true, stock: 11, groups: [shoeSize] }),
    p('c-shoe', 'Suede Loafers', 'حذاء لوفر شمواه', 'Hand-stitched, cushioned sole.', 'خياطة يدوية ونعل مريح.', 89, '🥿', '#efe1d1', { stock: 5, groups: [shoeSize] }),
    p('c-shoe', 'Strappy Sandals', 'صندل بأشرطة', 'Soft leather straps, low block heel.', 'أشرطة جلد ناعمة وكعب منخفض.', 55, '👡', '#fbe7dd', { isNew: true, stock: 8, groups: [shoeSize] }),
    p('c-bag', 'Canvas Tote', 'حقيبة قماشية', 'Roomy, with inner pocket.', 'واسعة مع جيب داخلي.', 35, '👜', '#f1ead9', { stock: 25 }),
    p('c-bag', 'Leather Crossbody', 'حقيبة كروس جلد', 'Adjustable strap, gold hardware.', 'حزام قابل للتعديل وقطع ذهبية.', 59, '👛', '#f0dcd4', { popular: true, stock: 7, groups: [color3(['Tan', 'بني فاتح'], ['Black', 'أسود'], ['Burgundy', 'خمري'])] }),
    p('c-acc', 'Classic Sunglasses', 'نظارات شمسية كلاسيكية', 'UV400 lenses, acetate frame.', 'عدسات UV400 وإطار أسيتات.', 25, '🕶️', '#e5e7eb', { stock: 30 }),
    p('c-acc', 'Leather Belt', 'حزام جلد', 'Full-grain leather, brushed buckle.', 'جلد طبيعي وإبزيم مصقول.', 22, '🪢', '#eadfd3', { stock: 16 }),
    p('c-acc', 'Silver Pendant', 'قلادة فضية', 'Sterling silver, 45 cm chain.', 'فضة استرليني مع سلسلة 45 سم.', 30, '📿', '#eef2f6', { isNew: true, stock: 10 }),
    p('c-acc', 'Silk Scarf', 'وشاح حرير', 'Hand-rolled edges, printed.', 'أطراف ملفوفة يدوياً ومطبوع.', 28, '🧣', '#fde2e4', { stock: 0 }),
  ],
  rewards: [
    { id: 'rw1', name: { en: '$5 off', ar: 'خصم 5$' }, cost: 150, kind: 'discount', value: 5, emoji: '💸', active: true },
    { id: 'rw2', name: { en: '$12 off', ar: 'خصم 12$' }, cost: 300, kind: 'discount', value: 12, emoji: '💳', active: true },
    { id: 'rw3', name: { en: 'Free sunglasses', ar: 'نظارات شمسية مجانية' }, cost: 500, kind: 'item', value: 0, productId: 'p313', emoji: '🕶️', active: true },
    { id: 'rw4', name: { en: '$30 off', ar: 'خصم 30$' }, cost: 700, kind: 'discount', value: 30, emoji: '🎁', active: true },
  ],
  deals: [
    { id: 'd1', title: { en: 'New season: 15% off', ar: 'الموسم الجديد: خصم 15%' }, desc: { en: 'On everything. Code NEW15.', ar: 'على كل شيء. الرمز NEW15.' }, code: 'NEW15', kind: 'percent', value: 15, minOrder: 0, emoji: '🌸', bg: '#fbcfe8', active: true },
    { id: 'd2', title: { en: 'Free shipping over $60', ar: 'شحن مجاني فوق 60$' }, desc: { en: 'Standard and express.', ar: 'عادي وسريع.' }, code: 'SHIPFREE', kind: 'freeDelivery', value: 0, minOrder: 60, emoji: '📦', bg: '#d9f99d', active: true },
    { id: 'd3', title: { en: 'Flash sale: 25% off', ar: 'تخفيضات سريعة: خصم 25%' }, desc: { en: 'Ends tonight.', ar: 'ينتهي الليلة.' }, code: 'FLASH25', kind: 'percent', value: 25, minOrder: 50, emoji: '⚡', bg: '#fecaca', active: true, flashHours: 8 },
  ],
  banners: [
    { id: 'b1', title: { en: 'The Summer Edit', ar: 'تشكيلة الصيف' }, subtitle: { en: 'Linen, light and easy.', ar: 'كتان، خفيف وسهل.' }, emoji: '☀️', bg: '#78716c' },
    { id: 'b2', title: { en: 'VIP members shop first', ar: 'أعضاء VIP يتسوقون أولاً' }, subtitle: { en: 'Earn points on every purchase.', ar: 'اجمع النقاط مع كل عملية شراء.' }, emoji: '💎', bg: '#18181b' },
    { id: 'b3', title: { en: 'Free styling session', ar: 'جلسة تنسيق مجانية' }, subtitle: { en: 'Book a visit with our stylist.', ar: 'احجز زيارة مع منسّقتنا.' }, emoji: '🪞', bg: '#57534e' },
  ],
  reservations: { slotMinutes: 45, capacityPerSlot: 2, maxParty: 4 },
};

export const PRESETS: Record<Industry, Preset> = { restaurant, cafe, retail };

export const COMING_SOON: { label: L; emoji: string }[] = [
  { label: { en: 'Salon & spa', ar: 'صالون وسبا' }, emoji: '💇' },
  { label: { en: 'Clinic', ar: 'عيادة' }, emoji: '🩺' },
  { label: { en: 'Gym & studio', ar: 'نادي رياضي' }, emoji: '🏋️' },
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
