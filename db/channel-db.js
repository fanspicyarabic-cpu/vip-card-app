/**
 * Telegram-Native Channel Database Driver for VIP Card App
 * Features:
 * - Auto-Stocking Logic (DIRECT_TOPUP unlimited, AUTO_DELIVERY strictly derived from codes array)
 * - Dynamic Telegram Hub Settings (Bot Token, Orders Channel ID, Storage Channel ID)
 * - Automatic User Capturing & Retention
 * - Broadcasting System (Bot messages & in-app announcement)
 */

const fs = require('fs');
const path = require('path');

const LEDGER_CACHE_FILE = path.join(__dirname, 'local_ledger_cache.json');

const REGIONAL_PRODUCTS = [
  // ================= 1. PUBG Mobile =================
  {
    id: 'pubg-60uc',
    category: 'pubg',
    categoryNameAr: 'ببجي موبايل',
    region: 'عالمي',
    title: 'ببجي 60 شدة (UC) - شحن فوري بالمعرف',
    description: 'شحن مباشر وفوري لشدات ببجي موبايل عبر ID اللاعب الرسمي.',
    priceStars: 55,
    type: 'DIRECT_TOPUP',
    badge: 'الأكثر طلباً 🔥',
    icon: 'pubg',
    requiresPlayerId: true,
    playerIdPlaceholder: 'أدخل الآيدي ID الخاص باللاعب (مثال: 5123456789)'
  },
  {
    id: 'pubg-325uc',
    category: 'pubg',
    categoryNameAr: 'ببجي موبايل',
    region: 'عالمي',
    title: 'ببجي 300 + 25 شدة (UC)',
    description: 'باقة 325 شدة شحن مباشر لحسابك في ببجي موبايل.',
    priceStars: 250,
    type: 'DIRECT_TOPUP',
    badge: 'باقة مميزة ⭐',
    icon: 'pubg',
    requiresPlayerId: true,
    playerIdPlaceholder: 'أدخل الآيدي ID الخاص باللاعب'
  },
  {
    id: 'pubg-660uc',
    category: 'pubg',
    categoryNameAr: 'ببجي موبايل',
    region: 'عالمي',
    title: 'ببجي 600 + 60 شدة (UC) - الرويال باس',
    description: 'كافية لتفعيل الرويال باس Royale Pass لموسم كامل فورياً.',
    priceStars: 490,
    type: 'DIRECT_TOPUP',
    badge: 'رويال باس 🎖️',
    icon: 'pubg',
    requiresPlayerId: true,
    playerIdPlaceholder: 'أدخل الآيدي ID الخاص باللاعب'
  },
  {
    id: 'pubg-1800uc',
    category: 'pubg',
    categoryNameAr: 'ببجي موبايل',
    region: 'عالمي',
    title: 'ببجي 1500 + 300 شدة (UC)',
    description: 'شحن فوري بالآيدي لحسابك في ببجي مع بونص إضافي 300 شدة.',
    priceStars: 1240,
    type: 'DIRECT_TOPUP',
    badge: 'توفير كبير 💎',
    icon: 'pubg',
    requiresPlayerId: true,
    playerIdPlaceholder: 'أدخل الآيدي ID الخاص باللاعب'
  },

  // ================= 2. Apple / iTunes =================
  {
    id: 'apple-us-10',
    category: 'apple',
    categoryNameAr: 'بطاقات أبل',
    region: 'أمريكا 🇺🇸',
    title: 'بطاقة أبل 10$ - المتجر الأمريكي 🇺🇸',
    description: 'رمز شحن رسمي لمتجر Apple ID الأمريكي.',
    priceStars: 540,
    type: 'AUTO_DELIVERY',
    badge: 'أمريكي 🇺🇸',
    icon: 'apple'
  },
  {
    id: 'apple-tr-100',
    category: 'apple',
    categoryNameAr: 'بطاقات أبل',
    region: 'تركيا 🇹🇷',
    title: 'بطاقة أبل 100 ليرة - المتجر التركي 🇹🇷',
    description: 'رمز شحن رسمي لحسابات Apple ID التركية بأفضل سعر.',
    priceStars: 210,
    type: 'AUTO_DELIVERY',
    badge: 'تركي 🇹🇷',
    icon: 'apple'
  },
  {
    id: 'apple-uae-50',
    category: 'apple',
    categoryNameAr: 'بطاقات أبل',
    region: 'الإمارات 🇦🇪',
    title: 'بطاقة أبل 50 درهم - متجر الإمارات 🇦🇪',
    description: 'رمز شحن فوري لحسابات Apple Store الإماراتية.',
    priceStars: 700,
    type: 'AUTO_DELIVERY',
    badge: 'إماراتي 🇦🇪',
    icon: 'apple'
  },
  {
    id: 'apple-ksa-50',
    category: 'apple',
    categoryNameAr: 'بطاقات أبل',
    region: 'السعودية 🇸🇦',
    title: 'بطاقة أبل 50 ريال - المتجر السعودي 🇸🇦',
    description: 'رمز شحن فوري لحسابات Apple Store السعودية.',
    priceStars: 690,
    type: 'AUTO_DELIVERY',
    badge: 'سعودي 🇸🇦',
    icon: 'apple'
  },
  {
    id: 'apple-jp-1000',
    category: 'apple',
    categoryNameAr: 'بطاقات أبل',
    region: 'اليابان 🇯🇵',
    title: 'بطاقة أبل 1000 ين - المتجر الياباني 🇯🇵',
    description: 'رمز شحن رسمي للمتجر الياباني للألعاب وتطبيقات الأنمي.',
    priceStars: 380,
    type: 'AUTO_DELIVERY',
    badge: 'ياباني 🇯🇵',
    icon: 'apple'
  },
  {
    id: 'apple-uk-10',
    category: 'apple',
    categoryNameAr: 'بطاقات أبل',
    region: 'بريطانيا 🇬🇧',
    title: 'بطاقة أبل £10 - المتجر البريطاني 🇬🇧',
    description: 'رمز شحن رسمي لحسابات Apple Store في المملكة المتحدة.',
    priceStars: 660,
    type: 'AUTO_DELIVERY',
    badge: 'بريطاني 🇬🇧',
    icon: 'apple'
  },

  // ================= 3. Google Play =================
  {
    id: 'gplay-ksa-50',
    category: 'google',
    categoryNameAr: 'جوجل بلاي',
    region: 'السعودية 🇸🇦',
    title: 'جوجل بلاي 50 ريال - المتجر السعودي 🇸🇦',
    description: 'شحن رصيد Google Play السعودي لشراء الألعاب والاشتراكات.',
    priceStars: 690,
    type: 'AUTO_DELIVERY',
    badge: 'سعودي 🇸🇦',
    icon: 'google'
  },
  {
    id: 'gplay-us-10',
    category: 'google',
    categoryNameAr: 'جوجل بلاي',
    region: 'أمريكا 🇺🇸',
    title: 'جوجل بلاي 10$ - المتجر الأمريكي 🇺🇸',
    description: 'شحن رصيد متجر Google Play الأمريكي لشراء التطبيقات وشحن الألعاب.',
    priceStars: 530,
    type: 'AUTO_DELIVERY',
    badge: 'أمريكي 🇺🇸',
    icon: 'google'
  },
  {
    id: 'gplay-eu-15',
    category: 'google',
    categoryNameAr: 'جوجل بلاي',
    region: 'أوروبا 🇪🇺',
    title: 'جوجل بلاي €15 - المتجر الأوروبي 🇪🇺',
    description: 'شحن رصيد متجر Google Play للدول الأوروبية بعملة اليورو.',
    priceStars: 850,
    type: 'AUTO_DELIVERY',
    badge: 'أوروبي 🇪🇺',
    icon: 'google'
  },
  {
    id: 'gplay-uae-50',
    category: 'google',
    categoryNameAr: 'جوجل بلاي',
    region: 'الإمارات 🇦🇪',
    title: 'جوجل بلاي 50 درهم - متجر الإمارات 🇦🇪',
    description: 'شحن فوري لحسابات Google Play الإماراتية.',
    priceStars: 710,
    type: 'AUTO_DELIVERY',
    badge: 'إماراتي 🇦🇪',
    icon: 'google'
  },
  {
    id: 'gplay-iq-10',
    category: 'google',
    categoryNameAr: 'جوجل بلاي',
    region: 'العراق 🇮🇶',
    title: 'جوجل بلاي 10$ - المتجر العراقي 🇮🇶',
    description: 'بطاقة شحن رقمية مخصصة للمستخدمين في العراق.',
    priceStars: 540,
    type: 'AUTO_DELIVERY',
    badge: 'عراقي 🇮🇶',
    icon: 'google'
  },
  {
    id: 'gplay-uk-10',
    category: 'google',
    categoryNameAr: 'جوجل بلاي',
    region: 'بريطانيا 🇬🇧',
    title: 'جوجل بلاي £10 - المتجر البريطاني 🇬🇧',
    description: 'شحن رصيد متجر Google Play في بريطانيا بالجنيه الإسترليني.',
    priceStars: 670,
    type: 'AUTO_DELIVERY',
    badge: 'بريطاني 🇬🇧',
    icon: 'google'
  },

  // ================= 4. Telecom (STC & Zain) =================
  {
    id: 'stc-direct-topup',
    category: 'telecom',
    categoryNameAr: 'الاتصالات (STC وزين)',
    region: 'السعودية 🇸🇦',
    title: 'STC الشحن المباشر (رصيد سوا فوري)',
    description: 'شحن رصيد سوا المباشر عبر إدخال رقم الجوال السعودي.',
    priceStars: 320,
    type: 'DIRECT_TOPUP',
    badge: 'شحن مباشر 📱',
    icon: 'telecom',
    requiresPlayerId: true,
    playerIdPlaceholder: 'أدخل رقم جوال STC (مثال: 0501234567)'
  },
  {
    id: 'stc-quicknet-10gb',
    category: 'telecom',
    categoryNameAr: 'الاتصالات (STC وزين)',
    region: 'السعودية 🇸🇦',
    title: 'STC كويك نت 10 جيجابايت (3 أشهر)',
    description: 'قسيمة بيانات كويك نت إنترنت عالي السرعة من STC.',
    priceStars: 980,
    type: 'AUTO_DELIVERY',
    badge: 'كويك نت 🌐',
    icon: 'telecom'
  },
  {
    id: 'stc-sawa-bundle-star',
    category: 'telecom',
    categoryNameAr: 'الاتصالات (STC وزين)',
    region: 'السعودية 🇸🇦',
    title: 'باقات سوا (سوا ستار بلس مسبقة الدفع)',
    description: 'تفعيل باقة سوا ستار إنترنت ومكالمات غير محدودة.',
    priceStars: 2200,
    type: 'AUTO_DELIVERY',
    badge: 'باقة سوا ⭐',
    icon: 'telecom'
  },
  {
    id: 'stc-sawa-card-50',
    category: 'telecom',
    categoryNameAr: 'الاتصالات (STC وزين)',
    region: 'السعودية 🇸🇦',
    title: 'بطاقات سوا 50 ريال (كود رقمي)',
    description: 'كود بطاقة شحن سوا 50 ريال صالح لإعادة شحن أي خط مسبق الدفع.',
    priceStars: 690,
    type: 'AUTO_DELIVERY',
    badge: 'كود فوري 💳',
    icon: 'telecom'
  },
  {
    id: 'zain-recharge-35',
    category: 'telecom',
    categoryNameAr: 'الاتصالات (STC وزين)',
    region: 'السعودية 🇸🇦',
    title: 'زين باقة 35 ريال (Zain Card 35)',
    description: 'بطاقة شحن خطوط زين مسبقة الدفع فئة 35 ريال.',
    priceStars: 490,
    type: 'AUTO_DELIVERY',
    badge: 'زين 35 📶',
    icon: 'telecom'
  },
  {
    id: 'zain-recharge-60',
    category: 'telecom',
    categoryNameAr: 'الاتصالات (STC وزين)',
    region: 'السعودية 🇸🇦',
    title: 'زين باقة 60 ريال (Zain Card 60)',
    description: 'بطاقة شحن خطوط زين فئة 60 ريال مع رصيد إضافي.',
    priceStars: 820,
    type: 'AUTO_DELIVERY',
    badge: 'زين 60 📶',
    icon: 'telecom'
  },
  {
    id: 'zain-recharge-115',
    category: 'telecom',
    categoryNameAr: 'الاتصالات (STC وزين)',
    region: 'السعودية 🇸🇦',
    title: 'زين باقة 115 ريال (Zain Card 115)',
    description: 'بطاقة شحن زين فئة 115 ريال للمكالمات والإنترنت وتجديد الباقات.',
    priceStars: 1540,
    type: 'AUTO_DELIVERY',
    badge: 'زين 115 📶',
    icon: 'telecom'
  },

  // ================= 5. LikeCard Wallets =================
  {
    id: 'lk-wallet-ksa-100',
    category: 'likecard',
    categoryNameAr: 'محافظ لايك كارد',
    region: 'السعودية 🇸🇦',
    title: 'رصيد محفظة لايك كارد 100 ريال (KSA 🇸🇦)',
    description: 'شحن رصيد حسابك ومحفظتك في موقع وتطبيق لايك كارد السعودي.',
    priceStars: 1350,
    type: 'AUTO_DELIVERY',
    badge: 'سعودية 🇸🇦',
    icon: 'likecard'
  },
  {
    id: 'lk-wallet-uae-100',
    category: 'likecard',
    categoryNameAr: 'محافظ لايك كارد',
    region: 'الإمارات 🇦🇪',
    title: 'رصيد محفظة لايك كارد 100 درهم (UAE 🇦🇪)',
    description: 'شحن رصيد محفظة لايك كارد الإماراتية لشراء كافة البطاقات.',
    priceStars: 1360,
    type: 'AUTO_DELIVERY',
    badge: 'إماراتية 🇦🇪',
    icon: 'likecard'
  },
  {
    id: 'lk-wallet-oman-10',
    category: 'likecard',
    categoryNameAr: 'محافظ لايك كارد',
    region: 'عمان 🇴🇲',
    title: 'رصيد محفظة لايك كارد 10 ريال (عمان 🇴🇲)',
    description: 'شحن رصيد محفظة لايك كارد سلطنة عمان.',
    priceStars: 1340,
    type: 'AUTO_DELIVERY',
    badge: 'عمانية 🇴🇲',
    icon: 'likecard'
  },
  {
    id: 'lk-wallet-kwt-10',
    category: 'likecard',
    categoryNameAr: 'محافظ لايك كارد',
    region: 'الكويت 🇰🇼',
    title: 'رصيد محفظة لايك كارد 10 دينار (الكويت 🇰🇼)',
    description: 'شحن رصيد محفظة لايك كارد الكويتية.',
    priceStars: 1720,
    type: 'AUTO_DELIVERY',
    badge: 'كويتية 🇰🇼',
    icon: 'likecard'
  },
  {
    id: 'lk-wallet-jor-10',
    category: 'likecard',
    categoryNameAr: 'محافظ لايك كارد',
    region: 'الأردن 🇯🇴',
    title: 'رصيد محفظة لايك كارد 10 دنانير (الأردن 🇯🇴)',
    description: 'شحن رصيد محفظة لايك كارد الأردنية.',
    priceStars: 730,
    type: 'AUTO_DELIVERY',
    badge: 'أردنية 🇯🇴',
    icon: 'likecard'
  },
  {
    id: 'lk-wallet-bhr-10',
    category: 'likecard',
    categoryNameAr: 'محافظ لايك كارد',
    region: 'البحرين 🇧🇭',
    title: 'رصيد محفظة لايك كارد 10 دينار (البحرين 🇧🇭)',
    description: 'شحن رصيد محفظة لايك كارد مملكة البحرين.',
    priceStars: 1380,
    type: 'AUTO_DELIVERY',
    badge: 'بحرينية 🇧🇭',
    icon: 'likecard'
  },
  {
    id: 'lk-wallet-egy-500',
    category: 'likecard',
    categoryNameAr: 'محافظ لايك كارد',
    region: 'مصر 🇪🇬',
    title: 'رصيد محفظة لايك كارد 500 جنيه (مصر 🇪🇬)',
    description: 'شحن رصيد محفظة لايك كارد مصر لشراء الألعاب والخدمات.',
    priceStars: 550,
    type: 'AUTO_DELIVERY',
    badge: 'مصرية 🇪🇬',
    icon: 'likecard'
  },
  {
    id: 'lk-wallet-qat-100',
    category: 'likecard',
    categoryNameAr: 'محافظ لايك كارد',
    region: 'قطر 🇶🇦',
    title: 'رصيد محفظة لايك كارد 100 ريال (قطر 🇶🇦)',
    description: 'شحن رصيد محفظة لايك كارد دولة قطر.',
    priceStars: 1390,
    type: 'AUTO_DELIVERY',
    badge: 'قطرية 🇶🇦',
    icon: 'likecard'
  },
  {
    id: 'lk-wallet-glb-20',
    category: 'likecard',
    categoryNameAr: 'محافظ لايك كارد',
    region: 'عالمي 🌐',
    title: 'رصيد محفظة لايك كارد 20$ (العالمية 🌐)',
    description: 'شحن رصيد محفظة لايك كارد الدولية صالحة في أي مكان.',
    priceStars: 1060,
    type: 'AUTO_DELIVERY',
    badge: 'عالمية 🌐',
    icon: 'likecard'
  },

  // ================= 6. Razer Gold =================
  {
    id: 'razer-us-10',
    category: 'razer',
    categoryNameAr: 'رايزر جولد',
    region: 'الأمريكية 🇺🇸',
    title: 'رايزر جولد 10$ - الحساب الأمريكي (Razer Gold US)',
    description: 'شحن رصيد رايزر جولد للحسابات المسجلة في الولايات المتحدة.',
    priceStars: 530,
    type: 'AUTO_DELIVERY',
    badge: 'أمريكي 🇺🇸',
    icon: 'razer'
  },
  {
    id: 'razer-glb-10',
    category: 'razer',
    categoryNameAr: 'رايزر جولد',
    region: 'العالمية 🌐',
    title: 'رايزر جولد 10$ - الحساب العالمي (Razer Gold Global)',
    description: 'شحن رصيد محفظة رايزر جولد العالمية لشحن كافة الألعاب والأونلاين.',
    priceStars: 540,
    type: 'AUTO_DELIVERY',
    badge: 'عالمي 🌐',
    icon: 'razer'
  },
  {
    id: 'razer-tr-100',
    category: 'razer',
    categoryNameAr: 'رايزر جولد',
    region: 'التركية 🇹🇷',
    title: 'رايزر جولد 100 ليرة - الحساب التركي (Razer Gold TR)',
    description: 'شحن رصيد رايزر جولد للحسابات التركية بأسعار منافسة.',
    priceStars: 195,
    type: 'AUTO_DELIVERY',
    badge: 'تركي 🇹🇷',
    icon: 'razer'
  },

  // ================= 7. VISA & Other Categories =================
  {
    id: 'visa-virtual-10',
    category: 'visa',
    categoryNameAr: 'فيزا وعروض الألعاب',
    title: 'بطاقة فيزا كارد مسبقة الدفع 10$ (Prepaid)',
    description: 'بطاقة دفع إلكترونية صالحة للشراء من كافة المتاجر وتفعيل الاشتراكات.',
    priceStars: 580,
    type: 'AUTO_DELIVERY',
    badge: 'عالمية 💳',
    icon: 'visa'
  },
  {
    id: 'flash-binance-5usdt',
    category: 'flash',
    categoryNameAr: 'عروض سريعة',
    title: 'عرض خاطف: قسيمة باينانس 5 USDT بخصم 30%',
    description: 'عرض فلاش محدود لمدة 24 ساعة فقط! تسليم فوري في الخزنة.',
    priceStars: 190,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 30% ⚡',
    icon: 'flash'
  },
  {
    id: 'roblox-800-robux',
    category: 'roblox',
    categoryNameAr: 'روبلوكس والألعاب',
    title: 'روبلوكس 800 روبوكس (Robux Gift Card)',
    description: 'كود رقمي أصلي لشحن 800 Robux في حسابك على منصة Roblox عالمياً.',
    priceStars: 540,
    type: 'AUTO_DELIVERY',
    badge: 'رائج 🎮',
    icon: 'roblox'
  },
  {
    id: 'netflix-ksa-100',
    category: 'netflix',
    categoryNameAr: 'نيتفلكس واشتراكات',
    title: 'بطاقة اشتراك نيتفلكس 100 ريال (Netflix KSA)',
    description: 'قسيمة رقمية لتجديد وشحن اشتراك نتفلكس بدون الحاجة لبطاقة بنكية.',
    priceStars: 1350,
    type: 'AUTO_DELIVERY',
    badge: 'سينما 🎬',
    icon: 'netflix'
  },
  {
    id: 'shein-ksa-100',
    category: 'shein',
    categoryNameAr: 'شي إن والتسوق',
    title: 'بطاقة هدايا شي إن 100 ريال (SHEIN KSA)',
    description: 'قسيمة تسوق أصلية قابلة للاستخدام على جميع المنتجات في تطبيق شي إن.',
    priceStars: 1320,
    type: 'AUTO_DELIVERY',
    badge: 'تسوق 🛍️',
    icon: 'shein'
  },
  {
    id: 'noon-ksa-100',
    category: 'noon',
    categoryNameAr: 'بطاقات نون',
    title: 'بطاقة هدايا نون 100 ريال (Noon KSA 🇸🇦)',
    description: 'رصيد شراء فوري على موقع وتطبيق نون في المملكة العربية السعودية.',
    priceStars: 1360,
    type: 'AUTO_DELIVERY',
    badge: 'أصفر نون 🟡',
    icon: 'noon'
  },
  {
    id: 'binance-10-usdt',
    category: 'binance',
    categoryNameAr: 'بطاقات باينانس',
    title: 'قسيمة باينانس 10 USDT (Binance Gift Card)',
    description: 'كود رقمي أصلي لشحن 10 دولار رقمي USDT فوراً في حساب باينانس بدون رسوم تحويل.',
    priceStars: 520,
    type: 'AUTO_DELIVERY',
    badge: 'أكثر مبيعاً ⚡',
    icon: 'binance'
  },
  {
    id: 'binance-25-usdt',
    category: 'binance',
    categoryNameAr: 'بطاقات باينانس',
    title: 'قسيمة باينانس 25 USDT (Binance Gift Card)',
    description: 'شحن 25 USDT في محفظة التمويل على منصة باينانس العالمية فوراً.',
    priceStars: 1280,
    type: 'AUTO_DELIVERY',
    badge: 'توفير 💎',
    icon: 'binance'
  },
  // 1. حسابات ببجي
  {
    id: 'pubg-acc-mythic-m4',
    category: 'pubg_accounts',
    categoryNameAr: 'شراء حسابات بوبجي',
    title: 'حساب ببجي لفل 72 | بدلة ميثيك + M4 ثلجي لفل 4',
    description: 'حساب ببجي لفل 72 مشحون من الموسم 8، يحتوي على M4 الثلجي مطور لفل 4 وبدلة ميثيك نادرة.',
    priceStars: 1450,
    type: 'AUTO_DELIVERY',
    badge: 'حساب أسطوري 👑',
    icon: 'pubg'
  },
  {
    id: 'pubg-acc-raven-suit',
    category: 'pubg_accounts',
    categoryNameAr: 'شراء حسابات بوبجي',
    title: 'حساب ببجي لفل 68 | بدلة الغراب + 6 أسلحة مطورة',
    description: 'حساب فاخر يحتوي على بدلة الغراب ماكس، أوم القودزيلا، وسكار الفزاعة، ربط نظيف تسليم فوري.',
    priceStars: 980,
    type: 'AUTO_DELIVERY',
    badge: 'عرض خاص 🔥',
    icon: 'pubg'
  },
  // 2. حسابات تويتر
  {
    id: 'tw-acc-verified-blue',
    category: 'twitter_accounts',
    categoryNameAr: 'شراء حسابات تويتر',
    title: 'حساب تويتر (X) موثق بالعلامة الزرقاء نشط',
    description: 'حساب تويتر أصلي موثق بشارة X Premium الزرقاء، متابعين متفاعلين، تسليم فوري.',
    priceStars: 850,
    type: 'AUTO_DELIVERY',
    badge: 'موثق رسمي 🔷',
    icon: 'twitter'
  },
  {
    id: 'tw-acc-vintage-2012',
    category: 'twitter_accounts',
    categoryNameAr: 'شراء حسابات تويتر',
    title: 'حساب تويتر عتيق إنشاء 2012 | 10K متابع حقيقي',
    description: 'حساب أقدم من 12 سنة، خالي من أي مخالفات، قوي في خوارزميات إكسبلور.',
    priceStars: 550,
    type: 'AUTO_DELIVERY',
    badge: 'تاريخ قديم ⏳',
    icon: 'twitter'
  },
  // 3. قنوات تلجرام
  {
    id: 'tg-ch-10k-active',
    category: 'telegram_channels',
    categoryNameAr: 'شراء قنوات تلجرام',
    title: 'قناة تيليجرام 10,000 عضو حقيقي متفاعل | تكنولوجيا وتطبيقات',
    description: 'قناة نشطة ومفعلة مع مشاهدات يومية تتجاوز 3000، نقل الملكية يتم فورياً لحسابك.',
    priceStars: 1100,
    type: 'DIRECT_TOPUP',
    badge: '10K متفاعل 📢',
    icon: 'telegram',
    requiresPlayerId: true,
    playerIdPlaceholder: 'أدخل معرفك في تيليجرام (@username) لنقل الملكية'
  },
  {
    id: 'tg-ch-5k-store',
    category: 'telegram_channels',
    categoryNameAr: 'شراء قنوات تلجرام',
    title: 'قناة تيليجرام تجارة ومتاجر | 5,000 عضو نشط',
    description: 'قناة مهيأة للمتاجر وعروض الشحن، أعضاء حقيقيين، تسليم فوري للملكية.',
    priceStars: 620,
    type: 'DIRECT_TOPUP',
    badge: 'جاهزة للأعمال 💼',
    icon: 'telegram',
    requiresPlayerId: true,
    playerIdPlaceholder: 'أدخل معرفك في تيليجرام (@username) لنقل الملكية'
  },
  // 4. حسابات اونلي فانز
  {
    id: 'of-acc-50usd-balance',
    category: 'onlyfans_accounts',
    categoryNameAr: 'شراء حسابات اونلي فانز',
    title: 'حساب أونلي فانز VIP مفعل مع رصيد 50$ USD',
    description: 'حساب رسمي مفعل بالكامل، مشحون مسبقاً برصيد 50 دولار، تسليم فوري مع إيميل الحساب وكلمة المرور.',
    priceStars: 750,
    type: 'AUTO_DELIVERY',
    badge: 'رصيد 50$ 💎',
    icon: 'onlyfans'
  },
  {
    id: 'of-acc-100usd-balance',
    category: 'onlyfans_accounts',
    categoryNameAr: 'شراء حسابات اونلي فانز',
    title: 'حساب أونلي فانز VIP مفعل مع رصيد 100$ USD',
    description: 'حساب VIP موثق مشحون بمبلغ 100 دولار صالح لكافة العمليات والاستخدامات، تسليم فوري.',
    priceStars: 1390,
    type: 'AUTO_DELIVERY',
    badge: 'VIP رصيد 100$ 👑',
    icon: 'onlyfans'
  },
  // 5. حسابات فان سبايسي
  {
    id: 'fs-acc-premium-vip',
    category: 'fanspicy_accounts',
    categoryNameAr: 'شراء حسابات فان سبايسي',
    title: 'حساب فان سبايسي بريميوم VIP مشحون',
    description: 'حساب Fanspicy VIP مميز مع رصيد جاهز للاستخدام ومفعل بالكامل، تسليم فوري لبيانات الدخول.',
    priceStars: 690,
    type: 'AUTO_DELIVERY',
    badge: 'بريميوم VIP 🌶️',
    icon: 'fanspicy'
  },

  // ================= 6. Additional PUBG Mobile UC Tiers ($50 to $200 with 15% Discount) =================
  {
    id: 'pubg-3850uc',
    category: 'pubg',
    categoryNameAr: 'ببجي موبايل',
    region: 'عالمي',
    title: 'ببجي 3000 + 850 شدة (UC) - باقة 50$',
    description: 'شحن مباشر وفوري لشدات ببجي موبايل بالآيدي بخصم 15% أرخص من باقي المتاجر.',
    priceStars: 2125,
    type: 'DIRECT_TOPUP',
    badge: 'خصم 15% VIP 🔥',
    icon: 'pubg',
    requiresPlayerId: true,
    playerIdPlaceholder: 'أدخل الآيدي ID الخاص باللاعب'
  },
  {
    id: 'pubg-8100uc',
    category: 'pubg',
    categoryNameAr: 'ببجي موبايل',
    region: 'عالمي',
    title: 'ببجي 6000 + 2100 شدة (UC) - باقة 100$',
    description: 'شحن باقة 8100 شدة سوبر VIP مع بونص إضافي وتسليم فوري بالآيدي.',
    priceStars: 4250,
    type: 'DIRECT_TOPUP',
    badge: 'خصم 15% VIP 💎',
    icon: 'pubg',
    requiresPlayerId: true,
    playerIdPlaceholder: 'أدخل الآيدي ID الخاص باللاعب'
  },
  {
    id: 'pubg-16200uc',
    category: 'pubg',
    categoryNameAr: 'ببجي موبايل',
    region: 'عالمي',
    title: 'ببجي 12000 + 4200 شدة (UC) - باقة 150$',
    description: 'باقة الأساطير لشحن الأسلحة والميثيكات كاملة فورياً عبر الآيدي.',
    priceStars: 6375,
    type: 'DIRECT_TOPUP',
    badge: 'خصم 15% VIP 👑',
    icon: 'pubg',
    requiresPlayerId: true,
    playerIdPlaceholder: 'أدخل الآيدي ID الخاص باللاعب'
  },
  {
    id: 'pubg-32400uc',
    category: 'pubg',
    categoryNameAr: 'ببجي موبايل',
    region: 'عالمي',
    title: 'ببجي 24000 + 8400 شدة (UC) - الصندوق الخارق 200$',
    description: 'أعلى وأضخم باقة شدات ببجي موبايل، أرخص سعر بالسوق بنسبة 15%.',
    priceStars: 8500,
    type: 'DIRECT_TOPUP',
    badge: 'خصم 15% VIP 🏆',
    icon: 'pubg',
    requiresPlayerId: true,
    playerIdPlaceholder: 'أدخل الآيدي ID الخاص باللاعب'
  },

  // ================= 7. Comprehensive Apple Cards ($30 to $200 with 15% Discount) =================
  {
    id: 'apple-us-30',
    category: 'apple',
    categoryNameAr: 'بطاقات أبل',
    region: 'أمريكا 🇺🇸',
    title: 'بطاقة أبل 30$ - المتجر الأمريكي 🇺🇸',
    description: 'رمز شحن رسمي لمتجر Apple ID الأمريكي بخصم 15%.',
    priceStars: 1275,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🔥',
    icon: 'apple'
  },
  {
    id: 'apple-us-50',
    category: 'apple',
    categoryNameAr: 'بطاقات أبل',
    region: 'أمريكا 🇺🇸',
    title: 'بطاقة أبل 50$ - المتجر الأمريكي 🇺🇸',
    description: 'بطاقة آيتونز أبل 50 دولار رسمية لتفعيل التطبيقات والألعاب.',
    priceStars: 2125,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🔥',
    icon: 'apple'
  },
  {
    id: 'apple-us-75',
    category: 'apple',
    categoryNameAr: 'بطاقات أبل',
    region: 'أمريكا 🇺🇸',
    title: 'بطاقة أبل 75$ - المتجر الأمريكي 🇺🇸',
    description: 'بطاقة شحن متجر أبل 75 دولار تسليم فوري للأكواد.',
    priceStars: 3185,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🔥',
    icon: 'apple'
  },
  {
    id: 'apple-us-100',
    category: 'apple',
    categoryNameAr: 'بطاقات أبل',
    region: 'أمريكا 🇺🇸',
    title: 'بطاقة أبل 100$ - المتجر الأمريكي 🇺🇸',
    description: 'بطاقة أبل 100 دولار أصلية مضمونة بأفضل سعر في السوق.',
    priceStars: 4250,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 💎',
    icon: 'apple'
  },
  {
    id: 'apple-us-150',
    category: 'apple',
    categoryNameAr: 'بطاقات أبل',
    region: 'أمريكا 🇺🇸',
    title: 'بطاقة أبل 150$ - المتجر الأمريكي 🇺🇸',
    description: 'بطاقة أبل 150 دولار رقمية معتمدة مع تسليم مباشر.',
    priceStars: 6375,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 👑',
    icon: 'apple'
  },
  {
    id: 'apple-us-200',
    category: 'apple',
    categoryNameAr: 'بطاقات أبل',
    region: 'أمريكا 🇺🇸',
    title: 'بطاقة أبل 200$ - المتجر الأمريكي 🇺🇸',
    description: 'أعلى فئة لبطاقات أبل 200 دولار، أرخص بـ 15% من كل المتاجر.',
    priceStars: 8500,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🏆',
    icon: 'apple'
  },
  {
    id: 'apple-ksa-100',
    category: 'apple',
    categoryNameAr: 'بطاقات أبل',
    region: 'السعودية 🇸🇦',
    title: 'بطاقة أبل 100 ريال - المتجر السعودي 🇸🇦',
    description: 'رمز شحن رسمي لمتجر Apple ID السعودي.',
    priceStars: 1145,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🔥',
    icon: 'apple'
  },
  {
    id: 'apple-ksa-200',
    category: 'apple',
    categoryNameAr: 'بطاقات أبل',
    region: 'السعودية 🇸🇦',
    title: 'بطاقة أبل 200 ريال - المتجر السعودي 🇸🇦',
    description: 'رمز شحن أبل 200 ريال للمتجر السعودي بأرخص سعر.',
    priceStars: 2295,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🔥',
    icon: 'apple'
  },
  {
    id: 'apple-ksa-300',
    category: 'apple',
    categoryNameAr: 'بطاقات أبل',
    region: 'السعودية 🇸🇦',
    title: 'بطاقة أبل 300 ريال - المتجر السعودي 🇸🇦',
    description: 'رمز شحن أبل 300 ريال رسمي للحسابات السعودية.',
    priceStars: 3400,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🔥',
    icon: 'apple'
  },
  {
    id: 'apple-ksa-500',
    category: 'apple',
    categoryNameAr: 'بطاقات أبل',
    region: 'السعودية 🇸🇦',
    title: 'بطاقة أبل 500 ريال - المتجر السعودي 🇸🇦',
    description: 'شحن أبل 500 ريال فوري للمتجر السعودي بخصم حصري.',
    priceStars: 5695,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 💎',
    icon: 'apple'
  },
  {
    id: 'apple-ksa-750',
    category: 'apple',
    categoryNameAr: 'بطاقات أبل',
    region: 'السعودية 🇸🇦',
    title: 'بطاقة أبل 750 ريال (~200$) - المتجر السعودي 🇸🇦',
    description: 'أعلى باقة لمتجر أبل السعودي 750 ريال تسليم فوري في الخزنة.',
    priceStars: 8500,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🏆',
    icon: 'apple'
  },
  {
    id: 'apple-uae-100',
    category: 'apple',
    categoryNameAr: 'بطاقات أبل',
    region: 'الإمارات 🇦🇪',
    title: 'بطاقة أبل 100 درهم - متجر الإمارات 🇦🇪',
    description: 'رمز شحن فوري لحسابات Apple Store الإماراتية بخصم 15%.',
    priceStars: 1145,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🔥',
    icon: 'apple'
  },
  {
    id: 'apple-uae-200',
    category: 'apple',
    categoryNameAr: 'بطاقات أبل',
    region: 'الإمارات 🇦🇪',
    title: 'بطاقة أبل 200 درهم - متجر الإمارات 🇦🇪',
    description: 'رمز شحن أبل 200 درهم رسمي للإمارات.',
    priceStars: 2295,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🔥',
    icon: 'apple'
  },
  {
    id: 'apple-uae-500',
    category: 'apple',
    categoryNameAr: 'بطاقات أبل',
    region: 'الإمارات 🇦🇪',
    title: 'بطاقة أبل 500 درهم - متجر الإمارات 🇦🇪',
    description: 'شحن أبل 500 درهم فوري لمتجر الإمارات بأفضل سعر بالسوق.',
    priceStars: 5695,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 💎',
    icon: 'apple'
  },

  // ================= 8. Comprehensive Google Play ($30 to $200 with 15% Discount) =================
  {
    id: 'gplay-us-30',
    category: 'google',
    categoryNameAr: 'جوجل بلاي',
    region: 'أمريكا 🇺🇸',
    title: 'جوجل بلاي 30$ - المتجر الأمريكي 🇺🇸',
    description: 'شحن رصيد Google Play الأمريكي فئة 30 دولار بأرخص سعر.',
    priceStars: 1275,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🔥',
    icon: 'google'
  },
  {
    id: 'gplay-us-50',
    category: 'google',
    categoryNameAr: 'جوجل بلاي',
    region: 'أمريكا 🇺🇸',
    title: 'جوجل بلاي 50$ - المتجر الأمريكي 🇺🇸',
    description: 'شحن رصيد متجر Google Play الأمريكي فئة 50 دولار بخصم 15%.',
    priceStars: 2125,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🔥',
    icon: 'google'
  },
  {
    id: 'gplay-us-75',
    category: 'google',
    categoryNameAr: 'جوجل بلاي',
    region: 'أمريكا 🇺🇸',
    title: 'جوجل بلاي 75$ - المتجر الأمريكي 🇺🇸',
    description: 'بطاقة جوجل بلاي 75 دولار للمتجر الأمريكي.',
    priceStars: 3185,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🔥',
    icon: 'google'
  },
  {
    id: 'gplay-us-100',
    category: 'google',
    categoryNameAr: 'جوجل بلاي',
    region: 'أمريكا 🇺🇸',
    title: 'جوجل بلاي 100$ - المتجر الأمريكي 🇺🇸',
    description: 'بطاقة جوجل بلاي 100 دولار أصلية معتمدة بأرخص سعر بالسوق.',
    priceStars: 4250,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 💎',
    icon: 'google'
  },
  {
    id: 'gplay-us-150',
    category: 'google',
    categoryNameAr: 'جوجل بلاي',
    region: 'أمريكا 🇺🇸',
    title: 'جوجل بلاي 150$ - المتجر الأمريكي 🇺🇸',
    description: 'شحن رصيد جوجل بلاي 150 دولار تسليم فوري للأكواد.',
    priceStars: 6375,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 👑',
    icon: 'google'
  },
  {
    id: 'gplay-us-200',
    category: 'google',
    categoryNameAr: 'جوجل بلاي',
    region: 'أمريكا 🇺🇸',
    title: 'جوجل بلاي 200$ - المتجر الأمريكي 🇺🇸',
    description: 'أعلى فئة لبطاقات جوجل بلاي 200 دولار بخصم 15% وتوفير ضخم.',
    priceStars: 8500,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🏆',
    icon: 'google'
  },
  {
    id: 'gplay-ksa-100',
    category: 'google',
    categoryNameAr: 'جوجل بلاي',
    region: 'السعودية 🇸🇦',
    title: 'جوجل بلاي 100 ريال - المتجر السعودي 🇸🇦',
    description: 'شحن رصيد Google Play السعودي لشراء الألعاب والاشتراكات.',
    priceStars: 1145,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🔥',
    icon: 'google'
  },
  {
    id: 'gplay-ksa-200',
    category: 'google',
    categoryNameAr: 'جوجل بلاي',
    region: 'السعودية 🇸🇦',
    title: 'جوجل بلاي 200 ريال - المتجر السعودي 🇸🇦',
    description: 'بطاقة جوجل بلاي 200 ريال للمتجر السعودي بخصم 15%.',
    priceStars: 2295,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🔥',
    icon: 'google'
  },
  {
    id: 'gplay-ksa-300',
    category: 'google',
    categoryNameAr: 'جوجل بلاي',
    region: 'السعودية 🇸🇦',
    title: 'جوجل بلاي 300 ريال - المتجر السعودي 🇸🇦',
    description: 'شحن متجر جوجل بلاي 300 ريال فوري للألعاب.',
    priceStars: 3400,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🔥',
    icon: 'google'
  },
  {
    id: 'gplay-ksa-500',
    category: 'google',
    categoryNameAr: 'جوجل بلاي',
    region: 'السعودية 🇸🇦',
    title: 'جوجل بلاي 500 ريال - المتجر السعودي 🇸🇦',
    description: 'قسيمة جوجل بلاي 500 ريال للمتجر السعودي بأرخص سعر.',
    priceStars: 5695,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 💎',
    icon: 'google'
  },
  {
    id: 'gplay-ksa-750',
    category: 'google',
    categoryNameAr: 'جوجل بلاي',
    region: 'السعودية 🇸🇦',
    title: 'جوجل بلاي 750 ريال (~200$) - المتجر السعودي 🇸🇦',
    description: 'أعلى باقة لمتجر جوجل بلاي السعودي 750 ريال.',
    priceStars: 8500,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🏆',
    icon: 'google'
  },

  // ================= 9. Comprehensive Razer Gold ($30 to $200 with 15% Discount) =================
  {
    id: 'razer-us-30',
    category: 'razer',
    categoryNameAr: 'رايزر جولد',
    region: 'الأمريكية 🇺🇸',
    title: 'رايزر جولد 30$ - الحساب الأمريكي (Razer Gold US)',
    description: 'شحن رصيد رايزر جولد 30 دولار للحسابات الأمريكية بخصم 15%.',
    priceStars: 1275,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🔥',
    icon: 'razer'
  },
  {
    id: 'razer-us-50',
    category: 'razer',
    categoryNameAr: 'رايزر جولد',
    region: 'الأمريكية 🇺🇸',
    title: 'رايزر جولد 50$ - الحساب الأمريكي (Razer Gold US)',
    description: 'شحن رصيد رايزر جولد 50 دولار بأفضل سعر.',
    priceStars: 2125,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🔥',
    icon: 'razer'
  },
  {
    id: 'razer-us-75',
    category: 'razer',
    categoryNameAr: 'رايزر جولد',
    region: 'الأمريكية 🇺🇸',
    title: 'رايزر جولد 75$ - الحساب الأمريكي (Razer Gold US)',
    description: 'بطاقة رايزر جولد 75 دولار تسليم فوري للأكواد.',
    priceStars: 3185,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🔥',
    icon: 'razer'
  },
  {
    id: 'razer-us-100',
    category: 'razer',
    categoryNameAr: 'رايزر جولد',
    region: 'الأمريكية 🇺🇸',
    title: 'رايزر جولد 100$ - الحساب الأمريكي (Razer Gold US)',
    description: 'شحن رصيد رايزر جولد 100 دولار للحسابات الأمريكية بخصم 15%.',
    priceStars: 4250,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 💎',
    icon: 'razer'
  },
  {
    id: 'razer-us-150',
    category: 'razer',
    categoryNameAr: 'رايزر جولد',
    region: 'الأمريكية 🇺🇸',
    title: 'رايزر جولد 150$ - الحساب الأمريكي (Razer Gold US)',
    description: 'شحن رصيد رايزر جولد 150 دولار تسليم مباشر.',
    priceStars: 6375,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 👑',
    icon: 'razer'
  },
  {
    id: 'razer-us-200',
    category: 'razer',
    categoryNameAr: 'رايزر جولد',
    region: 'الأمريكية 🇺🇸',
    title: 'رايزر جولد 200$ - الحساب الأمريكي (Razer Gold US)',
    description: 'أعلى باقة رايزر جولد 200 دولار بأرخص سعر بالسوق.',
    priceStars: 8500,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🏆',
    icon: 'razer'
  },
  {
    id: 'razer-glb-30',
    category: 'razer',
    categoryNameAr: 'رايزر جولد',
    region: 'عالمي 🌐',
    title: 'رايزر جولد 30$ - الحساب العالمي (Razer Gold Global)',
    description: 'شحن رصيد رايزر جولد 30 دولار العالمي بخصم 15%.',
    priceStars: 1275,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🔥',
    icon: 'razer'
  },
  {
    id: 'razer-glb-50',
    category: 'razer',
    categoryNameAr: 'رايزر جولد',
    region: 'عالمي 🌐',
    title: 'رايزر جولد 50$ - الحساب العالمي (Razer Gold Global)',
    description: 'شحن رصيد رايزر جولد 50 دولار العالمي بخصم 15%.',
    priceStars: 2125,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🔥',
    icon: 'razer'
  },
  {
    id: 'razer-glb-100',
    category: 'razer',
    categoryNameAr: 'رايزر جولد',
    region: 'عالمي 🌐',
    title: 'رايزر جولد 100$ - الحساب العالمي (Razer Gold Global)',
    description: 'شحن رصيد رايزر جولد 100 دولار العالمي بخصم 15%.',
    priceStars: 4250,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 💎',
    icon: 'razer'
  },
  {
    id: 'razer-glb-200',
    category: 'razer',
    categoryNameAr: 'رايزر جولد',
    region: 'عالمي 🌐',
    title: 'رايزر جولد 200$ - الحساب العالمي (Razer Gold Global)',
    description: 'أعلى باقة رايزر جولد العالمي 200 دولار بخصم 15%.',
    priceStars: 8500,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🏆',
    icon: 'razer'
  },

  // ================= 10. Comprehensive Binance USDT ($30 to $200 with 15% Discount) =================
  {
    id: 'binance-30-usdt',
    category: 'binance',
    categoryNameAr: 'بطاقات باينانس',
    title: 'قسيمة باينانس 30 USDT (Binance Gift Card)',
    description: 'شحن 30 دولار رقمي USDT فوراً في حساب باينانس بخصم 15%.',
    priceStars: 1275,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🔥',
    icon: 'binance'
  },
  {
    id: 'binance-50-usdt',
    category: 'binance',
    categoryNameAr: 'بطاقات باينانس',
    title: 'قسيمة باينانس 50 USDT (Binance Gift Card)',
    description: 'شحن 50 USDT بدون أي رسوم تحويل على منصة باينانس العالمية.',
    priceStars: 2125,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🔥',
    icon: 'binance'
  },
  {
    id: 'binance-75-usdt',
    category: 'binance',
    categoryNameAr: 'بطاقات باينانس',
    title: 'قسيمة باينانس 75 USDT (Binance Gift Card)',
    description: 'كود باينانس أصلي لشحن 75 USDT فورياً في محفظتك.',
    priceStars: 3185,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🔥',
    icon: 'binance'
  },
  {
    id: 'binance-100-usdt',
    category: 'binance',
    categoryNameAr: 'بطاقات باينانس',
    title: 'قسيمة باينانس 100 USDT (Binance Gift Card)',
    description: 'شحن 100 USDT في حساب باينانس مع توفير 15% فوري.',
    priceStars: 4250,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 💎',
    icon: 'binance'
  },
  {
    id: 'binance-150-usdt',
    category: 'binance',
    categoryNameAr: 'بطاقات باينانس',
    title: 'قسيمة باينانس 150 USDT (Binance Gift Card)',
    description: 'شحن 150 USDT تسليم فوري في الخزنة بخصم VIP.',
    priceStars: 6375,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 👑',
    icon: 'binance'
  },
  {
    id: 'binance-200-usdt',
    category: 'binance',
    categoryNameAr: 'بطاقات باينانس',
    title: 'قسيمة باينانس 200 USDT (Binance Gift Card)',
    description: 'أعلى فئة قسائم باينانس 200 USDT بأقل سعر بالسوق بنسبة 15%.',
    priceStars: 8500,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🏆',
    icon: 'binance'
  },

  // ================= 11. Comprehensive Virtual Visa ($30 to $200 with 15% Discount) =================
  {
    id: 'visa-virtual-30',
    category: 'visa',
    categoryNameAr: 'فيزا وعروض الألعاب',
    title: 'بطاقة فيزا كارد مسبقة الدفع 30$ (Virtual Prepaid)',
    description: 'بطاقة دفع إلكترونية صالحة للشراء وتفعيل الاشتراكات بخصم 15%.',
    priceStars: 1275,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🔥',
    icon: 'visa'
  },
  {
    id: 'visa-virtual-50',
    category: 'visa',
    categoryNameAr: 'فيزا وعروض الألعاب',
    title: 'بطاقة فيزا كارد مسبقة الدفع 50$ (Virtual Prepaid)',
    description: 'بطاقة فيزا افتراضية 50 دولار صالحة للشراء العالمي.',
    priceStars: 2125,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🔥',
    icon: 'visa'
  },
  {
    id: 'visa-virtual-75',
    category: 'visa',
    categoryNameAr: 'فيزا وعروض الألعاب',
    title: 'بطاقة فيزا كارد مسبقة الدفع 75$ (Virtual Prepaid)',
    description: 'بطاقة فيزا 75 دولار تسليم فوري لمعلومات البطاقة.',
    priceStars: 3185,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🔥',
    icon: 'visa'
  },
  {
    id: 'visa-virtual-100',
    category: 'visa',
    categoryNameAr: 'فيزا وعروض الألعاب',
    title: 'بطاقة فيزا كارد مسبقة الدفع 100$ (Virtual Prepaid)',
    description: 'بطاقة فيزا 100 دولار صالحة لجميع المتاجر والمنصات العالمية.',
    priceStars: 4250,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 💎',
    icon: 'visa'
  },
  {
    id: 'visa-virtual-150',
    category: 'visa',
    categoryNameAr: 'فيزا وعروض الألعاب',
    title: 'بطاقة فيزا كارد مسبقة الدفع 150$ (Virtual Prepaid)',
    description: 'بطاقة فيزا 150 دولار معتمدة مع كامل تفاصيل البطاقة وCVV.',
    priceStars: 6375,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 👑',
    icon: 'visa'
  },
  {
    id: 'visa-virtual-200',
    category: 'visa',
    categoryNameAr: 'فيزا وعروض الألعاب',
    title: 'بطاقة فيزا كارد مسبقة الدفع 200$ (Virtual Prepaid)',
    description: 'أعلى باقة فيزا 200 دولار بأرخص سعر بالسوق بخصم 15%.',
    priceStars: 8500,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🏆',
    icon: 'visa'
  },

  // ================= 12. Comprehensive Roblox ($25 to $200 with 15% Discount) =================
  {
    id: 'roblox-2000-robux',
    category: 'roblox',
    categoryNameAr: 'روبلوكس والألعاب',
    title: 'روبلوكس 2000 روبوكس (فئة 25$)',
    description: 'كود رقمي أصلي لشحن 2000 Robux في حسابك Roblox بخصم 15%.',
    priceStars: 1060,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🔥',
    icon: 'roblox'
  },
  {
    id: 'roblox-4500-robux',
    category: 'roblox',
    categoryNameAr: 'روبلوكس والألعاب',
    title: 'روبلوكس 4500 روبوكس (فئة 50$)',
    description: 'شحن 4500 Robux لحسابك في روبلوكس تسليم فوري للأكواد.',
    priceStars: 2125,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🔥',
    icon: 'roblox'
  },
  {
    id: 'roblox-10000-robux',
    category: 'roblox',
    categoryNameAr: 'روبلوكس والألعاب',
    title: 'روبلوكس 10,000 روبوكس (فئة 100$)',
    description: 'باقة 10000 Robux لشراء الملابس والأدوات النادرة بأرخص سعر.',
    priceStars: 4250,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 💎',
    icon: 'roblox'
  },
  {
    id: 'roblox-20000-robux',
    category: 'roblox',
    categoryNameAr: 'روبلوكس والألعاب',
    title: 'روبلوكس 20,000 روبوكس (فئة 200$)',
    description: 'أعلى فئة روبلوكس 20000 Robux بخصم 15% حصري.',
    priceStars: 8500,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🏆',
    icon: 'roblox'
  },

  // ================= 13. Comprehensive Netflix ($30 to $200 with 15% Discount) =================
  {
    id: 'netflix-ksa-200',
    category: 'netflix',
    categoryNameAr: 'نيتفلكس واشتراكات',
    title: 'بطاقة اشتراك نيتفلكس 200 ريال (Netflix KSA)',
    description: 'قسيمة رقمية لتجديد اشتراك نتفلكس 200 ريال بخصم 15%.',
    priceStars: 2295,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🔥',
    icon: 'netflix'
  },
  {
    id: 'netflix-ksa-300',
    category: 'netflix',
    categoryNameAr: 'نيتفلكس واشتراكات',
    title: 'بطاقة اشتراك نيتفلكس 300 ريال (Netflix KSA)',
    description: 'قسيمة نتفلكس 300 ريال للمتجر السعودي بأرخص سعر.',
    priceStars: 3400,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🔥',
    icon: 'netflix'
  },
  {
    id: 'netflix-ksa-500',
    category: 'netflix',
    categoryNameAr: 'نيتفلكس واشتراكات',
    title: 'بطاقة اشتراك نيتفلكس 500 ريال (Netflix KSA)',
    description: 'اشتراك نتفلكس طويل الأمد 500 ريال بخصم VIP استثنائي.',
    priceStars: 5695,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 💎',
    icon: 'netflix'
  },
  {
    id: 'netflix-us-30',
    category: 'netflix',
    categoryNameAr: 'نيتفلكس واشتراكات',
    title: 'بطاقة نيتفلكس 30$ - المتجر الأمريكي 🇺🇸',
    description: 'بطاقة شحن رصيد نيتفلكس 30 دولار للمتجر الأمريكي.',
    priceStars: 1275,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🔥',
    icon: 'netflix'
  },
  {
    id: 'netflix-us-50',
    category: 'netflix',
    categoryNameAr: 'نيتفلكس واشتراكات',
    title: 'بطاقة نيتفلكس 50$ - المتجر الأمريكي 🇺🇸',
    description: 'بطاقة نتفلكس 50 دولار صالحة لتجديد كافة الباقات.',
    priceStars: 2125,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🔥',
    icon: 'netflix'
  },
  {
    id: 'netflix-us-100',
    category: 'netflix',
    categoryNameAr: 'نيتفلكس واشتراكات',
    title: 'بطاقة نيتفلكس 100$ - المتجر الأمريكي 🇺🇸',
    description: 'بطاقة نتفلكس 100 دولار بأرخص سعر بالسوق بنسبة 15%.',
    priceStars: 4250,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 💎',
    icon: 'netflix'
  },
  {
    id: 'netflix-us-200',
    category: 'netflix',
    categoryNameAr: 'نيتفلكس واشتراكات',
    title: 'بطاقة نيتفلكس 200$ - المتجر الأمريكي 🇺🇸',
    description: 'أعلى باقة نتفلكس 200 دولار تسليم فوري للأكواد.',
    priceStars: 8500,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🏆',
    icon: 'netflix'
  },

  // ================= 14. Comprehensive Shein & Noon ($30 to $200 with 15% Discount) =================
  {
    id: 'shein-ksa-200',
    category: 'shein',
    categoryNameAr: 'شي إن والتسوق',
    title: 'بطاقة هدايا شي إن 200 ريال (SHEIN KSA)',
    description: 'قسيمة تسوق أصلية 200 ريال في تطبيق شي إن بخصم 15%.',
    priceStars: 2295,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🔥',
    icon: 'shein'
  },
  {
    id: 'shein-ksa-300',
    category: 'shein',
    categoryNameAr: 'شي إن والتسوق',
    title: 'بطاقة هدايا شي إن 300 ريال (SHEIN KSA)',
    description: 'قسيمة تسوق شي إن 300 ريال بأفضل سعر.',
    priceStars: 3400,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🔥',
    icon: 'shein'
  },
  {
    id: 'shein-ksa-500',
    category: 'shein',
    categoryNameAr: 'شي إن والتسوق',
    title: 'بطاقة هدايا شي إن 500 ريال (SHEIN KSA)',
    description: 'قسيمة تسوق فاخرة 500 ريال شي إن بخصم 15%.',
    priceStars: 5695,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 💎',
    icon: 'shein'
  },
  {
    id: 'shein-ksa-750',
    category: 'shein',
    categoryNameAr: 'شي إن والتسوق',
    title: 'بطاقة هدايا شي إن 750 ريال (~200$) (SHEIN KSA)',
    description: 'أعلى فئة لبطاقات شي إن 750 ريال تسليم فوري.',
    priceStars: 8500,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🏆',
    icon: 'shein'
  },
  {
    id: 'noon-ksa-200',
    category: 'noon',
    categoryNameAr: 'بطاقات نون',
    title: 'بطاقة هدايا نون 200 ريال (Noon KSA 🇸🇦)',
    description: 'رصيد شراء فوري 200 ريال على متجر نون بخصم 15%.',
    priceStars: 2295,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🔥',
    icon: 'noon'
  },
  {
    id: 'noon-ksa-300',
    category: 'noon',
    categoryNameAr: 'بطاقات نون',
    title: 'بطاقة هدايا نون 300 ريال (Noon KSA 🇸🇦)',
    description: 'رصيد نون 300 ريال للتسوق الإلكتروني بأرخص سعر.',
    priceStars: 3400,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🔥',
    icon: 'noon'
  },
  {
    id: 'noon-ksa-500',
    category: 'noon',
    categoryNameAr: 'بطاقات نون',
    title: 'بطاقة هدايا نون 500 ريال (Noon KSA 🇸🇦)',
    description: 'بطاقة تسوق نون 500 ريال لتسوق الأجهزة والإلكترونيات بخصم 15%.',
    priceStars: 5695,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 💎',
    icon: 'noon'
  },
  {
    id: 'noon-ksa-750',
    category: 'noon',
    categoryNameAr: 'بطاقات نون',
    title: 'بطاقة هدايا نون 750 ريال (~200$) (Noon KSA 🇸🇦)',
    description: 'أعلى فئة لبطاقات نون 750 ريال تسليم فوري في الخزنة.',
    priceStars: 8500,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🏆',
    icon: 'noon'
  },

  // ================= 15. Comprehensive Telecom STC & Zain ($30 to $200 with 15% Discount) =================
  {
    id: 'stc-sawa-card-100',
    category: 'telecom',
    categoryNameAr: 'الاتصالات (STC وزين)',
    region: 'السعودية 🇸🇦',
    title: 'بطاقات سوا 100 ريال (كود رقمي)',
    description: 'كود بطاقة شحن سوا 100 ريال مسبق الدفع بخصم 15%.',
    priceStars: 1145,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🔥',
    icon: 'telecom'
  },
  {
    id: 'stc-sawa-card-200',
    category: 'telecom',
    categoryNameAr: 'الاتصالات (STC وزين)',
    region: 'السعودية 🇸🇦',
    title: 'بطاقات سوا 200 ريال (كود رقمي)',
    description: 'كود شحن سوا 200 ريال بأرخص سعر بالسوق.',
    priceStars: 2295,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🔥',
    icon: 'telecom'
  },
  {
    id: 'stc-sawa-card-300',
    category: 'telecom',
    categoryNameAr: 'الاتصالات (STC وزين)',
    region: 'السعودية 🇸🇦',
    title: 'بطاقات سوا 300 ريال (كود رقمي)',
    description: 'كود شحن سوا 300 ريال لإعادة شحن أي خط STC فوراً.',
    priceStars: 3400,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🔥',
    icon: 'telecom'
  },
  {
    id: 'stc-sawa-card-500',
    category: 'telecom',
    categoryNameAr: 'الاتصالات (STC وزين)',
    region: 'السعودية 🇸🇦',
    title: 'بطاقات سوا 500 ريال (كود رقمي)',
    description: 'أعلى فئة لبطاقات سوا 500 ريال بخصم 15% وتوفير كبير.',
    priceStars: 5695,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 💎',
    icon: 'telecom'
  },
  {
    id: 'zain-recharge-200',
    category: 'telecom',
    categoryNameAr: 'الاتصالات (STC وزين)',
    region: 'السعودية 🇸🇦',
    title: 'زين باقة 200 ريال (Zain Card 200)',
    description: 'بطاقة شحن زين 200 ريال للمكالمات والإنترنت بخصم 15%.',
    priceStars: 2295,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🔥',
    icon: 'telecom'
  },
  {
    id: 'zain-recharge-300',
    category: 'telecom',
    categoryNameAr: 'الاتصالات (STC وزين)',
    region: 'السعودية 🇸🇦',
    title: 'زين باقة 300 ريال (Zain Card 300)',
    description: 'بطاقة شحن زين 300 ريال تسليم فوري للأكواد.',
    priceStars: 3400,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🔥',
    icon: 'telecom'
  },

  // ================= 16. Comprehensive LikeCard Wallets ($30 to $200 with 15% Discount) =================
  {
    id: 'lk-wallet-ksa-200',
    category: 'likecard',
    categoryNameAr: 'محافظ لايك كارد',
    region: 'السعودية 🇸🇦',
    title: 'رصيد محفظة لايك كارد 200 ريال (KSA 🇸🇦)',
    description: 'شحن رصيد محفظة لايك كارد 200 ريال بخصم 15% تسليم فوري.',
    priceStars: 2295,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🔥',
    icon: 'likecard'
  },
  {
    id: 'lk-wallet-ksa-300',
    category: 'likecard',
    categoryNameAr: 'محافظ لايك كارد',
    region: 'السعودية 🇸🇦',
    title: 'رصيد محفظة لايك كارد 300 ريال (KSA 🇸🇦)',
    description: 'شحن رصيد محفظة لايك كارد 300 ريال بأرخص سعر بالسوق.',
    priceStars: 3400,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🔥',
    icon: 'likecard'
  },
  {
    id: 'lk-wallet-ksa-500',
    category: 'likecard',
    categoryNameAr: 'محافظ لايك كارد',
    region: 'السعودية 🇸🇦',
    title: 'رصيد محفظة لايك كارد 500 ريال (KSA 🇸🇦)',
    description: 'شحن رصيد محفظة لايك كارد 500 ريال بخصم 15% وتوفير كبير.',
    priceStars: 5695,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 💎',
    icon: 'likecard'
  },
  {
    id: 'lk-wallet-ksa-750',
    category: 'likecard',
    categoryNameAr: 'محافظ لايك كارد',
    region: 'السعودية 🇸🇦',
    title: 'رصيد محفظة لايك كارد 750 ريال (~200$) (KSA 🇸🇦)',
    description: 'أعلى باقة لمحفظة لايك كارد 750 ريال بخصم 15%.',
    priceStars: 8500,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🏆',
    icon: 'likecard'
  },
  {
    id: 'lk-wallet-glb-30',
    category: 'likecard',
    categoryNameAr: 'محافظ لايك كارد',
    region: 'عالمي 🌐',
    title: 'رصيد محفظة لايك كارد 30$ (العالمية 🌐)',
    description: 'شحن رصيد محفظة لايك كارد الدولية 30 دولار بخصم 15%.',
    priceStars: 1275,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🔥',
    icon: 'likecard'
  },
  {
    id: 'lk-wallet-glb-50',
    category: 'likecard',
    categoryNameAr: 'محافظ لايك كارد',
    region: 'عالمي 🌐',
    title: 'رصيد محفظة لايك كارد 50$ (العالمية 🌐)',
    description: 'شحن رصيد محفظة لايك كارد الدولية 50 دولار بأفضل سعر.',
    priceStars: 2125,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🔥',
    icon: 'likecard'
  },
  {
    id: 'lk-wallet-glb-100',
    category: 'likecard',
    categoryNameAr: 'محافظ لايك كارد',
    region: 'عالمي 🌐',
    title: 'رصيد محفظة لايك كارد 100$ (العالمية 🌐)',
    description: 'شحن رصيد محفظة لايك كارد الدولية 100 دولار تسليم فوري للأكواد.',
    priceStars: 4250,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 💎',
    icon: 'likecard'
  },
  {
    id: 'lk-wallet-glb-200',
    category: 'likecard',
    categoryNameAr: 'محافظ لايك كارد',
    region: 'عالمي 🌐',
    title: 'رصيد محفظة لايك كارد 200$ (العالمية 🌐)',
    description: 'أعلى باقة لمحفظة لايك كارد الدولية 200 دولار بأرخص سعر بالسوق.',
    priceStars: 8500,
    type: 'AUTO_DELIVERY',
    badge: 'خصم 15% VIP 🏆',
    icon: 'likecard'
  },
  // --- قسم شراء حسابات بوبجي ---
  {
    id: 'pubg-acc-mythic-70',
    category: 'pubg_accounts',
    categoryNameAr: 'شراء حسابات بوبجي',
    region: 'عالمي',
    title: 'حساب ببجي لفل 72 - 45 ميثيك + إمفور ثلجي لفل 5',
    description: 'حساب ببجي مميز مشحون من السيزون 4، يحتوي على ميثيكات قديمة وبدلات نادرة جاهز لنقل الملكية بربط نظيف.',
    priceStars: 1850,
    type: 'AUTO_DELIVERY',
    badge: 'ميثيك + ثلجي ❄️',
    icon: 'pubg_accounts'
  },
  {
    id: 'pubg-acc-xsuit-max',
    category: 'pubg_accounts',
    categoryNameAr: 'شراء حسابات بوبجي',
    region: 'عالمي',
    title: 'حساب ببجي بدلة الغراب ماكس + 6 أسلحة مطورة رسالة قتل',
    description: 'حساب أسطوري ببدلة إكس ماكس كاملة التأثيرات، إمفور جوكر، إيه كيه حفرية، طاغية وكلوب كامل.',
    priceStars: 3600,
    type: 'AUTO_DELIVERY',
    badge: 'بدلة إكس ماكس 🦅',
    icon: 'pubg_accounts'
  },
  // --- قسم شراء حسابات تويتر ---
  {
    id: 'twitter-acc-verified-blue',
    category: 'twitter_accounts',
    categoryNameAr: 'شراء حسابات تويتر',
    region: 'عالمي',
    title: 'حساب تويتر (X) موثق بالعلامة الزرقاء + 12K متابع متفاعل',
    description: 'حساب تويتر موثق رسمي اشتراك Premium مفعل، إنشاء قديم 2018، متابعين حقيقيين ونشطين مع البريد الأساسي.',
    priceStars: 1250,
    type: 'AUTO_DELIVERY',
    badge: 'موثق Premium 🔷',
    icon: 'twitter_accounts'
  },
  {
    id: 'twitter-acc-aged-2011',
    category: 'twitter_accounts',
    categoryNameAr: 'شراء حسابات تويتر',
    region: 'عالمي',
    title: 'حساب تويتر إنشاء قديم 2011 (أمان عالي ضد الحظر)',
    description: 'حساب قديم جداً ممتاز للحملات الإعلانية والتسويق الرقمي، خامل ونظيف 100% مع كامل بيانات الوصول.',
    priceStars: 620,
    type: 'AUTO_DELIVERY',
    badge: 'إنشاء 2011 🛡️',
    icon: 'twitter_accounts'
  },
  // --- قسم شراء قنوات تلجرام ---
  {
    id: 'tg-channel-15k-members',
    category: 'telegram_channels',
    categoryNameAr: 'شراء قنوات تلجرام',
    region: 'عالمي',
    title: 'قناة تيليجرام عامة 15,000 عضو حقيقي مع نقل الملكية',
    description: 'قناة متفاعلة ذات محتوى تقني وألعاب، مشاهدات عالية يومية، يتم نقل ملكية القناة لحسابك المباشر.',
    priceStars: 1600,
    type: 'AUTO_DELIVERY',
    badge: '15K متفاعل 📢',
    icon: 'telegram_channels'
  },
  {
    id: 'tg-group-30k-active',
    category: 'telegram_channels',
    categoryNameAr: 'شراء قنوات تلجرام',
    region: 'عالمي',
    title: 'جروب تيليجرام نشط 30,000 عضو متفاعل (محادثات فورية)',
    description: 'مجموعة تيليجرام متفاعلة يومياً بمعدل رسائل عالي، نقل ملكية المالك الأساسي فورياً.',
    priceStars: 2100,
    type: 'AUTO_DELIVERY',
    badge: '30K قروب 🔥',
    icon: 'telegram_channels'
  },
  // --- قسم شراء حسابات اونلي فانز ---
  {
    id: 'of-acc-wallet-50',
    category: 'onlyfans_accounts',
    categoryNameAr: 'شراء حسابات اونلي فانز',
    region: 'عالمي',
    title: 'حساب أونلي فانز VIP مشحون رصيد 50$ جاهز للاستخدام',
    description: 'حساب مفعل وجاهز مع رصيد داخلي 50 دولار، إيميل وباسورد خاص مع كود التحقق.',
    priceStars: 2050,
    type: 'AUTO_DELIVERY',
    badge: 'رصيد 50$ 💎',
    icon: 'onlyfans_accounts'
  },
  {
    id: 'of-acc-wallet-100',
    category: 'onlyfans_accounts',
    categoryNameAr: 'شراء حسابات اونلي فانز',
    region: 'عالمي',
    title: 'حساب أونلي فانز VIP مشحون رصيد 100$ جاهز للاستخدام',
    description: 'حساب رسمي مفعل مع محفظة مشحونة 100 دولار للاشتراكات المباشرة والرسائل الخاصة.',
    priceStars: 3800,
    type: 'AUTO_DELIVERY',
    badge: 'رصيد 100$ 👑',
    icon: 'onlyfans_accounts'
  },
  // --- قسم شراء حسابات فان سبايسي ---
  {
    id: 'fanspicy-acc-vip-annual',
    category: 'fanspicy_accounts',
    categoryNameAr: 'شراء حسابات فان سبايسي',
    region: 'عالمي',
    title: 'حساب Fanspicy VIP اشتراك سنوي بريميوم مفعل',
    description: 'حساب فان سبايسي بريميوم مدفوع لمدة سنة كاملة مع ضمان كامل فترة الاشتراك.',
    priceStars: 1400,
    type: 'AUTO_DELIVERY',
    badge: 'اشتراك سنوي 🌶️',
    icon: 'fanspicy_accounts'
  },
  {
    id: 'fanspicy-acc-wallet-100',
    category: 'fanspicy_accounts',
    categoryNameAr: 'شراء حسابات فان سبايسي',
    region: 'عالمي',
    title: 'حساب Fanspicy VIP مشحون رصيد 100$ جاهز',
    description: 'حساب بريميوم مشحون برصيد 100 دولار تسليم فوري لبيانات الدخول وضمان استمرار الرصيد.',
    priceStars: 2750,
    type: 'AUTO_DELIVERY',
    badge: 'رصيد 100$ ⚡',
    icon: 'fanspicy_accounts'
  },
  // ================= 18. تليجرام بريميوم (Telegram Premium) =================
  {
    id: 'tg-prem-1m',
    category: 'tg_premium',
    categoryNameAr: 'تليجرام بريميوم',
    region: 'عالمي',
    title: 'اشتراك تليجرام بريميوم (شهر واحد) - بالمعرف',
    description: 'تفعيل رسمي ومباشر لاشتراك تيليجرام بريميوم لمدة شهر كامل لحسابك عبر اليوزر نيم بدون كلمة مرور.',
    priceStars: 220,
    type: 'DIRECT_TOPUP',
    badge: 'تفعيل فوري ⚡',
    icon: 'tg_premium',
    requiresPlayerId: true,
    playerIdPlaceholder: 'أدخل يوزر التليجرام الخاص بك (مثال: @username)'
  },
  {
    id: 'tg-prem-6m',
    category: 'tg_premium',
    categoryNameAr: 'تليجرام بريميوم',
    region: 'عالمي',
    title: 'اشتراك تليجرام بريميوم (6 أشهر) - خصم خاص',
    description: 'تفعيل بريميوم 6 أشهر بميزات النجمة الزرقاء، رفع سرعة التحميل، مضاعفة القنوات وتحويل الصوت لنصوص.',
    priceStars: 1050,
    type: 'DIRECT_TOPUP',
    badge: 'توفير 20% 🔥',
    icon: 'tg_premium',
    requiresPlayerId: true,
    playerIdPlaceholder: 'أدخل يوزر التليجرام الخاص بك (مثال: @username)'
  },
  {
    id: 'tg-prem-1y',
    category: 'tg_premium',
    categoryNameAr: 'تليجرام بريميوم',
    region: 'عالمي',
    title: 'اشتراك تليجرام بريميوم (سنة كاملة 12 شهر) - VIP',
    description: 'تفعيل سنوي رسمي وشامل لجميع ميزات تليجرام بريميوم بأفضل سعر منافس مع ضمان كامل المدة.',
    priceStars: 1850,
    type: 'DIRECT_TOPUP',
    badge: 'الأكثر توفيراً 👑',
    icon: 'tg_premium',
    requiresPlayerId: true,
    playerIdPlaceholder: 'أدخل يوزر التليجرام الخاص بك (مثال: @username)'
  },
  // ================= 19. شحن عملات تيك توك (TikTok Coins) =================
  {
    id: 'tt-coins-20usd',
    category: 'tiktok_coins',
    categoryNameAr: 'عملات تيك توك',
    region: 'عالمي',
    title: 'شحن 1,400 عملة تيك توك (باقة 20$ - الحد الأدنى)',
    description: 'شحن رصيد عملات تيك توك لإرسال الهدايا ودعم البث المباشر، تسليم فوري باليوزر نيم فقط.',
    priceStars: 1400,
    type: 'DIRECT_TOPUP',
    badge: 'الحد الأدنى 20$ 🪙',
    icon: 'tiktok_coins',
    requiresPlayerId: true,
    playerIdPlaceholder: 'أدخل يوزر حساب تيك توك (مثال: @tiktok_user)'
  },
  {
    id: 'tt-coins-50usd',
    category: 'tiktok_coins',
    categoryNameAr: 'عملات تيك توك',
    region: 'عالمي',
    title: 'شحن 3,500 عملة تيك توك (باقة 50$)',
    description: 'شحن فوري لعملات تيك توك الذهبية لحسابك مباشرة عبر اسم المستخدم مع وصول فوري للرصيد.',
    priceStars: 3500,
    type: 'DIRECT_TOPUP',
    badge: 'شحن سريع ⚡',
    icon: 'tiktok_coins',
    requiresPlayerId: true,
    playerIdPlaceholder: 'أدخل يوزر حساب تيك توك (مثال: @tiktok_user)'
  },
  {
    id: 'tt-coins-100usd',
    category: 'tiktok_coins',
    categoryNameAr: 'عملات تيك توك',
    region: 'عالمي',
    title: 'شحن 7,000 عملة تيك توك (باقة 100$)',
    description: 'باقة 7000 كوينز تيك توك للبثوث والداعمين الكبار، إيداع رسمي وآمن 100% بالمعرف.',
    priceStars: 7000,
    type: 'DIRECT_TOPUP',
    badge: 'باقة كبار الداعمين 💎',
    icon: 'tiktok_coins',
    requiresPlayerId: true,
    playerIdPlaceholder: 'أدخل يوزر حساب تيك توك (مثال: @tiktok_user)'
  },
  {
    id: 'tt-coins-200usd',
    category: 'tiktok_coins',
    categoryNameAr: 'عملات تيك توك',
    region: 'عالمي',
    title: 'شحن 14,200 عملة تيك توك (باقة 200$ - الحد الأقصى)',
    description: 'أعلى باقة شحن عملات تيك توك متوفرة بخصم VIP حصري، تسليم سريع ومضمون لحسابك باليوزر.',
    priceStars: 14000,
    type: 'DIRECT_TOPUP',
    badge: 'الحد الأقصى 200$ 👑',
    icon: 'tiktok_coins',
    requiresPlayerId: true,
    playerIdPlaceholder: 'أدخل يوزر حساب تيك توك (مثال: @tiktok_user)'
  },
  // ================= 20. شحن بيجو لايف (Bigo Live) =================
  {
    id: 'bigo-40-dia',
    category: 'bigo_live',
    categoryNameAr: 'بيجو لايف',
    region: 'عالمي',
    title: 'شحن 40 ماسة بيجو لايف (Bigo Live Diamonds)',
    description: 'شحن ماسات وجواهر تطبيق بيجو لايف بالمعرف Bigo ID مباشرة دون الحاجة لأي كلمات مرور.',
    priceStars: 70,
    type: 'DIRECT_TOPUP',
    badge: 'ماسات فورية 💎',
    icon: 'bigo_live',
    requiresPlayerId: true,
    playerIdPlaceholder: 'أدخل معرف Bigo ID الخاص بحسابك (مثال: 12345678)'
  },
  {
    id: 'bigo-210-dia',
    category: 'bigo_live',
    categoryNameAr: 'بيجو لايف',
    region: 'عالمي',
    title: 'شحن 210 ماسة بيجو لايف (Bigo Live Diamonds)',
    description: 'باقة 210 ماسة لإرسال الهدايا والتفاعل في غرف البث المباشر بيجو لايف عبر الـ ID الرسمي.',
    priceStars: 350,
    type: 'DIRECT_TOPUP',
    badge: 'الأكثر طلباً 🔥',
    icon: 'bigo_live',
    requiresPlayerId: true,
    playerIdPlaceholder: 'أدخل معرف Bigo ID الخاص بحسابك (مثال: 12345678)'
  },
  {
    id: 'bigo-1050-dia',
    category: 'bigo_live',
    categoryNameAr: 'بيجو لايف',
    region: 'عالمي',
    title: 'شحن 1,050 ماسة بيجو لايف (Bigo Live Diamonds)',
    description: 'باقة 1050 ماسة بيجو لايف بسعر منافس مخفض مع وصول فوري للرصيد فور إتمام الدفع.',
    priceStars: 1750,
    type: 'DIRECT_TOPUP',
    badge: 'عرض مميز ⭐',
    icon: 'bigo_live',
    requiresPlayerId: true,
    playerIdPlaceholder: 'أدخل معرف Bigo ID الخاص بحسابك (مثال: 12345678)'
  },
  {
    id: 'bigo-2100-dia',
    category: 'bigo_live',
    categoryNameAr: 'بيجو لايف',
    region: 'عالمي',
    title: 'شحن 2,100 ماسة بيجو لايف (Bigo Live Diamonds)',
    description: 'باقة ماسات بيجو لايف الملكية للداعمين، إيداع فوري وآمن عن طريق معرف الحساب Bigo ID.',
    priceStars: 3450,
    type: 'DIRECT_TOPUP',
    badge: 'باقة كبار الداعمين 👑',
    icon: 'bigo_live',
    requiresPlayerId: true,
    playerIdPlaceholder: 'أدخل معرف Bigo ID الخاص بحسابك (مثال: 12345678)'
  },
  // ================= 21. شحن لايكي لايف (Likee Live) =================
  {
    id: 'likee-84-gems',
    category: 'likee',
    categoryNameAr: 'لايكي لايف',
    region: 'عالمي',
    title: 'شحن 84 جوهرة لايكي (Likee Diamonds)',
    description: 'شحن فوري لحسابك في تطبيق لايكي عن طريق Likee ID الرسمي بالمعرف.',
    priceStars: 140,
    type: 'DIRECT_TOPUP',
    badge: 'شحن بالآيدي ⚡',
    icon: 'likee',
    requiresPlayerId: true,
    playerIdPlaceholder: 'أدخل الآيدي Likee ID الخاص بك (مثال: 87654321)'
  },
  {
    id: 'likee-420-gems',
    category: 'likee',
    categoryNameAr: 'لايكي لايف',
    region: 'عالمي',
    title: 'شحن 420 جوهرة لايكي (Likee Diamonds)',
    description: 'باقة 420 ماسة وجوهرة لايكي للبثوث المباشرة وإرسال الهدايا، شحن فوري بالمعرف.',
    priceStars: 690,
    type: 'DIRECT_TOPUP',
    badge: 'باقة شائعة ❤️',
    icon: 'likee',
    requiresPlayerId: true,
    playerIdPlaceholder: 'أدخل الآيدي Likee ID الخاص بك (مثال: 87654321)'
  },
  {
    id: 'likee-2100-gems',
    category: 'likee',
    categoryNameAr: 'لايكي لايف',
    region: 'عالمي',
    title: 'شحن 2,100 جوهرة لايكي (Likee Diamonds)',
    description: 'شحن كميات كبرى من جواهر وماسات لايكي لايف بخصم VIP وتفعيل فوري بالآيدي.',
    priceStars: 3400,
    type: 'DIRECT_TOPUP',
    badge: 'باقة كبرى 👑',
    icon: 'likee',
    requiresPlayerId: true,
    playerIdPlaceholder: 'أدخل الآيدي Likee ID الخاص بك (مثال: 87654321)'
  }
];

