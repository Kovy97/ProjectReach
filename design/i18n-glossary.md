# Grim Reach — Localization Glossary

Reference glossary of the recurring **core game terms** for *Grim Reach* (dark-fantasy idle RPG).
Purpose: keep every future translator **consistent** — the same source term must always map to the
same target word (never "Maul" once and "Kriegshammer" the next screen).

**Source of truth (read-only, do not edit code from this doc):**
- Weapon types — `WEAPON_TYPE_SPECIALTY` / `item.weaponType.*` (`packages/shared/src/index.ts`, `apps/client/.../translations.ts`)
- Attributes — `ATTRIBUTES` (`packages/shared/src/index.ts`)
- Skills — `content.skills` (`packages/content/src/index.ts`)
- Combat stats — `stat.*` / `combat.*` (`translations.ts`)
- Status effects — `status.*` (`translations.ts`)
- Rarities — `RARITY_LABEL` (`packages/shared/src/index.ts`)

**Columns:** `EN` (canonical) · `DE` (existing in-code German) · `ZH-Hans` (Simplified Chinese) ·
`RU` (Russian) · `ES` (Spanish) · `PT-BR` (Brazilian Portuguese) · `FR` (French).

**Conventions**
- Keep the **fantasy tone** — no literal mistranslations (see the notes at the bottom for the tricky ones:
  Slayer, Ward, Power vs Strength, Accuracy vs Precision).
- **Do not translate** the proper noun **Grim Reach** (game title) or internal material/tier names
  unless the Chef requests it.
- Where a term is a UI **verb** it is given in the imperative/infinitive form the UI uses.

---

## 1 · Weapon Types

| EN | DE | ZH-Hans | RU | ES | PT-BR | FR |
|---|---|---|---|---|---|---|
| Dagger | Dolch | 匕首 | Кинжал | Daga | Adaga | Dague |
| Sword | Schwert | 剑 | Меч | Espada | Espada | Épée |
| Scimitar | Krummsäbel | 弯刀 | Скимитар | Cimitarra | Cimitarra | Cimeterre |
| Mace | Streitkolben | 钉头锤 | Булава | Maza | Maça | Masse |
| Axe | Axt | 斧 | Топор | Hacha | Machado | Hache |
| Battleaxe | Kampfaxt | 战斧 | Боевой топор | Hacha de guerra | Machado de guerra | Hache de guerre |
| Spear | Speer | 长矛 | Копьё | Lanza | Lança | Lance |
| Greataxe | Großaxt | 巨斧 | Секира | Hacha grande | Machado grande | Grande hache |
| Greatsword | Großschwert | 巨剑 | Двуручный меч | Mandoble | Espada grande | Espadon |
| Maul | Kriegshammer | 巨锤 | Молот | Mazo | Marreta | Maillet |
| Shortbow | Kurzbogen | 短弓 | Короткий лук | Arco corto | Arco curto | Arc court |
| Longbow | Langbogen | 长弓 | Длинный лук | Arco largo | Arco longo | Arc long |
| Staff | Stab | 法杖 | Посох | Bastón | Cajado | Bâton |
| Wand | Zauberstab | 魔杖 | Жезл | Varita | Varinha | Baguette |
| Focus | Fokus | 法器 | Фокус | Foco | Foco | Focalisateur |
| Scepter | Szepter | 权杖 | Скипетр | Cetro | Cetro | Sceptre |

## 2 · Attributes (the 6 core stats)

| EN | DE | ZH-Hans | RU | ES | PT-BR | FR |
|---|---|---|---|---|---|---|
| Strength (STR) | Stärke | 力量 | Сила | Fuerza | Força | Force |
| Dexterity (DEX) | Geschick | 敏捷 | Ловкость | Destreza | Destreza | Dextérité |
| Constitution (CON) | Konstitution | 体质 | Телосложение | Constitución | Constituição | Constitution |
| Intelligence (INT) | Intelligenz | 智力 | Интеллект | Inteligencia | Inteligência | Intelligence |
| Wisdom (WIS) | Weisheit | 智慧 | Мудрость | Sabiduría | Sabedoria | Sagesse |
| Luck (LCK) | Glück | 幸运 | Удача | Suerte | Sorte | Chance |

## 3 · Skills

### 3a · Gathering

