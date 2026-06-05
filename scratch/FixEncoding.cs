using System;
using System.IO;
using System.Text;
using System.Collections.Generic;

class FixEncoding
{
    static void Main()
    {
        var replacements = new Dictionary<string, string>
        {
            // 1. Comment divider: "Ã¢â€  â‚¬" / "Ã¢â€ â‚¬"
            { "\u00C3\u00A2\u00E2\u20AC\u009D\u00E2\u201A\u00AC", "──" },
            
            // 2. Star: "Ã¢Ëœâ€" / "Ã¢Ëœâ€¦"
            { "\u00C3\u00A2\u00CB\u009C\u00E2\u20AC\u00A6", "★" },
            
            // 3. Empty star: "Ã¢Ëœâ€ "
            { "\u00C3\u00A2\u00CB\u009C\u00E2\u20AC\u0020", "☆" },
            { "Ã¢Ëœâ€\u00A0", "☆" },

            // 4. Ruler: "Ã°Å¸â€œÂ"
            { "Ã°Å¸â€œÂ", "📏" },

            // 5. Fire: "Ã°Å¸â€  Â¥" / "Ã°Å¸â€ Â¥"
            { "\u00C3\u00B0\u00C5\u00B8\u00E2\u20AC\u009D\u00C2\u00A5", "🔥" },

            // 6. Scissors: "Ã¢Å“â€š"
            { "Ã¢Å“â€š", "✂" },

            // 7. Cart: "Ã°Å¸â€ºÂ" / "Ã°Å¸â€ºÂ Ã¯Â¸Â"
            { "\u00C3\u00B0\u00C5\u00B8\u00E2\u20AC\u00BA\u00C2\u008D\u00C3\u00AF\u00C2\u00B8\u00C2\u008F", "🛒" },
            { "Ã°Å¸â€ºÂ", "🛒" },

            // 8. Bullet: "Ã¢â‚¬Â¢"
            { "\u00C3\u00A2\u00E2\u201A\u00AC\u00C2\u00A2", "•" },
            { "\u00C3\u00A2\u00E2\u20AC\u00AC\u00C2\u00A2", "•" },

            // 9. Em dash: "Ã¢â‚¬â€”"
            { "\u00C3\u00A2\u00E2\u20AC\u00AC\u00E2\u20AC\u009D", "—" },
            { "\u00C3\u00A2\u00E2\u20AC\u009D\u00E2\u20AC\u0094", "—" },

            // 10. Secure lock: "Ã°Å¸â€  â€™" / "Ã°Å¸â€â€™"
            { "\u00C3\u00B0\u00C5\u00B8\u00E2\u20AC\u009D\u00E2\u20AC\u2122", "🔒" },
            { "\u00C3\u00B0\u00C5\u00B8\u00E2\u20AC\u009D \u00E2\u20AC\u2122", "🔒" },
            { "Ã°Å¸â€â€™", "🔒" },

            // 11. Info: "Ã¢â€žÂ¹Ã¯Â¸Â"
            { "Ã¢â€žÂ¹Ã¯Â¸Â", "ℹ️" },

            // 12. Sparkles: "Ã¢Å“Â¨"
            { "Ã¢Å“Â¨", "✨" },

            // 13. Middle dot: "Ã‚Â·"
            { "Ã‚Â·", "·" }
        };

        string[] files = {
            "product.html",
            "portal.html",
            "home.html",
            "checkout.html",
            "catalog.html",
            "services.html",
            "cart.html"
        };

        string root = @"d:\Antigravity Course\Course Work\Stitching Website";

        foreach (var file in files)
        {
            string path = Path.Combine(root, file);
            if (!File.Exists(path))
            {
                Console.WriteLine("Skipping {0} (does not exist)", file);
                continue;
            }

            Console.WriteLine("Processing {0}...", file);
            string content = File.ReadAllText(path, Encoding.UTF8);
            string original = content;

            foreach (var kvp in replacements)
            {
                content = content.Replace(kvp.Key, kvp.Value);
            }

            // Let's do some manual cleanups if any of these are still there
            content = content.Replace("Ã¢â‚¬Âº", "›");
            content = content.Replace("Ã¢â‚¬Â¦", "…");
            content = content.Replace("Ã¢â‚¬¦", "…");
            content = content.Replace("prÃƒÂªt", "prêt");
            content = content.Replace("Ã°Å¸Â§Âµ", "🧵");
            content = content.Replace("Ã¢Å¡Â Ã¯Â¸Â", "⚠️");
            content = content.Replace("Ã¢â‚¬Å“", "“");
            content = content.Replace("Ã¢â‚¬\x9d", "”");
            content = content.Replace("Ã¢â‚¬\"", "”");

            if (content != original)
            {
                File.WriteAllText(path, content, Encoding.UTF8);
                Console.WriteLine("Fixed encoding in {0}", file);
            }
            else
            {
                Console.WriteLine("No changes needed for {0}", file);
            }
        }
    }
}