const DEFAULT_STOCK = {
  'apple-us-10': ['APL-US10-9988-7766-5544', 'APL-US10-1122-3344-5566'],
  'apple-us-30': ['APL-US30-9922-3344-5566', 'APL-US30-1100-2233-4455'],
  'apple-us-50': ['APL-US50-4455-6677-8899', 'APL-US50-9988-7766-5544'],
  'apple-us-75': ['APL-US75-1122-3344-5566'],
  'apple-us-100': ['APL-US100-8899-0011-2233', 'APL-US100-3344-5566-7788'],
  'apple-us-150': ['APL-US150-5566-7788-9900'],
  'apple-us-200': ['APL-US200-9900-1122-3344', 'APL-US200-5544-3322-1100'],
  'apple-tr-100': ['APL-TR100-8899-0011-2233'],
  'apple-uae-50': ['APL-UAE50-5566-7788-9900'],
  'apple-uae-100': ['APL-UAE100-7788-9900-1122'],
  'apple-uae-200': ['APL-UAE200-9900-1122-3344'],
  'apple-uae-500': ['APL-UAE500-1122-3344-5566'],
  'apple-ksa-50': ['APL-KSA50-9948-2019-4857'],
  'apple-ksa-100': ['APL-KSA100-1092-8374-6511'],
  'apple-ksa-200': ['APL-KSA200-8819-2039-4822'],
  'apple-ksa-300': ['APL-KSA300-5544-3322-1100'],
  'apple-ksa-500': ['APL-KSA500-9988-7766-1122'],
  'apple-ksa-750': ['APL-KSA750-3344-5566-7788'],
  'apple-jp-1000': ['APL-JP1000-4455-6677-8899'],
  'apple-uk-10': ['APL-UK10-3344-5566-7788'],
  'gplay-ksa-50': ['GP-KSA50-1092-8374-6511'],
  'gplay-ksa-100': ['GP-KSA100-9922-3344-5566'],
  'gplay-ksa-200': ['GP-KSA200-8819-2039-4822'],
  'gplay-ksa-300': ['GP-KSA300-5544-3322-1100'],
  'gplay-ksa-500': ['GP-KSA500-9988-7766-1122'],
  'gplay-ksa-750': ['GP-KSA750-3344-5566-7788'],
  'gplay-us-10': ['GP-US10-8819-2039-4822'],
  'gplay-us-30': ['GP-US30-9988-7766-5544'],
  'gplay-us-50': ['GP-US50-1122-3344-5566'],
  'gplay-us-75': ['GP-US75-5566-7788-9900'],
  'gplay-us-100': ['GP-US100-8899-0011-2233'],
  'gplay-us-150': ['GP-US150-3344-5566-7788'],
  'gplay-us-200': ['GP-US200-9900-1122-3344'],
  'gplay-eu-15': ['GP-EU15-5544-3322-1100'],
  'gplay-uae-50': ['GP-UAE50-7788-9900-1122'],
  'gplay-iq-10': ['GP-IQ10-9900-1122-3344'],
  'gplay-uk-10': ['GP-UK10-1122-3344-5566'],
  'stc-quicknet-10gb': ['STC-QN10-9988-7766-1122'],
  'stc-sawa-bundle-star': ['STC-STAR-5544-3322-1100'],
  'stc-sawa-card-50': ['STC-SAWA50-9988-1122-3344'],
  'stc-sawa-card-100': ['STC-SAWA100-4455-6677-8899'],
  'stc-sawa-card-200': ['STC-SAWA200-8899-0011-2233'],
  'stc-sawa-card-300': ['STC-SAWA300-5566-7788-9900'],
  'stc-sawa-card-500': ['STC-SAWA500-9900-1122-3344'],
  'zain-recharge-35': ['ZAIN-35-9988-7766-5544'],
  'zain-recharge-60': ['ZAIN-60-8899-0011-2233'],
  'zain-recharge-115': ['ZAIN-115-5566-7788-9900'],
  'zain-recharge-200': ['ZAIN-200-9900-1122-3344'],
  'zain-recharge-300': ['ZAIN-300-5544-3322-1100'],
  'lk-wallet-ksa-100': ['LK-KSA100-9923841094'],
  'lk-wallet-ksa-200': ['LK-KSA200-8819203948'],
  'lk-wallet-ksa-300': ['LK-KSA300-5510293847'],
  'lk-wallet-ksa-500': ['LK-KSA500-6629384710'],
  'lk-wallet-ksa-750': ['LK-KSA750-4499221100'],
  'lk-wallet-uae-100': ['LK-UAE100-8819203948'],
  'lk-wallet-oman-10': ['LK-OMN10-5510293847'],
  'lk-wallet-kwt-10': ['LK-KWT10-6629384710'],
  'lk-wallet-jor-10': ['LK-JOR10-4499221100'],
  'lk-wallet-bhr-10': ['LK-BHR10-3322110099'],
  'lk-wallet-egy-500': ['LK-EGY500-1100229988'],
  'lk-wallet-qat-100': ['LK-QAT100-9900112233'],
  'lk-wallet-glb-20': ['LK-GLB20-5544332211'],
  'lk-wallet-glb-30': ['LK-GLB30-9988776655'],
  'lk-wallet-glb-50': ['LK-GLB50-1122334455'],
  'lk-wallet-glb-100': ['LK-GLB100-8899001122'],
  'lk-wallet-glb-200': ['LK-GLB200-5566778899'],
  'razer-us-10': ['RZR-US10-9988-7766-5544'],
  'razer-us-30': ['RZR-US30-1122-3344-5566'],
  'razer-us-50': ['RZR-US50-5566-7788-9900'],
  'razer-us-75': ['RZR-US75-8899-0011-2233'],
  'razer-us-100': ['RZR-US100-9900-1122-3344'],
  'razer-us-150': ['RZR-US150-5544-3322-1100'],
  'razer-us-200': ['RZR-US200-4455-6677-8899'],
  'razer-glb-10': ['RZR-GLB10-8899-0011-2233'],
  'razer-glb-30': ['RZR-GLB30-1122-3344-5566'],
  'razer-glb-50': ['RZR-GLB50-5566-7788-9900'],
  'razer-glb-100': ['RZR-GLB100-9900-1122-3344'],
  'razer-glb-200': ['RZR-GLB200-5544-3322-1100'],
  'razer-tr-100': ['RZR-TR100-5566-7788-9900'],
  'binance-10-usdt': ['BNC-USDT10-9823-4412-XA91'],
  'binance-25-usdt': ['BNC-USDT25-9910-4482-PZ01'],
  'binance-30-usdt': ['BNC-USDT30-1122-3344-5566'],
  'binance-50-usdt': ['BNC-USDT50-5566-7788-9900'],
  'binance-75-usdt': ['BNC-USDT75-8899-0011-2233'],
  'binance-100-usdt': ['BNC-USDT100-9900-1122-3344'],
  'binance-150-usdt': ['BNC-USDT150-5544-3322-1100'],
  'binance-200-usdt': ['BNC-USDT200-4455-6677-8899'],
  'visa-virtual-10': ['VISA-4284-9912-4019-8821 | EXP: 12/28 | CVV: 712'],
  'visa-virtual-30': ['VISA-4284-1122-3344-5566 | EXP: 10/29 | CVV: 402'],
  'visa-virtual-50': ['VISA-4284-5566-7788-9900 | EXP: 11/29 | CVV: 819'],
  'visa-virtual-75': ['VISA-4284-8899-0011-2233 | EXP: 01/30 | CVV: 315'],
  'visa-virtual-100': ['VISA-4284-9900-1122-3344 | EXP: 03/30 | CVV: 928'],
  'visa-virtual-150': ['VISA-4284-5544-3322-1100 | EXP: 05/30 | CVV: 184'],
  'visa-virtual-200': ['VISA-4284-4455-6677-8899 | EXP: 08/30 | CVV: 647'],
  'flash-binance-5usdt': ['BNC-FLASH5-1122334455'],
  'roblox-800-robux': ['RBX-800-A1B2-C3D4-E5F6'],
  'roblox-2000-robux': ['RBX-2000-B2C3-D4E5-F6G7'],
  'roblox-4500-robux': ['RBX-4500-C3D4-E5F6-G7H8'],
  'roblox-10000-robux': ['RBX-10000-D4E5-F6G7-H8I9'],
  'roblox-20000-robux': ['RBX-20000-E5F6-G7H8-I9J0'],
  'netflix-ksa-100': ['NFLX-KSA100-9988-1122-3344'],
  'netflix-ksa-200': ['NFLX-KSA200-5566-7788-9900'],
  'netflix-ksa-300': ['NFLX-KSA300-8899-0011-2233'],
  'netflix-ksa-500': ['NFLX-KSA500-9900-1122-3344'],
  'netflix-us-30': ['NFLX-US30-1122-3344-5566'],
  'netflix-us-50': ['NFLX-US50-5566-7788-9900'],
  'netflix-us-100': ['NFLX-US100-8899-0011-2233'],
  'netflix-us-200': ['NFLX-US200-9900-1122-3344'],
  'shein-ksa-100': ['SHN-KSA100-9923841094'],
  'shein-ksa-200': ['SHN-KSA200-8819203948'],
  'shein-ksa-300': ['SHN-KSA300-5510293847'],
  'shein-ksa-500': ['SHN-KSA500-6629384710'],
  'shein-ksa-750': ['SHN-KSA750-4499221100'],
  'noon-ksa-100': ['NON-KSA100-8819203948'],
  'noon-ksa-200': ['NON-KSA200-9923841094'],
  'noon-ksa-300': ['NON-KSA300-5510293847'],
  'noon-ksa-500': ['NON-KSA500-6629384710'],
  'noon-ksa-750': ['NON-KSA750-4499221100'],
  'pubg-acc-mythic-m4': ['PUBG-LOGIN: pubg_vip_mythic72@gmail.com | PASS: M4Glacier#2026 | PIN: 8819'],
  'pubg-acc-raven-suit': ['PUBG-LOGIN: raven_suit_pubg@gmail.com | PASS: RavenVIP$9988 | PIN: 1092'],
  'tw-acc-verified-blue': ['X-USER: @verified_vip_hub | PASS: BlueBadgeX#2026 | EMAIL: tw_blue@outlook.com'],
  'tw-acc-vintage-2012': ['X-USER: @vintage_acc2012 | PASS: Vintage2012#Key | EMAIL: vintage12@yahoo.com'],
  'of-acc-50usd-balance': ['OF-USER: of_vip_50usd@gmail.com | PASS: OFpass50#2026 | CARD_REF: OF-BAL-50$'],
  'of-acc-100usd-balance': ['OF-USER: of_vip_100usd@gmail.com | PASS: OFpass100#2026 | CARD_REF: OF-BAL-100$'],
  'fs-acc-premium-vip': ['FS-USER: spicy_vip_user@gmail.com | PASS: Fanspicy#9988 | AUTH_CODE: FS-8829']
};

