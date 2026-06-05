import os
import re

root_dir = r"d:\Antigravity Course\Course Work\Stitching Website"

# 1. New SVG brand-icon content with 3D looping thread path
NEW_BRAND_ICON = """      <svg class="brand-icon" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="var(--c-primary-dark)"/>
        <circle cx="50" cy="50" r="42" stroke="var(--c-gold)" stroke-width="2" stroke-dasharray="6 4"/>
        <line x1="36" y1="73" x2="50" y2="22" stroke="var(--c-gold)" stroke-width="5" stroke-linecap="round"/>
        <line x1="50" y1="22" x2="64" y2="73" stroke="var(--c-gold)" stroke-width="5" stroke-linecap="round"/>
        <line x1="26" y1="73" x2="44" y2="73" stroke="var(--c-gold)" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="56" y1="73" x2="74" y2="73" stroke="var(--c-gold)" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="47" y1="22" x2="53" y2="22" stroke="var(--c-gold)" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="41" y1="53" x2="59" y2="53" stroke="var(--c-gold)" stroke-width="3.5" stroke-linecap="round"/>
        <!-- Behind-needle thread segments (underlay) -->
        <path d="M 33 60.5 C 31 58 34 54 38 54" stroke="#e8c96e" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.75"/>
        <path d="M 43 61 C 46 61 47 51 49 49" stroke="#e8c96e" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.75"/>
        <path d="M 55 56 C 57 56 59 58 60.4 60" stroke="#e8c96e" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.75"/>
        <line x1="30" y1="62" x2="69" y2="45" stroke="#f5e6b0" stroke-width="1.3" stroke-linecap="round" opacity="0.9"/>
        <path d="M 67 45.8 L 74 42.5 L 67.5 47.2 Z" fill="#f5e6b0" opacity="0.9"/>
        <ellipse cx="33" cy="60.5" rx="2.5" ry="1" fill="var(--c-primary-dark)" stroke="#f0e0b0" stroke-width="0.8" opacity="0.9" transform="rotate(-22 33 60.5)"/>
        <!-- Front-needle thread segments (overlay) -->
        <path d="M 38.5 65 C 37 63 35 61 33 60.5" stroke="#e8c96e" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.95"/>
        <path d="M 38 54 C 41 54 41 61 43 61" stroke="#e8c96e" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.95"/>
        <path d="M 49 49 C 52 49 53 56 55 56" stroke="#e8c96e" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.95"/>
      </svg>"""

# 2. New SVG admin logo content with 3D looping thread path using hex values
NEW_ADMIN_LOGO = """    <svg viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="48" fill="#0d2247"/>
      <circle cx="50" cy="50" r="42" stroke="#c9a84c" stroke-width="2" stroke-dasharray="6 4"/>
      <line x1="36" y1="73" x2="50" y2="22" stroke="#c9a84c" stroke-width="5" stroke-linecap="round"/>
      <line x1="50" y1="22" x2="64" y2="73" stroke="#c9a84c" stroke-width="5" stroke-linecap="round"/>
      <line x1="26" y1="73" x2="44" y2="73" stroke="#c9a84c" stroke-width="3.5" stroke-linecap="round"/>
      <line x1="56" y1="73" x2="74" y2="73" stroke="#c9a84c" stroke-width="3.5" stroke-linecap="round"/>
      <line x1="47" y1="22" x2="53" y2="22" stroke="#c9a84c" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="41" y1="53" x2="59" y2="53" stroke="#c9a84c" stroke-width="3.5" stroke-linecap="round"/>
      <!-- Behind-needle thread segments (underlay) -->
      <path d="M 33 60.5 C 31 58 34 54 38 54" stroke="#c9a84c" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.75"/>
      <path d="M 43 61 C 46 61 47 51 49 49" stroke="#c9a84c" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.75"/>
      <path d="M 55 56 C 57 56 59 58 60.4 60" stroke="#c9a84c" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.75"/>
      <line x1="30" y1="62" x2="69" y2="45" stroke="#f5e6b0" stroke-width="1.3" stroke-linecap="round" opacity="0.9"/>
      <path d="M 67 45.8 L 74 42.5 L 67.5 47.2 Z" fill="#f5e6b0" opacity="0.9"/>
      <ellipse cx="33" cy="60.5" rx="2.5" ry="1" fill="#0d2247" stroke="#f0e0b0" stroke-width="0.8" opacity="0.9" transform="rotate(-22 33 60.5)"/>
      <!-- Front-needle thread segments (overlay) -->
      <path d="M 38.5 65 C 37 63 35 61 33 60.5" stroke="#c9a84c" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.95"/>
      <path d="M 38 54 C 41 54 41 61 43 61" stroke="#c9a84c" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.95"/>
      <path d="M 49 49 C 52 49 53 56 55 56" stroke="#c9a84c" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.95"/>
    </svg>"""

