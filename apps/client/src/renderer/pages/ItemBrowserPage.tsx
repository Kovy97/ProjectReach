import { useState, useMemo } from "react";
import { content } from "@hearthforge/content";
import type { ItemDef } from "@hearthforge/shared";
import { TAVERN_ENABLED } from "@hearthforge/shared";
import { getItemImage, rarityClass } from "../items";

// ── Reverse-lookup: which monsters / actions produce each item ────────────────

type SourceEntry =
  | { kind: "monster"; id: string; name: string; chance: number }
  | { kind: "action"; id: string; name: string; chance: number };

function buildSourceIndex(): Map<string, SourceEntry[]> {
  const idx = new Map<string, SourceEntry[]>();

  const push = (itemId: string, entry: SourceEntry): void => {
    const list = idx.get(itemId) ?? [];
    list.push(entry);
    idx.set(itemId, list);
  };

  for (const monster of Object.values(content.monsters)) {
    const mName =
      typeof monster.name === "string" ? monster.name : monster.name.en;
    for (const roll of monster.loot) {
      push(roll.itemId, { kind: "monster", id: monster.id, name: mName, chance: roll.chance });
    }
  }

  for (const action of Object.values(content.actions)) {
    const aName =
      typeof action.name === "string" ? action.name : action.name.en;
    for (const roll of action.loot) {
      push(roll.itemId, { kind: "action", id: action.id, name: aName, chance: roll.chance });
    }
  }

  return idx;
}

const SOURCE_INDEX = buildSourceIndex();

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

function fmtBonus(obj: Record<string, unknown>): JSX.Element[] {
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => (
      <div key={k} className="ib-kv">
        <span className="ib-kv-key">{k}</span>
        <span className="ib-kv-val">{String(v)}</span>
      </div>
    ));
}

// ── Item image with emoji fallback ────────────────────────────────────────────

function ItemImg({ itemId, item }: { itemId: string; item: ItemDef }): JSX.Element {
  const img = getItemImage(itemId);
  if (img) {
    return <img loading="lazy" decoding="async" src={img} alt="" className="ib-detail-img pixelart" />;
  }
  if (item.icon) {
    return <span className="ib-detail-emoji">{item.icon}</span>;
  }
  return <span className="ib-detail-emoji">📦</span>;
}

function ItemThumb({ itemId, item }: { itemId: string; item: ItemDef }): JSX.Element {
  const img = getItemImage(itemId);
  if (img) {
    return <img loading="lazy" decoding="async" src={img} alt="" className="ib-thumb pixelart" />;
  }
  if (item.icon) {
    return <span className="ib-thumb-emoji">{item.icon}</span>;
  }
  return <span className="ib-thumb-emoji">📦</span>;
}

// ── Detail Panel ──────────────────────────────────────────────────────────────