class ChannelDB {
  constructor() {
    this.telegram = null;
    this.channelId = null;
    this.adminQueueChannelId = null;
    this.state = {
      settings: {
        botToken: process.env.BOT_TOKEN || '',
        ordersChannelId: process.env.ADMIN_QUEUE_CHANNEL_ID || '',
        storageChannelId: process.env.PRIVATE_DB_CHANNEL_ID || ''
      },
      products: REGIONAL_PRODUCTS,
      stock: DEFAULT_STOCK,
      users: {},
      orders: [],
      transactions: [],
      chatMessages: [],
      activeBroadcast: null,
      broadcastHistory: [],
      lastSyncTime: null
    };

    this._loadFromDisk();
  }

  init(telegram, channelId, adminQueueChannelId) {
    this.telegram = telegram;
    this.channelId = channelId || this.state.settings.storageChannelId;
    this.adminQueueChannelId = adminQueueChannelId || this.state.settings.ordersChannelId || this.channelId;
    console.log(`[ChannelDB] Initialized with Storage Channel: ${this.channelId || 'LOCAL MOCK'}, Orders Channel: ${this.adminQueueChannelId || 'LOCAL MOCK'}`);
  }

  _loadFromDisk() {
    try {
      if (fs.existsSync(LEDGER_CACHE_FILE)) {
        const raw = fs.readFileSync(LEDGER_CACHE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);

        // Merge default products with cached products so all new card tiers are present
        const cachedProducts = Array.isArray(parsed.products) ? parsed.products : [];
        const mergedProducts = [...cachedProducts];
        for (const p of REGIONAL_PRODUCTS) {
          const idx = mergedProducts.findIndex(m => m.id === p.id);
          if (idx === -1) {
            mergedProducts.push(p);
          }
        }

        const mergedStock = { ...DEFAULT_STOCK, ...(parsed.stock || {}) };

        this.state = {
          ...this.state,
          ...parsed,
          settings: {
            ...this.state.settings,
            ...(parsed.settings || {})
          },
          products: mergedProducts.length > 0 ? mergedProducts : REGIONAL_PRODUCTS,
          stock: mergedStock,
          users: parsed.users || {},
          orders: parsed.orders || [],
          transactions: parsed.transactions || [],
          chatMessages: parsed.chatMessages || [],
          activeBroadcast: parsed.activeBroadcast || null,
          broadcastHistory: parsed.broadcastHistory || []
        };
      }
    } catch (err) {
      console.warn('[ChannelDB] Notice loading local cache:', err.message);
    }
  }