# 3. Preloader Crest inner SVG group with 3D looping thread path
NEW_PRELOADER_CREST = """            <g class="crest-n">
              <!-- LEFT LEG of A -->
              <line x1="36" y1="73" x2="50" y2="22"
                    stroke="url(#aGold)" stroke-width="5.5" stroke-linecap="round"/>
              <!-- RIGHT LEG of A -->
              <line x1="50" y1="22" x2="64" y2="73"
                    stroke="url(#aGold)" stroke-width="5.5" stroke-linecap="round"/>
              <!-- LEFT BASE SERIF -->
              <line x1="26" y1="73" x2="44" y2="73"
                    stroke="url(#aGoldH)" stroke-width="4" stroke-linecap="round"/>
              <!-- RIGHT BASE SERIF -->
              <line x1="56" y1="73" x2="74" y2="73"
                    stroke="url(#aGoldH)" stroke-width="4" stroke-linecap="round"/>
              <!-- APEX CAP -->
              <line x1="47" y1="22" x2="53" y2="22"
                    stroke="url(#aGoldH)" stroke-width="3" stroke-linecap="round"/>
              <!-- CROSSBAR -->
              <line x1="41" y1="53" x2="59" y2="53"
                    stroke="url(#aGoldH)" stroke-width="4" stroke-linecap="round"/>
              <!-- RUNNING STITCH along left leg -->
              <line x1="40" y1="66" x2="44" y2="61" stroke="#f0dc8a" stroke-width="1.1" stroke-linecap="round" opacity="0.55"/>
              <line x1="43" y1="58" x2="47" y2="53" stroke="#f0dc8a" stroke-width="1.1" stroke-linecap="round" opacity="0.45"/>
              <line x1="46" y1="50" x2="50" y2="45" stroke="#f0dc8a" stroke-width="1.1" stroke-linecap="round" opacity="0.35"/>
              <!-- RUNNING STITCH along right leg -->
              <line x1="56" y1="66" x2="60" y2="61" stroke="#f0dc8a" stroke-width="1.1" stroke-linecap="round" opacity="0.55"/>
              <line x1="53" y1="58" x2="57" y2="53" stroke="#f0dc8a" stroke-width="1.1" stroke-linecap="round" opacity="0.45"/>
              <line x1="50" y1="50" x2="54" y2="45" stroke="#f0dc8a" stroke-width="1.1" stroke-linecap="round" opacity="0.35"/>
              <!-- Behind-needle thread segments (underlay) -->
              <path d="M 33 60.5 C 31 58 34 54 38 54" stroke="#e8c96e" stroke-width="1.4" fill="none" stroke-linecap="round" opacity="0.75"/>
              <path d="M 43 61 C 46 61 47 51 49 49" stroke="#e8c96e" stroke-width="1.4" fill="none" stroke-linecap="round" opacity="0.75"/>
              <path d="M 55 56 C 57 56 59 58 60.4 60" stroke="#e8c96e" stroke-width="1.4" fill="none" stroke-linecap="round" opacity="0.75"/>
              <!-- NEEDLE shaft crossing the crossbar diagonally (without blur filter for sharpness) -->
              <line x1="30" y1="62" x2="69" y2="45"
                    stroke="url(#needleGrad)" stroke-width="1.3"
                    stroke-linecap="round" opacity="0.95"/>
              <!-- Needle pointed TIP (tapered triangle) -->
              <path d="M 67 45.8 L 74 42.5 L 67.5 47.2 Z" fill="#f5e6b0" opacity="0.95"/>
              <!-- Needle EYE (oval hole near left end) -->
              <ellipse cx="33" cy="60.5" rx="2.8" ry="1.1"
                       fill="var(--c-primary-dark)"
                       stroke="#f0e0b0" stroke-width="0.9"
                       opacity="0.95"
                       transform="rotate(-22 33 60.5)"/>
              <!-- Front-needle thread segments (overlay) -->
              <path d="M 38.5 65 C 37 63 35 61 33 60.5" stroke="#e8c96e" stroke-width="1.4" fill="none" stroke-linecap="round" opacity="0.95"/>
              <path d="M 38 54 C 41 54 41 61 43 61" stroke="#e8c96e" stroke-width="1.4" fill="none" stroke-linecap="round" opacity="0.95"/>
              <path d="M 49 49 C 52 49 53 56 55 56" stroke="#e8c96e" stroke-width="1.4" fill="none" stroke-linecap="round" opacity="0.95"/>
              <!-- Apex stitch dot -->
              <circle cx="50" cy="20" r="2.2" fill="#e8c96e" opacity="0.8"/>
              <circle cx="50" cy="20" r="1"   fill="#fff"    opacity="0.5"/>
            </g>"""

