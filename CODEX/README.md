# Grim Reach — Codex-Projektleitung

<!-- codex:2026-09-09T20:12:15+02:00 -->
Seit Chefauftrag vom 09.09.2026 ist Codex zentraler technischer Ansprechpartner.
Du kannst normale Arbeitsaufträge stellen; Codex ordnet Fachrollen zu, setzt um und prüft.

## Einstieg

- [Projektanweisung](../AGENTS.md): Führung, Schutzregeln und Delegation.
- [Projektlandkarte](PROJECT.md), [aktueller Stand](CURRENT.md), [Arbeitsregeln](RULES.md).
- [Fachagenten](agents/README.md): Rollen, Reviere und Verwendung.
- [Handoff](HANDOFF.md): aktueller Prüfstand oben, alte Übergaben darunter.
- [Übernahmeanalyse](notes/2026-09-09-projektuebernahme.md): Befunde und Grenzen.

## Ablage

`work/`: Entwürfe/Aufträge. `notes/`: Analysen. `assets/`: noch nicht automatisch
integrierte Bilder. `outbox/`: Lieferpakete. `templates/`: Brief-/Arbeitsvorlagen.
`WORKLOG.md`: fortlaufender Nachweis. `archive/`: frühere Grundlagen, keine aktiven Aufträge.

`.claude/**` bleibt unangetastet. Die frühere Mira-Rolle ist als Designfachrolle erhalten.
Native Agentvorlagen sind zusätzlich versionierbar unter `agents/native/` abgelegt,
da `.codex/` lokal ignoriert und in dieser Sitzung schreibgeschützt ist.

Neue Sitzungen im Root erhalten `AGENTS.md`; der vorhandene `START-CODEX.bat` bleibt
ein optionaler Einstieg. Für automatisch entdeckte native Rollen ist zusätzlich die
Installation laut Agenten-README in einer dafür berechtigten Sitzung erforderlich.