| EN | DE | ZH-Hans | RU | ES | PT-BR | FR |
|---|---|---|---|---|---|---|
| Woodcutting | Holzfällen | 伐木 | Древорубство | Tala | Corte de lenha | Bûcheronnage |
| Mining | Bergbau | 采矿 | Горное дело | Minería | Mineração | Minage |
| Fishing | Angeln | 钓鱼 | Рыбалка | Pesca | Pesca | Pêche |
| Farming | Anbau | 种植 | Земледелие | Agricultura | Agricultura | Agriculture |
| Foraging | Sammeln | 采集 | Собирательство | Recolección | Coleta | Cueillette |
| Thieving | Diebeskunst | 盗窃 | Воровство | Hurto | Roubo | Vol |

### 3b · Processing / Crafting

| EN | DE | ZH-Hans | RU | ES | PT-BR | FR |
|---|---|---|---|---|---|---|
| Smithing | Schmieden | 锻造 | Кузнечное дело | Herrería | Ferraria | Forge |
| Cooking | Kochen | 烹饪 | Готовка | Cocina | Culinária | Cuisine |
| Fletching | Bogenbau | 制弓 | Лучное дело | Fabricación de arcos | Fabricação de arcos | Fléchage |
| Crafting¹ | Handwerk | 制作 | Ремесло | Artesanía | Artesanato | Artisanat |
| Jewelcrafting | Juwelierskunst | 珠宝加工 | Ювелирное дело | Joyería | Joalheria | Joaillerie |
| Runecrafting | Runenkunst | 符文制作 | Рунотворчество | Creación de runas | Criação de runas | Runécriture |
| Herblore | Kräuterkunde | 草药学 | Травничество | Herboristería | Herbologia | Herboristerie |

¹ *Skill id is `leatherworking`, but the display name is the generic **Crafting** / **Handwerk** — localize the display name, not the id.*

### 3c · Combat skills

| EN | DE | ZH-Hans | RU | ES | PT-BR | FR |
|---|---|---|---|---|---|---|
| Attack | Angriff | 攻击 | Атака | Ataque | Ataque | Attaque |
| Power² | Wucht | 威力 | Мощь | Potencia | Potência | Puissance |
| Defence | Verteidigung | 防御 | Защита | Defensa | Defesa | Défense |
| Ranged | Fernkampf | 远程 | Стрельба | A distancia | À distância | Tir à l'arc |
| Magic | Magie | 魔法 | Магия | Magia | Magia | Magie |
| Warding³ | Abwehr | 结界术 | Оберегание | Guarda arcana | Guarda arcana | Barrière |
| Vitality | Lebenskraft | 活力 | Живучесть | Vitalidad | Vitalidade | Vitalité |
| Slayer⁴ | Monsterjäger | 猎魔 | Истребление | Cazador | Caçador | Chasseur |

² **Power** = melee-damage skill, distinct from the **Strength** attribute — keep the two words different.
³ **Warding** trains the Ward pool (see §5, "Ward" family) — keep consistent with the Ward stat terms.
⁴ **Slayer** — framed as "monster hunter" to match the German `Monsterjäger`; see notes.

## 4 · Combat Stats