  _saveToDisk() {
    // Local JSON cache writing is permanently disabled for Vercel Serverless (read-only filesystem).
    // All persistence is safely managed in Google Cloud Firestore.
    return;
  }

  async appendToTelegramLedger(collection, payload) {
    this._saveToDisk();
    const targetChannel = this.state.settings.storageChannelId || this.channelId;
    if (!this.telegram || !targetChannel) {
      return { success: true, localOnly: true };
    }
    try {
      const messageText = `[VIP_DB:${collection}]\n\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\``;
      const sent = await this.telegram.sendMessage(targetChannel, messageText, { parse_mode: 'Markdown' });
      return { success: true, messageId: sent.message_id };
    } catch (err) {
      console.warn(`[ChannelDB] Ledger dispatch warning: ${err.message}. Local state saved.`);
      return { success: false, error: err.message };
    }
  }

  // ===================== TELEGRAM SETTINGS =====================

  getSettings() {
    return {
      botToken: this.state.settings.botToken || '',
      ordersChannelId: this.state.settings.ordersChannelId || '',
      storageChannelId: this.state.settings.storageChannelId || ''
    };
  }

  async saveSettings(newSettings) {
    this.state.settings = {
      ...this.state.settings,
      ...newSettings
    };
    this.channelId = this.state.settings.storageChannelId;
    this.adminQueueChannelId = this.state.settings.ordersChannelId;

    await this.appendToTelegramLedger('SETTINGS_UPDATE', {
      ordersChannelId: this.state.settings.ordersChannelId,
      storageChannelId: this.state.settings.storageChannelId,
      updatedAt: new Date().toISOString()
    });

    return this.state.settings;
  }