# 4. Modify HTML brand-icons across all pages
html_files = [f for f in os.listdir(root_dir) if f.endswith(".html")]

brand_icon_pattern = re.compile(
    r'<svg class="brand-icon" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">.*?</svg>',
    re.DOTALL
)

admin_logo_pattern = re.compile(
    r'<svg viewBox="0 0 100 100" fill="none">\s*<circle cx="50" cy="50" r="48" fill="#0d2247"/>.*?</svg>',
    re.DOTALL
)

preloader_crest_pattern = re.compile(
    r'<g class="crest-n">.*?</g>',
    re.DOTALL
)

for hf in html_files:
    path = os.path.join(root_dir, hf)
    with open(path, "r", encoding="utf-8") as file:
        content = file.read()
    
    modified = False
    
    # Replace brand-icon SVG
    if brand_icon_pattern.search(content):
        content = brand_icon_pattern.sub(NEW_BRAND_ICON, content)
        print(f"[{hf}] Replaced navbar brand-icon")
        modified = True
        
    # Replace admin logo SVG in admin.html
    if hf == "admin.html" and admin_logo_pattern.search(content):
        content = admin_logo_pattern.sub(NEW_ADMIN_LOGO, content)
        print(f"[{hf}] Replaced admin page brand logo")
        modified = True
        
    # Replace preloader crest in index.html
    if hf == "index.html" and preloader_crest_pattern.search(content):
        content = preloader_crest_pattern.sub(NEW_PRELOADER_CREST, content)
        print(f"[{hf}] Replaced preloader crest with 3D looping design")
        modified = True
        
    if modified:
        with open(path, "w", encoding="utf-8") as file:
            file.write(content)

# 5. Modify css/global.css (change 4s to 5s for waveShineTitle and waveShineSubtitle)
global_css_path = os.path.join(root_dir, "css", "global.css")
if os.path.exists(global_css_path):
    with open(global_css_path, "r", encoding="utf-8") as file:
        css_content = file.read()
    
    # Match the waveShineTitle animation durations
    old_wave_shine_title = "animation: waveShineTitle 4s ease-in-out infinite !important;"
    new_wave_shine_title = "animation: waveShineTitle 5s ease-in-out infinite !important;"
    
    old_wave_shine_sub = "animation: waveShineSubtitle 4s ease-in-out infinite !important;"
    new_wave_shine_sub = "animation: waveShineSubtitle 5s ease-in-out infinite !important;"
    
    if old_wave_shine_title in css_content:
        css_content = css_content.replace(old_wave_shine_title, new_wave_shine_title)
        print("[global.css] Updated waveShineTitle to 5s")
        
    if old_wave_shine_sub in css_content:
        css_content = css_content.replace(old_wave_shine_sub, new_wave_shine_sub)
        print("[global.css] Updated waveShineSubtitle to 5s")
        
    with open(global_css_path, "w", encoding="utf-8") as file:
        file.write(css_content)