| EN | DE | ZH-Hans | RU | ES | PT-BR | FR |
|---|---|---|---|---|---|---|
| Melee | Nahkampf | 近战 | Ближний бой | Cuerpo a cuerpo | Corpo a corpo | Mêlée |
| Ranged | Fernkampf | 远程 | Дальний бой | A distancia | À distância | À distance |
| Magic | Magie | 魔法 | Магия | Magia | Magia | Magie |
| Damage | Schaden | 伤害 | Урон | Daño | Dano | Dégâts |
| Hit range (min–max) | Trefferspanne | 伤害范围 | Разброс урона | Rango de daño | Faixa de dano | Plage de dégâts |
| Max mana | Max-Mana | 最大魔力 | Макс. мана | Maná máx. | Mana máx. | Mana max. |
| Mana regen | Mana-Regen | 魔力回复 | Восст. маны | Regen. de maná | Regen. de mana | Régén. mana |
| Attack speed | Angriffstempo | 攻击速度 | Скорость атаки | Vel. de ataque | Vel. de ataque | Vitesse d'attaque |
| Defense | Verteidigung | 防御 | Защита | Defensa | Defesa | Défense |
| Accuracy⁵ | Genauigkeit | 命中 | Меткость | Puntería | Pontaria | Adresse |
| Evasion | Ausweichen | 闪避 | Уклонение | Evasión | Evasão | Esquive |
| Armor | Rüstung | 护甲 | Броня | Armadura | Armadura | Armure |
| Mitigation | Mitigation | 减伤 | Снижение урона | Mitigación | Mitigação | Atténuation |
| Dodge chance | Ausweichchance | 闪避几率 | Шанс уклонения | Prob. de evasión | Chance de esquiva | Chance d'esquive |
| Block chance | Blockchance | 格挡几率 | Шанс блока | Prob. de bloqueo | Chance de bloqueio | Chance de blocage |
| Armor Rating | Rüstungswert | 护甲值 | Показатель брони | Índice de armadura | Índice de armadura | Indice d'armure |
| Evasion Rating | Ausweichwert | 闪避值 | Показатель уклонения | Índice de evasión | Índice de evasão | Indice d'esquive |
| Armor Pen | Rüstungsdurchdringung | 护甲穿透 | Пробитие брони | Penetración de armadura | Penetração de armadura | Pénétration d'armure |
| Precision⁵ | Präzision | 精准 | Точность | Precisión | Precisão | Précision |
| Crit chance | Krit-Chance | 暴击几率 | Шанс крита | Prob. de crítico | Chance de crítico | Chance de critique |
| Crit damage | Krit-Schaden | 暴击伤害 | Урон крита | Daño crítico | Dano crítico | Dégâts critiques |
| Combat style | Kampfstil | 战斗风格 | Стиль боя | Estilo de combate | Estilo de combate | Style de combat |
| Ammunition | Munition | 弹药 | Боеприпасы | Munición | Munição | Munitions |
| Speed | Tempo | 速度 | Скорость | Velocidad | Velocidade | Vitesse |
| HP⁶ | HP | 生命值 | Здоровье | Salud (PV) | Vida (PV) | PV |
| HP Regen | HP-Regeneration | 生命回复 | Восст. здоровья | Regen. de salud | Regen. de vida | Régén. PV |
| Skilling XP | Skilling-XP | 技能经验 | Опыт ремёсел | XP de habilidades | XP de perícias | XP de compétences |
| Extra yield chance | Extra-Ertrag-Chance | 额外产出几率 | Шанс доп. добычи | Prob. de rendimiento extra | Chance de rendimento extra | Chance de rendement bonus |

⁵ **Accuracy** (hit chance) and **Precision** (ignores enemy evasion) are **separate stats** — never collapse them into the same word.
⁶ **HP** is kept as a loanword in several UIs; localized forms (Salud/Vida/PV) are given as fallbacks — pick one per language and stay consistent.

### 4a · Ward family (cloth-caster shield pool) & defense archetypes

| EN | DE | ZH-Hans | RU | ES | PT-BR | FR |
|---|---|---|---|---|---|---|
| Ward (pool) | Ward | 结界 | Оберег | Guarda | Guarda | Barrière |
| Ward pool | Ward-Pool | 结界值 | Запас оберега | Reserva de guarda | Reserva de guarda | Réserve de barrière |
| Ward regen /s | Ward-Regen /s | 结界回复/秒 | Восст. оберега/с | Regen. de guarda/s | Regen. de guarda/s | Régén. barrière/s |
| Ward Capacity | Ward-Kapazität | 结界容量 | Ёмкость оберега | Capacidad de guarda | Capacidade de guarda | Capacité de barrière |
| Ward Break | Ward-Durchbruch | 破界 | Пробитие оберега | Ruptura de guarda | Quebra de guarda | Brise-barrière |
| Armored | (Rüstung) | 护甲型 | Броневой | Blindado | Blindado | Blindé |
| Evasive | (Ausweichen) | 闪避型 | Уклончивый | Evasivo | Evasivo | Évasif |
| Warded | (Ward) | 结界型 | Огражденный | Protegido (guarda) | Protegido (guarda) | Protégé (barrière) |

## 5 · Status Effects

| EN | DE | ZH-Hans | RU | ES | PT-BR | FR |
|---|---|---|---|---|---|---|
| Burn | Brand | 灼烧 | Горение | Quemadura | Queimadura | Brûlure |
| Frost | Frost | 冰霜 | Заморозка | Escarcha | Congelamento | Givre |
| Shock | Schock | 感电 | Разряд | Descarga | Choque | Électrisation |
| Poison | Gift | 中毒 | Яд | Veneno | Veneno | Poison |
| Bleed | Blutung | 流血 | Кровотечение | Sangrado | Sangramento | Saignement |

