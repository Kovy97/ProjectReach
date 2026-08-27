import { TAVERN_ENABLED } from "@hearthforge/shared";

/**
 * Laufzeit-Feature-Schalter (Chef 27.08.2026, Release-Trennung 1.1.2 / 1.2.0). Startwert aus shared; Tests dürfen
 * `features.tavern = true` setzen, um die Tavernen-Pfade unabhängig vom Release-Stand zu prüfen.
 */
export const features = { tavern: TAVERN_ENABLED };
