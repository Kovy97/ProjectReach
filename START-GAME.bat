@echo off
cd /d "%~dp0"
title Hearthforge Idle (Dev)
echo ================================
echo   Hearthforge Idle - Dev-Start
echo ================================
echo.
echo Starte Dev-Server + Spiel...
echo (Zum Beenden: dieses Fenster schliessen oder Strg+C)
echo.
call pnpm --filter @hearthforge/client dev
echo.
echo Dev-Server beendet.
pause