## 6 · Rarity Tiers

| EN | DE | ZH-Hans | RU | ES | PT-BR | FR |
|---|---|---|---|---|---|---|
| Poor | Minderwertig | 劣质 | Скверный | Pobre | Ruim | Médiocre |
| Common | Gewöhnlich | 普通 | Обычный | Común | Comum | Commun |
| Magic | Magisch | 魔法 | Магический | Mágico | Mágico | Magique |
| Rare | Selten | 稀有 | Редкий | Raro | Raro | Rare |
| Super Rare | Sehr Selten | 超稀有 | Очень редкий | Superraro | Super-raro | Très rare |
| Epic | Episch | 史诗 | Эпический | Épico | Épico | Épique |
| Legendary | Legendär | 传说 | Легендарный | Legendario | Lendário | Légendaire |
| Godly | Göttlich | 神器 | Божественный | Divino | Divino | Divin |

## 7 · UI · Navigation · Verbs

| EN | DE | ZH-Hans | RU | ES | PT-BR | FR |
|---|---|---|---|---|---|---|
| Character | Charakter | 角色 | Персонаж | Personaje | Personagem | Personnage |
| Combat | Kampf | 战斗 | Бой | Combate | Combate | Combat |
| Bestiary | Bestiarium | 怪物图鉴 | Бестиарий | Bestiario | Bestiário | Bestiaire |
| Mastery | Meisterschaft | 精通 | Мастерство | Maestría | Maestria | Maîtrise |
| Companions | Begleiter | 伙伴 | Спутники | Compañeros | Companheiros | Compagnons |
| Shop | Laden | 商店 | Магазин | Tienda | Loja | Boutique |
| Bank | Bank | 仓库 | Банк | Banco | Banco | Banque |
| Quests | Aufgaben | 任务 | Задания | Misiones | Missões | Quêtes |
| Achievements | Erfolge | 成就 | Достижения | Logros | Conquistas | Succès |
| Statistics | Statistik | 统计 | Статистика | Estadísticas | Estatísticas | Statistiques |
| Options | Optionen | 选项 | Настройки | Opciones | Opções | Options |
| Inventory | Inventar | 背包 | Инвентарь | Inventario | Inventário | Inventaire |
| Equipment | Ausrüstung | 装备 | Снаряжение | Equipo | Equipamento | Équipement |
| Set Bonus | Set-Bonus | 套装加成 | Бонус комплекта | Bonif. de conjunto | Bônus de conjunto | Bonus de panoplie |
| Gear Vault | Ausrüstungstresor | 装备保险库 | Хранилище снаряж. | Bóveda de equipo | Cofre de equipamento | Coffre d'équipement |
| Dungeon | Dungeon | 地下城 | Подземелье | Mazmorra | Masmorra | Donjon |
| Zone | Zone | 区域 | Зона | Zona | Zona | Zone |
| Auto-Eat | Auto-Essen | 自动进食 | Автоеда | Auto-comer | Auto-comer | Auto-manger |
| **Equip** (v) | Ausrüsten | 装备 | Надеть | Equipar | Equipar | Équiper |
| **Unequip** (v) | Ablegen | 卸下 | Снять | Desequipar | Desequipar | Déséquiper |
| **Use** (v) | Benutzen | 使用 | Использовать | Usar | Usar | Utiliser |
| **Sell** (v) | Verkaufen | 出售 | Продать | Vender | Vender | Vendre |
| **Buy** (v) | Kaufen | 购买 | Купить | Comprar | Comprar | Acheter |
| **Deposit** (v) | Einlagern | 存入 | Положить | Depositar | Depositar | Déposer |
| **Withdraw** (v) | Entnehmen | 取出 | Взять | Retirar | Retirar | Retirer |
| **Salvage** (v) | Zerlegen | 分解 | Разобрать | Desmontar | Desmontar | Démanteler |
| Scrap | Schrott | 碎料 | Лом | Chatarra | Sucata | Ferraille |
| **Enchant** (v) | Verzaubern | 附魔 | Зачаровать | Encantar | Encantar | Enchanter |
| Rune | Rune | 符文 | Руна | Runa | Runa | Rune |
| Suffix | Suffix | 后缀 | Суффикс | Sufijo | Sufixo | Suffixe |