  // ===================== AUTO-STOCKING & PRODUCTS =====================

  getProducts(category = null) {
    let list = this.state.products;
    if (category && category !== 'all') {
      list = list.filter(p => p.category === category);
    }
    return list.map(p => {
      const isTopUp = p.type === 'DIRECT_TOPUP';

      return {
        ...p,
        isUnlimited: true,
        inStock: 999999,
        inStockText: isTopUp ? 'غير محدود / شحن تلقائي مباشر' : 'غير محدود / تسليم فوري للأكواد'
      };
    });
  }

  getProduct(id) {
    const p = this.state.products.find(item => item.id === id);
    if (!p) return null;
    const isTopUp = p.type === 'DIRECT_TOPUP';

    return {
      ...p,
      isUnlimited: true,
      inStock: 999999,
      inStockText: isTopUp ? 'غير محدود / شحن تلقائي مباشر' : 'غير محدود / تسليم فوري للأكواد'
    };
  }

  async updateProductPrice(productId, newStarsPrice) {
    const product = this.state.products.find(p => p.id === productId);
    if (!product) return null;

    const oldPrice = product.priceStars;
    product.priceStars = parseInt(newStarsPrice, 10);

    await this.appendToTelegramLedger('PRICE_UPDATE', {
      productId,
      oldPrice,
      newPrice: product.priceStars,
      timestamp: new Date().toISOString()
    });

    return product;
  }

