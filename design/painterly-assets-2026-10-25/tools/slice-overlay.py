# claude:2026-10-25T12:37:00+01:00 — zeichnet die im CSS genutzten border-image-Slice-Linien auf die Rahmenquellen
# (auf Schachbrett, damit Alpha sichtbar ist). Aufruf: python -I slice-overlay.py
from PIL import Image, ImageDraw
import os
R = r"G:\GameDev\apps\client\src\renderer\assets"
OUT = r"G:\GameDev\design\painterly-assets-2026-10-25\crops"
items = [
  ("ui/citadel/9-slice-box-3/wooden_frame_with_corners_seamless.webp", 28),
  ("ui/gravewood/frames/nav-bronze-lipped-iron-9slice.webp", 85),
  ("ui/gravewood/v3/frames/panel-frame.webp", 48),
  ("ui/gravewood/v3/frames/card-frame.webp", 48),
  ("ui/gravewood/v3/frames/slot-frame.webp", 48),
  ("ui/gravewood/v3/frames/button-frame.webp", 96),
  ("ui/gravewood/v3/frames/tab-frame.webp", 96),
  ("ui/gravewood/frames/wood-frame-strip.webp", 0),
  ("ui/gravewood/frames/frame-panel.webp", 0),
  ("ui/gravewood/frames/frame-card.webp", 0),
]
def checker(w,h,s=16):
  im=Image.new("RGB",(w,h),(200,200,200)); d=ImageDraw.Draw(im)
  for y in range(0,h,s):
    for x in range(0,w,s):
      if (x//s+y//s)%2: d.rectangle([x,y,x+s-1,y+s-1],fill=(120,120,120))
  return im
for rel,sl in items:
  im=Image.open(os.path.join(R,rel)).convert("RGBA")
  bg=checker(*im.size); bg.paste(im,(0,0),im)
  d=ImageDraw.Draw(bg)
  if sl:
    w,h=im.size
    for x in (sl,w-sl): d.line([x,0,x,h],fill=(255,0,0),width=max(1,w//300))
    for y in (sl,h-sl): d.line([0,y,w,y],fill=(255,0,0),width=max(1,w//300))
  name=os.path.basename(rel).replace(".webp","")
  scale=min(1.0,1400/max(im.size))
  if scale<1: bg=bg.resize((int(im.size[0]*scale),int(im.size[1]*scale)),Image.LANCZOS)
  bg.save(os.path.join(OUT,f"slice_{name}.png"))
  print(name, im.size, sl)
