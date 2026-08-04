---
name: asset-bind-all-references
description: "Beim Einbinden eines Asset-Bildes ALLE Code-Referenzen abdecken, nicht nur eine Oberfläche"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 553d2095-3a73-4795-9782-0fe746a25f13
---

Beim Einbinden eines gelieferten Asset-Bildes: das Bild scannen → **ALLE** Stellen im Programmcode finden, die dieses Item/Ding darstellen, und **JEDE** davon mit der echten Art versorgen — nie nur eine Oberfläche bedienen und andere mit Emoji/Placeholder/„?" lassen.

**Why:** Chef-Feedback (2026-06-27). Konkreter Fehler: `herb_bloodthistle`/`herb_gravemoss` hatten ein Farm-Icon (`icon_farming_*`, genutzt NUR in `FarmPage` CROP_ICON_MAP), aber KEIN Item-Bild (`assets/items/<id>.png`) → im Inventar/Tooltip/Detailkarte erschien „?". Eine Referenz war bedient, die andere nicht.

**How to apply:** Dieselbe Art-Quelle für ALLE Surfaces eines Items/Dings binden. Bekannte Surfaces im Renderer: Item-Bild `assets/items/<itemId>.png` (Auto-Discovery via `items.ts`/`getItemImage`), Farm-Crop-Icon (`CROP_ICON_MAP`/`getCropIconUrl`), Sidebar (`sidebaricon_*`/`getSidebarIcon`), UI-/Stat-Icons (`getUiIcon`, Tooltip `statIcon`), Skill-Icons (`getSkillIcon`), Monster-/Zonen-Art, Aktions-Icons (`getActionSrc`). Vor „fertig" prüfen, dass das Ding an JEDER Stelle echte Art zeigt. Verknüpft mit [[archive-integrated-assets]].
