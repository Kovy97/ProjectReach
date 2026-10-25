# Monster-Neuguss Alpha: Auftrag an Mira (11 Motive)

<!-- claude:2026-10-25T10:35:00+01:00 -->

Stand 25.10.: Das Monster-Asset-Audit (`design/monster-asset-audit-2026-10-25/REPORT.md`) hat 11 Monsterbilder mit
fehlerhaften Alpha-Kanälen bestätigt. Der Auftragstext unten wird 1:1 kopiert.

Vor dem Absenden:
- Nimmt der Chef den vorhandenen nativen Neuguss
  `CODEX/assets/monster-neuguss-2026-08-28/fertig/elite_slag_hexer.png`, Punkt 3 streichen.
- Anhang B nur mit ausdrücklichem Chef-GO mitschicken, sonst den Block löschen.

## Auftragstext für Mira

```text
Hallo Mira, für Grim Reach brauchen wir 11 Monsterbilder neu. Die heutigen Dateien haben schlechte Alpha-Kanäle:
weiße Mattenreste an Fell- und Stoffspitzen, alte Magenta-Key-Säume, harte Treppenkanten und ein hart
abgeschnittener Zauberschein. Figur, Pose, Palette und Blickrichtung sollen erhalten bleiben. Es geht um einen
sauberen Neuguss, kein Redesign.

Lieferung als Staging nach CODEX/assets/2026-10-25-monster-alpha-neuguss/delivery/ mit kurzer LIEFERUNG.md
(Dateiname, Maße, Alpha ja/nein, QA-Notiz je Bild). Keine Runtime-Integration. Die Bestandsdateien in
apps/client/src/renderer/assets/monsters/ bitte nicht löschen, nicht überschreiben und nicht verschieben. Wir
bauen nach der Abnahme selbst ein; die alten Bilder bleiben erhalten.

Für alle 11 Bilder gilt:
- Dateiname exakt die ID: <id>.png, wird zu apps/client/src/renderer/assets/monsters/<id>.webp.
- Format wie der Bestand: PNG, RGBA, 1254 x 1254 px, quadratisch.
- ECHTES natives Alpha direkt aus der Erzeugung. Kein Schachbrett, kein weißer, schwarzer oder farbiger
  Hintergrund, kein Chroma-Key, kein nachträgliches Freistellen, kein Despill.
- Das heutige Bild mit derselben ID ist die Designvorlage für die Identität. Zusätzlich die genannten
  Bestandsnachbarn ansehen und Maßstab, Perspektive, Licht (weich von oben links) und Randabstand übernehmen.
- Blickrichtung nach links (der Gegner steht im Kampf rechts), nicht spiegeln.
- Kein Boden, keine Bodenplatte, kein Schlagschatten, keine Kulisse. Rundum mindestens ca. 30 px transparenter
  Rand; nichts berührt die Bildkante.
- Fell-, Borsten-, Haar- und Stoffspitzen enden mit echter weicher Transparenz. Keine hellen oder weißen Reste
  zwischen Haaren und Fransen.
- Leuchten, Feuer, Eis und Rauch bleiben innerhalb der Figur oder laufen mit echtem weichem Alpha aus. Kein
  deckender Lichthof, kein farbiger Fleck um Hände oder Waffen.
- Keine Löcher in Stoff oder Körper, außer echten Öffnungen des Motivs.

QA vor der Lieferung, je Bild:
- Auf Schwarz, auf Mittelbraun #3a2a1e (Spielkarte) und auf Hell #d8cfbf ansehen, jeweils in ca. 240 px und
  ca. 420 px Höhe.
- Fell-, Stoff- und Effektkanten zusätzlich mit 300 % Zoom prüfen: keine weißen, magenta-, grünen oder
  türkisfarbenen Pixel, keine Treppenstufen, keine Krümel neben der Silhouette.
- Neben das heutige Bild und die Nachbarn legen: gleiche Figur, gleiche Pose, ähnliche Füllung im Quadrat.

----------------------------------------------------------------------------------------------------

1) elite_pastures_boar – Rustbristle the Famished (Rostborste der Ausgehungerte)
   Datei: elite_pastures_boar.png -> assets/monsters/elite_pastures_boar.webp (1254 x 1254, RGBA)
   Motiv: Champion der Weiden (The Pastures), Basis Wild Boar, Familie Tier.
   Fehler heute: weiße Mattenreste in Rückenborsten und Kinnbart, auf dunklem Grund schon in Kartengröße als
   weißer Reifsaum sichtbar.
   Nachbarn: assets/monsters/boar.webp (Basis, Anatomie und Pose), elite_pastures_bull.webp (Champion derselben
   Zone, Rand und Framing), elite_wild_wolf.webp (saubere Fellkanten).

   Use case: replacement of an existing painted monster asset; same character, same pose, clean new render.
   Asset type: Grim Reach dark-fantasy monster asset; one isolated subject, not a presentation sheet.
   Scene/backdrop: genuinely transparent canvas with a real native alpha channel, including genuine empty gaps.
   No painted checkerboard, no opaque white/black/colored background, no chroma-key background, no later keying.
   Subject: A huge, gaunt champion wild boar, starved and furious: coarse dark grey-brown hide with a faint rust
   tinge, a long shaggy crest of stiff bristles along the spine, ribs and hip bones showing under the hide, long
   curved yellowed tusks, small angry eyes, a scarred snout, lowered head, thin strong legs with dark hooves,
   a short tufted tail.
   Composition/framing: Full body side view in a mid-stride charge, head and tusks toward the left. Fills about
   95 % of the width and 70 % of the height, vertically centred like elite_pastures_bull.
   Palette/materials/lighting: Dark grey-brown hide, rust-tinged bristles, bone-yellow tusks, dark hooves. Soft
   top-left key light, grounded painted shading.
   Style/medium: sober, gritty, intricately hand-painted fantasy realism matching the neighbouring Grim Reach
   monster art. No cartoon treatment, no glossy toy render.
   Output intent: transparent PNG, 1254 x 1254 pixels, square-safe layout.
   Do not add text, labels, watermark, plaque, frame, stage, scenery, ground plate or cast shadow. Bristle tips
   and the chin beard end as dark hair fading into true transparency, with no white or pale specks between hairs.
   Reference matching: Keep the identity of the current elite_pastures_boar.webp (pose, silhouette, palette).
   Match the anatomy of boar.webp and the clean native-alpha edges and framing of elite_pastures_bull.webp and
   elite_wild_wolf.webp.

2) elite_border_rogue – Vex the Throatfinder (Vex der Kehlenfinder)
   Datei: elite_border_rogue.png -> assets/monsters/elite_border_rogue.webp (1254 x 1254, RGBA)
   Motiv: Champion der Grenzlande (The Borderlands), Basis Goblin Rogue, Familie Humanoid.
   Fehler heute: weiße Mattenflecken an den zerrissenen Umhangspitzen und neben dem unteren Dolch.
   Nachbarn: goblin_rogue.webp (Basis), gk_toll_thug.webp und gk_beastkeeper.webp (Goblins mit nativem Alpha,
   Material und Kanten).

   Use case: replacement of an existing painted monster asset; same character, same pose, clean new render.
   Asset type: Grim Reach dark-fantasy monster asset; one isolated subject, not a presentation sheet.
   Scene/backdrop: genuinely transparent canvas with a real native alpha channel, including genuine empty gaps.
   No painted checkerboard, no opaque white/black/colored background, no chroma-key background, no later keying.
   Subject: A lean, wiry goblin assassin in a dark charcoal hooded cloak that falls in long ragged strips,
   olive-green skin, long pointed ears, a hooked nose, narrow cruel eyes under the hood, worn leather wraps on
   arms and shins, one curved dagger in each hand, bare clawed feet.
   Composition/framing: Full body, crouched stalking stance moving toward the left, daggers low and ready, cloak
   strips trailing to the right. Fills about 89 % of the width and 87 % of the height, centred.
   Palette/materials/lighting: Charcoal and soot-grey cloth, olive skin, dark leather, dull steel blades. Soft
   top-left key light, grounded painted shading.
   Style/medium: sober, gritty, intricately hand-painted fantasy realism matching the neighbouring Grim Reach
   monster art. No cartoon treatment, no glossy toy render.
   Output intent: transparent PNG, 1254 x 1254 pixels, square-safe layout.
   Do not add text, labels, watermark, plaque, frame, stage, scenery, ground plate or cast shadow. The ragged
   cloak tips end in true transparency, with no white flecks around the cloak strips or blades.
   Reference matching: Keep the identity of the current elite_border_rogue.webp. Body type and face like
   goblin_rogue.webp; cloth and leather detail and clean native-alpha edges like gk_toll_thug.webp and
   gk_beastkeeper.webp.

3) elite_slag_hexer – Skalva the Rimebound (Skalva die Frostgebundene)
   [Streichen, falls der Chef den Neuguss vom 28.08. übernimmt.]
   Datei: elite_slag_hexer.png -> assets/monsters/elite_slag_hexer.webp (1254 x 1254, RGBA)
   Motiv: Champion von Slag Pit & Frost Caverns, Basis Frost Hexer, Familie Humanoid.
   Fehler heute: alter Magenta-Key mit Magentasaum um die ganze Figur, Magentaflecken in den Eiskristallen der
   Hände und harte Treppenkante.
   Nachbarn: frost_hexer.webp (Basis), elite_crypt_icemage.webp (Eis-Material, saubere Kanten),
   elite_slag_revenant.webp (Champion derselben Zone, Framing).

   Use case: replacement of an existing painted monster asset; same character, same pose, clean new render.
   Asset type: Grim Reach dark-fantasy monster asset; one isolated subject, not a presentation sheet.
   Scene/backdrop: genuinely transparent canvas with a real native alpha channel, including genuine empty gaps.
   No painted checkerboard, no opaque white/black/colored background, no chroma-key background, no later keying.
   Subject: A tall hooded ice sorceress in a long pale blue-white frost robe patterned with crystalline ice
   veins, wide trailing sleeves, a high collar of ice plates, a jewelled clasp at the waist, pale blue skin and
   a shadowed face under the hood. Both hands are encrusted with sharp clusters of ice crystals.
   Composition/framing: Full body standing in three-quarter view, the left arm stretched out toward the left,
   the right hand lowered and open. Fills about 90 % of the height, centred.
   Palette/materials/lighting: Pale ice blue, frost white, deep blue shadows, silver details. The ice crystals
   carry only painted highlights; no glow halo and no pink or violet tones anywhere. Soft top-left key light.
   Style/medium: sober, gritty, intricately hand-painted fantasy realism matching the neighbouring Grim Reach
   monster art. No cartoon treatment, no glossy toy render.
   Output intent: transparent PNG, 1254 x 1254 pixels, square-safe layout.
   Do not add text, labels, watermark, plaque, frame, stage, scenery, ground plate or cast shadow. Crisp but
   anti-aliased edges without stair-steps; no magenta or purple pixels at the outline or inside the ice.
   Reference matching: Keep the identity of the current elite_slag_hexer.webp. Robe and silhouette family of
   frost_hexer.webp; ice materials and clean edges like elite_crypt_icemage.webp; framing like
   elite_slag_revenant.webp.

4) elite_border_warlock – Vhazrak the Ashtongue (Vhazrak Aschenzunge)
   Datei: elite_border_warlock.png -> assets/monsters/elite_border_warlock.webp (1254 x 1254, RGBA)
   Motiv: Champion der Grenzlande, Basis Goblin Warlock, Familie Humanoid.
   Fehler heute: weiße Mattenkrümel in den Umhanglöchern unter dem Arm und an den Haarbüscheln.
   Nachbarn: goblin_warlock.webp (Basis), gk_felmagus.webp und gk_fel_acolyte.webp (Fel-Magie, Stoff, natives Alpha).

   Use case: replacement of an existing painted monster asset; same character, same pose, clean new render.
   Asset type: Grim Reach dark-fantasy monster asset; one isolated subject, not a presentation sheet.
   Scene/backdrop: genuinely transparent canvas with a real native alpha channel, including genuine empty gaps.
   No painted checkerboard, no opaque white/black/colored background, no chroma-key background, no later keying.
   Subject: A hunched old goblin warlock in a ragged ash-grey hooded robe with a torn hem, a belt with pouches,
   a chained grimoire and small skulls, wrinkled olive skin, sparse grey hair tufts, long ears, and a mouth and
   teeth glowing ember-orange from within. Above his outstretched left hand hovers a compact orb of green-yellow
   fel fire with a few thin pale-green smoke curls rising from it.
   Composition/framing: Full body, crouched forward, facing left, the orb at the upper left in front of him.
   Fills about 90 % of the width and 92 % of the height, centred.
   Palette/materials/lighting: Ash-grey cloth, olive skin, dark leather, green-yellow fel fire, ember orange in
   the mouth. Soft top-left key light.
   Style/medium: sober, gritty, intricately hand-painted fantasy realism matching the neighbouring Grim Reach
   monster art. No cartoon treatment, no glossy toy render.
   Output intent: transparent PNG, 1254 x 1254 pixels, square-safe layout.
   Do not add text, labels, watermark, plaque, frame, stage, scenery, ground plate or cast shadow. The fire orb
   and smoke curls stay compact and fade with real alpha, with no light halo; no white crumbs inside the robe
   holes or around the hair tufts.
   Reference matching: Keep the identity of the current elite_border_warlock.webp. Body and robe like
   goblin_warlock.webp; fel magic and cloth quality like gk_felmagus.webp and gk_fel_acolyte.webp.

5) elite_border_butcher – Gorehook the Flayer (Bluthaken der Schinder)
   Datei: elite_border_butcher.png -> assets/monsters/elite_border_butcher.webp (1254 x 1254, RGBA)
   Motiv: Champion der Grenzlande, Basis Goblin Butcher, Familie Humanoid.
   Fehler heute: weiße Mattenkrümel an den Lücken zwischen Arm und Körper und an der Schürzenkante.
   Nachbarn: goblin_butcher.webp (Basis), gk_armory_breaker.webp und gk_quartermaster.webp (Rüstungsmaterial,
   natives Alpha).

   Use case: replacement of an existing painted monster asset; same character, same pose, clean new render.
   Asset type: Grim Reach dark-fantasy monster asset; one isolated subject, not a presentation sheet.
   Scene/backdrop: genuinely transparent canvas with a real native alpha channel, including genuine empty gaps.
   No painted checkerboard, no opaque white/black/colored background, no chroma-key background, no later keying.
   Subject: A big, burly goblin butcher, heavier than ordinary goblins: olive skin, long ears, an underbite with
   small tusks, heavy riveted rusted iron pauldrons and arm plates, a long blood-stained leather butcher's apron
   over a stained tunic, thick boots with iron caps, and a large curved flesh hook with a wooden grip in his
   right hand.
   Composition/framing: Full body in a wide crouching stance, the hook held out toward the left. Fills about
   86 % of the width and 81 % of the height, centred.
   Palette/materials/lighting: Olive skin, rust-brown iron, dark leather, dried dark-red stains (not bright).
   Soft top-left key light.
   Style/medium: sober, gritty, intricately hand-painted fantasy realism matching the neighbouring Grim Reach
   monster art. No cartoon treatment, no glossy toy render.
   Output intent: transparent PNG, 1254 x 1254 pixels, square-safe layout.
   Do not add text, labels, watermark, plaque, frame, stage, scenery, ground plate or cast shadow. The gaps
   between arm, hook and body are cleanly transparent; no white crumbs at the apron or armour edges.
   Reference matching: Keep the identity of the current elite_border_butcher.webp. Build and face like
   goblin_butcher.webp; armour material and clean edges like gk_armory_breaker.webp and gk_quartermaster.webp.

6) elite_black_wolf – Briarfang the Sleepless (Dornfang der Schlaflose)
   Datei: elite_black_wolf.png -> assets/monsters/elite_black_wolf.webp (1254 x 1254, RGBA)
   Motiv: Champion des Schwarzdornwalds (The Blackthorn Wood), Basis Thorn Wolf, Familie Tier.
   Fehler heute: weiße Flecken an Fellspitzen (Schwanz, Rücken) und zwischen den Dornenranken.
   Nachbarn: thorn_wolf.webp (Basis), elite_wild_wolf.webp (saubere Fellkanten), elite_black_witch.webp
   (Champion derselben Zone, Dornen- und Holzmaterial).

   Use case: replacement of an existing painted monster asset; same character, same pose, clean new render.
   Asset type: Grim Reach dark-fantasy monster asset; one isolated subject, not a presentation sheet.
   Scene/backdrop: genuinely transparent canvas with a real native alpha channel, including genuine empty gaps.
   No painted checkerboard, no opaque white/black/colored background, no chroma-key background, no later keying.
   Subject: A gaunt black wolf with long shaggy dark fur, wrapped and pierced by thorny briar vines with small
   dark leaves and a few black berries, thorns sticking out of the fur along the back, pale eyes, bared fangs,
   a long bushy tail.
   Composition/framing: Full body side view, walking toward the left, head slightly lowered. Fills about 94 % of
   the width and 65 % of the height, vertically centred like thorn_wolf.
   Palette/materials/lighting: Black and charcoal fur, dark brown-red briar, dark green-black leaves. Soft
   top-left key light.
   Style/medium: sober, gritty, intricately hand-painted fantasy realism matching the neighbouring Grim Reach
   monster art. No cartoon treatment, no glossy toy render.
   Output intent: transparent PNG, 1254 x 1254 pixels, square-safe layout.
   Do not add text, labels, watermark, plaque, frame, stage, scenery, ground plate or cast shadow. Fur tips and
   thorn tips end in true transparency, with no white or grey specks between hairs or thorns.
   Reference matching: Keep the identity of the current elite_black_wolf.webp. Anatomy like thorn_wolf.webp;
   fur edges like elite_wild_wolf.webp; briar material like elite_black_witch.webp.

7) elite_idol_wraith – Hollowveil the Forgotten (Hohlschleier der Vergessene)
   Datei: elite_idol_wraith.png -> assets/monsters/elite_idol_wraith.webp (1254 x 1254, RGBA)
   Motiv: Champion der Götzenhalle (The Idol Hall), Basis Idol Priest, Familie Humanoid.
   Fehler heute: alter Magenta-Key mit harter Treppenkante, violett-magentafarbenem Saum an Kapuze und Robe und
   kleinen ausgestanzten Löchern im Robensaum. Die Magenta-Einlagen im Stabkopf sind gewollt.
   Nachbarn: idol_priest.webp (Basis), elite_high_specter.webp und elite_crypt_pyroclasp.webp (Robenfall,
   saubere Kanten).

   Use case: replacement of an existing painted monster asset; same character, same pose, clean new render.
   Asset type: Grim Reach dark-fantasy monster asset; one isolated subject, not a presentation sheet.
   Scene/backdrop: genuinely transparent canvas with a real native alpha channel, including genuine empty gaps.
   No painted checkerboard, no opaque white/black/colored background, no chroma-key background, no later keying.
   Subject: A faceless hooded figure in a long deep-violet ceremonial robe with gold embroidered bands and
   sigils, wide sleeves, a jagged dark hem, black gloves and boots. Inside the black hood only two small violet
   eye points. Behind the head a thin ring of dark iron set with thorns. In the right hand a tall dark staff
   topped by a spiked wheel with magenta enamel inlays; the left arm stretches out toward the left with open
   fingers.
   Composition/framing: Full body in a wide stance, three-quarter view facing left. Fills about 87 % of the
   width and 90 % of the height, centred.
   Palette/materials/lighting: Deep violet, aged gold, black; magenta enamel only in the staff inlays and the
   thorn ring. Soft top-left key light.
   Style/medium: sober, gritty, intricately hand-painted fantasy realism matching the neighbouring Grim Reach
   monster art. No cartoon treatment, no glossy toy render.
   Output intent: transparent PNG, 1254 x 1254 pixels, square-safe layout.
   Do not add text, labels, watermark, plaque, frame, stage, scenery, ground plate or cast shadow. Crisp but
   anti-aliased edges without stair-steps, no violet or magenta seam outside the silhouette, and a robe hem
   without holes. Eyes and inlays are small painted highlights, no glow halo.
   Reference matching: Keep the identity of the current elite_idol_wraith.webp. Relation to idol_priest.webp;
   robe drape and clean edges like elite_high_specter.webp and elite_crypt_pyroclasp.webp.

8) elite_idol_warden – The Ninth Warden (Der Neunte Wächter)
   Datei: elite_idol_warden.png -> assets/monsters/elite_idol_warden.webp (1254 x 1254, RGBA)
   Motiv: Champion der Götzenhalle, Basis Idol Husk, Familie Konstrukt.
   Fehler heute: alter Magenta-Key mit harter Treppenkante und dünnem Lila-Saum.
   Nachbarn: idol_warden.webp (Bildfamilie), idol_husk.webp (Basis, Götzeneisen), elite_black_golem.webp
   (Golem-Champion mit nativem Alpha, Kanten und Framing).

   Use case: replacement of an existing painted monster asset; same character, same pose, clean new render.
   Asset type: Grim Reach dark-fantasy monster asset; one isolated subject, not a presentation sheet.
   Scene/backdrop: genuinely transparent canvas with a real native alpha channel, including genuine empty gaps.
   No painted checkerboard, no opaque white/black/colored background, no chroma-key background, no later keying.
   Subject: A massive idol colossus of carved weathered stone and dark bronze, a crown of tall golden spikes, a
   stern carved stone face, heavy golden ornamental plates with carved meander patterns on chest, shoulders and
   belt, a hanging carved stone loincloth, and huge stone fists. Thin cyan energy runs only inside the cracks
   between the stone plates.
   Composition/framing: Full body in a boxing stance, the left fist forward toward the left, legs apart. Fills
   about 92 % of the height, centred, with at least 30 px free above the crown.
   Palette/materials/lighting: Grey-green stone, aged gold, dark bronze, thin cyan cracks. Soft top-left key
   light.
   Style/medium: sober, gritty, intricately hand-painted fantasy realism matching the neighbouring Grim Reach
   monster art. No cartoon treatment, no glossy toy render.
   Output intent: transparent PNG, 1254 x 1254 pixels, square-safe layout.
   Do not add text, labels, watermark, plaque, frame, stage, scenery, ground plate or cast shadow. The cyan stays
   inside the cracks with no outer glow; clean anti-aliased edges with no purple seam.
   Reference matching: Keep the identity of the current elite_idol_warden.webp. Look family of idol_warden.webp,
   material relation to idol_husk.webp, edges and framing like elite_black_golem.webp.

9) elite_slag_ember – Furnaceheart the Undying (Ofenherz der Unsterbliche)
   Datei: elite_slag_ember.png -> assets/monsters/elite_slag_ember.webp (1254 x 1254, RGBA)
   Motiv: Champion von Slag Pit & Frost Caverns, Basis Ember Elemental.
   Fehler heute: alter Magenta-Key mit harter Treppenkante und dünnem Lila-Saum.
   Nachbarn: ember_elemental.webp (Basis), elite_slag_revenant.webp (gleiche Zone, Glutrisse mit nativem Alpha),
   elite_black_golem.webp (Framing).

   Use case: replacement of an existing painted monster asset; same character, same pose, clean new render.
   Asset type: Grim Reach dark-fantasy monster asset; one isolated subject, not a presentation sheet.
   Scene/backdrop: genuinely transparent canvas with a real native alpha channel, including genuine empty gaps.
   No painted checkerboard, no opaque white/black/colored background, no chroma-key background, no later keying.
   Subject: A tall humanoid made of jagged black obsidian and slag plates, with glowing orange-red molten cracks
   between the plates, a bright diamond-shaped furnace core in the chest, sharp shard crests on head and
   shoulders, and long clawed fingers.
   Composition/framing: Full body in a fighting stance, the right fist raised toward the left, facing left. Fills
   about 80 % of the width and 92 % of the height, centred.
   Palette/materials/lighting: Black, charcoal, ember orange, molten red, a white-hot core. The glow stays only
   inside the cracks and the core.
   Style/medium: sober, gritty, intricately hand-painted fantasy realism matching the neighbouring Grim Reach
   monster art. No cartoon treatment, no glossy toy render.
   Output intent: transparent PNG, 1254 x 1254 pixels, square-safe layout.
   Do not add text, labels, watermark, plaque, frame, stage, scenery, ground plate or cast shadow. No sparks or
   glow outside the silhouette; clean anti-aliased edges with no purple seam.
   Reference matching: Keep the identity of the current elite_slag_ember.webp. Relation to ember_elemental.webp;
   molten cracks and clean edges like elite_slag_revenant.webp.

10) elite_coast_crab – Shellfather the Unbroken (Schalenvater der Ungebrochene)
   Datei: elite_coast_crab.png -> assets/monsters/elite_coast_crab.webp (1254 x 1254, RGBA)
   Motiv: Champion der Gezeitenbänke (Tidewater Shoals), Basis Mud Crab, Familie Tier.
   Fehler heute: alter Magenta-Key mit harter Treppenkante, Lila-Saum an Scheren und Beinen, gezackte Fühler; das
   Motiv reicht bis 8 px an den Rand.
   Nachbarn: mud_crab.webp (Basis), elite_coast_drowned.webp und elite_coast_siren.webp (Champions derselben
   Zone, saubere Kanten).

   Use case: replacement of an existing painted monster asset; same character, same pose, clean new render.
   Asset type: Grim Reach dark-fantasy monster asset; one isolated subject, not a presentation sheet.
   Scene/backdrop: genuinely transparent canvas with a real native alpha channel, including genuine empty gaps.
   No painted checkerboard, no opaque white/black/colored background, no chroma-key background, no later keying.
   Subject: A giant ancient crab with a domed dark-red carapace crusted with pale barnacles and small shells,
   one huge crusher claw in front, a smaller second claw, eight spiky jointed legs, two long thin antennae and
   small eyes on stalks.
   Composition/framing: Full body in side-front view facing left, the large claw toward the left. Fills about
   94 % of the width with at least 30 px free on each side, and about 65 % of the height, vertically centred
   like mud_crab.
   Palette/materials/lighting: Dark coral red, rust, bone-white barnacles, dark wet shadows. Soft top-left key
   light.
   Style/medium: sober, gritty, intricately hand-painted fantasy realism matching the neighbouring Grim Reach
   monster art. No cartoon treatment, no glossy toy render.
   Output intent: transparent PNG, 1254 x 1254 pixels, square-safe layout.
   Do not add text, labels, watermark, plaque, frame, stage, scenery, ground plate or cast shadow. The antennae
   are thin and continuous with smooth edges; no purple seam; nothing touches the canvas edge.
   Reference matching: Keep the identity of the current elite_coast_crab.webp. Anatomy like mud_crab.webp; clean
   native edges like elite_coast_drowned.webp and elite_coast_siren.webp.

11) the_imp – The Imp (Der Imp)
   Datei: the_imp.png -> assets/monsters/the_imp.webp (1254 x 1254, RGBA)
   Motiv: Monster der Weiden (The Pastures), Familie Dämon; Basis des Champions Embergrin.
   Fehler heute: Der Schein um die Zauberflamme ist als deckender türkisfarbener Fleck mit ausgefranster Kante und
   losen Krümeln hart abgeschnitten.
   Nachbarn: elite_pastures_imp.webp (Champion-Variante dieses Imps, Familienähnlichkeit halten),
   forsaken_servant.webp (Dämon mit nativem Alpha), elite_pastures_bull.webp (gleiche Zone).

   Use case: replacement of an existing painted monster asset; same character, same pose, clean new render.
   Asset type: Grim Reach dark-fantasy monster asset; one isolated subject, not a presentation sheet.
   Scene/backdrop: genuinely transparent canvas with a real native alpha channel, including genuine empty gaps.
   No painted checkerboard, no opaque white/black/colored background, no chroma-key background, no later keying.
   Subject: A small gaunt imp demon with grey-violet wrinkled skin, oversized bat-like ears with pink-violet
   insides, two short curved horns, a wide grin full of needle teeth, glowing yellow eyes, thin long limbs with
   clawed hands and feet, and a long thin tail ending in a barb. A small compact violet spell flame flickers in
   the raised right hand.
   Composition/framing: Full body, crouched, frontal three-quarter view turned slightly to the left, the flame
   hand raised at the left. Fills about 65 % of the width and 92 % of the height, centred.
   Palette/materials/lighting: Grey-violet skin, pink-violet ear membranes, yellow eyes, a violet flame. Soft
   top-left key light.
   Style/medium: sober, gritty, intricately hand-painted fantasy realism matching the neighbouring Grim Reach
   monster art. No cartoon treatment, no glossy toy render.
   Output intent: transparent PNG, 1254 x 1254 pixels, square-safe layout.
   Do not add text, labels, watermark, plaque, frame, stage, scenery, ground plate or cast shadow. The flame is
   compact and its outer wisps fade with real alpha; no teal or coloured light patch around the hand and no
   loose crumbs.
   Reference matching: Keep the identity of the current the_imp.webp. Family resemblance to
   elite_pastures_imp.webp; demon skin and clean edges like forsaken_servant.webp.

Danke!
```

