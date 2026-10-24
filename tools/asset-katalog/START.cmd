@echo off
rem claude:2026-10-24T13:25:06+02:00 - Asset-Katalog starten: Server auf http://127.0.0.1:5430 und Browser oeffnen
chcp 65001 >nul
cd /d "%~dp0..\.."
node "%~dp0server.mjs" --open
if errorlevel 1 pause
