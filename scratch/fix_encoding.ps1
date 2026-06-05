$replacements = [ordered]@{
    "Ã¢â€  â‚¬" = "──"
    "Ã¢â‚¬Âº"  = "›"
    "Ã¢â‚¬Â¦"  = "…"
    "Ã¢â‚¬¦"   = "…"
    "Ã¢Ëœâ€¦"  = "★"
    "Ã¢Ëœâ€ "  = "☆"
    "Ã°Å¸â€œÂ"  = "📏"
    "Ã°Å¸â€  Â¥" = "🔥"
    "Ã°Å¸â€ Â¥"  = "🔥"
    "Ã¢Å“â€š"  = "✂"
    "Ã°Å¸â€ºÂ"  = "🛒"
    "Ã¢Å¡Â¡"  = "⚡"
    "Ã°Å¸â€œ¦"  = "📦"
    "Ã°Å¸â€™Â°" = "💰"
    "Ã°Å¸â€  â€”" = "🔗"
    "Ã°Å¸â€â€”"  = "🔗"
    "Ã¢â‚¬â€”"  = "—"
    "Ã¢â‚¬â—"  = "—"
    "Ã°Å¸â€â€™"  = "🔒"
    "Ã¢â€žÂ¹Ã¯Â¸Â" = "ℹ️"
    "Ã¢Å“Â¨"  = "✨"
    "prÃƒÂªt"  = "prêt"
    "Ã°Å¸Â§Âµ"  = "🧵"
    "Ã¢Å¡Â Ã¯Â¸Â" = "⚠️"
    "Ã¢â‚¬Å“"  = "“"
    "Ã¢â‚¬`"  = "”"
    "Ã¢â‚¬`"  = "”"
    "Ã¢â‚¬`"  = "”"
    "Ã¢â‚¬Â"   = "”"
    "Ã¢â‚¬\""  = "”"
    "Ã‚Â·"   = "·"
    "Ã°Å¸â€ Â" = "🔥"
    "Ã°Å¸â€Â"  = "🔥"
}

$files = @(
    "product.html",
    "portal.html",
    "home.html",
    "checkout.html",
    "catalog.html",
    "services.html"
)

foreach ($file in $files) {
    $path = Join-Path "d:\Antigravity Course\Course Work\Stitching Website" $file
    if (Test-Path $path) {
        Write-Host "Processing $file..."
        $content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
        $original = $content
        
        foreach ($key in $replacements.Keys) {
            $content = $content.Replace($key, $replacements[$key])
        }
        
        if ($content -ne $original) {
            [System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
            Write-Host "Fixed encoding in $file"
        } else {
            Write-Host "No changes for $file"
        }
    } else {
        Write-Host "$file does not exist"
    }
}