## Anhang B: optional, nur mit Chef-GO

Prüflistenfälle aus dem Audit. Für jeden Punkt gelten dieselben Regeln und dieselbe QA wie oben; Lieferung in
denselben Ordner.

```text
B1) elite_pastures_imp – Embergrin the Unbidden (Glutgrinser der Ungebetene)
   Datei: elite_pastures_imp.png -> assets/monsters/elite_pastures_imp.webp (1254 x 1254, RGBA)
   Motiv: Champion der Weiden, Basis The Imp, Familie Dämon.
   Fehler heute: kleiner weißer Rest zwischen den Hörnern; Flammenspitze blassrosa und flächig.
   Nachbarn: the_imp.webp (Basis), forsaken_servant.webp, elite_pastures_bull.webp.
   Subject: A wiry champion imp with dark violet-brown scaly skin, two large curled ram horns, long pointed ears,
   a malicious grin, glowing orange eyes, faint ember cracks on the arms, a ragged leather loincloth, a long
   spiked tail, and a ball of orange fire with a few compact flame tongues above the raised left hand.
   Composition/framing: Full body, mid-stride lunge facing left. Fills about 84 % of the width and 90 % of the
   height, centred.
   Do not add ground plate or cast shadow. The flames fade with real alpha, with no pale pink flat patch; the gap
   between the horns is cleanly transparent.
   (Further prompt lines as in items 1 to 11: transparent canvas with native alpha, style, 1254 x 1254 PNG,
   keep the identity of the current file.)

B2) elite_ash_beetle – Cinderhusk the Unbowed (Glutpanzer der Ungebeugte)
   Datei: elite_ash_beetle.png -> assets/monsters/elite_ash_beetle.webp (1254 x 1254, RGBA)
   Motiv: Champion der Aschefelder (The Ashfields), Basis Pitch Beetle, Familie Tier.
   Fehler heute: weiß-graue Büschel auf dem Panzer, hellgraue beinförmige Flächen unter den Beinen.
   Nachbarn: pitch_beetle.webp (Basis), elite_ash_vulture.webp (gleiche Zone, natives Alpha), elite_black_golem.webp.
   Subject: A huge black rhinoceros beetle with a long curved front horn, a glossy black carapace split by
   glowing orange lava cracks, spiky black legs. If ash is shown, only a few compact grey ash wisps rising from
   the back with real soft alpha, no white tufts and no grey shapes below the legs.
   Composition/framing: Full body side view facing left. Fills about 97 % of the width, vertically centred.
   (Further prompt lines as in items 1 to 11.)

B3) elite_ash_crawler – Mireclutch the Venomous (Moorgriff der Giftige)
   Datei: elite_ash_crawler.png -> assets/monsters/elite_ash_crawler.webp (1254 x 1254, RGBA)
   Motiv: Champion der Aschefelder, Basis Mire Crawler, Familie Tier.
   Fehler heute: weiße Krümel an Bein- und Stachelspitzen.
   Nachbarn: mire_crawler.webp (Basis), elite_ash_vulture.webp, elite_high_wyvern.webp.
   Subject: A giant armoured centipede-scorpion with a segmented dark green-grey body, faint toxic green glow in
   the seams, a tail curled high over the back ending in a stinger, many spiny legs, pincer jaws, and a compact
   green poison breath spraying from the mouth toward the left that fades with real alpha.
   Composition/framing: Full body side view facing left. Fills about 96 % of the width, vertically centred.
   (Further prompt lines as in items 1 to 11.)

B4) scale_skarn – Dragonhide Skarn (kein Alphafehler: Datei nur 320 x 320 px)
   Datei: scale_skarn.png -> assets/monsters/scale_skarn.webp (neu 1254 x 1254, RGBA)
   Motiv: Monster der Götzenhalle, Familie Drachenartige, Stufe 275.
   Fehler heute: nur 320 x 320 px, im Kampf hochskaliert und unscharf.
   Nachbarn: skarn_whelp.webp (Jungtier aus 1.3.0, bezieht sich auf dieses Bild), highland_wyvern.webp.
   Subject: A heavy, low-slung reptile beast covered in dense overlapping red-brown dragon-hide scales with
   rust-red highlights, rows of jagged horn plates along the head, back and tail, a fanged open jaw, and thick
   legs with long pale claws.
   Composition/framing: Full body three-quarter view, head toward the left, crouched to pounce. Fills about 95 %
   of the width, vertically centred.
   (Further prompt lines as in items 1 to 11.)
```