function DetailPanel({ item, onClose }: { item: ItemDef; onClose: () => void }): JSX.Element {
  const sources = SOURCE_INDEX.get(item.id) ?? [];
  const itemName = typeof item.name === "string" ? item.name : item.name.en;

  return (
    <div className="ib-detail panel">
      <div className="ib-detail-header">
        <ItemImg itemId={item.id} item={item} />
        <div className="ib-detail-title-block">
          <h3 className={`ib-detail-name ${rarityClass(item.rarity)}`}>{itemName}</h3>
          <span className="ib-detail-id muted">{item.id}</span>
        </div>
        <button className="ib-close-btn" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      <div className="ib-detail-body">
        {/* Core fields */}
        <section className="ib-section">
          <div className="ib-kv-group">
            <div className="ib-kv"><span className="ib-kv-key">type</span><span className="ib-kv-val">{item.type}</span></div>
            <div className="ib-kv"><span className="ib-kv-key">stackable</span><span className="ib-kv-val">{String(item.stackable)}</span></div>
            {item.value !== undefined && (
              <div className="ib-kv"><span className="ib-kv-key">value</span><span className="ib-kv-val">{item.value} g</span></div>
            )}
            {item.rarity && (
              <div className="ib-kv"><span className="ib-kv-key">rarity</span><span className={`ib-kv-val ${rarityClass(item.rarity)}`}>{item.rarity}</span></div>
            )}
            {item.slot && (
              <div className="ib-kv"><span className="ib-kv-key">slot</span><span className="ib-kv-val">{item.slot}</span></div>
            )}
            {item.weaponStyle && (
              <div className="ib-kv"><span className="ib-kv-key">weaponStyle</span><span className="ib-kv-val">{item.weaponStyle}</span></div>
            )}
            {item.twoHanded && (
              <div className="ib-kv"><span className="ib-kv-key">twoHanded</span><span className="ib-kv-val">true</span></div>
            )}
            {item.healAmount !== undefined && (
              <div className="ib-kv"><span className="ib-kv-key">healAmount</span><span className="ib-kv-val">{item.healAmount} HP</span></div>
            )}
            {item.curesPoison && (
              <div className="ib-kv"><span className="ib-kv-key">curesPoison</span><span className="ib-kv-val">true</span></div>
            )}
          </div>
        </section>

        {/* Name (localized) */}
        {typeof item.name !== "string" && (
          <section className="ib-section">
            <h4 className="ib-section-title">Name</h4>
            <div className="ib-kv-group">
              <div className="ib-kv"><span className="ib-kv-key">en</span><span className="ib-kv-val">{item.name.en}</span></div>
              <div className="ib-kv"><span className="ib-kv-key">de</span><span className="ib-kv-val">{item.name.de}</span></div>
            </div>
          </section>
        )}

        {/* Description */}
        {item.description && (
          <section className="ib-section">
            <h4 className="ib-section-title">Description</h4>
            {typeof item.description === "string" ? (
              <p className="ib-desc">{item.description}</p>
            ) : (
              <div className="ib-kv-group">
                <div className="ib-kv"><span className="ib-kv-key">en</span><span className="ib-kv-val">{item.description.en}</span></div>
                <div className="ib-kv"><span className="ib-kv-key">de</span><span className="ib-kv-val">{item.description.de}</span></div>
              </div>
            )}
          </section>
        )}

        {/* Equip bonus */}
        {item.bonus && Object.keys(item.bonus).length > 0 && (
          <section className="ib-section">
            <h4 className="ib-section-title">Equip Bonus</h4>
            <div className="ib-kv-group">
              {fmtBonus(item.bonus as Record<string, unknown>)}
            </div>
          </section>
        )}

        {/* Weapon effect */}
        {item.weaponEffect && (
          <section className="ib-section">
            <h4 className="ib-section-title">Weapon Effect</h4>
            <div className="ib-kv-group">
              <div className="ib-kv"><span className="ib-kv-key">type</span><span className="ib-kv-val">{item.weaponEffect.type}</span></div>
              <div className="ib-kv"><span className="ib-kv-key">chance</span><span className="ib-kv-val">{pct(item.weaponEffect.chance)}</span></div>
              <div className="ib-kv"><span className="ib-kv-key">magnitude</span><span className="ib-kv-val">{item.weaponEffect.magnitude}</span></div>
              <div className="ib-kv"><span className="ib-kv-key">durationMs</span><span className="ib-kv-val">{item.weaponEffect.durationMs} ms</span></div>
            </div>
          </section>
        )}

        {/* Buff */}
        {item.buff && (
          <section className="ib-section">
            <h4 className="ib-section-title">Buff</h4>
            <div className="ib-kv-group">
              <div className="ib-kv"><span className="ib-kv-key">durationMs</span><span className="ib-kv-val">{item.buff.durationMs} ms</span></div>
              {fmtBonus(item.buff.bonus as Record<string, unknown>)}
            </div>
          </section>
        )}

        {/* Modifiers */}
        {item.modifiers && Object.keys(item.modifiers).length > 0 && (
          <section className="ib-section">
            <h4 className="ib-section-title">Attribute Modifiers</h4>
            <div className="ib-kv-group">
              {fmtBonus(item.modifiers as Record<string, unknown>)}
            </div>
          </section>
        )}

        {/* Skill Boost (Itemization 2.0 §4) */}
        {item.skillBoost && Object.keys(item.skillBoost).length > 0 && (
          <section className="ib-section">
            <h4 className="ib-section-title">Skill Boost</h4>
            <div className="ib-kv-group">
              {fmtBonus(item.skillBoost as Record<string, unknown>)}
            </div>
          </section>
        )}

        {/* Requirements */}
        {item.requirements && Object.keys(item.requirements).length > 0 && (
          <section className="ib-section">
            <h4 className="ib-section-title">Requirements</h4>
            <div className="ib-kv-group">
              {fmtBonus(item.requirements as Record<string, unknown>)}
            </div>
          </section>
        )}

        {/* Tool */}
        {item.tool && (
          <section className="ib-section">
            <h4 className="ib-section-title">Tool</h4>
            <div className="ib-kv-group">
              <div className="ib-kv"><span className="ib-kv-key">skill</span><span className="ib-kv-val">{item.tool.skill}</span></div>
              <div className="ib-kv"><span className="ib-kv-key">speedMult</span><span className="ib-kv-val">{item.tool.speedMult}</span></div>
            </div>
          </section>
        )}

        {/* Sources */}
        {sources.length > 0 && (
          <section className="ib-section">
            <h4 className="ib-section-title">Sources</h4>
            <div className="ib-kv-group">
              {sources.map((src, i) => (
                <div key={i} className="ib-kv">
                  <span className="ib-kv-key">
                    {src.kind === "monster" ? "Monster" : "Action"}
                  </span>
                  <span className="ib-kv-val">
                    {src.name}{" "}
                    <span className="muted">({pct(src.chance)})</span>
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Raw JSON */}
        <section className="ib-section">
          <h4 className="ib-section-title">Raw JSON</h4>
          <pre className="ib-json">{JSON.stringify(item, null, 2)}</pre>
        </section>
      </div>
    </div>
  );
}

// ── Sort helpers ──────────────────────────────────────────────────────────────

const RARITY_ORDER: Record<string, number> = {
  common: 0,
  magic: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};

type SortKey = "id" | "type" | "value" | "rarity";

function sortItems(items: ItemDef[], key: SortKey): ItemDef[] {
  return [...items].sort((a, b) => {
    switch (key) {
      case "type":
        return a.type.localeCompare(b.type) || a.id.localeCompare(b.id);
      case "value":
        return (b.value ?? 0) - (a.value ?? 0) || a.id.localeCompare(b.id);
      case "rarity":
        return (
          (RARITY_ORDER[b.rarity ?? "common"] ?? 0) -
          (RARITY_ORDER[a.rarity ?? "common"] ?? 0) ||
          a.id.localeCompare(b.id)
        );
      default:
        return a.id.localeCompare(b.id);
    }
  });
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ItemBrowserPage(): JSX.Element {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [selected, setSelected] = useState<ItemDef | null>(null);

  // Release-Schalter: Schwarzmarktbehälter (Taverne) erst mit 1.2.0 sichtbar.
  const allItems = useMemo(() => (Object.values(content.items) as ItemDef[]).filter((i) => TAVERN_ENABLED || !i.id.startsWith("black_market_crate_")), []);

  const types = useMemo(() => {
    const set = new Set(allItems.map((i) => i.type));
    return ["all", ...Array.from(set).sort()];
  }, [allItems]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = allItems.filter((item) => {
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (!q) return true;
      const nameEn = typeof item.name === "string" ? item.name : item.name.en;
      // `de` ist seit dem 7-Sprachen-Fundament (Task #252) optional — auf `en` zurückfallen,
      // statt auf einem undefined-Namen zu crashen.
      const nameDe = typeof item.name === "string" ? item.name : (item.name.de ?? item.name.en);
      return (
        item.id.toLowerCase().includes(q) ||
        nameEn.toLowerCase().includes(q) ||
        nameDe.toLowerCase().includes(q)
      );
    });
    return sortItems(base, sortKey);
  }, [allItems, search, typeFilter, sortKey]);

  const handleSelect = (item: ItemDef): void => {
    setSelected((prev) => (prev?.id === item.id ? null : item));
  };

  return (
    <div className="ib-root">
      {/* ── Controls ─────────────────────────────────────────── */}
      <div className="ib-controls panel">
        <span className="ib-badge">
          Dev Tool — {filtered.length} / {allItems.length} items
        </span>
        <input
          className="ib-search"
          type="search"
          placeholder="Search id, name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="ib-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          {types.map((t) => (
            <option key={t} value={t}>
              {t === "all" ? "All types" : t}
            </option>
          ))}
        </select>
        <select
          className="ib-select"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
        >
          <option value="id">Sort: id</option>
          <option value="type">Sort: type</option>
          <option value="value">Sort: value</option>
          <option value="rarity">Sort: rarity</option>
        </select>
      </div>

      {/* ── Split view: list + detail ─────────────────────────── */}
      <div className={`ib-split${selected ? " ib-split--detail" : ""}`}>
        {/* Item list */}
        <div className="ib-list panel">
          {filtered.map((item) => {
            const nameEn =
              typeof item.name === "string" ? item.name : item.name.en;
            const isActive = selected?.id === item.id;
            return (
              <button
                key={item.id}
                className={`ib-row${isActive ? " ib-row--active" : ""}`}
                onClick={() => handleSelect(item)}
              >
                <ItemThumb itemId={item.id} item={item} />
                <span className={`ib-row-name ${rarityClass(item.rarity)}`}>{nameEn}</span>
                <span className="ib-row-id muted">{item.id}</span>
                <span className="ib-row-type muted">{item.type}</span>
                {item.rarity && item.rarity !== "common" && (
                  <span className={`ib-row-rarity ${rarityClass(item.rarity)}`}>{item.rarity}</span>
                )}
                {item.value !== undefined && (
                  <span className="ib-row-val muted">{item.value} g</span>
                )}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="muted" style={{ padding: "16px" }}>
              No items match.
            </p>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <DetailPanel item={selected} onClose={() => setSelected(null)} />
        )}
      </div>
    </div>
  );
}