  async updateProduct({ originalId, newId, title, priceStars, category, categoryNameAr, description, badge, type, icon, region }) {
    const product = this.state.products.find(p => p.id === originalId);
    if (!product) {
      return { error: 'المنتج غير موجود في قاعدة البيانات.' };
    }

    const cleanTitle = (title !== undefined ? title : (product.title || '')).trim();
    const cleanId = (newId || originalId || '').trim();
    const cleanPrice = priceStars !== undefined ? parseInt(priceStars, 10) : (product.priceStars || 0);

    // 1. Validation: Title must not be empty
    if (!cleanTitle) {
      return { error: 'اسم المنتج مطلوب ولا يمكن تركه فارغاً.' };
    }

    // 2. Validation: Slug/ID must not be empty
    if (!cleanId) {
      return { error: 'معرف المنتج (Slug) مطلوب ولا يمكن تركه فارغاً.' };
    }

    // 3. Validation: Slug/ID uniqueness
    if (cleanId !== originalId) {
      const existingProduct = this.state.products.find(p => p.id === cleanId);
      if (existingProduct) {
        return { error: `المعرف (${cleanId}) مستخدم بالفعل لمنتج آخر. يرجى اختيار معرف فريد (Unique Slug).` };
      }
    }

    // 4. Validation: Price must be positive integer
    if (isNaN(cleanPrice) || cleanPrice <= 0) {
      return { error: 'السعر بنجوم تيليجرام يجب أن يكون رقماً صحيحاً أكبر من الصفر.' };
    }

    // If Slug/ID changed, migrate stock codes array
    if (cleanId !== originalId) {
      if (this.state.stock[originalId]) {
        this.state.stock[cleanId] = this.state.stock[originalId];
        delete this.state.stock[originalId];
      }
      product.id = cleanId;
    }

    product.title = cleanTitle;
    product.priceStars = cleanPrice;
    if (category) product.category = category;
    if (categoryNameAr) product.categoryNameAr = categoryNameAr;
    if (description !== undefined) product.description = description;
    if (badge !== undefined) product.badge = badge;
    if (type) {
      product.type = type;
      if (type === 'DIRECT_TOPUP') {
        product.requiresPlayerId = true;
        if (!product.playerIdPlaceholder) product.playerIdPlaceholder = 'أدخل معرف اللاعب أو الحساب';
      } else {
        delete product.requiresPlayerId;
        delete product.playerIdPlaceholder;
      }
    }
    if (icon) product.icon = icon;
    if (region) product.region = region;
    product.updatedAt = new Date().toISOString();

    this._saveToDisk();

    await this.appendToTelegramLedger('PRODUCT_UPDATE', product);

    return { success: true, product };
  }

