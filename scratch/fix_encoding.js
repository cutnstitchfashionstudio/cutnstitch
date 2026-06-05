const fs = require('fs');
const path = require('path');

const replacements = {
  "Ã¢â€  â‚¬": "──",
  "Ã¢â€  â‚¬Ã¢â€  â‚¬": "────",
  "Ã¢â‚¬Âº": "›",
  "Ã¢â‚¬Â¦": "…",
  "Ã¢â‚¬¦": "…",
  "Ã¢Ëœâ€¦": "★",
  "Ã¢Ëœâ€ ": "☆",
  "Ã°Å¸â€œÂ": "📏",
  "Ã°Å¸â€  Â¥": "🔥",
  "Ã°Å¸â€ Â¥": "🔥",
  "Ã¢Å“â€š": "✂",
  "Ã°Å¸â€ºÂ": "🛒",
  "Ã¢Å¡Â¡": "⚡",
  "Ã°Å¸â€œ¦": "📦",
  "Ã°Å¸â€™Â°": "💰",
  "Ã°Å¸â€  â€”": "🔗",
  "Ã°Å¸â€â€”": "🔗",
  "Ã¢â‚¬â€”": "—",
  "Ã¢â‚¬â—": "—",
  "Ã°Å¸â€â€™": "🔒",
  "Ã¢â€žÂ¹Ã¯Â¸Â": "ℹ️",
  "Ã¢Å“Â¨": "✨",
  "prÃƒÂªt": "prêt",
  "Ã°Å¸Â§Âµ": "🧵",
  "Ã¢Å¡Â Ã¯Â¸Â": "⚠️",
  "Ã¢â‚¬Å“": "“",
  "Ã¢â‚¬\x9d": "”",
  "Ã¢â‚¬\"": "”",
  "Ã‚Â·": "·",
  "Ã¢â‚¬Â": "”",
  "Ã°Å¸â€ Â": "🔥",
  "Ã°Å¸â€Â": "🔥"
};

const filesToFix = [
  path.join(__dirname, '..', 'product.html'),
  path.join(__dirname, '..', 'portal.html'),
  path.join(__dirname, '..', 'home.html'),
  path.join(__dirname, '..', 'checkout.html'),
  path.join(__dirname, '..', 'catalog.html'),
  path.join(__dirname, '..', 'services.html')
];

filesToFix.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${filePath} (does not exist)`);
    return;
  }

  console.log(`Processing ${filePath}...`);
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  for (const [bad, good] of Object.entries(replacements)) {
    content = content.split(bad).join(good);
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed encoding in ${filePath}`);
  } else {
    console.log(`No changes needed for ${filePath}`);
  }
});
