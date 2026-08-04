---
name: tiering-urteil-nur-fable
description: "Modell-Tiering-Präzisierung: Test-/Audit-/Urteils-Arbeit läuft NUR auf Fable — Sonnet dafür nie ohne explizites Chef-GO"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 553d2095-3a73-4795-9782-0fe746a25f13
---

Chef 2026-07-13 (als ich das Armor-Trinität-Balance-Audit wegen knappen Fable-Budgets auf
Sonnet umlegte): „Sonnet sollte nicht testen, dafür habe ich nie das Go gegeben!"

**Why:** Das Tiering [[token-thrift]] heißt „Sonnet für Mechanik, Fable für Urteil" —
Balance-Audits, Tester-Sweeps und QA-Urteile SIND Urteils-Arbeit. Budget-Knappheit
rechtfertigt kein stilles Herabstufen; der Chef entscheidet den Trade-off selbst.

**How to apply:** Audits/Tests/Reviews standardmäßig auf Fable (Agent-Default, kein
model-Override). Wenn das Fable-Budget knapp ist: Arbeit VERSCHIEBEN und den Chef fragen,
statt auf Sonnet auszuweichen. Sonnet bleibt für klar mechanische Umsetzung mit präzisem
Protokoll (Apply-Listen umsetzen, Locale-Nachzüge, Fixture-Sweeps nach Schema).
