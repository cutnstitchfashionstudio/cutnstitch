import os

replacements = {
    "Ã¢â€ â‚¬": "──",
    "Ã¢â‚¬Âº": "›",
    "Ã¢â‚¬Â¦": "…",
    "Ã¢â‚¬¦": "…",
    "Ã¢Ëœâ€¦": "★",
    "Ã¢Ëœâ€ ": "☆",
    "Ã°Å¸â€œÂ": "📏",
    "Ã°Å¸â€ Â¥": "🔥",
    "Ã¢Å“â€š": "✂",
    "Ã°Å¸â€ºÂ": "🛒",
    "Ã¢Å¡Â¡": "⚡",
    "Ã°Å¸â€œ¦": "📦",
    "Ã°Å¸â€™Â°": "💰",
    "Ã°Å¸â€ â€”": "🔗",
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
}

files_to_fix = [
    r"d:\Antigravity Course\Course Work\Stitching Website\product.html",
    r"d:\Antigravity Course\Course Work\Stitching Website\portal.html",
    r"d:\Antigravity Course\Course Work\Stitching Website\home.html",
    r"d:\Antigravity Course\Course Work\Stitching Website\checkout.html",
    r"d:\Antigravity Course\Course Work\Stitching Website\catalog.html",
    r"d:\Antigravity Course\Course Work\Stitching Website\services.html",
]

for file_path in files_to_fix:
    if not os.path.exists(file_path):
        print(f"Skipping {file_path} (does not exist)")
        continue
        
    print(f"Processing {file_path}...")
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
        
    original_content = content
    for bad, good in replacements.items():
        content = content.replace(bad, good)
        
    if content != original_content:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Fixed encoding in {file_path}")
    else:
        print(f"No changes needed for {file_path}")