# 6. Modify css/animations.css to sharpen all glows/blurs
animations_css_path = os.path.join(root_dir, "css", "animations.css")
if os.path.exists(animations_css_path):
    with open(animations_css_path, "r", encoding="utf-8") as file:
        anim_content = file.read()
        
    # Sharpen flickerShine drop-shadows
    old_flicker_shine = """@keyframes flickerShine {
  0%, 100% { opacity: 1; filter: brightness(1) drop-shadow(0 0 0 rgba(212,175,55,0)); }
  25% { opacity: 0.9; filter: brightness(1.4) drop-shadow(0 0 8px rgba(255,215,0,0.6)); }
  50% { opacity: 1; filter: brightness(1.6) drop-shadow(0 0 15px rgba(255,215,0,0.8)); }
  75% { opacity: 0.8; filter: brightness(1.2) drop-shadow(0 0 5px rgba(255,215,0,0.4)); }
}"""
    
    new_flicker_shine = """@keyframes flickerShine {
  0%, 100% { opacity: 1; filter: brightness(1) drop-shadow(0 0 1px rgba(255,215,0,0)); }
  25% { opacity: 0.95; filter: brightness(1.2) drop-shadow(0 0 2px rgba(255,215,0,0.4)); }
  50% { opacity: 1; filter: brightness(1.3) drop-shadow(0 0 3px rgba(255,215,0,0.6)); }
  75% { opacity: 0.95; filter: brightness(1.1) drop-shadow(0 0 1.5px rgba(255,215,0,0.3)); }
}"""

    # Sharpen waveShineTitle drop-shadows
    old_wave_title = """@keyframes waveShineTitle {
  0%, 100% {
    filter: brightness(1) drop-shadow(0 0 0 rgba(212,175,55,0));
    transform: translateY(0) scale(1);
  }
  35% {
    filter: brightness(1.4) drop-shadow(0 0 10px rgba(255,215,0,0.7));
    transform: translateY(-6px) scale(1.06);
  }
  70% {
    filter: brightness(1.2) drop-shadow(0 0 4px rgba(255,215,0,0.4));
    transform: translateY(-2px) scale(1.02);
  }
}"""
    
    new_wave_title = """@keyframes waveShineTitle {
  0%, 100% {
    filter: brightness(1) drop-shadow(0 0 0 rgba(212,175,55,0));
    transform: translateY(0) scale(1);
  }
  35% {
    filter: brightness(1.4) drop-shadow(0 0 3px rgba(255,215,0,0.7));
    transform: translateY(-6px) scale(1.06);
  }
  70% {
    filter: brightness(1.2) drop-shadow(0 0 1.5px rgba(255,215,0,0.4));
    transform: translateY(-2px) scale(1.02);
  }
}"""

    # Sharpen waveShineSubtitle drop-shadows
    old_wave_sub = """@keyframes waveShineSubtitle {
  0%, 100% {
    filter: brightness(1) drop-shadow(0 0 0 rgba(212,175,55,0));
    transform: scale(1);
  }
  35% {
    filter: brightness(1.3) drop-shadow(0 0 8px rgba(255,215,0,0.6));
    transform: scale(1.12);
  }
  70% {
    filter: brightness(1.1) drop-shadow(0 0 2px rgba(255,215,0,0.3));
    transform: scale(1.03);
  }
}"""

    new_wave_sub = """@keyframes waveShineSubtitle {
  0%, 100% {
    filter: brightness(1) drop-shadow(0 0 0 rgba(212,175,55,0));
    transform: scale(1);
  }
  35% {
    filter: brightness(1.3) drop-shadow(0 0 2.5px rgba(255,215,0,0.6));
    transform: scale(1.12);
  }
  70% {
    filter: brightness(1.1) drop-shadow(0 0 1px rgba(255,215,0,0.3));
    transform: scale(1.03);
  }
}"""

    if old_flicker_shine in anim_content:
        anim_content = anim_content.replace(old_flicker_shine, new_flicker_shine)
        print("[animations.css] Sharpened flickerShine animation")
    else:
        # Try doing standard replace if formatting differs slightly
        anim_content = anim_content.replace("drop-shadow(0 0 15px rgba(255,215,0,0.8))", "drop-shadow(0 0 3px rgba(255,215,0,0.8))")
        anim_content = anim_content.replace("drop-shadow(0 0 8px rgba(255,215,0,0.6))", "drop-shadow(0 0 2px rgba(255,215,0,0.6))")
        anim_content = anim_content.replace("drop-shadow(0 0 5px rgba(255,215,0,0.4))", "drop-shadow(0 0 1.5px rgba(255,215,0,0.4))")
        print("[animations.css] Sharpened flickerShine with fallbacks")
        
    if old_wave_title in anim_content:
        anim_content = anim_content.replace(old_wave_title, new_wave_title)
        print("[animations.css] Sharpened waveShineTitle animation")
    else:
        anim_content = anim_content.replace("drop-shadow(0 0 10px rgba(255,215,0,0.7))", "drop-shadow(0 0 3px rgba(255,215,0,0.7))")
        anim_content = anim_content.replace("drop-shadow(0 0 4px rgba(255,215,0,0.4))", "drop-shadow(0 0 1.5px rgba(255,215,0,0.4))")
        print("[animations.css] Sharpened waveShineTitle with fallbacks")
        
    if old_wave_sub in anim_content:
        anim_content = anim_content.replace(old_wave_sub, new_wave_sub)
        print("[animations.css] Sharpened waveShineSubtitle animation")
    else:
        anim_content = anim_content.replace("drop-shadow(0 0 8px rgba(255,215,0,0.6))", "drop-shadow(0 0 2.5px rgba(255,215,0,0.6))")
        anim_content = anim_content.replace("drop-shadow(0 0 2px rgba(255,215,0,0.3))", "drop-shadow(0 0 1px rgba(255,215,0,0.3))")
        print("[animations.css] Sharpened waveShineSubtitle with fallbacks")

    with open(animations_css_path, "w", encoding="utf-8") as file:
        file.write(anim_content)

print("Polish application completed successfully!")
