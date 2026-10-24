// claude:2026-10-24T20:16:00+02:00 — Trailer v4 chinesische Fassung (Chef 24.10.): Sprachschalter, Wörter und Schrift. Englisch bleibt Standard;
// die Szene „v4zh“ schaltet vor dem Aufbau auf Chinesisch (vereinfacht, Begriffe wie in der zh-Spielfassung, design/trailer-v4/zh-texte.md).
export type V4Lang = "en" | "zh";
export let V4_LANG: V4Lang = "en";
export function setV4Lang(l: V4Lang): void {
  V4_LANG = l;
}

/** Feste englische Wörter des Trailers -> Chinesisch. Zahlen stehen davor und bleiben. */
const ZH: Record<string, string> = {
  "A DARK FANTASY IDLE RPG": "黑暗奇幻放置 RPG",
  SKILLS: "项技能",
  ITEMS: "件物品",
  "PIECES OF GEAR": "件装备",
  SETS: "个套装",
  RECIPES: "种配方",
  MONSTERS: "种怪物",
  CHAMPIONS: "位王者",
  ZONES: "片区域",
  DUNGEONS: "座地下城",
  "COMBAT STYLES": "种战斗风格",
  "MELEE · RANGED · MAGIC": "近战 · 远程 · 魔法",
  "ARMOR TYPES": "种护甲",
  ENCHANTMENTS: "种附魔",
  "RANDOM SUFFIXES": "种随机后缀",
  RAID: "个团队副本",
  HALLS: "座大厅",
  "NORMAL · HEROIC · MYTHIC": "普通 · 英雄 · 神话",
  ACHIEVEMENTS: "项成就",
  QUESTS: "个任务",
  COMPANIONS: "位伙伴",
  "TALENT TREES": "棵天赋树",
  "& PRESTIGE": "与转生",
  "PROGRESS WHILE YOU'RE AWAY": "离线时，进度照常推进",
  RACES: "个种族",
  LANGUAGES: "种语言",
  GATHERING: "采集",
  CRAFTING: "制造",
  COMBAT: "战斗",
  GODLY: "神圣",
  LEGENDARY: "传说",
  EPIC: "史诗",
  "SUPER RARE": "超稀有",
  RARE: "稀有",
  COMMON: "普通",
  POOR: "粗糙",
  PLATE: "板甲",
  LEATHER: "皮甲",
  CLOTH: "布甲",
  MITIGATION: "减伤",
  EVASION: "闪避",
  WARD: "结界",
  NORMAL: "普通",
  HEROIC: "英雄",
  MYTHIC: "神话",
};

/** Übersetzt ein festes Wort; „42 SETS“ -> „42 个套装“ (Zahl vorn bleibt). Unbekanntes bleibt unverändert. */
export function tr(s: string): string {
  if (V4_LANG !== "zh") return s;
  if (ZH[s]) return ZH[s]!;
  const m = /^(\S+) (.+)$/.exec(s);
  if (m && /\d/.test(m[1]!) && ZH[m[2]!]) return `${m[1]} ${ZH[m[2]!]}`;
  return s;
}

/** Name eines Datensatzes aus data.json in der aktiven Sprache. */
export function nm(o: { name: string; zh?: string }): string {
  return V4_LANG === "zh" && o.zh ? o.zh : o.name;
}

/** Schrift für Canvas-Text: Cinzel (Latein) bzw. Noto Serif SC (Chinesisch, etwas kleiner, da Zeichen das volle Geviert füllen). */
export function fontCss(px: number): string {
  return V4_LANG === "zh" ? `600 ${Math.round(px * 0.86)}px "Noto Serif SC Trailer", serif` : `${px}px Cinzel, Georgia, serif`;
}
/** Sperrung: chinesische Zeichen brauchen deutlich weniger als Kapitälchen. */
export function spacingPx(px: number): number {
  return V4_LANG === "zh" ? Math.round(px * 0.3) : px;
}
export function upper(s: string): string {
  return V4_LANG === "zh" ? s : s.toUpperCase();
}