  async upsertProduct({ originalId, id, title, priceStars, category, categoryNameAr, description, badge, type, icon, region }) {
    if (originalId && this.state.products.some(p => p.id === originalId)) {
      return this.updateProduct({ originalId, newId: id, title, priceStars, category, categoryNameAr, description, badge, type, icon, region });
    }
    const cleanId = (id || '').trim();
    const cleanTitle = (title || '').trim();
    const cleanPrice = parseInt(priceStars, 10);

    if (!cleanId) return { error: 'معرف المنتج (Slug) مطلوب.' };
    if (!cleanTitle) return { error: 'اسم المنتج مطلوب.' };
    if (isNaN(cleanPrice) || cleanPrice <= 0) return { error: 'السعر بالنجوم يجب أن يكون أكبر من الصفر.' };

    const existingIndex = this.state.products.findIndex(p => p.id === cleanId);
    if (existingIndex >= 0) {
      return this.updateProduct({ originalId: cleanId, newId: cleanId, title, priceStars, category, categoryNameAr, description, badge, type, icon, region });
    }

    const newProduct = {
      id: cleanId,
      title: cleanTitle,
      category: category || 'general',
      categoryNameAr: categoryNameAr || category || 'منتجات عامة',
      priceStars: cleanPrice,
      type: type || 'AUTO_DELIVERY',
      badge: badge || '',
      description: description || '',
      icon: icon || category || 'general',
      region: region || 'عالمي',
      requiresPlayerId: type === 'DIRECT_TOPUP',
      playerIdPlaceholder: type === 'DIRECT_TOPUP' ? 'أدخل معرف اللاعب أو الحساب' : undefined,
      inStock: 999999,
      isUnlimited: true,
      inStockText: type === 'DIRECT_TOPUP' ? 'غير محدود / شحن تلقائي مباشر' : 'غير محدود / تسليم فوري للأكواد',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.state.products.push(newProduct);
    if (!this.state.stock[cleanId]) {
      this.state.stock[cleanId] = [`VIP-${cleanId.toUpperCase()}-INITIAL-001`];
    }
    this._saveToDisk();
    await this.appendToTelegramLedger('PRODUCT_ADD', newProduct);
    return { success: true, product: newProduct };
  }

  async saveProduct(product) {
    // Note: Manual inStock editing is prevented; stock is derived from codes array
    delete product.inStock;
    delete product.inStockText;

    const index = this.state.products.findIndex(p => p.id === product.id);
    if (index >= 0) {
      this.state.products[index] = { ...this.state.products[index], ...product };
    } else {
      this.state.products.push(product);
    }
    await this.appendToTelegramLedger('PRODUCT_UPSERT', product);
    return product;
  }

  async deleteProduct(id) {
    this.state.products = this.state.products.filter(p => p.id !== id);
    await this.appendToTelegramLedger('PRODUCT_DELETE', { id, timestamp: new Date().toISOString() });
    return true;
  }

  // ===================== BULK AUTO-STOCK DEPOSIT =====================

  getStock(productId) {
    return this.state.stock[productId] || [];
  }

  async addStockCodes(productId, rawCodes) {
    if (!this.state.stock[productId]) {
      this.state.stock[productId] = [];
    }
    const codeList = Array.isArray(rawCodes) ? rawCodes : [rawCodes];
    // Clean & deduplicate
    const cleaned = codeList.map(c => c.trim()).filter(c => c.length > 0);
    this.state.stock[productId].push(...cleaned);

    const newTotal = this.state.stock[productId].length;

    await this.appendToTelegramLedger('STOCK_BULK_DEPOSIT', {
      productId,
      countAdded: cleaned.length,
      newTotal,
      timestamp: new Date().toISOString()
    });

    return newTotal;
  }

  async popStockCode(productId) {
    const codes = this.state.stock[productId];
    if (codes && codes.length > 0) {
      const code = codes.shift();
      await this.appendToTelegramLedger('STOCK_DISPATCH', {
        productId,
        remainingCount: codes.length,
        timestamp: new Date().toISOString()
      });
      return code;
    }
    // Dynamic fallback code generation for unlimited stock mode
    const cleanId = String(productId).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const seg1 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const seg2 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const seg3 = Math.floor(1000 + Math.random() * 9000);
    const code = `VIP-${cleanId}-${seg1}-${seg2}-${seg3}`;
    return code;
  }

  // ===================== USER CAPTURING & RETENTION =====================

  captureUser({ userId, username, firstName, languageCode }) {
    if (!userId) return null;
    const uid = String(userId);

    if (!this.state.users[uid]) {
      this.state.users[uid] = {
        userId: uid,
        username: username || '',
        firstName: firstName || 'VIP Member',
        languageCode: languageCode || 'ar',
        points: 0,
        vipTier: 'BRONZE',
        isBanned: false,
        streakDays: 1,
        joinedAt: new Date().toISOString(),
        lastActive: new Date().toISOString()
      };
      this.appendToTelegramLedger('USER_REGISTERED', {
        userId: uid,
        username,
        firstName,
        joinedAt: this.state.users[uid].joinedAt
      });
    } else {
      this.state.users[uid].lastActive = new Date().toISOString();
      if (username) this.state.users[uid].username = username;
      if (firstName) this.state.users[uid].firstName = firstName;
    }

    this._saveToDisk();
    return this.state.users[uid];
  }

  getUser(userId) {
    const uid = String(userId);
    if (!this.state.users[uid]) {
      return this.captureUser({ userId: uid });
    }
    return this.state.users[uid];
  }

  getUsers() {
    return Object.values(this.state.users).map(u => {
      const userOrders = this.state.orders.filter(o => String(o.userId) === String(u.userId));
      return {
        ...u,
        totalOrders: userOrders.length,
        totalSpentStars: userOrders.reduce((sum, o) => sum + (o.starsPaid || 0), 0)
      };
    });
  }

  async banUser(userId, isBanned = true) {
    const user = this.getUser(userId);
    user.isBanned = Boolean(isBanned);

    await this.appendToTelegramLedger('USER_BAN_UPDATE', {
      userId: String(userId),
      isBanned: user.isBanned,
      timestamp: new Date().toISOString()
    });

    return user;
  }

  isUserBanned(userId) {
    const user = this.state.users[String(userId)];
    return user ? Boolean(user.isBanned) : false;
  }

  async addPoints(userId, amount, reason = 'REWARD') {
    const user = this.getUser(userId);
    user.points = (user.points || 0) + amount;
    await this.appendToTelegramLedger('USER_POINTS', {
      userId: String(userId),
      pointsDelta: amount,
      totalPoints: user.points,
      reason,
      timestamp: new Date().toISOString()
    });
    return user;
  }

  async addStarsBalance(userId, amount, reason = 'TOPUP') {
    const user = this.getUser(userId);
    user.starsBalance = Math.max(0, (user.starsBalance || 0) + Number(amount));
    this._saveToDisk();
    await this.appendToTelegramLedger('USER_STARS_BALANCE', {
      userId: String(userId),
      starsDelta: Number(amount),
      totalStarsBalance: user.starsBalance,
      reason,
      timestamp: new Date().toISOString()
    });
    return user;
  }

  // ===================== BROADCASTING SYSTEM =====================

  async saveBroadcast({ title, message, imageUrl = null, buttonText = null, buttonUrl = null, displayMode = 'both', recipientsCount = 0 }) {
    const broadcastRecord = {
      id: `BC-${Date.now()}`,
      title: title.trim(),
      message: message.trim(),
      imageUrl: imageUrl ? imageUrl.trim() : null,
      buttonText: buttonText ? buttonText.trim() : null,
      buttonUrl: buttonUrl ? buttonUrl.trim() : null,
      displayMode: displayMode || 'both',
      recipientsCount,
      sentAt: new Date().toISOString()
    };

    this.state.activeBroadcast = broadcastRecord;
    this.state.broadcastHistory.unshift(broadcastRecord);

    await this.appendToTelegramLedger('BROADCAST_SENT', broadcastRecord);
    return broadcastRecord;
  }

  getActiveBroadcast() {
    return this.state.activeBroadcast;
  }

  dismissActiveBroadcast() {
    this.state.activeBroadcast = null;
    this._saveToDisk();
    return true;
  }

  getBroadcastHistory() {
    return this.state.broadcastHistory;
  }

  // ===================== LIVE SUPPORT CHAT =====================

  getChatMessages(userId) {
    const uid = String(userId);
    return this.state.chatMessages.filter(m => String(m.userId) === uid);
  }

  getChatThreads() {
    const threads = {};
    for (const msg of this.state.chatMessages) {
      const uid = String(msg.userId);
      if (!threads[uid]) {
        threads[uid] = {
          userId: uid,
          userName: msg.userName || 'VIP Member',
          lastMessage: msg.text,
          lastTimestamp: msg.timestamp,
          unreadCount: 0,
          messages: []
        };
      }
      threads[uid].messages.push(msg);
      threads[uid].lastMessage = msg.text;
      threads[uid].lastTimestamp = msg.timestamp;
      if (msg.sender === 'user' && !msg.readByAdmin) {
        threads[uid].unreadCount++;
      }
    }
    return Object.values(threads).sort((a, b) => new Date(b.lastTimestamp) - new Date(a.lastTimestamp));
  }

  async saveChatMessage({ userId, userName, sender, text, attachmentUrl = null, orderRef = null }) {
    const msg = {
      id: `MSG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: String(userId),
      userName: userName || 'VIP Member',
      sender: sender || 'user',
      text: text.trim(),
      attachmentUrl,
      orderRef,
      timestamp: new Date().toISOString(),
      readByAdmin: sender === 'admin',
      readByUser: sender === 'user'
    };

    this.state.chatMessages.push(msg);

    await this.appendToTelegramLedger('SUPPORT_CHAT_MESSAGE', {
      messageId: msg.id,
      userId: msg.userId,
      sender: msg.sender,
      timestamp: msg.timestamp
    });

    return msg;
  }

  async markThreadReadByAdmin(userId) {
    const uid = String(userId);
    this.state.chatMessages.forEach(m => {
      if (String(m.userId) === uid) {
        m.readByAdmin = true;
      }
    });
    this._saveToDisk();
    return true;
  }

  // ===================== ORDERS & TRANSACTIONS =====================

  getOrders(userId = null) {
    if (userId) {
      return this.state.orders.filter(o => String(o.userId) === String(userId));
    }
    return this.state.orders;
  }

  getOrder(orderId) {
    return this.state.orders.find(o => o.id === orderId);
  }

  async createOrder(orderData) {
    const order = {
      id: `VIP-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
      status: orderData.type === 'AUTO_DELIVERY' ? 'FULFILLED' : 'PENDING',
      createdAt: new Date().toISOString(),
      ...orderData
    };

    this.state.orders.unshift(order);
    await this.appendToTelegramLedger('ORDER_CREATED', order);
    return order;
  }

  async updateOrderStatus(orderId, status, adminNote = '') {
    const order = this.state.orders.find(o => o.id === orderId);
    if (!order) return null;

    order.status = status;
    order.adminNote = adminNote;
    order.updatedAt = new Date().toISOString();

    await this.appendToTelegramLedger('ORDER_STATUS_UPDATE', {
      orderId,
      status,
      adminNote,
      timestamp: order.updatedAt
    });

    return order;
  }

  async logTransaction(tx) {
    const record = {
      id: `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      ...tx
    };
    this.state.transactions.unshift(record);
    await this.appendToTelegramLedger('TRANSACTION', record);
    return record;
  }

  getTransactions(userId = null) {
    if (userId) {
      return this.state.transactions.filter(t => String(t.userId) === String(userId));
    }
    return this.state.transactions;
  }

  getStats() {
    return {
      totalProducts: this.state.products.length,
      totalOrders: this.state.orders.length,
      pendingTopups: this.state.orders.filter(o => o.status === 'PENDING').length,
      totalTransactions: this.state.transactions.length,
      totalUsers: Object.keys(this.state.users).length,
      bannedUsers: Object.values(this.state.users).filter(u => u.isBanned).length,
      totalChatMessages: this.state.chatMessages.length,
      totalStockCodes: Object.values(this.state.stock).reduce((acc, curr) => acc + curr.length, 0),
      channelIdConfigured: Boolean(this.state.settings.storageChannelId || this.channelId)
    };
  }
}

module.exports = new ChannelDB();
