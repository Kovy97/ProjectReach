@echo off
REM codex:2026-08-26T20:48:00+02:00
set "PILOT=G:\GameDev\CODEX\assets\human-character-roster-2026-08-26"
set "INPUTS=-i %PILOT%\fertig\human_warrior_m.png -i %PILOT%\fertig\human_warrior_f.png -i %PILOT%\fertig\human_fire_mage_m.png -i %PILOT%\fertig\human_fire_mage_f.png -i %PILOT%\fertig\human_rogue_m.png -i %PILOT%\fertig\human_rogue_f.png"
set "GRID=[0:v]scale=271:362,format=rgba[a0];[1:v]scale=271:362,format=rgba[a1];[2:v]scale=271:362,format=rgba[a2];[3:v]scale=271:362,format=rgba[a3];[4:v]scale=271:362,format=rgba[a4];[5:v]scale=271:362,format=rgba[a5];[a0][a1][a2][a3][a4][a5]xstack=inputs=6:layout=0_0^|271_0^|542_0^|0_362^|271_362^|542_362:fill=0x00000000[grid]"

ffmpeg -y -v error %INPUTS% -filter_complex "%GRID%;color=c=0x171311:s=813x724:d=0.04[bg];[bg][grid]overlay=shortest=1:format=auto[out]" -map "[out]" -frames:v 1 "%PILOT%\qa\contact-sheet-dark.png"
ffmpeg -y -v error %INPUTS% -filter_complex "%GRID%;color=c=0xd8d2c8:s=813x724:d=0.04[bg];[bg][grid]overlay=shortest=1:format=auto[out]" -map "[out]" -frames:v 1 "%PILOT%\qa\contact-sheet-light.png"
