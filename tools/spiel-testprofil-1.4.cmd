@echo off
rem claude:2026-10-24T17:43:00+02:00 - Startet den aktuellen 1.4-Entwicklungsstand im getrennten Testprofil.
rem Der echte Spielstand in %APPDATA%\Grim Reach bleibt unberuehrt.
cd /d G:\GameDev\apps\client
npx electron . "--user-data-dir=%LOCALAPPDATA%\GrimReach-Testprofil-1.4"
