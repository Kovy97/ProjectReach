// claude:2026-10-19T11:30:00+02:00 — Chef 19.10.: Logo folgt dem Oberflächen-Stil (Classic = Logo von 1.2.3,
// Reforged = gemaltes Logo vom 18.10.). Beide Dateien bleiben im Bestand.
import logoPainterly from "../assets/ui/mainmenu_logo_painterly.webp";
import logoClassic from "../assets/ui/mainmenu_logo.webp";
import { useUiStyle } from "../uiStyle";

export function useMenuLogo(): string {
  return useUiStyle() === "classic" ? logoClassic : logoPainterly;
}
