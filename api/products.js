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
 *  G  = Image 1        Google Drive share link (required)
 *  H  = Image 2        optional
 *  I  = Image 3        optional
 *  J  = Active         YES / NO
 *  K  = Offer Text     e.g. "Eid Special 15% Off!"
 *  L  = Size S         e.g. "Chest: 36\", Waist: 30\", Length: 52\""
 *  M  = Size M
 *  N  = Size L
 */

// ─── Simple in-memory cache ──────────────────────────────────────────────────
let _cache = null;
let _cacheTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Convert a Google Drive share link to a direct embeddable image URL.
 */
function driveToDirectUrl(link) {
  if (!link || !link.trim()) return '';
  link = link.trim();

  if (!link.includes('drive.google.com')) return link;

  let fileId = null;

  const m1 = link.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m1) fileId = m1[1];

  if (!fileId) {
    const m2 = link.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m2) fileId = m2[1];
  }

  if (!fileId) return link;

  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
}

/**
 * Parse a single row array into a product object.
 * @param {string[]} row  - Array of cell values (A..N)
 * @param {string}   category - 'men' | 'women' | 'kids'
 */
function parseRow(row, category) {
  const yes = v => {
    const str = String(v || '').trim().toUpperCase();
    return str === 'YES' || str === 'TRUE';
  };

  const id        = String(row[0] || '').trim();
  const name      = String(row[1] || '').trim();
  const price     = parseFloat(String(row[2] || '0').replace(/[^0-9.]/g, '')) || 0;
  const origPrice = parseFloat(String(row[3] || '0').replace(/[^0-9.]/g, '')) || 0;
  const shortDesc = String(row[4] || '').trim();
  const fullDesc  = String(row[5] || '').trim();

  // Parse G, H, I (columns 6, 7, 8) allowing multiple comma-separated URLs in each, 
  // and any columns from O onwards (indices 14+)
  const rawUrls = [];
  [row[6], row[7], row[8]].forEach(val => {
    if (val) {
      String(val).split(',').forEach(item => {
        if (item.trim()) rawUrls.push(item.trim());
      });
    }
  });
  for (let i = 14; i < row.length; i++) {
    if (row[i] && String(row[i]).trim()) {
      rawUrls.push(String(row[i]).trim());
    }
  }

  const images = rawUrls.map(url => driveToDirectUrl(url)).filter(Boolean);
  const active    = yes(row[9]);
  const offerText = String(row[10] || '').trim();
  const sizeS     = String(row[11] || '').trim();
  const sizeM     = String(row[12] || '').trim();
  const sizeL     = String(row[13] || '').trim();

  if (!id || !name || images.length === 0 || !active) return null;

  const discountPct = origPrice > price && origPrice > 0
    ? Math.round(((origPrice - price) / origPrice) * 100)
    : 0;

  return {
    id, name, price, origPrice, discountPct,
    shortDesc, fullDesc, category,
    images, offerText,
    sizes: { S: sizeS, M: sizeM, L: sizeL }
  };
}

/**
 * Fetch one sheet tab and return parsed product rows.
 */
async function fetchTab(sheetId, apiKey, tabName, category) {
  const range = encodeURIComponent(`${tabName}!A2:Z500`);
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

  if (!sheetId || !apiKey) {
    const empty = { products: [], featuredProducts: [], marqueeItems: [], configured: false };
    return res.status(200).json(empty);
  }

  try {
    const [women, men, kids] = await Promise.all([
      fetchTab(sheetId, apiKey, 'Women', 'women'),
      fetchTab(sheetId, apiKey, 'Men',   'men'),
      fetchTab(sheetId, apiKey, 'Kids',  'kids'),
    ]);

    const allProducts = [...women, ...men, ...kids];

    // All active products appear in featured section (JS limits how many show on homepage)
    const featuredProducts = allProducts;

    // All active products appear in the marquee ticker
    const marqueeItems = allProducts.map(p => ({
      id:          p.id,
      name:        p.name,
      price:       p.price,
      origPrice:   p.origPrice,
      discountPct: p.discountPct,
      category:    p.category,
      offerText:   p.offerText,
      image:       p.images[0] || ''
    }));

    const payload = {
      products: allProducts,
      featuredProducts,
      marqueeItems,
      configured: true
    };

    _cache = payload;
    _cacheTime = Date.now();

    res.setHeader('Cache-Control', 'public, max-age=60');
    res.setHeader('X-Cache', 'MISS');
    return res.status(200).json(payload);

  } catch (err) {
    console.error('Products API error:', err.message);

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
