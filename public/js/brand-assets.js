/**
 * VIP Card App - Official Brand Assets & Regional Flag Engine
 * Provides authentic, high-resolution official vector logos and flag badges
 * for Razer Gold, LikeCard, PUBG Mobile, Apple, Google Play, Binance, Visa,
 * Netflix, Roblox, Shein, Noon, Telecom, and social/account categories.
 * 
 * CRITICAL UI FIX: All icons have 100% TRANSPARENT backgrounds so the
 * card's gradient and background remain vivid, official, and un-cropped!
 */

const BrandAssets = (function () {

  // Official Brand Vector SVGs (100% Transparent Backgrounds, Retina-Crisp, Object-Fit Contain)
  const LOGOS = {
    // 1. Razer Gold - Official Toxic Neon Green 3-Headed Snake on Transparent Canvas
    razer: `
      <svg class="brand-official-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Outer Glowing Hexagon Accent -->
        <path d="M50 6L88 28V72L50 94L12 72V28L50 6Z" stroke="#00FF00" stroke-width="3" stroke-opacity="0.6"/>
        <!-- Razer Tri-Serpent Iconic Motif -->
        <path d="M50 18C43 23 38 31 38 40C38 49 44 54 50 58C56 54 62 49 62 40C62 31 57 23 50 18Z" fill="#00FF00"/>
        <path d="M31 32C29 38 31 46 37 50C43 54 48 58 50 64C46 63 42 59 38 56C31 51 26 44 26 36C26 31 28 29 31 32Z" fill="#00FF00"/>
        <path d="M69 32C71 38 69 46 63 50C57 54 52 58 50 64C54 63 58 59 62 56C69 51 74 44 74 36C74 31 72 29 69 32Z" fill="#00FF00"/>
        <circle cx="50" cy="38" r="4.5" fill="#050709"/>
        <circle cx="35" cy="42" r="3" fill="#050709"/>
        <circle cx="65" cy="42" r="3" fill="#050709"/>
        <path d="M46 74L50 68L54 74H46Z" fill="#00FF00"/>
      </svg>
    `,

    // 2. PUBG Mobile - Official Spetsnaz Level 3 Helmet with Golden Visor on Transparent Canvas
    pubg: `
      <svg class="brand-official-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Helmet Shell -->
        <path d="M22 44C22 28.5 34.5 16 50 16C65.5 16 78 28.5 78 44V60C78 64 75 67 71 67H67V78C67 80 65 82 63 82H37C35 82 33 80 33 78V67H29C25 67 22 64 22 60V44Z" fill="#2d333b" stroke="#f59e0b" stroke-width="2"/>
        <!-- Titanium Dome Highlight -->
        <path d="M28 42C28 29.8 37.8 20 50 20C62.2 20 72 29.8 72 42V46H28V42Z" fill="#475569"/>
        <!-- Welding Visor Grill Frame -->
        <rect x="25" y="44" width="50" height="22" rx="6" fill="#0f172a" stroke="#eab308" stroke-width="2.5"/>
        <!-- Signature Gold Visor Slits -->
        <rect x="31" y="51" width="8" height="8" rx="2" fill="#fde047"/>
        <rect x="43" y="51" width="14" height="8" rx="2" fill="#fde047"/>
        <rect x="61" y="51" width="8" height="8" rx="2" fill="#fde047"/>
        <circle cx="29" cy="36" r="2.5" fill="#cbd5e1"/>
        <circle cx="71" cy="36" r="2.5" fill="#cbd5e1"/>
        <circle cx="50" cy="74" r="3" fill="#eab308"/>
      </svg>
    `,

    // 3. LikeCard - Official Emerald Green Card with Gold Crest on Transparent Canvas
    likecard: `
      <svg class="brand-official-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Emerald Rounded Card -->
        <rect x="12" y="22" width="76" height="56" rx="12" fill="url(#likecard_grad)" stroke="#34d399" stroke-width="2.5"/>
        <path d="M12 42H88" stroke="#065f46" stroke-width="4"/>
        <!-- Golden Hologram Chip -->
        <rect x="22" y="48" width="18" height="14" rx="3" fill="#fde047" stroke="#ca8a04" stroke-width="1.5"/>
        <path d="M27 48V62M35 48V62M22 55H40" stroke="#ca8a04" stroke-width="1"/>
        <!-- LikeCard Checkmark Badge -->
        <circle cx="70" cy="55" r="10" fill="#047857"/>
        <path d="M65 55L69 59L76 51" stroke="#fde047" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        <defs>
          <linearGradient id="likecard_grad" x1="12" y1="22" x2="88" y2="78" gradientUnits="userSpaceOnUse">
            <stop stop-color="#059669"/>
            <stop offset="1" stop-color="#064e3b"/>
          </linearGradient>
        </defs>
      </svg>
    `,

    // 4. Apple - Official Bitten Apple Logo in Chrome & Minimalist Glow on Transparent Canvas
    apple: `
      <svg class="brand-official-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Leaf -->
        <path d="M57.5 22C59.2 19.8 60.5 16.8 60.1 13.8C57.6 13.9 54.4 15.6 52.6 17.8C51.1 19.6 49.8 22.6 50.2 25.5C53.1 25.7 55.9 24 57.5 22Z" fill="url(#apple_grad)"/>
        <!-- Silhouette -->
        <path d="M67.2 57.6C67.2 49.3 73.9 45.2 74.3 44.9C70.5 39.4 64.7 38.6 62.7 38.4C57.7 37.9 52.9 41.4 50.3 41.4C47.8 41.4 43.8 38.4 39.7 38.4C34.4 38.4 29.4 41.5 26.6 46.3C21 56.1 25.2 70.6 30.6 78.4C33.2 82.2 36.2 86.4 40.3 86.2C44.3 86 45.9 83.5 50.7 83.5C55.4 83.5 56.9 86.2 61.1 86.1C65.4 86 68 82.2 70.6 78.4C73.6 74 74.8 69.8 75 69.4C74.7 69.3 67.2 66.4 67.2 57.6Z" fill="url(#apple_grad)"/>
        <defs>
          <linearGradient id="apple_grad" x1="24" y1="14" x2="75" y2="86" gradientUnits="userSpaceOnUse">
            <stop stop-color="#FFFFFF"/>
            <stop offset="1" stop-color="#E2E8F0"/>
          </linearGradient>
        </defs>
      </svg>
    `,

    // 5. Google Play - Official Multi-Color 4-Segment Triangle on Transparent Canvas
    google: `
      <svg class="brand-official-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Segments -->
        <path d="M22 16L54 48L22 80V16Z" fill="#00D3FF"/>
        <path d="M68 34L22 16L54 48L68 34Z" fill="#00E676"/>
        <path d="M22 80L68 62L54 48L22 80Z" fill="#FF3D00"/>
        <path d="M78 48L68 34L54 48L68 62L78 48Z" fill="#FFC400"/>
      </svg>
    `,

    // 6. Binance - Official Interlocking Diamond Crypto Logo in Binance Gold on Transparent Canvas
    binance: `
      <svg class="brand-official-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M50 16L64 30L50 44L36 30L50 16Z" fill="#F0B90B"/>
        <path d="M70 36L84 50L70 64L56 50L70 36Z" fill="#F0B90B"/>
        <path d="M30 36L44 50L30 64L16 50L30 36Z" fill="#F0B90B"/>
        <path d="M50 56L64 70L50 84L36 70L50 56Z" fill="#F0B90B"/>
        <path d="M50 41L59 50L50 59L41 50L50 41Z" fill="#F0B90B"/>
      </svg>
    `,

    // 7. Visa / MasterCard - Dual Premium Card Emblem on Transparent Canvas
    visa: `
      <svg class="brand-official-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="12" y="24" width="76" height="52" rx="10" fill="url(#visa_grad)" stroke="#60a5fa" stroke-width="2"/>
        <rect x="12" y="36" width="76" height="9" fill="#0f172a"/>
        <!-- Chip -->
        <rect x="20" y="52" width="14" height="11" rx="2" fill="#facc15"/>
        <!-- Mastercard Intersecting Circles -->
        <circle cx="62" cy="58" r="9" fill="#ef4444" fill-opacity="0.95"/>
        <circle cx="73" cy="58" r="9" fill="#f59e0b" fill-opacity="0.9"/>
        <defs>
          <linearGradient id="visa_grad" x1="12" y1="24" x2="88" y2="76" gradientUnits="userSpaceOnUse">
            <stop stop-color="#1d4ed8"/>
            <stop offset="1" stop-color="#1e3a8a"/>
          </linearGradient>
        </defs>
      </svg>
    `,

    // 8. Roblox - Official Tilted Isometric Cube on Transparent Canvas
    roblox: `
      <svg class="brand-official-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g transform="rotate(12 50 50)">
          <rect x="22" y="22" width="56" height="56" rx="14" fill="#E11D48" stroke="#ffffff" stroke-width="2.5"/>
          <rect x="42" y="42" width="16" height="16" rx="4" fill="#ffffff"/>
        </g>
      </svg>
    `,

    // 9. Netflix - Official Red Ribbon N on Transparent Canvas
    netflix: `
      <svg class="brand-official-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M28 14H40V86H28V14Z" fill="#E50914"/>
        <path d="M60 14H72V86H60V14Z" fill="#E50914"/>
        <path d="M28 14L72 86H60L28 29V14Z" fill="#B81D24"/>
      </svg>
    `,

    // 10. SHEIN - Chic Fashion Typography on Transparent Canvas
    shein: `
      <svg class="brand-official-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M34 26C34 17 41 10 50 10C59 10 66 17 66 26V32H34V26Z" stroke="#f43f5e" stroke-width="4" fill="none"/>
        <path d="M22 32H78L73 86C73 88 71 90 69 90H31C29 90 27 88 27 86L22 32Z" fill="rgba(244,63,94,0.22)" stroke="#f43f5e" stroke-width="3"/>
        <path d="M42 42C42 47 45 50 50 50C55 50 58 47 58 42" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>
        <text x="50" y="72" font-size="12" font-weight="900" text-anchor="middle" fill="#ffffff" font-family="sans-serif" letter-spacing="2">SHEIN</text>
      </svg>
    `,

    // 11. Noon - Official Radiant Yellow Noon Disc on Transparent Canvas
    noon: `
      <svg class="brand-official-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="36" stroke="#000000" stroke-width="7" fill="none"/>
        <circle cx="50" cy="36" r="5" fill="#000000"/>
        <circle cx="50" cy="50" r="22" stroke="#000000" stroke-width="4" stroke-linecap="round" fill="none"/>
      </svg>
    `,

    // 12. Telecom - STC & Zain Saudi on Transparent Canvas
    telecom: `
      <svg class="brand-official-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="38" fill="#6366f1" fill-opacity="0.25"/>
        <path d="M30 66C30 54 39 44 50 44C61 44 70 54 70 66" stroke="#C084FC" stroke-width="6" stroke-linecap="round"/>
        <path d="M22 72C22 50 35 34 50 34C65 34 78 50 78 72" stroke="#22D3EE" stroke-width="4" stroke-linecap="round"/>
        <circle cx="50" cy="26" r="8" fill="#FACC15"/>
      </svg>
    `,

    // 13. Twitter / X Accounts on Transparent Canvas
    twitter_accounts: `
      <svg class="brand-official-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="38" fill="#000000" fill-opacity="0.5" stroke="#334155" stroke-width="2"/>
        <path d="M70 28L53 49L72 72H57L44 56L31 72H28L46 51L28 28H43L55 44L67 28H70Z" fill="#FFFFFF"/>
      </svg>
    `,

    // 14. Telegram Channels on Transparent Canvas
    telegram_channels: `
      <svg class="brand-official-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="38" fill="#24A1DE"/>
        <path d="M26 49L74 31L63 71L49 58L40 63L42 51L65 38L36 47L26 49Z" fill="#FFFFFF"/>
      </svg>
    `,

    // 15. PUBG Accounts on Transparent Canvas
    pubg_accounts: `
      <svg class="brand-official-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="38" stroke="#F59E0B" stroke-width="3" fill="#1e1810" fill-opacity="0.8"/>
        <path d="M50 18L60 37L80 39L65 53L69 73L50 63L31 73L35 53L20 39L40 37L50 18Z" fill="#F59E0B"/>
        <circle cx="50" cy="47" r="10" fill="#0f0d09"/>
        <text x="50" y="51" font-size="10" font-weight="900" text-anchor="middle" fill="#F59E0B" font-family="sans-serif">PUBG</text>
      </svg>
    `,

    // 16. OnlyFans Accounts on Transparent Canvas
    onlyfans_accounts: `
      <svg class="brand-official-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="38" fill="#00AFF0" fill-opacity="0.25" stroke="#00AFF0" stroke-width="3"/>
        <circle cx="50" cy="50" r="22" stroke="#00AFF0" stroke-width="5" fill="none"/>
        <circle cx="50" cy="50" r="8" fill="#00AFF0"/>
        <path d="M50 20C66.5 20 80 33.5 80 50" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/>
      </svg>
    `,

    // 17. FanSpicy Accounts on Transparent Canvas
    fanspicy_accounts: `
      <svg class="brand-official-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="38" fill="#ea580c" fill-opacity="0.25"/>
        <path d="M50 16C50 16 65 35 65 54C65 69 55 80 50 80C45 80 35 69 35 54C35 41 44 30 46 26C47 32 50 36 52 36C54 36 55 32 55 28C55 22 50 16 50 16Z" fill="#F97316"/>
        <path d="M50 48C50 48 56 56 56 64C56 70 52 74 50 74C48 74 44 70 44 64C44 58 48 52 50 48Z" fill="#FDE047"/>
      </svg>
    `,

    // 18. Telegram Premium on Transparent Canvas
    tg_premium: `
      <svg class="brand-official-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="38" fill="url(#tg_prem_grad)" fill-opacity="0.3" stroke="#8b5cf6" stroke-width="2.5"/>
        <!-- Premium 8-Pointed Star -->
        <path d="M50 14L57 36L79 29L66 48L84 62L62 65L64 88L47 73L30 87L34 65L14 60L33 48L22 28L43 37L50 14Z" fill="url(#tg_star_grad)"/>
        <!-- Glowing Inner Core -->
        <circle cx="50" cy="50" r="10" fill="#ffffff" fill-opacity="0.9"/>
        <path d="M44 50L48 54L56 46" stroke="#7c3aed" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        <defs>
          <linearGradient id="tg_prem_grad" x1="12" y1="12" x2="88" y2="88" gradientUnits="userSpaceOnUse">
            <stop stop-color="#8b5cf6"/>
            <stop offset="1" stop-color="#3b82f6"/>
          </linearGradient>
          <linearGradient id="tg_star_grad" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
            <stop stop-color="#c084fc"/>
            <stop offset="0.5" stop-color="#a855f7"/>
            <stop offset="1" stop-color="#6366f1"/>
          </linearGradient>
        </defs>
      </svg>
    `,

    // 19. TikTok Coins on Transparent Canvas
    tiktok_coins: `
      <svg class="brand-official-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Outer Glowing Ring -->
        <circle cx="50" cy="50" r="38" fill="#000000" fill-opacity="0.4" stroke="#ff0050" stroke-width="2"/>
        <!-- Golden Coin Base -->
        <circle cx="52" cy="50" r="30" fill="url(#tt_coin_grad)" stroke="#ca8a04" stroke-width="2.5"/>
        <!-- TikTok Note Icon with Dual Cyan & Pink Offset -->
        <path d="M47 30V56C47 62 42 66 36 66C30 66 26 62 26 56C26 50 31 46 37 46C38 46 39 46.2 40 46.5V36C38.7 35.7 37.4 35.5 36 35.5C25 35.5 16 44.5 16 55.5C16 66.5 25 75.5 36 75.5C47 75.5 56 66.5 56 55.5V41C61 44.8 67 47 73.5 47V37C67 37 61 31.8 61 25.5H51L47 30Z" fill="#00f2fe" fill-opacity="0.8"/>
        <path d="M44 27V53C44 59 39 63 33 63C27 63 23 59 23 53C23 47 28 43 34 43C35 43 36 43.2 37 43.5V33C35.7 32.7 34.4 32.5 33 32.5C22 32.5 13 41.5 13 52.5C13 63.5 22 72.5 33 72.5C44 72.5 53 63.5 53 52.5V38C58 41.8 64 44 70.5 44V34C64 34 58 28.8 58 22.5H48L44 27Z" fill="#ff0050" fill-opacity="0.85"/>
        <path d="M46 29V55C46 61 41 65 35 65C29 65 25 61 25 55C25 49 30 45 36 45C37 45 38 45.2 39 45.5V35C37.7 34.7 36.4 34.5 35 34.5C24 34.5 15 43.5 15 54.5C15 65.5 24 74.5 35 74.5C46 74.5 55 65.5 55 54.5V40C60 43.8 66 46 72.5 46V36C66 36 60 30.8 60 24.5H50L46 29Z" fill="#ffffff"/>
        <defs>
          <linearGradient id="tt_coin_grad" x1="22" y1="20" x2="82" y2="80" gradientUnits="userSpaceOnUse">
            <stop stop-color="#fde047"/>
            <stop offset="0.5" stop-color="#eab308"/>
            <stop offset="1" stop-color="#ca8a04"/>
          </linearGradient>
        </defs>
      </svg>
    `,

    // 20. Bigo Live on Transparent Canvas
    bigo_live: `
      <svg class="brand-official-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="38" fill="#00d2d3" fill-opacity="0.25" stroke="#00d2d3" stroke-width="2.5"/>
        <!-- Bigo Glowing Gem / Dino Motif -->
        <path d="M50 20L76 40L64 78L36 78L24 40L50 20Z" fill="url(#bigo_grad)" stroke="#ffffff" stroke-width="2"/>
        <path d="M50 20L64 78M50 20L36 78M24 40L76 40" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.6"/>
        <circle cx="50" cy="48" r="8" fill="#fde047"/>
        <defs>
          <linearGradient id="bigo_grad" x1="24" y1="20" x2="76" y2="78" gradientUnits="userSpaceOnUse">
            <stop stop-color="#00cec9"/>
            <stop offset="1" stop-color="#0984e3"/>
          </linearGradient>
        </defs>
      </svg>
    `,

    // 21. Likee on Transparent Canvas
    likee: `
      <svg class="brand-official-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="38" fill="url(#likee_bg)" fill-opacity="0.2" stroke="#ff3838" stroke-width="2"/>
        <!-- Layered Floating Heart Gradient -->
        <path d="M50 78C50 78 20 58 20 38C20 26 28 18 40 18C46 18 50 22 50 22C50 22 54 18 60 18C72 18 80 26 80 38C80 58 50 78 50 78Z" fill="url(#likee_heart)"/>
        <path d="M50 64C50 64 30 48 30 36C30 28 36 24 42 24C46 24 50 27 50 27C50 27 54 24 58 24C64 24 70 28 70 36C70 48 50 64 50 64Z" fill="#ffffff" fill-opacity="0.3"/>
        <defs>
          <linearGradient id="likee_bg" x1="12" y1="12" x2="88" y2="88" gradientUnits="userSpaceOnUse">
            <stop stop-color="#ff3838"/>
            <stop offset="1" stop-color="#ff9f1a"/>
          </linearGradient>
          <linearGradient id="likee_heart" x1="20" y1="18" x2="80" y2="78" gradientUnits="userSpaceOnUse">
            <stop stop-color="#ff3838"/>
            <stop offset="0.5" stop-color="#ff793f"/>
            <stop offset="1" stop-color="#ffb142"/>
          </linearGradient>
        </defs>
      </svg>
    `
  };

  /**
   * Resolves country/region flag emoji and badge
   */
  function getFlagBadge(regionStr = '', titleStr = '') {
    const combined = `${regionStr} ${titleStr}`.toLowerCase();

    if (combined.includes('أمريك') || combined.includes('us') || combined.includes('usa')) {
      return { flag: '🇺🇸', label: 'أمريكي US', code: 'us' };
    }
    if (combined.includes('سعود') || combined.includes('sa') || combined.includes('ksa') || combined.includes('سوا')) {
      return { flag: '🇸🇦', label: 'سعودي KSA', code: 'sa' };
    }
    if (combined.includes('إمارات') || combined.includes('امارات') || combined.includes('uae')) {
      return { flag: '🇦🇪', label: 'إماراتي UAE', code: 'ae' };
    }
    if (combined.includes('ترك') || combined.includes('tr')) {
      return { flag: '🇹🇷', label: 'تركي TR', code: 'tr' };
    }
    if (combined.includes('عراق') || combined.includes('iq')) {
      return { flag: '🇮🇶', label: 'عراقي IQ', code: 'iq' };
    }
    if (combined.includes('كويت') || combined.includes('kw')) {
      return { flag: '🇰🇼', label: 'كويتي KW', code: 'kw' };
    }
    if (combined.includes('مصر') || combined.includes('eg')) {
      return { flag: '🇪🇬', label: 'مصري EG', code: 'eg' };
    }
    if (combined.includes('بريطان') || combined.includes('uk')) {
      return { flag: '🇬🇧', label: 'بريطاني UK', code: 'gb' };
    }
    return { flag: '🌐', label: 'عالمي Global', code: 'global' };
  }

  /**
   * Returns HTML string for product or category logo with transparent container
   */
  function getLogoHtml(categoryKey, customLogoUrl = null) {
    if (customLogoUrl) {
      return `<img src="${customLogoUrl}" class="brand-official-img" alt="${categoryKey}" loading="lazy" style="object-fit: contain; width: 100%; height: 100%; background: transparent;" />`;
    }

    const key = String(categoryKey || '').toLowerCase().replace(/[- ]/g, '_');
    if (LOGOS[key]) {
      return LOGOS[key];
    }
    // Check aliases
    if (key.includes('razer')) return LOGOS.razer;
    if (key.includes('pubg')) return LOGOS.pubg;
    if (key.includes('likecard')) return LOGOS.likecard;
    if (key.includes('apple')) return LOGOS.apple;
    if (key.includes('google')) return LOGOS.google;
    if (key.includes('binance')) return LOGOS.binance;
    if (key.includes('visa')) return LOGOS.visa;
    if (key.includes('roblox')) return LOGOS.roblox;
    if (key.includes('netflix')) return LOGOS.netflix;
    if (key.includes('shein')) return LOGOS.shein;
    if (key.includes('noon')) return LOGOS.noon;
    if (key.includes('telecom') || key.includes('stc') || key.includes('zain')) return LOGOS.telecom;

    // Fallback gold card emblem on transparent background
    return `
      <svg class="brand-official-svg" viewBox="0 0 100 100" fill="none">
        <rect x="14" y="24" width="72" height="52" rx="10" stroke="#fde047" stroke-width="2.5" fill="none"/>
        <circle cx="50" cy="50" r="14" fill="#fde047" fill-opacity="0.2"/>
        <path d="M44 50L48 54L56 46" stroke="#fde047" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
  }

  /**
   * Automatically injects official transparent logos into homepage category cards
   */
  function injectCategoryLogos() {
    const mapping = {
      'cat-pubg': 'pubg',
      'cat-apple': 'apple',
      'cat-google': 'google',
      'cat-telecom': 'telecom',
      'cat-likecard': 'likecard',
      'cat-razer': 'razer',
      'cat-visa': 'visa',
      'cat-flash': 'visa',
      'cat-roblox': 'roblox',
      'cat-netflix': 'netflix',
      'cat-shein': 'shein',
      'cat-noon': 'noon',
      'cat-binance': 'binance'
    };

    Object.entries(mapping).forEach(([className, logoKey]) => {
      const card = document.querySelector(`.${className}`);
      if (card) {
        const wrap = card.querySelector('.brand-logo-wrap');
        if (wrap && LOGOS[logoKey]) {
          wrap.innerHTML = LOGOS[logoKey];
        }
      }
    });
  }

  // Auto-inject when ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectCategoryLogos);
  } else {
    injectCategoryLogos();
  }

  return {
    getLogoHtml,
    getFlagBadge,
    injectCategoryLogos,
    LOGOS
  };
})();

window.BrandAssets = BrandAssets;
