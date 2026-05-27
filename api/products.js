/**
 * /api/products
 * Fetches live product data from Google Sheets and returns structured JSON.
 *
 * Google Sheet column layout (per tab: Men | Women | Kids):
 *  A  = ID             e.g. W001
 *  B  = Name
 *  C  = Price          number in PKR, e.g. 15500
 *  D  = Original Price for showing strikethrough (leave blank if no discount)
 *  E  = Short Description  (shown on catalog card)
 *  F  = Full Description   (shown on product detail page)
 *  G  = Sub-Category       e.g. Bridal, Casual, Formal
 *  H  = Image 1        Google Drive share link (required)
 *  I  = Image 2        optional
 *  J  = Image 3        optional
 *  K  = Stars          1-5
 *  L  = Active         YES / NO
 *  M  = Featured       YES / NO  → shown on homepage featured section
 *  N  = Hot            YES / NO  → shown in homepage marquee ticker
 *  O  = Offer Text     e.g. "Eid Special — 20% Off!"
 *  P  = Size S         e.g. "Chest: 36\", Waist: 30\", Length: 52\""
 *  Q  = Size M
 *  R  = Size L
 */

// ─── Simple in-memory cache ──────────────────────────────────────────────────
let _cache = null;
let _cacheTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Convert a Google Drive share link to a direct embeddable image URL.
 * Supports:
 *   https://drive.google.com/file/d/FILE_ID/view?...
 *   https://drive.google.com/open?id=FILE_ID
 *   https://drive.google.com/uc?id=FILE_ID  (already direct)
 * Falls back to the original string if no match.
 */
function driveToDirectUrl(link) {
  if (!link || !link.trim()) return '';
  link = link.trim();

  // Already a direct image / non-Drive URL — return as-is
  if (!link.includes('drive.google.com')) return link;

  let fileId = null;

  // Pattern: /file/d/FILE_ID/
  const m1 = link.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m1) fileId = m1[1];

  // Pattern: id=FILE_ID
  if (!fileId) {
    const m2 = link.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m2) fileId = m2[1];
  }

  if (!fileId) return link; // cannot parse — return original

  // Use the thumbnail endpoint which works without authentication
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
}

/**
 * Parse a single row array into a product object.
 * @param {string[]} row  - Array of cell values (A..R)
 * @param {string}   category - 'men' | 'women' | 'kids'
 */
function parseRow(row, category) {
  const yes = v => {
    const str = String(v || '').trim().toUpperCase();
    return str === 'YES' || str === 'TRUE'; // supports both text and Sheets checkboxes
  };

  const id          = String(row[0] || '').trim();
  const name        = String(row[1] || '').trim();
  const price       = parseFloat(String(row[2] || '0').replace(/[^0-9.]/g, '')) || 0;
  const origPrice   = parseFloat(String(row[3] || '0').replace(/[^0-9.]/g, '')) || 0;
  const shortDesc   = String(row[4] || '').trim();
  const fullDesc    = String(row[5] || '').trim();
  const subCat      = String(row[6] || '').trim();
  const img1        = driveToDirectUrl(String(row[7] || '').trim());
  const img2        = driveToDirectUrl(String(row[8] || '').trim());
  const img3        = driveToDirectUrl(String(row[9] || '').trim());
  const stars       = Math.min(5, Math.max(1, parseInt(row[10]) || 5));
  const active      = yes(row[11]);
  const featured    = yes(row[12]);
  const hot         = yes(row[13]);
  const offerText   = String(row[14] || '').trim();
  const sizeS       = String(row[15] || '').trim();
  const sizeM       = String(row[16] || '').trim();
  const sizeL       = String(row[17] || '').trim();

  if (!id || !name || !img1 || !active) return null;

  const images = [img1, img2, img3].filter(Boolean);
  const discountPct = origPrice > price && origPrice > 0
    ? Math.round(((origPrice - price) / origPrice) * 100)
    : 0;

  return {
    id, name, price, origPrice, discountPct,
    shortDesc, fullDesc, subCat, category,
    images, stars, featured, hot, offerText,
    sizes: { S: sizeS, M: sizeM, L: sizeL }
  };
}

/**
 * Fetch one sheet tab and return parsed product rows.
 * @param {string} sheetId
 * @param {string} apiKey
 * @param {string} tabName  - e.g. 'Men', 'Women', 'Kids'
 * @param {string} category - 'men' | 'women' | 'kids'
 */
async function fetchTab(sheetId, apiKey, tabName, category) {
  const range = encodeURIComponent(`${tabName}!A2:R500`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Sheets API error for tab "${tabName}": ${res.status} — ${body.substring(0, 200)}`);
  }

  const json = await res.json();
  const rows = json.values || [];
  return rows.map(row => parseRow(row, category)).filter(Boolean);
}

// ─── Main handler ─────────────────────────────────────────────────────────────
module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Serve from cache if fresh
  if (_cache && Date.now() - _cacheTime < CACHE_TTL_MS) {
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(_cache);
  }

  const sheetId = process.env.GOOGLE_SHEETS_ID;
  const apiKey  = process.env.GOOGLE_API_KEY;

  // If not configured yet, return empty (website gracefully shows "no products")
  if (!sheetId || !apiKey) {
    const empty = { products: [], featuredProducts: [], marqueeItems: [], configured: false };
    return res.status(200).json(empty);
  }

  try {
    // Fetch all three tabs in parallel
    const [women, men, kids] = await Promise.all([
      fetchTab(sheetId, apiKey, 'Women', 'women'),
      fetchTab(sheetId, apiKey, 'Men',   'men'),
      fetchTab(sheetId, apiKey, 'Kids',  'kids'),
    ]);

    const allProducts = [...women, ...men, ...kids];

    const featuredProducts = allProducts.filter(p => p.featured);

    const marqueeItems = allProducts
      .filter(p => p.hot || p.offerText)
      .map(p => ({
        id:        p.id,
        name:      p.name,
        price:     p.price,
        category:  p.category,
        offerText: p.offerText,
        discountPct: p.discountPct,
        image:     p.images[0] || ''
      }));

    const payload = {
      products: allProducts,
      featuredProducts,
      marqueeItems,
      configured: true
    };

    // Update cache
    _cache = payload;
    _cacheTime = Date.now();

    res.setHeader('Cache-Control', 'public, max-age=60');
    res.setHeader('X-Cache', 'MISS');
    return res.status(200).json(payload);

  } catch (err) {
    console.error('Products API error:', err.message);

    // If cache is stale but exists, serve it rather than failing
    if (_cache) {
      res.setHeader('X-Cache', 'STALE');
      return res.status(200).json(_cache);
    }

    return res.status(500).json({
      error: 'Failed to fetch products from Google Sheets.',
      detail: err.message,
      products: [],
      featuredProducts: [],
      marqueeItems: [],
      configured: true
    });
  }
};
