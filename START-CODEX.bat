@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title Codex - Grim Reach Studio Worker

echo ========================================
echo   Grim Reach - Codex-Arbeitsplatz
echo ========================================
echo.

if not exist "AGENTS.md" (
  echo FEHLER: AGENTS.md fehlt. Codex wird nicht gestartet.
  pause
  exit /b 1
)

if not exist "CODEX\RULES.md" (
  echo FEHLER: CODEX\RULES.md fehlt. Codex wird nicht gestartet.
  pause
  exit /b 1
)

where codex >nul 2>nul
if errorlevel 1 (
  echo FEHLER: Der Befehl "codex" wurde nicht im PATH gefunden.
  echo Starte Codex alternativ manuell im Ordner:
  echo   %CD%
  pause
  exit /b 1
)

echo Rolle: Arbeiter fuer Chef und CEO Claude
echo Fokus: Design, Assets und dokumentierte Uebergaben
echo Regeln: AGENTS.md und CODEX\RULES.md
echo.

call codex
set "CODEX_EXIT=%ERRORLEVEL%"

echo.
echo Codex wurde mit Exit-Code %CODEX_EXIT% beendet.
pause
exit /b %CODEX_EXIT%