### 7a · Combat styles

| EN | DE | ZH-Hans | RU | ES | PT-BR | FR |
|---|---|---|---|---|---|---|
| Melee | Nahkampf | 近战 | Ближний бой | Cuerpo a cuerpo | Corpo a corpo | Mêlée |
| Ranged | Fernkampf | 远程 | Дальний бой | A distancia | À distância | À distance |
| Magic | Magie | 魔法 | Магия | Magia | Magia | Magie |

### 7b · Equip slots

| EN | DE | ZH-Hans | RU | ES | PT-BR | FR |
|---|---|---|---|---|---|---|
| Helmet / Head | Helm | 头部 | Голова | Cabeza | Cabeça | Tête |
| Neck | Hals | 颈部 | Шея | Cuello | Pescoço | Cou |
| Chest | Brust | 胸甲 | Грудь | Pecho | Peito | Torse |
| Legs | Beine | 腿部 | Ноги | Piernas | Pernas | Jambes |
| Hands | Hände | 手部 | Руки | Manos | Mãos | Mains |
| Feet | Füße | 脚部 | Ноги (ступни) | Pies | Pés | Pieds |
| Cape | Umhang | 披风 | Плащ | Capa | Capa | Cape |
| Ring | Ring | 戒指 | Кольцо | Anillo | Anel | Anneau |
| Quiver | Köcher | 箭袋 | Колчан | Carcaj | Aljava | Carquois |
| Tool | Werkzeug | 工具 | Инструмент | Herramienta | Ferramenta | Outil |

---

## Notes — doubtful / Chef-decision cases

These are the terms most likely to need a deliberate call before mass translation:

1. **Slayer** (`slayer` skill). The German in-code name is `Monsterjäger` ("monster hunter"), so ES/PT/FR
   here follow the *hunter* framing (Cazador / Caçador / Chasseur) rather than a literal "slayer/killer."
   If the Chef prefers to keep **"Slayer"** as an untranslated genre loanword (as RuneScape often does),
   apply that across all languages instead.
2. **Ward / Warding / Ward Break / Ward pool** (cloth-caster absorb shield, Armor-Trinity §). There is
   **no standard localization** for this mechanic, so I chose an internally-consistent metaphor per language
   (结界 / Оберег / Guarda / Barrière). These are invented but consistent — worth a Chef eyeball, and they
   must **not collide** with Block/Shield/Defense terms in-language.
3. **Power vs Strength.** The `power` combat skill and the `Strength` attribute both mean "strength" in many
   languages (Fuerza/Force/Сила/力量). I deliberately split them (Power = Potencia/Puissance/Мощь/威力).
   Keep them distinct in all future strings.
4. **Accuracy vs Precision.** Both exist as separate stats (Accuracy = hit chance; Precision = ignores enemy
   evasion). Several languages would naturally use "precisión/précision/точность" for *both* — the table forces
   a distinct pair per language. Do not merge.
5. **Maul.** German canonical UI label is **Kriegshammer** (`item.weaponType.maul`), but individual item names
   in the content file say **"…-Hammer"** (e.g. `Eisen-Hammer`). That is an existing **DE inconsistency in the
   source** — flag for cleanup; translators should follow the canonical `Kriegshammer`. Mace vs Maul are kept
   as two different weapons (one-handed vs two-handed heavy) — do not merge them into one word.
6. **"Godly" rarity** (top tier above Legendary). Rendered as Divine/Божественный/Divino/Divin and 神器 (ZH).
   A literal "god-like" superlative can read oddly or be mildly sensitive in some markets; the Chef may prefer
   something like "Mythic/Ascended." Low priority, but noted.
7. **"Crafting" skill.** Internal id is `leatherworking` but it displays as the generic **Crafting / Handwerk**.
   Translate the **display name** (general crafting), not "leatherworking."
8. **HP.** Kept as a loanword in some UIs; localized fallbacks (Salud/Vida/PV/Здоровье) are provided. Pick one
   convention per language and use it everywhere (stat blocks, tooltips, combat log).

**Term count:** ~115 core terms across 7 categories (16 weapons · 6 attributes · 21 skills · ~35 combat stats
& ward/defense · 5 status · 8 rarity · ~34 UI/nav/verbs/styles/slots).
