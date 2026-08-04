# Icon-Lücken — Audit 2026-06-30

Auto-Discovery bindet `assets/items/<itemId>.png` bzw. `assets/monsters/<monsterId>.png` per Dateiname.
Monster-Resolver hat einen `tower_<x>` → `<x>`-Fallback (Slayer-Tower-Klone nutzen Basis-Art), Items haben
KEINEN Fallback (fehlt das Bild → Emoji/Platzhalter).

**Stand: 1 Monster + 17 Items von 1011 ohne Bild.** Pipeline ist sehr weit — das hier ist die Restliste.

## Monster ohne Bild (1)
- `scale_skarn` (L275, Endgame) — braucht eigenes Bild.

## Items ohne Bild (17)

### GEAR — sichtbar, Priorität (4)
- `frostcaverns_bow` (mainhand/bow) — kein Beinah-Treffer.
- `mithril_shortbow` (mainhand/bow) — Kandidat: `mithril_longbow.png` existiert (anderer Bogentyp → nur
  wenn du Shortbow optisch = Longbow akzeptierst, sonst eigenes Bild).
- `voidhide_legs` (legs) — Set existiert (body/helm/boots/vambraces.png), nur die Beine fehlen.
- `aetherscale_cuirass` (body) — kein Beinah-Treffer.

### MATERIAL / Verbrauch / Sonstiges (13)
- Kräuter/Saaten: `mandrake_root` (Kandidat: `mandrake.png` existiert), `nightshade_seed`
  (Kandidat: `nightshade.png` existiert), `rot_gland`, `soul_flayer_fang`.
- Erze/Barren: `murkvein_ore`, `murkvein_bar` (Kandidat: `murkvein_longsword.png` ist eine WAFFE, NICHT
  passend — Erz/Barren brauchen eigenes Bild).
- Runen: `rune_storm_i`, `rune_storm_ii`, `rune_storm_iii`.
- Slayer/Wards: `plague_mask`, `mirror_ward`, `slayer_ward_capsule`.
- Sonstiges: `tower_forge_compound`.

## Hinweise zum Rebind
- Beinah-Treffer (mandrake_root↔mandrake, nightshade_seed↔nightshade) NICHT automatisch gebunden —
  Saat/Wurzel vs. Pflanze können optisch verschieden gemeint sein; Chef-Entscheid, ob aliasen oder
  eigenes Bild. Bei „aliasen" reicht eine Kopie der PNG unter dem fehlenden Dateinamen.
- Materialien ohne Bild fallen nur auf das Emoji-Icon zurück (kein Crash) — kosmetisch, kein Blocker.
