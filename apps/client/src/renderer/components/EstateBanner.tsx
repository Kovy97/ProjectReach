// claude:2026-10-23T19:50:00+02:00 — Ländereien-Banner (1.4.0 „Feder und Stahl“ LA, Chef 23.10.2026). Kopf auf der
// Farming- und der Jagd-Seite: „Läuft von selbst, auch offline und neben deiner Hauptaktion.“ plus Live-Status aus
// `estateStatus` (dieselbe Quelle wie Seitenleiste und Kopfzeile). Primitiv-Selektor im Minutentakt.
import { content } from "@hearthforge/content";
import { estateStatus } from "@hearthforge/engine";
import { useGameSelector } from "../game/GameContext";
import { useI18n } from "../i18n";

export function EstateBanner({ kind }: { kind: "farm" | "hunt" }): JSX.Element {
  const { t } = useI18n();
  const key = useGameSelector((s) => {
    const e = estateStatus(s, content);
    const min = (ms: number | null) => (ms === null ? -1 : Math.max(1, Math.ceil(ms / 60_000)));
    return kind === "farm"
      ? [e.plotsGrowing, e.plotsUnlocked, min(e.nextHarvestMs), e.plotsWaiting, e.plotsEmpty].join("|")
      : [e.trapsRunning, e.trapsUnlocked, min(e.nextCatchMs), e.trapsWaiting].join("|");
  });
  const [active = 0, total = 0, next = -1, waiting = 0, empty = 0] = key.split("|").map(Number);
  let status =
    kind === "farm"
      ? t("estates.farm.status").replace("{n}", String(active)).replace("{m}", String(total))
      : t("estates.hunt.status").replace("{n}", String(active)).replace("{m}", String(total));
  if (next > 0) status += ` · ${t(kind === "farm" ? "estates.farm.next" : "estates.hunt.next").replace("{min}", String(next))}`;
  // claude:2026-10-24T15:30:00+02:00 — Warnung auch für leere Beete neben wachsenden (QA2 Klarheit B2)
  const warnParts: string[] = [];
  if (waiting > 0) warnParts.push(t(kind === "farm" ? "estates.farm.blocked" : "estates.hunt.waiting").replace("{n}", String(waiting)));
  if (kind === "farm" && empty > 0 && active > 0) warnParts.push(t("estates.farm.empty").replace("{n}", String(empty)));
  const warn = warnParts.length > 0 ? warnParts.join(" · ") : null;
  return (
    <div className={`estate-banner${warn ? " estate-banner--warn" : ""}`} role="note">
      <span className="estate-banner-lead">{t("estates.banner")}</span>
      <span className="estate-banner-status">
        {status}
        {warn && <span className="estate-banner-warn"> · {warn}</span>}
      </span>
    </div>
  );
}
